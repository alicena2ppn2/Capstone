"""미션 소감, Supabase 로그인 연결."""

import httpx
import pytest

from tests.test_api import client, submission_for  # noqa: F401  (client는 fixture)

DAY = "2026-10-14"


def done_mission(client, user="u1"):
    """오늘 미션 중 이어지기 미션(사진) 하나를 끝내고 그 미션을 돌려준다."""
    missions = client.get(f"/users/{user}/missions/today", params={"date": DAY}).json()["missions"]
    m = next(m for m in missions if m["category"] == "connect")
    r = client.post(f"/users/{user}/missions/{m['id']}/complete", params={"date": DAY}, json=submission_for(m, client, user))
    assert r.status_code == 200
    return m


# --- 미션 소감 ---------------------------------------------------------------------

def test_feedback_write_and_edit(client):
    m = done_mission(client)
    url = f"/users/u1/missions/{m['id']}/feedback"
    before = client.get("/users/u1/coins").json()["coins"]
    r = client.put(url, params={"date": DAY}, json={"mood": 4, "text": "  생각보다 괜찮았어요 "})
    assert r.status_code == 200
    assert (r.json()["mood"], r.json()["text"], r.json()["care"]) == (4, "생각보다 괜찮았어요", None)
    assert client.get("/users/u1/coins").json()["coins"] == before          # 보상 없음
    # 다시 쓰면 고침
    client.put(url, params={"date": DAY}, json={"mood": 5})
    rows = client.get("/users/u1/feedback", params={"from": DAY, "to": DAY}).json()["feedback"]
    assert len(rows) == 1 and (rows[0]["mood"], rows[0]["text"], rows[0]["title"]) == (5, None, m["title"])
    # 오늘의 미션에 소감 썼는지 표시
    today = client.get("/users/u1/missions/today", params={"date": DAY}).json()["missions"]
    assert next(x for x in today if x["id"] == m["id"])["feedback"] is True
    assert not any(x["feedback"] for x in today if x["id"] != m["id"])


def test_feedback_only_for_done_missions(client):
    missions = client.get("/users/u1/missions/today", params={"date": DAY}).json()["missions"]
    m = next(m for m in missions if m["category"] == "connect")
    r = client.put(f"/users/u1/missions/{m['id']}/feedback", params={"date": DAY}, json={"mood": 3})
    assert r.status_code == 404


@pytest.mark.parametrize("body", [{}, {"text": "   "}, {"mood": 0}, {"mood": 6}, {"text": "가" * 201}, {"expected": 9}])
def test_feedback_bad_input(client, body):
    m = done_mission(client)
    assert client.put(f"/users/u1/missions/{m['id']}/feedback", params={"date": DAY}, json=body).status_code == 422


def test_feedback_crisis_text_gets_care(client):
    m = done_mission(client)
    r = client.put(f"/users/u1/missions/{m['id']}/feedback", params={"date": DAY}, json={"text": "죽고 싶다"})
    assert r.status_code == 200
    assert r.json()["care"] is not None


def test_feedback_stats_admin_only(client, monkeypatch):
    m = done_mission(client)
    client.put(f"/users/u1/missions/{m['id']}/feedback", params={"date": DAY}, json={"mood": 2})
    assert client.get("/admin/feedback/stats").status_code == 404           # 관리자 기능 꺼짐
    monkeypatch.setenv("ADMIN_TOKEN", "secret")
    assert client.get("/admin/feedback/stats", headers={"X-Admin-Token": "nope"}).status_code == 403
    rows = client.get("/admin/feedback/stats", headers={"X-Admin-Token": "secret"}).json()["missions"]
    assert rows == [{"mission_id": m["id"], "n": 1, "rated": 1, "avg_mood": 2.0, "title": m["title"]}]


