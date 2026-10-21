// The harness one command at a time, for a person or a model at a shell. `open` leaves a browser
// running in the background; every later command uses it and prints what is on screen afterwards.
//
//   node tools/harness/cli.mjs open http://127.0.0.1:8000/ --speed 8 --every 1 --log runs/try1
//   node tools/harness/cli.mjs start tectonics adventure --seed '{"pick":"hotspot"}'
//   node tools/harness/cli.mjs wait 60          up to 60 s of game time; back early when you're needed
//   node tools/harness/cli.mjs talk Basil       walk to someone (round rocks) and talk
//   node tools/harness/cli.mjs use crab         walk to a thing and press its key
//   node tools/harness/cli.mjs walk "Wonder Bus"
//   node tools/harness/cli.mjs pick 2           answer a question by number, or by some of its words
//   node tools/harness/cli.mjs ok               close the notebook or the badge
//   node tools/harness/cli.mjs key e            any key: e r w t q y, Space, Enter, Escape, ArrowUp...
//   node tools/harness/cli.mjs click '#leaveTrip'
//   node tools/harness/cli.mjs pace --speed 2 --every .05   change speed, picture spacing or --read at any moment
//   node tools/harness/cli.mjs pace --dense door=.05,bus=.25,12-18=.05   closer pictures at moments (see harness.mjs)
//   node tools/harness/cli.mjs state | shot [file.png] | eval '<js in the page>'
//   node tools/harness/cli.mjs close            stops the browser; prints where the picture log is
//
// open's options set where things start, and `pace` changes them later: --speed (game time per real
// second), --every (seconds of game time per logged picture, 0 for none; 2 if not given), --dense,
// --read (seconds a typed line stays before the talk moves on, 0 to press Space yourself). Only these stay
// fixed for the session: --log (the folder), --minutes (closes itself after this long), --lock (a
// directory, so only one browser runs at a time; or set LH_BROWSER_LOCK). HARNESS_SESSION names the session (default "h").

