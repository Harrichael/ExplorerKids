// The Library Nook reader: a 3D book whose pages curl as they turn, plus a shelf of every book.
// Loaded the first time someone sits down in the story corner.

import * as THREE from 'three';
import { C, T, tex } from '../core/kit.js';
import { Sound } from '../core/sound.js';
import { keys } from '../input.js';
import { clock } from '../play.js';
import { load, save } from '../save.js';
import { game } from '../state.js';
import { closeDialog } from '../ui/dialogue.js';
import { BOOKS } from './books.js';

const saved = load('books'), state = saved && typeof saved === 'object' ? saved : {};
const saveState = () => save('books', state);
const css = document.createElement('style');
css.textContent = `
.reading-book #world,.reading-book .vignette,.reading-book .hud,.reading-book #stick,.reading-book #talk,.reading-book #use,.reading-book #prompt,.reading-book #dialog{display:none!important}
#reader{position:fixed;inset:0;background:radial-gradient(ellipse at 50% 30%,#4a3346,#221c33 75%);display:flex;flex-direction:column;touch-action:none;padding-top:env(safe-area-inset-top,0px);padding-bottom:env(safe-area-inset-bottom,0px)}
#reader header{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:10px max(16px,env(safe-area-inset-left,0px)) 4px}
#reader h2{margin:0;font-family:var(--display);font-weight:400;font-size:clamp(19px,4.6vw,26px);color:var(--parch);line-height:1.1}
#reader .sub{font-size:12px;font-weight:900;letter-spacing:1.1px;text-transform:uppercase;color:var(--gold)}
#rcv{flex:1;min-height:0;width:100%;display:block}
#reader .rbar{display:flex;gap:10px;justify-content:center;align-items:center;padding:6px 16px 12px;flex:none}
#reader .rb{font-family:var(--display);font-size:17px;color:var(--parch);background:var(--plum);border:2.5px solid var(--gold);border-radius:14px;padding:8px 16px;box-shadow:0 0 0 3px var(--ink);cursor:pointer;min-width:52px}
#reader .rb.ghost{background:rgba(239,224,191,.08)}
#reader .rb:disabled{opacity:.35;cursor:default}
#reader .rb:focus-visible,#shelf .bk:focus-visible{outline:3px solid var(--parch);outline-offset:3px}
#reader .pg{font-weight:900;color:var(--parch);font-variant-numeric:tabular-nums;min-width:96px;text-align:center}
#reader .done{position:absolute;left:50%;top:18%;transform:translateX(-50%);font-family:var(--display);font-size:clamp(24px,6vw,38px);color:var(--parch);text-shadow:0 3px 0 var(--ink),0 0 24px rgba(217,164,65,.6);pointer-events:none;text-align:center;opacity:0;transition:opacity .4s}
#reader .done small{display:block;font-family:var(--body);font-size:15px;font-weight:900;color:var(--gold)}
#reader .credit{font-size:11px;font-weight:700;color:rgba(239,224,191,.55);text-align:center;padding:0 16px 6px}
#shelf{position:absolute;inset:auto 0 0 0;top:64px;overflow-y:auto;padding:12px max(16px,env(safe-area-inset-left,0px)) 24px;display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:16px;align-content:start}
#shelf .bk{position:relative;background:#f6ecd6;color:#1a1320;border:3px solid var(--gold);border-radius:12px;box-shadow:0 0 0 4px var(--ink),0 10px 24px rgba(0,0,0,.4);padding:0;cursor:pointer;text-align:left;font:inherit;overflow:hidden}
#shelf .bk img{display:block;width:100%;aspect-ratio:3/4;object-fit:cover;background:#6d3b5e}
#shelf .bk span{display:block;padding:8px 10px 10px;font-weight:900;font-size:14px;line-height:1.25}
#shelf .bk em{display:block;font-style:normal;font-weight:800;font-size:12px;color:#6d3b5e;margin-top:2px}
#shelf .ribbon{position:absolute;top:8px;right:-30px;transform:rotate(35deg);background:var(--gold);color:#1a1320;font-weight:900;font-size:12px;padding:3px 34px;box-shadow:0 2px 0 var(--ink)}`;
document.head.appendChild(css);
const el = document.createElement('div'); el.id = 'reader'; el.hidden = true; el.setAttribute('role', 'dialog'); el.setAttribute('aria-label', 'Library book');
el.innerHTML = `<header><div><div class="sub" id="rSub">Library Nook</div><h2 id="rTitle">Pick a book</h2></div><button class="rb ghost" id="rClose">Close</button></header>
  <canvas id="rcv"></canvas><div class="done" id="rDone"></div>
  <div class="credit" id="rCredit"></div>
  <div class="rbar"><button class="rb" id="rPrev" aria-label="Previous page">◀</button><span class="pg" id="rPg"></span><button class="rb" id="rNext" aria-label="Next page">▶</button><button class="rb ghost" id="rShelf">Bookshelf</button></div>
  <div id="shelf" hidden></div>`;
