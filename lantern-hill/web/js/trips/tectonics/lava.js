// A lava lake at the bottom of a crater, alive on its own. Its top cools into dark crusty plates
// that drift out from wherever the hot rock wells up, glowing in the seams between them, which
// open and close as they jostle; plates that reach the shore sink, and new ones are born hot.
// Bubbles swell and pop, flinging blobs that arc and fall back; now and then a fountain spurts.
// The plates are a Voronoi of drifting seeds, painted on a canvas each frame; the blobs and
// embers are real 3D.
//
//   const lake = lavaLake(w, {r:4, y:-6.8});
//   lake.busy = 1;            // how lively it is: more bubbles and fountains while someone watches
//   lake.fountain(x, z, 1);   // a spurt at a spot in the world
//   lake.surge();             // everything at once, for when the volcano burps

import * as THREE from 'three';
import { glowTex } from '../../core/kit.js';

const S = 256, rnd = Math.random;
// a convex polygon cut by the half-plane nearer a than b
function clip(poly, ax, ay, bx, by){
  const mx = (ax + bx)/2, my = (ay + by)/2, nx = bx - ax, ny = by - ay, out = [];
  const side = ([x, y]) => (x - mx)*nx + (y - my)*ny;
  for (let i = 0; i < poly.length; i++) { const p = poly[i], q = poly[(i + 1) % poly.length], sp = side(p), sq = side(q);
    if (sp <= 0) out.push(p);
    if ((sp < 0) !== (sq < 0) && sp !== sq) { const k = sp/(sp - sq); out.push([p[0] + (q[0] - p[0])*k, p[1] + (q[1] - p[1])*k]); } }
  return out;
}
const HOT = new THREE.Color(0xffc040), WARM = new THREE.Color(0xff6a1a), COOL = new THREE.Color(0x8a2418);

