// What happens inside a container's liquid: bubbles, lava-lamp blobs, food coloring sinking through
// oil, oil drops stirred loose, and the skin on top where food coloring swirls and pepper scatters.
// These ride along in the container's own frame; anything that leaves a container is fluid.js's.

import * as THREE from 'three';
import { grad } from '../core/kit.js';

const MAX = 500;
const hex = c => '#' + c.toString(16).padStart(6, '0');

// world: {frame(v) -> v's group (bottom centre, moves and turns with it), inside(v) -> still upright,
//         top(v), waterTop(v), oilTop(v) -> heights above v's bottom, deliver(v, payload)}
export function makeFx(world){
  const solid = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 8, 6), new THREE.MeshToonMaterial({gradientMap:grad, color:0xffffff}), MAX);
  const fizz = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 6, 4), new THREE.MeshToonMaterial({gradientMap:grad, color:0xffffff, transparent:true, opacity:.6, depthWrite:false}), MAX);
  // the color buffer is sized from count, so it has to exist before count drops to the live number
  solid.setColorAt(0, new THREE.Color()); solid.instanceColor.setUsage(THREE.DynamicDrawUsage);
  for (const m of [solid, fizz]) { m.frustumCulled = false; m.count = 0; m.instanceMatrix.setUsage(THREE.DynamicDrawUsage); }
  fizz.renderOrder = 2;
  const ps = [], m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), sc = new THREE.Vector3(), pos = new THREE.Vector3(), col = new THREE.Color();
  let parent = null;
  const spawn = p => { if (ps.length < MAX) ps.push(Object.assign({t:0}, p)); };

  function step(p, dt){
    p.t += dt;
    if (!world.inside(p.host)) return false;
    switch (p.kind) {
      case 'bubble': p.oy += (.12 + p.s*4)*dt; p.ox += Math.sin(p.t*9 + p.ph)*.04*dt; return p.oy < world.top(p.host) - .002;
      case 'blob': {
        // a bubble carries colored water up through the oil, lets go at the top, and the blob sinks home
        const wt = world.waterTop(p.host), ot = world.oilTop(p.host);
        if (p.up) { p.oy += .05*dt; if (p.oy >= ot - p.s) p.up = false; } else p.oy -= .04*dt;
        p.ox += Math.sin(p.t*1.7 + p.ph)*.004*dt;
        return p.up || p.oy > wt;
      }
      case 'bead': {
        p.oy -= .035*dt;
        if (p.oy <= world.waterTop(p.host) + p.s*.5) { world.deliver(p.host, p.payload); return false; }
        return true;
      }
      case 'oildrop': p.oy += .06*dt; return p.oy < world.waterTop(p.host) - .002;
    }
    return false;
  }

  // ---------- the skin on top of a liquid ----------
  const films = new Map();
  function film(v){
    let f = films.get(v); if (f) return f;
    const N = 128, cv = document.createElement('canvas'), trail = document.createElement('canvas'); cv.width = cv.height = trail.width = trail.height = N;
    const texture = new THREE.CanvasTexture(cv); texture.encoding = THREE.sRGBEncoding;
    const mesh = new THREE.Mesh(new THREE.CircleGeometry(1, 32), new THREE.MeshToonMaterial({gradientMap:grad, map:texture, transparent:true, depthWrite:false})); mesh.rotation.x = -Math.PI/2; mesh.renderOrder = 2;
    world.frame(v).add(mesh);
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
    f.mesh.position.set(0, world.top(v) + .0015, 0); f.mesh.scale.setScalar(v.def.ri*.97);
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
      world.frame(p.host).localToWorld(pos.set(p.ox, p.oy, p.oz)); parent.worldToLocal(pos);
      sc.setScalar(p.s); m4.compose(pos, q, sc);
      if (p.kind === 'bubble') fizz.setMatrixAt(nf++, m4);
      else { solid.setMatrixAt(ns, m4); solid.setColorAt(ns++, col.setHex(p.col)); }
    }
    solid.count = ns; fizz.count = nf; solid.instanceMatrix.needsUpdate = fizz.instanceMatrix.needsUpdate = true; solid.instanceColor.needsUpdate = true;
    for (const f of films.values()) filmStep(f, dt);
  }
  function clear(){
    ps.length = 0; solid.count = fizz.count = 0;
    for (const f of films.values()) { if (f.mesh.parent) f.mesh.parent.remove(f.mesh); f.mesh.material.dispose(); f.texture.dispose(); } films.clear();
  }
  const rnd = (a, b) => a + Math.random()*(b - a);
  return {
    attach(root){ parent = root; root.add(solid, fizz); },
    update, clear, film, hasFilm: v => films.has(v), dropFilm(v){ const f = films.get(v); if (f) f.clear(); },
    bubble(v){ const a = Math.random()*7, r = Math.random()*v.def.ri*.8; spawn({kind:'bubble', host:v, ox:Math.cos(a)*r, oy:v.def.floor + .004, oz:Math.sin(a)*r, s:rnd(.002, .005), ph:Math.random()*7}); },
    blob(v, c){ const a = Math.random()*7, r = Math.random()*v.def.ri*.55; spawn({kind:'blob', host:v, up:true, ox:Math.cos(a)*r, oy:world.waterTop(v), oz:Math.sin(a)*r, s:rnd(.008, .014), ph:Math.random()*7, col:c}); },
    oildrop(v){ const a = Math.random()*7, r = Math.random()*v.def.ri*.7; spawn({kind:'oildrop', host:v, ox:Math.cos(a)*r, oy:v.def.floor + Math.random()*(world.waterTop(v) - v.def.floor)*.8, oz:Math.sin(a)*r, s:rnd(.004, .008), col:0xf2c84b}); },
    bead(v, ox, oz, c, payload){ spawn({kind:'bead', host:v, ox, oy:world.top(v) - .006, oz, s:.006, col:c, payload}); }
  };
}
