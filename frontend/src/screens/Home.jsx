import RoomTimeProps from '../components/RoomTimeProps.jsx';
import useRoomNow from '../components/useRoomNow.js';
import { roomTime } from '../utils/roomTime.js';
import UiIcon from '../components/UiIcon.jsx';
import HomeSummary from '../components/HomeSummary.jsx';
import Mochi from '../components/Mochi.jsx';
import HouseDecor from '../components/HouseDecor.jsx';
import { levelFor } from '../utils/game.js';
import { GearIcon, ShopIcon } from '../components/Icons.jsx';

export function RoomBackdrop({ decor = {}, wallColor = '#D6EAF8', floorColor = '#EBCDA6', homeScene = false, now }) {
  const time = now ? roomTime(now) : null;
  return (
    <svg width="100%" height="100%" viewBox={homeScene ? '0 55 368 500' : '0 0 368 838'} preserveAspectRatio={homeScene ? 'xMidYMid meet' : 'none'} aria-hidden="true" style={{ position: 'absolute', inset: 0 }}>
      <rect x="0" y="0" width="368" height="430" fill={wallColor} />
      <g stroke="#C7DFF2" strokeWidth="10">
        <line x1="20" y1="0" x2="20" y2="430" /><line x1="60" y1="0" x2="60" y2="430" /><line x1="100" y1="0" x2="100" y2="430" />
        <line x1="268" y1="0" x2="268" y2="430" /><line x1="308" y1="0" x2="308" y2="430" /><line x1="348" y1="0" x2="348" y2="430" />
      </g>
      <rect x="114" y="150" width="140" height="190" rx="8" fill="#FFF6DD" stroke="#C9A982" strokeWidth="5" />
      <rect x="124" y="160" width="120" height="170" fill={time?.night ? '#344461' : '#D7ECF8'} />
      {time?.night ? <g><path d="M213 176 C192 172 183 201 207 208 C195 198 199 183 213 176Z" fill="#FFF3CC" /><path d="M142 179 v6 m-3 -3 h6 M226 212 v6 m-3 -3 h6 M163 216 v5 m-2.5 -2.5 h5" stroke="#FFF3CC" strokeWidth="1.5" /></g> : <g><circle cx="157" cy="190" r="17" fill="#FFF1B6" /><path d="M157 168 v-4 M157 212 v4 M135 190 h-4 M179 190 h4" stroke="#FFF1B6" strokeWidth="2" /></g>}
      <line x1="184" y1="160" x2="184" y2="330" stroke="#C9A982" strokeWidth="4" />
      <line x1="124" y1="245" x2="244" y2="245" stroke="#C9A982" strokeWidth="4" />
      <path d="M104 146 C112 200 112 280 122 346 L104 346 Z" fill="#FFF3E2" stroke="#E2CDB3" strokeWidth="3" />
      <path d="M264 146 C256 200 256 280 246 346 L264 346 Z" fill="#FFF3E2" stroke="#E2CDB3" strokeWidth="3" />
      <rect x="96" y="140" width="176" height="9" rx="4" fill="#C9A982" />
      <rect x="8" y="232" width="78" height="9" rx="3" fill="#C9A982" />
      <rect x="18" y="206" width="20" height="26" rx="4" fill="#F7C9A8" stroke="#C99773" strokeWidth="2" />
      <path d="M28 206 C20 194 22 186 28 184 C34 186 36 194 28 206Z" fill="#8CCB8F" stroke="#5E9E62" strokeWidth="2" />
      <rect x="48" y="214" width="9" height="18" fill="#9CC7EC" /><rect x="58" y="210" width="9" height="22" fill="#F4B4C4" /><rect x="68" y="216" width="9" height="16" fill="#F6DE92" />
      <rect x="282" y="232" width="78" height="9" rx="3" fill="#C9A982" />
      <rect x="296" y="212" width="24" height="20" rx="5" fill="#FFFFFF" stroke="#9CC7EC" strokeWidth="2.5" />
      <path d="M320 216 c8 0 8 12 0 12" fill="none" stroke="#9CC7EC" strokeWidth="2.5" />
      <rect x="330" y="202" width="20" height="30" rx="4" fill="#C9E6C2" stroke="#7FB277" strokeWidth="2" />
      <path d="M18 360 h70 a10 10 0 0 1 10 10 v52 h-90 v-52 a10 10 0 0 1 10 -10z" fill="#A9CBEB" stroke="#7FA9D1" strokeWidth="3" />
      <rect x="4" y="390" width="22" height="40" rx="8" fill="#A9CBEB" stroke="#7FA9D1" strokeWidth="3" />
      <rect x="282" y="372" width="74" height="58" rx="6" fill="#E9C9A0" stroke="#C49E73" strokeWidth="3" />
      <line x1="282" y1="400" x2="356" y2="400" stroke="#C49E73" strokeWidth="2.5" />
      <circle cx="319" cy="388" r="3" fill="#C49E73" /><circle cx="319" cy="414" r="3" fill="#C49E73" />
      <rect x="0" y="430" width="368" height="408" fill={floorColor} />
      <g stroke="#DDB98C" strokeWidth="2.5">
        <line x1="0" y1="486" x2="368" y2="486" /><line x1="0" y1="560" x2="368" y2="560" /><line x1="0" y1="650" x2="368" y2="650" /><line x1="0" y1="750" x2="368" y2="750" />
        <line x1="120" y1="430" x2="120" y2="486" /><line x1="260" y1="486" x2="260" y2="560" /><line x1="80" y1="560" x2="80" y2="650" /><line x1="230" y1="650" x2="230" y2="750" />
      </g>
      <rect x="0" y="426" width="368" height="8" fill="#C9A982" />
      <ellipse cx="184" cy="482" rx="166" ry="50" fill="#FFF8EE" stroke="#EADFCB" strokeWidth="3" />
      <HouseDecor equipped={decor} night={time?.night} />
      {time?.night && <rect width="368" height="838" fill="#344461" opacity=".09" />}
      {homeScene && time && <RoomTimeProps time={time} />}
    </svg>
  );
}

