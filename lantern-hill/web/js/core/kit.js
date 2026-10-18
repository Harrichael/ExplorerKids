// The build kit every world is made from: toon materials, mesh helpers, seeded randomness, textures.

import * as THREE from 'three';

// ---------- materials / helpers ----------
export const grad = new THREE.DataTexture(new Uint8Array([95,95,95,255, 175,175,175,255, 255,255,255,255]), 3, 1, THREE.RGBAFormat);
grad.minFilter = grad.magFilter = THREE.NearestFilter; grad.generateMipmaps = false; grad.needsUpdate = true;
const cache = {};
export function T(c, o){
  if (o && o.map) return new THREE.MeshToonMaterial(Object.assign({color:c, gradientMap:grad}, o));
  const k = c + (o ? JSON.stringify(o) : '');
  return cache[k] || (cache[k] = new THREE.MeshToonMaterial(Object.assign({color:c, gradientMap:grad}, o || {})));
}
export const glowM = (c, i=1) => T(c, {emissive:c, emissiveIntensity:i});
export const outlineMat = new THREE.MeshBasicMaterial({color:0x1a1320, side:THREE.BackSide});
export function outline(m, s=1.07){ const o = new THREE.Mesh(m.geometry, outlineMat); o.scale.setScalar(s); m.add(o); return m; }

export function add(geo, mat, x, y, z, parent, shadow=true){
  const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z);
  m.castShadow = shadow; m.receiveShadow = true;
  (parent || BUILD.scene).add(m); return m;
}
export const box = (w,h,d,mat,x,y,z,p,s) => add(new THREE.BoxGeometry(w,h,d), mat, x,y,z,p,s);
export const cyl = (rt,rb,h,mat,x,y,z,p,seg=12,s) => add(new THREE.CylinderGeometry(rt,rb,h,seg), mat, x,y,z,p,s);
export const sph = (r,mat,x,y,z,p,seg=14,s) => add(new THREE.SphereGeometry(r,seg,Math.max(6,Math.round(seg*.7))), mat, x,y,z,p,s);
export const grp = (x=0,y=0,z=0,ry=0,p) => { const g = new THREE.Group(); g.position.set(x,y,z); g.rotation.y = ry; (p||BUILD.scene).add(g); return g; };

export const col = (minX,maxX,minZ,maxZ,minY=-5,maxY=99) => BUILD.colliders.push({minX,maxX,minZ,maxZ,minY,maxY});

// the world that add(), col() and occluder() build into: HQ by default, retargeted by inWorld()
export const BUILD = {scene:null, colliders:null, occluders:null, occMeshes:null};
export function occluder(obj){
  const rec = {meshes:[], cur:1, target:1};
  obj.traverse(m => { if (m.isMesh && m.material !== outlineMat) {
    m.material = m.material.clone(); m.material.transparent = true;
    m.userData.occ = rec; m.userData.baseOp = m.material.opacity; rec.meshes.push(m); BUILD.occMeshes.push(m);
  }});
  BUILD.occluders.push(rec); return obj;
}

