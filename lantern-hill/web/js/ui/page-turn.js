// ---------- page turns: the screen becomes a page in a storybook, and the page turns to the next scene ----------
// The camera pulls back a little to show the page lying in a thick book on a desk, the page turns,
// and the camera settles onto the next page until it fills the screen again. Both ends match the
// game pixel for pixel, so the world seems to become a page and the next page to become the world.
//
// A turn can also span a page reload (a new version of the game): turnOut() on the old page stops
// on the book and saves that frame, the inline script at the end of index.html paints it before
// the new page has built anything, and turnIn() on the new page turns from it into the live world.

import * as THREE from 'three';
import { ease } from '../core/kit.js';
import { camera, canvas, renderer } from '../core/render.js';
import { Sound } from '../core/sound.js';
import { clock, drawWorld } from '../play.js';
import { makeStorybook } from '../props/storybook.js';
import { game } from '../state.js';
import { $ } from './dom.js';

const STASH = 'lanternHill.turn';   // the inline script in index.html reads this key too
const cv = $('storybook'), stashEl = $('storyStash'), bannerEl = $('banner'), root = document.documentElement;
const OUT = 1.75, TILT = .8, YAW = .4;
let sb = null;

// the two game frames printed in the book: the one we leave and the one we turn to
const shots = [0, 1].map(() => { const c = document.createElement('canvas'); return {c, t: frameTex(new THREE.CanvasTexture(c))}; });
function frameTex(t){ t.encoding = THREE.sRGBEncoding; t.minFilter = THREE.LinearFilter; t.generateMipmaps = false; return t; }
function shoot(i){ const s = shots[i]; s.c.width = canvas.width; s.c.height = canvas.height; s.c.getContext('2d').drawImage(canvas, 0, 0); s.t.needsUpdate = true; return s.t; }

function book(){
  if (!sb) sb = makeStorybook(cv);
  sb.renderer.setPixelRatio(renderer.getPixelRatio()); sb.resize(innerWidth, innerHeight); sb.setAspect(innerWidth/innerHeight);
  sb.setStacks(.7, .78); sb.setPages(sb.paper, sb.paper); sb.settle();
  return sb;
}
// t = 0: the right-hand page exactly fills the screen (the page is shaped like the screen);
// t = 1: pulled back and tilted toward the reader's corner, showing the book's thickness on the desk
const at = new THREE.Vector3();
function pose(t, y){
  const cam = sb.camera, W = sb.W, H = sb.H, d = H/2/Math.tan(cam.fov*Math.PI/360)*(1 + (OUT - 1)*t), a = TILT*t;
  at.set(W/2 - W*.12*t, y - .2*t, H*.05*t);
  cam.position.set(at.x + d*Math.sin(a)*Math.sin(YAW), at.y + d*Math.cos(a), at.z + d*Math.sin(a)*Math.cos(YAW)); cam.up.set(0, 0, -1); cam.lookAt(at);
}
const tween = (ms, fn) => new Promise(done => {
  let t0 = null;
  const step = now => { if (t0 === null) t0 = now; const p = ms > 0 ? Math.min(1, (now - t0)/ms) : 1; fn(p); sb.render(); if (p < 1) requestAnimationFrame(step); else done(); };
  requestAnimationFrame(step);
});
const reduced = () => matchMedia('(prefers-reduced-motion: reduce)').matches;

// freeze the world and put `from` on the right-hand page, drawn before it shows so nothing flickers
function open(from, t){
  game.cutscene = true; game.activity = 'storybook'; root.classList.add('turning'); bannerEl.hidden = true;
  const b = book(); b.turnPage(from, b.paper); b.curl(0); b.setShade(t); pose(t, b.turnY()); b.render(); cv.hidden = false;
}
function pullBack(){
  const amp = reduced() ? 0 : 1;
  return tween(amp ? 480 : 0, p => { const t = ease(p)*amp; pose(t, sb.turnY()); sb.setShade(t); }).then(() => amp);
}
// turn from the open book (pulled back by t) to the live world, then hand the screen back to it
async function turnTo(t){
  // the page underneath shows the world as the play loop is about to draw it
  drawWorld(); sb.setPages(sb.paper, shoot(1));
  if (reduced()) {
    // no motion: the book dissolves straight into the world drawn beneath it
    await tween(320, p => { cv.style.opacity = 1 - p; });
  } else {
    Sound.hiss({dur:.7, vol:.09, type:'bandpass', freq:2400, q:.7}); Sound.hiss({t:.5, dur:.3, vol:.06, type:'bandpass', freq:1400, q:.8});
    Sound.tone(523, {type:'triangle', t:.3, dur:.35, vol:.05}); Sound.tone(784, {type:'triangle', t:.5, dur:.45, vol:.05});
    await tween(900, p => sb.curl(ease(p), 1));
    await tween(520, p => { const k = t*(1 - ease(p)); pose(k, sb.pageY(1)); sb.setShade(k); });
  }
  // the exact full-page frame was just drawn; let it reach the screen before swapping in the world
  await new Promise(requestAnimationFrame);
  cv.hidden = true; cv.style.opacity = ''; root.classList.remove('turning'); sb.settle();
  game.activity = null; clock.getDelta(); game.cutscene = !!game.cutCam;
}

// mid() builds and enters the next world while the book is open; after() runs once it is live
export function pageTurn(mid, after, chapter){
  renderer.render(game.world.scene, camera); open(shoot(0), 0);
  pullBack().then(t => { if (mid) mid(); return turnTo(t); }).then(() => {
    if (chapter) showBanner(chapter[0], chapter[1]);
    if (after) after();
  });
}

// Old page, before reloading into a new version: pull back from the game to the book and save that
// frame for the new page. Resolves once it is saved; the screen stays on the book until the reload.
export async function turnOut(){
  renderer.render(game.world.scene, camera); open(shoot(0), 0);
  const t = await pullBack();
  sb.render(); const bookFrame = cv.toDataURL('image/jpeg', .95);
  try { sessionStorage.setItem(STASH, JSON.stringify({at: Date.now(), out: t, book: bookFrame, page: shots[0].c.toDataURL('image/jpeg', .95)})); }
  catch (e) {}   // too big to save: the new page simply starts without a turn
}
// New page, once the world is built and running: if the old page saved a book frame (and index.html
// is still showing it), take over from it and turn into the live world. Resolves true if it turned.
export async function turnIn(){
  if (stashEl.hidden) return false;
  let s = null; try { s = JSON.parse(sessionStorage.getItem(STASH)); sessionStorage.removeItem(STASH); } catch (e) {}
  if (!s) { stashEl.hidden = true; root.classList.remove('turning'); return false; }
  const img = new Image(); img.src = s.page; try { await img.decode(); } catch (e) {}
  const from = frameTex(new THREE.Texture(img)); from.needsUpdate = true;
  open(from, s.out); stashEl.hidden = true; stashEl.removeAttribute('src');
  await turnTo(s.out); from.dispose();
  return true;
}

function showBanner(ch, title){
  $('bnCh').textContent = ch; $('bnT').textContent = title;
  bannerEl.hidden = true; void bannerEl.offsetWidth; bannerEl.hidden = false;
  clearTimeout(showBanner.t); showBanner.t = setTimeout(() => { bannerEl.hidden = true; }, 3400);
}
