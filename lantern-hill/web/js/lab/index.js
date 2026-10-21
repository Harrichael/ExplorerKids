// Dr. Sparks' experiment desk. There's no separate screen: the explorer steps up to the real bench in
// the Science Corner, the camera leans in over it, and Dr. Sparks' experiment book opens. Each
// experiment asks a question, takes the explorer's prediction, lets them test it however they like
// with everything on the desk, and then compares. Finished experiments open new ones in the book and
// stock the cabinet the Free Lab is played from. Loaded the first time someone uses the desk.

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
import { closeCabinet, initCabinet, reach, stockCabinet, updateCabinet } from './cabinet.js';
import { clearDesk, desk, initDesk, isVessel, restingIn, setupDesk, totalGas, updateDesk } from './desk.js';
import { EXPERIMENTS, FREE, opened, stocked } from './experiments.js';
import { handsOff, handsOn, setTipButton, setTipKey, updateHands } from './hands.js';
import { ready } from './physics.js';
import { labSound } from './sounds.js';
import { ITEMS } from './stuff.js';

const FREE_AFTER = 1, HINT_AFTER = 35;

const css = document.createElement('style');
css.textContent = `
.labbing .hud .plate,.labbing .hud .keys,.labbing #stick,.labbing #talk,.labbing .use,.labbing #prompt{display:none!important}
.labbing .hud{justify-content:flex-end}
#labHud{position:fixed;inset:0;pointer-events:none}
#labHud .lab-card{position:absolute;top:calc(12px + env(safe-area-inset-top,0px));left:max(16px,env(safe-area-inset-left,0px));max-width:min(360px,calc(100vw - 214px));background:rgba(26,19,32,.88);border:2px solid var(--gold);border-radius:14px;padding:8px 14px 10px;box-shadow:0 0 0 3px var(--ink),0 6px 18px rgba(0,0,0,.35)}
#labHud .sub{font-weight:900;font-size:11px;letter-spacing:1.4px;text-transform:uppercase;color:var(--gold)}
#labHud h3{margin:0 0 4px;font-family:var(--display);font-weight:400;font-size:clamp(18px,4.4vw,23px);line-height:1.1;color:var(--parch)}
#labHud .q{font-weight:900;font-size:15px;line-height:1.35;color:var(--parch)}
#labHud .q b{color:var(--gold)}
#labHud .status{margin-top:6px;font-weight:800;font-size:14px;line-height:1.4;color:#d8cbb0}
#labHud .status .guess{display:inline-block;background:rgba(217,164,65,.18);border:1.5px solid var(--gold);border-radius:999px;padding:1px 9px;color:var(--parch);font-weight:900}
#labHud .status .ok{color:#8fe0a0;font-weight:900}
#labHud .status .wow{color:#ffb38a;font-weight:900}
#labHud .btns{position:absolute;top:calc(56px + env(safe-area-inset-top,0px));right:max(16px,env(safe-area-inset-right,0px));display:flex;flex-direction:column;align-items:flex-end;gap:8px}
.lab-pill{pointer-events:auto;font-family:var(--body);font-weight:900;font-size:13px;color:var(--parch);background:rgba(26,19,32,.82);border:2px solid var(--gold);border-radius:999px;padding:5px 12px;box-shadow:0 0 0 3px var(--ink);cursor:pointer}
.lab-pill.go{background:var(--teal);font-size:14px;padding:7px 14px}
.lab-pill:disabled{opacity:.45;cursor:default}
.lab-pill:focus-visible,.lb-card:focus-visible,#labTip:focus-visible,.lc-card:focus-visible{outline:3px solid var(--parch);outline-offset:3px}
#labHud .after{display:flex;flex-wrap:wrap;gap:8px;margin-top:8px}
#lhChoose{position:absolute;display:flex;gap:10px;pointer-events:auto;flex-wrap:wrap;justify-content:center;align-content:flex-start}
#lhChoose.tight{gap:6px}
#lhChoose.tight .lc-card{padding:5px 9px 5px;min-width:92px;max-width:140px}
#lhChoose.tight .lc-card .ic{font-size:22px}
#lhChoose.tight .lc-card .sw{width:24px;height:24px}
#lhChoose.tight .lc-card b{font-size:12px;margin-top:1px}
#lhChoose.wait{visibility:hidden}
.lc-card{font-family:var(--body);background:#fbf4e2;color:var(--ink);border:3px solid var(--ink);border-radius:16px;padding:10px 14px 9px;min-width:118px;max-width:170px;box-shadow:0 4px 0 var(--ink),0 0 0 3px rgba(217,164,65,.6);cursor:pointer;text-align:center;animation:popin .25s ease-out}
.lc-card:hover{transform:translateY(-2px)}
.lc-card .ic{display:block;font-size:34px;line-height:1.1}
.lc-card .sw{display:block;width:38px;height:38px;border-radius:50%;margin:0 auto 2px;border:3px solid var(--ink)}
.lc-card b{display:block;font-weight:900;font-size:14px;line-height:1.2;margin-top:3px}
#lhLock{position:absolute;left:50%;bottom:calc(30px + env(safe-area-inset-bottom,0px));transform:translateX(-50%);animation:popin .25s ease-out}
.talking #lhLock{bottom:calc(190px + env(safe-area-inset-bottom,0px))}
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
#labBook .page{width:min(940px,100%);max-height:100%;overflow:auto;background:linear-gradient(180deg,#f3e6c8,#e6d3ac);color:var(--ink);border:3px solid var(--gold);border-radius:20px;box-shadow:0 0 0 4px var(--ink),0 18px 40px rgba(0,0,0,.5);padding:18px 20px 16px;animation:popin .25s ease-out}
#labBook header{display:flex;align-items:flex-end;justify-content:space-between;gap:12px;margin-bottom:12px}
#labBook .sub{font-weight:900;font-size:12px;letter-spacing:1.4px;text-transform:uppercase;color:var(--rust)}
#labBook h2{margin:0;font-family:var(--display);font-weight:400;font-size:clamp(24px,6vw,34px);line-height:1.05;color:var(--plum)}
#labBook .grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(186px,1fr));gap:16px 10px;padding:10px 2px 6px}
#lbFree{margin-top:12px}
.lb-card{position:relative;text-align:left;font-family:var(--body);color:var(--ink);background:#fbf4e2;border:2.5px solid var(--ink);border-radius:14px;padding:7px 10px 7px 42px;cursor:pointer;box-shadow:0 3px 0 var(--ink)}
.lb-card:hover{transform:translateY(-1px)}
.lb-card .num{position:absolute;left:8px;top:8px;width:26px;height:26px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-family:var(--display);font-size:16px;background:var(--plum);color:var(--parch);border:2px solid var(--ink)}
.lb-card b{display:block;font-family:var(--display);font-weight:400;font-size:17px;line-height:1.1}
.lb-card .bl{display:block;font-weight:800;font-size:12px;line-height:1.25;color:#5a4a4a;margin-top:2px}
.lb-card .st{display:inline-block;margin:4px 6px 0 0;font-weight:900;font-size:11px;letter-spacing:1px;text-transform:uppercase;padding:2px 8px;border-radius:999px;background:rgba(26,19,32,.08)}
.lv{display:inline-block;letter-spacing:2px;line-height:1}
.lb-card .lv{margin-top:4px;font-size:13px;color:var(--rust)}
#labHud .sub .lv{font-size:12px;letter-spacing:2px}
.trip{display:inline-block;font-weight:900;text-transform:uppercase;white-space:nowrap;border-radius:999px;background:#2b6f8a;color:#f3f8fa}
.lb-card .trip{position:absolute;top:-10px;right:8px;font-size:10px;letter-spacing:.6px;padding:2px 8px;border:2px solid var(--ink)}
#labHud .sub .trip{margin-left:6px;font-size:10px;letter-spacing:.6px;padding:0 6px;vertical-align:1px}
.lb-card .nb{display:block;margin-top:4px;font-weight:800;font-size:12px;color:#5a4a4a}
.lb-card.done .num{background:var(--teal)}
.lb-card.done .st{background:#cfe8d4;color:#22543a}
.lb-card.new{background:#fff7d8;border-color:var(--rust);box-shadow:0 3px 0 var(--rust),0 0 0 3px rgba(217,164,65,.5)}
.lb-card.new .st{background:var(--rust);color:var(--parch)}
.lb-card.free{width:100%;padding-left:56px;background:linear-gradient(90deg,#d8efe6,#fbf4e2)}
.lb-card.free .num{width:36px;height:36px;font-size:18px;background:var(--rust)}
#labBook footer{display:flex;justify-content:flex-end;margin-top:12px}
#labBook footer .lab-pill{background:var(--plum)}`;
document.head.appendChild(css);

