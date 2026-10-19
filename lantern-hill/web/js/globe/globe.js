// The Explorer's Globe in the Library Nook. There's no separate screen: the explorer steps up to the
// real globe, the camera leans in, and Professor Hoot asks them to guess before he tells. It's two
// globes in one, and the explorer picks which as they step up.
//
// The biome globe: pick a biome and Hoot gives a riddle about its weather to find it by; open a food
// web and it pops up as a diorama on the floor beside the globe, built a guess at a time as the
// explorer works out who eats whom; then ask what would happen if one animal disappeared. Tapping anywhere just visits it.
// The geography globe is the real Earth from space, and lives in real-earth.js; this file keeps
// the room globe, the camera and the hands for both.
// Loaded the first time someone uses the globe; once the map is painted, the globe keeps it.

import * as THREE from 'three';
import { C, T, outline } from '../core/kit.js';
import { camera, canvas } from '../core/render.js';
import { Sound } from '../core/sound.js';
import { BIOMES, visit } from '../earth/biomes.js';
import { arc } from '../earth/model.js';
import { GLOBE, globeBall, globeRing } from '../hq/cottage.js';
import { hqAnims, scene } from '../hq/scene.js';
import { sitDown, standUp } from '../hq/sit.js';
import { keys, setSound } from '../input.js';
import { blob, hero } from '../player.js';
import { load, save } from '../save.js';
import { game } from '../state.js';
import { closeDialog, convo, endConvo, story } from '../ui/dialogue.js';
import { clearMarks, dioramaSize, enter, growArrows, hideDiorama, markAnimal, pickAnimal, restore, selectAnimal, showDiorama, spotlight, updateDiorama, vanish } from './diorama.js';
import { arrivals, asked, eatenBy, makers, whatIf } from './food-web.js';
import { earthMap, paintGlow } from './paint.js';
import { makeRealEarth } from './real-earth.js';

