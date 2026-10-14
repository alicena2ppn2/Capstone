// MOCK-ONLY browser harness. Never imported by the production app or normal login URL.
import React from 'react';
import { createRoot } from 'react-dom/client';
import AuthGate from '../src/auth/AuthGate.jsx';
import { useAuthActions } from '../src/auth/AuthContext.js';
import { authClient } from '../src/auth/authClient.js';
import { backendClient } from '../src/api/client.js';
import { BackendError,NEW_MEMBER_DETAIL } from '../src/api/backendClient.mjs';
export function mountMockAuthUI() {
  let current=null,listener=null,mode='new';
  window.__mockLinkCalls=0;
  window.__mockMode=value=>{mode=value;};
  authClient.configured=true;
  authClient.getSession=async()=>current;
  authClient.subscribe=callback=>{listener=callback;return()=>{listener=null;};};
  authClient.signIn=async provider=>{if(provider!=='google')throw Error('카카오 로그인은 아직 연결되지 않았어요.');current={verified:true,source:'supabase',user:{id:'mock-auth-user'},access_token:'mock-ui-token'};listener?.('SIGNED_IN',current);};
  authClient.signOut=async()=>{current=null;listener?.('SIGNED_OUT',null);};
  backendClient.configured=true;
  backendClient.link=async(session,nickname)=>{
    window.__mockLinkCalls++;
    await new Promise(done=>setTimeout(done,100));
    if(mode==='network')throw new BackendError('서버에 연결하지 못했어요. 다시 시도해 주세요.');
    if(mode==='route')throw new BackendError('계정 연결 API를 찾지 못했어요.',{status:404});
    if(mode==='existing')return {backendUserId:'mock-backend-user',nickname:'모의친구',created:false};
    if(!nickname)throw new BackendError(NEW_MEMBER_DETAIL,{status:404,newMember:true});
    if(nickname==='사용중')throw new BackendError('이미 쓰고 있는 닉네임이에요.',{status:409});
    return {backendUserId:'mock-backend-user',nickname,created:true};
  };
  function MockHome(){const auth=useAuthActions();window.__mockLinkedIds={backendUserId:auth.backendUserId,supabaseUserId:auth.supabaseUserId};return <main id="mock-home"><h1>모의 응답 검증용 홈</h1><button onClick={auth.logout}>로그아웃</button></main>;}
  document.querySelector('#root').style.display='none';
  const container=document.createElement('div');document.body.appendChild(container);
  createRoot(container).render(<AuthGate><MockHome/></AuthGate>);
}
