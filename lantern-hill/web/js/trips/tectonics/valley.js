// The valley where plates crash. Two plates push together here, very slowly, and the land between them
// crumples up: into snowy peaks all along the north, and, where a stream has cut a winding canyon into
// them, into rock layers you can see bent into folds, the way a pushed rug bunches up.

import * as THREE from 'three';
import { T, XF, add, bAdd, bFlush, clamp01, ease, fr, frand, glowTex, grad, leafCloud, mergeGeos, meshOf, outline, sph, tex } from '../../core/kit.js';
import { Sound } from '../../core/sound.js';
import { inWorld } from '../../core/world.js';
import { flower, grassTuft } from '../../hq/wider.js';
import { player } from '../../player.js';
import { game } from '../../state.js';
import { tripBus } from '../bus.js';
import { classmates } from '../class.js';
import { goggles } from '../goggles.js';
import { curio, tripWorld } from '../stop-kit.js';
import { butterflies, flock, marmot, mountainGoat, soarer } from './land-life.js';
import { storySky } from '../sky.js';

const sm = (a, b, v) => { const k = clamp01((v - a)/(b - a)); return k*k*(3 - 2*k); };
const bump = (x, z, cx, cz, rx, rz) => { const d = Math.hypot((x - cx)/rx, (z - cz)/rz); return d < 1 ? .5 + .5*Math.cos(d*Math.PI) : 0; };

// The canyon winds in from the meadow, north and then west, deeper into the mountains as it goes; s runs
// 0 at its mouth to 1 at its head, a round bay under the tallest, most folded wall.
const CANYON = new THREE.CatmullRomCurve3([[-7, -3], [-8.4, -10], [-10.6, -17], [-15, -23], [-22, -25.6], [-30, -26.6]].map(([x, z]) => new THREE.Vector3(x, 0, z)))
  .getSpacedPoints(60).map(p => [p.x, p.z]);
const halfW = s => 3 + 1.1*sm(0, .4, s) + 2.6*sm(.72, 1, s);
const floorY = s => 1 + 2.4*s;
const HEAD = CANYON.at(-1);
// the mountains beyond, [x, z, height, radius]
const PEAKS = [[-58, -78, 44, 30], [-22, -66, 36, 24], [10, -96, 56, 34], [42, -70, 40, 26], [80, -88, 48, 32], [-100, -64, 36, 28],
  [118, -56, 34, 28], [-30, -126, 52, 40], [52, -132, 58, 40], [-140, -110, 50, 40], [150, -118, 52, 40], [-4, -60, 22, 18]];
const riverZ = x => 21 + 1.6*Math.sin(x*.07 + .5) + .7*Math.sin(x*.19);
const RIVER_Y = -.62;
const BUS = [12, 4], BUS_RY = Math.PI/2;
const RUG = [-29.4, -29.2], HILL = [-22, -14], LOOKOUT = [6, -9], ROCK = [-5, 6.6], POOL = [HEAD[0] - 3, HEAD[1] + 3.2];
// the time goggles' cutaway sits deep under the valley, where nothing above it can be seen
const CUT = [0, -80, 0];

// the land with no canyon or stream cut into it: rolling meadow, foothills rising north to the mountains,
// steep slopes east and west, a river along the south
function land(x, z){
  const base = .5*Math.sin(x*.11 + .6)*Math.cos(z*.13 - .3) + .3*Math.sin(x*.23 - z*.17 + 1.1) + .14*Math.sin(x*.41 + z*.37);
  const foot = 4.2*sm(-4, -21, z + 2.5*Math.sin(x*.09));
  const mount = 9*sm(-25, -52, z + 4*Math.sin(x*.07 + 1) + 2*Math.sin(x*.19));
  // a band of cliffs where the foothills end and the mountains begin, and more along the valley's sides
  const cliff = 6*sm(-22.5, -25.5, z + 2*Math.sin(x*.13) + 1.2*Math.sin(x*.31));
  const ex = x + 3*Math.sin(z*.13), wx = x + 3*Math.sin(z*.11 + 2);
  const sides = 6*sm(30, 32.5, ex) + 12*sm(32, 48, ex) + 6*sm(-32, -34.5, wx) + 12*sm(-34, -50, wx);
  let pk = 0; for (const [px, pz, ph, pr] of PEAKS) { const d = Math.hypot(x - px, z - pz)/pr; if (d < 1) pk += ph*(1 - d)**1.6; }
  const hills = 4.4*bump(x, z, HILL[0], HILL[1], 12, 8.5) + 6.5*bump(x, z, -37, -17, 8, 7.5) + 4.2*bump(x, z, -1, -18.5, 6.5, 5);
  let h = base + foot + mount + cliff + sides + 7*sm(27, 50, z) + pk + hills;
  const dr = Math.abs(z - riverZ(x)); if (dr < 4.6) h += (-1.5 - h)*(1 - sm(2.2, 4.6, dr));
  return h;
}
// nearest point on a polyline: its distance, how far along (0 to 1), and the way it runs there
function along(pts, x, z){
  let best = Infinity, bi = 0, bt = 0;
  for (let i = 0; i < pts.length - 1; i++) { const [ax, az] = pts[i], [bx, bz] = pts[i + 1], dx = bx - ax, dz = bz - az;
    const t = clamp01(((x - ax)*dx + (z - az)*dz)/(dx*dx + dz*dz)), d = (x - ax - dx*t)**2 + (z - az - dz*t)**2;
    if (d < best) { best = d; bi = i; bt = t; } }
  const [ax, az] = pts[bi], [bx, bz] = pts[bi + 1], l = Math.hypot(bx - ax, bz - az);
  return {d:Math.sqrt(best), s:(bi + bt)/(pts.length - 1), tx:(bx - ax)/l, tz:(bz - az)/l};
}
const canyonAt = (x, z) => x > 6 || z > 6 || x < -48 || z < -40 ? null : along(CANYON, x, z);
// the stream rises in a pool at the canyon's head, runs down its south side and across the meadow to the river
const STREAM = (() => {
  const inC = CANYON.slice().reverse().map(([x, z], i, a) => { const s = 1 - i/(a.length - 1), q = along(CANYON, x, z), o = 1.8*sm(.15, .45, s);
    return [x - q.tz*o, z + q.tx*o]; }).filter((p, i) => i > 4);
  const pts = [POOL, ...inC, [-5.6, 1], [-7.6, 7], [-5.4, 13], [-7, 18], [-6.4, 26]];
  return new THREE.CatmullRomCurve3(pts.map(([x, z]) => new THREE.Vector3(x, 0, z))).getSpacedPoints(140).map(p => [p.x, p.z]);
})();
// Basil's pebble, where the stream comes out of the canyon
const PEB = STREAM.reduce((b, p) => Math.hypot(p[0] + 6, p[1] + .5) < Math.hypot(b[0] + 6, b[1] + .5) ? p : b);
const streamAt = (x, z) => x > 2 || x < -40 || z < -31 ? null : along(STREAM, x, z);
// spots smoothed level for something to sit on: [x, z, radius]
const FLATS = [[BUS[0], BUS[1], 4.2], [ROCK[0], ROCK[1], 1.6], [LOOKOUT[0], LOOKOUT[1], 1.4], [RUG[0], RUG[1], 2.2]];
const FLAT_Y = FLATS.map(([x, z]) => land(x, z));
function H(x, z){
  let h = land(x, z);
  const c = canyonAt(x, z);
  if (c) { const fl = Math.min(floorY(c.s), h), w = halfW(c.s), k = sm(w, w + 2 + .16*(h - fl), c.d); h = fl + (h - fl)*k; }
  FLATS.forEach(([fx, fz, r], i) => { const y = i === 3 ? floorY(1) : FLAT_Y[i]; h = y + (h - y)*sm(r, r + 2.2, Math.hypot(x - fx, z - fz)); });
  const st = streamAt(x, z); if (st && st.d < 1.2) h -= .36*(1 - sm(.35, 1.15, st.d));
  return h;
}
const slope = (x, z) => Math.hypot(H(x + .25, z) - H(x - .25, z), H(x, z + .25) - H(x, z - .25))/.5;
// how far into the canyon a spot is: 0 out on the meadow, 1 deep between its walls
const inCanyon = (x, z) => { const c = canyonAt(x, z); return c ? (1 - sm(halfW(c.s) - .5, halfW(c.s) + 2, c.d))*sm(.08, .3, c.s) : 0; };

