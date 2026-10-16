import test from 'node:test';
import assert from 'node:assert/strict';
import { createBackendClient,NEW_MEMBER_DETAIL } from '../api/backendClient.mjs';
import { createAuthBackendController } from './authBackendController.mjs';
const pause=()=>new Promise(done=>setTimeout(done,10));
const session=(id='auth-A',token='unit-test-secret')=>({verified:true,source:'supabase',user:{id},access_token:token});
const response=(status,data)=>({ok:status>=200&&status<300,status,json:async()=>data});
function fixture(handler=()=>response(200,{user:{id:'backend-A',nickname:'모찌친구'},created:false})) {
  let value=session();const calls=[];
  const client={configured:true,getSession:async()=>value,handleCallback:async()=>{},signIn:async()=>{},signOut:async()=>{value=null;},setSession:next=>{value=next;}};
  const backend=createBackendClient({baseUrl:'https://unit.invalid',fetchImpl:async(url,options)=>{calls.push({url,options});return handler(url,options);}});
  const entry=createAuthBackendController({client,backend});
  return {entry,client,backend,calls};
}
test('existing member uses Bearer and required empty JSON; stores separate IDs only after success',async()=>{
 const f=fixture();assert.equal(f.entry.getSnapshot().backendUserId,null);await f.entry.restore();
 assert.equal(f.calls[0].url,'https://unit.invalid/auth/supabase');assert.equal(f.calls[0].options.headers.Authorization,'Bearer unit-test-secret');assert.deepEqual(JSON.parse(f.calls[0].options.body),{});
 assert.equal(f.entry.getSnapshot().status,'authenticated');assert.equal(f.entry.getSnapshot().supabaseUserId,'auth-A');assert.equal(f.entry.getSnapshot().backendUserId,'backend-A');
 assert(!JSON.stringify(f.entry.getSnapshot()).includes('unit-test-secret'));assert(!('access_token' in f.entry.getSnapshot()));f.entry.stop();
});
test('new member recognized by exact contract; signup uses nickname only and freshly read token',async()=>{
 const f=fixture((url,o)=>JSON.parse(o.body).nickname?response(201,{user:{id:'new-backend',nickname:'새친구'},created:true}):response(404,{detail:NEW_MEMBER_DETAIL}));
 await f.entry.restore();assert.equal(f.entry.getSnapshot().status,'nickname');assert.equal(f.entry.getSnapshot().backendUserId,null);
 f.client.setSession(session('auth-A','refreshed-unit-token'));await f.entry.submitNickname(' 새친구 ');
 assert.deepEqual(JSON.parse(f.calls[1].options.body),{nickname:'새친구'});assert.equal(f.calls[1].options.headers.Authorization,'Bearer refreshed-unit-token');assert.equal(f.entry.getSnapshot().backendUserId,'new-backend');f.entry.stop();
});
test('route 404, other 404, non-JSON 404, 401/403/500 and network failures never create signup',async()=>{
 for(const [status,data] of [[404,{detail:'Not Found'}],[404,{detail:'없는 사용자입니다.'}],[404,null],[401,{detail:'로그인이 필요해요.'}],[403,{}],[500,{}]]){
  const f=fixture(()=>response(status,data));await f.entry.restore();assert.equal(f.entry.getSnapshot().status,'connection-error');assert.equal(f.entry.getSnapshot().backendUserId,null);f.entry.stop();
 }
 const f=fixture(()=>{throw Error('transport detail');});await f.entry.restore();assert.equal(f.entry.getSnapshot().status,'connection-error');assert(!f.entry.getSnapshot().message.includes('transport'));f.entry.stop();
});
test('validation/duplicate errors stay on nickname form and registration double submit runs once',async()=>{
 let status=404,resolve;
 const f=fixture((url,o)=>!JSON.parse(o.body).nickname?response(404,{detail:NEW_MEMBER_DETAIL}):status===201?new Promise(done=>{resolve=()=>done(response(201,{user:{id:'new',nickname:'친구'},created:true}));}):response(status,{detail:status===409?'이미 쓰고 있는 닉네임이에요.':'닉네임은 2~12자로 지어 주세요.'}));
 await f.entry.restore();await f.entry.submitNickname(' ');assert.equal(f.calls.length,1);
 for(const s of [422,409]){status=s;await f.entry.submitNickname('친구');assert.equal(f.entry.getSnapshot().status,'nickname');assert(f.entry.getSnapshot().message);assert.equal(f.entry.getSnapshot().backendUserId,null);}
 status=201;const before=f.calls.length,a=f.entry.submitNickname('친구'),b=f.entry.submitNickname('친구');await pause();assert.equal(f.calls.length,before+1);resolve();await Promise.all([a,b]);assert.equal(f.entry.getSnapshot().status,'authenticated');f.entry.stop();
});
test('backend failure retry and cold session restoration each verify link without cached ID persistence',async()=>{
 let failed=true;const f=fixture(()=>failed?response(503,{}):response(200,{user:{id:'backend-A'},created:false}));
 await f.entry.restore();assert.equal(f.entry.getSnapshot().status,'connection-error');failed=false;await f.entry.retry();assert.equal(f.entry.getSnapshot().status,'authenticated');f.entry.stop();
 const cold=createAuthBackendController({client:f.client,backend:f.backend});assert.equal(cold.getSnapshot().backendUserId,null);await cold.restore();assert.equal(f.calls.length,3);assert.equal(cold.getSnapshot().backendUserId,'backend-A');cold.stop();
});
test('callback/auth event/restore overlap share one request and same-account events do not reconnect',async()=>{
 let release;const f=fixture(()=>new Promise(resolve=>{release=()=>resolve(response(200,{user:{id:'backend-A'},created:false}));}));
 const first=f.entry.restore();await pause();f.entry.authEvent('SIGNED_IN',{user:{id:'auth-A'}});const second=f.entry.restore('capstone-mochi://auth/callback?code=unit');await pause();assert.equal(f.calls.length,1);release();await Promise.all([first,second]);
 f.entry.authEvent('SIGNED_IN',{user:{id:'auth-A'}});f.entry.authEvent('TOKEN_REFRESHED',{user:{id:'auth-A'}});await pause();assert.equal(f.calls.length,1);f.entry.stop();
});
test('logout or account switch rejects late connection response and clears previous backend ID immediately',async()=>{
 let release;const f=fixture((url,o)=>o.headers.Authorization.includes('token-B')?response(200,{user:{id:'backend-B'},created:false}):new Promise(resolve=>{release=()=>resolve(response(200,{user:{id:'backend-A'},created:false}));}));
 const a=f.entry.restore();await pause();f.client.setSession(session('auth-B','token-B'));f.entry.authEvent('SIGNED_IN',{user:{id:'auth-B'}});
 assert.equal(f.entry.getSnapshot().backendUserId,null);await pause();await f.entry.restore();release();await a;assert.equal(f.entry.getSnapshot().backendUserId,'backend-B');assert.equal(f.entry.getSnapshot().supabaseUserId,'auth-B');f.entry.stop();
 const g=fixture(()=>new Promise(resolve=>{release=()=>resolve(response(200,{user:{id:'backend-A'},created:false}));}));
 const pending=g.entry.restore();await pause();await g.entry.signOut();assert.equal(g.entry.getSnapshot().backendUserId,null);release();await pending;assert.equal(g.entry.getSnapshot().status,'signed-out');g.entry.stop();
});
test('user API uses backend ID and fresh token, cannot reuse it for another Supabase account',async()=>{
 const f=fixture((url,o)=>url.endsWith('/auth/supabase')?response(200,{user:{id:'backend-A'},created:false}):response(200,{ok:true}));await f.entry.restore();
 f.client.setSession(session('auth-A','rotated-unit-token'));await f.entry.requestUser('/home');
 assert.equal(f.calls[1].url,'https://unit.invalid/users/backend-A/home');assert.equal(f.calls[1].options.headers.Authorization,'Bearer rotated-unit-token');
 f.client.setSession(session('auth-B','token-B'));await assert.rejects(f.entry.requestUser('/home'));assert.equal(f.entry.getSnapshot().backendUserId,null);f.entry.stop();
});
test('malformed success and server detail containing token rejected safely',async()=>{
 for(const payload of [{user:{id:'x'}},{created:false,user:{}},{created:true,user:{id:42}}]){const f=fixture(()=>response(200,payload));await f.entry.restore();assert.equal(f.entry.getSnapshot().status,'connection-error');f.entry.stop();}
 const f=fixture(()=>response(500,{detail:'failure unit-test-secret'}));await f.entry.restore();assert(!f.entry.getSnapshot().message.includes('unit-test-secret'));f.entry.stop();
});
test('missing real server URL is explicit, does not guess a host or authenticate',async()=>{
 const f=fixture();const entry=createAuthBackendController({client:f.client,backend:createBackendClient({})});await entry.restore();assert.equal(entry.getSnapshot().status,'connection-error');assert(entry.getSnapshot().message.includes('서버 주소'));assert.equal(entry.getSnapshot().backendUserId,null);entry.stop();f.entry.stop();
});
test('nickname entered for A is not submitted to B after session silently changes',async()=>{
 const f=fixture(()=>response(404,{detail:NEW_MEMBER_DETAIL}));await f.entry.restore();f.client.setSession(session('auth-B','token-B'));await f.entry.submitNickname('A친구');
 assert(f.calls.every(c=>!JSON.parse(c.options.body).nickname));assert.equal(f.entry.getSnapshot().backendUserId,null);f.entry.stop();
});
test('canceled/failed Google login never connects backend; stop/start cleanup is reusable',async()=>{
 const f=fixture();f.client.signIn=async()=>{throw Error('로그인을 취소했어요.');};await f.entry.signIn('google');assert.equal(f.calls.length,0);assert.equal(f.entry.getSnapshot().status,'signed-out');
 f.entry.stop();f.entry.start();await f.entry.restore();assert.equal(f.calls.length,1);f.entry.stop();
});
test('Google success, link callback and SIGNED_IN event do not send duplicate linking requests',async()=>{
 const f=fixture();f.client.signIn=async()=>{f.entry.authEvent('SIGNED_IN',{user:{id:'auth-A'}});void f.entry.restore('capstone-mochi://auth/callback?code=unit');};
 await f.entry.signIn('google');await pause();assert.equal(f.calls.length,1);assert.equal(f.entry.getSnapshot().backendUserId,'backend-A');f.entry.stop();
});
test('late user API result cannot be applied after logout even if transport ignores abort',async()=>{
 let release;const f=fixture(url=>url.endsWith('/auth/supabase')?response(200,{user:{id:'backend-A'},created:false}):new Promise(done=>{release=()=>done(response(200,{private:'old-account-data'}));}));
 await f.entry.restore();const pending=f.entry.requestUser('/home');await pause();await f.entry.signOut();release();await assert.rejects(pending,/계정이 바뀌었어요/);assert.equal(f.entry.getSnapshot().backendUserId,null);f.entry.stop();
});
test('accessToken gives the fresh token only while the same account is connected',async()=>{
 const f=fixture();assert.equal(await f.entry.accessToken(),null);await f.entry.restore();assert.equal(await f.entry.accessToken(),'unit-test-secret');
 f.client.setSession(session('auth-A','rotated-unit-token'));assert.equal(await f.entry.accessToken(),'rotated-unit-token');
 f.client.setSession(session('auth-B','token-B'));assert.equal(await f.entry.accessToken(),null);f.entry.stop();
});
