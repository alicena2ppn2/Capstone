// 이웃 방문 + 방명록 (서버 연결, 웹 frontend/src/screens/Neighbors.jsx와 같은 흐름).
// 방마다 TODAY / TOTAL 방문자 수, 친밀도(서로 한 방문·방명록·좋아요), 좋아요·지우기·신고.
import React, { useCallback, useEffect, useState } from 'react';
import { View } from 'react-native';
import { colors } from '../../../shared/theme/tokens.js';
import { CLOTHES } from '../../../shared/data/clothes.js';
import { seoulDateKey } from '../../../shared/utils/seoulDate.js';
import { Label, Button, Input, Card, Progress, styles, ScreenHeader } from '../components/ui';
import Character from '../components/Character';
import RoomBackdrop from '../art/RoomBackdrop';
import { recommendedRooms, roomOf, visitRoom, todayVisitors, guestbook, writeGuestbook, likeEntry, deleteEntry, reportEntry, friendshipWith } from '../api/server';

const REPORT_REASONS = [['spam', '스팸·광고'], ['abuse', '욕설·괴롭힘'], ['hate', '혐오 표현'], ['other', '기타']];
const MAX = 60;

function Room({ room, small }) {
  return <View style={{ width: small ? '70%' : '100%', alignSelf: 'center', aspectRatio: 368 / 500, borderRadius: 18, overflow: 'hidden' }}>
    <RoomBackdrop homeScene decor={room.decor ?? {}} positions={room.positions ?? {}} />
    <View style={styles.friendPosition}><Character variant={room.character || 'potato'} outfit={CLOTHES.find(item => item.id === room.outfit)} size={small ? 130 : 200} label={`${room.nickname}의 캐릭터`} /></View>
    {room.visits && <Label style={[styles.small, { position: 'absolute', top: 8, right: 8, backgroundColor: colors.surface, color: colors.ink, borderRadius: 10, paddingHorizontal: 8 }]}>TODAY {room.visits.today} · TOTAL {room.visits.total}</Label>}
  </View>;
}

// 친밀도 카드: 레벨 이름, 다음 레벨까지 점수, 서로 한 교류 횟수
function Bond({ bond, name }) {
  if (!bond) return null;
  const { mine, theirs } = bond.counts, next = bond.next_level_at;
  return <Card style={{ backgroundColor: colors.primarySoft, borderColor: colors.primarySoft }}>
    <View style={styles.row}><Label style={[styles.cardTitle, styles.flex]}>친밀도 Lv.{bond.level} · {bond.name}</Label><Label style={styles.badge}>{bond.is_friend ? '친구' : '이웃'}</Label></View>
    <Progress value={next ? bond.points : 1} max={next ?? 1} />
    <Label style={styles.small}>{next ? `다음 레벨까지 ${bond.points_to_next}점${bond.is_friend && bond.next_reward ? ` · 오르면 둘 다 ${bond.next_reward}코인` : ''}` : '최고 레벨이에요!'}</Label>
    <Label style={styles.small}>내가 놀러 감 {mine.visit} · 방명록 {mine.guestbook} · 좋아요 {mine.like}</Label>
    <Label style={styles.small}>{name} 님이 놀러 옴 {theirs.visit} · 방명록 {theirs.guestbook} · 좋아요 {theirs.like}</Label>
  </Card>;
}

function Entries({ owner, me, entries, onChanged, canDelete }) {
  const [busy, setBusy] = useState(null), [note, setNote] = useState(''), [reporting, setReporting] = useState(null);
  const act = async (id, job, done) => { if (busy) return; setBusy(id); setNote(''); setReporting(null); try { await job(); setNote(done ?? ''); await onChanged(); } catch (e) { setNote(e.message); } finally { setBusy(null); } };
  if (!entries.length) return <Label style={styles.small}>아직 방명록이 없어요. 첫 글을 남겨 보세요.</Label>;
  return <>
    {entries.map(entry => <Card key={entry.id} style={{ padding: 12, gap: 4 }}>
      <View style={styles.row}><Label style={[styles.cardTitle, styles.flex, { fontSize: 15 }]}>{entry.author || '이웃'}</Label><Label style={styles.small}>{entry.date}</Label></View>
      <Label style={styles.body}>{entry.text}</Label>
      <View style={[styles.row, { justifyContent: 'flex-start' }]}>
        <Button selected={entry.liked} disabled={!!busy} accessibilityLabel={`${entry.author}의 글 좋아요 ${entry.likes}개`} onPress={() => act(entry.id, () => likeEntry(owner, entry.id, me, entry.liked))}>{entry.liked ? '♥' : '♡'} {entry.likes}</Button>
        {canDelete(entry) ? <Button variant="text" disabled={!!busy} onPress={() => act(entry.id, () => deleteEntry(owner, entry.id, me), '글을 지웠어요.')}>지우기</Button>
          : <Button variant="text" disabled={!!busy} onPress={() => setReporting(reporting === entry.id ? null : entry.id)}>신고</Button>}
      </View>
      {reporting === entry.id && <View style={styles.wrap}>{REPORT_REASONS.map(([reason, label]) => <Button key={reason} onPress={() => act(entry.id, () => reportEntry(me, entry.id, reason), '신고했어요. 이 글은 내 화면에서 숨겨져요.')}>{label}</Button>)}</View>}
    </Card>)}
    {!!note && <Label accessibilityLiveRegion="polite" style={styles.small}>{note}</Label>}
  </>;
}

