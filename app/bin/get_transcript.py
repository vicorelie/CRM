#!/usr/bin/env python3
import sys, json
from youtube_transcript_api import YouTubeTranscriptApi, TranscriptsDisabled, NoTranscriptFound

def fetch(video_id: str):
    # 1) Essayer un transcript créateur (toutes langues)
    try:
        lst = YouTubeTranscriptApi.list_transcripts(video_id)
        # priorité: non généré automatiquement et en langue originale si possible
        preferred = None
        for t in lst:
            if not t.is_generated:
                preferred = t
                break
        if not preferred:
            # 2) Repli: auto-generated
            for t in lst:
                if t.is_generated:
                    preferred = t
                    break
        if not preferred:
            raise NoTranscriptFound("No suitable transcript")

        parts = preferred.fetch()
        text = " ".join(p.get("text", "") for p in parts if p.get("text"))
        lang = preferred.language_code or "unknown"
        return {"text": text.strip(), "language": lang}
    except (TranscriptsDisabled, NoTranscriptFound):
        return None

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("NO_TRANSCRIPT")
        sys.exit(1)
    vid = sys.argv[1].strip()
    data = fetch(vid)
    if not data or not data.get("text"):
        print("NO_TRANSCRIPT")
        sys.exit(0)
    print(json.dumps(data, ensure_ascii=False))
