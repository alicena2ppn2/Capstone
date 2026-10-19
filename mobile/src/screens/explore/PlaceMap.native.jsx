// 동네 탐험 지도 (iPhone: Apple 지도, Android: Google 지도 — react-native-maps).
// 장소마다 핀, 내 위치를 허용했으면 파란 점. 핀을 누르면 아래 목록에서 그 장소가 펼쳐진다.
import React, { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import { colors } from '../../../../shared/theme/tokens.js';
import { formatDistance } from '../../location/useMyLocation';

// 장소들과 내 위치가 모두 보이는 범위
function regionFor(places, me) {
  const points = [...places, ...(me ? [me] : [])];
  if (!points.length) return { latitude: 37.5602, longitude: 126.9825, latitudeDelta: 0.04, longitudeDelta: 0.04 };
  const lats = points.map(p => p.latitude), lngs = points.map(p => p.longitude);
  const [minLat, maxLat, minLng, maxLng] = [Math.min(...lats), Math.max(...lats), Math.min(...lngs), Math.max(...lngs)];
  return { latitude: (minLat + maxLat) / 2, longitude: (minLng + maxLng) / 2, latitudeDelta: Math.max(0.01, (maxLat - minLat) * 1.6), longitudeDelta: Math.max(0.01, (maxLng - minLng) * 1.6) };
}

export default function PlaceMap({ places, me, selected, onSelect }) {
  const region = useMemo(() => regionFor(places, me), [places, me]);
  return <View style={s.box}>
    <MapView style={StyleSheet.absoluteFill} initialRegion={region} region={region} showsUserLocation={!!me} showsMyLocationButton={false} toolbarEnabled={false} accessibilityLabel="동네 탐험 지도">
      {places.map(p => <Marker key={p.id} coordinate={{ latitude: p.latitude, longitude: p.longitude }} title={p.name}
        description={`${p.kind}${p.distance_m != null ? ` · ${formatDistance(p.distance_m)}` : ''}`}
        pinColor={selected === p.id ? colors.primary : '#E0695E'} onPress={() => onSelect(p.id)} />)}
    </MapView>
  </View>;
}

const s = StyleSheet.create({ box: { width: '100%', height: 260, borderRadius: 18, overflow: 'hidden', borderWidth: 1, borderColor: colors.border } });
