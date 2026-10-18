// The Library Nook's lending desk and window seat. Reading itself is reader.js, on the reading rug.

import { WINDOW_SEAT } from '../hq/cottage.js';
import { sitDown, standUp } from '../hq/sit.js';
import { hero } from '../player.js';
import { story, think } from '../ui/dialogue.js';
import { carry, holding } from '../ui/inventory.js';
import { BOOKS } from './books.js';

export function borrow(){
  const held = holding('book');
  if (held) { story([['pembrook', `You already have ${BOOKS.find(b => b.id === held.id).title} in your backpack, dear. Enjoy it!`]]); return; }
  const b = BOOKS.find(x => x.pages);
  story([['pembrook', `A reader! How wonderful. Here you are, dear: ${b.title}. It's one of my favorites.`],
    ['pembrook', "Keep it in your backpack, and stretch out on the reading rug whenever you want to read."]],
    () => carry({kind: 'book', id: b.id}));
}

// they sit facing the room with their back to the window, so they walk up to the seat's front edge
// and shuffle back onto it
const FRONT = {x: WINDOW_SEAT.x + .8, z: WINDOW_SEAT.z}, BACK = .65;

export function sitInWindow(){
  const pose = p => {
    hero.legL.rotation.x = hero.legR.rotation.x = -1.4*p; hero.armL.rotation.x = hero.armR.rotation.x = -.4*p;
    hero.body.position.y = (WINDOW_SEAT.y + .01 - .66*hero.body.scale.y)*p + Math.sin(p*Math.PI)*.15;
    hero.body.position.z = -BACK*p;
  };
  sitDown({...FRONT, angle: Math.PI/2, pose, seated: () => think([
    {text: "Ahh, the window seat. Ms. Pembrook was right: it's the coziest spot in the whole cottage."},
    {text: holding('book') ? "The sun is so warm through the window. Later I'll stretch out on the rug and read my book."
      : "If I borrow a book from Ms. Pembrook's desk, I could curl up with it on the reading rug."}], standUp)});
}
