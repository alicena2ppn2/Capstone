"""휴대폰에서 접속할 수 있게 서버 띄우기 (같은 와이파이 시연용).

실행 (backend 폴더에서)
    python scripts/serve.py              # 0.0.0.0:8000
    python scripts/serve.py --port 8001

노트북의 와이파이 주소를 찾아 앱에 넣을 값(EXPO_PUBLIC_API_URL)을 보여 준 뒤 서버를 띄운다.
휴대폰과 노트북이 같은 와이파이여야 하고, 처음 실행하면 Windows 방화벽 허용 창이 뜰 수 있다 (개인 네트워크 허용).
"""

from __future__ import annotations

import argparse
import os
import socket
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent


def lan_ip() -> str | None:
    """바깥으로 나가는 연결에 쓰는 내 주소 (실제로 패킷을 보내지는 않음)."""
    s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    try:
        s.connect(("8.8.8.8", 80))
        return s.getsockname()[0]
    except OSError:
        return None
    finally:
        s.close()


def main():
    p = argparse.ArgumentParser(description="휴대폰에서 접속할 수 있게 서버 띄우기")
    p.add_argument("--port", type=int, default=8000)
    p.add_argument("--reload", action="store_true", help="코드를 고치면 서버 다시 시작 (개발용)")
    a = p.parse_args()

    os.chdir(ROOT)
    sys.path.insert(0, str(ROOT))
    import app  # noqa: F401  (backend/.env 읽기)

    ip = lan_ip()
    print("=" * 60)
    if ip:
        print(f"  휴대폰 앱 mobile/.env.local 에:  EXPO_PUBLIC_API_URL=http://{ip}:{a.port}")
        print(f"  휴대폰 브라우저로 확인:          http://{ip}:{a.port}/health")
    else:
        print("  와이파이 주소를 찾지 못했어요. 인터넷 연결을 확인해 주세요.")
    print(f"  API 문서:                        http://localhost:{a.port}/docs")
    supabase = "켜짐" if os.environ.get("SUPABASE_URL") and os.environ.get("SUPABASE_KEY") else "꺼짐 (개발·시연 모드)"
    print(f"  Supabase 토큰 확인:              {supabase}")
    print("=" * 60)

    import uvicorn
    uvicorn.run("app.main:app", host="0.0.0.0", port=a.port, reload=a.reload)


if __name__ == "__main__":
    main()
