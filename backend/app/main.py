"""FastAPI 서버.

실행: cd backend && uvicorn app.main:app --reload
문서: http://localhost:8000/docs

날짜를 받는 API는 모두 `date` 쿼리(YYYY-MM-DD)를 받는다. 없으면 오늘.
발표 데모에서 날짜를 넘기며 보여줄 때 이 값을 바꾸면 된다.
"""

from __future__ import annotations

import os
import statistics
import uuid
from contextlib import asynccontextmanager
from datetime import date as Date, datetime, timedelta, timezone

from pathlib import Path

from fastapi import Depends, FastAPI, File, Header, HTTPException, Query, Request, UploadFile
from fastapi.responses import FileResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from . import crisis
from . import db
from . import diary as dy
from . import missions as ms
from . import photo_meta
from . import shop

USUAL_STEPS_DAYS = 28   # 평소 걸음 = 최근 28일 걸음 중앙값

# 사진 업로드
MAX_PHOTO_BYTES = 10 * 1024 * 1024
# 사진 미션은 오늘 찍은 사진만 인정한다 (촬영 일시가 있을 때).
# 촬영 일시가 없는 사진(스크린샷·메신저 사진 등)은 일단 인정한다 → 막으려면 False로.
ALLOW_PHOTO_WITHOUT_TAKEN_AT = True
PHOTO_TYPES = {"image/jpeg": ".jpg", "image/png": ".png", "image/webp": ".webp", "image/heic": ".heic", "image/heif": ".heif"}


def upload_dir() -> Path:
    d = Path(os.environ.get("CAPSTONE_UPLOADS") or Path(__file__).resolve().parent.parent / "uploads")
    d.mkdir(parents=True, exist_ok=True)
    return d


@asynccontextmanager
async def lifespan(app: FastAPI):
    app.state.conn = db.connect()
    yield
    app.state.conn.close()


app = FastAPI(title="Capstone API", version="0.1.0", lifespan=lifespan)
app.add_middleware(
    CORSMiddleware,
    allow_origins=os.environ.get("CORS_ORIGINS", "http://localhost:5173").split(","),
    allow_methods=["*"],
    allow_headers=["*"],
)


def get_conn(request: Request):
    return request.app.state.conn


KST = timezone(timedelta(hours=9))   # 한국은 서머타임이 없어 +9 고정. 프론트도 서울 자정에 하루가 바뀜


def seoul_today() -> Date:
    """서버가 어느 나라에 있든 '오늘'은 서울 날짜로 본다."""
    return datetime.now(KST).date()


def day(value: str | None) -> Date:
    if value is None:
        return seoul_today()
    try:
        return Date.fromisoformat(value)
    except ValueError:
        raise HTTPException(422, f"date 형식은 YYYY-MM-DD 입니다: {value}")


DateQuery = Query(None, description="기준 날짜 YYYY-MM-DD. 없으면 서울 기준 오늘 (데모에서 날짜 넘길 때 사용)")


# --- 스키마 -----------------------------------------------------------------------

class StepsIn(BaseModel):
    date: str = Field(..., examples=["2026-10-01"])
    steps: int = Field(..., ge=0)


class CompleteIn(BaseModel):
    """미션 종류별로 필요한 값만 채운다."""
    text: str | None = None
    photos: list[str] | None = Field(None, description="POST /users/{id}/photos 로 올린 사진의 photo_id")
    items: list[str] | None = None
    answer: str | None = Field(None, description="먼저 묻는 질문의 답 (사는 동네, 좋아하는 장르 등)")


class DiaryIn(BaseModel):
    text: str = Field(..., min_length=1, max_length=2000)
    use_topic: bool = Field(False, description="오늘의 주제로 썼으면 true")
    mood: str | None = Field(None, max_length=20, description="기분 (예: 좋음, 보통, 피곤)")
    photos: list[str] = Field(default_factory=list, description="POST /users/{id}/photos 로 올린 사진의 photo_id")


class VisitIn(BaseModel):
    visitor_id: str = Field(..., min_length=1, description="놀러 가는 사람 user id")


NICKNAME_MIN, NICKNAME_MAX = 2, 12


class UserIn(BaseModel):
    nickname: str = Field(..., description=f"닉네임 {NICKNAME_MIN}~{NICKNAME_MAX}자")


class BuyIn(BaseModel):
    type: str = Field(..., description="character | outfit | decor")
    item_id: str


class EquipIn(BaseModel):
    """보낸 칸만 바꾼다. character_id=null → 기본 캐릭터, outfit_id=null → 옷 벗기."""
    character_id: str | None = None
    outfit_id: str | None = None


class DecorIn(BaseModel):
    slot: str = Field(..., description="lamp | carpet | frame | doll | scenery")
    item_id: str | None = Field(..., description="놓을 소품 id. null이면 그 자리 비우기")


class GuestbookIn(BaseModel):
    author: str | None = Field(None, max_length=20, description="보이는 이름. 비우면 author_id 사용자의 닉네임")
    text: str = Field(..., min_length=1, max_length=60)
    author_id: str | None = Field(None, description="쓴 사람 user id. 넣으면 그 사람의 방명록 미션이 자동 완료")


