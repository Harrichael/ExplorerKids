// The experiment desk: the things on it and how they behave when held, carried over each other,
// tipped, dropped, floated, stirred and stuck to magnets, with chemistry running in every container.
// The hands steer it and experiments read it; it knows nothing about either. Positions are in the
// desk's frame: x across, z toward the explorer, y up from the desk top.

import * as THREE from 'three';
import { clamp01, grad } from '../core/kit.js';
import { Sound } from '../core/sound.js';
import * as chem from './chem.js';
import { makeFx } from './fx.js';
import { ITEMS, capacity } from './stuff.js';

export const BOUNDS = {x:.8, z:.52};
const MAX_TIP = 2.4;

export const desk = {root:null, fx:null, items:[], held:null, ray:null, tip:false, endless:false, on:() => {}};
const emit = ev => desk.on(ev);
const vessels = () => desk.items.filter(isVessel);
export const isVessel = it => it.def.kind === 'vessel';
export const find = id => desk.items.find(it => it.id === id);

const mouthR = v => v.def.mouth || v.def.ri;
const catchR = v => v.def.catch || mouthR(v) + .012;
function levels(v){
  const k = v.def.hi/v.cap;
  return {w: Math.min(v.def.hi, chem.waterVol(v.c)*k), o: chem.oilVol(v.c)*k, p: Math.min(v.def.hi*.45, chem.pileVol(v.c)*k*1.4)};
}
// heights above the container's own bottom
const waterTop = v => v.def.floor + levels(v).w;
const oilTop = v => { const l = levels(v); return v.def.floor + Math.min(v.def.hi, l.w + l.o); };
const top = v => { const l = levels(v); return v.def.floor + Math.min(v.def.hi, Math.max(l.w + l.o, l.p)); };
const upright = v => v.tilt < .3 && v.state !== 'held' && v.state !== 'fall' && v.state !== 'gone';
const balloonOn = v => desk.items.find(b => b.state === 'attached' && b.host === v);

// the container whose mouth is under a point, if any can take a pour there
function under(x, z, skip){
  let best = null;
  for (const v of desk.items) {
    if (!isVessel(v) || v === skip || !upright(v) || v.state === 'attached' || v.state === 'stuck' || balloonOn(v)) continue;
    if (Math.hypot(x - v.x, z - v.z) < catchR(v) && (!best || v.y + v.def.h > best.y + best.def.h)) best = v;
  }
  return best;
}
const inBounds = (x, z) => Math.abs(x) < BOUNDS.x + .05 && Math.abs(z) < BOUNDS.z + .08;

const world = {under: (x, z) => under(x, z), top, waterTop, oilTop, inside: v => v.state !== 'gone' && v.tilt < .5,
  deliver: (v, p, x, z, settled) => deliver(v, p, x, z, settled), spill: (x, z, n, c) => desk.fx.spill(x, z, n, c)};

export function initDesk(root){ desk.root = root; desk.fx = makeFx(root, world); }

