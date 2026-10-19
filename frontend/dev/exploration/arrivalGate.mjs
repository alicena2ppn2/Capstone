import { distanceMeters } from './livePlaces.mjs';

// Preview-only thresholds. These do not prove a visit or authorize server content.
export const ARRIVAL_POLICY = Object.freeze({
  maxAccuracyMeters: 30,
  maxAgeMs: 15000,
  exitMarginMeters: 25,
  requiredInsideFixes: 2,
  requiredOutsideFixes: 2,
});
export const DEFAULT_RADIUS_BY_ICON = Object.freeze({ cafe: 50, library: 60, culture: 60, park: 60 });
export const PLACE_RADIUS_OVERRIDES = Object.freeze({});

export function arrivalRadiusFor(place) {
  return PLACE_RADIUS_OVERRIDES[place.id] ?? DEFAULT_RADIUS_BY_ICON[place.icon] ?? 60;
}

export function updateArrival(previous, fix, place, nowMs) {
  const base = previous ?? { arrived: false, insideCount: 0, outsideCount: 0, lastTimestamp: null };
  const radius = arrivalRadiusFor(place);
  if (place.icon === 'park') return { ...base, status: 'unavailable', reason: '공원 입구 좌표가 확인되지 않아 위치로 열 수 없어요.', radius };
  if (!fix) return { ...base, status: 'unavailable', reason: '위치 확인이 필요해요.', radius };
  if (!Number.isFinite(fix.timestamp) || fix.timestamp > nowMs + 5000 || nowMs - fix.timestamp > ARRIVAL_POLICY.maxAgeMs) {
    return { ...base, status: 'uncertain', reason: '위치 측정이 오래됐어요. 다시 측정해 주세요.', radius };
  }
  if (!Number.isFinite(fix.accuracy) || fix.accuracy > ARRIVAL_POLICY.maxAccuracyMeters) {
    return { ...base, status: 'uncertain', reason: '위치 정확도가 낮아요. 다시 측정해 주세요.', radius };
  }
  const distance = distanceMeters(fix, place);
  if (base.lastTimestamp === fix.timestamp) return { ...base, status: base.arrived ? 'arrived' : 'not-arrived', distance, radius, reason: '' };
  let insideCount = base.insideCount;
  let outsideCount = base.outsideCount;
  let arrived = base.arrived;
  if (distance <= radius) {
    insideCount += 1;
    outsideCount = 0;
    if (insideCount >= ARRIVAL_POLICY.requiredInsideFixes) arrived = true;
  } else if (distance > radius + ARRIVAL_POLICY.exitMarginMeters) {
    outsideCount += 1;
    insideCount = 0;
    if (outsideCount >= ARRIVAL_POLICY.requiredOutsideFixes) arrived = false;
  } else {
    insideCount = 0;
    outsideCount = 0;
  }
  return { arrived, insideCount, outsideCount, lastTimestamp: fix.timestamp,
    status: arrived ? 'arrived' : 'not-arrived', distance, radius, reason: '' };
}