const hud = document.createElement('div'); hud.id = 'labHud'; hud.hidden = true;
hud.innerHTML = `<div class="lab-card" id="lhCard"><div class="sub" id="lhSub"></div><h3 id="lhTitle"></h3><div class="q" id="lhQ"></div><div class="status" id="lhStatus"></div><div class="after" id="lhAfter" hidden></div></div>
  <div class="btns"><button class="lab-pill" id="lhHint">Need a hint?</button><button class="lab-pill" id="lhBook">Experiment book</button><button class="lab-pill" id="lhReset">Start over</button><button class="lab-pill" id="lhLeave">Step away</button></div>
  <div id="lhChoose" hidden></div><button class="lab-pill go" id="lhLock" hidden>These are my guesses →</button>
  <button id="labTip" hidden aria-label="Hold to tip">Tip<small>${coarse ? 'HOLD' : 'HOLD Q'}</small></button><div id="labHint" hidden></div>`;
const book = document.createElement('div'); book.id = 'labBook'; book.hidden = true; book.setAttribute('role', 'dialog'); book.setAttribute('aria-labelledby', 'lbTitle');
book.innerHTML = `<div class="page"><header><div><div class="sub">Dr. Vega Sparks' lab</div><h2 id="lbTitle">Experiment Book</h2></div></header>
  <div class="grid" id="lbGrid"></div><div id="lbFree"></div><footer><button class="lab-pill" id="lbLeave">Step away</button></footer></div>`;