// ---------- building and clearing ----------
const UNIT_CYL = new THREE.CylinderGeometry(1, 1, 1, 24), HEMI = new THREE.SphereGeometry(1, 16, 8, 0, Math.PI*2, 0, Math.PI/2);
function liquidMesh(parent, geo, order){
  const m = new THREE.Mesh(geo, new THREE.MeshToonMaterial({gradientMap:grad, color:0xffffff, transparent:true, depthWrite:false}));
  m.renderOrder = order; m.visible = false; parent.add(m); return m;
}
function makeItem(id, type, x, z, o, i){
  const def = ITEMS[type], g = new THREE.Group(), body = new THREE.Group(); g.add(body); desk.root.add(g);
  const it = {id, type, def, g, body, grip: def.grip !== undefined ? def.grip : def.h*.7, x, y:0, z, vx:0, vz:0, vy:0, tilt:0, swx:0, swz:0,
    state:'desk', host:null, ox:0, oy:0, oz:0, ry:0, pop:-i*.05, still:0};
  it.refs = def.build(body) || {};
  body.position.y = -it.grip;
  body.traverse(m => { if (m.isMesh) m.userData.item = it; });
  if (isVessel(it)) {
    it.full = o.fill || def.fill || {}; it.c = chem.fill(it.full); it.cap = capacity(def);
    it.stats = {gas:0, stir:0, bursts:0, blobs:0, dye:new Set(), sunk:0};
    it.foam = 0; it.head = 0; it.stir = 0;
    if (def.see) { it.liq = {w: liquidMesh(body, UNIT_CYL, 1), o: liquidMesh(body, UNIT_CYL, 1), p: liquidMesh(body, HEMI, 1), f: liquidMesh(body, UNIT_CYL, 2)};
      body.traverse(m => { if (m.isMesh) m.userData.item = it; }); }
  }
  if (def.fizz) it.stock = def.fizz;
  if (def.balloon) it.inflate = 0;
  return it;
}
export function setupDesk(layout, {endless=false}={}){
  clearDesk(); desk.endless = endless;
  layout.forEach(([id, type, x, z, o], i) => desk.items.push(makeItem(id, type, x, z, o || {}, i)));
}
export function clearDesk(){
  for (const it of desk.items) { desk.root.remove(it.g); disposeItem(it); }
  desk.items.length = 0; desk.held = null; desk.fx.clear();
}
function disposeItem(it){ it.g.traverse(m => { if (m.isMesh && m.material.map && m.material.map.isCanvasTexture) m.material.map.dispose(); }); }

// ---------- the hand ----------
const _ray = new THREE.Raycaster(), _p = new THREE.Vector3(), _o = new THREE.Vector3();
// what's under the pointer: whatever the ray touches first, except that a thing floating inside a
// glass wins over the glass itself; failing a hit, anything close to where it meets the desk
export function pick(worldRay){
  _ray.ray.copy(worldRay);
  const hits = _ray.intersectObjects(desk.items.filter(it => it.state !== 'gone').map(it => it.g), true);
  let first = null;
  for (const h of hits) { const it = h.object.userData.item; if (!it || !h.object.visible) continue;
    if (!first) first = it; else if (it.host === first && it.state === 'in') return it; }
  if (first) return first;
  const p = deskPoint(worldRay, 0); if (!p) return null;
  let best = null, bd = 1;
  for (const it of desk.items) { if (it.state === 'gone') continue; const d = Math.hypot(it.x - p.x, it.z - p.z) - it.def.r; if (d < .045 && d < bd) { bd = d; best = it; } }
  return best;
}
export function deskPoint(worldRay, y){
  _o.copy(worldRay.origin).sub(desk.root.position);
  if (Math.abs(worldRay.direction.y) < 1e-4) return null;
  const t = (y - _o.y)/worldRay.direction.y; if (t < 0) return null;
  return _p.copy(worldRay.direction).multiplyScalar(t).add(_o);
}
export function grab(it){
  if (desk.held) release();
  if (it.state === 'attached') { it.raised = true; it.grabAt = {x:it.host.x, z:it.host.z}; desk.held = it; return; }
  if (it.state === 'in') { it.y = it.host.y + it.ry; it.x = it.host.x + it.ox; it.z = it.host.z + it.oz; }
  if (it.state === 'stuck') { it.y = Math.max(0, it.host.y + it.oy); }
  it.state = 'held'; it.host = null; it.settled = false; desk.held = it; it.shakeT = 0;
  Sound.tone(660 + Math.random()*80, {type:'triangle', dur:.06, vol:.05});
}
export function release(){
  const it = desk.held; if (!it) return; desk.held = null;
  if (it.state === 'attached') { it.raised = false; return; }
  if (it.def.balloon) { const b = desk.items.find(v => v.def.neck && upright(v) && !balloonOn(v) && Math.hypot(v.x - it.x, v.z - it.z) < .06);
    if (b) { attach(it, b); return; } }
  const v = under(it.x, it.z, it);
  it.into = v && it.def.r <= v.def.ri*1.05 && !isVessel(it) ? v : null;
  it.state = 'fall'; it.vy = 0;
  if (desk.endless && it.def.supply) it.c = chem.fill(it.full);
}
function attach(b, v){
  b.state = 'attached'; b.host = v; b.raised = false; b.tilt = 0;
  Sound.tone(300, {type:'triangle', dur:.12, vol:.08, f2:520}); emit({type:'attach', it:b, v});
}

