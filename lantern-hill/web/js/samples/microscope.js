// Dr. Sparks' microscope: the jars brought home go under it one by one, blurry until the explorer
// turns the focus knob, and then each is a slide in the tray for good. The tray keeps an empty space
// for every sample not yet found, under the place it comes from, so a gap is a reason to go back.

import { Sound } from '../core/sound.js';
import { keys } from '../input.js';
import { $ } from '../ui/dom.js';
import { SAMPLES, jars, look, slides } from './index.js';
import { drawSlide } from './slides.js';

const css = document.createElement('style');
css.textContent = `
#mscope{position:fixed;inset:0;display:flex;align-items:center;justify-content:center;padding:calc(16px + env(safe-area-inset-top,0px)) max(16px,env(safe-area-inset-right,0px)) calc(16px + env(safe-area-inset-bottom,0px)) max(16px,env(safe-area-inset-left,0px));background:rgba(26,19,32,.6);z-index:20;animation:ifade .2s ease-out}
#mscope .mwrap{box-sizing:border-box;width:min(780px,100%);max-height:100%;overflow-y:auto;background:#f6ecd6;color:#1a1320;border:3px solid var(--gold);border-radius:18px;box-shadow:0 0 0 4px var(--ink),0 14px 34px rgba(0,0,0,.45);padding:14px 18px 16px}
#mscope header{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-bottom:10px}
#mscope h2{margin:0;font-family:var(--display);font-weight:400;font-size:26px;color:var(--plum)}
#mscope .count{font-weight:900;font-size:14px;color:#6d3b5e;margin-left:auto}
#mscope .mbody{display:flex;gap:20px;align-items:flex-start}
#mscope .eye{flex:none;display:flex;flex-direction:column;align-items:center;gap:10px}
#mscope .lens{width:300px;height:300px;border-radius:50%;overflow:hidden;background:#1a1320;box-shadow:0 0 0 10px #b8862e,0 0 0 13px #7a5418,0 0 0 16px var(--ink),inset 0 0 18px rgba(0,0,0,.6),0 10px 20px rgba(0,0,0,.35);margin:16px}
#mscope .lens canvas{width:100%;height:100%;display:block;transition:filter .08s linear}
#mscope .knobrow{display:flex;align-items:center;gap:10px;font-weight:900;color:#6d3b5e;font-size:14px}
#mscope .knob{width:62px;height:62px;border-radius:50%;cursor:pointer;border:3px solid var(--ink);touch-action:none;
  background:radial-gradient(circle at 38% 34%,#ffe7a0 0 14%,transparent 15%),repeating-conic-gradient(#d9a441 0 8deg,#a8762a 8deg 16deg);box-shadow:0 0 0 3px #7a5418,0 4px 8px rgba(0,0,0,.35)}
#mscope .knob:focus-visible{outline:3px solid var(--plum);outline-offset:4px}
#mscope .side{flex:1;min-width:0}
#mscope .cap{min-height:92px;background:#fff8e8;border:2px solid rgba(109,59,94,.25);border-radius:12px;padding:10px 12px;margin-bottom:12px}
#mscope .cap b{display:block;font-family:var(--display);font-weight:400;font-size:21px;color:var(--plum);margin-bottom:3px}
#mscope .cap span{font-weight:800;font-size:15px;line-height:1.35}
#mscope .cap.new b{color:var(--rust)}
#mscope .group{margin-bottom:8px}
#mscope .group h3{margin:0 0 4px;font-size:11px;font-weight:900;letter-spacing:1.2px;text-transform:uppercase;color:#8a6a5a}
#mscope .slots{display:flex;flex-wrap:wrap;gap:6px}
#mscope .slot{width:64px;height:40px;border-radius:5px;display:flex;align-items:center;justify-content:center;padding:0;font:inherit}
#mscope .slot.empty{border:2px dashed rgba(109,59,94,.35);background:transparent}
#mscope .slot.full{border:2px solid var(--ink);background:linear-gradient(135deg,#e8f6fa,#c8e2ec);cursor:pointer;box-shadow:0 2px 3px rgba(0,0,0,.25)}
#mscope .slot.full canvas{width:30px;height:30px;border-radius:50%;box-shadow:0 0 0 1.5px var(--ink)}
#mscope .slot.on{box-shadow:0 0 0 3px var(--gold),0 0 0 5px var(--ink)}
#mscope .slot.pop{animation:slotpop .6s cubic-bezier(.3,1.8,.5,1)}
#mscope .slot.jar{border:2px dashed var(--rust);background:rgba(181,85,47,.08)}
@keyframes slotpop{from{transform:scale(.3)}}
#mscope .next{font-family:var(--display);font-size:17px;color:var(--parch);background:var(--plum);border:2.5px solid var(--gold);border-radius:14px;padding:8px 14px;box-shadow:0 0 0 3px var(--ink);cursor:pointer}
#mscope .keyhint{margin-top:8px;color:#6d3b5e;font-size:12px;font-weight:800}
#mscope kbd{font:inherit;opacity:.75}
@media (max-height:520px) and (min-width:641px){#mscope .eye{flex-direction:row}#mscope .lens{width:calc(100vh - 190px);height:calc(100vh - 190px);min-width:150px;min-height:150px}#mscope .knobrow{flex-direction:column}}
@media (max-width:640px){#mscope .mbody{flex-direction:column;align-items:center}#mscope .lens{width:220px;height:220px}#mscope .side{width:100%}}`;
document.head.appendChild(css);