document.body.append(hud, book);
const $ = id => document.getElementById(id);
const tipBtn = $('labTip'), hint = $('labHint'), chooseEl = $('lhChoose'), lockBtn = $('lhLock'), hintBtn = $('lhHint');

const root = new THREE.Group(); root.position.set(LAB_DESK.x, LAB_DESK.y, LAB_DESK.z); scene.add(root);
initDesk(root); initCabinet(root);

const record = () => load('lab') || {};
const progress = () => new Set(record().done || []);

// ---------- stepping up to the desk and back ----------
const FRONT = {x:LAB_DESK.x, z:LAB_DESK.z + 1.1};
const headAt = new THREE.Vector3();
// lean in over the desk, far enough back that it fits the screen, whatever its shape; in the Free Lab,
// far enough to take in the cabinet too
const VIEW = {desk:{w:.98, h:.64, y:-.02, z:.1, el:1.0}, free:{w:.98, h:.72, y:.1, z:-.12, el:.72}};
function deskCam(pos, look){
  const v = lab && lab.run && lab.run.exp.free ? VIEW.free : VIEW.desk;
  // on a wide, short screen the experiment card would sit over the desk's far edge, where the things wait,
  // so the desk fits in below the card instead
  const top = camera.aspect > 1 && !hud.hidden ? Math.min(.4, $('lhCard').getBoundingClientRect().bottom/innerHeight) : 0;
  const tanV = Math.tan(camera.fov*Math.PI/360), D = Math.max(v.w/(tanV*camera.aspect), v.h/(tanV*(1 - top))), up = top*D*tanV;
  look.set(LAB_DESK.x, LAB_DESK.y + v.y + up*Math.cos(v.el), LAB_DESK.z + v.z - up*Math.sin(v.el));
  pos.set(look.x, look.y + D*Math.sin(v.el), look.z + D*Math.cos(v.el));
}
let lab = null;
export function openLab(){
  if (lab || game.activity || game.cutscene) return;
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
  } else if (L.phase === 'run') { runStep(dt); updateDesk(dt); updateHands(dt, game.elapsed); }
  updateCabinet(dt);
}
function leave(){
  if (!lab) return;
  if (convo) endConvo(true);
  clearDesk(); handsOff(); closeCabinet(); tipping.length = 0; setTipKey(0); setTipButton(false);
  hud.hidden = book.hidden = true; document.documentElement.classList.remove('labbing');
  hero.root.visible = true; blob.visible = true; game.cutCam = null; game.cutscene = false; lab = null;
  Sound.close();
}
hqAnims.push(dt => { if (lab) step(dt); });

