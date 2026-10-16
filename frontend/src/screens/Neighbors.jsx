import { useCallback, useEffect, useRef, useState } from 'react';
import ScreenHeader from '../components/ScreenHeader.jsx';
import Mochi from '../components/Mochi.jsx';
import { RoomBackdrop } from './Home.jsx';
import { CLOTHES } from '../../../shared/data/clothes.js';
import { seoulDateKey } from '../../../shared/utils/seoulDate.js';
import { recommendedRooms, roomOf, visitRoom, todayVisitors, guestbook, writeGuestbook, likeEntry, deleteEntry, reportEntry, friendshipWith, myProfile, friendsOf, searchFriend, requestFriend, acceptFriend, removeFriend } from '../api/neighbors.js';

// 이웃 방문 + 방명록을 한 화면에 (서버 연결). 미니홈피처럼 방마다 TODAY / TOTAL 방문자 수와 방명록이 있다.
// 서버 moderation.REPORT_REASONS와 같은 이유
const REPORT_REASONS = [['spam', '스팸·광고'], ['abuse', '욕설·괴롭힘'], ['hate', '혐오 표현'], ['sexual', '성적인 내용'], ['self_harm', '자해·위험한 내용'], ['other', '기타']];

// 신고 버튼을 누르면 뜨는 창: 이유를 고르고 '신고하기'
function ReportDialog({ entry, onCancel, onReport }) {
  const dialog = useRef(null), [reason, setReason] = useState('');
  useEffect(() => { const el = dialog.current; if (el && !el.open) el.showModal(); }, []);
  return <dialog ref={dialog} className="report-dialog" aria-labelledby="report-title" onCancel={onCancel} onClose={onCancel}>
    <h2 id="report-title">신고할까요?</h2>
    <p className="report-quote">“{entry.text}”</p>
    <fieldset><legend>어떤 문제인가요?</legend>{REPORT_REASONS.map(([value, label]) => <button type="button" key={value} className="pb ui-secondary" aria-pressed={reason === value} onClick={() => setReason(value)}>{label}</button>)}</fieldset>
    <p className="report-hint">신고하면 이 글은 내 화면에서 바로 숨겨지고, 여러 명이 신고하면 모두에게 숨겨져요.</p>
    <div className="report-actions"><button type="button" className="pb ui-secondary" onClick={onCancel}>취소</button><button type="button" className="pb ui-primary" disabled={!reason} onClick={() => onReport(reason)}>신고하기</button></div>
  </dialog>;
}
const MAX = 60;

function Entries({ owner, me, entries, onChanged, canDelete }) {
  const [busy, setBusy] = useState(null), [note, setNote] = useState(''), [reporting, setReporting] = useState(null);
  const act = async (id, job, done) => { if (busy) return; setBusy(id); setNote(''); try { await job(); setNote(done ?? ''); await onChanged(); } catch (e) { setNote(e.message); } finally { setBusy(null); } };
  if (!entries.length) return <p className="visit-empty">아직 방명록이 없어요. 첫 글을 남겨 보세요.</p>;
  return <div className="visit-notes">
    {entries.map(entry => <article key={entry.id}>
      <span className="neighbor-initial" aria-hidden="true">{(entry.author || '?').slice(0, 1)}</span>
      <div><strong>{entry.author || '이웃'}</strong><small>{entry.date}</small><p>{entry.text}</p>
        <div className="guest-safety-actions">
          <button type="button" className="pb visit-like" disabled={!!busy} aria-pressed={entry.liked} aria-label={`${entry.author}의 글 좋아요 ${entry.likes}개`} onClick={() => act(entry.id, () => likeEntry(owner, entry.id, me, entry.liked))}><span aria-hidden="true">{entry.liked ? '♥' : '♡'}</span> {entry.likes}</button>
          {canDelete(entry) ? <button type="button" className="pb ui-secondary" disabled={!!busy} onClick={() => act(entry.id, () => deleteEntry(owner, entry.id, me), '글을 지웠어요.')}>지우기</button>
            : <button type="button" className="pb ui-secondary neighbor-report" disabled={!!busy} onClick={() => setReporting(entry)}>신고</button>}
        </div>
      </div>
    </article>)}
    <p role="status" className="visit-status">{note}</p>
    {reporting && <ReportDialog entry={reporting} onCancel={() => setReporting(null)} onReport={reason => { const target = reporting; setReporting(null); act(target.id, () => reportEntry(me, target.id, reason), '신고했어요. 이 글은 내 화면에서 숨겨져요.'); }} />}
  </div>;
}

