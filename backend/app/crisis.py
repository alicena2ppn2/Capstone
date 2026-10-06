"""위기 표현 확인.

사용자가 쓴 글(일기·미션 글)에서 위기 신호를 찾는다. 진단이 아니라 도움을 건네기 위한 장치다.
목록은 app/data/crisis_lexicon.json (출처·분류·위험도 포함).

위험도
- high   : 직접적인 죽음·자해 언급 → 바로 상담 안내(109)
- medium : 절망·무가치감·자기비하·강한 고립 → 경고 없이 캐릭터가 안부, 기록
- low    : 절대주의 단어·수면/식욕 호소·외로움 → 사용자에게 보이지 않고 기록만

주의
- 한국어는 "배고파 죽겠다"처럼 '죽'을 강조로 흔히 쓴다 → 제외 목록으로 거른다.
- 절대주의 단어("항상", "절대")는 흔해서 하나만으로는 신호로 치지 않는다 (2개 이상이거나 다른 신호와 함께일 때만).
- 사용자에게는 어떤 단어가 걸렸는지 알리지 않는다.
"""

from __future__ import annotations

import json
import re
from dataclasses import dataclass, field
from pathlib import Path

LEXICON_PATH = Path(__file__).resolve().parent / "data" / "crisis_lexicon.json"
LEVELS = ("high", "medium", "low")

# 상담 안내 (2024년 1월부터 자살예방 상담은 109로 통합)
SUPPORT_CONTACTS = [
    {"name": "자살예방 상담전화", "number": "109", "hours": "24시간"},
    {"name": "정신건강 위기상담", "number": "1577-0199", "hours": "24시간"},
]
SUPPORT_MESSAGE = "많이 힘들었구나. 혼자 견디지 않아도 괜찮아. 지금 이야기 나눌 수 있는 곳이 있어."
CHECK_IN_MESSAGE = "오늘 마음이 무거웠나 봐. 천천히 쉬어도 괜찮아. 내가 옆에 있을게."


def normalize(text: str) -> str:
    """비교용: 공백·문장부호를 없앤다. "죽고 싶어..." → "죽고싶어" """
    return re.sub(r"[\s\W_]+", "", text or "")


def load_lexicon(path: Path = LEXICON_PATH) -> dict:
    raw = json.loads(path.read_text(encoding="utf-8"))
    seen = set()
    terms = []
    for t in raw["terms"]:
        key = normalize(t["term"])
        if not key or key in seen:
            raise ValueError(f"위기 표현이 비었거나 중복: {t['term']}")
        if t["severity"] not in LEVELS:
            raise ValueError(f"알 수 없는 위험도: {t['term']} → {t['severity']}")
        if t["source"] not in raw["sources"]:
            raise ValueError(f"출처가 없는 표현: {t['term']} → {t['source']}")
        seen.add(key)
        terms.append({**t, "key": key})
    # 긴 표현부터 찾아야 "죽고싶"보다 "죽어버리고싶"이 먼저 잡힌다
    terms.sort(key=lambda t: -len(t["key"]))
    return {"terms": terms, "exclude": [normalize(e) for e in raw["exclude"]], "sources": raw["sources"]}


LEXICON = load_lexicon()


@dataclass
class Assessment:
    level: str | None                       # high | medium | low | None
    categories: list[str] = field(default_factory=list)
    matches: list[dict] = field(default_factory=list)   # 내부 기록용 (사용자에게 보내지 않음)

    def care(self) -> dict | None:
        """사용자에게 보낼 반응. low와 None은 아무것도 보내지 않는다."""
        if self.level == "high":
            return {"type": "support", "message": SUPPORT_MESSAGE, "contacts": SUPPORT_CONTACTS}
        if self.level == "medium":
            return {"type": "check_in", "message": CHECK_IN_MESSAGE}
        return None


def assess(text: str, lexicon: dict = LEXICON) -> Assessment:
    s = normalize(text)
    for ex in lexicon["exclude"]:
        s = s.replace(ex, " ")
    matches = []
    for t in lexicon["terms"]:
        n = s.count(t["key"])
        if n:
            matches.append({"term": t["term"], "category": t["category"], "severity": t["severity"], "count": n})
            s = s.replace(t["key"], " ")          # 같은 부분을 짧은 표현이 다시 세지 않게
    if not matches:
        return Assessment(None)

    severities = {m["severity"] for m in matches}
    if "high" in severities:
        level = "high"
    elif "medium" in severities:
        level = "medium"
    else:
        absolutist = sum(m["count"] for m in matches if m["category"] == "absolutist")
        other = [m for m in matches if m["category"] != "absolutist"]
        level = "low" if other or absolutist >= 2 else None
    categories = sorted({m["category"] for m in matches})
    return Assessment(level, categories if level else [], matches if level else [])
