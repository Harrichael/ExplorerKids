// Runs a field trip: the Wonder Bus flies off from HQ, the trip's own script plays out, and the bus
// brings everyone home for a badge. A trip is one continuous story: rides that the explorer watches
// from their seat, and places where they get off and explore. Its script (see tectonics/index.js)
// is an async function handed the director below, so the storyboard reads top to bottom:
//
//   setup: t => ({cab: cabin()}),             // what the chapters share
//   chapters: [['Over the sea', async (t, {cab}) => {
//     t.watch(cab.world, cab.shot('class'));
//     await t.say([['sparks', "Hold on to your hats!"]]);
//     const i = await t.ask('pip', "What will happen?", ["It rises", "It sinks"]);
//     t.play(place.world, place.spawn);        // the explorer has control
//     await t.until(() => place.cleared);
//   }], ...]

import * as THREE from 'three';
import { clamp01, ease, glowTex, sparkTex } from '../core/kit.js';
import { Sound } from '../core/sound.js';
import { addUsable } from '../core/world.js';
import { cfg } from '../explorer.js';
import { driveVan, van, vanBody } from '../hq/garden.js';
import { HQ } from '../hq/index.js';
import { enterWorld } from '../play.js';
import { blob, hero, player } from '../player.js';
import { load, save } from '../save.js';
import { game } from '../state.js';
import { ask, endConvo, story } from '../ui/dialogue.js';
import { $ } from '../ui/dom.js';
import { pageTurn } from '../ui/page-turn.js';
import { cheers, explorerCheck } from './quiz.js';
import { heroHopIn, hopIn, spawnNPC } from './stop-kit.js';

const objEl = $('obj'), leaveBtn = $('leaveTrip');
export function objective(text){ objEl.hidden = !text; objEl.textContent = text || ''; }

// ---------- the field trip ----------
const TRIP = {on:false, chapter:null};
let trip = null, vanAnim = null;
// which trip is on, and its chapter: an index into trip.chapters
export const tripNow = () => TRIP.on ? {id:trip.id, chapter:TRIP.chapter, name:trip.chapters[TRIP.chapter][0]} : null;
const VAN_HOME = {x:15.6, z:5.5, ry:-.3, dx:Math.cos(.3), dz:Math.sin(.3)};
// takeoff: a hop, then a climbing left turn over the lily pond and off toward the moon, wide
// enough of the treehouse that its canopy never hides the bus from the garden camera
const FLIGHT = new THREE.CatmullRomCurve3([[15.6, .6, 5.5], [18.6, .9, 6.4], [22.4, 2.6, 6.6], [26.4, 6.5, 3.6], [31, 11.5, -1.5],
  [38.5, 16, -9], [48, 20, -17], [58, 23, -25]].map(p => new THREE.Vector3(...p)), false, 'centripetal');
const tan = new THREE.Vector3(), tan2 = new THREE.Vector3();

