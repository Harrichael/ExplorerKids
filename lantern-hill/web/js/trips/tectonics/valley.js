// The valley where plates crash and slide. To the west, snowy peaks and a cliff of rock layers bent
// into folds, pushed up where two plates crash. To the east, a road and a fence cross a fault, where
// two plates grind past each other; stuck, they bend, until they snap and the ground shakes.

import * as THREE from 'three';
import { C, T, XF, add, bFlush, box, clamp01, ease, fr, frand, glowTex, grp, leafCloud, mergeGeos, meshOf, outline, sph, tex } from '../../core/kit.js';
import { Sound } from '../../core/sound.js';
import { inWorld } from '../../core/world.js';
import { grassTex } from '../../hq/ground.js';
import { dirtMat, flower, grassTuft, ribbonGeo } from '../../hq/wider.js';
import { coarse } from '../../input.js';
import { player } from '../../player.js';
import { game } from '../../state.js';
import { tripBus } from '../bus.js';
import { classmates } from '../class.js';
import { goggles } from '../goggles.js';
import { tripWorld } from '../stop-kit.js';
import { worries } from './worries.js';

// the fault runs north to south at FX; everything east of it rides the other plate
const FX = 5, ROAD_Z = 2, FENCE_Z = 4.6;
const HILL = [-10.6, -3.6], HILL_R = 3.6, HILL_H = 1.8;
const RUG = [-7.4, -3.1], CLIFF_Z = -6.8;
const BUS = [10.6, -1.6], BUS_RY = Math.PI/2;
const ROCK = [1.6, -3.4];
// the time goggles' cutaway sits south of the valley, behind the camera, where walking never sees it
const CUT = [0, 0, 48];

