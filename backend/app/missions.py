"""오늘의 미션 고르기.

매일 바뀌는 3개 = 움직이기 1 + 집에서 할 일 1 + 이어지기 1 (QUEST_DESIGN ④ 단계 사다리)
- 움직이기·이어지기는 단계가 있다: 1 혼자 → 2 한 명 → 3 여럿 (4단계 지역은 뺌)
  지금 단계 미션을 3번 하면 다음 단계가 열리고, 내려가는 일은 없다.
- 어제 안 나갔으면 움직이기는 한 단계 낮은 미션을 준다 (부담 없이 다시 한 발).
- 처음 설문 답에 맞는 미션만 (예: 강아지가 있을 때만 "강아지 산책 5분 더").

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
from datetime import date as Date, timedelta
from pathlib import Path

from . import diary
from . import survey

import numpy as np

MISSIONS_PER_DAY = 3
STAY_HOME_STEPS = 1_000          # 이 걸음 미만이면 "안 나간 날"
STAY_HOME_RATIO = 0.5            # 또는 평소 걸음 중앙값의 50% 미만
LAST_WEEK_MIN_DAYS = 4            # '지난주보다' 미션은 지난 7일 중 기록이 4일 이상일 때만
DAILY_STEP_GOAL = 8_000          # 하루 걸음 목표 (권장 걸음). 홈 화면 걸음 바와 '오늘 걸음 채우기' 미션에 쓴다
STEP_INCREASE = 1_000            # '지난주보다 많이 걷기': 지난주 하루 평균 + 1,000보 (하루 1,000보 늘 때마다 우울 위험 9%↓, Bizzozero-Peroni 2024)

# 보상: (코인, 경험치). 코인은 상점에서 쓰면 줄고, 경험치는 계속 쌓여 레벨이 된다.
# 경제 밸런스 (10/16): 예전 값(밖 50·집 30·일기 40코인, 100 XP)이면 하루에 약 355코인·800 XP가 쌓여
# 상점 전체(약 14,000코인)를 6주면 다 사고 레벨도 설계(하루 400 XP)의 두 배로 올랐다.
# Habitica(오픈소스 습관 RPG)처럼 미션 하나의 보상은 작게, 상점 가격은 그대로 두고
# '사는 데 며칠 걸리나'로 맞춤: 다 하면 하루 약 145코인·400 XP → 소품 1일 · 옷 1~3일 · 친구 2~5일 · 전체 약 3달 (ECONOMY.md)
COINS_OUTDOOR, XP_OUTDOOR = 20, 50        # 밖에 나가야 하는 미션 — 집 미션보다 코인을 더 줘서 외출을 이끈다
COINS_HOME, XP_HOME = 12, 50              # 집에서 할 수 있는 미션
COINS_DIARY = 15                          # 일기 미션 (프론트 '오늘의 하루 기록하기')
COINS_DAILY, XP_DAILY = 0, 0              # 출석하기 미션 자체는 0 — 선물은 주간 출석표(app/attendance.py)에서 따로 준다 (10/15)
COINS_SELF, XP_SELF = 5, 25               # 스스로 체크 (윗몸일으키기 20회처럼 확인할 수 없는 것) — 누르기만 해도 쌓이지 않게 작게 (QUEST_DESIGN 4절)
REROLLS_PER_DAY = 3                       # 매일 바뀌는 미션 새로고침: 하루 3번까지 (무료)
# 매일 고정 미션: 출석하기 + 걸음 8,000보 + 지난주보다 많이 걷기(기록이 있을 때) + 오늘의 일기 쓰기 + 친구 방 놀러 가기 + 방명록 남기기. 나머지 3개는 매일 바뀐다.
# 하루 3개를 모두 끝내면 코인 대신 특별 캐릭터(프론트 '하루 친구 모찌')를 준다 → 상점 기능에서 지급

# 레벨: 처음엔 빨리, 갈수록 천천히 오른다.
# LV.n → n+1 에 필요한 경험치 = LEVEL_BASE_XP + LEVEL_STEP_XP × (n − 1)  → 100, 250, 400, 550, …
# 누적: LV.3 350 · LV.5 1,300 · LV.8 3,850 · LV.12 9,350 (하루 400 XP면 LV.12까지 약 24일)
STAGE_BONUS_COINS = 5                     # 단계가 하나 오를 때마다 코인 +5 (어려운 단계에 도전할 동기)

# 단계 사다리 (QUEST_DESIGN ④). 4단계(지역)는 뺌
LADDER = {"move": "outdoor", "connect": "connect"}   # 갈래 → 미션 분류
LADDER_STAGES = 3
STAGE_UP_COUNT = 3                        # 지금 단계 미션을 이만큼 하면 다음 단계
STAGE_NAMES = {1: "혼자", 2: "한 명", 3: "여럿"}

LEVEL_BASE_XP = 100
LEVEL_STEP_XP = 150


CATALOG_PATH = Path(__file__).resolve().parent / "data" / "missions.json"

# 분류 (missions.json의 category)
#   outdoor : 밖으로 한 발 (걸음·밖에서 사진) — 단계 사다리 '움직이기' (stage 0은 사다리에 안 나옴)
#   connect : 사람과 이어지기 — 단계 사다리 '이어지기', 미션마다 "이렇게 해 보세요" 팁(tip)
#   home    : 집에서 할 수 있는 작은 행동
#   explore : 직접 찾아보고 적기 (맛집·영화·음악…) — 10/14부터 매일 미션에 안 나옴 (새 활동보다 하던 것 늘리기)
#   record  : 하루 기록
#   daily   : 매일 고정으로 나오는 미션 (출석하기, 걸음 8,000보, 지난주보다 많이 걷기, 오늘의 일기 쓰기, 친구 방 놀러 가기, 방명록 남기기). 하루 3개와 별도
CATEGORIES = ("daily", "outdoor", "home", "explore", "record", "connect")
KINDS = ("steps", "text", "photo", "list", "diary", "checkin", "guestbook", "visit", "self")
DAILY_PLAN = ("move", "home", "connect")          # 매일 바뀌는 3칸: 움직이기 · 집에서 할 일 · 이어지기


@dataclass(frozen=True)
class Mission:
    id: str
    category: str      # outdoor | home | explore | record | connect
    title: str
    desc: str
    kind: str          # steps | text | photo | list | diary(기록 탭 일기로 완료) | guestbook(다른 사람 방에 방명록) | visit(다른 사람 방 방문) | checkin(출석) | self(스스로 체크)
    outdoor: bool      # 밖에 나가야 할 수 있는 미션인지
    min_count: int = 1 # list: 입력 개수, photo: 사진 장수, steps: 목표 걸음
    prompt: str = ""   # 입력 전에 먼저 묻는 것 (예: 사는 동네)
    goal_rule: str = "fixed"  # 걸음 목표: fixed(min_count 그대로) | yesterday(어제보다) | last_week(지난 7일 평균보다)
    stage: int = 0     # 단계 사다리 1~3 (0 = 사다리에 안 나옴)
    tip: str = ""      # "이렇게 해 보세요" (사회 기술 팁)
    requires: str = "" # 처음 설문 답이 이럴 때만 나옴. "질문:답" (예: pets:dog)

    @property
    def coins(self) -> int:
        if self.kind == "checkin":
            return COINS_DAILY
        if self.kind == "diary":
            return COINS_DIARY
        if self.kind == "self":
            return COINS_SELF
        base = COINS_OUTDOOR if self.outdoor else COINS_HOME
        return base + STAGE_BONUS_COINS * max(self.stage - 1, 0)

    @property
    def xp(self) -> int:
        if self.kind == "checkin":
            return XP_DAILY
        if self.kind == "self":
            return XP_SELF
        return XP_OUTDOOR if self.outdoor else XP_HOME

    def to_dict(self) -> dict:
        return {**asdict(self), "coins": self.coins, "xp": self.xp}


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
        if not 0 <= m.stage <= LADDER_STAGES or (m.category == "connect" and m.stage == 0):
            raise ValueError(f"단계가 틀렸습니다: {m.id} → {m.stage}")
        if m.requires:
            q, _, a = m.requires.partition(":")
            if q not in survey.BY_ID or a not in {o["id"] for o in survey.BY_ID[q]["options"]}:
                raise ValueError(f"설문에 없는 조건입니다: {m.id} → {m.requires}")
        catalog[m.id] = m
    return catalog


CATALOG: dict[str, Mission] = load_catalog()
BY_CATEGORY: dict[str, list[str]] = {c: [m.id for m in CATALOG.values() if m.category == c] for c in CATEGORIES}
BY_STAGE: dict[str, dict[int, list[str]]] = {
    track: {s: [m for m in BY_CATEGORY[cat] if CATALOG[m].stage == s] for s in range(1, LADDER_STAGES + 1)}
    for track, cat in LADDER.items()
}


def fits(mission: Mission, answers: dict | None) -> bool:
    """처음 설문 답에 맞는 미션인지. 조건이 있는데 답이 없으면 안 맞는 것으로 본다."""
    if not mission.requires:
        return True
    q, _, a = mission.requires.partition(":")
    got = (answers or {}).get(q)
    return a in got if isinstance(got, list) else got == a


def ladder_progress(completed: list[str]) -> dict:
    """지금까지 완료한 미션 id(날마다, 중복 가능) → 갈래별 지금 단계와 다음 단계까지.

    지금 단계 미션을 STAGE_UP_COUNT번 하면 다음 단계. 마지막 단계(3)에서 멈춤. 내려가지 않음.
    """
    out = {}
    for track in LADDER:
        stage = 1
        while True:
            done = sum(1 for m in completed if m in BY_STAGE[track][stage])
            if stage == LADDER_STAGES or done < STAGE_UP_COUNT:
                break
            stage += 1
        top = stage == LADDER_STAGES
        out[track] = {"stage": stage, "name": STAGE_NAMES[stage], "done": min(done, STAGE_UP_COUNT),
                      "need": STAGE_UP_COUNT, "top": top}
    return out


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


# --- 주간 미션 ---------------------------------------------------------------------
# 매일 미션과 따로, 월요일~일요일 한 주 동안 채우는 미션.
# 자연 속 산책: 자연에서 주 120분 이상 보내면 건강·행복감이 좋음, 짧게 여러 번이어도 됨 (White 2019)
WEEKLY_QUESTS = {
    "nature_walk": {
        "id": "nature_walk",
        "title": "이번 주 자연 속 산책 2번",
        "desc": "공원·산책로·하천·숲처럼 자연이 있는 곳을 걷고 사진을 남겨요. 서로 다른 날 2번이면 완료!",
        "kind": "photo",
        "outdoor": True,
        "goal_days": 2,
        "coins": 50,
        "xp": 100,
    },
}


def week_start(d: Date) -> Date:
    """그 주 월요일."""
    return d - timedelta(days=d.weekday())


def plus_goal(prev: float, plus: int = STEP_INCREASE) -> int:
    """기준 + plus보 이상: 100보 단위로 올림. 예: 2,500 → 3,500, 2,643 → 3,700"""
    return int(math.ceil((prev + plus) / 100) * 100)


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
    goal = plus_goal(prev) if rule == "last_week" else beat_goal(prev)
    return {**mission, "min_count": goal, "desc": mission["desc"].format(prev=f"{round(prev):,}", goal=f"{goal:,}")}


def with_topic(mission: dict, topic: dict) -> dict:
    """일기 미션 설명에 오늘의 추천 주제를 넣는다. 주제는 추천일 뿐, 다른 이야기를 써도 완료된다."""
    if "{topic}" not in mission["desc"]:
        return mission
    return {**mission, "desc": mission["desc"].format(topic=topic["text"]), "suggested_topic_id": topic["id"]}


def usable(mid: str, baselines: dict[str, float], answers: dict | None) -> bool:
    m = CATALOG[mid]
    # 기준 기록이 없는 걸음 미션(어제보다·지난주보다)은 후보에서 뺀다
    return (m.goal_rule == "fixed" or m.goal_rule in baselines) and fits(m, answers)


def slot_options(slot: str, stage: int, baselines: dict[str, float], answers: dict | None) -> list[str]:
    """한 칸(움직이기·집·이어지기)에 넣을 수 있는 미션. 사다리 칸은 그 단계, 맞는 게 없으면 아래 단계에서."""
    if slot not in LADDER:
        return [m for m in BY_CATEGORY[slot] if usable(m, baselines, answers)]
    for s in range(stage, 0, -1):
        options = [m for m in BY_STAGE[slot][s] if usable(m, baselines, answers)]
        if options:
            return options
    return []


def slot_of(mission: dict) -> tuple[str, int] | None:
    """매일 바뀌는 미션이 어느 칸·단계인지. 매일 고정 미션이면 None."""
    for slot, cat in LADDER.items():
        if mission["category"] == cat:
            return slot, mission.get("stage") or 1
    if mission["category"] in DAILY_PLAN:
        return mission["category"], 0
    return None


def reroll(
    user_id: str,
    date: str,
    missions: list[dict],
    mission_id: str,
    attempt: int,
    steps: float | None = None,
    last_week_steps: list[float] | None = None,
    answers: dict | None = None,
    recent: list[str] | None = None,
) -> dict | None:
    """마음에 안 드는 미션을 같은 칸·같은 단계의 다른 미션으로 바꾼다. 바꿀 게 없으면 None.

    attempt: 오늘 몇 번째 새로고침인지 (같은 날 같은 순서면 같은 결과)
    """
    current = next(m for m in missions if m["id"] == mission_id)
    slot, stage = slot_of(current)
    baselines = step_baselines(steps, last_week_steps)
    today_ids = {m["id"] for m in missions}
    options = [m for m in slot_options(slot, stage, baselines, answers) if m not in today_ids]
    if not options:
        return None
    fresh = [m for m in options if m not in set(recent or [])]
    choice = random.Random(f"{user_id}:{date}:reroll{attempt}").choice(fresh or options)
    return with_topic(personalize(CATALOG[choice].to_dict(), baselines), diary.topic_for(user_id, date))


def pick_missions(
    user_id: str,
    date: str,
    steps: float | None,
    usual_steps: float | None = None,
    recent: list[str] | None = None,
    last_week_steps: list[float] | None = None,
    goes_out_often: bool | None = None,
    stages: dict[str, int] | None = None,
    answers: dict | None = None,
) -> dict:
    """오늘의 미션 3개를 고른다.

    steps: 판단에 쓸 걸음 수 (보통 어제 걸음 — 오늘은 아직 안 끝났으므로)
    usual_steps: 평소 걸음 중앙값 (있으면 "평소의 절반 미만"도 안 나간 날로 봄)
    recent: 최근에 줬던 미션 id. 가능하면 겹치지 않게 고른다.
    last_week_steps: 지난 7일 걸음 (있으면 "지난주보다 많이 걷기" 미션이 나올 수 있음)
    goes_out_often: 처음 설문의 외출 빈도로 본 '자주 나가는 사람'인지. 걸음 기록이 없는 날에만 쓴다
    stages: 갈래별 지금 단계 {"move": 2, "connect": 1} (없으면 1단계)
    answers: 처음 설문 답 (조건 있는 미션 고르기)
    """
    baselines = step_baselines(steps, last_week_steps)
    home = stayed_home(steps, usual_steps)
    # 걸음 기록이 없으면(처음 며칠) 설문 답으로: 자주 나간다고 했으면 나간 날로 본다
    went_out = home is False or (home is None and goes_out_often is True)
    stages = {t: (stages or {}).get(t, 1) for t in LADDER}
    if not went_out:
        stages["move"] = max(stages["move"] - 1, 1)     # 안 나간 날은 한 단계 낮게
    rng = random.Random(f"{user_id}:{date}")
    recent = set(recent or [])

    picked: list[str] = []
    for slot in DAILY_PLAN:
        options = slot_options(slot, stages.get(slot, 1), baselines, answers)
        fresh = [m for m in options if m not in recent and m not in picked]
        choices = fresh or [m for m in options if m not in picked]
        picked.append(rng.choice(choices))

    topic = diary.topic_for(user_id, date)
    missions = [with_topic(personalize(CATALOG[m].to_dict(), baselines), topic) for m in picked[:MISSIONS_PER_DAY]]
    # 매일 고정 미션(출석·걸음·지난주보다·일기·방문·방명록)을 맨 앞에. 기준 기록이 없는 걸음 미션은 빠진다.
    # 어제 권장 걸음(8,000보)을 채웠으면 '지난주보다 많이 걷기'는 주지 않는다 (이미 충분히 걷는 사람에게 목표를 더 올리지 않게)
    walked_enough = _valid(steps) and steps >= DAILY_STEP_GOAL
    daily = [
        m for m in BY_CATEGORY["daily"]
        if (CATALOG[m].goal_rule == "fixed" or CATALOG[m].goal_rule in baselines)
        and not (CATALOG[m].goal_rule == "last_week" and walked_enough)
    ]
    missions = [with_topic(personalize(CATALOG[m].to_dict(), baselines), topic) for m in daily] + missions

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
    if kind in ("checkin", "self"):
        return True
    if kind == "guestbook":
        # 서버가 확인한 값: 그날 다른 사람 방에 방명록을 남겼는지
        return bool(submission.get("written"))
    if kind == "visit":
        # 서버가 확인한 값: 그날 다른 사람 방을 방문했는지
        return bool(submission.get("visited"))
    if kind in ("text", "diary"):
        return bool(str(submission.get("text") or "").strip())
    if kind == "photo":
        return len(submission.get("photos") or []) >= need
    if kind == "list":
        items = [str(i).strip() for i in submission.get("items") or []]
        return len({i for i in items if i}) >= need
    raise ValueError(f"알 수 없는 미션 종류: {kind}")


def settle_coins(missions: list[dict], completed_ids: set[str] | list[str], already_paid: set[str] | list[str] = ()) -> dict:
    """오늘 받을 코인과 경험치를 계산한다.

    missions: pick_missions()가 준 오늘의 미션 (출석하기 포함)
    completed_ids: 완료 판정을 통과한 미션 id
    already_paid: 이미 보상을 준 미션 id. 같은 보상을 두 번 주지 않기 위해 쓴다.

    all_done: 매일 고정 미션(출석·걸음·일기·방문·방명록)을 뺀, 매일 바뀌는 미션 3개를 모두 끝냈는지. 이때 주는 특별 캐릭터는 상점 기능에서 지급한다.
    돌려주는 값: {"items": [{"id", "coins", "xp"}...], "total": 코인 합, "xp": 경험치 합, "all_done": 3개 다 했는지}
    """
    today = {m["id"]: m for m in missions}
    done = set(completed_ids) & set(today)
    paid = set(already_paid)

    items = [{"id": mid, "coins": today[mid]["coins"], "xp": today[mid]["xp"]}
             for mid in today if mid in done and mid not in paid]
    main = {mid for mid, m in today.items() if m.get("category") != "daily"}
    all_done = len(main) > 0 and main <= done
    return {
        "items": items,
        "total": sum(i["coins"] for i in items),
        "xp": sum(i["xp"] for i in items),
        "all_done": all_done,
    }


def xp_for_next(level: int) -> int:
    """LV.level → level+1 에 필요한 경험치."""
    return LEVEL_BASE_XP + LEVEL_STEP_XP * (level - 1)


def xp_to_reach(level: int) -> int:
    """LV.level 에 도달하는 데 필요한 누적 경험치. 예: LV.2 100, LV.3 350, LV.12 9,350"""
    return sum(xp_for_next(n) for n in range(1, level))


def level_from_xp(total_xp: int) -> dict:
    """누적 경험치 → 레벨. 예: 0 → LV.1, 100 → LV.2, 350 → LV.3, 9,350 → LV.12"""
    xp = max(0, int(total_xp))
    level, left = 1, xp
    while left >= xp_for_next(level):
        left -= xp_for_next(level)
        level += 1
    need = xp_for_next(level)
    return {"level": level, "xp": xp, "xp_in_level": left, "xp_to_next": need - left, "xp_for_level": need}
