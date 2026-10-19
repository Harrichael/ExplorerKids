// The garden yard (x 10..27, z -10..9): hedges, lamps, the treehouse and the parked Wonder Bus.

import * as THREE from 'three';
import { C, LEAF, T, XF, add, bAdd, barkGeo, box, col, cyl, fr, frand, glowM, glowTex, grp, leafCloud, mergeGeos, meshOf, occluder, outline, outlineMat, rand, rr, rrect, sph, tex } from '../core/kit.js';
import { buildBus } from '../props/wonder-bus.js';
import { daylight } from './daylight.js';
import { hqAnims, scene } from './scene.js';

box(.12,.12,.4,T(C.ink),10.6,2.7,1.75); const porch = box(.25,.35,.25,glowM(0xffcf73,1.2),10.6,2.5,2.0,null,false);
const porchLight = new THREE.PointLight(0xffb85c, 1.0, 8, 2); porchLight.position.set(11.2, 2.4, 2.0); scene.add(porchLight);
const signT = tex(512,160,(g,w,h)=>{ g.fillStyle='#4a2e22'; rrect(g,6,6,w-12,h-12,30); g.fill(); g.strokeStyle='#d9a441'; g.lineWidth=6; rrect(g,18,18,w-36,h-36,22); g.stroke(); g.fillStyle='#efe0bf'; g.font='60px "Caprasimo", Georgia, serif'; g.textAlign='center'; g.textBaseline='middle'; g.fillText('Lantern Hill', w/2, h/2+4); });
document.fonts && document.fonts.ready.then(() => { const c = signT.image, g = c.getContext('2d'); g.clearRect(0,0,c.width,c.height); g.fillStyle='#4a2e22'; rrect(g,6,6,c.width-12,c.height-12,30); g.fill(); g.strokeStyle='#d9a441'; g.lineWidth=6; rrect(g,18,18,c.width-36,c.height-36,22); g.stroke(); g.fillStyle='#efe0bf'; g.font='60px "Caprasimo", Georgia, serif'; g.textAlign='center'; g.textBaseline='middle'; g.fillText('Lantern Hill', c.width/2, c.height/2+4); signT.needsUpdate = true; });
const signM = add(new THREE.PlaneGeometry(2.2,.7), T(0xffffff,{map:signT, transparent:true}), 10.47, 3.25, -2.9, null, false); signM.rotation.y = Math.PI/2;
for (let i=0;i<11;i++){ const s = add(new THREE.CylinderGeometry(rr(.32,.45),rr(.35,.48),.07,8), T([0x8a8090,0x7d7486,0x94899a][i%3]), 10.9 + i*.42 + rr(-.1,.1), .04, rr(-.9,.4) + (i>6 ? -.6 : 0), null, false); s.rotation.y = rand()*3; }
function hedge(x1, z1, x2, z2){
  // a lumpy, living hedge: a dark core under rolling puffs, the odd blossom bush, and flowers on both faces
  const len = Math.hypot(x2-x1, z2-z1), ux = (x2-x1)/len, uz = (z2-z1)/len, nx = -uz, nz = ux, ang = Math.atan2(z2-z1, x2-x1);
  const core = box(len, .7, .62, T(0x2a4a31), (x1+x2)/2, .4, (z1+z2)/2); core.rotation.y = -ang;
  const ph = fr(0, 6), blooms = [0xb46e8e, 0xc98aa6, 0xe3cfae];
  for (let d = .25; d < len; d += .5) {
    const r = fr(.44, .6), y = .52 + .2*Math.sin(d*1.05 + ph) + fr(-.06, .06), o = fr(-.14, .14), x = x1 + ux*d + nx*o, z = z1 + uz*d + nz*o;
    const tone = y > .64 ? 2 : y < .42 ? 0 : 1, bloom = frand() < .08;
    bAdd(bloom ? blooms[Math.floor(frand()*3)] : [LEAF.dk, LEAF.md, LEAF.lt][tone], new THREE.SphereGeometry(r, 12, 9), XF(x, y, z, 1, .85, 1, 0, fr(0, 6), 0), {ink:.04, shadow:true});
    if (frand() < .3) bAdd([LEAF.md, LEAF.lt][Math.floor(frand()*2)], new THREE.SphereGeometry(r*.45, 9, 7), XF(x + fr(-.2, .2), y + r*.62, z + fr(-.15, .15)), {ink:.04, shadow:true});
  }
  for (let i = 0; i < len*1.3; i++) { const d = fr(.2, len - .2), sd = frand() < .5 ? -1 : 1;
    bAdd([0xd36a8f, 0xe9d9b8, 0xd9a441, 0x8f7ad6][i%4], new THREE.SphereGeometry(.065, 6, 4), XF(x1 + ux*d + nx*sd*.6, fr(.45, 1.05), z1 + uz*d + nz*sd*.6)); }
  col(Math.min(x1,x2)-.5, Math.max(x1,x2)+.5, Math.min(z1,z2)-.5, Math.max(z1,z2)+.5);
}
hedge(10.8, -10.2, 27.2, -10.2); hedge(27.2, -10.2, 27.2, 9.2); hedge(10.8, 9.2, 27.2, 9.2);
hedge(10.8, 7.6, 10.8, 9.2); hedge(10.8, -10.2, 10.8, -7.6);
// a pine bough: cone whose skirt is scalloped and droops between the points
export function boughGeo(r, h, seg = 28, hs = 4){
  const g = new THREE.ConeGeometry(r, h, seg, hs, true), p = g.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), y = p.getY(i), z = p.getZ(i), t = (h/2 - y)/h, ang = Math.atan2(z, x), w = Math.sin(ang*7);
    const k = 1 + .14*w*t*t + .08*t;
    p.setXYZ(i, x*k, y - h*.1*t*t*(1 - w)*.5 - h*.06*t*t, z*k);
  }
  g.computeVertexNormals(); return g;
}
function pine(x, z, s){
  const g = grp(x,0,z), lean = fr(-.06, .06), tiers = 4, parts = [[], []];
  const trunk = mergeGeos([[new THREE.CylinderGeometry(.12*s, .24*s, 1.3*s, 10), XF(0, .65*s, 0)], [new THREE.ConeGeometry(.34*s, .3*s, 10), XF(0, .12*s, 0)]]);
  meshOf(trunk, C.woodDk, g, .03);
  for (let i = 0; i < tiers; i++) {
    const t = i/(tiers-1), r = (1.25 - t*.75)*s, h = (1.25 - t*.25)*s, y = (1.15 + i*.72)*s;
    // each tier is a cone with a soft rounded skirt so it reads as a fluffy bough, not a party hat
    parts[i%2].push([boughGeo(r, h), XF(lean*i*s, y + h*.35, 0, 1, 1, 1, 0, fr(0, 6), lean)]);
  }
  parts[0].push([new THREE.SphereGeometry(.14*s, 10, 8), XF(lean*tiers*s, (1.15 + tiers*.72)*s + .3*s, 0)]);
  meshOf(mergeGeos(parts[0]), 0x2a4a33, g, .04); meshOf(mergeGeos(parts[1]), 0x35593c, g, .04);
  return g;
}
function roundTree(x, z, s){
  const g = grp(x,0,z), bx = fr(-.25, .25)*s, bz = fr(-.2, .2)*s, top = 2.15*s;
  // curving trunk with a flared root base and two branches reaching into the leaves
  const tp = [[0, 0, 0], [bx*.3, .7*s, bz*.2], [bx*.8, 1.4*s, bz*.6], [bx, top, bz]];
  const bp = barkGeo(tp, .27*s, .15*s);
  bp.push([new THREE.ConeGeometry(.5*s, .45*s, 12, 1, true), XF(0, .2*s, 0)]);
  for (let i = 0; i < 4; i++) { const a = i*1.57 + fr(-.3, .3); bp.push([new THREE.SphereGeometry(.13*s, 8, 6), XF(Math.cos(a)*.32*s, .06*s, Math.sin(a)*.32*s, 1.6, .55, 1, 0, -a, 0)]); }
  for (const sd of [-1, 1]) bp.push(...barkGeo([[bx*.8, 1.5*s, bz*.6], [bx*.8 + sd*.55*s, 2.05*s, bz*.6 + fr(-.3, .3)*s]], .1*s, .06*s));
  meshOf(mergeGeos(bp), C.woodDk, g, .03);
  const cx = bx, cy = top + .55*s, cz = bz, puffs = [[cx, cy, cz, .95*s, 1]];
  const n = 6, ph = fr(0, 6);
  for (let i = 0; i < n; i++) { const a = ph + i/n*Math.PI*2; puffs.push([cx + Math.cos(a)*.85*s, cy - .25*s + fr(-.1, .12)*s, cz + Math.sin(a)*.8*s, fr(.55, .68)*s, Math.sin(a) < -.2 ? 0 : 1]); }
  for (let i = 0; i < 3; i++) { const a = ph + i*2.1 + .5; puffs.push([cx + Math.cos(a)*.45*s, cy + .55*s, cz + Math.sin(a)*.4*s, fr(.45, .55)*s, 2]); }
  puffs.push([cx + .1*s, cy + .9*s, cz + .05*s, .4*s, 2]);
  leafCloud(g, puffs, .045*s);
  return g;
}

