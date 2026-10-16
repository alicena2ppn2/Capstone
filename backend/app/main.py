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

from fastapi import Depends, FastAPI, File, Form, Header, HTTPException, Query, Request, Response, UploadFile
from fastapi.responses import FileResponse, PlainTextResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from . import attendance as att
from . import auth
from . import crisis
from . import db
from . import diary as dy
from . import friendship as fs
from . import missions as ms
from . import moderation
from . import photo_meta
from . import shop
from . import survey as sv

USUAL_STEPS_DAYS = 28   # 평소 걸음 = 최근 28일 걸음 중앙값

# 사진 업로드
MAX_PHOTO_BYTES = 10 * 1024 * 1024
# 사진 미션은 미션 날짜에 찍은 사진만 인정한다 (10/15 결정: 사진 날짜가 미션 날짜와 맞아야 성공).
# 촬영 일시는 파일의 EXIF → 없으면 앱이 보낸 taken_at 순서로 본다. 둘 다 없으면(스크린샷·받은 사진) 인정하지 않는다.
ALLOW_PHOTO_WITHOUT_TAKEN_AT = False
NO_TAKEN_AT_MESSAGE = "찍은 날짜를 알 수 없는 사진이에요. 카메라로 오늘 찍은 사진을 올려 주세요."
NOT_TODAY_MESSAGE = "오늘 찍은 사진으로 다시 올려 주세요."
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
    allow_origins=os.environ.get("CORS_ORIGINS", "http://localhost:5173,http://localhost:5180,http://127.0.0.1:5180,http://localhost:8081,http://localhost:5183").split(","),   # 웹(Vite 5173, 팀은 5180) · Expo 웹(8081, 팀은 5183)
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


BIO_MAX = 40


class ProfileIn(BaseModel):
    """보낸 칸만 바꾼다."""
    nickname: str | None = Field(None, description=f"닉네임 {NICKNAME_MIN}~{NICKNAME_MAX}자")
    bio: str | None = Field(None, max_length=BIO_MAX, description=f"한 줄 소개 ({BIO_MAX}자까지, 빈 글이면 지움). 이웃이 내 방에서 봄")


class SupabaseLoginIn(BaseModel):
    supabase_id: str | None = Field(None, description="개발·시연 모드에서만 사용 (서버에 SUPABASE_URL이 없을 때). 실제로는 Authorization 헤더의 토큰")
    nickname: str | None = Field(None, description="처음 로그인일 때만: 이 닉네임으로 서버 사용자를 만든다")


FEEDBACK_TEXT_MAX = 200


class FeedbackIn(BaseModel):
    mood: int | None = Field(None, ge=1, le=5, description="해 보니 어땠어? 1(힘들었어)~5(좋았어)")
    text: str | None = Field(None, max_length=FEEDBACK_TEXT_MAX, description=f"소감 한 줄 ({FEEDBACK_TEXT_MAX}자까지)")
    expected: int | None = Field(None, ge=1, le=5, description="하기 전 예상한 어색함 1~5 (선택, 나중에 씀)")


class BuyIn(BaseModel):
    type: str = Field(..., description="character | outfit | decor")
    item_id: str


class EquipIn(BaseModel):
    """보낸 칸만 바꾼다. character_id=null → 기본 캐릭터, outfit_id=null → 옷 벗기."""
    character_id: str | None = None
    outfit_id: str | None = None


class DecorIn(BaseModel):
    slot: str = Field(..., description="wallpaper | floor | sofa | drawer | curtain | lamp | carpet | frame | doll | scenery")
    item_id: str | None = Field(..., description="놓을 소품 id. null이면 그 자리 비우기")


MOVABLE_SLOTS = ("lamp", "frame", "doll")   # 끌어서 옮길 수 있는 소품 (앱 shared/data/decor.js와 같음)
MOVE_LIMIT = 160                             # 기본 자리에서 이만큼까지만 (방 그림 밖으로 안 나가게)


class MoveIn(BaseModel):
    dx: float = Field(..., ge=-MOVE_LIMIT, le=MOVE_LIMIT, description="가로로 옮긴 거리 (방 그림 좌표 368×500 기준)")
    dy: float = Field(..., ge=-MOVE_LIMIT, le=MOVE_LIMIT, description="세로로 옮긴 거리")


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


DIARY_DELETED_MESSAGE = "지운 날의 일기는 다시 쓸 수 없어요."
WELCOME_BACK_DAYS = 3     # 이만큼 이상 안 들어왔다가 오면 "다시 와 줘서 반가워"
RESET_AFTER_DAYS = 14     # 이만큼 이상 안 들어왔다가 오면 지금 레벨의 처음부터 (레벨은 내려가지 않음)


REST_MAX_DAYS = 30        # 쉬어 가기는 한 번에 최대 이만큼


def days_away(conn, user_id: str, today: Date) -> int | None:
    """마지막으로 앱을 쓴 날과 오늘 사이에 안 들어온 날 수. 처음 쓰는 사람이면 None."""
    last = db.last_active_before(conn, user_id, today.isoformat())
    return None if last is None else (today - Date.fromisoformat(last)).days - 1


def rest_days_in_gap(conn, user_id: str, today: Date, away: int) -> int:
    """안 들어온 날 중 쉬어 가기 기간에 들어간 날 수."""
    rest = db.get_rest(conn, user_id)
    if not rest or away <= 0:
        return 0
    gap_start, gap_end = today - timedelta(days=away), today - timedelta(days=1)
    start = max(gap_start, Date.fromisoformat(rest["start"]))
    end = min(gap_end, Date.fromisoformat(rest["until"]))
    return max(0, (end - start).days + 1)


def comeback_reset(conn, user_id: str, today: Date) -> None:
    """오래 쉬었다 돌아오면 지금 레벨 안에서 쌓은 경험치를 0으로 (레벨은 그대로, 코인도 그대로).
    오늘 처음 미션을 받을 때 한 번만 부른다. 장부에 'comeback_reset'(경험치 −)으로 남긴다."""
    away = days_away(conn, user_id, today)
    if away is None or away - rest_days_in_gap(conn, user_id, today, away) < RESET_AFTER_DAYS:
        return                                  # 쉬어 가기 기간은 쉰 날로 치지 않는다
    lose = ms.level_from_xp(db.xp_total(conn, user_id))["xp_in_level"]
    if lose > 0:
        db.add_coins(conn, user_id, today.isoformat(), [{"id": "comeback_reset", "coins": 0, "xp": -lose}])


