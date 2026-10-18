// The Library Nook reader: the explorer settles down with a storybook open in front of them, on their
// tummy on the reading rug or cross-legged in the window seat, and the camera looks down at the pages,
// which curl as they turn. Everything happens in the room itself. Loaded the first time someone reads
// a book from their backpack.

import * as THREE from 'three';
import { ease } from '../core/kit.js';
import { camera, renderer } from '../core/render.js';
import { Sound } from '../core/sound.js';
import { WINDOW_SEAT } from '../hq/cottage.js';
import { hqAnims, scene } from '../hq/scene.js';
import { sitDown, standUp } from '../hq/sit.js';
import { keys } from '../input.js';
import { hero } from '../player.js';
import { makeBook } from '../props/storybook.js';
import { load, save } from '../save.js';
import { game } from '../state.js';
import { closeDialog } from '../ui/dialogue.js';
import { BOOKS } from './books.js';

const saved = load('books'), state = saved && typeof saved === 'object' ? saved : {};
const saveState = () => save('books', state);
const css = document.createElement('style');
css.textContent = `
.reading-book .hud,.reading-book #stick,.reading-book #talk,.reading-book .use,.reading-book #prompt,.reading-book #dialog{display:none!important}
#reader{position:fixed;inset:0;display:flex;flex-direction:column;touch-action:none;padding-top:env(safe-area-inset-top,0px);padding-bottom:env(safe-area-inset-bottom,0px);animation:rfade .6s ease-out}
@keyframes rfade{from{opacity:0}}
#reader header{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:8px max(16px,env(safe-area-inset-left,0px)) 12px;background:linear-gradient(rgba(26,19,32,.75),rgba(26,19,32,0))}
#reader h2{margin:0;font-family:var(--display);font-weight:400;font-size:clamp(17px,4.2vw,24px);color:var(--parch);line-height:1.1;text-shadow:0 2px 0 var(--ink)}
#reader .sub{font-size:11px;font-weight:900;letter-spacing:1.1px;text-transform:uppercase;color:var(--gold);text-shadow:0 1px 0 var(--ink)}
#reader .rtop{display:flex;gap:8px;flex:none}
#reader .rspace{flex:1;min-height:0}
#reader .rfoot{text-align:center;padding:4px 16px 8px;background:linear-gradient(rgba(26,19,32,0),rgba(26,19,32,.7))}
#reader .rb{font-family:var(--display);font-size:16px;color:var(--parch);background:var(--plum);border:2.5px solid var(--gold);border-radius:14px;padding:7px 14px;box-shadow:0 0 0 3px var(--ink);cursor:pointer}
#reader .rb.ghost{background:rgba(26,19,32,.55)}
#reader .rb:disabled{opacity:.3;cursor:default}
#reader .side{position:absolute;top:50%;transform:translateY(-50%);width:54px;height:54px;padding:0;border-radius:50%;font-size:20px}
#reader .side.prev{left:max(10px,env(safe-area-inset-left,0px))}
#reader .side.next{right:max(10px,env(safe-area-inset-right,0px))}
@media (orientation:portrait){#reader .side{top:auto;bottom:calc(64px + env(safe-area-inset-bottom,0px));transform:none}}
#reader .rb:focus-visible{outline:3px solid var(--parch);outline-offset:3px}
#reader .pg{font-weight:900;font-size:14px;color:var(--parch);font-variant-numeric:tabular-nums;text-shadow:0 2px 0 var(--ink)}
#reader .credit{font-size:10px;font-weight:700;color:rgba(239,224,191,.7);text-shadow:0 1px 0 var(--ink);line-height:1.3}
#reader .done{position:absolute;left:50%;top:18%;transform:translateX(-50%);font-family:var(--display);font-size:clamp(24px,6vw,38px);color:var(--parch);text-shadow:0 3px 0 var(--ink),0 0 24px rgba(217,164,65,.6);pointer-events:none;text-align:center;opacity:0;transition:opacity .4s}
#reader .done small{display:block;font-family:var(--body);font-size:15px;font-weight:900;color:var(--gold)}`;
document.head.appendChild(css);
const el = document.createElement('div'); el.id = 'reader'; el.hidden = true; el.setAttribute('role', 'dialog'); el.setAttribute('aria-label', 'Library book');
el.innerHTML = `<header><div><div class="sub" id="rSub">Library Nook</div><h2 id="rTitle"></h2></div>
    <div class="rtop"><button class="rb ghost" id="rClose">Close</button></div></header>
  <div class="rspace" id="rPages"></div>
  <button class="rb side prev" id="rPrev" aria-label="Previous page">◀</button><button class="rb side next" id="rNext" aria-label="Next page">▶</button>
  <div class="done" id="rDone"></div>
  <div class="rfoot"><div class="pg" id="rPg"></div><div class="credit" id="rCredit"></div></div>
`;
document.body.appendChild(el);
const $r = id => el.querySelector('#' + id), pagesEl = $r('rPages');