export function lavaLake(w, {r = 4, y = 0} = {}){
  const can = document.createElement('canvas'); can.width = can.height = S; const g = can.getContext('2d');
  const map = new THREE.CanvasTexture(can); map.encoding = THREE.sRGBEncoding;
  const disc = new THREE.Mesh(new THREE.CircleGeometry(r, 48), new THREE.MeshBasicMaterial({map})); disc.rotation.x = -Math.PI/2; disc.position.y = y; w.scene.add(disc);
  // the heat shimmering just over the surface
  const haze = new THREE.Mesh(new THREE.CircleGeometry(r*1.05, 32), new THREE.MeshBasicMaterial({map:glowTex, color:0xff7a2a, transparent:true, opacity:.45, depthWrite:false, blending:THREE.AdditiveBlending}));
  haze.rotation.x = -Math.PI/2; haze.position.y = y + .25; w.scene.add(haze);
  const light = new THREE.PointLight(0xff7a3a, 2.2, 9, 2); light.position.set(0, y + 1.2, 0); w.scene.add(light);
  const toC = v => (v/r*.5 + .5)*S, toW = c => (c/S - .5)*2*r;

  // ---------- the crust: drifting seeds, each the heart of one plate ----------
  let well = [S*.5, S*.5];
  const seed = (x, z, age = 0) => ({x, y:z, age, shade:.85 + rnd()*.3, gap:1.5 + rnd()*2, ph:rnd()*7, sp:.4 + rnd()*.9});
  const plates = [];
  for (let i = 0; i < 26; i++) { const a = rnd()*7, d = Math.sqrt(rnd())*S*.48; plates.push(seed(S/2 + Math.cos(a)*d, S/2 + Math.sin(a)*d, 10 + rnd()*30)); }
  const pops = [], rings = [];

  // ---------- blobs flung up, and embers drifting off ----------
  const N = 70, blobGeo = new THREE.IcosahedronGeometry(1, 1);
  const blobs = new THREE.InstancedMesh(blobGeo, new THREE.MeshBasicMaterial({color:0xffffff}), N); blobs.frustumCulled = false; w.scene.add(blobs);
  blobs.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  const flying = [], m4 = new THREE.Matrix4(), q4 = new THREE.Quaternion(), v3 = new THREE.Vector3(), s3 = new THREE.Vector3(), up = new THREE.Vector3(0, 1, 0), col = new THREE.Color();
  blobs.setColorAt(0, col.set(0xffffff)); blobs.count = 0;
  const fling = (x, z, n, power, spread = 1) => { for (let i = 0; i < n && flying.length < N; i++) { const a = rnd()*7, h = power*(.5 + rnd()*.6);
    flying.push({x, y:y + .05, z, vx:Math.cos(a)*(.4 + rnd()*1.1)*power*spread, vz:Math.sin(a)*(.4 + rnd()*1.1)*power*spread, vy:3.2*h + rnd()*1.5, s:.05 + rnd()*.07*power, age:0}); } };
  const E = 40, ePos = new Float32Array(E*3), embers = [];
  for (let i = 0; i < E; i++) embers.push({age:rnd()*4, life:2 + rnd()*3, x:0, y:0, z:0, vx:0, vz:0});
  const eGeo = new THREE.BufferGeometry(); eGeo.setAttribute('position', new THREE.BufferAttribute(ePos, 3));
  const ePts = new THREE.Points(eGeo, new THREE.PointsMaterial({map:glowTex, color:0xffb050, size:.22, transparent:true, depthWrite:false, blending:THREE.AdditiveBlending})); ePts.frustumCulled = false; w.scene.add(ePts);

  const lake = {disc, light, busy:0, flare:0,
    // a bubble swells there, then pops and flings blobs
    bubble(x, z, big = rnd()){ pops.push({x:toC(x), y:toC(z), t:0, grow:.8 + big*1.2, size:5 + big*12}); },
    fountain(x, z, power = 1){ pops.push({x:toC(x), y:toC(z), t:0, grow:.25, size:9, spurt:1.4 + power*1.6, power}); },
    // somewhere on the lake not too near its shore, in the world
    spot(){ const a = rnd()*7, d = Math.sqrt(rnd())*r*.75; return [Math.cos(a)*d, Math.sin(a)*d]; },
    surge(){ lake.flare = 1; for (let i = 0; i < 3; i++) lake.fountain(...lake.spot(), 1.2 + rnd()*.8); for (let i = 0; i < 4; i++) lake.bubble(...lake.spot(), 1); },
    splash(x, z){ rings.push({x:toC(x), y:toC(z), t:0}); fling(x, z, 8, .9); lake.flare = Math.max(lake.flare, .5); },
  };

  let nextBubble = 0, nextFountain = 4, nextWell = 8, paintAcc = 0;
  w.anims.push((dt, tt) => {
    const busy = lake.busy;
    if ((nextBubble -= dt*(1 + busy*2)) < 0) { nextBubble = .4 + rnd()*1.4; lake.bubble(...lake.spot()); }
    if ((nextFountain -= dt*(1 + busy*2.5)) < 0) { nextFountain = 8 + rnd()*16; lake.fountain(...lake.spot(), .6 + rnd()*1.1); }
    // the upwelling wanders, so the plates never drift the same way twice
    if ((nextWell -= dt) < 0) { nextWell = 10 + rnd()*20; const a = rnd()*7, d = rnd()*S*.22; well = [S/2 + Math.cos(a)*d, S/2 + Math.sin(a)*d]; }
    for (const p of plates) { const dx = p.x - well[0], dy = p.y - well[1], d = Math.hypot(dx, dy) + 1;
      p.x += (dx/d*4.5*p.sp + Math.sin(tt*.3 + p.ph)*1.2)*dt; p.y += (dy/d*4.5*p.sp + Math.cos(tt*.27 + p.ph)*1.2)*dt; p.age += dt;
      // sunk at the shore, reborn hot where the rock wells up
      if (Math.hypot(p.x - S/2, p.y - S/2) > S*.56) Object.assign(p, seed(well[0] + (rnd() - .5)*30, well[1] + (rnd() - .5)*30)); }
    for (let i = pops.length - 1; i >= 0; i--) { const b = pops[i]; b.t += dt;
      if (b.spurt) { if (b.t > b.grow && b.t < b.grow + b.spurt && rnd() < dt*26) fling(toW(b.x), toW(b.y), 1, b.power*1.1, .35); if (b.t > b.grow + b.spurt) { pops.splice(i, 1); rings.push({x:b.x, y:b.y, t:0}); } }
      else if (b.t > b.grow) { pops.splice(i, 1); rings.push({x:b.x, y:b.y, t:0}); fling(toW(b.x), toW(b.y), 3 + Math.round(b.size/3), .6 + b.size/16);
        // a pop cracks the crust: a new plate where it burst
        const old = plates.reduce((a, p) => p.age > a.age ? p : a); Object.assign(old, seed(b.x + (rnd() - .5)*6, b.y + (rnd() - .5)*6)); } }
    for (let i = rings.length - 1; i >= 0; i--) if ((rings[i].t += dt) > 1.2) rings.splice(i, 1);
    lake.flare = Math.max(0, lake.flare - dt*.4);
    light.intensity = 1.3 + Math.sin(tt*3.1)*.2 + Math.sin(tt*7.3)*.1 + lake.flare*1.2 + pops.filter(b => b.spurt && b.t > b.grow).length*.25;
    haze.material.opacity = .4 + Math.sin(tt*2.1)*.06 + lake.flare*.3;

    paintAcc += dt; if (paintAcc > 1/30) { paintAcc = 0; paint(tt); }

    // blobs: thrown up hot, falling back cooler, and splashing where they land
    let n = 0;
    for (let i = flying.length - 1; i >= 0; i--) { const b = flying[i]; b.age += dt; b.vy -= 7.5*dt; b.x += b.vx*dt; b.y += b.vy*dt; b.z += b.vz*dt;
      if (b.y < y && b.vy < 0) { if (b.s > .12 && rings.length < 30) rings.push({x:toC(b.x), y:toC(b.z), t:.5}); flying.splice(i, 1); continue; } }
    for (const b of flying) { v3.set(b.vx, b.vy, b.vz); const sp = v3.length(); q4.setFromUnitVectors(up, v3.normalize());
      m4.compose(v3.set(b.x, b.y, b.z), q4, s3.set(b.s, b.s*(1 + Math.min(1.4, sp*.12)), b.s)); blobs.setMatrixAt(n, m4);
      blobs.setColorAt(n, col.copy(HOT).lerp(WARM, Math.min(1, b.age*1.4)).lerp(COOL, Math.max(0, b.age - .8)*.8)); n++; }
    blobs.count = n; blobs.instanceMatrix.needsUpdate = true; if (blobs.instanceColor) blobs.instanceColor.needsUpdate = true;
    embers.forEach((e, i) => { e.age += dt; if (e.age > e.life) { const [x, z] = lake.spot(); Object.assign(e, {age:0, life:2 + rnd()*3, x, y:y + .2, z, vx:(rnd() - .5)*.3, vz:(rnd() - .5)*.3}); }
      e.x += e.vx*dt + Math.sin(tt*2 + i)*.004; e.z += e.vz*dt; e.y += (.9 + busy*.4)*dt; ePos.set([e.x, e.y, e.z], i*3); });
    eGeo.attributes.position.needsUpdate = true;
  });

  function paint(tt){
    // what shows between plates: hot molten rock, brightest where it wells up
    const bg = g.createRadialGradient(well[0], well[1], 4, S/2, S/2, S*.6); bg.addColorStop(0, '#ffd75a'); bg.addColorStop(.6, '#ff9a30'); bg.addColorStop(1, '#ef6a24');
    g.fillStyle = bg; g.fillRect(0, 0, S, S);
    const cells = plates.map(p => { let poly = [[-20, -20], [S + 20, -20], [S + 20, S + 20], [-20, S + 20]];
      for (const o of plates) if (o !== p && Math.abs(o.x - p.x) < 90 && Math.abs(o.y - p.y) < 90) { poly = clip(poly, p.x, p.y, o.x, o.y); if (poly.length < 3) break; }
      return poly; });
    const path = poly => { g.beginPath(); poly.forEach(([x, y], i) => i ? g.lineTo(x, y) : g.moveTo(x, y)); g.closePath(); };
    g.lineJoin = 'round';
    plates.forEach((p, i) => { const poly = cells[i]; if (poly.length < 3) return;
      // newborn crust is still dull red; it darkens to near black as it cools
      const k = Math.min(1, p.age/7), sh = p.shade;
      path(poly); g.fillStyle = `rgb(${(130 - k*82)*sh|0},${(40 - k*12)*sh|0},${(34 + k*8)*sh|0})`; g.fill();
      // a softer, lighter pillow on each plate, so they read as lumpy rafts, not tiles
      const cx = poly.reduce((a, q) => a + q[0], 0)/poly.length, cy = poly.reduce((a, q) => a + q[1], 0)/poly.length;
      g.beginPath(); poly.forEach(([x, y], j) => { const px = cx + (x - cx)*.62 - 1.5, py = cy + (y - cy)*.62 - 1.5; j ? g.lineTo(px, py) : g.moveTo(px, py); }); g.closePath();
      g.fillStyle = `rgba(${(160 - k*90)|0},${(64 - k*22)|0},${(64 - k*10)|0},.5)`; g.fill(); });
    // the seams breathe: each plate's edge opens and closes on its own slow beat
    for (const [w0, colr] of [[2.6, 'rgba(255,110,40,.85)'], [1.1, '#ffd060'], [.4, '#fff4b8']])
      plates.forEach((p, i) => { if (cells[i].length < 3) return; const gap = Math.max(.3, p.gap*(.55 + .55*Math.sin(tt*.6*p.sp + p.ph)));
        path(cells[i]); g.strokeStyle = colr; g.lineWidth = gap*w0; g.stroke(); });
    for (const b of pops) { const k = Math.min(1, b.t/b.grow), rr = b.size*(b.spurt ? 1 + .3*Math.sin(b.t*20) : k);
      g.fillStyle = '#ff9a30'; g.beginPath(); g.arc(b.x, b.y, rr*1.35, 0, 7); g.fill();
      g.fillStyle = '#ffe27a'; g.beginPath(); g.arc(b.x, b.y, rr, 0, 7); g.fill();
      g.fillStyle = '#fffbe0'; g.beginPath(); g.arc(b.x - rr*.3, b.y - rr*.3, rr*.35, 0, 7); g.fill(); }
    for (const o of rings) { const k = o.t/1.2; g.strokeStyle = `rgba(255,190,80,${.8*(1 - k)})`; g.lineWidth = 2*(1 - k) + .5; g.beginPath(); g.arc(o.x, o.y, 3 + k*18, 0, 7); g.stroke(); }
    map.needsUpdate = true;
  }
  paint(0);
  return lake;
}
