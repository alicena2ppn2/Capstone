import { seoulDateKey, attendanceWeek } from '../utils/seoulDate.js';
import { CLOTHES } from '../data/clothes.js';
import { DECOR } from '../data/decor.js';
import { deletedJournal, saveJournal } from './journal.js';
import { CHALLENGES, migrateChallenges, ensureChallenges, previewReward, goalProgress } from './challenges.js';
import { levelFor } from './levelProgression.js';
export { EARLY_LEVEL_THRESHOLDS, XP_PER_LEVEL, levelFor, levelProgress, xpThresholdForLevel } from './levelProgression.js';
export { selectChallenge, pauseChallenge, replaceChallenge, ensureChallenges, goalProgress, previewReward } from './challenges.js';

import { CHARACTERS } from '../data/characters.js';
export { CHARACTERS } from '../data/characters.js';
// Keep retired weekly/monthly IDs only for one-time compatibility migration.
const LEGACY_QUESTS = [
  ...['week-walk', 'week-wake', 'week-diary'].map(id => ({ id, period: 'week' })),
  ...['month-place', 'month-rhythm', 'month-diary'].map(id => ({ id, period: 'month' })),
];
export const QUESTS = CHALLENGES;
export const initialGame = ({ demo = false } = {}) => migrateChallenges({ xp: 0, coins: demo ? 540 : 90, completed: [], started: [], questPeriodsMigrated: true, characters: ['potato'], character: 'potato', attendance: {}, questAnswers: {} });
export function questCompletionKey(quest, dayKey = seoulDateKey()) {
  const period = quest.period === 'week' ? attendanceWeek(dayKey)[0] : quest.period === 'month' ? dayKey.slice(0, 7) : dayKey;
  return `${period}:${quest.id}`;
}
export function migrateQuestProgress(state, dayKey = seoulDateKey()) {
  const started = Array.isArray(state.started) ? state.started : [];
  if (state.questPeriodsMigrated) return migrateChallenges(state.started === started ? state : { ...state, started });
  const completed = [...state.completed];
  for (const quest of LEGACY_QUESTS.filter(item => item.period !== 'day')) {
    const key = questCompletionKey(quest, dayKey);
    if (completed.includes(quest.id) && !completed.includes(key)) completed.push(key);
  }
  return migrateChallenges({ ...state, started, completed, questPeriodsMigrated: true });
}
export function startQuest(state, id, now = new Date()) {
  const quest = QUESTS.find(item => item.id === id);
  if (!quest || quest.input || quest.period !== 'day') return state;
  state = ensureChallenges(state, seoulDateKey(now));
  if (!state.challengeDays[seoulDateKey(now)].selected.includes(id)) return state;
  if (quest.choices && !quest.choices.includes(state.challengeChoices?.[questCompletionKey(quest, seoulDateKey(now))])) return state;
  const key = questCompletionKey(quest, seoulDateKey(now));
  if (state.completed.includes(key) || state.started?.includes(key)) return state;
  return { ...state, started: [...(state.started ?? []), key] };
}
export function grantMilestone(state) {
  return levelFor(state.xp) >= 3 && !state.characters.includes('pink') ? { ...state, characters: [...state.characters, 'pink'] } : state;
}
export function completeQuest(state, id, now = new Date(), answer = '') {
  const quest = QUESTS.find((item) => item.id === id);
  if (!quest || quest.period !== 'day') return state;
  const dayKey = seoulDateKey(now);
  if (quest.input && deletedJournal(state, dayKey)) return state;
  const key = questCompletionKey(quest, dayKey);
  const text = typeof answer === 'string' ? answer.trim().slice(0, 80) : '';
  if (state.completed.includes(key) || (quest.input ? !text : !state.started?.includes(key))) return state;
  if (quest.choices && !quest.choices.includes(state.challengeChoices?.[key])) return state;
  state = ensureChallenges(state, dayKey);
  if (quest.period === 'day' && !state.challengeDays[dayKey].selected.includes(id)) return state;
  const reward = previewReward(state, quest, dayKey);
  const next = { ...state, xp: state.xp + reward.xp, coins: state.coins + reward.coins, completed: [...state.completed, key], questReward: { key, ...reward, sequence: (state.questReward?.sequence ?? 0) + 1 }, questAnswers: { ...state.questAnswers, ...(quest.input ? { [key]: text } : {}) } };
  next.activityRecords = { ...state.activityRecords, [key]: { id, day: dayKey, category: quest.category, input: !!quest.input, rewarded: reward.xp > 0 } };
  next.rewardDays = { ...state.rewardDays, [dayKey]: Math.max(state.rewardDays[dayKey] ?? 0, Object.values(state.activityRecords).filter(record => record.day === dayKey && record.rewarded).length) + (reward.xp > 0 ? 1 : 0) };
  if (quest.input) {
    const written = saveJournal(next, dayKey, text, now);
    next.journals = written.journals;
    next.journalDates = written.journalDates;
  }
  if (Object.values(next.activityRecords).filter(record => !record.input && record.category !== undefined).length >= 10 && !next.characters.includes('sky')) next.characters = [...next.characters, 'sky'];
  return grantMilestone(next);
}

export function claimGoal(state, id, now = new Date()) {
  state = migrateChallenges(state);
  const quest = QUESTS.find(q => q.id === id && q.period !== 'day');
  const day = seoulDateKey(now);
  if (!quest || goalProgress(state, quest, day) < quest.target) return state;
  const key = questCompletionKey(quest, day);
  if (state.completed.includes(key)) return state;
  return grantMilestone({ ...state, xp: state.xp + quest.xp, coins: state.coins + quest.coins, completed: [...state.completed, key], questReward: { key, xp: quest.xp, coins: quest.coins, sequence: (state.questReward?.sequence ?? 0) + 1 } });
}

export const ATTENDANCE_REWARDS = [
  { type: 'coins', amount: 10 }, { type: 'coins', amount: 20 }, { type: 'coins', amount: 30 },
  { type: 'xp', amount: 5 }, { type: 'xp', amount: 8 }, { type: 'xp', amount: 10 },
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
  if (!clothing && !decoration && ![...ATTENDANCE_REWARDS, ...[20, 35, 50].map(amount => ({ type: 'xp', amount }))].some((item) => item.type === reward?.type && item.amount === reward?.amount)) return state;
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
