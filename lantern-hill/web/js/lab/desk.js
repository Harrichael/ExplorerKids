// The experiment desk. Everything on it is a rigid body in the physics world: the hand steers what it
// holds with springs, so a carried cup still bumps into things; any container tipped far enough spills
// from its low rim, held or knocked over; floating, magnets and stirring are forces on those bodies.
// Containers hold their contents as chemistry; whatever leaves one is fluid.js's. The hands steer it
// and experiments read it; it knows nothing about either. Positions are in the desk's frame: x across,
// z toward the explorer, y up from the mat.

import * as THREE from 'three';
import { clamp01, grad } from '../core/kit.js';
import * as chem from './chem.js';
import { makeFluid, spread } from './fluid.js';
import { makeFx } from './fx.js';
import * as gas from './gas.js';
import { P, STEP, THING, ghost, hinge, makeBody, makeWorld, retire, rot, toLocal, toWorld, upOf } from './physics.js';
import { labSound } from './sounds.js';
import { ITEMS, UNITS_PER_M3, capacity } from './stuff.js';

const BOUNDS = {x:.8, z:.52};
const MAX_TIP = 2.5, SPOONFUL = 5;

export const desk = {root:null, fx:null, fluid:null, items:[], held:null, ray:null, tip:false, endless:false, t:0};
// chance that has to come out the same in a test (how far each balloon stretches before it bursts)
let seed = Math.random()*2**32 >>> 0;
export const reseed = s => { seed = s >>> 0; };
function rand(){ seed = seed + 0x6d2b79f5 >>> 0; let t = seed; t = Math.imul(t ^ t >>> 15, t | 1); t ^= t + Math.imul(t ^ t >>> 7, t | 61); return ((t ^ t >>> 14) >>> 0)/2**32; }
export const isVessel = it => it.def.kind === 'vessel';
export const find = id => desk.items.find(it => it.id === id && !it.gone);
const live = () => desk.items.filter(it => !it.gone);
const vessels = () => desk.items.filter(it => isVessel(it) && !it.gone);

// ---------- containers ----------
function levels(v){
  const k = v.def.hi/v.cap;
  return {w: Math.min(v.def.hi, chem.waterVol(v.c)*k), o: chem.oilVol(v.c)*k, p: Math.min(v.def.hi*.45, chem.pileVol(v.c)*k*1.4)};
}
// heights above the container's own bottom, in its own frame
const waterTop = v => v.def.floor + levels(v).w;
const oilTop = v => { const l = levels(v); return v.def.floor + Math.min(v.def.hi, l.w + l.o); };
const top = v => { const l = levels(v); return v.def.floor + Math.min(v.def.hi, Math.max(l.w + l.o, l.p)); };
const _u = {}, _l = {}, _w = {};
const uprightness = it => upOf(it.body, _u).y;
const localOf = (v, p) => toLocal(v.body, p.x, p.y, p.z, _l);
// is a point (in v's frame) inside v's open space?
function within(v, l, pad = 0){
  const o = v.def.open, r = o.neckY && l.y > o.neckY ? o.r : Math.max(o.r, v.def.ri);
  if (!(l.y > v.def.floor - .006 && l.y < o.y + pad)) return false;
  return v.def.w ? Math.abs(l.x) < v.def.w/2 && Math.abs(l.z) < v.def.d/2 : Math.hypot(l.x, l.z) < r;
}
// the container something is in: the innermost one, so a penny in a boat in a tub is in the boat
function holder(it, p, pad){
  let best = null;
  for (const v of vessels()) if (v !== it && uprightness(v) >= .6 && within(v, localOf(v, p), pad) && (!best || v.def.ri < best.def.ri)) best = v;
  return best;
}
const balloonOn = v => desk.items.find(b => !b.gone && b.attached === v);
const corkIn = v => desk.items.find(c => !c.gone && c.plugged === v);
// what closes a container's mouth, so nothing gets in and its gas can't get out
const capOn = v => balloonOn(v) || corkIn(v);

// what a drop or grain flying through (x, y, z) has fallen into; the containers that can catch are
// worked out once a frame, since every drop asks
let catchers = [];
function catches(x, y, z, d){
  for (const {v, seal} of catchers) {
    if (d.src === v.body && d.t < .12 || seal && d.src !== seal.body) continue;
    if (within(v, toLocal(v.body, x, y, z, _l))) return v;
  }
  return null;
}
// something has arrived in a container at (x, z)
function deliver(v, out, x, z, settled){
  const f = desk.fx, l = toLocal(v.body, x, v.body.translation().y, z, _l), u = l.x/v.def.ri, w = l.z/v.def.ri, wet = chem.liquidVol(v.c) > 2;
  out = {l:Object.assign({}, out.l), p:Object.assign({}, out.p)}; v.hit = {x:l.x, z:l.z};
  for (const b of [out.l, out.p]) for (const k in b) if (b[k] > .3 && v.stats.got[k] === undefined) v.stats.got[k] = desk.t;
  if (out.p.pepper && wet) { f.film(v).pepper(u, w, Math.ceil(out.p.pepper*14)); delete out.p.pepper; }
  for (const k of ['red', 'yellow', 'blue']) {
    if (!out.l[k]) continue;
    if (wet && chem.milky(v.c)) { f.film(v).dye(u, w, chem.SUB[k].col); v.stats.dye.add(k); delete out.l[k]; continue; }
    if (!settled && chem.oilVol(v.c) > 3) { const one = chem.empty(); one.l[k] = out.l[k]; f.bead(v, l.x, l.z, chem.SUB[k].col, one); delete out.l[k]; continue; }
    v.stats.dye.add(k);
  }
  if (out.l.soap && f.hasFilm(v) && f.film(v).soap(u, w)) v.stats.bursts++;
  chem.merge(v.c, out);
  if (chem.liquidVol(out) > .05) labSound.fill(v, x, v.def.open.y - top(v)); else if (chem.pileVol(out) > .05) labSound.grains(v, x);
  if (!chem.liquidVol(v.c)) f.dropFilm(v);
}

// The hand is forgiving: a stream bends into an open container whose mouth is near where it's coming
// out, a small thing let go near a mouth drops in, and a balloon let go near a free bottle neck
// stretches on. Whatever it will go into glows round its rim while the hand is there; out of reach,
// things land wherever they fall.
const AIM_REACH = .09;
let ring = null;
function aimTarget(v, p){
  let best = null, bd = Infinity;
  for (const {v:c, seal} of catchers) {
    if (c === v || seal) continue;
    const o = c.def.open, m = toWorld(c.body, 0, o.y, 0, {});
    if (p.y - m.y < .005) continue;
    const d = Math.hypot(m.x - p.x, m.z - p.z);
    if (d < o.r + AIM_REACH && d < bd) { bd = d; best = {v:c, m, r: c.def.open.neckY ? o.r : Math.max(o.r, c.def.ri)}; }
  }
  return best;
}
// a free bottle neck near a balloon's mouth or a cork's bottom
function neckFor(b){
  const m = toWorld(b.body, 0, b.def.balloon ? b.def.open.y : 0, 0, {});
  let best = null, bd = .08;
  for (const v of vessels()) {
    if (!v.def.neck || capOn(v) || uprightness(v) < .8) continue;
    const o = toWorld(v.body, 0, v.def.open.y, 0, {}), d = Math.hypot(m.x - o.x, m.z - o.z);
    if (d < bd && m.y > o.y - .04) { bd = d; best = {v, m:o, r:v.def.open.r}; }
  }
  return best;
}
// where the held thing would go: a container pours from its low rim (or, before it's tipped far
// enough for the rim to be over anything, from the hand); a small thing drops from where it hangs
function heldTarget(){
  const v = desk.held;
  if (!v || v.attached) return null;
  if (v.def.balloon) return neckFor(v);
  if (v.def.stopper) { const n = neckFor(v); if (n) return n; }
  if (!isVessel(v)) {
    if (v.def.tool || !(v.def.r < .045)) return null;
    const t = aimTarget(v, v.body.translation());
    return t && t.r > v.def.r + .004 ? t : null;
  }
  if (chem.isEmpty(v.c)) return null;
  const g = toWorld(v.body, 0, v.grip, 0, {}), r = lowRim(v).p;
  return aimTarget(v, r) || aimTarget(v, {x:g.x, y:Math.max(g.y, r.y), z:g.z});
}
// the velocity (vx, vy, vz) from p that lands in the held container's target, if it has one
function aimed(v, p, vel){
  if (v !== desk.held) return vel;
  const t = heldTarget(); if (!t) return vel;
  const dy = p.y - t.m.y; if (dy < .003) return vel;
  const ft = (vel.y + Math.sqrt(vel.y*vel.y + 19.62*dy))/9.81;
  const a = Math.random()*7, r = Math.random()*t.r*.45;
  vel.x = (t.m.x + Math.cos(a)*r - p.x)/ft; vel.z = (t.m.z + Math.sin(a)*r - p.z)/ft;
  return vel;
}
function showAim(){
  const t = heldTarget();
  ring.visible = !!t;
  if (!t) return;
  ring.position.set(t.m.x, t.m.y + .004, t.m.z); ring.scale.setScalar(t.r*1.12);
  ring.material.opacity = .45 + .25*Math.sin(performance.now()/160);
}

