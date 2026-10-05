import test from 'node:test';
import assert from 'node:assert/strict';
import { initialGame, completeQuest as finishQuest, startQuest, migrateQuestProgress, buyCharacter, equipCharacter, levelFor, questCompletionKey, QUESTS } from './game.js';

const completeQuest = (state, id, now = new Date(), answer = '') => finishQuest(startQuest(state, id, now), id, now, answer);

test('행동형 시작은 무보상이며 저장 복원 후 완료와 빠른 중복 요청은 한 번만 지급한다', () => {
  const now = new Date('2026-10-05T03:00:00Z');
  const initial = initialGame();
  assert.equal(finishQuest(initial, 'day-walk', now), initial);
  const started = startQuest(initial, 'day-walk', now);
  assert.equal(started.xp, initial.xp);
  assert.equal(started.coins, initial.coins);
  assert.equal(startQuest(started, 'day-walk', now), started);
  const restored = JSON.parse(JSON.stringify(started));
  const done = finishQuest(restored, 'day-walk', now);
  assert.equal(done.xp, 100);
  assert.equal(done.questReward.sequence, 1);
  assert.equal(finishQuest(done, 'day-walk', now), done);
  assert.equal(startQuest(done, 'day-walk', now), done);
  assert.deepEqual(JSON.parse(JSON.stringify(done)), done);
});

test('하루 기록은 필수 입력이며 공백을 거절하고 답변을 저장한다', () => {
  const state = initialGame();
  const now = new Date('2026-10-05T03:00:00Z');
  assert.equal(finishQuest(state, 'day-diary', now, ' \n '), state);
  assert.equal(startQuest(state, 'day-diary', now), state);
  const done = finishQuest(state, 'day-diary', now, '  좋은 하루  ');
  assert.equal(done.questAnswers['2026-10-05:day-diary'], '좋은 하루');
  assert.equal(done.coins, 580);
});

test('월요일 및 매월 1일 서울 자정에는 새로운 키로 시작과 완료할 수 있다', () => {
  for (const [id, before, after] of [
    ['week-walk', '2026-10-04T14:59:59Z', '2026-10-04T15:00:00Z'],
    ['month-place', '2026-10-31T14:59:59Z', '2026-10-31T15:00:00Z'],
    ['day-walk', '2026-10-05T14:59:59Z', '2026-10-05T15:00:00Z'],
  ]) {
    const old = completeQuest(initialGame(), id, new Date(before));
    assert.equal(finishQuest(old, id, new Date(after)), old);
    const next = completeQuest(old, id, new Date(after));
    assert.equal(next.completed.length, 2);
    assert.equal(next.started.length, 2);
    assert.equal(next.xp, old.xp * 2);
  }
});

test('구형 주월 완료는 현재 기간에 무보상으로 한 번만 이관하고 기존 데이터를 보존한다', () => {
  const legacy = { ...initialGame(), xp: 700, coins: 900, completed: ['week-walk', 'month-place'], questAnswers: { old: '답변' } };
  delete legacy.started;
  delete legacy.questPeriodsMigrated;
  const migrated = migrateQuestProgress(legacy, '2026-10-05');
  assert.deepEqual(migrated.started, []);
  assert.equal(migrated.xp, 700);
  assert.equal(migrated.coins, 900);
  assert.equal(migrated.questAnswers, legacy.questAnswers);
  assert.ok(migrated.completed.includes('week-walk'));
  assert.ok(migrated.completed.includes('2026-10-05:week-walk'));
  assert.ok(migrated.completed.includes('2026-10:month-place'));
  assert.equal(migrateQuestProgress(JSON.parse(JSON.stringify(migrated)), '2026-11-02').completed.length, 4);
  const next = completeQuest(migrated, 'week-walk', new Date('2026-10-12T03:00:00Z'));
  assert.equal(next.xp, 850);
});

test('기본 캐릭터 하나를 제공하고 레벨업이 장착을 바꾸지 않는다', () => {
  const state = initialGame();
  assert.equal(levelFor(state.xp), 1);
  assert.deepEqual(state.characters, ['potato']);
  const next = completeQuest(state, 'day-walk');
  assert.equal(next.xp, 100);
  assert.equal(next.coins, 570);
  assert.equal(next.character, 'potato');
  assert.equal(completeQuest(next, 'day-walk'), next);
});

