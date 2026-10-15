import UiIcon from '../components/UiIcon.jsx';
import ScreenHeader from '../components/ScreenHeader.jsx';
import { useState } from 'react';
import Mochi from '../components/Mochi.jsx';
import { CHARACTERS } from '../../../shared/features/game.js';
import DecorShop from '../components/DecorShop.jsx';
import CharacterShop from '../components/CharacterShop.jsx';

import { CLOTHES } from '../../../shared/data/clothes.js';
export { CLOTHES } from '../../../shared/data/clothes.js';

export default function Shop({ serverMode = false, game, level, onBuyCharacter, onEquipCharacter, onBuyDecor, onEquipDecor, petColor, coins, owned, outfit, onBuy, onWear, onBack }) {
  const [preview, setPreview] = useState(outfit);
  const [tab, setTab] = useState('all');
  const [message, setMessage] = useState('');
  const [section, setSection] = useState('characters');
  const [collection, setCollection] = useState(false);
  const items = tab === 'owned' ? CLOTHES.filter((item) => owned.includes(item.id)) : CLOTHES;
  const selected = CLOTHES.find((item) => item.id === preview);

  return (
    <section className="shop-screen" aria-labelledby="shop-title">
      <ScreenHeader title="모찌 상점" titleId="shop-title" onBack={onBack}><span className="shop-wallet" aria-label={`보유 코인 ${coins}`}><UiIcon kind="coin" size={18} /> {coins.toLocaleString('ko-KR')}</span></ScreenHeader>
      <div className="shop-tabs"><button type="button" className="pb" aria-pressed={section === 'characters'} onClick={() => setSection('characters')}>캐릭터</button><button type="button" className="pb" aria-pressed={section === 'clothes'} onClick={() => setSection('clothes')}>의상</button><button type="button" className="pb" aria-pressed={section === 'decor'} onClick={() => setSection('decor')}>집 꾸미기</button></div>
      {section === 'characters' ? <>
        <div className="character-current"><Mochi color={petColor} full width={130} height={130} /><div><span>현재 함께하는 캐릭터</span><strong>{CHARACTERS.find((item) => item.id === game.character)?.name ?? '꼬질 감자 모찌'}</strong></div></div>
        <div className="shop-tabs"><button type="button" className="pb" aria-pressed={!collection} onClick={() => setCollection(false)}>모든 캐릭터</button><button type="button" className="pb" aria-pressed={collection} onClick={() => setCollection(true)}>내 컬렉션 {game.characters.length}</button></div>
        <CharacterShop game={game} level={level} collection={collection} onBuy={onBuyCharacter} onEquip={onEquipCharacter} onMessage={setMessage} />
      </> : section === 'decor' ? <DecorShop game={game} level={level} onBuy={onBuyDecor} onEquip={onEquipDecor} outfit={CLOTHES.find(item => item.id === outfit)} /> : <>
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
      <p className="shop-hint">옷을 눌러 미리 입어보세요. 퀘스트로 모은 코인으로 꾸며요!</p>
      <div className="shop-grid">
        {items.map((item) => {
          const has = owned.includes(item.id);
          const wearing = outfit === item.id;
          const locked = false;   // 옷은 레벨 제한 없이 코인으로만
          const insufficient = !has && coins < item.price;
          return (
            <article className={`shop-item${preview === item.id ? ' is-preview' : ''}${locked ? ' is-locked' : ''}`} key={item.id}>
              {locked && <span className="shop-lock-badge">LV.{item.level ?? 1}</span>}
              <button type="button" className="pb shop-item-preview" aria-label={`${item.name} 미리보기`} aria-pressed={preview === item.id} onClick={() => setPreview(item.id)}>
                <span className="shop-item-art" style={{ background: `${item.color}55` }}><Mochi color={petColor} width={110} height={104} full outfit={item} /></span>
                <strong>{item.name}</strong>
              </button>
              <span className="shop-price">{has ? (wearing ? '지금 입고 있어요' : '구매한 옷이에요') : `${item.price} 코인`}</span>
              <button type="button" className={`pb shop-buy${wearing ? ' is-equipped' : ''}`} disabled={wearing || insufficient || locked} onClick={() => {
                setPreview(item.id);
                if (has) { onWear(item.id); setMessage(`${item.name}을 입었어요!`); }
                else if (onBuy(item)) { setMessage(`${item.name} 구매 완료! 옷장에서 입어보세요.`); }
              }}>{locked ? `LV.${item.level} 해금` : wearing ? '착용 중 ✓' : has ? '입기' : insufficient ? `${(item.price - coins).toLocaleString('ko-KR')}코인 더 필요` : <span className="price-tag"><UiIcon kind="coin" size={16} /> {item.price}</span>}</button>
            </article>
          );
        })}
      </div>
      {items.length === 0 && <div className="shop-empty">옷장이 아직 비어 있어요.<br />마음에 드는 첫 번째 옷을 골라보세요!</div>}
      </>}
      <p className="shop-message" role="status">{message}</p>
      {!serverMode && <p className="shop-disclaimer">컬렉션과 성장 기록은 이 브라우저에 저장돼요. 브라우저 데이터 삭제 시 초기화됩니다.</p>}
    </section>
  );
}
