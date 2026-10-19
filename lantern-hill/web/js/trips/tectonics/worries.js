// Theo's worry list: everything he's sure will go wrong on the trip. Each place's science crosses one
// off, and the last one turns into something braver.
//
//   worries(-1);   // just the list
//   worries(2);    // the first two already crossed off, and the third crossed off now

import { Sound } from '../../core/sound.js';

const LIST = ["The volcano will burn us.", "We'll sink in lava.", "The crack will swallow us.", "The ground will fall apart."];
const BRAVE = "The ground shakes, but I know what to do!";
const el = document.createElement('div'); el.id = 'worries'; el.hidden = true; el.setAttribute('role', 'status');
document.body.append(el);
let hide = 0;

export function worries(k){
  el.innerHTML = '<b>Theo’s worry list</b><ol>' + LIST.map((w, i) => `<li class="${i < k ? 'done' : i === k ? 'now' : ''}">${w}</li>`).join('') +
    (k === LIST.length - 1 ? `<li class="brave">${BRAVE}</li>` : '') + '</ol>';
  // shown again, it pops in again
  el.hidden = true; void el.offsetWidth; el.hidden = false;
  Sound.tone(659, {type:'triangle', dur:.15, vol:.06});
  if (k >= 0) { Sound.hiss({t:.9, dur:.4, vol:.05, type:'bandpass', freq:2600}); Sound.tone(784, {type:'triangle', t:1.4, dur:.2, vol:.07}); Sound.tone(1046, {type:'triangle', t:1.55, dur:.35, vol:.07}); }
  clearTimeout(hide); hide = setTimeout(() => { el.hidden = true; }, k < 0 ? 6000 : 5000);
}