export function buildValley(t){
  const w = tripWorld({title:'Where Plates Crash', bg:0xe6cdb8, sky:0xfff0dc, groundCol:0x4a5a3a, hemi:.8, sunCol:0xffd6a4, sunI:.9, fogNear:70, fogFar:340,
    cam:{oy:7.4, oz:9.2, oyP:9.4, ozP:10.6}});
  w.far = 520;
  w.ground = H;
  // walkable wherever the ground is gentle: the canyon walls, the mountain flanks and the steep slopes east
  // and west are where it stops, with the river along the south
  w.bounds = (x, z) => z < riverZ(x) - 3 && slope(x, z) < 1.1;
  w.surface = (x, z) => inCanyon(x, z) > .5 || slope(x, z) > .5 ? 'stone' : 'grass';
  w.area = (x, z) => inCanyon(x, z) > .5 ? 'The Folded Canyon' : Math.hypot(x - HILL[0], z - HILL[1]) < 9 ? 'Lookout Hill' : 'Crumpled Mountain Valley';
  // in the canyon the camera drops low and swings round to look up it, so its walls stand tall either side
  w.camAt = (x, z, oy, oz) => {
    const k = inCanyon(x, z); if (!k) return null;
    const c = canyonAt(x, z), sx = -c.tz, sz = c.tx, side = sz < 0 ? -1 : 1;
    const ox = (-c.tx*6.2 + sx*side*1.4)*k, oz2 = oz + ((-c.tz*6.2 + sz*side*1.4) - oz)*k, gy = H(x, z);
    return [ox, Math.max(oy + (3.3 - oy)*k, H(x + ox, z + oz2) - gy + 1.6), oz2];
  };
  w.spawn = [BUS[0] - 1.6, BUS[1] - 1.6, Math.PI];
  storySky(w, {sun:[-9, 16, 7], clouds3d:[[-90, 62, -70, 26], [60, 70, -110, 30], [100, 46, -20, 22], [-120, 50, 10, 26], [140, 56, 40, 28], [-50, 40, 70, 18]]});
  const S = {rugP:0, rugTo:0, lay:-1};
  let rug, rugUnder, fossil, pebble, backRoll;
  inWorld(w, () => {
    buildLand(w);
    // a seat of rock by the stream with a view of the peaks, and a picnic on it
    const seat = meshOf(new THREE.DodecahedronGeometry(.62, 1), 0x8a7a72, w.scene, .03); seat.position.set(ROCK[0], H(...ROCK) + .12, ROCK[1] - .55); seat.scale.set(1.25, .62, .9);
    const gy = H(...ROCK);
    box2(.22, .06, .1, 0xd9a441, ROCK[0] + .45, gy + .5, ROCK[1] - .5, .3);
    sph(.09, T(0xc0483a), ROCK[0] - .4, gy + .52, ROCK[1] - .45, null, 10);
    // the shell, in a knob of the bluish shell rock poking out of the hilltop
    const hy = H(...HILL);
    meshOf(mergeGeos([[new THREE.DodecahedronGeometry(.7, 1), XF(HILL[0] + .3, hy + .05, HILL[1] - .9, 1.3, .55, 1)], [new THREE.DodecahedronGeometry(.45, 1), XF(HILL[0] - .5, hy, HILL[1] - .4, 1, .5, 1.1)]]), 0x56688c, w.scene, .03);
    fossil = sph(.16, T(0xf3e6c8), HILL[0] + .6, hy + .08, HILL[1] - .2, null, 10); fossil.scale.set(1, .4, .9); outline(fossil, 1.12);
    for (let k = 0; k < 4; k++) add(new THREE.BoxGeometry(.02, .03, .3), T(0xb89a72), (k - 1.5)*.05, .1, 0, fossil, false).rotation.y = (k - 1.5)*.4;
    // Basil's pebble, round and pale among the darker stones in the stream
    const pb = PEB;
    pebble = sph(.09, T(0xe6d8c4), pb[0], H(...pb) + .12, pb[1], null, 12); pebble.scale.set(1.25, .7, 1); outline(pebble, 1.15);
  });
  rug = buildRug(w);
  const crash = buildCutaway(w);
  const bus = tripBus(w);
  const door = () => bus.door(.6);
  const cls = classmates(w, t, door());
  const say = t.say;
  // Juniper carries the picnic rug rolled up on her back, until she shakes it out
  {
    const j = cls.n.juniper.model; backRoll = new THREE.Group(); backRoll.position.set(0, .98, -.44); j.body.add(backRoll);
    const r = add(new THREE.CylinderGeometry(.13, .13, .66, 14), T(0xffffff, {map:rug.tex}), 0, 0, 0, backRoll); r.rotation.z = Math.PI/2; outline(r, 1.06);
    for (const sx of [-.2, .2]) add(new THREE.TorusGeometry(.14, .018, 5, 14), T(0x6b4430), sx, 0, 0, backRoll, false).rotation.y = Math.PI/2;
  }
  // the shell on the hilltop catches the light once Pip has spotted it
  const glint = new THREE.Sprite(new THREE.SpriteMaterial({map:glowTex, color:0xfff6d0, transparent:true, depthWrite:false, blending:THREE.AdditiveBlending, opacity:0}));
  glint.scale.set(1.4, 1.4, 1); glint.position.copy(fossil.position).y += .25; w.scene.add(glint);
  let glinting = false;
  w.anims.push((dt, tt) => {
    if (S.lay >= 0 && S.lay < 1) { S.lay = Math.min(1, S.lay + dt/2.8); rug.pose(S.lay, 0); }
    else if (S.rugP < S.rugTo) { S.rugP = Math.min(S.rugTo, S.rugP + dt/1.6); rug.pose(1, ease(S.rugP)); }
    glint.material.opacity = glinting ? .3 + .7*Math.abs(Math.sin(tt*2.5)) : 0; glint.material.rotation = tt;
  });
  const wide = (pos, look) => { pos.set(BUS[0] - 2, H(...BUS) + 9, BUS[1] + 17); look.set(-6, 3, -12); };
  // classmates bound for somewhere round a bend go by way of these
  const via = (k, pts) => { const last = k.goal; const step = i => i < pts.length ? {x:pts[i][0], z:pts[i][1], run:true, then: () => { k.goal = step(i + 1); }} : last; k.goal = step(0); };

  // ---------- what the class finds ----------
  let crumpled = false;
  const ry = H(...RUG);
  cls.find('juniper', {name:'rug', at:[RUG[0] - 2.5, RUG[1] + .3, Math.PI/2], pose:'point', call:"Come look at this cliff!", after:["Squish the ground hard enough, and you get mountains!"],
    async scene(){
      await say([['juniper', "Look at the cliff, {name}! Stripy rock, all bent and wavy."]]);
      const k = cls.n.juniper; k.pose = null;
      // the explorer steps aside to watch, off the rug's path
      player.x = RUG[0] + 2; player.z = RUG[1] + 1.3; player.angle = -2.2;
      t.cut((pos, look) => { pos.set(RUG[0] - 1.4, ry + 4, RUG[1] + 7); look.set(RUG[0], ry + .1, RUG[1] - .6); });
      await say([['juniper', "Good thing I brought my picnic rug. Watch this!"]]);
      backRoll.visible = false; S.lay = 0; rug.root.visible = true;
      Sound.tone(520, {type:'triangle', dur:.12, vol:.06, f2:780}); Sound.hiss({dur:1.1, vol:.07, type:'bandpass', freq:900, f2:400, q:.7, t:.5});
      await t.until(() => S.lay >= 1);
      k.pose = 'point';
      const pick = await t.ask('juniper', "What will the rug do if you push one end?", ["Bunch up into bumps", "Stay flat", "Rip in half"]);
      await say([['juniper', "Let's find out! Push the end of the rug."]]);
      for (let i = 1; i <= 3; i++) {
        // the rug's far end, which moves in as it bunches up
        const x = RUG[0] + rug.L/2 - rug.L*.36*S.rugTo + .45;
        await t.free(t.use(w, {name:'Rug', x, z:RUG[1], y:ry, range:1.4, verb:'Push the rug', short:'Push', glow:[x - .3, ry + .5, RUG[1]]}), 'Push the end of the rug');
        S.rugTo = i/3; Sound.hiss({dur:.6, vol:.08, type:'bandpass', freq:500 + i*80, q:.8});
        await t.wait(.8);
      }
      t.cut((pos, look) => { pos.set(RUG[0] + .6, ry + 5.6, RUG[1] + 7); look.set(RUG[0] - .4, ry - .2, RUG[1] - 1.6); });
      await say([['juniper', pick === 0 ? "You got it! It bunched up into bumps." : "Look! It bunched up into bumps."],
                 ['juniper', "The rock in the cliff got pushed the same way, so it bent."],
                 ['juniper', "When plates crash, the ground crumples up. Big crumples are mountains!"]]);
      t.cut(null);
    }});
  cls.find('pip', {name:'peaks', at:[LOOKOUT[0], LOOKOUT[1], Math.PI], pose:'peer', call:"These mountains are HUGE! Come see!", after:["Up, up, up. A few millimeters every year."],
    async scene(){
      await say([['pip', "Look how tall these mountains are, {name}!"], ['pip', "Two plates are crashing right here. Very, very slowly."]]);
      const pick = await t.ask('pip', "If two plates keep crashing, what happens to the land between?", ["It crumples up into mountains", "It sinks away", "Nothing happens"]);
      await say([['sparks', "Let's see! Time goggles on, {name}."]]);
      await goggles(t, {shot:crash.shot, years:4e7, dur:7, step:crash.step});
      // back from deep under the valley in one cut, to Pip with the peaks behind
      const gy = H(...LOOKOUT);
      t.cut((pos, look) => { pos.set(LOOKOUT[0] + 2, gy + 2.4, LOOKOUT[1] + 5); look.set(LOOKOUT[0] - 1, gy + 7, LOOKOUT[1] - 20); });
      await say([['pip', pick === 0 ? "You were right! It crumpled up into a mountain!" : "Whoa! It didn't do that. It crumpled up into a mountain!"],
                 ['pip', "And see the blue layer with the shells? It went all the way to the top!"],
                 ['pip', "Hey! Something's glinting up on that hill!"]]);
      crumpled = glinting = true;
      t.cut(null);
      const k = cls.n.pip; k.pose = null;
      k.goal = {x:HILL[0] + 1.3, z:HILL[1] - .9, angle:-.8, run:true, then: () => { k.pose = 'crouch'; k.spotted = game.elapsed + 1; }};
      via(k, [[-6, -5], [-14, -9]]);
    }});
  cls.find('pip', {name:'shell', at:[HILL[0] + 1.3, HILL[1] - .9, -.8], pose:'crouch', when: () => crumpled, call:"Up here! Something's glinting!", after:["A seashell on a mountain. Wait till I tell everyone!"],
    async scene(){
      await say([['pip', "It's right here somewhere, {name}. Can you dig it out?"]]);
      const [fx, fy, fz] = fossil.position.toArray();
      await t.free(t.use(w, {name:'Glinting thing', x:fx, z:fz, y:H(fx, fz), range:1.3, verb:'Dig out the glinting thing', short:'Dig', glow:[fx, fy + .45, fz]}),
        'Find the glinting thing on the hill');
      glinting = false;
      // the explorer steps round beside it, out from between the camera and the shell
      player.x = fx + 1; player.z = fz + 1.1; player.angle = -2.4;
      t.cut((pos, look) => { pos.set(HILL[0] - 1.6, fy + 2.2, HILL[1] + 3); look.set(HILL[0] + .6, fy + .1, HILL[1] - .2); });
      fossil.position.y = fy + .42; Sound.tone(880, {type:'triangle', dur:.2, vol:.07}); Sound.tone(1318, {type:'triangle', t:.12, dur:.4, vol:.06});
      await say([['pip', "A seashell! Made of stone. Way up on a mountain!"],
                 ['pip', "Remember the time goggles? The shell layer went all the way up."],
                 ['pip', "This mountain top was once the sea floor!"]]);
      t.cut(null);
    }});
  const [px, pz] = [PEB[0] + 1.3, PEB[1] + .3];
  cls.find('basil', {name:'pebble', at:[px, pz, -Math.PI/2], pose:'crouch', call:"Um… can somebody come here?", after:["A pebble is just a very, very small mountain."],
    async scene(){
      await say([['basil', "Those mountains are SO tall, {name}. And that canyon is so steep."],
                 ['basil', "What if a mountain falls on us?"],
                 ['sparks', "Mountains don't fall down all at once, Basil. They wear away, a teeny bit at a time."],
                 ['sparks', "Rain, ice, and this little stream carry bits of mountain away. Pick a pebble out of the water, {name}."]]);
      const [bx, by, bz] = pebble.position.toArray();
      await t.free(t.use(w, {name:'Pebble', x:bx, z:bz, y:by, range:1.4, verb:'Pick up the round pebble', short:'Pick up', glow:[bx, by + .4, bz]}), 'Pick a pebble out of the stream');
      t.hold(pebble); Sound.tone(660, {type:'triangle', dur:.12, vol:.06}); Sound.hiss({dur:.3, vol:.05, type:'highpass', freq:2400});
      t.cut((pos, look) => { pos.set(player.x - 3.4, player.y + 2.4, player.z + 3.4); look.set(player.x + .5, player.y + .8, player.z - .3); });
      const pick = await t.ask('basil', "Why is the pebble so round and smooth?", ["The water rolled it along and rubbed it smooth", "Somebody polished it", "It grew that way"]);
      await say([['basil', pick === 0 ? "Yes! It tumbled all the way down from the mountain, bumping and rolling." : "I bet it was the water! It tumbled all the way down from the mountain, bumping and rolling."],
                 ['sparks', "Every pebble in this stream was once a bit of mountain."],
                 ['basil', "So the crashing plates push the mountains up…"],
                 ['sparks', "…and rain and ice wear them down. Very, very slowly."]]);
      if (await t.more('sparks', "Want to know which one is winning here?"))
        await say([['sparks', "Here, the plates are! These mountains are still growing taller."],
                   ['sparks', "Only a few millimeters a year. Slower than your fingernails grow!"],
                   ['basil', "Slow mountains. Okay. I can handle slow."]]);
      await say([['basil', "Can I keep it? For my rock collection."]]);
      t.drop(); pebble.visible = false;
      t.cut(null);
    }});
  cls.find('mo', {name:'picnic', at:[ROCK[0] - .1, ROCK[1] - .05, 0], pose:'sit', call:"Picnic time! Over here!", after:["Mountains on one side, snacks on the other. Perfect."],
    async scene(){
      await say([['mo', "This rock is the perfect snack spot, {name}."]]);
      const pick = await t.ask('mo', "Want half my granola bar?", ["Yes, please!", "No, thank you"]);
      await say([['mo', pick === 0 ? "Here you go. It's crunchy, like the mountains!" : "More for me! Crunchy, like the mountains."]]);
    }});
  const mountains = () => cls.saw('rug') || cls.saw('peaks');
  cls.hint = () => {
    if (!mountains()) return "How do mountains grow, {name}? Juniper is up the canyon, and Pip is by the mountains. Go see!";
    if (crumpled && !cls.saw('shell')) return "Pip ran up the hill. Something is up there!";
    if (!cls.saw('pebble')) return "Basil is down by the stream. Go see what he found!";
    return "Back to the bus whenever you're ready, {name}! Or go see anyone still waving. Or go exploring: who knows what's up on the high ledges?";
  };
  buildFinds(w, t);

  return {world:w, bus, cls,
    // in over the peaks from the north, round the valley, and down on the meadow
    async arrive(){
      bus.gear(null);
      const by = H(...BUS);
      t.watch(w, (pos, look) => { pos.set(bus.root.position.x*.4 + 6, Math.max(by + 5, bus.root.position.y*.5 + 7), bus.root.position.z*.3 + 26); look.copy(bus.root.position); });
      Sound.tone(200, {type:'sawtooth', dur:4, vol:.03, f2:420, cut:900});
      await bus.fly([[-30, 70, -150], [-10, 46, -70], [6, 22, -24], [18, 10, 8], [BUS[0] + 1, by + 2.4, BUS[1] + 9], [BUS[0], by + .8, BUS[1] + 4], [BUS[0], by, BUS[1]]], 8);
      bus.park(BUS[0], by, BUS[1], BUS_RY);
      Sound.tone(330, {type:'triangle', dur:.12, vol:.08}); Sound.tone(494, {type:'triangle', t:.1, dur:.18, vol:.08});
      const [dx, dz] = door();
      t.cut(wide);
      cls.arrive({sparks:[dx - .8, dz + .9, -Math.PI*.7]});
      // round the bends: Juniper up the canyon, Basil and Pip skirting the bluff
      via(cls.n.juniper, [[-7, -3], [-9, -12], [-12, -19.5], [-18, -24.6]]);
      await t.wait(2.8);
      await say([['sparks', "Look at those mountains! Two plates are crashing together, right under this valley."]]);
      t.play(w, [dx - .2, dz + .4, Math.PI*1.5]);
      t.goal('Visit anyone who waves!');
    },
    async explore(next = "next stop, wherever the plates take us!"){
      await t.until(() => mountains() && !game.cutscene);
      await t.wait(.6);
      await say([['sparks', "Crashing plates push up mountains. Squeeze, crumple, and up they go!"],
                 ['sparks', "A tiny bit each year, for millions of years. That's how mountains grow, {name}!"], ...cls.leaving(next)]);
      cls.gather([bus.root.position.x - 2, bus.root.position.z + 1.2, Math.PI/2]);
      await cls.board(bus);
    },
    // up and away over the peaks
    async depart(){
      for (const id in cls.n) { cls.n[id].model.root.visible = false; cls.n[id].label.visible = false; }
      const by = H(...BUS);
      t.watch(w, (pos, look) => { pos.set(18, by + 6, 20); look.copy(bus.root.position); });
      Sound.hiss({dur:3, vol:.1, type:'bandpass', freq:900, q:.6});
      await bus.fly([[BUS[0], by, BUS[1]], [BUS[0], by + 3, -4], [6, 16, -24], [-10, 40, -60], [-30, 70, -130]], 4.4, {roll:.6});
    },
  };
}
const box2 = (wd, h, d, c, x, y, z, ry) => { const m = add(new THREE.BoxGeometry(wd, h, d), T(c), x, y, z); m.rotation.y = ry; return m; };

