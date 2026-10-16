import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Image, StyleSheet, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { colors } from '../../../../shared/theme/tokens.js';
import { Button, Card, Label, Progress, styles } from '../../components/ui';
import { todayMissions, completeWithPhoto, completeSteps, rerollMission, sendFeedback, weeklyQuests, completeWeekly } from '../../api/server';

// 서버 미션 (웹 frontend/src/components/ServerMissions.jsx와 같은 흐름).
// 사진은 오늘 찍은 것만 성공: 서버가 촬영 일시(EXIF, 없으면 앱이 보낸 taken_at)를 미션 날짜와 비교한다.
const SLOT = { outdoor: ['움직이기', '#3E8F6E', '#E3F3EA'], home: ['집에서', '#4F7FB3', '#E5EEF8'], connect: ['이어지기', '#D0805F', '#FBEBE3'] };
const MOODS = [[1, '😣', '힘들었어'], [2, '😕', '조금 힘들었어'], [3, '🙂', '보통'], [4, '😊', '괜찮았어'], [5, '😄', '좋았어']];

function PhotoPick({ busy, onUpload, compact = false }) {
  const [asset, setAsset] = useState(null), [note, setNote] = useState('');
  const pick = async camera => {
    setNote('');
    try {
      if (camera) { const permission = await ImagePicker.requestCameraPermissionsAsync(); if (!permission.granted) { setNote('카메라 권한이 필요해요. 앨범에서 골라도 돼요.'); return; } }
      // exif:true → 촬영 일시를 같이 받아 서버에 보낸다 (고른 파일에서 EXIF가 빠지는 경우 대비)
      const result = await (camera ? ImagePicker.launchCameraAsync : ImagePicker.launchImageLibraryAsync)({ mediaTypes: ['images'], quality: .8, exif: true, allowsMultipleSelection: false });
      if (!result.canceled) setAsset(result.assets[0]);
    } catch { setNote('사진을 열지 못했어요. 다시 시도해 주세요.'); }
  };
  if (asset) return <View style={s.confirm}><Image source={{ uri: asset.uri }} accessibilityLabel="올릴 사진 미리보기" style={s.thumb} /><View style={{ flex: 1, gap: 4 }}><Button primary disabled={busy} onPress={() => onUpload(asset)}>{busy ? '날짜 확인 중…' : '이 사진으로 완료'}</Button><Button variant="text" disabled={busy} onPress={() => setAsset(null)}>다른 사진 고르기</Button></View></View>;
  return <View style={{ gap: 6 }}>
    <View style={styles.row}>
      <Button primary={!compact} disabled={busy} style={styles.flex} onPress={() => pick(true)}>{compact ? '📷' : '📷 사진 찍기'}</Button>
      <Button disabled={busy} style={styles.flex} onPress={() => pick(false)}>{compact ? '🖼️' : '🖼️ 앨범에서'}</Button>
    </View>
    {!!note && <Label style={styles.small}>{note}</Label>}
  </View>;
}

