#!/usr/bin/env python3
"""For every baked session JSON, fetch reflections and merge them in.

Reflections URL pattern (unauthenticated):
  /debrief/{ccSessionUuid}/reflections        → list of questions
  /debrief/{ccSessionUuid}/reflections/{qid}  → answers for one question

Schema written into the session JSON under `reflections`:
  [
    {
      "id": question_uuid,
      "question": "text",
      "chapter_id": chapter_uuid | None,
      "answers": [
        {
          "id": answer_uuid,
          "answer": "participant text",
          "hidden": bool,
          "created_at": iso,
          "team": {"id":..., "name":..., "icon":...},
          "player": {"id":..., "name":...}
        }
      ]
    }
  ]
"""
import json, os, re, subprocess, sys, time
from pathlib import Path

def fetch(url):
    out = subprocess.run(["curl","-s","-L",url], capture_output=True, timeout=30)
    if out.returncode != 0:
        raise RuntimeError(f"curl failed for {url}")
    return out.stdout.decode("utf-8", errors="replace")

def decode_rsc(html):
    pushes = re.findall(r'self\.__next_f\.push\(\[\d+,(".*?")\]\)', html, re.DOTALL)
    s = ""
    for p in pushes:
        try: s += json.loads(p)
        except Exception: continue
    return s

def find_balanced(s, anchor, expect="[" ):
    i = s.find(anchor)
    if i < 0: return None
    j = i + len(anchor)
    # skip whitespace
    while j < len(s) and s[j] in " \t\n": j += 1
    if j >= len(s) or s[j] != expect: return None
    close = "]" if expect == "[" else "}"
    depth, in_string, escape, k = 0, False, False, j
    while k < len(s):
        c = s[k]
        if escape: escape = False
        elif c == "\\": escape = True
        elif c == '"': in_string = not in_string
        elif not in_string:
            if c == expect: depth += 1
            elif c == close:
                depth -= 1
                if depth == 0: break
        k += 1
    raw = s[j:k+1]
    raw = re.sub(r'"\$D(20\d{2}-[^"]+)"', r'"\1"', raw)
    return json.loads(raw)

def extract_questions(html):
    s = decode_rsc(html)
    # Pattern: "questions":[{"id":"...","question":"...","createdAt":"...","chapter":...}]
    return find_balanced(s, '"questions":', "[")

def extract_answers(html):
    s = decode_rsc(html)
    return find_balanced(s, '"answers":', "[")

def main():
    args = sys.argv[1:]
    force = "--force" in args
    targets = [a for a in args if a != "--force"]
    if not targets and "--all" not in args:
        print("Usage: extract_reflections.py [--all|--force|session_id ...]")
        sys.exit(0)

    if "--all" in args:
        files = sorted(Path("app/data/sessions").glob("*.json"))
    else:
        files = [Path(f"app/data/sessions/{s}.json") for s in targets if s != "--all"]

    for f in files:
        d = json.loads(f.read_text())
        if d.get("reflections") and not force:
            print(f"  {f.stem}: already has reflections, skipping")
            continue
        dns = d.get("tenant_dns")
        sid = d.get("session_cc_uuid")
        if not dns or not sid:
            print(f"  {f.stem}: missing tenant_dns/session_cc_uuid")
            continue
        base = f"https://{dns}"
        try:
            html = fetch(f"{base}/debrief/{sid}/reflections")
        except Exception as e:
            print(f"  {f.stem}: fetch failed: {e}")
            continue
        questions = extract_questions(html) or []
        out_questions = []
        for q in questions:
            qid = q.get("id")
            if not qid: continue
            time.sleep(0.05)
            try:
                qhtml = fetch(f"{base}/debrief/{sid}/reflections/{qid}")
                answers = extract_answers(qhtml) or []
            except Exception as e:
                print(f"    ! {f.stem} question {qid[:8]}: {e}")
                answers = []
            # Normalize keys: createdAt -> created_at
            for a in answers:
                if "createdAt" in a:
                    a["created_at"] = a.pop("createdAt")
            chap = q.get("chapter") or {}
            out_questions.append({
                "id": qid,
                "question": q.get("question",""),
                "chapter_id": chap.get("id") if isinstance(chap, dict) else None,
                "chapter_title": chap.get("title") if isinstance(chap, dict) else None,
                "created_at": q.get("createdAt"),
                "answers": answers,
            })
        d["reflections"] = out_questions
        f.write_text(json.dumps(d, indent=2, ensure_ascii=False) + "\n")
        n_a = sum(len(q["answers"]) for q in out_questions)
        print(f"  ✓ {f.stem}: {len(out_questions)} question(s), {n_a} answer(s)")

if __name__ == "__main__":
    main()
