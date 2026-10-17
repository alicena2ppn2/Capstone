import React from 'react';
import Svg, { Path, Text } from 'react-native-svg';
import { colors } from '../../../shared/theme/tokens.js';
import UiIcon from './UiIcon';
import { Label } from './ui';
import { View } from 'react-native';

function XPIcon() {
  return <Svg width={18} height={18} viewBox="0 0 28 28" accessible={false}>
    <Path d="M14 2 L18 9 L26 11 L20 17 L21 25 L14 21 L7 25 L8 17 L2 11 L10 9Z" fill="#C6B2E9" stroke="#927AB8" strokeWidth={1.5} />
    <Text x="14" y="17" textAnchor="middle" fontSize={8} fontWeight="600" fill="#FFFFFF">XP</Text>
  </Svg>;
}

export default function QuestRewards({ xp = 0, coins = 0, style, emptyText = '추가 보상 없음 · 완료하면 기록만 남아요' }) {
  const amountXp = Number(xp) || 0;
  const amountCoins = Number(coins) || 0;
  if (!amountXp && !amountCoins) return <Label style={[styles.empty, style]}>{emptyText}</Label>;
  const label = [amountCoins > 0 && `${amountCoins} 코인`, amountXp > 0 && `${amountXp} XP`].filter(Boolean).join(', ');
  return <View accessible accessibilityLabel={`보상 ${label}`} style={[styles.wrap, style]}>
    {amountCoins > 0 && <View style={styles.token}><UiIcon kind="coin" size={18} color="#B38D36" /><Label style={styles.text}>+{amountCoins} 코인</Label></View>}
    {amountXp > 0 && <View style={styles.token}><XPIcon /><Label style={styles.text}>+{amountXp} XP</Label></View>}
  </View>;
}

const styles = {
  wrap: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 8, backgroundColor: colors.accentSoft, borderRadius: 8, paddingVertical: 4, paddingHorizontal: 7 },
  token: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  text: { fontSize: 12, lineHeight: 18, fontFamily: 'A2z-500' },
  empty: { fontSize: 12, lineHeight: 18, color: colors.muted },
};
