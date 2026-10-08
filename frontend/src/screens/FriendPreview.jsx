import { useCallback, useState } from 'react';
import Mochi from '../components/Mochi.jsx';
import { CharacterContext } from '../components/CharacterContext.jsx';
import Home from './Home.jsx';
import { CLOTHES } from '../utils/clothes.js';
import { PROTOTYPE_FRIENDS } from '../utils/prototypeFriends.js';

export default function FriendPreview() {
  const [selected, setSelected] = useState(PROTOTYPE_FRIENDS[0].id);
  const [outfitId, setOutfitId] = useState(null);
  const [reaction, setReaction] = useState(null);
  const [sequence, setSequence] = useState(0);
  const [notice, setNotice] = useState('');
  const [roomWidth, setRoomWidth] = useState(390);
  const consume = useCallback(id => setReaction(value => value === id ? null : value), []);
  const celebrate = () => { setSequence(value => value + 1); setReaction(sequence + 1); };
  const friend = PROTOTYPE_FRIENDS.find(item => item.id === selected);
  const outfit = CLOTHES.find(item => item.id === outfitId);
  const chooseOutfit = id => { if (id !== outfitId && id !== null) celebrate(); setOutfitId(id); };
  const inspect = () => setNotice('이 화면은 디자인 미리보기예요. 실제 메뉴와 게임 데이터는 변경하지 않아요.');
  return <main className="friend-preview">
    <h1>새 친구 디자인 미리보기</h1><p>해금 레벨·가격 미정 · 실제 지급·구매·저장 없음</p><a href="/">게임으로 돌아가기</a>
    <h2>기본 모습 · 터치해서 인사하기</h2>
    <div className="friend-preview-grid">{PROTOTYPE_FRIENDS.map(item => <article key={item.id} className="friend-preview-card">
      <Mochi variant={item.id} width={200} height={210} full label={item.name} interactive active />
      <h3>{item.name}</h3><p>{item.introduction}</p><p>{item.personality}<br />좋아하는 것: {item.likes}<br />작은 습관: {item.habit}</p>
      <button className="pb" aria-pressed={selected === item.id} onClick={() => { setSelected(item.id); setReaction(null); }}>방에서 보기</button>
    </article>)}</div>
    <h2>기존 의상 4종 비교</h2>
    {PROTOTYPE_FRIENDS.map(item => <section key={item.id}><h3>{item.name}</h3><div className="friend-preview-outfits">{CLOTHES.map(clothing => <figure key={clothing.id}><Mochi variant={item.id} full width={160} height={168} outfit={clothing} label={`${item.name}, ${clothing.name}`} /><figcaption>{clothing.name}</figcaption></figure>)}</div></section>)}
    <h2>홈 크기 · 상점 카드 · 작은 프로필</h2>
    <div className="friend-preview-controls"><label>화면 폭 <select value={roomWidth} onChange={event => setRoomWidth(Number(event.target.value))}>{[360,390,430].map(size => <option key={size} value={size}>{size}px</option>)}</select></label><label>의상 <select value={outfitId ?? ''} onChange={event => chooseOutfit(event.target.value || null)}><option value="">기본 모습</option>{CLOTHES.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label><button className="pb" onClick={celebrate}>완료 성공 반응 시연</button></div>
    <p role="status">{notice}</p>
    <div className="friend-preview-comparison">
      <div className="friend-preview-room home-preview-frame" style={{ width: roomWidth, maxWidth: '100%' }}>
        <CharacterContext.Provider value={selected}><Home game={{ xp: 0, completed: [], started: [] }} petName={friend.name} petColor={friend.color} outfit={outfit} active reactionId={reaction} onReactionConsumed={consume} onQuest={celebrate} onShop={inspect} onSettings={inspect} onVisit={inspect} onGuestbook={inspect} onDiary={inspect} /></CharacterContext.Provider>
      </div>
      <div className="shop-screen"><article className="shop-item friend-preview-shop"><div className="shop-item-art"><Mochi variant={selected} full width={110} height={110} outfit={outfit} label={friend.name} /></div><strong className="character-name">{friend.name}</strong><span className="shop-price">레벨·가격 미정</span><details className="ui-disclosure"><summary>친구 소개</summary><p>{friend.introduction}</p></details><button className="pb" disabled>디자인 검토 중</button></article><p>작은 프로필 40 / 64px</p><Mochi variant={selected} width={40} height={42} label={friend.name} /><Mochi variant={selected} width={64} height={67} label={friend.name} /></div>
    </div>
  </main>;
}
