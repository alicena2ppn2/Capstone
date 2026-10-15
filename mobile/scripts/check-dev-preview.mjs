// Disposable-profile regression checks. Never attach to or seed a user's browser.
import { spawn } from 'node:child_process';
import { mkdtemp, mkdir, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import assert from 'node:assert/strict';
const delay = ms => new Promise(done => setTimeout(done, ms));
const profile = await mkdtemp(join(tmpdir(), 'capstone-ui-review-'));
const output = resolve('../artifacts/ui-review/dev-frame-20261015'); await mkdir(output, { recursive: true });
const port = 9500 + Math.floor(Math.random() * 3000);
const browser = spawn('C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', ['--headless', '--disable-gpu', '--no-first-run', `--remote-debugging-port=${port}`, `--user-data-dir=${profile}`, 'about:blank'], { windowsHide: true, stdio: 'ignore' });
let socket, send;
try {
 let tabs; for (let i=0;i<50;i++) { try { tabs=await (await fetch(`http://127.0.0.1:${port}/json`)).json(); break; } catch { await delay(200); } }
 assert(tabs?.length); socket=new WebSocket(tabs.find(t=>t.type==='page').webSocketDebuggerUrl);
 await new Promise((done,fail)=>{socket.onopen=done;socket.onerror=fail;});
 const consoleErrors=[];
 let serial=0; const pending=new Map();
 socket.onmessage=e=>{const m=JSON.parse(e.data),p=pending.get(m.id);if(m.method==='Runtime.consoleAPICalled'&&m.params.type==='error')consoleErrors.push(m.params.args.map(a=>a.value??a.description));if(p){pending.delete(m.id);m.error?p.reject(Error(JSON.stringify(m.error))):p.resolve(m.result);}};
 send=(method,params={})=>new Promise((resolve,reject)=>{const id=++serial;pending.set(id,{resolve,reject});socket.send(JSON.stringify({id,method,params}));});
 const evalPage=async expression=>{const r=await send('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});assert(!r.exceptionDetails,JSON.stringify(r.exceptionDetails));return r.result.value;};
 const click=async selector=>{await evalPage(`document.querySelector(${JSON.stringify(selector)}).click()`);await delay(180);};
 const text=async value=>{await evalPage(`(()=>{const el=[...document.querySelectorAll('button')].find(b=>b.textContent.trim()===${JSON.stringify(value)});if(!el)throw Error('missing button '+${JSON.stringify(value)});el.click()})()`);await delay(180);};
 const screenshot=async name=>{const r=await send('Page.captureScreenshot',{format:'png',captureBeyondViewport:true});await writeFile(join(output,name+'.png'),Buffer.from(r.data,'base64'));};


 await send('Runtime.enable');await send('Page.enable');
 await send('Emulation.setDeviceMetricsOverride',{width:1280,height:1000,deviceScaleFactor:1,mobile:false});
 await send('Page.navigate',{url:'http://localhost:5184/'});await delay(1600);
 async function appContext(){const tree=await send('Page.getFrameTree');const frame=tree.frameTree.childFrames?.find(f=>f.frame.url.startsWith('http://localhost:5183/'));assert(frame,'Real Expo iframe should load');return (await send('Page.createIsolatedWorld',{frameId:frame.frame.id,worldName:'preview-size-check'})).executionContextId;}
 const childEval=async(code,contextId)=>{const r=await send('Runtime.evaluate',{expression:code,contextId,returnByValue:true,awaitPromise:true});assert(!r.exceptionDetails,JSON.stringify(r.exceptionDetails));return r.result.value;};
 let context=await appContext();
 for(const [width,height] of [[1280,1000],[1280,700],[800,600]]){
  await send('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:false});await delay(180);
  const metrics=await evalPage("(()=>{const f=document.querySelector('iframe'),r=f.getBoundingClientRect();return {width:f.offsetWidth,height:f.offsetHeight,renderWidth:r.width,renderHeight:r.height,top:r.top,bottom:r.bottom,left:r.left,right:r.right,windowWidth:innerWidth,windowHeight:innerHeight}})()");
  assert.equal(metrics.width,390);assert.equal(metrics.height,844);assert(Math.abs(metrics.renderWidth/metrics.renderHeight-390/844)<.001);assert(metrics.top>=0&&metrics.bottom<=height&&metrics.left>=0&&metrics.right<=width);
  assert.deepEqual(await childEval('({width:innerWidth,height:innerHeight})',context),{width:390,height:844});
  await screenshot(`desktop-${width}x${height}`);
 }
 let ready=false;for(let i=0;i<50;i++){if(await childEval("document.body.textContent.includes('개발용 게임 미리보기')",context)){ready=true;break;}await delay(250);}assert(ready);
 await childEval("[...document.querySelectorAll('[role=button]')].find(e=>e.textContent.trim()==='개발용 게임 미리보기').click()",context);await delay(1500);
 await childEval("[...document.querySelectorAll('[role=button]')].find(e=>e.textContent.trim()==='닫기')?.click()",context);
 await childEval("[...document.querySelectorAll('[role=button]')].find(e=>e.textContent.trim()==='오늘의 도전').click()",context);await delay(400);assert(await childEval("document.body.textContent.includes('오늘의 활동 3가지')",context));
 await childEval("[...document.querySelectorAll('[role=button]')].find(e=>e.textContent.trim()==='이번 주').click()",context);await delay(250);assert(await childEval("document.body.textContent.includes('이번 주 바깥 발견')",context));
 await childEval("document.querySelector('[aria-label=\"홈 화면으로 돌아가기\"]').click()",context);await delay(200);await screenshot('interactive-home');
 assert.equal(consoleErrors.length,0,JSON.stringify(consoleErrors));
 console.log('PASS: iframe inner viewport 390x844, uniform fit at three desktop sizes, actual Expo preview/home/quest/tab navigation, console errors 0. Display wrapper only; not iPhone emulation.');
}finally{if(send)await send('Browser.close').catch(()=>{});socket?.close();browser.kill();}
