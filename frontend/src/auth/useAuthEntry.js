import { useEffect, useState } from 'react';
import { authClient } from './authClient.js';
import { backendClient } from '../api/client.js';
import { createAuthBackendController } from '../../../shared/auth/authBackendController.mjs';

export default function useAuthEntry(client=authClient,backend=backendClient) {
  const [entry]=useState(()=>createAuthBackendController({client,backend}));
  const [state,setState]=useState(entry.getSnapshot);
  useEffect(()=>{
    entry.start();const unsubscribe=entry.subscribe(setState);
    const stop=client.subscribe?.((event,session)=>entry.authEvent(event,session));
    void entry.restore();
    return()=>{unsubscribe();stop?.();entry.stop();};
  },[entry,client]);
  return {...state,signIn:entry.signIn,signOut:entry.signOut,cancel:entry.cancel,retry:entry.retry,submitNickname:entry.submitNickname,requestUser:entry.requestUser,configured:entry.configured,backendConfigured:entry.backendConfigured};
}
