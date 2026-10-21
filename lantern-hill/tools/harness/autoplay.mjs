// Plays a whole trip with no one at the keys, to fill a picture log for a polish pass. It plays the
// way a quick child would: talks to whoever calls, does what the goal says, answers questions (the
// first answer, or one with words given in --answer), and heads home when the bus calls.
//
//   node tools/harness/autoplay.mjs http://127.0.0.1:8000/ --answer ISLAND --speed 8 --every 1 --log runs/island
//   node tools/harness/autoplay.mjs http://127.0.0.1:8000/ --chapter 5      (from the ridge on)
//   node tools/harness/autoplay.mjs http://127.0.0.1:8000/ --every 3 --dense door=.05,bus=.25,watch=.5
//
// --answer picks, at any question, the first answer containing one of its words (comma separated),
// so it steers forks. Prints each place, goal and question as it goes, anyone inside something solid,
// and the time it took.

import { harness } from './harness.mjs';

const argv = process.argv.slice(2), opt = (k, d) => { const i = argv.indexOf('--' + k); return i >= 0 ? argv[i + 1] : d; };
const url = argv.find(a => /^https?:/.test(a)) || 'http://127.0.0.1:8000/', words = opt('answer', '').split(',').filter(Boolean).map(w => w.toLowerCase());
const h = await harness(url, {speed: +opt('speed', 8), every: +opt('every', 2), dense: opt('dense'), log: opt('log'), minutes: +opt('minutes', 8)});
const t0 = Date.now(), say = m => console.log(`${((Date.now() - t0)/1000).toFixed(0).padStart(4)}s  ${m}`);
let last = '', tries = new Map(), out = 'gave up after 400 turns';
try {
  await h.start({trip: opt('trip', 'tectonics'), chapter: /^\d+$/.test(opt('chapter', '0')) ? +opt('chapter', '0') : opt('chapter'), save: {lab: {done: ['volcano']}}});
  for (let turn = 0; turn < 400; turn++) {
    const why = await h.wait(40), s = await h.state();
    if (s.errors.length) say('PAGE ERRORS ' + s.errors.join(' | '));
    for (const c of s.clips) say(`INSIDE ${c.who} at t ${c.t} in a ${c.box.w}×${c.box.d} m box at (${c.box.x}, ${c.box.z}), after picture ${c.after}`);
    const where = `${s.chapter || '-'} | ${s.place} | ${s.goal || ''}`; if (where !== last) { say(where); last = where; tries.clear(); }
    if (s.overlays.includes('badge')) { say('badge'); await h.ok(); continue; }
    if (s.overlays.includes('notebook')) { await h.ok(); continue; }
    if (s.control === 'question') {
      // after the badge, Dr. Sparks offers her Explorer Check; "maybe later" ends the run
      const cs = s.talk.choices, later = cs.findIndex(c => /maybe later/i.test(c)), n = later >= 0 ? later : Math.max(0, cs.findIndex(c => words.some(w => c.toLowerCase().includes(w))));
      say(`Q ${s.talk.who}: ${s.talk.line}  -> ${cs[n]}`); await h.pick(String(n + 1));
      if (later >= 0) { out = 'home'; break; }
      continue;
    }
    if (s.control !== 'walk') continue;
    // the same target over and over is a stuck walk or a goal this doesn't understand; try something else
    const fresh = a => (tries.get(a.name) || 0) < 3, go = async (a, f) => { tries.set(a.name, (tries.get(a.name) || 0) + 1); const r = await f(a.name); if (!/^talking|^pressed/.test(r)) say(`${a.name}: ${r}`); };
    const caller = s.people.find(p => p.calling && fresh(p));
    if (caller) { await go(caller, h.talkTo); continue; }
    const goal = (s.goal || '').toLowerCase(), home = /bus/.test(goal) || /visit anyone/.test(goal) || !s.trip;
    // the thing sharing most words with the goal ("Switch on the bus's fan" finds "Bus fan: Switch on the fan")
    const tw = t => new Set(`${t.name} ${t.verb}`.toLowerCase().match(/[a-z]{3,}/g)), gw = (goal.match(/[a-z]{3,}/g) || []).filter(w => !['the', 'and', 'you', 'your', 'when', 'with', 'for', 'some'].includes(w));
    const score = t => gw.filter(w => tw(t).has(w)).length, best = s.things.filter(t => fresh(t) && !/wonder bus/i.test(t.name) && score(t) > 0).sort((a, b) => score(b) - score(a))[0];
    const thing = best || (home ? s.things.find(t => /wonder bus/i.test(t.name)) : s.things.find(t => fresh(t) && !/wonder bus/i.test(t.name)));
    if (thing) { await go(thing, h.use); continue; }
    if (why === 'time') { say('nothing to do: ' + where); tries.clear(); }
  }
} finally {
  const s = await h.state().catch(() => ({t: '?'}));
  say(`${out}; ${s.t} s of game time; ${h.frames} pictures in ${await h.close()}`);
}
