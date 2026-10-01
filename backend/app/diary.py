"""하루 기록(일기) 주제.

주제 목록은 app/data/diary_topics.json. 추가·수정은 그 파일만 고치면 된다.
사용자마다 주제 순서를 섞어 두고 날짜에 따라 하나씩 꺼낸다.
→ 같은 날엔 항상 같은 주제, 주제 수(50개)만큼은 같은 주제가 다시 나오지 않는다.
"""

from __future__ import annotations

import json
import random
from datetime import date as Date
from pathlib import Path

TOPICS_PATH = Path(__file__).resolve().parent / "data" / "diary_topics.json"


def load_topics(path: Path = TOPICS_PATH) -> list[dict]:
    topics = json.loads(path.read_text(encoding="utf-8"))
    ids = [t["id"] for t in topics]
    if len(ids) != len(set(ids)):
        raise ValueError("일기 주제 id 중복")
    for t in topics:
        if not t.get("text"):
            raise ValueError(f"주제 문장이 비었습니다: {t['id']}")
    return topics


TOPICS: list[dict] = load_topics()
TOPICS_BY_ID: dict[str, dict] = {t["id"]: t for t in TOPICS}


def topic_for(user_id: str, date: str) -> dict:
    """오늘의 일기 주제."""
    order = list(range(len(TOPICS)))
    random.Random(f"diary:{user_id}").shuffle(order)
    day_no = Date.fromisoformat(date).toordinal()
    return TOPICS[order[day_no % len(TOPICS)]]
