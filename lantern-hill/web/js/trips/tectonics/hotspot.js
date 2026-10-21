// The hotspot island: the youngest island at the end of a long row of them, out in the middle of the
// ocean, thousands of kilometers from where any plates meet. The class stands on fresh black lava
// between a big gentle shield volcano, whose glowing river runs steaming into the sea, and the shore,
// with the older islands stretching away in a line, greener, lower and more worn, down to a ring of reef.
// Pip finds the big lesson: the plume the class saw rising in the mantle stays put while the plate slides
// over it, punching up volcano after volcano. Basil finds the shake a plate edge can't explain: magma
// squeezing in under the volcano. Everything else opens a new idea: new land, black sand, green sand, two
// kinds of lava, a lava tube, how life reaches an island, the next island growing, and the reef left behind.

import * as THREE from 'three';
import { C, T, XF, add, bAdd, bFlush, barkGeo, box, clamp01, cyl, ease, fr, glowTex, grp, leafCloud, mergeGeos, meshOf, outline, sph, tex } from '../../core/kit.js';
import { Sound } from '../../core/sound.js';
import { addUsable, inWorld } from '../../core/world.js';
import { grassTuft } from '../../hq/wider.js';
import { player } from '../../player.js';
import { game } from '../../state.js';
import { tripBus } from '../bus.js';
import { classmates } from '../class.js';
import { goggles } from '../goggles.js';
import { curio, puffs, sample, tripWorld } from '../stop-kit.js';
import { storySky } from '../sky.js';
import { flock, soarer } from './land-life.js';
import { plume } from './plume.js';
import { quake } from './quake.js';
import { wonders } from './wonders.js';

const SEA = 0;
const BUS = [-2.5, 5.2], BUS_RY = Math.PI/2;
// an old cinder cone on the west, its seaward side eaten into a cove by the waves
const CONE = [-26, -1.5], COVE = [-20.5, -9];
const HUMMOCK = [-9, -6.4], LOOKOUT = [7.6, -8.4], STATION = [3.6, .8], BEACH = [-3.6, -9.3];
const TUBE = [-15, 8], LEHUA = [2.6, 11.4], ROPES = [9.4, 2.6], SURF_ROCK = [4.8, -14.6], RIM = [-25.4, -4.4];
// the big shield volcano, its summit far off to the east, and its lava river running down into the sea
const SHIELD = [100, 30];
const FLOW = [[64, -1], [50, -4], [38, -7], [29, -10], [22, -12.6], [18.4, -15], [17, -17.4], [16.6, -19.5]];
const ENTRY = [17, -17.6];
// the rest of the row, out along the way the plate has carried them, oldest farthest, the last a ring of reef. The row
// bends a little, as the real Hawaiian one does, so from the shore it spreads across the sea instead of hiding behind itself
const CHAIN = [{at:[-80, -130], r:34, h:28, age:.4}, {at:[-195, -150], r:32, h:19, age:.65}, {at:[-305, -150], r:28, h:9, age:.9}];
const ATOLL = [-410, -135], SEAMOUNT = [42, -46];
const POOLS = [[-14.4, -9.3, 1], [-12.6, -10.4, .75], [-16.2, -10.6, .7]];
// the time goggles' and the cutaway's models sit deep under the island, where nothing above can be seen
const CUT = [0, -140, 0], CUT2 = [90, -140, 0];

const sm = (a, b, v) => { const k = clamp01((v - a)/(b - a)); return k*k*(3 - 2*k); };
const hump = (x, z, [cx, cz], r) => Math.exp(-((x - cx)**2 + (z - cz)**2)/(r*r));
// how far out to sea a spot is: positive offshore, negative inland
const shoreZ = x => -11.6 + 1.1*Math.sin(x*.19 + .6) + .5*Math.sin(x*.47 + 2) + 4.2*Math.exp(-(((x - COVE[0])/3.2)**2)) - 4.2*sm(9, 17, x);
const westX = z => -35.5 + 1.5*Math.sin(z*.23 + 1) + .7*Math.sin(z*.61);
const isle = (x, z) => (Math.hypot((x - 80)/150, (z - 50)/105) - 1)*110;
const seaward = (x, z) => Math.max(shoreZ(x) - z, westX(z) - x, isle(x, z));
// the ʻaʻā flow's front: a wall of rough rubble along the east, with the lava river beyond it
const frontX = z => 12.2 + .7*Math.sin(z*.37 + 1) + .4*Math.sin(z*.9);
const southZ = x => 12.6 + .8*Math.sin(x*.4) + .5*Math.sin(x*.13 + 1);
const beachK = (x, z) => sm(-11.5, -9, x)*(1 - sm(4, 7, x))*(1 - sm(3, 5.5, z - shoreZ(x)));

function land(x, z){
  const s = seaward(x, z), dc = Math.hypot(x - CONE[0], z - CONE[1]), b = beachK(x, z);
  // the bench of new lava: a low shelf rising gently from the shore, with ropy hummocks, smoother on the beach
  // low where the bus parks: the bus's door is boarded from the ground at about sea level
  let y = .25 + .45*sm(0, 7, -s) + (.2*Math.sin(x*.7 + Math.sin(z*.5)*2)*Math.cos(z*.8 - x*.3) + .09*Math.sin(x*1.9 - z*1.3))*(1 - b)*sm(0, 3, -s)*(1 - hump(x, z, BUS, 3.5));
  y += .9*hump(x, z, HUMMOCK, 2.2) + .7*hump(x, z, LOOKOUT, 2.6) + 1.9*hump(x, z, TUBE, 3.2);
  // the cinder cone, a crater in its top, and the sea biting into its side
  y += (4.6*(1 - sm(3, 12.5, dc)) - 1.2*(1 - sm(0, 3.2, dc)))*(1 - .8*hump(x, z, COVE, 4));
  // up into the forest to the south, and the ʻaʻā flow along the east
  y += 6*sm(11, 34, z)*(1 + .3*Math.sin(x*.11)) + 1.3*sm(-.7, .5, x - frontX(z));
  const dsh = Math.hypot(x - SHIELD[0], (z - SHIELD[1])*1.2)/110;
  y += 34*Math.max(0, 1 - dsh*dsh)**1.6*sm(0, 34, -s);
  if (s <= 0) return y;
  // out under the sea: wadeable shallows, then a drop to the deep
  const bed = s < 4.8 ? -.09*s : -.43 - .9*(s - 4.8);
  const k = sm(0, 1.3, s); return y*(1 - k) + Math.max(-18, bed)*k;
}
const POOLW = POOLS.map(([x, z, r]) => { let m = Infinity; for (let a = 0; a < 6.28; a += .2) m = Math.min(m, land(x + Math.cos(a)*r*1.1, z + Math.sin(a)*r*1.1)); return [x, z, r, m - .06]; });
function ground(x, z){
  let y = land(x, z);
  for (const [px, pz, r, py] of POOLW) { const d = Math.hypot(x - px, z - pz); if (d < r*1.6) y = Math.min(y, d < r ? py - .04 - .3*(1 - (d/r)**2) : py + .02 + .45*(d - r)); }
  return y;
}
const slope = (x, z) => Math.hypot(ground(x + .3, z) - ground(x - .3, z), ground(x, z + .3) - ground(x, z - .3))/.6;

