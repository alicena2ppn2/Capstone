"""위기 표현 목록 점검: KOTE 댓글에서 위험도별로 얼마나 걸리는지 본다.

행복·기쁨 댓글에서 high가 많이 걸리면 잘못 걸리는 표현이 있다는 뜻 → 목록이나 제외 목록을 고친다.
먼저 python scripts/import_kote.py 로 KOTE를 넣어 둘 것.

실행 (backend 폴더에서): python scripts/check_crisis_lexicon.py
"""

from __future__ import annotations

import collections
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from app import crisis, db  # noqa: E402

HAPPY = {"행복", "기쁨", "즐거움/신남", "고마움", "흐뭇함(귀여움/예쁨)"}
DESPAIR = {"절망", "패배/자기혐오"}


def group(labels: set[str]) -> str:
    if labels & DESPAIR and not labels & HAPPY:
        return "절망·자기혐오"
    if labels & HAPPY and not labels & DESPAIR:
        return "행복·기쁨"
    return "그 외"


def report(rows) -> dict:
    count, hits, samples = collections.Counter(), collections.Counter(), collections.defaultdict(list)
    for text, labels in rows:
        g = group(labels)
        count[g] += 1
        level = crisis.assess(text).level
        hits[(g, level)] += 1
        if level == "high" and g == "행복·기쁨":
            samples[g].append(text)
    return {"count": count, "hits": hits, "samples": samples}


def main():
    conn = db.connect()
    rows = [(r["text"], set(json.loads(r["labels"]))) for r in conn.execute("SELECT text, labels FROM kote_comments")]
    if not rows:
        print("kote_comments가 비어 있습니다. 먼저 python scripts/import_kote.py")
        return
    r = report(rows)
    print(f"KOTE 댓글 {len(rows)}개")
    for g in ("행복·기쁨", "절망·자기혐오", "그 외"):
        n = r["count"][g]
        line = " · ".join(f"{lv} {r['hits'][(g, lv)]} ({r['hits'][(g, lv)] / n * 100:.2f}%)" for lv in ("high", "medium", "low"))
        print(f"{g:8} {n:6}개  {line}")
    if r["samples"]["행복·기쁨"]:
        print("\n행복·기쁨 댓글인데 high로 걸린 예 (잘못 걸림 후보):")
        for t in r["samples"]["행복·기쁨"][:10]:
            print("  -", t[:100])


if __name__ == "__main__":
    main()
