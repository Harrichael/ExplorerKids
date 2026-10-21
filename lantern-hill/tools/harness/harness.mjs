// Play Lantern Hill headless, faster than life, from any chapter, keeping a picture log as it goes.
// No dependencies (Node 22+ for the built-in WebSocket). The game side is web/js/testing.js, which this
// imports into the page; the game never loads it on its own.
//
//   import { harness } from './harness.mjs';
//   const h = await harness('http://127.0.0.1:8000/', {speed: 8, every: 1, log: 'runs/basil'});
//   await h.start({trip: 'tectonics', chapter: 'adventure', seed: {pick: 'hotspot'}});
//   await h.wait(60);                  // talk reads on by itself; back when the explorer has control
//   console.log(await h.talkTo('Basil'), (await h.state()).heard);
//   await h.close();                   // the log: runs/basil/f00001.jpg..., index.jsonl, index.html,
//                                      // clips.jsonl, sheets/s0001.jpg (16 labelled pictures each)
//
// Every option and method is below. Game time drives everything: a picture every `every` seconds of
// game time, with the game held still while it is taken, so the spacing is exact at any speed.
// Pictures are taken only while the world runs, so none during a storybook page turn.
//
// `dense` takes closer pictures at chosen moments, 'door=.05,bus=.25,12-18=.05': while someone hops
// through the bus door, while on the bus, or 12 to 18 s into the chapter (each picture's `ct`). Each
// `dense` replaces the last; 'none' clears it. There's no replaying a run exactly (the game isn't
// seeded), so to see more between two pictures, start their chapter again with a window round their ct:
// scripted scenes come out nearly the same, anything the explorer or chance drives won't.
//
// `view` is the screen, and can change at any moment too: 'desktop' (1280×800), 'phone' (an iPhone 15
// held upright: touch, notch, home bar), 'phone-land', any device in tools/phone.mjs ('pixel-7',
// 'pixel-7-land'), or '900x600' for a desktop window that size. Phones draw at 2x. The game picks its
// touch controls (the stick, the Use button) when the page loads, so after a switch between touch and
// mouse those follow at the next start(); the size, the layout and the notch change at once.
//
// Anyone shown standing inside something solid is logged to clips.jsonl, with the picture just before.
//
// Only one headless Chrome should run on a machine at a time; pass `lock` (a directory path) and
// harnesses take turns. Each holds it for `minutes` at most, then closes itself.

