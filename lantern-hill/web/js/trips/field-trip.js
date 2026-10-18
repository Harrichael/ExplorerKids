// Runs a field trip: the Wonder Bus flies off from HQ, visits each stop in turn and brings everyone
// home for a badge. What a trip shows and says lives in its definition (see tectonics/index.js).

import * as THREE from 'three';
import { clamp01, ease, glowTex, occluder, sparkTex } from '../core/kit.js';
import { Sound } from '../core/sound.js';
import { addUsable, inWorld } from '../core/world.js';
import { cfg } from '../explorer.js';
import { driveVan, van, vanBody } from '../hq/garden.js';
import { HQ } from '../hq/index.js';
import { enterWorld } from '../play.js';
import { blob, hero, player } from '../player.js';
import { buildBus } from '../props/wonder-bus.js';
import { load, save } from '../save.js';
import { game } from '../state.js';
import { endConvo, story } from '../ui/dialogue.js';
import { $ } from '../ui/dom.js';
import { pageTurn } from '../ui/page-turn.js';

const objEl = $('obj'), leaveBtn = $('leaveTrip');
export function objective(text){ objEl.hidden = !text; objEl.textContent = text || ''; }

function makeWagon(){
  const root = new THREE.Group(), body = new THREE.Group(); root.add(body);
  const pads = buildBus(body);
  return {root, body, pads};
}
export function wagonDock(w, x, y, z, ry, ux, uz){
  const wg = makeWagon(); wg.root.position.set(x, y, z); wg.root.rotation.y = ry; wg.baseY = y; w.scene.add(wg.root); w.wagon = wg;
  wg.update = () => wagonUpdate(w);
  inWorld(w, () => occluder(wg.root));
  addUsable(w, {name:'Wonder Bus', x:ux, z:uz, range:1.8, verb:'Climb into the Wonder Bus', short:'Ride', glow:[x, y + 2.7, z], action: () => boardWagon(w)});
}
function wagonUpdate(w){
  const wg = w.wagon; if (!wg) return;
  if (w.lift) {
    const p = clamp01((game.elapsed - w.lift.t0)/2.4);
    wg.root.position.y = wg.baseY + Math.pow(p, 1.7)*18; wg.body.rotation.z = Math.min(.4, p*1.3); wg.body.position.y = 0;
  } else if (w.arriveT !== undefined && game.elapsed - w.arriveT < 2) {
    const p = ease(clamp01((game.elapsed - w.arriveT)/2)); wg.root.position.y = wg.baseY + (1 - p)*10; wg.body.rotation.z = -(1 - p)*.3;
  } else { wg.root.position.y = wg.baseY; wg.body.rotation.z = 0; wg.body.position.y = Math.sin(game.elapsed*1.7)*.1; }
}

// ---------- the field trip ----------
const TRIP = {on:false, stage:0};
let trip = null, vanAnim = null;
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
export function startTrip(t){
  if (TRIP.on || game.cutscene) return;
  trip = t; TRIP.on = true; TRIP.stage = 0;
  story(trip.intro, () => {
    game.cutscene = true; hero.root.visible = false; blob.visible = false; Sound.setTheme('trip');
    [523, 659, 784].forEach((f, i) => Sound.tone(f, {type:'triangle', t:i*.08, dur:.2, vol:.07}));
    const a = {mode:'fly', t0:game.elapsed, dur:6.2, p:0, done: () => goStage(0)};
    // from down by the wheels, craning up out of the garden to watch it go; never past the
    // garden's edge, where the forest starts
    game.cutCam = (pos, look) => {
      const k = ease(clamp01((a.p - .06)/.72));
      pos.set(11 + k*1.2, 2.4 + k*5.8, 10.2);
      if (a.pop) look.copy(a.pop); else look.set(van.position.x, van.position.y + 1.1, van.position.z);
    };
    flyVan(a);
  });
}
function goStage(i){
  TRIP.stage = i; const stage = trip.stages[i];
  pageTurn(() => {
    flyVan(null);
    van.visible = false;
    const w = stage.build(); enterWorld(w, w.spawn); w.arriveT = game.elapsed;
    hero.root.visible = true; blob.visible = true; leaveBtn.hidden = false; objective('');
  }, () => { if (game.world.onEnter) game.world.onEnter(); }, [`Chapter ${i + 1}`, stage.title]);
}
function boardWagon(w){
  if (!w.cleared) { story([['sparks', w.notYet]]); return; }
  game.cutscene = true; hero.root.visible = false; blob.visible = false; objective('');
  [523, 659, 784].forEach((f, i) => Sound.tone(f, {type:'triangle', t:i*.08, dur:.2, vol:.07}));
  Sound.hiss({dur:2.2, vol:.1, type:'bandpass', freq:900, q:.6}); Sound.tone(200, {type:'sawtooth', dur:2.2, vol:.04, f2:560, cut:900});
  w.lift = {t0: game.elapsed + .3};
  const wp = new THREE.Vector3(), sx = player.x, sz = player.z;
  game.cutCam = (pos, look) => { w.wagon.root.getWorldPosition(wp); pos.set(sx, 4.4 + Math.max(0, wp.y - 1)*.35, sz + 8); look.set(wp.x, wp.y + 1, wp.z); };
  setTimeout(() => { if (TRIP.stage < trip.stages.length - 1) goStage(TRIP.stage + 1); else returnHome(); }, 2300);
}
function returnHome(){
  pageTurn(() => {
    Sound.setTheme('home'); enterWorld(HQ, [17.4, 2.4, -2.5]); hero.root.visible = false; blob.visible = false; leaveBtn.hidden = true; objective('');
    van.visible = true; game.cutscene = true;
    game.cutCam = (pos, look) => { pos.set(16.4, 4.4, 10.8); look.set(van.position.x, van.position.y + 1, van.position.z); };
    flyVan({mode:'land', t0:game.elapsed + .6, dur:3, done: () => {
      hero.root.visible = true; blob.visible = true; game.cutCam = null; game.cutscene = false;
      story(trip.outro, () => { TRIP.on = false; showBadge(); });
    }});
  }, null, ['The end of the trip', 'Home to Lantern Hill']);
}
function leaveTrip(){
  if (!TRIP.on || game.cutscene) return;
  endConvo(false); TRIP.on = false;
  pageTurn(() => { Sound.setTheme('home'); resetVan(); enterWorld(HQ, [16.2, 2.4, Math.PI]); hero.root.visible = true; blob.visible = true; leaveBtn.hidden = true; objective(''); }, null, ['', 'Back to Lantern Hill']);
}
leaveBtn.addEventListener('click', e => { e.stopPropagation(); leaveTrip(); });
function showBadge(){
  const saved = load('trips'), done = saved && typeof saved === 'object' ? saved : {};
  done[trip.id] = true; save('trips', done);
  trip.badge.draw($('badgeCan')); $('bTitle').textContent = trip.badge.title;
  $('bText').textContent = trip.badge.text(cfg.name || 'Explorer');
  $('badge').hidden = false; game.cutscene = true;
  [523, 659, 784, 1046, 1319].forEach((f, i) => Sound.tone(f, {type:'triangle', t:i*.1, dur:.45, vol:.09}));
  setTimeout(() => $('badgeOk').focus({preventScroll:true}), 80);
}
$('badgeOk').addEventListener('click', () => { $('badge').hidden = true; game.cutscene = false; Sound.next(); });
