#!/usr/bin/env python3
"""Bake per-facilitator profile data into app/data/facilitators.json.

Aggregates from app/data/sessions.json, app/data/sessions/*.json (cc data),
and app/data/magic-moments.json. Does NOT call LLM — strengths and
learn-from are left empty for a separate enrichment step.
"""
import json, re, glob
from collections import defaultdict
from pathlib import Path

def slug(name: str) -> str:
    s = re.sub(r"\s+", " ", name).strip().lower()
    s = re.sub(r"[^a-z0-9\s-]", "", s)
    s = re.sub(r"\s+", "-", s)
    return s

def split_names(s):
    if not s: return []
    return [re.sub(r"\s+", " ", n).strip() for n in s.split(",") if n.strip()]

sessions = json.load(open("app/data/sessions.json"))["rows"]
magic = json.load(open("app/data/magic-moments.json"))["by_case_challenge"]

# Preserve previously-baked Arrow data + LLM strengths/learn_from
prev_by_slug = {}
prev_path = Path("app/data/facilitators.json")
if prev_path.exists():
    prev = json.load(open(prev_path))
    for f in prev.get("facilitators", []):
        prev_by_slug[f["slug"]] = f

# Facilitators known to have at least one Zoom transcript in /0_Sessions/
FACILITATORS_WITH_TRANSCRIPTS = {
    "Nick White", "Tamara Nolte", "Tara Layne", "Rebecca Kaloo",
    "Angie Bealko", "Luke Owings",
}

# Load cc session JSONs to get team-level data
cc_data_by_session_id = {}
for f in glob.glob("app/data/sessions/*.json"):
    d = json.load(open(f))
    cc_data_by_session_id[d["session_arrow_id"]] = d

facs = defaultdict(lambda: {
    "name": "",
    "slug": "",
    "sessions": [],
    "cases": set(),
    "survey_scores": [],
    "team_scores": [],          # all team scores across their sessions
    "narrative_outcomes": defaultdict(int),
    "magic_moments": [],
    "transcript_session_ids": set(),
})

for s in sessions:
    for name in split_names(s.get("facilitators")):
        f = facs[name]
        f["name"] = name
        f["slug"] = slug(name)
        f["sessions"].append({
            "session_id": s["session_id"],
            "program_name": s["program_name"],
            "program_uuid": s["program_uuid"],
            "session_name": s["session_name"],
            "case_challenge": s["case_challenge"],
            "start_date": s["start_date"],
            "number_of_teams": s["number_of_teams"],
            "survey_score": s.get("survey_score"),
            "survey_response_count": s.get("survey_response_count"),
        })
        f["cases"].add(s["case_challenge"])
        if isinstance(s.get("survey_score"), (int,float)):
            f["survey_scores"].append(s["survey_score"])
        # Pull cc data if we baked it
        cc = cc_data_by_session_id.get(s["session_id"])
        if cc:
            for chap_id, results in (cc.get("team_results_by_chapter") or {}).items():
                for tid, r in results.items():
                    if isinstance(r.get("score"), int):
                        f["team_scores"].append(r["score"])
                    if r.get("narrative_outcome"):
                        f["narrative_outcomes"][r["narrative_outcome"]] += 1

# Magic moments
for cc_name, moments in magic.items():
    for m in moments:
        if m["facilitator"] in facs:
            facs[m["facilitator"]]["magic_moments"].append({**m, "case_challenge": cc_name})

# Finalize and sort
out = []
for name, d in sorted(facs.items(), key=lambda x: -len(x[1]["sessions"])):
    d["sessions"].sort(key=lambda s: (s["start_date"] or ""), reverse=True)
    prev = prev_by_slug.get(d["slug"], {})
    out.append({
        "name": name,
        "slug": d["slug"],
        "has_transcripts": name in FACILITATORS_WITH_TRANSCRIPTS,
        "session_count": len(d["sessions"]),
        "case_challenges": sorted(d["cases"]),
        "avg_survey_score": (sum(d["survey_scores"])/len(d["survey_scores"])) if d["survey_scores"] else None,
        "survey_session_count": len(d["survey_scores"]),
        "avg_team_score": (sum(d["team_scores"])/len(d["team_scores"])) if d["team_scores"] else None,
        "team_score_count": len(d["team_scores"]),
        "narrative_outcomes": dict(d["narrative_outcomes"]),
        "sessions": d["sessions"],
        "magic_moments": d["magic_moments"],
        "strengths": prev.get("strengths") or [],          # preserve LLM output
        "learn_from": prev.get("learn_from") or [],        # preserve LLM output
        "strengths_method": prev.get("strengths_method"),
        "arrow": prev.get("arrow"),                        # preserve Arrow aggregates
    })

payload = {
    "generated_at": "2026-05-20T00:00:00.000Z",
    "source": "Aggregated from app/data/sessions.json + app/data/sessions/*.json + app/data/magic-moments.json. Strengths and learn_from need LLM enrichment via scripts/extract_facilitator_profiles.py.",
    "facilitators": out,
}

Path("app/data/facilitators.json").write_text(json.dumps(payload, indent=2, ensure_ascii=False) + "\n")
print(f"Wrote {len(out)} facilitators")
for f in out[:10]:
    moments = len(f["magic_moments"])
    cases = len(f["case_challenges"])
    avg = f"{f['avg_team_score']:.0f}" if f["avg_team_score"] else "—"
    print(f"  {f['slug']:30} sessions={f['session_count']:2} cases={cases} avg_team={avg} magic={moments}")