// stardust the bus trails through the sky, and the twinkle it vanishes into
const DUST = 120, dustPos = new Float32Array(DUST*3), dustCol = new Float32Array(DUST*3), dust = [];
for (let i = 0; i < DUST; i++) dust.push({age:1, life:1, vx:0, vy:0, vz:0});
const dustGeo = new THREE.BufferGeometry(); dustGeo.setAttribute('position', new THREE.BufferAttribute(dustPos, 3)); dustGeo.setAttribute('color', new THREE.BufferAttribute(dustCol, 3));
const dustPts = new THREE.Points(dustGeo, new THREE.PointsMaterial({size:.7, map:glowTex, vertexColors:true, transparent:true, depthWrite:false, fog:false, blending:THREE.AdditiveBlending}));
dustPts.frustumCulled = false; HQ.scene.add(dustPts);
const twinkle = new THREE.Sprite(new THREE.SpriteMaterial({map:sparkTex, color:0xfff1cf, transparent:true, depthWrite:false, fog:false, blending:THREE.AdditiveBlending}));
twinkle.visible = false; HQ.scene.add(twinkle);
let dustNext = 0, dustT = 0;
// unseeded: the stops build their layouts from the shared seeded RNG
const jit = (a, b) => a + Math.random()*(b - a);
const nozzle = new THREE.Vector3();
function puffDust(n){
  for (let k = 0; k < n; k++) {
    const d = dust[dustNext], i = dustNext; dustNext = (dustNext + 1) % DUST;
    vanBody.localToWorld(nozzle.set(-2.95, 1.05, k % 2 ? .55 : -.55));
    dustPos.set([nozzle.x + jit(-.15, .15), nozzle.y + jit(-.15, .15), nozzle.z + jit(-.15, .15)], i*3);
    Object.assign(d, {age:0, life:jit(.9, 1.6), vx:jit(-.4, .4), vy:jit(-.5, .1), vz:jit(-.4, .4), warm:Math.random() < .7});
  }
}
function stepDust(dt){
  for (let i = 0; i < DUST; i++) { const d = dust[i]; d.age += dt;
    const f = Math.max(0, 1 - d.age/d.life);
    dustPos[i*3] += d.vx*dt; dustPos[i*3+1] += d.vy*dt; dustPos[i*3+2] += d.vz*dt;
    dustCol.set(d.warm ? [f, f*.82, f*.48] : [f*.8, f*.9, f], i*3); }
  dustGeo.attributes.position.needsUpdate = dustGeo.attributes.color.needsUpdate = true;
}
function clearDust(){ dust.forEach(d => d.age = d.life); stepDust(0); twinkle.visible = false; }

function flyVan(a){ vanAnim = a; if (a) dustT = game.elapsed; else clearDust(); driveVan(a ? updateVanAnim : null); }
function resetVan(){ flyVan(null); van.visible = true; van.position.set(VAN_HOME.x, 0, VAN_HOME.z); van.rotation.y = VAN_HOME.ry; vanBody.rotation.set(0, 0, 0); }
function updateVanAnim(){
  const a = vanAnim, p = clamp01((game.elapsed - a.t0)/a.dur), dt = game.elapsed - dustT; dustT = game.elapsed; a.p = p;
  if (a.mode === 'fly') {
    const q = clamp01((p - .14)/.86);
    if (!q) { const hop = ease(clamp01(p/.14)); van.position.set(VAN_HOME.x, hop*.6, VAN_HOME.z); vanBody.rotation.set(0, 0, Math.sin(hop*Math.PI)*.08); }
    else {
      // slow to leave the ground, then away like a shooting star
      const u = Math.pow(q, 1.9);
      FLIGHT.getPointAt(u, van.position); FLIGHT.getTangentAt(u, tan); FLIGHT.getTangentAt(Math.min(1, u + .03), tan2);
      const yaw = Math.atan2(-tan.z, tan.x), turn = Math.atan2(-tan2.z, tan2.x) - yaw;
      van.rotation.y = yaw;
      vanBody.rotation.set(-Math.min(.32, turn*5), 0, Math.min(.22, Math.atan2(tan.y, Math.hypot(tan.x, tan.z))*.7)*Math.min(1, q*6));
      if (van.visible) puffDust(q < .5 ? 1 : 2);
    }
    vanBody.position.y = .08;
    if (p > .14 && !a.whoosh) { a.whoosh = true; Sound.hiss({dur:2.8, vol:.1, type:'bandpass', freq:900, q:.6}); Sound.tone(200, {type:'sawtooth', dur:2.8, vol:.04, f2:560, cut:900}); }
    if (q > .9 && !a.pop) {
      a.pop = van.position.clone(); van.visible = false; twinkle.position.copy(a.pop); twinkle.visible = true;
      [1319, 1568, 2093].forEach((f, i) => Sound.tone(f, {type:'triangle', t:i*.07, dur:.35, vol:.06}));
    }
    if (a.pop) { const k = clamp01((game.elapsed - a.t0 - a.dur*(.14 + .86*.9))/.6); twinkle.scale.setScalar(Math.sin(k*Math.PI)*4.5); twinkle.material.rotation = k*1.5; }
    if (p >= 1 && !a.fired) { a.fired = true; if (a.done) a.done(); }
  } else if (a.mode === 'land') {
    const q = ease(p);
    van.position.set(VAN_HOME.x - VAN_HOME.dx*(1 - q)*12, (1 - q)*20, VAN_HOME.z - VAN_HOME.dz*(1 - q)*12);
    van.rotation.y = VAN_HOME.ry; vanBody.rotation.z = -(1 - q)*.3;
    if (q < .9) puffDust(1);
    if (p >= 1 && !a.fired) { a.fired = true; const f = a.done; resetVan(); if (f) f(); }
  }
  stepDust(dt);
}
// Starting at a later chapter skips the takeoff, for trying out one part of a trip on its own; seed
// stands in for what the chapters skipped would have left in what they share (a choice made, say).
export function startTrip(t, from = 0, seed){
  if (TRIP.on || game.cutscene) return;
  trip = t; TRIP.on = true; TRIP.chapter = from;
  if (from) { Sound.setTheme('trip'); run(from, seed); return; }
  story(trip.intro, async () => {
    game.cutscene = true; Sound.setTheme('trip');
    await allAboard();
    hero.root.visible = false; blob.visible = false;
    [523, 659, 784].forEach((f, i) => Sound.tone(f, {type:'triangle', t:i*.08, dur:.2, vol:.07}));
    const a = {mode:'fly', t0:game.elapsed, dur:6.2, p:0, done: () => { flyVan(null); van.visible = false; run(); }};
    // from down by the wheels, craning up out of the garden to watch it go; never past the
    // garden's edge, where the forest starts
    game.cutCam = (pos, look) => {
      const k = ease(clamp01((a.p - .06)/.72));
      pos.set(11 + k*1.2, 2.4 + k*5.8, 10.2);
      if (a.pop) look.copy(a.pop); else look.set(van.position.x, van.position.y + 1.1, van.position.z);
    };
    game.camSnap = true; flyVan(a);
  });
}

