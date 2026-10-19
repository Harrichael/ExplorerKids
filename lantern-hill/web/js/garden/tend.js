// Tending the vegetable garden, right there in the yard: the camera rises over the bed, seed packets
// line the bottom of the screen, and the explorer walks along the bed doing whatever the kid taps.
// One tap does the obvious thing: plants the chosen seed in bare soil, waters a thirsty plant,
// picks a ripe one, or otherwise says how that plant is doing. Taps queue up, and the explorer
// works through them in order.
//
// The explorer thinks aloud as they go, and that's where the garden teaches: a fact the first time
// each plant is sown and picked, and each of the garden's secrets the first time it matters.
// Loaded the first time someone tends the garden.

import * as THREE from 'three';
import { T, clamp01, ease, outline } from '../core/kit.js';
import { camera, renderer } from '../core/render.js';
import { Sound } from '../core/sound.js';
import { daylight } from '../hq/daylight.js';
import { hqAnims, scene } from '../hq/scene.js';
import { joy, keys } from '../input.js';
import { hero, player } from '../player.js';
import { HOME, localTime } from '../sky/observer.js';
import { game } from '../state.js';
import { closeDialog, convo, endConvo, talk, think } from '../ui/dialogue.js';
import { BED, garden, plotAt, plots, tend } from './bed.js';
import { CROP, CROPS, SECRETS } from './crops.js';
import { digUp, growth, harvest, helps, hoursLeft, inSeason, nextUnlock, picked, plant, ripe, season, thirsty, unlocked, water, damp, WET_HOURS } from './grow.js';
import { buildPlant, buildProduce } from './plants.js';