const css = document.createElement('style');
css.textContent = `
.globing .hud .plate,.globing .hud .keys,.globing .hud .hudbtns,.globing #stick,.globing #talk,.globing .use,.globing #prompt{display:none!important}
#globeHud{position:fixed;inset:0;pointer-events:none;padding:calc(10px + env(safe-area-inset-top,0px)) max(16px,env(safe-area-inset-right,0px)) env(safe-area-inset-bottom,0px) max(16px,env(safe-area-inset-left,0px));display:flex;flex-direction:column;gap:8px;animation:fadein .4s ease-out}
#globeHud button{pointer-events:auto;cursor:pointer;font-family:var(--body)}
#globeHud button:focus-visible{outline:3px solid var(--parch);outline-offset:3px}
.gh-top{display:flex;align-items:flex-start;justify-content:space-between;gap:10px}
.gh-title{background:rgba(26,19,32,.82);border:2px solid var(--gold);border-radius:14px;padding:5px 14px 7px;box-shadow:0 0 0 3px var(--ink)}
.gh-title .sub{font-weight:900;font-size:11px;letter-spacing:1.4px;text-transform:uppercase;color:var(--gold)}
.gh-title h2{margin:0;font-family:var(--display);font-weight:400;font-size:clamp(18px,4.4vw,23px);line-height:1.1;color:var(--parch);white-space:nowrap}
.gh-btns{display:flex;justify-content:flex-end;gap:8px}
.gmode{display:flex;gap:4px;margin-top:5px}
.gmode button{font-weight:900;font-size:12px;color:var(--parch);background:rgba(26,19,32,.6);border:2px solid rgba(217,164,65,.5);border-radius:999px;padding:2px 9px}
.gmode button[aria-pressed=true]{background:var(--gold);color:var(--ink);border-color:var(--gold)}
#gCard .gpick{display:flex;flex-direction:column;gap:8px}
#gCard .gpick button{text-align:left;font-family:var(--body);color:var(--ink);background:#fbf4e2;border:3px solid var(--ink);border-radius:14px;padding:9px 12px;box-shadow:0 3px 0 var(--ink)}
#gCard .gpick button.last{border-color:var(--plum);box-shadow:0 0 0 3px var(--gold),0 3px 0 var(--ink)}
#gCard .gpick b{display:block;font-family:var(--display);font-weight:400;font-size:19px}
#gCard .gpick span{display:block;font-weight:800;font-size:13px;line-height:1.35;color:#5a4a5e}
.gpill{white-space:nowrap;font-weight:900;font-size:13px;color:var(--parch);background:rgba(26,19,32,.82);border:2px solid var(--gold);border-radius:999px;padding:5px 12px;box-shadow:0 0 0 3px var(--ink)}
#gCard{pointer-events:auto;position:absolute;right:max(16px,env(safe-area-inset-right,0px));top:calc(74px + env(safe-area-inset-top,0px));width:min(350px,38vw);max-height:calc(100% - 74px - 92px - env(safe-area-inset-top,0px));overflow:auto;box-sizing:border-box;background:linear-gradient(180deg,#f6ecd6,#ecdcb8);color:var(--ink);border:3px solid var(--gold);border-radius:18px;box-shadow:0 0 0 4px var(--ink),0 14px 30px rgba(0,0,0,.4);padding:12px 15px 14px;display:flex;flex-direction:column;gap:8px}
.talking #gCard{max-height:calc(100% - 74px - 210px - env(safe-area-inset-top,0px))}
#gCard>*{flex-shrink:0}
#gCard .gtop{display:flex;gap:11px;align-items:center}
#gCard .gicon{flex:none;width:48px;height:48px;border-radius:50%;display:grid;place-items:center;font-size:26px;background:var(--c,#2a5b8c);border:3px solid var(--ink)}
#gCard .gkind{font-size:12px;font-weight:900;letter-spacing:1.2px;text-transform:uppercase;color:#6d3b5e}
#gCard h3{margin:0;font-family:var(--display);font-weight:400;font-size:20px;line-height:1.15}
#gCard .gwithin{font-size:13px;font-weight:800;color:#6d3b5e}
#gCard p{margin:0;font-weight:800;font-size:15px;line-height:1.45}
#gCard .gask{font-size:16px;color:#3a2340}
#gCard .gfrom{font-size:13px;font-weight:800;color:#5a4a5e}
#gCard .ghint{font-weight:900;font-size:16px;line-height:1.45;color:#6d3b5e;text-align:center;padding:6px 2px}
#gCard .gtry{background:rgba(109,59,94,.1);border-radius:10px;padding:6px 10px;font-size:14px}
#gCard .gbtns{display:flex;flex-wrap:wrap;gap:8px;margin-top:2px}
#gCard .gb{font-family:var(--display);font-size:16px;color:var(--parch);background:var(--plum);border:2.5px solid var(--gold);border-radius:14px;padding:6px 14px;box-shadow:0 0 0 3px var(--ink)}
#gCard .gb.ghost{background:#5a4a5e}
#gCard .gb:disabled{opacity:.45;cursor:default}
.gstrip{display:grid;grid-template-columns:repeat(auto-fill,minmax(68px,1fr));gap:6px}
.gstrip button{display:flex;flex-direction:column;align-items:center;gap:1px;min-width:0;border-radius:14px;border:2.5px solid var(--ink);background:#fbf4e2;color:var(--ink);padding:4px 2px 5px}
.gstrip i{font-style:normal;font-size:28px;line-height:1.15}
.gstrip b{align-self:stretch;font-size:10px;font-weight:900;line-height:1.1;text-align:center;overflow-wrap:break-word;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}
.gstrip button.maker{background:#cfe6b8}
.gstrip button.sel{border-color:var(--gold);box-shadow:0 0 0 3px var(--gold)}
.gstrip button.guess{box-shadow:0 0 0 3px #d9a441}
.gstrip button.right{box-shadow:0 0 0 3px #3e9b54}.gstrip button.wrong{box-shadow:0 0 0 3px #c4473a}.gstrip button.missed{box-shadow:0 0 0 3px #e0802e}
.gstrip button.gone{opacity:.25}
.gstrip button.wait{opacity:.35}
.gsay{font-weight:800;font-size:15px;line-height:1.45;min-height:2.9em}
.gsay .eats{color:#2f7a3a}.gsay .by{color:#b5552f}
.gphoto{margin:0 0 6px}
.gphoto img{display:block;width:100%;aspect-ratio:4/3;object-fit:cover;border-radius:12px;border:3px solid var(--ink);background:#d8c8a4}
.gphoto figcaption{margin-top:2px;font-size:10px;font-weight:700;color:#7a6a7e;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.gphoto figcaption a{color:inherit}
.gwhat{display:flex;align-items:center;gap:6px;flex-wrap:wrap;font-weight:900;font-size:15px}
.gwhat span{flex:1;min-width:120px}
.gwhat button{font-weight:900;font-size:14px;border:2px solid var(--ink);border-radius:999px;padding:3px 11px;background:#fbf4e2;color:var(--ink)}
.gwhat button.on{background:var(--plum);color:var(--parch)}
.gwhat b{width:100%;font-size:14px}
.gwhat b.ok{color:#2f7a3a}.gwhat b.no{color:#b5552f}
.gbar{position:absolute;left:0;right:0;bottom:calc(6px + env(safe-area-inset-bottom,0px));display:flex;align-items:center;gap:10px;padding:0 max(16px,env(safe-area-inset-left,0px))}
.talking .gbar,.talking .gcredit{visibility:hidden}
.gfound{flex:none;font-weight:900;font-size:13px;color:var(--gold);background:rgba(26,19,32,.82);border:2px solid var(--gold);border-radius:999px;padding:4px 10px;font-variant-numeric:tabular-nums;white-space:nowrap}
.gchips{pointer-events:auto;display:flex;gap:8px;overflow-x:auto;padding:4px 2px 8px;scrollbar-width:thin;touch-action:pan-x}
.gchip{flex:none;display:flex;align-items:center;gap:6px;font-weight:800;font-size:13px;color:var(--parch);background:rgba(26,19,32,.8);border:2px dashed rgba(217,164,65,.6);border-radius:999px;padding:4px 12px 4px 5px;white-space:nowrap}
.gchip i{font-style:normal;width:24px;height:24px;border-radius:50%;display:grid;place-items:center;background:var(--c);border:2px solid var(--ink);font-size:13px}
.gchip.found{border-style:solid;border-color:var(--gold);background:rgba(109,59,94,.9)}
.gchip.found::after{content:"✓";color:var(--gold);font-weight:900}
.gchip.hunting{background:var(--teal);border-style:solid}
.gcredit{position:absolute;right:16px;bottom:calc(58px + env(safe-area-inset-bottom,0px));font-size:10px;font-weight:700;color:rgba(239,224,191,.55);text-align:right;max-width:50%}
#gAnimal{pointer-events:auto;position:absolute;inset:0;z-index:3;display:grid;place-items:center;padding:16px;background:rgba(16,12,22,.55);animation:fadein .2s ease-out}
#gAnimal[hidden]{display:none}
#gAnimal article{position:relative;width:min(460px,100%);max-height:100%;overflow:auto;box-sizing:border-box;background:linear-gradient(180deg,#f6ecd6,#ecdcb8);color:var(--ink);border:3px solid var(--gold);border-radius:20px;box-shadow:0 0 0 4px var(--ink),0 18px 40px rgba(0,0,0,.5);padding:14px 16px 16px;display:flex;flex-direction:column;gap:9px}
#gAnimal .gphoto{float:none;width:auto;margin:0}#gAnimal .gphoto img{aspect-ratio:4/3;border-width:3px;border-radius:12px}
#gAnimal h3{margin:0 44px 0 0;font-family:var(--display);font-weight:400;font-size:26px;line-height:1.1}
#gAnimal p{margin:0;font-weight:800;font-size:16px;line-height:1.45}
#gAnimal .gsay{min-height:0}
#gAnimal .gx{position:absolute;top:10px;right:10px;width:40px;height:40px;border-radius:50%;font-size:20px;font-weight:900;color:var(--parch);background:var(--plum);border:2.5px solid var(--gold);box-shadow:0 0 0 3px var(--ink);padding:0}
#gtoast{position:absolute;left:50%;top:44%;transform:translateX(-50%);background:#efe0bf;color:var(--ink);border:3px solid var(--gold);border-radius:14px;box-shadow:0 0 0 4px var(--ink);padding:6px 18px 8px;text-align:center;white-space:nowrap;pointer-events:none;animation:bannerIn 3s ease both;z-index:2}
#gtoast b{display:block;font-family:var(--display);font-weight:400;font-size:clamp(17px,4.5vw,22px)}
#gtoast small{font-weight:900;font-size:11px;letter-spacing:1.2px;text-transform:uppercase;color:#6d3b5e}
@media (max-aspect-ratio:1/1){#gCard{left:max(16px,env(safe-area-inset-left,0px));right:max(16px,env(safe-area-inset-right,0px));width:auto;top:calc(96px + env(safe-area-inset-top,0px));max-height:36%}
  .talking #gCard{max-height:38%}#gCard{padding:9px 12px 11px;gap:6px}#gCard .gicon{width:36px;height:36px;font-size:19px}#gCard h3{font-size:18px}
  #gCard p{font-size:14px}#gCard .gask{font-size:15px}.gstrip{grid-template-columns:repeat(auto-fill,minmax(50px,1fr))}.gstrip i{font-size:24px}.gcredit{display:none}}
@media (max-aspect-ratio:1/1),(max-height:500px){.gphoto{float:left;width:42%;margin:0 10px 2px 0}.gphoto img{border-width:2px;border-radius:9px}}
@media (prefers-reduced-motion:reduce){#globeHud,#gtoast,#gAnimal{animation:none}}`;
document.head.appendChild(css);

const hud = document.createElement('div'); hud.id = 'globeHud'; hud.hidden = true;
hud.innerHTML = `<div class="gh-top"><div class="gh-title"><div class="sub">Library Nook</div><h2>Explorer's Globe</h2>
    <div class="gmode" role="group" aria-label="Which globe"><button data-m="biomes">🌿 Biomes</button><button data-m="geo">🗺️ Geography</button></div></div>
    <div class="gh-btns"><button class="gpill" id="gBack" hidden aria-label="Back to the globe">← Globe</button><button class="gpill" id="gLeave">Step away</button></div></div>
  <aside id="gCard" aria-live="polite"></aside>
  <div class="gcredit" id="gCredit"></div>
  <div id="gAnimal" hidden></div>
  <div class="gbar"><span class="gfound" id="gFound"></span><div class="gchips" id="gChips" role="group" aria-label="Riddles"></div></div>`;
document.body.appendChild(hud);
const $g = id => hud.querySelector('#' + id), card = $g('gCard'), animalCard = $g('gAnimal');
animalCard.addEventListener('click', e => { if (e.target === animalCard || e.target.closest('.gx')) closeAnimal(); });

