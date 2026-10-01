"""오늘의 미션 고르기.

복잡한 점수 대신 한 가지만 본다: 오늘(또는 어제) 밖에 나갔는가?
- 안 나갔으면: 부담 없이 밖으로 한 발 나가게 하는 미션 + 집에서도 할 수 있는 미션
- 나갔으면: 기록·공유 위주의 가벼운 미션

미션은 하루 최대 3개. 같은 날이면 같은 미션이 나오도록 날짜로 고정한다.
미션을 끝내면 코인을 준다. 밖에 나가는 미션은 더 많이 주고, 3개를 다 하면 보너스.
"""

from __future__ import annotations

import random
from dataclasses import asdict, dataclass

import numpy as np

MISSIONS_PER_DAY = 3
STAY_HOME_STEPS = 1_000          # 이 걸음 미만이면 "안 나간 날"
STAY_HOME_RATIO = 0.5            # 또는 평소 걸음 중앙값의 50% 미만

COINS_OUTDOOR = 30               # 밖에 나가야 하는 미션
COINS_HOME = 20                  # 집에서 할 수 있는 미션
COINS_ALL_DONE_BONUS = 30        # 하루 미션을 모두 끝냈을 때


@dataclass(frozen=True)
class Mission:
    id: str
    title: str
    desc: str
    kind: str          # steps | text | photo | list
    outdoor: bool      # 밖에 나가야 할 수 있는 미션인지
    min_count: int = 1 # list: 입력 개수, photo: 사진 장수, steps: 목표 걸음
    prompt: str = ""   # 입력 전에 먼저 묻는 것 (예: 사는 동네)

    @property
    def coins(self) -> int:
        return COINS_OUTDOOR if self.outdoor else COINS_HOME

    def to_dict(self) -> dict:
        return {**asdict(self), "coins": self.coins}


CATALOG: dict[str, Mission] = {m.id: m for m in [
    Mission("walk", "오늘 걸음 채우기", "집 앞이라도 천천히 걸어봐요.", "steps", True, 2_000),
    Mission("diary", "오늘의 하루 기록하기", "짧게 한 줄이어도 좋아요.", "text", False),
    Mission("photo_nature", "밖에서 만난 친구 찍기", "고양이, 강아지, 꽃… 눈에 띈 걸 찍어서 스토리에 올려봐요.", "photo", True),
    Mission("seasonal_food", "제철 음식 먹기", "요즘 맛있는 제철 음식을 먹고 사진으로 남겨봐요.", "photo", False),
    Mission("drink_run", "좋아하는 음료수 사 오기", "가까운 가게에 들러 좋아하는 음료수를 사 와요.", "photo", True),
    Mission("local_food", "우리 동네 맛집 세 곳", "사는 동네의 맛집을 세 곳 이상 적어봐요.", "list", False, 3, "사는 동네가 어디예요?"),
    Mission("movies", "요즘 영화 세 편", "요즘 상영 중인 영화를 세 편 이상 적어봐요.", "list", False, 3),
    Mission("music", "좋아하는 음악 세 곡 적기", "좋아하는 장르의 음악을 직접 찾아서 세 곡 이상 적어봐요.", "list", False, 3, "좋아하는 음악 장르는?"),
    Mission("meal_photo", "오늘 먹은 밥 공유하기", "오늘 먹은 한 끼를 사진으로 공유해요.", "photo", False),
]}

# 안 나간 날: 밖으로 한 발 + 집에서 할 것 + 입력형
STAY_HOME_POOL = {
    "outdoor": ["photo_nature", "drink_run", "walk"],
    "home": ["meal_photo", "seasonal_food", "diary"],
    "input": ["local_food", "movies", "music"],
}
# 나간 날: 기록·공유 위주
WENT_OUT_POOL = {
    "record": ["diary", "meal_photo"],
    "share": ["photo_nature", "seasonal_food"],
    "input": ["local_food", "movies", "music"],
}


