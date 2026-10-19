// The lesson shots: a storybook diagram the camera cuts to mid-ride, with the Wonder Bus drawn on it,
// so the explorer sees where the bus is going and how deep it is.
//
// 'earth' is a slice down through the planet under the trip's route. The island volcano sits where
// an ocean plate dives under the island's plate; the ocean floor spreads from a ridge to the east;
// the mantle under both turns over in slow loops. 'map' is the Atlantic seen from above, Africa and
// South America sliding apart from the ridge between them.
//
//   const dg = diagram();
//   t.watch(dg.world, dg.frame(800, 400, 1));   // aim at a canvas point, zoomed
//   await dg.travel([[800, 140], [800, 420]], 5);

import * as THREE from 'three';
import { clamp01, ease, rrect } from '../../core/kit.js';
import { tripWorld } from '../stop-kit.js';

const W = 1600, H = 1000, PW = 16, PH = 10;
// the planet: centre far below the page, so its surface is a gentle arc across the top
const EC = [800, 1950], R = 1750, MANTLE = 790, CRUST = 30;
const SURF = 200, TRENCH = 930, RIDGE = 1260, VOLCANO = 790;
const KM = 2900/MANTLE;
// Africa and South America as they are now, in map pixels, and how far each has drifted from the ridge
const AFRICA = [[930,250],[900,300],[885,345],[882,385],[930,430],[942,490],[960,590],[990,665],[1020,690],[1060,640],[1100,525],[1140,430],[1165,380],[1115,345],[1080,265],[1020,240]];
const SAMERICA = [[560,330],[660,360],[678,392],[725,430],[736,490],[750,580],[712,640],[662,715],[632,655],[605,555],[572,465],[546,390]];

