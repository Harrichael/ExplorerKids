// The mantle: a ledge in a vast cave deep under the crust, kept cool inside the bus's heat bubble.
// Kids picture the mantle as an ocean of lava, so everything here is solid: dull, chunky, warm rock
// that barely glows. Across the chasm, a cliff shows the mantle cut open, two great loops of rock
// with the crust's plates riding on top. Through the time goggles the loops turn: hot rock rises,
// cools and sinks, and the plates on top are dragged apart.

import * as THREE from 'three';
import { T, XF, add, bAdd, bFlush, clamp01, ease, fr, glowTex, mergeGeos, meshOf, outline, sph, tex } from '../../core/kit.js';
import { Sound } from '../../core/sound.js';
import { inWorld } from '../../core/world.js';
import { player } from '../../player.js';
import { save } from '../../save.js';
import { game } from '../../state.js';
import { tripBus } from '../bus.js';
import { classmates } from '../class.js';
import { goggles } from '../goggles.js';
import { curio, puffs, sample, tripWorld } from '../stop-kit.js';
import { wonders } from './wonders.js';

// the ledge is the floor of the heat bubble, an ellipse BX by BZ round z = BC, DH tall; the cliff stands
// across the chasm to the north, and the ledge's lip wanders along EDGE
const BX = 18, BZ = 8.5, BC = 4.5, DH = 8, CLIFF = -20, EDGE = -3.4, BACK = 19;
const BUS = [-11, 7], ROOF = 20;
const ROCK = [-4, 2.5], PUTTY = [5, 3.5];
// the floor isn't flat: on the west it sags into a lower shelf that opens onto the chasm, the best seat for
// the plume; at the back, east, a knoll of rock heaves up, [x, z, radius, height]
const SHELF = [-8, -1.4, 5.4, 4.4, 1.2], KNOLL = [8.5, 9.5, 4.5, 1.5];
// things to find round the ledge's ends, along its back, down on the shelf and up on the knoll, away from where the class stands
const OLIV = [8.5, 9.4], DIAM = [-15, 3], ECHO = [-8.5, -2.6], POKE = [-4, 12.7], CRACK = [13, .5];
const FINDS = [OLIV, DIAM, ECHO, POKE, CRACK];
// far off in the chasm's west end, a plume: a thin column of extra-hot rock rising from much deeper down
const PLUME = [-15, CLIFF + 1.5];
// the cliff's painting: 48 x 25.4 world units drawn on a 1024 x 512 canvas
const CW = 1024, CH = 512, WW = 48, WH = 25.4;
const MID = (CLIFF + EDGE)/2;
const sm = (a, b, v) => { const k = clamp01((v - a)/(b - a)); return k*k*(3 - 2*k); };
const edgeZ = x => EDGE + .5*Math.sin(x*.37 + 1) + .3*Math.sin(x*.9);
const inBubble = (x, z) => (x/BX)**2 + ((z - BC)/BZ)**2;
// a slow roll underfoot, kept off the bubble's rim so its glowing edge lies on the floor, and off the
// spots where the class sets things down
function floorY(x, z){
  const [sx, sz, srx, srz, sd] = SHELF, [kx, kz, kr, kh] = KNOLL, k = Math.hypot(x - kx, z - kz)/kr;
  let roll = .18*Math.sin(x*.35 + .5)*Math.cos(z*.4 - .3) + .08*Math.sin(x*.9 - z*.7);
  for (const [fx, fz, f0] of [[...BUS, 3.4], [...ROCK, 2], [...PUTTY, 1.6]]) roll *= sm(f0, f0 + 1.5, Math.hypot(x - fx, z - fz));
  return roll*sm(1, .75, inBubble(x, z)) - sd*(1 - sm(.3, 1, Math.hypot((x - sx)/srx, (z - sz)/srz))) + (k < 1 ? kh*(.5 + .5*Math.cos(k*Math.PI)) : 0);
}
const G = ([x, z]) => floorY(x, z);
// the two loops of rock, side by side, rising together up the middle and sinking at the outer edges
const CELLS = [{cx:370, dir:1}, {cx:654, dir:-1}], RX = 150, RY = 170, CY = 300;

