import React, { useEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { CHARACTERS } from '../../../shared/data/characters.js';
import { PLACES, ROUTE, distance, pointAt, arrival, confirmVisit, claimExample, emptyState, POLICY } from './model.mjs';
import SampleMap from './SampleMap.jsx';
import KakaoLiveMap from './KakaoLiveMap.jsx';
import UiIcon from '../../src/components/UiIcon.jsx';
import './style.css';
import './a-style.css';

const initialFix = () => ({ ...ROUTE[0], accuracy: 8, timestamp: Date.now() });
const atPlace = place => ({ x: place.x, y: place.y, accuracy: 8, timestamp: Date.now() });
const SAMPLE_NOTES = {
  park: [
    { text: '친구랑 여기 앉아 별 얘기도 아닌 걸로 오래 웃었어요. 무슨 얘기였는지는 둘 다 까먹었네요.', color: 'apricot', author: '익명 · 창작 샘플', date: '예시 날짜' },
    { text: '바람이 좋아서 벤치에 조금 더 앉아 있다 가요. 가방에 과자 부스러기만 남았어요.', color: 'mint', author: '익명 · 창작 샘플', date: '예시 날짜' },
  ],
  library: [
    { text: '책 제목만 보려고 들어왔는데 표지를 한참 구경했어요. 결국 아무것도 안 빌리고 나왔습니다.', color: 'yellow', author: '익명 · 창작 샘플', date: '예시 날짜' },
    { text: '예전에 이 근처에 살았어요. 오랜만에 왔는데 돌아가는 길은 몸이 먼저 기억하네요.', color: 'apricot', author: '익명 · 창작 샘플', date: '예시 날짜' },
  ],
  square: [
    { text: '산책 나온 강아지가 저보다 인사를 많이 했어요. 오늘 벌써 세 번째예요.', color: 'mint', author: '익명 · 창작 샘플', date: '예시 날짜' },
    { text: '친구를 기다리며 구름 모양 맞히기를 했어요. 서로 답이 달라서 한참 웃었습니다.', color: 'yellow', author: '익명 · 창작 샘플', date: '예시 날짜' },
  ],
};

function Postit({ note, reaction, onReact, children }) {
  return <article className={`postit paper-${note.color}`}>
    <span className="postit-tape" aria-hidden="true" />
    {note.sticker && <span className="postit-personal-sticker" aria-label={`선택한 스티커 ${note.sticker}`}>{note.sticker}</span>}
    <p className="postit-copy">{note.text}</p>
    <footer className="postit-meta"><span>{note.author}</span><time>{note.date}</time></footer>
    {children}
    <div className="postit-reactions">
      <button className={`postit-heart${reaction === 'heart' ? ' chosen' : ''}`} type="button" aria-label={reaction === 'heart' ? '하트 반응 취소' : '하트 반응 남기기'} aria-pressed={reaction === 'heart'} onClick={() => onReact('heart')}>
        <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M20.8 4.7a5.5 5.5 0 0 0-7.8 0L12 5.8l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8l1.1 1.1L12 21l7.8-7.4 1.1-1.1a5.5 5.5 0 0 0-.1-7.8Z" /></svg>
      </button>
    </div>
  </article>;
}

function ExampleReward({ place, className = '' }) {
  return <div className={`a-reward ${className}`} aria-label={`예시 보상: ${place.reward.coins} 코인, ${place.reward.xp} XP, ${place.reward.item}`}>
    <span className="a-reward-token"><UiIcon kind="coin" size={19} /> +{place.reward.coins} 코인</span>
    <span className="a-reward-token"><svg className="a-xp-icon" viewBox="0 0 28 28" aria-hidden="true"><path d="M14 2 L18 9 L26 11 L20 17 L21 25 L14 21 L7 25 L8 17 L2 11 L10 9Z" /><text x="14" y="17" textAnchor="middle">XP</text></svg> +{place.reward.xp} XP</span>
    <span className="a-reward-item">{place.reward.item}</span>
  </div>;
}

function APreview() {
  const [character, setCharacter] = useState('mochi');
  const [mapMode, setMapMode] = useState('sample');
  const [placeId, setPlaceId] = useState(PLACES[0].id);
  const [fix, setFix] = useState(initialFix);
  const [fixes, setFixes] = useState([]);
  const [progress, setProgress] = useState(0);
  const [moving, setMoving] = useState(false);
  const [state, setState] = useState(emptyState);
  const [open, setOpen] = useState(false);
  const [note, setNote] = useState('');
  const [paperColor, setPaperColor] = useState('yellow');
  const [sticker, setSticker] = useState('♡');
  const [reactions, setReactions] = useState({});
  const [notice, setNotice] = useState('');
  const noticeTimer = useRef(null);
  const opener = useRef(null);
  const closeButton = useRef(null);
  const place = PLACES.find(item => item.id === placeId);
  const visited = !!state.visits[place.id];
  const claimed = !!state.claims[place.id];
  const check = arrival(place, fixes, Date.now());

  useEffect(() => {
    if (!moving) return undefined;
    const timer = setInterval(() => setProgress(current => {
      const next = Math.min(ROUTE.length - 1, current + 0.16);
      if (next === ROUTE.length - 1) setMoving(false);
      return next;
    }), 500);
    return () => clearInterval(timer);
  }, [moving]);
  useEffect(() => {
    if (moving) setFix({ ...pointAt(progress), accuracy: 8, timestamp: Date.now() });
  }, [progress, moving]);
  useEffect(() => () => clearTimeout(noticeTimer.current), []);
  useEffect(() => {
    if (!open) return undefined;
    const previous = document.activeElement;
    closeButton.current?.focus({ preventScroll: true });
    const onKey = event => { if (event.key === 'Escape') { event.preventDefault(); setOpen(false); } };
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('keydown', onKey);
      const target = opener.current?.isConnected ? opener.current : previous;
      target?.focus?.({ preventScroll: true });
    };
  }, [open]);

  function inform(message) {
    clearTimeout(noticeTimer.current);
    setNotice(message);
    noticeTimer.current = setTimeout(() => setNotice(''), 2200);
  }
  function showPlace(id, trigger) {
    setPlaceId(id);
    opener.current = trigger ?? document.activeElement;
    setOpen(true);
  }
  function simulateArrival() {
    setMoving(false);
    setFix(atPlace(place));
    setFixes([{ ...atPlace(place), timestamp: Date.now() - 1000 }, atPlace(place)]);
    inform('예시 위치를 옮겼어요. 실제 도착 인증은 아니에요.');
  }
  function reset() {
    setMoving(false); setProgress(0); setFix(initialFix()); setFixes([]);
    setState(emptyState()); setNote(''); setReactions({}); setOpen(false);
    inform('A안 시안을 처음부터 볼 수 있어요.');
  }
  function addNote(event) {
    event.preventDefault();
    const text = note.trim();
    if (!visited || !text) return;
    setState(current => ({ ...current, notes: [...current.notes, { id: crypto.randomUUID(), place: place.id, text, color: paperColor, sticker }] }));
    setNote('');
    inform('이 화면에만 예시 쪽지를 붙였어요.');
  }
  function reactTo(id, value) {
    setReactions(current => ({ ...current, [id]: current[id] === value ? '' : value }));
  }

  return <div className="prototype a-preview">
    <header className="a-header"><div><b>MY MOCHI</b><span>모찌와 동네 탐험</span></div><small>{mapMode === 'sample' ? '개발 시안 · 예시 위치' : '개발 시안 · 실제 위치'}</small></header>
    <main inert={open ? true : undefined}>
      <div className="a-topline"><h1>모찌와 동네 탐험</h1><label>동행 <select value={character} onChange={event => setCharacter(event.target.value)} aria-label="시안 캐릭터">{CHARACTERS.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label></div>
      {mapMode === 'sample' ? <>
      <SampleMap fix={fix} character={character} choose={setPlaceId} showNotes openNote={showPlace} />
      <button className="secondary a-wide a-live-entry" type="button" onClick={() => setMapMode('live')}>내 위치로 시작 · 실제 지도</button>
      <section className="a-place" aria-label="선택한 예시 장소">
        <div className="a-place-heading"><div><small>선택한 예시 장소</small><h2>{place.name}</h2></div><span>{Math.round(distance(fix, place))}m · 직선거리</span></div>
        <ExampleReward place={place} />
        <button className="primary a-main-action" onClick={event => showPlace(place.id, event.currentTarget)}>장소 보기</button>
      </section>
      <div className="a-controls"><button className="secondary" onClick={() => setMoving(value => !value)}>{moving ? '일시정지' : '이동 시작'}</button><button className="secondary" onClick={simulateArrival}>도착 상황 보기</button><button className="text-button" onClick={reset}>처음부터 보기</button></div>
      </> : <KakaoLiveMap character={character} onBackToExample={() => setMapMode('sample')} />}
    </main>
    {open && <div className="sheet-overlay postit-overlay" onClick={event => { if (event.target === event.currentTarget) setOpen(false); }}><section className="sheet a-sheet" role="dialog" aria-modal="true" aria-label={`${place.name} 포스트잇`}>
      <header><div><small>예시 장소 · {place.kind}</small><h2>{place.name}</h2></div><button ref={closeButton} aria-label="쪽지 닫기" onClick={() => setOpen(false)}>×</button></header>
      <p className="a-sheet-distance">직선거리 {Math.round(distance(fix, place))}m · 예시</p>
      <p className="postit-sample-label">아래 글은 모두 창작 샘플이에요.</p>
      {!visited && <div className="a-arrival-actions"><button className="secondary a-wide" onClick={simulateArrival}>예시 도착 보기</button>{!check.ok && <small>{check.text}</small>}<button className="secondary a-wide" disabled={!check.ok} onClick={() => setState(current => confirmVisit(current, place, fixes, Date.now()))}>도착 확인</button></div>}
      {visited && <><p className="a-guidance">예시 도착 확인 ✓ · 예시 보상</p><ExampleReward place={place} className="a-sheet-reward" /><button className="secondary a-wide" disabled={claimed} onClick={() => { setState(current => claimExample(current, place)); inform('시안에서만 예시 보상을 확인했어요.'); }}>{claimed ? '예시 보상 확인 완료 ✓' : '예시 보상 확인'}</button></>}
      <div className="postit-stack">{SAMPLE_NOTES[place.id].slice(0, visited ? 2 : 1).map((sample, index) => {
        const id = `sample:${place.id}:${index}`;
        return <Postit key={id} note={sample} reaction={reactions[id]} onReact={value => reactTo(id, value)} />;
      })}
      {state.notes.filter(item => item.place === place.id).map(item => <Postit key={item.id} note={{ ...item, author: '내 예시 쪽지', date: '방금 · 이 화면에만 표시' }} reaction={reactions[item.id]} onReact={value => reactTo(item.id, value)}><button className="text-button postit-delete" onClick={() => setState(current => ({ ...current, notes: current.notes.filter(value => value.id !== item.id) }))}>삭제</button></Postit>)}
      </div>
      {!visited && <p className="postit-gate">도착 상황을 확인하면 쪽지를 더 읽고 내 쪽지도 붙일 수 있어요.</p>}
      {visited && <form className="postit-compose" onSubmit={addNote}>
        <h3>내 쪽지 붙이기 <small>선택한 내용은 이 화면에서만 보여요.</small></h3>
        <textarea aria-label="쪽지 내용" maxLength={POLICY.noteLimit} value={note} onChange={event => setNote(event.target.value)} placeholder="이 장소에서 떠오른 기억을 적어 보세요." />
        <div className="choice-group"><span>종이색</span>{[['yellow','연노랑'],['apricot','살구'],['mint','연민트']].map(([key,label])=><button type="button" key={key} className={`swatch swatch-${key}`} aria-pressed={paperColor===key} onClick={()=>setPaperColor(key)}>{label}</button>)}</div>
        <div className="choice-group"><span>스티커</span>{['♡','✿','☀'].map(value=><button type="button" key={value} className="sticker-choice" aria-pressed={sticker===value} onClick={()=>setSticker(value)}>{value}</button>)}</div>
        <button className="primary a-wide" disabled={!note.trim()}>쪽지 붙이기</button>
      </form>}
      <small className="postit-footer-note">실제 사용자에게 전달되지 않으며, XP·코인은 지급되지 않아요.</small>
    </section></div>}
    {notice && <div className="a-toast" role="status">{notice}</div>}
  </div>;
}

if (import.meta.env.DEV) createRoot(document.getElementById('root')).render(<APreview />);
else document.getElementById('root').textContent = '개발 환경에서만 제공됩니다.';
