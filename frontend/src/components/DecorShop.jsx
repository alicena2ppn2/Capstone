import { useState } from 'react';
import { DECOR, DECOR_SLOTS } from '../utils/decor.js';
import { RoomBackdrop } from '../screens/Home.jsx';
import { Scenery } from './HouseDecor.jsx';

export default function DecorShop({ game, level, onBuy, onEquip }) {
  const [category, setCategory] = useState('all');
  const [ownedOnly, setOwnedOnly] = useState(false);
  const [message, setMessage] = useState('');
  const owned = game.ownedDecor ?? [];
  const equipped = game.decor ?? {};
  const [preview, setPreview] = useState(null);
  const previewItem = DECOR.find(item => item.id === preview);
  const shownDecor = previewItem ? { ...equipped, [previewItem.slot]: previewItem.id } : equipped;
  return <>
    <div className="decor-preview"><RoomBackdrop decor={shownDecor} /><span>{previewItem ? `${previewItem.name} 미리보기` : '내 집 꾸미기'}</span></div>
    <div className="decor-categories" aria-label="꾸미기 분류">{[['all', '전체'], ...Object.entries(DECOR_SLOTS)].map(([id, label]) => <button type="button" className="pb" key={id} aria-pressed={category === id} onClick={() => setCategory(id)}>{label}</button>)}</div>
    <div className="shop-tabs"><button type="button" className="pb" aria-pressed={!ownedOnly} onClick={() => setOwnedOnly(false)}>모든 아이템</button><button type="button" className="pb" aria-pressed={ownedOnly} onClick={() => setOwnedOnly(true)}>내 소품 {owned.length}</button></div>
    <p className="shop-hint">구매 후 원하는 소품을 배치해요. 종류마다 하나씩, 언제든 바꿀 수 있어요.</p>
    <div className="shop-grid">{DECOR.filter(item => (category === 'all' || item.slot === category) && (!ownedOnly || owned.includes(item.id))).map(item => {
      const has = owned.includes(item.id);
      const locked = !has && level < item.level;
      const active = equipped[item.slot] === item.id;
      return <article className={`shop-item${active ? ' is-preview' : ''}`} key={item.id}>
        {locked ? <><div className="character-mystery">?</div><strong>???</strong><span className="shop-price">LV.? · 잠겨 있어요</span><button type="button" className="pb shop-buy" disabled>아직 만날 수 없어요</button></> : <>
          <button type="button" className="pb decor-item-preview" aria-label={`${item.name} 미리보기`} aria-pressed={preview === item.id} onClick={() => setPreview(item.id)}>
            {item.slot === 'scenery' ? <svg className="scenery-thumb" viewBox="124 160 120 170" aria-hidden="true"><Scenery item={item} /></svg> : <span className="decor-item-icon" style={{ background: `${item.color}55` }} aria-hidden="true">{item.icon}</span>}
            <strong>{item.name}</strong>
          </button>
          <span className="shop-price">{has ? active ? '배치 중' : '보유 중' : `LV.${item.level} · ${item.price} 코인`}</span>
          <button type="button" className="pb shop-buy" disabled={!has && game.coins < item.price} onClick={() => {
            if (has) { onEquip(item.slot, active ? null : item.id); setPreview(null); setMessage(active ? '기본 모습으로 돌아왔어요.' : `${item.name}을 배치했어요.`); }
            else { onBuy(item.id); setMessage(`${item.name}을 소품함에 추가했어요. 직접 배치해보세요!`); }
          }}>{has ? active ? '배치 해제' : '배치하기' : game.coins < item.price ? '코인이 부족해요' : '구매하기'}</button>
        </>}
      </article>;
    })}</div>
    {ownedOnly && !owned.length && <p className="shop-empty">아직 모은 소품이 없어요.</p>}
    <p className="shop-message" role="status">{message}</p>
  </>;
}
