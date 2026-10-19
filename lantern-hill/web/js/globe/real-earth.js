// The geography globe: the real Earth, as NASA's satellites photograph it, on the same room globe.
// Lean in from a weather satellite's view down to a jet's, with the names of countries, mountains,
// deserts, seas and rivers coming out as you go. Tap anywhere for its field guide: the country, the
// ecoregion with a real photo of it, and the wild animals people have really photographed there,
// after Hoot asks which of four doesn't belong. Or pick a wonder of the world, and Hoot shows a real
// photo of it to find on the globe, saying how far off each guess is and which way to go. Or open
// Hoot's landform notebook (notebook.js) and find every kind of landform there is.
//
// globe.js owns the room globe, the camera and the hands; this owns what the globe shows and says
// while it's the geography globe. `room` is what it borrows from globe.js.

import * as THREE from 'three';
import { camera, canvas } from '../core/render.js';
import { Sound } from '../core/sound.js';
import { WEBS } from '../earth/biomes.js';
import { loadGeography } from '../earth/geography.js';
import { LANDMARKS } from '../earth/landforms.js';
import { arc } from '../earth/model.js';
import { WONDERS } from '../earth/wonders.js';
import { closeUp, LENSES, lensBy, wholeEarth } from './imagery.js';
import { makeNames } from './names.js';
import { makeNotebook } from './notebook.js';
import { article, oddOneOut, photoCredit, pictures, seenNear } from './photos.js';
import { judge } from './wonder-hunt.js';

const css = document.createElement('style');
css.textContent = `
#globeNames{position:fixed;inset:0;width:100%;height:100%;pointer-events:none}
.glenses{pointer-events:auto;position:absolute;left:0;right:0;bottom:calc(52px + env(safe-area-inset-bottom,0px));display:flex;gap:6px;overflow-x:auto;padding:4px max(16px,env(safe-area-inset-left,0px));scrollbar-width:none;touch-action:pan-x}
.glenses::-webkit-scrollbar{display:none}
.glens{flex:none;font-weight:900;font-size:13px;color:var(--parch);background:rgba(26,19,32,.82);border:2px solid rgba(217,164,65,.55);border-radius:999px;padding:5px 12px;box-shadow:0 0 0 2px var(--ink)}
.glens[aria-pressed=true]{background:var(--gold);color:var(--ink);border-color:var(--gold)}
.gzoom{pointer-events:auto;position:absolute;left:max(16px,env(safe-area-inset-left,0px));top:50%;transform:translateY(-50%);display:flex;flex-direction:column;align-items:center;gap:8px}
.gzoom button{width:46px;height:46px;border-radius:14px;font-family:var(--display);font-size:24px;line-height:1;color:var(--parch);background:var(--plum);border:2.5px solid var(--gold);box-shadow:0 0 0 3px var(--ink);padding:0}
.gzoom .like{font-weight:900;font-size:11px;color:var(--parch);text-align:center;max-width:78px;line-height:1.25;text-shadow:0 1px 3px #000}
.geography .gcredit{bottom:calc(92px + env(safe-area-inset-bottom,0px));max-width:45%}
.glenstip{position:absolute;left:max(16px,env(safe-area-inset-left,0px));max-width:50%;bottom:calc(92px + env(safe-area-inset-bottom,0px));font-weight:800;font-size:12px;color:var(--parch);text-shadow:0 1px 3px #000;pointer-events:none}
.talking .glenses,.talking .gzoom,.talking .glenstip{visibility:hidden}
.gshelf{pointer-events:auto;flex:none;display:flex;gap:4px}.geography .gfound{display:none}
.gshelf button{font-weight:900;font-size:13px;color:var(--parch);background:rgba(26,19,32,.82);border:2px solid rgba(217,164,65,.6);border-radius:999px;padding:4px 10px;white-space:nowrap;font-variant-numeric:tabular-nums}
.gshelf button[aria-pressed=true]{background:var(--gold);color:var(--ink);border-color:var(--gold)}
#gCard .gpic{position:relative;margin:0 -4px;border-radius:12px;overflow:hidden;background:#d9c9a4;border:2.5px solid var(--ink);aspect-ratio:16/10}
#gCard .gpic img{display:block;width:100%;height:100%;object-fit:cover}
#gCard .gpic.tall{aspect-ratio:4/3}
#gCard .gcap{font-size:10px;font-weight:700;color:#6b5a6e;line-height:1.3;overflow-wrap:anywhere}
#gCard .gsec{font-weight:900;font-size:12px;letter-spacing:1.1px;text-transform:uppercase;color:#6d3b5e;margin-top:2px}
#gCard .gbadge{display:inline-flex;align-items:center;gap:5px;font-weight:900;font-size:13px;background:var(--c,#ccc);border:2px solid var(--ink);border-radius:999px;padding:1px 9px 1px 4px;color:var(--ink)}
.ganimals{display:grid;grid-template-columns:repeat(auto-fill,minmax(88px,1fr));gap:6px}
.ganimals button{position:relative;padding:0;border:2.5px solid var(--ink);border-radius:12px;overflow:hidden;background:#fbf4e2;aspect-ratio:1;display:block}
.ganimals img{display:block;width:100%;height:100%;object-fit:cover}
.ganimals b{position:absolute;left:0;right:0;bottom:0;font-size:11px;font-weight:900;line-height:1.15;color:#fff;background:linear-gradient(transparent,rgba(16,12,22,.85));padding:12px 4px 4px;text-align:left}
.ganimals.four{grid-template-columns:repeat(2,1fr)}
@media (min-aspect-ratio:1/1){.geography #gCard{max-height:calc(100% - 74px - 150px - env(safe-area-inset-top,0px))}}
.ganimals button.odd{box-shadow:0 0 0 3px #3e9b54}.ganimals button.wrongpick{box-shadow:0 0 0 3px #c4473a}.ganimals button.dim{opacity:.55}
.gshots{display:flex;gap:6px;overflow-x:auto;padding-bottom:4px;touch-action:pan-x}
.gshots button{flex:none;width:84px;height:62px;padding:0;border:2.5px solid var(--ink);border-radius:10px;overflow:hidden;background:#d9c9a4}
.gshots button[aria-pressed=true]{box-shadow:0 0 0 3px var(--gold)}
.gshots img{display:block;width:100%;height:100%;object-fit:cover}
.gsights{display:flex;flex-wrap:wrap;gap:6px}
.gsights button{font-weight:900;font-size:13px;color:var(--ink);background:#fbf4e2;border:2px solid var(--ink);border-radius:999px;padding:3px 11px}
.gwarm{font-weight:900;font-size:15px;color:#b5552f}.gwarm.hot{color:#2f7a3a}
@media (max-aspect-ratio:1/1){.gzoom{top:auto;left:auto;right:max(16px,env(safe-area-inset-right,0px));bottom:calc(96px + env(safe-area-inset-bottom,0px));transform:none}.glenstip{max-width:calc(100% - 140px)}.gzoom button{width:40px;height:40px;font-size:21px}#gCard .gpic{aspect-ratio:16/8}.gshelf span{display:none}}`;
document.head.appendChild(css);

