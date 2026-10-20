// Inside the Wonder Bus, where the class rides between places: seats, the class sat in them, Dr.
// Sparks up front, and windows whose view changes with the ride (sky, rock rushing up, bubbles).
// Rides cut between three shots: the class's faces, Dr. Sparks with the windshield behind her, and
// out of the window.
//
//   const cab = cabin();
//   cab.view('rock');                   // what the windows show, and which way it streams
//   game.cutCam = cab.shot('class');    // or 'teacher', 'window'
//
// The cabin runs along x with the windshield at +x, like the bus outside.

import * as THREE from 'three';
import { C, T, XF, add, bAdd, bFlush, box, grp, outline, rrect, tex } from '../core/kit.js';
import { inWorld } from '../core/world.js';
import { hero } from '../player.js';
import { game } from '../state.js';
import { puffs, spawnNPC, tripWorld } from './stop-kit.js';

// [x, z] for each seat, facing the front; the explorer has their own
const SEATS = {pip:[1.25, -.72], juniper:[1.25, .72], basil:[0, -.72], mo:[-1.25, .72]}, MINE = [0, .72];
const FACE = Math.PI/2;
// each view is a tileable painting and the way it streams past: +x out the back, +y down past the glass
const VIEWS = {
  sky:    {flow:[.12, 0], light:0xffd8b8, draw: (c, w, h) => { grad(c, w, h, ['#3a3a7a', '#a46a9a', '#f2a67a']); clouds(c, w, h, .35, 'rgba(255,236,220,.85)'); }},
  sea:    {flow:[.07, 0], light:0xcfe0ff, draw: (c, w, h) => { grad(c, w, h*.55, ['#4a4a8a', '#c88aa0', '#ffc69a']); clouds(c, w, h*.5, .25, 'rgba(255,236,220,.8)');
            const g = c.createLinearGradient(0, h*.55, 0, h); g.addColorStop(0, '#3a7aa0'); g.addColorStop(1, '#1e3a62'); c.fillStyle = g; c.fillRect(0, h*.55, w, h*.45);
            c.fillStyle = 'rgba(255,240,210,.7)'; for (let i = 0; i < 70; i++) c.fillRect(rnd(w), h*.58 + rnd(h*.4), 6 + rnd(18), 2); }},
  rock:   {flow:[0, -1.6], light:0xffa070, draw: (c, w, h) => strata(c, w, h, ['#6b4430', '#5a3826', '#7a5038', '#4e3020'], 'rgba(255,200,140,.5)')},
  magma:  {flow:[0, -1.1], light:0xff7a3a, draw: (c, w, h) => { grad(c, w, h, ['#ff9a3a', '#e0502a', '#ffb050', '#e0502a', '#ff9a3a']); blobs(c, w, h, 'rgba(255,230,140,.6)', 26); }},
  mantle: {flow:[0, -.5], light:0xff8a5a, draw: (c, w, h) => strata(c, w, h, ['#7a2c1e', '#8a3624', '#6a2418', '#943c26'], 'rgba(255,150,90,.35)')},
  // rising through magma, it streams down past the glass
  magmaUp:{flow:[0, 1.1], light:0xff7a3a, draw: (c, w, h) => { grad(c, w, h, ['#ffa040', '#e8582a', '#ffc060', '#e8582a', '#ffa040']); blobs(c, w, h, 'rgba(190,50,20,.3)', 14);
            c.fillStyle = 'rgba(255,240,170,.6)'; for (let i = 0; i < 70; i++) { const x = rnd(w), y = rnd(h), rx = 3 + rnd(6), ry = 18 + rnd(50); tiled(w, h, (dx, dy) => { c.beginPath(); c.ellipse(x + dx, y + dy, rx, ry, 0, 0, 7); c.fill(); }); } blobs(c, w, h, 'rgba(255,236,150,.55)', 18); }},
  rising: {flow:[0, .9], light:0xff8a5a, draw: (c, w, h) => strata(c, w, h, ['#7a2c1e', '#8a3624', '#6a2418', '#943c26'], 'rgba(255,150,90,.35)')},
  bubbles:{flow:[0, .8], light:0x8ad0ff, draw: (c, w, h) => { grad(c, w, h, ['#1e5a8a', '#123a6a', '#1e5a8a']); rings(c, w, h, 60); }},
  deep:   {flow:[.05, 0], light:0x6aa0e0, draw: (c, w, h) => { grad(c, w, h, ['#0e2a4a', '#081a32']); c.fillStyle = 'rgba(200,230,255,.5)'; for (let i = 0; i < 90; i++) c.fillRect(rnd(w), rnd(h), 2, 2); }},
  sunset: {flow:[.1, 0], light:0xffb890, draw: (c, w, h) => { grad(c, w, h, ['#5a3a7a', '#e07a6a', '#ffc070']); clouds(c, w, h, .3, 'rgba(255,220,190,.8)'); }},
  // golden hills far below, split by the long dark line of a fault
  hills:  {flow:[.09, 0], light:0xffd0a0, draw: (c, w, h) => { grad(c, w, h*.5, ['#6a7ab8', '#e8a88a', '#ffd6a4']); clouds(c, w, h*.42, .22, 'rgba(255,236,220,.8)');
            ridge(c, w, h, .47, .03, [2, 5], '#c8a070'); ridge(c, w, h, .53, .035, [3, 7], '#d8ae52');
            dots(c, w, h, .55, .7, '#4a6a3a', 26, 9); ridge(c, w, h, .66, .02, [4, 9], '#e2bc62');
            // the fault, with a trough of shade along its uphill side
            const at = x => h*(.615 + .03*Math.sin(x/w*Math.PI*2*3) + .006*Math.sin(x/w*Math.PI*2*41));
            c.strokeStyle = 'rgba(150,100,50,.45)'; c.lineWidth = 12; line(c, w, x => at(x) - 5); c.strokeStyle = '#3a2620'; c.lineWidth = 4; line(c, w, at);
            dots(c, w, h, .7, .95, '#4a6a3a', 14, 14); }},
  // snowy mountains far off, crumpled up where two plates crash
  peaks:  {flow:[.05, 0], light:0xd8e4ff, draw: (c, w, h) => { grad(c, w, h, ['#5a78c0', '#b8cce8', '#ffe2c4', '#ffe2c4']); clouds(c, w, h*.36, .2, 'rgba(255,250,245,.85)');
            range(c, w, h, 13, .36, .6, '#8e9cc4'); range(c, w, h, 10, .43, .67, '#6e6a8e');
            ridge(c, w, h, .64, .02, [3, 8], '#5e8a4e'); dots(c, w, h, .64, .78, '#2f5537', 60, 7); ridge(c, w, h, .76, .02, [2, 6], '#4e7a44'); }},
};
let seed = 3; const rnd = n => (seed = (seed*16807) % 2147483647)/2147483647*n;
function grad(c, w, h, stops){ const g = c.createLinearGradient(0, 0, 0, h); stops.forEach((s, i) => g.addColorStop(i/(stops.length - 1), s)); c.fillStyle = g; c.fillRect(0, 0, w, h); }
function clouds(c, w, h, n, col){ c.fillStyle = col; for (let i = 0; i < 9; i++) { const x = rnd(w), y = rnd(h*.8) + h*.1, r = 18 + rnd(30)*n*3;
  for (let k = 0; k < 4; k++) for (const dx of [-w, 0, w]) { c.beginPath(); c.arc(x + dx + k*r*.8, y - Math.sin(k)*r*.4, r*(1 - k*.12), 0, 7); c.fill(); } } }