function Room({ room, size = 'large' }) {
  return <div className={`visitor-room neighbor-room is-${size}`}>
    <RoomBackdrop decor={room.decor ?? {}} positions={room.positions ?? {}} homeScene />
    <div className="visitor-pet"><Mochi variant={room.character || 'potato'} outfit={CLOTHES.find(item => item.id === room.outfit)} full width={size === 'large' ? 170 : 120} height={size === 'large' ? 180 : 126} label={`${room.nickname}의 캐릭터`} /></div>
    {room.visits && <span className="neighbor-counter">TODAY <b>{room.visits.today}</b> · TOTAL <b>{room.visits.total}</b></span>}
  </div>;
}

// 친밀도 카드: 레벨 이름, 다음 레벨까지 점수, 서로 한 교류 횟수
function Bond({ bond, name }) {
  if (!bond) return null;
  const { mine, theirs } = bond.counts;
  const next = bond.next_level_at;
  return <section className="neighbor-bond" aria-label={`${name}와의 친밀도`}>
    <div className="neighbor-bond-head"><strong>친밀도 Lv.{bond.level} · {bond.name}</strong><span>{bond.is_friend ? '친구' : '이웃'}</span></div>
    <progress value={next ? bond.points : 1} max={next ?? 1} aria-label={next ? `다음 레벨까지 ${bond.points_to_next}점` : '최고 레벨'} />
    <small>{next ? `다음 레벨까지 ${bond.points_to_next}점${bond.is_friend && bond.next_reward ? ` · 오르면 둘 다 ${bond.next_reward}코인` : ''}` : '최고 레벨이에요!'}</small>
    <ul className="neighbor-bond-counts">
      <li>내가 놀러 감 <b>{mine.visit}</b> · 방명록 <b>{mine.guestbook}</b> · 좋아요 <b>{mine.like}</b></li>
      <li>{name} 님이 놀러 옴 <b>{theirs.visit}</b> · 방명록 <b>{theirs.guestbook}</b> · 좋아요 <b>{theirs.like}</b></li>
    </ul>
    <small>서로 놀러 가고 방명록·좋아요를 남길수록 올라요 (하루에 종류마다 한 번씩).</small>
  </section>;
}


const STATUS_BUTTON = { none: '친구 신청', sent: '신청 보냄 ✓', received: '신청 수락', friend: '이미 친구예요', me: '나예요' };

