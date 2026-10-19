// The volcano rim: where the trip lands first, and where its big question comes from. A ring of warm
// black rock around a crater with a lava lake churning far below, and out along the coast, more
// volcanoes standing in a row. Why in a row? The rest of the trip finds out.

import * as THREE from 'three';
import { T, XF, add, bAdd, bFlush, clamp01, ease, fr, outline, tex } from '../../core/kit.js';
import { Sound } from '../../core/sound.js';
import { addUsable, inWorld } from '../../core/world.js';
import { player } from '../../player.js';
import { game } from '../../state.js';
import { tripBus } from '../bus.js';
import { classmates } from '../class.js';
import { puffs, signpost, tripWorld } from '../stop-kit.js';
import { lavaLake } from './lava.js';
import { plume } from './plume.js';
import { storySky } from './sky.js';
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
const binoc = document.createElement('div'); binoc.id = 'binoc'; binoc.hidden = true; document.body.append(binoc);

const sm = (a, b, v) => { const k = clamp01((v - a)/(b - a)); return k*k*(3 - 2*k); };
const hash = (x, z) => { const s = Math.sin(x*12.9898 + z*78.233)*43758.5453; return s - Math.floor(s); };
// the rim's height: a crumbly lip at the crater's edge and low lumps of old lava, smoothed flat
// wherever something sits on the ground (the bus, the pool, the warm patch, the vent, the lookout)
const FLATS = [[POOL[0], POOL[1], 1.4], [TOAST[0], TOAST[1], 1.5], [VENT[0], VENT[1], .6], [LOOK[0], LOOK[1], .8]];
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
  let lake, pumice, pebble;
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
    add(coneGeo, T(0xffffff, {side:THREE.DoubleSide, vertexColors:true, map:slopeTex}), 0, 0, 0, null, false);

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
      if (Math.hypot(x - BUS[0], z - BUS[1] + 2) < 4.5 || Math.hypot(x - POOL[0], z - POOL[1]) < 2 || Math.hypot(x - VENT[0], z - VENT[1]) < 2 || Math.hypot(x - LOOK[0], z - LOOK[1]) < 1.6) continue;
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
  cls.hint = () => cls.saw('row') ? "Back to the bus whenever you're ready, {name}! Or go see anyone still waving, or peek in from the lookout." :
    "Pip has the binoculars, Basil found something hissing, and Mo smells like marshmallows. And there's a lookout over the crater, if you dare!";

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