export function initDesk(root){
  desk.root = root;
  ring = new THREE.Mesh(new THREE.RingGeometry(.86, 1, 40), new THREE.MeshBasicMaterial({color:0xfff2a8, transparent:true, depthWrite:false}));
  ring.geometry.rotateX(-Math.PI/2); ring.renderOrder = 3; ring.visible = false; root.add(ring);
  desk.fx = makeFx({frame: v => v.g, inside: v => !v.gone && uprightness(v) > .8, top, waterTop, oilTop,
    deliver: (v, p) => { const t = v.body.translation(); deliver(v, p, t.x, t.z, true); }});
  desk.fx.attach(root);
  desk.fluid = makeFluid(root, {catches, deliver, fizz: (pool, n, rate) => labSound.fizz(pool, pool.wx, rate, n/rate)});
}

// ---------- building and clearing ----------
const UNIT_CYL = new THREE.CylinderGeometry(1, 1, 1, 24), HEMI = new THREE.SphereGeometry(1, 16, 8, 0, Math.PI*2, 0, Math.PI/2);
function liquidMesh(parent, geo, order){
  const m = new THREE.Mesh(geo, new THREE.MeshToonMaterial({gradientMap:grad, color:0xffffff, transparent:true, depthWrite:false}));
  m.renderOrder = order; m.visible = false; m.userData.own = true; parent.add(m); return m;
}
function makeItem(id, type, x, z, o, i){
  const def = ITEMS[type], g = new THREE.Group(); desk.root.add(g);
  // got: when each substance first arrived; spoons: spoonfuls of each powder put in
  const it = {id, type, def, g, pop:-i*.04, stats:{gas:0, rise:0, stir:0, bursts:0, blobs:0, dye:new Set(), got:{}, spoons:{}}, vy:0, still:0, tilt:0, lastDir:{x:0, z:0}, shakeT:0};
  it.refs = def.build(g, o) || {};
  it.body = makeBody(def, x, .002 + (o.y || 0), z, it);
  if (o.rot) it.body.setRotation({x:0, y:Math.sin(o.rot/2), z:0, w:Math.cos(o.rot/2)}, false);
  it.grip = def.grip !== undefined ? def.grip : def.h*.7;
  if (isVessel(it)) {
    it.full = o.fill || def.fill || {}; it.c = chem.fill(it.full); it.cap = capacity(def);
    if (o.t !== undefined) it.c.t = o.t;
    it.foam = 0; it.head = 0; it.stir = 0; it.mass = -1; it.gas = gas.room(headspace(it), chem.temp(it.c));
    if (def.see) it.liq = {w: liquidMesh(g, UNIT_CYL, 1), o: liquidMesh(g, UNIT_CYL, 1), p: liquidMesh(g, HEMI, 1), f: liquidMesh(g, UNIT_CYL, 2)};
  }
  g.traverse(m => { if (m.isMesh) m.userData.item = it; });
  if (def.fizz) it.stock = def.fizz;
  if (def.balloon) { it.inflate = 0; it.vol = 0; it.burstAt = 6 + 2*rand(); }
  if (o.tarnish !== undefined) it.tarnish = it.drawnT = o.tarnish;
  if (def.beam) {
    // the beam is its own body, swinging on the post; its group lives in the desk's frame, not the base's
    const B = def.beam; desk.root.add(it.refs.beam);
    it.beam = makeBody({kind:'solid', shape:B.shape, density:B.density}, x, .002 + B.y, z, it); it.beam.setAngularDamping(B.damping ?? 1.5);
    hinge(it.body, it.beam, {x:0, y:B.y, z:0}, {x:0, y:0, z:0}, {x:0, y:0, z:1}, B.friction ?? .02);
    it.calm = 0; it.swing = 0;
  }
  return it;
}
export function setupDesk(layout, {endless=false}={}){
  clearDesk(); desk.endless = endless;
  makeWorld(BOUNDS);
  layout.forEach(([id, type, x, z, o], i) => desk.items.push(makeItem(id, type, x, z, o || {}, i)));
  acc = 0;
}
// Something taken out mid-play lands on the clearest spot near where it was asked for, or nowhere if
// the mat is full.
let brought = 0;
export function bring(type, o, near){
  const r = ITEMS[type].r + .012;
  let best = null, bd = Infinity;
  for (let x = -BOUNDS.x + r; x <= BOUNDS.x - r; x += .02) for (let z = -BOUNDS.z + r; z <= BOUNDS.z - r; z += .02) {
    const d = Math.hypot(x - near.x, z - near.z); if (d >= bd) continue;
    if (live().some(it => { const t = it.body.translation(); return Math.hypot(t.x - x, t.z - z) < r + it.def.r; })) continue;
    bd = d; best = {x, z};
  }
  if (!best) return null;
  const it = makeItem(type + ++brought, type, best.x, best.z, o || {}, 0);
  desk.items.push(it); return it;
}
export function clearDesk(){
  for (const it of desk.items) for (const g of [it.g, it.refs.beam]) {
    if (!g) continue;
    desk.root.remove(g);
    g.traverse(m => { if (!m.isMesh) return;
      if (m.geometry !== UNIT_CYL && m.geometry !== HEMI) m.geometry.dispose();
      if (m.material.map) { m.material.map.dispose(); m.material.dispose(); } else if (m.userData.own) m.material.dispose(); });
  }
  desk.items.length = 0; desk.held = null; leaving.length = 0; flows = [];
  if (desk.fx) { desk.fx.clear(); desk.fluid.clear(); }
}
// A thing that's used up (a fizzy tablet) leaves the world, and puddles on it fall off. It's switched
// off rather than removed, just before the next step, so Rapier's queries never see it vanish mid-frame.
const leaving = [];
function vanish(it){
  it.gone = true; it.g.visible = false;
  if (desk.held === it) desk.held = null;
  leaving.push(it.body);
}

// ---------- the hand ----------
const _ray = new THREE.Raycaster(), _p = new THREE.Vector3(), _o = new THREE.Vector3(), _a = new THREE.Vector3(), _b = new THREE.Vector3();
// what's under the pointer: whatever the ray touches first, except that a thing floating inside a
// glass wins over the glass itself
export function pick(worldRay){
  _ray.ray.copy(worldRay);
  const hits = _ray.intersectObjects(live().map(it => it.g), true);
  let first = null;
  for (const h of hits) { const it = h.object.userData.item; if (!it || !h.object.visible) continue;
    if (!first) first = it; else if (isVessel(first) && it !== first && within(first, localOf(first, it.body.translation()))) return it; }
  const near = nearMiss(first);
  return first && isVessel(first) && near && within(first, localOf(first, near.body.translation())) ? near : first || near;
}
// a near miss still grabs: thin things like a spoon are hard to hit exactly
function nearMiss(skip){
  let best = null, bd = .03;
  for (const it of live()) {
    if (it === skip) continue;
    const t = it.body.translation(), u = upOf(it.body, _u);
    _a.set(t.x, t.y, t.z).add(desk.root.position); _b.set(t.x + u.x*it.def.h, t.y + u.y*it.def.h, t.z + u.z*it.def.h).add(desk.root.position);
    const d = Math.sqrt(_ray.ray.distanceSqToSegment(_a, _b)) - Math.min(it.def.r, .012);
    if (d < bd) { bd = d; best = it; }
  }
  return best;
}
export function deskPoint(worldRay, y){
  _o.copy(worldRay.origin).sub(desk.root.position);
  if (Math.abs(worldRay.direction.y) < 1e-4) return null;
  const t = (y - _o.y)/worldRay.direction.y; if (t < 0) return null;
  return _p.copy(worldRay.direction).multiplyScalar(t).add(_o);
}
export function grab(it){
  // a burner isn't carried about: a tap turns it on or off
  if (it.def.knob) { it.lit = !it.lit; labSound.ignite(it.body.translation().x, it.lit); return; }
  if (desk.held) release();
  desk.held = it; it.tilt = 0;
  if (it.attached) { it.raised = true; return; }
  if (it.plugged) unplug(it);
  it.body.setGravityScale(0, true); it.body.wakeUp();
  if (it.def.dips) { ghost(it.body, 'held'); it.resting = null; }
  labSound.lift(it, it.body.translation().x);
}
export function release(){
  const it = desk.held; if (!it) return;
  const into = heldTarget(); desk.held = null;
  if (it.attached) { it.raised = false; return; }
  if (into && it.def.balloon) { attach(it, into.v); return; }
  if (into && it.def.stopper && into.v.def.neck) { plug(it, into.v); return; }
  if (into && !isVessel(it)) {
    // over the mouth, it drops straight down the middle
    const t = it.body.translation();
    it.body.setTranslation({x:into.m.x, y:Math.max(t.y, into.m.y + it.def.h + .01), z:into.m.z}, true);
    it.body.setLinvel({x:0, y:0, z:0}, true); it.body.setAngvel({x:0, y:0, z:0}, true);
  }
  // a boat let go over water is set down on it, as anyone would, not dropped in
  if (it.def.afloat) for (const v of vessels()) {
    const t = it.body.translation(), sea = v !== it && chem.waterVol(v.c) > 0 && toWorld(v.body, 0, waterTop(v), 0, {});
    if (!sea || !within(v, localOf(v, {x:t.x, y:sea.y, z:t.z}))) continue;
    it.body.setTranslation({x:t.x, y:sea.y - .002, z:t.z}, true); it.body.setLinvel({x:0, y:0, z:0}, true); it.body.setAngvel({x:0, y:0, z:0}, true);
    break;
  }
  it.body.setGravityScale(1, true);
  if (it.def.dips) { it.resting = vessels().find(v => insideOf(v, it)) || null; ghost(it.body, it.resting ? 'resting' : false); }
  const v = it.body.linvel(), s = Math.hypot(v.x, v.y, v.z);
  if (s > 1.2) it.body.setLinvel({x:v.x/s*1.2, y:v.y/s*1.2, z:v.z/s*1.2}, true);
  if (desk.endless && it.def.supply) it.refill = true;
}

