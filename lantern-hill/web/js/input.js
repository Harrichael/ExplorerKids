import { Sound } from './core/sound.js';
import { isNewExplorer } from './explorer.js';
import { game } from './state.js';
import { closeDialog, convo, talk } from './ui/dialogue.js';
import { $ } from './ui/dom.js';
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
// the flashcard table, while open, catches keys before this handler (learn/flashcards.js)
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
  if ((k === ' ' || k === 'Enter') && !e.repeat) { if (convo || game.nearest || !game.nearUse) talk(); else useThing(); }
  if ((k === 'e' || k === 'E') && !e.repeat && !convo) useThing();
  if ((k === 'm' || k === 'M') && !e.repeat) toggleSound();
  if (k === 'Escape') closeDialog();
});
addEventListener('keyup', e => { const k = e.key; keys[k.length === 1 ? k.toLowerCase() : k] = false; });
addEventListener('blur', () => { for (const k in keys) keys[k] = false; });
addEventListener('pointerdown', () => Sound.init(), {passive:true});

const soundBtn = document.getElementById('sound');
function toggleSound(){ const on = Sound.toggle(); soundBtn.textContent = on ? '♪ Sound on' : '♪ Sound off'; soundBtn.setAttribute('aria-pressed', on); }
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

export const useBtn = $('use');
function useThing(){ if (game.nearUse && !convo && !dressing && !game.learning && !game.cutscene) game.nearUse.action(); }
useBtn.addEventListener('click', e => { e.stopPropagation(); Sound.init(); useThing(); });
