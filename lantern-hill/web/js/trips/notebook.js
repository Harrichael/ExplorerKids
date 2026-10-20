// Juniper's field notebook: after each place, a sticker of what the class found there goes in, so
// the explorer sees the trip's story build up page by page and gets to say it back once more. Each
// page shows a star per find at that place, filled for the ones the explorer saw, so a page with
// stars left over is a reason to go again; a page with every star goes gold.
//
//   await notebook(PAGES, 2, [{seen:2, of:4}, , {seen:1, of:4}]);   // PAGES = [{title, note, draw(ctx, w, h)}, ...]
//   // shows pages 0 and 2, sticking in 2; page 1, with no tally, is still to come

import { Sound } from '../core/sound.js';
import { game } from '../state.js';

const el = document.createElement('div'); el.id = 'notebook'; el.hidden = true; el.setAttribute('role', 'dialog');
el.innerHTML = '<div class="page"><div class="ch">Juniper’s field notebook</div><div class="slots"></div><button class="wbtn">Keep exploring!</button></div>';
document.body.append(el);
const slotsEl = el.querySelector('.slots'), okEl = el.querySelector('button');

export function notebook(pages, now, tallies = []){
  slotsEl.replaceChildren(...pages.map((pg, i) => {
    const n = tallies[i], full = n && n.seen === n.of;
    const s = document.createElement('div'); s.className = 'slot' + (n ? '' : ' empty') + (i === now ? ' new' : '') + (full ? ' full' : '');
    const c = document.createElement('canvas'); c.width = 240; c.height = 170;
    if (n) pg.draw(c.getContext('2d'), c.width, c.height);
    const stars = n ? `<span class="stars" aria-label="${n.seen} of ${n.of} finds">${'★'.repeat(n.seen)}<i>${'★'.repeat(n.of - n.seen)}</i></span>` : '';
    const cap = document.createElement('div'); cap.className = 'cap'; cap.innerHTML = n ? `<b>${pg.title}</b>${pg.note}${stars}` : '<b>?</b>';
    s.append(c, cap); return s;
  }));
  el.hidden = false; game.cutscene = true;
  Sound.tone(659, {type:'triangle', dur:.2, vol:.08}); Sound.tone(988, {type:'triangle', t:.35, dur:.4, vol:.08});
  setTimeout(() => okEl.focus({preventScroll:true}), 80);
  return new Promise(done => {
    const close = () => { el.hidden = true; okEl.removeEventListener('click', close); removeEventListener('keydown', key); Sound.next(); done(); };
    const key = e => { if (e.key === ' ' || e.key === 'Enter' || e.key === 'Escape') { e.preventDefault(); close(); } };
    okEl.addEventListener('click', close); setTimeout(() => addEventListener('keydown', key), 400);
  });
}