function carryHeight(it){
  let want = .045;
  if (it.def.tool === 'spoon' || it.def.tool === 'swab') {
    const v = under(it.x, it.z, it); if (v && it.def.r < mouthR(v) + .01) return v.y + v.def.floor + .004;
  }
  for (const o of desk.items) {
    if (o === it || o.state === 'gone' || o.host === it) continue;
    const ox = o.state === 'attached' ? o.host.x : o.x, oz = o.state === 'attached' ? o.host.z : o.z;
    if (Math.hypot(ox - it.x, oz - it.z) > o.def.r + it.def.r*.8) continue;
    const t = o.state === 'attached' ? o.host.y + o.host.def.h + .12*(1 + o.inflate) : o.y + o.def.h;
    want = Math.max(want, t + (it.def.tool === 'magnet' ? .004 : .02));
  }
  return want;
}
function holdStep(it, dt){
  if (it.state === 'attached') {
    // pulling the balloon well away from the bottle takes it off, letting out any gas
    const p = desk.ray && deskPoint(desk.ray, it.host.y + it.host.def.h);
    if (p && Math.hypot(p.x - it.grabAt.x, p.z - it.grabAt.z) > .2) {
      if (it.inflate > .1) { Sound.hiss({dur:.8, vol:.12, type:'bandpass', freq:900, q:2}); Sound.tone(500, {type:'sawtooth', dur:.7, vol:.04, f2:200, cut:1200}); }
      const v = it.host; it.inflate = 0; it.state = 'held'; it.host = null; it.x = v.x; it.z = v.z; it.y = v.y + v.def.h; it.raised = false; resetBalloon(it);
    }
    return;
  }
  const p = desk.ray && deskPoint(desk.ray, it.y + it.grip);
  if (p) {
    const tx = Math.max(-BOUNDS.x, Math.min(BOUNDS.x, p.x)), tz = Math.max(-BOUNDS.z, Math.min(BOUNDS.z, p.z)), k = 1 - Math.exp(-dt*16);
    const nx = it.x + (tx - it.x)*k, nz = it.z + (tz - it.z)*k;
    const vx = dt > 0 ? (nx - it.x)/dt : 0, vz = dt > 0 ? (nz - it.z)/dt : 0;
    // a quick reversal of direction while upside down is a shake
    if (it.def.flow === 'shake') {
      for (const [ax, sp] of [['dx', vx], ['dz', vz]]) {
        if (Math.abs(sp) < .25) continue;
        if (it[ax] && Math.sign(sp) !== it[ax] && it.tilt > 1.5 && it.shakeT <= 0) { it.shook = true; it.shakeT = .09; }
        it[ax] = Math.sign(sp);
      }
      it.shakeT -= dt;
    } it.x = nx; it.z = nz; it.vx = vx; it.vz = vz;
  }
  it.y += (carryHeight(it) - it.y)*(1 - Math.exp(-dt*12));
  const tips = isVessel(it) && desk.tip;
  it.tilt = tips ? Math.min(MAX_TIP, it.tilt + 2.4*dt) : Math.max(0, it.tilt - 5*dt);
  // things hang from the hand, so their bottoms trail behind when it moves
  const k2 = 1 - Math.exp(-dt*10);
  it.swz += (Math.max(-.3, Math.min(.3, -it.vx*.35)) - it.swz)*k2; it.swx += (Math.max(-.3, Math.min(.3, it.vz*.35)) - it.swx)*k2;
}

