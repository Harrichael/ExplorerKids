// Dr. Sparks's Explorer Check: after a trip, the Wonder Bus parks on a cloud, and the class asks the
// explorer what they found out. For each question, arches pop up out of the cloud, one per answer with
// its picture on top, and the explorer answers by walking through one. Walking is the point: an answer
// takes a trip across the cloud, so it can't be clicked through. A wrong arch puffs shut with a little
// cloud and bounces the explorer back for a hint and another go; a right one on the first try is a star.
//
//   const stars = await explorerCheck(t, [
//     {who:'pip', q:"Which is bigger?", answers:[["The sun", drawSun], ["The moon", drawMoon]],   // the first is right
//      hint:"Think of how far away it is.", yay:"The sun! It only looks small."}, ...]);
//
// A question marked secret:true came from something the explorer found off the path, and says so.
//
// A picture is drawn like a notebook sticker, draw(ctx, 240, 170). The explorer may climb back aboard
// the bus at any time to stop; it resolves with the stars so far.

import * as THREE from 'three';
import { C, T, XF, add, clamp01, cyl, ease, glowTex, grp, mergeGeos, meshOf, outline, rrect, sph, tex } from '../core/kit.js';
import { Sound } from '../core/sound.js';
import { addUsable, inWorld } from '../core/world.js';
import { hero, player } from '../player.js';
import { game } from '../state.js';
import { tripBus } from './bus.js';
import { heroHopIn, puffs, spawnNPC, tripWorld } from './stop-kit.js';
import { storySky } from './sky.js';

const RIM = 10.6, AZ = -1.4, SLOTS = [-3.6, 0, 3.6], START = [0, 4.4], OPEN = .82;
const ARCH_COL = [C.rust, 0x2f8f8a, C.plum];
const CLASS_AT = {sparks:[4.6, 4.8, -.6], pip:[-5.6, 1.4, .9], juniper:[6.9, 1.8, -.9], basil:[-4.2, 3.2, 1.2], mo:[7.6, 3.9, -1.1]};
// off to the side and well back, out of the way of the explorer's view of the arches
const BUS = [-6.6, 4.8, -1.1];

function wrap(c, text, x, y, maxW, lh){
  const lines = []; let line = '';
  for (const wd of text.split(' ')) { const s = line ? line + ' ' + wd : wd; if (c.measureText(s).width > maxW && line) { lines.push(line); line = wd; } else line = s; }
  lines.push(line); const y0 = y - (lines.length - 1)*lh/2; lines.forEach((l, i) => c.fillText(l, x, y0 + i*lh));
}
function canvasTex(w, h){ const cv = document.createElement('canvas'); cv.width = w; cv.height = h; const t = new THREE.CanvasTexture(cv); t.encoding = THREE.sRGBEncoding; return {c:cv.getContext('2d'), t}; }
const starPath = (c, x, y, r) => { c.beginPath(); for (let k = 0; k < 10; k++) { const rr = k % 2 ? r*.45 : r, a = k*Math.PI/5 - Math.PI/2; c.lineTo(x + Math.cos(a)*rr, y + Math.sin(a)*rr); } c.closePath(); };
const starTex = tex(128, 128, (c, w, h) => { starPath(c, 64, 66, 56); c.fillStyle = '#ffd36b'; c.fill(); c.lineWidth = 7; c.strokeStyle = '#1a1320'; c.lineJoin = 'round'; c.stroke(); });
starTex.wrapS = starTex.wrapT = THREE.ClampToEdgeWrapping;

// a heap of soft puffs, flat underneath, inked like the trees
function heap(parts, x, y, z, s, n, rnd){
  for (let i = 0; i < n; i++) { const a = rnd()*Math.PI*2, d = rnd()*s*.6, r = s*(.45 + rnd()*.35);
    parts.push([new THREE.IcosahedronGeometry(1, 2), XF(x + Math.cos(a)*d, y + r*.2, z + Math.sin(a)*d*.7, r, r*.75, r)]); }
}

