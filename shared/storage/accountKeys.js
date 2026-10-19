// 기기 안 기록(휴대폰 AsyncStorage · 브라우저 localStorage)을 로그인한 계정마다 따로 (10/19).
// 계정이 바뀌어도 다른 사람의 일기·초안·설정이 보이지 않게, 저장 이름 앞에 계정 id를 붙인다: mochi.u.<id>.mochi.game.v1
// 로그인하지 않은 개발용 미리보기는 지금처럼 기본 이름(접두어 없음)을 쓴다.
// 예전(계정 구분 없던) 기록은 처음 로그인한 계정 하나에게만 옮겨 준다 → 잃지도 않고, 다른 계정에 보이지도 않는다.

export const LEGACY_OWNER_KEY = 'mochi.legacyOwner';
export const accountPrefix = id => id ? `mochi.u.${id}.` : '';
export const scopedKey = (key, id) => accountPrefix(id) + key;

function plan(id, owner, legacy, mine) {
  if (!id || owner) return { copy: false, mark: false };              // 미리보기이거나 이미 누군가 가져감
  const hasLegacy = legacy.some(v => v !== null), hasMine = mine.some(v => v !== null);
  return { copy: hasLegacy && !hasMine, mark: true };
}

// localStorage 모양(getItem·setItem, 동기)
export function claimLegacy(store, id, keys) {
  const p = plan(id, store.getItem(LEGACY_OWNER_KEY), keys.map(k => store.getItem(k)), keys.map(k => store.getItem(scopedKey(k, id))));
  if (p.copy) for (const k of keys) { const v = store.getItem(k); if (v !== null) store.setItem(scopedKey(k, id), v); }
  if (p.mark) store.setItem(LEGACY_OWNER_KEY, id);
  return p.copy;
}

// AsyncStorage 모양(multiGet·multiSet·getItem·setItem, 비동기)
export async function claimLegacyAsync(storage, id, keys) {
  if (!id) return false;
  const owner = await storage.getItem(LEGACY_OWNER_KEY);
  const legacy = (await storage.multiGet(keys)).map(([, v]) => v), mine = (await storage.multiGet(keys.map(k => scopedKey(k, id)))).map(([, v]) => v);
  const p = plan(id, owner, legacy, mine);
  if (p.copy) await storage.multiSet(keys.map((k, i) => [scopedKey(k, id), legacy[i]]).filter(([, v]) => v !== null));
  if (p.mark) await storage.setItem(LEGACY_OWNER_KEY, id);
  return p.copy;
}

// AsyncStorage를 계정 칸으로 감싼다 (id가 없으면 그대로). loadStorage·saveStorage가 그대로 쓸 수 있게 같은 모양
export const scopedStorage = (storage, id) => !id ? storage : {
  multiGet: async keys => (await storage.multiGet(keys.map(k => scopedKey(k, id)))).map(([, v], i) => [keys[i], v]),
  multiSet: pairs => storage.multiSet(pairs.map(([k, v]) => [scopedKey(k, id), v])),
  multiRemove: keys => storage.multiRemove(keys.map(k => scopedKey(k, id))),
  getItem: k => storage.getItem(scopedKey(k, id)),
  setItem: (k, v) => storage.setItem(scopedKey(k, id), v),
};
