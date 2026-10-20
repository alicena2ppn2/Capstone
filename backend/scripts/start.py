"""인터넷에 배포한 서버 시작 (Railway·Render 공통, Dockerfile의 CMD).

실행 (backend 폴더에서)
    python scripts/start.py

하는 일
1. 저장 위치: DATA_DIR(기본 /data, 플랫폼의 '지워지지 않는 디스크'를 여기에 연결)에
   DB(app.db)와 사진(uploads/)을 둔다. CAPSTONE_DB·CAPSTONE_UPLOADS를 직접 주면 그 값을 쓴다.
2. 안전 확인: 로그인 확인이 꺼진 채(Supabase 설정 없음, CAPSTONE_AUTH가 required가 아님)로는
   켜지지 않는다. 인터넷에 열린 서버에서 아무나 남의 일기·사진을 보지 못하게 (access.py mode()).
3. 플랫폼이 주는 PORT로 0.0.0.0에서 uvicorn을 띄운다.
"""

from __future__ import annotations

import os
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent

REQUIRED = ("SUPABASE_URL", "SUPABASE_KEY")


def problems(env: dict[str, str]) -> list[str]:
    """배포 전에 고쳐야 할 설정. 비어 있으면 시작해도 된다."""
    out = [f"{name}가 없어요 (Supabase 프로젝트 설정 → API)" for name in REQUIRED if not env.get(name)]
    auth = (env.get("CAPSTONE_AUTH") or "required").strip().lower()
    if auth != "required":
        out.append(f"CAPSTONE_AUTH={auth} 는 개발용이에요. 배포에서는 빼거나 required로 두세요")
    return out


def storage(env: dict[str, str]) -> dict[str, str]:
    """DB·사진 위치. 직접 준 값이 먼저, 없으면 DATA_DIR 아래."""
    data = Path(env.get("DATA_DIR") or "/data")
    return {
        "CAPSTONE_DB": env.get("CAPSTONE_DB") or str(data / "app.db"),
        "CAPSTONE_UPLOADS": env.get("CAPSTONE_UPLOADS") or str(data / "uploads"),
    }


def main() -> None:
    env = dict(os.environ)
    bad = problems(env)
    if bad:
        print("서버를 켜지 않았어요. 배포 설정을 확인해 주세요:", *[f"  - {p}" for p in bad], sep="\n", file=sys.stderr)
        sys.exit(1)
    paths = storage(env)
    Path(paths["CAPSTONE_DB"]).parent.mkdir(parents=True, exist_ok=True)
    Path(paths["CAPSTONE_UPLOADS"]).mkdir(parents=True, exist_ok=True)
    os.environ.update(paths)
    os.environ["CAPSTONE_NO_DOTENV"] = "1"     # 배포 서버는 플랫폼 환경변수만 쓴다 (.env 파일 없음)
    port = int(env.get("PORT") or 8000)
    print(f"MY MOCHI 서버 시작: 포트 {port}, DB {paths['CAPSTONE_DB']}, 사진 {paths['CAPSTONE_UPLOADS']}", flush=True)
    os.chdir(ROOT)
    sys.path.insert(0, str(ROOT))              # scripts/ 에서 실행해도 app 패키지를 찾게
    import uvicorn
    uvicorn.run("app.main:app", host="0.0.0.0", port=port, proxy_headers=True, forwarded_allow_ips="*")


if __name__ == "__main__":
    main()
