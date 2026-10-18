// The Explorer's Globe in the Library Nook. There's no separate screen: the explorer steps up to the
// real globe, the camera leans in, and Professor Hoot asks them to guess before he tells. Pick a
// biome and he gives a riddle about its weather to find it by; open a food web and it pops up out
// of the globe as a diorama with no arrows yet, for the explorer to guess who eats whom; then ask
// what would happen if one animal disappeared. Tapping anywhere still just visits it.
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
import { clearMarks, dioramaSize, growArrows, hideDiorama, markAnimal, pickAnimal, restore, selectAnimal, showDiorama, spotlight, updateDiorama, vanish } from './diorama.js';
import { eatenBy, hunter, makers, whatIf } from './food-web.js';
import { earthMap, paintGlow } from './paint.js';

const css = document.createElement('style');
css.textContent = `
.globing .hud .plate,.globing .hud .keys,.globing #stick,.globing #talk,.globing .use,.globing #prompt{display:none!important}
#globeHud{position:fixed;inset:0;pointer-events:none;padding:calc(10px + env(safe-area-inset-top,0px)) max(16px,env(safe-area-inset-right,0px)) env(safe-area-inset-bottom,0px) max(16px,env(safe-area-inset-left,0px));display:flex;flex-direction:column;gap:8px;animation:fadein .4s ease-out}
#globeHud button{pointer-events:auto;cursor:pointer;font-family:var(--body)}
#globeHud button:focus-visible{outline:3px solid var(--parch);outline-offset:3px}
.gh-top{display:flex;align-items:flex-start;justify-content:space-between;gap:10px}
.gh-title{background:rgba(26,19,32,.82);border:2px solid var(--gold);border-radius:14px;padding:5px 14px 7px;box-shadow:0 0 0 3px var(--ink)}
.gh-title .sub{font-weight:900;font-size:11px;letter-spacing:1.4px;text-transform:uppercase;color:var(--gold)}
.gh-title h2{margin:0;font-family:var(--display);font-weight:400;font-size:clamp(18px,4.4vw,23px);line-height:1.1;color:var(--parch);white-space:nowrap}
.gh-btns{display:flex;justify-content:flex-end;gap:8px}
.gpill{white-space:nowrap;font-weight:900;font-size:13px;color:var(--parch);background:rgba(26,19,32,.82);border:2px solid var(--gold);border-radius:999px;padding:5px 12px;box-shadow:0 0 0 3px var(--ink)}
#gCard{pointer-events:auto;position:absolute;right:max(16px,env(safe-area-inset-right,0px));top:calc(74px + env(safe-area-inset-top,0px));width:min(350px,38vw);max-height:calc(100% - 74px - 92px - env(safe-area-inset-top,0px));overflow:auto;box-sizing:border-box;background:linear-gradient(180deg,#f6ecd6,#ecdcb8);color:var(--ink);border:3px solid var(--gold);border-radius:18px;box-shadow:0 0 0 4px var(--ink),0 14px 30px rgba(0,0,0,.4);padding:12px 15px 14px;display:flex;flex-direction:column;gap:8px}
.talking #gCard{max-height:calc(100% - 74px - 210px - env(safe-area-inset-top,0px))}
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
.gstrip{display:flex;flex-wrap:wrap;gap:5px}
.gstrip button{width:40px;height:40px;border-radius:50%;border:2.5px solid var(--ink);background:#fbf4e2;font-size:21px;display:grid;place-items:center;padding:0}
.gstrip button.maker{background:#cfe6b8}
.gstrip button.sel{border-color:var(--gold);box-shadow:0 0 0 3px var(--gold)}
.gstrip button.guess{box-shadow:0 0 0 3px #d9a441}
.gstrip button.right{box-shadow:0 0 0 3px #3e9b54}.gstrip button.wrong{box-shadow:0 0 0 3px #c4473a}.gstrip button.missed{box-shadow:0 0 0 3px #e0802e}
.gstrip button.gone{opacity:.25}
.gsay{font-weight:800;font-size:15px;line-height:1.45;min-height:2.9em}
.gsay .eats{color:#2f7a3a}.gsay .by{color:#b5552f}
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
#gtoast{position:absolute;left:50%;top:44%;transform:translateX(-50%);background:#efe0bf;color:var(--ink);border:3px solid var(--gold);border-radius:14px;box-shadow:0 0 0 4px var(--ink);padding:6px 18px 8px;text-align:center;white-space:nowrap;pointer-events:none;animation:bannerIn 3s ease both;z-index:2}
#gtoast b{display:block;font-family:var(--display);font-weight:400;font-size:clamp(17px,4.5vw,22px)}
#gtoast small{font-weight:900;font-size:11px;letter-spacing:1.2px;text-transform:uppercase;color:#6d3b5e}
@media (max-aspect-ratio:1/1){#gCard{left:max(16px,env(safe-area-inset-left,0px));right:max(16px,env(safe-area-inset-right,0px));width:auto;top:calc(68px + env(safe-area-inset-top,0px));max-height:38%}
  .talking #gCard{max-height:38%}#gCard{padding:9px 12px 11px;gap:6px}#gCard .gicon{width:36px;height:36px;font-size:19px}#gCard h3{font-size:18px}
  #gCard p{font-size:14px}#gCard .gask{font-size:15px}.gstrip button{width:34px;height:34px;font-size:18px}.gcredit{display:none}}
@media (prefers-reduced-motion:reduce){#globeHud,#gtoast{animation:none}}`;
document.head.appendChild(css);

