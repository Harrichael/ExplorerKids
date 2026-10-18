// Dr. Sparks' experiment desk. There's no separate screen: the explorer steps up to the real bench in
// the Science Corner, the camera leans in over it, and Dr. Sparks' experiment book opens. Picking an
// experiment sets its things out on the desk, and the explorer works through it with their own hands.
// Loaded the first time someone uses the desk.

import * as THREE from 'three';
import { Sound } from '../core/sound.js';
import { camera } from '../core/render.js';
import { LAB_DESK } from '../hq/cottage.js';
import { hqAnims, scene } from '../hq/scene.js';
import { coarse, setSound } from '../input.js';
import { blob, hero, player } from '../player.js';
import { load, save } from '../save.js';
import { game } from '../state.js';
import { convo, endConvo, story } from '../ui/dialogue.js';
import { clearDesk, desk, initDesk, isVessel, setupDesk, updateDesk } from './desk.js';
import { EXPERIMENTS, FREE } from './experiments.js';
import { handsOff, handsOn, setTipButton, setTipKey, updateHands } from './hands.js';

const FREE_AFTER = 3;

const css = document.createElement('style');
css.textContent = `
.labbing .hud .plate,.labbing .hud .keys,.labbing #stick,.labbing #talk,.labbing #use,.labbing #prompt{display:none!important}
#labHud{position:fixed;inset:0;pointer-events:none}
#labHud .lab-card{position:absolute;top:calc(12px + env(safe-area-inset-top,0px));left:max(16px,env(safe-area-inset-left,0px));max-width:min(340px,calc(100vw - 32px));background:rgba(26,19,32,.86);border:2px solid var(--gold);border-radius:14px;padding:8px 14px 10px;box-shadow:0 0 0 3px var(--ink),0 6px 18px rgba(0,0,0,.35)}
#labHud .sub{font-weight:900;font-size:11px;letter-spacing:1.4px;text-transform:uppercase;color:var(--gold)}
#labHud h3{margin:0 0 4px;font-family:var(--display);font-weight:400;font-size:clamp(18px,4.4vw,23px);line-height:1.1;color:var(--parch)}
#labHud ul{list-style:none;margin:0;padding:0;font-weight:800;font-size:14px;line-height:1.45}
#labHud li{display:flex;gap:7px;align-items:baseline}
#labHud li.done{opacity:.55;text-decoration:line-through;text-decoration-color:rgba(217,164,65,.6)}
#labHud li .mk{flex:none;width:14px;color:var(--gold)}
#labHud li .ct{color:var(--gold);font-variant-numeric:tabular-nums;white-space:nowrap}
#labHud .btns{position:absolute;top:calc(56px + env(safe-area-inset-top,0px));right:max(16px,env(safe-area-inset-right,0px));display:flex;flex-direction:column;align-items:flex-end;gap:8px}
.lab-pill{pointer-events:auto;font-family:var(--body);font-weight:900;font-size:13px;color:var(--parch);background:rgba(26,19,32,.82);border:2px solid var(--gold);border-radius:999px;padding:5px 12px;box-shadow:0 0 0 3px var(--ink);cursor:pointer}
.lab-pill.go{background:var(--teal);font-size:14px;padding:7px 14px}
.lab-pill:focus-visible,.lb-card:focus-visible,#labTip:focus-visible{outline:3px solid var(--parch);outline-offset:3px}
#labHud .after{display:flex;flex-wrap:wrap;gap:8px;margin-top:8px}
#labTip{pointer-events:auto;position:absolute;right:calc(max(16px,env(safe-area-inset-right,0px)) + 6px);bottom:calc(30px + env(safe-area-inset-bottom,0px));width:96px;height:96px;border-radius:50%;background:var(--plum);border:3px solid var(--gold);box-shadow:0 0 0 3px var(--ink),0 0 22px rgba(217,164,65,.45);font-family:var(--display);font-size:20px;line-height:1;color:var(--parch);cursor:pointer;touch-action:none;animation:popin .2s ease-out}
#labTip small{display:block;font-family:var(--body);font-weight:900;font-size:11px;letter-spacing:1px;color:var(--gold);margin-top:4px}
#labTip.on{background:var(--rust);transform:scale(.94)}
.talking #labTip{bottom:calc(190px + env(safe-area-inset-bottom,0px))}
#labHint{position:absolute;left:50%;bottom:calc(22px + env(safe-area-inset-bottom,0px));transform:translateX(-50%);background:rgba(26,19,32,.86);border:2px solid var(--gold);border-radius:14px;padding:5px 14px;font-weight:900;font-size:14px;color:var(--parch);box-shadow:0 0 0 3px var(--ink);white-space:nowrap;max-width:calc(100vw - 32px);overflow:hidden;text-overflow:ellipsis}
#labHint b{color:var(--gold)}
.talking #labHint{display:none}
#labToast{position:absolute;left:50%;top:26%;transform:translate(-50%,-50%);text-align:center;font-family:var(--display);color:var(--parch);text-shadow:0 3px 0 var(--ink),0 0 24px rgba(217,164,65,.55);font-size:clamp(28px,7vw,48px);line-height:1.1;width:90%;animation:toast 3.6s ease-out forwards}
#labToast small{display:block;font-family:var(--body);font-weight:900;font-size:17px;color:var(--gold);margin-top:8px;text-shadow:0 2px 0 var(--ink)}
@keyframes toast{0%{opacity:0;transform:translate(-50%,-40%) scale(.8)}10%{opacity:1;transform:translate(-50%,-50%) scale(1.05)}18%{transform:translate(-50%,-50%) scale(1)}80%{opacity:1}100%{opacity:0}}
#labBook{position:fixed;inset:0;display:flex;align-items:center;justify-content:center;padding:calc(16px + env(safe-area-inset-top,0px)) max(16px,env(safe-area-inset-right,0px)) calc(16px + env(safe-area-inset-bottom,0px)) max(16px,env(safe-area-inset-left,0px));background:radial-gradient(ellipse at center,rgba(26,19,32,.35),rgba(20,12,28,.7))}
#labBook .page{width:min(760px,100%);max-height:100%;overflow:auto;background:linear-gradient(180deg,#f3e6c8,#e6d3ac);color:var(--ink);border:3px solid var(--gold);border-radius:20px;box-shadow:0 0 0 4px var(--ink),0 18px 40px rgba(0,0,0,.5);padding:18px 20px 16px;animation:popin .25s ease-out}
#labBook header{display:flex;align-items:flex-end;justify-content:space-between;gap:12px;margin-bottom:12px}
#labBook .sub{font-weight:900;font-size:12px;letter-spacing:1.4px;text-transform:uppercase;color:var(--rust)}
#labBook h2{margin:0;font-family:var(--display);font-weight:400;font-size:clamp(24px,6vw,34px);line-height:1.05;color:var(--plum)}
#labBook .grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(205px,1fr));gap:10px}
.lb-card{position:relative;text-align:left;font-family:var(--body);color:var(--ink);background:#fbf4e2;border:2.5px solid var(--ink);border-radius:14px;padding:10px 12px 10px 50px;cursor:pointer;min-height:76px;box-shadow:0 3px 0 var(--ink)}
.lb-card:hover{transform:translateY(-1px)}
.lb-card .num{position:absolute;left:10px;top:10px;width:30px;height:30px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-family:var(--display);font-size:16px;background:var(--plum);color:var(--parch);border:2px solid var(--ink)}
.lb-card b{display:block;font-family:var(--display);font-weight:400;font-size:18px;line-height:1.1}
.lb-card .bl{display:block;font-weight:800;font-size:13px;color:#5a4a4a;margin-top:2px}
.lb-card .st{display:inline-block;margin-top:5px;font-weight:900;font-size:11px;letter-spacing:1px;text-transform:uppercase;padding:2px 8px;border-radius:999px;background:rgba(26,19,32,.08)}
.lb-card.done .num{background:var(--teal)}
.lb-card.done .st{background:#cfe8d4;color:#22543a}
.lb-card.new{background:#fff7d8;border-color:var(--rust);box-shadow:0 3px 0 var(--rust),0 0 0 3px rgba(217,164,65,.5)}
.lb-card.new .st{background:var(--rust);color:var(--parch)}
.lb-card.free{grid-column:1/-1;padding-left:56px;background:linear-gradient(90deg,#d8efe6,#fbf4e2)}
.lb-card.free .num{width:36px;height:36px;font-size:18px;background:var(--rust)}
#labBook footer{display:flex;justify-content:flex-end;margin-top:12px}
#labBook footer .lab-pill{background:var(--plum)}`;
document.head.appendChild(css);

