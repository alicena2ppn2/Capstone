// 동네 탐험 (영주 님 웹 시안 frontend/dev/exploration A안을 앱으로). 서버 장소 목록 + 내 위치로 가까운 순·거리.
// 위치 권한은 '내 위치로 보기'를 눌렀을 때만 묻는다. 지도: 휴대폰은 Apple·Google 지도(PlaceMap.native), 웹 미리보기는 점 그림. 장소 쪽지(4단계)는 이어 붙인다.
import React, { useCallback, useEffect, useState } from 'react';
import { Linking, View } from 'react-native';
import { colors } from '../../../shared/theme/tokens.js';
import { Label, Button, Card, styles, ScreenHeader } from '../components/ui';
import { placesNear, serverConfigured } from '../api/server';
import useMyLocation, { formatDistance } from '../location/useMyLocation';
import PlaceMap from './explore/PlaceMap';

const ICON = { library: '📚', plaza: '🌳', park: '🌲' };

export default function Explore({ onBack }) {
  const location = useMyLocation();
  const [places, setPlaces] = useState(null), [error, setError] = useState(''), [open, setOpen] = useState(null);
  const load = useCallback(async coords => {
    try { const r = await placesNear(coords); setPlaces(r.places); setError(''); }
    catch (e) { setError(e.message); }
  }, []);
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { if (serverConfigured) void load(null); }, [load]);
  const near = async () => { const coords = await location.locate(); if (coords) await load(coords); };
  if (!serverConfigured) return <><ScreenHeader title="동네 탐험" onBack={onBack} /><Card><Label style={styles.body}>서버에 연결되면 동네 장소를 볼 수 있어요.</Label></Card></>;
  return <>
    <ScreenHeader title="동네 탐험" onBack={onBack} />
    <Card style={{ backgroundColor: colors.primarySoft, borderColor: colors.primarySoft, gap: 6 }}>
      <Label style={styles.cardTitle}>🗺️ 모찌와 동네 한 바퀴</Label>
      <Label style={styles.small}>가까운 공원·도서관·광장을 둘러보고, 장소에 짧은 쪽지를 남길 수 있어요.</Label>
      <Button primary disabled={location.status === 'asking'} onPress={near}>{location.status === 'asking' ? '위치 찾는 중…' : location.status === 'ready' ? '📍 내 위치 다시 찾기' : '📍 내 위치로 보기'}</Button>
      {!!location.message && <Label style={styles.small}>{location.message}</Label>}
      {location.status === 'ready' && <Label style={styles.small}>내 위치는 거리 계산에만 쓰고 저장하지 않아요.</Label>}
    </Card>
    {!!error && <Label accessibilityRole="alert" style={styles.error}>{error}</Label>}
    {!!places?.length && <PlaceMap places={places} me={location.coords} selected={open} onSelect={id => setOpen(id)} />}
    {!places ? <Label style={styles.small}>장소를 불러오는 중…</Label> : places.map(place => <Card key={place.id} style={{ gap: 6 }}>
      <View style={styles.row}>
        <Label style={{ fontSize: 26, lineHeight: 34 }}>{ICON[place.icon] ?? '📍'}</Label>
        <View style={[styles.flex, { gap: 2 }]}><Label style={styles.cardTitle}>{place.name}</Label><Label style={styles.small}>{place.kind}{place.distance_m != null ? ` · ${formatDistance(place.distance_m)}` : ''}</Label></View>
        <Button onPress={() => setOpen(open === place.id ? null : place.id)}>{open === place.id ? '접기' : '자세히'}</Button>
      </View>
      {open === place.id && <>
        <Label style={styles.body}>{place.intro}</Label>
        <Label style={styles.small}>{place.location_note}</Label>
        {!!place.official_url && <Button variant="text" onPress={() => Linking.openURL(place.official_url)}>공식 안내 보기 ↗</Button>}
      </>}
    </Card>)}
    <Label style={[styles.small, { textAlign: 'center' }]}>장소 위치는 구역을 대표하는 참고 지점이에요. 입구가 아닐 수 있어요.</Label>
  </>;
}
