"""오늘의 미션 고르기.

복잡한 점수 대신 한 가지만 본다: 오늘(또는 어제) 밖에 나갔는가?
- 안 나갔으면: 부담 없이 밖으로 한 발 나가게 하는 미션 + 집에서도 할 수 있는 미션
- 나갔으면: 기록 + 집에서 할 것 + 찾아보기

미션 목록은 app/data/missions.json 에 있다.

미션은 상태를 판정하는 게 아니라 행동을 유도하는 장치다.
예: 동네 맛집을 직접 찾아보게 하면 → 가보고 싶은 곳이 생기고 → 밖으로 나갈 계기가 된다.
그래서 찾아보기·사진 찍기처럼 사용자가 직접 움직이는 미션만 둔다.

미션은 하루 최대 3개. 같은 날이면 같은 미션이 나오도록 날짜로 고정한다.
미션을 끝내면 코인을 준다. 밖에 나가는 미션은 더 많이 주고, 3개를 다 하면 보너스.
"""

from __future__ import annotations

import json
import math
import random
from dataclasses import asdict, dataclass
from pathlib import Path

from . import diary

import numpy as np

MISSIONS_PER_DAY = 3
STAY_HOME_STEPS = 1_000          # 이 걸음 미만이면 "안 나간 날"
STAY_HOME_RATIO = 0.5            # 또는 평소 걸음 중앙값의 50% 미만
LAST_WEEK_MIN_DAYS = 4            # '지난주보다' 미션은 지난 7일 중 기록이 4일 이상일 때만
DAILY_STEP_GOAL = 8_000          # 하루 걸음 목표 (권장 걸음). 홈 화면 걸음 바와 '오늘 걸음 채우기' 미션에 쓴다

COINS_OUTDOOR = 30               # 밖에 나가야 하는 미션
COINS_HOME = 20                  # 집에서 할 수 있는 미션
COINS_ALL_DONE_BONUS = 30        # 하루 미션을 모두 끝냈을 때


CATALOG_PATH = Path(__file__).resolve().parent / "data" / "missions.json"

# 분류 (missions.json의 category)
#   outdoor : 밖으로 한 발 (걸음·밖에서 사진)
#   home    : 집에서 할 수 있는 작은 행동
#   explore : 직접 찾아보고 적기 (맛집·영화·음악…) — 나갈 계기를 만든다
#   record  : 하루 기록
CATEGORIES = ("outdoor", "home", "explore", "record")
KINDS = ("steps", "text", "photo", "list", "diary")
STAY_HOME_PLAN = ("outdoor", "home", "explore")   # 안 나간 날
WENT_OUT_PLAN = ("record", "home", "explore")     # 나간 날


@dataclass(frozen=True)
class Mission:
    id: str
    category: str      # outdoor | home | explore | record
    title: str
    desc: str
    kind: str          # steps | text | photo | list | diary(기록 탭 일기로 완료)
    outdoor: bool      # 밖에 나가야 할 수 있는 미션인지
    min_count: int = 1 # list: 입력 개수, photo: 사진 장수, steps: 목표 걸음
    prompt: str = ""   # 입력 전에 먼저 묻는 것 (예: 사는 동네)
    goal_rule: str = "fixed"  # 걸음 목표: fixed(min_count 그대로) | yesterday(어제보다) | last_week(지난 7일 평균보다)

    @property
    def coins(self) -> int:
        return COINS_OUTDOOR if self.outdoor else COINS_HOME

    def to_dict(self) -> dict:
        return {**asdict(self), "coins": self.coins}


def load_catalog(path: Path = CATALOG_PATH) -> dict[str, Mission]:
    """missions.json을 읽는다. 미션을 추가·수정할 때는 이 파일만 고치면 된다."""
    rows = json.loads(path.read_text(encoding="utf-8"))
    catalog: dict[str, Mission] = {}
    for row in rows:
        m = Mission(**row)
        if m.id in catalog:
            raise ValueError(f"미션 id 중복: {m.id}")
        if m.category not in CATEGORIES:
            raise ValueError(f"알 수 없는 분류: {m.id} → {m.category}")
        if m.kind not in KINDS:
            raise ValueError(f"알 수 없는 종류: {m.id} → {m.kind}")
        if m.goal_rule not in ("fixed", "yesterday", "last_week"):
            raise ValueError(f"알 수 없는 걸음 목표 규칙: {m.id} → {m.goal_rule}")
        catalog[m.id] = m
    return catalog