import { spawn } from 'node:child_process';
import { createServer } from 'node:http';
import { existsSync, readFileSync, unlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { harness } from './harness.mjs';

const [, , cmd, ...rest] = process.argv;
const portFile = join(tmpdir(), `lh-harness-${process.env.HARNESS_SESSION || 'h'}.port`);
const flags = {}, args = [];
for (let i = 0; i < rest.length; i++) if (rest[i].startsWith('--')) flags[rest[i].slice(2)] = rest[++i]; else args.push(rest[i]);
const sleep = ms => new Promise(r => setTimeout(r, ms));

async function daemon(){
  const {url, ...o} = JSON.parse(args[0]);
  const h = await harness(url, {...o, ...Object.fromEntries(['speed', 'every', 'read', 'minutes'].filter(k => o[k] !== undefined).map(k => [k, +o[k]]))});
  const bye = async () => { await h.close(); try { unlinkSync(portFile); } catch {} process.exit(0); };
  setTimeout(bye, (+o.minutes || 8)*60e3).unref();
  const run = {
    start: (trip, chapter, seed, save) => h.start({trip, chapter: /^\d+$/.test(chapter) ? +chapter : chapter, seed: seed ? JSON.parse(seed) : undefined, save: save ? JSON.parse(save) : undefined}),
    state: () => null, wait: s => h.wait(s), walk: n => h.walk(n), talk: n => h.talkTo(n), use: n => h.use(n), pick: w => h.pick(w), ok: () => h.ok(),
    key: async k => { await h.key(k); return 'pressed ' + k; }, click: s => h.click(s), shot: f => h.shot(f), pace: o => h.pace(Object.fromEntries(Object.entries(o || {}).map(([k, v]) => [k, k === 'dense' ? v : +v]))), eval: js => h.eval(js),
  };
  let busy = Promise.resolve();
  createServer((req, res) => { let body = ''; req.on('data', d => body += d); req.on('end', () => {
    const {cmd, args} = JSON.parse(body);
    busy = busy.then(async () => {
      if (cmd === 'close') { res.end(JSON.stringify({out: 'closed; pictures in ' + h.log + ' (index.html, index.jsonl)'})); return bye(); }
      try { const out = run[cmd] ? await run[cmd](...args) : `unknown command ${cmd}`; res.end(JSON.stringify({out, state: await h.state()})); }
      catch (e) { res.end(JSON.stringify({out: 'error: ' + e.message, state: await h.state().catch(() => null)})); }
    });
  }); }).listen(0, '127.0.0.1', function(){ writeFileSync(portFile, String(this.address().port)); });
}

// the state as a few lines, nearest first
function show(s){
  const near = (a, f) => a.filter(x => x.dist < 20).slice(0, 8).map(f).join('; ') || '-';
  return [`t ${s.t}  ${s.trip ? `TRIP ${s.trip} chapter ${s.chapter}  ` : ''}PLACE ${s.place} / ${s.area}  CONTROL ${s.control}` + (s.goal ? `  GOAL ${s.goal}` : ''),
    s.heard.length ? 'HEARD\n' + s.heard.map(l => `  ${l.who}: ${l.line}`).join('\n') : null,
    s.talk ? `TALK ${s.talk.who}: "${s.talk.line}"` + (s.talk.choices.length ? `\n  CHOICES ${s.talk.choices.map((c, i) => `${i + 1}) ${c}`).join('  ')}` : '') : null,
    `YOU at (${s.you.x}, ${s.you.z})  CAMERA ${s.shot}  PICTURES ${s.frames}`,
    `PEOPLE ${near(s.people, p => `${p.name} ${p.dist}m${p.calling ? ' CALLING YOU' : ''}${p.talk ? ' [Space to talk]' : ''}`)}`,
    `THINGS ${near(s.things, t => `${t.key ? `[${t.key}] ` : ''}${t.verb === t.name ? t.name : `${t.name}: ${t.verb}`} ${t.dist}m`)}`,
    s.overlays.length ? `ON SCREEN ${s.overlays.join(', ')}` : null,
    s.clips.length ? 'INSIDE SOMETHING SOLID\n' + s.clips.map(c => `  ${c.who} at t ${c.t} in a ${c.box.w}×${c.box.d} m box at (${c.box.x}, ${c.box.z}), after picture ${c.after}`).join('\n') : null,
    s.errors.length ? `PAGE ERRORS ${s.errors.join(' || ')}` : null].filter(Boolean).join('\n');
}

if (cmd === '__daemon') await daemon();
else if (!cmd) console.log(readFileSync(new URL(import.meta.url), 'utf8').split('\n\n')[0]);
else {
  if (cmd === 'open') {
    if (existsSync(portFile)) { console.log('a harness is already open; close it first'); process.exit(1); }
    const o = JSON.stringify({url: args[0] || 'http://127.0.0.1:8000/', ...flags});
    const d = spawn(process.execPath, [new URL(import.meta.url).pathname, '__daemon', o], {detached: true, stdio: 'ignore'}); d.unref();
    for (let i = 0; i < 2400 && !existsSync(portFile); i++) await sleep(250);
    // giving up must take the daemon with it, or it opens a browser later that nobody closes
    if (!existsSync(portFile)) { try { process.kill(d.pid); } catch {} console.log('the browser did not open'); process.exit(1); }
    console.log('open; now `start`'); process.exit(0);
  }
  if (!existsSync(portFile)) { console.log('no harness open; run `open` first'); process.exit(1); }
  const r = await (await fetch(`http://127.0.0.1:${readFileSync(portFile, 'utf8')}/`, {method: 'POST', body: JSON.stringify({cmd, args: cmd === 'start' ? [args[0], args[1], flags.seed, flags.save] : cmd === 'pace' ? [flags] : args})})).json();
  if (r.out !== undefined && r.out !== null) console.log(typeof r.out === 'string' ? r.out : JSON.stringify(r.out));
  if (r.state) console.log(show(r.state));
}
