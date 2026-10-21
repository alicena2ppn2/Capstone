"""SQLite 저장소.

발표용 MVP라 ORM 없이 표준 라이브러리 sqlite3만 쓴다.
DB 파일 경로는 환경변수 CAPSTONE_DB (기본: backend/app.db).
"""

from __future__ import annotations

import json
import os
import sqlite3
from pathlib import Path

DEFAULT_PATH = Path(__file__).resolve().parent.parent / "app.db"

SCHEMA = """
CREATE TABLE IF NOT EXISTS users (
    id             TEXT PRIMARY KEY,      -- 서버가 만든 id (앱이 저장해 두고 모든 API에 사용)
    nickname       TEXT NOT NULL,
    nickname_key   TEXT NOT NULL UNIQUE,  -- 중복 확인용 (소문자, 공백 제거)
    game_center_id TEXT UNIQUE,           -- 나중에 iPhone Game Center 연결용
    created_at     TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at     TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS inventory (
    user_id     TEXT NOT NULL,
    item_type   TEXT NOT NULL,            -- character | outfit | decor
    item_id     TEXT NOT NULL,
    how         TEXT NOT NULL,            -- bought | starter | milestone | quest
    acquired_at TEXT NOT NULL DEFAULT (datetime('now')),
    PRIMARY KEY (user_id, item_type, item_id)
);
CREATE TABLE IF NOT EXISTS decor_placement (
    user_id TEXT NOT NULL,
    slot    TEXT NOT NULL,                -- wallpaper | floor | sofa | drawer | curtain | lamp | carpet | frame | doll | scenery
    item_id TEXT NOT NULL,
    dx      REAL NOT NULL DEFAULT 0,      -- 끌어서 옮긴 거리 (방 그림 좌표, 기본 자리에서)
    dy      REAL NOT NULL DEFAULT 0,
    PRIMARY KEY (user_id, slot)
);
CREATE TABLE IF NOT EXISTS equipped (
    user_id      TEXT PRIMARY KEY,
    character_id TEXT,
    outfit_id    TEXT
);
CREATE TABLE IF NOT EXISTS crisis_terms (     -- 위기 표현 목록 (app/data/crisis_lexicon.json을 서버 시작 때 그대로 옮김)
    term     TEXT PRIMARY KEY,
    category TEXT NOT NULL,
    severity TEXT NOT NULL,                     -- high | medium | low
    source   TEXT NOT NULL,
    note     TEXT
);
CREATE TABLE IF NOT EXISTS crisis_signals (     -- 사용자 글에서 찾은 신호. 글 내용은 저장하지 않음
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id    TEXT NOT NULL,
    date       TEXT NOT NULL,
    source     TEXT NOT NULL,                   -- diary | mission:<id>
    level      TEXT NOT NULL,
    categories TEXT NOT NULL,                   -- JSON
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS kote_comments (      -- KOTE 한국어 감정 댓글 (MIT). scripts/import_kote.py로 넣음
    id     INTEGER PRIMARY KEY,
    text   TEXT NOT NULL,
    labels TEXT NOT NULL                        -- JSON 감정 이름 목록
);
CREATE TABLE IF NOT EXISTS steps (
    user_id TEXT NOT NULL,
    date    TEXT NOT NULL,
    steps   INTEGER NOT NULL,
    PRIMARY KEY (user_id, date)
);
CREATE TABLE IF NOT EXISTS mission_days (
    user_id      TEXT NOT NULL,
    date         TEXT NOT NULL,
    stayed_home  INTEGER,
    missions     TEXT NOT NULL,          -- JSON
    PRIMARY KEY (user_id, date)
);
CREATE TABLE IF NOT EXISTS completions (
    user_id     TEXT NOT NULL,
    date        TEXT NOT NULL,
    mission_id  TEXT NOT NULL,
    submission  TEXT NOT NULL,           -- JSON
    created_at  TEXT NOT NULL DEFAULT (datetime('now')),
    PRIMARY KEY (user_id, date, mission_id)
);
CREATE TABLE IF NOT EXISTS coin_ledger (
    user_id  TEXT NOT NULL,
    date     TEXT NOT NULL,
    item_id  TEXT NOT NULL,              -- 미션 id 또는 "all_done"
    coins    INTEGER NOT NULL,
    xp       INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    PRIMARY KEY (user_id, date, item_id)
);
CREATE TABLE IF NOT EXISTS friends (          -- 친구: 요청한 사람 → 받은 사람 한 줄. 수락하면 status = accepted
    user_id     TEXT NOT NULL,           -- 요청한 사람
    friend_id   TEXT NOT NULL,           -- 요청 받은 사람
    status      TEXT NOT NULL,           -- pending | accepted
    created_at  TEXT NOT NULL DEFAULT (datetime('now')),
    accepted_at TEXT,
    PRIMARY KEY (user_id, friend_id)
);
CREATE TABLE IF NOT EXISTS friendship_points (  -- 친밀도: 친구끼리 한 활동. 사람·친구·날짜·종류마다 한 번
    user_a     TEXT NOT NULL,            -- 두 사람 id 중 작은 쪽
    user_b     TEXT NOT NULL,            -- 큰 쪽
    actor_id   TEXT NOT NULL,            -- 활동한 사람
    date       TEXT NOT NULL,
    kind       TEXT NOT NULL,            -- guestbook | visit | like
    points     INTEGER NOT NULL,
    PRIMARY KEY (user_a, user_b, actor_id, date, kind)
);
CREATE TABLE IF NOT EXISTS guestbook_likes (  -- 방명록 좋아요: 한 사람이 한 글에 한 번
    entry_id    INTEGER NOT NULL,
    user_id     TEXT NOT NULL,
    created_at  TEXT NOT NULL DEFAULT (datetime('now')),
    PRIMARY KEY (entry_id, user_id)
);
CREATE TABLE IF NOT EXISTS diary_deleted (    -- 10/21부터 안 씀 (지운 날도 다시 쓸 수 있음). 예전 DB 호환으로 표만 남김
    user_id     TEXT NOT NULL,
    date        TEXT NOT NULL,
    deleted_at  TEXT NOT NULL DEFAULT (datetime('now')),
    PRIMARY KEY (user_id, date)
);
CREATE TABLE IF NOT EXISTS blocks (           -- 차단: user_id가 blocked_id를 차단
    user_id     TEXT NOT NULL,
    blocked_id  TEXT NOT NULL,
    created_at  TEXT NOT NULL DEFAULT (datetime('now')),
    PRIMARY KEY (user_id, blocked_id)
);
CREATE TABLE IF NOT EXISTS reports (          -- 신고: 같은 사람이 같은 대상을 두 번 신고해도 한 번
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    reporter_id TEXT NOT NULL,
    target_type TEXT NOT NULL,           -- guestbook | place_note | user
    target_id   TEXT NOT NULL,           -- 방명록 글 id 또는 user id
    reason      TEXT NOT NULL,           -- spam | abuse | sexual | hate | self_harm | other
    detail      TEXT,
    counted     INTEGER NOT NULL DEFAULT 1,    -- 숨김 횟수에 세는지 (가입 3일 미만 계정이면 0)
    status      TEXT NOT NULL DEFAULT 'open',   -- open | done (운영자가 확인)
    created_at  TEXT NOT NULL DEFAULT (datetime('now')),
    UNIQUE (reporter_id, target_type, target_id)
);
CREATE TABLE IF NOT EXISTS guestbook_bans (   -- 방명록 쓰기 정지 (혐오 표현 사용 등)
    user_id     TEXT PRIMARY KEY,
    until       TEXT NOT NULL,           -- 이 날짜까지 정지 (YYYY-MM-DD)
    reason      TEXT NOT NULL,           -- slur
    created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS rests (            -- 쉬어 가기: 이 기간은 오래 쉰 날로 치지 않음
    user_id     TEXT PRIMARY KEY,
    start       TEXT NOT NULL,
    until       TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS mission_feedback (  -- 미션 소감: 해 보니 어땠는지 (QUEST_DESIGN ②·⑤). 미션 하나에 하나, 다시 쓰면 고침
    user_id     TEXT NOT NULL,
    date        TEXT NOT NULL,
    mission_id  TEXT NOT NULL,
    mood        INTEGER,                 -- 해 보니 어땠어? 1(힘들었어)~5(좋았어)
    text        TEXT,                    -- 소감 한 줄
    expected    INTEGER,                 -- 하기 전 예상한 어색함 1~5 (⑤ "예상보다 괜찮았어", 나중에 씀)
    created_at  TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at  TEXT NOT NULL DEFAULT (datetime('now')),
    PRIMARY KEY (user_id, date, mission_id)
);
CREATE TABLE IF NOT EXISTS place_notes (    -- 동네 탐험: 장소에 남긴 쪽지 (app/places.py)
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    place_id   TEXT NOT NULL,
    author_id  TEXT NOT NULL,
    text       TEXT NOT NULL,
    color      TEXT NOT NULL,
    sticker    TEXT NOT NULL,
    date       TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS place_notes_place ON place_notes (place_id, id);
CREATE TABLE IF NOT EXISTS attendance_log (  -- 연속 출석표에서 받은 선물 (하루 한 번)
    user_id     TEXT NOT NULL,
    date        TEXT NOT NULL,
    reward      TEXT NOT NULL,           -- JSON: {type: coins|xp|outfit|decor, amount|id, duplicate?}
    created_at  TEXT NOT NULL DEFAULT (datetime('now')),
    PRIMARY KEY (user_id, date)
);
CREATE TABLE IF NOT EXISTS surveys (          -- 처음 설문 답 (질문 id → 답). 미션 고르기에만 씀
    user_id     TEXT PRIMARY KEY,
    answers     TEXT NOT NULL,           -- JSON
    updated_at  TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS weekly_progress (  -- 주간 미션: 하루에 한 번씩 채운 기록
    user_id     TEXT NOT NULL,
    week_start  TEXT NOT NULL,           -- 그 주 월요일
    quest_id    TEXT NOT NULL,
    date        TEXT NOT NULL,
    submission  TEXT NOT NULL,           -- JSON
    created_at  TEXT NOT NULL DEFAULT (datetime('now')),
    PRIMARY KEY (user_id, week_start, quest_id, date)
);
CREATE TABLE IF NOT EXISTS photos (
    id           TEXT PRIMARY KEY,        -- uuid
    user_id      TEXT NOT NULL,
    filename     TEXT NOT NULL,           -- 업로드 폴더 안 파일 이름
    content_type TEXT NOT NULL,
    date         TEXT,                    -- 사진첩 날짜 (올린 날, 미션·일기에 쓰면 그날)
    used_for     TEXT,                    -- 어디에 썼는지: 미션 id 또는 "diary". 아직 안 썼으면 NULL
    taken_at     TEXT,                    -- 사진 파일의 촬영 일시 (EXIF). 없으면 NULL
    created_at   TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS diary (
    user_id    TEXT NOT NULL,
    date       TEXT NOT NULL,
    topic_id   TEXT,                     -- 오늘의 주제로 썼으면 주제 id
    text       TEXT NOT NULL,
    mood       TEXT,
    photos     TEXT NOT NULL DEFAULT '[]', -- JSON (photo_id 목록)
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    PRIMARY KEY (user_id, date)
);
CREATE TABLE IF NOT EXISTS visits (
    owner_id   TEXT NOT NULL,            -- 방 주인
    visitor_id TEXT NOT NULL,            -- 놀러 온 사람
    date       TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    PRIMARY KEY (owner_id, visitor_id, date)
);
CREATE TABLE IF NOT EXISTS guestbook (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    owner_id   TEXT NOT NULL,            -- 방 주인
    author     TEXT NOT NULL,            -- 보이는 이름
    author_id  TEXT,                     -- 쓴 사람 user id (방명록 미션 확인용)
    date       TEXT,                     -- 쓴 날짜 YYYY-MM-DD
    text       TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
"""


