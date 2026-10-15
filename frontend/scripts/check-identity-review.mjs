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
 await send('Page.navigate',{url:'http://127.0.0.1:5180/?preview=friends&review=abc'});await delay(1000);
 const stored=await evalPage('JSON.stringify(localStorage)');
 const select=async(label,value)=>{await evalPage(`(()=>{const e=document.querySelector('[aria-label="${label}"]');e.value='${value}';e.dispatchEvent(new Event('change',{bubbles:true}));})()`);await delay(100);};
 const ids=await evalPage("[...document.querySelector('[aria-label=\"비교 친구\"]').options].map(o=>o.value)");assert.equal(ids.length,6);
 const shapes=await evalPage("[...document.querySelectorAll('.identity-grid svg')].map(e=>e.innerHTML)"); assert.equal(new Set(shapes).size,3);
 for(const id of ids){
   await select('비교 친구',id);
   assert.equal(await evalPage("document.querySelectorAll('.identity-grid article').length"),3);
   assert(await evalPage("[...document.querySelectorAll('.identity-grid svg')].every(e=>{const b=e.getBBox();return b.x>=0&&b.y>=0&&b.x+b.width<=200&&b.y+b.height<=210})"),'bounds '+id);
   assert(await evalPage("[...document.querySelectorAll('.identity-grid svg')].every(e=>!e.querySelector('animate')&&!e.hasAttribute('tabindex'))"));
   const face=await evalPage("[...document.querySelectorAll('.identity-grid svg')].slice(1).map(e=>e.querySelector('[data-part=face]').innerHTML)"); assert.equal(face[0],face[1],'B/C face '+id);
   const body=await evalPage(`(()=>{return [...document.querySelectorAll('.identity-grid svg')].slice(0,2).map(svg=>['tail','body','feet','arms','ears','head','accessory'].map(part=>{const group=[...svg.querySelectorAll('g')].find(g=>g.dataset.part===part||(g.id&&g.id.endsWith('-'+part)));return group?.innerHTML.replace(/_r_[^_]+_/g,'id')??null}));})()`);assert.deepEqual(body[0],body[1],'A/B non-face '+id);
   await screenshot('identity-'+id+'-abc');
 }
 await text('같은 안의 6종');
 for(const plan of ['A','B','C']) {await select('비교 안',plan);assert.equal(await evalPage("document.querySelectorAll('.identity-grid article').length"),6);await screenshot('identity-six-'+plan);}
 const eyes=await evalPage("[...document.querySelectorAll('.identity-grid svg [data-part=eyes]')].map(e=>e.innerHTML)");assert.equal(new Set(eyes).size,6);
 await select('비교 배경','room');await screenshot('identity-six-C-room');
 for(const width of [360,390,430]) {await send('Emulation.setDeviceMetricsOverride',{width,height:600,deviceScaleFactor:1,mobile:true});assert(await evalPage('document.documentElement.scrollWidth<=innerWidth+1'));}
 for(const size of [200,180,110,64,40]) {await select('비교 크기',size);assert(await evalPage(`[...document.querySelectorAll('.identity-grid .identity-art')].every(e=>Math.abs(e.getBoundingClientRect().width-${size})<1&&e.getAttribute('preserveAspectRatio')==='xMidYMid meet')`));}
 await screenshot('identity-mobile-40');
 assert.equal(await evalPage('JSON.stringify(localStorage)'),stored);
 console.log('PASS 18 static variants, B/C face identical, six distinct eye drawings, bounds, exact 200/180/110/64/40 sizes, 360/390/430 widths, no storage mutation.');
} finally {if(socket?.readyState===1){try{await Promise.race([send('Browser.close'),delay(1000)]);}catch{}}socket?.close();browser.kill();}
