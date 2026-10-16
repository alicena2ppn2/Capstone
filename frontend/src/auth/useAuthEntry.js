import { useEffect, useState } from 'react';
import { authClient } from './authClient.js';
import { backendClient } from '../api/client.js';
import { createAuthBackendController } from '../../../shared/auth/authBackendController.mjs';
import { setTokenSource } from '../api/missions.js';

export default function useAuthEntry(client=authClient,backend=backendClient) {
  const [entry]=useState(()=>{const created=createAuthBackendController({client,backend});setTokenSource(created.accessToken);return created;});   // 게임 API에 로그인 토큰을 붙이게 등록
  const [state,setState]=useState(entry.getSnapshot);
  useEffect(()=>{
    entry.start();const unsubscribe=entry.subscribe(setState);
    const stop=client.subscribe?.((event,session)=>entry.authEvent(event,session));
    void entry.restore();
    return()=>{unsubscribe();stop?.();entry.stop();};
  },[entry,client]);
  return {...state,signIn:entry.signIn,signOut:entry.signOut,cancel:entry.cancel,retry:entry.retry,submitNickname:entry.submitNickname,requestUser:entry.requestUser,configured:entry.configured,backendConfigured:entry.backendConfigured};
}
