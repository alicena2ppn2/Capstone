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
    slot    TEXT NOT NULL,                -- lamp | carpet | frame | doll | scenery
    item_id TEXT NOT NULL,
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


def create_user(conn, user_id: str, nickname: str) -> dict:
    conn.execute(
        "INSERT INTO users (id, nickname, nickname_key) VALUES (?, ?, ?)",
        (user_id, nickname, nickname_key(nickname)),
    )
    conn.commit()
    return get_user(conn, user_id)


def get_user(conn, user_id: str) -> dict | None:
    row = conn.execute("SELECT id, nickname, game_center_id, created_at, updated_at FROM users WHERE id = ?", (user_id,)).fetchone()
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


def nicknames(conn, user_ids: list[str]) -> dict[str, str]:
    if not user_ids:
        return {}
    marks = ",".join("?" * len(user_ids))
    rows = conn.execute(f"SELECT id, nickname FROM users WHERE id IN ({marks})", tuple(user_ids)).fetchall()
    return {r["id"]: r["nickname"] for r in rows}


def delete_user(conn, user_id: str) -> list[str]:
    """사용자와 그 사람의 기록을 모두 지운다. 지울 사진 파일 이름을 돌려준다.

    남의 방에 남긴 방명록·방문 기록도 지운다 (계정 삭제 = 흔적까지 삭제).
    """
    photos = [r["filename"] for r in conn.execute("SELECT filename FROM photos WHERE user_id = ?", (user_id,))]
    for sql in (
        "DELETE FROM steps WHERE user_id = ?",
        "DELETE FROM mission_days WHERE user_id = ?",
        "DELETE FROM completions WHERE user_id = ?",
        "DELETE FROM coin_ledger WHERE user_id = ?",
        "DELETE FROM photos WHERE user_id = ?",
        "DELETE FROM diary WHERE user_id = ?",
    ):
        conn.execute(sql, (user_id,))
    conn.execute("DELETE FROM visits WHERE owner_id = ? OR visitor_id = ?", (user_id, user_id))
    conn.execute("DELETE FROM guestbook WHERE owner_id = ? OR author_id = ?", (user_id, user_id))
    conn.execute("DELETE FROM inventory WHERE user_id = ?", (user_id,))
    conn.execute("DELETE FROM equipped WHERE user_id = ?", (user_id,))
    conn.execute("DELETE FROM decor_placement WHERE user_id = ?", (user_id,))
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
    return {"date": date, "stayed_home": None if home is None else bool(home), "missions": json.loads(row["missions"])}


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


def completed_ids(conn, user_id: str, date: str) -> set[str]:
    rows = conn.execute("SELECT mission_id FROM completions WHERE user_id = ? AND date = ?", (user_id, date)).fetchall()
    return {r["mission_id"] for r in rows}


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


def list_guestbook(conn, owner_id: str, limit: int = 20, offset: int = 0) -> list[dict]:
    rows = conn.execute(
        "SELECT * FROM guestbook WHERE owner_id = ? ORDER BY id DESC LIMIT ? OFFSET ?",
        (owner_id, limit, offset),
    ).fetchall()
    return [dict(r) for r in rows]