const stored = load('globe') || {}, list = v => Array.isArray(v) ? v : [];
const found = new Set(list(stored.found)), learned = new Set(list(stored.webs));
let met = !!stored.met;
// what the geography globe keeps: the wonders and landforms found, its lens, and which globe was picked last
const store = {wonders: new Set(list(stored.wonders)), landforms: new Set(list(stored.landforms)), lens: stored.lens, metGeo: !!stored.metGeo, mode: stored.mode === 'geo' ? 'geo' : 'biomes'};
const keep = () => save('globe', {found: [...found], webs: [...learned], met, wonders: [...store.wonders], landforms: [...store.landforms], lens: store.lens, metGeo: store.metGeo, mode: store.mode});
const ALL = Object.keys(BIOMES);
const H = text => ['hoot', text];
const tune = (notes, o = {}) => notes.forEach((f, i) => Sound.tone(f, {type: 'triangle', t: i*(o.gap || .08), dur: o.dur || .2, vol: o.vol || .06}));
const lower = names => names.map(n => n.toLowerCase());
const and = words => words.length < 2 ? words.join('') : words.slice(0, -1).join(', ') + (words.length > 2 ? ',' : '') + ' and ' + words[words.length - 1];

// ---------- the globe in the room, steered while the explorer is at it ----------
const RAD = Math.PI/180, R = .4, PITCH = 1.35, wrap = a => Math.atan2(Math.sin(a), Math.cos(a));
const center = new THREE.Vector3(GLOBE.x, GLOBE.y, GLOBE.z);
// Food webs pop up on the floor at the globe's right, a little toward the explorer to clear the potted
// plant beyond. The diorama and the camera both turn to face along the line from the globe, so the globe
// stands beside the web on screen rather than behind it.
const WEB_AT = new THREE.Vector3(GLOBE.x + 1.3, 0, GLOBE.z + .9), WEB_TURN = Math.atan2(-(WEB_AT.z - GLOBE.z), WEB_AT.x - GLOBE.x);
const pin = new THREE.Group(); pin.visible = false; globeBall.add(pin);
{ const stick = new THREE.Mesh(new THREE.CylinderGeometry(.003, .003, .055, 6), T(C.ink)); stick.position.y = .027; pin.add(stick);
  const head = new THREE.Mesh(new THREE.SphereGeometry(.013, 14, 10), T(0xe0453a)); head.position.y = .055; outline(head, 1.25); pin.add(head); }
const glow = new THREE.Mesh(new THREE.SphereGeometry(R*1.006, 64, 40), new THREE.MeshBasicMaterial({color: 0xfff1b0, transparent: true, opacity: 0, depthWrite: false}));
glow.visible = false; globeBall.add(glow);
// a point on the globe's surface in its own frame; matches three's sphere UVs
const surface = (lat, lon) => new THREE.Vector3(Math.cos(lat*RAD)*Math.cos(lon*RAD), Math.sin(lat*RAD), -Math.cos(lat*RAD)*Math.sin(lon*RAD));
// the tilt and spin that bring a place round to face direction d: the globe spins about its axis,
// then tilts, so the spin lines the place up under d sideways and the tilt finishes the job
function facing(lat, lon, d){
  const cl = Math.cos(lat*RAD), phi = Math.asin(Math.max(-1, Math.min(1, d.x/cl)));
  const s = new THREE.Vector3(cl*Math.sin(phi), Math.sin(lat*RAD), cl*Math.cos(phi));
  return {pitch: Math.atan2(d.z, d.y) - Math.atan2(s.z, s.y), yaw: phi - Math.atan2(Math.cos(lon*RAD), -Math.sin(lon*RAD))};
}
// zoom moves the camera in on the biome globe; mag narrows its lens on the geography globe, which
// leans in far closer than the camera could go without passing through the room's near plane
const view = {yaw: -Math.PI/2, pitch: 20*RAD, zoom: 1, mag: 1, orbit: 0, vyaw: 0, vpitch: 0, fly: null, idle: true};

// ---------- the world model and the map ----------
let earth = null, here = null, glowFor = null, biomeSkin = null;
function loadMap(){
  earthMap().then(({earth: e, map}) => {
    if (!earth) { earth = e; biomeSkin = T(0xffffff, {map}); }
    if (G && G.kind === 'biomes') showBiomes();
    if (G) draw();
  }, () => { if (G) card.innerHTML = '<div class="ghint">The map is lost! Step away and try again.</div>'; });
}
function showBiomes(){ if (biomeSkin) { globeBall.material = biomeSkin; $g('gCredit').textContent = earth.credits.join(' · '); } }

// ---------- stepping up to the globe and away ----------
let G = null;   // while the explorer is at the globe: {seated, mode: 'globe'|'web', hunt, lesson}
export function openGlobe(){
  if (G || !sitDown({x: GLOBE.x, z: GLOBE.z + .95, angle: Math.PI, pose: () => {}, seated})) return;
  closeDialog(); for (const k in keys) keys[k] = false;
  G = {seated: false, kind: store.mode, picking: true, mode: 'globe', hunt: null, lesson: null};
  if (!earth) loadMap();
  smooth();
}
// the room's globe is a low-poly ball, which shows its corners once the geography globe leans in
let smoothed = false;
function smooth(){
  if (smoothed) return; smoothed = true;
  const ball = new THREE.SphereGeometry(R, 128, 96);
  for (const m of [globeBall, ...globeBall.children]) if (m.geometry && m.geometry === globeBall.geometry && m !== globeBall) m.geometry = ball;
  globeBall.geometry = ball;
}
function seated(){
  if (!G) return;
  G.seated = true; steer(true);
  // the explorer would stand between the camera and the globe; their view is the camera's now
  hero.root.visible = false; blob.visible = false; globeRing.rotation.y = 0;
  document.documentElement.classList.add('globing'); hud.hidden = false;
  view.idle = !here; modeButtons(); chips(); draw(); Sound.open();
}
// which globe: asked every time the explorer steps up, with the last one picked marked
function pick(kind){
  if (!G) return;
  const was = G.picking ? null : G.kind;
  G.picking = false; G.kind = store.mode = kind; keep(); modeButtons();
  if (was === kind) return draw();
  if (convo) endConvo(false);
  view.vyaw += 9; view.idle = false; view.fly = null; tune(kind === 'geo' ? [523, 659, 784] : [784, 659, 523], {gap: .07, dur: .14, vol: .05});
  if (kind === 'geo') {
    stopHunt(); backToGlobe(); glow.visible = false; pin.visible = false; view.zoom = 1;
    real.enter();
  } else {
    real.leave(); view.mag = 1; pin.visible = false; showBiomes();
    if (!met) { met = true; keep();
      story([H("Hoo-hoo! This is my biome globe, {name}. Every colour on it is a biome: a kind of home, with its own weather, plants and animals."),
        H("Spin it and tap anywhere to see what lives there. Or pick a biome at the bottom, and I'll give you a riddle to find it!")]); }
  }
  chips(); draw();
}
function modeButtons(){
  hud.querySelectorAll('.gmode button').forEach(b => b.setAttribute('aria-pressed', !!G && !G.picking && b.dataset.m === G.kind));
  hud.querySelector('.gbar').hidden = !G || G.picking;
}
hud.querySelectorAll('.gmode button').forEach(b => b.addEventListener('click', () => pick(b.dataset.m)));
function drawPick(){
  card.style.removeProperty('--c');
  const tile = (m, title, words) => `<button data-m="${m}" class="${store.mode === m ? 'last' : ''}"><b>${title}</b><span>${words}</span></button>`;
  card.innerHTML = `<div class="gtop"><span class="gicon" aria-hidden="true">🦉</span><div><div class="gkind">Professor Hoot asks</div><h3>Which globe today?</h3></div></div>
    <div class="gpick">${tile('biomes', '🌿 Biomes', 'Who lives where, and who eats whom. Riddles and pop-up food webs.')}
      ${tile('geo', '🗺️ Geography', 'The real Earth from space: mountains, rivers and volcanoes for Hoot\'s notebook, wonders of the world, and real photos of the animals that live there.')}</div>`;
  card.querySelectorAll('.gpick button').forEach(b => b.addEventListener('click', () => pick(b.dataset.m)));
}
function leave(){
  if (!G) return;
  if (convo) endConvo(true);
  G = null; held.clear(); hideDiorama(); closeAnimal(); pin.visible = false; glow.visible = false; real.leave(); view.mag = 1;
  camera.zoom = 1; camera.updateProjectionMatrix();
  hud.hidden = true; document.documentElement.classList.remove('globing');
  hero.root.visible = true; blob.visible = true; globeRing.rotation.y = Math.PI/2; steer(false); standUp();
  Sound.close();
}
$g('gLeave').addEventListener('click', leave);
$g('gBack').addEventListener('click', () => backToGlobe());

