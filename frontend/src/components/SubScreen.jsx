import Mochi from './Mochi.jsx';
import { GearIcon, ShopIcon, StarIcon } from './Icons.jsx';
import { outline } from '../utils/color.js';

// 퀘스트·방명록 화면 공통 틀: 방 배경 + 상단 바 + 구름 제목 + 하단 바

function RoomBackdrop() {
  return (
    <svg width="390" height="844" viewBox="0 0 390 844" aria-hidden="true" style={{ position: 'absolute', left: 0, top: 0 }}>
      <rect x="0" y="0" width="390" height="844" fill="#D6EAF8" />
      <g stroke="#C7DFF2" strokeWidth="10">
        <line x1="20" y1="0" x2="20" y2="844" /><line x1="60" y1="0" x2="60" y2="844" />
        <line x1="330" y1="0" x2="330" y2="844" /><line x1="370" y1="0" x2="370" y2="844" />
      </g>
      <rect x="110" y="40" width="170" height="210" rx="8" fill="#FFF6DD" stroke="#C9A982" strokeWidth="5" />
      <rect x="120" y="50" width="150" height="190" fill="#FDEFC3" />
      <circle cx="195" cy="120" r="34" fill="#FFF9E8" />
      <path d="M98 36 C108 100 108 180 118 256 L98 256 Z" fill="#FFF3E2" stroke="#E2CDB3" strokeWidth="3" />
      <path d="M292 36 C282 100 282 180 272 256 L292 256 Z" fill="#FFF3E2" stroke="#E2CDB3" strokeWidth="3" />
      <rect x="0" y="120" width="70" height="8" rx="3" fill="#C9A982" />
      <rect x="12" y="96" width="18" height="24" rx="4" fill="#F7C9A8" stroke="#C99773" strokeWidth="2" />
      <path d="M21 96 C14 86 16 78 21 76 C26 78 28 86 21 96Z" fill="#8CCB8F" stroke="#5E9E62" strokeWidth="2" />
      <rect x="320" y="120" width="70" height="8" rx="3" fill="#C9A982" />
      <rect x="334" y="100" width="22" height="20" rx="5" fill="#FFFFFF" stroke="#9CC7EC" strokeWidth="2.5" />
      <rect x="0" y="770" width="390" height="74" fill="#EBCDA6" />
      <rect x="0" y="766" width="390" height="8" fill="#C9A982" />
      <rect x="0" y="0" width="390" height="844" fill="#FFFFFF" opacity="0.38" />
    </svg>
  );
}

const chip = (bg) => ({
  width: 36, height: 36, borderRadius: 9, background: bg, border: '2.5px solid #3A3A55',
  display: 'flex', alignItems: 'center', justifyContent: 'center', boxSizing: 'border-box',
});

function TopBar({ moon = 200, level = 1, onHome, backOnly = false }) {
  if (backOnly) return <div style={{ display: 'flex', alignItems: 'center', height: 48 }}>
    <button type="button" className="pb" aria-label="홈 화면으로 돌아가기" onClick={onHome} style={{ width: 44, height: 44, display: 'grid', placeItems: 'center', border: '1px solid #B9D7E8', borderRadius: 14, background: '#FFF9EE', color: '#596777' }}>
      <svg width="24" height="24" viewBox="0 0 24 24" aria-hidden="true"><path d="M15 5 L8 12 L15 19" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
    </button>
  </div>;
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 48 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
        <svg width="40" height="40" viewBox="0 0 40 40" aria-hidden="true">
          <path d="M24 4 C13 5 6 13 6 22 C6 31 13 37 22 37 C29 37 34 33 36 28 C30 30 22 28 18 22 C14 16 16 9 24 4Z" fill="#F7D35C" stroke="#C49A1E" strokeWidth="2.5" strokeLinejoin="round" />
          <path d="M30 6 V16 M25 11 H35" stroke="#3D7CC0" strokeWidth="3.5" strokeLinecap="round" />
        </svg>
        <span className="jua" style={{ fontSize: 18, color: '#FFFFFF', textShadow: outline('#3A3A55', 1.5, 2) }}>{moon}</span>
      </div>
      <div style={{ display: 'flex', gap: 6 }}>
        <button type="button" className="pb" aria-label="내 집으로 돌아가기" onClick={onHome} style={chip('#F6D365')}>
          <svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true"><path d="M3 11 L12 3 L21 11 M6 9 V21 H18 V9 M10 21 V14 H14 V21" fill="none" stroke="#3A3A55" strokeWidth="2.2" strokeLinejoin="round" strokeLinecap="round" /></svg>
        </button>
        {[1, 2, 3].map(index => <span key={index} style={chip('#8BD66B')} aria-hidden="true"><svg width="20" height="20" viewBox="0 0 20 20"><path d="M10 3 V17 M3 10 H17" stroke="#3A3A55" strokeWidth="4" strokeLinecap="round" /></svg></span>)}      </div>
      <span className="jua" style={{ width: 44, height: 40, borderRadius: '20px 20px 14px 14px', background: '#FFFFFF', border: '2.5px solid #3A3A55', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, color: '#3A3A55', boxSizing: 'border-box' }}>{level}</span>
    </div>
  );
}