// ---------- falling, floating and sinking ----------
function fallStep(it, dt){
  it.vy -= 6*dt; it.y += it.vy*dt; it.swx *= .9; it.swz *= .9;
  const v = it.into;
  if (v && v.state !== 'gone') {
    const surf = v.y + top(v);
    if (it.y <= surf) {
      it.state = 'in'; it.host = v; it.ox = it.x - v.x; it.oz = it.z - v.z; it.ry = it.y - v.y; it.settled = false; it.still = 0;
      if (chem.liquidVol(v.c) > 5) { Sound.tone(380 + Math.random()*80, {dur:.2, vol:.1, f2:150}); Sound.hiss({dur:.14, vol:.05, type:'lowpass', freq:900});
        desk.fx.splash(it.x, surf, it.z, (chem.look(v.c) || {col:0xc8e6f2}).col); it.vy *= .3; }
      else clack(.8);
    }
    return;
  }
  if (it.y <= 0) { it.y = 0; it.state = 'desk'; it.swx = it.swz = 0; if (it.vy < -.4) clack(Math.min(1, -it.vy/2)); it.vy = 0; }
}
function inStep(it, dt, t){
  const v = it.host;
  if (v.state === 'gone') { it.state = 'fall'; it.into = null; return; }
  if (v.tilt > 1.25) { tipOut(it, v); return; }
  const lim = Math.max(0, v.def.ri - it.def.r*.9), d = Math.hypot(it.ox, it.oz);
  if (d > lim) { it.ox *= lim/d; it.oz *= lim/d; }
  const floor = v.def.floor + levels(v).p*.5, wv = chem.waterVol(v.c), ov = chem.oilVol(v.c), ld = chem.density(v.c), dn = it.def.density || 7;
  let want = floor, floats = false;
  if (wv > 3 && dn < ld) { want = waterTop(v) - it.def.h*Math.max(.15, Math.min(.92, dn/ld)); floats = true; }
  if (ov > 3 && dn < chem.OIL_DENSITY && (wv <= 3 || dn < ld)) { want = oilTop(v) - it.def.h*Math.max(.15, Math.min(.92, dn/chem.OIL_DENSITY)); floats = true; }
  if (wv <= 3 && ov > 3 && dn >= chem.OIL_DENSITY) want = floor;
  want = Math.max(floor, want);
  const gap = want - it.ry, sp = gap > 0 ? .16 : .1;
  it.ry += Math.sign(gap)*Math.min(Math.abs(gap), sp*dt);
  it.floating = floats;
  const bob = floats ? Math.sin(t*2.2 + it.x*40)*.0015 : 0;
  it.x = v.x + it.ox; it.z = v.z + it.oz; it.y = v.y + it.ry + bob;
  it.still = Math.abs(gap) < .002 ? it.still + dt : 0;
  if (!it.settled && it.still > .35) { it.settled = true; emit({type:'settle', it, v, floating:floats}); }
  if (it.settled && Math.abs(gap) > .01) it.settled = false;
  if (it.stock !== undefined && wv > 10 && it.stock > 0) {
    const n = Math.min(it.stock, .9*dt); it.stock -= n; chem.add(v.c, 'tablet', n);
    if (it.stock <= 0) { it.state = 'gone'; it.g.visible = false; }
  }
}
function tipOut(it, v){
  const s = spout(v); it.state = 'fall'; it.into = under(s.x, s.z, v); it.host = null; it.x = s.x; it.z = s.z; it.y = s.y - it.def.h; it.vy = 0;
}
function clack(k){ Sound.tone(820 + Math.random()*260, {type:'triangle', dur:.05, vol:.06*k}); Sound.tone(260, {dur:.05, vol:.04*k}); }

