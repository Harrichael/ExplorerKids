// The lab's loose stuff that isn't a thing you can pick up: falling grains and drops, foam, bubbles,
// lava-lamp blobs, pour streams, puddles, and the skin on top of a liquid where food coloring
// swirls and pepper scatters. The desk tells it where containers are and takes what lands in them.

import * as THREE from 'three';
import { grad } from '../core/kit.js';

const MAX = 700;
const hex = c => '#' + c.toString(16).padStart(6, '0');

// world: {under(x, z) -> vessel or null, top(v) -> its contents' surface height, waterTop(v), oilTop(v),
//         deliver(v, payload, x, z), spill(x, z, amount, col), inside(v) -> still upright and on the desk}
export function makeFx(root, world){
  const solid = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 8, 6), new THREE.MeshToonMaterial({gradientMap:grad, color:0xffffff}), MAX);
  const fizz = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 6, 4), new THREE.MeshToonMaterial({gradientMap:grad, color:0xffffff, transparent:true, opacity:.6, depthWrite:false}), MAX);
  // the color buffer is sized from count, so it has to exist before count drops to the live number
  solid.setColorAt(0, new THREE.Color()); solid.instanceColor.setUsage(THREE.DynamicDrawUsage);
  for (const m of [solid, fizz]) { m.frustumCulled = false; m.count = 0; m.instanceMatrix.setUsage(THREE.DynamicDrawUsage); root.add(m); }
  solid.castShadow = true; fizz.renderOrder = 2;
  const ps = [], m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), sc = new THREE.Vector3(), pos = new THREE.Vector3(), col = new THREE.Color();

  const spawn = p => { if (ps.length < MAX) ps.push(Object.assign({t:0, vx:0, vy:0, vz:0}, p)); };
  // inside a container, particles ride along with it in its own frame
  const at = p => p.host ? pos.set(p.host.x + p.ox, p.host.y + p.oy, p.host.z + p.oz) : pos.set(p.x, p.y, p.z);

  function step(p, dt){
    p.t += dt;
    switch (p.kind) {
      case 'grain': case 'drop': {
        p.vy -= 5*dt; const y0 = p.y; p.x += p.vx*dt; p.y += p.vy*dt; p.z += p.vz*dt; p.vx *= .97; p.vz *= .97;
        const v = world.under(p.x, p.z);
        if (v) { const top = v.y + world.top(v); if (p.y <= top && y0 >= top - .05) { world.deliver(v, p.payload, p.x, p.z); return false; } if (p.y < top - .05) return false; }
        else if (p.y <= 0) { if (Math.abs(p.x) < .85 && Math.abs(p.z) < .6) world.spill(p.x, p.z, .4, p.col); return false; }
        return p.y > -1.2;
      }
      case 'foam': {
        // foam heaps out of the mouth, slides down the outside and spreads on the desk, then pops
        const v = p.from; p.vy -= .7*dt; p.x += p.vx*dt; p.y += p.vy*dt; p.z += p.vz*dt;
        const dx = p.x - v.x, dz = p.z - v.z, rho = Math.hypot(dx, dz) || 1e-4;
        let floor = 0;
        if (v.def.cone) { const m = v.def.mouth, R = v.def.r; if (rho < R) floor = v.y + v.def.h*(1 - Math.max(0, rho - m)/(R - m)); }
        else if (rho < v.def.r) floor = v.y + v.def.h;
        floor += p.s*.7 + p.lay;
        if (p.y < floor) { p.y = floor; p.vy = 0; const slide = floor > .01 + p.s ? .09 : 0; p.vx += dx/rho*slide*dt*6; p.vz += dz/rho*slide*dt*6; }
        p.vx *= Math.exp(-2.5*dt); p.vz *= Math.exp(-2.5*dt);
        if (p.t > p.life) p.s *= Math.exp(-3*dt);
        return p.s > .002;
      }
      case 'bubble': {
        if (!world.inside(p.host)) return false;
        p.oy += (.12 + p.s*4)*dt; p.ox += Math.sin(p.t*9 + p.ph)*.004*dt*10;
        return p.oy < world.top(p.host) - .002;
      }
      case 'blob': {
        // a bubble carries colored water up through the oil, lets go at the top, and the blob sinks home
        if (!world.inside(p.host)) return false;
        const wt = world.waterTop(p.host), ot = world.oilTop(p.host);
        if (p.up) { p.oy += .05*dt; if (p.oy >= ot - p.s) p.up = false; }
        else p.oy -= .04*dt;
        p.ox += Math.sin(p.t*1.7 + p.ph)*.004*dt;
        return p.up || p.oy > wt;
      }
      case 'bead': {
        if (!world.inside(p.host)) return false;
        p.oy -= .035*dt;
        const wt = world.waterTop(p.host);
        if (p.oy <= wt + p.s*.5) { world.deliver(p.host, p.payload, p.host.x + p.ox, p.host.z + p.oz, true); return false; }
        return true;
      }
      case 'oildrop': {
        if (!world.inside(p.host)) return false;
        p.oy += .06*dt; return p.oy < world.waterTop(p.host) - .002;
      }
      case 'splash': { p.vy -= 5*dt; p.x += p.vx*dt; p.y += p.vy*dt; p.z += p.vz*dt; return p.t < .45; }
    }
    return false;
  }

  // ---------- pour streams ----------
  const streams = new Map(), CYL = new THREE.CylinderGeometry(1, 1, 1, 8, 1, true);
  function stream(key, x, yTop, z, yBot, r, c, op=.85){
    let s = streams.get(key);
    if (!s) { s = new THREE.Mesh(CYL, new THREE.MeshToonMaterial({gradientMap:grad, transparent:true, depthWrite:false})); s.renderOrder = 2; root.add(s); streams.set(key, s); }
    const h = Math.max(.001, yTop - yBot); s.position.set(x, yBot + h/2, z); s.scale.set(r, h, r); s.material.color.setHex(c); s.material.opacity = op; s.visible = true; s.seen = true;
  }

  // ---------- puddles ----------
  const puddles = [], DISC = new THREE.CircleGeometry(1, 24);
  function spill(x, z, amt, c){
    let p = puddles.find(p => Math.hypot(p.x - x, p.z - z) < p.r + .03);
    if (!p) {
      if (puddles.length >= 14) { const old = puddles.shift(); root.remove(old.m); old.m.material.dispose(); }
      const m = new THREE.Mesh(DISC, new THREE.MeshToonMaterial({gradientMap:grad, transparent:true, depthWrite:false, opacity:.7})); m.rotation.x = -Math.PI/2; m.renderOrder = 1; root.add(m);
      p = {m, x, z, vol:0, r:0, age:0, col:c}; puddles.push(p);
    }
    p.vol += amt; p.age = 0; p.r = Math.min(.2, .012 + Math.sqrt(p.vol)*.011); p.m.material.color.setHex(c);
    p.m.position.set(p.x, .002 + puddles.indexOf(p)*.0002, p.z); p.m.scale.setScalar(p.r);
  }

  // ---------- the skin on top of a liquid ----------
  const films = new Map();
  function film(v){
    let f = films.get(v); if (f) return f;
    const N = 128, cv = document.createElement('canvas'), trail = document.createElement('canvas'); cv.width = cv.height = trail.width = trail.height = N;
    const texture = new THREE.CanvasTexture(cv); texture.encoding = THREE.sRGBEncoding;
    const mesh = new THREE.Mesh(new THREE.CircleGeometry(1, 32), new THREE.MeshToonMaterial({gradientMap:grad, map:texture, transparent:true, depthWrite:false})); mesh.rotation.x = -Math.PI/2; mesh.renderOrder = 2; root.add(mesh);
    f = {v, cv, g:cv.getContext('2d'), trail, tg:trail.getContext('2d'), texture, mesh, blobs:[], flakes:[], soaps:0, dirty:true,
      dye(u, w, c){ f.blobs.push({x:u, y:w, vx:0, vy:0, r:.13, col:hex(c), t:0}); f.dirty = true; },
      pepper(u, w, n){ for (let i = 0; i < n; i++) f.flakes.push({x:u + (Math.random() - .5)*.25, y:w + (Math.random() - .5)*.25, vx:0, vy:0, a:Math.random()*3}); f.dirty = true; },
      // soap breaks the skin: everything on it rushes away from where the soap touched, swirling as it goes
      soap(u, w){
        const s = 2.2/(1 + f.soaps*.5); f.soaps++;
        const kids = [];
        for (const b of f.blobs) {
          const dx = b.x - u, dy = b.y - w, d = Math.hypot(dx, dy) || .01, k = s*.9/(d + .3);
          b.vx += dx/d*k - dy/d*k*.6; b.vy += dy/d*k + dx/d*k*.6; b.t = 0;
          if (f.blobs.length + kids.length < 150) for (const a of [-.7, .7]) kids.push({x:b.x, y:b.y, vx:b.vx*Math.cos(a) - b.vy*Math.sin(a), vy:b.vx*Math.sin(a) + b.vy*Math.cos(a), r:b.r*.7, col:b.col, t:0});
        }
        f.blobs.push(...kids);
        for (const p of f.flakes) { const dx = p.x - u, dy = p.y - w, d = Math.hypot(dx, dy) || .01; p.vx += dx/d*s*2.2; p.vy += dy/d*s*2.2; }
        f.dirty = true; return f.blobs.length + f.flakes.length > 0;
      },
      swirl(k){ for (const b of [...f.blobs, ...f.flakes]) { b.vx += -b.y*k; b.vy += b.x*k; b.t = 0; } if (k) f.dirty = true; },
      has(){ return f.blobs.length + f.flakes.length > 0; },
      clear(){ f.blobs.length = f.flakes.length = 0; f.tg.clearRect(0, 0, N, N); f.dirty = true; }
    };
    films.set(v, f); return f;
  }
  function filmStep(f, dt){
    const v = f.v, N = f.cv.width, H = N/2;
    f.mesh.visible = f.has() && world.inside(v) && world.top(v) > v.def.floor + .002;
    if (!f.mesh.visible) return;
    f.mesh.position.set(v.x, v.y + world.top(v) + .0015, v.z); f.mesh.scale.setScalar(v.def.ri*.97);
    const move = (b, damp, lim) => {
      b.x += b.vx*dt; b.y += b.vy*dt; const e = Math.exp(-damp*dt); b.vx *= e; b.vy *= e;
      const d = Math.hypot(b.x, b.y); if (d > lim) { b.x *= lim/d; b.y *= lim/d; const rad = (b.vx*b.x + b.vy*b.y)/(d*d); b.vx -= rad*b.x; b.vy -= rad*b.y; }
      return Math.abs(b.vx) + Math.abs(b.vy);
    };
    for (const b of f.blobs) {
      const sp = move(b, 1.1, .9); b.t += dt; if (b.r < .2) b.r += dt*.008;
      if (sp > .01 || b.t < .5) {
        const gr = f.tg.createRadialGradient(H + b.x*H, H + b.y*H, 0, H + b.x*H, H + b.y*H, b.r*H);
        gr.addColorStop(0, b.col + 'cc'); gr.addColorStop(1, b.col + '00');
        f.tg.fillStyle = gr; f.tg.beginPath(); f.tg.arc(H + b.x*H, H + b.y*H, b.r*H, 0, 7); f.tg.fill(); f.dirty = true;
      }
    }
    for (const p of f.flakes) if (move(p, 2.2, .94) > .005) f.dirty = true;
    if (!f.dirty) return;
    const g = f.g; g.clearRect(0, 0, N, N); g.save(); g.beginPath(); g.arc(H, H, H, 0, 7); g.clip(); g.drawImage(f.trail, 0, 0);
    g.fillStyle = '#2a2018'; for (const p of f.flakes) { g.save(); g.translate(H + p.x*H, H + p.y*H); g.rotate(p.a); g.fillRect(-1.6, -1, 3.2, 2); g.restore(); }
    g.restore(); f.texture.needsUpdate = true; f.dirty = false;
  }

  function update(dt){
    for (let i = ps.length - 1; i >= 0; i--) if (!step(ps[i], dt)) ps.splice(i, 1);
    let ns = 0, nf = 0;
    for (const p of ps) {
      at(p); sc.setScalar(p.s); m4.compose(pos, q, sc);
      if (p.kind === 'bubble') fizz.setMatrixAt(nf++, m4);
      else { solid.setMatrixAt(ns, m4); solid.setColorAt(ns++, col.setHex(p.col)); }
    }
    solid.count = ns; fizz.count = nf; solid.instanceMatrix.needsUpdate = fizz.instanceMatrix.needsUpdate = true; solid.instanceColor.needsUpdate = true;
    for (const s of streams.values()) { s.visible = !!s.seen; s.seen = false; }
    for (let i = puddles.length - 1; i >= 0; i--) {
      const p = puddles[i]; p.age += dt;
      p.m.material.opacity = .7*Math.min(1, Math.max(0, (9 - p.age)/3));
      if (p.age > 9) { root.remove(p.m); p.m.material.dispose(); puddles.splice(i, 1); }
    }
    for (const f of films.values()) filmStep(f, dt);
  }

  function clear(){
    ps.length = 0; solid.count = fizz.count = 0;
    for (const p of puddles) { root.remove(p.m); p.m.material.dispose(); } puddles.length = 0;
    for (const f of films.values()) { root.remove(f.mesh); f.mesh.material.dispose(); f.texture.dispose(); } films.clear();
    for (const s of streams.values()) s.visible = false;
  }
  const rnd = (a, b) => a + Math.random()*(b - a);
  return {
    update, clear, stream, spill, film, hasFilm: v => films.has(v), dropFilm(v){ const f = films.get(v); if (f) f.clear(); },
    count: kind => ps.reduce((n, p) => n + (p.kind === kind), 0),
    grain(x, y, z, c, payload, s=.004, kind='grain'){ spawn({kind, x, y, z, vx:rnd(-.03, .03), vz:rnd(-.03, .03), vy:-.05, s, col:c, payload}); },
    foam(v, c){ const a = Math.random()*7, r = Math.random()*(v.def.mouth || v.def.ri)*.7, sp = rnd(.04, .12);
      spawn({kind:'foam', from:v, x:v.x + Math.cos(a)*r, y:v.y + v.def.h, z:v.z + Math.sin(a)*r, vx:Math.cos(a)*sp, vz:Math.sin(a)*sp, vy:rnd(.1, .25), s:rnd(.011, .02), lay:rnd(0, .02), life:rnd(9, 14), col:c}); },
    bubble(v){ const a = Math.random()*7, r = Math.random()*v.def.ri*.8; spawn({kind:'bubble', host:v, ox:Math.cos(a)*r, oy:v.def.floor + .004, oz:Math.sin(a)*r, s:rnd(.002, .005), ph:Math.random()*7}); },
    blob(v, c){ const a = Math.random()*7, r = Math.random()*v.def.ri*.55; spawn({kind:'blob', host:v, up:true, ox:Math.cos(a)*r, oy:world.waterTop(v), oz:Math.sin(a)*r, s:rnd(.008, .014), ph:Math.random()*7, col:c}); },
    oildrop(v){ const a = Math.random()*7, r = Math.random()*v.def.ri*.7; spawn({kind:'oildrop', host:v, ox:Math.cos(a)*r, oy:v.def.floor + Math.random()*world.waterTop(v)*.8, oz:Math.sin(a)*r, s:rnd(.004, .008), col:0xf2c84b}); },
    bead(v, ox, oz, c, payload){ spawn({kind:'bead', host:v, ox, oy:world.top(v) - .006, oz, s:.006, col:c, payload}); },
    splash(x, y, z, c, n=6){ for (let i = 0; i < n; i++) { const a = Math.random()*7; spawn({kind:'splash', x, y, z, vx:Math.cos(a)*.25, vz:Math.sin(a)*.25, vy:rnd(.4, .7), s:.004, col:c}); } }
  };
}
