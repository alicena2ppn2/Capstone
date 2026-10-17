const SDK_URL = 'https://dapi.kakao.com/v2/maps/sdk.js';
let pendingSdk = null;
let pendingKey = '';

export function kakaoMapsSdkUrl(key) {
  const url = new URL(SDK_URL);
  url.searchParams.set('appkey', key);
  url.searchParams.set('autoload', 'false');
  return url.toString();
}

export function loadKakaoMapsSdk(key, documentRef = document, windowRef = window) {
  if (!key) return Promise.reject(new Error('missing-key'));
  if (windowRef.kakao?.maps) return loadMapsApi(windowRef.kakao);
  if (pendingSdk && pendingKey === key) return pendingSdk;

  pendingKey = key;
  pendingSdk = new Promise((resolve, reject) => {
    const script = documentRef.createElement('script');
    script.src = kakaoMapsSdkUrl(key);
    script.async = true;
    let settled = false;
    const finish = (error, maps) => {
      if (settled) return;
      settled = true;
      windowRef.clearTimeout(timer);
      if (error) {
        script.remove();
        pendingSdk = null;
        reject(error);
      } else resolve(maps);
    };
    const timer = windowRef.setTimeout(() => finish(new Error('sdk-timeout')), 12000);
    script.onload = () => {
      if (!windowRef.kakao?.maps) {
        finish(new Error('sdk-unavailable'));
        return;
      }
      loadMapsApi(windowRef.kakao).then(maps => finish(null, maps), error => finish(error));
    };
    script.onerror = () => finish(new Error('sdk-load-failed'));
    documentRef.head.appendChild(script);
  });
  return pendingSdk;
}

function loadMapsApi(kakao) {
  return new Promise((resolve, reject) => {
    try {
      kakao.maps.load(() => resolve(kakao.maps));
    } catch (error) {
      reject(error);
    }
  });
}
