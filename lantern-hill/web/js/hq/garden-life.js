// Garden life: the path, flower beds, critters and cosy props.

import * as THREE from 'three';
import { C, T, XF, add, bAdd, box, col, cyl, fr, frand, grp, outline, rand, rr, sph, tex } from '../core/kit.js';
import { hqAnims, scene } from './scene.js';
import { dirtMat, flower, grassTuft, nearPath, ribbonGeo } from './wider.js';

const lily = [];

// a winding dirt path from the door past the lamps, with a branch to the bus
const gPath = ribbonGeo([[10.5, .5], [11.8, 1.15], [13.4, 1.25], [15.6, 1.8], [18.2, 1.9], [20.4, 2.1], [23.2, 1.6], [24.9, .7], [25.3, -.9], [25.2, -2.6]], 1.05, .035, false, 90);
const gPathMesh = new THREE.Mesh(gPath.geo, dirtMat); gPathMesh.receiveShadow = true; scene.add(gPathMesh);
const gBranch = ribbonGeo([[15.6, 1.8], [15.3, 2.7], [15.1, 3.5]], .85, .034, false, 12);
scene.add(new THREE.Mesh(gBranch.geo, dirtMat));
for (let i = 0; i < 40; i++) { const p = gPath.pts[Math.floor(frand()*gPath.pts.length)]; bAdd([0x8a8090, 0x9a90a0, 0x7d7486][i%3], new THREE.SphereGeometry(fr(.04, .09), 6, 4), XF(p.x + fr(-.6, .6), .04, p.z + fr(-.6, .6), 1, .5, 1)); }
const onGPath = (x, z, r = .75) => nearPath(x, z, gPath.pts, r) || nearPath(x, z, gBranch.pts, r);
const gBusy = (x, z) => (x > 14.1 && x < 18.1 && z < -7.1) || (x < 18.6 && z > -2.5 && z < .3) || (x > 17.3 && x < 25.6 && z > -6.6 && z < .6) || (x > 12.8 && x < 18.4 && z > 3.7 && z < 7.3) || (x > 19.9 && x < 25.7 && z > 2.9 && z < 7.5) || onGPath(x, z);

// tall grass and wildflowers through the lawn
for (let i = 0; i < 260; i++) { const x = fr(11.3, 26.6), z = fr(-9.6, 8.6); if (gBusy(x, z)) continue; if (frand() < .3) flower(x, z, 0, 1.1); else grassTuft(x, z, 0, 1.15); }
// flower beds tucked along the hedges
function bed(x, z, w, d, n){ for (let i = 0; i < n; i++) { const fx = x + fr(-w/2, w/2), fz = z + fr(-d/2, d/2); if (gBusy(fx, fz)) continue; frand() < .75 ? flower(fx, fz, 0, fr(1.2, 1.6)) : grassTuft(fx, fz, 0, 1.3); }
  const rim = []; for (let i = 0; i < Math.round((w + d)*2.2); i++) { const t = i/Math.round((w + d)*2.2)*Math.PI*2; rim.push([new THREE.SphereGeometry(fr(.1, .16), 7, 5), XF(x + Math.cos(t)*w/2*1.05, .04, z + Math.sin(t)*d/2*1.1, 1, .55, 1)]); }
  for (const [g, m] of rim) bAdd(0x8a8090, g, m, {ink:.02}); }
bed(22.0, -9.45, 4.2, .6, 34); bed(26.2, 4.6, .9, 3.2, 26); bed(12.2, 8.4, 2.4, .8, 22); bed(26.3, -7.4, .8, 1.8, 14); bed(11.6, -9.0, 1.8, .9, 16);

