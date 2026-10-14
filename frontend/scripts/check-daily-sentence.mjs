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





 await send('Page.addScriptToEvaluateOnNewDocument',{source:`(()=>{const RealDate=Date;window.__sentenceNow=new RealDate('2026-10-14T14:59:58Z').getTime();window.Date=class extends RealDate{constructor(...args){super(...(args.length?args:[window.__sentenceNow]));}static now(){return window.__sentenceNow;}};})()`});
 await send('Emulation.setTimezoneOverride',{timezoneId:'America/Los_Angeles'});
 const clearPopup=()=>evalPage("document.querySelector('.attendance-close')?.click()");
 await nav('?preview=game');await clearPopup();await evalPage('document.fonts.ready');
 const original=await evalPage("document.querySelector('.daily-sentence').dataset.sentenceId");
 assert.equal(await evalPage("document.querySelector('.daily-sentence').dataset.seoulDay"),'2026-10-14');
 const balance=await evalPage("(()=>{const g=JSON.parse(localStorage.getItem('mochi.game.v1'));return [g.xp,g.coins]})()");
 await evalPage("document.querySelector('.potato-interactive').dispatchEvent(new MouseEvent('click',{bubbles:true}))");await delay(100);assert(await evalPage("!!document.querySelector('.potato-effects')"));assert.equal(await evalPage("document.querySelector('.daily-sentence').dataset.sentenceId"),original);await delay(1100);
 for(const width of [360,390,430]){
  await send('Emulation.setDeviceMetricsOverride',{width,height:844,deviceScaleFactor:1,mobile:true});await delay(200);
  assert(await evalPage('document.documentElement.scrollWidth<=innerWidth'));
  assert(await evalPage("(()=>{const b=document.querySelector('.daily-sentence').getBoundingClientRect(),c=document.querySelector('.home-character').getBoundingClientRect(),m=document.querySelector('.home-room-menus').getBoundingClientRect();return b.top>=c.top+c.height*.85&&b.top>=m.bottom-1&&b.left>=0&&b.right<=innerWidth})()"));
  assert(await evalPage(`(()=>{const b=document.querySelector(".daily-sentence").getBoundingClientRect(),w=document.querySelector('.home-room-scenery svg rect[x="114"]').getBoundingClientRect(),clock=document.querySelector('.home-room-scenery svg g[transform="translate(314 158)"]').getBoundingClientRect(),cal=document.querySelector('.home-room-scenery svg g[transform="translate(18 126)"]').getBoundingClientRect();const overlaps=r=>b.left<r.right&&b.right>r.left&&b.top<r.bottom&&b.bottom>r.top;return !overlaps(w)&&!overlaps(clock)&&!overlaps(cal)})()`));
  await screenshot('daily-sentence-home-'+width);
 }
 const characters=await evalPage("(async()=>{const {CHARACTERS}=await import('/src/utils/game.js');return CHARACTERS.map(c=>c.id)})()");
 for(const id of characters){
  await evalPage(`(()=>{const g=JSON.parse(localStorage.getItem('mochi.game.v1'));g.characters=${JSON.stringify(characters)};g.character=${JSON.stringify(id)};localStorage.setItem('mochi.game.v1',JSON.stringify(g));})()`);
  await nav('?preview=game');await clearPopup();assert.equal(await evalPage("document.querySelector('.daily-sentence').dataset.sentenceId"),original);
  assert(await evalPage("(()=>{const b=document.querySelector('.daily-sentence').getBoundingClientRect(),c=document.querySelector('.home-character').getBoundingClientRect();return b.top>=c.top+c.height*.85})()"));
  if(['pink','proto-pear','draft-deer'].includes(id))await screenshot('daily-sentence-'+id);
 }
 await evalPage('window.__sentenceNow=new Date("2026-10-14T15:00:00Z").getTime()');await delay(1200);await clearPopup();assert.equal(await evalPage("document.querySelector('.daily-sentence').dataset.seoulDay"),'2026-10-15');assert.notEqual(await evalPage("document.querySelector('.daily-sentence').dataset.sentenceId"),original);
 await evalPage('window.__sentenceNow=new Date("2026-10-16T15:01:00Z").getTime();window.dispatchEvent(new Event("focus"));document.dispatchEvent(new Event("visibilitychange"));');await delay(80);await clearPopup();assert.equal(await evalPage("document.querySelector('.daily-sentence').dataset.seoulDay"),'2026-10-17');
 assert.deepEqual(await evalPage("(()=>{const g=JSON.parse(localStorage.getItem('mochi.game.v1'));return [g.xp,g.coins]})()"),balance);
 await send('Emulation.setDeviceMetricsOverride',{width:360,height:600,deviceScaleFactor:1,mobile:true});
 const petSize=await evalPage("document.querySelector('.home-character').getBoundingClientRect().width");
 await evalPage("document.querySelector('.daily-sentence p').style.fontSize='28px';document.querySelector('.daily-sentence p').style.lineHeight='1.6';");await delay(300);
 assert.equal(await evalPage("document.querySelector('.home-character').getBoundingClientRect().width"),petSize);
 assert(await evalPage("(()=>{const b=document.querySelector('.daily-sentence').getBoundingClientRect(),m=document.querySelector('.home-room-menus').getBoundingClientRect();return b.top>=m.bottom-1&&b.left>=0&&b.right<=innerWidth})()"));await screenshot('daily-sentence-large-text-short');
 await send('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:'reduce'}]});assert.equal(await evalPage("getComputedStyle(document.querySelector('.daily-sentence p')).animationName"),'none');
 console.log('PASS Seoul midnight/live foreground refresh, Los Angeles device zone, all 12 characters, tap effects, 360/390/430, short screen and 200% sentence text, no XP/coin changes. Native device execution not verified.');
}finally{if(send)await send('Browser.close').catch(()=>{});socket?.close();browser.kill();}
