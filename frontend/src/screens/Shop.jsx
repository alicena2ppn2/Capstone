import { useState } from 'react';
import Mochi from '../components/Mochi.jsx';
import { CHARACTERS } from '../utils/game.js';

export const CLOTHES = [
  { id: 'sky', name: '하늘빛 맨투맨', price: 120, color: '#A8D3F4', trim: '#5285B5', motif: 'cloud' },
  { id: 'berry', name: '딸기 우유 티셔츠', price: 180, color: '#F7B8CC', trim: '#C46C89', motif: 'heart' },
  { id: 'leaf', name: '새싹 산책복', level: 3, price: 220, color: '#B9DDA5', trim: '#709D58', motif: 'leaf' },
  { id: 'star', name: '별빛 잠옷', level: 5, price: 300, color: '#D4C2F0', trim: '#9577C0', motif: 'star' },
];

export default function Shop({ game, level, onBuyCharacter, onEquipCharacter, petColor, coins, owned, outfit, onBuy, onWear, onBack }) {
  const [preview, setPreview] = useState(outfit);
  const [tab, setTab] = useState('all');
  const [message, setMessage] = useState('');
  const [section, setSection] = useState('characters');
  const [collection, setCollection] = useState(false);
  const items = tab === 'owned' ? CLOTHES.filter((item) => owned.includes(item.id)) : CLOTHES;
  const selected = CLOTHES.find((item) => item.id === preview);

  return (
    <section className="shop-screen" aria-labelledby="shop-title">
      <header className="shop-header">
        <button type="button" className="pb settings-back" onClick={onBack} aria-label="홈으로 돌아가기">←</button>
        <h1 id="shop-title">모찌 상점</h1>
        <span className="shop-wallet" aria-label={`보유 코인 ${coins}`}><span aria-hidden="true">●</span> {coins.toLocaleString('ko-KR')}</span>
      </header>
      <div className="shop-tabs"><button type="button" className="pb" aria-pressed={section === 'characters'} onClick={() => setSection('characters')}>캐릭터</button><button type="button" className="pb" aria-pressed={section === 'clothes'} onClick={() => setSection('clothes')}>의상</button></div>
      {section === 'characters' ? <>
        <div className="character-current"><Mochi color={petColor} full width={130} height={130} /><div><span>현재 함께하는 캐릭터</span><strong>{CHARACTERS.find((item) => item.id === game.character)?.name ?? '꼬질 감자 모찌'}</strong><span>사용자 LV.{level} · 선택은 언제나 자유롭게</span></div></div>
        <div className="shop-tabs"><button type="button" className="pb" aria-pressed={!collection} onClick={() => setCollection(false)}>모든 캐릭터</button><button type="button" className="pb" aria-pressed={collection} onClick={() => setCollection(true)}>내 컬렉션 {game.characters.length}</button></div>
        <p className="shop-hint">레벨업은 새로운 선택지를 열어요. 구매해도 자동 장착되지 않아요.</p>
        <div className="shop-grid">{CHARACTERS.filter((item) => !collection || game.characters.includes(item.id)).map((item) => {
          const has = game.characters.includes(item.id);
          const locked = !has && (level < item.level || item.method === 'quest');
          const active = game.character === item.id;
          return <article className={`shop-item${active ? ' is-preview' : ''}`} key={item.id}>
            {locked ? <><div className="character-mystery" aria-label="미공개 캐릭터">?</div><strong className="character-name">???</strong><span className="shop-price">LV.? · 잠겨 있어요</span><button type="button" className="pb shop-buy" disabled>아직 만날 수 없어요</button></> : <>
              <div className="shop-item-art"><Mochi variant={item.id} color={item.color} full width={110} height={110} /></div>
              <strong className="character-name">{item.name}</strong><span className="shop-price">{has ? active ? '현재 장착 중' : '보유 중' : `LV.${item.level} · ${item.price} 코인`}</span>
              {has ? <button type="button" className="pb shop-buy" disabled={active && item.id === 'potato'} onClick={() => { onEquipCharacter(active ? 'potato' : item.id); setMessage(active ? '기본 캐릭터로 돌아왔어요.' : `${item.name}을 장착했어요.`); }}>{active ? item.id === 'potato' ? '기본 캐릭터 장착 중' : '장착 해제' : '장착하기'}</button> : <button type="button" className="pb shop-buy" disabled={coins < item.price} onClick={() => { onBuyCharacter(item.id); setMessage(`${item.name}을 컬렉션에 추가했어요. 원할 때 장착해보세요!`); }}>{coins < item.price ? '코인이 부족해요' : '구매하기'}</button>}
            </>}
          </article>;
        })}</div>
      </> : <>
      <div className="shop-preview">
        <span className="shop-tag">오늘은 어떤 옷을 입을까?</span>
        <Mochi color={petColor} width={180} height={180} full outfit={selected} label="옷 미리보기 모찌" />
        <strong>{selected?.name ?? '포근한 기본 모찌'}</strong>
        <button type="button" className="pb shop-basic" onClick={() => { setPreview(null); onWear(null); setMessage('기본 모습으로 돌아왔어요.'); }}>기본 모습 입기</button>
      </div>
      <div className="shop-tabs" aria-label="상품 필터">
        <button type="button" className="pb" aria-pressed={tab === 'all'} onClick={() => setTab('all')}>모든 옷</button>
        <button type="button" className="pb" aria-pressed={tab === 'owned'} onClick={() => setTab('owned')}>내 옷장 <span>{owned.length}</span></button>
      </div>
      <p className="shop-hint">옷을 눌러 미리 입어보세요. 산책하면 코인도 모을 수 있어요!</p>
      <div className="shop-grid">
        {items.map((item) => {
          const has = owned.includes(item.id);
          const wearing = outfit === item.id;
          const locked = level < (item.level ?? 1);
          const insufficient = !has && coins < item.price;
          return (
            <article className={`shop-item${preview === item.id ? ' is-preview' : ''}`} key={item.id}>
              <button type="button" className="pb shop-item-preview" aria-label={`${item.name} 미리보기`} aria-pressed={preview === item.id} onClick={() => setPreview(item.id)}>
                <span className="shop-item-art" style={{ background: `${item.color}55` }}><Mochi color={petColor} width={110} height={104} full outfit={item} /></span>
                <strong>{item.name}</strong>
              </button>
              <span className="shop-price">{has ? (wearing ? '지금 입고 있어요' : '구매한 옷이에요') : `● ${item.price} 코인`}</span>
              <button type="button" className="pb shop-buy" disabled={wearing || insufficient || locked} onClick={() => {
                setPreview(item.id);
                if (has) { onWear(item.id); setMessage(`${item.name}을 입었어요!`); }
                else if (onBuy(item)) { setMessage(`${item.name} 구매 완료! 옷장에서 입어보세요.`); }
              }}>{locked ? `LV.${item.level} 해금` : wearing ? '착용 중 ✓' : has ? '입기' : insufficient ? '코인이 부족해요' : '구매하기'}</button>
            </article>
          );
        })}
      </div>
      {items.length === 0 && <div className="shop-empty">옷장이 아직 비어 있어요.<br />마음에 드는 첫 번째 옷을 골라보세요!</div>}
      </>}
      <p className="shop-message" role="status">{message}</p>
      <p className="shop-disclaimer">컬렉션과 성장 기록은 이 브라우저에 저장돼요. 브라우저 데이터 삭제 시 초기화됩니다.</p>
    </section>
  );
}