// ----- the lily pond, rebuilt: organic shoreline, layered stones, rippling water, lilies, reeds, koi and a frog -----
const POND = {x:22.8, z:5.2};
const pondR = a => 1.0 + .13*Math.sin(a*3 + .6) + .07*Math.sin(a*5 + 2.0);
const pondShape = (a, k) => [POND.x + Math.cos(a)*2.25*pondR(a)*k, POND.z + Math.sin(a)*1.75*pondR(a)*k];
{ // shore of packed earth, then the water sitting slightly sunk inside it
  const shore = new THREE.Shape(), water = new THREE.Shape(), N = 48;
  for (let i = 0; i <= N; i++) { const a = i/N*Math.PI*2, [sx, sz] = pondShape(a, 1.18), [wx, wz] = pondShape(a, 1.0);
    if (i) { shore.lineTo(sx - POND.x, -(sz - POND.z)); water.lineTo(wx - POND.x, -(wz - POND.z)); } else { shore.moveTo(sx - POND.x, -(sz - POND.z)); water.moveTo(wx - POND.x, -(wz - POND.z)); } }
  const sm = add(new THREE.ShapeGeometry(shore, 2), T(0x6e5a44), POND.x, .03, POND.z, null, false); sm.rotation.x = -Math.PI/2;
  const deep = add(new THREE.ShapeGeometry(water, 2), T(0x223d5c, {emissive:0x16304e, emissiveIntensity:.5}), POND.x, .045, POND.z, null, false); deep.rotation.x = -Math.PI/2;
  // the surface: a ripple texture that drifts, with a lighter edge
  const rip = tex(256, 256, (g, w, h) => { const gr = g.createRadialGradient(w/2, h/2, w*.25, w/2, h/2, w*.5); gr.addColorStop(0, '#3a6c96'); gr.addColorStop(.85, '#4f86ad'); gr.addColorStop(1, '#8fc0dc'); g.fillStyle = gr; g.fillRect(0, 0, w, h);
    g.strokeStyle = 'rgba(220,240,255,.28)'; g.lineWidth = 2.5; for (let i = 0; i < 14; i++) { const x = rand()*w, y = rand()*h, r = rr(6, 22); g.beginPath(); g.ellipse(x, y, r, r*.55, 0, 0, Math.PI*2); g.stroke(); } }, 1, 1);
  const wGeo = new THREE.ShapeGeometry(water, 2), uv = wGeo.attributes.uv, pp = wGeo.attributes.position;
  for (let i = 0; i < uv.count; i++) uv.setXY(i, pp.getX(i)/5.4 + .5, pp.getY(i)/4.4 + .5);
  const surf = add(wGeo, T(0xffffff, {map:rip, transparent:true, opacity:.88, emissive:0x1b3252, emissiveIntensity:.35}), POND.x, .07, POND.z, null, false); surf.rotation.x = -Math.PI/2;
  hqAnims.push((dt, t) => { rip.offset.set(Math.sin(t*.15)*.02, Math.cos(t*.12)*.02); });
  // layered rounded stones: big ones behind, small ones in front, a few with moss
  for (let i = 0; i < 30; i++) { const a = i/30*Math.PI*2 + fr(-.05, .05), back = Math.sin(a) < 0, k = fr(1.04, 1.16), [x, z] = pondShape(a, k), r = (back ? fr(.26, .42) : fr(.16, .27));
    bAdd([0x8a8090, 0x7d7486, 0x958b9c, 0x6f6678][i%4], new THREE.SphereGeometry(r, 10, 7), XF(x, r*.32, z, fr(1.1, 1.5), fr(.55, .75), fr(.9, 1.2), 0, -a, 0), {ink:.03, shadow:true});
    if (frand() < .35) bAdd(C.moss, new THREE.SphereGeometry(r*.72, 8, 5, 0, Math.PI*2, 0, Math.PI/2), XF(x, r*.48, z, 1.3, .3, 1.1)); }
  for (let i = 0; i < 9; i++) { const a = fr(0, 6.28), [x, z] = pondShape(a, fr(1.28, 1.5)); bAdd(0x8a8090, new THREE.SphereGeometry(fr(.09, .14), 8, 5), XF(x, .05, z, 1.3, .55, 1), {ink:.02}); }
}
// lily pads: notched discs of several sizes, some with pink water-lilies
lily.length = 0;
for (const [px, pz, r, bloom] of [[21.5, 4.6, .34, true], [22.3, 4.1, .24, false], [23.9, 5.7, .38, false], [24.4, 4.8, .22, true], [22.6, 6.1, .3, false], [21.7, 5.7, .2, false], [23.4, 4.4, .18, false]]) {
  const g = grp(px, .085, pz, fr(0, 6.28));
  const pad = add(new THREE.CircleGeometry(r, 18, .35, Math.PI*2 - .5), T(fr(0, 1) < .5 ? 0x4f8a4a : 0x5d9a52), 0, 0, 0, g, false); pad.rotation.x = -Math.PI/2;
  const vein = add(new THREE.RingGeometry(r*.25, r*.3, 12), T(0x6eaa5e), 0, .002, 0, g, false); vein.rotation.x = -Math.PI/2;
  if (bloom) { const fl = grp(r*.2, 0, 0, 0, g);
    for (let i = 0; i < 8; i++) { const a = i/8*Math.PI*2, pet = sph(.07, T(i%2 ? 0xf0c8d8 : 0xe7a2bd), Math.cos(a)*.07, .06, Math.sin(a)*.07, fl, 8, false); pet.scale.set(1.5, .55, .7); pet.rotation.y = -a; pet.rotation.z = .5; }
    for (let i = 0; i < 5; i++) { const a = i/5*Math.PI*2 + .3, pet = sph(.05, T(0xf6e0ea), Math.cos(a)*.035, .1, Math.sin(a)*.035, fl, 8, false); pet.scale.set(1.3, .7, .7); pet.rotation.y = -a; pet.rotation.z = .9; }
    sph(.03, T(0xf2d27a), 0, .12, 0, fl, 6, false); }
  g.userData.ry = g.rotation.y; lily.push(g);
}
// reeds and cattails in clumps at the back, swaying
const reeds = [];
for (const [cx, cz] of [[24.9, 4.0], [20.7, 4.3], [24.5, 6.6]]) for (let i = 0; i < 7; i++) {
  const x = cx + fr(-.35, .35), z = cz + fr(-.3, .3), h = fr(.8, 1.4), g = grp(x, 0, z); g.rotation.x = fr(-.08, .08);
  cyl(.014, .02, h, T(i%2 ? C.moss : 0x4a7a44), 0, h/2, 0, g, 4);
  if (i%2 === 0) { const ct = cyl(.045, .045, .22, T(0x6b4430), 0, h + .05, 0, g, 6); outline(ct, 1.15); cyl(.008, .008, .12, T(C.moss), 0, h + .22, 0, g, 3); }
  else { const leaf = add(new THREE.ConeGeometry(.03, h*.9, 3), T(0x5b8a52), .04, h*.45, 0, g); leaf.rotation.z = -.2; }
  reeds.push({g, ph:fr(0, 6.28), base:g.rotation.x});
}
hqAnims.push((dt, t) => { for (const r of reeds) { r.g.rotation.z = Math.sin(t*1.3 + r.ph)*.06; r.g.rotation.x = r.base + Math.sin(t*.9 + r.ph)*.04; } });
// koi drifting under the surface
const koi = [];
for (let i = 0; i < 3; i++) { const g = grp(POND.x, .06, POND.z); const b = sph(.12, T(i === 1 ? 0xf2efe6 : 0xe07a3a), 0, 0, 0, g, 10, false); b.scale.set(1, .35, 2.2);
  if (i !== 0) sph(.07, T(0xe07a3a), 0, .02, .08, g, 8, false).scale.set(1, .4, 1.4);
  const tail = add(new THREE.ConeGeometry(.09, .2, 4), T(i === 1 ? 0xf2efe6 : 0xe07a3a), 0, 0, -.32, g, false); tail.rotation.x = -Math.PI/2; tail.scale.set(1, 1, .25);
  koi.push({g, tail, r:fr(.7, 1.3), sp:fr(.25, .45)*(i%2 ? -1 : 1), ph:i*2.1}); }