test('서울 자정에 오늘 퀘스트를 다시 수행할 수 있고 전날 기록과 재화를 보존한다', () => {
  const before = new Date('2026-10-01T14:59:59Z');
  const after = new Date('2026-10-01T15:00:00Z');
  let state = completeQuest(initialGame(), 'day-walk', before);
  assert.equal(completeQuest(state, 'day-walk', before), state);
  state = completeQuest(JSON.parse(JSON.stringify(state)), 'day-walk', after);
  assert.equal(state.xp, 200);
  assert.equal(state.coins, 600);
  assert.ok(state.completed.includes('2026-10-01:day-walk'));
  assert.ok(state.completed.includes('2026-10-02:day-walk'));
});
test('입력 퀘스트는 빈 답변을 거절하고 날짜별 답변을 저장한다', () => {
  const before = new Date('2026-10-01T14:00:00Z');
  const after = new Date('2026-10-01T16:00:00Z');
  const initial = initialGame();
  assert.equal(completeQuest(initial, 'day-music', before, '  '), initial);
  let state = completeQuest(initial, 'day-music', before, '  재즈  ');
  state = completeQuest(state, 'day-music', after, '팝');
  assert.equal(state.questAnswers['2026-10-01:day-music'], '재즈');
  assert.equal(state.questAnswers['2026-10-02:day-music'], '팝');
});
test('특별 보상은 같은 날 퀘스트 3개를 완료해야 지급한다', () => {
  const first = new Date('2026-10-01T12:00:00Z');
  const second = new Date('2026-10-02T12:00:00Z');
  let state = completeQuest(initialGame(), 'day-walk', first);
  state = completeQuest(state, 'day-wake', first);
  state = completeQuest(state, 'day-drink', second);
  assert.ok(!state.characters.includes('sky'));
  state = completeQuest(state, 'day-food', second, '김밥');
  state = completeQuest(state, 'day-seasonal', second);
  assert.ok(state.characters.includes('sky'));
  assert.equal(state.character, 'potato');
});
test('오늘 목록은 8개이며 같은 주에는 날짜가 달라도 중복 완료를 막는다', () => {
  assert.equal(QUESTS.filter((quest) => quest.period === 'day').length, 8);
  const quest = QUESTS.find((item) => item.id === 'week-walk');
  assert.equal(questCompletionKey(quest, '2026-10-02'), '2026-09-28:week-walk');
  const state = completeQuest(initialGame(), quest.id, new Date('2026-10-01T12:00:00Z'));
  assert.equal(completeQuest(state, quest.id, new Date('2026-10-02T12:00:00Z')), state);
});
test('LV.5 이전/코인 부족 구매와 중복 구매를 막는다', () => {
  assert.deepEqual(buyCharacter(initialGame(), 'mochi'), initialGame());
  const state = { ...initialGame(), xp: 400 };
  assert.equal(buyCharacter({ ...state, coins: 299 }, 'mochi').characters.length, 1);
  const bought = buyCharacter(state, 'mochi');
  assert.equal(bought.coins, 240);
  assert.ok(bought.characters.includes('mochi'));
  assert.equal(bought.character, 'potato');
  assert.equal(buyCharacter(bought, 'mochi'), bought);
});
test('획득한 캐릭터를 자유롭게 바꾸고 미보유 캐릭터는 장착할 수 없다', () => {
  const bought = buyCharacter({ ...initialGame(), xp: 400 }, 'mochi');
  const equipped = equipCharacter(bought, 'mochi');
  assert.equal(equipped.character, 'mochi');
  const unequipped = equipCharacter(equipped, 'potato');
  assert.equal(unequipped.character, 'potato');
  assert.ok(unequipped.characters.includes('mochi'));
  assert.equal(equipCharacter(bought, 'mint'), bought);
});
test('성장/특별 퀘스트 무료 보상은 컬렉션에 저장하고 자동 장착하지 않는다', () => {
  let state = completeQuest(initialGame(), 'day-walk');
  state = completeQuest(state, 'day-wake');
  assert.ok(state.characters.includes('pink'));
  state = completeQuest(state, 'day-diary', new Date(), 'today');
  assert.ok(state.characters.includes('sky'));
  assert.equal(state.character, 'potato');
  assert.equal(state.coins, 640);
  assert.deepEqual(JSON.parse(JSON.stringify(state)), state);
});
