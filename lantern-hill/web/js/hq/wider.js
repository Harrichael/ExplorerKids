// The wider world: hills, forest, stream, Lantern Hill, windmill, village and meadow.

import * as THREE from 'three';
import { C, LEAF, T, XF, add, bAdd, barkGeo, box, cyl, fr, frand, glowTex, grp, mergeGeos, meshOf, outline, rand, rr, sph, tex } from '../core/kit.js';
import { boughGeo } from './garden.js';
import { LH, MEAD, PLAY, VIL, WM, hAt, streamZ } from './ground.js';
import { daylight } from './daylight.js';
import { hqAnims, scene } from './scene.js';

const PALETTES = [
  [LEAF.dk, LEAF.md, LEAF.lt], [LEAF.dk, LEAF.md, LEAF.lt], [0x2a4f3a, 0x3a6a48, 0x58904f],
  [0x7a3a2a, 0xa4552f, 0xc98a3e], [0x6f5a2a, 0x9a7a34, 0xc8a64c], [0x84466a, 0xb46e8e, 0xe0a6be], [0x29504c, 0x36655e, 0x52897a]
];
const pickPal = () => { const r = frand(); return r < .66 ? PALETTES[r < .33 ? 0 : 2] : r < .78 ? PALETTES[3] : r < .87 ? PALETTES[4] : r < .94 ? PALETTES[5] : PALETTES[6]; };
const distPlay = (x, z) => Math.hypot(Math.max(PLAY.x0 - x, 0, x - PLAY.x1), Math.max(PLAY.z0 - z, 0, z - PLAY.z1));
// batched round tree; hi = near the garden (more puffs, tufts, casts shadow)
function bRound(x, z, s, pal){
  const y0 = hAt(x, z) - .05, hi = distPlay(x, z) < 9, sg = hi ? [12, 9] : [9, 7], sh = hi;
  pal = pal || pickPal();
  const top = 2.15*s, bx = fr(-.25, .25)*s, bz = fr(-.2, .2)*s;
  for (const [g, m] of barkGeo([[0, 0, 0], [bx*.3, .7*s, bz*.2], [bx*.8, 1.4*s, bz*.6], [bx, top, bz]], .27*s, .15*s)) bAdd(C.woodDk, g, new THREE.Matrix4().makeTranslation(x, y0, z).multiply(m), {ink:.03*s, shadow:sh});
  bAdd(C.woodDk, new THREE.ConeGeometry(.5*s, .45*s, 10, 1, true), XF(x, y0 + .2*s, z), {ink:.03*s, shadow:sh});
  const cx = x + bx, cy = y0 + top + .55*s, cz = z + bz, n = hi ? 6 : 5, ph = fr(0, 6);
  const puffs = [[cx, cy, cz, .95*s, 1]];
  for (let i = 0; i < n; i++) { const a = ph + i/n*Math.PI*2; puffs.push([cx + Math.cos(a)*.85*s, cy - .25*s + fr(-.1, .12)*s, cz + Math.sin(a)*.8*s, fr(.55, .68)*s, Math.sin(a) < -.2 ? 0 : 1]); }
  for (let i = 0; i < (hi ? 3 : 2); i++) { const a = ph + i*2.1 + .5; puffs.push([cx + Math.cos(a)*.45*s, cy + .55*s, cz + Math.sin(a)*.4*s, fr(.45, .55)*s, 2]); }
  for (const [px, py, pz, r, t] of puffs) {
    bAdd(pal[t], new THREE.SphereGeometry(r, sg[0], sg[1]), XF(px, py, pz, 1, fr(.82, .95), 1, 0, fr(0, 6), 0), {ink:.045*s, shadow:sh});
    if (hi) { const a = fr(0, 6.28), el = fr(-.1, .8); bAdd(pal[t], new THREE.SphereGeometry(r*.38, 8, 6), XF(px + Math.cos(a)*Math.cos(el)*r*.9, py + Math.sin(el)*r*.85, pz + Math.sin(a)*Math.cos(el)*r*.9), {ink:.045*s, shadow:sh}); }
  }
}
function bPine(x, z, s){
  const y0 = hAt(x, z) - .05, hi = distPlay(x, z) < 9, sh = hi, lean = fr(-.06, .06), cols = frand() < .2 ? [0x23413a, 0x2f5548] : [0x2a4a33, 0x35593c];
  bAdd(C.woodDk, new THREE.CylinderGeometry(.12*s, .24*s, 1.3*s, 8), XF(x, y0 + .65*s, z), {ink:.03*s, shadow:sh});
  for (let i = 0; i < 4; i++) {
    const t = i/3, r = (1.25 - t*.75)*s, h = (1.25 - t*.25)*s, y = (1.15 + i*.72)*s;
    bAdd(cols[i%2], boughGeo(r, h, hi ? 28 : 14, hi ? 4 : 2), XF(x + lean*i*s, y0 + y + h*.35, z, 1, 1, 1, 0, fr(0, 6), lean), {ink:.04*s, shadow:sh});
  }
}
function bRock(x, z, r, sink = .35){
  const y = hAt(x, z), col = [0x7d7486, 0x8a8090, 0x6f6678][Math.floor(frand()*3)];
  bAdd(col, new THREE.SphereGeometry(r, 10, 7), XF(x, y + r*(.5 - sink), z, fr(1, 1.5), fr(.55, .8), fr(.9, 1.3), 0, fr(0, 6), fr(-.15, .15)), {ink:.035});
  if (frand() < .6) bAdd(C.moss, new THREE.SphereGeometry(r*.75, 9, 5, 0, Math.PI*2, 0, Math.PI/2), XF(x + fr(-.1, .1)*r, y + r*(.75 - sink), z, 1.2, .35, 1.1, 0, fr(0, 6), 0));
}
export function grassTuft(x, z, y, s = 1, col){
  const c = col || [0x4e7a4e, 0x5b8a52, 0x46704a][Math.floor(frand()*3)];
  for (let k = 0; k < 3; k++) bAdd(c, new THREE.ConeGeometry(.045*s, fr(.3, .5)*s, 3), XF(x + fr(-.08, .08)*s, y + .16*s, z + fr(-.08, .08)*s, 1, 1, 1, fr(-.35, .35), 0, fr(-.35, .35)));
}
const FLOWER_COLS = [0xd36a8f, 0xe9d9b8, 0xd9a441, 0x8f7ad6, 0xe07a5a, 0xf0c8d8];
export function flower(x, z, y, s = 1, col){
  col = col || FLOWER_COLS[Math.floor(frand()*FLOWER_COLS.length)];
  const h = fr(.28, .5)*s;
  bAdd(C.moss, new THREE.CylinderGeometry(.012*s, .015*s, h, 4), XF(x, y + h/2, z));
  bAdd(col, new THREE.SphereGeometry(.07*s, 8, 5), XF(x, y + h + .02*s, z, 1.25, .45, 1.25));
  bAdd(0xf2d27a, new THREE.SphereGeometry(.03*s, 6, 4), XF(x, y + h + .045*s, z));
  if (frand() < .4) bAdd(C.moss, new THREE.SphereGeometry(.05*s, 6, 4), XF(x + .04*s, y + h*.4, z, 1.6, .3, .8, 0, fr(0, 6), .4));
}
// a flat ribbon that hugs the ground along a curve (paths, the stream)
export function ribbonGeo(pts, width, yOff, follow = true, segs = 120){
  const curve = new THREE.CatmullRomCurve3(pts.map(([x, z]) => new THREE.Vector3(x, 0, z)));
  const P = curve.getSpacedPoints(segs), pos = [], uv = [], idx = [];
  let acc = 0;
  for (let i = 0; i <= segs; i++) {
    const p = P[i], q = P[Math.min(segs, i + 1)], o = P[Math.max(0, i - 1)];
    const tx = q.x - o.x, tz = q.z - o.z, l = Math.hypot(tx, tz) || 1, nx = -tz/l, nz = tx/l;
    const w = width * (1 + .12*Math.sin(i*.7));
    if (i) acc += Math.hypot(p.x - P[i-1].x, p.z - P[i-1].z);
    for (const sd of [-1, 1]) { const x = p.x + nx*w/2*sd, z = p.z + nz*w/2*sd; pos.push(x, (follow ? hAt(x, z) : 0) + yOff, z); uv.push(sd < 0 ? 0 : 1, acc/width); }
    if (i < segs) { const a = i*2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
  }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.setIndex(idx); g.computeVertexNormals();
  return {geo:g, curve, pts:P};
}
const haloMat = new THREE.SpriteMaterial({map:glowTex, color:0xffc870, transparent:true, depthWrite:false, blending:THREE.AdditiveBlending});
function halo(x, y, z, s){ const sp = new THREE.Sprite(haloMat); sp.position.set(x, y, z); sp.scale.set(s, s, 1); scene.add(sp); return sp; }
const lanternGlow = T(0xffd27a, {emissive:0xffb347, emissiveIntensity:1.3});
const winGlow = T(0xffd27a, {emissive:0xffaa44, emissiveIntensity:1.15});

// ----- the stream, with banks of rocks and reeds -----
const streamPts = []; for (let x = -55; x <= 72; x += 4) streamPts.push([x, streamZ(x)]);
const waterTex = tex(128, 128, (g, w, h) => { g.fillStyle = '#35618a'; g.fillRect(0, 0, w, h);
  g.strokeStyle = 'rgba(190,225,255,.35)'; g.lineWidth = 3; for (let i = 0; i < 9; i++) { g.beginPath(); const y = rand()*h, x = rand()*w; g.moveTo(x, y); g.quadraticCurveTo(x + 14, y - 6, x + 30, y); g.stroke(); } }, 1, 1);
waterTex.wrapS = waterTex.wrapT = THREE.RepeatWrapping;
const stream = ribbonGeo(streamPts, 3.0, -.12, false, 220);
const streamMesh = new THREE.Mesh(stream.geo, T(0xffffff, {map:waterTex, emissive:0x1b3252, emissiveIntensity:.45})); scene.add(streamMesh);
hqAnims.push((dt, t) => { waterTex.offset.y = -t * .12; });
for (let i = 0; i < 70; i++) { const p = stream.pts[Math.floor(frand()*stream.pts.length)], sd = frand() < .5 ? -1 : 1, o = fr(1.4, 2.3);
  const x = p.x + fr(-.6, .6), z = p.z + sd*o; if (distPlay(x, z) < 1) continue;
  if (frand() < .45) bRock(x, z, fr(.25, .6), .45); else for (let k = 0; k < 3; k++) grassTuft(x + fr(-.3, .3), z + fr(-.3, .3), hAt(x, z), 1.6, 0x55804a); }

// ----- paths: from the cottage's back, over a little bridge and up Lantern Hill -----
const hillPath = [[5.2, -11.6], [5.6, -13.5], [5, streamZ(5)], [4.6, -19.5], [5.4, -23]];
for (let i = 1; i <= 14; i++) { const t = i/14, r = 14*(1 - t) + 1.2, a = t*4.6; hillPath.push([LH.x + r*Math.sin(a), LH.z + r*Math.cos(a)]); }
const dirtTex = tex(128, 128, (g, w, h) => { g.fillStyle = '#8a6748'; g.fillRect(0, 0, w, h); for (let i = 0; i < 160; i++) { g.fillStyle = ['#7a5a3e', '#977352', '#6e5038'][i%3]; g.beginPath(); g.arc(rand()*w, rand()*h, rr(1, 3.5), 0, 7); g.fill(); } }, 1, 1);
dirtTex.wrapS = dirtTex.wrapT = THREE.RepeatWrapping;
export const dirtMat = T(0xffffff, {map:dirtTex});
const hp = ribbonGeo(hillPath, 1.3, .14, true, 200);
const hpMesh = new THREE.Mesh(hp.geo, dirtMat); hpMesh.receiveShadow = true; scene.add(hpMesh);
export const nearPath = (x, z, pts, r) => pts.some(p => (p.x - x)**2 + (p.z - z)**2 < r*r);
// arched wooden bridge over the stream
{ const bz = streamZ(5), br = grp(5, 0, bz, Math.PI/2 + .05);
  for (let i = 0; i < 9; i++) { const t = (i - 4)/4, y = .35 + (1 - t*t)*.45; const pl = box(.42, .1, 1.5, T(i%2 ? C.woodLt : C.wood), t*2.1, y, 0, br); pl.rotation.z = -t*.38; outline(pl, 1.04); }
  for (const sd of [-1, 1]) { for (let i = 0; i < 5; i++) { const t = (i - 2)/2, y = .35 + (1 - t*t)*.45; cyl(.05, .05, .8, T(C.woodDk), t*2.1, y + .4, sd*.72, br, 6); }
    const rail = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3([-2.1, -1.05, 0, 1.05, 2.1].map(x => { const t = x/2.1; return new THREE.Vector3(x, .35 + (1 - t*t)*.45 + .8, sd*.72); })), 16, .045, 6), T(C.woodDk)); br.add(rail); } }