# --- 공통 계산 ---------------------------------------------------------------------

def usual_steps(conn, user_id: str, today: Date) -> float | None:
    start = (today - timedelta(days=USUAL_STEPS_DAYS)).isoformat()
    end = (today - timedelta(days=1)).isoformat()
    values = db.steps_between(conn, user_id, start, end)
    return float(statistics.median(values)) if values else None


def todays_missions(conn, user_id: str, today: Date) -> dict:
    """오늘의 미션. 처음 부르면 어제 걸음으로 골라 저장하고, 이후엔 저장된 걸 돌려준다."""
    saved = db.get_mission_day(conn, user_id, today.isoformat())
    if saved:
        return saved
    yesterday = (today - timedelta(days=1)).isoformat()
    picked = ms.pick_missions(
        user_id,
        today.isoformat(),
        steps=db.get_steps(conn, user_id, yesterday),
        usual_steps=usual_steps(conn, user_id, today),
        recent=db.recent_mission_ids(conn, user_id, today.isoformat()),
        last_week_steps=db.steps_between(conn, user_id, (today - timedelta(days=7)).isoformat(), yesterday),
    )
    db.save_mission_day(conn, user_id, picked)
    return picked


def check_photos(conn, user_id: str, photo_ids: list[str]) -> list[str]:
    """이 사용자가 실제로 올린 사진만 인정한다."""
    photos = list(dict.fromkeys(photo_ids or []))
    unknown = set(photos) - db.owned_photo_ids(conn, user_id, photos)
    if unknown:
        raise HTTPException(422, f"올라오지 않은 사진입니다: {sorted(unknown)}")
    return photos


def grant_free_items(conn, user_id: str, all_done: bool = False) -> list[dict]:
    """조건을 채운 무료 상품(기본 캐릭터, LV.3 캐릭터, 하루 미션 완료 캐릭터)을 지급한다. 새로 받은 것만 돌려준다."""
    level = ms.level_from_xp(db.xp_total(conn, user_id))["level"]
    grants = shop.free_grants(level, all_done)
    how = {(k, i): shop.CATALOG[k][i]["method"] for k, i in grants}
    added = db.add_items(conn, user_id, grants, how)
    # 기본 캐릭터(starter)는 원래 가진 것이라 "새로 받았어요" 알림에서 뺀다
    return [{"type": k, "id": i, "name": shop.CATALOG[k][i]["name"]} for k, i in added if how[(k, i)] != "starter"]


def check_taken_today(conn, photo_ids: list[str], today: Date) -> None:
    """사진 미션: 촬영 일시가 있으면 오늘 찍은 사진이어야 한다.

    검증은 서버 안에서만 한다. 사용자에게는 촬영 일시나 확인 방법을 알리지 않고 짧은 안내만 준다.
    """
    for taken in db.photo_taken_at(conn, photo_ids).values():
        if taken is None:
            if not ALLOW_PHOTO_WITHOUT_TAKEN_AT:
                raise HTTPException(422, "오늘 찍은 사진으로 다시 올려 주세요.")
            continue
        if Date.fromisoformat(taken[:10]) != today:
            raise HTTPException(422, "오늘 찍은 사진으로 다시 올려 주세요.")


def screen_text(conn, user_id: str, today: Date, source: str, text: str) -> dict | None:
    """사용자가 쓴 글에서 위기 신호를 찾아 기록하고, 사용자에게 보낼 반응(care)을 돌려준다.

    high → 상담 안내, medium → 캐릭터 안부, low·없음 → None (사용자에게는 아무것도 안 보임).
    글 내용과 걸린 단어는 저장·응답하지 않는다.
    """
    result = crisis.assess(text)
    if result.level is None:
        return None
    db.add_signal(conn, user_id, today.isoformat(), source, result.level, result.categories)
    return result.care()


def finish_and_pay(conn, user_id: str, today: Date, day_: dict, mission_id: str, submission: dict) -> dict:
    """완료를 저장하고 코인·경험치를 지급한다. 레벨이 올랐는지도 돌려준다."""
    before = ms.level_from_xp(db.xp_total(conn, user_id))["level"]
    db.save_completion(conn, user_id, today.isoformat(), mission_id, submission)
    settle = ms.settle_coins(
        day_["missions"],
        db.completed_ids(conn, user_id, today.isoformat()),
        already_paid=db.paid_ids(conn, user_id, today.isoformat()),
    )
    db.add_coins(conn, user_id, today.isoformat(), settle["items"])
    level = ms.level_from_xp(db.xp_total(conn, user_id))
    new_items = grant_free_items(conn, user_id, all_done=settle["all_done"])
    return {**settle, "level": level, "leveled_up": level["level"] > before, "new_items": new_items}


def rewards(conn, user_id: str, settle: dict) -> dict:
    """완료 응답에 공통으로 넣는 보상 정보."""
    return {
        "earned": settle["items"],
        "earned_total": settle["total"],
        "earned_xp": settle["xp"],
        "all_done": settle["all_done"],
        "coins": db.coin_balance(conn, user_id),
        "level": settle["level"],
        "leveled_up": settle["leveled_up"],
        "new_items": settle["new_items"],
    }


