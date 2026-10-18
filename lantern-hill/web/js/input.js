import { Sound } from './core/sound.js';
import { isNewExplorer } from './explorer.js';
import { game } from './state.js';
import { closeDialog, convo, talk } from './ui/dialogue.js';
import { $ } from './ui/dom.js';
import { openInventory } from './ui/inventory.js';
import { dressing, openWardrobe, wardrobeKey } from './ui/wardrobe.js';

export const coarse = matchMedia('(pointer: coarse)').matches;
if (coarse) { document.documentElement.classList.add('coarse'); document.getElementById('go').textContent = 'Tap to begin'; }

export const keys = {};
export const startEl = document.getElementById('start');
function begin(){
  Sound.init();
  if (!startEl.hidden) { startEl.hidden = true; Sound.tone(523, {type:'triangle', dur:.25, vol:.1}); Sound.tone(784, {type:'triangle', t:.1, dur:.25, vol:.1}); Sound.tone(1046, {type:'triangle', t:.2, dur:.5, vol:.1});
    if (isNewExplorer) setTimeout(() => openWardrobe(true), 350); }
}
startEl.addEventListener('pointerdown', begin);
// flashcards, the globe, the book reader, the block tower and the backpack catch keys before this handler while they are open
addEventListener('keydown', e => {
  const k = e.key;
  if (e.target && e.target.tagName === 'INPUT') { if (k === 'Enter' || k === 'Escape') e.target.blur(); return; }
  if (game.cutscene && !convo) { e.preventDefault(); return; }
  if (dressing) { wardrobeKey(e); return; }
  if (['ArrowUp','ArrowDown','ArrowLeft','ArrowRight',' '].includes(k)) e.preventDefault();
  const first = !startEl.hidden;
  begin();
  if (first) return;
  keys[k.length === 1 ? k.toLowerCase() : k] = true;
  if ((k === ' ' || k === 'Enter') && !e.repeat) { const first = game.reach.findIndex(Boolean); if (convo || game.nearest || first < 0) talk(); else useSlot(first); }
  const slot = k.length === 1 ? USE_KEYS.indexOf(k.toLowerCase()) : -1;
  if (slot >= 0 && !e.repeat && !convo) useSlot(slot);
  if ((k === 'z' || k === 'Z') && !e.repeat) openBag();
  if ((k === 'm' || k === 'M') && !e.repeat) toggleSound();
  if (k === 'Escape') closeDialog();
});
addEventListener('keyup', e => { const k = e.key; keys[k.length === 1 ? k.toLowerCase() : k] = false; });
addEventListener('blur', () => { for (const k in keys) keys[k] = false; });
addEventListener('pointerdown', () => Sound.init(), {passive:true});

const soundBtn = document.getElementById('sound');
function toggleSound(){ const on = Sound.toggle(); soundBtn.textContent = on ? '♪ Sound on' : '♪ Sound off'; soundBtn.setAttribute('aria-pressed', on); }
export function setSound(want){ if (Sound.isOn() !== want) toggleSound(); }
soundBtn.addEventListener('click', e => { e.stopPropagation(); Sound.init(); toggleSound(); soundBtn.blur(); });

export const stick = document.getElementById('stick'), knob = document.getElementById('knob');
export const joy = {x:0, y:0, id:null};
stick.addEventListener('pointerdown', e => { joy.id = e.pointerId; stick.setPointerCapture(e.pointerId); moveJoy(e); });
stick.addEventListener('pointermove', e => { if (e.pointerId === joy.id) moveJoy(e); });
const endJoy = e => { if (e.pointerId !== joy.id) return; joy.id = null; joy.x = joy.y = 0; knob.style.transform = ''; };
stick.addEventListener('pointerup', endJoy); stick.addEventListener('pointercancel', endJoy);
function moveJoy(e){
  const r = stick.getBoundingClientRect();
  let dx = e.clientX - (r.left + r.width/2), dy = e.clientY - (r.top + r.height/2);
  const max = r.width/2 - 12, len = Math.hypot(dx, dy);
  if (len > max) { dx *= max/len; dy *= max/len; }
  knob.style.transform = `translate(${dx}px, ${dy}px)`;
  joy.x = dx/max; joy.y = dy/max;
}
document.getElementById('talk').addEventListener('click', () => { Sound.init(); if (!dressing) talk(); });

// the keys for things in reach, handed out from the middle of the row outward as more come into range
export const USE_KEYS = ['e', 'r', 'w', 't', 'q', 'y'];
function useSlot(i){ const u = game.reach[i]; if (u && !convo && !dressing && !game.activity && !game.cutscene) u.action(); }
let lastBtn = $('use');
export const useBtns = USE_KEYS.map((k, i) => {
  const b = i ? lastBtn.cloneNode() : lastBtn;
  if (i) { b.removeAttribute('id'); lastBtn.after(b); lastBtn = b; }
  b.style.setProperty('--i', i);
  b.addEventListener('click', e => { e.stopPropagation(); Sound.init(); useSlot(i); });
  return b;
});

function openBag(){
  if (convo || dressing || game.activity || game.cutscene || !startEl.hidden) return;
  for (const k in keys) keys[k] = false;
  openInventory();
}
$('bag').addEventListener('click', e => { e.stopPropagation(); Sound.init(); openBag(); $('bag').blur(); });