hqAnims.push((dt, t) => { for (const k of koi) { const a = k.ph + t*k.sp; k.g.position.set(POND.x + Math.cos(a)*k.r*1.25, .06, POND.z + Math.sin(a)*k.r); k.g.rotation.y = -a + (k.sp > 0 ? Math.PI : 0); k.tail.rotation.y = Math.sin(t*6 + k.ph)*.5; } });
// a frog on the big pad who hops now and then
const frog = grp(0, 0, 0, 0, lily[0]); frog.position.set(-.08, .02, .05);
{ const fb = sph(.11, T(0x6a9a3e), 0, .08, 0, frog, 12); fb.scale.set(1.15, .8, 1); outline(fb, 1.08);
  for (const sd of [-1, 1]) { const e = sph(.05, T(0x6a9a3e), .05, .17, sd*.06, frog, 8); outline(e, 1.1); sph(.025, T(C.ink), .085, .18, sd*.065, frog, 6, false); const leg = sph(.05, T(0x5a8a34), -.06, .04, sd*.1, frog, 8); leg.scale.set(1.6, .6, .8); } }
const frogState = {t:0, next:4};
hqAnims.push((dt) => { frogState.t += dt; const h = frogState.t - frogState.next;
  if (h > 0 && h < .5) { frog.position.y = .02 + Math.sin(h/.5*Math.PI)*.35; frog.rotation.y += dt*6; } else { frog.position.y = .02; if (h >= .5) { frogState.next = frogState.t + fr(3, 7); } } });

