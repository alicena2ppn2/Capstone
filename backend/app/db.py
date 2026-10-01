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
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    PRIMARY KEY (user_id, date, item_id)
);
CREATE TABLE IF NOT EXISTS photos (
    id           TEXT PRIMARY KEY,        -- uuid
    user_id      TEXT NOT NULL,
    filename     TEXT NOT NULL,           -- 업로드 폴더 안 파일 이름
    content_type TEXT NOT NULL,
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
CREATE TABLE IF NOT EXISTS guestbook (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    owner_id   TEXT NOT NULL,            -- 방 주인
    author     TEXT NOT NULL,
    text       TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
"""


def connect(path: str | os.PathLike | None = None) -> sqlite3.Connection:
    path = path or os.environ.get("CAPSTONE_DB") or DEFAULT_PATH
    conn = sqlite3.connect(path, check_same_thread=False)
    conn.row_factory = sqlite3.Row
    conn.executescript(SCHEMA)
    return conn


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
        "INSERT OR IGNORE INTO coin_ledger (user_id, date, item_id, coins) VALUES (?, ?, ?, ?)",
        [(user_id, date, i["id"], i["coins"]) for i in items],
    )
    conn.commit()


def coin_balance(conn, user_id: str) -> int:
    row = conn.execute("SELECT COALESCE(SUM(coins), 0) AS total FROM coin_ledger WHERE user_id = ?", (user_id,)).fetchone()
    return int(row["total"])


# --- 사진 ------------------------------------------------------------------------

def add_photo(conn, photo_id: str, user_id: str, filename: str, content_type: str) -> None:
    conn.execute(
        "INSERT INTO photos (id, user_id, filename, content_type) VALUES (?, ?, ?, ?)",
        (photo_id, user_id, filename, content_type),
    )
    conn.commit()


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


# --- 방명록 -----------------------------------------------------------------------

def add_guestbook(conn, owner_id: str, author: str, text: str) -> dict:
    cur = conn.execute("INSERT INTO guestbook (owner_id, author, text) VALUES (?, ?, ?)", (owner_id, author, text))
    conn.commit()
    row = conn.execute("SELECT * FROM guestbook WHERE id = ?", (cur.lastrowid,)).fetchone()
    return dict(row)


def list_guestbook(conn, owner_id: str, limit: int = 20, offset: int = 0) -> list[dict]:
    rows = conn.execute(
        "SELECT * FROM guestbook WHERE owner_id = ? ORDER BY id DESC LIMIT ? OFFSET ?",
        (owner_id, limit, offset),
    ).fetchall()
    return [dict(r) for r in rows]