export default function Home({ game, day, petName = 'MOCHI', petColor, onQuest, onDiary, onGuestbook, onVisit, onSettings, onShop, outfit, decor, active, reactionId, onReactionConsumed }) {
  const now = useRoomNow();
  const time = roomTime(now);
  return <section className="home-screen" aria-label="내 집">
    <div className="home-room">
      <RoomBackdrop decor={decor} homeScene now={now} />
      <button type="button" className="pb home-settings" onClick={onSettings} aria-label="설정" title="설정"><GearIcon size={22} /></button>
      <time className="room-time-accessible" dateTime={now.toISOString()}>기기 현지 시간: {time.label}</time>
      <nav className="home-room-menus" aria-label="보조 메뉴">
        <button type="button" className="pb home-visit-button" onClick={onVisit}>
          <svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true"><path d="M3 11 L12 3 L21 11 M6 9 V21 H18 V9 M10 21 V14 H14 V21" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" /></svg>방문하기
        </button>
        <button type="button" className="pb home-guestbook-button" onClick={onGuestbook}>
          <UiIcon kind="envelope" size={22} />방명록
        </button>
        <button type="button" className="pb home-diary-button" onClick={onDiary}><svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true"><path d="M6 3 H20 V21 H6Z M3 6 H8 M3 11 H8 M3 16 H8 M11 8 H17 M11 12 H17" fill="var(--color-surface)" stroke="var(--color-primary)" strokeWidth="1.7" strokeLinejoin="round" /></svg>일기</button>
      </nav>
      <div className="home-character">
        <Mochi color={petColor} width="100%" height="100%" full asleep={false} label={petName} outfit={outfit} interactive active={active} reactionId={reactionId} onReactionConsumed={onReactionConsumed} />
      </div>
      <div className="home-identity">
        <button type="button" className="pb pet-name-title home-nameplate" onClick={onSettings} aria-label={`${petName}, 이름 바꾸기`}>{petName}</button>
        <div className="home-character-level"><strong>LV.{levelFor(game.xp)}</strong><progress value={game.xp % 100} max={100} aria-label="다음 레벨까지 경험치" /><span>{game.xp % 100} / 100 XP</span></div>
      </div>
    </div>
    <footer className="home-quest-actions">
      <button type="button" className="pb home-quest-start" onClick={onQuest}><svg width="24" height="24" viewBox="0 0 24 24" aria-hidden="true"><path d="M5 4 H19 V21 H5Z M9 2 H15 V6 H9Z M8 12 L10 14 L15 9 M8 18 H16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" strokeLinecap="round" /></svg><span>오늘의 도전</span></button>
      <button type="button" className="pb home-decor-open" onClick={onShop}><ShopIcon width={24} height={24} /><span>꾸미기</span></button>
    </footer>
    <HomeSummary game={game} day={day} onQuest={onQuest} />
  </section>;
}