// what's inside the held thing doesn't count as something to carry it over
const insideOf = (v, it) => it !== v && !it.gone && isVessel(v) && within(v, localOf(v, it.body.worldCom()), .02);
// Carry things at one steady height, just over the tallest thing on the desk, so they never bob up
// and down while the hand moves and always clear a cup's rim instead of shoving its wall. Spoons, swabs
// and test strips dip into the container they're over; a magnet goes low over what's near it, to reach
// it, and so does steel brought to a magnet, to stroke it.
function carryHeight(it, x, z){
  if (it.def.dips) {
    for (const v of vessels()) {
      if (v === it || uprightness(v) < .8) continue;
      const vt = v.body.translation();
      if (!within(v, toLocal(v.body, x, vt.y + v.def.open.y - .01, z, _l))) continue;
      // over the rim first, then down: the tip has to be above the opening before it can go in
      const tip = it.body.translation(), tl = toLocal(v.body, tip.x, tip.y, tip.z, {}), r = v.def.open.neckY ? v.def.open.r : Math.max(v.def.open.r, v.def.ri);
      return tl.y > v.def.open.y - .02 && Math.hypot(tl.x, tl.z) < r - .006 || within(v, tl) ? vt.y + v.def.floor + .004 : vt.y + v.def.open.y + .02;
    }
  }
  const t = it.body.translation(), low = pulls(it) || it.def.magnetic && live().some(m => m !== it && pulls(m) && Math.hypot(m.body.translation().x - x, m.body.translation().z - z) < it.def.r + m.def.r + .07);
  let y = 0;
  for (const o of live()) {
    if (o === it || insideOf(it, o)) continue;
    const ot = o.body.translation();
    // things clinging to the magnet travel with it, so they're no obstacle; another magnet is met end to end, down on the mat
    if (low && (o.clingTo === it || it.def.tool === 'magnet' && (o.def.tool === 'magnet' || o.stuck && Math.hypot(ot.x - t.x, ot.y - t.y, ot.z - t.z) < .09))) continue;
    const reach = it.def.r + Math.max(o.def.r, (o.def.w || 0)/2) + .015;
    if (low && Math.hypot(x - ot.x, z - ot.z) > reach && Math.hypot(t.x - ot.x, t.z - ot.z) > reach) continue;
    // how tall it stands right now: its height upright, its width once it's tipped over
    const c = Math.min(1, Math.abs(uprightness(o))), sn = Math.sqrt(1 - c*c);
    y = Math.max(y, ot.y + o.def.h*c + Math.min(o.def.r, .06)*sn);
  }
  return y + (low ? .006 : .025);
}
const qa = new THREE.Quaternion(), qb = new THREE.Quaternion(), qe = new THREE.Quaternion(), ZAX = new THREE.Vector3(0, 0, 1);
// spin a body toward a target orientation
function turnToward(body, target, gain, max){
  const r = body.rotation(); qb.set(r.x, r.y, r.z, r.w).invert();
  qe.copy(target).multiply(qb); if (qe.w < 0) { qe.x = -qe.x; qe.y = -qe.y; qe.z = -qe.z; qe.w = -qe.w; }
  const s = Math.sqrt(Math.max(0, 1 - qe.w*qe.w)), ang = 2*Math.acos(Math.min(1, qe.w));
  if (s < 1e-4) { body.setAngvel({x:0, y:0, z:0}, true); return; }
  const k = Math.min(max, ang*gain)/s;
  body.setAngvel({x:qe.x*k, y:qe.y*k, z:qe.z*k}, true);
}
function steer(it, dt){
  const b = it.body;
  it.tilt = desk.tip && isVessel(it) ? Math.min(MAX_TIP, it.tilt + 2.4*dt) : Math.max(0, it.tilt - 4*dt);
  if (it.attached) {
    // holding a balloon up on its bottle; pulled well away, it comes off and the gas rushes out
    const p = desk.ray && deskPoint(desk.ray, .2), bt = it.attached.body.translation();
    if (p && Math.hypot(p.x - bt.x, p.z - bt.z) > .22) detach(it, true);
    return;
  }
  // the hand holds the thing at its grip, so tipping swings it around the hand, not around its bottom
  const h = toWorld(b, 0, it.grip, 0, _w), p = desk.ray && deskPoint(desk.ray, h.y);
  const tx = p ? Math.max(-BOUNDS.x, Math.min(BOUNDS.x, p.x)) : h.x, tz = p ? Math.max(-BOUNDS.z, Math.min(BOUNDS.z, p.z)) : h.z;
  const ty = carryHeight(it, tx, tz) + it.grip;
  // lift first, then carry across: going sideways while still low knocks things over
  const low = clamp01((ty - h.y - .01)/.05), side = 1 - low*.85;
  let vx = (tx - h.x)*14*side, vy = (ty - h.y)*12, vz = (tz - h.z)*14*side;
  const sp = Math.hypot(vx, vy, vz); if (sp > 1.6) { vx *= 1.6/sp; vy *= 1.6/sp; vz *= 1.6/sp; }
  b.setLinvel({x:vx, y:vy, z:vz}, true);
  turnToward(b, qa.setFromAxisAngle(ZAX, it.tilt), 14, 9);
}
// A balloon stretched over a neck isn't a rigid body; it's posed on the neck and swings between
// hanging off the side and standing up over the top. What's inside still tips out of its mouth for real.
function attach(b, v){
  b.attached = v; b.raised = false; b.up = 0;
  b.body.setBodyType(P.R.RigidBodyType.KinematicPositionBased, true);
  reshapeBalloon(b);
  labSound.cap(v.body.translation().x, 'rubber');
}
// pulled off, or popped, the balloon lets go of its share of the gas
function detach(b, burst){
  const v = b.attached, k = b.vol/space(v);
  for (const key in v.gas) v.gas[key] *= 1 - k;
  b.attached = null; b.raised = false;
  b.body.setBodyType(P.R.RigidBodyType.Dynamic, true); b.body.setGravityScale(desk.held === b ? 0 : 1, true);
  if (burst && b.inflate > .1) labSound.deflate(b.body.translation().x);
  b.vol = 0; b.inflate = 0; reshapeBalloon(b);
}
function seat(b, dt){
  const v = b.attached;
  if (uprightness(v) < .5) { detach(b); return; }
  b.up += ((b.raised || b.inflate > .25 ? 1 : 0) - b.up)*Math.min(1, dt*4);
  // hanging, its mouth points up and out over the side; raised, it's upside down with the bulb on top
  const vq = v.body.rotation(); qb.set(vq.x, vq.y, vq.z, vq.w);
  qa.setFromAxisAngle(ZAX, -1.2 - (Math.PI - 1.2)*b.up).premultiply(qb);
  const o = toWorld(v.body, 0, v.def.open.y, 0, {}), off = rot(qa, {x:0, y:b.def.open.y, z:0});
  b.body.setNextKinematicTranslation({x:o.x - off.x, y:o.y - off.y, z:o.z - off.z});
  b.body.setNextKinematicRotation({x:qa.x, y:qa.y, z:qa.z, w:qa.w});
}
function reshapeBalloon(b){
  const sy = 1 + b.inflate*1.9, s = 1 + b.inflate*1.6, body = b.body, flat = b.inflate < .05;
  b.refs.blob.scale.set(s, sy, s); b.shapeAt = b.inflate;
  // flat it sits like a little sack; filling up, a ball grows out from the mouth (resized, never removed)
  if (!b.ball) b.ball = P.world.createCollider(P.R.ColliderDesc.ball(.036).setDensity(150).setFriction(.6).setCollisionGroups(THING).setEnabled(false), body);
  for (let i = 0; i < body.numColliders(); i++) { const c = body.collider(i); c.setEnabled(!b.attached && (c.handle === b.ball.handle ? !flat : flat)); }
  if (!flat) { b.ball.setRadius(.036*s); b.ball.setTranslationWrtParent({x:0, y:b.def.open.y - .055*sy, z:0}); }
}