def connect(path: str | os.PathLike | None = None) -> sqlite3.Connection:
    path = path or os.environ.get("CAPSTONE_DB") or DEFAULT_PATH
    conn = sqlite3.connect(path, check_same_thread=False)
    conn.row_factory = sqlite3.Row
    conn.executescript(SCHEMA)
    # 경험치 컬럼이 없던 예전 DB 파일이면 추가
    cols = {r["name"] for r in conn.execute("PRAGMA table_info(coin_ledger)")}
    if "xp" not in cols:
        conn.execute("ALTER TABLE coin_ledger ADD COLUMN xp INTEGER NOT NULL DEFAULT 0")
    # 작성자 id·날짜가 없던 예전 방명록 테이블이면 추가
    cols = {r["name"] for r in conn.execute("PRAGMA table_info(guestbook)")}
    for col in ("author_id", "date"):
        if col not in cols:
            conn.execute(f"ALTER TABLE guestbook ADD COLUMN {col} TEXT")
    # 미션 새로고침 횟수 칸이 없던 예전 mission_days면 추가
    cols = {r["name"] for r in conn.execute("PRAGMA table_info(mission_days)")}
    if "rerolls" not in cols:
        conn.execute("ALTER TABLE mission_days ADD COLUMN rerolls INTEGER NOT NULL DEFAULT 0")
    # 소품 위치 칸이 없던 예전 배치 테이블이면 추가
    cols = {r["name"] for r in conn.execute("PRAGMA table_info(decor_placement)")}
    for col in ("dx", "dy"):
        if col not in cols:
            conn.execute(f"ALTER TABLE decor_placement ADD COLUMN {col} REAL NOT NULL DEFAULT 0")
    # 한 줄 소개 칸이 없던 예전 사용자 테이블이면 추가
    if "bio" not in {r["name"] for r in conn.execute("PRAGMA table_info(users)")}:
        conn.execute("ALTER TABLE users ADD COLUMN bio TEXT")
    # Supabase 로그인 연결 칸이 없던 예전 사용자 테이블이면 추가 (ALTER로는 UNIQUE를 못 붙여 인덱스로)
    cols = {r["name"] for r in conn.execute("PRAGMA table_info(users)")}
    if "supabase_id" not in cols:
        conn.execute("ALTER TABLE users ADD COLUMN supabase_id TEXT")
    conn.execute("CREATE UNIQUE INDEX IF NOT EXISTS users_supabase_id ON users (supabase_id)")
    # 친구 코드 (게임의 '플레이어 태그'처럼 짧고 고유한 코드, 예: 7KQ2MX). 예전 사용자에게도 채운다
    if "friend_code" not in {r["name"] for r in conn.execute("PRAGMA table_info(users)")}:
        conn.execute("ALTER TABLE users ADD COLUMN friend_code TEXT")
    conn.execute("CREATE UNIQUE INDEX IF NOT EXISTS users_friend_code ON users (friend_code)")
    for row in conn.execute("SELECT id FROM users WHERE friend_code IS NULL").fetchall():
        conn.execute("UPDATE users SET friend_code = ? WHERE id = ?", (new_friend_code(conn), row["id"]))
    # 사진첩용 날짜·용도가 없던 예전 사진 테이블이면 추가
    cols = {r["name"] for r in conn.execute("PRAGMA table_info(photos)")}
    for col in ("date", "used_for", "taken_at"):
        if col not in cols:
            conn.execute(f"ALTER TABLE photos ADD COLUMN {col} TEXT")
    conn.commit()
    sync_crisis_terms(conn)
    return conn


