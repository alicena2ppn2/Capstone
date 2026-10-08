import ScreenHeader from '../components/ScreenHeader.jsx';
import { useState } from 'react';
import Mochi from '../components/Mochi.jsx';
import { CHARACTERS } from '../utils/game.js';
import DecorShop from '../components/DecorShop.jsx';
import TargetButton from '../components/TargetButton.jsx';
import { FRIEND_INTROS } from '../utils/catalog.js';

import { CLOTHES } from '../utils/clothes.js';
export { CLOTHES } from '../utils/clothes.js';

export default function Shop({ game, level, onTarget, onBuyCharacter, onEquipCharacter, onBuyDecor, onEquipDecor, petColor, coins, owned, outfit, onBuy, onWear, onBack }) {
  const [preview, setPreview] = useState(outfit);
  const [tab, setTab] = useState('all');
  const [message, setMessage] = useState('');
  const [section, setSection] = useState('characters');
  const [collection, setCollection] = useState(false);
  const items = tab === 'owned' ? CLOTHES.filter((item) => owned.includes(item.id)) : CLOTHES;
  const selected = CLOTHES.find((item) => item.id === preview);

  return (
    <section className="shop-screen" aria-labelledby="shop-title">
      <ScreenHeader title="모찌 상점" titleId="shop-title" onBack={onBack}><span className="shop-wallet" aria-label={`보유 코인 ${coins}`}><span aria-hidden="true">●</span> {coins.toLocaleString('ko-KR')}</span></ScreenHeader>
      <div className="shop-tabs"><button type="button" className="pb" aria-pressed={section === 'characters'} onClick={() => setSection('characters')}>캐릭터</button><button type="button" className="pb" aria-pressed={section === 'clothes'} onClick={() => setSection('clothes')}>의상</button><button type="button" className="pb" aria-pressed={section === 'decor'} onClick={() => setSection('decor')}>집 꾸미기</button></div>
      {section === 'characters' ? <>
        <div className="character-current"><Mochi color={petColor} full width={130} height={130} /><div><span>현재 함께하는 캐릭터</span><strong>{CHARACTERS.find((item) => item.id === game.character)?.name ?? '꼬질 감자 모찌'}</strong></div></div>
        <div className="shop-tabs"><button type="button" className="pb" aria-pressed={!collection} onClick={() => setCollection(false)}>모든 캐릭터</button><button type="button" className="pb" aria-pressed={collection} onClick={() => setCollection(true)}>내 컬렉션 {game.characters.length}</button></div>
        <p className="shop-hint">레벨업은 새로운 선택지를 열어요. 구매해도 자동 장착되지 않아요.</p>
        <div className="shop-grid">{CHARACTERS.filter((item) => !collection || game.characters.includes(item.id)).map((item) => {
          const has = game.characters.includes(item.id);
          const locked = !has && (level < item.level || item.method === 'quest');
          const active = game.character === item.id;
          return <article className={`shop-item${active ? ' is-preview' : ''}`} key={item.id}>
            {locked && item.method === 'quest' ? <><div className="character-mystery" aria-label="특별 비밀 친구">?</div><strong className="character-name">비밀 친구</strong><span className="shop-price">날짜에 관계없이 현실 행동 누적 10회</span><button type="button" className="pb shop-buy" disabled>도전으로 만나요</button></> : <>
              <div className="shop-item-art"><Mochi variant={item.id} color={item.color} full width={110} height={110} /></div>
              <strong className="character-name">{item.name}</strong><span className="shop-price">{has ? active ? '현재 장착 중' : '보유 중' : `LV.${item.level} · ${item.price} 코인`}</span>
              <details className="ui-disclosure"><summary>친구 소개</summary><p>{FRIEND_INTROS[item.id].introduction}</p></details>
              {!item.method && <TargetButton game={game} kind="character" item={item} onTarget={onTarget} />}
              {has ? <button type="button" className={`pb shop-buy${active ? item.id === 'potato' ? ' is-equipped' : ' is-release' : ''}`} disabled={active && item.id === 'potato'} onClick={() => { onEquipCharacter(active ? 'potato' : item.id); setMessage(active ? '기본 캐릭터로 돌아왔어요.' : `${item.name}을 장착했어요.`); }}>{active ? item.id === 'potato' ? '기본 캐릭터 장착 중' : '장착 해제' : '장착하기'}</button> : <button type="button" className="pb shop-buy" disabled={locked || coins < item.price || !!item.method} onClick={() => { onBuyCharacter(item.id); setMessage(`${item.name}을 컬렉션에 추가했어요. 원할 때 장착해보세요!`); }}>{locked ? `LV.${item.level} 해금` : coins < item.price ? '코인이 부족해요' : '구매하기'}</button>}
            </>}
          </article>;
        })}</div>
      </> : section === 'decor' ? <DecorShop game={game} level={level} onTarget={onTarget} onBuy={onBuyDecor} onEquip={onEquipDecor} /> : <>
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
          const locked = !has && level < (item.level ?? 1);
          const insufficient = !has && coins < item.price;
          return (
            <article className={`shop-item${preview === item.id ? ' is-preview' : ''}`} key={item.id}>
              <button type="button" className="pb shop-item-preview" aria-label={`${item.name} 미리보기`} aria-pressed={preview === item.id} onClick={() => setPreview(item.id)}>
                <span className="shop-item-art" style={{ background: `${item.color}55` }}><Mochi color={petColor} width={110} height={104} full outfit={item} /></span>
                <strong>{item.name}</strong>
              </button>
              <span className="shop-price">{has ? (wearing ? '지금 입고 있어요' : '구매한 옷이에요') : `LV.${item.level ?? 1} · ${item.price} 코인`}</span>
              <TargetButton game={game} kind="clothes" item={item} onTarget={onTarget} />
              <button type="button" className={`pb shop-buy${wearing ? ' is-equipped' : ''}`} disabled={wearing || insufficient || locked} onClick={() => {
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