// lanterns along the hill path, brighter toward the top
const lanternMeshes = [];
for (let i = 4, k = 0; i < hp.pts.length; i += 9, k++) {
  const p = hp.pts[i], q = hp.pts[Math.min(hp.pts.length - 1, i + 1)], tx = q.x - p.x, tz = q.z - p.z, l = Math.hypot(tx, tz) || 1, sd = k%2 ? 1 : -1;
  const x = p.x - tz/l*1.05*sd, z = p.z + tx/l*1.05*sd, y = hAt(x, z);
  bAdd(C.ink, new THREE.CylinderGeometry(.045, .06, 1.5, 6), XF(x, y + .75, z));
  bAdd(C.ink, new THREE.ConeGeometry(.2, .14, 4), XF(x, y + 1.78, z, 1, 1, 1, 0, Math.PI/4, 0));
  const lm = box(.22, .28, .22, lanternGlow, x, y + 1.58, z, null, false); lanternMeshes.push(lm);
  halo(x, y + 1.58, z, 1.5);
}
// the Great Lantern on the summit
{ const top = hp.pts[hp.pts.length - 1], x = top.x, z = top.z, y = hAt(x, z);
  const g = grp(x, y, z);
  cyl(1.4, 1.7, .5, T(C.stone), 0, .1, 0, g, 14); cyl(.12, .16, 3.4, T(C.ink), 0, 1.9, 0, g, 8);
  for (const sd of [-1, 1]) { const arm = box(1.2, .07, .07, T(C.ink), sd*.55, 3.35, 0, g); arm.rotation.z = sd*.15; }
  const big = box(.7, .9, .7, lanternGlow, 0, 3.0, 0, g, false); outline(big, 1.06); add(new THREE.ConeGeometry(.62, .45, 4), T(C.ink), 0, 3.66, 0, g).rotation.y = Math.PI/4;
  for (const sd of [-1, 1]) { box(.3, .38, .3, lanternGlow, sd*1.1, 2.9, 0, g, false); }
  halo(x, y + 3.0, z, 6); halo(x - 1.1, y + 2.9, z, 2); halo(x + 1.1, y + 2.9, z, 2);
  lanternMeshes.push(big);
  const bench = grp(1.8, .1, 1.2, -.6, g); box(1.3, .08, .4, T(C.wood), 0, .45, 0, bench); for (const sx of [-.55, .55]) box(.08, .45, .35, T(C.woodDk), sx, .22, 0, bench);
}
hqAnims.push((dt, t) => { const lit = .15 + .85*(1 - daylight.day);
  lanternGlow.emissiveIntensity = (1.25 + Math.sin(t*5.3)*.08 + Math.sin(t*13.1)*.05)*lit; winGlow.emissiveIntensity = 1.15*lit; });

