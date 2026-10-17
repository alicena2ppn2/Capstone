// Curated review locations. Coordinates represent place areas, not entrances or arrival radii.
export const REVIEW_REGION = Object.freeze({ latitude: 37.5602, longitude: 126.9825 });
export const NEARBY_METERS = 5000;
export const NOTE_LIMIT = 140;
export const LOCAL_NOTES_KEY = 'my-mochi:dev:exploration:live-place-notes:v1';

export const LIVE_PLACES = Object.freeze([
  {
    id: 'seoul-library', name: '서울도서관', kind: '도서관', icon: 'library',
    latitude: 37.566406, longitude: 126.977822,
    intro: '서울시청 옛 청사에 있는 공공 도서관이에요.',
    locationNote: '서울특별시 중구 세종대로 110',
    officialUrl: 'https://lib.seoul.go.kr/',
    coordinateSource: 'https://fr.wikipedia.org/wiki/Biblioth%C3%A8que_m%C3%A9tropolitaine_de_S%C3%A9oul',
    sampleNotes: ['책 제목만 보려고 들어갔다가 표지를 한참 구경했어요. 빌린 책은 없지만 제목 하나는 기억나요.'],
  },
  {
    id: 'seoul-plaza', name: '서울광장', kind: '광장', icon: 'plaza',
    latitude: 37.565556, longitude: 126.978056,
    intro: '서울시청 앞의 열린 광장이에요.',
    locationNote: '잔디광장 안의 참고 지점',
    officialUrl: 'https://plaza.seoul.go.kr/',
    coordinateSource: 'https://fr.wikipedia.org/wiki/Seoul_Plaza',
    sampleNotes: ['친구를 기다리면서 하늘을 올려다봤어요. 구름 모양은 서로 다르게 봤지만 기다리는 시간은 금방 갔어요.'],
  },
  {
    id: 'namsan-park', name: '남산공원', kind: '공원', icon: 'park',
    latitude: 37.55042, longitude: 126.99287,
    intro: '서울 중구와 용산구에 걸친 공원이에요.',
    locationNote: '넓은 공원 구역을 대표하는 참고 지점 · 입구 아님',
    officialUrl: 'https://parks.seoul.go.kr/',
    coordinateSource: 'https://mapcarta.com/25946702',
    sampleNotes: ['바람이 좋아서 잠깐 더 서 있었어요. 가방 안 과자 부스러기를 털어야겠다는 생각은 집에 가서 났고요.'],
  },
]);

export function distanceMeters(a, b) {
  const radians = value => value * Math.PI / 180;
  const dLat = radians(b.latitude - a.latitude);
  const dLng = radians(b.longitude - a.longitude);
  const lat1 = radians(a.latitude);
  const lat2 = radians(b.latitude);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 6371000 * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}

export function readLocalNotes(storage) {
  try {
    const parsed = JSON.parse(storage?.getItem(LOCAL_NOTES_KEY) ?? '[]');
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(item => item && typeof item === 'object'
      && (LIVE_PLACES.some(place => place.id === item.placeId) || /^\d+$/.test(String(item.placeId ?? '')))
      && typeof item.text === 'string' && item.text.trim() && item.text.length <= NOTE_LIMIT
      && ['yellow', 'apricot', 'mint'].includes(item.color)
      && typeof item.id === 'string').map(item => ({
        id: item.id, placeId: item.placeId, text: item.text, color: item.color,
        sticker: ['♡', '✿', '☀'].includes(item.sticker) ? item.sticker : '♡',
        source: item.source === 'simulation' ? 'simulation'
          : item.source === 'device-preview' ? 'device-preview' : null,
        createdAt: typeof item.createdAt === 'string' && Number.isFinite(Date.parse(item.createdAt)) ? item.createdAt : null,
      }));
  } catch {
    return [];
  }
}

// Older preview notes used fixed review IDs; retain them for the matching Kakao place.
export function notesForPlace(notes, place) {
  const oldPlace = LIVE_PLACES.find(item => item.name === place.name
    && distanceMeters(item, place) < 400);
  return notes.filter(note => note.placeId === place.id || (oldPlace && note.placeId === oldPlace.id));
}

export function writeLocalNotes(storage, notes) {
  storage.setItem(LOCAL_NOTES_KEY, JSON.stringify(notes));
}
