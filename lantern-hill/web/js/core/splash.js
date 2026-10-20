// Water underfoot, drawn the toon way: a white ring that spreads and fades on the surface, and a few
// chunky droplets thrown up that fall back in. One small pool of meshes serves every world; a mesh
// moves into whichever scene it is next needed in. The world says where its water is, w.water(x, z),
// so a ring spreads only as far as the water does and never out over the bank.
//
//   splash(w, x, z, y)            a foot coming down in water whose surface is at y
//   wading(who, w, x, z, y, dt)   each frame someone stands still in water: a slow ripple now and then
//   updateSplash(dt)              once a frame

import * as THREE from 'three';

// a white crest with a thin teal trough just inside it, so the ring reads on pale water as well as dark
const RING = new THREE.RingGeometry(.84, 1, 28).rotateX(-Math.PI/2), TROUGH = new THREE.RingGeometry(.7, .84, 28).rotateX(-Math.PI/2);
const DROP = new THREE.IcosahedronGeometry(1, 0);
const rings = [], drops = [];
function take(list, make, scene){
  let o = list.find(o => !o.m.visible);
  if (!o) { if (list.length >= 48) return null; o = make(); list.push(o); }
  if (o.m.parent !== scene) scene.add(o.m);
  o.m.visible = true; o.age = 0; return o;
}
const ringOf = () => { const m = new THREE.Mesh(RING, new THREE.MeshBasicMaterial({color:0xf4fbff, transparent:true, depthWrite:false}));
  const tr = new THREE.Mesh(TROUGH, new THREE.MeshBasicMaterial({color:0x2a7896, transparent:true, depthWrite:false})); m.add(tr);
  m.renderOrder = tr.renderOrder = 2; return {m, tr}; };
const dropOf = () => ({m:new THREE.Mesh(DROP, new THREE.MeshBasicMaterial({color:0xe6f6ff, transparent:true}))});

// how far a ring may spread from x, z before some side of it leaves the water
function room(w, x, z, want){
  let r = want;
  for (let i = 0; i < 8; i++) { const c = Math.cos(i*Math.PI/4), s = Math.sin(i*Math.PI/4);
    for (let d = .1; d < r; d += .1) if (w.water(x + c*d, z + s*d) === null) { r = d - .05; break; } }
  return r;
}
// a stream runs downhill, so a ring lies tilted with the water under it rather than half sunk in it
const up = new THREE.Vector3(0, 1, 0), tilt = new THREE.Vector3();
function slopeAt(w, x, z, y, r){
  const at = (dx, dz) => { const v = w.water(x + dx, z + dz); return v === null ? y : v; };
  return tilt.set(at(-r, 0) - at(r, 0), 2*r, at(0, -r) - at(0, r)).normalize();
}
function ripple(w, x, z, y, {size = .7, life = .9, delay = 0, opacity = .9} = {}){
  size = room(w, x, z, size); if (size < .12) return;
  const o = take(rings, ringOf, w.scene); if (!o) return;
  Object.assign(o, {size, life, delay, opacity}); o.age = -delay;
  o.m.quaternion.setFromUnitVectors(up, slopeAt(w, x, z, y, size*.8));
  o.m.position.set(x, y + .015, z); o.m.scale.setScalar(.01); o.m.material.opacity = o.tr.material.opacity = 0;
}

export function splash(w, x, z, y){
  ripple(w, x, z, y, {size:.75, life:.85});
  ripple(w, x, z, y, {size:.45, life:.7, delay:.12, opacity:.7});
  const n = 3 + Math.floor(Math.random()*3);
  for (let i = 0; i < n; i++) {
    const o = take(drops, dropOf, w.scene); if (!o) return;
    const a = Math.random()*Math.PI*2, out = .5 + Math.random()*.7;
    o.vx = Math.cos(a)*out; o.vz = Math.sin(a)*out; o.vy = 1.7 + Math.random()*1.1; o.floor = y; o.w = w; o.r = .045 + Math.random()*.035;
    o.m.position.set(x + o.vx*.08, y + .03, z + o.vz*.08); o.m.scale.setScalar(o.r); o.m.material.opacity = 1;
  }
}

// `who` keeps its own timer, so each person in the water ripples on their own beat
export function wading(who, w, x, z, y, dt){
  who.calm = (who.calm === undefined ? .4 : who.calm) - dt;
  if (who.calm < 0) { who.calm = 1.3 + Math.random()*1.4; ripple(w, x, z, y, {size:.55, life:1.8, opacity:.55}); }
}

export function updateSplash(dt){
  for (const o of rings) { if (!o.m.visible) continue;
    o.age += dt; if (o.age < 0) continue;
    const k = o.age/o.life; if (k >= 1) { o.m.visible = false; continue; }
    o.m.scale.setScalar(o.size*(.2 + .8*(1 - (1 - k)**2)));
    o.m.material.opacity = o.opacity*(1 - k)*Math.min(1, o.age*12); o.tr.material.opacity = o.m.material.opacity*.45; }
  for (const o of drops) { if (!o.m.visible) continue;
    o.vy -= 9.5*dt; const p = o.m.position; p.x += o.vx*dt; p.y += o.vy*dt; p.z += o.vz*dt;
    // a drop stretches as it falls, then lands with a tiny ring of its own
    o.m.scale.set(o.r, o.r*(1 + Math.min(.8, Math.abs(o.vy)*.25)), o.r);
    if (o.vy < 0 && p.y <= o.floor) { o.m.visible = false; if (o.w.water(p.x, p.z) !== null) ripple(o.w, p.x, p.z, o.floor, {size:.16, life:.45, opacity:.7}); } }
}
