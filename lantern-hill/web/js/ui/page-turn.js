// ---------- page turns: the screen becomes a page in a storybook, and the page turns to the next scene ----------
// The camera pulls back to show the page lying in a thick book on a lamplit desk, the page lifts by
// its near corner and turns (its back printed with the chapter to come), and the camera dives into
// the next page until it fills the screen again. Both ends match the game pixel for pixel, so the
// world seems to become a page and the next page to become the world.
//
// A turn can also span a page reload (a new version of the game): turnOut() on the old page stops
// on the book, printed with what is happening, and saves that frame; the inline script at the end of
// index.html paints it before the new page has built anything, with a few dots of ink breathing on
// the page so a slow load never looks stuck; and turnIn() on the new page turns from it into the
// live world.

import * as THREE from 'three';
import { ease, glowTex } from '../core/kit.js';
import { camera, canvas, renderer } from '../core/render.js';
import { Sound } from '../core/sound.js';
import { clock, drawWorld } from '../play.js';
import { makeStorybook } from '../props/storybook.js';
import { game } from '../state.js';
import { $ } from './dom.js';

const STASH = 'lanternHill.turn';   // the inline script in index.html reads this key too
const cv = $('storybook'), stashEl = $('storyStash'), bannerEl = $('banner'), noteEl = $('turnNote'), root = document.documentElement;
// long enough to read the page and hear the bells ring out before the reload
const HOLD = 1400;
// the pulled-back view: tipped toward the reader and turned to their corner
const TILT = .58, YAW = .3;
// the turn, in ms from the pulled-back book: the leaf lands at LAND, the camera dives from DIVE
const LAND = 1050, DIVE = 1400, DIVE_MS = 720;
const UPDATING = {ch:'A new page!', title:'Lantern Hill is updating', sub:'Back in a blink'};
const UPDATED = {title:'On with the story!'};
let sb = null, fx = null;

// the two game frames printed in the book: the one we leave and the one we turn to
const shots = [0, 1].map(() => { const c = document.createElement('canvas'); return {c, t: frameTex(new THREE.CanvasTexture(c))}; });
function frameTex(t){ t.encoding = THREE.sRGBEncoding; t.minFilter = THREE.LinearFilter; t.generateMipmaps = false; return t; }
function shoot(i){ const s = shots[i]; s.c.width = canvas.width; s.c.height = canvas.height; s.c.getContext('2d').drawImage(canvas, 0, 0); s.t.needsUpdate = true; return s.t; }
// the printed pages either side of the turn: the left-hand page, and the back of the turning leaf
const sheets = [0, 1].map(() => { const c = document.createElement('canvas'); return {c, t: frameTex(new THREE.CanvasTexture(c))}; });

const fonts = () => Promise.race([new Promise(r => setTimeout(r, 900)),
  Promise.all(['700 64px Caprasimo', '900 32px Nunito', '800 32px Nunito'].map(f => document.fonts.load(f))).catch(() => {})]);

function book(){
  if (!sb) { sb = makeStorybook(cv); fx = atmosphere(sb); }
  sb.renderer.setPixelRatio(renderer.getPixelRatio()); sb.resize(innerWidth, innerHeight); sb.setAspect(innerWidth/innerHeight);
  sb.setStacks(.7, .78); sb.setPages(sb.paper, sb.paper); sb.settle();
  fx.fit();
  return sb;
}