def welcome_back(conn, user_id: str, today: Date) -> dict | None:
    """홈 화면용: 오래 쉬었다 돌아온 날이면 안내. 벌점처럼 느껴지지 않게 반가움을 먼저."""
    away = days_away(conn, user_id, today)
    if away is None or away < WELCOME_BACK_DAYS:
        return None
    reset = db.ledger_item(conn, user_id, today.isoformat(), "comeback_reset")
    rested = rest_days_in_gap(conn, user_id, today, away)
    if rested:
        message = "푹 쉬었어? 다시 와 줘서 반가워!"
    elif away >= RESET_AFTER_DAYS:
        message = "오랜만이야! 다시 와 줘서 정말 반가워."
    else:
        message = "다시 와 줘서 반가워! 오늘은 가볍게 하나만 해 볼까?"
    return {"days_away": away, "rest_days": rested, "level_reset": reset is not None,
            "xp_reset": -reset["xp"] if reset else 0, "message": message}


LADDER_IDS = [m for track in ms.BY_STAGE.values() for ids in track.values() for m in ids]


def ladder(conn, user_id: str) -> dict:
    """단계 사다리: 움직이기·이어지기 지금 단계와 다음 단계까지 (완료 기록으로 계산)."""
    return ms.ladder_progress(db.completion_history(conn, user_id, LADDER_IDS))


def todays_missions(conn, user_id: str, today: Date) -> dict:
    """오늘의 미션. 처음 부르면 어제 걸음으로 골라 저장하고, 이후엔 저장된 걸 돌려준다."""
    saved = db.get_mission_day(conn, user_id, today.isoformat())
    if saved:
        return saved
    comeback_reset(conn, user_id, today)        # 오늘의 미션을 저장하기 전에 (저장하면 '마지막으로 쓴 날'이 오늘이 됨)
    yesterday = (today - timedelta(days=1)).isoformat()
    answers = (db.get_survey(conn, user_id) or {}).get("answers")
    picked = ms.pick_missions(
        user_id,
        today.isoformat(),
        steps=db.get_steps(conn, user_id, yesterday),
        usual_steps=usual_steps(conn, user_id, today),
        recent=db.recent_mission_ids(conn, user_id, today.isoformat()),
        last_week_steps=db.steps_between(conn, user_id, (today - timedelta(days=7)).isoformat(), yesterday),
        goes_out_often=sv.goes_out_often(answers),
        stages={t: v["stage"] for t, v in ladder(conn, user_id).items()},
        answers=answers,
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
                raise HTTPException(422, NO_TAKEN_AT_MESSAGE)
            continue
        if Date.fromisoformat(taken[:10]) != today:
            raise HTTPException(422, NOT_TODAY_MESSAGE)


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
    if not moderation.is_clean(name):
        raise HTTPException(422, "다른 닉네임으로 지어 줄래요?")
    if db.nickname_taken(conn, name, except_id):
        raise HTTPException(409, "이미 쓰고 있는 닉네임이에요.")
    return name


def with_names(conn, user_ids: list[str]) -> list[dict]:
    """user id 목록에 닉네임을 붙인다. 등록하지 않은 id면 nickname은 None."""
    names = db.nicknames(conn, user_ids)
    return [{"id": u, "nickname": names.get(u)} for u in user_ids]


def with_status(conn, user_id: str, day_: dict) -> dict:
    done = db.completed_ids(conn, user_id, day_["date"])
    wrote = db.feedback_ids(conn, user_id, day_["date"])
    missions = [{**m, "done": m["id"] in done, "feedback": m["id"] in wrote,
                 "rerollable": ms.slot_of(m) is not None and m["id"] not in done} for m in day_["missions"]]
    return {**{k: v for k, v in day_.items() if k != "rerolls"}, "missions": missions,
            "done_count": sum(m["done"] for m in missions),
            "rerolls_left": max(ms.REROLLS_PER_DAY - day_.get("rerolls", 0), 0)}


# --- 라우트 ------------------------------------------------------------------------

@app.get("/health")
def health():
    return {"ok": True}


@app.post("/users", summary="가입: 닉네임으로 사용자 만들기 → id (앱이 저장해 두고 모든 API에 사용)", status_code=201)
def create_user(body: UserIn, conn=Depends(get_conn)):
    nickname = clean_nickname(conn, body.nickname)
    return db.create_user(conn, uuid.uuid4().hex, nickname)


@app.post("/auth/supabase", summary="Supabase 로그인 → 서버 사용자. 처음이면 nickname으로 만들고(201), 닉네임이 없으면 404 → 앱이 닉네임 화면")
def login_supabase(body: SupabaseLoginIn, response: Response, authorization: str | None = Header(None), conn=Depends(get_conn)):
    try:
        supabase_id = auth.supabase_user_id(authorization, body.supabase_id)
    except auth.AuthError as e:
        raise HTTPException(e.status, e.message)
    user = db.user_by_supabase(conn, supabase_id)
    if user:
        return {"user": user, "created": False}
    if not body.nickname:
        raise HTTPException(404, "처음 오셨네요. 닉네임을 정해 주세요.")
    user = db.create_user(conn, uuid.uuid4().hex, clean_nickname(conn, body.nickname))
    db.link_supabase(conn, user["id"], supabase_id)
    response.status_code = 201
    return {"user": user, "created": True}


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


@app.patch("/users/{user_id}", summary="프로필 바꾸기: 닉네임·한 줄 소개 (보낸 칸만)")
def rename_user(user_id: str, body: ProfileIn, conn=Depends(get_conn)):
    if db.get_user(conn, user_id) is None:
        raise HTTPException(404, "없는 사용자입니다.")
    user = db.get_user(conn, user_id)
    if body.nickname is not None:
        user = db.rename_user(conn, user_id, clean_nickname(conn, body.nickname, except_id=user_id))
    if "bio" in body.model_fields_set:
        bio = " ".join((body.bio or "").split()) or None
        if bio and not moderation.is_clean(bio):
            raise HTTPException(422, "다른 소개 글로 바꿔 줄래요?")
        user = db.set_bio(conn, user_id, bio)
    return user


@app.delete("/users/{user_id}", summary="계정 삭제 — 걸음·미션·코인·사진·일기·방문·방명록까지 모두 삭제")
def delete_user(user_id: str, conn=Depends(get_conn)):
    if db.get_user(conn, user_id) is None:
        raise HTTPException(404, "없는 사용자입니다.")
    for filename in db.delete_user(conn, user_id):
        (upload_dir() / filename).unlink(missing_ok=True)
    return {"deleted": user_id}


@app.get("/survey/questions", summary="처음 설문 질문과 고를 수 있는 답 (앱은 이 순서대로 보여 주면 됨)")
def survey_questions():
    return {"questions": sv.QUESTIONS}


class SurveyIn(BaseModel):
    answers: dict = Field(..., description='질문 id → 답. 하나 고르기는 "student", 여러 개는 ["game", "music"]. 건너뛴 질문은 빼거나 null')


@app.put("/users/{user_id}/survey", summary="처음 설문 답 저장 (다시 보내면 통째로 바뀜). 모든 질문은 건너뛸 수 있음")
def put_survey(user_id: str, body: SurveyIn, conn=Depends(get_conn)):
    if db.get_user(conn, user_id) is None:
        raise HTTPException(404, "없는 사용자입니다.")
    try:
        answers = sv.clean(body.answers)
    except ValueError as e:
        raise HTTPException(422, str(e))
    db.set_survey(conn, user_id, answers)
    return {"answers": answers, "done": True}


@app.get("/users/{user_id}/survey", summary="내 설문 답 (done=false면 아직 안 함 → 앱이 설문 화면을 띄우면 됨)")
def get_survey(user_id: str, conn=Depends(get_conn)):
    saved = db.get_survey(conn, user_id)
    return {"answers": saved["answers"] if saved else {}, "done": saved is not None,
            "updated_at": saved["updated_at"] if saved else None}


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
    back = welcome_back(conn, user_id, today)
    if db.worst_signal(conn, user_id, today.isoformat()) in ("high", "medium"):
        bubble = crisis.CHECK_IN_MESSAGE                     # 오늘 힘든 글을 썼으면 미션 독려 대신 안부
    elif back:
        bubble = back["message"]
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
        "welcome_back": back,
    }