def auto_complete(conn, user_id: str, today: Date, kind: str, submission: dict) -> dict:
    """오늘의 미션 중 kind가 같은 미션을 조건이 맞으면 완료·지급한다 (일기·방명록처럼 다른 화면에서 한 행동)."""
    completed, earned, new_items = [], [], []
    level, leveled_up = ms.level_from_xp(db.xp_total(conn, user_id)), False
    day_ = db.get_mission_day(conn, user_id, today.isoformat())
    for m in (day_ or {}).get("missions", []):
        if m["kind"] == kind and ms.is_complete(m, submission):
            settle = finish_and_pay(conn, user_id, today, day_, m["id"], submission)
            completed.append(m["id"])
            earned += settle["items"]
            level, leveled_up = settle["level"], leveled_up or settle["leveled_up"]
            new_items += settle["new_items"]
    return {
        "completed_missions": completed,
        "earned": earned,
        "new_items": new_items,
        "coins": db.coin_balance(conn, user_id),
        "level": level,
        "leveled_up": leveled_up,
    }


def clean_nickname(conn, nickname: str, except_id: str | None = None) -> str:
    """닉네임 확인: 앞뒤 공백 제거, 글자 수, 중복(대소문자·띄어쓰기 무시)."""
    name = " ".join(nickname.split())
    if not NICKNAME_MIN <= len(name) <= NICKNAME_MAX:
        raise HTTPException(422, f"닉네임은 {NICKNAME_MIN}~{NICKNAME_MAX}자로 지어 주세요.")
    if db.nickname_taken(conn, name, except_id):
        raise HTTPException(409, "이미 쓰고 있는 닉네임이에요.")
    return name


def with_names(conn, user_ids: list[str]) -> list[dict]:
    """user id 목록에 닉네임을 붙인다. 등록하지 않은 id면 nickname은 None."""
    names = db.nicknames(conn, user_ids)
    return [{"id": u, "nickname": names.get(u)} for u in user_ids]


def with_status(conn, user_id: str, day_: dict) -> dict:
    done = db.completed_ids(conn, user_id, day_["date"])
    missions = [{**m, "done": m["id"] in done} for m in day_["missions"]]
    return {**day_, "missions": missions, "done_count": sum(m["done"] for m in missions)}


# --- 라우트 ------------------------------------------------------------------------

@app.get("/health")
def health():
    return {"ok": True}


@app.post("/users", summary="가입: 닉네임으로 사용자 만들기 → id (앱이 저장해 두고 모든 API에 사용)", status_code=201)
def create_user(body: UserIn, conn=Depends(get_conn)):
    nickname = clean_nickname(conn, body.nickname)
    return db.create_user(conn, uuid.uuid4().hex, nickname)


@app.get("/nicknames/check", summary="닉네임 쓸 수 있는지 확인")
def check_nickname(nickname: str, conn=Depends(get_conn)):
    try:
        name = clean_nickname(conn, nickname)
    except HTTPException as e:
        return {"nickname": nickname, "available": False, "reason": e.detail}
    return {"nickname": name, "available": True, "reason": None}


@app.get("/users/{user_id}", summary="사용자 정보 (닉네임·레벨)")
def get_user(user_id: str, conn=Depends(get_conn)):
    user = db.get_user(conn, user_id)
    if user is None:
        raise HTTPException(404, "없는 사용자입니다.")
    return {**user, "level": ms.level_from_xp(db.xp_total(conn, user_id))}


@app.patch("/users/{user_id}", summary="닉네임 바꾸기")
def rename_user(user_id: str, body: UserIn, conn=Depends(get_conn)):
    if db.get_user(conn, user_id) is None:
        raise HTTPException(404, "없는 사용자입니다.")
    return db.rename_user(conn, user_id, clean_nickname(conn, body.nickname, except_id=user_id))


@app.delete("/users/{user_id}", summary="계정 삭제 — 걸음·미션·코인·사진·일기·방문·방명록까지 모두 삭제")
def delete_user(user_id: str, conn=Depends(get_conn)):
    if db.get_user(conn, user_id) is None:
        raise HTTPException(404, "없는 사용자입니다.")
    for filename in db.delete_user(conn, user_id):
        (upload_dir() / filename).unlink(missing_ok=True)
    return {"deleted": user_id}


@app.post("/users/{user_id}/steps", summary="하루 걸음 수 올리기 (앱 만보기 → 서버)")
def post_steps(user_id: str, body: StepsIn, conn=Depends(get_conn)):
    day(body.date)
    db.upsert_steps(conn, user_id, body.date, body.steps)
    return {"user_id": user_id, "date": body.date, "steps": body.steps}


