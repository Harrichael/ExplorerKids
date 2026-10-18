// ---------- Chapter 3: The Continent Puzzle ----------

import * as THREE from 'three';
import { C, T, add, box, clamp01, ease, glowTex, grp, outline, sph, tex } from '../../core/kit.js';
import { Sound } from '../../core/sound.js';
import { addUsable, inWorld, makeWorld } from '../../core/world.js';
import { player } from '../../player.js';
import { game } from '../../state.js';
import { story } from '../../ui/dialogue.js';
import { objective, wagonDock } from '../field-trip.js';
import { crew, miniTree } from '../stop-kit.js';

function inPoly(px, pz, pts, ox = 0, oz = 0){ let c = false; for (let i = 0, j = pts.length - 1; i < pts.length; j = i++){ const xi = pts[i][0] + ox, zi = pts[i][1] + oz, xj = pts[j][0] + ox, zj = pts[j][1] + oz; if (((zi > pz) !== (zj > pz)) && (px < (xj - xi)*(pz - zi)/(zj - zi) + xi)) c = !c; } return c; }
const AFRICA = [[470,110],[440,150],[425,185],[422,215],[470,250],[482,300],[500,380],[530,440],[560,462],[600,420],[640,330],[680,255],[705,215],[655,185],[620,120],[560,100]];
const SAMERICA = [[300,170],[400,198],[418,222],[465,255],[476,300],[490,372],[452,420],[402,480],[372,432],[345,352],[312,282],[286,222]];

