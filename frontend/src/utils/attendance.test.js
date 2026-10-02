import test from 'node:test';
import assert from 'node:assert/strict';
import { seoulDateKey, attendanceWeek } from './seoulDate.js';
import { initialGame, claimAttendance } from './game.js';

test('서울 0시를 기준으로 날짜가 바뀐다', () => {
  assert.equal(seoulDateKey(new Date('2026-10-01T14:59:59Z')), '2026-10-01');
  assert.equal(seoulDateKey(new Date('2026-10-01T15:00:00Z')), '2026-10-02');
});
test('월요일 새 주를 표시하며 월/연도 경계를 정확히 계산한다', () => {
  assert.deepEqual(attendanceWeek('2026-10-04'), ['2026-09-28', '2026-09-29', '2026-09-30', '2026-10-01', '2026-10-02', '2026-10-03', '2026-10-04']);
  assert.equal(attendanceWeek('2026-10-05')[0], '2026-10-05');
  assert.equal(attendanceWeek('2027-01-01')[0], '2026-12-28');
});
test('하루 한 번만 지급하고 새로고침된 기록에서도 중복을 막는다', () => {
  const next = claimAttendance(initialGame(), '2026-10-02', { type: 'coins', amount: 20 });
  assert.equal(next.coins, 560);
  assert.equal(next.xp, 0);
  assert.equal(claimAttendance(next, '2026-10-02', { type: 'xp', amount: 50 }), next);
  const restored = JSON.parse(JSON.stringify(next));
  assert.equal(claimAttendance(restored, '2026-10-02', { type: 'coins', amount: 30 }), restored);
});
test('결석해도 보상을 받으며 주 변경은 기존 코인/XP를 초기화하지 않는다', () => {
  let state = claimAttendance(initialGame(), '2026-10-02', { type: 'coins', amount: 10 });
  state = claimAttendance(state, '2026-10-05', { type: 'xp', amount: 35 });
  assert.equal(state.coins, 550);
  assert.equal(state.xp, 35);
  assert.equal(attendanceWeek('2026-10-05').filter((key) => state.attendance[key]).length, 1);
});
test('출석 XP로 레벨 보상을 받되 캐릭터를 자동 변경하지 않는다', () => {
  const state = claimAttendance({ ...initialGame(), xp: 180 }, '2026-10-02', { type: 'xp', amount: 20 });
  assert.equal(state.xp, 200);
  assert.ok(state.characters.includes('pink'));
  assert.equal(state.character, 'potato');
  assert.equal(claimAttendance(state, '2026-10-03', { type: 'coins', amount: 999 }), state);
});