// ----- the windmill on its knoll -----
const sails = new THREE.Group();
{ const y = hAt(WM.x, WM.z) - .3, g = grp(WM.x, y, WM.z, -.5);
  const tower = add(new THREE.CylinderGeometry(1.25, 1.9, 6.2, 14), T(0xe0cfae), 0, 3.1, 0, g); outline(tower, 1.03);
  for (let i = 0; i < 3; i++) cyl(1.9 - (i*2 + 1)*.105, 1.9 - (i*2 + 1)*.105 + .02, .12, T(0xc8b48e), 0, .8 + i*2, 0, g, 14);
  const roof = add(new THREE.ConeGeometry(1.6, 1.9, 14), T(C.rust), 0, 7.1, 0, g); outline(roof, 1.04);
  box(.8, 1.3, .1, T(C.woodDk), 0, .65, 1.82, g); box(.5, .6, .1, winGlow, 0, 3.5, 1.5, g, false); box(.45, .55, .1, winGlow, .9, 5.0, 1.0, g, false).rotation.y = .6;
  halo(WM.x + Math.sin(-.5)*1.6, y + 3.5, WM.z + Math.cos(-.5)*1.6, 1.8);
  sails.position.set(0, 6.0, 1.7); g.add(sails); cyl(.18, .18, .6, T(C.woodDk), 0, 0, -.1, sails, 8).rotation.x = Math.PI/2;
  for (let i = 0; i < 4; i++) { const arm = grp(0, 0, .2, 0, sails); arm.rotation.z = i*Math.PI/2;
    box(.14, 4.4, .1, T(C.woodDk), 0, 2.2, 0, arm); const sail = box(.9, 3.4, .04, T(0xefe0bf), .5, 2.6, .02, arm); outline(sail, 1.03);
    for (let k = 0; k < 4; k++) box(.95, .04, .06, T(C.woodDk), .5, 1.2 + k*.9, .05, arm); }
}
hqAnims.push((dt) => { sails.rotation.z -= dt * .45; });

