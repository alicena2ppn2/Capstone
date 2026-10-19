import test from 'node:test';
import assert from 'node:assert/strict';
import { LEGACY_OWNER_KEY, claimLegacy, claimLegacyAsync, scopedKey } from './accountKeys.js';

const KEYS = ['mochi.game.v1', 'mochi.settings.v1'];
function memory(seed = {}) {
  const map = new Map(Object.entries(seed));
  return { map, getItem: k => map.has(k) ? map.get(k) : null, setItem: (k, v) => map.set(k, String(v)),
    multiGet: async ks => ks.map(k => [k, map.has(k) ? map.get(k) : null]), multiSet: async pairs => pairs.forEach(([k, v]) => map.set(k, v)) };
}

test('scoped keys per account; preview keeps plain keys', () => {
  assert.equal(scopedKey('mochi.game.v1', 'abc'), 'mochi.u.abc.mochi.game.v1');
  assert.equal(scopedKey('mochi.game.v1', null), 'mochi.game.v1');
});

test('old records go to the first account only (sync)', () => {
  const s = memory({ 'mochi.game.v1': '{"xp":5}' });
  assert.equal(claimLegacy(s, 'A', KEYS), true);
  assert.equal(s.getItem(scopedKey('mochi.game.v1', 'A')), '{"xp":5}');
  assert.equal(claimLegacy(s, 'B', KEYS), false);                       // 두 번째 계정은 빈 기록
  assert.equal(s.getItem(scopedKey('mochi.game.v1', 'B')), null);
  assert.equal(s.getItem(LEGACY_OWNER_KEY), 'A');
  assert.equal(claimLegacy(s, null, KEYS), false);                      // 미리보기는 옮기지 않음
});

test('nothing old → just remember the owner; existing account data is never overwritten (async)', async () => {
  const empty = memory();
  assert.equal(await claimLegacyAsync(empty, 'A', KEYS), false);
  assert.equal(empty.getItem(LEGACY_OWNER_KEY), 'A');
  const both = memory({ 'mochi.game.v1': 'old', [scopedKey('mochi.game.v1', 'A')]: 'mine' });
  assert.equal(await claimLegacyAsync(both, 'A', KEYS), false);
  assert.equal(both.getItem(scopedKey('mochi.game.v1', 'A')), 'mine');
  const fresh = memory({ 'mochi.game.v1': 'old', 'mochi.settings.v1': 'set' });
  assert.equal(await claimLegacyAsync(fresh, 'C', KEYS), true);
  assert.equal(fresh.getItem(scopedKey('mochi.settings.v1', 'C')), 'set');
});

test('scoped storage reads/writes only that account', async () => {
  const { scopedStorage } = await import('./accountKeys.js');
  const s = memory({ 'mochi.game.v1': 'old' }), a = scopedStorage(s, 'A');
  await a.multiSet([['mochi.game.v1', 'a-game']]);
  assert.deepEqual(await a.multiGet(['mochi.game.v1', 'mochi.settings.v1']), [['mochi.game.v1', 'a-game'], ['mochi.settings.v1', null]]);
  assert.equal(s.getItem('mochi.game.v1'), 'old');
  assert.deepEqual(await scopedStorage(s, 'B').multiGet(['mochi.game.v1']), [['mochi.game.v1', null]]);
  assert.equal(scopedStorage(s, null), s);
});
