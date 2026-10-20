// Where plates slide past each other: golden hills split down the middle by a fault, a long trough
// where two plates grind past each other. Everything that crosses it has been slid apart, and the
// older it is, the farther: a creek that jogs along the trough to catch up with itself, a row of
// orange trees planted straight fifty years ago, a rock cut in two. Stuck, the plates bend the road
// and fence that cross them, until they snap and the ground shakes.

import * as THREE from 'three';
import { C, T, XF, add, bAdd, bFlush, box, clamp01, ease, fr, frand, grp, leafCloud, outline, tex } from '../../core/kit.js';
import { Sound } from '../../core/sound.js';
import { inWorld } from '../../core/world.js';
import { flower, grassTuft } from '../../hq/wider.js';
import { coarse } from '../../input.js';
import { player } from '../../player.js';
import { game } from '../../state.js';
import { tripBus } from '../bus.js';
import { classmates } from '../class.js';
import { goggles } from '../goggles.js';
import { signpost, tripWorld } from '../stop-kit.js';
import { storySky } from './sky.js';
import { worries } from './worries.js';

// The fault runs north to south along x = 0. West of it is the Pacific Plate; everything east of it
// rides the North American Plate, and has been carried south for as long as it has been riding.
const ROAD_Z = 2.5, FENCE_Z = 5.4, ORCH_Z = -9.5, ORCH_OFF = 1.8;
const SPLIT = [0, -.6], SPLIT_OFF = 1.3, ROCK = [-3.4, 4.1], POND = [-12.9, -4.4];
const BUS = [11, -5.2], BUS_RY = Math.PI;
// downstream from the eastern hills: along, then down the fault's trough to catch up with itself, and on to the pond
const CREEK = [[20, -3.8], [15, -2.9], [10, -2.4], [5, -2.6], [1.5, -2.7], [.35, -3.3], [.05, -4.6], [-.2, -5.8], [-1.2, -6.4], [-4, -6.6], [-8, -6.3], [-10.8, -5.5], [-12.2, -4.8]];
// the valley floor is a squarish oval; past it the hills rise, tall in the north, low in the south where the camera looks over them
const RX = 16, RZ = 11, ZC = -1.6;
// the time goggles' map hangs high and far behind the camera, where walking never sees it
const CUT = [0, 20, 76];

const sm = (a, b, v) => { const k = clamp01((v - a)/(b - a)); return k*k*(3 - 2*k); };
const CPTS = new THREE.CatmullRomCurve3(CREEK.map(([x, z]) => new THREE.Vector3(x, 0, z))).getSpacedPoints(140);
const creekD = (x, z) => { let d = Infinity; for (const p of CPTS) d = Math.min(d, (p.x - x)**2 + (p.z - z)**2); return Math.sqrt(d); };
const oval = (x, z) => ((x/RX)**4 + ((z - ZC)/RZ)**4)**.25;
// rolling grass, the fault's trough with a low ridge pushed up beside it, a channel for the creek, a dip
// for the pond, and the hills all round; smoothed flat wherever something sits or crosses
function ground(x, z){
  const q = oval(x, z), dc = creekD(x, z), dp = Math.hypot(x - POND[0], z - POND[1]), band = 1 - sm(0, 1.5, Math.abs(z - (ROAD_Z + FENCE_Z)/2) - 2.4);
  const flat = sm(.5, 1.8, dc)*(1 - band)*sm(2.8, 4.6, Math.hypot(x - BUS[0], z - BUS[1]))*sm(1.8, 3.2, dp)*sm(1.4, 2.6, Math.hypot(x - SPLIT[0], z - SPLIT[1] - SPLIT_OFF/2))*sm(.9, 1.8, Math.hypot(x - ROCK[0], z - ROCK[1]));
  const roll = .3*Math.sin(x*.33 + 1.3)*Math.sin(z*.37 + .4) + .15*Math.sin(x*.71 - z*.53 + 2);
  const ridge = .5*Math.exp(-(((x - 2.7)/1.1)**2))*(.65 + .35*Math.sin(z*.45));
  const tall = 2.4 + 7*sm(4, -9, z), a = Math.atan2(z - ZC, x);
  return (roll + ridge)*flat - .42*Math.exp(-((x/1.4)**2))*(1 - .6*band) - .14*Math.exp(-((dc/.55)**2)) - .3*Math.exp(-((dp/1.7)**2))
    + tall*sm(.9, 1.45, q)*(1 + .18*Math.sin(a*7) + .1*Math.sin(a*13 + 1));
}

