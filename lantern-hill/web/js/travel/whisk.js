// The trip itself: the explorer steps into the treehouse hut and vanishes through its door, picks a
// place on the wishing globe, and the story's page turns to the treehouse standing there tonight.
// They step back out of the door, and Pip says where they've landed.

import { Sound } from '../core/sound.js';
import { sitDown, standUp } from '../hq/sit.js';
import { hero } from '../player.js';
import { whisk as moveTreehouse } from '../sky/observer.js';
import { game } from '../state.js';
import { story } from '../ui/dialogue.js';
import { pageTurn } from '../ui/page-turn.js';
import { chooseWhere } from './where-to.js';

// the hut's door: garden.js builds the hut at x 24, z -4.25, with its door on the west wall
const DOOR = {x:23.04, z:-3.85}, STEP = .6;

export function whisk(){
  sitDown({x:DOOR.x - STEP, z:DOOR.z, angle:Math.PI/2, seated:wish,
    // "sitting" here is stepping through the door, the explorer fading from sight as they go
    pose: p => { hero.root.position.x += p*STEP; hero.root.visible = p < .85; }});
}

async function wish(){
  game.camShake = .5;
  [784, 988, 1175, 1568].forEach((f, i) => Sound.tone(f, {type:'sine', t:i*.08, dur:.6, vol:.05}));
  const place = await chooseWhere();
  if (!place) { standUp(); return; }
  Sound.hiss({dur:1.2, vol:.08, type:'bandpass', freq:900, q:.6});
  pageTurn(() => moveTreehouse(place), () => {
    // the page turn hands control back as it ends; the explorer is still in the doorway
    game.cutscene = true; standUp();
    setTimeout(() => story([['pip', landed(place)]]), 800);
  }, ["Pip's magic treehouse", place.home ? 'Home to Lantern Hill' : place.name]);
}

function landed(place){
  if (place.home) return "Home sweet Lantern Hill! The stars here feel like old friends.";
  const south = place.lat < -10 ? " We're in the southern half of the world, so there are stars here we never see from home!" : '';
  return `We made it, {name}! Welcome to ${place.name}! Quick, look through my telescope. The sky is different here!${south}`;
}