@app.get("/users/{user_id}/home", summary="홈 화면: 걸음·코인·오늘 미션 진행·말풍선")
def get_home(user_id: str, date: str | None = DateQuery, conn=Depends(get_conn)):
    today = day(date)
    missions = with_status(conn, user_id, todays_missions(conn, user_id, today))
    steps = db.get_steps(conn, user_id, today.isoformat()) or 0
    if db.worst_signal(conn, user_id, today.isoformat()) in ("high", "medium"):
        bubble = crisis.CHECK_IN_MESSAGE                     # 오늘 힘든 글을 썼으면 미션 독려 대신 안부
    elif missions["done_count"] == len(missions["missions"]):
        bubble = "오늘 미션 다 했다! 최고야!"
    elif missions["stayed_home"]:
        bubble = "오늘은 잠깐 같이 나가볼까?"
    else:
        bubble = "오늘 하루도 같이 해보자!"
    return {
        "user_id": user_id,
        "date": today.isoformat(),
        "steps": steps,
        "step_goal": ms.DAILY_STEP_GOAL,
        "coins": db.coin_balance(conn, user_id),
        "level": ms.level_from_xp(db.xp_total(conn, user_id)),
        "equipped": {"character": (db.get_equipped(conn, user_id)["character_id"] or shop.DEFAULT_CHARACTER),
                     "outfit": db.get_equipped(conn, user_id)["outfit_id"]},
        "room": room_view(conn, user_id),
        "checked_in": any(m["id"] == "attendance" and m["done"] for m in missions["missions"]),
        "missions_done": missions["done_count"],
        "missions_total": len(missions["missions"]),
        "bubble": bubble,
    }


@app.get("/users/{user_id}/missions/today", summary="오늘의 미션: 매일 고정(출석·걸음·지난주보다·일기·방문·방명록) + 매일 바뀌는 3개")
def get_missions_today(user_id: str, date: str | None = DateQuery, conn=Depends(get_conn)):
    return with_status(conn, user_id, todays_missions(conn, user_id, day(date)))


@app.post("/users/{user_id}/missions/{mission_id}/complete", summary="미션 완료 제출 → 판정 → 코인 지급")
def complete_mission(user_id: str, mission_id: str, body: CompleteIn, date: str | None = DateQuery, conn=Depends(get_conn)):
    today = day(date)
    day_ = todays_missions(conn, user_id, today)
    mission = next((m for m in day_["missions"] if m["id"] == mission_id), None)
    if mission is None:
        raise HTTPException(404, f"오늘의 미션이 아닙니다: {mission_id}")

    submission = body.model_dump(exclude_none=True)
    if mission["kind"] == "steps":
        # 걸음 미션은 사용자가 입력하지 않고 서버에 올라온 걸음으로 판정한다.
        submission = {"steps": db.get_steps(conn, user_id, today.isoformat()) or 0}
    if mission["kind"] == "photo":
        submission["photos"] = check_photos(conn, user_id, submission.get("photos"))
        check_taken_today(conn, submission["photos"], today)
    if mission["kind"] == "visit":
        # 방문 미션은 사용자가 입력하지 않고 서버 기록으로 확인한다.
        submission = {"visited": db.visited_someone(conn, user_id, today.isoformat())}
        if not submission["visited"]:
            raise HTTPException(422, "아직 다른 친구 방에 놀러 가지 않았어요.")
    if mission["kind"] == "guestbook":
        # 방명록 미션은 사용자가 입력하지 않고 서버 기록으로 확인한다.
        submission = {"written": db.wrote_guestbook(conn, user_id, today.isoformat())}
        if not submission["written"]:
            raise HTTPException(422, "아직 다른 친구 방에 방명록을 남기지 않았어요.")
    if mission["kind"] == "diary":
        # 일기 미션은 기록 탭 일기로 저장한다. 미션 화면에서 썼으면 오늘의 추천 주제로 쓴 것으로 본다.
        submission["topic_id"] = mission.get("suggested_topic_id")
    if mission.get("prompt") and not body.answer:
        raise HTTPException(422, f"먼저 답해 주세요: {mission['prompt']}")
    if not ms.is_complete(mission, submission):
        raise HTTPException(422, "아직 완료 조건을 채우지 못했어요.")

    care = None
    if mission["kind"] in ("text", "diary", "list"):
        written = submission.get("text") or " ".join(submission.get("items") or [])
        care = screen_text(conn, user_id, today, "diary" if mission["kind"] == "diary" else f"mission:{mission_id}", written)
    if mission["kind"] == "diary":
        db.save_diary(conn, user_id, today.isoformat(), submission["text"].strip(), submission["topic_id"], None, [])
    if mission["kind"] == "photo":
        db.tag_photos(conn, user_id, submission["photos"], mission_id, today.isoformat())   # 사진첩에 미션 이름으로
    settle = finish_and_pay(conn, user_id, today, day_, mission_id, submission)
    return {"mission_id": mission_id, **rewards(conn, user_id, settle), "care": care}


# --- 주간 미션 ---------------------------------------------------------------------

def weekly_status(conn, user_id: str, today: Date, quest: dict) -> dict:
    start = ms.week_start(today)
    days = db.weekly_days(conn, user_id, start.isoformat(), quest["id"])
    return {
        **quest,
        "done_days": days,
        "progress": min(len(days), quest["goal_days"]),
        "completed": len(days) >= quest["goal_days"],
        "done_today": today.isoformat() in days,
    }