const B = makeBook(); B.root.visible = false; scene.add(B.root);

// Each page loads once and is uploaded to the GPU as soon as it arrives; a turn waits until every page it
// reveals is ready, so a page never turns over onto a blank one
const loader = new THREE.TextureLoader(), texCache = new Map();
function pageTex(book, i) {
  if (i < 0 || i >= book.pages) return B.paper;
  const k = book.id + ':' + i;
  if (!texCache.has(k)) {
    let t; const loaded = new Promise(res => { t = loader.load(book.dir + 'p' + String(i + 1).padStart(3, '0') + '.jpg', () => { renderer.initTexture(t); res(); }, undefined, res); });
    t.encoding = THREE.sRGBEncoding; t.anisotropy = 4; t.loaded = loaded; texCache.set(k, t);
  }
  return texCache.get(k);
}
let book = null, spread = 0, flip = null, waiting = false, queued = 0, open = false;
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
  B.setBoards(spread > 0 ? 1 : 0, spread < last ? 0 : 1); B.setStacks(f, 1 - f); B.setPages(leaf(L), leaf(Rr));
  $r('rPg').textContent = spread === 0 ? 'Cover' : spread === last ? 'Back cover' : `${L + 1}–${Rr + 1} / ${book.pages}`;
  $r('rPrev').disabled = spread === 0; $r('rNext').disabled = spread >= last;
  // two spreads either way are on hand before anyone asks for them
  for (let i = L - 4; i <= Rr + 4; i++) pageTex(book, i);
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
// turns asked for mid-turn are counted and follow straight on, so quick taps flip through pages
function turn(dir) {
  if (!book) return;
  if (flip || waiting) { queued += dir; return; }
  const last = spreads() - 1, to = spread + dir;
  if (to < 0 || to > last) { queued = 0; return; }
  const L = 2 * spread - 1, Rr = 2 * spread;
  const board = Math.min(spread, to) === 0 ? 0 : Math.max(spread, to) === last ? 1 : null, k = board ? last - 1 : 1;
  const reveals = board !== null ? [2 * k - 1, 2 * k] : dir > 0 ? [Rr, Rr + 1, Rr + 2] : [L - 2, L - 1, L];
  const b = book; waiting = true;
  Promise.all(reveals.map(i => pageTex(b, i).loaded)).then(() => {
    waiting = false;
    if (book !== b || !open) return;
    // a cover swings over as a stiff board, onto or off the first or last spread of pages
    if (board !== null) B.setPages(leaf(2 * k - 1), leaf(2 * k));
    // the turning page carries one page image on each face; the page it uncovers is already in place beneath
    else if (dir > 0) { B.turnPage(pageTex(b, Rr), pageTex(b, Rr + 1)); B.setPages(leaf(L), leaf(Rr + 2)); B.curl(0); }
    else { B.turnPage(pageTex(b, L - 1), pageTex(b, L)); B.setPages(leaf(L - 2), leaf(Rr)); B.curl(1); }
    flip = { dir, board, t: 0 };
    Sound.tone(dir > 0 ? 700 : 620, { type: 'triangle', dur: .05, vol: .04 }); Sound.tone(1400, { type: 'sine', t: .05, dur: .08, vol: .02 });
  });
}

