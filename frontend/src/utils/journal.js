import { seoulDateKey } from './seoulDate.js';

export const JOURNAL_LIMIT = 2000;
export const JOURNAL_EMOTIONS = [
  { id: 'happy', emoji: '😄', label: '웃음' },
  { id: 'loved', emoji: '🥰', label: '사랑 잔뜩' },
  { id: 'neutral', emoji: '😐', label: '평범해요' },
  { id: 'sad', emoji: '😢', label: '슬퍼요' },
  { id: 'angry', emoji: '😠', label: '화나요' },
];
export const journalEmotion = (state, date) => JOURNAL_EMOTIONS.find(item => item.id === state.journalEmotions?.[date]);
export function validJournalDate(date) {
  if (typeof date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return false;
  const parsed = new Date(`${date}T00:00:00Z`);
  return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === date;
}
export function journalDates(state) {
  return [...new Set([...(Array.isArray(state.journalDates) ? state.journalDates : []), ...Object.keys(state.journals ?? {}).filter(date => typeof state.journals[date] === 'string' && state.journals[date].trim())])].filter(validJournalDate).sort();
}
export const hasJournal = (state, date) => typeof state.journals?.[date] === 'string' && !!state.journals[date].trim();
export const deletedJournal = (state, date) => journalDates(state).includes(date) && !hasJournal(state, date);
export function saveJournal(state, date, text, now = new Date(), emotion) {
  if (date !== seoulDateKey(now) || typeof text !== 'string') return state;
  const value = text.trim().slice(0, JOURNAL_LIMIT);
  if (emotion !== undefined && !JOURNAL_EMOTIONS.some(item => item.id === emotion)) return state;
  if (!value || (state.journals?.[date] === value && (emotion === undefined || state.journalEmotions?.[date] === emotion))) return state;
  return { ...state, journals: { ...state.journals, [date]: value }, ...(emotion === undefined ? {} : { journalEmotions: { ...state.journalEmotions, [date]: emotion } }), journalDates: [...new Set([...journalDates(state), date])].sort() };
}
export function deleteJournal(state, date, now = new Date()) {
  if (date !== seoulDateKey(now) || !validJournalDate(date) || !hasJournal(state, date)) return state;
  const dates = journalDates(state), journals = { ...state.journals }, questAnswers = { ...state.questAnswers }, journalEmotions = { ...state.journalEmotions };
  delete journals[date];
  delete journalEmotions[date];
  delete questAnswers[`${date}:day-diary`];
  return { ...state, journals, questAnswers, journalEmotions, journalDates: dates };
}
export function calendarDays(month) {
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) return [];
  const first = new Date(`${month}-01T00:00:00Z`);
  const count = new Date(Date.UTC(first.getUTCFullYear(), first.getUTCMonth() + 1, 0)).getUTCDate();
  const dates = Array.from({ length: count }, (_, index) => `${month}-${String(index + 1).padStart(2, '0')}`);
  const cells = [...Array(first.getUTCDay()).fill(null), ...dates];
  while (cells.length % 7) cells.push(null);
  return cells;
}
export function shiftMonth(month, delta) {
  if (!calendarDays(month).length) return month;
  const date = new Date(`${month}-01T00:00:00Z`);
  date.setUTCMonth(date.getUTCMonth() + delta);
  return date.toISOString().slice(0, 7);
}
