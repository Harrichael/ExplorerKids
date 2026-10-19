// The Wonder Bus out on a field trip: it flies along paths through a place, and changes shape to
// suit it, growing a drill to dig, fins to swim, or a heat bubble to keep the class cool.
//
//   const bus = tripBus(w, {x, y, z, ry});          // parked
//   bus.gear('drill');                              // or 'sub', 'bubble', null for plain
//   await bus.fly([[x, y, z], ...], 4);             // along a smooth path, nose first
//   await bus.boarding(t);                          // until the explorer climbs back aboard
//
// The model faces +x, like the bus at HQ.

import * as THREE from 'three';
import { C, T, add, clamp01, cyl, ease, occluder, outline } from '../core/kit.js';
import { inWorld } from '../core/world.js';
import { buildBus } from '../props/wonder-bus.js';

const tan = new THREE.Vector3(), tan2 = new THREE.Vector3();

export function tripBus(w, at){
  const root = new THREE.Group(), body = new THREE.Group(); root.add(body); w.scene.add(root);
  let drill, fins, bubble;
  inWorld(w, () => {
    buildBus(body);
    // a gold drill bit on the nose, ringed with a spiral thread
    drill = new THREE.Group(); drill.position.set(3.05, 1.05, 0); body.add(drill);
    const bit = add(new THREE.ConeGeometry(.78, 2.1, 14), T(C.gold), 1.05, 0, 0, drill); bit.rotation.z = -Math.PI/2; outline(bit, 1.04);
    for (let k = 0; k < 5; k++) { const r = .66 - k*.13, ring = add(new THREE.TorusGeometry(r, .05, 6, 18), T(0xa8782a), .2 + k*.38, 0, 0, drill, false); ring.rotation.y = Math.PI/2; ring.rotation.x = k*.4; }
    // fins, a tail and a propeller for under the sea
    fins = new THREE.Group(); body.add(fins);
    for (const sz of [-1, 1]) { const f = add(new THREE.BoxGeometry(1.4, .08, .9), T(0x2f8f8a), -.2, .75, sz*1.35, fins); f.rotation.y = sz*.25; outline(f, 1.05); }
    const tail = add(new THREE.BoxGeometry(.9, 1.0, .08), T(0x2f8f8a), -2.55, 2.5, 0, fins); tail.rotation.z = .35; outline(tail, 1.05);
    const prop = new THREE.Group(); prop.position.set(-2.95, 1.05, 0); fins.add(prop); fins.userData.prop = prop;
    for (let k = 0; k < 3; k++) { const b = add(new THREE.BoxGeometry(.06, .9, .2), T(C.gold), 0, 0, 0, prop); b.rotation.x = k*Math.PI*2/3; }
    cyl(.12, .12, .2, T(C.ink), -2.85, 1.05, 0, fins, 10).rotation.z = Math.PI/2;
    // parked between the camera and the explorer, it fades to let them be seen
    occluder(body);
  });
  bubble = new THREE.Mesh(new THREE.SphereGeometry(3.4, 32, 20), new THREE.MeshBasicMaterial({color:0x9fe8ff, transparent:true, opacity:.16, depthWrite:false, blending:THREE.AdditiveBlending}));
  bubble.position.set(0, 1.3, 0); bubble.scale.set(1.15, .8, .85); body.add(bubble);
  const rim = new THREE.Mesh(new THREE.SphereGeometry(3.42, 32, 20), new THREE.MeshBasicMaterial({color:0xc8f4ff, transparent:true, opacity:.22, side:THREE.BackSide, depthWrite:false, blending:THREE.AdditiveBlending}));
  bubble.add(rim);
  const bus = {root, body, flight:null, spin:0,
    gear(g){ drill.visible = g === 'drill'; fins.visible = g === 'sub'; bubble.visible = g === 'bubble'; },
    // parked, it's solid; the box is the bus's footprint turned to face the way it's parked
    park(x, y, z, ry){ bus.flight = null; root.position.set(x, y, z); root.rotation.set(0, ry, 0); body.rotation.set(0, 0, 0);
      const pts = [[-2.5, -1.05], [3.2, -1.05], [3.2, 1.05], [-2.5, 1.05]].map(([lx, lz]) => [x + lx*Math.cos(ry) + lz*Math.sin(ry), z - lx*Math.sin(ry) + lz*Math.cos(ry)]);
      solid({minX:Math.min(...pts.map(p => p[0])), maxX:Math.max(...pts.map(p => p[0])), minZ:Math.min(...pts.map(p => p[1])), maxZ:Math.max(...pts.map(p => p[1])), minY:y - 1, maxY:y + 3}); },
    // nose along the path, climbing and diving with it, banking into turns; resolves on arrival
    fly(points, dur, {roll = 1, easing = ease} = {}){
      const curve = new THREE.CatmullRomCurve3(points.map(p => new THREE.Vector3(...p)), false, 'centripetal');
      solid(null);
      return new Promise(done => { bus.flight = {curve, dur, t:0, roll, easing, done}; });
    },
    // the door, on the bus's left side, in the place's coordinates
    door(out = 0){ const a = root.rotation.y, lx = 1.62, lz = -.97 - out; return [root.position.x + lx*Math.cos(a) + lz*Math.sin(a), root.position.z - lx*Math.sin(a) + lz*Math.cos(a)]; },
    async boarding(t, when){
      const [x, z] = bus.door(.7);
      t.goal('Back to the Wonder Bus when you’re ready');
      await t.use(w, {name:'Wonder Bus', x, z, verb:'Climb aboard the Wonder Bus', short:'Board', glow:[x, root.position.y + 2.6, z], when});
      t.goal('');
    },
  };
  let box = null;
  const solid = b => { if (box) w.colliders.splice(w.colliders.indexOf(box), 1); box = b; if (b) w.colliders.push(b); };
  bus.gear(null);
  if (at) bus.park(at.x, at.y, at.z, at.ry || 0);
  w.anims.push((dt, t) => {
    if (drill.visible) drill.rotation.x += dt*14;
    if (fins.visible) fins.userData.prop.rotation.x += dt*10;
    if (bubble.visible) bubble.material.opacity = .14 + Math.sin(t*3)*.03;
    const f = bus.flight;
    if (!f) { body.position.y = Math.sin(t*1.7)*.05; return; }
    f.t += dt; const u = f.easing(clamp01(f.t/f.dur));
    f.curve.getPointAt(u, root.position); f.curve.getTangentAt(u, tan); f.curve.getTangentAt(Math.min(1, u + .02), tan2);
    const yaw = Math.atan2(-tan.z, tan.x), turn = Math.atan2(Math.sin(Math.atan2(-tan2.z, tan2.x) - yaw), Math.cos(Math.atan2(-tan2.z, tan2.x) - yaw));
    // a path straight up or down has no heading of its own; keep the one it had
    if (Math.hypot(tan.x, tan.z) > .05) root.rotation.y = yaw;
    body.rotation.set(-Math.max(-.4, Math.min(.4, turn*6))*f.roll, 0, Math.atan2(tan.y, Math.hypot(tan.x, tan.z)));
    body.position.y = 0;
    if (f.t >= f.dur) { bus.flight = null; body.rotation.x = 0; f.done(); }
  });
  return bus;
}