const css = document.createElement('style');
css.textContent = `
.gardening .hud,.gardening #stick,.gardening #talk,.gardening .use,.gardening #prompt{display:none!important}
.gardening.talking #garden .gtray,.gardening.talking #garden .ginfo,.gardening.talking #garden .gnote{visibility:hidden}
#garden{position:fixed;inset:0;display:flex;flex-direction:column;touch-action:none;cursor:pointer;padding-top:env(safe-area-inset-top,0px);padding-bottom:env(safe-area-inset-bottom,0px);animation:gfade .6s ease-out}
@keyframes gfade{from{opacity:0}}
#garden header{display:flex;align-items:flex-start;justify-content:space-between;gap:10px;padding:10px max(16px,env(safe-area-inset-left,0px)) 18px;background:linear-gradient(rgba(26,19,32,.7),rgba(26,19,32,0));pointer-events:none}
#garden header>*{pointer-events:auto}
#garden h2{margin:0;font-family:var(--display);font-weight:400;font-size:clamp(19px,4.6vw,26px);color:var(--parch);line-height:1.1;text-shadow:0 2px 0 var(--ink)}
#garden .when{font-weight:900;font-size:12px;letter-spacing:1px;text-transform:uppercase;color:var(--gold);text-shadow:0 1px 2px var(--ink)}
#garden .gtop{display:flex;gap:8px;align-items:center;flex-wrap:wrap;justify-content:flex-end}
#garden .basket{font-weight:900;font-size:14px;color:var(--parch);background:rgba(26,19,32,.75);border:2px solid var(--gold);border-radius:14px;padding:4px 12px;box-shadow:0 0 0 3px var(--ink);min-width:150px}
#garden .basket b{color:var(--gold);font-variant-numeric:tabular-nums}
#garden .basket .bar{height:6px;border-radius:3px;background:rgba(239,224,191,.2);margin:4px 0 2px;overflow:hidden}
#garden .basket .bar i{display:block;height:100%;background:var(--gold);border-radius:3px;transition:width .6s}
#garden .basket small{display:block;font-size:11px;color:var(--parch);opacity:.85}
#garden .basket.bump{animation:gbump .45s}
@keyframes gbump{40%{transform:scale(1.12)}}
#garden .gb{font-family:var(--display);font-size:16px;color:var(--parch);background:var(--plum);border:2.5px solid var(--gold);border-radius:14px;padding:6px 14px;box-shadow:0 0 0 3px var(--ink);cursor:pointer}
#garden .gb.ghost{background:rgba(26,19,32,.6)}
#garden .gb:focus-visible,#garden .packet:focus-visible{outline:3px solid var(--parch);outline-offset:3px}
#garden .gspace{flex:1}
#garden .gnote{align-self:center;margin-bottom:8px;font-weight:900;font-size:15px;color:var(--parch);background:rgba(26,19,32,.82);border:2px solid var(--gold);border-radius:999px;padding:5px 16px;box-shadow:0 0 0 3px var(--ink);pointer-events:none;opacity:0;transition:opacity .3s;max-width:calc(100% - 32px);text-align:center}
#garden .gnote.on{opacity:1}
#garden .gtray{display:flex;gap:10px;overflow-x:auto;padding:10px max(16px,env(safe-area-inset-left,0px)) 12px;scrollbar-width:none;background:linear-gradient(rgba(26,19,32,0),rgba(26,19,32,.7) 40%)}
#garden .gtray::-webkit-scrollbar{display:none}
#garden .packet{flex:none;width:86px;padding:6px 6px 7px;border-radius:12px;border:2.5px solid var(--ink);background:var(--pk,#e9d9b8);color:var(--ink);box-shadow:0 3px 0 var(--ink);cursor:pointer;font-family:var(--body);text-align:center;position:relative;transition:transform .15s}
#garden .packet img{width:64px;height:64px;display:block;margin:0 auto 2px;border-radius:8px;background:rgba(255,255,255,.45)}
#garden .packet b{display:block;font-weight:900;font-size:13px;line-height:1.1}
#garden .packet em{display:block;font-style:normal;font-weight:900;font-size:10px;letter-spacing:.4px;text-transform:uppercase;margin-top:2px;color:#3e6b45}
#garden .packet em.slow{color:#6a5a6e}
#garden .packet.on{transform:translateY(-6px);box-shadow:0 0 0 3px var(--gold),0 6px 0 var(--ink)}
#garden .packet.new::after{content:'NEW';position:absolute;top:-8px;right:-6px;font-weight:900;font-size:10px;background:var(--rust);color:var(--parch);border:2px solid var(--ink);border-radius:8px;padding:1px 5px}
@media (max-height:500px){#garden .packet{width:68px;padding:4px 4px 5px}#garden .packet img{width:42px;height:42px}#garden .packet b{font-size:11px}#garden .packet em{font-size:9px}#garden .gtray{padding-top:6px;padding-bottom:6px}#garden header{padding-bottom:6px}#garden .basket{min-width:120px;padding:3px 10px}#garden .gnote{font-size:13px;margin-bottom:4px}}
#garden .packet.locked{background:#5a5068;color:var(--parch);cursor:default;opacity:.85}
#garden .packet.locked img{filter:brightness(0) opacity(.45);background:none}
#garden .packet.locked em{color:var(--gold)}
#garden .ginfo{position:absolute;width:230px;background:#f6ecd6;color:var(--ink);border:2.5px solid var(--gold);border-radius:14px;box-shadow:0 0 0 3px var(--ink),0 8px 20px rgba(0,0,0,.35);padding:9px 12px 10px;font-size:13px;font-weight:800;line-height:1.35;cursor:default}
#garden .ginfo h3{margin:0 0 3px;font-family:var(--display);font-weight:400;font-size:18px;color:var(--plum)}
#garden .ginfo p{margin:2px 0}
#garden .ginfo .help{display:inline-block;margin:3px 4px 0 0;padding:1px 7px;border-radius:999px;background:#e8dcc0;font-size:12px}
#garden .ginfo .help.bad{background:#e3d3d8}
#garden .ginfo button{margin-top:7px;font-family:var(--body);font-weight:900;font-size:12px;color:var(--plum);background:none;border:2px solid var(--plum);border-radius:10px;padding:3px 10px;cursor:pointer}
#gmsg{position:absolute;left:50%;top:34%;transform:translate(-50%,-50%);text-align:center;pointer-events:none;font-family:var(--display);color:var(--parch);text-shadow:0 3px 0 var(--ink),0 0 24px rgba(217,164,65,.5);font-size:clamp(26px,7vw,42px);line-height:1.15;width:90%;opacity:0;transition:opacity .4s}
#gmsg.on{opacity:1}
#gmsg img{width:112px;height:112px;display:block;margin:0 auto 4px;border-radius:50%;background:radial-gradient(circle,rgba(255,240,200,.9) 30%,rgba(255,240,200,0) 70%)}
#gmsg small{display:block;font-family:var(--body);font-weight:900;font-size:16px;color:var(--gold);margin-top:6px;text-shadow:0 2px 0 var(--ink)}
#gjournal{position:fixed;inset:0;display:flex;align-items:center;justify-content:center;padding:16px;background:rgba(26,19,32,.6);z-index:20;animation:gfade .2s ease-out}
#gjournal .jwrap{width:min(680px,100%);max-height:100%;overflow-y:auto;background:#f6ecd6;color:var(--ink);border:3px solid var(--gold);border-radius:16px;box-shadow:0 0 0 4px var(--ink),0 14px 34px rgba(0,0,0,.45);padding:14px 16px 16px}
#gjournal header{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-bottom:8px}
#gjournal h2{margin:0;font-family:var(--display);font-weight:400;font-size:24px;color:var(--plum)}
#gjournal h3{margin:14px 0 6px;font-family:var(--display);font-weight:400;font-size:18px;color:var(--plum)}
#gjournal .jgrid{display:grid;grid-template-columns:repeat(auto-fill,minmax(190px,1fr));gap:10px}
#gjournal .jcrop{display:flex;gap:8px;background:#fff8e8;border:2px solid rgba(109,59,94,.25);border-radius:12px;padding:8px;font-size:12px;font-weight:800;line-height:1.3}
#gjournal .jcrop img{width:56px;height:56px;flex:none;border-radius:8px;background:#efe3c6}
#gjournal .jcrop.locked img{filter:brightness(0) opacity(.35);background:none}
#gjournal .jcrop b{display:block;font-size:14px;font-weight:900}
#gjournal .jcrop p{margin:3px 0 0;font-weight:700;color:#4a3a4e}
#gjournal .jcrop .seas{color:#6d3b5e}
#gjournal .jsecret{display:flex;gap:10px;align-items:flex-start;margin:6px 0;font-size:13px;font-weight:800;line-height:1.35}
#gjournal .jsecret span{font-size:22px;line-height:1}
#gjournal .jsecret.hidden{opacity:.55}
#gjournal .gb{font-family:var(--display);font-size:16px;color:var(--parch);background:var(--plum);border:2.5px solid var(--gold);border-radius:14px;padding:6px 14px;box-shadow:0 0 0 3px var(--ink);cursor:pointer}`;
document.head.appendChild(css);