// ---------- the look of the desk: motes of dust in the lamplight, and the room darkening round the edges ----------
// Both are scaled by how far the camera has pulled back, so at the ends of a turn they are gone.
function atmosphere(sb){
  const N = 60, seed = Array.from({length: N*4}, (_, i) => (Math.sin(i*127.1 + 311.7)*43758.5453) % 1).map(Math.abs);
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(N*3), 3));
  const motes = new THREE.Points(g, new THREE.PointsMaterial({map:glowTex, size:.07, transparent:true, depthWrite:false, blending:THREE.AdditiveBlending, color:0xffd9a0}));
  motes.frustumCulled = false; sb.scene.add(motes);
  const vig = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({transparent:true, depthTest:false, depthWrite:false,
    map:tex2d(256, (g, w) => { const gr = g.createRadialGradient(w/2, w/2, w*.22, w/2, w/2, w*.72); gr.addColorStop(0, 'rgba(20,10,6,0)'); gr.addColorStop(1, 'rgba(20,10,6,.9)'); g.fillStyle = gr; g.fillRect(0, 0, w, w); })}));
  vig.renderOrder = 10; vig.position.z = -.1; sb.camera.add(vig); sb.scene.add(sb.camera);
  let clockS = 0, k = 0;
  return {
    get clock(){ return clockS; },
    fit(){ const h = 2*.1*Math.tan(sb.camera.fov*Math.PI/360); vig.scale.set(h*sb.camera.aspect, h, 1); },
    // drifting slowly up through the light and swaying, each on its own path, the same for the same clock
    tick(dt, at = clockS + dt){
      clockS = at;
      const a = g.attributes.position, W = sb.W, H = sb.H;
      for (let i = 0; i < N; i++) {
        const [u, v, w, s] = seed.slice(i*4, i*4 + 4), rise = (v + clockS*(.02 + s*.03)) % 1;
        a.setXYZ(i, (u*2.2 - 1.1)*W + Math.sin(clockS*.4 + s*9)*.25, .3 + rise*2.6, (w*1.5 - .7)*H + Math.cos(clockS*.33 + u*7)*.2);
      }
      a.needsUpdate = true;
      motes.material.opacity = k*.8; vig.material.opacity = k*.75; motes.visible = vig.visible = k > .002;
    },
    set(t){ k = t; fx.tick(0); }
  };
}
function tex2d(w, draw){ const c = document.createElement('canvas'); c.width = c.height = w; draw(c.getContext('2d'), w); return new THREE.CanvasTexture(c); }