const hud = document.createElement('div'); hud.id = 'labHud'; hud.hidden = true;
hud.innerHTML = `<div class="lab-card"><div class="sub" id="lhSub"></div><h3 id="lhTitle"></h3><ul id="lhSteps"></ul><div class="after" id="lhAfter" hidden></div></div>
  <div class="btns"><button class="lab-pill" id="lhBook">Experiment book</button><button class="lab-pill" id="lhReset">Start over</button><button class="lab-pill" id="lhLeave">Step away</button></div>
  <button id="labTip" hidden aria-label="Hold to tip">Tip<small>HOLD</small></button><div id="labHint" hidden></div>`;
const book = document.createElement('div'); book.id = 'labBook'; book.hidden = true; book.setAttribute('role', 'dialog'); book.setAttribute('aria-labelledby', 'lbTitle');
book.innerHTML = `<div class="page"><header><div><div class="sub">Dr. Vega Sparks' lab</div><h2 id="lbTitle">Experiment Book</h2></div></header>
  <div class="grid" id="lbGrid"></div><footer><button class="lab-pill" id="lbLeave">Step away</button></footer></div>`;
document.body.append(hud, book);
const $ = id => document.getElementById(id);
const tipBtn = $('labTip'), hint = $('labHint');

const root = new THREE.Group(); root.position.set(LAB_DESK.x, LAB_DESK.y, LAB_DESK.z); scene.add(root);
initDesk(root);