CATALOG: dict[str, Mission] = load_catalog()

# 하루에 같이 나오면 하나로 둘 다 끝나 버리는 미션 (일기 한 번에 두 미션 완료 방지)
CONFLICTS = {"diary": {"topic_diary"}, "topic_diary": {"diary"}}
BY_CATEGORY: dict[str, list[str]] = {c: [m.id for m in CATALOG.values() if m.category == c] for c in CATEGORIES}


def stayed_home(steps: float | None, usual_steps: float | None = None) -> bool | None:
    """밖에 안 나간 날인지. 걸음 데이터가 없으면 None(모름)."""
    if steps is None or np.isnan(steps):
        return None
    if steps < STAY_HOME_STEPS:
        return True
    if usual_steps and not np.isnan(usual_steps) and steps < usual_steps * STAY_HOME_RATIO:
        return True
    return False


def _valid(v) -> bool:
    return v is not None and not (isinstance(v, float) and math.isnan(v))


def beat_goal(prev: float) -> int:
    """기준보다 많이: 기준을 넘는 다음 100보 단위. 예: 3,240 → 3,300, 3,200 → 3,300"""
    return int(math.floor(prev / 100) * 100 + 100)


def step_baselines(steps: float | None, last_week_steps: list[float] | None) -> dict[str, float]:
    """기록 기반 걸음 미션에 쓸 기준값. 기록이 부족한 규칙은 빠진다."""
    out = {}
    if _valid(steps):
        out["yesterday"] = float(steps)
    week = [float(v) for v in (last_week_steps or []) if _valid(v)]
    if len(week) >= LAST_WEEK_MIN_DAYS:
        out["last_week"] = sum(week) / len(week)
    return out


def personalize(mission: dict, baselines: dict[str, float]) -> dict:
    """기록 기반 걸음 미션의 목표와 문구를 채운다."""
    rule = mission.get("goal_rule", "fixed")
    if rule == "fixed":
        return mission
    prev = baselines[rule]
    goal = beat_goal(prev)
    return {**mission, "min_count": goal, "desc": mission["desc"].format(prev=f"{round(prev):,}", goal=f"{goal:,}")}


def with_topic(mission: dict, topic: dict) -> dict:
    """주제 일기 미션에 오늘의 주제를 넣는다."""
    if "{topic}" not in mission["desc"]:
        return mission
    return {**mission, "desc": mission["desc"].format(topic=topic["text"]), "topic_id": topic["id"]}


def pick_missions(
    user_id: str,
    date: str,
    steps: float | None,
    usual_steps: float | None = None,
    recent: list[str] | None = None,
    last_week_steps: list[float] | None = None,
) -> dict:
    """오늘의 미션 3개를 고른다.

    steps: 판단에 쓸 걸음 수 (보통 어제 걸음 — 오늘은 아직 안 끝났으므로)
    usual_steps: 평소 걸음 중앙값 (있으면 "평소의 절반 미만"도 안 나간 날로 봄)
    recent: 최근에 줬던 미션 id. 가능하면 겹치지 않게 고른다.
    last_week_steps: 지난 7일 걸음 (있으면 "지난주보다 많이 걷기" 미션이 나올 수 있음)
    """
    baselines = step_baselines(steps, last_week_steps)
    home = stayed_home(steps, usual_steps)
    plan = STAY_HOME_PLAN if home in (True, None) else WENT_OUT_PLAN
    rng = random.Random(f"{user_id}:{date}")
    recent = set(recent or [])

    picked: list[str] = []
    for category in plan:
        # 기준 기록이 없는 걸음 미션(어제보다·지난주보다)은 후보에서 뺀다
        options = [m for m in BY_CATEGORY[category] if CATALOG[m].goal_rule == "fixed" or CATALOG[m].goal_rule in baselines]
        options = [m for m in options if not CONFLICTS.get(m, set()) & set(picked)]
        fresh = [m for m in options if m not in recent and m not in picked]
        choices = fresh or [m for m in options if m not in picked]
        picked.append(rng.choice(choices))

    topic = diary.topic_for(user_id, date)
    missions = [with_topic(personalize(CATALOG[m].to_dict(), baselines), topic) for m in picked[:MISSIONS_PER_DAY]]

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
    if kind in ("text", "diary"):
        if not str(submission.get("text") or "").strip():
            return False
        # 주제 일기 미션은 오늘의 주제로 쓴 일기여야 한다
        return "topic_id" not in m or submission.get("topic_id") == m["topic_id"]
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
