// Block Tower: stack ABC blocks from the toy crane onto the play mat in the hearth room. The
// explorer sits down by the mat, the camera sinks to rug level, and the game is played right
// there in the room. Loaded, with Matter.js, the first time someone plays with the crane.
//
// Matter.js simulates the tower side on, in pixels with y pointing down and the mat's top at y = 0;
// S turns its pixels into metres in the plane z = PLAY.z, and its gravity is the crane's G.

import * as THREE from 'three';
import { T, clamp01, ease, outline, rrect, tex } from '../core/kit.js';
import { camera } from '../core/render.js';
import { Sound } from '../core/sound.js';
import { hqAnims, scene } from '../hq/scene.js';
import { sitDown, standUp } from '../hq/sit.js';
import { GRIP, PLAY, crane } from '../hq/toy-crane.js';
import { keys } from '../input.js';
import { blob, hero } from '../player.js';
import { load, save } from '../save.js';
import { game } from '../state.js';
import { closeDialog } from '../ui/dialogue.js';

import M from 'matter-js';

const css = document.createElement('style');
css.textContent = `
.towering .hud,.towering #stick,.towering #talk,.towering .use,.towering #prompt,.towering #dialog{display:none!important}
#tower{position:fixed;inset:0;display:flex;flex-direction:column;touch-action:none;cursor:pointer;padding-top:env(safe-area-inset-top,0px);padding-bottom:env(safe-area-inset-bottom,0px);animation:tfade .6s ease-out}
@keyframes tfade{from{opacity:0}}
#tower header{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:10px max(16px,env(safe-area-inset-left,0px)) 18px;background:linear-gradient(rgba(26,19,32,.75),rgba(26,19,32,0))}
#tower h2{margin:0;font-family:var(--display);font-weight:400;font-size:clamp(20px,5vw,28px);color:var(--parch);line-height:1.1;text-shadow:0 2px 0 var(--ink)}
#tower .score{display:flex;gap:8px;flex-wrap:wrap;justify-content:flex-end}
#tower .chip{font-weight:900;font-size:14px;color:var(--parch);background:rgba(26,19,32,.7);border:2px solid var(--gold);border-radius:999px;padding:4px 12px;font-variant-numeric:tabular-nums;white-space:nowrap}
#tower .chip b{color:var(--gold)}
#tower .tspace{flex:1}
#tower .tbar{display:flex;gap:10px;justify-content:center;padding:8px 16px 12px;flex:none}
#tower .tb{font-family:var(--display);font-size:17px;color:var(--parch);background:var(--plum);border:2.5px solid var(--gold);border-radius:14px;padding:8px 18px;box-shadow:0 0 0 3px var(--ink);cursor:pointer}
#tower .tb.ghost{background:rgba(26,19,32,.55)}
#tower .tb:focus-visible{outline:3px solid var(--parch);outline-offset:3px}
@media (orientation:landscape) and (max-height:500px){#tower .tbar{justify-content:space-between;padding-left:max(16px,env(safe-area-inset-left,0px));padding-right:max(16px,env(safe-area-inset-right,0px))}}
#twob{position:absolute;left:0;right:0;top:64px;text-align:center;font-weight:900;font-size:18px;color:#e88b6b;text-shadow:0 2px 0 var(--ink);pointer-events:none;opacity:0}
#tmsg{position:absolute;left:50%;top:38%;transform:translate(-50%,-50%);text-align:center;pointer-events:none;font-family:var(--display);color:var(--parch);text-shadow:0 3px 0 var(--ink),0 0 24px rgba(217,164,65,.5);font-size:clamp(26px,7vw,44px);line-height:1.15;width:90%}
#tmsg small{display:block;font-family:var(--body);font-weight:900;font-size:16px;color:var(--gold);margin-top:8px;text-shadow:0 2px 0 var(--ink)}`;
document.head.appendChild(css);
const el = document.createElement('div'); el.id = 'tower'; el.hidden = true; el.setAttribute('role', 'dialog'); el.setAttribute('aria-label', 'Block Tower');
el.innerHTML = `<header><h2>Block Tower</h2><div class="score"><span class="chip">Tower <b id="tH">0</b></span><span class="chip">Best <b id="tB">0</b></span><span class="chip" id="tL">♥♥♥</span></div></header>
  <div class="tspace"></div><div id="twob">wobble!</div><div id="tmsg"></div>
  <div class="tbar"><button class="tb ghost" id="tAgain">Start over</button><button class="tb" id="tExit">Back to HQ</button></div>`;
