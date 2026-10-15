"""처음 설문: 지금 어떻게 지내는지 묻기 (콜드 스타트).

10/12 면담: "처음에 현재 상태를 묻고, 원래 하던 일을 늘리는 미션을 주자" → 10/6에 보류했던 설문을 다시 진행.
- 모든 질문은 건너뛸 수 있다 (답하지 않은 질문은 저장하지 않음). 나중에 설정에서 다시 고칠 수 있다.
- 답은 미션 고르기에만 쓰고 다른 사람에게 보이지 않는다.
- 지금 쓰는 곳: 걸음 기록이 아직 없는 날, 외출 빈도로 "안 나간 날/나간 날" 미션을 고름.
  관심 취미·평소 하는 일은 미션에 태그를 붙인 뒤 "하던 것 + 조금 더" 미션 고르기에 쓸 예정.
"""

from __future__ import annotations

# 질문 순서 그대로 앱에 보여 준다. multi: 여러 개 고르기 (max까지)
QUESTIONS = [
    {
        "id": "occupation",
        "title": "요즘 주로 어떻게 지내요?",
        "multi": False,
        "options": [
            {"id": "student", "label": "학생"},
            {"id": "job_seeking", "label": "취업·시험 준비"},
            {"id": "employed", "label": "직장인"},
            {"id": "part_time", "label": "아르바이트"},
            {"id": "not_working", "label": "쉬는 중"},       # '무직'보다 부드럽게
            {"id": "other", "label": "기타"},
        ],
    },
    {
        "id": "living",
        "title": "누구와 함께 살아요?",
        "multi": False,
        "options": [
            {"id": "alone", "label": "혼자"},
            {"id": "family", "label": "가족과"},
            {"id": "others", "label": "친구·룸메이트와"},
        ],
    },
    {
        "id": "pets",
        "title": "함께 지내는 반려동물이 있어요?",
        "multi": True,
        "max": 3,
        "options": [
            {"id": "dog", "label": "강아지"},
            {"id": "cat", "label": "고양이"},
            {"id": "other_pet", "label": "다른 동물"},
            {"id": "none", "label": "없어요"},
        ],
    },
    {
        "id": "outing",
        "title": "밖에 얼마나 자주 나가요?",
        "multi": False,
        "options": [
            {"id": "daily", "label": "거의 매일"},
            {"id": "few_week", "label": "일주일에 2~3번"},
            {"id": "weekly", "label": "일주일에 한 번쯤"},
            {"id": "few_month", "label": "한 달에 몇 번"},
            {"id": "rarely", "label": "거의 안 나가요"},
        ],
    },
    {
        "id": "interests",
        "title": "좋아하는 것을 골라 주세요",
        "multi": True,
        "max": 5,
        "options": [
            {"id": "game", "label": "게임"},
            {"id": "video", "label": "영상·드라마"},
            {"id": "music", "label": "음악"},
            {"id": "reading", "label": "책·웹툰"},
            {"id": "drawing", "label": "그림·만들기"},
            {"id": "cooking", "label": "요리·베이킹"},
            {"id": "exercise", "label": "운동"},
            {"id": "photo", "label": "사진"},
            {"id": "cafe", "label": "카페·맛집"},
            {"id": "nature", "label": "산책·자연"},
            {"id": "plants", "label": "식물 키우기"},
            {"id": "study", "label": "공부·자기계발"},
        ],
    },
    {
        "id": "routines",
        "title": "평소에 하고 있는 것을 골라 주세요",
        "multi": True,
        "max": 6,
        "options": [
            {"id": "shopping", "label": "장보기·편의점"},
            {"id": "housework", "label": "설거지·청소 같은 집안일"},
            {"id": "cooking", "label": "밥 해 먹기"},
            {"id": "walk", "label": "산책"},
            {"id": "pet_walk", "label": "반려동물 산책"},
            {"id": "exercise", "label": "운동"},
            {"id": "family_meal", "label": "가족과 식사"},
            {"id": "none", "label": "딱히 없어요"},
        ],
    },
]

BY_ID = {q["id"]: q for q in QUESTIONS}
EXCLUSIVE = "none"          # '없어요'는 다른 답과 같이 고를 수 없다

# 외출 빈도 → 걸음 기록이 없는 날 "나간 날"로 볼지
OFTEN_OUT = {"daily", "few_week"}


def clean(answers: dict) -> dict:
    """답을 확인하고 정리한다. 틀린 답이면 ValueError (메시지는 사용자에게 그대로 보여도 되는 말)."""
    out: dict = {}
    for qid, value in answers.items():
        q = BY_ID.get(qid)
        if q is None:
            raise ValueError(f"없는 질문입니다: {qid}")
        if value is None or value == []:
            continue                                   # 건너뜀
        allowed = {o["id"] for o in q["options"]}
        if not q["multi"]:
            if not isinstance(value, str) or value not in allowed:
                raise ValueError(f"'{q['title']}'에 없는 답입니다: {value}")
            out[qid] = value
            continue
        if not isinstance(value, list) or not all(isinstance(v, str) for v in value):
            raise ValueError(f"'{q['title']}'는 여러 개를 목록으로 보내 주세요.")
        picked = list(dict.fromkeys(value))
        unknown = [v for v in picked if v not in allowed]
        if unknown:
            raise ValueError(f"'{q['title']}'에 없는 답입니다: {unknown}")
        if EXCLUSIVE in picked and len(picked) > 1:
            raise ValueError(f"'{q['title']}'에서 '없어요'는 다른 답과 같이 고를 수 없어요.")
        if len(picked) > q["max"]:
            raise ValueError(f"'{q['title']}'는 {q['max']}개까지 고를 수 있어요.")
        out[qid] = picked
    return out


def goes_out_often(answers: dict | None) -> bool | None:
    """외출 빈도 답으로 본 '자주 나가는 사람'인지. 답이 없으면 None."""
    outing = (answers or {}).get("outing")
    if outing is None:
        return None
    return outing in OFTEN_OUT