export default function ServerMissions({ userId, onChanged, onAttendance, onDiary, onVisit }) {
  const [data, setData] = useState(null), [error, setError] = useState(''), [busy, setBusy] = useState(null);
  const [notes, setNotes] = useState({}), [toast, setToast] = useState(null);
  const live = useRef(true);
  useEffect(() => { live.current = true; return () => { live.current = false; }; }, []);
  const load = useCallback(async () => { try { const next = await todayMissions(userId); if (live.current) { setData(next); setError(''); } } catch (e) { if (live.current) setError(e.message); } }, [userId]);
  // 서버에서 불러오기: 비동기 응답을 받은 뒤에 상태를 바꾼다 (앱의 다른 화면과 같은 방식)
  useEffect(() => { void load(); }, [load]);
  useEffect(() => { if (!toast) return undefined; const timer = setTimeout(() => setToast(null), 2200); return () => clearTimeout(timer); }, [toast]);
  const run = async (id, job) => {
    if (busy) return; setBusy(id); setNotes(value => ({ ...value, [id]: '' }));
    try { const result = await job(); if (result?.earned_total !== undefined) setToast(result); await load(); onChanged?.(); }
    catch (e) { if (live.current) setNotes(value => ({ ...value, [id]: e.message })); }
    finally { if (live.current) setBusy(null); }
  };
  if (error && !data) return <Card><Label accessibilityRole="alert">{error}</Label><Button onPress={load}>다시 불러오기</Button></Card>;
  if (!data) return <Card><Label>오늘의 미션을 불러오는 중…</Label></Card>;
  const missions = data.missions.filter(m => m.category !== 'daily'), daily = data.missions.filter(m => m.category === 'daily');
  const all = data.missions.filter(m => m.done).length;
  const go = m => m.kind === 'checkin' ? ['출석표', onAttendance] : m.kind === 'diary' ? ['일기 쓰기', onDiary] : ['이웃 가기', onVisit];
  return <>
    <Card><View style={styles.row}><Label style={[styles.cardTitle, styles.flex]}>오늘의 도전</Label><Label style={styles.small}>{all}/{data.missions.length} 완료</Label></View><Progress value={all} max={data.missions.length} /></Card>
    <Card style={{ backgroundColor: colors.background }}>
      <View style={styles.row}><Label style={[styles.cardTitle, styles.flex]}>데일리 미션</Label><Label style={styles.small}>{daily.filter(m => m.done).length}/{daily.length}</Label></View>
      {daily.map(m => <View key={m.id} style={s.dailyRow}>
        <View style={styles.row}>
          <View style={[styles.flex, { gap: 2 }]}><Label style={{ fontFamily: 'A2z-500', fontSize: 15, color: m.done ? colors.muted : colors.ink }}>{m.done ? '✓ ' : ''}{m.title}</Label><Label style={styles.small}>{m.done ? '완료' : m.kind === 'photo' ? `오늘 찍은 사진 · +${m.coins} 코인` : m.coins ? `+${m.coins} 코인` : '출석 선물'}</Label></View>
          {!m.done && m.kind !== 'photo' && (m.kind === 'steps' ? <Button disabled={!!busy} onPress={() => run(m.id, () => completeSteps(userId, m.id))}>걸음 확인</Button> : <Button onPress={() => go(m)[1]?.()}>{go(m)[0]}</Button>)}
        </View>
        {!m.done && m.kind === 'photo' && <PhotoPick compact busy={busy === m.id} onUpload={asset => run(m.id, () => completeWithPhoto(userId, m.id, asset))} />}
        {!!notes[m.id] && <Label style={s.note}>{notes[m.id]}</Label>}
      </View>)}
    </Card>
    <Card style={{ backgroundColor: colors.primarySoft }}>
      <View style={styles.row}><Label style={[styles.cardTitle, styles.flex]}>오늘의 활동</Label><Label style={[styles.small, { color: colors.primary }]}>{missions.filter(m => m.done).length}/{missions.length}</Label></View>
      {missions.map(m => { const [slot, tone, soft] = SLOT[m.category] ?? ['오늘의 활동', colors.primary, colors.primarySoft]; return <Card key={m.id} style={[s.mission, m.done && { backgroundColor: soft, borderColor: 'transparent' }]}>
        <View style={styles.row}>
          <Label style={[s.chip, { color: tone, backgroundColor: soft }]}>{slot}{m.stage ? ` · ${m.stage}단계` : ''}</Label>
          <View style={[styles.row, { gap: 6 }]}>
            {!m.done && m.rerollable && <Button variant="text" style={s.reroll} accessibilityLabel={`다른 미션으로 바꾸기, ${data.rerolls_left}번 남음`} disabled={!!busy || data.rerolls_left < 1} onPress={() => run(m.id, () => rerollMission(userId, m.id))}>↻</Button>}
            <Label style={[styles.small, styles.reward]}>+{m.coins} 코인</Label>
          </View>
        </View>
        <View style={[styles.row, { justifyContent: 'flex-start' }]}><View style={[s.check, { borderColor: tone }, m.done && { backgroundColor: tone }]}><Label style={{ color: '#fff', fontSize: 12, lineHeight: 16 }}>{m.done ? '✓' : ''}</Label></View><Label style={[styles.cardTitle, styles.flex, m.done && { color: colors.muted, textDecorationLine: 'line-through' }]}>{m.title}</Label></View>
        {m.done ? <View style={{ gap: 6 }}>
          {m.feedback ? <Label style={styles.small}>완료! 소감까지 남겼어요.</Label> : <><Label style={styles.small}>완료! 해 보니 어땠어요? (선택)</Label><View style={styles.row}>{MOODS.map(([v, face, label]) => <Button key={v} style={styles.flex} accessibilityLabel={label} disabled={!!busy} onPress={() => run(m.id, () => sendFeedback(userId, m.id, v))}>{face}</Button>)}</View></>}
        </View> : <>
          <Label style={[styles.body, { color: colors.muted }]}>{m.desc}</Label>
          {!!m.tip && <Label style={[styles.small, s.tip, { backgroundColor: soft, color: colors.ink }]}>💡 {m.tip}</Label>}
          {m.kind === 'photo' ? <PhotoPick busy={busy === m.id} onUpload={asset => run(m.id, () => completeWithPhoto(userId, m.id, asset))} />
            : m.kind === 'steps' ? <Button primary disabled={!!busy} onPress={() => run(m.id, () => completeSteps(userId, m.id))}>👟 오늘 걸음으로 확인 · {m.min_count.toLocaleString('ko-KR')}보</Button>
            : <Label style={styles.small}>앱에서 아직 지원하지 않는 미션이에요.</Label>}
          {!!notes[m.id] && <Label style={s.note}>{notes[m.id]}</Label>}
        </>}
      </Card>; })}
    </Card>
    {toast && <View pointerEvents="none" style={styles.toast} accessibilityLiveRegion="polite"><Label style={{ fontFamily: 'A2z-600' }}>미션 완료!</Label>{(toast.earned_total > 0 || toast.earned_xp > 0) && <Label>+{toast.earned_xp} XP · +{toast.earned_total} 코인</Label>}</View>}
  </>;
}