@app.get("/users/{user_id}/weekly", summary="이번 주 주간 미션 (월~일)")
def get_weekly(user_id: str, date: str | None = DateQuery, conn=Depends(get_conn)):
    today = day(date)
    start = ms.week_start(today)
    return {
        "week_start": start.isoformat(),
        "week_end": (start + timedelta(days=6)).isoformat(),
        "quests": [weekly_status(conn, user_id, today, q) for q in ms.WEEKLY_QUESTS.values()],
    }


@app.post("/users/{user_id}/weekly/{quest_id}/complete",
          summary="주간 미션 하루 채우기 (사진). 서로 다른 날 목표 횟수를 채우면 보상")
def complete_weekly(user_id: str, quest_id: str, body: CompleteIn, date: str | None = DateQuery, conn=Depends(get_conn)):
    today = day(date)
    quest = ms.WEEKLY_QUESTS.get(quest_id)
    if quest is None:
        raise HTTPException(404, f"주간 미션이 아닙니다: {quest_id}")
    start = ms.week_start(today).isoformat()
    if today.isoformat() in db.weekly_days(conn, user_id, start, quest_id):
        raise HTTPException(409, "오늘은 이미 채웠어요. 다른 날 한 번 더 해 봐요.")

    photos = check_photos(conn, user_id, body.photos)
    if not photos:
        raise HTTPException(422, "사진을 한 장 이상 올려 주세요.")
    check_taken_today(conn, photos, today)
    db.save_weekly(conn, user_id, start, quest_id, today.isoformat(), {"photos": photos})
    db.tag_photos(conn, user_id, photos, f"weekly:{quest_id}", today.isoformat())   # 사진첩에 주간 미션 이름으로

    before = ms.level_from_xp(db.xp_total(conn, user_id))["level"]
    status = weekly_status(conn, user_id, today, quest)
    earned = []
    item_id = f"weekly:{quest_id}"
    if status["completed"] and item_id not in db.paid_ids(conn, user_id, start):
        # 주간 보상은 그 주 월요일 날짜로 한 번만 기록한다
        earned = [{"id": item_id, "coins": quest["coins"], "xp": quest["xp"]}]
        db.add_coins(conn, user_id, start, earned)
    level = ms.level_from_xp(db.xp_total(conn, user_id))
    return {
        "quest": status,
        "earned": earned,
        "earned_total": sum(e["coins"] for e in earned),
        "earned_xp": sum(e["xp"] for e in earned),
        "coins": db.coin_balance(conn, user_id),
        "level": level,
        "leveled_up": level["level"] > before,
        "new_items": grant_free_items(conn, user_id),
    }


@app.post("/users/{user_id}/attendance", summary="출석하기 (앱을 열 때 호출)")
def check_in(user_id: str, date: str | None = DateQuery, conn=Depends(get_conn)):
    today = day(date)
    day_ = todays_missions(conn, user_id, today)
    already = "attendance" in db.completed_ids(conn, user_id, today.isoformat())
    settle = finish_and_pay(conn, user_id, today, day_, "attendance", {"checked_in": True})
    return {"date": today.isoformat(), "already_checked_in": already, **rewards(conn, user_id, settle)}


@app.get("/users/{user_id}/level", summary="레벨·경험치")
def get_level(user_id: str, conn=Depends(get_conn)):
    return {"user_id": user_id, **ms.level_from_xp(db.xp_total(conn, user_id))}


@app.post("/users/{user_id}/photos", summary="사진 업로드 (카메라·앨범) → photo_id")
async def upload_photo(user_id: str, file: UploadFile = File(...), date: str | None = DateQuery, conn=Depends(get_conn)):
    ext = PHOTO_TYPES.get(file.content_type or "")
    if ext is None:
        raise HTTPException(415, f"사진 파일만 올릴 수 있어요 (jpeg, png, webp, heic): {file.content_type}")
    data = await file.read(MAX_PHOTO_BYTES + 1)
    if len(data) > MAX_PHOTO_BYTES:
        raise HTTPException(413, "사진은 10MB 이하만 올릴 수 있어요.")
    if not data:
        raise HTTPException(422, "빈 파일입니다.")

    photo_id = uuid.uuid4().hex
    filename = photo_id + ext
    taken = photo_meta.taken_at(data)
    (upload_dir() / filename).write_bytes(data)
    db.add_photo(conn, photo_id, user_id, filename, file.content_type, day(date).isoformat(), taken)
    return {"photo_id": photo_id, "url": f"/photos/{photo_id}"}   # 촬영 일시는 서버에만 저장 (응답에 안 넣음)


def album_label(used_for: str | None) -> dict | None:
    """사진첩에 보여 줄 '어디에 올린 사진인지'."""
    if used_for is None:
        return None
    if used_for == "diary":
        return {"type": "diary", "id": "diary", "title": "일기"}
    if used_for.startswith("weekly:"):
        q = ms.WEEKLY_QUESTS.get(used_for.removeprefix("weekly:"))
        return {"type": "weekly", "id": used_for, "title": q["title"] if q else used_for}
    m = ms.CATALOG.get(used_for)
    return {"type": "mission", "id": used_for, "title": m.title if m else used_for}


