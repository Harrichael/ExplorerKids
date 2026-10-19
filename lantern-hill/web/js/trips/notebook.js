// Juniper's field notebook: after each place, a sticker of what the class found there goes in, so
// the explorer sees the trip's story build up page by page and gets to say it back once more.
//
//   await notebook(PAGES, 1);   // PAGES = [{title, note, draw(ctx, w, h)}, ...]; shows 0..1, sticks in 1

import { Sound } from '../core/sound.js';
import { game } from '../state.js';

const el = document.createElement('div'); el.id = 'notebook'; el.hidden = true; el.setAttribute('role', 'dialog');
el.innerHTML = '<div class="page"><div class="ch">Juniper’s field notebook</div><div class="slots"></div><button class="wbtn">Keep exploring!</button></div>';
document.body.append(el);
const slotsEl = el.querySelector('.slots'), okEl = el.querySelector('button');

export function notebook(pages, upto, last = false){
  slotsEl.replaceChildren(...pages.map((pg, i) => {
    const s = document.createElement('div'); s.className = 'slot' + (i > upto ? ' empty' : '') + (i === upto ? ' new' : '');
    const c = document.createElement('canvas'); c.width = 240; c.height = 170;
    if (i <= upto) pg.draw(c.getContext('2d'), c.width, c.height);
    const cap = document.createElement('div'); cap.className = 'cap'; cap.innerHTML = i <= upto ? `<b>${pg.title}</b>${pg.note}` : '<b>?</b>';
    s.append(c, cap); return s;
  }));
  okEl.textContent = last ? 'All done!' : 'Keep exploring!';
  el.hidden = false; game.cutscene = true;
  Sound.tone(659, {type:'triangle', dur:.2, vol:.08}); Sound.tone(988, {type:'triangle', t:.35, dur:.4, vol:.08});
  setTimeout(() => okEl.focus({preventScroll:true}), 80);
  return new Promise(done => {
    const close = () => { el.hidden = true; okEl.removeEventListener('click', close); removeEventListener('keydown', key); Sound.next(); done(); };
    const key = e => { if (e.key === ' ' || e.key === 'Enter' || e.key === 'Escape') { e.preventDefault(); close(); } };
    okEl.addEventListener('click', close); setTimeout(() => addEventListener('keydown', key), 400);
  });
}
