// The cottage: interior x -10..10, z -7..7, door on the east wall.

import * as THREE from 'three';
import { C, T, add, box, col, cyl, glowM, grad, grp, occluder, outline, rand, rr, rrect, sph, tex } from '../core/kit.js';
import { Sound } from '../core/sound.js';
import { player } from '../player.js';
import { dressing } from '../ui/wardrobe.js';
import { hqAnims, scene } from './scene.js';

const plankTex = tex(512,512,(g,w,h)=>{
  const tones = ['#6e4630','#644029','#78503a','#5e3c27']; const ph = h/8;
  for (let r=0;r<8;r++){ let x = (r%2) * -100;
    while (x < w){ const pw = 160 + rand()*120; g.fillStyle = tones[Math.floor(rand()*4)]; g.fillRect(x, r*ph, pw, ph);
      g.fillStyle = 'rgba(30,15,8,.5)'; g.fillRect(x, r*ph, 3, ph);
      g.fillStyle = 'rgba(30,15,8,.35)'; g.beginPath(); g.arc(x+20, r*ph+ph/2, 2.5, 0, 7); g.arc(x+pw-20, r*ph+ph/2, 2.5, 0, 7); g.fill(); x += pw; }
    g.fillStyle = 'rgba(30,15,8,.55)'; g.fillRect(0, r*ph, w, 3); }
}, 5, 3.5);
box(20, .04, 14, T(0xffffff,{map:plankTex}), 0,.02,0, null, false);

const plasterTex = tex(256,256,(g,w,h)=>{ g.fillStyle='#3c6560'; g.fillRect(0,0,w,h);
  for (let i=0;i<300;i++){ g.fillStyle = rand()<.5 ? 'rgba(255,255,255,.035)' : 'rgba(0,0,0,.05)'; g.beginPath(); g.arc(rand()*w, rand()*h, rr(2,9), 0, 7); g.fill(); } }, 3, 1);
const wallMat = T(0xffffff, {map:plasterTex}), wainMat = T(C.woodDk), trimMat = T(C.wood);
const WH = 3.6;
function wall(x, z, len, alongX, h=WH){
  const w = alongX ? len : .4, d = alongX ? .4 : len;
  box(w, h, d, wallMat, x, h/2, z);
  box(alongX ? len : .46, 1.1, alongX ? .46 : len, wainMat, x, .55, z);
  box(alongX ? len + .1 : .56, .12, alongX ? .56 : len + .1, trimMat, x, 1.12, z);
  box(alongX ? len + .1 : .5, .16, alongX ? .5 : len + .1, trimMat, x, h, z);
  col(x - w/2, x + w/2, z - d/2, z + d/2);
}
wall(0, -7.2, 20.8, true);
wall(-10.2, 0, 14.8, false);
wall(10.2, -4.2, 6.4, false); wall(10.2, 4.2, 6.4, false);
box(.4, 1.0, 2.4, wallMat, 10.2, 3.1, 0); box(.5,.16,2.6,trimMat,10.2,WH,0);
box(20.8, .9, .4, wainMat, 0, .45, 7.2); box(21, .14, .56, trimMat, 0, .92, 7.2); col(-10.4, 10.4, 7, 7.4);
for (const zz of [-1.25, 1.25]) box(.6, 2.7, .22, T(C.woodLt), 10.2, 1.35, zz);
box(.6, .25, 2.75, T(C.woodLt), 10.2, 2.72, 0);
const sidingTex = tex(256,256,(g,w,h)=>{ g.fillStyle='#8c6b55'; g.fillRect(0,0,w,h); g.fillStyle='rgba(40,20,10,.35)'; for (let y=0;y<h;y+=32) g.fillRect(0,y,w,4); }, 2, 2);
for (const zz of [-4.2, 4.2]) box(.05, WH, 6.4, T(0xffffff,{map:sidingTex}), 10.43, WH/2, zz, null, false);
box(.05, 1, 2.4, T(0xffffff,{map:sidingTex}), 10.43, 3.1, 0, null, false);
for (const zz of [-7.3, -1.45, 1.45, 7.3]) box(.25, WH + .1, .25, T(C.woodDk), 10.5, WH/2, zz);

function windowOn(x, y, z, ry, w=1.3, h=1.4){
  const g = grp(x, y, z, ry);
  box(w, h, .06, glowM(0x5a77b8, .55), 0, 0, 0, g, false);
  box(w + .2, .12, .3, T(C.woodLt), 0, -h/2 - .02, .05, g);
  box(w + .2, .1, .2, T(C.woodLt), 0, h/2, 0, g);
  box(.1, h, .2, T(C.woodLt), -w/2, 0, 0, g); box(.1, h, .2, T(C.woodLt), w/2, 0, 0, g);
  box(.06, h, .12, T(C.woodLt), 0, 0, .02, g); box(w, .06, .12, T(C.woodLt), 0, 0, .02, g);
  return g;
}

// ---------- Bookshelves ----------
const bookCols = [0x8c3b3b,0x2f5552,0x3e6b45,0xd9a441,0x6d3b5e,0xb5552f,0x4a5a8a,0xc9b48a,0x5b3d64];
function bookshelf(x, z, ry, w=3.4, rows=4, jars=false){
  const g = grp(x, 0, z, ry);
  const wd = T(C.woodDk), wl = T(C.wood);
  const H = rows * .78 + .3;
  box(w, H, .12, wd, 0, H/2, -.36, g);
  box(.14, H, .82, wl, -w/2, H/2, 0, g); box(.14, H, .82, wl, w/2, H/2, 0, g);
  box(w + .2, .14, .9, wl, 0, H + .05, 0, g);
  for (let r=0;r<=rows;r++) box(w, .08, .8, wl, 0, .12 + r*.78, 0, g);
  for (let r=0;r<rows;r++){
    let bx = -w/2 + .12;
    while (bx < w/2 - .2){
      if (jars) {
        const c = [0x6fd6c4, 0xe7b84c, 0xd36a8f, 0x9ccf6b][Math.floor(rand()*4)];
        const jh = rr(.25,.45);
        add(new THREE.CylinderGeometry(.11,.11,jh,10), T(0xcfe6ee,{transparent:true, opacity:.35}), bx+.12, .16+r*.78+jh/2, .05, g, false);
        cyl(.09,.09,jh*.65, glowM(c,.55), bx+.12, .16+r*.78+jh*.33, .05, g, 10, false);
        cyl(.12,.12,.05, T(C.rust), bx+.12, .16+r*.78+jh+.02, .05, g, 10, false);
        bx += .32 + rand()*.08; continue;
      }
      const bw = rr(.1,.2), bh = rr(.42,.66);
      if (rand() < .07) { bx += bw + .1; continue; }
      const b = box(bw, bh, rr(.45,.58), T(bookCols[Math.floor(rand()*bookCols.length)]), bx + bw/2, .16 + r*.78 + bh/2, .02, g, false);
      if (rand() < .4) box(bw + .005, .03, .01, T(C.gold), bx + bw/2, .16 + r*.78 + bh*.75, .31, g, false);
      if (rand() < .07) b.rotation.z = .22;
      bx += bw + .01;
    }
  }
  return g;
}

