#!/usr/bin/env python3
"""One-button refresh: merge a fresh Arrow snapshot into sessions.json,
fetch cc.abilitie.com data for any new sessions, re-bake facilitators.

Workflow (Claude runs this when you say "refresh"):

  1. Claude runs the SQL in REFRESH_SQL via the Arrow MCP.
  2. Claude saves the result rows to /tmp/fresh_sessions.json as:
     {"rows": [ ... ]}
  3. Claude invokes: python3 scripts/refresh_sessions.py /tmp/fresh_sessions.json

The script then:
  - Diffs the fresh rows against app/data/sessions.json
  - Adds new rows (preserving the user-curated fields on existing rows)
  - For each new row that has a launched_dns + multi_tenant_session_id
    in Arrow, calls scripts/extract_cc_session.py to bake cc data
  - Regenerates lib/cc-session-registry.ts
  - Re-runs scripts/bake_facilitators.py

What the script does NOT do:
  - Survey scores: those come from a separate Arrow query against
    portal.survey. Refresh handles new rows; existing scores stay.
  - LLM rubric / facilitator strengths: opt-in via the other scripts.
"""

import json, os, re, subprocess, sys
from pathlib import Path

# The exact SQL Claude runs against the Arrow MCP. Kept here so it
# stays in version control alongside the script.
REFRESH_SQL = """
WITH cc AS (
  SELECT
    ps.id                AS session_id,
    ps.uuid              AS session_uuid,
    ps.name              AS session_name,
    ps.start_date,
    ps.program_id,
    pg.name              AS program_name,
    pg.uuid              AS program_uuid,
    s.external_case_name AS case_challenge,
    r.number_of_teams,
    r.players_per_team
  FROM portal.program_session ps
  JOIN portal.program_session_simulation pss ON pss.session_id = ps.id
  JOIN portal.simulation s ON s.id = pss.simulation_id
  JOIN portal.roster    r ON r.simulation_id = s.id
  JOIN portal.program   pg ON pg.id = ps.program_id
  WHERE s.external_case_name IS NOT NULL
    AND r.number_of_teams >= 4
    AND pg.is_archived IS NOT TRUE
    AND pg.is_demo IS NOT TRUE
),
fac AS (
  SELECT fsa.session_id,
         string_agg(u.first_name || ' ' || u.last_name, ', ' ORDER BY u.first_name) AS facilitators
  FROM portal.facilitator_session_assignment fsa
  JOIN portal.facilitator f ON f.id = fsa.facilitator_id
  JOIN portal."user" u ON u.id = f.user_id
  WHERE COALESCE(fsa.canceled, false) = false AND fsa.contract_accepted = true
  GROUP BY fsa.session_id
),
prd AS (
  SELECT psa.session_id,
         string_agg(u.first_name || ' ' || u.last_name, ', ' ORDER BY u.first_name) AS producers
  FROM portal.producer_session_assignment psa
  JOIN portal.producer p ON p.id = psa.producer_id
  JOIN portal."user" u ON u.id = p.user_id
  WHERE COALESCE(psa.canceled, false) = false AND psa.contract_accepted = true
  GROUP BY psa.session_id
)
SELECT cc.session_id, cc.session_uuid, cc.session_name, cc.start_date,
       cc.program_id, cc.program_name, cc.program_uuid, cc.case_challenge,
       cc.number_of_teams, cc.players_per_team, fac.facilitators, prd.producers
FROM cc
LEFT JOIN fac ON fac.session_id = cc.session_id
LEFT JOIN prd ON prd.session_id = cc.session_id
ORDER BY cc.start_date DESC NULLS LAST
"""

# SQL for cc.abilitie.com server info per session (used when baking new sessions)
SERVER_SQL_TEMPLATE = """
SELECT srv.launched_dns, srv.multi_tenant_session_id
FROM portal.simulation s
JOIN portal.program_session_simulation pss ON pss.simulation_id = s.id
LEFT JOIN portal.server srv ON srv.simulation_id = s.id
WHERE pss.session_id = {session_id}
LIMIT 1
"""

PRESERVED_FIELDS = (
    "has_survey", "has_transcript", "runsheet_version",
    "survey_score", "survey_analyze_url", "survey_response_count",
)

