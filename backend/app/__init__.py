"""backend/.env 가 있으면 환경변수로 읽는다 (이미 있는 환경변수는 그대로 둠).

Supabase 주소·키, 관리자 토큰처럼 서버마다 다른 값을 파일 하나에 두기 위해. 예시는 .env.example.
테스트에서는 읽지 않는다 (tests/conftest.py가 CAPSTONE_NO_DOTENV=1).
"""

import os
from pathlib import Path


def load_dotenv(path: Path = Path(__file__).resolve().parent.parent / ".env") -> None:
    if os.environ.get("CAPSTONE_NO_DOTENV") or not path.is_file():
        return
    for line in path.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, _, value = line.partition("=")
        os.environ.setdefault(key.strip(), value.strip().strip('"').strip("'"))


load_dotenv()
