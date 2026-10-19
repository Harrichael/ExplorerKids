// The mid-ocean ridge: the deep sea floor, where two plates pull apart. A glowing crack runs across
// it; hot rock welling up from it cools into new sea floor, so the rock is newest by the crack and
// older, under more and more mud, the farther away it lies. The time goggles show the floor spread.

import * as THREE from 'three';
import { T, XF, add, bAdd, bFlush, fr, glowM, glowTex, grp, mergeGeos, meshOf, outline, sph, tex } from '../../core/kit.js';
import { Sound } from '../../core/sound.js';
import { inWorld } from '../../core/world.js';
import { hero, player } from '../../player.js';
import { game } from '../../state.js';
import { tripBus } from '../bus.js';
import { classmates } from '../class.js';
import { goggles } from '../goggles.js';
import { puffs, tripWorld } from '../stop-kit.js';
import { worries } from './worries.js';

// the crack runs north to south along x = 0; the floor's two plates lie either side of it
const BAND = 1.5, BANDS = 8, SPREAD = 2.4, LONG = 90;
const PILLOW = [-1.6, -2.5], SMOKER = [-6.6, -3.6], MO = [0, 1.2];
// the sub parks east of the crack, nose to the north, its door toward the crack
const BUS = [9.2, 4.6], BUS_RY = Math.PI/2;
// fresh black rock by the crack, then browner and muddier band by band
const ROCK = ['#1c1822', '#2a2430', '#3a3236', '#4a4038', '#5a4e40', '#665a48', '#706450', '#7a6e58'];