const el = document.createElement('div'); el.id = 'garden'; el.hidden = true; el.setAttribute('role', 'dialog'); el.setAttribute('aria-label', 'Vegetable garden');
el.innerHTML = `<header><div><h2>Vegetable Garden</h2><div class="when" id="gWhen"></div></div>
  <div class="gtop"><div class="basket" id="gBasket"></div><button class="gb ghost" id="gJournal">Journal</button><button class="gb" id="gDone">Done</button></div></header>
  <div class="gspace"></div><div id="gmsg"></div><div class="gnote" id="gNote"></div><div class="gtray" id="gTray"></div><div class="ginfo" id="gInfo" hidden></div>`;
document.body.appendChild(el);
const $g = id => el.querySelector('#' + id);
const trayEl = $g('gTray'), infoEl = $g('gInfo'), noteEl = $g('gNote'), msgEl = $g('gmsg'), basketEl = $g('gBasket'), whenEl = $g('gWhen');

// a packet is coloured for the first season it's sown in
const PACKET = {spring:'#cfe3b0', summer:'#f2d98a', autumn:'#efc09a', winter:'#c8d8ea'};
const cap = s => s[0].toUpperCase() + s.slice(1);

// ----- the seed packets' pictures: each plant fully grown, drawn once by the game's own renderer -----
const thumbs = {};
const thumbScene = new THREE.Scene(), thumbCam = new THREE.PerspectiveCamera(30, 1, .05, 20);
thumbScene.add(new THREE.HemisphereLight(0xfff4e0, 0x6a5a4a, .75));
const thumbKey = new THREE.DirectionalLight(0xfff0d8, .7); thumbKey.position.set(-1, 2, 2); thumbScene.add(thumbKey);
function thumb(crop){
  if (thumbs[crop.id]) return thumbs[crop.id];
  const S = 128, rt = new THREE.WebGLRenderTarget(S, S, {encoding:THREE.sRGBEncoding});
  const m = buildPlant(crop, 1, {seed:3}); thumbScene.add(m.root);
  if (m.head) m.head.rotation.y = .5;
  const box = new THREE.Box3().setFromObject(m.root), c = box.getCenter(new THREE.Vector3()), size = box.getSize(new THREE.Vector3());
  const r = Math.max(size.x, size.y, size.z)*.62 + .04;
  thumbCam.position.set(c.x + r*.5, c.y + r*1.1, c.z + r*3.4); thumbCam.lookAt(c);
  const prev = renderer.getRenderTarget(), clear = renderer.getClearAlpha();
  renderer.setRenderTarget(rt); renderer.setClearColor(0x000000, 0); renderer.clear(); renderer.render(thumbScene, thumbCam);
  const px = new Uint8Array(S*S*4); renderer.readRenderTargetPixels(rt, 0, 0, S, S, px);
  renderer.setRenderTarget(prev); renderer.setClearAlpha(clear);
  thumbScene.remove(m.root); m.root.traverse(o => o.geometry && o.geometry.dispose()); rt.dispose();
  const cv = document.createElement('canvas'); cv.width = cv.height = S; const g = cv.getContext('2d'), img = g.createImageData(S, S);
  for (let y = 0; y < S; y++) img.data.set(px.subarray((S - 1 - y)*S*4, (S - y)*S*4), y*S*4);
  g.putImageData(img, 0, 0);
  return thumbs[crop.id] = cv.toDataURL();
}

