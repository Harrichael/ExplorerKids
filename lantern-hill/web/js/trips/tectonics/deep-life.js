// The animals of the deep sea floor, each as a little model with its own way of moving: tick(dt, t)
// every frame, with near set while the explorer is close by. Where they live is up to the place.

import * as THREE from 'three';
import { T, XF, add, fr, glowTex, grp, mergeGeos, meshOf, outline, sph } from '../../core/kit.js';

const glow = (col, s, parent, x = 0, y = 0, z = 0) => { const g = new THREE.Sprite(new THREE.SpriteMaterial({map:glowTex, color:col, transparent:true, depthWrite:false, blending:THREE.AdditiveBlending}));
  g.scale.set(s, s, 1); g.position.set(x, y, z); parent.add(g); return g; };

// blind and pale, with arms so hairy they look furry; they wave them over the vent's warm water
export function yetiCrab(parent, x, y, z, ry, s = 1){
  const g = grp(x, y, z, ry, parent), shell = T(0xf2ead8), fuzz = T(0xe6d49c), ph = fr(0, 6); g.scale.setScalar(s);
  const body = sph(.22, shell, 0, .17, 0, g, 12); body.scale.set(1, .6, 1.25); outline(body, 1.08);
  const legs = [];
  for (const sx of [-1, 1]) for (let k = 0; k < 3; k++) legs.push([new THREE.CylinderGeometry(.025, .018, .34, 5), XF(sx*.27, .1, -.14 + k*.13, 1, 1, 1, 0, 0, sx*1.1)]);
  meshOf(mergeGeos(legs), shell, g);
  const arms = [-1, 1].map(sx => { const a = grp(sx*.14, .2, .2, sx*.35, g);
    const parts = [[new THREE.CylinderGeometry(.04, .045, .36, 6), XF(0, 0, .18, 1, 1, 1, Math.PI/2)]];
    for (let k = 0; k < 9; k++) parts.push([new THREE.SphereGeometry(fr(.045, .07), 6, 5), XF(fr(-.05, .05), fr(-.05, .05), .06 + k*.04)]);
    meshOf(mergeGeos(parts), fuzz, a, .015);
    sph(.075, shell, 0, 0, .4, a, 8); return a; });
  return {g, tick(dt, t){ arms.forEach((a, i) => { a.rotation.x = Math.sin(t*1.4 + ph + i)*.45 - .2; }); }};
}

// a sea cucumber that walks: a chubby pink body on tube feet, with feelers waving on top
export function seaPig(parent, x, y, z){
  const g = grp(x, y, z, fr(0, 6), parent), skin = T(0xe88aa0, {emissive:0x50182a, emissiveIntensity:.2});
  const body = sph(.3, skin, 0, .22, 0, g, 14); body.scale.set(.8, .62, 1.45); outline(body, 1.06);
  const feet = [], feel = [];
  for (const sx of [-1, 1]) for (let k = 0; k < 5; k++) feet.push([new THREE.SphereGeometry(.065, 6, 5), XF(sx*.17, .05, -.32 + k*.16)]);
  meshOf(mergeGeos(feet), skin, g);
  for (const sx of [-1, 1]) for (const kz of [.18, .32]) feel.push([new THREE.ConeGeometry(.035, .24, 5), XF(sx*.08, .44, kz, 1, 1, 1, .5, 0, -sx*.3)]);
  const top = meshOf(mergeGeos(feel), skin, g);
  return {g, tick(dt, t){ body.scale.y = .62 + Math.sin(t*2.1 + x)*.03; top.rotation.x = Math.sin(t*1.7 + z)*.12; }};
}

// so pale you can almost see through it; only found for the first time in 2016
export function ghostOctopus(parent, x, y, z, ry){
  const g = grp(x, y, z, ry, parent), pale = T(0xe8e4f0, {emissive:0x6a78a0, emissiveIntensity:.3});
  const head = sph(.34, pale, 0, .5, -.06, g, 16); head.scale.set(1, 1.15, .95); head.rotation.x = -.35; outline(head, 1.05);
  for (const sx of [-1, 1]) { sph(.06, T(0x1a1320), sx*.2, .48, .24, g, 8); sph(.02, T(0xffffff), sx*.21, .5, .29, g, 6); }
  // eight arms curling out over the rock, each a chain of shrinking beads
  const arm = [];
  for (let i = 0; i < 8; i++) { const a = i/8*Math.PI*2 + .2;
    for (let k = 0; k < 6; k++) { const r = .14 + k*.13, curl = k*k*.03; arm.push([new THREE.SphereGeometry(.09 - k*.011, 7, 5), XF(Math.cos(a + curl)*r, .12 - k*.012, Math.sin(a + curl)*r, 1, .7, 1)]); } }
  const arms = meshOf(mergeGeos(arm), pale, g, .012);
  return {g, tick(dt, t){ head.scale.y = 1.15 + Math.sin(t*1.3)*.05; arms.rotation.y = Math.sin(t*.6)*.12; g.position.y = y + Math.max(0, Math.sin(t*.5))*.04; }};
}

