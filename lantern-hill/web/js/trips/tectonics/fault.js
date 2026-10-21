// Where plates slide past each other: a wide bowl of rolling golden hills, split by a fault that runs
// through it as a line of little scarps, a trough, a crack and a sag pond. Down at the road, Basil finds
// the one big lesson: the road broken and slid apart, the slow mantle underneath that drags each plate its
// own way, the rock along the crack that sticks and bends, and the snap. Everything else here opens a new
// idea: a creek that jogs, a row of trees that measures how fast, crushed rock in the crack, a spring the
// crack lets up, a pond it sinks, a machine that hears every shake, a house built for one.

import * as THREE from 'three';
import { C, T, XF, add, bAdd, bFlush, box, clamp01, ease, fr, frand, grp, leafCloud, mergeGeos, meshOf, outline, sph, tex } from '../../core/kit.js';
import { Sound } from '../../core/sound.js';
import { addUsable, inWorld } from '../../core/world.js';
import { flower, grassTuft } from '../../hq/wider.js';
import { player } from '../../player.js';
import { game } from '../../state.js';
import { tripBus } from '../bus.js';
import { classmates } from '../class.js';
import { diorama, goggles, label } from '../goggles.js';
import { curio, puffs, sample, tripWorld } from '../stop-kit.js';
import { storySky } from '../sky.js';
import { butterflies, duck, flock, groundSquirrel, soarer } from './land-life.js';
import { quake } from './quake.js';
import { wonders } from './wonders.js';

// The fault runs north to south along x = 0. West of it is the Pacific Plate, which creeps north; east of
// it the North American Plate, which creeps south. So anything old that crosses it has its west half
// carried north of its east half: the road, the creek, the row of trees, the rock.
const RX = 26, RZ = 21, ZC = -3;
const ROAD_Z = 4, ROAD_OFF = 2.6, FENCE_Z = -1.4;
const ORCH_Z = -12, ORCH_OFF = 1.75;
const SPLIT = [0, -19.6], SPLIT_OFF = 1.3;
const SAG = [.2, 11.2], SEEP = [.1, 8.9], POND = [-16, -7.4];
const KNOLL = [-12.5, 9], HILL_E = [22.5, -5.5], BUS = [13, 10], BUS_RY = Math.PI;
const HOUSE = [-15, -15], SEIS = [15.5, -12], BURROWS = [2.6, -16.6], POPPIES = [-5, 13.6], SNAG = [-21, -2];
// from the spring on the eastern hill, downhill all the way: west to the crack, north along it to catch
// up with itself, and on west to the pond
const CREEK = [[20.6, -5.2], [19.4, -5.5], [17.6, -5.3], [15, -5], [11, -5.6], [6.5, -5.3], [3, -5.7], [1, -5.6], [.3, -5.8], [.1, -6.5], [0, -7.5], [-.1, -8.5], [-.3, -9.05],
  [-1.1, -9.3], [-3, -9.35], [-6.5, -8.8], [-10, -9.2], [-12.6, -8.5], [-14.4, -7.9]];
// the time goggles' slice sits deep under the hills, where nothing above it can be seen
const CUT = [0, -90, 0];

const sm = (a, b, v) => { const k = clamp01((v - a)/(b - a)); return k*k*(3 - 2*k); };
const hump = (x, z, [cx, cz], r) => Math.exp(-((x - cx)**2 + (z - cz)**2)/(r*r));
// the bowl's rim, wobbly all round, and a spot at angle a and fraction q of the way out to it
const wob = a => 1 + .07*Math.sin(2*a + 2.4) + .09*Math.sin(3*a + .7) + .06*Math.sin(5*a + 2.1) + .05*Math.sin(7*a + 1.2) + .03*Math.sin(11*a + .3) + .02*Math.sin(17*a + 1.9);
const edge = (x, z) => { const dx = x/RX, dz = (z - ZC)/RZ; return Math.hypot(dx, dz)/wob(Math.atan2(dz, dx)); };
const ringAt = (a, q) => [RX*q*wob(a)*Math.cos(a), ZC + RZ*q*wob(a)*Math.sin(a)];
const roadZ = x => x > 0 ? ROAD_Z + .4 : ROAD_Z - ROAD_OFF;
const FLATS = [[BUS, 3.2, 4.8], [HOUSE, 2, 3.2], [SEIS, 1.2, 2.2], [SPLIT, 1.6, 2.6]];

function base(x, z){
  const e = edge(x, z), a = Math.atan2((z - ZC)/RZ, x/RX);
  let flat = 1; for (const [[cx, cz], r0, r1] of FLATS) flat *= sm(r0, r1, Math.hypot(x - cx, z - cz));
  const roll = (.5*Math.sin(x*.19 + 1.3)*Math.sin(z*.21 + .4) + .28*Math.sin(x*.41 - z*.33 + 2) + .1*Math.sin(x*.93 + z*.71))*flat;
  // which side of the crack stands higher swaps along it, so it reads as a line of little cliffs
  const sc = .42*Math.sin(z*.27 + 1.1)*(.4 + .6*sm(1, 4, Math.abs(z - 2.5)));
  const tall = 3 + 9*sm(4, -20, z) + 5*sm(6, 24, x)*sm(6, -6, z);
  return roll + 2.6*hump(x, z, KNOLL, 3.4) + 2.8*hump(x, z, HILL_E, 4.6) + 1.6*sm(-12, -22, z) - .3*Math.exp(-((x/1.1)**2)) + sc*(sm(-.35, .35, x) - .5)
    - .9*hump(x, z, POND, 2.8) - .45*hump(x, z, SAG, 1.8) + .35*hump(x, z, SEEP, .8) + tall*sm(.84, 1.45, e)*(1 + .18*Math.sin(a*7) + .1*Math.sin(a*13 + 1));
}
// level across the road, so it lies flat
const raw = (x, z) => { const rz = roadZ(x), k = 1 - sm(1.4, 2.4, Math.abs(z - rz)), b = base(x, z); return k > 0 ? b + (base(x, rz) - b)*k : b; };

const CPTS = new THREE.CatmullRomCurve3(CREEK.map(([x, z]) => new THREE.Vector3(x, 0, z))).getSpacedPoints(170);
const CB = [Math.min(...CPTS.map(p => p.x)) - 5, Math.max(...CPTS.map(p => p.x)) + 5, Math.min(...CPTS.map(p => p.z)) - 5, Math.max(...CPTS.map(p => p.z)) + 5];
const nearC = (x, z) => { let d = Infinity, k = 0; CPTS.forEach((p, i) => { const q = (p.x - x)**2 + (p.z - z)**2; if (q < d) { d = q; k = i; } }); return [k, Math.sqrt(d)]; };
// the creek's bed only ever goes down, so its water does too
const BED = []; CPTS.forEach((p, i) => { BED.push(Math.min(i ? BED[i - 1] - .004 : Infinity, raw(p.x, p.z) - (i ? .2 : .12))); });
const creekW = i => (.2 + .35*sm(0, 14, i))*(1 + .12*Math.sin(i*.7));
// each pond fills to the lowest point of its rim, then bowls down under the water
const level = ([x, z], r) => { let m = Infinity; for (let a = 0; a < 6.28; a += .16) m = Math.min(m, raw(x + Math.cos(a)*r, z + Math.sin(a)*r)); return m - .05; };
const POND_R = 2.5, SAG_R = 1.3, POND_Y = Math.min(level(POND, POND_R), BED.at(-1) + .02), SAG_Y = level(SAG, SAG_R);
const BOWLS = [[POND, POND_R, POND_Y, .7], [SAG, SAG_R, SAG_Y, .4]];
// a ribbon of water along pts, wd(i) wide, its surface at y(i)
function stream(w, pts, wd, y, mat){ const cp = [], ci = [], cu = []; let along = 0;
  pts.forEach((q, i) => { const a = pts[Math.max(0, i - 1)], b = pts[Math.min(pts.length - 1, i + 1)], tx = b.x - a.x, tz = b.z - a.z, l = Math.hypot(tx, tz), r = wd(i);
    if (i) along += q.distanceTo(pts[i - 1]);
    for (const sd of [-1, 1]) { cp.push(q.x - tz/l*r*sd, y(i), q.z + tx/l*r*sd); cu.push(sd < 0 ? 0 : 1, along/1.2); }
    if (i < pts.length - 1) { const k = i*2; ci.push(k, k + 2, k + 1, k + 1, k + 2, k + 3); } });
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(cp, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(cu, 2)); g.setIndex(ci); g.computeVertexNormals();
  w.scene.add(new THREE.Mesh(g, mat)); }
function ground(x, z){
  let g = raw(x, z);
  // where the creek has cut down deep, its valley sides are wider, so they slope instead of walling it in
  if (x > CB[0] && x < CB[1] && z > CB[2] && z < CB[3]) { const [i, dc] = nearC(x, z), wd = 1.8 + 1.8*Math.max(0, g - BED[i] - .4);
    if (dc < wd) g += (BED[i] - .14*Math.exp(-((dc/.42)**2)) - g)*(1 - sm(.5, wd, dc)); }
  // under the water a bowl; from the shore at .95r the bank slopes gently up, never a cliff
  for (const [[cx, cz], r, y, deep] of BOWLS) { const d = Math.hypot(x - cx, z - cz);
    if (d < r*3) g = Math.min(g, d < r*.95 ? y - .03 - deep*Math.max(0, 1 - (d/r)**2) : y + .01 + .5*(d - r*.95)); }
  return g;
}

