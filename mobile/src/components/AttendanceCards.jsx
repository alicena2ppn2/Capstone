// 출석표 카드 (웹 frontend/src/components/Attendance.jsx와 같은 모양).
// 날짜마다 카드 하나: 받은 날 = 흐린 카드 + 도장, 오늘 = 강조, 지난 날 = '쉬어감', 앞으로 = 기본.
// days: [{ date: 'YYYY-MM-DD', today, claimed: 받은 보상 | null, reward: 받을 보상 }]
import React from 'react';
import { StyleSheet, View } from 'react-native';
import { colors } from '../../../shared/theme/tokens.js';
import { CLOTHES } from '../../../shared/data/clothes.js';
import { DECOR } from '../../../shared/data/decor.js';
import { Label, Progress, styles } from './ui';

const DAYS = ['월', '화', '수', '목', '금', '토', '일'];
export const rewardIcon = r => !r ? '·' : r.type === 'coins' ? '🪙' : r.type === 'xp' ? '⭐' : r.type === 'outfit' ? '👕' : DECOR.find(item => item.id === r.id)?.icon ?? '🎁';
export const rewardName = r => !r ? '' : r.type === 'coins' ? `${r.amount} 코인` : r.type === 'xp' ? `${r.amount} XP` : r.type === 'outfit' ? CLOTHES.find(item => item.id === r.id)?.name ?? '의상' : DECOR.find(item => item.id === r.id)?.name ?? '소품';
const shortName = r => r?.type === 'outfit' ? '의상' : r?.type === 'decor' ? '소품' : rewardName(r);

export default function AttendanceCards({ days }) {
  const count = days.filter(d => d.claimed).length, todayKey = days.find(d => d.today)?.date;
  const gift = days.find(d => d.today && !d.claimed)?.reward;
  return <View style={{ gap: 10 }}>
    <Progress value={count} max={7} />
    <View style={s.grid}>{days.map((d, i) => {
      const state = d.claimed ? 'done' : d.today ? 'today' : todayKey && d.date < todayKey ? 'missed' : 'later', reward = d.claimed ?? d.reward;
      return <View key={d.date} accessible accessibilityLabel={`${DAYS[i]}요일 ${d.date.slice(5)}, ${rewardName(reward)}, ${{ done: '출석 완료', today: '오늘', missed: '쉬어간 날', later: '예정' }[state]}`} style={[s.card, i === 6 && s.wide, state === 'today' && s.today, state === 'done' && s.done, state === 'missed' && s.missed]}>
        <View style={{ alignItems: 'center', opacity: state === 'done' || state === 'missed' ? .4 : 1 }}>
          <Label style={[s.day, state === 'today' && { color: colors.primary }]}>{state === 'today' ? '오늘' : DAYS[i]}</Label>
          <Label style={s.icon}>{rewardIcon(reward)}</Label>
          <Label numberOfLines={1} style={s.reward}>{shortName(reward)}</Label>
          <Label style={s.date}>{state === 'missed' ? ' ' : `${Number(d.date.slice(5, 7))}/${Number(d.date.slice(8, 10))}`}</Label>
        </View>
        {state === 'done' && <View pointerEvents="none" style={s.stampWrap}><View style={s.stamp}><Label style={s.stampMark}>✓</Label></View></View>}
        {state === 'missed' && <Label style={s.note}>쉬어감</Label>}
      </View>;
    })}</View>
    <Label style={[styles.body, { textAlign: 'center' }]}>이번 주 {count}일 함께했어요. 언제든 반가워요.</Label>
    {gift && <View style={s.gift}><Label style={styles.small}>오늘 받을 선물</Label><Label style={{ fontSize: 20 }}>{rewardIcon(gift)}</Label><Label style={{ fontFamily: 'A2z-600', fontSize: 16 }}>{rewardName(gift)}</Label></View>}
  </View>;
}

const s = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  card: { width: '23.4%', flexGrow: 0, alignItems: 'center', paddingVertical: 7, paddingHorizontal: 2, borderWidth: 1, borderColor: colors.border, borderRadius: 14, backgroundColor: colors.surface },
  wide: { width: '48.4%' },
  today: { borderWidth: 2, borderColor: colors.primary, backgroundColor: colors.primarySoft },
  done: { backgroundColor: colors.background },
  missed: { borderStyle: 'dashed' },
  day: { fontSize: 12, lineHeight: 16, fontFamily: 'A2z-600', color: colors.muted },
  icon: { fontSize: 24, lineHeight: 32 },
  reward: { fontSize: 11, lineHeight: 15, fontFamily: 'A2z-600' },
  date: { fontSize: 10, lineHeight: 14, color: colors.muted },
  stampWrap: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center' },
  stamp: { width: 40, height: 40, borderRadius: 20, borderWidth: 3, borderColor: colors.primary, alignItems: 'center', justifyContent: 'center', transform: [{ rotate: '-12deg' }] },
  stampMark: { fontSize: 20, lineHeight: 24, fontFamily: 'A2z-600', color: colors.primary },
  note: { position: 'absolute', bottom: 4, alignSelf: 'center', paddingHorizontal: 5, borderRadius: 6, overflow: 'hidden', backgroundColor: colors.disabled, fontSize: 9, lineHeight: 13, color: colors.muted },
  gift: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, padding: 10, borderRadius: 14, backgroundColor: colors.accentSoft },
});
