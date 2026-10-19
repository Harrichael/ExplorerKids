// Liquid and powder out in the open: drops and grains in flight, the puddles and piles they make
// wherever they land (on the mat, on a box lid, on the side of the volcano), and foam. Every puddle
// keeps its own chemistry, so vinegar fizzes wherever it meets baking soda. Liquid resting in an
// upright container belongs to that container (desk.js); this is everything that has left one.

import * as THREE from 'three';
import { grad } from '../core/kit.js';
import * as chem from './chem.js';
import { P, cast, rot, toLocal, toWorld } from './physics.js';
import { UNITS_PER_M3 } from './stuff.js';

const DROP = 1.2, GRAIN = .5, FILM = .007;
const MAX_DROPS = 900, MAX_FOAM = 1400, MAX_POOLS = 60;

const share = (c, f) => { const o = chem.empty(); for (const k in c.l) o.l[k] = c.l[k]*f; for (const k in c.p) o.p[k] = c.p[k]*f; return o; };
const lookCol = c => chem.liquidVol(c) ? (c.l.oil && chem.waterVol(c) < .01 ? chem.SUB.oil.col : (chem.look(c) || {col:0xc8e6f2}).col) : chem.pileColor(c);

// The fizz starts where acid and baking soda first meet and spreads out from there, so only the part
// it has reached reacts and foams. `s` carries {hit, front, quiet}: hit is where something last landed,
// front {x, z, r} the spreading patch, both in whatever flat frame the caller keeps them; R is as far
// as it can spread, speed how fast it creeps (a stirred or bubbling one spreads faster).
export function spread(s, c, dt, R, speed, stir = 0){
  const f = s.front || {x: s.hit ? s.hit.x : 0, z: s.hit ? s.hit.z : 0, r: .004};
  const gas = chem.step(c, dt, stir, Math.max(.02, Math.min(1, (f.r/Math.max(R, .006))**2)));
  if (gas > 1e-5) { s.front = f; s.quiet = 0; f.r = Math.min(R, f.r + dt*(speed + stir*.1 + gas/dt*.0005)); }
  else if (s.front && (s.quiet = (s.quiet || 0) + dt) > .6) s.front = null;
  return gas;
}