export function buildRidge(t){
  const w = tripWorld({title:'The Mid-Ocean Ridge', bg:0x0c2440, sky:0x5a9ad0, groundCol:0x0a1a2a, hemi:.7, sunCol:0x9ac8ff, sunI:.35, fogNear:10, fogFar:38,
    cam:{oy:7.4, oz:9.2, oyP:9.4, ozP:10.6}});
  w.bounds = (x, z) => Math.abs(x) < 12.5 && z > -9 && z < 8.5;
  w.surface = () => 'stone';
  w.area = x => Math.abs(x) < 2.6 ? 'The Ridge Crack' : 'The Sea Floor';
  w.spawn = [7.6, 2.9, -Math.PI/2];
  // the two plates, each carrying its bands (and whatever sits on them) away from the crack
  const side = {L:null, R:null};
  let fresh, crack, pebble, pillowGlow;
  const worms = [], fish = [];
  inWorld(w, () => {
    const floorTex = tex(256, 256, (c, cw, ch) => { c.fillStyle = '#6e6450'; c.fillRect(0, 0, cw, ch);
      for (let i = 0; i < 500; i++) { c.fillStyle = ['#7a6e58', '#62584a', '#84786a'][i % 3]; c.beginPath(); c.arc(Math.random()*cw, Math.random()*ch, 1 + Math.random()*4, 0, 7); c.fill(); } }, 30, 30);
    const floor = add(new THREE.PlaneGeometry(200, 200), T(0xffffff, {map:floorTex}), 0, -.02, 0, null, false); floor.rotation.x = -Math.PI/2;
    for (const [k, sx] of [['L', -1], ['R', 1]]) {
      const g = side[k] = grp();
      for (let i = 0; i < BANDS; i++) {
        const mud = i/(BANDS - 1), bt = tex(128, 256, (c, cw, ch) => { c.fillStyle = ROCK[i]; c.fillRect(0, 0, cw, ch);
          // lumps of rock, then a dusting of mud that thickens the older the band
          for (let j = 0; j < 60; j++) { c.fillStyle = `rgba(0,0,0,${.25 - mud*.15})`; c.beginPath(); c.arc(Math.random()*cw, Math.random()*ch, 4 + Math.random()*8, 0, 7); c.fill(); }
          for (let j = 0; j < 40 + mud*500; j++) { c.fillStyle = `rgba(170,150,120,${.15 + mud*.35})`; c.fillRect(Math.random()*cw, Math.random()*ch, 2 + Math.random()*3, 2); } }, 1, 20);
        const b = add(new THREE.PlaneGeometry(BAND, LONG), T(0xffffff, {map:bt}), sx*(.35 + BAND*(i + .5)), .01 + (BANDS - i)*.002, 0, g, false); b.rotation.x = -Math.PI/2;
      }
      // the rift's walls, rising from the floor far out on either side
      for (let i = 0; i < 14; i++) { const z = -40 + i*6 + Math.random()*3, h = 4 + Math.random()*5;
        bAdd(0x2a3040, new THREE.ConeGeometry(4 + Math.random()*2, h, 6), XF(sx*(17 + Math.random()*4), h/2 - .5, z, 1, 1, 1, 0, Math.random()*3, 0), {ink:.12}); }
      bFlush(g);
    }
    // new rock: glowing where it wells up in the middle, cooling to black toward its edges as it spreads
    const freshTex = tex(256, 8, (c, cw, ch) => { const g = c.createLinearGradient(0, 0, cw, 0);
      [['#1c1822', 0], ['#3a1a14', .3], ['#ff7a2a', .47], ['#ffd36b', .5], ['#ff7a2a', .53], ['#3a1a14', .7], ['#1c1822', 1]].forEach(([col, at]) => g.addColorStop(at, col));
      c.fillStyle = g; c.fillRect(0, 0, cw, ch); }, 1, 1);
    freshTex.wrapS = THREE.ClampToEdgeWrapping;
    fresh = add(new THREE.PlaneGeometry(1, LONG), T(0xffffff, {map:freshTex, emissive:0xffffff, emissiveMap:freshTex, emissiveIntensity:.8}), 0, .03, 0, null, false);
    fresh.rotation.x = -Math.PI/2; fresh.scale.x = .001;
    // the crack: short jagged glowing pieces, each a little askew, between lips of fresh black rock
    const bits = [], lips = [];
    for (let z = -LONG/2, k = 0; z < LONG/2; z += .9, k++) { const x = Math.sin(k*1.7)*.1 + Math.sin(k*.6)*.06;
      bits.push([new THREE.BoxGeometry(.34 + Math.abs(Math.sin(k*2.3))*.22, .02, .98), XF(x, 0, z + .45, 1, 1, 1, 0, Math.sin(k*1.3)*.14, 0)]);
      if (Math.abs(z) < 30) for (const sd of [-1, 1]) for (const dz of [0, .45]) { const r = fr(.13, .2);
        lips.push([new THREE.SphereGeometry(r, 7, 5), XF(x + sd*(.3 + fr(0, .08)), .02, z + dz + fr(-.1, .1), fr(1, 1.4), .45, fr(1.2, 1.7), 0, fr(0, 6), 0)]); } }
    crack = new THREE.Mesh(mergeGeos(bits), glowM(0xc8441a, .7)); crack.position.y = .035; w.scene.add(crack);
    meshOf(mergeGeos(lips), 0x141018, w.scene, .03);
    for (const z of [-6, 1, 8]) { const l = new THREE.PointLight(0xff7a3a, 1.2, 7, 2); l.position.set(0, .6, z); w.scene.add(l); }
    // pillow lava: round black lumps squeezed out of the crack, still faintly glowing at the seams
    const pg = grp(PILLOW[0], 0, PILLOW[1], 0, side.L);
    pillowGlow = T(0x1e1a24, {emissive:0xff5a1a, emissiveIntensity:.25});
    for (let i = 0; i < 9; i++) { const p = sph(.28 + Math.random()*.22, pillowGlow, (Math.random() - .5)*1.4, .15 + Math.random()*.25, (Math.random() - .5)*1.6, pg, 12); p.scale.y = .7; outline(p, 1.04); }
    // a black smoker: a chimney of minerals, puffing hot black water, with tube worms round its foot
    const ch = grp(SMOKER[0], 0, SMOKER[1]);
    for (let i = 0; i < 5; i++) { const r = .7 - i*.11; outline(add(new THREE.CylinderGeometry(r*.85, r, .62, 9), T([0x2a2428, 0x3a3034][i % 2]), (i % 2)*.06, .31 + i*.6, 0, ch), 1.03); }
    for (let i = 0; i < 16; i++) { const a = i/16*Math.PI*2 + Math.random()*.3, r = .95 + Math.random()*.5, wg = grp(Math.cos(a)*r, 0, Math.sin(a)*r, 0, ch), h = .4 + Math.random()*.4;
      add(new THREE.CylinderGeometry(.04, .05, h, 6), T(0xe9e0d0), 0, h/2, 0, wg); sph(.08, T(0xd8303a), 0, h + .04, 0, wg, 8);
      worms.push({g:wg, ph:Math.random()*6}); }
    // the explorer's pebble, carried to the crack and riding away on whichever plate it's dropped on
    pebble = sph(.15, T(0xc8c0b0), 0, .1, 0, null, 8); pebble.visible = false; outline(pebble, 1.1);
    // light coming down from far above, for a sense of the deep water overhead
    const ray = tex(32, 128, (c, cw, chh) => { const g = c.createLinearGradient(0, 0, 0, chh); g.addColorStop(0, 'rgba(160,210,255,.5)'); g.addColorStop(1, 'rgba(160,210,255,0)'); c.fillStyle = g; c.fillRect(0, 0, cw, chh); });
    for (let i = 0; i < 6; i++) { const r = new THREE.Mesh(new THREE.PlaneGeometry(2.5, 26), new THREE.MeshBasicMaterial({map:ray, transparent:true, depthWrite:false, blending:THREE.AdditiveBlending, opacity:.14, fog:false}));
      r.position.set(-12 + i*5, 20, -14 + (i % 3)*5); r.rotation.z = .25; w.scene.add(r); }
    for (let i = 0; i < 5; i++) { const f = grp(0, 3 + i*.7, 0), col = [0xffb070, 0x7ab0d8, 0xffd36b][i % 3];
      const b = sph(.22, T(col), 0, 0, 0, f, 10); b.scale.set(1.6, .8, .6); outline(b, 1.08);
      const tl = add(new THREE.ConeGeometry(.16, .3, 4), T(col), -.42, 0, 0, f); tl.rotation.z = Math.PI/2;
      fish.push({g:f, r:6 + i*2.2, sp:(.25 + i*.05)*(i % 2 ? 1 : -1), a:i*1.3, cz:-3 + i}); }
  });
  // marine snow: specks of dust drifting down through the light
  const N = 500, sp = new Float32Array(N*3);
  for (let i = 0; i < N; i++) sp.set([(Math.random() - .5)*40, Math.random()*14, (Math.random() - .5)*34], i*3);
  const sg = new THREE.BufferGeometry(); sg.setAttribute('position', new THREE.BufferAttribute(sp, 3));
  const snowPts = new THREE.Points(sg, new THREE.PointsMaterial({size:.12, map:glowTex, color:0xe0f0ff, transparent:true, depthWrite:false, opacity:.7}));
  snowPts.frustumCulled = false; w.scene.add(snowPts);
  const smoke = puffs(w, SMOKER[0], 3.2, SMOKER[1], {rate:3, rise:1.1, size:1.4, color:0x18141c, opacity:.75, spread:.3, life:3.2});

  const bus = tripBus(w); bus.gear('sub');
  // headlights, for the dark down here
  const beam = new THREE.SpotLight(0xfff0c8, 2.2, 22, .5, .5, 1.2); beam.position.set(3.2, 1.2, 0); bus.body.add(beam);
  beam.target.position.set(10, -1.5, 0); bus.body.add(beam.target);
  const cls = classmates(w, t, [BUS[0] - 1.6, BUS[1] - 1.6]);

  // everyone wears a bubble helmet down here, and bobs a little as they go
  const glass = new THREE.MeshBasicMaterial({color:0xbfeaff, transparent:true, opacity:.22, depthWrite:false});
  const rimGlass = new THREE.MeshBasicMaterial({color:0xe8faff, transparent:true, opacity:.35, side:THREE.BackSide, depthWrite:false});
  const helmet = () => { const h = new THREE.Mesh(new THREE.SphereGeometry(.5, 20, 14), glass); h.add(new THREE.Mesh(new THREE.SphereGeometry(.51, 20, 14), rimGlass)); h.position.y = .04; return h; };
  for (const id in cls.n) cls.n[id].model.head.add(helmet());
  let myHelmet = null, spread = 0, splits = 0;
  w.anims.push((dt, tt) => {
    for (const id in cls.n) cls.n[id].model.body.position.y += Math.sin(tt*1.6 + id.length)*.05;
    if (myHelmet) hero.body.position.y += Math.sin(tt*1.6)*.05;
    for (let i = 0; i < N; i++) { sp[i*3 + 1] -= dt*.25; sp[i*3] += Math.sin(tt*.3 + i)*dt*.05; if (sp[i*3 + 1] < 0) sp[i*3 + 1] += 14; }
    sg.attributes.position.needsUpdate = true;
    for (const f of fish) { f.a += dt*f.sp; f.g.position.set(Math.cos(f.a)*f.r, f.g.position.y, f.cz + Math.sin(f.a)*f.r*.6); f.g.rotation.y = -f.a + (f.sp > 0 ? -Math.PI/2 : Math.PI/2); }
    for (const wm of worms) { wm.g.rotation.z = Math.sin(tt*1.4 + wm.ph)*.25; wm.g.rotation.x = Math.cos(tt*1.1 + wm.ph)*.2; }
    crack.material.emissiveIntensity = .7 + Math.sin(tt*2.2)*.12;
    // Mo does the splits as the plates under each foot slide apart
    const mo = cls.n.mo.model;
    if (splits > 0) { const a = Math.min(.95, splits*1.15); mo.legL.rotation.z = -a; mo.legR.rotation.z = a; mo.body.position.y -= .55*(1 - Math.cos(a)); }
    else { mo.legL.rotation.z = mo.legR.rotation.z = 0; }
  });
  // the plates spread k of the way: the sides slide out and fresh rock fills the gap
  const spreadTo = k => { spread = k; side.L.position.x = -SPREAD*k; side.R.position.x = SPREAD*k; fresh.scale.x = Math.max(.001, 2*SPREAD*k + .5); };

  // ---------- what the class finds ----------
  const say = t.say;
  let goggled = false;
  cls.find('juniper', {name:'pillow', at:[PILLOW[0] + .8, PILLOW[1] + 1.1, -2.5], pose:'crouch', call:"Come feel these lumpy rocks!", after:["Brand-new sea floor. Fresh from the crack!"],
    async scene(){
      pillowGlow.emissiveIntensity = .6;
      await say([['juniper', "Touch this lumpy rock, {name}. It's still a tiny bit warm!"]]);
      const pick = await t.ask('juniper', "Where do you think this rock came from?", ["Out of the crack", "It fell off a boat", "It was always here"]);
      await say([['juniper', pick === 0 ? "Yes! Hot lava oozed out of the crack." : "Nope! Hot lava oozed out of that glowing crack."],
                 ['juniper', "The cold water cooled it into new rock. Brand-new sea floor!"]]);
      pillowGlow.emissiveIntensity = .25;
    }});
  cls.find('mo', {name:'pebble', at:[MO[0], MO[1], 0], pose:'still', call:"{name}! Look at my feet!", after:["My legs still feel a million years old."],
    async scene(){
      await say([['mo', "Look! One foot on each side of the crack."], ['mo', "Each foot's on a different plate!"],
                 ['mo', "Here's a pebble. Drop it right by the crack, {name}."]]);
      t.hold(pebble); Sound.tone(500, {type:'triangle', dur:.1, vol:.05});
      for (;;) {
        // the whole floor is in reach, so it can be dropped anywhere; the glow marks the crack by Mo's feet
        await t.free(t.use(w, {name:'Pebble', x:0, z:0, range:30, verb:'Drop the pebble', short:'Drop', glow:[.7, .4, MO[1] + .4]}), 'Drop the pebble right by the crack');
        if (Math.abs(player.x) < 1.6 && Math.abs(player.z - MO[1]) < 2.4) break;
        await say([['mo', "Closer to the crack!"]]);
      }
      const plate = player.x < 0 ? side.L : side.R, p = t.drop(), y0 = p.position.y;
      plate.attach(p); p.scale.setScalar(1);
      // never in the glowing crack itself, where there's no plate yet to carry it
      p.position.x = Math.sign(player.x || 1)*Math.max(.55, Math.abs(p.position.x + plate.position.x)) - plate.position.x;
      await t.tween(.4, k => { p.position.y = y0 + (.1 - y0)*k*k; });
      Sound.tone(300, {type:'triangle', dur:.12, vol:.06});
      const pick = await t.ask('mo', "What will happen to your pebble?", ["New rock carries it away from the crack", "The crack swallows it", "Nothing happens"]);
      await say([['mo', "Let's find out. Time goggles on!"]]);
      const from = spread;
      await goggles(t, {years:1e6, dur:7,
        shot: (pos, look) => { pos.set(0, 3.4, MO[1] + 7.5); look.set(0, .2, MO[1] - 1.5); },
        step: k => { spreadTo(from + (1 - from)*k); splits = k; }});
      await say([['mo', pick === 0 ? "You were right! New rock carried your pebble away from the crack." : "Whoa! New rock carried your pebble away from the crack."],
                 ['mo', "And my feet slid apart too! Whoa, what a stretch!"],
                 ['sparks', "The plates pull apart. Hot rock fills the gap and makes new sea floor."],
                 ['basil', "The crack didn't swallow the pebble. It carried it away!"]]);
      const line = worries(2);
      const s0 = splits; await t.tween(.6, k => { splits = s0*(1 - k); });
      await say([['basil', line]]);
      goggled = true;
    }});
  cls.find('pip', {name:'stripes', at:[2.6, -3.4, -Math.PI/2], when: () => goggled, call:"Come look at the stripes!", after:["Newest by the crack, oldest far away. Like rings in a tree!"],
    async scene(){
      const pip = cls.n.pip;
      t.cut((pos, look) => { pos.set(5, 4.2, 3.8); look.set(5, 0, -3.4); });
      await say([['pip', "See the stripes on the floor? Here by the crack, the rock is shiny and black."],
                 ['pip', "New rock comes out of the crack. So go stand on the oldest rock!"]]);
      // how many bands out from the crack the explorer stands; the last ones in reach are the oldest
      const band = () => Math.floor((Math.abs(player.x) - .35 - SPREAD*spread)/BAND), OLDEST = 5;
      const t0 = game.elapsed, said = new Set();
      const beside = () => { pip.pose = null; pip.goal = {x:Math.sign(player.x || 1)*Math.max(2.6, Math.abs(player.x) - 1.2), z:player.z - .9, angle:Math.PI}; };
      const comment = (id, line) => { if (said.has(id)) return false; said.add(id); beside(); say([['pip', line]]); return true; };
      await t.free(t.until(() => {
        const b = band(), wait = game.elapsed - t0;
        if (b >= OLDEST) return true;
        if (b >= 3) comment('mud', "Muddier and muddier! Keep going!");
        else if (b >= 1) comment('brown', "Browner here. A little dusty!");
        if (wait > 10 && b < 1) comment('shiny', "Hmm. Is shiny black rock old? Look for the muddiest rock!");
        if (wait > 20 && comment('lead', "Follow me, {name}! Way out here.")) pip.goal = {x:SPREAD + 8.6, z:-3.4, angle:Math.PI};
        return wait > 40;
      }), 'Go stand on the oldest rock');
      await say([['pip', band() >= OLDEST ? "Yes! It's had the longest time to get muddy." : "Out here! It's had the longest time to get muddy."],
                 ['pip', "Newest by the crack, older and older as you go. Like rings in a tree!"]]);
      t.cut(null);
    }});
  cls.find('basil', {name:'smoker', at:[SMOKER[0] + 1.4, SMOKER[1] + 1.3, -2.3], call:"That chimney is puffing black smoke!", after:["Worms with no sunlight. Huh. I guess they're brave too."],
    async scene(){
      smoke.burst = 1.2;
      t.cut((pos, look) => { pos.set(SMOKER[0] + 3.2, 2.4, SMOKER[1] + 3.6); look.set(SMOKER[0], 1.4, SMOKER[1]); });
      await say([['basil', "{name}, that chimney is puffing black smoke. Underwater!"],
                 ['basil', "It's really super-hot water, from under the crack. And look at the worms!"]]);
      const pick = await t.ask('basil', "It's so dark down here. Can plants grow?", ["No, there's no sunlight", "Yes, lots of plants"]);
      await say([['basil', pick === 0 ? "Right, no sunlight at all." : "Nope, it's much too dark. No sunlight at all."],
                 ['basil', "The worms get their food from the hot water instead. So weird!"]]);
      t.cut(null);
    }});
  cls.hint = () => goggled ? (cls.saw('stripes') ? "Back to the bus whenever you're ready, {name}! Or go see anyone still waving." : "Pip is waving at you. Go see the stripes!") :
    "Mo is standing on the crack, and Juniper found some lumpy rocks. Go see! I think there's a job for my time goggles.";

  return {world:w, bus, cls,
    // the sub sinks down through the dark water, lights blazing, and settles by the crack
    async arrive(){
      bus.gear('sub');
      t.watch(w, (pos, look) => { pos.set(-3, 4.5, 15); look.copy(bus.root.position); });
      Sound.tone(160, {type:'sine', dur:5, vol:.06, f2:110});
      await bus.fly([[26, 22, 22], [20, 14, 16], [14, 7, 11], [10.5, 2.4, 8], [BUS[0], .5, 6], [BUS[0], 0, BUS[1]]], 7);
      bus.park(BUS[0], 0, BUS[1], BUS_RY);
      Sound.tone(330, {type:'triangle', dur:.12, vol:.08}); Sound.tone(494, {type:'triangle', t:.1, dur:.18, vol:.08});
      const [dx, dz] = bus.door(.6);
      t.cut((pos, look) => { pos.set(9, 8.5, 14); look.set(0, 0, -1); });
      cls.arrive({sparks:[dx - .4, dz + 1.3, -Math.PI/2]});
      await t.wait(2.6);
      await say([['sparks', "Helmets on, everyone! This glowing crack is where two plates pull apart."]]);
      myHelmet = helmet(); hero.head.add(myHelmet);
      t.onEnd(() => { if (myHelmet) { myHelmet.parent.remove(myHelmet); myHelmet = null; } });
      t.play(w, [dx, dz, -Math.PI/2]);
      t.goal('Visit anyone who waves!');
    },
    async explore(){
      await t.until(() => cls.saw('pebble') && !game.cutscene);
      await t.wait(.6);
      if (await t.more('sparks', "Want to hear something amazing about this crack?"))
        await say([['sparks', "It runs all the way to Iceland, where it comes up on land."], ['sparks', "People there can walk between two plates!"]]);
      await say([['sparks', "Next: what happens when plates crash together? Everyone aboard!"], ...cls.stillWaving()]);
      cls.gather([bus.root.position.x - 1.6, bus.root.position.z - 1.2, 0]);
      await cls.board(bus);
    },
    // up toward the light, until the sub is out of sight
    async depart(){
      if (myHelmet) { myHelmet.parent.remove(myHelmet); myHelmet = null; }
      for (const id in cls.n) { cls.n[id].model.root.visible = false; cls.n[id].label.visible = false; }
      t.watch(w, (pos, look) => { pos.set(-2, 3, 14); look.set(bus.root.position.x, bus.root.position.y, bus.root.position.z); });
      Sound.hiss({dur:3, vol:.08, type:'lowpass', freq:500});
      await bus.fly([[BUS[0], 0, BUS[1]], [BUS[0], 2, 1], [7, 8, -4], [4, 18, -10], [2, 32, -14]], 4.2, {roll:.4});
    },
  };
}