const el = document.createElement('div'); el.id = 'mscope'; el.hidden = true; el.setAttribute('role', 'dialog'); el.setAttribute('aria-label', 'Microscope');
el.innerHTML = `<div class="mwrap"><header><h2>Microscope</h2><span class="count"></span><button class="pill" id="mClose">Close</button></header>
  <div class="mbody"><div class="eye"><div class="lens"><canvas></canvas></div><div class="knobrow"><button class="knob" aria-label="Turn the focus knob"></button><span class="khint"></span></div></div>
  <div class="side"><div class="cap"></div><div class="tray"></div><div class="keyhint"></div></div></div></div>`;
document.body.appendChild(el);
const lens = el.querySelector('.lens canvas'), knob = el.querySelector('.knob'), khint = el.querySelector('.khint'), cap = el.querySelector('.cap'),
  tray = el.querySelector('.tray'), countEl = el.querySelector('.count'), hintEl = el.querySelector('.keyhint');

// the jar under the lens, and how far into focus it is
const S = {id:null, queue:[], focus:1, holding:false, turn:0, raf:0, last:0, popped:null};
const thumbs = new Map();
const thumb = id => { if (!thumbs.has(id)) thumbs.set(id, drawSlide(document.createElement('canvas'), id, 60)); return thumbs.get(id); };

function show(id){ S.id = id; drawSlide(lens, id, 360); setBlur(); }
function setBlur(){ lens.style.filter = S.focus >= 1 ? '' : `blur(${(1 - S.focus)*16}px) saturate(${.5 + S.focus*.5})`; knob.style.transform = `rotate(${S.turn}deg)`; }