// big-mouthed and dark, dangling a glowing lure from its forehead; it faces +x
export function anglerfish(parent, x, y, z, ry){
  const g = grp(x, y, z, ry, parent), dark = T(0x3a2c44);
  const body = sph(.45, dark, 0, 0, 0, g, 16); body.scale.set(1.1, .92, .85); outline(body, 1.05);
  const mouth = sph(.3, T(0x5a1424), .34, -.12, 0, g, 12); mouth.scale.set(.5, .55, .85);
  const teeth = [];
  for (let k = 0; k < 7; k++) { const a = (k/6 - .5)*1.9; for (const up of [-1, 1]) teeth.push([new THREE.ConeGeometry(.03, .12, 4), XF(.44, -.12 + up*.1, Math.sin(a)*.22, 1, 1, 1, 0, 0, up > 0 ? Math.PI : 0)]); }
  meshOf(mergeGeos(teeth), T(0xf4eee0), g);
  for (const sz of [-1, 1]) { sph(.07, T(0xf4eee0), .32, .2, sz*.22, g, 8); sph(.035, T(0x1a1320), .37, .21, sz*.24, g, 6); }
  const tail = add(new THREE.ConeGeometry(.28, .45, 5), dark, -.6, 0, 0, g); tail.rotation.z = Math.PI/2; tail.scale.z = .3; outline(tail, 1.05);
  const stalk = new THREE.CatmullRomCurve3([[.05, .38, 0], [.35, .85, 0], [.72, .78, 0], [.82, .6, 0]].map(p => new THREE.Vector3(...p)));
  add(new THREE.TubeGeometry(stalk, 12, .022, 5), dark, 0, 0, 0, g, false);
  const bulb = sph(.08, T(0xbff8ff, {emissive:0x8ff4ff, emissiveIntensity:1.2}), .82, .56, 0, g, 10), halo = glow(0x8ff4ff, 1.1, g, .82, .56, 0);
  return {g, tick(dt, t){ const p = .75 + Math.sin(t*2.6)*.25; halo.scale.set(1.2*p, 1.2*p, 1); halo.material.opacity = p;
    g.position.y = y + Math.sin(t*.9)*.12; g.rotation.y = ry + Math.sin(t*.4)*.25; tail.rotation.y = Math.sin(t*3)*.3; bulb.position.y = .56 + Math.sin(t*1.7)*.03; }};
}

// a deep red jelly with a ring of lights round its rim; poked, or just come too close to, it
// flashes them round and round, a burglar alarm that calls bigger animals to scare its attacker off
export function atolla(parent, x, y, z){
  const g = grp(x, y, z, 0, parent);
  const bell = add(new THREE.SphereGeometry(.6, 20, 10, 0, Math.PI*2, 0, Math.PI/2), T(0xb02a3e, {emissive:0x4a0812, emissiveIntensity:.6, transparent:true, opacity:.88, side:THREE.DoubleSide}), 0, 0, 0, g, false);
  bell.scale.y = .55;
  const groove = add(new THREE.TorusGeometry(.42, .05, 6, 24), T(0x6a1020), 0, .16, 0, g, false); groove.rotation.x = Math.PI/2;
  const lights = [], tent = [];
  for (let i = 0; i < 14; i++) { const a = i/14*Math.PI*2; lights.push(glow(0x5ad8ff, .32, g, Math.cos(a)*.6, -.02, Math.sin(a)*.6));
    tent.push([new THREE.CylinderGeometry(.012, .006, .55, 4), XF(Math.cos(a + .2)*.56, -.3, Math.sin(a + .2)*.56)]); }
  // one tentacle many times longer than the rest, the way Atolla has
  tent.push([new THREE.CylinderGeometry(.02, .006, 2.4, 5), XF(.3, -1.2, 0, 1, 1, 1, 0, 0, .15)]);
  const fringe = meshOf(mergeGeos(tent), T(0xd85060, {emissive:0x501018, emissiveIntensity:.5}), g);
  let alarm = 0;
  return {g, tick(dt, t, near){
    alarm = near ? Math.min(1, alarm + dt*2) : Math.max(0, alarm - dt*.6);
    lights.forEach((l, i) => { const on = alarm*Math.max(0, Math.sin(t*9 - i*.9)) + .12; l.material.opacity = on; l.scale.setScalar(.25 + on*.4); });
    const beat = Math.sin(t*1.8); bell.scale.set(1 + beat*.06, .55 - beat*.05, 1 + beat*.06); fringe.rotation.y = t*.2;
    g.position.y = y + Math.sin(t*.7)*.25; }};
}

