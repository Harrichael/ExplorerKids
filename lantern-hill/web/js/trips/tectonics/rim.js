// The volcano rim: where the trip lands first, and where its big question comes from. A ring of warm
// black rock around a crater with melted rock glowing far below, and out along the coast, more
// volcanoes standing in a row. Why in a row? The rest of the trip finds out.

import * as THREE from 'three';
import { T, XF, add, bAdd, bFlush, clamp01, fr, glowM, grp, outline, sph, tex } from '../../core/kit.js';
import { Sound } from '../../core/sound.js';
import { inWorld } from '../../core/world.js';
import { player } from '../../player.js';
import { game } from '../../state.js';
import { tripBus } from '../bus.js';
import { classmates } from '../class.js';
import { puffs, tripWorld } from '../stop-kit.js';
import { worries } from './worries.js';

// the crater sits at the origin; the walkable rim is the ring around it
const CRATER = 6.6, RIM = 14.2, LAVA = -6.8, SEA = -34;
// the other volcanoes along the coast, all on one line, the line where two plates meet
const CHAIN = [[130, -26], [205, -41], [285, -57], [-125, 25], [-215, 43]];
const VENT = [6.8, 5.4], POOL = [-7.6, 6.2], TOAST = [-9.6, .8];
// the bus parks on the east of the rim, nose to the north, its door toward the crater
const BUS = [10.6, 3.2], BUS_RY = Math.PI/2;
const binoc = document.createElement('div'); binoc.id = 'binoc'; binoc.hidden = true; document.body.append(binoc);