def sync_crisis_terms(conn) -> None:
    """위기 표현 목록을 DB 표로 옮긴다 (JSON이 원본, 바꾸면 서버를 다시 켤 때 반영)."""
    from .crisis import LEXICON
    conn.execute("DELETE FROM crisis_terms")
    conn.executemany(
        "INSERT INTO crisis_terms (term, category, severity, source, note) VALUES (?, ?, ?, ?, ?)",
        [(t["term"], t["category"], t["severity"], t["source"], t.get("note")) for t in LEXICON["terms"]],
    )
    conn.commit()


def add_signal(conn, user_id: str, date: str, source: str, level: str, categories: list[str]) -> None:
    conn.execute(
        "INSERT INTO crisis_signals (user_id, date, source, level, categories) VALUES (?, ?, ?, ?, ?)",
        (user_id, date, source, level, json.dumps(categories)),
    )
    conn.commit()


def signals(conn, user_id: str, start: str, end: str) -> list[dict]:
    rows = conn.execute(
        "SELECT date, source, level, categories, created_at FROM crisis_signals "
        "WHERE user_id = ? AND date BETWEEN ? AND ? ORDER BY date DESC, id DESC",
        (user_id, start, end),
    ).fetchall()
    return [{**dict(r), "categories": json.loads(r["categories"])} for r in rows]


def worst_signal(conn, user_id: str, date: str) -> str | None:
    rows = conn.execute("SELECT DISTINCT level FROM crisis_signals WHERE user_id = ? AND date = ?", (user_id, date)).fetchall()
    levels = {r["level"] for r in rows}
    return next((lv for lv in ("high", "medium", "low") if lv in levels), None)


# --- 사용자 ------------------------------------------------------------------------

def nickname_key(nickname: str) -> str:
    return "".join(nickname.split()).lower()


FRIEND_CODE_LETTERS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"   # 헷갈리는 0·O·1·I 뺌
FRIEND_CODE_LENGTH = 6


def new_friend_code(conn) -> str:
    """아직 아무도 안 쓰는 친구 코드 (32자 × 6자리 ≈ 10억 가지)."""
    import secrets
    while True:
        code = "".join(secrets.choice(FRIEND_CODE_LETTERS) for _ in range(FRIEND_CODE_LENGTH))
        if conn.execute("SELECT 1 FROM users WHERE friend_code = ?", (code,)).fetchone() is None:
            return code


def normalize_friend_code(text: str) -> str:
    """'#7kq-2mx ' → '7KQ2MX' (#·띄어쓰기·- 무시, 소문자도 됨)"""
    return "".join(ch for ch in (text or "").upper() if ch in FRIEND_CODE_LETTERS)


def user_by_friend_code(conn, code: str) -> dict | None:
    row = conn.execute("SELECT id FROM users WHERE friend_code = ?", (normalize_friend_code(code),)).fetchone()
    return get_user(conn, row["id"]) if row else None


def create_user(conn, user_id: str, nickname: str) -> dict:
    conn.execute(
        "INSERT INTO users (id, nickname, nickname_key, friend_code) VALUES (?, ?, ?, ?)",
        (user_id, nickname, nickname_key(nickname), new_friend_code(conn)),
    )
    conn.commit()
    return get_user(conn, user_id)


def supabase_id_of(conn, user_id: str) -> str | None:
    row = conn.execute("SELECT supabase_id FROM users WHERE id = ?", (user_id,)).fetchone()
    return row["supabase_id"] if row else None


def user_by_supabase(conn, supabase_id: str) -> dict | None:
    row = conn.execute("SELECT id FROM users WHERE supabase_id = ?", (supabase_id,)).fetchone()
    return get_user(conn, row["id"]) if row else None


def link_supabase(conn, user_id: str, supabase_id: str) -> None:
    conn.execute("UPDATE users SET supabase_id = ?, updated_at = datetime('now') WHERE id = ?", (supabase_id, user_id))
    conn.commit()


def get_user(conn, user_id: str) -> dict | None:
    row = conn.execute("SELECT id, nickname, bio, friend_code, game_center_id, created_at, updated_at FROM users WHERE id = ?", (user_id,)).fetchone()
    return dict(row) if row else None


def nickname_taken(conn, nickname: str, except_id: str | None = None) -> bool:
    row = conn.execute(
        "SELECT 1 FROM users WHERE nickname_key = ? AND id != COALESCE(?, '')",
        (nickname_key(nickname), except_id),
    ).fetchone()
    return row is not None


def rename_user(conn, user_id: str, nickname: str) -> dict:
    conn.execute(
        "UPDATE users SET nickname = ?, nickname_key = ?, updated_at = datetime('now') WHERE id = ?",
        (nickname, nickname_key(nickname), user_id),
    )
    conn.commit()
    return get_user(conn, user_id)


def set_bio(conn, user_id: str, bio: str | None) -> dict:
    conn.execute("UPDATE users SET bio = ?, updated_at = datetime('now') WHERE id = ?", (bio, user_id))
    conn.commit()
    return get_user(conn, user_id)


def nicknames(conn, user_ids: list[str]) -> dict[str, str]:
    if not user_ids:
        return {}
    marks = ",".join("?" * len(user_ids))
    rows = conn.execute(f"SELECT id, nickname FROM users WHERE id IN ({marks})", tuple(user_ids)).fetchall()
    return {r["id"]: r["nickname"] for r in rows}


def visit_counts(conn, owner_id: str, date: str) -> dict:
    """방 방문자 수: 오늘(그날 놀러 온 사람 수)과 전체(날마다 한 번씩 센 누적). 미니홈피의 TODAY / TOTAL처럼."""
    row = conn.execute(
        "SELECT SUM(date = ?) AS today, COUNT(*) AS total FROM visits WHERE owner_id = ?", (date, owner_id)
    ).fetchone()
    return {"today": int(row["today"] or 0), "total": int(row["total"] or 0)}


def delete_user(conn, user_id: str) -> list[str]:
    """사용자와 그 사람의 기록을 모두 지운다. 지울 사진 파일 이름을 돌려준다.

    남의 방에 남긴 방명록·방문 기록도 지운다 (계정 삭제 = 흔적까지 삭제).
    """
    photos = [r["filename"] for r in conn.execute("SELECT filename FROM photos WHERE user_id = ?", (user_id,))]
    for sql in (
        "DELETE FROM steps WHERE user_id = ?",
        "DELETE FROM mission_days WHERE user_id = ?",
        "DELETE FROM completions WHERE user_id = ?",
        "DELETE FROM weekly_progress WHERE user_id = ?",
        "DELETE FROM reports WHERE reporter_id = ?",
        "DELETE FROM guestbook_bans WHERE user_id = ?",
        "DELETE FROM rests WHERE user_id = ?",
        "DELETE FROM surveys WHERE user_id = ?",
        "DELETE FROM attendance_log WHERE user_id = ?",
        "DELETE FROM mission_feedback WHERE user_id = ?",
        "DELETE FROM coin_ledger WHERE user_id = ?",
        "DELETE FROM photos WHERE user_id = ?",
        "DELETE FROM diary WHERE user_id = ?",
        "DELETE FROM diary_deleted WHERE user_id = ?",
    ):
        conn.execute(sql, (user_id,))
    conn.execute("DELETE FROM blocks WHERE user_id = ? OR blocked_id = ?", (user_id, user_id))
    conn.execute("DELETE FROM friends WHERE user_id = ? OR friend_id = ?", (user_id, user_id))
    conn.execute("DELETE FROM guestbook_likes WHERE user_id = ? OR entry_id NOT IN (SELECT id FROM guestbook)", (user_id,))
    conn.execute("DELETE FROM friendship_points WHERE user_a = ? OR user_b = ?", (user_id, user_id))
    conn.execute("DELETE FROM visits WHERE owner_id = ? OR visitor_id = ?", (user_id, user_id))
    conn.execute("DELETE FROM guestbook WHERE owner_id = ? OR author_id = ?", (user_id, user_id))
    conn.execute("DELETE FROM inventory WHERE user_id = ?", (user_id,))
    conn.execute("DELETE FROM equipped WHERE user_id = ?", (user_id,))
    conn.execute("DELETE FROM decor_placement WHERE user_id = ?", (user_id,))
    conn.execute("DELETE FROM place_notes WHERE author_id = ?", (user_id,))
    conn.execute("DELETE FROM crisis_signals WHERE user_id = ?", (user_id,))
    conn.execute("DELETE FROM users WHERE id = ?", (user_id,))
    conn.commit()
    return photos


