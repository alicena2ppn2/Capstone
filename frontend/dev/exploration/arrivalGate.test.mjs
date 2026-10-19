import test from 'node:test';
import assert from 'node:assert/strict';
import { ARRIVAL_POLICY, arrivalRadiusFor, updateArrival } from './arrivalGate.mjs';
import { DISCOVERED_NOTES_KEY, NOTE_DRAFTS_KEY, hasDiscovered, readDiscoveredNotes, readNoteDrafts, writeDiscoveredNotes, writeNoteDrafts } from './discoveredNotes.mjs';

const place = { id: '123', icon: 'library', latitude: 37.5664, longitude: 126.9778 };
const fix = (timestamp, latitude = place.latitude, accuracy = 12) => ({ timestamp, latitude, longitude: place.longitude, accuracy });

test('arrival requires two distinct, recent, accurate fixes and does not widen the radius for poor accuracy', () => {
  const now = 100000;
  const first = updateArrival(null, fix(now - 2000), place, now);
  assert.equal(first.status, 'not-arrived');
  assert.equal(first.radius, arrivalRadiusFor(place));
  assert.equal(updateArrival(first, fix(now - 2000), place, now).status, 'not-arrived');
  assert.equal(updateArrival(first, fix(now - 1000, place.latitude, 80), place, now).status, 'uncertain');
  assert.equal(updateArrival(first, fix(now - ARRIVAL_POLICY.maxAgeMs - 1), place, now).status, 'uncertain');
  const arrived = updateArrival(first, fix(now - 1000), place, now);
  assert.equal(arrived.status, 'arrived');
  const oneOutside = updateArrival(arrived, fix(now + 100, place.latitude + .002), place, now + 100);
  assert.equal(oneOutside.status, 'arrived');
  assert.equal(updateArrival(oneOutside, fix(now + 200, place.latitude + .002), place, now + 200).status, 'not-arrived');
});

test('park search point is not treated as a verified entrance', () => {
  assert.equal(updateArrival(null, fix(1000), { ...place, icon: 'park' }, 1000).status, 'unavailable');
});

test('discovered note IDs and per-place drafts persist independently of game storage', () => {
  const memory = new Map();
  const storage = { getItem: key => memory.get(key) ?? null, setItem: (key, value) => memory.set(key, value) };
  const discovered = [{ placeId: '123', noteId: 'sample:123:0', source: 'simulation' }];
  writeDiscoveredNotes(storage, discovered);
  writeNoteDrafts(storage, { '123': '작성 중인 글', '456': '다른 장소 글' });
  assert.equal(memory.has(DISCOVERED_NOTES_KEY), true);
  assert.equal(memory.has(NOTE_DRAFTS_KEY), true);
  assert.equal(hasDiscovered(readDiscoveredNotes(storage), '123', 'sample:123:0'), true);
  assert.equal(hasDiscovered(readDiscoveredNotes(storage), '123', 'sample:123:0', 'simulation'), true);
  assert.equal(hasDiscovered(readDiscoveredNotes(storage), '123', 'sample:123:0', 'device-preview'), false);
  assert.equal(hasDiscovered(readDiscoveredNotes(storage), '123', 'sample:123:1'), false);
  assert.equal(readNoteDrafts(storage)['456'], '다른 장소 글');
});
