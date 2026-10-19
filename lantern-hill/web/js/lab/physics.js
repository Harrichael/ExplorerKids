// Rigid-body physics for the experiment desk, on Rapier. The world's frame is the desk's: origin at
// the middle of the mat's top, y up. Everything on the desk is a real body, so cups tip, eggs roll,
// things drop into containers and get knocked off each other. Invisible walls keep it all on the mat.

import RAPIER from '@dimforge/rapier3d-compat';

export const STEP = 1/60;
// collision groups as (membership << 16) | filter: the desk, containers, other things, and a spoon or
// swab in use. Held, it slides through everything but the mat, so stirring can't shove a cup over; let go
// in a cup, it leans on the glass but passes through what's inside until it's lifted out.
const DESK = 0x0004ffff, VESSEL = 0x0008ffff, HELD = 0x00020004, RESTING = 0x0002000c;
export const THING = 0x0001ffff;
export const P = {R:null, world:null, desk:null};
export const ready = (async () => { await RAPIER.init(); P.R = RAPIER; })();

export function makeWorld(bounds){
  const R = P.R;
  // Old worlds are dropped, never freed: in this Rapier, freeing or removing things can panic inside wasm,
  // and a panic leaves the whole module wedged. A world for one experiment is small.
  const w = P.world = new R.World({x:0, y:-9.81, z:0}); w.timestep = STEP;
  P.desk = w.createRigidBody(R.RigidBodyDesc.fixed());
  const fixed = (hx, hy, hz, x, y, z) => w.createCollider(R.ColliderDesc.cuboid(hx, hy, hz).setTranslation(x, y, z).setFriction(.8).setRestitution(.05).setCollisionGroups(DESK), P.desk);
  fixed(bounds.x + .3, .05, bounds.z + .3, 0, -.05, 0);
  const H = .4, X = bounds.x + .06, Z = bounds.z + .06;
  fixed(.02, H, Z, X + .02, H, 0); fixed(.02, H, Z, -X - .02, H, 0); fixed(X, H, .02, 0, H, Z + .02); fixed(X, H, .02, 0, H, -Z - .02);
  return w;
}

const yRot = a => ({x:0, y:Math.sin(a/2), z:0, w:Math.cos(a/2)});
const zRot = a => ({x:0, y:0, z:Math.sin(a/2), w:Math.cos(a/2)});
// Collider descriptions for a shape list (see SHAPE in stuff.js), with the density each part weighs
function parts(shape, density){
  const R = P.R, out = [], d = (desc, x, y, z, rot) => { desc.setTranslation(x, y, z); if (rot) desc.setRotation(rot); out.push(desc.setDensity(density).setFriction(.65).setRestitution(.12)); };
  for (const [k, ...a] of shape) {
    if (k === 'hollow') {
      const [ri, h, wall, floor] = a, n = ri > .1 ? 16 : 10, rr = ri + wall/2, L = 2*Math.PI*rr/n*1.12;
      d(R.ColliderDesc.cylinder(floor/2, ri + wall), 0, floor/2, 0);
      for (let i = 0; i < n; i++) { const t = i/n*Math.PI*2; d(R.ColliderDesc.cuboid(wall/2, h/2, L/2), Math.cos(t)*rr, h/2, Math.sin(t)*rr, yRot(-t)); }
    } else if (k === 'neck') {
      const [r, y0, y1, rOut] = a, n = 8, L = 2*Math.PI*r/n*1.2, sr = (r + rOut)/2, SL = 2*Math.PI*sr/10*1.2;
      for (let i = 0; i < n; i++) { const t = i/n*Math.PI*2; d(R.ColliderDesc.cuboid(.003, (y1 - y0 - .015)/2, L/2), Math.cos(t)*(r + .003), (y0 + .015 + y1)/2, Math.sin(t)*(r + .003), yRot(-t)); }
      for (let i = 0; i < 10; i++) { const t = i/10*Math.PI*2; d(R.ColliderDesc.cuboid((rOut - r)/2, .006, SL/2), Math.cos(t)*sr, y0 + .008, Math.sin(t)*sr, yRot(-t)); }
    } else if (k === 'hollow-box') {
      const [w, h, dd, wall] = a;
      d(R.ColliderDesc.cuboid(w/2, wall/2, dd/2), 0, wall/2, 0);
      d(R.ColliderDesc.cuboid(w/2, h/2, wall/2), 0, h/2, dd/2 - wall/2); d(R.ColliderDesc.cuboid(w/2, h/2, wall/2), 0, h/2, -dd/2 + wall/2);
      d(R.ColliderDesc.cuboid(wall/2, h/2, dd/2), w/2 - wall/2, h/2, 0); d(R.ColliderDesc.cuboid(wall/2, h/2, dd/2), -w/2 + wall/2, h/2, 0);
    } else if (k === 'cyl') { const [r, h, y0] = a; d(R.ColliderDesc.cylinder(h/2, r), 0, y0 + h/2, 0); }
    else if (k === 'box') { const [w, h, dd, y0, x = 0] = a; d(R.ColliderDesc.cuboid(w/2, h/2, dd/2), x, y0 + h/2, 0); }
    else if (k === 'ball') { const [r, y] = a; d(R.ColliderDesc.ball(r), 0, y, 0); }
    else if (k === 'bar') { const [len, th, axis, y] = a; d(R.ColliderDesc.capsule(len/2 - th/2, th/2), 0, axis === 'y' ? len/2 : y, 0, axis === 'y' ? null : zRot(Math.PI/2)); }
    else if (k === 'crater') {
      // a cone with a chamber down its middle: wedges round a wide hole below the neck and a narrow
      // one above it, each wedge convex, on a solid floor
      const [rt, rb, h, ri, neckY, rNeck, floor] = a, n = 14, rAt = y => rb + (rt - rb)*y/h;
      d(R.ColliderDesc.cylinder(floor/2, ri + .01), 0, floor/2, 0);
      for (const [y0, y1, hole] of [[0, neckY, ri], [neckY, h, rNeck]]) for (let i = 0; i < n; i++) {
        const pts = [];
        for (const t of [i/n*Math.PI*2, (i + 1.08)/n*Math.PI*2]) for (const [y, r] of [[y0, hole], [y1, hole], [y0, rAt(y0)], [y1, rAt(y1)]]) pts.push(Math.cos(t)*r, y, Math.sin(t)*r);
        out.push(R.ColliderDesc.convexHull(new Float32Array(pts)).setDensity(density).setFriction(.7).setRestitution(.05));
      }
    }
  }
  return out;
}