export function tex(w, h, draw, rx=1, ry=1){
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c); t.encoding = THREE.sRGBEncoding;
  t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(rx, ry); t.anisotropy = 4;
  return t;
}
let seed = 11; export const rand = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
export const rr = (a, b) => a + rand() * (b - a);
// ---------- foliage kit: puffy cel-shaded leaf clouds with ink outlines (Wind Waker style) ----------
// own seed so adding detail never reshuffles the rest of the seeded layout
let fseed = 7; export const frand = () => (fseed = (fseed * 16807) % 2147483647) / 2147483647, fr = (a, b) => a + frand() * (b - a);
const _m4 = new THREE.Matrix4(), _q = new THREE.Quaternion(), _e = new THREE.Euler(), _v = new THREE.Vector3(), _sc = new THREE.Vector3();
export const XF = (x, y, z, sx=1, sy=sx, sz=sx, rx=0, ry=0, rz=0) => new THREE.Matrix4().compose(_v.set(x, y, z), _q.setFromEuler(_e.set(rx, ry, rz)), _sc.set(sx, sy, sz));
export function mergeGeos(parts){
  let nv = 0, ni = 0;
  for (const [g] of parts) { nv += g.attributes.position.count; ni += g.index ? g.index.count : g.attributes.position.count; }
  const pos = new Float32Array(nv*3), nor = new Float32Array(nv*3), idx = new Uint32Array(ni), nm = new THREE.Matrix3(), v = new THREE.Vector3();
  let vo = 0, io = 0;
  for (const [g, m] of parts) {
    nm.getNormalMatrix(m); const p = g.attributes.position, n = g.attributes.normal;
    for (let i = 0; i < p.count; i++) {
      v.fromBufferAttribute(p, i).applyMatrix4(m); pos[(vo+i)*3] = v.x; pos[(vo+i)*3+1] = v.y; pos[(vo+i)*3+2] = v.z;
      v.fromBufferAttribute(n, i).applyMatrix3(nm).normalize(); nor[(vo+i)*3] = v.x; nor[(vo+i)*3+1] = v.y; nor[(vo+i)*3+2] = v.z;
    }
    if (g.index) for (let i = 0; i < g.index.count; i++) idx[io++] = g.index.getX(i) + vo; else for (let i = 0; i < p.count; i++) idx[io++] = i + vo;
    vo += p.count; g.dispose();
  }
  const out = new THREE.BufferGeometry();
  out.setAttribute('position', new THREE.BufferAttribute(pos, 3)); out.setAttribute('normal', new THREE.BufferAttribute(nor, 3)); out.setIndex(new THREE.BufferAttribute(idx, 1));
  return out;
}
// ink outline as a shell pushed out along the normals (works on merged clusters, unlike a scaled copy)
function inkShell(geo, t, parent, mat){
  const g = geo.clone(), p = g.attributes.position, n = g.attributes.normal;
  for (let i = 0; i < p.count; i++) p.setXYZ(i, p.getX(i) + n.getX(i)*t, p.getY(i) + n.getY(i)*t, p.getZ(i) + n.getZ(i)*t);
  const m = new THREE.Mesh(g, mat || outlineMat); parent.add(m); return m;
}
export function meshOf(geo, color, parent, ink, inkMat){
  const m = new THREE.Mesh(geo, color.isMaterial ? color : T(color)); m.castShadow = true; m.receiveShadow = true; parent.add(m);
  if (ink) inkShell(geo, ink, parent, inkMat); return m;
}
export const LEAF = {dk:0x2f5537, md:0x3f6d45, lt:0x5b8c50, tip:0x76a35c};
// puffs: [x, y, z, r, tone]; tone 0 = shade, 1 = body, 2 = sunlit top
export function leafCloud(parent, puffs, ink=.045, inkMat){
  const by = [[], [], []];
  for (const [x, y, z, r, tone] of puffs) {
    by[tone].push([new THREE.SphereGeometry(r, 16, 12), XF(x, y, z, 1, fr(.82, .95), 1, 0, fr(0, 6), 0)]);
    // little leaf tufts poking out of each puff give the silhouette its scalloped edge
    const nt = r > .5 ? 3 : 2;
    for (let k = 0; k < nt; k++) { const a = fr(0, Math.PI*2), el = fr(-.2, .9), tr = r * fr(.32, .42);
      by[tone].push([new THREE.SphereGeometry(tr, 10, 8), XF(x + Math.cos(a)*Math.cos(el)*r*.92, y + Math.sin(el)*r*.85, z + Math.sin(a)*Math.cos(el)*r*.92)]); }
  }
  const cols = [LEAF.dk, LEAF.md, LEAF.lt], all = [];
  by.forEach((parts, i) => { if (parts.length) { const g = mergeGeos(parts); all.push(meshOf(g, cols[i], parent, ink, inkMat)); } });
  return all;
}
export function barkGeo(pts, r0, r1){
  // a gently curving trunk from a list of points, tapering r0 -> r1
  const parts = [];
  for (let i = 0; i < pts.length - 1; i++) {
    const a = new THREE.Vector3(...pts[i]), b = new THREE.Vector3(...pts[i+1]), d = b.clone().sub(a), L = d.length();
    const ra = r0 + (r1 - r0) * i/(pts.length-1), rb = r0 + (r1 - r0) * (i+1)/(pts.length-1);
    const g = new THREE.CylinderGeometry(rb, ra, L * 1.06, 12, 1, true);
    const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.clone().normalize());
    parts.push([g, new THREE.Matrix4().compose(a.clone().add(b).multiplyScalar(.5), q, new THREE.Vector3(1, 1, 1))]);
    parts.push([new THREE.SphereGeometry(rb, 12, 8), new THREE.Matrix4().makeTranslation(b.x, b.y, b.z)]);
  }
  return parts;
}
export function rrect(g, x, y, w, h, r){ g.beginPath(); g.moveTo(x+r,y); g.arcTo(x+w,y,x+w,y+h,r); g.arcTo(x+w,y+h,x,y+h,r); g.arcTo(x,y+h,x,y,r); g.arcTo(x,y,x+w,y,r); g.closePath(); }

