import { useRef, useState } from 'react';
import Mochi from './Mochi.jsx';
import { CHARACTERS } from '../../../shared/features/game.js';
import { FRIEND_INTROS } from '../../../shared/data/catalog.js';
import { CHARACTER_STATUS, characterAvailability } from '../../../shared/features/finalFriends.js';

export default function CharacterShop({ game, level, collection, onBuy, onEquip, onMessage }) {
  const [welcome, setWelcome] = useState(null);
  const busy = useRef(false);
  const next = CHARACTERS.find(item => !item.method && !game.characters.includes(item.id) && item.level > level);
  const purchase = async item => {
    if (busy.current) return;
    busy.current = true;
    try {
      const result = await onBuy(item.id);
      if (result?.ok && result.changed) { setWelcome(item); onMessage(`${item.name}을 만났어요!`); }
      else onMessage(result?.ok ? '현재 레벨·코인·보유 상태를 확인해 주세요.' : '구매를 저장하지 못했어요. 다시 시도해 주세요.');
    } finally { busy.current = false; }
  };
  return <>{next && <p className="shop-hint">다음에 만날 친구: {next.name} · LV.{next.level}</p>}
    {welcome && <section className="character-welcome" aria-label="새 친구 환영"><Mochi variant={welcome.id} full width={100} height={105} label={welcome.name} /><div><strong>{welcome.name}</strong><p>새 친구가 컬렉션에 왔어요. 반가워요!</p><button className="pb ui-primary" onClick={() => { onEquip(welcome.id); setWelcome(null); }}>함께하기</button><button className="pb ui-secondary" onClick={() => setWelcome(null)}>나중에 함께하기</button></div></section>}
    <div className="shop-grid">{CHARACTERS.filter(item => !collection || game.characters.includes(item.id)).map(item => {
      const status = characterAvailability(game, item), has = status === 'owned' || status === 'active';
      const secret = !has && item.method === 'quest', intro = FRIEND_INTROS[item.id];
      return <article className={`shop-item${status === 'active' ? ' is-preview' : ''}${status === 'level' ? ' is-locked' : ''}`} key={item.id} data-character={item.id}>
        {status === 'level' && <span className="shop-lock-badge">LV.{item.level}</span>}
        {secret ? <><div className="character-mystery" aria-label="특별 비밀 친구">?</div><strong className="character-name">비밀 친구</strong><span className="shop-price">현실 행동 누적 10회</span><button className="pb shop-buy" disabled>도전으로 만나요</button></> : <>
          <div className="shop-item-art"><Mochi variant={item.id} color={item.color} full width={110} height={115.5} label={item.name} /></div>
          <strong className="character-name">{item.name}</strong><span className="shop-price">LV.{item.level} · {item.method ? '무료 보상' : `${item.price} 코인`}</span>
          <span className={`character-status is-${status}`}>{CHARACTER_STATUS[status]}</span>
          <span className="character-personality">{intro?.personality}</span>
          <details className="ui-disclosure"><summary>친구 소개</summary><p>{intro?.introduction}</p>{intro?.likes && <p>좋아하는 것: {intro.likes}<br />작은 습관: {intro.habit}</p>}</details>
          {status === 'active' ? <>{item.id !== 'potato' && <button className="pb ui-secondary" onClick={() => onEquip('potato')}>함께하기 해제</button>}</> : has ? <button className="pb shop-buy" onClick={() => onEquip(item.id)}>함께하기</button> : <button className="pb shop-buy" disabled={status !== 'available'} onClick={() => purchase(item)}>{status === 'level' ? `LV.${item.level}에서 만나요` : status === 'coins' ? `${(item.price - game.coins).toLocaleString('ko-KR')}코인 더 필요` : status === 'special' ? '성장 보상으로 만나요' : `${item.price} 코인에 만나기`}</button>}
        </>}
      </article>;
    })}</div></>;
}
