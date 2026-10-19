// 이웃 방문 + 방명록 (서버 연결, 웹 frontend/src/screens/Neighbors.jsx와 같은 흐름).
// 방마다 TODAY / TOTAL 방문자 수, 친밀도(서로 한 방문·방명록·좋아요), 좋아요·지우기·신고.
import React, { useCallback, useEffect, useState } from 'react';
import { View } from 'react-native';
import { colors } from '../../../shared/theme/tokens.js';
import { CLOTHES } from '../../../shared/data/clothes.js';
import { seoulDateKey } from '../../../shared/utils/seoulDate.js';
import { Label, Button, Input, Card, Progress, Sheet, styles, ScreenHeader } from '../components/ui';
import Character from '../components/Character';
import RoomBackdrop from '../art/RoomBackdrop';
import * as Clipboard from 'expo-clipboard';
import { recommendedRooms, roomOf, visitRoom, todayVisitors, guestbook, writeGuestbook, likeEntry, deleteEntry, reportEntry, friendshipWith, profileOf, friendsOf, searchFriend, requestFriend, acceptFriend, removeFriend } from '../api/server';

// 서버 moderation.REPORT_REASONS와 같은 이유
const REPORT_REASONS = [['spam', '스팸·광고'], ['abuse', '욕설·괴롭힘'], ['hate', '혐오 표현'], ['sexual', '성적인 내용'], ['self_harm', '자해·위험한 내용'], ['other', '기타']];

// 신고 버튼을 누르면 뜨는 창: 이유를 고르고 '신고하기' (장소 쪽지도 같이 씀)
export function ReportSheet({ entry, onCancel, onReport }) {
  const [reason, setReason] = useState('');
  return <Sheet title="신고할까요?" close={onCancel}>
    <Card style={{ backgroundColor: colors.background, padding: 10 }}><Label style={styles.body}>“{entry.text}”</Label></Card>
    <Label style={{ fontFamily: 'A2z-600' }}>어떤 문제인가요?</Label>
    <View style={styles.wrap}>{REPORT_REASONS.map(([value, label]) => <Button key={value} selected={reason === value} onPress={() => setReason(value)}>{label}</Button>)}</View>
    <Label style={styles.small}>신고하면 이 글은 내 화면에서 바로 숨겨지고, 여러 명이 신고하면 모두에게 숨겨져요.</Label>
    <View style={styles.row}><Button style={styles.flex} onPress={onCancel}>취소</Button><Button primary style={styles.flex} disabled={!reason} onPress={() => onReport(reason)}>신고하기</Button></View>
  </Sheet>;
}
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
  const act = async (id, job, done) => { if (busy) return; setBusy(id); setNote(''); try { await job(); setNote(done ?? ''); await onChanged(); } catch (e) { setNote(e.message); } finally { setBusy(null); } };
  if (!entries.length) return <Label style={styles.small}>아직 방명록이 없어요. 첫 글을 남겨 보세요.</Label>;
  return <>
    {entries.map(entry => <Card key={entry.id} style={{ padding: 12, gap: 4 }}>
      <View style={styles.row}><Label style={[styles.cardTitle, styles.flex, { fontSize: 15 }]}>{entry.author || '이웃'}</Label><Label style={styles.small}>{entry.date}</Label></View>
      <Label style={styles.body}>{entry.text}</Label>
      <View style={[styles.row, { justifyContent: 'flex-start' }]}>
        <Button selected={entry.liked} disabled={!!busy} accessibilityLabel={`${entry.author}의 글 좋아요 ${entry.likes}개`} onPress={() => act(entry.id, () => likeEntry(owner, entry.id, me, entry.liked))}>{entry.liked ? '♥' : '♡'} {entry.likes}</Button>
        {canDelete(entry) ? <Button variant="text" disabled={!!busy} onPress={() => act(entry.id, () => deleteEntry(owner, entry.id, me), '글을 지웠어요.')}>지우기</Button>
          : <Button variant="text" disabled={!!busy} onPress={() => setReporting(entry)}>신고</Button>}
      </View>
    </Card>)}
    {!!note && <Label accessibilityLiveRegion="polite" style={styles.small}>{note}</Label>}
    {reporting && <ReportSheet entry={reporting} onCancel={() => setReporting(null)} onReport={reason => { const target = reporting; setReporting(null); act(target.id, () => reportEntry(me, target.id, reason), '신고했어요. 이 글은 내 화면에서 숨겨져요.'); }} />}
  </>;
}


const STATUS_BUTTON = { none: '친구 신청', sent: '신청 보냄 ✓', received: '신청 수락', friend: '이미 친구예요', me: '나예요' };

