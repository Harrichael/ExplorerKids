// Sitting on the pond bench: the hero climbs on, the camera drifts into their eyes, and they
// wonder about how everything in the pond grows up. Any walking key, the stick or Escape stands them back up.

import * as THREE from 'three';
import { clamp01, ease } from '../core/kit.js';
import { camera } from '../core/render.js';
import { Sound } from '../core/sound.js';
import { joy } from '../input.js';
import { hero, player } from '../player.js';
import { game } from '../state.js';
import { convo, curItem, endConvo, think } from '../ui/dialogue.js';
import { BENCH, pondLife } from './garden-life.js';
import { hqAnims } from './scene.js';

const line = ([look, text, follows]) => ({look, text, follows: !!follows});
const OPENERS = [
  "Ahh, a comfy bench. I'll just sit here and watch the pond for a while...",
  "Shh... if I sit really, really still, maybe the pond animals will come out.",
  "Hello, pond! What's everybody up to today?",
  "Time for some pond watching. My favorite!"
].map(text => line([pondLife.pond, text]));
const CLOSERS = [
  "Eggs, babies, grown-ups, then eggs again. Everybody in this pond is busy growing up. Just like me!",
  "A pond is like a whole tiny town, all in one puddle of water!",
  "I wonder what will have hatched by the next time I sit here.",
  "So many little lives in one little pond. I could watch all day!"
].map(text => line([pondLife.pond, text]));
// Each chain is told in order. A sit may cut one short, and may start partway in, but only at a
// line that makes sense alone; lines marked FOLLOWS need the one before them.
// Chains are listed in story order, which is also the order a sit tells them in.
const FOLLOWS = true;
const CHAINS = [
  [[pondLife.spawn, "Ooh, see that wobbly blob by the edge? That's frogspawn! Each jelly bead has a tiny black dot inside."],
   [pondLife.spawn, "Every dot is a baby frog just getting started. The jelly keeps the eggs safe, like a squishy raincoat.", FOLLOWS],
   [pondLife.spawn, "One mama frog can lay more than a thousand eggs at once. That's a LOT of brothers and sisters!"]],
  [[pondLife.tadpoles, "And there go the tadpoles! Wiggle, wiggle, wiggle. They breathe underwater with gills, like fish do."],
   [pondLife.tadpoles, "Tadpoles munch on soft plants and green, slimy algae. Yum... I think?"]],
  [[pondLife.froglet, "That little one on the lily pad has legs AND a tail. It's a froglet, halfway to being a frog!"],
   [pondLife.froglet, "First its back legs grew, then its front legs. Now its tail is shrinking away, a tiny bit each day.", FOLLOWS],
   [pondLife.frog, "And that's how you get a frog! Ribbit! Grown-up frogs breathe air with lungs, and a little bit through their skin, too.", FOLLOWS],
   [pondLife.frog, "Someday that frog will lay eggs in the pond, and the whole circle starts again. Egg, tadpole, froglet, frog!"]],
  [[pondLife.frog, "Fun fact: frogs blink when they swallow! Their eyes sink down and help push the food into their tummy."],
   [pondLife.frog, "Good thing I don't have to do that with my sandwich.", FOLLOWS]],
  [[pondLife.pads, "Lily pads float because they're full of tiny air pockets. They're like pool floats made of leaf!"]],
  [[pondLife.koi, "Look at the big orange fish! Those are koi. Some koi live for more than fifty years. That's older than my grown-ups!"]],
  [[pondLife.striders, "Whoa, those bugs are walking ON the water! Water striders have tiny hairs on their feet that keep them from sinking."],
   [pondLife.striders, "Note to self: do not try that at bath time.", FOLLOWS]],
  [[pondLife.dragonfly, "A dragonfly! Before it could fly, it lived underwater as a nymph, hunting for months and months."],
   [pondLife.dragonfly, "Then one day it climbed up a reed, its skin split open, and out came a dragonfly! It dried its wings in the sun and... zoom!", FOLLOWS],
   [pondLife.dragonfly, "Dragonflies have giant eyes that see almost all the way around. No sneaking up on a dragonfly!"],
   [pondLife.wigglers, "Dragonflies love to eat mosquitoes. Baby mosquitoes are called wigglers. They hang upside down under the water and breathe through a tiny snorkel on their tail!"]],
  [[pondLife.ducks, "Quack! Here comes Mama Duck with her ducklings. They hatched from eggs in a nest she lined with her own soft, fluffy feathers."],
   [pondLife.ducklings, "Ducklings can swim when they're just one day old! They paddle along behind Mama, all in a row."],
   [pondLife.ducklings, "Baby ducks follow the first grown-up they see after hatching. That's why they stick to Mama like glue!"]],
  [[pondLife.ducks, "Sometimes Mama Duck tips bottom-up with her tail in the air. That's called dabbling! Ducks eat water plants, seeds, snails and bugs."]],
  [[pondLife.ducks, "Mama Duck's feathers are waterproof. She rubs on oil from a special spot near her tail, so water rolls right off her back."]]
].map(c => c.map(line));
const told = CHAINS.map(() => 0);
const pick = a => a[Math.floor(Math.random()*a.length)];
// Never more than 5 boxes: 3 a sit, sometimes 4, now and then 5, the opener and closer included.
// Chains heard least come first, so repeat visits wander through all of them.
function someThoughts(){
  const r = Math.random(); let room = r < .6 ? 3 : r < .92 ? 4 : 5;
  const open = Math.random() < .4 && room--, close = room > 2 && Math.random() < .3 && room--;
  const order = CHAINS.map((c, i) => [told[i] + Math.random(), i]).sort((a, b) => a[0] - b[0]);
  const picks = [];
  for (const [, i] of order) {
    if (room <= 0) break;
    const c = CHAINS[i], from = pick(c.map((t, j) => j).filter(j => !c[j].follows));
    const take = Math.min(room, c.length - from, 1 + Math.floor(Math.random()*3));
    picks.push([i, c.slice(from, from + take)]); room -= take; told[i]++;
  }
  picks.sort((a, b) => a[0] - b[0]);
  return [...(open ? [pick(OPENERS)] : []), ...picks.flatMap(p => p[1]), ...(close ? [pick(CLOSERS)] : [])];
}

