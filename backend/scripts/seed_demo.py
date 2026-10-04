"""시연용 데이터 만들기.

실제 API를 호출해서 기록을 쌓는다 → 미션 판정·코인·경험치·레벨·상점 지급이 실제 규칙 그대로 계산된다.

시나리오
- 주인공(demo-mochi): 3주 전엔 거의 집에만 있다가, 조금씩 걷고 미션을 해내는 회복 이야기
- 친구 3명: 주인공 방에 놀러 오고 방명록을 남긴다. 주인공도 친구 방에 놀러 간다
- 오늘(기준일)은 비워 둔다 → 시연 때 직접 걸음 올리기·미션 완료를 보여 준다

실행 (backend 폴더에서)
    python scripts/seed_demo.py                 # 서울 기준 오늘을 기준일로, 21일치
    python scripts/seed_demo.py --date 2026-10-22 --days 28
    CAPSTONE_DB=demo.db python scripts/seed_demo.py   # 다른 DB 파일에 만들기

같은 사용자 id가 이미 있으면 지우고 다시 만든다 (데모 사용자만 지움).
"""

from __future__ import annotations

import argparse
import random
import struct
import sys
import zlib
from datetime import date as Date, timedelta
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from fastapi.testclient import TestClient  # noqa: E402

from app import db  # noqa: E402
from app.main import app, seoul_today  # noqa: E402

HERO = ("demo-mochi", "모찌주인")
FRIENDS = [("demo-haneul", "하늘이"), ("demo-walker", "산책왕"), ("demo-slow", "느림보")]

DIARY = [
    "오늘은 창문을 열어 두고 오래 앉아 있었다. 바람이 생각보다 시원했다.",
    "집 앞 편의점까지 다녀왔다. 별거 아닌데 조금 뿌듯했다.",
    "아침에 일어나기가 힘들었지만 이불은 갰다.",
    "모찌가 칭찬해 줘서 기분이 좋았다.",
    "동네 빵집 소금빵이 맛있었다. 다음에 또 가야지.",
    "오랜만에 햇볕을 쬐었다. 머리가 맑아지는 느낌.",
    "친구 방에 놀러 가서 방명록을 남겼다. 답장이 와서 반가웠다.",
    "오늘은 좀 지쳤다. 그래도 일기는 쓴다.",
    "공원 벤치에 앉아서 강아지 구경을 했다.",
    "어제보다 많이 걸었다! 다리는 아프지만 기분은 좋다.",
    "좋아하는 노래를 들으면서 산책했다.",
    "제철 귤을 먹었다. 겨울이 오는 것 같다.",
]
MOODS = ["좋음", "보통", "피곤", "뿌듯", "차분"]
GUESTBOOK = [
    "놀러 왔어요! 방이 아늑하네요 :)",
    "오늘도 화이팅이에요!",
    "모찌 너무 귀여워요",
    "어제 산책 같이 해서 좋았어요",
    "창가 화분 예뻐요!",
    "천천히 해도 괜찮아요. 응원해요",
    "오늘 걸음 수 대단해요!",
]
LISTS = {
    "local_food": ["망원 칼국수", "골목 김밥", "소금빵 베이커리", "할머니 순댓국", "동네 돈가스"],
    "movies": ["바다의 시간", "작은 우주", "11월의 정원", "달리기 클럽"],
    "music": ["봄날", "밤편지", "Lovers Rock", "그대라는 사치", "Sunday Morning"],
    "cafes": ["창가 카페", "모퉁이 커피", "초록 라떼집"],
    "bakeries": ["소금빵 베이커리", "아침빵집", "동네 제과점"],
}
ANSWERS = {"local_food": "망원동", "music": "인디·발라드", "cafes": "망원동", "bakeries": "망원동"}
LIST_FALLBACK = ["첫 번째", "두 번째", "세 번째", "네 번째"]
TEXTS = ["산책하면서 본 하늘이 예뻤다", "괜찮은 하루", "작은 일 하나 해냈다", "뿌듯", "내일은 조금 더"]