// ===== LIBRARY NOOK (x -10..-4.5) =====
bookshelf(-9.55, -4.5, Math.PI/2); bookshelf(-9.55, -1.05, Math.PI/2);
col(-10, -9.1, -6.3, .7);
bookshelf(-7.3, -6.55, 0); col(-9.1, -5.5, -7, -6.1);
box(.3, 3.2, 5.8, wallMat, -4.5, 1.6, -4.1); box(.4, .14, 6, trimMat, -4.5, 3.22, -4.1);
occluder(bookshelf(-5.0, -3, -Math.PI/2));
col(-5.45, -4.3, -7, -1.2);
const ladder = grp(-8.95, 0, .3, Math.PI/2);
for (const sx of [-.3, .3]) { const r = box(.08, 3.3, .08, T(C.woodLt), sx, 1.6, 0, ladder); r.rotation.x = -.18; }
for (let i=0;i<7;i++) box(.62, .06, .06, T(C.woodLt), 0, .35 + i*.45, -.04 - i*.08, ladder);
const desk = grp(-7.3, 0, -2.6);
box(2.4, .1, 1.05, T(C.wood), 0, .95, 0, desk); box(2.2, .85, .9, T(C.woodDk), 0, .45, 0, desk);
for (const dx of [-.6, .6]) box(.5, .08, .02, T(C.gold), dx, .65, .46, desk, false);
for (let i=0;i<5;i++) box(.45 - i*.03, .09, .34, T(bookCols[i]), -.75, 1.05 + i*.09, -.1, desk).rotation.y = i*.15;
const openBook = grp(.1, 1.02, .1, 0, desk);
for (const sx of [-1,1]) { const pg = box(.28, .03, .36, T(C.cream), sx*.15, 0, 0, openBook, false); pg.rotation.z = -sx*.1; }
cyl(.05,.06,.1,T(C.ink),.55,1.05,-.15,desk,8); const quill = box(.02,.35,.05,T(0xf2ead8),.58,1.22,-.12,desk,false); quill.rotation.z = -.4;
const bellG = grp(.85, 1.0, .2, 0, desk); cyl(.09,.11,.03,T(C.gold),0,.015,0,bellG,10); add(new THREE.SphereGeometry(.08,10,8,0,Math.PI*2,0,Math.PI/2),T(C.gold),0,.03,0,bellG);
cyl(.04,.04,.18,T(C.cream),.4,1.09,.3,desk,8); const deskFlame = sph(.035, glowM(0xffc35a,1.4), .4,1.22,.3, desk, 8, false); deskFlame.scale.y = 1.6;
col(-8.55, -6.05, -3.15, -2.05);
const catalog = grp(-5.4, 0, 5.9, Math.PI);
box(1.2, 1.25, .7, T(C.wood), 0, .62, 0, catalog);
const drawerTex = tex(256,256,(g,w,h)=>{ g.fillStyle='#6b4430'; g.fillRect(0,0,w,h); for (let r=0;r<4;r++) for (let c=0;c<3;c++){ g.fillStyle='#5a3626'; g.fillRect(c*85+6, r*64+6, 73, 52); g.fillStyle='#e9d9b8'; g.fillRect(c*85+28, r*64+16, 30, 12); g.fillStyle='#d9a441'; g.beginPath(); g.arc(c*85+43, r*64+42, 5, 0, 7); g.fill(); } });
add(new THREE.PlaneGeometry(1.15, 1.15), T(0xffffff,{map:drawerTex}), 0, .65, .36, catalog, false);
col(-6.05, -4.75, 5.5, 6.3);
windowOn(-9.97, 1.9, 3.4, Math.PI/2);
export const WINDOW_SEAT = {x:-9.45, y:.66, z:3.4};
box(1.0, .5, 2.6, T(C.woodDk), WINDOW_SEAT.x, .25, WINDOW_SEAT.z); box(1.0, .16, 2.6, T(C.plum), WINDOW_SEAT.x, .58, WINDOW_SEAT.z);
for (const zz of [2.6, 4.2]) { const p = box(.3, .45, .6, T(zz > 3 ? C.forest : C.gold), -9.7, .85, zz); p.rotation.y = .2; }
col(-10, -8.9, 2, 4.8);
const reading = tex(256,256,(g,w,h)=>{ g.fillStyle='#5b3d64'; g.beginPath(); g.arc(128,128,126,0,7); g.fill(); g.strokeStyle='#d9a441'; g.lineWidth=6; for (let r=20;r<120;r+=24){ g.beginPath(); g.arc(128,128,r,0,7); g.stroke(); } });
const rug2 = add(new THREE.CircleGeometry(1.6, 32), T(0xffffff,{map:reading, transparent:true}), -7.6,.05,3.6, null, false); rug2.rotation.x = -Math.PI/2;
for (const [cx,cz,cc] of [[-7.0,4.4,C.rust],[-8.0,2.6,C.navy]]) { const cu = sph(.42, T(cc), cx,.25,cz, null, 12); cu.scale.set(1,.5,1); }
for (let i=0;i<6;i++) box(.5 - (i%3)*.04, .1, .38, T(bookCols[(i+3)%9]), -6.6, .06 + i*.1, 2.9).rotation.y = i*.3;
const libLantern = grp(-7.6, 0, 2.2);
box(.32,.05,.32,T(C.woodDk),0,.03,0,libLantern); box(.26,.4,.26,glowM(0xffcf73,1.1),0,.26,0,libLantern,false);
for (const [sx,sz] of [[-.14,-.14],[.14,-.14],[-.14,.14],[.14,.14]]) box(.04,.42,.04,T(C.woodDk),sx,.26,sz,libLantern);
add(new THREE.ConeGeometry(.24,.18,4), T(C.woodDk), 0,.55,0, libLantern).rotation.y = Math.PI/4;
const libLight = new THREE.PointLight(0xffb85c, .9, 7, 2); libLight.position.set(-7.6, 1, 2.6); scene.add(libLight);
export const GLOBE = {x:-5.6, y:1.05, z:-.2};
const globe = grp(GLOBE.x, 0, GLOBE.z);
cyl(.25,.32,.08,T(C.woodDk),0,.04,0,globe); for (let i=0;i<3;i++) cyl(.025,.025,.7,T(C.woodDk),Math.cos(i*2.1)*.15,.38,Math.sin(i*2.1)*.15,globe,5);
const globeTex = tex(256,128,(g,w,h)=>{ g.fillStyle='#3a5f8a'; g.fillRect(0,0,w,h); g.fillStyle='#c9b48a'; for (let i=0;i<14;i++){ g.beginPath(); g.ellipse(rand()*w, rr(20,h-20), rr(10,30), rr(8,18), rand()*3, 0, 7); g.fill(); } });
// the Explorer's Globe repaints it with the real map once someone has used it
export const globeBall = add(new THREE.SphereGeometry(.4,22,16), T(0xffffff,{map:globeTex}), 0,GLOBE.y,0, globe); outline(globeBall, 1.04);
export const globeRing = add(new THREE.TorusGeometry(.46,.02,6,30), T(C.gold), 0,GLOBE.y,0, globe); globeRing.rotation.y = Math.PI/2;
col(-5.95, -5.25, -.55, .15);