// ---------- the land ----------
// One toon surface for all of it. It is grass where it lies gentle and banded rock where it is steep, and
// the bands are level lines of height bent by one fold, so every cliff, canyon wall and mountain flank shows
// the same layers crumpled the same way; high up they go blue with distance and white with snow.
const FOLD = `float fold(vec3 p){ return 3.4*cos((p.x + 24.)*.19)*(.65 + .35*cos(p.z*.09)) + 1.1*sin(p.x*.41 + p.z*.23); }`;
function landMaterial(){
  const strata = tex(128, 1024, (c, cw, ch) => {
    const bands = [['#e9d2a2', 140], ['#b9663e', 104], ['#d9a86c', 168], ['#7a4a3a', 80], ['#c98e58', 128], ['#6f88ae', 92], ['#e2c08e', 148], ['#9a5e4e', 164]];
    let y = 0;
    for (const [col, hgt] of bands) { c.fillStyle = col; c.fillRect(0, y, cw, hgt);
      c.fillStyle = 'rgba(255,255,255,.12)'; c.fillRect(0, y, cw, 10);
      for (let i = 0; i < 40; i++) { c.fillStyle = i % 2 ? 'rgba(40,24,30,.13)' : 'rgba(255,240,220,.16)'; c.beginPath(); c.ellipse(Math.random()*cw, y + 14 + Math.random()*(hgt - 24), 3 + Math.random()*8, 2 + Math.random()*2.5, 0, 0, 7); c.fill(); }
      c.fillStyle = 'rgba(42,26,34,.8)'; c.fillRect(0, y + hgt - 5, cw, 5);
      y += hgt; }
  });
  strata.wrapS = strata.wrapT = THREE.RepeatWrapping;
  const col = h => new THREE.Color(h).convertSRGBToLinear();
  const m = new THREE.MeshToonMaterial({color:0xffffff, gradientMap:grad});
  m.onBeforeCompile = s => {
    Object.assign(s.uniforms, {strata:{value:strata}, gLo:{value:col(0x4f8a46)}, gHi:{value:col(0x76a554)}, gDry:{value:col(0x9aa860)}, gHigh:{value:col(0x5c7e62)},
      sand:{value:col(0xc9ae86)}, far:{value:col(0x6f8cb8)}, snow:{value:col(0xe4e8f0)}});
    s.vertexShader = s.vertexShader.replace('#include <common>', '#include <common>\nattribute float tint; varying float vTint; varying vec3 vWp; varying vec3 vWn;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvWp = (modelMatrix*vec4(transformed, 1.)).xyz; vWn = normalize(mat3(modelMatrix)*objectNormal); vTint = tint;');
    s.fragmentShader = s.fragmentShader.replace('#include <common>', `#include <common>
      uniform sampler2D strata; uniform vec3 gLo, gHi, gDry, gHigh, sand, far, snow; varying float vTint; varying vec3 vWp; varying vec3 vWn;
      ${FOLD}`)
      .replace('#include <color_fragment>', `
      vec3 n = normalize(vWn); float steep = 1. - n.y;
      float mot = sin(vWp.x*.37 + 2.*sin(vWp.z*.23))*sin(vWp.z*.41 + 2.*sin(vWp.x*.19));
      vec3 gr = mix(gLo, gHi, smoothstep(-.35, .55, mot));
      gr = mix(gr, gDry, smoothstep(3., 8., vWp.y)*.45);
      gr = mix(gr, gHigh, smoothstep(12., 26., vWp.y));
      float peb = sin(vWp.x*5.1 + sin(vWp.z*3.7)*2.)*sin(vWp.z*4.3 + sin(vWp.x*2.9)*2.);
      gr = mix(gr, sand*(.9 + .1*smoothstep(.4, .9, peb)), vTint);
      float b = vWp.y - fold(vWp);
      vec3 rk = sRGBToLinear(texture2D(strata, vec2(fract((vWp.x + vWp.z)*.04), b/9.6))).rgb;
      vec3 c = mix(gr, rk, smoothstep(.5, .58, steep + .03*mot));
      c = mix(c, far, smoothstep(45., 110., -vWp.z)*.6);
      c = mix(c, snow, smoothstep(31., 33., vWp.y + 3.*mot)*(1. - smoothstep(.55, .75, steep)*.7));
      diffuseColor.rgb *= c;`);
  };
  return m;
}
function grid(x0, x1, z0, z1, step, keep){
  const nx = Math.round((x1 - x0)/step), nz = Math.round((z1 - z0)/step), pos = new Float32Array((nx + 1)*(nz + 1)*3), tint = new Float32Array((nx + 1)*(nz + 1)), idx = [];
  for (let j = 0; j <= nz; j++) for (let i = 0; i <= nx; i++) { const x = x0 + i*step, z = z0 + j*step, v = j*(nx + 1) + i;
    pos[v*3] = x; pos[v*3 + 1] = H(x, z); pos[v*3 + 2] = z;
    const c = canyonAt(x, z), st = streamAt(x, z), dr = Math.abs(z - riverZ(x));
    tint[v] = Math.max(c ? (1 - sm(halfW(c.s) - 1.2, halfW(c.s) + .4, c.d))*sm(.1, .3, c.s) : 0, st ? 1 - sm(.7, 1.6, st.d) : 0, 1 - sm(3, 4.4, dr)); }
  for (let j = 0; j < nz; j++) for (let i = 0; i < nx; i++) { if (keep && !keep(x0 + (i + .5)*step, z0 + (j + .5)*step)) continue;
    const a = j*(nx + 1) + i, b = a + nx + 1; idx.push(a, b, a + 1, a + 1, b, b + 1); }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('tint', new THREE.BufferAttribute(tint, 1));
  g.setIndex(idx); g.computeVertexNormals(); return g;
}
// a strip of water along a path, a little below the banks
function waterStrip(pts, width, yAt){
  const pos = [], idx = [];
  pts.forEach(([x, z], i) => { const [ax, az] = pts[Math.max(0, i - 1)], [bx, bz] = pts[Math.min(pts.length - 1, i + 1)], l = Math.hypot(bx - ax, bz - az) || 1, nx = -(bz - az)/l, nz = (bx - ax)/l, y = yAt(x, z, i);
    pos.push(x + nx*width/2, y, z + nz*width/2, x - nx*width/2, y, z - nz*width/2);
    if (i) { const a = (i - 1)*2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); } });
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx); g.computeVertexNormals(); return g;
}
function buildLand(w){
  const mat = landMaterial();
  const IN = [-50, 48, -48, 30];
  const near = new THREE.Mesh(grid(IN[0], IN[1], IN[2], IN[3], .5), mat); near.receiveShadow = near.castShadow = true; w.scene.add(near);
  // far off, coarser, overlapping the near land by a cell and tucked under it
  const far = new THREE.Mesh(grid(-280, 280, -300, 160, 4, (x, z) => !(x > IN[0] + 4 && x < IN[1] - 4 && z > IN[2] + 4 && z < IN[3] - 4)), mat);
  far.position.y = -.25; far.receiveShadow = true; w.scene.add(far);
  // the river, and the stream that feeds it
  const water = T(0x4fa6c8, {emissive:0x1a4a6a, emissiveIntensity:.25});
  const river = add(new THREE.PlaneGeometry(560, 14), water, 0, RIVER_Y, 22, null, false); river.rotation.x = -Math.PI/2; river.castShadow = false;
  const sw = new THREE.Mesh(waterStrip(STREAM, 1.05, (x, z, i) => Math.max(RIVER_Y + .02, H(x, z) + .22 - i*.0004)), T(0x63b8d6, {emissive:0x1a4a6a, emissiveIntensity:.25, side:THREE.DoubleSide}));
  sw.receiveShadow = true; w.scene.add(sw);
  const pool = add(new THREE.CircleGeometry(1.5, 20), T(0x63b8d6, {emissive:0x1a4a6a, emissiveIntensity:.25}), POOL[0], H(...POOL) + .2, POOL[1], null, false); pool.rotation.x = -Math.PI/2;
  // little white ripples where the water runs over stones
  for (let i = 4; i < STREAM.length - 4; i += 5) { const [x, z] = STREAM[i];
    bAdd(0xf4f8f6, new THREE.TorusGeometry(.16, .025, 4, 10, Math.PI), XF(x + fr(-.25, .25), H(x, z) + .24, z + fr(-.2, .2), 1, 1, 1, -Math.PI/2, fr(0, 6), 0)); }

  // boulders where the slopes start and fallen rock along the canyon walls, so the edges read as edges
  const rocks = (x, z, s, n = 1) => { for (let k = 0; k < n; k++) { const bx = x + fr(-1, 1)*s, bz = z + fr(-1, 1)*s, r = s*fr(.35, .7);
    bAdd([0x8a7468, 0x9a8676, 0x6e5e58][k % 3], new THREE.DodecahedronGeometry(r, 0), XF(bx, H(bx, bz) + r*.25, bz, fr(.9, 1.3), fr(.55, .85), fr(.9, 1.2), fr(0, 6), fr(0, 6), 0), {ink:.035, shadow:true}); } };
  for (let i = 0; i < CANYON.length; i += 2) { const [x, z] = CANYON[i], q = along(CANYON, x, z), s = i/(CANYON.length - 1), hw = halfW(s) + .2;
    if (s < .12) continue;
    for (const sd of [-1, 1]) if (frand() < .7) rocks(x - q.tz*hw*sd, z + q.tx*hw*sd, fr(.5, .9), 2); }
  for (let x = -28; x < 30; x += fr(3, 6)) { const z = -18 + 3*Math.sin(x*.2), d = canyonAt(x, z); if (d && d.d < halfW(d.s) + 4) continue; if (slope(x, z) < .9) rocks(x, z, fr(.6, 1.1), 2); }
  for (let z = -16; z < 16; z += fr(3, 5)) { rocks(29 + fr(-1, 1), z, fr(.6, 1.2), 2); rocks(-31 + fr(-1, 1), z, fr(.6, 1.2), 2); }

  // trees in clumps, round and inked like the ones at home
  const trees = [[20, -7], [23, -11], [25, -4], [19, -13], [26, -9], [-24, 6], [-21, 10], [-26, 12], [-18, 14], [24, 12], [27, 7], [21, 15], [-14, -4], [-3, -14], [17, -16]];
  for (let x = -60; x < 60; x += fr(4, 7)) trees.push([x, riverZ(x) + fr(5, 9)]);
  const crowns = [], trunks = [];
  for (const [x, z] of trees) { const y = H(x, z), s = fr(2.6, 3.6);
    trunks.push([new THREE.CylinderGeometry(.1*s, .16*s, .9*s, 8), XF(x, y + .4*s, z)]);
    crowns.push([x, y + 1.15*s, z, .48*s, 1], [x + .3*s, y + 1*s, z + .15*s, .32*s, 0], [x - .3*s, y + 1.05*s, z - .1*s, .34*s, 1], [x + .05*s, y + 1.45*s, z + .05*s, .3*s, 2]); }
  meshOf(mergeGeos(trunks), 0x4a2e22, w.scene, .03);
  // dark pines up on the high ground above the cliffs and on the mountains' lower slopes, for scale
  for (let i = 0; i < 160; i++) { const x = fr(-90, 90), z = fr(-27, -75), c = canyonAt(x, z);
    if ((c && c.d < halfW(c.s) + 4) || slope(x, z) > .8) continue; const y = H(x, z), s = fr(1.6, 2.8);
    bAdd(0x4a2e22, new THREE.CylinderGeometry(.08*s, .1*s, .5*s, 6), XF(x, y + .2*s, z));
    for (let k = 0; k < 3; k++) bAdd([0x2f5537, 0x3a6440, 0x2a4c34][k], new THREE.ConeGeometry((.62 - k*.15)*s, (.9 - k*.15)*s, 7), XF(x, y + (.6 + k*.42)*s, z), {ink:.04, shadow:k === 0}); }
  leafCloud(w.scene, crowns, .06);
  // bushes along the riverbank, and in clumps out on the meadow
  const bush = [];
  for (let x = -34; x <= 34; x += fr(2.2, 3.4)) { const z = riverZ(x) - fr(2.2, 3), y = H(x, z), s = fr(.7, 1.1);
    if (Math.abs(x + 6.6) < 2) continue;
    bush.push([x, y + .45*s, z, .8*s, 1], [x + .5*s, y + .35*s, z - .3*s, .55*s, 0], [x - .1*s, y + .85*s, z, .5*s, 2]); }
  for (const [x, z] of [[-16, 4], [-19, -2], [17, -2], [22, 0], [4, 14], [9, 16], [-12, 15]]) { const y = H(x, z);
    bush.push([x, y + .5, z, .85, 1], [x + .7, y + .35, z + .3, .6, 0], [x - .6, y + .4, z - .2, .62, 1], [x, y + .9, z, .5, 2]); }
  leafCloud(w.scene, bush);
  // flowers and grass, thick out on the meadow and thinning up the slopes; none in the water or the canyon
  const clear = (x, z) => { const st = streamAt(x, z); return (st && st.d < 1.1) || inCanyon(x, z) > .2 || slope(x, z) > .45 || Math.hypot(x - BUS[0], z - BUS[1]) < 4.5
    || Math.hypot(x - ROCK[0], z - ROCK[1]) < 1.6 || Math.abs(z - riverZ(x)) < 3.4; };
  for (let i = 0; i < 520; i++) { const x = fr(-30, 30), z = fr(-22, 19); if (clear(x, z)) continue; const y = H(x, z);
    frand() < .4 ? flower(x, z, y, fr(1.2, 2)) : grassTuft(x, z, y, fr(1.2, 1.8)); }
  // reeds where the stream meets the river
  for (let i = 0; i < 40; i++) { const x = fr(-36, 36), z = riverZ(x) - fr(1.6, 2.6), y = H(x, z);
    for (let k = 0; k < 3; k++) bAdd(0x6a8a4a, new THREE.ConeGeometry(.04, fr(.6, 1), 3), XF(x + fr(-.15, .15), y + .35, z + fr(-.15, .15), 1, 1, 1, fr(-.2, .2), 0, fr(-.2, .2))); }
  bFlush(w.scene);
}

