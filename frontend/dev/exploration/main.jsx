import React, { memo, useCallback, useEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import Mochi from '../../src/components/Mochi.jsx';
import { CHARACTERS } from '../../../shared/data/characters.js';
import { colors } from '../../../shared/theme/tokens.js';
import { PLACES, POLICY, ROUTE, distance, pointAt, arrival, confirmVisit, claimExample, emptyState } from './model.mjs';
import './style.css';

const KEY = 'my-mochi.dev.exploration.v1';
const labels = { A: '모찌와 동네 탐험', B: '오늘의 작은 외출', C: '동네 포스트잇' };
const freshFix = (p, offset = 0) => ({ ...p, accuracy: 8, timestamp: Date.now() + offset });
function readPreview() {
  try { const data = JSON.parse(sessionStorage.getItem(KEY)); return Object.fromEntries(['A','B','C'].map(k => [k, data?.[k]?.visits && data[k].claims && Array.isArray(data[k].notes) ? data[k] : emptyState()])); }
  catch { return { A: emptyState(), B: emptyState(), C: emptyState() }; }
}
const MapBase = memo(function MapBase() {
  return <svg className="map-art" preserveAspectRatio="none" viewBox="0 0 600 560" aria-hidden="true"><rect width="600" height="560" fill="#F2F3DF"/><path d="M0 120 Q180 140 270 90 T600 130 V0 H0Z" fill="#DCECE3"/><path d="M0 450 Q100 350 190 420 T600 500 V560 H0Z" fill="#D5E7EC"/><path d="M-50 230 L680 340 M120 -20 L230 600 M400 -20 L350 600" stroke="#FFFEFA" strokeWidth="35" fill="none"/><path d="M-50 230 L680 340 M120 -20 L230 600 M400 -20 L350 600" stroke="#D8E2DC" strokeWidth="1.5" fill="none"/>
    {[ [55,55,80,80],[275,145,60,45],[465,160,80,80],[260,400,75,58],[40,290,75,55] ].map(([x,y,w,h],i)=><rect key={i} x={x} y={y} width={w} height={h} rx="14" fill="#E8DBC6" stroke="#D2C7B7"/>)}
    <path d={ROUTE.map((p,i)=>`${i?'L':'M'}${p.x} ${p.y}`).join(' ')} stroke="#86A9A1" strokeWidth="4" strokeDasharray="6 8" fill="none"/>
    <text x="300" y="40" textAnchor="middle" fill="#65736F" fontSize="20">모찌의 가상 동네</text><text x="300" y="530" textAnchor="middle" fill="#65736F" fontSize="16">가상 동네 · 실제 지도 아님</text>
  </svg>;
});
const Pins = memo(function Pins({ choose }) { return PLACES.map(p=><button key={p.id} className="pin" style={{left:p.x/6+'%',top:p.y/5.6+'%'}} onClick={()=>choose(p.id)} aria-label={`${p.name} 장소 보기`}><span aria-hidden="true">{p.id==='park'?'♧':p.id==='library'?'▤':'◇'}</span><small>{p.name}</small><i>메모 2</i></button>); });
function SampleMap({ fix, character, choose, compact = false }) {
  const [pan,setPan] = useState({x:0,y:0}),[follow,setFollow] = useState(true);
  const drag = useRef(null);
  const recenter=()=>{setFollow(true);setPan({x:0,y:0});};
  const offset = follow ? { x: Math.max(-60,Math.min(60,(300-fix.x)*.15)), y: Math.max(-30,Math.min(30,(280-fix.y)*.15)) } : pan;
  return <div className={`map ${compact?'compact':''}`} aria-label="가상 동네 예시 지도"><div className="map-viewport" onPointerDown={e=>{if(e.target.closest('button'))return;drag.current={x:e.clientX,y:e.clientY,base:offset};e.currentTarget.setPointerCapture(e.pointerId);}} onPointerMove={e=>{if(!drag.current)return;setFollow(false);setPan({x:drag.current.base.x+e.clientX-drag.current.x,y:drag.current.base.y+e.clientY-drag.current.y});}} onPointerUp={()=>{drag.current=null;}} onPointerCancel={()=>{drag.current=null;}}><div className="map-world" style={{transform:`translate(${offset.x}px,${offset.y}px)`}}><MapBase/><Pins choose={choose}/><div className="marker" style={{left:fix.x/6+'%',top:fix.y/5.6+'%'}}><Mochi variant={character} full width={62} height={65} active={false} label="예시 현재 위치의 모찌"/><b>나의 모찌</b></div></div></div><span className="map-caption">예시 지도 · 점선은 가상 이동 순서</span><button className="locate secondary" onClick={recenter}>{follow?'내 위치 ✓':'내 위치로 복귀'}</button><div className="map-pan"><button aria-label="지도 왼쪽 보기" onClick={()=>{setFollow(false);setPan(v=>({...v,x:v.x+40}));}}>←</button><button aria-label="지도 오른쪽 보기" onClick={()=>{setFollow(false);setPan(v=>({...v,x:v.x-40}));}}>→</button></div></div>;
}
const NoteList = memo(function NoteList({ place, notes, unlocked, onDelete }) {
  return <div className="notes"><p className="caption">샘플 글 · 실제 사용자가 쓴 글이 아니에요.</p>{place.notes.slice(0,unlocked?2:1).map((text,i)=><article className="sticky" key={i}><span>시연 메모</span><p>{text}</p></article>)}{!unlocked&&<p className="locked">도착 확인 후 나머지 메모와 작성을 열 수 있어요.</p>}{notes.filter(n=>n.place===place.id).map(n=><article className="sticky mine" key={n.id}><span>내 예시 글 · 이 브라우저에만 표시</span><p>{n.text}</p><button className="text-button" onClick={()=>onDelete(n.id)}>내 글 삭제</button></article>)}</div>;
});
function Detail({ place, state, update, fixes, now, notice }) {
  const [text,setText] = useState('');
  const visited=!!state.visits[place.id], claimed=!!state.claims[place.id], check=arrival(place,fixes,Math.max(now,Date.now()));
  const reward=place.reward;
  const remove=useCallback(id=>update(s=>({...s,notes:s.notes.filter(n=>n.id!==id)})),[update]);
  function add(e) { e.preventDefault(); if(!visited||!text.trim())return; const note={id:crypto.randomUUID(),place:place.id,text:text.trim()};update(s=>({...s,notes:[...s.notes,note]}));setText('');notice('이 브라우저의 시안에 메모를 남겼어요.'); }
  return <div className="place-detail"><span className="eyebrow">가상 공공장소 · {place.kind}</span><p>{place.intro}</p><p className="distance">직선거리 {Math.round(distance(fixes.at(-1),place))}m <span>예시 좌표 기준 · 보행 경로 아님</span></p><ol className="steps" aria-label="도착 단계"><li className="on">이동 중</li><li className={check.ok||visited?'on':''}>확인 가능</li><li className={visited?'on':''}>도착 확인</li><li className={claimed?'on':''}>예시 보상</li></ol><p role="status">{visited?'도착을 확인했어요.':check.text}</p>{!visited?<button className="primary confirm-arrival" disabled={!check.ok} onClick={()=>{update(s=>confirmVisit(s,place,fixes,Date.now()));}}>도착 확인</button>:<div className="reward"><div className="sticker" aria-hidden="true">✉</div><div><b>예시 보상</b><p>+{reward.coins} 코인 · +{reward.xp} XP</p><small>{reward.item}</small></div><button className="primary claim-reward" disabled={claimed} onClick={()=>{update(s=>claimExample(s,place));notice('시안 전용 보상을 확인했어요. 실제 재화는 바뀌지 않아요.');}}>{claimed?'확인 완료 ✓':'예시 보상 수령'}</button></div>}<small>장소별 1회 · 글을 쓰지 않아도 보상을 확인할 수 있어요.</small><h3>이곳의 포스트잇</h3><NoteList place={place} notes={state.notes} unlocked={visited} onDelete={remove}/>{visited&&<form onSubmit={add}><label htmlFor="note">내 예시 메모 (선택)</label><textarea id="note" maxLength={POLICY.noteLimit} value={text} onChange={e=>setText(e.target.value)} placeholder="이 장소에서 남기고 싶은 짧은 메모"/><small>{text.length}/{POLICY.noteLimit} · 사용자 간 전달 없음</small><button className="secondary add-note" disabled={!text.trim()}>예시 글 남기기</button></form>}<p className="caption">신고·차단은 정식 운영 시 서버와 함께 구현할 항목이에요. 이 시안은 신고를 접수하지 않아요.</p></div>;
}
function Sheet({ title, close, children }) {
  const ref=useRef(null), titleId=React.useId();
  useEffect(()=>{const previous=document.activeElement;const first=ref.current.querySelector('button');first?.focus({preventScroll:true});const onKey=e=>{if(e.key==='Escape'){e.preventDefault();close();}if(e.key==='Tab'){const list=[...ref.current.querySelectorAll('button:not(:disabled),textarea,a[href]')];if(!list.length)return;const end=e.shiftKey?list[0]:list.at(-1);if(document.activeElement===end){e.preventDefault();(e.shiftKey?list.at(-1):list[0]).focus();}}};document.addEventListener('keydown',onKey);return()=>{document.removeEventListener('keydown',onKey);previous?.focus?.({preventScroll:true});};},[close]);
  return <div className="sheet-overlay" onClick={e=>{if(e.target===e.currentTarget)close();}}><section ref={ref} className="sheet" role="dialog" aria-modal="true" aria-labelledby={titleId}><header><h2 id={titleId}>{title}</h2><button aria-label="상세 닫기" onClick={close}>×</button></header>{children}</section></div>;
}
function App() {
  const [variant,setVariant]=useState('A'),[data,setData]=useState(readPreview),[character,setCharacter]=useState('mochi');
  const [selected,setSelected]=useState(null),[sheet,setSheet]=useState(false),[tab,setTab]=useState('notes'),[running,setRunning]=useState(false),[progress,setProgress]=useState(0),[fixes,setFixes]=useState(()=>[freshFix(ROUTE[0],-1000),freshFix(ROUTE[0])]),[now,setNow]=useState(Date.now()),[quality,setQuality]=useState('good'),[notice,setNotice]=useState('');
  const noticeTimer=useRef(null), main=useRef(null);
  useEffect(()=>{for(const [key,value] of Object.entries(colors))document.documentElement.style.setProperty(`--${key}`,value);},[]);
  useEffect(()=>{try{sessionStorage.setItem(KEY,JSON.stringify(data));}catch{setNotice('시안 기록을 보관하지 못했어요. 현재 탭에서는 계속 체험할 수 있어요.');}},[data]);
  useEffect(()=>{const timer=setInterval(()=>setNow(Date.now()),1000);return()=>{clearInterval(timer);clearTimeout(noticeTimer.current);};},[]);
  useEffect(()=>{if(!running)return;const timer=setInterval(()=>setProgress(p=>{const n=Math.min(ROUTE.length-1,p+.08);if(n===ROUTE.length-1)setRunning(false);return n;}),700);return()=>clearInterval(timer);},[running]);
  useEffect(()=>{if(!running)return;setFixes(old=>[old.at(-1),freshFix(pointAt(progress))]);},[progress,running]);
  useEffect(()=>{const stop=()=>{if(document.hidden)setRunning(false);};document.addEventListener('visibilitychange',stop);return()=>document.removeEventListener('visibilitychange',stop);},[]);
  const message=useCallback(text=>{clearTimeout(noticeTimer.current);setNotice(text);noticeTimer.current=setTimeout(()=>setNotice(''),2500);},[]);
  const close=useCallback(()=>setSheet(false),[]);
  const choose=useCallback(id=>{setSelected(id);if(variant!=='B')setSheet(true);},[variant]);
  const update=useCallback(fn=>setData(old=>({...old,[variant]:fn(old[variant])})),[variant]);
  const place=PLACES.find(p=>p.id===selected), state=data[variant], adjusted=fixes.map(f=>({...f,accuracy:quality==='poor'?120:f.accuracy,timestamp:quality==='old'?Date.now()-60000:f.timestamp}));
  function reset(all=false){setRunning(false);setProgress(0);setFixes([freshFix(ROUTE[0],-1000),freshFix(ROUTE[0])]);setQuality('good');setSelected(null);setSheet(false);setNotice('');if(all)update(()=>emptyState());}
  function change(v){reset();setVariant(v);setTab('notes');main.current?.scrollTo(0,0);}
  function arrive(){const p=place??PLACES[0];setSelected(p.id);setRunning(false);setFixes([freshFix(p,-1000),freshFix(p)]);if(variant!=='B')setSheet(true);message('예시 위치를 선택 장소로 이동했어요. 아직 보상은 지급되지 않아요.');}
  const detail=place&&<Detail key={`${variant}-${place.id}`} place={place} state={state} update={update} fixes={adjusted} now={now} notice={message}/>;
  return <div className="prototype"><header className="app-header"><div><b>MY MOCHI</b><small>탐험 비교 · 개발 전용</small></div><span className="caption">가상 위치만 사용</span></header><><nav className="variants" aria-label="비교 시안">{Object.entries(labels).map(([id,title])=><button key={id} aria-pressed={variant===id} onClick={()=>change(id)}><b>{id}안</b><small>{id==='A'?'지도 탐험':id==='B'?'목적지 선택':'포스트잇'}</small></button>)}</nav><div className="mode-bar"><span>예시 위치 · 실제 GPS 아님</span><label>동행 <select aria-label="시안 캐릭터" value={character} onChange={e=>setCharacter(e.target.value)}>{CHARACTERS.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select></label></div></><main ref={main} inert={sheet?true:undefined}>
    <>
    <div className="view-heading"><span className="eyebrow">{variant}안 · EXPERIENCE STUDY</span><h1>{labels[variant]}</h1><p>{variant==='A'?'어디든 천천히, 모찌와 둘러보기':variant==='B'?'가까운 곳 하나를 골라 작은 외출':'어떤 하루가 머물렀을까요?'}</p></div>
    {variant==='A'&&<><SampleMap key={variant} fix={fixes.at(-1)} character={character} choose={choose}/><div className="under-map"><b>주변의 작은 장소 3곳</b><p>장소를 누르면 소개와 포스트잇이 열려요.</p><div className="chips">{PLACES.map(p=><button className="secondary" key={p.id} onClick={()=>choose(p.id)}>{p.name}</button>)}</div></div></>}
    {variant==='B'&&(!place?<section className="destinations"><p className="caption">가상의 가까운 장소 · 걸리는 시간은 안내하지 않아요.</p>{PLACES.map(p=><button className="destination" key={p.id} onClick={()=>choose(p.id)}><span className="place-symbol">{p.kind==='공원'?'♧':p.kind==='공공 도서관'?'▤':'◇'}</span><span><b>{p.name}</b><small>{p.intro}</small><em>직선거리 {Math.round(distance(fixes.at(-1),p))}m · 예시</em></span><span>›</span></button>)}</section>:<><div className="destination-chosen"><b>{place.name}</b><button className="text-button" onClick={()=>{setSelected(null);setRunning(false);}}>다른 장소 고르기</button></div><SampleMap key={variant} compact fix={fixes.at(-1)} character={character} choose={choose}/>{detail}</>)}
    {variant==='C'&&<><nav className="view-tabs"><button aria-pressed={tab==='notes'} onClick={()=>setTab('notes')}>포스트잇 목록</button><button aria-pressed={tab==='map'} onClick={()=>setTab('map')}>지도에서 보기</button></nav>{tab==='map'?<SampleMap key={variant} fix={fixes.at(-1)} character={character} choose={choose}/>:<section className="post-feed"><p className="caption">시연 글 미리보기 · 작성자 위치나 경로는 공개하지 않아요.</p>{PLACES.map(p=><button key={p.id} className="post-preview" onClick={()=>choose(p.id)}><small>{p.name} · 가상 {p.kind}</small><p>“{p.notes[0]}”</p><span>{state.visits[p.id]?'도착 확인 ✓ · 메모 읽고 쓰기':'메모 1개 미리보기 · 도착 후 열기'} →</span></button>)}</section>}</>}
    <p className="caption safety-note">시안 전용: 예시 보상·메모는 실제 게임과 연결되지 않아요.</p></>
  </main><footer className="dev-controls" inert={sheet?true:undefined}><div><b>예시 이동 조작</b><small>반경 {POLICY.radius}m · 정확도 ≤{POLICY.maxAccuracy}m · 최근 {POLICY.maxAge/1000}초 (모두 시안값)</small></div><div className="control-row"><button className="primary" onClick={()=>setRunning(v=>!v)}>{running?'일시정지':'이동 시작'}</button><button className="secondary arrival-sim" onClick={arrive}>도착 상황 보기</button><button className="secondary reset" onClick={()=>{if(confirm(`${variant}안의 예시 방문·보상·글을 초기화할까요? 실제 게임은 바뀌지 않아요.`))reset(true);}}>초기화</button></div><label>측정 상황 <select aria-label="예시 측정 상황" value={quality} onChange={e=>setQuality(e.target.value)}><option value="good">정상</option><option value="poor">정확도 부족</option><option value="old">오래된 위치</option></select><small>현재 예시 정확도 {quality==='poor'?120:8}m</small></label></footer>{notice&&<div className="toast" role="status">{notice}</div>}{sheet&&place&&<Sheet title={place.name} close={close}>{detail}</Sheet>}</div>;
}
if(import.meta.env.DEV)createRoot(document.getElementById('root')).render(<App/>);
else document.getElementById('root').textContent='개발 환경에서만 제공됩니다.';