document.body.appendChild(el);
const msg = el.querySelector('#tmsg'), wobEl = el.querySelector('#twob');

const COLORS = ['#b5552f', '#2f5552', '#d9a441', '#6d3b5e', '#3e6b45', '#4a5a8a', '#d36a8f', '#8a5a3a'];
const LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
const U = 56, S = .2/U;                             // one block high, in pixels; metres per pixel
const shapes = [[1, 1], [1, 1], [1, 1], [1.8, .8], [.8, 1.5], [1.4, 1]];
const CLEAR = .4;                                   // gap between the tower top and the bottom of the tallest hanging block, metres
const STEP = 1/60;
let best = +load('towerBest') || 0;
let engine = null, rug, floor, blocks = [], hang = null, nextHang = 0, lives = 3, over = false, height = 0, craneH = 0, shownMilestone = 0, msgT = 0, acc = 0, playing = false;

// ---------- the blocks' looks ----------
const faces = new Map();
function faceMat(look){
  const k = look.col + look.ch + look.w + 'x' + look.h;
  if (!faces.has(k)) {
    const pw = Math.round(look.w/U*128), ph = Math.round(look.h/U*128);
    faces.set(k, T(0xffffff, {map: tex(pw, ph, (g, w, h) => {
      g.fillStyle = look.col; g.fillRect(0, 0, w, h);
      g.strokeStyle = 'rgba(239,224,191,.85)'; g.lineWidth = 6; rrect(g, 14, 14, w - 28, h - 28, 8); g.stroke();
      g.fillStyle = '#efe0bf'; g.font = `700 ${Math.min(w, h)*.55}px Andika, "Trebuchet MS", sans-serif`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(look.ch, w/2, h/2 + 4);
    })}));
  }
  return faces.get(k);
}
function blockMesh(look){
  const side = T(new THREE.Color(look.col).getHex()), face = faceMat(look);
  const m = new THREE.Mesh(new THREE.BoxGeometry(look.w*S, look.h*S, U*S), [side, side, side, side, face, face]);
  m.castShadow = m.receiveShadow = true; outline(m, 1.04); return m;
}
function dropMesh(m){ m.parent.remove(m); m.geometry.dispose(); }

const bestLine = new THREE.Mesh(new THREE.BoxGeometry(1.5, .012, .012), new THREE.MeshBasicMaterial({color:0xd36a8f, transparent:true, opacity:.75}));
bestLine.position.set(PLAY.x, 0, PLAY.z - .16); bestLine.visible = false; scene.add(bestLine);

