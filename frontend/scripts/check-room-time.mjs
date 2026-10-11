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



 await send('Page.addScriptToEvaluateOnNewDocument',{source:`(()=>{const RealDate=Date;window.__roomNow=new RealDate(2026,9,11,5,59,59).getTime();window.Date=class extends RealDate{constructor(...args){super(...(args.length?args:[window.__roomNow]));}static now(){return window.__roomNow;}};})()`});
 for(const width of [360,390,430]){
   await send('Emulation.setDeviceMetricsOverride',{width,height:844,deviceScaleFactor:1,mobile:true});await nav('?preview=game');await evalPage("document.querySelector('.attendance-close')?.click()");
   assert(await evalPage("document.querySelector('.room-time-accessible').textContent.includes('10월 11일')"));await screenshot('room-time-night-'+width);
   await evalPage('window.__roomNow=new Date(2026,9,11,6,0,0).getTime()');await delay(1300);await screenshot('room-time-day-'+width);
   assert(await evalPage("document.querySelector('.home-room svg rect[x=\"124\"]').getAttribute('fill')==='#D7ECF8'"));
   await evalPage('window.__roomNow=new Date(2026,9,11,18,0,0).getTime()');await delay(1300);assert(await evalPage("document.querySelector('.home-room svg rect[x=\"124\"]').getAttribute('fill')==='#344461'"));
   await evalPage('window.__roomNow=new Date(2026,9,12,0,0,0).getTime()');await delay(1300);await evalPage("document.querySelector('.attendance-close')?.click()");assert(await evalPage("document.querySelector('.room-time-accessible').textContent.includes('10월 12일')"));
   assert(await evalPage('document.documentElement.scrollWidth<=innerWidth'));
 }
 console.log('PASS room calendar/clock and live 06:00/18:00/midnight changes at 360/390/430, disposable Edge profile');
}finally{if(send)await send('Browser.close').catch(()=>{});socket?.close();browser.kill();}
