// ---------- Chapter 5: The Explorer Check ----------

import * as THREE from 'three';
import { C, T, add, box, clamp01, col, cyl, ease, glowM, glowTex, grp, outline, rrect, sph, tex } from '../../core/kit.js';
import { Sound } from '../../core/sound.js';
import { inWorld, makeWorld } from '../../core/world.js';
import { hero, player } from '../../player.js';
import { game } from '../../state.js';
import { convo, story } from '../../ui/dialogue.js';
import { objective, wagonDock } from '../field-trip.js';
import { crew, spawnNPC } from '../stop-kit.js';

const QUIZ = [
  {q:'Which layer of the Earth do we live on?', a:[['The crust', true], ['The mantle', false], ['The inner core', false]], ok:"Yes! The crust is the thin, rocky shell on top."},
  {q:'Two plates push together. What can grow there?', a:[['A brand-new ocean', false], ['Mountains', true], ['Nothing at all', false]], ok:"Right! Pushing plates crumple the crust up into mountains."},
  {q:'About how fast do plates move?', a:[['As fast as a car', false], ['As fast as a snail', false], ['As fast as fingernails grow', true]], ok:"Exactly! Slow and steady, just a few centimeters a year."}
];
function wrapText(c, text, x, y, maxW, lh){
  const words = text.split(' '), lines = []; let line = '';
  for (const wd of words) { const t = line ? line + ' ' + wd : wd; if (c.measureText(t).width > maxW && line) { lines.push(line); line = wd; } else line = t; }
  lines.push(line); const y0 = y - (lines.length - 1)*lh/2; lines.forEach((l, i) => c.fillText(l, x, y0 + i*lh));
}

