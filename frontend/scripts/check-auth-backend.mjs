// Disposable-profile regression checks. Never attach to or seed a user's browser.
import { spawn } from 'node:child_process';
import { mkdtemp, mkdir, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import assert from 'node:assert/strict';
import { initialGame } from '../src/utils/game.js';
import { seoulDateKey } from '../src/utils/seoulDate.js';
const delay = ms => new Promise(done => setTimeout(done, ms));
const profile = await mkdtemp(join(tmpdir(), 'capstone-ui-review-'));
const output = resolve('../artifacts/ui-review'); await mkdir(output, { recursive: true });
const port = 9500 + Math.floor(Math.random() * 3000);
const browser = spawn('C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', ['--headless', '--disable-gpu', '--no-first-run', `--remote-debugging-port=${port}`, `--user-data-dir=${profile}`, 'about:blank'], { windowsHide: true, stdio: 'ignore' });
let socket, send;
try {
 let tabs; for (let i=0;i<50;i++) { try { tabs=await (await fetch(`http://127.0.0.1:${port}/json`)).json(); break; } catch { await delay(200); } }
 assert(tabs?.length); socket=new WebSocket(tabs.find(t=>t.type==='page').webSocketDebuggerUrl);
 await new Promise((done,fail)=>{socket.onopen=done;socket.onerror=fail;});
 let serial=0; const pending=new Map();
 socket.onmessage=e=>{const m=JSON.parse(e.data),p=pending.get(m.id);if(p){pending.delete(m.id);m.error?p.reject(Error(JSON.stringify(m.error))):p.resolve(m.result);}};
 send=(method,params={})=>new Promise((resolve,reject)=>{const id=++serial;pending.set(id,{resolve,reject});socket.send(JSON.stringify({id,method,params}));});
 const evalPage=async expression=>{const r=await send('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});assert(!r.exceptionDetails,JSON.stringify(r.exceptionDetails));return r.result.value;};
 const click=async selector=>{await evalPage(`document.querySelector(${JSON.stringify(selector)}).click()`);await delay(180);};
 const text=async value=>{await evalPage(`(()=>{const el=[...document.querySelectorAll('button')].find(b=>b.textContent.trim()===${JSON.stringify(value)});if(!el)throw Error('missing button '+${JSON.stringify(value)});el.click()})()`);await delay(180);};
 const screenshot=async name=>{const r=await send('Page.captureScreenshot',{format:'png',captureBeyondViewport:true});await writeFile(join(output,name+'.png'),Buffer.from(r.data,'base64'));};


 await send('Page.enable'); await send('Emulation.setDeviceMetricsOverride',{width:1280,height:1000,deviceScaleFactor:1,mobile:false});
 const nav=async url=>{await send('Page.navigate',{url:'http://127.0.0.1:5180/'+url});await delay(1200);};







 await nav('');await evalPage("(async()=>{const m=await import('/scripts/authBackendPreview.jsx');m.mountMockAuthUI();})()");await delay(350);
 const gameBefore=await evalPage("localStorage.getItem('mochi.game.v1')");
 await evalPage("[...document.querySelectorAll('button')].filter(b=>b.getAttribute('aria-label')==='Google로 로그인').at(-1).click()");await delay(300);
 assert(await evalPage("!!document.querySelector('#account-nickname')"));assert(!await evalPage("!!document.querySelector('#mock-home')"));
 const fill=async value=>{await evalPage(`(()=>{const el=document.querySelector('#account-nickname');Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(el,${JSON.stringify(value)});el.dispatchEvent(new Event('input',{bubbles:true}));})()`);await delay(60);};
 await fill('사용중');await text('닉네임으로 시작하기');await delay(200);assert(await evalPage("document.querySelector('#nickname-message').textContent.includes('이미 쓰고')"));
 assert.equal(await evalPage("document.querySelector('#account-nickname').value"),'사용중');
 for(const width of [360,390,430]){await send('Emulation.setDeviceMetricsOverride',{width,height:740,deviceScaleFactor:1,mobile:true});await delay(100);assert(await evalPage("document.documentElement.scrollWidth<=innerWidth"));await screenshot('auth-nickname-mock-'+width);}
 await fill('새모찌');const before=await evalPage('window.__mockLinkCalls');
 await evalPage("(()=>{const b=[...document.querySelectorAll('button')].find(b=>b.textContent==='닉네임으로 시작하기');b.click();b.click()})()");await delay(250);
 assert.equal(await evalPage('window.__mockLinkCalls'),before+1);assert(await evalPage("!!document.querySelector('#mock-home')"));assert.deepEqual(await evalPage('window.__mockLinkedIds'),{backendUserId:'mock-backend-user',supabaseUserId:'mock-auth-user'});
 await text('로그아웃');await delay(120);await evalPage("window.__mockMode('network')");
 await evalPage("[...document.querySelectorAll('button')].filter(b=>b.getAttribute('aria-label')==='Google로 로그인').at(-1).click()");await delay(250);assert(await evalPage("[...document.querySelectorAll('button')].some(b=>b.textContent==='계정 연결 다시 시도')"));assert(!await evalPage("!!document.querySelector('#account-nickname')"));
 await screenshot('auth-backend-error-mock-430');await evalPage("window.__mockMode('existing')");await text('계정 연결 다시 시도');await delay(250);assert(await evalPage("!!document.querySelector('#mock-home')"));
 assert.equal(await evalPage("localStorage.getItem('mochi.game.v1')"),gameBefore);
 console.log('PASS MOCK ONLY: nickname 404 flow, duplicate nickname, input retention, 360/390/430, double submit once, separate IDs, logout, network error/retry, local game untouched. No real Google/backend verification.');
}finally{socket?.close();browser.kill();}