@app.get("/users/{user_id}/missions/today",
         summary="오늘의 미션: 매일 고정(출석·걸음·지난주보다·일기·방문·방명록) + 매일 바뀌는 3개(움직이기·집·이어지기) + 단계 사다리")
def get_missions_today(user_id: str, date: str | None = DateQuery, conn=Depends(get_conn)):
    return {**with_status(conn, user_id, todays_missions(conn, user_id, day(date))), "ladder": ladder(conn, user_id)}


@app.post("/users/{user_id}/missions/{mission_id}/reroll",
          summary=f"미션 새로고침 — 매일 바뀌는 미션을 같은 칸·같은 단계의 다른 미션으로 (하루 {ms.REROLLS_PER_DAY}번, 완료한 미션은 안 됨)")
def reroll_mission(user_id: str, mission_id: str, date: str | None = DateQuery, conn=Depends(get_conn)):
    today = day(date)
    day_ = todays_missions(conn, user_id, today)
    mission = next((m for m in day_["missions"] if m["id"] == mission_id), None)
    if mission is None:
        raise HTTPException(404, f"오늘의 미션이 아닙니다: {mission_id}")
    if ms.slot_of(mission) is None:
        raise HTTPException(422, "매일 하는 미션은 바꿀 수 없어요.")
    if mission_id in db.completed_ids(conn, user_id, today.isoformat()):
        raise HTTPException(409, "이미 끝낸 미션이에요.")
    used = day_.get("rerolls", 0)
    if used >= ms.REROLLS_PER_DAY:
        raise HTTPException(429, f"오늘은 {ms.REROLLS_PER_DAY}번 다 바꿨어요. 내일 또 바꿀 수 있어요.")
    yesterday = (today - timedelta(days=1)).isoformat()
    new = ms.reroll(
        user_id, today.isoformat(), day_["missions"], mission_id, used + 1,
        steps=db.get_steps(conn, user_id, yesterday),
        last_week_steps=db.steps_between(conn, user_id, (today - timedelta(days=7)).isoformat(), yesterday),
        answers=(db.get_survey(conn, user_id) or {}).get("answers"),
        recent=db.recent_mission_ids(conn, user_id, today.isoformat()),
    )
    if new is None:
        raise HTTPException(409, "지금은 바꿀 수 있는 다른 미션이 없어요.")
    missions = [new if m["id"] == mission_id else m for m in day_["missions"]]
    db.replace_missions(conn, user_id, today.isoformat(), missions)
    return {"replaced": mission_id, "mission": new,
            **with_status(conn, user_id, db.get_mission_day(conn, user_id, today.isoformat()))}


@app.post("/users/{user_id}/missions/{mission_id}/photo",
          summary="사진 미션 한 번에: 사진 올리기 + 완료 (multipart file, 선택 taken_at). 미션 날짜에 찍은 사진이어야 성공")
async def complete_with_photo(user_id: str, mission_id: str, file: UploadFile = File(...),
                              taken_at: str | None = Form(None, description="파일에 EXIF가 없을 때 앱이 아는 촬영 일시"),
                              answer: str | None = Form(None), date: str | None = DateQuery, conn=Depends(get_conn)):
    today = day(date)
    mission = next((m for m in todays_missions(conn, user_id, today)["missions"] if m["id"] == mission_id), None)
    if mission is None:
        raise HTTPException(404, f"오늘의 미션이 아닙니다: {mission_id}")
    if mission["kind"] != "photo":
        raise HTTPException(422, "사진으로 끝내는 미션이 아니에요.")
    photo = await save_photo(conn, user_id, file, taken_at, today.isoformat())
    result = complete_mission(user_id, mission_id, CompleteIn(photos=[photo["photo_id"]], answer=answer),
                              date=today.isoformat(), conn=conn)
    return {**result, "photo": photo}


@app.get("/users/{user_id}/ladder", summary="단계 사다리: 움직이기·이어지기 지금 단계(1 혼자 · 2 한 명 · 3 여럿)와 다음 단계까지 남은 횟수")
def get_ladder(user_id: str, conn=Depends(get_conn)):
    return ladder(conn, user_id)


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
        if db.diary_deleted(conn, user_id, today.isoformat()):
            raise HTTPException(409, DIARY_DELETED_MESSAGE)
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
    before = ladder(conn, user_id)
    settle = finish_and_pay(conn, user_id, today, day_, mission_id, submission)
    after = ladder(conn, user_id)
    stage_up = [t for t in after if after[t]["stage"] > before[t]["stage"]]   # 이번 완료로 다음 단계가 열린 갈래
    return {"mission_id": mission_id, **rewards(conn, user_id, settle), "care": care, "ladder": after, "stage_up": stage_up}


# --- 미션 소감 ---------------------------------------------------------------------

@app.put("/users/{user_id}/missions/{mission_id}/feedback",
         summary="미션 소감 쓰기·고치기 (그날 완료한 미션만). 기분(1~5)이나 한 줄 중 하나는 있어야 함. 보상 없음")
