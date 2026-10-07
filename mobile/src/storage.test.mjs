import test from 'node:test';
import assert from 'node:assert/strict';
import { decodeBackup, encodeBackup, loadStorage, saveStorage } from './storage.js';
import { initialGame, selectChallenge, startQuest, completeQuest } from '../../frontend/src/utils/game.js';
import { buyOutfit, wearOutfit, eventSnapshot, reactionEvent } from './actions.js';
import { CLOTHES } from '../../frontend/src/utils/clothes.js';

test('웹 백업과 앱 백업은 XP·코인·아이템·배치·기록을 보존하고 반복 이관해도 같음', () => {
  const game = { ...initialGame(), xp: 720, coins: 350, character: 'mochi', characters: ['potato', 'pink', 'mochi'], ownedDecor: ['lamp-moon'], decor: { lamp: 'lamp-moon' }, journals: { '2026-10-06': '작은 하루' } };
  const web = { 'mochi.game.v1': JSON.stringify(game), 'mochi.wardrobe.v1': JSON.stringify({ owned: ['sky'], outfit: 'sky' }), 'mochi.petName': '구름이' };
  const first = decodeBackup(web), second = decodeBackup(encodeBackup(first));
  assert.deepEqual(second, first);
  assert.equal(second.game.xp, 720); assert.equal(second.game.coins, 350);
  assert.deepEqual(second.game.decor, game.decor);
  assert.deepEqual(second.wardrobe, { owned: ['sky'], outfit: 'sky' });
  assert.deepEqual(second.game.nicknames, { mochi: '구름이' });
});
test('앱 저장·복원 후 시작과 완료 기록을 유지하고 보상을 다시 지급하지 않음', async () => {
  const now = new Date('2026-10-06T10:00:00+09:00');
  let game = selectChallenge(initialGame(), 'day-walk', '2026-10-06');
  game = completeQuest(startQuest(game, 'day-walk', now), 'day-walk', now);
  const state = decodeBackup({ 'mochi.game.v1': game });
  const data = new Map();
  const storage = { multiSet: async pairs => pairs.forEach(([key, value]) => data.set(key, value)), multiGet: async keys => keys.map(key => [key, data.get(key) ?? null]) };
  await saveStorage(storage, state);
  const restored = await loadStorage(storage);
  assert.deepEqual(restored, state);
  assert.equal(completeQuest(restored.game, 'day-walk', now), restored.game);
});
test('새 앱은 실제 초기값을 사용하고 손상된 데이터는 초기화하지 않고 거절', async () => {
  const fresh = await loadStorage({ multiGet: async keys => keys.map(key => [key, null]) });
  assert.equal(fresh.game.coins, 90); assert.equal(fresh.game.xp, 0);
  assert.throws(() => decodeBackup({ 'mochi.game.v1': '{broken' }));
  assert.throws(() => decodeBackup({ 'mochi.game.v1': { xp: 0, coins: -1, characters: [], completed: [] } }));
  assert.throws(() => decodeBackup({ 'mochi.wardrobe.v1': { owned: 'broken' } }));
  assert.throws(() => decodeBackup({ 'mochi.game.v1': 'null' }));
  assert.throws(() => decodeBackup({ 'mochi.visitNotes.v1': { yuna: 'broken' } }));
});
test('옷 구매 연속 실행은 한 번만 차감하고 구매만으로 착용하거나 축하하지 않음', () => {
  const before = decodeBackup({ 'mochi.game.v1': { ...initialGame(), coins: 250 } });
  const bought = buyOutfit(before, CLOTHES[0]);
  assert.equal(bought.game.coins, 130);
  assert.equal(buyOutfit(bought, CLOTHES[0]), bought);
  assert.equal(bought.wardrobe.outfit, null);
  assert.equal(reactionEvent(eventSnapshot(before), bought).celebrate, false);
  const worn = wearOutfit(bought, CLOTHES[0].id);
  assert.equal(reactionEvent(eventSnapshot(bought), worn).celebrate, true);
  assert.equal(reactionEvent(eventSnapshot(worn), wearOutfit(worn, CLOTHES[0].id)).celebrate, false);
  assert.equal(wearOutfit(before, 'star'), before);
});
test('축하는 새 보상 이벤트에서만 발생하고 재렌더·복원·캐릭터 변경에서는 발생하지 않음', () => {
  const before = decodeBackup({ 'mochi.game.v1': initialGame() });
  const completed = { ...before, game: { ...before.game, questReward: { sequence: 1, xp: 15, coins: 25 } } };
  assert.equal(reactionEvent(eventSnapshot(before), completed).celebrate, true);
  assert.equal(reactionEvent(eventSnapshot(completed), completed).celebrate, false);
  assert.equal(reactionEvent(null, completed).celebrate, false);
  const changed = { ...completed, game: { ...completed.game, character: 'pink' } };
  assert.equal(reactionEvent(eventSnapshot(completed), changed).celebrate, false);
  const unpaid = { ...completed, game: { ...completed.game, questReward: { sequence: 2, xp: 0, coins: 0 } } };
  assert.equal(reactionEvent(eventSnapshot(completed), unpaid).celebrate, false);
});
