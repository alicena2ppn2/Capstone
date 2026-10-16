import { DAILY_SENTENCES } from '../data/dailySentences.js';
import { CHARACTER_VOICE_DRAFTS } from '../data/characterVoiceDrafts.js';
import { seoulDateKey } from '../utils/seoulDate.js';

export const SENTENCE_ANCHOR = '2026-01-01';
const anchor = Date.parse(`${SENTENCE_ANCHOR}T00:00:00Z`);
// UTC arithmetic is applied to the Seoul calendar key, never the device's UTC date.
export function dailySentence(now = new Date(), characterId) {
  const day = seoulDateKey(now);
  const days = Math.round((Date.parse(`${day}T00:00:00Z`) - anchor) / 86400000);
  const index = ((days % DAILY_SENTENCES.length) + DAILY_SENTENCES.length) % DAILY_SENTENCES.length;
  const sentence = DAILY_SENTENCES[index];
  const voiceLines = CHARACTER_VOICE_DRAFTS[characterId];
  if (voiceLines) {
    const voice = voiceLines[index % voiceLines.length];
    return { day, index, ...sentence, id: `${characterId}-${day}`, topic: voice.theme, label: voice.theme, characterId, text: voice.text };
  }
  return { day, index, ...sentence };
}

// Development-preview-only override: live screens continue to use the date-derived sentence above.
export function dailySentencePreview(now = new Date(), characterId, voiceIndex = 0) {
  const voices = CHARACTER_VOICE_DRAFTS[characterId];
  if (!voices) return dailySentence(now, characterId);
  const selected = ((voiceIndex % voices.length) + voices.length) % voices.length;
  const sentence = dailySentence(now, characterId);
  const voice = voices[selected];
  return { ...sentence, id: `${characterId}-preview-${selected}`, topic: voice.theme, label: voice.theme, text: voice.text, previewIndex: selected };
}