// ---------- the camera: leaning in on the globe, or looking down on the diorama ----------
const camPos = new THREE.Vector3(), camLook = new THREE.Vector3(), camAt = new THREE.Vector3(), back = new THREE.Vector3(), right = new THREE.Vector3(), up = new THREE.Vector3();
function steer(on){ game.cutCam = on ? (pos, look) => { pos.copy(camPos); look.copy(camLook); } : null; }
// the part of the screen the HUD leaves open, so the globe sits in the middle of it
function openArea(){
  const top = hud.querySelector('.gh-top').getBoundingClientRect(), c = card.getBoundingClientRect(), W = innerWidth, Hh = innerHeight;
  const a = {l: 0, t: top.bottom + 6, r: W, b: Hh - Math.min(175, Hh*.3)};
  if (c.width && c.height) { if (c.left > W*.4) a.r = c.left - 10; else a.t = Math.max(a.t, c.bottom + 6); }
  if (a.b - a.t < 120) a.b = Hh;
  return a;
}
function aimCamera(){
  const web = G.mode === 'web' && dioramaSize(), a = openArea(), geo = G.kind === 'geo' && !G.picking;
  // the diorama fills the open area, low enough that its animals stand up off the floor; the globe it
  // came from peeks in at the edge on a wide screen
  const el = web ? .95 : .1, turn = web ? WEB_TURN + view.orbit : 0;
  if (web) camAt.set(web.at.x, web.top*.42, web.at.z); else camAt.copy(center);
  const rho = web ? web.radius*1.02*view.zoom : geo ? .5 : .5*view.zoom;
  const mag = geo ? view.mag : 1;
  if (camera.zoom !== mag) { camera.zoom = mag; camera.updateProjectionMatrix(); }
  back.set(Math.sin(turn)*Math.cos(el), Math.sin(el), Math.cos(turn)*Math.cos(el));
  right.set(Math.cos(turn), 0, -Math.sin(turn)); up.crossVectors(back, right);
  // far enough back that it fits the open area, and shifted so it sits in the middle of it; seen
  // from above, the diorama is wider than it is tall on screen. Leaning in on the geography globe
  // narrows the lens and leaves the camera standing where the whole globe fits.
  const tan0 = Math.tan(camera.fov*RAD/2), tanH = tan0/mag, dist = rho*innerHeight/(Math.min(a.r - a.l, (a.b - a.t)/(web ? .9 : 1))*.94*tan0);
  const nx = (a.l + a.r)/innerWidth - 1, ny = 1 - (a.t + a.b)/innerHeight, halfH = dist*tanH, halfW = halfH*camera.aspect;
  camLook.copy(camAt).addScaledVector(right, -nx*halfW).addScaledVector(up, -ny*halfH);
  camPos.copy(camLook).addScaledVector(back, dist);
}

// ---------- the card: what Hoot is asking, or what's here ----------
function draw(){
  if (!G) return;
  $g('gBack').hidden = G.mode !== 'web';
  if (G.picking) return drawPick();
  if (G.kind === 'geo') return real.draw();
  if (!earth) { card.style.removeProperty('--c'); card.innerHTML = '<div class="ghint">Unrolling the map…</div>'; return; }
  if (G.mode === 'web') return drawWeb();
  if (G.hunt) return drawHunt();
  if (!here) { card.style.removeProperty('--c'); card.innerHTML = '<div class="ghint">Drag to spin the globe.<br>Tap anywhere to see what lives there!<br><br>Or pick a biome at the bottom for one of Hoot\'s riddles.</div>'; return; }
  const b = here.biome;
  card.style.setProperty('--c', b.color);
  card.innerHTML = `<div class="gtop"><span class="gicon" aria-hidden="true">${b.icon}</span><div><div class="gkind">${b.name}</div><h3>${here.name}</h3>${here.within ? `<div class="gwithin">${here.within}</div>` : ''}</div></div>
    <p>${b.about}</p>
    <div class="gfrom">${farNote(here)}</div>
    <div class="gbtns"><button class="gb" id="gWebBtn">Who eats whom?</button></div>`;
  on('gWebBtn', openWeb);
}
// a web drawn far off says where it's from, and whether its animals live here too; where none of
// the webs fits, it says it's only the same biome, so nobody thinks those animals live here
const isFar = p => arc(p.lat, p.lon, p.web.at[0], p.web.at[1]) > 1500;
const farNote = p => !isFar(p) ? `A food web from ${p.web.place}.`
  : p.webFits ? `A food web from ${p.web.place}. The same animals live here too.`
  : `No food web from right here yet. Here's one from another ${p.biome.name.toLowerCase()}: ${p.web.place}.`;
const btn = (id, text, cls = 'gb') => `<button class="${cls}" id="${id}">${text}</button>`;
const on = (id, f) => { const b = $g(id); if (b) b.addEventListener('click', f); };

function chips(){
  if (G && G.kind === 'geo') return real.chips();
  $g('gFound').textContent = `${found.size} of ${ALL.length} found`;
  showChips(ALL.map(id => {
    const b = BIOMES[id];
    return {icon: b.icon, text: b.name, color: b.color, found: found.has(id), hunting: !!(G && G.hunt && G.hunt.id === id),
      label: found.has(id) ? `Go to the ${b.name}` : `Riddle: find the ${b.name}`,
      go: () => { if (!earth || !G) return; if (found.has(id)) { stopHunt(); backToGlobe(); visitPlace(earth.placeAt(...visit(id))); } else startHunt(id); }};
  }));
}
function showChips(items){
  $g('gChips').replaceChildren(...items.map(it => {
    const c = document.createElement('button');
    c.className = 'gchip' + (it.found ? ' found' : '') + (it.hunting ? ' hunting' : ''); if (it.color) c.style.setProperty('--c', it.color);
    c.innerHTML = `<i aria-hidden="true">${it.icon}</i>${it.text}`;
    c.setAttribute('aria-label', it.label); c.addEventListener('click', it.go);
    return c;
  }));
}