// ===== HEARTH ROOM (x -4.5..4.5) =====
const stoneTex = tex(256,256,(g,w,h)=>{ g.fillStyle='#4e4656'; g.fillRect(0,0,w,h);
  for (let r=0;r<6;r++) for (let c=0;c<5;c++){ const x = c*56 + (r%2)*28 - 20 + rr(-4,4), y = r*44 + rr(-3,3);
    g.fillStyle = ['#7d7486','#8a8090','#6f6678','#94899a'][Math.floor(rand()*4)]; rrect(g, x, y, 50, 38, 10); g.fill(); } }, 1.4, 1.2);
const stoneMat = T(0xffffff, {map:stoneTex});
const fire = grp(0, 0, -6.55);
box(3.4, 2.8, .9, stoneMat, 0, 1.4, 0, fire);
box(1.8, 1.35, .3, T(0x1c1014), 0, .75, .35, fire, false);
add(new THREE.SphereGeometry(.9,16,8,0,Math.PI,0,Math.PI/2), stoneMat, 0, 1.42, .3, fire).scale.set(1,.35,.25);
box(3.9, .12, 1.5, stoneMat, 0, .06, .55, fire);
box(3.9, .18, 1.1, T(C.wood), 0, 2.15, .15, fire);
for (const [lx,lr] of [[-.25,.3],[.25,-.3],[0,0]]) { const lg = cyl(.11,.11,1.1,T(C.woodDk),lx,.22,.35,fire,8); lg.rotation.z = Math.PI/2; lg.rotation.y = lr; }
const flames = [];
for (const [fx,fs,fc] of [[0,1,0xff8a3d],[-.25,.7,0xffb347],[.27,.75,0xffb347],[0,.55,0xffe08a]]) {
  const f = add(new THREE.ConeGeometry(.2*fs,.75*fs,7), glowM(fc, 1.3), fx, .4 + .36*fs, .4, fire, false);
  flames.push({m:f, ph:rand()*6});
}
const fireLight = new THREE.PointLight(0xff8a3d, 1.6, 11, 1.6); fireLight.position.set(0, 1.0, -5.5); scene.add(fireLight);
col(-1.95, 1.95, -7, -5.75, -5, .2);
col(-1.7, 1.7, -7, -6.05);
for (const [cx,ch] of [[-1.4,.25],[-1.2,.18],[1.35,.22]]) { cyl(.05,.05,ch,T(C.cream),cx,2.24+ch/2,-6.4,null,8); const fl = sph(.035,glowM(0xffc35a,1.4),cx,2.3+ch,-6.4,null,8,false); fl.scale.y = 1.6; flames.push({m:fl, ph:rand()*6, candle:true}); }
const mantelClock = grp(.2, 2.24, -6.45);
box(.5,.6,.25,T(C.woodDk),0,.3,0,mantelClock); add(new THREE.CylinderGeometry(.17,.17,.02,18),T(C.cream),0,.36,.13,mantelClock,false).rotation.x = Math.PI/2;
const hand1 = box(.02,.13,.01,T(C.ink),0,.41,.145,mantelClock,false), hand2 = box(.02,.09,.01,T(C.ink),0,.39,.145,mantelClock,false);
hand2.rotation.z = 1.1;
cyl(.13,.11,.3,T(C.rust),-.7,2.39,-6.4,null,10);
const paint = tex(512,320,(g,w,h)=>{ const gr = g.createLinearGradient(0,0,0,h); gr.addColorStop(0,'#2c2a55'); gr.addColorStop(1,'#a8668a'); g.fillStyle = gr; g.fillRect(0,0,w,h);
  g.fillStyle='#f3e3b0'; g.beginPath(); g.arc(380,80,34,0,7); g.fill();
  for (let i=0;i<40;i++){ g.fillStyle='rgba(255,240,200,.8)'; g.fillRect(rand()*w, rand()*h*.5, 2, 2); }
  g.fillStyle='#2f5552'; g.beginPath(); g.moveTo(0,240); g.quadraticCurveTo(150,150,300,230); g.quadraticCurveTo(420,170,512,220); g.lineTo(512,320); g.lineTo(0,320); g.fill();
  g.fillStyle='#3e6b45'; g.beginPath(); g.moveTo(0,290); g.quadraticCurveTo(200,220,512,280); g.lineTo(512,320); g.lineTo(0,320); g.fill();
  g.fillStyle='#1a1320'; g.fillRect(132,242,26,22); g.beginPath(); g.moveTo(128,244); g.lineTo(145,226); g.lineTo(162,244); g.fill(); g.fillStyle='#ffcf73'; g.fillRect(140,248,7,8); });
