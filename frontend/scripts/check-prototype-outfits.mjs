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

 await send('Page.enable');
 await send('Emulation.setDeviceMetricsOverride',{width:1280,height:1000,deviceScaleFactor:1,mobile:false});
 await send('Page.navigate',{url:'http://127.0.0.1:5180/?preview=friends'});await delay(1000);
 const stored=await evalPage('JSON.stringify(localStorage)');
 // Compare painted geometry only: IDs/wrappers/clip definitions cannot change approved nude art.
 assert(await evalPage(`(()=>{const shape=e=>[...e.querySelectorAll('path,ellipse,circle')].filter(n=>!n.closest('defs')).map(n=>[n.tagName,[...n.attributes].filter(a=>!['id','class','transform'].includes(a.name)).map(a=>[a.name,a.value])]);return [...document.querySelectorAll('[data-baseline]')].filter(b=>b.dataset.baseline!=='proto-pebble').every(b=>JSON.stringify(shape(b))===JSON.stringify(shape(b.closest('article').querySelector('.prototype-svg'))));})()`));
 assert.equal(await evalPage("document.querySelectorAll('[id]').length-new Set([...document.querySelectorAll('[id]')].map(n=>n.id)).size"),0);
 for(const id of ['sky','berry','leaf','star','']) {
  await evalPage(`(()=>{const e=document.querySelector('[aria-label="미리보기 의상"]');Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype,'value').set.call(e,${JSON.stringify(id)});e.dispatchEvent(new Event('change',{bubbles:true}));})()`);await delay(1200);
  assert.equal(await evalPage("document.querySelectorAll('.friend-review-grid')[0].querySelectorAll('.prototype-svg [id$=outfit]').length"),id?3:0);
 }
 // Interactive primary preview only; other copies must remain quiet.
 await evalPage("document.querySelectorAll('.friend-review-grid')[0].querySelector('.prototype-svg').dispatchEvent(new MouseEvent('click',{bubbles:true}))");await delay(100);
 assert(await evalPage("!!document.querySelector('.prototype-nod')"));
 assert(await evalPage("getComputedStyle(document.querySelector('.prototype-svg .friend-body.is-tap')).transform!=='none'"));
 await evalPage("for(let i=0;i<20;i++)document.querySelectorAll('.friend-review-grid')[0].querySelector('.prototype-svg').dispatchEvent(new MouseEvent('click',{bubbles:true}))");
 assert.equal(await evalPage("document.querySelectorAll('.friend-review-grid')[0].querySelectorAll('.prototype-svg .friend-particles').length"),1);
 await delay(1200);assert.equal(await evalPage("document.querySelectorAll('.prototype-svg .friend-particles').length"),0);
 assert(await evalPage("[...document.querySelectorAll('.prototype-svg .friend-body')].every(e=>getComputedStyle(e).transform==='none')"));
 await evalPage("document.querySelectorAll('.friend-review-grid')[0].querySelectorAll('.prototype-svg')[1].dispatchEvent(new KeyboardEvent('keydown',{key:'Enter',bubbles:true}))");await delay(100);assert(await evalPage("!!document.querySelector('.prototype-wag')"));await delay(1200);
 await text('축하 반응');assert.equal(await evalPage("document.querySelectorAll('.friend-review-grid')[0].querySelectorAll('.prototype-svg .friend-body.is-joy').length"),6);await delay(1200);
 // Wait to observe at least one blink, then all eyes return to idle.
 let blink=false;for(let i=0;i<70;i++){if(await evalPage("!!document.querySelector('.prototype-svg .is-blinking')")){blink=true;break;}await delay(100);}assert(blink);
 await send('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:'reduce'}]});await text('축하 반응');assert(await evalPage("[...document.querySelectorAll('.prototype-nod,.prototype-wag,.prototype-tilt')].every(e=>getComputedStyle(e).animationName==='none')"));await delay(1200);
 await send('Emulation.setEmulatedMedia',{features:[]});
 await evalPage("document.querySelector('[aria-label=\"미리보기 의상\"]').value='sky';document.querySelector('[aria-label=\"미리보기 의상\"]').dispatchEvent(new Event('change',{bubbles:true}))");await delay(1200);
 await screenshot('friends-outfits-approved');
 for(const width of [360,390,430]) {await send('Emulation.setDeviceMetricsOverride',{width,height:600,deviceScaleFactor:1,mobile:true});assert(await evalPage('document.documentElement.scrollWidth<=innerWidth+1'));}
 await screenshot('friends-outfits-mobile');
 assert.equal(await evalPage('JSON.stringify(localStorage)'),stored);
 console.log('PASS unchanged Rani/Lulu nude geometry, 4 outfits × 3 original fittings, unique clip IDs, blink, click/keyboard, repeated click, joy, return idle, reduced motion, widths 360/390/430, no storage writes.');
} finally {if(socket?.readyState===1){try{await Promise.race([send('Browser.close'),delay(1000)]);}catch{}}socket?.close();browser.kill();}