function strata(c, w, h, cols, fleck){ for (let y = 0, i = 0; y < h; i++) { const bh = 14 + rnd(30); c.fillStyle = cols[i % cols.length]; c.fillRect(0, y, w, bh); y += bh; }
  c.fillStyle = fleck; for (let i = 0; i < 160; i++) { const x = rnd(w), y = rnd(h), r = 2 + rnd(5); tiled(w, h, (dx, dy) => { c.beginPath(); c.arc(x + dx, y + dy, r, 0, 7); c.fill(); }); } }
function blobs(c, w, h, col, n){ c.fillStyle = col; for (let i = 0; i < n; i++) { const x = rnd(w), y = rnd(h), r = 8 + rnd(26); tiled(w, h, (dx, dy) => { c.beginPath(); c.arc(x + dx, y + dy, r, 0, 7); c.fill(); }); } }
function rings(c, w, h, n){ c.strokeStyle = 'rgba(210,240,255,.8)'; c.lineWidth = 3; for (let i = 0; i < n; i++) { const x = rnd(w), y = rnd(h), r = 4 + rnd(14); tiled(w, h, (dx, dy) => { c.beginPath(); c.arc(x + dx, y + dy, r, 0, 7); c.stroke(); }); } }
// a wavy band of land from y = k*h down to the bottom; its waves fit a whole number of times across, so it tiles
function ridge(c, w, h, k, amp, [p1, p2], col){ const y = x => h*(k + amp*Math.sin(x/w*Math.PI*2*p1 + 1) + amp*.5*Math.sin(x/w*Math.PI*2*p2));
  c.fillStyle = col; c.beginPath(); c.moveTo(0, h); for (let x = 0; x <= w; x += 4) c.lineTo(x, y(x)); c.lineTo(w, h); c.fill();
  c.strokeStyle = 'rgba(26,19,32,.5)'; c.lineWidth = 2; line(c, w, y); }
