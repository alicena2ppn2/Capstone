import UiIcon from './UiIcon.jsx';
import { useState } from 'react';
import { DECOR, DECOR_SLOTS } from '../../../shared/data/decor.js';
import { RoomBackdrop } from '../screens/Home.jsx';
import { Scenery } from './HouseDecor.jsx';
import GarmentPattern from '../../../shared/art/GarmentPattern.jsx';
import Mochi from './Mochi.jsx';

// 집 꾸미기 (방 꾸미기 게임처럼): 위에 내 방이 고정돼 있고, 아이템을 누르면 바로 방에 놓아 본다.
// 사기·배치·빼기는 미리보기 아래 한 줄에서만. 카드에는 그림·이름·가격(또는 상태)만.
const SLOT_ICON = { wallpaper: '🧱', floor: '🪵', sofa: '🛋️', drawer: '🗄️', lamp: '💡', carpet: '🟫', frame: '🖼️', doll: '🧸', scenery: '🌅' };

export default function DecorShop({ game, level, onBuy, onEquip, outfit }) {
  const [category, setCategory] = useState('all');
  const [message, setMessage] = useState('');
  const owned = game.ownedDecor ?? [];
  const equipped = game.decor ?? {};
  const [preview, setPreview] = useState(null);
  const item = DECOR.find(entry => entry.id === preview);
  const shownDecor = item ? { ...equipped, [item.slot]: item.id } : equipped;
  const has = item && owned.includes(item.id), active = item && equipped[item.slot] === item.id;
  const locked = item && !has && level < item.level, short = item && !has && game.coins < item.price;
  const act = () => {
    if (!item) return;
    if (has) { onEquip(item.slot, active ? null : item.id); setMessage(active ? `${item.name}을 뺐어요.` : `${item.name}을 놓았어요!`); if (active) setPreview(null); }
    else { Promise.resolve(onBuy(item.id)).then(() => onEquip(item.slot, item.id)); setMessage(`${item.name}을 사서 바로 놓았어요!`); }
  };
  const list = DECOR.filter(entry => category === 'all' || (category === 'owned' ? owned.includes(entry.id) : entry.slot === category));
  return <div className="decor-studio">
    <div className="decor-stage">
      <div className="decor-stage-room"><RoomBackdrop decor={shownDecor} homeScene /><div className="decor-stage-friend"><Mochi variant={game.character ?? 'potato'} full width={62} height={65} outfit={outfit} label="내 친구" /></div></div>
      <div className="decor-stage-bar" aria-live="polite">
        {item ? <>
          <div><strong>{item.name}</strong><small>{DECOR_SLOTS[item.slot]} · {has ? (active ? '놓여 있어요' : '가지고 있어요') : locked ? `LV.${item.level}부터 살 수 있어요` : `${item.price} 코인`}</small></div>
          <div className="decor-stage-actions">
            <button type="button" className="pb ui-secondary" onClick={() => setPreview(null)}>취소</button>
            <button type="button" className={`pb ${has && active ? 'ui-secondary' : 'shop-buy'}`} disabled={locked || short} onClick={act}>{has ? (active ? '빼기' : '놓기') : locked ? `LV.${item.level}` : short ? `${item.price - game.coins}코인 부족` : <span className="price-tag"><UiIcon kind="coin" size={16} /> {item.price}</span>}</button>
          </div>
        </> : <div>{message && <small>{message}</small>}</div>}
      </div>
    </div>
    <div className="decor-categories" role="tablist" aria-label="꾸미기 분류">{[['all', '전체', '✨'], ...Object.entries(DECOR_SLOTS).map(([id, label]) => [id, label, SLOT_ICON[id] ?? '•']), ['owned', `내 소품 ${owned.length}`, '🎒']].map(([id, label, icon]) => <button type="button" role="tab" className="pb" key={id} aria-selected={category === id} aria-pressed={category === id} onClick={() => setCategory(id)}><span aria-hidden="true">{icon}</span> {label}</button>)}</div>
    {!list.length ? <p className="shop-empty">아직 모은 소품이 없어요.</p> : <div className="decor-tiles">{list.map(entry => {
      const mine = owned.includes(entry.id), placed = equipped[entry.slot] === entry.id, lock = !mine && level < entry.level;
      return <button type="button" key={entry.id} className={`pb decor-tile${preview === entry.id ? ' is-selected' : ''}${lock ? ' is-locked' : ''}`} aria-pressed={preview === entry.id} aria-label={`${entry.name}, ${placed ? '놓여 있음' : mine ? '보유' : lock ? `레벨 ${entry.level} 필요` : `${entry.price}코인`}`} onClick={() => setPreview(preview === entry.id ? null : entry.id)}>
        <span className="decor-tile-art" style={{ background: `${entry.color}44` }}>{entry.slot === 'scenery' ? <svg viewBox="124 160 120 170" aria-hidden="true"><Scenery item={entry} /></svg> : ['wallpaper', 'floor'].includes(entry.slot) ? <svg className="decor-swatch" viewBox="0 0 60 60" aria-hidden="true"><GarmentPattern outfit={entry} id={`sw-${entry.id}`} /><rect width="60" height="60" rx="10" fill={`url(#sw-${entry.id})`} /></svg> : ['sofa', 'drawer'].includes(entry.slot) ? <svg className="decor-swatch" viewBox="0 0 60 60" aria-hidden="true"><rect x="6" y="14" width="48" height="34" rx="8" fill={entry.color} stroke={entry.ink} strokeWidth="3" /></svg> : <span aria-hidden="true">{entry.icon}</span>}</span>
        <span className="decor-tile-name">{entry.name}</span>
        <span className={`decor-tile-state${placed ? ' is-placed' : mine ? ' is-owned' : ''}`}>{placed ? '✓ 놓임' : mine ? '보유' : lock ? `🔒 LV.${entry.level}` : <span className="price-tag"><UiIcon kind="coin" size={12} /> {entry.price}</span>}</span>
      </button>;
    })}</div>}
  </div>;
}