// ---------- pouring ----------
const _s = new THREE.Vector3();
function spout(v){ v.g.updateMatrix(); return _s.set(-mouthR(v), v.def.h - v.grip, 0).applyMatrix4(v.g.matrix).clone(); }
function pourAngle(v){
  const lv = chem.liquidVol(v.c), f = Math.min(1, (lv || chem.pileVol(v.c)*1.3)/v.cap);
  let a = v.def.mouth && v.def.mouth < v.def.ri*.6 ? .7 + (1 - f)*.9 : Math.atan2((1 - f)*v.def.hi, v.def.ri);
  if (!lv) a += .3;
  return Math.min(1.9, a);
}
let pourSnd = 0;
function pourStep(v, dt){
  if (v.tilt < .2 || chem.isEmpty(v.c) || v.state === 'attached') return;
  const flow = v.def.flow, s = spout(v);
  if (flow === 'drops') {
    if (v.tilt < 1.8) return;
    v.drip = (v.drip || 0) - dt; if (v.drip > 0) return; v.drip = .38;
    const out = chem.take(v.c, 1), k = Object.keys(out.l)[0]; if (!k) return;
    desk.fx.grain(s.x, s.y - .01, s.z, chem.SUB[k].col, out, .006, 'drop'); Sound.tone(1300, {dur:.06, vol:.04, f2:900});
    return;
  }
  if (flow === 'shake') {
    if (!v.shook) return; v.shook = false;
    const out = chem.take(v.c, 1.4), k = Object.keys(out.p)[0]; if (!k) return;
    for (let i = 0; i < 6; i++) { const one = chem.empty(); one.p[k] = out.p[k]/6; desk.fx.grain(s.x + (Math.random() - .5)*.02, s.y, s.z + (Math.random() - .5)*.02, chem.SUB[k].col, one, .0035); }
    Sound.hiss({dur:.06, vol:.07, type:'highpass', freq:3500});
    return;
  }
  const a0 = pourAngle(v); if (v.tilt <= a0) return;
  const rate = v.def.rate*clamp01((v.tilt - a0)/.5), out = chem.take(v.c, rate*dt);
  if (chem.isEmpty(out)) return;
  if (!chem.liquidVol(v.c)) desk.fx.dropFilm(v);
  pourSnd -= dt;
  if (chem.liquidVol(out) > 0) {
    // a liquid stream lands at once; where it lands is whatever is under the spout right now
    const t = under(s.x, s.z, v), bottom = t ? t.y + top(t) : (inBounds(s.x, s.z) ? 0 : -1);
    const lk = out.l.oil && Object.keys(out.l).length === 1 ? {col:chem.SUB.oil.col, op:.8} : chem.look(out) || {col:0xc8e6f2, op:.5};
    desk.fx.stream(v.id, s.x, s.y, s.z, Math.max(-1, bottom), .003 + Math.min(.006, rate*.00008), lk.col, Math.max(.6, lk.op));
    if (t) deliver(t, out, s.x, s.z); else if (bottom === 0) desk.fx.spill(s.x, s.z, chem.liquidVol(out), lk.col);
    if (pourSnd <= 0) { pourSnd = .07; Sound.hiss({dur:.13, vol:.025 + rate*.0003, type:'bandpass', freq:1200 + Math.random()*700, q:.9}); }
  } else {
    v.grainAcc = (v.grainAcc || 0) + dt*40;
    const n = Math.floor(v.grainAcc); v.grainAcc -= n;
    if (!n) { chem.merge(v.c, out); return; }
    for (let i = 0; i < n; i++) {
      const one = chem.empty(); for (const k in out.p) one.p[k] = out.p[k]/n;
      desk.fx.grain(s.x + (Math.random() - .5)*.015, s.y, s.z + (Math.random() - .5)*.015, chem.pileColor(one), one, .0035);
    }
    if (pourSnd <= 0) { pourSnd = .08; Sound.hiss({dur:.12, vol:.03, type:'highpass', freq:2500 + Math.random()*1500}); }
  }
}
// something has arrived in a container at (x, z)
function deliver(v, out, x, z, settled){
  const f = desk.fx, u = (x - v.x)/v.def.ri, w = (z - v.z)/v.def.ri, wet = chem.liquidVol(v.c) > 2;
  if (out.p.pepper) { if (wet) { f.film(v).pepper(u, w, Math.ceil(out.p.pepper*14)); delete out.p.pepper; } }
  for (const k of ['red', 'yellow', 'blue']) {
    if (!out.l[k]) continue;
    if (wet && chem.milky(v.c)) { f.film(v).dye(u, w, chem.SUB[k].col); v.stats.dye.add(k); delete out.l[k]; continue; }
    if (!settled && chem.oilVol(v.c) > 3) { const one = chem.empty(); one.l[k] = out.l[k]; f.bead(v, x - v.x, z - v.z, chem.SUB[k].col, one); delete out.l[k]; continue; }
    if (settled) emit({type:'sink-drop', v});
    v.stats.dye.add(k);
  }
  if (out.l.soap && f.hasFilm(v) && f.film(v).soap(u, w)) { v.stats.bursts++; emit({type:'burst', v}); }
  chem.merge(v.c, out);
  const over = chem.liquidVol(v.c) - v.cap;
  if (over > 0) {
    const lost = chem.take(v.c, over), col = (chem.look(lost) || {col:chem.SUB.oil.col}).col;
    // a cone's footprint is far wider than its mouth, so a puddle beside it would seep from under its skirt;
    // what overflows a volcano wells out of the crater and runs down the slopes instead
    if (v.def.cone) for (v.spilt = (v.spilt || 0) + chem.liquidVol(lost)*.4; v.spilt >= 1; v.spilt--) f.foam(v, col);
    else f.spill(v.x + v.def.r*.7, v.z + v.def.r*.5, chem.liquidVol(lost), col);
  }
  if (!chem.liquidVol(v.c)) f.dropFilm(v);
}

