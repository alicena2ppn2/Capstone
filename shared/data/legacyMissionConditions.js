// Read-only compatibility for conditions already selected or started before compact cards.
// Not a new level selector or recommendation source.
const CONDITIONS = {
  "day-tidy": {
    "base": "물건 세 개를 제자리에 놓으면 완료예요.",
    "light": "물건 하나를 제자리에 놓아요."
  },
  "day-space": {
    "base": "손바닥 크기 공간 한 칸을 비우면 완료예요.",
    "light": "물건 하나만 옮겨요."
  },
  "day-cup": {
    "base": "사용한 컵 하나를 씻으면 완료예요.",
    "light": "컵 하나를 헹궈요."
  },
  "day-hobby": {
    "base": "내가 정한 짧은 만큼 취미를 하면 완료예요. 결과물은 필요 없어요.",
    "light": "취미 도구를 꺼내거나 첫 동작 하나를 해요."
  },
  "day-listen": {
    "base": "선택한 곡의 정한 구간을 들으면 완료예요.",
    "light": "좋아하는 부분 30초를 들어요."
  },
  "day-read": {
    "base": "짧은 글이나 책 한 쪽을 읽으면 완료예요.",
    "light": "한 문단을 읽어요."
  },
  "day-local": {
    "base": "생활권 소식 하나의 내용을 확인하면 완료예요. 참여는 필요 없어요.",
    "light": "소식 제목 하나를 확인해요."
  },
  "day-photo-detail": {
    "base": "집 안이나 주변에서 눈에 들어온 작은 물건 하나를 찍어 저장해요."
  },
  "day-photo-sky": {
    "base": "잠깐 밖에 나가 하늘을 찍고 사진을 저장해요. 거리는 내가 정해요."
  },
  "day-photo-leaf": {
    "base": "밖에서 만난 나무나 풀을 찍어 저장해요. 사람 얼굴은 담지 않아도 돼요."
  },
  "day-wake": {
    "base": "평소 시작 행동 하나를 하면 완료예요. 기상 시간을 평가하지 않아요.",
    "light": "가능한 시작 동작 하나만 해요."
  },
  "day-diary": {
    "base": "오늘 있었던 일이나 기분을 한 줄 저장해요."
  },
  "day-seasonal": {
    "base": "제철 음식 하나의 이름을 확인하면 완료예요. 먹거나 사지 않아도 돼요.",
    "light": "제철 음식 제목 하나를 확인해요."
  },
  "day-walk": {
    "base": "안전한 범위에서 밖의 공기를 맡고 돌아오면 완료예요.",
    "light": "문밖에서 잠깐 주변을 보고 돌아와요."
  },
  "day-more-steps": {
    "base": "선택한 1·5·10분 목표만큼 걸으면 완료예요."
  },
  "day-drink": {
    "base": "익숙한 가까운 장소를 잠깐 둘러보고 돌아오면 완료예요. 구매는 필요 없어요.",
    "light": "가까운 장소 앞까지만 다녀와요."
  },
  "day-place": {
    "base": "익숙한 길의 다른 골목이나 쉼터 한 곳을 둘러보면 완료예요.",
    "light": "가까운 익숙한 장소 앞까지만 다녀와요."
  },
  "day-greet": {
    "base": "자연스럽게 마주친 기회에 한 번 인사하면 완료예요.",
    "light": "고개로 가볍게 인사해요."
  },
  "day-checkin": {
    "base": "원하는 상대에게 안부 한 번을 보내면 완료예요. 답장은 필요 없어요.",
    "light": "편한 기회에 짧게 인사해요."
  },
  "day-thanks": {
    "base": "실제로 전하고 싶은 고마움을 한 번 표현하면 완료예요.",
    "light": "고마워요 한마디를 전해요."
  },
  "day-question": {
    "base": "관련 질문 하나를 남기면 완료예요. 답변은 필요 없어요.",
    "light": "자연스러운 대화에서 관련 질문 한마디를 해요."
  },
  "day-invite": {
    "base": "원하는 활동을 한 번 제안하면 완료예요. 성사는 필요 없어요.",
    "light": "관심 있는 활동 이야기를 한마디 꺼내요."
  },
  "day-door": {
    "base": "문밖에서 주변을 잠깐 보고 돌아오면 완료예요."
  },
  "day-nod": {
    "base": "자연스러운 기회에 눈인사 한 번을 하면 완료예요."
  },
  "day-water": {
    "base": "물 한 모금을 마시면 완료예요."
  }
};
export function legacyMissionCriterion(q,mode='base') {
  const condition=CONDITIONS[q.id]??{base:q.description};
  if(mode==='light')return condition.light??condition.base;
  if(mode==='extend')return `${condition.base} 원하면 같은 활동을 조금 더 이어 하거나 오늘 한 번 더 해요. 늘릴 범위는 내가 정해요.`;
  return condition.base;
}
