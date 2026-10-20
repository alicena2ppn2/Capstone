// 상점 가격: '300 코인' 글씨 대신 코인 모양 + 숫자 (웹 .price-tag와 같게, 10/20)
import React from 'react';
import { View } from 'react-native';
import { Label } from './ui';
import UiIcon from './UiIcon';

export default function Price({ value, textStyle, size = 15 }) {
  return <View accessible accessibilityLabel={`${value} 코인`} style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
    <UiIcon kind="coin" size={size} color="#B38D36" />
    <Label style={[{ fontVariant: ['tabular-nums'] }, textStyle]}>{value.toLocaleString('ko-KR')}</Label>
  </View>;
}