def stayed_home(steps: float | None, usual_steps: float | None = None) -> bool | None:
    """밖에 안 나간 날인지. 걸음 데이터가 없으면 None(모름)."""
    if steps is None or np.isnan(steps):
        return None
    if steps < STAY_HOME_STEPS:
        return True
    if usual_steps and not np.isnan(usual_steps) and steps < usual_steps * STAY_HOME_RATIO:
        return True
    return False


def pick_missions(
    user_id: str,
    date: str,
    steps: float | None,
    usual_steps: float | None = None,
    recent: list[str] | None = None,
) -> dict:
    """오늘의 미션 3개를 고른다.

    steps: 판단에 쓸 걸음 수 (보통 어제 걸음 — 오늘은 아직 안 끝났으므로)
    usual_steps: 평소 걸음 중앙값 (있으면 "평소의 절반 미만"도 안 나간 날로 봄)
    recent: 최근에 줬던 미션 id. 가능하면 겹치지 않게 고른다.
    """
    home = stayed_home(steps, usual_steps)
    pool = STAY_HOME_POOL if home in (True, None) else WENT_OUT_POOL
    rng = random.Random(f"{user_id}:{date}")
    recent = set(recent or [])

    picked: list[str] = []
    for options in pool.values():
        fresh = [m for m in options if m not in recent and m not in picked]
        choices = fresh or [m for m in options if m not in picked]
        picked.append(rng.choice(choices))

    missions = [CATALOG[m].to_dict() for m in picked[:MISSIONS_PER_DAY]]
    walk = next((m for m in missions if m["id"] == "walk"), None)
    if walk and usual_steps and not np.isnan(usual_steps):
        # 평소의 절반, 1,000~5,000보 사이에서 100보 단위
        walk["min_count"] = int(min(5_000, max(1_000, round(usual_steps * 0.5, -2))))

    return {
        "date": date,
        "stayed_home": home,
        "missions": missions,
    }


def is_complete(mission: Mission | dict, submission: dict) -> bool:
    """미션 완료 판정.

    submission 예:
    - steps: {"steps": 2300}
    - text:  {"text": "오늘은 …"}
    - photo: {"photos": ["blob-id", ...]}
    - list:  {"items": ["A식당", "B카페", "C분식"]}
    """
    m = mission if isinstance(mission, dict) else mission.to_dict()
    kind, need = m["kind"], m["min_count"]
    if kind == "steps":
        return (submission.get("steps") or 0) >= need
    if kind == "text":
        return bool(str(submission.get("text") or "").strip())
    if kind == "photo":
        return len(submission.get("photos") or []) >= need
    if kind == "list":
        items = [str(i).strip() for i in submission.get("items") or []]
        return len({i for i in items if i}) >= need
    raise ValueError(f"알 수 없는 미션 종류: {kind}")


def settle_coins(missions: list[dict], completed_ids: set[str] | list[str], already_paid: set[str] | list[str] = ()) -> dict:
    """오늘 받을 코인을 계산한다.

    missions: pick_missions()가 준 오늘의 미션
    completed_ids: 완료 판정을 통과한 미션 id
    already_paid: 이미 코인을 준 항목 id (미션 id, 보너스는 "all_done"). 같은 보상을 두 번 주지 않기 위해 쓴다.

    돌려주는 값: {"items": [{"id", "coins"}...], "total": 이번에 줄 코인, "all_done": 3개 다 했는지}
    """
    today = {m["id"]: m for m in missions}
    done = set(completed_ids) & set(today)
    paid = set(already_paid)

    items = [{"id": mid, "coins": today[mid]["coins"]} for mid in today if mid in done and mid not in paid]
    all_done = len(today) > 0 and done == set(today)
    if all_done and "all_done" not in paid:
        items.append({"id": "all_done", "coins": COINS_ALL_DONE_BONUS})
    return {"items": items, "total": sum(i["coins"] for i in items), "all_done": all_done}
