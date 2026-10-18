// The Library Nook reader: a 3D book whose pages curl as they turn, plus a shelf of every book.
// Loaded the first time someone sits down in the story corner.

import * as THREE from 'three';
import { ease } from '../core/kit.js';
import { Sound } from '../core/sound.js';
import { keys } from '../input.js';
import { clock } from '../play.js';
import { makeStorybook } from '../props/storybook.js';
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
// the book lies open on a desk, on a small three.js stage of its own
let S = null;
const stage = () => S || (S = makeStorybook(cv));
const loader = new THREE.TextureLoader(), texCache = new Map();
function pageTex(book, i) {
  if (i < 0 || i >= book.pages) return stage().paper;
  const k = book.id + ':' + i;
  if (!texCache.has(k)) { const t = loader.load(book.dir + 'p' + String(i + 1).padStart(3, '0') + '.jpg'); t.encoding = THREE.sRGBEncoding; t.anisotropy = 4; texCache.set(k, t); }
  return texCache.get(k);
}
let book = null, spread = 0, flip = null;
// pages: the first two are the front cover's outside and inside, the last two the back cover's inside and
// outside. Spread 0 is the book closed on its front cover and the last spread closed on its back; spread k
// between shows pages 2k-1 (left) and 2k (right)
const spreads = () => Math.floor(book.pages / 2) + 1;
// a page printed on the paper between the covers (the covers' own pages are printed on the boards)
const leaf = i => i >= 2 && i < book.pages - 2 ? pageTex(book, i) : null;
function setFlat() {
  const last = spreads() - 1, L = 2 * spread - 1, Rr = 2 * spread;
  // the stacks follow progress through the book, leaf by leaf; the inside covers lie on the bare boards
  const f = Math.max(0, Math.min(1, (spread - 1) / ((book.pages - 4) / 2)));
  S.setBoards(spread > 0 ? 1 : 0, spread < last ? 0 : 1); S.setStacks(f, 1 - f); S.setPages(leaf(L), leaf(Rr));
  $r('rPg').textContent = spread === 0 ? 'Cover' : spread === last ? 'Back cover' : `${L + 1}–${Rr + 1} / ${book.pages}`;
  $r('rPrev').disabled = spread === 0; $r('rNext').disabled = spread >= last;
  // remember every page seen; finishing the last spread marks the book as read
  const st = state[book.id] = state[book.id] || { seen: [], read: false };
  for (const i of [L, Rr]) if (i >= 0 && i < book.pages && !st.seen.includes(i)) st.seen.push(i);
  if (!st.read && spread >= last) { st.read = true; st.at = new Date().toISOString(); celebrate(); }
  saveState();
}
function celebrate() {
  const d = $r('rDone'); d.innerHTML = `You read the whole book!<small>${book.title} added to your reading list</small>`; d.style.opacity = 1;
  [523, 659, 784, 1046].forEach((f, i) => Sound.tone(f, { type: 'triangle', t: i * .09, dur: .3, vol: .08 }));
  setTimeout(() => { d.style.opacity = 0; }, 3200);
}
function turn(dir) {
  if (!book || flip) return;
  const last = spreads() - 1, to = spread + dir;
  if (to < 0 || to > last) return;
  const L = 2 * spread - 1, Rr = 2 * spread;
  // a cover swings over as a stiff board, onto or off the first or last spread of pages
  const board = Math.min(spread, to) === 0 ? 0 : Math.max(spread, to) === last ? 1 : null;
  if (board !== null) { const k = board ? last - 1 : 1; S.setPages(leaf(2 * k - 1), leaf(2 * k)); }
  // the turning page carries one page image on each face; the page it uncovers is already in place beneath
  else if (dir > 0) { S.turnPage(pageTex(book, Rr), pageTex(book, Rr + 1)); S.setPages(leaf(L), leaf(Rr + 2)); S.curl(0, 1); }
  else { S.turnPage(pageTex(book, L - 1), pageTex(book, L)); S.setPages(leaf(L - 2), leaf(Rr)); S.curl(1, -1); }
  flip = { dir, board, t: 0 };
  Sound.tone(dir > 0 ? 700 : 620, { type: 'triangle', dur: .05, vol: .04 }); Sound.tone(1400, { type: 'sine', t: .05, dur: .08, vol: .02 });
}
let raf = 0, last = 0;
function loop(ts) {
  if (game.activity !== 'book') return;
  const dt = Math.min(.05, (ts - last) / 1000 || 0); last = ts;
  stage(); const r = cv.getBoundingClientRect();
  if (cv.width !== Math.round(r.width * S.renderer.getPixelRatio())) S.resize(r.width, r.height);
  if (book) {
    if (flip) {
      flip.t = Math.min(1, flip.t + dt / (flip.board === null ? .6 : .8)); const e = ease(flip.t), p = flip.dir > 0 ? e : 1 - e;
      if (flip.board === 0) S.setBoards(p, 0); else if (flip.board === 1) S.setBoards(1, p); else S.curl(p, flip.dir);
      if (flip.t >= 1) { spread += flip.dir; flip = null; S.settle(); setFlat(); }
    }
    // frame the book, open or closed, so it fills the screen in portrait or landscape
    const [x0, x1] = S.extent(), mx = (x0 + x1) / 2, asp = S.camera.aspect, w = x1 - x0 + .4, h = S.H + 2 * S.MARGIN + .4, fov = S.camera.fov * Math.PI / 180;
    const dist = Math.max(h / 2 / Math.tan(fov / 2), w / 2 / Math.tan(fov / 2) / asp) * 1.04;
    S.camera.position.set(mx, dist * .97, dist * .26); S.camera.lookAt(mx, .3, .05);
  }
  S.render();
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
  stage().setAspect(b.aspect); S.setShade(1); spread = 0;
  S.setCovers([pageTex(b, 0), pageTex(b, 1)], [pageTex(b, b.pages - 1), pageTex(b, b.pages - 2)]); setFlat();
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
