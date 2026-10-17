import React, { memo, useRef, useState } from 'react';
import Mochi from '../../src/components/Mochi.jsx';
import { PLACES, ROUTE } from './model.mjs';

const MapBase = memo(function MapBase() {
  return <svg className="map-art" preserveAspectRatio="none" viewBox="0 0 600 560" aria-hidden="true"><rect width="600" height="560" fill="#F4EFD9"/><path d="M0 120 Q180 140 270 90 T600 130 V0 H0Z" fill="#CDE8DE"/><path d="M0 450 Q100 350 190 420 T600 500 V560 H0Z" fill="#CDE5EC"/>
    <path d="M24 265 Q80 230 132 251 T232 277 Q260 325 228 375 T126 411 Q67 392 39 350Z" fill="#D6E9C8" stroke="#B7D7B4" strokeWidth="3"/><path d="M50 331 Q112 298 198 350" fill="none" stroke="#FFF9E9" strokeWidth="9" strokeLinecap="round"/><ellipse cx="171" cy="285" rx="24" ry="13" fill="#BFE0E7"/><path d="M159 286q12-9 24 0" fill="none" stroke="#F8FCF3" strokeWidth="2"/>
    <path d="M-50 230 L680 340 M120 -20 L230 600 M400 -20 L350 600" stroke="#FFFEFA" strokeWidth="35" fill="none"/><path d="M-50 230 L680 340 M120 -20 L230 600 M400 -20 L350 600" stroke="#D8E2DC" strokeWidth="1.5" fill="none"/>
    {[ [55,55,80,80,'#F1D4C6'],[275,145,60,45,'#E8D9C3'],[465,160,80,80,'#E8CFC5'],[260,400,75,58,'#E7D8B8'],[40,290,75,55,'#E8D2B8'] ].map(([x,y,w,h,color],i)=><rect key={i} x={x} y={y} width={w} height={h} rx="14" fill={color} stroke="#D2C7B7"/>)}
    {[[40,160,'#E9B6AE'],[540,288,'#D8C5EA'],[313,72,'#F0C776'],[276,470,'#E8AD9B']].map(([x,y,color],index)=><g key={index} transform={`translate(${x} ${y})`}><circle r="12" fill="#A9C99C"/><circle cx="-4" cy="-3" r="3" fill={color}/><circle cx="4" cy="-3" r="3" fill={color}/><circle cy="4" r="3" fill={color}/><circle r="2" fill="#FFF9E9"/></g>)}
    <path d={ROUTE.map((p,i)=>`${i?'L':'M'}${p.x} ${p.y}`).join(' ')} stroke="#FFF9E9" strokeWidth="9" strokeLinecap="round" strokeLinejoin="round" fill="none"/><path d={ROUTE.map((p,i)=>`${i?'L':'M'}${p.x} ${p.y}`).join(' ')} stroke="#D69279" strokeWidth="3.5" strokeDasharray="5 9" strokeLinecap="round" fill="none"/>
  </svg>;
});
const Pins = memo(function Pins({ choose, openNote, showNotes }) { return PLACES.map(p=><React.Fragment key={p.id}><button className="pin" style={{left:p.x/6+'%',top:p.y/5.6+'%'}} onClick={()=>choose(p.id)} aria-label={`${p.name} 장소 보기`}><span aria-hidden="true">{p.id==='park'?'♧':p.id==='library'?'▤':'◇'}</span><small>{p.name}</small><i>메모 2</i></button>{showNotes&&<button className="pin-note" style={{left:`calc(${p.x/6}% - 59px)`,top:p.y/5.6+'%'}} onClick={event=>openNote?.(p.id,event.currentTarget)} aria-label={`${p.name} 쪽지 열기 · 창작 샘플`}><span aria-hidden="true">✉</span></button>}</React.Fragment>); });

export default function SampleMap({ fix, character, choose, openNote, showNotes = false, compact = false }) {
  const [pan,setPan] = useState({x:0,y:0}),[follow,setFollow] = useState(true);
  const drag = useRef(null);
  const recenter=()=>{setFollow(true);setPan({x:0,y:0});};
  const offset = follow ? { x: Math.max(-60,Math.min(60,(300-fix.x)*.15)), y: Math.max(-30,Math.min(30,(280-fix.y)*.15)) } : pan;
  return <div className={`map ${compact?'compact':''}`} aria-label="가상 동네 예시 지도"><div className="map-viewport" onPointerDown={e=>{if(e.target.closest('button'))return;drag.current={x:e.clientX,y:e.clientY,base:offset};e.currentTarget.setPointerCapture(e.pointerId);}} onPointerMove={e=>{if(!drag.current)return;setFollow(false);setPan({x:drag.current.base.x+e.clientX-drag.current.x,y:drag.current.base.y+e.clientY-drag.current.y});}} onPointerUp={()=>{drag.current=null;}} onPointerCancel={()=>{drag.current=null;}}><div className="map-world" style={{transform:`translate(${offset.x}px,${offset.y}px)`}}><MapBase/><Pins choose={choose} openNote={openNote} showNotes={showNotes}/><div className="marker" style={{left:fix.x/6+'%',top:fix.y/5.6+'%'}}><Mochi variant={character} full width={62} height={65} active={false} label="예시 현재 위치의 모찌"/><b>나의 모찌</b></div></div></div><span className="map-caption">예시 지도 · 점선은 가상 이동 순서</span><button className="locate secondary" onClick={recenter}>{follow?'내 위치 ✓':'내 위치로 복귀'}</button><div className="map-pan"><button aria-label="지도 왼쪽 보기" onClick={()=>{setFollow(false);setPan(v=>({...v,x:v.x+40}));}}>←</button><button aria-label="지도 오른쪽 보기" onClick={()=>{setFollow(false);setPan(v=>({...v,x:v.x-40}));}}>→</button></div></div>;
}