const hud = document.createElement('div'); hud.id = 'globeHud'; hud.hidden = true;
hud.innerHTML = `<div class="gh-top"><div class="gh-title"><div class="sub">Library Nook</div><h2>Explorer's Globe</h2></div>
    <div class="gh-btns"><button class="gpill" id="gBack" hidden aria-label="Back to the globe">← Globe</button><button class="gpill" id="gLeave">Step away</button></div></div>
  <aside id="gCard" aria-live="polite"></aside>
  <div class="gcredit" id="gCredit"></div>
  <div class="gbar"><span class="gfound" id="gFound"></span><div class="gchips" id="gChips" role="group" aria-label="Biomes to find"></div></div>`;
document.body.appendChild(hud);
const $g = id => hud.querySelector('#' + id), card = $g('gCard');

const stored = load('globe') || {}, list = v => Array.isArray(v) ? v : [];
const found = new Set(list(stored.found)), learned = new Set(list(stored.webs));
let met = !!stored.met;
const keep = () => save('globe', {found: [...found], webs: [...learned], met});
const ALL = Object.keys(BIOMES);
const H = text => ['hoot', text];
const tune = (notes, o = {}) => notes.forEach((f, i) => Sound.tone(f, {type: 'triangle', t: i*(o.gap || .08), dur: o.dur || .2, vol: o.vol || .06}));
const lower = names => names.map(n => n.toLowerCase());
const and = words => words.length < 2 ? words.join('') : words.slice(0, -1).join(', ') + (words.length > 2 ? ',' : '') + ' and ' + words[words.length - 1];

// ---------- the globe in the room, steered while the explorer is at it ----------
const RAD = Math.PI/180, R = .4, PITCH = 1.35, wrap = a => Math.atan2(Math.sin(a), Math.cos(a));
const center = new THREE.Vector3(GLOBE.x, GLOBE.y, GLOBE.z);
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
const view = {yaw: -Math.PI/2, pitch: 20*RAD, zoom: 1, orbit: 0, vyaw: 0, vpitch: 0, fly: null, idle: true, shrink: 0};

// ---------- the world model and the map ----------
let earth = null, here = null, glowFor = null;
function loadMap(){
  earthMap().then(({earth: e, map}) => {
    if (!earth) { earth = e; globeBall.material = T(0xffffff, {map}); $g('gCredit').textContent = e.credits.join(' · '); }
    if (G) draw();
  }, () => { if (G) card.innerHTML = '<div class="ghint">The map is lost! Step away and try again.</div>'; });
}