export default function Neighbors({ userId, myName, initialTab = 'rooms', onBack, onChanged }) {
  const [tab, setTab] = useState(initialTab);
  const [rooms, setRooms] = useState(null), [error, setError] = useState('');
  const [selected, setSelected] = useState(null);   // { room, entries, bond }
  const [mine, setMine] = useState(null);           // { room, entries, visitors }
  const [draft, setDraft] = useState(''), [sending, setSending] = useState(false), [status, setStatus] = useState('');
  const loadRooms = useCallback(async () => {
    try {
      const { rooms: list } = await recommendedRooms(userId);
      setRooms(await Promise.all(list.map(async item => ({ ...item, room: await roomOf(item.id).catch(() => null) })))); setError('');
    } catch (e) { setError(e.message); }
  }, [userId]);
  const loadMine = useCallback(async () => {
    try { const [room, book, visits] = await Promise.all([roomOf(userId), guestbook(userId, userId), todayVisitors(userId)]); setMine({ room, entries: book.entries, visitors: visits.visitors }); setError(''); }
    catch (e) { setError(e.message); }
  }, [userId]);
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { if (tab === 'rooms') void loadRooms(); else void loadMine(); }, [tab, loadRooms, loadMine]);
  const reloadSelected = useCallback(async owner => { const [room, book, bond] = await Promise.all([roomOf(owner), guestbook(owner, userId), friendshipWith(userId, owner).catch(() => null)]); setSelected({ room, entries: book.entries, bond }); }, [userId]);
  const open = async item => {
    setStatus(''); setDraft('');
    try { await visitRoom(item.id, userId); await reloadSelected(item.id); onChanged?.(); } catch (e) { setError(e.message); }
  };
  const submit = async () => {
    const text = draft.trim(); if (!text || sending) return;
    setSending(true); setStatus('');
    try { await writeGuestbook(selected.room.user_id, userId, text); setDraft(''); setStatus('방명록을 남겼어요.'); onChanged?.(seoulDateKey()); await reloadSelected(selected.room.user_id); }
    catch (e) { setStatus(e.message); }
    finally { setSending(false); }
  };
  const back = () => { if (selected) { setSelected(null); void loadRooms(); } else onBack(); };
  return <>
    <ScreenHeader title={selected ? `${selected.room.nickname}의 방` : '이웃'} onBack={back} backLabel={selected ? '이웃 목록으로 돌아가기' : '홈 화면으로 돌아가기'} />
    {selected ? <>
      <Label style={styles.body}>LV.{selected.room.level}{selected.room.bio ? ` · “${selected.room.bio}”` : ' · 놀러 왔어요! 방명록에 한마디 남겨 보세요.'}</Label>
      <Room room={selected.room} />
      <Bond bond={selected.bond} name={selected.room.nickname} />
      <Label style={styles.cardTitle}>방명록</Label>
      <Input maxLength={MAX} multiline accessibilityLabel={`${myName}의 한마디`} value={draft} editable={!sending} onChangeText={setDraft} placeholder="다정한 한마디를 남겨 보세요." />
      <View style={styles.row}><Label style={styles.small}>{draft.length}/{MAX}</Label><Button primary disabled={sending || !draft.trim()} onPress={submit}>{sending ? '남기는 중…' : '남기기'}</Button></View>
      {!!status && <Label accessibilityLiveRegion="polite" style={styles.small}>{status}</Label>}
      <Entries owner={selected.room.user_id} me={userId} entries={selected.entries} onChanged={() => reloadSelected(selected.room.user_id)} canDelete={entry => entry.author_id === userId} />
    </> : <>
      <View style={styles.row}>{[['rooms', '이웃 방'], ['mine', '내 방명록']].map(([id, label]) => <Button key={id} style={styles.flex} selected={tab === id} onPress={() => setTab(id)}>{label}</Button>)}</View>
      {!!error && <Label accessibilityRole="alert" style={styles.error}>{error}</Label>}
      {tab === 'rooms' ? <>
        <Label style={styles.small}>나와 비슷한 레벨의 이웃부터 보여 줘요. 놀러 가면 오늘의 ‘친구 방 놀러 가기’가 완료돼요.</Label>
        {!rooms ? <Label style={styles.small}>이웃을 찾는 중…</Label> : !rooms.length ? <Label style={styles.small}>아직 놀러 갈 이웃이 없어요.</Label>
          : rooms.map(item => <Card key={item.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <Character variant={item.room?.character || 'potato'} size={70} label={item.nickname} />
            <View style={[styles.flex, { gap: 2 }]}><Label style={styles.cardTitle}>{item.nickname}</Label><Label style={styles.small}>LV.{item.level}{item.similar ? ' · 나와 비슷한 레벨' : ''}{item.is_friend ? ' · 친구' : ''}</Label>{item.room?.visits && <Label style={styles.small}>TODAY {item.room.visits.today} · TOTAL {item.room.visits.total}</Label>}</View>
            <Button primary onPress={() => open(item)}>놀러 가기</Button>
          </Card>)}
      </> : !mine ? <Label style={styles.small}>내 방명록을 불러오는 중…</Label> : <>
        <Room room={mine.room} small />
        <Label style={styles.body}>{mine.visitors.length ? `오늘 놀러 온 이웃: ${mine.visitors.map(v => v.nickname || '이웃').join(', ')}` : '오늘은 아직 놀러 온 이웃이 없어요.'}</Label>
        <Label style={styles.cardTitle}>내 방명록</Label>
        <Entries owner={userId} me={userId} entries={mine.entries} onChanged={loadMine} canDelete={() => true} />
      </>}
    </>}
  </>;
}