col(20.4, 25.2, 3.3, 7.1);
function pumpkin(x, z, s){ const g = grp(x,0,z,rand()*3); for (let i=0;i<6;i++){ const a = i/6*Math.PI*2; const p = sph(.28*s, T(C.rust), Math.cos(a)*.1*s, .22*s, Math.sin(a)*.1*s, g, 10); p.scale.set(.75,.85,1); p.rotation.y = a; } cyl(.035*s,.05*s,.16*s,T(C.forest),0,.46*s,0,g,6); col(x-.3*s, x+.3*s, z-.3*s, z+.3*s, -5, .6); }
pumpkin(12.6,-6.3,1.2); pumpkin(13.6,-7.0,.9); pumpkin(12.2,-7.6,.8); pumpkin(14.5,-6.0,1.0);
for (let i=0;i<8;i++){ const v = add(new THREE.TorusGeometry(.35,.025,4,10,Math.PI), T(C.forest), 13.2 + rr(-1.5,1.5), .04, -6.8 + rr(-.9,.9), null, false); v.rotation.x = -Math.PI/2; v.rotation.z = rand()*6; }
const stump = grp(25.6, 0, -8.4); cyl(.5,.6,.5,T(C.woodDk),0,.25,0,stump,10); cyl(.46,.46,.02,T(0xb08a5a),0,.51,0,stump,10);
for (const [mx,mz,ms] of [[.4,.3,1],[.6,0,.7],[-.5,.4,.8]]) { cyl(.04*ms,.05*ms,.16*ms,T(C.cream),mx,.08*ms,mz,stump,6); add(new THREE.SphereGeometry(.12*ms,10,6,0,Math.PI*2,0,Math.PI/2), T(0xb5402f), mx,.16*ms,mz, stump); }
col(25, 26.2, -9, -7.8);
for (let i=0;i<60;i++){
  const fx = rr(11.5, 26.4), fz = rr(-9.4, 8.4);
  if (fx < 18.5 && fz > -2.4 && fz < 1.3) continue;
  if (fx > 14.1 && fx < 18.1 && fz < -7.1) continue;
  if (fx > 17.5 && fx < 25.5 && fz > -6.5 && fz < .5) continue;
  if (fx > 13 && fx < 18.2 && fz > 3.8 && fz < 7.2) continue;
  if (fx > 20.2 && fx < 25.4 && fz > 3.1 && fz < 7.3) continue;
  cyl(.015,.015,.3,T(C.moss),fx,.15,fz,null,4,false);
  sph(.08, T([0xd36a8f,0xe9d9b8,0xd9a441,0x8f7ad6][i%4]), fx,.32,fz, null, 6, false);
}
const postLamps = [], lampLights = [porchLight];
function lampPost(x, z, light){
  const g = grp(x, 0, z);
  cyl(.06,.08,2.1,T(C.ink),0,1.05,0,g,8); box(.4,.04,.04,T(C.ink),.18,2.05,0,g);
  const l = box(.24,.32,.24,glowM(0xffcf73,1.2),.34,1.82,0,g,false); add(new THREE.ConeGeometry(.22,.15,4),T(C.ink),.34,2.05,0,g).rotation.y = Math.PI/4;
  postLamps.push(l);
  if (light) { const pl = new THREE.PointLight(0xffb85c, .9, 8, 2); pl.position.set(x+.34, 1.8, z); scene.add(pl); lampLights.push(pl); }
  col(x-.15, x+.15, z-.15, z+.15);
}
lampPost(12.6, 1.8, true); lampPost(18.6, 2.4, false); lampPost(26.0, -.5, false);
const mailbox = grp(11.8, 0, -2.9, Math.PI/2);
cyl(.05,.05,1,T(C.woodDk),0,.5,0,mailbox,6); box(.32,.3,.5,T(C.navy),0,1.12,0,mailbox); add(new THREE.CylinderGeometry(.16,.16,.5,12,1,false,0,Math.PI),T(C.navy),0,1.27,0,mailbox).rotation.x = Math.PI/2;
box(.03,.22,.08,T(C.rust),.18,1.25,-.1,mailbox);
col(11.6, 12.0, -3.2, -2.6);

