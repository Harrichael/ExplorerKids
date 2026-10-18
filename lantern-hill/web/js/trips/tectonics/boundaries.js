// ---------- Chapter 4: Where Plates Meet ----------

import * as THREE from 'three';
import { C, T, add, box, clamp01, col, cyl, ease, glowM, grp, outline, sph } from '../../core/kit.js';
import { Sound } from '../../core/sound.js';
import { addUsable, inWorld, makeWorld } from '../../core/world.js';
import { grassTex } from '../../hq/ground.js';
import { game } from '../../state.js';
import { story } from '../../ui/dialogue.js';
import { objective, wagonDock } from '../field-trip.js';
import { crew, miniTree, signpost } from '../stop-kit.js';

export function buildBoundaries(){
  const w = makeWorld({title:'Where Plates Meet', bg:0x2a2240, sky:0xa597d0, groundCol:0x4a3626, hemi:.66, sunCol:0xffb47c, sunI:.78});
  w.bounds = (x, z) => Math.abs(x) < 10.6 && z > 1.05 && z < 5.8;
  w.surface = () => 'grass';
  w.spawn = [0, 4.4, Math.PI];
  const S = {apart:{x:-7}, together:{x:0}, slide:{x:7}}, done = new Set();
  const LINES = {
    apart: ['sparks', "When plates pull apart, melted rock rises up and cools into brand-new crust. That's happening right now under the Atlantic Ocean, and in Iceland!"],
    together: ['sparks', "When plates push together, the crust crumples up into mountains. The Himalayas, the tallest mountains on Earth, are still growing a tiny bit every year!"],
    slide: ['juniper', "The plates got stuck, then slipped all at once! That sudden jolt is an earthquake. California's San Andreas Fault works just like this."]
  };
  inWorld(w, () => {
    const gr = add(new THREE.PlaneGeometry(44, 30), T(0xffffff, {map:grassTex}), 0, 0, 0, null, false); gr.rotation.x = -Math.PI/2;
    for (let i = 0; i < 26; i++) { const s = add(new THREE.CylinderGeometry(.38, .42, .06, 8), T([0x8a8090, 0x7d7486, 0x94899a][i % 3]), -10.5 + i*.84, .03, 3.3 + Math.sin(i)*.15, null, false); s.rotation.y = i; }
    for (let i = 0; i < 18; i++) { const px = -14 + i*1.7 + Math.random(), pz = -5.5 - Math.random()*3; const g = grp(px, 0, pz); cyl(.15, .22, 1, T(C.woodDk), 0, .5, 0, g, 6); for (let k = 0; k < 3; k++) add(new THREE.ConeGeometry(1.2 - k*.3, 1.4, 8), T(k % 2 ? 0x2c4a34 : 0x263f2e), 0, 1.3 + k*.75, 0, g); }
    const dirt = T(0x7a4e32), top = T(0x4e7a4e);
    const slab = (x, z, wd) => { const g = grp(x, 0, z); box(wd, .5, 3, dirt, 0, .25, 0, g); box(wd, .08, 3, top, 0, .52, 0, g); return g; };
    S.apart.L = slab(-8.1, -1.4, 2.2); S.apart.R = slab(-5.9, -1.4, 2.2);
    S.apart.magma = box(1.4, .5, 3, glowM(0xff7a2a, 1.2), -7, -.3, -1.4, null, false); S.apart.magma.scale.x = .01;
    S.apart.crust = box(1.3, .12, 2.9, T(0x3a3440), -7, -.2, -1.4, null, false); S.apart.crust.scale.x = .01;
    S.apart.light = new THREE.PointLight(0xff7a3a, 0, 6, 2); S.apart.light.position.set(-7, 1, -1.2); w.scene.add(S.apart.light);
    S.together.L = slab(-1.1, -1.4, 2.2); S.together.R = slab(1.1, -1.4, 2.2);
    S.together.mtn = grp(0, .5, -1.4);
    for (const [px, pz, ph, pr] of [[0, 0, 2.2, 1.0], [-.6, .5, 1.5, .7], [.6, -.4, 1.7, .75], [.3, .7, 1.2, .6], [-.5, -.6, 1.3, .6]]) { outline(add(new THREE.ConeGeometry(pr, ph, 7), T(0x6b5a52), px, ph/2, pz, S.together.mtn), 1.04); add(new THREE.ConeGeometry(pr*.38, ph*.38, 7), T(0xf6ecd6), px, ph*.81, pz, S.together.mtn); }
    S.together.mtn.scale.set(1, .01, 1);
    S.slide.L = grp(5.5, 0, -1.4); S.slide.R = grp(8.5, 0, -1.4);
    for (const [g, sx] of [[S.slide.L, -1], [S.slide.R, 1]]) {
      box(2.9, .4, 3.2, T(0x55804a), 0, .2, 0, g); box(2.9, .05, .7, T(0x5a5a66), 0, .43, 0, g);
      for (let k = 0; k < 3; k++) box(.4, .02, .08, T(C.cream), -1 + k, .46, 0, g, false);
      for (let k = 0; k < 5; k++) box(.07, .45, .07, T(C.cream), -1.2 + k*.6, .62, .9, g);
      box(2.8, .06, .05, T(C.cream), 0, .72, .9, g); box(2.8, .06, .05, T(C.cream), 0, .56, .9, g);
      miniTree(sx*.6, .4, -.9, 1.3, g);
    }
    box(.12, .44, 3.2, T(0x2a1e1a), 7, .22, -1.4, null, false);
    S.slide.ring = add(new THREE.TorusGeometry(1, .05, 6, 40), new THREE.MeshBasicMaterial({color:0xffd36b, transparent:true, opacity:0}), 7, .6, -1.4, null, false); S.slide.ring.rotation.x = Math.PI/2;
    for (const [id, nm] of [['apart', 'Pull apart'], ['together', 'Push together'], ['slide', 'Slide past']]) {
      const sx = S[id].x, lv = grp(sx, 0, 1.0);
      box(.6, .5, .4, T(C.navy), 0, .25, 0, lv);
      const arm = grp(0, .5, 0, 0, lv); box(.08, .8, .08, T(C.woodLt), 0, .4, 0, arm); sph(.12, T(C.rust), 0, .82, 0, arm, 10); arm.rotation.x = -.5; S[id].arm = arm;
      signpost(sx - 1.45, .85, nm, 0, .2);
      col(sx - 2.7, sx + 2.7, -3.4, .55, -5, 3); col(sx - .35, sx + .35, .75, 1.25);
    }
  });
  for (const id of ['apart', 'together', 'slide']) addUsable(w, {name:id, x:S[id].x, z:1.8, range:1.4, verb:'Pull the lever', short:'Pull', glow:[S[id].x, 1.95, 1.0], action: () => {
    const s = S[id];
    if (s.t0 !== undefined) { story([LINES[id]]); return; }
    s.t0 = game.elapsed; Sound.tone(392, {type:'square', dur:.08, vol:.05, cut:1500});
    if (id === 'apart') Sound.tone(160, {dur:.6, vol:.12, f2:80});
    if (id === 'together') { Sound.hiss({dur:1.6, vol:.12, type:'bandpass', freq:600, q:.8}); Sound.tone(80, {type:'triangle', dur:2, vol:.12, f2:55}); }
    story([LINES[id]]);
  }});
  crew(w, {sparks:["Pull every lever, {name}. Each one moves the plates a different way."], pip:["I want to see the earthquake one!"], juniper:["Mountains, new crust and earthquakes. Plates are busy!"]});
  wagonDock(w, 9.2, .35, 4.9, -.5, 8.0, 4.6);
  w.notYet = "Try all three levers first, {name}!";
  w.update = (dt, t) => {
    for (const id of ['apart', 'together', 'slide']) {
      const s = S[id]; if (s.t0 === undefined) continue;
      const k = t - s.t0, p = clamp01(k/3), e2 = ease(p);
      s.arm.rotation.x += (.5 - s.arm.rotation.x)*Math.min(1, dt*8);
      if (id === 'apart') { s.L.position.x = -8.1 - .6*e2; s.R.position.x = -5.9 + .6*e2; s.magma.scale.x = .01 + e2; s.magma.position.y = -.3 + .45*e2; const cp = clamp01((p - .5)/.5); s.crust.scale.x = .01 + cp; s.crust.position.y = -.2 + .62*cp; s.light.intensity = 1.6*e2*(1 - cp*.6) + Math.sin(t*6)*.1*e2; }
      if (id === 'together') { s.L.position.x = -1.1 + .25*e2; s.R.position.x = 1.1 - .25*e2; s.mtn.scale.y = .01 + e2; if (p < 1) game.camShake = Math.max(game.camShake, .8); }
      if (id === 'slide') {
        const J = [.5, 1.4, 2.3], jerks = J.filter(j => k >= j).length;
        if (jerks > (s.jerks || 0)) { s.jerks = jerks; game.camShake = 4; s.ringT = t; Sound.hiss({dur:.8, vol:.22, type:'lowpass', freq:160}); Sound.tone(48, {dur:.8, vol:.22, f2:32}); }
        const offz = jerks ? .35*((jerks - 1) + ease(clamp01((k - J[jerks - 1])/.15))) : 0;
        s.R.position.z = -1.4 + offz; s.L.position.z = -1.4 - offz*.5;
        if (s.ringT !== undefined) { const rp = clamp01((t - s.ringT)/1.1); s.ring.scale.setScalar(.3 + rp*3.5); s.ring.material.opacity = (1 - rp)*.9; }
      }
      if (p >= 1 && !s.done) {
        s.done = true; done.add(id); objective(`Pull every lever (${done.size}/3)`);
        if (done.size === 3) story([['pip', "The fence split right in two! Earthquakes are strong."], ['sparks', "Now you can answer our big question, {name}! One more stop: the Explorer Check."]], () => { w.cleared = true; objective('Climb back into the Wonder Bus'); });
      }
    }
  };
  w.onEnter = () => story([['sparks', "The most exciting places on Earth are where two plates meet. Those edges are called boundaries."],
    ['sparks', "Each lever moves the plates a different way: pull apart, push together, or slide past. Try all three!"]], () => objective('Pull every lever (0/3)'));
  return w;
}