const progress = () => new Set((load('lab') || {}).done || []);
const unlocked = (i, done) => i === 0 || done.has(EXPERIMENTS[i - 1].id) || done.has(EXPERIMENTS[i].id);

// ---------- stepping up to the desk and back ----------
const FRONT = {x:LAB_DESK.x, z:LAB_DESK.z + 1.1};
const headAt = new THREE.Vector3();
// lean in over the desk, far enough back that it fits the screen, whatever its shape
function deskCam(pos, look){
  const tanV = Math.tan(camera.fov*Math.PI/360), D = Math.max(.98/(tanV*camera.aspect), .64/tanV), el = 1.0;
  look.set(LAB_DESK.x, LAB_DESK.y - .02, LAB_DESK.z + .1);
  pos.set(look.x, look.y + D*Math.sin(el), look.z + D*Math.cos(el));
}
let lab = null;
export function openLab(){
  if (lab || game.activity) return;
  lab = {phase:'walk', t:0, walk:0}; game.cutscene = true;
}
function turnTo(a, k){ let d = a - player.angle; d = Math.atan2(Math.sin(d), Math.cos(d)); player.angle += d*Math.min(1, k); return Math.abs(d); }
function pose(sw){ hero.root.position.set(player.x, player.y, player.z); hero.root.rotation.y = player.angle; hero.legL.rotation.x = sw; hero.legR.rotation.x = -sw; hero.armL.rotation.x = -sw*.9; hero.armR.rotation.x = sw*.9; }
function step(dt){
  const L = lab; L.t += dt;
  if (L.phase === 'walk') {
    const dx = FRONT.x - player.x, dz = FRONT.z - player.z, d = Math.hypot(dx, dz);
    if (d < .04) { L.phase = 'turn'; L.t = 0; }
    else { const st = Math.min(d, 3.2*dt); player.x += dx/d*st; player.z += dz/d*st; turnTo(Math.atan2(dx, dz), dt*12); L.walk += dt*9.5;
      const sg = Math.sign(Math.sin(L.walk)); if (sg !== player.lastStepSign && sg !== 0) { player.lastStepSign = sg; Sound.step('wood'); } }
    pose(Math.sin(L.walk)*.7);
  } else if (L.phase === 'turn') {
    pose(0);
    if (turnTo(Math.PI, dt*9) < .05) { L.phase = 'lean'; L.t = 0; game.cutCam = deskCam; document.documentElement.classList.add('labbing'); }
  } else if (L.phase === 'lean') {
    pose(0);
    // the explorer's head would fill the view from here; their glove stands in for them at the desk
    hero.head.getWorldPosition(headAt);
    if (camera.position.distanceTo(headAt) < 1.1 || L.t > .7) { hero.root.visible = false; blob.visible = false; }
    if (L.t > .9) openBook();
  } else if (L.phase === 'run') runStep(dt);
  if (L.phase === 'run' || L.phase === 'book') { updateDesk(dt, game.elapsed); updateHands(dt, game.elapsed); }
}
function leave(){
  if (!lab) return;
  if (convo) endConvo(true);
  clearDesk(); handsOff(); setTipKey(false); setTipButton(false);
  hud.hidden = book.hidden = true; document.documentElement.classList.remove('labbing');
  hero.root.visible = true; blob.visible = true; game.cutCam = null; game.cutscene = false; lab = null;
  Sound.close();
}
hqAnims.push(dt => { if (lab) step(dt); });

