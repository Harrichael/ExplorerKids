// The test harness's hands inside the game. Nothing in the game loads this: tools/harness imports it
// into the page, so players never pay for it. It puts one object on window, `harness`:
//
//   harness.pace({speed: 8, read: 1.2, every: 1})   // 8x game time; talk moves on 1.2 s after a line is typed;
//                                                   // hold still for a picture every 1 s of game time
//   await harness.start({trip: 'tectonics', chapter: 'adventure', seed: {pick: 'hotspot'}, save: {lab: {done: ['volcano']}}})
//   harness.state()                                 // what's on screen, as plain data
//   await harness.walk('Basil')                     // around rocks, by the game's own walking; 'arrived', or why not
//   await harness.wait(30)                          // up to 30 s of game time, back early when the explorer is needed
//
// Time here is game time (game.elapsed). The harness runs the frame loop in fixed small steps, as many
// as the speed asks for each frame, so physics and walls behave the same at any speed.

import { loop, step } from './play.js';
import { blocked, player } from './player.js';
import { game } from './state.js';
import { joy, setSound } from './input.js';
import { save } from './save.js';
import { convo, curItem, talk, typing } from './ui/dialogue.js';
import { startTrip, tripNow } from './trips/field-trip.js';

const H = 1/30, $ = id => document.getElementById(id), shown = el => !!el && el.checkVisibility();
const P = {speed:1, read:0, every:0, next:0, held:false, walk:null};
const heard = [];
let owed = 0, last = performance.now(), readT = 0, lastItem = null;

const choices = () => convo && curItem && curItem.choices && typing.done ? curItem.choices.map(c => c.label) : [];
const overlays = () => ['notebook', 'badge', 'goggles', 'binoc', 'updateToast'].filter(id => shown($(id)));
const control = () => game.activity ? 'busy: ' + game.activity : convo ? (choices().length ? 'question' : 'talk') : game.cutscene ? 'watch' : 'walk';

// each fixed step: note a new line of talk, read on if asked to, and steer a walk
function tick(){
  if (convo && curItem && curItem !== lastItem) heard.push({t:+game.elapsed.toFixed(1), who:curItem.p.name, line:typing.text, choices:curItem.choices ? curItem.choices.map(c => c.label) : undefined});
  lastItem = convo ? curItem : null;
  if (P.read && convo && typing.done && !curItem.choices) { if ((readT += H) >= P.read) { readT = 0; talk(); } } else readT = 0;
  if (P.walk) steer(P.walk);
}
loop.step = () => {
  const now = performance.now(), t0 = now, real = Math.min(.1, (now - last)/1000); last = now;
  if (P.held) return;
  owed += real*P.speed;
  let n = 0;
  // a slow machine gets as many steps as fit in the frame, rather than falling ever further behind
  while (owed >= H && !game.activity && performance.now() - t0 < 40) {
    tick(); step(H, false); owed -= H; n++;
    if (P.every && game.elapsed >= P.next) { P.next = game.elapsed + P.every; P.held = !!window.harnessFrame; break; }
  }
  if (performance.now() - t0 >= 40) owed = 0;
  if (n) step(0);
  // the harness takes the picture, then lets go with harness.go()
  if (P.held) window.harnessFrame(JSON.stringify(brief()));
};

// ---------- walking: a path round what blocks the explorer, then the game's own stick to follow it ----------
const G = .5;
function path(tx, tz, near){
  const sx = player.x, sz = player.z, key = (i, j) => i + ',' + j, at = (i, j) => [sx + i*G, sz + j*G];
  const open = [[Math.hypot(tx - sx, tz - sz), 0, 0, 0, game.world.ground(sx, sz)]], from = new Map([[key(0, 0), null]]), cost = new Map([[key(0, 0), 0]]);
  for (let n = 0; open.length && n < 12000; n++) {
    let b = 0; for (let k = 1; k < open.length; k++) if (open[k][0] < open[b][0]) b = k;
    const [, g, i, j, y] = open.splice(b, 1)[0], [x, z] = at(i, j);
    if (Math.hypot(tx - x, tz - z) < near) { const out = []; for (let c = key(i, j); c; c = from.get(c)) out.unshift(c.split(',').map(Number)); return out.map(([a, b]) => at(a, b)); }
    for (const [di, dj] of [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]]) {
      const [nx, nz] = at(i + di, j + dj), k = key(i + di, j + dj), ng = g + Math.hypot(di, dj)*G;
      if (ng >= (cost.get(k) ?? Infinity) || blocked(nx, nz, y) || (di && dj && (blocked(x + di*G, z, y) || blocked(x, z + dj*G, y)))) continue;
      cost.set(k, ng); from.set(k, key(i, j)); open.push([ng + Math.hypot(tx - nx, tz - nz), ng, i + di, j + dj, game.world.ground(nx, nz)]);
    }
  }
  return null;
}
// skip the grid's zigzags wherever a straight walk is clear
function straighten(pts){
  const clear = (a, b) => { const d = Math.hypot(b[0] - a[0], b[1] - a[1]); for (let s = .25; s < d; s += .25) { const k = s/d, x = a[0] + (b[0] - a[0])*k, z = a[1] + (b[1] - a[1])*k; if (blocked(x, z, game.world.ground(x, z))) return false; } return true; };
  const out = [pts[0]]; let i = 0;
  while (i < pts.length - 1) { let j = pts.length - 1; while (j > i + 1 && !clear(pts[i], pts[j])) j--; out.push(pts[j]); i = j; }
  return out;
}
const target = name => {
  const w = game.world, q = name.toLowerCase(), people = w.npcs.filter(n => n.range > 0), things = w.usables.filter(u => !u.hidden && (!u.when || u.when()));
  const all = [...people.map(n => ({n, name:n.name})), ...things.map(u => ({u, name:u.name})), ...things.map(u => ({u, name:u.verb}))];
  return all.find(a => a.name.toLowerCase() === q) || all.find(a => a.name.toLowerCase().includes(q));
};
function steer(wk){
  const o = wk.n || wk.u, d = Math.hypot(o.x - player.x, o.z - player.z);
  const done = why => { P.walk = null; joy.x = joy.y = 0; wk.done(why); };
  if (control() !== 'walk') return done('stopped: ' + control());
  if (wk.n ? game.nearest === wk.n : game.reach.includes(wk.u)) return done('arrived');
  if (game.elapsed > wk.until) return done('gave up: too long');
  if (d < wk.best - .1) { wk.best = d; wk.still = 0; } else if ((wk.still += H) > 1.5) {
    if (wk.tries++ >= 2) return done('gave up: stuck');
    const p = plan(wk); if (!p) return done('gave up: no way there'); wk.still = 0;
  }
  let [x, z] = wk.pts[wk.i] || [o.x, o.z];
  if (Math.hypot(x - player.x, z - player.z) < .35 && wk.i < wk.pts.length) { wk.i++; [x, z] = wk.pts[wk.i] || [o.x, o.z]; }
  const dx = x - player.x, dz = z - player.z, m = Math.hypot(dx, dz) || 1; joy.x = dx/m; joy.y = dz/m;
}
function plan(wk){
  const o = wk.n || wk.u, near = Math.max(.4, (o.range || 1.7) - .35), p = path(o.x, o.z, near);
  if (!p) return null;
  wk.pts = straighten(p).slice(1); wk.i = 0; return wk;
}