// ---------- Juniper's picnic rug ----------
// A gingham cloth with a stitched border and fringe at both ends. pose(lay, bunch): lay runs 0 to 1 as it
// comes off her back rolled up, is tossed down, unrolls along the ground and settles with a ripple; then
// bunch runs 0 to 1 as its far end is pushed in toward the near one and it rucks up into folds.
function buildRug(w){
  const L = 2.6, W = 1.6, FR = .14, LT = L + FR*2, NU = 72, NV = 12, TH = .028;
  const tx = tex(512, 320, (c, cw, ch) => {
    const fx = cw*FR/LT;
    c.clearRect(0, 0, cw, ch);
    c.fillStyle = '#f3e6c8'; c.fillRect(fx, 0, cw - fx*2, ch);
    c.fillStyle = 'rgba(196,64,52,.55)'; for (let i = 0; i < 12; i++) { const x = fx + 10 + i*((cw - fx*2 - 20)/12); c.fillRect(x, 0, 18, ch); }
    for (let i = 0; i < 9; i++) c.fillRect(fx, 12 + i*34, cw - fx*2, 18);
    c.strokeStyle = '#8e2e2a'; c.lineWidth = 14; c.strokeRect(fx + 7, 7, cw - fx*2 - 14, ch - 14);
    c.strokeStyle = '#fff6e2'; c.lineWidth = 2.5; c.setLineDash([7, 6]); c.strokeRect(fx + 20, 20, cw - fx*2 - 40, ch - 40); c.setLineDash([]);
    // tassels: thick strands with gaps, which alphaTest cuts out
    c.fillStyle = '#efe0bf'; for (const x0 of [0, cw - fx]) for (let y = 6; y < ch - 4; y += 13) c.fillRect(x0 + (x0 ? 0 : 3), y, fx - 3, 6);
  });
  tx.wrapS = tx.wrapT = THREE.ClampToEdgeWrapping;
  const geo = new THREE.PlaneGeometry(1, 1, NU, NV), pa = geo.attributes.position;
  const root = new THREE.Group(); root.position.set(RUG[0], H(...RUG) + .03, RUG[1]); root.visible = false; w.scene.add(root);
  const top = new THREE.Mesh(geo, T(0xffffff, {map:tx, alphaTest:.5, side:THREE.DoubleSide})); top.castShadow = true; top.receiveShadow = true; root.add(top);
  // the underside, a shade darker and a hair lower, so the cloth has some thickness at its edges and folds
  const under = new THREE.Mesh(geo, T(0x9a6a5a, {map:tx, alphaTest:.5, side:THREE.DoubleSide})); under.position.y = -.022; under.scale.set(1.006, 1, 1.02); root.add(under);
  function pose(lay, bunch){
    // the roll's centre and how much of the rug lies flat behind it
    let cx, cy, p;
    const r = q => Math.sqrt(Math.max(.0006, (1 - q)*LT*TH/Math.PI)) + .012;
    if (lay < .2) { const q = lay/.2; cx = -LT/2 - .55 + .1*q; cy = .95 + .12*Math.sin(q*Math.PI); p = 0; }
    else if (lay < .38) { const q = (lay - .2)/.18; cx = -LT/2 - .45 + .45*q; cy = .95 + (r(0) - .95)*q*q + .3*Math.sin(q*Math.PI); p = 0; }
    else { const q = clamp01((lay - .38)/.4); p = ease(q); cx = -LT/2 + p*LT; cy = r(p) + .05*Math.abs(Math.sin(q*Math.PI*3))*(1 - q); }
    const settle = clamp01((lay - .76)/.24), rip = .1*(1 - settle)**2;
    for (let j = 0; j <= NV; j++) {
      let th = 0;
      for (let i = 0; i <= NU; i++) {
        const k = j*(NU + 1) + i, u = i/NU, v = (j/NV - .5)*W, a = u*LT;
        let x, y, z = v;
        if (lay < 1 && (lay < .38 || a > p*LT)) { const s = a - p*LT, rr = r(p + s/LT); if (i) th += (LT/NU)/rr;
          x = cx - rr*Math.sin(th); y = cy - rr*Math.cos(th); }
        else { th = 0; x = -LT/2 + a; y = 0;
          if (lay < 1) y += rip*Math.sin((u - settle*1.3)*13)*clamp01(settle*1.3 - u + .3)*(1 - u*.3);
          if (bunch > 0) { const c = .36*bunch, ph = u*Math.PI*3 + .32*Math.sin(v*2.6 + 1) + .18*Math.sin(v*5.1 - u*4);
            x = -LT/2 + a*(1 - c); y = bunch*(.27 + .05*Math.sin(v*3.3 + u*7))*Math.sin(ph)**2*Math.min(1, u*6); z = v*(1 - .05*bunch*Math.sin(ph)**2); } }
        pa.setXYZ(k, x, y, z);
      }
    }
    pa.needsUpdate = true; geo.computeVertexNormals(); geo.computeBoundingSphere();
  }
  pose(0, 0);
  return {root, pose, tex:tx, L:LT};
}