// 친구 탭: 내 친구 코드 · 코드로 찾기 · 받은 신청 · 친구 목록 · 보낸 신청 (포켓몬 GO 트레이너 코드·브롤스타즈 플레이어 태그처럼)
function Friends({ userId, onOpen }) {
  const [code, setCode] = useState(null), [lists, setLists] = useState(null), [query, setQuery] = useState('');
  const [found, setFound] = useState(null), [note, setNote] = useState(''), [busy, setBusy] = useState(false);
  const load = useCallback(async () => {
    try { const [me, view] = await Promise.all([profileOf(userId), friendsOf(userId)]); setCode(me.friend_code); setLists(view); }
    catch (e) { setNote(e.message); }
  }, [userId]);
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { void load(); }, [load]);
  const run = async (job, done) => { if (busy) return null; setBusy(true); setNote(''); try { const r = await job(); setNote(done ?? r?.message ?? ''); await load(); return r; } catch (e) { setNote(e.message); return null; } finally { setBusy(false); } };
  const search = async () => { if (!query.trim()) return; setFound(null); const r = await run(() => searchFriend(userId, query.trim()), ''); if (r) setFound(r); };
  const act = async target => {
    if (target.status === 'none') { await run(() => requestFriend(userId, target.friend_code)); setFound({ ...target, status: 'sent' }); }
    else if (target.status === 'received') { await run(() => acceptFriend(userId, target.id), `${target.nickname}님과 친구가 됐어요!`); setFound({ ...target, status: 'friend' }); }
  };
  const copy = async () => { try { await Clipboard.setStringAsync(code); setNote('친구 코드를 복사했어요.'); } catch { setNote(`친구 코드: ${code}`); } };
  const row = (f, actions, sub) => <Card key={f.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 8, padding: 10 }}><View style={[styles.flex, { gap: 2 }]}><Label style={{ fontFamily: 'A2z-600' }}>{f.nickname}</Label><Label style={styles.small}>{sub}</Label></View>{actions}</Card>;
  return <>
    <Card style={{ backgroundColor: colors.primarySoft, borderColor: colors.primarySoft, gap: 4 }}>
      <Label style={styles.small}>내 친구 코드</Label>
      <View style={styles.row}><Label style={{ fontFamily: 'A2z-600', fontSize: 26, lineHeight: 34, letterSpacing: 3 }}>#{code ?? '……'}</Label><Button disabled={!code} onPress={copy}>복사</Button></View>
      <Label style={styles.small}>친구에게 알려 주면 코드로 나를 찾을 수 있어요.</Label>
    </Card>
    <Label style={{ fontFamily: 'A2z-600' }}>친구 코드로 찾기</Label>
    <View style={styles.row}><Input style={[styles.flex, { letterSpacing: 2 }]} autoCapitalize="characters" maxLength={10} accessibilityLabel="친구 코드" placeholder="예: 7KQ2MX" value={query} onChangeText={setQuery} onSubmitEditing={search} /><Button primary disabled={busy || !query.trim()} onPress={search}>찾기</Button></View>
    {found && <Card style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
      <Character variant={found.character || 'potato'} size={56} label={found.nickname} />
      <View style={[styles.flex, { gap: 2 }]}><Label style={styles.cardTitle}>{found.nickname}</Label><Label style={styles.small}>LV.{found.level} · #{found.friend_code}</Label>{!!found.bio && <Label numberOfLines={1} style={styles.small}>“{found.bio}”</Label>}</View>
      <Button primary disabled={busy || !['none', 'received'].includes(found.status)} onPress={() => act(found)}>{STATUS_BUTTON[found.status]}</Button>
    </Card>}
    {!!note && <Label accessibilityLiveRegion="polite" style={styles.small}>{note}</Label>}
    {lists && <>
      {lists.received.length > 0 && <><Label style={styles.cardTitle}>받은 친구 신청 {lists.received.length}</Label>
        {lists.received.map(f => row(f, <><Button primary disabled={busy} onPress={() => run(() => acceptFriend(userId, f.id), `${f.nickname}님과 친구가 됐어요!`)}>수락</Button><Button disabled={busy} onPress={() => run(() => removeFriend(userId, f.id), '신청을 거절했어요.')}>거절</Button></>, `LV.${f.level}`))}</>}
      <Label style={styles.cardTitle}>친구 {lists.friends.length}</Label>
      {!lists.friends.length ? <Label style={styles.small}>아직 친구가 없어요. 친구 코드로 찾거나, 이웃 방에서 친구 신청을 해 보세요.</Label>
        : lists.friends.map(f => row(f, <Button primary onPress={() => onOpen({ id: f.id })}>놀러 가기</Button>, `LV.${f.level} · 친밀도 ${f.friendship?.name ?? ''}${f.visited_today ? ' · 오늘 놀러 감' : ''}`))}
      {lists.sent.length > 0 && <><Label style={styles.cardTitle}>보낸 신청 {lists.sent.length}</Label>
        {lists.sent.map(f => row(f, <Button disabled={busy} onPress={() => run(() => removeFriend(userId, f.id), '신청을 취소했어요.')}>취소</Button>, '수락을 기다려요'))}</>}
    </>}
  </>;
}

