// Block Tower: stack swinging ABC blocks on the hearth rug. Loaded, with Matter.js, the first
// time someone plays with the toy blocks.

import { Sound } from '../core/sound.js';
import { keys } from '../input.js';
import { clock } from '../play.js';
import { load, save } from '../save.js';
import { game } from '../state.js';
import { closeDialog } from '../ui/dialogue.js';

import M from 'matter-js';

const css = document.createElement('style');
css.textContent = `
.towering #world,.towering .vignette,.towering .hud,.towering #stick,.towering #talk,.towering #use,.towering #prompt,.towering #dialog{display:none!important}
#tower{position:fixed;inset:0;display:flex;flex-direction:column;background:#2a2140;touch-action:none;padding-top:env(safe-area-inset-top,0px);padding-bottom:env(safe-area-inset-bottom,0px)}
#tower header{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:10px max(16px,env(safe-area-inset-left,0px)) 8px}
#tower h2{margin:0;font-family:var(--display);font-weight:400;font-size:clamp(20px,5vw,28px);color:var(--parch);line-height:1.1}
#tower .score{display:flex;gap:8px;flex-wrap:wrap;justify-content:flex-end}
#tower .chip{font-weight:900;font-size:14px;color:var(--parch);background:rgba(26,19,32,.7);border:2px solid var(--gold);border-radius:999px;padding:4px 12px;font-variant-numeric:tabular-nums;white-space:nowrap}
#tower .chip b{color:var(--gold)}
#tcv{flex:1;min-height:0;width:100%;display:block;cursor:pointer}
#tower .tbar{display:flex;gap:10px;justify-content:center;padding:8px 16px 12px;flex:none}
#tower .tb{font-family:var(--display);font-size:17px;color:var(--parch);background:var(--plum);border:2.5px solid var(--gold);border-radius:14px;padding:8px 18px;box-shadow:0 0 0 3px var(--ink);cursor:pointer}
#tower .tb.ghost{background:rgba(239,224,191,.08)}
#tower .tb:focus-visible{outline:3px solid var(--parch);outline-offset:3px}
#tmsg{position:absolute;left:50%;top:42%;transform:translate(-50%,-50%);text-align:center;pointer-events:none;font-family:var(--display);color:var(--parch);text-shadow:0 3px 0 var(--ink),0 0 24px rgba(217,164,65,.5);font-size:clamp(26px,7vw,44px);line-height:1.15;width:90%}
#tmsg small{display:block;font-family:var(--body);font-weight:900;font-size:16px;color:var(--gold);margin-top:8px;text-shadow:0 2px 0 var(--ink)}`;
document.head.appendChild(css);
const el = document.createElement('div'); el.id = 'tower'; el.hidden = true; el.setAttribute('role', 'dialog'); el.setAttribute('aria-label', 'Block Tower');
el.innerHTML = `<header><h2>Block Tower</h2><div class="score"><span class="chip">Tower <b id="tH">0</b></span><span class="chip">Best <b id="tB">0</b></span><span class="chip" id="tL">♥♥♥</span></div></header>
  <canvas id="tcv"></canvas><div id="tmsg"></div>
  <div class="tbar"><button class="tb ghost" id="tAgain">Start over</button><button class="tb" id="tExit">Back to HQ</button></div>`;
