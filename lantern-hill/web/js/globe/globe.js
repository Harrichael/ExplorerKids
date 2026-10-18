// The Explorer's Globe in the Library Nook: spin the Earth, tap anywhere to find out which biome
// covers it, and open the food web of a real place in that biome. Loaded the first time someone
// uses the globe; once the map is painted, the globe in the room wears it too.

import { T } from '../core/kit.js';
import { Sound } from '../core/sound.js';
import { BIOMES, visit } from '../earth/biomes.js';
import { arc } from '../earth/model.js';
import { globeBall } from '../hq/cottage.js';
import { keys } from '../input.js';
import { clock } from '../play.js';
import { load, save } from '../save.js';
import { game } from '../state.js';
import { closeDialog } from '../ui/dialogue.js';
import { drawFoodWeb } from './food-web.js';
import { earthMap } from './paint.js';
import { makeGlobe } from './stage.js';

const css = document.createElement('style');
css.textContent = `
.at-globe #world,.at-globe .vignette,.at-globe .hud,.at-globe #stick,.at-globe #talk,.at-globe #use,.at-globe #prompt,.at-globe #dialog{display:none!important}
#globe{position:fixed;inset:0;display:flex;flex-direction:column;padding-top:env(safe-area-inset-top,0px);padding-bottom:env(safe-area-inset-bottom,0px);animation:fadein .35s ease-out;
  background:radial-gradient(1.5px 1.5px at 12% 18%,#fff9 50%,transparent),radial-gradient(1px 1px at 78% 12%,#fff8 50%,transparent),radial-gradient(1.5px 1.5px at 64% 82%,#fff7 50%,transparent),radial-gradient(1px 1px at 30% 70%,#fff6 50%,transparent),radial-gradient(1px 1px at 88% 56%,#fff7 50%,transparent),radial-gradient(ellipse at 50% 40%,#3b2f63,#1a1430 72%)}
#globe header{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:10px max(16px,env(safe-area-inset-left,0px)) 4px}
#globe h2{margin:0;font-family:var(--display);font-weight:400;font-size:clamp(19px,4.6vw,26px);color:var(--parch);line-height:1.1}
#globe .sub{font-size:12px;font-weight:900;letter-spacing:1.1px;text-transform:uppercase;color:var(--gold)}
#globe .gb{font-family:var(--display);font-size:16px;color:var(--parch);background:var(--plum);border:2.5px solid var(--gold);border-radius:14px;padding:7px 14px;box-shadow:0 0 0 3px var(--ink);cursor:pointer}
#globe .gb.ghost{background:rgba(239,224,191,.08)}
#globe button:focus-visible,#globe .fw-node:focus-visible{outline:3px solid var(--parch);outline-offset:3px}
.gmain{flex:1;min-height:0;display:flex;gap:14px;padding:0 max(16px,env(safe-area-inset-left,0px))}
#gcv{flex:1;min-width:0;min-height:0;display:block;touch-action:none;cursor:grab}
#gcv.dragging{cursor:grabbing}
.gcard{position:relative;width:min(340px,40vw);align-self:center;box-sizing:border-box;background:#f6ecd6;color:var(--ink);border:3px solid var(--gold);border-radius:18px;box-shadow:0 0 0 4px var(--ink),0 14px 30px rgba(0,0,0,.4);padding:14px 16px 16px;display:flex;flex-direction:column;gap:8px}
.gcard .gtop{display:flex;gap:12px;align-items:center}
.gcard .gicon{flex:none;width:52px;height:52px;border-radius:50%;display:grid;place-items:center;font-size:28px;background:var(--c,#2a5b8c);border:3px solid var(--ink)}
.gcard .gkind{font-size:12px;font-weight:900;letter-spacing:1.2px;text-transform:uppercase;color:#6d3b5e}
.gcard h3{margin:0;font-family:var(--display);font-weight:400;font-size:21px;line-height:1.15}
.gcard .gwithin{font-size:13px;font-weight:800;color:#6d3b5e}
.gcard p{margin:0;font-weight:800;font-size:15px;line-height:1.45}
.gcard .gfrom{font-size:13px;font-weight:800;color:#5a4a5e}
.gcard .gb{align-self:flex-start}
.ghint{font-weight:900;font-size:16px;line-height:1.45;color:#6d3b5e;text-align:center;padding:8px 4px}
.gbar{display:flex;align-items:center;gap:10px;padding:8px max(16px,env(safe-area-inset-left,0px)) 4px}
.gfound{flex:none;font-weight:900;font-size:13px;color:var(--gold);font-variant-numeric:tabular-nums;white-space:nowrap}
.gchips{display:flex;gap:8px;overflow-x:auto;padding:4px 2px 8px;scrollbar-width:thin;touch-action:pan-x}
.gchip{flex:none;display:flex;align-items:center;gap:6px;font-family:var(--body);font-weight:800;font-size:13px;color:var(--parch);background:rgba(26,19,32,.6);border:2px solid rgba(217,164,65,.4);border-radius:999px;padding:4px 12px 4px 5px;cursor:pointer;white-space:nowrap}
.gchip i{font-style:normal;width:24px;height:24px;border-radius:50%;display:grid;place-items:center;background:var(--c);border:2px solid var(--ink);font-size:13px}
.gchip.found{border-color:var(--gold);background:rgba(109,59,94,.8)}
.gchip.found::after{content:"✓";color:var(--gold);font-weight:900}
.gcredit{font-size:11px;font-weight:700;color:rgba(239,224,191,.5);text-align:center;padding:0 16px 8px}
#gtoast{position:absolute;left:50%;top:70px;transform:translateX(-50%);background:#efe0bf;color:var(--ink);border:3px solid var(--gold);border-radius:14px;box-shadow:0 0 0 4px var(--ink);padding:6px 18px 8px;text-align:center;pointer-events:none;animation:bannerIn 3s ease both;z-index:2}
#gtoast{white-space:nowrap}
#gtoast b{display:block;font-family:var(--display);font-weight:400;font-size:clamp(17px,4.5vw,22px)}
#gtoast small{font-weight:900;font-size:11px;letter-spacing:1.2px;text-transform:uppercase;color:#6d3b5e}
#gweb{position:absolute;inset:0;display:flex;flex-direction:column;background:radial-gradient(ellipse at 50% 30%,#4a3346,#221c33 75%);padding-top:env(safe-area-inset-top,0px);padding-bottom:env(safe-area-inset-bottom,0px);animation:fadein .3s ease-out}
#gweb .how{margin:0;padding:2px max(16px,env(safe-area-inset-left,0px)) 6px;font-weight:800;font-size:14px;line-height:1.4;color:rgba(239,224,191,.85);max-width:70ch}
#gwSvg{flex:1;min-height:0;width:100%;display:block}
#gwSay{min-height:3.2em;margin:0;padding:6px max(16px,env(safe-area-inset-left,0px)) 12px;font-weight:800;font-size:16px;line-height:1.5;color:var(--parch)}
#gwSay .eats{color:#8fd694}#gwSay .by{color:#f2a65a}
.fw-band{fill:rgba(239,224,191,.03)}.fw-band.odd{fill:rgba(239,224,191,.07)}
.fw-row{fill:var(--gold);font:900 12px var(--body);letter-spacing:1px;text-transform:uppercase}
.fw-edge{fill:none;stroke:rgba(239,224,191,.35);stroke-width:2;transition:opacity .2s}
.fw-edge.dim{opacity:.12}
.fw-edge.food,.fw-edge.eater{stroke-width:3.5;stroke-dasharray:9 7;animation:flow .7s linear infinite}
.fw-edge.food{stroke:#8fd694}.fw-edge.eater{stroke:#f2a65a}
@keyframes flow{to{stroke-dashoffset:-16}}
.fw-head{fill:rgba(239,224,191,.6)}.fw-head.food{fill:#8fd694}.fw-head.eater{fill:#f2a65a}
.fw-node{cursor:pointer;transition:opacity .2s;outline:none}
.fw-node.dim{opacity:.3}
.fw-disc{fill:#f6ecd6;stroke:var(--ink);stroke-width:3}
.fw-disc.maker{fill:#cfe6b8}
.fw-node.sel .fw-disc{stroke:var(--gold);stroke-width:5}
.fw-icon{font-size:30px;text-anchor:middle;dominant-baseline:central;font-family:"Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif;pointer-events:none}
.fw-name{fill:var(--parch);font:800 13px var(--body);text-anchor:middle;paint-order:stroke;stroke:var(--ink);stroke-width:3px;pointer-events:none}
@media (max-aspect-ratio:1/1){.gmain{flex-direction:column;gap:8px}.gcard{width:auto;align-self:stretch;margin-bottom:4px}.gcard p{font-size:14px}}
@media (prefers-reduced-motion:reduce){#globe,#gweb,#gtoast{animation:none}.fw-edge.food,.fw-edge.eater{animation:none}}`;
document.head.appendChild(css);

