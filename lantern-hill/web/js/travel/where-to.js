// Inside the treehouse hut, a wishing globe: spin it, tap anywhere, and Pip's magic will take the
// treehouse there. Says what the place is, what time it is there and when its night falls.
//
//   const place = await chooseWhere();   // {name, lat, lon, home}, or null if they changed their mind

import { Sound } from '../core/sound.js';
import { earthMap } from '../globe/paint.js';
import { makeGlobe } from '../globe/stage.js';
import { keys } from '../input.js';
import { clock } from '../play.js';
import { HOME, localTime, tonight, where } from '../sky/observer.js';
import { game } from '../state.js';

const css = document.createElement('style');
css.textContent = `
.wishing #world,.wishing .vignette,.wishing .hud,.wishing #stick,.wishing #talk,.wishing #use,.wishing #prompt,.wishing #dialog{display:none!important}
#wish{position:fixed;inset:0;display:flex;flex-direction:column;padding-top:env(safe-area-inset-top,0px);padding-bottom:env(safe-area-inset-bottom,0px);animation:fadein .5s ease-out;
  background:radial-gradient(1.5px 1.5px at 14% 22%,#fff9 50%,transparent),radial-gradient(1px 1px at 72% 14%,#fff8 50%,transparent),radial-gradient(1.5px 1.5px at 60% 86%,#fff7 50%,transparent),radial-gradient(1px 1px at 86% 60%,#fff7 50%,transparent),radial-gradient(ellipse at 50% 40%,#5b3a6e,#1d1430 72%)}
#wish header{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:10px max(16px,env(safe-area-inset-left,0px)) 4px}
#wish h2{margin:0;font-family:var(--display);font-weight:400;font-size:clamp(19px,4.6vw,26px);color:var(--parch);line-height:1.1}
#wish .sub{font-size:12px;font-weight:900;letter-spacing:1.1px;text-transform:uppercase;color:var(--gold)}
#wish .wb{font-family:var(--display);font-size:16px;color:var(--parch);background:var(--plum);border:2.5px solid var(--gold);border-radius:14px;padding:7px 14px;box-shadow:0 0 0 3px var(--ink);cursor:pointer}
#wish .wb.ghost{background:rgba(239,224,191,.08)}
#wish button:focus-visible{outline:3px solid var(--parch);outline-offset:3px}
#wish .wmain{flex:1;min-height:0;display:flex;gap:14px;padding:0 max(16px,env(safe-area-inset-left,0px)) 14px}
#wcv{flex:1;min-width:0;min-height:0;display:block;touch-action:none;cursor:grab}
#wcv.dragging{cursor:grabbing}
#wish .wcard{width:min(320px,40vw);align-self:center;box-sizing:border-box;background:#f6ecd6;color:var(--ink);border:3px solid var(--gold);border-radius:18px;box-shadow:0 0 0 4px var(--ink),0 14px 30px rgba(0,0,0,.4);padding:14px 16px 16px;display:flex;flex-direction:column;gap:8px}
#wish .wcard h3{margin:0;font-family:var(--display);font-weight:400;font-size:21px;line-height:1.15}
#wish .wcard p{margin:0;font-weight:800;font-size:15px;line-height:1.45}
#wish .wcard .row{display:flex;flex-wrap:wrap;gap:8px;margin-top:4px}
#wish .hint{font-weight:900;font-size:16px;line-height:1.45;color:#6d3b5e;text-align:center;padding:8px 4px}
@media (max-aspect-ratio:1/1){#wish .wmain{flex-direction:column;gap:8px}#wish .wcard{width:auto;align-self:stretch}}
@media (prefers-reduced-motion:reduce){#wish{animation:none}}`;
document.head.appendChild(css);