// ----- the HUD -----
let chosen = null, fresh = new Set();
function drawTray(){
  const now = Date.now(), have = unlocked(garden), next = nextUnlock(garden);
  if (!chosen || !have.some(c => c.id === chosen)) chosen = (have.find(c => inSeason(c, now)) || have[0]).id;
  const order = [...have].sort((a, b) => inSeason(b, now) - inSeason(a, now));
  trayEl.innerHTML = '';
  for (const c of order) {
    const b = document.createElement('button'), good = inSeason(c, now);
    b.className = 'packet' + (c.id === chosen ? ' on' : '') + (fresh.has(c.id) ? ' new' : '');
    b.style.setProperty('--pk', PACKET[c.seasons[0]]);
    b.innerHTML = `<img alt="" src="${thumb(c)}"><b>${c.name}</b><em class="${good ? '' : 'slow'}">${good ? 'Good now!' : 'Slow now'}</em>`;
    b.setAttribute('aria-pressed', c.id === chosen);
    b.addEventListener('click', e => { e.stopPropagation(); Sound.init(); chosen = c.id; fresh.delete(c.id); Sound.tone(880, {type:'triangle', dur:.08, vol:.06}); drawTray();
      note(good ? `${c.name} seeds ready. Tap bare soil to plant!` : `${c.name} grows slowly in ${season(now)}. It likes ${c.seasons.join(' and ')}.`); });
    trayEl.appendChild(b);
  }
  if (next) {
    const b = document.createElement('div'); b.className = 'packet locked';
    b.innerHTML = `<img alt="" src="${thumb(next)}"><b>???</b><em>${next.unlock - picked(garden)} more picks</em>`;
    trayEl.appendChild(b);
  }
}
function drawBasket(){
  const n = picked(garden), next = nextUnlock(garden), prev = [...CROPS].reverse().find(c => c.unlock <= n), from = prev ? prev.unlock : 0;
  basketEl.innerHTML = `🧺 Picked <b>${n}</b>` + (next ? `<div class="bar"><i style="width:${Math.round((n - from)/(next.unlock - from)*100)}%"></i></div><small>New seeds at ${next.unlock}</small>` : `<small>Every seed found!</small>`);
}
function drawWhen(){ whenEl.textContent = `${cap(season(Date.now()))} · ${localTime(HOME, Date.now())} at Lantern Hill`; }
let noteT = 0;
function note(text, secs = 3.2){ noteEl.textContent = text; noteEl.classList.add('on'); noteT = secs; }
let msgT = 0;
function shout(html, secs = 2.6){ msgEl.innerHTML = html; msgEl.classList.add('on'); msgT = secs; }

const hours = h => h < 1 ? `${Math.max(1, Math.round(h*60))} minutes` : h < 1.25 ? 'about an hour' : h < 1.75 ? 'about an hour and a half' : `about ${Math.round(h)} hours`;
let infoFor = -1, infoT = 0;
function showInfo(i, keep){
  const p = garden.plots[i], crop = CROP[p.crop], now = Date.now();
  if (!crop) { infoEl.hidden = true; infoFor = -1; return; }
  const h = helps(garden, i, now), g = growth(p);
  const stage = g < .06 ? 'A seed, waking up' : g < .3 ? 'A little sprout' : g < .6 ? 'Growing leaves' : !ripe(p) ? (crop.fruit || crop.flower || crop.look === 'sunflower' ? 'Flowering' : 'Nearly grown') : 'Ready to pick!';
  const wait = ripe(p) ? '' : thirsty(p, now) ? '<p>💧 Thirsty! Tap to water it.</p>' : `<p>Ready in ${hours(hoursLeft(garden, i, now))}.</p><p>💧 Soil damp for ${hours((p.wet - now)/3600000)}.</p>`;
  const chips = [h.offSeason && `<span class="help bad">❄ Out of season</span>`, h.shade && `<span class="help bad">⛅ In the shade</span>`,
    h.beans && `<span class="help">🫘 Fed by beans</span>`, h.bees && `<span class="help">🐝 Bees visiting</span>`].filter(Boolean).join('');
  infoEl.innerHTML = `<h3>${crop.name}</h3><p>${stage}</p>${wait}${chips}${ripe(p) ? '' : '<br><button>Dig it up</button>'}`;
  const dig = infoEl.querySelector('button');
  if (dig) dig.addEventListener('pointerdown', e => { e.stopPropagation(); queue(i, 'dig'); infoEl.hidden = true; });
  infoEl.addEventListener('pointerdown', e => e.stopPropagation(), {once:true});
  infoEl.hidden = false; infoFor = i; if (!keep) infoT = 5; placeInfo();
}
const proj = new THREE.Vector3();
function placeInfo(){
  if (infoFor < 0) return;
  const v = plots[infoFor]; proj.set(v.x, v.top + .25, v.z).project(camera);
  const x = (proj.x + 1)/2*innerWidth, y = (1 - proj.y)/2*innerHeight, w = infoEl.offsetWidth, h = infoEl.offsetHeight;
  infoEl.style.left = Math.max(8, Math.min(innerWidth - w - 8, x - w/2)) + 'px';
  infoEl.style.top = Math.max(above, Math.min(innerHeight - h - below - 6, y - h - 12)) + 'px';
}

// ----- teaching: the explorer's thoughts -----
function tell(lines){ if (lines.length) think(lines.map(text => ({text}))); }
function factFor(crop, k){
  // the k-th fact, the first time it's due
  const told = garden.told[crop.id] || 0;
  if (told > k || k >= crop.facts.length) return null;
  garden.told[crop.id] = k + 1; return crop.facts[k];
}
function secret(k){ if (garden.secrets[k]) return null; garden.secrets[k] = true; return SECRETS[k].text; }

