from datetime import date

from scripts import seed_demo


def test_seed_builds_recovery_story(tmp_path, monkeypatch):
    monkeypatch.setenv("CAPSTONE_DB", str(tmp_path / "demo.db"))
    monkeypatch.setenv("CAPSTONE_UPLOADS", str(tmp_path / "uploads"))
    r = seed_demo.seed(date(2026, 10, 22), days=21)

    assert r["hero"]["id"] == "demo-mochi"
    assert r["hero"]["level"]["level"] >= 10
    assert r["coins"] > 0
    assert "potato" in r["owned_characters"] and "pink" in r["owned_characters"]
    assert r["diaries"] >= 10
    assert r["guestbook"] >= 5
    assert len(r["today_missions"]) >= 8                    # 오늘 미션은 정해만 두고 수행 안 함

    # 다시 돌려도 같은 결과 (데모 사용자만 지우고 다시 만든다)
    again = seed_demo.seed(date(2026, 10, 22), days=21)
    assert again["coins"] == r["coins"]
    assert again["hero"]["level"] == r["hero"]["level"]


def test_png_is_valid():
    data = seed_demo.png((1, 2, 3), size=4)
    assert data.startswith(b"\x89PNG\r\n\x1a\n") and data.endswith(b"IEND\xaeB`\x82")