// The class piles in before takeoff: the kids run up from round the garden and hop in at the door, then
// Dr. Sparks with a cheer, then the explorer. Those who live at HQ are off on the trip until it's over.
const AWAY = ['sparks', 'pip', 'juniper'];
const away = gone => { for (const n of HQ.npcs) if (AWAY.includes(n.pid)) n.model.root.visible = n.label.visible = !gone; };
// from further and further off, so they reach the door one after another; Dr. Sparks comes out of
// the cottage last, cheers them in and follows
const RUNNERS = [['pip', 19.2, 1.5], ['juniper', 12.9, 2.8], ['basil', 14.4, -.9], ['mo', 11.3, 0], ['sparks', 10.9, 2.2, .7]];
const at = (x, y, z) => van.localToWorld(new THREE.Vector3(x, y, z));
const until = test => new Promise(ok => { const f = () => test() ? ok() : requestAnimationFrame(f); f(); });
const pause = s => { const end = game.elapsed + s; return until(() => game.elapsed >= end); };
async function allAboard(){
  away(true);
  const door = at(1.62, 0, -1.35), inside = at(1.62, .3, -.75);
  game.cutCam = (pos, look) => { pos.set(16.2, 4.7, -.9); look.set(16.6, .7, 4.6); }; game.camSnap = true;
  let turn = 0;
  // one at a time through the door
  await Promise.all(RUNNERS.map(async ([id, x, z, late = 0], i) => {
    const n = spawnNPC(HQ, id, x, z, 0); n.range = 0; n.label.visible = false;
    await pause(late);
    await new Promise(ok => { n.goal = {x:door.x, z:door.z, run:true, then:ok}; });
    if (id === 'sparks') { n.pose = 'cheer'; Sound.tone(784, {type:'triangle', dur:.25, vol:.06}); await pause(.45); }
    await until(() => turn === i);
    await hopIn(n, [inside.x, inside.y, inside.z]); turn++;
    HQ.npcs.splice(HQ.npcs.indexOf(n), 1); HQ.scene.remove(n.model.root, n.label);
  }));
  await heroHopIn([inside.x, inside.z]);
}