# --- 상점 ------------------------------------------------------------------------

def owned_items(conn, user_id: str) -> set[tuple[str, str]]:
    rows = conn.execute("SELECT item_type, item_id FROM inventory WHERE user_id = ?", (user_id,)).fetchall()
    return {(r["item_type"], r["item_id"]) for r in rows}


def add_items(conn, user_id: str, items: list[tuple[str, str]], how: str | dict) -> list[tuple[str, str]]:
    """보유 목록에 추가. 새로 들어간 것만 돌려준다. how는 문자열 하나 또는 {(type, id): how}."""
    added = []
    for kind, item_id in items:
        h = how if isinstance(how, str) else how[(kind, item_id)]
        cur = conn.execute(
            "INSERT OR IGNORE INTO inventory (user_id, item_type, item_id, how) VALUES (?, ?, ?, ?)",
            (user_id, kind, item_id, h),
        )
        if cur.rowcount == 1:
            added.append((kind, item_id))
    conn.commit()
    return added


def spend_coins(conn, user_id: str, date: str, item_key: str, coins: int) -> None:
    """코인 사용은 보상 장부에 마이너스로 남긴다 (잔액 = 장부 합계)."""
    conn.execute(
        "INSERT INTO coin_ledger (user_id, date, item_id, coins, xp) VALUES (?, ?, ?, ?, 0)",
        (user_id, date, item_key, -coins),
    )
    conn.commit()


def get_decor(conn, user_id: str) -> dict[str, str]:
    """자리별로 놓은 소품 {slot: item_id}. 비어 있는 자리는 없음."""
    rows = conn.execute("SELECT slot, item_id FROM decor_placement WHERE user_id = ?", (user_id,)).fetchall()
    return {r["slot"]: r["item_id"] for r in rows}


def decor_positions(conn, user_id: str) -> dict[str, dict]:
    """옮겨 둔 소품 위치 {slot: {dx, dy}} (옮긴 것만)."""
    rows = conn.execute("SELECT slot, dx, dy FROM decor_placement WHERE user_id = ? AND (dx != 0 OR dy != 0)", (user_id,)).fetchall()
    return {r["slot"]: {"dx": r["dx"], "dy": r["dy"]} for r in rows}


def move_decor(conn, user_id: str, slot: str, dx: float, dy: float) -> bool:
    cur = conn.execute("UPDATE decor_placement SET dx = ?, dy = ? WHERE user_id = ? AND slot = ?", (dx, dy, user_id, slot))
    conn.commit()
    return cur.rowcount == 1


def set_decor(conn, user_id: str, slot: str, item_id: str | None) -> dict[str, str]:
    if item_id is None:
        conn.execute("DELETE FROM decor_placement WHERE user_id = ? AND slot = ?", (user_id, slot))
    else:
        conn.execute(
            "INSERT INTO decor_placement (user_id, slot, item_id) VALUES (?, ?, ?) "
            "ON CONFLICT (user_id, slot) DO UPDATE SET item_id = excluded.item_id",
            (user_id, slot, item_id),
        )
    conn.commit()
    return get_decor(conn, user_id)


def get_equipped(conn, user_id: str) -> dict:
    row = conn.execute("SELECT character_id, outfit_id FROM equipped WHERE user_id = ?", (user_id,)).fetchone()
    return dict(row) if row else {"character_id": None, "outfit_id": None}


def set_equipped(conn, user_id: str, character_id: str | None, outfit_id: str | None) -> dict:
    conn.execute(
        "INSERT INTO equipped (user_id, character_id, outfit_id) VALUES (?, ?, ?) "
        "ON CONFLICT (user_id) DO UPDATE SET character_id = excluded.character_id, outfit_id = excluded.outfit_id",
        (user_id, character_id, outfit_id),
    )
    conn.commit()
    return get_equipped(conn, user_id)


# --- 걸음 ------------------------------------------------------------------------

def upsert_steps(conn, user_id: str, date: str, steps: int) -> None:
    conn.execute(
        "INSERT INTO steps (user_id, date, steps) VALUES (?, ?, ?) "
        "ON CONFLICT (user_id, date) DO UPDATE SET steps = excluded.steps",
        (user_id, date, steps),
    )
    conn.commit()


def get_steps(conn, user_id: str, date: str) -> int | None:
    row = conn.execute("SELECT steps FROM steps WHERE user_id = ? AND date = ?", (user_id, date)).fetchone()
    return row["steps"] if row else None


def steps_between(conn, user_id: str, start: str, end: str) -> list[int]:
    rows = conn.execute(
        "SELECT steps FROM steps WHERE user_id = ? AND date BETWEEN ? AND ? ORDER BY date",
        (user_id, start, end),
    ).fetchall()
    return [r["steps"] for r in rows]


# --- 미션 ------------------------------------------------------------------------

def get_mission_day(conn, user_id: str, date: str) -> dict | None:
    row = conn.execute("SELECT * FROM mission_days WHERE user_id = ? AND date = ?", (user_id, date)).fetchone()
    if not row:
        return None
    home = row["stayed_home"]
    return {"date": date, "stayed_home": None if home is None else bool(home), "missions": json.loads(row["missions"]),
            "rerolls": row["rerolls"]}


def replace_missions(conn, user_id: str, date: str, missions: list[dict]) -> None:
    """미션 새로고침: 오늘 미션 목록을 바꾸고 새로고침 횟수 +1."""
    conn.execute(
        "UPDATE mission_days SET missions = ?, rerolls = rerolls + 1 WHERE user_id = ? AND date = ?",
        (json.dumps(missions, ensure_ascii=False), user_id, date),
    )
    conn.commit()


def save_mission_day(conn, user_id: str, day: dict) -> None:
    home = day["stayed_home"]
    conn.execute(
        "INSERT OR IGNORE INTO mission_days (user_id, date, stayed_home, missions) VALUES (?, ?, ?, ?)",
        (user_id, day["date"], None if home is None else int(home), json.dumps(day["missions"], ensure_ascii=False)),
    )
    conn.commit()


def recent_mission_ids(conn, user_id: str, before: str, days: int = 2) -> list[str]:
    rows = conn.execute(
        "SELECT missions FROM mission_days WHERE user_id = ? AND date < ? ORDER BY date DESC LIMIT ?",
        (user_id, before, days),
    ).fetchall()
    return [m["id"] for r in rows for m in json.loads(r["missions"])]


def save_completion(conn, user_id: str, date: str, mission_id: str, submission: dict) -> None:
    conn.execute(
        "INSERT OR REPLACE INTO completions (user_id, date, mission_id, submission) VALUES (?, ?, ?, ?)",
        (user_id, date, mission_id, json.dumps(submission, ensure_ascii=False)),
    )
    conn.commit()


def completion_history(conn, user_id: str, mission_ids: list[str]) -> list[str]:
    """이 미션들을 완료한 기록 (날마다 한 줄, 같은 미션이 여러 번 나올 수 있음). 단계 사다리 계산용."""
    if not mission_ids:
        return []
    marks = ",".join("?" * len(mission_ids))
    rows = conn.execute(
        f"SELECT mission_id FROM completions WHERE user_id = ? AND mission_id IN ({marks})", (user_id, *mission_ids)
    ).fetchall()
    return [r["mission_id"] for r in rows]


def completed_ids(conn, user_id: str, date: str) -> set[str]:
    rows = conn.execute("SELECT mission_id FROM completions WHERE user_id = ? AND date = ?", (user_id, date)).fetchall()
    return {r["mission_id"] for r in rows}