// ----- the explorer at work -----
const jobs = [];
let work = null, open = false, walk = 0;
const can = new THREE.Group();
{ const tin = T(0x5f8fa8), dk = T(0x3d6a80);
  const body = new THREE.Mesh(new THREE.CylinderGeometry(.09, .1, .17, 14), tin); body.rotation.x = Math.PI/2; can.add(body); outline(body, 1.06);
  const spout = new THREE.Mesh(new THREE.CylinderGeometry(.012, .02, .2, 6), dk); spout.position.set(0, .03, .16); spout.rotation.x = 1.0; can.add(spout);
  const rose = new THREE.Mesh(new THREE.CylinderGeometry(.03, .018, .03, 8), dk); rose.position.set(0, .1, .24); rose.rotation.x = 1.0; can.add(rose);
  const handle = new THREE.Mesh(new THREE.TorusGeometry(.07, .012, 5, 12, Math.PI), dk); handle.position.set(0, .07, -.02); handle.rotation.y = Math.PI/2; can.add(handle);
  can.userData.rose = rose; can.visible = false; }
const DROPS = 40, dropPos = new Float32Array(DROPS*3), drops = Array.from({length:DROPS}, () => ({life:0, x:0, y:0, z:0, vx:0, vy:0, vz:0}));
const dropGeo = new THREE.BufferGeometry(); dropGeo.setAttribute('position', new THREE.BufferAttribute(dropPos, 3));
const dropPts = new THREE.Points(dropGeo, new THREE.PointsMaterial({color:0x9fd8ff, size:.05, transparent:true, opacity:.9, depthWrite:false}));
dropPts.frustumCulled = false; scene.add(dropPts);
const flying = [];

const spotFor = i => { const {x} = plotAt(i); return {x: x - .3, z: BED.front + .42}; };
function queue(i, kind){
  if (jobs.some(j => j.i === i) || (work && work.i === i) || jobs.length > 6) return;
  jobs.push({i, kind, crop:kind === 'plant' ? chosen : null});
}

const DUR = {plant:.9, water:1.3, pick:1.0, dig:.9};
function begin(j){
  const p = garden.plots[j.i];
  // the plot may have changed while the job waited its turn
  if (j.kind === 'plant' && p.crop) return false;
  if (j.kind === 'pick' && !ripe(p)) return false;
  if ((j.kind === 'water' || j.kind === 'dig') && !p.crop) return false;
  work = Object.assign(j, {phase:'walk', t:0, done:false}); return true;
}
function act(j){
  const now = Date.now(), v = plots[j.i], lines = [];
  if (j.kind === 'plant') {
    if (!tend(g => plant(g, j.i, j.crop, now))) return;
    const crop = CROP[j.crop], h = helps(garden, j.i, now);
    v.pop = 1; Sound.tone(190, {dur:.12, vol:.12, f2:110}); Sound.hiss({dur:.14, vol:.06, freq:500});
    const f = factFor(crop, 0); if (f) lines.push(f);
    if (h.offSeason) { const s = secret('season'); if (s) lines.push(s); else note(`${crop.name} grows slowly in ${season(now)}.`); }
    if (h.shade) { const s = secret('shade'); if (s) lines.push(s); else note('That spot is in the shade of a tall plant.'); }
    if (!damp(garden.plots[j.i], now)) { if (!garden.secrets.water) { garden.secrets.water = true; lines.push('Seeds need water to wake up! Tap the new seed again to water it.'); } else note('Tap it again to give it a drink!'); }
    tend(() => {});
  } else if (j.kind === 'water') {
    tend(g => water(g, j.i, now)); Sound.hiss({dur:1, vol:.06, type:'bandpass', freq:3000, q:.7, attack:.15});
    note(`Ahh! The ${CROP[garden.plots[j.i].crop].name.toLowerCase()} has a drink. Damp soil lasts about ${WET_HOURS} hours.`);
    const h = helps(garden, j.i, now);
    if (h.beans) { const s = secret('beans'); if (s) lines.push(s); }
  } else if (j.kind === 'pick') {
    const r = tend(g => harvest(g, j.i, now)); if (!r) return;
    const before = picked(garden) - r.n, gained = unlocked(garden).filter(c => c.unlock > before);
    v.pop = 1; [784, 988, 1319].forEach((f, k) => Sound.tone(f, {type:'triangle', t:k*.06, dur:.18, vol:.07}));
    for (let k = 0; k < r.n; k++) fly(r.crop, j.i, k*.15);
    note(r.n > 1 ? `Two ${r.crop.plural}! The bees helped.` : `${r.crop.name} picked!`);
    if (r.bees) { const s = secret('bees'); if (s) lines.push(s); }
    const f = factFor(r.crop, 1) || ((garden.picked[r.crop.id] % 4 === 0) && factFor(r.crop, 2)); if (f) lines.push(f);
    if (r.crop.again && (garden.picked[r.crop.id] || 0) <= r.n) lines.push(`The ${r.crop.name.toLowerCase()} plant is still growing. It will make more!`);
    for (const c of gained) { fresh.add(c.id); chosen = c.id; setTimeout(() => { shout(`<img alt="" src="${thumb(c)}">New seeds!<small>${c.name}</small>`); [1047, 1319, 1568, 2093].forEach((f, k) => Sound.tone(f, {type:'sine', t:k*.09, dur:.5, vol:.06})); }, 700); }
    tend(() => {}); drawBasket(); drawTray();
    basketEl.classList.remove('bump'); void basketEl.offsetWidth; basketEl.classList.add('bump');
  } else if (j.kind === 'dig') {
    tend(g => digUp(g, j.i, now)); v.pop = 1; Sound.hiss({dur:.25, vol:.08, freq:400}); note('Dug up. That spot is ready for a new seed.');
  }
  tell(lines);
}
const tmp = new THREE.Vector3();
function fly(crop, i, delay){
  const m = buildProduce(crop), {x, z} = plotAt(i); m.position.set(x, .3, z); m.scale.setScalar(.001); scene.add(m);
  flying.push({m, t:-delay, x, z});
}

