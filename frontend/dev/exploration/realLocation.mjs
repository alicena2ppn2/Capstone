export const LOCATION_OPTIONS = Object.freeze({
  enableHighAccuracy: true,
  maximumAge: 0,
  timeout: 12000,
});

export function normalizePosition(position) {
  const latitude = position?.coords?.latitude;
  const longitude = position?.coords?.longitude;
  const accuracy = position?.coords?.accuracy;
  const timestamp = position?.timestamp;
  if (!Number.isFinite(latitude) || latitude < -90 || latitude > 90 ||
      !Number.isFinite(longitude) || longitude < -180 || longitude > 180 ||
      !Number.isFinite(accuracy) || accuracy < 0 || !Number.isFinite(timestamp)) return null;
  return {
    latitude,
    longitude,
    accuracy,
    timestamp,
  };
}

export function locationErrorMessage(error) {
  if (error?.code === 1) return '위치 권한이 허용되지 않았어요. 브라우저 사이트 설정에서 허용한 뒤 다시 시도해 주세요.';
  if (error?.code === 3) return '위치를 확인하는 데 시간이 걸리고 있어요. 다시 시도하거나 예시 지도를 이용해 주세요.';
  if (error?.code === 2) return '현재 위치를 확인하지 못했어요. 기기의 위치 설정을 확인하고 다시 시도해 주세요.';
  return '위치 기능을 사용할 수 없어요. 브라우저 설정을 확인하고 다시 시도해 주세요.';
}

export function watchCurrentLocation(geolocation, onPosition, onError) {
  if (!geolocation?.watchPosition) throw new Error('geolocation-unavailable');
  return geolocation.watchPosition(
    position => {
      const normalized = normalizePosition(position);
      if (normalized) onPosition(normalized);
    },
    error => onError(error, locationErrorMessage(error)),
    LOCATION_OPTIONS,
  );
}

export function clearLocationWatch(geolocation, watchId) {
  if (watchId !== null && watchId !== undefined) geolocation?.clearWatch?.(watchId);
}
