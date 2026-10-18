// The phonogram flashcard table, loaded the first time someone sits down at it.

import { Sound } from '../core/sound.js';
import { cfg } from '../explorer.js';
import { joy, keys, knob } from '../input.js';
import { clock } from '../play.js';
import { load, save } from '../save.js';
import { game } from '../state.js';
import { closeDialog } from '../ui/dialogue.js';
import { $ } from '../ui/dom.js';
import { DECKS, PHONOGRAMS } from './phonograms.js';

const learnEl = $('learn'), cardEl = $('card');
const L = {deck:'single', queue:[], total:0, done:0, flipped:false, again:0};
const savedMastery = load('phonograms');
const mastery = savedMastery && typeof savedMastery === 'object' ? savedMastery : {};
const saveMastery = () => save('phonograms', mastery);
// clip files are looked up in a manifest: sound keys like 'TH' and 'th' would collide as file names
const AUDIO_DIR = new URL('../../audio/phonograms/', import.meta.url);
const clips = fetch(new URL('index.json', AUDIO_DIR)).then(r => r.json()).catch(() => ({sounds:{}, words:{}}));
const clipUrls = (files, keys) => keys.map(k => files[k]).filter(Boolean).map(f => new URL(f, AUDIO_DIR).href);
const plainWord = w => w.replace(/[\[\]]/g, '');
let chipEls = [], wordEls = [];
function mark(list, i){ list.forEach((el, j) => el.classList.toggle('playing', j === i)); }
async function playSounds(only){
  const c = L.queue[0]; if (!c) return;
  const idx = only === undefined ? c.sounds.map((_, i) => i) : [only];
  const { sounds } = await clips; if (L.queue[0] !== c) return;
  Sound.playSeq(clipUrls(sounds, idx.map(i => c.sounds[i].snd)), only === undefined ? .45 : 0, (k) => { mark(wordEls, -1); mark(chipEls, k < 0 ? -1 : idx[k]); });
}
async function playWords(only){
  const c = L.queue[0]; if (!c) return;
  const idx = only === undefined ? c.sounds.map((_, i) => i) : [only];
  const { words } = await clips; if (L.queue[0] !== c) return;
  Sound.playSeq(clipUrls(words, idx.map(i => plainWord(c.sounds[i].word))), only === undefined ? .5 : 0, (k) => { mark(chipEls, -1); mark(wordEls, k < 0 ? -1 : idx[k]); });
}
const shuffle = a => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
function wordNode(w){
  const span = document.createElement('span'); span.className = 'word';
  const m = w.match(/^(.*)\[(.*)\](.*)$/);
  if (!m) { span.textContent = w; return span; }
  const mk = document.createElement('mark'); mk.textContent = m[2];
  span.append(m[1], mk, m[3]); return span;
}
function renderDecks(){
  const box = $('decks'); box.textContent = '';
  for (const d of DECKS) {
    const b = document.createElement('button'); b.className = 'deck'; b.setAttribute('aria-pressed', String(L.deck === d.id));
    const n = PHONOGRAMS.filter(d.pick).length;
    b.append(d.label + ' '); const s = document.createElement('span'); s.className = 'n'; s.textContent = `(${n})`; b.append(s);
    b.addEventListener('click', () => { Sound.next(); startDeck(d.id); });
    box.append(b);
  }
}
function startDeck(id){
  L.deck = id; const d = DECKS.find(x => x.id === id);
  L.queue = shuffle(PHONOGRAMS.filter(d.pick)); L.total = L.queue.length; L.done = 0; L.again = 0;
  renderDecks(); $('lDone').hidden = true; $('lPlay').hidden = false;
  showCard(true);
}
function setFlipped(f, instant){
  L.flipped = f;
  if (instant) { cardEl.style.transition = 'none'; cardEl.classList.toggle('flipped', f); void cardEl.offsetWidth; cardEl.style.transition = ''; }
  else cardEl.classList.toggle('flipped', f);
  $('preBtns').hidden = f; $('postBtns').hidden = !f;
  cardEl.setAttribute('aria-label', f ? 'Card flipped. Showing sounds.' : 'Flip card');
}
function showCard(){
  const c = L.queue[0];
  $('lCount').textContent = `${L.done} of ${L.total} learned`;
  $('lBar').style.width = (L.total ? L.done / L.total * 100 : 0) + '%';
  if (!c) return finishDeck();
  setFlipped(false, true);
  const kind = c.ph.length === 1 ? 'Single letter' : 'Multi-letter phonogram';
  $('cTag').textContent = kind; $('cTag2').textContent = c.sounds.length === 1 ? '1 sound' : `${c.sounds.length} sounds`;
  $('cPh').textContent = c.ph; $('cPh2').textContent = c.ph;
  const st = $('cStars'); st.textContent = ''; const m = Math.min(3, mastery[c.ph] || 0);
  for (let i = 0; i < 3; i++) { const s = document.createElement('span'); s.textContent = '★'; if (i >= m) s.className = 'off'; st.append(s); }
  st.setAttribute('aria-label', `${m} of 3 stars`);
  const dots = $('cDots'); dots.textContent = '';
  c.sounds.forEach(() => dots.append(document.createElement('i')));
  dots.append(c.sounds.length === 1 ? '1 sound' : `${c.sounds.length} sounds`);
  const ul = $('cSounds'); ul.textContent = '';
  const twoCol = c.sounds.length > 4;
  ul.classList.toggle('two', twoCol);
  ul.style.gridTemplateRows = twoCol ? `repeat(${Math.ceil(c.sounds.length / 2)}, auto)` : '';
  chipEls = []; wordEls = [];
  c.sounds.forEach((s, i) => {
    const li = document.createElement('li');
    const ch = document.createElement('button'); ch.className = 'snd'; ch.textContent = `/${s.snd}/`; ch.setAttribute('aria-label', `Hear sound ${i + 1}`);
    ch.addEventListener('click', e => { e.stopPropagation(); playSounds(i); });
    const wb = document.createElement('button'); wb.className = 'word'; wb.append(...wordNode(s.word).childNodes); wb.setAttribute('aria-label', `Hear ${plainWord(s.word)}`);
    wb.addEventListener('click', e => { e.stopPropagation(); playWords(i); });
    chipEls.push(ch); wordEls.push(wb); li.append(ch, wb); ul.append(li);
  });
  cardEl.classList.remove('enter'); void cardEl.offsetWidth; cardEl.classList.add('enter');
}
function flip(){
  if (!L.queue.length) return;
  setFlipped(!L.flipped);
  Sound.hiss({dur:.12, vol:.06, type:'bandpass', freq:2400, q:.8}); Sound.tone(L.flipped ? 740 : 620, {type:'triangle', dur:.08, vol:.05});
  if (L.flipped) { const q = L.queue[0]; setTimeout(() => { if (L.flipped && L.queue[0] === q) playSounds(); }, 420); } else Sound.stopSeq();
}
function knew(){
  if (!L.flipped || !L.queue.length) return;
  const c = L.queue.shift(); mastery[c.ph] = Math.min(3, (mastery[c.ph] || 0) + 1); saveMastery(); L.done++;
  [784, 988, 1319].forEach((f, i) => Sound.tone(f, {type:'triangle', t:i * .06, dur:.22, vol:.08}));
  Sound.stopSeq();
  showCard();
}
function again(){
  if (!L.flipped || !L.queue.length) return;
  const c = L.queue.shift(); L.queue.splice(Math.min(3, L.queue.length), 0, c); L.again++;
  Sound.tone(440, {type:'triangle', dur:.15, vol:.07}); Sound.tone(392, {type:'triangle', t:.08, dur:.2, vol:.06});
  Sound.stopSeq();
  showCard();
}
function finishDeck(){
  $('lPlay').hidden = true;
  const d = $('lDone'); d.hidden = false; d.textContent = '';
  const card = document.createElement('div'); card.className = 'donecard';
  const stars = document.createElement('div'); stars.className = 'bigstars'; stars.textContent = '★★★';
  const h = document.createElement('h3'); h.textContent = 'Deck complete!';
  const p1 = document.createElement('p'); p1.textContent = `You read all ${L.total} cards, ${cfg.name}.` + (L.again ? ` You practiced ${L.again} ${L.again === 1 ? 'card' : 'cards'} a second time, which is how sounds stick.` : ' You knew every one on the first try!');
  const row = document.createElement('div'); row.className = 'lbtns';
  const b1 = document.createElement('button'); b1.className = 'lbtn yes'; b1.textContent = 'Shuffle and go again'; b1.addEventListener('click', () => startDeck(L.deck));
  const b2 = document.createElement('button'); b2.className = 'lbtn soft'; b2.textContent = 'Back to Lantern Hill'; b2.addEventListener('click', closeLearn);
  row.append(b1, b2); card.append(stars, h, p1, row); d.append(card);
  [523, 659, 784, 1046, 1319].forEach((f, i) => Sound.tone(f, {type:'triangle', t:i * .09, dur:.4, vol:.08}));
  setTimeout(() => b1.focus({preventScroll:true}), 60);
}
export function openLearn(){
  if (game.learning) return;
  closeDialog();
  game.learning = true; for (const k in keys) keys[k] = false; joy.x = joy.y = 0; joy.id = null; knob.style.transform = '';
  document.documentElement.classList.add('learning'); learnEl.hidden = false; learnEl.scrollTop = 0;
  Sound.duck(true); [523, 784, 1046].forEach((f, i) => Sound.tone(f, {type:'triangle', t:i * .07, dur:.25, vol:.08}));
  startDeck(L.deck);
  setTimeout(() => cardEl.focus({preventScroll:true}), 80);
}
function closeLearn(){
  if (!game.learning) return;
  game.learning = false; learnEl.hidden = true; document.documentElement.classList.remove('learning');
  Sound.stopSeq();
  Sound.duck(false); Sound.close(); clock.getDelta();
}
function learnKey(e){
  const k = e.key, onBtn = e.target && e.target.tagName === 'BUTTON';
  if (k === 'Escape') { closeLearn(); return; }
  if (!$('lPlay').hidden) {
    if ((k === ' ' || k === 'Enter') && !onBtn) { e.preventDefault(); if (!e.repeat) flip(); }
    if (k === 'ArrowRight' && !e.repeat) { e.preventDefault(); knew(); }
    if (k === 'ArrowLeft' && !e.repeat) { e.preventDefault(); again(); }
    if ((k === 's' || k === 'S') && !e.repeat && L.flipped) playSounds();
    if ((k === 'w' || k === 'W') && !e.repeat && L.flipped) playWords();
  }
}
cardEl.addEventListener('click', flip);
$('bFlip').addEventListener('click', flip);
$('bKnew').addEventListener('click', knew);
$('bAgain').addEventListener('click', again);
$('bHear').addEventListener('click', () => playWords());
$('bHearS').addEventListener('click', () => playSounds());
$('lBack').addEventListener('click', closeLearn);
addEventListener('keydown', e => { if (!game.learning) return; e.stopPropagation(); learnKey(e); }, true);