// ---------- pressure ----------
// Every container holds gas over its contents (gas.js), room air to start with. Gas made with its
// mouth closed stays in and presses on whatever closes it, harder as it warms and softer as it cools.
// A balloon stretches until its rubber pushes back as hard, and bursts once stretched too far; a cork
// holds until the push beats its grip, about an atmosphere for one pushed in by hand, then flies, and
// the bottle kicks back the other way.
const CORK_GRIP = 100;
const headspace = v => Math.max(v.cap*.05, v.cap - chem.liquidVol(v.c) - chem.pileVol(v.c));
const space = v => { const b = balloonOn(v); return headspace(v) + (b ? b.vol : 0); };
// how much over the room's pressure the gas inside is, in kPa
const pressure = v => gas.pressure(v.gas, space(v), chem.temp(v.c)) - gas.P0;
function plug(c, v){
  c.plugged = v; c.body.setBodyType(P.R.RigidBodyType.KinematicPositionBased, true);
  for (let i = 0; i < c.body.numColliders(); i++) c.body.collider(i).setEnabled(false);
  stopper(c);
  labSound.cap(v.body.translation().x, 'wood');
}
function unplug(c){
  const v = c.plugged; c.plugged = null;
  c.body.setBodyType(P.R.RigidBodyType.Dynamic, true); c.body.setGravityScale(desk.held === c ? 0 : 1, true);
  for (let i = 0; i < c.body.numColliders(); i++) c.body.collider(i).setEnabled(true);
  if (pressure(v) > 15) labSound.uncork(v.body.translation().x, pressure(v)/CORK_GRIP);
  return v;
}
// seated in its neck, moving with the bottle, until the gas pushes it out
function stopper(c){
  const v = c.plugged, q = v.body.rotation(), p = toWorld(v.body, 0, v.def.open.y - c.def.h*.65, 0, {});
  c.body.setNextKinematicTranslation(p); c.body.setNextKinematicRotation(q);
  const press = pressure(v);
  if (press < CORK_GRIP) return;
  // the gas's push over the cork's length is what launches it, so its speed goes as √ΔP
  const up = rot(q, {x:0, y:1, z:0}), speed = Math.min(2.6, 2.2*Math.sqrt(press/CORK_GRIP)), bv = v.body.linvel();
  unplug(c); c.popped = true;
  c.body.setTranslation({x:p.x + up.x*.03, y:p.y + up.y*.03, z:p.z + up.z*.03}, true);
  c.body.setLinvel({x:bv.x + up.x*speed, y:bv.y + up.y*speed, z:bv.z + up.z*speed}, true);
  c.body.setAngvel({x:(Math.random() - .5)*30, y:(Math.random() - .5)*10, z:(Math.random() - .5)*30}, true);
  const k = c.body.mass()*speed*6;
  if (v !== desk.held) v.body.applyImpulse({x:-up.x*k, y:-up.y*k, z:-up.z*k}, true);
  labSound.pop(p.x, press/CORK_GRIP*2);
}

