"""배포 시작 스크립트: 로그인 확인 없이 인터넷에 열리지 않게, 저장 위치는 디스크(/data)로."""
import importlib.util
from pathlib import Path

spec = importlib.util.spec_from_file_location("start", Path(__file__).resolve().parent.parent / "scripts" / "start.py")
start = importlib.util.module_from_spec(spec)
spec.loader.exec_module(start)

OK = {"SUPABASE_URL": "https://x.supabase.co", "SUPABASE_KEY": "publishable"}


def test_needs_supabase_and_required_auth():
    assert start.problems(OK) == []
    assert len(start.problems({})) == 2                                  # 둘 다 없음
    assert any("CAPSTONE_AUTH=dev" in p for p in start.problems({**OK, "CAPSTONE_AUTH": "dev"}))
    assert any("off" in p for p in start.problems({**OK, "CAPSTONE_AUTH": "off"}))
    assert start.problems({**OK, "CAPSTONE_AUTH": " Required "}) == []


def test_storage_on_data_disk():
    assert start.storage({}) == {"CAPSTONE_DB": str(Path("/data") / "app.db"), "CAPSTONE_UPLOADS": str(Path("/data") / "uploads")}
    assert start.storage({"DATA_DIR": "/mnt/x"})["CAPSTONE_DB"] == str(Path("/mnt/x") / "app.db")
    assert start.storage({"CAPSTONE_DB": "/a.db"})["CAPSTONE_DB"] == "/a.db"
