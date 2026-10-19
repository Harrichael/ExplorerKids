// The mantle: a ledge in a vast cave deep under the crust, kept cool inside the bus's heat bubble.
// Kids picture the mantle as an ocean of lava, so everything here is solid: dull, chunky, warm rock
// that barely glows. Across the chasm, a cliff shows the mantle cut open, two great loops of rock
// with the crust's plates riding on top. Through the time goggles the loops turn: hot rock rises,
// cools and sinks, and the plates on top are dragged apart.

import * as THREE from 'three';
import { T, XF, add, bAdd, bFlush, clamp01, ease, fr, glowTex, outline, sph, tex } from '../../core/kit.js';
import { Sound } from '../../core/sound.js';
import { inWorld } from '../../core/world.js';
import { save } from '../../save.js';
import { game } from '../../state.js';
import { tripBus } from '../bus.js';
import { classmates } from '../class.js';
import { goggles } from '../goggles.js';
import { puffs, tripWorld } from '../stop-kit.js';
import { worries } from './worries.js';

// the ledge is the floor of the heat bubble, an ellipse; the cliff stands across the chasm to the north
const BX = 12.5, BZ = 6, BC = 3, CLIFF = -14, EDGE = -2.6;
const BUS = [-8, 6.2], ROOF = 16;
const ROCK = [-5.6, .4], PUTTY = [5.2, .9];
// the cliff's painting: 34 x 18 world units drawn on a 1024 x 512 canvas
const CW = 1024, CH = 512, WW = 34, WH = 18;
// the two loops of rock, side by side, rising together up the middle and sinking at the outer edges
const CELLS = [{cx:370, dir:1}, {cx:654, dir:-1}], RX = 150, RY = 170, CY = 300;

