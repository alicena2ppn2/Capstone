"""모든 API의 로그인 확인 — 토큰 주인만 자기 정보를 보고 바꾼다.

규칙 (main.py의 모든 API에 한 번에 적용, `app = FastAPI(dependencies=[Depends(guard)])`):
- 주소에 `{user_id}`가 있으면: 토큰 주인(서버 사용자 id) == user_id 일 때만 허용 → 아니면 403
- 남의 방에서 하는 일(놀러 가기·방명록 쓰기·좋아요·지우기·신고)은 주소가 방 주인이라,
  본문·주소의 '하는 사람' 값(visitor_id·author_id·user_id·by·reporter_id)이 토큰 주인인지 각 API에서 `actor()`로 확인
- 누구나 볼 수 있는 것: 서버 상태, 닉네임 중복 확인, 설문 질문, 이웃 방 보기, 방명록 읽기, 사진(추측할 수 없는 주소)
- 관리자 API는 따로 X-Admin-Token으로 확인, 로그인 연결(/auth/supabase)은 auth.py가 직접 확인

모드 (환경변수 CAPSTONE_AUTH):
- required : 토큰 없으면 401. Supabase(SUPABASE_URL·SUPABASE_KEY)가 설정돼 있으면 기본값 → 출시용
- dev      : 토큰이 있으면 똑같이 확인, 없으면 통과 (내 컴퓨터에서 시연 계정 demo-mochi로 개발할 때)
- off      : 확인 안 함. Supabase가 없으면 기본값 (테스트·처음 개발)
"""

from __future__ import annotations

import hashlib
import os
import time

from fastapi import Header, HTTPException, Request

from . import auth, db

PUBLIC = {
    ("GET", "/health"), ("GET", "/nicknames/check"), ("GET", "/survey/questions"),
    ("POST", "/auth/supabase"),                       # auth.py가 토큰을 직접 확인
    ("GET", "/photos/{photo_id}"),                    # 추측할 수 없는 무작위 주소 (img 태그로 열어야 함)
    ("GET", "/users/{user_id}/room"),                 # 이웃 방 보기
    ("GET", "/users/{user_id}/guestbook"),            # 방명록 읽기
    ("GET", "/places"), ("GET", "/places/{place_id}/notes"),   # 동네 탐험 장소·쪽지 읽기
}
# 주소의 user_id가 방 주인이고, 하는 사람은 본문·주소의 다른 값 → API 안에서 actor()로 확인
ACTOR = {
    ("POST", "/users/{user_id}/visits"),
    ("POST", "/users/{user_id}/guestbook"),
    ("POST", "/users/{user_id}/guestbook/{entry_id}/like"),
    ("DELETE", "/users/{user_id}/guestbook/{entry_id}/like"),
    ("DELETE", "/users/{user_id}/guestbook/{entry_id}"),
    ("POST", "/reports"),
    ("POST", "/places/{place_id}/notes"), ("DELETE", "/places/{place_id}/notes/{note_id}"),
}

CACHE_SECONDS = 60          # 같은 토큰을 매번 Supabase에 묻지 않게 잠깐 기억 (토큰 원문은 저장 안 함)
_cache: dict[str, tuple[str, float]] = {}


def mode() -> str:
    if not auth.verify_on():
        return "off"                                  # 토큰을 확인할 방법이 없음
    chosen = (os.environ.get("CAPSTONE_AUTH") or "required").strip().lower()
    return chosen if chosen in ("required", "dev", "off") else "required"


def _supabase_id(authorization: str) -> str:
    key = hashlib.sha256(authorization.encode()).hexdigest()
    hit = _cache.get(key)
    if hit and hit[1] > time.monotonic():
        return hit[0]
    try:
        supabase_id = auth.supabase_user_id(authorization, None)
    except auth.AuthError as e:
        raise HTTPException(e.status, e.message)
    if len(_cache) > 2000:
        _cache.clear()
    _cache[key] = (supabase_id, time.monotonic() + CACHE_SECONDS)
    return supabase_id


def guard(request: Request, authorization: str | None = Header(None)) -> None:
    current = mode()
    if current == "off":
        return
    route = request.scope.get("route")
    template, method = getattr(route, "path", request.url.path), request.method
    if method == "OPTIONS" or (method, template) in PUBLIC or template.startswith("/admin"):
        return
    if not authorization:
        if current == "dev":
            return
        raise HTTPException(401, "로그인이 필요해요.")
    user = db.user_by_supabase(request.app.state.conn, _supabase_id(authorization))
    if user is None:
        raise HTTPException(403, "게임 계정 연결이 필요해요. 다시 로그인해 주세요.")
    request.state.user_id = user["id"]
    if (method, template) == ("POST", "/users"):
        raise HTTPException(403, "가입은 로그인으로 해 주세요.")   # 로그인 없이 계정 만들기 막기
    if (method, template) in ACTOR:
        return
    owner = request.path_params.get("user_id")
    if owner is not None and owner != user["id"]:
        raise HTTPException(403, "다른 사람의 정보는 볼 수도, 바꿀 수도 없어요.")


def me(request: Request) -> str | None:
    """토큰 주인 서버 id (확인을 안 하는 모드·토큰 없는 dev 요청이면 None)."""
    return getattr(request.state, "user_id", None)


def actor(request: Request, claimed: str | None) -> str | None:
    """남의 방에서 하는 일: '하는 사람' 값이 토큰 주인이어야 한다. 값이 비어 있으면 토큰 주인으로 채운다."""
    owner = me(request)
    if owner is None:
        return claimed
    if claimed is not None and claimed != owner:
        raise HTTPException(403, "다른 사람 이름으로는 할 수 없어요.")
    return owner