// ---------- stepping up to the globe and away ----------
let G = null;   // while the explorer is at the globe: {seated, mode: 'globe'|'web', hunt, lesson}
export function openGlobe(){
  if (G || !sitDown({x: GLOBE.x, z: GLOBE.z + .95, angle: Math.PI, pose: () => {}, seated})) return;
  closeDialog(); for (const k in keys) keys[k] = false;
  G = {seated: false, mode: 'globe', hunt: null, lesson: null};
  if (!earth) loadMap();
}
function seated(){
  if (!G) return;
  G.seated = true; steer(true);
  // the explorer would stand between the camera and the globe; their view is the camera's now
  hero.root.visible = false; blob.visible = false; globeRing.rotation.y = 0;
  document.documentElement.classList.add('globing'); hud.hidden = false;
  view.idle = !here; chips(); draw(); Sound.open();
  if (!met) { met = true; keep();
    story([H("Hoo-hoo! You found my Explorer's Globe, {name}. Every colour on it is a biome: a kind of home, with its own weather, plants and animals."),
      H("Spin it and tap anywhere to see what lives there. Or pick a biome at the bottom, and I'll give you a riddle to find it!")]); }
}
function leave(){
  if (!G) return;
  if (convo) endConvo(true);
  G = null; held.clear(); hideDiorama(); pin.visible = false; glow.visible = false;
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
  const web = G.mode === 'web' && dioramaSize(), a = openArea();
  const el = web ? .62 : .1, turn = web ? view.orbit : 0;
  if (web) camAt.set(GLOBE.x, .7 + web.top*.42, GLOBE.z); else camAt.copy(center);
  const rho = (web ? web.radius*1.02 : .5)*view.zoom;
  back.set(Math.sin(turn)*Math.cos(el), Math.sin(el), Math.cos(turn)*Math.cos(el));
  right.set(Math.cos(turn), 0, -Math.sin(turn)); up.crossVectors(back, right);
  // far enough back that it fits the open area, and shifted so it sits in the middle of it; seen
  // from above, the diorama is wider than it is tall on screen
  const tanH = Math.tan(camera.fov*RAD/2), dist = rho*innerHeight/(Math.min(a.r - a.l, (a.b - a.t)/(web ? .78 : 1))*.94*tanH);
  const nx = (a.l + a.r)/innerWidth - 1, ny = 1 - (a.t + a.b)/innerHeight, halfH = dist*tanH, halfW = halfH*camera.aspect;
  camLook.copy(camAt).addScaledVector(right, -nx*halfW).addScaledVector(up, -ny*halfH);
  camPos.copy(camLook).addScaledVector(back, dist);
}

// ---------- the card: what Hoot is asking, or what's here ----------
function draw(){
  if (!G) return;
  $g('gBack').hidden = G.mode !== 'web';
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
// a web from far off says so, and says it's the same biome, so nobody thinks those animals live here
const isFar = p => arc(p.lat, p.lon, p.web.at[0], p.web.at[1]) > 1500;
const farNote = p => isFar(p) ? `No food web from right here yet. Here's one from another ${p.biome.name.toLowerCase()}: ${p.web.place}.` : `A food web from ${p.web.place}.`;
const btn = (id, text, cls = 'gb') => `<button class="${cls}" id="${id}">${text}</button>`;
const on = (id, f) => { const b = $g(id); if (b) b.addEventListener('click', f); };

function chips(){
  $g('gFound').textContent = `${found.size} of ${ALL.length} found`;
  $g('gChips').replaceChildren(...ALL.map(id => {
    const b = BIOMES[id], c = document.createElement('button');
    c.className = 'gchip' + (found.has(id) ? ' found' : '') + (G && G.hunt && G.hunt.id === id ? ' hunting' : ''); c.style.setProperty('--c', b.color);
    c.innerHTML = `<i aria-hidden="true">${b.icon}</i>${b.name}`;
    c.setAttribute('aria-label', found.has(id) ? `Go to the ${b.name}` : `Riddle: find the ${b.name}`);
    c.addEventListener('click', () => { if (!earth || !G) return; if (found.has(id)) { stopHunt(); backToGlobe(); visitPlace(earth.placeAt(...visit(id))); } else startHunt(id); });
    return c;
  }));
}

// ---------- visiting a place ----------
function dropPin(lat, lon){
  pin.position.copy(surface(lat, lon)).multiplyScalar(R); pin.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), surface(lat, lon)); pin.visible = true; pin.t = 0;
}
function flyTo(lat, lon){ view.fly = facing(lat, lon, camPos.clone().sub(center).normalize()); view.idle = false; }
function visitPlace(p, fly = true){
  here = p; dropPin(p.lat, p.lon); if (fly) flyTo(p.lat, p.lon); view.idle = false;
  tune([660, 990], {gap: .07, dur: .12, vol: .05});
  discover(p); draw();
}
function discover(p){
  if (found.has(p.biomeId)) return;
  found.add(p.biomeId); keep(); chips();
  const t = document.createElement('div'); t.id = 'gtoast'; t.innerHTML = `<small>New biome found · ${found.size} of ${ALL.length}</small><b>${p.biome.icon} ${p.biome.name}</b>`;
  hud.querySelector('#gtoast')?.remove(); hud.append(t); setTimeout(() => t.remove(), 3100);
  tune([523, 659, 784, 1046], {dur: .25, vol: .07});
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
  G.mode = 'web'; view.zoom = 1; view.orbit = 0; pin.visible = false;
  const web = here.web;
  showDiorama(scene, new THREE.Vector3(GLOBE.x, .7, GLOBE.z), web, here.biomeId);
  tune([523, 784], {dur: .14}); [880, 1175, 1568].forEach((f, i) => Sound.tone(f, {type: 'sine', t: .25 + i*.06, dur: .3, vol: .035}));
  if (learned.has(web.id)) { G.lesson = {step: 'explore'}; growArrows(); }
  else {
    G.lesson = {step: 'makers', guesses: new Set()};
    story([H(`Welcome to ${web.place}! Every step up this little hill is one more step away from the sunlight.`),
      H('First guess: which of these make their own food from sunlight? Tap them, then press Check.')]);
  }
  draw();
}
function backToGlobe(){
  if (!G || G.mode !== 'web') return;
  if (convo) endConvo(false);
  G.mode = 'globe'; G.lesson = null; view.zoom = 1; hideDiorama(); if (here) { dropPin(here.lat, here.lon); pin.t = 1; }
  tune([659, 523], {gap: .07, dur: .12, vol: .05});
  draw();
}

