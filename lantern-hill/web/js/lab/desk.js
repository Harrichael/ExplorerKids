// The experiment desk. Everything on it is a rigid body in the physics world: the hand steers what it
// holds with springs, so a carried cup still bumps into things; any container tipped far enough spills
// from its low rim, held or knocked over; floating, magnets and stirring are forces on those bodies.
// Containers hold their contents as chemistry; whatever leaves one is fluid.js's. The hands steer it
// and experiments read it; it knows nothing about either. Positions are in the desk's frame: x across,
// z toward the explorer, y up from the mat.

import * as THREE from 'three';
import { clamp01, grad } from '../core/kit.js';
import { Sound } from '../core/sound.js';
import * as chem from './chem.js';
import { makeFluid, spread } from './fluid.js';
import { makeFx } from './fx.js';
import { P, STEP, THING, ghost, makeBody, makeWorld, retire, rot, toLocal, toWorld, upOf } from './physics.js';
import { ITEMS, UNITS_PER_M3, capacity } from './stuff.js';

const BOUNDS = {x:.8, z:.52};
const MAX_TIP = 2.5;

export const desk = {root:null, fx:null, fluid:null, items:[], held:null, ray:null, tip:false, endless:false};
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
  return l.y > v.def.floor - .006 && l.y < o.y + pad && Math.hypot(l.x, l.z) < r;
}
const balloonOn = v => desk.items.find(b => !b.gone && b.attached === v);

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
  if (out.p.pepper && wet) { f.film(v).pepper(u, w, Math.ceil(out.p.pepper*14)); delete out.p.pepper; }
  for (const k of ['red', 'yellow', 'blue']) {
    if (!out.l[k]) continue;
    if (wet && chem.milky(v.c)) { f.film(v).dye(u, w, chem.SUB[k].col); v.stats.dye.add(k); delete out.l[k]; continue; }
    if (!settled && chem.oilVol(v.c) > 3) { const one = chem.empty(); one.l[k] = out.l[k]; f.bead(v, l.x, l.z, chem.SUB[k].col, one); delete out.l[k]; continue; }
    v.stats.dye.add(k);
  }
  if (out.l.soap && f.hasFilm(v) && f.film(v).soap(u, w)) v.stats.bursts++;
  chem.merge(v.c, out);
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
// a free bottle neck near the balloon's mouth
function neckFor(b){
  const m = toWorld(b.body, 0, b.def.open.y, 0, {});
  let best = null, bd = .08;
  for (const v of vessels()) {
    if (!v.def.neck || balloonOn(v) || uprightness(v) < .8) continue;
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
  desk.fluid = makeFluid(root, {catches, deliver, fizz: (pool, gas, rate) => fizzSound(gas, rate)});
}

// ---------- building and clearing ----------
const UNIT_CYL = new THREE.CylinderGeometry(1, 1, 1, 24), HEMI = new THREE.SphereGeometry(1, 16, 8, 0, Math.PI*2, 0, Math.PI/2);
function liquidMesh(parent, geo, order){
  const m = new THREE.Mesh(geo, new THREE.MeshToonMaterial({gradientMap:grad, color:0xffffff, transparent:true, depthWrite:false}));
  m.renderOrder = order; m.visible = false; m.userData.own = true; parent.add(m); return m;
}
function makeItem(id, type, x, z, o, i){
  const def = ITEMS[type], g = new THREE.Group(); desk.root.add(g);
  const it = {id, type, def, g, pop:-i*.04, stats:{gas:0, stir:0, bursts:0, blobs:0, dye:new Set()}, vy:0, still:0, tilt:0, lastDir:{x:0, z:0}, shakeT:0};
  it.refs = def.build(g, o) || {};
  it.body = makeBody(def, x, .002, z, it);
  if (o.rot) it.body.setRotation({x:0, y:Math.sin(o.rot/2), z:0, w:Math.cos(o.rot/2)}, false);
  it.grip = def.grip !== undefined ? def.grip : def.h*.7;
  if (isVessel(it)) {
    it.full = o.fill || def.fill || {}; it.c = chem.fill(it.full); it.cap = capacity(def);
    it.foam = 0; it.head = 0; it.stir = 0; it.mass = -1;
    if (def.see) it.liq = {w: liquidMesh(g, UNIT_CYL, 1), o: liquidMesh(g, UNIT_CYL, 1), p: liquidMesh(g, HEMI, 1), f: liquidMesh(g, UNIT_CYL, 2)};
  }
  g.traverse(m => { if (m.isMesh) m.userData.item = it; });
  if (def.fizz) it.stock = def.fizz;
  if (def.balloon) it.inflate = 0;
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
  for (const it of desk.items) {
    desk.root.remove(it.g);
    it.g.traverse(m => { if (!m.isMesh) return;
      if (m.geometry !== UNIT_CYL && m.geometry !== HEMI) m.geometry.dispose();
      if (m.material.map) { m.material.map.dispose(); m.material.dispose(); } else if (m.userData.own) m.material.dispose(); });
  }
  desk.items.length = 0; desk.held = null; leaving.length = 0;
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
  if (desk.held) release();
  desk.held = it; it.tilt = 0;
  if (it.attached) { it.raised = true; return; }
  it.body.setGravityScale(0, true); it.body.wakeUp();
  if (it.def.tool === 'spoon' || it.def.tool === 'swab') { ghost(it.body, 'held'); it.resting = null; }
  Sound.tone(660 + Math.random()*80, {type:'triangle', dur:.06, vol:.05});
}
export function release(){
  const it = desk.held; if (!it) return;
  const into = heldTarget(); desk.held = null;
  if (it.attached) { it.raised = false; return; }
  if (into && it.def.balloon) { attach(it, into.v); return; }
  if (into && !isVessel(it)) {
    // over the mouth, it drops straight down the middle
    const t = it.body.translation();
    it.body.setTranslation({x:into.m.x, y:Math.max(t.y, into.m.y + it.def.h + .01), z:into.m.z}, true);
    it.body.setLinvel({x:0, y:0, z:0}, true); it.body.setAngvel({x:0, y:0, z:0}, true);
  }
  it.body.setGravityScale(1, true);
  if (it.def.tool === 'spoon' || it.def.tool === 'swab') { it.resting = vessels().find(v => insideOf(v, it)) || null; ghost(it.body, it.resting ? 'resting' : false); }
  const v = it.body.linvel(), s = Math.hypot(v.x, v.y, v.z);
  if (s > 1.2) it.body.setLinvel({x:v.x/s*1.2, y:v.y/s*1.2, z:v.z/s*1.2}, true);
  if (desk.endless && it.def.supply) it.refill = true;
}

// what's inside the held thing doesn't count as something to carry it over
const insideOf = (v, it) => it !== v && !it.gone && isVessel(v) && within(v, localOf(v, it.body.worldCom()), .02);
// Carry things at one steady height, just over the tallest thing on the desk, so they never bob up
// and down while the hand moves and always clear a cup's rim instead of shoving its wall. Spoons and
// swabs dip into the container they're over; a magnet goes low over what's near it, to reach it.
function carryHeight(it, x, z){
  if (it.def.tool === 'spoon' || it.def.tool === 'swab') {
    for (const v of vessels()) {
      if (v === it || uprightness(v) < .8) continue;
      const vt = v.body.translation();
      if (!within(v, toLocal(v.body, x, vt.y + v.def.open.y - .01, z, _l))) continue;
      // over the rim first, then down: the tip has to be above the opening before it can go in
      const tip = it.body.translation(), tl = toLocal(v.body, tip.x, tip.y, tip.z, {}), r = v.def.open.neckY ? v.def.open.r : Math.max(v.def.open.r, v.def.ri);
      return tl.y > v.def.open.y - .02 && Math.hypot(tl.x, tl.z) < r - .006 || within(v, tl) ? vt.y + v.def.floor + .004 : vt.y + v.def.open.y + .02;
    }
  }
  const t = it.body.translation();
  let y = 0;
  for (const o of live()) {
    if (o === it || insideOf(it, o)) continue;
    const ot = o.body.translation();
    // things clinging to the magnet travel with it, so they're no obstacle
    if (it.def.tool === 'magnet' && o.stuck && Math.hypot(ot.x - t.x, ot.y - t.y, ot.z - t.z) < .09) continue;
    const reach = it.def.r + Math.max(o.def.r, (o.def.w || 0)/2) + .015;
    if (it.def.tool === 'magnet' && Math.hypot(x - ot.x, z - ot.z) > reach && Math.hypot(t.x - ot.x, t.z - ot.z) > reach) continue;
    // how tall it stands right now: its height upright, its width once it's tipped over
    const c = Math.min(1, Math.abs(uprightness(o))), sn = Math.sqrt(1 - c*c);
    y = Math.max(y, ot.y + o.def.h*c + Math.min(o.def.r, .06)*sn);
  }
  return y + (it.def.tool === 'magnet' ? .006 : .025);
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
  Sound.tone(300, {type:'triangle', dur:.12, vol:.08, f2:520});
}
function detach(b, burst){
  b.attached = null; b.raised = false;
  b.body.setBodyType(P.R.RigidBodyType.Dynamic, true); b.body.setGravityScale(desk.held === b ? 0 : 1, true);
  if (burst && b.inflate > .1) { Sound.hiss({dur:.8, vol:.12, type:'bandpass', freq:900, q:2}); Sound.tone(500, {type:'sawtooth', dur:.7, vol:.04, f2:200, cut:1200}); }
  b.inflate = 0; reshapeBalloon(b);
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

// ---------- forces: floating, magnets, stirring, balloons ----------
function overlap(a0, a1, b0, b1){ return Math.max(0, Math.min(a1, b1) - Math.max(a0, b0)); }
function volumeOf(it){
  if (it.def.kind === 'solid') return it.body.mass()/(it.def.density*1000);
  return Math.PI*it.def.r*it.def.r*it.def.h*(it.def.shape[0][0].startsWith('hollow') ? 1 : .8);
}
function buoyancy(it){
  if (it === desk.held && !it.attached) { it.still = 0; return; }
  const com = it.body.worldCom();
  for (const v of vessels()) {
    if (v === it || uprightness(v) < .6 || !chem.liquidVol(v.c)) continue;
    const l = localOf(v, com); if (!within(v, l, .02)) continue;
    const hh = Math.max(.004, it.def.h/2), lo = l.y - hh, hi = l.y + hh, wt = waterTop(v), ot = oilTop(v);
    // h is how tall a thing looks, which can reach below its collider and so through the floor; that
    // part is still under water, or an egg on the bottom loses a tenth of its lift and never comes up
    const fw = overlap(lo, hi, lo, wt)/(hi - lo), fo = overlap(lo, hi, wt, ot)/(hi - lo), f = fw + fo;
    if (f <= 0) return;
    // water drags on what it pushes aside, so a light cork is slowed as much as a heavy rock of its size
    const m = it.body.mass(), displaced = (chem.density(v.c)*fw + chem.OIL_DENSITY*fo)*1000*volumeOf(it);
    const lift = displaced*9.81*STEP, lv = it.body.linvel(), drag = (displaced + m)*7*STEP;
    it.body.applyImpulse({x:-lv.x*drag, y:lift - lv.y*drag, z:-lv.z*drag}, true);
    const av = it.body.angvel(), k = 1 - .08*f; it.body.setAngvel({x:av.x*k, y:av.y*k, z:av.z*k}, true);
    // a spoon going round drags everything in the cup along with it
    if (v.stir > .05) { const vt = v.body.translation(), dx = com.x - vt.x, dz = com.z - vt.z, d = Math.hypot(dx, dz) || 1; it.body.applyImpulse({x:-dz/d*v.stir*m*.6*STEP, y:0, z:dx/d*v.stir*m*.6*STEP}, true); }
    // a thing sitting still in liquid has shown whether it floats
    const sp = Math.hypot(lv.x, lv.y, lv.z);
    it.still = sp < .03 ? it.still + STEP : 0;
    const floating = hi > wt + .002 && l.y > v.def.floor + hh + .006;
    if (it.still > .6) it.settled = {v, floating};
    return;
  }
  it.still = 0;
}
const POLES = [{x:-.03, y:.004, z:0}, {x:.03, y:.004, z:0}];
function magnetism(m){
  for (const o of live()) {
    if (o === m) continue;
    const c = o.body.worldCom();
    let best = null, bd = 1;
    for (const pl of POLES) { const w = toWorld(m.body, pl.x, pl.y, pl.z, _w), d = Math.hypot(w.x - c.x, w.y - c.y, w.z - c.z); if (d < bd) { bd = d; best = {x:w.x, y:w.y, z:w.z}; } }
    if (!o.def.magnetic) { if (bd < .07 && m === desk.held) o.snubbed = true; continue; }
    if (bd > .15) continue;
    // the pull grows fast up close, and something touching a pole moves with the magnet
    const mass = o.body.mass(), touching = bd < .035, a = Math.min(touching ? 150 : 40, .06/(bd*bd)), k = mass*a*STEP/bd;
    let ix = (best.x - c.x)*k, iy = (best.y - c.y)*k, iz = (best.z - c.z)*k;
    if (touching) { const mv = m.body.linvel(), ov = o.body.linvel(); ix += (mv.x - ov.x)*mass*.6; iy += (mv.y - ov.y)*mass*.6; iz += (mv.z - ov.z)*mass*.6; }
    o.body.applyImpulse({x:ix, y:iy, z:iz}, true);
    if (m !== desk.held) m.body.applyImpulse({x:-ix, y:-iy, z:-iz}, true);
    if (bd < .03 && !o.stuck) { o.stuck = true; Sound.tone(1500, {type:'square', dur:.04, vol:.04, cut:3000}); Sound.tone(900, {type:'triangle', t:.03, dur:.06, vol:.05}); }
  }
}
function tools(it, dt){
  const lv = it.body.linvel(), speed = Math.hypot(lv.x, lv.z);
  if (it.def.tool === 'spoon') {
    const bowl = toWorld(it.body, 0, .016, 0, _w);
    for (const v of vessels()) {
      if (v === it || !within(v, localOf(v, bowl))) continue;
      const wet = chem.liquidVol(v.c) > 2;
      v.stir = Math.max(v.stir, Math.min(1.2, speed*2)); if (wet) v.stats.stir += speed*dt;
      if (desk.fx.hasFilm(v)) desk.fx.film(v).swirl(Math.min(2, speed*6)*dt);
      if (chem.oilVol(v.c) > 3 && chem.waterVol(v.c) > 3 && speed > .15 && Math.random() < dt*30) desk.fx.oildrop(v);
      if (speed > .1 && Math.random() < dt*4) Sound.tone(1900 + Math.random()*500, {type:'triangle', dur:.03, vol:.02});
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
  const n = Math.min(it.stock, .9*dt); it.stock -= n; chem.add(into, 'tablet', n);
  it.g.scale.setScalar(.35 + .65*it.stock/it.def.fizz);
  if (it.stock <= 0) vanish(it);
}
function balloons(b){
  if (!b.attached) {
    if (b === desk.held) return;
    // let go on or right by a bottle's neck, it stretches on: mouth over the neck, hanging off to the side
    const m = toWorld(b.body, 0, b.def.open.y, 0, {}), base = b.body.translation();
    for (const v of vessels()) {
      if (!v.def.neck || balloonOn(v) || uprightness(v) < .8) continue;
      const o = toWorld(v.body, 0, v.def.open.y, 0, _w);
      if (Math.min(Math.hypot(m.x - o.x, m.y - o.y, m.z - o.z), Math.hypot(base.x - o.x, base.y - o.y, base.z - o.z)) > .05) continue;
      attach(b, v); return;
    }
    return;
  }
  // gas in the bottle stretches the balloon until it stands up on its own
  if (Math.abs(b.inflate - (b.shapeAt || 0)) > .08) reshapeBalloon(b);
  seat(b, STEP);
}

// ---------- spilling and pouring ----------
let pourSnd = 0;
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
    desk.fluid.emit(p.x, p.y, p.z, a.x, a.y, a.z, chem.take(v.c, 1), v.body); Sound.tone(1300, {dur:.06, vol:.04, f2:900});
    return;
  }
  if (flow === 'shake') {
    // each shake sprinkles over the swing back toward the middle, not all at the far end
    if (v.shook) { v.shook = false; v.sprinkle = .12; Sound.hiss({dur:.06, vol:.07, type:'highpass', freq:3500}); }
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
  if ((pourSnd -= dt) <= 0) { pourSnd = .07; if (chem.liquidVol(out)) Sound.hiss({dur:.13, vol:.025 + rate*.0003, type:'bandpass', freq:1200 + Math.random()*700, q:.9}); else Sound.hiss({dur:.12, vol:.03, type:'highpass', freq:2500 + Math.random()*1500}); }
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

// ---------- chemistry in every container ----------
let fizzT = 0;
let roarT = 0;
function fizzSound(gas, rate){
  if (rate > 40 && (roarT -= .016) <= 0) { roarT = .22; Sound.hiss({dur:.35, vol:Math.min(.16, .04 + rate*.0007), type:'bandpass', freq:500 + Math.random()*400, q:.7}); }
  if ((fizzT -= .016) > 0) return; fizzT = .05; Sound.hiss({dur:.05 + Math.random()*.06, vol:Math.min(.09, .015 + gas*.2), type:'highpass', freq:4000 + Math.random()*3000});
}
function chemStep(v, dt){
  // liquid carries the fizz across a container much faster than it creeps through a dry pile
  const gas = spread(v, v.c, dt, v.def.ri, chem.liquidVol(v.c) > 5 ? .08 : .03, v.stir); v.stir = Math.max(0, v.stir - dt*3);
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
  if (!(gas > 0)) { v.head = Math.max(0, v.head - dt*.006); return; }
  v.stats.gas += gas;
  const rate = gas/dt; fizzSound(gas, rate);
  const b = balloonOn(v), lk = chem.look(v.c);
  if (b) b.inflate = Math.min(1.6, b.inflate + gas*.06);
  else if (!(chem.oilVol(v.c) > 5)) {
    // oil on top lets the gas through as bubbles instead of froth
    const soapy = (v.c.l.soap || 0) > .5, o = v.def.open, up = rot(v.body.rotation(), {x:0, y:1, z:0});
    v.head = Math.min(.025, v.head + gas*.0012*(soapy ? 2 : 1));
    v.foam += gas*(soapy ? 4.5 : 1.6)*(v.type === 'volcano' ? 1.5 : 1);
    const fc = chem.lerpCol(0xffffff, lk ? lk.col : 0xffffff, soapy ? .55 : .3);
    const squeeze = Math.min(3, Math.max(1, (v.def.ri/o.r)**2));
    // a wide-open top foams where the fizz is; a narrow mouth is the only way out, wherever it is
    const at = v.front && o.r > v.def.ri*.8 ? v.front : {x:0, z:0, r:o.r};
    v.foam = desk.fluid.gush(v.foam, rate, fc, v.body.linvel(), up, () => { const a = Math.random()*7, r = Math.random()*Math.min(at.r, o.r)*.8;
      return toWorld(v.body, at.x + Math.cos(a)*r, o.y + .004, at.z + Math.sin(a)*r, _w); }, squeeze);
    // a big rush of gas kicks the container about
    if (rate > 40 && v !== desk.held) { const k = Math.min(1, (rate - 40)/120)*.0006*dt*60; v.body.applyImpulse({x:(Math.random() - .5)*k, y:k*.6, z:(Math.random() - .5)*k}, true); }
  }
  if (chem.oilVol(v.c) > 5 && lk) { v.blobAcc = (v.blobAcc || 0) + gas*.9; while (v.blobAcc >= 1) { v.blobAcc -= 1; desk.fx.blob(v, lk.col); v.stats.blobs++; } }
  if (Math.random() < Math.min(1, rate*.02)) for (let i = 0; i < Math.min(6, 1 + rate*.08); i++) desk.fx.bubble(v, v.front);
}

// ---------- drawing ----------
function draw(it, dt){
  if (it.pop < 1) { it.pop += dt/.4; const p = clamp01(it.pop) - 1; it.g.scale.setScalar(it.pop <= 0 ? .001 : 1 + 2.7*p*p*p + 1.7*p*p); }
  else if (it.stock === undefined) it.g.scale.setScalar(1);
  const t = it.body.translation(), r = it.body.rotation();
  it.g.position.set(t.x, t.y, t.z); it.g.quaternion.set(r.x, r.y, r.z, r.w);
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
function clack(it){
  const vy = it.body.linvel().y;
  if (it.vy < -.45 && vy > -.1) { const k = Math.min(1, -it.vy/2); Sound.tone(820 + Math.random()*260, {type:'triangle', dur:.05, vol:.06*k}); Sound.tone(260, {dur:.05, vol:.04*k}); }
  it.vy = vy;
}

let acc = 0;
export function updateDesk(dt){
  if (!P.world || !desk.items.length) return;
  acc = Math.min(acc + dt, STEP*3);
  while (acc >= STEP) {
    acc -= STEP;
    const H = desk.held && !desk.held.gone ? desk.held : null;
    if (H) steer(H, STEP);
    for (const it of live()) {
      buoyancy(it);
      if (it.def.balloon) balloons(it);
      if (it.def.flow === 'shake') shaking(it);
      // small things dropped from the hand would fall a container's floor-thickness in one step and
      // pass straight through it (the engine's sweep misses thin, fast things), so they fall no faster
      if (it !== H && !isVessel(it) && it.def.r < .035) { const lv = it.body.linvel(); if (lv.y < -1.1) it.body.setLinvel({x:lv.x, y:-1.1, z:lv.z}, true); }
    }
    for (const m of live()) if (m.def.tool === 'magnet') magnetism(m);
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
    clack(it);
  }
  for (const v of vessels()) chemStep(v, dt);
  catchers = vessels().filter(v => !v.attached && uprightness(v) >= .35).map(v => ({v, seal:balloonOn(v)}));
  desk.fluid.step(dt);
  showAim();
  desk.fx.update(dt);
  desk.fluid.draw();
  for (const it of live()) draw(it, dt);
}

// ---------- what experiments can ask ----------
export const totalGas = () => vessels().reduce((s, v) => s + v.stats.gas, 0) + desk.fluid.gas();
// the tray or container a thing is sitting in, by id
export function restingIn(id){
  const it = find(id); if (!it) return null;
  const c = it.body.worldCom();
  for (const o of live()) {
    if (o === it) continue;
    const l = localOf(o, c);
    if (o.def.kind === 'tray' ? Math.abs(l.x) < o.def.w/2 && Math.abs(l.z) < o.def.d/2 && l.y > -.01 && l.y < .12 : isVessel(o) && within(o, l, .02)) return o.id;
  }
  return null;
}
