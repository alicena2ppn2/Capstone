"""신고·차단·필터 (App Store 심사 1.2: 사용자끼리 글을 남기는 앱은 필터·신고·차단이 있어야 한다).

- 필터: 방명록 글·보이는 이름·닉네임에 욕설·비하·성적 표현이 있으면 저장하지 않는다. 목록은 app/data/profanity.json
  혐오 표현(slurs)을 방명록에 쓰면 글을 막고 방명록 쓰기를 SLUR_BAN_DAYS일 정지한다
- 차단: 서로의 방 추천·방문·방명록에서 사라진다 (어느 쪽이 차단했든 양쪽 모두)
- 신고: 신고한 사람에게는 바로 안 보이고, 서로 다른 사람 REPORT_HIDE_COUNT명이 신고한 글은 모두에게 숨긴다
  가입 NEW_ACCOUNT_DAYS일이 안 된 계정의 신고는 기록만 하고 숨김 횟수에 세지 않는다 (새 계정으로 멀쩡한 글을 숨기는 것 방지)

참고: Habitica(github.com/HabitRPG/habitica) — 신고 2건 숨김, 가입 3일 미만 신고 미반영, 혐오 표현 사용 시 채팅 정지
"""

from __future__ import annotations

import json
import re
from pathlib import Path

PROFANITY_PATH = Path(__file__).resolve().parent / "data" / "profanity.json"
REPORT_HIDE_COUNT = 2                 # 이만큼 다른 사람이 신고하면 모두에게 숨김
NEW_ACCOUNT_DAYS = 3                  # 가입한 지 이만큼 안 된 계정의 신고는 숨김 횟수에 안 셈
SLUR_BAN_DAYS = 7                     # 혐오 표현을 쓰면 방명록 쓰기 정지 기간
REPORT_REASONS = ("spam", "abuse", "sexual", "hate", "self_harm", "other")
REPORT_TARGETS = ("guestbook", "place_note", "user")   # place_note: 동네 탐험 장소 쪽지
FILTER_MESSAGE = "다른 말로 바꿔 써 줄래요?"   # 어떤 단어가 걸렸는지는 알려 주지 않는다


def normalize(text: str) -> str:
    """비교용: 공백·문장부호·숫자를 없애고 소문자로. "시 1 발" → "시발" """
    return re.sub(r"[\s\W_\d]+", "", (text or "").lower())


def load(path: Path = PROFANITY_PATH) -> dict:
    raw = json.loads(path.read_text(encoding="utf-8"))
    terms = sorted({normalize(t) for t in raw["terms"] if normalize(t)}, key=len, reverse=True)
    slurs = sorted({normalize(t) for t in raw["slurs"] if normalize(t)}, key=len, reverse=True)
    return {"terms": terms, "slurs": slurs, "exclude": [normalize(e) for e in raw["exclude"]]}


WORDS = load()


def check(text: str, words: dict = WORDS) -> str | None:
    """None(괜찮음) | "slur"(혐오 표현) | "profanity"(욕설 등)."""
    s = normalize(text)
    for ex in words["exclude"]:
        s = s.replace(ex, " ")
    if any(t in s for t in words["slurs"]):
        return "slur"
    if any(t in s for t in words["terms"]):
        return "profanity"
    return None


def is_clean(text: str, words: dict = WORDS) -> bool:
    return check(text, words) is None
