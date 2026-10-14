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







 await send('Page.addScriptToEvaluateOnNewDocument',{source:`(()=>{const D=Date;window.__missionNow='2026-10-15T03:00:00Z';window.Date=class extends D{constructor(...args){super(...(args.length?args:[window.__missionNow]));}static now(){return new D(window.__missionNow).getTime();}};})()`});
 const clearPopup=()=>evalPage("document.querySelector('.attendance-close')?.click()");
 await nav('?preview=game');await clearPopup();
 const seed={...initialGame(),coins:450,missionModes:{'2026-10-15:day-cup':'light'},preferences:{missions:{reviewed:true,activities:[],exclude:['contact']}},dailyMissions:{'2026-10-15':{version:1,activities:[{id:'day-water',slot:0},{id:'day-cup',slot:1},{id:'day-local',slot:2}],paused:[],replacements:[]}}};
 const setup=async g=>{await evalPage(`localStorage.setItem('mochi.game.v1',${JSON.stringify(JSON.stringify(g))})`);await nav('?preview=game');await clearPopup();await text('오늘의 도전');};
 const button=async(id,label)=>{await evalPage(`(()=>{const b=[...document.querySelectorAll('[data-quest-id=${id}] button')].find(b=>b.textContent===${JSON.stringify(label)});if(!b)throw Error('missing action');b.click()})()`);await delay(180);};
 await setup(seed);
 await button('day-water','다른 활동으로');assert(await evalPage("document.querySelector('[role=dialog]').textContent.includes('문밖 한 걸음')"));
 await evalPage("(()=>{const b=[...document.querySelectorAll('[role=dialog] button')].find(b=>b.textContent==='이 활동으로 바꾸기');b.click();b.click()})()");await delay(250);
 assert.equal(await evalPage("JSON.parse(localStorage.getItem('mochi.game.v1')).dailyMissions['2026-10-15'].replacements.length"),1);
 assert.equal(await evalPage("JSON.parse(localStorage.getItem('mochi.game.v1')).coins"),450);
 for(const width of [360,390,430]){
  await send('Emulation.setDeviceMetricsOverride',{width,height:740,deviceScaleFactor:1,mobile:true});await delay(180);
  await button('day-door','다른 활동으로');
  assert(await evalPage("document.querySelector('[role=dialog]').textContent.includes('지금 조건에 맞는 다른 활동을 모두 살펴봤어요')"));
  assert(!await evalPage("[...document.querySelectorAll('[role=dialog] button')].some(b=>b.textContent==='이 활동으로 바꾸기')"));
  assert(await evalPage("document.documentElement.scrollWidth<=innerWidth"));await screenshot('mission-replacement-exhausted-'+width);await click('.quest-sheet-close');
 }
 await nav('?preview=game');await clearPopup();await text('오늘의 도전');
 assert(await evalPage("JSON.parse(localStorage.getItem('mochi.game.v1')).dailyMissions['2026-10-15'].passed.includes('day-water')"));
 await button('day-cup','다른 활동으로');
 assert(!await evalPage("document.querySelector('[role=dialog] h3')?.textContent==='물 한 모금'"));await click('.quest-sheet-close');
 await button('day-door','다른 활동으로');await text('살펴본 활동 다시 보기');
 assert(await evalPage("document.querySelector('[role=dialog]').textContent.includes('물 한 모금')"));await screenshot('mission-replacement-revisit-430');await text('이 활동으로 바꾸기');
 assert.equal(await evalPage("JSON.parse(localStorage.getItem('mochi.game.v1')).coins"),450);
 assert(await evalPage("document.querySelector('[data-quest-id=day-cup]').textContent.includes('헹궈요')"));
 assert(!await evalPage("[...document.querySelectorAll('button')].some(b=>b.textContent==='방법 보기')"));
 await button('day-cup','도전하기');
 await evalPage("(()=>{const b=[...document.querySelectorAll('[data-quest-id=day-cup] button')].find(b=>b.textContent==='해냈어요!');b.click();b.click()})()");await delay(200);
 assert.equal(await evalPage("JSON.parse(localStorage.getItem('mochi.game.v1')).coins"),475);
 assert(!await evalPage("[...document.querySelectorAll('[data-quest-id=day-cup] button')].some(b=>b.textContent==='다른 활동으로'&&!b.disabled)"));
 // A failed persistence must neither announce success nor alter the plan/history.
 await button('day-local','다른 활동으로');
 const planBefore=await evalPage("JSON.stringify(JSON.parse(localStorage.getItem('mochi.game.v1')).dailyMissions['2026-10-15'])");
 await evalPage("window.__saveOriginal=Storage.prototype.setItem;Storage.prototype.setItem=function(k,v){if(k==='mochi.game.v1')throw Error('blocked');return window.__saveOriginal.call(this,k,v)}");
 await text('이 활동으로 바꾸기');assert(await evalPage("!!document.querySelector('[role=dialog] [role=alert]')"));
 assert.equal(await evalPage("JSON.stringify(JSON.parse(localStorage.getItem('mochi.game.v1')).dailyMissions['2026-10-15'])"),planBefore);
 await evalPage("Storage.prototype.setItem=window.__saveOriginal");await text('이 활동으로 바꾸기');assert(!await evalPage("!!document.querySelector('[role=dialog]')"));
 await evalPage("window.__missionNow='2026-10-15T15:00:00Z';document.dispatchEvent(new Event('visibilitychange'))");await delay(1200);await clearPopup();
 assert(await evalPage("!!JSON.parse(localStorage.getItem('mochi.game.v1')).dailyMissions['2026-10-16']"));
 assert.equal(await evalPage("JSON.parse(localStorage.getItem('mochi.game.v1')).dailyMissions['2026-10-16'].passed?.length??0"),0);
 console.log('PASS web 360/390/430: cross-slot history, reload, exhaustion, explicit revisit, legacy light condition, double-click one payment, storage failure/retry, Seoul midnight fresh history.');
}finally{socket?.close();browser.kill();}