// A side-on slice through the land between two crashing plates, for the time goggles: rock layers with a
// sea floor full of shells on top, squeezed from both sides until they fold up into a snowy peak. Painted
// like a page of a picture book, with ink round every layer.
function buildCutaway(w){
  const g = new THREE.Group(); g.position.set(...CUT); w.scene.add(g);
  const N = 130, X0 = -11, X1 = 11, basic = (o) => new THREE.MeshBasicMaterial(Object.assign({fog:false}, o));
  const back = new THREE.Mesh(new THREE.PlaneGeometry(26, 14), basic({map:tex(512, 280, (c, cw, ch) => {
    const gr = c.createLinearGradient(0, 0, 0, ch); gr.addColorStop(0, '#7fa6dc'); gr.addColorStop(.6, '#cfdcf2'); gr.addColorStop(1, '#f6dcc4'); c.fillStyle = gr; c.fillRect(0, 0, cw, ch);
    c.fillStyle = 'rgba(255,240,200,.9)'; c.beginPath(); c.arc(cw*.8, ch*.22, 22, 0, 7); c.fill();
    c.fillStyle = 'rgba(255,255,255,.85)'; for (const [x, y, s] of [[90, 60, 1], [300, 40, .8], [420, 90, .7]]) for (const [dx, dy, r] of [[0, 0, 18], [18, -8, 22], [40, 0, 17], [20, 6, 18]]) { c.beginPath(); c.arc(x + dx*s, y + dy*s, r*s, 0, 7); c.fill(); }
  })}));
  back.material.map.wrapS = back.material.map.wrapT = THREE.ClampToEdgeWrapping; back.position.set(0, 2.5, -.4); g.add(back);
  const deep = new THREE.Mesh(new THREE.PlaneGeometry(26, 6), basic({color:0x4a2e2e})); deep.position.set(0, -4.6, -.3); g.add(deep);
  const water = new THREE.Mesh(new THREE.PlaneGeometry(7, 1.5), basic({color:0x3f8fc0, transparent:true})); water.position.set(0, -.36, -.1); g.add(water);
  const waves = new THREE.Mesh(new THREE.PlaneGeometry(7, .12), basic({color:0xd8f0fa, transparent:true})); waves.position.set(0, .36, -.09); g.add(waves);
  // interfaces bottom to top; the shell layer only exists in the basin between the two continents
  const basin = x => 1 - Math.min(1, Math.max(0, (Math.abs(x) - 1.8)/1.4));
  const tops = [x => -2.2, x => -1.3 - .3*basin(x), x => -.55 - .6*basin(x), x => .8 - 1.5*basin(x), x => .8 - 1.15*basin(x)];
  const cols = [0x6a3e3a, 0xb0683e, 0xe0b47a, 0x8a5a48, 0x7a9ac4];
  const strip = (mat, z) => { const geo = new THREE.BufferGeometry(), idx = [];
    for (let i = 0; i < N; i++) { const a = i*2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
    geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array((N + 1)*6), 3)); geo.setIndex(idx);
    const m = new THREE.Mesh(geo, mat); m.position.z = z; m.frustumCulled = false; g.add(m); return m; };
  const layers = cols.map((c, li) => strip(basic({color:c, side:THREE.DoubleSide}), li*.002));
  const inks = cols.map((c, li) => strip(basic({color:0x1a1320, side:THREE.DoubleSide}), .02 + li*.002));
  const grass = strip(basic({color:0x5a9a4a, side:THREE.DoubleSide}), .03), snowcap = strip(basic({color:0xfaf6f0, side:THREE.DoubleSide}), .035);
  const shellTex = tex(64, 64, (c) => { c.fillStyle = '#fff4dc'; c.strokeStyle = '#1a1320'; c.lineWidth = 4; c.beginPath(); c.moveTo(32, 54); c.arc(32, 34, 22, Math.PI*.95, Math.PI*.05, false); c.closePath(); c.fill(); c.stroke();
    c.lineWidth = 2.5; for (let k = -2; k <= 2; k++) { c.beginPath(); c.moveTo(32, 54); c.lineTo(32 + k*9, 15 + Math.abs(k)*3); c.stroke(); } });
  shellTex.wrapS = shellTex.wrapT = THREE.ClampToEdgeWrapping;
  const shells = []; for (let i = 0; i < 9; i++) { const s = new THREE.Mesh(new THREE.PlaneGeometry(.26, .26), basic({map:shellTex, transparent:true})); s.position.z = .04; s.rotation.z = (i % 3 - 1)*.3; g.add(s); shells.push({m:s, x:-1.6 + i*.4}); }
  const arrowGeo = new THREE.ShapeGeometry(new THREE.Shape([[-.5, .22], [.1, .22], [.1, .45], [.6, 0], [.1, -.45], [.1, -.22], [-.5, -.22]].map(([x, y]) => new THREE.Vector2(x, y))));
  const arrows = [-1, 1].map(sd => { const a = new THREE.Group(); a.scale.x = -sd; a.position.set(sd*6.4, 1.8, .06); g.add(a);
    a.add(new THREE.Mesh(arrowGeo, basic({color:0xffd36b})));
    const o = new THREE.Mesh(arrowGeo, basic({color:0x1a1320})); o.scale.setScalar(1.16); o.position.set(-.04, 0, -.01); a.add(o); return a; });
  const label = (text) => { const tx = tex(512, 128, (c, cw, ch) => { c.font = '64px Caprasimo, Georgia, serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.lineWidth = 10; c.strokeStyle = 'rgba(26,19,32,.8)'; c.strokeText(text, cw/2, ch/2); c.fillStyle = '#efe0bf'; c.fillText(text, cw/2, ch/2); });
    tx.wrapS = tx.wrapT = THREE.ClampToEdgeWrapping; const m = new THREE.Mesh(new THREE.PlaneGeometry(3, .75), basic({map:tx, transparent:true, depthWrite:false})); m.position.z = .1; g.add(m); return m; };
  const seaLabel = label('sea floor'), peakLabel = label('mountain!');
  seaLabel.position.set(0, 1.1, .1); peakLabel.position.set(3, 3.7, .1);
  const at = (x, k, li) => { const X = x*(1 - .3*k), y = tops[li](x) + k*3.2*Math.exp(-((X/1.9)**2)) + (li ? k*.32*Math.sin(X*3.2 + li*.5)*Math.exp(-((X/2.3)**2)) : 0); return [X, y]; };
  const band = (m, f) => { const pa = m.geometry.attributes.position; for (let i = 0; i <= N; i++) { const [X, y0, y1] = f(X0 + (X1 - X0)*i/N); pa.setXYZ(i*2, X, y0, 0); pa.setXYZ(i*2 + 1, X, y1, 0); } pa.needsUpdate = true; };
  function step(k){
    layers.forEach((m, li) => band(m, x => { const [X, top] = at(x, k, li), bot = li ? at(x, k, li - 1)[1] : -6; return [X, top, Math.min(bot, top)]; }));
    inks.forEach((m, li) => band(m, x => { const [X, top] = at(x, k, li); return [X, top + .025, top - .035]; }));
    const peak = at(0, k, 4)[1];
    // grass on the land either side, and snow once the sea floor is high enough up
    band(grass, x => { const [X, top] = at(x, k, 4), land = 1 - basin(x)*(1 - k); return [X, top + .12*land, top]; });
    band(snowcap, x => { const [X, top] = at(x, k, 4), sn = clamp01((top - peak + 1)/1)*clamp01((k - .7)*4); return [X, top + .2*sn, top - .02]; });
    for (const s of shells) { const [X, top] = at(s.x, k, 4), [, bot] = at(s.x, k, 3); s.m.position.x = X; s.m.position.y = (top + bot)/2; }
    arrows.forEach((a, i) => { a.position.x = (i ? 1 : -1)*(6.4 - 1.6*k); });
    water.material.opacity = 1 - clamp01(k*2.2); waves.material.opacity = water.material.opacity;
    seaLabel.material.opacity = 1 - clamp01(k*3); peakLabel.material.opacity = clamp01((k - .75)*4);
  }
  step(0);
  return {step, shot: (pos, look) => { pos.set(CUT[0], CUT[1] + 1.8, CUT[2] + 11.5); look.set(CUT[0], CUT[1] + 1.2, CUT[2]); return true; }};
}

// ---------- things to find, for anyone who goes exploring ----------
// Off the path, at the edges and up high: each one a curio with a little science, some with something to
// do first. The valley's wildlife lives here too, with the finds it shares a home with.
const LEDGE = [12, -25.7], LEDGE2 = [14.3, -26.4], BURROW = [-1.4, -19.4], FUZZ = [22.5, -22.6], CAVE = [32.6, -6.2], SKIP = [-5.4, 15.2];
const GLACIER = [[-45, -26.2], [-41, -25.2], [-38, -24.4], [-35.6, -24]];
function buildFinds(w, t){
  const label = text => { const tx = tex(256, 80, (c, cw, ch) => { c.font = '52px Caprasimo, Georgia, serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.lineWidth = 9; c.strokeStyle = 'rgba(26,19,32,.85)'; c.strokeText(text, cw/2, ch/2); c.fillStyle = '#fff4dc'; c.fillText(text, cw/2, ch/2); });
    tx.wrapS = tx.wrapT = THREE.ClampToEdgeWrapping; const sp = new THREE.Sprite(new THREE.SpriteMaterial({map:tx, transparent:true, depthWrite:false, opacity:0})); sp.scale.set(2.6, .8, 1); w.scene.add(sp); return sp; };
  const life = [];

  // an ammonite in the canyon wall, under a crust of dust, on the side away from the stream
  const fos = (() => { const i = 40, s = i/(CANYON.length - 1), [cx, cz] = CANYON[i], q = along(CANYON, cx, cz), nx = q.tz, nz = -q.tx, fl = floorY(s);
    let d = halfW(s); while (H(cx + nx*d, cz + nz*d) < fl + 2.5 && d < halfW(s) + 6) d += .05;
    return {x:cx + nx*(d - .2), z:cz + nz*(d - .2), y:fl + 2.45, nx, nz, tx:q.tx, tz:q.tz, stand:[cx + nx*(halfW(s) - 1), cz + nz*(halfW(s) - 1)]}; })();
  const spiral = tex(128, 128, (c, cw) => { c.fillStyle = '#d9c09a'; c.beginPath(); c.arc(64, 64, 62, 0, 7); c.fill(); c.strokeStyle = '#6a4a34'; c.lineWidth = 5; c.beginPath();
    for (let a = 0; a < 6*Math.PI; a += .1) { const r = 3 + a*3.1; c.lineTo(64 + Math.cos(a)*r, 64 + Math.sin(a)*r); } c.stroke();
    c.lineWidth = 2.5; for (let a = 2; a < 6*Math.PI; a += .45) { const r = 3 + a*3.1; c.beginPath(); c.moveTo(64 + Math.cos(a)*r, 64 + Math.sin(a)*r); c.lineTo(64 + Math.cos(a)*(r + 9), 64 + Math.sin(a)*(r + 9)); c.stroke(); }
    c.strokeStyle = '#1a1320'; c.lineWidth = 6; c.beginPath(); c.arc(64, 64, 60, 0, 7); c.stroke(); });
  const amm = new THREE.Group(); amm.position.set(fos.x, fos.y, fos.z); amm.lookAt(fos.x - fos.nx, fos.y + .25, fos.z - fos.nz); w.scene.add(amm);
  add(new THREE.CircleGeometry(.34, 24), T(0xffffff, {map:spiral}), 0, 0, .02, amm, false);
  const dust = add(new THREE.SphereGeometry(.4, 12, 8), new THREE.MeshToonMaterial({color:0xb98a5e, gradientMap:grad, transparent:true}), 0, 0, .02, amm, false); dust.scale.z = .25;
  let brushed = -1;
  life.push(dt => { if (brushed >= 0 && brushed < 1) { brushed = Math.min(1, brushed + dt/1.2); dust.material.opacity = 1 - brushed; dust.visible = brushed < 1; } });
  curio(w, t, {name:'Curly stone', verb:'Brush off the dust', at:[fos.x, fos.z], y:fos.y + .4, lift:.1, view:[-fos.nx + fos.tx*.6, -fos.nz + fos.tz*.6],
    lines:[['sparks', "{name}, look in the rock! A curly fossil, like a giant snail shell."],
      ['sparks', "It's an ammonite. It swam in the sea, with arms like a squid poking out of its shell."],
      ['pip', "A sea animal, inside a mountain? Like my shell!"],
      ['sparks', "Ammonites lived for millions and millions of years, even in the time of the dinosaurs."],
      ['sparks', "The rock at the very top of the tallest mountain on Earth was once sea floor, full of sea creatures!"]],
    from:fos.stand, act: () => { brushed = 0; Sound.hiss({dur:1, vol:.06, type:'highpass', freq:2600}); }});

  // the echo, at the canyon's head, where its walls are tallest
  const E = CANYON[50], eq = along(CANYON, ...E), es = 50/(CANYON.length - 1), ey = floorY(es);
  const echoes = [[E[0] + eq.tx*2, ey + 3, E[1] + eq.tz*2, 0, 1], [E[0] + eq.tz*(halfW(es) + 2) + eq.tx*6, ey + 4.2, E[1] - eq.tx*(halfW(es) + 2) + eq.tz*6, .7, .7],
    [E[0] - eq.tz*(halfW(es) + 2) + eq.tx*7, ey + 4.6, E[1] + eq.tx*(halfW(es) + 2) + eq.tz*7, 1.3, .45], [E[0] + eq.tx*12, ey + 5.6, E[1] + eq.tz*12, 1.9, .25]]
    .map(([x, y, z, at, a], i) => { const sp = label(i ? 'hello…' : 'HELLO!'); sp.position.set(x, y, z); sp.scale.multiplyScalar(i ? 1 : 1.2); return {sp, at, a}; });
  let shout = -1;
  life.push(dt => { if (shout < 0) return; shout += dt;
    for (const {sp, at, a} of echoes) { const k = shout - at; sp.material.opacity = k < 0 || k > 2.4 ? 0 : a*Math.min(1, k*4)*Math.min(1, (2.4 - k)*1.5); sp.position.y += k > 0 && k < 2.4 ? dt*.25 : 0; }
    if (shout > 5) shout = -1; });
  curio(w, t, {name:'Big rock walls', verb:'Shout hello!', at:E, y:ey + 1.6, lift:2.4, view:[-eq.tx, -eq.tz],
    lines:[['sparks', "Listen! Hello… hello… hello…"],
      ['sparks', "Your voice bounced off the rock walls and came back to you. That's an echo!"],
      ['sparks', "Sound is fast, but it takes a moment to get there and back. The farther the wall, the longer you wait."],
      ['mo', "HELLO, MOUNTAINS! …They said it back!"]],
    act: () => { shout = 0; [0, .7, 1.3, 1.9].forEach((d, i) => { Sound.tone(523, {t:d, dur:.22, vol:.07*(1 - i*.22), f2:659}); Sound.tone(392, {t:d + .14, dur:.3, vol:.06*(1 - i*.22)}); }); }});

  // a glacier spilling down from the heights into the pool where the stream rises
  const ice = [], blue = [];
  const gc = new THREE.CatmullRomCurve3(GLACIER.map(([x, z]) => new THREE.Vector3(x, 0, z))).getSpacedPoints(26);
  // only its snout shows, banked up against the foot of the wall; the rest lies up out of sight
  const top = floorY(1);
  gc.forEach((p, i) => { const u = i/(gc.length - 1), r = 1.9 - .8*u; if (H(p.x, p.z) > top + 3.5) return;
    ice.push([new THREE.SphereGeometry(r, 16, 10), XF(p.x, top + .1, p.z, 1, .7, 1.1)]);
    if (i % 3 === 1) blue.push([new THREE.BoxGeometry(r*1.2, .1, .1), XF(p.x, top + .1 + r*.7 - .03, p.z, 1, 1, 1, 0, .4 + Math.sin(i)*.3, 0)]); });
  meshOf(mergeGeos(ice), 0xeaf4fa, w.scene, .04);
  meshOf(mergeGeos(blue), 0x8ec4e2, w.scene);
  const melt = GLACIER.at(-1);
  const trickle = new THREE.Mesh(waterStrip([melt, [(melt[0] + POOL[0])/2, (melt[1] + POOL[1])/2 - .2], POOL], .35, (x, z) => H(x, z) + .14), T(0x63b8d6, {emissive:0x1a4a6a, emissiveIntensity:.25, side:THREE.DoubleSide}));
  w.scene.add(trickle);
  let frost = -1;
  const twinkle = new THREE.Sprite(new THREE.SpriteMaterial({map:glowTex, color:0xdff4ff, transparent:true, depthWrite:false, blending:THREE.AdditiveBlending, opacity:0}));
  twinkle.scale.set(1.6, 1.6, 1); twinkle.position.set(melt[0] - .6, H(...melt) + .9, melt[1]); w.scene.add(twinkle);
  life.push((dt, tt) => { if (frost >= 0) { frost += dt; twinkle.material.opacity = Math.max(0, 1 - frost/1.6)*(.6 + .4*Math.sin(tt*20)); if (frost > 1.6) frost = -1; } });
  curio(w, t, {name:'Ice', verb:'Touch the ice', at:[melt[0] - .4, melt[1]], y:H(...melt) + .9, lift:1, view:[1, .35],
    lines:[['sparks', "Brr! Cold! That's a glacier, a giant river of ice."],
      ['sparks', "It creeps downhill, slower than a snail. As it slides, it scrapes the rock underneath, like sandpaper."],
      ['sparks', "Big glaciers carve out whole valleys, in a wide U shape."],
      ['juniper', "And look, it's melting into the pool! That's where the stream begins."]],
    from:[melt[0] + 1.3, melt[1] - .4], act: () => { frost = 0; Sound.tone(1568, {type:'triangle', dur:.25, vol:.04}); Sound.tone(2093, {type:'triangle', t:.1, dur:.35, vol:.035}); }});

  // a mountain goat on a ledge of the cliff above the high shelf; once looked at, it hops along to another
  const ledge = (x, z) => { const y = H(x, z) + .2; meshOf(new THREE.DodecahedronGeometry(.7, 0).scale(1.3, .45, 1), 0x9a8676, w.scene, .04).position.set(x, y - .25, z); return y; };
  const gy1 = ledge(...LEDGE), gy2 = ledge(...LEDGE2);
  const goat = mountainGoat(w.scene, LEDGE[0], gy1, LEDGE[1], .4); life.push((dt, tt) => goat.tick(dt, tt));
  let hop = -1;
  life.push(dt => { if (hop < 0 || hop >= 1) return; hop = Math.min(1, hop + dt/.9); const k = ease(hop);
    goat.g.position.set(LEDGE[0] + (LEDGE2[0] - LEDGE[0])*k, gy1 + (gy2 - gy1)*k + Math.sin(hop*Math.PI)*1.2, LEDGE[1] + (LEDGE2[1] - LEDGE[1])*k); goat.g.rotation.y = .4 + (hop < 1 ? 1.2 : -2.2)*Math.sin(hop*Math.PI); });
  curio(w, t, {name:'Something on the cliff', at:LEDGE, y:gy1 + 1.1, lift:.9, view:[.25, 1],
    lines:[['sparks', "A mountain goat! Way up on that tiny ledge."],
      ['sparks', "Its hooves have soft, grippy pads underneath, like the bottoms of sneakers. They cling to the rock."],
      ['basil', "I'd never stand up there. Not for a million granola bars."],
      ['mo', "A million? Let's not be hasty, Basil."]],
    from:[LEDGE[0], LEDGE[1] + 2.4], post: () => { hop = 0; Sound.tone(330, {type:'sawtooth', dur:.35, vol:.03, f2:300, cut:900, vib:12}); }});

  // a marmot up on the knoll, popping out of its burrow among the rocks to whistle a warning
  const by = H(...BURROW);
  for (const [dx, dz, r] of [[.9, -.5, .55], [-.7, -.7, .45], [-1, .2, .35]]) meshOf(new THREE.DodecahedronGeometry(r, 0), 0x8a7468, w.scene, .03).position.set(BURROW[0] + dx, H(BURROW[0] + dx, BURROW[1] + dz) + r*.3, BURROW[1] + dz);
  add(new THREE.CircleGeometry(.28, 14), T(0x2a1e1a), BURROW[0], by + .03, BURROW[1], w.scene, false).rotation.x = -Math.PI/2;
  const mar = marmot(w.scene, BURROW[0], by, BURROW[1], .6); mar.up = 0;
  let seenMar = false, whistle = 0;
  life.push((dt, tt) => { const d = Math.hypot(player.x - BURROW[0], player.z - BURROW[1]), want = d < 12 ? 1 : 0;
    mar.up += (want - mar.up)*Math.min(1, dt*6);
    // a few sharp whistles when it first spots someone coming
    if (want && !seenMar) { seenMar = true; whistle = 2.4; [0, .5, 1.1].forEach(d => Sound.tone(2200, {t:d, dur:.14, vol:.04, f2:1900})); }
    if (!want && d > 16) seenMar = false;
    whistle = Math.max(0, whistle - dt); mar.tick(dt, tt, whistle > 0); });
  curio(w, t, {name:'Whistle in the rocks', at:BURROW, y:by + .9, lift:.4, view:[.5, 1],
    lines:[['sparks', "A marmot! That loud whistle means: 'Watch out, everybody!'"],
      ['sparks', "Marmots dig burrows high up in the mountains. All winter long, they sleep, for six months or more!"],
      ['mo', "Six months of napping? That's my kind of animal."]]});

  // fuzzy edelweiss on the high shelf, small and low out of the wind
  const fz = [], fc = [];
  for (const [dx, dz] of [[0, 0], [.5, .3], [-.4, .4], [.2, -.5], [-.6, -.2], [.8, -.3]]) { const x = FUZZ[0] + dx, z = FUZZ[1] + dz, y = H(x, z) + .1;
    for (let k = 0; k < 7; k++) { const a = k/7*Math.PI*2; fz.push([new THREE.SphereGeometry(.06, 6, 4), XF(x + Math.cos(a)*.07, y, z + Math.sin(a)*.07, 1.6, .5, .8, 0, -a, 0)]); }
    fc.push([new THREE.SphereGeometry(.04, 6, 4), XF(x, y + .02, z)]); }
  meshOf(mergeGeos(fz), 0xf6f2e8, w.scene, .012); meshOf(mergeGeos(fc), 0xe8d070, w.scene);
  curio(w, t, {name:'Fuzzy flowers', verb:'Feel the fuzzy flowers', at:FUZZ, y:H(...FUZZ) + .6, lift:.1, view:[.2, 1],
    lines:[['sparks', "Edelweiss! Feel how soft and fuzzy it is?"],
      ['sparks', "Up high, it's cold and windy, and the sun is strong. The fuzz is like a woolly sweater for the flower."],
      ['juniper', "Down in the meadow, flowers grow tall. Up here, they stay small and hug the ground, out of the wind!"]]});

  // a crystal cave hidden in the eastern slope, behind the trees
  const cy = H(...CAVE);
  const mouth = add(new THREE.CircleGeometry(1.05, 20, 0, Math.PI), new THREE.MeshBasicMaterial({color:0x1e1426}), CAVE[0] + .25, cy - .1, CAVE[1], w.scene, false); mouth.rotation.y = -Math.PI/2;
  for (let k = 0; k <= 6; k++) { const a = k/6*Math.PI, x = CAVE[0] + .05, z = CAVE[1] + Math.cos(a)*1.25, y = cy - .1 + Math.sin(a)*1.2;
    meshOf(new THREE.DodecahedronGeometry(.42 + (k % 2)*.12, 0), 0x8a7468, w.scene, .035).position.set(x, Math.max(y, H(x, z) + .2), z); }
  const glowMat = new THREE.MeshToonMaterial({color:0xb48ae8, gradientMap:grad, emissive:0x8a4ad8, emissiveIntensity:.25}), cr = [];
  for (const [dz, h, lean] of [[0, .7, 0], [-.3, .5, .4], [.28, .55, -.35], [-.5, .35, .7], [.5, .4, -.7], [.12, .38, .2]]) {
    cr.push([new THREE.CylinderGeometry(.08, .1, h, 6), XF(0, h/2, dz, 1, 1, 1, lean*.6, 0, .35)], [new THREE.ConeGeometry(.08, .16, 6), XF(0, h + .08, dz, 1, 1, 1, lean*.6, 0, .35)]); }
  const crystals = meshOf(mergeGeos(cr), glowMat, w.scene, .015); crystals.position.set(CAVE[0] - .05, cy - .1, CAVE[1]); crystals.scale.setScalar(1.4);
  let shine = -1;
  life.push((dt, tt) => { if (shine >= 0) { shine = Math.min(1, shine + dt/1.5); } glowMat.emissiveIntensity = .25 + (shine > 0 ? shine*(.7 + .15*Math.sin(tt*3)) : 0); });
  curio(w, t, {name:'Dark gap in the rocks', verb:'Peek inside', at:[CAVE[0] - .2, CAVE[1]], y:cy + .8, lift:.5, view:[-.7, 1],
    lines:[['pip', "A secret cave! And it's full of purple crystals!"],
      ['sparks', "That's amethyst, a kind of quartz. Long ago, water trickled into a crack here, carrying tiny bits of minerals."],
      ['sparks', "Bit by bit, for thousands of years, those tiny bits stacked up into crystals."],
      ['pip', "They all have six sides! Who made them so neat?"],
      ['sparks', "Nobody! The tiny bits always stack up in the same pattern, all by themselves."]],
    from:[CAVE[0] - 1.6, CAVE[1] - 1], act: () => { shine = 0; Sound.tone(1319, {type:'triangle', dur:.3, vol:.04}); Sound.tone(1760, {type:'triangle', t:.15, dur:.5, vol:.035}); }});

  // flat stones by the river, for skipping
  const stones = []; for (const [dx, dz] of [[.3, .4], [-.3, .5], [.1, .8]]) stones.push([new THREE.SphereGeometry(.12, 8, 5), XF(SKIP[0] + dx, H(SKIP[0] + dx, SKIP[1] + dz) + .03, SKIP[1] + dz, 1.3, .35, 1)]);
  meshOf(mergeGeos(stones), 0x9a8e86, w.scene, .015);
  const stone = sph(.1, T(0x8a7e78), 0, 0, 0, w.scene, 8); stone.scale.set(1.3, .35, 1); stone.visible = false;
  const rings = []; for (let i = 0; i < 6; i++) { const r = add(new THREE.TorusGeometry(.3, .03, 4, 20), new THREE.MeshBasicMaterial({color:0xf4f8f6, transparent:true, opacity:0}), 0, RIVER_Y + .03, 0, w.scene, false); r.rotation.x = Math.PI/2; rings.push({r, age:9}); }
  const BOUNCE = [0, 2.6, 4.6, 6.2, 7.4, 8.3, 8.9];
  let skip = -1;
  life.push(dt => {
    for (const q of rings) { q.age += dt; q.r.scale.setScalar(1 + q.age*2.2); q.r.material.opacity = Math.max(0, .9 - q.age*.7); }
    if (skip < 0) return; const prev = skip; skip += dt*2.6; const i = Math.floor(skip), f = skip - i;
    if (i >= BOUNCE.length - 1) { stone.visible = false; skip = -1; return; }
    if (Math.floor(prev) !== i && i > 0) { const q = rings[i - 1]; q.age = 0; q.r.position.x = SKIP[0] + BOUNCE[i]*.25; q.r.position.z = SKIP[1] + 2.5 + BOUNCE[i]; Sound.tone(900 + i*80, {type:'sine', dur:.08, vol:.04}); }
    const z0 = BOUNCE[i], z1 = BOUNCE[i + 1], hgt = i ? .9/(i + 1) : 1.1, y0 = i ? RIVER_Y + .04 : H(...SKIP) + 1;
    stone.position.set(SKIP[0] + (z0 + (z1 - z0)*f)*.25, y0 + (RIVER_Y + .04 - y0)*f + Math.sin(f*Math.PI)*hgt, SKIP[1] + 2.5 + z0 + (z1 - z0)*f); stone.rotation.y += dt*20; });
  curio(w, t, {name:'Flat stones', verb:'Skip a stone', at:[SKIP[0] + 2.5, SKIP[1] + 3], y:H(...SKIP) + .5, lift:1.5, view:[.8, -.6],
    lines:[['sparks', "Look at it go! A flat stone, thrown low and fast, bounces right off the water."],
      ['sparks', "This river carries sand and mud from the mountains, all the way down to the sea."],
      ['juniper', "And at the bottom of the sea, the mud piles up in layers. Like the stripes in the canyon!"],
      ['sparks', "Yes! The layers turn to rock. And one day, crashing plates might crumple them into new mountains."]],
    from:SKIP, act: () => { skip = 0; stone.visible = true; Sound.hiss({dur:.2, vol:.05, type:'highpass', freq:3000}); }});

  // and life all about: a golden eagle wheeling over the canyon, swallows over the meadow, butterflies on the flowers
  life.push(soarer(w.scene, -14, 24, -20, 16).tick, soarer(w.scene, 30, 34, -50, 22, {sp:-.11, s:2.2}).tick);
  life.push(flock(w.scene, 2, 5, 6, 6).tick);
  life.push(butterflies(w.scene, [[2, 8], [-14, 8], [8, -2], [18, 6], [-10, -6], [14, 12], [-2, 12], [24, -14], [-18, 2]], H).tick);
  w.anims.push((dt, tt) => life.forEach(f => f(dt, tt)));
}