function turnTo(a, k){ let d = a - player.angle; d = Math.atan2(Math.sin(d), Math.cos(d)); player.angle += d*Math.min(1, k); return Math.abs(d); }
function pose({legs = 0, lift = 0, armL = 0, armR = 0}){
  hero.root.position.set(player.x, player.y, player.z); hero.root.rotation.y = player.angle;
  hero.legL.rotation.x = legs; hero.legR.rotation.x = legs; hero.body.position.y = lift;
  hero.armL.rotation.x = armL; hero.armR.rotation.x = armR;
}
function crouch(p, arms){ pose({legs:-1.25*p, lift:-.3*p, armL:arms*p, armR:arms*p}); }

// true once there; beside the bed, they step out to its front first rather than cut through the corner
function walkTo(spot, dt){
  const to = player.z < BED.front + .3 ? {x:player.x, z:spot.z} : spot;
  const dx = to.x - player.x, dz = to.z - player.z, d = Math.hypot(dx, dz);
  if (d < .04) { pose({}); return to === spot; }
  const st = Math.min(d, 3*dt); player.x += dx/d*st; player.z += dz/d*st; turnTo(Math.atan2(dx, dz), dt*12); walk += dt*9.5;
  const sg = Math.sign(Math.sin(walk)); if (sg !== player.lastStepSign && sg !== 0) { player.lastStepSign = sg; Sound.step('grass'); }
  const sw = Math.sin(walk)*.6; pose({}); hero.legL.rotation.x = sw; hero.legR.rotation.x = -sw; hero.armL.rotation.x = -sw*.8; hero.armR.rotation.x = sw*.8;
  return false;
}
// between jobs the explorer stands back, so their head isn't in front of the plants
const IDLE = .95;
function step(dt){
  if (!work && jobs.length) { const j = jobs.shift(); begin(j); }
  if (!work) { if (walkTo({x:player.x, z:BED.front + IDLE}, dt)) turnTo(Math.PI, dt*6); return; }
  const w = work; w.t += dt;
  if (w.phase === 'walk') {
    if (walkTo(spotFor(w.i), dt)) { w.phase = 'turn'; w.t = 0; }
  } else if (w.phase === 'turn') {
    const {x, z} = plotAt(w.i);
    if (turnTo(Math.atan2(x - player.x, z - player.z), dt*10) < .06) { w.phase = 'act'; w.t = 0; }
    pose({});
  } else {
    const p = clamp01(w.t/DUR[w.kind]), bend = Math.sin(Math.min(1, p*1.25)*Math.PI);
    if (w.kind === 'water') {
      pose({armR:-1.25*ease(clamp01(p*4)), armL:0});
      if (can.parent !== hero.armR) hero.armR.add(can);
      can.visible = true; can.position.set(0, -.62, .14); can.rotation.x = -.9 + .9*ease(clamp01(p*3))*(1 - clamp01((p - .85)*6));
      if (p > .25 && p < .85) pour(w.i, dt);
    } else crouch(bend, w.kind === 'pick' && p > .55 ? -2.2 : -1.0);
    if (!w.done && p > .5) { w.done = true; act(w); }
    if (p >= 1) { can.visible = false; work = null; }
  }
}
const rosePos = new THREE.Vector3();
let dropAcc = 0;
function pour(i, dt){
  can.userData.rose.getWorldPosition(rosePos); const {x, z} = plotAt(i);
  for (dropAcc += dt*60; dropAcc >= 1; dropAcc--) {
    const d = drops.find(q => q.life <= 0); if (!d) break;
    Object.assign(d, {life:1, x:rosePos.x, y:rosePos.y, z:rosePos.z, vx:(x - rosePos.x)*1.6 + (Math.random() - .5)*.3, vy:.3, vz:(z - rosePos.z)*1.6 + (Math.random() - .5)*.3});
  }
}
hqAnims.push(dt => {
  for (let k = 0; k < DROPS; k++) { const d = drops[k];
    if (d.life > 0) { d.vy -= 9*dt; d.x += d.vx*dt; d.y += d.vy*dt; d.z += d.vz*dt; if (d.y < .2) d.life = 0; }
    dropPos.set(d.life > 0 ? [d.x, d.y, d.z] : [0, -10, 0], k*3); }
  dropGeo.attributes.position.needsUpdate = true;
  for (let k = flying.length - 1; k >= 0; k--) { const f = flying[k]; f.t += dt; if (f.t < 0) continue;
    const p = clamp01(f.t/1.1), s = Math.sin(Math.min(1, p*2.2)*Math.PI/2)*(1 - clamp01((p - .75)*4));
    hero.body.getWorldPosition(tmp);
    f.m.position.set(f.x + (tmp.x - f.x)*ease(clamp01((p - .35)/.65)), .3 + Math.sin(p*Math.PI)*.9 + (tmp.y + .6 - .3)*ease(clamp01((p - .35)/.65))*.5, f.z + (tmp.z - f.z)*ease(clamp01((p - .35)/.65)));
    f.m.rotation.y += dt*5; f.m.scale.setScalar(Math.max(.001, s*1.4));
    if (p >= 1) { scene.remove(f.m); f.m.traverse(o => o.geometry && o.geometry.dispose()); flying.splice(k, 1); }
  }
  if (open || shift) slide(dt);
  if (!open) return;
  if (!joy.x && !joy.y) free = true; else if (free) { close(); return; }
  step(dt);
  if ((noteT -= dt) <= 0) noteEl.classList.remove('on');
  if ((msgT -= dt) <= 0) msgEl.classList.remove('on');
  if (infoFor >= 0) { if ((infoT -= dt) <= 0) { infoEl.hidden = true; infoFor = -1; } else placeInfo(); }
  if ((clockT -= dt) <= 0) { clockT = 1; drawWhen(); if (infoFor >= 0) showInfo(infoFor, true); }
});
let free = false, clockT = 0;

