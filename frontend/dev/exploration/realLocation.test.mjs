import test from 'node:test';
import assert from 'node:assert/strict';
import { clearLocationWatch, locationErrorMessage, LOCATION_OPTIONS, normalizePosition, watchCurrentLocation } from './realLocation.mjs';
import { kakaoMapsSdkUrl } from './kakaoMaps.mjs';

test('location watch normalizes a real browser position and uses bounded refresh options', () => {
  let success;
  let options;
  const geolocation = {
    watchPosition(onSuccess, _onError, givenOptions) {
      success = onSuccess;
      options = givenOptions;
      return 17;
    },
  };
  let received;
  const watchId = watchCurrentLocation(geolocation, position => { received = position; }, () => {});
  success({ coords: { latitude: 37.5, longitude: 127, accuracy: 42 }, timestamp: 1234 });
  assert.equal(watchId, 17);
  assert.deepEqual(received, { latitude: 37.5, longitude: 127, accuracy: 42, timestamp: 1234 });
  assert.deepEqual(options, LOCATION_OPTIONS);
});

test('location failures are described without treating them as movement', () => {
  assert.match(locationErrorMessage({ code: 1 }), /권한/);
  assert.match(locationErrorMessage({ code: 2 }), /확인하지 못/);
  assert.match(locationErrorMessage({ code: 3 }), /시간/);
});

test('invalid browser coordinates are ignored instead of becoming a map marker', () => {
  assert.equal(normalizePosition({ coords: { latitude: 200, longitude: 127, accuracy: 20 }, timestamp: 1234 }), null);
  assert.equal(normalizePosition({ coords: { latitude: 37, longitude: 127, accuracy: -1 }, timestamp: 1234 }), null);
});

test('watch can be explicitly stopped when its screen is left', () => {
  let cleared;
  clearLocationWatch({ clearWatch: id => { cleared = id; } }, 17);
  clearLocationWatch({ clearWatch: id => { cleared = id; } }, null);
  assert.equal(cleared, 17);
});

test('Kakao Maps SDK uses the JavaScript app key and waits for explicit map load', () => {
  const url = new URL(kakaoMapsSdkUrl('js-key'));
  assert.equal(url.origin, 'https://dapi.kakao.com');
  assert.equal(url.pathname, '/v2/maps/sdk.js');
  assert.equal(url.searchParams.get('appkey'), 'js-key');
  assert.equal(url.searchParams.get('autoload'), 'false');
  assert.equal(url.searchParams.get('libraries'), 'services');
});
