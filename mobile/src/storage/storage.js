import { initialGame, migrateQuestProgress } from '../../../shared/features/game.js';
import { restoreNicknames } from '../../../shared/data/catalog.js';
import { initialConnections } from '../../../shared/features/neighbors.js';

export const KEYS = ['mochi.game.v1', 'mochi.wardrobe.v1', 'mochi.visitConnections.v1', 'mochi.visitors.v1', 'mochi.visitNotes.v1', 'mochi.visitLikes.v1', 'mochi.homeGuestbook.v1', 'mochi.homeGuestLikes.v1', 'mochi.petName', 'mochi.settings.v1'];
export function decodeBackup(raw) {
  const values = typeof raw === 'string' ? JSON.parse(raw) : raw;
  if (!values || typeof values !== 'object' || Array.isArray(values)) throw new Error('올바른 백업 파일이 아니에요.');
  const read = key => typeof values[key] === 'string' && key !== 'mochi.petName' ? JSON.parse(values[key]) : values[key];
  const saved = read('mochi.game.v1');
  if (Object.hasOwn(values, 'mochi.game.v1') && !saved) throw new Error('게임 기록이 비어 있거나 손상되었어요.');
  if (saved && (!Number.isFinite(saved.xp) || saved.xp < 0 || !Number.isFinite(saved.coins) || saved.coins < 0 || !Array.isArray(saved.characters) || !Array.isArray(saved.completed))) throw new Error('게임 데이터 형식을 확인해 주세요.');
  const characters = [...new Set(['potato', ...(saved?.characters ?? [])])];
  const game = restoreNicknames(migrateQuestProgress(saved ? { ...saved, characters, character: characters.includes(saved.character) ? saved.character : 'potato' } : initialGame()), read('mochi.petName'));
  const wardrobe = read('mochi.wardrobe.v1') ?? { owned: [], outfit: null };
  if (!Array.isArray(wardrobe.owned)) throw new Error('옷장 데이터 형식을 확인해 주세요.');
  const oldConnections = read('mochi.visitConnections.v1') ?? {};
  for (const key of ['mochi.homeGuestbook.v1']) {
    if (read(key) !== undefined && read(key) !== null && !Array.isArray(read(key))) throw new Error('방명록 데이터 형식을 확인해 주세요.');
  }
  for (const key of ['mochi.visitConnections.v1', 'mochi.visitNotes.v1', 'mochi.visitLikes.v1', 'mochi.homeGuestLikes.v1', 'mochi.settings.v1']) {
    const value = read(key);
    if (value != null && (typeof value !== 'object' || Array.isArray(value))) throw new Error('저장 데이터 형식을 확인해 주세요.');
  }
  if (Object.values(read('mochi.visitNotes.v1') ?? {}).some(value => !Array.isArray(value))) throw new Error('이웃 방명록 데이터 형식을 확인해 주세요.');
  return { game, wardrobe,
    connections: { ...initialConnections(), ...oldConnections, reactions: oldConnections.reactions && typeof oldConnections.reactions === 'object' ? oldConnections.reactions : {}, recent: Array.isArray(oldConnections.recent) ? oldConnections.recent : [], favorites: Array.isArray(oldConnections.favorites) ? oldConnections.favorites : [] },
    visitors: read('mochi.visitors.v1') ?? null,
    visitNotes: read('mochi.visitNotes.v1') ?? {}, visitLikes: read('mochi.visitLikes.v1') ?? {},
    homeNotes: read('mochi.homeGuestbook.v1') ?? [], homeLikes: read('mochi.homeGuestLikes.v1') ?? {},
    settings: read('mochi.settings.v1') ?? { music: false, effects: false, reminders: false },
  };
}
export function encodeBackup(state) {
  const names = ['game', 'wardrobe', 'connections', 'visitors', 'visitNotes', 'visitLikes', 'homeNotes', 'homeLikes'];
  return Object.fromEntries([...names.map((name, index) => [KEYS[index], state[name]]), ['mochi.settings.v1', state.settings]]);
}
export async function loadStorage(storage) {
  const pairs = await storage.multiGet(KEYS);
  return decodeBackup(Object.fromEntries(pairs.filter(([, value]) => value !== null)));
}
export async function saveStorage(storage, state) {
  await storage.multiSet(Object.entries(encodeBackup(state)).map(([key, value]) => [key, JSON.stringify(value)]));
}