export function diagram(){
  const w = tripWorld({title:'The Wonder Bus', bg:0x1a1320, hemi:1, sunI:0, fogNear:100, fogFar:200});
  w.area = () => 'On board';
  w.spawn = [0, 30, 0];
  const cv = document.createElement('canvas'); cv.width = W; cv.height = H; const c = cv.getContext('2d');
  const tx = new THREE.CanvasTexture(cv); tx.encoding = THREE.sRGBEncoding; tx.anisotropy = 4;
  const page = new THREE.Mesh(new THREE.PlaneGeometry(PW, PH), new THREE.MeshBasicMaterial({map:tx, fog:false})); w.scene.add(page);
  const frame = new THREE.Mesh(new THREE.PlaneGeometry(PW + .5, PH + .5), new THREE.MeshBasicMaterial({color:0xd9a441})); frame.position.z = -.02; w.scene.add(frame);
  const parts = [];
  for (let i = 0; i < 220; i++) parts.push({cell: i % 2, a: Math.random()*Math.PI*2, r: .25 + Math.random()*.75});
  const melts = [];
  const waves = Array.from({length:70}, () => [Math.random()*W, Math.random()*H, 14 + Math.random()*14]);
  const S = {view:[W/2, H/2, 1], mode:'earth', bus:null, busA:0, gear:'drill', labels:new Set(), depth:false, melt:false, sep:1, t:0, slab:0, ridgeOpen:0};
  let trip = null;
  const toWorld = (x, y) => [(x/W - .5)*PW, (.5 - y/H)*PH];
  const INK = '#1a1320';
  // every word on the page in one style, the notebook stickers' own
  const label = (text, x, y, size = 40, fill = '#efe0bf') => { c.font = `${size}px Caprasimo, Georgia, serif`; c.lineJoin = 'round'; c.lineWidth = size*.24; c.strokeStyle = INK; c.strokeText(text, x, y); c.fillStyle = fill; c.fillText(text, x, y); };
  const plaque = (x, y, w, h) => { c.fillStyle = 'rgba(26,19,32,.88)'; rrect(c, x, y, w, h, 18); c.fill(); c.strokeStyle = '#d9a441'; c.lineWidth = 5; rrect(c, x, y, w, h, 18); c.stroke(); };

  function surfaceY(x){ return EC[1] - Math.sqrt(R*R - (x - EC[0])**2); }
  function drawEarth(){
    const g = c.createLinearGradient(0, 0, 0, SURF); g.addColorStop(0, '#5a5a9a'); g.addColorStop(1, '#e8b8a8'); c.fillStyle = g; c.fillRect(0, 0, W, H);
    const arc = (r, fill) => { c.beginPath(); c.arc(EC[0], EC[1], r, Math.PI, 0); c.lineTo(W, H); c.lineTo(0, H); c.closePath(); c.fillStyle = fill; c.fill();
      c.beginPath(); c.arc(EC[0], EC[1], r, Math.PI, 0); c.strokeStyle = INK; c.lineWidth = 5; c.stroke(); };
    // ocean over the floor east of the trench
    c.fillStyle = '#3a78a8'; c.beginPath(); c.moveTo(TRENCH - 30, surfaceY(TRENCH) - 46); c.lineTo(W, surfaceY(W) - 46); c.lineTo(W, surfaceY(W) + 10); c.lineTo(TRENCH - 30, surfaceY(TRENCH) + 10); c.fill();
    arc(R, '#8a5a3a');
    const mg = c.createRadialGradient(EC[0], EC[1], R - MANTLE - 40, EC[0], EC[1], R - CRUST);
    mg.addColorStop(0, '#ffb050'); mg.addColorStop(.25, '#e0602e'); mg.addColorStop(1, '#8a3424'); arc(R - CRUST, mg);
    arc(R - MANTLE, '#ffd36b');
    // the mantle turning over: up under the ridge, along under the plate, down at the trench
    for (const q of parts) {
      q.a -= .004*(.6 + S.t*0)/(q.r*.7 + .3);
      const cx = q.cell ? 1560 : 1095, rx = q.cell ? 300 : 165, cy = 590, ry = 330, dir = q.cell ? 1 : -1;
      const x = cx + dir*rx*q.r*Math.cos(q.a), y = cy + ry*q.r*Math.sin(q.a), hot = clamp01((y - 300)/560);
      c.fillStyle = `rgba(255,${110 + hot*140},${60 + hot*100},${.4 + hot*.5})`; c.beginPath(); c.arc(x, y, 4 + hot*3, 0, 7); c.fill();
    }
    c.strokeStyle = 'rgba(255,240,200,.6)'; c.lineWidth = 5;
    for (const [cx, rx, dir] of [[1095, 150, -1], [1560, 270, 1]]) { c.beginPath(); c.ellipse(cx, 590, rx, 290, 0, 0, Math.PI*2); c.stroke();
      const ax = cx + dir*rx; c.beginPath(); c.moveTo(ax - 12, 600); c.lineTo(ax, 580); c.lineTo(ax + 12, 600); c.stroke(); }
    // the ocean plate diving under the island's plate at the trench, and melt rising off it
    c.save(); c.translate(TRENCH, surfaceY(TRENCH) + 6); c.rotate(Math.PI - .62);
    c.fillStyle = '#5a4a5a'; c.strokeStyle = INK; c.lineWidth = 5; c.fillRect(-20 - S.slab*40, 0, 380 + S.slab*40, 30); c.strokeRect(-20 - S.slab*40, 0, 380 + S.slab*40, 30); c.restore();
    for (const m of melts) { c.fillStyle = `rgba(255,${160 + m.k*80},80,${.85 - m.k*.3})`; c.beginPath(); c.arc(m.x, m.y, 9 - m.k*3, 0, 7); c.fill(); }
    // the ridge's crack, opening as new rock wells up
    c.fillStyle = '#ffb050'; c.beginPath(); const ry0 = surfaceY(RIDGE); c.moveTo(RIDGE - 8 - S.ridgeOpen*6, ry0 - 4); c.lineTo(RIDGE + 8 + S.ridgeOpen*6, ry0 - 4); c.lineTo(RIDGE, ry0 + CRUST + 8); c.fill();
    // the island and its volcano, and the magma chamber feeding it
    const vy = surfaceY(VOLCANO);
    c.fillStyle = '#4e7a4e'; c.strokeStyle = INK; c.lineWidth = 4; c.fillRect(VOLCANO - 340, vy - 6, 172, 8); c.strokeRect(VOLCANO - 340, vy - 6, 172, 8);
    c.fillStyle = '#5a4048'; c.lineJoin = 'round'; c.lineWidth = 5; c.beginPath(); c.moveTo(VOLCANO - 170, vy + 2); c.quadraticCurveTo(VOLCANO - 60, vy - 40, VOLCANO - 18, vy - 86); c.lineTo(VOLCANO + 18, vy - 86); c.quadraticCurveTo(VOLCANO + 60, vy - 40, VOLCANO + 170, vy + 2); c.fill(); c.stroke();
    c.fillStyle = '#ff8a3a'; c.beginPath(); c.ellipse(VOLCANO, vy + 18, 40, 13, 0, 0, 7); c.fill(); c.fillRect(VOLCANO - 5, vy - 84, 10, 100);
    // the labels the bus has passed, and how deep it is
    c.textAlign = 'center'; c.textBaseline = 'middle';
    const shown = (id, text, x, y, size) => { if (S.labels.has(id)) label(text, x, y, size); };
    shown('crust', 'CRUST', 560, surfaceY(560) + 46, 34); shown('chamber', 'magma chamber', VOLCANO + 200, vy + 50, 30); shown('mantle', 'MANTLE', 430, 520, 56);
    shown('ridge', 'ridge', RIDGE, surfaceY(RIDGE) - 78, 34); shown('trench', 'trench', TRENCH + 20, surfaceY(TRENCH) - 64, 32);
    shown('plates', 'one plate dives under', TRENCH + 120, surfaceY(TRENCH) + 140, 30);
    // the core only peeks in at the page's foot, under the dialogue, so its label stands up in the mantle and points down
    if (S.labels.has('core')) { label('CORE', 800, 720, 44);
      for (const [col, lw] of [[INK, 12], ['#efe0bf', 5]]) { c.strokeStyle = col; c.lineWidth = lw; c.lineCap = 'round'; c.beginPath(); c.moveTo(800, 756); c.lineTo(800, 930); c.moveTo(782, 908); c.lineTo(800, 934); c.lineTo(818, 908); c.stroke(); } }
    // the depth sits at the top middle of whatever frame() shows (its 45° camera), clear of the corner buttons, the same size at any zoom
    if (S.depth && S.bus) { const d = Math.max(0, Math.round((S.bus[1] - surfaceY(S.bus[0]))*KM/10)*10), [vx, vy0, zoom] = S.view;
      c.save(); c.translate(vx, vy0 - 11.6*Math.tan(Math.PI/8)*H/PH/zoom); c.scale(1/zoom, 1/zoom); plaque(-140, 22, 280, 92);
      label('DEPTH', 0, 46, 22, '#d9a441'); label(`${d.toLocaleString()} km`, 0, 86, 38, '#ffd36b'); c.restore(); }
  }
  function drawMap(){
    // a storybook sea: soft and deep at the edges, lighter in the middle, dotted with little waves
    c.textBaseline = 'alphabetic'; const sea = c.createRadialGradient(W/2, H/2, 100, W/2, H/2, W*.62); sea.addColorStop(0, '#4f8fb8'); sea.addColorStop(1, '#2a5684'); c.fillStyle = sea; c.fillRect(0, 0, W, H);
    c.strokeStyle = 'rgba(239,240,255,.22)'; c.lineWidth = 4; c.lineCap = 'round';
    for (const [x, y, r] of waves) { c.beginPath(); c.arc(x - r, y, r, Math.PI*1.15, Math.PI*1.85); c.arc(x + r*.9, y, r, Math.PI*1.15, Math.PI*1.85); c.stroke(); }
    // the ridge down the middle of the ocean, glowing where the plates pull apart
    c.strokeStyle = '#ffb050'; c.lineWidth = 7; c.setLineDash([22, 12]); c.beginPath();
    for (const [x, y] of [[815, 0], [800, 200], [830, 360], [790, 520], [810, 700], [780, 1000]]) c.lineTo(x, y); c.stroke(); c.setLineDash([]);
    const land = (pts, dx, fill) => { c.beginPath(); pts.forEach(([x, y]) => c.lineTo(x + dx, y)); c.closePath(); c.lineWidth = 26; c.lineJoin = 'round'; c.strokeStyle = 'rgba(239,240,255,.16)'; c.stroke();
      c.fillStyle = fill; c.fill(); c.strokeStyle = INK; c.lineWidth = 5; c.stroke(); };
    // sep 1 is today; 0 is when they fitted together, long ago
    land(AFRICA, -95*(1 - S.sep), '#d9b77a'); land(SAMERICA, 75*(1 - S.sep), '#8fb86a');
    c.textAlign = 'center';
    label('Africa', 1020 - 95*(1 - S.sep), 470); label('South', 655 + 75*(1 - S.sep), 470); label('America', 655 + 75*(1 - S.sep), 515);
    if (S.labels.has('ridge')) label('the ridge', 930, 150, 30, '#ffd36b');
    if (S.labels.has('years')) { plaque(130, 116, 420, 72); c.textBaseline = 'middle'; label(S.sep < .05 ? '200 million years ago' : S.sep > .95 ? 'today' : `${Math.round((1 - S.sep)*200)} million years ago`, 340, 154, 30); }
  }
  function drawBus(){
    if (!S.bus) return;
    const [x, y] = S.bus;
    c.save(); c.translate(x, y); c.rotate(S.busA);
    c.fillStyle = 'rgba(255,240,180,.35)'; c.beginPath(); c.arc(0, 0, 46, 0, 7); c.fill();
    c.fillStyle = '#2f8f8a'; c.strokeStyle = '#1a1320'; c.lineWidth = 4; rrect(c, -34, -14, 60, 28, 8); c.fill(); c.stroke();
    c.fillStyle = '#a8dcef'; for (let k = 0; k < 3; k++) c.fillRect(-26 + k*16, -9, 11, 9);
    if (S.gear === 'drill') { c.fillStyle = '#d9a441'; c.beginPath(); c.moveTo(26, -13); c.lineTo(52, 0); c.lineTo(26, 13); c.closePath(); c.fill(); c.stroke(); }
    if (S.gear === 'sub') { c.fillStyle = '#d9a441'; c.fillRect(-42, -10, 8, 20); }
    c.restore();
  }
  w.anims.push((dt, tt) => {
    S.t = tt;
    if (trip) { trip.t += dt; const u = ease(clamp01(trip.t/trip.dur)); trip.curve.getPointAt(u, trip.p); trip.curve.getTangentAt(u, trip.tan);
      S.bus = [trip.p.x, trip.p.y]; S.busA = Math.atan2(trip.tan.y, trip.tan.x);
      if (S.mode === 'earth' && trip.reveal) { const below = S.bus[1] - surfaceY(S.bus[0]);
        if (below > 4) S.labels.add('crust'); if (below > 34) S.labels.add('chamber'); if (below > 120) S.labels.add('mantle'); if (below > 300) S.labels.add('core'); }
      if (trip.t >= trip.dur) { const f = trip.done; trip = null; f(); } }
    // melt leaves the top of the diving slab once it's deep, and rises to the volcano
    if (S.melt) { if (Math.random() < dt*3) { const x = TRENCH - 120 - Math.random()*160; melts.push({x, y:surfaceY(TRENCH) - 4 + (TRENCH - x)*Math.tan(.62), k:0}); }
      for (const m of melts) { m.k = Math.min(1, m.k + dt*.35); m.x += (VOLCANO - m.x)*dt*.5; m.y += (surfaceY(VOLCANO) + 18 - m.y)*dt*.5; }
      while (melts.length && melts[0].k >= 1) melts.shift(); }
    if (S.mode === 'earth') drawEarth(); else drawMap();
    drawBus(); tx.needsUpdate = true;
  });
  return {world:w, S,
    // a camera square on to the page, centred on canvas point (x, y), `zoom` times closer than the whole page
    frame(x, y, zoom = 1, drift = 0){ const [wx, wy] = toWorld(x, y); return (pos, look) => { const k = Math.sin(S.t*.4)*drift; pos.set(wx + k, wy, 11.6/zoom); look.set(wx + k, wy, 0); S.view = [x, y, zoom]; return true; }; },
    travel(points, dur, reveal = true){ const curve = new THREE.CatmullRomCurve3(points.map(([x, y]) => new THREE.Vector3(x, y, 0)), false, 'centripetal');
      return new Promise(done => { trip = {curve, dur, t:0, p:new THREE.Vector3(), tan:new THREE.Vector3(), done, reveal}; }); },
    surfaceY, TRENCH, RIDGE, VOLCANO,
  };
}