function drawWeb(){
  const L = G.lesson, web = here.web, b = here.biome, quiz = L.step === 'makers' || L.step === 'hunter', what = L.step === 'whatif' || L.step === 'whatif-done';
  card.style.setProperty('--c', b.color);
  let ask;
  if (L.step === 'makers') ask = 'Which ones make their own food from sunlight? Tap your guesses.';
  else if (L.step === 'hunter') ask = `What do you think the ${L.hunter.name.toLowerCase()} ${L.hunter.icon} eats? Tap your guesses.`;
  else if (L.step === 'checked') ask = L.said;
  else if (what) ask = `What if there were no more ${L.q.gone.name.toLowerCase()} ${L.q.gone.icon}? Predict first!`;
  else ask = 'Arrows point from food to the one that eats it, carrying energy up from the sun. Tap anyone to follow their arrows.';
  const row = (k, s) => `<div class="gwhat"><span>${s.icon} ${s.name}</span>${['more', 'fewer'].map(v => `<button data-k="${k}" data-v="${v}" class="${L.answers[k] === v ? 'on' : ''}" aria-pressed="${L.answers[k] === v}" ${L.step === 'whatif-done' ? 'disabled' : ''}>${v === 'more' ? '⬆ More' : '⬇ Fewer'}</button>`).join('')}
    ${L.step === 'whatif-done' ? (L.answers[k] === L.truth[k] ? '<b class="ok">✓ You predicted it!</b>' : `<b class="no">✗ There would be ${L.truth[k]}.</b>`) : ''}</div>`;
  const btns = quiz ? btn('gCheck', 'Check') + btn('gSkip', 'Just show me', 'gb ghost')
    : L.step === 'checked' ? btn('gNext', 'Next →')
    : L.step === 'whatif' ? btn('gRun', 'See what happens') + btn('gWhatBack', 'Never mind', 'gb ghost')
    : L.step === 'whatif-done' ? btn('gRestore', 'Bring them back')
    : btn('gWhat', 'What if…?');
  card.innerHTML = `<div class="gtop"><span class="gicon" aria-hidden="true">${b.icon}</span><div><div class="gkind">${b.name} food web</div><h3>${cap(web.place)}</h3></div></div>
    ${isFar(here) ? `<div class="gfrom">${farNote(here)}</div>` : ''}
    <p class="gask">${ask}</p>${what ? row('food', L.q.food) + row('eater', L.q.eater) : ''}
    ${what ? '' : `<div class="gstrip" role="group" aria-label="Who lives here">${web.species.map((s, i) => `<button data-i="${i}" class="${stripClass(s)}" aria-label="${s.name}" title="${s.name}" aria-pressed="${quiz ? L.guesses.has(s.name) : L.sel === s.name}">${s.icon}</button>`).join('')}</div>`}
    ${L.step === 'explore' && L.sel ? `<div class="gsay">${sayFor(L.sel)}</div>` : ''}
    <div class="gbtns">${btns}</div>`;
  card.querySelectorAll('.gstrip button').forEach(b => b.addEventListener('click', () => tapAnimal(web.species[+b.dataset.i].name)));
  card.querySelectorAll('.gwhat button').forEach(b => b.addEventListener('click', () => { L.answers[b.dataset.k] = b.dataset.v; Sound.tone(880, {type: 'triangle', dur: .06, vol: .05}); draw(); }));
  if (quiz) { $g('gCheck').disabled = !L.guesses.size; on('gCheck', check); on('gSkip', () => reveal(true)); }
  if (L.step === 'whatif') { $g('gRun').disabled = !(L.answers.food && L.answers.eater); on('gRun', runWhatIf); }
  on('gNext', L.next); on('gWhat', startWhatIf); on('gWhatBack', endWhatIf); on('gRestore', endWhatIf);
}
const cap = s => s[0].toUpperCase() + s.slice(1);
function stripClass(s){
  const L = G.lesson, cls = [s.eats.length ? '' : 'maker'];
  if (L.marks && L.marks[s.name]) cls.push(L.marks[s.name]); else if (L.guesses && L.guesses.has(s.name)) cls.push('guess');
  if (L.sel === s.name) cls.push('sel'); if (L.gone === s.name) cls.push('gone');
  return cls.join(' ');
}
function sayFor(name){
  const s = here.web.species.find(t => t.name === name), by = eatenBy(here.web, name);
  return `<b>${s.icon} ${s.name}</b><br>` + (s.eats.length ? `<span class="eats">Eats:</span> ${lower(s.eats).join(', ')}` : '<span class="eats">Makes its food from sunlight</span>')
    + ` · <span class="by">Eaten by:</span> ${by.length ? lower(by).join(', ') : 'nothing here'}`;
}

