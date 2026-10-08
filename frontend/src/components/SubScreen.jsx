import ScreenHeader from './ScreenHeader.jsx';

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

export default function SubScreen({ title, children, onHome }) {
  return <section className="sub-screen">
    <RoomBackdrop />
    <div className="sub-screen-content">
      <ScreenHeader title={title} onBack={onHome} decorated={title === '오늘의 도전'} />
      {children}
    </div>
  </section>;
}