// The mid-ocean ridge: the deep sea floor, where two plates pull apart. A glowing crack winds down a
// rift valley; magma welling up into it comes out as lava, which the cold water crusts into black
// pillows of new sea floor, so the rock is newest by the crack and older, under more and more mud,
// the farther away it lies. The time goggles show the floor spread. Out toward the cliffs live the
// animals of the deep, for anyone who goes looking.

import * as THREE from 'three';
import { T, XF, add, bAdd, bFlush, cyl, ease, fr, glowM, glowTex, grad, grp, mergeGeos, meshOf, outline, sph, tex } from '../../core/kit.js';
import { Sound } from '../../core/sound.js';
import { inWorld } from '../../core/world.js';
import { hero, player } from '../../player.js';
import { game } from '../../state.js';
import { tripBus } from '../bus.js';
import { classmates } from '../class.js';
import { goggles } from '../goggles.js';
import { curio as kitCurio, puffTex, puffs, sample, tripWorld } from '../stop-kit.js';
import { anglerfish, atolla, ghostOctopus, glowJelly, seaPig, whaleFall, yetiCrab } from './deep-life.js';
import { PAD, buildRift, crackX, ground, ledgeX, onLedge, walkable, wallAt } from './rift.js';
import { wonders } from './wonders.js';

// the plates' bands of rock run the valley's length beside the crack, each edge wavering a little
const BAND = 1.35, BANDS = 8, SPREAD = 2.4, Z0 = -25, Z1 = 18, ROWS = 72;
const bandEdge = (j, z) => .35 + BAND*j + (j ? .22*Math.sin(z*.31 + j*1.9) + .12*Math.sin(z*.77 + j*2.3) : 0);
const at = (d, z) => [crackX(z) + d, z];
const PILLOW = at(-1.6, -2.5), SMOKER = at(-6.6, -3.6), MO = at(0, 1.2);
// where the crack gapes widest, and the magma wells up hardest; the sub comes up through it
const MOUTH = at(0, 8.6);
// the sub parks east of the crack, nose to the north, its door toward the crack
const BUS = PAD, BUS_RY = Math.PI/2;
// fresh black rock by the crack, then browner and muddier band by band
const ROCK = ['#1c1822', '#2a2430', '#3a3236', '#4a4038', '#5a4e40', '#665a48', '#706450', '#7a6e58'];
const HOT = new THREE.Color(0xff8a3a), COLD = new THREE.Color(0x1e1a24);

