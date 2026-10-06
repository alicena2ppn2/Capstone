"""사진 파일에서 촬영 일시(EXIF) 읽기.

휴대폰 사진에는 보통 촬영 일시가 들어 있다. 없을 수도 있다 (스크린샷, 메신저로 받은 사진, 편집 앱 등).
EXIF 시각에는 시간대가 없어서 촬영한 곳의 현지 시각으로 본다 (한국 사용자 → 서울 시각).
iPhone HEIC 사진은 pillow-heif가 있으면 읽는다.
"""

from __future__ import annotations

import io
from datetime import datetime

from PIL import Image

try:  # iPhone HEIC
    from pillow_heif import register_heif_opener

    register_heif_opener()
except ImportError:  # pragma: no cover - 없으면 HEIC만 촬영 일시를 못 읽음
    pass

EXIF_IFD = 0x8769
DATETIME_ORIGINAL = 36867   # 찍은 시각
DATETIME_DIGITIZED = 36868
DATETIME = 306              # 파일이 바뀐 시각 (마지막 수단)


def taken_at(data: bytes) -> str | None:
    """촬영 일시를 'YYYY-MM-DDTHH:MM:SS'로. 읽을 수 없으면 None."""
    try:
        exif = Image.open(io.BytesIO(data)).getexif()
    except Exception:
        return None
    sub = exif.get_ifd(EXIF_IFD) if exif else {}
    for raw in (sub.get(DATETIME_ORIGINAL), sub.get(DATETIME_DIGITIZED), exif.get(DATETIME) if exif else None):
        if not raw:
            continue
        try:
            return datetime.strptime(str(raw).strip("\x00 ")[:19], "%Y:%m:%d %H:%M:%S").isoformat()
        except ValueError:
            continue
    return None
