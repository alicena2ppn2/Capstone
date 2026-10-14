import pytest
from fastapi.testclient import TestClient

from app import missions as ms
from app import survey as sv

DAY = "2026-10-14"


@pytest.fixture
def client(tmp_path, monkeypatch):
    monkeypatch.setenv("CAPSTONE_DB", str(tmp_path / "test.db"))
    monkeypatch.setenv("CAPSTONE_UPLOADS", str(tmp_path / "uploads"))
    from app.main import app
    with TestClient(app) as c:
        yield c


def new_user(client, nickname="모찌"):
    return client.post("/users", json={"nickname": nickname}).json()["id"]


def test_questions_list(client):
    qs = client.get("/survey/questions").json()["questions"]
    assert [q["id"] for q in qs] == ["occupation", "living", "pets", "outing", "interests", "routines"]
    assert "student" in [o["id"] for o in qs[0]["options"]]


def test_save_and_read_survey(client):
    uid = new_user(client)
    assert client.get(f"/users/{uid}/survey").json() == {"answers": {}, "done": False, "updated_at": None}
    body = {"answers": {"occupation": "not_working", "outing": "rarely", "interests": ["game", "music", "game"],
                        "pets": None, "routines": []}}
    r = client.put(f"/users/{uid}/survey", json=body)
    assert r.status_code == 200
    # 중복은 한 번, 건너뛴 질문은 저장하지 않음
    assert r.json()["answers"] == {"occupation": "not_working", "outing": "rarely", "interests": ["game", "music"]}
    got = client.get(f"/users/{uid}/survey").json()
    assert got["done"] and got["answers"]["occupation"] == "not_working"


@pytest.mark.parametrize("answers", [
    {"job": "student"},                                   # 없는 질문
    {"occupation": "ceo"},                                # 없는 답
    {"occupation": ["student"]},                          # 하나 고르기에 목록
    {"interests": "game"},                                # 여러 개 고르기에 글자 하나
    {"pets": ["dog", "none"]},                            # '없어요'와 같이
    {"interests": ["game", "video", "music", "reading", "drawing", "cooking"]},   # 5개 넘음
])
def test_bad_answers(client, answers):
    uid = new_user(client)
    assert client.put(f"/users/{uid}/survey", json={"answers": answers}).status_code == 422


def test_unknown_user(client):
    assert client.put("/users/nobody/survey", json={"answers": {}}).status_code == 404


def test_deleted_with_account(client):
    uid = new_user(client)
    client.put(f"/users/{uid}/survey", json={"answers": {"outing": "daily"}})
    client.delete(f"/users/{uid}")
    assert client.get(f"/users/{uid}/survey").json()["done"] is False


def test_outing_used_when_no_steps():
    """걸음 기록이 없는 날: 자주 나간다고 했으면 나간 날(움직이기 단계 그대로), 아니면 한 단계 낮게."""
    def move(often, steps=None):
        out = ms.pick_missions("u1", DAY, steps=steps, goes_out_often=often, stages={"move": 3})
        return next(m for m in out["missions"] if m["category"] == "outdoor")["stage"]
    assert move(True) == 3
    assert move(False) == 2
    assert move(None) == 2
    assert move(True, steps=300) == 2          # 걸음 기록이 있으면 걸음이 우선


def test_goes_out_often():
    assert sv.goes_out_often({"outing": "few_week"}) is True
    assert sv.goes_out_often({"outing": "rarely"}) is False
    assert sv.goes_out_often({}) is None and sv.goes_out_often(None) is None


def test_survey_answers_pick_matching_missions(client):
    uid = new_user(client)
    client.put(f"/users/{uid}/survey", json={"answers": {"living": "alone"}})
    for d in range(1, 29):
        ids = [m["id"] for m in client.get(f"/users/{uid}/missions/today", params={"date": f"2026-10-{d:02d}"}).json()["missions"]]
        assert "c1_family_meal" not in ids


def test_ladder_stage_up_through_api(client):
    """이어지기 1단계 미션을 3번 하면 2단계가 열리고, 완료 응답에 stage_up으로 알려 준다."""
    uid = new_user(client)
    assert client.get(f"/users/{uid}/ladder").json()["connect"]["stage"] == 1
    ups, d = [], 1
    while not ups:
        date = f"2026-10-{d:02d}"
        out = client.get(f"/users/{uid}/missions/today", params={"date": date}).json()
        assert out["ladder"]["connect"]["stage"] == 1
        connect = next(m for m in out["missions"] if m["category"] == "connect")
        assert connect["stage"] == 1
        r = client.post(f"/users/{uid}/missions/{connect['id']}/complete", params={"date": date},
                        json={"text": "방명록에 고양이 이야기가 좋았어요"}).json()
        ups = r["stage_up"]
        d += 1
    assert d - 1 == ms.STAGE_UP_COUNT and ups == ["connect"]
    assert r["ladder"]["connect"] == {"stage": 2, "name": "한 명", "done": 0, "need": 3, "top": False}
    nxt = client.get(f"/users/{uid}/missions/today", params={"date": f"2026-10-{d:02d}"}).json()
    assert next(m for m in nxt["missions"] if m["category"] == "connect")["stage"] == 2