// leaning in past where the satellites stop getting sharper (about 48) is only for telling a
// wonder's sights apart
const RAD = Math.PI/180, MAX_MAG = 96;
// Natural Earth says at which web-map zoom each name first shows; the whole globe in view is about zoom 2
const magFor = min => Math.max(1, 2**(min - 2.4));
const like = m => m < 2.5 ? 'Like a weather satellite' : m < 10 ? 'Like the Space Station' : m < 40 ? 'Like a high-flying jet' : 'Like a small plane';
const KIND_WORD = {continent: 'Continent', ocean: 'Ocean', sea: 'Sea', gulf: 'Gulf', bay: 'Bay', strait: 'Strait', channel: 'Channel', sound: 'Sound',
  mountains: 'Mountain range', peak: 'Mountain', lowest: 'Low point', desert: 'Desert', plateau: 'Plateau', basin: 'Basin', plain: 'Plain', tundra: 'Tundra',
  delta: 'River delta', peninsula: 'Peninsula', valley: 'Valley', gorge: 'Gorge', wetland: 'Wetland', region: 'Region', isthmus: 'Isthmus',
  islands: 'Islands', island: 'Island', waterfall: 'Waterfall', capital: 'Capital city', river: 'River', country: 'Country', cape: 'Cape'};
const esc = s => String(s).replace(/[&<>"]/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;'})[c]);
// 'That's the Pacific Ocean', 'the United States of America', but 'Lake Victoria', 'France'
const the = name => /^(the |lake )/i.test(name) || !/ocean|sea$|gulf|bay$|united|republic|kingdom|islands$|netherlands|philippines|emirates|bahamas/i.test(name) ? name : 'the ' + name;
const offline = '<p class="gtry">The pictures come over the internet, and it isn\'t answering. Try again in a moment!</p>';

export function makeRealEarth(room){
  const {card, hud, globeBall, R, surface, store} = room;
  // just above the 3D world, and under everything else: Hoot's words, the card, the buttons
  const names = makeNames(); canvas.after(names.el);
  names.el.hidden = true;
  const bar = document.createElement('div'); bar.className = 'glenses'; bar.setAttribute('role', 'group'); bar.setAttribute('aria-label', 'Ways to see the Earth');
  const zoomer = document.createElement('div'); zoomer.className = 'gzoom';
  zoomer.innerHTML = '<button aria-label="Zoom in">+</button><div class="like"></div><button aria-label="Zoom out">−</button>';
  const tip = document.createElement('div'); tip.className = 'glenstip';
  // the bar along the bottom holds the wonders' photo riddles, or Hoot's landform notebook
  const shelfEl = document.createElement('div'); shelfEl.className = 'gshelf'; shelfEl.setAttribute('role', 'group'); shelfEl.setAttribute('aria-label', 'Wonders or landforms');
  shelfEl.innerHTML = '<button data-s="wonders"></button><button data-s="landforms"></button>';
  hud.querySelector('#gChips').before(shelfEl);
  hud.append(tip, bar, zoomer); tip.hidden = bar.hidden = zoomer.hidden = shelfEl.hidden = true;
  let shelf = 'wonders';
  const [zIn, likeEl, zOut] = zoomer.children;
  zIn.addEventListener('click', () => zoomBy(2)); zOut.addEventListener('click', () => zoomBy(.5));

  // ---------- on the globe: its pictures, a close-up, borders and rivers, and a ring for a wonder ----------
  const layer = new THREE.Group(); layer.visible = false; globeBall.add(layer);
  // photos of the Earth are already lit by the Sun, so the room's lamps don't shade them again
  const skin = new THREE.MeshBasicMaterial({color: 0xffffff});
  let maps = null, labels = [], lens = lensBy(store.lens), textures = new Map(), patch = null, want = null, asking = null, settled = 0;
  const lines = (polylines, color, opacity, lift) => {
    const pts = [];
    for (const l of polylines) for (let i = 0; i + 3 < l.length; i += 2) pts.push(surface(l[i + 1], l[i]).multiplyScalar(R*lift), surface(l[i + 3], l[i + 2]).multiplyScalar(R*lift));
    const m = new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(pts), new THREE.LineBasicMaterial({color, transparent: true, opacity, depthWrite: false}));
    layer.add(m); return m;
  };
  let borders = null, coasts = null, rivers = [];
  const ring = new THREE.Mesh(new THREE.RingGeometry(.92, 1, 64), new THREE.MeshBasicMaterial({color: 0xffd36b, transparent: true, side: THREE.DoubleSide, depthWrite: false}));
  ring.visible = false; layer.add(ring);

  async function load(){
    if (maps) return maps;
    const [geo, earth] = await Promise.all([loadGeography(), room.earth()]);
    if (maps) return maps;
    borders = lines(geo.borders, 0xfff4d6, .7, 1.0015);
    coasts = lines(earth.land, 0xbfe0ff, .45, 1.0012);
    // rivers come out with zoom, the great ones first, like their names
    const byMag = new Map();
    for (const r of geo.rivers) { const k = Math.round(magFor(r.min)); (byMag.get(k) || byMag.set(k, []).get(k)).push(...r.lines); }
    rivers = [...byMag].map(([k, ls]) => Object.assign(lines(ls, 0x8fd0ff, .75, 1.001), {mag: k}));
    // every name the globe can show, most important first: the order names.js places them in
    labels = [
      ...geo.countries.map(c => ({text: c.short || c.name, kind: 'country', lat: c.at[0], lon: c.at[1], rank: c.min, ref: {country: c}})),
      ...[...geo.places, ...LANDMARKS].map(p => ({text: (p.kind === 'peak' || p.kind === 'volcano') && p.elevation ? `${p.name} ${p.elevation.toLocaleString()} m` : p.name, kind: p.kind, lat: p.at[0], lon: p.at[1],
        rank: p.kind === 'continent' ? -2 : p.kind === 'ocean' ? -1 : p.min + (p.kind === 'capital' || p.kind === 'peak' || p.kind === 'volcano' ? 1 : .4), ref: {place: p}})),
      ...geo.rivers.map(r => { const l = r.lines.reduce((a, b) => b.length > a.length ? b : a), i = Math.floor(l.length/4)*2;
        return {text: r.name, kind: 'river', lat: l[i + 1], lon: l[i], rank: r.min + 1, ref: {river: r}}; }),
    ].sort((a, b) => a.rank - b.rank);
    return maps = {geo, earth};
  }

  async function setLens(id){
    lens = lensBy(id); store.lens = lens.id; room.keep(); tip.textContent = lens.tip;
    bar.querySelectorAll('.glens').forEach(b => b.setAttribute('aria-pressed', b.dataset.id === lens.id));
    dropPatch(); want = null;
    const l = lens;
    try {
      await load();
      if (!textures.has(l.id)) textures.set(l.id, wholeEarth(l, maps));
      const t = await textures.get(l.id);
      if (lens !== l || !on) return;
      skin.map = t; skin.needsUpdate = true; globeBall.material = skin;
      room.credit([`Pictures: ${l.credit}`, 'Photos: Wikipedia and iNaturalist', ...maps.geo.credits, ...maps.earth.credits].join(' · '));
      // a dark Earth needs its coasts drawn to be read; the painted one has its own
      if (coasts) coasts.visible = !!l.coasts;
    } catch (e) { console.warn('geography globe:', e); textures.delete(l.id); if (lens === l && on) room.toast('The pictures need the internet', 'Try again in a moment'); }
    room.redraw();
  }
  for (const l of LENSES) {
    const b = document.createElement('button'); b.className = 'glens'; b.dataset.id = l.id; b.textContent = l.name; b.title = l.tip;
    b.addEventListener('click', () => { setLens(l.id); Sound.tone(880, {type: 'triangle', dur: .08, vol: .05}); });
    bar.append(b);
  }

  // ---------- the close-up: a sharper picture of just what's in view, once the globe holds still ----------
  // The explorer looks along the line from the camera to the globe's middle, so what's in the middle
  // of the view is where that line meets the surface; how much shows round it depends on the zoom.
  const at = new THREE.Vector3(), mid = new THREE.Vector3();
  function inView(){
    const c = globeBall.getWorldPosition(mid), d = camera.position.distanceTo(c);
    at.copy(camera.position).sub(c).normalize().multiplyScalar(R).add(c);
    const p = globeBall.worldToLocal(at.clone()).normalize();
    const tanH = Math.tan(camera.fov*RAD/2)/camera.zoom, half = Math.min(60, (d - R)*tanH/R/RAD*1.15);
    return {lat: Math.asin(p.y)/RAD, lon: Math.atan2(-p.z, p.x)/RAD, half, perDeg: innerHeight/2/half};
  }
  function wanted(v){
    // the base picture is 4096 wide, about 11 pixels a degree; leaning in past that is when a close-up helps
    if (v.perDeg < 14 || room.view.mag < 2) return null;
    const half = v.half*1.6, grid = Math.max(.5, half/2), snap = x => Math.round(x/grid)*grid;
    const lonHalf = Math.min(180, half*Math.max(1, camera.aspect)/Math.max(.15, Math.cos(v.lat*RAD)));
    const box = {s: Math.max(-90, snap(v.lat) - half), n: Math.min(90, snap(v.lat) + half), w: Math.max(-180, snap(v.lon) - lonHalf), e: Math.min(180, snap(v.lon) + lonHalf)};
    const perDeg = Math.min(lens.sharpest, v.perDeg*Math.min(devicePixelRatio, 1.5));
    const w = Math.round(Math.min(2048, (box.e - box.w)*perDeg)), h = Math.round(Math.min(2048, (box.n - box.s)*perDeg));
    return {box, w, h, perDeg: Math.min(w/(box.e - box.w), h/(box.n - box.s)), lens};
  }
  const covers = (a, v) => a && a.lens === lens && v.lat - v.half > a.box.s && v.lat + v.half < a.box.n && v.lon > a.box.w && v.lon < a.box.e
    && a.perDeg >= Math.min(lens.sharpest, v.perDeg)*.7;
  async function fetchPatch(w){
    asking = w;
    try {
      const t = await closeUp(w.lens, w.box, w.w, w.h, maps);
      if (asking !== w || !on) { t.dispose(); return; }
      const b = w.box, mesh = new THREE.Mesh(
        new THREE.SphereGeometry(R*1.0006, Math.max(8, Math.ceil((b.e - b.w)/2)), Math.max(6, Math.ceil((b.n - b.s)/2)), (b.w + 180)*RAD, (b.e - b.w)*RAD, (90 - b.n)*RAD, (b.n - b.s)*RAD),
        new THREE.MeshBasicMaterial({map: t, transparent: true, opacity: 0}));
      dropPatch(); patch = Object.assign(mesh, {want: w}); layer.add(patch);
    } catch (e) { if (want === w) want = null; /* the base picture still shows; the next settle tries again */ } finally { if (asking === w) asking = null; }
  }
  function dropPatch(){ if (!patch) return; layer.remove(patch); patch.geometry.dispose(); patch.material.map.dispose(); patch.material.dispose(); patch = null; }

  // ---------- names ----------
  const shown = new THREE.Vector3(), normal = new THREE.Vector3(), toCam = new THREE.Vector3();
  function project(lat, lon){
    shown.copy(surface(lat, lon)).multiplyScalar(R); globeBall.localToWorld(shown);
    normal.copy(shown).sub(globeBall.getWorldPosition(mid)).normalize(); toCam.copy(camera.position).sub(shown).normalize();
    if (normal.dot(toCam) < .12) return null;
    shown.project(camera);
    return [(shown.x + 1)/2*innerWidth, (1 - shown.y)/2*innerHeight];
  }
  let drawnAt = '';
  function drawNames(){
    const m = room.view.mag, e = globeBall.matrixWorld.elements;
    const key = [e[0], e[1], e[2], e[4], m, innerWidth, innerHeight, camera.position.x, camera.position.y, store.wonders.size, lens.id, C.target?.text].map(v => typeof v === 'number' ? v.toFixed(4) : v).join();
    if (key === drawnAt) return; drawnAt = key;
    const found = WONDERS.filter(w => store.wonders.has(w.id));
    // a found wonder's sights come out once the explorer leans in on it, and its own name, which
    // would sit on top of one of them, steps aside
    const near = found.filter(w => w.sights && m >= w.zoom*.75);
    const sights = near.flatMap(w => w.sights.map(s => ({text: s.name, kind: 'sight', lat: s.at[0], lon: s.at[1], rank: -1.4, ref: {sight: s, wonder: w}})));
    // the name Hoot has circled for a challenge goes first, or a neighbour's name could take its place
    const circled = C.kind === 'seek' && C.target ? [C.target] : [];
    names.draw([...circled, ...found.filter(w => !near.includes(w)).map(w => ({text: w.name, kind: 'wonder', lat: w.at[0], lon: w.at[1], rank: -1.5, ref: {wonder: w}})), ...sights,
      ...labels.filter(l => l !== C.target && (l.rank < 0 || magFor(l.rank) <= m*1.1))], project);
  }

  // ---------- the card ----------
  let C = {kind: 'idle'};   // what the card is about: idle, place, feature, hunt, wonder or sight, or one of the notebook's
  const H = room.H;
  function draw(){
    room.setColor(null);
    if (!maps) { card.innerHTML = '<div class="ghint">Bringing the Earth down from space…</div>'; return; }
    if (C.kind === 'hunt') return drawHunt();
    if (C.kind === 'wonder') return drawWonder();
    if (C.kind === 'place') return drawPlace();
    if (C.kind === 'feature') return drawFeature();
    if (C.kind === 'sight') return drawSight();
    if (nb.cards[C.kind]) return nb.cards[C.kind](C);
    card.innerHTML = `<div class="ghint">Drag to spin. Pinch, scroll or press + to lean in close.<br>Tap anywhere to explore it, or tap a name!<br><br>Or pick a wonder at the bottom for one of Hoot's photo riddles, or open Hoot's landform notebook.</div>`;
  }
  const head = (icon, kind, title, within) => `<div class="gtop"><span class="gicon" aria-hidden="true">${icon}</span><div><div class="gkind">${esc(kind)}</div><h3>${esc(title)}</h3>${within ? `<div class="gwithin">${esc(within)}</div>` : ''}</div></div>`;
  // A photo, its first words and its credit, filled in when the article arrives: the first of the
  // titles there's an article for. A riddle's photo comes without words, which would name it.
  function photoBlock(titles, slot, {words = true, alt} = {}){
    titles = [].concat(titles).filter(Boolean);
    if (!titles.length) return '';
    const find = async () => { for (const t of titles) { const a = await article(t); if (a) return [t, a]; } return []; };
    find().then(([title, a]) => {
      const el = card.querySelector(`[data-slot="${slot}"]`); if (!el) return;
      if (!a || (!a.photo && !words)) { el.remove(); return; }
      el.innerHTML = `${a.photo ? `<div class="gpic"><img alt="${esc(alt || title)}" src="${esc(a.photo.src)}"></div><div class="gcap" data-credit></div>` : ''}${words && a.text ? `<p>${esc(a.text)}</p>` : ''}`;
      if (a.photo) photoCredit(a.photo).then(c => { const cr = el.querySelector('[data-credit]'); if (cr) cr.textContent = c; });
    }, () => { const el = card.querySelector(`[data-slot="${slot}"]`); if (el) el.innerHTML = offline; });
    return `<div data-slot="${slot}"><div class="gpic"></div></div>`;
  }

  // ---------- a field guide to wherever was tapped ----------
  function visit(lat, lon){
    const p = maps.earth.placeAt(lat, lon), country = maps.geo.countryAt(lat, lon);
    C = {kind: 'place', lat, lon, p, country, animals: null};
    room.dropPin(lat, lon); room.tune([660, 990], {gap: .07, dur: .12, vol: .05});
    draw();
  }
  function drawPlace(){
    const {p, country} = C, b = p.biome, land = !b.water;
    const title = country ? country.name : p.name;
    const within = country ? [country.continent, country.capital && `capital: ${country.capital}`].filter(Boolean).join(' · ') : p.within ? `In the ${p.within}` : '';
    // the ecoregion is the most exact thing the model knows here: 847 of them, against 18 biomes
    const eco = land || p.biomeId === 'reef' || p.biomeId === 'lake' ? p.name : null;
    room.setColor(b.color);
    card.innerHTML = `${head(b.icon, country ? 'Country' : b.name, title, within)}
      ${eco && eco !== title ? `<div class="gsec">What grows here</div><div><span class="gbadge"><span aria-hidden="true">${b.icon}</span>${esc(b.name)}</span> <b>${esc(eco)}</b></div>` : ''}
      ${photoBlock([eco, country ? country.wiki : p.name], 'eco')}
      ${C.animals ? animalsBlock() : ''}
      <div class="gbtns">${C.animals ? '' : room.btn('gWho', 'Who lives here?')}${room.btn('gWeb', 'Its food web', 'gb ghost')}</div>`;
    room.on('gWho', whoLivesHere); room.on('gWeb', () => room.openWebAt(p));
    wireAnimals();
  }

  // Hoot asks first: three of these were really seen here, and one wasn't. Then everyone seen here.
  async function whoLivesHere(){
    const c = C; c.animals = {step: 'loading'}; draw();
    const far = farWeb(c.p);
    try {
      const [here, there] = await Promise.all([seenNear(c.lat, c.lon), far ? seenNear(...far.at) : []]);
      if (C !== c) return;
      const q = oddOneOut(here, there);
      c.animals = !here.length ? {step: 'none'} : q ? {step: 'quiz', q, here, far} : {step: 'all', here};
      if (q) room.story([H('People really took these pictures! Three of these animals were spotted near here. One lives far, far away.'), H("Which one doesn't belong?")]);
    } catch (e) { if (C === c) c.animals = {step: 'offline'}; }
    if (C === c) { draw(); showAnimals(); }
  }
  // the animals come below the place's own photo, out of sight on a short card
  const showAnimals = () => card.querySelector('.gsec:last-of-type, .ganimals')?.scrollIntoView({block: 'start', behavior: 'smooth'});
  // somewhere a long way off with a different biome, so its animals stand out
  function farWeb(p){
    const far = WEBS.filter(w => !w.biomes.includes(p.biomeId) && arc(p.lat, p.lon, ...w.at) > 5000);
    return far[Math.floor(Math.random()*far.length)] || null;
  }
  function animalsBlock(){
    const a = C.animals;
    if (a.step === 'loading') return '<div class="gsec">Who lives here?</div><div class="ghint">Looking through explorers\' photos…</div>';
    if (a.step === 'offline') return offline;
    if (a.step === 'none') return '<div class="gsec">Who lives here?</div><p class="gtry">Nobody has shared a photo of a wild animal near here yet! Out at sea and on the ice, explorers are few. Try somewhere near a coast.</p>';
    const tile = (x, i, cls = '') => `<button data-a="${i}" class="${cls}" aria-label="${esc(x.name)}"><img alt="" loading="lazy" src="${esc(x.photo)}"><b>${esc(x.name)}</b></button>`;
    if (a.step === 'quiz') {
      const done = a.picked != null;
      return `<div class="gsec">Which one doesn't live here?</div><div class="ganimals four">${a.q.choices.map((x, i) => tile(x, i, !done ? '' : x === a.q.odd ? 'odd' : i === a.picked ? 'wrongpick' : 'dim')).join('')}</div>
        ${done ? `<p class="gwarm ${a.q.choices[a.picked] === a.q.odd ? 'hot' : ''}">${a.q.choices[a.picked] === a.q.odd ? 'You spotted it!' : 'Not that one!'} The ${esc(a.q.odd.name.toLowerCase())} lives in ${esc(a.far.place)}.</p>
          <div class="gbtns">${room.btn('gAll', 'See who lives here')}</div>` : ''}`;
    }
    const big = a.big != null ? a.here[a.big] : null;
    return `<div class="gsec">Spotted near here by real explorers</div>
      ${big ? `<div class="gpic tall"><img alt="${esc(big.name)}" src="${esc(big.photo.replace('/medium.', '/large.'))}"></div><p><b>${esc(big.name)}</b> · ${esc(big.group.toLowerCase())} · <i>${esc(big.sci)}</i><br>Photographed near here ${big.count.toLocaleString()} time${big.count === 1 ? '' : 's'}.</p><div class="gcap">${esc(big.credit)}</div>` : ''}
      <div class="ganimals">${a.here.map((x, i) => tile(x, i, i === a.big ? 'odd' : '')).join('')}</div><div class="gcap">Wildlife sightings: iNaturalist</div>`;
  }
  function wireAnimals(){
    const a = C.animals; if (!a) return;
    card.querySelectorAll('.ganimals button').forEach(b => b.addEventListener('click', () => {
      const i = +b.dataset.a;
      if (a.step === 'quiz') {
        if (a.picked != null) return;
        a.picked = i; const right = a.q.choices[i] === a.q.odd;
        room.tune(right ? [659, 784, 1046] : [392, 330], {vol: .06});
        room.story([H(right ? `Yes! The ${a.q.odd.name.toLowerCase()} doesn't live here. It lives in ${a.far.place}.` : `No, the ${a.q.choices[i].name.toLowerCase()} really was spotted here! The odd one out is the ${a.q.odd.name.toLowerCase()}. It lives in ${a.far.place}.`),
          H('Animals live where their home suits them: the right weather, the right food, the right places to hide.')]);
      } else { a.big = a.big === i ? null : i; Sound.tone(880, {type: 'triangle', dur: .06, vol: .05}); }
      draw();
    }));
    room.on('gAll', () => { a.step = 'all'; a.big = null; room.endTalk(); draw(); showAnimals(); });
  }

  // ---------- a name on the map, tapped ----------
  function feature(it){
    C = {kind: 'feature', it}; room.tune([784, 1046], {gap: .06, dur: .1, vol: .05}); draw();
  }
  function drawFeature(){
    const {it} = C, r = it.ref;
    if (r.sight) { C = {kind: 'sight', w: r.wonder, s: r.sight}; return drawSight(); }
    if (r.wonder) { C = {kind: 'wonder', w: r.wonder}; return drawWonder(); }
    const c = r.country, p = r.place;
    const kind = KIND_WORD[it.kind] || 'Place', title = c ? c.name : p ? p.name : it.text;
    const within = c ? [c.continent, c.capital && `capital: ${c.capital}`].filter(Boolean).join(' · ') : p && p.elevation ? `${p.elevation.toLocaleString()} metres ${p.kind === 'lowest' ? 'below the sea' : 'high'}` : '';
    card.innerHTML = `${head(c ? '🏳️' : it.kind === 'river' ? '🏞️' : p && /peak|mountains/.test(p.kind) ? '⛰️' : /ocean|sea|gulf|bay|strait|channel|sound/.test(it.kind) ? '🌊' : '📍', kind, title, within)}
      ${photoBlock(c ? c.wiki : p ? p.wiki : `${it.text} River`, 'f')}
      <div class="gbtns">${room.btn('gHere', 'Explore here')}</div>`;
    room.on('gHere', () => visit(it.lat, it.lon));
  }

  // ---------- wonders: a real photo, and where in the world is it? ----------
  function chips(){
    const [w, l] = shelfEl.children;
    w.innerHTML = `📷<span> Wonders</span> ${store.wonders.size}/${WONDERS.length}`; l.innerHTML = `📒<span> Landforms</span> ${nb.tally()}`;
    w.setAttribute('aria-label', `Wonders: ${store.wonders.size} of ${WONDERS.length} found`); l.setAttribute('aria-label', `Hoot's landform notebook: ${nb.tally().replace('/', ' of ')} found`);
    w.setAttribute('aria-pressed', shelf === 'wonders'); l.setAttribute('aria-pressed', shelf === 'landforms');
    if (shelf === 'landforms') return room.chips(nb.chips());
    // an unfound wonder's own icon would give its riddle away
    room.chips(WONDERS.map(w => ({icon: store.wonders.has(w.id) ? w.icon : '📷', found: store.wonders.has(w.id), hunting: C.kind === 'hunt' && C.w === w,
      label: store.wonders.has(w.id) ? `Go to the ${w.name}` : 'Photo riddle: where in the world?',
      text: store.wonders.has(w.id) ? w.name : 'Where in the world?',
      go: () => store.wonders.has(w.id) ? showWonder(w) : hunt(w)})));
  }
  function hunt(w){
    C = {kind: 'hunt', w, misses: 0, last: null, said: ''}; ring.visible = false; room.hidePin();
    room.tune([392, 523, 659], {gap: .1}); chips(); draw();
    room.story([H("Here's a real photo of one of the wonders of the world. Where in the world do you think it is?"), H(w.clue), H('Spin the globe, then tap where you think it is!')]);
  }
  function drawHunt(){
    const {w} = C;
    room.setColor('#6d3b5e');
    card.innerHTML = `${head('🦉', "Hoot's photo riddle", 'Where in the world?')}
      ${photoBlock(w.wiki, 'h', {words: false, alt: 'A wonder of the world'})}<p class="gask">${esc(w.clue)}</p>
      ${C.said ? `<p class="gwarm">${esc(C.said)}</p>` : ''}${C.misses >= 2 ? `<p class="gtry">${esc(w.hint)}</p>` : ''}
      <div class="gbtns">${room.btn('gStop', 'Stop the riddle', 'gb ghost')}</div>`;
    room.on('gStop', () => { C = {kind: 'idle'}; ring.visible = false; chips(); draw(); });
  }
  function guess(lat, lon){
    const {w} = C, j = judge({lat, lon}, w, C.last);
    room.dropPin(lat, lon); room.endTalk();
    if (j.found) {
      store.wonders.add(w.id); room.keep(); ring.visible = false;
      room.toast(`Wonder found · ${store.wonders.size} of ${WONDERS.length}`, `${w.icon} ${w.name}`);
      room.tune([523, 659, 784, 1046, 1319], {gap: .09, dur: .3, vol: .07});
      showWonder(w, [H(`You found it! It's the ${w.name}!`), H(w.fact)]);
      return;
    }
    C.misses++; C.last = j.km;
    const there = maps.geo.countryAt(lat, lon), what = the(there ? there.name : maps.earth.placeAt(lat, lon).name);
    const warm = j.warmer == null ? '' : j.warmer ? 'Warmer! ' : 'Colder! ';
    C.said = `${warm}That's ${what}. It's about ${j.about.toLocaleString()} km to the ${j.way}.`;
    const lines = [H(C.said)];
    if (C.misses === 2) lines.push(H(w.hint));
    if (C.misses >= 4) { showRing(w.at, Math.max(w.r, 400)); lines.push(H("I've drawn a gold circle around it for you. Tap inside it!")); }
    room.tune(j.warmer ? [523, 659] : [330, 262], {gap: .1, dur: .16, vol: .05});
    draw(); room.story(lines);
  }
  function showRing(at, km){
    const n = surface(...at), k = km/6371*R*1.6;
    ring.position.copy(n).multiplyScalar(R*1.002); ring.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), n); ring.scale.setScalar(k); ring.visible = true;
  }
  function showWonder(w, lines){
    C = {kind: 'wonder', w}; room.dropPin(...w.at); room.flyTo(...w.at, w.zoom); chips(); draw();
    if (lines) room.story(lines);
  }
  function drawWonder(){
    const {w} = C;
    room.setColor('#d9a441');
    card.innerHTML = `${head(w.icon, 'Wonder of the world', w.name, w.where || (maps.geo.countryAt(...w.at) || {}).name || '')}
      ${photoBlock(w.wiki, 'w')}<p class="gask">${esc(w.fact)}</p>
      ${w.sights ? `<div class="gsec">Sights to lean in on</div><div class="gsights">${w.sights.map((s, i) => `<button data-s="${i}">📍 ${esc(s.name)}</button>`).join('')}</div>` : ''}
      ${gallery(w.wiki, 'wg')}
      <div class="gbtns">${room.btn('gHere', 'Who lives here?')}${room.btn('gZoom', 'Lean in close', 'gb ghost')}</div>`;
    room.on('gHere', () => { visit(...w.at); whoLivesHere(); });
    room.on('gZoom', () => room.flyTo(...w.at, Math.min(MAX_MAG, w.zoom*2)));
    card.querySelectorAll('.gsights button').forEach(b => b.addEventListener('click', () => goSight(w, w.sights[+b.dataset.s])));
  }

  // ---------- a wonder's sights: lean in on one part of it ----------
  function goSight(w, s){
    C = {kind: 'sight', w, s}; room.dropPin(...s.at); room.flyTo(...s.at, Math.max(w.zoom*2.5, 40));
    room.tune([784, 1046], {gap: .06, dur: .1, vol: .05}); draw();
  }
  function drawSight(){
    const {w, s} = C;
    room.setColor('#d9a441');
    card.innerHTML = `${head(w.icon, `Part of the ${w.name}`, s.name)}
      ${photoBlock(s.wiki, 's', {words: false})}<p class="gask">${esc(s.line)}</p>
      ${gallery(s.wiki, 'sg')}
      <div class="gsights">${w.sights.filter(o => o !== s).map(o => `<button data-s="${w.sights.indexOf(o)}">📍 ${esc(o.name)}</button>`).join('')}</div>
      <div class="gbtns">${room.btn('gHere', 'Who lives here?')}${room.btn('gWonder', `The whole ${w.name}`, 'gb ghost')}</div>`;
    room.on('gHere', () => { visit(...s.at); whoLivesHere(); });
    room.on('gWonder', () => showWonder(w));
    card.querySelectorAll('.gsights button').forEach(b => b.addEventListener('click', () => goSight(w, w.sights[+b.dataset.s])));
  }

  // A strip of the article's other photos; tapping one shows it big, with its caption and who took it.
  // Kept to wonders and their sights, whose articles are pictures of the place itself.
  function gallery(title, slot){
    pictures(title).then(list => {
      const el = card.querySelector(`[data-slot="${slot}"]`); if (!el) return;
      if (list.length < 2) { el.remove(); return; }
      const strip = el.querySelector('.gshots'), big = el.querySelector('.gbig');
      strip.innerHTML = list.map((p, i) => `<button data-i="${i}" aria-pressed="false" aria-label="${esc(p.caption || 'Photo ' + (i + 1))}"><img alt="" loading="lazy" src="${esc(p.small)}"></button>`).join('');
      strip.querySelectorAll('button').forEach(b => b.addEventListener('click', () => {
        const p = list[+b.dataset.i], open = b.getAttribute('aria-pressed') === 'true';
        strip.querySelectorAll('button').forEach(o => o.setAttribute('aria-pressed', 'false'));
        Sound.tone(880, {type: 'triangle', dur: .06, vol: .04});
        if (open) { big.innerHTML = ''; return; }
        b.setAttribute('aria-pressed', 'true');
        big.innerHTML = `<div class="gpic tall"><img alt="${esc(p.caption)}" src="${esc(p.src)}"></div>${p.caption ? `<p>${esc(p.caption)}</p>` : ''}<div class="gcap" data-credit></div>`;
        photoCredit(p).then(c => { const cr = big.querySelector('[data-credit]'); if (cr) cr.textContent = c; });
      }));
    }, () => card.querySelector(`[data-slot="${slot}"]`)?.remove());
    return `<div data-slot="${slot}"><div class="gsec">More real photos</div><div class="gbig"></div><div class="gshots"></div></div>`;
  }

  // ---------- Hoot's landform notebook ----------
  const nb = makeNotebook(room, {card, esc, the, head, photoBlock, gallery, MAX_MAG, magFor,
    now: () => C, show: c => { C = c; ring.visible = false; chips(); draw(); }, redraw: () => draw(),
    labels: () => labels, centre: () => inView(), ring: showRing, explore: visit,
    countryAt: (lat, lon) => maps.geo.countryAt(lat, lon), whereIs: (lat, lon) => the((maps.geo.countryAt(lat, lon) || maps.earth.placeAt(lat, lon)).name),
    shelf: s => { shelf = s; chips(); }});
  shelfEl.querySelectorAll('button').forEach(b => b.addEventListener('click', () => {
    if (shelf === b.dataset.s) return;
    shelf = b.dataset.s; Sound.tone(880, {type: 'triangle', dur: .08, vol: .05}); chips();
    if (shelf === 'landforms') nb.opened();
  }));

  // ---------- coming and going ----------
  let on = false;
  async function enter(){
    on = true; hud.classList.add('geography'); layer.visible = true; names.el.hidden = false; tip.hidden = bar.hidden = zoomer.hidden = shelfEl.hidden = false;
    C = {kind: 'idle'}; drawnAt = ''; chips();
    if (!store.metGeo) { store.metGeo = true; room.keep();
      room.story([H('This is the real Earth, photographed from space by satellites!'),
        H('Lean in close and you can see real mountains, rivers and deserts. Tap anywhere and I\'ll show you photos of what lives there.'),
        H('Or pick a wonder at the bottom. I\'ll show you a real photo, and you find where in the world it is!'),
        H('And tap the names! Every new kind of landform goes in my notebook.')]); }
    await setLens(lens.id);
    if (on) draw();
  }
  function leave(){
    on = false; hud.classList.remove('geography'); layer.visible = false; names.el.hidden = true; names.clear(); tip.hidden = bar.hidden = zoomer.hidden = shelfEl.hidden = true;
    dropPatch(); asking = null; want = null; ring.visible = false;
  }
  function zoomBy(k){ room.view.fly = null; room.view.mag = Math.max(1, Math.min(MAX_MAG, room.view.mag*k)); Sound.tone(k > 1 ? 880 : 660, {type: 'triangle', dur: .06, vol: .04}); }

  // a tap: a name if it's on one, else wherever on the globe it landed
  function tap(x, y){ const it = names.hit(x, y); if (!it) return false; if (!nb.tapped(it)) feature(it); return true; }
  function press(lat, lon){ if (!maps) return; if (C.kind === 'hunt') guess(lat, lon); else if (!nb.pressed()) visit(lat, lon); }
  // Esc: a riddle or challenge, then whatever's on the card, then it's the globe's to handle
  function back(){
    if (C.kind === 'hunt' || C.kind === 'seek') { C = {kind: 'idle'}; ring.visible = false; chips(); draw(); return true; }
    if (C.kind === 'sight') { showWonder(C.w); return true; }
    if (C.kind !== 'idle') { C = {kind: 'idle'}; ring.visible = false; room.hidePin(); draw(); return true; }
    return false;
  }

  function frame(dt, still){
    if (!on || !maps) return;
    const m = room.view.mag;
    likeEl.textContent = like(m);
    zIn.disabled = m >= MAX_MAG - .01; zOut.disabled = m <= 1.01;
    for (const r of rivers) r.visible = m >= r.mag && lens.id !== 'night';
    if (ring.visible) ring.material.opacity = .6 + Math.sin(performance.now()/240)*.35;
    if (patch && patch.material.opacity < 1) patch.material.opacity = Math.min(1, patch.material.opacity + dt*3);
    drawNames();
    // a close-up is asked for once the globe has held still a moment, and only if the one shown won't do
    settled = still ? settled + dt : 0;
    if (settled > .3 && !asking) {
      const v = inView();
      if (!covers(patch && patch.want, v)) { const w = wanted(v); if (w && JSON.stringify(w.box) !== JSON.stringify(want && want.box)) { want = w; fetchPatch(w); } }
      if (patch && room.view.mag < 1.6) dropPatch();
    }
  }

  return {enter, leave, draw, chips, tap, press, back, frame, zoomBy, MAX_MAG};
}