export function explorerCheck(t, questions){
  const w = tripWorld({title:'The Explorer Check', bg:0xf0d2b0, sky:0xfff0dc, groundCol:0x9a8ac0, hemi:.85, sunCol:0xffd6a4, sunI:.85, fogNear:60, fogFar:240,
    cam:{oy:7.4, oz:8.4, oyP:8.8, ozP:9.8, lookY:1.7}});
  w.far = 600;
  w.bounds = (x, z) => Math.hypot(x, z) < RIM - 1.2;
  w.surface = () => 'grass';
  w.spawn = [...START, Math.PI];
  let seed = 11; const rnd = () => (seed = (seed*16807) % 2147483647)/2147483647;
  const slots = [], cheerers = [];
  let floorPaint, bus, glints;
  const cloudMat = T(0xfff4ec, {emissive:0x6a5a8a, emissiveIntensity:.3}), cloudInk = new THREE.MeshBasicMaterial({color:0x6a5a8a, side:THREE.BackSide});
  inWorld(w, () => {
    storySky(w, {sun:[-9, 16, 7], clouds3d:[[60, -14, -90, 22], [-70, -20, -60, 26], [90, -8, 20, 18], [-50, -26, 70, 24], [10, -30, -140, 30], [-110, 6, -120, 20], [130, 12, -80, 18]]});
    // the cloud: a soft floor to walk on, lumpy all over, banked up in big puffs all round its edge
    const floorTex = tex(512, 512, (c, cw, ch) => { c.fillStyle = '#fff6ee'; c.fillRect(0, 0, cw, ch);
      for (let i = 0; i < 260; i++) { const x = rnd()*cw, y = rnd()*ch, r = 10 + rnd()*30; c.fillStyle = rnd() < .5 ? 'rgba(214,196,226,.28)' : 'rgba(255,226,196,.35)'; c.beginPath(); c.arc(x, y, r, 0, 7); c.fill(); } }, 3, 3);
    add(new THREE.CircleGeometry(RIM - .2, 64), T(0xffffff, {map:floorTex}), 0, 0, 0, null, false).rotation.x = -Math.PI/2;
    const parts = [];
    for (let i = 0; i < 46; i++) { const a = i/46*Math.PI*2 + rnd()*.05, r = RIM + rnd()*.6; heap(parts, Math.cos(a)*r, -.5, Math.sin(a)*r, 1.6 + rnd()*.9, 3, rnd); }
    for (let i = 0; i < 40; i++) { const a = rnd()*Math.PI*2, r = Math.sqrt(rnd())*(RIM - 2);
      if (Math.abs(Math.sin(a)*r - AZ - 1) < 2.4 || Math.hypot(Math.cos(a)*r - START[0], Math.sin(a)*r - START[1]) < 2) continue;
      heap(parts, Math.cos(a)*r, -.42, Math.sin(a)*r, .55 + rnd()*.35, 2, rnd); }
    // underneath, so the cloud has a belly seen from its edge
    for (let i = 0; i < 18; i++) { const a = rnd()*Math.PI*2, r = rnd()*(RIM - 3); heap(parts, Math.cos(a)*r, -3 - rnd()*2, Math.sin(a)*r, 3 + rnd()*1.5, 2, rnd); }
    // a hedge of puffs across the cloud, with a gap for each arch, so every answer is through an arch
    for (let x = -RIM + .6; x < RIM - .6; x += .7) { if (SLOTS.some(sx => Math.abs(x - sx) < 1.25)) continue;
      parts.push([new THREE.IcosahedronGeometry(1, 2), XF(x, .15, AZ + (rnd() - .5)*.2, .55 + rnd()*.2, .5 + rnd()*.25, .55)]); }
    // up to the pillars, which stand in the hedge's gaps
    for (const [a, b] of [[-RIM, SLOTS[0] - .8], [SLOTS[0] + .8, SLOTS[1] - .8], [SLOTS[1] + .8, SLOTS[2] - .8], [SLOTS[2] + .8, RIM]])
      w.colliders.push({minX:a, maxX:b, minZ:AZ - .5, maxZ:AZ + .5, minY:-5, maxY:99});
    meshOf(mergeGeos(parts), cloudMat, w.scene, .06, cloudInk);
    // a gold star painted where each answer starts
    const pt = new THREE.Shape(); for (let k = 0; k < 10; k++) { const r = k % 2 ? .42 : .95, a = k*Math.PI/5 + Math.PI/2; pt[k ? 'lineTo' : 'moveTo'](Math.cos(a)*r, Math.sin(a)*r); }
    add(new THREE.ShapeGeometry(pt), T(0xffd36b, {emissive:0xd9a441, emissiveIntensity:.3}), START[0], .02, START[1], null, false).rotation.x = -Math.PI/2;
    // the question, painted on a scroll on the cloud before the arches, as in the first Explorer Check
    floorPaint = canvasTex(1024, 220);
    const scroll = add(new THREE.PlaneGeometry(7.4, 1.6), T(0xffffff, {map:floorPaint.t}), 0, .03, AZ + 2.1, null, false); scroll.rotation.x = -Math.PI/2;
    for (const sx of [-1, 1]) outline(cyl(.18, .18, 1.8, T(C.woodLt), sx*3.8, .18, AZ + 2.1, null, 10), 1.08).rotation.x = Math.PI/2;
    SLOTS.forEach((sx, i) => {
      const g = grp(sx, 0, AZ), body = grp(0, 0, 0, 0, g), m = T(ARCH_COL[i], {emissive:0xffd36b, emissiveIntensity:0}).clone();
      for (const px of [-1.05, 1.05]) { outline(cyl(.22, .28, 2.4, m, px, 1.2, 0, body, 12), 1.05);
        const tuft = []; heap(tuft, px, -.1, 0, .55, 3, rnd); meshOf(mergeGeos(tuft), cloudMat, body, .04, cloudInk); }
      outline(add(new THREE.TorusGeometry(1.05, .22, 10, 24, Math.PI), m, 0, 2.4, 0, body), 1.05);
      // the picture card, sitting up on top of the arch, facing the explorer
      const card = canvasTex(320, 256), cg = grp(0, 4.4, .3, 0, body);
      add(new THREE.BoxGeometry(2.05, 1.7, .1), T(C.gold), 0, 0, -.06, cg); outline(cg.children[0], 1.03);
      add(new THREE.PlaneGeometry(1.9, 1.52), T(0xffffff, {map:card.t}), 0, 0, .001, cg, false);
      body.scale.set(1, 0, 1); body.visible = false;
      // a lumpy little cloud, like the ones it's made of; a smooth ball read as a big white ball in the arch
      const lumps = [[0, 0, 0, .85], [-.55, .2, -.05, .55], [.55, .25, -.05, .55], [-.2, .62, -.1, .48], [.3, .55, -.1, .45], [-.7, -.25, -.1, .42], [.7, -.2, -.1, .42]];
      const plug = add(mergeGeos(lumps.map(([lx, ly, lz, r]) => [new THREE.IcosahedronGeometry(1, 2), XF(lx, ly, lz, r, r*.85, r)])), T(0xb8b0d0, {emissive:0x4a3a6a, emissiveIntensity:.25}), 0, 1.15, 0, g); plug.scale.setScalar(.01); plug.visible = false; outline(plug, 1.04);
      // a grumpy little face, for a wrong answer; an arch with no answer this time is just shut
      const face = grp(0, 0, 0, 0, plug); plug.userData.face = face;
      for (const ex of [-.3, .3]) sph(.09, T(C.ink), ex, .2, .8, face, 8, false);
      add(new THREE.TorusGeometry(.2, .04, 6, 12, Math.PI), T(C.ink), 0, -.15, .82, face, false);
      slots.push({i, x:sx, g, body, mat:m, card, plug, k:0, to:0, at:0, answer:-1, shut:false, glow:0});
    });
    const sg = new THREE.SpriteMaterial({map:glowTex, transparent:true, depthWrite:false, blending:THREE.AdditiveBlending, color:0xffe8a0});
    glints = Array.from({length:24}, () => { const s = new THREE.Sprite(sg.clone()); s.visible = false; w.scene.add(s); return {s, age:9, v:new THREE.Vector3()}; });
  });
  const puff = puffs(w, 0, .2, AZ, {rate:0, rise:.5, size:.9, color:0xffffff, opacity:.8, spread:1.4, life:1.2});
  paintFloor(0, questions.length, "Dr. Sparks's Explorer Check");
  bus = tripBus(w);
  bus.gear(null); bus.root.position.set(-30, 18, -20);
  const kids = {}; for (const [id, [x, z, ry]] of Object.entries(CLASS_AT)) { kids[id] = spawnNPC(w, id, -2.6, 4.6, ry, LINES[id]); kids[id].model.root.visible = kids[id].label.visible = false; }

  // ---------- moments: arches up and down, a star, a puff, confetti ----------
  const stars = [];
  function star(x, y, z){ const s = new THREE.Sprite(new THREE.SpriteMaterial({map:starTex, transparent:true, depthWrite:false})); s.position.set(x, y, z); w.scene.add(s); stars.push({s, t0:game.elapsed, y}); }
  function burst(x, y, z, n = 14){ for (const g of glints.filter(g => g.age > 1).slice(0, n)) { g.age = 0; g.s.visible = true; g.s.position.set(x, y, z); g.v.set((Math.random() - .5)*5, 2 + Math.random()*4, (Math.random() - .5)*3); } }
  const confetti = [];
  function party(){
    const cols = [0xffd36b, 0xe0503a, 0x2f8f8a, 0x7a5ab0, 0xf2963a, 0x6fbf5a];
    for (let i = 0; i < 120; i++) { const m = new THREE.Mesh(new THREE.PlaneGeometry(.14, .22), new THREE.MeshBasicMaterial({color:cols[i % cols.length], side:THREE.DoubleSide, transparent:true}));
      m.position.set(player.x + (Math.random() - .5)*2, 1.5, player.z + (Math.random() - .5)*2); w.scene.add(m);
      confetti.push({m, v:new THREE.Vector3((Math.random() - .5)*7, 6 + Math.random()*6, (Math.random() - .5)*7), spin:new THREE.Vector3(Math.random()*8, Math.random()*8, 0), age:0}); }
    [523, 659, 784, 1046, 1319, 1568].forEach((f, k) => Sound.tone(f, {type:'triangle', t:k*.09, dur:.5, vol:.08}));
  }
  function cheer(ids = Object.keys(kids), s = 1.8){ const until = game.elapsed + s; for (const id of ids) { kids[id].pose = 'cheer'; cheerers.push([kids[id], until]); } }
  // arches rise with a bounce, one after another, and sink back into the cloud
  function raise(q, order){
    slots.forEach((s, i) => { s.answer = order[i] ?? -1; s.shut = s.answer < 0; s.glow = 0; s.mat.emissiveIntensity = 0;
      Object.assign(s.plug.userData, {grow:true, pop:s.shut ? game.elapsed : undefined}); s.plug.visible = s.shut; s.plug.userData.face.visible = false; s.plug.scale.setScalar(.01); setPlug(s, s.shut);
      if (s.answer < 0) { s.to = 0; return; }
      paintCard(s, q.answers[s.answer]); s.to = 1; s.at = game.elapsed + i*.25; s.body.visible = true; });
    Sound.tone(330, {type:'triangle', dur:.3, vol:.06, f2:660});
  }
  const lower = () => slots.forEach(s => { s.to = 0; s.at = game.elapsed; if (s.plug.visible) Object.assign(s.plug.userData, {grow:false, pop:game.elapsed}); });
  function setPlug(s, on){
    const box = s.plug.userData.box || (s.plug.userData.box = {minX:s.x - 1.3, maxX:s.x + 1.3, minZ:AZ - .5, maxZ:AZ + .5, minY:-5, maxY:99});
    const k = w.colliders.indexOf(box); if (on && k < 0) w.colliders.push(box); if (!on && k >= 0) w.colliders.splice(k, 1);
  }
  function paintCard(s, [label, draw]){
    const {c, t: ct} = s.card; c.fillStyle = '#efe0bf'; c.fillRect(0, 0, 320, 256);
    c.save(); c.translate(40, 10); c.beginPath(); rrect(c, 0, 0, 240, 170, 14); c.clip(); draw(c, 240, 170); c.restore();
    c.strokeStyle = '#1a1320'; c.lineWidth = 4; rrect(c, 40, 10, 240, 170, 14); c.stroke();
    c.fillStyle = '#1a1320'; c.font = `900 ${label.length > 22 ? 27 : 33}px Nunito, sans-serif`; c.textAlign = 'center'; c.textBaseline = 'middle'; wrap(c, label, 160, 218, 304, 30);
    ct.needsUpdate = true;
  }
  function paintFloor(n, of, text, secret){
    const {c, t: ft} = floorPaint;
    c.fillStyle = '#efe0bf'; c.fillRect(0, 0, 1024, 220); c.strokeStyle = '#d9a441'; c.lineWidth = 12; c.strokeRect(8, 8, 1008, 204);
    c.fillStyle = '#6d3b5e'; c.font = '900 26px Nunito, sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; if (n) c.fillText(`QUESTION ${n} OF ${of}${secret ? '   ✦ FROM A SECRET YOU FOUND ✦' : ''}`, 512, 42);
    c.fillStyle = '#1a1320'; c.font = `${text.length > 60 ? 46 : 54}px Caprasimo, Georgia, serif`; wrap(c, text, 512, 132, 920, 56); ft.needsUpdate = true;
  }
  // the explorer, lifted along in a hop; resolves on landing
  function hopTo(x, z, s, h){ const x0 = player.x, z0 = player.z;
    return t.tween(s, k => { const e = ease(k); player.x = x0 + (x - x0)*e; player.z = z0 + (z - z0)*e; player.y = Math.sin(k*Math.PI)*h; player.vy = 0;
      player.angle = Math.PI; hero.root.position.set(player.x, player.y, player.z); }); }

  let through = -1, prevZ = START[1], quit = false;
  w.anims.push((dt, tt) => {
    if (!game.cutscene && prevZ > AZ && player.z <= AZ) { const s = slots.find(s => Math.abs(player.x - s.x) < OPEN && s.k > .9 && !s.shut); if (s) through = s.i; }
    prevZ = player.z;
    for (const s of slots) {
      const p = clamp01((tt - s.at)/.55), k = s.to ? 1 + 1.7*Math.pow(p - 1, 3) + .7*Math.pow(p - 1, 2) : 1 - ease(clamp01((tt - s.at)/.35));
      if (s.to && p === 0) continue;
      s.k = s.to ? k : Math.min(s.k, k); s.body.scale.y = Math.max(.001, s.k); s.body.visible = s.k > .01;
      if (s.to && !s.rose && p > 0) { s.rose = true; puff.x = s.g.position.x; puff.burst = .25; }
      if (!s.to) s.rose = false;
      s.mat.emissiveIntensity = s.glow*(.55 + Math.sin(tt*7)*.25);
      const pop = s.plug.userData.pop;
      if (pop !== undefined) { const e = clamp01((tt - pop)/.4); s.plug.scale.setScalar(Math.max(.01, s.plug.userData.grow ? (e < .7 ? e/.7*1.15 : 1.15 - (e - .7)/.3*.15) : 1 - e));
        if (e >= 1) { if (!s.plug.userData.grow) s.plug.visible = false; s.plug.userData.pop = undefined; } }
      if (s.plug.visible) s.plug.position.y = 1.15 + Math.sin(tt*2 + s.i)*.06;
    }
    for (const g of glints) { if (g.age > 1) { g.s.visible = false; continue; } g.age += dt; g.v.y -= 6*dt; g.s.position.addScaledVector(g.v, dt); g.s.scale.setScalar(.6*(1 - g.age)); g.s.material.opacity = 1 - g.age; }
    for (let i = stars.length - 1; i >= 0; i--) { const st = stars[i], e = tt - st.t0;
      st.s.position.y = st.y + ease(clamp01(e/.8))*1.4; st.s.material.rotation = Math.sin(e*5)*.3; st.s.scale.setScalar(e < .25 ? e/.25*1.3 : 1.3 - Math.min(.3, (e - .25))); st.s.material.opacity = clamp01(2.2 - e);
      if (e > 2.2) { w.scene.remove(st.s); stars.splice(i, 1); } }
    for (let i = confetti.length - 1; i >= 0; i--) { const f = confetti[i]; f.age += dt; f.v.y -= 9*dt; f.v.multiplyScalar(1 - dt*1.2); f.m.position.addScaledVector(f.v, dt);
      if (f.m.position.y < .05) { f.m.position.y = .05; f.v.set(0, 0, 0); }
      f.m.rotation.x += f.spin.x*dt; f.m.rotation.y += f.spin.y*dt; f.m.material.opacity = clamp01(5 - f.age);
      if (f.age > 5) { w.scene.remove(f.m); confetti.splice(i, 1); } }
    for (let i = cheerers.length - 1; i >= 0; i--) if (tt > cheerers[i][1]) { cheerers[i][0].pose = null; cheerers.splice(i, 1); }
  });

  // ---------- the check itself ----------
  return (async () => {
    // the bus swoops down onto the cloud, and everybody tumbles out
    t.watch(w, (pos, look) => { pos.set(5.5, 5.2, 13.5); look.set(-3.5, 1.2, 2); });
    await bus.fly([[-30, 18, -20], [-18, 10, -10], [-9, 2.8, 0], [BUS[0], .2, BUS[1]]], 3.2);
    bus.park(BUS[0], 0, BUS[1], BUS[2]); puff.x = BUS[0]; puff.burst = .4;
    Sound.tone(196, {dur:.2, vol:.1, f2:120});
    for (const [id, [x, z, ry]] of Object.entries(CLASS_AT)) { const k = kids[id], [dx, dz] = bus.door(.5);
      k.x = dx; k.z = dz; k.model.root.position.set(dx, 0, dz); k.model.root.visible = k.label.visible = true; k.goal = {x, z, run:true, angle:ry};
      await t.wait(.25); }
    const exit = addUsable(w, {name:'Wonder Bus', x:bus.door(.7)[0], z:bus.door(.7)[1], range:1.4, verb:'Fly home on the Wonder Bus', short:'Fly home', glow:[bus.door(.2)[0], 2.6, bus.door(.2)[1]], action: () => { quit = true; }});
    await t.say([['pip', "Whoa! We're parked on a CLOUD!"], ['basil', "Is it… safe to stand on?"],
                 ['sparks', "On the Wonder Bus's own cloud? Perfectly safe, Basil! It's extra fluffy."]]);
    t.play(w, [...START, Math.PI]);
    game.cutscene = true; game.cutCam = null;
    await t.say([['sparks', "Welcome to my Explorer Check, {name}! The class has questions for you."],
                 ['sparks', "Arches will pop up, each with an answer on top. Walk through the arch you think is right!"],
                 ['juniper', "Every right answer on the first try gets a star!"]]);
    let got = 0;
    for (let n = 0; n < questions.length && !quit; n++) {
      const q = questions[n], order = q.answers.map((a, i) => i).sort(() => Math.random() - .5);
      // with two answers, the middle arch stays shut and they stand either side
      if (order.length === 2) order.splice(1, 0, undefined);
      t.goal(`Explorer Check  ${'★'.repeat(got)}${'☆'.repeat(questions.length - got)}`);
      paintFloor(n + 1, questions.length, q.q, q.secret);
      raise(q, order);
      await t.say([[q.who, q.q]]);
      let missed = false;
      for (;;) {
        through = -1; prevZ = player.z; game.cutscene = false;
        await t.until(() => through >= 0 || quit);
        game.cutscene = true;
        if (quit) break;
        const s = slots[through];
        if (s.answer === 0) {
          if (!missed) got++;
          s.glow = 1; burst(s.x, 2.6, AZ); star(s.x, 3.4, AZ + .4); cheer(); game.camShake = .6;
          [659, 880, 1175].forEach((f, k) => Sound.tone(f, {type:'triangle', t:k*.06, dur:.25, vol:.09}));
          t.goal(`Explorer Check  ${'★'.repeat(got)}${'☆'.repeat(questions.length - got)}`);
          await t.say([[q.who, missed ? `You got it! ${q.yay}` : `First try! ${q.yay}`]]);
          lower(); puff.x = 0; puff.burst = .3;
          await hopTo(...START, 1.1, 1.2);
          break;
        }
        // that arch puffs shut, and its little cloud bounces the explorer back for another go
        missed = true; s.shut = true; s.plug.visible = true; s.plug.userData.face.visible = true; s.plug.userData.grow = true; s.plug.userData.pop = game.elapsed; setPlug(s, true);
        game.camShake = 1.5; Sound.tone(520, {type:'square', dur:.2, vol:.05, f2:260, cut:1600}); Sound.tone(150, {dur:.3, vol:.12, f2:90});
        await hopTo(player.x, AZ + 3, .5, .7);
        await t.say([['sparks', `Hmm, not quite! ${q.hint}`], ['sparks', "Try another arch!"]]);
      }
    }
    exit.when = () => false;
    lower();
    const of = questions.length, count = `${got} ${got === 1 ? 'star' : 'stars'}`;
    if (!quit) {
      t.goal(`Explorer Check  ${'★'.repeat(got)}${'☆'.repeat(of - got)}`); paintFloor(0, of, `${count} out of ${of}!`);
      if (got === of) { party(); cheer(undefined, 4);
        await t.say([['sparks', `${of} stars out of ${of}! A perfect Explorer Check, {name}!`], ['juniper', "Every single one! I'm giving you a gold star in my notebook."],
                     ['basil', "And every 'I wonder' on my list, answered. Thanks, {name}."]]); }
      else if (got >= of - 2) { cheer(undefined, 2.5);
        await t.say([['sparks', `${count} out of ${of}! Wonderful exploring, {name}!`], ['mo', "That's almost all of them! Snack to celebrate?"]]); }
      else await t.say([['sparks', `${count}, {name}! And you found every answer in the end. That's what explorers do!`],
                        ['sparks', "Want more stars? Come try my Explorer Check again any time. Just hop on the Wonder Bus!"]]);
      await t.say([['sparks', "All aboard, class! Home to Lantern Hill!"]]);
      game.cutscene = false; await bus.boarding(t);
      game.cutscene = true; await heroHopIn(bus.door(-.2));
    }
    else await t.say([['sparks', "Maybe later? Any time, {name}! Just ask me at the Wonder Bus."]]);
    t.goal('');
    return got;
  })();
}

const LINES = {
  sparks:["Walk through the arch with the right answer, {name}!", "Stuck? There's always a hint, and another go."],
  pip:["I sat in the window seat the whole way. Best view!"], juniper:["I'm keeping score in my notebook."],
  basil:["I'm standing very still. Clouds are bouncy."], mo:["Do you think clouds taste like marshmallows?"],
};
