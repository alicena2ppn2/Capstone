import { useEffect, useRef, useState } from 'react';
export default function useBriefFeedback() {
  const [feedback,setFeedback]=useState(null),timer=useRef(null),serial=useRef(0);
  useEffect(()=>()=>clearTimeout(timer.current),[]);
  const show=(text,error=false)=>{clearTimeout(timer.current);setFeedback({text,error,id:++serial.current});if(!error)timer.current=setTimeout(()=>setFeedback(null),1300);};
  return [feedback,show];
}
