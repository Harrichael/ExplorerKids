import * as THREE from 'three';
import { makeLabel } from '../characters/build.js';
import { PERSONA } from '../characters/cast.js';
import { C, T, add, col, cyl, grp, outlineMat, rand, rr } from '../core/kit.js';
import { PLAT } from './garden.js';
import { scene } from './scene.js';

export const npcs = [];
function addNPC(p, x, y, z, ry, lines, extra){
  const model = p.make();
  model.root.position.set(x, y, z); model.root.rotation.y = ry; scene.add(model.root);
  model.root.traverse(m => { if (m.isMesh && m.material !== outlineMat) m.castShadow = true; });
  const label = makeLabel(p.name, p.dot); label.position.set(x, y + p.labelY, z); scene.add(label);
  const n = Object.assign({model, x, y, z, gy:y, baseAngle:ry, label, labelY:p.labelY, line:0, t:rand()*10, range:2.4, blinkAt:rr(1,4)},
    {pid:p.id, name:p.name, role:p.role, dot:p.dot, kind:p.kind, voice:p.voice, persona:p, lines}, extra);
  npcs.push(n);
  col(x - .35, x + .35, z - .35, z + .35, y - .2, y + 2);
  return n;
}

const perch = grp(2.9, 0, -5.4);
cyl(.4,.48,.12,T(C.woodDk),0,.06,0,perch,10); cyl(.07,.09,1.9,T(C.wood),0,1,0,perch,8);
cyl(.06,.06,1.0,T(C.wood),0,1.95,0,perch,8).rotation.z = Math.PI/2;
add(new THREE.SphereGeometry(.09,8,6), T(C.forest), -.45,2.02,0, perch).scale.set(1.4,.6,.8);
col(2.5, 3.3, -5.8, -5.0, -5, 2.4);

addNPC(PERSONA.hoot, 2.9, 1.97, -5.4, 0, [
  "Hoo-hoo! Welcome, welcome, {name}. Pull up a cushion by the fire.",
  "I have lived on Lantern Hill for a very long time. Every question asked here is a little lantern, and together they light the whole hill.",
  "An owl secret: I can turn my head most of the way around. Please do not try this yourself.",
  "The library is through the arch to the west, the science corner is east, and the garden is out the green door."
], {range:2.7, gy:0});

addNPC(PERSONA.pembrook, -7.3, 0, -3.55, 0, [
  "Oh! Hello there, {name}, dear. Welcome to the Library Nook.",
  "Every book on these shelves is a door. The red ones open onto adventures, the blue ones onto sky and sea, and the green ones are full of animals.",
  "I keep a pencil in my hair so I never lose it. I have lost it anyway, twice today.",
  "Soon you'll be able to borrow books and collect library stars. The window seat is the coziest spot to read."
]);

addNPC(PERSONA.sparks, 7.6, 0, -4.7, 0, [
  "Aha, {name}! A new lab partner! Dr. Vega Sparks, at your service. Goggles are optional. Curiosity is required.",
  "See the bus parked in the garden? That's the Wonder Bus. It can float, shrink, and dive, and one day we'll take it on a field trip.",
  "A real scientist makes a guess, tests it, and is happy to be wrong. Wrong answers are just clues wearing a disguise.",
  "Those glowing jars? Mostly colored water and a little fizz. The real magic is asking 'why?' until you find out."
]);

addNPC(PERSONA.biscuit, -.9, 0, -4.7, .4, [
  "Mrrrp. (Biscuit opens one eye, decides {name} is acceptable, and closes it again.)",
  "Prrrrrrr... (She is very warm. The fire is very warm. Everything is very warm.)",
  "Mew! (That meant 'more chin scratches, please.')"
], {range:1.9});

addNPC(PERSONA.pip, 19.5, PLAT, -4.4, Math.PI*.25, [
  "Hey {name}, you made it up the ramp! Welcome to the treehouse. Juniper and I built the railing ourselves. Mostly.",
  "From up here you can see the whole garden. I count fireflies every night. My record is forty-six!",
  "Inside the hut there's a map of every place we want to explore: volcanoes, coral reefs, even the Moon. Want to help us fill it in?"
]);

addNPC(PERSONA.juniper, 23.2, PLAT, -1.3, -Math.PI*.6, [
  "Hi! I'm Juniper. I always wear my raincoat, because you never know what an adventure will bring.",
  "I write down everything in this notebook. Today: one owl, one sleepy cat, and one new explorer named {name}. That's you!",
  "Every time we finish an adventure, we hang a new lantern on the railing. Four so far. The next one might be ours together."
]);
