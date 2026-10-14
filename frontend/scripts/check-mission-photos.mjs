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




 await nav('?preview=game');
 await evalPage(`(async()=>{const {initialGame}=await import('/src/utils/game.js');const {ensureDailyMissions}=await import('/src/utils/dailyMissions.js');const {seoulDateKey}=await import('/src/utils/seoulDate.js');const day=seoulDateKey();let game=ensureDailyMissions(initialGame(),day);game.dailyMissions[day].activities=['day-photo-detail','day-water','day-nod'].map((id,slot)=>({id,slot,reason:'시연 검증'}));localStorage.setItem('mochi.game.v1',JSON.stringify(game));})()`);
 await nav('?preview=game'); await evalPage("document.querySelector('.attendance-close')?.click()");
 for(const width of [360,390,430]){
  await send('Emulation.setDeviceMetricsOverride',{width,height:844,deviceScaleFactor:1,mobile:true});
  await click('.game-bottom-nav button:nth-child(1)');
  assert.equal(await evalPage("document.querySelectorAll('.routine-row').length"),3);
  assert.equal(await evalPage("document.querySelectorAll('.daily-discoveries .growth-quest').length"),3);
  assert(await evalPage('document.documentElement.scrollWidth<=innerWidth'));
  await screenshot('photo-quests-'+width);
  await click('.game-bottom-nav button:nth-child(2)');await screenshot('photo-home-'+width);
  await click('.game-bottom-nav button:nth-child(3)');assert(await evalPage("!!document.querySelector('.shop-screen')"));
 }
 await click('.game-bottom-nav button:nth-child(1)');
 await click('[data-quest-id="day-photo-detail"] .shop-buy');
 await evalPage(`(()=>{const canvas=document.createElement('canvas');canvas.width=80;canvas.height=80;canvas.getContext('2d').fillRect(0,0,80,80);const bytes=Uint8Array.from(atob(canvas.toDataURL('image/png').split(',')[1]),c=>c.charCodeAt(0));const dt=new DataTransfer();dt.items.add(new File([bytes],'test.png',{type:'image/png'}));const input=document.querySelector('.photo-mission input');input.files=dt.files;input.dispatchEvent(new Event('change',{bubbles:true}));window.__originalSet=Storage.prototype.setItem;window.__photoFail=true;Storage.prototype.setItem=function(k,v){if(window.__photoFail&&k==='mochi.game.v1')throw Error('test quota');return window.__originalSet.call(this,k,v);};})()`);
 await delay(300);await click('.photo-mission .shop-buy');await delay(500);
 assert.equal(await evalPage("JSON.parse(localStorage.getItem('mochi.game.v1')).coins"),90);
 assert(await evalPage("document.querySelector('.photo-mission').textContent.includes('저장하지 못')"));
 await evalPage('window.__photoFail=false');await click('.photo-mission .shop-buy');await delay(800);
 assert.equal(await evalPage("JSON.parse(localStorage.getItem('mochi.game.v1')).coins"),115);
 await click('.game-bottom-nav button:nth-child(2)');await text('일기');await text('사진첩');await delay(500);
 assert.equal(await evalPage("document.querySelectorAll('.photo-album-card img').length"),1);
 await screenshot('photo-album-430');
 await nav('?preview=game');await delay(1600);await evalPage("document.querySelector('.attendance-close')?.click()");await click('.game-bottom-nav button:nth-child(2)');await click('.home-diary-button');await text('사진첩');await delay(500);
 assert.equal(await evalPage("document.querySelectorAll('.photo-album-card img').length"),1);
 assert.equal(await evalPage("JSON.parse(localStorage.getItem('mochi.game.v1')).coins"),115);
 await click('.game-bottom-nav button:nth-child(2)');await click('.home-settings');assert(!await evalPage("document.querySelector('.settings-screen').textContent.includes('배경 음악')"));assert(!await evalPage("!!document.querySelector('#settings-volume')"));
 await send('Emulation.setDeviceMetricsOverride',{width:360,height:600,deviceScaleFactor:1,mobile:true});await click('.game-bottom-nav button:nth-child(1)');assert(await evalPage("document.querySelector('.game-bottom-nav').getBoundingClientRect().bottom<=innerHeight"));await screenshot('photo-quests-short');
 console.log('PASS 360/390/430 and short viewport, bottom nav, six missions, photo save failure/retry, album/reload without duplicate reward, music controls removed. Real camera/native permissions not tested.');
}finally{if(send)await send('Browser.close').catch(()=>{});socket?.close();browser.kill();}