def weekly_days(conn, user_id: str, week_start: str, quest_id: str) -> list[str]:
    """이번 주에 이 주간 미션을 채운 날짜."""
    rows = conn.execute(
        "SELECT date FROM weekly_progress WHERE user_id = ? AND week_start = ? AND quest_id = ? ORDER BY date",
        (user_id, week_start, quest_id),
    ).fetchall()
    return [r["date"] for r in rows]


def save_weekly(conn, user_id: str, week_start: str, quest_id: str, date: str, submission: dict) -> None:
    conn.execute(
        "INSERT INTO weekly_progress (user_id, week_start, quest_id, date, submission) VALUES (?, ?, ?, ?, ?)",
        (user_id, week_start, quest_id, date, json.dumps(submission, ensure_ascii=False)),
    )
    conn.commit()


# --- 코인 ------------------------------------------------------------------------

def paid_ids(conn, user_id: str, date: str) -> set[str]:
    rows = conn.execute("SELECT item_id FROM coin_ledger WHERE user_id = ? AND date = ?", (user_id, date)).fetchall()
    return {r["item_id"] for r in rows}


def add_coins(conn, user_id: str, date: str, items: list[dict]) -> None:
    conn.executemany(
        "INSERT OR IGNORE INTO coin_ledger (user_id, date, item_id, coins, xp) VALUES (?, ?, ?, ?, ?)",
        [(user_id, date, i["id"], i["coins"], i.get("xp", 0)) for i in items],
    )
    conn.commit()


def coin_balance(conn, user_id: str) -> int:
    row = conn.execute("SELECT COALESCE(SUM(coins), 0) AS total FROM coin_ledger WHERE user_id = ?", (user_id,)).fetchone()
    return int(row["total"])


def xp_total(conn, user_id: str) -> int:
    row = conn.execute("SELECT COALESCE(SUM(xp), 0) AS total FROM coin_ledger WHERE user_id = ?", (user_id,)).fetchone()
    return int(row["total"])


def xp_totals(conn, user_ids: list[str]) -> dict[str, int]:
    """여러 사용자의 누적 경험치. 기록이 없으면 0."""
    if not user_ids:
        return {}
    marks = ",".join("?" * len(user_ids))
    rows = conn.execute(
        f"SELECT user_id, COALESCE(SUM(xp), 0) AS total FROM coin_ledger WHERE user_id IN ({marks}) GROUP BY user_id",
        tuple(user_ids),
    ).fetchall()
    totals = {r["user_id"]: int(r["total"]) for r in rows}
    return {u: totals.get(u, 0) for u in user_ids}


# --- 사진 ------------------------------------------------------------------------

def add_photo(conn, photo_id: str, user_id: str, filename: str, content_type: str,
              date: str | None = None, taken_at: str | None = None) -> None:
    conn.execute(
        "INSERT INTO photos (id, user_id, filename, content_type, date, taken_at) VALUES (?, ?, ?, ?, ?, ?)",
        (photo_id, user_id, filename, content_type, date, taken_at),
    )
    conn.commit()


def photo_taken_at(conn, photo_ids: list[str]) -> dict[str, str | None]:
    if not photo_ids:
        return {}
    marks = ",".join("?" * len(photo_ids))
    rows = conn.execute(f"SELECT id, taken_at FROM photos WHERE id IN ({marks})", tuple(photo_ids)).fetchall()
    return {r["id"]: r["taken_at"] for r in rows}


def tag_photos(conn, user_id: str, photo_ids: list[str], used_for: str, date: str) -> None:
    """사진을 어디(미션 id 또는 "diary")에 언제 썼는지 기록한다. 사진첩에서 보여 줄 때 쓴다."""
    conn.executemany(
        "UPDATE photos SET used_for = ?, date = ? WHERE id = ? AND user_id = ?",
        [(used_for, date, pid, user_id) for pid in photo_ids],
    )
    conn.commit()


def album(conn, user_id: str, start: str | None, end: str | None, limit: int, offset: int) -> tuple[list[dict], int]:
    """사진첩: 날짜 최신순. (사진 목록, 전체 개수)"""
    where = "user_id = ? AND COALESCE(date, substr(created_at, 1, 10)) BETWEEN ? AND ?"
    args = (user_id, start or "0000-00-00", end or "9999-99-99")
    total = conn.execute(f"SELECT COUNT(*) AS n FROM photos WHERE {where}", args).fetchone()["n"]
    rows = conn.execute(
        f"SELECT id, COALESCE(date, substr(created_at, 1, 10)) AS date, used_for, taken_at, created_at FROM photos "
        f"WHERE {where} ORDER BY date DESC, created_at DESC, id LIMIT ? OFFSET ?",
        (*args, limit, offset),
    ).fetchall()
    return [dict(r) for r in rows], total


def album_months(conn, user_id: str) -> list[dict]:
    rows = conn.execute(
        "SELECT substr(COALESCE(date, created_at), 1, 7) AS month, COUNT(*) AS count FROM photos "
        "WHERE user_id = ? GROUP BY month ORDER BY month DESC",
        (user_id,),
    ).fetchall()
    return [dict(r) for r in rows]


def delete_photo(conn, user_id: str, photo_id: str) -> str | None:
    """사진을 지우고 파일 이름을 돌려준다. 일기에 붙어 있던 것도 뗀다. 없거나 남의 사진이면 None."""
    row = conn.execute("SELECT filename FROM photos WHERE id = ? AND user_id = ?", (photo_id, user_id)).fetchone()
    if row is None:
        return None
    for d in conn.execute("SELECT date, photos FROM diary WHERE user_id = ? AND photos LIKE ?", (user_id, f"%{photo_id}%")).fetchall():
        kept = [p for p in json.loads(d["photos"]) if p != photo_id]
        conn.execute("UPDATE diary SET photos = ? WHERE user_id = ? AND date = ?", (json.dumps(kept), user_id, d["date"]))
    conn.execute("DELETE FROM photos WHERE id = ?", (photo_id,))
    conn.commit()
    return row["filename"]


def get_photo(conn, photo_id: str) -> dict | None:
    row = conn.execute("SELECT * FROM photos WHERE id = ?", (photo_id,)).fetchone()
    return dict(row) if row else None


def owned_photo_ids(conn, user_id: str, photo_ids: list[str]) -> set[str]:
    if not photo_ids:
        return set()
    marks = ",".join("?" * len(photo_ids))
    rows = conn.execute(f"SELECT id FROM photos WHERE user_id = ? AND id IN ({marks})", (user_id, *photo_ids)).fetchall()
    return {r["id"] for r in rows}


# --- 일기 ------------------------------------------------------------------------

def save_diary(conn, user_id: str, date: str, text: str, topic_id: str | None, mood: str | None, photos: list[str]) -> dict:
    conn.execute(
        "INSERT INTO diary (user_id, date, topic_id, text, mood, photos) VALUES (?, ?, ?, ?, ?, ?) "
        "ON CONFLICT (user_id, date) DO UPDATE SET topic_id = excluded.topic_id, text = excluded.text, "
        "mood = excluded.mood, photos = excluded.photos, updated_at = datetime('now')",
        (user_id, date, topic_id, text, mood, json.dumps(photos)),
    )
    conn.commit()
    return get_diary(conn, user_id, date)


def delete_diary(conn, user_id: str, date: str) -> bool:
    """일기를 지운다. 지웠으면 True. 그날 다시 쓸 수 있다 (10/21, 보상은 장부로 한 번만)."""
    cur = conn.execute("DELETE FROM diary WHERE user_id = ? AND date = ?", (user_id, date))
    conn.commit()
    return cur.rowcount == 1


def _diary_row(row) -> dict:
    d = dict(row)
    d["photos"] = json.loads(d["photos"])
    return d