// ---------- magnets, spoons, swabs and balloons ----------
function magnetStep(m){
  for (const o of desk.items) {
    if (o.state !== 'desk' || o === m) continue;
    const d = Math.hypot(o.x - m.x, o.z - m.z);
    if (o.def.magnetic && d < .13 && m.y < .1) {
      const n = desk.items.filter(s => s.state === 'stuck' && s.host === m).length, side = o.x < m.x ? -1 : 1;
      o.state = 'stuck'; o.host = m; o.ox = side*.03 + (Math.random() - .5)*.012; o.oz = (Math.random() - .5)*.02; o.oy = -o.def.h*.5 - n*.004;
      Sound.tone(1500, {type:'square', dur:.04, vol:.04, cut:3000}); Sound.tone(900, {type:'triangle', t:.03, dur:.06, vol:.05});
      emit({type:'stick', it:o});
    } else if (!o.def.magnetic && d < .08 && m.y < .1 && !o.snubbed) { o.snubbed = true; emit({type:'snub', it:o}); }
  }
}
function toolStep(it, dt){
  const v = under(it.x, it.z, it), dipped = v && it.y < v.y + v.def.h - .01 && it.def.r < mouthR(v) + .01 ? v : null;
  if (it.dippedIn && it.dippedIn !== dipped) it.dippedIn = null;
  if (!dipped) return;
  const speed = Math.hypot(it.vx, it.vz), f = desk.fx, wet = chem.liquidVol(dipped.c) > 2;
  if (it.def.tool === 'spoon') {
    dipped.stir = Math.max(dipped.stir, Math.min(1.2, speed*2));
    if (wet) dipped.stats.stir += speed*dt;
    if (f.hasFilm(dipped)) f.film(dipped).swirl(Math.min(2, speed*6)*dt);
    if (chem.oilVol(dipped.c) > 3 && chem.waterVol(dipped.c) > 3 && speed > .15 && Math.random() < dt*30) f.oildrop(dipped);
    if (speed > .1 && Math.random() < dt*4) Sound.tone(1900 + Math.random()*500, {type:'triangle', dur:.03, vol:.02});
  } else if (it.def.tool === 'swab') {
    if ((dipped.c.l.soap || 0) > .3) setSoapy(it, true);
    else if (it.soapy && wet && it.dippedIn !== dipped) {
      chem.add(dipped.c, 'soap', .5);
      const u = (it.x - dipped.x)/dipped.def.ri, w = (it.z - dipped.z)/dipped.def.ri;
      if (f.hasFilm(dipped) && f.film(dipped).soap(u, w)) { dipped.stats.bursts++; emit({type:'burst', v:dipped}); }
    }
  }
  it.dippedIn = dipped;
}
function setSoapy(it, on){ if (it.soapy === on) return; it.soapy = on; it.refs.tip.material = new THREE.MeshToonMaterial({gradientMap:grad, color: on ? 0x9fe0a0 : 0xffffff}); }
function resetBalloon(b){ b.refs.blob.rotation.z = Math.PI; b.refs.blob.position.y = .11; b.refs.blob.scale.setScalar(1); b.body.position.y = -b.grip; }

