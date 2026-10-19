// The trip itself: the explorer steps into the treehouse hut and vanishes through its door, picks a
// place on the wishing globe, and the whole treehouse, tree and all, spins up out of the yard into the
// sky in a whirl of leaves and sparkles. High in the clouds the story's page turns to tonight's sky
// over the new place, and the treehouse corkscrews back down, lands with a bump, and the explorer
// steps back out of the door for Pip to say where they've landed.

import * as THREE from 'three';
import { clamp01, ease, glowTex } from '../core/kit.js';
import { Sound } from '../core/sound.js';
import { PLAT, TREEHOUSE, TX, TZ } from '../hq/garden.js';
import { hqAnims, scene } from '../hq/scene.js';
import { sitDown, standUp } from '../hq/sit.js';
import { hero } from '../player.js';
import { whisk as moveTreehouse } from '../sky/observer.js';
import { game } from '../state.js';
import { story } from '../ui/dialogue.js';
import { pageTurn } from '../ui/page-turn.js';
import { chooseWhere } from './where-to.js';

// the hut's door: garden.js builds the hut at x 24, z -4.25, with its door on the west wall. The
// trunk crowds the doorway, so they come out onto the open deck beside it, where the camera can see
// them past the leaves.
const DOOR = {x:23.04, z:-3.85}, STEP = .6, OUT = {x:22.44, z:-2.1};

export function whisk(){
  sitDown({x:DOOR.x - STEP, z:DOOR.z, angle:Math.PI/2, seated:wish,
    // "sitting" here is stepping through the door, the explorer fading from sight as they go
    pose: p => { hero.root.position.x += p*STEP; hero.root.visible = p < .85; }});
}

async function wish(){
  game.camShake = .5;
  [784, 988, 1175, 1568].forEach((f, i) => Sound.tone(f, {type:'sine', t:i*.08, dur:.6, vol:.05}));
  const place = await chooseWhere();
  if (!place) { standUp(OUT); return; }
  game.cutscene = true;
  await fly('up');
  pageTurn(() => { moveTreehouse(place); flight.phase = 'wait'; }, async () => {
    // the page turn hands control back as it ends; the explorer is still in the doorway
    game.cutscene = true;
    await fly('down');
    standUp(OUT);
    setTimeout(() => story([['pip', landed(place)]]), 800);
  }, ["Pip's magic treehouse", place.home ? 'Home to Lantern Hill' : place.name]);
}

function landed(place){
  if (place.home) return "Home sweet Lantern Hill! The stars here feel like old friends.";
  const south = place.lat < -10 ? " We're in the southern half of the world, so there are stars here we never see from home!" : '';
  return `We made it, {name}! Welcome to ${place.name}! Quick, look through my telescope. The sky is different here!${south}`;
}

// ---------- the flight ----------
// Up: a rumble, then it lifts, spinning faster as it climbs. Down: it comes out of the sky still
// spinning, slows as it nears the yard, and thumps down where it started.
const HIGH = 26, UP = [1.1, 3.4], DOWN = 3.6, LAND = .7;
const N = 220, pts = new Float32Array(N*3), cols = new Float32Array(N*3), motes = [];
const TINTS = [0xffe08a, 0xffcf73, 0x9fe0a0, 0x6fbf73, 0xf2a7c3, 0xb9e4ff].map(c => new THREE.Color(c));
for (let i = 0; i < N; i++) {
  motes.push({a:Math.random()*7, r:2.4 + Math.random()*4, y:Math.random(), sp:1.2 + Math.random()*1.6});
  TINTS[i % TINTS.length].toArray(cols, i*3);
}
const swirlGeo = new THREE.BufferGeometry();
swirlGeo.setAttribute('position', new THREE.BufferAttribute(pts, 3)); swirlGeo.setAttribute('color', new THREE.BufferAttribute(cols, 3));
const swirl = new THREE.Points(swirlGeo, new THREE.PointsMaterial({size:.55, map:glowTex, vertexColors:true, transparent:true, depthWrite:false, fog:false, blending:THREE.AdditiveBlending}));
swirl.frustumCulled = false;

