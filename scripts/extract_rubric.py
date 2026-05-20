#!/usr/bin/env python3
"""LLM-based rubric extraction for a baked session JSON.

For each chapter with team analysis letters, ask Claude to:
1. Identify 5-7 rubric criteria the letters evaluate.
2. Classify each team as full / partial / missing credit on each criterion.

Writes back into app/data/sessions/{arrow_id}.json under "rubric_by_chapter".

Requires ANTHROPIC_API_KEY in env or .env.local.

Usage:
  python3 scripts/extract_rubric.py <arrow_id> [--force]
  python3 scripts/extract_rubric.py --all          # process all sessions
"""
import json, os, sys, time
from pathlib import Path

try:
    import anthropic
except ImportError:
    print("Run: pip install anthropic")
    sys.exit(1)

# Load .env.local if present. Always override empty values in env.
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

CRITERIA_PROMPT = """You are analyzing case-challenge team feedback letters from one chapter of a leadership training simulation called "{case_challenge}", specifically "{chapter}".

Below are {n} letters, one per team. Each letter evaluates how that team performed on the chapter's challenge.

Read all letters together and identify 5-7 distinct rubric criteria that the letters consistently evaluate teams on. Each criterion should be:
- Specific and actionable (e.g. "Identifies Grace as critical first mover" — not "good analysis")
- Independent (don't overlap)
- Observable in the letters (teams either are or aren't given credit for it)

Return ONLY a JSON array of objects: [{{ "id": "snake_case_id", "label": "Short label (under 80 chars)" }}, ...]

LETTERS:
{letters}
"""

CLASSIFY_PROMPT = """Below is one team's feedback letter for "{case_challenge}" / "{chapter}":

{letter}

Below are the rubric criteria for this chapter:
{criteria}

For each criterion, classify this team's credit as:
- "full" — the criterion is mentioned positively (they got it right)
- "partial" — the criterion is mentioned as an improvement area (they got it partly or missed nuance)
- "missing" — the criterion is not addressed in the letter

Return ONLY a JSON object: {{ "criterion_id": "full|partial|missing", ... }}
"""

def _extract_json(text: str, expect_kind):
    """Robustly pull a JSON array/object out of LLM text."""
    text = text.strip()
    if text.startswith("```"):
        text = text.split("```", 2)[1]
        if text.startswith("json"):
            text = text[4:]
        text = text.strip()
    # Find the first [ or { and scan forward to balanced close.
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

def extract_criteria(case_challenge, chapter_title, analyses):
    """First LLM pass: identify rubric criteria from the letters."""
    letters_text = ""
    for i, (tid, a) in enumerate(list(analyses.items())[:12], 1):
        letter = a.get("analysis", "")[:1500]
        letters_text += f"\n--- Team {i} ({a.get('teamName','?')}, score {a.get('score','?')}) ---\n{letter}\n"
    prompt = CRITERIA_PROMPT.format(case_challenge=case_challenge, chapter=chapter_title, n=len(analyses), letters=letters_text)
    resp = client.messages.create(
        model=MODEL,
        max_tokens=1024,
        messages=[{"role": "user", "content": prompt}],
    )
    return _extract_json(resp.content[0].text, list)

def classify_team(case_challenge, chapter_title, criteria, analysis):
    letter = analysis.get("analysis", "")
    criteria_text = "\n".join(f"- {c['id']}: {c['label']}" for c in criteria)
    prompt = CLASSIFY_PROMPT.format(case_challenge=case_challenge, chapter=chapter_title, letter=letter, criteria=criteria_text)
    resp = client.messages.create(
        model=MODEL,
        max_tokens=512,
        messages=[{"role": "user", "content": prompt}],
    )
    return _extract_json(resp.content[0].text, dict)

def process_session(arrow_id, force=False):
    path = Path(f"app/data/sessions/{arrow_id}.json")
    if not path.exists():
        print(f"  ! {path} not found")
        return
    data = json.loads(path.read_text())
    case_challenge = data["case_challenge"]
    if "rubric_by_chapter" in data and not force:
        print(f"  Session {arrow_id}: already has rubric_by_chapter (use --force to redo)")
        return

    rubric_by_chapter = {}
    chapters_by_id = {c["id"]: c for c in data.get("chapters", [])}
    analyses_by_chapter = data.get("team_analyses_by_chapter", {})

    for chap_id, analyses in analyses_by_chapter.items():
        if not analyses:
            continue
        chap = chapters_by_id.get(chap_id, {})
        chap_title = chap.get("title", chap_id[:8])
        print(f"  Chapter {chap_title}: deriving criteria from {len(analyses)} letters…")
        try:
            criteria = extract_criteria(case_challenge, chap_title, analyses)
        except Exception as e:
            print(f"    ! criteria extraction failed: {e}")
            continue

        # Per-team classification
        team_cells_per_criterion = {c["id"]: {} for c in criteria}
        for tid, a in analyses.items():
            try:
                cells = classify_team(case_challenge, chap_title, criteria, a)
                for c in criteria:
                    v = cells.get(c["id"], "missing")
                    if v not in ("full", "partial", "missing"):
                        v = "missing"
                    team_cells_per_criterion[c["id"]][tid] = v
            except Exception as e:
                print(f"    ! classify team {a.get('teamName','?')}: {e}")
            time.sleep(0.05)

        rubric_by_chapter[chap_id] = {
            "criteria": criteria,
            "team_cells": [
                {"id": c["id"], "label": c["label"], "cells": team_cells_per_criterion[c["id"]]}
                for c in criteria
            ],
            "method": f"LLM-derived via {MODEL}: criteria identified from {len(analyses)} letters, per-team classification of credit.",
        }
        print(f"    ✓ {chap_title}: {len(criteria)} criteria, classified {len(analyses)} teams")

    data["rubric_by_chapter"] = rubric_by_chapter
    # Keep legacy rubric pointing at last chapter for back-compat
    last_chap_id = max(rubric_by_chapter.keys(), default=None, key=lambda k: chapters_by_id.get(k, {}).get("order", 0))
    if last_chap_id:
        data["rubric"] = rubric_by_chapter[last_chap_id]
    path.write_text(json.dumps(data, indent=2, ensure_ascii=False) + "\n")
    print(f"  ✓ Wrote rubric_by_chapter for session {arrow_id}")

def main():
    args = sys.argv[1:]
    force = "--force" in args
    args = [a for a in args if a != "--force"]
    if "--all" in args:
        # Print unbuffered for live progress monitoring
        sys.stdout.reconfigure(line_buffering=True)
        for f in sorted(Path("app/data/sessions").glob("*.json")):
            print(f"\n=== {f.name} ===", flush=True)
            try:
                process_session(f.stem, force=force)
            except Exception as e:
                print(f"  !!! Top-level exception for {f.stem}: {type(e).__name__}: {e}", flush=True)
                # On rate limit, back off
                if "rate_limit" in str(e).lower() or "429" in str(e):
                    print("  Sleeping 30s before continuing…", flush=True)
                    time.sleep(30)
                continue
        print("\nAll done.", flush=True)
    elif args:
        process_session(args[0], force=force)
    else:
        print(__doc__)
        sys.exit(0)

if __name__ == "__main__":
    main()
