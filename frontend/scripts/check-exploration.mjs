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
const output = fileURLToPath(new URL('../../artifacts/ui-review/exploration/', import.meta.url)); await mkdir(output, { recursive: true });
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



 await send('Page.enable');await send('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:true});
 await send('Page.navigate',{url:'http://localhost:5180/dev/exploration/app.html'});await delay(1800);
 assert(await evalPage("document.body.textContent.includes('실제 GPS 아님')"));
 const game=await evalPage("JSON.stringify(Object.keys(localStorage).filter(k=>k.startsWith('mochi.')).map(k=>[k,localStorage[k]]))");
 for(const v of ['A','B','C']){
  await evalPage(`document.querySelectorAll('.variants button')[${['A','B','C'].indexOf(v)}].click()`);await delay(150);
  await screenshot('exploration-'+v);
  await text('도착 상황 보기');await delay(100);
  assert(await evalPage("document.querySelector('.confirm-arrival')?.disabled===false"));
  // Close modal to set poor quality; neither stale nor inaccurate positions can confirm.
  if(v!=='B'){await click('.sheet header button');}
  await evalPage("var s=document.querySelector('[aria-label=\"예시 측정 상황\"]');Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype,'value').set.call(s,'poor');s.dispatchEvent(new Event('change',{bubbles:true}));");
  if(v!=='B')await click('[aria-label="햇살 공원 장소 보기"]'+(v==='C'?'': '')) .catch(async()=>{await evalPage("document.querySelector('.post-preview').click()");await delay(100);});
  assert(await evalPage("document.querySelector('.confirm-arrival').disabled"));
  if(v!=='B')await click('.sheet header button');
  await evalPage("var s=document.querySelector('[aria-label=\"예시 측정 상황\"]');Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype,'value').set.call(s,'good');s.dispatchEvent(new Event('change',{bubbles:true}));");
  await text('도착 상황 보기');await click('.confirm-arrival');
  assert(await evalPage("!!document.querySelector('#note')"));
  await evalPage("document.querySelector('.claim-reward').click();document.querySelector('.claim-reward').click()");await delay(100);
  assert(await evalPage("document.querySelector('.claim-reward').disabled"));
  await evalPage(`var t=document.querySelector('#note');Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype,'value').set.call(t,'나만의 시안 메모');t.dispatchEvent(new Event('input',{bubbles:true}));`);await delay(100);await click('.add-note');
  assert(await evalPage("document.querySelector('.mine').textContent.includes('나만의 시안 메모')"));
  await text('내 글 삭제');assert(!await evalPage("!!document.querySelector('.mine')"));await screenshot('exploration-'+v+'-arrived');
  if(v!=='B')await click('.sheet header button');
 }
 assert.equal(await evalPage("JSON.stringify(Object.keys(localStorage).filter(k=>k.startsWith('mochi.')).map(k=>[k,localStorage[k]]))"),game);
 assert.equal(await evalPage("Object.values(JSON.parse(sessionStorage.getItem('my-mochi.dev.exploration.v1'))).filter(s=>s.claims.park).length"),3);
 await send('Page.reload');await delay(1300);assert.equal(await evalPage("Object.values(JSON.parse(sessionStorage.getItem('my-mochi.dev.exploration.v1'))).filter(s=>s.claims.park).length"),3);

 // Movement changes the marker while retaining static map nodes; pause is stable.
 await text('이동 시작');const oldLeft=await evalPage("window.mapNode=document.querySelector('.map-art');document.querySelector('.marker').style.left");await delay(1600);assert.notEqual(await evalPage("document.querySelector('.marker').style.left"),oldLeft);assert(await evalPage("document.querySelector('.map-art')===window.mapNode"));await text('일시정지');const paused=await evalPage("document.querySelector('.marker').style.left");await delay(900);assert.equal(await evalPage("document.querySelector('.marker').style.left"),paused);
 await text('→');assert(await evalPage("document.querySelector('.locate').textContent.includes('복귀')"));await click('.locate');assert(await evalPage("document.querySelector('.locate').textContent.includes('✓')"));
 // Wrapper fits without changing the iframe's CSS viewport.
 await send('Page.navigate',{url:'http://localhost:5180/dev/exploration/'});await delay(700);
 for(const [width,height] of [[1280,1000],[900,650]]){await send('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:false});await delay(100);const m=await evalPage("(()=>{let f=document.querySelector('iframe'),r=f.getBoundingClientRect();return{w:f.offsetWidth,h:f.offsetHeight,rw:r.width,rh:r.height,b:r.bottom}})()");assert.equal(m.w,390);assert.equal(m.h,844);assert(Math.abs(m.rw/m.rh-390/844)<.001);assert(m.b<=height);await screenshot('exploration-wrapper-'+height);}
 console.log('PASS A/B/C selection, simulation arrival/accuracy gate, explicit confirm, one-time example reward, note create/delete, separate storage, reload, 390x844 proportional wrapper. Simulation only; no GPS/permissions/server.');
}finally{if(send)await send('Browser.close').catch(()=>{});socket?.close();browser.kill();}
