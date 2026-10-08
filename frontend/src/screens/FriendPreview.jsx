import { useState } from 'react';
import Baseline from '../components/PrototypeFriendBaseline.jsx';
import { CLOTHES } from '../utils/clothes.js';
import Mochi from '../components/Mochi.jsx';
import { RoomBackdrop } from './Home.jsx';
import { PROTOTYPE_FRIENDS } from '../utils/prototypeFriends.js';
const FRIENDS = [{ id: 'mochi', name: '구름 모찌' }, { id: 'lavender', name: '달빛 양 모찌' }, ...PROTOTYPE_FRIENDS];
export default function FriendPreview() {
  const [size, setSize] = useState(200);
  const [outfitId, setOutfitId] = useState('');
  const [reactionId, setReactionId] = useState(null);
  const outfit = CLOTHES.find(item => item.id === outfitId);
  const consume = () => setReactionId(null);
  return <main className="friend-preview friend-review">
    <h1>새 친구 의상·반응 비교</h1><p>승인된 기본 외형과 의상·반응을 비교합니다. 구매·지급·해금과 저장 데이터는 변경하지 않습니다.</p><a href="/">게임으로 돌아가기</a>
    <div className="friend-preview-controls"><label>표시 크기 <select value={size} onChange={event => setSize(Number(event.target.value))}>{[[200,'확대 200px'],[110,'상점 110px'],[64,'프로필 64px'],[40,'프로필 40px']].map(([value,label]) => <option key={value} value={value}>{label}</option>)}</select></label></div>
    <div className="friend-preview-controls"><label>의상 <select aria-label="미리보기 의상" value={outfitId} onChange={event => { setOutfitId(event.target.value); setReactionId(Date.now()); }}><option value="">기본 모습</option>{CLOTHES.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label><button className="pb" onClick={() => setReactionId(Date.now())}>축하 반응</button><span>캐릭터 클릭 또는 Enter·Space로 터치 반응</span></div>
    <h2>같은 배경 · 같은 표시 크기</h2><div className="friend-review-grid">{FRIENDS.map(item => <article key={item.id} className="friend-preview-card"><div className="friend-review-stage"><Mochi variant={item.id} outfit={outfit} interactive active reactionId={reactionId} onReactionConsumed={consume} full width={size} height={size * 1.05} label={item.name} /></div><h3>{item.name}</h3><p>{item.introduction ?? '기존 그림체 기준'}</p></article>)}</div>
    <h2>홈 크기의 방 배치</h2><div className="friend-review-grid">{FRIENDS.map(item => <article className="friend-preview-card" key={item.id}><div className="friend-review-room"><RoomBackdrop homeScene /><div className="friend-review-pet"><Mochi variant={item.id} outfit={outfit} full width="100%" height="100%" label={item.name} /></div></div><h3>{item.name}</h3></article>)}</div>
    <h2>상점 · 작은 프로필</h2><div className="friend-review-grid">{FRIENDS.map(item => <article key={item.id} className="friend-preview-card"><Mochi variant={item.id} outfit={outfit} full width={110} height={115.5} label={`${item.name}, 상점 크기`} /><h3>{item.name}</h3><div className="friend-review-small"><Mochi variant={item.id} outfit={outfit} full width={64} height={67.2} label={`${item.name}, 64px`} /><Mochi variant={item.id} outfit={outfit} full width={40} height={42} label={`${item.name}, 40px`} /></div></article>)}</div>
    <h2>승인된 기본 모습 / 현재 기본 모습</h2><div className="friend-review-grid">{PROTOTYPE_FRIENDS.map(item => <article className="friend-preview-card" key={item.id}><h3>{item.name}</h3><div className="friend-review-small"><figure><svg width="140" height="147" viewBox="0 0 200 210" data-baseline={item.id}><Baseline variant={item.id} /></svg><figcaption>승인된 기본</figcaption></figure><figure><Mochi variant={item.id} full width={140} height={147} /><figcaption>현재 기본</figcaption></figure></div></article>)}</div>
    <h2>모든 의상 · 체형별 비교</h2><div className="friend-review-grid">{PROTOTYPE_FRIENDS.map(item => <article className="friend-preview-card" key={item.id}><h3>{item.name}</h3><div className="friend-preview-outfits">{CLOTHES.map(clothes => <figure key={clothes.id}><Mochi variant={item.id} outfit={clothes} full width={140} height={147} /><figcaption>{clothes.name}</figcaption></figure>)}</div></article>)}</div>
  </main>;
}