box(1.9, 1.25, .08, T(C.gold), 0, 3.0, -6.98, null, false);
add(new THREE.PlaneGeometry(1.7, 1.06), T(0xffffff,{map:paint}), 0, 3.0, -6.93, null, false);
for (const sx of [-3.0, 3.0]) { box(.16,.3,.12,T(C.gold),sx,2.3,-6.95); cyl(.04,.04,.16,T(C.cream),sx,2.52,-6.9,null,8); const fl = sph(.035,glowM(0xffc35a,1.4),sx,2.65,-6.9,null,8,false); fl.scale.y=1.6; flames.push({m:fl, ph:rand()*6, candle:true}); }
const rugTex = tex(512,384,(g,w,h)=>{ g.fillStyle='#6d3b5e'; g.beginPath(); g.ellipse(w/2,h/2,w/2-4,h/2-4,0,0,7); g.fill();
  g.strokeStyle='#d9a441'; g.lineWidth=10; g.beginPath(); g.ellipse(w/2,h/2,w/2-28,h/2-28,0,0,7); g.stroke();
  g.strokeStyle='#b5552f'; g.lineWidth=6; g.beginPath(); g.ellipse(w/2,h/2,w/2-60,h/2-60,0,0,7); g.stroke();
  g.fillStyle='#d9a441'; for (let i=0;i<12;i++){ const a = i/12*Math.PI*2; g.beginPath(); g.arc(w/2+Math.cos(a)*(w/2-95), h/2+Math.sin(a)*(h/2-80), 8, 0, 7); g.fill(); }
  g.fillStyle='#e9d9b8'; g.beginPath(); for (let i=0;i<10;i++){ const r = i%2?18:46, a = i*Math.PI/5-Math.PI/2; g.lineTo(w/2+Math.cos(a)*r, h/2+Math.sin(a)*r);} g.fill(); });
const rug = add(new THREE.PlaneGeometry(4.6, 3.4), T(0xffffff,{map:rugTex, transparent:true}), 0,.05,-3.2, null, false); rug.rotation.x = -Math.PI/2;
function armchair(x, z, ry, c){
  const g = grp(x, 0, z, ry); const m = T(c), dk = T(C.woodDk);
  for (const [lx,lz] of [[-.5,-.4],[.5,-.4],[-.5,.4],[.5,.4]]) cyl(.05,.04,.22,dk,lx,.11,lz,g,6);
  box(1.25,.38,1.05,m,0,.4,0,g); box(1.0,.16,.85,T(C.cream),0,.66,.06,g);
  const back = box(1.25,1.15,.3,m,0,.95,-.42,g); back.rotation.x = -.1;
  for (const sx of [-1,1]) { box(.26,.4,1.05,m,sx*.62,.72,0,g); const a = cyl(.15,.15,1.05,m,sx*.62,.92,0,g,10); a.rotation.x = Math.PI/2; }
  for (let i=0;i<3;i++) sph(.035,T(C.gold),-.35+i*.35,1.2,-.26,g,6,false);
  return g;
}
armchair(-1.9, -3.4, Math.PI - .6, C.forest); armchair(1.9, -3.4, -(Math.PI - .6), C.rust);
col(-2.6, -1.2, -4.1, -2.7, -5, 1.4); col(1.2, 2.6, -4.1, -2.7, -5, 1.4);
const tea = grp(0, 0, -2.5);
cyl(.45,.45,.06,T(C.wood),0,.55,0,tea,18); cyl(.06,.1,.52,T(C.woodDk),0,.27,0,tea,8); cyl(.25,.3,.04,T(C.woodDk),0,.02,0,tea,10);
const pot = sph(.13, T(C.cream), -.1,.7,0, tea, 12); pot.scale.y = .85; outline(pot,1.08);
add(new THREE.TorusGeometry(.06,.015,5,10,Math.PI), T(C.cream), -.24,.72,0, tea).rotation.z = Math.PI/2;
const spout = cyl(.02,.035,.14,T(C.cream),.04,.74,0,tea,6); spout.rotation.z = -.9;
sph(.03,T(C.rust),-.1,.82,0,tea,8);
for (const [cx,cz] of [[.2,.18],[.18,-.2]]) { cyl(.06,.045,.07,T(C.cream),cx,.62,cz,tea,10); cyl(.09,.09,.01,T(C.cream),cx,.585,cz,tea,12); }
col(-.48, .48, -2.98, -2.02, -5, .7);
const basket = grp(-2.9, 0, -4.9);
cyl(.32,.25,.32,T(0xa07a48),0,.16,0,basket,10); sph(.13,T(C.plum),-.08,.36,0,basket,10); sph(.12,T(C.gold),.1,.35,.05,basket,10);
col(-3.25,-2.55,-5.25,-4.55,-5,.5);
function plant(x, z, s=1, potC=C.rust){
  const g = grp(x, 0, z);
  cyl(.26*s,.2*s,.42*s,T(potC),0,.21*s,0,g,10); cyl(.29*s,.29*s,.06*s,T(potC),0,.42*s,0,g,10);
  for (let i=0;i<7;i++){ const a = i/7*Math.PI*2; const l = add(new THREE.SphereGeometry(.2*s,8,6), T(i%2?C.forest:C.moss), Math.cos(a)*.18*s, (.62+rand()*.3)*s, Math.sin(a)*.18*s, g); l.scale.set(.6,1.4,.4); l.rotation.set(Math.sin(a)*.5, -a, Math.cos(a)*.5); }
  col(x-.3*s, x+.3*s, z-.3*s, z+.3*s, -5, 1.2*s);
  return g;
}
plant(-3.9, -6.4, 1.2); plant(-3.9, -.6, .9, C.navy);
const portraitTex = tex(256,320,(g,w,h)=>{ g.fillStyle='#3e6b45'; g.fillRect(0,0,w,h); g.fillStyle='#e9d9b8'; g.beginPath(); g.arc(128,150,70,0,7); g.fill(); g.fillStyle='#9a6b45'; g.beginPath(); g.ellipse(128,170,52,62,0,0,7); g.fill(); g.fillStyle='#f1d9b0'; g.beginPath(); g.ellipse(128,180,34,40,0,0,7); g.fill(); g.fillStyle='#fff'; g.beginPath(); g.arc(108,150,16,0,7); g.arc(148,150,16,0,7); g.fill(); g.fillStyle='#1a1320'; g.beginPath(); g.arc(108,150,8,0,7); g.arc(148,150,8,0,7); g.fill(); g.fillStyle='#d9a441'; g.beginPath(); g.moveTo(120,166); g.lineTo(136,166); g.lineTo(128,180); g.fill(); });
box(.06, 1.25, 1.0, T(C.gold), -4.33, 2.2, -4.6, null, false);
const pf = add(new THREE.PlaneGeometry(.85, 1.08), T(0xffffff,{map:portraitTex}), -4.29, 2.2, -4.6, null, false); pf.rotation.y = Math.PI/2;
const easelTex = tex(512,384,(g,w,h)=>{ g.fillStyle='#24382f'; g.fillRect(0,0,w,h); g.fillStyle='rgba(255,255,255,.88)'; g.font='700 40px "Nunito", sans-serif'; g.textAlign='center';
  g.fillText("TODAY'S WONDER", w/2, 70); g.font='800 46px "Nunito", sans-serif'; g.fillText('Why is the sky', w/2, 170); g.fillText('blue at noon and', w/2, 228); g.fillText('pink at sunset?', w/2, 286);
  g.strokeStyle='rgba(255,255,255,.7)'; g.lineWidth=4; g.beginPath(); g.arc(440,330,26,0,7); g.stroke(); });