import { spawn } from 'node:child_process';
import { appendFileSync, mkdirSync, readFileSync, rmSync, rmdirSync, writeFileSync } from 'node:fs';
import { mkdtemp, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { DEVICES, emulate } from '../phone.mjs';

const CHROME = process.env.CHROME || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const sleep = ms => new Promise(r => setTimeout(r, ms));
// a hung page must not keep the browser, and the lock, held forever
const within = (ms, p) => Promise.race([p, sleep(ms).then(() => { throw new Error('the page stopped answering'); })]);
function screenOf(view){
  const [, w, h] = /^(\d+)x(\d+)$/.exec(view === 'desktop' ? '1280x800' : view) || [], [, name, land] = /^(.+?)(-land)?$/.exec(view);
  if (w) return {view, w: +w, h: +h, touch: false};
  const device = name === 'phone' ? 'iphone-15' : name, d = DEVICES[device];
  if (!d) throw new Error(`no screen ${view}; try desktop, phone, phone-land, ${Object.keys(DEVICES).join(', ')} (each may end -land), or 900x600`);
  return {view, device, landscape: !!land, w: land ? d.h : d.w, h: land ? d.w : d.h, touch: true};
}
const denseOf = d => typeof d !== 'string' ? d || {} : Object.fromEntries(d.split(',').filter(w => w && w !== 'none').map(w => w.split('=')).map(([k, v]) => [k.trim(), +v]));

export async function harness(url, {speed = 1, read = 1.2, every = 2, dense, log = join(tmpdir(), 'lh-runs', new Date().toISOString().replace(/[:.]/g, '-')),
  view = 'desktop', lock = process.env.LH_BROWSER_LOCK, minutes = 8} = {}){
  const now = {speed, read, every, dense:denseOf(dense)};
  let scr = screenOf(view), loadedTouch = null;
  if (lock) { for (let said = false; ; said = true) { try { mkdirSync(lock); break; } catch { if (!said) console.error('waiting for the browser lock', lock); await sleep(5000); } } }
  mkdirSync(log, {recursive: true});
  const profile = await mkdtemp(join(tmpdir(), 'lh-harness-'));
  const chrome = spawn(CHROME, ['--headless=new', '--remote-debugging-port=0', `--user-data-dir=${profile}`, '--no-first-run', '--mute-audio',
    `--window-size=${scr.w},${scr.h}`, 'about:blank'], {stdio: 'ignore'});
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
  let next = 0, frames = 0, runs = 0, closing = false, taking = Promise.resolve(); const waiting = new Map(), errors = [], clips = [];
  ws.onmessage = e => {
    const m = JSON.parse(e.data);
    if (m.id && waiting.has(m.id)) { const {ok, fail} = waiting.get(m.id); waiting.delete(m.id); m.error ? fail(new Error(m.error.message)) : ok(m.result); }
    else if (m.method === 'Runtime.bindingCalled' && m.params.name === 'harnessFrame') taking = picture(JSON.parse(m.params.payload));
    else if (m.method === 'Runtime.bindingCalled' && m.params.name === 'harnessClip') clip(JSON.parse(m.params.payload));
    else if (m.method === 'Runtime.exceptionThrown') errors.push(m.params.exceptionDetails.exception?.description || m.params.exceptionDetails.text);
    else if (m.method === 'Runtime.consoleAPICalled' && m.params.type === 'error') errors.push(m.params.args.map(a => a.value ?? a.description).join(' '));
  };
  const send = (method, params = {}) => new Promise((ok, fail) => { const id = ++next; waiting.set(id, {ok, fail}); ws.send(JSON.stringify({id, method, params})); });
  const ev = async js => { const r = await send('Runtime.evaluate', {expression: js, awaitPromise: true, returnByValue: true});
    if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description || r.exceptionDetails.text); return r.result.value; };
  await send('Runtime.enable'); await send('Page.enable');
  await send('Runtime.addBinding', {name: 'harnessFrame'}); await send('Runtime.addBinding', {name: 'harnessClip'});
  await emulate(send, {...scr, dpr: scr.touch ? 2 : 1});

  // the game is holding still for this one; let it go once it's on disk
  async function picture(info){
    if (closing) return;
    const file = `f${String(++frames).padStart(5, '0')}.jpg`;
    try { const {data} = await send('Page.captureScreenshot', {format: 'jpeg', quality: 70});
      writeFileSync(join(log, file), Buffer.from(data, 'base64')); appendFileSync(join(log, 'index.jsonl'), JSON.stringify({frame: frames, run: runs, file, ...info}) + '\n'); }
    finally { ev('harness.go()').catch(() => {}); }
  }
  function clip({t, ct, chapter, place, who, at, box, shot}){
    const c = {who, t, ct, chapter, place, at, box, shot, after: frames, run: runs}; clips.push(c); appendFileSync(join(log, 'clips.jsonl'), JSON.stringify(c) + '\n');
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
      loadedTouch = scr.touch; await clickAt(scr.w/2, scr.h/2); await sleep(800);
      if (await ev(`document.documentElement.classList.contains('dressing')`)) { await key('Escape'); await sleep(600); }
      await ev(`import(document.baseURI + 'js/testing.js')`); runs++;
      await ev(`harness.pace(${JSON.stringify(now)})`);
      return ev(`harness.start(${JSON.stringify(opts)})`);
    },
    // clips are those since the last state, like heard
    async state(){ const s = await ev('harness.state()'); s.errors = errors.splice(0); s.frames = frames; s.clips = clips.splice(0); s.screen = `${scr.view} ${scr.w}×${scr.h}`; return s; },
    // speed, read, every and dense can change at any moment; a fresh start keeps whatever they are now
    async pace(o){ o = {...o}; if ('dense' in o) o.dense = denseOf(o.dense);
      const r = await ev(`window.harness ? harness.pace(${JSON.stringify(o)}) : null`); Object.assign(now, o); return r || now; },
    async view(v){ const next = screenOf(v); await emulate(send, {...next, dpr: next.touch ? 2 : 1}); scr = next;
      return `screen ${v}, ${scr.w}×${scr.h}` + (loadedTouch !== null && loadedTouch !== scr.touch ? `; ${scr.touch ? 'touch' : 'mouse'} controls come with the next start` : ''); },
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
      if (closed) return log; clearTimeout(limit); closing = true; await within(5000, taking).catch(() => {});
      const rows = await readFile(join(log, 'index.jsonl'), 'utf8').then(t => t.trim().split('\n').map(l => JSON.parse(l)), () => []);
      const all = await readFile(join(log, 'clips.jsonl'), 'utf8').then(t => t.trim().split('\n').map(l => JSON.parse(l)), () => []);
      writeFileSync(join(log, 'index.html'), html(rows, all));
      // the page draws them, since ffmpeg here can't draw text
      mkdirSync(join(log, 'sheets'), {recursive: true});
      for (let i = 0, ok = true; ok && i < rows.length; i += 16) {
        const tiles = rows.slice(i, i + 16).map(f => ({src: 'data:image/jpeg;base64,' + readFileSync(join(log, f.file)).toString('base64'), label: label(f), inside: (f.inside || []).join(', ')}));
        const jpg = await within(15000, ev(`(${sheet})(${JSON.stringify(tiles)})`)).catch(() => ok = false);
        if (jpg) writeFileSync(join(log, 'sheets', `s${String(i/16 + 1).padStart(4, '0')}.jpg`), Buffer.from(jpg, 'base64'));
      }
      ws.close(); kill(); process.off('exit', kill); return log;
    },
  };
  return h;
}

