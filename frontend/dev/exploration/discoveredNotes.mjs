export const DISCOVERED_NOTES_KEY = 'my-mochi:dev:exploration:discovered-notes:v1';
export const NOTE_DRAFTS_KEY = 'my-mochi:dev:exploration:note-drafts:v1';

export function readDiscoveredNotes(storage) {
  try {
    const parsed = JSON.parse(storage?.getItem(DISCOVERED_NOTES_KEY) ?? '[]');
    if (!Array.isArray(parsed)) return [];
    const seen = new Set();
    return parsed.filter(item => {
      if (!item || typeof item.placeId !== 'string' || typeof item.noteId !== 'string'
        || item.placeId.length > 80 || item.noteId.length > 120) return false;
      const key = `${item.placeId}:${item.noteId}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    }).slice(0, 1000).map(item => ({ placeId: item.placeId, noteId: item.noteId,
      source: item.source === 'device-preview' ? 'device-preview' : 'simulation' }));
  } catch { return []; }
}

export function writeDiscoveredNotes(storage, notes) {
  storage.setItem(DISCOVERED_NOTES_KEY, JSON.stringify(notes));
}

export function hasDiscovered(notes, placeId, noteId, source) {
  return notes.some(item => item.placeId === placeId && item.noteId === noteId
    && (!source || item.source === source));
}

export function readNoteDrafts(storage) {
  try {
    const parsed = JSON.parse(storage?.getItem(NOTE_DRAFTS_KEY) ?? '{}');
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {};
    return Object.fromEntries(Object.entries(parsed).filter(([placeId, text]) =>
      /^\d+$/.test(placeId) && typeof text === 'string' && text.length <= 140));
  } catch { return {}; }
}

export function writeNoteDrafts(storage, drafts) {
  storage.setItem(NOTE_DRAFTS_KEY, JSON.stringify(drafts));
}