document.body.appendChild(el);
const cv = el.querySelector('#rcv'), shelfEl = el.querySelector('#shelf'), $r = id => el.querySelector('#' + id);
// a small three.js stage of its own: the book lying open on a wooden reading table
let R3 = null;
function stage() {
  if (R3) return R3;
  const renderer = new THREE.WebGLRenderer({ canvas: cv, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2)); renderer.outputEncoding = THREE.sRGBEncoding;
  const scene = new THREE.Scene(), cam = new THREE.PerspectiveCamera(32, 1, .1, 50);
  scene.add(new THREE.HemisphereLight(0xfff2dd, 0x5a3a50, .9));
  const key = new THREE.DirectionalLight(0xffe2bf, .55); key.position.set(-2, 5, 3); scene.add(key);
  const table = new THREE.Mesh(new THREE.BoxGeometry(9, .2, 6), T(C.wood)); table.position.y = -.12; scene.add(table);
  const group = new THREE.Group(); scene.add(group);
  R3 = { renderer, scene, cam, group, tex: new Map() };
  return R3;
}
const loader = new THREE.TextureLoader();
function pageTex(book, i) {
  const S = stage(), k = book.id + ':' + i;
  if (S.tex.has(k)) return S.tex.get(k);
  let t;
  if (i < 0 || i >= book.pages) { t = blankTex(); }
  else { t = loader.load(book.dir + 'p' + String(i + 1).padStart(3, '0') + '.jpg'); t.encoding = THREE.sRGBEncoding; t.anisotropy = 4; }
  S.tex.set(k, t); return t;
}
let _blank = null;
function blankTex() { if (_blank) return _blank; _blank = tex(64, 64, (g, w, h) => { g.fillStyle = '#f3e7cf'; g.fillRect(0, 0, w, h); }); return _blank; }
// book geometry: two cover boards, page stacks, two resting pages and one page that flips
let book = null, spread = 0, flip = null, PW = 2, PH = 2.6, meshes = null;
const SEG = 28;
function pageGeo() { const g = new THREE.PlaneGeometry(PW, PH, SEG, 1); g.rotateX(-Math.PI / 2); g.translate(PW / 2, 0, 0); g.userData.base = g.attributes.position.array.slice(); return g; }
function build() {
  const S = stage(); while (S.group.children.length) S.group.remove(S.group.children[0]);
  PH = 2.7; PW = PH * book.aspect;
  const board = T(0x6d3b5e), edge = T(0xf1e4c8);
  for (const sd of [-1, 1]) { const cvb = new THREE.Mesh(new THREE.BoxGeometry(PW + .12, .05, PH + .14), board); cvb.position.set(sd * (PW / 2 + .03), 0, 0); S.group.add(cvb); }
  const spine = new THREE.Mesh(new THREE.CylinderGeometry(.08, .08, PH + .14, 10, 1, false, 0, Math.PI), board); spine.rotation.set(Math.PI / 2, 0, Math.PI); spine.position.y = .0; S.group.add(spine);
  const stackL = new THREE.Mesh(new THREE.BoxGeometry(PW, .1, PH), edge), stackR = stackL.clone(); S.group.add(stackL, stackR);
  const mk = (side) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(PW, PH), new THREE.MeshBasicMaterial({ map: blankTex() })); m.rotation.x = -Math.PI / 2; m.position.set(side * PW / 2, .13, 0); S.group.add(m); return m; };
  const left = mk(-1), right = mk(1);
  const g = pageGeo(), front = new THREE.Mesh(g, new THREE.MeshBasicMaterial({ map: blankTex(), side: THREE.FrontSide })), back = new THREE.Mesh(g, new THREE.MeshBasicMaterial({ map: blankTex(), side: THREE.BackSide }));
  front.position.y = back.position.y = .14; front.visible = back.visible = false; S.group.add(front, back);
  meshes = { left, right, front, back, g, stackL, stackR };
}
// page bends as it turns: angle grows along the page, most curl mid-turn
function bend(p, dir) {
  const g = meshes.g, a = g.attributes.position.array, base = g.userData.base, n = SEG + 1;
  const xs = [], ys = []; let x = 0, y = 0;
  for (let i = 0; i < n; i++) { const s = i / SEG, ang = p * Math.PI + Math.sin(p * Math.PI) * .55 * s * (dir > 0 ? -1 : 1) * -1; if (i) { x += Math.cos(ang) * PW / SEG; y += Math.sin(ang) * PW / SEG; } xs.push(x); ys.push(y); }
  for (let v = 0; v < a.length / 3; v++) { const i = Math.round(base[v * 3] / PW * SEG); a[v * 3] = xs[i]; a[v * 3 + 1] = ys[i] + base[v * 3 + 1]; a[v * 3 + 2] = base[v * 3 + 2]; }
  g.attributes.position.needsUpdate = true; g.computeBoundingSphere();
}
// pages: index 0 is the cover, shown alone on the right; spread k shows pages 2k-1 (left) and 2k (right)
const spreads = () => Math.floor(book.pages / 2) + 1;
function setFlat() {
  const L = 2 * spread - 1, Rr = 2 * spread;
  meshes.left.visible = L >= 0; meshes.right.visible = Rr < book.pages;
  meshes.left.material.map = pageTex(book, L); meshes.right.material.map = pageTex(book, Rr);
  meshes.left.material.needsUpdate = meshes.right.material.needsUpdate = true;
  const frac = book.pages ? spread / (spreads() - 1) : 0;
  meshes.stackL.scale.y = .2 + frac * .8; meshes.stackR.scale.y = .2 + (1 - frac) * .8;   // page stacks stay under the open pages
  meshes.stackL.position.set(-PW / 2, .02 + .05 * meshes.stackL.scale.y, 0); meshes.stackR.position.set(PW / 2, .02 + .05 * meshes.stackR.scale.y, 0);
  meshes.stackL.visible = spread > 0;
  $r('rPg').textContent = book.pages ? (spread === 0 ? 'Cover' : `${L + 1}–${Math.min(Rr + 1, book.pages)} / ${book.pages}`) : '';
  $r('rPrev').disabled = spread === 0; $r('rNext').disabled = spread >= spreads() - 1;
  // remember every page seen; finishing the last spread marks the book as read
  const st = state[book.id] = state[book.id] || { seen: [], read: false };
  for (const i of [L, Rr]) if (i >= 0 && i < book.pages && !st.seen.includes(i)) st.seen.push(i);
  if (!st.read && spread >= spreads() - 1 && book.pages) { st.read = true; st.at = new Date().toISOString(); celebrate(); }
  saveState();
}
function celebrate() {
  const d = $r('rDone'); d.innerHTML = `You read the whole book!<small>${book.title} added to your reading list</small>`; d.style.opacity = 1;
  [523, 659, 784, 1046].forEach((f, i) => Sound.tone(f, { type: 'triangle', t: i * .09, dur: .3, vol: .08 }));
  setTimeout(() => { d.style.opacity = 0; }, 3200);
}
function turn(dir) {
  if (!book || flip) return;
  if (dir > 0 && spread >= spreads() - 1) return; if (dir < 0 && spread <= 0) return;
  const L = 2 * spread - 1, Rr = 2 * spread;
  // the turning page carries one page image on each face
  if (dir > 0) { meshes.front.material.map = pageTex(book, Rr); meshes.back.material.map = flipTex(pageTex(book, Rr + 1)); meshes.right.material.map = pageTex(book, Rr + 2); meshes.right.visible = Rr + 2 < book.pages; }
  else { meshes.front.material.map = pageTex(book, L - 1); meshes.back.material.map = flipTex(pageTex(book, L)); meshes.left.material.map = pageTex(book, L - 2); meshes.left.visible = L - 2 >= 0; }
  for (const k of ['front', 'back', 'left', 'right']) meshes[k].material.needsUpdate = true;
  meshes.front.visible = meshes.back.visible = true; flip = { dir, t: 0 };
  Sound.tone(dir > 0 ? 700 : 620, { type: 'triangle', dur: .05, vol: .04 }); Sound.tone(1400, { type: 'sine', t: .05, dur: .08, vol: .02 });
}
const flipCache = new Map();
function flipTex(t) { if (flipCache.has(t)) return flipCache.get(t); const c = t.clone(); c.wrapS = THREE.RepeatWrapping; c.repeat.x = -1; c.offset.x = 1; c.needsUpdate = true; if (t.image && !t.image.complete) t.image.addEventListener('load', () => { c.needsUpdate = true; }); flipCache.set(t, c); return c; }
let raf = 0, last = 0;
function loop(ts) {
  if (game.activity !== 'book') return;
  const dt = Math.min(.05, (ts - last) / 1000 || 0); last = ts;
  const S = stage(), r = cv.getBoundingClientRect();
  if (cv.width !== Math.round(r.width * S.renderer.getPixelRatio())) { S.renderer.setSize(r.width, r.height, false); S.cam.aspect = r.width / r.height; S.cam.updateProjectionMatrix(); }
  if (book && meshes) {
    if (flip) {
      flip.t = Math.min(1, flip.t + dt / .6); const e = flip.t < .5 ? 2 * flip.t * flip.t : 1 - Math.pow(-2 * flip.t + 2, 2) / 2;
      if (flip.dir > 0) { bend(e, 1); meshes.front.rotation.y = 0; meshes.back.rotation.y = 0; }
      else { bend(1 - e, -1); }
      if (flip.t >= 1) { spread += flip.dir; flip = null; meshes.front.visible = meshes.back.visible = false; setFlat(); }
    }
    // frame the open book so it fills the screen in portrait or landscape
    const asp = S.cam.aspect, w = PW * 2 + .4, h = PH + .4, fov = S.cam.fov * Math.PI / 180;
    const dist = Math.max(h / 2 / Math.tan(fov / 2), w / 2 / Math.tan(fov / 2) / asp) * 1.04;
    S.cam.position.set(0, dist * .97, dist * .26); S.cam.lookAt(0, 0, .05);
    S.group.position.x = spread === 0 && !flip ? -PW / 2 * Math.min(1, 1.4 / asp) * 0 : 0;
  }
  S.renderer.render(S.scene, S.cam);
  raf = requestAnimationFrame(loop);
}
function showShelf() {
  book = null; flip = null; shelfEl.hidden = false; cv.style.visibility = 'hidden';
  $r('rTitle').textContent = 'Pick a book'; $r('rSub').textContent = 'Library Nook'; $r('rCredit').textContent = ''; el.querySelector('.rbar').style.visibility = 'hidden';
  shelfEl.innerHTML = '';
  for (const b of BOOKS) {
    const st = state[b.id] || { seen: [] }, btn = document.createElement('button'); btn.className = 'bk';
    const pct = b.pages ? Math.round(100 * (st.seen || []).length / b.pages) : 0;
    btn.innerHTML = `${st.read ? '<i class="ribbon">Read ⭐</i>' : ''}<img alt="" src="${b.pages ? b.dir + 'p001.jpg' : ''}"><span>${b.title}<em>${b.pages ? (st.read ? 'Finished' : pct ? pct + '% read' : 'Not started yet') : 'Coming soon'}</em></span>`;
    btn.addEventListener('click', () => { if (b.pages) openBook(b); });
    shelfEl.append(btn);
  }
}
function openBook(b) {
  book = b; shelfEl.hidden = true; cv.style.visibility = ''; el.querySelector('.rbar').style.visibility = '';
  $r('rTitle').textContent = b.title; $r('rSub').textContent = b.sub; $r('rCredit').textContent = b.credit || '';
  stage(); build(); spread = 0; setFlat();
  // warm the next few pages so flipping feels instant
  for (let i = 0; i < Math.min(6, b.pages); i++) pageTex(b, i);
}
// swipe or tap a side of the book to turn
let sx = null;
cv.addEventListener('pointerdown', e => { sx = e.clientX; });
cv.addEventListener('pointerup', e => { if (sx === null) return; const dx = e.clientX - sx; sx = null; Sound.init();
  if (Math.abs(dx) > 30) turn(dx < 0 ? 1 : -1); else { const r = cv.getBoundingClientRect(); turn(e.clientX > r.left + r.width / 2 ? 1 : -1); } });