// ---------- settling down to read ----------
const X = new THREE.Vector3(1, 0, 0), q = new THREE.Quaternion();
const down = new THREE.Vector3(0, -1, 0), reach = (x, y, z) => new THREE.Quaternion().setFromUnitVectors(down, new THREE.Vector3(x, y, z).normalize());
// bends the body forward by a about the hips, with the hips ending up y above the ground and side across
function bend(a, y, side = 0) {
  const hip = .74 * hero.body.scale.y;
  hero.body.quaternion.multiply(q.setFromAxisAngle(X, a));
  hero.body.position.set(side, y - hip * Math.cos(a), -hip * Math.sin(a));
}
// on their tummy, pivoting forward about the hips, propped up on their elbows with their chin up to see the
// pages; their feet swing in the air behind them
const ELBOWS = [reach(.12, .3, .95), reach(-.12, .3, .95)];
function lie(p) {
  const hip = .74 * hero.body.scale.y;
  bend(1.35 * p, hip + (.26 - hip) * p);
  hero.head.quaternion.multiply(q.setFromAxisAngle(X, -.8 * p));
  [hero.armL, hero.armR].forEach((m, i) => m.quaternion.slerp(ELBOWS[i], p));
  [hero.legL, hero.legR].forEach((m, i) => m.quaternion.multiply(q.setFromAxisAngle(X, p * (.9 + Math.sin(game.elapsed * 2.6 + i * Math.PI) * .3))));
}
// cross-legged, each leg forward and across to the other side, leaning over the book with hands on their knees.
// They walk up beside the seat and hop sideways onto it, since walking there would go through it
const SEAT_HOP = -.8, CROSSED = [reach(.62, -.14, .78), reach(-.62, -.03, .78)], KNEES = [reach(.2, -.85, .5), reach(-.2, -.85, .5)];
function sit(p) {
  const hip = .74 * hero.body.scale.y;
  bend(.3 * p, hip + (WINDOW_SEAT.y + .1 - hip) * p + Math.sin(p * Math.PI) * .15, SEAT_HOP * p);
  hero.head.quaternion.multiply(q.setFromAxisAngle(X, .35 * p));
  [hero.legL, hero.legR].forEach((m, i) => m.quaternion.slerp(CROSSED[i], p));
  [hero.armL, hero.armR].forEach((m, i) => m.quaternion.slerp(KNEES[i], p));
}
// x, z, angle: where they walk to and face. book: where the book's spine lies, its tops away from the reader
const PLACES = {
  // along the rug facing the window, a big floor storybook (pages about 45 cm tall) past their head
  rug: {x:-6.9, z:3.45, angle:-Math.PI/2, pose:lie, scale:.15, book:[-8.45, .052, 3.45]},
  // at the end of the seat facing along it, side-on to the window, a smaller book open on the cushion
  window: {x:WINDOW_SEAT.x - SEAT_HOP, z:WINDOW_SEAT.z - .45, angle:0, pose:sit, scale:.09, book:[WINDOW_SEAT.x, WINDOW_SEAT.y + .002, WINDOW_SEAT.z + .3]},
};
let at = PLACES.rug;
const fwd = new THREE.Vector3();
// straight down onto the pages, so however far back a narrow screen needs it, the explorer's head stays
// below the book rather than in front of it; far enough off to fit the book, open or closed, in the space
// the header and footer leave free. The slight lean keeps the page tops at the top of the screen.
const TILT = .06, mid = new THREE.Vector3();
function readCam(pos, look) {
  const [x0, x1] = B.extent(), tan = Math.tan(camera.fov * Math.PI / 360);
  const free = Math.max(.5, pagesEl.getBoundingClientRect().height / innerHeight || 1);
  const w = (x1 - x0 + .3) * at.scale, h = (B.H + 2 * B.MARGIN + .3) * at.scale, d = Math.max(h / 2 / tan / free, w / 2 / tan / camera.aspect) * 1.02;
  B.root.localToWorld(mid.set((x0 + x1) / 2, .3, 0));
  look.copy(mid); pos.copy(mid).addScaledVector(fwd, -d * Math.sin(TILT)); pos.y += d * Math.cos(TILT);
}
hqAnims.push(dt => {
  if (!open || !book || !flip) return;
  flip.t = Math.min(1, flip.t + dt / (flip.board === null ? .6 : .8)); const e = ease(flip.t), p = flip.dir > 0 ? e : 1 - e;
  if (flip.board === 0) B.setBoards(p, 0); else if (flip.board === 1) B.setBoards(1, p); else B.curl(p, dt);
  // a page that has landed lets its edge flutter flat, unless the next turn is already waiting
  if (flip.t >= 1 && (flip.board !== null || queued || !B.fluttering())) { spread += flip.dir; flip = null; B.settle(); setFlat(); if (queued) { const d = Math.sign(queued); queued -= d; turn(d); } }
});

