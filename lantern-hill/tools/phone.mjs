// Drive Lantern Hill as a phone: the installed Google Chrome, headless, over the DevTools protocol.
// No dependencies (Node 22+ for the built-in WebSocket).
//
// Phone emulation is switched on before the page loads, which matters: input.js reads
// matchMedia('(pointer: coarse)') once at load, and that is what shows the touch stick and Use
// button. Taps and drags are real touch events, so pointer and touch handlers both fire.
//
// Quick look, from lantern-hill/ with `rebar3 shell` running in server/:
//
//   node tools/phone.mjs http://localhost:8080/ --device iphone-15 --landscape --out shot.png
//
// In a script:
//
//   import { phone } from './phone.mjs';
//   const p = await phone('http://localhost:8080/', {device: 'pixel-7'});
//   await p.tap(200, 400);
//   await p.drag([[80, 700], [80, 620]], 1500);   // hold the stick forward for 1.5 s
//   console.log(await p.eval('document.title'));
//   await p.shot('after.png');
//   await p.close();
//
// What it can't tell you: frame rate (it renders on this computer's GPU, much faster than a phone's),
// how big things feel under a thumb, and iOS Safari quirks. Use a real phone on the LAN for those.

import { spawn } from 'node:child_process';
import { rmSync } from 'node:fs';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const CHROME = process.env.CHROME || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';

// CSS pixel sizes in portrait. Insets are the notch and home bar, in portrait and in landscape.
export const DEVICES = {
  'iphone-15': {w: 393, h: 852, dpr: 3, inset: {top: 59, bottom: 34}, insetLand: {left: 59, right: 59, bottom: 21}},
  'iphone-se': {w: 375, h: 667, dpr: 2, inset: {}, insetLand: {}},
  'pixel-7': {w: 412, h: 915, dpr: 2.625, inset: {top: 24}, insetLand: {left: 24}},
};

const sleep = ms => new Promise(r => setTimeout(r, ms));

