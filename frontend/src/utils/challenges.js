import { seoulDateKey, attendanceWeek } from './seoulDate.js';
import { journalDates } from './journal.js';

export const CATEGORIES = { prepare: '오늘의 준비', outside: '바깥 발견', connect: '작은 연결' };
const action = (id, category, name, description, effort = 1, minutes = 5, extra = {}) => ({ id, period: 'day', category, name, description, effort, minutes, xp: 15, coins: 25, ...extra });
export const DAILY_CHALLENGES = [
  action('day-wake', 'prepare', '내 하루 시작하기', '정한 기상 시간 이후 커튼을 열거나 물 한 잔을 마시면 완료예요.'),
  action('day-diary', 'prepare', '오늘의 하루 기록하기', '오늘 있었던 일이나 기분을 한 줄 저장해요.', 1, 3, { input: true }),
  action('day-seasonal', 'prepare', '제철 음식 알아보기', '제철 음식 하나를 찾아 이름을 확인해요. 구매하거나 먹지 않아도 괜찮아요.'),
  action('day-walk', 'outside', '잠깐 밖에 나가보기', '집 밖에서 공기를 맡고 돌아와요. 거리와 시간은 내가 정해요.', 1, 3),
  action('day-more-steps', 'outside', '내 만큼 걸어 보기', '1분 · 5분 · 10분 중 감당 가능한 목표를 고르고 걸어요. 어제보다 많이 걸을 필요 없어요.', 1, 5, { choices: ['1분', '5분', '10분'] }),
  action('day-drink', 'outside', '동네 둘러보기', '좋아하는 음료를 사 오거나, 돈을 쓰지 않고 가게 앞이나 동네 풍경을 보고 돌아와요.', 1, 5),
  action('day-place', 'outside', '다른 길 만나기', '익숙한 길에서 다른 골목이나 공공 쉼터 한 곳을 둘러봐요.', 2, 10),
  action('day-greet', 'connect', '짧은 인사 건네기', '마주친 이웃이나 가게 직원에게 짧게 인사해요. 반응을 받을 필요 없어요.', 1, 3),
  action('day-checkin', 'connect', '안부 보내기', '아는 사람에게 안부 한 줄을 보내요. 연락할 사람이 없다면 공개 관심사 공간에 인사 글을 남겨도 좋아요.', 1, 3),
  action('day-thanks', 'connect', '고마움 표현하기', '도움을 준 사람에게 말이나 메시지로 고마움을 전해요. 답장은 완료 조건이 아니에요.', 1, 3),
  action('day-question', 'connect', '관심사 질문 남기기', '사람들이 사용하는 관심사 커뮤니티에 질문 한 개를 남겨요. 아는 사람이 없어도 가능해요.', 2, 5),
  action('day-invite', 'connect', '함께할 활동 제안하기', '아는 사람이나 활동 커뮤니티에 함께할 활동을 제안해요. 약속이 성사되지 않아도 완료예요.', 2, 10),
  action('day-door', 'outside', '문밖 한 걸음', '문밖으로 한 걸음 나가 주변을 잠깐 보고 돌아와요.', 0, 1),
  action('day-nod', 'connect', '눈인사 건네기', '마주친 사람에게 고개를 가볍게 끄덕여 인사해요. 상대 반응은 필요 없어요.', 0, 1),
  action('day-water', 'prepare', '물 한 모금', '활동을 시작하기 전에 물 한 모금을 마셔요.', 0, 1),
];
export const GOALS = [
  { id: 'week-walk', period: 'week', name: '이번 주 바깥 발견', category: 'outside', target: 2, description: '이번 주 외출 완료 기록 2회', xp: 30, coins: 30 },
  { id: 'week-diary', period: 'week', name: '이번 주 하루 기록', journal: true, target: 3, description: '서로 다른 날짜에 하루 기록 3일', xp: 30, coins: 30 },
  { id: 'week-connect', period: 'week', name: '이번 주 작은 연결', category: 'connect', target: 2, description: '이번 주 교류 완료 기록 2회', xp: 30, coins: 30 },
  { id: 'month-place', period: 'month', name: '이번 달 바깥 발견', category: 'outside', target: 8, description: '이번 달 외출 완료 기록 8회', xp: 60, coins: 60 },
  { id: 'month-diary', period: 'month', name: '이번 달 하루 기록', journal: true, target: 10, description: '서로 다른 날짜에 하루 기록 10일', xp: 60, coins: 60 },
];
export const CHALLENGES = [...DAILY_CHALLENGES, ...GOALS];
const legacyCategory = id => ['day-walk', 'day-more-steps', 'day-drink'].includes(id) ? 'outside' : 'prepare';
export function migrateChallenges(state) {
  if (state.challengeVersion === 2) {
    const fields = ['activityRecords', 'preferences', 'journals', 'challengeDays', 'feedback', 'rewardDays'];
    const missing = fields.filter(field => !state[field] || typeof state[field] !== 'object' || Array.isArray(state[field]));
    return missing.length ? { ...state, ...Object.fromEntries(missing.map(field => [field, {}])) } : state;
  }
  const records = { ...(state.activityRecords ?? {}) };
  for (const key of state.completed) {
    const match = /^(\d{4}-\d{2}-\d{2}):(day-.+)$/.exec(key);
    if (match && !['day-music', 'day-food'].includes(match[2]) && !records[key]) records[key] = { day: match[1], id: match[2], category: legacyCategory(match[2]), input: match[2] === 'day-diary', legacy: true };
  }
  const preferences = { ...(state.preferences ?? {}) };
  for (const [field, id] of [['music', 'day-music'], ['food', 'day-food']]) {
    const latest = Object.entries(state.questAnswers ?? {}).filter(([key, value]) => key.endsWith(`:${id}`) && typeof value === 'string' && value.trim()).sort(([a], [b]) => b.localeCompare(a))[0];
    if (preferences[field] === undefined) preferences[field] = latest?.[1] ?? '';
  }
  const journals = { ...(state.journals ?? {}) };
  for (const [key, text] of Object.entries(state.questAnswers ?? {})) if (/^\d{4}-\d{2}-\d{2}:day-diary$/.test(key) && typeof text === 'string' && text.trim()) journals[key.slice(0, 10)] ??= text;
  return { ...state, challengeVersion: 2, activityRecords: records, preferences, journals, challengeDays: state.challengeDays ?? {}, feedback: state.feedback ?? {}, rewardDays: state.rewardDays ?? {} };
}
export function ensureChallenges(state, day = seoulDateKey()) {
  state = migrateChallenges(state);
  if (state.challengeDays[day]) return state;
  const recent = Object.values(state.activityRecords).filter(record => record.day < day).sort((a, b) => b.day.localeCompare(a.day)).slice(0, 10);
  const last = recent.find(record => !record.input);
  const category = last?.category ?? 'outside';
  const burden = last && state.feedback[`${last.day}:${last.id}`];
  const baseline = DAILY_CHALLENGES.find(quest => quest.id === last?.id)?.effort ?? 1;
  // Expansion requires an explicit comfortable response; repetition alone never increases it.
  const ceiling = burden === 'hard' ? 1 : burden === 'easy' ? Math.min(2, baseline + 1) : baseline;
  const seed = [...day].reduce((sum, char) => sum + char.charCodeAt(0), 0);
  const pick = (pool, excluded = []) => pool.filter(q => !excluded.includes(q.id))[seed % Math.max(1, pool.filter(q => !excluded.includes(q.id)).length)];
  const familiar = (burden === 'hard' ? DAILY_CHALLENGES.find(q => q.category === category && q.effort === 0) : DAILY_CHALLENGES.find(q => q.id === last?.id)) ?? DAILY_CHALLENGES.find(q => q.id === 'day-walk');
  const samePurpose = DAILY_CHALLENGES.filter(q => q.category === category && q.effort <= ceiling);
  const expansion = samePurpose.filter(q => q.effort > baseline);
  const stretch = pick(burden === 'easy' && expansion.length ? expansion : samePurpose, [familiar.id]) ?? familiar;
  const alternative = pick(DAILY_CHALLENGES.filter(q => q.effort <= 1), [familiar.id, stretch.id]);
  const candidates = [familiar, stretch, alternative].filter((q, index, array) => q && array.findIndex(item => item.id === q.id) === index).map((q, index) => ({ id: q.id, role: ['익숙한 도전', '한 걸음 도전', '다른 방식의 도전'][index], reason: index === 0 ? '최근 행동을 이어가거나 부담 적은 기본 행동으로 시작해요.' : index === 1 ? burden === 'easy' ? '편했다는 응답을 참고한 작은 확장이에요.' : '부담 정보가 부족해 비슷한 크기의 행동을 권해요.' : '같은 하루를 다른 방식으로 시작할 수 있어요.' }));
  const restored = DAILY_CHALLENGES.filter(q => state.started?.includes(`${day}:${q.id}`) && !state.completed.includes(`${day}:${q.id}`)).map(q => q.id);
  return { ...state, challengeDays: { ...state.challengeDays, [day]: { candidates, selected: restored.slice(0, 3), paused: [], replacements: [] } } };
}
export function selectChallenge(state, id, day = seoulDateKey()) {
  state = ensureChallenges(state, day);
  const entry = state.challengeDays[day];
  if (!DAILY_CHALLENGES.some(q => q.id === id) || entry.selected.includes(id) || entry.selected.length >= 3) return state;
  return { ...state, challengeDays: { ...state.challengeDays, [day]: { ...entry, selected: [...entry.selected, id], paused: entry.paused.filter(item => item !== id) } } };
}
export function pauseChallenge(state, id, day = seoulDateKey(), reason = '') {
  state = ensureChallenges(state, day);
  const entry = state.challengeDays[day];
  if (!entry.selected.includes(id) || state.completed.includes(`${day}:${id}`)) return state;
  const quest = DAILY_CHALLENGES.find(q => q.id === id);
  const alternatives = DAILY_CHALLENGES.filter(q => q.id !== id && !entry.selected.includes(q.id) && !state.completed.includes(`${day}:${q.id}`));
  const replacement = alternatives.filter(q => q.category === quest.category).sort((a, b) => reason === 'hard' ? a.effort - b.effort || a.minutes - b.minutes : reason === 'time' ? a.minutes - b.minutes : 0).find(q => reason === 'hard' ? q.effort <= quest.effort && q.minutes <= quest.minutes : reason === 'time' ? q.minutes < quest.minutes : true) ?? alternatives.find(q => q.effort <= 1);
  const candidates = replacement ? [{ id: replacement.id, role: '다른 방식의 도전', reason: '보류한 행동 대신 선택할 수 있는 대안이에요.' }, ...entry.candidates.filter(q => q.id !== replacement.id)] : entry.candidates;
  return { ...state, challengeDays: { ...state.challengeDays, [day]: { ...entry, candidates, selected: entry.selected.filter(item => item !== id), paused: [...new Set([...entry.paused, id])], replacements: [...entry.replacements, { id, reason, replacement: replacement?.id }] } } };
}
export function goalProgress(state, goal, day = seoulDateKey()) {
  const start = goal.period === 'week' ? attendanceWeek(day)[0] : `${day.slice(0, 7)}-01`;
  const end = goal.period === 'week' ? attendanceWeek(day)[6] : `${day.slice(0, 7)}-31`;
  if (goal.journal) return journalDates(state).filter(date => date >= start && date <= end).length;
  return Object.values(state.activityRecords ?? {}).filter(record => record.day >= start && record.day <= end && record.category === goal.category && !record.input).length;
}
export function replaceChallenge(state, id, day = seoulDateKey(), reason = '') {
  const next = pauseChallenge(state, id, day, reason);
  if (next === state) return state;
  const replacement = next.challengeDays[day].replacements.at(-1)?.replacement;
  if (!replacement) return state;
  return selectChallenge(next, replacement, day);
}
export function previewReward(state, quest, day = seoulDateKey()) {
  if (quest.period !== 'day') return { xp: quest.xp, coins: quest.coins };
  const used = Math.max(state.rewardDays?.[day] ?? 0, Object.values(state.activityRecords ?? {}).filter(r => r.day === day && r.rewarded).length);
  if (used >= 3) return { xp: 0, coins: 0 };
  const novel = !quest.input && !Object.values(state.activityRecords ?? {}).some(record => record.id === quest.id);
  return { xp: quest.xp + (novel ? 5 : 0), coins: quest.coins };
}