def get_diary(conn, user_id: str, date: str) -> dict | None:
    row = conn.execute("SELECT * FROM diary WHERE user_id = ? AND date = ?", (user_id, date)).fetchone()
    return _diary_row(row) if row else None


def list_diary(conn, user_id: str, start: str, end: str) -> list[dict]:
    rows = conn.execute(
        "SELECT * FROM diary WHERE user_id = ? AND date BETWEEN ? AND ? ORDER BY date DESC",
        (user_id, start, end),
    ).fetchall()
    return [_diary_row(r) for r in rows]


# --- 방문 ------------------------------------------------------------------------

def add_visit(conn, owner_id: str, visitor_id: str, date: str) -> bool:
    """방문 기록. 같은 날 같은 방은 한 번만 기록하고, 새로 기록했으면 True."""
    cur = conn.execute(
        "INSERT OR IGNORE INTO visits (owner_id, visitor_id, date) VALUES (?, ?, ?)",
        (owner_id, visitor_id, date),
    )
    conn.commit()
    return cur.rowcount == 1


def visited_someone(conn, visitor_id: str, date: str) -> bool:
    row = conn.execute(
        "SELECT 1 FROM visits WHERE visitor_id = ? AND date = ? AND owner_id != ? LIMIT 1",
        (visitor_id, date, visitor_id),
    ).fetchone()
    return row is not None


def visitors(conn, owner_id: str, date: str) -> list[str]:
    rows = conn.execute(
        "SELECT visitor_id FROM visits WHERE owner_id = ? AND date = ? ORDER BY created_at",
        (owner_id, date),
    ).fetchall()
    return [r["visitor_id"] for r in rows]


def active_users(conn, since: str, exclude: str, limit: int) -> list[str]:
    """최근에 앱을 쓴 사용자 (미션을 받은 날이 있는 사람). 방문할 방 추천용."""
    rows = conn.execute(
        "SELECT user_id, MAX(date) AS last FROM mission_days WHERE date >= ? AND user_id != ? "
        "GROUP BY user_id ORDER BY last DESC, user_id LIMIT ?",
        (since, exclude, limit),
    ).fetchall()
    return [r["user_id"] for r in rows]


# --- 방명록 -----------------------------------------------------------------------

def add_guestbook(conn, owner_id: str, author: str, text: str, author_id: str | None = None, date: str | None = None) -> dict:
    cur = conn.execute(
        "INSERT INTO guestbook (owner_id, author, author_id, date, text) VALUES (?, ?, ?, ?, ?)",
        (owner_id, author, author_id, date, text),
    )
    conn.commit()
    row = conn.execute("SELECT * FROM guestbook WHERE id = ?", (cur.lastrowid,)).fetchone()
    return dict(row)


def wrote_guestbook(conn, author_id: str, date: str) -> bool:
    """그날 다른 사람 방에 방명록을 남겼는지 (내 방에 쓴 건 제외)."""
    row = conn.execute(
        "SELECT 1 FROM guestbook WHERE author_id = ? AND date = ? AND owner_id != ? LIMIT 1",
        (author_id, date, author_id),
    ).fetchone()
    return row is not None


def list_guestbook(conn, owner_id: str, limit: int = 20, offset: int = 0,
                   viewer_id: str | None = None, hide_count: int = 2) -> list[dict]:
    """방명록 목록. 빠지는 글:
    - 서로 다른 hide_count명 이상이 신고한 글 (모두에게, 숨김 횟수에 세는 신고만)
    - 방 주인과 차단 관계인 사람이 쓴 글 (모두에게)
    - viewer_id가 있으면: 그 사람이 신고한 글, 그 사람과 차단 관계인 사람이 쓴 글
    """
    sql = (
        "SELECT * FROM guestbook g WHERE owner_id = ? "
        "AND CAST(g.id AS TEXT) NOT IN (SELECT target_id FROM reports WHERE target_type = 'guestbook' AND counted = 1 "
        "  GROUP BY target_id HAVING COUNT(DISTINCT reporter_id) >= ?) "
        "AND (g.author_id IS NULL OR g.author_id NOT IN ("
        "  SELECT blocked_id FROM blocks WHERE user_id = ? UNION SELECT user_id FROM blocks WHERE blocked_id = ?)) "
    )
    params: list = [owner_id, hide_count, owner_id, owner_id]
    if viewer_id:
        sql += (
            "AND CAST(g.id AS TEXT) NOT IN (SELECT target_id FROM reports WHERE target_type = 'guestbook' AND reporter_id = ?) "
            "AND (g.author_id IS NULL OR g.author_id NOT IN ("
            "  SELECT blocked_id FROM blocks WHERE user_id = ? UNION SELECT user_id FROM blocks WHERE blocked_id = ?)) "
        )
        params += [viewer_id, viewer_id, viewer_id]
    sql += "ORDER BY g.id DESC LIMIT ? OFFSET ?"
    rows = conn.execute(sql, (*params, limit, offset)).fetchall()
    return [dict(r) for r in rows]


def add_place_note(conn, place_id: str, author_id: str, text: str, color: str, sticker: str, date: str) -> dict:
    cur = conn.execute("INSERT INTO place_notes (place_id, author_id, text, color, sticker, date) VALUES (?, ?, ?, ?, ?, ?)",
                       (place_id, author_id, text, color, sticker, date))
    conn.commit()
    return get_place_note(conn, cur.lastrowid)


def get_place_note(conn, note_id: int) -> dict | None:
    row = conn.execute("SELECT * FROM place_notes WHERE id = ?", (note_id,)).fetchone()
    return dict(row) if row else None


def list_place_notes(conn, place_id: str, viewer_id: str | None = None, limit: int = 30, hide_count: int = 2) -> list[dict]:
    """장소 쪽지 목록 (최신 순). 빠지는 글: hide_count명 이상이 신고한 글(모두에게), 보는 사람이 신고한 글·차단 관계인 사람의 글."""
    sql = ("SELECT n.*, u.nickname AS author FROM place_notes n LEFT JOIN users u ON u.id = n.author_id WHERE n.place_id = ? "
           "AND CAST(n.id AS TEXT) NOT IN (SELECT target_id FROM reports WHERE target_type = 'place_note' AND counted = 1 "
           "  GROUP BY target_id HAVING COUNT(DISTINCT reporter_id) >= ?) ")
    params: list = [place_id, hide_count]
    if viewer_id:
        sql += ("AND CAST(n.id AS TEXT) NOT IN (SELECT target_id FROM reports WHERE target_type = 'place_note' AND reporter_id = ?) "
                "AND n.author_id NOT IN (SELECT blocked_id FROM blocks WHERE user_id = ? UNION SELECT user_id FROM blocks WHERE blocked_id = ?) ")
        params += [viewer_id, viewer_id, viewer_id]
    sql += "ORDER BY n.id DESC LIMIT ?"
    return [dict(r) for r in conn.execute(sql, (*params, limit)).fetchall()]


def delete_place_note(conn, note_id: int) -> None:
    conn.execute("DELETE FROM place_notes WHERE id = ?", (note_id,))
    conn.execute("DELETE FROM reports WHERE target_type = 'place_note' AND target_id = ?", (str(note_id),))
    conn.commit()


def get_guestbook_entry(conn, entry_id: int) -> dict | None:
    row = conn.execute("SELECT * FROM guestbook WHERE id = ?", (entry_id,)).fetchone()
    return dict(row) if row else None


def delete_guestbook_entry(conn, entry_id: int) -> None:
    conn.execute("DELETE FROM guestbook WHERE id = ?", (entry_id,))
    conn.execute("DELETE FROM guestbook_likes WHERE entry_id = ?", (entry_id,))
    conn.execute("DELETE FROM reports WHERE target_type = 'guestbook' AND target_id = ?", (str(entry_id),))
    conn.commit()


# --- 친구 --------------------------------------------------------------------------

