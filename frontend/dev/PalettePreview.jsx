import React from 'react';
import { createRoot } from 'react-dom/client';
import Mochi from '../src/components/Mochi.jsx';
import { CHARACTERS } from '../../shared/features/game.js';
import './palette-preview.css';

const friend = CHARACTERS.find(item => item.level === 4);
const palettes = [
  { id: 'warm-blue', name: '따뜻한 블루', note: '맑고 차분해서 선택과 주요 행동이 또렷해요.', primary: '#477698', soft: '#E9F1F6', hover: '#3F6D8B', pressed: '#345A74', border: '#7893A4' },
  { id: 'soft-pink', name: '차분한 핑크', note: '다정하고 포근한 인상을 살려요.', primary: '#A95473', soft: '#F6E9EE', hover: '#974965', pressed: '#7E3D55', border: '#A77989' },
  { id: 'honey-wood', name: '허니 우드 · 추천', note: '크림색 방과 나무 가구에 자연스럽게 이어져요.', primary: '#866338', soft: '#F2EBDD', hover: '#765632', pressed: '#624728', border: '#927B5D' },
  { id: 'powder-blue', name: '파우더 블루', note: '맑고 차분한 파스텔 블루', primary: '#B5D3E2', soft: '#EFF6F9', hover: '#A7C9DB', pressed: '#95BBD0', border: '#7997A7', onPrimary: '#354744' },
  { id: 'petal-pink', name: '페탈 핑크', note: '따뜻하고 부드러운 파스텔 핑크', primary: '#E3B3C0', soft: '#FBF0F3', hover: '#D8A4B4', pressed: '#C98C9F', border: '#A9828E', onPrimary: '#354744' },
  { id: 'lilac', name: '라일락 · 추천', note: '크림 바탕과 캐릭터 파스텔에 자연스럽게 어울리는 색', primary: '#C9B9D9', soft: '#F4F0F7', hover: '#BEACD0', pressed: '#AA96BF', border: '#92839F', onPrimary: '#354744' },
];

function LockMark() {
  return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 10h14v11H5zM8 10V7a4 4 0 0 1 8 0v3M12 14v3" /></svg>;
}

function Candidate({ palette, index }) {
  return <section className={`palette-candidate ${palette.id}`} style={{ '--color-primary': palette.primary, '--color-primary-soft': palette.soft, '--color-primary-hover': palette.hover, '--color-primary-pressed': palette.pressed, '--color-input-border': palette.border, '--color-on-primary': palette.onPrimary ?? '#FFFFFF' }}>
    <header className="candidate-heading">
      <span className="candidate-number">후보 {index + 1}</span>
      <h2>{palette.name}</h2>
      <p>{palette.note}</p>
    </header>
    <div className="palette-shop-head"><strong>모찌 상점</strong><span>보유 코인 <b>300</b></span></div>
    <div className="palette-tabs"><button type="button" aria-pressed="true">친구</button><button type="button" aria-pressed="false">옷</button><button type="button" aria-pressed="false">집 꾸미기</button></div>
    <article className="palette-friend-card">
      <span className="palette-lock-badge" aria-label="레벨 4에서 열려요"><LockMark /></span>
      <div className="palette-friend-art"><Mochi variant={friend.id} color={friend.color} full width={112} height={118} label={friend.name} /></div>
      <h3>{friend.name}</h3>
      <p className="friend-price">LV.4 · 300 코인</p>
      <span className="friend-state">레벨 미달</span>
      <details className="friend-intro"><summary>친구 소개</summary><p>느긋하고 다정한 곰 친구예요. 햇살 드는 창가와 따뜻한 차를 좋아해요.</p></details>
    </article>
    <div className="palette-actions"><button type="button" className="primary-action">오늘의 도전</button><button type="button" className="secondary-action">꾸미기</button></div>
    <div className="palette-swatches" aria-label="후보 색상"><i /><i /><i /></div>
  </section>;
}

function PalettePreview() {
  return <main className="palette-preview-page">
    <header className="preview-title"><span>MY MOCHI · 개발용 시안</span><h1>포인트 컬러 비교</h1><p>실제 앱 색상은 아직 바뀌지 않았어요. 같은 상점 카드에서 세 후보를 비교해 보세요.</p></header>
    <div className="palette-candidate-grid">{palettes.map((palette, index) => <Candidate key={palette.id} palette={palette} index={index} />)}</div>
  </main>;
}

createRoot(document.getElementById('palette-preview-root')).render(<PalettePreview />);
