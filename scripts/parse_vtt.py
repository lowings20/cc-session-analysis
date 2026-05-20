"""Parse VTT files into speaker-tagged segments and emit JSON per transcript."""
import re, json, sys
from pathlib import Path

def parse_vtt(path):
    text = Path(path).read_text(encoding="utf-8", errors="replace")
    blocks = re.split(r'\n\n+', text)
    cues = []
    for b in blocks:
        m = re.search(r'(\d{2}:\d{2}:\d{2}\.\d{3})\s+-->\s+(\d{2}:\d{2}:\d{2}\.\d{3})\s*\n(.*)', b, re.DOTALL)
        if not m:
            continue
        start, end, content = m.group(1), m.group(2), m.group(3).strip()
        # Speaker: text format
        if ":" in content.split("\n", 1)[0]:
            speaker, _, line = content.partition(":")
            speaker = speaker.strip()
            line = line.strip().replace("\n", " ")
        else:
            speaker, line = "", content.replace("\n", " ")
        cues.append({"start": start[:8], "speaker": speaker, "text": line})
    return cues

if __name__ == "__main__":
    for path in sys.argv[1:]:
        cues = parse_vtt(path)
        print(f"=== {path} — {len(cues)} cues ===")
        # Aggregate by speaker
        from collections import Counter
        speakers = Counter(c["speaker"] for c in cues)
        for s, n in speakers.most_common():
            print(f"  {s}: {n}")
