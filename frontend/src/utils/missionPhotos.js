import { seoulDateKey } from './seoulDate.js';
import { dailyActivities, finishDailyMission } from './dailyMissions.js';

export const PHOTO_MAX_BYTES = 10 * 1024 * 1024;
export function completePhotoMission(game, id, date, photo, now = new Date()) {
  const key = `${date}:${id}`, quest = dailyActivities(game, date).find(q => q.id === id);
  if (date !== seoulDateKey(now) || !quest?.photo || game.completed.includes(key) ||
      !game.started.includes(key) || game.dailyMissions?.[date]?.paused.includes(id) ||
      !photo?.id || !['indexeddb', 'device'].includes(photo.storage) || !photo.uri ||
      !photo.mime?.startsWith('image/') || !(photo.size > 0 && photo.size <= PHOTO_MAX_BYTES)) return game;
  const next = { ...game, missionPhotos: { ...game.missionPhotos, [key]: {
    ...photo, date, questId: id, title: quest.name, savedAt: now.toISOString(),
  } } };
  const finished = finishDailyMission(next, id, now);
  return finished.completed.includes(key) ? finished : game;
}
export const albumPhotos = game => Object.values(game.missionPhotos ?? {}).sort((a, b) => b.savedAt.localeCompare(a.savedAt));