def test_feedback_deleted_with_account(client):
    uid = client.post("/users", json={"nickname": "소감"}).json()["id"]
    m = done_mission(client, uid)
    client.put(f"/users/{uid}/missions/{m['id']}/feedback", params={"date": DAY}, json={"mood": 3})
    client.delete(f"/users/{uid}")
    assert client.get(f"/users/{uid}/feedback", params={"from": DAY, "to": DAY}).json()["feedback"] == []


# --- Supabase 로그인 연결 -----------------------------------------------------------

def test_supabase_dev_mode_first_login_then_again(client, monkeypatch):
    monkeypatch.delenv("SUPABASE_URL", raising=False)
    r = client.post("/auth/supabase", json={"supabase_id": "sb-1"})
    assert r.status_code == 404                                               # 처음 → 닉네임 화면
    r = client.post("/auth/supabase", json={"supabase_id": "sb-1", "nickname": "모찌"})
    assert r.status_code == 201 and r.json()["created"] is True
    uid = r.json()["user"]["id"]
    r = client.post("/auth/supabase", json={"supabase_id": "sb-1", "nickname": "다른이름"})
    assert r.status_code == 200 and r.json()["created"] is False and r.json()["user"]["id"] == uid
    assert r.json()["user"]["nickname"] == "모찌"                           # 이미 있으면 닉네임 안 바뀜
    assert client.post("/auth/supabase", json={}).status_code == 422


def test_supabase_nickname_rules_apply(client):
    client.post("/users", json={"nickname": "모찌"})
    assert client.post("/auth/supabase", json={"supabase_id": "sb-2", "nickname": "모 찌"}).status_code == 409
    assert client.post("/auth/supabase", json={"supabase_id": "sb-2", "nickname": "가"}).status_code == 422
    assert client.post("/auth/supabase", json={"supabase_id": "sb-2"}).status_code == 404   # 실패하면 연결도 안 됨


class FakeResponse:
    def __init__(self, status, body):
        self.status_code, self._body = status, body

    def json(self):
        return self._body


def test_supabase_verified_mode(client, monkeypatch):
    monkeypatch.setenv("SUPABASE_URL", "https://example.supabase.co")
    monkeypatch.setenv("SUPABASE_KEY", "pk")
    calls = []

    def fake_get(url, headers, timeout):
        calls.append((url, headers))
        if headers["Authorization"] == "Bearer good":
            return FakeResponse(200, {"id": "sb-real"})
        return FakeResponse(401, {"msg": "bad jwt"})

    monkeypatch.setattr(httpx, "get", fake_get)
    # 토큰이 없으면 401, 본문의 supabase_id는 믿지 않음
    assert client.post("/auth/supabase", json={"supabase_id": "sb-real", "nickname": "모찌"}).status_code == 401
    assert client.post("/auth/supabase", headers={"Authorization": "Bearer bad"},
                       json={"nickname": "모찌"}).status_code == 401
    r = client.post("/auth/supabase", headers={"Authorization": "Bearer good"},
                    json={"supabase_id": "someone-else", "nickname": "모찌"})
    assert r.status_code == 201
    assert calls[-1] == ("https://example.supabase.co/auth/v1/user", {"Authorization": "Bearer good", "apikey": "pk"})
    # 토큰 안의 id로 연결됐는지: 개발 모드로 sb-real을 물어보면 같은 사용자
    monkeypatch.delenv("SUPABASE_URL")
    assert client.post("/auth/supabase", json={"supabase_id": "sb-real"}).json()["user"]["id"] == r.json()["user"]["id"]


def test_supabase_server_down(client, monkeypatch):
    monkeypatch.setenv("SUPABASE_URL", "https://example.supabase.co")
    monkeypatch.setenv("SUPABASE_KEY", "pk")

    def boom(*a, **k):
        raise httpx.ConnectError("down")

    monkeypatch.setattr(httpx, "get", boom)
    assert client.post("/auth/supabase", headers={"Authorization": "Bearer good"}, json={}).status_code == 503
