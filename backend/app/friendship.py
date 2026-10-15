"""친밀도: 두 사람이 서로 방문·방명록·좋아요를 할수록 관계 레벨이 오른다.

- 10/15부터 친구가 아니어도 쌓인다 (서로 얼마나 교류했는지가 기준). 레벨이 오를 때 코인은 친구(수락된 사이)일 때만 준다
- 같은 사람이 같은 사람에게 하루에 방명록 1번(+2점), 방문 1번(+1점), 좋아요 1번(+1점)까지만 센다 (반복으로 점수 모으기 방지)
- 두 사람이 서로 한 활동이 한 점수로 합쳐진다 → 서로 오가야 빨리 오른다
- 레벨 보상은 관계마다 한 번만 (친구를 끊었다 다시 맺어도 다시 받지 않음)
"""

from __future__ import annotations

POINTS = {"guestbook": 2, "visit": 1, "like": 1}

# (레벨, 이름, 필요한 누적 점수, 오를 때 두 사람이 각각 받는 코인)
LEVELS = [
    (1, "새 친구", 0, 0),
    (2, "아는 사이", 4, 20),
    (3, "친한 친구", 12, 40),
    (4, "단짝", 24, 60),
    (5, "베스트 프렌드", 40, 100),
]


def level_from_points(points: int) -> dict:
    current = LEVELS[0]
    for lv in LEVELS:
        if points >= lv[2]:
            current = lv
    nxt = next((lv for lv in LEVELS if lv[0] == current[0] + 1), None)
    return {
        "level": current[0],
        "name": current[1],
        "points": points,
        "next_level_at": nxt[2] if nxt else None,
        "points_to_next": nxt[2] - points if nxt else 0,
        "next_reward": nxt[3] if nxt else 0,
    }


def reward_for(level: int) -> int:
    return next(lv[3] for lv in LEVELS if lv[0] == level)


def reward_item(friend_id: str, level: int) -> str:
    """코인 장부 항목 id. 관계·레벨마다 한 번만 지급하는 데 쓴다."""
    return f"friend:{friend_id}:lv{level}"
