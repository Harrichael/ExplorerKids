// Play Lantern Hill headless, faster than life, from any chapter, keeping a picture log as it goes.
// No dependencies (Node 22+ for the built-in WebSocket). The game side is web/js/testing.js, which this
// imports into the page; the game never loads it on its own.
//
//   import { harness } from './harness.mjs';
//   const h = await harness('http://127.0.0.1:8000/', {speed: 8, every: 1, log: 'runs/basil'});
//   await h.start({trip: 'tectonics', chapter: 'adventure', seed: {pick: 'hotspot'}});
//   await h.wait(60);                  // talk reads on by itself; back when the explorer has control
//   console.log(await h.talkTo('Basil'), (await h.state()).heard);
//   await h.close();                   // the log: runs/basil/f00001.jpg..., index.jsonl, index.html
//
// Every option and method is below. Game time drives everything: a picture every `every` seconds of
// game time, with the game held still while it is taken, so the spacing is exact at any speed.
// Pictures are taken only while the world runs, so none during a storybook page turn.
//
// Only one headless Chrome should run on a machine at a time; pass `lock` (a directory path) and
// harnesses take turns. Each holds it for `minutes` at most, then closes itself.

import { spawn } from 'node:child_process';
import { appendFileSync, mkdirSync, rmSync, rmdirSync, writeFileSync } from 'node:fs';
import { mkdtemp, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const CHROME = process.env.CHROME || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const sleep = ms => new Promise(r => setTimeout(r, ms));

export async function harness(url, {speed = 1, read = 1.2, every = 2, log = join(tmpdir(), 'lh-runs', new Date().toISOString().replace(/[:.]/g, '-')),
  width = 1280, height = 800, lock = process.env.LH_BROWSER_LOCK, minutes = 8} = {}){
  const now = {speed, read, every};
  if (lock) { for (let said = false; ; said = true) { try { mkdirSync(lock); break; } catch { if (!said) console.error('waiting for the browser lock', lock); await sleep(5000); } } }
  mkdirSync(log, {recursive: true});
  const profile = await mkdtemp(join(tmpdir(), 'lh-harness-'));
  const chrome = spawn(CHROME, ['--headless=new', '--remote-debugging-port=0', `--user-data-dir=${profile}`, '--no-first-run', '--mute-audio',
    `--window-size=${width},${height}`, 'about:blank'], {stdio: 'ignore'});
  let closed = false;
  const kill = () => { if (closed) return; closed = true; chrome.kill('SIGKILL'); try { rmSync(profile, {recursive: true, force: true}); } catch {} if (lock) try { rmdirSync(lock); } catch {} };
  // a signal skips 'exit' handlers unless it is turned into an exit; Chrome and the lock must not outlive us
  process.once('exit', kill); for (const sig of ['SIGINT', 'SIGTERM', 'SIGHUP']) process.once(sig, () => process.exit(130));
  const limit = setTimeout(() => { console.error(`harness: ${minutes} minutes are up, closing the browser`); h.close(); }, minutes*60e3); limit.unref();

  let port = null;
  for (let i = 0; i < 100 && !port; i++) { await sleep(100); port = await readFile(join(profile, 'DevToolsActivePort'), 'utf8').then(s => s.split('\n')[0], () => null); }
  if (!port) { kill(); throw new Error('Chrome did not start'); }
  const [page] = (await (await fetch(`http://127.0.0.1:${port}/json/list`)).json()).filter(t => t.type === 'page');
  const ws = new WebSocket(page.webSocketDebuggerUrl);
  await new Promise((ok, fail) => { ws.onopen = ok; ws.onerror = fail; });
  let next = 0, frames = 0; const waiting = new Map(), errors = [];
  ws.onmessage = e => {
    const m = JSON.parse(e.data);
    if (m.id && waiting.has(m.id)) { const {ok, fail} = waiting.get(m.id); waiting.delete(m.id); m.error ? fail(new Error(m.error.message)) : ok(m.result); }
    else if (m.method === 'Runtime.bindingCalled' && m.params.name === 'harnessFrame') picture(JSON.parse(m.params.payload));
    else if (m.method === 'Runtime.exceptionThrown') errors.push(m.params.exceptionDetails.exception?.description || m.params.exceptionDetails.text);
    else if (m.method === 'Runtime.consoleAPICalled' && m.params.type === 'error') errors.push(m.params.args.map(a => a.value ?? a.description).join(' '));
  };
  const send = (method, params = {}) => new Promise((ok, fail) => { const id = ++next; waiting.set(id, {ok, fail}); ws.send(JSON.stringify({id, method, params})); });
  const ev = async js => { const r = await send('Runtime.evaluate', {expression: js, awaitPromise: true, returnByValue: true});
    if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description || r.exceptionDetails.text); return r.result.value; };
  await send('Runtime.enable'); await send('Page.enable');
  await send('Runtime.addBinding', {name: 'harnessFrame'});
  await send('Emulation.setDeviceMetricsOverride', {width, height, deviceScaleFactor: 1, mobile: false});

  // the game is holding still for this one; let it go once it's on disk
  async function picture(info){
    const file = `f${String(++frames).padStart(5, '0')}.jpg`;
    try { const {data} = await send('Page.captureScreenshot', {format: 'jpeg', quality: 70});
      writeFileSync(join(log, file), Buffer.from(data, 'base64')); appendFileSync(join(log, 'index.jsonl'), JSON.stringify({frame: frames, file, ...info}) + '\n'); }
    finally { ev('harness.go()').catch(() => {}); }
  }

  const KEYS = {Space: [' ', 'Space', 32], Enter: ['Enter', 'Enter', 13], Escape: ['Escape', 'Escape', 27],
    ArrowUp: ['ArrowUp', 'ArrowUp', 38], ArrowDown: ['ArrowDown', 'ArrowDown', 40], ArrowLeft: ['ArrowLeft', 'ArrowLeft', 37], ArrowRight: ['ArrowRight', 'ArrowRight', 39]};
  const key = async k => { const [key, code, kc] = KEYS[k] || [k, 'Key' + k.toUpperCase(), k.toUpperCase().charCodeAt(0)];
    await send('Input.dispatchKeyEvent', {type: key.length === 1 ? 'keyDown' : 'rawKeyDown', key, code, windowsVirtualKeyCode: kc, text: key.length === 1 ? key : undefined});
    await sleep(50); await send('Input.dispatchKeyEvent', {type: 'keyUp', key, code, windowsVirtualKeyCode: kc}); await sleep(150); };
  const clickAt = async (x, y) => { for (const type of ['mouseMoved', 'mousePressed', 'mouseReleased']) await send('Input.dispatchMouseEvent', {type, x, y, button: 'left', clickCount: 1}); await sleep(150); };
  const click = async sel => { const b = await ev(`(() => { const e = document.querySelector(${JSON.stringify(sel)}); if (!e || !e.checkVisibility()) return null; const r = e.getBoundingClientRect(); return [r.x + r.width/2, r.y + r.height/2]; })()`);
    if (!b) return 'nothing showing at ' + sel; await clickAt(...b); return 'clicked ' + sel; };

  const h = {
    log, errors, get frames(){ return frames; },
    // a fresh page each time: from the start screen, past the wardrobe, then (with a trip) straight into a chapter.
    // See harness.start in web/js/testing.js for the options.
    async start(opts = {}){
      await send('Page.navigate', {url});
      for (let i = 0; i < 100 && !await ev(`!!document.querySelector('#start') && document.readyState === 'complete'`).catch(() => false); i++) await sleep(100);
      await sleep(1500);
      await clickAt(width/2, height/2); await sleep(800);
      if (await ev(`document.documentElement.classList.contains('dressing')`)) { await key('Escape'); await sleep(600); }
      await ev(`import(document.baseURI + 'js/testing.js')`);
      await ev(`harness.pace(${JSON.stringify(now)})`);
      return ev(`harness.start(${JSON.stringify(opts)})`);
    },
    async state(){ const s = await ev('harness.state()'); s.errors = errors.splice(0); s.frames = frames; return s; },
    // speed, read and every can change at any moment; a fresh start keeps whatever they are now
    pace: o => { Object.assign(now, o); return ev(`harness.pace(${JSON.stringify(o)})`).catch(() => now); },
    wait: (s = 10) => ev(`harness.wait(${+s})`),
    walk: name => ev(`harness.walk(${JSON.stringify(name)})`),
    async talkTo(name){ const r = await h.walk(name); if (r !== 'arrived') return r; await key('Space'); return 'talking to ' + name; },
    // walk to it and press whatever key the game gave it
    async use(name){ const r = await h.walk(name); if (r !== 'arrived') return r;
      const s = await h.state(), q = name.toLowerCase(), t = s.things.find(t => t.key && (t.name.toLowerCase().includes(q) || t.verb.toLowerCase().includes(q)));
      if (!t) return 'arrived, but it has no key'; await key(t.key.toLowerCase()); return `pressed ${t.key}: ${t.verb}`; },
    // an answer by its number (1 is the first shown) or by some of its words
    async pick(which){
      const cs = await ev(`[...document.querySelectorAll('#dialog .choice')].filter(c => c.checkVisibility()).map(c => c.textContent)`);
      const i = /^\d+$/.test(which) ? +which - 1 : cs.findIndex(c => c.toLowerCase().includes(String(which).toLowerCase()));
      if (!cs[i]) return `no answer ${which}; the answers are: ${cs.join(' / ') || 'none'}`;
      await click(`#dialog .choice:nth-child(${i + 1})`); return `picked "${cs[i]}"`;
    },
    // whatever card is up and waiting: the notebook, the badge
    async ok(){ const s = await h.state();
      if (s.overlays.includes('badge')) return click('#badgeOk');
      if (s.overlays.includes('notebook')) { await key('Space'); return 'closed the notebook'; }
      return 'nothing to close'; },
    key, click,
    async shot(file = join(log, `shot-${Date.now()}.png`)){ const {data} = await send('Page.captureScreenshot', {format: 'png'}); writeFileSync(file, Buffer.from(data, 'base64')); return file; },
    eval: ev,
    async close(){
      if (closed) return log; clearTimeout(limit);
      // a contact sheet, to look over a run by eye
      const rows = await readFile(join(log, 'index.jsonl'), 'utf8').then(t => t.trim().split('\n').map(l => JSON.parse(l)), () => []), esc = s => String(s).replace(/[&<>"]/g, c => `&#${c.charCodeAt(0)};`);
      writeFileSync(join(log, 'index.html'), '<!doctype html><meta charset="utf-8"><title>Frames</title><style>body{font:13px system-ui;margin:16px;display:grid;grid-template-columns:repeat(auto-fill,minmax(320px,1fr));gap:12px}img{width:100%}</style>\n' +
        rows.map(f => `<figure><img loading="lazy" src="${f.file}"><figcaption><b>${f.frame}</b> t ${f.t} · ${esc(f.place)} / ${esc(f.area)}${f.talk ? '<br>' + esc(f.talk) : ''}</figcaption></figure>`).join('\n'));
      ws.close(); kill(); process.off('exit', kill); return log;
    },
  };
  return h;
}