// 이번 주 미션 (서버): 사진을 서로 다른 날 올려 채운다
export function ServerWeekly({ userId, onChanged }) {
  const [data, setData] = useState(null), [busy, setBusy] = useState(null), [note, setNote] = useState({});
  const load = useCallback(async () => { try { setData(await weeklyQuests(userId)); } catch (e) { setNote({ all: e.message }); } }, [userId]);
  // 서버에서 불러오기: 비동기 응답을 받은 뒤에 상태를 바꾼다 (앱의 다른 화면과 같은 방식)
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { void load(); }, [load]);
  if (!data) return <Card><Label>{note.all || '이번 주 미션을 불러오는 중…'}</Label></Card>;
  return data.quests.map(q => <Card key={q.id} style={[s.mission, q.completed && { backgroundColor: '#E3F3EA' }]}>
    <View style={styles.row}><Label style={[s.chip, { color: '#3E8F6E', backgroundColor: '#E3F3EA' }]}>이번 주 · {q.goal_days}번</Label><Label style={[styles.small, styles.reward]}>+{q.coins} 코인</Label></View>
    <Label style={styles.cardTitle}>{q.title}</Label>
    <View style={[styles.row, { justifyContent: 'flex-start' }]}>{Array.from({ length: q.goal_days }, (_, i) => <View key={i} style={[s.dot, i < q.progress && { backgroundColor: '#3E8F6E' }]} />)}<Label style={styles.small}>{q.progress}/{q.goal_days}</Label></View>
    {q.completed ? <Label style={styles.small}>이번 주 완료! 보상을 받았어요.</Label> : q.done_today ? <Label style={styles.small}>오늘은 채웠어요. 다른 날 한 번 더!</Label> : <>
      <Label style={[styles.body, { color: colors.muted }]}>{q.desc}</Label>
      <PhotoPick busy={busy === q.id} onUpload={async asset => { setBusy(q.id); setNote({}); try { await completeWeekly(userId, q.id, asset); await load(); onChanged?.(); } catch (e) { setNote({ [q.id]: e.message }); } finally { setBusy(null); } }} />
      {!!note[q.id] && <Label style={s.note}>{note[q.id]}</Label>}
    </>}
  </Card>);
}

const s = StyleSheet.create({
  dailyRow: { gap: 6, paddingVertical: 8, borderTopWidth: 1, borderTopColor: colors.border },
  mission: { backgroundColor: colors.surface, borderColor: colors.border, padding: 12, gap: 8 },
  chip: { fontSize: 12, lineHeight: 18, paddingHorizontal: 8, paddingVertical: 1, borderRadius: 9, fontFamily: 'A2z-600', overflow: 'hidden' },
  reroll: { width: 32, height: 32, minHeight: 32, padding: 0, borderWidth: 1, borderColor: colors.border, borderRadius: 16 },
  check: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  tip: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10, overflow: 'hidden' },
  confirm: { flexDirection: 'row', gap: 10, alignItems: 'center' },
  thumb: { width: 72, height: 72, borderRadius: 12, borderWidth: 1, borderColor: colors.border },
  note: { fontSize: 12, lineHeight: 18, color: colors.error },
  dot: { width: 14, height: 14, borderRadius: 7, borderWidth: 2, borderColor: '#3E8F6E' },
});
