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
from datetime import date as Date, timedelta

from pathlib import Path

from fastapi import Depends, FastAPI, File, HTTPException, Query, Request, UploadFile
from fastapi.responses import FileResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from . import db
from . import diary as dy
from . import missions as ms

USUAL_STEPS_DAYS = 28   # 평소 걸음 = 최근 28일 걸음 중앙값

# 사진 업로드
MAX_PHOTO_BYTES = 10 * 1024 * 1024
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


def day(value: str | None) -> Date:
    if value is None:
        return Date.today()
    try:
        return Date.fromisoformat(value)
    except ValueError:
        raise HTTPException(422, f"date 형식은 YYYY-MM-DD 입니다: {value}")


DateQuery = Query(None, description="기준 날짜 YYYY-MM-DD. 없으면 오늘 (데모에서 날짜 넘길 때 사용)")


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


class GuestbookIn(BaseModel):
    author: str = Field(..., min_length=1, max_length=20)
    text: str = Field(..., min_length=1, max_length=60)


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


def finish_and_pay(conn, user_id: str, today: Date, day_: dict, mission_id: str, submission: dict) -> dict:
    """완료를 저장하고 받을 코인을 지급한다."""
    db.save_completion(conn, user_id, today.isoformat(), mission_id, submission)
    settle = ms.settle_coins(
        day_["missions"],
        db.completed_ids(conn, user_id, today.isoformat()),
        already_paid=db.paid_ids(conn, user_id, today.isoformat()),
    )
    db.add_coins(conn, user_id, today.isoformat(), settle["items"])
    return settle


def with_status(conn, user_id: str, day_: dict) -> dict:
    done = db.completed_ids(conn, user_id, day_["date"])
    missions = [{**m, "done": m["id"] in done} for m in day_["missions"]]
    return {**day_, "missions": missions, "done_count": sum(m["done"] for m in missions)}


# --- 라우트 ------------------------------------------------------------------------

@app.get("/health")
def health():
    return {"ok": True}


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
    if missions["done_count"] == len(missions["missions"]):
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
        "missions_done": missions["done_count"],
        "missions_total": len(missions["missions"]),
        "bubble": bubble,
    }


@app.get("/users/{user_id}/missions/today", summary="오늘의 미션 3개")
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
    if mission["kind"] == "diary":
        # 일기 미션은 기록 탭 일기로 저장한다. 주제 미션이면 오늘의 주제로 쓴 것으로 본다.
        submission["topic_id"] = mission.get("topic_id")
    if mission.get("prompt") and not body.answer:
        raise HTTPException(422, f"먼저 답해 주세요: {mission['prompt']}")
    if not ms.is_complete(mission, submission):
        raise HTTPException(422, "아직 완료 조건을 채우지 못했어요.")

    if mission["kind"] == "diary":
        db.save_diary(conn, user_id, today.isoformat(), submission["text"].strip(), submission["topic_id"], None, [])
    settle = finish_and_pay(conn, user_id, today, day_, mission_id, submission)
    return {
        "mission_id": mission_id,
        "earned": settle["items"],
        "earned_total": settle["total"],
        "all_done": settle["all_done"],
        "coins": db.coin_balance(conn, user_id),
    }


@app.post("/users/{user_id}/photos", summary="사진 업로드 (카메라·앨범) → photo_id")
async def upload_photo(user_id: str, file: UploadFile = File(...), conn=Depends(get_conn)):
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
    (upload_dir() / filename).write_bytes(data)
    db.add_photo(conn, photo_id, user_id, filename, file.content_type)
    return {"photo_id": photo_id, "url": f"/photos/{photo_id}"}


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

    # 오늘의 미션에 일기 미션이 있으면 같이 완료 처리
    completed, earned = [], []
    day_ = db.get_mission_day(conn, user_id, today.isoformat())
    if day_:
        submission = {"text": entry["text"], "topic_id": entry["topic_id"]}
        for m in day_["missions"]:
            if m["kind"] == "diary" and ms.is_complete(m, submission):
                settle = finish_and_pay(conn, user_id, today, day_, m["id"], submission)
                completed.append(m["id"])
                earned += settle["items"]
    return {
        "entry": {**entry, "topic": topic},
        "completed_missions": completed,
        "earned": earned,
        "coins": db.coin_balance(conn, user_id),
    }


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


@app.get("/users/{user_id}/coins", summary="코인 잔액")
def get_coins(user_id: str, conn=Depends(get_conn)):
    return {"user_id": user_id, "coins": db.coin_balance(conn, user_id)}


@app.get("/users/{user_id}/guestbook", summary="방명록 목록")
def get_guestbook(user_id: str, page: int = Query(0, ge=0), per_page: int = Query(4, ge=1, le=50), conn=Depends(get_conn)):
    return {"entries": db.list_guestbook(conn, user_id, per_page, page * per_page)}


@app.post("/users/{user_id}/guestbook", summary="방명록 남기기")
def post_guestbook(user_id: str, body: GuestbookIn, conn=Depends(get_conn)):
    return db.add_guestbook(conn, user_id, body.author, body.text.strip())
