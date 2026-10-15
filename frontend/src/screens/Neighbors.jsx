import { useCallback, useEffect, useState } from 'react';
import ScreenHeader from '../components/ScreenHeader.jsx';
import Mochi from '../components/Mochi.jsx';
import { RoomBackdrop } from './Home.jsx';
import { CLOTHES } from '../../../shared/data/clothes.js';
import { seoulDateKey } from '../../../shared/utils/seoulDate.js';
import { recommendedRooms, roomOf, visitRoom, todayVisitors, guestbook, writeGuestbook, likeEntry, deleteEntry, reportEntry, friendshipWith } from '../api/neighbors.js';

// 이웃 방문 + 방명록을 한 화면에 (서버 연결). 미니홈피처럼 방마다 TODAY / TOTAL 방문자 수와 방명록이 있다.
const REPORT_REASONS = [['spam', '스팸·광고'], ['abuse', '욕설·괴롭힘'], ['hate', '혐오 표현'], ['other', '기타']];
const MAX = 60;

function Entries({ owner, me, entries, onChanged, canDelete }) {
  const [busy, setBusy] = useState(null), [note, setNote] = useState('');
  const act = async (id, job, done) => { if (busy) return; setBusy(id); setNote(''); try { await job(); setNote(done ?? ''); await onChanged(); } catch (e) { setNote(e.message); } finally { setBusy(null); } };
  if (!entries.length) return <p className="visit-empty">아직 방명록이 없어요. 첫 글을 남겨 보세요.</p>;
  return <div className="visit-notes">
    {entries.map(entry => <article key={entry.id}>
      <span className="neighbor-initial" aria-hidden="true">{(entry.author || '?').slice(0, 1)}</span>
      <div><strong>{entry.author || '이웃'}</strong><small>{entry.date}</small><p>{entry.text}</p>
        <div className="guest-safety-actions">
          <button type="button" className="pb visit-like" disabled={!!busy} aria-pressed={entry.liked} aria-label={`${entry.author}의 글 좋아요 ${entry.likes}개`} onClick={() => act(entry.id, () => likeEntry(owner, entry.id, me, entry.liked))}><span aria-hidden="true">{entry.liked ? '♥' : '♡'}</span> {entry.likes}</button>
          {canDelete(entry) ? <button type="button" className="pb ui-secondary" disabled={!!busy} onClick={() => act(entry.id, () => deleteEntry(owner, entry.id, me), '글을 지웠어요.')}>지우기</button>
            : <label className="neighbor-report">신고<select defaultValue="" disabled={!!busy} onChange={event => { const reason = event.target.value; if (reason) act(entry.id, () => reportEntry(me, entry.id, reason), '신고했어요. 이 글은 내 화면에서 숨겨져요.'); }}><option value="">이유 고르기</option>{REPORT_REASONS.map(([v, label]) => <option key={v} value={v}>{label}</option>)}</select></label>}
        </div>
      </div>
    </article>)}
    <p role="status" className="visit-status">{note}</p>
  </div>;
}

function Room({ room, size = 'large' }) {
  return <div className={`visitor-room neighbor-room is-${size}`}>
    <RoomBackdrop decor={room.decor ?? {}} homeScene />
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

export default function Neighbors({ userId, myName, initialTab = 'rooms', onBack, onPosted }) {
  const [tab, setTab] = useState(initialTab);
  const [rooms, setRooms] = useState(null), [error, setError] = useState('');
  const [selected, setSelected] = useState(null);         // { room, entries }
  const [mine, setMine] = useState(null);                 // { room, entries, visitors }
  const [draft, setDraft] = useState(''), [sending, setSending] = useState(false), [status, setStatus] = useState('');
  const loadRooms = useCallback(async () => {
    try {
      const { rooms: list } = await recommendedRooms(userId);
      const withRoom = await Promise.all(list.map(async item => ({ ...item, room: await roomOf(item.id).catch(() => null) })));
      setRooms(withRoom); setError('');
    } catch (e) { setError(e.message); }
  }, [userId]);
  const loadMine = useCallback(async () => {
    try { const [room, book, visits] = await Promise.all([roomOf(userId), guestbook(userId, userId), todayVisitors(userId)]); setMine({ room, entries: book.entries, visitors: visits.visitors }); setError(''); }
    catch (e) { setError(e.message); }
  }, [userId]);
  useEffect(() => { if (tab === 'rooms') void loadRooms(); else void loadMine(); }, [tab, loadRooms, loadMine]);
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
      <nav className="shop-tabs neighbors-tabs" aria-label="이웃 화면">{[['rooms', '이웃 방'], ['mine', '내 방명록']].map(([id, label]) => <button type="button" className="pb" key={id} aria-pressed={tab === id} onClick={() => setTab(id)}>{label}</button>)}</nav>
      {error && <p role="alert" className="visit-status">{error}</p>}
      {tab === 'rooms' ? <>
        <p className="visit-intro">나와 비슷한 레벨의 이웃부터 보여 줘요. 놀러 가면 오늘의 '친구 방 놀러 가기'가 완료돼요.</p>
        {!rooms ? <p role="status" className="visit-intro">이웃을 찾는 중…</p> : !rooms.length ? <p className="visit-empty">아직 놀러 갈 이웃이 없어요.</p> : <div className="visit-recommendations">{rooms.map(item => <button type="button" className="pb visit-card" key={item.id} onClick={() => open(item)}>
          <span className="visit-avatar" style={{ background: 'var(--color-primary-soft)' }}><Mochi variant={item.room?.character || 'potato'} width={80} height={80} /></span>
          <span className="visit-profile"><strong>{item.nickname}</strong><span>LV.{item.level}{item.similar ? ' · 나와 비슷한 레벨' : ''}{item.is_friend ? ' · 친구' : ''}</span>{item.room?.visits && <small>TODAY {item.room.visits.today} · TOTAL {item.room.visits.total}</small>}</span><span aria-hidden="true">→</span>
        </button>)}</div>}
      </> : !mine ? <p role="status" className="visit-intro">내 방명록을 불러오는 중…</p> : <>
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
