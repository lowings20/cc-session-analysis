"""Surface candidate magic moments from VTT transcripts.

Heuristic: pick facilitator cues with telling phrases or long monologues.
Output JSON for human/LLM curation.
"""
import re, json, sys
from pathlib import Path

TELLING_PHRASES = [
    "what I love about", "great point", "exactly right", "key insight",
    "the most important", "if you take one thing", "powerful",
    "this is the moment", "what's really going on", "the real",
    "what matters here", "the truth is", "I'll tell you", "honestly",
    "in my experience", "the trick is", "this is why", "here's the thing",
    "what we just saw", "notice how", "did you catch", "step back",
    "zoom out", "pause for a moment", "think about", "consider this",
    "the question really is", "let me reframe", "permission to",
    "give yourself permission",
]

FACILITATOR_HINTS = ["Tam Nolte", "Nick White", "Paul Kirkitelos", "Rebecca Kaloo",
                     "Diana Pavlovská", "Tara Layne", "Angie Bealko", "Matt Rubins",
                     "Kristen Kramer", "Christine Looser"]

def parse_vtt(path):
    text = Path(path).read_text(encoding="utf-8", errors="replace")
    blocks = re.split(r'\n\n+', text)
    cues = []
    for b in blocks:
        m = re.search(r'(\d{2}:\d{2}:\d{2}\.\d{3})\s+-->\s+(\d{2}:\d{2}:\d{2}\.\d{3})\s*\n(.*)', b, re.DOTALL)
        if not m: continue
        start = m.group(1)[:8]
        content = m.group(3).strip()
        if ":" in content.split("\n", 1)[0]:
            speaker, _, line = content.partition(":")
            speaker = speaker.strip()
            line = line.strip().replace("\n", " ")
        else:
            speaker, line = "", content.replace("\n", " ")
        cues.append({"start": start, "speaker": speaker, "text": line})
    return cues

def candidates(cues):
    """Return list of {start, speaker, text, reason}."""
    out = []
    # Detect facilitator: most-frequent speaker who matches FACILITATOR_HINTS
    from collections import Counter
    counts = Counter(c["speaker"] for c in cues if c["speaker"])
    facilitator = None
    for s, _ in counts.most_common():
        if any(h.lower() in s.lower() for h in FACILITATOR_HINTS):
            facilitator = s; break
    if not facilitator and counts:
        facilitator = counts.most_common(1)[0][0]

    # Find phrase matches in facilitator cues
    for i, c in enumerate(cues):
        if c["speaker"] != facilitator: continue
        text_lower = c["text"].lower()
        for phrase in TELLING_PHRASES:
            if phrase in text_lower:
                # Grab a small window for context
                ctx_before = cues[max(0,i-2):i]
                ctx_after = cues[i+1:min(len(cues),i+3)]
                out.append({
                    "start": c["start"],
                    "speaker": c["speaker"],
                    "text": c["text"],
                    "trigger_phrase": phrase,
                    "context_before": [{"speaker":x["speaker"], "text":x["text"][:140]} for x in ctx_before],
                    "context_after": [{"speaker":x["speaker"], "text":x["text"][:140]} for x in ctx_after],
                })
                break

    # Also include all long monologues (>= 300 chars) from facilitator
    for i, c in enumerate(cues):
        if c["speaker"] != facilitator: continue
        if len(c["text"]) < 300: continue
        if any(x["start"] == c["start"] for x in out): continue
        out.append({
            "start": c["start"],
            "speaker": c["speaker"],
            "text": c["text"],
            "trigger_phrase": "long monologue",
            "context_before": [],
            "context_after": [],
        })

    # Sort by time
    out.sort(key=lambda x: x["start"])
    return facilitator, out

if __name__ == "__main__":
    bundle = []
    for path in sys.argv[1:]:
        cues = parse_vtt(path)
        facilitator, cands = candidates(cues)
        bundle.append({
            "transcript_path": path,
            "facilitator": facilitator,
            "n_cues": len(cues),
            "candidates": cands,
        })
    print(json.dumps(bundle, indent=2, ensure_ascii=False))