const el = document.createElement('div'); el.id = 'globe'; el.hidden = true; el.setAttribute('role', 'dialog'); el.setAttribute('aria-label', "Explorer's Globe");
el.innerHTML = `<header><div><div class="sub">Library Nook</div><h2>Explorer's Globe</h2></div><button class="gb ghost" id="gClose">Close</button></header>
  <div class="gmain"><canvas id="gcv" aria-label="The globe. Drag to spin, tap a place to visit it. Arrow keys spin it, Enter visits the middle."></canvas>
    <aside class="gcard" id="gCard" aria-live="polite"></aside></div>
  <div class="gbar"><span class="gfound" id="gFound"></span><div class="gchips" id="gChips" role="group" aria-label="Visit a biome"></div></div>
  <div class="gcredit" id="gCredit"></div>
  <div id="gweb" hidden><header><div><div class="sub" id="gwSub"></div><h2 id="gwTitle"></h2></div><button class="gb ghost" id="gwBack">Back to the globe</button></header>
    <p class="how">Arrows point from food to the animal that eats it. That's the way energy moves through a habitat, starting with sunlight. Tap an animal to follow its arrows.</p>
    <svg id="gwSvg" role="img"></svg><p id="gwSay" aria-live="polite"></p></div>`;
document.body.appendChild(el);
const $g = id => el.querySelector('#' + id), cv = $g('gcv'), card = $g('gCard');

