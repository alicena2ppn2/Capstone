// Disposable-profile regression checks. Never attach to or seed a user's browser.
import { spawn } from 'node:child_process';
import { mkdtemp, mkdir, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import assert from 'node:assert/strict';
import { initialGame } from '../../shared/features/game.js';
import { seoulDateKey } from '../../shared/utils/seoulDate.js';
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
 const nav=async url=>{await send('Page.navigate',{url:'http://127.0.0.1:5180/'+url});await delay(800);};

 await send('Emulation.setDeviceMetricsOverride',{width:1280,height:1000,deviceScaleFactor:1,mobile:false});await nav('');await delay(1800);
 assert.equal(await evalPage("Math.round(document.querySelector('.is-login').getBoundingClientRect().width)"),390);
 assert.equal(await evalPage("Math.round(document.querySelector('.is-login').getBoundingClientRect().height)"),844);
 await screenshot('login-desktop-phone');
 for(const width of [360,390,430]){
 await send('Emulation.setDeviceMetricsOverride',{width,height:640,deviceScaleFactor:1,mobile:true});
 await nav('');await delay(300);
 assert(await evalPage("!!document.querySelector('.login-screen')"));
 assert(!await evalPage("!!document.querySelector('.home-screen')"));
 assert.equal(await evalPage('localStorage.length'),0);
 assert(await evalPage("[...document.querySelectorAll('.provider-button img')].every(i=>i.complete&&i.naturalWidth>0)"));
 assert(await evalPage('document.documentElement.scrollWidth<=innerWidth'));
 await screenshot('login-'+width);
 }
 await click('.kakao');assert(await evalPage("document.querySelector('.login-message').textContent.includes('준비')"));assert.equal(await evalPage('localStorage.length'),0);
 await click('.google');assert(!await evalPage("!!document.querySelector('.home-screen')"));
 await send('Emulation.setDeviceMetricsOverride',{width:360,height:480,deviceScaleFactor:1,mobile:true});await screenshot('login-short');
 await click('.login-preview');assert(await evalPage("!!document.querySelector('.home-screen')"));
 await nav('?preview=game');assert(await evalPage("!!document.querySelector('.home-screen')"));
 console.log('Login Edge: official assets, 360/390/430 and short screen, unconfigured failures, no login storage mutation, DEV game entry passed');
}finally{if(send)await send('Browser.close').catch(()=>{});socket?.close();browser.kill();}