// ---------- printing the pages ----------
// Paper, a gold rule round the page, a little lantern, and optionally words. The back of a leaf
// also shows a faint mirror image of its front, as thin paper does.
function print(sheet, words, ghost){
  const k = 1024/Math.max(sb.W, sb.H), w = sheet.c.width = Math.round(sb.W*k), h = sheet.c.height = Math.round(sb.H*k), g = sheet.c.getContext('2d'), m = Math.min(w, h);
  g.drawImage(sb.paper.image, 0, 0, w, h);
  if (ghost) { g.save(); g.globalAlpha = .06; g.translate(w, 0); g.scale(-1, 1); g.drawImage(ghost, 0, 0, w, h); g.restore(); }
  const age = g.createRadialGradient(w/2, h/2, m*.3, w/2, h/2, Math.hypot(w, h)*.55); age.addColorStop(0, 'rgba(150,105,60,0)'); age.addColorStop(1, 'rgba(150,105,60,.22)');
  g.fillStyle = age; g.fillRect(0, 0, w, h);
  const ins = m*.06, gold = '#c49a3a', plum = '#6d3b5e';
  g.strokeStyle = gold; g.lineWidth = m*.006; g.strokeRect(ins, ins, w - 2*ins, h - 2*ins);
  g.lineWidth = m*.0025; g.strokeRect(ins + m*.016, ins + m*.016, w - 2*ins - m*.032, h - 2*ins - m*.032);
  for (const [cx, cy, sx, sy] of [[ins, ins, 1, 1], [w - ins, ins, -1, 1], [ins, h - ins, 1, -1], [w - ins, h - ins, -1, -1]]) {
    g.save(); g.translate(cx, cy); g.scale(sx, sy); g.fillStyle = gold;
    g.beginPath(); g.moveTo(0, 0); g.lineTo(m*.07, 0); g.quadraticCurveTo(m*.02, m*.02, 0, m*.07); g.closePath(); g.fill();
    g.beginPath(); g.arc(m*.045, m*.045, m*.008, 0, 7); g.fill(); g.restore();
  }
  const cx = w/2, lantern = (y, s) => drawLantern(g, cx, y, s);
  if (!words) { lantern(h*.5, m*.22); return done(sheet); }
  lantern(h*.25, m*.13);
  let y = h*.43;
  if (words.ch) {
    g.fillStyle = plum; g.font = `900 ${Math.round(m*.045)}px Nunito, sans-serif`; g.textAlign = 'center'; g.textBaseline = 'middle';
    if ('letterSpacing' in g) g.letterSpacing = `${Math.round(m*.008)}px`;
    g.fillText(words.ch.toUpperCase(), cx, y); if ('letterSpacing' in g) g.letterSpacing = '0px';
    y += m*.09;
  }
  const size = Math.round(Math.min(w*.13, m*.135));
  g.fillStyle = '#1a1320'; g.font = `700 ${size}px Caprasimo, Georgia, serif`; g.textAlign = 'center'; g.textBaseline = 'middle';
  for (const line of wrap(g, words.title, w*.74)) { g.fillText(line, cx, y + size*.15); y += size*1.12; }
  // a flourish under the title: two fine rules either side of a diamond
  y += m*.01; g.strokeStyle = gold; g.fillStyle = gold; g.lineWidth = m*.004;
  for (const s of [-1, 1]) { g.beginPath(); g.moveTo(cx + s*m*.035, y); g.lineTo(cx + s*m*.17, y); g.stroke(); g.beginPath(); g.arc(cx + s*m*.19, y, m*.006, 0, 7); g.fill(); }
  g.beginPath(); g.moveTo(cx, y - m*.02); g.lineTo(cx + m*.02, y); g.lineTo(cx, y + m*.02); g.lineTo(cx - m*.02, y); g.closePath(); g.fill();
  if (words.sub) { y += m*.085; g.fillStyle = '#5a4a3c'; g.font = `800 ${Math.round(m*.052)}px Nunito, sans-serif`; g.fillText(words.sub, cx, y); }
  // how far down the page the words end, as a fraction of its height
  sheet.end = (y + m*.04)/h;
  return done(sheet);
}
function done(sheet){ sheet.t.needsUpdate = true; sb.renderer.initTexture(sheet.t); return sheet.t; }
function wrap(g, text, max){
  const lines = []; let line = '';
  for (const word of text.split(' ')) { const t = line ? line + ' ' + word : word; if (line && g.measureText(t).width > max) { lines.push(line); line = word; } else line = t; }
  return [...lines, line];
}
function drawLantern(g, x, y, s){
  const glow = g.createRadialGradient(x, y, 0, x, y, s*1.1); glow.addColorStop(0, 'rgba(255,200,90,.55)'); glow.addColorStop(1, 'rgba(255,200,90,0)');
  g.fillStyle = glow; g.fillRect(x - s*1.2, y - s*1.2, s*2.4, s*2.4);
  g.lineWidth = s*.06; g.strokeStyle = '#1a1320'; g.lineJoin = 'round';
  g.beginPath(); g.arc(x, y - s*.62, s*.1, 0, 7); g.stroke();
  const body = (fill, path) => { g.fillStyle = fill; g.beginPath(); path(); g.fill(); g.stroke(); };
  body('#6d3b5e', () => { g.moveTo(x - s*.18, y - s*.52); g.lineTo(x + s*.18, y - s*.52); g.lineTo(x + s*.3, y - s*.36); g.lineTo(x - s*.3, y - s*.36); g.closePath(); });
  body('#ffd27a', () => { g.moveTo(x - s*.24, y - s*.36); g.lineTo(x + s*.24, y - s*.36); g.lineTo(x + s*.2, y + s*.3); g.lineTo(x - s*.2, y + s*.3); g.closePath(); });
  g.fillStyle = '#fff3c4'; g.beginPath(); g.ellipse(x, y + s*.02, s*.07, s*.13, 0, 0, 7); g.fill();
  g.beginPath(); g.moveTo(x, y - s*.36); g.lineTo(x, y + s*.3); g.stroke();
  body('#6d3b5e', () => { g.rect(x - s*.28, y + s*.3, s*.56, s*.12); });
}

