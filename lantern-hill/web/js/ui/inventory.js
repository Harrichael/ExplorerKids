// What the explorer carries, and the backpack panel to look inside. It has one slot for now, so a
// second thing can only go in once the first comes out.
//
// Reading needs somewhere to sit down, so the world says whether and how: game.world.read(item) is
// set in HQ and missing on field trips.

import { Sound } from '../core/sound.js';
import { BOOKS } from '../library/books.js';
import { load, save } from '../save.js';
import { game } from '../state.js';
import { $ } from './dom.js';

const CAPACITY = 1;
const saved = load('inventory');
const items = saved && Array.isArray(saved.items) ? saved.items : [];

export const holding = kind => items.find(i => i.kind === kind) || null;
export function carry(item){
  if (items.length >= CAPACITY) return false;
  items.push(item); save('inventory', {items});
  bagBtn.classList.remove('new'); void bagBtn.offsetWidth; bagBtn.classList.add('new');
  return true;
}

const css = document.createElement('style');
css.textContent = `
#inventory{position:fixed;inset:0;display:flex;align-items:center;justify-content:center;padding:16px;background:rgba(26,19,32,.55);animation:ifade .2s ease-out;z-index:20}
@keyframes ifade{from{opacity:0}}
#inventory .iwrap{width:min(420px,100%);background:#f6ecd6;color:#1a1320;border:3px solid var(--gold);border-radius:16px;box-shadow:0 0 0 4px var(--ink),0 14px 34px rgba(0,0,0,.45);padding:14px 16px 16px}
#inventory header{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-bottom:12px}
#inventory h2{margin:0;font-family:var(--display);font-weight:400;font-size:24px;color:var(--plum)}
#inventory .islot{display:flex;align-items:center;gap:12px;background:#fff8e8;border:2px dashed rgba(109,59,94,.35);border-radius:12px;padding:10px;min-height:96px}
#inventory .islot img{width:64px;aspect-ratio:4/5;object-fit:cover;border-radius:4px;box-shadow:0 0 0 2px var(--ink),0 3px 6px rgba(0,0,0,.3);background:#6d3b5e}
#inventory .islot .what{flex:1;min-width:0;font-weight:900;font-size:15px;line-height:1.25}
#inventory .islot em{display:block;font-style:normal;font-weight:800;font-size:12px;color:#6d3b5e;margin-top:3px}
#inventory .iempty{flex:1;margin:0;font-weight:800;font-size:14px;color:#6d3b5e;text-align:center}
#inventory .iread{font-family:var(--display);font-size:17px;color:var(--parch);background:var(--plum);border:2.5px solid var(--gold);border-radius:14px;padding:8px 14px;box-shadow:0 0 0 3px var(--ink);cursor:pointer}
#inventory .iread:disabled{opacity:.4;cursor:default}
#inventory .iread kbd,#inventory .keyhint kbd{font:inherit;font-size:12px;opacity:.75}
#inventory .iread:focus-visible{outline:3px solid var(--ink);outline-offset:3px}
#inventory .keyhint{margin-top:10px;color:#6d3b5e}
#bag.new{animation:bagpulse .9s ease-in-out 4}
@keyframes bagpulse{50%{transform:scale(1.15);background:var(--plum)}}
.labbing #bag{display:none}
@media (max-width:560px){#bag span{display:none}}`;
document.head.appendChild(css);
const el = document.createElement('div'); el.id = 'inventory'; el.hidden = true; el.setAttribute('role', 'dialog'); el.setAttribute('aria-label', 'Backpack');
el.innerHTML = `<div class="iwrap"><header><h2>Backpack</h2><button class="pill" id="iClose">Close</button></header><div id="iSlots"></div>
  <div class="keyhint"><kbd>Z</kbd> or <kbd>Esc</kbd> to close</div></div>`;
document.body.appendChild(el);
const bagBtn = $('bag'), slotsEl = el.querySelector('#iSlots');

let reading = null;
function render(){
  const book = holding('book'), b = book && BOOKS.find(x => x.id === book.id);
  reading = null; slotsEl.innerHTML = '';
  const slot = document.createElement('div'); slot.className = 'islot'; slotsEl.append(slot);
  if (!b) { slot.innerHTML = `<p class="iempty">Nothing in here yet. Ms. Pembrook at the library desk will lend you a book.</p>`; return; }
  const st = (load('books') || {})[b.id] || {}, pct = Math.round(100*(st.seen || []).length/b.pages);
  const read = game.world.read;
  slot.innerHTML = `<img alt="" src="${b.dir}p001.jpg"><div class="what">${b.title}<em>${st.read ? 'Finished ⭐' : pct ? pct + '% read' : 'Not started yet'}</em>
    ${read ? '' : '<em>Read it back home at Lantern Hill</em>'}</div><button class="iread"${read ? '' : ' disabled'}>Read <kbd class="keyhint">R</kbd></button>`;
  if (read) { reading = () => { closeInventory(); read(book); }; slot.querySelector('.iread').addEventListener('click', reading); }
}

export function openInventory(){
  render(); el.hidden = false; bagBtn.classList.remove('new');
  Sound.open();
}
function closeInventory(){ if (!el.hidden) { el.hidden = true; Sound.close(); } }
el.addEventListener('click', e => { if (e.target === el) closeInventory(); });
el.querySelector('#iClose').addEventListener('click', closeInventory);
addEventListener('keydown', e => {
  if (el.hidden) return;
  e.stopPropagation(); e.preventDefault();
  if (e.repeat) return;
  if (e.key === 'Escape' || e.key === 'z' || e.key === 'Z') closeInventory();
  else if ((e.key === 'r' || e.key === 'R' || e.key === 'Enter') && reading) reading();
}, true);
