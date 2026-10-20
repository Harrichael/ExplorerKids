// Liquid and powder out in the open: drops and grains in flight, the puddles and piles they make
// wherever they land (on the mat, on a box lid, on the side of the volcano), and foam. Every puddle
// keeps its own chemistry, so vinegar fizzes wherever it meets baking soda. Liquid resting in an
// upright container belongs to that container (desk.js); this is everything that has left one.

import * as THREE from 'three';
import { grad } from '../core/kit.js';
import * as chem from './chem.js';
import { area, speed } from './gas.js';
import { P, cast, rot, toLocal, toWorld } from './physics.js';
import { UNITS_PER_M3 } from './stuff.js';

const DROP = 1.2, GRAIN = .5, FILM = .007;
const MAX_DROPS = 900, MAX_FOAM = 1400, MAX_POOLS = 60;
// A puddle's edge is N distances out from its centre, evenly round; it is drawn DRAWN points round.
// Below BEAD (its radius as a disc) surface tension still pulls it round. Landing liquid has to be
// moving sideways faster than PIN (m/s) to run on past the wet edge, and SLIDE faster again nearly
// all of it runs on ahead; landing within SPOT (m) of the middle it spreads evenly.
const N = 32, DA = 2*Math.PI/N, DRAWN = 64, BEAD = .03, PIN = .05, SLIDE = .1, SPOT = .02;

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

// a flat frame on a surface facing n: e1 is x laid on it, e2 = e1 × n (z, on a level surface)
function basis(n){
  const ax = 1 - n.x*n.x, ay = -n.x*n.y, az = -n.x*n.z, l = Math.hypot(ax, ay, az), e1 = {x:ax/l, y:ay/l, z:az/l};
  return [e1, {x:e1.y*n.z - e1.z*n.y, y:e1.z*n.x - e1.x*n.z, z:e1.x*n.y - e1.y*n.x}];
}
const edge = (R, a) => { const f = (a/DA % N + N) % N, i = Math.floor(f), t = f - i; return R[i]*(1 - t) + R[(i + 1) % N]*t; };
const areaOf = R => { let s = 0; for (const r of R) s += r*r; return s*DA/2; };
function puddleGeo(n){
  const g = new THREE.BufferGeometry(), nor = new Float32Array((DRAWN + 1)*3), idx = [];
  for (let i = 0; i <= DRAWN; i++) nor.set([n.x, n.y, n.z], i*3);
  for (let j = 0; j < DRAWN; j++) idx.push(0, (j + 1) % DRAWN + 1, j + 1);
  g.setAttribute('position', new THREE.BufferAttribute(new Float32Array((DRAWN + 1)*3), 3).setUsage(THREE.DynamicDrawUsage));
  g.setAttribute('normal', new THREE.BufferAttribute(nor, 3)); g.setIndex(idx);
  return g;
}

