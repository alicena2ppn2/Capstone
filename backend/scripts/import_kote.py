"""KOTE(한국어 온라인 댓글 감정 데이터, MIT 라이선스)를 DB의 kote_comments 표에 넣는다.

https://github.com/searle-j/KOTE — 댓글 5만 개, 감정 44종 (절망·패배/자기혐오·힘듦/지침·슬픔 등)
위기 표현 목록이 실제 한국어 글에서 얼마나 잘못 걸리는지 확인하는 데 쓴다 (scripts/check_crisis_lexicon.py).

실행 (backend 폴더에서): python scripts/import_kote.py
"""

from __future__ import annotations

import json
import sys
import urllib.request
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from app import db  # noqa: E402

BASE = "https://raw.githubusercontent.com/searle-j/KOTE/main"
LABELS = ["불평/불만", "환영/호의", "감동/감탄", "지긋지긋", "고마움", "슬픔", "화남/분노", "존경", "기대감",
          "우쭐댐/무시함", "안타까움/실망", "비장함", "의심/불신", "뿌듯함", "편안/쾌적", "신기함/관심", "아껴주는",
          "부끄러움", "공포/무서움", "절망", "한심함", "역겨움/징그러움", "짜증", "어이없음", "없음", "패배/자기혐오",
          "귀찮음", "힘듦/지침", "즐거움/신남", "깨달음", "죄책감", "증오/혐오", "흐뭇함(귀여움/예쁨)", "당황/난처",
          "경악", "부담/안_내킴", "서러움", "재미없음", "불쌍함/연민", "놀람", "행복", "불안/걱정", "기쁨", "안심/신뢰"]


def parse(tsv: str) -> list[tuple[int, str, list[str]]]:
    rows = []
    for line in tsv.splitlines():
        parts = line.split("\t")
        if len(parts) < 3 or not parts[0].isdigit():
            continue
        labels = [LABELS[int(i)] for i in parts[2].split(",") if i.strip().isdigit()]
        rows.append((int(parts[0]), parts[1], labels))
    return rows


def main():
    conn = db.connect()
    total = 0
    for name in ("train", "val", "test"):
        with urllib.request.urlopen(f"{BASE}/{name}.tsv") as r:
            rows = parse(r.read().decode("utf-8"))
        conn.executemany("INSERT OR REPLACE INTO kote_comments (id, text, labels) VALUES (?, ?, ?)",
                         [(i, t, json.dumps(ls, ensure_ascii=False)) for i, t, ls in rows])
        conn.commit()
        total += len(rows)
        print(f"{name}: {len(rows)}개")
    print(f"KOTE {total}개를 kote_comments 표에 넣었습니다.")


if __name__ == "__main__":
    main()
