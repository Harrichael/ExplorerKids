import * as THREE from 'three';
import { T, add, rand, tex } from '../core/kit.js';

export const grassTex = tex(256,256,(g,w,h)=>{ g.fillStyle='#3f6343'; g.fillRect(0,0,w,h);
  for (let i=0;i<1100;i++){ g.fillStyle = ['#3a5c3e','#46704a','#4e7a4e'][i%3]; g.fillRect(rand()*w, rand()*h, 2, 6); } }, 30, 30);

// ---------- terrain: flat where you can walk, rolling hills beyond ----------
export const PLAY = {x0:-11.2, x1:28.0, z0:-11.4, z1:10.4};
export const LH = {x:5, z:-37}, WM = {x:40, z:-27}, VIL = {x:-27, z:-28}, MEAD = {x:39, z:-6};
export const streamZ = x => -16.8 + 1.8*Math.sin(x*.11 + .5) + .8*Math.sin(x*.27);
const sstep = (a, b, v) => { const t = Math.max(0, Math.min(1, (v - a)/(b - a))); return t*t*(3 - 2*t); };
const tnoise = (x, z) => Math.sin(x*.13 + 1.3)*Math.cos(z*.11 - .7) + .5*Math.sin(x*.27 - z*.19 + 2.1) + .25*Math.sin(x*.53 + z*.41);
export function hAt(x, z){
  const dx = Math.max(PLAY.x0 - x, 0, x - PLAY.x1), dz = Math.max(PLAY.z0 - z, 0, z - PLAY.z1), d = Math.hypot(dx, dz);
  if (d <= 0) return 0;
  const s = sstep(0, 9, d);
  let h = s * (1.4 + d*.1 + tnoise(x, z)*1.2);
  const lh = Math.hypot(x - LH.x, z - LH.z); h += Math.pow(Math.max(0, 1 - lh/16), 1.5) * 10 * s;
  const wm = Math.hypot(x - WM.x, z - WM.z); h += Math.pow(Math.max(0, 1 - wm/9), 2) * 3.5 * s;
  const vl = Math.hypot(x - VIL.x, z - VIL.z); if (vl < 10) h = h * sstep(4, 10, vl) + (s * 1.6) * (1 - sstep(4, 10, vl));
  // the stream cuts a soft channel across the north
  const c = sstep(1.3, 3.8, Math.abs(z - streamZ(x)));
  h = h * c - .4 * (1 - c);
  return h;
}
const groundGeo = new THREE.PlaneGeometry(150, 150, 170, 170); groundGeo.rotateX(-Math.PI/2); groundGeo.translate(8, 0, -8);
{ const gp = groundGeo.attributes.position, cols = new Float32Array(gp.count*3), cA = new THREE.Color(0x9fc49a), cB = new THREE.Color(0xd8e2b0), cC = new THREE.Color(0x7fa08a), tc = new THREE.Color();
  for (let i = 0; i < gp.count; i++) { const x = gp.getX(i), z = gp.getZ(i), h = hAt(x, z); gp.setY(i, h);
    const v = .5 + .5*Math.sin(x*.21 + z*.17) * Math.cos(z*.09 - x*.05);
    tc.copy(cA).lerp(cB, Math.min(1, Math.max(0, h*.08 + v*.35))).lerp(cC, Math.max(0, -h*1.5)); cols.set([tc.r*1.05, tc.g*1.05, tc.b*1.05], i*3); }
  groundGeo.setAttribute('color', new THREE.BufferAttribute(cols, 3)); groundGeo.computeVertexNormals(); }
const ground = add(groundGeo, T(0xffffff, {map:grassTex, vertexColors:true}), 0, 0, 0, null, false);
