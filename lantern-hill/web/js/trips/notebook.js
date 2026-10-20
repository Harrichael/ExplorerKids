// Juniper's field notebook: after each place, a sticker of what the class found there goes in, so
// the explorer sees the trip's story build up page by page and gets to say it back once more. Each
// page shows a star per find at that place, filled for the ones the explorer saw, so a page with
// stars left over is a reason to go again; a page with every star goes gold. Under the stars, a
// count of the place's secrets the explorer stopped to look closer at. A place the trip passed by this
// time is a page waiting for next time: its sticker as a faint pencil sketch, inviting a trip back.
//
//   await notebook(PAGES, 2, [{seen:2, of:4, curios:{seen:1, of:6}}, , {seen:1, of:4}, 'later']);   // PAGES = [{title, note, draw(ctx, w, h)}, ...]
//   // shows pages 0 and 2, sticking in 2; page 1, with no tally, is still to come; page 3 is for next time

import { Sound } from '../core/sound.js';
import { game } from '../state.js';

const el = document.createElement('div'); el.id = 'notebook'; el.hidden = true; el.setAttribute('role', 'dialog');
el.innerHTML = '<div class="page"><div class="ch">Juniper’s field notebook</div><div class="slots"></div><button class="wbtn">Keep exploring!</button></div>';
document.body.append(el);
const slotsEl = el.querySelector('.slots'), okEl = el.querySelector('button');

export function notebook(pages, now, tallies = []){
  slotsEl.replaceChildren(...pages.map((pg, i) => {
    const later = tallies[i] === 'later', n = later ? null : tallies[i], full = n && n.seen === n.of;
    const s = document.createElement('div'); s.className = 'slot' + (later ? ' later' : n ? '' : ' empty') + (i === now ? ' new' : '') + (full ? ' full' : '');
    const c = document.createElement('canvas'); c.width = 240; c.height = 170;
    if (n) pg.draw(c.getContext('2d'), c.width, c.height);
    if (later) sketch(c.getContext('2d'), pg, c.width, c.height);
    const c2 = n && n.curios, stars = n ? `<span class="stars" aria-label="${n.seen} of ${n.of} finds">${'★'.repeat(n.seen)}<i>${'★'.repeat(n.of - n.seen)}</i></span>` +
      (c2 && c2.of ? `<span class="curios${c2.seen === c2.of ? ' all' : ''}">🔍 ${c2.seen} of ${c2.of} secrets</span>` : '') : '';
    const cap = document.createElement('div'); cap.className = 'cap'; cap.innerHTML = n ? `<b>${pg.title}</b>${pg.note}${stars}` : later ? `<b>${pg.title}</b><span class="next">Next time!</span>` : '<b>?</b>';
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
// the sticker as Juniper might pencil it in ahead of time: the picture washed pale and soft, and a little
// paper star tucked in the corner
function sketch(g, pg, w, h){
  pg.draw(g, w, h);
  g.fillStyle = 'rgba(255,248,232,.72)'; g.fillRect(0, 0, w, h);
  g.strokeStyle = 'rgba(109,59,94,.55)'; g.lineWidth = 3; g.setLineDash([9, 7]); g.strokeRect(8, 8, w - 16, h - 16); g.setLineDash([]);
  g.save(); g.translate(w - 34, 34); g.rotate(.25); g.beginPath();
  for (let k = 0; k < 10; k++) { const r = k % 2 ? 9 : 21, a = k*Math.PI/5 - Math.PI/2; g.lineTo(Math.cos(a)*r, Math.sin(a)*r); }
  g.closePath(); g.fillStyle = '#ffd36b'; g.fill(); g.strokeStyle = '#1a1320'; g.lineWidth = 2.5; g.stroke(); g.restore();
}
