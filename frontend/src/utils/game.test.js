import test from 'node:test';
import assert from 'node:assert/strict';
import { initialGame, completeQuest, buyCharacter, equipCharacter, levelFor } from './game.js';

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