// ----- a friendly scarecrow minding the vegetable bed (garden/bed.js) -----
{ const vx = 16.4, vz = -8.6;
  const sc = grp(vx + 2.3, 0, vz + .2, -.4);
  cyl(.05, .05, 1.9, T(C.woodDk), 0, .95, 0, sc, 6); const arm = box(1.5, .07, .07, T(C.woodDk), 0, 1.45, 0, sc);
  const shirt = box(.55, .6, .3, T(0xb5552f), 0, 1.35, 0, sc); outline(shirt, 1.05);
  for (const sx of [-1, 1]) { const sl = box(.42, .2, .22, T(0xb5552f), sx*.45, 1.45, 0, sc); outline(sl, 1.06); for (let k = 0; k < 3; k++) cyl(.012, .012, .2, T(0xd9b45a), sx*(.7 + k*.02), 1.4 - k*.04, (k - 1)*.04, sc, 3).rotation.z = sx*1.3; }
  for (let k = 0; k < 4; k++) box(.56, .03, .31, T(0x8a3a24), 0, 1.15 + k*.14, 0, sc, false);
  const hd = sph(.24, T(0xd8c08a), 0, 1.92, 0, sc, 12); outline(hd, 1.06);
  for (const sx of [-1, 1]) box(.05, .05, .02, T(C.ink), sx*.08, 1.96, .23, sc, false);
  add(new THREE.TorusGeometry(.06, .012, 4, 8, Math.PI), T(C.ink), 0, 1.86, .23, sc, false).rotation.z = Math.PI;
  const brim = cyl(.4, .4, .04, T(0x6b4430), 0, 2.1, 0, sc, 14); outline(brim, 1.05); cyl(.2, .24, .3, T(0x6b4430), 0, 2.26, 0, sc, 12);
  cyl(.205, .205, .06, T(C.gold), 0, 2.16, 0, sc, 12);
  col(vx + 2.1, vx + 2.5, vz, vz + .4);
  // a crow keeping him company
  const crow = grp(.6, 1.5, 0, Math.PI/2, sc); const cb = sph(.09, T(0x2a2230), 0, .06, 0, crow, 8); cb.scale.set(1, .9, 1.5); sph(.06, T(0x2a2230), 0, .14, .1, crow, 8); add(new THREE.ConeGeometry(.025, .08, 4), T(C.gold), 0, .14, .18, crow, false).rotation.x = Math.PI/2;
  hqAnims.push((dt, t) => { crow.rotation.y = Math.PI/2 + (Math.sin(t*.7) > .5 ? .6 : 0); });
}