// ---------- visiting a place ----------
function dropPin(lat, lon){
  pin.position.copy(surface(lat, lon)).multiplyScalar(R); pin.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), surface(lat, lon)); pin.visible = true; pin.t = 0;
}
// The camera stands off to one side, to leave the globe in the middle of what the HUD leaves open.
// Leaning in narrows the view onto the camera's own axis, so a place to lean in on is turned to face
// along that axis, or the offset, magnified, would leave it off the side of the screen.
function flyTo(lat, lon, mag){ view.fly = {...facing(lat, lon, mag ? back.clone() : camPos.clone().sub(center).normalize()), mag}; view.idle = false; }
function visitPlace(p, fly = true){
  here = p; dropPin(p.lat, p.lon); if (fly) flyTo(p.lat, p.lon); view.idle = false;
  tune([660, 990], {gap: .07, dur: .12, vol: .05});
  discover(p); draw();
}
function discover(p){
  if (found.has(p.biomeId)) return;
  found.add(p.biomeId); keep(); chips();
  toast(`New biome found · ${found.size} of ${ALL.length}`, `${p.biome.icon} ${p.biome.name}`);
  tune([523, 659, 784, 1046], {dur: .25, vol: .07});
}
function toast(small, big){
  const t = document.createElement('div'); t.id = 'gtoast'; t.innerHTML = '<small></small><b></b>';
  t.querySelector('small').textContent = small; t.querySelector('b').textContent = big;
  hud.querySelector('#gtoast')?.remove(); hud.append(t); setTimeout(() => t.remove(), 3100);
}

// ---------- Hoot's riddles: find a biome from its weather ----------
function startHunt(id){
  backToGlobe(); here = null; pin.visible = false;
  G.hunt = {id, misses: 0, tip: ''}; view.idle = false; setGlow(null); chips(); draw();
  tune([392, 523, 659], {gap: .1});
  if (convo) endConvo(false);
  story([H(BIOMES[id].hunt.clue), H('Spin the globe, then tap where you think it is.')]);
}
function stopHunt(){ if (!G || !G.hunt) return; G.hunt = null; setGlow(null); chips(); draw(); }
function drawHunt(){
  const h = G.hunt, b = BIOMES[h.id];
  card.style.setProperty('--c', '#6d3b5e');
  card.innerHTML = `<div class="gtop"><span class="gicon" aria-hidden="true">🦉</span><div><div class="gkind">Hoot's riddle</div><h3>Find the ${b.name}</h3></div></div>
    <p class="gask">${b.hunt.clue}</p>${h.tip ? `<p class="gtry">${h.tip}</p>` : ''}
    <div class="gbtns">${btn('gStop', 'Stop the riddle', 'gb ghost')}</div>`;
  on('gStop', stopHunt);
}
// a wrong guess earns a clue that points the right way: land or water, nearer the equator or farther
function guess(p){
  const h = G.hunt, want = BIOMES[h.id];
  dropPin(p.lat, p.lon);
  if (convo) endConvo(false);
  if (p.biomeId === h.id) {
    G.hunt = null; setGlow(null); here = p; discover(p); chips(); draw(); flyTo(p.lat, p.lon);
    tune([523, 659, 784, 1046, 1319], {gap: .09, dur: .3, vol: .07});
    story([H(`You found the ${want.name.toLowerCase()}! This spot is called ${p.name}.`),
      H(want.about), H("Let's see who lives here. Before I show you who eats whom, you get to guess!")], () => { if (G && here === p && G.mode === 'globe') openWeb(); });
    return;
  }
  h.misses++;
  const lat = Math.abs(p.lat), [lo, hi] = want.hunt.band, what = `That's ${p.biome.water && !/^Lake /.test(p.name) ? 'the ' : ''}${p.name}: ${p.biome.name.toLowerCase()}.`;
  const lines = [want.water && !p.biome.water ? `${what} That's on land, but this one is in the water!`
    : !want.water && p.biome.water ? `${what} That's water, but this one is on land!`
    : lat < lo ? `${what} That's too close to the equator, the gold line. Try farther north or south.`
    : lat > hi ? `${what} That's too far from the equator, the gold line. Try closer to it.`
    : `${what} You're about the right distance from the equator, though!`];
  h.tip = want.hunt.hint; lines.push(want.hunt.hint);
  if (h.misses >= 2) { setGlow(h.id); lines.push("I'll make it glow on the globe for you. Tap a glowing spot!"); }
  Sound.tone(330, {type: 'triangle', dur: .14, vol: .05}); Sound.tone(262, {type: 'triangle', t: .1, dur: .18, vol: .05});
  draw(); story(lines.map(H));
}
function setGlow(id){
  if (id && earth) { if (glowFor !== id) { glow.material.map?.dispose(); glow.material.map = paintGlow(earth, id); glow.material.needsUpdate = true; glowFor = id; } glow.visible = true; }
  else glow.visible = false;
}

// ---------- the food web, popped up as a diorama ----------
function openWeb(){
  if (!G || !here) return;
  stopHunt(); if (convo) endConvo(false);
  G.mode = 'web'; view.zoom = 1; view.orbit = 0; pin.visible = false; loadPhotos();
  const web = here.web;
  showDiorama(scene, WEB_AT, web, here.biomeId, .9, WEB_TURN);
  tune([523, 784], {dur: .14}); [880, 1175, 1568].forEach((f, i) => Sound.tone(f, {type: 'sine', t: .25 + i*.06, dur: .3, vol: .035}));
  if (learned.has(web.id)) { G.lesson = {step: 'explore'}; enter(web.species.map(s => s.name)); growArrows(); }
  else {
    // the web is built a piece at a time: first the makers, then the animals, each one arriving after
    // everything it eats is already there. The ones Hoot asks about are guessed before they're shown;
    // the rest walk on by themselves alongside them.
    G.lesson = {step: 'makers', guesses: new Set(), placed: new Set(), queue: arrivals(web), ask: asked(web), first: true};
    story([H(`Welcome to ${web.place}! Let's build its food web together, one living thing at a time.`),
      H('Everything here starts with sunlight. First guess: which of these make their own food from it? Tap them on the card, then press Check.')]);
  }
  draw();
}
function backToGlobe(){
  if (!G || G.mode !== 'web') return;
  if (convo) endConvo(false);
  G.mode = 'globe'; G.lesson = null; view.zoom = 1; hideDiorama(); closeAnimal(); if (here) { dropPin(here.lat, here.lon); pin.t = 1; }
  tune([659, 523], {gap: .07, dur: .12, vol: .05});
  draw();
}