// the bones of a whale that sank here long ago, with red bone-eating worms like little feathers
export function whaleFall(parent, x, z, ry, ground){
  const g = grp(x, 0, z, ry, parent), bone = [], plume = [], at = (lx, lz) => { const c = Math.cos(ry), s = Math.sin(ry); return ground(x + lx*c + lz*s, z - lx*s + lz*c); };
  for (let k = 0; k < 15; k++) { const lx = -3.6 + k*.46, y = at(lx, 0) + .14 - k*.004;
    bone.push([new THREE.CylinderGeometry(.16 - k*.006, .16 - k*.006, .3, 8), XF(lx, y, 0, 1, 1, 1, 0, 0, Math.PI/2)]);
    bone.push([new THREE.BoxGeometry(.08, .24, .12), XF(lx, y + .18, 0)]);
    // ribs on the first half, sprawled out as they fell
    if (k > 4 && k < 13 && k % 2) for (const sz of [-1, 1]) bone.push([new THREE.TorusGeometry(.95 - Math.abs(k - 8)*.06, .055, 6, 14, Math.PI*.7), XF(lx, y - .05, sz*.08, 1, 1, 1, 0, sz > 0 ? 0 : Math.PI, sz*.25 + Math.PI*.15)]);
    if (k % 3 === 0) for (let j = 0; j < 5; j++) plume.push([new THREE.SphereGeometry(.05, 5, 4), XF(lx + fr(-.12, .12), y + .14 + fr(0, .1), fr(-.14, .14), 1, 1.8, 1)]); }
  const hy = at(3.6, 0);
  bone.push([new THREE.SphereGeometry(.7, 14, 10), XF(3.5, hy + .28, 0, 1.6, .5, .9)]);
  for (const sz of [-1, 1]) bone.push([new THREE.CylinderGeometry(.09, .06, 2.3, 7), XF(5.1, hy + .12, sz*.4, 1, 1, 1, 0, -sz*.18, Math.PI/2)]);
  meshOf(mergeGeos(bone), T(0xe8dcc0), g, .03);
  const worms = meshOf(mergeGeos(plume), T(0xe03a48, {emissive:0x601018, emissiveIntensity:.5}), g);
  return {g, tick(dt, t){ worms.scale.y = 1 + Math.sin(t*2)*.04; }};
}

// a little glowing jelly, drifting along its own loop
export function glowJelly(parent, cx, cy, cz, r, col){
  const g = grp(cx, cy, cz, 0, parent), ph = fr(0, 6), sp = fr(.08, .16)*(fr(0, 1) < .5 ? -1 : 1);
  const bell = add(new THREE.SphereGeometry(.22, 12, 7, 0, Math.PI*2, 0, Math.PI/2), new THREE.MeshBasicMaterial({color:col, transparent:true, opacity:.5, depthWrite:false, blending:THREE.AdditiveBlending, side:THREE.DoubleSide}), 0, 0, 0, g, false);
  const halo = glow(col, .9, g, 0, .04, 0);
  return {g, tick(dt, t){ const a = ph + t*sp, beat = Math.sin(t*2.4 + ph);
    g.position.set(cx + Math.cos(a)*r, cy + Math.sin(t*.5 + ph)*.6 + beat*.05, cz + Math.sin(a)*r*.7);
    bell.scale.set(1 + beat*.12, 1 - beat*.15, 1 + beat*.12); halo.material.opacity = .55 + beat*.2; }};
}
