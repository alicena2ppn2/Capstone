import { useEffect, useState } from 'react';
import Mochi from '../components/Mochi.jsx';
import { seoulDateKey } from '../utils/seoulDate.js';

const USERS = [
  { id: 'yuna', name: '유나', nickname: '복숭아산책', icon: '🍑', variant: 'pink', wall: '#FBE5DE', floor: '#E7C8AE', theme: '햇살 가득 복숭아 방', detail: '꽃을 모으고 느긋하게 산책해요.', decor: '🌷' },
  { id: 'taeo', name: '태오', nickname: '달잠꾸러기', icon: '🌙', variant: 'lavender', wall: '#E8E0F5', floor: '#D6C5DF', theme: '포근한 달빛 방', detail: '잠들기 전 좋아하는 책 한 페이지.', decor: '⭐' },
  { id: 'harin', name: '하린', nickname: '파도한스푼', icon: '🐚', variant: 'sky', wall: '#DCEEF5', floor: '#C5DADB', theme: '시원한 바닷바람 방', detail: '파도 소리와 시원한 음료를 좋아해요.', decor: '🐚' },
  { id: 'minseo', name: '민서', nickname: '초록쉼표', icon: '🌿', variant: 'mint', wall: '#E5EFD8', floor: '#D1D7B7', theme: '새잎이 자라는 방', detail: '작은 화분과 함께 천천히 자라요.', decor: '🪴' },
  { id: 'jiho', name: '지호', nickname: '구름우체국', icon: '☁️', variant: 'mochi', wall: '#E1EBFA', floor: '#E9D6BF', theme: '구름 편지가 도착하는 방', detail: '오늘도 다정한 안부를 기다려요.', decor: '💌' },
  { id: 'sua', name: '수아', nickname: '감자일기', icon: '🥔', variant: 'potato', wall: '#F5EBCF', floor: '#DFC4A2', theme: '작고 따뜻한 다락방', detail: '소소한 하루를 차곡차곡 기록해요.', decor: '📚' },
];

// 서울 날짜마다 세 칸씩 한 칸 순환하여, 하루 동안 동일한 추천을 유지한다.
export function recommendedUsers(day) {
  const offset = Math.floor(Date.parse(`${day}T00:00:00Z`) / 86400000) % USERS.length;
  return [0, 2, 4].map(index => USERS[(offset + index) % USERS.length]);
}

function loadNotes() {
  try {
    const value = JSON.parse(localStorage.getItem('mochi.visitNotes.v1'));
    if (value && typeof value === 'object' && !Array.isArray(value)) return value;
  } catch { /* 처음 방문 */ }
  return {};
}

export default function Visit({ visitorName, visitorVariant, onBack }) {
  const [day, setDay] = useState(() => seoulDateKey());
  const [selected, setSelected] = useState(null);
  const [notes, setNotes] = useState(loadNotes);
  const [draft, setDraft] = useState('');
  const [message, setMessage] = useState('');
  useEffect(() => {
    const refresh = () => setDay(seoulDateKey());
    const timer = setInterval(refresh, 1000);
    document.addEventListener('visibilitychange', refresh);
    return () => { clearInterval(timer); document.removeEventListener('visibilitychange', refresh); };
  }, []);
  useEffect(() => {
    try { localStorage.setItem('mochi.visitNotes.v1', JSON.stringify(notes)); }
    catch { setMessage('현재 화면에는 남겼지만 브라우저에 저장하지 못했어요.'); }
  }, [notes]);
  const submit = event => {
    event.preventDefault();
    const text = draft.trim();
    if (!text) return;
    const entry = { name: visitorName, variant: visitorVariant, text, date: seoulDateKey(), id: `${Date.now()}-${Math.random()}` };
    setNotes(value => ({ ...value, [selected.id]: [entry, ...(Array.isArray(value[selected.id]) ? value[selected.id] : [])] }));
    setDraft('');
    setMessage('방명록을 남겼어요!');
  };
  return <section className="visit-screen">
    <header className="visit-header">
      <button type="button" className="pb" aria-label={selected ? '추천 목록으로 돌아가기' : '내 집으로 돌아가기'} onClick={() => { if (selected) setSelected(null); else onBack(); setDraft(''); setMessage(''); }}>←</button>
      <h1>{selected ? `${selected.nickname}의 집` : '방문하기'}</h1>
    </header>
    {selected ? <>
      <p className="visit-intro">{selected.icon} {selected.name} · {selected.nickname}</p>
      <div className="visitor-room" style={{ '--wall': selected.wall, '--floor': selected.floor }}>
        <span className="visitor-room-theme">{selected.theme}</span>
        <div className="visitor-window"><span>☀️</span></div>
        <div className="visitor-shelf"><span>{selected.decor}</span><span>{selected.icon}</span></div>
        <div className="visitor-rug" />
        <div className="visitor-pet"><Mochi variant={selected.variant} full width={180} height={190} label={`${selected.nickname}의 캐릭터`} /></div>
      </div>
      <p className="visit-intro">{selected.detail}</p>
      <section className="visit-guestbook" aria-labelledby="visit-notes-title">
        <h2 id="visit-notes-title">방명록</h2>
        <form onSubmit={submit}>
          <label htmlFor="visit-note">{visitorName}의 안부</label>
          <textarea id="visit-note" maxLength={120} value={draft} onChange={event => setDraft(event.target.value)} placeholder="다정한 한마디를 남겨보세요." />
          <div><small>{draft.length}/120</small><button type="submit" className="pb" disabled={!draft.trim()}>남기기</button></div>
        </form>
        <p role="status" className="visit-status">{message}</p>
        <div className="visit-notes">
          {(Array.isArray(notes[selected.id]) ? notes[selected.id] : []).map(entry => <article key={entry.id}><Mochi variant={entry.variant} width={40} height={40} /><div><strong>{entry.name}</strong><small>{entry.date}</small><p>{entry.text}</p></div></article>)}
          {!notes[selected.id]?.length && <p className="visit-empty">첫 번째 안부를 남겨주세요.</p>}
        </div>
      </section>
    </> : <>
      <p className="visit-intro">오늘 만나볼 세 이웃</p>
      <div className="visit-recommendations">{recommendedUsers(day).map(user => <button type="button" className="pb visit-card" key={user.id} onClick={() => { setSelected(user); setDraft(''); setMessage(''); }}>
        <span className="visit-avatar" style={{ background: user.wall }}><Mochi variant={user.variant} width={80} height={80} /><span>{user.icon}</span></span>
        <span className="visit-profile"><strong>{user.nickname}</strong><span>{user.name}</span><small>{user.theme}</small></span><span aria-hidden="true">→</span>
      </button>)}</div>
      <p className="visit-intro">서울 시간 자정에 새로운 이웃을 추천해요.</p>
    </>}
    <p className="visit-mock-note">가상 이웃 목업 · 방명록은 이 브라우저에만 저장돼요.</p>
  </section>;
}