// ---------- Treehouse ----------
export const TX = 22, TZ = -3.6, PLAT = 3;
const bark = T(0x6b4a35), barkDk = T(0x523626);
cyl(.8, 1.15, 9, bark, TX, 4.5, TZ, null, 20);
for (let i=0;i<5;i++){ const a = i*1.26+.3; const rt = cyl(.12,.38,1.4,barkDk,TX+Math.cos(a)*1.0,.35,TZ+Math.sin(a)*1.0,null,6); rt.rotation.z = Math.cos(a)*.9; rt.rotation.x = -Math.sin(a)*.9; }
col(TX-.95, TX+.95, TZ-.95, TZ+.95);
const deckTex = tex(256,256,(g,w,h)=>{ for (let i=0;i<8;i++){ g.fillStyle = i%2 ? '#8a5a3a' : '#7a4e32'; g.fillRect(i*32,0,32,h); g.fillStyle='rgba(30,15,8,.5)'; g.fillRect(i*32,0,3,h); } }, 2, 1.7);
box(7, .22, 6, T(0xffffff,{map:deckTex}), 21.5, PLAT - .11, -3);
for (const [px,pz] of [[18.2,-5.8],[24.8,-5.8],[18.2,-.2],[24.8,-.2]]) { box(.3, PLAT, .3, barkDk, px, PLAT/2, pz); const br = box(.14, 1.5, .14, barkDk, px + (px < 21 ? .5 : -.5), PLAT - .7, pz); br.rotation.z = px < 21 ? -.7 : .7; }
function rail(x1, z1, x2, z2){
  const len = Math.hypot(x2-x1, z2-z1), n = Math.max(1, Math.round(len/.6)), ang = Math.atan2(z2-z1, x2-x1);
  for (let i=0;i<=n;i++){ const t = i/n; box(.08,.85,.08,T(C.woodLt), x1+(x2-x1)*t, PLAT+.42, z1+(z2-z1)*t); }
  const r = box(len,.1,.12,T(C.woodDk),(x1+x2)/2,PLAT+.88,(z1+z2)/2); r.rotation.y = -ang;
  col(Math.min(x1,x2)-.15, Math.max(x1,x2)+.15, Math.min(z1,z2)-.15, Math.max(z1,z2)+.15, PLAT-.3, PLAT+1.2);
}
const RAMP0 = 13, RAMP1 = 18, RZ0 = -2.0, RZ1 = 0;
rail(18, -6, 25, -6); rail(25, -6, 25, 0); rail(18.0, 0, 25, 0); rail(18, -6, 18, RZ0 - .05);
const rampLen = Math.hypot(RAMP1 - RAMP0, PLAT);
const ramp = grp((RAMP0+RAMP1)/2, PLAT/2, (RZ0+RZ1)/2); ramp.rotation.z = Math.atan2(PLAT, RAMP1-RAMP0);
for (let i=0;i<12;i++) box(rampLen/12 - .03, .12, RZ1 - RZ0 + .1, T(i%2?C.woodLt:C.wood), -rampLen/2 + (i+.5)*rampLen/12, 0, 0, ramp);
for (const zz of [-(RZ1-RZ0)/2 - .05, (RZ1-RZ0)/2 + .05]) { box(rampLen,.08,.1,T(C.woodDk),0,.85,zz,ramp); for (let i=0;i<=6;i++) box(.07,.85,.07,T(C.woodLt),-rampLen/2 + i*rampLen/6,.42,zz,ramp); }
for (const zz of [RZ0 - .1, RZ1 + .1]) for (let i=0;i<14;i++){ const x = RAMP0 + i*(RAMP1-RAMP0)/14; const y0 = (x - RAMP0)/(RAMP1-RAMP0)*PLAT; col(x-.05, x+(RAMP1-RAMP0)/14+.05, zz-.1, zz+.1, y0-.3, y0+1.2); }
box(.22, PLAT*.55, .22, barkDk, 15.8, PLAT*.27, RZ0+.05); box(.22, PLAT*.55, .22, barkDk, 15.8, PLAT*.27, RZ1-.05);
const hut = grp(24, PLAT, -4.25);
const hutTex = tex(256,256,(g,w,h)=>{ g.fillStyle='#6d3b5e'; g.fillRect(0,0,w,h); g.fillStyle='rgba(20,8,20,.3)'; for (let x=0;x<w;x+=32) g.fillRect(x,0,4,h); });
box(1.9, 2.0, 3.1, T(0xffffff,{map:hutTex}), 0, 1.0, 0, hut);
box(.06, 1.4, .8, T(C.woodDk), -.96, .7, .4, hut, false);
sph(.04, T(C.gold), -1.0, .7, .1, hut, 6, false);
add(new THREE.CircleGeometry(.28, 16), glowM(0xffcf73, .9), -.97, 1.35, -.8, hut, false).rotation.y = -Math.PI/2;
add(new THREE.TorusGeometry(.28, .05, 6, 16), T(C.woodLt), -.97, 1.35, -.8, hut).rotation.y = Math.PI/2;
const roof = add(new THREE.ConeGeometry(2.2, 1.5, 4), T(0x2f5552), 0, 2.75, 0, hut); roof.rotation.y = Math.PI/4; roof.scale.set(.75, 1, 1.15);
cyl(.03,.03,1.3,T(C.cream),0,3.9,0,hut,5); const flag = box(.55,.32,.02,T(C.gold),.28,4.4,0,hut,false);
occluder(hut);
col(23.0, 25, -5.85, -2.65, PLAT-.3, PLAT+3);
const tele2 = grp(24.4, PLAT, -.6, -.6);
for (let i=0;i<3;i++){ const a = i*2.1; const l = cyl(.03,.03,1.1,T(C.woodDk),Math.cos(a)*.22,.52,Math.sin(a)*.22,tele2,5); l.rotation.z = Math.cos(a)*.22; l.rotation.x = -Math.sin(a)*.22; }
const tt2 = cyl(.08,.12,1,T(C.navy),0,1.15,0,tele2,10); tt2.rotation.z = 1.0; outline(tt2,1.08);
col(24.1, 24.75, -.85, -.3, PLAT-.3, PLAT+1.6);
const deckLamps = [];
for (const [lx,lz] of [[18,-6],[25,-6],[25,0],[18,0]]) { const l = sph(.16, glowM(0xffcf73,1.1), lx, PLAT+1.08, lz, null, 8, false); deckLamps.push(l); box(.04,.15,.04,T(C.ink),lx,PLAT+.95,lz); }
const deckLight = new THREE.PointLight(0xffb85c, .9, 7, 2); deckLight.position.set(20, PLAT+1.6, -2); scene.add(deckLight); lampLights.push(deckLight);
lampLights.forEach(l => l.userData.full = l.intensity);
const bunting = [];
for (let i=0;i<9;i++){ const t = i/8; const x = 18.2 + t*6.6, y = PLAT+1.0 - Math.sin(t*Math.PI)*.25; const tri = add(new THREE.ConeGeometry(.1,.2,3), T([C.rust,C.gold,C.plum,0x2f8f8a][i%4]), x, y - .1, 0, null, false); tri.rotation.x = Math.PI; bunting.push(tri); }
const canopy = grp(TX, 0, TZ);
for (const [cx,cy,cz,r,c] of [[0,8.6,0,3.0,0x2f5a3a],[2.3,7.9,1.2,2.2,0x3a6b45],[-2.4,8.1,-.8,2.3,0x3a6b45],[.8,10.1,-1.2,2.1,0x2f5a3a],[-1.2,7.7,2.2,2.0,0x447a4c],[1.6,7.6,-2.2,2.0,0x447a4c]]) {
  rand(); rand();
  leafCloud(canopy, [[cx, cy, cz, r*.92, c === 0x2f5a3a ? 1 : c === 0x447a4c ? 2 : 1], [cx, cy - r*.35, cz, r*.7, 0]], .07, outlineMat.clone());
}
for (const a of [.6, 2.4, 4.2]) { const b = cyl(.15,.3,2.6,bark,Math.cos(a)*1.2,7,Math.sin(a)*1.2,canopy,6); b.rotation.z = -Math.cos(a)*.6; b.rotation.x = Math.sin(a)*.6; }
occluder(canopy);