$r('rPrev').addEventListener('click', () => turn(-1)); $r('rNext').addEventListener('click', () => turn(1));
$r('rShelf').addEventListener('click', showShelf); $r('rClose').addEventListener('click', () => close());
export function openReader() {
  if (game.activity) return; closeDialog(); game.activity = 'book'; for (const k in keys) keys[k] = false;
  document.documentElement.classList.add('reading-book'); el.hidden = false;
  Sound.duck(true); Sound.tone(660, { type: 'triangle', dur: .15, vol: .07 });
  const ready = BOOKS.filter(b => b.pages); if (ready.length === 1) openBook(ready[0]); else showShelf();
  last = performance.now(); raf = requestAnimationFrame(loop);
}
function close() {
  if (game.activity !== 'book') return; game.activity = null; el.hidden = true; document.documentElement.classList.remove('reading-book'); cancelAnimationFrame(raf);
  Sound.duck(false); clock.getDelta();
}
function key(e) {
  if (e.key === 'Escape') { close(); return; }
  if (e.key === 'ArrowRight' || e.key === ' ') { e.preventDefault(); turn(1); }
  if (e.key === 'ArrowLeft') { e.preventDefault(); turn(-1); }
}
addEventListener('keydown', e => { if (game.activity !== 'book') return; e.stopPropagation(); key(e); }, true);
