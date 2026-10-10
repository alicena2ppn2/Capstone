// Dedicated headless profile only; never connects to the user's browser/profile.
import { spawn } from 'node:child_process';
import { mkdtemp, mkdir, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { resolve, join } from 'node:path';
import assert from 'node:assert/strict';
const delay = ms => new Promise(done => setTimeout(done, ms));
const directory = resolve('../artifacts/friend-preview');
await mkdir(directory, { recursive: true });
const profile = await mkdtemp(join(tmpdir(), 'capstone-friend-check-'));
const browser = spawn('C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', ['--headless', '--disable-gpu', '--no-first-run', '--no-default-browser-check', '--remote-debugging-port=9339', `--user-data-dir=${profile}`, 'about:blank'], { windowsHide: true, stdio: 'ignore' });
let socket;
try {
  let tabs;
  for (let i = 0; i < 50; i++) { try { tabs = await (await fetch('http://127.0.0.1:9339/json')).json(); break; } catch { await delay(200); } }
  assert(tabs?.length, 'Headless browser did not start');
  socket = new WebSocket(tabs.find(tab => tab.type === 'page').webSocketDebuggerUrl);
  await new Promise((done, fail) => { socket.onopen = done; socket.onerror = fail; });
  let serial = 0;
  const pending = new Map();
  socket.onmessage = event => { const message = JSON.parse(event.data); const entry = pending.get(message.id); if (entry) { pending.delete(message.id); message.error ? entry.reject(new Error(JSON.stringify(message.error))) : entry.resolve(message.result); } };
  const send = (method, params = {}) => new Promise((resolve, reject) => { const id = ++serial; pending.set(id, { resolve, reject }); socket.send(JSON.stringify({ id, method, params })); });
  const evaluate = async expression => { const result = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true }); assert(!result.exceptionDetails, JSON.stringify(result.exceptionDetails)); return result.result.value; };
  const screenshot = async name => { const result = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: true }); await writeFile(join(directory, name), Buffer.from(result.data, 'base64')); };
  await send('Page.enable');
  if (!process.argv.includes('--expo-only')) {
  await send('Emulation.setDeviceMetricsOverride', { width: 1200, height: 2400, deviceScaleFactor: 1, mobile: false });
  await send('Page.navigate', { url: 'http://localhost:5180/?preview=friends' });
  for (let i = 0; i < 50; i++) { if (await evaluate("!!document.querySelector('.friend-preview-card')")) break; await delay(200); }
  await evaluate('document.fonts.ready.then(() => true)');
  assert.equal(await evaluate("document.querySelectorAll('.friend-preview-card').length"), 3);
  assert.equal(await evaluate("document.querySelectorAll('.friend-preview-outfits figure').length"), 12);
  assert.equal(await evaluate('localStorage.length'), 0, 'Preview wrote game storage');
  const clips = await evaluate("Array.from(document.querySelectorAll('clipPath')).map(node=>node.id)");
  assert.equal(new Set(clips).size, clips.length, 'SVG clipping IDs collide');
  await screenshot('web-compare.png');
  for (let index = 0; index < 3; index++) {
    await evaluate(`document.querySelectorAll('.friend-preview-card button')[${index}].click()`);
    await evaluate("document.querySelector('.home-character svg').dispatchEvent(new KeyboardEvent('keydown',{key:'Enter',bubbles:true}))");
    assert.equal(await evaluate("document.querySelectorAll('.home-character .friend-particles').length"), 1);
    await evaluate("document.querySelector('.home-character svg').dispatchEvent(new MouseEvent('click',{bubbles:true}))");
    assert.equal(await evaluate("document.querySelectorAll('.home-character .friend-particles').length"), 1, 'Repeated input stacked particles');
    await delay(1150);
    assert.equal(await evaluate("document.querySelectorAll('.home-character .friend-particles').length"), 0);
    const blinked = await evaluate("new Promise(resolve=>{const svg=document.querySelector('.home-character svg');let seen=false;const observer=new MutationObserver(()=>{if(svg.querySelector('.is-blinking'))seen=true;});observer.observe(svg,{subtree:true,attributes:true});setTimeout(()=>{observer.disconnect();resolve(seen)},6800)})");
    assert(blinked, `Character ${index} did not blink`);
    await evaluate("document.querySelector('.friend-preview-controls button').click()");
    assert.equal(await evaluate("document.querySelectorAll('.home-character .friend-body.is-joy').length"), 1);
    await delay(1150);
    assert.equal(await evaluate("document.querySelectorAll('.home-character .friend-body.is-joy').length"), 0);
    await evaluate("(()=>{const el=document.querySelectorAll('.friend-preview-controls select')[1];const setter=Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype,'value').set;setter.call(el,el.options[1].value);el.dispatchEvent(new Event('change',{bubbles:true}));})()");
    assert.equal(await evaluate("document.querySelectorAll('.home-character .friend-body.is-joy').length"), 1, 'Outfit change did not celebrate');
    await delay(1150);
    await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 700, deviceScaleFactor: 1, mobile: true });
    await evaluate("document.querySelector('.friend-preview-comparison').scrollIntoView()");
    await screenshot(`room-${index + 1}.png`);
    await send('Emulation.setDeviceMetricsOverride', { width: 1200, height: 2400, deviceScaleFactor: 1, mobile: false });
    await evaluate("(()=>{const el=document.querySelectorAll('.friend-preview-controls select')[1];el.value='';el.dispatchEvent(new Event('change',{bubbles:true}));})()");
  }
  for (const width of [360, 390, 430]) {
    await send('Emulation.setDeviceMetricsOverride', { width, height: 600, deviceScaleFactor: 1, mobile: true });
    await evaluate(`(()=>{const el=document.querySelector('.friend-preview-controls select');el.value='${width}';el.dispatchEvent(new Event('change',{bubbles:true}));})()`);
    assert(await evaluate('document.documentElement.scrollWidth <= innerWidth'), `Horizontal overflow at ${width}`);
  }
  assert.equal(await evaluate('localStorage.length'), 0);
  await send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'reduce' }] });
  await evaluate("document.querySelector('.friend-preview-controls button').click()");
  assert.equal(await evaluate("getComputedStyle(document.querySelector('.home-character .friend-body')).animationName"), 'none');
  console.log('PASS: 3 friends, 12 outfits, unique clips, keyboard/tap, repeated input, blink, joy/expiry, outfit reaction, 360/390/430 overflow, reduced motion, no localStorage writes.');
  }
  await send('Emulation.setEmulatedMedia', { features: [] });
  await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 800, deviceScaleFactor: 1, mobile: true });
  await send('Page.navigate', { url: 'http://localhost:8081/friend-preview' });
  let mobileReady = false;
  for (let i = 0; i < 120; i++) { mobileReady = await evaluate("document.body.innerText.includes('새 친구 디자인 미리보기') && document.querySelectorAll('svg clipPath').length >= 3"); if (mobileReady) break; await delay(500); }
  await screenshot('expo-web-preview.png');
  assert(mobileReady, `Expo web preview did not render: ${await evaluate('document.body.innerText.slice(0,2500)')}`);
  assert.equal(await evaluate('localStorage.length'), 0, 'Expo preview initialized game storage');
  assert(await evaluate('document.documentElement.scrollWidth <= innerWidth'), 'Expo preview horizontal overflow');
  await screenshot('expo-web-preview.png');
  console.log('PASS: Expo web route renders native SVG, no horizontal overflow or localStorage writes. Native iPhone/Android device motion remains unverified.');
  await send('Browser.close');
} finally { socket?.close(); browser.kill(); }