const esc = s => String(s).replace(/[&<>"]/g, c => `&#${c.charCodeAt(0)};`);
const label = f => `#${f.frame}  t ${f.t}${f.chapter ? `  ch ${/^\d+/.exec(f.chapter)?.[0] ?? f.chapter} +${f.ct}` : ''}  ${f.shot || ''}`;
// every picture with what was going on, to look over a run by eye; clips first, each linked to the picture before it
function html(rows, clips){
  return '<!doctype html><meta charset="utf-8"><title>Frames</title><style>body{font:13px system-ui;margin:16px}main{display:grid;grid-template-columns:repeat(auto-fill,minmax(320px,1fr));gap:12px}img{width:100%}.in{color:#c00}figure:target{outline:3px solid #c00}</style>\n' +
    (clips.length ? `<h3 class="in">Inside something solid</h3><ul>${clips.map(c => `<li><a href="#f${c.after}">after #${c.after}</a> t ${c.t} · ${esc(c.place)} · ${esc(c.who)} at (${c.at}) in a ${c.box.w}×${c.box.d} m box at (${c.box.x}, ${c.box.z})</li>`).join('')}</ul>` : '') +
    '<main>' + rows.map(f => `<figure id="f${f.frame}"><img loading="lazy" src="${f.file}"><figcaption><b>${esc(label(f))}</b> · ${esc(f.place)} / ${esc(f.area)}${f.inside?.length ? `<br><b class="in">inside something: ${esc(f.inside.join(', '))}</b>` : ''}${f.talk ? '<br>' + esc(f.talk) : ''}</figcaption></figure>`).join('\n') + '</main>';
}
// runs in the page: a 4×4 sheet with each picture's number, time and shot under it, red where someone is inside something
async function sheet(tiles){
  const W = 400, H = 250, L = 22, P = 4, c = document.createElement('canvas'), g = c.getContext('2d');
  c.width = 4*W + 5*P; c.height = Math.ceil(tiles.length/4)*(H + L + P) + P; g.fillStyle = '#fff'; g.fillRect(0, 0, c.width, c.height);
  for (const [i, t] of tiles.entries()) {
    const im = new Image(); im.src = t.src; await im.decode();
    const x = P + (i % 4)*(W + P), y = P + Math.floor(i/4)*(H + L + P), k = Math.min(W/im.width, H/im.height), iw = im.width*k, ih = im.height*k;
    g.fillStyle = '#eee'; g.fillRect(x, y, W, H); g.drawImage(im, x + (W - iw)/2, y + (H - ih)/2, iw, ih); g.font = 'bold 14px system-ui'; g.textBaseline = 'middle';
    if (t.inside) { g.strokeStyle = '#d00'; g.lineWidth = 4; g.strokeRect(x + 2, y + 2, W - 4, H - 4); }
    g.fillStyle = t.inside ? '#d00' : '#222'; g.fillText(t.label + (t.inside ? '  IN: ' + t.inside : ''), x + 2, y + H + L/2, W - 4);
  }
  return c.toDataURL('image/jpeg', .8).split(',')[1];
}
