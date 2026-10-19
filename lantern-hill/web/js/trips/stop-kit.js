import * as THREE from 'three';
import { makeLabel } from '../characters/build.js';
import { PERSONA } from '../characters/cast.js';
import { C, T, XF, add, box, cyl, grp, leafCloud, mergeGeos, meshOf, outlineMat, rrect, tex } from '../core/kit.js';
import { makeWorld } from '../core/world.js';

// A field trip place: a world whose frame update runs whatever its builders pushed onto w.anims.
export function tripWorld(o){
  const w = makeWorld(o); w.anims = [];
  w.update = (dt, t) => w.anims.forEach(f => f(dt, t));
  return w;
}
// a soft round puff, for steam, smoke and bubbles
export const puffTex = tex(64, 64, (c, w, h) => { const g = c.createRadialGradient(32, 32, 0, 32, 32, 32); g.addColorStop(0, 'rgba(255,255,255,.9)'); g.addColorStop(.55, 'rgba(255,255,255,.45)'); g.addColorStop(1, 'rgba(255,255,255,0)'); c.fillStyle = g; c.fillRect(0, 0, w, h); });
puffTex.wrapS = puffTex.wrapT = THREE.ClampToEdgeWrapping;
// a column of puffs rising from a spot and fading as they go; puffs(w, x, y, z, {rate, rise, size, color})
export function puffs(w, x, y, z, {rate = 3, rise = 1.2, size = 1, color = 0xffffff, opacity = .55, spread = .3, life = 2.4} = {}){
  const all = [], src = {x, y, z, rate, burst:0};
  for (let i = 0; i < Math.ceil(rate*life) + 8; i++) { const s = new THREE.Sprite(new THREE.SpriteMaterial({map:puffTex, color, transparent:true, depthWrite:false, opacity:0})); s.visible = false; w.scene.add(s); all.push({s, age:life}); }
  let acc = 0, next = 0;
  w.anims.push(dt => {
    acc += dt*(src.rate + src.burst*12); src.burst = Math.max(0, src.burst - dt);
    while (acc >= 1) { acc -= 1; const p = all[next]; next = (next + 1) % all.length; p.age = 0; p.dx = (Math.random() - .5)*spread; p.dz = (Math.random() - .5)*spread; p.s.visible = true; }
    for (const p of all) { if (p.age >= life) { p.s.visible = false; continue; } p.age += dt; const k = p.age/life;
      p.s.position.set(src.x + p.dx*(1 + k*3), src.y + k*rise*life, src.z + p.dz*(1 + k*3)); p.s.scale.setScalar(size*(.4 + k*1.6)); p.s.material.opacity = opacity*Math.sin(Math.PI*Math.min(1, k*1.3)); }
  });
  return src;
}
export function spawnNPC(w, pid, x, z, ry, lines = []){
  const p = PERSONA[pid], model = p.make();
  model.root.traverse(m => { if (m.isMesh && m.material !== outlineMat) m.castShadow = true; });
  const y = w.ground(x, z); model.root.position.set(x, y, z); model.root.rotation.y = ry; w.scene.add(model.root);
  const label = makeLabel(p.name, p.dot); label.position.set(x, y + p.labelY, z); w.scene.add(label);
  const n = {model, x, y, z, gy:y, baseAngle:ry, label, labelY:p.labelY, line:0, t:Math.random()*10, range:1.7,
    blinkAt:1 + Math.random()*3, name:p.name, role:p.role, dot:p.dot, voice:p.voice, kind:p.kind, persona:p, lines, walk:0};
  w.npcs.push(n); return n;
}
export function signpost(x, z, text, y0 = 0, ry = 0){
  const g = grp(x, y0, z, ry);
  cyl(.06, .07, 1.4, T(C.woodDk), 0, .7, 0, g, 6);
  const t = tex(320, 110, (c, cw, ch) => { c.fillStyle = '#8a5a3a'; rrect(c, 5, 5, cw - 10, ch - 10, 16); c.fill(); c.strokeStyle = '#4a2e22'; c.lineWidth = 7; rrect(c, 5, 5, cw - 10, ch - 10, 16); c.stroke();
    c.fillStyle = '#f6ecd6'; c.font = `800 ${text.length > 11 ? 34 : 42}px Nunito, sans-serif`; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(text, cw/2, ch/2 + 2); });
  box(1.8, .62, .08, T(C.woodDk), 0, 1.45, 0, g);
  add(new THREE.PlaneGeometry(1.75, .6), T(0xffffff, {map:t, transparent:true}), 0, 1.45, .045, g, false);
  return g;
}

export function miniTree(x, y, z, s, parent){ const g = grp(x, y, z, 0, parent);
  meshOf(mergeGeos([[new THREE.CylinderGeometry(.05*s, .09*s, .5*s, 8), XF(0, .25*s, 0)]]), C.woodDk, g, .02*s);
  leafCloud(g, [[0, .68*s, 0, .26*s, 1], [.17*s, .6*s, .08*s, .17*s, 0], [-.16*s, .62*s, -.06*s, .18*s, 1], [.02*s, .86*s, .02*s, .16*s, 2]], .025*s);
  return g; }