// ---------- forces: floating, magnets, stirring, balloons ----------
function overlap(a0, a1, b0, b1){ return Math.max(0, Math.min(a1, b1) - Math.max(a0, b0)); }
function volumeOf(it){
  if (it.def.kind === 'solid') return it.body.mass()/(it.def.density*1000);
  if (it.def.w) return it.def.w*it.def.d*it.def.h;
  return Math.PI*it.def.r*it.def.r*it.def.h*(it.def.shape[0][0].startsWith('hollow') ? 1 : .8);
}
// what a thing is lying in the liquid of, and for how long
function soak(it, v){ if (it.soakIn !== v) { it.soakIn = v; it.soakT = 0; } else if (v) it.soakT += STEP; }
// A thing floats by the weight of the water it pushes aside, so a hull's lift grows with how deep it sits.
function buoyancy(it){
  if (it === desk.held && !it.attached) { it.still = 0; soak(it, null); return; }
  const com = it.body.worldCom(), v = holder(it, com, .02);
  if (!v || !chem.liquidVol(v.c)) { it.still = 0; soak(it, null); return; }
  const l = localOf(v, com), hull = isVessel(it), wt = waterTop(v), ot = oilTop(v);
  // h is how tall a thing looks, which can reach below its collider and so through the floor; that
  // part is still under water, or an egg on the bottom loses a tenth of its lift and never comes up
  const hh = Math.max(.004, it.def.h/2), lo = hull ? localOf(v, it.body.translation()).y : l.y - hh, hi = hull ? lo + it.def.h : l.y + hh;
  const fw = overlap(lo, hi, lo, wt)/(hi - lo), fo = overlap(lo, hi, wt, ot)/(hi - lo), f = fw + fo;
  if (f <= 0) { it.wet = false; soak(it, null); return; }
  soak(it, fw > .5 ? v : null);
  if (!it.wet) { it.wet = true; if (it.body.linvel().y < -.15) labSound.plop(com.x, it.def.r); }
  // water drags on what it pushes aside, so a light cork is slowed as much as a heavy rock of its size;
  // it can slow a thing to a stop in one step but never throw it back, however light (a foil boat)
  const m = it.body.mass(), displaced = (chem.density(v.c)*fw + chem.OIL_DENSITY*fo)*1000*volumeOf(it);
  const lift = displaced*9.81*STEP, lv = it.body.linvel(), drag = Math.min((displaced + m)*7*STEP, m*.6);
  if (hull) {
    // Tipped, a hull pushes aside more water on its low side, so its lift moves that way and rights it.
    // Lifting at the metacentre (draft/2 + width²/(12 draft) up a box hull's middle) does just that.
    const draft = Math.max(it.def.h*f, .004), wide = Math.min(it.def.w || 2*it.def.ri, it.def.d || 2*it.def.ri);
    it.body.applyImpulse({x:-lv.x*drag, y:-lv.y*drag, z:-lv.z*drag}, true);
    it.body.applyImpulseAtPoint({x:0, y:lift, z:0}, toWorld(it.body, 0, draft/2 + wide*wide/(12*draft), 0, _w), true);
  }
  else it.body.applyImpulse({x:-lv.x*drag, y:lift - lv.y*drag, z:-lv.z*drag}, true);
  const av = it.body.angvel(), k = 1 - .08*f; it.body.setAngvel({x:av.x*k, y:av.y*k, z:av.z*k}, true);
  // a spoon going round drags everything in the cup along with it
  if (v.stir > .05) { const vt = v.body.translation(), dx = com.x - vt.x, dz = com.z - vt.z, d = Math.hypot(dx, dz) || 1; it.body.applyImpulse({x:-dz/d*v.stir*m*.6*STEP, y:0, z:dx/d*v.stir*m*.6*STEP}, true); }
  if (hull) flood(it, v);
  // a thing sitting still in liquid has shown whether it floats
  const sp = Math.hypot(lv.x, lv.y, lv.z);
  it.still = sp < .03 ? it.still + STEP : 0;
  const floating = hi > wt + .002 && lo > v.def.floor + .006;
  if (it.still > .6) it.settled = {v, floating};
}
// Once a floating container's rim dips under, the water around it pours in over the rim, faster the
// deeper the rim goes (a weir's flow, as depth to the power 1.5).
const WEIR = .15*1.8*UNITS_PER_M3;
function flood(it, v){
  if (capOn(it)) return;
  const sea = toWorld(v.body, 0, waterTop(v), 0, {}).y, rim = lowRim(it).p.y, deep = sea - rim;
  if (deep <= 0 || chem.liquidVol(it.c) >= it.cap) return;
  const was = chem.liquidVol(it.c), n = Math.min(it.cap - was, chem.waterVol(v.c), WEIR*deep**1.5*STEP);
  chem.merge(it.c, chem.take(v.c, n));
  labSound.fill(it, it.body.translation().x, Math.max(0, it.def.open.y - top(it)));
  if (was < it.cap*.5 && chem.liquidVol(it.c) >= it.cap*.5) labSound.sink(it.body.translation().x);
}
// an acid a tarnished penny lies in eats the dull oxide away
const SHINY = .25;
function polish(it){
  const was = it.tarnish; it.tarnish = Math.max(0, was - chem.polish(it.soakIn.c)*STEP);
  if (was >= SHINY && it.tarnish < SHINY) labSound.shine(it.body.translation().x);
}
// A magnet pulls steel toward its nearest pole, hard up close. Steel stroked along a pole becomes a
// magnet itself, weaker than a real one; its poles are at its two ends (see POLES in stuff.js).
const STEEL = .3, STROKE = .02;
const strength = m => m.def.tool === 'magnet' ? m.def.pull || 1 : STEEL*Math.abs(m.mag || 0);
const pulls = m => m.def.tool === 'magnet' || Math.abs(m.mag || 0) > .05;
const _ax = {};
function magnetism(m){
  const s = strength(m), held = desk.held, flip = m.mag < 0 ? -1 : 1;
  for (const o of live()) {
    if (o === m) continue;
    const c = o.body.worldCom();
    let best = null, bd = 1;
    for (const pl of m.def.poles) { const w = toWorld(m.body, pl.x, pl.y, pl.z, _w), d = Math.hypot(w.x - c.x, w.y - c.y, w.z - c.z); if (d < bd) { bd = d; best = {x:w.x, y:w.y, z:w.z, n:pl.n*flip}; } }
    if (!o.def.magnetic) { if (bd < .07 && m === held) o.snubbed = true; continue; }
    if (bd > .15) continue;
    if (o.def.poles) stroke(m, o, best, s);
    // the pull grows fast up close; something touching a pole moves with the magnet, if the pull can hold its weight
    const mass = o.body.mass(), touching = bd < .035, a = s*Math.min(touching ? 150 : 40, .06/(bd*bd)), k = mass*a*STEP/bd, holds = touching && a > 9.81;
    let ix = (best.x - c.x)*k, iy = (best.y - c.y)*k, iz = (best.z - c.z)*k;
    // the hand is far stronger than any magnet here: what it holds stays put, and the magnet feels the pull instead
    if (o === held) { if (m !== held) m.body.applyImpulse({x:-ix, y:-iy, z:-iz}, true); continue; }
    if (holds) { const mv = m.body.linvel(), ov = o.body.linvel(); ix += (mv.x - ov.x)*mass*.6; iy += (mv.y - ov.y)*mass*.6; iz += (mv.z - ov.z)*mass*.6; o.clingTo = m; }
    o.body.applyImpulse({x:ix, y:iy, z:iz}, true);
    if (m !== held) m.body.applyImpulse({x:-ix, y:-iy, z:-iz}, true);
    if (holds && bd < .03 && !o.stuck) { o.stuck = true; labSound.magnet(c.x); }
  }
}
// Two magnets push and pull pole on pole: unlike poles attract and like poles repel, each pole pushing
// like a point charge, weaker with the square of the distance. Pushed at its poles, a free magnet
// slides, or swings round until its other end faces the way it's pulled and snaps on. Steel made into
// a magnet here is too weak to push back: a real magnet just remagnetizes it and pulls.
const POLE_K = .035, POLE_NEAR = .02;
const _pa = {}, _pb = {};
function poleToPole(a, b){
  const s = strength(a)*strength(b), held = desk.held;
  for (const p of a.def.poles) {
    const pw = toWorld(a.body, p.x, p.y, p.z, _pa);
    for (const q of b.def.poles) {
      const qw = toWorld(b.body, q.x, q.y, q.z, _pb), dx = qw.x - pw.x, dy = qw.y - pw.y, dz = qw.z - pw.z, d = Math.hypot(dx, dy, dz);
      if (d > .3) continue;
      const k = POLE_K*s*p.n*q.n/Math.max(d, POLE_NEAR)**2*STEP/d;
      if (b !== held) b.body.applyImpulseAtPoint({x:dx*k, y:dy*k, z:dz*k}, qw, true);
      if (a !== held) a.body.applyImpulseAtPoint({x:-dx*k, y:-dy*k, z:-dz*k}, pw, true);
      if (p.n*q.n < 0 && d < .025) { if (desk.t - (b.snapT || -1) > .3) labSound.snap(qw.x); b.snapT = a.snapT = desk.t; }
    }
  }
}
// A pole sliding along steel turns its tiny magnetic domains to line up one way round, a little more
// with every stroke the same way. Stroking back the other way turns them back, so rubbing to and fro
// hardly works.
function stroke(m, o, pole, s){
  const end = o.def.poles[0], half = Math.abs(end.x), l = toLocal(o.body, pole.x, pole.y, pole.z, _l);
  if (Math.hypot(Math.max(0, Math.abs(l.x) - half), l.y - end.y, l.z) > .03) return;
  const mv = m.body.linvel(), ov = o.body.linvel(); _ax.x = 1; _ax.y = 0; _ax.z = 0; rot(o.body.rotation(), _ax);
  const va = (mv.x - ov.x)*_ax.x + (mv.y - ov.y)*_ax.y + (mv.z - ov.z)*_ax.z;
  if (Math.abs(va) < .02) return;
  const was = o.mag || 0;
  o.mag = was + (pole.n*Math.sign(va) - was)*Math.min(1, STROKE*s*Math.abs(va)*STEP/(2*half));
  labSound.stroke(o, o.body.translation().x, Math.abs(o.mag));
}
function tools(it, dt){
  const lv = it.body.linvel(), speed = Math.hypot(lv.x, lv.z);
  if (it.def.tool === 'spoon') {
    const bowl = toWorld(it.body, 0, .016, 0, _w);
    for (const v of vessels()) {
      if (v === it || !within(v, localOf(v, bowl))) continue;
      const wet = chem.liquidVol(v.c) > 2;
      // dipped in a dry box of powder, the bowl comes up full; dipped anywhere else, it empties there
      if (!wet && !it.scoop && chem.pileVol(v.c) > SPOONFUL) {
        it.scoop = chem.take(v.c, SPOONFUL); it.from = v;
        it.refs.heap.material.color.setHex(chem.pileColor(it.scoop)); it.refs.heap.visible = true;
        labSound.scoop(bowl.x);
      } else if (it.scoop && v !== it.from) {
        for (const k in it.scoop.p) v.stats.spoons[k] = (v.stats.spoons[k] || 0) + 1;
        deliver(v, it.scoop, bowl.x, bowl.z, true); it.scoop = null; it.refs.heap.visible = false;
        labSound.tipOut(bowl.x);
      }
      v.stir = Math.max(v.stir, Math.min(1.2, speed*2)); if (wet) v.stats.stir += speed*dt;
      if (desk.fx.hasFilm(v)) desk.fx.film(v).swirl(Math.min(2, speed*6)*dt);
      if (chem.oilVol(v.c) > 3 && chem.waterVol(v.c) > 3 && speed > .15 && Math.random() < dt*30) desk.fx.oildrop(v);
      if (wet) labSound.stir(v, bowl.x, speed);
    }
  } else if (it.def.tool === 'swab') {
    const tip = toWorld(it.body, 0, .009, 0, {});
    let dipped = null;
    for (const v of vessels()) {
      if (v === it) continue;
      const l = localOf(v, tip);
      if (!within(v, l) || l.y > top(v) + .003) continue;
      dipped = v;
      if ((v.c.l.soap || 0) > .3) setSoapy(it, true);
      else if (it.soapy && chem.liquidVol(v.c) > 2 && it.dippedIn !== v) {
        chem.add(v.c, 'soap', .5);
        if (desk.fx.hasFilm(v) && desk.fx.film(v).soap(l.x/v.def.ri, l.z/v.def.ri)) v.stats.bursts++;
      }
    }
    const pool = desk.fluid.poolAt(tip.x, tip.y, tip.z, .004);
    if (pool && (pool.c.l.soap || 0) > .3) setSoapy(it, true);
    it.dippedIn = dipped;
  } else if (it.def.tool === 'strip') {
    const tip = toWorld(it.body, 0, .01, 0, {});
    let into = null;
    for (const v of vessels()) { if (v === it) continue; const l = localOf(v, tip); if (within(v, l) && l.y < waterTop(v) && chem.waterVol(v.c) > 2) { into = v; break; } }
    const pool = into ? null : desk.fluid.poolAt(tip.x, tip.y, tip.z, .004), c = into ? into.c : pool && chem.waterVol(pool.c) > .5 ? pool.c : null;
    if (c) {
      const p = chem.ph(c); it.reading = p; it.refs.pad.material.color.setHex(chem.universal(p));
      if (into) into.stats.dip = {ph:p, steady:chem.steady(c), t:desk.t};
      if (it.dippedIn !== (into || pool)) labSound.dip(tip.x);
    }
    it.dippedIn = c ? into || pool : null;
  }
}
function setSoapy(it, on){ if (it.soapy === on) return; it.soapy = on; it.refs.tip.material = new THREE.MeshToonMaterial({gradientMap:grad, color: on ? 0x9fe0a0 : 0xffffff}); it.refs.tip.userData.own = true; }
function tablet(it, dt){
  if (!(it.stock > 0)) return;
  const c = it.body.worldCom();
  let into = null;
  for (const v of vessels()) { if (v === it) continue; const l = localOf(v, c); if (within(v, l) && l.y < waterTop(v) && chem.waterVol(v.c) > 10) { into = v.c; break; } }
  if (!into) { const pool = desk.fluid.poolAt(c.x, c.y - it.def.h/2, c.z, .005); if (pool && chem.waterVol(pool.c) > 3) into = pool.c; }
  if (!into) return;
  // it melts away over about nine seconds
  const n = Math.min(it.stock, it.def.fizz/9*dt); it.stock -= n; chem.add(into, 'tablet', n);
  it.g.scale.setScalar(.35 + .65*it.stock/it.def.fizz);
  if (it.stock <= 0) vanish(it);
}
function balloons(b){
  if (!b.attached) {
    if (b === desk.held) return;
    // let go on or right by a bottle's neck, it stretches on: mouth over the neck, hanging off to the side
    const m = toWorld(b.body, 0, b.def.open.y, 0, {}), base = b.body.translation();
    for (const v of vessels()) {
      if (!v.def.neck || capOn(v) || uprightness(v) < .8) continue;
      const o = toWorld(v.body, 0, v.def.open.y, 0, _w);
      if (Math.min(Math.hypot(m.x - o.x, m.y - o.y, m.z - o.z), Math.hypot(base.x - o.x, base.y - o.y, base.z - o.z)) > .05) continue;
      attach(b, v); return;
    }
    return;
  }
  // The gas in the bottle and the balloon is one: it swells the balloon wherever it pushes harder than
  // the rubber and the room together. Rubber answers in milliseconds, much faster than a tick, so each
  // step leans on the slope of that push (an implicit step) and can't overshoot.
  const v = b.attached, t = chem.temp(v.c), hs = headspace(v), was = b.inflate, k = 150*STEP/4;
  const push = vol => gas.pressure(v.gas, hs + vol, t) - gas.P0 - gas.rubber(vol, b.def.rest);
  for (let i = 0; i < 4; i++) { const f = push(b.vol), slope = Math.min(0, (push(b.vol + .01) - f)/.01); b.vol = Math.max(0, b.vol + k*f/(1 - k*slope)); }
  if (b.vol > b.def.rest*b.burstAt**3) { burst(b); return; }
  const r = Math.cbrt(b.vol/UNITS_PER_M3*3/(4*Math.PI)); b.inflate = Math.max(0, r/SACK - 1)/1.6;
  if (b.inflate > was + .0005) labSound.stretch(b, b.body.translation().x, b.inflate);
  if (Math.abs(b.inflate - (b.shapeAt || 0)) > .04) reshapeBalloon(b);
  seat(b, STEP);
}
// Stretched past what its rubber can take, the balloon bursts: it tears into shreds, and the gas it
// held puffs out.
const SACK = .036;
function burst(b){
  const c = toWorld(b.body, 0, b.def.open.y - .055*(1 + b.inflate*1.9), 0, {}), r = SACK*(1 + 1.6*b.inflate);
  detach(b); b.burst = true; vanish(b);
  desk.fx.shreds(c.x, c.y, c.z, r, b.refs.skin.color.getHex());
  for (let i = 0; i < 24; i++) { const a = Math.random()*7, e = Math.random()*2 - 1, s = Math.sqrt(1 - e*e), k = .3 + Math.random()*.5;
    desk.fx.wisp(c.x + Math.cos(a)*s*r*.6, c.y + e*r*.6, c.z + Math.sin(a)*s*r*.6, Math.cos(a)*s*k, e*k, Math.sin(a)*s*k); }
  labSound.burst(c.x, r);
}