// ---------- chemistry in every container ----------
function chemStep(v, dt){
  const sugarB = v.c.p.sugar || 0, saltB = v.c.p.salt || 0;
  const gas = chem.step(v.c, dt, v.stir); v.stir = Math.max(0, v.stir - dt*3);
  if ((sugarB > 2 && !v.c.p.sugar) || (saltB > 2 && !v.c.p.salt)) emit({type:'dissolved', v, sub: sugarB > 2 && !v.c.p.sugar ? 'sugar' : 'salt'});
  if (!(gas > 0)) { v.fizzing = Math.max(0, (v.fizzing || 0) - dt); v.head = Math.max(0, v.head - dt*.006); return; }
  v.stats.gas += gas;
  if (!v.fizzing) emit({type:'fizz', v});
  v.fizzing = .6;
  const rate = gas/dt, b = balloonOn(v), f = desk.fx, lk = chem.look(v.c);
  if (b) { const was = b.inflate; b.inflate = Math.min(1.6, b.inflate + gas*.06); if (was < .8 && b.inflate >= .8) emit({type:'inflate', it:b}); }
  else {
    const soapy = (v.c.l.soap || 0) > .5;
    v.head = Math.min(.025, v.head + gas*.0012*(soapy ? 2 : 1));
    // oil on top lets the gas through as bubbles instead of froth
    if (!(chem.oilVol(v.c) > 5)) v.foam += gas*(soapy ? 4.5 : .8)*(v.def.cone ? 1.5 : 1);
    const fc = chem.lerpCol(0xffffff, lk ? lk.col : 0xffffff, soapy ? .55 : .3);
    while (v.foam >= 1) { v.foam -= 1; f.foam(v, fc); }
  }
  if (chem.oilVol(v.c) > 5 && lk) { v.blobAcc = (v.blobAcc || 0) + gas*.9; while (v.blobAcc >= 1) { v.blobAcc -= 1; f.blob(v, lk.col); v.stats.blobs++; } }
  if (Math.random() < Math.min(1, rate*.02)) for (let i = 0; i < Math.min(6, 1 + rate*.08); i++) f.bubble(v);
  if (Math.random() < dt*12) Sound.hiss({dur:.05 + Math.random()*.06, vol:Math.min(.09, .015 + rate*.003), type:'highpass', freq:4000 + Math.random()*3000});
}

// things on the desk can't overlap; they nudge each other apart
function separate(){
  const ds = desk.items.filter(it => it.state === 'desk');
  for (let k = 0; k < 2; k++) for (let i = 0; i < ds.length; i++) for (let j = i + 1; j < ds.length; j++) {
    const a = ds[i], b = ds[j], dx = b.x - a.x, dz = b.z - a.z, d = Math.hypot(dx, dz), min = a.def.r + b.def.r;
    if (d >= min) continue;
    const nx = d > 1e-4 ? dx/d : 1, nz = d > 1e-4 ? dz/d : 0, push = (min - d)/2;
    a.x -= nx*push; a.z -= nz*push; b.x += nx*push; b.z += nz*push;
  }
  for (const it of ds) { it.x = Math.max(-BOUNDS.x, Math.min(BOUNDS.x, it.x)); it.z = Math.max(-BOUNDS.z, Math.min(BOUNDS.z, it.z)); }
  // things sharing a container drift apart too, so floaters spread across the surface
  const ins = desk.items.filter(it => it.state === 'in');
  for (let i = 0; i < ins.length; i++) for (let j = i + 1; j < ins.length; j++) {
    const a = ins[i], b = ins[j]; if (a.host !== b.host) continue;
    const dx = b.ox - a.ox, dz = b.oz - a.oz, d = Math.hypot(dx, dz), min = (a.def.r + b.def.r)*.9;
    if (d >= min) continue;
    const ang = d > 1e-4 ? Math.atan2(dz, dx) : Math.random()*7, push = Math.min(.004, (min - d)/2);
    a.ox -= Math.cos(ang)*push; a.oz -= Math.sin(ang)*push; b.ox += Math.cos(ang)*push; b.oz += Math.sin(ang)*push;
  }
}

