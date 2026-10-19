import { distanceMeters } from './livePlaces.mjs';

export const DEFAULT_RADIUS = 1000;
export const EXPANDED_RADIUS = 2000;
export const MAX_VISIBLE_PLACES = 10;
export const SEARCH_TIMEOUT_MS = 10000;

// Kakao category codes exist for culture and cafes. Parks and libraries need keyword search.
export const PLACE_CATEGORIES = Object.freeze([
  { id: 'park', label: '공원', icon: 'park', method: 'keyword', query: '공원' },
  { id: 'library', label: '도서관', icon: 'library', method: 'keyword', query: '도서관' },
  { id: 'culture', label: '문화시설', icon: 'culture', method: 'category', query: 'CT1' },
  { id: 'cafe', label: '카페', icon: 'cafe', method: 'category', query: 'CE7' },
]);

export function normalizeSearchResult(row, category, center, radius) {
  const id = String(row?.id ?? '');
  const latitude = Number(row?.y);
  const longitude = Number(row?.x);
  const name = String(row?.place_name ?? '').trim();
  if (!/^\d+$/.test(id) || !name || !Number.isFinite(latitude) || !Number.isFinite(longitude)
    || latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) return null;
  if (category.method === 'keyword' && !`${name} ${row.category_name ?? ''}`.includes(category.query)) return null;
  const distance = distanceMeters(center, { latitude, longitude });
  if (distance > radius) return null;
  let officialUrl = null;
  try {
    const url = new URL(row.place_url);
    if (url.protocol === 'https:' && url.hostname === 'place.map.kakao.com') officialUrl = url.toString();
  } catch { /* Search results can omit a place URL. */ }
  return {
    id, name, latitude, longitude, distance,
    kind: category.label, icon: category.icon, categoryId: category.id,
    categoryName: String(row.category_name ?? ''),
    address: String(row.road_address_name || row.address_name || '').trim(),
    officialUrl,
  };
}

export function combinePlaceResults(resultsByCategory, filter = 'all') {
  const selected = filter === 'all' ? PLACE_CATEGORIES : PLACE_CATEGORIES.filter(item => item.id === filter);
  const queues = selected.map(category => [...(resultsByCategory[category.id] ?? [])].sort((a, b) => a.distance - b.distance));
  const seen = new Set();
  const combined = [];
  while (combined.length < MAX_VISIBLE_PLACES && queues.some(queue => queue.length)) {
    for (const queue of queues) {
      const place = queue.shift();
      if (place && !seen.has(place.id)) {
        seen.add(place.id);
        combined.push(place);
        if (combined.length >= MAX_VISIBLE_PLACES) break;
      }
    }
  }
  return combined;
}

export async function searchNearbyPlaces(sdk, service, center, radius = DEFAULT_RADIUS) {
  const location = new sdk.LatLng(center.latitude, center.longitude);
  const options = { location, radius, size: 15, page: 1, sort: sdk.services.SortBy.DISTANCE };
  const settled = await Promise.allSettled(PLACE_CATEGORIES.map(category => new Promise((resolve, reject) => {
    let finished = false;
    const finish = (error, rows) => {
      if (finished) return;
      finished = true;
      clearTimeout(timer);
      if (error) reject(error);
      else resolve(rows);
    };
    const timer = setTimeout(() => finish(new Error(`Kakao place search timed out: ${category.id}`)), SEARCH_TIMEOUT_MS);
    const callback = (rows, status) => {
      if (status === sdk.services.Status.OK) finish(null, (rows ?? [])
        .map(row => normalizeSearchResult(row, category, center, radius)).filter(Boolean));
      else if (status === sdk.services.Status.ZERO_RESULT) finish(null, []);
      else finish(new Error(`Kakao place search failed: ${category.id}`));
    };
    try {
      if (category.method === 'category') service.categorySearch(category.query, callback, options);
      else service.keywordSearch(category.query, callback, options);
    } catch (error) { finish(error); }
  })));
  const failedCategories = [];
  const resultsByCategory = {};
  settled.forEach((result, index) => {
    const id = PLACE_CATEGORIES[index].id;
    if (result.status === 'fulfilled') resultsByCategory[id] = result.value;
    else failedCategories.push(id);
  });
  if (failedCategories.length === PLACE_CATEGORIES.length) throw new Error('all-place-searches-failed');
  return { resultsByCategory, failedCategories };
}