// ----- a little village with smoking chimneys -----
const smoke = [];
function house(x, z, ry, wall, roofC, s = 1){
  const y = hAt(x, z) - .25, g = grp(x, y, z, ry); g.scale.setScalar(s);
  const body = box(3, 2.2, 2.4, T(wall), 0, 1.1, 0, g); outline(body, 1.02);
  const roof = add(new THREE.CylinderGeometry(1.75, 1.75, 3.3, 3, 1, false, Math.PI/2), T(roofC), 0, 2.7, 0, g); roof.rotation.set(0, 0, Math.PI/2); roof.scale.set(1, 1, .82); roof.rotation.order = 'ZXY'; outline(roof, 1.03);
  const ch = box(.45, 1.3, .45, T(C.stone), .9, 3.3, -.4, g); outline(ch, 1.05);
  for (const wx of [-.85, .85]) box(.55, .55, .06, winGlow, wx, 1.25, 1.22, g, false);
  box(.6, 1.1, .06, T(C.woodDk), 0, .55, 1.22, g);
  for (const wx of [-.85, .85]) box(.75, .12, .25, T(C.woodLt), wx, .9, 1.3, g);
  halo(x + Math.sin(ry)*1.6*s, y + 1.25*s, z + Math.cos(ry)*1.6*s, 2.4*s);
  const wp = new THREE.Vector3(.9, 4.0, -.4).multiplyScalar(s).applyAxisAngle(new THREE.Vector3(0, 1, 0), ry).add(new THREE.Vector3(x, y, z));
  for (let i = 0; i < 5; i++) { const m = sph(.22, T(0xb9adc4, {transparent:true, opacity:.6}), wp.x, wp.y, wp.z, null, 8, false); smoke.push({m, base:wp, t:i/5}); }
  for (let i = 0; i < 6; i++) { const a = fr(0, 6.28), r = fr(2.2, 3.4)*s; flower(x + Math.cos(a)*r, z + Math.sin(a)*r, hAt(x + Math.cos(a)*r, z + Math.sin(a)*r), 1.4); }
}
house(VIL.x, VIL.z, .5, 0xe6d6b8, C.rust); house(VIL.x - 6.5, VIL.z + 4.5, .9, 0xd9c6a8, C.plum, .9); house(VIL.x + 5, VIL.z - 4, .2, 0xe9dcc2, 0x2f5552, 1.05); house(VIL.x - 2, VIL.z - 7.5, -.3, 0xdcc9ad, 0x8a5a3a, .85);
hqAnims.push((dt) => { for (const p of smoke) { p.t = (p.t + dt*.18) % 1; p.m.position.set(p.base.x + Math.sin(p.t*5)*.3 + p.t*.8, p.base.y + p.t*3.2, p.base.z); p.m.scale.setScalar(.6 + p.t*1.8); p.m.material.opacity = .55*(1 - p.t); } });
// a picket fence and a lane through the village
for (let i = 0; i < 26; i++) { const t = i/25, x = VIL.x - 9 + t*16, z = VIL.z + 6.5 + Math.sin(t*3)*.8, y = hAt(x, z); bAdd(0xe9d9b8, new THREE.BoxGeometry(.1, .7, .06), XF(x, y + .35, z), {ink:.02}); if (i < 25) bAdd(0xe9d9b8, new THREE.BoxGeometry(.66, .07, .04), XF(x + .32, y + .5, z + Math.cos(t*3)*.08), {ink:.015}); }