// what's shown about each picture, and every answer the state gives
const r = n => Math.round(n*10)/10;
function brief(){
  const tn = tripNow(), w = game.world;
  return {t:r(game.elapsed), trip:tn && tn.id, chapter:tn && (tn.chapter === null ? tn.name : `${tn.chapter}: ${tn.name}`), place:w.title || 'Lantern Hill HQ', area:$('area').textContent,
    talk:convo && curItem ? `${curItem.p.name}: ${typing.text}` : null};
}

window.harness = {
  pace(o = {}){ Object.assign(P, o); if (o.every) P.next = game.elapsed; return {speed:P.speed, read:P.read, every:P.every}; },
  go(){ P.held = false; },
  // a trip by its id (its storyboard lives at trips/<id>/index.js), from a chapter by number or by a word of its name;
  // seed stands in for what the skipped chapters would have left (tectonics: {pick: 'hotspot'} for the island);
  // save fills save slots first ({lab: {done: ['volcano']}})
  async start({trip, chapter = 0, seed, save:slots = {}} = {}){
    for (const [k, v] of Object.entries(slots)) save(k, v);
    setSound(false);
    if (!trip) return brief();
    const t = (await import(`./trips/${trip}/index.js`))[trip], i = typeof chapter === 'number' ? chapter : t.chapters.findIndex(c => c[0].includes(chapter));
    if (!t.chapters[i]) throw new Error(`no chapter ${chapter}; there are: ${t.chapters.map((c, k) => k + ' ' + c[0]).join(', ')}`);
    startTrip(t, i, seed); return brief();
  },
  state(){
    const w = game.world, px = player.x, pz = player.z, dist = o => r(Math.hypot(o.x - px, o.z - pz)), talking = convo && curItem;
    return {...brief(), speed:P.speed, control:control(), goal:shown($('obj')) ? $('obj').textContent : null,
      talk:talking ? {who:curItem.p.name, line:typing.text, choices:choices()} : null, heard:heard.splice(0),
      you:{x:r(px), z:r(pz)},
      people:w.npcs.filter(n => n.model.root.visible).map(n => ({name:n.name, dist:dist(n), x:r(n.x), z:r(n.z), talk:n.range > 0 && game.nearest === n, calling:!!n.calling})).sort((a, b) => a.dist - b.dist),
      things:w.usables.filter(u => !u.hidden && (!u.when || u.when())).map(u => { const k = game.reach.indexOf(u);
        return {name:u.name, verb:u.verb, dist:dist(u), x:r(u.x), z:r(u.z), key:k >= 0 && control() === 'walk' ? 'ERWTQY'[k] : null}; }).sort((a, b) => a.dist - b.dist),
      overlays:overlays()};
  },
  walk(name){
    const a = target(name); if (!a) return Promise.resolve('nobody and nothing called ' + name);
    if (P.walk) P.walk.done('replaced');
    return new Promise(done => {
      const o = a.n || a.u, wk = {n:a.n, u:a.u, done, best:Infinity, still:0, tries:0, until:game.elapsed + 8 + Math.hypot(o.x - player.x, o.z - player.z)/1.5};
      if (!plan(wk)) return done('gave up: no way there');
      P.walk = wk;
    });
  },
  // until the explorer is needed (a question, something on screen, or the controls back after a scene) or s seconds pass
  wait(s = 10){
    const end = game.elapsed + s; let away = false;
    return new Promise(done => { const f = () => {
      const c = control(); away ||= c !== 'walk';
      const why = c === 'question' ? 'question' : overlays().find(o => o === 'notebook' || o === 'badge') || (c === 'walk' && away ? 'your turn' : game.elapsed >= end ? 'time' : null);
      if (why) done(why); else requestAnimationFrame(f); }; f(); });
  },
};
