// The rift valley a mid-ocean ridge runs down: a wavy crack along its floor, rolling mud and
// pillow-lava hummocks either side, then a cliff up to a high ledge, and a taller cliff beyond.
// A ramp climbs to each ledge. Pillow mounds close the valley off at both ends. Everything is laid
// out by distance from the crack, so the floor, the plates' bands and the walls all bend with it.

import * as THREE from 'three';
import { T, XF, bAdd, bFlush, fr, grp, tex } from '../../core/kit.js';

export const crackX = z => 1.1*Math.sin(z*.15 + .4) + .4*Math.sin(z*.43 + 2.1);
// where the sub settles: kept flat, the rolls smoothed away
export const PAD = [9.2, 4.6];
export const LEDGE = 2.6;
const sm = (a, b, v) => { const k = Math.max(0, Math.min(1, (v - a)/(b - a))); return k*k*(3 - 2*k); };
// s is the side: -1 west of the crack, 1 east
export const wallAt = (z, s) => 15 + Math.sin(z*.21 + s*1.3) + .6*Math.sin(z*.53 + s*2.9);
export const ledgeAt = (z, s) => wallAt(z, s) + 6 + .9*Math.sin(z*.27 + s*2);
const RAMP = {'-1':4, '1':-9};
const rampW = (z, s) => Math.exp(-(((z - RAMP[s])/2.4)**2));
export const northAt = x => -24 + 1.6*Math.sin(x*.37 + .5), southAt = x => 17 + 1.3*Math.sin(x*.41 + 2);
// a spot on a ledge: f runs from 0 at its cliff edge to 1 at the wall behind it
export const ledgeX = (s, z, f) => crackX(z) + s*(wallAt(z, s) + .6 + f*(ledgeAt(z, s) - wallAt(z, s) - 1.2));
// gentle mounds of old pillow lava, walkable; [x, z, radius, height]
const HUMPS = [[-9, -8, 3, .9], [7.5, -10, 3.5, .8], [-8.5, 8, 2.8, .7], [-12, 0, 3, .8], [4, 13, 2.6, .7], [-5, -17, 3, .9], [10, -17, 2.4, .7], [13.5, 11, 2.5, .6], [ledgeX(-1, -6, .5), -6, 2.2, .5], [ledgeX(1, 2, .5), 2, 2.4, .5]];
// rock outcrops nobody gets past: [x, z, radius]
export const ROCKS = [[-10.5, -13, 1.8], [11.5, -21, 2], [-12.5, 12.5, 1.8], [7, 15.5, 1.5], [12.5, -6.5, 1.4], [-4.5, -21.5, 1.6], [-6, 14.5, 1.3], [ledgeX(1, -1, .45), -1, 1.4], [ledgeX(-1, 10, .5), 10, 1.3]];

export function ground(x, z){
  const d = x - crackX(z), a = Math.abs(d), s = d < 0 ? -1 : 1, e = a - wallAt(z, s), rw = rampW(z, s);
  let h = (.32*Math.sin(x*.33 + 1.3)*Math.sin(z*.29 + .4) + .2*Math.sin(x*.17 - z*.23 + 2))*sm(2.2, 6.5, a);
  for (const [hx, hz, r, hh] of HUMPS) { const q = ((x - hx)**2 + (z - hz)**2)/(r*r); if (q < 3) h += hh*Math.exp(-q*1.6); }
  h *= sm(2.6, 5, Math.hypot(x - PAD[0], z - PAD[1]));
  h += LEDGE*(sm(-.4, .4, e)*(1 - rw) + sm(-4.5, 1.2, e)*rw);
  h += 5*sm(-.4, .7, a - ledgeAt(z, s));
  return h + 4*Math.max(sm(-.5, .9, northAt(x) - z), sm(-.5, .9, z - southAt(x)));
}
// the valley floor, the ledges, and the ramps between; never into a cliff, a mound or an outcrop
export function walkable(x, z){
  if (z < northAt(x) + .9 || z > southAt(x) - .9) return false;
  const d = x - crackX(z), a = Math.abs(d), s = d < 0 ? -1 : 1, e = a - wallAt(z, s);
  if (a > ledgeAt(z, s) - .55) return false;
  if (e > -.45 && e < .5 && rampW(z, s) < .45) return false;
  return ROCKS.every(([rx, rz, r]) => Math.hypot(x - rx, z - rz) > r);
}
export const onLedge = (x, z) => { const d = x - crackX(z); return Math.abs(d) > wallAt(z, Math.sign(d) || 1) + .2; };