@app.get("/users/{user_id}/album", summary="사진첩: 내가 올린 사진 (날짜 최신순, 어떤 미션·일기에 올렸는지)")
def get_album(user_id: str, start: str | None = Query(None, alias="from", description="YYYY-MM-DD"),
              end: str | None = Query(None, alias="to", description="YYYY-MM-DD"),
              page: int = Query(0, ge=0), per_page: int = Query(30, ge=1, le=100), conn=Depends(get_conn)):
    start = day(start).isoformat() if start else None
    end = day(end).isoformat() if end else None
    rows, total = db.album(conn, user_id, start, end, per_page, page * per_page)
    photos = [{"photo_id": r["id"], "url": f"/photos/{r['id']}", "date": r["date"],
               "used_for": album_label(r["used_for"]), "uploaded_at": r["created_at"]} for r in rows]
    return {"photos": photos, "total": total, "page": page, "per_page": per_page}


@app.get("/users/{user_id}/album/months", summary="사진첩 월별 개수 (달력·탭용)")
def get_album_months(user_id: str, conn=Depends(get_conn)):
    return {"months": db.album_months(conn, user_id)}


@app.delete("/users/{user_id}/photos/{photo_id}", summary="사진 지우기 (사진첩에서). 이미 받은 미션 보상은 그대로")
def delete_photo(user_id: str, photo_id: str, conn=Depends(get_conn)):
    filename = db.delete_photo(conn, user_id, photo_id)
    if filename is None:
        raise HTTPException(404, "사진이 없습니다.")
    (upload_dir() / filename).unlink(missing_ok=True)
    return {"deleted": photo_id}


@app.get("/photos/{photo_id}", summary="사진 보기")
def get_photo(photo_id: str, conn=Depends(get_conn)):
    photo = db.get_photo(conn, photo_id)
    if photo is None:
        raise HTTPException(404, "사진이 없습니다.")
    return FileResponse(upload_dir() / photo["filename"], media_type=photo["content_type"])


@app.get("/users/{user_id}/diary/topic", summary="오늘의 일기 주제")
def get_diary_topic(user_id: str, date: str | None = DateQuery):
    today = day(date)
    return {"date": today.isoformat(), **dy.topic_for(user_id, today.isoformat())}


@app.put("/users/{user_id}/diary/{entry_date}", summary="일기 쓰기·고치기 (일기 미션이 있으면 자동 완료)")
def put_diary(user_id: str, entry_date: str, body: DiaryIn, conn=Depends(get_conn)):
    today = day(entry_date)
    topic = dy.topic_for(user_id, today.isoformat()) if body.use_topic else None
    photos = check_photos(conn, user_id, body.photos)
    entry = db.save_diary(conn, user_id, today.isoformat(), body.text.strip(), topic and topic["id"], body.mood, photos)
    db.tag_photos(conn, user_id, photos, "diary", today.isoformat())
    care = screen_text(conn, user_id, today, "diary", entry["text"])

    # 오늘의 미션에 일기 미션이 있으면 같이 완료 처리
    result = auto_complete(conn, user_id, today, "diary", {"text": entry["text"], "topic_id": entry["topic_id"]})
    return {"entry": {**entry, "topic": topic}, **result, "care": care}


@app.get("/users/{user_id}/diary/{entry_date}", summary="하루 일기 보기")
def get_diary_entry(user_id: str, entry_date: str, conn=Depends(get_conn)):
    entry = db.get_diary(conn, user_id, day(entry_date).isoformat())
    if entry is None:
        raise HTTPException(404, "그날 일기가 없습니다.")
    return {**entry, "topic": dy.TOPICS_BY_ID.get(entry["topic_id"])}


@app.get("/users/{user_id}/diary", summary="일기 목록 (기록 탭)")
def list_diary(user_id: str, start: str = Query(..., alias="from"), end: str = Query(..., alias="to"), conn=Depends(get_conn)):
    entries = db.list_diary(conn, user_id, day(start).isoformat(), day(end).isoformat())
    return {"entries": [{**e, "topic": dy.TOPICS_BY_ID.get(e["topic_id"])} for e in entries]}


def shop_view(conn, user_id: str) -> dict:
    grant_free_items(conn, user_id)
    level = ms.level_from_xp(db.xp_total(conn, user_id))
    coins = db.coin_balance(conn, user_id)
    owned = db.owned_items(conn, user_id)
    equipped = db.get_equipped(conn, user_id)
    current = {"character": equipped["character_id"] or shop.DEFAULT_CHARACTER, "outfit": equipped["outfit_id"]}

    placed = db.get_decor(conn, user_id)

    def show(item: dict) -> dict:
        st = shop.status(item, level["level"], coins, owned)
        # 프론트처럼 잠긴 캐릭터·소품은 이름(과 소품은 레벨)을 숨긴다 → ??? 로 표시
        secret = item["type"] in ("character", "decor") and st in ("locked", "hidden")
        out = {
            "type": item["type"],
            "id": item["id"],
            "name": None if secret else item["name"],
            "level": None if st == "hidden" or (secret and item["type"] == "decor") else item["level"],
            "price": item["price"],
            "how": item["method"] or "buy",
            "status": st,
        }
        if item["type"] == "decor":
            out["slot"] = item["slot"]
            out["landscape"] = item.get("landscape")
            out["placed"] = placed.get(item["slot"]) == item["id"]
        else:
            out["equipped"] = current[item["type"]] == item["id"]
        return out

    return {
        "coins": coins,
        "level": level,
        "equipped": current,
        "decor_slots": shop.DECOR_SLOTS,
        "placed": {slot: placed.get(slot) for slot in shop.DECOR_SLOTS},
        "characters": [show(i) for i in shop.CATALOG["character"].values()],
        "outfits": [show(i) for i in shop.CATALOG["outfit"].values()],
        "decor": [show(i) for i in shop.CATALOG["decor"].values()],
    }