export function buildMantle(t){
  const w = tripWorld({title:'The Mantle', bg:0x2a1630, sky:0xffb090, groundCol:0x3a1a34, hemi:.7, sunCol:0xff9a6a, sunI:.55, fogNear:36, fogFar:100,
    cam:{oy:7.4, oz:9.2, oyP:9.4, ozP:10.6}});
  const inside = (x, z) => inBubble(x, z) < 1;
  w.ground = floorY;
  w.bounds = (x, z) => inside(x, z) && z > edgeZ(x) + .6;
  w.surface = () => 'stone';
  const onShelf = (x, z) => floorY(x, z) < -.7 && Math.hypot(x - SHELF[0], z - SHELF[1]) < 6;
  w.area = (x, z) => onShelf(x, z) ? 'The Low Shelf' : z < edgeZ(x) + 3 ? 'The Chasm Edge' : 'The Mantle';
  // down on the shelf the camera drops low and looks out level across the chasm, so the plume stands up
  // tall beyond the explorer and the drop falls away in front
  w.camAt = (x, z, oy, oz) => {
    const k = sm(-.3, -.9, floorY(x, z))*sm(7, 5, Math.hypot(x - SHELF[0], z - SHELF[1])); if (k < .01) return null;
    return [2.8*k, oy + (2.8 - oy)*k, oz + (6 - oz)*k];
  };
  w.spawn = [BUS[0] + 1.6, BUS[1] - 1.8, Math.PI];
  const S = {phase:0, apart:0};
  let wallCtx, wallTex, dome, ring, current, putty, flash, plumeStem, plumeHead;
  const chunks = [];
  for (const c of CELLS) for (let i = 0; i < 44; i++) chunks.push({c, a:Math.random()*Math.PI*2, r:.35 + Math.random()*.65, s:9 + Math.random()*8,
    shape:Array.from({length:6}, () => .7 + Math.random()*.4)});
  inWorld(w, () => {
    const rock = tex(512, 512, (c, cw, ch) => { c.fillStyle = '#4a2420'; c.fillRect(0, 0, cw, ch);
      for (let i = 0; i < 16; i++) { const x = Math.random()*cw, y = Math.random()*ch, r = 40 + Math.random()*70; c.fillStyle = i % 3 ? '#421f1c' : '#5a2c24';
        for (const dx of [-cw, 0, cw]) for (const dy of [-ch, 0, ch]) { c.beginPath(); c.ellipse(x + dx, y + dy, r, r*.7, i, 0, 7); c.fill(); } }
      c.strokeStyle = 'rgba(255,120,70,.16)'; c.lineWidth = 2; for (let i = 0; i < 18; i++) { c.beginPath(); let x = Math.random()*cw, y = Math.random()*ch; c.moveTo(x, y); for (let k = 0; k < 4; k++) { x += (Math.random() - .5)*70; y += (Math.random() - .5)*70; c.lineTo(x, y); } c.stroke(); } }, 1, 1);
    const ledgeM = T(0xffffff, {map:rock, emissive:0x2a0a06, emissiveIntensity:.5});
    // the ledge: its floor follows the ground, and at the chasm its lip rolls over into a face falling away
    const lpos = [], luv = [], lidx = [], NX = 96, NZ = 44;
    for (let j = 0; j <= NZ + 1; j++) for (let i = 0; i <= NX; i++) { const x = -24 + i*48/NX, e = edgeZ(x);
      const [z, y] = j === 0 ? [e + .35, -8] : j === 1 ? [e + .05, floorY(x, e) - .35] : [e + (j - 2)/NZ*(BACK - e), floorY(x, e + (j - 2)/NZ*(BACK - e))];
      lpos.push(x, y, z); luv.push(x/6, j < 2 ? y/6 : z/6); }
    for (let j = 0; j <= NZ; j++) for (let i = 0; i < NX; i++) { const p = j*(NX + 1) + i, q = p + NX + 1; lidx.push(p, q, p + 1, p + 1, q, q + 1); }
    const lg = new THREE.BufferGeometry(); lg.setAttribute('position', new THREE.Float32BufferAttribute(lpos, 3)); lg.setAttribute('uv', new THREE.Float32BufferAttribute(luv, 2));
    lg.setIndex(lidx); lg.computeVertexNormals();
    meshOf(lg, ledgeM, w.scene, .05);
    // the chasm's far floor, deep and dim, and the cave's walls and roof closing it all in
    const pit = add(new THREE.PlaneGeometry(90, 40), T(0x3a1410, {emissive:0x5a1a0a, emissiveIntensity:.6}), 0, -16, CLIFF + 10, null, false); pit.rotation.x = -Math.PI/2;
    // the cave itself is cool violet-plum, so the warm ledge, the column and the rock loops stand out against it
    // set back where the plume rises in front of them
    for (let i = 0; i < 46; i++) { const side = i % 2 ? 1 : -1, z = CLIFF + (i >> 1)*1.8, s = 3 + Math.random()*3.5, back = side < 0 && i >> 1 < 5 ? 4 : 0;
      bAdd([0x4a2a48, 0x3a2040, 0x5a3456][i % 3], new THREE.SphereGeometry(s, 9, 7), XF(side*(22 + back + Math.random()*3), -2 + Math.random()*13, z, fr(.9, 1.2), fr(.7, 1), fr(.9, 1.2), fr(0, 3), fr(0, 3), 0), {ink:.09, shadow:true}); }
    // the back wall bends round behind the bubble, low enough that the camera looks over it
    for (let i = 0; i < 15; i++) { const s = 2.5 + Math.random()*2.5, a = (i/14 - .5)*2.3, x = Math.sin(a)*22, z = BC + Math.cos(a)*13.5 + Math.random()*1.5;
      bAdd(0x40243e, new THREE.SphereGeometry(s, 9, 7), XF(x, -1, z, 1.1, .75, 1, 0, fr(0, 3), 0), {ink:.08, shadow:true}); }
    const roof = add(new THREE.PlaneGeometry(100, 70), T(0x26142e, {side:THREE.BackSide}), 0, ROOF, -1, null, false); roof.rotation.x = -Math.PI/2;
    for (let i = 0; i < 40; i++) { const h = 1.5 + Math.random()*3.5; bAdd(0x3a2040, new THREE.ConeGeometry(.6 + Math.random()*.7, h, 7), XF(-24 + Math.random()*48, ROOF - h/2, -18 + Math.random()*34, 1, 1, 1, Math.PI, 0, 0), {ink:.05}); }
    // boulders on the ledge, chunky and solid, away from where the class stands
    for (let i = 0; i < 70; i++) { const x = -17 + Math.random()*34, z = EDGE + .8 + Math.random()*16;
      if (!inside(x, z) || z < edgeZ(x) + .9 || Math.hypot(x - BUS[0], z - BUS[1]) < 4.5 || Math.hypot(x - PUTTY[0], z - PUTTY[1]) < 2 || Math.hypot(x - ROCK[0], z - ROCK[1]) < 2.4 || Math.abs(x) < 2.5 && z < 3 || FINDS.some(([fx, fz]) => Math.hypot(x - fx, z - fz) < 2.4)) continue;
      const r0 = .25 + Math.random()*.45; bAdd([0x5a2c24, 0x4a2420, 0x6a3428][i % 3], new THREE.SphereGeometry(r0, 8, 6), XF(x, floorY(x, z) + r0*.3, z, fr(1, 1.3), .65, fr(.9, 1.2), 0, fr(0, 6), 0), {ink:.035, shadow:true}); }
    bFlush(w.scene);
    // Basil's rock to tap, and Juniper's flat warm stone with her putty on it
    const big = add(new THREE.SphereGeometry(1.1, 10, 7), T(0x5a2c24, {emissive:0x2a0a06, emissiveIntensity:.5}), ROCK[0], G(ROCK) + .6, ROCK[1]); big.scale.set(1.2, .8, 1); outline(big, 1.03);
    outline(add(new THREE.CylinderGeometry(.75, .85, .3, 10), T(0x6a3428, {emissive:0x3a0e06, emissiveIntensity:.5}), PUTTY[0], G(PUTTY) + .15, PUTTY[1]), 1.04);
    putty = sph(.2, T(0x5ab8d0), PUTTY[0], G(PUTTY) + .5, PUTTY[1], null, 14); outline(putty, 1.06);
    // the cliff across the chasm: the mantle cut open, painted fresh each frame
    const wc = document.createElement('canvas'); wc.width = CW; wc.height = CH; wallCtx = wc.getContext('2d');
    wallTex = new THREE.CanvasTexture(wc); wallTex.encoding = THREE.sRGBEncoding; wallTex.anisotropy = 4;
    add(new THREE.PlaneGeometry(WW, WH), new THREE.MeshBasicMaterial({map:wallTex}), 0, 1.5, CLIFF, null, false);
    add(new THREE.BoxGeometry(WW + 1.4, WH + 1.4, .6), T(0x2a1830), 0, 1.5, CLIFF - .35, null, false);
    // the rising current the bus rides away on, a slow shimmer up the middle of the chasm
    const ct = tex(64, 256, (c, cw, ch) => { const g = c.createLinearGradient(0, 0, cw, 0); g.addColorStop(0, 'rgba(255,150,80,0)'); g.addColorStop(.5, 'rgba(255,170,90,.55)'); g.addColorStop(1, 'rgba(255,150,80,0)'); c.fillStyle = g; c.fillRect(0, 0, cw, ch);
      c.fillStyle = 'rgba(255,220,160,.35)'; for (let i = 0; i < 30; i++) c.fillRect(10 + Math.random()*44, Math.random()*ch, 3, 10 + Math.random()*20); }, 1, 2);
    current = add(new THREE.CylinderGeometry(2.8, 3.2, 44, 16, 1, true), new THREE.MeshBasicMaterial({map:ct, transparent:true, opacity:.4, depthWrite:false, side:THREE.DoubleSide, blending:THREE.AdditiveBlending}), 0, 2, MID, null, false);
    // the plume: a thin hot stem, brighter than anything else down here, with a round head pushing slowly up it
    const pt = tex(64, 256, (c, cw, ch) => { const g = c.createLinearGradient(0, 0, cw, 0); g.addColorStop(0, 'rgba(255,200,90,0)'); g.addColorStop(.5, 'rgba(255,236,160,.95)'); g.addColorStop(1, 'rgba(255,200,90,0)'); c.fillStyle = g; c.fillRect(0, 0, cw, ch);
      c.fillStyle = 'rgba(255,255,220,.5)'; for (let i = 0; i < 24; i++) c.fillRect(22 + Math.random()*20, Math.random()*ch, 3, 12 + Math.random()*24); }, 1, 3);
    plumeStem = add(new THREE.CylinderGeometry(.5, 1, 40, 12, 1, true), new THREE.MeshBasicMaterial({map:pt, transparent:true, opacity:.5, depthWrite:false, side:THREE.DoubleSide, blending:THREE.AdditiveBlending}), PLUME[0], 2, PLUME[1], null, false);
    plumeHead = sph(1, new THREE.MeshBasicMaterial({color:0xffb050, transparent:true, opacity:.6, depthWrite:false, blending:THREE.AdditiveBlending}), PLUME[0], 0, PLUME[1], null, 16, false);
  });
  const plumeGlow = new THREE.Sprite(new THREE.SpriteMaterial({map:glowTex, color:0xffc060, transparent:true, depthWrite:false, blending:THREE.AdditiveBlending, opacity:.8}));
  plumeGlow.scale.setScalar(7.5); w.scene.add(plumeGlow);
  // the heat bubble, grown from the bus's own to cover the ledge, and its glowing edge on the floor
  dome = new THREE.Mesh(new THREE.SphereGeometry(1, 40, 20, 0, Math.PI*2, 0, Math.PI/2), new THREE.MeshBasicMaterial({color:0x8fe0ff, transparent:true, opacity:.07, depthWrite:false, blending:THREE.AdditiveBlending}));
  ring = new THREE.Mesh(new THREE.TorusGeometry(1, .012, 6, 80), new THREE.MeshBasicMaterial({color:0xaef0ff, transparent:true, opacity:.6, blending:THREE.AdditiveBlending, depthWrite:false}));
  ring.rotation.x = Math.PI/2; dome.add(ring); w.scene.add(dome);
  // grown, its edge lies along the floor, down over the shelf and up over the knoll
  const rimPts = Array.from({length:160}, (_, i) => { const a = i/160*Math.PI*2, x = BX*Math.cos(a), z = BC + BZ*Math.sin(a); return new THREE.Vector3(x, floorY(x, Math.max(z, edgeZ(x) + .1)) + .06, z); });
  const floorRing = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(rimPts, true), 320, .06, 5, true), ring.material); w.scene.add(floorRing);
  const grow = (k, [x, z] = BUS) => { ring.visible = k < .999; floorRing.visible = !ring.visible; dome.scale.set(3.2 + (BX - 3.2)*k, 3 + (DH - 3)*k, 2.4 + (BZ - 2.4)*k); dome.position.set(x*(1 - k), .05, z + (BC - z)*k); };
  grow(0); dome.visible = false;
  flash = new THREE.Sprite(new THREE.SpriteMaterial({map:glowTex, color:0xfff0c0, transparent:true, depthWrite:false, blending:THREE.AdditiveBlending, opacity:0}));
  flash.position.set(ROCK[0] + .7, G(ROCK) + 1.1, ROCK[1] + .6); w.scene.add(flash);
  const dust = puffs(w, BUS[0], ROOF - .5, BUS[1], {rate:0, rise:-1.2, size:2.2, color:0x8a5a4a, opacity:.6, spread:3, life:2.4});

  function drawWall(){
    const c = wallCtx;
    const g = c.createLinearGradient(0, 0, 0, CH); g.addColorStop(0, '#3e1a34'); g.addColorStop(.45, '#8a3020'); g.addColorStop(1, '#d8682c'); c.fillStyle = g; c.fillRect(0, 0, CW, CH);
    c.strokeStyle = 'rgba(255,220,170,.22)'; c.lineWidth = 4;
    for (const cell of CELLS) { c.beginPath(); c.ellipse(cell.cx, CY, RX, RY, 0, 0, Math.PI*2); c.stroke();
      const ax = cell.cx + cell.dir*RX; c.beginPath(); c.moveTo(ax - 12, CY + 12); c.lineTo(ax, CY - 8); c.lineTo(ax + 12, CY + 12); c.stroke(); }
    // chunks of solid rock, hot and bright where they rise, dark where they've cooled and sink
    for (const q of chunks) {
      const a = q.a + q.c.dir*S.phase*(1.2 - q.r*.3), x = q.c.cx + RX*q.r*Math.cos(a), y = CY - RY*q.r*Math.sin(a), hot = clamp01((y - 90)/360);
      c.fillStyle = `rgb(${110 + hot*140},${36 + hot*110},${24 + hot*40})`; c.strokeStyle = 'rgba(26,19,32,.55)'; c.lineWidth = 2;
      c.beginPath(); q.shape.forEach((s, k) => { const b = k/6*Math.PI*2 + q.a; c.lineTo(x + Math.cos(b)*q.s*s, y + Math.sin(b)*q.s*s*.8); }); c.closePath(); c.fill(); c.stroke();
    }
    // the plates on top, dragged apart over the rising middle; new crust fills the gap between them
    const gap = 8 + S.apart*70, edge = 230 - S.apart*30, top = 56;
    c.fillStyle = '#c08a5a'; c.fillRect(512 - gap, 0, gap*2, top - 6);
    c.fillStyle = '#ffb050'; c.fillRect(509, 0, 6, top);
    c.fillStyle = '#8a5a3a'; c.fillRect(edge, 0, 512 - gap - edge, top); c.fillRect(512 + gap, 0, CW - 512 - gap, top);
    c.fillStyle = '#4e7a4e'; c.fillRect(edge, 0, 512 - gap - edge, 9); c.fillRect(512 + gap, 0, CW - 512 - gap, 9);
    c.strokeStyle = '#1a1320'; c.lineWidth = 3; c.strokeRect(edge, 0, 512 - gap - edge, top); c.strokeRect(512 + gap, 0, CW - 512 - gap, top);
    // little trees riding along on each plate
    for (const [x0, dir] of [[400, -1], [460, -1], [570, 1], [640, 1], [760, 1]]) { const x = x0 + dir*S.apart*70; c.fillStyle = '#2f5537'; c.beginPath(); c.moveTo(x - 9, 9); c.lineTo(x, -14); c.lineTo(x + 9, 9); c.fill(); }
    // the left plate's end, cooled and heavy, sinking back down
    c.save(); c.translate(edge + 4, 8); c.rotate(1.05); c.fillStyle = '#3a2a30'; c.fillRect(0, -24, 120 + S.apart*150, 46); c.strokeRect(0, -24, 120 + S.apart*150, 46); c.restore();
    c.font = '30px Caprasimo, Georgia, serif'; c.textAlign = 'center'; c.lineWidth = 7; c.strokeStyle = 'rgba(26,19,32,.85)'; c.fillStyle = '#efe0bf';
    const label = (s, x, y) => { c.strokeText(s, x, y); c.fillText(s, x, y); };
    label('plate', 380, 40); label('plate', 760, 40);
    if (S.labels) { label('hot rock rises', 512, 488); label('cool rock sinks', 300, 470); label('cool rock sinks', 860, 470); }
    wallTex.needsUpdate = true;
  }
  let sag = null, curFlow = 0;
  w.anims.push((dt, tt) => {
    // in a day, the mantle doesn't visibly move at all; this is the merest hint that it isn't still
    if (!S.lapse) S.phase += dt*.002;
    drawWall();
    current.material.map.offset.y -= dt*(.08 + curFlow);
    // a head rises up the stem, swelling like a mushroom cap, and fades into the roof; then another comes
    plumeStem.material.map.offset.y -= dt*.12;
    const ph = (tt/24) % 1, hy = -16 + ph*34, hs = 1.3 + ph*2;
    plumeHead.position.y = plumeGlow.position.y = hy; plumeHead.scale.set(hs, hs*.6, hs); plumeGlow.position.set(PLUME[0], hy, PLUME[1] + .5);
    plumeHead.material.opacity = .55*Math.min(1, (1 - ph)*5); plumeGlow.material.opacity = .8*Math.min(1, (1 - ph)*5);
    flash.material.opacity = Math.max(0, flash.material.opacity - dt*3);
    if (sag) { const k = ease(clamp01((game.elapsed - sag)/4)); putty.scale.set(1 + k*.75, 1 - k*.62, 1 + k*.75); putty.position.y = G(PUTTY) + .5 - k*.13; }
    ring.material.opacity = .45 + Math.sin(tt*2)*.15;
  });
  const bus = tripBus(w);
  const cls = classmates(w, t, bus);
  const say = t.say;

  // ---------- what the class finds ----------
  cls.find('basil', {name:'tap', at:[ROCK[0] + 1.5, ROCK[1] + 1.3, -2.3], call:"Wait! Is this a lava ocean?!", after:["Solid rock. I feel much better now."],
    async scene(){
      await say([['basil', "{name}, the mantle is a big ocean of lava, right? Are we going to sink?"],
                 ['basil', "Here, use my rock hammer. You tap it. I'm scared."]]);
      const pick = await t.ask('basil', "What will happen when you tap it?", ["Clink! It's hard rock", "Splash! It's lava"]);
      for (let i = 0; i < 3; i++) { flash.material.opacity = 1; flash.scale.setScalar(.8 + Math.random()*.4); game.camShake = .5;
        Sound.tone(1900 + i*120, {type:'triangle', dur:.12, vol:.1}); Sound.tone(3200, {type:'square', dur:.04, vol:.03, cut:4000}); await t.wait(.45); }
      await say([['basil', pick === 0 ? "Clink! You were right. It's solid!" : "No splash at all. Clink! It's solid!"],
                 ['basil', "The mantle is rock. Hot rock, but hard as a sidewalk."],
                 ['basil', "Nobody can sink in a sidewalk!"]]);
      await say([['basil', wonders(1)]]);
    }});
  cls.find('juniper', {name:'putty', at:[PUTTY[0] + .4, PUTTY[1] + 1.3, -2.8], pose:'crouch', call:"Come watch my putty!", after:["Solid, but it flows. Slowly!"],
    async scene(){
      await say([['juniper', "My putty ball is solid. You can't pour it."]]);
      const pick = await t.ask('juniper', "What will it do, sitting on this warm rock?", ["Stay round", "Slowly sag flat", "Bounce"]);
      t.cut((pos, look) => { pos.set(PUTTY[0] - .4, G(PUTTY) + 1.5, PUTTY[1] + 2.4); look.set(PUTTY[0], G(PUTTY) + .35, PUTTY[1]); });
      sag = game.elapsed; Sound.tone(300, {type:'sine', dur:3, vol:.04, f2:200});
      await t.wait(4.4);
      t.cut(null);
      await say([['juniper', pick === 1 ? "You guessed it! It sagged flat." : "Look! It slowly sagged flat."],
                 ['juniper', "It's solid, but it still flows, very slowly."],
                 ['juniper', "Mantle rock does that too. Just much, much slower."],
                 ['juniper', "Tap it quick, and it's hard. Push it slow and steady, and it squishes. That's why our drill got stuck!"]]);
    }});
  cls.find('pip', {name:'goggles', at:[.4, edgeZ(.4) + 1.4, Math.PI], pose:'peer', call:"I've got the time goggles!", after:["Round and round, a million years at a time."],
    async scene(){
      await say([['pip', "Dr. Sparks lent me her time goggles! Your turn, {name}."],
                 ['pip', "Look at the cliff. That's the mantle, cut open."]]);
      const pick = await t.ask('pip', "What will the hot rock near the bottom do?", ["Rise up", "Sink down", "Stay still"]);
      S.lapse = true; const p0 = S.phase;
      await goggles(t, {shot:(pos, look) => { pos.set(0, 1.6, 4.2); look.set(0, 1, CLIFF); }, years:1e8, dur:8,
        step: k => { S.phase = p0 + k*Math.PI*2; S.apart = k; S.labels = k > .25; }});
      await say([['pip', pick === 0 ? "You guessed it! The hot rock rose up." : "Whoa! The hot rock rose up."],
                 ['pip', "Then it cooled off at the top and sank. Round and round!"],
                 ['basil', "And look on the side! A cool slab of plate sank down."],
                 ['sparks', "The moving mantle drags the plates along. That's why plates move!"],
                 ['sparks', "Hot things rise. Hot air does it too! Try it at the science desk when we get home."]]);
      save('trips', {heatRises:true});
    }});
  cls.find('mo', {name:'heat', at:[13, 6.5, -2.2], pose:'cheer', call:"Phew! Come here!", after:["Hot like the sun. Wow."],
    async scene(){
      await say([['mo', "Phew! It's hotter than a pizza oven down here."]]);
      const pick = await t.ask('mo', "Guess how hot the very middle of the Earth is?", ["As hot as an oven", "As hot as the sun's surface"]);
      await say([['mo', pick === 1 ? "Yes! As hot as the surface of the sun!" : "Even hotter! As hot as the surface of the sun!"],
                 ['mo', "Good thing we have the heat bubble. My snacks would melt."]]);
    }});
  cls.hint = () => cls.saw('goggles') ? "Hop on the bus when you're ready, {name}. We're riding the rock up! Or poke around first. Even way down here, there are treasures." :
    "Basil has a question, Juniper has putty, and Pip has my time goggles!";

  // ---------- things to look closer at, for anyone who pokes around the ledge ----------
  const glint = (col, s, x, y, z) => { const g = new THREE.Sprite(new THREE.SpriteMaterial({map:glowTex, color:col, transparent:true, depthWrite:false, blending:THREE.AdditiveBlending, opacity:0})); g.scale.setScalar(s); g.position.set(x, y, z); w.scene.add(g); return g; };
  let gem, ripple;
  const sparkles = [];
  inWorld(w, () => {
    // olivine: a nest of green crystals in a boulder at the back of the ledge
    const [ox, oz] = OLIV, xs = [];
    const oy = G(OLIV), host = add(new THREE.SphereGeometry(.8, 10, 7), T(0x4a2420, {emissive:0x2a0a06, emissiveIntensity:.5}), ox, oy + .35, oz + .5); host.scale.set(1.3, .8, 1); outline(host, 1.03);
    // on the boulder's face toward the chasm, each leaning out from it
    for (let i = 0; i < 18; i++) { const a = fr(-1.2, 1.2), tilt = fr(.3, 1), h = fr(.25, .5), r = fr(.06, .1), px = ox + Math.sin(a)*.8, pz = oz + .5 - Math.cos(a)*.62, py = oy + fr(.15, .75);
      const m = XF(px, py, pz, 1, 1, 1, -Math.cos(a)*tilt, 0, -Math.sin(a)*tilt);
      xs.push([new THREE.CylinderGeometry(r, r, h, 6).translate(0, h/2, 0), m], [new THREE.ConeGeometry(r, r*1.6, 6).translate(0, h + r*.8, 0), m]); }
    outline(add(mergeGeos(xs), T(0x8ccf4a, {emissive:0x3a7a18, emissiveIntensity:.55}), 0, 0, 0), 1.04);
    for (let i = 0; i < 4; i++) sparkles.push(glint(0xd8ffb0, .5, ox + fr(-.5, .5), oy + .75 + fr(0, .3), oz + .2 + fr(-.1, .2)));
    // a dark lump of deep rock with a diamond winking out of it
    const [dx, dz] = DIAM, dy = G(DIAM);
    const lump = add(new THREE.DodecahedronGeometry(.75, 1), T(0x3a3a4e, {emissive:0x0e0a1a, emissiveIntensity:.4}), dx, dy + .4, dz); lump.scale.set(1.2, .85, 1); outline(lump, 1.04);
    gem = add(new THREE.OctahedronGeometry(.1, 0), new THREE.MeshPhongMaterial({color:0xe8f4ff, emissive:0x4a6aa0, specular:0xffffff, shininess:120, flatShading:true}), dx + .35, dy + .78, dz + .55); outline(gem, 1.15);
    sparkles.push(glint(0xe0f0ff, .7, dx + .38, dy + .82, dz + .62));
    // a boulder split open: its crack glows red at the edges, orange, then yellow in the hot middle
    const [cx, cz] = CRACK, cy = G(CRACK);
    for (const sx of [-1, 1]) { const half = add(new THREE.DodecahedronGeometry(.6, 1), T(0x4a2420, {emissive:0x2a0a06, emissiveIntensity:.5}), cx + sx*.62, cy + .45, cz); half.scale.set(.7, 1, 1); half.rotation.y = sx*.3; outline(half, 1.04); }
    const heat = tex(64, 128, (c, cw, ch) => { const g = c.createLinearGradient(0, 0, cw, 0); [[0, '#6a1408'], [.2, '#c8301a'], [.34, '#ff7a2a'], [.5, '#fff2b0'], [.66, '#ff7a2a'], [.8, '#c8301a'], [1, '#6a1408']].forEach(([k, col]) => g.addColorStop(k, col)); c.fillStyle = g; c.fillRect(0, 0, cw, ch); });
    heat.wrapS = heat.wrapT = THREE.ClampToEdgeWrapping;
    add(new THREE.PlaneGeometry(.5, 1), new THREE.MeshBasicMaterial({map:heat, side:THREE.DoubleSide}), cx, cy + .45, cz, null, false);
    // the chasm's lip, where a shout carries out across the cave
    for (const [ex, ez, s] of [[-.8, -.5, .35], [.9, -.4, .28], [1.4, .3, .22]]) bAdd(0x5a2c24, new THREE.SphereGeometry(s, 8, 6), XF(ECHO[0] + ex, floorY(ECHO[0] + ex, ECHO[1] + ez) + s*.3, ECHO[1] + ez, 1.2, .6, 1, 0, ex, 0), {ink:.035, shadow:true});
    // hairline cracks in the floor, warm where the heat leaks up through them, laid over the ground's bumps
    const crackTex = tex(256, 256, (c, cw, ch) => { c.lineCap = 'round'; c.lineJoin = 'round';
      const paths = [];
      for (let i = 0; i < 4; i++) { let x = 128, y = 128, a = i*1.7 + .3; const pts = [[x, y]]; for (let k = 0; k < 7; k++) { a += (Math.random() - .5)*.9; x += Math.cos(a)*14; y += Math.sin(a)*14; pts.push([x, y]); } paths.push(pts); }
      for (const [col, wd] of [['rgba(255,120,50,.35)', 9], ['rgba(26,12,20,.85)', 3.5], ['rgba(255,190,110,.7)', 1.2]]) { c.strokeStyle = col; c.lineWidth = wd;
        for (const pts of paths) { c.beginPath(); pts.forEach(([x, y]) => c.lineTo(x, y)); c.stroke(); } } });
    crackTex.wrapS = crackTex.wrapT = THREE.ClampToEdgeWrapping;
    for (const [x, z, sz, ry] of [[-1.5, 7.5, 2.4, .4], [3, -.6, 2, 1.9], [-12.5, 11, 2.2, 2.6], [13.5, 3.5, 1.8, .9], [-6, 6.4, 1.6, 4.1], [2, 12, 2, 5.2], [-15.5, 7.5, 1.8, 1.2], [10.5, -1.6, 1.8, 3.3]]) {
      const g = new THREE.PlaneGeometry(sz, sz, 6, 6).rotateX(-Math.PI/2).rotateY(ry), gp = g.attributes.position;
      for (let i = 0; i < gp.count; i++) gp.setY(i, floorY(x + gp.getX(i), z + gp.getZ(i)) + .03);
      add(g, new THREE.MeshBasicMaterial({map:crackTex, transparent:true, depthWrite:false}), x, 0, z, null, false); }
    bFlush(w.scene);
  });
  // the bubble's edge rings where it's poked, like a drop on a pond
  ripple = new THREE.Mesh(new THREE.RingGeometry(.08, .13, 32), new THREE.MeshBasicMaterial({color:0xaef0ff, transparent:true, opacity:0, blending:THREE.AdditiveBlending, depthWrite:false, side:THREE.DoubleSide}));
  const ry = .9, rz = BC + BZ*Math.sqrt(1 - (POKE[0]/BX)**2 - (ry/DH)**2);
  ripple.position.set(POKE[0], ry, rz); ripple.lookAt(POKE[0] + POKE[0]/BX**2*20, ry + ry/DH**2*20, rz + (rz - BC)/BZ**2*20); w.scene.add(ripple);
  let boing = 0, glow = 0;
  // embers drifting up out of the chasm, and grit sifting from the roof now and then
  const embers = Array.from({length:26}, () => { const s = glint(0xffa050, fr(.15, .35), fr(-18, 18), fr(-16, 16), fr(CLIFF + 1, EDGE - 2)); s.material.opacity = .8; s.v = fr(.5, 1.4); return s; });
  const grit = puffs(w, 0, ROOF - .3, 0, {rate:0, rise:-1.5, size:.7, color:0x8a5a4a, opacity:.5, spread:.6, life:2.6});
  let nextGrit = 5;
  w.anims.push((dt, tt) => {
    sparkles.forEach((s, i) => { s.material.opacity = Math.max(s.material.opacity - dt*2, Math.max(0, Math.sin(tt*.8 + i*1.9) - .94)*14, glow); });
    glow = Math.max(0, glow - dt*.5);
    if (boing > 0) { boing = Math.max(0, boing - dt*.8); const k = 1 - boing; ripple.scale.setScalar(1 + k*14); ripple.material.opacity = boing; dome.material.opacity = .07 + boing*.2; }
    for (const e of embers) { e.position.y += dt*e.v; e.position.x += Math.sin(tt + e.v*9)*dt*.2; if (e.position.y > 17) e.position.y = -16; }
    if ((nextGrit -= dt) < 0) { nextGrit = fr(7, 15); const a = fr(0, 7); grit.x = Math.cos(a)*fr(8, 19); grit.z = CLIFF + fr(2, 14); grit.burst = .4; }
  });

  const CRACK_LINES = [null,
    ['sparks', "Hot rock glows. Red is hot, orange is hotter, and yellow is hottest of all!"],
    ['sparks', "Blacksmiths read the colour of hot metal the very same way."],
    ['mo', "Like the coils in a toaster. Red means toast is coming!"]];
  curio(w, t, {name:'Glowing crack', at:CRACK, y:G(CRACK) + 1.2, view:[.4, 1], verb:'Peek in the crack', lines:CRACK_LINES,
    async pre(){ player.x = CRACK[0] + 1.6; player.z = CRACK[1] + 1.1; player.angle = Math.atan2(-1.6, -1.1);
      t.cut((pos, look) => { pos.set(CRACK[0] - .5, G(CRACK) + 1.3, CRACK[1] + 2.4); look.set(CRACK[0], G(CRACK) + .45, CRACK[1]); });
      const pick = await t.ask('sparks', "See how the crack glows in different colours? Which part do you think is hottest?", ["The yellow middle", "The orange part", "The red edges"]);
      CRACK_LINES[0] = ['sparks', pick === 0 ? "You got it! The yellow middle is the hottest." : "It's the yellow middle! That's the hottest part."]; }});
  curio(w, t, {name:'Green crystals', at:OLIV, y:G(OLIV) + 1.3, view:[.3, -1], verb:'Look closer', lines:[
    ['sparks', "Green crystals! This is olivine. The mantle is made mostly of it."],
    ['sparks', "When it's clear and sparkly, people call it peridot, and wear it as a gem."],
    ['juniper', "There's a beach in Hawaii with GREEN sand! Is it made of this?"],
    ['sparks', "It is! A volcano carried bits of olivine up from deep down, and the waves washed them into a green beach."]],
    async act(){ glow = 1; [1047, 1319, 1568, 2093].forEach((f, i) => Sound.tone(f, {type:'sine', t:i*.12, dur:.4, vol:.05})); }});
  curio(w, t, {name:'Twinkle in the rock', at:DIAM, y:G(DIAM) + 1.3, view:[1, .5], verb:'Look closer', lines:[
    ['sparks', "A twinkle! That's a tiny diamond."],
    ['sparks', "Diamonds are made of carbon, the same stuff as the black in your pencil."],
    ['sparks', "Deep in the mantle, it's so hot, and the rock above squeezes so hard, that carbon gets pressed into diamond."],
    ['mo', "So if I squeeze my pencil really, really hard…"],
    ['basil', "You'd need a whole mountain sitting on it. For a very, very long time."]],
    async act(){ glow = 1; Sound.tone(2637, {type:'sine', dur:.5, vol:.05}); Sound.tone(3136, {type:'sine', t:.15, dur:.5, vol:.04}); }});
  curio(w, t, {name:'Edge of the chasm', at:ECHO, y:G(ECHO) + 1.2, view:[.5, 1], verb:'Shout hello', lines:[
    ['pip', "It echoes! This cave must be HUGE."],
    ['sparks', "Here's a secret, class. The real mantle has no caves at all. It's solid rock, all the way down."],
    ['sparks', "This cave is a little Wonder Bus magic, so we can look around. Don't tell anyone!"],
    ['sparks', "And we're deep! Deeper than ten tall mountains stacked on top of each other."],
    ['sparks', "The mantle goes down much farther still: almost halfway to the middle of the Earth!"]],
    async act(){ for (let i = 0; i < 4; i++) { const v = .09*(.55**i); Sound.tone(392, {type:'triangle', dur:.18, vol:v, cut:1800}); Sound.tone(523, {type:'triangle', t:.2, dur:.3, vol:v, cut:1800}); await t.wait(.75); } }});
  curio(w, t, {name:'Edge of the bubble', at:POKE, y:1.2, view:[.6, -1], verb:'Poke the bubble', lines:[
    ['sparks', "Boing! The heat bubble is tougher than it looks."],
    ['sparks', "Out there, the rock is more than a thousand degrees. The bubble keeps the heat out, like a cooler keeps a picnic cold."],
    ['mo', "Please keep my sandwiches cold, bubble."]],
    async act(){ for (let i = 0; i < 3; i++) { boing = 1; Sound.tone(330, {type:'sine', dur:.5, vol:.08 - i*.02, f2:660, vib:[12, 20]}); Sound.tone(880, {type:'triangle', t:.1, dur:.3, vol:.04}); await t.wait(1.3); } }});

  // a sample for the microscope at home: a chunk of mantle rock broken off round the back of the knoll,
  // its green olivine grains catching the glow
  const CHIP = [5, 12], cg = new THREE.Group(); cg.position.set(CHIP[0], G(CHIP), CHIP[1]); w.scene.add(cg);
  for (const [dx, dz, r, c] of [[0, 0, .32, 0x6a6448], [.38, .18, .2, 0x5a5a40], [-.3, .22, .17, 0x6e6a4a]]) { const m = outline(add(new THREE.DodecahedronGeometry(r, 0), T(c), dx, r*.45, dz, cg), 1.08); m.rotation.set(dx*3, dz*5, 0); }
  for (const [x, y, z] of [[.12, .5, .2], [-.15, .42, .22], [.05, .3, -.28], [.4, .3, .3], [-.32, .3, .3], [.22, .22, .3]]) sph(.045, T(0x8ad04a, {emissive:0x4a8a20, emissiveIntensity:.5}), x, y, z, cg, 6, false);
  sample(w, t, {ids:['olivine'], at:CHIP, y:G(CHIP) + .6, verb:'Pick up a chip of rock'});

  // ---------- the place's scenes, run by the trip's script ----------
  return {world:w, bus, cls,
    // too heavy for the soft rock, the bus sinks through it nose first, and squeezes out of the cave roof
    // like toothpaste from a tube, gooey rock dripping after; it levels out to land, and the bubble spreads
    async arrive(){
      bus.gear('bubble'); bus.park(BUS[0] - 5.5, ROOF + 5, BUS[1], 0);
      t.watch(w, (pos, look) => { pos.set(3, 9, 13); look.set(bus.root.position.x, Math.max(1, bus.root.position.y*.85), BUS[1]); });
      dust.x = BUS[0] - 3.8; dust.burst = .7; Sound.tone(90, {type:'sawtooth', dur:2.4, vol:.05, f2:60, cut:400, vib:[4, 6]});
      await bus.fly([[BUS[0] - 5.5, ROOF + 5, BUS[1]], [BUS[0] - 4.5, ROOF + 1.4, BUS[1]], [BUS[0] - 3.6, ROOF - 2.5, BUS[1]]], 2.6, {level:false, easing:k => k});
      dust.burst = 1.2; game.camShake = 1.2; Sound.hiss({dur:1.6, vol:.12, type:'lowpass', freq:300}); Sound.tone(70, {dur:1.4, vol:.1, f2:45});
      await bus.fly([[BUS[0] - 3.6, ROOF - 2.5, BUS[1]], [BUS[0] - 2.6, ROOF - 7, BUS[1]], [BUS[0] - 1.9, 3.2, BUS[1]], [BUS[0] - 1.2, 1, BUS[1]], [BUS[0] - .5, .12, BUS[1]], [BUS[0], 0, BUS[1]]], 3.4, {level:false});
      bus.park(BUS[0], 0, BUS[1], 0);
      Sound.tone(330, {type:'triangle', dur:.12, vol:.08}); Sound.tone(494, {type:'triangle', t:.1, dur:.18, vol:.08});
      dome.visible = true;
      Sound.tone(523, {type:'sine', dur:1.2, vol:.06, f2:1046});
      await t.tween(1.4, k => grow(ease(k)));
      bus.gear(null);
      const [dx, dz] = bus.door(.6);
      t.cut((pos, look) => { pos.set(2, 12, 16.5); look.set(0, -.5, -1); });
      cls.arrive({sparks:[dx + .9, dz - .5, Math.PI*.9]});
      await t.wait(2.6);
      await say([['pip', "We squeezed right out of the rock, like toothpaste from a tube!"],
                 ['sparks', "Welcome to the mantle, class! The heat bubble keeps us cool. Stay inside it."],
                 ['sparks', "Look around. When someone waves, go and see!"]]);
      t.play(w, [dx, dz - .2, Math.PI]);
      t.goal('Visit anyone who waves!');
    },
    async explore(){
      await t.until(() => cls.saw('goggles') && !game.cutscene);
      await t.wait(.6);
      await say([['sparks', cls.saw('tap') || cls.saw('putty') ? "Solid rock that flows, round and round, and carries the plates. That's the mantle!" :
                              "Hot rock rises, cool rock sinks, round and round, and it carries the plates. That's the mantle!"],
                 ['sparks', "Our drill can't dig this soft rock, but the mantle can carry us up instead."],
                 ...(cls.leaving ? cls.leaving("who wants to ride a rock elevator?") : [['sparks', "Who wants to ride a rock elevator? Everyone aboard!"], ...cls.stillWaving()])]);
      cls.gather([bus.root.position.x - .6, bus.root.position.z - 2.4, 0]);
      await cls.board(bus);
    },
    // the bubble shrinks back round the bus, which floats out over the chasm: over the cool, sinking rock it
    // sinks too, so it drifts to the middle, where the hot rock rises, and rides that up
    async depart(){
      for (const id in cls.n) { cls.n[id].model.root.visible = false; cls.n[id].label.visible = false; }
      const p = bus.root.position, at = [p.x, p.z];
      t.watch(w, (pos, look) => { pos.set(p.x*.4 + 3, 7, 14); look.set(p.x*.8, Math.min(Math.max(p.y, -1), 10), p.z); });
      await t.tween(1, k => grow(1 - ease(k), at));
      dome.visible = false; bus.gear('bubble');
      Sound.tone(523, {type:'triangle', dur:.15, vol:.07}); Sound.tone(784, {type:'triangle', t:.12, dur:.25, vol:.07});
      const over = [-7, 2.4, EDGE - 3.4];
      await bus.fly([[p.x, p.y, p.z], [p.x + .5, 2.2, 2], [over[0], over[1] + .3, EDGE - 1], over], 2.8, {roll:.5});
      Sound.tone(220, {type:'sawtooth', dur:1.4, vol:.05, f2:90, cut:600});
      const sink = t.tween(1.6, k => { p.y = over[1] - 1.6*ease(k); bus.body.rotation.z = Math.sin(k*20)*.14*(1 - k*.6); });
      await say([['basil', "Um. We're going DOWN."], ['sparks', "This rock has cooled off, so it sinks. To the middle, where it's hot!"]]);
      await sink; bus.body.rotation.z = 0;
      const mid = [0, 1.4, MID];
      await bus.fly([[p.x, p.y, p.z], [-3.5, 1.2, (p.z + mid[2])/2], mid], 2.2, {roll:.5});
      curFlow = .6; current.material.opacity = .65;
      Sound.hiss({dur:3, vol:.1, type:'bandpass', freq:500, f2:1600, q:.6}); Sound.tone(120, {type:'sawtooth', dur:3.4, vol:.04, f2:360, cut:800});
      const up = bus.fly([mid, [0, 4, MID], [0, 10, MID], [0, ROOF + 10, MID]], 4.6, {roll:.5});
      await say([['pip', "It's going up! Right where the hot rock rises."],
                 ['juniper', "Look, way over there! A skinny glowing tower, rising all by itself!"],
                 ['sparks', "That's a plume: extra-hot rock rising from much deeper down, almost from the Earth's core."],
                 ['basil', "Where does it go? I wonder… Does it come out somewhere?"],
                 ['sparks', "Up and up! Some plumes come up right in the middle of a plate… maybe we'll see one someday."]]);
      await up;
      await t.wait(.3);
    },
  };
}