// ---------- the experiment book ----------
// Every experiment opened so far, easiest first. "New!" marks what the last one finished opened up.
const dots = n => `<span class="lv" role="img" aria-label="Difficulty ${n} of 5">${'●'.repeat(n)}${'○'.repeat(5 - n)}</span>`;
// where an experiment found outside the lab came from, always shown, beside Done or New
const trip = (f, short) => f ? `<span class="trip" role="img" aria-label="Found on the ${f.name} field trip">${f.icon} ${short ? f.short : f.name} trip</span>` : '';
function openBook(){
  if (convo) endConvo(false);
  lab.phase = 'book'; lab.run = null; clearDesk(); handsOff(); closeCabinet(); hud.hidden = true;
  const rec = record(), done = progress(), notes = rec.notes || {}, grid = $('lbGrid');
  // before anything is done, the first experiment is the new one
  const fresh = new Set(done.size ? rec.fresh || [] : EXPERIMENTS.filter(e => opened(e, done)).map(e => e.id));
  stockCabinet(stocked(done));
  grid.innerHTML = '';
  let firstNew = null;
  for (const e of EXPERIMENTS.filter(e => opened(e, done)).sort((a, b) => a.level - b.level)) {
    const fin = done.has(e.id), isNew = !fin && fresh.has(e.id), n = notes[e.id], b = document.createElement('button');
    b.className = 'lb-card' + (fin ? ' done' : isNew ? ' new' : ''); b.dataset.id = e.id;
    b.innerHTML = `${trip(e.from)}<span class="num">${fin ? '✓' : '?'}</span><b>${e.title}</b><span class="bl">${e.blurb}</span>
      ${fin || isNew ? `<span class="st">${fin ? 'Done' : 'New!'}</span>` : ''}${dots(e.level)}${n ? `<span class="nb">Predictions right: ${n.right} of ${n.total}</span>` : ''}`;
    b.addEventListener('click', () => startRun(e));
    if (isNew && !firstNew) firstNew = b;
    grid.appendChild(b);
  }
  const foot = $('lbFree'); foot.innerHTML = '';
  if (done.size >= FREE_AFTER) {
    const free = document.createElement('button'), n = stocked(done).size;
    free.className = 'lb-card free new';
    free.innerHTML = `<span class="num">★</span><b>Free Lab</b><span class="bl">${n} supplies in your cabinet. Mix anything with anything!</span><span class="st">Open</span>`;
    free.addEventListener('click', () => startRun(FREE));
    foot.appendChild(free);
  }
  book.hidden = false;
  (firstNew || grid.querySelector('.lb-card:not(.done)') || foot.lastElementChild || grid.querySelector('.lb-card')).focus({preventScroll:true});
  labSound.book();
}

