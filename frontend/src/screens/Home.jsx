import { useEffect, useRef, useState } from 'react';
import Mochi from '../components/Mochi.jsx';
import { GearIcon, HeartIcon, ShopIcon } from '../components/Icons.jsx';
import { bottomBtn } from '../components/SubScreen.jsx';
import { darken, outline, PET_COLORS } from '../utils/color.js';

const clamp = (v) => Math.max(0, Math.min(100, v));

const ICONS = {
  food: 'M5 18 H39 C39 29 31 35 22 35 C13 35 5 29 5 18Z M10 18 C10 13 14 11 17 13 C19 9 25 9 27 13 C30 11 34 13 34 18',
  play: 'M7 20 a15 15 0 1 0 30 0 a15 15 0 1 0 -30 0Z M9 13 C16 18 28 18 35 13 M9 31 C16 26 28 26 35 31',
  clean: 'M1 30 a7 7 0 1 0 14 0 a7 7 0 1 0 -14 0Z M11 20 a9 9 0 1 0 18 0 a9 9 0 1 0 -18 0Z M27 30 a6 6 0 1 0 12 0 a6 6 0 1 0 -12 0Z M34 2 l2 4 4 2 -4 2 -2 4 -2 -4 -4 -2 4 -2Z',
  sleep: 'M27 5 C17 7 11 16 13 25 C15 33 24 37 32 34 C24 33 19 26 20 18 C21 12 24 8 27 5Z M34 10 l1.2 2.4 2.6.4-1.9 1.8.5 2.6-2.4-1.3-2.4 1.3.5-2.6-1.9-1.8 2.6-.4Z',
  walk: 'M12 14 C12 8 16 5 22 5 C28 5 32 8 32 14 V33 C32 35 31 36 29 36 H15 C13 36 12 35 12 33Z M12 18 H32 M17 24 H27 V30 H17Z M17 5 V3 M27 5 V3',
};

function RoomBackdrop() {
  return (
    <svg width="368" height="838" viewBox="0 0 368 838" aria-hidden="true" style={{ position: 'absolute', left: 0, top: 0 }}>
      <rect x="0" y="0" width="368" height="430" fill="#D6EAF8" />
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
      <rect x="0" y="430" width="368" height="408" fill="#EBCDA6" />
      <g stroke="#DDB98C" strokeWidth="2.5">
        <line x1="0" y1="486" x2="368" y2="486" /><line x1="0" y1="560" x2="368" y2="560" /><line x1="0" y1="650" x2="368" y2="650" /><line x1="0" y1="750" x2="368" y2="750" />
        <line x1="120" y1="430" x2="120" y2="486" /><line x1="260" y1="486" x2="260" y2="560" /><line x1="80" y1="560" x2="80" y2="650" /><line x1="230" y1="650" x2="230" y2="750" />
      </g>
      <rect x="0" y="426" width="368" height="8" fill="#C9A982" />
      <ellipse cx="184" cy="482" rx="166" ry="50" fill="#FFF8EE" stroke="#EADFCB" strokeWidth="3" />
    </svg>
  );
}

const roundIconBtn = {
  position: 'absolute', top: 16, width: 44, height: 44, borderRadius: '50%', border: 0, background: 'transparent',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
};

const bubble = {
  position: 'absolute', top: 74, width: 64, height: 64, borderRadius: '50%', background: '#FFFFFF',
  border: '2.5px solid #4B6E96', display: 'flex', alignItems: 'center', justifyContent: 'center', boxSizing: 'border-box',
};

const actionBtn = (bg, dark) => ({
  position: 'relative', height: 96, borderRadius: 22, border: `3px solid ${dark}`, background: bg, boxShadow: `0 5px 0 ${dark}`,
  display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 4,
});

function ActionButton({ b }) {
  return (
    <button type="button" className="pb" onClick={b.act} style={actionBtn(b.bg, b.dark)}>
      {b.badge && (
        <span className="jua" style={{ position: 'absolute', top: -10, right: -4, background: '#E5484D', color: '#FFFFFF', fontSize: 12, padding: '3px 8px', borderRadius: 999, border: '2px solid #FFFFFF' }}>치워줘!</span>
      )}
      <svg width="44" height="40" viewBox="0 0 44 40" aria-hidden="true">
        <path d={b.icon} fill="#FFFFFF" stroke="#3A3A55" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
      </svg>
      <span className="jua" style={{ fontSize: 18, color: '#FFFFFF', textShadow: outline('#3A3A55', 1.5) }}>{b.label}</span>
    </button>
  );
}