export function buildFault(t){
  const w = tripWorld({title:'Where Plates Slide', bg:0xf0d2b0, sky:0xfff0dc, groundCol:0x6a5a3a, hemi:.8, sunCol:0xffd6a4, sunI:.9, fogNear:70, fogFar:260,
    cam:{oy:7.4, oz:9.2, oyP:9.4, ozP:10.6}});
  w.far = 600;
  const S = {slip:0, bend:.5};
  const solid = [];
  w.ground = ground;
  // the bowl's rim is bushes, boulders and hills all round, with a ranch gate where the road goes out;
  // the ponds can be waded at the edges, and trunks and rocks are walked round
  w.bounds = (x, z) => edge(x, z) < .93 && Math.hypot(x - POND[0], z - POND[1]) > 1.3 && Math.hypot(x - SAG[0], z - SAG[1]) > .7 && solid.every(([sx, sz, r]) => Math.hypot(x - sx, z - sz) > r);
  // the water's surface wherever there is some, and null on the banks
  const seepY = ground(...SEEP) + .03;
  w.water = (x, z) => { if (Math.hypot(x - POND[0], z - POND[1]) < POND_R*.88) return POND_Y; if (Math.hypot(x - SAG[0], z - SAG[1]) < SAG_R*.88) return SAG_Y;
    if (Math.hypot(x - SEEP[0], z - SEEP[1]) < .38) return seepY;
    if (x < CB[0] || x > CB[1] || z < CB[2] || z > CB[3]) return null;
    const [i, dc] = nearC(x, z); return dc < creekW(i)*.85 ? BED[i] + .03 : null; };
  w.surface = (x, z) => Math.abs(z - roadZ(x) - (x > 0 ? S.slip : 0)) < .65 ? 'stone' : 'grass';
  w.area = x => Math.abs(x) < 1.4 ? 'The Fault Line' : x < 0 ? 'The Pacific Plate' : 'The North American Plate';
  w.spawn = [BUS[0] - 1.8, BUS[1] + 2.2, Math.PI];
  storySky(w, {sun:[-9, 16, 7], clouds3d:[[110, 38, -150, 28], [-60, 44, -170, 34], [170, 30, -60, 24], [-160, 34, -40, 26], [20, 52, -210, 36], [-120, 26, 120, 22], [140, 40, 110, 28], [60, 22, -70, 12]]});
  const posts = [], rails = [];
  let water, eastRoad, snack;
  inWorld(w, () => {
    // ---------- the land ----------
    const geo = new THREE.PlaneGeometry(240, 200, 330, 280); geo.rotateX(-Math.PI/2); geo.translate(0, 0, ZC);
    const p = geo.attributes.position;
    for (let i = 0; i < p.count; i++) p.setY(i, ground(p.getX(i), p.getZ(i)));
    geo.computeVertexNormals();
    // dry gold grass, greener by the water, browner down the fault's trough, ochre on the steep bits
    const n = geo.attributes.normal, cols = new Float32Array(p.count*3), c = new THREE.Color();
    const [gold, pale, green, trough, ochre] = [0xd8ae52, 0xe8cc84, 0x86a24a, 0xa8804a, 0xc08c3e].map(h => new THREE.Color(h));
    for (let i = 0; i < p.count; i++) { const x = p.getX(i), z = p.getZ(i), e = edge(x, z);
      const wet = Math.max(x > CB[0] && x < CB[1] && z > CB[2] && z < CB[3] ? 1 - sm(.5, 2.4, nearC(x, z)[1]) : 0, 1 - sm(POND_R - .4, POND_R + 1.8, Math.hypot(x - POND[0], z - POND[1])),
        1 - sm(SAG_R, SAG_R + 1.4, Math.hypot(x - SAG[0], z - SAG[1])));
      c.copy(gold).lerp(pale, .5 + .5*Math.sin(x*.21 + Math.sin(z*.17)*2)*Math.sin(z*.23 - x*.07)).lerp(ochre, sm(.95, 1.5, e)*.45 + sm(.92, .72, n.getY(i))*.6)
        .lerp(green, wet*.85).lerp(trough, Math.exp(-((x/1.1)**2))*.5*sm(1.1, .8, e));
      c.convertSRGBToLinear(); cols.set([c.r, c.g, c.b], i*3); }
    geo.setAttribute('color', new THREE.BufferAttribute(cols, 3));
    const grassTex = tex(256, 256, (g, cw, ch) => { g.fillStyle = '#f4ead8'; g.fillRect(0, 0, cw, ch);
      for (let i = 0; i < 900; i++) { g.fillStyle = ['#fff8e8', '#e0d0b0', '#ece0c4', '#d8c8a4'][i % 4]; g.fillRect(Math.random()*cw, Math.random()*ch, 2 + Math.random()*3, 1 + Math.random()*5); } }, 1, 1);
    const uv = geo.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, p.getX(i)/5, p.getZ(i)/5);
    const land = new THREE.Mesh(geo, T(0xffffff, {map:grassTex, vertexColors:true})); land.receiveShadow = true; w.scene.add(land);
    // far golden hills fading into the haze, so the land never ends at an edge
    for (let i = 0; i < 24; i++) { const a = i/24*Math.PI*2 + fr(-.1, .1), r = fr(100, 130), h = fr(14, 30)*(Math.sin(a) < 0 ? 1.3 : .7);
      bAdd([0xc8a058, 0xb89060, 0xa88a6a][i % 3], new THREE.SphereGeometry(1, 14, 8), XF(Math.cos(a)*r, -h*.25, Math.sin(a)*r + ZC, fr(30, 44), h, fr(26, 36), 0, a, 0)); }

    // ---------- the water: a spring, its creek, and the pond it fills ----------
    const waterTex = tex(128, 128, (g, cw, ch) => { g.fillStyle = '#4a8ac0'; g.fillRect(0, 0, cw, ch);
      g.strokeStyle = 'rgba(220,240,255,.5)'; g.lineWidth = 3; for (let i = 0; i < 9; i++) { g.beginPath(); const y = Math.random()*ch, x = Math.random()*cw; g.moveTo(x, y); g.quadraticCurveTo(x + 14, y - 6, x + 30, y); g.stroke(); } }, 1, 1);
    // tinted so the painted ripples come out the valley's deep blue
    water = T(0x64c8cf, {map:waterTex, emissive:0x0a2c48, emissiveIntensity:.2, side:THREE.DoubleSide});
    stream(w, CPTS, creekW, i => BED[i] + .03, water);
    add(new THREE.CircleGeometry(POND_R*.97, 40), water, POND[0], POND_Y, POND[1], null, false).rotation.x = -Math.PI/2; bank(w, POND, POND_R, POND_Y, .5, Math.atan2(CREEK.at(-1)[1] - POND[1], CREEK.at(-1)[0] - POND[0]));
    // the spring: water welling up out of a nest of rocks on the hillside
    const [sx0, sz0] = CREEK[0], sy0 = BED[0] + .05;
    add(new THREE.CircleGeometry(.5, 20), water, sx0 + .25, sy0, sz0, null, false).rotation.x = -Math.PI/2; bank(w, [sx0 + .25, sz0], .45, sy0, .25, Math.PI);
    for (let k = 0; k < 9; k++) { const a = k/9*Math.PI*2 + .3, r = fr(.55, .8), x = sx0 + .25 + Math.cos(a)*r, z = sz0 + Math.sin(a)*r, s = fr(.22, .42);
      if (Math.cos(a) < -.6) continue; bAdd([0x9a8e86, 0x8a7e78][k % 2], new THREE.DodecahedronGeometry(s, 0), XF(x, ground(x, z) + s*.25, z, 1.2, .8, 1.1, 0, fr(0, 6), 0), {ink:.03, shadow:true}); }
    for (const [x, z, s] of [[21.6, -4.1, .9], [22, -6.5, 1.1], [23.2, -5.2, 1.3]]) { solid.push([x, z, s*.8]);
      bAdd(0x8a7e78, new THREE.DodecahedronGeometry(s, 0), XF(x, ground(x, z) + s*.3, z, 1.2, .8, 1.1, fr(0, 1), fr(0, 6), 0), {ink:.05, shadow:true}); }
    // foam where the creek tumbles steeply down off the hill
    for (let i = 1; i < CPTS.length; i++) if (BED[i - 1] - BED[i] > .06) for (let k = 0; k < 2; k++) { const q = CPTS[i];
      bAdd(0xf6f4ee, new THREE.SphereGeometry(fr(.06, .11), 6, 4), XF(q.x + fr(-.2, .2), BED[i] + .05, q.z + fr(-.2, .2), 1.6, .3, 1)); }
    // pebbles along both banks, and reeds round the pond
    for (let i = 4; i < CPTS.length; i += 2) { const q = CPTS[i];
      for (const sd of [-1, 1]) if (frand() < .45) { const x = q.x + fr(-.3, .3), z = q.z + sd*fr(.7, .95), s = fr(.1, .2);
        bAdd([0x9a8e86, 0xb4aa9e, 0x8a7e78][i % 3], new THREE.DodecahedronGeometry(s, 0), XF(x, ground(x, z) + s*.2, z, 1.3, .6, 1, 0, fr(0, 6), 0), {ink:.02}); } }
    for (let i = 0; i < 30; i++) { const a = i/30*Math.PI*2 + fr(-.1, .1), r = POND_R + fr(-.1, .4), x = POND[0] + Math.cos(a)*r, z = POND[1] + Math.sin(a)*r;
      if (Math.abs(a - .1) < .5) continue;
      if (i % 3) for (let j = 0; j < 3; j++) bAdd(0x6a8a4a, new THREE.ConeGeometry(.04, .6 + .2*Math.sin(i + j), 3), XF(x + (j - 1)*.08, ground(x, z) + .28, z + Math.sin(j*2)*.07, 1, 1, 1, (j - 1)*.15, 0, Math.sin(i + j)*.2));
      else bAdd(0x9a8e86, new THREE.DodecahedronGeometry(fr(.15, .28), 0), XF(x, ground(x, z), z, 1.3, .6, 1, 0, fr(0, 6), 0), {ink:.02}); }

    // ---------- the fault ----------
    // a jagged crack the whole length of the bowl and on up the hills, hidden where water or the road crosses it
    const gap = z => (z > -9.6 && z < -5.2) || (z > ROAD_Z - ROAD_OFF - .9 && z < ROAD_Z + 1.9) || Math.abs(z - SAG[1]) < SAG_R + .4 || Math.abs(z - SEEP[1]) < .6
      || Math.abs(z - SPLIT[1] - SPLIT_OFF/2) < 1.5 || Math.abs(z - FENCE_Z) < .25;
    const crack = [], cmat = T(0x2a1e1a);
    for (let z = -27, k = 0; z < 18.5; z += .3, k++) { const x = .09*Math.sin(k*1.9) + .05*Math.sin(k*.7);
      if (!gap(z)) crack.push(new THREE.Vector3(x, 0, z));
      if ((gap(z) || z + .3 >= 18.5) && crack.length > 1) stream(w, crack.splice(0), i => .07 + .05*Math.abs(Math.sin(i*2.3)), i => 0, cmat);
      else if (gap(z)) crack.length = 0; }
    w.scene.children.forEach(m => { if (m.material !== cmat) return; const pa = m.geometry.attributes.position;
      for (let i = 0; i < pa.count; i++) pa.setY(i, ground(pa.getX(i), pa.getZ(i)) + .03); m.geometry.computeVertexNormals(); });
    // the rock the fault cut in two, a white stripe through it: the west half rode north, and the
    // grinding between them crushed a seam of pale, crumbly rock
    const stripe = (y, z) => Math.abs(z - .12 - .45*y) < .1;
    const halfRock = sx => { const g = new THREE.SphereGeometry(.95, 48, 32), gp = g.attributes.position;
      for (let i = 0; i < gp.count; i++) if (gp.getX(i)*sx < 0) gp.setX(i, 0);
      g.scale(1, .82, 1.05); g.computeVertexNormals();
      const gc = new Float32Array(gp.count*3), grey = new THREE.Color(0x8a7e86).convertSRGBToLinear(), white = new THREE.Color(0xf6efe0).convertSRGBToLinear();
      for (let i = 0; i < gp.count; i++) (stripe(gp.getY(i), gp.getZ(i)) ? white : grey).toArray(gc, i*3);
      g.setAttribute('color', new THREE.BufferAttribute(gc, 3));
      const root = grp(); outline(add(g, T(0xffffff, {vertexColors:true}), 0, .1, 0, root), 1.05);
      return root; };
    const wz = SPLIT[1], ez = SPLIT[1] + SPLIT_OFF;
    halfRock(-1).position.set(-.22, ground(-.6, wz), wz); halfRock(1).position.set(.22, ground(.6, ez), ez);
    solid.push([-.6, wz, .75], [.6, ez, .75]);
    for (let k = 0; k < 14; k++) { const z = wz - .6 + k*.18, s = fr(.06, .13);
      bAdd([0xf0e8d8, 0xe0d6c4, 0xd8ccb8][k % 3], new THREE.DodecahedronGeometry(s, 0), XF(fr(-.12, .12), ground(0, z) + s*.4, z, 1, .7, 1, 0, fr(0, 6), 0), {ink:.012}); }
    const seam = meshOf(new THREE.SphereGeometry(.55, 14, 6, 0, Math.PI*2, 0, Math.PI/2), 0xe6dccb, w.scene); seam.scale.set(.45, .18, 1.9); seam.position.set(0, ground(0, wz + .6) - .02, wz + .6);

    // ---------- the road, broken at the crack, and a new fence just beside it ----------
    const roadTex = tex(128, 64, (g, cw, ch) => { g.fillStyle = '#6a6470'; g.fillRect(0, 0, cw, ch); g.fillStyle = '#e9d9b8'; g.fillRect(0, ch/2 - 3, cw*.45, 6);
      g.fillStyle = '#4a4450'; g.fillRect(0, 0, cw, 5); g.fillRect(0, ch - 5, cw, 5); }, 1, 1);
    const road = (x0, x1, zc) => { const pos = [], uvs = [], idx = [], N = Math.ceil(Math.abs(x1 - x0)/.5);
      for (let i = 0; i <= N; i++) { const x = x0 + (x1 - x0)*i/N, y = raw(x, zc) + .05;
        for (const dz of [-.65, .65]) { pos.push(x, y, zc + dz - (x > 0 ? ROAD_Z : 0)); uvs.push(x/2, dz > 0 ? 1 : 0); }
        if (i < N) { const k = i*2; idx.push(...(x1 > x0 ? [k, k + 1, k + 2, k + 1, k + 3, k + 2] : [k, k + 2, k + 1, k + 1, k + 2, k + 3])); } }
      const rg = new THREE.BufferGeometry(); rg.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); rg.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2)); rg.setIndex(idx); rg.computeVertexNormals();
      const m = new THREE.Mesh(rg, T(0xffffff, {map:roadTex, side:THREE.DoubleSide})); m.receiveShadow = true; return m; };
    w.scene.add(road(-.06, -60, roadZ(-1)));
    // the east half rides its plate, so it moves when the fault slips
    eastRoad = grp(0, 0, ROAD_Z); eastRoad.add(road(.06, 60, ROAD_Z + .4));
    // chunks of broken road, at both ends of the break
    for (const [x, z] of [[-.2, roadZ(-1) - .4], [-.1, roadZ(-1) + .3], [.25, ROAD_Z + .1], [.15, ROAD_Z + .8], [-.35, roadZ(-1) + .55]]) { const s = fr(.12, .2);
      bAdd(0x5a5460, new THREE.DodecahedronGeometry(s, 0), XF(x, ground(x, z) + s*.3, z, 1.3, .5, 1, 0, fr(0, 6), 0), {ink:.015}); }
    // on out of the bowl both ways, through a ranch gate
    for (const sx of [-1, 1]) { let x = 0; while (edge(x, roadZ(sx)) < .96) x += sx*.2;
      const g = sx > 0 ? grp(x, 0, .4, 0, eastRoad) : grp(x, 0, roadZ(sx)), gy = raw(x, roadZ(sx));
      for (const dz of [-.95, .95]) outline(add(new THREE.CylinderGeometry(.09, .1, 1.3, 8), T(C.woodDk), 0, gy + .65, dz, g), 1.08);
      for (const y of [.35, .7, 1.05]) outline(add(new THREE.BoxGeometry(.07, .1, 1.9), T(0xe9d9b8), 0, gy + y, 0, g), 1.06);
      outline(add(new THREE.BoxGeometry(.06, .7, .1), T(0xe9d9b8), 0, gy + .7, 0, g), 1.06).rotation.x = .9; }
    // each post and rail a group, so the ink outline moves and stretches along with it
    const inked = (wd, h, d, y) => { const g = grp(0, y, FENCE_Z); g.userData.h = y; outline(add(new THREE.BoxGeometry(wd, h, d), T(C.cream), 0, 0, 0, g), 1.08); return g; };
    for (let x = -5.7; x < 6; x += .6) posts.push({m:inked(.09, .7, .09, .35), x});
    for (let i = 0; i < posts.length - 1; i++) rails.push([inked(1, .06, .05, .58), inked(1, .06, .05, .3)]);
    // Mo's snack, set down on a flat rock by the fence
    const rx = -2.6, rz = FENCE_Z + 1.3, gy = ground(rx, rz); solid.push([rx, rz, .55]);
    outline(add(new THREE.CylinderGeometry(.5, .62, .45, 7), T(0x8a7e86), rx, gy + .2, rz), 1.06);
    snack = box(.22, .06, .1, T(0xd9a441), rx + .1, gy + .46, rz);

    // ---------- the orchard: planted in one straight row, fifty years ago ----------
    const canopy = [], oranges = [];
    const tree = (x, z) => { const y = ground(x, z); solid.push([x, z, .35]);
      bAdd(C.woodDk, new THREE.CylinderGeometry(.08, .12, 1, 7), XF(x, y + .5, z), {ink:.02, shadow:true});
      canopy.push([x, y + 1.25, z, .66, 1], [x + .3, y + 1.45, z + .1, .44, 2], [x - .32, y + 1.05, z - .12, .46, 0], [x + .1, y + 1.1, z + .38, .4, 0]);
      for (let k = 0; k < 7; k++) { const a = k*.9 + fr(0, .5), el = fr(-.3, .6); oranges.push([x + Math.cos(a)*Math.cos(el)*.64, y + 1.25 + Math.sin(el)*.55, z + Math.sin(a)*Math.cos(el)*.64]); } };
    for (let x = -10; x < -1; x += 2.2) tree(x, ORCH_Z - ORCH_OFF);
    for (let x = 1; x < 12.5; x += 2.2) tree(x, ORCH_Z);
    for (const [x, y, z] of oranges) bAdd(0xf2963a, new THREE.SphereGeometry(.085, 8, 6), XF(x, y, z), {ink:.012});
    // a few old oaks inside, and many more up the hills, low and wide the way they grow in dry country
    const oak = (x, z, s) => { const y = ground(x, z);
      bAdd(0x5a3e2e, new THREE.CylinderGeometry(.14*s, .22*s, 1.3*s, 7), XF(x, y + .6*s, z, 1, 1, 1, .12, 0, .1), {ink:.03*s, shadow:true});
      canopy.push([x, y + 1.7*s, z, 1.05*s, 1], [x + .9*s, y + 1.5*s, z + .2*s, .75*s, 1], [x - .95*s, y + 1.5*s, z - .1*s, .78*s, 1], [x + .1*s, y + 1.45*s, z + .7*s, .7*s, 0],
        [x - .2*s, y + 2.15*s, z - .2*s, .72*s, 2], [x + .5*s, y + 2*s, z - .5*s, .6*s, 2]); };
    for (const [x, z, s] of [[-6.5, 9.6, 1.1], [7.4, 14.2, .9], [-19, 3, 1], [8, -18.4, .9], [18.4, 2.6, 1], [-6.2, -18.6, 1], [-15.6, 13.4, .9]]) { oak(x, z, s); solid.push([x, z, .45*s]); }
    for (let i = 0; i < 80; i++) { const a = fr(0, Math.PI*2), q = fr(1.1, 2.1), [x, z] = ringAt(a, q);
      if (z > 8 && q < 1.45) continue; oak(x, z, fr(.9, 1.6)); }
    // the bowl's edge, where the hills start to rise: clumps of brush of every size, a rocky outcrop to the
    // west, and gaps where the slope itself is the edge. Low along the south, where the camera looks in.
    const bush = (x, z, s) => { const y = ground(x, z), k = 3 + Math.floor(frand()*3);
      canopy.push([x, y + .55*s, z, .85*s, 1], [x + fr(-.2, .2)*s, y + 1.05*s, z, .55*s, 2]);
      for (let j = 0; j < k; j++) { const a = j/k*Math.PI*2 + fr(0, 1); canopy.push([x + Math.cos(a)*.9*s, y + .4*s, z + Math.sin(a)*.7*s, fr(.5, .68)*s, Math.sin(a) < 0 ? 0 : 1]); } };
    const rock = (x, z, s, c = 0x9a8a7a) => bAdd(c, new THREE.DodecahedronGeometry(s, 0), XF(x, ground(x, z) + s*.3, z, 1.3, fr(.7, 1.1), 1.1, fr(0, .4), fr(0, 6), 0), {ink:.04, shadow:true});
    for (let a = 0; a < Math.PI*2; a += fr(.05, .17)) { const [x, z] = ringAt(a, fr(.95, 1.1)), south = Math.sin(a) > .45;
      if (Math.abs(z - roadZ(x)) < 1.8) continue;
      if (Math.cos(a) < -.8 && Math.sin(a) < .3) { for (let k = 0; k < 3; k++) { const [rx, rz] = ringAt(a + fr(-.03, .03), fr(.98, 1.2)); rock(rx, rz, fr(.8, 2.3), [0x9a8a7a, 0x8a7e78, 0xa89a88][k]); } continue; }
      const r = frand();
      if (!south && r < .3) continue;
      if (r < .5) { rock(x, z, fr(.35, 1.1), [0x9a8a7a, 0x8a7e78][Math.floor(frand()*2)]); continue; }
      const n = 1 + Math.floor(frand()*4), s0 = fr(.5, 1.5)*(south ? .6 : 1);
      for (let k = 0; k < n; k++) bush(x + fr(-1, 1)*s0, z + fr(-1, 1)*s0, s0*fr(.7, 1.1)); }
    leafCloud(w.scene, canopy);
    // golden grass, orange poppies and purple lupines, thick by the edges and the water, sparse out in the open
    const clear = (x, z) => Math.abs(z - roadZ(x)) < 1.3 || (x > CB[0] && x < CB[1] && z > CB[2] && z < CB[3] && nearC(x, z)[1] < .8) || Math.hypot(x - POND[0], z - POND[1]) < POND_R + .4
      || Math.abs(x) < .5 || Math.hypot(x - BUS[0], z - BUS[1]) < 3.8 || Math.hypot(x - SPLIT[0], z - SPLIT[1] - .6) < 2 || Math.hypot(x - SAG[0], z - SAG[1]) < SAG_R + .5
      || Math.hypot(x - HOUSE[0], z - HOUSE[1]) < 2.4 || Math.hypot(x - SEIS[0], z - SEIS[1]) < 1.6 || (Math.abs(x) < 6.6 && Math.abs(z - FENCE_Z - .4) < 1.2);
    for (let i = 0; i < 700; i++) { const a = fr(0, Math.PI*2), [x, z] = ringAt(a, Math.sqrt(fr(0, 1))*1.02);
      if (clear(x, z)) continue; const y = ground(x, z), r = frand();
      if (r < .14) flower(x, z, y, fr(1.2, 1.9), 0xf2862a); else if (r < .2) flower(x, z, y, fr(1.6, 2.4), 0x8f7ad6); else grassTuft(x, z, y, fr(1.3, 2), [0xd8b04e, 0xc89a40, 0xe0c068][Math.floor(frand()*3)]); }
    bFlush(w.scene);
  });
  // where the fence crosses the fault: the ground east of it has slipped, and is bending
  const disp = x => (x > 0 ? S.slip : 0) + S.bend*(.5 + .5*Math.tanh(x/1.6));
  function settle(){
    eastRoad.position.z = ROAD_Z + S.slip;
    posts.forEach(p => { p.m.position.x = p.x; p.m.position.z = FENCE_Z + disp(p.x); p.m.position.y = ground(p.x, p.m.position.z) + .35; });
    rails.forEach(([a, b], i) => { const p = posts[i].m.position, q = posts[i + 1].m.position, dx = q.x - p.x, dz = q.z - p.z, L = Math.hypot(dx, dz), y = (p.y + q.y)/2 - .35;
      // the rails across the crack break when it slips
      const broke = posts[i].x < 0 && posts[i + 1].x > 0 && S.slip > .05;
      for (const r of [a, b]) { r.position.set((p.x + q.x)/2, y + r.userData.h, (p.z + q.z)/2); r.scale.x = L; r.rotation.y = -Math.atan2(dz, dx); r.visible = !broke; } });
  }
  settle();
  const boats = leafBoats(w, t);
  const slice = buildSlice(w);
  const bus = tripBus(w);
  const door = () => bus.door(.6);
  const cls = classmates(w, t, bus);
  const say = t.say;
  let snap = null, hop = -1;
  const sy = snack.position.y;
  w.anims.push((dt, tt) => {
    water.map.offset.y = -tt*.3;
    if (snap) { const e = ease(clamp01((tt - snap.t0)/.25)); S.bend = snap.b*(1 - e); S.slip = snap.s + snap.b*e; settle(); if (e >= 1) snap = null; }
    // the quake bounces Mo's snack off its rock and into the grass
    if (w.shake > 0 && hop < 0) hop = tt;
    if (hop >= 0) { const k = clamp01((tt - hop)/2), x0 = -2.5, z0 = FENCE_Z + 1.3;
      snack.position.set(x0 + k*1.9, sy*(1 - k) + (ground(x0 + 1.9, z0 + .9) + .03)*k + Math.abs(Math.sin(k*Math.PI*4))*.4*(1 - k), z0 + k*.9); snack.rotation.y = k*9; }
  });
  const roadShot = (pos, look) => { const y = ground(0, 2.6); pos.set(2.2, y + 7.2, ROAD_Z + 8); look.set(-.2, y, ROAD_Z - 1.6); };
  const fenceShot = (pos, look) => { const y = ground(0, FENCE_Z); pos.set(-1.4, y + 6.4, FENCE_Z + 8.2); look.set(.4, y + .2, FENCE_Z + .4); };

  // ---------- what the class finds ----------
  cls.find('basil', {name:'quake', at:[-2.1, roadZ(-1) + 1.1, Math.PI/2], call:"Somebody broke the road!", after:["My knees are still wobbly.", "Snap after snap. I'm keeping a list. Of snaps."],
    async scene(){
      t.cut(roadShot);
      await say([['basil', "Somebody broke the road, {name}! Look, the two halves don't line up."],
                 ['sparks', "Nobody broke it, Basil. That crack is where two plates meet."],
                 ['sparks', "The ground over there slid one way, and the ground over here slid the other."],
                 ['pip', "The WHOLE ground slid? What could drag something that big?"]]);
      const why = await t.ask('basil', "What do you think drags the plates along?", ["The slow, hot mantle underneath", "The wind blowing on them", "Cars driving over them"]);
      await say([['sparks', "Let's find out! Time goggles on, {name}. X-ray mode, so we can see under the ground."]]);
      await goggles(t, {shot:slice.shot, wide:slice.wide, years:450, dur:10, step:slice.step});
      t.cut(roadShot);
      await say([['basil', why === 0 ? "You were right! The mantle creeps along underneath, and drags the plates with it." : "It wasn't that. The mantle creeps along underneath, and drags the plates with it."],
                 ['sparks', "Remember the mantle, turning over ever so slowly? Under this plate it creeps one way, and under that one, the other."],
                 ['sparks', "But right at the crack, the rock is rough. It sticks. So the ground bends, and bends…"],
                 ['basil', "…and then SNAP! The road jumped!"],
                 ['sparks', "Snap after snap, for hundreds of years. That's how the road got broken."]]);
      if (await t.more('sparks', "Want to know what else pulls on the plates?"))
        await say([['sparks', "Where a plate dives down into the mantle, its cold, heavy edge sinks, and pulls the rest of the plate along behind it."],
                   ['mo', "Like a blanket sliding off the bed, when one end hangs down!"],
                   ['sparks', "Just like that! The creeping mantle and the sinking edges work together."]]);
      player.x = 3.8; player.z = FENCE_Z + 2.4; player.angle = Math.PI;
      t.cut(fenceShot);
      await say([['basil', "Um. Dr. Sparks? This fence looks new. And it's bending."],
                 ['sparks', "Good eye, Basil! The plates are stuck right now, so the ground here is bending, bit by bit."]]);
      const guess = await t.ask('basil', "What happens when it bends too far?", ["It snaps, and the ground shakes", "It bends forever", "It slides back slowly"]);
      await say([['basil', "I don't want to find out. I really, really don't want to—"]]);
      // the bend builds, creaking, until the rock gives all at once
      const b0 = S.bend; Sound.tone(140, {type:'sawtooth', dur:1.5, vol:.05, f2:90, cut:600}); Sound.hiss({dur:1.4, vol:.05, type:'bandpass', freq:300});
      await t.tween(1.5, k => { S.bend = b0 + (.9 - b0)*k*k; settle(); game.camShake = Math.max(game.camShake, k*.6); });
      snap = {t0:game.elapsed, b:S.bend, s:S.slip};
      await quake(w, t, cls, {where:[0, FENCE_Z], strength:1});
      t.cut((pos, look) => { const y = ground(0, FENCE_Z); pos.set(.4, y + 4.6, FENCE_Z + 7.2); look.set(0, y + .3, FENCE_Z + .6); });
      await say([['basil', guess === 0 ? "You were right. It bent and bent, then SNAPPED!" : "It didn't bend forever. It bent and bent, then SNAPPED!"],
                 ['mo', "Hey! My snack!"],
                 ['sparks', "Stuck plates bend, then snap free. That jolt is an earthquake."],
                 ['sparks', "Look: the fence broke at the crack, and the road slid farther too. One more snap."],
                 ['sparks', "And everyone did just right: drop, cover, and hold on!"],
                 ['basil', "I froze. But then I copied you, {name}."]]);
      wonders(3);
      await say([['basil', "The ground shakes, but now I know what to do!"]]);
      t.cut(null);
    }});
  const jog = [CPTS.findIndex(q => q.x < .9), CPTS.findIndex(q => q.x < -.9)];
  cls.find('juniper', {name:'creek', at:[-1.7, -7.3, Math.PI/2], pose:'crouch', call:"The creek is doing something weird!",
    after:["A creek that got pulled sideways. I'm drawing it twice!", "Float a leaf boat from anywhere on the bank. It goes all by itself!"],
    async scene(){
      await say([['juniper', "Look at this creek, {name}. It starts at a spring, way up on that hill."],
                 ['juniper', "Water always runs downhill. So I'll race a leaf boat down it. Watch where it goes!"]]);
      const b = boats.launch(CPTS.findIndex(q => q.x < 7)), t0 = game.elapsed;
      t.cut((pos, look) => { const p = b.g.position; pos.set(p.x + .8, p.y + 5.4, p.z + 6); look.copy(p); return true; });
      await say([['juniper', "There it goes! Down the creek, nice and straight…"]]);
      await t.until(() => b.s >= jog[0] || game.elapsed > t0 + 14);
      await say([['juniper', "Whoa! It turned! Now it's going along the crack."]]);
      await t.until(() => b.s >= jog[1] || game.elapsed > t0 + 20);
      await say([['juniper', "And now it turned again, and it's back on its way. Why the detour?"]]);
      t.cut((pos, look) => { pos.set(2.5, ground(0, -7) + 13, 1.5); look.set(-.4, ground(0, -7), -7.4); });
      const pick = await t.ask('juniper', "Why does the creek take a detour right at the crack?", ["The ground slid and dragged it", "A fish dug a shortcut", "It got lost"]);
      await say([['juniper', pick === 0 ? "You were right! The ground slid, and dragged the creek with it!" : "It wasn't a fish. The ground slid, and dragged the creek with it!"],
                 ['juniper', "Long ago, the creek ran straight across. Then the plates slid, a little every year."],
                 ['juniper', "So the creek runs along the crack to catch up with itself!"],
                 ['sparks', "Scientists hunt for creeks like this one. The longer the jog, the longer the plates have been sliding."]]);
      if (await t.more('sparks', "Want to know the names of these two plates?"))
        await say([['sparks', "Where Juniper is standing is the Pacific Plate. Across the crack is the North American Plate."],
                   ['pip', "Wait. So I could stand on two plates at once?"], ['sparks', "One foot on each! Just don't wait for them to move. It takes a while."]]);
      await say([['juniper', "Want to race? Float a leaf boat from anywhere on the bank!"]]);
      t.cut(null);
    }});
  const orchY = ground(-6, ORCH_Z);
  cls.find('pip', {name:'trees', at:[-11.7, ORCH_Z - ORCH_OFF + .9, Math.PI*.55], pose:'peer', call:"These trees are crooked! Come see!",
    after:["Fingernail speed! Slow, but it never, ever stops.", "See that hawk way up there? A red-tailed hawk. Its eyes can spot a mouse in the grass from way up in the sky!",
      "And guess what? When an eagle screams in a movie, it's often really a red-tailed hawk. Super cool scream."],
    async scene(){
      await say([['pip', "{name}! A farmer planted these orange trees in one straight row. About fifty years ago!"],
                 ['pip', "Whoever planted them was careful. But look down the row…"]]);
      player.x = -12.2; player.z = ORCH_Z - ORCH_OFF - 1; player.angle = Math.PI/2;
      t.cut((pos, look) => { pos.set(-13.6, orchY + 2.4, ORCH_Z - ORCH_OFF + .5); look.set(6, orchY + .6, ORCH_Z + .3); });
      Sound.tone(880, {type:'triangle', dur:.12, vol:.06});
      await say([['pip', "Straight, straight, straight, straight…"]]);
      t.cut((pos, look) => { pos.set(-3, orchY + 5.2, ORCH_Z + 8.5); look.set(.3, orchY + .6, ORCH_Z - .9); });
      await say([['pip', "…then, right at the crack, the trees jump over! About as far as a grown-up is tall."],
                 ['sparks', "The trees across the crack rode their plate along. Fifty years of sliding, all in one direction."],
                 ['pip', "So in fifty years, the plates slid THAT far. Then how fast is that?"]]);
      const fast = await t.ask('sparks', "So how fast do you think the plates slide?", ["About as fast as your fingernails grow", "As fast as a snail crawls", "As fast as a car drives"]);
      await say([['sparks', fast === 0 ? "Exactly right! About as fast as your fingernails grow." : "Even slower! About as fast as your fingernails grow."],
                 ['sparks', "A few centimeters every year. Add up fifty years of fingernails, and the trees have moved this far!"],
                 ['mo', "My fingernails are racing the plates? Go, fingernails!"]]);
      if (await t.more('basil', "Wait. So the ground is moving under us right now?"))
        await say([['sparks', "Right now! Very, very slowly. You'd never feel it."], ['basil', "I'm going to feel it. I'm feeling it already."],
                   ['juniper', "Basil, that's just your knees."]]);
      t.cut(null);
    }});
  const gougeAt = [0, SPLIT[1] + .6], gougeY = ground(...gougeAt);
  const dust = puffs(w, gougeAt[0], gougeY + .2, gougeAt[1], {rate:0, rise:.5, size:.7, color:0xf6efe0, opacity:.7, spread:.6, life:1.6});
  cls.find('mo', {name:'crumbs', at:[-1.8, SPLIT[1] + .3, Math.PI/2], pose:'point', call:"Somebody cut a rock in half!", after:["One rock, two halves, and crumbs in the middle. Like a sandwich!"],
    async scene(){
      t.cut((pos, look) => { pos.set(2.6, gougeY + 3, SPLIT[1] + 4); look.set(0, gougeY + .3, SPLIT[1] + .4); });
      await say([['mo', "{name}, look! Somebody sliced this rock in half, like a sandwich."], ['mo', "And then they slid the other half away. See? The white stripe doesn't line up!"],
                 ['sparks', "It used to be ONE rock, right on the crack, Mo. One half rode each plate."],
                 ['mo', "And in the middle there are crumbs! Soft and powdery, like flour."]]);
      const pick = await t.ask('mo', "What made the rock in the crack so crumbly?", ["The plates ground it up", "Somebody spilled their lunch", "Rain melted it"]);
      await say([['mo', "Only one way to find out. Rub some!"]]);
      // the rub is wherever the explorer stands, so there's no spot to hunt for
      player.x = 1.5; player.z = SPLIT[1] + 2.2; player.angle = -2.4;
      await t.free(t.use(w, {name:'Crumbly rock', x:1.2, z:SPLIT[1] + 1.6, y:gougeY, range:3, verb:'Rub the crumbly rock', short:'Rub', glow:[gougeAt[0], gougeY + .5, gougeAt[1]]}), 'Rub the crumbly rock');
      dust.burst = .4; Sound.hiss({dur:.6, vol:.07, type:'highpass', freq:2400});
      player.x = 2.4; player.z = SPLIT[1] - .6; player.angle = -1.6;
      t.cut((pos, look) => { pos.set(-1.4, gougeY + 2.2, gougeAt[1] + 3); look.set(0, gougeY + .2, gougeAt[1]); });
      await say([['mo', pick === 0 ? "You called it! It crumbles right into powder!" : "Whoa! It crumbles right into powder!"],
                 ['sparks', "When two plates grind past each other, the rock in between gets crushed, over and over again."],
                 ['sparks', "Crushed into crumbs and powder, like flour. Geologists call it fault gouge."],
                 ['sparks', "Crushed rock wears away easily, too. That's why a little valley runs all along the crack."],
                 ['mo', "Rocks, sliced and slid, and ground into crumbs. Now I'm hungry."]]);
      t.cut(null);
    }});
  cls.hint = () => !cls.saw('quake') ? "Basil is down by the broken road. Go see what's wrong!" :
    "Back to the bus whenever you're ready, {name}! Or go see anyone still waving. Or go exploring: what's up on the hills, and round the edges?";
  buildFinds(w, t, solid, water);

  return {world:w, bus, cls,
    // in low over the northern hills, round, and down beside the road
    async arrive(){
      bus.gear(null);
      t.watch(w, (pos, look) => { pos.set(bus.root.position.x*.4 + 4, Math.max(5, bus.root.position.y*.5 + 6), bus.root.position.z*.3 + 26); look.copy(bus.root.position); });
      Sound.tone(200, {type:'sawtooth', dur:4, vol:.03, f2:420, cut:900});
      await bus.fly([[-40, 34, -90], [-14, 22, -42], [8, 14, -22], [22, 8, -6], [19, 3, 6], [BUS[0] + 3, .8, BUS[1]], [BUS[0], 0, BUS[1]]], 7.5);
      bus.park(BUS[0], 0, BUS[1], BUS_RY);
      Sound.tone(330, {type:'triangle', dur:.12, vol:.08}); Sound.tone(494, {type:'triangle', t:.1, dur:.18, vol:.08});
      const [dx, dz] = door();
      t.cut((pos, look) => { pos.set(6, 15, 30); look.set(1, 0, -3); });
      cls.arrive({sparks:[dx + 1.3, dz + .5, -Math.PI*.6]});
      await t.wait(2.8);
      await say([['sparks', "Here we are, class! Right down the middle of these hills, two plates slide past each other."],
                 ['pip', "It just looks like a farm."],
                 ['sparks', "Look closer. Here, things don't line up the way they should. See what you can find!"],
                 ['basil', "Things that don't line up make me nervous."]]);
      if (await t.more('sparks', "Want to know where in the world a place like this is?"))
        await say([['sparks', "In California there's a fault just like this one. It's called the San Andreas Fault."],
                   ['sparks', "It runs for more than a thousand kilometers, over hills and farms and right through towns."],
                   ['juniper', "A crack longer than a whole country? I'm writing that down."]]);
      await say([['sparks', "Somebody's going to find something. When they wave, go and see!"]]);
      t.play(w, [dx - .2, dz + .4, Math.PI*1.5]);
      t.goal('Visit anyone who waves!');
    },
    async explore(next = "it's time to go!"){
      await t.until(() => cls.saw('quake') && !game.cutscene);
      await t.wait(.6);
      await say([['sparks', "Here, plates slide past each other. When they get stuck, they bend, and then they snap!"],
                 ['sparks', "That's why the ground shakes, {name}!"], ...cls.leaving(next)]);
      cls.gather([bus.root.position.x - 2, bus.root.position.z + 1.8, -Math.PI/2]);
      await cls.board(bus);
    },
    // up and away over the northern hills
    async depart(){
      for (const id in cls.n) { cls.n[id].model.root.visible = false; cls.n[id].label.visible = false; }
      t.watch(w, (pos, look) => { pos.set(6, 6, 18); look.copy(bus.root.position); });
      Sound.hiss({dur:3, vol:.1, type:'bandpass', freq:900, q:.6});
      await bus.fly([[BUS[0], 0, BUS[1]], [BUS[0] - 4, 3, BUS[1] - 1], [2, 10, -14], [-14, 22, -44], [-30, 34, -90]], 4.4, {roll:.6});
    },
  };
}