// ---------- running an experiment: question, prediction, test, result ----------
async function startRun(exp, quiet){
  if (convo) endConvo(false);
  // the physics engine downloads the first time; until it's here the book stays up, and if it never comes, step away
  try { await ready; } catch (e) { leave(); return; }
  if (!lab) return;
  book.hidden = true;
  hud.hidden = false; chooseEl.hidden = lockBtn.hidden = true;
  setupDesk(exp.setup, {endless: !!exp.free}); closeCabinet(); handsOn(root, exp.free ? reach : null);
  lab.phase = 'run'; lab.run = {exp, r:-1, notes:[]};
  labSound.setup(exp.setup.length);
  $('lhReset').textContent = exp.free ? 'Clean up' : 'Start over';
  $('lhSub').innerHTML = exp.free ? 'Free Lab' : `Experiment · ${dots(exp.level)}${trip(exp.from, true)}`;
  $('lhTitle').textContent = exp.title; $('lhAfter').hidden = true;
  lab.hintAt = lab.hintAt || 0;
  // the Free Lab has no question to pin up, and the cabinet needs the room
  $('lhCard').hidden = !!exp.free;
  if (exp.free) {
    hintBtn.hidden = true;
    if (!quiet) story(exp.intro);
    return;
  }
  nextRound(quiet);
}
function nextRound(quiet){
  const run = lab.run, exp = run.exp;
  run.r++;
  if (run.r >= exp.rounds.length) { finish(); return; }
  const rd = exp.rounds[run.r];
  Object.assign(run, {rd, guess:null, result:{}, hintI:0, idle:0, placed:0});
  if (rd.prep && !rd.prep.done()) { run.phase = 'prep'; if (!quiet) story(rd.prep.say); }
  else ask(quiet);
  drawHud();
}
function ask(quiet){
  const run = lab.run, rd = run.rd;
  run.phase = 'predict';
  if (!quiet) story(rd.ask);
  if (rd.choose) {
    chooseEl.innerHTML = '';
    for (const o of rd.choose) {
      const b = document.createElement('button'); b.className = 'lc-card';
      b.innerHTML = (o.swatch ? `<span class="sw" style="background:${o.swatch}"></span>` : `<span class="ic">${o.icon}</span>`) + `<b>${o.label}</b>`;
      b.addEventListener('click', () => predict(o.id));
      chooseEl.appendChild(b);
    }
    chooseEl.hidden = false;
  }
  drawHud();
}
function predict(guess){
  const run = lab.run;
  run.guess = guess; run.phase = 'test'; run.base = run.rd.baseline ? run.rd.baseline() : null; run.idle = 0;
  chooseEl.hidden = lockBtn.hidden = true;
  labSound.predict();
  if (convo) endConvo(false);
  story(run.rd.test);
  drawHud();
}
function lockSort(){
  const run = lab.run, g = {};
  for (const id in run.rd.sort.things) g[id] = restingIn(id);
  predict(g);
}
const labelOf = (rd, id) => rd.choose ? (rd.choose.find(o => o.id === id) || {label:id}).label : rd.sort.bins[id];
// The answer cards go in the clear space under the question card, left of the buttons when they'd
// reach them, and above whatever is at the bottom: Dr. Sparks talking, or the hint. Smaller if they
// must; if even that would cover her words, they wait until she's done.
function placeChoices(){
  if (chooseEl.hidden) return;
  const card = $('lhCard').getBoundingClientRect(), btns = hud.querySelector('.btns').getBoundingClientRect(), say = document.getElementById('dialog');
  const talking = say && !say.hidden, floor = talking ? say.getBoundingClientRect().top - 8 : innerHeight - 60, top = card.bottom + 12, left = Math.max(16, card.left);
  const right = top < btns.bottom ? btns.left - 12 : innerWidth - 16;
  Object.assign(chooseEl.style, {left:left + 'px', top:top + 'px', width:Math.max(0, right - left) + 'px'});
  for (const tight of [false, true]) { chooseEl.classList.toggle('tight', tight); if (top + chooseEl.offsetHeight <= floor) break; }
  chooseEl.classList.toggle('wait', talking && top + chooseEl.offsetHeight > floor);
}
function runStep(dt){
  tipUi(dt);
  const run = lab.run; if (!run || run.exp.free || !run.rd) return;
  const rd = run.rd;
  if (run.phase === 'prep' && rd.prep.done()) ask();
  if (run.phase === 'predict' && rd.sort) {
    run.placed = Object.keys(rd.sort.things).filter(id => rd.sort.bins[restingIn(id)]).length;
    lockBtn.hidden = run.placed < Object.keys(rd.sort.things).length;
  }
  if (run.phase === 'test') {
    // hints are for an explorer who's stopped, not one who's busy trying things
    run.idle = desk.held ? 0 : run.idle + dt;
    if (rd.choose) { const got = rd.observe(run); if (got) compare(got); }
    else {
      const got = rd.observe(run) || {};
      for (const id in got) if (rd.sort.things[id] && !run.result[id]) {
        run.result[id] = got[id]; run.idle = 0; labSound.tested(run.guess[id] === got[id]);
        // say what each one did as it happens, and whether that matched the guess
        story([['sparks', rd.why[id] + (run.guess[id] === got[id] ? ' You called it!' : ' Did that surprise you?')]]);
      }
      if (Object.keys(run.result).length === Object.keys(rd.sort.things).length) compare(run.result);
    }
    if (run.phase === 'test' && run.idle > HINT_AFTER && run.hintI < rd.hints.length && !convo) { run.idle = 0; giveHint(); }
  }
  drawHud();
}
function giveHint(){
  const run = lab && lab.run; if (!run || !run.rd || run.hintI >= run.rd.hints.length) return;
  story(run.rd.hints[run.hintI++]); labSound.hint(); drawHud();
}
function compare(result){
  const run = lab.run, rd = run.rd;
  run.phase = 'result'; run.result = result;
  let lines, right, total;
  if (rd.choose) {
    total = 1; right = run.guess === result ? 1 : 0;
    const said = rd.say && rd.say[result];
    lines = [['sparks', right ? `You predicted "${labelOf(rd, run.guess)}", and that's just what happened. Great prediction!`
      : `You predicted "${labelOf(rd, run.guess)}", but look what happened instead! A surprise means you just learned something.`], ...(said ? [['sparks', said]] : [])];
  } else {
    const ids = Object.keys(rd.sort.things); total = ids.length; right = ids.filter(id => run.guess[id] === result[id]).length;
    lines = [['sparks', right === total ? `You got all ${total} right! What a scientist.` : `You predicted ${right} out of ${total} right. The surprises are the best part!`]];
  }
  run.notes.push({right, total});
  if (right === total) labSound.right(); else labSound.surprise();
  story(lines, () => { if (lab && lab.run === run) nextRound(); });
  drawHud();
}
const list = xs => xs.length < 2 ? xs.join('') : xs.slice(0, -1).join(', ') + ' and ' + xs[xs.length - 1];
function finish(){
  const run = lab.run, exp = run.exp, rec = record(), before = new Set(rec.done || []), done = new Set(before);
  run.phase = 'done'; run.rd = null; done.add(exp.id);
  const right = run.notes.reduce((s, n) => s + n.right, 0), total = run.notes.reduce((s, n) => s + n.total, 0);
  const fresh = EXPERIMENTS.filter(e => opened(e, done) && !opened(e, before)), had = stocked(before), now = stocked(done);
  save('lab', {done:[...done], notes:Object.assign({}, rec.notes, {[exp.id]: {right, total}}), fresh:fresh.map(e => e.id)});
  labSound.complete();
  const got = [...now].filter(t => !had.has(t)), freeNow = before.size < FREE_AFTER && done.size >= FREE_AFTER, extra = [];
  if (fresh.length) labSound.unlock(1.5);
  stockCabinet(now);
  toast('Experiment complete!', fresh.length ? `New in the book: ${list(fresh.map(e => e.title))}` : got.length ? 'New supplies in your cabinet!' : exp.title);
  if (fresh.length) extra.push(['sparks', `You've opened up ${fresh.length > 1 ? 'new experiments' : 'a new experiment'} in my book: ${list(fresh.map(e => e.title))}!`]);
  // the first eruption is what opens the Wonder Bus trip to the volcano (hq/index.js)
  if (exp.id === 'volcano' && !before.has('volcano')) extra.push(['sparks', "That fizz gave me an idea, {name}! The Wonder Bus is ready to visit a REAL volcano. Hop aboard in the garden whenever you like!"]);
  if (freeNow) extra.push(['sparks', "And you've earned the Free Lab! Everything from this experiment is waiting in the cabinet behind the mat, to mix however you like."]);
  else if (got.length) extra.push(['sparks', `I've put the ${list(got.map(t => ITEMS[t].name.toLowerCase()))} in your cabinet for the Free Lab.`]);
  const after = $('lhAfter'); after.innerHTML = ''; after.hidden = false;
  EXPERIMENTS.filter(e => e.after.includes(exp.id) && opened(e, done) && !done.has(e.id))
    .forEach((e, i) => { const b = pill(`Next: ${e.title} →`, () => startRun(e)); if (!i) b.classList.add('go'); after.appendChild(b); });
  after.appendChild(pill('Experiment book', openBook));
  story([...exp.explain, ...extra]);
  drawHud();
}

