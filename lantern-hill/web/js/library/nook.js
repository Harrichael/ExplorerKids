// The Library Nook's lending desk and window seat. Reading itself is reader.js.

import { PERSONA } from '../characters/cast.js';
import { WINDOW_SEAT } from '../hq/cottage.js';
import { sitDown, standUp } from '../hq/sit.js';
import { hero } from '../player.js';
import { load, save } from '../save.js';
import { story, think } from '../ui/dialogue.js';
import { carry, holding } from '../ui/inventory.js';
import { BOOKS } from './books.js';

export function borrow(){
  const held = holding('book');
  if (held) { story([['pembrook', `You already have ${BOOKS.find(b => b.id === held.id).title} in your backpack, dear. Enjoy it!`]]); return; }
  const b = BOOKS.find(x => x.pages);
  story([['pembrook', `A reader! How wonderful. Here you are, dear: ${b.title}. It's one of my favorites.`],
    ['pembrook', "Keep it in your backpack and read it wherever you like. Though I'd try the window seat."]],
    () => carry({kind: 'book', id: b.id}));
}

// The next time they talk to her after finishing a book, she cheers it, once for each book. What she
// has cheered she keeps in her own save slot: the reader saves its book records whole, and would
// drop a mark left in them.
export function pembrookTalk(){
  const books = load('books') || {}, mine = load('pembrook') || {}, cheered = {...mine.praised};
  const fresh = BOOKS.filter(b => books[b.id] && books[b.id].read && !cheered[b.id]);
  if (!fresh.length) return null;
  for (const b of fresh) cheered[b.id] = true;
  save('pembrook', {praised: cheered});
  const titles = fresh.map(b => b.title), named = titles.length > 1 ? titles.slice(0, -1).join(', ') + ' and ' + titles.at(-1) : titles[0];
  return [
    `{name}! You finished ${named}, every single page? Great job, dear!`,
    "Reading a whole book from start to finish is what real readers do. I'm so proud of you."
  ].map(text => ({p: PERSONA.pembrook, text}));
}

// with nothing to read they sit facing the room, back to the window: they walk up to the seat's front edge
// and shuffle back onto it
const FRONT = {x: WINDOW_SEAT.x + .95, z: WINDOW_SEAT.z}, BACK = .8;

export async function sitInWindow(){
  const book = holding('book');
  if (book) { const { openReader } = await import('./reader.js'); openReader(book.id, 'window'); return; }
  const pose = p => {
    hero.legL.rotation.x = hero.legR.rotation.x = -1.4*p; hero.armL.rotation.x = hero.armR.rotation.x = -.4*p;
    hero.body.position.y = (WINDOW_SEAT.y + .01 - .66*hero.body.scale.y)*p + Math.sin(p*Math.PI)*.15;
    hero.body.position.z = -BACK*p;
  };
  sitDown({...FRONT, angle: Math.PI/2, pose, seated: () => think([
    {text: "Ahh, the window seat. Ms. Pembrook was right: it's the coziest spot in the whole cottage."},
    {text: "If I borrow a book from Ms. Pembrook's desk, I could read it right here."}], standUp)});
}
