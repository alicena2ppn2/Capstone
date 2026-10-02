import test from 'node:test';
import assert from 'node:assert/strict';
import { initialGame, completeQuest, buyCharacter, equipCharacter, levelFor, questCompletionKey, QUESTS } from './game.js';

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
test('오늘 목록은 8개이며 주간/월간 보상은 날짜 변경으로 초기화되지 않는다', () => {
  assert.equal(QUESTS.filter((quest) => quest.period === 'day').length, 8);
  const quest = QUESTS.find((item) => item.id === 'week-walk');
  assert.equal(questCompletionKey(quest, '2026-10-02'), 'week-walk');
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
  state = completeQuest(state, 'day-diary');
  assert.ok(state.characters.includes('sky'));
  assert.equal(state.character, 'potato');
  assert.equal(state.coins, 640);
  assert.deepEqual(JSON.parse(JSON.stringify(state)), state);
});