// ---------- the director: what a trip's script awaits ----------
// Leaving the trip strands the script mid-await; everything it awaits checks for that and stops it.
const GONE = Symbol('left the trip');
let dir = null;
function run(from = 0, seed){
  const me = dir = makeDirector(), shared = Object.assign(trip.setup(me), seed);
  (async () => { for (let i = from; i < trip.chapters.length; i++) { TRIP.chapter = i; await trip.chapters[i][1](me, shared); } })()
    .then(() => { if (dir === me) returnHome(shared); }, e => { if (e !== GONE) throw e; });
}
function makeDirector(){
  let held = null;
  const d = {gone:false, heard:new Set(), ends:[() => { if (held) held.parent.remove(held); held = null; }]};
  const live = p => p.then(v => { if (d.gone) throw GONE; return v; });
  const frames = test => live(new Promise(ok => { const f = () => d.gone || test() ? ok() : requestAnimationFrame(f); f(); }));
  Object.assign(d, {
    // the explorer is watching: from their seat on the bus, or hidden inside it while the camera shows the bus.
    // A cam that returns true is followed exactly, for shots that ride along with something fast.
    watch(w, cam, {seated = false, spawn} = {}){
      if (game.world !== w) enterWorld(w, spawn || w.spawn || [0, 0, 0]);
      game.cutscene = true; game.cutCam = cam; game.camSnap = true;
      hero.root.visible = seated; blob.visible = false; leaveBtn.hidden = true; objective('');
    },
    // a new camera on the same scene, cut to without a glide
    cut(cam){ game.cutCam = cam; game.camSnap = true; },
    play(w, spawn){
      if (game.world !== w) enterWorld(w, spawn || w.spawn);
      else if (spawn) { player.x = spawn[0]; player.z = spawn[1]; player.angle = spawn[2] ?? player.angle; }
      game.cutscene = false; game.cutCam = null; hero.root.visible = true; blob.visible = true; leaveBtn.hidden = false;
    },
    say: lines => live(new Promise(ok => story(lines, ok))),
    // a question with answers to pick from, shown in a shuffled order so the right answer isn't always
    // first, unless `keep` (an offer, say, with its yes first); resolves with the index of the one picked as given
    ask: (who, text, answers, {keep = false} = {}) => { const order = answers.map((a, i) => i); if (!keep) order.sort(() => Math.random() - .5);
      return live(new Promise(ok => ask(who, text, order.map(i => answers[i]), j => ok(order[j])))); },
    // an extra the explorer can ask for or skip, its two answers always in the same places; resolves true if asked for.
    // What was asked for is kept in d.heard, for the Explorer Check.
    more: (who, text) => live(new Promise(ok => ask(who, text, ["Tell me more!", "Let's keep going!"], i => { if (i === 0) d.heard.add(text); ok(i === 0); }))),
    wait: s => { const end = game.elapsed + s; return frames(() => game.elapsed >= end); },
    // f(k) every frame as k runs from 0 to 1 over s seconds of game time
    tween: (s, f) => { const t0 = game.elapsed; return frames(() => { const k = Math.min(1, (game.elapsed - t0)/s); f(k); return k >= 1; }); },
    until: test => frames(test),
    // in the middle of a scene, the explorer has control again, with `goal` to do, until p settles;
    // resolves with its value. Meanwhile d.busy, so side finds step aside and leave the keys to the goal.
    free: async (p, goal) => { const was = objEl.hidden ? '' : objEl.textContent;
      game.cutscene = false; game.cutCam = null; if (goal) objective(goal); d.busy = true;
      try { return await p; } finally { d.busy = false; if (!d.gone) { game.cutscene = true; objective(was); } } },
    // things in a place to press, each glowing where it is; resolves with the index of the one pressed,
    // once they're all taken away again
    use: (w, ...spots) => { let hit = -1;
      const us = spots.map((s, i) => addUsable(w, {name:s.verb, range:1.7, ...s, action: () => { hit = i; }}));
      return frames(() => hit >= 0).finally(() => us.forEach(u => { w.usables.splice(w.usables.indexOf(u), 1); w.scene.remove(u.sparkle);
        // still in range, it would keep its key and its prompt
        const k = game.reach.indexOf(u); if (k >= 0) game.reach[k] = null; })).then(() => hit); },
    // something small carried in the explorer's right hand; let go, it stays where it was in the world
    hold(m){ d.drop(); held = m; hero.armR.add(m); m.position.set(0, -.64, .12); m.visible = true; },
    drop(){ const m = held; held = null; if (m) game.world.scene.attach(m); return m; },
    goal: objective,
    // undoes something a place did outside its own world, however the trip ends
    onEnd: f => { d.ends.push(f); },
  });
  return d;
}
const endTrip = d => { if (d) d.ends.splice(0).forEach(f => f()); };
function returnHome(shared){
  if (trip.quiz) { const q = trip.quiz, had = (load('trips') || {})[q.pool] || []; save('trips', {[q.pool]: [...new Set([...had, ...q.found(shared, dir.heard)])]}); }
  endTrip(dir); dir = null;
  pageTurn(() => {
    Sound.setTheme('home'); away(false); enterWorld(HQ, [17.4, 2.4, -2.5]); hero.root.visible = false; blob.visible = false; leaveBtn.hidden = true; objective('');
    van.visible = true; game.cutscene = true;
    game.cutCam = (pos, look) => { pos.set(16.4, 4.4, 10.8); look.set(van.position.x, van.position.y + 1, van.position.z); };
    flyVan({mode:'land', t0:game.elapsed + .6, dur:3, done: () => {
      hero.root.visible = true; blob.visible = true; game.cutCam = null; game.cutscene = false;
      story(trip.outro, () => { TRIP.on = false; showBadge(shared); });
    }});
  }, null, ['The end of the trip', 'Home to Lantern Hill']);
}
function leaveTrip(){
  if (!TRIP.on || game.cutscene) return;
  if (dir) { dir.gone = true; endTrip(dir); }
  dir = null; endConvo(false); TRIP.on = false;
  pageTurn(() => { Sound.setTheme('home'); away(false); resetVan(); enterWorld(HQ, [16.2, 2.4, Math.PI]); hero.root.visible = true; blob.visible = true; leaveBtn.hidden = true; objective(''); }, null, ['', 'Back to Lantern Hill']);
}
leaveBtn.addEventListener('click', e => { e.stopPropagation(); leaveTrip(); });
function showBadge(shared){
  const saved = load('trips'), done = saved && typeof saved === 'object' ? saved : {};
  done[trip.id] = true; save('trips', done);
  trip.badge.draw($('badgeCan'), shared); $('bTitle').textContent = trip.badge.title;
  $('bText').textContent = trip.badge.text(cfg.name || 'Explorer', shared);
  $('badge').hidden = false; game.cutscene = true;
  [523, 659, 784, 1046, 1319].forEach((f, i) => Sound.tone(f, {type:'triangle', t:i*.1, dur:.45, vol:.09}));
  setTimeout(() => $('badgeOk').focus({preventScroll:true}), 80);
}
$('badgeOk').addEventListener('click', () => { $('badge').hidden = true; game.cutscene = false; Sound.next(); });

// ---------- Dr. Sparks's Explorer Check, from the Wonder Bus at home ----------
// The check is offered on the bus at the end of a trip; one put off till later, or tried again for more
// stars, is the same sheet, handed over at the bus. It asks about what was found on every trip so far.
export async function startCheck(t){
  if (TRIP.on || game.cutscene) return;
  const r = await explorerCheck(t.quiz, (load('trips') || {})[t.quiz.pool], {done:'Hooray!'});
  game.cutscene = false;
  // a first perfect score shows the badge again, with its new ring of stars
  story(cheers(r), () => { if (r.perfect) story([['sparks', "Wait, {name}! Look at your badge. A perfect Explorer Check earns it a ring of stars!"]], () => { trip = t; showBadge(null); }); });
}