export default function Home({ petName = 'MOCHI', petColor, onPetColor, showStats = true }) {
  const [st, setSt] = useState({ hunger: 80, happy: 95, energy: 70, level: 3, mess: true, fed: false, asleep: false, steps: 7850, coins: 540 });
  const [msg, setMsg] = useState('');
  const [palOpen, setPalOpen] = useState(false);
  const timer = useRef(null);

  useEffect(() => () => clearTimeout(timer.current), []);

  const say = (text, patch) => {
    setSt((s) => ({ ...s, ...patch(s) }));
    setMsg(text);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setMsg(''), 2200);
  };

  const stats = [
    { label: '레벨', pct: 100, text: `Lv.${st.level}`, color: '#7FB6E8' },
    { label: '배부름', pct: st.hunger, color: '#F2A65A' },
    { label: '행복', pct: st.happy, color: '#F27BA0' },
    { label: '기운', pct: st.energy, color: '#F2CC4A' },
  ];

  const row1 = [
    { label: '밥 주기', icon: ICONS.food, bg: '#F59AB5', dark: '#C9587E',
      act: () => say('냠냠, 맛있다!', (s) => ({ hunger: clamp(s.hunger + 15), fed: true })) },
    { label: '놀아주기', icon: ICONS.play, bg: '#8BD66B', dark: '#4F9B3A',
      act: () => say('한 판 더 하자!', (s) => ({ happy: clamp(s.happy + 5), energy: clamp(s.energy - 10), asleep: false })) },
    { label: '치우기', icon: ICONS.clean, bg: '#7EC4F0', dark: '#3F86BA', badge: st.mess,
      act: () => say('개운해졌어!', () => ({ mess: false })) },
  ];
  const row2 = [
    { label: '재우기', icon: ICONS.sleep, bg: '#B79AF0', dark: '#7D5FC4',
      act: () => say('잘 자…', (s) => ({ asleep: true, energy: clamp(s.energy + 20) })) },
    { label: '산책 가기', icon: ICONS.walk, bg: '#F7D35C', dark: '#C49A1E',
      act: () => say('같이 나가볼까?', (s) => ({ asleep: false, steps: s.steps + 500, coins: s.coins + 5 })) },
  ];

  const stepPct = `${Math.min(100, st.steps / 100).toFixed(1)}%`;

  return (
    <div style={{ width: 390, height: 860, boxSizing: 'border-box', padding: 8, background: '#EDE6DE' }}>
      <div style={{ position: 'relative', width: '100%', height: '100%', boxSizing: 'border-box', border: '3px solid #A27E62', borderRadius: 34, overflow: 'hidden', background: '#D6EAF8' }}>
        <RoomBackdrop />

        <button type="button" className="pb" aria-label="설정" style={{ ...roundIconBtn, right: 14, zIndex: 3 }}>
          <GearIcon fill="#E8F4FF" />
        </button>

        <button type="button" className="pb" aria-label="떡 색 바꾸기" aria-expanded={palOpen} onClick={() => setPalOpen((o) => !o)} style={{ ...roundIconBtn, left: 14, zIndex: 5 }}>
          <svg width="30" height="30" viewBox="0 0 24 24" aria-hidden="true">
            <path d="M12 3 C6.5 3 3 7 3 11.5 C3 16 6.5 20 11 20 C12.5 20 13 19 12.5 17.8 C12 16.5 12.8 15.5 14 15.5 H16 C18.8 15.5 21 13.5 21 10.8 C21 6.5 17 3 12 3Z" fill="#E8F4FF" stroke="#3D7CC0" strokeWidth="1.8" strokeLinejoin="round" />
            <circle cx="7.5" cy="11" r="1.6" fill="#F59AB5" /><circle cx="10" cy="7" r="1.6" fill="#8BD66B" /><circle cx="14.5" cy="7" r="1.6" fill="#B79AF0" /><circle cx="17" cy="10.5" r="1.6" fill="#F7D35C" />
          </svg>
        </button>

        {palOpen && (
          <div style={{ position: 'absolute', top: 66, left: 12, right: 12, zIndex: 6, background: '#FFFFFF', border: '2.5px solid #4B6E96', borderRadius: 20, padding: 12, boxShadow: '0 6px 0 rgba(75,110,150,0.25)', display: 'flex', flexDirection: 'column', gap: 10 }}>
            <span className="jua" style={{ fontSize: 16 }}>떡 색 고르기</span>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: 'space-between' }}>
              {PET_COLORS.map((p) => {
                const on = p.hex.toLowerCase() === petColor.toLowerCase();
                return (
                  <button key={p.hex} type="button" className="pb"
                    aria-label={p.name + (on ? ' (선택됨)' : '')} aria-pressed={on}
                    onClick={() => { onPetColor(p.hex); setPalOpen(false); }}
                    style={{ width: 40, height: 40, borderRadius: '50%', background: p.hex, border: `3px solid ${darken(p.hex)}`, boxShadow: on ? '0 0 0 3px #FFFFFF, 0 0 0 5px #2E2A3A' : 'none' }} />
                );
              })}
            </div>
          </div>
        )}

        <div style={{ position: 'relative', zIndex: 2, height: '100%', display: 'flex', flexDirection: 'column', padding: '14px 12px 12px', boxSizing: 'border-box' }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', height: 96, justifyContent: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <HeartIcon fill="#9CD0F5" stroke="#3D7CC0" />
              <span className="jua" style={{ fontSize: 28, lineHeight: 1, color: '#E8F5FF', textShadow: outline('#3D7CC0', 2, 4) }}>MY</span>
              <HeartIcon fill="#9CD0F5" stroke="#3D7CC0" />
            </div>
            <span className="jua" style={{ fontSize: 50, lineHeight: 1.05, letterSpacing: '0.02em', color: '#E8F5FF', textShadow: outline('#3D7CC0', 3, 6) }}>{petName}</span>
          </div>

          {showStats && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 6, height: 44, marginTop: 6 }}>
              {stats.map((s) => (
                <div key={s.label} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}>
                  <span style={{ fontSize: 12, fontWeight: 700 }}>{s.label}</span>
                  <div style={{ position: 'relative', width: '100%', height: 22, borderRadius: 999, background: '#FFFFFF', border: '2px solid #4B6E96', boxSizing: 'border-box', overflow: 'hidden' }}>
                    <span style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: `${s.pct}%`, background: s.color }} />
                    <span className="jua" style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, color: '#FFFFFF', textShadow: outline('#2E3F5C', 1) }}>{s.text ?? `${s.pct}%`}</span>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div style={{ position: 'relative', flexGrow: 1 }}>
            {msg && (
              <div style={{ position: 'absolute', top: 16, left: '50%', transform: 'translateX(-50%)', background: '#FFFFFF', border: '2.5px solid #4B6E96', borderRadius: 16, padding: '8px 14px', fontSize: 15, fontWeight: 700, whiteSpace: 'nowrap', zIndex: 4 }}>{msg}</div>
            )}
            {!st.fed && (
              <div style={{ ...bubble, left: 22 }}>
                <svg width="38" height="26" viewBox="0 0 38 26" aria-hidden="true"><path d="M2 8 H36 C36 18 29 24 19 24 C9 24 2 18 2 8Z" fill="#DCEBF8" stroke="#4B6E96" strokeWidth="2.5" /><ellipse cx="19" cy="8" rx="17" ry="4" fill="#FFFFFF" stroke="#4B6E96" strokeWidth="2.5" /></svg>
              </div>
            )}
            {st.mess && (
              <div style={{ ...bubble, right: 22 }}>
                <svg width="34" height="30" viewBox="0 0 34 30" aria-hidden="true"><path d="M4 26 C1 26 1 20 5 19 C3 15 7 11 11 12 C11 7 15 4 19 6 C22 3 27 5 26 10 C30 11 31 16 28 18 C33 20 32 26 28 26Z" fill="#9C6B45" stroke="#6B4529" strokeWidth="2" /><circle cx="13" cy="19" r="2" fill="#FFFFFF" /><circle cx="21" cy="19" r="2" fill="#FFFFFF" /></svg>
                <span className="jua" style={{ position: 'absolute', top: -6, right: -6, width: 22, height: 22, borderRadius: '50%', background: '#E5484D', color: '#FFFFFF', fontSize: 15, display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px solid #FFFFFF' }}>!</span>
              </div>
            )}
            <div style={{ position: 'absolute', left: '50%', bottom: 8, transform: 'translateX(-50%)', width: 210, height: 200 }}>
              <Mochi color={petColor} width={210} height={200} full asleep={st.asleep} label={petName} />
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8, height: 40, marginTop: 4 }}>
            <svg width="46" height="34" viewBox="0 0 46 34" aria-hidden="true" style={{ flexShrink: 0, marginRight: -14, position: 'relative', zIndex: 1 }}>
              <path d="M4 26 C4 18 8 10 14 8 L20 14 C26 16 34 16 40 20 C44 22 44 28 40 28 L6 28 C4 28 4 27 4 26Z" fill="#FFFFFF" stroke="#3D7CC0" strokeWidth="2.5" strokeLinejoin="round" />
              <path d="M4 28 H42" stroke="#3D7CC0" strokeWidth="3" strokeLinecap="round" />
              <path d="M16 14 l4 -2 M19 18 l4 -2 M22 21 l4 -2" stroke="#3D7CC0" strokeWidth="2" strokeLinecap="round" />
            </svg>
            <div style={{ position: 'relative', flexGrow: 1, height: 32, borderRadius: 999, background: '#FFFFFF', border: '2.5px solid #4B6E96', boxSizing: 'border-box', overflow: 'hidden' }}>
              <span style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: stepPct, background: '#A8D3F4' }} />
              <span className="jua" style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, color: '#24507E' }}>{st.steps.toLocaleString('ko-KR')}</span>
            </div>
            <span style={{ fontSize: 13, fontWeight: 700, flexShrink: 0 }}>걸음 수</span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, height: 36, marginTop: 4 }}>
            <button type="button" className="pb" style={{ border: 0, background: 'transparent', display: 'flex', alignItems: 'center', gap: 4, minHeight: 36, padding: '0 4px', fontSize: 13, fontWeight: 700, color: '#2E2A3A' }}>
              <svg width="20" height="14" viewBox="0 0 20 14" fill="none" stroke="#2E2A3A" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M10 4 C10 1 13 1 13 3 C13 4.5 10 5 10 6 L2 12 H18 L10 6" /></svg>
              운동화로 옷 사기
            </button>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#FFFFFF', border: '2.5px solid #4B6E96', borderRadius: 999, padding: '3px 12px 3px 4px' }}>
              <svg width="22" height="22" viewBox="0 0 22 22" aria-hidden="true"><circle cx="11" cy="11" r="9.5" fill="#F7D35C" stroke="#C99A1E" strokeWidth="2" /><path d="M11 6 l1.5 3 3.2.4-2.3 2.2.6 3.2L11 13.3 8 14.8l.6-3.2-2.3-2.2 3.2-.4z" fill="#FFF3C2" /></svg>
              <span className="jua" style={{ fontSize: 18 }}>{st.coins.toLocaleString('ko-KR')}</span>
            </div>
            <span style={{ fontSize: 13, fontWeight: 700 }}>코인</span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 10, marginTop: 8, height: 96 }}>
            {row1.map((b) => <ActionButton key={b.label} b={b} />)}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '56px minmax(0, 1fr) minmax(0, 1fr) 56px', gap: 10, marginTop: 14, height: 96, alignItems: 'end' }}>
            <button type="button" className="pb" style={{ ...bottomBtn, minWidth: 0, minHeight: 56 }}><GearIcon />설정</button>
            {row2.map((b) => <ActionButton key={b.label} b={b} />)}
            <button type="button" className="pb" style={{ ...bottomBtn, minWidth: 0, minHeight: 56 }}><ShopIcon />상점</button>
          </div>
        </div>
      </div>
    </div>
  );
}
