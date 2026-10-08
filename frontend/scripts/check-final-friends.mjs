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
 const nav=async url=>{await send('Page.navigate',{url:'http://127.0.0.1:5180/'+url});await delay(800);};
 const geometry=selector=>evalPage(`(()=>{const e=document.querySelector(${JSON.stringify(selector)});return [...e.querySelectorAll('path,ellipse,circle')].filter(n=>!n.closest('defs')).map(n=>[n.tagName,[...n.attributes].filter(a=>!['id','class'].includes(a.name)).map(a=>[a.name,a.value]).sort()]);})()`);
 const { FINAL_FRIENDS }=await import('../src/utils/finalFriends.js');
 // Store the exact chosen A/B/C painted shapes before comparing actual game art.
 await nav('?preview=friends&review=abc'); const expected={};
 for(const friend of FINAL_FRIENDS){await evalPage(`(()=>{const e=document.querySelector('[aria-label="비교 친구"]');e.value=${JSON.stringify(friend.id)};e.dispatchEvent(new Event('change',{bubbles:true}));})()`);await delay(80);expected[friend.id]=await geometry(`[data-review="${friend.id}:${friend.revision==='A-no-spots'?'A':friend.revision}"] svg`);if(friend.id==='draft-deer')expected[friend.id]=expected[friend.id].filter(([tag,attrs])=>!(['67','77','123','133'].includes(attrs.find(([key])=>key==='cx')?.[1])&&['57','64'].includes(attrs.find(([key])=>key==='cy')?.[1])));}
 await nav('?preview=friends');const stored=await evalPage('JSON.stringify(localStorage)');
 for(const friend of FINAL_FRIENDS)assert.deepEqual(await geometry(`[data-review-id="${friend.id}"] svg`),expected[friend.id],friend.name+' exact selected art');
 for(const clothes of ['sky','berry','leaf','star']){
   await evalPage(`(()=>{const e=document.querySelector('[aria-label="미리보기 의상"]');e.value='${clothes}';e.dispatchEvent(new Event('change',{bubbles:true}));})()`);await delay(1200);
   assert.equal(await evalPage("document.querySelectorAll('.friend-review-grid')[0].querySelectorAll('.prototype-svg [clip-path]').length"),12); // 2 fitted layers × 6.
   assert.equal(await evalPage("document.querySelectorAll('[id]').length-new Set([...document.querySelectorAll('[id]')].map(n=>n.id)).size"),0);
   await screenshot('final-six-outfit-'+clothes);
 }
 await evalPage("(()=>{const e=document.querySelector('[aria-label=\"미리보기 의상\"]');e.value='';e.dispatchEvent(new Event('change',{bubbles:true}));})()");await delay(1200);
 for(const friend of FINAL_FRIENDS)assert.deepEqual(await geometry(`[data-review-id="${friend.id}"] svg`),expected[friend.id],friend.name+' undressed');
 await text('축하 반응');assert.equal(await evalPage("document.querySelectorAll('.friend-review-grid')[0].querySelectorAll('.prototype-svg .is-joy').length"),6);await delay(1200);
 await screenshot('final-six-basic');
 assert.equal(await evalPage('JSON.stringify(localStorage)'),stored);
 // A disposable profile only: actual shop, persistence, failure, quest and outfit flows.
 const day=seoulDateKey();let fixture={...initialGame(),xp:2400,coins:2000,attendance:{[day]:{type:'coins',amount:20}},nicknames:{potato:'내 감자'},custom:'keep',ownedDecor:['lamp-moon'],decor:{lamp:'lamp-moon'}};
 await nav('');await evalPage(`localStorage.setItem('mochi.game.v1',${JSON.stringify(JSON.stringify(fixture))});localStorage.setItem('mochi.wardrobe.v1',JSON.stringify({owned:['sky','berry','leaf','star'],outfit:null}));`);await nav('');
 const save=()=>evalPage("JSON.parse(localStorage.getItem('mochi.game.v1'))");
 await text('꾸미기');await evalPage("window.realSet=Storage.prototype.setItem;Storage.prototype.setItem=function(k,v){if(k==='mochi.game.v1')throw Error('test quota');return window.realSet.call(this,k,v)}");await click('[data-character="proto-pebble"] .shop-buy');assert(!await evalPage("!!document.querySelector('.character-welcome')"));assert(!(await save()).characters.includes('proto-pebble'));await evalPage('Storage.prototype.setItem=window.realSet');await click('.ui-back');
 for(const friend of FINAL_FRIENDS){
   await text('꾸미기');const before=await save();
   await evalPage(`(()=>{const b=document.querySelector('[data-character="${friend.id}"] .shop-buy');b.click();b.click();})()`);await delay(160);
   const after=await save();assert.equal(after.coins,before.coins-friend.price);assert.equal(after.character,before.character);assert.equal(after.characters.filter(id=>id===friend.id).length,1);
   await click('.character-welcome .ui-primary');assert.equal((await save()).character,friend.id);await click('.ui-back');
   const tap='.home-screen .prototype-svg';
   await evalPage(`document.querySelector(${JSON.stringify(tap)}).dispatchEvent(new KeyboardEvent('keydown',{key:'Enter',bubbles:true}))`);await delay(100);assert(await evalPage("!!document.querySelector('.home-screen .is-tap')"));
   await evalPage(`for(let i=0;i<20;i++)document.querySelector(${JSON.stringify(tap)}).dispatchEvent(new MouseEvent('click',{bubbles:true}))`);assert.equal(await evalPage("document.querySelectorAll('.home-screen .friend-particles').length"),1);await delay(1200);
   assert(await evalPage("[...document.querySelectorAll('.home-screen .friend-body')].every(e=>getComputedStyle(e).transform==='none')"));
   await nav('');assert.equal((await save()).character,friend.id);assert.equal((await save()).custom,'keep');assert.equal((await save()).nicknames.potato,'내 감자');
 }
 // Finish a real daily mission and return home: one joy then no replay on another visit.
 await text('오늘의 도전');
 const quest=await evalPage("[...document.querySelectorAll('.daily-discoveries [data-quest-id]')].find(e=>!e.querySelector('select')).dataset.questId");
 await click(`[data-quest-id="${quest}"] .shop-buy`);const before=await save();await click(`[data-quest-id="${quest}"] .shop-buy`);const after=await save();assert.equal(after.coins,before.coins+25);
 await click('.ui-back');assert(await evalPage("!!document.querySelector('.home-screen .is-joy')"));await delay(1200);await text('오늘의 도전');await click('.ui-back');assert(!await evalPage("!!document.querySelector('.home-screen .is-joy')"));
 let blink=false;for(let i=0;i<80;i++){if(await evalPage("!!document.querySelector('.home-screen .is-blinking')")){blink=true;break;}await delay(100);}assert(blink);
 await text('꾸미기');await text('의상');await text('입기');await click('.ui-back');assert(await evalPage("!!document.querySelector('.home-screen .is-joy')"));await delay(1200);
 await send('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:'reduce'}]});await evalPage("document.querySelector('.home-screen .prototype-svg').dispatchEvent(new MouseEvent('click',{bubbles:true}))");await delay(100);assert.equal(await evalPage("getComputedStyle(document.querySelector('.home-screen .is-tap')).animationName"),'none');await delay(1200);
 await screenshot('final-doto-home');
 for(const width of [360,390,430]){await send('Emulation.setDeviceMetricsOverride',{width,height:600,deviceScaleFactor:1,mobile:true});assert(await evalPage('document.documentElement.scrollWidth<=innerWidth+1'));}
 await text('꾸미기');assert.equal(await evalPage("document.querySelectorAll('[data-character]').length"),12);await screenshot('final-shop-mobile');
 await click('.ui-back');await evalPage(`localStorage.setItem('mochi.visitNotes.v1',JSON.stringify({yuna:[{id:'test-post',name:'나',variant:'draft-deer',text:'반가워요',date:${JSON.stringify(day)},source:'local'}]}))`);await text('방문하기');await text('내가 남긴 글');
 assert(await evalPage("(()=>{const b=[...document.querySelectorAll('button')].find(b=>b.textContent==='그 집 방명록 보기');const s=getComputedStyle(b);return b.classList.contains('ui-secondary')&&parseFloat(s.borderRadius)>=12&&b.getBoundingClientRect().height>=44})()"));await screenshot('visit-my-notes-rounded');await text('그 집 방명록 보기');assert(await evalPage("document.body.textContent.includes('복숭아산책')"));
 console.log('PASS exact selected 6 silhouettes, 24 fitted outfits, undress, distinct IDs, actual purchases/double clicks/select/reload/assets, real daily reward joy once, outfit joy, blink/touch/keyboard/reduced motion, mobile widths.');
} finally {if(socket?.readyState===1){try{await Promise.race([send('Browser.close'),delay(1000)]);}catch{}}socket?.close();browser.kill();}