// ---------- Hover van ----------
export const van = grp(15.6, 0, 5.5, -.3);
export const vanBody = grp(0, 0, 0, 0, van);
const hoverPads = buildBus(vanBody);
occluder(van);
col(13.0, 18.2, 3.9, 7.1);

// ---------- fireflies + embers ----------
// the embers rise from the hearth, but are built here so the seeded layout keeps its order

const FF = 46, ffPos = new Float32Array(FF*3), ffData = [];
for (let i=0;i<FF;i++) ffData.push({x:rr(11.5,26.5), y:rr(.4,3.2), z:rr(-9.5,8.5), p:rand()*6, s:rr(.4,1)});
const ffGeo = new THREE.BufferGeometry(); ffGeo.setAttribute('position', new THREE.BufferAttribute(ffPos, 3));
const fireflies = new THREE.Points(ffGeo, new THREE.PointsMaterial({size:.35, map:glowTex, transparent:true, depthWrite:false, blending:THREE.AdditiveBlending, color:0xfff0a0}));
fireflies.frustumCulled = false; scene.add(fireflies);
const EM = 18, emPos = new Float32Array(EM*3), emData = [];
for (let i=0;i<EM;i++) emData.push({t:rand(), x:rr(-.5,.5), s:rr(.6,1.2)});
const emGeo = new THREE.BufferGeometry(); emGeo.setAttribute('position', new THREE.BufferAttribute(emPos, 3));
const embers = new THREE.Points(emGeo, new THREE.PointsMaterial({size:.16, map:glowTex, transparent:true, depthWrite:false, blending:THREE.AdditiveBlending, color:0xffa050}));
embers.frustumCulled = false; scene.add(embers);

