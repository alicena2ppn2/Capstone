import test from 'node:test';
import assert from 'node:assert/strict';
import { seoulDateKey, attendanceWeek } from './seoulDate.js';
import { initialGame, claimAttendance, ensureAttendanceWeek, buyDecor, equipDecor } from './game.js';

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
  assert.equal(next.coins, 110);
  assert.equal(next.xp, 0);
  assert.equal(claimAttendance(next, '2026-10-02', { type: 'xp', amount: 50 }), next);
  const restored = JSON.parse(JSON.stringify(next));
  assert.equal(claimAttendance(restored, '2026-10-02', { type: 'coins', amount: 30 }), restored);
});
test('결석해도 보상을 받으며 주 변경은 기존 코인/XP를 초기화하지 않는다', () => {
  let state = claimAttendance(initialGame(), '2026-10-02', { type: 'coins', amount: 10 });
  state = claimAttendance(state, '2026-10-05', { type: 'xp', amount: 35 });
  assert.equal(state.coins, 100);
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

test('주간 보상은 날짜별로 고정되며 새로고침과 월요일 변경을 견딘다', () => {
  const state = ensureAttendanceWeek(initialGame(), '2026-10-05', () => 0);
  const plan = state.attendancePlans['2026-10-05'];
  assert.equal(Object.keys(plan).length, 7);
  assert.equal(plan['2026-10-05'].type, 'outfit');
  assert.notDeepEqual(plan['2026-10-05'], plan['2026-10-06']);
  const restored = JSON.parse(JSON.stringify(state));
  assert.equal(ensureAttendanceWeek(restored, '2026-10-11', () => .9), restored);
  const nextWeek = ensureAttendanceWeek(restored, '2026-10-12', () => .9);
  assert.ok(nextWeek.attendancePlans['2026-10-12']);
  assert.deepEqual(nextWeek.attendancePlans['2026-10-05'], plan);
});
test('미리 정한 의상을 한 번 지급하고 보유 의상은 코인으로 바꾼다', () => {
  const state = ensureAttendanceWeek(initialGame(), '2026-10-05', () => 0);
  const next = claimAttendance(state, '2026-10-05', { type: 'xp', amount: 50 });
  assert.deepEqual(next.attendanceClothes, ['sky']);
  assert.equal(next.xp, 0);
  assert.equal(next.coins, state.coins);
  assert.equal(next.character, state.character);
  assert.equal(claimAttendance(next, '2026-10-05'), next);
  const duplicate = claimAttendance(next, '2026-10-07');
  assert.equal(duplicate.coins, next.coins + 30);
  assert.deepEqual(duplicate.attendanceClothes, ['sky']);
});
test('기존 출석 기록을 새 주간 표 생성 시 그대로 유지한다', () => {
  const old = claimAttendance(initialGame(), '2026-10-05', { type: 'xp', amount: 35 });
  const next = ensureAttendanceWeek(old, '2026-10-05', () => 0);
  assert.deepEqual(next.attendancePlans['2026-10-05']['2026-10-05'], { type: 'xp', amount: 35 });
  assert.equal(next.xp, 35);
});
test('소품 구매는 레벨/코인을 확인하고 배치는 구매와 별개다', () => {
  const state = initialGame();
  assert.equal(buyDecor(state, 'view-newyork'), state);
  const purchased = buyDecor(state, 'lamp-moon');
  assert.equal(purchased.coins, state.coins - 90);
  assert.deepEqual(purchased.ownedDecor, ['lamp-moon']);
  assert.equal(purchased.decor, undefined);
  assert.equal(buyDecor(purchased, 'lamp-moon'), purchased);
  assert.equal(buyDecor({ ...state, coins: 0 }, 'lamp-moon').coins, 0);
  const equipped = equipDecor(purchased, 'lamp', 'lamp-moon');
  assert.equal(equipped.decor.lamp, 'lamp-moon');
  assert.equal(equipDecor(equipped, 'doll', 'lamp-moon'), equipped);
  assert.equal(equipDecor(equipped, 'scenery', 'view-newyork'), equipped);
  assert.equal(equipDecor(equipped, 'lamp', null).decor.lamp, null);
});
test('출석에서 레벨과 무관하게 소품을 획득하고 중복은 코인으로 바꾼다', () => {
  const state = ensureAttendanceWeek(initialGame(), '2026-10-05', () => .15);
  const next = claimAttendance(state, '2026-10-05');
  assert.equal(next.attendance['2026-10-05'].type, 'decor');
  const id = next.attendance['2026-10-05'].id;
  assert.ok(next.ownedDecor.includes(id));
  assert.equal(next.decor, undefined);
  const restored = JSON.parse(JSON.stringify(next));
  assert.equal(claimAttendance(restored, '2026-10-05'), restored);
  const duplicate = claimAttendance(restored, '2026-10-07');
  assert.equal(duplicate.coins, restored.coins + 30);
  assert.deepEqual(duplicate.ownedDecor, [id]);
});