// ---------- the experiment book ----------
function openBook(){
  if (convo) endConvo(false);
  lab.phase = 'book'; lab.run = null; clearDesk(); handsOff(); hud.hidden = true;
  const done = progress(), grid = $('lbGrid'); grid.innerHTML = '';
  // locked experiments stay out of the book entirely, so each unlock reveals something new
  let firstNew = null;
  EXPERIMENTS.forEach((e, i) => {
    if (!unlocked(i, done)) return;
    const fin = done.has(e.id), b = document.createElement('button');
    b.className = 'lb-card ' + (fin ? 'done' : 'new');
    b.innerHTML = `<span class="num">${i + 1}</span><b>${e.title}</b><span class="bl">${e.blurb}</span>
      <span class="st">${fin ? '✓ Done' : 'New!'} · Grade ${e.grade}</span>`;
    b.addEventListener('click', () => startRun(e));
    if (!fin && !firstNew) firstNew = b;
    grid.appendChild(b);
  });
  if (done.size >= FREE_AFTER) {
    const free = document.createElement('button');
    free.className = 'lb-card free new';
    free.innerHTML = `<span class="num">★</span><b>Free Lab</b><span class="bl">Every supply on the desk. Mix anything with anything!</span><span class="st">Open</span>`;
    free.addEventListener('click', () => startRun(FREE));
    grid.appendChild(free);
  }
  book.hidden = false; (firstNew || grid.lastElementChild).focus({preventScroll:true});
  Sound.open();
}

