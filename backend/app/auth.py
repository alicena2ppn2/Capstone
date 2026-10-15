"""Supabase 로그인 연결.

앱은 Supabase로 로그인하고(프론트), 서버는 그 Supabase 사용자를 서버 사용자(id)와 이어 준다.

- 환경변수 SUPABASE_URL·SUPABASE_KEY가 있으면: 앱이 보낸 로그인 토큰(Authorization: Bearer)을
  Supabase에 물어봐서 진짜인지 확인하고, 토큰 안의 사용자 id만 쓴다. (서명 방식과 상관없이 동작)
- 없으면(개발·시연 모드): 요청 본문의 supabase_id를 그대로 믿는다. 출시 전에는 꼭 환경변수를 넣어야 한다.

지금은 이 연결 API에서만 토큰을 확인한다. 다른 API는 여전히 서버 id로 동작 (DATABASE.md "로그인 연결 계획").
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