// Leaf boats, for racing down the creek: float one from anywhere along the bank and it goes on its own,
// at the water's pace, all the way down into the pond. A few can be afloat at once.
function leafBoats(w, t){
  const all = [0, 1, 2].map(() => { const g = grp(0, 0, 0, 0, w.scene); g.visible = false;
    const leaf = add(new THREE.SphereGeometry(.24, 12, 8), T(0xa8c85a), 0, 0, 0, g); leaf.scale.set(1.5, .32, .8); outline(leaf, 1.1);
    add(new THREE.CylinderGeometry(.012, .012, .3, 4), T(C.woodDk), 0, .15, 0, g, false);
    add(new THREE.PlaneGeometry(.18, .16), T(0xf6efe0, {side:THREE.DoubleSide}), .06, .2, 0, g, false);
    return {g, s:-1, done:0}; });
  const end = CPTS.length - 1;
  w.anims.push((dt, tt) => { for (const b of all) { if (b.s < 0) continue;
    if (b.s < end) { b.s = Math.min(end, b.s + dt*3.2); const i = Math.floor(b.s), f = b.s - i, a = CPTS[i], c = CPTS[Math.min(end, i + 1)];
      b.g.position.set(a.x + (c.x - a.x)*f, BED[i] + (BED[Math.min(end, i + 1)] - BED[i])*f + .08 + Math.sin(tt*4)*.02, a.z + (c.z - a.z)*f);
      b.g.rotation.y = Math.atan2(-(c.z - a.z), c.x - a.x) + Math.sin(tt*1.7)*.3; continue; }
    // out on the pond it drifts, spins and sinks away
    b.done += dt; b.g.position.x -= dt*.35; b.g.position.y = POND_Y + .06 - Math.max(0, b.done - 4)*.05; b.g.rotation.y += dt*.6;
    if (b.done > 6) { b.s = -1; b.g.visible = false; } } });
  const launch = i => { const b = all.find(b => b.s < 0) || all.reduce((o, b) => b.s > o.s ? b : o);
    Object.assign(b, {s:i, done:0}); b.g.visible = true; Sound.tone(620, {type:'sine', dur:.2, vol:.07, f2:900}); return b; };
  // the boat goes in wherever on the bank the explorer stands
  const u = addUsable(w, {name:'Leaf boat', verb:'Float a leaf boat', short:'Float', x:1e4, z:0, y:0, range:1.9, glow:[1e4, 0, 0], when: () => !t.busy, action(){ launch(u.i); }});
  w.anims.push(() => { const [i, d] = nearC(player.x, player.z); if (d > 1.7 || i >= CPTS.length - 4) { u.x = 1e4; return; }
    const q = CPTS[i]; u.i = i; u.x = q.x; u.z = q.z; u.y = BED[i]; u.glow[0] = q.x; u.glow[1] = BED[i] + .5; u.glow[2] = q.z; u.sparkle.position.x = q.x; u.sparkle.position.z = q.z; });
  return {launch};
}

