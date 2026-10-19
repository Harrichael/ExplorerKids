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
import { C, T, XF, add, bAdd, bFlush, box, rrect, tex } from '../core/kit.js';
import { inWorld } from '../core/world.js';
import { hero } from '../player.js';
import { game } from '../state.js';
import { spawnNPC, tripWorld } from './stop-kit.js';

// [x, z] for each seat, facing the front; the explorer has their own
const SEATS = {pip:[1.25, -.72], juniper:[1.25, .72], theo:[0, -.72], mo:[-1.25, .72]}, MINE = [0, .72];
const FACE = Math.PI/2;
// each view is a tileable painting and the way it streams past: +x out the back, +y up past the glass
const VIEWS = {
  sky:    {flow:[.12, 0], light:0xffd8b8, draw: (c, w, h) => { grad(c, w, h, ['#3a3a7a', '#a46a9a', '#f2a67a']); clouds(c, w, h, .35, 'rgba(255,236,220,.85)'); }},
  sea:    {flow:[.07, 0], light:0xcfe0ff, draw: (c, w, h) => { grad(c, w, h*.55, ['#4a4a8a', '#c88aa0', '#ffc69a']); clouds(c, w, h*.5, .25, 'rgba(255,236,220,.8)');
            const g = c.createLinearGradient(0, h*.55, 0, h); g.addColorStop(0, '#3a7aa0'); g.addColorStop(1, '#1e3a62'); c.fillStyle = g; c.fillRect(0, h*.55, w, h*.45);
            c.fillStyle = 'rgba(255,240,210,.7)'; for (let i = 0; i < 70; i++) c.fillRect(rnd(w), h*.58 + rnd(h*.4), 6 + rnd(18), 2);
            island(c, w*.3, h*.56, .6); island(c, w*.78, h*.56, .35); }},
  rock:   {flow:[0, -1.6], light:0xffa070, draw: (c, w, h) => strata(c, w, h, ['#6b4430', '#5a3826', '#7a5038', '#4e3020'], 'rgba(255,200,140,.5)')},
  magma:  {flow:[0, -1.1], light:0xff7a3a, draw: (c, w, h) => { grad(c, w, h, ['#ff9a3a', '#e0502a', '#ffb050', '#e0502a', '#ff9a3a']); blobs(c, w, h, 'rgba(255,230,140,.6)', 26); }},
  mantle: {flow:[0, -.5], light:0xff8a5a, draw: (c, w, h) => strata(c, w, h, ['#7a2c1e', '#8a3624', '#6a2418', '#943c26'], 'rgba(255,150,90,.35)')},
  rising: {flow:[0, .9], light:0xff8a5a, draw: (c, w, h) => strata(c, w, h, ['#7a2c1e', '#8a3624', '#6a2418', '#943c26'], 'rgba(255,150,90,.35)')},
  bubbles:{flow:[0, .8], light:0x8ad0ff, draw: (c, w, h) => { grad(c, w, h, ['#1e5a8a', '#123a6a', '#1e5a8a']); rings(c, w, h, 60); }},
  deep:   {flow:[.05, 0], light:0x6aa0e0, draw: (c, w, h) => { grad(c, w, h, ['#0e2a4a', '#081a32']); c.fillStyle = 'rgba(200,230,255,.5)'; for (let i = 0; i < 90; i++) c.fillRect(rnd(w), rnd(h), 2, 2); }},
  sunset: {flow:[.1, 0], light:0xffb890, draw: (c, w, h) => { grad(c, w, h, ['#5a3a7a', '#e07a6a', '#ffc070']); clouds(c, w, h, .3, 'rgba(255,220,190,.8)'); }},
};
let seed = 3; const rnd = n => (seed = (seed*16807) % 2147483647)/2147483647*n;
function grad(c, w, h, stops){ const g = c.createLinearGradient(0, 0, 0, h); stops.forEach((s, i) => g.addColorStop(i/(stops.length - 1), s)); c.fillStyle = g; c.fillRect(0, 0, w, h); }
function clouds(c, w, h, n, col){ c.fillStyle = col; for (let i = 0; i < 9; i++) { const x = rnd(w), y = rnd(h*.8) + h*.1, r = 18 + rnd(30)*n*3;
  for (let k = 0; k < 4; k++) for (const dx of [-w, 0, w]) { c.beginPath(); c.arc(x + dx + k*r*.8, y - Math.sin(k)*r*.4, r*(1 - k*.12), 0, 7); c.fill(); } } }