def put_feedback(user_id: str, mission_id: str, body: FeedbackIn, date: str | None = DateQuery, conn=Depends(get_conn)):
    today = day(date)
    if mission_id not in db.completed_ids(conn, user_id, today.isoformat()):
        raise HTTPException(404, "그날 완료한 미션에만 소감을 남길 수 있어요.")
    text = (body.text or "").strip() or None
    if body.mood is None and text is None:
        raise HTTPException(422, "기분을 고르거나 한 줄을 적어 주세요.")
    care = screen_text(conn, user_id, today, f"feedback:{mission_id}", text) if text else None
    db.set_feedback(conn, user_id, today.isoformat(), mission_id, body.mood, text, body.expected)
    return {"mission_id": mission_id, "date": today.isoformat(), "mood": body.mood, "text": text,
            "expected": body.expected, "care": care}


@app.get("/users/{user_id}/feedback", summary="내 미션 소감 목록 (기간, 최신순)")
def list_feedback(user_id: str, start: str = Query(..., alias="from"), end: str = Query(..., alias="to"), conn=Depends(get_conn)):
    rows = db.feedback_between(conn, user_id, day(start).isoformat(), day(end).isoformat())
    return {"feedback": [{**r, "title": ms.CATALOG[r["mission_id"]].title if r["mission_id"] in ms.CATALOG else None}
                         for r in rows]}


@app.get("/admin/feedback/stats", summary="[관리자] 미션별 소감 수·평균 기분 (모든 사용자) — X-Admin-Token 필요")
def admin_feedback_stats(x_admin_token: str | None = Header(None), conn=Depends(get_conn)):
    token = os.environ.get("ADMIN_TOKEN")
    if not token:
        raise HTTPException(404, "Not Found")
    if x_admin_token != token:
        raise HTTPException(403, "권한이 없습니다.")
    return {"missions": [{**r, "title": ms.CATALOG[r["mission_id"]].title if r["mission_id"] in ms.CATALOG else None}
                         for r in db.feedback_stats(conn)]}


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


def attendance_week(conn, user_id: str, today: Date) -> dict:
    """이번 주 출석표: 날짜마다 정해진 선물, 받은 선물, 오늘인지."""
    monday = att.week_start(today)
    plan = att.week_plan(user_id, monday, list(shop.CATALOG["outfit"]), list(shop.CATALOG["decor"]))
    claims = db.attendance_claims(conn, user_id, monday.isoformat(), (monday + timedelta(days=6)).isoformat())

    def named(reward: dict) -> dict:
        kind = reward["type"]
        if kind in ("outfit", "decor"):
            return {**reward, "name": shop.CATALOG[kind].get(reward["id"], {}).get("name")}
        return reward
    days = [{"date": d, "reward": named(r), "claimed": named(claims[d]) if d in claims else None, "today": d == today.isoformat()}
            for d, r in plan.items()]
    return {"week_start": monday.isoformat(), "days": days, "count": len(claims), "claimed_today": today.isoformat() in claims}


@app.get("/users/{user_id}/attendance/week", summary="이번 주 출석표 (월~일, 날마다 정해진 선물과 받은 선물)")
def get_attendance_week(user_id: str, date: str | None = DateQuery, conn=Depends(get_conn)):
    return attendance_week(conn, user_id, day(date))


@app.post("/users/{user_id}/attendance", summary="출석하기 — 이번 주 출석표의 오늘 선물을 받는다 (하루 한 번, 가진 옷·소품이면 30코인)")
def check_in(user_id: str, date: str | None = DateQuery, conn=Depends(get_conn)):
    today = day(date)
    day_ = todays_missions(conn, user_id, today)
    already = "attendance" in db.completed_ids(conn, user_id, today.isoformat())
    before = ms.level_from_xp(db.xp_total(conn, user_id))["level"]
    settle = finish_and_pay(conn, user_id, today, day_, "attendance", {"checked_in": True})   # 출석 미션 완료 (보상 0)
    gift = None
    planned = next(d["reward"] for d in attendance_week(conn, user_id, today)["days"] if d["today"])
    reward = {k: v for k, v in planned.items() if k != "name"}
    if reward["type"] in ("outfit", "decor"):
        if (reward["type"], reward["id"]) in db.owned_items(conn, user_id):
            reward = {"type": "coins", "amount": att.DUPLICATE_COINS, "duplicate": planned.get("name")}
    if db.add_attendance(conn, user_id, today.isoformat(), reward):
        gift = reward
        if reward["type"] in ("coins", "xp"):
            db.add_coins(conn, user_id, today.isoformat(), [{"id": f"attendance:{today.isoformat()}",
                         "coins": reward["amount"] if reward["type"] == "coins" else 0,
                         "xp": reward["amount"] if reward["type"] == "xp" else 0}])
        else:
            db.add_items(conn, user_id, [(reward["type"], reward["id"])], "attendance")
    out = rewards(conn, user_id, settle)
    level = ms.level_from_xp(db.xp_total(conn, user_id))
    gained = gift or {}
    if gift and gift["type"] in ("outfit", "decor"):
        gift = {**gift, "name": shop.CATALOG[gift["type"]][gift["id"]]["name"]}
    return {"date": today.isoformat(), "already_checked_in": already, **out,
            "earned_total": out["earned_total"] + (gained.get("amount", 0) if gained.get("type") == "coins" else 0),
            "earned_xp": out["earned_xp"] + (gained.get("amount", 0) if gained.get("type") == "xp" else 0),
            "coins": db.coin_balance(conn, user_id), "level": level, "leveled_up": level["level"] > before,
            "gift": gift, "week": attendance_week(conn, user_id, today)}


@app.get("/users/{user_id}/level", summary="레벨·경험치")
def get_level(user_id: str, conn=Depends(get_conn)):
    return {"user_id": user_id, **ms.level_from_xp(db.xp_total(conn, user_id))}


@app.post("/users/{user_id}/photos", summary="사진 업로드 (카메라·앨범) → photo_id")
async def upload_photo(user_id: str, file: UploadFile = File(...),
                       taken_at: str | None = Form(None, description="앱이 아는 촬영 일시 (예: ImagePicker exif.DateTimeOriginal '2026:10:15 14:05:00'). 파일에 EXIF가 없을 때만 씀"),
                       date: str | None = DateQuery, conn=Depends(get_conn)):
    return await save_photo(conn, user_id, file, taken_at, date)


