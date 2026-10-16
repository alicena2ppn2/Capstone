"""연속 출석표 — 모바일 게임처럼 '1일차 → 7일차' 사다리 (10/16 결정).

- 매일 출석하면 한 칸씩 올라간다. 7일차를 받으면 다음 날은 다시 1일차 (새 바퀴)
- 하루라도 빠지면 연속이 끊겨 다음 출석은 1일차부터 다시
- 선물은 칸마다 정해져 있고 뒤로 갈수록 커진다: 1~6일차는 코인·XP, 7일차는 특별 선물(옷 또는 집 소품)
  7일차 선물은 사람·바퀴(시작한 날)마다 정해짐 → 같은 바퀴에서 다시 열어도 바뀌지 않음
- 하루 한 번. 이미 가진 옷·소품이면 30코인으로 대신 준다
"""

from __future__ import annotations

import random
from datetime import date as Date, timedelta

CYCLE = 7
DAY_REWARDS = [
    {"type": "coins", "amount": 10}, {"type": "xp", "amount": 5}, {"type": "coins", "amount": 20},
    {"type": "xp", "amount": 8}, {"type": "coins", "amount": 30}, {"type": "xp", "amount": 10},
]
SPECIAL_FALLBACK = {"type": "coins", "amount": 50}   # 옷·소품 목록이 비었을 때
DUPLICATE_COINS = 30


def cycle_plan(user_id: str, start: Date, outfits: list[str], decor: list[str]) -> list[dict]:
    """이번 바퀴 1~7일차 선물. 7일차만 사람·바퀴마다 정해지는 특별 선물."""
    rng = random.Random(f"{user_id}:{start.isoformat()}:attendance")
    pool = [("outfit", i) for i in outfits] + [("decor", i) for i in decor]
    if pool:
        kind, item = rng.choice(pool)
        special = {"type": kind, "id": item}
    else:
        special = dict(SPECIAL_FALLBACK)
    return [dict(r) for r in DAY_REWARDS] + [special]


def position(claimed: set[str], today: Date) -> dict:
    """오늘이 이번 바퀴 몇 일차인지.

    claimed: 출석한 날짜들(YYYY-MM-DD). 반환: start(이번 바퀴 1일차 날짜), index(오늘 칸 0~6),
    streak(어제까지 또는 오늘까지 이어진 연속 일수), reset(연속이 끊겨 1일차로 돌아왔는지)
    """
    def run_back(end: Date) -> int:
        n = 0
        while (end - timedelta(days=n)).isoformat() in claimed:
            n += 1
        return n

    if today.isoformat() in claimed:
        streak = run_back(today)
        index = (streak - 1) % CYCLE
        reset = False
    else:
        streak = run_back(today - timedelta(days=1))
        index = streak % CYCLE
        reset = streak == 0 and any(d < today.isoformat() for d in claimed)   # 전에 출석했는데 어제는 안 옴
    return {"start": today - timedelta(days=index), "index": index, "streak": streak, "reset": reset}
