// 출석표 카드 (웹 frontend/src/components/Attendance.jsx와 같은 모양). 모바일 게임 출석부처럼:
// 선물 배너 → 진행 막대 → 'n일차' 카드(일요일은 큰 카드) → 오늘 받을 선물.
// 받은 날 = 흐린 카드 + 빨간 '출석' 도장, 오늘 = 금색 테두리 + '오늘' 꼬리표, 지난 날 = 점선 + '쉬어감'.
// days: [{ date: 'YYYY-MM-DD', today, claimed: 받은 보상 | null, reward: 받을 보상 }]
// streak: 서버 연속 출석표일 때만 (10/16, 1~7일차 사다리 · 하루라도 빠지면 1일차부터). { streak, reset, claimedToday }
import React from 'react';
import { StyleSheet, View } from 'react-native';
import { colors } from '../../../shared/theme/tokens.js';
import { CLOTHES } from '../../../shared/data/clothes.js';
import { DECOR } from '../../../shared/data/decor.js';
import { Label, styles } from './ui';

// 날짜의 요일 (연속 출석표는 1일차가 월요일이 아닐 수 있어서 날짜로 계산)
const weekday = key => '일월화수목금토'[new Date(Date.UTC(+key.slice(0, 4), +key.slice(5, 7) - 1, +key.slice(8, 10))).getUTCDay()];
const GOLD = '#F2B544', GOLD_SOFT = '#FFF4D6', STAMP = '#E0695E';
export const rewardIcon = r => !r ? '·' : r.type === 'coins' ? '🪙' : r.type === 'xp' ? '⭐' : r.type === 'outfit' ? '👕' : DECOR.find(item => item.id === r.id)?.icon ?? '🎁';
export const rewardName = r => !r ? '' : r.type === 'coins' ? `${r.amount} 코인` : r.type === 'xp' ? `${r.amount} XP` : r.type === 'outfit' ? CLOTHES.find(item => item.id === r.id)?.name ?? '의상' : DECOR.find(item => item.id === r.id)?.name ?? '소품';
const shortName = r => r?.type === 'outfit' ? '의상' : r?.type === 'decor' ? '소품' : rewardName(r);
const md = key => `${Number(key.slice(5, 7))}월 ${Number(key.slice(8, 10))}일`;

export default function AttendanceCards({ days, streak }) {
  const count = days.filter(d => d.claimed).length, todayKey = days.find(d => d.today)?.date;
  const gift = days.find(d => d.today && !d.claimed)?.reward;
  return <View style={{ gap: 12 }}>
    <View style={s.head}><View style={s.headGift}><Label style={{ fontSize: 26, lineHeight: 34 }}>🎁</Label></View><View style={{ flex: 1 }}><Label style={s.headTitle}>매일 들르면 선물이 쌓여요</Label><Label style={styles.small}>{md(days[0].date)} — {md(days[6].date)}</Label></View></View>
    <View style={[styles.row, { gap: 8 }]}><View style={s.track}><View style={[s.fill, { width: `${count / 7 * 100}%` }]} /></View><Label style={s.count}>{count}/7</Label></View>
    <View style={s.grid}>{days.map((d, i) => {
      const state = d.claimed ? 'done' : d.today ? 'today' : todayKey && d.date < todayKey ? 'missed' : 'later', reward = d.claimed ?? d.reward, wide = i === 6;
      const faded = state === 'done' || state === 'missed';
      return <View key={d.date} accessible accessibilityLabel={`${i + 1}일차 ${weekday(d.date)}요일, ${rewardName(reward)}, ${{ done: '출석 완료', today: '오늘', missed: '쉬어간 날', later: '예정' }[state]}`} style={[s.card, wide && s.wide, state === 'today' && s.today, state === 'done' && s.done, state === 'missed' && s.missed]}>
        <View style={[s.dayStrip, state === 'today' && { backgroundColor: GOLD }, { opacity: faded ? .4 : 1 }]}><Label style={[s.day, state === 'today' && { color: '#fff' }]}>{i + 1}일차 <Label style={[s.dayName, state === 'today' && { color: '#fff' }]}>{weekday(d.date)}</Label></Label></View>
        <View style={[wide ? s.wideBody : s.body, { opacity: faded ? .4 : 1 }]}>
          <Label style={[s.icon, wide && { fontSize: 32, lineHeight: 40 }]}>{rewardIcon(reward)}</Label>
          <Label numberOfLines={1} style={[s.reward, state === 'today' && { backgroundColor: colors.surface }]}>{shortName(reward)}</Label>
        </View>
        {state === 'today' ? <View style={s.tag}><Label style={s.tagText}>오늘</Label></View> : streak && i === 6 && state === 'later' && <View style={[s.tag, { backgroundColor: GOLD }]}><Label style={s.tagText}>특별 선물</Label></View>}
        {state === 'done' && <View pointerEvents="none" style={s.stampWrap}><View style={s.stamp}><Label style={s.stampText}>출석</Label></View></View>}
        {state === 'missed' && <Label style={s.note}>쉬어감</Label>}
      </View>;
    })}</View>
    <Label style={[styles.body, { textAlign: 'center' }]}>{streak
      ? streak.reset && !streak.claimedToday ? '연속 출석이 끊겨 1일차부터 다시 시작해요. 괜찮아요!'
        : `연속 ${Math.max(streak.streak, streak.claimedToday ? 1 : 0)}일째 출석 중이에요. 하루라도 빠지면 1일차부터 다시 시작해요.`
      : `이번 주 ${count}일 함께했어요. 언제든 반가워요.`}</Label>
    {gift && <View style={s.gift}><Label style={styles.small}>오늘 받을 선물</Label><Label style={{ fontSize: 22, lineHeight: 28 }}>{rewardIcon(gift)}</Label><Label style={{ fontFamily: 'A2z-600', fontSize: 16 }}>{rewardName(gift)}</Label></View>}
  </View>;
}

