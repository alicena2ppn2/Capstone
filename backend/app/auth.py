"""Supabase 로그인 연결.

앱은 Supabase로 로그인하고(프론트), 서버는 그 Supabase 사용자를 서버 사용자(id)와 이어 준다.

- 환경변수 SUPABASE_URL·SUPABASE_KEY가 있으면: 앱이 보낸 로그인 토큰(Authorization: Bearer)을
  Supabase에 물어봐서 진짜인지 확인하고, 토큰 안의 사용자 id만 쓴다. (서명 방식과 상관없이 동작)
- 없으면(개발·시연 모드): 요청 본문의 supabase_id를 그대로 믿는다. 출시 전에는 꼭 환경변수를 넣어야 한다.

다른 모든 API의 토큰 확인(토큰 주인 = 주소의 {user_id})은 access.py가 한다 (2026-10-16).
"""

from __future__ import annotations

import os

import httpx

TIMEOUT = 5.0


class AuthError(Exception):
    def __init__(self, status: int, message: str):
        super().__init__(message)
        self.status = status
        self.message = message


def verify_on() -> bool:
    return bool(os.environ.get("SUPABASE_URL") and os.environ.get("SUPABASE_KEY"))


def supabase_user_id(authorization: str | None, claimed: str | None) -> str:
    """로그인한 Supabase 사용자 id. 확인에 실패하면 AuthError."""
    if not verify_on():
        if not claimed:
            raise AuthError(422, "supabase_id가 필요해요.")
        return claimed
    scheme, _, token = (authorization or "").partition(" ")
    if scheme.lower() != "bearer" or not token:
        raise AuthError(401, "로그인이 필요해요.")
    url = os.environ["SUPABASE_URL"].rstrip("/") + "/auth/v1/user"
    try:
        r = httpx.get(url, headers={"Authorization": f"Bearer {token}", "apikey": os.environ["SUPABASE_KEY"]},
                      timeout=TIMEOUT)
    except httpx.HTTPError:
        raise AuthError(503, "로그인 서버에 연결하지 못했어요. 잠시 뒤에 다시 해 주세요.")
    if r.status_code != 200 or not r.json().get("id"):
        raise AuthError(401, "로그인이 만료됐어요. 다시 로그인해 주세요.")
    return r.json()["id"]


def delete_login_account(supabase_id: str | None) -> str:
    """계정 삭제 때 Supabase 로그인 계정(Google·카카오로 만든 것)도 지운다.

    관리자 키 SUPABASE_SERVICE_ROLE_KEY가 서버 환경변수에 있어야 한다 (git에 올리지 않음, 앱에 넣지 않음).
    반환: deleted(지움) · not_linked(로그인 연결 없음) · not_configured(키가 없어 못 지움) · failed(Supabase 오류)
    """
    if not supabase_id:
        return "not_linked"
    url, key = os.environ.get("SUPABASE_URL"), os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
    if not url or not key:
        return "not_configured"
    try:
        r = httpx.delete(f"{url.rstrip('/')}/auth/v1/admin/users/{supabase_id}",
                         headers={"Authorization": f"Bearer {key}", "apikey": key}, timeout=TIMEOUT)
    except httpx.HTTPError:
        return "failed"
    return "deleted" if r.status_code in (200, 204, 404) else "failed"   # 404 = 이미 없음
