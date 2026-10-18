import * as THREE from 'three';
import { makeLabel } from '../characters/build.js';
import { PERSONA } from '../characters/cast.js';
import { C, T, XF, add, box, cyl, grp, leafCloud, mergeGeos, meshOf, outlineMat, rrect, tex } from '../core/kit.js';

export function spawnNPC(w, pid, x, z, ry, lines, follow){
  const p = PERSONA[pid], model = p.make();
  model.root.traverse(m => { if (m.isMesh && m.material !== outlineMat) m.castShadow = true; });
  const y = w.ground(x, z); model.root.position.set(x, y, z); model.root.rotation.y = ry; w.scene.add(model.root);
  const label = makeLabel(p.name, p.dot); label.position.set(x, y + p.labelY, z); w.scene.add(label);
  const n = {model, x, y, z, gy:y, baseAngle:ry, label, labelY:p.labelY, line:0, t:Math.random()*10, range: follow === undefined ? 2.2 : 1.5,
    blinkAt:1 + Math.random()*3, name:p.name, role:p.role, dot:p.dot, voice:p.voice, kind:p.kind, persona:p, lines, follow, walk:0};
  w.npcs.push(n); return n;
}
export function crew(w, hints, skip){
  ['sparks', 'pip', 'juniper'].forEach((id, i) => { if (skip !== id) spawnNPC(w, id, 0, 0, Math.PI, hints[id], i); });
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