function render(){
  const have = new Set(slides().map(s => s.id)), jar = S.queue.length && S.focus < 1 ? S.id : null;
  countEl.textContent = `${have.size} of ${SAMPLES.length} samples`;
  const s = SAMPLES.find(x => x.id === S.id);
  if (jar) { cap.className = 'cap new'; cap.innerHTML = `<b>${S.queue.length === 1 ? 'A new sample!' : `${S.queue.length} new samples!`}</b><span>Turn the focus knob to see what's in the jar.</span>`; }
  else if (s) { cap.className = 'cap'; cap.innerHTML = `<b>${s.name}</b><span>${s.line}</span>`; }
  const knobOn = !!jar; knob.style.visibility = knobOn ? '' : 'hidden'; khint.textContent = knobOn ? 'Hold to focus' : '';
  tray.innerHTML = ''; const groups = [...new Set(SAMPLES.map(x => x.from))];
  for (const g of groups) { const box = document.createElement('div'); box.className = 'group'; box.innerHTML = `<h3>${g}</h3><div class="slots"></div>`; tray.append(box);
    const row = box.querySelector('.slots');
    for (const x of SAMPLES.filter(y => y.from === g)) { const b = document.createElement('button'); b.className = 'slot';
      if (have.has(x.id)) { b.classList.add('full'); b.innerHTML = `<canvas width="60" height="60"></canvas>`; b.querySelector('canvas').getContext('2d').drawImage(thumb(x.id), 0, 0);
        b.setAttribute('aria-label', x.name); b.addEventListener('click', () => { if (jar) return; S.focus = 1; show(x.id); render(); Sound.next(); });
        if (x.id === S.id && !jar) b.classList.add('on'); if (x.id === S.popped) b.classList.add('pop'); }
      else { b.classList.add('empty'); b.disabled = true; b.setAttribute('aria-label', 'Not found yet'); if (x.id === jar) b.classList.replace('empty', 'jar'); }
      row.append(b); } }
  S.popped = null;
  const more = !jar && S.queue.length > 1;
  hintEl.innerHTML = jar ? 'Hold <kbd>Space</kbd> to focus · <kbd>Esc</kbd> to close' : more ? '' : '<kbd>Esc</kbd> or <kbd>Z</kbd> to close';
  if (more) { const b = document.createElement('button'); b.className = 'next'; b.innerHTML = 'Next jar <kbd>Space</kbd>'; b.addEventListener('click', nextJar); hintEl.append(b); }
}

function nextJar(){ if (S.focus < 1 || S.queue.length < 2) return; S.queue.shift(); loadJar(); Sound.next(); }
function loadJar(){ S.focus = 0; show(S.queue[0]); render(); }
function tick(now){
  const dt = Math.min(.05, (now - S.last)/1000); S.last = now;
  if (S.holding && S.focus < 1) {
    const was = S.focus; S.focus = Math.min(1, S.focus + dt/1.3); S.turn += dt*240; setBlur();
    if (Math.floor(was*8) !== Math.floor(S.focus*8)) Sound.tone(1800 + S.focus*600, {type:'square', dur:.03, vol:.02, cut:3000});
    if (S.focus >= 1) sharp();
  }
  S.raf = requestAnimationFrame(tick);
}
// in focus: the jar becomes a slide
function sharp(){
  S.holding = false; look(S.id); S.popped = S.id; setBlur();
  [1046, 1319, 1568].forEach((f, i) => Sound.bell(f, {t:i*.08, dur:1.1, vol:.05})); Sound.sparkle(4, {t:.2});
  if (S.queue.length === 1) S.queue = [];
  render();
}

export function openMicroscope(){
  for (const k in keys) keys[k] = false;
  S.queue = jars().map(s => s.id);
  if (S.queue.length) loadJar(); else { S.focus = 1; const all = slides(); show((all.find(s => s.id === S.id) || all[all.length - 1]).id); render(); }
  el.hidden = false; Sound.open(); S.last = performance.now(); S.raf = requestAnimationFrame(tick);
  setTimeout(() => (S.queue.length ? knob : $('mClose')).focus({preventScroll:true}), 60);
}
function close(){ if (el.hidden) return; el.hidden = true; S.holding = false; cancelAnimationFrame(S.raf); Sound.close(); }

const hold = on => e => { e.preventDefault(); S.holding = on && S.focus < 1; if (on) { S.turn += 6; setBlur(); } };
knob.addEventListener('pointerdown', e => { knob.setPointerCapture(e.pointerId); hold(true)(e); });
knob.addEventListener('pointerup', hold(false)); knob.addEventListener('pointercancel', hold(false));
el.querySelector('#mClose').addEventListener('click', close);
el.addEventListener('click', e => { if (e.target === el) close(); });
addEventListener('keydown', e => {
  if (el.hidden) return;
  e.stopPropagation(); e.preventDefault();
  const go = e.key === ' ' || e.key === 'Enter' || e.key === 'e' || e.key === 'E';
  if (go && S.focus < 1) { S.holding = true; return; }
  if (e.repeat) return;
  if (e.key === 'Escape' || e.key === 'z' || e.key === 'Z') close();
  else if (go) nextJar();
}, true);
addEventListener('keyup', e => { if (!el.hidden && (e.key === ' ' || e.key === 'Enter' || e.key === 'e' || e.key === 'E')) S.holding = false; }, true);
