import { DAILY_SENTENCES } from '../content/dailySentences.js';
import { seoulDateKey } from './seoulDate.js';

export const SENTENCE_ANCHOR = '2026-01-01';
const anchor = Date.parse(`${SENTENCE_ANCHOR}T00:00:00Z`);
// UTC arithmetic is applied to the Seoul calendar key, never the device's UTC date.
export function dailySentence(now = new Date()) {
  const day = seoulDateKey(now);
  const days = Math.round((Date.parse(`${day}T00:00:00Z`) - anchor) / 86400000);
  const index = ((days % DAILY_SENTENCES.length) + DAILY_SENTENCES.length) % DAILY_SENTENCES.length;
  return { day, index, ...DAILY_SENTENCES[index] };
}