def find_user_by_nickname(conn, nickname: str) -> dict | None:
    """닉네임으로 찾기 (대소문자·띄어쓰기 무시, 가입할 때 중복 확인과 같은 기준)."""
    row = conn.execute("SELECT id, nickname FROM users WHERE nickname_key = ?", (nickname_key(nickname),)).fetchone()
    return dict(row) if row else None


def friend_edge(conn, a: str, b: str) -> dict | None:
    """a와 b 사이의 친구 관계 (어느 쪽이 요청했든)."""
    row = conn.execute(
        "SELECT * FROM friends WHERE (user_id = ? AND friend_id = ?) OR (user_id = ? AND friend_id = ?)",
        (a, b, b, a),
    ).fetchone()
    return dict(row) if row else None


def request_friend(conn, user_id: str, friend_id: str) -> None:
    conn.execute("INSERT OR IGNORE INTO friends (user_id, friend_id, status) VALUES (?, ?, 'pending')", (user_id, friend_id))
    conn.commit()


def accept_friend(conn, requester_id: str, user_id: str) -> bool:
    """requester_id가 보낸 요청을 user_id가 수락. 수락했으면 True."""
    cur = conn.execute(
        "UPDATE friends SET status = 'accepted', accepted_at = datetime('now') "
        "WHERE user_id = ? AND friend_id = ? AND status = 'pending'",
        (requester_id, user_id),
    )
    conn.commit()
    return cur.rowcount == 1


def remove_friend(conn, a: str, b: str, commit: bool = True) -> bool:
    """친구 끊기·요청 취소·요청 거절 모두 이걸로."""
    cur = conn.execute(
        "DELETE FROM friends WHERE (user_id = ? AND friend_id = ?) OR (user_id = ? AND friend_id = ?)", (a, b, b, a)
    )
    if commit:
        conn.commit()
    return cur.rowcount > 0


def friend_lists(conn, user_id: str) -> dict[str, list[dict]]:
    """{"friends": [...], "received": [...], "sent": [...]} 각 항목 {"id", "since"}. 최근 순."""
    rows = conn.execute(
        "SELECT user_id, friend_id, status, created_at, accepted_at FROM friends "
        "WHERE user_id = ? OR friend_id = ? ORDER BY COALESCE(accepted_at, created_at) DESC",
        (user_id, user_id),
    ).fetchall()
    out = {"friends": [], "received": [], "sent": []}
    for r in rows:
        other = r["friend_id"] if r["user_id"] == user_id else r["user_id"]
        if r["status"] == "accepted":
            out["friends"].append({"id": other, "since": r["accepted_at"]})
        elif r["user_id"] == user_id:
            out["sent"].append({"id": other, "since": r["created_at"]})
        else:
            out["received"].append({"id": other, "since": r["created_at"]})
    return out


def friend_ids(conn, user_id: str) -> set[str]:
    rows = conn.execute(
        "SELECT CASE WHEN user_id = ? THEN friend_id ELSE user_id END AS id FROM friends "
        "WHERE status = 'accepted' AND (user_id = ? OR friend_id = ?)",
        (user_id, user_id, user_id),
    ).fetchall()
    return {r["id"] for r in rows}


def visited_owners(conn, visitor_id: str, date: str) -> list[str]:
    """그날 visitor_id가 놀러 간 방 주인."""
    rows = conn.execute("SELECT owner_id FROM visits WHERE visitor_id = ? AND date = ?", (visitor_id, date)).fetchall()
    return [r["owner_id"] for r in rows]


def _pair(a: str, b: str) -> tuple[str, str]:
    return (a, b) if a < b else (b, a)


def add_friendship_points(conn, actor_id: str, friend_id: str, date: str, kind: str, points: int) -> bool:
    """친밀도 점수 기록. 그날 같은 종류를 이미 했으면 False (점수 안 늘어남)."""
    a, b = _pair(actor_id, friend_id)
    cur = conn.execute(
        "INSERT OR IGNORE INTO friendship_points (user_a, user_b, actor_id, date, kind, points) VALUES (?, ?, ?, ?, ?, ?)",
        (a, b, actor_id, date, kind, points),
    )
    conn.commit()
    return cur.rowcount == 1


def friendship_points(conn, user_id: str, friend_ids: list[str]) -> dict[str, int]:
    """나와 친구들 사이의 누적 친밀도 점수."""
    out = {f: 0 for f in friend_ids}
    if not friend_ids:
        return out
    marks = ",".join("?" * len(friend_ids))
    rows = conn.execute(
        f"SELECT CASE WHEN user_a = ? THEN user_b ELSE user_a END AS other, SUM(points) AS p FROM friendship_points "
        f"WHERE (user_a = ? AND user_b IN ({marks})) OR (user_b = ? AND user_a IN ({marks})) GROUP BY other",
        (user_id, user_id, *friend_ids, user_id, *friend_ids),
    ).fetchall()
    out.update({r["other"]: int(r["p"]) for r in rows})
    return out


def friendship_counts(conn, user_id: str, other_id: str) -> dict:
    """두 사람 사이 교류 횟수 (날마다 한 번씩 센 것): 내가 한 것 / 상대가 한 것, 종류별."""
    a, b = _pair(user_id, other_id)
    rows = conn.execute(
        "SELECT actor_id, kind, COUNT(*) AS n FROM friendship_points WHERE user_a = ? AND user_b = ? GROUP BY actor_id, kind", (a, b)
    ).fetchall()
    out = {"mine": {"visit": 0, "guestbook": 0, "like": 0}, "theirs": {"visit": 0, "guestbook": 0, "like": 0}}
    for r in rows:
        out["mine" if r["actor_id"] == user_id else "theirs"][r["kind"]] = int(r["n"])
    return out


def paid_ever(conn, user_id: str, item_id: str) -> bool:
    """이 항목으로 보상을 받은 적이 있는지 (날짜 상관없이)."""
    row = conn.execute("SELECT 1 FROM coin_ledger WHERE user_id = ? AND item_id = ? LIMIT 1", (user_id, item_id)).fetchone()
    return row is not None


def last_active(conn, user_ids: list[str]) -> dict[str, str]:
    """사용자별 마지막으로 앱을 쓴 날."""
    if not user_ids:
        return {}
    marks = ",".join("?" * len(user_ids))
    rows = conn.execute(
        f"SELECT user_id, MAX(date) AS d FROM mission_days WHERE user_id IN ({marks}) GROUP BY user_id", tuple(user_ids)
    ).fetchall()
    return {r["user_id"]: r["d"] for r in rows}


# --- 방명록 좋아요 ------------------------------------------------------------------

def like_entry(conn, entry_id: int, user_id: str) -> bool:
    cur = conn.execute("INSERT OR IGNORE INTO guestbook_likes (entry_id, user_id) VALUES (?, ?)", (entry_id, user_id))
    conn.commit()
    return cur.rowcount == 1


def unlike_entry(conn, entry_id: int, user_id: str) -> bool:
    cur = conn.execute("DELETE FROM guestbook_likes WHERE entry_id = ? AND user_id = ?", (entry_id, user_id))
    conn.commit()
    return cur.rowcount == 1


def like_counts(conn, entry_ids: list[int], viewer_id: str | None = None) -> dict[int, dict]:
    """{글 id: {"likes": 수, "liked": 보는 사람이 눌렀는지}}"""
    out = {i: {"likes": 0, "liked": False} for i in entry_ids}
    if not entry_ids:
        return out
    marks = ",".join("?" * len(entry_ids))
    for r in conn.execute(f"SELECT entry_id, COUNT(*) AS n FROM guestbook_likes WHERE entry_id IN ({marks}) GROUP BY entry_id",
                          tuple(entry_ids)):
        out[r["entry_id"]]["likes"] = int(r["n"])
    if viewer_id:
        for r in conn.execute(f"SELECT entry_id FROM guestbook_likes WHERE user_id = ? AND entry_id IN ({marks})",
                              (viewer_id, *entry_ids)):
            out[r["entry_id"]]["liked"] = True
    return out


