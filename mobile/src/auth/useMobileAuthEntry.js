import { useEffect, useState } from 'react';
import { AppState } from 'react-native';
import * as Linking from 'expo-linking';
import { authClient } from './authClient';
import { backendClient } from '../api/client';
import { createAuthBackendController } from '../../../shared/auth/authBackendController.mjs';
import { setTokenSource } from '../api/server';

export default function useMobileAuthEntry() {
  const [entry]=useState(()=>{const created=createAuthBackendController({client:authClient,backend:backendClient});setTokenSource(created.accessToken);return created;});   // 게임 API에 로그인 토큰을 붙이게 등록
  const [state,setState]=useState(entry.getSnapshot);
  useEffect(()=>{
    let active=true;entry.start();const unsubscribe=entry.subscribe(setState);
    const stop=authClient.subscribe?.((event,session)=>entry.authEvent(event,session));
    Linking.getInitialURL().then(url=>{if(active)void entry.restore(url);}).catch(()=>{if(active)void entry.restore();});
    const links=Linking.addEventListener('url',event=>{if(active)void entry.restore(event.url);});
    const refresh=status=>status==='active'?authClient.startRefresh?.():authClient.stopRefresh?.();
    refresh(AppState.currentState);const activity=AppState.addEventListener('change',refresh);
    return()=>{active=false;unsubscribe();stop?.();entry.stop();links.remove();activity.remove();authClient.stopRefresh?.();};
  },[entry]);
  return {...state,signIn:entry.signIn,signOut:entry.signOut,cancel:entry.cancel,retry:entry.retry,submitNickname:entry.submitNickname,requestUser:entry.requestUser,configured:entry.configured,backendConfigured:entry.backendConfigured};
}
