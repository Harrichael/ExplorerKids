import * as THREE from 'three';
import { human } from '../characters/build.js';
import { PERSONA } from '../characters/cast.js';
import { outlineMat } from '../core/kit.js';
import { Sound } from '../core/sound.js';
import { cfg, heroOpts } from '../explorer.js';
import { game } from '../state.js';
import { $ } from './dom.js';

export const dlg = $('dialog'), promptEl = $('prompt'), talkBtn = $('talk'), dText = $('dText'), dMore = $('dMore');
export let active = null, convo = null, curItem = null;
export const typing = {text:'', shown:0, acc:0, letters:0, done:true};
const shownSpan = document.createElement('span'), restSpan = document.createElement('span'); restSpan.className = 'rest';
dText.append(shownSpan, restSpan);
// A line can end in a question: {p, text, choices:[{label, then}]}. The answers show once the line is
// typed out, and picking one ends the talk and runs its `then`. Talk/Space/Enter picks the lit one,
// the arrows move the light, Escape walks away without answering.
const choicesEl = document.createElement('div'); choicesEl.className = 'choices'; choicesEl.hidden = true; dlg.append(choicesEl);
let lit = 0;
function showChoices(){
  lit = 0; choicesEl.replaceChildren(...curItem.choices.map((c, i) => {
    const b = document.createElement('button'); b.className = 'choice'; b.textContent = c.label;
    b.addEventListener('click', e => { e.stopPropagation(); choose(i); });
    return b;
  }));
  light(0); choicesEl.hidden = false; dMore.hidden = true;
}
function light(i){ lit = (i + curItem.choices.length) % curItem.choices.length; [...choicesEl.children].forEach((b, j) => b.classList.toggle('lit', j === lit)); }
function choose(i){
  if (!curItem || !curItem.choices || choicesEl.hidden) return;
  const c = curItem.choices[i]; Sound.next(); endConvo(false);
  if (c.then) c.then();
}
const asking = () => !!(convo && curItem && curItem.choices && !choicesEl.hidden);
addEventListener('keydown', e => {
  if (!asking()) return;
  if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') { e.preventDefault(); light(lit - 1); Sound.near(); }
  if (e.key === 'ArrowRight' || e.key === 'ArrowDown') { e.preventDefault(); light(lit + 1); Sound.near(); }
});
function showItem(it){
  curItem = it; const p = it.p;
  dlg.classList.toggle('thought', !!it.thought);
  $('dName').textContent = p.name; $('dRole').textContent = p.role; $('dDot').style.background = p.dot;
  typing.text = it.text.replace(/\{name\}/g, cfg.name || 'Explorer'); typing.shown = 0; typing.acc = -5; typing.letters = 0; typing.done = false;
  shownSpan.textContent = ''; restSpan.textContent = typing.text; dMore.hidden = true; choicesEl.hidden = true;
  active = game.world.npcs.find(n => n.persona === p) || null;
  setBust(p);
}
function finishLine(){ typing.shown = typing.text.length; typing.done = true; shownSpan.textContent = typing.text; restSpan.textContent = ''; dMore.hidden = false; if (curItem.choices) showChoices(); }
function startConvo(items, then, npc){
  if (!items.length) { if (then) then(); return; }
  if (convo) { convo.queue.push(...items); if (then) { const prev = convo.then; convo.then = prev ? () => { prev(); then(); } : then; } return; }
  convo = {queue: items.slice(), then: then || null, npc: npc || null};
  dlg.hidden = false; promptEl.hidden = true; document.documentElement.classList.add('talking');
  Sound.open(); Sound.duck(true);
  if (npc && npc.kind === 'cat') setTimeout(() => Sound.meow(), 180);
  nextItem();
}
function nextItem(){
  const it = convo.queue.shift();
  if (it) { showItem(it); return; }
  const f = convo.then; endConvo(!f); if (f) f();
}
export function endConvo(sound){
  if (!convo) return;
  convo = null; active = null; curItem = null; dlg.hidden = true; choicesEl.hidden = true; document.documentElement.classList.remove('talking');
  if (sound) Sound.close(); Sound.duck(false);
}
export function closeDialog(){ if (convo && !convo.then) endConvo(true); }
export function story(lines, then){ startConvo(lines.map(([id, text]) => ({p: PERSONA[id], text})), then, null); }
// the explorer's inner voice; extra fields on each line (like what to look at) ride along on curItem
const THINK_VOICE = {type:'sine', base:523, scale:[0,4,7,12], len:.12, vol:.05, glide:1.03};
export function think(lines, then){
  // a fresh persona each time so the bust wears whatever the explorer has on now
  const p = {name:cfg.name || 'Explorer', role:'Thinking…', dot:'#b9c8f0', kind:'human', voice:THINK_VOICE, make: () => human(heroOpts(cfg))};
  startConvo(lines.map(l => Object.assign({p, thought:true}, l)), then, null);
}
export function talk(){
  if (convo) { if (!typing.done) { finishLine(); return; } if (asking()) { choose(lit); return; } Sound.next(); nextItem(); return; }
  if (!game.nearest || game.cutscene) return;
  // someone with more to say than their usual lines (an offer, say) brings their own talk
  const n = game.nearest; startConvo((n.converse && n.converse()) || n.lines.map(text => ({p: n.persona, text})), null, n);
}
dlg.addEventListener('click', talk);
export function updateTyping(dt){
  if (!convo || !curItem || typing.done) return;
  typing.acc += dt * 42; let changed = false;
  while (typing.acc >= 1 && typing.shown < typing.text.length) {
    const ch = typing.text[typing.shown++]; typing.acc -= 1; changed = true;
    if (/[A-Za-z0-9]/.test(ch) && typing.letters++ % 3 === 0) Sound.blip(curItem.p.voice);
    if (/[.!?]/.test(ch)) typing.acc -= 7; else if (/[,;:]/.test(ch)) typing.acc -= 3.5;
  }
  if (changed) { shownSpan.textContent = typing.text.slice(0, typing.shown); restSpan.textContent = typing.text.slice(typing.shown); }
  if (typing.shown >= typing.text.length) { typing.done = true; dMore.hidden = false; if (curItem.choices) showChoices(); }
}