const FRONT = {x:BENCH.x, z:BENCH.z - .78}, SEAT_Z = BENCH.z - .07, LEGS = -1.4;
const MOVE_KEYS = new Set(['Escape', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'w', 'a', 's', 'd', 'W', 'A', 'S', 'D']);
const headAt = new THREE.Vector3(), fwd = new THREE.Vector3(), camWant = new THREE.Vector3(), aim = new THREE.Vector3(), aimWant = new THREE.Vector3();
let seat = null;

export function sit(){
  if (seat) return;
  seat = {phase:'walk', t:0, walk:0}; game.cutscene = true;
}
function stand(){
  if (!seat || seat.phase === 'rise') return;
  if (convo) endConvo(true);
  game.cutCam = null;
  if (seat.phase === 'walk' || seat.phase === 'turn') { done(); return; }
  seat = {phase:'rise', t:0, z:player.z, legs:hero.legL.rotation.x, lift:hero.body.position.y};
}
function done(){ seat = null; game.cutscene = false; }
// key repeats are ignored so an arrow still held from walking up doesn't stand them straight back up
addEventListener('keydown', e => { if (seat && !e.repeat && MOVE_KEYS.has(e.key)) stand(); });

const sitY = () => .52 - .66*hero.body.scale.y;
function pose(legs, lift, arms){
  hero.root.position.set(player.x, player.y, player.z); hero.root.rotation.y = player.angle;
  hero.legL.rotation.x = legs[0]; hero.legR.rotation.x = legs[1]; hero.body.position.y = lift;
  hero.armL.rotation.x = hero.armR.rotation.x = arms;
}
function turnTo(a, k){ let d = a - player.angle; d = Math.atan2(Math.sin(d), Math.cos(d)); player.angle += d*Math.min(1, k); return Math.abs(d); }

function step(dt){
  const s = seat; s.t += dt;
  if (!joy.x && !joy.y) s.free = true; else if (s.free && s.phase !== 'rise') { stand(); return; }
  if (s.phase === 'walk') {
    const dx = FRONT.x - player.x, dz = FRONT.z - player.z, d = Math.hypot(dx, dz);
    if (d < .04) { s.phase = 'turn'; s.t = 0; }
    else { const st = Math.min(d, 3.2*dt); player.x += dx/d*st; player.z += dz/d*st; turnTo(Math.atan2(dx, dz), dt*12); s.walk += dt*9.5;
      const sg = Math.sign(Math.sin(s.walk)); if (sg !== player.lastStepSign && sg !== 0) { player.lastStepSign = sg; Sound.step('grass'); } }
    const sw = Math.sin(s.walk)*.7; pose([sw, -sw], 0, 0); hero.armL.rotation.x = -sw*.9; hero.armR.rotation.x = sw*.9;
  } else if (s.phase === 'turn') {
    if (turnTo(Math.PI, dt*9) < .05) { s.phase = 'settle'; s.t = 0; Sound.step('wood'); }
    pose([0, 0], 0, 0);
  } else if (s.phase === 'settle') {
    const p = ease(clamp01(s.t/.55));
    player.z = FRONT.z + (SEAT_Z - FRONT.z)*p;
    pose([LEGS*p, LEGS*p], sitY()*p + Math.sin(p*Math.PI)*.2, -.55*p);
    if (s.t > .55) { s.phase = 'seated'; s.t = 0; aim.set(player.x, player.y + 1.1, player.z - .4); game.cutCam = (pos, look) => { pos.copy(camWant); look.copy(aim); }; }
  } else if (s.phase === 'seated') {
    const kick = Math.sin(s.t*2.4)*.16;
    pose([LEGS + kick, LEGS - kick], sitY() + Math.sin(s.t*1.8)*.006, -.55);
    // the camera trails its target, so let it settle above the head before sinking straight down into the eyes;
    // coming in level from behind would fill the view with the back of the head
    hero.head.getWorldPosition(headAt); fwd.set(Math.sin(player.angle), 0, Math.cos(player.angle));
    const into = ease(clamp01((s.t - 1.2)/1.4));
    camWant.copy(headAt).addScaledVector(fwd, .14).y += 1.3*Math.pow(1 - into, 1.6) + .02;
    const look = curItem && curItem.look;
    if (look && look.isObject3D) look.getWorldPosition(aimWant); else aimWant.copy(look || pondLife.pond);
    aim.lerp(aimWant, Math.min(1, dt*(into < 1 ? 3 : 1.8)));
    if (s.t > 2.8 && !s.thinking) { s.thinking = true; think(someThoughts(), stand); }
  } else {
    const p = ease(clamp01(s.t/.5));
    player.z = s.z + (FRONT.z - s.z)*p;
    pose([s.legs*(1 - p), s.legs*(1 - p)], s.lift*(1 - p) + Math.sin(p*Math.PI)*.16, -.55*(1 - p));
    if (s.t > .5) done();
  }
}
hqAnims.push(dt => {
  if (seat) step(dt);
  // the head would fill the view in first person; it comes back once the camera has drawn away
  if (seat || !hero.head.visible) hero.head.visible = camera.position.distanceTo(hero.head.getWorldPosition(headAt)) > .8;
});