// t = 0: the right-hand page exactly fills the screen (the page is shaped like the screen);
// t = 1: pulled back to the whole open book, tipped toward the reader's corner, the lamplight round it
const at = new THREE.Vector3();
function pose(t, y, yaw = 0){
  const cam = sb.camera, W = sb.W, H = sb.H, tan = Math.tan(cam.fov*Math.PI/360), M = .5;
  const near = H/2/tan, far = Math.max(near*1.4, (H + M)/2/tan, (2*W + M)/2/tan/cam.aspect*1.2), d = near + (far - near)*t, a = TILT*t, yw = YAW + yaw;
  at.set(W/2*(1 - .8*t), y - .2*t, H*.06*t);
  cam.position.set(at.x + d*Math.sin(a)*Math.sin(yw), at.y + d*Math.cos(a), at.z + d*Math.sin(a)*Math.cos(yw)); cam.up.set(0, 0, -1); cam.lookAt(at);
  sb.setShade(t); fx.set(t);
}
// frames for ms, each handed the time since the start and the frame's dt in seconds
const play = (ms, fn) => new Promise(done => {
  let t0 = null, last = 0;
  const step = now => {
    if (t0 === null) t0 = last = now;
    const e = ms > 0 ? Math.min(ms, now - t0) : ms, dt = Math.min(.05, (now - last)/1000); last = now;
    fx.tick(dt); fn(e, dt); sb.render();
    if (e < ms) requestAnimationFrame(step); else done();
  };
  requestAnimationFrame(step);
});
const reduced = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
const lerp = (a, b, k) => a + (b - a)*k;

// freeze the world and put `from` on the right-hand page, drawn before it shows so nothing flickers;
// the left-hand page and the leaf's back are printed now, so no printing interrupts the turn
function open(from, t, ghost, left, next, clockAt = 0){
  game.cutscene = true; game.activity = 'storybook'; root.classList.add('turning'); bannerEl.hidden = true;
  const b = book(); fx.tick(0, clockAt);
  b.turnPage(from, print(sheets[1], next, ghost)); b.setPages(print(sheets[0], left), b.paper); b.curl(0); pose(t, b.turnY()); b.render(); cv.hidden = false;
}
function pullBack(){
  const amp = reduced() ? 0 : 1, y = sb.turnY();
  return play(amp ? 650 : 0, e => pose(ease(e/650)*amp, y)).then(() => amp);
}
// turn from the open book (pulled back by t) to the live world, then hand the screen back to it
async function turnTo(t, chime){
  // the page underneath shows the world as the play loop is about to draw it
  drawWorld(); sb.setPages(sheets[0].t, shoot(1));
  if (reduced()) {
    // no motion: the book dissolves straight into the world drawn beneath it
    await play(320, e => { cv.style.opacity = 1 - e/320; });
  } else {
    // the corner lifts with a crinkle, the leaf swishes over and lands with a soft pat
    Sound.hiss({dur:.16, vol:.05, type:'highpass', freq:3800}); Sound.hiss({t:.12, dur:.18, vol:.03, type:'highpass', freq:5200});
    Sound.hiss({t:.22, dur:.6, vol:.1, type:'bandpass', freq:700, f2:2800, q:.8, attack:.28});
    Sound.hiss({t:LAND/1000 - .03, dur:.14, vol:.12, type:'lowpass', freq:520}); Sound.tone(120, {t:LAND/1000 - .03, dur:.14, vol:.07, f2:70});
    if (chime) chime();
    const y0 = sb.turnY(), y1 = sb.pageY(1);
    await play(DIVE + DIVE_MS, (e, dt) => {
      // slow off the page as the corner lifts, quickest over the top, easing down onto the left
      const u = Math.min(1, e/LAND), s = Math.pow(u, 1.15), dive = ease(Math.max(0, (e - DIVE)/DIVE_MS));
      sb.curl(s*s*(3 - 2*s), dt);
      // the camera leans in a little as the leaf turns, then dives into the page it uncovered
      const k = t*(1 - .07*ease(u))*(1 - dive);
      pose(k, lerp(y0, y1, dive), -.06*ease(u));
    });
  }
  // the exact full-page frame was just drawn; let it reach the screen before swapping in the world
  await new Promise(requestAnimationFrame);
  cv.hidden = true; cv.style.opacity = ''; root.classList.remove('turning'); sb.settle();
  game.activity = null; clock.getDelta(); game.cutscene = !!game.cutCam;
}
const tripChime = () => [523, 659, 784, 1047].forEach((f, i) => Sound.tone(f, {type:'triangle', t:.3 + i*.13 + (i > 2 ? .35 : 0), dur:i > 2 ? .9 : .4, vol:i > 2 ? .045 : .04}));