function openBook(b) {
  book = b;
  $r('rTitle').textContent = b.title; $r('rSub').textContent = b.sub; $r('rCredit').textContent = b.credit || '';
  B.setAspect(b.aspect); B.setShade(1); spread = 0; flip = null; queued = 0;
  B.setCovers([pageTex(b, 0), pageTex(b, 1)], [pageTex(b, b.pages - 1), pageTex(b, b.pages - 2)]); setFlat();
}
// swipe or tap a side of the book to turn
let sx = null;
pagesEl.addEventListener('pointerdown', e => { sx = e.clientX; });
pagesEl.addEventListener('pointerup', e => { if (sx === null) return; const dx = e.clientX - sx; sx = null; Sound.init();
  if (Math.abs(dx) > 30) turn(dx < 0 ? 1 : -1); else turn(e.clientX > innerWidth / 2 ? 1 : -1); });
$r('rPrev').addEventListener('click', () => turn(-1)); $r('rNext').addEventListener('click', () => turn(1));
$r('rClose').addEventListener('click', () => close());

// where: one of PLACES
export function openReader(id, where = 'rug') {
  const b = BOOKS.find(x => x.id === id), pl = PLACES[where];
  if (!b || !b.pages || !sitDown({x: pl.x, z: pl.z, angle: pl.angle, pose: pl.pose, seated: () => { game.cutCam = readCam; el.hidden = false; }})) return;
  at = pl; fwd.set(Math.sin(at.angle), 0, Math.cos(at.angle));
  B.root.scale.setScalar(at.scale); B.root.rotation.y = at.angle + Math.PI; B.root.position.set(...at.book);
  closeDialog(); for (const k in keys) keys[k] = false; open = true;
  B.root.visible = true; document.documentElement.classList.add('reading-book');
  Sound.duck(true); Sound.tone(660, { type: 'triangle', dur: .15, vol: .07 });
  openBook(b);
}
function close() {
  if (!open) return;
  open = false; el.hidden = true; document.documentElement.classList.remove('reading-book');
  game.cutCam = null; B.root.visible = false; standUp();
  Sound.duck(false);
}
function key(e) {
  if (e.key === 'Escape') { close(); return; }
  if (e.key === 'ArrowRight' || e.key === ' ') { e.preventDefault(); turn(1); }
  if (e.key === 'ArrowLeft') { e.preventDefault(); turn(-1); }
}
addEventListener('keydown', e => { if (!open) return; e.stopPropagation(); key(e); }, true);