// the floor, its cliffs and mounds, and the outcrops, built into world w
export function buildRift(w){
  const W = 100, D = 80, Z = -4, geo = new THREE.PlaneGeometry(W, D, 200, 160); geo.rotateX(-Math.PI/2); geo.translate(0, 0, Z);
  const p = geo.attributes.position;
  for (let i = 0; i < p.count; i++) p.setY(i, ground(p.getX(i), p.getZ(i)));
  geo.computeVertexNormals();
  // mud on the flat, dark rock on the steep, black basalt by the crack where the rock is new
  const cols = new Float32Array(p.count*3), n = geo.attributes.normal, mud = new THREE.Color(0x8a7c62), old = new THREE.Color(0x6e6a6a), cliff = new THREE.Color(0x3a3e52), black = new THREE.Color(0x2a2430), c = new THREE.Color();
  for (let i = 0; i < p.count; i++) { const x = p.getX(i), z = p.getZ(i), a = Math.abs(x - crackX(z));
    c.copy(mud).lerp(old, sm(LEDGE*.6, LEDGE + 1, p.getY(i))).lerp(black, 1 - sm(.6, 4, a)).lerp(cliff, sm(.9, .55, n.getY(i)));
    cols.set([c.r, c.g, c.b], i*3); }
  geo.setAttribute('color', new THREE.BufferAttribute(cols, 3));
  const floorTex = tex(256, 256, (g, cw, ch) => { g.fillStyle = '#d8d0c4'; g.fillRect(0, 0, cw, ch);
    for (let i = 0; i < 600; i++) { g.fillStyle = ['#e8e0d4', '#c4bcb0', '#f0eadc', '#b8b0a4'][i % 4]; g.beginPath(); g.arc(Math.random()*cw, Math.random()*ch, 1 + Math.random()*4, 0, 7); g.fill(); } }, 1, 1);
  // world-sized UVs, so the speckle keeps its size on the cliffs as on the flat
  const uv = geo.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, p.getX(i)/6, p.getZ(i)/6);
  const floor = new THREE.Mesh(geo, T(0xffffff, {map:floorTex, vertexColors:true})); floor.receiveShadow = true; w.scene.add(floor);

  const g = grp(), rock = [0x2c3242, 0x363a4c, 0x30343f], pillow = [0x1e1a24, 0x26222c];
  const stone = (x, z, sz, tall, col, sink = .3) => bAdd(col, new THREE.DodecahedronGeometry(1, 0), XF(x, ground(x, z) + sz*(tall - sink), z, sz*fr(.8, 1.1), sz*tall, sz*fr(.8, 1.1), fr(-.2, .2), fr(0, 6), fr(-.2, .2)), {ink:.06});
  const lump = (x, z, r, col, squash = .6, sink = .35) => bAdd(col, new THREE.SphereGeometry(1, 9, 7), XF(x, ground(x, z) + r*squash*(1 - sink*2), z, r*fr(1, 1.3), r*squash, r*fr(1, 1.4), 0, fr(0, 6), 0), {ink:.04});
  for (const s of [-1, 1]) for (let z = -27; z < 21; z += fr(.9, 1.4)) {
    // the first cliff: tall broken columns along its face, but none on the ramp
    const rw = rampW(z, s);
    if (rw < .3) { const a = wallAt(z, s) + fr(-.25, .2), x = crackX(z) + s*a, sz = fr(.6, 1.1);
      stone(x, z, sz, fr(1.5, 2.3), rock[Math.floor(fr(0, 3))], .2);
      if (fr(0, 1) < .5) stone(x - s*fr(.6, 1.1), z + fr(-.4, .4), fr(.35, .6), fr(.8, 1.2), rock[Math.floor(fr(0, 3))]); }
    else if (rw < .6) stone(crackX(z) + s*(wallAt(z, s) - fr(1, 2.5)), z, fr(.4, .7), fr(.9, 1.4), rock[0]);
    // the far wall: bigger, rising out of the ledge
    const b = ledgeAt(z, s) + fr(.2, .7), bx = crackX(z) + s*b;
    stone(bx, z, fr(1.1, 1.8), fr(1.2, 2), rock[Math.floor(fr(0, 3))], .25);
  }
  // the pillow mounds that close the valley off, north and south
  for (let x = -38; x < 38; x += fr(1, 1.6)) {
    for (const [zf, sd] of [[northAt, -1], [southAt, 1]]) {
      const z = zf(x) + sd*fr(-.2, 1.4);
      lump(x, z, fr(.7, 1.4), pillow[Math.floor(fr(0, 2))], .62, .2);
      if (fr(0, 1) < .6) lump(x + fr(-.5, .5), z + sd*fr(1, 2.4), fr(.9, 1.6), pillow[0], .6, .25);
      if (fr(0, 1) < .3) stone(x, z + sd*fr(.5, 2), fr(.6, 1), fr(1.6, 2.4), rock[0], .2);
    }
  }
  // the hummocks, crusted with flattened old pillows, half sunk in mud
  for (const [hx, hz, r] of HUMPS) for (let k = 0; k < 9; k++) { const a = fr(0, 7), q = Math.sqrt(fr(0, 1))*r*.8;
    lump(hx + Math.cos(a)*q, hz + Math.sin(a)*q, fr(.25, .45), pillow[k % 2], .4, .45); }
  // outcrops: heaps of pillows round a column or two of broken rock
  for (const [rx, rz, r] of ROCKS) {
    for (let k = 0; k < 2 + Math.round(r); k++) { const a = fr(0, 7), q = fr(0, r*.4); stone(rx + Math.cos(a)*q, rz + Math.sin(a)*q, fr(.55, .8)*r*.6, fr(1.4, 2.4), rock[k % 3], .2); }
    for (let k = 0; k < 7; k++) { const a = k/7*7 + fr(0, .5), q = r*fr(.65, .95); lump(rx + Math.cos(a)*q, rz + Math.sin(a)*q, fr(.35, .6), pillow[k % 2], .6, .3); }
  }
  bFlush(g);
  return floor;
}