const easel = grp(-2.4, 0, 5.3, .35);
for (const [lx,rz] of [[-.45,.12],[.45,-.12]]) { const l = box(.07,2,.07,T(C.woodLt),lx,1,0,easel); l.rotation.z = rz; }
const easelBack = box(.07,1.9,.07,T(C.woodLt),0,.95,-.35,easel); easelBack.rotation.x = -.3;
box(1.15,.85,.05,T(C.woodDk),0,1.35,.06,easel);
add(new THREE.PlaneGeometry(1.05,.78), T(0xffffff,{map:easelTex}), 0,1.35,.09, easel, false);
box(1.0,.06,.14,T(C.woodLt),0,.9,.1,easel);
col(-2.95, -1.85, 5.0, 5.6);
['A','B','C','1','2','3'].forEach((L, i) => {
  const lt = tex(128,128,(g,w,h)=>{ g.fillStyle = ['#b5552f','#2f5552','#d9a441','#6d3b5e','#3e6b45','#4a5a8a'][i]; g.fillRect(0,0,w,h); g.strokeStyle='#e9d9b8'; g.lineWidth=10; g.strokeRect(8,8,w-16,h-16); g.fillStyle='#e9d9b8'; g.font='900 84px "Nunito", sans-serif'; g.textAlign='center'; g.textBaseline='middle'; g.fillText(L, w/2, h/2+4); });
  const pos = [[.35,3.0,0],[.7,2.75,0],[.5,2.9,1],[.15,3.45,0],[2.95,3.95,0],[.4,4.3,0]][i];
  const b = box(.34,.34,.34, T(0xffffff,{map:lt}), pos[0], .17 + pos[2]*.34, pos[1]); b.rotation.y = rand()*1.4; outline(b, 1.05);
});
const chest = grp(3.6, 0, 6.1, Math.PI);
box(1.4,.6,.75,T(C.navy),0,.3,0,chest); add(new THREE.CylinderGeometry(.38,.38,1.4,12,1,false,0,Math.PI),T(C.navy),0,.6,0,chest).rotation.z = Math.PI/2;
box(1.45,.1,.8,T(C.gold),0,.12,0,chest); box(.18,.22,.05,T(C.gold),0,.58,.4,chest);
const teddyG = grp(3.0, .2, 6.0, Math.PI*.9);
sph(.2,T(0x9a6b45),0,.2,0,teddyG,12); sph(.15,T(0x9a6b45),0,.5,0,teddyG,12); for (const sx of [-1,1]) { sph(.06,T(0x9a6b45),sx*.11,.62,0,teddyG,8); sph(.07,T(0x9a6b45),sx*.17,.12,.12,teddyG,8); }
sph(.06,T(C.cream),0,.47,.12,teddyG,8);
col(2.85, 4.35, 5.7, 6.5);
// phonogram flashcard table
const cardTable = grp(-.45, 0, 6.15, 0);
box(1.25, .07, .72, T(C.woodLt), 0, .5, 0, cardTable);
for (const [lx,lz] of [[-.55,-.3],[.55,-.3],[-.55,.3],[.55,.3]]) cyl(.04,.04,.48,T(C.woodDk),lx,.24,lz,cardTable,6);
const miniCards = [['a','#b5552f'],['sh','#2f5552'],['igh','#6d3b5e'],['ck','#3e6b45'],['oo','#4a5a8a']];
miniCards.forEach(([txt, col], i) => {
  const ct = tex(128,180,(g,w,h)=>{ g.fillStyle='#f6ecd6'; g.fillRect(0,0,w,h); g.strokeStyle=col; g.lineWidth=8; g.strokeRect(6,6,w-12,h-12); g.fillStyle='#1a1320'; g.font='700 ' + (txt.length > 2 ? 46 : 64) + 'px "Andika", "Trebuchet MS", sans-serif'; g.textAlign='center'; g.textBaseline='middle'; g.fillText(txt, w/2, h/2+4); });
  const c = add(new THREE.BoxGeometry(.2, .012, .28), [T(0xf6ecd6),T(0xf6ecd6),T(0xffffff,{map:ct}),T(0xf6ecd6),T(0xf6ecd6),T(0xf6ecd6)], -.32 + i*.15, .54 + i*.004, .05 + Math.abs(i-2)*.04, cardTable, false);
  c.rotation.y = (i - 2) * -.22;
});
const cbox = grp(.42, .54, -.12, .2, cardTable);
box(.32, .14, .4, T(C.plum), 0, .07, 0, cbox); for (let i=0;i<6;i++) box(.26, .1, .012, T(0xf6ecd6), 0, .16, -.15 + i*.05, cbox, false);
box(.33, .03, .05, T(C.gold), 0, .1, .2, cbox, false);
col(-1.1, .2, 5.79, 6.51, -5, .8);