function drawHud(){
  const run = lab && lab.run; if (!run || run.exp.free) return;
  placeChoices();
  const exp = run.exp, rd = run.rd;
  let q = '', st = '';
  if (run.phase === 'done') {
    q = 'All done!';
    st = `Predictions right: <b>${run.notes.reduce((s, n) => s + n.right, 0)}</b> of ${run.notes.reduce((s, n) => s + n.total, 0)}. Keep playing as long as you like.`;
  } else {
    q = run.phase === 'prep' ? 'First, get things ready.' : (exp.rounds.length > 1 ? `<b>Question ${run.r + 1} of ${exp.rounds.length}:</b> ` : '') + rd.q;
    if (run.phase === 'prep') st = rd.prep.do;
    else if (run.phase === 'predict') st = rd.sort ? `Make your guess: put each thing in a tray (${run.placed} of ${Object.keys(rd.sort.things).length})` : 'Make your guess: tap a card';
    else if (run.phase === 'test') st = rd.choose ? `Your guess: <span class="guess">${labelOf(rd, run.guess)}</span> Now test it!`
      : `Now test your guesses! ${Object.keys(run.result).length} of ${Object.keys(rd.sort.things).length} tested`;
    else { const n = run.notes[run.notes.length - 1]; st = n.right === n.total ? '<span class="ok">✓ Your prediction was right!</span>' : '<span class="wow">Surprise! That\'s how scientists learn.</span>'; }
  }
  if ($('lhQ').innerHTML !== q) $('lhQ').innerHTML = q;
  if ($('lhStatus').innerHTML !== st) $('lhStatus').innerHTML = st;
  hintBtn.hidden = run.phase !== 'test'; hintBtn.disabled = !rd || run.hintI >= rd.hints.length;
}
function tipUi(dt){
  const h = desk.held, canTip = h && isVessel(h) && !h.attached;
  tipBtn.hidden = !canTip && !tipBtn.classList.contains('on');
  if (canTip && desk.tip) lab.tipped = true;
  lab.hintAt += dt;
  const bare = lab.run.exp.free && !desk.items.some(it => !it.gone);
  hint.hidden = !bare && (lab.tipped || lab.hintAt > 40);
  if (!hint.hidden) hint.innerHTML = bare ? `${coarse ? 'Tap' : 'Click'} a <b>shelf</b> in the cabinet, then pick what you want`
    : coarse ? 'Drag things to carry them · hold <b>Tip</b> to pour' : 'Drag things to carry them · hold <b>Q</b> or <b>E</b> to tip left or right (or <b>right-click</b>)';
}
function pill(text, fn){ const b = document.createElement('button'); b.className = 'lab-pill'; b.textContent = text; b.addEventListener('click', fn); return b; }
function toast(big, small){
  const t = document.createElement('div'); t.id = 'labToast'; t.innerHTML = `${big}<small>${small}</small>`;
  const old = $('labToast'); if (old) old.remove(); hud.appendChild(t); setTimeout(() => t.remove(), 3700);
}

