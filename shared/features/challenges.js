import { seoulDateKey, attendanceWeek } from '../utils/seoulDate.js';
import { journalDates } from './journal.js';

import { DAILY_CHALLENGES, GOALS, CHALLENGES } from '../data/missions.js';
export { CATEGORIES, DAILY_CHALLENGES, GOALS, CHALLENGES } from '../data/missions.js';
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