// ---------- spilling and pouring ----------
function pourAngle(v){
  const lv = chem.liquidVol(v.c), f = Math.min(1, (lv || chem.pileVol(v.c)*1.3)/v.cap), o = v.def.open;
  let a = o.r < v.def.ri*.6 ? .7 + (1 - f)*.9 : Math.atan2((1 - f)*v.def.hi, v.def.ri);
  if (!lv) a += .3;
  return Math.min(1.9, a);
}
const _d = {};
// the point on the rim that's lowest right now, and which way is out from there; standing upright,
// the side the hand tips it toward
function lowRim(v){
  const q = v.body.rotation(); _d.x = 0; _d.y = -1; _d.z = 0; rot(q, _d, true);
  let dx = _d.x, dz = _d.z; const dl = Math.hypot(dx, dz); if (dl < 1e-4) { dx = -1; dz = 0; } else { dx /= dl; dz /= dl; }
  const o = v.def.open, p = toWorld(v.body, dx*o.r, o.y, dz*o.r, {}), out = rot(q, {x:dx, y:0, z:dz});
  return {p, out};
}
function spill(v, dt){
  if (chem.isEmpty(v.c)) return;
  const tilt = Math.acos(Math.max(-1, Math.min(1, uprightness(v)))), flow = v.def.flow, lv = v.body.linvel();
  const over = chem.liquidVol(v.c) - v.cap;
  if (over > .5) { const {p, out} = lowRim(v); desk.fluid.emit(p.x, p.y, p.z, lv.x + out.x*.08, lv.y, lv.z + out.z*.08, chem.take(v.c, over), v.body); }
  if (tilt < .15) return;
  if (flow === 'drops') {
    if (tilt < 1.8 || (v.drip = (v.drip || 0) - dt) > 0) return;
    v.drip = .38; const {p} = lowRim(v); p.y -= .006; const a = aimed(v, p, {x:lv.x, y:lv.y - .1, z:lv.z});
    desk.fluid.emit(p.x, p.y, p.z, a.x, a.y, a.z, chem.take(v.c, 1), v.body); labSound.drip(p.x);
    return;
  }
  if (flow === 'shake') {
    // each shake sprinkles over the swing back toward the middle, not all at the far end
    if (v.shook) { v.shook = false; v.sprinkle = .12; labSound.shake(v.body.translation().x); }
    if (!(v.sprinkle > 0)) return;
    v.sprinkle -= dt;
    const {p} = lowRim(v), a = aimed(v, p, {x:lv.x*.3, y:lv.y - .2, z:lv.z*.3}); desk.fluid.emit(p.x, p.y, p.z, a.x, a.y, a.z, chem.take(v.c, 1.4*dt/.12), v.body);
    return;
  }
  const a0 = pourAngle(v); if (tilt <= a0) return;
  // turned right over, it glugs out much faster than a careful pour
  const rate = v.def.rate*clamp01((tilt - a0)/.45)*(tilt > 2.2 ? 2.6 : tilt > 1.7 ? 1.4 : 1), out = chem.take(v.c, rate*dt);
  if (chem.isEmpty(out)) return;
  if (!chem.liquidVol(v.c)) desk.fx.dropFilm(v);
  // a balloon on a bottle can only empty into the bottle; its mouth is wrapped round the neck
  if (v.attached) { const t = v.attached.body.translation(); deliver(v.attached, out, t.x, t.z); }
  else { const {p, out:o} = lowRim(v), a = aimed(v, p, {x:lv.x + o.x*.16, y:lv.y - .03, z:lv.z + o.z*.16}); desk.fluid.emit(p.x, p.y, p.z, a.x, a.y, a.z, out, v.body); }
  labSound.pour(v.body.translation().x, rate, !chem.liquidVol(out));
}
function shaking(v){
  // a quick reversal of direction while upside down is a shake
  const lv = v.body.linvel(); v.shakeT -= STEP;
  for (const ax of ['x', 'z']) {
    const sp = lv[ax]; if (Math.abs(sp) < .25) continue;
    if (v.lastDir[ax] && Math.sign(sp) !== v.lastDir[ax] && uprightness(v) < 0 && v.shakeT <= 0) { v.shook = true; v.shakeT = .09; }
    v.lastDir[ax] = Math.sign(sp);
  }
}

