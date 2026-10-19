// The two armchairs by the hearth. The explorer sinks back into one, and from there can watch the fire,
// wondering about how it works, or read the book in their backpack on their lap. They stay in the chair
// between the two until they choose to get up (or press Escape).

import * as THREE from 'three';
import { clamp01, ease } from '../core/kit.js';
import { camera } from '../core/render.js';
import { BOOKS } from '../library/books.js';
import { hero, player } from '../player.js';
import { game } from '../state.js';
import { endConvo, think } from '../ui/dialogue.js';
import { holding } from '../ui/inventory.js';
import { FIRE } from './cottage.js';
import { hqAnims } from './scene.js';
import { sitDown, standUp } from './sit.js';

// in the chair's own frame: they walk up to stand just off its front and shuffle back, hips into the cushion
const FRONT = .95, HIPS = -.02, CUSHION = .74;
const line = ([text, follows]) => ({text, follows: !!follows});
const FOLLOWS = true;
// Told a chain or two at a time, the chains heard least first. A chain may start partway in, but only at a
// line that makes sense alone; lines marked FOLLOWS need the one before them.
const CHAINS = [
  [["A fire needs three things: something to burn, air to breathe, and heat. That's called the fire triangle."],
   ["Take away any one of the three and the fire goes out. That's why a fire with no air left goes out.", FOLLOWS]],
  [["The logs are the fire's food. We call that fuel."],
   ["As the wood burns, it turns into heat, light, smoke and a little pile of gray ash.", FOLLOWS]],
  [["Here's something amazing: the wood is full of sunshine! The tree caught sunlight for years and years to grow."],
   ["When the wood burns, that old sunshine comes back out as warmth and light.", FOLLOWS]],
  [["Pop! Crackle! That's water and sap hiding inside the wood. They heat up, turn to steam and burst out."]],
  [["Flames are orange because tiny bits of soot get so hot they glow, like little sparks."],
   ["Down at the very bottom the flame looks a bit blue. Blue flames are even hotter than orange ones!", FOLLOWS]],
  [["Where does the smoke go? Up the chimney! Hot air is lighter than cool air, so it rises."],
   ["The rising air pulls fresh air in at the bottom, and that feeds the fire some more.", FOLLOWS]],
  [["Long, long ago, people sat round fires just like this one to keep warm, cook their food and tell stories."]],
  [["Fire is for grown-ups to light and look after. I'm happy just watching it from this comfy chair."]],
].map(c => c.map(line));
const told = CHAINS.map(() => 0);
const pick = a => a[Math.floor(Math.random()*a.length)];
function someThoughts(){
  let room = 2 + (Math.random() < .5);
  const order = CHAINS.map((c, i) => [told[i] + Math.random(), i]).sort((a, b) => a[0] - b[0]), out = [];
  for (const [, i] of order) {
    if (room <= 0) break;
    const c = CHAINS[i], from = pick(c.map((t, j) => j).filter(j => !c[j].follows)), take = Math.min(room, c.length - from);
    out.push(...c.slice(from, from + take)); room -= take; told[i]++;
  }
  return out;
}

// what they are doing once sat: null while choosing, then 'fire' or 'book'
let chair = null, doing = null, reads = 0, readsShown = 0;
const fwd = new THREE.Vector3(), headAt = new THREE.Vector3(), aim = new THREE.Vector3(), fireAt = new THREE.Vector3(FIRE.x, FIRE.y, FIRE.z);

// sat right back, legs out over the cushion's edge and hands in their lap; reading, hands either side of the
// book and head bowed
function pose(p){
  const r = ease(readsShown);
  hero.body.position.y = (CUSHION + .01 - .66*hero.body.scale.y)*p + Math.sin(p*Math.PI)*.15;
  hero.body.position.z = -(FRONT - HIPS)*p;
  hero.legL.rotation.x = hero.legR.rotation.x = -1.4*p;
  hero.armL.rotation.x = hero.armR.rotation.x = (-.45 - .45*r)*p;
  hero.armL.rotation.z = -(.15 + .1*r)*p; hero.armR.rotation.z = (.15 + .1*r)*p;
  hero.head.rotation.x = .35*r*p;
}

export function sitInChair(c){
  const x = c.x + Math.sin(c.ry)*FRONT, z = c.z + Math.cos(c.ry)*FRONT;
  if (!sitDown({x, z, angle:c.ry, pose, seated: () => { game.cutCam = cam; ask(true); }})) return;
  chair = c; doing = null; reads = 0;
}
function getUp(){
  if (!chair) return;
  endConvo(true); chair = null; doing = null; reads = 0; game.cutCam = null; standUp();
}
function ask(first){
  const again = doing === 'fire'; doing = null;
  const book = holding('book'), title = book && BOOKS.find(b => b.id === book.id).title;
  const text = first ? (book ? `Ahh, so cozy by the fire. Should I watch the flames, or read ${title}?`
      : "Ahh, so cozy by the fire. If I borrow a book from Ms. Pembrook, I could read it right here.")
    : pick(["Mmm. What next?", "Still cozy. What now?", "That was nice. What should I do next?"]);
  think([{text, choices:[
    {label: again ? 'Keep watching' : 'Watch the fire', then: watch},
    ...(book ? [{label: `Read ${title}`, then: () => read(book.id)}] : []),
    {label: 'Get up', then: getUp}]}]);
}
function watch(){
  doing = 'fire';
  think(someThoughts(), () => ask(false));
}
async function read(id){
  doing = 'book'; reads = 1;
  const { readSeated } = await import('../library/reader.js');
  fwd.set(Math.sin(player.angle), 0, Math.cos(player.angle));
  // the book lies open across their lap, its spine just past their knees' middle
  const lap = player.x - fwd.x*(FRONT - HIPS - .4), lapZ = player.z - fwd.z*(FRONT - HIPS - .4);
  if (!readSeated(id, {angle:player.angle, scale:.08, book:[lap, CUSHION + .12, lapZ]}, () => { reads = 0; game.cutCam = cam; ask(false); })) ask(false);
}

// choosing, from behind the chair's outer side, the explorer in it and the fire beyond; watching, from their eyes
function cam(pos, look){
  hero.head.getWorldPosition(headAt); fwd.set(Math.sin(player.angle), 0, Math.cos(player.angle));
  if (doing === 'fire') { pos.copy(headAt).addScaledVector(fwd, .14); pos.y += .02; aim.copy(fireAt); }
  else {
    const out = Math.sign(chair.x)*Math.sign(fwd.z);
    pos.copy(headAt).addScaledVector(fwd, -1.3); pos.x += fwd.z*out*2.2; pos.z -= fwd.x*out*2.2; pos.y += .8;
    aim.copy(headAt).lerp(fireAt, .3); aim.y -= .25;
  }
  look.copy(aim);
}
addEventListener('keydown', e => { if (chair && doing !== 'book' && e.key === 'Escape' && !e.repeat) getUp(); });

hqAnims.push(dt => {
  readsShown = clamp01(readsShown + (reads ? dt : -dt)*2.5);
  // from the eyes, the head would fill the view; it comes back once the camera has drawn away
  if (chair || !hero.head.visible) hero.head.visible = camera.position.distanceTo(hero.head.getWorldPosition(headAt)) > .8;
});
