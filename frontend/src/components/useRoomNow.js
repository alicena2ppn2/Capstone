import { useEffect, useState } from 'react';
export default function useRoomNow() {
  const [now,setNow] = useState(()=>new Date());
  useEffect(()=>{const refresh=()=>setNow(new Date()); const timer=setInterval(refresh,1000); document.addEventListener('visibilitychange',refresh); window.addEventListener('focus',refresh); return()=>{clearInterval(timer);document.removeEventListener('visibilitychange',refresh);window.removeEventListener('focus',refresh);};},[]);
  return now;
}