export function buildRim(t){
  const w = tripWorld({title:'The Volcano Rim', bg:0x9a86c0, sky:0xe0d0f4, groundCol:0x3a2a30, hemi:.78, sunCol:0xffd2a2, sunI:.85, fogNear:80, fogFar:460,
    cam:{oy:7.4, oz:9.2, oyP:9.4, ozP:10.6}});
  w.far = 600;
  const ring = (x, z) => Math.hypot(x, z);
  w.ground = (x, z) => { const r = ring(x, z); return r < CRATER ? -.4 - (CRATER - r)*1.6 : 0; };
  w.bounds = (x, z) => { const r = ring(x, z); return r > CRATER + .7 && r < RIM - .5; };
  w.surface = () => 'stone';
  w.area = (x, z) => ring(x, z) < CRATER + 2.2 ? 'The Crater Edge' : 'The Volcano Rim';
  w.spawn = [9.2, 1.4, Math.PI];
  let lava, lavaLight, pumice;
  const bubbles = [];
  inWorld(w, () => {
    // two tones of rock in a few big soft blotches, so it reads as one smooth toon surface, not gravel
    const rock = tex(512, 512, (c, cw, ch) => { c.fillStyle = '#4a3a44'; c.fillRect(0, 0, cw, ch);
      for (let i = 0; i < 16; i++) { const x = Math.random()*cw, y = Math.random()*ch, r = 40 + Math.random()*70; c.fillStyle = i % 3 ? '#3e3038' : '#56444e';
        for (const dx of [-cw, 0, cw]) for (const dy of [-ch, 0, ch]) { c.beginPath(); c.ellipse(x + dx, y + dy, r, r*.7, i, 0, 7); c.fill(); } }
      c.strokeStyle = 'rgba(255,150,90,.16)'; c.lineWidth = 3; c.lineCap = 'round'; for (let i = 0; i < 7; i++) { c.beginPath(); let x = Math.random()*cw, y = Math.random()*ch; c.moveTo(x, y); for (let k = 0; k < 4; k++) { x += (Math.random() - .5)*70; y += (Math.random() - .5)*70; c.lineTo(x, y); } c.stroke(); } }, 4, 4);
    const rimM = T(0xffffff, {map:rock});
    const top = add(new THREE.RingGeometry(CRATER, RIM + .3, 72, 4), rimM, 0, 0, 0, null, false); top.rotation.x = -Math.PI/2;
    // the crater's inside wall down to the lava, and the cone's outside down to the sea
    const lathe = (pts, mat, side) => add(new THREE.LatheGeometry(pts.map(([r, y]) => new THREE.Vector2(r, y)), 72), T(mat, {side}), 0, 0, 0, null, false);
    const wall = lathe([[3.4, LAVA - .2], [3.9, LAVA + 1.2], [5.2, -3.4], [6.2, -1], [CRATER, 0]], 0xffffff, THREE.BackSide);
    // darker toward the top, where the lava's glow can't reach
    const wp = wall.geometry.attributes.position, wc = new Float32Array(wp.count*3);
    for (let i = 0; i < wp.count; i++) { const k = Math.min(1, Math.max(0, (wp.getY(i) - LAVA)/-LAVA)); wc.set([.55 - k*.45, .22 - k*.16, .14 - k*.06], i*3); }
    wall.geometry.setAttribute('color', new THREE.BufferAttribute(wc, 3)); wall.material = T(0xffffff, {side:THREE.BackSide, vertexColors:true, map:null});
    add(new THREE.TorusGeometry(CRATER, .22, 6, 72), T(0x241a20), 0, 0, 0, null, false).rotation.x = Math.PI/2;
    // the cone's outside, banded and gullied in vertex colours, dark rock high up and green toward the sea
    const slope = new THREE.CatmullRomCurve3([[RIM + .3, 0], [RIM + 3, -2.6], [24, -9], [40, -20], [62, -29], [90, SEA - .5]].map(([r, y]) => new THREE.Vector3(r, y, 0))).getPoints(30);
    const cone = lathe(slope.map(p => [p.x, p.y]), 0xffffff, THREE.DoubleSide), cp = cone.geometry.attributes.position, cc = new Float32Array(cp.count*3);
    const high = new THREE.Color(0x4a3a44), low = new THREE.Color(0x6a4a4a), green = new THREE.Color(0x4e7a4e), tc = new THREE.Color();
    for (let i = 0; i < cp.count; i++) { const x = cp.getX(i), z = cp.getZ(i), r = Math.hypot(x, z), a = Math.atan2(z, x), k = clamp01((r - RIM)/50);
      tc.copy(high).lerp(low, k).lerp(green, clamp01((r - 58)/20)).multiplyScalar(.9 + .14*Math.sin(r*.35) + .1*Math.sin(a*9 + r*.08)); cc.set([tc.r, tc.g, tc.b], i*3); }
    // pale blotches only, so the vertex colours keep the hue; stretched down the slope they read as gullies
    const slopeTex = tex(256, 256, (c, cw, ch) => { c.fillStyle = '#ffffff'; c.fillRect(0, 0, cw, ch);
      for (let i = 0; i < 14; i++) { const x = Math.random()*cw, y = Math.random()*ch, r = 24 + Math.random()*40; c.fillStyle = i % 2 ? '#e8e0e6' : '#d4c8d2';
        for (const dx of [-cw, 0, cw]) for (const dy of [-ch, 0, ch]) { c.beginPath(); c.ellipse(x + dx, y + dy, r, r*.6, i, 0, 7); c.fill(); } } }, 18, 3);
    cone.geometry.setAttribute('color', new THREE.BufferAttribute(cc, 3)); cone.material = T(0xffffff, {side:THREE.DoubleSide, vertexColors:true, map:slopeTex});
    // a lava lake: dark cooling crust broken into plates, glowing hot in the cracks between them
    // swirls of brighter and darker molten rock, soft-edged, so from up on the rim it reads as glowing liquid
    const lavaTex = tex(512, 512, (c, cw, ch) => { c.fillStyle = '#ff8a2a'; c.fillRect(0, 0, cw, ch); c.lineCap = 'round';
      for (const [col, wd, n] of [['#e0501e', 34, 9], ['#c8401a', 16, 6], ['#ffb347', 20, 10], ['#ffe08a', 7, 9]]) { c.strokeStyle = col; c.lineWidth = wd;
        for (let i = 0; i < n; i++) { const y0 = Math.random()*ch, ph = Math.random()*7, amp = 14 + Math.random()*30; c.beginPath();
          for (let x = -20; x <= cw + 20; x += 16) c.lineTo(x, y0 + Math.sin(x/60 + ph)*amp + Math.sin(x/23 + ph*2)*amp*.3); c.stroke(); } } });
    lava = add(new THREE.CircleGeometry(3.9, 40), T(0xffffff, {map:lavaTex, emissive:0xff6a20, emissiveMap:lavaTex, emissiveIntensity:.7}), 0, LAVA, 0, null, false); lava.rotation.x = -Math.PI/2;
    // the glow reaches only the bottom of the crater, so its walls darken toward the top and it reads as deep
    lavaLight = new THREE.PointLight(0xff7a3a, 2.2, 8, 2); lavaLight.position.set(0, LAVA + 1.2, 0); w.scene.add(lavaLight);
    for (let i = 0; i < 9; i++) { const b = sph(.35, glowM(0xffb04a, 1.6), 0, LAVA, 0, null, 10, false); b.visible = false; bubbles.push({m:b, t:Math.random()*3}); }
    // the far side of the crater climbs to a jagged crest, so the crater reads as the top of a mountain
    for (let i = 0; i < 11; i++) { const a = Math.PI*.14 + i/10*Math.PI*.72 + fr(-.04, .04), r = RIM + .6 + fr(0, 1.2), s = fr(2.4, 3.4), h = fr(2.6, 4.6);
      bAdd([0x3a2c34, 0x45343c][i % 2], new THREE.SphereGeometry(s, 9, 7), XF(Math.cos(a)*r, h*.35, -Math.sin(a)*r, 1, h/s, fr(.8, 1.1), 0, fr(0, 6), fr(-.15, .15)), {ink:.08, shadow:true}); }
    // boulders about the rim, kept off the paths the class runs along
    for (let i = 0; i < 40; i++) { const a = Math.random()*Math.PI*2, r = CRATER + 1.5 + Math.random()*6, x = Math.cos(a)*r, z = Math.sin(a)*r;
      if (Math.hypot(x - BUS[0], z - BUS[1] + 2) < 4.5 || Math.hypot(x - POOL[0], z - POOL[1]) < 2 || Math.hypot(x - VENT[0], z - VENT[1]) < 2) continue;
      const r0 = .2 + Math.random()*.4; bAdd([0x2c2228, 0x3e3038, 0x5a4048][i % 3], new THREE.SphereGeometry(r0, 8, 6), XF(x, r0*.25, z, fr(1, 1.4), .6, fr(.9, 1.2), 0, fr(0, 6), 0), {ink:.03, shadow:true}); }
    // the sea far below, and the coast's other volcanoes standing in a line across it
    const sea = add(new THREE.PlaneGeometry(1400, 1400), T(0x3a6a9a, {emissive:0x10304a, emissiveIntensity:.4}), 0, SEA, 0, null, false); sea.rotation.x = -Math.PI/2;
    for (const [x, z] of CHAIN) { const h = 30 + Math.abs(x)*.03, g = grp(x, SEA, z);
      outline(add(new THREE.CylinderGeometry(h*.12, h*.95, h, 10), T(0x3a1c16), 0, h/2, 0, g), 1.02);
      add(new THREE.CylinderGeometry(h*.1, h*.14, h*.04, 10), T(0xff8a3a, {emissive:0xff6a1a, emissiveIntensity:.8}), 0, h + .2, 0, g, false);
      add(new THREE.CylinderGeometry(h*1.8, h*2.1, 4, 14), T(0x24461e), 0, 0, 0, g, false); }
    // the warm pool, with pale floating pumice round its edge
    const poolTex = tex(256, 256, (c, cw, ch) => { const g = c.createRadialGradient(cw/2, ch/2, cw*.1, cw/2, ch/2, cw*.5); g.addColorStop(0, '#16566a'); g.addColorStop(.75, '#237a80'); g.addColorStop(1, '#4fa89c'); c.fillStyle = g; c.fillRect(0, 0, cw, ch);
      c.strokeStyle = 'rgba(200,240,230,.3)'; c.lineWidth = 3; for (let i = 0; i < 7; i++) { const x = 60 + Math.random()*136, y = 60 + Math.random()*136, r = 8 + Math.random()*16; c.beginPath(); c.ellipse(x, y, r, r*.55, 0, 0, 7); c.stroke(); } });
    const pool = add(new THREE.CircleGeometry(1.15, 28), T(0xffffff, {map:poolTex, emissive:0x0c3a40, emissiveIntensity:.35}), POOL[0], .04, POOL[1], null, false); pool.rotation.x = -Math.PI/2;
    // a ring of rounded pebbles, bigger at the back, like the pond at home
    for (let i = 0; i < 18; i++) { const a = i/18*Math.PI*2 + fr(-.08, .08), r0 = Math.sin(a) < 0 ? fr(.2, .3) : fr(.14, .22), k = 1.2 + r0*.4;
      bAdd([0x6a5a66, 0x7d6e78, 0x5a4a56][i % 3], new THREE.SphereGeometry(r0, 9, 6), XF(POOL[0] + Math.cos(a)*k, r0*.3, POOL[1] + Math.sin(a)*k, fr(1.1, 1.4), .6, 1, 0, -a, 0), {ink:.03, shadow:true}); }
    for (let i = 0; i < 6; i++) { const a = i*1.1; outline(add(new THREE.DodecahedronGeometry(.14, 0), T(0xd8d0c0), POOL[0] + Math.cos(a)*1.65, .1, POOL[1] + Math.sin(a)*1.65), 1.12); }
    pumice = add(new THREE.DodecahedronGeometry(.16, 0), T(0xe0d8c8), POOL[0] + 1.3, .12, POOL[1] + .9); pumice.visible = false; outline(pumice, 1.12);
    add(new THREE.CircleGeometry(.35, 12), T(0x1a1320), VENT[0], .03, VENT[1], null, false).rotation.x = -Math.PI/2;
    // the warm ground: a soft glow fading out into the rock, with hot cracks at its heart
    const warm = tex(256, 256, (c, cw, ch) => { const g = c.createRadialGradient(cw/2, ch/2, 0, cw/2, ch/2, cw/2); g.addColorStop(0, 'rgba(255,170,90,.95)'); g.addColorStop(.35, 'rgba(240,110,60,.7)'); g.addColorStop(1, 'rgba(160,50,40,0)'); c.fillStyle = g; c.fillRect(0, 0, cw, ch);
      c.strokeStyle = '#ffe08a'; c.lineWidth = 5; c.lineCap = 'round'; for (let i = 0; i < 5; i++) { const a = i*1.3; c.beginPath(); c.moveTo(cw/2 + Math.cos(a)*10, ch/2 + Math.sin(a)*10); c.lineTo(cw/2 + Math.cos(a + .3)*40, ch/2 + Math.sin(a + .3)*40); c.lineTo(cw/2 + Math.cos(a)*62, ch/2 + Math.sin(a)*62); c.stroke(); } });
    add(new THREE.CircleGeometry(1.4, 24), new THREE.MeshBasicMaterial({map:warm, transparent:true, depthWrite:false}), TOAST[0], .03, TOAST[1], null, false).rotation.x = -Math.PI/2;
    bFlush(w.scene);
  });
  puffs(w, 0, 2, -1.5, {rate:2, rise:4, size:3.2, color:0xd8d0e0, opacity:.2, spread:2, life:6});
  const vent = puffs(w, VENT[0], .1, VENT[1], {rate:2.5, rise:.9, size:.8, opacity:.6});
  puffs(w, POOL[0], .1, POOL[1], {rate:1.2, rise:.5, size:.9, opacity:.3, spread:1.4});
  CHAIN.filter((p, i) => i !== 1).forEach(([x, z]) => puffs(w, x, SEA + 31 + Math.abs(x)*.03, z, {rate:1.2, rise:7, size:14, color:0xd8d0e0, opacity:.35, spread:5, life:7}));
  const bus = tripBus(w);
  const door = () => bus.door(.6);
  const cls = classmates(w, t, [BUS[0] - 1.6, BUS[1] - 1.6]);
  let thrown = null;
  w.anims.push((dt, tt) => {
    lava.material.emissiveIntensity = .65 + Math.sin(tt*2.3)*.12; lava.material.map.offset.x = tt*.004; lavaLight.intensity = 2.2 + Math.sin(tt*3.1)*.4;
    for (const b of bubbles) { b.t -= dt; if (b.t < 0) { b.t = 1 + Math.random()*2.5; const a = Math.random()*7, r = Math.random()*3; b.m.position.set(Math.cos(a)*r, LAVA, Math.sin(a)*r); b.m.visible = true; b.age = 0; }
      if (b.m.visible) { b.age += dt; const k = b.age/.8; b.m.scale.setScalar(Math.sin(Math.min(1, k)*Math.PI)*.9 + .01); if (k >= 1) b.m.visible = false; } }
    if (thrown) { thrown.t += dt; const k = clamp01(thrown.t/.9);
      pumice.position.set(thrown.x + (POOL[0] - thrown.x)*k, .12 + Math.sin(k*Math.PI)*1.6 + (k >= 1 ? Math.sin(tt*2.5)*.03 : 0), thrown.z + (POOL[1] - thrown.z)*k);
      if (k >= 1 && !thrown.splash) { thrown.splash = true; Sound.hiss({dur:.4, vol:.1, type:'bandpass', freq:1400}); Sound.tone(620, {type:'sine', dur:.2, vol:.07, f2:900}); } }
  });

  // ---------- what the class finds ----------
  const say = t.say;
  // a tall phone screen sees a narrow slice, so the binoculars stand back to fit the whole row in
  const far = (pos, look) => { if (innerWidth < innerHeight) { pos.x = look.x + (pos.x - look.x)*1.5; pos.z = look.z + (pos.z - look.z)*1.5; } };
  cls.find('pip', {name:'row', at:[-1.4, CRATER + 1.3, Math.PI], pose:'peer', call:"Come see what's down there!", after:["Volcanoes all in a row. Like beads on a string!"],
    async scene(){
      await say([['pip', "{name}! Look down inside the crater. It's glowing!"]]);
      t.cut((pos, look) => { pos.set(-1.4, 3.2, CRATER + 1.4); look.set(0, LAVA, 0); });
      await say([['pip', "That's melted rock, way down there. Hot enough to glow!"],
                 ['pip', "Now borrow my binoculars. Look way out along the coast…"]]);
      binoc.hidden = false; Sound.tone(880, {type:'triangle', dur:.12, vol:.06});
      // binoculars see far: from out over the sea, the row stands side by side, clear of the haze
      const fog = w.scene.fog, haze = [fog.near, fog.far]; fog.near = 300; fog.far = 1400;
      t.cut((pos, look) => far(pos.set(80, 8, 70), look.set(200, -20, -50)));
      await t.wait(1.2);
      await say([['pip', "More volcanoes! One, two, three… and they're all lined up in a row."]]);
      const pick = await t.ask('pip', "Why would volcanoes stand in a row like that?", ["Something under the ground", "Somebody built them", "I don't know yet"]);
      binoc.hidden = true; [fog.near, fog.far] = haze;
      t.cut(null);
      await say([[ 'pip', ["Ooh, something under the ground. That's my guess too!", "Ha! Giant volcano builders? I don't think so…", "Me neither. But I want to find out!"][pick]],
                 ['juniper', "I'm writing that question down. Why are the volcanoes in a row?"]]);
    }});
  cls.find('basil', {name:'vent', at:[VENT[0] - .9, VENT[1] + 1.8, 2.7], call:"Is this supposed to happen?!", after:["I'm keeping my hands in my pockets, thank you."],
    async scene(){
      vent.burst = 1.2; Sound.hiss({dur:1.2, vol:.14, type:'bandpass', freq:900, q:.6});
      await say([['basil', "{name}, this rock keeps hissing at me!"]]);
      const pick = await t.ask('basil', "Will you check it? I'm not putting MY hand there.", ["Hold my hand near it", "Back away slowly"]);
      if (pick === 0) { vent.burst = 1.5; Sound.hiss({dur:1, vol:.12, type:'lowpass', freq:600});
        await say([['basil', "Is it warm? It's warm, isn't it. You're so brave."]]); }
      else await say([['basil', "Good thinking. Let's watch from here."]]);
      await say([['basil', "That's steam coming right out of the ground. Something under us is really, really hot."],
                 ['basil', "But the heat is way down deep. It can't burn us up here!"]]);
      await say([['basil', worries(0)]]);
    }});
  cls.find('juniper', {name:'pumice', at:[POOL[0] + .7, POOL[1] + 1.5, -2.6], pose:'crouch', call:"Rocks that float? Come see!", after:["Pumice. It's full of holes, like a sponge made of stone."],
    async scene(){
      await say([['juniper', "Pick one up, {name}. These rocks are as light as a cookie!"]]);
      const pick = await t.ask('juniper', "If you toss one in the pool, will it float or sink?", ["It will float", "It will sink"]);
      pumice.visible = true; thrown = {t:0, x:player.x, z:player.z}; Sound.tone(500, {type:'triangle', dur:.1, vol:.05});
      await t.wait(1.6);
      await say([['juniper', (pick === 0 ? "You were right, it floats! " : "Surprise, it floats! ") + "It's full of tiny holes, from gas bubbles in the lava."]]);
    }});
  cls.find('mo', {name:'toast', at:[TOAST[0] + .8, TOAST[1] + .9, -2.3], pose:'crouch', call:"Snack time! Come here!", after:["Best. Field trip. Ever."],
    async scene(){
      Sound.hiss({dur:1.5, vol:.06, type:'highpass', freq:2500});
      await say([['mo', "Feel the ground here, {name}. It's warm! Like a stove!"],
                 ['mo', "I'm toasting a marshmallow on it. Mmm, golden."]]);
      const pick = await t.ask('mo', "Want one?", ["Yes, please!", "No, thank you"]);
      await say([['mo', pick ? "More for me! But where's all this heat coming from?" : "Here you go! Hey, where's all this heat coming from, anyway?"]]);
    }});
  cls.hint = () => cls.saw('row') ? "Back to the bus whenever you're ready, {name}! Or go see anyone still waving." :
    "Pip has the binoculars, Basil found something hissing, and Mo smells like marshmallows. Go see!";

  // ---------- the place's scenes, run by the trip's script ----------
  return {world:w, bus, cls,
    // the bus swoops in over the sea, rounds the cone and lands on the rim; the class scatters
    async arrive(){
      bus.gear(null);
      t.watch(w, (pos, look) => { pos.set(bus.root.position.x*.5 + 6, Math.max(4, bus.root.position.y*.6 + 6), bus.root.position.z*.5 + 22); look.copy(bus.root.position); });
      Sound.tone(200, {type:'sawtooth', dur:4, vol:.03, f2:420, cut:900});
      await bus.fly([[70, 40, 110], [46, 28, 60], [24, 16, 30], [4, 9, 20], [-6, 5, 12], [2, 2.4, 9.5], [BUS[0], .8, 8.2], [BUS[0], 0, BUS[1]]], 7.5);
      bus.park(BUS[0], 0, BUS[1], BUS_RY);
      Sound.tone(330, {type:'triangle', dur:.12, vol:.08}); Sound.tone(494, {type:'triangle', t:.1, dur:.18, vol:.08});
      const [dx, dz] = door();
      t.cut((pos, look) => { pos.set(13, 10, 17); look.set(-1, 0, 2); });
      cls.arrive({sparks:[dx + .9, dz - .6, Math.PI*.85]});
      await t.wait(2.6);
      await say([['sparks', "Here we are, class: the very top of a volcano! Look around, but don't go near the edge."],
                 ['sparks', "Somebody's going to find something amazing. When they wave you over, go and see!"]]);
      t.play(w, [dx, dz - .2, Math.PI]);
      t.goal('Visit anyone who waves!');
    },
    async explore(){
      await t.until(() => cls.saw('row') && !game.cutscene);
      await t.wait(.6);
      await say([['sparks', cls.saw('vent') || cls.saw('toast') ? "Steam, warm ground, melted rock. The heat comes from deep inside the Earth!" :
                              "Rock so hot it melts and glows! That heat comes from deep inside the Earth."],
                 ['sparks', "Let's follow the melted rock down. Back to the bus when you're ready!"], ...cls.stillWaving()]);
      cls.gather([bus.root.position.x - .6, bus.root.position.z - 2.2, 0]);
      await cls.board(bus);
    },
    // up over the crater, a drill grows from the nose, and the bus dives into the lava
    async depart(){
      for (const id in cls.n) { cls.n[id].model.root.visible = false; cls.n[id].label.visible = false; }
      t.watch(w, (pos, look) => { pos.set(0, 7, CRATER + 9); look.set(bus.root.position.x, bus.root.position.y, bus.root.position.z); });
      Sound.hiss({dur:2.2, vol:.1, type:'bandpass', freq:900, q:.6});
      await bus.fly([[BUS[0], 0, BUS[1]], [BUS[0], 2.5, -1], [6, 6.5, -6], [-3, 8, -2], [-4, 8, 0]], 3.6, {roll:.6});
      bus.gear('drill'); Sound.tone(523, {type:'triangle', dur:.2, vol:.08}); Sound.tone(1046, {type:'triangle', t:.15, dur:.4, vol:.07}); Sound.tone(80, {type:'sawtooth', dur:2.4, vol:.05, f2:160, cut:600});
      await say([['mo', "Um, Dr. Sparks? Why does the bus have a drill?"], ['sparks', "Seatbelts on! Next stop: down!"]]);
      await bus.fly([[-4, 8, 0], [-1, 7.6, 0], [.6, 4, 0], [.8, LAVA, 0], [.8, LAVA - 6, 0]], 2.2, {easing:k => k*k});
      game.camShake = 3; Sound.hiss({dur:1, vol:.18, type:'lowpass', freq:300}); Sound.tone(60, {dur:1, vol:.18, f2:40});
      await t.wait(.5);
    },
    // on the way home: one last look at the volcano, and now the class knows why it is here
    async flyby(cam){
      bus.gear(null);
      t.watch(w, cam || ((pos, look) => { pos.set(-40, 18, 70); look.set(0, -6, 0); }));
      bus.park(80, 20, 60, 2.2);
      await bus.fly([[80, 20, 60], [30, 16, 34], [-10, 14, 30], [-60, 18, 10]], 6, {roll:.5});
    },
  };
}