def png(rgb: tuple[int, int, int], size: int = 64) -> bytes:
    """단색 PNG (사진 미션 시연용 자리표시 이미지)."""
    raw = b"".join(b"\x00" + bytes(rgb) * size for _ in range(size))

    def chunk(tag: bytes, data: bytes) -> bytes:
        return struct.pack(">I", len(data)) + tag + data + struct.pack(">I", zlib.crc32(tag + data) & 0xFFFFFFFF)

    return (b"\x89PNG\r\n\x1a\n" + chunk(b"IHDR", struct.pack(">IIBBBBB", size, size, 8, 2, 0, 0, 0))
            + chunk(b"IDAT", zlib.compress(raw)) + chunk(b"IEND", b""))


class Seeder:
    def __init__(self, client: TestClient, rng: random.Random):
        self.c = client
        self.rng = rng

    def ok(self, r, *allowed):
        if r.status_code not in (200, 201, *allowed):
            raise RuntimeError(f"{r.request.method} {r.request.url} → {r.status_code} {r.text}")
        return r

    def reset(self, user_id: str, nickname: str):
        if self.c.get(f"/users/{user_id}").status_code == 200:
            self.ok(self.c.delete(f"/users/{user_id}"))
        db.create_user(app.state.conn, user_id, nickname)   # 시연용이라 id를 고정

    def photo(self, user_id: str) -> str:
        color = self.rng.choice([(168, 211, 244), (247, 184, 204), (185, 221, 165), (255, 231, 154)])
        r = self.c.post(f"/users/{user_id}/photos", files={"file": ("demo.png", png(color), "image/png")})
        return self.ok(r).json()["photo_id"]

    def do_mission(self, user_id: str, m: dict, date: str, friends: list[str]):
        q = {"date": date}
        kind = m["kind"]
        if kind == "checkin":
            self.ok(self.c.post(f"/users/{user_id}/attendance", params=q))
        elif kind == "diary":
            body = {"text": self.rng.choice(DIARY), "use_topic": self.rng.random() < 0.6, "mood": self.rng.choice(MOODS)}
            self.ok(self.c.put(f"/users/{user_id}/diary/{date}", json=body))
        elif kind == "visit":
            self.ok(self.c.post(f"/users/{self.rng.choice(friends)}/visits", params=q, json={"visitor_id": user_id}))
        elif kind == "guestbook":
            body = {"text": self.rng.choice(GUESTBOOK), "author_id": user_id}
            self.ok(self.c.post(f"/users/{self.rng.choice(friends)}/guestbook", params=q, json=body))
        else:
            body: dict = {}
            if kind == "photo":
                body["photos"] = [self.photo(user_id) for _ in range(m["min_count"])]
            elif kind == "list":
                pool = LISTS.get(m["id"], LIST_FALLBACK)
                body["items"] = self.rng.sample(pool, k=min(len(pool), max(m["min_count"], 3)))
            elif kind == "text":
                body["text"] = self.rng.choice(TEXTS)
            if m.get("prompt"):
                body["answer"] = ANSWERS.get(m["id"], "서울")
            # 걸음 미션은 그날 걸음이 모자라면 422 → 실패한 날로 둔다
            self.ok(self.c.post(f"/users/{user_id}/missions/{m['id']}/complete", params=q, json=body), 422)

    def live_day(self, user_id: str, date: str, steps: int, do_rate: float, friends: list[str]):
        """하루: 걸음 올리기 → 미션 받기 → do_rate 확률로 각 미션 수행."""
        self.ok(self.c.post(f"/users/{user_id}/steps", json={"date": date, "steps": steps}))
        missions = self.ok(self.c.get(f"/users/{user_id}/missions/today", params={"date": date})).json()["missions"]
        for m in missions:
            if m["kind"] == "checkin" or self.rng.random() < do_rate:
                self.do_mission(user_id, m, date, friends)