// ---------- heat ----------
// A lit burner heats what stands on its gauze, four times or so faster than a real one. Hot air rises
// off it in a plume, and steam with it from an open container boiling on top. Water boiling to steam
// swells about 1700 times, which is what presses on a stopper; a tube in the stopper lets it out
// through its narrow nozzle as a fast jet. A plume or jet crossing the steam wheel's paddles to one
// side of its axle turns it, harder the more flows (in mL a second) and the squarer it hits; dead
// centre, both sides push alike and it stays still. The air drags on the paddles harder the faster
// they go, so no stream spins it faster than it can push.
const BURNER = 2500, HOT_AIR = 500, WIND = 2e-4, AIR_DRAG = 3.3e-6;
function heater(v){
  if (uprightness(v) < .8) return null;
  const t = v.body.translation();
  for (const b of live()) {
    if (!b.lit) continue;
    const l = toLocal(b.body, t.x, t.y, t.z, {});
    if (Math.abs(l.x) < .05 && Math.abs(l.z) < .05 && l.y > b.def.h - .01 && l.y < b.def.h + .02) return b;
  }
  return null;
}
let flows = [];
function streams(){
  const out = [];
  for (const b of live()) {
    if (!b.lit) continue;
    const v = vessels().find(v => heater(v) === b), steam = v && !capOn(v) ? v.steam : 0;
    out.push({kind:'plume', s: v ? toWorld(v.body, 0, v.def.open.y, 0, {}) : toWorld(b.body, 0, b.def.h, 0, {}), d:{x:0, y:1, z:0}, flow:HOT_AIR + steam, steam, r0:.02, spread:.2, reach:.35});
  }
  for (const c of live()) if (c.plugged && c.def.jet && c.jet > 1) {
    const j = c.def.jet;
    out.push({kind:'jet', s:toWorld(c.body, j.x, j.y, j.z, {}), d:rot(c.body.rotation(), {...j.dir}), flow:c.jet*.5, steam:c.jet, u:c.jetU, r0:.006, spread:.12, reach:.3, src:c});
  }
  return out;
}
function blow(w){
  const R = w.def.beam.blades, C = w.beam.translation(), a = rot(w.beam.rotation(), {x:0, y:0, z:1});
  let tq = 0, best = null, most = 0;
  for (const st of flows) {
    const {s:S, d} = st, cx = C.x - S.x, cy = C.y - S.y, cz = C.z - S.z, t = cx*d.x + cy*d.y + cz*d.z;
    if (t < 0 || t > st.reach) continue;
    // from the axle to where the stream passes closest, and how far off the wheel's face that is
    const ox = d.x*t - cx, oy = d.y*t - cy, oz = d.z*t - cz, axial = ox*a.x + oy*a.y + oz*a.z, rs = st.r0 + st.spread*t;
    const cover = 1 - Math.abs(axial)/(rs + .02); if (cover <= 0) continue;
    let ex = a.y*d.z - a.z*d.y, ey = a.z*d.x - a.x*d.z, ez = a.x*d.y - a.y*d.x; const side = Math.hypot(ex, ey, ez); if (side < .1) continue;
    ex /= side; ey /= side; ez /= side;
    const off = ox*ex + oy*ey + oz*ez;
    let sum = 0, on = 0; for (let k = -2; k <= 2; k++) { const sk = off + rs*k/2.5; if (Math.abs(sk) > .012 && Math.abs(sk) < R) { sum += sk; on++; } }
    const push = WIND*st.flow*Math.exp(-t/st.reach)*cover*side*sum/5;
    tq -= push;
    if (Math.abs(push) > most) { most = Math.abs(push); best = {kind:st.kind, cover:cover*on/5}; }
  }
  const av = w.beam.angvel(), spin = av.x*a.x + av.y*a.y + av.z*a.z; tq -= AIR_DRAG*spin*Math.abs(spin);
  w.beam.applyTorqueImpulse({x:a.x*tq*STEP, y:a.y*tq*STEP, z:a.z*tq*STEP}, true);
  w.blown = best;
}
function puffs(dt){
  for (const st of flows) {
    if (!(st.steam > 0)) continue;
    // a jet leaves its nozzle at hundreds of metres a second; wisps only show which way, a little faster for a faster jet
    const n = st.steam*dt/(st.kind === 'jet' ? 90 : 140), sp = st.kind === 'jet' ? Math.min(1, .3 + st.u/500) : .24;
    for (let i = 0; i < Math.floor(n + Math.random()); i++) {
      const j = () => (Math.random() - .5)*.012;
      desk.fx.wisp(st.s.x + j(), st.s.y + j(), st.s.z + j(), st.d.x*sp + j()*4, st.d.y*sp + .03 + Math.abs(j())*4, st.d.z*sp + j()*4);
    }
    if (st.src) labSound.hiss(st.src, st.s.x, st.steam);
  }
}

// ---------- chemistry in every container ----------
function chemStep(v, dt){
  // liquid carries the fizz across a container much faster than it creeps through a dry pile
  const made = spread(v, v.c, dt, v.def.ri, chem.liquidVol(v.c) > 5 ? .08 : .03, v.stir); v.stir = Math.max(0, v.stir - dt*3);
  if (desk.endless && v.refill && v !== desk.held && uprightness(v) > .8) {
    // Free Lab supplies top themselves back up with what they started with, keeping anything mixed in
    let short = false;
    for (const k in v.full) { const have = chem.amount(v.c, k); if (have < v.full[k]) { chem.add(v.c, k, Math.min(v.full[k] - have, 40*dt)); short = true; } }
    if (!short) v.refill = false;
  }
  // what's inside weighs the container down from the bottom, which is what keeps a full bottle standing
  const kg = (chem.liquidVol(v.c) + chem.pileVol(v.c))/UNITS_PER_M3*1000;
  if (Math.abs(kg - v.mass) > Math.max(.01, v.mass*.05)) {
    v.mass = kg;
    const fill = Math.min(1, (chem.liquidVol(v.c) + chem.pileVol(v.c))/v.cap), h = Math.max(.005, v.def.hi*fill), r = v.def.ri;
    const ixz = kg*(r*r/4 + h*h/12), iy = kg*r*r/2;
    v.body.setAdditionalMassProperties(kg, {x:0, y:v.def.floor + h/2, z:0}, {x:ixz, y:iy, z:ixz}, {x:0, y:0, z:0, w:1}, true);
  }
  // Over a lit burner it heats, and boils once water's vapour pressure beats the pressure on it: at 100 °C
  // under an open mouth, never in a sealed bottle, where the steam only builds up the pressure.
  // Through a narrow way out, the water feels that pressure a moment late, as bubbles take a moment to
  // start or stop; without the lag a small space over boiling water swings between flash-boiling and
  // none, tick by tick.
  const g = v.gas, cap = capOn(v), V = space(v), x = v.body.translation().x, P = gas.pressure(g, V, chem.temp(v.c));
  const hole = cap ? (cap.def.jet ? gas.area(cap.def.jet.r) : 0) : gas.area(v.def.open.r);
  v.pb = hole ? (v.pb || gas.P0) + (P - (v.pb || gas.P0))*Math.min(1, dt/1.5) : P;
  const boiled = chem.warm(v.c, dt, heater(v) ? BURNER : 0, gas.tsat(v.pb));
  g.vap += boiled*gas.WATER;
  if (boiled > 0) { labSound.boil(v, x, boiled/dt); if (Math.random() < dt*25) desk.fx.bubble(v); }
  const up = gas.trade(g, v.c, V, dt, made, v.stir);
  // what gets out, and how fast: through the open mouth, a stopper's nozzle, or not at all
  const t = chem.temp(v.c), out = gas.vent(g, V, t, hole, dt), steam = out.vap*gas.R*(t + gas.K0)/gas.P0/dt;
  if (!cap) gas.draft(g, V, t, hole, dt);
  if (cap && cap.def.jet) { cap.jet = (cap.jet || 0)*.85 + .15*steam; cap.jetU = out.u; }
  v.steam = cap ? 0 : steam;
  // gas let out fast, as when a cork comes out, cools as it spreads and shows as a puff of mist
  if (out.u > 15 && out.co2 > .05) { const m = toWorld(v.body, 0, v.def.open.y, 0, _w);
    for (let i = 0; i < Math.min(12, out.co2*4); i++) desk.fx.wisp(m.x, m.y, m.z, (Math.random() - .5)*.3, .3 + Math.random()*.4, (Math.random() - .5)*.3); }
  if (made > 0) {
    v.stats.gas += made; labSound.fizz(v, x, made/dt, dt);
    if (Math.random() < Math.min(1, made/dt*.012)) for (let i = 0; i < Math.min(6, 1 + made/dt*.05); i++) desk.fx.bubble(v, v.front);
  }
  // Bubbles of gas come up out of the liquid; out of an open mouth they carry froth with them, as fast
  // as the gas leaving pushes it (Q/A, so the narrower the mouth, the faster)
  if (up > .02 && !made && Math.random() < up/dt*.05) desk.fx.bubble(v);
  if (!(up > 0) || cap) { v.head = Math.max(0, v.head - dt*.006); return; }
  const rate = up/dt, lk = chem.look(v.c);
  if (!(chem.oilVol(v.c) > 5)) {
    // oil on top lets the gas through as bubbles instead of froth
    const soapy = (v.c.l.soap || 0) > .5, o = v.def.open, upward = rot(v.body.rotation(), {x:0, y:1, z:0});
    v.head = Math.min(.025, v.head + up*.0007*(soapy ? 2 : 1));
    v.foam += up*(soapy ? 2.7 : .96)*(v.type === 'volcano' ? 1.5 : 1);
    const fc = chem.lerpCol(0xffffff, lk ? lk.col : 0xffffff, soapy ? .55 : .3);
    // a wide-open top foams where the fizz is; a narrow mouth is the only way out, wherever it is
    const at = v.front && o.r > v.def.ri*.8 ? v.front : {x:0, z:0, r:o.r};
    v.foam = desk.fluid.gush(v.foam, out.u, fc, v.body.linvel(), upward, () => { const a = Math.random()*7, r = Math.random()*Math.min(at.r, o.r)*.8;
      return toWorld(v.body, at.x + Math.cos(a)*r, o.y + .004, at.z + Math.sin(a)*r, _w); }, v.stats);
    // a big rush of gas kicks the container about
    if (rate > 65 && v !== desk.held) { const k = Math.min(1, (rate - 65)/200)*.0006*dt*60; v.body.applyImpulse({x:(Math.random() - .5)*k, y:k*.6, z:(Math.random() - .5)*k}, true); }
  }
  if (chem.oilVol(v.c) > 5 && lk) { v.blobAcc = (v.blobAcc || 0) + up*.6; while (v.blobAcc >= 1) { v.blobAcc -= 1; desk.fx.blob(v, lk.col); v.stats.blobs++; labSound.bloop(v, x); } }
}