// ---------- running an experiment ----------
function startRun(exp, quiet){
  if (convo) endConvo(false);
  book.hidden = true; hud.hidden = false;
  setupDesk(exp.setup, {endless: !!exp.free}); handsOn(root);
  desk.on = ev => { const r = lab && lab.run; if (r && r.exp.react) sayOnce(r.exp.react(ev)); };
  lab.phase = 'run'; lab.run = {exp, step:0, said:new Set(), complete:false, shown:''};
  exp.setup.forEach((s, i) => Sound.tone(523*Math.pow(2, (i % 6)/12*2), {type:'triangle', t:i*.05 + .05, dur:.12, vol:.045}));
  if (!quiet) story([...exp.intro, ...(exp.steps[0] && exp.steps[0].say || [])]);
  $('lhReset').textContent = exp.free ? 'Clean up' : 'Start over';
  const n = EXPERIMENTS.indexOf(exp);
  $('lhSub').textContent = exp.free ? 'Free Lab · anything goes' : `Experiment ${n + 1} · Grade ${exp.grade}`;
  $('lhTitle').textContent = exp.title; $('lhAfter').hidden = true;
  lab.hintAt = lab.hintAt || 0; lab.tipped = lab.tipped || false;
  drawSteps(true);
}
function sayOnce(r){
  const run = lab && lab.run; if (!r || !run || run.said.has(r[0])) return;
  run.said.add(r[0]); story(r[1]);
}
function drawSteps(force){
  const r = lab.run, steps = r.exp.steps;
  let html = '';
  if (r.exp.free) html = '<li><span class="mk">★</span><span>Mix, pour, stir and test anything you like.</span></li>';
  steps.forEach((s, i) => {
    if (i > r.step) return;
    const c = i === r.step && !r.complete && s.count ? s.count() : null;
    html += i < r.step || r.complete ? `<li class="done"><span class="mk">✓</span><span>${s.do}</span></li>`
      : `<li><span class="mk">▸</span><span>${s.do}${c ? ` <span class="ct">${c[0]}/${c[1]}</span>` : ''}</span></li>`;
  });
  if (force || html !== r.shown) { $('lhSteps').innerHTML = html; r.shown = html; }
}
function runStep(dt){
  const r = lab.run, steps = r.exp.steps;
  // a later step already done means the earlier ones were too, whatever order they happened in;
  // vinegar that has fizzed away no longer counts as vinegar
  if (!r.complete) for (let j = steps.length - 1; j >= r.step; j--) if (steps[j].done()) { advance(j); break; }
  if (r.exp.tick) sayOnce(r.exp.tick());
  drawSteps();
  const h = desk.held, canTip = h && isVessel(h) && h.state === 'held';
  tipBtn.hidden = !canTip && !tipBtn.classList.contains('on');
  if (canTip && desk.tip) lab.tipped = true;
  lab.hintAt += dt;
  hint.hidden = lab.tipped || lab.hintAt > 40;
  if (!hint.hidden) hint.innerHTML = coarse ? 'Drag things to carry them · hold <b>Tip</b> to pour' : 'Drag things to carry them · hold <b>Space</b> or <b>right-click</b> to tip';
}
function advance(to){
  const r = lab.run, steps = r.exp.steps, lines = [];
  for (; r.step <= to; r.step++) lines.push(...(steps[r.step].after || []));
  [784, 988, 1319].forEach((f, i) => Sound.tone(f, {type:'triangle', t:i*.09, dur:.25, vol:.07}));
  if (r.step < steps.length) lines.push(...(steps[r.step].say || []));
  else lines.push(...finish());
  story(lines); drawSteps(true);
}
function finish(){
  const r = lab.run, exp = r.exp, before = progress(), done = new Set(before);
  r.complete = true; done.add(exp.id); save('lab', {done:[...done]});
  [523, 659, 784, 1046, 1319].forEach((f, i) => Sound.tone(f, {type:'triangle', t:i*.1, dur:.35, vol:.08}));
  const i = EXPERIMENTS.indexOf(exp), next = EXPERIMENTS[i + 1], extra = [];
  const opened = next && !before.has(exp.id) ? next : null, freeNow = before.size < FREE_AFTER && done.size >= FREE_AFTER;
  toast('Experiment complete!', opened ? `New experiment unlocked: ${opened.title}` : freeNow ? 'The Free Lab is open!' : exp.title);
  if (opened) extra.push(['sparks', `You've unlocked a new experiment in my book: ${opened.title}!`]);
  if (freeNow) extra.push(['sparks', "And that's three experiments! You've earned the Free Lab, where every supply is yours to mix however you like."]);
  const after = $('lhAfter'); after.innerHTML = ''; after.hidden = false;
  const target = next && unlocked(i + 1, done) ? next : null;
  if (target) { const b = pill(`Next: ${target.title} →`, () => startRun(target)); b.classList.add('go'); after.appendChild(b); }
  after.appendChild(pill('Experiment book', openBook));
  return [...exp.outro, ...extra];
}
function pill(text, fn){ const b = document.createElement('button'); b.className = 'lab-pill'; b.textContent = text; b.addEventListener('click', fn); return b; }
function toast(big, small){
  const t = document.createElement('div'); t.id = 'labToast'; t.innerHTML = `${big}<small>${small}</small>`;
  const old = $('labToast'); if (old) old.remove(); hud.appendChild(t); setTimeout(() => t.remove(), 3700);
}

$('lhBook').addEventListener('click', () => lab && openBook());
$('lhReset').addEventListener('click', () => { if (lab && lab.run) { const exp = lab.run.exp; startRun(exp, true); Sound.hiss({dur:.3, vol:.06, type:'bandpass', freq:2000}); } });
$('lhLeave').addEventListener('click', leave);
$('lbLeave').addEventListener('click', leave);
const tipOn = e => { e.preventDefault(); tipBtn.setPointerCapture(e.pointerId); tipBtn.classList.add('on'); setTipButton(true); };
const tipOff = () => { tipBtn.classList.remove('on'); setTipButton(false); };
tipBtn.addEventListener('pointerdown', tipOn); tipBtn.addEventListener('pointerup', tipOff); tipBtn.addEventListener('pointercancel', tipOff);
tipBtn.addEventListener('contextmenu', e => e.preventDefault());

// Space tips while the explorer isn't reading; Esc backs out one level: experiment, book, desk
addEventListener('keydown', e => {
  if (!lab || lab.phase === 'walk' || lab.phase === 'turn') return;
  if (e.key === ' ' && !convo && lab.phase === 'run') { e.preventDefault(); e.stopPropagation(); if (!e.repeat) setTipKey(true); return; }
  if ((e.key === 'm' || e.key === 'M') && !e.repeat && !convo) { setSound(!Sound.isOn()); return; }
  if (e.key === 'Escape' && !convo) { e.stopPropagation(); if (lab.phase === 'run') openBook(); else if (lab.phase === 'book') leave(); }
}, true);
addEventListener('keyup', e => { if (e.key === ' ') setTipKey(false); });
addEventListener('blur', () => setTipKey(false));
