import { useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';
import * as Linking from 'expo-linking';
import { authClient } from './authClient';

export default function useMobileAuthEntry() {
  const [status,setStatus]=useState('checking'),[message,setMessage]=useState('');
  const lock=useRef(false),controller=useRef(null),mounted=useRef(true);
  useEffect(()=>{
    mounted.current=true; const check=new AbortController();controller.current=check;
    const verify=async url=>{
      try { await authClient.handleCallback?.(url); const session=await authClient.getSession({signal:check.signal});
        if(!check.signal.aborted&&mounted.current)setStatus(session?'authenticated':'signed-out');
      }catch{if(!check.signal.aborted&&mounted.current){setStatus('signed-out');setMessage('로그인 상태를 확인하지 못했어요. 다시 시도해 주세요.');}}
    };
    Linking.getInitialURL().then(verify).catch(()=>verify(null));
    const links=Linking.addEventListener('url',event=>{if(!lock.current)verify(event.url);});
    const refresh=state=>state==='active'?authClient.startRefresh?.():authClient.stopRefresh?.();
    refresh(AppState.currentState); const activity=AppState.addEventListener('change',refresh);
    const stop=authClient.subscribe?.(event=>{if(event==='SIGNED_OUT'&&!lock.current&&mounted.current)setStatus('signed-out');});
    return()=>{mounted.current=false;check.abort();controller.current?.abort();links.remove();activity.remove();stop?.();authClient.stopRefresh?.();};
  },[]);
  const signIn=async provider=>{
    if(lock.current)return; lock.current=true; const attempt=new AbortController();controller.current=attempt;
    setStatus('working');setMessage('Google 로그인 연결 중이에요…');
    try {await authClient.signIn(provider,{signal:attempt.signal});const session=await authClient.getSession({signal:attempt.signal});
      if(mounted.current&&!attempt.signal.aborted){setStatus(session?'authenticated':'signed-out');setMessage(session?'':'로그인을 완료하지 못했어요. 다시 시도해 주세요.');}
    }catch(error){if(mounted.current){setStatus('signed-out');setMessage(attempt.signal.aborted?'로그인을 취소했어요. 다시 시도할 수 있어요.':error.message||'로그인에 실패했어요. 다시 시도해 주세요.');}}
    finally{lock.current=false;}
  };
  const signOut=async()=>{
    if(lock.current)return {ok:false,message:'로그인 창을 닫은 뒤 다시 시도해 주세요.'};lock.current=true;
    try{await authClient.signOut();if(mounted.current){setStatus('signed-out');setMessage('');}return {ok:true};}
    catch(error){return {ok:false,message:error.message||'로그아웃하지 못했어요.'};}finally{lock.current=false;}
  };
  const cancel=()=>{controller.current?.abort();setMessage('로그인 취소 중…');};
  return {status,message,signIn,signOut,cancel,configured:authClient.configured};
}
