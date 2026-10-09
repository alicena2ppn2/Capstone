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
  if (!validJournalDate(date) || (!hasJournal(state, date) && !state.journalDrafts?.[date])) return state;
  const dates = journalDates(state), journals = { ...state.journals }, questAnswers = { ...state.questAnswers }, journalEmotions = { ...state.journalEmotions };
  delete journals[date];
  delete journalEmotions[date];
  delete questAnswers[`${date}:day-diary`];
  const journalDrafts={...state.journalDrafts};delete journalDrafts[date];
  return { ...state, journals, questAnswers, journalEmotions, journalDrafts,journalDates: dates };
}

// Moving a draft never saves an entry or changes receipts/rewards.
export function continueJournalDraft(state, source, target, incoming, choice) {
  if(!validJournalDate(source)||!validJournalDate(target)||typeof incoming?.text!=='string'||!incoming.text.trim())return {ok:false,message:'이어 쓸 초안이 없어요.',game:state};
  const existing=state.journalDrafts?.[target] ?? (hasJournal(state,target)?{text:state.journals[target],emotion:state.journalEmotions?.[target],prompt:0}:null);
  if(existing?.text?.trim()&&!choice)return {ok:false,conflict:true,message:'오늘 일기나 초안이 있어요. 내용을 선택해 주세요.',game:state};
  if(choice==='keep')return {ok:true,game:state,draft:existing};
  const draft=choice==='merge'&&existing?.text?.trim()?{...incoming,text:`${existing.text}\n\n${incoming.text}`}:{...incoming};
  if(draft.text.length>JOURNAL_LIMIT)return {ok:false,message:'합친 글이 2,000자를 넘어요. 두 초안은 그대로 보존했어요.',game:state};
  return {ok:true,draft,game:{...state,journalDrafts:{...state.journalDrafts,[source]:incoming,[target]:draft}}};
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
