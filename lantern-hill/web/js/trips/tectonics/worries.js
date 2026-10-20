// Basil's worry list: everything he's sure will go wrong on the trip. A find's science crosses one
// off, and the last one turns into something braver. The explorer may skip a find, so worries get
// crossed off in any order, and some may still be on the list at the end.
//
//   worries();              // a fresh list, shown
//   const line = worries(2);   // the third crossed off now; Basil's "Two worries, crossed off!"

import { Sound } from '../../core/sound.js';
import { game } from '../../state.js';
import { convo } from '../../ui/dialogue.js';

const LIST = ["The volcano will burn us.", "We'll sink in lava.", "The crack will swallow us.", "The ground will fall apart."];
const BRAVE = "The ground shakes, but I know what to do!";
const COUNT = ['One worry', 'Two worries', 'Three worries', 'Four worries'];
const el = document.createElement('div'); el.id = 'worries'; el.hidden = true; el.setAttribute('role', 'status');
document.body.append(el);
const crossed = new Set();
let shown = 0;

export function worries(k = -1){
  if (k < 0) crossed.clear(); else crossed.add(k);
  el.innerHTML = '<b>Basil’s worry list</b><ol>' + LIST.map((w, i) => `<li class="${i === k ? 'now' : crossed.has(i) ? 'done' : ''}">${w}</li>`).join('') +
    (k === LIST.length - 1 ? `<li class="brave">${BRAVE}</li>` : '') + '</ol>';
  // shown again, it pops in again
  el.hidden = true; void el.offsetWidth; el.hidden = false;
  Sound.tone(659, {type:'triangle', dur:.15, vol:.06});
  if (k >= 0) { Sound.hiss({t:.9, dur:.4, vol:.05, type:'bandpass', freq:2600}); Sound.tone(784, {type:'triangle', t:1.4, dur:.2, vol:.07}); Sound.tone(1046, {type:'triangle', t:1.55, dur:.35, vol:.07}); }
  // it stays up through the talk it comes with, or the one just after, and a few seconds at the least,
  // so a fast reader still sees the line get struck
  const me = ++shown, t0 = game.elapsed; let talk = null;
  const watch = () => { if (me !== shown) return;
    if (!talk) talk = convo || (game.elapsed - t0 > 3 ? 'none' : null);
    if (game.elapsed - t0 > 4 && (talk === 'none' ? game.elapsed - t0 > 8 : talk && convo !== talk)) { el.hidden = true; return; }
    requestAnimationFrame(watch); };
  watch();
  return k < 0 ? '' : `${COUNT[crossed.size - 1]}, crossed off!`;
}