export function buildMantle(t){
  const w = tripWorld({title:'The Mantle', bg:0x2a1630, sky:0xffb090, groundCol:0x3a1a34, hemi:.7, sunCol:0xff9a6a, sunI:.55, fogNear:30, fogFar:80,
    cam:{oy:7.4, oz:9.2, oyP:9.4, ozP:10.6}});
  const inside = (x, z) => (x/BX)**2 + ((z - BC)/BZ)**2 < 1;
  w.bounds = (x, z) => inside(x, z) && z > EDGE + .6;
  w.surface = () => 'stone';
  w.area = (x, z) => z < .6 ? 'The Chasm Edge' : 'The Mantle';
  w.spawn = [BUS[0] + 1.6, BUS[1] - 1.8, Math.PI];
  const S = {phase:0, apart:0};
  let wallCtx, wallTex, dome, ring, current, putty, flash;
  const chunks = [];
  for (const c of CELLS) for (let i = 0; i < 44; i++) chunks.push({c, a:Math.random()*Math.PI*2, r:.35 + Math.random()*.65, s:9 + Math.random()*8,
    shape:Array.from({length:6}, () => .7 + Math.random()*.4)});
  inWorld(w, () => {
    const rock = tex(512, 512, (c, cw, ch) => { c.fillStyle = '#4a2420'; c.fillRect(0, 0, cw, ch);
      for (let i = 0; i < 16; i++) { const x = Math.random()*cw, y = Math.random()*ch, r = 40 + Math.random()*70; c.fillStyle = i % 3 ? '#421f1c' : '#5a2c24';
        for (const dx of [-cw, 0, cw]) for (const dy of [-ch, 0, ch]) { c.beginPath(); c.ellipse(x + dx, y + dy, r, r*.7, i, 0, 7); c.fill(); } }
      c.strokeStyle = 'rgba(255,120,70,.16)'; c.lineWidth = 2; for (let i = 0; i < 18; i++) { c.beginPath(); let x = Math.random()*cw, y = Math.random()*ch; c.moveTo(x, y); for (let k = 0; k < 4; k++) { x += (Math.random() - .5)*70; y += (Math.random() - .5)*70; c.lineTo(x, y); } c.stroke(); } }, 5, 4);
    const ledgeM = T(0xffffff, {map:rock, emissive:0x2a0a06, emissiveIntensity:.5});
    const ledge = add(new THREE.BoxGeometry(32, 4, 14), ledgeM, 0, -2, EDGE + 7); outline(ledge, 1.005);
    // the chasm's far floor, deep and dim, and the cave's walls and roof closing it all in
    const pit = add(new THREE.PlaneGeometry(60, 30), T(0x3a1410, {emissive:0x5a1a0a, emissiveIntensity:.6}), 0, -14, CLIFF + 8, null, false); pit.rotation.x = -Math.PI/2;
    // the cave itself is cool violet-plum, so the warm ledge, the column and the rock loops stand out against it
    for (let i = 0; i < 30; i++) { const side = i % 2 ? 1 : -1, z = CLIFF + (i >> 1)*1.6, s = 2.5 + Math.random()*3;
      bAdd([0x4a2a48, 0x3a2040, 0x5a3456][i % 3], new THREE.SphereGeometry(s, 9, 7), XF(side*(15 + Math.random()*3), -2 + Math.random()*10, z, fr(.9, 1.2), fr(.7, 1), fr(.9, 1.2), fr(0, 3), fr(0, 3), 0), {ink:.09, shadow:true}); }
    for (let i = 0; i < 9; i++) { const s = 2 + Math.random()*2.5; bAdd(0x40243e, new THREE.SphereGeometry(s, 9, 7), XF(-8 + i*2.4 + Math.random(), -1, 11.5 + Math.random()*1.5, 1.1, .75, 1, 0, fr(0, 3), 0), {ink:.08, shadow:true}); }
    const roof = add(new THREE.PlaneGeometry(70, 50), T(0x26142e, {side:THREE.BackSide}), 0, ROOF, -2, null, false); roof.rotation.x = -Math.PI/2;
    for (let i = 0; i < 22; i++) { const h = 1.5 + Math.random()*3; bAdd(0x3a2040, new THREE.ConeGeometry(.6 + Math.random()*.6, h, 7), XF(-16 + Math.random()*32, ROOF - h/2, -12 + Math.random()*20, 1, 1, 1, Math.PI, 0, 0), {ink:.05}); }
    // boulders on the ledge, chunky and solid, away from where the class stands
    for (let i = 0; i < 26; i++) { const x = -11 + Math.random()*22, z = EDGE + .8 + Math.random()*8;
      if (!inside(x, z) || Math.hypot(x - BUS[0], z - BUS[1]) < 4 || Math.hypot(x - PUTTY[0], z - PUTTY[1]) < 2 || Math.hypot(x - ROCK[0], z - ROCK[1]) < 2 || Math.abs(x) < 2.5) continue;
      const r0 = .25 + Math.random()*.45; bAdd([0x5a2c24, 0x4a2420, 0x6a3428][i % 3], new THREE.SphereGeometry(r0, 8, 6), XF(x, r0*.3, z, fr(1, 1.3), .65, fr(.9, 1.2), 0, fr(0, 6), 0), {ink:.035, shadow:true}); }
    bFlush(w.scene);
    // Basil's rock to tap, and Juniper's flat warm stone with her putty on it
    const big = add(new THREE.SphereGeometry(1.1, 10, 7), T(0x5a2c24, {emissive:0x2a0a06, emissiveIntensity:.5}), ROCK[0], .6, ROCK[1]); big.scale.set(1.2, .8, 1); outline(big, 1.03);
    outline(add(new THREE.CylinderGeometry(.75, .85, .3, 10), T(0x6a3428, {emissive:0x3a0e06, emissiveIntensity:.5}), PUTTY[0], .15, PUTTY[1]), 1.04);
    putty = sph(.2, T(0x5ab8d0), PUTTY[0], .5, PUTTY[1], null, 14); outline(putty, 1.06);
    // the cliff across the chasm: the mantle cut open, painted fresh each frame
    const wc = document.createElement('canvas'); wc.width = CW; wc.height = CH; wallCtx = wc.getContext('2d');
    wallTex = new THREE.CanvasTexture(wc); wallTex.encoding = THREE.sRGBEncoding; wallTex.anisotropy = 4;
    add(new THREE.PlaneGeometry(WW, WH), new THREE.MeshBasicMaterial({map:wallTex}), 0, 0, CLIFF, null, false);
    add(new THREE.BoxGeometry(WW + 1, WH + 1, .6), T(0x2a1830), 0, 0, CLIFF - .35, null, false);
    // the rising current the bus rides away on, a slow shimmer up the middle of the chasm
    const ct = tex(64, 256, (c, cw, ch) => { const g = c.createLinearGradient(0, 0, cw, 0); g.addColorStop(0, 'rgba(255,150,80,0)'); g.addColorStop(.5, 'rgba(255,170,90,.55)'); g.addColorStop(1, 'rgba(255,150,80,0)'); c.fillStyle = g; c.fillRect(0, 0, cw, ch);
      c.fillStyle = 'rgba(255,220,160,.35)'; for (let i = 0; i < 30; i++) c.fillRect(10 + Math.random()*44, Math.random()*ch, 3, 10 + Math.random()*20); }, 1, 2);
    current = add(new THREE.CylinderGeometry(2.2, 2.6, 34, 16, 1, true), new THREE.MeshBasicMaterial({map:ct, transparent:true, opacity:.4, depthWrite:false, side:THREE.DoubleSide, blending:THREE.AdditiveBlending}), 0, 2, CLIFF + 6, null, false);
  });
  // the heat bubble, grown from the bus's own to cover the ledge, and its glowing edge on the floor
  dome = new THREE.Mesh(new THREE.SphereGeometry(1, 40, 20, 0, Math.PI*2, 0, Math.PI/2), new THREE.MeshBasicMaterial({color:0x8fe0ff, transparent:true, opacity:.07, depthWrite:false, blending:THREE.AdditiveBlending}));
  ring = new THREE.Mesh(new THREE.TorusGeometry(1, .012, 6, 80), new THREE.MeshBasicMaterial({color:0xaef0ff, transparent:true, opacity:.6, blending:THREE.AdditiveBlending, depthWrite:false}));
  ring.rotation.x = Math.PI/2; dome.add(ring); w.scene.add(dome);
  const grow = (k, [x, z] = BUS) => { dome.scale.set(3.2 + (BX - 3.2)*k, 3 + 4*k, 2.4 + (BZ - 2.4)*k); dome.position.set(x*(1 - k), .05, z + (BC - z)*k); };
  grow(0); dome.visible = false;
  flash = new THREE.Sprite(new THREE.SpriteMaterial({map:glowTex, color:0xfff0c0, transparent:true, depthWrite:false, blending:THREE.AdditiveBlending, opacity:0}));
  flash.position.set(ROCK[0] + .7, 1.1, ROCK[1] + .6); w.scene.add(flash);
  const dust = puffs(w, BUS[0], ROOF - .5, BUS[1], {rate:0, rise:-1.2, size:2.2, color:0x8a5a4a, opacity:.6, spread:3, life:2.4});

  function drawWall(){
    const c = wallCtx;
    const g = c.createLinearGradient(0, 0, 0, CH); g.addColorStop(0, '#3e1a34'); g.addColorStop(.45, '#8a3020'); g.addColorStop(1, '#d8682c'); c.fillStyle = g; c.fillRect(0, 0, CW, CH);
    c.strokeStyle = 'rgba(255,220,170,.22)'; c.lineWidth = 4;
    for (const cell of CELLS) { c.beginPath(); c.ellipse(cell.cx, CY, RX, RY, 0, 0, Math.PI*2); c.stroke();
      const ax = cell.cx + cell.dir*RX; c.beginPath(); c.moveTo(ax - 12, CY + 12); c.lineTo(ax, CY - 8); c.lineTo(ax + 12, CY + 12); c.stroke(); }
    // chunks of solid rock, hot and bright where they rise, dark where they've cooled and sink
    for (const q of chunks) {
      const a = q.a + q.c.dir*S.phase*(1.2 - q.r*.3), x = q.c.cx + RX*q.r*Math.cos(a), y = CY - RY*q.r*Math.sin(a), hot = clamp01((y - 90)/360);
      c.fillStyle = `rgb(${110 + hot*140},${36 + hot*110},${24 + hot*40})`; c.strokeStyle = 'rgba(26,19,32,.55)'; c.lineWidth = 2;
      c.beginPath(); q.shape.forEach((s, k) => { const b = k/6*Math.PI*2 + q.a; c.lineTo(x + Math.cos(b)*q.s*s, y + Math.sin(b)*q.s*s*.8); }); c.closePath(); c.fill(); c.stroke();
    }
    // the plates on top, dragged apart over the rising middle; new crust fills the gap between them
    const gap = 8 + S.apart*70, edge = 230 - S.apart*30, top = 56;
    c.fillStyle = '#c08a5a'; c.fillRect(512 - gap, 0, gap*2, top - 6);
    c.fillStyle = '#ffb050'; c.fillRect(509, 0, 6, top);
    c.fillStyle = '#8a5a3a'; c.fillRect(edge, 0, 512 - gap - edge, top); c.fillRect(512 + gap, 0, CW - 512 - gap, top);
    c.fillStyle = '#4e7a4e'; c.fillRect(edge, 0, 512 - gap - edge, 9); c.fillRect(512 + gap, 0, CW - 512 - gap, 9);
    c.strokeStyle = '#1a1320'; c.lineWidth = 3; c.strokeRect(edge, 0, 512 - gap - edge, top); c.strokeRect(512 + gap, 0, CW - 512 - gap, top);
    // little trees riding along on each plate
    for (const [x0, dir] of [[400, -1], [460, -1], [570, 1], [640, 1], [760, 1]]) { const x = x0 + dir*S.apart*70; c.fillStyle = '#2f5537'; c.beginPath(); c.moveTo(x - 9, 9); c.lineTo(x, -14); c.lineTo(x + 9, 9); c.fill(); }
    // the left plate's end, cooled and heavy, sinking back down
    c.save(); c.translate(edge + 4, 8); c.rotate(1.05); c.fillStyle = '#3a2a30'; c.fillRect(0, -24, 120 + S.apart*150, 46); c.strokeRect(0, -24, 120 + S.apart*150, 46); c.restore();
    c.font = '30px Caprasimo, Georgia, serif'; c.textAlign = 'center'; c.lineWidth = 7; c.strokeStyle = 'rgba(26,19,32,.85)'; c.fillStyle = '#efe0bf';
    const label = (s, x, y) => { c.strokeText(s, x, y); c.fillText(s, x, y); };
    label('plate', 380, 40); label('plate', 760, 40);
    if (S.labels) { label('hot rock rises', 512, 488); label('cool rock sinks', 180, 470); label('cool rock sinks', 860, 470); }
    wallTex.needsUpdate = true;
  }
  let sag = null, curFlow = 0;
  w.anims.push((dt, tt) => {
    // in a day, the mantle doesn't visibly move at all; this is the merest hint that it isn't still
    if (!S.lapse) S.phase += dt*.002;
    drawWall();
    current.material.map.offset.y -= dt*(.08 + curFlow);
    flash.material.opacity = Math.max(0, flash.material.opacity - dt*3);
    if (sag) { const k = ease(clamp01((game.elapsed - sag)/4)); putty.scale.set(1 + k*.75, 1 - k*.62, 1 + k*.75); putty.position.y = .5 - k*.13; }
    ring.material.opacity = .45 + Math.sin(tt*2)*.15;
  });
  const bus = tripBus(w);
  const cls = classmates(w, t, [BUS[0] + 1.6, BUS[1] - 1.6]);
  const say = t.say;

  // ---------- what the class finds ----------
  cls.find('basil', {name:'tap', at:[ROCK[0] + 1.5, ROCK[1] + 1.3, -2.3], call:"Wait! Is this a lava ocean?!", after:["Solid rock. I feel much better now."],
    async scene(){
      await say([['basil', "{name}, the mantle is a big ocean of lava, right? Are we going to sink?"],
                 ['basil', "Here, use my rock hammer. You tap it. I'm scared."]]);
      const pick = await t.ask('basil', "What will happen when you tap it?", ["Clink! It's hard rock", "Splash! It's lava"]);
      for (let i = 0; i < 3; i++) { flash.material.opacity = 1; flash.scale.setScalar(.8 + Math.random()*.4); game.camShake = .5;
        Sound.tone(1900 + i*120, {type:'triangle', dur:.12, vol:.1}); Sound.tone(3200, {type:'square', dur:.04, vol:.03, cut:4000}); await t.wait(.45); }
      await say([['basil', pick === 0 ? "Clink! You were right. It's solid!" : "No splash at all. Clink! It's solid!"],
                 ['basil', "The mantle is rock. Hot rock, but hard as a sidewalk."],
                 ['basil', "Nobody can sink in a sidewalk!"]]);
      await say([['basil', worries(1)]]);
    }});
  cls.find('juniper', {name:'putty', at:[PUTTY[0] + .4, PUTTY[1] + 1.3, -2.8], pose:'crouch', call:"Come watch my putty!", after:["Solid, but it flows. Slowly!"],
    async scene(){
      await say([['juniper', "My putty ball is solid. You can't pour it."]]);
      const pick = await t.ask('juniper', "What will it do, sitting on this warm rock?", ["Stay round", "Slowly sag flat", "Bounce"]);
      t.cut((pos, look) => { pos.set(PUTTY[0] - .4, 1.5, PUTTY[1] + 2.4); look.set(PUTTY[0], .35, PUTTY[1]); });
      sag = game.elapsed; Sound.tone(300, {type:'sine', dur:3, vol:.04, f2:200});
      await t.wait(4.4);
      t.cut(null);
      await say([['juniper', pick === 1 ? "You guessed it! It sagged flat." : "Look! It slowly sagged flat."],
                 ['juniper', "It's solid, but it still flows, very slowly."],
                 ['juniper', "Mantle rock does that too. Just much, much slower."]]);
    }});
  cls.find('pip', {name:'goggles', at:[.4, EDGE + 1.3, Math.PI], pose:'peer', call:"I've got the time goggles!", after:["Round and round, a million years at a time."],
    async scene(){
      await say([['pip', "Dr. Sparks lent me her time goggles! Your turn, {name}."],
                 ['pip', "Look at the cliff. That's the mantle, cut open."]]);
      const pick = await t.ask('pip', "What will the hot rock near the bottom do?", ["Rise up", "Sink down", "Stay still"]);
      S.lapse = true; const p0 = S.phase;
      await goggles(t, {shot:(pos, look) => { pos.set(0, 1.4, 3.6); look.set(0, .3, CLIFF); }, years:1e8, dur:8,
        step: k => { S.phase = p0 + k*Math.PI*2; S.apart = k; S.labels = k > .25; }});
      await say([['pip', pick === 0 ? "You guessed it! The hot rock rose up." : "Whoa! The hot rock rose up."],
                 ['pip', "Then it cooled off at the top and sank. Round and round!"],
                 ['basil', "And look on the side! A cool slab of plate sank down."],
                 ['sparks', "The moving mantle drags the plates along. That's why plates move!"],
                 ['sparks', "Hot things rise. Hot air does it too! Try it at the science desk when we get home."]]);
      save('trips', {heatRises:true});
    }});
  cls.find('mo', {name:'heat', at:[8.6, 4.6, -2.2], pose:'cheer', call:"Phew! Come here!", after:["Hot like the sun. Wow."],
    async scene(){
      await say([['mo', "Phew! It's hotter than a pizza oven down here."]]);
      const pick = await t.ask('mo', "Guess how hot the very middle of the Earth is?", ["As hot as an oven", "As hot as the sun's surface"]);
      await say([['mo', pick === 1 ? "Yes! As hot as the surface of the sun!" : "Even hotter! As hot as the surface of the sun!"],
                 ['mo', "Good thing we have the heat bubble. My snacks would melt."]]);
    }});
  cls.hint = () => cls.saw('goggles') ? "Hop on the bus when you're ready, {name}. We're riding the rock up!" :
    "Basil has a question, Juniper has putty, and Pip has my time goggles!";

  // ---------- the place's scenes, run by the trip's script ----------
  return {world:w, bus, cls,
    // down through the cave roof in the heat bubble, rock tumbling after; the bubble spreads over the ledge
    async arrive(){
      bus.gear('bubble'); bus.park(BUS[0], ROOF + 6, BUS[1], 0);
      t.watch(w, (pos, look) => { pos.set(4, 6, 20); look.set(BUS[0], Math.max(1, bus.root.position.y*.7), BUS[1]); });
      dust.burst = 1.2; game.camShake = 2; Sound.hiss({dur:1.6, vol:.15, type:'lowpass', freq:300}); Sound.tone(70, {dur:1.4, vol:.12, f2:45});
      await bus.fly([[BUS[0], ROOF + 6, BUS[1]], [BUS[0] + .3, ROOF - 3, BUS[1]], [BUS[0], 2, BUS[1]], [BUS[0], 0, BUS[1]]], 3.6);
      bus.park(BUS[0], 0, BUS[1], 0);
      Sound.tone(330, {type:'triangle', dur:.12, vol:.08}); Sound.tone(494, {type:'triangle', t:.1, dur:.18, vol:.08});
      dome.visible = true;
      Sound.tone(523, {type:'sine', dur:1.2, vol:.06, f2:1046});
      await t.tween(1.4, k => grow(ease(k)));
      bus.gear(null);
      const [dx, dz] = bus.door(.6);
      t.cut((pos, look) => { pos.set(2, 10, 16); look.set(0, -.5, -1); });
      cls.arrive({sparks:[dx + .9, dz - .5, Math.PI*.9]});
      await t.wait(2.6);
      await say([['sparks', "Welcome to the mantle, class! The heat bubble keeps us cool. Stay inside it."],
                 ['sparks', "Look around. When someone waves, go and see!"]]);
      t.play(w, [dx, dz - .2, Math.PI]);
      t.goal('Visit anyone who waves!');
    },
    async explore(){
      await t.until(() => cls.saw('goggles') && !game.cutscene);
      await t.wait(.6);
      await say([['sparks', cls.saw('tap') || cls.saw('putty') ? "Solid rock that flows, round and round, and carries the plates. That's the mantle!" :
                              "Hot rock rises, cool rock sinks, round and round, and it carries the plates. That's the mantle!"],
                 ['sparks', "The drill's gone, but the mantle can carry us up instead."],
                 ...(cls.leaving ? cls.leaving("who wants to ride a rock elevator?") : [['sparks', "Who wants to ride a rock elevator? Everyone aboard!"], ...cls.stillWaving()])]);
      cls.gather([bus.root.position.x - .6, bus.root.position.z - 2.4, 0]);
      await cls.board(bus);
    },
    // the bubble shrinks back round the bus, which floats out over the chasm: over the cool, sinking rock it
    // sinks too, so it drifts to the middle, where the hot rock rises, and rides that up
    async depart(){
      for (const id in cls.n) { cls.n[id].model.root.visible = false; cls.n[id].label.visible = false; }
      const p = bus.root.position, at = [p.x, p.z];
      t.watch(w, (pos, look) => { pos.set(p.x*.4 + 3, 6, 15); look.set(p.x*.8, Math.min(Math.max(p.y, -1), 10), p.z); });
      await t.tween(1, k => grow(1 - ease(k), at));
      dome.visible = false; bus.gear('bubble');
      Sound.tone(523, {type:'triangle', dur:.15, vol:.07}); Sound.tone(784, {type:'triangle', t:.12, dur:.25, vol:.07});
      const over = [-7, 2.4, EDGE - 3.4];
      await bus.fly([[p.x, p.y, p.z], [p.x + .5, 2.2, 2], [over[0], over[1] + .3, EDGE - 1], over], 2.8, {roll:.5});
      Sound.tone(220, {type:'sawtooth', dur:1.4, vol:.05, f2:90, cut:600});
      const sink = t.tween(1.6, k => { p.y = over[1] - 1.6*ease(k); bus.body.rotation.z = Math.sin(k*20)*.14*(1 - k*.6); });
      await say([['basil', "Um. We're going DOWN."], ['sparks', "This rock has cooled off, so it sinks. To the middle, where it's hot!"]]);
      await sink; bus.body.rotation.z = 0;
      const mid = [0, 1.4, CLIFF + 6];
      await bus.fly([[p.x, p.y, p.z], [-3.5, 1.2, (p.z + mid[2])/2], mid], 2.2, {roll:.5});
      curFlow = .6; current.material.opacity = .65;
      Sound.hiss({dur:3, vol:.1, type:'bandpass', freq:500, f2:1600, q:.6}); Sound.tone(120, {type:'sawtooth', dur:3.4, vol:.04, f2:360, cut:800});
      const up = bus.fly([mid, [0, 4, CLIFF + 6], [0, 10, CLIFF + 6], [0, ROOF + 10, CLIFF + 6]], 4.6, {roll:.5});
      await say([['pip', "It's going up! Right where the hot rock rises."]]);
      await up;
      await t.wait(.3);
    },
  };
}