export function buildQuiz(){
  const w = makeWorld({title:'The Explorer Check', bg:0x17122a, sky:0xb8a8e8, groundCol:0x2a2040, hemi:.72, sunCol:0xffe0c0, sunI:.6});
  w.bounds = (x, z) => Math.hypot(x, z) < 7.4 && z > -5.2;
  w.spawn = [0, 3.9, Math.PI];
  const AX = [-3.4, 0, 3.4], AZ2 = -1.8, arches = []; let qi = 0, stars = 0, answered = false, prevZ = 3.4, bctx, btex, knock = null, exclaimT = null;
  const exTex = tex(128, 128, (c, cw, ch) => { c.fillStyle = '#efe0bf'; c.beginPath(); c.arc(64, 58, 48, 0, 7); c.fill(); c.beginPath(); c.moveTo(50, 98); c.lineTo(64, 124); c.lineTo(76, 98); c.fill(); c.lineWidth = 6; c.strokeStyle = '#1a1320'; c.beginPath(); c.arc(64, 58, 48, 0, 7); c.stroke(); c.fillStyle = '#b5552f'; c.font = '900 72px Nunito, sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('!', 64, 62); });
  exTex.wrapS = exTex.wrapT = THREE.ClampToEdgeWrapping;
  const exclaim = new THREE.Sprite(new THREE.SpriteMaterial({map:exTex, transparent:true, depthTest:false})); exclaim.visible = false; exclaim.renderOrder = 20;
  inWorld(w, () => {
    const sg = new THREE.BufferGeometry(), sp = new Float32Array(400*3);
    for (let i = 0; i < 400; i++){ const a = Math.random()*Math.PI*2, r = 22 + Math.random()*14; sp[i*3] = Math.cos(a)*r; sp[i*3+1] = -6 + Math.random()*26; sp[i*3+2] = Math.sin(a)*r; }
    sg.setAttribute('position', new THREE.BufferAttribute(sp, 3)); const st = new THREE.Points(sg, new THREE.PointsMaterial({size:.35, map:glowTex, transparent:true, depthWrite:false, blending:THREE.AdditiveBlending, color:0xffe8c0})); st.frustumCulled = false; w.scene.add(st);
    const tileTex = tex(256, 256, (c, cw, ch) => { c.fillStyle = '#4a4258'; c.fillRect(0, 0, cw, ch); for (let r = 0; r < 4; r++) for (let k = 0; k < 4; k++) { c.fillStyle = ['#6f6680', '#665d78', '#7a7090'][(r + k) % 3]; rrect(c, k*64 + 4, r*64 + 4, 56, 56, 8); c.fill(); } }, 6, 6);
    add(new THREE.CylinderGeometry(8, 8.4, .3, 48), T(0xffffff, {map:tileTex}), 0, -.15, 0);
    for (let i = 0; i < 12; i++) { const a = i/12*Math.PI*2; if (Math.sin(a) < -.6) continue; const x = Math.cos(a)*7.8, z = Math.sin(a)*7.8; cyl(.06, .08, 1.8, T(C.ink), x, .9, z, null, 6); const l = sph(.16, glowM(0xffcf73, 1.2), x, 1.9, z, null, 8, false); const s = new THREE.Sprite(new THREE.SpriteMaterial({map:glowTex, transparent:true, depthWrite:false, blending:THREE.AdditiveBlending, color:0xffcf73, opacity:.6})); s.scale.set(1.4, 1.4, 1); s.position.set(x, 1.9, z); w.scene.add(s); }
    AX.forEach((ax, i) => {
      const g = grp(ax, 0, AZ2);
      for (const sx of [-1, 1]) outline(cyl(.22, .27, 2.4, T(0x8a8090), sx*1.05, 1.2, 0, g, 10), 1.04);
      outline(add(new THREE.TorusGeometry(1.05, .2, 8, 20, Math.PI), T(0x8a8090), 0, 2.4, 0, g), 1.04);
      const glow = add(new THREE.TorusGeometry(1.05, .09, 8, 20, Math.PI), glowM(0xffd36b, 1.3), 0, 2.4, .12, g, false); glow.visible = false;
      const pc = document.createElement('canvas'); pc.width = 512; pc.height = 200; const ptex = new THREE.CanvasTexture(pc); ptex.encoding = THREE.sRGBEncoding;
      const matB = add(new THREE.PlaneGeometry(2.7, 1.15), T(0xd9a441), 0, .015, 1.3, g, false); matB.rotation.x = -Math.PI/2;
      const mat = add(new THREE.PlaneGeometry(2.55, 1.0), T(0xffffff, {map:ptex}), 0, .02, 1.3, g, false); mat.rotation.x = -Math.PI/2;
      const gate = box(1.8, 2.25, .1, T(0x3a3440), 0, 3.2, 0, g); gate.visible = false;
      for (let b = 0; b < 4; b++) box(.06, 2.2, .14, T(0x8a8090), -.6 + b*.4, 0, 0, gate, false);
      col(ax - 1.35, ax - .78, AZ2 - .35, AZ2 + .35); col(ax + .78, ax + 1.35, AZ2 - .35, AZ2 + .35);
      arches.push({g, glow, pctx:pc.getContext('2d'), ptex, gate, disabled:false, dropT:null});
    });
    const bc = document.createElement('canvas'); bc.width = 1024; bc.height = 220; bctx = bc.getContext('2d'); btex = new THREE.CanvasTexture(bc); btex.encoding = THREE.sRGBEncoding;
    const qb = add(new THREE.PlaneGeometry(7.6, 1.75), T(0xd9a441), 0, .015, AZ2 + 2.75, null, false); qb.rotation.x = -Math.PI/2;
    const qm = add(new THREE.PlaneGeometry(7.4, 1.6), T(0xffffff, {map:btex}), 0, .02, AZ2 + 2.75, null, false); qm.rotation.x = -Math.PI/2;
    box(.8, 1.0, .6, T(C.plum), -5.2, .5, 1.0); col(-5.6, -4.8, .7, 1.3);
  });
  function paint(){
    const q = QUIZ[qi];
    bctx.fillStyle = '#efe0bf'; bctx.fillRect(0, 0, 1024, 220); bctx.strokeStyle = '#d9a441'; bctx.lineWidth = 10; bctx.strokeRect(8, 8, 1008, 204);
    bctx.fillStyle = '#6d3b5e'; bctx.font = '900 26px Nunito, sans-serif'; bctx.textAlign = 'center'; bctx.textBaseline = 'middle'; bctx.fillText(`QUESTION ${qi + 1} OF ${QUIZ.length}`, 512, 44);
    bctx.fillStyle = '#1a1320'; bctx.font = '54px Caprasimo, Georgia, serif'; wrapText(bctx, q.q, 512, 132, 940, 60); btex.needsUpdate = true;
    arches.forEach((a, i) => {
      const c = a.pctx; c.fillStyle = '#efe0bf'; c.fillRect(0, 0, 512, 200); c.fillStyle = '#1a1320'; c.font = '900 62px Nunito, sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; wrapText(c, q.a[i][0], 256, 102, 480, 66); a.ptex.needsUpdate = true;
      a.disabled = false; a.dropT = null; a.gate.visible = false; a.gate.position.y = 3.2; a.glow.visible = false;
    });
  }
  function choose(i){
    const a = arches[i], q = QUIZ[qi];
    if (a.disabled || answered || qi >= QUIZ.length) return;
    if (q.a[i][1]) {
      answered = true; stars++; a.glow.visible = true; objective(`Explorer check: ${'★'.repeat(stars)}${'☆'.repeat(QUIZ.length - stars)}`);
      [659, 880, 1175].forEach((f, k) => Sound.tone(f, {type:'triangle', t:k*.06, dur:.25, vol:.09}));
      story([['sparks', q.ok]], () => {
        qi++;
        if (qi < QUIZ.length) { answered = false; paint(); story([['juniper', QUIZ[qi].q]]); }
        else { w.cleared = true; story([['juniper', "Three out of three! Into my notebook it goes."], ['sparks', "Splendid exploring! Wonder Bus, take us home!"]], () => objective('Climb into the Wonder Bus to fly home')); }
      });
    } else {
      a.disabled = true; a.dropT = game.elapsed; a.gate.visible = true; game.camShake = 2;
      knock = {t0: game.elapsed, z0: player.z, z1: Math.min(player.z + 2.1, 3.5), x: player.x}; exclaimT = game.elapsed; game.cutscene = true;
      if (!exclaim.parent || exclaim.parent !== hero.root) hero.root.add(exclaim);
      Sound.tone(520, {type:'square', dur:.25, vol:.06, f2:220, cut:1800}); Sound.tone(90, {dur:.3, vol:.18, f2:50});
      Sound.tone(330, {type:'triangle', dur:.15, vol:.08}); Sound.tone(262, {type:'triangle', t:.1, dur:.2, vol:.07}); Sound.hiss({dur:.5, vol:.12, type:'lowpass', freq:200});
      story([['juniper', "Hmm, not quite. Try another arch!"]]);
    }
  }
  spawnNPC(w, 'juniper', -5.2, 1.9, .7, ["Walk through the arch with the right answer, {name}!"]);
  crew(w, {sparks:["Read the question on the floor, then walk through the arch you think is right."], pip:["I think you've got this one!"]}, 'juniper');
  wagonDock(w, 5.3, .35, 4.9, -.7, 4.2, 4.0);
  w.notYet = "Finish the Explorer Check first, {name}!";
  w.update = (dt, t) => {
    const LINE = AZ2 + .55;
    if (!convo && !game.cutscene) arches.forEach((a, i) => { if (prevZ > LINE && player.z <= LINE && Math.abs(player.x - AX[i]) < .8) choose(i); });
    prevZ = player.z;
    if (knock) {
      const p = clamp01((t - knock.t0)/.5);
      player.z = knock.z0 + (knock.z1 - knock.z0)*ease(p); player.x = knock.x; player.y = Math.sin(Math.PI*p)*.7; player.vy = 0;
      player.angle = 0; hero.root.position.set(player.x, player.y, player.z); hero.root.rotation.y = 0;
      if (p >= 1) { knock = null; player.y = 0; game.cutscene = false; prevZ = player.z; }
    }
    if (exclaimT !== null) {
      const e = t - exclaimT; exclaim.visible = e < 1.5;
      const sc = e < .15 ? e/.15*1.25 : e < .3 ? 1.25 - (e - .15)/.15*.25 : 1;
      exclaim.scale.set(.75*sc, .75*sc, 1); exclaim.position.set(0, 2.45 + Math.sin(e*10)*.04, 0);
      if (e >= 1.5) exclaimT = null;
    }
    arches.forEach(a => { if (a.dropT !== null) a.gate.position.y = 3.2 - 2.05*ease(clamp01((t - a.dropT)/.18)); if (a.glow.visible) a.glow.material.emissiveIntensity = 1.2 + Math.sin(t*6)*.3; });
  };
  w.onEnter = () => { paint(); story([['juniper', "Quiz time, {name}! Read the question on the floor, then walk through the arch with the right answer."], ['juniper', QUIZ[0].q]], () => objective('Explorer check: ☆☆☆')); };
  return w;
}
