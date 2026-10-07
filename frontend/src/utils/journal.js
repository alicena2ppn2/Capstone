import { seoulDateKey } from './seoulDate.js';

export const JOURNAL_LIMIT = 2000;
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
export function saveJournal(state, date, text, now = new Date()) {
  if (date !== seoulDateKey(now) || typeof text !== 'string' || deletedJournal(state, date)) return state;
  const value = text.trim().slice(0, JOURNAL_LIMIT);
  if (!value || state.journals?.[date] === value) return state;
  return { ...state, journals: { ...state.journals, [date]: value }, journalDates: [...new Set([...journalDates(state), date])].sort() };
}
export function deleteJournal(state, date) {
  if (!validJournalDate(date) || !hasJournal(state, date)) return state;
  const dates = journalDates(state), journals = { ...state.journals }, questAnswers = { ...state.questAnswers };
  delete journals[date];
  delete questAnswers[`${date}:day-diary`];
  return { ...state, journals, questAnswers, journalDates: dates };
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
