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
 const fits=async()=>assert(await evalPage('document.documentElement.scrollWidth<=innerWidth'),'horizontal overflow');
 const day=seoulDateKey(), game={...initialGame(),xp:0,coins:330,characters:['potato'],targetItem:'character:mochi',attendance:{[day]:{type:'coins',amount:10}},challengeDays:{[day]:{selected:['day-water','day-walk','day-diary'],candidates:[],paused:[]}},started:[`${day}:day-walk`],completed:[],journals:{'2026-10-01':'기존 일기'},journalDates:['2026-10-01']};
 await send('Page.enable');
 await send('Page.addScriptToEvaluateOnNewDocument',{source:`if(location.port==='5180'&&!localStorage.getItem('__ui_fixture')){localStorage.setItem('mochi.game.v1',${JSON.stringify(JSON.stringify(game))});localStorage.setItem('__ui_fixture','1')}`});
 await send('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:true});
 await send('Page.navigate',{url:'http://127.0.0.1:5180/?preview=game'});await delay(1500);
 assert.equal(await evalPage("document.querySelectorAll('.home-summary-row').length"),6);
 assert.equal(await evalPage("document.querySelector('.home-summary-row .ui-state').textContent"),'도전 중');
 assert.equal(await evalPage("document.querySelectorAll('.home-target-summary,.home-no-target,.target-button').length"),0);

 for(const width of [360,390,430]){await send('Emulation.setDeviceMetricsOverride',{width,height:600,deviceScaleFactor:1,mobile:true});await fits();}
 await send('Emulation.setDeviceMetricsOverride',{width:390,height:600,deviceScaleFactor:1,mobile:true});await screenshot('home-390-short');
 await click('.home-summary-row');
 assert.equal(await evalPage('document.activeElement.dataset.questId'),'day-walk');
 assert.equal(await evalPage("document.querySelector('.sub-screen-content').scrollHeight>document.querySelector('.sub-screen-content').clientHeight"),false);
 assert.equal(await evalPage("[...document.querySelectorAll('.ui-period-tabs button')].every(b=>Math.abs(b.getBoundingClientRect().top-document.querySelector('.ui-period-tabs button').getBoundingClientRect().top)<2)"),true);
 await fits();assert.equal(await evalPage("document.querySelectorAll('.routine-row').length"),3);assert.equal(await evalPage("document.querySelectorAll('.daily-discoveries .growth-quest').length"),3);await evalPage("document.querySelector('.phone-content').scrollTop=0");await screenshot('quests');await text('이번 주');await text('이번 달');await text('기록·취향');await text('오늘');
 for(const width of [360,390,430]){await send('Emulation.setDeviceMetricsOverride',{width,height:600,deviceScaleFactor:1,mobile:true});await fits();}
 await send('Emulation.setDeviceMetricsOverride',{width:390,height:600,deviceScaleFactor:1,mobile:true});
 await evalPage("document.querySelector('.phone-content').scrollTop=document.querySelector('.phone-content').scrollHeight");assert(await evalPage("document.querySelector('.daily-discoveries .growth-quest:last-child').getBoundingClientRect().bottom<=document.querySelector('.phone-content').getBoundingClientRect().bottom+2"));
 await text('바꾸기');assert.equal(await evalPage("document.querySelector('.phone-content').style.overflow"),'hidden');await click('.quest-sheet-close');assert.equal(await evalPage("document.activeElement.textContent"),'바꾸기');
 const beforeComplete=await evalPage("JSON.parse(localStorage.getItem('mochi.game.v1')).coins");await text('해냈어요!');assert.equal(await evalPage("JSON.parse(localStorage.getItem('mochi.game.v1')).coins"),beforeComplete+25);await text('완료 ✓');assert.equal(await evalPage("JSON.parse(localStorage.getItem('mochi.game.v1')).coins"),beforeComplete+25);await delay(1600);
 await text('나중에 하기');assert.equal(await evalPage("JSON.parse(localStorage.getItem('mochi.game.v1')).coins"),beforeComplete+25);await text('다시 도전');assert.equal(await evalPage("JSON.parse(localStorage.getItem('mochi.game.v1')).coins"),beforeComplete+25);
 // Display-only long text checks: no game/store mutation.
 await evalPage("document.querySelector('.quest-card-heading strong').textContent='아주 긴 이름의 도전도 내용을 자르지 않고 편안하게 읽을 수 있는지 확인하는 시연 제목'");await fits();
 await click('.ui-back');await click('.home-decor-open');await fits();
 assert.equal(await evalPage("getComputedStyle(document.querySelector('.shop-buy:not(:disabled)')||document.querySelector('.shop-buy')).borderRadius"),'14px');
 await text('의상');const before=await evalPage("JSON.parse(localStorage.getItem('mochi.game.v1')).coins");
 await evalPage("[...document.querySelectorAll('.shop-buy')].find(b=>!b.disabled).click()");await delay(250);
 const after=await evalPage("JSON.parse(localStorage.getItem('mochi.game.v1')).coins");assert(after<before);
 await evalPage("[...document.querySelectorAll('.shop-buy')].find(b=>b.textContent==='입기').click()");await delay(200);
 assert(await evalPage("document.querySelector('.shop-buy.is-equipped').disabled"));await screenshot('shop');
 await click('.ui-back');await click('.home-diary-button');await text('오늘 일기 쓰기');
 assert.equal(await evalPage("document.querySelector('#diary-text').disabled"),false);
 const input=async(selector,value)=>{await evalPage(`(()=>{const e=document.querySelector(${JSON.stringify(selector)});Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype,'value').set.call(e,${JSON.stringify(value)});e.dispatchEvent(new Event('input',{bubbles:true}))})()`);await delay(120);};
 await input('#diary-text','오늘의 초안');await text('다른 질문');assert.equal(await evalPage("document.querySelector('#diary-text').value"),'오늘의 초안');
 assert.equal(await evalPage(`!!JSON.parse(localStorage.getItem('mochi.game.v1')).journals?.[${JSON.stringify(day)}]`),false);
 await click('.ui-back');await click('.home-diary-button');await text('오늘 일기 쓰기');assert.equal(await evalPage("document.querySelector('#diary-text').value"),'오늘의 초안');
 await evalPage("window.__originalSet=Storage.prototype.setItem;Storage.prototype.setItem=function(k,v){if(k==='mochi.game.v1')throw Error('fixture storage failure');return window.__originalSet.call(this,k,v)}");
 await text('일기 저장');assert(await evalPage("document.querySelector('.diary-entry').textContent.includes('다시 저장')"));assert.equal(await evalPage(`!!JSON.parse(localStorage.getItem('mochi.game.v1')).journals?.[${JSON.stringify(day)}]`),false);
 assert.equal(await evalPage("document.querySelector('#diary-text').value"),'오늘의 초안');await evalPage('Storage.prototype.setItem=window.__originalSet');await text('다시 저장');
 const diaryCoins=await evalPage("JSON.parse(localStorage.getItem('mochi.game.v1')).coins");assert.equal(diaryCoins,after+25);
 assert(await evalPage(`JSON.parse(localStorage.getItem('mochi.game.v1')).completed.includes(${JSON.stringify(day+':day-diary')})`));
 await click('.diary-emotion');await input('#diary-text','수정한 일기');await text('수정 저장');assert.equal(await evalPage("JSON.parse(localStorage.getItem('mochi.game.v1')).coins"),diaryCoins);await screenshot('diary-emotion');
 await evalPage('window.confirm=()=>true');await text('일기 삭제');await text('오늘 일기 쓰기');assert.equal(await evalPage("document.querySelector('#diary-text').value"),'');await input('#diary-text','삭제 후 재작성');await text('일기 저장');assert.equal(await evalPage("JSON.parse(localStorage.getItem('mochi.game.v1')).coins"),diaryCoins);
 await text('목록으로');await evalPage("[...document.querySelectorAll('.diary-list-entry')].find(b=>b.textContent.includes('2026-10-01')).click()");await delay(150);assert.equal(await evalPage("!!document.querySelector('.diary-delete')"),true);assert.equal(await evalPage("!!document.querySelector('#diary-text')"),false);
 await click('.ui-back');await click('.home-settings');await fits();await click('.ui-back');await click('.home-visit-button');await click('.visit-card');await fits();
 await input('#visit-note','안녕하세요, 좋은 하루 보내세요.');await evalPage("Storage.prototype.setItem=function(k,v){if(k==='mochi.visitNotes.v1')throw Error('fixture post failure');return window.__originalSet.call(this,k,v)}");await text('남기기');
 assert.equal(await evalPage(`JSON.parse(localStorage.getItem('mochi.game.v1')).completed.includes(${JSON.stringify(day+':day-guestbook')})`),false);assert.equal(await evalPage("document.querySelector('#visit-note').value"),'안녕하세요, 좋은 하루 보내세요.');await evalPage('Storage.prototype.setItem=window.__originalSet');await text('남기기');
 assert(await evalPage(`JSON.parse(localStorage.getItem('mochi.game.v1')).completed.includes(${JSON.stringify(day+':day-guestbook')})`));assert.equal(await evalPage("JSON.parse(localStorage.getItem('mochi.game.v1')).coins"),diaryCoins);
 await click('.ui-back');assert(await evalPage("!!document.querySelector('.visit-card')"));await click('.ui-back');await click('.home-guestbook-button');await fits();await click('.ui-back');
 await send('Page.reload');await delay(1000);assert.equal(await evalPage("JSON.parse(localStorage.getItem('mochi.game.v1')).coins"),diaryCoins);
 assert(await evalPage("JSON.parse(localStorage.getItem('mochi.wardrobe.v1')).outfit!==null"));
 // Empty/no-goal fixture only in this newly created profile.
 await evalPage(`(()=>{const g=JSON.parse(localStorage.getItem('mochi.game.v1'));g.targetItem=null;g.challengeDays[${JSON.stringify(day)}].selected=[];localStorage.setItem('mochi.game.v1',JSON.stringify(g));})()`);await send('Page.reload');await delay(900);
 assert.equal(await evalPage("document.querySelectorAll('.home-target-summary,.home-no-target').length"),0);assert.equal(await evalPage("document.querySelectorAll('.home-summary-row').length"),6);await fits();
 const beforePreview=await evalPage('JSON.stringify(localStorage)');
 await send('Emulation.setDeviceMetricsOverride',{width:1280,height:1000,deviceScaleFactor:1,mobile:false});
 await send('Page.navigate',{url:'http://127.0.0.1:5180/?preview=friends'});await delay(800);await screenshot('friends-comparison');await fits();
 assert.equal(await evalPage('JSON.stringify(localStorage)'),beforePreview);
 assert.equal(await evalPage("document.querySelectorAll('.friend-review-grid')[0].querySelectorAll('article').length"),8);
 assert.equal(await evalPage("(()=>{const ids=[...document.querySelectorAll('[id]')].map(e=>e.id);return ids.length-new Set(ids).size})()"),0);
 await send('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:true});await fits();await screenshot('friends-mobile');
 // New-user fixture and attendance success/dedup, in this isolated profile only.
 await evalPage(`localStorage.setItem('mochi.game.v1',${JSON.stringify(JSON.stringify(initialGame()))})`);await send('Page.navigate',{url:'http://127.0.0.1:5180/?preview=game'});await delay(800);assert(await evalPage("document.querySelector('.attendance-dialog').open"));await click('.attendance-claim');
 const paidAttendance=await evalPage(`JSON.stringify((()=>{const g=JSON.parse(localStorage.getItem('mochi.game.v1'));return {xp:g.xp,coins:g.coins,receipt:g.attendance[${JSON.stringify(day)}]}})())`);
 assert(await evalPage(`JSON.parse(localStorage.getItem('mochi.game.v1')).completed.includes(${JSON.stringify(day+':day-attendance')})`));assert(await evalPage("document.querySelector('.attendance-claim').disabled"));await click('.attendance-claim');await click('.attendance-close');await click('.attendance-open');await click('.attendance-claim');
 assert.equal(await evalPage(`JSON.stringify((()=>{const g=JSON.parse(localStorage.getItem('mochi.game.v1'));return {xp:g.xp,coins:g.coins,receipt:g.attendance[${JSON.stringify(day)}]}})())`),paidAttendance);
 console.log('PASS: 360/390/430 + short heights; six missions; summary/focus, removed item goal UI; tabs and single-scroll last card; swap cancel/focus/scroll lock; purchase/wear/refresh; diary drafts, optional mood, failure/retry and delete/rewrite dedup; guestbook failure/success; old/new users, attendance dedup; static preview no storage writes and unique SVG IDs. Isolated profile only.');
} finally {if(socket?.readyState===1){try{await Promise.race([send('Browser.close'),delay(1000)]);}catch{}}socket?.close();browser.kill();}