export function buildHotspot(t){
  const w = tripWorld({title:'The Hotspot Island', bg:0xf2d6c2, sky:0xfff0dc, groundCol:0x3a3a4a, hemi:.82, sunCol:0xffd6a4, sunI:.9, fogNear:110, fogFar:720,
    cam:{oy:7.4, oz:9.2, oyP:9.4, ozP:10.6}});
  w.far = 1000;
  const solid = [];
  w.ground = ground;
  // the sea all round gets deeper until it's over your head; the ʻaʻā front, the cone's cliffs and the forest close the rest
  w.bounds = (x, z) => ground(x, z) > SEA - .42 && x < frontX(z) - .7 && z < southZ(x) && slope(x, z) < .95 && solid.every(([sx, sz, r]) => Math.hypot(x - sx, z - sz) > r);
  w.water = (x, z) => { for (const [px, pz, r, py] of POOLW) if (Math.hypot(x - px, z - pz) < r*.92) return py; return ground(x, z) < SEA ? SEA : null; };
  w.surface = (x, z) => beachK(x, z) > .5 || Math.hypot(x - COVE[0], z - COVE[1]) < 4 ? 'sand' : 'stone';
  w.area = (x, z) => Math.hypot(x - CONE[0], z - CONE[1]) < 10 ? 'The Old Cinder Cone' : beachK(x, z) > .5 ? 'The Black Sand Beach' : 'The Newest Island';
  w.spawn = [BUS[0] - 1.8, BUS[1] - 2, Math.PI];
  storySky(w, {sun:[-10, 15, 9], clouds3d:[[-150, 40, -120, 30], [-60, 52, -200, 36], [120, 46, -160, 30], [-240, 36, -60, 26], [40, 30, -110, 18], [200, 58, -40, 34], [-120, 30, 90, 24], [150, 50, 150, 30]]});
  let seaTex, lavaTex, foamA, foamB, delta, entryGlow;
  const shoreLife = [];
  inWorld(w, () => {
    // ---------- the land: one mesh, fine where you walk and coarser out toward the far shores ----------
    const N = 300, WX = u => -2 + 62*u + 230*u**7, WZ = v => -4 + 50*v + 200*v**7;
    const geo = new THREE.PlaneGeometry(2, 2, N, N); geo.rotateX(-Math.PI/2);
    const p = geo.attributes.position;
    for (let i = 0; i < p.count; i++) { const x = WX(p.getX(i)), z = WZ(p.getZ(i)); p.setXYZ(i, x, ground(x, z), z); }
    geo.computeVertexNormals();
    // fresh black lava with a blue sheen, black sand, red cinders on the cone, olive sand in the cove,
    // green creeping in where the ground is older, and under the sea a dark bed going blue with depth
    const n = geo.attributes.normal, cols = new Float32Array(p.count*3), c = new THREE.Color();
    const [lava, sheen, sand, cinder, cinderDk, olive, green, moss, aa, bed, deep, shield] =
      [0x3e3a48, 0x5a5a72, 0x2a262e, 0x8a4634, 0x5e3028, 0x8a9440, 0x5e8a46, 0x7a9a50, 0x2e282c, 0x4a4a52, 0x1e3a52, 0x5a4a4e].map(h => new THREE.Color(h));
    for (let i = 0; i < p.count; i++) { const x = p.getX(i), y = p.getY(i), z = p.getZ(i), dc = Math.hypot(x - CONE[0], z - CONE[1]), s = seaward(x, z);
      c.copy(lava).lerp(sheen, .5 + .5*Math.sin(x*.9 + Math.sin(z*.7)*2)*Math.sin(z*.6 - x*.2));
      c.lerp(sand, beachK(x, z)*.9);
      c.lerp(dc < 3 ? cinderDk : cinder, (1 - sm(7, 11, dc))*.85).lerp(green, (1 - sm(5, 11, dc))*sm(3.5, 7, dc)*.35*(1 + Math.sin(Math.atan2(z - CONE[1], x - CONE[0])*5)));
      c.lerp(olive, (1 - sm(2, 4.6, Math.hypot(x - COVE[0], z - COVE[1] - 1.2)))*.9);
      c.lerp(aa, sm(-.3, .6, x - frontX(z))*.8);
      c.lerp(shield, sm(20, 40, x)*.6).lerp(green, sm(9, 16, z)*.8 + sm(30, 70, x)*sm(-10, 20, z)*.5).lerp(moss, sm(16, 30, z)*.5);
      c.lerp(bed, sm(.1, .6, s)).lerp(deep, sm(-.4, -6, y)*sm(0, 1, s));
      c.multiplyScalar(.92 + .16*sm(.5, .95, n.getY(i))); c.convertSRGBToLinear(); cols.set([c.r, c.g, c.b], i*3); }
    geo.setAttribute('color', new THREE.BufferAttribute(cols, 3));
    // pāhoehoe's ropes and wrinkles, painted faint so the colours keep their hue
    const ropeTex = tex(512, 512, (g, cw, ch) => { g.fillStyle = '#e4e0ea'; g.fillRect(0, 0, cw, ch);
      const wrap = f => { for (const dx of [-cw, 0, cw]) for (const dy of [-ch, 0, ch]) f(dx, dy); };
      g.lineCap = 'round';
      for (let i = 0; i < 26; i++) { const x = Math.random()*cw, y = Math.random()*ch, r0 = 14 + Math.random()*30; g.strokeStyle = i % 2 ? 'rgba(255,255,255,.75)' : 'rgba(150,140,170,.5)'; g.lineWidth = 3;
        for (let k = 0; k < 5; k++) wrap((dx, dy) => { g.beginPath(); g.arc(x + dx, y + dy + k*6, r0 + k*6, Math.PI*1.15, Math.PI*1.85); g.stroke(); }); }
      g.strokeStyle = 'rgba(40,30,50,.35)'; g.lineWidth = 2;
      for (let i = 0; i < 12; i++) { let x = Math.random()*cw, y = Math.random()*ch; g.beginPath(); g.moveTo(x, y); for (let k = 0; k < 5; k++) { x += (Math.random() - .5)*50; y += (Math.random() - .5)*50; g.lineTo(x, y); } g.stroke(); }
      for (let i = 0; i < 500; i++) { g.fillStyle = i % 3 ? 'rgba(255,255,255,.6)' : 'rgba(90,80,110,.4)'; g.fillRect(Math.random()*cw, Math.random()*ch, 2, 2); } }, 1, 1);
    const uv = geo.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, p.getX(i)/6, p.getZ(i)/6);
    const ground3 = new THREE.Mesh(geo, T(0xffffff, {map:ropeTex, vertexColors:true})); ground3.receiveShadow = true; w.scene.add(ground3);

    // ---------- the sea: turquoise over the shallows, deep blue beyond, with foam lapping every shore ----------
    seaTex = tex(256, 256, (g, cw, ch) => { g.fillStyle = '#c4dbe8'; g.fillRect(0, 0, cw, ch);
      g.strokeStyle = '#ffffff'; g.lineCap = 'round';
      for (let i = 0; i < 16; i++) { const x = (i*67) % cw, y = (i*101) % ch, l = 16 + (i % 4)*8; g.lineWidth = 3 + (i % 3);
        for (const dx of [-cw, 0, cw]) for (const dy of [-ch, 0, ch]) { g.beginPath(); g.moveTo(x + dx, y + dy); g.quadraticCurveTo(x + dx + l*.5, y + dy - 7, x + dx + l, y + dy); g.quadraticCurveTo(x + dx + l*1.2, y + dy + 4, x + dx + l*.9, y + dy + 6); g.stroke(); } } }, 1, 1);
    const C0 = [-6, -12], SZ = 140, SR = 66, sg = new THREE.RingGeometry(.1, SR, 120, 70); sg.rotateX(-Math.PI/2); sg.translate(C0[0], SEA, C0[1]);
    const sp = sg.attributes.position, sc = new Float32Array(sp.count*3), [shal, mid, dp] = [0x6ad8c8, 0x2e9cc0, 0x1e64a4].map(h => new THREE.Color(h).convertSRGBToLinear());
    for (let i = 0; i < sp.count; i++) { const x = sp.getX(i), z = sp.getZ(i), d = SEA - ground(x, z), far = sm(50, SR, Math.hypot(x - C0[0], z - C0[1]));
      c.copy(shal).lerp(mid, sm(.3, 2.2, d)).lerp(dp, Math.max(sm(2.5, 9, d), far)); sc.set([c.r, c.g, c.b], i*3); }
    sg.setAttribute('color', new THREE.BufferAttribute(sc, 3));
    const suv = sg.attributes.uv; for (let i = 0; i < suv.count; i++) suv.setXY(i, sp.getX(i)/9, sp.getZ(i)/9);
    const seaM = T(0xffffff, {map:seaTex, vertexColors:true, transparent:true, opacity:.84, depthWrite:false, emissive:0x0a3048, emissiveIntensity:.25});
    const near = new THREE.Mesh(sg, seaM); near.renderOrder = 1; w.scene.add(near);
    // out past the shallows, the very same sea on to the horizon: one material, the deep colour the near sea
    // fades to, and under it all one deep floor, so no seam shows from any height
    const rg = new THREE.RingGeometry(SR, 1700, 120, 1); rg.rotateX(-Math.PI/2); rg.translate(C0[0], SEA, C0[1]);
    const rp = rg.attributes.position, ruv = rg.attributes.uv; rg.setAttribute('color', new THREE.BufferAttribute(new Float32Array(rp.count*3).map((v, i) => [dp.r, dp.g, dp.b][i % 3]), 3));
    for (let i = 0; i < ruv.count; i++) ruv.setXY(i, rp.getX(i)/9, rp.getZ(i)/9);
    const ring = new THREE.Mesh(rg, seaM); ring.renderOrder = 1; w.scene.add(ring);
    // the same colour the deep sea bed is painted, in the same (linear) light, so the land's far edge doesn't show
    add(new THREE.PlaneGeometry(3600, 3600), T(new THREE.Color(0x1e3a52).convertSRGBToLinear().multiplyScalar(1.08).getHex()), C0[0], -18.2, C0[1], null, false).rotation.x = -Math.PI/2;
    // foam: two bands baked from the shore's own shape, one at the water's edge and one a little way out,
    // that take turns brightening, so the sea laps
    const foam = (lo, hi, dots) => { const F = 512, cv = document.createElement('canvas'); cv.width = cv.height = F; const g = cv.getContext('2d'), img = g.createImageData(F, F);
      for (let j = 0; j < F; j++) for (let i = 0; i < F; i++) { const x = C0[0] - SZ/2 + (i + .5)/F*SZ, z = C0[1] - SZ/2 + (j + .5)/F*SZ, y = ground(x, z);
        let a = sm(lo - .05, lo, y)*(1 - sm(hi, hi + .05, y));
        if (dots) a *= .5 + .5*Math.sign(Math.sin(x*2.1 + Math.sin(z*1.3)*3)*Math.sin(z*1.7 - x*.4));
        const k = (j*F + i)*4; img.data[k] = img.data[k + 1] = img.data[k + 2] = 255; img.data[k + 3] = a*255; }
      g.putImageData(img, 0, 0); const tx = new THREE.CanvasTexture(cv); tx.encoding = THREE.sRGBEncoding;
      const m = new THREE.Mesh(new THREE.PlaneGeometry(SZ, SZ), new THREE.MeshBasicMaterial({map:tx, transparent:true, depthWrite:false, opacity:.9}));
      m.rotation.x = -Math.PI/2; m.position.set(C0[0], SEA + .02, C0[1]); m.renderOrder = 2; w.scene.add(m); return m; };
    foamA = foam(-.16, .02, false); foamB = foam(-.42, -.3, true);

    // ---------- the shield volcano's lava river, glowing all the way down into the sea ----------
    lavaTex = tex(128, 256, (g, cw, ch) => { g.fillStyle = '#ff9a2a'; g.fillRect(0, 0, cw, ch);
      for (let i = 0; i < 26; i++) { const x = (i*47) % cw, y = (i*83) % ch, r = 10 + (i % 5)*5; g.fillStyle = i % 3 ? 'rgba(90,30,24,.85)' : 'rgba(150,50,30,.7)';
        for (const dy of [-ch, 0, ch]) { g.beginPath(); g.ellipse(x, y + dy, r*1.3, r*.8, i, 0, 7); g.fill(); } }
      g.strokeStyle = 'rgba(255,236,140,.9)'; g.lineWidth = 3; for (let i = 0; i < 10; i++) { const x = (i*29) % cw, y = (i*57) % ch; g.beginPath(); g.moveTo(x, y); g.lineTo(x + 12, y + 18); g.lineTo(x + 4, y + 34); g.stroke(); } }, 1, 3);
    const flowPts = new THREE.CatmullRomCurve3(FLOW.map(([x, z]) => new THREE.Vector3(x, 0, z))).getSpacedPoints(160);
    const ribbon = (wd, lift, mat) => { const pos = [], uvs = [], idx = []; let along = 0;
      flowPts.forEach((q, i) => { const a = flowPts[Math.max(0, i - 1)], b2 = flowPts[Math.min(flowPts.length - 1, i + 1)], tx = b2.x - a.x, tz = b2.z - a.z, l = Math.hypot(tx, tz), r = wd(i);
        if (i) along += q.distanceTo(flowPts[i - 1]);
        for (const sd of [-1, 1]) { const x = q.x - tz/l*r*sd, z = q.z + tx/l*r*sd; pos.push(x, Math.max(ground(x, z), ground(q.x, q.z), SEA + .05) + lift, z); uvs.push(sd < 0 ? 0 : 1, along/6); }
        if (i < flowPts.length - 1) { const k = i*2; idx.push(k, k + 2, k + 1, k + 1, k + 2, k + 3); } });
      const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2)); g.setIndex(idx); g.computeVertexNormals();
      w.scene.add(new THREE.Mesh(g, mat)); };
    ribbon(i => 1.5 + .3*Math.sin(i*.4), .05, T(0x1e1820, {side:THREE.DoubleSide}));
    ribbon(i => (.9 + .25*Math.sin(i*.3))*(1 - .3*sm(140, 160, i)), .1, new THREE.MeshBasicMaterial({map:lavaTex, fog:false, side:THREE.DoubleSide}));
    for (let i = 4; i < flowPts.length; i += 9) { const q = flowPts[i], gl = new THREE.Sprite(new THREE.SpriteMaterial({map:glowTex, color:0xff8a3a, transparent:true, depthWrite:false, blending:THREE.AdditiveBlending, opacity:.55}));
      gl.position.set(q.x, Math.max(ground(q.x, q.z), SEA) + .9, q.z); gl.scale.setScalar(4); w.scene.add(gl); shoreLife.push(gl); }
    // the newest land: a lobe of lava pushing out into the sea where the river meets it, cracked and glowing
    const crust = tex(256, 256, (g, cw, ch) => { g.fillStyle = '#ff8a2a'; g.fillRect(0, 0, cw, ch);
      for (let i = 0; i < 40; i++) { g.fillStyle = ['#2a2228', '#3a2e34', '#1e1820'][i % 3]; const x = (i*61) % cw, y = (i*97) % ch; g.beginPath(); g.moveTo(x, y);
        for (let k = 0; k < 6; k++) { const a = k/6*Math.PI*2, r = 16 + ((i*k) % 7)*2; g.lineTo(x + Math.cos(a)*r, y + Math.sin(a)*r*.8); } g.fill(); } });
    delta = grp(ENTRY[0], SEA - .1, ENTRY[1] - .6, -.4);
    const lobe = add(new THREE.SphereGeometry(1, 20, 10, 0, Math.PI*2, 0, Math.PI/2), T(0xffffff, {map:crust, emissive:0xff5a1a, emissiveIntensity:.35}), 0, 0, 0, delta, false);
    lobe.scale.set(2.6, .45, 2); outline(lobe, 1.04);
    delta.scale.set(.6, 1, .5);
    entryGlow = new THREE.Sprite(new THREE.SpriteMaterial({map:glowTex, color:0xff7a2a, transparent:true, depthWrite:false, blending:THREE.AdditiveBlending, opacity:.8}));
    entryGlow.position.set(ENTRY[0], .6, ENTRY[1] - 1); entryGlow.scale.setScalar(6); w.scene.add(entryGlow);

    // ---------- the ʻaʻā front: a wall of rough clinker, still steaming in places ----------
    for (let z = -16; z < 15; z += .45) { const x0 = frontX(z);
      for (let k = 0; k < 3; k++) { const s = fr(.25, .6), x = x0 + fr(-.3, 1.4) + k*.5, y = ground(x, z);
        bAdd([0x2a2228, 0x3a2e34, 0x4a3430, 0x2e262a][Math.floor(fr(0, 4))], new THREE.DodecahedronGeometry(s, 0), XF(x, y + s*.2, z + fr(-.2, .2), fr(1, 1.4), fr(.7, 1.1), fr(.9, 1.3), fr(0, 3), fr(0, 3), fr(0, 3)), {ink:.03, shadow:true}); } }
    for (let i = 0; i < 160; i++) { const z = fr(-16, 30), x = frontX(z) + fr(1.5, 18), s = fr(.2, .5);
      if (Math.hypot(x - ENTRY[0], z - ENTRY[1]) < 4) continue;
      bAdd([0x2a2228, 0x3a2e34][i % 2], new THREE.DodecahedronGeometry(s, 0), XF(x, ground(x, z) + s*.1, z, 1.2, .7, 1, fr(0, 3), fr(0, 3), 0), {ink:.025}); }

    // ---------- the cinder cone's crater rim, and red cinders strewn down its sides ----------
    for (let i = 0; i < 70; i++) { const a = fr(0, Math.PI*2), r = fr(2.5, 10), x = CONE[0] + Math.cos(a)*r, z = CONE[1] + Math.sin(a)*r, s = fr(.1, .26);
      if (Math.hypot(x - RIM[0], z - RIM[1]) < 1.4 || Math.hypot(x - COVE[0], z - COVE[1]) < 3.5) continue;
      bAdd([0x7a3a2c, 0x9a5038, 0x5e3028][i % 3], new THREE.DodecahedronGeometry(s, 0), XF(x, ground(x, z) + s*.1, z, 1.2, .7, 1, 0, a, 0), {ink:.015}); }
    // boulders along the cone's sea cliffs and the far west shore, which the waves have rounded
    for (let i = 0; i < 46; i++) { const z = fr(-14, 12), x = westX(z) + fr(.4, 3), y = ground(x, z), s = fr(.5, 1.4); if (y < SEA - 1.5) continue;
      bAdd([0x3a3038, 0x4a3e44, 0x2e2830][i % 3], new THREE.DodecahedronGeometry(s, 0), XF(x, y + s*.2, z, 1.2, .8, 1.1, fr(0, 1), fr(0, 6), 0), {ink:.05, shadow:true}); }
    // black boulders along the rocky shore, where the bench meets the sea
    for (let x = -18; x < 12; x += fr(.8, 1.8)) { if (beachK(x, shoreZ(x) + 1) > .4) continue; const z = shoreZ(x) + fr(-.6, .8), s = fr(.3, .8);
      if (POOLS.some(([px, pz, r]) => Math.hypot(x - px, z - pz) < r + .5)) continue;
      bAdd([0x2a2630, 0x3a3440][Math.floor(fr(0, 2))], new THREE.DodecahedronGeometry(s, 0), XF(x, ground(x, z) + s*.15, z, 1.3, .6, 1.1, 0, fr(0, 6), 0), {ink:.035, shadow:true}); }
    // a rock out in the shallows, to wade out to
    const [rx, rz] = SURF_ROCK; solid.push([rx + .5, rz - .3, .7]);
    bAdd(0x2e2a34, new THREE.DodecahedronGeometry(.85, 0), XF(rx + .5, ground(rx + .5, rz - .3) + .2, rz - .3, 1.3, .8, 1.1, .2, .6, 0), {ink:.04, shadow:true});
    // the tide pools' rims, and pebbles in the bottom
    for (const [px, pz, r] of POOLS) for (let k = 0; k < 9; k++) { const a = k/9*Math.PI*2 + fr(-.2, .2), x = px + Math.cos(a)*(r + .25), z = pz + Math.sin(a)*(r + .25), s = fr(.12, .24);
      bAdd([0x3a3440, 0x2a2630][k % 2], new THREE.DodecahedronGeometry(s, 0), XF(x, ground(x, z) + s*.1, z, 1.2, .6, 1, 0, a, 0), {ink:.02}); }

    // ---------- the forest edge to the south: ʻōhiʻa trees, tree ferns, grass, and hills rising behind ----------
    const canopy = [], lehua = [], trunks = [], fronds = [];
    const ohia = (x, z, s) => { const y = ground(x, z);
      trunks.push(...barkGeo([[x, y, z], [x + .15*s, y + .8*s, z + .1*s], [x - .1*s, y + 1.5*s, z - .05*s], [x + .1*s, y + 2.1*s, z]], .16*s, .08*s));
      for (const [dx, dy, dz, r, tone] of [[0, 2.4, 0, .85, 1], [.7, 2.2, .2, .6, 1], [-.7, 2.1, -.1, .62, 0], [.1, 2.8, -.2, .6, 2], [-.3, 2.6, .5, .5, 2]]) {
        canopy.push([x + dx*s, y + dy*s, z + dz*s, r*s, tone]);
        for (let k = 0; k < 3; k++) { const a = fr(0, 6), el = fr(-.2, .8); lehua.push([new THREE.SphereGeometry(.09*s, 7, 5), XF(x + dx*s + Math.cos(a)*Math.cos(el)*r*s*.95, y + dy*s + Math.sin(el)*r*s*.85, z + dz*s + Math.sin(a)*Math.cos(el)*r*s*.95)]); } } };
    const fern = (x, z, s) => { const y = ground(x, z), h = 1.4*s;
      trunks.push([new THREE.CylinderGeometry(.12*s, .17*s, h, 7), XF(x, y + h/2, z)]);
      for (let k = 0; k < 9; k++) { const a = k/9*Math.PI*2 + fr(0, .3);
        for (let j = 0; j < 4; j++) { const u = (j + 1)/4.5, r = 1.1*s*u, fy = y + h + Math.sin(u*Math.PI*.8)*.45*s - u*u*.5*s;
          fronds.push([new THREE.SphereGeometry(.24*s*(1.15 - u*.6), 6, 4), XF(x + Math.cos(a)*r, fy, z + Math.sin(a)*r, 1.6, .22, .8, 0, -a, 0)]); } } };
    for (let x = -30; x < 14; x += fr(1.4, 2.6)) { const z = southZ(x) + fr(.6, 2.2);
      if (fr(0, 1) < .55) { ohia(x, z, fr(.9, 1.3)); solid.push([x, z, .5]); } else fern(x, z, fr(.8, 1.2)); }
    for (let i = 0; i < 70; i++) { const x = fr(-32, 30), z = southZ(x) + fr(3, 26); if (z > 40) continue; fr(0, 1) < .5 ? ohia(x, z, fr(1, 1.6)) : fern(x, z, fr(1, 1.4)); }
    // a few ʻōhiʻa out on the bench, already growing in the cracks of young lava
    for (const [x, z, s] of [[-17.5, 3.5, .8], [7.5, 7.6, .75], [-5.5, 10.2, .9], [LEHUA[0] + 1.2, LEHUA[1] + .4, 1]]) { ohia(x, z, s); solid.push([x, z, .35]); }
    for (const [x, z, s] of [[-12, 4, .55], [1.5, -3.5, .45], [-7, 2.5, .5], [10.4, -4.5, .5], [-20, 5.5, .6]]) fern(x, z, s);
    meshOf(mergeGeos(trunks), 0x5a4234, w.scene, .03); meshOf(mergeGeos(fronds), 0x5e9a4a, w.scene, .012);
    meshOf(mergeGeos(lehua), T(0xe0303a, {emissive:0x601010, emissiveIntensity:.3}), w.scene, .01);
    leafCloud(w.scene, canopy, .04);
    // three coconut palms leaning out over the beach
    const palmT = [], palmF = [];
    for (const [x, z, lean] of [[-10.6, -7.2, .7], [-8.2, -5.2, .4], [4.6, -7.4, -.5]]) { const y = ground(x, z); solid.push([x, z, .3]);
      const top = [x + lean*1.1, y + 3.3, z - .9];
      palmT.push(...barkGeo([[x, y, z], [x + lean*.25, y + 1.2, z - .15], [x + lean*.65, y + 2.3, z - .5], top], .2, .13));
      for (let k = 0; k < 7; k++) { const a = k/7*Math.PI*2;
        for (let j = 0; j < 5; j++) { const u = (j + 1)/5; palmF.push([new THREE.SphereGeometry(.26*(1.1 - u*.5), 6, 4), XF(top[0] + Math.cos(a)*u*1.6, top[1] + .2 - u*u*1, top[2] + Math.sin(a)*u*1.6, 1.8, .2, .7, 0, -a, -u*.4)]); } }
      for (let k = 0; k < 3; k++) palmF.push([new THREE.SphereGeometry(.14, 8, 6), XF(top[0] + Math.cos(k*2)*.2, top[1] - .1, top[2] + Math.sin(k*2)*.2)]); }
    meshOf(mergeGeos(palmT), 0x8a6a4a, w.scene, .025); meshOf(mergeGeos(palmF), 0x4e8a3e, w.scene, .02);
    // grass and little ferns where the older ground has some soil
    for (let i = 0; i < 260; i++) { const x = fr(-32, 13), z = fr(4, 16); if (z > southZ(x) + 2 || Math.hypot(x - BUS[0], z - BUS[1]) < 4) continue;
      const y = ground(x, z); if (fr(0, 1) > sm(4, 12, z)) continue; grassTuft(x, z, y, fr(1.2, 1.8), [0x6a9a4a, 0x86a24a, 0x5a8a3e][Math.floor(fr(0, 3))]); }
    bFlush(w.scene);
  });
  const lavaFlow = puffs(w, ENTRY[0], .3, ENTRY[1] - .8, {rate:5, rise:2.4, size:3.2, color:0xf6f0ec, opacity:.6, spread:2.4, life:3.4});
  const steam = plume(w, [ENTRY[0], .4, ENTRY[1] - 1], {scale:.9, burps:false, max:90, base:2.4, top:26});
  puffs(w, 29, ground(29, -10) + .6, -10, {rate:.8, rise:1.2, size:1.4, color:0xe8e0e0, opacity:.3, spread:1, life:3});
  for (const z of [-6, 2, 9]) puffs(w, frontX(z) + .8, ground(frontX(z) + .8, z) + .3, z, {rate:.4, rise:.8, size:.7, opacity:.22, spread:.4, life:3});
  // the shield's summit crater, steaming far off
  puffs(w, SHIELD[0] - 6, ground(SHIELD[0] - 6, SHIELD[1] - 8) + 1, SHIELD[1] - 8, {rate:1.2, rise:3, size:9, color:0xf0eae8, opacity:.45, spread:4, life:5});
  buildFar(w);
  const chain = buildChainSlice(w), swell = buildSwellSlice(w);
  const bus = tripBus(w);
  const door = () => bus.door(.6);
  const cls = classmates(w, t, bus);
  const say = t.say;
  // lava blobs tumbling off the edge of the new land into the sea
  const blobs = [0, 1, 2, 3].map(() => { const m = sph(.16, new THREE.MeshBasicMaterial({color:0xffa040}), 0, -99, 0, w.scene, 6, false); return {m, t:fr(0, 2)}; });
  let grow = 0;
  w.anims.push((dt, tt) => {
    seaTex.offset.set(tt*.006, -tt*.012); lavaTex.offset.y = -tt*.05;
    const lap = .5 + .5*Math.sin(tt*.9); foamA.material.opacity = .45 + .5*lap; foamB.material.opacity = .65*(1 - lap);
    entryGlow.material.opacity = .6 + .2*Math.sin(tt*2.3) + .1*Math.sin(tt*5.1);
    shoreLife.forEach((g, i) => { g.material.opacity = .45 + .15*Math.sin(tt*1.7 + i); });
    for (const b of blobs) { b.t += dt; const k = (b.t % 1.6)/1.6, a = b.t*.7;
      b.m.position.set(ENTRY[0] + Math.cos(a)*1.2*delta.scale.x, .5 - k*k*1.2, ENTRY[1] - 1.4*delta.scale.z - k*.8); }
    if (grow) delta.scale.set(.6 + .7*grow, 1, .5 + .8*grow);
    if (w.shake > 0) lavaFlow.burst = Math.max(lavaFlow.burst, .3);
    steam.rate = 2.4 + 4*grow*(1 - grow)*4;
  });

  // ---------- what the class finds ----------
  const far = (pos, look) => { if (innerWidth < innerHeight) { pos.x = look.x + (pos.x - look.x)*1.5; pos.z = look.z + (pos.z - look.z)*1.5; } };
  const hy = ground(...HUMMOCK);
  cls.find('pip', {name:'chain', at:[HUMMOCK[0] + .6, HUMMOCK[1] + .4, -2.3], pose:'peer', call:"Islands! A whole row of them!",
    after:["Black and new at this end, green and old at that end. Like a row of birthday candles!"],
    async scene(){
      await say([['pip', "{name}! Look out there, along the sea. Count with me!"]]);
      // up on the hummock, looking along the row, the haze pulled back so the far ones show
      const fog = w.scene.fog, haze = [fog.near, fog.far]; fog.near = 400; fog.far = 1800;
      t.cut((pos, look) => far(pos.set(HUMMOCK[0] + 4, hy + 5, HUMMOCK[1] + 7), look.set(-230, 0, -150)));
      await t.wait(1);
      await say([['pip', "One, two, three… and a ring, way out at the end. A whole row of islands!"],
                 ['pip', "Just like the row of volcanoes this morning!"],
                 ['juniper', "But those lined up where one plate dives under another. Here, there's no plate edge for thousands of kilometers!"],
                 ['pip', "So why a row?"],
                 ['pip', "Look how different they are. Ours is black. The next one's brown and green. The far ones are all green and worn down, and low."]]);
      const old = await t.ask('pip', "Which island do you think is the oldest?", ["The far one, green and worn down", "This one, where we're standing", "They're all the same age"]);
      [fog.near, fog.far] = haze;
      t.cut(null);
      await say([['sparks', "Remember the skinny glowing tower in the mantle? The plume, rising from much deeper down?"],
                 ['sparks', "I said some plumes come up right in the middle of a plate. Well, class… we're standing on top of one!"],
                 ['basil', "We're standing on a WHAT?"],
                 ['sparks', "Time goggles on, {name}! X-ray mode, so we can see down through the plate."]]);
      await goggles(t, {shot:chain.shot, years:5e6, dur:11, step:chain.step});
      t.cut(null);
      await say([['pip', old === 0 ? "You were right! The far one is oldest." : "It's the far one! The far one is the oldest."],
                 ['sparks', "The plume stays put, deep down. The plate slides over it, like a sheet of paper sliding slowly over a candle."],
                 ['sparks', "Every so often the plume punches a new volcano up through the plate. Then the plate carries it away, off the plume."],
                 ['juniper', "And away from the plume, it cools, and wears down, and sinks! That's why the old ones are low and green."],
                 ['sparks', "So the islands come out in a row, from new to old. And it's still going: the plate is carrying us right now, a little faster than your fingernails grow."],
                 ['pip', "A row of islands, made by a candle that stays still. Mystery solved!"]]);
      if (await t.more('sparks', "Want to hear a mystery scientists are still arguing about?"))
        await say([['sparks', "Nobody has ever seen a plume. They're far too deep. Scientists find them by listening to earthquake waves passing through the Earth."],
                   ['sparks', "Some think plumes start way down at the edge of the core, almost halfway to the middle of the Earth. Others think they start much higher up."],
                   ['juniper', "So nobody knows for sure?"],
                   ['sparks', "Not yet! Maybe you'll be the one who finds out."]]);
      t.cut(null);
    }});

  // the scientists' station: a GPS antenna on a pole, a solar panel, and a tiltmeter buried in the lava
  const sty = ground(...STATION);
  inWorld(w, () => {
    const st = grp(STATION[0], sty, STATION[1], .4); solid.push([STATION[0], STATION[1], .7]);
    for (const a of [0, 2.1, 4.2]) { const l = cyl(.03, .03, 1.5, T(0x9a9aa6), Math.cos(a)*.3, .7, Math.sin(a)*.3, st, 5); l.rotation.set(Math.sin(a)*.2, 0, -Math.cos(a)*.2); }
    cyl(.04, .04, .7, T(0x8a8a96), 0, 1.6, 0, st, 6);
    outline(add(new THREE.SphereGeometry(.26, 14, 8, 0, Math.PI*2, 0, Math.PI/2), T(0xf2ece0), 0, 1.95, 0, st), 1.08);
    outline(box(.5, .06, .5, T(0xf2ece0), 0, 1.95, 0, st), 1.06);
    outline(box(.55, .4, .35, T(0xd8743a), .75, .2, .2, st), 1.05);
    const panelTex = tex(64, 64, (c, cw, ch) => { c.fillStyle = '#2a3a7a'; c.fillRect(0, 0, cw, ch); c.strokeStyle = '#9ab0e0'; c.lineWidth = 2; for (let i = 1; i < 4; i++) { c.beginPath(); c.moveTo(i*16, 0); c.lineTo(i*16, ch); c.moveTo(0, i*16); c.lineTo(cw, i*16); c.stroke(); } });
    cyl(.025, .025, .9, T(0x8a8a96), .75, .8, .2, st, 5);
    outline(add(new THREE.BoxGeometry(.7, .04, .5), T(0xffffff, {map:panelTex}), .75, 1.25, .2, st), 1.05).rotation.x = .5;
    // the tiltmeter: just a capped pipe showing, with a cable to the box
    outline(cyl(.12, .12, .14, T(0x4a7ac8), -.9, .07, .5, st, 10), 1.08);
    box(1.4, .025, .025, T(0x1a1320), -.1, .03, .4, st).rotation.y = -.2;
  });
  const beep = sph(.05, T(0x4aff6a, {emissive:0x2aff4a, emissiveIntensity:1}), STATION[0] + .7, sty + .45, STATION[1] + .5, w.scene, 8, false);
  w.anims.push((dt, tt) => { beep.material.emissiveIntensity = (tt % 1.2) < .15 ? 1.6 : .1; });
  cls.find('basil', {name:'swell', at:[STATION[0] - 1.4, STATION[1] + .9, 1.9], when: () => cls.saw('chain'), call:"The ground is buzzing! Is that normal?!",
    after:["Plates snapping, magma squeezing… the ground has lots of ways to shake. And I know what to do every time."],
    async scene(){
      t.cut((pos, look) => { pos.set(STATION[0] - 3, sty + 3.4, STATION[1] + 5); look.set(STATION[0], sty + 1, STATION[1]); });
      await say([['basil', "{name}, this machine keeps beeping. And my feet keep buzzing!"],
                 ['sparks', "Ooh, a scientists' station! That white dome is a GPS antenna. It knows exactly where it is, all the time, even if the ground moves up a tiny bit."],
                 ['sparks', "And that little pipe in the lava is a tiltmeter. It can feel the ground tip, even less than the thickness of a hair."],
                 ['basil', "Why would the ground move up? Grounds don't move up. Grounds stay put. Right?"]]);
      await quake(w, t, cls, {where:[ENTRY[0] - 4, ENTRY[1] + 6], strength:.85});
      t.cut((pos, look) => { pos.set(STATION[0] - 3, sty + 3.4, STATION[1] + 5); look.set(STATION[0], sty + 1, STATION[1]); });
      await say([['basil', "That was an EARTHQUAKE! But there's no plate edge here! What made it shake?"]]);
      const why = await t.ask('basil', "What do you think shook the island?", ["Magma moving underneath", "Plates bumping together", "The volcano sneezed"]);
      await say([['sparks', "Let's look under the volcano. Goggles on, {name}!"]]);
      await goggles(t, {shot:swell.shot, years:4, dur:10, step:swell.step});
      t.cut((pos, look) => { pos.set(STATION[0] - 3, sty + 3.4, STATION[1] + 5); look.set(STATION[0], sty + 1, STATION[1]); });
      await say([['basil', why === 0 ? "You got it! Magma moving underneath." : why === 2 ? "Not a sneeze. Magma, moving underneath!" : "Not plates this time. Magma, moving underneath!"],
                 ['sparks', "Magma from the plume squeezes into the cracks under the volcano, and the ground swells up, like blowing up a balloon."],
                 ['sparks', "Rock can only stretch so far. Then it cracks. And that crack is the shake!"],
                 ['basil', "And then the ground went back down again."],
                 ['sparks', "Volcanoes puff up and sink back, again and again, like they're breathing. That's what this station is watching for."],
                 ['sparks', "When the GPS rises and the tiltmeter tips, scientists know magma is moving down there."]]);
      if (await t.more('sparks', "Want to know another way a volcano island can shake?"))
        await say([['sparks', "A big volcano is very heavy. Its side can slowly slide toward the sea."],
                   ['sparks', "When it gets stuck and then slips all at once, the whole island shakes. That happened on Kīlauea, in Hawaiʻi, in 1975, and again in 2018."],
                   ['mo', "Ground that swells AND slides? This island is wiggly."]]);
      wonders(3);
      await say([['basil', "The ground shakes, but now I know what to do!"]]);
      t.cut(null);
    }});

  const ly = ground(...LOOKOUT), entryShot = (pos, look) => { pos.set(LOOKOUT[0] - 1, ly + 6.5, LOOKOUT[1] + 4.5); look.set(ENTRY[0] - .5, 1.2, ENTRY[1] - 1.5); };
  cls.find('juniper', {name:'land', at:[LOOKOUT[0] + .5, LOOKOUT[1] - .3, 2.2], pose:'point', call:"The lava's going right into the sea!",
    after:["Brand-new land! I'm drawing the edge of the island. Then I'll draw it again tomorrow!"],
    async scene(){
      t.cut(entryShot);
      await say([['juniper', "Look, {name}! The lava river runs all the way down the volcano, right into the sea!"],
                 ['sparks', "And this is as close as we go. That steam is full of salty acid and tiny bits of glass. Scientists call it laze: lava haze."],
                 ['basil', "Lava HAZE? I'm holding my breath. For the rest of the day."]]);
      const pick = await t.ask('juniper', "What do you think happens when lava pours into the sea?", ["It makes new land", "The sea boils away", "The lava floats away"]);
      Sound.hiss({dur:5, vol:.12, type:'bandpass', freq:900, q:.5}); lavaFlow.burst = 1.2;
      const g0 = grow; await t.tween(5, k => { grow = g0 + (1 - g0)*ease(k); if (Math.random() < .04) { lavaFlow.burst = .6; Sound.hiss({dur:.4, vol:.06, type:'highpass', freq:2000}); } });
      await say([['juniper', pick === 0 ? "You were right! The edge of the island just grew!" : "Look! The sea didn't boil away. The edge of the island just grew!"],
                 ['sparks', "Hot lava hits the cold sea, cools, and hardens into rock. The island gets bigger. Brand-new land, the newest on Earth!"],
                 ['juniper', "So some of this land is younger than me?"],
                 ['sparks', "Some of it is only a few minutes old! But new land is wobbly. The waves can break off a whole chunk, so nobody walks out on it."]]);
      if (await t.more('juniper', "Want to know how much land a volcano can make?"))
        await say([['sparks', "In 2018, Kīlauea poured out so much lava that it made new land as big as hundreds of soccer fields."],
                   ['mo', "That's a lot of soccer."]]);
      t.cut(null);
    }});

  const by = ground(...BEACH), sandShot = (pos, look) => { pos.set(player.x + 2.2, by + 3.2, player.z + 2.4); look.set(player.x - .4, by + .2, player.z - .8); };
  const glitter = puffs(w, 0, -99, 0, {rate:0, rise:.3, size:.3, color:0xc8d8ff, opacity:.9, spread:.9, life:2.2});
  cls.find('mo', {name:'sand', at:[BEACH[0] + .5, BEACH[1] + .4, -2.6], pose:'crouch', call:"Somebody burnt the beach!",
    after:["Volcano glitter. I'm keeping some in my pocket. With my crumbs."],
    async scene(){
      t.cut((pos, look) => { pos.set(BEACH[0] + 2.4, by + 2.6, BEACH[1] + 3.6); look.set(BEACH[0], by + .3, BEACH[1] - .4); });
      await say([['mo', "{name}! The beach is BLACK! Did somebody burn the sand? Like toast?"]]);
      const pick = await t.ask('mo', "How do you think this beach got so black?", ["Hot lava hit the cold sea and shattered", "Somebody burnt the sand", "It's chocolate sprinkles"]);
      await say([['mo', "Only one way to find out. Scoop some up!"]]);
      // the scoop is wherever the explorer stands on the sand, so there's no spot to hunt for
      player.x = BEACH[0] - .8; player.z = BEACH[1] + .9; player.angle = Math.PI;
      await t.free(t.use(w, {name:'Black sand', x:BEACH[0] - .6, z:BEACH[1] + .4, y:by, range:3, verb:'Scoop up some sand', short:'Scoop', glow:[BEACH[0] - .4, by + .4, BEACH[1]]}), 'Scoop up some sand');
      glitter.x = player.x - .3; glitter.y = ground(player.x, player.z) + .4; glitter.z = player.z - .6; glitter.burst = 1; Sound.hiss({dur:.5, vol:.06, type:'highpass', freq:3000});
      t.cut(sandShot);
      await say([['mo', pick === 0 ? "You were right! Look close: every grain is a tiny bit of shiny black glass!" : "Not burnt at all! Look close: every grain is a tiny bit of shiny black glass!"],
                 ['sparks', "When hot lava hits cold sea water, it cools so fast that it shatters into little pieces. Like an ice cube cracking when you drop it in warm juice."],
                 ['sparks', "Then the waves tumble the pieces and grind them down into sand. Black sand, made from lava!"],
                 ['mo', "Volcano glitter!"],
                 ['sparks', "And a black sand beach needs its volcano. If the lava stops coming, the waves can carry the beach away, bit by bit."]]);
      t.cut(null);
    }});
  cls.hint = () => !cls.saw('chain') ? "Pip is counting islands, over on the black rocks by the sea. Go and see!" :
    !cls.saw('swell') ? "Basil is by the scientists' station. Something's buzzing over there!" :
    "Back to the bus whenever you're ready, {name}! Or go exploring: wade in the sea, climb the old cone, or peek into the rocks. This island is full of secrets!";
  buildFinds(w, t, solid);

  return {world:w, bus, cls,
    // in from far out along the row of islands, oldest to youngest, and down onto the newest
    async arrive(){
      bus.gear(null);
      const p = bus.root.position;
      t.watch(w, (pos, look) => { pos.set(p.x - 30, p.y + 16, p.z + 34); look.set(p.x + 24, p.y*.4, p.z + 4); });
      w.scene.fog.near = 300; w.scene.fog.far = 1600;
      Sound.tone(200, {type:'sawtooth', dur:6, vol:.03, f2:420, cut:900});
      const fly = bus.fly([[ATOLL[0] - 50, 66, ATOLL[1] - 10], [ATOLL[0] + 10, 56, ATOLL[1]], [-305, 50, -150], [-195, 54, -150], [-80, 58, -130], [-40, 30, -60], [-14, 10, -18], [BUS[0] - 6, 3, BUS[1] - 4], [BUS[0], ground(...BUS), BUS[1]]], 14);
      await t.wait(1.2);
      await say([['sparks', "Look down, class! We're flying along a row of islands, way out in the middle of the ocean."],
                 ['juniper', "That one's just a ring! A ring of sand, with a lagoon in the middle."],
                 ['pip', "These ones are green and fuzzy. And look, the one up ahead is smoking!"]]);
      await fly;
      w.scene.fog.near = 110; w.scene.fog.far = 720;
      bus.park(BUS[0], ground(...BUS), BUS[1], BUS_RY);
      Sound.tone(330, {type:'triangle', dur:.12, vol:.08}); Sound.tone(494, {type:'triangle', t:.1, dur:.18, vol:.08});
      const [dx, dz] = door();
      t.cut((pos, look) => { pos.set(4, 9, 15); look.set(-4, 0, -8); });
      cls.arrive({sparks:[dx + .9, dz - 1, -Math.PI*.8]});
      await t.wait(2.6);
      await say([['sparks', "Here we are: the newest island in the whole row. We're standing on the side of a volcano!"],
                 ['sparks', "And it's erupting right now. See that glowing river, and the steam where it meets the sea? We stay well back from that."],
                 ['basil', "An ERUPTING volcano. On purpose. We came here on PURPOSE."],
                 ['juniper', "Wait. Everywhere else today, the volcanoes were where plates meet. Where's the plate edge here?"],
                 ['sparks', "The nearest one is thousands of kilometers away. This island sits right in the middle of a plate."],
                 ['pip', "Then why is there a volcano here at all?"],
                 ['sparks', "That's our mystery! Go and find out. When somebody waves, go and see!"]]);
      t.play(w, [dx - .2, dz - .4, Math.PI]);
      t.goal('Visit anyone who waves!');
    },
    async explore(next = "it's time to go!"){
      await t.until(() => cls.saw('chain') && cls.saw('swell') && !game.cutscene);
      await t.wait(.6);
      await say([['sparks', "A plume stays put, deep down, and the plate slides over it. That's why there's a volcano here, and a whole row of islands behind it!"], ...cls.leaving(next)]);
      cls.gather([bus.root.position.x + 1.8, bus.root.position.z - 1, Math.PI/2]);
      await cls.board(bus);
    },
    // up over the sea and away
    async depart(){
      for (const id in cls.n) { cls.n[id].model.root.visible = false; cls.n[id].label.visible = false; }
      t.watch(w, (pos, look) => { pos.set(6, 7, 16); look.copy(bus.root.position); });
      Sound.hiss({dur:3, vol:.1, type:'bandpass', freq:900, q:.6});
      await bus.fly([[BUS[0], ground(...BUS), BUS[1]], [BUS[0] - 2, 3, BUS[1] - 4], [-6, 12, -20], [-30, 26, -60], [-70, 40, -110]], 4.4, {roll:.6});
    },
  };
}