// ===== SCIENCE CORNER (x 4.5..10, z -7..-1.2) =====
box(.3, 3.2, 4.6, wallMat, 4.5, 1.6, -4.7); box(.4, .14, 4.8, trimMat, 4.5, 3.22, -4.7);
occluder(bookshelf(4.98, -4.6, Math.PI/2, 3.2, 4, true));
col(4.3, 5.45, -7, -2.4);
// Dr. Sparks' bench: her glowing jars on the left, a clear work mat on the right for experiments (lab/)
const BX = 7.8, BZ = -6.3;
const bench = grp(BX, 0, BZ);
box(3.8,.1,1.35,T(C.woodLt),0,.95,0,bench); box(3.6,.88,1.2,T(C.woodDk),0,.44,0,bench);
for (const dx of [-1.2, 0, 1.2]) box(.9,.6,.02,T(C.wood),dx,.5,.61,bench,false);
const bubbles = [];
[[-1.75,0x6fd6c4],[-1.5,0xe7b84c],[-1.25,0xd36a8f],[-.3,0x9ccf6b],[-.05,0x6fd6c4]].forEach(([bx,c],i)=>{
  const h = rr(.25,.42), bz = (i%2)*.2-.3;
  add(new THREE.CylinderGeometry(.1,.12,h,12), T(0xdff1f5,{transparent:true, opacity:.35}), bx, 1.0+h/2, bz, bench, false);
  cyl(.085,.105,h*.6, glowM(c,.7), bx, 1.0+h*.3, bz, bench, 10, false);
  bubbles.push({x:BX+bx, z:BZ+bz, y0:1.0+h, t:rand()*2, m:sph(.035,new THREE.MeshToonMaterial({color:0xffffff, gradientMap:grad, transparent:true, opacity:.8}),0,0,0,null,6,false)});
});
const alem = grp(-.85, 1.0, -.2, 0, bench);
cyl(.12,.15,.25,T(C.stone),0,.12,0,alem,10); add(new THREE.ConeGeometry(.06,.18,8), glowM(0x6fb7ff,1.4), 0,.32,0, alem, false);
sph(.2, T(0xdff1f5,{transparent:true, opacity:.35}), 0,.58,0, alem, 14, false);
sph(.16, glowM(0xd36a8f,.6), 0,.54,0, alem, 12, false);
const neck = cyl(.035,.035,.6,T(0xdff1f5,{transparent:true,opacity:.5}),.22,.95,0,alem,8,false); neck.rotation.z = -.9;
const nb = box(.45,.04,.32,T(C.cream),-.6,1.02,.32,bench,false); nb.rotation.y = .3;
const mag = grp(-1.1,1.06,.3,0,bench); add(new THREE.TorusGeometry(.09,.015,6,16),T(C.gold),0,0,0,mag).rotation.x = Math.PI/2; box(.03,.03,.2,T(C.woodDk),0,0,.17,mag);
const matTex = tex(512,340,(g,w,h)=>{ g.fillStyle='#2f5552'; g.fillRect(0,0,w,h); g.strokeStyle='rgba(239,224,191,.13)'; g.lineWidth=2;
  for (let x=0;x<=w;x+=32){ g.beginPath(); g.moveTo(x,0); g.lineTo(x,h); g.stroke(); } for (let y=0;y<=h;y+=32){ g.beginPath(); g.moveTo(0,y); g.lineTo(w,y); g.stroke(); }
  g.strokeStyle='rgba(217,164,65,.7)'; g.lineWidth=6; g.strokeRect(8,8,w-16,h-16); });
box(1.68,.006,1.12,T(0xffffff,{map:matTex}),1.02,1.003,0,bench,false);
// where experiments happen: the middle of the mat's top
export const LAB_DESK = {x:BX + 1.02, y:1.006, z:BZ};
const deskLamp = new THREE.PointLight(0xffe7c4, .55, 3.6, 2); deskLamp.position.set(LAB_DESK.x, 2.25, LAB_DESK.z + .45); scene.add(deskLamp);
col(5.8, 9.8, -7, -5.6);
const chartTex = tex(512,384,(g,w,h)=>{ g.fillStyle='#1f2747'; g.fillRect(0,0,w,h); g.strokeStyle='rgba(217,164,65,.6)'; g.lineWidth=2; g.beginPath(); g.arc(w/2,h/2,170,0,7); g.stroke(); g.beginPath(); g.arc(w/2,h/2,110,0,7); g.stroke();
  for (let i=0;i<90;i++){ g.fillStyle='rgba(255,240,200,'+rr(.4,1)+')'; g.beginPath(); g.arc(rand()*w, rand()*h, rr(1,3), 0, 7); g.fill(); }
  const pts = [[150,120],[200,150],[250,140],[300,180],[330,240]]; g.strokeStyle='rgba(255,255,255,.75)'; g.lineWidth=2; g.beginPath(); pts.forEach((p,i)=> i ? g.lineTo(p[0],p[1]) : g.moveTo(p[0],p[1])); g.stroke();
  g.fillStyle='#fff'; pts.forEach(p=>{ g.beginPath(); g.arc(p[0],p[1],5,0,7); g.fill(); }); });