export function makeBody(def, x, y, z, item){
  const R = P.R, w = P.world;
  const body = w.createRigidBody(R.RigidBodyDesc.dynamic().setTranslation(x, y, z).setCcdEnabled(true).setLinearDamping(.15).setAngularDamping(.6));
  // containers are thin shells that get their weight from what's in them; supplies are approximated as
  // solid blocks, so they weigh almost nothing on their own
  const density = def.density ? def.density*1000 : def.kind === 'tool' ? 2500 : def.glass ? 2500 : def.shape[0][0].startsWith('hollow') ? 900 : 150;
  const group = def.kind === 'vessel' || def.kind === 'tray' ? VESSEL : THING;
  for (const c of parts(def.shape, density)) w.createCollider(c.setCollisionGroups(group), body);
  body.userData = item;
  return body;
}
export function retire(b){ b.setEnabled(false); }
export function ghost(b, how){ const g = how === 'held' ? HELD : how === 'resting' ? RESTING : THING; for (let i = 0; i < b.numColliders(); i++) b.collider(i).setCollisionGroups(g); }

// ---------- queries ----------
let ray = null;
// first thing a ray from (ox,oy,oz) along (dx,dy,dz) hits within len, as {t, body, nx, ny, nz};
// `skip` is a body to ignore
let warned = false;
export function cast(ox, oy, oz, dx, dy, dz, len, skip){
  // a bad number reaching Rapier's query panics inside wasm and wedges the whole world; so does a zero
  // direction from inside a collider
  if (!Number.isFinite(ox + oy + oz + dx + dy + dz + len) || len <= 0 || dx*dx + dy*dy + dz*dz < .25) { if (!warned) { warned = true; console.warn('lab: skipped a ray with bad numbers', ox, oy, oz, dx, dy, dz, len, new Error().stack); } return null; }
  if (!ray) ray = new P.R.Ray({x:0, y:0, z:0}, {x:0, y:-1, z:0});
  ray.origin.x = ox; ray.origin.y = oy; ray.origin.z = oz; ray.dir.x = dx; ray.dir.y = dy; ray.dir.z = dz;
  const hit = P.world.castRayAndGetNormal(ray, len, true, undefined, undefined, undefined, skip || undefined);
  if (!hit) return null;
  // a ray starting inside a collider hits at once with a zero normal; call the surface the one it came through
  const n = hit.normal, zero = !(n.x || n.y || n.z);
  return {t:hit.toi, body:hit.collider.parent(), nx: zero ? -dx : n.x, ny: zero ? -dy : n.y, nz: zero ? -dz : n.z};
}

// ---------- frames ----------
// rotate v by quaternion q (or its inverse) in place
export function rot(q, v, inverse){
  const x = v.x, y = v.y, z = v.z, qx = inverse ? -q.x : q.x, qy = inverse ? -q.y : q.y, qz = inverse ? -q.z : q.z, qw = q.w;
  const ix = qw*x + qy*z - qz*y, iy = qw*y + qz*x - qx*z, iz = qw*z + qx*y - qy*x, iw = -qx*x - qy*y - qz*z;
  v.x = ix*qw + iw*-qx + iy*-qz - iz*-qy; v.y = iy*qw + iw*-qy + iz*-qx - ix*-qz; v.z = iz*qw + iw*-qz + ix*-qy - iy*-qx;
  return v;
}
export function toLocal(b, x, y, z, out = {}){ const t = b.translation(); out.x = x - t.x; out.y = y - t.y; out.z = z - t.z; return rot(b.rotation(), out, true); }
export function toWorld(b, x, y, z, out = {}){ out.x = x; out.y = y; out.z = z; rot(b.rotation(), out); const t = b.translation(); out.x += t.x; out.y += t.y; out.z += t.z; return out; }
export function upOf(b, out = {}){ out.x = 0; out.y = 1; out.z = 0; return rot(b.rotation(), out); }
