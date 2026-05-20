#!/usr/bin/env python3
"""LLM-derive strengths and learn-from pairings per facilitator.

Two-phase:
1. Per-facilitator: read sessions, team scores, narrative outcomes, magic
   moments → identify 3-4 strengths with evidence.
2. Cross-facilitator: given all strengths summaries, recommend 1-2 peers
   per facilitator with why.

Writes back into app/data/facilitators.json.

Requires ANTHROPIC_API_KEY in env or .env.local.

Usage:
  python3 scripts/extract_facilitator_profiles.py [--force]
"""
import json, os, sys, time
from pathlib import Path

try:
    import anthropic
except ImportError:
    print("Run: pip3 install --user anthropic")
    sys.exit(1)

env_file = Path(".env.local")
if env_file.exists():
    for line in env_file.read_text().splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        k, _, v = line.partition("=")
        v = v.strip().strip('"').strip("'")
        if v and not os.environ.get(k):
            os.environ[k] = v

if not os.environ.get("ANTHROPIC_API_KEY"):
    print("ERROR: ANTHROPIC_API_KEY not set (env or .env.local)")
    sys.exit(2)

MODEL = "claude-haiku-4-5"
client = anthropic.Anthropic()
import re

def _extract_json(text: str, expect_kind):
    text = text.strip()
    if text.startswith("```"):
        text = text.split("```", 2)[1]
        if text.startswith("json"):
            text = text[4:]
        text = text.strip()
    open_char = "[" if expect_kind is list else "{"
    close_char = "]" if expect_kind is list else "}"
    i = text.find(open_char)
    if i < 0:
        raise ValueError(f"no {open_char} in response: {text[:200]}")
    depth, in_string, escape, k = 0, False, False, i
    while k < len(text):
        c = text[k]
        if escape: escape = False
        elif c == "\\": escape = True
        elif c == '"': in_string = not in_string
        elif not in_string:
            if c == open_char: depth += 1
            elif c == close_char:
                depth -= 1
                if depth == 0: break
        k += 1
    return json.loads(text[i:k+1])

STRENGTHS_PROMPT = """You are profiling Abilitie facilitator {name} based on their session data.

Data:
- {session_count} sessions delivered across these case challenges: {cases}
- Survey scores (0-5 scale, post-session): {survey_scores}
- Team scores across their sessions ({team_score_count} team-chapters): {team_scores_summary}
- Narrative outcome distribution across their teams: {narrative_outcomes}
- Magic moments (curated facilitator quotes): {magic_moments}

Identify {n_strengths} distinct strengths this facilitator demonstrates. Be specific and grounded in the data.
Each strength must include concrete evidence from the data shown above. Do NOT invent details.

If the data is too thin to derive strengths confidently (e.g. only 1-2 sessions, no surveys, no transcripts), return an empty array [].

Return ONLY a JSON array: [{{"title": "Short strength label", "evidence": "1-2 sentence evidence anchored to the data"}}]
"""

LEARN_FROM_PROMPT = """You are matching Abilitie facilitator {name} with 1-2 peer facilitators they could learn from.

{name}'s profile:
- Sessions: {session_count} across {n_cases} case challenges
- Avg survey: {survey}
- Strengths: {strengths}

All other facilitators with their strengths:
{peers}

Pick 1-2 peers whose strengths complement {name}'s gaps or who excel in areas where {name} has thin data. Avoid same-strength matches.

Return ONLY a JSON array: [{{"peer_name": "Exact peer name from list", "area": "1-3 word area label", "why": "1-2 sentence rationale grounded in the peer's strengths"}}]

If no good match exists (e.g. {name} is the strongest in every dimension or peer data is too thin), return [].
"""

def summarize_team_scores(scores):
    if not scores: return "none captured"
    avg = sum(scores)/len(scores)
    lo, hi = min(scores), max(scores)
    return f"avg {avg:.1f}, range {lo}-{hi}"