function drawWeb(){
  const L = G.lesson, web = here.web, b = here.biome, quiz = L.step === 'makers' || L.step === 'eats', what = L.step === 'whatif' || L.step === 'whatif-done';
  card.style.setProperty('--c', b.color);
  let ask;
  if (L.step === 'makers') ask = 'Which ones make their own food from sunlight? Tap your guesses, then press Check.';
  else if (L.step === 'eats') { const w = L.who, n = L.ask.size, k = n - L.queue.filter(s => L.ask.has(s.name)).length;
    ask = `<span class="gfrom">Guess ${k} of ${n}${L.joined.length ? ` · the ${and(lower(L.joined))} joined in too` : ''}</span><br>Here ${w.many ? 'come' : 'comes'} the ${w.name.toLowerCase()} ${w.icon}! What ${w.many ? 'do they' : 'does it'} eat? Tap ${w.many ? 'their' : 'its'} food.`; }
  else if (L.step === 'checked') ask = L.said;
  else if (what) ask = `What if there were no more ${L.q.gone.name.toLowerCase()} ${L.q.gone.icon}? Predict first!`;
  else ask = 'Arrows point from food to the one that eats it, carrying energy up from the sun. Tap anyone to follow their arrows.';
  const row = (k, s) => `<div class="gwhat"><span>${s.icon} ${s.name}</span>${['more', 'fewer'].map(v => `<button data-k="${k}" data-v="${v}" class="${L.answers[k] === v ? 'on' : ''}" aria-pressed="${L.answers[k] === v}" ${L.step === 'whatif-done' ? 'disabled' : ''}>${v === 'more' ? '⬆ More' : '⬇ Fewer'}</button>`).join('')}
    ${L.step === 'whatif-done' ? (L.answers[k] === L.truth[k] ? '<b class="ok">✓ You predicted it!</b>' : `<b class="no">✗ There would be ${L.truth[k]}.</b>`) : ''}</div>`;
  const btns = quiz ? btn('gCheck', 'Check') + btn('gSkip', L.step === 'eats' ? 'Show me the rest' : 'Just show me', 'gb ghost')
    : L.step === 'checked' ? btn('gNext', 'Next →')
    : L.step === 'whatif' ? btn('gRun', 'See what happens') + btn('gWhatBack', 'Never mind', 'gb ghost')
    : L.step === 'whatif-done' ? btn('gRestore', 'Bring them back')
    : btn('gWhat', 'What if…?');
  card.innerHTML = `<div class="gtop"><span class="gicon" aria-hidden="true">${b.icon}</span><div><div class="gkind">${b.name} food web</div><h3>${cap(web.place)}</h3></div></div>
    ${isFar(here) ? `<div class="gfrom">${farNote(here)}</div>` : ''}
    <p class="gask">${ask}</p>${what ? row('food', L.q.food) + row('eater', L.q.eater) : ''}
    ${what ? '' : `<div class="gstrip" role="group" aria-label="Who lives here">${web.species.map((s, i) => `<button data-i="${i}" class="${stripClass(s)}" aria-label="${s.name}" aria-pressed="${quiz ? L.guesses.has(s.name) : L.sel === s.name}"><i aria-hidden="true">${s.icon}</i><b>${s.name}</b></button>`).join('')}</div>`}
    ${L.step === 'explore' && L.sel ? `<div class="gsay">${sayFor(L.sel)}</div>` : ''}
    <div class="gbtns">${btns}</div>`;
  card.querySelectorAll('.gstrip button').forEach(b => b.addEventListener('click', () => tapAnimal(web.species[+b.dataset.i].name)));
  card.querySelectorAll('.gwhat button').forEach(b => b.addEventListener('click', () => { L.answers[b.dataset.k] = b.dataset.v; Sound.tone(880, {type: 'triangle', dur: .06, vol: .05}); draw(); }));
  if (quiz) { $g('gCheck').disabled = !L.guesses.size; on('gCheck', check); on('gSkip', () => finish(true)); }
  if (L.step === 'whatif') { $g('gRun').disabled = !(L.answers.food && L.answers.eater); on('gRun', runWhatIf); }
  on('gNext', L.next); on('gWhat', startWhatIf); on('gWhatBack', endWhatIf); on('gRestore', endWhatIf);
}
const cap = s => s[0].toUpperCase() + s.slice(1);
function stripClass(s){
  const L = G.lesson, cls = [];
  // which are makers is the first guess, so the strip keeps it quiet until then
  if (L.step !== 'makers') { if (!s.eats.length) cls.push('maker'); if (L.placed && !L.placed.has(s.name)) cls.push('wait'); }
  if (L.marks && L.marks[s.name]) cls.push(L.marks[s.name]); else if (L.guesses && L.guesses.has(s.name)) cls.push('guess');
  if (L.sel === s.name || (L.who && L.who.name === s.name)) cls.push('sel'); if (L.gone === s.name) cls.push('gone');
  return cls.join(' ');
}
function sayFor(name){
  const s = here.web.species.find(t => t.name === name);
  return `<b>${s.icon} ${s.name}</b><br>` + placeFor(name);
}
function placeFor(name){
  const s = here.web.species.find(t => t.name === name), by = eatenBy(here.web, name);
  return (s.eats.length ? `<span class="eats">Eats:</span> ${lower(s.eats).join(', ')}` : '<span class="eats">Makes its food from sunlight</span>')
    + ` · <span class="by">Eaten by:</span> ${by.length ? lower(by).join(', ') : 'nothing here'}`;
}

// photos of everyone in the webs, fetched the first time a web opens; tools/earth/photos.mjs makes them
let photos = null;
function loadPhotos(){
  if (photos) return;
  photos = {};
  fetch('wildlife/photos.json').then(r => r.ok ? r.json() : {}).then(p => { photos = p; if (G && G.mode === 'web') draw(); }, () => {});
}
const esc = t => t.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');
const photoOf = name => photos[`${here.web.id}/${name}`] || photos[name];
function photoFor(name){
  const ph = photoOf(name);
  if (!ph) return '';
  return `<figure class="gphoto"><img src="wildlife/${ph.file}" alt="${esc(name)}"><figcaption title="${esc(ph.by)}">Photo: <a href="${ph.page}" target="_blank" rel="noopener">${esc(ph.by)}</a>, ${esc(ph.license)}</figcaption></figure>`;
}

// one living thing's card, big: its real photo, a little about it, and its place in the web
function openAnimal(name){
  const s = here.web.species.find(t => t.name === name), about = photoOf(name)?.about;
  animalCard.innerHTML = `<article role="dialog" aria-modal="true" aria-label="${esc(name)}"><button class="gx" aria-label="Close">✕</button>
    <h3>${s.icon} ${esc(name)}</h3>${photoFor(name)}${about ? `<p>${esc(about)}</p>` : ''}<div class="gsay">${placeFor(name)}</div></article>`;
  animalCard.hidden = false; animalCard.querySelector('.gx').focus({preventScroll: true});
}
function closeAnimal(){ animalCard.hidden = true; animalCard.innerHTML = ''; }

function tapAnimal(name){
  const L = G.lesson; if (!L) return;
  if (L.step === 'makers' || L.step === 'eats') {
    // an animal's food is already on the island; it can't eat itself, or anyone still to come
    if (L.step === 'eats' && (name === L.who.name || !L.placed.has(name))) return;
    if (L.guesses.has(name)) { L.guesses.delete(name); markAnimal(name, null); } else { L.guesses.add(name); markAnimal(name, 'guess'); }
    Sound.tone(L.guesses.has(name) ? 880 : 660, {type: 'triangle', dur: .07, vol: .05});
  } else if (L.step === 'explore') {
    // their arrows light up behind the card, to follow once it's closed
    L.sel = name; selectAnimal(name); openAnimal(name);
    Sound.tone(880, {type: 'triangle', dur: .07, vol: .05});
  } else if (L.step === 'checked') return openAnimal(name);
  else return;
  draw();
}