function CloudTitle({ children, plain = false }) {
  return (
    <div style={{ position: 'relative', display: 'flex', justifyContent: 'center', alignItems: 'center', height: 76, marginTop: 4 }}>
      <svg width="250" height="70" viewBox="0 0 250 70" aria-hidden="true" style={{ position: 'absolute' }}>
        <path d="M30 60 C12 60 6 46 14 38 C6 28 16 14 30 18 C34 6 52 2 62 10 C72 0 92 2 98 12 C108 2 130 2 138 12 C148 2 168 4 172 14 C184 4 204 8 206 20 C222 16 238 28 232 40 C242 48 236 62 220 60 Z" fill="#FFFFFF" stroke="#9CC7EC" strokeWidth="3" />
      </svg>
      <StarIcon style={{ position: 'absolute', left: 70, top: 14 }} />
      <StarIcon style={{ position: 'absolute', right: 70, top: 14 }} />
      <h1 className="jua" style={{ position: 'relative', margin: 0, fontSize: plain ? 22 : 32, fontWeight: plain ? 700 : 400, color: plain ? '#2F6FB3' : '#8CCBF7', textShadow: plain ? 'none' : outline('#2F6FB3', 2.5, 4) }}>{children}</h1>
    </div>
  );
}

export const bottomBtn = {
  border: 0, background: 'transparent', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2,
  minWidth: 52, minHeight: 52, fontSize: 12, fontWeight: 700, color: '#2E2A3A',
};

function BottomBar({ petColor, onShop, onSettings }) {
  return (
    <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: 92, display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', padding: '0 14px 10px', boxSizing: 'border-box', zIndex: 3 }}>
      <button type="button" className="pb" onClick={onSettings} style={bottomBtn}><GearIcon size={28} />설정</button>
      <div style={{ width: 150, height: 84, overflow: 'hidden', display: 'flex', justifyContent: 'center' }}>
        <Mochi color={petColor} width={150} height={142} />
      </div>
      <button type="button" className="pb" onClick={onShop} style={bottomBtn}><ShopIcon width={30} height={28} />상점</button>
    </div>
  );
}

export default function SubScreen({ title, petColor, children, onShop, onSettings, onHome, level = 1, plainTitle = false, backOnly = false }) {
  return (
    <div className="sub-screen" style={{ position: 'relative', width: 390, height: 844, overflow: 'hidden', background: '#D6EAF8' }}>
      <RoomBackdrop />
      <div className="sub-screen-content" style={{ position: 'relative', zIndex: 2, padding: '14px 14px 0', boxSizing: 'border-box' }}>
        <TopBar level={level} onHome={onHome} backOnly={backOnly} />
        <CloudTitle plain={plainTitle}>{title}</CloudTitle>
        {children}
      </div>
      <BottomBar petColor={petColor} onShop={onShop} onSettings={onSettings} />
    </div>
  );
}