export function groundAt(x, z){
  let g = 0;
  if (x >= 18 && x <= 25 && z >= -6 && z <= 0) g = PLAT;
  if (x >= RAMP0 && x < RAMP1 && z >= RZ0 && z <= RZ1) g = Math.max(g, (x - RAMP0)/(RAMP1 - RAMP0)*PLAT);
  return g;
}

// a field trip takes the van over while it flies off and lands; otherwise it bobs in place
let vanDriver = null;
export function driveVan(fn){ vanDriver = fn; }
const glowList = [...deckLamps, ...postLamps, porch];
hqAnims.push((dt, t) => {
  if (vanDriver) vanDriver(); else { vanBody.position.y = Math.sin(t * 1.7) * .1; vanBody.rotation.z = Math.sin(t * 1.3) * .015; }
  hoverPads.forEach((p, i) => p.material.emissiveIntensity = .9 + Math.sin(t * 6 + i) * .3);
  flag.rotation.y = Math.sin(t * 3) * .3;
  bunting.forEach((b, i) => b.rotation.z = Math.sin(t * 2.4 + i) * .15);
  // the lamps are lit from dusk; by day they're just glass
  const lit = 1 - daylight.day;
  glowList.forEach((l, i) => l.material.emissiveIntensity = (1 + Math.sin(t * 2 + i * 1.7) * .15)*(.15 + .85*lit));
  lampLights.forEach(l => l.intensity = l.userData.full*lit);
  for (let i=0;i<FF;i++){ const f = ffData[i];
    ffPos[i*3] = f.x + Math.sin(t * .4 * f.s + f.p) * 1.2; ffPos[i*3+1] = f.y + Math.sin(t * .9 * f.s + f.p * 2) * .4; ffPos[i*3+2] = f.z + Math.cos(t * .35 * f.s + f.p) * 1.2; }
  ffGeo.attributes.position.needsUpdate = true;
  fireflies.material.opacity = (.65 + Math.sin(t * 3) * .2)*(1 - daylight.day);
  for (let i=0;i<EM;i++){ const e = emData[i]; e.t += dt * .35 * e.s; if (e.t > 1) { e.t = 0; e.x = rr(-.5,.5); }
    emPos[i*3] = e.x + Math.sin(e.t * 8 + i) * .12; emPos[i*3+1] = .6 + e.t * 2.0; emPos[i*3+2] = -6.0 + e.t * .3; }
  emGeo.attributes.position.needsUpdate = true;
});