// ---------- drawing ----------
function draw(it, dt){
  if (it.pop < 1) { it.pop += dt/.4; const p = clamp01(it.pop) - 1; it.g.scale.setScalar(it.pop <= 0 ? .001 : 1 + 2.7*p*p*p + 1.7*p*p); }
  else if (it.stock === undefined) it.g.scale.setScalar(1);
  const t = it.body.translation(), r = it.body.rotation();
  it.g.position.set(t.x, t.y, t.z); it.g.quaternion.set(r.x, r.y, r.z, r.w);
  if (it.tarnish !== undefined && Math.abs(it.tarnish - it.drawnT) > .004) { it.def.shade(it.refs, it.tarnish); it.drawnT = it.tarnish; }
  if (it.def.knob) {
    // the flame flickers; the gauze over it glows as it heats, and fades slowly once it's off
    it.glow = (it.glow || 0) + ((it.lit ? 1 : 0) - (it.glow || 0))*Math.min(1, dt*(it.lit ? .6 : .25));
    it.refs.flame.visible = !!it.lit; if (it.lit) it.refs.flame.scale.set(1, .85 + Math.random()*.3, 1);
    const gm = it.refs.gauze.material; gm.color.setHex(chem.lerpCol(0x77727c, 0xff7a3a, it.glow)); gm.emissive.setHex(0xff5a1a); gm.emissiveIntensity = it.glow*.7;
    if (it.lit) labSound.burn(it, t.x);
  }
  if (it.beam && it.def.beam.blades) {
    const av = it.beam.angvel(), a = rot(it.beam.rotation(), {x:0, y:0, z:1}); it.spin = Math.abs(av.x*a.x + av.y*a.y + av.z*a.z);
    if (it.spin > 1) labSound.whirr(it, t.x, it.spin);
  }
  if (it.beam) { const bt = it.beam.translation(), br = it.beam.rotation(), bm = it.refs.beam; bm.position.set(bt.x, bt.y, bt.z); bm.quaternion.set(br.x, br.y, br.z, br.w); bm.scale.copy(it.g.scale); }
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
function clack(it, dt){
  const vy = it.body.linvel().y;
  if (it.vy < -.45 && vy > -.1) labSound.land(it, it.body.translation().x, -it.vy/2);
  it.vy = vy;
  if (!it.beam) return;
  // a beam swinging down onto the mat knocks; one that has stopped moving has weighed what's in its pans
  const w = Math.abs(it.beam.angvel().z);
  if (it.def.beam.arm && it.swing > .8 && w < .2) labSound.land(it, it.body.translation().x, it.swing/3);
  it.swing = w; it.calm = w < .03 ? it.calm + dt : 0;
}

let acc = 0;
export function updateDesk(dt){
  if (!P.world || !desk.items.length) return;
  desk.t += dt; acc = Math.min(acc + dt, STEP*3);
  while (acc >= STEP) {
    acc -= STEP;
    const H = desk.held && !desk.held.gone ? desk.held : null;
    if (H) steer(H, STEP);
    for (const it of live()) {
      buoyancy(it);
      if (it.def.balloon) balloons(it);
      if (it.plugged) stopper(it);
      if (it.def.flow === 'shake') shaking(it);
      // Small things dropped from the hand would fall a container's floor-thickness in one step and
      // pass straight through it (the engine's sweep misses thin, fast things). A step that ends past
      // the middle of a floor gets pushed out the far side, so inside a container they fall no faster
      // than half its floor and half the thing per step; a foil floor is very thin.
      if (it !== H && !isVessel(it) && it.def.r < .035) {
        const lv = it.body.linvel(), c = it.body.worldCom();
        let most = 1.1; for (const v of vessels()) if (v !== it && within(v, localOf(v, c), .02)) most = Math.min(most, .5, (v.def.floor + it.def.h)*30);
        if (lv.y < -most) it.body.setLinvel({x:lv.x, y:-most, z:lv.z}, true);
      }
    }
    for (const it of live()) { it.clingTo = null; if (it.tarnish > 0 && it.soakIn) polish(it); }
    for (const m of live()) if (pulls(m)) magnetism(m);
    const mags = live().filter(m => m.def.tool === 'magnet');
    for (let i = 0; i < mags.length; i++) for (let j = i + 1; j < mags.length; j++) poleToPole(mags[i], mags[j]);
    for (const w of live()) if (w.beam && w.def.beam.blades) blow(w);
    while (leaving.length) retire(leaving.pop());
    P.world.step();
    for (const v of vessels()) spill(v, STEP);
    if (H && H.def.tool) tools(H, STEP);
  }
  for (const it of live()) {
    // a body knocked into nonsense by a bad number goes back to where it last made sense
    const t = it.body.translation();
    if (Number.isFinite(t.x + t.y + t.z)) it.good = {x:t.x, y:t.y, z:t.z};
    else if (it.good) { it.body.setTranslation(it.good, true); it.body.setRotation({x:0, y:0, z:0, w:1}, true); it.body.setLinvel({x:0, y:0, z:0}, true); it.body.setAngvel({x:0, y:0, z:0}, true); }
    if (it.stock !== undefined) tablet(it, dt);
    if (it.resting && it !== desk.held && !insideOf(it.resting, it)) { it.resting = null; ghost(it.body, false); }
    clack(it, dt);
  }
  for (const v of vessels()) chemStep(v, dt);
  flows = streams(); puffs(dt);
  catchers = vessels().filter(v => !v.attached && uprightness(v) >= .35).map(v => ({v, seal:capOn(v)}));
  desk.fluid.step(dt);
  showAim();
  desk.fx.update(dt);
  desk.fluid.draw();
  for (const it of live()) draw(it, dt);
}

// ---------- what experiments can ask ----------
// how far over the room's pressure (kPa) the gas in a container is, or the one a cork or balloon closes
export function gauge(id){ const it = find(id), v = it && (isVessel(it) && !it.def.balloon ? it : it.plugged || it.attached); return v ? pressure(v) : null; }
export const totalGas = () => vessels().reduce((s, v) => s + v.stats.gas, 0) + desk.fluid.gas();
// the tray or container a thing is sitting in, by id
export function restingIn(id){
  const it = find(id); if (!it) return null;
  const c = it.body.worldCom(), v = holder(it, c, .02);
  if (v) return v.id;
  for (const o of live()) {
    if (o === it || o.def.kind !== 'tray') continue;
    const l = localOf(o, c);
    if (Math.abs(l.x) < o.def.w/2 && Math.abs(l.z) < o.def.d/2 && l.y > -.01 && l.y < .12) return o.id;
  }
  return null;
}
// A balance by id: how far its beam leans (positive when the right pan is lower), how long it has been
// still, and what's in each pan with how big each thing is.
export function weighing(id){
  const it = find(id); if (!it || !it.beam) return null;
  const B = it.def.beam, ax = rot(it.beam.rotation(), {x:1, y:0, z:0}), pans = {left:[], right:[]};
  for (const o of live()) {
    if (o === it) continue;
    const c = o.body.worldCom(), l = toLocal(it.beam, c.x, c.y, c.z, {});
    if (Math.abs(Math.abs(l.x) - B.arm) < B.pan.w/2 && Math.abs(l.z) < B.pan.d/2 && l.y > B.pan.y && l.y < B.pan.y + .1) pans[l.x < 0 ? 'left' : 'right'].push({id:o.id, size:volumeOf(o)});
  }
  return {tilt: -Math.asin(Math.max(-1, Math.min(1, ax.y))), calm: it.calm, ...pans};
}
// for every two magnets, their nearest poles: how far apart, and whether they're alike
export function poleMeets(){
  const mags = live().filter(m => m.def.tool === 'magnet'), out = [];
  for (let i = 0; i < mags.length; i++) for (let j = i + 1; j < mags.length; j++) {
    let best = null;
    for (const p of mags[i].def.poles) for (const q of mags[j].def.poles) {
      const a = toWorld(mags[i].body, p.x, p.y, p.z, {}), b = toWorld(mags[j].body, q.x, q.y, q.z, {}), d = Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z);
      if (!best || d < best.d) best = {a:mags[i].id, b:mags[j].id, d, like:p.n === q.n};
    }
    out.push(best);
  }
  return out;
}