// hooks: catches(x, y, z, drop) -> the container a point is inside, deliver(v, rec, x, z), fizz(pool, gas)
export function makeFluid(root, hooks){
  const drops = [], pools = [], foams = [];
  const dropMesh = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 8, 6), new THREE.MeshToonMaterial({gradientMap:grad, color:0xffffff}), MAX_DROPS);
  const foamMesh = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1, 1), new THREE.MeshToonMaterial({gradientMap:grad, color:0xffffff}), MAX_FOAM);
  for (const m of [dropMesh, foamMesh]) { m.setColorAt(0, new THREE.Color()); m.instanceColor.setUsage(THREE.DynamicDrawUsage); m.instanceMatrix.setUsage(THREE.DynamicDrawUsage); m.count = 0; m.frustumCulled = false; m.castShadow = true; root.add(m); }
  const MOUND = new THREE.ConeGeometry(1, 1, 18, 1, true);
  const _a = {}, _b = {}, _c = {}, _d = {}, _s = new Float32Array(N), m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), sc = new THREE.Vector3(), pos = new THREE.Vector3(), col = new THREE.Color(), UP = new THREE.Vector3(0, 1, 0), dir = new THREE.Vector3();
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
        settle(d.c, px, py, pz, h.body === P.desk ? null : h.body, h.nx, h.ny, h.nz, d.vx, d.vz);
        return false;
      }
    }
    d.x = nx; d.y = ny; d.z = nz;
    return d.y > -1;
  }

  // ---------- puddles and piles ----------
  // A puddle is a film FILM deep inside an edge kept in its own frame (the body's, or the world's for
  // the mat): R holds how far the edge reaches at each of N angles about the centre lp, laid out by
  // e1 and e2 on the surface. Wherever the edge has reached stays wet; it only draws back as liquid leaves.
  const own = (p, x, y, z) => p.body ? toLocal(p.body, x, y, z, _a) : (_a.x = x, _a.y = y, _a.z = z, _a);
  function polar(p, L){
    const dx = L.x - p.lp.x, dy = L.y - p.lp.y, dz = L.z - p.lp.z, u = dx*p.e1.x + dy*p.e1.y + dz*p.e1.z, v = dx*p.e2.x + dy*p.e2.y + dz*p.e2.z;
    _c.d = Math.hypot(u, v); _c.a = Math.atan2(v, u); _c.h = dx*p.ln.x + dy*p.ln.y + dz*p.ln.z; return _c;
  }
  const reach = (p, a) => Math.max(edge(p.R, a), p.rp, .006);
  function inside(p, x, y, z, slack){
    if (Math.hypot(p.wx - x, p.wz - z) > p.rmax + slack) return false;
    const c = polar(p, own(p, x, y, z)); return c.d < reach(p, c.a) + slack && Math.abs(c.h) < .03 + slack;
  }
  const reachTo = (p, x, y, z) => reach(p, polar(p, own(p, x, y, z)).a);
  // which way new liquid runs as it joins a puddle: on the way it was moving, and out toward where it landed
  function lean(p, x, y, z, vx, vz){
    const sp = Math.hypot(vx, vz), k = sp > PIN ? (sp - PIN)/sp/SLIDE : 0, v = {x:vx*k, y:0, z:vz*k}; if (p.body) rot(p.body.rotation(), v, true);
    // landing well inside the wet patch it just joins in; landing out toward an edge it pushes that edge on
    const L = own(p, x, y, z), dx = L.x - p.lp.x, dy = L.y - p.lp.y, dz = L.z - p.lp.z, dl = Math.hypot(dx, dy, dz), e1 = p.e1, e2 = p.e2;
    const h = p.r && dl > SPOT ? (dl - SPOT)/dl*3/p.r : 0;
    return {u:v.x*e1.x + v.y*e1.y + v.z*e1.z + (dx*e1.x + dy*e1.y + dz*e1.z)*h, v:v.x*e2.x + v.y*e2.y + v.z*e2.z + (dx*e2.x + dy*e2.y + dz*e2.z)*h};
  }
  function settle(c, x, y, z, body, nx, ny, nz, vx = 0, vz = 0){
    let p = pools.find(p => p.body === body && inside(p, x, y, z, .008));
    // too many puddles: this one joins the nearest on the same surface instead of making another
    if (!p && pools.length >= MAX_POOLS) p = pools.filter(q => q.body === body).sort((a, b) => Math.hypot(a.wx - x, a.wz - z) - Math.hypot(b.wx - x, b.wz - z))[0] || pools[0];
    if (p) { chem.merge(p.c, c); p.hit = {x:x - p.wx, z:z - p.wz}; size(p, lean(p, x, y, z, vx, vz)); return p; }
    const lp = body ? toLocal(body, x, y, z) : {x, y, z}, ln = {x:nx, y:ny, z:nz};
    if (body) rot(body.rotation(), ln, true);
    const [e1, e2] = basis(ln);
    const disc = new THREE.Mesh(puddleGeo(ln), new THREE.MeshToonMaterial({gradientMap:grad, transparent:true, depthWrite:false}));
    const mound = new THREE.Mesh(MOUND, new THREE.MeshToonMaterial({gradientMap:grad}));
    disc.renderOrder = 1; mound.castShadow = true; root.add(disc, mound);
    p = {body, lp, ln, e1, e2, R:new Float32Array(N), A:0, c:chem.fill({}), r:0, rp:0, fl:0, disc, mound, wx:x, wy:y, wz:z, n:{x:nx, y:ny, z:nz}, edgeT:Math.random()*.2, turn:0, foamAcc:0, gas:0};
    chem.merge(p.c, c); size(p, lean(p, x, y, z, vx, vz)); pools.push(p);
    return p;
  }
  function dropPool(p){ root.remove(p.disc, p.mound); p.disc.geometry.dispose(); p.disc.material.dispose(); p.mound.material.dispose(); }
  // Fits the edge to the liquid. More liquid pushes the edge out, mostly the way `push` leans (its
  // length up to 1 is how much); less pulls the whole edge in toward the centre.
  function size(p, push){
    const want = chem.liquidVol(p.c)/UNITS_PER_M3/FILM, R = p.R;
    p.rp = Math.cbrt(chem.pileVol(p.c)/UNITS_PER_M3/(.2*Math.PI));
    if (Math.abs(want - p.A) > .01*want + 1e-8) {
      if (want < p.A) { const k = Math.sqrt(want/p.A); for (let i = 0; i < N; i++) R[i] *= k; }
      else {
        const m = push ? Math.min(.85, Math.hypot(push.u, push.v)) : 0, at = push ? Math.atan2(push.v, push.u) : 0;
        let qa = 0, qb = 0, qc = -want;
        for (let i = 0; i < N; i++) { const w = 1 - m + m*Math.max(0, Math.cos(i*DA - at))**4; _s[i] = w; qa += w*w*DA/2; qb += R[i]*w*DA; qc += R[i]*R[i]*DA/2; }
        const g = (-qb + Math.sqrt(qb*qb - 4*qa*qc))/(2*qa);
        for (let i = 0; i < N; i++) R[i] += _s[i]*g;
      }
      p.A = areaOf(R); p.dirty = true;
    }
    const eq = Math.sqrt(p.A/Math.PI);
    if (eq > 0 && eq < BEAD) {
      let off = 0; for (const r of R) off = Math.max(off, Math.abs(r - eq));
      if (off > eq*.03) { for (let i = 0; i < N; i++) R[i] += (eq - R[i])*.15; const k = Math.sqrt(p.A/areaOf(R)); for (let i = 0; i < N; i++) R[i] *= k; p.dirty = true; }
    }
    let far = 0; for (const r of R) far = Math.max(far, r);
    p.rl = eq; p.r = Math.max(.006, eq, p.rp); p.rmax = Math.max(.006, far, p.rp);
  }
  // b's liquid and edge go into a's, about a centre between the two: the edge goes round both, neck and all
  function join(a, b){
    const wa = a.A, wb = b.A, wt = wa + wb, ox = a.wx, oz = a.wz;
    if (wt > 0) {
      const c = {x:(a.lp.x*wa + b.lp.x*wb)/wt, y:(a.lp.y*wa + b.lp.y*wb)/wt, z:(a.lp.z*wa + b.lp.z*wb)/wt}, out = new Float32Array(N);
      const far = Math.max(Math.hypot(c.x - a.lp.x, c.y - a.lp.y, c.z - a.lp.z) + a.rmax, Math.hypot(c.x - b.lp.x, c.y - b.lp.y, c.z - b.lp.z) + b.rmax);
      const wet = t => { _d.x = c.x + _b.x*t; _d.y = c.y + _b.y*t; _d.z = c.z + _b.z*t; return [a, b].some(p => { const q = polar(p, _d); return q.d < edge(p.R, q.a); }); };
      for (let i = 0; i < N; i++) {
        const ca = Math.cos(i*DA), sa = Math.sin(i*DA); _b.x = ca*a.e1.x + sa*a.e2.x; _b.y = ca*a.e1.y + sa*a.e2.y; _b.z = ca*a.e1.z + sa*a.e2.z;
        // the farthest wet point out along this way, so a gap between the two lobes fills in from the centre
        let s = 48; while (s > 0 && !wet(far*s/48)) s--;
        let lo = far*s/48, hi = lo + far/48;
        if (s) for (let k = 0; k < 5; k++) { const mid = (lo + hi)/2; if (wet(mid)) lo = mid; else hi = mid; }
        out[i] = lo;
      }
      a.lp = c; a.R.set(out); a.A = areaOf(out);
    }
    chem.merge(a.c, b.c); size(a);
    if (a.body) { const w = toWorld(a.body, a.lp.x, a.lp.y, a.lp.z, _a); a.wx = w.x; a.wy = w.y; a.wz = w.z; } else { a.wx = a.lp.x; a.wy = a.lp.y; a.wz = a.lp.z; }
    if (a.front) { a.front.x += ox - a.wx; a.front.z += oz - a.wz; }
  }
  function release(p, k, vx, vz, at){
    // let a share of a puddle go as drops, from its edge in the direction (vx, vz)
    const out = share(p.c, k); for (const key in out.l) p.c.l[key] -= out.l[key]; for (const key in out.p) p.c.p[key] -= out.p[key];
    emit(at ? at.x : p.wx + vx*p.r, (at ? at.y : p.wy) + .004, at ? at.z : p.wz + vz*p.r, vx*.25, .05, vz*.25, out, p.body);
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
      p.edgeT = .15; p.turn = (p.turn + 1) % 4;
      const qr = p.body.rotation();
      for (let i = p.turn; i < N; i += 4) {
        const ca = Math.cos(i*DA), sa = Math.sin(i*DA), r = Math.max(p.R[i], p.rp)*.9;
        _d.x = ca*p.e1.x + sa*p.e2.x; _d.y = ca*p.e1.y + sa*p.e2.y; _d.z = ca*p.e1.z + sa*p.e2.z;
        const w = toWorld(p.body, p.lp.x + _d.x*r, p.lp.y + _d.y*r, p.lp.z + _d.z*r, _b); rot(qr, _d);
        const h = cast(w.x + p.n.x*.01, w.y + p.n.y*.01, w.z + p.n.z*.01, -p.n.x, -p.n.y, -p.n.z, .03);
        if (!h || h.body !== p.body) { const el = Math.hypot(_d.x, _d.z) || 1; release(p, .3, _d.x/el, _d.z/el, w); break; }
      }
    }
    // every tick of chemistry happens right here on the surface
    const gas = spread(p, p.c, dt, p.r, .025);
    if (gas > 0) {
      gasTotal += gas; p.gas += gas; hooks.fizz(p, gas, gas/dt);
      p.foamAcc += gas*((p.c.l.soap || 0) > .3 ? 4 : 1.2);
      const fc = chem.lerpCol(0xffffff, (chem.look(p.c) || {col:0xffffff}).col, .4);
      const f = p.front || {x:0, z:0, r:p.r};
      p.foamAcc = gush(p.foamAcc, speed(gas/dt, chem.temp(p.c), area(Math.max(.01, Math.min(f.r, p.r)))), fc, null, p.n, () => { const a = Math.random()*7, rr = Math.random()*Math.min(f.r, p.r)*.8; _b.x = p.wx + f.x + Math.cos(a)*rr; _b.y = p.wy + .004; _b.z = p.wz + f.z + Math.sin(a)*rr; return keepIn(p, _b); });
    }
    size(p);
    return !chem.isEmpty(p.c);
  }
  // pulls a point on a puddle back inside its edge, so foam only comes out of the wet part
  function keepIn(p, w){
    const c = polar(p, own(p, w.x, w.y, w.z)), r = reach(p, c.a)*.85;
    if (c.d > r) { const k = r/c.d; w.x = p.wx + (w.x - p.wx)*k; w.z = p.wz + (w.z - p.wz)*k; }
    return w;
  }
  function mergePools(){
    for (let i = 0; i < pools.length; i++) for (let j = i + 1; j < pools.length; j++) {
      const a = pools[i], b = pools[j];
      if (a.body !== b.body) continue;
      const d = Math.hypot(a.wx - b.wx, a.wy - b.wy, a.wz - b.wz);
      if (d > a.rmax + b.rmax || reachTo(a, b.wx, b.wy, b.wz) + reachTo(b, a.wx, a.wy, a.wz) < d) continue;
      const big = chem.liquidVol(a.c) + chem.pileVol(a.c) >= chem.liquidVol(b.c) + chem.pileVol(b.c) ? a : b, small = big === a ? b : a;
      // where they touch is where any fizz between them starts
      const dl = Math.hypot(small.wx - big.wx, small.wz - big.wz) || 1, r = reachTo(big, small.wx, small.wy, small.wz);
      const hx = big.wx + (small.wx - big.wx)/dl*r, hz = big.wz + (small.wz - big.wz)/dl*r;
      join(big, small); big.hit = {x:hx - big.wx, z:hz - big.wz};
      dropPool(small); pools.splice(pools.indexOf(small), 1); return;
    }
  }

  // ---------- foam ----------
  function foam(x, y, z, vx, vy, vz, c, big = 1, src = null){
    if (foams.length >= MAX_FOAM) foams.shift();
    foams.push({x, y, z, y0:y, vx, vy, vz, body:null, lp:null, ln:null, s:(.008 + Math.random()*.008)*big, life:8 + Math.random()*6, t:0, col:c, src});
  }
  // Lets `n` blobs of foam out of a surface facing `up`, from spots spot() picks; returns what's left
  // over. The froth rides out on the gas, at u, the speed the gas leaves at (m/s): slow, it wells up;
  // fast, it blasts out a fountain of more, bigger foam. Foam is mostly liquid by weight and the gas
  // slips through it, so it never gets near the speed of a fast jet of gas. `src.rise` keeps the
  // highest any of it has flown over where it came out.
  function gush(n, u, c, vel, up, spot, src = null){
    const k = Math.min(1, Math.max(0, (u - .3)/1.6)), vx = vel ? vel.x : 0, vz = vel ? vel.z : 0, ride = Math.min(u, 2.2);
    n += n*k*2.5;
    while (n >= 1) {
      n -= 1; const w = spot(), a = Math.random()*7, sp = .04 + Math.random()*.08 + k*Math.random()*.7, jet = .1 + Math.random()*.15 + ride*(.4 + Math.random()*.6);
      foam(w.x, w.y, w.z, vx + up.x*jet + Math.cos(a)*sp, up.y*jet, vz + up.z*jet + Math.sin(a)*sp, c, 1 + k*Math.random()*1.5, src);
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
    if (f.src && f.y - f.y0 > f.src.rise) f.src.rise = f.y - f.y0;
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
      const lk = chem.liquidVol(p.c) ? chem.look(p.c) : null;
      p.disc.visible = p.rl > .004;
      if (p.disc.visible) {
        if (p.dirty || Math.abs(p.rp*1.15 - p.fl) > .0005) shape(p);
        p.disc.position.set(p.wx + p.n.x*.0012, p.wy + p.n.y*.0012, p.wz + p.n.z*.0012);
        if (p.body) { const r = p.body.rotation(); p.disc.quaternion.set(r.x, r.y, r.z, r.w); }
        p.disc.material.color.setHex(lookCol(p.c)); p.disc.material.opacity = lk ? Math.max(.55, lk.op) : .8; }
      p.mound.visible = p.rp > .004;
      if (p.mound.visible) { const h = p.rp*.6; p.mound.quaternion.copy(q); p.mound.position.set(p.wx + p.n.x*h/2, p.wy + p.n.y*h/2, p.wz + p.n.z*h/2); p.mound.scale.set(p.rp, h, p.rp);
        p.mound.material.color.setHex(chem.pileColor(p.c)); }
    }
  }
  // the edge, lightly smoothed and drawn twice as finely, so it reads as liquid rather than a star;
  // never inside the pile of powder it sits round
  function shape(p){
    const R = p.R, at = p.disc.geometry.attributes.position, A = at.array, fl = p.fl = p.rp*1.15;
    p.dirty = false;
    for (let i = 0; i < N; i++) _s[i] = (R[(i + N - 1) % N] + 2*R[i] + R[(i + 1) % N])/4;
    for (let j = 0; j < DRAWN; j++) {
      const i = j >> 1, r = j & 1 ? (9*(_s[i] + _s[(i + 1) % N]) - _s[(i + N - 1) % N] - _s[(i + 2) % N])/16 : _s[i];
      const rr = Math.max(r, fl), ca = Math.cos(j*DA/2)*rr, sa = Math.sin(j*DA/2)*rr;
      A[j*3 + 3] = ca*p.e1.x + sa*p.e2.x; A[j*3 + 4] = ca*p.e1.y + sa*p.e2.y; A[j*3 + 5] = ca*p.e1.z + sa*p.e2.z;
    }
    at.needsUpdate = true; p.disc.geometry.computeBoundingSphere();
  }
  function clear(){ drops.length = foams.length = 0; for (const p of pools) dropPool(p); pools.length = 0; gasTotal = 0; dropMesh.count = foamMesh.count = 0; }
  // the puddle at a point, if there is one (things sitting in a puddle get wet)
  function poolAt(x, y, z, reach = .01){ return pools.find(p => inside(p, x, y, z, reach)) || null; }
  // each puddle's edge as points on the desk, for the checks
  const outlines = () => pools.filter(p => p.A > 0).map(p => ({x:p.wx, z:p.wz, pts:Array.from(p.R, (r, i) => {
    const ca = Math.cos(i*DA)*r, sa = Math.sin(i*DA)*r, x = p.lp.x + ca*p.e1.x + sa*p.e2.x, y = p.lp.y + ca*p.e1.y + sa*p.e2.y, z = p.lp.z + ca*p.e1.z + sa*p.e2.z;
    const w = p.body ? toWorld(p.body, x, y, z) : {x, z}; return {x:w.x, z:w.z}; })}));
  return {emit, gush, step, draw, clear, poolAt, outlines, gas: () => gasTotal};
}
