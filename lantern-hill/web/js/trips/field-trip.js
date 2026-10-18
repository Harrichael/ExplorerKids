// Runs a field trip: the Wonder Bus flies off from HQ, visits each stop in turn and brings everyone
// home for a badge. What a trip shows and says lives in its definition (see tectonics/index.js).

import * as THREE from 'three';
import { clamp01, ease, occluder } from '../core/kit.js';
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
const VAN_HOME = {x:15.6, z:5.5, dx:Math.cos(.3), dz:Math.sin(.3)};
function flyVan(a){ vanAnim = a; driveVan(a ? updateVanAnim : null); }
function resetVan(){ flyVan(null); van.visible = true; van.position.set(VAN_HOME.x, 0, VAN_HOME.z); vanBody.rotation.set(0, 0, 0); }
function updateVanAnim(){
  const a = vanAnim, p = clamp01((game.elapsed - a.t0)/a.dur);
  if (a.mode === 'fly') {
    const drive = ease(clamp01(p/.5))*6, lift = Math.pow(clamp01((p - .32)/.68), 1.6);
    van.position.set(VAN_HOME.x + VAN_HOME.dx*(drive + lift*16), lift*24, VAN_HOME.z + VAN_HOME.dz*(drive + lift*16));
    vanBody.rotation.z = Math.min(.42, lift*2); vanBody.position.y = .08;
    if (p > .3 && !a.whoosh) { a.whoosh = true; Sound.hiss({dur:2.6, vol:.1, type:'bandpass', freq:900, q:.6}); Sound.tone(200, {type:'sawtooth', dur:2.6, vol:.04, f2:560, cut:900}); }
    if (p >= .88 && !a.fired) { a.fired = true; if (a.done) a.done(); }
  } else if (a.mode === 'land') {
    const q = ease(p);
    van.position.set(VAN_HOME.x - VAN_HOME.dx*(1 - q)*12, (1 - q)*20, VAN_HOME.z - VAN_HOME.dz*(1 - q)*12);
    vanBody.rotation.z = -(1 - q)*.3;
    if (p >= 1 && !a.fired) { a.fired = true; const f = a.done; resetVan(); if (f) f(); }
  }
}
export function startTrip(t){
  if (TRIP.on || game.cutscene) return;
  trip = t; TRIP.on = true; TRIP.stage = 0;
  story(trip.intro, () => {
    game.cutscene = true; hero.root.visible = false; blob.visible = false; Sound.setTheme('trip');
    [523, 659, 784].forEach((f, i) => Sound.tone(f, {type:'triangle', t:i*.08, dur:.2, vol:.07}));
    game.cutCam = (pos, look) => { const h = van.position.y; pos.set(VAN_HOME.x - 5, 3.4 + h*.35, VAN_HOME.z + 8.5 + h*.1); look.set(van.position.x, van.position.y + 1.2, van.position.z); };
    flyVan({mode:'fly', t0:game.elapsed, dur:4.6, done: () => goStage(0)});
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