async def save_photo(conn, user_id: str, file: UploadFile, client_taken_at: str | None, date: str | None) -> dict:
    ext = PHOTO_TYPES.get(file.content_type or "")
    if ext is None:
        raise HTTPException(415, f"사진 파일만 올릴 수 있어요 (jpeg, png, webp, heic): {file.content_type}")
    data = await file.read(MAX_PHOTO_BYTES + 1)
    if len(data) > MAX_PHOTO_BYTES:
        raise HTTPException(413, "사진은 10MB 이하만 올릴 수 있어요.")
    if not data:
        raise HTTPException(422, "빈 파일입니다.")

    photo_id = uuid.uuid4().hex
    taken = photo_meta.taken_at(data) or photo_meta.parse_client_taken(client_taken_at)   # 파일 EXIF가 우선 (지우기 전에 읽음)
    cleaned = photo_meta.clean_image(data, file.content_type)   # 위치(GPS)·기기 정보 지우고 저장 (10/15)
    if cleaned is None:
        raise HTTPException(422, "사진을 열 수 없어요. 다른 사진으로 올려 주세요.")
    data, ext, content_type = cleaned
    filename = photo_id + ext
    (upload_dir() / filename).write_bytes(data)
    db.add_photo(conn, photo_id, user_id, filename, content_type, day(date).isoformat(), taken)
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


@app.get("/photos/{photo_id}", summary="사진 보기 (위치·기기 정보는 올릴 때 지움. 주소는 추측할 수 없는 무작위 id)")
def get_photo(photo_id: str, conn=Depends(get_conn)):
    photo = db.get_photo(conn, photo_id)
    if photo is None:
        raise HTTPException(404, "사진이 없습니다.")
    return FileResponse(upload_dir() / photo["filename"], media_type=photo["content_type"])


def diary_text(entries: list[dict], nickname: str | None, start: str, end: str) -> str:
    """일기를 사람이 읽기 좋은 글로. 날짜 오래된 순."""
    lines = [f"MOCHI 일기 — {nickname or '나'}", f"기간: {start} ~ {end} · {len(entries)}편", ""]
    for e in sorted(entries, key=lambda e: e["date"]):
        lines.append(f"■ {e['date']}" + (f" · 기분: {e['mood']}" if e.get("mood") else ""))
        topic = dy.TOPICS_BY_ID.get(e["topic_id"])
        if topic:
            lines.append(f"오늘의 주제: {topic['text']}")
        lines.append(e["text"])
        if e["photos"]:
            lines.append(f"(사진 {len(e['photos'])}장)")
        lines.append("")
    return "\n".join(lines)


@app.get("/users/{user_id}/diary/export", summary="일기 내보내기 — 텍스트 파일(.txt)로 내려받기 (공유·보관용)",
         response_class=PlainTextResponse)
def export_diary(user_id: str, start: str = Query(..., alias="from"), end: str = Query(..., alias="to"), conn=Depends(get_conn)):
    s, e = day(start).isoformat(), day(end).isoformat()
    if s > e:
        raise HTTPException(422, "시작 날짜가 끝 날짜보다 뒤예요.")
    entries = db.list_diary(conn, user_id, s, e)
    user = db.get_user(conn, user_id)
    text = diary_text(entries, user["nickname"] if user else None, s, e)
    filename = f"mochi-diary-{s}-{e}.txt"
    return PlainTextResponse(text, headers={"Content-Disposition": f'attachment; filename="{filename}"'})


@app.get("/users/{user_id}/diary/topic", summary="오늘의 일기 주제")
def get_diary_topic(user_id: str, date: str | None = DateQuery):
    today = day(date)
    return {"date": today.isoformat(), **dy.topic_for(user_id, today.isoformat())}


@app.put("/users/{user_id}/diary/{entry_date}", summary="일기 쓰기·고치기 (일기 미션이 있으면 자동 완료)")
def put_diary(user_id: str, entry_date: str, body: DiaryIn, conn=Depends(get_conn)):
    today = day(entry_date)
    if db.diary_deleted(conn, user_id, today.isoformat()):
        raise HTTPException(409, DIARY_DELETED_MESSAGE)
    topic = dy.topic_for(user_id, today.isoformat()) if body.use_topic else None
    photos = check_photos(conn, user_id, body.photos)
    entry = db.save_diary(conn, user_id, today.isoformat(), body.text.strip(), topic and topic["id"], body.mood, photos)
    db.tag_photos(conn, user_id, photos, "diary", today.isoformat())
    care = screen_text(conn, user_id, today, "diary", entry["text"])

    # 오늘의 미션에 일기 미션이 있으면 같이 완료 처리
    result = auto_complete(conn, user_id, today, "diary", {"text": entry["text"], "topic_id": entry["topic_id"]})
    return {"entry": {**entry, "topic": topic}, **result, "care": care}


@app.delete("/users/{user_id}/diary/{entry_date}", summary="일기 지우기 — 지운 날은 다시 쓸 수 없음, 받은 보상은 그대로")
def delete_diary(user_id: str, entry_date: str, conn=Depends(get_conn)):
    date = day(entry_date).isoformat()
    if not db.delete_diary(conn, user_id, date):
        raise HTTPException(404, "그날 일기가 없습니다.")
    return {"deleted": date}


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
        "positions": db.decor_positions(conn, user_id),
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


@app.put("/users/{user_id}/decor/{slot}/position", summary="소품 옮기기 — 놓여 있는 전등·액자·인형을 끌어서 옮긴 위치 저장")
def move_decor(user_id: str, slot: str, body: MoveIn, conn=Depends(get_conn)):
    if slot not in MOVABLE_SLOTS:
        raise HTTPException(422, "이 소품은 자리가 정해져 있어요.")
    if not db.move_decor(conn, user_id, slot, round(body.dx, 1), round(body.dy, 1)):
        raise HTTPException(404, "그 자리에 놓인 소품이 없어요.")
    return room_view(conn, user_id)


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