def room_view(conn, user_id: str) -> dict:
    """방 모습: 캐릭터·옷·놓은 소품. 내 홈과 이웃 방문 화면에서 같은 모양으로 쓴다."""
    equipped = db.get_equipped(conn, user_id)
    placed = db.get_decor(conn, user_id)
    return {
        "character": equipped["character_id"] or shop.DEFAULT_CHARACTER,
        "outfit": equipped["outfit_id"],
        "decor": {slot: placed.get(slot) for slot in shop.DECOR_SLOTS},
        "scenery_landscape": shop.CATALOG["decor"].get(placed.get("scenery", ""), {}).get("landscape"),
    }


@app.get("/users/{user_id}/shop", summary="상점: 캐릭터·의상 목록과 내 상태 (보유·구매 가능·잠김·장착)")
def get_shop(user_id: str, conn=Depends(get_conn)):
    return shop_view(conn, user_id)


@app.post("/users/{user_id}/shop/buy", summary="구매 — 레벨·코인·중복을 서버에서 확인하고 코인 차감")
def buy(user_id: str, body: BuyIn, date: str | None = DateQuery, conn=Depends(get_conn)):
    today = day(date)
    grant_free_items(conn, user_id)
    level = ms.level_from_xp(db.xp_total(conn, user_id))["level"]
    problem = shop.buy_problem(body.type, body.item_id, level, db.coin_balance(conn, user_id), db.owned_items(conn, user_id))
    if problem:
        raise HTTPException(*problem)
    item = shop.CATALOG[body.type][body.item_id]
    db.spend_coins(conn, user_id, today.isoformat(), f"buy:{body.type}:{body.item_id}", item["price"])
    db.add_items(conn, user_id, [(body.type, body.item_id)], "bought")
    return {"bought": {"type": body.type, "id": body.item_id, "name": item["name"], "price": item["price"]},
            "coins": db.coin_balance(conn, user_id)}


@app.put("/users/{user_id}/decor", summary="집 꾸미기 배치 — 가진 소품을 맞는 자리에. item_id=null이면 그 자리 비우기")
def place_decor(user_id: str, body: DecorIn, conn=Depends(get_conn)):
    if body.slot not in shop.DECOR_SLOTS:
        raise HTTPException(422, "없는 자리예요.")
    if body.item_id is not None:
        item = shop.CATALOG["decor"].get(body.item_id)
        if item is None or item["slot"] != body.slot:
            raise HTTPException(422, "이 자리에 놓을 수 없는 소품이에요.")
        if ("decor", body.item_id) not in db.owned_items(conn, user_id):
            raise HTTPException(422, "가지고 있지 않은 소품이에요.")
    db.set_decor(conn, user_id, body.slot, body.item_id)
    return room_view(conn, user_id)


@app.get("/users/{user_id}/room", summary="방 모습 (내 방·이웃 방 공통): 닉네임·레벨·캐릭터·옷·놓은 소품")
def get_room(user_id: str, conn=Depends(get_conn)):
    user = db.get_user(conn, user_id)
    return {
        "user_id": user_id,
        "nickname": user["nickname"] if user else None,
        "level": ms.level_from_xp(db.xp_total(conn, user_id))["level"],
        **room_view(conn, user_id),
    }


@app.put("/users/{user_id}/equipped", summary="장착 — 가지고 있는 캐릭터·옷만. 산다고 자동 장착되지 않음")
def equip(user_id: str, body: EquipIn, conn=Depends(get_conn)):
    grant_free_items(conn, user_id)
    owned = db.owned_items(conn, user_id)
    current = db.get_equipped(conn, user_id)
    character_id, outfit_id = current["character_id"], current["outfit_id"]
    if "character_id" in body.model_fields_set:
        if body.character_id is not None and ("character", body.character_id) not in owned:
            raise HTTPException(422, "가지고 있지 않은 캐릭터예요.")
        character_id = body.character_id if body.character_id != shop.DEFAULT_CHARACTER else None
    if "outfit_id" in body.model_fields_set:
        if body.outfit_id is not None and ("outfit", body.outfit_id) not in owned:
            raise HTTPException(422, "가지고 있지 않은 옷이에요.")
        outfit_id = body.outfit_id
    saved = db.set_equipped(conn, user_id, character_id, outfit_id)
    return {"character": saved["character_id"] or shop.DEFAULT_CHARACTER, "outfit": saved["outfit_id"]}