// ----- sheep meadow east of the garden -----
const sheep = [];
{ const fx0 = MEAD.x - 7, fx1 = MEAD.x + 7, fz0 = MEAD.z - 6, fz1 = MEAD.z + 5;
  const fence = (x1, z1, x2, z2) => { const n = Math.round(Math.hypot(x2 - x1, z2 - z1)/1.6); for (let i = 0; i <= n; i++) { const x = x1 + (x2 - x1)*i/n, z = z1 + (z2 - z1)*i/n, y = hAt(x, z);
      bAdd(C.woodLt, new THREE.CylinderGeometry(.07, .08, 1.0, 6), XF(x, y + .45, z), {ink:.02});
      if (i < n) { const x3 = x + (x2 - x1)/n, z3 = z + (z2 - z1)/n, y3 = hAt(x3, z3), L = Math.hypot(x3 - x, z3 - z), a = Math.atan2(z3 - z, x3 - x);
        for (const hy of [.4, .75]) bAdd(C.wood, new THREE.BoxGeometry(L, .07, .06), XF((x + x3)/2, (y + y3)/2 + hy, (z + z3)/2, 1, 1, 1, 0, -a, Math.atan2(y3 - y, L)), {ink:.015}); } } };
  fence(fx0, fz0, fx1, fz0); fence(fx1, fz0, fx1, fz1); fence(fx1, fz1, fx0, fz1); fence(fx0, fz1, fx0, fz0);
  for (let i = 0; i < 7; i++) {
    const x = fr(fx0 + 1.2, fx1 - 1.2), z = fr(fz0 + 1.2, fz1 - 1.2), g = grp(x, hAt(x, z), z, fr(0, 6.28));
    const wool = []; for (const [px, py, pz, r] of [[0, .62, 0, .42], [.28, .66, .1, .3], [-.28, .64, -.05, .32], [0, .8, .18, .28], [0, .78, -.2, .28], [.12, .9, 0, .25]]) wool.push([new THREE.SphereGeometry(r, 12, 9), XF(px, py, pz)]);
    meshOf(mergeGeos(wool), 0xf1e8d6, g, .035);
    for (const [lx, lz] of [[.2, .18], [-.2, .18], [.2, -.18], [-.2, -.18]]) cyl(.05, .045, .4, T(C.ink), lx, .2, lz, g, 6);
    const head = grp(.48, .7, 0, 0, g); const hm = sph(.17, T(0x2a2230), .08, 0, 0, head, 10); hm.scale.set(1.3, .95, .9); outline(hm, 1.08);
    for (const sd of [-1, 1]) { const ear = sph(.06, T(0x2a2230), 0, .06, sd*.16, head, 6); ear.scale.set(.6, .5, 1.6); }
    for (const sd of [-1, 1]) sph(.025, T(0xffffff), .2, .04, sd*.08, head, 6, false);
    sheep.push({g, head, t:fr(0, 10), sp:fr(.6, 1.2), dir:fr(0, 6.28), walk:0});
    for (let k = 0; k < 8; k++) grassTuft(x + fr(-1.5, 1.5), z + fr(-1.5, 1.5), hAt(x, z), 1.2);
  }
  hqAnims.push((dt, t) => { for (const s of sheep) { s.t += dt;
    s.head.rotation.z = -.55 + Math.sin(s.t*s.sp)*.45 + (Math.sin(s.t*.3) > .6 ? .5 : 0);
    if (Math.sin(s.t*.21 + s.dir) > .7) { const nx = s.g.position.x + Math.cos(s.g.rotation.y)*dt*.25, nz = s.g.position.z - Math.sin(s.g.rotation.y)*dt*.25;
      if (nx > fx0 + 1 && nx < fx1 - 1 && nz > fz0 + 1 && nz < fz1 - 1) { s.g.position.x = nx; s.g.position.z = nz; s.g.position.y = hAt(nx, nz); } else s.g.rotation.y += dt*1.2; }
    else s.g.rotation.y += Math.sin(s.t*.13)*dt*.15; } });
}