// The ground cut open for the time goggles, with x-ray to see through the plates: the slow, hot mantle
// creeping one way under each plate drags them past each other, the rock at the crack sticks, the road
// across it bends, and every so often it all SNAPS. Painted, with ink, and set in the grassland it was cut from.
function buildSlice(w){
  const g = new THREE.Group(); g.position.set(...CUT); w.scene.add(g);
  const basic = o => new THREE.MeshBasicMaterial(Object.assign({fog:false}, o));
  const plane = (wd, h, m, x, y, z, rx = 0, parent = g) => { const o = new THREE.Mesh(new THREE.PlaneGeometry(wd, h), m); o.position.set(x, y, z); o.rotation.x = rx; parent.add(o); return o; };
  const ink = basic({color:0x1a1320}), L = 60, DZ = 5, D = 3, SNAPS = [.3, .6, .9];
  diorama(g, {ground:'grass', back:-DZ, deep:0x8a3420, D:55});
  // the grassland behind the cut rolls on, in soft humps and trees, so it never reads as a painted floor
  for (let i = 0; i < 46; i++) { const x = ((i*37.3) % 120) - 60, z = -DZ - 3 - ((i*17.7) % 46), r = 2 + (i % 4)*1.2;
    if (i % 3 === 0) { const hm = add(new THREE.SphereGeometry(r, 14, 8), T([0x9a7a30, 0x8e7e36, 0x82843c][i % 3]), x, -r*.72, z, g); hm.scale.y = .9; outline(hm, 1.02); continue; }
    outline(add(new THREE.CylinderGeometry(.06, .09, .5, 6), T(C.woodDk), x, .25, z, g, false), 1.1);
    outline(add(new THREE.ConeGeometry(.42, 1, 8), T(0x4f8a4a), x, .9, z, g, false), 1.08); }
  // the mantle: a deep orange slab, its top streaked with currents that creep each plate's own way
  const flow = dir => { const tx = tex(256, 128, (c, cw, ch) => { c.fillStyle = '#d8582a'; c.fillRect(0, 0, cw, ch);
      for (let i = 0; i < 14; i++) { c.fillStyle = i % 2 ? 'rgba(240,140,60,.6)' : 'rgba(160,50,30,.4)'; c.beginPath(); c.ellipse((i*53) % cw, (i*37) % ch, 40, 12, 0, 0, 7); c.fill(); }
      c.strokeStyle = '#ffd08a'; c.lineWidth = 9; c.lineJoin = 'round';
      for (const [x, y] of [[60, 34], [190, 34], [125, 96], [250, 96], [0, 96]]) { c.beginPath(); c.moveTo(x - 16*dir, y - 18); c.lineTo(x + 10*dir, y); c.lineTo(x - 16*dir, y + 18); c.stroke(); } }, L/6, DZ/3);
    return tx; };
  const nearFlow = flow(-1), farFlow = flow(1);
  plane(L, DZ, basic({map:nearFlow}), 0, -.55, DZ/2, -Math.PI/2); plane(L, DZ, basic({map:farFlow}), 0, -.55, -DZ/2, -Math.PI/2);
  const front = tex(512, 128, (c, cw, ch) => { const gr = c.createLinearGradient(0, 0, 0, ch); gr.addColorStop(0, '#e86a2c'); gr.addColorStop(1, '#8a2a20'); c.fillStyle = gr; c.fillRect(0, 0, cw, ch);
    c.strokeStyle = 'rgba(255,200,120,.45)'; c.lineWidth = 5; for (let i = 0; i < 9; i++) { c.beginPath(); c.arc(30 + i*60, 70, 22 + (i % 3)*8, Math.PI*.1, Math.PI*1.3); c.stroke(); } }, L/15, 1);
  plane(L, 2.5, basic({map:front}), 0, -1.8, DZ);
  const crust = tex(256, 32, (c, cw, ch) => { c.fillStyle = '#8a5a3e'; c.fillRect(0, 0, cw, ch); c.fillStyle = '#a8784e'; c.fillRect(0, 8, cw, 8); c.fillStyle = '#6a4434'; c.fillRect(0, 22, cw, 10);
    c.fillStyle = '#5a9a4a'; c.fillRect(0, 0, cw, 4); }, L/4, 1);
  for (const [y, h] of [[0, .05], [-.52, .05], [-3.05, .06]]) plane(L, h, ink, 0, y, DZ + .01);
  plane(.07, .55, ink, 0, -.27, DZ + .02);
  // the two plates, one moving each way, see-through so the mantle shows; each carries its trees and its arrow
  const grass = tex(256, 256, (c, cw, ch) => { c.fillStyle = '#c8c46a'; c.fillRect(0, 0, cw, ch);
    for (let i = 0; i < 70; i++) { c.fillStyle = i % 2 ? '#dcd890' : '#a8b058'; c.beginPath(); c.ellipse((i*97) % cw, (i*61) % ch, 14, 6, i, 0, 7); c.fill(); } }, L/5, DZ/5);
  const arrowGeo = new THREE.ShapeGeometry(new THREE.Shape([[-.9, .3], [.2, .3], [.2, .62], [1, 0], [.2, -.62], [.2, -.3], [-.9, -.3]].map(([x, y]) => new THREE.Vector2(x, y))));
  const plate = (sz, dir) => { const p = new THREE.Group(); g.add(p);
    plane(L, DZ, basic({map:grass, transparent:true, opacity:.6, depthWrite:false}), 0, 0, sz*DZ/2, -Math.PI/2, p);
    if (sz > 0) plane(L, .5, basic({map:crust}), 0, -.27, DZ, 0, p);
    const a = new THREE.Group(); a.position.set(-dir*3.2, .05, sz*3.1); a.rotation.x = -Math.PI/2; a.scale.set(dir*1.3, 1.3, 1); p.add(a);
    a.add(new THREE.Mesh(arrowGeo, basic({color:0xffd36b, side:THREE.DoubleSide}))); const o = new THREE.Mesh(arrowGeo, basic({color:0x1a1320, side:THREE.DoubleSide})); o.scale.setScalar(1.14); o.position.set(-.05, 0, -.01); a.add(o);
    for (const x of [-7, -4.6, 4.2, 7.4]) { const z = sz*(1.2 + Math.abs(x*.37 % 1)*2.6);
      outline(add(new THREE.CylinderGeometry(.05, .07, .4, 6), T(C.woodDk), x, .2, z, p, false), 1.1);
      outline(add(new THREE.ConeGeometry(.32, .75, 8), T(0x4f8a4a), x, .7, z, p, false), 1.08); }
    return p; };
  const nearP = plate(1, -1), farP = plate(-1, 1);
  plane(L, .09, ink, 0, .06, 0, -Math.PI/2);
  // the road across the crack, two strips so it can break there; each end rides its plate, the middle sticks
  const N = 40, roadM = basic({color:0x6a6470, side:THREE.DoubleSide}), rim = basic({color:0x1a1320, side:THREE.DoubleSide});
  const strip = (sd, wd, y, m) => { const geo = new THREE.BufferGeometry(), idx = [];
    for (let i = 0; i < N; i++) { const a = i*2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
    geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array((N + 1)*6), 3)); geo.setIndex(idx);
    const o = new THREE.Mesh(geo, m); o.frustumCulled = false; o.userData = {sd, wd, y}; g.add(o); return o; };
  const roads = [1, -1].flatMap(sd => [strip(sd, .5, .08, rim), strip(sd, .4, .09, roadM)]);
  const dash = [1, -1].map(sd => strip(sd, .05, .1, basic({color:0xe9d9b8, side:THREE.DoubleSide})));
  const mantleL = label(g, 'the slow, hot mantle', .85, [0, -1.25, DZ + .3], {text:'the slow,\nhot mantle', at:[0, -2.4, DZ + .3]}),
    stuck = label(g, 'stuck!', .9, [1.6, 1.3, .4], {at:[1.8, 1.8, .4]}), snapL = label(g, 'SNAP!', 1.3, [0, 1.7, .2], {at:[0, 2.6, .2]});
  let last = 0, snapAt = -9;
  function step(k){
    const Dk = D*k, n = SNAPS.filter(s => k >= s).length, slipped = n*D*.3, strain = Dk - slipped;
    if (k === 0) last = 0;
    if (n > last) { last = n; snapAt = game.elapsed; game.camShake = 2.4; Sound.tone(60, {dur:.5, vol:.15, f2:35}); Sound.hiss({dur:.4, vol:.12, type:'lowpass', freq:300}); }
    nearP.position.x = -Dk/2; farP.position.x = Dk/2;
    nearFlow.offset.x = k*.8; farFlow.offset.x = -k*.8;
    const at = z => -(slipped/2)*Math.sign(z) - (strain/2)*Math.tanh(z/1.1);
    for (const o of [...roads, ...dash]) { const {sd, wd, y} = o.userData, pa = o.geometry.attributes.position;
      for (let i = 0; i <= N; i++) { const z = sd*(.03 + (DZ - .03)*i/N), dx = (at(z + .01) - at(z - .01))/.02, l = Math.hypot(1, dx), x = at(z);
        pa.setXYZ(i*2, x - wd/2/l, y, z + wd/2*dx/l); pa.setXYZ(i*2 + 1, x + wd/2/l, y, z - wd/2*dx/l); }
      pa.needsUpdate = true; }
    const since = game.elapsed - snapAt;
    stuck.set(since > .7 ? clamp01(strain/(D*.3)*2 - .5) : 0); mantleL.set();
    snapL.set(clamp01(1 - since/1.1), 1 + .3*clamp01(1 - since*3));
  }
  step(0);
  return {step, wide:6.8, shot: (pos, look) => { pos.set(CUT[0], CUT[1] + 5.8, CUT[2] + 15.4); look.set(CUT[0], CUT[1] - 1.2, CUT[2] - .2); return true; }};
}

