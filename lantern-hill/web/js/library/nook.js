// The Library Nook's lending desk and window seat. Reading itself is reader.js.

import { PERSONA } from '../characters/cast.js';
import { Sound } from '../core/sound.js';
import { WINDOW_SEAT } from '../hq/cottage.js';
import { sitDown, standUp } from '../hq/sit.js';
import { keys } from '../input.js';
import { hero } from '../player.js';
import { load, save } from '../save.js';
import { story, think } from '../ui/dialogue.js';
import { carry, holding, putBack } from '../ui/inventory.js';
import { BOOKS, progress } from './books.js';

// Ms. Pembrook's desk shows every book on the shelf. The backpack holds one, so borrowing another hands the
// one they have back to her; what they've read of each is kept either way.
const desk = document.createElement('div'); desk.className = 'ipanel'; desk.hidden = true;
desk.setAttribute('role', 'dialog'); desk.setAttribute('aria-label', 'Borrow a book');
desk.innerHTML = `<div class="iwrap"><header><h2>Borrow a book</h2><button class="pill" id="lClose">Close</button></header><div id="lBooks"></div>
  <div class="keyhint"><kbd>Esc</kbd> to close</div></div>`;
document.body.appendChild(desk);
const titleOf = id => BOOKS.find(b => b.id === id).title;
function shut(){ if (!desk.hidden) { desk.hidden = true; Sound.close(); } }
desk.addEventListener('click', e => { if (e.target === desk) shut(); });
desk.querySelector('#lClose').addEventListener('click', shut);
// Enter and Space are left to press the focused button
addEventListener('keydown', e => { if (desk.hidden) return; e.stopPropagation(); if (e.key === 'Escape') shut(); }, true);

export function borrow(){
  const held = holding('book'), list = desk.querySelector('#lBooks'); list.innerHTML = '';
  for (const b of BOOKS.filter(x => x.pages)) {
    const mine = held && held.id === b.id, row = document.createElement('div'); row.className = 'islot';
    row.innerHTML = `<img alt="" src="${b.dir}p001.jpg" style="aspect-ratio:${b.aspect}"><div class="what">${b.title}<em>${progress(b)}</em></div>
      <button class="iread"${mine ? ' disabled' : ''}>${mine ? 'In your<br>backpack' : 'Borrow'}</button>`;
    if (!mine) row.querySelector('button').addEventListener('click', () => lend(b, held));
    list.append(row);
  }
  for (const k in keys) keys[k] = false;
  desk.hidden = false; Sound.open();
  const first = desk.querySelector('.iread:not(:disabled)'); if (first) first.focus();
}
function lend(b, held){
  shut();
  const lines = held ? [['pembrook', `I'll put ${titleOf(held.id)} back on the shelf for you. And here's ${b.title}. Happy reading, dear!`]]
    : [['pembrook', `A reader! How wonderful. Here you are, dear: ${b.title}. It's one of my favorites.`],
       ['pembrook', "Keep it in your backpack and read it wherever you like. Though I'd try the window seat."]];
  story(lines, () => { putBack('book'); carry({kind: 'book', id: b.id}); });
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
