export const CATEGORIES = { prepare: '오늘의 준비', outside: '바깥 발견', connect: '작은 연결' };
const activityGroups = { 'day-wake':'start-day','day-water':'start-day','day-walk':'short-outing','day-door':'short-outing','day-more-steps':'short-outing','day-drink':'short-outing','day-place':'short-outing','day-greet':'greeting','day-nod':'greeting','day-checkin':'checkin','day-thanks':'thanks','day-question':'question','day-invite':'invite','day-seasonal':'seasonal' };
const action = (id, category, name, description, effort = 1, minutes = 5, extra = {}) => ({ id, activityGroup:activityGroups[id] ?? id, period: 'day', category, name, description, effort, minutes, xp: 15, coins: 25, ...extra });
export const DAILY_CHALLENGES = [
  action('day-tidy', 'prepare', "물건 세 개 제자리로", "가까이에 있는 물건 세 개를 원래 자리에 놓아 주세요.", 1, 3, { activityGroup:'tidy' }),
  action('day-space', 'prepare', "내 자리 한 칸 비우기", "책상이나 선반에서 손바닥 크기 공간 한 칸을 비워 주세요.", 1, 3, { activityGroup:'tidy' }),
  action('day-cup', 'prepare', "컵 하나 씻기", "사용한 컵 하나를 평소 방법으로 씻어 놓아 주세요.", 1, 3),
  action('day-hobby', 'prepare', "좋아하던 것 잠깐", "원래 즐기던 취미를 내가 정한 짧은 만큼 해 보세요.", 1, 5),
  action('day-listen', 'prepare', "익숙한 한 곡 듣기", "좋아하는 곡 하나의 듣고 싶은 구간을 들어 보세요.", 1, 5),
  action('day-read', 'prepare', "한 쪽 다시 읽기", "읽고 싶은 책이나 글 한 쪽을 읽어 주세요.", 1, 5),
  action('day-local', 'prepare', "생활권 소식 하나 보기", "관심 있는 공공시설 게시판이나 공식 페이지에서 소식 하나를 읽어 보세요.", 1, 3),
  action('day-photo-detail', 'prepare', "작은 발견 사진 남기기", "집 안이나 주변에서 눈에 들어온 물건 하나를 찍어 사진을 저장해 주세요.", 0, 2, { photo: true, activityGroup: 'photo-moment' }),
  action('day-photo-sky', 'outside', "오늘의 하늘 담기", "안전한 범위로 잠깐 나가 하늘 사진 한 장을 찍어 저장해 주세요.", 1, 3, { photo: true, activityGroup: 'photo-moment' }),
  action('day-photo-leaf', 'outside', "초록 한 장 발견하기", "밖에서 만난 나무나 풀 사진 한 장을 찍어 저장해 주세요.", 1, 3, { photo: true, activityGroup: 'photo-moment' }),
  action('day-wake', 'prepare', "내 하루 시작하기", "커튼 열기나 물 마시기처럼 평소 하루를 시작하던 행동 하나를 해 보세요."),
  action('day-diary', 'prepare', '오늘의 하루 기록하기', '오늘 있었던 일이나 기분을 한 줄 저장해요.', 1, 3, { input: true }),
  action('day-seasonal', 'prepare', "제철 음식 알아보기", "구매하거나 먹을 필요 없이 제철 음식 하나의 이름을 찾아 확인해 주세요."),
  action('day-walk', 'outside', "잠깐 밖에 나가보기", "거리와 시간은 편한 만큼 정해 집 밖에서 공기를 맡고 돌아오세요.", 1, 3),
  action('day-more-steps', 'outside', "내 만큼 걸어 보기", "1·5·10분 중 오늘 가능한 목표를 골라 정한 만큼 걸어 주세요.", 1, 5, { choices: ['1분', '5분', '10분'] }),
  action('day-drink', 'outside', "동네 둘러보기", "구매하지 않아도 괜찮으니 익숙한 가까운 가게나 장소를 잠깐 둘러보고 돌아오세요.", 1, 5),
  action('day-place', 'outside', "다른 길 만나기", "안전한 익숙한 길에서 다른 골목이나 공공 쉼터 한 곳을 잠깐 둘러보세요.", 2, 10),
  action('day-greet', 'connect', "짧은 인사 건네기", "자연스럽게 마주친 사람에게 “안녕하세요”라고 한 번 인사해 보세요.", 1, 3),
  action('day-checkin', 'connect', "안부 한 줄 보내기", "답장은 없어도 괜찮으니 연락하고 싶은 사람에게 “잘 지내?”처럼 안부 한 번을 전해 보세요.", 1, 3),
  action('day-thanks', 'connect', "고마움 표현하기", "도움을 준 사람에게 “덕분에 도움이 됐어요”처럼 고마움을 한 번 전해 보세요.", 1, 3),
  action('day-question', 'connect', "관심사 질문 남기기", "이용하는 관심사 커뮤니티에 궁금한 질문 하나를 남겨 주세요.", 2, 5),
  action('day-invite', 'connect', "함께할 활동 제안하기", "성사되지 않아도 괜찮으니 원하는 상대나 커뮤니티에 “같이 해볼까요?”처럼 활동을 한 번 제안해 보세요.", 2, 10),
  action('day-door', 'outside', "문밖 한 걸음", "안전하게 문밖으로 나가 주변을 잠깐 보고 돌아오세요.", 0, 1),
  action('day-nod', 'connect', "눈인사 건네기", "자연스럽게 마주친 사람에게 고개를 가볍게 끄덕여 한 번 인사해 보세요.", 0, 1),
  action('day-water', 'prepare', "물 한 모금", "편하게 마실 수 있는 물 한 모금을 마셔 주세요.", 0, 1),
];
export const GOALS = [
  { id: 'week-walk', period: 'week', name: '이번 주 바깥 발견', category: 'outside', target: 2, description: '이번 주 외출 완료 기록 2회', xp: 30, coins: 30 },
  { id: 'week-diary', period: 'week', name: '이번 주 하루 기록', journal: true, target: 3, description: '서로 다른 날짜에 하루 기록 3일', xp: 30, coins: 30 },
  { id: 'week-connect', period: 'week', name: '이번 주 작은 연결', category: 'connect', target: 2, description: '이번 주 교류 완료 기록 2회', xp: 30, coins: 30 },
  { id: 'month-place', period: 'month', name: '이번 달 바깥 발견', category: 'outside', target: 8, description: '이번 달 외출 완료 기록 8회', xp: 60, coins: 60 },
  { id: 'month-diary', period: 'month', name: '이번 달 하루 기록', journal: true, target: 10, description: '서로 다른 날짜에 하루 기록 10일', xp: 60, coins: 60 },
];
export const CHALLENGES = [...DAILY_CHALLENGES, ...GOALS];