export async function phone(url, {device = 'iphone-15', landscape = false, dpr} = {}){
  const d = DEVICES[device];
  if (!d) throw new Error(`unknown device ${device}; try ${Object.keys(DEVICES).join(', ')}`);
  const [w, h] = landscape ? [d.h, d.w] : [d.w, d.h], inset = landscape ? d.insetLand : d.inset;
  const profile = await mkdtemp(join(tmpdir(), 'phone-'));
  const chrome = spawn(CHROME, ['--headless=new', '--remote-debugging-port=0', `--user-data-dir=${profile}`, '--no-first-run', '--mute-audio',
    `--window-size=${w},${h}`, 'about:blank'], {stdio: 'ignore'});
  // a script that throws or is interrupted never reaches close(); don't leave Chrome running behind it
  const orphan = () => { chrome.kill('SIGKILL'); try { rmSync(profile, {recursive: true, force: true}); } catch {} };
  process.once('exit', orphan); process.once('SIGINT', () => process.exit(130));

  let port = null;
  for (let i = 0; i < 100 && !port; i++) { await sleep(100); port = await readFile(join(profile, 'DevToolsActivePort'), 'utf8').then(s => s.split('\n')[0], () => null); }
  if (!port) throw new Error('Chrome did not start');
  const [page] = (await (await fetch(`http://127.0.0.1:${port}/json/list`)).json()).filter(t => t.type === 'page');
  const ws = new WebSocket(page.webSocketDebuggerUrl);
  await new Promise((ok, fail) => { ws.onopen = ok; ws.onerror = fail; });

  let next = 0; const waiting = new Map(), logs = [];
  ws.onmessage = e => {
    const m = JSON.parse(e.data);
    if (m.id && waiting.has(m.id)) { const {ok, fail} = waiting.get(m.id); waiting.delete(m.id); m.error ? fail(new Error(m.error.message)) : ok(m.result); }
    else if (m.method === 'Runtime.consoleAPICalled') logs.push(`${m.params.type}: ${m.params.args.map(a => a.value ?? a.description).join(' ')}`);
    else if (m.method === 'Runtime.exceptionThrown') logs.push(`exception: ${m.params.exceptionDetails.exception?.description || m.params.exceptionDetails.text}`);
  };
  const send = (method, params = {}) => new Promise((ok, fail) => { const id = ++next; waiting.set(id, {ok, fail}); ws.send(JSON.stringify({id, method, params})); });

  await send('Runtime.enable');
  await send('Emulation.setDeviceMetricsOverride', {width: w, height: h, deviceScaleFactor: dpr ?? d.dpr, mobile: true,
    screenOrientation: landscape ? {type: 'landscapePrimary', angle: 90} : {type: 'portraitPrimary', angle: 0}});
  await send('Emulation.setTouchEmulationEnabled', {enabled: true, maxTouchPoints: 5});
  const i = {top: 0, bottom: 0, left: 0, right: 0, ...inset};
  // experimental in Chrome; without it env(safe-area-inset-*) stays 0 and notches go unchecked
  const insets = await send('Emulation.setSafeAreaInsetsOverride', {insets: {top: i.top, topMax: i.top, bottom: i.bottom, bottomMax: i.bottom,
    left: i.left, leftMax: i.left, right: i.right, rightMax: i.right}}).then(() => true, () => false);
  await send('Page.enable');
  await send('Page.navigate', {url});
  await sleep(500);

  const touch = (type, pts) => send('Input.dispatchTouchEvent', {type, touchPoints: pts.map(([x, y]) => ({x, y}))});
  const p = {
    w, h, insets, logs,
    async eval(js){
      const r = await send('Runtime.evaluate', {expression: js, awaitPromise: true, returnByValue: true});
      if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description || r.exceptionDetails.text);
      return r.result.value;
    },
    async tap(x, y){ await touch('touchStart', [[x, y]]); await sleep(60); await touch('touchEnd', []); },
    // where an element sits on screen, and whether it shows; null if there is no such element
    box(sel){
      return p.eval(`(() => { const e = document.querySelector(${JSON.stringify(sel)}); if (!e) return null; const r = e.getBoundingClientRect();
        return {x:r.x + r.width/2, y:r.y + r.height/2, left:r.left, top:r.top, right:r.right, bottom:r.bottom, shown:getComputedStyle(e).display !== 'none' && r.width > 0}; })()`);
    },
    // tap the middle of an element; false if it isn't showing
    async tapOn(sel){ const b = await p.box(sel); if (!b?.shown) return false; await p.tap(b.x, b.y); return true; },
    // one finger along the points, spread over ms, then held at the last point until ms is up
    async drag(points, ms = 400){
      await touch('touchStart', [points[0]]);
      for (const pt of points.slice(1)) { await sleep(Math.min(40, ms/points.length)); await touch('touchMove', [pt]); }
      await sleep(Math.max(0, ms - 40*points.length)); await touch('touchEnd', []);
    },
    wait: sleep,
    async shot(file){ const {data} = await send('Page.captureScreenshot', {format: 'png'}); await writeFile(file, Buffer.from(data, 'base64')); return file; },
    // Chrome keeps writing to its profile for a moment after the signal, so wait for it to exit
    async close(){ process.off('exit', orphan); ws.close(); const gone = new Promise(r => chrome.exitCode !== null ? r() : chrome.once('exit', r));
      chrome.kill(); await gone; await rm(profile, {recursive: true, force: true, maxRetries: 5}); },
  };
  return p;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const args = process.argv.slice(2), opt = k => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : undefined; };
  const url = args.find(a => /^https?:/.test(a)) || 'http://localhost:8080/';
  const p = await phone(url, {device: opt('--device'), landscape: args.includes('--landscape')});
  await p.wait(+(opt('--wait') ?? 4000));
  console.log(await p.shot(opt('--out') || 'phone.png'), `${p.w}x${p.h}`, p.insets ? 'insets on' : 'no safe-area insets (Chrome too old)');
  for (const l of p.logs) console.log(l);
  await p.close();
}