// mid() builds and enters the next world while the book is open; after() runs once it is live.
// chapter is [heading, title], printed on the back of the leaf as it turns.
export async function pageTurn(mid, after, chapter){
  renderer.render(game.world.scene, camera); const from = shoot(0);
  game.cutscene = true; await fonts();
  open(from, 0, shots[0].c, null, chapter ? {ch:chapter[0], title:chapter[1]} : null);
  const t = await pullBack();
  if (mid) mid();
  await turnTo(t, tripChime);
  if (chapter) showBanner(chapter[0], chapter[1]);
  if (after) after();
}

// Old page, before reloading into a new version: pull back from the game to the book, printed with
// what is happening, and save that frame for the new page. Resolves once it is saved; the screen
// stays on the book until the reload.
export async function turnOut(){
  renderer.render(game.world.scene, camera); const from = shoot(0);
  game.cutscene = true; await fonts();
  open(from, 0, shots[0].c, UPDATING, UPDATED); Sound.updateOut();
  const held = new Promise(r => setTimeout(r, HOLD));
  const t = await pullBack();
  sb.render(); const bookFrame = cv.toDataURL('image/jpeg', .95);
  // the ink dots sit under the words on the left-hand page, wherever the camera put it on screen
  const dot = new THREE.Vector3(-sb.W/2, sb.pageY(-1), sb.H*(sheets[0].end + .05 - .5)).project(sb.camera), dots = [(dot.x + 1)*50, (1 - dot.y)*50];
  inkDots(dots);
  try { sessionStorage.setItem(STASH, JSON.stringify({at: Date.now(), out: t, clock: fx.clock, dots, book: bookFrame, page: shots[0].c.toDataURL('image/jpeg', .95)})); }
  catch (e) {}   // too big to save: the new page simply starts without a turn
  await held;
}
function inkDots([x, y]){ noteEl.style.left = x + '%'; noteEl.style.top = y + '%'; noteEl.className = ''; noteEl.hidden = false; }
// New page, once the world is built and running: if the old page saved a book frame (and index.html
// is still showing it), take over from it and turn into the live world. Resolves true if it turned.
export async function turnIn(){
  if (stashEl.hidden) return false;
  let s = null; try { s = JSON.parse(sessionStorage.getItem(STASH)); sessionStorage.removeItem(STASH); } catch (e) {}
  if (!s) { stashEl.hidden = noteEl.hidden = true; root.classList.remove('turning'); return false; }
  const img = new Image(); img.src = s.page; try { await img.decode(); } catch (e) {}
  await fonts();
  const from = frameTex(new THREE.Texture(img)); from.needsUpdate = true;
  open(from, s.out, img, UPDATING, UPDATED, s.clock || 0); stashEl.hidden = true; stashEl.removeAttribute('src');
  Sound.init();
  noteEl.classList.add('leaving');
  await turnTo(s.out, () => { if (Sound.running()) Sound.updateIn(); }); from.dispose();
  noteEl.hidden = true; noteEl.className = '';
  return true;
}

function showBanner(ch, title){
  $('bnCh').textContent = ch; $('bnT').textContent = title;
  bannerEl.hidden = true; void bannerEl.offsetWidth; bannerEl.hidden = false;
  clearTimeout(showBanner.t); showBanner.t = setTimeout(() => { bannerEl.hidden = true; }, 3400);
}