const stored = load('globe'), found = new Set(stored && Array.isArray(stored.found) ? stored.found : []);

const globe = makeGlobe(cv, (lat, lon) => { if (earth) visitPlace(earth.placeAt(lat, lon), false); });

// ---------- the world model and the map ----------
let earth = null, here = null;
function loadMap(){
  earthMap().then(({earth: e, map}) => {
    if (!earth) {
      earth = e;
      globe.setMap(map);
      globeBall.material = T(0xffffff, {map});
      $g('gCredit').textContent = e.credits.join(' · ');
    }
    if (!here) showHint();
  }, () => { card.innerHTML = '<div class="ghint">The map is lost! Close the globe and try again.</div>'; });
}

function showHint(){ card.style.removeProperty('--c'); card.innerHTML = `<div class="ghint">${earth ? 'Drag to spin the globe.<br>Tap anywhere to see what lives there!' : 'Unrolling the map…'}</div>`; }

function visitPlace(p, fly = true){
  here = p; const b = p.biome, w = p.web;
  globe.pinAt(p.lat, p.lon, fly);
  // a web from far off says so, and says it's the same biome, so nobody thinks those animals live here
  const far = arc(p.lat, p.lon, w.at[0], w.at[1]) > 1500;
  card.style.setProperty('--c', b.color);
  card.innerHTML = `<div class="gtop"><span class="gicon" aria-hidden="true">${b.icon}</span><div><div class="gkind">${b.name}</div><h3>${p.name}</h3>${p.within ? `<div class="gwithin">${p.within}</div>` : ''}</div></div>
    <p>${b.about}</p>
    <div class="gfrom">${far ? `No food web from right here yet. Here's one from another ${b.name.toLowerCase()}: ${w.place}.` : `A food web from ${w.place}.`}</div>
    <button class="gb" id="gWebBtn">Who eats whom?</button>`;
  $g('gWebBtn').addEventListener('click', openWeb);
  Sound.tone(660, {type: 'triangle', dur: .1, vol: .06}); Sound.tone(990, {type: 'triangle', t: .07, dur: .14, vol: .05});
  if (!found.has(p.biomeId)) {
    found.add(p.biomeId); save('globe', {found: [...found]}); chips();
    const t = document.createElement('div'); t.id = 'gtoast'; t.innerHTML = `<small>New biome found · ${found.size} of ${Object.keys(BIOMES).length}</small><b>${b.icon} ${b.name}</b>`;
    el.querySelector('#gtoast')?.remove(); el.append(t); setTimeout(() => t.remove(), 3100);
    [523, 659, 784, 1046].forEach((f, i) => Sound.tone(f, {type: 'triangle', t: .15 + i*.08, dur: .25, vol: .07}));
  }
}

function chips(){
  const all = Object.keys(BIOMES);
  $g('gFound').textContent = `${found.size} of ${all.length} biomes found`;
  $g('gChips').replaceChildren(...all.map(id => {
    const b = BIOMES[id], c = document.createElement('button');
    c.className = 'gchip' + (found.has(id) ? ' found' : ''); c.style.setProperty('--c', b.color);
    c.innerHTML = `<i aria-hidden="true">${b.icon}</i>${b.name}`;
    c.addEventListener('click', () => { if (earth) visitPlace(earth.placeAt(...visit(id))); });
    return c;
  }));
}

// ---------- the food web ----------
function openWeb(){
  if (!here) return;
  const w = here.web;
  $g('gwSub').textContent = `${here.biome.icon} ${here.biome.name} food web`; $g('gwTitle').textContent = w.place[0].toUpperCase() + w.place.slice(1);
  $g('gwSvg').setAttribute('aria-label', `Food web of ${w.place}`);
  const say = $g('gwSay'), idle = 'Tap an animal to see what it eats and what eats it.';
  say.textContent = idle;
  drawFoodWeb($g('gwSvg'), w, s => {
    if (!s) { say.textContent = idle; return; }
    const names = n => n.map(x => x.toLowerCase()).join(', ');
    say.innerHTML = `<b>${s.icon} ${s.name}</b><br>` + (s.eats.length ? `<span class="eats">Eats:</span> ${names(s.eats)}` : '<span class="eats">Makes its food from sunlight</span>')
      + ` · <span class="by">Eaten by:</span> ${s.eatenBy.length ? names(s.eatenBy) : 'nothing here'}`;
    Sound.tone(880, {type: 'triangle', dur: .07, vol: .05});
  });
  $g('gweb').hidden = false; $g('gwBack').focus();
  Sound.tone(523, {type: 'triangle', dur: .12, vol: .06}); Sound.tone(784, {type: 'triangle', t: .08, dur: .16, vol: .06});
}
function closeWeb(){ $g('gweb').hidden = true; $g('gWebBtn')?.focus(); }

// ---------- the frame loop, while the globe is open ----------
let raf = 0, last = 0;
function loop(ts){
  if (game.activity !== 'globe') return;
  const dt = Math.min(.05, (ts - last)/1000 || 0); last = ts;
  globe.frame(dt);
  raf = requestAnimationFrame(loop);
}

export function openGlobe(){
  if (game.activity) return; closeDialog(); game.activity = 'globe'; for (const k in keys) keys[k] = false;
  document.documentElement.classList.add('at-globe'); el.hidden = false; $g('gweb').hidden = true;
  if (!here) showHint(); chips(); if (!earth) loadMap();
  Sound.duck(true); Sound.tone(587, {type: 'triangle', dur: .15, vol: .07}); Sound.tone(880, {type: 'triangle', t: .09, dur: .2, vol: .06});
  last = performance.now(); raf = requestAnimationFrame(loop);
}
function close(){
  if (game.activity !== 'globe') return; game.activity = null; el.hidden = true; globe.release();
  document.documentElement.classList.remove('at-globe'); cancelAnimationFrame(raf);
  Sound.duck(false); clock.getDelta();
}
$g('gClose').addEventListener('click', close); $g('gwBack').addEventListener('click', closeWeb);
addEventListener('keydown', e => {
  if (game.activity !== 'globe') return;
  e.stopPropagation();
  if (e.key === 'Escape') { if (!$g('gweb').hidden) closeWeb(); else close(); return; }
  if (!$g('gweb').hidden) return;
  globe.key(e);
  if (e.key === 'Enter' && e.target === document.body && earth) { const m = globe.middle(); visitPlace(earth.placeAt(m.lat, m.lon), false); }
}, true);
