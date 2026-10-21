// Dr. Sparks' time goggles: the explorer puts them on and a million years go by in a few seconds, so
// rock that creeps a few centimeters a year can be seen to flow. The camera holds one steady side-on
// shot the whole time, because motion only reads in a view that keeps still.
//
//   await goggles(t, {shot: (pos, look) => {...}, wide: 14, years: 2e6, dur: 7, step: k => { ... }});
//
// step(k) poses the place's slow motion at k, from 0 (now) to 1 (that many years on). `wide` is how far
// either side of the look point must stay in view: on a narrow screen the camera backs off to keep it, by
// up to `room` if a wall is in the way, and past that the lens widens (a flat face shows true at any lens).
// With `stay`, the view holds once the goggles come off, for talk about what was seen, until the
// function it resolves with is called.
//
// Most places see through the ground in x-ray mode, into a slice of the Earth built far below them.
// diorama() sets that slice in the world it was cut from (sky, the surface running off to the horizon,
// deep rock below), and label() writes on it in the storybook's lettering:
//
//   const g = new THREE.Group(); g.position.set(0, -140, 0); w.scene.add(g);
//   diorama(g, {ground:'sea', back:-3, deep:0x5a1a14});
//   const plate = label(g, 'the plate slides', .8, [-6, -1.5, 3.4], {text:'the plate\nslides', at:[-6, 4, 3.4]});
//   plate.set(opacity);     // every frame of step(): it also picks the tall screen's words and place

import * as THREE from 'three';
import { clamp01, ease, tex } from '../core/kit.js';
import { camera } from '../core/render.js';
import { Sound } from '../core/sound.js';
import { game } from '../state.js';

const el = document.createElement('div'); el.id = 'goggles'; el.hidden = true;
el.innerHTML = '<div class="ring"></div><div class="count"><span class="lbl">Time goggles</span><b>0</b> <i>years</i></div>';
document.body.append(el);
const countEl = el.querySelector('b'), unitEl = el.querySelector('i');
const fmt = y => y >= 1e6 ? (Math.round(y/1e5)/10).toLocaleString() + ' million' : y >= 1000 ? (Math.round(y/1000)*1000).toLocaleString() : Math.round(y).toLocaleString();
export const tall = () => innerWidth < innerHeight;

export async function goggles(t, {shot, wide = 0, room = Infinity, stay = false, years, dur = 7, step}){
  const prevCam = game.cutCam, wasCut = game.cutscene, far = camera.far, fov = camera.fov;
  const fit = (pos, look) => { const r = shot(pos, look), d = pos.distanceTo(look), tan = Math.tan(fov*Math.PI/360)*camera.aspect, d2 = Math.min(d + room, wide/tan);
    if (d2 > d) pos.sub(look).multiplyScalar(d2/d).add(look);
    const want = Math.max(fov, 360/Math.PI*Math.atan(wide/(Math.max(d, d2)*camera.aspect)));
    if (Math.abs(camera.fov - want) > .01) { camera.fov = want; camera.updateProjectionMatrix(); } return r; };
  let done = false;
  const back = () => { if (done) return; done = true; camera.far = far; camera.fov = fov; camera.updateProjectionMatrix();
    if (game.cutCam === fit) { game.cutCam = prevCam; game.camSnap = true; } game.cutscene = wasCut; };
  game.cutscene = true; t.cut(fit); camera.far = Math.max(far, 400); camera.updateProjectionMatrix();
  el.hidden = false; countEl.textContent = '0'; step(0);
  Sound.tone(392, {type:'triangle', dur:.18, vol:.08}); Sound.tone(587, {type:'triangle', t:.12, dur:.3, vol:.08});
  try {
    await t.wait(.8);
    const t0 = game.elapsed; let ticks = 0;
    Sound.hiss({dur, vol:.06, type:'bandpass', freq:700, f2:2400, q:.7});
    await t.until(() => {
      const p = clamp01((game.elapsed - t0)/dur), k = ease(p);
      step(k); countEl.textContent = fmt(years*k); unitEl.textContent = countEl.textContent === '1' ? 'year' : 'years';
      if (p*16 > ticks) { ticks++; Sound.tone(1200 + ticks*40, {type:'square', dur:.03, vol:.02, cut:3000}); }
      return p >= 1;
    });
    Sound.tone(784, {type:'triangle', dur:.3, vol:.08}); Sound.tone(1175, {type:'triangle', t:.1, dur:.5, vol:.07});
    await t.wait(1.2);
  } catch (e) { back(); throw e; } finally { el.hidden = true; }
  if (!stay) back(); else t.onEnd(back);
  return back;
}