# --- 차단·신고 --------------------------------------------------------------------

def add_block(conn, user_id: str, blocked_id: str) -> None:
    """차단하면 친구·친구 요청도 함께 끊는다."""
    conn.execute("INSERT OR IGNORE INTO blocks (user_id, blocked_id) VALUES (?, ?)", (user_id, blocked_id))
    remove_friend(conn, user_id, blocked_id, commit=False)
    conn.commit()


def remove_block(conn, user_id: str, blocked_id: str) -> bool:
    cur = conn.execute("DELETE FROM blocks WHERE user_id = ? AND blocked_id = ?", (user_id, blocked_id))
    conn.commit()
    return cur.rowcount == 1


def my_blocks(conn, user_id: str) -> list[str]:
    """내가 차단한 사람 (최근 순)."""
    rows = conn.execute("SELECT blocked_id FROM blocks WHERE user_id = ? ORDER BY created_at DESC", (user_id,)).fetchall()
    return [r["blocked_id"] for r in rows]


def block_related(conn, user_id: str) -> set[str]:
    """차단 관계인 사람: 내가 차단했거나 나를 차단한 사람."""
    rows = conn.execute(
        "SELECT blocked_id AS id FROM blocks WHERE user_id = ? UNION SELECT user_id AS id FROM blocks WHERE blocked_id = ?",
        (user_id, user_id),
    ).fetchall()
    return {r["id"] for r in rows}


def add_report(conn, reporter_id: str, target_type: str, target_id: str, reason: str, detail: str | None,
               counted: bool = True) -> bool:
    """신고 저장. 처음 신고면 True (같은 사람이 같은 대상을 다시 신고하면 False)."""
    cur = conn.execute(
        "INSERT OR IGNORE INTO reports (reporter_id, target_type, target_id, reason, detail, counted) VALUES (?, ?, ?, ?, ?, ?)",
        (reporter_id, target_type, target_id, reason, detail, int(counted)),
    )
    conn.commit()
    return cur.rowcount == 1


def report_count(conn, target_type: str, target_id: str) -> int:
    row = conn.execute(
        "SELECT COUNT(DISTINCT reporter_id) AS n FROM reports WHERE target_type = ? AND target_id = ? AND counted = 1",
        (target_type, target_id),
    ).fetchone()
    return int(row["n"])


def ban_guestbook(conn, user_id: str, until: str, reason: str) -> None:
    conn.execute(
        "INSERT INTO guestbook_bans (user_id, until, reason) VALUES (?, ?, ?) "
        "ON CONFLICT(user_id) DO UPDATE SET until = MAX(until, excluded.until), reason = excluded.reason",
        (user_id, until, reason),
    )
    conn.commit()


def guestbook_ban_until(conn, user_id: str, date: str) -> str | None:
    """date에 방명록 쓰기가 정지돼 있으면 정지 마지막 날."""
    row = conn.execute("SELECT until FROM guestbook_bans WHERE user_id = ? AND until >= ?", (user_id, date)).fetchone()
    return row["until"] if row else None


# --- 쉬어 가기 ----------------------------------------------------------------------

def set_rest(conn, user_id: str, start: str, until: str) -> None:
    conn.execute(
        "INSERT INTO rests (user_id, start, until) VALUES (?, ?, ?) "
        "ON CONFLICT(user_id) DO UPDATE SET start = excluded.start, until = excluded.until",
        (user_id, start, until),
    )
    conn.commit()


def get_rest(conn, user_id: str) -> dict | None:
    row = conn.execute("SELECT start, until FROM rests WHERE user_id = ?", (user_id,)).fetchone()
    return dict(row) if row else None


def end_rest(conn, user_id: str, last_day: str) -> None:
    """쉬어 가기를 last_day까지로 줄인다 (일찍 끝내기)."""
    conn.execute("UPDATE rests SET until = MIN(until, ?) WHERE user_id = ?", (last_day, user_id))
    conn.commit()


# --- 주간 출석표 --------------------------------------------------------------------

def attendance_claims(conn, user_id: str, start: str, end: str) -> dict[str, dict]:
    rows = conn.execute("SELECT date, reward FROM attendance_log WHERE user_id = ? AND date BETWEEN ? AND ?", (user_id, start, end)).fetchall()
    return {r["date"]: json.loads(r["reward"]) for r in rows}


def add_attendance(conn, user_id: str, date: str, reward: dict) -> bool:
    cur = conn.execute("INSERT OR IGNORE INTO attendance_log (user_id, date, reward) VALUES (?, ?, ?)",
                       (user_id, date, json.dumps(reward, ensure_ascii=False)))
    conn.commit()
    return cur.rowcount == 1


# --- 미션 소감 ----------------------------------------------------------------------

def set_feedback(conn, user_id: str, date: str, mission_id: str, mood: int | None, text: str | None, expected: int | None) -> None:
    conn.execute(
        "INSERT INTO mission_feedback (user_id, date, mission_id, mood, text, expected) VALUES (?, ?, ?, ?, ?, ?) "
        "ON CONFLICT(user_id, date, mission_id) DO UPDATE SET mood = excluded.mood, text = excluded.text, "
        "expected = excluded.expected, updated_at = datetime('now')",
        (user_id, date, mission_id, mood, text, expected),
    )
    conn.commit()


def feedback_between(conn, user_id: str, start: str, end: str) -> list[dict]:
    rows = conn.execute(
        "SELECT date, mission_id, mood, text, expected, updated_at FROM mission_feedback "
        "WHERE user_id = ? AND date BETWEEN ? AND ? ORDER BY date DESC, created_at DESC",
        (user_id, start, end),
    ).fetchall()
    return [dict(r) for r in rows]


def feedback_ids(conn, user_id: str, date: str) -> set[str]:
    rows = conn.execute("SELECT mission_id FROM mission_feedback WHERE user_id = ? AND date = ?", (user_id, date)).fetchall()
    return {r["mission_id"] for r in rows}


def feedback_stats(conn) -> list[dict]:
    """미션별 소감 수와 평균 기분 (모든 사용자). 어떤 미션이 실제로 기분을 올리는지 보는 용도."""
    rows = conn.execute(
        "SELECT mission_id, COUNT(*) AS n, COUNT(mood) AS rated, ROUND(AVG(mood), 2) AS avg_mood "
        "FROM mission_feedback GROUP BY mission_id ORDER BY avg_mood DESC, n DESC"
    ).fetchall()
    return [dict(r) for r in rows]


# --- 처음 설문 ----------------------------------------------------------------------

def set_survey(conn, user_id: str, answers: dict) -> None:
    conn.execute(
        "INSERT INTO surveys (user_id, answers) VALUES (?, ?) "
        "ON CONFLICT(user_id) DO UPDATE SET answers = excluded.answers, updated_at = datetime('now')",
        (user_id, json.dumps(answers, ensure_ascii=False)),
    )
    conn.commit()


def get_survey(conn, user_id: str) -> dict | None:
    row = conn.execute("SELECT answers, updated_at FROM surveys WHERE user_id = ?", (user_id,)).fetchone()
    return {"answers": json.loads(row["answers"]), "updated_at": row["updated_at"]} if row else None


# --- 다시 돌아온 사용자 ------------------------------------------------------------

def last_active_before(conn, user_id: str, date: str) -> str | None:
    """date 전에 마지막으로 앱을 쓴 날 (미션을 받은 날)."""
    row = conn.execute("SELECT MAX(date) AS d FROM mission_days WHERE user_id = ? AND date < ?", (user_id, date)).fetchone()
    return row["d"]


def ledger_item(conn, user_id: str, date: str, item_id: str) -> dict | None:
    row = conn.execute(
        "SELECT coins, xp FROM coin_ledger WHERE user_id = ? AND date = ? AND item_id = ?", (user_id, date, item_id)
    ).fetchone()
    return dict(row) if row else None