// ----- clothesline with washing flapping in the breeze -----
const washing = [];
{ const x1 = 19.6, x2 = 24.4, z = -8.9;
  for (const x of [x1, x2]) { cyl(.06, .07, 1.9, T(C.woodLt), x, .95, z, null, 6); box(.5, .06, .06, T(C.woodLt), x, 1.85, z); col(x - .12, x + .12, z - .12, z + .12); }
  const rope = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3([new THREE.Vector3(x1, 1.82, z), new THREE.Vector3((x1 + x2)/2, 1.62, z), new THREE.Vector3(x2, 1.82, z)]), 20, .012, 4), T(C.cream)); scene.add(rope);
  const cols = [0xd36a8f, 0xe9d9b8, 0x34406b, 0xd9a441, 0x2f8f8a, 0xb5552f];
  for (let i = 0; i < 6; i++) { const t = (i + .7)/6.4, x = x1 + (x2 - x1)*t, y = 1.82 - Math.sin(t*Math.PI)*.2, w = fr(.45, .7), h = fr(.45, .75);
    const piv = grp(x, y, z); const cl = new THREE.Mesh(new THREE.PlaneGeometry(w, h, 1, 3), T(cols[i], {side:THREE.DoubleSide})); cl.position.y = -h/2; cl.castShadow = true; piv.add(cl);
    if (i === 2) { for (let k = 0; k < 3; k++) { const st = new THREE.Mesh(new THREE.PlaneGeometry(w, .05), T(C.cream, {side:THREE.DoubleSide})); st.position.set(0, -h*(.25 + k*.25), .002); piv.add(st); } }
    for (const sx of [-1, 1]) box(.03, .08, .03, T(C.woodDk), sx*w*.35, .02, 0, piv, false);
    washing.push({piv, ph:i*.9}); }
  hqAnims.push((dt, t) => { for (const w of washing) w.piv.rotation.x = Math.sin(t*1.6 + w.ph)*.18 + .1; });
}

// ----- beehive with bees -----
const bees = [];
{ const hx = 26.2, hz = -4.0, hv = grp(hx, 0, hz, -.6);
  box(.7, .5, .7, T(C.woodLt), 0, .25, 0, hv); cyl(.04, .04, .5, T(C.woodDk), 0, .25, 0, hv, 4);
  for (let i = 0; i < 4; i++) { const r = .42 - i*.07, s = sph(r, T(i%2 ? 0xd9a441 : 0xe8b85a), 0, .62 + i*.18, 0, hv, 14); s.scale.y = .62; outline(s, 1.04); }
  box(.16, .1, .06, T(0x2a1810), 0, .62, .4, hv, false);
  col(hx - .45, hx + .45, hz - .45, hz + .45);
  for (let i = 0; i < 6; i++) { const b = grp(0, 0, 0); const bd = sph(.05, T(0xe8b84a), 0, 0, 0, b, 6, false); bd.scale.set(1, .9, 1.4); box(.1, .02, .02, T(C.ink), 0, 0, 0, b, false).rotation.y = Math.PI/2;
    for (const sd of [-1, 1]) { const w = sph(.04, T(0xffffff, {transparent:true, opacity:.7}), sd*.04, .04, 0, b, 6, false); w.scale.set(1, .3, .6); }
    bees.push({b, ph:fr(0, 6.28), r:fr(.5, 1.4), sp:fr(1.2, 2.2), hy:fr(.6, 1.6)}); }
  hqAnims.push((dt, t) => { for (const e of bees) { const a = e.ph + t*e.sp; e.b.position.set(hx + Math.cos(a)*e.r + Math.sin(t*7 + e.ph)*.05, e.hy + Math.sin(t*3 + e.ph)*.2, hz + Math.sin(a*1.3)*e.r*.8); e.b.rotation.y = -a; } });
}

