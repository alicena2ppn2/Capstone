import test from 'node:test';
import assert from 'node:assert/strict';
import { comebackMessages, ga } from './messages.mjs';

test('친구 이름 뒤 조사: 받침 있으면 이, 없으면 가', () => {
  assert.equal(ga('꼬질 감자'), '꼬질 감자가');
  assert.equal(ga('버터 곰'), '버터 곰이');
  assert.equal(ga('Mochi'), 'Mochi가');
});
test('2·4·7일 뒤 세 번, 제목에 친구 이름', () => {
  const list = comebackMessages('달빛 양');
  assert.deepEqual(list.map(m => m.days), [2, 4, 7]);
  assert.ok(list.every(m => m.title.startsWith('달빛 양이') && m.body));
});