export default function Neighbors({ userId, myName, initialTab = 'rooms', onBack, onChanged }) {
  const [tab, setTab] = useState(initialTab);
  const [rooms, setRooms] = useState(null), [error, setError] = useState(''), [refresh, setRefresh] = useState(0);
  const [selected, setSelected] = useState(null);   // { room, entries, bond }
  const [mine, setMine] = useState(null);           // { room, entries, visitors }
  const [draft, setDraft] = useState(''), [sending, setSending] = useState(false), [status, setStatus] = useState('');
  const loadRooms = useCallback(async () => {
    try {
      const { rooms: list } = await recommendedRooms(userId, refresh);
      setRooms(await Promise.all(list.map(async item => ({ ...item, room: await roomOf(item.id).catch(() => null) })))); setError('');
    } catch (e) { setError(e.message); }
  }, [userId, refresh]);
  const loadMine = useCallback(async () => {
    try { const [room, book, visits] = await Promise.all([roomOf(userId), guestbook(userId, userId), todayVisitors(userId)]); setMine({ room, entries: book.entries, visitors: visits.visitors }); setError(''); }
    catch (e) { setError(e.message); }
  }, [userId]);
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { if (tab === 'rooms') void loadRooms(); else if (tab === 'mine') void loadMine(); }, [tab, loadRooms, loadMine]);
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
      {!selected.bond?.is_friend && !!selected.room.friend_code && <Card style={{ flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: colors.primarySoft, borderColor: colors.primarySoft }}><Label style={[styles.small, styles.flex, { color: colors.ink }]}>{selected.room.nickname}님과 친구가 되면 친밀도가 오를 때 둘 다 코인을 받아요.</Label><Button primary onPress={async () => { try { const r = await requestFriend(userId, selected.room.friend_code); setStatus(r.message); } catch (e) { setStatus(e.message); } }}>친구 신청</Button></Card>}
      <Label style={styles.cardTitle}>방명록</Label>
      <Input maxLength={MAX} multiline accessibilityLabel={`${myName}의 한마디`} value={draft} editable={!sending} onChangeText={setDraft} placeholder="다정한 한마디를 남겨 보세요." />
      <View style={styles.row}><Label style={styles.small}>{draft.length}/{MAX}</Label><Button primary disabled={sending || !draft.trim()} onPress={submit}>{sending ? '남기는 중…' : '남기기'}</Button></View>
      {!!status && <Label accessibilityLiveRegion="polite" style={styles.small}>{status}</Label>}
      <Entries owner={selected.room.user_id} me={userId} entries={selected.entries} onChanged={() => reloadSelected(selected.room.user_id)} canDelete={entry => entry.author_id === userId} />
    </> : <>
      <View style={styles.row}>{[['rooms', '이웃 방'], ['friends', '친구'], ['mine', '내 방명록']].map(([id, label]) => <Button key={id} style={styles.flex} selected={tab === id} onPress={() => setTab(id)}>{label}</Button>)}</View>
      {!!error && <Label accessibilityRole="alert" style={styles.error}>{error}</Label>}
      {tab === 'rooms' ? <>
        <View style={styles.row}><Label style={[styles.small, styles.flex]}>나와 비슷한 레벨의 이웃이에요. 놀러 가면 오늘의 ‘친구 방 놀러 가기’가 완료돼요.</Label><Button onPress={() => { setRooms(null); setRefresh(n => n + 1); }}>↻ 다른 이웃</Button></View>
        {!rooms ? <Label style={styles.small}>이웃을 찾는 중…</Label> : !rooms.length ? <Label style={styles.small}>아직 놀러 갈 이웃이 없어요.</Label>
          : rooms.map(item => <Card key={item.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <Character variant={item.room?.character || 'potato'} size={70} label={item.nickname} />
            <View style={[styles.flex, { gap: 2 }]}><Label style={styles.cardTitle}>{item.nickname}</Label><Label style={styles.small}>LV.{item.level}{item.similar ? ' · 나와 비슷한 레벨' : ''}{item.is_friend ? ' · 친구' : ''}</Label>{item.room?.visits && <Label style={styles.small}>TODAY {item.room.visits.today} · TOTAL {item.room.visits.total}</Label>}</View>
            <Button primary onPress={() => open(item)}>놀러 가기</Button>
          </Card>)}
      </> : tab === 'friends' ? <Friends userId={userId} onOpen={open} /> : !mine ? <Label style={styles.small}>내 방명록을 불러오는 중…</Label> : <>
        <Room room={mine.room} small />
        <Label style={styles.body}>{mine.visitors.length ? `오늘 놀러 온 이웃: ${mine.visitors.map(v => v.nickname || '이웃').join(', ')}` : '오늘은 아직 놀러 온 이웃이 없어요.'}</Label>
        <Label style={styles.cardTitle}>내 방명록</Label>
        <Entries owner={userId} me={userId} entries={mine.entries} onChanged={loadMine} canDelete={() => true} />
      </>}
    </>}
  </>;
}
