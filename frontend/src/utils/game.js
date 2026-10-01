export const XP_PER_LEVEL = 100;
export const CHARACTERS = [
  { id: 'potato', name: '꼬질 감자 모찌', level: 1, price: 0, color: '#D6AE7F', method: 'starter' },
  { id: 'pink', name: '복숭아 구름 모찌', level: 3, price: 0, color: '#F9D4E2', method: 'milestone' },
  { id: 'mochi', name: '구름 모찌', level: 5, price: 300, color: '#FFF5E6' },
  { id: 'lavender', name: '라벤더 모찌', level: 8, price: 450, color: '#E3D9F7' },
  { id: 'mint', name: '민트 모찌', level: 12, price: 600, color: '#CDEFE0' },
  { id: 'sky', name: '하루 친구 모찌', level: 1, price: 0, color: '#D3E8FA', method: 'quest' },
];
export const QUESTS = [
  { id: 'day-walk', period: 'day', name: '잠깐 밖에 나가보기', description: '집 앞에서 짧게 산책해요.', xp: 100, coins: 30 },
  { id: 'day-wake', period: 'day', name: '내 시간에 일어나기', description: '오늘 하루를 천천히 시작해요.', xp: 100, coins: 30 },
  { id: 'day-diary', period: 'day', name: '오늘의 하루 기록하기', description: '오늘의 기분을 한 줄 남겨요.', xp: 100, coins: 40 },
  { id: 'week-walk', period: 'week', name: '이번 주 산책 두 번', description: '가까운 곳도 좋아요.', xp: 150, coins: 50 },
  { id: 'week-wake', period: 'week', name: '일정한 생활 리듬 만들기', description: '이번 주 3일은 비슷한 시간에 일어나요.', xp: 150, coins: 50 },
  { id: 'week-diary', period: 'week', name: '하루 기록 다섯 번', description: '작은 일상을 차곡차곡 모아요.', xp: 150, coins: 50 },
  { id: 'month-place', period: 'month', name: '새로운 장소 가보기', description: '낯선 풍경을 하나 만나봐요.', xp: 200, coins: 80 },
  { id: 'month-rhythm', period: 'month', name: '꾸준한 생활 이어가기', description: '나만의 리듬을 두 주 동안 지켜요.', xp: 200, coins: 80 },
  { id: 'month-diary', period: 'month', name: '한 달 기록 열다섯 번', description: '지난 하루를 돌아봐요.', xp: 200, coins: 80 },
];
export const levelFor = (xp) => 1 + Math.floor(xp / XP_PER_LEVEL);
export const initialGame = () => ({ xp: 0, coins: 540, completed: [], characters: ['potato'], character: 'potato' });
export function completeQuest(state, id) {
  const quest = QUESTS.find((item) => item.id === id);
  if (!quest || state.completed.includes(id)) return state;
  const next = { ...state, xp: state.xp + quest.xp, coins: state.coins + quest.coins, completed: [...state.completed, id] };
  if (levelFor(next.xp) >= 3 && !next.characters.includes('pink')) next.characters = [...next.characters, 'pink'];
  if (QUESTS.filter((item) => item.period === 'day').every((item) => next.completed.includes(item.id)) && !next.characters.includes('sky')) next.characters = [...next.characters, 'sky'];
  return next;
}
export function buyCharacter(state, id) {
  const item = CHARACTERS.find((entry) => entry.id === id);
  if (!item || item.method || levelFor(state.xp) < item.level || state.coins < item.price || state.characters.includes(id)) return state;
  return { ...state, coins: state.coins - item.price, characters: [...state.characters, id] };
}
export function equipCharacter(state, id) {
  return id === null || state.characters.includes(id) ? { ...state, character: id } : state;
}
