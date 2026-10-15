import { useEffect, useId, useRef, useState } from 'react';
import GarmentPattern from '../../../shared/art/GarmentPattern.jsx';
import { DECOR, MOVABLE_SLOTS } from '../../../shared/data/decor.js';
import DailySentence from '../components/DailySentence.jsx';
import RoomTimeProps from '../components/RoomTimeProps.jsx';
import useRoomNow from '../components/useRoomNow.js';
import { roomTime } from '../../../shared/utils/roomTime.js';
import UiIcon from '../components/UiIcon.jsx';
import HomeSummary from '../components/HomeSummary.jsx';
import Mochi from '../components/Mochi.jsx';
import HouseDecor from '../components/HouseDecor.jsx';
import { levelFor } from '../../../shared/features/game.js';
import { GearIcon, ShopIcon } from '../components/Icons.jsx';

const MOVE_LIMIT = 160;   // 서버와 같은 한도 (방 밖으로 안 나가게)
const SHEET_PEEK = 40;   // styles.css의 --sheet-peek와 같게

// rugDrop: 키 큰 화면에서 캐릭터를 내린 만큼 바닥 러그·카페트도 같이 내린다 (방 그림 좌표)
export function RoomBackdrop({ decor = {}, wallColor = '#D6EAF8', floorColor = '#EBCDA6', homeScene = false, now, positions = {}, arrange = false, onMoveEnd, rugDrop = 0 }) {
  const time = now ? roomTime(now) : null;
  const uid = useId().replace(/[^a-zA-Z0-9]/g, '');
  const wall = DECOR.find(item => item.id === decor.wallpaper), floor = DECOR.find(item => item.id === decor.floor);
  const sofa = DECOR.find(item => item.id === decor.sofa), drawer = DECOR.find(item => item.id === decor.drawer);
  // 끌어서 옮기기: 화면 좌표 이동을 방 그림 좌표로 바꿔 더한다
  const svg = useRef(null), drag = useRef(null);
  const [live, setLive] = useState(null);   // 끄는 중인 소품의 임시 위치
  const shown = live ? { ...positions, [live.slot]: live.pos } : positions;
  const clamp = v => Math.max(-MOVE_LIMIT, Math.min(MOVE_LIMIT, v));
  const grab = (slot, event) => {
    if (!arrange || !MOVABLE_SLOTS.includes(slot)) return;
    event.preventDefault(); event.currentTarget.setPointerCapture?.(event.pointerId);
    const ctm = svg.current.getScreenCTM();
    drag.current = { slot, x: event.clientX, y: event.clientY, scale: ctm ? 1 / ctm.a : 1, base: positions[slot] ?? { dx: 0, dy: 0 } };
    setLive({ slot, pos: drag.current.base });
  };
  const move = event => { const d = drag.current; if (!d) return; setLive({ slot: d.slot, pos: { dx: clamp(d.base.dx + (event.clientX - d.x) * d.scale), dy: clamp(d.base.dy + (event.clientY - d.y) * d.scale) } }); };
  const drop = () => { const d = drag.current; if (!d) return; drag.current = null; const pos = live?.pos ?? d.base; setLive(null); onMoveEnd?.(d.slot, { dx: Math.round(pos.dx), dy: Math.round(pos.dy) }); };
  return (
    <svg ref={svg} width="100%" height="100%" viewBox={homeScene ? '0 55 368 500' : '0 0 368 838'} preserveAspectRatio={homeScene ? 'xMidYMid meet' : 'none'} aria-hidden={arrange ? undefined : 'true'} style={{ position: 'absolute', inset: 0, touchAction: arrange ? 'none' : undefined }}
      className={arrange ? 'room-arranging' : undefined} onPointerMove={move} onPointerUp={drop} onPointerCancel={drop}>
      {wall && <GarmentPattern outfit={wall} id={`wall${uid}`} />}{floor && <GarmentPattern outfit={floor} id={`floor${uid}`} />}
      <rect x="0" y="0" width="368" height="454" fill={wall ? `url(#wall${uid})` : wallColor} />
      {!wall && <g stroke="#C7DFF2" strokeWidth="10">
        <line x1="20" y1="0" x2="20" y2="454" /><line x1="60" y1="0" x2="60" y2="454" /><line x1="100" y1="0" x2="100" y2="454" />
        <line x1="268" y1="0" x2="268" y2="454" /><line x1="308" y1="0" x2="308" y2="454" /><line x1="348" y1="0" x2="348" y2="454" />
      </g>}
      <rect x="114" y="150" width="140" height="190" rx="8" fill="#FFF6DD" stroke="#C9A982" strokeWidth="5" />
      <rect x="124" y="160" width="120" height="170" fill={time?.night ? '#344461' : '#D7ECF8'} />
      {time?.night ? <g><path d="M213 176 C192 172 183 201 207 208 C195 198 199 183 213 176Z" fill="#FFF3CC" /><path d="M142 179 v6 m-3 -3 h6 M226 212 v6 m-3 -3 h6 M163 216 v5 m-2.5 -2.5 h5" stroke="#FFF3CC" strokeWidth="1.5" /></g> : <g><circle cx="157" cy="190" r="17" fill="#FFF1B6" /><path d="M157 168 v-4 M157 212 v4 M135 190 h-4 M179 190 h4" stroke="#FFF1B6" strokeWidth="2" /></g>}
      <line x1="184" y1="160" x2="184" y2="330" stroke="#C9A982" strokeWidth="4" />
      <line x1="124" y1="245" x2="244" y2="245" stroke="#C9A982" strokeWidth="4" />
      <path d="M104 146 C112 200 112 280 122 346 L104 346 Z" fill="#FFF3E2" stroke="#E2CDB3" strokeWidth="3" />
      <path d="M264 146 C256 200 256 280 246 346 L264 346 Z" fill="#FFF3E2" stroke="#E2CDB3" strokeWidth="3" />
      <rect x="96" y="140" width="176" height="9" rx="4" fill="#C9A982" />
      {/* 벽 선반 두 개(달력 뒤·시계 아래)와 위의 소품: 살짝 아래로 */}<g transform="translate(0 22)">
      <rect x="8" y="232" width="78" height="9" rx="3" fill="#C9A982" />
      <rect x="18" y="206" width="20" height="26" rx="4" fill="#F7C9A8" stroke="#C99773" strokeWidth="2" />
      <path d="M28 206 C20 194 22 186 28 184 C34 186 36 194 28 206Z" fill="#8CCB8F" stroke="#5E9E62" strokeWidth="2" />
      <rect x="48" y="214" width="9" height="18" fill="#9CC7EC" /><rect x="58" y="210" width="9" height="22" fill="#F4B4C4" /><rect x="68" y="216" width="9" height="16" fill="#F6DE92" />
      <rect x="282" y="232" width="78" height="9" rx="3" fill="#C9A982" />
      <rect x="296" y="212" width="24" height="20" rx="5" fill="#FFFFFF" stroke="#9CC7EC" strokeWidth="2.5" />
      <path d="M320 216 c8 0 8 12 0 12" fill="none" stroke="#9CC7EC" strokeWidth="2.5" />
      <rect x="330" y="202" width="20" height="30" rx="4" fill="#C9E6C2" stroke="#7FB277" strokeWidth="2" />
      </g>
      {/* 벽을 조금 높이고 바닥을 줄였다 (바닥선 430→454). 소파·서랍장은 바닥 쪽으로 조금 더 내리고, 고른 색으로 */}<g transform="translate(0 36)"><path d="M18 360 h70 a10 10 0 0 1 10 10 v52 h-90 v-52 a10 10 0 0 1 10 -10z" fill={sofa?.color ?? '#A9CBEB'} stroke={sofa?.ink ?? '#7FA9D1'} strokeWidth="3" />
      <rect x="4" y="390" width="22" height="40" rx="8" fill={sofa?.color ?? '#A9CBEB'} stroke={sofa?.ink ?? '#7FA9D1'} strokeWidth="3" />
      <rect x="282" y="372" width="74" height="58" rx="6" fill={drawer?.color ?? '#E9C9A0'} stroke={drawer?.ink ?? '#C49E73'} strokeWidth="3" />
      <line x1="282" y1="400" x2="356" y2="400" stroke={drawer?.ink ?? '#C49E73'} strokeWidth="2.5" />
      <circle cx="319" cy="388" r="3" fill={drawer?.ink ?? '#C49E73'} /><circle cx="319" cy="414" r="3" fill={drawer?.ink ?? '#C49E73'} /></g>
      <rect x="0" y="454" width="368" height="384" fill={floor ? `url(#floor${uid})` : floorColor} />
      {!floor && <g stroke="#DDB98C" strokeWidth="2.5">
        <line x1="0" y1="486" x2="368" y2="486" /><line x1="0" y1="560" x2="368" y2="560" /><line x1="0" y1="650" x2="368" y2="650" /><line x1="0" y1="750" x2="368" y2="750" />
        <line x1="120" y1="454" x2="120" y2="486" /><line x1="260" y1="486" x2="260" y2="560" /><line x1="80" y1="560" x2="80" y2="650" /><line x1="230" y1="650" x2="230" y2="750" />
      </g>}
      <rect x="0" y="450" width="368" height="8" fill="#C9A982" />
      <ellipse cx="184" cy="482" rx="166" ry="50" fill="#FFF8EE" stroke="#EADFCB" strokeWidth="3" transform={`translate(0 ${rugDrop})`} />
      <HouseDecor equipped={decor} night={time?.night} positions={{ ...shown, carpet: { dx: 0, dy: rugDrop } }} onGrab={arrange ? grab : undefined} />
      {time?.night && <rect width="368" height="838" fill="#344461" opacity=".09" />}
      {homeScene && time && <RoomTimeProps time={time} />}
    </svg>
  );
}

