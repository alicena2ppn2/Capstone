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






 await send('Page.addScriptToEvaluateOnNewDocument',{source:`(()=>{const RealDate=Date;window.Date=class extends RealDate{constructor(...args){super(...(args.length?args:['2026-10-15T03:00:00Z']));}static now(){return new RealDate('2026-10-15T03:00:00Z').getTime();}};})()`});
 const clearPopup=()=>evalPage("document.querySelector('.attendance-close')?.click()");
 await nav('?preview=game');await clearPopup();
 const seed={...initialGame(),xp:210,coins:450,preferences:{music:'재즈',food:'밥'},missionModes:{'2026-10-15:day-tidy':'light'},dailyMissions:{'2026-10-15':{version:1,activities:[{id:'day-tidy',slot:0,reason:'검토용'},{id:'day-listen',slot:1,reason:'취향'},{id:'day-checkin',slot:2,reason:'내 선택'}],paused:[],replacements:[]}}};
 await evalPage(`localStorage.setItem('mochi.game.v1',${JSON.stringify(JSON.stringify(seed))})`);
 await nav('?preview=game');await clearPopup();await text('오늘의 도전');
 assert.equal(await evalPage("document.querySelectorAll('[data-quest-id]').length"),6);
 await text('건너뛰기');await delay(300);
 assert(await evalPage("JSON.parse(localStorage.getItem('mochi.game.v1')).preferences.missions.reviewed"));
 for(const width of [360,390,430]){
   await send('Emulation.setDeviceMetricsOverride',{width,height:740,deviceScaleFactor:1,mobile:true});await delay(300);
   assert(await evalPage("document.documentElement.scrollWidth<=innerWidth"));
   assert(!await evalPage("[...document.querySelectorAll('button')].some(b=>['방법 보기','더 가볍게','조금 더 해볼래요'].includes(b.textContent))"));
   assert(await evalPage("document.querySelector('[data-quest-id=day-tidy]').textContent.includes('물건 하나를 제자리에')"));
   await screenshot('quest-compact-list-'+width);
   await evalPage("document.querySelector('.daily-discoveries').scrollIntoView({block:'start'})");await delay(120);await screenshot('quest-compact-cards-'+width);
 }
 assert(await evalPage("document.querySelector('[data-quest-id=day-checkin]').textContent.includes('잘 지내?')"));
 await evalPage("[...document.querySelectorAll('[data-quest-id=day-tidy] button')].find(b=>b.textContent==='도전하기').click()");await delay(150);
 const before=await evalPage("JSON.parse(localStorage.getItem('mochi.game.v1')).coins");
 await evalPage("(()=>{const b=[...document.querySelectorAll('[data-quest-id=day-tidy] button')].find(b=>b.textContent==='해냈어요!');b.click();b.click()})()");await delay(300);
 assert.equal(await evalPage("JSON.parse(localStorage.getItem('mochi.game.v1')).coins"),before+25);
 assert.equal(await evalPage("JSON.parse(localStorage.getItem('mochi.game.v1')).activityRecords['2026-10-15:day-tidy'].mode"),'light');
 await nav('?preview=game');await clearPopup();await text('오늘의 도전');
 assert.equal(await evalPage("JSON.parse(localStorage.getItem('mochi.game.v1')).coins"),before+25);
 await send('Emulation.setDeviceMetricsOverride',{width:360,height:540,deviceScaleFactor:1,mobile:true});await screenshot('quest-compact-short');
 await text('기록·취향');await text('음악');await text('연락·대화');await text('선호 저장');await delay(250);
 assert(await evalPage("JSON.parse(localStorage.getItem('mochi.game.v1')).preferences.missions.exclude.includes('contact')"));
 assert.equal(await evalPage("JSON.parse(localStorage.getItem('mochi.game.v1')).preferences.music"),'재즈');
 await text('오늘');assert(await evalPage("!!document.querySelector('[data-quest-id=day-checkin]')"));
 console.log('PASS web: 360/390/430 compact cards, no method/level UI, short height, optional questions, inline conversation, legacy light condition, double-click one payment, reload and today preservation.');
}finally{socket?.close();browser.kill();}
