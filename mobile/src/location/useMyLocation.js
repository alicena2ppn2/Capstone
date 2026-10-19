// 내 위치 (동네 탐험). 사용자가 '내 위치로 보기'를 눌렀을 때만 권한을 묻고 한 번 읽는다 (계속 따라가지 않음).
// 위치는 장소까지의 거리를 계산하는 데만 쓰고 서버에 저장하지 않는다 (/places에 lat·lng를 보내 거리만 받음).
// 앱 사용 중 권한만 쓴다 (백그라운드 위치 없음). 권한 문구는 app.json의 expo-location 플러그인.
import { useCallback, useState } from 'react';
import * as Location from 'expo-location';

export default function useMyLocation() {
  const [state, setState] = useState({ status: 'idle', coords: null, message: '' });   // idle · asking · ready · denied · error
  // precise: 쪽지를 남길 때처럼 정확한 위치가 필요할 때 (조금 더 오래 걸림)
  const locate = useCallback(async ({ precise = false } = {}) => {
    setState(s => ({ ...s, status: 'asking', message: '' }));
    try {
      const permission = await Location.requestForegroundPermissionsAsync();
      if (!permission.granted) {
        setState({ status: 'denied', coords: null, message: permission.canAskAgain ? '위치를 허용하면 가까운 장소부터 보여 드려요.' : '휴대폰 설정에서 이 앱의 위치 권한을 켜 주세요.' });
        return null;
      }
      const position = await Location.getCurrentPositionAsync({ accuracy: precise ? Location.Accuracy.High : Location.Accuracy.Balanced });
      const coords = { latitude: position.coords.latitude, longitude: position.coords.longitude, accuracy: position.coords.accuracy };
      setState({ status: 'ready', coords, message: '' });
      return coords;
    } catch {
      setState({ status: 'error', coords: null, message: '위치를 찾지 못했어요. 잠시 뒤 다시 눌러 주세요.' });
      return null;
    }
  }, []);
  return { ...state, locate };
}

// 두 위치 사이 거리(m, 하버사인 — 서버 places.distance_m과 같은 공식)
export function distanceM(a, b) {
  const r = x => x * Math.PI / 180, dLat = r(b.latitude - a.latitude), dLng = r(b.longitude - a.longitude);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(r(a.latitude)) * Math.cos(r(b.latitude)) * Math.sin(dLng / 2) ** 2;
  return 6_371_000 * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}

// 거리 보기 좋게: 950m · 1.4km
export const formatDistance = m => m == null ? '' : m < 1000 ? `${Math.round(m / 10) * 10}m` : `${(m / 1000).toFixed(1)}km`;