function makeFossil(){
  const g = new THREE.Group(), bone = T(0xf3e6c8);
  const b = sph(.22, bone, 0, .16, 0, g, 12); b.scale.set(1.6, .7, .8); outline(b, 1.08);
  const hd = sph(.12, bone, .42, .2, 0, g, 10); hd.scale.set(1.4, .8, .9); outline(hd, 1.1);
  const tl = add(new THREE.ConeGeometry(.08, .7, 6), bone, -.6, .15, 0, g); tl.rotation.z = Math.PI/2; outline(tl, 1.1);
  for (const [lx, lz] of [[.18, .14], [.18, -.14], [-.18, .14], [-.18, -.14]]) box(.05, .14, .05, bone, lx, .06, lz, g);
  sph(.025, T(C.ink), .5, .24, .06, g, 6, false);
  return g;
}
export function buildPuzzle(){
  const w = makeWorld({title:'The Continent Puzzle', bg:0x1b2440, sky:0xc0d4f0, groundCol:0x2e4f73, hemi:.78, sunCol:0xfff0d8, sunI:.72});
  const toW = ([px, py]) => [(px - 500)/40, (py - 290)/40];
  const AF = AFRICA.map(toW), SA = SAMERICA.map(toW);
  const off = {x:-4.25, z:.75, sx:-4.25, sz:.75, tx:-4.25, tz:.75, pushes:0, moving:false};
  const saC = SA.reduce((a, p) => [a[0] + p[0]/SA.length, a[1] + p[1]/SA.length], [0, 0]);
  w.ground = (x, z) => (inPoly(x, z, AF) || inPoly(x, z, SA, off.x, off.z)) ? .34 : 0;
  w.bounds = (x, z) => x > -10.8 && x < 7.8 && z > -6.2 && z < 6.4;
  w.surface = (x, z, y) => y > .2 ? 'grass' : 'wood';
  w.spawn = [-2.4, 5.3, Math.PI];
  let saG, fitT = null; const fossils = [], burst = [];
  inWorld(w, () => {
    const mt = tex(1024, 768, (c, cw, ch) => {
      const g1 = c.createLinearGradient(0, 0, 0, ch); g1.addColorStop(0, '#2b5a86'); g1.addColorStop(1, '#234a72'); c.fillStyle = g1; c.fillRect(0, 0, cw, ch);
      c.strokeStyle = 'rgba(239,224,191,.18)'; c.lineWidth = 2; c.setLineDash([6, 8]);
      for (let x = 0; x <= cw; x += 128) { c.beginPath(); c.moveTo(x, 0); c.lineTo(x, ch); c.stroke(); } for (let y = 0; y <= ch; y += 128) { c.beginPath(); c.moveTo(0, y); c.lineTo(cw, y); c.stroke(); } c.setLineDash([]);
      c.strokeStyle = 'rgba(255,255,255,.22)'; c.lineWidth = 3; for (let i = 0; i < 70; i++){ const x = Math.random()*cw, y = Math.random()*ch; c.beginPath(); c.arc(x, y, 10, Math.PI*1.1, Math.PI*1.9); c.stroke(); c.beginPath(); c.arc(x + 20, y, 10, Math.PI*1.1, Math.PI*1.9); c.stroke(); }
      const cx = cw*.86, cy = ch*.18; c.fillStyle = '#efe0bf'; c.beginPath(); for (let k = 0; k < 8; k++) { const r = k % 2 ? 14 : 52, a = k*Math.PI/4 - Math.PI/2; c.lineTo(cx + Math.cos(a)*r, cy + Math.sin(a)*r); } c.closePath(); c.fill(); c.strokeStyle = '#1a1320'; c.lineWidth = 3; c.stroke();
      c.font = '800 30px Nunito, sans-serif'; c.textAlign = 'center'; c.fillStyle = '#efe0bf'; c.fillText('N', cx, cy - 64);
      c.font = '30px Caprasimo, Georgia, serif'; c.fillStyle = 'rgba(239,224,191,.6)'; c.fillText('ATLANTIC OCEAN', cw*.47, ch*.66);
    });
    const floor = add(new THREE.PlaneGeometry(30, 22), T(0xffffff, {map:mt}), -1.5, 0, 0, null, false); floor.rotation.x = -Math.PI/2;
    for (const [bx, bz, bw, bd] of [[-1.5, -11.2, 30.8, .5], [-1.5, 11.2, 30.8, .5], [-16.9, 0, .5, 22.8], [13.9, 0, .5, 22.8]]) box(bw, .3, bd, T(C.wood), bx, .15, bz);
    const ext = pts => new THREE.ExtrudeGeometry(new THREE.Shape(pts.map(([x, z]) => new THREE.Vector2(x, -z))), {depth:.26, bevelEnabled:true, bevelSize:.05, bevelThickness:.05, bevelSegments:1});
    const af = add(ext(AF), [T(0xd9b77a), T(0x9a7a4a)], 0, 0, 0); af.rotation.x = -Math.PI/2;
    for (const [tx, tz] of [[1.5, .5], [2.3, 1.3], [.9, 1.6], [3, 0], [1.8, 2.4], [3.6, -1.2]]) miniTree(tx, .34, tz, 1);
    saG = grp(off.x, 0, off.z);
    const sa = add(ext(SA), [T(0x8fb86a), T(0x5a7a3a)], 0, 0, 0, saG); sa.rotation.x = -Math.PI/2;
    for (const [tx, tz] of [[-2.8, -1.2], [-3.6, -.2], [-2.2, .4], [-1.6, 1.2], [-2.6, 2.4]]) miniTree(tx, .34, tz, 1, saG);
    const decal = (text, x, z, parent, size = 1) => { const tt = tex(512, 128, (c, cw, ch) => { c.font = '60px Caprasimo, Georgia, serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.lineWidth = 10; c.strokeStyle = 'rgba(26,19,32,.7)'; c.strokeText(text, cw/2, ch/2); c.fillStyle = '#efe0bf'; c.fillText(text, cw/2, ch/2); }); const p = add(new THREE.PlaneGeometry(4*size, size), T(0xffffff, {map:tt, transparent:true, depthWrite:false}), x, .4, z, parent, false); p.rotation.x = -Math.PI/2; return p; };
    decal('Africa', 2.6, -1.4); decal('South America', -3.1, -1.9, saG, .8);
    for (const [fx, fz, parent] of [[-1.55, .8, saG], [.35, 1.1, null]]) { const f = makeFossil(); f.position.set(fx, .34, fz); f.scale.setScalar(.01); (parent || w.scene).add(f); fossils.push(f); }
    for (let i = 0; i < 16; i++) { const s = new THREE.Sprite(new THREE.SpriteMaterial({map:glowTex, transparent:true, depthWrite:false, blending:THREE.AdditiveBlending, color:0xffd36b, opacity:0})); s.scale.set(.6, .6, 1); w.scene.add(s); burst.push({s, a:i/16*Math.PI*2}); }
  });
  const pushU = addUsable(w, {name:'South America', x: saC[0] + off.x, z: saC[1] + off.z, range:3.4, verb:'Push South America', short:'Push', glow:[saC[0] + off.x, 1.6, saC[1] + off.z], action: () => {
    if (off.pushes >= 3 || off.moving) return;
    off.pushes++; off.moving = true; off.tx = off.sx*(1 - off.pushes/3); off.tz = off.sz*(1 - off.pushes/3);
    Sound.hiss({dur:1.1, vol:.13, type:'lowpass', freq:300}); Sound.tone(70, {type:'triangle', dur:1.1, vol:.12, f2:55}); game.camShake = 1.5;
    objective(`Push South America over to Africa (${off.pushes}/3)`);
    if (off.pushes === 1) story([['pip', "It's moving! Keep pushing!"]]);
    if (off.pushes === 2) story([['juniper', "Almost there, {name}!"]]);
  }});
  function fit(){
    fitT = game.elapsed; pushU.range = 0; game.camShake = 2.5;
    [523, 659, 784, 1046].forEach((f, i) => Sound.tone(f, {type:'triangle', t:i*.07, dur:.3, vol:.09}));
    story([['sparks', "A perfect fit! And look: fossils of the same little reptile, Mesosaurus, are found on both sides of the ocean."],
           ['sparks', "About 250 million years ago, all the continents were joined together in one giant supercontinent called Pangaea."],
           ['pip', "Then the plates slowly carried them apart. Whoa."]], () => { w.cleared = true; objective('Climb back into the Wonder Bus'); });
  }
  crew(w, {sparks:["Give South America a good push, {name}!"], pip:["This is the biggest puzzle I've ever seen."], juniper:["See how the bumpy coasts match up?"]});
  wagonDock(w, 6.3, .35, 5.3, -.4, 5.0, 4.9);
  w.notYet = "First let's solve the puzzle, {name}. Push South America!";
  w.update = (dt, t) => {
    if (off.moving) {
      const k = Math.min(1, dt*2.2), nx = off.x + (off.tx - off.x)*k, nz = off.z + (off.tz - off.z)*k, dxm = nx - off.x, dzm = nz - off.z;
      const carry = inPoly(player.x, player.z, SA, off.x, off.z);
      game.world.npcs.forEach(n => { if (inPoly(n.x, n.z, SA, off.x, off.z)) { n.x += dxm; n.z += dzm; } });
      off.x = nx; off.z = nz; saG.position.set(off.x, 0, off.z);
      if (carry) { player.x += dxm; player.z += dzm; }
      if (Math.hypot(off.tx - off.x, off.tz - off.z) < .02) { off.x = off.tx; off.z = off.tz; saG.position.set(off.x, 0, off.z); off.moving = false; if (off.pushes === 3) fit(); }
    }
    pushU.x = saC[0] + off.x; pushU.z = saC[1] + off.z; pushU.sparkle.position.x = pushU.x; pushU.sparkle.position.z = pushU.z;
    if (fitT !== null) {
      const p = clamp01((t - fitT)/.8); fossils.forEach(f => f.scale.setScalar(.01 + ease(p)*1.2));
      const bp = clamp01((t - fitT)/1.4); burst.forEach(b => { b.s.position.set(-.6 + Math.cos(b.a)*(.5 + bp*4), .8 + bp*1.2, .6 + Math.sin(b.a)*(.5 + bp*4)); b.s.material.opacity = bp < 1 ? (1 - bp) : 0; });
    }
  };
  w.onEnter = () => story([['sparks', "Pop! Back up to the surface, onto the world's biggest map."],
    ['juniper', "Look, {name}! The edge of South America looks like it would fit right into Africa, like puzzle pieces!"],
    ['sparks', "Let's test it. Walk over and give South America a good push!"]], () => objective('Push South America over to Africa (0/3)'));
  return w;
}
