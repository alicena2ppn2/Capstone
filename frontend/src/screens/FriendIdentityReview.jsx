import { useState } from 'react';
import IdentityReviewDrawing from '../../../shared/art/IdentityReviewDrawing.jsx';
import { IDENTITY_FRIENDS, IDENTITY_PLANS, IDENTITY_NOTES } from '../../../shared/data/identityReview.js';
import { RoomBackdrop } from './Home.jsx';
function Art({friend,plan,size}) {
  return <svg className="identity-art" data-friend={friend.id} data-plan={plan} width={size} height={size*1.05} viewBox="0 0 200 210" preserveAspectRatio="xMidYMid meet" role="img" aria-label={`${friend.name} ${plan}안`}><IdentityReviewDrawing variant={friend.id} revision={plan} /></svg>;
}
export default function FriendIdentityReview() {
  const [mode,setMode]=useState('character'),[friendId,setFriendId]=useState(IDENTITY_FRIENDS[0].id),[plan,setPlan]=useState('B'),[size,setSize]=useState(200),[scene,setScene]=useState('plain');
  const current=IDENTITY_FRIENDS.find(friend=>friend.id===friendId);
  const rows=mode==='character'?IDENTITY_PLANS.map(item=>({friend:current,plan:item.id})):IDENTITY_FRIENDS.map(friend=>({friend,plan}));
  return <main className="friend-preview identity-review">
    <h1>친구 개성 A/B/C 비교</h1><p>A는 현재 원본, B는 눈·표정, C는 B에 체형·기본 자세를 조정한 정적 시안입니다. 승인본·의상·모션·게임 데이터에는 적용하지 않습니다.</p><a href="?preview=friends">기존 의상·반응 미리보기로</a>
    <div className="identity-toolbar" aria-label="비교 방식"><button className="pb" aria-pressed={mode==='character'} onClick={()=>setMode('character')}>캐릭터별 A/B/C</button><button className="pb" aria-pressed={mode==='plan'} onClick={()=>setMode('plan')}>같은 안의 6종</button>
      {mode==='character'?<label>친구 <select aria-label="비교 친구" value={friendId} onChange={e=>setFriendId(e.target.value)}>{IDENTITY_FRIENDS.map(friend=><option key={friend.id} value={friend.id}>{friend.name}</option>)}</select></label>:<label>안 <select aria-label="비교 안" value={plan} onChange={e=>setPlan(e.target.value)}>{IDENTITY_PLANS.map(item=><option key={item.id} value={item.id}>{item.id} · {item.name}</option>)}</select></label>}
      <label>크기 <select aria-label="비교 크기" value={size} onChange={e=>setSize(Number(e.target.value))}>{[[200,'확대 200px'],[180,'홈 180px'],[110,'상점 110px'],[64,'프로필 64px'],[40,'프로필 40px']].map(([value,name])=><option key={value} value={value}>{name}</option>)}</select></label>
      <label>배경 <select aria-label="비교 배경" value={scene} onChange={e=>setScene(e.target.value)}><option value="plain">같은 파스텔 배경</option><option value="room">실제 홈 방 배경</option></select></label>
    </div>
    <section className="identity-grid" aria-label={mode==='character'?`${current.name} A/B/C`:`${plan}안 친구 6종`}>
      {rows.map(({friend,plan:revision})=><article className="friend-preview-card identity-card" key={`${friend.id}:${revision}`} data-review={`${friend.id}:${revision}`}><h2>{friend.name} · {revision}안</h2><span className="friend-draft-label">{IDENTITY_PLANS.find(item=>item.id===revision).name}</span>
        <div className={`identity-stage${scene==='room'?' is-room':''}`}>{scene==='room'&&<RoomBackdrop homeScene />}<div className="identity-pet"><Art friend={friend} plan={revision} size={size}/></div></div>
        <p>{revision==='A'?'현재 원본 그대로':revision==='B'?IDENTITY_NOTES[friend.id].B:`${IDENTITY_NOTES[friend.id].B}. ${IDENTITY_NOTES[friend.id].C}`}</p>
      </article>)}
    </section>
    <h2>작은 크기 확인 · {mode==='character'?current.name:`${plan}안 6종`}</h2><div className="identity-small-grid">{rows.map(({friend,plan:revision})=><article className="friend-preview-card" key={`small-${friend.id}:${revision}`}><h3>{friend.name} · {revision}안</h3><div className="identity-small">{[110,64,40].map(value=><figure key={value}><Art friend={friend} plan={revision} size={value}/><figcaption>{value}px</figcaption></figure>)}</div></article>)}</div>
  </main>;
}