document.body.appendChild(el);
const cv = el.querySelector('#tcv'), g = cv.getContext('2d'), msg = el.querySelector('#tmsg');
let best = +load('towerBest') || 0;
const COLORS = ['#b5552f', '#2f5552', '#d9a441', '#6d3b5e', '#3e6b45', '#4a5a8a', '#d36a8f', '#8a5a3a'];
const LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
const U = 56;                                       // one "block" of height
let crane = 0, craneVis = 0, engine, ground, blocks = [], hang = null, t = 0, camY = 0, lives = 3, over = false, height = 0, shownMilestone = 0, raf = 0, last = 0, W = 0, H = 0, dpr = 1, msgT = 0, wob = 0;
const groundY = 0;                                  // world y of the rug top (y grows down, so the tower goes negative)
const shapes = [[1, 1], [1, 1], [1, 1], [1.8, .8], [.8, 1.5], [1.4, 1]];
function newHang() {
  const s = shapes[Math.floor(Math.random() * shapes.length)];
  hang = { w: s[0] * U, h: s[1] * U, col: COLORS[Math.floor(Math.random() * COLORS.length)], ch: LETTERS[Math.floor(Math.random() * LETTERS.length)], a: 0 };
}
function reset() {
  engine = M.Engine.create(); engine.gravity.y = 1;
  ground = M.Bodies.rectangle(0, groundY + 40, 330, 80, { isStatic: true, friction: 1, label: 'rug' });
  M.Composite.add(engine.world, ground);
  blocks = []; lives = 3; over = false; height = 0; crane = 0; craneVis = 0; shownMilestone = 0; camY = 0; t = 0; msgT = 0; newHang(); say('Tap to drop!', 'Stack the blocks as high as you can');
  updHud();
}
function say(big, small) { msg.innerHTML = big + (small ? `<small>${small}</small>` : ''); msgT = 2.4; }
function updHud() {
  el.querySelector('#tH').textContent = (height / U).toFixed(1); el.querySelector('#tB').textContent = (best / U).toFixed(1);
  el.querySelector('#tL').textContent = '♥'.repeat(lives) + '♡'.repeat(3 - lives);
}
function hookX() { const amp = Math.min(150, W * .32 / scale()), sp = 1.3 + Math.min(1.4, height / U * .07); return Math.sin(t * sp) * amp; }
function hookY() { return -craneVis - 230; }   // the crane follows a smoothed height so it never jumps while blocks wobble
function scale() { return Math.min(1.25, Math.max(.6, W / 520)); }
function drop() {
  if (over || !hang) return;
  const sp = 1.3 + Math.min(1.4, height / U * .07), amp = Math.min(150, W * .32 / scale());
  const b = M.Bodies.rectangle(hookX(), hookY() + 30 + hang.h / 2, hang.w, hang.h, { friction: .9, frictionStatic: 1.2, restitution: .02, density: .002, chamfer: { radius: 5 } });
  M.Body.setVelocity(b, { x: Math.cos(t * sp) * amp * sp / 60 * .6, y: 2 });
  b.look = hang; b.landed = false; blocks.push(b); M.Composite.add(engine.world, b);
  Sound.tone(520 + Math.random() * 120, { type: 'triangle', dur: .1, vol: .07 });
  hang = null; setTimeout(() => { if (!over) newHang(); }, 450);
}
function step(dt) {
  t += dt;
  M.Engine.update(engine, 1000 / 60);
  // landing clacks, falls off the rug, and the settled tower height
  let top = 0;
  for (let i = blocks.length - 1; i >= 0; i--) {
    const b = blocks[i];
    if (!b.landed && b.speed < 2.5 && b.position.y > hookY() + 60) { b.landed = true; Sound.tone(300 + Math.random() * 80, { type: 'square', dur: .06, vol: .05 }); }
    if (b.position.y > groundY + 200) {
      M.Composite.remove(engine.world, b); blocks.splice(i, 1); lives--; updHud();
      Sound.tone(220, { type: 'sawtooth', dur: .25, vol: .06 }); Sound.tone(165, { type: 'sawtooth', t: .12, dur: .3, vol: .06 });
      if (lives <= 0) { gameOver(); return; } say('Oops!', lives === 1 ? 'Last try, steady now!' : 'It tumbled off the rug');
      continue;
    }
    if (b.landed && b.speed < .35) top = Math.max(top, groundY - b.bounds.min.y);
  }
  if (top > height + 1 || top < height - 1) { height = top; updHud(); }
  if (height > best) { best = height; save('towerBest', Math.round(best)); updHud(); }
  const blocksHigh = Math.floor(height / U);
  if (blocksHigh >= 5 && blocksHigh % 5 === 0 && blocksHigh > shownMilestone) {
    shownMilestone = blocksHigh; say(['', '', '', '', '', 'Hoo-hoo! Five high!', 'Ten high! Wow!', '', '', '', 'FIFTEEN! A skyscraper!'][Math.min(10, blocksHigh / 5 + 4)] || blocksHigh + ' high!', 'Keep going…');
    [784, 988, 1175].forEach((f, i) => Sound.tone(f, { type: 'triangle', t: i * .08, dur: .25, vol: .08 }));
  }
  wob = 0; for (const b of blocks) if (b.landed) wob = Math.max(wob, Math.abs(b.angularVelocity));
  crane = Math.max(height, crane - dt * 30); craneVis += (crane - craneVis) * Math.min(1, dt * 2.5);
}
function gameOver() {
  over = true; hang = null;
  say(`Tower: ${(height / U).toFixed(1)} blocks`, height >= best - .5 && height > 0 ? 'A new best! Tap Start over to build again' : `Best is ${(best / U).toFixed(1)}. Tap Start over to try again`);
  msgT = 1e9; [523, 659, 784].forEach((f, i) => Sound.tone(f, { type: 'triangle', t: i * .1, dur: .3, vol: .08 }));
}
function roundRect(x, y, w, h, r) { g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); }
function drawBlock(look, w, h) {
  g.fillStyle = look.col; roundRect(-w / 2, -h / 2, w, h, 7); g.fill(); g.lineWidth = 4; g.strokeStyle = '#1a1320'; g.stroke();
  g.strokeStyle = 'rgba(239,224,191,.85)'; g.lineWidth = 3; roundRect(-w / 2 + 7, -h / 2 + 7, w - 14, h - 14, 4); g.stroke();
  g.fillStyle = '#efe0bf'; g.font = `700 ${Math.min(w, h) * .55}px Andika, "Trebuchet MS", sans-serif`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(look.ch, 0, 2);
}
function draw() {
  const s = scale();
  // camera eases up so the hook stays near the top of the screen
  const want = Math.min(0, hookY() - (H * .14 - H * .82) / s);
  camY += (want - camY) * .06;
  g.setTransform(dpr, 0, 0, dpr, 0, 0);
  const sky = g.createLinearGradient(0, 0, 0, H); sky.addColorStop(0, '#3a2c52'); sky.addColorStop(1, '#5a3d4e'); g.fillStyle = sky; g.fillRect(0, 0, W, H);
  g.save(); g.translate(W / 2, H * .82); g.scale(s, s); g.translate(0, -camY);
  // wallpaper stripes and Professor Hoot's chalk height marks
  g.fillStyle = 'rgba(255,255,255,.035)'; for (let x = -1200; x < 1200; x += 70) g.fillRect(x, -6000, 35, 6000);
  g.font = '900 15px Nunito, sans-serif'; g.textAlign = 'left';
  for (let k = 1; k <= 40; k++) { const y = groundY - k * U; g.strokeStyle = k % 5 ? 'rgba(239,224,191,.12)' : 'rgba(217,164,65,.55)'; g.lineWidth = k % 5 ? 1.5 : 3; g.setLineDash(k % 5 ? [6, 10] : []); g.beginPath(); g.moveTo(-600, y); g.lineTo(600, y); g.stroke(); g.setLineDash([]);
    if (k % 5 === 0) { g.fillStyle = '#d9a441'; g.fillText(k + ' high', 175, y - 6); } }
  if (best > 0) { const y = groundY - best; g.strokeStyle = '#d36a8f'; g.lineWidth = 3; g.setLineDash([12, 8]); g.beginPath(); g.moveTo(-600, y); g.lineTo(600, y); g.stroke(); g.setLineDash([]); g.fillStyle = '#d36a8f'; g.textAlign = 'right'; g.fillText('best', -175, y - 6); g.textAlign = 'left'; }
  // the rug and the floor
  g.fillStyle = '#5a3a28'; g.fillRect(-1200, groundY, 2400, 900);
  g.fillStyle = '#6d3b5e'; roundRect(-170, groundY - 6, 340, 26, 12); g.fill(); g.strokeStyle = '#1a1320'; g.lineWidth = 4; g.stroke();
  g.strokeStyle = '#d9a441'; g.lineWidth = 3; roundRect(-158, groundY - 1, 316, 14, 7); g.stroke();
  for (const b of blocks) { g.save(); g.translate(b.position.x, b.position.y); g.rotate(b.angle); drawBlock(b.look, b.look.w, b.look.h); g.restore(); }
  // the crane: a string from above and the hanging block
  const hx = hookX(), hy = hookY();
  g.strokeStyle = '#1a1320'; g.lineWidth = 3; g.beginPath(); g.moveTo(0, hy - 400); g.lineTo(hx, hy + 22); g.stroke();
  g.fillStyle = '#d9a441'; g.beginPath(); g.arc(hx, hy + 22, 7, 0, 7); g.fill(); g.stroke();
  if (hang) { g.save(); g.translate(hx, hy + 30 + hang.h / 2); g.rotate(Math.sin(t * 2.6) * .05); drawBlock(hang, hang.w, hang.h); g.restore(); }
  g.restore();
  if (wob > .03 && !over) { g.fillStyle = `rgba(232,139,107,${Math.min(.5, wob * 6)})`; g.font = '900 18px Nunito'; g.textAlign = 'center'; g.fillText('wobble!', W / 2, 26); }
}
function loop(ts) {
  if (game.activity !== 'tower') return;
  const dt = Math.min(.05, (ts - last) / 1000 || 0); last = ts;
  if (!over) step(dt); else t += dt;
  if (msgT < 1e8) { msgT -= dt; msg.style.opacity = Math.max(0, Math.min(1, msgT)); }
  draw(); raf = requestAnimationFrame(loop);
}
function resize() { const r = cv.getBoundingClientRect(); dpr = Math.min(2, devicePixelRatio || 1); W = r.width; H = r.height; cv.width = W * dpr; cv.height = H * dpr; }
cv.addEventListener('pointerdown', e => { e.preventDefault(); Sound.init(); drop(); });
el.querySelector('#tAgain').addEventListener('click', () => { reset(); });
el.querySelector('#tExit').addEventListener('click', () => close());
addEventListener('resize', () => { if (game.activity === 'tower') resize(); });
export function openTower() {
  if (game.activity) return;
  closeDialog(); game.activity = 'tower'; for (const k in keys) keys[k] = false;
  document.documentElement.classList.add('towering'); el.hidden = false; resize(); reset();
  Sound.duck(true); [523, 659, 784].forEach((f, i) => Sound.tone(f, { type: 'triangle', t: i * .07, dur: .2, vol: .08 }));
  last = performance.now(); raf = requestAnimationFrame(loop);
}
function close() {
  if (game.activity !== 'tower') return;
  game.activity = null; el.hidden = true; document.documentElement.classList.remove('towering'); cancelAnimationFrame(raf);
  Sound.duck(false); clock.getDelta();
}
function key(e) {
  if (e.key === 'Escape') { close(); return; }
  if ((e.key === ' ' || e.key === 'Enter') && !e.repeat && e.target.tagName !== 'BUTTON') { e.preventDefault(); if (over) reset(); else drop(); }
}
addEventListener('keydown', e => { if (game.activity !== 'tower') return; e.stopPropagation(); key(e); }, true);
