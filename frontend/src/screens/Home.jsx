import Mochi from '../components/Mochi.jsx';
import SeoulClock from '../components/SeoulClock.jsx';
import HouseDecor from '../components/HouseDecor.jsx';
import { GearIcon, ShopIcon } from '../components/Icons.jsx';

export function RoomBackdrop({ decor = {}, wallColor = '#D6EAF8', floorColor = '#EBCDA6' }) {
  return (
    <svg width="100%" height="100%" viewBox="0 0 368 838" preserveAspectRatio="none" aria-hidden="true" style={{ position: 'absolute', inset: 0 }}>
      <rect x="0" y="0" width="368" height="430" fill={wallColor} />
      <g stroke="#C7DFF2" strokeWidth="10">
        <line x1="20" y1="0" x2="20" y2="430" /><line x1="60" y1="0" x2="60" y2="430" /><line x1="100" y1="0" x2="100" y2="430" />
        <line x1="268" y1="0" x2="268" y2="430" /><line x1="308" y1="0" x2="308" y2="430" /><line x1="348" y1="0" x2="348" y2="430" />
      </g>
      <rect x="114" y="150" width="140" height="190" rx="8" fill="#FFF6DD" stroke="#C9A982" strokeWidth="5" />
      <rect x="124" y="160" width="120" height="170" fill="#FDEFC3" />
      <circle cx="184" cy="236" r="34" fill="#FFF9E8" />
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
      <HouseDecor equipped={decor} />
    </svg>
  );
}

export default function Home({ petName = 'MOCHI', petColor, onQuest, onGuestbook, onVisit, onSettings, onShop, outfit, decor, active, reactionId, onReactionConsumed }) {
  return <section className="home-screen" aria-label="내 집">
    <div className="home-room">
      <RoomBackdrop decor={decor} />
      <header className="home-room-heading">
        <span>MY</span>
        <button type="button" className="pb pet-name-title" onClick={onSettings} aria-label={`${petName}, 이름 바꾸기`}>{petName}</button>
      </header>
      <SeoulClock />
      <nav className="home-room-menus" aria-label="보조 메뉴">
        <button type="button" className="pb" onClick={onSettings}><GearIcon size={22} />설정</button>
        <button type="button" className="pb" onClick={onShop}><ShopIcon width={22} height={22} />상점</button>
        <button type="button" className="pb" onClick={onVisit}>
          <svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true"><path d="M3 11 L12 3 L21 11 M6 9 V21 H18 V9 M10 21 V14 H14 V21" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" /></svg>방문하기
        </button>
        <button type="button" className="pb" onClick={onGuestbook}>
          <svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true"><path d="M5 3 H19 V16 L14 21 H5Z M14 21 V16 H19 M8 8 H16 M8 12 H15" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" /></svg>방명록
        </button>
      </nav>
      <div className="home-character">
        <Mochi color={petColor} width={210} height={200} full asleep={false} label={petName} outfit={outfit} interactive active={active} reactionId={reactionId} onReactionConsumed={onReactionConsumed} />
      </div>
    </div>
    <footer className="home-quest-actions">
      <button type="button" className="pb home-quest-start" onClick={onQuest}>오늘의 도전</button>
      <button type="button" className="pb home-decor-open" onClick={onShop}>꾸미기</button>
    </footer>
  </section>;
}
