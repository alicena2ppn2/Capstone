"""모든 API의 로그인 확인 (app/access.py): 토큰 주인만 자기 정보를 보고 바꾼다."""

import pytest

from app import access, auth
from tests.test_api import client  # noqa: F401  (client는 fixture)

DAY = "2026-10-16"


@pytest.fixture
def secured(client, monkeypatch):
    """Supabase 확인을 켠 서버. 토큰 'tok-a' → Supabase 사용자 'sb-a' (실제 Supabase 대신 가짜 확인)."""
    monkeypatch.setenv("SUPABASE_URL", "https://example.supabase.co")
    monkeypatch.setenv("SUPABASE_KEY", "pk")
    monkeypatch.delenv("CAPSTONE_AUTH", raising=False)

    def fake(authorization, claimed):
        scheme, _, token = (authorization or "").partition(" ")
        if scheme.lower() != "bearer" or not token.startswith("tok-"):
            raise auth.AuthError(401, "로그인이 만료됐어요. 다시 로그인해 주세요.")
        return "sb-" + token[4:]

    monkeypatch.setattr(auth, "supabase_user_id", fake)
    access._cache.clear()
    ids = {}
    for name, nickname in (("a", "에이"), ("b", "비이")):
        r = client.post("/auth/supabase", json={"nickname": nickname}, headers=H(name))
        assert r.status_code == 201, r.text
        ids[name] = r.json()["user"]["id"]
    return ids


def H(name):
    return {"Authorization": f"Bearer tok-{name}"}


def test_off_without_supabase(client):
    assert access.mode() == "off"
    assert client.post("/users", json={"nickname": "그냥"}).status_code == 201    # 테스트·처음 개발은 그대로


def test_own_data_needs_own_token(client, secured):
    a, b = secured["a"], secured["b"]
    assert client.get(f"/users/{a}/coins").status_code == 401                          # 토큰 없음
    assert client.get(f"/users/{a}/coins", headers={"Authorization": "Bearer nope"}).status_code == 401
    assert client.get(f"/users/{a}/coins", headers=H("a")).status_code == 200
    assert client.get(f"/users/{a}/coins", headers=H("b")).status_code == 403          # 남의 코인
    assert client.put(f"/users/{a}/diary/{DAY}", json={"text": "몰래"}, headers=H("b")).status_code == 403
    assert client.post(f"/users/{a}/attendance", headers=H("b")).status_code == 403
    assert client.post(f"/users/{b}/attendance", headers=H("b")).status_code == 200


def test_unlinked_token_and_signup_blocked(client, secured):
    assert client.get(f"/users/{secured['a']}/coins", headers=H("zzz")).status_code == 403   # 게임 계정 연결 전
    assert client.post("/users", json={"nickname": "새치기"}, headers=H("a")).status_code == 403
    assert client.post("/users", json={"nickname": "새치기"}).status_code == 401


def test_public_pages_stay_open(client, secured):
    a = secured["a"]
    for url in ("/health", "/survey/questions", f"/users/{a}/room", f"/users/{a}/guestbook"):
        assert client.get(url).status_code == 200, url
    assert client.get("/nicknames/check", params={"nickname": "새이름"}).status_code == 200


def test_actions_in_someone_elses_room(client, secured):
    a, b = secured["a"], secured["b"]
    # b가 a 방에 놀러 감: 하는 사람은 토큰 주인이어야 함
    assert client.post(f"/users/{a}/visits", json={"visitor_id": b}, headers=H("b")).status_code == 200
    assert client.post(f"/users/{a}/visits", json={"visitor_id": a}, headers=H("b")).status_code == 403
    # 방명록: author_id를 비워도 토큰 주인으로 채움 (익명·사칭 불가)
    r = client.post(f"/users/{a}/guestbook", json={"text": "놀러 왔어요"}, headers=H("b"))
    assert r.status_code == 200 and r.json()["entry"]["author_id"] == b, r.text
    entry = r.json()["entry"]["id"]
    assert client.post(f"/users/{a}/guestbook", json={"text": "사칭", "author_id": a}, headers=H("b")).status_code == 403
    # 좋아요·취소·지우기·신고
    assert client.post(f"/users/{a}/guestbook/{entry}/like", json={"user_id": a}, headers=H("b")).status_code == 403   # 남 이름으로 좋아요
    assert client.post(f"/users/{a}/guestbook/{entry}/like", json={"user_id": a}, headers=H("a")).status_code == 200
    assert client.delete(f"/users/{a}/guestbook/{entry}/like", params={"by": a}, headers=H("b")).status_code == 403
    assert client.post("/reports", json={"reporter_id": a, "target_type": "guestbook", "target_id": str(entry), "reason": "spam"},
                       headers=H("b")).status_code == 403
    assert client.delete(f"/users/{a}/guestbook/{entry}", params={"by": b}, headers=H("b")).status_code == 200   # 쓴 사람은 지울 수 있음


def test_dev_mode_allows_no_token_but_checks_tokens(client, secured, monkeypatch):
    monkeypatch.setenv("CAPSTONE_AUTH", "dev")
    a = secured["a"]
    assert client.get(f"/users/{a}/coins").status_code == 200                # 시연 계정으로 개발할 때
    assert client.get(f"/users/{a}/coins", headers=H("b")).status_code == 403


NEAR_PLAZA = {"latitude": 37.5658, "longitude": 126.978056, "accuracy_m": 10}   # 서울광장 앞 (쪽지는 근처에서만, 10/19)


def test_place_notes_need_token_but_reading_is_open(client, secured):
    a, b = secured["a"], secured["b"]
    assert client.get("/places").status_code == 200 and client.get("/places/seoul-plaza/notes").status_code == 200
    assert client.post("/places/seoul-plaza/notes", json={"text": "안녕"}).status_code == 401
    r = client.post("/places/seoul-plaza/notes", json={"text": "안녕", **NEAR_PLAZA}, headers=H("a"))
    assert r.status_code == 201 and r.json()["note"]["author_id"] == a                        # 쓴 사람 = 토큰 주인
    assert client.post("/places/seoul-plaza/notes", json={"text": "사칭", "author_id": a}, headers=H("b")).status_code == 403
    nid = r.json()["note"]["id"]
    assert client.delete(f"/places/seoul-plaza/notes/{nid}", params={"by": a}, headers=H("b")).status_code == 403
    assert client.delete(f"/places/seoul-plaza/notes/{nid}", params={"by": a}, headers=H("a")).status_code == 200