// ---------- the physics world ----------
function reset(){
  for (const b of blocks) dropMesh(b.mesh);
  if (hang) dropMesh(hang.mesh);
  engine = M.Engine.create(); engine.gravity.y = 1; engine.gravity.scale = PLAY.G/(S*1e6);
  const thick = (PLAY.top - PLAY.floor)/S, mastX = (PLAY.mastX - PLAY.x)/S;
  rug = M.Bodies.rectangle(0, thick/2, 2*PLAY.r/S, thick, {isStatic:true, friction:1, label:'rug'});
  floor = M.Bodies.rectangle(0, thick + 100, 20000, 200, {isStatic:true, friction:.8, label:'floor'});
  M.Composite.add(engine.world, [rug, floor,
    M.Bodies.rectangle(mastX, thick - PLAY.baseH/S/2, PLAY.baseW/S, PLAY.baseH/S, {isStatic:true}),
    M.Bodies.rectangle(mastX, thick - 4000, PLAY.mastW/S, 8000, {isStatic:true})]);
  M.Events.on(engine, 'collisionStart', e => { for (const p of e.pairs) { touch(p.bodyA, p.bodyB); touch(p.bodyB, p.bodyA); } });
  blocks = []; hang = null; nextHang = .4; lives = 3; over = false; height = 0; craneH = 0; shownMilestone = 0; acc = 0;
  say('Tap to drop!', 'Stack the blocks as high as you can'); updHud();
}
function touch(b, other){
  if (!b.look) return;
  if (other === floor) {
    if (b.fell) return;
    b.fell = 1.2;
    if (!playing || over) return;
    lives--; updHud();
    Sound.tone(220, {type:'sawtooth', dur:.25, vol:.06}); Sound.tone(165, {type:'sawtooth', t:.12, dur:.3, vol:.06});
    if (lives <= 0) gameOver(); else say('Oops!', lives === 1 ? 'Last try, steady now!' : 'It tumbled off the mat');
  } else if (!b.landed && (other === rug || other.look)) { b.landed = true; Sound.tone(300 + Math.random()*80, {type:'square', dur:.06, vol:.05}); }
}
function newHang(){
  const s = shapes[Math.floor(Math.random()*shapes.length)];
  const look = {w:s[0]*U, h:s[1]*U, col:COLORS[Math.floor(Math.random()*COLORS.length)], ch:LETTERS[Math.floor(Math.random()*LETTERS.length)]};
  const mesh = blockMesh(look); mesh.position.y = -look.h*S/2; mesh.scale.setScalar(.01); crane.load.add(mesh);
  hang = {look, mesh, t:0}; crane.hold(look.w*S, look.h*S);
}
const at = new THREE.Vector3(), vel = new THREE.Vector3();
function drop(){
  if (!playing || over || !hang) return;
  const {look, mesh} = hang, {angle, spin} = crane.release(at, vel);
  const b = M.Bodies.rectangle((at.x - PLAY.x)/S, (PLAY.top - at.y)/S, look.w, look.h, {friction:.9, frictionStatic:1.2, restitution:.02, density:.002, chamfer:{radius:5}});
  // Matter's angles turn the other way (its y points down) and its velocities are per step
  M.Body.setAngle(b, -angle); M.Body.setVelocity(b, {x:vel.x/S*STEP, y:-vel.y/S*STEP}); M.Body.setAngularVelocity(b, -spin*STEP);
  b.look = look; b.mesh = mesh; mesh.scale.setScalar(1); scene.add(mesh); blocks.push(b); M.Composite.add(engine.world, b);
  Sound.tone(520 + Math.random()*120, {type:'triangle', dur:.1, vol:.07});
  hang = null; nextHang = .45;
}

function say(big, small){ msg.innerHTML = big + (small ? `<small>${small}</small>` : ''); msgT = 2.4; }
function updHud(){
  el.querySelector('#tH').textContent = (height/U).toFixed(1); el.querySelector('#tB').textContent = (best/U).toFixed(1);
  el.querySelector('#tL').textContent = '♥'.repeat(Math.max(0, lives)) + '♡'.repeat(3 - Math.max(0, lives));
}
function gameOver(){
  over = true;
  if (hang) { dropMesh(hang.mesh); hang = null; crane.hold(null); }
  say(`Tower: ${(height/U).toFixed(1)} blocks`, height >= best - .5 && height > 0 ? 'A new best! Tap Start over to build again' : `Best is ${(best/U).toFixed(1)}. Tap Start over to try again`);
  msgT = 1e9; [523, 659, 784].forEach((f, i) => Sound.tone(f, {type:'triangle', t:i*.1, dur:.3, vol:.08}));
}