function strata(c, w, h, cols, fleck){ for (let y = 0, i = 0; y < h; i++) { const bh = 14 + rnd(30); c.fillStyle = cols[i % cols.length]; c.fillRect(0, y, w, bh); y += bh; }
  c.fillStyle = fleck; for (let i = 0; i < 160; i++) { const x = rnd(w), y = rnd(h); c.beginPath(); c.arc(x, y, 2 + rnd(5), 0, 7); c.fill(); } }
function blobs(c, w, h, col, n){ c.fillStyle = col; for (let i = 0; i < n; i++) { const x = rnd(w), y = rnd(h), r = 8 + rnd(26); c.beginPath(); c.arc(x, y, r, 0, 7); c.fill(); } }
// a smoking volcano island on the horizon, the one the class is flying to
function island(c, x, y, s){
  c.lineJoin = 'round'; c.lineWidth = 4; c.strokeStyle = '#1a1320';
  c.fillStyle = '#4e7a4e'; c.beginPath(); c.ellipse(x, y, 170*s, 16*s, 0, Math.PI, 0); c.fill(); c.stroke();
  c.fillStyle = '#6a4462'; c.beginPath(); c.moveTo(x - 130*s, y); c.quadraticCurveTo(x - 50*s, y - 40*s, x - 22*s, y - 110*s); c.lineTo(x + 22*s, y - 110*s); c.quadraticCurveTo(x + 50*s, y - 40*s, x + 130*s, y); c.closePath(); c.fill(); c.stroke();
  c.fillStyle = '#ff8a3a'; c.beginPath(); c.ellipse(x, y - 110*s, 20*s, 6*s, 0, 0, 7); c.fill();
  c.fillStyle = 'rgba(230,220,235,.85)'; for (let k = 0; k < 5; k++) { c.beginPath(); c.arc(x + k*14*s, y - (130 + k*26)*s, (14 + k*6)*s, 0, 7); c.fill(); }
}
function rings(c, w, h, n){ c.strokeStyle = 'rgba(210,240,255,.8)'; c.lineWidth = 3; for (let i = 0; i < n; i++) { const x = rnd(w), y = rnd(h), r = 4 + rnd(14); c.beginPath(); c.arc(x, y, r, 0, 7); c.stroke(); } }