// ----- the forest: dense near the garden, thinning into the hills -----
{ const grid = new Map(), cell = 2.1, taken = (x, z) => { const gx = Math.floor(x/cell), gz = Math.floor(z/cell); for (let i = -1; i <= 1; i++) for (let j = -1; j <= 1; j++) { const p = grid.get((gx + i) + ',' + (gz + j)); if (p && (p[0] - x)**2 + (p[1] - z)**2 < (cell*.95)**2) return true; } return false; };
  const clear = (x, z) => {
    const d = distPlay(x, z); if (d < 1.4) return false;
    if (Math.abs(z - streamZ(x)) < 2.8) return false;
    if (nearPath(x, z, hp.pts, 2.0)) return false;
    if (Math.hypot(x - LH.x, z - LH.z) < 5) return false;
    if (Math.hypot(x - WM.x, z - WM.z) < 5.5) return false;
    if (Math.hypot(x - VIL.x, z - VIL.z) < 11) return false;
    if (x > MEAD.x - 8.5 && x < MEAD.x + 8.5 && z > MEAD.z - 7.5 && z < MEAD.z + 6.5) return false;
    return true; };
  let placed = 0;
  for (let i = 0; i < 6000 && placed < 330; i++) {
    const x = fr(-52, 66), z = fr(-56, 17); if (!clear(x, z) || taken(x, z)) continue;
    const d = distPlay(x, z); if (frand() > (d < 6 ? .95 : d < 16 ? .7 : .45)) continue;
    grid.set(Math.floor(x/cell) + ',' + Math.floor(z/cell), [x, z]); placed++;
    const s = fr(.85, 1.45) * (d > 14 ? 1.15 : 1);
    if (frand() < .42) bPine(x, z, s); else bRound(x, z, s);
    if (frand() < .5) for (let k = 0; k < 3; k++) grassTuft(x + fr(-1.4, 1.4), z + fr(-1.4, 1.4), hAt(x, z), 1.3);
  }
  // meadows of flowers and tufts on the open slopes, plus scattered boulders
  for (let i = 0; i < 900; i++) { const x = fr(-48, 62), z = fr(-50, 15); if (distPlay(x, z) < 1.2 || Math.abs(z - streamZ(x)) < 1.8 || nearPath(x, z, hp.pts, .9)) continue;
    const y = hAt(x, z); if (frand() < .35) flower(x, z, y, 1.6); else grassTuft(x, z, y, 1.5); }
  for (let i = 0; i < 40; i++) { const x = fr(-45, 60), z = fr(-48, 14); if (clear(x, z)) bRock(x, z, fr(.4, 1.1)); }
}

