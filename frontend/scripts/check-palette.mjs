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


 const cssAudit=async screen=>{
   const metrics=await evalPage(`(()=>{
     const visible=el=>{const r=el.getBoundingClientRect();return r.width&&r.height&&r.top<innerHeight&&r.bottom>0&&!el.closest('[hidden]');};
     const rows=[...document.querySelectorAll('button,input,textarea,summary,h1,h2,h3,p,small,strong,span')].filter(el=>visible(el)&&[...el.childNodes].some(n=>n.nodeType===3&&n.textContent.trim())&&!el.closest('svg,.provider-button,.iphone-chrome'));
     const rgb=c=>{const p=c.match(/[\d.]+/g)?.map(Number);return p&&p[3]!==0?p.slice(0,3):null;};
     const lum=c=>{const a=c.map(x=>x/255).map(x=>x<=.04045?x/12.92:((x+.055)/1.055)**2.4);return a[0]*.2126+a[1]*.7152+a[2]*.0722;};
     const issues=[];for(const el of rows){const cs=getComputedStyle(el);let bg=null;for(let a=el;a&&!bg;a=a.parentElement)bg=rgb(getComputedStyle(a).backgroundColor);if(!bg)continue;const fg=rgb(cs.color);if(!fg)continue;const ratio=(Math.max(lum(fg),lum(bg))+.05)/(Math.min(lum(fg),lum(bg))+.05);if(ratio<4.5)issues.push({text:el.textContent.trim().slice(0,50),class:el.className,fg:cs.color,bg,ratio:+ratio.toFixed(2)});}
     return {width:innerWidth,pageWidth:document.documentElement.scrollWidth,issues,fonts:document.fonts.check('15px A2z')};
   })()`);assert(metrics.fonts);assert(metrics.pageWidth<=metrics.width+1,screen+' horizontal overflow');assert.equal(metrics.issues.length,0,screen+' contrast issues '+JSON.stringify(metrics.issues));return metrics;
 };
 const results=[];
 for(const width of [360,390,430]){
   await send('Emulation.setDeviceMetricsOverride',{width,height:844,deviceScaleFactor:1,mobile:true});
   await nav('?preview=game');await evalPage("document.querySelector('.attendance-close')?.click()");
   await evalPage('document.fonts.ready');results.push({width,screen:'home',...await cssAudit('home')});assert.equal(await evalPage("getComputedStyle(document.querySelector('.home-quest-start')).backgroundColor"),'rgb(57, 125, 120)');await screenshot('palette-after-home-'+width);
   await text('오늘의 도전');assert.equal(await evalPage("document.querySelectorAll('.routine-row').length"),3);assert.equal(await evalPage("document.querySelectorAll('.daily-discoveries .growth-quest').length"),3);results.push({width,screen:'missions',...await cssAudit('missions')});await screenshot('palette-after-missions-'+width);
   await click('.ui-back');await text('꾸미기');results.push({width,screen:'shop',...await cssAudit('shop')});await screenshot('palette-after-shop-'+width);
   await click('.ui-back');await text('일기');await text('오늘 일기 쓰기');results.push({width,screen:'diary',...await cssAudit('diary')});await screenshot('palette-after-diary-'+width);
   await click('.ui-back');await text('방문하기');results.push({width,screen:'neighbors',...await cssAudit('neighbors')});await screenshot('palette-after-neighbors-'+width);
   await click('.ui-back');await text('방명록');results.push({width,screen:'guestbook',...await cssAudit('guestbook')});await screenshot('palette-after-guestbook-'+width);
   await click('.ui-back');await click('[aria-label="설정"]');await text('로그아웃');results.push({width,screen:'login',...await cssAudit('login')});await screenshot('palette-after-login-'+width);
   assert.equal(await evalPage("getComputedStyle(document.querySelector('.provider-button.kakao')).backgroundColor"),'rgb(254, 229, 0)');
 }
 await send('Emulation.setDeviceMetricsOverride',{width:390,height:568,deviceScaleFactor:1,mobile:true});await nav('?preview=game');await evalPage("document.querySelector('.attendance-close')?.click()");await screenshot('palette-after-home-short');await text('오늘의 도전');await evalPage("document.querySelector('.phone-content').scrollTop=10000");await screenshot('palette-after-missions-short');
 await writeFile(join(output,'palette-metrics.json'),JSON.stringify(results,null,2));
 console.log('PASS seven screens at 360/390/430 and short height, six mission counts, font loading, login brand colors; contrast audit saved');
}finally{if(send)await send('Browser.close').catch(()=>{});socket?.close();browser.kill();}
