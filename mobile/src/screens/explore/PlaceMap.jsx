// 동네 탐험 지도 — 웹 미리보기용 대신 그림 (react-native-maps는 웹을 지원하지 않음).
// 장소와 내 위치의 상대 위치만 점으로 보여 준다(보기 전용, 누르기는 아래 목록에서). 실제 지도는 휴대폰(PlaceMap.native.jsx)에서.
import React from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Circle, Rect, Text as SvgText } from 'react-native-svg';
import { colors } from '../../../../shared/theme/tokens.js';
import { Label, styles } from '../../components/ui';

const W = 340, H = 220, PAD = 36;

export default function PlaceMap({ places, me, selected }) {
  const points = [...places, ...(me ? [me] : [])];
  const lats = points.map(p => p.latitude), lngs = points.map(p => p.longitude);
  const [minLat, maxLat, minLng, maxLng] = [Math.min(...lats), Math.max(...lats), Math.min(...lngs), Math.max(...lngs)];
  const sx = lng => PAD + (maxLng === minLng ? .5 : (lng - minLng) / (maxLng - minLng)) * (W - PAD * 2);
  const sy = lat => PAD + (maxLat === minLat ? .5 : (maxLat - lat) / (maxLat - minLat)) * (H - PAD * 2);
  return <View style={s.box}>
    <Svg width="100%" height={H} viewBox={`0 0 ${W} ${H}`} accessibilityLabel="동네 탐험 지도 미리보기">
      <Rect width={W} height={H} fill="#EAF3EC" />
      {places.map((p, i) => {
        const x = sx(p.longitude), y = sy(p.latitude);
        // 앞 장소와 가까우면(30px 안) 이름을 점 아래에 써서 겹치지 않게
        const crowded = places.slice(0, i).some(q => Math.hypot(sx(q.longitude) - x, sy(q.latitude) - y) < 30);
        return <React.Fragment key={p.id}>
          <Circle cx={x} cy={y} r={selected === p.id ? 11 : 8} fill={selected === p.id ? colors.primary : '#E0695E'} stroke="#fff" strokeWidth="2" />
          <SvgText x={x} y={crowded ? y + 26 : y - 14} fontSize="12" fontWeight="700" fill={colors.ink} textAnchor="middle">{p.name}</SvgText>
        </React.Fragment>;
      })}
      {me && <><Circle cx={sx(me.longitude)} cy={sy(me.latitude)} r="12" fill="#4F7FB3" opacity=".2" /><Circle cx={sx(me.longitude)} cy={sy(me.latitude)} r="6" fill="#4F7FB3" stroke="#fff" strokeWidth="2" /></>}
    </Svg>
    <Label style={[styles.small, s.note]}>웹 미리보기 그림이에요. 휴대폰에서는 실제 지도가 나와요.</Label>
  </View>;
}

const s = StyleSheet.create({
  box: { width: '100%', borderRadius: 18, overflow: 'hidden', borderWidth: 1, borderColor: colors.border, backgroundColor: '#EAF3EC' },
  note: { textAlign: 'center', paddingBottom: 6 },
});