// predict, then check: right guesses get a tick, wrong ones a cross, and the ones missed a "!"
function check(){
  const L = G.lesson, web = here.web, w = L.who, truth = new Set(L.step === 'makers' ? makers(web) : w.eats);
  L.marks = {};
  if (L.step === 'makers') { enter(truth); truth.forEach(n => L.placed.add(n)); }
  for (const s of web.species) {
    const g = L.guesses.has(s.name), t = truth.has(s.name), mark = g && t ? 'right' : g ? 'wrong' : t ? 'missed' : null;
    if (mark) { L.marks[s.name] = mark; markAnimal(s.name, mark); }
  }
  const right = [...L.guesses].filter(n => truth.has(n)).length, all = right === truth.size && right === L.guesses.size;
  tune(all ? [659, 784, 1046] : [523, 659], {vol: .06});
  if (L.step === 'makers') {
    const lines = [(all ? 'Exactly right! ' : right ? 'Good thinking! ' : 'Not quite! ') + `The ${and(lower([...truth]))} ${truth.size > 1 ? 'are' : 'is'} the makers here.`,
      'They turn sunlight into food. Every animal here eats them, or eats something that did.'];
    growArrows(e => e.food === 'Sun');
    L.said = lines.join(' '); story(lines.map(H));
  } else {
    // Hoot keeps quiet for each animal, so the web builds at the pace of tapping; the card says how it went
    const wrong = [...L.guesses].filter(n => !truth.has(n));
    L.said = (all ? 'Yes! ' : right ? 'Close! ' : 'Good guess, but no. ') + `The ${w.name.toLowerCase()} ${w.many ? 'eat' : 'eats'} ${and(lower(w.eats))}.`
      + (wrong.length ? ` ${w.many ? "They don't" : "It doesn't"} eat ${and(lower(wrong))} here.` : '');
    growArrows(e => e.eater === w.name); selectAnimal(w.name);
  }
  L.next = L.queue.some(s => L.ask.has(s.name)) ? arrive : () => finish(false);
  L.step = 'checked'; draw();
}
function arrive(){
  const L = G.lesson;
  if (convo) endConvo(false);
  clearMarks(); selectAnimal(null); L.marks = null; L.guesses = new Set();
  const walkers = [];
  while (!L.ask.has(L.queue[0].name)) walkers.push(L.queue.shift());
  const w = L.who = L.queue.shift(); L.joined = walkers.map(s => s.name);
  for (const s of [...walkers, w]) L.placed.add(s.name);
  enter([...L.joined, w.name]); growArrows(e => L.joined.includes(e.eater)); spotlight(w.name); L.step = 'eats';
  tune([784, 988], {gap: .06, dur: .1, vol: .05});
  if (L.first) { L.first = false;
    story([H(`Now the animals start to arrive. Here ${w.many ? 'come' : 'comes'} the ${w.name.toLowerCase()}! What do you think ${w.many ? 'they eat' : 'it eats'}? Tap ${w.many ? 'their' : 'its'} food, then press Check.`)]); }
  draw();
}
function finish(skipped){
  const L = G.lesson, all = here.web.species.map(s => s.name), started = L.placed && L.placed.size, rest = (L.queue || []).map(s => s.name);
  if (convo) endConvo(false);
  clearMarks(); spotlight(null); selectAnimal(null); enter(all);
  Object.assign(L, {step: 'explore', placed: new Set(all), queue: [], who: null, marks: null, guesses: null, sel: null});
  learned.add(here.web.id); keep();
  growArrows();
  tune([523, 659, 784, 1046, 1319], {gap: .12, dur: .3, vol: .05});
  story([H(skipped ? (started ? 'Here comes everyone else!' : 'Here comes the whole web!')
      : (rest.length ? `And here come the ${and(lower(rest))}. ` : '') + `That's the whole food web of ${here.web.place}!`),
    H('See how many arrows there are? Most animals eat more than one thing, and more than one thing eats them. That is why it is called a web, not a chain.'),
    H('Tap anyone to follow their arrows. Then press "What if…?" to see what happens when one of them disappears.')]);
  draw();
}

// ---------- what if one of them disappeared? ----------
function startWhatIf(){
  const q = whatIf(here.web); if (!q) return;
  G.lesson = {step: 'whatif', q, answers: {}, sel: q.gone.name, truth: {food: 'more', eater: 'fewer'}};
  selectAnimal(q.gone.name);
  story([H(`Let's imagine something. What if every ${q.gone.name.toLowerCase()} disappeared from ${here.web.place}?`),
    H(`Would there be more ${q.food.name.toLowerCase()}, or fewer? And more ${q.eater.name.toLowerCase()}, or fewer? Predict first!`)]);
  draw();
}
function runWhatIf(){
  const L = G.lesson, q = L.q, others = q.eater.eats.filter(n => n !== q.gone.name);
  if (convo) endConvo(false);
  L.step = 'whatif-done'; L.gone = q.gone.name;
  vanish(q.gone.name, [q.food.name], [q.eater.name]);
  Sound.tone(523, {type: 'sine', dur: .4, vol: .05, f2: 220});
  const right = (L.answers.food === 'more') + (L.answers.eater === 'fewer');
  story([H(right === 2 ? 'You predicted it exactly!' : right ? 'You got one of them!' : 'Surprise!'),
    H(`With nothing eating them, the ${q.food.name.toLowerCase()} would grow and spread: more ${q.food.name.toLowerCase()}!`),
    H(`But the ${q.eater.name.toLowerCase()} would lose ${others.length ? 'some' : 'all'} of its food, so there would be fewer ${q.eater.name.toLowerCase()}` + (others.length ? `, unless they ate more ${and(lower(others))} instead.` : '.')),
    H('Everything in a food web is connected. Change one, and the others feel it too.')]);
  draw();
}
function endWhatIf(){ if (convo) endConvo(false); restore(); G.lesson = {step: 'explore', sel: null}; selectAnimal(null); draw(); }

// ---------- the geography globe, and what it borrows from the room ----------
const real = makeRealEarth({card, hud, globeBall, R, surface, store, view, keep, toast, tune, H, story, btn, on,
  earth: () => earthMap().then(m => m.earth),
  endTalk: () => { if (convo) endConvo(false); },
  credit: text => { $g('gCredit').textContent = text; },
  setColor: c => c ? card.style.setProperty('--c', c) : card.style.removeProperty('--c'),
  dropPin, hidePin: () => { pin.visible = false; }, flyTo,
  chips: showChips, redraw: () => draw(),
  // the geography globe's way into a food web: over to the biome globe, at the same spot
  openWebAt: p => { pick('biomes'); here = p; dropPin(p.lat, p.lon); openWeb(); }});

