// The animals of the hills and mountains, each as a little model with its own way of moving: tick(dt, t)
// every frame. Where they live, and what they do when the explorer comes near, is up to the place.

import * as THREE from 'three';
import { T, XF, add, grp, mergeGeos, meshOf, outline, shade, sph } from '../../core/kit.js';

// its own dice, so the places' layouts, which share the kit's seeded ones, stay as they are
let seed = 29; const rn = (a, b) => a + (seed = (seed*16807) % 2147483647)/2147483647*(b - a);

// a bird of any size, facing +z: a body, a head, a beak, and two wings hinged at the shoulders; flap(k)
// takes -1 (wings down) to 1 (up), and fold(k) tucks them in for perching
function bird(parent, {body, belly = body, wing = body, beak = 0xe8b040, tail = body, s = 1}){
  const g = grp(0, 0, 0, 0, parent); g.scale.setScalar(s);
  const b = sph(.18, T(body), 0, 0, 0, g, 10); b.scale.set(.8, .75, 1.5); outline(b, 1.1);
  sph(.15, T(belly), 0, -.04, .06, g, 8).scale.set(.75, .6, 1.2);
  const head = sph(.11, T(body), 0, .07, .27, g, 10); outline(head, 1.12);
  for (const sx of [-1, 1]) sph(.022, T(0x1a1320), sx*.07, .1, .33, g, 6);
  add(new THREE.ConeGeometry(.035, .12, 5), T(beak), 0, .05, .4, g, false).rotation.x = Math.PI/2;
  const tl = add(new THREE.BoxGeometry(.16, .025, .2), T(tail), 0, .02, -.3, g, false); tl.rotation.x = -.15;
  const wings = [-1, 1].map(sx => { const p = grp(sx*.1, .06, .02, 0, g);
    const m = add(new THREE.BoxGeometry(.5, .03, .24), T(wing), sx*.25, 0, 0, p, false); outline(m, 1.08);
    return p; });
  return {g, head, tail:tl,
    flap: k => wings.forEach((p, i) => { p.rotation.z = (i ? 1 : -1)*k*.75; p.visible = true; }),
    fold: () => wings.forEach(p => { p.visible = false; })};
}

// big and dark, wheeling round on the warm air on wings it hardly ever flaps
export function soarer(parent, cx, cy, cz, r, {s = 2.6, body = 0x5a3a26, belly = 0x8a5e3a, tail = 0x6a4430, sp = .16} = {}){
  const b = bird(parent, {body, belly, wing:shade(body, .82), tail, s, beak:0xe8c040}), ph = rn(0, 6);
  return {...b, tick(dt, t){ const a = ph + t*sp;
    b.g.position.set(cx + Math.cos(a)*r, cy + Math.sin(t*.3 + ph)*1.5, cz + Math.sin(a)*r*.8);
    b.g.rotation.set(0, -a + (sp > 0 ? 0 : Math.PI), (sp > 0 ? -1 : 1)*.35);
    // a few slow beats now and then, the rest a glide
    b.flap(.12 + (Math.sin(t*.5 + ph) > .8 ? Math.sin(t*5)*.5 : 0)); }};
}

// a little flock darting about over the grass, each bird on its own loop
export function flock(parent, cx, cy, cz, n = 5, {r = 7, body = 0x34406b, belly = 0xf2e6d0} = {}){
  const birds = []; for (let i = 0; i < n; i++) birds.push({b:bird(parent, {body, belly, s:.55, beak:0x2a2020}), ph:rn(0, 6), sp:rn(.35, .6)*(i % 2 ? 1 : -1), rr:r*rn(.5, 1)});
  const p = new THREE.Vector3();
  return {tick(dt, t){ for (const q of birds) { const a = q.ph + t*q.sp, x = cx + Math.cos(a)*q.rr + Math.sin(a*2.3)*1.5, z = cz + Math.sin(a)*q.rr*.7, y = cy + Math.sin(a*3.1)*.8;
    p.set(x - q.b.g.position.x, 0, z - q.b.g.position.z); q.b.g.position.set(x, y, z); if (p.lengthSq() > 1e-6) q.b.g.rotation.y = Math.atan2(p.x, p.z);
    q.b.flap(Math.sin(t*22 + q.ph)); } }};
}