// ----- a bench facing the pond, a birdbath, and a wheelbarrow of flowers -----
// tucked back against the hedge: the pond's own collider leaves only a narrow strip to stand in front of it
export const BENCH = {x:22.6, z:8.4};
{ const bn = grp(BENCH.x, 0, BENCH.z);
  for (let i = 0; i < 3; i++) { const sl = box(1.6, .06, .14, T(C.woodLt), 0, .48, -.15 + i*.15, bn); outline(sl, 1.04); }
  for (let i = 0; i < 2; i++) { const sl = box(1.6, .14, .05, T(C.woodLt), 0, .72 + i*.2, .2, bn); outline(sl, 1.04); }
  for (const sx of [-.7, .7]) { box(.08, .48, .08, T(C.woodDk), sx, .24, -.15, bn); box(.08, 1.0, .08, T(C.woodDk), sx, .5, .2, bn); box(.08, .06, .45, T(C.woodDk), sx, .66, 0, bn); }
  col(BENCH.x - .85, BENCH.x + .85, BENCH.z - .25, BENCH.z + .35);
  const bb = grp(19.2, 0, 4.4);
  cyl(.12, .18, .7, T(0x9a90a0), 0, .35, 0, bb, 10); cyl(.32, .2, .05, T(0x9a90a0), 0, .03, 0, bb, 12);
  const bowl = add(new THREE.SphereGeometry(.42, 16, 8, 0, Math.PI*2, Math.PI/2, Math.PI/2), T(0x9a90a0, {side:THREE.DoubleSide}), 0, .9, 0, bb); bowl.scale.y = .45; outline(bowl, 1.04);
  const bw = add(new THREE.CircleGeometry(.36, 16), T(0x4f86ad, {emissive:0x1b3252, emissiveIntensity:.4}), 0, .88, 0, bb, false); bw.rotation.x = -Math.PI/2;
  const bird = grp(.3, .9, 0, -.4, bb); const bbody = sph(.07, T(0x6d8ac4), 0, .05, 0, bird, 8); bbody.scale.set(1, .9, 1.4); outline(bbody, 1.1); sph(.05, T(0x6d8ac4), 0, .12, .07, bird, 8); add(new THREE.ConeGeometry(.018, .05, 4), T(C.gold), 0, .12, .13, bird, false).rotation.x = Math.PI/2; sph(.045, T(0xe07a5a), 0, .07, .06, bird, 6, false);
  hqAnims.push((dt, t) => { const dip = Math.max(0, Math.sin(t*1.7) - .7)*3; bird.rotation.x = dip*.6; bird.position.y = .9 + Math.abs(Math.sin(t*9))*.01; });
  col(18.85, 19.55, 4.05, 4.75);
  const wb = grp(11.9, 0, 6.6, .8);
  const tub = box(.9, .35, .6, T(0x2f5552), 0, .5, 0, wb); outline(tub, 1.04);
  const wheel = add(new THREE.TorusGeometry(.18, .05, 6, 14), T(C.ink), .55, .2, 0, wb); outline(wheel, 1.06);
  for (const sz of [-.25, .25]) { box(.9, .05, .05, T(C.woodLt), -.55, .45, sz, wb).rotation.z = -.15; box(.05, .35, .05, T(C.woodDk), -.3, .17, sz, wb); }
  for (let i = 0; i < 9; i++) { const lp = new THREE.Vector3(fr(-.35, .35), .7, fr(-.22, .22)).applyAxisAngle(new THREE.Vector3(0, 1, 0), .8); flower(11.9 + lp.x, 6.6 + lp.z, .62, 1.3); }
  col(11.35, 12.45, 6.1, 7.1);
}

// ----- butterflies dancing over the lawn -----
const flutters = [];
for (let i = 0; i < 7; i++) { const g = grp(0, 0, 0), c = [0xe9d9b8, 0xd36a8f, 0xd9a441, 0x8fd0e8, 0xe07a5a][i%5], ws = [];
  for (const sd of [-1, 1]) { const piv = grp(0, 0, 0, 0, g); const w = new THREE.Mesh(new THREE.CircleGeometry(.11, 8), T(c, {side:THREE.DoubleSide})); w.position.x = sd*.1; w.rotation.x = -Math.PI/2; w.scale.set(1, 1.3, 1); piv.add(w);
    const w2 = new THREE.Mesh(new THREE.CircleGeometry(.07, 8), T(c, {side:THREE.DoubleSide})); w2.position.set(sd*.07, 0, -.1); w2.rotation.x = -Math.PI/2; piv.add(w2); ws.push(piv); }
  sph(.02, T(C.ink), 0, 0, 0, g, 5, false).scale.set(1, 1, 4);
  flutters.push({g, ws, cx:fr(13, 25), cz:fr(-8, 7), ph:fr(0, 6.28), r:fr(.8, 2), sp:fr(.4, .8)}); }
