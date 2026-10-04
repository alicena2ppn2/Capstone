import { seoulDateKey, attendanceWeek } from './seoulDate.js';
import { CLOTHES } from './clothes.js';
import { DECOR } from './decor.js';

export const XP_PER_LEVEL = 100;
export const CHARACTERS = [
  { id: 'potato', name: '꼬질 감자 모찌', level: 1, price: 0, color: '#D6AE7F', method: 'starter' },
  { id: 'pink', name: '복숭아 토끼 모찌', level: 3, price: 0, color: '#FFE4D9', method: 'milestone' },
  { id: 'mochi', name: '구름 모찌', level: 5, price: 300, color: '#FFF5E6' },
  { id: 'lavender', name: '달빛 양 모찌', level: 8, price: 450, color: '#F3EDFF' },
  { id: 'mint', name: '새잎 거북 모찌', level: 12, price: 600, color: '#D9EDBC' },
  { id: 'sky', name: '하루 펭귄 모찌', level: 1, price: 0, color: '#D9EAF5', method: 'quest' },
];
export const QUESTS = [
  { id: 'day-walk', period: 'day', name: '잠깐 밖에 나가보기', description: '집 앞에서 짧게 산책해요.', xp: 100, coins: 30 },
  { id: 'day-wake', period: 'day', name: '내 시간에 일어나기', description: '오늘 하루를 천천히 시작해요.', xp: 100, coins: 30 },
  { id: 'day-diary', period: 'day', name: '오늘의 하루 기록하기', description: '오늘의 기분을 한 줄 남겨요.', xp: 100, coins: 40 },
  { id: 'day-music', period: 'day', name: '좋아하는 음악 장르 입력', description: '내가 좋아하는 음악 장르를 남겨요.', input: true, xp: 100, coins: 30 },
  { id: 'day-food', period: 'day', name: '가장 좋아하는 음식 적기', description: '생각만 해도 기분 좋아지는 음식은 무엇인가요?', input: true, xp: 100, coins: 30 },
  { id: 'day-more-steps', period: 'day', name: '어제보다 더 많이 걸어 보기', description: '내 페이스대로 어제보다 조금 더 걸어봐요.', xp: 100, coins: 30 },
  { id: 'day-seasonal', period: 'day', name: '제철음식 먹어 보기', description: '오늘 한 끼에 제철 음식을 만나봐요.', xp: 100, coins: 30 },
  { id: 'day-drink', period: 'day', name: '좋아하는 음료수 직접 사 오기', description: '좋아하는 음료를 직접 골라 사 와요.', xp: 100, coins: 30 },
  { id: 'week-walk', period: 'week', name: '이번 주 산책 두 번', description: '가까운 곳도 좋아요.', xp: 150, coins: 50 },
  { id: 'week-wake', period: 'week', name: '일정한 생활 리듬 만들기', description: '이번 주 3일은 비슷한 시간에 일어나요.', xp: 150, coins: 50 },
  { id: 'week-diary', period: 'week', name: '하루 기록 다섯 번', description: '작은 일상을 차곡차곡 모아요.', xp: 150, coins: 50 },
  { id: 'month-place', period: 'month', name: '새로운 장소 가보기', description: '낯선 풍경을 하나 만나봐요.', xp: 200, coins: 80 },
  { id: 'month-rhythm', period: 'month', name: '꾸준한 생활 이어가기', description: '나만의 리듬을 두 주 동안 지켜요.', xp: 200, coins: 80 },
  { id: 'month-diary', period: 'month', name: '한 달 기록 열다섯 번', description: '지난 하루를 돌아봐요.', xp: 200, coins: 80 },
];
export const levelFor = (xp) => 1 + Math.floor(xp / XP_PER_LEVEL);
export const initialGame = () => ({ xp: 0, coins: 540, completed: [], characters: ['potato'], character: 'potato', attendance: {}, questAnswers: {} });
export function questCompletionKey(quest, dayKey = seoulDateKey()) {
  return quest.period === 'day' ? `${dayKey}:${quest.id}` : quest.id;
}
export function grantMilestone(state) {
  return levelFor(state.xp) >= 3 && !state.characters.includes('pink') ? { ...state, characters: [...state.characters, 'pink'] } : state;
}
export function completeQuest(state, id, now = new Date(), answer = '') {
  const quest = QUESTS.find((item) => item.id === id);
  if (!quest) return state;
  const dayKey = seoulDateKey(now);
  const key = questCompletionKey(quest, dayKey);
  const text = typeof answer === 'string' ? answer.trim().slice(0, 80) : '';
  if (state.completed.includes(key) || (quest.input && !text)) return state;
  const next = { ...state, xp: state.xp + quest.xp, coins: state.coins + quest.coins, completed: [...state.completed, key], questAnswers: { ...state.questAnswers, ...(quest.input ? { [key]: text } : {}) } };
  if (QUESTS.filter((item) => item.period === 'day' && next.completed.includes(questCompletionKey(item, dayKey))).length >= 3 && !next.characters.includes('sky')) next.characters = [...next.characters, 'sky'];
  return grantMilestone(next);
}

