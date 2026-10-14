// Disposable-profile regression checks. Never attach to or seed a user's browser.
import { spawn } from 'node:child_process';
import { mkdtemp, mkdir, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import assert from 'node:assert/strict';


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
 const nav=async url=>{await send('Page.navigate',{url:'http://127.0.0.1:5191/'+url});await delay(1200);};






 await nav('');await evalPage('document.fonts.ready');
 assert.equal(await evalPage("document.querySelectorAll('.candidate:not([hidden])').length"),3);
 assert.equal(await evalPage("localStorage.length"),0);
 await send('Emulation.setDeviceMetricsOverride',{width:1440,height:1160,deviceScaleFactor:1,mobile:false});await screenshot('quest-review-three-candidates');
 for(const candidate of ['A','B','C']){
  await nav('?view='+candidate);
  await screenshot('quest-review-'+candidate);
  for(const width of [360,390,430]){
   await send('Emulation.setDeviceMetricsOverride',{width,height:844,deviceScaleFactor:1,mobile:true});await nav('?view='+candidate+'&width='+width);
   assert(await evalPage('document.documentElement.scrollWidth<=innerWidth'));
   assert(await evalPage("document.querySelector('.candidate:not([hidden]) .phone .bottom').getBoundingClientRect().height>44"));
  }
 }
 await send('Emulation.setDeviceMetricsOverride',{width:1280,height:1080,deviceScaleFactor:1,mobile:false});await nav('?view=B');
 await click('#phone-B [data-action="4"]');assert(await evalPage("document.querySelector('#phone-B [data-action=\"4\"]').textContent==='해냈어요!'"));await click('#phone-B [data-action="4"]');assert.equal(await evalPage("document.querySelector('#phone-B .count').textContent.trim()"),'3 / 6');
 assert.equal(await evalPage('localStorage.length'),0);
 console.log('PASS standalone A/B/C at 360/390/430, preview actions only, no storage writes, three candidate screenshots captured.');
}finally{if(send)await send('Browser.close').catch(()=>{});socket?.close();browser.kill();}
