import test from 'node:test';
import assert from 'node:assert/strict';
import { combinePlaceResults, DEFAULT_RADIUS, normalizeSearchResult, PLACE_CATEGORIES, searchNearbyPlaces } from './placeSearch.mjs';
import { LOCAL_NOTES_KEY, notesForPlace, readLocalNotes, writeLocalNotes } from './livePlaces.mjs';
import { groupNearbyPlaces } from './livePlaceMarkers.mjs';

const center = { latitude: 37.5664, longitude: 126.9778 };
const result = (id, name, categoryName = '', x = 126.9778, y = 37.5664) => ({
  id, place_name: name, category_name: categoryName, x: String(x), y: String(y),
  place_url: `https://place.map.kakao.com/${id}`,
});

test('Kakao category and keyword search use the same 1km center but distinct APIs', async () => {
  const calls = [];
  const sdk = {
    LatLng: class { constructor(latitude, longitude) { this.latitude = latitude; this.longitude = longitude; } },
    services: { SortBy: { DISTANCE: 'DISTANCE' }, Status: { OK: 'OK', ZERO_RESULT: 'ZERO_RESULT' } },
  };
  const service = {
    categorySearch(query, callback, options) {
      calls.push({ method: 'category', query, options });
      callback([result('101', '시민문화회관', '문화시설')], 'OK');
    },
    keywordSearch(query, callback, options) {
      calls.push({ method: 'keyword', query, options });
      callback(query === '공원' ? [result('101', '시민문화회관 공원', '공원'), result('102', '마을공원', '공원')] : [], query === '공원' ? 'OK' : 'ZERO_RESULT');
    },
  };
  const found = await searchNearbyPlaces(sdk, service, center);
  assert.deepEqual(calls.map(call => `${call.method}:${call.query}`), ['keyword:공원', 'keyword:도서관', 'category:CT1', 'category:CE7']);
  assert.ok(calls.every(call => call.options.radius === DEFAULT_RADIUS && call.options.location.latitude === center.latitude));
  assert.deepEqual(combinePlaceResults(found.resultsByCategory).map(place => place.id), ['101', '102']);
  assert.equal(combinePlaceResults(found.resultsByCategory, 'park').length, 2);
  assert.equal(combinePlaceResults(found.resultsByCategory, 'library').length, 0);
});

test('search results keep only official IDs, valid positions, and places inside the radius', () => {
  const park = PLACE_CATEGORIES[0];
  assert.equal(normalizeSearchResult(result('44', '동네공원'), park, center, 1000).id, '44');
  assert.equal(normalizeSearchResult(result('bad', '동네공원'), park, center, 1000), null);
  assert.equal(normalizeSearchResult(result('45', '동네카페'), park, center, 1000), null);
  assert.equal(normalizeSearchResult(result('46', '먼공원', '공원', 127.5), park, center, 1000), null);
  const maliciousUrl = { ...result('47', '동네공원'), place_url: 'javascript:alert(1)' };
  assert.equal(normalizeSearchResult(maliciousUrl, park, center, 1000).officialUrl, null);
});

test('one failed category is reported without silently treating it as empty', async () => {
  const sdk = {
    LatLng: class { constructor(latitude, longitude) { this.latitude = latitude; this.longitude = longitude; } },
    services: { SortBy: { DISTANCE: 'DISTANCE' }, Status: { OK: 'OK', ZERO_RESULT: 'ZERO_RESULT', ERROR: 'ERROR' } },
  };
  const service = {
    categorySearch(_query, callback) { callback([], 'ZERO_RESULT'); },
    keywordSearch(query, callback) { callback([], query === '공원' ? 'ERROR' : 'ZERO_RESULT'); },
  };
  const found = await searchNearbyPlaces(sdk, service, center);
  assert.deepEqual(found.failedCategories, ['park']);
  assert.deepEqual(combinePlaceResults(found.resultsByCategory), []);
});

test('local notes use Kakao place IDs and preserve older preview notes without sharing', () => {
  const memory = new Map();
  const storage = { getItem: key => memory.get(key) ?? null, setItem: (key, value) => memory.set(key, value) };
  const notes = [
    { id: 'one', placeId: '101', text: '<b>plain text</b>', color: 'yellow', sticker: '♡', createdAt: '2026-10-17T00:00:00Z' },
    { id: 'old', placeId: 'seoul-library', text: '기존 쪽지', color: 'mint', sticker: '✿', createdAt: '2026-10-17T00:00:00Z' },
  ];
  writeLocalNotes(storage, notes);
  assert.equal(memory.has(LOCAL_NOTES_KEY), true);
  const read = readLocalNotes(storage);
  assert.deepEqual(notesForPlace(read, { id: '101', name: '서울도서관', ...center }).map(note => note.id), ['one', 'old']);
  assert.equal(read.find(note => note.id === 'old').source, null);
  assert.deepEqual(notesForPlace(read, { id: '102', name: '다른 도서관', ...center }), []);
});

test('nearby place pins group without dropping distinct official IDs', () => {
  const groups = groupNearbyPlaces([
    { id: '1', latitude: center.latitude, longitude: center.longitude },
    { id: '2', latitude: center.latitude + .0001, longitude: center.longitude },
    { id: '3', latitude: center.latitude + .003, longitude: center.longitude },
  ]);
  assert.deepEqual(groups.map(group => group.map(place => place.id)), [['1', '2'], ['3']]);
});