export const ATTENDANCE_REWARDS = [
  { type: 'coins', amount: 10 }, { type: 'coins', amount: 20 }, { type: 'coins', amount: 30 },
  { type: 'xp', amount: 20 }, { type: 'xp', amount: 35 }, { type: 'xp', amount: 50 },
];
export function randomAttendanceReward() {
  return ATTENDANCE_REWARDS[Math.floor(Math.random() * ATTENDANCE_REWARDS.length)];
}
export function ensureAttendanceWeek(state, dayKey, random = Math.random) {
  const days = attendanceWeek(dayKey);
  const monday = days[0];
  if (state.attendancePlans?.[monday]) return state;
  const plan = {};
  let previous;
  for (const day of days) {
    const roll = random();
    let reward = roll < .1
      ? { type: 'outfit', id: CLOTHES[Math.floor(random() * CLOTHES.length)].id }
      : roll < .2 ? { type: 'decor', id: DECOR[Math.floor(random() * DECOR.length)].id }
      : { ...ATTENDANCE_REWARDS[Math.floor(random() * ATTENDANCE_REWARDS.length)] };
    if (previous && JSON.stringify(previous) === JSON.stringify(reward)) {
      reward = { ...ATTENDANCE_REWARDS.find(item => item.type !== previous.type) };
    }
    plan[day] = state.attendance?.[day] ?? reward;
    previous = plan[day];
  }
  return { ...state, attendancePlans: { ...state.attendancePlans, [monday]: plan } };
}
export function claimAttendance(state, dayKey, reward) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dayKey) || state.attendance?.[dayKey]) return state;
  reward = state.attendancePlans?.[attendanceWeek(dayKey)[0]]?.[dayKey] ?? reward;
  const clothing = reward?.type === 'outfit' && CLOTHES.find(item => item.id === reward.id);
  const decoration = reward?.type === 'decor' && DECOR.find(item => item.id === reward.id);
  if (!clothing && !decoration && !ATTENDANCE_REWARDS.some((item) => item.type === reward?.type && item.amount === reward?.amount)) return state;
  if (clothing && state.attendanceClothes?.includes(reward.id)) reward = { type: 'coins', amount: 30, duplicateOutfit: clothing.name };
  if (decoration && state.ownedDecor?.includes(reward.id)) reward = { type: 'coins', amount: 30, duplicateDecor: decoration.name };
  return grantMilestone({
    ...state,
    coins: state.coins + (reward.type === 'coins' ? reward.amount : 0),
    xp: state.xp + (reward.type === 'xp' ? reward.amount : 0),
    attendanceClothes: reward.type === 'outfit' ? [...(state.attendanceClothes ?? []), reward.id] : (state.attendanceClothes ?? []),
    ownedDecor: reward.type === 'decor' ? [...(state.ownedDecor ?? []), reward.id] : (state.ownedDecor ?? []),
    attendance: { ...state.attendance, [dayKey]: { ...reward } },
  });
}
export function buyCharacter(state, id) {
  const item = CHARACTERS.find((entry) => entry.id === id);
  if (!item || item.method || levelFor(state.xp) < item.level || state.coins < item.price || state.characters.includes(id)) return state;
  return { ...state, coins: state.coins - item.price, characters: [...state.characters, id] };
}
export function equipCharacter(state, id) {
  return id === null || state.characters.includes(id) ? { ...state, character: id } : state;
}
export function buyDecor(state, id) {
  const item = DECOR.find(entry => entry.id === id);
  if (!item || levelFor(state.xp) < item.level || state.coins < item.price || state.ownedDecor?.includes(id)) return state;
  return { ...state, coins: state.coins - item.price, ownedDecor: [...(state.ownedDecor ?? []), id] };
}
export function equipDecor(state, slot, id) {
  if (!['lamp', 'carpet', 'frame', 'doll', 'scenery'].includes(slot)) return state;
  if (id !== null && (!state.ownedDecor?.includes(id) || !DECOR.some(item => item.id === id && item.slot === slot))) return state;
  return { ...state, decor: { ...state.decor, [slot]: id } };
}