// ---------- spinning, tapping and zooming ----------
const pointers = new Map(), ray = new THREE.Raycaster(), ndc = new THREE.Vector2();
let drag = null;
const live = () => G && G.seated;
canvas.addEventListener('pointerdown', e => {
  if (!live()) return;
  try { canvas.setPointerCapture(e.pointerId); } catch (err) {}
  pointers.set(e.pointerId, {x: e.clientX, y: e.clientY});
  drag = {moved: 0, pinch: pointers.size > 1 ? pinchSpan() : 0, zoom: view.zoom, mag: view.mag};
  view.fly = null; view.vyaw = view.vpitch = 0; view.idle = false; Sound.init();
});
canvas.addEventListener('pointermove', e => {
  const p = pointers.get(e.pointerId); if (!live() || !p || !drag) return;
  const dx = e.clientX - p.x, dy = e.clientY - p.y; p.x = e.clientX; p.y = e.clientY;
  drag.moved += Math.hypot(dx, dy);
  if (pointers.size > 1) { if (drag.pinch) { if (geoOn()) view.mag = clampMag(drag.mag*pinchSpan()/drag.pinch); else view.zoom = clampZoom(drag.zoom*drag.pinch/pinchSpan()); } return; }
  if (G.mode === 'web') { view.orbit = Math.max(-1, Math.min(1, view.orbit - dx*.006)); return; }
  // a drag across the globe's width turns it about half a turn, whatever the zoom
  const k = Math.PI/(innerHeight*.5)*(geoOn() ? 1/view.mag : view.zoom);
  view.yaw += dx*k; view.pitch = Math.max(-PITCH, Math.min(PITCH, view.pitch + dy*k));
  view.vyaw = dx*k*60; view.vpitch = dy*k*60; view.idle = false;
});
const lift = e => {
  if (!pointers.delete(e.pointerId)) return;
  if (drag && drag.moved < 8 && pointers.size === 0) tap(e.clientX, e.clientY);
  drag = pointers.size ? {moved: 99, pinch: pinchSpan(), zoom: view.zoom, mag: view.mag} : null;
};
canvas.addEventListener('pointerup', lift); canvas.addEventListener('pointercancel', lift);
canvas.addEventListener('wheel', e => {
  if (!live()) return; e.preventDefault();
  if (geoOn()) { view.fly = null; view.mag = clampMag(view.mag*(1 - Math.sign(e.deltaY)*.15)); } else view.zoom = clampZoom(view.zoom*(1 + Math.sign(e.deltaY)*.1));
}, {passive: false});
function pinchSpan(){ const [a, b] = [...pointers.values()]; return Math.hypot(a.x - b.x, a.y - b.y) || 1; }
const clampZoom = z => Math.max(.4, Math.min(1, z));
const clampMag = m => Math.max(1, Math.min(real.MAX_MAG, m));
const geoOn = () => G && G.kind === 'geo' && !G.picking;
function tap(x, y){
  if (!earth) return;
  const r = canvas.getBoundingClientRect(); ndc.set((x - r.left)/r.width*2 - 1, -(y - r.top)/r.height*2 + 1); ray.setFromCamera(ndc, camera);
  if (G.mode === 'web') {
    const name = pickAnimal(ray), L = G.lesson;
    if (name) tapAnimal(name); else if (L.step === 'explore' && L.sel) { L.sel = null; selectAnimal(null); draw(); }
    return;
  }
  if (geoOn() && real.tap(x, y)) return;
  const hit = ray.intersectObject(globeBall, false)[0];
  if (hit) pressOn(earth.placeAt(hit.uv.y*180 - 90, hit.uv.x*360 - 180));
}
const pressOn = p => geoOn() ? real.press(p.lat, p.lon) : G.hunt ? guess(p) : visitPlace(p, false);
// whatever faces the explorer, for visiting from the keyboard
function middle(){
  const c = center.clone().project(camera); ndc.set(c.x, c.y); ray.setFromCamera(ndc, camera);
  const hit = ray.intersectObject(globeBall, false)[0];
  return hit && earth.placeAt(hit.uv.y*180 - 90, hit.uv.x*360 - 180);
}

// ---------- every frame, in the room ----------
const held = new Set();
hqAnims.push(dt => {
  updateDiorama(dt);
  if (!G || !G.seated) return;
  aimCamera();
  const turn = 1.6*dt*(geoOn() ? 1/view.mag : view.zoom);
  if (G.mode === 'globe') {
    if (held.has('ArrowLeft')) view.yaw += turn; if (held.has('ArrowRight')) view.yaw -= turn;
    if (held.has('ArrowUp')) view.pitch += turn; if (held.has('ArrowDown')) view.pitch -= turn;
  } else { if (held.has('ArrowLeft')) view.orbit = Math.min(1, view.orbit + turn); if (held.has('ArrowRight')) view.orbit = Math.max(-1, view.orbit - turn); }
  if (held.size) { view.fly = null; view.idle = false; }
  if (view.fly) {
    const k = Math.min(1, dt*4), dy = wrap(view.fly.yaw - view.yaw), dp = view.fly.pitch - view.pitch;
    view.yaw += dy*k; view.pitch += dp*k;
    // swing round first, then lean in once it's turned to face the explorer
    const dm = view.fly.mag && Math.abs(dy) + Math.abs(dp) < .3 ? Math.log(view.fly.mag/view.mag) : 0;
    if (dm) view.mag *= Math.exp(dm*Math.min(1, dt*2.5));
    if (Math.abs(dy) + Math.abs(dp) < .002 && Math.abs(dm) < .01) view.fly = null;
  } else if (!drag) {
    view.yaw += view.vyaw*dt; view.pitch += view.vpitch*dt;
    const f = Math.exp(-dt*3.5); view.vyaw *= f; view.vpitch *= f;
    if (view.idle) view.yaw -= dt*.12/view.mag;
  }
  view.pitch = Math.max(-PITCH, Math.min(PITCH, view.pitch));
  globeBall.rotation.set(view.pitch, view.yaw, 0);
  real.frame(dt, !drag && !view.fly && !held.size && Math.abs(view.vyaw) + Math.abs(view.vpitch) < .02);
  // the pin keeps its size on screen as the geography globe leans in, or it would cover a country
  if (pin.visible) { pin.t += dt; pin.scale.setScalar((1 + Math.max(0, 1 - pin.t*3)*Math.sin(pin.t*20)*.4)/(geoOn() ? view.mag : 1)); }
  if (glow.visible) glow.material.opacity = .55 + Math.sin(performance.now()/260)*.3;
});

// Esc backs out one level: a what-if, the diorama, a riddle, the globe. Keys reach the dialogue while Hoot talks.
addEventListener('keydown', e => {
  if (!live() || convo) return;
  e.stopPropagation();
  const k = e.key;
  if (k === 'Escape' && !animalCard.hidden) { closeAnimal(); return; }
  if (k === 'Escape') { if (G.mode === 'web') { if (G.lesson.step.startsWith('whatif')) endWhatIf(); else backToGlobe(); } else if (G.hunt) stopHunt(); else if (!(geoOn() && real.back())) leave(); return; }
  if (geoOn() && (k === '+' || k === '=' || k === '-' || k === '_')) { real.zoomBy(k === '+' || k === '=' ? 2 : .5); return; }
  if ((k === 'm' || k === 'M') && !e.repeat) { setSound(!Sound.isOn()); return; }
  if (k.startsWith('Arrow')) {
    e.preventDefault(); held.add(k);
    // a tap is over before the next frame sees it held, so each fresh press turns things a notch too
    if (!e.repeat) { const n = .12*(geoOn() ? 1/view.mag : view.zoom); view.fly = null; view.idle = false;
      if (G.mode === 'web') { if (k === 'ArrowLeft') view.orbit = Math.min(1, view.orbit + n); if (k === 'ArrowRight') view.orbit = Math.max(-1, view.orbit - n); }
      else { if (k === 'ArrowLeft') view.yaw += n; if (k === 'ArrowRight') view.yaw -= n; if (k === 'ArrowUp') view.pitch += n; if (k === 'ArrowDown') view.pitch -= n; } }
  }
  if (k === 'Enter' && e.target === document.body && earth && G.mode === 'globe') { const p = middle(); if (p) pressOn(p); }
}, true);
addEventListener('keyup', e => held.delete(e.key));