hintBtn.addEventListener('click', giveHint);
lockBtn.addEventListener('click', () => lab && lab.run && lab.run.phase === 'predict' && lockSort());
$('lhBook').addEventListener('click', () => lab && openBook());
$('lhReset').addEventListener('click', () => { if (lab && lab.run) { startRun(lab.run.exp, true); labSound.reset(); } });
$('lhLeave').addEventListener('click', leave);
$('lbLeave').addEventListener('click', leave);
const tipOn = e => { e.preventDefault(); tipBtn.setPointerCapture(e.pointerId); tipBtn.classList.add('on'); setTipButton(true); };
const tipOff = () => { tipBtn.classList.remove('on'); setTipButton(false); };
tipBtn.addEventListener('pointerdown', tipOn); tipBtn.addEventListener('pointerup', tipOff); tipBtn.addEventListener('pointercancel', tipOff);
tipBtn.addEventListener('contextmenu', e => e.preventDefault());

// Q tips left and E right: side by side under the hand that's off the mouse, and never a browser
// shortcut, which is why a Ctrl or Cmd held with them is left alone. Space tips left too, but only while
// the explorer isn't reading (it turns pages). Esc backs out one level: cabinet shelf, experiment, book, desk
const TIPS = {q:1, e:-1, ' ':1}, tipping = [];
const tipDir = e => TIPS[e.key.toLowerCase()] || 0;
const retip = () => setTipKey(tipping.length ? TIPS[tipping[tipping.length - 1]] : 0);
addEventListener('keydown', e => {
  if (!lab || lab.phase === 'walk' || lab.phase === 'turn') return;
  if (tipDir(e) && !e.ctrlKey && !e.metaKey && (e.key !== ' ' || !convo) && lab.phase === 'run') {
    e.preventDefault(); e.stopPropagation(); const k = e.key.toLowerCase(); if (!tipping.includes(k)) { tipping.push(k); retip(); } return; }
  if ((e.key === 'm' || e.key === 'M') && !e.repeat && !convo) { setSound(!Sound.isOn()); return; }
  if (e.key === 'Escape' && !convo) { e.stopPropagation(); if (lab.phase === 'run') { if (!closeCabinet()) openBook(); } else if (lab.phase === 'book') leave(); }
}, true);
addEventListener('keyup', e => { const i = tipping.indexOf(e.key.toLowerCase()); if (i >= 0) { tipping.splice(i, 1); retip(); } });
addEventListener('blur', () => { tipping.length = 0; retip(); });
