import test from 'node:test';
import assert from 'node:assert/strict';
import { authClient, verifiedSession } from '../auth/authClient.js';
test('unconfigured auth never invents a session',async()=>{assert.equal(await verifiedSession(authClient),null);await assert.rejects(authClient.signIn('kakao'),/준비/);});
test('plain user IDs and local flags are not sessions',async()=>{for(const value of [{id:1},{user:{id:1}},{verified:false,user:{id:1}}])assert.equal(await verifiedSession({getSession:async()=>value}),null);});
test('only a verified adapter session passes and aborted requests stay out',async()=>{const session={verified:true,user:{id:'real-service-user'}};const client={getSession:async()=>session};assert.equal(await verifiedSession(client),session);const abort=new AbortController();abort.abort();assert.equal(await verifiedSession(client,abort.signal),null);});