// 친구 탭: 내 친구 코드 · 코드로 찾기 · 받은 신청 · 친구 목록 · 보낸 신청 (포켓몬 GO 트레이너 코드·브롤스타즈 플레이어 태그처럼)
function Friends({ userId, onOpen }) {
  const [code, setCode] = useState(null), [lists, setLists] = useState(null), [query, setQuery] = useState('');
  const [found, setFound] = useState(null), [note, setNote] = useState(''), [busy, setBusy] = useState(false);
  const load = useCallback(async () => {
    try { const [me, view] = await Promise.all([myProfile(userId), friendsOf(userId)]); setCode(me.friend_code); setLists(view); }
    catch (e) { setNote(e.message); }
  }, [userId]);
  useEffect(() => { void load(); }, [load]);
  const run = async (job, done) => { if (busy) return; setBusy(true); setNote(''); try { const r = await job(); setNote(done ?? r?.message ?? ''); await load(); return r; } catch (e) { setNote(e.message); return null; } finally { setBusy(false); } };
  const search = async event => { event.preventDefault(); if (!query.trim()) return; setFound(null); const r = await run(() => searchFriend(userId, query.trim()), ''); if (r) setFound(r); };
  const act = async target => {
    if (target.status === 'none') { await run(() => requestFriend(userId, target.friend_code)); setFound({ ...target, status: 'sent' }); }
    else if (target.status === 'received') { await run(() => acceptFriend(userId, target.id), `${target.nickname}님과 친구가 됐어요!`); setFound({ ...target, status: 'friend' }); }
  };
  const copy = async () => { try { await navigator.clipboard.writeText(code); setNote('친구 코드를 복사했어요.'); } catch { setNote(`친구 코드: ${code}`); } };
  return <div className="friends-panel">
    <section className="friend-code-card" aria-label="내 친구 코드">
      <small>내 친구 코드</small>
      <div><strong>#{code ?? '……'}</strong><button type="button" className="pb ui-secondary" disabled={!code} onClick={copy}>복사</button></div>
      <p>친구에게 알려 주면 코드로 나를 찾을 수 있어요.</p>
    </section>
    <form className="friend-search" onSubmit={search}>
      <label htmlFor="friend-code">친구 코드로 찾기</label>
      <div><input id="friend-code" className="inp" maxLength={10} placeholder="예: 7KQ2MX" value={query} onChange={event => setQuery(event.target.value)} autoCapitalize="characters" /><button type="submit" className="pb ui-primary" disabled={busy || !query.trim()}>찾기</button></div>
    </form>
    {found && <article className="friend-found">
      <span className="visit-avatar"><Mochi variant={found.character || 'potato'} width={56} height={56} /></span>
      <div><strong>{found.nickname}</strong><small>LV.{found.level} · #{found.friend_code}</small>{found.bio && <small>“{found.bio}”</small>}</div>
      <button type="button" className="pb ui-primary" disabled={busy || !['none', 'received'].includes(found.status)} onClick={() => act(found)}>{STATUS_BUTTON[found.status]}</button>
    </article>}
    <p role="status" className="visit-status">{note}</p>
    {lists && <>
      {lists.received.length > 0 && <section className="friend-list"><h3>받은 친구 신청 <small>{lists.received.length}</small></h3>
        {lists.received.map(f => <div className="friend-row" key={f.id}><span><strong>{f.nickname}</strong><small>LV.{f.level}</small></span>
          <button type="button" className="pb ui-primary" disabled={busy} onClick={() => run(() => acceptFriend(userId, f.id), `${f.nickname}님과 친구가 됐어요!`)}>수락</button>
          <button type="button" className="pb ui-secondary" disabled={busy} onClick={() => run(() => removeFriend(userId, f.id), '신청을 거절했어요.')}>거절</button></div>)}
      </section>}
      <section className="friend-list"><h3>친구 <small>{lists.friends.length}</small></h3>
        {!lists.friends.length ? <p className="visit-empty">아직 친구가 없어요. 친구 코드로 찾거나, 이웃 방에서 친구 신청을 해 보세요.</p>
          : lists.friends.map(f => <div className="friend-row" key={f.id}><span><strong>{f.nickname}</strong><small>LV.{f.level} · 친밀도 {f.friendship?.name ?? ''}{f.visited_today ? ' · 오늘 놀러 감' : ''}</small></span>
            <button type="button" className="pb ui-primary" onClick={() => onOpen({ id: f.id })}>놀러 가기</button></div>)}
      </section>
      {lists.sent.length > 0 && <section className="friend-list"><h3>보낸 신청 <small>{lists.sent.length}</small></h3>
        {lists.sent.map(f => <div className="friend-row" key={f.id}><span><strong>{f.nickname}</strong><small>수락을 기다려요</small></span>
          <button type="button" className="pb ui-secondary" disabled={busy} onClick={() => run(() => removeFriend(userId, f.id), '신청을 취소했어요.')}>취소</button></div>)}
      </section>}
    </>}
  </div>;
}

