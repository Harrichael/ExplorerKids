// Lantern Hill HQ: the cottage, garden and hills around them. Importing this builds it.
// The areas share one seeded RNG, so their import order is the layout; reordering
// them reshuffles every tree, flower and rock.

import './scene.js';
import './ground.js';
import './cottage.js';
import './garden.js';
import './residents.js';
import './wider.js';
import './garden-life.js';
import './toy-crane.js';
import './sky.js';
import '../garden/bed.js';
import './daylight.js';
import { bFlush } from '../core/kit.js';
import { addUsable } from '../core/world.js';
import { load } from '../save.js';
import { game } from '../state.js';
import { ask, story } from '../ui/dialogue.js';
import { openWardrobe } from '../ui/wardrobe.js';
import { ARMCHAIRS, LAB_DESK, WINDOW_SEAT } from './cottage.js';
import { BED } from '../garden/bed.js';
import { BENCH } from './garden-life.js';
import { PLAT, groundAt } from './garden.js';
import { npcs } from './residents.js';
import { PLAY } from './toy-crane.js';
import { sunFrom } from './daylight.js';
import { colliders, hqAnims, occMeshes, occluders, scene, sun } from './scene.js';

bFlush(scene);

const surfaceAt = (x, z, y) => y > .3 ? 'deck' : (x < 10.2 ? 'wood' : 'grass');

function areaFor(x, z, y){
  if (y > 2) return 'The Treehouse';
  if (x > 10.3) { if (x > 13.8 && x < 18.6 && z < -6.6) return 'Vegetable Garden'; if (x > 13 && x < 18.5 && z > 3 && z < 8) return 'Wonder Bus'; if (x > 20 && z > 2.5) return 'Lily Pond'; return 'Garden Yard'; }
  if (x < -4.5) return 'Library Nook';
  if (x > 4.5 && z < -1.2) return 'Science Corner';
  if (x > 4.5) return 'Entry Hall';
  return 'Hearth Room';
}

export const HQ = {scene, colliders, occluders, occMeshes, npcs, usables:[], sun, sunFrom, cam:null, bounds:null,
  ground:groundAt, surface:surfaceAt, area:areaFor, update:(dt, t) => hqAnims.forEach(f => f(dt, t))};

async function openFlashcards(){
  const { openLearn } = await import('../learn/flashcards.js');
  openLearn();
}
async function borrowBook(){
  const { borrow } = await import('../library/nook.js');
  borrow();
}
async function sitInWindow(){
  const { sitInWindow } = await import('../library/nook.js');
  sitInWindow();
}
async function sitInChair(c){
  const { sitInChair } = await import('./armchairs.js');
  sitInChair(c);
}
async function openTower(){
  const { openTower } = await import('../tower/block-tower.js');
  openTower();
}
async function openGlobe(){
  const { openGlobe } = await import('../globe/globe.js');
  openGlobe();
}
async function sitOnBench(){
  const { sit } = await import('./pond-bench.js');
  sit();
}
async function openLab(){
  const { openLab } = await import('../lab/index.js');
  openLab();
}
async function openGarden(){
  const { openGarden } = await import('../garden/tend.js');
  openGarden();
}
async function lookThroughTelescope(){
  const { openTelescope } = await import('../sky/telescope.js');
  openTelescope();
}
// the trip lands on a real volcano, so it waits until the explorer has fizzed one at the science desk
async function boardWonderBus(){
  if (!(load('lab')?.done || []).includes('volcano')) {
    story([['sparks', "The Wonder Bus is itching to visit a real volcano, {name}! But first, try the Fizzy Volcano at my science desk."]]);
    return;
  }
  const [{ startCheck, startTrip }, { tectonics }] = await Promise.all([import('../trips/field-trip.js'), import('../trips/tectonics/index.js')]);
  if (!load('trips')?.tectonics) { startTrip(tectonics); return; }
  ask('sparks', "Where to, {name}?", ["The volcano trip!", "Your Explorer Check, on a cloud!", "Not right now"],
    i => i === 0 ? startTrip(tectonics) : i === 1 && startCheck(tectonics));
}
addUsable(HQ, {name:'Wardrobe', x:8.95, z:3.2, range:1.7, verb:'Open the wardrobe', short:'Open', glow:[8.9, 2.95, 3.2], action: () => openWardrobe(false)});
addUsable(HQ, {name:'Flashcards', x:-.45, z:5.4, range:1.5, verb:'Practice phonogram cards', short:'Cards', glow:[-.45, 1.25, 6.1], action:openFlashcards});
addUsable(HQ, {name:'Globe', x:-5.6, z:.75, range:1.3, verb:'Spin the globe', short:'Spin', glow:[-5.6, 1.6, -.2], action:openGlobe});
addUsable(HQ, {name:'Library desk', x:-7.3, z:-1.55, range:1.2, verb:'Borrow a book', short:'Borrow', glow:[-7.2, 1.3, -2.5], action:borrowBook});
const windowSeat = addUsable(HQ, {name:'Window seat', x:WINDOW_SEAT.x + 1.15, z:WINDOW_SEAT.z, range:1.3, verb:'Sit in the window seat', short:'Sit', glow:[WINDOW_SEAT.x, 1.0, WINDOW_SEAT.z], action:sitInWindow});
// reading from the backpack lies them down where they stand, or settles them in the window seat if they're by it
HQ.read = async item => {
  if (item.kind !== 'book') return;
  const { openReader } = await import('../library/reader.js');
  openReader(item.id, game.reach.includes(windowSeat) ? 'window' : 'here');
};
for (const c of ARMCHAIRS) addUsable(HQ, {name:'Armchair', x:c.x + Math.sin(c.ry)*.95, z:c.z + Math.cos(c.ry)*.95, range:1.2, verb:'Sit by the fire', short:'Sit',
  glow:[c.x, 1.2, c.z], action: () => sitInChair(c)});
addUsable(HQ, {name:'Toy crane', x:PLAY.x, z:PLAY.z + 1.2, range:1.4, verb:'Build a block tower', short:'Build', glow:[PLAY.x, 1.0, PLAY.z], action:openTower});
addUsable(HQ, {name:'Experiment desk', x:LAB_DESK.x, z:LAB_DESK.z + 1.05, range:1.2, verb:'Do an experiment', short:'Lab', glow:[LAB_DESK.x, 1.35, LAB_DESK.z + .1], action:openLab});
addUsable(HQ, {name:'Wonder Bus', x:15.9, z:3.6, range:1.9, verb:'Board the Wonder Bus', short:'Board', glow:[15.6, 2.9, 5.5], action:boardWonderBus});
addUsable(HQ, {name:'Pip’s telescope', x:23.7, z:-1.05, y:PLAT, range:1.3, verb:'Look through Pip’s telescope', short:'Look', glow:[24.4, PLAT + 1.5, -.6], action:lookThroughTelescope});
addUsable(HQ, {name:'Pond bench', x:BENCH.x, z:BENCH.z - .78, range:1.25, verb:'Sit on the bench', short:'Sit', glow:[BENCH.x, .9, BENCH.z], action:sitOnBench});
addUsable(HQ, {name:'Vegetable garden', x:BED.x, z:BED.front + .55, range:1.9, verb:'Tend the garden', short:'Garden', glow:[BED.x, .8, BED.z + .3], action:openGarden});