export const C = {
  wood:0x6b4430, woodDk:0x4a2e22, woodLt:0x8a5a3a, cream:0xe9d9b8,
  gold:0xd9a441, plum:0x6d3b5e, rust:0xb5552f, forest:0x3e6b45, moss:0x55804a, navy:0x34406b, stone:0x7d7486, ink:0x1a1320
};

// ---------- static batching: many small props merged into a few meshes per area ----------
// keyed by colour + outline + shadow + spatial chunk, so distant chunks still frustum-cull
const BATCH = new Map();
export function bAdd(color, geo, m, opt = {}){
  const e = m.elements, ck = Math.floor(e[12]/16) + ',' + Math.floor(e[14]/16);
  const key = color + '|' + (opt.ink || 0) + '|' + (opt.shadow ? 1 : 0) + '|' + (opt.glow || 0) + '|' + ck;
  let b = BATCH.get(key); if (!b) BATCH.set(key, b = {color, opt, parts:[]});
  b.parts.push([geo, m]);
}
export function bFlush(parent){
  for (const b of BATCH.values()) {
    const geo = mergeGeos(b.parts);
    const mat = b.opt.glow ? b.opt.mat : T(b.color);
    const m = new THREE.Mesh(geo, mat); m.castShadow = !!b.opt.shadow; m.receiveShadow = !b.opt.glow; parent.add(m);
    if (b.opt.ink) inkShell(geo, b.opt.ink, parent);
  }
  BATCH.clear();
}

export const glowTex = tex(64,64,(g,w,h)=>{ const gr = g.createRadialGradient(32,32,0,32,32,32); gr.addColorStop(0,'rgba(255,240,180,1)'); gr.addColorStop(.3,'rgba(255,210,110,.6)'); gr.addColorStop(1,'rgba(255,200,90,0)'); g.fillStyle = gr; g.fillRect(0,0,w,h); });
glowTex.wrapS = glowTex.wrapT = THREE.ClampToEdgeWrapping;
// a storybook four-point twinkle
export const sparkTex = tex(64,64,(g,w,h)=>{ const gr = g.createRadialGradient(32,32,0,32,32,20); gr.addColorStop(0,'rgba(255,240,190,.55)'); gr.addColorStop(1,'rgba(255,220,150,0)'); g.fillStyle = gr; g.fillRect(0,0,w,h);
  g.fillStyle = '#fff6dc'; g.beginPath(); for (let i = 0; i < 8; i++) { const r = i % 2 ? 4.5 : 31, a = i*Math.PI/4 - Math.PI/2; g.lineTo(32 + Math.cos(a)*r, 32 + Math.sin(a)*r); } g.fill(); });
sparkTex.wrapS = sparkTex.wrapT = THREE.ClampToEdgeWrapping;

export const shade = (c, f) => { const r = Math.round(((c >> 16) & 255) * f), g = Math.round(((c >> 8) & 255) * f), b = Math.round((c & 255) * f); return (r << 16) | (g << 8) | b; };

export function clamp01(v){ return Math.max(0, Math.min(1, v)); }
export function ease(p){ return p < .5 ? 2*p*p : 1 - Math.pow(-2*p + 2, 2)/2; }