def hero_plan(days: int, rng: random.Random) -> list[tuple[int, float]]:
    """(걸음, 미션 수행 확률) — 처음엔 집에만, 점점 회복."""
    plan = []
    for i in range(days):
        t = i / max(1, days - 1)                     # 0 → 1
        base = 900 + t * 8200                        # 900보 → 9,100보
        steps = max(150, int(rng.gauss(base, base * 0.18)))
        rate = 0.35 + 0.55 * t                       # 35% → 90%
        plan.append((steps, rate))
    return plan


def seed(target: Date, days: int, seed_value: int = 22) -> dict:
    rng = random.Random(seed_value)
    with TestClient(app) as client:
        s = Seeder(client, rng)
        for uid, name in [HERO, *FRIENDS]:
            s.reset(uid, name)
        friend_ids = [f[0] for f in FRIENDS]
        start = target - timedelta(days=days)
        hero = hero_plan(days, rng)

        for i in range(days):
            date = (start + timedelta(days=i)).isoformat()
            # 친구들: 꾸준히 걷고, 주인공 방에 자주 들른다
            for uid in friend_ids:
                others = [HERO[0]] + [f for f in friend_ids if f != uid]
                s.live_day(uid, date, int(rng.gauss(7000, 1500)), 0.6, others)
                if rng.random() < 0.5:
                    s.ok(client.post(f"/users/{HERO[0]}/visits", params={"date": date}, json={"visitor_id": uid}))
                if rng.random() < 0.35:
                    s.ok(client.post(f"/users/{HERO[0]}/guestbook", params={"date": date},
                                     json={"text": rng.choice(GUESTBOOK), "author_id": uid}))
            steps, rate = hero[i]
            s.live_day(HERO[0], date, steps, rate, friend_ids)

        # 시연 당일: 오늘 미션만 미리 정해 두고(어제 걸음 기준) 수행은 하지 않는다
        today = target.isoformat()
        missions = client.get(f"/users/{HERO[0]}/missions/today", params={"date": today}).json()["missions"]
        summary = {
            "target_date": today,
            "days": days,
            "hero": client.get(f"/users/{HERO[0]}").json(),
            "coins": client.get(f"/users/{HERO[0]}/coins").json()["coins"],
            "owned_characters": [c["id"] for c in client.get(f"/users/{HERO[0]}/shop").json()["characters"] if c["status"] == "owned"],
            "diaries": len(client.get(f"/users/{HERO[0]}/diary", params={"from": start.isoformat(), "to": today}).json()["entries"]),
            "guestbook": len(client.get(f"/users/{HERO[0]}/guestbook", params={"per_page": 50}).json()["entries"]),
            "today_missions": [m["title"] for m in missions],
            "friends": [{"id": f[0], "nickname": f[1]} for f in FRIENDS],
        }
    return summary


def main():
    p = argparse.ArgumentParser(description="시연용 데이터 만들기")
    p.add_argument("--date", help="기준일(시연 당일) YYYY-MM-DD. 기본: 서울 기준 오늘")
    p.add_argument("--days", type=int, default=21, help="기준일 전 며칠치 기록을 만들지 (기본 21)")
    p.add_argument("--seed", type=int, default=22, help="무작위 시드 (같은 값이면 같은 데이터)")
    a = p.parse_args()
    target = Date.fromisoformat(a.date) if a.date else seoul_today()
    r = seed(target, a.days, a.seed)

    lv = r["hero"]["level"]
    print(f"기준일 {r['target_date']} · {r['days']}일치 기록")
    print(f"주인공 {r['hero']['nickname']} (id: {r['hero']['id']}) — LV.{lv['level']} · 코인 {r['coins']}")
    print(f"  보유 캐릭터: {', '.join(r['owned_characters'])}")
    print(f"  일기 {r['diaries']}편 · 받은 방명록 {r['guestbook']}개")
    print(f"  오늘 미션: {' / '.join(r['today_missions'])}")
    print("친구: " + ", ".join(f"{f['nickname']}({f['id']})" for f in r["friends"]))


if __name__ == "__main__":
    main()