def slugify(s):
    s = re.sub(r"\s+", " ", s).strip().lower()
    s = re.sub(r"[^a-z0-9\s-]", "", s)
    return re.sub(r"\s+", "-", s)

def diff_and_merge(fresh_path):
    fresh = json.loads(Path(fresh_path).read_text())
    fresh_rows = fresh.get("rows") or fresh.get("results") or fresh
    if isinstance(fresh_rows, dict) and "rows" in fresh_rows:
        fresh_rows = fresh_rows["rows"]

    existing = json.loads(Path("app/data/sessions.json").read_text())
    by_id = {r["session_id"]: r for r in existing["rows"]}

    added, updated, removed = [], [], []
    new_rows = []
    fresh_ids = set()
    for r in fresh_rows:
        sid = r["session_id"]
        fresh_ids.add(sid)
        if sid in by_id:
            prev = by_id[sid]
            # Preserve user-curated fields
            for k in PRESERVED_FIELDS:
                if k in prev:
                    r[k] = prev[k]
                else:
                    r.setdefault(k, None if k.startswith("survey_") else False)
            # Detect material changes
            mat_keys = ("facilitators", "producers", "number_of_teams", "case_challenge", "start_date")
            if any(prev.get(k) != r.get(k) for k in mat_keys):
                updated.append({"session_id": sid,
                                 "changes": {k: (prev.get(k), r.get(k)) for k in mat_keys if prev.get(k) != r.get(k)}})
            new_rows.append(r)
        else:
            # New session; default preserved fields
            for k in PRESERVED_FIELDS:
                r.setdefault(k, None if k.startswith("survey_") else False)
            new_rows.append(r)
            added.append(sid)

    for sid in by_id:
        if sid not in fresh_ids:
            removed.append(sid)

    # Sort: start_date DESC NULLS LAST
    def sort_key(r):
        sd = r.get("start_date")
        return (0 if sd is None else 1, sd or "")
    new_rows.sort(key=sort_key, reverse=True)

    existing["rows"] = new_rows
    Path("app/data/sessions.json").write_text(json.dumps(existing, indent=2, ensure_ascii=False) + "\n")
    return {"added": added, "updated": updated, "removed": removed, "total": len(new_rows)}

def needs_cc_bake(session_id):
    return not Path(f"app/data/sessions/{session_id}.json").exists()

def main():
    if len(sys.argv) < 2:
        print(__doc__)
        print("\nUsage: python3 scripts/refresh_sessions.py <fresh_sessions.json>")
        print("       (the JSON should be {\"rows\": [...]} from the REFRESH_SQL query)")
        print("\nREFRESH_SQL (copy into the Arrow MCP, save result to a JSON file):")
        print(REFRESH_SQL)
        sys.exit(0)

    fresh_path = sys.argv[1]
    if not Path(fresh_path).exists():
        print(f"  ! Missing input: {fresh_path}")
        sys.exit(1)

    diff = diff_and_merge(fresh_path)
    print(f"sessions.json now has {diff['total']} rows")
    print(f"  added:   {diff['added']}")
    print(f"  updated: {[u['session_id'] for u in diff['updated']]}")
    if diff["updated"]:
        for u in diff["updated"]:
            print(f"    {u['session_id']}: {u['changes']}")
    print(f"  removed: {diff['removed']}")

    if diff["added"]:
        print(f"\n{len(diff['added'])} new session(s) — fetch cc.abilitie.com data with:")
        print(f"  For each session_id, run the SERVER_SQL_TEMPLATE in the Arrow MCP")
        print(f"  to get launched_dns + multi_tenant_session_id, then call:")
        print(f"  python3 scripts/extract_cc_session.py <id> <dns> <cc_uuid> '<case_challenge>'")
        for sid in diff["added"]:
            print(f"    - session_id={sid}")

    # Always re-run the dependent bakes
    print("\nRegenerating lib/cc-session-registry.ts…")
    subprocess.run(["python3", "scripts/generate_session_registry.py"], check=True)

    print("Re-baking facilitators.json…")
    subprocess.run(["python3", "scripts/bake_facilitators.py"], check=True)

    print("\nDone. Review changes with: git diff app/data/sessions.json app/data/facilitators.json")

if __name__ == "__main__":
    main()