@app.get("/users/{user_id}/room", summary="방 모습 (내 방·이웃 방 공통): 닉네임·레벨·캐릭터·옷·놓은 소품·방문자 수(오늘/전체)")
def get_room(user_id: str, date: str | None = DateQuery, conn=Depends(get_conn)):
    user = db.get_user(conn, user_id)
    return {
        "user_id": user_id,
        "nickname": user["nickname"] if user else None,
        "bio": user["bio"] if user else None,
        "level": ms.level_from_xp(db.xp_total(conn, user_id))["level"],
        **room_view(conn, user_id),
        "visits": db.visit_counts(conn, user_id, day(date).isoformat()),
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
    if user_id in db.block_related(conn, body.visitor_id):
        raise HTTPException(403, "방문할 수 없는 방이에요.")
    new = db.add_visit(conn, user_id, body.visitor_id, today.isoformat())
    result = auto_complete(conn, body.visitor_id, today, "visit", {"visited": True})
    bond = grow_friendship(conn, body.visitor_id, user_id, today, "visit")
    return {"owner_id": user_id, "visitor_id": body.visitor_id, "date": today.isoformat(), "first_visit_today": new,
            **result, "friendship": bond}


@app.get("/users/{user_id}/visits", summary="오늘 내 방에 놀러 온 친구")
def get_visits(user_id: str, date: str | None = DateQuery, conn=Depends(get_conn)):
    today = day(date)
    blocked = db.block_related(conn, user_id)
    visitors = [v for v in db.visitors(conn, user_id, today.isoformat()) if v not in blocked]
    return {"owner_id": user_id, "date": today.isoformat(), "visitors": with_names(conn, visitors)}


RECOMMEND_CANDIDATES = 200   # 레벨을 비교할 최근 활동 사용자 수 (많아지면 이 안에서만 고름)
SIMILAR_LEVEL_RANGE = 2      # 레벨 차이가 이 안이면 "비슷한 레벨"


@app.get("/users/{user_id}/rooms/recommended",
         summary="놀러 갈 만한 친구 방 — 최근 7일 안에 앱을 쓴 사람 중 내 레벨과 가까운 순")
def recommended_rooms(user_id: str, date: str | None = DateQuery, limit: int = Query(5, ge=1, le=20), conn=Depends(get_conn)):
    today = day(date)
    since = (today - timedelta(days=7)).isoformat()
    my_level = ms.level_from_xp(db.xp_total(conn, user_id))["level"]

    # 최근에 활동한 순서(active_users)를 같은 레벨 차이 안에서의 순서로 쓴다
    blocked = db.block_related(conn, user_id)
    candidates = [u for u in db.active_users(conn, since, user_id, RECOMMEND_CANDIDATES) if u not in blocked]
    xps = db.xp_totals(conn, candidates)
    levels = {u: ms.level_from_xp(xps[u])["level"] for u in candidates}
    ranked = sorted(candidates, key=lambda u: (abs(levels[u] - my_level), candidates.index(u)))[:limit]

    friends = db.friend_ids(conn, user_id)
    rooms = []
    for room in with_names(conn, ranked):
        diff = levels[room["id"]] - my_level
        rooms.append({**room, "level": levels[room["id"]], "level_diff": diff,
                      "similar": abs(diff) <= SIMILAR_LEVEL_RANGE, "is_friend": room["id"] in friends})
    return {"my_level": my_level, "rooms": rooms}


@app.get("/users/{user_id}/guestbook", summary="방명록 목록 (신고가 쌓인 글·차단한 사람 글은 빠짐)")
def get_guestbook(user_id: str, page: int = Query(0, ge=0), per_page: int = Query(4, ge=1, le=50),
                  viewer_id: str | None = Query(None, description="보는 사람 user id. 넣으면 그 사람이 신고한 글·차단 관계인 사람 글도 빠짐"),
                  conn=Depends(get_conn)):
    entries = db.list_guestbook(conn, user_id, per_page, page * per_page, viewer_id, moderation.REPORT_HIDE_COUNT)
    likes = db.like_counts(conn, [e["id"] for e in entries], viewer_id)
    return {"entries": [{**e, **likes[e["id"]]} for e in entries]}


class LikeIn(BaseModel):
    user_id: str = Field(..., min_length=1, description="좋아요 누르는 사람 user id")


def guestbook_entry_or_404(conn, owner_id: str, entry_id: int) -> dict:
    entry = db.get_guestbook_entry(conn, entry_id)
    if entry is None or entry["owner_id"] != owner_id:
        raise HTTPException(404, "방명록 글이 없습니다.")
    return entry


@app.post("/users/{user_id}/guestbook/{entry_id}/like", summary="방명록 글 좋아요 (한 사람이 한 번)")
def like_guestbook(user_id: str, entry_id: int, body: LikeIn, conn=Depends(get_conn)):
    entry = guestbook_entry_or_404(conn, user_id, entry_id)
    if entry["author_id"] and entry["author_id"] in db.block_related(conn, body.user_id):
        raise HTTPException(404, "방명록 글이 없습니다.")
    db.like_entry(conn, entry_id, body.user_id)
    bond = grow_friendship(conn, body.user_id, entry["author_id"], seoul_today(), "like")   # 글쓴이와 친밀도 +1 (하루 한 번)
    return {"entry_id": entry_id, **db.like_counts(conn, [entry_id], body.user_id)[entry_id], "friendship": bond}


@app.delete("/users/{user_id}/guestbook/{entry_id}/like", summary="방명록 글 좋아요 취소")
def unlike_guestbook(user_id: str, entry_id: int, by: str = Query(..., description="좋아요를 취소하는 사람 user id"),
                     conn=Depends(get_conn)):
    guestbook_entry_or_404(conn, user_id, entry_id)
    db.unlike_entry(conn, entry_id, by)
    return {"entry_id": entry_id, **db.like_counts(conn, [entry_id], by)[entry_id]}


@app.delete("/users/{user_id}/guestbook/{entry_id}", summary="방명록 글 지우기 (방 주인 또는 쓴 사람)")
def delete_guestbook(user_id: str, entry_id: int, by: str = Query(..., description="지우는 사람 user id"), conn=Depends(get_conn)):
    entry = db.get_guestbook_entry(conn, entry_id)
    if entry is None or entry["owner_id"] != user_id:
        raise HTTPException(404, "방명록 글이 없습니다.")
    if by not in (entry["owner_id"], entry["author_id"]):
        raise HTTPException(403, "방 주인이나 쓴 사람만 지울 수 있어요.")
    db.delete_guestbook_entry(conn, entry_id)
    return {"deleted": entry_id}


@app.post("/users/{user_id}/guestbook", summary="방명록 남기기 (user_id = 방 주인). author_id를 넣으면 쓴 사람의 방명록 미션 자동 완료")
def post_guestbook(user_id: str, body: GuestbookIn, date: str | None = DateQuery, conn=Depends(get_conn)):
    today = day(date)
    author = (body.author or "").strip()
    if not author and body.author_id:
        author = (db.get_user(conn, body.author_id) or {}).get("nickname") or ""
    if not author:
        raise HTTPException(422, "보이는 이름(author)이 필요해요. 가입한 사용자면 author_id만 넣어도 돼요.")
    if body.author_id and user_id in db.block_related(conn, body.author_id):
        raise HTTPException(403, "방명록을 남길 수 없는 방이에요.")
    if body.author_id and (until := db.guestbook_ban_until(conn, body.author_id, today.isoformat())):
        raise HTTPException(403, f"지금은 방명록을 쓸 수 없어요. ({until}까지)")
    found = {moderation.check(body.text), moderation.check(author)} - {None}
    if "slur" in found and body.author_id:
        # 혐오 표현: 글을 막고 방명록 쓰기 정지 (Habitica 방식). 정지 기록은 운영자가 확인
        until = (today + timedelta(days=moderation.SLUR_BAN_DAYS - 1)).isoformat()
        db.ban_guestbook(conn, body.author_id, until, "slur")
        raise HTTPException(403, f"다른 사람을 깎아내리는 말은 쓸 수 없어요. {until}까지 방명록을 쓸 수 없어요.")
    if found:
        raise HTTPException(422, moderation.FILTER_MESSAGE)
    entry = db.add_guestbook(conn, user_id, author, body.text.strip(), body.author_id, today.isoformat())
    if not body.author_id or body.author_id == user_id:
        return {"entry": entry, "completed_missions": [], "earned": [], "friendship": None}
    result = auto_complete(conn, body.author_id, today, "guestbook", {"written": True})
    bond = grow_friendship(conn, body.author_id, user_id, today, "guestbook")
    return {"entry": entry, **result, "friendship": bond}


# --- 차단·신고 ---------------------------------------------------------------------

class BlockIn(BaseModel):
    target_id: str = Field(..., min_length=1, description="차단할 사람 user id")


class ReportIn(BaseModel):
    reporter_id: str = Field(..., min_length=1)
    target_type: str = Field(..., description="guestbook(방명록 글) | user(사람)")
    target_id: str = Field(..., min_length=1, description="방명록 글 id 또는 user id")
    reason: str = Field(..., description="spam | abuse | sexual | hate | self_harm | other")
    detail: str | None = Field(None, max_length=200)
    block: bool = Field(False, description="true면 신고하면서 그 사람을 차단도 함")


@app.post("/users/{user_id}/blocks", status_code=201, summary="차단하기 — 서로의 방 추천·방문·방명록에서 사라짐")
def block_user(user_id: str, body: BlockIn, conn=Depends(get_conn)):
    if body.target_id == user_id:
        raise HTTPException(422, "나를 차단할 수는 없어요.")
    db.add_block(conn, user_id, body.target_id)
    return {"user_id": user_id, "blocked_id": body.target_id}


@app.delete("/users/{user_id}/blocks/{target_id}", summary="차단 풀기")
def unblock_user(user_id: str, target_id: str, conn=Depends(get_conn)):
    if not db.remove_block(conn, user_id, target_id):
        raise HTTPException(404, "차단한 사람이 아니에요.")
    return {"user_id": user_id, "unblocked_id": target_id}


@app.get("/users/{user_id}/blocks", summary="내가 차단한 사람 (설정 화면용)")
def list_blocks(user_id: str, conn=Depends(get_conn)):
    return {"blocked": with_names(conn, db.my_blocks(conn, user_id))}


def counts_for_hiding(conn, reporter_id: str, today: Date) -> bool:
    """가입한 지 NEW_ACCOUNT_DAYS일이 지난 계정의 신고만 숨김 횟수에 센다. 가입 기록이 없는 id도 세지 않는다."""
    user = db.get_user(conn, reporter_id)
    if user is None:
        return False
    joined = Date.fromisoformat(user["created_at"][:10])
    return (today - joined).days >= moderation.NEW_ACCOUNT_DAYS


@app.post("/reports", status_code=201, summary="신고하기 — 신고한 사람에게는 바로 숨기고, 여러 명이 신고하면 모두에게 숨김")
def report(body: ReportIn, date: str | None = DateQuery, conn=Depends(get_conn)):
    today = day(date)
    if body.target_type not in moderation.REPORT_TARGETS:
        raise HTTPException(422, f"신고 대상은 {', '.join(moderation.REPORT_TARGETS)} 중 하나예요.")
    if body.reason not in moderation.REPORT_REASONS:
        raise HTTPException(422, f"신고 이유는 {', '.join(moderation.REPORT_REASONS)} 중 하나예요.")

    offender = body.target_id
    if body.target_type == "guestbook":
        entry = db.get_guestbook_entry(conn, int(body.target_id)) if body.target_id.isdigit() else None
        if entry is None:
            raise HTTPException(404, "방명록 글이 없습니다.")
        offender = entry["author_id"]
    if offender == body.reporter_id:
        raise HTTPException(422, "내가 쓴 글이나 나를 신고할 수는 없어요.")

    counted = counts_for_hiding(conn, body.reporter_id, today)
    new = db.add_report(conn, body.reporter_id, body.target_type, body.target_id, body.reason, body.detail, counted)
    if body.block and offender:
        db.add_block(conn, body.reporter_id, offender)
    count = db.report_count(conn, body.target_type, body.target_id)
    hidden = body.target_type == "guestbook" and count >= moderation.REPORT_HIDE_COUNT
    return {
        "reported": True,
        "first_report_by_you": new,
        "blocked": bool(body.block and offender),
        "hidden_for_everyone": hidden,
        "counted": counted,
        "message": "신고해 줘서 고마워요. 확인할게요.",
    }


# --- 쉬어 가기 ---------------------------------------------------------------------

class RestIn(BaseModel):
    days: int = Field(..., ge=1, le=REST_MAX_DAYS, description=f"오늘부터 며칠 쉴지 (1~{REST_MAX_DAYS})")


def rest_view(conn, user_id: str, today: Date) -> dict:
    rest = db.get_rest(conn, user_id)
    active = bool(rest) and rest["start"] <= today.isoformat() <= rest["until"]
    return {"resting": active, "start": rest["start"] if active else None, "until": rest["until"] if active else None}


@app.post("/users/{user_id}/rest", summary="쉬어 가기 — 이 기간은 오래 쉰 날로 치지 않아 경험치가 초기화되지 않음")
def start_rest(user_id: str, body: RestIn, date: str | None = DateQuery, conn=Depends(get_conn)):
    today = day(date)
    db.set_rest(conn, user_id, today.isoformat(), (today + timedelta(days=body.days - 1)).isoformat())
    return {**rest_view(conn, user_id, today), "message": "잘 쉬고 와. 기다리고 있을게."}


@app.get("/users/{user_id}/rest", summary="쉬어 가기 상태")
def get_rest(user_id: str, date: str | None = DateQuery, conn=Depends(get_conn)):
    return rest_view(conn, user_id, day(date))


@app.delete("/users/{user_id}/rest", summary="쉬어 가기 끝내기 (어제까지로)")
def stop_rest(user_id: str, date: str | None = DateQuery, conn=Depends(get_conn)):
    today = day(date)
    db.end_rest(conn, user_id, (today - timedelta(days=1)).isoformat())
    return rest_view(conn, user_id, today)


# --- 친구 ---------------------------------------------------------------------------

FRIEND_LIMIT = 100        # 친구 최대 수 (받은·보낸 요청 포함)


class FriendIn(BaseModel):
    nickname: str = Field(..., min_length=1, description="친구로 추가할 사람의 닉네임 (대소문자·띄어쓰기 무시)")


def friend_cards(conn, user_id: str, entries: list[dict], today: Date) -> list[dict]:
    """친구 목록 한 줄: 닉네임, 레벨, 마지막으로 앱을 쓴 날, 오늘 내가 놀러 갔는지."""
    ids = [e["id"] for e in entries]
    names = db.nicknames(conn, ids)
    xps = db.xp_totals(conn, ids)
    last = db.last_active(conn, ids)
    visited = set(db.visited_owners(conn, user_id, today.isoformat()))
    points = db.friendship_points(conn, user_id, ids)
    return [{
        "id": e["id"],
        "nickname": names.get(e["id"]),
        "level": ms.level_from_xp(xps[e["id"]])["level"],
        "last_active": last.get(e["id"]),
        "visited_today": e["id"] in visited,
        "since": e["since"],
        "friendship": fs.level_from_points(points[e["id"]]),
    } for e in entries]


def grow_friendship(conn, actor_id: str, friend_id: str, today: Date, kind: str) -> dict | None:
    """방명록·방문·좋아요를 하면 두 사람의 친밀도를 올린다. 레벨이 오를 때 코인은 친구 사이일 때만 두 사람 모두에게.
    그날 같은 활동을 이미 했으면 점수는 그대로. 자기 자신에게 한 건 세지 않음 (None)."""
    if not friend_id or actor_id == friend_id:
        return None
    is_friend = friend_id in db.friend_ids(conn, actor_id)
    before = fs.level_from_points(db.friendship_points(conn, actor_id, [friend_id])[friend_id])
    counted = db.add_friendship_points(conn, actor_id, friend_id, today.isoformat(), kind, fs.POINTS[kind])
    after = fs.level_from_points(db.friendship_points(conn, actor_id, [friend_id])[friend_id])

    earned = 0
    for level in range(before["level"] + 1, after["level"] + 1) if is_friend else ():
        coins = fs.reward_for(level)
        for me, other in ((actor_id, friend_id), (friend_id, actor_id)):
            item = fs.reward_item(other, level)
            if not db.paid_ever(conn, me, item):                 # 끊었다 다시 맺어도 한 번만
                db.add_coins(conn, me, today.isoformat(), [{"id": item, "coins": coins, "xp": 0}])
                if me == actor_id:
                    earned += coins
    return {
        "friend_id": friend_id,
        **after,
        "gained": fs.POINTS[kind] if counted else 0,
        "leveled_up": after["level"] > before["level"],
        "earned_coins": earned,
        "is_friend": is_friend,
    }


@app.get("/users/{user_id}/friendship/{other_id}", summary="두 사람의 친밀도: 레벨·점수·서로 한 방문·방명록·좋아요 횟수 (친구가 아니어도)")
def get_friendship(user_id: str, other_id: str, conn=Depends(get_conn)):
    points = db.friendship_points(conn, user_id, [other_id])[other_id]
    return {"user_id": user_id, "other_id": other_id, "is_friend": other_id in db.friend_ids(conn, user_id),
            **fs.level_from_points(points), "counts": db.friendship_counts(conn, user_id, other_id)}


@app.post("/users/{user_id}/friends", status_code=201,
          summary="친구 추가 (닉네임으로 요청). 상대가 이미 나에게 요청했으면 바로 친구")
def add_friend(user_id: str, body: FriendIn, date: str | None = DateQuery, conn=Depends(get_conn)):
    target = db.find_user_by_nickname(conn, body.nickname)
    if target is None:
        raise HTTPException(404, "그 닉네임을 쓰는 친구를 찾지 못했어요.")
    other = target["id"]
    if other == user_id:
        raise HTTPException(422, "나는 친구로 추가할 수 없어요.")
    if other in db.block_related(conn, user_id):
        # 누가 차단했는지는 알리지 않는다
        raise HTTPException(404, "그 닉네임을 쓰는 친구를 찾지 못했어요.")

    edge = db.friend_edge(conn, user_id, other)
    if edge and edge["status"] == "accepted":
        raise HTTPException(409, "이미 친구예요.")
    if edge and edge["user_id"] == user_id:
        raise HTTPException(409, "이미 친구 요청을 보냈어요.")
    if edge:                                   # 상대가 먼저 보낸 요청이 있으면 수락으로
        db.accept_friend(conn, other, user_id)
        return {"status": "accepted", "friend": target, "message": f"{target['nickname']}님과 친구가 됐어요!"}

    if sum(len(v) for v in db.friend_lists(conn, user_id).values()) >= FRIEND_LIMIT:
        raise HTTPException(422, f"친구는 {FRIEND_LIMIT}명까지예요.")
    db.request_friend(conn, user_id, other)
    return {"status": "pending", "friend": target, "message": f"{target['nickname']}님에게 친구 요청을 보냈어요."}


@app.get("/users/{user_id}/friends", summary="친구 목록 + 받은 요청 + 보낸 요청")
def list_friends(user_id: str, date: str | None = DateQuery, conn=Depends(get_conn)):
    today = day(date)
    lists = db.friend_lists(conn, user_id)
    blocked = db.block_related(conn, user_id)
    return {key: friend_cards(conn, user_id, [e for e in entries if e["id"] not in blocked], today)
            for key, entries in lists.items()}


@app.post("/users/{user_id}/friends/{friend_id}/accept", summary="받은 친구 요청 수락")
def accept_friend(user_id: str, friend_id: str, conn=Depends(get_conn)):
    if not db.accept_friend(conn, friend_id, user_id):
        raise HTTPException(404, "받은 친구 요청이 없어요.")
    return {"status": "accepted", "friend": with_names(conn, [friend_id])[0]}


@app.delete("/users/{user_id}/friends/{friend_id}", summary="친구 끊기 · 보낸 요청 취소 · 받은 요청 거절")
def remove_friend(user_id: str, friend_id: str, conn=Depends(get_conn)):
    if not db.remove_friend(conn, user_id, friend_id):
        raise HTTPException(404, "친구나 친구 요청이 없어요.")
    return {"removed": friend_id}
