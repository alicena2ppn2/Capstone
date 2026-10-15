"""이미 올라온 사진에서 위치(GPS)·기기 정보 지우기 (한 번만 돌리면 됨, 10/15).

10/15부터는 올릴 때 지운다 (app/photo_meta.clean_image). 그 전에 저장된 사진을 같은 방식으로 다시 저장한다.
촬영 일시는 이미 DB에 있으므로 그대로 둔다. HEIC는 JPEG로 바뀌고 DB의 파일 이름·형식도 고친다.

실행 (backend 폴더에서)
    python scripts/strip_photo_metadata.py           # 고칠 사진 수만 보여 줌
    python scripts/strip_photo_metadata.py --apply   # 실제로 고침
"""

from __future__ import annotations

import argparse
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from PIL import Image  # noqa: E402

from app import db, photo_meta  # noqa: E402
from app.main import upload_dir  # noqa: E402


def has_metadata(path: Path) -> bool:
    try:
        with Image.open(path) as img:
            return bool(img.getexif()) or bool(img.info.get("exif")) or path.suffix.lower() in (".heic", ".heif")
    except Exception:
        return False


def main():
    p = argparse.ArgumentParser(description="저장된 사진의 위치·기기 정보 지우기")
    p.add_argument("--apply", action="store_true", help="실제로 고친다 (없으면 개수만)")
    a = p.parse_args()
    conn = db.connect()
    rows = conn.execute("SELECT id, filename, content_type FROM photos").fetchall()
    todo = [r for r in rows if (upload_dir() / r["filename"]).is_file() and has_metadata(upload_dir() / r["filename"])]
    print(f"사진 {len(rows)}장 중 메타데이터가 남은 사진 {len(todo)}장")
    if not a.apply:
        print("고치려면 --apply")
        return
    fixed = 0
    for r in todo:
        old = upload_dir() / r["filename"]
        cleaned = photo_meta.clean_image(old.read_bytes(), r["content_type"])
        if cleaned is None:
            print(f"  건너뜀 (열 수 없음): {r['id']}")
            continue
        data, ext, mime = cleaned
        new = upload_dir() / (r["id"] + ext)
        new.write_bytes(data)
        if new != old:
            old.unlink(missing_ok=True)
        conn.execute("UPDATE photos SET filename = ?, content_type = ? WHERE id = ?", (new.name, mime, r["id"]))
        fixed += 1
    conn.commit()
    print(f"고친 사진 {fixed}장")


if __name__ == "__main__":
    main()