// ---------- things to find, for anyone who goes exploring ----------
// Round the edges, up the hills and along the crack: each a curio with a little science of this place,
// some with something to do. The valley's wildlife lives here too, as scenery. Each solid thing goes in
// `solid`, to be walked round.
// A soft wet bank round a pool, finer than the land's mesh so the shore is a smooth wobbly curve: mud at the
// water's edge, greening out onto the grass. It hugs the ground, just above it, and covers the water's rim.
function bank(w, [cx, cz], r, y, wd = .5, gap = null){
  const N = 72, R = 4, pos = [], col = [], idx = [], mud = new THREE.Color(0x56602e).convertSRGBToLinear(), grass = new THREE.Color(0x86a24a).convertSRGBToLinear(), c = new THREE.Color();
  for (let i = 0; i <= N; i++) { const a = i/N*Math.PI*2, wb = 1 + .05*Math.sin(a*3 + r*7) + .03*Math.sin(a*7 + r);
    for (let j = 0; j <= R; j++) { const k = j/R, rr = (r*.9 + (r + wd - r*.9)*k)*(j ? 1 : wb), x = cx + Math.cos(a)*rr, z = cz + Math.sin(a)*rr;
      pos.push(x, Math.max(y + .012, ground(x, z) + .04), z); c.copy(mud).lerp(grass, k*k); col.push(c.r, c.g, c.b); }
    // left open where a stream runs in or out
    if (i < N && !(gap !== null && Math.abs(Math.atan2(Math.sin(a + Math.PI/N - gap), Math.cos(a + Math.PI/N - gap))) < .3)) for (let j = 0; j < R; j++) { const k = i*(R + 1) + j; idx.push(k, k + 1, k + R + 1, k + 1, k + R + 2, k + R + 1); } }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3)); g.setIndex(idx); g.computeVertexNormals();
  const m = new THREE.Mesh(g, T(0xffffff, {vertexColors:true, side:THREE.DoubleSide})); m.receiveShadow = true; w.scene.add(m);
}
function buildFinds(w, t, solid, water){
  const near = ([x, z]) => Math.hypot(player.x - x, player.z - z);
  const life = [];
  const ripples = (x, y, z, r) => { const rs = [0, 1, 2].map(() => { const m = add(new THREE.RingGeometry(.8, 1, 20), new THREE.MeshBasicMaterial({color:0xe8f6ff, transparent:true, opacity:0, depthWrite:false}), x, y + .01, z, w.scene, false); m.rotation.x = -Math.PI/2; return m; });
    let boost = 0;
    life.push((dt, tt) => { boost = Math.max(0, boost - dt); rs.forEach((m, i) => { const k = (tt*(.5 + boost) + i/3) % 1; m.scale.setScalar(r*(.15 + k)); m.material.opacity = .6*(1 - k); }); });
    return () => { boost = 2.5; }; };

  // ---------- the sag pond, with a pair of ducks and their duckling, fed by a spring in the crack ----------
  const sy = SAG_Y;
  add(new THREE.CircleGeometry(SAG_R*.97, 32), water, SAG[0], sy, SAG[1], w.scene, false).rotation.x = -Math.PI/2; bank(w, SAG, SAG_R, sy, .5, -Math.PI/2);
  for (let k = 0; k < 18; k++) { const a = k/18*Math.PI*2 + Math.sin(k*3)*.15, r = SAG_R + .1 + .15*Math.sin(k*5), x = SAG[0] + Math.cos(a)*r, z = SAG[1] + Math.sin(a)*r;
    if (Math.abs(a - 4.71) < .5) continue;
    if (k % 4 === 3) { bAdd(0x9a8e86, new THREE.DodecahedronGeometry(.16, 0), XF(x, ground(x, z), z, 1.3, .6, 1, 0, a, 0), {ink:.02}); continue; }
    for (let j = 0; j < 3; j++) bAdd(0x6a8a4a, new THREE.ConeGeometry(.035, .5 + .2*Math.sin(k + j), 3), XF(x + (j - 1)*.07, ground(x, z) + .22, z + Math.sin(j*2)*.06, 1, 1, 1, (j - 1)*.15, 0, Math.sin(k + j)*.2)); }
  // the spring: a little pool welling up right in the crack, and a trickle down into the sag pond
  const seepY = ground(...SEEP) + .03;
  add(new THREE.CircleGeometry(.42, 18), water, SEEP[0], seepY, SEEP[1], w.scene, false).rotation.x = -Math.PI/2; bank(w, SEEP, .38, seepY, .25, Math.PI/2);
  for (let k = 0; k < 7; k++) { const a = k/7*Math.PI*2, x = SEEP[0] + Math.cos(a)*.55, z = SEEP[1] + Math.sin(a)*.5; if (Math.sin(a) > .6) continue;
    bAdd(0x9a8e86, new THREE.DodecahedronGeometry(fr(.12, .2), 0), XF(x, ground(x, z) + .05, z, 1.3, .7, 1, 0, a, 0), {ink:.02}); }
  const trickle = [], ty = []; for (let i = 0; i <= 10; i++) { const z = SEEP[1] + .3 + i*(SAG[1] - SAG_R - SEEP[1] + .1)/10, x = SEEP[0] + Math.sin(i*.8)*.08;
    trickle.push(new THREE.Vector3(x, 0, z)); ty.push(Math.min(i ? ty[i - 1] : seepY, Math.max(ground(x, z) + .03, sy + .01))); }
  stream(w, trickle, i => .1 + .02*Math.sin(i), i => ty[i], water);
  bFlush(w.scene);
  const bubble = ripples(SEEP[0], seepY, SEEP[1], .4);
  const ducks = [duck(w.scene, true), duck(w.scene, false), duck(w.scene, false)];
  ducks[2].g.scale.setScalar(.55);
  let quack = 0;
  life.push((dt, tt) => { quack = Math.max(0, quack - dt);
    ducks.forEach((d, i) => { const a = tt*.35 + i*.5 - (i === 2 ? .45 : 0), r = i === 2 ? .55 : .62 - i*.05;
      d.g.position.set(SAG[0] + Math.cos(a)*r, sy + .02 + Math.sin(tt*2 + i)*.01, SAG[1] + Math.sin(a)*r*.8); d.g.rotation.y = -a + Math.PI;
      d.head.rotation.x = quack > 0 ? Math.sin(tt*20)*.3 : Math.max(0, Math.sin(tt*.6 + i*2) - .8)*3; }); });
  curio(w, t, {name:'Ducks', at:SAG, y:sy + .7, lift:0, view:[-1, .3],
    lines:[['sparks', "A sag pond! Right on the fault, the ground got stretched and sank into a dip."],
      ['sparks', "Rain and springs fill the dips up. All along a fault like this, you find little ponds in a row."],
      ['mo', "And ducks! Hello, ducks. I'd share my crumbs, but my snack is still missing."]],
    from:[SAG[0] - 1.6, SAG[1] + .6], act: () => { quack = 1.6; [0, .3, .7].forEach(d => Sound.tone(420, {type:'sawtooth', t:d, dur:.12, vol:.03, f2:300, cut:1200})); }});
  curio(w, t, {name:'Bubbling spring', verb:'Listen to the spring', at:SEEP, y:seepY + .5, lift:0, view:[.9, .5],
    lines:[['sparks', "Hear that? Blub, blub. Water is bubbling up, right out of the crack!"],
      ['sparks', "Deep down, the rock along the crack is all cracked and broken. Water can squeeze up through it."],
      ['sparks', "So springs pop up in a line along a fault. This one keeps the duck pond full."],
      ['basil', "A crack that makes springs AND ponds? Okay. That one I like."]],
    from:[SEEP[0] + 1.4, SEEP[1] - .4], act: () => { bubble(); [0, .25, .6, .8].forEach(d => Sound.tone(300 + d*200, {type:'sine', t:d, dur:.08, vol:.04, f2:700})); }});

  // ---------- ground squirrels, whose tunnels the crack cuts through ----------
  const sqs = [[0, 0, .4], [1.3, .7, -.6], [-1.9, 1, 1.2]].map(([dx, dz, ry]) => { const x = BURROWS[0] + dx, z = BURROWS[1] + dz, y = ground(x, z);
    meshOf(new THREE.SphereGeometry(.34, 12, 6, 0, Math.PI*2, 0, Math.PI/2), 0xb08a58, w.scene).position.set(x, y - .12, z);
    add(new THREE.CircleGeometry(.13, 12), T(0x2a1e1a), x, y + .06, z + .2, w.scene, false).rotation.x = -Math.PI/2.4;
    const s = groundSquirrel(w.scene, x, y + .05, z + .2, ry); s.up = 0; return s; });
  life.push((dt, tt) => { const d = near(BURROWS), looking = game.cutscene && d < 5;
    sqs.forEach((s, i) => { const want = looking || (d < 10 && d > 2.6 + i*.4) ? 1 : 0; s.up += (want - s.up)*Math.min(1, dt*(want ? 4 : 12)); s.flag = looking ? 1 : 0; s.tick(dt, tt); }); });
  curio(w, t, {name:'Little burrows', at:BURROWS, y:ground(...BURROWS) + .9, lift:.2, view:[1, .2],
    lines:[['sparks', "California ground squirrels! Their tunnels run every which way, right under the crack."],
      ['sparks', "Every time the plates slip, a tunnel across the crack gets cut in two. So the squirrels just dig a new one!"],
      ['sparks', "They have a trick for rattlesnakes, too: they wave their tails, and make them warm!"],
      ['sparks', "Rattlesnakes can sense warmth. So a hot, waving tail says: 'I see you, snake. Go away!'"],
      ['basil', "Wait. There are SNAKES here?"]]});

  // ---------- a seismometer: a sensor buried in the ground, and a drum that draws every shake ----------
  const sg = grp(SEIS[0], ground(...SEIS), SEIS[1], -.5, w.scene); solid.push([SEIS[0], SEIS[1], .9]);
  outline(box(1.6, .12, 1.1, T(0xb4aaa0), 0, .06, 0, sg), 1.04);
  outline(add(new THREE.SphereGeometry(.3, 14, 8, 0, Math.PI*2, 0, Math.PI/2), T(C.cream), -.45, .12, -.15, sg), 1.08);
  outline(box(.7, .5, .45, T(0x5a8aa8), .28, .37, -.12, sg), 1.05);
  const paper = tex(512, 128, (c, cw, ch) => { c.fillStyle = '#f6efe0'; c.fillRect(0, 0, cw, ch); });
  paper.wrapS = THREE.RepeatWrapping; const pc = paper.image.getContext('2d');
  const axle = grp(.28, .78, -.12, 0, sg); axle.rotation.z = Math.PI/2;
  const drum = add(new THREE.CylinderGeometry(.16, .16, .62, 24), T(0xffffff, {map:paper}), 0, 0, 0, axle, false);
  for (const sx of [-1, 1]) outline(add(new THREE.CylinderGeometry(.17, .17, .03, 24), T(0x6b4430), 0, sx*.32, 0, axle, false), 1.06);
  const pen = grp(.28, .96, -.12, 0, sg); add(new THREE.BoxGeometry(.03, .03, .34), T(0x2a2224), 0, 0, -.17, pen, false); sph(.025, T(0xc0483a), 0, -.02, 0, pen, 6);
  // the solar panel that keeps it listening day and night
  add(new THREE.CylinderGeometry(.03, .03, 1.3, 6), T(0x8a8a8a), -.6, .7, .35, sg);
  outline(box(.6, .04, .42, T(0x2a3a6a), -.6, 1.38, .35, sg), 1.06).rotation.x = .5;
  let phase = 0, kick = 0, kickV = 0, last = 0, px = player.x, pz = player.z, stompAt = -1;
  const stomp = () => { player.y += .12; player.vy = 4.5; stompAt = game.elapsed + .38; };
  life.push((dt, tt) => {
    const sp = Math.hypot(player.x - px, player.z - pz)/Math.max(dt, 1e-3), d = near(SEIS); px = player.x; pz = player.z;
    if (stompAt > 0 && game.elapsed >= stompAt) { stompAt = -1; kickV += 26; game.camShake = Math.max(game.camShake, .8); Sound.tone(70, {dur:.25, vol:.12, f2:45}); }
    // a springy kick for a stomp, footsteps nearby, and every quake, with a tiny hum underneath it all
    kickV += (-kick*90 - kickV*5)*dt; kick += kickV*dt;
    const amp = Math.max(-1, Math.min(1, kick*.6 + .04*Math.sin(tt*37) + .03*Math.sin(tt*91) + (sp > .5 && d < 5 ? (Math.random() - .5)*.25*(1 - d/5) : 0) + (Math.random() - .5)*game.camShake*.4));
    phase = (phase + dt*.05) % 1;
    const x = phase*512, y = 64 + amp*52;
    pc.fillStyle = '#f6efe0'; pc.fillRect(x, 0, 14, 128); pc.fillStyle = 'rgba(120,150,190,.25)'; pc.fillRect(x, 63, 14, 2);
    pc.strokeStyle = '#2a2a4a'; pc.lineWidth = 2.5; pc.beginPath(); pc.moveTo(x - (x < 3 ? 0 : 3), last); pc.lineTo(x, y); pc.stroke(); last = y;
    paper.needsUpdate = true;
    drum.rotation.y = Math.PI/2 - phase*Math.PI*2; pen.position.x = .28 + amp*.25; });
  curio(w, t, {name:'Little white station', verb:'Stomp the ground!', at:[SEIS[0], SEIS[1]], y:ground(...SEIS) + 1.2, lift:.7, view:[-.4, 1],
    lines:[['sparks', "See that wiggle on the drum? That's YOUR stomp!"],
      ['sparks', "This is a seismometer. It feels the ground shake, even shakes far too small for us to feel."],
      ['sparks', "Around the world, thousands of tiny earthquakes happen every single day. Most are so small that only machines like this notice."],
      ['basil', "Thousands? Every DAY?"],
      ['sparks', "Tiny ones, Basil. Scientists listen to them all, to learn how the plates are moving."]],
    from:[SEIS[0] - .3, SEIS[1] + 1.4], act: () => { stompAt = game.elapsed + .15; }});
  addUsable(w, {name:'Seismometer', verb:'Stomp the ground!', short:'Stomp', x:SEIS[0] - .3, z:SEIS[1] + 1.4, y:ground(SEIS[0] - .3, SEIS[1] + 1.4), range:2.2,
    glow:[SEIS[0], ground(...SEIS) + 1.2, SEIS[1]], when: () => w.curios.seen.has('Little white station') && !t.busy, action: stomp});

  // ---------- a house built to ride out earthquakes, which sways when one comes ----------
  const hg = grp(HOUSE[0], ground(...HOUSE), HOUSE[1], Math.atan2(-HOUSE[0], -HOUSE[1]), w.scene); solid.push([HOUSE[0], HOUSE[1], 1.7]);
  outline(box(2.5, .3, 2, T(0xb4aaa0), 0, .15, 0, hg), 1.03);
  for (let k = 0; k < 5; k++) for (const sz of [-1, 1]) { const b = add(new THREE.CylinderGeometry(.04, .04, .05, 6), T(0x3a3238), -1 + k*.5, .2, sz*1.01, hg, false); b.rotation.x = Math.PI/2; }
  const body = grp(0, .3, 0, 0, hg);
  outline(box(2.3, 1.4, 1.8, T(0xf0e2c4), 0, .7, 0, body), 1.03);
  for (const sx of [-1, 1]) { const r = outline(box(1.4, .08, 2.1, T(0xa84a3a), sx*.6, 1.68, 0, body), 1.04); r.rotation.z = -sx*.62; }
  outline(box(.45, .8, .06, T(C.woodLt), .55, .4, .92, body), 1.06);
  outline(box(.42, .36, .06, T(0x9ad0e8), -.55, .8, .92, body), 1.08);
  // wooden cross-braces on the walls, so they can't fold over when the ground sways
  for (const x of [-.6, .6]) for (const sd of [-1, 1]) { const b = outline(box(.07, 1.55, .05, T(C.woodDk), x, .7, -.92, body), 1.1); b.rotation.z = sd*.62; }
  for (const sx of [-1.17, 1.17]) for (const sd of [-1, 1]) { const b = outline(box(.05, 1.55, .07, T(C.woodDk), sx, .7, 0, body), 1.1); b.rotation.x = sd*.72; }
  life.push((dt, tt) => { body.rotation.z = Math.sin(tt*7)*.04*(w.shake || 0); });
  curio(w, t, {name:'A sturdy house', at:[HOUSE[0], HOUSE[1]], y:ground(...HOUSE) + 2.4, lift:1.1, view:[.8, .7],
    lines:[['basil', "This house has big X's on its walls. Is it a treasure map?"],
      ['sparks', "Those are braces, Basil. They keep the walls stiff, so the house can't fold over when the ground shakes."],
      ['sparks', "And see the bolts at the bottom? They hold the house tight to its base, so it can't slide off."],
      ['sparks', "Tall buildings near faults are built to sway a little, like a tree in the wind, instead of cracking."],
      ['basil', "A house that's ready for earthquakes. I like this house."]],
    from:[HOUSE[0] + 2, HOUSE[1] + 1.6]});

  // ---------- a patch of poppies ----------
  const pet = [], stems = [];
  for (let k = 0; k < 16; k++) { const a = k*2.4, r = .25 + .12*k**.8, x = POPPIES[0] + Math.cos(a)*r, z = POPPIES[1] + Math.sin(a)*r*.7, y = ground(x, z), h = .3 + .08*Math.sin(k*1.7);
    stems.push([new THREE.CylinderGeometry(.012, .015, h, 4), XF(x, y + h/2, z)]);
    for (let j = 0; j < 4; j++) { const b = j*Math.PI/2 + k; pet.push([new THREE.SphereGeometry(.07, 7, 5), XF(x + Math.cos(b)*.05, y + h + .04, z + Math.sin(b)*.05, .9, .35, 1.2, 0, -b, .9)]); } }
  meshOf(mergeGeos(stems), 0x6a9a4a, w.scene); meshOf(mergeGeos(pet), 0xf28a2a, w.scene, .01);
  curio(w, t, {name:'Orange flowers', at:POPPIES, y:ground(...POPPIES) + .5, lift:0, view:[.2, 1],
    lines:[['juniper', "California poppies! I'm pressing one in my notebook. Well, a drawing of one."],
      ['sparks', "Poppies close their petals up at night and on cloudy days, then open again when the sun comes back."],
      ['juniper', "Flowers with a bedtime!"]]});

  // ---------- up on the knoll, a jutting rock to see the whole crack from ----------
  const ky = ground(...KNOLL), top = [KNOLL[0] + .5, KNOLL[1] - .3]; solid.push([top[0], top[1], .9]);
  bAdd(0x9a8a7a, new THREE.DodecahedronGeometry(1, 0), XF(top[0], ky + .3, top[1], 1.3, .7, 1, .2, .6, 0), {ink:.05, shadow:true});
  bAdd(0x8a7e78, new THREE.DodecahedronGeometry(.7, 0), XF(top[0] + .9, ky + .9, top[1] - .2, 1.6, .35, .8, 0, .3, -.15), {ink:.04, shadow:true});
  bFlush(w.scene);
  curio(w, t, {name:'High rock', verb:'Look along the crack', at:[top[0] + 1.2, top[1] - .2], y:ky + 1.4, lift:.6, view:[-1, .4],
    lines:[['sparks', "What a view! Follow the crack with your eyes, {name}."],
      ['sparks', "Past the duck pond, across the road, along the creek, and on over the hills. It goes on for miles and miles."],
      ['sparks', "Earthquakes happen along cracks like this, where plates meet. Far from the cracks, the ground hardly ever shakes."],
      ['basil', "So where you live tells you how much shaking you get?"],
      ['sparks', "Exactly! That's why people near faults practice earthquake drills, and build sturdy houses."]],
    from:[top[0] - 1.2, top[1] + 1.2], act: async () => { await t.wait(1.2); const y = ground(0, 0);
      t.cut((pos, look) => { pos.set(top[0] - 1.5, ky + 4.6, top[1] + 4); look.set(1.5, y, -6); }); }});

  // ---------- an old dead tree at the edge, for the hawk's lookout ----------
  const sny = ground(...SNAG); solid.push([SNAG[0], SNAG[1], .4]);
  outline(add(new THREE.CylinderGeometry(.1, .2, 3, 7), T(0x8a7a6a), SNAG[0], sny + 1.5, SNAG[1], w.scene), 1.06);
  for (const [a, l, y] of [[.7, 1.1, 2.1], [-2.3, .8, 1.5], [2.4, .6, 2.6]]) { const b = outline(add(new THREE.CylinderGeometry(.04, .07, l, 5), T(0x8a7a6a), SNAG[0] + Math.cos(a)*l*.35, sny + y + l*.3, SNAG[1] + Math.sin(a)*l*.35, w.scene), 1.08); b.rotation.set(Math.sin(a)*.9, 0, -Math.cos(a)*.9); }

  // samples for the microscope at home: green scum floating at the far edge of the pond, a jarful of tiny
  // pond life; and the wet moss on the shady side of the old snag, where water bears live
  const SCUM = [POND[0] - 2, POND[1] - .5], DIP = [POND[0] - 2.9, POND[1] - .7], MOSS = [SNAG[0] + .1, SNAG[1] - .45];
  meshOf(mergeGeos([[0, 0, .45], [.35, .3, .3], [-.25, .35, .25], [.3, -.3, .22], [-.4, -.15, .2]].map(([dx, dz, r]) => [new THREE.CircleGeometry(r, 10).rotateX(-Math.PI/2), XF(SCUM[0] + dx, POND_Y + .015, SCUM[1] + dz)])), 0x6aa03a, w.scene);
  meshOf(mergeGeos([[0, 0, .16], [.18, .08, .12], [-.14, .1, .11], [.06, -.14, .1], [.2, -.1, .09]].map(([dx, dz, r]) => [new THREE.SphereGeometry(r, 8, 6), XF(MOSS[0] + dx, sny + r*.4, MOSS[1] + dz, 1, .7, 1)])), 0x4a8a3a, w.scene, .015);
  sample(w, t, {ids:['daphnia', 'spirogyra', 'rotifer'], at:SCUM, y:POND_Y + .5, from:DIP, verb:'Scoop up some pond water'});
  sample(w, t, {ids:['tardigrade'], at:MOSS, y:sny + .5, from:[SNAG[0] + .5, SNAG[1] - 1.2], verb:'Pick a bit of wet moss'});

  // and life all about: a red-tailed hawk circling high, swallows over the grass, butterflies on the flowers
  life.push(soarer(w.scene, -2, 15, -4, 14, {s:1.6, body:0x7a5034, belly:0xf0e0c4, tail:0xc0583a, sp:.12}).tick);
  life.push(soarer(w.scene, 10, 28, -30, 20, {s:2, body:0x6a4430, tail:0xc0583a}).tick);
  life.push(flock(w.scene, -3, 2.6, -2, 5, {r:9}).tick);
  life.push(butterflies(w.scene, [[-6, -11], [-9, 6], [6, 6], [-4, -1], [8, -8], [12, 1], [-12, -1], [3, -6], [-5, 13], [16, -9]], ground, [0xf2963a, 0xf6efe0, 0xffd36b, 0xf2963a]).tick);
  w.anims.push((dt, tt) => life.forEach(f => f(dt, tt)));
}
