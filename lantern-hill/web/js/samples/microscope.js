// Dr. Sparks' microscope: the jars brought home go under it one by one, blurry until the explorer
// turns the focus knob, and then each is a slide in the tray for good. Under the lens a slide is first
// the game's own drawing of it, then real photos of the real thing, to move about and zoom into. The
// tray holds only what's been found; the count says how much is still out there.

import { Sound } from '../core/sound.js';
import { keys } from '../input.js';
import { $ } from '../ui/dom.js';
import { SAMPLES, jars, look, slides } from './index.js';
import { makeLens, photosOf } from './lens.js';
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
#mscope [hidden]{display:none!important}
#mscope .lens{position:relative;width:300px;height:300px;border-radius:50%;overflow:hidden;background:#1a1320;touch-action:none;box-shadow:0 0 0 10px #b8862e,0 0 0 13px #7a5418,0 0 0 16px var(--ink),inset 0 0 18px rgba(0,0,0,.6),0 10px 20px rgba(0,0,0,.35);margin:16px}
#mscope .lens canvas{width:100%;height:100%;display:block;transition:filter .08s linear}
#mscope .lens .photo{position:absolute;left:0;top:0;max-width:none;opacity:0;transition:opacity .6s;cursor:grab;user-select:none;-webkit-user-select:none}
#mscope .lens .photo.in{opacity:1}
#mscope .lens .photo:active{cursor:grabbing}
#mscope .lens .kind{position:absolute;top:9%;left:50%;transform:translateX(-50%);white-space:nowrap;pointer-events:none;font-size:10px;font-weight:800;letter-spacing:1px;text-transform:uppercase;color:rgba(255,255,255,.62);text-shadow:0 1px 3px rgba(0,0,0,.9)}
#mscope .lens .scale{position:absolute;bottom:8%;left:50%;transform:translateX(-50%);display:flex;flex-direction:column;align-items:center;gap:3px;pointer-events:none;white-space:nowrap;font-size:11px;font-weight:800;color:rgba(255,255,255,.85);text-shadow:0 1px 3px rgba(0,0,0,.9)}
#mscope .lens .scale i{display:block;height:3px;background:rgba(255,255,255,.9);border-radius:2px;box-shadow:0 0 0 1px rgba(0,0,0,.45)}
#mscope .zoom{display:flex;gap:8px}
#mscope .zoom button{width:38px;height:38px;border-radius:50%;border:2.5px solid var(--ink);background:#d9a441;color:var(--ink);font:900 20px/1 var(--body);cursor:pointer;box-shadow:0 0 0 2px #7a5418,0 3px 6px rgba(0,0,0,.3);padding:0}
#mscope .zoom button:disabled{opacity:.4;cursor:default}
#mscope .zoom button:focus-visible{outline:3px solid var(--plum);outline-offset:3px}
#mscope .shots{display:flex;flex-direction:column;align-items:center;gap:4px;min-height:34px;max-width:330px}
#mscope .pics{display:flex;gap:7px}
#mscope .pics button{width:13px;height:13px;border-radius:50%;padding:0;border:2px solid var(--ink);background:transparent;cursor:pointer}
#mscope .pics button.on{background:var(--plum)}
#mscope .credit{font-size:10.5px;font-weight:700;color:#8a6a5a;text-align:center;line-height:1.3}
#mscope .credit a{color:inherit}
#mscope.big .mwrap{width:min(1100px,100%)}
#mscope.big .side{display:none}
#mscope.big .mbody{justify-content:center}
#mscope.big .lens{width:min(calc(100vw - 90px),calc(100vh - 230px),900px);height:min(calc(100vw - 90px),calc(100vh - 230px),900px);min-width:200px;min-height:200px}
#mscope.big .eye{flex-direction:column}
#mscope.big .knobrow{flex-direction:row}
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
#mscope .slot.full{border:2px solid var(--ink);background:linear-gradient(135deg,#e8f6fa,#c8e2ec);cursor:pointer;box-shadow:0 2px 3px rgba(0,0,0,.25)}
#mscope .slot.full canvas{width:30px;height:30px;border-radius:50%;box-shadow:0 0 0 1.5px var(--ink)}
#mscope .slot.on{box-shadow:0 0 0 3px var(--gold),0 0 0 5px var(--ink)}
#mscope .slot.pop{animation:slotpop .6s cubic-bezier(.3,1.8,.5,1)}
#mscope .slot.jar{border:2px dashed var(--rust);background:rgba(181,85,47,.08)}
@keyframes slotpop{from{transform:scale(.3)}}
#mscope .next{font-family:var(--display);font-size:17px;color:var(--parch);background:var(--plum);border:2.5px solid var(--gold);border-radius:14px;padding:8px 14px;box-shadow:0 0 0 3px var(--ink);cursor:pointer}
#mscope .keyhint{margin-top:8px;color:#6d3b5e;font-size:12px;font-weight:800}
#mscope kbd{font:inherit;opacity:.75}
@media (max-height:520px) and (min-width:641px){#mscope .eye,#mscope.big .eye{display:grid;grid-template-columns:auto auto;align-items:center;justify-items:center;column-gap:4px}#mscope .lens{grid-row:span 2;width:calc(100vh - 190px);height:calc(100vh - 190px);min-width:150px;min-height:150px}
  #mscope .knobrow{flex-direction:column}#mscope .shots{max-width:170px}#mscope.big .lens{width:calc(100vh - 130px);height:calc(100vh - 130px)}#mscope.big .shots{max-width:260px}}
@media (max-width:640px){#mscope .mbody{flex-direction:column;align-items:center}#mscope .lens{width:220px;height:220px}#mscope .side{width:100%}}`;
document.head.appendChild(css);

const el = document.createElement('div'); el.id = 'mscope'; el.hidden = true; el.setAttribute('role', 'dialog'); el.setAttribute('aria-label', 'Microscope');
el.innerHTML = `<div class="mwrap"><header><h2>Microscope</h2><span class="count"></span><button class="pill" id="mClose">Close</button></header>
  <div class="mbody"><div class="eye"><div class="lens"><canvas></canvas></div><div class="knobrow"><button class="knob" aria-label="Turn the focus knob"></button><span class="khint"></span>
    <div class="zoom"><button class="zout" aria-label="Zoom out">−</button><button class="zin" aria-label="Zoom in">+</button><button class="zbig" aria-label="Big view">⤢</button></div></div>
    <div class="shots"><div class="pics"></div><div class="credit"></div></div></div>
  <div class="side"><div class="cap"></div><div class="tray"></div><div class="keyhint"></div></div></div></div>`;
document.body.appendChild(el);
const slide = el.querySelector('.lens canvas'), knob = el.querySelector('.knob'), khint = el.querySelector('.khint'), cap = el.querySelector('.cap'),
  tray = el.querySelector('.tray'), countEl = el.querySelector('.count'), hintEl = el.querySelector('.keyhint'),
  zoomEl = el.querySelector('.zoom'), zin = el.querySelector('.zin'), zout = el.querySelector('.zout'), zbig = el.querySelector('.zbig'),
  dots = el.querySelector('.pics'), credit = el.querySelector('.credit');
const lens = makeLens(el.querySelector('.lens'), (z, zMax) => { zout.disabled = z <= 1.001; zin.disabled = z >= zMax*.999; });

// the jar under the lens, and how far into focus it is
const S = {id:null, queue:[], focus:1, holding:false, turn:0, raf:0, last:0, popped:null, shots:[], shot:0};
const thumbs = new Map();
const thumb = id => { if (!thumbs.has(id)) thumbs.set(id, drawSlide(document.createElement('canvas'), id, 60)); return thumbs.get(id); };

function show(id){ S.id = id; drawSlide(slide, id, 360); setBlur(); lens.hide(); S.shots = []; shots(); if (S.focus >= 1) photos(id); }
// the real photos come in over the drawing, once the slide is in focus
function photos(id){
  photosOf(id).then(list => { if (S.id !== id || S.focus < 1 || !list.length) return; S.shots = list; S.shot = 0; shots(); });
}
function shots(){
  const p = S.shots[S.shot], s = SAMPLES.find(x => x.id === S.id);
  if (p) lens.show(p, s.name);
  zoomEl.hidden = !p; credit.innerHTML = p ? `Photo: <a href="${p.page}" target="_blank" rel="noopener">${esc(p.by)}</a>, ${esc(p.license)}` : '';
  dots.innerHTML = '';
  if (S.shots.length > 1) S.shots.forEach((_, i) => { const b = document.createElement('button'); b.setAttribute('aria-label', `Photo ${i + 1} of ${S.shots.length}`);
    if (i === S.shot) b.className = 'on'; b.addEventListener('click', () => pick(i)); dots.append(b); });
}
function pick(i){ if (!S.shots.length) return; S.shot = (i + S.shots.length)%S.shots.length; shots(); Sound.next(); }
const esc = t => t.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');
function big(on){ el.classList.toggle('big', on); zbig.textContent = on ? '⤡' : '⤢'; zbig.setAttribute('aria-label', on ? 'Small view' : 'Big view'); }
function setBlur(){ slide.style.filter = S.focus >= 1 ? '' : `blur(${(1 - S.focus)*16}px) saturate(${.5 + S.focus*.5})`; knob.style.transform = `rotate(${S.turn}deg)`; }

function render(){
  const have = new Set(slides().map(s => s.id)), jar = S.queue.length && S.focus < 1 ? S.id : null;
  countEl.textContent = `${have.size} of ${SAMPLES.length} samples`;
  const s = SAMPLES.find(x => x.id === S.id);
  if (jar) { cap.className = 'cap new'; cap.innerHTML = `<b>${S.queue.length === 1 ? 'A new sample!' : `${S.queue.length} new samples!`}</b><span>Turn the focus knob to see what's in the jar.</span>`; }
  else if (s) { cap.className = 'cap'; cap.innerHTML = `<b>${s.name}</b><span>${s.line}</span>`; }
  const knobOn = !!jar; knob.hidden = !knobOn; khint.textContent = knobOn ? 'Hold to focus' : '';
  tray.innerHTML = ''; const shown = SAMPLES.filter(x => have.has(x.id) || x.id === jar), groups = [...new Set(shown.map(x => x.from))];
  for (const g of groups) { const box = document.createElement('div'); box.className = 'group'; box.innerHTML = `<h3>${g}</h3><div class="slots"></div>`; tray.append(box);
    const row = box.querySelector('.slots');
    for (const x of shown.filter(y => y.from === g)) { const b = document.createElement('button'); b.className = 'slot';
      if (have.has(x.id)) { b.classList.add('full'); b.innerHTML = `<canvas width="60" height="60"></canvas>`; b.querySelector('canvas').getContext('2d').drawImage(thumb(x.id), 0, 0);
        b.setAttribute('aria-label', x.name); b.addEventListener('click', () => { if (jar || x.id === S.id) return; S.focus = 1; show(x.id); render(); Sound.next(); });
        if (x.id === S.id && !jar) b.classList.add('on'); if (x.id === S.popped) b.classList.add('pop'); }
      else { b.classList.add('jar'); b.disabled = true; b.setAttribute('aria-label', 'A new sample'); }
      row.append(b); } }
  S.popped = null;
  const more = !jar && S.queue.length > 1;
  hintEl.innerHTML = jar ? 'Hold <kbd>Space</kbd> to focus · <kbd>Esc</kbd> to close' : more ? '' : 'Drag to look around · <kbd>+</kbd> <kbd>−</kbd> to zoom · <kbd>Esc</kbd> to close';
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
  // a moment to see the slide come sharp before the photos take over
  const id = S.id; setTimeout(() => { if (S.id === id && !el.hidden) photos(id); }, 1400);
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
function close(){ if (el.hidden) return; el.hidden = true; big(false); S.holding = false; cancelAnimationFrame(S.raf); Sound.close(); }

const hold = on => e => { e.preventDefault(); S.holding = on && S.focus < 1; if (on) { S.turn += 6; setBlur(); } };
knob.addEventListener('pointerdown', e => { knob.setPointerCapture(e.pointerId); hold(true)(e); });
knob.addEventListener('pointerup', hold(false)); knob.addEventListener('pointercancel', hold(false));
el.querySelector('#mClose').addEventListener('click', close);
zin.addEventListener('click', () => lens.zoom(1.6)); zout.addEventListener('click', () => lens.zoom(1/1.6));
zbig.addEventListener('click', () => big(!el.classList.contains('big')));
el.addEventListener('click', e => { if (e.target === el) close(); });
addEventListener('keydown', e => {
  if (el.hidden) return;
  e.stopPropagation(); e.preventDefault();
  const go = e.key === ' ' || e.key === 'Enter' || e.key === 'e' || e.key === 'E';
  if (go && S.focus < 1) { S.holding = true; return; }
  if (e.repeat) return;
  if (e.key === 'Escape' && el.classList.contains('big')) big(false);
  else if (e.key === 'Escape' || e.key === 'z' || e.key === 'Z') close();
  else if (go) nextJar();
  else if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') pick(S.shot + (e.key === 'ArrowRight' ? 1 : -1));
  else if (e.key === '+' || e.key === '=') lens.zoom(1.6);
  else if (e.key === '-' || e.key === '_') lens.zoom(1/1.6);
  else if (e.key === 'b' || e.key === 'B') { if (lens.showing) big(!el.classList.contains('big')); }
}, true);
addEventListener('keyup', e => { if (!el.hidden && (e.key === ' ' || e.key === 'Enter' || e.key === 'e' || e.key === 'E')) S.holding = false; }, true);
