#!/usr/bin/env python3
"""Extract one cc.abilitie.com session's facilitator page + per-team analyses.

Usage: python3 extract_cc_session.py <arrow_id> <dns> <cc_session_uuid> <case_challenge>
"""
import json, re, sys, os, subprocess, time
from urllib.parse import urlparse

def fetch(url: str) -> str:
    """Plain curl."""
    out = subprocess.run(["curl","-s","-L",url], capture_output=True, timeout=30)
    if out.returncode != 0:
        raise RuntimeError(f"curl failed for {url}")
    return out.stdout.decode("utf-8", errors="replace")

def decode_rsc(html: str) -> str:
    """Concatenate all push() payload strings into the raw RSC text."""
    pushes = re.findall(r'self\.__next_f\.push\(\[\d+,(".*?")\]\)', html, re.DOTALL)
    out = ""
    for p in pushes:
        try:
            out += json.loads(p)
        except Exception:
            continue
    return out

def find_balanced_json_obj(s: str, anchor: str):
    """Find s containing `anchor:{...}` and return the parsed {...}."""
    i = s.find(anchor + ":")
    if i < 0: return None
    j = i + len(anchor) + 1
    if j >= len(s) or s[j] != '{': return None
    depth, in_string, escape, k = 0, False, False, j
    while k < len(s):
        c = s[k]
        if escape: escape = False
        elif c == '\\': escape = True
        elif c == '"': in_string = not in_string
        elif not in_string:
            if c == '{': depth += 1
            elif c == '}':
                depth -= 1
                if depth == 0: break
        k += 1
    raw = s[j:k+1]
    raw = re.sub(r'"\$D(20\d{2}-[^"]+)"', r'"\1"', raw)
    return json.loads(raw)

def extract_session_payload(rsc: str):
    """Pull chapters, teams, current chapter's team-result map, and events."""
    # caseChallenge: {id, title, chapters[]}
    cc = find_balanced_json_obj(rsc, '"caseChallenge"')
    # teams: array
    teams_match = re.search(r'"teams":\[((?:\{"id":"[a-f0-9-]+",.*?"groupLetter":"[^"]*"\},?){2,})\]', rsc)
    teams = []
    if teams_match:
        for tm in re.finditer(r'\{"id":"([a-f0-9-]+)","name":"((?:\\.|[^"\\])*)","nameCustomized":(?:true|false),"icon":"([^"]*)","groupLetter":"([^"]*)"\}', teams_match.group(1)):
            try:
                name = json.loads('"' + tm.group(2) + '"')
            except Exception:
                name = tm.group(2)
            teams.append({"id": tm.group(1), "name": name, "icon": tm.group(3), "group_letter": tm.group(4)})
    # events: initialData=[ {id,sessionId,chapterId,timerPhase,queryId,type,content,...} ]
    events = []
    SESSION_ID_RE = re.compile(r'"sessionId":"([a-f0-9-]+)"')
    sid_set = set(SESSION_ID_RE.findall(rsc))
    target_sid = None
    if len(sid_set) == 1:
        target_sid = next(iter(sid_set))
    elif sid_set:
        # pick the most common
        from collections import Counter
        target_sid = Counter(SESSION_ID_RE.findall(rsc)).most_common(1)[0][0]
    if target_sid:
        patt = re.compile(
            r'\{"id":"([^"]+)","sessionId":"' + target_sid + r'","chapterId":"([^"]+)",'
            r'"timerPhase":(?:null|"[A-Z_]+"),"queryId":(?:null|"[^"]+"),'
            r'"type":"([A-Z_]+)","content":"((?:\\.|[^"\\])*)",'
            r'"isFinished":(true|false),"invalidated":(true|false),"triggerArg":[^,]+,'
            r'"metadata":(\{(?:[^{}]|\{[^{}]*\})*\}),'
            r'"createdAt":"\$D([^"]+)","updatedAt":"\$D([^"]+)"\}'
        )
        for m in patt.finditer(rsc):
            eid, chapter_id, etype, content, finished, invalidated, metadata, created, updated = m.groups()
            try: meta = json.loads(metadata)
            except Exception: meta = {}
            try: content_unesc = json.loads('"' + content + '"')
            except Exception: content_unesc = content
            events.append({"id": eid, "chapter_id": chapter_id, "type": etype, "content": content_unesc,
                           "is_finished": finished == "true", "invalidated": invalidated == "true",
                           "metadata": meta, "created_at": created, "updated_at": updated})
    events.sort(key=lambda e: e["created_at"])
    # team_results for the chapter currently being viewed (the page contains data only for one chapter)
    # Pattern: "{teamUuid}":{...,"score":N,"narrativeOutcomeTitle":"..."}
    team_results = {}
    patt2 = re.compile(
        r'"([a-f0-9-]{36})":\{"completedBlockIds":(\[(?:"[^"]+",?)*\]),'
        r'"openedBlockIds":(\[(?:"[^"]+",?)*\]),'
        r'"messageCounts":\{[^}]*\},"transcriptIds":\{[^}]*\},'
        r'"decisionValue":(?:null|"[^"]*"),"decisionRationale":(?:null|"[^"]*"),'
        r'"score":(\d+),"narrativeOutcomeTitle":"((?:\\.|[^"\\])*)","unlockedResourceBlockIds":\[(?:[^\[\]])*\]\}'
    )
    for m in patt2.finditer(rsc):
        tid, completed_raw, opened_raw, score, narrative = m.groups()
        try: narrative = json.loads('"' + narrative + '"')
        except Exception: pass
        team_results[tid] = {
            "completed_block_count": completed_raw.count('","') + (0 if completed_raw == '[]' else 1),
            "opened_block_count": opened_raw.count('","') + (0 if opened_raw == '[]' else 1),
            "score": int(score),
            "narrative_outcome": narrative,
        }
    return cc, teams, events, team_results