export function buildValley(t){
  const w = tripWorld({title:'Where Plates Meet', bg:0xd2e2e8, sky:0xfff0dc, groundCol:0x4a5a3a, hemi:.8, sunCol:0xffd6a4, sunI:.9, fogNear:90, fogFar:300,
    cam:{oy:7.4, oz:9.2, oyP:9.4, ozP:10.6}});
  w.far = 400;
  const hillAt = (x, z) => { const s = Math.hypot(x - HILL[0], z - HILL[1])/HILL_R; return s < 1 ? HILL_H*(1 - s*s)*(1 - s*s) : 0; };
  w.ground = hillAt;
  w.bounds = (x, z) => x > -13.6 && x < 13.6 && z < 7.6 && z > (x < -2.6 ? CLIFF_Z + .7 : -7.2);
  w.surface = (x, z) => Math.abs(z - ROAD_Z) < .6 && x > -12 ? 'stone' : 'grass';
  w.area = x => x < FX - 1 ? 'The Crumpled Mountains' : 'The Fault Line';
  w.spawn = [8.6, 0, Math.PI];
  const S = {slip:.7, bend:0, rugP:0, rugTo:0, snack:null};
  let rug, rugBase, fossil, snack;
  const roadSegs = [], posts = [], rails = [];
  inWorld(w, () => {
    const floor = add(new THREE.PlaneGeometry(160, 120), T(0xffffff, {map:grassTex}), 0, 0, -10, null, false); floor.rotation.x = -Math.PI/2;
    floor.material.map = grassTex.clone(); floor.material.map.repeat.set(20, 15); floor.material.map.needsUpdate = true;
    // the high spot, a grassy knoll whose shape is the ground function's
    const prof = []; for (let i = 0; i <= 12; i++) { const r = Math.max(.001, i/12*HILL_R); prof.push(new THREE.Vector2(r, hillAt(HILL[0] + r, HILL[1]) + .02)); }
    // it would cast a shadow as big as itself over the flat meadow, so only receives one
    add(new THREE.LatheGeometry(prof, 28), T(0x5a8a4a), HILL[0], 0, HILL[1], null, false);
    // snowy peaks all round the north, tallest behind the folded cliff
    for (let i = 0; i < 9; i++) { const a = Math.PI*.05 + i/8*Math.PI*.9, r = 36 + (i % 3)*8, x = -Math.cos(a)*r*1.3, z = -Math.sin(a)*r - 6, h = (x < 0 ? 26 : 17) + (i % 3)*5, n = 5 + i % 2, g = grp(x, 0, z, i);
      outline(add(new THREE.ConeGeometry(h*.85, h, n), T([0x2a5674, 0x346680, 0x22496a][i % 3]), 0, h/2, 0, g), 1.02);
      outline(add(new THREE.ConeGeometry(h*.85*.42*1.05, h*.42, n), T(0xf6f2ec), 0, h*.79, 0, g, false), 1.03); }
    // the cliff: rock layers bent into waves, the way a pushed rug bunches up
    const strata = tex(1024, 256, (c, cw, ch) => { const cols = ['#8a5a3a', '#c89a6a', '#6b4a3a', '#d8b888', '#7a5a4a', '#a87a52'];
      for (let b = -2; b < 9; b++) { c.fillStyle = cols[(b + 6) % 6]; c.beginPath(); c.moveTo(0, ch);
        for (let x = 0; x <= cw; x += 8) c.lineTo(x, b*30 + 40 + Math.sin(x/90)*38 + Math.sin(x/37)*6); c.lineTo(cw, ch); c.closePath(); c.fill(); } }, 1, 1);
    const cliff = add(new THREE.PlaneGeometry(11, 4.6), T(0xffffff, {map:strata}), -8.6, 2.3, CLIFF_Z, null, false);
    box(11.2, .5, 2.4, T(0x5a8a4a), -8.6, 4.5, CLIFF_Z - 1.1, null, false);
    // a rounded grassy cap along the top, and stacked rock buttresses at the ends
    const cap = [];
    for (let x = -13.8; x <= -3.4; x += .85) { const r = fr(.6, .85); cap.push([x, 4.75, CLIFF_Z - .5, r, 1], [x + .4, 4.7, CLIFF_Z - 1.6, r*.9, 0]); if (frand() < .5) cap.push([x + .2, 5.25, CLIFF_Z - 1, r*.7, 2]); }
    leafCloud(w.scene, cap, .05);
    const butt = [];
    for (const bx of [-14.1, -3.1]) for (let k = 0; k < 3; k++) butt.push([new THREE.SphereGeometry(1, 9, 7), XF(bx, .9 + k*1.45, CLIFF_Z - .9 + fr(-.1, .1), .55 - k*.06, .95, 1.35, 0, fr(0, 6), 0)]);
    meshOf(mergeGeos(butt), 0x6b4a3a, w.scene, .05);
    // the picnic rug: a cloth with enough folds in it to crumple
    const check = tex(128, 128, (c, cw, ch) => { c.fillStyle = '#efe0bf'; c.fillRect(0, 0, cw, ch); c.fillStyle = '#c0483a'; for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) if ((x + y) % 2) c.fillRect(x*16, y*16, 16, 16); }, 2, 1);
    rug = add(new THREE.PlaneGeometry(2.6, 1.6, 48, 1), T(0xffffff, {map:check, side:THREE.DoubleSide}), RUG[0], .03, RUG[1], null, false); rug.rotation.x = -Math.PI/2;
    rugBase = Float32Array.from(rug.geometry.attributes.position.array);
    // the fault: a jagged crack in the grass, north to south across the whole valley
    for (let z = -7, k = 0; z < 7.6; z += .5, k++) box(.22, .06, .54, T(0x2a1e1a), FX + Math.sin(k*1.7)*.08, .02, z + .25, null, false);
    for (let x = -12.5; x < 13.6; x += .5) {
      const seg = grp(x + .25, 0, ROAD_Z); box(.52, .05, 1.2, T(0x5a5a66), 0, .025, 0, seg, false); if (Math.round(x*2) % 3 === 0) box(.3, .06, .08, T(C.cream), 0, .03, 0, seg, false);
      roadSegs.push({g:seg, x:x + .25}); }
    // the road runs on out of the valley both ways, in one long piece each, since only near the fault does it bend
    for (const [x0, x1] of [[-80, -12.5], [14, 80]]) { const L = x1 - x0, g = grp((x0 + x1)/2, 0, ROAD_Z), dash = [];
      meshOf(mergeGeos([[new THREE.BoxGeometry(L, .05, 1.2), XF(0, .025, 0)]]), 0x5a5a66, g);
      for (let x = -L/2 + .75; x < L/2; x += 1.5) dash.push([new THREE.BoxGeometry(.3, .06, .08), XF(x, .03, 0)]);
      meshOf(mergeGeos(dash), C.cream, g); g.traverse(m => { m.castShadow = false; });
      roadSegs.push({g, x:(x0 + x1)/2}); }
    // each post and rail a group, so the ink outline moves and stretches along with it
    const inked = (wd, h, d, y) => { const g = grp(0, y, FENCE_Z); meshOf(new THREE.BoxGeometry(wd, h, d), C.cream, g, .018); return g; };
    for (let x = 1; x <= 9.6; x += .6) { const m = inked(.09, .7, .09, .35); m.position.x = x; posts.push({m, x}); }
    for (let i = 0; i < posts.length - 1; i++) rails.push([inked(1, .06, .05, .58), inked(1, .06, .05, .3)]);
    const seat = box(.9, .5, .7, T(0x7a6a62), ROCK[0], .25, ROCK[1] - .55); seat.rotation.y = .3; outline(seat, 1.06);
    snack = box(.22, .06, .1, T(0xd9a441), ROCK[0] + .45, .53, ROCK[1] - .5);
    fossil = sph(.16, T(0xf3e6c8), HILL[0] + .6, HILL_H + .08, HILL[1] - .2, null, 10); fossil.scale.set(1, .4, .9); outline(fossil, 1.12);
    for (let k = 0; k < 4; k++) box(.02, .03, .3, T(0xb89a72), HILL[0] + .54 + k*.05 - .07, HILL_H + .14, HILL[1] - .2, null, false).rotation.y = (k - 1.5)*.4;
    // a dirt path in from the south, over the road and round to the bus door
    const path = ribbonGeo([[12.8, 44], [13.6, 26], [11.4, 15], [12.4, 9.6], [10.8, 5.8], [9.2, 3.4], [8.3, 1.2], [8.4, -1.4], [8.9, -3]], 1.1, .035, false, 90);
    const pm = new THREE.Mesh(path.geo, dirtMat); pm.receiveShadow = true; w.scene.add(pm);
    const nearPath = (x, z, r) => path.pts.some(p => (p.x - x)**2 + (p.z - z)**2 < r*r);
    // bushes all round the meadow, leaving the road and the path open
    const ring = [];
    for (let x = -13; x <= 14; x += fr(3, 4.2)) ring.push([x, fr(9.6, 11)]);
    for (let z = -8; z <= 9; z += fr(2.8, 3.8)) ring.push([fr(15.4, 16.6), z], [fr(-16.6, -15.4), z]);
    for (let x = -1.6; x <= 14; x += fr(3, 4)) ring.push([x, fr(-8.8, -9.8)]);
    const bush = [];
    for (const [x, z] of ring) { if (Math.abs(z - ROAD_Z) < 2 || nearPath(x, z, 2.4) || (x < -2.6 && z < CLIFF_Z)) continue; const s = fr(.8, 1.3), n = 3 + Math.floor(frand()*3);
      bush.push([x, .55*s, z, .85*s, 1], [x + fr(-.2, .2)*s, 1.05*s, z, .55*s, 2]);
      for (let k = 0; k < n; k++) { const a = k/n*Math.PI*2 + fr(0, 1); bush.push([x + Math.cos(a)*.9*s, .4*s, z + Math.sin(a)*.7*s, fr(.5, .68)*s, Math.sin(a) < 0 ? 0 : 1]); } }
    leafCloud(w.scene, bush);
    // flowers and tall grass at mixed sizes, thick by the bushes and sparse out in the open
    const clear = (x, z) => Math.abs(z - ROAD_Z) < 1 || nearPath(x, z, .9) || Math.abs(x - FX) < .5 || Math.hypot(x - RUG[0], z - RUG[1]) < 2 || Math.hypot(x - HILL[0], z - HILL[1]) < HILL_R
      || Math.hypot(x - ROCK[0], z - ROCK[1]) < 1.6 || Math.hypot(x - BUS[0], z - BUS[1]) < 4 || (x > .6 && x < 10.4 && Math.abs(z - FENCE_Z - 1) < 1.4) || (x < -2.6 && z < CLIFF_Z + .4);
    for (const [x, z] of ring) for (let k = 0; k < 7; k++) { const fx = x + fr(-2, 2), fz = z + fr(-1.8, 1.8); if (!clear(fx, fz)) frand() < .5 ? flower(fx, fz, 0, fr(1.4, 2.2)) : grassTuft(fx, fz, 0, fr(1.3, 1.9)); }
    for (let i = 0; i < 140; i++) { const x = fr(-13.4, 13.4), z = fr(-7, 8); if (!clear(x, z)) frand() < .4 ? flower(x, z, 0, fr(1.1, 1.8)) : grassTuft(x, z, 0, fr(1.1, 1.6)); }
    bFlush(w.scene);
  });
  // where something sits along the fault: the ground east of it has slipped and is bending
  const disp = x => (x > FX ? S.slip : 0) + S.bend*(.5 + .5*Math.tanh((x - FX)/1.3));
  function settle(){
    for (const r of roadSegs) r.g.position.z = ROAD_Z + disp(r.x);
    posts.forEach(p => { p.m.position.z = FENCE_Z + disp(p.x); });
    rails.forEach(([a, b], i) => { const p = posts[i].m.position, q = posts[i + 1].m.position, dx = q.x - p.x, dz = q.z - p.z, L = Math.hypot(dx, dz);
      for (const r of [a, b]) { r.position.x = (p.x + q.x)/2; r.position.z = (p.z + q.z)/2; r.scale.x = L; r.rotation.y = -Math.atan2(dz, dx); } });
  }
  settle();
  const crash = buildCutaway(w);
  const bus = tripBus(w);
  const door = () => bus.door(.6);
  const cls = classmates(w, t, [BUS[0] - 1.6, BUS[1] - 1.6]);
  const say = t.say;
  let snap = null, snackHop = null;
  // the shell on the hilltop catches the light once Pip has spotted it
  const glint = new THREE.Sprite(new THREE.SpriteMaterial({map:glowTex, color:0xfff6d0, transparent:true, depthWrite:false, blending:THREE.AdditiveBlending, opacity:0}));
  glint.scale.set(1.4, 1.4, 1); glint.position.copy(fossil.position).y += .25; w.scene.add(glint);
  let glinting = false;
  w.anims.push((dt, tt) => {
    if (S.rugP < S.rugTo) { S.rugP = Math.min(S.rugTo, S.rugP + dt/1.6);
      const p = ease(S.rugP), pa = rug.geometry.attributes.position;
      for (let i = 0; i < pa.count; i++) { const u = (rugBase[i*3] + 1.3)/2.6;
        pa.setX(i, -1.3 + u*2.6*(1 - .38*p)); pa.setZ(i, p*.22*Math.sin(u*Math.PI*3)**2*Math.min(1, u*6)); }
      pa.needsUpdate = true; rug.geometry.computeVertexNormals(); }
    if (snap) { const e = ease(clamp01((tt - snap.t0)/.25)); S.bend = snap.b*(1 - e); S.slip = snap.s + snap.b*e; settle(); if (e >= 1) snap = null; }
    glint.material.opacity = glinting ? .3 + .7*Math.abs(Math.sin(tt*2.5)) : 0; glint.material.rotation = tt;
    if (snackHop) { const k = clamp01((tt - snackHop)/2); snack.position.set(ROCK[0] + .45 + k*2.2, .53*(1 - k) + .03 + Math.abs(Math.sin(k*Math.PI*4))*.4*(1 - k), ROCK[1] - .5 + k*.8); snack.rotation.y = k*9; }
  });
  const wide = (pos, look) => { pos.set(0, 15, 22); look.set(-1.5, 0, -1.5); };
  const rumble = async n => { for (let k = 0; k < n; k++) { game.camShake = 4; Sound.hiss({dur:.7, vol:.2, type:'lowpass', freq:180}); Sound.tone(46, {dur:.8, vol:.2, f2:30}); await t.wait(.42); } };

  // ---------- what the class finds ----------
  let crumpled = false;
  cls.find('juniper', {at:[RUG[0] + 1.6, RUG[1] - .9, -2.2], pose:'point', core:true, call:"Come look at this cliff!", after:["Squish the ground hard enough, and you get mountains!"],
    async scene(){
      await say([['juniper', "Look at the cliff, {name}! Stripy rock, all bent and wavy."]]);
      const pick = await t.ask('juniper', "What will the rug do if you push one end?", ["Bunch up into bumps", "Stay flat", "Rip in half"]);
      await say([['juniper', "Let's find out! Push the end of the rug."]]);
      for (let i = 1; i <= 3; i++) {
        // the rug's far end, which moves in as it bunches up
        const x = RUG[0] + 1.3 - .99*S.rugTo + .45;
        await t.free(t.use(w, {name:'Rug', x, z:RUG[1], range:1.4, verb:'Push the rug', short:'Push', glow:[x - .3, .5, RUG[1]]}), 'Push the end of the rug');
        S.rugTo = i/3; Sound.hiss({dur:.6, vol:.08, type:'bandpass', freq:500 + i*80, q:.8});
        await t.wait(.8);
      }
      await say([['juniper', pick === 0 ? "You got it! It bunched up into bumps." : "Look! It bunched up into bumps."],
                 ['juniper', "The rock in the cliff got pushed the same way, so it bent."],
                 ['juniper', "When plates crash, the ground crumples up. Big crumples are mountains!"]]);
      t.cut(null);
    }});
  cls.find('pip', {at:[-3.4, -4.4, Math.PI], pose:'peer', core:true, call:"These mountains are HUGE! Come see!", after:["Up, up, up. A few millimeters every year."],
    async scene(){
      await say([['pip', "Look how tall these mountains are, {name}!"], ['pip', "Two plates are crashing right here. Very, very slowly."]]);
      const pick = await t.ask('pip', "If two plates keep crashing, what happens to the land between?", ["It crumples up into mountains", "It sinks away", "Nothing happens"]);
      await say([['sparks', "Let's see! Time goggles on, {name}."]]);
      await goggles(t, {shot:crash.shot, years:4e7, dur:7, step:crash.step});
      await say([['pip', pick === 0 ? "You were right! It crumpled up into a mountain!" : "Whoa! It didn't do that. It crumpled up into a mountain!"],
                 ['pip', "And see the blue layer with the shells? It went all the way to the top!"],
                 ['pip', "Hey! Something's glinting up on that hill!"]]);
      crumpled = glinting = true;
      const k = cls.n.pip; k.pose = null;
      k.goal = {x:HILL[0] + 1, z:HILL[1] + .4, angle:-2.2, run:true, then: () => { k.pose = 'crouch'; k.spotted = game.elapsed + 1; }};
    }});
  cls.find('pip', {at:[HILL[0] + 1, HILL[1] + .4, -2.2], pose:'crouch', core:true, when: () => crumpled, call:"Up here! Something's glinting!", after:["A seashell on a mountain. Wait till I tell everyone!"],
    async scene(){
      await say([['pip', "It's right here somewhere, {name}. Can you dig it out?"]]);
      const [fx, , fz] = fossil.position.toArray();
      await t.free(t.use(w, {name:'Glinting thing', x:fx, z:fz, y:w.ground(fx, fz), range:1.3, verb:'Dig out the glinting thing', short:'Dig', glow:[fx, HILL_H + .5, fz]}),
        'Find the glinting thing on the hill');
      glinting = false;
      t.cut((pos, look) => { pos.set(HILL[0] - 2.4, HILL_H + 2.6, HILL[1] + 3.6); look.set(HILL[0] + .6, HILL_H, HILL[1] - .2); });
      fossil.position.y = HILL_H + .5; Sound.tone(880, {type:'triangle', dur:.2, vol:.07}); Sound.tone(1318, {type:'triangle', t:.12, dur:.4, vol:.06});
      await say([['pip', "A seashell! Made of stone. Way up on a mountain!"],
                 ['pip', "Remember the time goggles? The shell layer went all the way up."],
                 ['pip', "This mountain top was once the sea floor!"]]);
      t.cut(null);
    }});
  cls.find('theo', {at:[FX - 1.1, ROAD_Z + .9, 1.9], core:true, call:"Somebody broke the road!", after:["My knees are still wobbly."],
    async scene(){
      await say([['theo', "Somebody broke the road, {name}! The two sides don't line up."],
                 ['sparks', "Nobody broke it, Theo. That crack is where two plates slide past each other."],
                 ['sparks', "But they get stuck. Push the fence and see what happens."]]);
      const guess = await t.ask('theo', "What happens if we keep pushing the plates?", ["It bends, then snaps all at once", "It slides smoothly", "Nothing happens"]);
      await say([['theo', "You push it, {name}. I'll watch from here."]]);
      for (let i = 1; i <= 4; i++) {
        await t.free(t.use(w, {name:'Fence', x:FX + .3, z:FENCE_Z - .7, verb:'Push the fence', short:'Push', glow:[FX + .3, 1, FENCE_Z]}), 'Push the fence');
        if (i === 4) break;
        const b0 = S.bend; Sound.tone(150 - i*15, {type:'sawtooth', dur:.5, vol:.05, f2:110, cut:700}); Sound.hiss({dur:.4, vol:.05, type:'bandpass', freq:300});
        await t.tween(.55, k => { S.bend = b0 + .32*k; settle(); });
        await say([['theo', ["It's bending! Push again!", "It's bending more! Again!", "It's REALLY bent. One more?"][i - 1]]]);
      }
      // it gives all at once: the quake. Everyone drops and covers but Theo, who freezes.
      snap = {t0:game.elapsed, b:S.bend, s:S.slip};
      const poses = {}; for (const id in cls.n) { poses[id] = cls.n[id].pose; cls.n[id].pose = id === 'theo' ? null : 'cover'; }
      const near = (pos, look) => { pos.set(player.x + 1.2, 3.4, player.z + 5.2); look.set(player.x - .4, .6, player.z - .6); };
      t.cut(near);
      await rumble(1);
      // the shaking holds still while the explorer does the right thing, with a nudge if they don't
      let covered = false; const nudge = game.elapsed + 6;
      const cover = t.free(t.use(w, {name:'Drop, cover, hold on', x:player.x, z:player.z, range:5, verb:'Drop, cover, hold on!', short:'Drop, cover, hold on!', glow:[player.x, 2.2, player.z], big:true}),
        'The ground is shaking! What do you do?').then(() => { covered = true; });
      await t.until(() => covered || game.elapsed > nudge);
      if (!covered) await say([['theo', "{name}! What do we do?!"], ['sparks', coarse ? "Drop, cover, and hold on! Tap the big button!" : "Drop, cover, and hold on! Press E!"]]);
      await cover;
      t.cut(near); player.pose = 'cover'; t.onEnd(() => { player.pose = null; });
      Sound.tone(392, {type:'triangle', dur:.15, vol:.07});
      await t.wait(.9);
      cls.n.theo.pose = 'cover';
      await say([['theo', "Drop, cover, hold on. Like {name}!"]]);
      snackHop = game.elapsed;
      await rumble(5);
      await t.wait(.8);
      for (const id in cls.n) cls.n[id].pose = poses[id];
      player.pose = null;
      t.cut((pos, look) => { pos.set(FX + .4, 4.2, FENCE_Z + 5.4); look.set(FX, .3, FENCE_Z); });
      await say([['theo', guess === 0 ? "You were right. It bent and bent, then SNAPPED!" : "It didn't slide. It bent and bent, then SNAPPED!"],
                 ['mo', "Hey! My snack!"],
                 ['sparks', "Stuck plates bend, then snap free. That jolt is an earthquake."],
                 ['sparks', "And everyone did just right: drop, cover, and hold on!"],
                 ['theo', "I froze. But then I copied you, {name}."]]);
      worries(3);
      await say([['theo', "The ground shakes, but now I know what to do!"]]);
      t.cut(null);
    }});
  cls.find('mo', {at:[ROCK[0] - .1, ROCK[1] - .05, 0], pose:'sit', call:"Picnic time! Over here!", after:["Mountains on one side, snacks on the other. Perfect."],
    async scene(){
      await say([['mo', "This rock is the perfect snack spot, {name}."]]);
      const pick = await t.ask('mo', "Want half my granola bar?", ["Yes, please!", "No, thank you"]);
      await say([['mo', pick === 0 ? "Here you go. It's crunchy, like the mountains!" : "More for me! Crunchy, like the mountains."]]);
    }});
  cls.hint = () => {
    if (!cls.found.size) return "Juniper, Pip and Theo have all found something. Go see!";
    if (crumpled && cls.done(2) && !cls.done(3)) return "Pip ran up the hill. Something is up there!";
    return cls.done(4) ? "Back to the bus, {name}! Time to head home." : "Keep looking, {name}! Somebody is still waving you over.";
  };

  return {world:w, bus, cls,
    // in over the peaks from the north, round the valley, and down by the road
    async arrive(){
      bus.gear(null);
      t.watch(w, (pos, look) => { pos.set(bus.root.position.x*.4 + 4, Math.max(5, bus.root.position.y*.5 + 6), bus.root.position.z*.3 + 24); look.copy(bus.root.position); });
      Sound.tone(200, {type:'sawtooth', dur:4, vol:.03, f2:420, cut:900});
      await bus.fly([[-30, 34, -90], [-8, 24, -40], [4, 14, -14], [16, 8, 8], [BUS[0] + 1, 2.4, 9], [BUS[0], .8, 4], [BUS[0], 0, BUS[1]]], 7.5);
      bus.park(BUS[0], 0, BUS[1], BUS_RY);
      Sound.tone(330, {type:'triangle', dur:.12, vol:.08}); Sound.tone(494, {type:'triangle', t:.1, dur:.18, vol:.08});
      const [dx, dz] = door();
      t.cut(wide);
      cls.arrive({sparks:[dx - .8, dz + .9, -Math.PI*.7]});
      await t.wait(2.8);
      await say([['sparks', "Mountains that way, a cracked road this way. Two plates meet in this valley!"]]);
      t.play(w, [dx - .2, dz + .4, Math.PI*1.5]);
      t.goal('Visit anyone who waves!');
    },
    async explore(){
      await t.until(() => cls.done(4) && !game.cutscene);
      await t.wait(.6);
      await say([['sparks', "Crashing plates push up mountains. Stuck plates snap and shake the ground."],
                 ['sparks', "That's why the ground shakes, {name}. And that's how mountains grow!"]]);
      cls.gather([bus.root.position.x - 2, bus.root.position.z + 1.2, Math.PI/2]);
      await bus.boarding(t);
    },
    // up and away over the peaks, into the sunset
    async depart(){
      for (const id in cls.n) { cls.n[id].model.root.visible = false; cls.n[id].label.visible = false; }
      t.watch(w, (pos, look) => { pos.set(14, 6, 16); look.copy(bus.root.position); });
      Sound.hiss({dur:3, vol:.1, type:'bandpass', freq:900, q:.6});
      const sky0 = w.scene.background.clone(), sunset = new THREE.Color(0xf2a07a);
      const glow = t.tween(4, k => { w.scene.background.copy(sky0).lerp(sunset, k); w.scene.fog.color.copy(w.scene.background); });
      await bus.fly([[BUS[0], 0, BUS[1]], [BUS[0], 3, -6], [4, 10, -22], [-14, 22, -50], [-40, 36, -90]], 4.4, {roll:.6});
      await glow;
    },
  };
}

