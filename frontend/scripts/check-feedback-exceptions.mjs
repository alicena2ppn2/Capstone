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

 const {ensureAttendanceWeek}=await import('../src/utils/game.js');
 const {attendanceWeek}=await import('../src/utils/seoulDate.js');
 const {DECOR}=await import('../src/utils/decor.js');
 const day=seoulDateKey(),week=attendanceWeek(day);
 await send('Emulation.setDeviceMetricsOverride',{width:390,height:750,deviceScaleFactor:1,mobile:true});
 await nav('');await delay(1000);
 const seed=async game=>{await evalPage(`localStorage.setItem('mochi.game.v1',${JSON.stringify(JSON.stringify(game))})`);await nav('?preview=game');await delay(200);};
 for(const reward of [{type:'coins',amount:20},{type:'xp',amount:10},{type:'outfit',id:'sky'},{type:'decor',id:DECOR[0].id}]){
  let game=ensureAttendanceWeek(initialGame(),day);game.attendancePlans[week[0]][day]=reward;await seed(game);
  assert(await evalPage("document.querySelector('.attendance-dialog').open"));
  await evalPage("window.rawSave=Storage.prototype.setItem;Storage.prototype.setItem=function(k,v){if(k==='mochi.game.v1')throw Error('test fail');return window.rawSave.call(this,k,v)}");
  await click('.attendance-claim');assert(!await evalPage("!!document.querySelector('.attendance-award')"));assert(await evalPage("document.querySelector('.attendance-dialog').open"));
  await evalPage('Storage.prototype.setItem=window.rawSave');
  await evalPage("(()=>{const b=document.querySelector('.attendance-claim');b.click();b.click();})()");await delay(100);
  assert(!await evalPage("document.querySelector('.attendance-dialog').open"));assert.equal(await evalPage("document.querySelectorAll('.attendance-award').length"),1);
  const receipt=await evalPage(`JSON.parse(localStorage.getItem('mochi.game.v1')).attendance['${day}']`);assert.equal(receipt.type,reward.type);
  await screenshot('attendance-gift-'+reward.type);await delay(1100);assert(!await evalPage("!!document.querySelector('.attendance-award')"));await click('.attendance-open');assert(await evalPage("!!document.querySelector('.attendance-receipt')"));assert(!await evalPage("!!document.querySelector('.attendance-award')"));await nav('?preview=game');assert(!await evalPage("!!document.querySelector('.attendance-award')"));
 }
 let duplicate=ensureAttendanceWeek(initialGame(),day);duplicate.attendanceClothes=['sky'];duplicate.attendancePlans[week[0]][day]={type:'outfit',id:'sky'};await seed(duplicate);await click('.attendance-claim');assert(await evalPage("document.querySelector('.attendance-award').textContent.includes('+30 코인')"));await delay(1100);
 const duplicateDecor=ensureAttendanceWeek(initialGame(),day);duplicateDecor.ownedDecor=[DECOR[0].id];duplicateDecor.attendancePlans[week[0]][day]={type:'decor',id:DECOR[0].id};await seed(duplicateDecor);await click('.attendance-claim');assert(await evalPage("document.querySelector('.attendance-award').textContent.includes('+30 코인')"));await delay(1100);
 await text('방문하기');await click('.visit-card');await text('응원해요');assert(await evalPage("document.querySelector('.neighbor-feedback').textContent.includes('응원을 남겼어요')"));await evalPage("for(let i=0;i<20;i++)[...document.querySelectorAll('.visit-neighbor-actions button')].find(b=>b.textContent.includes('응원')).click()");assert.equal(await evalPage("document.querySelectorAll('.neighbor-feedback').length"),1);await delay(1400);assert(!await evalPage("!!document.querySelector('.neighbor-feedback')"));assert(await evalPage("[...document.querySelectorAll('.visit-neighbor-actions button')].some(b=>b.textContent.includes('응원 선택됨')&&b.getAttribute('aria-pressed')==='true')"));
 await evalPage("window.rawSave=Storage.prototype.setItem;Storage.prototype.setItem=function(k,v){if(k==='mochi.visitConnections.v1')throw Error('test fail');return window.rawSave.call(this,k,v)}");await text('고마워요');assert(await evalPage("document.querySelector('.neighbor-feedback').textContent.includes('저장하지 못')"));assert(!await evalPage("document.querySelector('.neighbor-feedback').textContent.includes('고마움을 남겼어요')"));await evalPage('Storage.prototype.setItem=window.rawSave');await text('고마워요');assert(await evalPage("document.querySelector('.neighbor-feedback').textContent.includes('고마움을 남겼어요')"));await screenshot('neighbor-feedback');await delay(1400);
 // Past draft discovery, conflict choices and deletion keep reward history.
 const previous=new Date(`${day}T00:00Z`);previous.setUTCDate(previous.getUTCDate()-1);const old=previous.toISOString().slice(0,10);
 const fixture={...initialGame(),attendance:{[day]:{type:'coins',amount:20}},journalDrafts:{[old]:{text:'남겨 둔 글',emotion:'loved',prompt:1},[day]:{text:'오늘 초안',emotion:'happy'}},journals:{[old]:'지난 일기'},journalDates:[old]};await seed(fixture);await text('일기');await text(`${old} · 남겨 둔 초안`);assert(await evalPage("!!document.querySelector('.diary-rollover')"));await text('오늘로 이어 쓰기');await text('합쳐 이어 쓰기');assert.equal(await evalPage("document.querySelector('#diary-text').value"),'오늘 초안\n\n남겨 둔 글');await text('일기 저장');const paid=await evalPage("JSON.parse(localStorage.getItem('mochi.game.v1')).coins");assert.equal(paid,115);await text('목록으로');await text(`${old} · 남겨 둔 초안`);await send('Page.handleJavaScriptDialog',{accept:true}).catch(()=>{});
 await evalPage("window.confirm=()=>true");await text('일기 삭제');const stored=await evalPage("JSON.parse(localStorage.getItem('mochi.game.v1'))");assert.equal(stored.journals[old],undefined);assert.equal(stored.journalDrafts[old],undefined);assert(stored.journalDates.includes(old));assert.equal(stored.coins,paid);
 const clock=Date.parse(`${day}T14:59:00Z`);await send('Page.addScriptToEvaluateOnNewDocument',{source:`(()=>{const NativeDate=Date;window.testClock=${clock};window.Date=class extends NativeDate{constructor(...a){super(...(a.length?a:[window.testClock]));}static now(){return window.testClock;}}})()`});
 await seed({...initialGame(),attendance:{[day]:{type:'coins',amount:20}}});await text('일기');await text('오늘 일기 쓰기');
 await evalPage("(()=>{const e=document.querySelector('#diary-text');Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype,'value').set.call(e,'자정에 이어 쓸 글');e.dispatchEvent(new Event('input',{bubbles:true}));})()");await delay(150);await click('.diary-emotion');await evalPage('window.testClock+=120000');await delay(1400);assert(await evalPage("document.querySelector('.diary-rollover').textContent.includes('날짜가 바뀌었어요')"));if(await evalPage("Boolean(document.querySelector('.attendance-close'))"))await click('.attendance-close');await text('오늘로 이어 쓰기');assert.equal(await evalPage("document.querySelector('#diary-text').value"),'자정에 이어 쓸 글');assert.equal(await evalPage("document.querySelector('.diary-emotion[aria-pressed=true]').textContent.includes('웃음')"),true);await screenshot('diary-midnight-continuation');
 console.log('PASS attendance actual receipt/failure/duplicate/reopen/refresh; neighbor success/failure/selection; past draft conflict merge/emotion, midnight rollover and past deletion. Disposable Edge profile only.');
}finally{if(send)await send('Browser.close').catch(()=>{});socket?.close();browser.kill();}
