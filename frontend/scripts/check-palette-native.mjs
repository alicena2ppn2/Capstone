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
 const consoleErrors=[];
 let serial=0; const pending=new Map();
 socket.onmessage=e=>{const m=JSON.parse(e.data),p=pending.get(m.id);if(m.method==='Runtime.consoleAPICalled'&&m.params.type==='error')consoleErrors.push(m.params.args.map(a=>a.value??a.description));if(p){pending.delete(m.id);m.error?p.reject(Error(JSON.stringify(m.error))):p.resolve(m.result);}};
 send=(method,params={})=>new Promise((resolve,reject)=>{const id=++serial;pending.set(id,{resolve,reject});socket.send(JSON.stringify({id,method,params}));});
 const evalPage=async expression=>{const r=await send('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});assert(!r.exceptionDetails,JSON.stringify(r.exceptionDetails));return r.result.value;};
 const click=async selector=>{await evalPage(`document.querySelector(${JSON.stringify(selector)}).click()`);await delay(180);};
 const text=async value=>{await evalPage(`(()=>{const el=[...document.querySelectorAll('button')].find(b=>b.textContent.trim()===${JSON.stringify(value)});if(!el)throw Error('missing button '+${JSON.stringify(value)});el.click()})()`);await delay(180);};
 const screenshot=async name=>{const r=await send('Page.captureScreenshot',{format:'png',captureBeyondViewport:true});await writeFile(join(output,name+'.png'),Buffer.from(r.data,'base64'));};


 await send('Runtime.enable');await send('Page.enable'); await send('Emulation.setDeviceMetricsOverride',{width:1280,height:1000,deviceScaleFactor:1,mobile:false});
 const nav=async url=>{await send('Page.navigate',{url:'http://127.0.0.1:5180/'+url});await delay(1200);};


 const nativeText=async value=>{await evalPage(`(()=>{const el=[...document.querySelectorAll('[role=button]')].find(b=>b.textContent.trim()===${JSON.stringify(value)});if(!el)throw Error('missing native button '+${JSON.stringify(value)});el.click()})()`);await delay(800);};
 await send('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:true});
 await send('Page.navigate',{url:'http://127.0.0.1:5182/'});
 let ready=false;for(let i=0;i<100;i++){if(await evalPage("document.body.textContent.includes('개발용 게임 미리보기')")){ready=true;break;}await delay(700);}assert(ready,await evalPage('document.body.textContent'));
 await screenshot('palette-native-login');await nativeText('개발용 게임 미리보기');await delay(1800);await screenshot('palette-native-home');


 await nativeText('오늘의 도전');await screenshot('palette-native-missions');await click('[aria-label="홈 화면으로 돌아가기"]');await nativeText('꾸미기');await screenshot('palette-native-shop');
 await click('[aria-label="홈 화면으로 돌아가기"]');await nativeText('일기');await nativeText('오늘 일기 쓰기');await screenshot('palette-native-diary');
 await click('[aria-label="홈 화면으로 돌아가기"]');await nativeText('방문하기');await screenshot('palette-native-neighbors');
 await click('[aria-label="홈 화면으로 돌아가기"]');await nativeText('방명록');await screenshot('palette-native-guestbook');
 await click('[aria-label="홈 화면으로 돌아가기"]');await click('[aria-label="설정"]');await nativeText('로그아웃');assert(await evalPage("Boolean(document.querySelector('[aria-label=\"카카오 로그인\"]'))"));
 await writeFile(join(output,'palette-native-console.json'),JSON.stringify(consoleErrors,null,2));console.log('Native console errors',JSON.stringify(consoleErrors).slice(0,1200));
 console.log('PASS Expo development web: seven screens rendered at 390px and logout returns to login. Not a physical-device check.');
}finally{if(send)await send('Browser.close').catch(()=>{});socket?.close();browser.kill();}
