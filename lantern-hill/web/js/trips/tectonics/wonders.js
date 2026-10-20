// Basil's wonder list: the "I wonder…" questions he brings on the trip. A find's science answers one
// and it gets a gold star; the last one adds something braver. The explorer may skip a find, so
// wonders get answered in any order, and some may still be open at the end.
//
//   wonders();              // a fresh list, shown
//   const line = wonders(2);   // the third answered now; Basil's "Two wonders, answered!"

import { Sound } from '../../core/sound.js';
import { game } from '../../state.js';
import { convo } from '../../ui/dialogue.js';

const LIST = ["I wonder where a volcano's heat comes from.", "I wonder what's under the crust. A lava ocean?",
              "I wonder what happens at a crack in the sea floor.", "I wonder what makes the ground shake."];
const BRAVE = "And when it shakes, I know what to do!";
const COUNT = ['One wonder', 'Two wonders', 'Three wonders', 'All four wonders'];
const css = document.createElement('style');
css.textContent = `
#wonders{position:fixed;top:calc(84px + env(safe-area-inset-top,0px));left:16px;right:16px;margin:0 auto;width:fit-content;max-width:min(380px,calc(100% - 32px));box-sizing:border-box;z-index:5;pointer-events:none;
  background:#efe0bf;color:#1a1320;border:3px solid var(--gold);border-radius:14px;box-shadow:0 0 0 4px var(--ink),0 10px 26px rgba(0,0,0,.45);padding:8px 16px 10px;transform:rotate(-1.5deg);animation:popin .35s cubic-bezier(.3,1.4,.5,1);
  background-image:repeating-linear-gradient(transparent 0 23px,rgba(52,64,107,.16) 23px 24px)}
#wonders b{display:block;font-family:var(--display);font-weight:400;font-size:17px;color:#2f6f8f;margin-bottom:2px}
#wonders ul{margin:0;padding:0;list-style:none;font-weight:800;font-size:14.5px;line-height:24px}
#wonders li{position:relative;padding-left:26px}
#wonders li::before{content:'☆';position:absolute;left:0;top:0;font-size:19px;color:#a08c6a}
#wonders li.done::before,#wonders li.now::before{content:'★';color:#e0a21a;text-shadow:0 0 0 #1a1320,0 1px 0 #1a1320}
#wonders li.now::before{transform:scale(0);animation:starpop .5s .9s cubic-bezier(.3,1.8,.5,1) forwards}
#wonders li.now{animation:wonderglow 1.2s .9s ease-out}
#wonders li.brave{padding-left:0;color:#2f8f8a;opacity:0;animation:wonderin .4s 1.6s forwards}
#wonders li.brave::before{content:none}
@keyframes starpop{to{transform:scale(1)}}
@keyframes wonderin{to{opacity:1}}
@keyframes wonderglow{30%{background:rgba(255,211,107,.6);border-radius:8px}}
@media (prefers-reduced-motion: reduce){#wonders,#wonders li.now{animation:none}#wonders li.now::before{animation:none;transform:none}#wonders li.brave{animation:none;opacity:1}}`;
document.head.append(css);
const el = document.createElement('div'); el.id = 'wonders'; el.hidden = true; el.setAttribute('role', 'status');
document.body.append(el);
const answered = new Set();
let shown = 0;

export function wonders(k = -1){
  if (k < 0) answered.clear(); else answered.add(k);
  el.innerHTML = '<b>Basil’s wonder list</b><ul>' + LIST.map((w, i) => `<li class="${i === k ? 'now' : answered.has(i) ? 'done' : ''}">${w}</li>`).join('') +
    (k === LIST.length - 1 ? `<li class="brave">${BRAVE}</li>` : '') + '</ul>';
  // shown again, it pops in again
  el.hidden = true; void el.offsetWidth; el.hidden = false;
  Sound.tone(659, {type:'triangle', dur:.15, vol:.06});
  if (k >= 0) { Sound.tone(1318, {type:'triangle', t:.9, dur:.12, vol:.05}); Sound.tone(784, {type:'triangle', t:1.4, dur:.2, vol:.07}); Sound.tone(1046, {type:'triangle', t:1.55, dur:.35, vol:.07}); }
  // it stays up through the talk it comes with, or the one just after, and a few seconds at the least,
  // so a fast reader still sees the star land
  const me = ++shown, t0 = game.elapsed; let talk = null;
  const watch = () => { if (me !== shown) return;
    if (!talk) talk = convo || (game.elapsed - t0 > 3 ? 'none' : null);
    if (game.elapsed - t0 > 4 && (talk === 'none' ? game.elapsed - t0 > 8 : talk && convo !== talk)) { el.hidden = true; return; }
    requestAnimationFrame(watch); };
  watch();
  return k < 0 ? '' : `${COUNT[answered.size - 1]}, answered!`;
}