export function cabin(){
  const w = tripWorld({title:'The Wonder Bus', bg:0x1a1320, sky:0xfff0e0, groundCol:0x5a3a50, hemi:.9, sunCol:0xffe0c0, sunI:.35, fogNear:30, fogFar:60});
  w.area = () => 'On board';
  w.spawn = [MINE[0], MINE[1], FACE];
  const views = {}, panes = [];
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
      ink(0x2f8f8a, 7.2, .95, .1, 0, .47, z); ink(0x2f8f8a, 7.2, .5, .1, 0, 2.0, z); ink(C.gold, 7.2, .08, .12, 0, .96, z); ink(C.gold, 7.2, .08, .12, 0, 1.76, z);
      for (const px of [-3.35, -2.1, -.85, .4, 1.65, 2.9]) ink(0x24706b, .28, .82, .12, px, 1.36, z);
    }
    ink(0x2f8f8a, .1, 2.3, 2.8, -3.5, 1.15, 0);
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
    // the roof, a gentle arch, and the windshield frame and dashboard up front
    const roof = add(new THREE.CylinderGeometry(1.45, 1.45, 7.2, 20, 1, true, 0, Math.PI), T(0xb07a52, {side:THREE.BackSide}), 0, 2.2, 0, null, false);
    roof.rotation.z = Math.PI/2; roof.scale.set(.32, 1, 1);
    ink(0x2f8f8a, .1, .5, 2.8, 3.5, 2.05, 0); ink(0x2f8f8a, .1, .7, 2.8, 3.5, .35, 0);
    for (const sz of [-1, 1]) ink(0x24706b, .12, 1.3, .2, 3.5, 1.35, sz*1.3);
    ink(C.plum, .6, .55, 2.6, 3.1, .6, 0); ink(C.gold, .62, .06, 2.62, 3.1, .9, 0);
    for (let k = 0; k < 3; k++) add(new THREE.CircleGeometry(.11, 16), T(C.cream, {emissive:0xffd36b, emissiveIntensity:.4}), 2.79, .72, -.6 + k*.6, null, false).rotation.y = -Math.PI/2;
    for (const [sx, sz] of [...Object.values(SEATS), MINE, [-1.25, -.72], [-2.5, .72], [-2.5, -.72]]) {
      ink(C.plum, .55, .14, .9, sx, .26, sz); ink(C.plum, .12, .7, .9, sx - .3, .6, sz); ink(C.gold, .13, .06, .92, sx - .3, .96, sz);
      box(.5, .2, .1, T(C.ink), sx, .1, sz + Math.sign(sz)*.38);
    }
    box(.5, .3, .35, T(C.rust), -1.25, .48, -.72); box(.3, .14, .3, T(0xffd36b), -1.15, .5, -.4);
    // a rail for Dr. Sparks to hold up front
    box(.05, 2.2, .05, gold, 3.3, 1.1, -.7);
    bFlush(w.scene);
    // the views: big paintings just outside the openings, one canvas each side so they stream together
    for (const [name, v] of Object.entries(VIEWS)) {
      const t = tex(1024, 512, v.draw); t.wrapS = t.wrapT = THREE.RepeatWrapping; views[name] = {t, ...v};
    }
    for (const [x, z, ry, wd] of [[0, -2.6, 0, 9], [0, 2.6, Math.PI, 9], [4.6, 0, -Math.PI/2, 5], [-4.4, 0, Math.PI/2, 5]]) {
      const m = new THREE.MeshBasicMaterial({map:views.sky.t.clone(), fog:false}); m.map.needsUpdate = true;
      const pane = add(new THREE.PlaneGeometry(wd, 4), m, x, 1.5, z, null, false); pane.rotation.y = ry; panes.push({pane, dir: ry === Math.PI ? -1 : 1});
    }
  });
  // the class, sat down and facing the front, and Dr. Sparks standing by the windshield facing them
  const kids = {};
  for (const [id, [x, z]] of Object.entries(SEATS)) { const n = kids[id] = spawnNPC(w, id, x + .05, z, FACE); n.pose = 'sit'; n.range = 0; n.label.visible = false; }
  // by the door, out of the class shot's frame but facing the class for her own
  const sparks = spawnNPC(w, 'sparks', 3.0, -1.05, -Math.PI/2 - .5); sparks.range = 0; sparks.label.visible = false;
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
    teacher: (pos, look) => { pos.set(-.5, 1.9 + sway, 0); look.set(3.0, 1.5, -.95); },
    window:  (pos, look) => { pos.set(-1.1, 1.7 + sway, 0); look.set(-1.5, 1.35, -1.4); },
  };
  return {world:w, kids, sparks,
    view(name){ cur = views[name]; scroll = 0; for (const {pane} of panes) { pane.material.map = cur.t.clone(); pane.material.map.needsUpdate = true; pane.material.needsUpdate = true; } light.color.setHex(cur.light); },
    shot: name => SHOTS[name],
  };
}
