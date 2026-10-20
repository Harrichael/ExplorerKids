// The volcano rim: where the trip lands first, and where its big question comes from. A ring of warm
// black rock around a crater with a lava lake churning far below, and out along the coast, more
// volcanoes standing in a row. Why in a row? The rest of the trip finds out.

import * as THREE from 'three';
import { T, XF, add, bAdd, bFlush, box, clamp01, cyl, ease, fr, glowTex, grp, mergeGeos, meshOf, outline, sph, tex } from '../../core/kit.js';
import { Sound } from '../../core/sound.js';
import { addUsable, inWorld } from '../../core/world.js';
import { hero, player } from '../../player.js';
import { game } from '../../state.js';
import { tripBus } from '../bus.js';
import { classmates } from '../class.js';
import { curio, puffs, signpost, tripWorld } from '../stop-kit.js';
import { lavaLake } from './lava.js';
import { plume } from './plume.js';
import { storySky } from '../sky.js';
import { worries } from './worries.js';

// the crater sits at the origin; the walkable rim is the ring around it
const CRATER = 6.6, RIM = 14.2, LAVA = -6.8, SEA = -34;
// the other volcanoes along the coast, all on one line, the line where two plates meet
const CHAIN = [[130, -26], [205, -41], [285, -57], [-125, 25], [-215, 43]];
const VENT = [6.8, 5.4], POOL = [-7.6, 6.2], TOAST = [-9.6, .8];
// the lookout: off to the south-west, clear of the finds, with the plume rising off to one side
const LOOK = [-5.5, -5.5];
// the bus parks on the east of the rim, nose to the north, its door toward the crater
const BUS = [10.6, 3.2], BUS_RY = Math.PI/2;
// things to find, out round the far side of the rim and in its nooks, away from where the class goes
const BOMB = [5.4, -8.6], OBS = [-5.6, -11.3], FUM = [1, -11.6], PELE = [-12.4, 3.4], FERN = [-5.2, 11.6], FLOWS = [13.2, -2.3], SEIS = [-11.2, -4.4];
const FINDS = [BOMB, OBS, FUM, PELE, FERN, FLOWS, SEIS];
const binoc = document.createElement('div'); binoc.id = 'binoc'; binoc.hidden = true; document.body.append(binoc);