export default function Neighbors({ userId, myName, initialTab = 'rooms', onBack, onPosted }) {
  const [tab, setTab] = useState(initialTab);
  const [rooms, setRooms] = useState(null), [error, setError] = useState(''), [refresh, setRefresh] = useState(0);
  const [selected, setSelected] = useState(null);         // { room, entries }
  const [mine, setMine] = useState(null);                 // { room, entries, visitors }
  const [draft, setDraft] = useState(''), [sending, setSending] = useState(false), [status, setStatus] = useState('');
  const loadRooms = useCallback(async () => {
    try {
      const { rooms: list } = await recommendedRooms(userId, refresh);
      const withRoom = await Promise.all(list.map(async item => ({ ...item, room: await roomOf(item.id).catch(() => null) })));
      setRooms(withRoom); setError('');
    } catch (e) { setError(e.message); }
  }, [userId, refresh]);
  const loadMine = useCallback(async () => {
    try { const [room, book, visits] = await Promise.all([roomOf(userId), guestbook(userId, userId), todayVisitors(userId)]); setMine({ room, entries: book.entries, visitors: visits.visitors }); setError(''); }
    catch (e) { setError(e.message); }
  }, [userId]);
  useEffect(() => { if (tab === 'rooms') void loadRooms(); else if (tab === 'mine') void loadMine(); }, [tab, loadRooms, loadMine]);
  const reloadSelected = useCallback(async owner => { const [room, book, bond] = await Promise.all([roomOf(owner), guestbook(owner, userId), friendshipWith(userId, owner).catch(() => null)]); setSelected({ room, entries: book.entries, bond }); }, [userId]);
  const open = async item => {
    setStatus(''); setDraft('');
    try { await visitRoom(item.id, userId); await reloadSelected(item.id); } catch (e) { setError(e.message); }
  };
  const submit = async event => {
    event.preventDefault();
    const text = draft.trim(); if (!text || sending) return;
    setSending(true); setStatus('');
    try { await writeGuestbook(selected.room.user_id, userId, text); setDraft(''); setStatus('방명록을 남겼어요.'); onPosted?.(seoulDateKey()); await reloadSelected(selected.room.user_id); }
    catch (e) { setStatus(e.message); }
    finally { setSending(false); }
  };
  const back = () => { if (selected) { setSelected(null); void loadRooms(); } else onBack(); };
  return <section className="visit-screen neighbors-screen">
    <ScreenHeader title={selected ? `${selected.room.nickname}의 방` : '이웃'} backLabel={selected ? '이웃 목록으로 돌아가기' : '내 집으로 돌아가기'} onBack={back} />
    {selected ? <>
      <p className="visit-intro">LV.{selected.room.level}{selected.room.bio ? ` · “${selected.room.bio}”` : ' · 놀러 왔어요! 방명록에 한마디 남겨 보세요.'}</p>
      <Room room={selected.room} />
      <Bond bond={selected.bond} name={selected.room.nickname} />
      {!selected.bond?.is_friend && selected.room.friend_code && <div className="neighbor-friend-request"><span>{selected.room.nickname}님과 친구가 되면 친밀도가 오를 때 둘 다 코인을 받아요.</span><button type="button" className="pb ui-primary" onClick={async () => { try { const r = await requestFriend(userId, selected.room.friend_code); setStatus(r.message); } catch (e) { setStatus(e.message); } }}>친구 신청</button></div>}
      <section className="visit-guestbook" aria-labelledby="neighbor-book-title">
        <h2 id="neighbor-book-title">방명록</h2>
        <form onSubmit={submit}>
          <label htmlFor="neighbor-note">{myName}의 한마디</label>
          <textarea id="neighbor-note" maxLength={MAX} value={draft} disabled={sending} onChange={event => setDraft(event.target.value)} placeholder="다정한 한마디를 남겨 보세요." />
          <div><small>{draft.length}/{MAX}</small><button type="submit" className="pb" disabled={sending || !draft.trim()}>{sending ? '남기는 중…' : '남기기'}</button></div>
        </form>
        <p role="status" className="visit-status">{status}</p>
        <Entries owner={selected.room.user_id} me={userId} entries={selected.entries} onChanged={() => reloadSelected(selected.room.user_id)} canDelete={entry => entry.author_id === userId} />
      </section>
    </> : <>
      <nav className="shop-tabs neighbors-tabs" aria-label="이웃 화면">{[['rooms', '이웃 방'], ['friends', '친구'], ['mine', '내 방명록']].map(([id, label]) => <button type="button" className="pb" key={id} aria-pressed={tab === id} onClick={() => setTab(id)}>{label}</button>)}</nav>
      {error && <p role="alert" className="visit-status">{error}</p>}
      {tab === 'rooms' ? <>
        <div className="neighbors-refresh"><p className="visit-intro">나와 비슷한 레벨의 이웃이에요. 놀러 가면 오늘의 '친구 방 놀러 가기'가 완료돼요.</p><button type="button" className="pb ui-secondary" onClick={() => { setRooms(null); setRefresh(n => n + 1); }}>↻ 다른 이웃 보기</button></div>
        {!rooms ? <p role="status" className="visit-intro">이웃을 찾는 중…</p> : !rooms.length ? <p className="visit-empty">아직 놀러 갈 이웃이 없어요.</p> : <div className="visit-recommendations">{rooms.map(item => <button type="button" className="pb visit-card" key={item.id} onClick={() => open(item)}>
          <span className="visit-avatar" style={{ background: 'var(--color-primary-soft)' }}><Mochi variant={item.room?.character || 'potato'} width={80} height={80} /></span>
          <span className="visit-profile"><strong>{item.nickname}</strong><span>LV.{item.level}{item.similar ? ' · 나와 비슷한 레벨' : ''}{item.is_friend ? ' · 친구' : ''}</span>{item.room?.visits && <small>TODAY {item.room.visits.today} · TOTAL {item.room.visits.total}</small>}</span><span aria-hidden="true">→</span>
        </button>)}</div>}
      </> : tab === 'friends' ? <Friends userId={userId} onOpen={open} /> : !mine ? <p role="status" className="visit-intro">내 방명록을 불러오는 중…</p> : <>
        <Room room={mine.room} size="small" />
        <p className="visit-intro">{mine.visitors.length ? `오늘 놀러 온 이웃: ${mine.visitors.map(v => v.nickname || '이웃').join(', ')}` : '오늘은 아직 놀러 온 이웃이 없어요.'}</p>
        <section className="visit-guestbook" aria-labelledby="my-book-title">
          <h2 id="my-book-title">내 방명록</h2>
          <Entries owner={userId} me={userId} entries={mine.entries} onChanged={loadMine} canDelete={() => true} />
        </section>
      </>}
    </>}
  </section>;
}
