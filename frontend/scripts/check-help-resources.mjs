// Disposable-profile regression checks. Never attach to or seed a user's browser.
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';
import { mkdtemp, mkdir, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import assert from 'node:assert/strict';
import { initialGame } from '../../shared/features/game.js';
import { seoulDateKey } from '../../shared/utils/seoulDate.js';
const delay = ms => new Promise(done => setTimeout(done, ms));
const profile = await mkdtemp(join(tmpdir(), 'capstone-ui-review-'));
const output = fileURLToPath(new URL('../../artifacts/ui-review/help-resources/', import.meta.url)); await mkdir(output, { recursive: true });
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



 await send('Page.enable');await send('Emulation.setDeviceMetricsOverride',{width:390,height:750,deviceScaleFactor:1,mobile:true});
 await send('Page.navigate',{url:'http://localhost:5180/?preview=game'});await delay(2500);
 await evalPage("document.querySelector('.attendance-close')?.click();[...document.querySelectorAll('button')].find(b=>b.textContent.includes('일기')&&b.getClientRects().length)?.click()");await delay(250);await text('오늘 일기 쓰기');
 await evalPage(`(()=>{let t=document.querySelector('#diary-text');Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype,'value').set.call(t,'도움 화면 확인용 글');t.dispatchEvent(new Event('input',{bubbles:true}));})()`);await delay(200);
 const before=await evalPage("localStorage.getItem('mochi.game.v1')");
 for(const width of [360,390,430]){
 await send('Emulation.setDeviceMetricsOverride',{width,height:600,deviceScaleFactor:1,mobile:true});
 await evalPage("document.querySelector('.phone-content').scrollTop=170");const y=await evalPage("document.querySelector('.phone-content').scrollTop");
 await click('.diary-entry .help-entry');assert(await evalPage("!!document.querySelector('[role=dialog]')"));
 assert(await evalPage("document.querySelector('.quest-sheet').scrollWidth<=document.querySelector('.quest-sheet').clientWidth+1"));
 await evalPage("window.open=()=>null;Object.defineProperty(navigator,'clipboard',{configurable:true,value:{writeText:async()=>{throw Error('blocked')}}})");
 await text('129 번호 복사');assert(await evalPage("document.querySelector('.help-resources').textContent.includes('복사하지 못')"));
 await text('보건복지상담센터 공식 안내 · 외부 사이트');assert(await evalPage("document.querySelector('.help-resources').textContent.includes('새 탭이 열리지 않으면')"));
 await screenshot('help-services-'+width);
 await send('Input.dispatchKeyEvent',{type:'keyDown',key:'Escape',code:'Escape',windowsVirtualKeyCode:27});await delay(150);
 assert(!await evalPage("!!document.querySelector('[role=dialog]')"));assert.equal(await evalPage("document.querySelector('#diary-text').value"),'도움 화면 확인용 글');assert.equal(await evalPage("document.querySelector('.phone-content').scrollTop"),y);
 }
 assert.equal(await evalPage("localStorage.getItem('mochi.game.v1')"),before);
 await click('.help-entry');await evalPage("document.querySelectorAll('.quest-sheet p,.quest-sheet h2,.quest-sheet h3,.quest-sheet button,.help-address').forEach(e=>e.style.fontSize=(parseFloat(getComputedStyle(e).fontSize)*1.5)+'px')");await screenshot('help-services-large-text');await click('.quest-sheet-close');
 await click('.help-entry');await evalPage("Object.defineProperty(navigator,'clipboard',{configurable:true,value:{writeText:async text=>{window.copied=text;}}})");await text('109 번호 복사');assert.equal(await evalPage('window.copied'),'109');await click('.quest-sheet-close');
 await evalPage("document.querySelector('.diary-screen [aria-label=\"홈 화면으로 돌아가기\"]').click()");await delay(200);
 await evalPage("document.querySelector('[aria-label=\"설정\"]')?.click()");await delay(200);
 assert(await evalPage("!!document.querySelector('.settings-screen .help-entry')"));await click('.settings-screen .help-entry');await click('.quest-sheet-close');
 console.log('PASS web 360/390/430: diary entry, Escape close, draft/scroll retained, copy/window failure alternatives, unchanged storage. No phone invocation.');
}finally{if(send)await send('Browser.close').catch(()=>{});socket?.close();browser.kill();}