const el = document.createElement('div'); el.id = 'wish'; el.hidden = true; el.setAttribute('role', 'dialog'); el.setAttribute('aria-label', 'Where should the treehouse go?');
el.innerHTML = `<header><div><div class="sub">Pip's magic treehouse</div><h2>Where shall we go?</h2></div><button class="wb ghost" id="wStay">Never mind</button></header>
  <div class="wmain"><canvas id="wcv" aria-label="The wishing globe. Drag to spin, tap a place to pick it. Arrow keys spin it, Enter picks the middle."></canvas>
    <aside class="wcard" id="wCard" aria-live="polite"></aside></div>`;
document.body.appendChild(el);
const card = el.querySelector('#wCard');

let earth = null, picked = null, done = null;
const globe = makeGlobe(el.querySelector('#wcv'), (lat, lon) => pick(lat, lon));

function hint(){
  const here = where();
  card.innerHTML = `<div class="hint">${earth ? 'Spin the globe and tap anywhere in the world!' : 'Unrolling the map…'}</div>
    ${here.home ? '' : '<div class="row"><button class="wb" data-home>Home to Lantern Hill</button></div>'}`;
  card.querySelector('[data-home]')?.addEventListener('click', () => finish(HOME));
}
// the name is the world model's: the region, sea or lake that covers the spot
function pick(lat, lon){
  if (!earth) return;
  const p = earth.placeAt(lat, lon), now = Date.now(), night = tonight({lat, lon}, now);
  picked = {name: p.name, lat: Math.round(lat*100)/100, lon: Math.round(lon*100)/100, home: false};
  globe.pinAt(lat, lon, false);
  const when = night - now < 60000 ? 'The stars are already out!' : `Night falls there at about ${localTime({lon}, night)}.`;
  card.innerHTML = `<h3></h3>
    <p>It's ${localTime({lon}, now)} there right now. ${when}</p>
    <div class="row"><button class="wb" data-go>Whisk us here!</button>${where().home ? '' : '<button class="wb ghost" data-home>Home to Lantern Hill</button>'}</div>`;
  card.querySelector('h3').textContent = p.name;
  card.querySelector('[data-go]').addEventListener('click', () => finish(picked));
  card.querySelector('[data-home]')?.addEventListener('click', () => finish(HOME));
  Sound.tone(660, {type: 'triangle', dur: .1, vol: .06}); Sound.tone(990, {type: 'triangle', t: .07, dur: .14, vol: .05});
}

let raf = 0, last = 0;
function loop(ts){
  if (game.activity !== 'travel') return;
  const dt = Math.min(.05, (ts - last)/1000 || 0); last = ts;
  globe.frame(dt);
  raf = requestAnimationFrame(loop);
}
export function chooseWhere(){
  game.activity = 'travel'; for (const k in keys) keys[k] = false; picked = null;
  document.documentElement.classList.add('wishing'); el.hidden = false; hint();
  if (!earth) earthMap(true).then(m => { earth = m.earth; globe.setMap(m.map); if (!picked) hint(); }, () => { card.innerHTML = '<div class="hint">The map is lost! Try again in a moment.</div>'; });
  Sound.duck(true); [523, 659, 784, 1046].forEach((f, i) => Sound.tone(f, {type: 'sine', t: i*.1, dur: .5, vol: .05}));
  last = performance.now(); raf = requestAnimationFrame(loop);
  return new Promise(r => { done = r; });
}
function finish(place){
  if (game.activity !== 'travel') return;
  game.activity = null; el.hidden = true; globe.release(); cancelAnimationFrame(raf);
  document.documentElement.classList.remove('wishing');
  Sound.duck(false); clock.getDelta();
  done(place); done = null;
}
el.querySelector('#wStay').addEventListener('click', () => finish(null));
addEventListener('keydown', e => {
  if (game.activity !== 'travel') return;
  e.stopPropagation();
  if (e.key === 'Escape') { finish(null); return; }
  globe.key(e);
  if (e.key === 'Enter' && e.target === document.body) { const m = globe.middle(); pick(m.lat, m.lon); }
}, true);