// the tower keeps standing (or toppling) after the explorer gets up; only the game's rules wait for play
function simulate(dt){
  acc = Math.min(acc + dt, 4*STEP);
  while (acc >= STEP) { M.Engine.update(engine, STEP*1000); acc -= STEP; }
  for (let i = blocks.length - 1; i >= 0; i--) {
    const b = blocks[i];
    if (b.fell && (b.fell -= dt) < .3) b.mesh.scale.setScalar(Math.max(.01, b.fell/.3));
    if ((b.fell && b.fell <= 0) || Math.abs(b.position.x) > 3000) { M.Composite.remove(engine.world, b); dropMesh(b.mesh); blocks.splice(i, 1); continue; }
    b.mesh.position.set(PLAY.x + b.position.x*S, PLAY.top - b.position.y*S, PLAY.z); b.mesh.rotation.z = -b.angle;
  }
}
function rules(dt){
  if (hang && hang.t < 1) { hang.t = Math.min(1, hang.t + dt*5); hang.mesh.scale.setScalar(ease(hang.t)); }
  if (!hang && !over && (nextHang -= dt) <= 0) newHang();
  let top = 0, wob = 0;
  for (const b of blocks) if (b.landed && !b.fell) {
    if (b.speed < .35) top = Math.max(top, -b.bounds.min.y);
    wob = Math.max(wob, Math.abs(b.angularVelocity));
  }
  if (Math.abs(top - height) > 1) { height = top; updHud(); }
  if (height > best) { best = height; save('towerBest', Math.round(best)); updHud(); }
  const blocksHigh = Math.floor(height/U);
  if (blocksHigh >= 5 && blocksHigh % 5 === 0 && blocksHigh > shownMilestone) {
    shownMilestone = blocksHigh; say(['', '', '', '', '', 'Hoo-hoo! Five high!', 'Ten high! Wow!', '', '', '', 'FIFTEEN! A skyscraper!'][Math.min(10, blocksHigh/5 + 4)] || blocksHigh + ' high!', 'Keep going…');
    [784, 988, 1175].forEach((f, i) => Sound.tone(f, {type:'triangle', t:i*.08, dur:.25, vol:.08}));
  }
  wobEl.style.opacity = over ? 0 : Math.min(1, Math.max(0, (wob - .03)*12));
  if (msgT < 1e8) { msgT -= dt; msg.style.opacity = clamp01(msgT); }
  bestLine.visible = best > 0; bestLine.position.y = PLAY.top + best*S;
  // the crane climbs with the tower at once but lowers only slowly, so it never jumps while blocks wobble;
  // it reels its cable in as the tower grows, and a shorter pendulum swings faster
  craneH = Math.max(height, craneH - dt*30);
  const w = 2 + Math.min(1, height/U*.05), L = PLAY.G/(w*w);
  crane.aim(PLAY.top + craneH*S + CLEAR + 1.5*U*S + GRIP + L, L, .32);
}

// ---------- the explorer sits down by the mat, and the camera comes down to the rug ----------
const SEAT = {x:PLAY.x, z:6.45};
let open = false;
const chest = new THREE.Vector3();
function rugCam(pos, look){
  // far enough back to see the whole swing across, and from a few blocks down the tower to above the hanging block
  const tan = Math.tan(camera.fov*Math.PI/360), d = Math.min(2.5, Math.max(.7/(tan*camera.aspect), .8/tan));
  const y = PLAY.top + craneH*S + .28;
  look.set(PLAY.x, y, PLAY.z); pos.set(PLAY.x, Math.max(PLAY.top + .06, y - .2), PLAY.z + d);
}
// sat on the floor with their legs out in front
function pose(p){ hero.legL.rotation.x = hero.legR.rotation.x = -1.4*p; hero.body.position.y = (.02 - .66*hero.body.scale.y)*p; }
hqAnims.push(dt => {
  if (open) {
    // the camera sweeps down through where the explorer sits; they'd fill the view on the way past
    hero.body.getWorldPosition(chest); chest.y += .5;
    hero.root.visible = blob.visible = camera.position.distanceTo(chest) > 1.1;
  }
  if (engine) { simulate(dt); if (playing) rules(dt); }
});

export function openTower(){
  if (!sitDown({x:SEAT.x, z:SEAT.z, angle:Math.PI, pose, seated:() => { game.cutCam = rugCam; el.hidden = false; playing = true; }})) return;
  closeDialog(); for (const k in keys) keys[k] = false; open = true;
  document.documentElement.classList.add('towering'); reset();
  Sound.duck(true); [523, 659, 784].forEach((f, i) => Sound.tone(f, {type:'triangle', t:i*.07, dur:.2, vol:.08}));
}
function close(){
  if (!open) return;
  open = false; playing = false; el.hidden = true; bestLine.visible = false; document.documentElement.classList.remove('towering');
  if (hang) { dropMesh(hang.mesh); hang = null; crane.hold(null); }
  crane.aim(PLAY.top + craneH*S + CLEAR + 1.5*U*S + GRIP + .9, .9, .03);
  game.cutCam = null; hero.root.visible = blob.visible = true;
  standUp();
  Sound.duck(false);
}

el.addEventListener('pointerdown', e => { if (e.target.closest('button')) return; e.preventDefault(); Sound.init(); drop(); });
el.querySelector('#tAgain').addEventListener('click', () => reset());
el.querySelector('#tExit').addEventListener('click', () => close());
addEventListener('keydown', e => {
  if (!open) return;
  e.stopPropagation();
  if (e.key === 'Escape') { close(); return; }
  if ((e.key === ' ' || e.key === 'Enter') && !e.repeat && e.target.tagName !== 'BUTTON') { e.preventDefault(); if (over) reset(); else drop(); }
}, true);