export function buildRidge(t){
  const w = tripWorld({title:'The Mid-Ocean Ridge', bg:0x0a1e38, sky:0x4a86c0, groundCol:0x0a1a2a, hemi:.6, sunCol:0x9ac8ff, sunI:.3, fogNear:12, fogFar:40,
    cam:{oy:7.4, oz:9.2, oyP:9.4, ozP:10.6}});
  w.ground = ground;
  w.bounds = walkable;
  w.surface = () => 'stone';
  w.area = (x, z) => onLedge(x, z) ? 'The High Ledge' : Math.abs(x - crackX(z)) < 2.6 ? 'The Ridge Crack' : 'The Sea Floor';
  w.spawn = [7.6, 2.9, -Math.PI/2];
  // the two plates, each carrying its bands (and whatever sits on them) away from the crack
  const side = {L:null, R:null}, bands = [];
  let fresh, crack, pebble, pg, pillowGlow, mouthPool;
  const worms = [], fish = [], life = [], wellers = [], spatter = [];
  inWorld(w, () => {
    buildRift(w);
    for (const [k, sx] of [['L', -1], ['R', 1]]) {
      const g = side[k] = grp();
      for (let i = 0; i < BANDS; i++) {
        const mud = i/(BANDS - 1), last = i === BANDS - 1, bt = tex(128, 256, (c, cw, ch) => { c.fillStyle = ROCK[i]; c.fillRect(0, 0, cw, ch);
          // lumps of rock, then a dusting of mud that thickens the older the band
          for (let j = 0; j < 60; j++) { c.fillStyle = `rgba(0,0,0,${.25 - mud*.15})`; c.beginPath(); c.arc(Math.random()*cw, Math.random()*ch, 4 + Math.random()*8, 0, 7); c.fill(); }
          for (let j = 0; j < 40 + mud*500; j++) { c.fillStyle = `rgba(170,150,120,${.15 + mud*.35})`; c.fillRect(Math.random()*cw, Math.random()*ch, 2 + Math.random()*3, 2); }
          // the oldest band thins out into the mud of the floor beyond, with no edge to it
          if (last) { c.globalCompositeOperation = 'destination-in'; const f = c.createLinearGradient(0, 0, cw, 0); f.addColorStop(0, '#000'); f.addColorStop(1, 'rgba(0,0,0,0)'); c.fillStyle = f; c.fillRect(0, 0, cw, ch); } });
        const m = new THREE.Mesh(strip(3), T(0xffffff, {map:bt, transparent:last, depthWrite:!last}));
        m.receiveShadow = true; g.add(m); bands.push({m, sx, i, g});
      }
    }
    // new rock: glowing where it wells up in the middle, cooling to black toward its edges as it spreads
    const freshTex = tex(256, 8, (c, cw, ch) => { const g = c.createLinearGradient(0, 0, cw, 0);
      [['#1c1822', 0], ['#3a1a14', .3], ['#ff7a2a', .47], ['#ffd36b', .5], ['#ff7a2a', .53], ['#3a1a14', .7], ['#1c1822', 1]].forEach(([col, a]) => g.addColorStop(a, col));
      c.fillStyle = g; c.fillRect(0, 0, cw, ch); }, 1, 1);
    freshTex.wrapS = THREE.ClampToEdgeWrapping;
    fresh = new THREE.Mesh(strip(4), T(0xffffff, {map:freshTex, emissive:0xffffff, emissiveMap:freshTex, emissiveIntensity:.8})); fresh.visible = false; w.scene.add(fresh);
    // the crack: short jagged glowing pieces winding down the valley, between lips of fresh black rock
    const bits = [], lips = [];
    for (let z = -30, k = 0; z < 24; z += .9, k++) { const x = crackX(z + .45) + Math.sin(k*1.7)*.1, open = 1 + 1.6*Math.exp(-(((z - MOUTH[1])/1.6)**2));
      bits.push([new THREE.BoxGeometry((.34 + Math.abs(Math.sin(k*2.3))*.22)*open, .02, .98), XF(x, 0, z + .45, 1, 1, 1, 0, Math.atan((crackX(z + .9) - crackX(z))/.9) + Math.sin(k*1.3)*.14, 0)]);
      if (z > Z0 && z < Z1) for (const sd of [-1, 1]) for (const dz of [0, .45]) { const r = fr(.13, .2)*Math.sqrt(open);
        lips.push([new THREE.SphereGeometry(r, 7, 5), XF(x + sd*(.3*open + fr(0, .08)), .02, z + dz + fr(-.1, .1), fr(1, 1.4), .45, fr(1.2, 1.7), 0, fr(0, 6), 0)]); } }
    crack = new THREE.Mesh(mergeGeos(bits), glowM(0xc8441a, .7)); crack.position.y = .035; w.scene.add(crack);
    meshOf(mergeGeos(lips), 0x141018, w.scene, .03);
    mouthPool = add(new THREE.CircleGeometry(1, 20), glowM(0xff7a2a, 1), MOUTH[0], .04, MOUTH[1], null, false); mouthPool.rotation.x = -Math.PI/2; mouthPool.scale.set(.7, 1.7, 1);
    for (const z of [-9, 1, MOUTH[1]]) { const l = new THREE.PointLight(0xff7a3a, 1.2, 8, 2); l.position.set(crackX(z), .6, z); w.scene.add(l); if (z === MOUTH[1]) mouthPool.userData.light = l; }
    // magma bulging up into the crack, coming out as lava, and crusting into a black pillow
    const well = (z, r, auto = true) => { const mat = new THREE.MeshToonMaterial({color:HOT.clone(), gradientMap:grad, emissive:0xff5a1a, emissiveIntensity:1.4});
      const m = sph(1, mat, crackX(z), -r, z, null, 14); m.scale.set(r, r*.7, r*1.25); outline(m, 1.05);
      const wl = {m, mat, r, z, x:crackX(z), auto, t:fr(0, 6), period:fr(7, 10)}; wellers.push(wl); return wl; };
    for (const z of [-19, -13.5, -8, -5.2, 4.4, 12.6, 15.4]) well(z, fr(.32, .48));
    well(MOUTH[1], .95, false);
    // a few blobs of lava, flung out when the sub bursts up, that crust over where they land
    for (let i = 0; i < 7; i++) { const mat = new THREE.MeshToonMaterial({color:HOT.clone(), gradientMap:grad, emissive:0xff5a1a, emissiveIntensity:0});
      const m = sph(fr(.14, .24), mat, MOUTH[0], -1, MOUTH[1], null, 10); m.scale.y = .75; outline(m, 1.06); m.visible = false; spatter.push({m, mat, v:new THREE.Vector3(), heat:0, flying:false}); }
    // pillow lava: round black lumps squeezed out of the crack, still faintly glowing at the seams
    pg = grp(PILLOW[0], ground(...PILLOW), PILLOW[1], 0, side.L);
    pillowGlow = T(0x1e1a24, {emissive:0xff5a1a, emissiveIntensity:.25});
    for (let i = 0; i < 9; i++) { const p = sph(.28 + Math.random()*.22, pillowGlow, (Math.random() - .5)*1.4, .15 + Math.random()*.25, (Math.random() - .5)*1.6, pg, 12); p.scale.y = .7; outline(p, 1.04); }
    // more pillows heaped round the mouth, hidden in the hot shimmer until it's blown away
    for (let i = 0; i < 10; i++) { const a = fr(0, 7), q = fr(1.3, 2.4), x = MOUTH[0] + Math.cos(a)*q*.8, z = MOUTH[1] + Math.sin(a)*q*1.4;
      bAdd(0x1e1a24, new THREE.SphereGeometry(1, 10, 7), XF(x, ground(x, z) + .1, z, fr(.3, .5), fr(.2, .3), fr(.35, .55), 0, fr(0, 6), 0), {ink:.04}); }
    bFlush(w.scene);
    // a black smoker: a chimney of minerals, puffing hot black water, with tube worms round its foot
    const sy = ground(...SMOKER), ch = grp(SMOKER[0], sy, SMOKER[1]);
    for (let i = 0; i < 5; i++) { const r = .7 - i*.11; outline(add(new THREE.CylinderGeometry(r*.85, r, .62, 9), T([0x2a2428, 0x3a3034][i % 2]), (i % 2)*.06, .31 + i*.6, 0, ch), 1.03); }
    for (let i = 0; i < 16; i++) { const a = i/16*Math.PI*2 + Math.random()*.3, r = .95 + Math.random()*.5, wx = Math.cos(a)*r, wz = Math.sin(a)*r, wg = grp(wx, ground(SMOKER[0] + wx, SMOKER[1] + wz) - sy, wz, 0, ch), h = .4 + Math.random()*.4;
      add(new THREE.CylinderGeometry(.04, .05, h, 6), T(0xe9e0d0), 0, h/2, 0, wg); sph(.08, T(0xd8303a), 0, h + .04, 0, wg, 8);
      worms.push({g:wg, ph:Math.random()*6}); }
    // yeti crabs clambering on the chimney's warm foot, and round it
    for (const [a, r, y, s] of [[1.9, .72, .35, 1], [2.6, .66, .75, .85], [3.4, .7, .25, 1.1], [.9, 1.5, 0, .9], [4.2, 1.7, 0, 1]]) {
      const x = Math.cos(a)*r, z = Math.sin(a)*r, cy = y || ground(SMOKER[0] + x, SMOKER[1] + z) - sy;
      life.push(yetiCrab(ch, x, cy, z, -a + Math.PI/2 + (y ? Math.PI : 0), s)); }
    // the explorer's pebble, carried to the crack and riding away on whichever plate it's dropped on
    pebble = sph(.15, T(0xc8c0b0), 0, .1, 0, null, 8); pebble.visible = false; outline(pebble, 1.1);
    // light coming down from far above, for a sense of the deep water overhead
    const ray = tex(32, 128, (c, cw, chh) => { const g = c.createLinearGradient(0, 0, 0, chh); g.addColorStop(0, 'rgba(160,210,255,.5)'); g.addColorStop(1, 'rgba(160,210,255,0)'); c.fillStyle = g; c.fillRect(0, 0, cw, chh); });
    for (let i = 0; i < 8; i++) { const r = new THREE.Mesh(new THREE.PlaneGeometry(2.5, 26), new THREE.MeshBasicMaterial({map:ray, transparent:true, depthWrite:false, blending:THREE.AdditiveBlending, opacity:.12, fog:false}));
      r.position.set(-21 + i*6, 20, -16 + (i % 3)*7); r.rotation.z = .25; w.scene.add(r); }
    for (let i = 0; i < 5; i++) { const f = grp(0, 3.4 + i*.7, 0), col = [0xffb070, 0x7ab0d8, 0xffd36b][i % 3];
      const b = sph(.22, T(col), 0, 0, 0, f, 10); b.scale.set(1.6, .8, .6); outline(b, 1.08);
      const tl = add(new THREE.ConeGeometry(.16, .3, 4), T(col), -.42, 0, 0, f); tl.rotation.z = Math.PI/2;
      fish.push({g:f, r:6 + i*2.2, sp:(.25 + i*.05)*(i % 2 ? 1 : -1), a:i*1.3, cz:-3 + i}); }
  });
  const big = wellers.at(-1);

  // ---------- the animals of the deep, out toward the edges ----------
  const herd = [], SEAPIGS = [12.4, 12.6], OCTO = at(-15.1, -17), ANGLER = [ledgeX(1, -14, .55), -14], JELLY = [ledgeX(1, 6, .5), 6], WHALE = [ledgeX(-1, -14, .45), -14];
  inWorld(w, () => {
    for (let i = 0; i < 4; i++) { const a = i*1.6, p = seaPig(w.scene, SEAPIGS[0] + Math.cos(a)*1.2, 0, SEAPIGS[1] + Math.sin(a)*1.2); life.push(p); herd.push({p, a:fr(0, 6), turn:fr(-.3, .3)}); }
    life.push(ghostOctopus(w.scene, OCTO[0], ground(...OCTO), OCTO[1], Math.PI/2));
    // its nook: two boulders either side
    for (const dz of [-1.3, 1.25]) { const x = OCTO[0] - .5, z = OCTO[1] + dz;
      bAdd(0x30343f, new THREE.DodecahedronGeometry(1, 0), XF(x, ground(x, z) + .5, z, .85, 1.3, .8, .2, fr(0, 6), 0), {ink:.06}); }
    bFlush(w.scene);
    life.push(anglerfish(w.scene, ANGLER[0], ground(...ANGLER) + 1.3, ANGLER[1], Math.PI));
    life.push(Object.assign(atolla(w.scene, JELLY[0], ground(...JELLY) + 2.2, JELLY[1]), {at:JELLY}));
    life.push(whaleFall(w.scene, WHALE[0], WHALE[1], Math.PI/2, ground));
    for (const [x, y, z, r, col] of [[-6, 4, -10, 2.5, 0x9ff0ff], [8, 4.6, -4, 3, 0xc8a0ff], [-10, 3.6, 4, 2, 0x9ff0ff], [4, 5, 10, 2.5, 0xffb0e0], [-2, 4.2, -18, 3, 0xc8a0ff], [ledgeX(-1, 6, .5), 4.4, 6, 1.5, 0x9ff0ff]]) life.push(glowJelly(w.scene, x, y, z, r, col));
  });

  // ---------- the water: marine snow, hot shimmer, bubbles, and specks that glow ----------
  const cloud = (n, size, col, map = glowTex, blending = THREE.AdditiveBlending) => { const pos = new Float32Array(n*3), cols = new Float32Array(n*3), geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3)); geo.setAttribute('color', new THREE.BufferAttribute(cols, 3));
    const pts = new THREE.Points(geo, new THREE.PointsMaterial({size, map, vertexColors:true, color:col, transparent:true, depthWrite:false, blending}));
    pts.frustumCulled = false; w.scene.add(pts); return {pos, cols, geo, pts, n}; };
  // marine snow: specks of dust drifting down through the light
  const N = 600, snow = cloud(N, .12, 0xe0f0ff), sp = snow.pos;
  for (let i = 0; i < N; i++) { sp.set([(Math.random() - .5)*60, Math.random()*14, -26 + Math.random()*46], i*3); snow.cols.set([.7, .7, .7], i*3); }
  // the hot water shimmering up out of the crack, thickest at the mouth: fine wisps and big billows
  const wisp = cloud(220, .7, 0xffffff, puffTex), billow = cloud(150, 2.4, 0xffffff, puffTex), steam = [];
  for (const [c, big] of [[wisp, false], [billow, true]]) for (let i = 0; i < c.n; i++) steam.push({c, i, big, age:Math.random()*4, life:1});
  // how thick the mouth's shimmer is (the fan blows it off), and how hard it surges as the sub comes up
  let thick = 1, surge = 0, fanOn = false;
  const puffAt = p => { const mouth = Math.random() < (p.big ? .55 : .35);
    p.z = mouth ? MOUTH[1] + fr(-1.6, 1.6)*(1 + surge) : Z0 + 2 + Math.random()*(Z1 - Z0 - 4); p.mouth = mouth;
    p.x = crackX(p.z) + (Math.random() - .5)*(mouth ? 1.2 : .4); p.y = .05; p.age = 0; p.life = (p.big ? 3.2 : 2.4) + Math.random()*1.6;
    p.vx = (Math.random() - .5)*.2; p.rise = (p.big ? .5 : .75) + Math.random()*.3; };
  const bub = cloud(170, .16, 0xbfe8ff), bubs = [];
  for (let i = 0; i < bub.n; i++) bubs.push({y:99, x:0, z:0, v:1, ph:0});
  const bubble = (x, z, y = .1) => { const b = bubs.find(b => b.y > 8) || bubs[Math.floor(Math.random()*bubs.length)]; Object.assign(b, {x:x + fr(-.3, .3), z:z + fr(-.3, .3), y, v:fr(1, 2), ph:fr(0, 6)}); };
  const burst = (x, z, n, y) => { for (let i = 0; i < n; i++) bubble(x, z, y); };
  const glints = cloud(90, .22, 0xffffff), gph = [];
  for (let i = 0; i < glints.n; i++) { glints.pos.set([(Math.random() - .5)*46, .6 + Math.random()*6, -24 + Math.random()*40], i*3); gph.push([Math.random()*20, .4 + Math.random()*.8]); }
  // the murk the sub comes up into: black mineral smoke and pale hot shimmer filling the whole valley, till
  // the bus's fan swirls it out along a curve, away from the bus, to the cliffs, where some hangs on as haze
  const MC = [crackX(-3.5), -3.5], EX = 15.5, EZ = 24, murk = [];
  const smokeC = cloud(380, 4.4, 0xffffff, puffTex, THREE.NormalBlending), hazeC = cloud(200, 6, 0xffffff, puffTex, THREE.NormalBlending);
  // the pale shimmer skips the fog, so its puffs read as they swirl off, and as haze far out by the cliffs
  smokeC.pts.material.opacity = .82; hazeC.pts.material.fog = false;
  for (const [c, dark] of [[smokeC, true], [hazeC, false]]) for (let i = 0; i < c.n; i++) {
    const a = fr(0, 7), q = Math.sqrt(Math.random()), x = MC[0] + Math.cos(a)*q*EX, z = MC[1] + Math.sin(a)*q*EZ, dx = x - PAD[0], dz = z - PAD[1], d = Math.hypot(dx, dz) || 1;
    // out along the line from the bus until well past the valley's oval
    let s = d; const out = fr(1.08, 1.35); while (((PAD[0] + dx/d*s - MC[0])/EX)**2 + ((PAD[1] + dz/d*s - MC[1])/EZ)**2 < out*out) s += .5;
    const g = dark ? fr(.04, .11) : fr(.5, .68); c.cols.set(dark ? [g, g*.88, g*.85] : [g*1.15, g, g*.78], i*3);
    murk.push({c, o:i*3, x, z, tx:PAD[0] + dx/d*s, tz:PAD[1] + dz/d*s, nx:-dz/d, nz:dx/d, swing:fr(.25, .45)*(s - d), y:fr(.3, dark ? 5.5 : 7.5), d, ph:fr(0, 6)}); }
  // 0 murky, 1 blown clear; the water stays a touch hazier than before, so the far cliffs fade softly
  let clear = 0;
  const fog = w.scene.fog, CLEAR = new THREE.Color(0x0c2036), MURK = new THREE.Color(0x3c352d);
  const murky = k => { fog.color.copy(CLEAR).lerp(MURK, k); w.scene.background.copy(fog.color); fog.near = 9 - 8*k; fog.far = 34 - 18*k; };
  murky(1);

  const bus = tripBus(w); bus.gear('sub');
  // headlights, for the dark down here
  const beam = new THREE.SpotLight(0xfff0c8, 2.2, 22, .5, .5, 1.2); beam.position.set(3.2, 1.2, 0); bus.body.add(beam);
  beam.target.position.set(10, -1.5, 0); bus.body.add(beam.target);
  // a big fan that pops up from the roof, to blow the shimmer off the crack
  const fan = new THREE.Group(), fanHead = new THREE.Group(), blades = new THREE.Group(); fan.position.set(1.1, 2.3, 0); fan.scale.setScalar(.001); fan.visible = false; bus.body.add(fan);
  outline(add(new THREE.CylinderGeometry(.06, .08, .7, 8), T(0x5a5068), 0, .35, 0, fan), 1.1);
  fanHead.position.y = .85; fan.add(fanHead); fanHead.add(blades);
  outline(add(new THREE.TorusGeometry(.72, .06, 8, 24), T(0xd9a441), 0, 0, 0, fanHead), 1.05);
  for (let k = 0; k < 4; k++) { const b = add(new THREE.BoxGeometry(.2, .62, .04), T(0xe9d9b8), 0, .34, 0, blades); const p = new THREE.Group(); p.rotation.z = k*Math.PI/2; p.add(b); blades.add(p); b.rotation.y = .4; }
  sph(.12, T(0xb5552f), 0, 0, .04, fanHead, 10);
  const wind = cloud(60, .5, 0xd8f0ff, puffTex), gusts = []; wind.pts.visible = false;
  for (let i = 0; i < wind.n; i++) gusts.push({k:Math.random(), o:[fr(-.5, .5), fr(-.4, .4)]});
  const fanFrom = new THREE.Vector3(), fanTo = new THREE.Vector3(MOUTH[0] - 1, .8, MOUTH[1]);
  const cls = classmates(w, t, [BUS[0] - 1.6, BUS[1] - 1.6]);

  // everyone wears a bubble helmet down here, with a lamp on its brow; only the explorer's lamp
  // is a real light, the others are glowing cones that cost next to nothing
  const glass = new THREE.MeshBasicMaterial({color:0xbfeaff, transparent:true, opacity:.22, depthWrite:false});
  const rimGlass = new THREE.MeshBasicMaterial({color:0xe8faff, transparent:true, opacity:.35, side:THREE.BackSide, depthWrite:false});
  const coneTex = tex(8, 64, (c, cw, ch) => { const g = c.createLinearGradient(0, 0, 0, ch); g.addColorStop(0, 'rgba(255,240,200,1)'); g.addColorStop(.6, 'rgba(255,240,200,.25)'); g.addColorStop(1, 'rgba(255,240,200,0)'); c.fillStyle = g; c.fillRect(0, 0, cw, ch); });
  coneTex.wrapT = THREE.ClampToEdgeWrapping;
  const coneM = new THREE.MeshBasicMaterial({map:coneTex, color:0xfff0c8, transparent:true, opacity:.22, depthWrite:false, blending:THREE.AdditiveBlending, side:THREE.DoubleSide});
  const coneG = new THREE.ConeGeometry(1.1, 3.6, 16, 1, true); coneG.translate(0, -1.8, 0);
  const lamps = [];
  const helmet = () => { const h = new THREE.Mesh(new THREE.SphereGeometry(.5, 20, 14), glass); h.add(new THREE.Mesh(new THREE.SphereGeometry(.51, 20, 14), rimGlass)); h.position.y = .04;
    const l = grp(0, .26, .4, 0, h); cyl(.09, .11, .1, T(0x5a5068), 0, 0, 0, l, 10).rotation.x = Math.PI/2;
    const bulb = sph(.07, new THREE.MeshBasicMaterial({color:0x6a6050}), 0, 0, .05, l, 10);
    const halo = new THREE.Sprite(new THREE.SpriteMaterial({map:glowTex, color:0xfff0c8, transparent:true, depthWrite:false, blending:THREE.AdditiveBlending})); halo.scale.set(.7, .7, 1); halo.position.z = .1; halo.visible = false; l.add(halo);
    const cone = new THREE.Mesh(coneG, coneM); cone.rotation.x = .55 - Math.PI/2; cone.visible = false; l.add(cone);
    const lamp = {on(v){ halo.visible = cone.visible = v; bulb.material.color.set(v ? 0xfff6d8 : 0x6a6050); }}; lamps.push(lamp); h.userData.lamp = lamp;
    return h; };
  for (const id in cls.n) cls.n[id].model.head.add(helmet());
  const myLamp = new THREE.SpotLight(0xffecc8, 0, 14, .62, .7, 1.4); w.scene.add(myLamp, myLamp.target);
  let myHelmet = null, spread = 0, splits = 0;
  const v = new THREE.Vector3();
  w.anims.push((dt, tt) => {
    for (const id in cls.n) cls.n[id].model.body.position.y += Math.sin(tt*1.6 + id.length)*.05;
    if (myHelmet) { hero.body.position.y += Math.sin(tt*1.6)*.05;
      hero.head.getWorldPosition(v); const a = hero.root.rotation.y, sa = Math.sin(a), ca = Math.cos(a);
      myLamp.position.set(v.x + sa*.4, v.y + .3, v.z + ca*.4); myLamp.target.position.set(v.x + sa*4.5, v.y - 2, v.z + ca*4.5); }
    for (let i = 0; i < N; i++) { sp[i*3 + 1] -= dt*.25; sp[i*3] += Math.sin(tt*.3 + i)*dt*.05; if (sp[i*3 + 1] < 0) sp[i*3 + 1] += 14; }
    snow.geo.attributes.position.needsUpdate = true;
    for (const f of fish) { f.a += dt*f.sp; f.g.position.set(Math.cos(f.a)*f.r, f.g.position.y, f.cz + Math.sin(f.a)*f.r*.6); f.g.rotation.y = -f.a + (f.sp > 0 ? -Math.PI/2 : Math.PI/2); }
    for (const wm of worms) { wm.g.rotation.z = Math.sin(tt*1.4 + wm.ph)*.25; wm.g.rotation.x = Math.cos(tt*1.1 + wm.ph)*.2; }
    crack.material.emissiveIntensity = .7 + Math.sin(tt*2.2)*.12;
    mouthPool.material.emissiveIntensity = .8 + Math.sin(tt*3.1)*.15 + surge*1.5; mouthPool.userData.light.intensity = 1.2 + surge*3 + Math.sin(tt*3.1)*.2;
    for (const c of life) c.tick(dt, tt, c.at && Math.hypot(player.x - c.at[0], player.z - c.at[1]) < 5);
    for (const h of herd) { h.a += h.turn*dt; if (Math.random() < dt*.2) h.turn = fr(-.5, .5);
      const g = h.p.g, nx = g.position.x + Math.sin(h.a)*dt*.18, nz = g.position.z + Math.cos(h.a)*dt*.18;
      // they mooch about their patch of mud, turning for home if they stray
      if (Math.hypot(nx - SEAPIGS[0], nz - SEAPIGS[1]) > 2.4) h.a += dt*1.5; else { g.position.x = nx; g.position.z = nz; }
      g.position.y = ground(g.position.x, g.position.z); g.rotation.y = h.a; }
    for (const wl of wellers) if (wl.auto) { wl.t += dt; if (wl.t > wl.period) { wl.t = 0; wl.period = fr(7, 11); } pose(wl, wl.t/wl.period); }
    for (const s of spatter) if (s.m.visible) {
      if (s.flying) { s.v.y -= dt*6; s.m.position.addScaledVector(s.v, dt); const gy = ground(s.m.position.x, s.m.position.z) + .08; if (s.m.position.y < gy) { s.m.position.y = gy; s.flying = false; bubble(s.m.position.x, s.m.position.z); } }
      s.heat = Math.max(0, s.heat - dt*.3); s.mat.emissiveIntensity = s.heat*1.5; s.mat.color.copy(COLD).lerp(HOT, s.heat); }
    // the shimmer, warm low down and cooling as it rises, blown off the mouth once the fan is on
    for (const p of steam) { p.age += dt; if (p.age >= p.life) puffAt(p);
      const k = p.age/p.life, gust = p.mouth ? (1 - thick)*3 : 0;
      p.x += (p.vx + gust + Math.sin(tt*.7 + p.z)*.08)*dt; p.y += p.rise*dt*(1 - k*.5)*(p.mouth ? 1 + surge*1.5 : 1);
      const f = Math.sin(Math.PI*Math.min(1, k*1.2))*(p.mouth ? .05 + .75*thick + surge*.4 : .22)*(p.big ? .55 : 1), o = p.i*3;
      p.c.pos[o] = p.x; p.c.pos[o + 1] = p.y; p.c.pos[o + 2] = p.z;
      p.c.cols[o] = f*(1 - k*.3); p.c.cols[o + 1] = f*(.78 + k*.12); p.c.cols[o + 2] = f*(.62 + k*.38); }
    for (const c of [wisp, billow]) { c.geo.attributes.position.needsUpdate = c.geo.attributes.color.needsUpdate = true; }
    if (Math.random() < dt*(5 + surge*60)) { const z = Math.random() < .3 + surge*.6 ? MOUTH[1] : Z0 + Math.random()*(Z1 - Z0); bubble(crackX(z), z); }
    bubs.forEach((b, i) => { b.y += b.v*dt; const o = i*3; bub.pos[o] = b.x + Math.sin(tt*3 + b.ph)*.08; bub.pos[o + 1] = b.y; bub.pos[o + 2] = b.z; const f = b.y > 8 ? 0 : .8; bub.cols.set([f, f, f], o); });
    bub.geo.attributes.position.needsUpdate = bub.geo.attributes.color.needsUpdate = true;
    gph.forEach(([ph, r], i) => { const f = Math.pow(Math.max(0, Math.sin(tt*r + ph)), 6); glints.cols.set([f*.3, f*.9, f], i*3); });
    glints.geo.attributes.color.needsUpdate = true;
    // nearest the bus goes first; each puff bows sideways on its way out, so the whole murk turns as it goes
    for (const m of murk) { const u = ease(Math.min(1, Math.max(0, clear*1.9 - m.d/34*.9))), b = Math.sin(Math.PI*u)*m.swing, p = m.c.pos, o = m.o;
      p[o] = m.x + (m.tx - m.x)*u + m.nx*b + Math.sin(tt*.21 + m.ph)*.6; p[o + 1] = m.y + Math.sin(tt*.37 + m.ph)*.35 + u*2.2; p[o + 2] = m.z + (m.tz - m.z)*u + m.nz*b + Math.cos(tt*.17 + m.ph)*.6; }
    smokeC.geo.attributes.position.needsUpdate = hazeC.geo.attributes.position.needsUpdate = true; hazeC.pts.material.opacity = .42 - .26*clear;
    if (fan.visible) { blades.rotation.z += dt*(fanOn ? 16 : .5); }
    if (fanOn) { fanHead.getWorldPosition(fanFrom);
      gusts.forEach((g, i) => { g.k += dt*.45; if (g.k > 1) g.k -= 1; const o = i*3;
        wind.pos[o] = fanFrom.x + (fanTo.x - fanFrom.x)*g.k + g.o[0]*g.k; wind.pos[o + 1] = fanFrom.y + (fanTo.y - fanFrom.y)*g.k + g.o[1]; wind.pos[o + 2] = fanFrom.z + (fanTo.z - fanFrom.z)*g.k + g.o[0]*g.k*2;
        const f = Math.sin(Math.PI*g.k)*.22; wind.cols.set([f, f, f], o); });
      wind.geo.attributes.position.needsUpdate = wind.geo.attributes.color.needsUpdate = true; }
    // Mo does the splits as the plates under each foot slide apart
    const mo = cls.n.mo.model;
    if (splits > 0) { const a = Math.min(.95, splits*1.15); mo.legL.rotation.z = -a; mo.legR.rotation.z = a; mo.body.position.y -= .55*(1 - Math.cos(a)); }
    else { mo.legL.rotation.z = mo.legR.rotation.z = 0; }
  });
  // one welling of magma at k of the way through: up out of the crack glowing, crusted black, then
  // slowly sunk back as the crack swallows its old pillows and makes room for the next
  function pose(wl, k){
    const up = ease(Math.min(1, k/.2)), heat = k < .2 ? 1 : Math.max(0, 1 - (k - .2)/.4), down = k > .85 ? ease((k - .85)/.15) : 0;
    wl.m.position.y = wl.r*(-.75 + .78*up - .75*down); wl.m.scale.set(wl.r*(.5 + .5*up), wl.r*.7*(.5 + .5*up), wl.r*1.25*(.5 + .5*up));
    wl.mat.emissiveIntensity = heat*1.4; wl.mat.color.copy(COLD).lerp(HOT, heat);
    if (k > .05 && k < .2 && Math.random() < .3) bubble(wl.x, wl.z);
  }
  wellers.forEach(wl => pose(wl, wl.auto ? wl.t/wl.period : 0));
  steam.forEach(p => { puffAt(p); p.age = Math.random()*p.life; });
  // the plates spread k of the way: the sides slide out, and fresh rock fills the gap
  const spreadTo = k => { spread = k; side.L.position.x = -SPREAD*k; side.R.position.x = SPREAD*k;
    for (const b of bands) drape(b.m, (z, u) => b.sx*(bandEdge(b.i, z) + (bandEdge(b.i + 1, z) - bandEdge(b.i, z))*u), b.g.position.x, .02 + (BANDS - b.i)*.003);
    fresh.visible = k > .002; const half = SPREAD*k + .38;
    if (fresh.visible) drape(fresh, (z, u) => (u*2 - 1)*half, 0, .015);
    pg.position.y = ground(PILLOW[0] - SPREAD*k, PILLOW[1]);
    if (pebble.parent === side.L || pebble.parent === side.R) pebble.position.y = ground(pebble.position.x + pebble.parent.position.x, pebble.position.z) + .1; };
  spreadTo(0);
  // how many bands out from the crack a spot is; the last ones in reach are the oldest
  const bandAt = (x, z) => { const a = Math.abs(x - crackX(z)) - SPREAD*spread; let j = -1; while (j < BANDS && bandEdge(j + 1, z) <= a) j++; return j; };

  // ---------- what the class finds ----------
  const say = t.say;
  let goggled = false;
  cls.find('juniper', {name:'pillow', when: () => clear >= 1, at:[PILLOW[0] + .8, PILLOW[1] + 1.1, -2.5], pose:'crouch', call:"Come feel these lumpy rocks!", after:["Brand-new sea floor. Fresh from the crack!"],
    async scene(){
      pillowGlow.emissiveIntensity = .6;
      await say([['juniper', "Touch this lumpy rock, {name}. It's still a tiny bit warm!"]]);
      const pick = await t.ask('juniper', "Where do you think this rock came from?", ["Out of the crack", "It fell off a boat", "It was always here"]);
      await say([['juniper', pick === 0 ? "Yes! Hot lava oozed out of the crack." : "Nope! Hot lava oozed out of that glowing crack."],
                 ['juniper', "The cold water cooled it into new rock. Brand-new sea floor!"]]);
      pillowGlow.emissiveIntensity = .25;
    }});
  cls.find('mo', {name:'pebble', when: () => clear >= 1, at:[MO[0], MO[1], 0], pose:'still', call:"{name}! Look at my feet!", after:["My legs still feel a million years old."],
    async scene(){
      await say([['mo', "Look! One foot on each side of the crack."], ['mo', "Each foot's on a different plate!"],
                 ['mo', "Here's a pebble. Drop it right by the crack, {name}."]]);
      t.hold(pebble); Sound.tone(500, {type:'triangle', dur:.1, vol:.05});
      for (;;) {
        // the whole valley floor is in reach, so it can be dropped anywhere; the glow marks the crack by Mo's feet
        await t.free(t.use(w, {name:'Pebble', x:MO[0], z:MO[1], range:40, verb:'Drop the pebble', short:'Drop', glow:[crackX(MO[1] + .4) + .7, .4, MO[1] + .4]}), 'Drop the pebble right by the crack');
        if (Math.abs(player.x - crackX(player.z)) < 1.6 && Math.abs(player.z - MO[1]) < 2.4) break;
        await say([['mo', "Closer to the crack!"]]);
      }
      const sd = Math.sign(player.x - crackX(player.z)) || 1, plate = sd < 0 ? side.L : side.R, p = t.drop(), y0 = p.position.y;
      plate.attach(p); p.scale.setScalar(1);
      // never in the glowing crack itself, where there's no plate yet to carry it
      const cx = crackX(p.position.z); p.position.x = cx + sd*Math.max(.55, Math.abs(p.position.x + plate.position.x - cx)) - plate.position.x;
      const y1 = ground(p.position.x + plate.position.x, p.position.z) + .1;
      await t.tween(.4, k => { p.position.y = y0 + (y1 - y0)*k*k; });
      Sound.tone(300, {type:'triangle', dur:.12, vol:.06});
      const pick = await t.ask('mo', "What will happen to your pebble?", ["New rock carries it away from the crack", "The crack swallows it", "Nothing happens"]);
      await say([['mo', "Let's find out. Time goggles on!"]]);
      const from = spread;
      await goggles(t, {years:1e6, dur:7,
        shot: (pos, look) => { pos.set(MO[0], 3.4, MO[1] + 7.5); look.set(MO[0], .2, MO[1] - 1.5); },
        step: k => { spreadTo(from + (1 - from)*k); splits = k; }});
      await say([['mo', pick === 0 ? "You were right! New rock carried your pebble away from the crack." : "Whoa! New rock carried your pebble away from the crack."],
                 ['mo', "And my feet slid apart too! Whoa, what a stretch!"],
                 ['sparks', "The plates pull apart. Hot rock fills the gap and makes new sea floor."],
                 ['basil', "So that's what happens at a crack in the sea floor! New rock comes up and carries things away."]]);
      const line = wonders(2);
      const s0 = splits; await t.tween(.6, k => { splits = s0*(1 - k); });
      await say([['basil', line]]);
      goggled = true;
    }});
  // the first thing the bus does here is blow the murk away: magic, but only to show what's really there,
  // so everyone who comes sees the magma well up
  const switchAt = (() => { const a = BUS_RY, lx = -2, lz = -1.75; return [BUS[0] + lx*Math.cos(a) + lz*Math.sin(a), BUS[1] - lx*Math.sin(a) + lz*Math.cos(a)]; })();
  async function blowClear(){
    await say([['pip', "{name}, I can't see into the crack! Something's glowing down there, but it's all steamy!"],
               ['sparks', "It's really super-hot water, shimmering up from under the crack."],
               ['sparks', "Way down here, the water's squeezed so hard it can't even boil!"],
               ['juniper', "Why does everything look so wobbly?"],
               ['sparks', "Hot water bends light a little differently from cold water. So it shimmers, like air over a hot road."],
               ['basil', "And what's all that black smoke?"],
               ['sparks', "The hot water soaks minerals out of the rock deep down, the way tea soaks up sugar."],
               ['sparks', "When it hits the icy sea, the minerals turn into tiny black specks. That's the smoke!"],
               ['pip', "I still can't see a thing. Hey! Doesn't the Wonder Bus have a fan?"]]);
    // up it pops from the roof, turned to the crack
    fan.visible = true; bus.root.updateMatrixWorld(true); fanHead.lookAt(fanTo);
    t.cut((pos, look) => { pos.set(BUS[0] - 5, 4.2, BUS[1] + 6.5); look.set(BUS[0], 2.4, BUS[1]); });
    Sound.tone(392, {type:'triangle', dur:.12, vol:.07, f2:784});
    await t.tween(.5, k => { fan.scale.setScalar(.001 + k*(1.15 - .15*k)); });
    await say([['sparks', "It does! That water's far too hot to swim into. But we can blow it aside, and peek at what's really underneath."],
               ['pip', "There it is! Go switch it on, {name}!"]]);
    await t.free(t.use(w, {name:'Bus fan', x:switchAt[0], z:switchAt[1], y:ground(...switchAt), verb:'Switch on the fan', short:'Fan', glow:[switchAt[0], ground(...switchAt) + 1.3, switchAt[1]]}), 'Switch on the bus’s fan');
    fanOn = true; wind.pts.visible = true;
    Sound.hiss({dur:4, vol:.1, type:'bandpass', freq:600, f2:1400, q:.6}); Sound.tone(140, {type:'sawtooth', dur:1.2, vol:.04, f2:320, cut:700});
    // high over the bus, to watch the murk swirl off down the valley
    t.cut((pos, look) => { pos.set(BUS[0] + 4.5, 8.5, BUS[1] + 9); look.set(MOUTH[0] - 1, .5, MOUTH[1] - 6); });
    await t.tween(5, k => { clear = k; murky(1 - ease(Math.max(0, k*1.6 - .6))); thick = 1 - ease(Math.min(1, k*1.3)); });
    const side = (pos, look) => { pos.set(MOUTH[0] - 3.6, 2.2, MOUTH[1] + 3.8); look.set(MOUTH[0] + .4, .5, MOUTH[1]); };
    t.cut(side);
    // with the water clear, the magma bulges up, glows as lava in the cold sea, and crusts over
    Sound.tone(90, {type:'sawtooth', dur:2, vol:.06, f2:60, cut:400});
    await t.tween(2.2, k => pose(big, k*.2));
    await say([['pip', "Whoa! Glowing melted rock, pushing up out of the crack!"],
               ['sparks', "Hot rock rises up from the mantle, and a little of it melts. Underground, that's magma."],
               ['juniper', "And once it comes out here on the sea floor, it's called lava. Remember?"]]);
    const pick = await t.ask('pip', "What happens when hot lava touches the icy water?", ["It cools into black rock", "It stays runny forever", "It turns into sand"]);
    await t.tween(2.4, k => pose(big, .2 + k*.42));
    await say([['pip', pick === 0 ? "Yes! Its skin cools fast, into a lumpy black pillow." : "Look! Its skin cools fast, into a lumpy black pillow."],
               ['pip', "That's brand-new sea floor, being made right now!"], ['pip', "Magma comes up, lava cools. New sea floor!"]]);
    big.t = .62*big.period; big.auto = true;
    t.cut(null);
  }
  cls.find('pip', {name:'stripes', at:[crackX(-3.4) + 2.6, -3.4, -Math.PI/2], when: () => goggled, call:"Come look at the stripes!", after:["Newest by the crack, oldest far away. Like rings in a tree!"],
    async scene(){
      const pip = cls.n.pip, cx = crackX(-3.4);
      t.cut((pos, look) => { pos.set(cx + 5, 4.2, 3.8); look.set(cx + 5, 0, -3.4); });
      await say([['pip', "See the stripes on the floor? Here by the crack, the rock is shiny and black."],
                 ['pip', "New rock comes out of the crack. So go stand on the oldest rock!"]]);
      const band = () => bandAt(player.x, player.z), OLDEST = 5;
      const t0 = game.elapsed, said = new Set();
      const beside = () => { const sd = Math.sign(player.x - crackX(player.z)) || 1; pip.pose = null;
        pip.goal = {x:crackX(player.z) + sd*Math.max(2.6, Math.abs(player.x - crackX(player.z)) - 1.2), z:player.z - .9, angle:Math.PI}; };
      const comment = (id, line) => { if (said.has(id)) return false; said.add(id); beside(); say([['pip', line]]); return true; };
      await t.free(t.until(() => {
        const b = band(), wait = game.elapsed - t0;
        if (b >= OLDEST) return true;
        if (b >= 3) comment('mud', "Muddier and muddier! Keep going!");
        else if (b >= 1) comment('brown', "Browner here. A little dusty!");
        if (wait > 10 && b < 1) comment('shiny', "Hmm. Is shiny black rock old? Look for the muddiest rock!");
        if (wait > 20 && comment('lead', "Follow me, {name}! Way out here.")) pip.goal = {x:cx + SPREAD + 8.6, z:-3.4, angle:Math.PI};
        return wait > 40;
      }), 'Go stand on the oldest rock');
      await say([['pip', band() >= OLDEST ? "Yes! It's had the longest time to get muddy." : "Out here! It's had the longest time to get muddy."],
                 ['pip', "Newest by the crack, older and older as you go. Like rings in a tree!"]]);
      t.cut(null);
    }});
  cls.find('basil', {name:'smoker', when: () => clear >= 1, at:[SMOKER[0] + 1.4, SMOKER[1] + 1.3, -2.3], call:"That chimney is puffing black smoke!", after:["Worms that don't need sunlight! I never even thought to wonder about that."],
    async scene(){
      smoke.burst = 1.2;
      t.cut((pos, look) => { pos.set(SMOKER[0] + 3.2, ground(...SMOKER) + 2.4, SMOKER[1] + 3.6); look.set(SMOKER[0], ground(...SMOKER) + 1.4, SMOKER[1]); });
      await say([['basil', "{name}, that chimney is puffing black smoke. Underwater!"],
                 ['basil', "It's that hot mineral water from under the crack. And look at the worms!"]]);
      const pick = await t.ask('basil', "It's so dark down here. Can plants grow?", ["No, there's no sunlight", "Yes, lots of plants"]);
      await say([['basil', pick === 0 ? "Right, no sunlight at all." : "Nope, it's much too dark. No sunlight at all."],
                 ['basil', "The worms get their food from the hot water instead. So weird!"]]);
      t.cut(null);
    }});
  const smoke = puffs(w, SMOKER[0], ground(...SMOKER) + 3.2, SMOKER[1], {rate:3, rise:1.1, size:1.4, color:0x18141c, opacity:.75, spread:.3, life:3.2});
  // two stubbier chimneys along the crack, puffing their share of the murk
  inWorld(w, () => { for (const [d, z] of [[-2.6, -11.5], [2.5, 13.4]]) { const [x, zz] = at(d, z), y = ground(x, zz), g = grp(x, y, zz);
    for (let i = 0; i < 3; i++) outline(add(new THREE.CylinderGeometry(.34 - i*.08, .44 - i*.08, .5, 8), T([0x2a2428, 0x3a3034][i % 2]), (i % 2)*.04, .25 + i*.48, 0, g), 1.04);
    puffs(w, x, y + 1.6, zz, {rate:2, rise:1, size:1, color:0x18141c, opacity:.7, spread:.25, life:3}); } });
  cls.hint = () => goggled ? (cls.saw('stripes') ? "Back to the bus whenever you're ready, {name}! Or go see anyone still waving. Or go exploring: who knows what lives out by the cliffs?" : "Pip is waving at you. Go see the stripes!") :
    "Mo is standing on the crack, and Juniper found some lumpy rocks. Go see! I think there's a job for my time goggles.";

  // ---------- things to look closer at, for anyone who goes exploring ----------
  const curio = (name, at, y, lines, view, lift) => kitCurio(w, t, {name, at, y, lines, view, lift});
  curio('Fuzzy crabs', at(-7.8, -2.4), ground(...SMOKER) + 1, [['sparks', "Yeti crabs! See their fuzzy, hairy arms?"],
    ['sparks', "They grow tiny living things called bacteria in all that fuzz. Then they eat them!"],
    ['sparks', "They wave their arms in the warm vent water, to help their garden grow."]], [-.6, 1]);
  curio('Pink blobs', SEAPIGS, ground(...SEAPIGS) + 1, [['sparks', "Sea pigs! They're really a kind of sea cucumber."],
    ['sparks', "They walk on squishy tube feet, slurping up tasty bits from the mud."]], [-1, .7]);
  curio('Something pale', [OCTO[0] + .6, OCTO[1]], ground(...OCTO) + 1.1, [['sparks', "Shh, {name}. A ghostly octopus!"],
    ['sparks', "It's so pale it looks like a ghost. Down here in the dark, nobody would see its colours anyway."],
    ['sparks', "Scientists saw this kind for the very first time in 2016!"]], [1, .45]);
  curio('Glowing light', [ANGLER[0] - 1, ANGLER[1]], ground(...ANGLER) + 2, [['sparks', "Careful, {name}! An anglerfish!"],
    ['sparks', "See the glowing ball on its head? Tiny living things inside it make the light."],
    ['sparks', "Little fish swim up to see the glow, and then… gulp!"]], [.15, 1], 1.3);
  curio('Flashing jelly', JELLY, ground(...JELLY) + 1.2, [['sparks', "Whoa! That jellyfish is flashing its lights at you!"],
    ['sparks', "Lots of deep-sea animals make their own light. It's called bioluminescence."],
    ['sparks', "If something tries to eat this one, it flashes like a burglar alarm. That calls a bigger animal to scare the attacker away!"]], [-.15, 1], 2);
  curio('Big bones', [WHALE[0] + .9, WHALE[1] + 1], ground(...WHALE) + 1, [['sparks', "Whale bones! When a whale dies, it sinks all the way down here."],
    ['sparks', "Crabs, fish, and red bone-eating worms come to feast on it."], ['sparks', "One whale can feed them for years and years!"]], [1, .2]);

  // samples for the microscope at home: a scoop of the oldest, softest mud, up on the high ledge, made of
  // tiny shells; and a white mat of microbes round the back of the big smoker
  const OOZE = [ledgeX(-1, 11, .25), 11], MAT = at(-5.4, -5.8);
  for (const [dx, dz, r] of [[0, 0, .55], [.5, -.3, .35], [-.4, .35, .3]]) { const x = OOZE[0] + dx, z = OOZE[1] + dz; sph(r, T(0xe8dcc4), x, ground(x, z) - r*.1, z, w.scene, 10).scale.y = .3; }
  for (const [dx, dz, r] of [[0, 0, .4], [.4, .25, .28], [-.35, .2, .25], [.15, -.38, .22], [-.2, -.3, .18]]) { const x = MAT[0] + dx, z = MAT[1] + dz;
    sph(r, T(0xf4f2ea, {emissive:0x8a9aa8, emissiveIntensity:.25}), x, ground(x, z) + .02, z, w.scene, 9).scale.y = .22; }
  sample(w, t, {ids:['foram', 'radiolarian', 'diatom'], at:OOZE, y:ground(...OOZE) + .6, verb:'Scoop up some sea-floor mud'});
  sample(w, t, {ids:['microbes'], at:MAT, y:ground(...MAT) + .6, verb:'Collect some of the white fuzz'});

  return {world:w, bus, cls,
    // the magma the class rode up the mantle on brings the bus with it: up out of the crack's mouth
    // in its heat bubble, then fins out and over to settle by the crack
    async arrive(){
      bus.gear('bubble'); bus.root.position.set(MOUTH[0], -5, MOUTH[1]); bus.root.rotation.set(0, 0, 0); bus.body.rotation.set(0, 0, .35);
      t.watch(w, (pos, look) => { pos.set(MOUTH[0] - 6.5, 2.4, MOUTH[1] - 5.5); look.set(MOUTH[0], 1.8, MOUTH[1]); });
      Sound.tone(70, {type:'sawtooth', dur:2.6, vol:.07, f2:110, cut:300}); Sound.hiss({dur:2.6, vol:.06, type:'lowpass', freq:400});
      await t.tween(2.4, k => { surge = k*k; big.m.position.y = big.r*(-.75 + .7*k*k); big.m.scale.set(big.r*(.5 + .6*k), big.r*.7*(.5 + .7*k), big.r*1.25*(.5 + .5*k)); game.camShake = Math.max(game.camShake, k*.9); });
      Sound.tone(220, {type:'triangle', dur:.25, vol:.08, f2:660}); Sound.hiss({dur:.8, vol:.12, type:'bandpass', freq:900});
      burst(MOUTH[0], MOUTH[1], 50, .3);
      spatter.forEach(s => { const a = fr(0, 7); s.m.position.set(MOUTH[0], .6, MOUTH[1]); s.v.set(Math.cos(a)*fr(1.5, 3), fr(3, 5), Math.sin(a)*fr(1.5, 3)); s.heat = 1; s.flying = s.m.visible = true; });
      // up it bursts, overshooting, as the magma it rode on slumps back into the crack
      await t.tween(1.3, k => { const c = 1.7, q = k - 1, e = 1 + (c + 1)*q*q*q + c*q*q;
        bus.root.position.y = -5 + 8.4*e; bus.body.rotation.z = .35*(1 - k);
        big.m.position.y = big.r*(-.05 - .7*k); surge = 1 - k*.6; });
      pose(big, 0);
      await t.wait(.6);
      // pop goes the bubble, and out come the fins
      bus.gear('sub'); burst(MOUTH[0], MOUTH[1], 60, 2.4);
      Sound.tone(880, {type:'sine', dur:.08, vol:.08, f2:1400}); Sound.tone(523, {type:'triangle', t:.12, dur:.2, vol:.06}); Sound.tone(784, {type:'triangle', t:.22, dur:.25, vol:.06});
      await t.wait(.8);
      await say([['pip', "Whoosh! We popped right out onto the sea floor!"], ['pip', "Bubbles! We're a submarine now?!"], ['mo', "Um, where is the sea floor? It's all murky!"],
                 ['sparks', "Welcome to a ridge on the ocean floor!"]]);
      const gy = ground(...BUS);
      t.watch(w, (pos, look) => { pos.set(MOUTH[0] - 4, 5, MOUTH[1] - 7); look.copy(bus.root.position); });
      t.tween(3, k => { surge = .4*(1 - k); });
      await bus.fly([[MOUTH[0], 3.4, MOUTH[1]], [MOUTH[0] + 3.4, 3, MOUTH[1] + .6], [BUS[0] - .8, 1, BUS[1] + 4.6], [BUS[0], gy + .12, BUS[1] + 2.4], [BUS[0], gy, BUS[1]]], 3.8, {roll:.5});
      bus.park(BUS[0], gy, BUS[1], BUS_RY);
      Sound.tone(330, {type:'triangle', dur:.12, vol:.08}); Sound.tone(494, {type:'triangle', t:.1, dur:.18, vol:.08});
      const [dx, dz] = bus.door(.6);
      t.cut((pos, look) => { pos.set(9, 8.5, 14); look.set(1, 0, 0); });
      cls.arrive({sparks:[dx - .4, dz + 1.3, -Math.PI/2]});
      await t.wait(2.6);
      await say([['sparks', "Helmets on, everyone! Somewhere in this murk is a glowing crack, where two plates pull apart."]]);
      myHelmet = helmet(); hero.head.add(myHelmet);
      t.onEnd(() => { if (myHelmet) { myHelmet.parent.remove(myHelmet); myHelmet = null; } });
      t.play(w, [dx, dz, -Math.PI/2]); game.cutscene = true;
      // one lamp after another clicks on, the explorer's last
      for (const l of lamps) { l.on(true); Sound.tone(1400, {type:'square', dur:.03, vol:.03, cut:3000}); if (l === myHelmet.userData.lamp) myLamp.intensity = 1.3; await t.wait(.22); }
      await say([['sparks', "And lamps on! It's very, very dark this deep."]]);
      await blowClear();
      game.cutscene = false;
      t.goal('Visit anyone who waves!');
    },
    async explore(){
      await t.until(() => cls.saw('pebble') && !game.cutscene);
      await t.wait(.6);
      if (await t.more('sparks', "Want to hear something amazing about this crack?"))
        await say([['sparks', "It runs all the way to Iceland, where it comes up on land."], ['sparks', "People there can walk between two plates!"]]);
      await say(cls.leaving("let's see this ridge from way up high!"));
      cls.gather([bus.root.position.x - 1.6, bus.root.position.z - 1.2, 0]);
      await cls.board(bus);
    },
    // up toward the light, until the sub is out of sight
    async depart(){
      if (myHelmet) { myHelmet.parent.remove(myHelmet); myHelmet = null; }
      myLamp.intensity = 0;
      for (const id in cls.n) { cls.n[id].model.root.visible = false; cls.n[id].label.visible = false; }
      t.watch(w, (pos, look) => { pos.set(-2, 3, 14); look.set(bus.root.position.x, bus.root.position.y, bus.root.position.z); });
      Sound.hiss({dur:3, vol:.08, type:'lowpass', freq:500});
      const gy = bus.root.position.y;
      await bus.fly([[BUS[0], gy, BUS[1]], [BUS[0], gy + 2, 1], [7, gy + 8, -4], [4, gy + 18, -10], [2, gy + 32, -14]], 4.2, {roll:.4});
    },
  };
  // a ribbon of cols + 1 columns running down the valley, to be laid on the floor by drape()
  function strip(cols){
    const g = new THREE.BufferGeometry(), n = (ROWS + 1)*(cols + 1), idx = [];
    for (let r = 0; r < ROWS; r++) for (let c = 0; c < cols; c++) { const a = r*(cols + 1) + c, b = a + cols + 1; idx.push(a, b, a + 1, a + 1, b, b + 1); }
    g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(n*3), 3)); g.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(n*2), 2)); g.setIndex(idx);
    g.userData.cols = cols; return g;
  }
  // lays a strip along the crack: across(z, u) is how far from the crack its column u (0 to 1) lies,
  // ox how far its plate has slid, and lift how high it rides over the floor
  function drape(m, across, ox, lift){
    const g = m.geometry, cols = g.userData.cols, p = g.attributes.position, uv = g.attributes.uv;
    // a strip on the west side runs right to left; laid as given its faces would turn to the ground
    const flip = across(0, 1) < across(0, 0);
    for (let r = 0; r <= ROWS; r++) { const z = Z0 + r*(Z1 - Z0)/ROWS, cx = crackX(z);
      for (let c = 0; c <= cols; c++) { const i = r*(cols + 1) + c, u = flip ? 1 - c/cols : c/cols, x = cx + across(z, u);
        p.setXYZ(i, x, ground(x + ox, z) + lift, z); uv.setXY(i, u, z/4.5); } }
    p.needsUpdate = uv.needsUpdate = true; g.computeVertexNormals(); g.computeBoundingSphere();
  }
}