// ---------- the slice's world ----------
const basic = o => new THREE.MeshBasicMaterial(Object.assign({fog:false}, o));
const plane = (g, wd, h, m, x, y, z, rx = 0) => { const o = new THREE.Mesh(new THREE.PlaneGeometry(wd, h), m); o.position.set(x, y, z); o.rotation.x = rx; g.add(o); return o; };
const HAZE = '#fbe2c4';
// a late-afternoon storybook sky, deep blue overhead and warm at the horizon, with a low sun and banks of
// chunky toon clouds, each lit on top and shaded underneath
const skyTex = () => tex(1024, 512, (c, cw, ch) => {
  const gr = c.createLinearGradient(0, 0, 0, ch); gr.addColorStop(0, '#5a86d0'); gr.addColorStop(.45, '#94bce6'); gr.addColorStop(.8, '#f2d2b4'); gr.addColorStop(1, HAZE);
  c.fillStyle = gr; c.fillRect(0, 0, cw, ch);
  const sun = c.createRadialGradient(cw*.74, ch*.8, 0, cw*.74, ch*.8, 150); sun.addColorStop(0, 'rgba(255,248,214,1)'); sun.addColorStop(.18, 'rgba(255,240,190,.95)'); sun.addColorStop(.22, 'rgba(255,226,170,.5)'); sun.addColorStop(1, 'rgba(255,214,160,0)');
  c.fillStyle = sun; c.fillRect(0, 0, cw, ch);
  const cloud = (x, y, s) => { const puffs = [[-70, 0, 34], [-36, -18, 44], [8, -30, 54], [52, -14, 42], [84, 2, 30]].map(([dx, dy, r]) => [x + dx*s, y + dy*s, r*s]);
    const blob = (oy, k) => { c.beginPath(); for (const [px, py, r] of puffs) { c.moveTo(px + r*k, py + oy); c.arc(px, py + oy, r*k, 0, 7); } c.fill(); };
    c.save(); c.beginPath(); c.rect(0, 0, cw, y + 10*s); c.clip();
    c.fillStyle = '#3c4a78'; blob(4*s, 1.06); c.fillStyle = '#c4d2ee'; blob(0, 1); c.fillStyle = '#f2f4fa'; blob(-9*s, .86); c.fillStyle = '#fffdf6'; blob(-20*s, .62);
    c.restore(); c.fillStyle = '#c4d2ee'; c.fillRect(x - 100*s, y + 4*s, 200*s, 6*s); };
  for (const [x, y, s] of [[150, 150, 1.1], [420, 90, .8], [640, 200, 1.3], [880, 120, .9], [300, 300, .7], [900, 290, .6]]) cloud(x, y, s);
}, 1, 1);
const GROUNDS = {
  // the open sea, its swell drawn in little toon wave marks
  sea: () => tex(256, 256, (c, cw, ch) => { c.fillStyle = '#2b78b4'; c.fillRect(0, 0, cw, ch);
    for (let i = 0; i < 18; i++) { c.fillStyle = i % 2 ? '#3a8cc6' : '#2468a2'; c.beginPath(); c.ellipse((i*83) % cw, (i*47) % ch, 46, 14, 0, 0, 7); c.fill(); }
    c.strokeStyle = 'rgba(232,248,255,.85)'; c.lineWidth = 4; c.lineCap = 'round';
    for (let i = 0; i < 12; i++) { const x = (i*97) % cw, y = (i*59 + 20) % ch; c.beginPath(); c.arc(x, y + 12, 14, Math.PI*1.2, Math.PI*1.8); c.stroke(); } }, 24, 10),
  // dry golden grass, in soft clumps
  grass: () => tex(256, 256, (c, cw, ch) => { c.fillStyle = '#d0a848'; c.fillRect(0, 0, cw, ch);
    for (let i = 0; i < 40; i++) { c.fillStyle = ['#e0bc5a', '#b88e3a', '#c8a050', '#a8a04a'][i % 4]; c.beginPath(); c.ellipse((i*97) % cw, (i*61) % ch, 26, 10, i, 0, 7); c.fill(); } }, 30, 10),
  // old black lava, greening over
  lava: () => tex(256, 256, (c, cw, ch) => { c.fillStyle = '#3a3440'; c.fillRect(0, 0, cw, ch);
    for (let i = 0; i < 30; i++) { c.fillStyle = ['#4a4250', '#2c2834', '#4e7a44', '#5e8a4a'][i % 4]; c.beginPath(); c.ellipse((i*97) % cw, (i*61) % ch, 28, 12, i, 0, 7); c.fill(); } }, 30, 10),
};
// along the far edge: rolling hills, or for an island, its own shore and the sea beyond
const farTex = kind => tex(1024, 128, (c, cw, ch) => {
  const hill = (col, amp, base, f, ph) => { c.fillStyle = col; c.beginPath(); c.moveTo(0, ch); for (let x = 0; x <= cw; x += 8) c.lineTo(x, base - amp*(.6 + .4*Math.sin(x*f + ph))*Math.abs(Math.sin(x*f*.5 + ph*2))); c.lineTo(cw, ch); c.fill();
    c.strokeStyle = 'rgba(26,19,32,.35)'; c.lineWidth = 2; c.stroke(); };
  if (kind === 'sea') return;
  if (kind === 'grass') { hill('#a8b8a4', 70, 120, .006, 1); hill('#9aac6a', 46, 124, .011, 2.5); }
  else { c.fillStyle = '#3a84bc'; c.fillRect(0, 100, cw, 28); hill('#4a4656', 40, 112, .008, .5); }
});
// the haze that softens the surface as it runs off to the horizon
const hazeTex = () => tex(16, 256, (c, cw, ch) => { const gr = c.createLinearGradient(0, 0, 0, ch); gr.addColorStop(0, HAZE); gr.addColorStop(.35, 'rgba(251,226,196,.55)'); gr.addColorStop(1, 'rgba(251,226,196,0)'); c.fillStyle = gr; c.fillRect(0, 0, cw, ch); });

