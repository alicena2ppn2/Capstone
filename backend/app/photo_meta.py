"""사진 파일에서 촬영 일시(EXIF) 읽기.

휴대폰 사진에는 보통 촬영 일시가 들어 있다. 없을 수도 있다 (스크린샷, 메신저로 받은 사진, 편집 앱 등).
EXIF 시각에는 시간대가 없어서 촬영한 곳의 현지 시각으로 본다 (한국 사용자 → 서울 시각).
iPhone HEIC 사진은 pillow-heif가 있으면 읽는다.
"""

from __future__ import annotations

import io
from datetime import datetime, timedelta, timezone

from PIL import Image, ImageOps

try:  # iPhone HEIC
    from pillow_heif import register_heif_opener

    register_heif_opener()
except ImportError:  # pragma: no cover - 없으면 HEIC만 촬영 일시를 못 읽음
    pass

EXIF_IFD = 0x8769
DATETIME_ORIGINAL = 36867   # 찍은 시각
DATETIME_DIGITIZED = 36868
DATETIME = 306              # 파일이 바뀐 시각 (마지막 수단)


KST = timezone(timedelta(hours=9))


def parse_client_taken(value: str | None) -> str | None:
    """앱이 따로 보낸 촬영 일시 (expo-image-picker의 exif.DateTimeOriginal 등) → 'YYYY-MM-DDTHH:MM:SS'.

    앱에서 고른 사진 파일은 EXIF가 빠질 때가 있어서(iOS 등) 파일에서 못 읽으면 이 값을 쓴다.
    'YYYY:MM:DD HH:MM:SS'(EXIF 형식) 또는 ISO. 시간대가 있으면 서울 시각으로 바꾼다. 못 읽으면 None.
    """
    text = (value or "").strip()
    if not text:
        return None
    try:
        when = datetime.strptime(text[:19], "%Y:%m:%d %H:%M:%S")
    except ValueError:
        try:
            when = datetime.fromisoformat(text.replace("Z", "+00:00"))
        except ValueError:
            return None
    if when.tzinfo is not None:
        when = when.astimezone(KST).replace(tzinfo=None)
    return when.replace(microsecond=0).isoformat()


MAX_SIDE = 1280            # 긴 변이 이보다 크면 줄여서 저장 (10/21: 2048 → 1280, 휴대폰 화면엔 충분하고 저장 용량은 절반 아래)
SAVE_AS = {"image/png": ("PNG", ".png", "image/png"), "image/webp": ("WEBP", ".webp", "image/webp")}   # 나머지(jpeg·heic)는 JPEG


def clean_image(data: bytes, content_type: str) -> tuple[bytes, str, str] | None:
    """사진에서 위치(GPS)·기기 정보 같은 메타데이터를 모두 지우고 다시 저장한다 → (바이트, 확장자, content_type).

    - 촬영 일시는 이 함수보다 먼저 taken_at()으로 읽어 DB에 따로 둔다
    - 회전 정보는 그림에 반영(exif_transpose)한 뒤 지운다 → 메타데이터 없이도 바르게 보임
    - iPhone HEIC는 브라우저에서 안 보이므로 JPEG로 바꾼다
    - 열 수 없는 파일이면 None (사진이 아님)
    """
    try:
        image = Image.open(io.BytesIO(data))
        image.load()
    except Exception:
        return None
    image = ImageOps.exif_transpose(image)
    if max(image.size) > MAX_SIDE:
        image.thumbnail((MAX_SIDE, MAX_SIDE))
    fmt, ext, mime = SAVE_AS.get(content_type, ("JPEG", ".jpg", "image/jpeg"))
    if fmt == "JPEG" and image.mode not in ("RGB", "L"):
        image = image.convert("RGB")
    out = io.BytesIO()
    # exif·icc·xmp 등을 넘기지 않으므로 메타데이터 없이 저장된다
    image.save(out, fmt, **({"quality": 88, "optimize": True} if fmt == "JPEG" else {}))
    return out.getvalue(), ext, mime


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