box(2.3, 1.7, .06, T(C.woodDk), 7.8, 2.4, -6.98, null, false);
add(new THREE.PlaneGeometry(2.1, 1.5), T(0xffffff,{map:chartTex}), 7.8, 2.4, -6.94, null, false);
windowOn(9.97, 2.0, -4.0, -Math.PI/2, 1.2, 1.3);
const tele1 = grp(9.2, 0, -2.4, -.9);
for (let i=0;i<3;i++){ const a = i*2.1; const l = cyl(.03,.03,1.3,T(C.woodDk),Math.cos(a)*.25,.62,Math.sin(a)*.25,tele1,5); l.rotation.z = Math.cos(a)*.22; l.rotation.x = -Math.sin(a)*.22; }
const tt1 = cyl(.09,.13,1.1,T(C.gold),0,1.35,0,tele1,12); tt1.rotation.z = 1.15; outline(tt1, 1.08);
col(8.85, 9.55, -2.75, -2.05);
const mobile = grp(7.6, 3.0, -4.1);
cyl(.015,.015,.6,T(C.ink),0,.3,0,mobile,4);
sph(.26, glowM(0xffc35a,.9), 0,0,0, mobile, 16, false);
const planets = [[.6,.07,0xb7a99a],[.9,.1,0xe0b07a],[1.25,.12,0x5b8bd6],[1.6,.09,0xd06a45],[2.0,.2,0xd9b77a]].map(([r,s,c],i)=>{
  const g = grp(0,0,0,i*1.4,mobile); const p = sph(s, T(c), r, -.25-i*.05, 0, g, 12); outline(p,1.1); cyl(.005,.005,.25,T(C.ink),r,-.12,0,g,4,false);
  if (i===4) { const rg = add(new THREE.TorusGeometry(.3,.025,4,20), T(C.cream), r, -.45, 0, g); rg.rotation.x = 1.2; }
  return {g, speed:.6/(i+1)};
});
const terr = grp(5.9, 0, -1.7);
box(.7,.7,.5,T(C.woodDk),0,.35,0,terr); add(new THREE.SphereGeometry(.3,14,10,0,Math.PI*2,0,Math.PI/2), T(0xdff1f5,{transparent:true,opacity:.3}), 0,.72,0, terr, false);
for (const [mx,mz,mc] of [[-.1,0,0x6fd6c4],[.1,.06,0xd36a8f],[.02,-.1,0x9ccf6b]]) { cyl(.015,.02,.12,T(C.cream),mx,.78,mz,terr,5,false); add(new THREE.SphereGeometry(.06,10,6,0,Math.PI*2,0,Math.PI/2), glowM(mc,1), mx,.84,mz, terr, false); }
col(5.5, 6.3, -2, -1.4);
const labLight = new THREE.PointLight(0x7fd6ff, .7, 6, 2); labLight.position.set(7.6, 1.8, -5); scene.add(labLight);

// ===== ENTRY (x 4.5..10, z -1.2..7) =====
const rack = grp(9.35, 0, 1.6);
cyl(.2,.25,.06,T(C.woodDk),0,.03,0,rack,10); cyl(.04,.04,2,T(C.woodDk),0,1,0,rack,8);
for (let i=0;i<4;i++){ const pg = cyl(.02,.02,.3,T(C.woodDk),Math.cos(i*1.57)*.12,1.9,Math.sin(i*1.57)*.12,rack,5); pg.rotation.z = Math.cos(i*1.57)*.9; pg.rotation.x = -Math.sin(i*1.57)*.9; }
const hat = grp(.1,2.0,0,0,rack); cyl(.3,.3,.03,T(C.forest),0,0,0,hat,14); cyl(.16,.18,.25,T(C.forest),0,.13,0,hat,12); cyl(.185,.185,.05,T(C.gold),0,.05,0,hat,12);
box(.12,.7,.05,T(C.rust),-.15,1.55,0,rack).rotation.z = .15;
col(9.0, 9.7, 1.25, 1.95);
// the wardrobe: a real piece of furniture you walk up to and open
const wardrobe = grp(9.58, 0, 3.2, -Math.PI/2);
const wPlum = T(C.plum), wDeep = T(0x3a1f34), wDoor = T(0x5a2e4e), wGold = T(C.gold);
box(1.6, .14, .9, T(C.woodDk), 0, .07, 0, wardrobe);
for (const [fx,fz] of [[-.7,-.35],[.7,-.35],[-.7,.35],[.7,.35]]) sph(.07, T(C.woodDk), fx, .05, fz, wardrobe, 8);
box(1.5, 2.3, .06, wDeep, 0, 1.29, -.37, wardrobe);
for (const sx of [-1,1]) outline(box(.08, 2.3, .8, wPlum, sx*.71, 1.29, 0, wardrobe), 1.03);
box(1.5, .08, .8, wPlum, 0, 2.41, 0, wardrobe); box(1.5, .08, .8, wPlum, 0, .18, 0, wardrobe);
const arch = add(new THREE.CylinderGeometry(.62, .62, .82, 18, 1, false, -Math.PI/2, Math.PI), wPlum, 0, 2.43, 0, wardrobe); arch.rotation.x = -Math.PI/2; outline(arch, 1.04);
box(1.66, .1, .9, wGold, 0, 2.44, 0, wardrobe);
add(new THREE.PlaneGeometry(.42, .42), T(0xffffff, {map:tex(128,128,(g,w,h)=>{ g.fillStyle='#d9a441'; g.beginPath(); for (let i=0;i<10;i++){ const r = i%2?24:56, a = i*Math.PI/5-Math.PI/2; g.lineTo(w/2+Math.cos(a)*r, h/2+Math.sin(a)*r); } g.fill(); }), transparent:true}), 0, 2.72, .42, wardrobe, false);
cyl(.02, .02, 1.36, wGold, 0, 2.08, 0, wardrobe, 6).rotation.z = Math.PI/2;
[[-.45,0x2f8f8a],[-.15,0xb5552f],[.15,0xd9a441],[.45,0x3e6b45]].forEach(([gx,gc]) => {
  const gg = grp(gx, 2.0, .02, 0, wardrobe);
  add(new THREE.TorusGeometry(.06,.01,4,10,Math.PI), wGold, 0, .06, 0, gg, false);
  box(.3, .72, .08, T(gc), 0, -.36, 0, gg); box(.42, .14, .08, T(gc), 0, -.07, 0, gg);
});
box(1.3, .32, .04, wDoor, 0, .38, .41, wardrobe);
for (const kx of [-.3,.3]) sph(.04, wGold, kx, .38, .44, wardrobe, 8, false);
const doors = [];
for (const sx of [-1, 1]) {
  const hinge = grp(sx*.7, 0, .42, 0, wardrobe);
  const dm = box(.68, 1.86, .05, wDoor, -sx*.34, 1.48, 0, hinge); outline(dm, 1.03);
  box(.56, .05, .02, wGold, -sx*.34, 2.32, .03, hinge, false); box(.56, .05, .02, wGold, -sx*.34, .62, .03, hinge, false);
  box(.05, 1.72, .02, wGold, -sx*.08, 1.48, .03, hinge, false); box(.05, 1.72, .02, wGold, -sx*.6, 1.48, .03, hinge, false);
  sph(.05, wGold, -sx*.62, 1.4, .05, hinge, 8, false);
  if (sx < 0) { const mir = add(new THREE.CircleGeometry(.2, 20), T(0xb8d4e8, {emissive:0x6a8ab0, emissiveIntensity:.45}), -sx*.34, 1.62, .035, hinge, false); mir.scale.y = 1.45;
    const fr = add(new THREE.TorusGeometry(.2, .025, 6, 22), wGold, -sx*.34, 1.62, .035, hinge, false); fr.scale.y = 1.45; }
  else { const sc = box(.1, .45, .04, T(C.rust), -sx*.66, 1.0, .04, hinge, false); sc.rotation.z = -.15; }
  doors.push({hinge, sx});
}
const topHat = grp(.38, 2.5, 0, 0, wardrobe); cyl(.24,.24,.03,T(C.navy),0,0,0,topHat,14); cyl(.13,.15,.2,T(C.navy),0,.1,0,topHat,12); cyl(.155,.155,.04,T(C.gold),0,.04,0,topHat,12);
box(.36, .22, .3, T(C.gold), -.4, 2.6, 0, wardrobe).rotation.y = .3;
col(9.15, 10, 2.4, 4.0);
occluder(wardrobe);
let doorOpen = 0;
const benchE = grp(9.5, 0, 5.4, -Math.PI/2);
box(2.2,.1,.6,T(C.woodLt),0,.5,0,benchE); for (const bx of [-.9,.9]) box(.1,.5,.5,T(C.woodDk),bx,.25,0,benchE);
for (const bx of [-.5,-.25]) { const bt = grp(bx,0,.05,0,benchE); box(.18,.35,.3,T(C.rust),0,.18,0,bt); box(.18,.08,.42,T(C.woodDk),0,.04,.06,bt); }
col(9.1, 10, 4.2, 6.6, -5, .8);
const boardTex = tex(512,384,(g,w,h)=>{ g.fillStyle='#a07a48'; g.fillRect(0,0,w,h);
  g.fillStyle='#e9d9b8'; g.save(); g.translate(150,150); g.rotate(-.05); g.fillRect(-110,-90,220,180); g.strokeStyle='#b5552f'; g.lineWidth=4; g.setLineDash([10,8]); g.beginPath(); g.moveTo(-80,50); g.bezierCurveTo(-30,-60,20,60,80,-40); g.stroke(); g.setLineDash([]); g.fillStyle='#b5552f'; g.font='900 40px sans-serif'; g.fillText('✕', 64, -26); g.restore();
  g.fillStyle='#f3e3b0'; g.save(); g.translate(380,120); g.rotate(.06); g.fillRect(-80,-70,160,140); g.fillStyle='#2f5552'; g.font='800 24px "Nunito", sans-serif'; g.textAlign='center'; g.fillText('FIELD TRIPS', 0, -30); g.font='700 20px "Nunito", sans-serif'; g.fillText('Volcano', 0, 2); g.fillText('Coral reef', 0, 28); g.fillText('The Moon!', 0, 54); g.restore();
  g.fillStyle='#d36a8f'; g.fillRect(320,240,140,110); g.fillStyle='#1a1320'; g.font='800 22px "Nunito", sans-serif'; g.textAlign='center'; g.fillText('Be curious', 390, 300);
  ['#b5552f','#2f5552','#d9a441','#6d3b5e'].forEach((c,i)=>{ g.fillStyle=c; g.beginPath(); g.arc([150,380,390,90][i],[64,52,250,240][i],9,0,7); g.fill(); }); });