// fluttering over the flowers, never far from home
export function butterflies(parent, spots, ground, cols = [0xf2963a, 0xffd36b, 0x8fd0f0, 0xf6efe0]){
  const wingGeo = new THREE.CircleGeometry(.11, 10); wingGeo.translate(.1, .02, 0);
  const all = spots.map(([x, z], i) => { const g = grp(x, ground(x, z) + .8, z, 0, parent), mat = T(cols[i % cols.length], {side:THREE.DoubleSide});
    add(new THREE.CylinderGeometry(.015, .015, .14, 5), T(0x2a2020), 0, 0, 0, g, false).rotation.x = Math.PI/2;
    const wings = [-1, 1].map(sx => { const p = grp(0, 0, 0, 0, g); const m = add(wingGeo, mat, 0, 0, 0, p, false); m.rotation.x = -Math.PI/2; m.scale.x = sx; return p; });
    return {g, wings, x, z, ph:rn(0, 6), sp:rn(.4, .8)}; });
  return {tick(dt, t){ for (const b of all) { const a = b.ph + t*b.sp, x = b.x + Math.sin(a)*1.6 + Math.sin(a*2.7)*.5, z = b.z + Math.cos(a*1.3)*1.4;
    const dx = x - b.g.position.x, dz = z - b.g.position.z; b.g.position.set(x, ground(x, z) + .6 + .35*Math.abs(Math.sin(t*2 + b.ph)), z);
    if (dx || dz) b.g.rotation.y = Math.atan2(dx, dz);
    const f = .2 + 1.1*Math.abs(Math.sin(t*13 + b.ph)); b.wings[0].rotation.z = f; b.wings[1].rotation.z = -f; } }};
}

// shaggy and white, with a beard and short black horns; it faces +z
export function mountainGoat(parent, x, y, z, ry){
  const g = grp(x, y, z, ry, parent), wool = T(0xf4efe4), dark = T(0x2a2224);
  const body = sph(.42, wool, 0, .62, 0, g, 14); body.scale.set(.75, .78, 1.25); outline(body, 1.06);
  const legs = []; for (const [lx, lz] of [[-.17, .32], [.17, .32], [-.17, -.3], [.17, -.3]]) legs.push([new THREE.CylinderGeometry(.06, .05, .46, 6), XF(lx, .23, lz)], [new THREE.CylinderGeometry(.055, .055, .07, 6), XF(lx, .02, lz)]);
  meshOf(mergeGeos(legs.filter((_, i) => i % 2 === 0)), wool, g, .02);
  meshOf(mergeGeos(legs.filter((_, i) => i % 2 === 1)), dark, g);
  const head = grp(0, .92, .5, 0, g);
  const skull = sph(.17, wool, 0, 0, .06, head, 10); skull.scale.set(.85, .9, 1.3); outline(skull, 1.08);
  sph(.1, wool, 0, -.17, .1, head, 8).scale.set(.7, 1.3, .8);
  add(new THREE.ConeGeometry(.06, .2, 6), wool, 0, -.3, .16, head, false).rotation.x = Math.PI;
  for (const sx of [-1, 1]) { add(new THREE.ConeGeometry(.03, .22, 5), dark, sx*.07, .17, -.02, head, false).rotation.x = -.45; sph(.025, dark, sx*.1, .04, .2, head, 6); }
  return {g, tick(dt, t){ head.rotation.x = .15 + Math.max(0, Math.sin(t*.7))*.35; head.rotation.y = Math.sin(t*.31)*.4; skull.position.y = Math.sin(t*9)*.006; }};
}