// ----- the camera: over the front of the bed, far enough back that the whole bed and its tallest plants fit -----
const look = new THREE.Vector3(BED.x, .45, BED.z + .2), from = new THREE.Vector3(0, .87, .5).normalize();
// The header and the seed packets cover the top and bottom of the screen, so the bed is fitted into
// the strip between them, and the picture slid up to centre it there.
let above = 0, below = 0;
function measure(){ above = el.querySelector('header').getBoundingClientRect().bottom - 10; below = innerHeight - trayEl.getBoundingClientRect().top; }
addEventListener('resize', () => { if (open) measure(); });
function gardenCam(pos, at){
  const H = innerHeight, free = Math.max(.3, (H - above - below)/H);
  const vf = THREE.MathUtils.degToRad(camera.fov)/2, hf = Math.atan(Math.tan(vf)*camera.aspect);
  const d = Math.max(2.2/Math.tan(hf), 1.25/(Math.tan(vf)*free));
  pos.copy(look).addScaledVector(from, d); at.copy(look);
}
// the slide eases in and out with the camera's move, and lets go of the camera once back at 0
let shift = 0;
function slide(dt){
  const want = open ? (below - above)/2 : 0;
  shift += (want - shift)*Math.min(1, dt*2.2);
  if (!open && Math.abs(shift) < .5) { if (camera.view && camera.view.enabled) camera.clearViewOffset(); return; }
  camera.setViewOffset(innerWidth, innerHeight, 0, shift, innerWidth, innerHeight);
}