// ---------- talking busts: a little 3D portrait of whoever is speaking ----------
const bustCan = $('bustCan');
const bustR = new THREE.WebGLRenderer({canvas: bustCan, antialias: true, alpha: true});
bustR.setPixelRatio(Math.min(devicePixelRatio, 2)); bustR.outputEncoding = THREE.sRGBEncoding;
const bustScene = new THREE.Scene();
bustScene.add(new THREE.HemisphereLight(0xfff2e0, 0x5a3a70, .85));
const bustKey = new THREE.DirectionalLight(0xffe0c0, .75); bustKey.position.set(-1.2, 1.6, 3); bustScene.add(bustKey);
const bustRim = new THREE.DirectionalLight(0x9fd6ff, .5); bustRim.position.set(2, 1.2, -2); bustScene.add(bustRim);
const bustCam = new THREE.PerspectiveCamera(26, 1, .05, 30);
let bust = null, bustP = null, bustT = 0, bustBlink = 2;
function setBust(p){
  if (bustP === p) return;
  if (bust) { bustScene.remove(bust.root); bust.root.traverse(m => { if (m.isMesh && m.material !== outlineMat) m.geometry.dispose(); }); }
  bustP = p; bust = p.make();
  if (p.kind === 'cat') bust.root.rotation.y = -Math.PI/2;
  bustScene.add(bust.root); bust.root.updateMatrixWorld(true);
  const hp = new THREE.Vector3(); bust.head.getWorldPosition(hp);
  const s = p.kind === 'cat' ? .55 : p.kind === 'owl' ? 1.05 : bust.body.scale.x;
  bustCam.position.set(hp.x, hp.y - .08*s, hp.z + 2.55*s); bustCam.lookAt(hp.x, hp.y - .3*s, hp.z);
}
export function renderBust(dt){
  if (!bust || dlg.hidden) return;
  const r = bustCan.getBoundingClientRect(); if (!r.width) return;
  if (bustCan.width !== Math.round(r.width*bustR.getPixelRatio())) bustR.setSize(r.width, r.height, false);
  bustT += dt; const talking = !typing.done && !(curItem && curItem.thought), m = bust;
  if (bustP.kind === 'owl') {
    const flap = talking ? Math.abs(Math.sin(bustT*10))*.5 : 0; m.wingL.rotation.z = -flap; m.wingR.rotation.z = flap;
    m.head.rotation.z = talking ? Math.sin(bustT*9)*.08 : Math.sin(bustT*.8)*.04; m.lids.forEach(l => l.scale.y = (bustT % 3.4) < .14 ? 1 : .15);
  } else if (bustP.kind === 'cat') {
    m.tail.forEach((s, i) => s.rotation.y = Math.sin(bustT*2 + i*.6)*.4); m.head.rotation.z = Math.sin(bustT*3)*.12; m.eyes.forEach(e => e.scale.set(1, talking ? 1.6 : 1, 1));
  } else {
    const open = talking && Math.sin(bustT*22) > -.2; m.mouthOpen.visible = open; m.smile.visible = !open; m.mouthOpen.scale.y = .5 + Math.abs(Math.sin(bustT*17))*.5;
    m.head.rotation.z = talking ? Math.sin(bustT*5)*.07 : Math.sin(bustT*.9)*.03; m.head.rotation.x = talking ? Math.sin(bustT*11)*.05 : 0;
    m.body.position.y = Math.sin(bustT*2.2)*.012;
    bustBlink -= dt; m.eyes.scale.y = bustBlink < .1 ? .1 : 1; if (bustBlink < 0) bustBlink = 2 + Math.random()*3;
  }
  bustR.render(bustScene, bustCam);
}