const s = StyleSheet.create({
  head: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, borderRadius: 18, backgroundColor: GOLD_SOFT },
  headGift: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surface },
  headTitle: { fontFamily: 'A2z-600', fontSize: 16, lineHeight: 22 },
  track: { flex: 1, height: 8, borderRadius: 4, backgroundColor: colors.border, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: 4, backgroundColor: GOLD },
  count: { fontFamily: 'A2z-600', fontSize: 12, color: colors.primary },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 7, rowGap: 12, paddingTop: 6 },
  card: { width: '23.2%', alignItems: 'center', paddingBottom: 7, borderWidth: 2, borderColor: colors.border, borderRadius: 16, backgroundColor: colors.surface, overflow: 'visible' },
  wide: { width: '48.4%' },
  today: { borderColor: GOLD, backgroundColor: GOLD_SOFT, shadowColor: GOLD, shadowOpacity: .5, shadowRadius: 6, shadowOffset: { width: 0, height: 0 }, elevation: 4 },
  done: { backgroundColor: colors.background },
  missed: { borderStyle: 'dashed' },
  dayStrip: { alignSelf: 'stretch', alignItems: 'center', paddingVertical: 3, borderTopLeftRadius: 13, borderTopRightRadius: 13, backgroundColor: colors.background },
  day: { fontFamily: 'A2z-600', fontSize: 11, lineHeight: 15 },
  dayName: { fontSize: 11, lineHeight: 15, color: colors.muted },
  body: { alignItems: 'center', gap: 2, paddingTop: 4 },
  wideBody: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingTop: 6, minHeight: 52 },
  icon: { fontSize: 26, lineHeight: 34 },
  reward: { maxWidth: '96%', paddingHorizontal: 7, borderRadius: 999, overflow: 'hidden', backgroundColor: GOLD_SOFT, fontFamily: 'A2z-600', fontSize: 11, lineHeight: 16 },
  tag: { position: 'absolute', top: -11, alignSelf: 'center', paddingHorizontal: 8, borderRadius: 999, backgroundColor: STAMP },
  tagText: { color: '#fff', fontFamily: 'A2z-600', fontSize: 10, lineHeight: 16 },
  stampWrap: { ...StyleSheet.absoluteFillObject, top: 18, alignItems: 'center', justifyContent: 'center' },
  stamp: { width: 44, height: 44, borderRadius: 22, borderWidth: 3, borderColor: STAMP, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,.7)', transform: [{ rotate: '-14deg' }] },
  stampText: { color: STAMP, fontFamily: 'A2z-600', fontSize: 13, lineHeight: 18 },
  note: { position: 'absolute', bottom: 7, alignSelf: 'center', paddingHorizontal: 6, borderRadius: 6, overflow: 'hidden', backgroundColor: colors.disabled, fontSize: 10, lineHeight: 14, color: colors.muted },
  gift: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, padding: 10, borderRadius: 16, borderWidth: 2, borderStyle: 'dashed', borderColor: GOLD, backgroundColor: GOLD_SOFT },
});