// A side-on slice through the land between two crashing plates, for the time goggles: rock layers
// with a sea floor full of shells on top, squeezed from both sides until they fold up into a peak.
function buildCutaway(w){
  const g = new THREE.Group(); g.position.set(...CUT); w.scene.add(g);
  const N = 70, X0 = -7, X1 = 7;
  const back = new THREE.Mesh(new THREE.PlaneGeometry(22, 12), new THREE.MeshBasicMaterial({color:0xc8d4f0})); back.position.set(0, 2, -.4); g.add(back);
  const water = new THREE.Mesh(new THREE.PlaneGeometry(6.6, 1.4), new THREE.MeshBasicMaterial({color:0x3a78a8})); water.position.set(0, -.4, -.1); g.add(water);
  // interfaces bottom to top; the shell layer only exists in the basin between the two continents
  const basin = x => 1 - Math.min(1, Math.max(0, (Math.abs(x) - 1.8)/1.4));
  const tops = [x => -2, x => -1.2 - .3*basin(x), x => -.5 - .6*basin(x), x => .8 - 1.5*basin(x), x => .8 - 1.15*basin(x)];
  const cols = [0x5a3a3a, 0x8a5a3a, 0xc89a6a, 0x7a5a4a, 0x6a8ab0];
  const layers = cols.map(c => {
    const geo = new THREE.BufferGeometry(), pos = new Float32Array((N + 1)*2*3), idx = [];
    for (let i = 0; i < N; i++) { const a = i*2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3)); geo.setIndex(idx);
    const m = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({color:c, side:THREE.DoubleSide})); m.frustumCulled = false; g.add(m); return m;
  });
  const shells = []; for (let i = 0; i < 9; i++) { const s = new THREE.Mesh(new THREE.CircleGeometry(.09, 10), new THREE.MeshBasicMaterial({color:0xfff6e0})); s.position.z = .02; g.add(s); shells.push({m:s, x:-1.6 + i*.4}); }
  const arrows = [-1, 1].map(sd => { const a = new THREE.Mesh(new THREE.ConeGeometry(.35, .8, 3), new THREE.MeshBasicMaterial({color:0xffd36b})); a.rotation.z = sd*Math.PI/2; a.position.set(sd*6.2, 1.6, .05); g.add(a); return a; });
  const label = (text) => { const tx = tex(512, 128, (c, cw, ch) => { c.font = '64px Caprasimo, Georgia, serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.lineWidth = 10; c.strokeStyle = 'rgba(26,19,32,.8)'; c.strokeText(text, cw/2, ch/2); c.fillStyle = '#efe0bf'; c.fillText(text, cw/2, ch/2); });
    tx.wrapS = tx.wrapT = THREE.ClampToEdgeWrapping; const m = new THREE.Mesh(new THREE.PlaneGeometry(3, .75), new THREE.MeshBasicMaterial({map:tx, transparent:true, depthWrite:false})); m.position.z = .1; g.add(m); return m; };
  const seaLabel = label('sea floor'), peakLabel = label('mountain!');
  seaLabel.position.set(0, .7, .1); peakLabel.position.set(2.6, 4.4, .1);
  const at = (x, k, li) => { const X = x*(1 - .3*k), y = tops[li](x) + k*3.2*Math.exp(-((X/1.9)**2)) + (li ? k*.32*Math.sin(X*3.2 + li*.5)*Math.exp(-((X/2.3)**2)) : 0); return [X, y]; };
  function step(k){
    layers.forEach((m, li) => { const pa = m.geometry.attributes.position;
      for (let i = 0; i <= N; i++) { const x = X0 + (X1 - X0)*i/N, [X, top] = at(x, k, li), [, bot] = li ? at(x, k, li - 1) : [X, -3];
        pa.setXYZ(i*2, X, top, li*.001); pa.setXYZ(i*2 + 1, X, Math.min(bot, top), li*.001); }
      pa.needsUpdate = true; });
    for (const s of shells) { const [X, top] = at(s.x, k, 4), [, bot] = at(s.x, k, 3); s.m.position.x = X; s.m.position.y = (top + bot)/2; }
    arrows.forEach((a, i) => { a.position.x = (i ? 1 : -1)*(6.2 - 1.6*k); });
    seaLabel.material.opacity = 1 - clamp01(k*3); peakLabel.material.opacity = clamp01((k - .75)*4);
  }
  step(0);
  return {step, shot: (pos, look) => { pos.set(CUT[0], CUT[1] + 1.6, CUT[2] + 11); look.set(CUT[0], CUT[1] + 1, CUT[2]); return true; }};
}