export function buildFault(t){
  const w = tripWorld({title:'Where Plates Slide', bg:0xf0d2b0, sky:0xfff0dc, groundCol:0x6a5a3a, hemi:.8, sunCol:0xffd6a4, sunI:.9, fogNear:70, fogFar:260,
    cam:{oy:7.4, oz:9.2, oyP:9.4, ozP:10.6}});
  w.far = 600;
  const S = {slip:.7, bend:0, split:SPLIT_OFF};
  const trunks = [];
  w.ground = ground;
  // the oval's edge is lined with bushes, boulders and gates; the pond, the trunks and the rocks are walked round
  w.bounds = (x, z) => oval(x, z) < .91 && Math.hypot(x - POND[0], z - POND[1]) > 1.6 && Math.hypot(x - ROCK[0], z - ROCK[1]) > .75
    && Math.hypot(x + .55, z - SPLIT[1]) > .8 && Math.hypot(x - .55, z - SPLIT[1] - S.split) > .8 && trunks.every(([tx, tz, r]) => Math.hypot(x - tx, z - tz) > r);
  w.surface = (x, z) => Math.abs(z - ROAD_Z - (x > 0 ? S.slip : 0)) < .6 ? 'stone' : 'grass';
  w.area = x => Math.abs(x) < 1.6 ? 'The Fault Line' : x < 0 ? 'The Pacific Plate' : 'The North American Plate';
  w.spawn = [BUS[0] - 1.8, BUS[1] + 2.2, Math.PI];
  storySky(w, {sun:[-9, 16, 7], clouds3d:[[110, 38, -150, 28], [-60, 44, -170, 34], [170, 30, -60, 24], [-160, 34, -40, 26], [20, 52, -210, 36], [-120, 26, 120, 22], [140, 40, 110, 28], [60, 22, -70, 12]]});
  const roadSegs = [], posts = [], rails = [];
  let water, half, snack, boat;
  inWorld(w, () => {
    // ---------- the land ----------
    const geo = new THREE.PlaneGeometry(220, 180, 300, 250); geo.rotateX(-Math.PI/2); geo.translate(0, 0, ZC);
    const p = geo.attributes.position;
    for (let i = 0; i < p.count; i++) p.setY(i, ground(p.getX(i), p.getZ(i)));
    geo.computeVertexNormals();
    // dry gold grass, greener by the water, browner down the fault's trough, ochre on the steep hillsides
    const n = geo.attributes.normal, cols = new Float32Array(p.count*3), c = new THREE.Color();
    const [gold, pale, green, trough, ochre] = [0xd8ae52, 0xe8cc84, 0x86a24a, 0xa8804a, 0xc08c3e].map(h => new THREE.Color(h));
    for (let i = 0; i < p.count; i++) { const x = p.getX(i), z = p.getZ(i);
      c.copy(gold).lerp(pale, .5 + .5*Math.sin(x*.21 + Math.sin(z*.17)*2)*Math.sin(z*.23 - x*.07)).lerp(ochre, sm(.95, 1.5, oval(x, z))*.45 + sm(.9, .7, n.getY(i))*.5)
        .lerp(green, Math.max(1 - sm(.5, 2.4, creekD(x, z)), 1 - sm(1.6, 3.2, Math.hypot(x - POND[0], z - POND[1]))) *.85).lerp(trough, Math.exp(-((x/1.1)**2))*.55*sm(1.1, .8, oval(x, z)));
      c.convertSRGBToLinear(); cols.set([c.r, c.g, c.b], i*3); }
    geo.setAttribute('color', new THREE.BufferAttribute(cols, 3));
    const grassTex = tex(256, 256, (g, cw, ch) => { g.fillStyle = '#f4ead8'; g.fillRect(0, 0, cw, ch);
      for (let i = 0; i < 900; i++) { g.fillStyle = ['#fff8e8', '#e0d0b0', '#ece0c4', '#d8c8a4'][i % 4]; g.fillRect(Math.random()*cw, Math.random()*ch, 2 + Math.random()*3, 1 + Math.random()*5); } }, 1, 1);
    const uv = geo.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, p.getX(i)/5, p.getZ(i)/5);
    const land = new THREE.Mesh(geo, T(0xffffff, {map:grassTex, vertexColors:true})); land.receiveShadow = true; w.scene.add(land);
    // far golden hills fading into the haze, so the land never ends at an edge
    for (let i = 0; i < 22; i++) { const a = i/22*Math.PI*2 + fr(-.1, .1), r = fr(95, 125), h = fr(14, 30)*(Math.sin(a) < 0 ? 1.3 : .7);
      bAdd([0xc8a058, 0xb89060, 0xa88a6a][i % 3], new THREE.SphereGeometry(1, 14, 8), XF(Math.cos(a)*r, -h*.25, Math.sin(a)*r + ZC, fr(30, 44), h, fr(26, 36), 0, a, 0)); }

    // ---------- the creek and the pond ----------
    const waterTex = tex(128, 128, (g, cw, ch) => { g.fillStyle = '#4a8ac0'; g.fillRect(0, 0, cw, ch);
      g.strokeStyle = 'rgba(220,240,255,.45)'; g.lineWidth = 3; for (let i = 0; i < 9; i++) { g.beginPath(); const y = Math.random()*ch, x = Math.random()*cw; g.moveTo(x, y); g.quadraticCurveTo(x + 14, y - 6, x + 30, y); g.stroke(); } }, 1, 1);
    water = T(0xffffff, {map:waterTex, emissive:0x1b4262, emissiveIntensity:.4, side:THREE.DoubleSide});
    const cp = [], ci = [], cu = []; let along = 0;
    CPTS.forEach((q, i) => { const a = CPTS[Math.max(0, i - 1)], b = CPTS[Math.min(CPTS.length - 1, i + 1)], tx = b.x - a.x, tz = b.z - a.z, l = Math.hypot(tx, tz), wd = .55 + .08*Math.sin(i*.7);
      if (i) along += q.distanceTo(CPTS[i - 1]);
      for (const sd of [-1, 1]) { const x = q.x - tz/l*wd*sd, z = q.z + tx/l*wd*sd; cp.push(x, ground(x, z) + .07, z); cu.push(sd < 0 ? 0 : 1, along/1.2); }
      if (i < CPTS.length - 1) { const k = i*2; ci.push(k, k + 2, k + 1, k + 1, k + 2, k + 3); } });
    const cg = new THREE.BufferGeometry(); cg.setAttribute('position', new THREE.Float32BufferAttribute(cp, 3)); cg.setAttribute('uv', new THREE.Float32BufferAttribute(cu, 2)); cg.setIndex(ci); cg.computeVertexNormals();
    w.scene.add(new THREE.Mesh(cg, water));
    add(new THREE.CircleGeometry(1.75, 28), water, POND[0], -.13, POND[1], null, false).rotation.x = -Math.PI/2;
    // pebbles along both banks, reeds by the pond, and boulders where the creek comes down out of the hills
    for (let i = 0; i < CPTS.length; i += 2) { const q = CPTS[i]; if (Math.abs(q.x - 5) < 1.2) continue;
      for (const sd of [-1, 1]) if (frand() < .45) { const x = q.x + fr(-.3, .3), z = q.z + sd*fr(.7, .95), s = fr(.1, .2);
        bAdd([0x9a8e86, 0xb4aa9e, 0x8a7e78][i % 3], new THREE.DodecahedronGeometry(s, 0), XF(x, ground(x, z) + s*.2, z, 1.3, .6, 1, 0, fr(0, 6), 0), {ink:.02}); } }
    for (let i = 0; i < 26; i++) { const a = i/26*Math.PI*2 + fr(-.1, .1), r = fr(1.8, 2.3), x = POND[0] + Math.cos(a)*r, z = POND[1] + Math.sin(a)*r;
      if (Math.abs(a - 5.3) < .5) continue;
      if (i % 3) grassTuft(x, z, ground(x, z), 2.2, 0x5b8a52); else bAdd(0x9a8e86, new THREE.DodecahedronGeometry(fr(.15, .28), 0), XF(x, ground(x, z), z, 1.3, .6, 1, 0, fr(0, 6), 0), {ink:.02}); }
    for (const [x, z, s] of [[15.6, -4.4, 1.1], [16.2, -1.6, .9], [17.4, -4.6, 1.4], [14.9, -1.9, .6], [17.8, -1.2, 1.2], [15.4, -5.4, .7]])
      bAdd([0x8a7e78, 0x9a8e86][Math.round(s*10) % 2], new THREE.DodecahedronGeometry(s, 0), XF(x, ground(x, z) + s*.3, z, 1.2, .8, 1.1, fr(0, 1), fr(0, 6), 0), {ink:.05, shadow:true});

    // ---------- the fault ----------
    // a jagged crack down the trough, the whole length of the valley, hidden where the creek and the road cross it
    for (let z = -12.5, k = 0; z < 9.6; z += .5, k++) { if ((z > -6.8 && z < -2.5) || Math.abs(z - ROAD_Z - .5) < 1 || Math.abs(z - SPLIT[1] - SPLIT_OFF/2) < 1.4) continue;
      const x = Math.sin(k*1.7)*.08; bAdd(0x2a1e1a, new THREE.BoxGeometry(.2, .06, .54), XF(x, ground(x, z + .25) + .015, z + .25, 1, 1, 1, 0, Math.sin(k*2.3)*.15, 0)); }
    signpost(-1.5, ROAD_Z - 1.4, 'The Fault Line', ground(-1.5, ROAD_Z - 1.4), .25);
    // the rock the fault cut in two, a white stripe running through it; the east half rides south
    // each half a boulder flattened along the cut, so the halves meet face to face; the stripe runs across both
    const stripe = (y, z) => Math.abs(z - .12 - .45*y) < .1;
    const halfRock = sx => { const g = new THREE.SphereGeometry(.85, 48, 32), gp = g.attributes.position;
      for (let i = 0; i < gp.count; i++) if (gp.getX(i)*sx < 0) gp.setX(i, 0);
      g.scale(1, .82, 1.05); g.computeVertexNormals();
      const gc = new Float32Array(gp.count*3), grey = new THREE.Color(0x8a7e86).convertSRGBToLinear(), white = new THREE.Color(0xf6efe0).convertSRGBToLinear();
      for (let i = 0; i < gp.count; i++) (stripe(gp.getY(i), gp.getZ(i)) ? white : grey).toArray(gc, i*3);
      g.setAttribute('color', new THREE.BufferAttribute(gc, 3));
      const root = grp(); outline(add(g, T(0xffffff, {vertexColors:true}), sx*.02, .1, 0, root), 1.05);
      return root; };
    const west = halfRock(-1); west.position.set(SPLIT[0] - .02, ground(SPLIT[0] - .5, SPLIT[1]), SPLIT[1]);
    half = halfRock(1); half.position.set(SPLIT[0] + .02, ground(SPLIT[0] + .5, SPLIT[1] + SPLIT_OFF), SPLIT[1] + SPLIT_OFF);

    // ---------- the road and the fence ----------
    for (let x = -14.75; x < 14.6; x += .5) {
      const seg = grp(x + .25, 0, ROAD_Z); box(.52, .05, 1.2, T(0x6a6470), 0, .025, 0, seg, false); if (Math.round(x*2) % 3 === 0) box(.3, .06, .08, T(C.cream), 0, .03, 0, seg, false);
      roadSegs.push({g:seg, x:x + .25, y:true}); }
    // on out of the valley both ways, up over the hills in one piece each, through a ranch gate
    const roadTex = tex(64, 64, (g, cw, ch) => { g.fillStyle = '#6a6470'; g.fillRect(0, 0, cw, ch); g.fillStyle = '#e9d9b8'; g.fillRect(0, ch/2 - 2, cw*.4, 4); }, 1, 1);
    for (const sx of [-1, 1]) { const g = grp(sx*15, 0, ROAD_Z), z0 = ROAD_Z + (sx > 0 ? S.slip : 0), pos = [], uvs = [], idx = [], N = 60;
      for (let i = 0; i <= N; i++) { const x = sx*(15 + i*.75); for (const dz of [-.6, .6]) { pos.push(x - sx*15, ground(x, z0 + dz) + .04, dz); uvs.push((x - sx*15)/1.5, dz > 0 ? 1 : 0); }
        if (i < N) { const k = i*2; idx.push(...(sx > 0 ? [k, k + 1, k + 2, k + 1, k + 3, k + 2] : [k, k + 2, k + 1, k + 1, k + 2, k + 3])); } }
      const rg = new THREE.BufferGeometry(); rg.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); rg.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2)); rg.setIndex(idx); rg.computeVertexNormals();
      const rm = new THREE.Mesh(rg, T(0xffffff, {map:roadTex, side:THREE.DoubleSide})); rm.receiveShadow = true; g.add(rm);
      const gy = ground(sx*14.8, z0);
      for (const dz of [-.95, .95]) outline(add(new THREE.CylinderGeometry(.09, .1, 1.3, 8), T(C.woodDk), -sx*.2, gy + .65, dz, g), 1.08);
      for (const y of [.35, .7, 1.05]) outline(add(new THREE.BoxGeometry(.07, .1, 1.9), T(0xe9d9b8), -sx*.2, gy + y, 0, g), 1.06);
      outline(add(new THREE.BoxGeometry(.06, .7, .1), T(0xe9d9b8), -sx*.2, gy + .7, 0, g), 1.06).rotation.x = .9;
      roadSegs.push({g, x:sx*30}); }
    // each post and rail a group, so the ink outline moves and stretches along with it
    const inked = (wd, h, d, y) => { const g = grp(0, y, FENCE_Z); g.userData.h = y; outline(add(new THREE.BoxGeometry(wd, h, d), T(C.cream), 0, 0, 0, g), 1.08); return g; };
    for (let x = -4; x <= 4.6; x += .6) posts.push({m:inked(.09, .7, .09, .35), x});
    for (let i = 0; i < posts.length - 1; i++) rails.push([inked(1, .06, .05, .58), inked(1, .06, .05, .3)]);
    const gy = ground(...ROCK);
    outline(add(new THREE.CylinderGeometry(.5, .62, .5, 7), T(0x8a7e86), ROCK[0], gy + .25, ROCK[1]), 1.06);
    snack = box(.22, .06, .1, T(0xd9a441), ROCK[0] + .1, gy + .53, ROCK[1]);

    // ---------- the orchard: planted in one straight row, fifty years ago ----------
    const canopy = [], oranges = [];
    const tree = (x, z) => { const y = ground(x, z); trunks.push([x, z, .35]);
      bAdd(C.woodDk, new THREE.CylinderGeometry(.08, .12, 1, 7), XF(x, y + .5, z), {ink:.02, shadow:true});
      canopy.push([x, y + 1.25, z, .66, 1], [x + .3, y + 1.45, z + .1, .44, 2], [x - .32, y + 1.05, z - .12, .46, 0], [x + .1, y + 1.1, z + .38, .4, 0]);
      for (let k = 0; k < 7; k++) { const a = k*.9 + fr(0, .5), el = fr(-.3, .6); oranges.push([x + Math.cos(a)*Math.cos(el)*.64, y + 1.25 + Math.sin(el)*.55, z + Math.sin(a)*Math.cos(el)*.64]); } };
    for (let x = -10.8; x < -1; x += 2.2) tree(x, ORCH_Z);
    for (let x = 1; x < 8; x += 2.2) tree(x, ORCH_Z + ORCH_OFF);
    for (const [x, y, z] of oranges) bAdd(0xf2963a, new THREE.SphereGeometry(.085, 8, 6), XF(x, y, z), {ink:.012});
    signpost(-12.6, ORCH_Z - 1.2, 'Planted 1975', ground(-12.6, ORCH_Z - 1.2), .35);
    // a few old oaks inside, and many more up the hills, low and wide the way they grow in dry country
    const oak = (x, z, s) => { const y = ground(x, z);
      bAdd(0x5a3e2e, new THREE.CylinderGeometry(.14*s, .22*s, 1.3*s, 7), XF(x, y + .6*s, z, 1, 1, 1, .12, 0, .1), {ink:.03*s, shadow:true});
      canopy.push([x, y + 1.7*s, z, 1.05*s, 1], [x + .9*s, y + 1.5*s, z + .2*s, .75*s, 1], [x - .95*s, y + 1.5*s, z - .1*s, .78*s, 1], [x + .1*s, y + 1.45*s, z + .7*s, .7*s, 0],
        [x - .2*s, y + 2.15*s, z - .2*s, .72*s, 2], [x + .5*s, y + 2*s, z - .5*s, .6*s, 2]); };
    for (const [x, z, s] of [[-8.8, 1.2, 1.1], [7.4, 7.6, .9], [-14, 6.4, 1], [4.6, -11.4, .9], [12.6, 3.2, 1]]) { oak(x, z, s); trunks.push([x, z, .45*s]); }
    for (let i = 0; i < 70; i++) { const a = fr(0, Math.PI*2), q = fr(1.12, 2.1), c0 = Math.cos(a), s0 = Math.sin(a);
      const x = RX*q*Math.sign(c0)*Math.abs(c0)**.5, z = ZC + RZ*q*Math.sign(s0)*Math.abs(s0)**.5;
      if (z > 6 && q < 1.5) continue; oak(x, z, fr(.9, 1.6)); }
    // the valley's edge: bushes and boulders all round, open only where the road goes out through its gates
    const ring = [];
    for (let i = 0; i < 120; i++) { const a = i/120*Math.PI*2, q = fr(.97, 1.04), c0 = Math.cos(a), s0 = Math.sin(a);
      const x = RX*q*Math.sign(c0)*Math.abs(c0)**.5, z = ZC + RZ*q*Math.sign(s0)*Math.abs(s0)**.5;
      if (Math.abs(z - ROAD_Z - (x > 0 ? 1 : 0)) < 1.8) continue;
      if (i % 4 === 1) { const s = fr(.5, .9); bAdd([0x9a8a7a, 0x8a7e78][i % 2], new THREE.DodecahedronGeometry(s, 0), XF(x, ground(x, z) + s*.3, z, 1.3, .8, 1.1, 0, fr(0, 6), 0), {ink:.04, shadow:true}); }
      else ring.push([x, z]); }
    for (const [x, z] of ring) { const s = fr(.8, 1.2), y = ground(x, z), k = 3 + Math.floor(frand()*3);
      canopy.push([x, y + .55*s, z, .85*s, 1], [x + fr(-.2, .2)*s, y + 1.05*s, z, .55*s, 2]);
      for (let j = 0; j < k; j++) { const a = j/k*Math.PI*2 + fr(0, 1); canopy.push([x + Math.cos(a)*.9*s, y + .4*s, z + Math.sin(a)*.7*s, fr(.5, .68)*s, Math.sin(a) < 0 ? 0 : 1]); } }
    leafCloud(w.scene, canopy);
    // golden grass, orange poppies and purple lupines, thick by the edges and the water, sparse out in the open
    const clear = (x, z) => Math.abs(z - ROAD_Z - (x > 0 ? 1 : 0)) < 1.2 || creekD(x, z) < .8 || Math.hypot(x - POND[0], z - POND[1]) < 2 || Math.abs(x) < .5
      || Math.hypot(x - BUS[0], z - BUS[1]) < 3.6 || Math.hypot(x - SPLIT[0], z - SPLIT[1] - .6) < 1.8 || Math.hypot(x - ROCK[0], z - ROCK[1]) < 1 || (x > -4.5 && x < 6 && Math.abs(z - FENCE_Z - .6) < 1.2);
    for (let i = 0; i < 520; i++) { const a = fr(0, Math.PI*2), q = Math.sqrt(fr(0, 1))*1.02, c0 = Math.cos(a), s0 = Math.sin(a);
      const x = RX*q*Math.sign(c0)*Math.abs(c0)**.5, z = ZC + RZ*q*Math.sign(s0)*Math.abs(s0)**.5;
      if (clear(x, z)) continue; const y = ground(x, z), r = frand();
      if (r < .14) flower(x, z, y, fr(1.2, 1.9), 0xf2862a); else if (r < .2) flower(x, z, y, fr(1.6, 2.4), 0x8f7ad6); else grassTuft(x, z, y, fr(1.3, 2), [0xd8b04e, 0xc89a40, 0xe0c068][Math.floor(frand()*3)]); }
    bFlush(w.scene);
    // a leaf boat, for racing down the creek
    boat = grp(); boat.visible = false;
    const leaf = add(new THREE.SphereGeometry(.24, 12, 8), T(0xa8c85a), 0, 0, 0, boat); leaf.scale.set(1.5, .32, .8); outline(leaf, 1.1);
    add(new THREE.CylinderGeometry(.012, .012, .3, 4), T(C.woodDk), 0, .15, 0, boat, false);
    add(new THREE.PlaneGeometry(.18, .16), T(0xf6efe0, {side:THREE.DoubleSide}), .06, .2, 0, boat, false);
  });
  // where something sits along the fault: the ground east of it has slipped and is bending
  const disp = x => (x > 0 ? S.slip : 0) + S.bend*(.5 + .5*Math.tanh(x/1.3));
  function settle(){
    for (const r of roadSegs) { r.g.position.z = ROAD_Z + disp(r.x); if (r.y) r.g.position.y = ground(r.x, r.g.position.z); }
    posts.forEach(p => { p.m.position.x = p.x; p.m.position.z = FENCE_Z + disp(p.x); p.m.position.y = ground(p.x, p.m.position.z) + .35; });
    rails.forEach(([a, b], i) => { const p = posts[i].m.position, q = posts[i + 1].m.position, dx = q.x - p.x, dz = q.z - p.z, L = Math.hypot(dx, dz), y = (p.y + q.y)/2 - .35;
      for (const r of [a, b]) { r.position.set((p.x + q.x)/2, y + r.userData.h, (p.z + q.z)/2); r.scale.x = L; r.rotation.y = -Math.atan2(dz, dx); } });
  }
  settle();
  const map = buildMap(w);
  const bus = tripBus(w);
  const door = () => bus.door(.6);
  const cls = classmates(w, t, [BUS[0] - 1.6, BUS[1] + 1.6]);
  const say = t.say;
  let snap = null, snackHop = null, float = null;
  const sy = ground(...ROCK) + .53;
  w.anims.push((dt, tt) => {
    water.map.offset.y = tt*.25;
    if (snap) { const e = ease(clamp01((tt - snap.t0)/.25)); S.bend = snap.b*(1 - e); S.slip = snap.s + snap.b*e; settle(); if (e >= 1) snap = null; }
    if (snackHop) { const k = clamp01((tt - snackHop)/2); snack.position.set(ROCK[0] + .1 + k*2.2, sy*(1 - k) + (ground(ROCK[0] + 2.3, ROCK[1] + .8) + .03)*k + Math.abs(Math.sin(k*Math.PI*4))*.4*(1 - k), ROCK[1] + k*.8); snack.rotation.y = k*9; }
    // the boat drifts on down the creek at the water's pace
    if (float) { float.s = Math.min(float.end, float.s + dt*2.6); const i = Math.floor(float.s), f = float.s - i, a = CPTS[i], b = CPTS[Math.min(CPTS.length - 1, i + 1)];
      boat.position.set(a.x + (b.x - a.x)*f, ground(a.x, a.z) + .2 + Math.sin(tt*4)*.02, a.z + (b.z - a.z)*f); boat.rotation.y = Math.atan2(-(b.z - a.z), b.x - a.x) + Math.sin(tt*1.7)*.3; }
  });
  const wide = (pos, look) => { pos.set(2, 14, 21); look.set(0, 0, -3); };
  const rumble = async n => { for (let k = 0; k < n; k++) { game.camShake = 4; Sound.hiss({dur:.7, vol:.2, type:'lowpass', freq:180}); Sound.tone(46, {dur:.8, vol:.2, f2:30}); await t.wait(.42); } };
  const spot = (x, z, o) => ({x, z, y:ground(x, z), ...o});

  // ---------- what the class finds ----------
  cls.find('basil', {name:'quake', at:[-1.1, ROAD_Z + .9, 1.9], call:"Somebody broke the road!", after:["My knees are still wobbly."],
    async scene(){
      await say([['basil', "Somebody broke the road, {name}! The two sides don't line up."],
                 ['sparks', "Nobody broke it, Basil. That crack is where two plates slide past each other."],
                 ['sparks', "But they get stuck. Push the fence and see what happens."]]);
      const guess = await t.ask('basil', "What happens if we keep pushing the plates?", ["It bends, then snaps all at once", "It slides smoothly", "Nothing happens"]);
      await say([['basil', "You push it, {name}. I'll watch from here."]]);
      for (let i = 1; i <= 4; i++) {
        await t.free(t.use(w, spot(.3, FENCE_Z - .7, {name:'Fence', verb:'Push the fence', short:'Push', glow:[.3, ground(.3, FENCE_Z) + 1, FENCE_Z]})), 'Push the fence');
        if (i === 4) break;
        const b0 = S.bend; Sound.tone(150 - i*15, {type:'sawtooth', dur:.5, vol:.05, f2:110, cut:700}); Sound.hiss({dur:.4, vol:.05, type:'bandpass', freq:300});
        await t.tween(.55, k => { S.bend = b0 + .32*k; settle(); });
        await say([['basil', ["It's bending! Push again!", "It's bending more! Again!", "It's REALLY bent. One more?"][i - 1]]]);
      }
      // it gives all at once: the quake. Everyone drops and covers but Basil, who freezes.
      snap = {t0:game.elapsed, b:S.bend, s:S.slip};
      const poses = {}; for (const id in cls.n) { poses[id] = cls.n[id].pose; cls.n[id].pose = id === 'basil' ? null : 'cover'; }
      const near = (pos, look) => { pos.set(player.x + 1.2, player.y + 3.4, player.z + 5.2); look.set(player.x - .4, player.y + .6, player.z - .6); };
      t.cut(near);
      await rumble(1);
      // the shaking holds still while the explorer does the right thing, with a nudge if they don't
      let covered = false; const nudge = game.elapsed + 6;
      const cover = t.free(t.use(w, {name:'Drop, cover, hold on', x:player.x, z:player.z, y:player.y, range:5, verb:'Drop, cover, hold on!', short:'Drop, cover, hold on!', glow:[player.x, player.y + 2.2, player.z], big:true}),
        'The ground is shaking! What do you do?').then(() => { covered = true; });
      await t.until(() => covered || game.elapsed > nudge);
      if (!covered) await say([['basil', "{name}! What do we do?!"], ['sparks', coarse ? "Drop, cover, and hold on! Tap the big button!" : "Drop, cover, and hold on! Press E!"]]);
      await cover;
      t.cut(near); player.pose = 'cover'; t.onEnd(() => { player.pose = null; });
      Sound.tone(392, {type:'triangle', dur:.15, vol:.07});
      await t.wait(.9);
      cls.n.basil.pose = 'cover';
      await say([['basil', "Drop, cover, hold on. Like {name}!"]]);
      snackHop = game.elapsed;
      await rumble(5);
      await t.wait(.8);
      for (const id in cls.n) cls.n[id].pose = poses[id];
      player.pose = null;
      t.cut((pos, look) => { pos.set(.4, 4.2, FENCE_Z + 5.4); look.set(0, .3, FENCE_Z); });
      await say([['basil', guess === 0 ? "You were right. It bent and bent, then SNAPPED!" : "It didn't slide. It bent and bent, then SNAPPED!"],
                 ['mo', "Hey! My snack!"],
                 ['sparks', "Stuck plates bend, then snap free. That jolt is an earthquake."],
                 ['sparks', "And everyone did just right: drop, cover, and hold on!"],
                 ['basil', "I froze. But then I copied you, {name}."]]);
      worries(3);
      await say([['basil', "The ground shakes, but now I know what to do!"]]);
      t.cut(null);
    }});
  cls.find('juniper', {name:'creek', at:[-1.5, -4.3, Math.PI/2], pose:'crouch', call:"The creek is doing something weird!", after:["A creek that got pulled sideways. I'm drawing it twice!"],
    async scene(){
      await say([['juniper', "Look at this creek, {name}. It runs along, then turns, then turns back again!"],
                 ['juniper', "Let's race a leaf boat down it and see where it goes."]]);
      const lx = 5, lz = -1.7;
      await t.free(t.use(w, spot(lx, lz, {name:'Leaf boat', verb:'Drop a leaf boat in the creek', short:'Drop', glow:[lx, ground(lx, lz) + .6, lz - .7]})), 'Drop a leaf boat in the creek, up by the rocks');
      const s0 = CPTS.findIndex(q => q.x < 5.2), end = CPTS.findIndex(q => q.x < -4.5);
      float = {s:s0, end}; boat.visible = true; Sound.tone(620, {type:'sine', dur:.2, vol:.07, f2:900});
      t.cut((pos, look) => { pos.set(boat.position.x + .8, boat.position.y + 5.2, boat.position.z + 6); look.copy(boat.position); return true; });
      await t.wait(2);
      await say([['juniper', "There it goes! Down the creek, nice and straight…"]]);
      await t.until(() => float.s >= CPTS.findIndex(q => q.x < .2));
      await say([['juniper', "Whoa! It turned! Now it's going down the crack."]]);
      await t.until(() => float.s >= end);
      await say([['juniper', "And now it turned again, and it's back on its way. Why the detour?"]]);
      const pick = await t.ask('juniper', "Why does the creek take a detour right at the crack?", ["The ground slid and dragged it", "A fish dug a shortcut", "It got lost"]);
      await say([['sparks', "Let's find out! Time goggles on, {name}. Here's this creek from way up high, long ago."]]);
      await goggles(t, {shot:map.shot, years:4000, dur:7, step:map.step});
      await say([['juniper', pick === 0 ? "You were right! The ground slid, and dragged the creek with it!" : "It wasn't a fish. The ground slid, and dragged the creek with it!"],
                 ['juniper', "Long ago, the creek ran straight across. Then the plates slid, a little every year."],
                 ['juniper', "So the creek runs down the crack to catch up with itself!"]]);
      if (await t.more('sparks', "Want to know the names of these two plates?"))
        await say([['sparks', "Where Juniper is standing is the Pacific Plate. Across the crack is the North American Plate."],
                   ['pip', "Wait. So I could stand on two plates at once?"], ['sparks', "One foot on each! Just don't wait for them to move. It takes a while."]]);
      float = null; boat.visible = false;
      t.cut(null);
    }});
  cls.find('pip', {name:'trees', at:[-9.7, ORCH_Z - .9, Math.PI*.8], pose:'peer', call:"These trees are crooked! Come see!", after:["Fingernail speed! Slow, but it never, ever stops."],
    async scene(){
      await say([['pip', "{name}! The sign says these orange trees were planted in 1975. In one straight row."],
                 ['pip', "But whoever planted them was NOT good at straight lines. Look down the row!"]]);
      await t.free(t.use(w, spot(-12.4, ORCH_Z, {name:'Row', range:1.4, verb:'Look down the row of trees', short:'Look', glow:[-12.4, ground(-12.4, ORCH_Z) + 1.4, ORCH_Z]})), 'Look down the row of trees');
      t.cut((pos, look) => { pos.set(-14, ground(-14, ORCH_Z) + 2.6, ORCH_Z + 1.6); look.set(5, .4, ORCH_Z + .7); });
      Sound.tone(880, {type:'triangle', dur:.12, vol:.06});
      await say([['pip', "See? Straight, straight, straight, straight…"]]);
      t.cut((pos, look) => { pos.set(-1.5, 9.5, ORCH_Z + 8); look.set(0, 0, ORCH_Z + .6); });
      await say([['pip', "…then, right at the crack, the trees jump over!"]]);
      const pick = await t.ask('pip', "What moved those trees?", ["The ground slid under them", "The farmer was sloppy", "A giant pushed them"]);
      await say([['pip', pick === 0 ? "That's what I think too! The ground slid." : "Nope! The farmer was careful. The ground slid!"],
                 ['sparks', "The trees across the crack rode their plate along. Fifty years of sliding, all in one direction."]]);
      const fast = await t.ask('sparks', "So how fast do you think the plates slide?", ["About as fast as your fingernails grow", "As fast as a snail crawls", "As fast as a car drives"]);
      await say([['sparks', fast === 0 ? "Exactly right! About as fast as your fingernails grow." : "Even slower! About as fast as your fingernails grow."],
                 ['sparks', "A few centimeters every year. Add up fifty years of fingernails, and the trees have moved this far!"],
                 ['mo', "My fingernails are racing the plates? Go, fingernails!"]]);
      if (await t.more('basil', "Wait. So the ground is moving under us right now?"))
        await say([['sparks', "Right now! Very, very slowly. You'd never feel it."], ['basil', "I'm going to feel it. I'm feeling it already."],
                   ['juniper', "Basil, that's just your knees."]]);
      t.cut(null);
    }});
  cls.find('mo', {name:'rock', at:[-1.7, SPLIT[1] + .3, Math.PI/2], pose:'point', call:"Somebody cut a rock in half!", after:["One rock, two halves. Like a sandwich!"],
    async scene(){
      await say([['mo', "{name}, look! Somebody sliced this rock in half, like a sandwich."], ['mo', "And then they slid the other half away."]]);
      const pick = await t.ask('mo', "If you slide that half back, what do you think we'll see?", ["The two halves fit together", "Nothing special", "It falls over"]);
      await say([['mo', "Only one way to find out. Push it back!"]]);
      for (let i = 1; i <= 3; i++) {
        const z = SPLIT[1] + S.split + 1.1;
        await t.free(t.use(w, spot(.7, z, {name:'Rock half', range:1.4, verb:'Push the rock back', short:'Push', glow:[.6, ground(.6, z) + 1.1, z - .9]})), 'Push the rock half back');
        const z0 = S.split; Sound.tone(90, {type:'sawtooth', dur:.6, vol:.06, f2:70, cut:500}); Sound.hiss({dur:.5, vol:.07, type:'bandpass', freq:400, q:.8});
        await t.tween(.6, k => { S.split = z0 - SPLIT_OFF/3*ease(k); half.position.z = SPLIT[1] + S.split; half.position.y = ground(.5, half.position.z); });
      }
      // the explorer steps round to the side, out from between the camera and the rock
      player.x = 1.6; player.z = SPLIT[1] - 1.6; player.angle = -.8;
      t.cut((pos, look) => { pos.set(3.4, ground(0, SPLIT[1]) + 3.4, SPLIT[1] + 2.4); look.set(0, ground(0, SPLIT[1]) + .3, SPLIT[1] + .1); });
      Sound.tone(880, {type:'triangle', dur:.2, vol:.07}); Sound.tone(1318, {type:'triangle', t:.12, dur:.4, vol:.06});
      await say([['mo', pick === 0 ? "You called it! It fits! The white stripe lines up!" : "Whoa, look! It fits! The white stripe lines up!"],
                 ['mo', "It used to be ONE rock!"],
                 ['sparks', "Right on the crack. The plates slid one half away from the other, a little every year."],
                 ['mo', "Rocks, sliced and slid, like a sandwich. Now I'm hungry."]]);
      t.cut(null);
    }});
  cls.hint = () => !cls.saw('quake') ? "Basil is down by the broken road. Go see what's wrong!" :
    "Back to the bus whenever you're ready, {name}! Or go see anyone still waving.";

  return {world:w, bus, cls,
    // in low over the northern hills, round, and down beside the creek
    async arrive(){
      bus.gear(null);
      t.watch(w, (pos, look) => { pos.set(bus.root.position.x*.4 + 2, Math.max(5, bus.root.position.y*.5 + 6), bus.root.position.z*.3 + 22); look.copy(bus.root.position); });
      Sound.tone(200, {type:'sawtooth', dur:4, vol:.03, f2:420, cut:900});
      await bus.fly([[-40, 34, -90], [-14, 22, -42], [10, 14, -24], [26, 8, -12], [20, 3, -5.6], [BUS[0] + 3, .8, BUS[1]], [BUS[0], 0, BUS[1]]], 7.5);
      bus.park(BUS[0], 0, BUS[1], BUS_RY);
      Sound.tone(330, {type:'triangle', dur:.12, vol:.08}); Sound.tone(494, {type:'triangle', t:.1, dur:.18, vol:.08});
      const [dx, dz] = door();
      t.cut(wide);
      cls.arrive({sparks:[dx + 1.3, dz + .5, -Math.PI*.6]});
      await t.wait(2.8);
      await say([['sparks', "Here we are, class! Right down the middle of this valley, two plates slide past each other."],
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
      t.watch(w, (pos, look) => { pos.set(4, 6, 12); look.copy(bus.root.position); });
      Sound.hiss({dur:3, vol:.1, type:'bandpass', freq:900, q:.6});
      await bus.fly([[BUS[0], 0, BUS[1]], [BUS[0] - 4, 3, BUS[1] - 1], [0, 10, -16], [-14, 22, -44], [-30, 34, -90]], 4.4, {roll:.6});
    },
  };
}

// The creek from way up high, for the time goggles: a painted map with the fault down the middle and
// the creek straight across it. The two plates slide past each other until the creek has to run down
// the fault to join up again.
function buildMap(w){
  const g = new THREE.Group(); g.position.set(...CUT); w.scene.add(g);
  const D = 2.4, mat = (color, map) => new THREE.MeshBasicMaterial({color, map, fog:false, transparent:!!map, depthWrite:!map});
  const flat = (wd, h, m, x, y, z, parent = g) => { const o = new THREE.Mesh(new THREE.PlaneGeometry(wd, h), m); o.position.set(x, y, z); parent.add(o); return o; };
  const land = seed => tex(256, 512, (c, cw, ch) => { let s = seed; const r = () => (s = (s*16807) % 2147483647)/2147483647;
    c.fillStyle = '#dcb456'; c.fillRect(0, 0, cw, ch);
    for (let i = 0; i < 40; i++) { c.fillStyle = i % 2 ? '#e8cc84' : '#c89a48'; c.beginPath(); c.ellipse(r()*cw, r()*ch, 20 + r()*30, 10 + r()*16, r()*3, 0, 7); c.fill(); }
    for (let i = 0; i < 26; i++) { const x = r()*cw, y = r()*ch; c.fillStyle = '#3f6d45'; c.strokeStyle = '#1a1320'; c.lineWidth = 3; c.beginPath(); c.arc(x, y, 9, 0, 7); c.fill(); c.stroke(); } });
  const plate = (sx, seed) => { const p = new THREE.Group(); g.add(p); flat(5.4, 16, mat(0xffffff, land(seed)), sx*2.7, 0, 0, p);
    flat(5.4, .36, mat(0x3a78c8), sx*2.7, 0, .02, p);
    const a = new THREE.Mesh(new THREE.ConeGeometry(.4, .9, 3), mat(0xffd36b)); a.position.set(sx*3.6, -sx*1.6, .05); a.rotation.z = sx < 0 ? 0 : Math.PI; p.add(a);
    return p; };
  const W = plate(-1, 7), E = plate(1, 19);
  const link = flat(.36, 1, mat(0x3a78c8), 0, 3, .03);
  flat(.1, 9, mat(0x2a1e1a), 0, 3, .04);
  // the board's surround hides the plates beyond the window as they slide
  const bg = mat(0xf0d2b0);
  flat(40, 14, bg, 0, 13.5, .06); flat(40, 14, bg, 0, -7.5, .06); flat(14, 8, bg, -12.3, 3, .06); flat(14, 8, bg, 12.3, 3, .06);
  flat(40, 30, bg, 0, 3, -.5);
  const wood = mat(0x6b4430);
  flat(11.2, .3, wood, 0, 6.65, .07); flat(11.2, .3, wood, 0, -.65, .07); flat(.3, 7.6, wood, -5.45, 3, .07); flat(.3, 7.6, wood, 5.45, 3, .07);
  const label = (text, x, y, parent) => { const tx = tex(512, 128, (c, cw, ch) => { c.font = '64px Caprasimo, Georgia, serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.lineWidth = 10; c.strokeStyle = 'rgba(26,19,32,.85)'; c.strokeText(text, cw/2, ch/2); c.fillStyle = '#efe0bf'; c.fillText(text, cw/2, ch/2); });
    tx.wrapS = tx.wrapT = THREE.ClampToEdgeWrapping; return flat(3, .75, mat(0xffffff, tx), x, y, .08, parent); };
  label('the fault', 0, 6.05); label('creek', -3.4, .55, W);
  const ago = label('long ago', 3.4, 5.6), now = label('today!', 3.4, 5.6);
  function step(k){
    W.position.y = 3 + k*D/2; E.position.y = 3 - k*D/2;
    link.scale.y = Math.max(.001, k*D + .36); link.visible = k > .02;
    ago.material.opacity = 1 - clamp01(k*3); now.material.opacity = clamp01((k - .75)*4);
  }
  step(0);
  return {step, shot: (pos, look) => { pos.set(CUT[0], CUT[1] + 3.2, CUT[2] + 13.5); look.set(CUT[0], CUT[1] + 3, CUT[2]); return true; }};
}