// hooks: catches(x, y, z, drop) -> the container a point is inside, deliver(v, rec, x, z), fizz(pool, gas)
export function makeFluid(root, hooks){
  const drops = [], pools = [], foams = [];
  const dropMesh = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 8, 6), new THREE.MeshToonMaterial({gradientMap:grad, color:0xffffff}), MAX_DROPS);
  const foamMesh = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1, 1), new THREE.MeshToonMaterial({gradientMap:grad, color:0xffffff}), MAX_FOAM);
  for (const m of [dropMesh, foamMesh]) { m.setColorAt(0, new THREE.Color()); m.instanceColor.setUsage(THREE.DynamicDrawUsage); m.instanceMatrix.setUsage(THREE.DynamicDrawUsage); m.count = 0; m.frustumCulled = false; m.castShadow = true; root.add(m); }
  const DISC = new THREE.CircleGeometry(1, 28), MOUND = new THREE.ConeGeometry(1, 1, 18, 1, true);
  const _a = {}, _b = {}, m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), sc = new THREE.Vector3(), pos = new THREE.Vector3(), col = new THREE.Color(), UP = new THREE.Vector3(0, 1, 0), dir = new THREE.Vector3();
  let gasTotal = 0;

  // ---------- drops and grains ----------
  function emit(x, y, z, vx, vy, vz, rec, src){
    const lv = chem.liquidVol(rec), pv = chem.pileVol(rec);
    const liq = chem.empty(); for (const k in rec.l) liq.l[k] = rec.l[k];
    const pow = chem.empty(); for (const k in rec.p) pow.p[k] = rec.p[k];
    // with no room for more drops the share goes into fewer, bigger ones rather than vanishing
    const spawn = (c, n, liquid) => { n = Math.min(n, MAX_DROPS - drops.length); if (n < 1) { const last = drops[drops.length - 1]; if (last) chem.merge(last.c, c); return; }
      for (let i = 0; i < n; i++) {
        const j = () => (Math.random() - .5)*.012, one = share(c, 1/n);
        drops.push({x:x + j(), y, z:z + j(), vx:vx + j()*6, vy, vz:vz + j()*6, c:one, liquid, col:lookCol(one), s: liquid ? .0045 : .0028, src, t:0});
      } };
    if (lv > .01) spawn(liq, Math.max(1, Math.round(lv/DROP)), true);
    if (pv > .01) spawn(pow, Math.max(1, Math.round(pv/GRAIN)), false);
  }
  function stepDrop(d, dt){
    d.t += dt; d.vy -= 9.81*dt;
    if (!d.liquid) { const k = Math.exp(-1.5*dt); d.vx *= k; d.vz *= k; }
    const dx = d.vx*dt, dy = d.vy*dt, dz = d.vz*dt, nx = d.x + dx, ny = d.y + dy, nz = d.z + dz;
    const v = hooks.catches(nx, ny, nz, d);
    if (v) { hooks.deliver(v, d.c, nx, nz); return false; }
    const len = Math.hypot(dx, dy, dz);
    if (len > 1e-7) {
      const h = cast(d.x, d.y, d.z, dx/len, dy/len, dz/len, len + d.s, d.t < .12 ? d.src : null);
      if (h) {
        const px = d.x + dx/len*h.t, py = d.y + dy/len*h.t, pz = d.z + dz/len*h.t;
        if (h.ny < .55) {
          // too steep to sit on: it runs down the surface and drips off the edge
          const vn = d.vx*h.nx + d.vy*h.ny + d.vz*h.nz;
          d.vx = (d.vx - vn*h.nx)*.7; d.vy = (d.vy - vn*h.ny)*.7; d.vz = (d.vz - vn*h.nz)*.7;
          d.x = px + h.nx*.004; d.y = py + h.ny*.004; d.z = pz + h.nz*.004; return true;
        }
        settle(d.c, px, py, pz, h.body === P.desk ? null : h.body, h.nx, h.ny, h.nz);
        return false;
      }
    }
    d.x = nx; d.y = ny; d.z = nz;
    return d.y > -1;
  }

  // ---------- puddles and piles ----------
  function settle(c, x, y, z, body, nx, ny, nz){
    let p = pools.find(p => p.body === body && Math.hypot(p.wx - x, p.wy - y, p.wz - z) < p.r + .008);
    if (p) { chem.merge(p.c, c); p.hit = {x:x - p.wx, z:z - p.wz}; size(p); return p; }
    // too many puddles: this one joins the nearest on the same surface instead of making another
    if (pools.length >= MAX_POOLS) {
      const near = pools.filter(q => q.body === body).sort((a, b) => Math.hypot(a.wx - x, a.wz - z) - Math.hypot(b.wx - x, b.wz - z))[0] || pools[0];
      chem.merge(near.c, c); size(near); return near;
    }
    const lp = body ? toLocal(body, x, y, z) : {x, y, z}, ln = {x:nx, y:ny, z:nz};
    if (body) rot(body.rotation(), ln, true);
    const disc = new THREE.Mesh(DISC, new THREE.MeshToonMaterial({gradientMap:grad, transparent:true, depthWrite:false}));
    const mound = new THREE.Mesh(MOUND, new THREE.MeshToonMaterial({gradientMap:grad}));
    disc.renderOrder = 1; mound.castShadow = true; root.add(disc, mound);
    p = {body, lp, ln, c:chem.fill({}), r:0, disc, mound, wx:x, wy:y, wz:z, n:{x:nx, y:ny, z:nz}, edgeT:Math.random()*.2, foamAcc:0, gas:0};
    chem.merge(p.c, c); size(p); pools.push(p);
    return p;
  }
  function dropPool(p){ root.remove(p.disc, p.mound); p.disc.material.dispose(); p.mound.material.dispose(); }
  function size(p){
    const lv = chem.liquidVol(p.c)/UNITS_PER_M3, pv = chem.pileVol(p.c)/UNITS_PER_M3;
    p.rl = Math.sqrt(lv/(Math.PI*FILM)); p.rp = Math.cbrt(pv/(.2*Math.PI)); p.r = Math.max(.006, p.rl, p.rp);
  }
  function release(p, k, vx, vz){
    // let a share of a puddle go as drops, from its edge in the direction (vx, vz)
    const out = share(p.c, k); for (const key in out.l) p.c.l[key] -= out.l[key]; for (const key in out.p) p.c.p[key] -= out.p[key];
    emit(p.wx + vx*p.r, p.wy + .004, p.wz + vz*p.r, vx*.25, .05, vz*.25, out, p.body);
    size(p);
  }
  function stepPool(p, dt){
    if (p.body) {
      if (p.body.userData.gone) { p.body = null; release(p, 1, 0, 0); return false; }
      const w = toWorld(p.body, p.lp.x, p.lp.y, p.lp.z, _a); p.wx = w.x; p.wy = w.y; p.wz = w.z;
      p.n.x = p.ln.x; p.n.y = p.ln.y; p.n.z = p.ln.z; rot(p.body.rotation(), p.n);
    }
    if (p.n.y < .55) {
      // its surface has tipped up: the whole puddle runs off downhill
      const tx = -p.n.x*p.n.y, tz = -p.n.z*p.n.y, tl = Math.hypot(tx, tz) || 1;
      release(p, 1, -tx/tl, -tz/tl); return false;
    }
    // a puddle bigger than what it's sitting on spills over the edge
    if (p.body && (p.edgeT -= dt) < 0) {
      p.edgeT = .15;
      for (const a of [0, 1.57, 3.14, 4.71]) {
        const ex = Math.cos(a), ez = Math.sin(a), ox = p.wx + ex*p.r*.9 + p.n.x*.01, oy = p.wy + p.n.y*.01, oz = p.wz + ez*p.r*.9 + p.n.z*.01;
        const h = cast(ox, oy, oz, -p.n.x, -p.n.y, -p.n.z, .03);
        if (!h || h.body !== p.body) { release(p, .3, ex, ez); break; }
      }
    }
    // every tick of chemistry happens right here on the surface
    const gas = spread(p, p.c, dt, p.r, .025);
    if (gas > 0) {
      gasTotal += gas; p.gas += gas; hooks.fizz(p, gas, gas/dt);
      p.foamAcc += gas*((p.c.l.soap || 0) > .3 ? 4 : 1.2);
      const fc = chem.lerpCol(0xffffff, (chem.look(p.c) || {col:0xffffff}).col, .4);
      const f = p.front || {x:0, z:0, r:p.r};
      p.foamAcc = gush(p.foamAcc, gas/dt, fc, null, p.n, () => { const a = Math.random()*7, rr = Math.random()*Math.min(f.r, p.r)*.8; _b.x = p.wx + f.x + Math.cos(a)*rr; _b.y = p.wy + .004; _b.z = p.wz + f.z + Math.sin(a)*rr; return _b; });
    }
    size(p);
    return !chem.isEmpty(p.c);
  }
  function mergePools(){
    for (let i = 0; i < pools.length; i++) for (let j = i + 1; j < pools.length; j++) {
      const a = pools[i], b = pools[j];
      if (a.body !== b.body || Math.hypot(a.wx - b.wx, a.wy - b.wy, a.wz - b.wz) > (a.r + b.r)*.8) continue;
      const big = chem.liquidVol(a.c) + chem.pileVol(a.c) >= chem.liquidVol(b.c) + chem.pileVol(b.c) ? a : b, small = big === a ? b : a;
      // where they touch is where any fizz between them starts
      const d = Math.hypot(small.wx - big.wx, small.wz - big.wz) || 1;
      big.hit = {x:(small.wx - big.wx)/d*big.r, z:(small.wz - big.wz)/d*big.r};
      chem.merge(big.c, small.c); size(big); dropPool(small); pools.splice(pools.indexOf(small), 1); return;
    }
  }

  // ---------- foam ----------
  function foam(x, y, z, vx, vy, vz, c, big = 1){
    if (foams.length >= MAX_FOAM) foams.shift();
    foams.push({x, y, z, vx, vy, vz, body:null, lp:null, ln:null, s:(.008 + Math.random()*.008)*big, life:8 + Math.random()*6, t:0, col:c});
  }
  // Lets `n` blobs of foam out of a surface facing `up`, from spots spot() picks; returns what's left
  // over. Gentle fizzing (gas rate in units a second) wells up; a sudden rush blasts out a fountain of
  // more, bigger foam. `squeeze` is how much narrower the way out is than where the gas is made: gas
  // forced through a small mouth comes out that much faster.
  function gush(n, rate, c, vel, up, spot, squeeze = 1){
    const k = Math.min(1, Math.max(0, (rate*squeeze - 12)/70)), vx = vel ? vel.x : 0, vz = vel ? vel.z : 0;
    n += n*k*2.5;
    while (n >= 1) {
      n -= 1; const w = spot(), a = Math.random()*7, sp = .04 + Math.random()*.08 + k*Math.random()*.7, jet = (.1 + Math.random()*.15 + k*(.4 + Math.random()*1.1))*Math.min(1.35, Math.sqrt(squeeze));
      foam(w.x, w.y, w.z, vx + up.x*jet + Math.cos(a)*sp, up.y*jet, vz + up.z*jet + Math.sin(a)*sp, c, 1 + k*Math.random()*1.5);
    }
    return n;
  }
  function stepFoam(f, dt){
    f.t += dt; if (f.t > f.life) f.s *= Math.exp(-2.5*dt);
    if (f.lp) {
      if (f.body && f.body.userData.gone) { f.lp = null; f.body = null; return true; }
      const w = f.body ? toWorld(f.body, f.lp.x, f.lp.y, f.lp.z, _a) : f.lp, n = _b;
      n.x = f.ln.x; n.y = f.ln.y; n.z = f.ln.z; if (f.body) rot(f.body.rotation(), n);
      f.x = w.x; f.y = w.y; f.z = w.z;
      if (n.y < .9 && f.t < f.life) {
        // foam creeps downhill, hugging the surface
        const tx = n.x*n.y, tz = n.z*n.y, ty = -(n.x*n.x + n.z*n.z), tl = Math.hypot(tx, ty, tz) || 1, sp = .05*dt;
        const ox = f.x + tx/tl*sp + n.x*.01, oy = f.y + ty/tl*sp + n.y*.01, oz = f.z + tz/tl*sp + n.z*.01;
        const h = cast(ox, oy, oz, -n.x, -n.y, -n.z, .03);
        if (!h) { f.lp = null; f.vx = tx/tl*.05; f.vy = 0; f.vz = tz/tl*.05; return true; }
        stick(f, ox - n.x*h.t, oy - n.y*h.t, oz - n.z*h.t, h);
      }
      return f.s > .0015;
    }
    f.vy -= 2.2*dt; const k = Math.exp(-2.2*dt); f.vx *= k; f.vz *= k;
    const dx = f.vx*dt, dy = f.vy*dt, dz = f.vz*dt, len = Math.hypot(dx, dy, dz);
    if (len > 1e-7) { const h = cast(f.x, f.y, f.z, dx/len, dy/len, dz/len, len + f.s*.6); if (h) { stick(f, f.x + dx/len*h.t, f.y + dy/len*h.t, f.z + dz/len*h.t, h); return true; } }
    f.x += dx; f.y += dy; f.z += dz;
    return f.y > -1 && f.s > .0015;
  }
  function stick(f, x, y, z, h){
    const body = h.body === P.desk ? null : h.body, lift = f.s*.55 + Math.random()*.004;
    const px = x + h.nx*lift, py = y + h.ny*lift, pz = z + h.nz*lift;
    f.body = body; f.lp = body ? toLocal(body, px, py, pz) : {x:px, y:py, z:pz};
    f.ln = {x:h.nx, y:h.ny, z:h.nz}; if (body) rot(body.rotation(), f.ln, true);
  }

  function step(dt){
    for (let i = drops.length - 1; i >= 0; i--) if (!stepDrop(drops[i], dt)) drops.splice(i, 1);
    for (let i = pools.length - 1; i >= 0; i--) if (!stepPool(pools[i], dt)) { dropPool(pools[i]); pools.splice(i, 1); }
    mergePools();
    for (let i = foams.length - 1; i >= 0; i--) if (!stepFoam(foams[i], dt)) foams.splice(i, 1);
  }
  function draw(){
    let n = 0;
    for (const d of drops) {
      pos.set(d.x, d.y, d.z);
      const sp = Math.hypot(d.vx, d.vy, d.vz);
      if (d.liquid && sp > .3) { dir.set(d.vx/sp, d.vy/sp, d.vz/sp); q.setFromUnitVectors(UP, dir); sc.set(d.s, d.s*(1 + sp*.9), d.s); }
      else { q.identity(); sc.setScalar(d.s); }
      m4.compose(pos, q, sc); dropMesh.setMatrixAt(n, m4); dropMesh.setColorAt(n++, col.setHex(d.col));
    }
    dropMesh.count = n; dropMesh.instanceMatrix.needsUpdate = dropMesh.instanceColor.needsUpdate = true;
    n = 0; q.identity();
    for (const f of foams) { pos.set(f.x, f.y, f.z); sc.setScalar(f.s); m4.compose(pos, q, sc); foamMesh.setMatrixAt(n, m4); foamMesh.setColorAt(n++, col.setHex(f.col)); }
    foamMesh.count = n; foamMesh.instanceMatrix.needsUpdate = foamMesh.instanceColor.needsUpdate = true;
    for (const p of pools) {
      dir.set(p.n.x, p.n.y, p.n.z); q.setFromUnitVectors(UP, dir);
      const rl = Math.max(p.rl, p.rp*1.15), lk = chem.liquidVol(p.c) ? chem.look(p.c) : null;
      p.disc.visible = p.rl > .004;
      if (p.disc.visible) { p.disc.position.set(p.wx + p.n.x*.0012, p.wy + p.n.y*.0012, p.wz + p.n.z*.0012); p.disc.quaternion.copy(q); p.disc.rotateX(-Math.PI/2); p.disc.scale.setScalar(rl);
        p.disc.material.color.setHex(lookCol(p.c)); p.disc.material.opacity = lk ? Math.max(.55, lk.op) : .8; }
      p.mound.visible = p.rp > .004;
      if (p.mound.visible) { const h = p.rp*.6; p.mound.quaternion.copy(q); p.mound.position.set(p.wx + p.n.x*h/2, p.wy + p.n.y*h/2, p.wz + p.n.z*h/2); p.mound.scale.set(p.rp, h, p.rp);
        p.mound.material.color.setHex(chem.pileColor(p.c)); }
    }
  }
  function clear(){ drops.length = foams.length = 0; for (const p of pools) dropPool(p); pools.length = 0; gasTotal = 0; dropMesh.count = foamMesh.count = 0; }
  // the puddle at a point, if there is one (things sitting in a puddle get wet)
  function poolAt(x, y, z, reach = .01){ return pools.find(p => Math.hypot(p.wx - x, p.wz - z) < p.r + reach && Math.abs(p.wy - y) < .03 + reach) || null; }
  return {emit, gush, step, draw, clear, poolAt, gas: () => gasTotal};
}