// a chubby, golden-brown burrower that pops up on its haunches to look about; up(k) runs 0 hidden to 1 sat up
export function marmot(parent, x, y, z, ry){
  const g = grp(x, y, z, ry, parent), fur = T(0xa8784a), pale = T(0xe0c49a), body = grp(0, 0, 0, 0, g);
  const torso = sph(.24, fur, 0, .26, 0, body, 12); torso.scale.set(.9, 1.25, .85); outline(torso, 1.07);
  sph(.17, pale, 0, .22, .1, body, 10).scale.set(.85, 1.2, .6);
  const head = sph(.15, fur, 0, .6, .04, body, 10); outline(head, 1.08);
  sph(.08, pale, 0, .56, .16, body, 8).scale.set(1, .7, .8);
  for (const sx of [-1, 1]) { sph(.022, T(0x1a1320), sx*.07, .64, .16, body, 6); sph(.04, fur, sx*.1, .73, 0, body, 6); add(new THREE.CylinderGeometry(.03, .025, .14, 5), fur, sx*.11, .32, .17, body, false).rotation.x = -.6; }
  const mouth = sph(.016, T(0x1a1320), 0, .54, .21, body, 6);
  let k = 0;
  return {g, get up(){ return k; }, set up(v){ k = v; body.position.y = -.75*(1 - v); body.visible = v > .02; },
    tick(dt, t, whistling){ head.rotation.y = Math.sin(t*.8)*.5*(1 - (whistling ? 1 : 0)); mouth.scale.setScalar(whistling && Math.sin(t*18) > 0 ? 2.2 : 1); }};
}

// grey-brown and speckled, with a bushy tail; up(k) as the marmot's
export function groundSquirrel(parent, x, y, z, ry){
  const g = grp(x, y, z, ry, parent), fur = T(0x8a7462), body = grp(0, 0, 0, 0, g);
  const torso = sph(.13, fur, 0, .17, 0, body, 10); torso.scale.set(.85, 1.35, .8); outline(torso, 1.08);
  sph(.09, T(0xd8c4a4), 0, .15, .06, body, 8).scale.set(.8, 1.2, .5);
  const head = sph(.09, fur, 0, .38, .03, body, 10); outline(head, 1.1);
  for (const sx of [-1, 1]) sph(.016, T(0x1a1320), sx*.045, .41, .1, body, 6);
  const tail = []; for (let k = 0; k < 5; k++) tail.push([new THREE.SphereGeometry(.07 + k*.008, 7, 5), XF(0, .06 + k*.07, -.14 - Math.sin(k*.5)*.08)]);
  const tl = meshOf(mergeGeos(tail), T(0x9a8270), body, .015);
  let k = 0, flag = 0;
  return {g, get up(){ return k; }, set up(v){ k = v; body.position.y = -.5*(1 - v); body.visible = v > .02; },
    // flag 0 to 1: the tail waving hard, the way they warn off a snake
    set flag(v){ flag = v; },
    tick(dt, t){ tl.rotation.x = Math.sin(t*(3 + flag*14))*(.12 + flag*.35); head.rotation.y = Math.sin(t*1.3 + x)*.6; }};
}

// a mallard paddling round a pond; the drake with his green head, the hen all speckled brown
export function duck(parent, drake){
  const g = grp(0, 0, 0, 0, parent), brown = T(0x9a7458);
  const body = sph(.18, drake ? T(0xd8d0c4) : brown, 0, .06, 0, g, 12); body.scale.set(.85, .6, 1.3); outline(body, 1.08);
  const tail = add(new THREE.ConeGeometry(.08, .14, 5), drake ? T(0x2a2224) : brown, 0, .1, -.24, g, false); tail.rotation.x = -2;
  const head = sph(.1, drake ? T(0x2f7a4a, {emissive:0x0e3020, emissiveIntensity:.3}) : brown, 0, .26, .2, g, 10); outline(head, 1.1);
  if (drake) { const ring = add(new THREE.TorusGeometry(.065, .014, 4, 12), T(0xf6efe0), 0, .17, .19, g, false); ring.rotation.x = Math.PI/2; }
  add(new THREE.BoxGeometry(.07, .025, .12), T(0xf2a23a), 0, .24, .32, g, false);
  for (const sx of [-1, 1]) sph(.018, T(0x1a1320), sx*.07, .29, .26, g, 6);
  return {g, head};
}

// perched up on a branch with its wings folded, until it takes off; it faces +z
export function hawk(parent){
  const b = bird(parent, {body:0x7a5034, belly:0xf0e0c4, wing:0x6a4430, tail:0xc0583a, s:1.5, beak:0x3a3030});
  b.tail.scale.set(2, 1.4, 2.2); b.tail.position.set(0, -.04, -.42); b.tail.rotation.x = .35;
  return b;
}
