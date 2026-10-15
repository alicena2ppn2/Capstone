import pytest

from app import crisis
from tests.test_api import DAY, client  # noqa: F401  (client는 fixture)


@pytest.mark.parametrize("text, level", [
    ("요즘 너무 힘들어서 죽고 싶어", "high"),
    ("죽고싶다...", "high"),                              # 띄어쓰기·문장부호 무시
    ("다 사라지고 싶다", "high"),
    ("더 이상 살아갈 이유가 없어", "high"),
    ("내가 없어지는 게 낫겠어", "high"),
    ("나는 쓸모없는 사람 같아", "medium"),
    ("희망이 없어", "medium"),
    ("세상에 내 편은 없는 것 같아", "medium"),
    ("요즘 잠을 못 자", "low"),
    ("항상 혼자고 아무것도 하기 싫어", "low"),
    ("절대 안 해 항상 그래", "low"),                       # 절대주의 단어 2개
    ("항상 고마워", None),                                 # 절대주의 단어 1개는 신호 아님
    ("배고파 죽겠다 ㅋㅋ", None),                          # '죽겠다' 강조 표현
    ("웃겨 죽겠네", None),
    ("자살예방 교육을 들었다", None),
    ("비싼 돈 주고 살 이유가 없네", None),                 # 살다 ≠ 사다
    ("그 영화 진짜 끝내준다", None),                       # 끝내주다 = 최고다
    ("막대기 하나만 없으면 신 자가 된다", None),            # "하나만 없으면" ≠ "나만 없으면"
    ("나만 없으면 다들 편할 텐데", "high"),
    ("오늘 산책하고 빵 사 왔다", None),
])
def test_assess_levels(text, level):
    assert crisis.assess(text).level == level


def test_high_wins_and_longest_match_first():
    a = crisis.assess("쓸모없어. 그냥 죽어버리고 싶어")
    assert a.level == "high"
    terms = [m["term"] for m in a.matches]
    assert "죽어버리고싶" in terms and "죽고싶" not in terms


def test_care_messages():
    high = crisis.assess("죽고 싶어").care()
    assert high["type"] == "support"
    assert {"name": "자살예방 상담전화", "number": "109", "hours": "24시간"} in high["contacts"]
    assert crisis.assess("희망이 없어").care()["type"] == "check_in"
    assert crisis.assess("잠을 못 자").care() is None          # low는 사용자에게 안 보임
    assert crisis.assess("좋은 하루").care() is None


def test_lexicon_has_sources_and_no_duplicates():
    lex = crisis.load_lexicon()
    assert len(lex["terms"]) >= 80
    assert {t["severity"] for t in lex["terms"]} == {"high", "medium", "low"}
    assert all(t["source"] in lex["sources"] for t in lex["terms"])


def test_diary_high_shows_support_and_records_without_text(client, monkeypatch):
    r = client.put(f"/users/u1/diary/{DAY}", json={"text": "오늘은 정말 죽고 싶었다"}).json()
    assert r["care"]["type"] == "support"
    assert any(c["number"] == "109" for c in r["care"]["contacts"])
    assert "matches" not in r["care"] and "죽고" not in str(r["care"])   # 어떤 단어가 걸렸는지 안 알림

    monkeypatch.setenv("ADMIN_TOKEN", "secret")
    sig = client.get("/admin/users/u1/signals", params={"from": DAY, "to": DAY},
                     headers={"X-Admin-Token": "secret"}).json()["signals"]
    assert len(sig) == 1 and sig[0]["level"] == "high" and sig[0]["categories"] == ["death_wish"]
    assert "text" not in sig[0]                                           # 글 내용은 저장 안 함


def test_diary_medium_check_in_and_home_bubble(client):
    r = client.put(f"/users/u1/diary/{DAY}", json={"text": "나는 쓸모없는 사람 같아"}).json()
    assert r["care"] == {"type": "check_in", "message": crisis.CHECK_IN_MESSAGE}
    assert client.get("/users/u1/home", params={"date": DAY}).json()["bubble"] == crisis.CHECK_IN_MESSAGE


def test_normal_and_low_show_nothing(client):
    assert client.put(f"/users/u1/diary/{DAY}", json={"text": "오늘 산책했다"}).json()["care"] is None
    assert client.put("/users/u1/diary/2026-10-03", json={"text": "요즘 잠을 못 자"}).json()["care"] is None


def test_text_mission_is_screened(client):
    # 10/15부터 매일 미션은 사진·걸음뿐이라 글 미션(기록)을 그날 미션으로 직접 넣고 확인 (글은 일기·소감에서도 확인)
    from app import db
    from app import missions as ms
    from app.main import app
    m = ms.CATALOG["good_moment"].to_dict()
    db.save_mission_day(app.state.conn, "u1", {"date": DAY, "stayed_home": None, "missions": [m]})
    r = client.post(f"/users/u1/missions/{m['id']}/complete", params={"date": DAY}, json={"text": "다 포기하고 싶어"}).json()
    assert r["care"]["type"] == "check_in"


def test_admin_signals_locked(client, monkeypatch):
    monkeypatch.delenv("ADMIN_TOKEN", raising=False)
    assert client.get("/admin/users/u1/signals", params={"from": DAY, "to": DAY}).status_code == 404
    monkeypatch.setenv("ADMIN_TOKEN", "secret")
    assert client.get("/admin/users/u1/signals", params={"from": DAY, "to": DAY},
                      headers={"X-Admin-Token": "wrong"}).status_code == 403


def test_crisis_terms_in_db(client):
    from app.main import app
    n = app.state.conn.execute("SELECT COUNT(*) FROM crisis_terms").fetchone()[0]
    assert n == len(crisis.LEXICON["terms"])


def test_kote_parse():
    from scripts import import_kote
    rows = import_kote.parse("39087\t톰행크스 좋아\t2,13\nbad line\n")
    assert rows == [(39087, "톰행크스 좋아", ["감동/감탄", "뿌듯함"])]