export default function Home({ game, day, petName = 'MOCHI', petColor, onQuest, onDiary, onGuestbook, onVisit, onSettings, onShop, outfit, decor, active, reactionId, onReactionConsumed, levelInfo, positions = {}, onMoveDecor }) {
  const lv = levelInfo ?? { level: levelFor(game.xp), xp_in_level: game.xp % 100, xp_for_level: 100 };   // 서버가 있으면 서버 레벨
  const now = useRoomNow();
  const time = roomTime(now);
  const [open, setOpen] = useState(false);
  const [arranging, setArranging] = useState(false);   // 가구 배치 모드: 전등·액자·인형을 끌어서 옮긴다
  const movable = MOVABLE_SLOTS.some(slot => decor?.[slot]);
  // 키 큰 휴대폰: 방 그림 아래 남는 높이의 3/4만큼 캐릭터·문구·러그를 내려 LV 막대와의 빈 바닥을 줄인다
  const screen = useRef(null), [drop, setDrop] = useState({ px: 0, units: 0 });
  useEffect(() => {
    const el = screen.current;
    if (!el || typeof ResizeObserver === 'undefined') return undefined;
    const observer = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect, avail = height - SHEET_PEEK;
      const roomWidth = Math.min(width, avail * 368 / 500), gap = Math.max(0, avail - roomWidth * 500 / 368);
      const px = Math.round(gap * .75);
      setDrop(old => old.px === px ? old : { px, units: roomWidth ? px * 368 / roomWidth : 0 });
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);
  const drag = useRef(null);
  // 손잡이를 위로 밀면 열고 아래로 내리면 닫는다. 누르기(마우스·터치·키보드·화면 읽기 프로그램)는 click으로 열고 닫기
  const dragged = useRef(false);
  const dragStart = event => { drag.current = event.clientY; dragged.current = false; };
  const dragEnd = event => { if (drag.current === null) return; const moved = event.clientY - drag.current; drag.current = null; if (Math.abs(moved) > 24) { dragged.current = true; setOpen(moved < 0); } };
  const toggle = () => { if (dragged.current) { dragged.current = false; return; } setOpen(value => !value); };
  // 방 그림 바깥(화면이 길 때 남는 부분)도 고른 벽지·바닥 색으로
  const floorItem = DECOR.find(item => item.id === decor?.floor), wallItem = DECOR.find(item => item.id === decor?.wallpaper);
  const floor = floorItem?.color ?? (time.night ? '#DBC1A2' : '#EBCDA6');
  return <section ref={screen} className="home-screen is-sheet-layout" aria-label="내 집" style={{ '--home-floor': floor, '--home-wall': wallItem?.color ?? '#D6EAF8', '--room-drop': `${drop.px}px` }}>
    <div className={`home-room has-daily-sentence${arranging ? ' is-arranging' : ''}`} style={{backgroundColor:floor}}>
      <div className="home-room-scenery"><RoomBackdrop decor={decor} homeScene now={now} positions={positions} arrange={arranging} onMoveEnd={onMoveDecor} rugDrop={drop.units} /></div>
      {arranging && <div className="arrange-bar" role="status"><span>전등·액자·인형을 끌어서 옮겨 보세요</span><button type="button" className="pb ui-primary" onClick={() => setArranging(false)}>완료</button></div>}
      <button type="button" className="pb home-settings" onClick={onSettings} aria-label="설정" title="설정"><GearIcon size={22} /></button>
      <time className="room-time-accessible" dateTime={now.toISOString()}>기기 현지 시간: {time.label}</time>
      <nav className="home-room-menus" aria-label="보조 메뉴">
        <button type="button" className="pb home-visit-button" onClick={onVisit} aria-label="이웃 방문과 방명록">
          <svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true"><path d="M3 11 L12 3 L21 11 M6 9 V21 H18 V9 M10 21 V14 H14 V21" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" /></svg>이웃 · 방명록
        </button>
        {movable && onMoveDecor && <button type="button" className="pb home-arrange-button" aria-pressed={arranging} onClick={() => { setArranging(value => !value); setOpen(false); }}><span aria-hidden="true">🛋️</span>배치</button>}
        <button type="button" className="pb home-diary-button" onClick={onDiary}><svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true"><path d="M6 3 H20 V21 H6Z M3 6 H8 M3 11 H8 M3 16 H8 M11 8 H17 M11 12 H17" fill="var(--color-surface)" stroke="var(--color-primary)" strokeWidth="1.7" strokeLinejoin="round" /></svg>일기</button>
      </nav>
      <button type="button" className="pb home-friend-name" onClick={onSettings} aria-label={`${petName}, 이름 바꾸기`}>{petName}</button>
      <div className="home-character">
        <Mochi color={petColor} width="100%" height="100%" full asleep={false} label={petName} outfit={outfit} interactive active={active} reactionId={reactionId} onReactionConsumed={onReactionConsumed} />
      </div>
      <div className="home-identity">
        <DailySentence now={now}/>
      </div>
    </div>
    <div className="home-character-level home-level-dock"><strong>LV.{lv.level}</strong><progress value={lv.xp_in_level} max={lv.xp_for_level} aria-label="다음 레벨까지 경험치" /><span>{lv.xp_in_level} / {lv.xp_for_level} XP</span></div>
    {open && <button type="button" className="home-sheet-scrim" aria-label="오늘의 도전 닫기" onClick={() => setOpen(false)} />}
    <div className={`home-sheet${open ? ' is-open' : ''}`}>
    <button type="button" className="home-sheet-handle" aria-expanded={open} aria-controls="home-sheet-body" onClick={toggle} onPointerDown={dragStart} onPointerUp={dragEnd} onPointerCancel={() => { drag.current = null; }}>
      <span className="home-sheet-grip" aria-hidden="true" /><span>{open ? '오늘의 도전 접기' : '오늘의 도전 펼치기'}</span>
    </button>
    <footer className="home-quest-actions">
      <button type="button" className="pb home-quest-start" onClick={onQuest}><svg width="24" height="24" viewBox="0 0 24 24" aria-hidden="true"><path d="M5 4 H19 V21 H5Z M9 2 H15 V6 H9Z M8 12 L10 14 L15 9 M8 18 H16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" strokeLinecap="round" /></svg><span>오늘의 도전</span></button>
      <button type="button" className="pb home-decor-open" onClick={onShop}><ShopIcon width={24} height={24} /><span>꾸미기</span></button>
    </footer>
    <div id="home-sheet-body" className="home-sheet-body" inert={!open}><HomeSummary game={game} day={day} onQuest={onQuest} refreshKey={active} /></div>
    </div>
  </section>;
}