const sm = (a, b, v) => { const k = clamp01((v - a)/(b - a)); return k*k*(3 - 2*k); };
const hash = (x, z) => { const s = Math.sin(x*12.9898 + z*78.233)*43758.5453; return s - Math.floor(s); };
// the rim's height: a crumbly lip at the crater's edge and low lumps of old lava, smoothed flat
// wherever something sits on the ground (the bus, the pool, the warm patch, the vent, the lookout)
const FLATS = [[POOL[0], POOL[1], 1.4], [TOAST[0], TOAST[1], 1.5], [VENT[0], VENT[1], .6], [LOOK[0], LOOK[1], .8], [BOMB[0], BOMB[1], .5], [FUM[0], FUM[1], .7], [SEIS[0], SEIS[1], .9]];
function rimY(x, z){
  const r = Math.hypot(x, z), a = Math.atan2(z, x);
  const lip = .32*Math.exp(-(((r - CRATER - .25)/.32)**2))*(.75 + .35*Math.sin(a*13) + .15*Math.sin(a*31));
  const lump = (.16*Math.sin(x*.8 + Math.sin(z*.6)*1.7)*Math.cos(z*.9 - x*.35) + .07*Math.sin(x*2.1 - z*1.7))*sm(CRATER + .3, CRATER + 1.3, r)*sm(RIM + .3, RIM - 1, r);
  let flat = sm(1.4, 3, Math.hypot(x - BUS[0], Math.max(0, Math.abs(z - 2.85) - 2.85)));
  for (const [fx, fz, f0] of FLATS) flat *= sm(f0, f0 + 1.2, Math.hypot(x - fx, z - fz));
  return lip + lump*flat;
}
// a surface turned round the crater's axis from a profile of [radius, height] rows; at(a, r, y, row, colour)
// gives each vertex its place, so the rock can bulge, crack and band
function revolve(rows, segs, at){
  const pos = [], cols = [], uvs = [], idx = [], c = new THREE.Color();
  rows.forEach(([r, y], j) => { for (let i = 0; i <= segs; i++) { const p = at(i/segs*Math.PI*2, r, y, j, c); pos.push(...p); cols.push(c.r, c.g, c.b); uvs.push(i/segs, j/(rows.length - 1)); } });
  for (let j = 0; j < rows.length - 1; j++) for (let i = 0; i < segs; i++) { const p = j*(segs + 1) + i, q = p + segs + 1; idx.push(p, p + 1, q, q, p + 1, q + 1); }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('color', new THREE.Float32BufferAttribute(cols, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  g.setIndex(idx); g.computeVertexNormals(); return g;
}

export function buildRim(t){
  const w = tripWorld({title:'The Volcano Rim', bg:0x9a86c0, sky:0xe0d0f4, groundCol:0x3a2a30, hemi:.78, sunCol:0xffd2a2, sunI:.85, fogNear:80, fogFar:460,
    cam:{oy:7.4, oz:9.2, oyP:9.4, ozP:10.6}});
  w.far = 600;
  const ring = (x, z) => Math.hypot(x, z);
  w.ground = (x, z) => { const r = ring(x, z); return r < CRATER ? -.4 - (CRATER - r)*1.6 : rimY(x, z); };
  w.bounds = (x, z) => { const r = ring(x, z); return r > CRATER + .7 && r < RIM - .5; };
  w.surface = () => 'stone';
  w.area = (x, z) => ring(x, z) < CRATER + 2.2 ? 'The Crater Edge' : 'The Volcano Rim';
  w.spawn = [9.2, 1.4, Math.PI];
  storySky(w, {sun:[-9, 16, 7], clouds3d:[[120, 40, 170, 30], [175, 26, 95, 22], [55, 52, 215, 34], [-70, 36, 160, 26], [-140, 46, 50, 32],
    [30, 58, -170, 36], [210, 44, -60, 30], [-95, 30, -125, 24], [95, 20, 60, 14], [-40, 24, 70, 12]]});
  const coneY = r => { for (let i = 1; i < slope.length; i++) if (slope[i].x >= r) { const a = slope[i - 1], b = slope[i]; return a.y + (b.y - a.y)*(r - a.x)/(b.x - a.x); } return SEA; };
  const slope = new THREE.CatmullRomCurve3([[RIM + .3, 0], [RIM + 3, -2.6], [24, -9], [40, -20], [62, -29], [90, SEA - .5]].map(([r, y]) => new THREE.Vector3(r, y, 0))).getPoints(30);
  let lake, pumice, pebble, cone;
  inWorld(w, () => {
    // old lava, in big soft blotches with ropy swirls and a few dark cracks: one toon surface, not gravel
    const rock = tex(512, 512, (c, cw, ch) => { c.fillStyle = '#4a3a44'; c.fillRect(0, 0, cw, ch);
      const wrap = f => { for (const dx of [-cw, 0, cw]) for (const dy of [-ch, 0, ch]) f(dx, dy); };
      for (let i = 0; i < 16; i++) { const x = Math.random()*cw, y = Math.random()*ch, r = 40 + Math.random()*70; c.fillStyle = i % 3 ? '#3e3038' : '#56444e';
        wrap((dx, dy) => { c.beginPath(); c.ellipse(x + dx, y + dy, r, r*.7, i, 0, 7); c.fill(); }); }
      c.lineCap = 'round';
      for (let i = 0; i < 10; i++) { const x = Math.random()*cw, y = Math.random()*ch, r0 = 18 + Math.random()*26; c.strokeStyle = i % 2 ? 'rgba(110,88,100,.3)' : 'rgba(40,28,36,.35)'; c.lineWidth = 4;
        for (let k = 0; k < 4; k++) wrap((dx, dy) => { c.beginPath(); c.arc(x + dx, y + dy + k*7, r0 + k*7, Math.PI*1.1, Math.PI*1.9); c.stroke(); }); }
      c.strokeStyle = 'rgba(26,19,32,.55)'; c.lineWidth = 2.5;
      for (let i = 0; i < 9; i++) { let x = Math.random()*cw, y = Math.random()*ch; c.beginPath(); c.moveTo(x, y); for (let k = 0; k < 5; k++) { x += (Math.random() - .5)*60; y += (Math.random() - .5)*60; c.lineTo(x, y); } c.stroke(); }
      c.strokeStyle = 'rgba(255,150,90,.18)'; c.lineWidth = 3; for (let i = 0; i < 6; i++) { c.beginPath(); let x = Math.random()*cw, y = Math.random()*ch; c.moveTo(x, y); for (let k = 0; k < 4; k++) { x += (Math.random() - .5)*70; y += (Math.random() - .5)*70; c.lineTo(x, y); } c.stroke(); } }, 12, 1.6);
    // the rim top, lumpy where it's walked on, a little lighter on the bumps and darker in the hollows
    const topRows = [0, .12, .25, .4, .55, .75, 1, 1.35, 1.8, 2.4, 3, 3.7, 4.4, 5.2, 6, 6.7, 7.3, RIM + .3 - CRATER].map(d => [CRATER + d, 0]);
    add(revolve(topRows, 144, (a, r, y, j, c) => { const x = Math.cos(a)*r, z = Math.sin(a)*r, h = rimY(x, z);
      c.setScalar(.92 + h*.9 + (hash(x, z) - .5)*.08); if (r < CRATER + .7) c.multiplyScalar(.82); return [x, h, z]; }), T(0xffffff, {map:rock, vertexColors:true}), 0, 0, 0, null, false);
    // the crater's inside wall: stepped down in broken ledges to the lava, buttressed and gullied,
    // banded in the layers of old eruptions, and lit hot from below
    // vertex colours are read as linear light, so colours picked by eye are converted or they wash out pale
    const STRATA = [0x5a3a44, 0x7a4a3c, 0x46303a, 0x8c5c44, 0x5e3a36].map(h => new THREE.Color(h)), HOT = new THREE.Color(0xff8a3a);
    const prof = [[3.55, LAVA - .4], [3.8, LAVA + .3], [4, LAVA + 1.1], [4.2, -5.2], [4.3, -4.7], [4.95, -4.5], [5.1, -3.9], [5.2, -3.2], [5.25, -2.85], [5.85, -2.65], [5.95, -2.1], [6.05, -1.5], [6.2, -.9], [6.4, -.4], [CRATER, 0]];
    const wallGeo = revolve(prof, 96, (a, r, y, j, c) => {
      const top = j === prof.length - 1, x0 = Math.cos(a)*r, z0 = Math.sin(a)*r;
      const dr = top ? 0 : (.26*Math.sin(a*17 + 1.3*Math.sin(a*4)) + .18*(hash(x0, z0 + y) - .5))*(1 - sm(-1.2, 0, y)), x = Math.cos(a)*(r + dr), z = Math.sin(a)*(r + dr);
      const band = Math.floor((y + .3*Math.sin(a*3) + .14*Math.sin(a*11))/.8), k = clamp01((y - LAVA)/-LAVA);
      c.copy(STRATA[((band % 5) + 5) % 5]).multiplyScalar(1 - k*.45 + (dr < 0 ? .1 : -.08)).lerp(HOT, (1 - k)**3*.45).convertSRGBToLinear();
      return [x, top ? rimY(x, z) : y, z]; });
    add(wallGeo, T(0xffffff, {vertexColors:true, flatShading:true, side:THREE.DoubleSide}), 0, 0, 0, null, false);
    // the cone's outside: ribbed with ridges and gullies running down to the sea, dark rock high up, green below
    const high = new THREE.Color(0x4a3a44), low = new THREE.Color(0x6a4a4a), green = new THREE.Color(0x4e7a4e);
    const coneGeo = revolve(slope.map(p => [p.x, p.y]), 128, (a, r, y, j, c) => {
      const amp = sm(RIM + .3, RIM + 5, r)*(.5 + (r - RIM)/30), f = Math.sin(a*15 + 2.2*Math.sin(a*3 + r*.03));
      const rr = r + amp*.4*f, x = Math.cos(a)*rr, z = Math.sin(a)*rr;
      c.copy(high).lerp(low, clamp01((r - RIM)/50)).lerp(green, clamp01((r - 58)/20)).multiplyScalar(.9 + .14*Math.sin(r*.35) + .16*f);
      return [x, y + amp*(.55*f + .25*Math.sin(a*41 + r*.3)), z]; });
    // pale blotches only, so the vertex colours keep the hue; stretched down the slope they read as gullies
    const slopeTex = tex(256, 256, (c, cw, ch) => { c.fillStyle = '#ffffff'; c.fillRect(0, 0, cw, ch);
      for (let i = 0; i < 14; i++) { const x = Math.random()*cw, y = Math.random()*ch, r = 24 + Math.random()*40; c.fillStyle = i % 2 ? '#e8e0e6' : '#d4c8d2';
        for (const dx of [-cw, 0, cw]) for (const dy of [-ch, 0, ch]) { c.beginPath(); c.ellipse(x + dx, y + dy, r, r*.6, i, 0, 7); c.fill(); } } }, 18, 3);
    cone = add(coneGeo, T(0xffffff, {side:THREE.DoubleSide, vertexColors:true, map:slopeTex}), 0, 0, 0, null, false);

    // broken rock along the crater's lip, and rubble fallen onto its ledges
    for (let i = 0; i < 56; i++) { const a = i/56*Math.PI*2 + fr(-.05, .05), r = CRATER + fr(-.35, .15), x = Math.cos(a)*r, z = Math.sin(a)*r, s = fr(.22, .5);
      if (Math.hypot(x - LOOK[0]*.86, z - LOOK[1]*.86) < 1.1) continue;
      bAdd([0x2c2228, 0x3e3038, 0x4a3840][i % 3], new THREE.DodecahedronGeometry(s, 0), XF(x, rimY(x, z) - s*.25, z, fr(.9, 1.4), fr(.5, .9), fr(.9, 1.3), fr(0, 6), fr(0, 6), 0), {ink:.03, shadow:true}); }
    for (const [r0, r1, y, n] of [[4.35, 4.85, -4.6, 26], [5.3, 5.75, -2.75, 30]]) for (let i = 0; i < n; i++) { const a = fr(0, 7), r = fr(r0, r1), s = fr(.12, .3);
      bAdd([0x3a2a30, 0x5a3c34][i % 2], new THREE.DodecahedronGeometry(s, 0), XF(Math.cos(a)*r, y + s*.2, Math.sin(a)*r, 1, fr(.5, .8), 1, fr(0, 6), fr(0, 6), 0), {ink:.02}); }
    // the far side of the crater climbs to a jagged crest, so the crater reads as the top of a mountain
    for (let i = 0; i < 11; i++) { const a = Math.PI*.14 + i/10*Math.PI*.72 + fr(-.04, .04), r = RIM + .6 + fr(0, 1.2), s = fr(2.4, 3.4), h = fr(2.6, 4.6);
      bAdd([0x3a2c34, 0x45343c][i % 2], new THREE.IcosahedronGeometry(s, 1), XF(Math.cos(a)*r, h*.35, -Math.sin(a)*r, 1, h/s, fr(.8, 1.1), 0, fr(0, 6), fr(-.15, .15)), {ink:.08, shadow:true}); }
    // outcrops round the outer edge, a boundary you can see; low on the south, where the camera looks over them
    for (let i = 0; i < 40; i++) { const a = fr(0, Math.PI*2), r = RIM + fr(-.3, 1.6), x = Math.cos(a)*r, z = Math.sin(a)*r, b = Math.atan2(-z, x);
      if ((b > .35 && b < 2.75) || Math.hypot(x - BUS[0], z - 8.2) < 3.5 || Math.hypot(x - 4, z - 10) < 3 || Math.hypot(x - BUS[0], z - 2.85) < 5.5) continue;
      const s = z > 4 ? fr(.3, .6) : fr(.5, 1.2);
      bAdd([0x332830, 0x45343c, 0x3a2c34][i % 3], new THREE.DodecahedronGeometry(s, 0), XF(x, s*.15, z, fr(1, 1.5), fr(.6, 1.2), fr(1, 1.4), fr(0, 6), fr(0, 6), 0), {ink:.04, shadow:true}); }
    // lava-rock bumps about the rim, kept off the paths the class runs along
    for (let i = 0; i < 46; i++) { const a = Math.random()*Math.PI*2, r = CRATER + 1.5 + Math.random()*6, x = Math.cos(a)*r, z = Math.sin(a)*r;
      if (Math.hypot(x - BUS[0], z - BUS[1] + 2) < 4.5 || Math.hypot(x - POOL[0], z - POOL[1]) < 2 || Math.hypot(x - VENT[0], z - VENT[1]) < 2 || Math.hypot(x - LOOK[0], z - LOOK[1]) < 1.6 || FINDS.some(([fx, fz]) => Math.hypot(x - fx, z - fz) < 1.6)) continue;
      const r0 = .2 + Math.random()*.4; bAdd([0x2c2228, 0x3e3038, 0x5a4048][i % 3], new THREE.DodecahedronGeometry(r0, 0), XF(x, rimY(x, z) + r0*.15, z, fr(1, 1.4), .6, fr(.9, 1.2), fr(0, 6), fr(0, 6), 0), {ink:.03, shadow:true}); }
    // scree spilling down the cone below the rim
    for (let i = 0; i < 110; i++) { const a = fr(0, Math.PI*2), r = RIM + 1 + fr(0, 1)**1.6*16, s = fr(.15, .5)*(1 + (r - RIM)/14);
      bAdd([0x2c2228, 0x3e3038, 0x564048][i % 3], new THREE.DodecahedronGeometry(s, 0), XF(Math.cos(a)*r, coneY(r) - s*.2, Math.sin(a)*r, fr(1, 1.5), fr(.5, .8), 1, fr(0, 6), fr(0, 6), 0), {ink:.02}); }
    // the lookout: a slab jutting out over the drop, a cairn and a sign
    const [lx, lz] = LOOK, lu = Math.hypot(lx, lz), [tx, tz] = [-lz/lu, lx/lu], [cx, cz] = [lx - tx*1.1, lz - tz*1.1], [sx, sz] = [lx + tx*1.2, lz + tz*1.2];
    bAdd(0x4a3a44, new THREE.CylinderGeometry(1, 1.15, .3, 7), XF(lx/lu*(CRATER - .15), .05, lz/lu*(CRATER - .15), 1.1, 1, .8, 0, Math.atan2(lx, lz), 0), {ink:.04, shadow:true});
    for (const [k, s, y] of [[0, .3, .12], [1, .22, .42], [2, .15, .64]]) bAdd([0x5a4a56, 0x6a5a66, 0x7d6e78][k], new THREE.DodecahedronGeometry(s, 0), XF(cx + k*.03, rimY(cx, cz) + y, cz, 1.2, .7, 1.1, 0, k, 0), {ink:.03, shadow:true});
    signpost(sx, sz, 'Lookout', rimY(sx, sz), .3);

    // the sea far below, and the coast's other volcanoes standing in a line across it
    const sea = add(new THREE.PlaneGeometry(1400, 1400), T(0x3a6a9a, {emissive:0x10304a, emissiveIntensity:.4}), 0, SEA, 0, null, false); sea.rotation.x = -Math.PI/2;
    for (const [x, z] of CHAIN) { const h = 30 + Math.abs(x)*.03, g = new THREE.Group(); g.position.set(x, SEA, z); w.scene.add(g);
      outline(add(new THREE.CylinderGeometry(h*.12, h*.95, h, 10), T(0x3a1c16), 0, h/2, 0, g), 1.02);
      add(new THREE.CylinderGeometry(h*.1, h*.14, h*.04, 10), T(0xff8a3a, {emissive:0xff6a1a, emissiveIntensity:.8}), 0, h + .2, 0, g, false);
      add(new THREE.CylinderGeometry(h*1.8, h*2.1, 4, 14), T(0x24461e), 0, 0, 0, g, false); }
    // the warm pool, with pale floating pumice round its edge
    const poolTex = tex(256, 256, (c, cw, ch) => { const g = c.createRadialGradient(cw/2, ch/2, cw*.1, cw/2, ch/2, cw*.5); g.addColorStop(0, '#16566a'); g.addColorStop(.75, '#237a80'); g.addColorStop(1, '#4fa89c'); c.fillStyle = g; c.fillRect(0, 0, cw, ch);
      c.strokeStyle = 'rgba(200,240,230,.3)'; c.lineWidth = 3; for (let i = 0; i < 7; i++) { const x = 60 + Math.random()*136, y = 60 + Math.random()*136, r = 8 + Math.random()*16; c.beginPath(); c.ellipse(x, y, r, r*.55, 0, 0, 7); c.stroke(); } });
    const pool = add(new THREE.CircleGeometry(1.15, 28), T(0xffffff, {map:poolTex, emissive:0x0c3a40, emissiveIntensity:.35}), POOL[0], .04, POOL[1], null, false); pool.rotation.x = -Math.PI/2;
    // a ring of rounded pebbles, bigger at the back, like the pond at home
    for (let i = 0; i < 18; i++) { const a = i/18*Math.PI*2 + fr(-.08, .08), r0 = Math.sin(a) < 0 ? fr(.2, .3) : fr(.14, .22), k = 1.2 + r0*.4;
      bAdd([0x6a5a66, 0x7d6e78, 0x5a4a56][i % 3], new THREE.SphereGeometry(r0, 9, 6), XF(POOL[0] + Math.cos(a)*k, r0*.3, POOL[1] + Math.sin(a)*k, fr(1.1, 1.4), .6, 1, 0, -a, 0), {ink:.03, shadow:true}); }
    for (let i = 0; i < 6; i++) { const a = i*1.1; outline(add(new THREE.DodecahedronGeometry(.14, 0), T(0xd8d0c0), POOL[0] + Math.cos(a)*1.65, .1, POOL[1] + Math.sin(a)*1.65), 1.12); }
    pumice = add(new THREE.DodecahedronGeometry(.16, 0), T(0xe0d8c8), POOL[0] + 1.3, .12, POOL[1] + .9); pumice.visible = false; outline(pumice, 1.12);
    pebble = add(new THREE.DodecahedronGeometry(.1, 0), T(0x3a2c34), 0, 0, 0, null, false); pebble.visible = false; outline(pebble, 1.15);
    add(new THREE.CircleGeometry(.35, 12), T(0x1a1320), VENT[0], .03, VENT[1], null, false).rotation.x = -Math.PI/2;
    // the warm ground: a soft glow fading out into the rock, with hot cracks at its heart
    const warm = tex(256, 256, (c, cw, ch) => { const g = c.createRadialGradient(cw/2, ch/2, 0, cw/2, ch/2, cw/2); g.addColorStop(0, 'rgba(255,170,90,.95)'); g.addColorStop(.35, 'rgba(240,110,60,.7)'); g.addColorStop(1, 'rgba(160,50,40,0)'); c.fillStyle = g; c.fillRect(0, 0, cw, ch);
      c.strokeStyle = '#ffe08a'; c.lineWidth = 5; c.lineCap = 'round'; for (let i = 0; i < 5; i++) { const a = i*1.3; c.beginPath(); c.moveTo(cw/2 + Math.cos(a)*10, ch/2 + Math.sin(a)*10); c.lineTo(cw/2 + Math.cos(a + .3)*40, ch/2 + Math.sin(a + .3)*40); c.lineTo(cw/2 + Math.cos(a)*62, ch/2 + Math.sin(a)*62); c.stroke(); } });
    add(new THREE.CircleGeometry(1.4, 24), new THREE.MeshBasicMaterial({map:warm, transparent:true, depthWrite:false}), TOAST[0], .03, TOAST[1], null, false).rotation.x = -Math.PI/2;
    bFlush(w.scene);
  });
  lake = lavaLake(w, {r:4.3, y:LAVA});
  // the plume rises off the lake's north side: beyond the lava as the camera usually looks, and
  // off to one side of a look down from the lookout
  const smoke = plume(w, [1.2, LAVA + .8, -2.6], {scale:1.3, base:2, top:40, mouth:-LAVA});
  smoke.onBurp = () => lake.surge();
  const vent = puffs(w, VENT[0], .1, VENT[1], {rate:2.5, rise:.9, size:.8, opacity:.6});
  puffs(w, POOL[0], .1, POOL[1], {rate:1.2, rise:.5, size:.9, opacity:.3, spread:1.4});
  CHAIN.filter((p, i) => i !== 1).forEach(([x, z]) => plume(w, [x, SEA + 31 + Math.abs(x)*.03, z], {scale:3.4, burps:false, max:40, base:.5, top:18}));
  const bus = tripBus(w);
  const door = () => bus.door(.6);
  const cls = classmates(w, t, [BUS[0] - 1.6, BUS[1] - 1.6]);
  let thrown = null, tossed = null;
  w.anims.push((dt, tt) => {
    if (thrown) { thrown.t += dt; const k = clamp01(thrown.t/.9);
      pumice.position.set(thrown.x + (POOL[0] - thrown.x)*k, .12 + Math.sin(k*Math.PI)*1.6 + (k >= 1 ? Math.sin(tt*2.5)*.03 : 0), thrown.z + (POOL[1] - thrown.z)*k);
      if (k >= 1 && !thrown.splash) { thrown.splash = true; Sound.hiss({dur:.4, vol:.1, type:'bandpass', freq:1400}); Sound.tone(620, {type:'sine', dur:.2, vol:.07, f2:900}); } }
    // a pebble over the edge: up out of the hand, then the long fall into the lake
    if (tossed) { tossed.t += dt; const s = tossed.t, k = Math.min(1, s/1.6);
      pebble.position.set(tossed.x + (tossed.tx - tossed.x)*k, tossed.y + 2*s - 4.4*s*s, tossed.z + (tossed.tz - tossed.z)*k); pebble.rotation.x += dt*9;
      if (pebble.position.y <= LAVA) { lake.splash(tossed.tx, tossed.tz); pebble.visible = false; tossed = null; Sound.hiss({dur:.8, vol:.12, type:'bandpass', freq:700, q:.7}); } }
  });

  // ---------- the lookout: a peek into the crater, any time the class is out exploring ----------
  let peering = false, peeks = 0;
  const objEl = document.getElementById('obj');
  async function lookDown(){
    if (peering || game.cutscene) return; peering = true; peeks++;
    const ex = player.x, ez = player.z, d = Math.hypot(ex, ez), ux = ex/d, uz = ez/d, was = objEl && !objEl.hidden ? objEl.textContent : '';
    player.angle = Math.atan2(-ux, -uz); game.cutscene = true; lake.busy = 1; smoke.dim = .15; lookout.x += 1e4;
    const t0 = game.elapsed, stops = [];
    // from just behind the explorer, out over the drop until it looks almost straight down
    game.cutCam = (pos, look) => { const k = ease(clamp01((game.elapsed - t0)/3.2)), bob = Math.sin(game.elapsed*.9)*.05, rr = d + 2.4 - k*(d + 2.4 - 4.6);
      pos.set(ux*rr, 3 - k*1.4 + bob, uz*rr); look.set(-ux*(1.6 - k*.9), LAVA + 2.6*(1 - k), -uz*(1.6 - k*.9)); return true; };
    try {
      if (peeks === 1) {
        await say([['sparks', "Steady, {name}! Lean out, but keep both feet on the rock."], ['basil', "Don't LEAN! Why is everybody always LEANING?!"]]);
        await t.until(() => game.elapsed - t0 > 3.2);
        lake.fountain(-ux*.8, -uz*.8, 1.4);
        await say([['juniper', "Whoa. The top is all cracked into pieces, like a giant puzzle!"],
                   ['sparks', "That's crust. The lava cools on top and goes hard, and the hot rock underneath keeps breaking it apart."]]);
        // the volcano picks this moment to burp
        smoke.burp(); game.camShake = 1.6;
        await t.wait(1.8);
        await say([['basil', "IT BURPED! The volcano just BURPED at us!"], ['mo', "Say excuse me, volcano."],
                   ['sparks', "Gas from deep down, pushing its way out. That's why nobody ever comes here without a heat-proof bus and an expert!"],
                   ['basil', "“We'll sink in lava.” It's on my list, and it's RIGHT THERE."]]);
      } else {
        await t.until(() => game.elapsed - t0 > 2.4);
        lake.fountain(-ux*.8, -uz*.8, 1.2);
        await say([[...[['basil', "Not so close, {name}! I'm not looking. Okay, I'm looking a little."], ['mo', "It looks like the world's hottest pizza."],
          ['juniper', "The cracks keep opening and closing. It's like it's breathing."], ['pip', "Ooh, a fountain! Did you see that one?"]][(peeks - 2) % 4]]]);
      }
      // the explorer watches as long as they like, tossing pebbles, until they step back or walk away
      let done = false;
      const at = (verb, short, action) => addUsable(w, {name:verb, x:ex, z:ez, range:3, verb, short, glow:[ex, -60, ez], action});
      stops.push(at('Toss a pebble in', 'Toss', () => { if (tossed) return; pebble.visible = true;
        const [sx, sz] = [ex - ux*.4, ez - uz*.4], [tx, tz] = [-ux*(1.4 + Math.random()*1.4) + (Math.random() - .5)*2, -uz*(1.4 + Math.random()*1.4) + (Math.random() - .5)*2];
        tossed = {t:0, x:sx, y:rimY(ex, ez) + 1.1, z:sz, tx, tz}; Sound.tone(500, {type:'triangle', dur:.1, vol:.05}); }),
        at('Step back from the edge', 'Step back', () => { done = true; }));
      game.cutscene = false; t.goal('Watch the lava! Toss a pebble, or step back.');
      await t.until(() => done || Math.hypot(player.x - ex, player.z - ez) > .35 || game.cutscene);
    } catch (e) { if (!t.gone) throw e; }
    finally {
      for (const u of stops) { w.usables.splice(w.usables.indexOf(u), 1); w.scene.remove(u.sparkle); const k = game.reach.indexOf(u); if (k >= 0) game.reach[k] = null; }
      if (!t.gone) { game.cutCam = null; t.goal(was); }
      lake.busy = 0; smoke.dim = 1; lookout.x -= 1e4; peering = false;
    }
  }
  const lookout = addUsable(w, {name:'Lookout', x:LOOK[0], z:LOOK[1], range:1.5, verb:'Look down into the crater', short:'Look down', glow:[LOOK[0]*.93, 1.1, LOOK[1]*.93], action:lookDown});
  t.onEnd(() => { if (peering) game.cutCam = null; });

  // ---------- what the class finds ----------
  const say = t.say;
  // a tall phone screen sees a narrow slice, so the binoculars stand back to fit the whole row in
  const far = (pos, look) => { if (innerWidth < innerHeight) { pos.x = look.x + (pos.x - look.x)*1.5; pos.z = look.z + (pos.z - look.z)*1.5; } };
  cls.find('pip', {name:'row', at:[-1.4, CRATER + 1.3, Math.PI], pose:'peer', call:"Come see what's down there!", after:["Volcanoes all in a row. Like beads on a string!"],
    async scene(){
      await say([['pip', "{name}! Look down inside the crater. It's glowing!"]]);
      t.cut((pos, look) => { pos.set(-1.4, 3.2, CRATER + 1.4); look.set(0, LAVA, 0); });
      await say([['pip', "That's melted rock, way down there. Hot enough to glow!"],
                 ['pip', "Now borrow my binoculars. Look way out along the coast…"]]);
      binoc.hidden = false; Sound.tone(880, {type:'triangle', dur:.12, vol:.06});
      // binoculars see far: from out over the sea, the row stands side by side, clear of the haze
      const fog = w.scene.fog, haze = [fog.near, fog.far]; fog.near = 300; fog.far = 1400;
      t.cut((pos, look) => far(pos.set(80, 8, 70), look.set(200, -20, -50)));
      await t.wait(1.2);
      await say([['pip', "More volcanoes! One, two, three… and they're all lined up in a row."]]);
      const pick = await t.ask('pip', "Why would volcanoes stand in a row like that?", ["Something under the ground", "Somebody built them", "I don't know yet"]);
      binoc.hidden = true; [fog.near, fog.far] = haze;
      t.cut(null);
      await say([[ 'pip', ["Ooh, something under the ground. That's my guess too!", "Ha! Giant volcano builders? I don't think so…", "Me neither. But I want to find out!"][pick]],
                 ['juniper', "I'm writing that question down. Why are the volcanoes in a row?"]]);
    }});
  cls.find('basil', {name:'vent', at:[VENT[0] - .9, VENT[1] + 1.8, 2.7], call:"Is this supposed to happen?!", after:["I'm keeping my hands in my pockets, thank you."],
    async scene(){
      vent.burst = 1.2; Sound.hiss({dur:1.2, vol:.14, type:'bandpass', freq:900, q:.6});
      await say([['basil', "{name}, this rock keeps hissing at me!"]]);
      const pick = await t.ask('basil', "Will you check it? I'm not putting MY hand there.", ["Hold my hand near it", "Back away slowly"]);
      if (pick === 0) { vent.burst = 1.5; Sound.hiss({dur:1, vol:.12, type:'lowpass', freq:600});
        await say([['basil', "Is it warm? It's warm, isn't it. You're so brave."]]); }
      else await say([['basil', "Good thinking. Let's watch from here."]]);
      await say([['basil', "That's steam coming right out of the ground. Something under us is really, really hot."],
                 ['basil', "But the heat is way down deep. It can't burn us up here!"]]);
      await say([['basil', worries(0)]]);
    }});
  cls.find('juniper', {name:'pumice', at:[POOL[0] + .7, POOL[1] + 1.5, -2.6], pose:'crouch', call:"Rocks that float? Come see!", after:["Pumice. It's full of holes, like a sponge made of stone."],
    async scene(){
      await say([['juniper', "Pick one up, {name}. These rocks are as light as a cookie!"]]);
      const pick = await t.ask('juniper', "If you toss one in the pool, will it float or sink?", ["It will float", "It will sink"]);
      pumice.visible = true; thrown = {t:0, x:player.x, z:player.z}; Sound.tone(500, {type:'triangle', dur:.1, vol:.05});
      await t.wait(1.6);
      await say([['juniper', (pick === 0 ? "You were right, it floats! " : "Surprise, it floats! ") + "It's full of tiny holes, from gas bubbles in the lava."]]);
    }});
  cls.find('mo', {name:'toast', at:[TOAST[0] + .8, TOAST[1] + .9, -2.3], pose:'crouch', call:"Snack time! Come here!", after:["Best. Field trip. Ever."],
    async scene(){
      Sound.hiss({dur:1.5, vol:.06, type:'highpass', freq:2500});
      await say([['mo', "Feel the ground here, {name}. It's warm! Like a stove!"],
                 ['mo', "I'm toasting a marshmallow on it. Mmm, golden."]]);
      const pick = await t.ask('mo', "Want one?", ["Yes, please!", "No, thank you"]);
      await say([['mo', pick ? "More for me! But where's all this heat coming from?" : "Here you go! Hey, where's all this heat coming from, anyway?"]]);
    }});
  cls.hint = () => cls.saw('row') ? "Back to the bus whenever you're ready, {name}! Or go see anyone still waving, peek in from the lookout, or go exploring. Volcanoes leave treasures lying all over!" :
    "Pip has the binoculars, Basil found something hissing, and Mo smells like marshmallows. And there's a lookout over the crater, if you dare!";

  // ---------- things to look closer at, round the far side of the rim, for anyone who wanders ----------
  const after = async f => { await t.wait(.01); f && f(); await t.until(() => !game.cutscene); };
  const glint = (col, s) => { const g = new THREE.Sprite(new THREE.SpriteMaterial({map:glowTex, color:col, transparent:true, depthWrite:false, blending:THREE.AdditiveBlending, opacity:0})); g.scale.setScalar(s); w.scene.add(g); return g; };
  // the cone's outside surface, as revolve() lays it, for things lying on the slope
  const coneAt = (a, r) => { const amp = sm(RIM + .3, RIM + 5, r)*(.5 + (r - RIM)/30), f = Math.sin(a*15 + 2.2*Math.sin(a*3 + r*.03)); return coneY(r) + amp*(.55*f + .25*Math.sin(a*41 + r*.3)); };
  let bomb, obsGlint, strands = [], light, screen, scr;
  inWorld(w, () => {
    // a volcanic bomb, landed with a thump: a lemon of lava, twisted at the ends where it spun in flight
    bomb = new THREE.Group(); bomb.position.set(BOMB[0], rimY(...BOMB) + .2, BOMB[1]); bomb.rotation.set(0, .7, .25); w.scene.add(bomb);
    const crust = T(0x5a3430), core = sph(.28, crust, 0, 0, 0, bomb, 12); core.scale.set(1.6, .78, .9); outline(core, 1.06);
    for (const sx of [-1, 1]) { const tail = add(new THREE.ConeGeometry(.13, .4, 6), crust, sx*.58, .02, 0, bomb); tail.rotation.set(sx*.8, 0, -sx*Math.PI/2); outline(tail, 1.1); }
    for (let i = 0; i < 6; i++) add(new THREE.BoxGeometry(.2, .02, .03), T(0xa86a4a), fr(-.25, .25), .2, fr(-.12, .12), bomb, false).rotation.y = fr(0, 3);
    for (let i = 0; i < 9; i++) { const a = i/9*Math.PI*2, s = fr(.06, .12); bAdd(0x2c2228, new THREE.DodecahedronGeometry(s, 0), XF(BOMB[0] + Math.cos(a)*.75, rimY(...BOMB) + s*.3, BOMB[1] + Math.sin(a)*.55, 1, .6, 1, a, a, 0), {ink:.02}); }
    // obsidian, black glass, tucked in behind a heap of rock under the crest
    // painted shine rather than lit, so it reads as glossy black glass in any light
    const glass = new THREE.MeshBasicMaterial({map:tex(128, 128, (c, cw, ch) => { const g = c.createLinearGradient(0, 0, cw, ch); g.addColorStop(0, '#2a2240'); g.addColorStop(.5, '#0c0912'); g.addColorStop(1, '#1c1630'); c.fillStyle = g; c.fillRect(0, 0, cw, ch);
      c.strokeStyle = 'rgba(240,236,255,.9)'; c.lineCap = 'round'; for (const [x, y, l, wd] of [[30, 28, 40, 9], [52, 30, 18, 5], [86, 80, 22, 6]]) { c.lineWidth = wd; c.beginPath(); c.moveTo(x, y + l); c.lineTo(x + l*.6, y); c.stroke(); } })});
    for (const [dx, dz, s, ry] of [[0, 0, .48, .4], [.45, .2, .33, 1.7], [-.4, .28, .27, 2.6], [.12, -.42, .24, .9]]) {
      const m = add(new THREE.OctahedronGeometry(s, 0), glass, OBS[0] + dx, rimY(...OBS) + s*.45, OBS[1] + dz); m.scale.set(1.2, .8, .9); m.rotation.set(.3, ry, .2); outline(m, 1.06); }
    for (const [dx, dz, s] of [[-1, -.9, .7], [.9, -1.1, .6], [-1.4, .2, .45], [1.3, .1, .4]]) bAdd([0x332830, 0x3a2c34][s > .5 ? 0 : 1], new THREE.DodecahedronGeometry(s, 0), XF(OBS[0] + dx, rimY(...OBS) + s*.2, OBS[1] + dz, 1.2, .9, 1, dx, dz, 0), {ink:.04, shadow:true});
    obsGlint = glint(0xe8e0ff, .7); obsGlint.position.set(OBS[0] + .1, rimY(...OBS) + .45, OBS[1] + .05);
    // the fumarole: a smelly crack crusted with sulfur crystals, yellow as a lemon
    const fy = rimY(...FUM), moundY = r => fy + Math.max(0, .4*(.75 - r)/.5);
    const crustTex = tex(128, 128, (c, cw, ch) => { for (let i = 0; i < 22; i++) { const a = Math.random()*7, r = Math.random()*38, x = 64 + Math.cos(a)*r, y = 64 + Math.sin(a)*r;
      c.fillStyle = ['rgba(216,184,58,.8)', 'rgba(236,206,80,.75)', 'rgba(184,154,48,.7)'][i % 3]; c.beginPath(); c.ellipse(x, y, 10 + Math.random()*16, 7 + Math.random()*10, a, 0, 7); c.fill(); } });
    add(new THREE.CircleGeometry(1.2, 20), T(0xffffff, {map:crustTex, transparent:true, depthWrite:false}), FUM[0], fy + .03, FUM[1], null, false).rotation.x = -Math.PI/2;
    outline(add(new THREE.CylinderGeometry(.22, .75, .4, 9, 1, true), T(0x7a6440), FUM[0], fy + .2, FUM[1]), 1.04);
    add(new THREE.CircleGeometry(.22, 9), T(0x1a1320), FUM[0], fy + .39, FUM[1], null, false).rotation.x = -Math.PI/2;
    for (let i = 0; i < 34; i++) { const a = fr(0, 7), r = i < 14 ? fr(.24, .45) : fr(.5, 1.1), s = fr(.05, .12);
      bAdd([0xf2d23a, 0xffe46a, 0xe0b828][i % 3], new THREE.OctahedronGeometry(s, 0), XF(FUM[0] + Math.cos(a)*r, moundY(r) + s*.5, FUM[1] + Math.sin(a)*r, 1, fr(1.2, 2), 1, fr(-.3, .3), a, fr(-.3, .3)), {ink:.012}); }
    // Pele's hair: threads of golden glass the wind blew up against a rock
    const [px, pz] = PELE, py = rimY(px, pz), hair = new THREE.MeshBasicMaterial({color:0xf2c860});
    bAdd(0x3a2c34, new THREE.DodecahedronGeometry(.65, 0), XF(px - .7, py + .2, pz + .1, 1.2, .8, 1.1, .3, .5, 0), {ink:.04, shadow:true});
    const thread = (a, len, lift) => new THREE.TubeGeometry(new THREE.CatmullRomCurve3([0, .33, .66, 1].map(k => new THREE.Vector3(k*len*Math.cos(a) + Math.sin(k*5 + a)*.06, lift*(1 - k) + .04 + Math.sin(k*9)*.03, k*len*Math.sin(a) + Math.cos(k*6 + a)*.06))), 10, .007, 3);
    add(mergeGeos(Array.from({length:12}, (_, i) => [thread(fr(-1, 1), fr(.4, .8), fr(.2, .5)), XF(px - .25, py, pz + fr(-.35, .35))])), hair, 0, 0, 0, null, false);
    for (let i = 0; i < 4; i++) { const s = add(thread(fr(-.8, .8), fr(.4, .7), .35), hair, px - .2, py + .02, pz + fr(-.3, .3), null, false); strands.push({m:s, ph:fr(0, 6), free:0}); }
    // a fern and crusty lichen: the first life on the new rock
    const [nx, nz] = FERN, ny = rimY(nx, nz);
    for (const [dx, dz, s] of [[-.6, .3, .5], [.55, .4, .42], [0, .75, .36]]) bAdd(0x3e3038, new THREE.DodecahedronGeometry(s, 0), XF(nx + dx, ny + s*.2, nz + dz, 1.2, .8, 1, dx, dz, 0), {ink:.035, shadow:true});
    const leaf = [];
    for (let f = 0; f < 6; f++) { const b = f/6*Math.PI*2 + .3, bend = fr(.5, .8);
      for (let k = 0; k < 7; k++) { const u = (k + 1)/8, r = .55*u, y = .1 + Math.sin(u*Math.PI*bend)*.4, s = .07*(1.2 - u);
        leaf.push([new THREE.SphereGeometry(s, 5, 4), XF(Math.cos(b)*r, y, Math.sin(b)*r, 1.6, .35, .8, 0, -b, 0)]); } }
    meshOf(mergeGeos(leaf), 0x5b9a4a, grp(nx, ny, nz), .012);
    for (const [dx, dz, c, s] of [[-.55, .1, 0xb4c27a, .16], [-.45, .45, 0xd89a4a, .11], [.5, .2, 0xb4c27a, .13], [.62, .55, 0xe0b04a, .09], [.1, .6, 0xb4c27a, .12]])
      sph(s, T(c), nx + dx, ny + .42 + s*.3, nz + dz, null, 7, false).scale.set(1, .25, 1);
    // old lava flows, tongue after tongue down the slope, greener the older they are; the newest, black,
    // runs right down to the sea
    // laid on the cone's real surface, found by dropping a ray onto it, with a band of ink just under the edges
    cone.updateMatrixWorld();
    const ray = new THREE.Raycaster(), dn = new THREE.Vector3(0, -1, 0), from = new THREE.Vector3();
    const onCone = (x, z) => { ray.set(from.set(x, 40, z), dn); const h = ray.intersectObject(cone)[0]; return h ? h.point.y : coneY(Math.hypot(x, z)); };
    const ribbon = (a0, end, col, wide, lift) => { const pos = [], idx = []; let n = 0;
      for (let r = RIM + .8; r <= end; r += .7, n++) { const a = a0 + .04*Math.sin(r*.17 + a0*9), toe = Math.min(1, (end - r)/3),
        hw = ((.7 + (r - RIM)*.045)*(1 + .2*Math.sin(r*.8 + a0*7))*Math.sqrt(toe) + .05 + wide)/r;
        for (const k of [-1, -.5, 0, .5, 1]) { const b = a + k*hw, x = Math.cos(b)*r, z = Math.sin(b)*r; pos.push(x, onCone(x, z) + lift + (1 - k*k)*.1, z); } }
      for (let i = 0; i < n - 1; i++) for (let k = 0; k < 4; k++) { const p = i*5 + k, q = p + 5; idx.push(p, q, p + 1, p + 1, q, q + 1); }
      const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx); g.computeVertexNormals();
      add(g, T(col, {side:THREE.DoubleSide}), 0, 0, 0, null, false); };
    for (const [a0, end, col] of [[-.5, 52, 0x5e8a4a], [-.28, 44, 0x7a5236], [-.05, 66, 0x1e1820]]) { ribbon(a0, end, 0x1a1320, .14, .1); ribbon(a0, end, col, 0, .18); }
    for (let i = 0; i < 40; i++) { const r = fr(RIM + 2, 64), a = -.05 + .04*Math.sin(r*.17 - .45) + fr(-.6, .6)/r, x = Math.cos(a)*r, z = Math.sin(a)*r, s = fr(.25, .5);
      bAdd(0x2a2230, new THREE.DodecahedronGeometry(s, 0), XF(x, onCone(x, z) + .2, z, 1.2, .6, 1, fr(0, 6), fr(0, 6), 0), {ink:.03}); }
    // a volcanologist's station: a seismometer that feels the ground shake, and sends what it feels home
    const st = grp(SEIS[0], rimY(...SEIS), SEIS[1], Math.atan2(-SEIS[0], -SEIS[1]));
    outline(box(.7, .45, .5, T(0xd8743a), 0, .23, 0, st), 1.04); box(.72, .06, .52, T(0xf2e0b0), 0, .47, 0, st);
    scr = tex(128, 64, () => {}); scr.needsUpdate = false;
    screen = add(new THREE.PlaneGeometry(.42, .22), new THREE.MeshBasicMaterial({map:scr}), 0, .26, .256, st, false);
    cyl(.025, .025, .9, T(0x8a8a96), -.05, .9, -.32, st, 6);
    const panelTex = tex(64, 64, (c, cw, ch) => { c.fillStyle = '#2a3a7a'; c.fillRect(0, 0, cw, ch); c.strokeStyle = '#9ab0e0'; c.lineWidth = 2; for (let i = 1; i < 4; i++) { c.beginPath(); c.moveTo(i*16, 0); c.lineTo(i*16, ch); c.moveTo(0, i*16); c.lineTo(cw, i*16); c.stroke(); } });
    const panel = outline(add(new THREE.BoxGeometry(.8, .04, .55), T(0xffffff, {map:panelTex}), -.05, 1.35, -.32, st), 1.04); panel.rotation.x = .6;
    cyl(.018, .018, 1.4, T(0x6a6a76), .3, 1.15, -.1, st, 5);
    light = sph(.05, T(0xff4a3a, {emissive:0xff2a1a, emissiveIntensity:1}), .3, 1.88, -.1, st, 8);
    const probe = cyl(.12, .14, .16, T(0x4a7ac8), -.95, .06, .5, st, 10); outline(probe, 1.08);
    box(.7, .025, .025, T(0x1a1320), -.55, .03, .4, st).rotation.y = -.4;
    bFlush(w.scene);
  });
  // the seismometer's screen: a wiggly line that jumps when the ground shakes, near enough to see
  const trace = new Float32Array(64); let quake = 0, scrT = 0;
  const burped = smoke.onBurp; smoke.onBurp = () => { burped(); quake = Math.max(quake, 1.4); };
  w.anims.push((dt, tt) => {
    light.material.emissiveIntensity = (tt % 1.6) < .2 ? 1.6 : .15;
    obsGlint.material.opacity = Math.max(obsGlint.material.opacity - dt*2, Math.max(0, Math.sin(tt*.9) - .93)*12);
    for (const s of strands) { if (s.free) { s.free += dt; s.m.position.x += dt*.5; s.m.position.y += dt*(.6 - s.free*.15); s.m.rotation.y += dt*1.5; if (s.free > 5) s.m.visible = false; }
      else s.m.rotation.y = Math.sin(tt*1.3 + s.ph)*.08; }
    quake = Math.max(0, quake - dt*.7);
    if ((scrT += dt) < 1/15 || Math.hypot(player.x - SEIS[0], player.z - SEIS[1]) > 9) return; scrT = 0;
    trace.copyWithin(0, 1); trace[63] = (Math.random() - .5)*(.12 + Math.max(quake, game.camShake*.5));
    const c = scr.image.getContext('2d'); c.fillStyle = '#12301e'; c.fillRect(0, 0, 128, 64); c.strokeStyle = 'rgba(120,220,150,.25)'; c.lineWidth = 1; c.strokeRect(4, 32, 120, 0);
    c.strokeStyle = '#8cf5a8'; c.lineWidth = 2.5; c.beginPath(); trace.forEach((v, i) => c.lineTo(2 + i*1.95, 32 - Math.max(-1, Math.min(1, v))*28)); c.stroke(); scr.needsUpdate = true;
  });
  const sulfur = puffs(w, FUM[0], rimY(...FUM) + .45, FUM[1], {rate:1.4, rise:.8, size:.7, color:0xfff2c8, opacity:.45, spread:.4});

  const BOMB_LINES = [null,
    ['sparks', "It's a volcanic bomb: a blob of lava the volcano threw high up into the sky."],
    ['sparks', "It spun as it flew, and cooled into this lemon shape, with twisty ends."],
    ['sparks', "Pumice is full of gas bubbles, so it's light. This one is packed solid, so it's heavy."],
    ['basil', "The volcano THROWS rocks?! Everybody look UP!"]];
  const FLOW_LINES = [null,
    ['sparks', "The brown one came later. And the black one is the newest of all. Nothing has grown on it yet."],
    ['sparks', "It even ran all the way down into the sea, and made brand-new land!"],
    ['sparks', "Flow on top of flow, layer on layer: that's how this whole island was built. And it's still growing."]];
  // out over the lip and down the slope, along the flows to the sea
  const downSlope = (pos, look) => { pos.set(44, 10, 26); look.set(32, -16, -8); };
  curio(w, t, {name:'Lemon-shaped rock', at:BOMB, y:rimY(...BOMB) + .9, view:[.5, 1], verb:'Pick it up', lines:BOMB_LINES,
    async pre(){ const pick = await t.ask('sparks', "That lumpy rock is made of lava too, like Juniper's pumice. Will it be heavy or light?", ["Light as a cookie", "Heavy!"]);
      BOMB_LINES[0] = ['sparks', pick ? "Oof! You were right, it's HEAVY!" : "Oof! Not light at all. It's HEAVY!"]; },
    async act(){ t.hold(bomb); bomb.scale.setScalar(1/hero.armR.getWorldScale(new THREE.Vector3()).x); bomb.rotation.set(0, Math.PI/2, 0); game.camShake = .6; Sound.tone(110, {type:'triangle', dur:.25, vol:.08, f2:70});
      await after(() => { player.pose = null; t.cut((pos, look) => { const fx = Math.sin(player.angle), fz = Math.cos(player.angle); pos.set(player.x + fx*3.6 + fz*1.1, rimY(player.x, player.z) + 1.9, player.z + fz*3.6 - fx*1.1); look.set(player.x, rimY(player.x, player.z) + .8, player.z); }); });
      const m = t.drop(); if (!m) return; const y0 = m.position.y, gy = rimY(m.position.x, m.position.z) + .2;
      await t.tween(.3, k => { m.position.y = y0 + (gy - y0)*k*k; }); m.rotation.set(0, m.rotation.y, .25); game.camShake = 1; Sound.tone(70, {dur:.3, vol:.12, f2:40}); }});
  curio(w, t, {name:'Shiny black rock', at:OBS, y:rimY(...OBS) + .8, view:[.3, 1], verb:'Tap it', lines:[
    ['sparks', "Tink, tink! Hear that? It's not rock at all. It's glass! Black volcano glass, called obsidian."],
    ['sparks', "When lava cools super fast, it has no time to grow crystals, so it turns to glass."],
    ['pip', "I can see myself in it! Hi, me!"],
    ['sparks', "Its broken edges are sharper than any steel knife. Long ago, people chipped it into arrowheads. Look, but no touching the edges!"]],
    async act(){ for (let i = 0; i < 3; i++) { obsGlint.material.opacity = 1; obsGlint.scale.setScalar(.6 + i*.25); Sound.tone(2400 + i*180, {type:'sine', dur:.18, vol:.07}); Sound.tone(3600 + i*200, {type:'triangle', dur:.08, vol:.03}); await t.wait(.4); } }});
  curio(w, t, {name:'Smelly yellow crack', at:FUM, y:rimY(...FUM) + .8, view:[0, 1], verb:'Take a sniff', lines:[
    ['mo', "PEE-YEW! Who opened a rotten egg?! I'm gonna lose my marshmallow!"],
    ['sparks', "Ha! That's volcano gas, puffing out of a crack. A crack like this is called a fumarole."],
    ['sparks', "The gas carries sulfur up from deep down. Where it cools, it leaves these bright yellow crystals."],
    ['sparks', "Scientists measure the gas from cracks like this. When more and more comes out, it can mean magma is rising."]],
    async act(){ sulfur.burst = 1.5; Sound.hiss({dur:1.4, vol:.1, type:'bandpass', freq:1100, q:.6}); await t.wait(1); Sound.tone(260, {type:'sawtooth', dur:.35, vol:.04, f2:150, cut:900}); }});
  curio(w, t, {name:'Golden threads', at:[PELE[0] + .2, PELE[1]], y:rimY(...PELE) + .7, view:[1, .4], lift:.3, verb:'Blow on them', lines:[
    ['sparks', "Whoosh, off they float! Those golden threads are glass too, thinner than your hair."],
    ['sparks', "When lava sprays up in a fountain, the wind stretches tiny drops into long, thin strings, and they cool in the air."],
    ['sparks', "They're called Pele's hair, after Pele, the volcano goddess in old Hawaiian stories."],
    ['basil', "Glass hair. Flying around. Near my EYES. I'm putting my goggles on."]],
    async act(){ Sound.hiss({dur:.9, vol:.07, type:'highpass', freq:1800}); strands.forEach((s, i) => setTimeout(() => { s.free = .01; }, 300 + i*350)); }});
  curio(w, t, {name:'Something green', at:FERN, y:rimY(...FERN) + .8, view:[.6, -1], verb:'Look closer', lines:[
    ['sparks', "A little fern, growing right out of a crack in the lava! And see the crusty spots on the rocks? That's lichen."],
    ['sparks', "They're the first living things to move onto new rock. Bit by bit, they crumble it into soil."],
    ['juniper', "So that's why the bottom of the volcano is all green. That rock is older!"],
    ['sparks', "Exactly! First lichen, then ferns, then grass and bushes. Someday, a whole forest up here."]]});
  curio(w, t, {name:'Stripes down the mountain', at:FLOWS, y:rimY(...FLOWS) + 1, view:[-1, -.2], verb:'Look down the slope', lines:FLOW_LINES,
    async pre(){ t.cut(downSlope);
      const pick = await t.ask('sparks', "See the stripes running down the mountain? Each one is an old lava flow. Which is the oldest?", ["The green one", "The brown one", "The black one"]);
      FLOW_LINES[0] = ['sparks', pick === 0 ? "Yes! The green one. It's been there so long that plants grew all over it." : "Look closer: the green one! It's been there so long that plants grew all over it."]; },
    async act(){ await after(() => t.cut(downSlope)); }});
  curio(w, t, {name:'Orange box', at:SEIS, y:rimY(...SEIS) + 1.2, view:[.9, .3], verb:'Stomp your feet', lines:[
    ['sparks', "A volcanologist left this here. That's a scientist who studies volcanoes!"],
    ['sparks', "It's a seismometer. It feels the tiniest shakes in the ground. See the line jump when you stomp?"],
    ['sparks', "When magma pushes up from below, the ground trembles. Lots of wiggles warn the scientists that an eruption might be coming."],
    ['basil', "A volcano alarm! Okay. That makes me feel a LITTLE bit better."]],
    async act(){ for (let i = 0; i < 3; i++) { quake = 1.2; game.camShake = .5; Sound.tone(80, {dur:.15, vol:.1, f2:50}); await t.wait(.35); } }});

  // the rim keeps moving while you explore: gulls wheel overhead, steam wisps from cracks, and now and
  // then a rock breaks off the crater's lip and tumbles all the way down into the lava
  const gulls = [0, 1, 2, 3].map(i => { const g = new THREE.Group(), white = T(0xf6f0e6), grey = T(0x8a8a9a);
    const body = sph(.22, white, 0, 0, 0, g, 10); body.scale.set(.8, .75, 2); outline(body, 1.08);
    sph(.13, white, 0, .1, .4, g, 8); add(new THREE.ConeGeometry(.04, .16, 5), T(0xf0a030), 0, .08, .58, g, false).rotation.x = Math.PI/2;
    const wings = [-1, 1].map(sx => { const p = new THREE.Group(); p.position.set(sx*.12, .08, 0); g.add(p); const wg = box(.9, .04, .32, white, sx*.45, 0, 0, p, false); outline(wg, 1.06); box(.22, .045, .3, grey, sx*.82, 0, 0, p, false); return p; });
    g.scale.setScalar(1.6); w.scene.add(g); return {g, wings, a:i*1.7, r:18 + i*5, h:9 + i*2.5, v:(.16 + i*.03)*(i % 2 ? 1 : -1), ph:i*2}; });
  for (const [x, z] of [[-3, -12.4], [12.6, 1.2], [-12.9, -1.4]]) puffs(w, x, rimY(x, z) + .05, z, {rate:.5, rise:.6, size:.5, opacity:.25, spread:.2, life:3});
  const fall = add(new THREE.DodecahedronGeometry(.22, 0), T(0x3e3038), 0, -99, 0, w.scene); outline(fall, 1.12);
  let nextFall = 6, falling = null;
  w.anims.push((dt, tt) => {
    for (const q of gulls) { q.a += dt*q.v; const flap = Math.sin(tt*9 + q.ph) > .3 - Math.sin(tt*.4 + q.ph)*.9;
      q.g.position.set(Math.cos(q.a)*q.r, q.h + Math.sin(tt*.5 + q.ph)*1.2, Math.sin(q.a)*q.r); q.g.rotation.set(0, Math.atan2(-Math.sin(q.a)*Math.sign(q.v), Math.cos(q.a)*Math.sign(q.v)), Math.sign(q.v)*.35);
      q.wings.forEach((p, i) => { p.rotation.z = (i ? -1 : 1)*(flap ? Math.sin(tt*14 + q.ph)*.6 : -.08); }); }
    if (!falling && (nextFall -= dt) < 0) { const a = fr(0, 7); falling = {a, t:0}; Sound.tone(300, {type:'triangle', dur:.06, vol:.025}); }
    if (falling) { const k = (falling.t += dt)/2.4, r = CRATER - .2 - Math.min(1, k)*(CRATER - 3.9), y = -.1 + (LAVA + .2)*Math.min(1, k)**1.7 + Math.abs(Math.sin(k*Math.PI*5))*.35*(1 - k);
      fall.position.set(Math.cos(falling.a)*r, y, Math.sin(falling.a)*r); fall.rotation.x += dt*7; fall.rotation.z += dt*5;
      if (k >= 1) { lake.splash(Math.cos(falling.a)*3.6, Math.sin(falling.a)*3.6); fall.position.y = -99; falling = null; nextFall = fr(9, 20); Sound.hiss({dur:.5, vol:.05, type:'bandpass', freq:700}); } }
  });

  // ---------- the place's scenes, run by the trip's script ----------
  return {world:w, bus, cls, smoke, lake,
    // the bus swoops in over the sea, rounds the cone and lands on the rim; the class scatters
    async arrive(){
      bus.gear(null);
      t.watch(w, (pos, look) => { pos.set(bus.root.position.x*.5 + 6, Math.max(4, bus.root.position.y*.6 + 6), bus.root.position.z*.5 + 22); look.copy(bus.root.position); });
      Sound.tone(200, {type:'sawtooth', dur:4, vol:.03, f2:420, cut:900});
      await bus.fly([[70, 40, 110], [46, 28, 60], [24, 16, 30], [4, 9, 20], [-6, 5, 12], [2, 2.4, 9.5], [BUS[0], .8, 8.2], [BUS[0], 0, BUS[1]]], 7.5);
      bus.park(BUS[0], 0, BUS[1], BUS_RY);
      Sound.tone(330, {type:'triangle', dur:.12, vol:.08}); Sound.tone(494, {type:'triangle', t:.1, dur:.18, vol:.08});
      const [dx, dz] = door();
      t.cut((pos, look) => { pos.set(13, 10, 17); look.set(-1, 0, 2); });
      // beside the door, toward the nose, well clear of the bus's side
      cls.arrive({sparks:[dx - .2, dz - 1.2, Math.PI*.85]});
      await t.wait(2.6);
      await say([['sparks', "Here we are, class: the very top of a volcano! A real, live, active volcano."],
                 ['basil', "LIVE?! You mean it's ALIVE?!"],
                 ['sparks', "Alive and bubbling! Nobody should ever come up here without a heat-proof magic bus and an expert. Lucky for us, we have both!"],
                 ['mo', "Which one's the expert, you or the bus?"],
                 ['juniper', "Most people only ever see a volcano in a book. We're standing on one!"],
                 ['sparks', "So stay back from the edge. If you want a peek at the lava, use the lookout, and only the lookout!"]]);
      if (await t.more('sparks', "Want to know just how hot that lava is?"))
        await say([['sparks', "About eleven hundred degrees! More than ten times hotter than boiling water."],
                   ['sparks', "Hot enough to melt a frying pan like a pat of butter."], ['mo', "So… no marshmallows down there."], ['basil', "I did NOT need to know that."]]);
      await say([['sparks', "Somebody's going to find something amazing. When they wave you over, go and see!"]]);
      t.play(w, [dx, dz - .2, Math.PI]);
      t.goal('Visit anyone who waves!');
    },
    async explore(){
      await t.until(() => cls.saw('row') && !game.cutscene && !peering);
      await t.wait(.6);
      const next = "next stop: deep under the volcano, right through the crust! Who knows what's down there?";
      await say([['sparks', cls.saw('vent') || cls.saw('toast') ? "Steam, warm ground, melted rock. The heat comes from deep inside the Earth!" :
                              "Rock so hot it melts and glows! That heat comes from deep inside the Earth."],
                 ...cls.leaving(next)]);
      cls.gather([bus.root.position.x - .6, bus.root.position.z - 2.2, 0]);
      await cls.board(bus);
    },
    // up over the crater, a drill grows from the nose, and the bus dives into the lava
    async depart(){
      for (const id in cls.n) { cls.n[id].model.root.visible = false; cls.n[id].label.visible = false; }
      t.watch(w, (pos, look) => { pos.set(0, 7, CRATER + 9); look.set(bus.root.position.x, bus.root.position.y, bus.root.position.z); });
      Sound.hiss({dur:2.2, vol:.1, type:'bandpass', freq:900, q:.6});
      await bus.fly([[BUS[0], 0, BUS[1]], [BUS[0], 2.5, -1], [6, 6.5, -6], [-3, 8, -2], [-4, 8, 0]], 3.6, {roll:.6});
      bus.gear('drill'); Sound.tone(523, {type:'triangle', dur:.2, vol:.08}); Sound.tone(1046, {type:'triangle', t:.15, dur:.4, vol:.07}); Sound.tone(80, {type:'sawtooth', dur:2.4, vol:.05, f2:160, cut:600});
      await say([['mo', "Um, Dr. Sparks? Why does the bus have a drill?"], ['sparks', "Seatbelts on! Next stop: down!"]]);
      await bus.fly([[-4, 8, 0], [-1, 7.6, 0], [.6, 4, 0], [.8, LAVA, 0], [.8, LAVA - 6, 0]], 2.2, {easing:k => k*k});
      lake.splash(.8, 0); game.camShake = 3; Sound.hiss({dur:1, vol:.18, type:'lowpass', freq:300}); Sound.tone(60, {dur:1, vol:.18, f2:40});
      await t.wait(.5);
    },
    // on the way home: one last look at the volcano, and now the class knows why it is here
    async flyby(cam){
      bus.gear(null);
      t.watch(w, cam || ((pos, look) => { pos.set(-40, 18, 70); look.set(0, -6, 0); }));
      bus.park(80, 20, 60, 2.2);
      await bus.fly([[80, 20, 60], [30, 16, 34], [-10, 14, 30], [-60, 18, 10]], 6, {roll:.5});
    },
  };
}