// ---------- far off: the rest of the row of islands, the reef ring at its end, and the next island growing ----------
function buildFar(w){
  const lc = new THREE.Color(), cols = [], pos = [], idx = [];
  // each older island lower and greener, its sides cut into valleys by rain
  const island = ({at:[cx, cz], r, h, age}) => { const R = 22, S = 72, base = pos.length/3;
    for (let j = 0; j <= R; j++) for (let i = 0; i <= S; i++) { const a = i/S*Math.PI*2, d = j/R*1.25, wob = 1 + .08*Math.sin(a*3 + cx) + .05*Math.sin(a*7 + cz);
      const valleys = age*.35*Math.max(0, Math.sin(a*11 + Math.sin(a*3)*2))*(1 - Math.abs(d - .55)/.55)*h, prof = d < 1 ? h*(1 - d*d)**(1.2 - age*.4) : -(d - 1)/.25*18;
      const y = prof - valleys*sm(.1, .4, d)*sm(1, .7, d), x = cx + Math.cos(a)*d*r*wob, z = cz + Math.sin(a)*d*r*wob;
      pos.push(x, y, z);
      // young: dark rock, a little brown; older: green all over but the steepest valley walls; beaches at the water's edge
      const ridge = valleys > .05*h ? 1 : 0;
      lc.set(0x4a3e48).lerp(new THREE.Color(0x8a6a4a), sm(.15, .45, age)*.7).lerp(new THREE.Color(0x5e9a4a), sm(.25, .6, age)*sm(.05, .3, y/h)*(1 - .35*ridge))
        .lerp(new THREE.Color(0x86b85a), age*sm(.4, .9, d)*.5).lerp(new THREE.Color(0xe8d8a8), sm(.06, 0, y/h)*sm(-.6, 0, y)*sm(.3, .6, age))
        .multiplyScalar(.9 + .2*Math.sin(a*11 + d*7));
      if (y < 0) lc.lerp(new THREE.Color(0x2e7a9a), .7).lerp(new THREE.Color(0x1e3a52), sm(1, 1.25, d));
      lc.convertSRGBToLinear(); cols.push(lc.r, lc.g, lc.b); }
    for (let j = 0; j < R; j++) for (let i = 0; i < S; i++) { const p0 = base + j*(S + 1) + i, q = p0 + S + 1; idx.push(p0, p0 + 1, q, p0 + 1, q + 1, q); } };
  CHAIN.forEach(island);
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('color', new THREE.Float32BufferAttribute(cols, 3)); g.setIndex(idx); g.computeVertexNormals();
  meshOf(g, T(0xffffff, {vertexColors:true}), w.scene, .45);
  // surf round each, and the old ones' fringe of reef, turquoise in the shallows
  const flat = (r0, r1, col, op, x, z, y = .04) => { const m = new THREE.Mesh(new THREE.RingGeometry(r0, r1, 64), new THREE.MeshBasicMaterial({color:col, transparent:true, opacity:op, depthWrite:false})); m.rotation.x = -Math.PI/2; m.position.set(x, y, z); w.scene.add(m); return m; };
  for (const {at:[x, z], r, age} of CHAIN) { flat(r*.98, r*1.04, 0xffffff, .8, x, z, .08); if (age > .4) { flat(r*1.04, r*(1.12 + age*.15), 0x6ad8c8, .8, x, z); flat(r*(1.12 + age*.15), r*(1.15 + age*.15), 0xffffff, .7, x, z, .06); } }
  // the atoll: a ring of white sand and palms round a turquoise lagoon, and the sunken volcano a dark shadow below
  const [ax, az] = ATOLL;
  add(new THREE.CircleGeometry(16, 48), new THREE.MeshBasicMaterial({color:0x6ad8c8, transparent:true, opacity:.9, depthWrite:false}), ax, .03, az, w.scene, false).rotation.x = -Math.PI/2;
  const reef = add(new THREE.TorusGeometry(17, 1.6, 6, 48), T(0xf2e6c4), ax, 0, az, w.scene, false); reef.rotation.x = -Math.PI/2; reef.scale.set(1, 1, .35); outline(reef, 1.02);
  flat(18.4, 19.4, 0xffffff, .8, ax, az, .06); flat(19.4, 23, 0x6ad8c8, .6, ax, az);
  const palms = []; for (let k = 0; k < 26; k++) { const a = k/26*Math.PI*2 + Math.sin(k)*.1; if (k % 7 === 3) continue; palms.push([ax + Math.cos(a)*17, .9, az + Math.sin(a)*17, 1.1 + (k % 3)*.2, 1]); }
  leafCloud(w.scene, palms, .25);
  // the seamount: a pale patch of sea where the next volcano is growing up toward the air, and waves break over it
  const [mx, mz] = SEAMOUNT;
  add(new THREE.CircleGeometry(10, 40), new THREE.MeshBasicMaterial({color:0x7ae0d0, transparent:true, opacity:.55, depthWrite:false}), mx, .03, mz, w.scene, false).rotation.x = -Math.PI/2;
  const breakers = [0, 1, 2].map(i => flat(.55, 1, 0xffffff, 0, mx + (i - 1)*2.5, mz + (i % 2)*2, .08));
  w.anims.push((dt, tt) => breakers.forEach((m, i) => { const k = (tt*.18 + i/3) % 1; m.scale.setScalar(1.5 + k*6); m.material.opacity = .9*Math.sin(k*Math.PI)*(1 - k*.5); }));
}

