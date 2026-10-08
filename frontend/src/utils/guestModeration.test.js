import test from 'node:test';
import assert from 'node:assert/strict';
import { initialModeration, restoreModeration, violation, reportNote, blockAuthor, visibleNote, writingError, suspensionUntil, SELF_AUTHOR, SUSPENSION_MS, authorId } from './guestModeration.js';

test('욕설·초성·띄어쓰기/기호 우회·혐오 표현 필터, 일반 문장은 허용', () => {
  for (const text of ['씨발', '씨 . 발', 'ㅅㅂ', 'ㅆㅂ', '병\u200b신', 'fuck you']) assert.equal(violation(text), 'profanity');
  assert.equal(violation('장애인은 열등하다'), 'hate');
  for (const text of ['오늘도 좋은 하루 보내요', '좋은 변화의 시발점이에요', '외국인 친구와 이야기했어요', '책 제목을 알려주세요']) assert.equal(violation(text), null);
});
test('확인된 위반 글 신고는 7일 제한과 해당 글 삭제, 다른 글은 유지', () => {
  const original = initialModeration(), entry = { id: 'bad', authorId: 'user:1', name: '친구', text: '씨발' }, now = Date.UTC(2026, 9, 8, 3);
  const state = reportNote(original, 'home', entry, 'profanity', now);
  assert.equal(state.suspensions['user:1'].until, now + SUSPENSION_MS);
  assert.equal(visibleNote(state, 'home', entry), false);
  assert.equal(visibleNote(state, 'home', { ...entry, id: 'other', text: '안녕' }), true);
  assert.equal(suspensionUntil(state, 'user:1', now + SUSPENSION_MS - 1), now + SUSPENSION_MS);
  assert.equal(writingError(state, '안녕', 'user:1', now + SUSPENSION_MS - 1), 'suspended');
  assert.equal(writingError(state, '안녕', 'user:1', now + SUSPENSION_MS), null);
  assert.deepEqual(original, initialModeration());
  assert.equal(JSON.stringify(state).includes('씨발'), false);
});
test('중복 신고는 제한 기간을 늘리지 않고 무해한 글 신고는 자동 정지/삭제하지 않음', () => {
  const entry = { id: '1', authorId: 'u', text: '병신' }, once = reportNote(initialModeration(), 'home', entry, 'profanity', 1000);
  assert.equal(reportNote(once, 'home', entry, 'hate', 50000), once);
  const safe = reportNote(initialModeration(), 'home', { ...entry, text: '좋은 하루' }, 'hate', 1000);
  assert.deepEqual(safe.deleted, {}); assert.deepEqual(safe.suspensions, {});
});
test('차단은 같은 작성자의 글을 양쪽 방명록에서 숨기며 해제하면 복구', () => {
  const entry = { id: '1', name: '친구', text: '안녕' };
  const blocked = blockAuthor(initialModeration(), entry);
  assert.equal(visibleNote(blocked, 'home', entry), false);
  assert.equal(visibleNote(blocked, 'visit:u', { ...entry, id: '2' }), false);
  const restored = blockAuthor(blocked, authorId(entry), false);
  assert.equal(visibleNote(restored, 'home', entry), true);
  assert.deepEqual(blockAuthor(restored, { ...entry, authorId: SELF_AUTHOR }), restored);
});
test('새로고침/구형 글 호환, 범위별 글 ID와 입력/제재 검증', () => {
  assert.equal(authorId({ id: 'm123', name: '옛 애칭' }), SELF_AUTHOR);
  assert.equal(authorId({ source: 'local', id: '123-456' }), SELF_AUTHOR);
  const entry = { id: 'same', text: '씨발', authorId: SELF_AUTHOR };
  const restored = restoreModeration(JSON.parse(JSON.stringify(reportNote(initialModeration(), 'home', entry, 'hate', 1000))));
  assert.equal(writingError(restored, '좋아요', SELF_AUTHOR, 1001), 'suspended');
  assert.equal(visibleNote(restored, 'visit:u', entry), true);
  assert.deepEqual(restoreModeration(null), initialModeration());
  assert.equal(writingError(initialModeration(), '   '), 'empty');
  assert.equal(writingError(initialModeration(), 'ㅅㅂ'), 'profanity');
  assert.deepEqual(reportNote(initialModeration(), 'home', entry, 'invalid'), initialModeration());
});