let flight = null;
function fly(dir){
  return new Promise(done => {
    const s0 = TREEHOUSE.lifter.rotation.y, TURN = Math.PI*2;
    // coming down it winds on a couple more turns to land facing exactly the way it was built
    flight = {dir, phase:'go', t:0, vy:0, h: dir === 'up' ? 0 : HIGH, s0, spin:s0, left: (Math.ceil(s0/TURN) + 2)*TURN - s0, done, thumped:false};
    if (!swirl.parent) scene.add(swirl);
    game.cutCam = (pos, look) => {
      // circle slowly round the trunk, staying level with the deck so the yard drops away below; the
      // game's camera eases after its target, so aim ahead of a fast climb or it falls behind
      const y = PLAT + flight.h + flight.vy*.45, a = .25 + flight.spin*.12;
      pos.set(TX + Math.sin(a)*12, y + 3.2, TZ + Math.cos(a)*12); look.set(TX, y + 1.4, TZ);
    };
    if (dir === 'up') {
      Sound.hiss({dur:1.2, vol:.07, type:'lowpass', freq:180}); Sound.tone(55, {type:'triangle', dur:1.1, vol:.1, f2:70});
      [523, 659, 784, 1047, 1319, 1568, 2093].forEach((f, i) => Sound.tone(f, {type:'sine', t:.9 + i*.18, dur:.9, vol:.045}));
      Sound.hiss({t:1, dur:3, vol:.09, type:'bandpass', freq:500, f2:2400, q:.7});
    } else {
      [2093, 1568, 1319, 1047, 784].forEach((f, i) => Sound.tone(f, {type:'sine', t:i*.22, dur:.9, vol:.04}));
      Sound.hiss({dur:DOWN, vol:.08, type:'bandpass', freq:2200, f2:400, q:.7});
    }
  });
}

hqAnims.push(dt => {
  if (!flight || flight.phase === 'wait') return;
  const f = flight, L = TREEHOUSE.lifter, h0 = f.h;
  f.t += dt;
  let rate, wob = 0;
  if (f.dir === 'up') {
    const rumble = clamp01(f.t/UP[0]), p = clamp01((f.t - UP[0])/UP[1]);
    f.h = HIGH*p*p;
    rate = .3*rumble + 5*p*p;
    f.spin += rate*dt;
    wob = (1 - p)*rumble*.03*Math.sin(f.t*31);
    game.camShake = Math.max(game.camShake, (1 - p)*rumble*.35);
    swirl.material.opacity = rumble;
    if (p >= 1) { f.phase = 'wait'; f.done(); }
  } else {
    const p = clamp01(f.t/DOWN), out = 1 - (1 - p)*(1 - p);
    f.h = HIGH*(1 - ease(p));
    rate = 2*f.left/DOWN*(1 - p);
    f.spin = f.s0 + f.left*out;
    if (p >= 1 && !f.thumped) {
      f.thumped = true; f.h = 0; game.camShake = 1.6;
      Sound.tone(70, {type:'triangle', dur:.5, vol:.16, f2:40}); Sound.hiss({dur:.6, vol:.12, type:'lowpass', freq:400});
      for (const m of motes) { m.r = 1.5 + Math.random()*2; m.y = 0; }
    }
    swirl.material.opacity = f.thumped ? clamp01(1 - (f.t - DOWN)/LAND) : 1;
    if (f.t >= DOWN + LAND) {
      // settle exactly where it was built, so the deck lines up with its colliders again
      L.position.y = 0; L.rotation.set(0, 0, 0); scene.remove(swirl);
      game.cutCam = null; flight = null; f.done(); return;
    }
  }
  if (dt > 0) f.vy = (f.h - h0)/dt;
  L.position.y = f.h; L.rotation.set(wob, f.spin, wob*.7);
  // leaves and sparkles whirl round the trunk, faster and wider the faster it spins
  const base = PLAT + f.h;
  for (let i = 0; i < N; i++) {
    const m = motes[i];
    if (f.thumped) { m.r += dt*3; m.y += dt*.5; } else { m.a += (rate*.6 + m.sp)*dt; m.y = (m.y + dt*(.15 + rate*.05)) % 1; }
    pts[i*3] = TX + Math.cos(m.a)*m.r; pts[i*3 + 1] = base - 3 + m.y*(f.thumped ? 4 : 11); pts[i*3 + 2] = TZ + Math.sin(m.a)*m.r;
  }
  swirlGeo.attributes.position.needsUpdate = true;
});