hqAnims.push((dt, t) => { for (const f of flutters) { const a = f.ph + t*f.sp; f.g.position.set(f.cx + Math.cos(a)*f.r + Math.sin(a*2.3)*.4, .7 + Math.sin(t*1.9 + f.ph)*.35 + .3, f.cz + Math.sin(a*1.4)*f.r); f.g.rotation.y = -a; const fl = Math.sin(t*16 + f.ph)*.9; f.ws[0].rotation.z = fl; f.ws[1].rotation.z = -fl; } });
hqAnims.push((dt, t) => { lily.forEach((p, i) => p.rotation.y = p.userData.ry + Math.sin(t * .5 + i) * .2); });

// ----- pond critters at every stage of growing up, for whoever sits on the bench to wonder about -----
// placed by formula rather than the seeded RNG so adding them reshuffles nothing else
const spawn = grp(21.45, .072, 6.15), jelly = T(0xdcefd6, {transparent:true, opacity:.55});
for (let i = 0; i < 26; i++) { const a = i*2.4, r = Math.sqrt(i/26)*.2, x = Math.cos(a)*r, y = (i%3)*.03, z = Math.sin(a)*r*.8;
  sph(.05, jelly, x, y, z, spawn, 8, false); sph(.016, T(C.ink), x, y + .012, z, spawn, 5, false); }
const tads = [];
for (let i = 0; i < 6; i++) { const g = grp(0, .078, 0); sph(.042, T(0x3a3428), 0, 0, 0, g, 8, false).scale.set(1, .7, 1.25);
  const tail = grp(0, 0, -.035, 0, g), fin = add(new THREE.ConeGeometry(.03, .13, 4), T(0x4a4232), 0, 0, -.06, tail, false); fin.rotation.x = -Math.PI/2; fin.scale.z = .35;
  tads.push({g, tail, ph:i*1.05, r:.16 + (i%3)*.08, sp:i%2 ? .8 : -.65}); }
hqAnims.push((dt, t) => { for (const d of tads) { const a = d.ph + t*d.sp; d.g.position.set(22.05 + Math.cos(a)*d.r*1.4, .078, 6.25 + Math.sin(a)*d.r);
  d.g.rotation.y = -a + (d.sp < 0 ? Math.PI : 0); d.tail.rotation.y = Math.sin(t*14 + d.ph)*.6; } });
// a froglet on the pad nearest the bench: legs grown, tail not quite gone
const froglet = grp(.04, .01, -.03, 2.2, lily[4]);
{ const fb = sph(.065, T(0x7aa84a), 0, .045, 0, froglet, 10); fb.scale.set(1.15, .8, 1); outline(fb, 1.1);
  for (const sd of [-1, 1]) { outline(sph(.03, T(0x7aa84a), .035, .1, sd*.038, froglet, 8), 1.1); sph(.015, T(C.ink), .058, .105, sd*.04, froglet, 6, false);
    sph(.03, T(0x6a9a3e), -.035, .02, sd*.06, froglet, 6, false).scale.set(1.6, .6, .8); }
  add(new THREE.ConeGeometry(.028, .12, 5), T(0x6a9a3e), -.11, .04, 0, froglet, false).rotation.z = Math.PI/2; }
const striders = [];
for (let i = 0; i < 3; i++) { const g = grp(0, .076, 0); sph(.025, T(0x2a2230), 0, .02, 0, g, 6, false).scale.set(.7, .6, 2.2);
  for (const sd of [-1, 1]) for (const k of [-1, 0, 1]) { const l = cyl(.004, .004, k ? .2 : .12, T(0x2a2230), sd*.07, .012, k*.06, g, 3, false); l.rotation.z = sd*1.4; l.rotation.y = k*sd*.5; }
  const ring = add(new THREE.RingGeometry(.11, .125, 18), T(0xdff1f5, {transparent:true, opacity:.35}), 0, .002, 0, g, false); ring.rotation.x = -Math.PI/2;
  striders.push({g, ph:i*2.1}); }