function line(c, w, y){ c.beginPath(); for (let x = 0; x <= w; x += 4) c.lineTo(x, y(x)); c.stroke(); }
function dots(c, w, h, y0, y1, col, n, r){ c.fillStyle = col; for (let i = 0; i < n; i++) { const x = rnd(w), y = h*(y0 + rnd(y1 - y0)), s = r*(.6 + rnd(.6));
  tiled(w, h, (dx, dy) => { c.beginPath(); c.arc(x + dx, y + dy, s, 0, 7); c.arc(x + dx + s*.8, y + dy + s*.2, s*.7, 0, 7); c.fill(); }); } }
// a row of peaks, each with a snowy cap, between heights top and base
function range(c, w, h, n, top, base, col){ for (let i = 0; i < n; i++) { const x = (i + rnd(.6))*w/n, y = h*(top + rnd(.08)), hw = w/n*(.55 + rnd(.35)), b = h*base, sn = .38;
  tiled(w, h, (dx, dy) => { if (dy) return; c.fillStyle = col; c.beginPath(); c.moveTo(x + dx - hw, b); c.lineTo(x + dx, y); c.lineTo(x + dx + hw*.9, b); c.fill(); c.strokeStyle = 'rgba(26,19,32,.55)'; c.lineWidth = 2; c.stroke();
    c.fillStyle = '#f6f6fa'; c.beginPath(); c.moveTo(x + dx, y); c.lineTo(x + dx - hw*sn, y + (b - y)*sn); c.lineTo(x + dx - hw*sn*.4, y + (b - y)*sn*.8); c.lineTo(x + dx, y + (b - y)*sn*1.05);
    c.lineTo(x + dx + hw*sn*.4, y + (b - y)*sn*.78); c.lineTo(x + dx + hw*.9*sn, y + (b - y)*sn); c.closePath(); c.fill(); }); } }
// a spot cut off at one edge carries on at the other, so the painting streams past with no seam
function tiled(w, h, f){ for (const dx of [-w, 0, w]) for (const dy of [-h, 0, h]) f(dx, dy); }

