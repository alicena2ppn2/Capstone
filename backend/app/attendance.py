"""주간 출석표 (앱 shared/features/game.js의 출석표와 같은 규칙, 10/15 결정: 출석은 앱 방식).

- 월요일마다 그 주 7일의 선물을 미리 정해 둔다: 코인 10/20/30 · XP 5/8/10 (80%), 옷 (10%), 집 소품 (10%)
- 사람·주마다 같은 선물 (같은 주에 다시 열어도 바뀌지 않음). 바로 전날과 같은 선물이면 다른 종류로 바꿈
- 하루 한 번 받는다. 이미 가진 옷·소품이면 30코인으로 대신 준다
- 결석·연속 출석 조건·지난 날 소급은 없다 (앱과 같음)
"""

from __future__ import annotations

import random
from datetime import date as Date, timedelta

REWARDS = [
    {"type": "coins", "amount": 10}, {"type": "coins", "amount": 20}, {"type": "coins", "amount": 30},
    {"type": "xp", "amount": 5}, {"type": "xp", "amount": 8}, {"type": "xp", "amount": 10},
]
DUPLICATE_COINS = 30


def week_start(d: Date) -> Date:
    return d - timedelta(days=d.weekday())


def week_plan(user_id: str, monday: Date, outfits: list[str], decor: list[str]) -> dict[str, dict]:
    """그 주 날짜 → 선물. 같은 사람·같은 주면 항상 같다."""
    rng = random.Random(f"{user_id}:{monday.isoformat()}:attendance")
    plan, previous = {}, None
    for i in range(7):
        roll = rng.random()
        if roll < .1 and outfits:
            reward = {"type": "outfit", "id": rng.choice(outfits)}
        elif roll < .2 and decor:
            reward = {"type": "decor", "id": rng.choice(decor)}
        else:
            reward = dict(rng.choice(REWARDS))
        if previous == reward:
            reward = dict(next(r for r in REWARDS if r["type"] != previous["type"]))
        plan[(monday + timedelta(days=i)).isoformat()] = reward
        previous = reward
    return plan