function tapAnimal(name){
  const L = G.lesson; if (!L) return;
  if (L.step === 'makers' || L.step === 'hunter') {
    if (L.step === 'hunter' && name === L.hunter.name) return;
    if (L.guesses.has(name)) { L.guesses.delete(name); markAnimal(name, null); } else { L.guesses.add(name); markAnimal(name, 'guess'); }
    Sound.tone(L.guesses.has(name) ? 880 : 660, {type: 'triangle', dur: .07, vol: .05});
  } else if (L.step === 'explore') {
    L.sel = L.sel === name ? null : name; selectAnimal(L.sel);
    if (L.sel) Sound.tone(880, {type: 'triangle', dur: .07, vol: .05});
  } else return;
  draw();
}

// predict, then check: right guesses get a tick, wrong ones a cross, and the ones missed a "!"
function check(){
  const L = G.lesson, web = here.web, truth = new Set(L.step === 'makers' ? makers(web) : L.hunter.eats);
  L.marks = {};
  for (const s of web.species) {
    const g = L.guesses.has(s.name), t = truth.has(s.name), mark = g && t ? 'right' : g ? 'wrong' : t ? 'missed' : null;
    if (mark) { L.marks[s.name] = mark; markAnimal(s.name, mark); }
  }
  const right = [...L.guesses].filter(n => truth.has(n)).length, all = right === truth.size && right === L.guesses.size;
  tune(all ? [659, 784, 1046] : [523, 659], {vol: .06});
  let lines;
  if (L.step === 'makers') {
    lines = [(all ? 'Exactly right! ' : right ? 'Good thinking! ' : 'Not quite! ') + `The ${and(lower([...truth]))} ${truth.size > 1 ? 'are' : 'is'} the makers here.`,
      'Plants and algae turn sunlight into food. Every animal here eats them, or eats something that did.'];
    growArrows(e => e.food === 'Sun');
    L.next = askHunter;
  } else {
    const wrong = [...L.guesses].filter(n => !truth.has(n));
    lines = [(all ? 'Yes! ' : right ? 'Close! ' : 'Good guess, but no. ') + `The ${L.hunter.name.toLowerCase()} eats ${and(lower(L.hunter.eats))}.`];
    if (wrong.length) lines.push(`It doesn't eat ${and(lower(wrong))} here.`);
    growArrows(e => e.eater === L.hunter.name);
    L.next = () => reveal(false);
  }
  L.said = lines.join(' '); L.step = 'checked';
  story(lines.map(H)); draw();
}
function askHunter(){
  const L = G.lesson, h = hunter(here.web);
  if (convo) endConvo(false);
  clearMarks(); L.marks = null; L.guesses = new Set();
  if (!h) return reveal(false);
  L.step = 'hunter'; L.hunter = h; spotlight(h.name);
  story([H(`Next: what do you think the ${h.name.toLowerCase()} eats? Tap your guesses, then press Check.`)]);
  draw();
}
function reveal(skipped){
  const L = G.lesson;
  if (convo) endConvo(false);
  clearMarks(); spotlight(null); selectAnimal(null); Object.assign(L, {step: 'explore', marks: null, guesses: null, sel: null});
  learned.add(here.web.id); keep();
  growArrows();
  tune([523, 659, 784, 1046, 1319], {gap: .12, dur: .3, vol: .05});
  story([H(skipped ? 'Here comes the whole web!' : 'Now watch the whole web grow in!'),
    H('Every arrow points from food to the one that eats it. That is the way energy moves, starting with the sun.'),
    H('See how the steps get smaller as they go up? Most of the energy gets used up at every step, so there is only room for a few hunters at the top.')]);
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

// ---------- spinning, tapping and zooming ----------
const pointers = new Map(), ray = new THREE.Raycaster(), ndc = new THREE.Vector2();
let drag = null;
const live = () => G && G.seated;
canvas.addEventListener('pointerdown', e => {
  if (!live()) return;
  try { canvas.setPointerCapture(e.pointerId); } catch (err) {}
  pointers.set(e.pointerId, {x: e.clientX, y: e.clientY});
  drag = {moved: 0, pinch: pointers.size > 1 ? pinchSpan() : 0, zoom: view.zoom};
  view.fly = null; view.vyaw = view.vpitch = 0; view.idle = false; Sound.init();
});
canvas.addEventListener('pointermove', e => {
  const p = pointers.get(e.pointerId); if (!live() || !p || !drag) return;
  const dx = e.clientX - p.x, dy = e.clientY - p.y; p.x = e.clientX; p.y = e.clientY;
  drag.moved += Math.hypot(dx, dy);
  if (pointers.size > 1) { if (drag.pinch) view.zoom = clampZoom(drag.zoom*drag.pinch/pinchSpan()); return; }
  if (G.mode === 'web') { view.orbit = Math.max(-1, Math.min(1, view.orbit - dx*.006)); return; }
  // a drag across the globe's width turns it about half a turn, whatever the zoom
  const k = Math.PI/(innerHeight*.5)*view.zoom;
  view.yaw += dx*k; view.pitch = Math.max(-PITCH, Math.min(PITCH, view.pitch + dy*k));
  view.vyaw = dx*k*60; view.vpitch = dy*k*60; view.idle = false;
});
const lift = e => {
  if (!pointers.delete(e.pointerId)) return;
  if (drag && drag.moved < 8 && pointers.size === 0) tap(e.clientX, e.clientY);
  drag = pointers.size ? {moved: 99, pinch: pinchSpan(), zoom: view.zoom} : null;
};
canvas.addEventListener('pointerup', lift); canvas.addEventListener('pointercancel', lift);
canvas.addEventListener('wheel', e => { if (!live()) return; e.preventDefault(); view.zoom = clampZoom(view.zoom*(1 + Math.sign(e.deltaY)*.1)); }, {passive: false});
function pinchSpan(){ const [a, b] = [...pointers.values()]; return Math.hypot(a.x - b.x, a.y - b.y) || 1; }
const clampZoom = z => Math.max(.4, Math.min(1, z));
function tap(x, y){
  if (!earth) return;
  const r = canvas.getBoundingClientRect(); ndc.set((x - r.left)/r.width*2 - 1, -(y - r.top)/r.height*2 + 1); ray.setFromCamera(ndc, camera);
  if (G.mode === 'web') { const name = pickAnimal(ray); if (name) tapAnimal(name); return; }
  const hit = ray.intersectObject(globeBall, false)[0];
  if (hit) pressOn(earth.placeAt(hit.uv.y*180 - 90, hit.uv.x*360 - 180));
}
const pressOn = p => G.hunt ? guess(p) : visitPlace(p, false);
// whatever faces the explorer, for visiting from the keyboard
function middle(){
  const c = center.clone().project(camera); ndc.set(c.x, c.y); ray.setFromCamera(ndc, camera);
  const hit = ray.intersectObject(globeBall, false)[0];
  return hit && earth.placeAt(hit.uv.y*180 - 90, hit.uv.x*360 - 180);
}

// ---------- every frame, in the room ----------
const held = new Set();
hqAnims.push(dt => {
  view.shrink += ((G && G.mode === 'web' ? 1 : 0) - view.shrink)*Math.min(1, dt*6);
  const s = Math.max(.001, 1 - view.shrink); globeBall.scale.setScalar(s); globeRing.scale.setScalar(s);
  updateDiorama(dt);
  if (!G || !G.seated) return;
  aimCamera();
  const turn = 1.6*dt*view.zoom;
  if (G.mode === 'globe') {
    if (held.has('ArrowLeft')) view.yaw += turn; if (held.has('ArrowRight')) view.yaw -= turn;
    if (held.has('ArrowUp')) view.pitch += turn; if (held.has('ArrowDown')) view.pitch -= turn;
  } else { if (held.has('ArrowLeft')) view.orbit = Math.min(1, view.orbit + turn); if (held.has('ArrowRight')) view.orbit = Math.max(-1, view.orbit - turn); }
  if (held.size) { view.fly = null; view.idle = false; }
  if (view.fly) {
    const k = Math.min(1, dt*4), dy = wrap(view.fly.yaw - view.yaw), dp = view.fly.pitch - view.pitch;
    view.yaw += dy*k; view.pitch += dp*k;
    if (Math.abs(dy) + Math.abs(dp) < .002) view.fly = null;
  } else if (!drag) {
    view.yaw += view.vyaw*dt; view.pitch += view.vpitch*dt;
    const f = Math.exp(-dt*3.5); view.vyaw *= f; view.vpitch *= f;
    if (view.idle) view.yaw -= dt*.12;
  }
  view.pitch = Math.max(-PITCH, Math.min(PITCH, view.pitch));
  globeBall.rotation.set(view.pitch, view.yaw, 0);
  if (pin.visible) { pin.t += dt; pin.scale.setScalar(1 + Math.max(0, 1 - pin.t*3)*Math.sin(pin.t*20)*.4); }
  if (glow.visible) glow.material.opacity = .55 + Math.sin(performance.now()/260)*.3;
});

// Esc backs out one level: a what-if, the diorama, a riddle, the globe. Keys reach the dialogue while Hoot talks.
addEventListener('keydown', e => {
  if (!live() || convo) return;
  e.stopPropagation();
  const k = e.key;
  if (k === 'Escape') { if (G.mode === 'web') { if (G.lesson.step.startsWith('whatif')) endWhatIf(); else backToGlobe(); } else if (G.hunt) stopHunt(); else leave(); return; }
  if ((k === 'm' || k === 'M') && !e.repeat) { setSound(!Sound.isOn()); return; }
  if (k.startsWith('Arrow')) {
    e.preventDefault(); held.add(k);
    // a tap is over before the next frame sees it held, so each fresh press turns things a notch too
    if (!e.repeat) { const n = .12*view.zoom; view.fly = null; view.idle = false;
      if (G.mode === 'web') { if (k === 'ArrowLeft') view.orbit = Math.min(1, view.orbit + n); if (k === 'ArrowRight') view.orbit = Math.max(-1, view.orbit - n); }
      else { if (k === 'ArrowLeft') view.yaw += n; if (k === 'ArrowRight') view.yaw -= n; if (k === 'ArrowUp') view.pitch += n; if (k === 'ArrowDown') view.pitch -= n; } }
  }
  if (k === 'Enter' && e.target === document.body && earth && G.mode === 'globe') { const p = middle(); if (p) pressOn(p); }
}, true);
addEventListener('keyup', e => held.delete(e.key));