def derive_strengths(f):
    n_strengths = 4 if f["session_count"] >= 4 else (3 if f["session_count"] >= 2 else 2)
    magic = [m["quote"] for m in f.get("magic_moments", [])][:4]
    prompt = STRENGTHS_PROMPT.format(
        name=f["name"],
        session_count=f["session_count"],
        cases=", ".join(f["case_challenges"]),
        survey_scores=f"avg {f['avg_survey_score']:.2f} across {f['survey_session_count']} sessions" if f["avg_survey_score"] else "no surveys captured",
        team_score_count=f["team_score_count"],
        team_scores_summary=summarize_team_scores([s for s in [] if False]) if not f["team_score_count"] else f"avg {f['avg_team_score']:.0f}",
        narrative_outcomes=", ".join(f"{k}: {v}" for k,v in (f["narrative_outcomes"] or {}).items()) or "none captured",
        magic_moments="\n  - " + "\n  - ".join(magic) if magic else "none curated",
        n_strengths=n_strengths,
    )
    resp = client.messages.create(model=MODEL, max_tokens=1024, messages=[{"role":"user","content":prompt}])
    return _extract_json(resp.content[0].text, list)

def derive_learn_from(f, all_facs):
    peers_text = ""
    name_to_slug = {p["name"]: p["slug"] for p in all_facs if p["name"] != f["name"] and p["strengths"]}
    for p in all_facs:
        if p["name"] == f["name"] or not p["strengths"]: continue
        peer_strengths = "; ".join(s["title"] for s in p["strengths"])
        peers_text += f"\n- {p['name']}: {peer_strengths}"
    if not peers_text:
        return []
    own_strengths = "; ".join(s["title"] for s in f["strengths"]) if f["strengths"] else "(not derived)"
    prompt = LEARN_FROM_PROMPT.format(
        name=f["name"],
        session_count=f["session_count"],
        n_cases=len(f["case_challenges"]),
        survey=f"{f['avg_survey_score']:.2f}" if f["avg_survey_score"] else "—",
        strengths=own_strengths,
        peers=peers_text,
    )
    resp = client.messages.create(model=MODEL, max_tokens=512, messages=[{"role":"user","content":prompt}])
    out = _extract_json(resp.content[0].text, list)
    # Add slug
    for r in out:
        r["peer_slug"] = name_to_slug.get(r.get("peer_name",""), "")
    return [r for r in out if r["peer_slug"]]

def main():
    force = "--force" in sys.argv
    data = json.load(open("app/data/facilitators.json"))
    facs = data["facilitators"]

    # Phase 1: derive strengths
    print("\nPhase 1: deriving strengths…")
    for f in facs:
        if f["strengths"] and not force:
            print(f"  {f['name']:30} already has strengths (use --force)")
            continue
        try:
            strengths = derive_strengths(f)
            f["strengths"] = strengths
            f["strengths_method"] = f"LLM-derived via {MODEL} from session aggregates, narrative outcomes, magic moments."
            print(f"  {f['name']:30} {len(strengths)} strengths")
        except Exception as e:
            print(f"  {f['name']:30} ! {type(e).__name__}: {e}")
        time.sleep(0.05)

    # Phase 2: learn-from
    print("\nPhase 2: matching learn-from pairings…")
    for f in facs:
        if f["learn_from"] and not force:
            print(f"  {f['name']:30} already has learn_from")
            continue
        try:
            lf = derive_learn_from(f, facs)
            f["learn_from"] = lf
            print(f"  {f['name']:30} {len(lf)} pairing(s)")
        except Exception as e:
            print(f"  {f['name']:30} ! {type(e).__name__}: {e}")
        time.sleep(0.05)

    Path("app/data/facilitators.json").write_text(json.dumps(data, indent=2, ensure_ascii=False) + "\n")
    print("\nAll done.")

if __name__ == "__main__":
    main()