hqAnims.push((dt, t) => { for (const s of striders) { const a = s.ph + t*.4 + Math.sin(t*5 + s.ph)*.075, r = .32 + .1*Math.sin(s.ph);
  s.g.position.set(23.35 + Math.cos(a)*r*1.4, .076, 6.05 + Math.sin(a)*r); s.g.rotation.y = -a; } });
// a dragonfly patrolling the reeds it climbed out on
const dfly = grp(24.2, .9, 6.3), dWings = []; dfly.rotation.order = 'YXZ';
{ const abd = cyl(.012, .022, .36, T(0x2f7fae), 0, 0, -.06, dfly, 6); abd.rotation.x = Math.PI/2; outline(abd, 1.12);
  outline(sph(.035, T(0x2f8f8a), 0, 0, .13, dfly, 8), 1.1);
  for (const sd of [-1, 1]) { sph(.026, T(0x1e5a6e), sd*.025, .015, .16, dfly, 6, false);
    for (const k of [0, 1]) { const piv = grp(0, .02, .1 - k*.07, 0, dfly), w = add(new THREE.CircleGeometry(.05, 10), T(0xe4f4ff, {transparent:true, opacity:.6, side:THREE.DoubleSide}), sd*.15, 0, 0, piv, false);
      w.rotation.x = -Math.PI/2; w.scale.set(3, 1, 1); dWings.push({piv, sd}); } } }
const dPrev = new THREE.Vector3();
hqAnims.push((dt, t) => { const u = t*.3 + Math.sin(t*4.4)*.09; dPrev.copy(dfly.position);
  dfly.position.set(24.1 + Math.sin(u*1.7)*.55, .85 + Math.sin(t*1.3)*.1, 6.0 + Math.sin(u*2.3)*.45);
  const vx = dfly.position.x - dPrev.x, vz = dfly.position.z - dPrev.z; if (Math.hypot(vx, vz) > 1e-4) dfly.rotation.y = Math.atan2(vx, vz);
  for (const w of dWings) w.piv.rotation.z = w.sd*Math.sin(t*45)*.35; });
// Mama Duck and her ducklings paddling laps; now and then she tips bottom-up to dabble for food
function duck(s, body, head){ const g = grp(0, .07, 0); g.rotation.order = 'YXZ';
  const b = sph(.16*s, T(body), 0, .07*s, 0, g, 12); b.scale.set(.9, .65, 1.3); outline(b, 1.06);
  sph(.07*s, T(body), 0, .13*s, -.2*s, g, 8, false).scale.set(.8, .5, 1);
  outline(sph(.1*s, T(head), 0, .25*s, .16*s, g, 10), 1.08);
  sph(.05*s, T(0xe8962e), 0, .22*s, .26*s, g, 8, false).scale.set(1, .4, 1.4);
  for (const sd of [-1, 1]) sph(.018*s, T(C.ink), sd*.075*s, .28*s, .21*s, g, 6, false);
  return g; }
const ducks = [duck(1, 0x9a7650, 0x7d5d3e), duck(.48, 0xf2d25a, 0xf2d25a), duck(.48, 0xf2d25a, 0xf2d25a), duck(.48, 0xf2d25a, 0xf2d25a)];
hqAnims.push((dt, t) => { ducks.forEach((g, i) => { const a = t*.14 - (i ? .2 + i*.24 : 0);
  g.position.set(POND.x + Math.cos(a)*1.45, .07 + Math.sin(t*3 + i)*.006, POND.z + Math.sin(a)*1.0);
  g.rotation.y = Math.atan2(-Math.sin(a)*1.45, Math.cos(a)*1.0); g.rotation.x = i ? 0 : Math.max(0, Math.sin(t*.45) - .86)*8.5; }); });
export const pondLife = {pond:new THREE.Vector3(POND.x, .1, POND.z + .4), spawn, tadpoles:new THREE.Vector3(22.05, .08, 6.25), froglet, frog,
  striders:striders[0].g, dragonfly:dfly, wigglers:new THREE.Vector3(23.0, .07, 6.6), ducks:ducks[0], ducklings:ducks[2],
  pads:lily[lily.length - 1], koi:koi[0].g};
