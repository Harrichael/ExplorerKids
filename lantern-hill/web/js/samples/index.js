// Samples: tiny things found on field trips, carried home in unlabelled jars, and seen for what they
// are under the microscope in the science corner. A jar is a sample found and not yet looked at; once
// looked at, it is a slide in the microscope's tray for good. The tray's order is this list's order.
//
// They're saved in the trips slot, as the trips are where they're found.

import { Sound } from '../core/sound.js';
import { load, save } from '../save.js';
import { $ } from '../ui/dom.js';
import { nudgeBag } from '../ui/inventory.js';

export const SAMPLES = [
  {id:'ash', from:'The volcano rim', name:'Volcanic ash', tint:'#9a9490', line:"Not ash from a fire! Tiny bits of glass the volcano blew apart. See the bubble shapes?"},
  {id:'sulfur', from:'The volcano rim', name:'Sulfur crystals', tint:'#e8c02a', line:"Yellow crystals that grew right out of the volcano's smelly gas."},
  {id:'olivine', from:'The mantle', name:'Mantle rock', tint:'#7aa83a', line:"Mantle rock, cut thinner than paper. Under special light, each green olivine grain glows its own colour!"},
  {id:'foram', from:'The sea floor', name:'Foram shells', tint:'#efe2c8', line:"Each shell was built by just one tiny cell, a bigger room at a time."},
  {id:'radiolarian', from:'The sea floor', name:'Radiolarian', tint:'#d8e8f4', line:"A spiky skeleton made of glass, smaller than a grain of sand."},
  {id:'diatom', from:'The sea floor', name:'Diatoms', tint:'#c8b870', line:"Tiny living things in glass boxes. Diatoms make a lot of the air we breathe!"},
  {id:'microbes', from:'The sea floor', name:'Vent microbes', tint:'#f2f0e6', line:"These microbes live on the vent's chemicals instead of sunlight. Crabs and worms graze on them!"},
  {id:'crinoid', from:'Where plates crash', name:'Sea lily stem', tint:'#c8a070', line:"Little stone stars! Bits of a sea lily, an animal that lived on the sea floor."},
  {id:'nummulite', from:'Where plates crash', name:'Coin shell', tint:'#d8b880', line:"A giant foram, like the tiny shells from the sea floor. This one was lifted up into a mountain."},
  {id:'trilobite', from:'Where plates crash', name:'Tiny trilobite', tint:'#8a8690', line:"A trilobite! It scuttled across the sea floor long, long before the dinosaurs."},
  {id:'snowalgae', from:'Where plates crash', name:'Snow algae', tint:'#e87888', line:"Tiny red algae that live in snow. They turn it pink. Some people call it watermelon snow!"},
  {id:'daphnia', from:'Where plates slide', name:'Water flea', tint:'#a8c070', line:"Not a flea at all! It's so see-through you can watch its heart beat."},
  {id:'spirogyra', from:'Where plates slide', name:'Spiral algae', tint:'#5aa04a', line:"Pond algae. A green ribbon twists down every cell, like a spiral staircase."},
  {id:'rotifer', from:'Where plates slide', name:'Rotifer', tint:'#c8b890', line:"Its two crowns of hairs beat so fast they look like spinning wheels, pulling food in."},
  {id:'tardigrade', from:'Where plates slide', name:'Water bear', tint:'#7a9a4a', line:"A water bear, from wet moss. It can dry up like a seed and wake up years later!"},
  {id:'limu', from:'The hotspot island', name:"Pele's seaweed", tint:'#8a8a5a', line:"Not seaweed at all! Where lava hits the sea, it blows glass bubbles that pop into flakes thinner than paper."},
  {id:'urchin', from:'The hotspot island', name:'Sea urchin spine', tint:'#c87aa8', line:"One spine of a sea urchin, sliced across. Inside, it's built like a star!"},
  {id:'copepod', from:'The hotspot island', name:'Copepod', tint:'#d8c8a0', line:"A copepod, with just one bright eye. There are more of these tiny swimmers than almost any animal on Earth."},
  {id:'coralline', from:'The hotspot island', name:'Pink rock algae', tint:'#e898a8', line:"Pink algae that builds itself a stony skeleton. It glues reefs together like cement."},
];
export const byId = id => SAMPLES.find(s => s.id === id);

const rec = () => { const s = (load('trips') || {}).samples || {}; return {found:s.found || [], seen:s.seen || [], told:s.told || 0}; };
const keep = r => save('trips', {samples:r});
export const has = id => rec().found.includes(id);
export const slides = () => SAMPLES.filter(s => rec().seen.includes(s.id));
export const jars = () => { const r = rec(); return SAMPLES.filter(s => r.found.includes(s.id) && !r.seen.includes(s.id)); };
export function look(id){ const r = rec(); if (!r.seen.includes(id)) { r.seen.push(id); keep(r); } }

// Puts what's new among ids in the backpack, with a cheer; resolves how many times Dr. Sparks had remarked
// on a find before this one, so the first few can get a word from her.
export function collect(ids){
  const r = rec(), fresh = ids.filter(id => !r.found.includes(id));
  if (!fresh.length) return null;
  const told = r.told; r.found.push(...fresh); r.told++; keep(r);
  cheer(fresh.map(byId));
  return told;
}