// H is how high the sky goes: the slice sits deep under its place, and its sky must not poke up into it
export function diorama(g, {ground = 'sea', back = -3, top = 0, deep = 0x5a1a14, W = 500, D = 110, H = 60} = {}){
  const sky = skyTex(); sky.wrapT = THREE.ClampToEdgeWrapping; sky.repeat.set(Math.round(W/H/2), 1);
  plane(g, W, H, basic({map:sky}), 0, top + H/2 - .5, back - D);
  plane(g, W, D, basic({map:GROUNDS[ground]()}), 0, top - .02, back - D/2, -Math.PI/2);
  const hz = hazeTex(); hz.wrapS = hz.wrapT = THREE.ClampToEdgeWrapping;
  plane(g, W, D*.8, basic({map:hz, transparent:true, depthWrite:false}), 0, top + .01, back - D*.6, -Math.PI/2);
  if (ground !== 'sea') { const f = farTex(ground); f.wrapT = THREE.ClampToEdgeWrapping; f.repeat.set(3, 1);
    plane(g, W, 12, basic({map:f, transparent:true}), 0, top + 5.4, back - D + .5); }
  // below the slice, the Earth goes on down, darker the deeper it goes
  const dt = tex(16, 256, (c, cw, ch) => { const gr = c.createLinearGradient(0, 0, 0, ch), col = new THREE.Color(deep);
    gr.addColorStop(0, '#' + col.getHexString()); gr.addColorStop(1, '#' + col.clone().multiplyScalar(.35).getHexString()); c.fillStyle = gr; c.fillRect(0, 0, cw, ch); });
  dt.wrapS = dt.wrapT = THREE.ClampToEdgeWrapping;
  plane(g, W, 120, basic({map:dt}), 0, top - 60.5, back);
}

// words on the slice; `narrow` gives other words, a size or a place for a tall, narrow screen
export function label(g, text, s, at, narrow = {}){
  const make = (txt, s, at) => { const lines = txt.split('\n'), m = document.createElement('canvas').getContext('2d'); m.font = '64px Caprasimo, Georgia, serif';
    const cw = Math.ceil(Math.max(...lines.map(l => m.measureText(l).width)) + 36), ch = lines.length*84 + 24;
    const tx = tex(cw, ch, c => { c.font = '64px Caprasimo, Georgia, serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.lineJoin = 'round';
      lines.forEach((l, i) => { const y = 12 + 42 + i*84; c.lineWidth = 14; c.strokeStyle = 'rgba(26,19,32,.92)'; c.strokeText(l, cw/2, y); c.fillStyle = '#fff4dc'; c.fillText(l, cw/2, y); }); });
    tx.wrapS = tx.wrapT = THREE.ClampToEdgeWrapping;
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({map:tx, transparent:true, depthWrite:false, depthTest:false, fog:false}));
    sp.position.set(...at); sp.renderOrder = 5; sp.userData.size = [s*cw/84, s*ch/84]; g.add(sp); return sp; };
  const wideSp = make(text, s, at), tallSp = make(narrow.text || text, narrow.s || s*1.7, narrow.at || at);
  const L = {set(opacity = 1, grow = 1){ const p = tall();
    for (const [sp, on] of [[wideSp, !p], [tallSp, p]]) { sp.visible = on && opacity > 0; sp.material.opacity = opacity; sp.scale.set(sp.userData.size[0]*grow, sp.userData.size[1]*grow, 1); } }};
  L.set(); return L;
}
