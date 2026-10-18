// Pip's treehouse magic: once an explorer has spent half an hour at the telescope, Pip lets them in on
// a secret. Step into the treehouse hut, make a wish, and it whisks off to anywhere in the world,
// where the telescope shows that place's sky. This much is all HQ loads up front; the trip itself
// loads when someone says yes.

import { PERSONA } from '../characters/cast.js';
import { load } from '../save.js';
import { where } from '../sky/observer.js';
import { story } from '../ui/dialogue.js';

const UNLOCK = 30*60;   // seconds at the telescope
const unlocked = () => ((load('telescope') || {}).seconds || 0) >= UNLOCK;

const go = () => import('./whisk.js').then(m => m.whisk());
const later = () => story([['pip', "Okay! Whenever you want a magic trip, just ask. The treehouse is always ready."]]);

// what Pip says instead of his usual lines once the magic is unlocked; nothing before then
export function pipTalk(){
  if (!unlocked()) return null;
  const pip = PERSONA.pip, here = where(), first = !load('travel');
  const lines = first ? [
    "{name}, you've been looking through that telescope for SO long. I think you're ready for our biggest secret...",
    "This treehouse is a little bit magic! If we step inside the hut and make a wish, it can whisk us anywhere in the whole world.",
    "And wherever we land, the telescope shows the sky from THERE. Different stars and everything! Want to try it?"
  ] : here.home ? [
    "Ready for another magic trip, {name}? Pick any spot on the globe and the treehouse will take us there!"
  ] : [
    `Hi {name}! How do you like the sky out here? We can whisk somewhere new, or fly home to Lantern Hill.`
  ];
  return lines.map((text, i) => ({p: pip, text,
    choices: i === lines.length - 1 ? [{label: "Yes, let's go!", then: go}, {label: 'Not right now', then: later}] : null}));
}
