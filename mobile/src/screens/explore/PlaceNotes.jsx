// 장소 쪽지 (동네 탐험 4단계, 10/19). 영주 님 웹 시안의 포스트잇을 앱으로.
// 쓰기만 잠금: 읽기는 어디서나, 남기기는 장소 근처(write_radius_m)에서만. 서버도 같은 판정을 한다(app/places.py write_check).
// 쓸 때 정확한 위치를 한 번 더 읽어 보내고, 위치는 판정에만 쓰고 저장하지 않는다.
import React, { useCallback, useEffect, useState } from 'react';
import { View } from 'react-native';
import { colors } from '../../../../shared/theme/tokens.js';
import { Label, Button, Card, Input, styles } from '../../components/ui';
import { placeNotes, writePlaceNote, deletePlaceNote, reportPlaceNote } from '../../api/server';
import { distanceM, formatDistance } from '../../location/useMyLocation';
import { ReportSheet } from '../Neighbors';

const LIMIT = 140;
const PAPER = { yellow: ['#FFF4B8', '노랑'], apricot: ['#FFE1CC', '살구'], mint: ['#D8F3E6', '민트'] };
const STICKERS = ['♡', '✿', '☀'];
const ACCURACY = 50;   // 서버 write_accuracy_m과 같게

function Note({ note, onDelete, onReport, busy }) {
  return <View style={{ backgroundColor: PAPER[note.color]?.[0] ?? PAPER.yellow[0], borderRadius: 12, padding: 10, gap: 4, transform: [{ rotate: note.id % 2 ? '-0.6deg' : '0.6deg' }] }}>
    <View style={styles.row}><Label style={[styles.body, styles.flex]}>{note.text}</Label><Label style={{ fontSize: 18 }}>{note.sticker}</Label></View>
    <View style={styles.row}>
      <Label style={[styles.small, styles.flex]}>{note.author} · {note.date}</Label>
      {note.mine ? <Button variant="text" disabled={busy} onPress={onDelete}>지우기</Button> : <Button variant="text" disabled={busy} onPress={onReport}>신고</Button>}
    </View>
  </View>;
}

export default function PlaceNotes({ place, me, location }) {
  const [data, setData] = useState(null), [error, setError] = useState(''), [busy, setBusy] = useState(false), [message, setMessage] = useState('');
  const [draft, setDraft] = useState(''), [color, setColor] = useState('yellow'), [sticker, setSticker] = useState('♡'), [reporting, setReporting] = useState(null);
  const load = useCallback(async () => {
    try { setData(await placeNotes(place.id, me)); setError(''); } catch (e) { setError(e.message); }
  }, [place.id, me]);
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { void load(); }, [load]);

  const radius = place.write_radius_m;
  const far = location.coords ? Math.round(distanceM(location.coords, place)) : null;
  const near = far != null && far <= radius;

  const act = async (job, done) => {
    setBusy(true); setMessage('');
    try { await job(); setMessage(done); await load(); } catch (e) { setMessage(e.message); } finally { setBusy(false); }
  };
  const write = () => act(async () => {
    const coords = await location.locate({ precise: true });   // 남기는 순간의 위치로 다시 확인
    if (!coords) throw new Error('위치를 확인하지 못했어요. 다시 눌러 주세요.');
    if (coords.accuracy != null && coords.accuracy > ACCURACY) throw new Error(`위치가 정확하지 않아요(오차 약 ${Math.round(coords.accuracy)}m). 하늘이 트인 곳에서 다시 눌러 주세요.`);
    await writePlaceNote(place.id, me, { text: draft.trim(), color, sticker, latitude: coords.latitude, longitude: coords.longitude, accuracy_m: coords.accuracy ?? undefined });
    setDraft('');
  }, '쪽지를 남겼어요.');

  return <View style={{ gap: 8, marginTop: 4 }}>
    <View style={styles.row}><Label style={[styles.cardTitle, styles.flex]}>📝 장소 쪽지</Label>{!!data && <Label style={styles.small}>{data.notes.length}개</Label>}</View>
    {!!error && <Label accessibilityRole="alert" style={styles.error}>{error}</Label>}
    {!data && !error && <Label style={styles.small}>쪽지를 불러오는 중…</Label>}
    {!!data && (data.notes.length ? data.notes.map(n => <Note key={n.id} note={n} busy={busy}
        onDelete={() => act(() => deletePlaceNote(place.id, n.id, me), '쪽지를 지웠어요.')}
        onReport={() => setReporting(n)} />)
      : <Label style={styles.small}>아직 이웃이 남긴 쪽지가 없어요. 첫 쪽지를 남겨 보세요.</Label>)}
    {!!data?.samples?.length && <View style={{ gap: 4 }}>
      <Label style={[styles.small, { color: colors.muted }]}>예시 쪽지 · 실제 이웃 글이 아니에요</Label>
      {data.samples.map(sample => <View key={sample.text} style={{ borderRadius: 12, padding: 10, borderWidth: 1, borderStyle: 'dashed', borderColor: colors.border }}><Label style={[styles.small, { color: colors.muted }]}>{sample.text}</Label></View>)}
    </View>}

    {!me ? <Card style={{ backgroundColor: colors.background }}><Label style={styles.small}>로그인하면 이 장소에 쪽지를 남길 수 있어요.</Label></Card>
      : !near ? <Card style={{ backgroundColor: colors.background, gap: 6 }}>
        <Label style={styles.body}>🔒 쪽지는 {place.name} {radius}m 안에서 남길 수 있어요.</Label>
        <Label style={styles.small}>{far == null ? '읽기는 어디서나 돼요. 근처에 왔다면 내 위치를 확인해 주세요.' : `지금은 약 ${far < 1000 ? `${far}m` : formatDistance(far)} 떨어져 있어요. 가까이 가면 열려요.`}</Label>
        <Button disabled={location.status === 'asking'} onPress={() => location.locate()}>{location.status === 'asking' ? '위치 찾는 중…' : '📍 내 위치 확인'}</Button>
      </Card>
      : <Card style={{ backgroundColor: PAPER[color][0], gap: 8 }}>
        <Label style={styles.small}>📍 {place.name} 근처예요 ({formatDistance(far)}). 쪽지를 남길 수 있어요.</Label>
        <Input multiline maxLength={LIMIT} accessibilityLabel={`${place.name}에 남길 쪽지`} value={draft} editable={!busy} onChangeText={setDraft} placeholder="이곳에서 본 것, 느낀 것을 짧게 남겨 보세요." />
        <View style={styles.row}>
          <View style={[styles.wrap, styles.flex]}>{Object.entries(PAPER).map(([id, [, name]]) => <Button key={id} selected={color === id} onPress={() => setColor(id)} accessibilityLabel={`${name} 종이`}>{name}</Button>)}</View>
          <Label style={styles.small}>{draft.length}/{LIMIT}</Label>
        </View>
        <View style={styles.wrap}>{STICKERS.map(s => <Button key={s} selected={sticker === s} onPress={() => setSticker(s)} accessibilityLabel={`스티커 ${s}`}>{s}</Button>)}</View>
        <Button primary disabled={busy || !draft.trim()} onPress={write}>{busy ? '남기는 중…' : '쪽지 남기기'}</Button>
      </Card>}
    {!!message && <Label accessibilityRole="status" style={styles.small}>{message}</Label>}
    {reporting && <ReportSheet entry={reporting} onCancel={() => setReporting(null)} onReport={reason => { const target = reporting; setReporting(null); void act(() => reportPlaceNote(me, target.id, reason), '신고했어요. 이 쪽지는 내 화면에서 숨겨져요.'); }} />}
  </View>;
}