// ----- birds wheeling overhead -----
const birds = [];
for (let i = 0; i < 5; i++) { const g = new THREE.Group(); scene.add(g); const wings = [];
  for (const sd of [-1, 1]) { const w = new THREE.Mesh(new THREE.ConeGeometry(.12, .7, 3), T(0x2a2230)); w.rotation.z = sd*Math.PI/2; w.position.x = sd*.35; w.scale.set(1, 1, .25); const piv = new THREE.Group(); piv.add(w); g.add(piv); wings.push(piv); }
  sph(.1, T(0x2a2230), 0, 0, 0, g, 6).scale.set(1, .8, 2.2);
  birds.push({g, wings, r:fr(9, 17), y:fr(4.8, 6.8), sp:fr(.18, .3)*(i%2 ? 1 : -1), ph:fr(0, 6.28), cx:fr(12, 24), cz:fr(-8, 2)}); }
hqAnims.push((dt, t) => { for (const b of birds) { const a = b.ph + t*b.sp; b.g.position.set(b.cx + Math.cos(a)*b.r, b.y + Math.sin(t*.7 + b.ph)*.4, b.cz + Math.sin(a)*b.r*.7); b.g.rotation.y = -a + (b.sp > 0 ? 0 : Math.PI); const f = Math.sin(t*9 + b.ph)*.6; b.wings[0].rotation.z = f; b.wings[1].rotation.z = -f; } });