// The time goggles' model, a slice of the Earth on a parchment table: the plume rising, fixed, out of the
// mantle; the plate sliding over it; each time, a new volcano punched up through the plate, which then
// rides away, cools, wears down and sinks, its coral left as a ring at the sea's surface.
function buildChainSlice(w){
  const g = new THREE.Group(); g.position.set(...CUT); w.scene.add(g);
  const basic = o => new THREE.MeshBasicMaterial(Object.assign({fog:false}, o));
  const ink = basic({color:0x1a1320}), L = 36, DZ = 6, D = 12, PX = 7, SEA_H = 1.4;
  const plane = (wd, h, m, x, y, z, rx = 0, parent = g) => { const o = new THREE.Mesh(new THREE.PlaneGeometry(wd, h), m); o.position.set(x, y, z); o.rotation.x = rx; parent.add(o); return o; };
  plane(120, 90, basic({color:0xeed8b6}), 0, -7, -14, -Math.PI/2);
  plane(120, 60, basic({color:0xf2e2c4}), 0, 14, -16);
  // the mantle: a deep orange block, swirled
  const front = tex(512, 128, (c, cw, ch) => { const gr = c.createLinearGradient(0, 0, 0, ch); gr.addColorStop(0, '#e86a2c'); gr.addColorStop(1, '#8a2a20'); c.fillStyle = gr; c.fillRect(0, 0, cw, ch);
    c.strokeStyle = 'rgba(255,200,120,.4)'; c.lineWidth = 5; for (let i = 0; i < 9; i++) { c.beginPath(); c.arc(30 + i*60, 70, 22 + (i % 3)*8, Math.PI*.1, Math.PI*1.3); c.stroke(); } }, 2, 1);
  const mant = new THREE.Mesh(new THREE.BoxGeometry(L, 5.5, DZ), [basic({color:0xa83a24}), basic({color:0xa83a24}), basic({color:0xd8582a}), basic({color:0xa83a24}), basic({map:front}), basic({color:0xa83a24})]);
  mant.position.set(0, -3.6, 0); g.add(mant);
  for (const y of [-.85, -6.35]) plane(L, .06, ink, 0, y, DZ/2 + .01);
  // the plume: a glowing column rising, fixed, with a round head spread out under the plate
  const pt = tex(64, 256, (c, cw, ch) => { const gr = c.createLinearGradient(0, 0, cw, 0); gr.addColorStop(0, 'rgba(255,150,60,0)'); gr.addColorStop(.3, 'rgba(255,190,90,.9)'); gr.addColorStop(.5, 'rgba(255,240,170,1)'); gr.addColorStop(.7, 'rgba(255,190,90,.9)'); gr.addColorStop(1, 'rgba(255,150,60,0)');
    c.fillStyle = gr; c.fillRect(0, 0, cw, ch); c.fillStyle = 'rgba(255,255,220,.6)'; for (let i = 0; i < 8; i++) { c.beginPath(); c.ellipse(cw/2, i*32 + 10, 8, 12, 0, 0, 7); c.fill(); } }, 1, 2);
  const stem = plane(2.2, 5.4, basic({map:pt, transparent:true, depthWrite:false}), PX, -3.6, DZ/2 + .05);
  const head = new THREE.Mesh(new THREE.CircleGeometry(1, 32), basic({color:0xffc060, transparent:true, opacity:.9})); head.scale.set(2.6, .7, 1); head.position.set(PX, -1.2, DZ/2 + .06); g.add(head);
  const headInk = new THREE.Mesh(new THREE.RingGeometry(.94, 1.04, 32), ink); headInk.scale.copy(head.scale); headInk.position.set(PX, -1.2, DZ/2 + .07); g.add(headInk);
  // the plate: crust, with the sea floor on top, sliding to the left; its volcanoes ride along with it
  const crust = tex(256, 32, (c, cw, ch) => { c.fillStyle = '#6a5a52'; c.fillRect(0, 0, cw, ch); c.fillStyle = '#7a6a5e'; c.fillRect(0, 8, cw, 8); c.fillStyle = '#4e4440'; c.fillRect(0, 22, cw, 10); }, 6, 1);
  const plate = new THREE.Group(); g.add(plate);
  const slab = new THREE.Mesh(new THREE.BoxGeometry(L*2.2, .85, DZ), [basic({color:0x5a4a44}), basic({color:0x5a4a44}), basic({color:0x4a4048}), basic({color:0x5a4a44}), basic({map:crust}), basic({color:0x5a4a44})]);
  slab.position.set(L*.5, -.42, 0); plate.add(slab);
  // a gold arrow on the plate, to show which way it goes
  const arrowGeo = new THREE.ShapeGeometry(new THREE.Shape([[-.9, .3], [.2, .3], [.2, .62], [1, 0], [.2, -.62], [.2, -.3], [-.9, -.3]].map(([x, y]) => new THREE.Vector2(x, y))));
  for (const ax of [-10, 2, 14, 26]) { const a = new THREE.Group(); a.position.set(ax, -.42, DZ/2 + .03); a.scale.set(-1.1, .5, 1); plate.add(a);
    a.add(new THREE.Mesh(arrowGeo, basic({color:0xffd36b, side:THREE.DoubleSide}))); const o = new THREE.Mesh(arrowGeo, basic({color:0x1a1320, side:THREE.DoubleSide})); o.scale.setScalar(1.18); o.position.z = -.01; a.add(o); }
  // the magma's path, from the plume's head up through the plate, which stays over the plume as the plate moves
  const pipe = plane(.35, 1.3, basic({color:0xffb040}), PX, -.45, DZ/2 + .08);
  // the sea: see-through blue over the plate
  const sea = new THREE.Mesh(new THREE.BoxGeometry(L, SEA_H, DZ), basic({color:0x3a8ac8, transparent:true, opacity:.25, depthWrite:false})); sea.position.set(0, SEA_H/2, 0); g.add(sea);
  plane(L, .05, basic({color:0xe8f6ff}), 0, SEA_H, DZ/2 + .01);
  // the volcanoes: when each is born, and its pieces
  const black = new THREE.Color(0x2a2430), brown = new THREE.Color(0x6a5040), green = new THREE.Color(0x5e9a4a);
  const isles = [-1.2, -.9, -.6, -.3, -.04, .26, .56, .86].map(b => { const o = new THREE.Group(); o.position.set(PX + b*D, 0, 0); plate.add(o);
    const m = basic({color:0x2a2430}), cone = new THREE.Mesh(new THREE.ConeGeometry(1.5, 1, 20, 1, true), m); cone.position.y = .5; o.add(cone);
    const coneInk = new THREE.Mesh(new THREE.ConeGeometry(1.58, 1.06, 20, 1, true), basic({color:0x1a1320, side:THREE.BackSide})); coneInk.position.y = .5; o.add(coneInk);
    const lava = new THREE.Mesh(new THREE.SphereGeometry(.24, 12, 8), basic({color:0xff7a2a})); o.add(lava);
    const reef = new THREE.Mesh(new THREE.TorusGeometry(.8, .12, 6, 24), basic({color:0xf27a7a})); reef.rotation.x = -Math.PI/2; reef.position.y = SEA_H; o.add(reef);
    return {b, o, cone, coneInk, lava, reef, m}; });
  const label = (text, s, cw0 = 512) => { const tx = tex(cw0, 128, (c, cw, ch) => { c.font = '64px Caprasimo, Georgia, serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.lineWidth = 12; c.strokeStyle = 'rgba(26,19,32,.9)'; c.strokeText(text, cw/2, ch/2); c.fillStyle = '#fff4dc'; c.fillText(text, cw/2, ch/2); });
    tx.wrapS = tx.wrapT = THREE.ClampToEdgeWrapping; const sp = new THREE.Sprite(new THREE.SpriteMaterial({map:tx, transparent:true, depthWrite:false, depthTest:false, fog:false})); sp.scale.set(s*cw0/128, s, 1); g.add(sp); return sp; };
  const plumeL = label('the hot plume stays put', .62, 1024), plateL = label('the plate slides', .62, 768), newL = label('a new volcano!', .9, 768), oldL = label('old', .7, 256), youngL = label('new', .7, 256);
  plumeL.position.set(PX, -4.6, DZ/2 + .4); plateL.position.set(-6, -1.5, DZ/2 + .4); newL.position.set(PX, 4.6, .4); oldL.position.set(-14, 3.6, .4); youngL.position.set(PX - 1, 3.6, .4);
  let born = 0, bornAt = -9;
  const c = new THREE.Color();
  function step(k){
    plate.position.x = -D*k; pipe.position.x = PX;
    let n = 0;
    for (const s of isles) { const dist = (k - s.b)*D, wx = PX + s.b*D - D*k;
      s.o.visible = dist >= 0 && wx > -L/2 + 1.2; if (!s.o.visible) continue; if (s.b >= 0) n++;
      // it grows while the plume feeds it, then wears down and sinks as it rides away
      const grown = ease(clamp01(dist/1.4)), hgt = Math.max(.05, 2.9*grown - .2*Math.max(0, dist - 1.4)), wd = .7 + .4*grown;
      s.cone.scale.set(wd, hgt, wd); s.cone.position.y = hgt/2; s.coneInk.scale.copy(s.cone.scale); s.coneInk.position.y = hgt/2;
      const age = clamp01((dist - 1.4)/12); c.copy(black).lerp(brown, clamp01(age*3)).lerp(green, clamp01(age*2 - .2)); s.m.color.copy(c);
      s.lava.visible = dist < 1.8; s.lava.position.y = hgt - .05;
      s.reef.visible = hgt < SEA_H + .3 && hgt > SEA_H - .9 && dist > 4; }
    if (k === 0) { born = n; bornAt = -9; }
    if (n > born) { born = n; bornAt = game.elapsed; Sound.tone(523, {type:'triangle', dur:.15, vol:.06}); Sound.tone(784, {type:'triangle', t:.1, dur:.25, vol:.06}); }
    const since = game.elapsed - bornAt; newL.material.opacity = clamp01(1.4 - since); newL.scale.set(5.4*(1 + .2*clamp01(1 - since*3)), .9*(1 + .2*clamp01(1 - since*3)), 1);
    stem.material.map.offset.y = -k*6; head.scale.set(2.6 + .1*Math.sin(k*40), .7, 1);
  }
  step(0);
  return {step, shot: (pos, look) => { pos.set(CUT[0] - 1, CUT[1] + 5.4, CUT[2] + 25); look.set(CUT[0] - 1, CUT[1] - .4, CUT[2]); return true; }};
}

// The cutaway under the volcano, for the time goggles: magma from the plume fills a chamber under it, the
// ground swells up like a balloon, the rock cracks, the magma squeezes off into the cracks and the ground
// sinks back, and then it fills again: a volcano breathing. A GPS station on top rides up and down.
function buildSwellSlice(w){
  const g = new THREE.Group(); g.position.set(...CUT2); w.scene.add(g);
  const basic = o => new THREE.MeshBasicMaterial(Object.assign({fog:false}, o));
  const ink = basic({color:0x1a1320}), FZ = 2.6;
  const plane = (wd, h, m, x, y, z, rx = 0) => { const o = new THREE.Mesh(new THREE.PlaneGeometry(wd, h), m); o.position.set(x, y, z); o.rotation.x = rx; g.add(o); return o; };
  plane(120, 90, basic({color:0xeed8b6}), 0, -9, -14, -Math.PI/2);
  plane(120, 60, basic({color:0xf2e2c4}), 0, 14, -16);
  // the rock: banded old flows, drawn on the block's face, with the plume's glow below
  const rockTex = tex(512, 256, (c, cw, ch) => { const cols = ['#5a4a52', '#6a5458', '#4e4248', '#72605e', '#584850'];
    for (let y = 0, i = 0; y < ch; i++) { const bh = 18 + (i*13) % 22; c.fillStyle = cols[i % 5]; c.beginPath(); c.moveTo(0, y); for (let x = 0; x <= cw; x += 16) c.lineTo(x, y + 3*Math.sin(x*.05 + i)); c.lineTo(cw, ch); c.lineTo(0, ch); c.fill(); y += bh; }
    const gr = c.createLinearGradient(0, ch*.7, 0, ch); gr.addColorStop(0, 'rgba(232,106,44,0)'); gr.addColorStop(1, 'rgba(232,106,44,.9)'); c.fillStyle = gr; c.fillRect(0, 0, cw, ch); });
  // the block itself bulges: every layer of rock above the magma is pushed up, most at the top, none at the
  // bottom, so the bands bend into the volcano's hump
  const bg = new THREE.BoxGeometry(26, 8, FZ*2, 90, 10, 1), bp = bg.attributes.position, rest = Float32Array.from(bp.array);
  const block = new THREE.Mesh(bg, [basic({color:0x4e4248}), basic({color:0x4e4248}), basic({color:0x3a3440}), basic({color:0x4e4248}), basic({map:rockTex}), basic({color:0x4e4248})]);
  block.position.set(0, -4, 0); g.add(block);
  const blockInk = new THREE.Mesh(bg, basic({color:0x1a1320, side:THREE.BackSide})); blockInk.scale.set(1.006, 1.012, 1.02); block.add(blockInk);
  const rise = k => { for (let i = 0; i < bp.count; i++) { const x = rest[i*3], y = rest[i*3 + 1]; bp.setY(i, y + (y + 4)/8*(1 + 1.3*k)*Math.exp(-((x/4.8)**2))); } bp.needsUpdate = true; };
  plane(26, .06, ink, 0, -8, FZ + .01);
  // the GPS station, riding on top
  const gps = new THREE.Group(); g.add(gps);
  for (const sx of [-.3, .3]) { const l = new THREE.Mesh(new THREE.CylinderGeometry(.04, .04, 1, 5), basic({color:0x8a8a96})); l.position.set(sx, .5, 0); l.rotation.z = -sx*.4; gps.add(l); }
  const dish = new THREE.Mesh(new THREE.SphereGeometry(.3, 12, 6, 0, Math.PI*2, 0, Math.PI/2), basic({color:0xf2ece0})); dish.position.y = 1; gps.add(dish);
  // the magma chamber under it, drawn on the cut face, and the plume feeding it from below
  const glowM = basic({color:0xff6a1a}), chamber = new THREE.Mesh(new THREE.CircleGeometry(1, 40), glowM); chamber.position.set(0, -3.6, FZ + .03); g.add(chamber);
  const chamberInk = new THREE.Mesh(new THREE.RingGeometry(.92, 1.06, 40), ink); chamberInk.position.set(0, -3.6, FZ + .04); g.add(chamberInk);
  const feed = plane(.9, 3.6, basic({color:0xff8a2a}), 0, -6.2, FZ + .02);
  // cracks in the rock above the chamber, and fingers of magma squeezing off sideways into them
  const zig = (pts, wd, m, z) => { const o = new THREE.Group(); o.position.z = z; g.add(o);
    for (let i = 0; i < pts.length - 1; i++) { const [x0, y0] = pts[i], [x1, y1] = pts[i + 1], l = Math.hypot(x1 - x0, y1 - y0), s = new THREE.Mesh(new THREE.PlaneGeometry(l + wd, wd), m);
      s.position.set((x0 + x1)/2, (y0 + y1)/2, 0); s.rotation.z = Math.atan2(y1 - y0, x1 - x0); o.add(s); } return o; };
  const cracks = [[[-.6, -2.6], [-1.3, -1.9], [-1.1, -1.2], [-1.9, -.4]], [[.7, -2.7], [1.5, -2.2], [1.4, -1.4], [2.4, -.8], [2.6, -.2]], [[0, -2.4], [.3, -1.6], [-.2, -.9]]].map(p => zig(p, .09, ink, FZ + .05));
  const sills = [[[-.9, -3.8], [-2.6, -3.5], [-4.2, -3.9], [-5.6, -3.6]], [[.9, -3.7], [2.6, -4.1], [4.4, -3.8], [6, -4.2]]].map(p => zig(p, .26, glowM, FZ + .035));
  const label = (text, s, cw0 = 512) => { const tx = tex(cw0, 128, (c, cw, ch) => { c.font = '64px Caprasimo, Georgia, serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.lineWidth = 12; c.strokeStyle = 'rgba(26,19,32,.9)'; c.strokeText(text, cw/2, ch/2); c.fillStyle = '#fff4dc'; c.fillText(text, cw/2, ch/2); });
    tx.wrapS = tx.wrapT = THREE.ClampToEdgeWrapping; const sp = new THREE.Sprite(new THREE.SpriteMaterial({map:tx, transparent:true, depthWrite:false, depthTest:false, fog:false})); sp.scale.set(s*cw0/128, s, 1); g.add(sp); return sp; };
  const magmaL = label('magma', .8), crackL = label('CRACK!', 1.3), upL = label('puffs up', 1), downL = label('sinks back', 1);
  magmaL.position.set(-3.4, -5.4, FZ + .4); crackL.position.set(0, 1.3, FZ + .4); upL.position.set(6.4, 2.4, .4); downL.position.set(6.4, 2.4, .4);
  const CRACKS = [.3, .36, .42];
  let snapped = 0, crackAt = -9;
  function step(k){
    // fill and swell; crack, crack, crack; squeeze off sideways and sink back; then slowly fill again
    const swellK = k < .45 ? ease(k/.45) : k < .62 ? 1 - .75*ease((k - .45)/.17) : .25 + .45*ease((k - .62)/.38);
    rise(swellK); gps.position.y = 1 + 1.3*swellK;
    chamber.scale.set(1.6 + swellK*1.2, .8 + swellK*.6, 1); chamberInk.scale.copy(chamber.scale);
    const n = CRACKS.filter(c => k >= c).length;
    if (k === 0) snapped = 0;
    if (n > snapped) { snapped = n; crackAt = game.elapsed; game.camShake = 2.2; Sound.tone(70, {dur:.4, vol:.14, f2:40}); Sound.hiss({dur:.3, vol:.1, type:'highpass', freq:1800}); }
    cracks.forEach((c, i) => { c.visible = n > i; });
    const sq = clamp01((k - .45)/.17); sills.forEach(s => { s.visible = sq > 0; s.scale.set(sq, 1, 1); });
    const since = game.elapsed - crackAt; crackL.material.opacity = clamp01(1.2 - since);
    upL.material.opacity = k < .45 || k > .7 ? 1 : 0; downL.material.opacity = k > .47 && k < .62 ? 1 : 0;
  }
  step(0);
  return {step, shot: (pos, look) => { pos.set(CUT2[0], CUT2[1] + 1.5, CUT2[2] + 25); look.set(CUT2[0], CUT2[1] - 1.8, CUT2[2]); return true; }};
}

// ---------- things to look closer at, for anyone who goes exploring ----------
// Each opens its own idea of this island: green sand, two kinds of lava, a lava tube, how life gets
// here at all, the next island growing, and the reef ring the oldest left behind. Solid things go in `solid`.
function buildFinds(w, t, solid){
  const life = [];
  // ---------- the green sand cove, at the foot of the old cone ----------
  const cy = ground(COVE[0], COVE[1] + 1.2), greenGlint = puffs(w, COVE[0], cy + .2, COVE[1] + 1.2, {rate:0, rise:.5, size:.3, color:0x9ad86a, opacity:.9, spread:.8, life:1.2});
  inWorld(w, () => { for (let i = 0; i < 40; i++) { const a = fr(0, 6.28), r = fr(0, 2.6), x = COVE[0] + Math.cos(a)*r, z = COVE[1] + 1.4 + Math.sin(a)*r*.7;
    if (ground(x, z) < SEA) continue; bAdd([0x9ac050, 0x6a9a3a, 0xc8d880][i % 3], new THREE.OctahedronGeometry(fr(.03, .06), 0), XF(x, ground(x, z) + .02, z), {}); } bFlush(w.scene); });
  curio(w, t, {name:'Green sand', verb:'Scoop the sand', at:[COVE[0], COVE[1] + 1.2], y:cy + .6, lift:.1, view:[.5, 1],
    lines:[['juniper', "This sand is GREEN! Green like a pickle!"],
      ['sparks', "Look close, {name}: the grains are tiny green crystals, called olivine. They came out of the rock of this old cone."],
      ['sparks', "Olivine is heavier than the other bits. So when the waves wash the light stuff away, the green stays behind."],
      ['sparks', "There's a real green sand beach in Hawaiʻi, called Papakōlea. Only a few beaches in the whole world are green!"],
      ['juniper', "Olivine? That's what the mantle is mostly made of!"]],
    from:[COVE[0] + 1.2, COVE[1] + 3.2], act: () => { greenGlint.burst = .5; Sound.hiss({dur:.5, vol:.06, type:'highpass', freq:3000}); }});

  // ---------- smooth ropy pāhoehoe, right up against the rough ʻaʻā ----------
  const [rx, rz] = ROPES, ry = ground(rx, rz);
  inWorld(w, () => {
    const coils = []; for (let k = 0; k < 7; k++) { const g = new THREE.TorusGeometry(.45 + k*.13, .06, 5, 20, Math.PI*.9); coils.push([g, XF(rx - .9, ry + .02, rz + k*.1 - .3, 1, 1, .6, -Math.PI/2, 0, Math.PI*.55)]); }
    meshOf(mergeGeos(coils), 0x3a3648, w.scene, .012);
    for (let k = 0; k < 12; k++) { const s = fr(.18, .38); bAdd([0x2a2228, 0x4a3430][k % 2], new THREE.DodecahedronGeometry(s, 0), XF(rx + .7 + fr(0, 1), ry + s*.3, rz + fr(-1, 1), 1.1, .9, 1, fr(0, 3), fr(0, 3), fr(0, 3)), {ink:.02}); }
    bFlush(w.scene); });
  curio(w, t, {name:'Ropy lava', verb:'Step on both', at:[rx, rz], y:ry + .5, lift:.1, view:[-.3, 1],
    lines:[['sparks', "Squish, crunch! Two kinds of lava, side by side. Their names are Hawaiian words, and scientists all over the world use them."],
      ['sparks', "This smooth, ropy kind is called pāhoehoe. It flowed hot and runny, and its skin wrinkled up like the skin on hot cocoa."],
      ['sparks', "That rough, crunchy heap is called ʻaʻā. It flowed thicker and cooler, and tore itself into sharp chunks as it went."],
      ['basil', "ʻAʻā! That's what I'd shout if I walked on it in bare feet."]],
    from:[rx - 1.3, rz + 1.3], act: async () => { for (let i = 0; i < 4; i++) { if (i < 2) Sound.step('stone'); else Sound.hiss({dur:.15, vol:.08, type:'bandpass', freq:1400}); await t.wait(.35); } }});

  // ---------- a lava tube: a cave mouth in the side of an old hummock ----------
  const mouth = [TUBE[0], TUBE[1] + 1.9];
  inWorld(w, () => {
    const my = ground(...mouth) - .1, arch = grp(mouth[0], my, mouth[1], 0); arch.rotation.x = -.2;
    add(new THREE.CircleGeometry(1, 24, 0, Math.PI), new THREE.MeshBasicMaterial({color:0x140e18, side:THREE.DoubleSide}), 0, .02, .12, arch, false).scale.set(1.22, 1.02, 1);
    outline(add(new THREE.TorusGeometry(1.25, .22, 6, 18, Math.PI), T(0x3a3440), 0, -.05, .05, arch), 1.06).scale.set(1.08, 1, 1);
    for (let k = 0; k < 5; k++) add(new THREE.CylinderGeometry(.015, .005, fr(.3, .7), 4), T(0x6a8a4a), -.8 + k*.4, .8, .15, arch, false);
    for (const [dx, s] of [[-1.8, .5], [1.7, .45], [-1.4, .3], [1.3, .35]]) bAdd(0x3a3440, new THREE.DodecahedronGeometry(s, 0), XF(mouth[0] + dx, my + s*.2, mouth[1] + .3, 1.2, .8, 1, 0, dx, 0), {ink:.03, shadow:true});
    bFlush(w.scene); });
  solid.push([TUBE[0], TUBE[1], 1.6]);
  const lamp = new THREE.Sprite(new THREE.SpriteMaterial({map:glowTex, color:0xffd890, transparent:true, depthWrite:false, blending:THREE.AdditiveBlending, opacity:0}));
  lamp.position.set(mouth[0], ground(...mouth) + .5, mouth[1] - .3); lamp.scale.setScalar(2.4); w.scene.add(lamp);
  curio(w, t, {name:'Lava tube', verb:'Shine a light in', at:mouth, y:ground(...mouth) + .9, lift:.4, view:[.3, 1],
    lines:[['pip', "A cave! Whoa, it goes back and back and back!"],
      ['sparks', "It's a lava tube. Lava flowed through here like water through a pipe."],
      ['sparks', "The top cooled into a hard roof, and the hot lava kept running underneath it. When the eruption stopped, the lava drained out and left a long tunnel."],
      ['sparks', "The roof keeps the lava hot inside, so it can flow for kilometers and kilometers before it cools."],
      ['pip', "Can we go in? Pretty please?"],
      ['sparks', "Not today! But in Hawaiʻi, people walk right through a big one, called Nāhuku."]],
    from:[mouth[0] + 1.6, mouth[1] + 1.1], act: async () => { await t.tween(1.2, k => { lamp.material.opacity = k*.8; }); await t.until(() => !game.cutscene); lamp.material.opacity = 0; }});

  // ---------- red lehua flowers on an ʻōhiʻa, and the red bird that sips from them ----------
  const [lx, lz] = LEHUA, lly = ground(lx, lz);
  const bird = grp(lx + .6, lly + 1.7, lz + .5, 0, w.scene);
  { const red = T(0xd8303a), b = sph(.12, red, 0, 0, 0, bird, 10); b.scale.set(.85, .8, 1.4); outline(b, 1.12); sph(.08, red, 0, .07, .14, bird, 8);
    add(new THREE.ConeGeometry(.02, .12, 5), T(0x1a1320), 0, .06, .26, bird, false).rotation.x = 1.7; add(new THREE.BoxGeometry(.14, .02, .2), T(0x1a1320), 0, .02, -.18, bird, false); }
  let hop = 0;
  life.push((dt, tt) => { hop = Math.max(0, hop - dt); const a = tt*.6;
    bird.position.set(lx + .6 + Math.sin(a)*.3 + (hop > 0 ? Math.sin(hop*6)*1.2 : 0), lly + 1.7 + Math.abs(Math.sin(tt*3))*.06 + (hop > 0 ? Math.sin(hop*Math.PI/2.5)*.9 : 0), lz + .5 + Math.cos(a)*.2); bird.rotation.y = a + Math.PI/2; });
  curio(w, t, {name:'Red flowers', verb:'Look closer', at:[lx + .4, lz + .2], y:lly + 1.5, lift:.8, view:[.2, -1],
    lines:[['juniper', "Fuzzy red flowers, like little pom-poms! And a red bird!"],
      ['sparks', "This is an ʻōhiʻa tree, and its flowers are called lehua. That bird is an ʻapapane. It sips the sweet nectar inside."],
      ['sparks', "But think about it, {name}: this island rose up out of the sea, thousands of kilometers from anywhere. So how did any plants get here?"],
      ['sparks', "By wind, wings and waves! Tiny ʻōhiʻa seeds ride the wind. Birds carry seeds stuck to their feathers. Some seeds float in on the sea."],
      ['sparks', "Then they changed, over a very long time, into plants and birds that live nowhere else on Earth."],
      ['mo', "Seeds that fly, ride and swim. Like a field trip!"]],
    from:[lx + .6, lz - 1.6], act: () => { hop = 2.5; [0, .15, .3].forEach(d => Sound.tone(2200 + d*900, {type:'sine', t:d, dur:.08, vol:.04, f2:2800})); }});

  // ---------- out on the rock in the shallows: waves breaking far off, over the next island ----------
  const [sx, sz] = SURF_ROCK;
  curio(w, t, {name:'Waves breaking', verb:'Watch the waves', at:[sx + .5, sz - .3], y:ground(sx + .5, sz - .3) + 1.4, lift:.6, view:[-.6, .8],
    lines:[['sparks', "See the waves breaking way out there, where there's no island at all?"],
      ['sparks', "There's a volcano under there, growing up from the sea floor! Its top is only just under the water."],
      ['sparks', "It sits on the plume too. It's the next island in the row, still being born."],
      ['sparks', "In Hawaiʻi there's a real one, called Kamaʻehu. It's still deep, about a kilometer down. It could take tens of thousands of years to reach the air."],
      ['pip', "A baby island! Can I name it?"]],
    from:[sx - .6, sz + .8], act: async () => { await t.wait(1.4); const gy = ground(sx, sz);
      t.cut((pos, look) => { pos.set(sx - 1, gy + 3, sz + 3); look.set(SEAMOUNT[0], -2, SEAMOUNT[1]); }); }});

  // ---------- up on the old cone's rim: far along the row, the ring the oldest island left ----------
  const ry2 = ground(...RIM);
  curio(w, t, {name:'Ring in the sea', verb:'Look far away', at:RIM, y:ry2 + 1.4, lift:.6, view:[1, .4],
    lines:[['sparks', "See the very last one, far away? It isn't an island anymore. It's just a ring of coral reef, with a lagoon inside."],
      ['sparks', "Long ago, it was a tall volcano like ours. The plate carried it off the plume, and it cooled, wore down, and sank."],
      ['sparks', "Coral grows in warm, sunny water near the top of the sea. So as the island sank, the coral kept building up, and up, and the reef was left as a ring."],
      ['sparks', "A scientist named Charles Darwin figured that out, almost two hundred years ago."],
      ['mo', "A volcano that turned into a donut!"]],
    from:[RIM[0] + 1.2, RIM[1] + 1.4], act: async () => { await t.wait(1.2); const fog = w.scene.fog, haze = [fog.near, fog.far]; fog.near = 400; fog.far = 1800;
      t.cut((pos, look) => { pos.set(RIM[0] + 4, ry2 + 4, RIM[1] + 2); look.set(ATOLL[0], 0, ATOLL[1]); });
      await t.until(() => !game.cutscene); [fog.near, fog.far] = haze; }});

  // ---------- samples for the microscope at home ----------
  // the farthest tide pool, toward the cove: a spiny urchin and a pink crust of algae on the rocks in it, and
  // tiny swimmers in its water; and down the shore toward the steam, glassy flakes the lava blew where it meets the sea
  const [tpx, tpz, tpr, tpy] = POOLW[2], LIMU = [10.4, -12.2];
  const urchinG = grp(tpx + .15, tpy - .08, tpz - .1, 0, w.scene); outline(sph(.13, T(0x5a2a5a), 0, 0, 0, urchinG, 10), 1.1);
  for (let k = 0; k < 14; k++) { const a = k*2.4, e = .3 + (k % 4)*.3, sp = add(new THREE.ConeGeometry(.012, .22, 4), T(0x4a2048), Math.cos(a)*Math.cos(e)*.13, Math.sin(e)*.13, Math.sin(a)*Math.cos(e)*.13, urchinG, false);
    sp.lookAt(urchinG.position.x + Math.cos(a)*Math.cos(e)*9, urchinG.position.y + Math.sin(e)*9, urchinG.position.z + Math.sin(a)*Math.cos(e)*9); sp.rotateX(Math.PI/2); }
  meshOf(mergeGeos([[-.3, .2, .16], [-.15, .35, .12], [.3, -.25, .14]].map(([dx, dz, r]) => [new THREE.SphereGeometry(r, 8, 5), XF(tpx + dx, tpy - .06, tpz + dz, 1, .35, 1)])), 0xe87a98, w.scene, .01);
  meshOf(mergeGeos([[0, 0, .14, .5], [.22, .12, .1, 2], [-.18, .1, .09, 4], [.1, -.2, .08, 1]].map(([dx, dz, r, a]) => [new THREE.CircleGeometry(r, 6).rotateX(-Math.PI/2), XF(LIMU[0] + dx, ground(LIMU[0] + dx, LIMU[1] + dz) + .02, LIMU[1] + dz, 1, 1, .6, 0, a, 0)])), 0xb8b070, w.scene, .008);
  sample(w, t, {ids:['urchin', 'copepod', 'coralline'], at:[tpx, tpz], y:tpy + .5, from:[tpx - tpr - .5, tpz - .2], verb:'Dip a jar in the tide pool'});
  sample(w, t, {ids:['limu'], at:LIMU, y:ground(...LIMU) + .5, verb:'Pick up the glassy flakes'});

  // ---------- life about the shore: a green sea turtle dozing on the black sand, terns and a frigatebird overhead ----------
  const honu = grp(-7.2, ground(-7.2, -10.4) + .05, -10.4, 2.6, w.scene);
  { const shellTex = tex(128, 128, (c, cw, ch) => { c.fillStyle = '#6a7a4a'; c.fillRect(0, 0, cw, ch); c.strokeStyle = '#3a4a2a'; c.lineWidth = 5;
      for (const [x, y] of [[64, 64], [30, 40], [98, 40], [30, 90], [98, 90]]) { c.beginPath(); for (let k = 0; k < 6; k++) { const a = k/6*Math.PI*2; c.lineTo(x + Math.cos(a)*22, y + Math.sin(a)*22); } c.closePath(); c.stroke(); } });
    const shell = add(new THREE.SphereGeometry(.5, 16, 8, 0, Math.PI*2, 0, Math.PI/2), T(0xffffff, {map:shellTex}), 0, 0, 0, honu); shell.scale.set(1, .5, 1.25); outline(shell, 1.06);
    const skin = T(0x8a8a6a), head = sph(.14, skin, 0, .08, .72, honu, 10); head.scale.set(1, .85, 1.3); outline(head, 1.1);
    for (const [x, z, r] of [[.45, .35, .5], [-.45, .35, -.5], [.3, -.5, .3], [-.3, -.5, -.3]]) { const f = add(new THREE.SphereGeometry(.16, 8, 5), skin, x, .03, z, honu, false); f.scale.set(1.6, .25, .7); f.rotation.y = r; }
    life.push((dt, tt) => { head.position.z = .72 + Math.max(0, Math.sin(tt*.35))*.08; }); }
  solid.push([-7.2, -10.4, .7]);
  life.push(soarer(w.scene, -10, 22, -20, 18, {s:2.4, body:0x2a2228, belly:0x2a2228, tail:0x2a2228, sp:.08}).tick);
  life.push(flock(w.scene, -4, 3.4, -16, 5, {r:8, body:0xf6f2ec, belly:0xffffff}).tick);
  w.anims.push((dt, tt) => life.forEach(f => f(dt, tt)));
}