// a little corked jar, cloudy with whatever's inside; unlabelled, so what it is stays a mystery
const jarCache = new Map();
export function jarArt(tint){
  if (jarCache.has(tint)) return jarCache.get(tint);
  const cv = document.createElement('canvas'); cv.width = 96; cv.height = 120; const c = cv.getContext('2d'), ink = '#1a1320';
  c.lineJoin = 'round'; c.lineWidth = 5; c.strokeStyle = ink;
  const body = () => { c.beginPath(); c.moveTo(30, 34); c.lineTo(30, 42); c.bezierCurveTo(12, 48, 12, 60, 12, 72); c.lineTo(12, 100); c.quadraticCurveTo(12, 112, 24, 112);
    c.lineTo(72, 112); c.quadraticCurveTo(84, 112, 84, 100); c.lineTo(84, 72); c.bezierCurveTo(84, 60, 84, 48, 66, 42); c.lineTo(66, 34); c.closePath(); };
  body(); c.fillStyle = 'rgba(214,236,240,.9)'; c.fill();
  c.save(); body(); c.clip(); c.fillStyle = tint; c.beginPath(); c.moveTo(0, 80); c.quadraticCurveTo(48, 70, 96, 82); c.lineTo(96, 120); c.lineTo(0, 120); c.fill();
  c.fillStyle = 'rgba(255,255,255,.35)'; for (const [x, y, s] of [[28, 92, 4], [52, 88, 3], [64, 100, 5], [38, 104, 3], [70, 86, 2.5]]) { c.beginPath(); c.arc(x, y, s, 0, 7); c.fill(); }
  c.fillStyle = 'rgba(0,0,0,.14)'; c.fillRect(0, 106, 96, 14); c.restore();
  body(); c.stroke();
  c.fillStyle = 'rgba(255,255,255,.75)'; c.beginPath(); c.ellipse(24, 74, 4, 16, 0, 0, 7); c.fill();
  c.fillStyle = '#b07a4a'; c.beginPath(); c.moveTo(26, 12); c.lineTo(70, 12); c.lineTo(67, 36); c.lineTo(29, 36); c.closePath(); c.fill(); c.stroke();
  c.fillStyle = 'rgba(80,40,20,.35)'; for (const [x, y] of [[38, 20], [56, 26], [46, 30], [60, 18]]) { c.beginPath(); c.arc(x, y, 2, 0, 7); c.fill(); }
  c.strokeStyle = '#c89a5a'; c.lineWidth = 3.5; c.beginPath(); c.moveTo(30, 40); c.lineTo(66, 40); c.stroke();
  const url = cv.toDataURL(); jarCache.set(tint, url); return url;
}

const css = document.createElement('style');
css.textContent = `
#sampleToast{position:fixed;left:50%;top:calc(70px + env(safe-area-inset-top,0px));transform:translateX(-50%);display:flex;align-items:center;gap:12px;z-index:15;pointer-events:none;
  background:#f6ecd6;color:#1a1320;border:3px solid var(--gold);border-radius:16px;box-shadow:0 0 0 4px var(--ink),0 12px 26px rgba(0,0,0,.4);padding:8px 18px 8px 12px;animation:stIn .5s cubic-bezier(.3,1.6,.5,1)}
#sampleToast.out{transition:opacity .35s,transform .35s;opacity:0;transform:translateX(-50%) translateY(-14px)}
#sampleToast .jars{display:flex}
#sampleToast .jars img{width:40px;height:50px;margin-right:-10px;filter:drop-shadow(0 2px 2px rgba(0,0,0,.3))}
#sampleToast .jars img:last-child{margin-right:0}
#sampleToast b{font-family:var(--display);font-weight:400;font-size:clamp(18px,4.6vw,24px);color:var(--plum);white-space:nowrap}
@keyframes stIn{from{opacity:0;transform:translateX(-50%) translateY(-24px) scale(.8)}}
.flyJar{position:fixed;width:40px;height:50px;z-index:16;pointer-events:none;transition:transform .7s cubic-bezier(.5,-.3,.7,1),opacity .7s;filter:drop-shadow(0 2px 2px rgba(0,0,0,.3))}`;
document.head.appendChild(css);

const words = n => ['', 'a sample', 'two samples', 'three samples', 'four samples'][n] || `${n} samples`;
function cheer(found){
  [784, 988, 1175, 1568].forEach((f, i) => Sound.bell(f, {t:i*.09, dur:1, vol:.05})); Sound.sparkle(5, {t:.3, span:.5});
  $('sampleToast')?.remove();
  const el = document.createElement('div'); el.id = 'sampleToast';
  el.innerHTML = `<div class="jars">${found.map(s => `<img alt="" src="${jarArt(s.tint)}">`).join('')}</div><b>You found ${words(found.length)}!</b>`;
  document.body.appendChild(el);
  // the jars hop out of the note and into the backpack
  setTimeout(() => { const bag = $('bag').getBoundingClientRect();
    el.querySelectorAll('img').forEach((img, i) => { const a = img.getBoundingClientRect(), fly = img.cloneNode(); fly.className = 'flyJar';
      fly.style.left = a.left + 'px'; fly.style.top = a.top + 'px'; document.body.appendChild(fly); img.style.visibility = 'hidden';
      setTimeout(() => { fly.style.transform = `translate(${bag.left + bag.width/2 - a.left - 20}px, ${bag.top + bag.height/2 - a.top - 25}px) scale(.4)`; fly.style.opacity = '.2'; }, 30 + i*120);
      setTimeout(() => { fly.remove(); if (i === found.length - 1) { nudgeBag(); Sound.tone(660, {type:'triangle', dur:.12, vol:.06}); } }, 760 + i*120); }); }, 1500);
  setTimeout(() => el.classList.add('out'), 2300); setTimeout(() => el.remove(), 2700);
}