// ---------- drawing ----------
function draw(it, dt, t){
  if (it.pop < 1) { it.pop += dt/.4; const p = clamp01(it.pop) - 1; it.g.scale.setScalar(it.pop <= 0 ? .001 : 1 + 2.7*p*p*p + 1.7*p*p); }
  else it.g.scale.setScalar(1);
  if (it.state === 'stuck') { const m = it.host; it.x = m.x + it.ox; it.z = m.z + it.oz; it.y = Math.max(0, m.y + it.oy); }
  if (it.state === 'attached') {
    // a floppy balloon hangs off the neck; lifting it, or filling it with gas, stands it up
    const v = it.host, k = 1 - Math.exp(-dt*6);
    it.up = (it.up || 0) + ((it.raised || it.inflate > .3 ? 1 : 0) - (it.up || 0))*k;
    it.g.position.set(v.x, v.y + v.def.h - .004, v.z); it.g.rotation.set(0, 0, 2.3*(1 - it.up) + Math.sin(t*3)*.03*(1 - it.up));
    it.body.position.y = 0; it.refs.blob.rotation.z = 0; it.refs.blob.position.y = 0;
    const s = 1 + it.inflate*1.6; it.refs.blob.scale.set(s, 1 + it.inflate*1.9, s);
    it.x = v.x; it.z = v.z; it.y = v.y + v.def.h;
    if (it.raised && it.up > .7 && !chem.isEmpty(it.c)) chem.merge(v.c, chem.take(it.c, 30*dt));
    return;
  }
  it.g.position.set(it.x, it.y + it.grip, it.z);
  it.g.rotation.set(it.swx, 0, it.tilt + it.swz);
  if (it.stock !== undefined) it.body.scale.setScalar(.35 + .65*it.stock/it.def.fizz);
  if (it.liq) {
    const L = levels(it), lk = chem.look(it.c), ri = it.def.ri*.97, fl = it.def.floor, q = it.liq;
    q.w.visible = L.w > .0008 && !!lk;
    if (q.w.visible) { q.w.scale.set(ri, L.w, ri); q.w.position.y = fl + L.w/2; q.w.material.color.setHex(lk.col); q.w.material.opacity = lk.op; }
    q.o.visible = L.o > .0008;
    if (q.o.visible) { const h = Math.min(L.o, it.def.hi - L.w); q.o.scale.set(ri, Math.max(.0005, h), ri); q.o.position.y = fl + L.w + h/2; q.o.material.color.setHex(chem.SUB.oil.col); q.o.material.opacity = .62; }
    q.p.visible = L.p > .0008;
    if (q.p.visible) { q.p.scale.set(ri*.9, L.p, ri*.9); q.p.position.y = fl; q.p.material.color.setHex(chem.pileColor(it.c)); q.p.material.opacity = .97; }
    q.f.visible = it.head > .001 && (q.w.visible || q.o.visible);
    if (q.f.visible) { const base = fl + Math.min(it.def.hi, L.w + L.o); q.f.scale.set(ri, it.head, ri); q.f.position.y = base + it.head/2; q.f.material.color.setHex(0xfbfaf4); q.f.material.opacity = .95; }
  }
}

export function updateDesk(dt, t){
  const H = desk.held;
  if (H) holdStep(H, dt);
  for (const it of desk.items) {
    if (it.state === 'gone') continue;
    if (it.state === 'fall') fallStep(it, dt);
    else if (it.state === 'in') inStep(it, dt, t);
    if (it !== H && it.tilt > 0 && it.state !== 'attached') it.tilt = Math.max(0, it.tilt - 5*dt);
    if (isVessel(it)) pourStep(it, dt);
  }
  if (H && H.state === 'held') { if (H.def.tool === 'magnet') magnetStep(H); else if (H.def.tool) toolStep(H, dt); }
  for (const v of vessels()) if (v.state !== 'gone') chemStep(v, dt);
  separate();
  desk.fx.update(dt);
  for (const it of desk.items) if (it.state !== 'gone') draw(it, dt, t);
}