def extract_analysis(html: str):
    rsc = decode_rsc(html)
    return find_balanced_json_obj(rsc, '"analysisData"')

def main():
    if len(sys.argv) < 5:
        print("Usage: extract_cc_session.py <arrow_id> <dns> <cc_session_uuid> <case_challenge>")
        sys.exit(1)
    arrow_id, dns, cc_uuid, case_challenge = sys.argv[1], sys.argv[2], sys.argv[3], sys.argv[4]
    out_path = f"app/data/sessions/{arrow_id}.json"
    if os.path.exists(out_path) and "--force" not in sys.argv:
        print(f"  Already exists: {out_path} (use --force to overwrite)")
        sys.exit(0)

    base = f"https://{dns}"
    print(f"Session {arrow_id} ({case_challenge}) on {dns}")

    # Step 1: fetch the no-chapter facilitator page → chapter list, events, etc.
    no_chap_html = fetch(f"{base}/facilitator/{cc_uuid}")
    rsc0 = decode_rsc(no_chap_html)
    cc, teams, events, _ = extract_session_payload(rsc0)
    if not cc:
        print(f"  ! Could not extract caseChallenge from no-chapter page")
        sys.exit(2)
    chapters = cc.get("chapters", [])
    print(f"  Chapters: {len(chapters)}  Teams: {len(teams)}  Events: {len(events)}")

    # Step 2: fetch each chapter's page → team_results per chapter
    team_results_by_chapter = {}
    chapter_timings = {}
    for c in chapters:
        chap_id = c["id"]
        time.sleep(0.1)
        chap_html = fetch(f"{base}/facilitator/{cc_uuid}/{chap_id}")
        rsc_c = decode_rsc(chap_html)
        _, _, chap_events, results = extract_session_payload(rsc_c)
        team_results_by_chapter[chap_id] = results
        # merge events
        seen = {e["id"] for e in events}
        for e in chap_events:
            if e["id"] not in seen:
                events.append(e)
                seen.add(e["id"])

    events.sort(key=lambda e: e["created_at"])

    # Derive chapter timings from events
    for e in events:
        src = e["metadata"].get("source")
        if e["type"] == "STARTING_MESSAGE" and src == "chapter_started":
            chapter_timings.setdefault(e["chapter_id"], {})["started_at"] = e["created_at"]
        elif e["type"] == "ENDING_MESSAGE" and src == "chapter_ended":
            chapter_timings.setdefault(e["chapter_id"], {})["ended_at"] = e["created_at"]

    # Step 3: per-team-per-chapter analysis
    team_analyses_by_chapter = {}
    for c in chapters:
        chap_id = c["id"]
        team_analyses_by_chapter[chap_id] = {}
        for t in teams:
            time.sleep(0.05)
            try:
                ah = fetch(f"{base}/preview/analysis/{t['id']}/{chap_id}")
                obj = extract_analysis(ah)
                if obj:
                    team_analyses_by_chapter[chap_id][t["id"]] = obj
            except Exception as e:
                print(f"    ! analysis fetch failed {t['name']}/{c['title']}: {e}")

    last_chapter_id = chapters[-1]["id"] if chapters else None

    # Compose JSON
    out = {
        "session_arrow_id": int(arrow_id),
        "session_cc_uuid": cc_uuid,
        "case_challenge": case_challenge,
        "case_challenge_id": cc.get("id"),
        "viewed_chapter_id": last_chapter_id,  # default: last chapter
        "extracted_at": "2026-05-20T00:00:00.000Z",
        "source_url": f"{base}/facilitator/{cc_uuid}",
        "tenant_dns": dns,
        "chapters": [{"id": c["id"], "title": c["title"], "order": c["order"], "duration_min": c["duration"], "blocks": c.get("_count",{}).get("blocks",0)} for c in chapters],
        "teams": teams,
        "team_results_for_viewed_chapter": team_results_by_chapter.get(last_chapter_id, {}),
        "team_results_by_chapter": team_results_by_chapter,
        "team_analyses_for_viewed_chapter": team_analyses_by_chapter.get(last_chapter_id, {}),
        "team_analyses_by_chapter": team_analyses_by_chapter,
        "chapter_timings": chapter_timings,
        "events": events,
    }

    os.makedirs("app/data/sessions", exist_ok=True)
    with open(out_path, "w") as f:
        json.dump(out, f, indent=2, ensure_ascii=False)
        f.write("\n")
    n_analyses = sum(len(v) for v in team_analyses_by_chapter.values())
    print(f"  ✓ Wrote {out_path}: {len(events)} events, {n_analyses} team-chapter analyses")

if __name__ == "__main__":
    main()
