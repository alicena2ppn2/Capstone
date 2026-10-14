export const MODERATION_KEY = 'mochi.guestModeration.v1';
export const SELF_AUTHOR = 'local:self';
export const SUSPENSION_MS = 7 * 24 * 60 * 60 * 1000;
export const REPORT_REASONS = { profanity: '욕설', hate: '혐오 표현', spam: '스팸', other: '기타' };
export const initialModeration = () => ({ version: 1, blocked: {}, reports: {}, deleted: {}, suspensions: {} });
export function restoreModeration(value) {
  const state = initialModeration();
  if (!value || typeof value !== 'object' || Array.isArray(value)) return state;
  for (const field of ['blocked', 'reports', 'deleted', 'suspensions']) {
    if (value[field] && typeof value[field] === 'object' && !Array.isArray(value[field])) state[field] = { ...value[field] };
  }
  return state;
}
export function authorId(entry) {
  if (typeof entry.authorId === 'string' && entry.authorId) return entry.authorId;
  if (entry.source === 'local' || /^m\d+$/.test(entry.id ?? '')) return SELF_AUTHOR;
  // Legacy mock notes have no account IDs. Same sample name is one mock author.
  return `sample:${entry.name ?? entry.id}`;
}
export const noteKey = (scope, entry) => `${scope}:${entry.id}`;
export function violation(text) {
  const normalize = value => String(value ?? '').normalize('NFKC').toLowerCase().replace(/[\s\p{P}\p{S}\p{Cf}]/gu, '');
  const normalized = normalize(text).replace(/시발점/gu, '');
  const profanity = ['씨발', '시발', '씨빨', 'ㅅㅂ', 'ㅆㅂ', '병신', 'ㅂㅅ', '개새끼', '씹새끼', '좆', '지랄', '닥쳐', '꺼져'];
  if (profanity.some(word => normalized.includes(normalize(word))) || /\b(?:fuck(?:ing)?|shit|bitch)\b/i.test(String(text ?? ''))) return 'profanity';
  if (/(?:여자|남자|여성|남성|장애인|외국인|흑인|백인|동성애자|성소수자)(?:는|은|들|들은|들이|도|을|를|이|가)*(?:열등|쓰레기|죽어|죽여|박멸|쓸모없)/u.test(normalized)) return 'hate';
  return null;
}
export function suspensionUntil(state, id, now = Date.now()) {
  const until = state.suspensions[id]?.until;
  return Number.isFinite(until) && until > now ? until : null;
}
export function writingError(state, text, id = SELF_AUTHOR, now = Date.now()) {
  if (suspensionUntil(state, id, now)) return 'suspended';
  if (!String(text ?? '').trim()) return 'empty';
  return violation(text);
}
export function visibleNote(state, scope, entry) {
  return !state.deleted[noteKey(scope, entry)] && !state.blocked[authorId(entry)];
}
export function reportNote(state, scope, entry, reason, now = Date.now()) {
  const key = noteKey(scope, entry);
  if (!Object.hasOwn(REPORT_REASONS, reason) || !entry?.id || state.reports[key] || state.deleted[key]) return state;
  const id = authorId(entry), found = violation(entry.text);
  const next = { ...state, reports: { ...state.reports, [key]: { authorId: id, name: entry.name, reason, found, at: now } } };
  if (found) {
    next.deleted = { ...state.deleted, [key]: true };
    next.suspensions = { ...state.suspensions, [id]: { until: Math.max(now + SUSPENSION_MS, state.suspensions[id]?.until ?? 0), reason: found } };
  }
  return next;
}
export function blockAuthor(state, entry, blocked = true) {
  const id = typeof entry === 'string' ? entry : authorId(entry);
  if (id === SELF_AUTHOR) return state;
  const next = { ...state.blocked };
  if (blocked) next[id] = { name: entry.name ?? state.blocked[id]?.name ?? '사용자' };
  else delete next[id];
  return { ...state, blocked: next };
}