// ----- taps -----
const ray = new THREE.Raycaster(), ndc = new THREE.Vector2(), hitP = new THREE.Vector3(), ground = new THREE.Plane(new THREE.Vector3(0, 1, 0), -.2);
// The soil square under the finger wins, since tall plants stand in front of the plots behind them;
// a tap on a plant counts only where it rises above the bed, like a sunflower's head.
function plotUnder(cx, cy){
  ndc.set(cx/innerWidth*2 - 1, -(cy/innerHeight)*2 + 1); ray.setFromCamera(ndc, camera);
  const half = BED.pitch/2, onSoil = ray.ray.intersectPlane(ground, hitP) && plots.findIndex(v => Math.abs(hitP.x - v.x) < half && Math.abs(hitP.z - v.z) < half);
  if (onSoil >= 0) return onSoil;
  const hit = ray.intersectObjects(plots.map(v => v.holder), true)[0];
  for (let o = hit && hit.object; o; o = o.parent) { const i = plots.findIndex(v => v.holder === o); if (i >= 0) return i; }
  return -1;
}
function tap(i){
  const p = garden.plots[i], now = Date.now();
  if (!p.crop) {
    if (!chosen) { note('Pick a seed packet first!'); return; }
    queue(i, 'plant'); return;
  }
  if (ripe(p)) { queue(i, 'pick'); return; }
  if (thirsty(p, now)) { queue(i, 'water'); return; }
  showInfo(i); Sound.tone(660, {type:'triangle', dur:.08, vol:.05});
}
el.addEventListener('pointerdown', e => {
  if (e.target.closest('button,.ginfo,.gtray')) return;
  e.preventDefault(); Sound.init();
  if (convo) { talk(); return; }
  const i = plotUnder(e.clientX, e.clientY);
  if (i < 0) { infoEl.hidden = true; infoFor = -1; return; }
  tap(i);
});
$g('gDone').addEventListener('click', e => { e.stopPropagation(); close(); });
$g('gJournal').addEventListener('click', e => { e.stopPropagation(); Sound.open(); openJournal(); });
const MOVE_KEYS = new Set(['Escape', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight']);
addEventListener('keydown', e => {
  if (!open || e.repeat) return;
  if (journal) { if (e.key === 'Escape') closeJournal(); return; }
  if (MOVE_KEYS.has(e.key) && !convo) close();
});

// ----- the journal: every plant met so far, what was learned, and the garden's secrets -----
let journal = null;
function openJournal(){
  const now = Date.now(), have = new Set(unlocked(garden).map(c => c.id));
  journal = document.createElement('div'); journal.id = 'gjournal';
  const crops = CROPS.map(c => {
    const told = garden.told[c.id] || 0, n = garden.picked[c.id] || 0, on = have.has(c.id);
    const facts = on ? c.facts.slice(0, told).map(f => `<p>${f}</p>`).join('') || '<p>Plant one to learn about it.</p>' : `<p>Pick ${c.unlock} in all to get these seeds.</p>`;
    return `<div class="jcrop${on ? '' : ' locked'}"><img alt="" src="${thumb(c)}"><div><b>${on ? c.name : '???'}</b>
      ${on ? `<span class="seas">${c.seasons.map(cap).join(', ')}${inSeason(c, now) ? ' · good now' : ''}</span> · grows in ${hours(c.hours)}<br>Picked: ${n}` : ''}${facts}</div></div>`;
  }).join('');
  const secrets = Object.entries(SECRETS).map(([k, s]) => garden.secrets[k]
    ? `<div class="jsecret"><span>${s.icon}</span><div><b>${s.name}</b><br>${s.text}</div></div>`
    : `<div class="jsecret hidden"><span>❔</span><div><b>A secret not yet found</b><br>Keep gardening to discover it.</div></div>`).join('');
  journal.innerHTML = `<div class="jwrap"><header><h2>Garden Journal</h2><button class="gb">Close</button></header>
    <h3>Garden secrets</h3>${secrets}<h3>My plants</h3><div class="jgrid">${crops}</div></div>`;
  journal.querySelector('button').addEventListener('click', closeJournal);
  journal.addEventListener('pointerdown', e => { e.stopPropagation(); if (e.target === journal) closeJournal(); });
  document.body.appendChild(journal);
}
function closeJournal(){ if (!journal) return; journal.remove(); journal = null; Sound.close(); }

// ----- coming and going -----
export function openGarden(){
  if (open || game.cutscene) return;
  closeDialog(); for (const k in keys) keys[k] = false;
  open = true; free = false; game.cutscene = true; game.cutCam = gardenCam; jobs.length = 0; work = null;
  document.documentElement.classList.add('gardening'); el.hidden = false;
  Sound.duck(true); [523, 659, 784, 1047].forEach((f, k) => Sound.tone(f, {type:'triangle', t:k*.07, dur:.2, vol:.07}));
  drawTray(); drawBasket(); drawWhen(); measure();
  const now = Date.now(), lines = [];
  if (!garden.secrets.hello) {
    garden.secrets.hello = true; tend(() => {});
    lines.push('My very own vegetable garden! Plants need three things to grow: sunshine, water, and good soil.',
      'First I pick a seed packet down below. Then I tap a square of soil to plant it.',
      `It's ${season(now)} at Lantern Hill. Seeds marked "Good now!" grow best this time of year.`);
  } else {
    const dry = garden.plots.filter(p => thirsty(p, now)).length, ready = garden.plots.filter(ripe).length;
    note(ready ? `${ready} ${ready === 1 ? 'plant is' : 'plants are'} ready to pick!` : dry ? `${dry} thirsty ${dry === 1 ? 'plant' : 'plants'}. Tap to water.` : daylight.night > .5 ? 'The garden is sleeping under the stars.' : 'Everything is growing nicely.', 4);
  }
  setTimeout(() => { if (open) tell(lines); }, 1300);
}
function close(){
  if (!open) return;
  if (convo) endConvo(true);
  closeJournal();
  open = false; el.hidden = true; infoEl.hidden = true; infoFor = -1; can.visible = false; jobs.length = 0;
  work = null;
  document.documentElement.classList.remove('gardening');
  game.cutCam = null; game.cutscene = false; pose({});
  Sound.duck(false); Sound.close();
}