@app.get("/admin/users/{user_id}/signals", summary="[관리자] 위기 신호 기록 — 환경변수 ADMIN_TOKEN과 같은 X-Admin-Token 헤더 필요")
def admin_signals(user_id: str, start: str = Query(..., alias="from"), end: str = Query(..., alias="to"),
                  x_admin_token: str | None = Header(None), conn=Depends(get_conn)):
    token = os.environ.get("ADMIN_TOKEN")
    if not token:
        raise HTTPException(404, "Not Found")          # 관리자 기능이 꺼져 있으면 없는 주소처럼
    if x_admin_token != token:
        raise HTTPException(403, "권한이 없습니다.")
    return {"user_id": user_id, "signals": db.signals(conn, user_id, day(start).isoformat(), day(end).isoformat())}


@app.get("/users/{user_id}/coins", summary="코인 잔액")
def get_coins(user_id: str, conn=Depends(get_conn)):
    return {"user_id": user_id, "coins": db.coin_balance(conn, user_id)}


@app.post("/users/{user_id}/visits", summary="친구 방 놀러 가기 (user_id = 방 주인). 방문한 사람의 방문 미션 자동 완료")
def post_visit(user_id: str, body: VisitIn, date: str | None = DateQuery, conn=Depends(get_conn)):
    today = day(date)
    if body.visitor_id == user_id:
        raise HTTPException(422, "내 방은 방문으로 치지 않아요.")
    new = db.add_visit(conn, user_id, body.visitor_id, today.isoformat())
    result = auto_complete(conn, body.visitor_id, today, "visit", {"visited": True})
    return {"owner_id": user_id, "visitor_id": body.visitor_id, "date": today.isoformat(), "first_visit_today": new, **result}


@app.get("/users/{user_id}/visits", summary="오늘 내 방에 놀러 온 친구")
def get_visits(user_id: str, date: str | None = DateQuery, conn=Depends(get_conn)):
    today = day(date)
    return {"owner_id": user_id, "date": today.isoformat(), "visitors": with_names(conn, db.visitors(conn, user_id, today.isoformat()))}


RECOMMEND_CANDIDATES = 200   # 레벨을 비교할 최근 활동 사용자 수 (많아지면 이 안에서만 고름)
SIMILAR_LEVEL_RANGE = 2      # 레벨 차이가 이 안이면 "비슷한 레벨"


@app.get("/users/{user_id}/rooms/recommended",
         summary="놀러 갈 만한 친구 방 — 최근 7일 안에 앱을 쓴 사람 중 내 레벨과 가까운 순")
def recommended_rooms(user_id: str, date: str | None = DateQuery, limit: int = Query(5, ge=1, le=20), conn=Depends(get_conn)):
    today = day(date)
    since = (today - timedelta(days=7)).isoformat()
    my_level = ms.level_from_xp(db.xp_total(conn, user_id))["level"]

    # 최근에 활동한 순서(active_users)를 같은 레벨 차이 안에서의 순서로 쓴다
    candidates = db.active_users(conn, since, user_id, RECOMMEND_CANDIDATES)
    xps = db.xp_totals(conn, candidates)
    levels = {u: ms.level_from_xp(xps[u])["level"] for u in candidates}
    ranked = sorted(candidates, key=lambda u: (abs(levels[u] - my_level), candidates.index(u)))[:limit]

    rooms = []
    for room in with_names(conn, ranked):
        diff = levels[room["id"]] - my_level
        rooms.append({**room, "level": levels[room["id"]], "level_diff": diff, "similar": abs(diff) <= SIMILAR_LEVEL_RANGE})
    return {"my_level": my_level, "rooms": rooms}


@app.get("/users/{user_id}/guestbook", summary="방명록 목록")
def get_guestbook(user_id: str, page: int = Query(0, ge=0), per_page: int = Query(4, ge=1, le=50), conn=Depends(get_conn)):
    return {"entries": db.list_guestbook(conn, user_id, per_page, page * per_page)}


@app.post("/users/{user_id}/guestbook", summary="방명록 남기기 (user_id = 방 주인). author_id를 넣으면 쓴 사람의 방명록 미션 자동 완료")
def post_guestbook(user_id: str, body: GuestbookIn, date: str | None = DateQuery, conn=Depends(get_conn)):
    today = day(date)
    author = (body.author or "").strip()
    if not author and body.author_id:
        author = (db.get_user(conn, body.author_id) or {}).get("nickname") or ""
    if not author:
        raise HTTPException(422, "보이는 이름(author)이 필요해요. 가입한 사용자면 author_id만 넣어도 돼요.")
    entry = db.add_guestbook(conn, user_id, author, body.text.strip(), body.author_id, today.isoformat())
    if not body.author_id or body.author_id == user_id:
        return {"entry": entry, "completed_missions": [], "earned": []}
    result = auto_complete(conn, body.author_id, today, "guestbook", {"written": True})
    return {"entry": entry, **result}