export function cabin(){
  const w = tripWorld({title:'The Wonder Bus', bg:0x1a1320, sky:0xfff0e0, groundCol:0x5a3a50, hemi:.9, sunCol:0xffe0c0, sunI:.35, fogNear:30, fogFar:60});
  w.area = () => 'On board';
  w.spawn = [MINE[0], MINE[1], FACE];
  const views = {}, panes = [];
  let isle;
  const light = new THREE.PointLight(0xffd8b8, .9, 9, 1.5); light.position.set(0, 1.6, 0); w.scene.add(light);
  inWorld(w, () => {
    const gold = T(C.gold), wood = T(C.woodLt);
    // the solid fittings go in a few merged meshes, each with an ink outline
    const ink = (c, wd, h, d, x, y, z) => bAdd(c, new THREE.BoxGeometry(wd, h, d), XF(x, y, z), {ink:.012, shadow:true});
    box(7.2, .1, 2.8, wood, 0, -.05, 0);
    box(.6, .02, 2.6, T(0x8a3b3b), 0, .01, 0, null, false).scale.x = 11;
    // the walls, built around four windows a side, so only real openings show the view
    for (const sz of [-1, 1]) {
      const z = sz*1.38;
      ink(0x2f8f8a, 7.2, .95, .1, 0, .47, z); ink(0x2f8f8a, 7.2, .9, .1, 0, 2.2, z); ink(C.gold, 7.2, .08, .12, 0, .96, z); ink(C.gold, 7.2, .08, .12, 0, 1.76, z);
      // the pillars stop short of the gold trim, whose faces would flicker against theirs
      for (const px of [-3.35, -2.1, -.85, .4, 1.65, 2.9]) ink(0x24706b, .28, .7, .12, px, 1.36, z);
    }
    ink(0x2f8f8a, .1, 2.75, 2.8, -3.5, 1.375, 0);
    // the class blackboard at the back, chalked up for the trip
    ink(C.woodDk, .1, 1.04, 1.56, -3.43, 1.45, 0);
    const chalk = tex(512, 336, (c, cw, ch) => { c.fillStyle = '#2f4a3e'; c.fillRect(0, 0, cw, ch);
      c.fillStyle = 'rgba(230,240,230,.08)'; for (let i = 0; i < 9; i++) { c.beginPath(); c.ellipse(rnd(cw), rnd(ch), 40 + rnd(60), 14 + rnd(16), rnd(3), 0, 7); c.fill(); }
      c.lineCap = c.lineJoin = 'round'; c.lineWidth = 6;
      c.strokeStyle = '#f2ece0'; c.beginPath(); c.moveTo(40, 300); c.lineTo(112, 160); c.lineTo(142, 160); c.lineTo(214, 300); c.stroke();
      c.strokeStyle = '#ff9a5a'; c.beginPath(); c.moveTo(118, 164); c.lineTo(106, 214); c.moveTo(136, 164); c.lineTo(150, 226); c.stroke();
      c.strokeStyle = '#e8e0f0'; for (let k = 0; k < 3; k++) { c.beginPath(); c.arc(128 + k*16, 132 - k*30, 14 + k*5, 0, 7); c.stroke(); }
      c.strokeStyle = '#8fe0d8'; rrect(c, 268, 220, 170, 62, 18); c.stroke();
      c.beginPath(); c.moveTo(282, 248); c.lineTo(424, 248); c.stroke();
      c.strokeStyle = '#f2ece0'; for (const wx of [304, 402]) { c.beginPath(); c.arc(wx, 288, 13, 0, 7); c.stroke(); }
      c.strokeStyle = '#ffd36b'; for (let k = 0; k < 3; k++) { c.beginPath(); c.moveTo(258, 236 + k*14); c.lineTo(236, 236 + k*14); c.stroke(); }
      c.font = '58px Caprasimo, Georgia, serif'; c.textAlign = 'center'; c.fillStyle = '#ffd36b'; c.fillText('FIELD TRIP!', 340, 92);
      c.strokeStyle = '#f2ece0'; c.lineWidth = 4; c.beginPath(); c.moveTo(220, 116); c.quadraticCurveTo(340, 136, 460, 112); c.stroke(); });
    chalk.wrapS = chalk.wrapT = THREE.ClampToEdgeWrapping;
    add(new THREE.PlaneGeometry(1.4, .9), T(0xffffff, {map:chalk}), -3.375, 1.45, 0, null, false).rotation.y = Math.PI/2;
    // the roof, a gentle arch, and the windshield frame and dashboard up front. It springs from high
    // enough that Dr. Sparks, hopping and spinning with an arm up, never puts her head through it.
    const roof = add(new THREE.CylinderGeometry(1.45, 1.45, 7.2, 20, 1, true, 0, Math.PI), T(0xb07a52, {side:THREE.BackSide}), 0, 2.6, 0, null, false);
    roof.rotation.z = Math.PI/2; roof.scale.set(.32, 1, 1);
    ink(0x2f8f8a, .1, .95, 2.8, 3.5, 2.275, 0); ink(0x2f8f8a, .1, .7, 2.8, 3.5, .35, 0);
    for (const sz of [-1, 1]) ink(0x24706b, .12, 1.3, .2, 3.5, 1.35, sz*1.3);
    ink(C.plum, .6, .55, 2.6, 3.1, .6, 0); ink(C.gold, .62, .06, 2.62, 3.1, .9, 0);
    for (let k = 0; k < 3; k++) add(new THREE.CircleGeometry(.11, 16), T(C.cream, {emissive:0xffd36b, emissiveIntensity:.4}), 2.79, .72, -.6 + k*.6, null, false).rotation.y = -Math.PI/2;
    for (const [sx, sz] of [...Object.values(SEATS), MINE, [-1.25, -.72], [-2.5, .72], [-2.5, -.72]]) {
      ink(C.plum, .55, .14, .9, sx, .26, sz); ink(C.plum, .12, .7, .9, sx - .3, .6, sz); ink(C.gold, .13, .06, .92, sx - .3, .96, sz);
      box(.5, .2, .1, T(C.ink), sx, .1, sz + Math.sign(sz)*.38);
    }
    box(.5, .3, .35, T(C.rust), -1.25, .48, -.72); box(.3, .14, .3, T(0xffd36b), -1.15, .5, -.4);
    // a rail for Dr. Sparks to hold up front
    box(.05, 3, .05, gold, 3.3, 1.5, -.7);
    bFlush(w.scene);
    // the views: big paintings just outside the openings, one canvas each side so they stream together
    for (const [name, v] of Object.entries(VIEWS)) {
      const t = tex(1024, 512, v.draw); t.wrapS = t.wrapT = THREE.RepeatWrapping; views[name] = {t, ...v};
    }
    for (const [x, z, ry, wd] of [[0, -2.6, 0, 9], [0, 2.6, Math.PI, 9], [4.6, 0, -Math.PI/2, 5], [-4.4, 0, Math.PI/2, 5]]) {
      // drawn first and leaving no depth, so the painting is a backdrop that the island out there stands in front of
      const m = new THREE.MeshBasicMaterial({map:views.sky.t.clone(), fog:false, depthWrite:false}); m.map.needsUpdate = true;
      const pane = add(new THREE.PlaneGeometry(wd, 4), m, x, 1.5, z, null, false); pane.rotation.y = ry; pane.renderOrder = -1; panes.push({pane, dir: ry === Math.PI ? -1 : 1});
    }
    // the volcano island the class is flying to, a real one out past the glass, framed by the window shot
    isle = grp(-5.9, .3, -15.1);
    add(new THREE.SphereGeometry(1, 20, 10), T(0x3e7a40), 0, 0, 0, isle, false).scale.set(4.2, .45, 3.4);
    const cone = [[2.9, 0], [2.2, .7], [1.3, 1.8], [.75, 2.7], [.55, 2.85]].map(([r, y]) => new THREE.Vector2(r, y));
    outline(add(new THREE.LatheGeometry(cone, 24), T(0x5a3428), 0, .2, 0, isle, false), 1.02);
    add(new THREE.CircleGeometry(.56, 20), T(0xff8a3a, {emissive:0xff6a1a, emissiveIntensity:.9}), 0, 3.03, 0, isle, false).rotation.x = -Math.PI/2;
    isle.scale.setScalar(.55); isle.visible = false;
  });
  const smoke = puffs(w, -5.9, 2.1, -15.1, {rate:0, rise:.35, size:.8, color:0xc8bccc, opacity:.85, spread:.6, life:4});
  // the class, sat down and facing the front, and Dr. Sparks standing by the windshield facing them
  const kids = {};
  for (const [id, [x, z]] of Object.entries(SEATS)) { const n = kids[id] = spawnNPC(w, id, x + .05, z, FACE); n.pose = 'sit'; n.range = 0; n.label.visible = false; }
  // by the door, out of the class shot's frame but facing the class for her own
  const sparks = spawnNPC(w, 'sparks', 3.0, -1.0, -Math.PI/2 - .5); sparks.range = 0; sparks.label.visible = false;
  let cur = null, scroll = 0, sway = 0;
  w.anims.push((dt, t) => {
    if (cur) { scroll += dt; for (const {pane, dir} of panes) { pane.material.map.offset.set(dir*cur.flow[0]*scroll, cur.flow[1]*scroll*.35); } }
    // the bus bobs and sways under the class; shakes come through stronger in here
    sway = Math.sin(t*1.3)*.012 + Math.sin(t*2.9)*.006;
    w.scene.rotation.x = sway;
    // the explorer rides in their seat like everyone else
    hero.root.position.set(MINE[0] + .05, 0, MINE[1]); hero.root.rotation.y = FACE;
    hero.legL.rotation.x = hero.legR.rotation.x = -1.45; hero.body.position.y = -.32; hero.armL.rotation.x = hero.armR.rotation.x = -.35;
  });
  const SHOTS = {
    // from just out past the windshield frame: inside the cab the front row is too close to see their faces
    class:   (pos, look) => { pos.set(4.4, 1.6 + sway, .3); look.set(-3, .6, .7); },
    // over the class's heads, so nothing stands between the explorer and Dr. Sparks
    teacher: (pos, look) => { pos.set(-.5, 2.2 + sway, 0); look.set(3.0, 1.5, -.95); },
    // on a short screen the talk box covers the lower half, so look lower and the island rides up above it
    window:  (pos, look) => { pos.set(-1.1, 1.5 + sway, .2); look.set(-1.6, innerHeight < 500 ? 1.22 : 1.45, -1.4); },
  };
  return {world:w, kids, sparks,
    view(name){ cur = views[name]; scroll = 0; for (const {pane} of panes) { pane.material.map = cur.t.clone(); pane.material.map.needsUpdate = true; pane.material.needsUpdate = true; } light.color.setHex(cur.light);
      isle.visible = name === 'sea'; smoke.rate = isle.visible ? 1.6 : 0; },
    shot: name => SHOTS[name],
  };
}