box(.08, 1.4, 1.9, T(C.woodDk), 9.97, 2.1, 5.4, null, false);
const bd = add(new THREE.PlaneGeometry(1.75, 1.25), T(0xffffff,{map:boardTex}), 9.92, 2.1, 5.4, null, false); bd.rotation.y = -Math.PI/2;
function crate(x, y, z, s, ry, label){
  const crt = tex(128,128,(g,w,h)=>{ g.fillStyle='#9a6b45'; g.fillRect(0,0,w,h); g.fillStyle='#7a5235'; for (let i=0;i<4;i++) g.fillRect(0,i*32+28,w,4); g.strokeStyle='#5a3626'; g.lineWidth=10; g.strokeRect(5,5,w-10,h-10);
    if (label){ g.fillStyle='#1a1320'; g.font='900 22px "Nunito", sans-serif'; g.textAlign='center'; g.fillText(label, w/2, h/2+8); } });
  const b = box(s, s, s, T(0xffffff,{map:crt}), x, y + s/2, z); b.rotation.y = ry; outline(b, 1.03); return b;
}
crate(6.0, 0, 6.15, .9, .1, 'GEAR'); crate(7.0, 0, 6.2, .8, -.15, ''); crate(6.3, .9, 6.1, .6, .4, 'MAPS');
col(5.5, 7.5, 5.65, 6.7);
add(new THREE.PlaneGeometry(1.1, 1.7), T(C.rust), 9.35, .05, 0, null, false).rotation.x = -Math.PI/2;
plant(4.9, 4.6, 1.0, C.plum);

hqAnims.push((dt, t) => {
  doorOpen += ((dressing ? 1 : 0) - doorOpen) * Math.min(1, dt * 5);
  doors.forEach(d => d.hinge.rotation.y = d.sx * 1.35 * doorOpen);
  flames.forEach(f => { if (f.candle) { f.m.scale.set(1, 1.6 + Math.sin(t * 13 + f.ph) * .25, 1); return; }
    const s = 1 + Math.sin(t * 9 + f.ph) * .12 + Math.sin(t * 23 + f.ph) * .06; f.m.scale.set(1, s, 1); f.m.rotation.y = t * 1.5 + f.ph; });
  fireLight.intensity = 1.5 + Math.sin(t * 11) * .15 + Math.sin(t * 27) * .1;
  deskFlame.scale.y = 1.6 + Math.sin(t * 14) * .3;
  const fd = Math.hypot(player.x, player.z + 5.8);
  if (fd < 7 && Math.random() < dt * 6) Sound.crackle(.05 * (1 - fd / 7));
  globeBall.rotation.y += dt * .25;
  mobile.rotation.y += dt * .12; planets.forEach(p => p.g.rotation.y += dt * p.speed);
  hand1.rotation.z = -t * .1;
  bubbles.forEach(b => { b.t += dt; const k = (b.t % 1.5) / 1.5; b.m.position.set(b.x, b.y0 + k * .45, b.z); b.m.material.opacity = 1 - k; });
});
