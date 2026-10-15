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
const output = resolve('../artifacts/ui-review/structure-20261015'); await mkdir(output, { recursive: true });
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
 await send('Page.navigate',{url:process.env.MOCHI_NATIVE_PREVIEW_URL ?? 'http://localhost:5183/'});
 let ready=false;for(let i=0;i<100;i++){if(await evalPage("document.body.textContent.includes('개발용 게임 미리보기')")){ready=true;break;}await delay(700);}assert(ready,await evalPage('document.body.textContent'));

 await screenshot('login');await nativeText('개발용 게임 미리보기');await delay(1800);
 const dismiss=async()=>{if(await evalPage("[...document.querySelectorAll('[role=button]')].some(e=>e.textContent.trim()==='닫기')"))await nativeText('닫기');};await dismiss();
 const game=()=>evalPage("JSON.parse(localStorage.getItem(Object.keys(localStorage).find(k=>k.endsWith('mochi.game.v1'))))");
 const wardrobe=()=>evalPage("JSON.parse(localStorage.getItem(Object.keys(localStorage).find(k=>k.endsWith('mochi.wardrobe.v1'))))");
 for(const width of [360,390,430]){
  await send('Emulation.setDeviceMetricsOverride',{width,height:width===360?600:844,deviceScaleFactor:1,mobile:true});
  assert(await evalPage('document.documentElement.scrollWidth<=innerWidth'));await screenshot('home-'+width);
  await nativeText('오늘의 도전');assert(await evalPage("document.body.textContent.includes('오늘의 활동 3가지')"));await screenshot('missions-'+width);await click('[aria-label="홈 화면으로 돌아가기"]');
 }
 await nativeText('오늘의 도전');await nativeText('다른 활동으로');await nativeText('이 활동으로 바꾸기');
 const before=await game();await nativeText('도전하기');await nativeText('해냈어요!');const completed=await game();assert.equal(completed.coins,before.coins+25);assert.equal(completed.xp-before.xp,completed.questReward.xp);assert(completed.questReward.xp>0);await click('[aria-label="홈 화면으로 돌아가기"]');
 await nativeText('일기');await nativeText('오늘 일기 쓰기');
 await evalPage("(()=>{const el=document.querySelector('[aria-label=\"오늘의 일기\"]');Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype,'value').set.call(el,'구조 정리 후 남긴 테스트 일기');el.dispatchEvent(new Event('input',{bubbles:true}));})()");await delay(400);await nativeText('일기 저장');await delay(500);assert(Object.values((await game()).journals).includes('구조 정리 후 남긴 테스트 일기'));await screenshot('diary');await click('[aria-label="홈 화면으로 돌아가기"]');
 await nativeText('꾸미기');await nativeText('옷 꾸미기');const coins=(await game()).coins;await nativeText('구매하기');assert.equal((await game()).coins,coins-120);assert((await wardrobe()).owned.includes('sky'));assert.equal((await wardrobe()).outfit,null);await nativeText('장착하기');assert.equal((await wardrobe()).outfit,'sky');await screenshot('shop');await click('[aria-label="홈 화면으로 돌아가기"]');await screenshot('equipped-home');
 const savedGame=await game(),savedWardrobe=await wardrobe();await send('Page.reload');await delay(1700);await nativeText('개발용 게임 미리보기');await delay(1300);await dismiss();assert.equal((await game()).coins,savedGame.coins);assert.deepEqual((await game()).journals,savedGame.journals);assert.deepEqual(await wardrobe(),savedWardrobe);
 await nativeText('방문하기');await screenshot('neighbors');await click('[aria-label="홈 화면으로 돌아가기"]');await nativeText('방명록');await screenshot('guestbook');await click('[aria-label="홈 화면으로 돌아가기"]');await click('[aria-label="설정"]');await nativeText('로그아웃');assert(await evalPage("Boolean(document.querySelector('[aria-label=\"카카오 로그인\"]'))"));
 await writeFile(join(output,'native-console.json'),JSON.stringify(consoleErrors,null,2));assert.equal(consoleErrors.length,0,JSON.stringify(consoleErrors));console.log('Native console diagnostics:',JSON.stringify(consoleErrors));
 console.log('PASS Expo web: 360/390/430 and short-height layouts, replacement, real local quest reward, diary save, clothing purchase/equip, reload persistence, menus and logout. No physical device or live server auth check.');
}finally{if(send)await send('Browser.close').catch(()=>{});socket?.close();browser.kill();}
