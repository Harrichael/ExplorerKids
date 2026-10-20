// Dr. Sparks' time goggles: the explorer puts them on and a million years go by in a few seconds, so
// rock that creeps a few centimeters a year can be seen to flow. The camera holds one steady side-on
// shot the whole time, because motion only reads in a view that keeps still.
//
//   await goggles(t, {shot: (pos, look) => {...}, years: 2e6, dur: 7, step: k => { ... }});
//
// step(k) poses the place's slow motion at k, from 0 (now) to 1 (that many years on).

import { clamp01, ease } from '../core/kit.js';
import { Sound } from '../core/sound.js';
import { game } from '../state.js';

const el = document.createElement('div'); el.id = 'goggles'; el.hidden = true;
el.innerHTML = '<div class="ring"></div><div class="count"><span class="lbl">Time goggles</span><b>0</b> years</div>';
document.body.append(el);
const countEl = el.querySelector('b');
const fmt = y => y >= 1e6 ? (Math.round(y/1e5)/10).toLocaleString() + ' million' : y >= 1000 ? (Math.round(y/1000)*1000).toLocaleString() : Math.round(y).toLocaleString();

export async function goggles(t, {shot, years, dur = 7, step}){
  const prevCam = game.cutCam, wasCut = game.cutscene;
  game.cutscene = true; t.cut(shot);
  el.hidden = false; countEl.textContent = '0'; step(0);
  Sound.tone(392, {type:'triangle', dur:.18, vol:.08}); Sound.tone(587, {type:'triangle', t:.12, dur:.3, vol:.08});
  await t.wait(.8);
  const t0 = game.elapsed; let ticks = 0;
  Sound.hiss({dur, vol:.06, type:'bandpass', freq:700, f2:2400, q:.7});
  await t.until(() => {
    const p = clamp01((game.elapsed - t0)/dur), k = ease(p);
    step(k); countEl.textContent = fmt(years*k);
    if (p*16 > ticks) { ticks++; Sound.tone(1200 + ticks*40, {type:'square', dur:.03, vol:.02, cut:3000}); }
    return p >= 1;
  });
  Sound.tone(784, {type:'triangle', dur:.3, vol:.08}); Sound.tone(1175, {type:'triangle', t:.1, dur:.5, vol:.07});
  await t.wait(1.2);
  el.hidden = true; game.cutCam = prevCam; game.camSnap = true; game.cutscene = wasCut;
}
