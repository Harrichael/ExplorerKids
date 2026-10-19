// The weather globe: the sky over the real Earth, today. Its lenses are yesterday's real clouds as
// a satellite saw them, and maps of the temperature, rain and snow, and wind right now, painted from
// live weather reports all round the world; the wind's map moves. Night's shadow lies where it really
// is. Tap anywhere and Hoot asks what it feels like there right now before he shows the real
// weather, and why it's like that. Or take one of Hoot's missions: find somewhere it's snowing, say,
// right now, checked against the real weather where the explorer taps.
//
// real-earth.js owns the pictures, the names and the card's photos; `sat` is what it lends.

import * as THREE from 'three';
import { Sound } from '../core/sound.js';
import { CREDIT, FEELS, MISSIONS, breeze, compass, feel, isRaining, isSnowing, sky, weatherAt, weatherGrid, why } from '../earth/weather.js';
import { LENSES } from './imagery.js';

const css = document.createElement('style');
css.textContent = `
.wlegend{position:absolute;left:max(16px,env(safe-area-inset-left,0px));bottom:calc(112px + env(safe-area-inset-bottom,0px));pointer-events:none;font-weight:900;font-size:11px;color:var(--parch);text-shadow:0 1px 3px #000}
.wlegend i{display:block;width:180px;height:10px;border-radius:5px;border:2px solid var(--ink);margin:2px 0}
.wlegend span{display:flex;justify-content:space-between;width:184px}
.talking .wlegend{visibility:hidden}
#gCard .wbig{display:flex;align-items:center;gap:12px}
#gCard .wbig b{font-size:46px;line-height:1}
#gCard .wbig div{font-weight:900;font-size:15px;line-height:1.3}
#gCard .wbig strong{font-family:var(--display);font-weight:400;font-size:30px}
.wfeels{display:grid;grid-template-columns:repeat(5,1fr);gap:5px}
.wfeels button{display:flex;flex-direction:column;align-items:center;gap:2px;font-weight:900;font-size:12px;color:var(--ink);background:#fbf4e2;border:2.5px solid var(--ink);border-radius:12px;padding:6px 2px}
.wfeels button span{font-size:22px}
.wfeels button.right{box-shadow:0 0 0 3px #3e9b54}.wfeels button.wrong{box-shadow:0 0 0 3px #c4473a}
@media (max-aspect-ratio:1/1){.wlegend{bottom:calc(150px + env(safe-area-inset-bottom,0px))}}`;
document.head.appendChild(css);

const RAD = Math.PI/180;
const hour = () => new Date().toISOString().slice(0, 13);
const live = {data: () => weatherGrid(), stamp: hour, layers: 'BlueMarble_NextGeneration', sharpest: 40, credit: `NASA Blue Marble, via NASA GIBS · ${CREDIT}`};

// a colour for each of a ramp's values, blended between its stops
const ramp = stops => v => {
  if (v <= stops[0][0]) return stops[0][1];
  for (let k = 1; k < stops.length; k++) if (v <= stops[k][0]) {
    const [a, ca] = stops[k - 1], [b, cb] = stops[k], f = (v - a)/(b - a);
    return ca.map((x, i) => x + (cb[i] - x)*f);
  }
  return stops[stops.length - 1][1];
};
const HEAT = [[-40, [150, 40, 190, 175]], [-20, [60, 70, 225, 170]], [0, [140, 210, 255, 160]], [10, [90, 200, 120, 150]], [20, [250, 225, 80, 155]], [30, [245, 130, 40, 165]], [42, [200, 20, 30, 180]]];
const heat = ramp(HEAT), wet = ramp([[.02, [80, 160, 255, 0]], [.15, [80, 160, 255, 130]], [1, [40, 90, 230, 190]], [4, [140, 50, 210, 220]]]);
const css3 = c => `rgba(${c.slice(0, 3).map(Math.round)},${(c[3]/255).toFixed(2)})`;

// paints a field from the weather grid over the box, half a degree to a pixel at most; the browser
// smooths it the rest of the way
function field(g, x, y, w, h, box, grid, colour){
  const cols = Math.max(2, Math.min(w, Math.ceil((box.e - box.w)*2))), rows = Math.max(2, Math.min(h, Math.ceil((box.n - box.s)*2)));
  const c = document.createElement('canvas'); c.width = cols; c.height = rows;
  const cg = c.getContext('2d'), img = cg.createImageData(cols, rows);
  for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) {
    const v = grid.at(box.n - (j + .5)*(box.n - box.s)/rows, box.w + (i + .5)*(box.e - box.w)/cols);
    img.data.set(colour(v).map(Math.round), (j*cols + i)*4);
  }
  cg.putImageData(img, 0, 0);
  g.imageSmoothingEnabled = true; g.drawImage(c, x, y, w, h);
}
const dim = (g, x, y, w, h, a) => { g.fillStyle = `rgba(4,10,28,${a})`; g.fillRect(x, y, w, h); };

const WEATHER_LENSES = [
  LENSES.find(l => l.id === 'clouds'),
  {...live, id: 'temp', name: 'Temperature now', tip: 'How warm the air is right now, all round the world. Blue is cold, red is hot.',
    legend: {stops: HEAT, words: ['-40 °C', '0 °C', '42 °C']},
    over: (g, x, y, w, h, box, grid) => { dim(g, x, y, w, h, .25); field(g, x, y, w, h, box, grid, v => heat(v.temperature)); }},
  {...live, id: 'rain', name: 'Rain & snow now', tip: 'Where rain and snow are falling right now. Blue is rain, white is snow.',
    legend: {stops: [[0, [80, 160, 255, 130]], [1, [40, 90, 230, 190]], [2, [140, 50, 210, 220]]], words: ['A little rain', 'Pouring!']},
    over: (g, x, y, w, h, box, grid) => { dim(g, x, y, w, h, .3); field(g, x, y, w, h, box, grid, v => isSnowing(v) && v.temperature < 2 ? [255, 255, 255, Math.min(220, 120 + v.snow*200)] : wet(v.rain)); }},
  {...live, id: 'wind', name: 'Wind now', tip: 'The wind blowing right now. Every streak is a puff of air: the faster it moves, the stronger the wind.',
    over: (g, x, y, w, h) => dim(g, x, y, w, h, .45)},
];

export function makeWeather(sat){
  const {room, card, store, esc, the, head, globeBall, R, surface} = sat;
  const H = room.H;
  let labels = [], C = {kind: 'idle'}, grid = null;
  const legend = document.createElement('div'); legend.className = 'wlegend'; legend.hidden = true; room.hud.append(legend);

  function loaded({geo}){
    labels = [
      ...geo.countries.map(c => ({text: c.short || c.name, kind: 'country', lat: c.at[0], lon: c.at[1], rank: c.min + .5, ref: {country: c}})),
      ...geo.places.filter(p => p.kind === 'continent' || p.kind === 'ocean' || p.kind === 'capital').map(p => ({text: p.name, kind: p.kind, lat: p.at[0], lon: p.at[1],
        rank: p.kind === 'continent' ? -2 : p.kind === 'ocean' ? -1 : p.min + 1.5, ref: {place: p}})),
    ].sort((a, b) => a.rank - b.rank);
  }
  // a title for the card, and where it is for Hoot to say: 'near Reykjavík, in Iceland', 'in the Pacific Ocean'
  function placeName(lat, lon){
    const {geo, earth} = sat.maps(), c = geo.countryAt(lat, lon);
    if (!c) { const sea = earth.placeAt(lat, lon), name = sea.within || sea.name; return {title: name, where: `in ${the(name)}`}; }
    const town = geo.places.filter(p => p.kind === 'capital').map(p => ({p, d: Math.hypot(p.at[0] - lat, (p.at[1] - lon)*Math.cos(lat*RAD))})).sort((a, b) => a.d - b.d)[0];
    return town && town.d < 3 ? {title: `Near ${town.p.name}, ${c.short || c.name}`, where: `near ${town.p.name}, in ${the(c.name)}`} : {title: c.name, where: `in ${the(c.name)}`};
  }

  // ---------- night's shadow, where it really is ----------
  // The sun is overhead at the subsolar point: as far north or south as the season tips the Earth,
  // and wherever it's noon. The shadow is the half of the globe facing away from it.
  const sun = new THREE.Vector3();
  const shade = new THREE.Mesh(new THREE.SphereGeometry(R*1.002, 96, 64), new THREE.ShaderMaterial({transparent: true, depthWrite: false, uniforms: {sun: {value: sun}},
    vertexShader: 'varying vec3 p; void main(){ p = normalize(position); gl_Position = projectionMatrix*modelViewMatrix*vec4(position, 1.); }',
    fragmentShader: 'uniform vec3 sun; varying vec3 p; void main(){ float d = dot(p, sun); gl_FragColor = vec4(.02, .03, .12, smoothstep(.08, -.12, d)*.5); }'}));
  shade.visible = false; sat.layer.add(shade);
  function placeSun(){
    const now = new Date(), start = Date.UTC(now.getUTCFullYear(), 0, 0), day = (now - start)/864e5;
    const lat = 23.44*Math.sin(2*Math.PI*(day - 81)/365), lon = -15*(now.getUTCHours() + now.getUTCMinutes()/60 - 12);
    sun.copy(surface(lat, lon));
  }

  // ---------- the moving wind ----------
  // Streaks of air drawn on a see-through skin just above the globe, each fading as it goes, so the
  // wind's flow shows the way smoke does.
  const wc = document.createElement('canvas'); wc.width = 2048; wc.height = 1024;
  const wg = wc.getContext('2d'), wtex = new THREE.CanvasTexture(wc);
  const wind = new THREE.Mesh(new THREE.SphereGeometry(R*1.003, 96, 64), new THREE.MeshBasicMaterial({map: wtex, transparent: true, depthWrite: false}));
  wind.visible = false; sat.layer.add(wind);
  const puffs = Array.from({length: 4000}, () => ({}));
  const respawn = p => { p.lat = Math.asin(Math.random()*2 - 1)/RAD*.95; p.lon = Math.random()*360 - 180; p.age = Math.random()*80; };
  puffs.forEach(respawn);
  const xy = (lat, lon) => [(lon + 180)/360*wc.width, (90 - lat)/180*wc.height];
  function blow(dt){
    wg.globalCompositeOperation = 'destination-out'; wg.fillStyle = `rgba(0,0,0,${Math.min(1, dt*1.4)})`; wg.fillRect(0, 0, wc.width, wc.height);
    wg.globalCompositeOperation = 'source-over'; wg.lineWidth = 2; wg.lineCap = 'round';
    for (const p of puffs) {
      const v = grid.at(p.lat, p.lon), k = dt*.5, [x0, y0] = xy(p.lat, p.lon);
      p.lat += v.north*k; p.lon += v.east*k/Math.max(.2, Math.cos(p.lat*RAD));
      if (p.lon > 180) p.lon -= 360; if (p.lon < -180) p.lon += 360;
      const [x1, y1] = xy(p.lat, p.lon), speed = Math.hypot(v.east, v.north);
      if (Math.abs(x1 - x0) < wc.width/4) { wg.strokeStyle = speed > 40 ? '#ffd36b' : speed > 20 ? '#ffffff' : 'rgba(190,225,255,.85)'; wg.beginPath(); wg.moveTo(x0, y0); wg.lineTo(x1, y1); wg.stroke(); }
      if (++p.age > 100 || Math.abs(p.lat) > 85) respawn(p);
    }
    wtex.needsUpdate = true;
  }

  function lensChanged(l){
    wind.visible = false;
    legend.hidden = !l.legend;
    if (l.legend) legend.innerHTML = `<i style="background:linear-gradient(90deg,${l.legend.stops.map(s => css3(s[1])).join(',')})"></i><span>${l.legend.words.map(w => `<b>${esc(w)}</b>`).join('')}</span>`;
    if (l.data) l.data().then(gr => { grid = gr; if (sat.lens() === l && l.id === 'wind' && api.on) { wg.clearRect(0, 0, wc.width, wc.height); wind.visible = true; } }, () => {});
  }

  // ---------- the card ----------
  function draw(){
    if (C.kind === 'spot') return drawSpot();
    if (C.kind === 'mission') return drawMission();
    card.innerHTML = `<div class="ghint">Drag to spin. Pinch, scroll or press + to lean in close.<br>Tap anywhere to see its weather right now!<br><br>Try the maps at the bottom: the temperature, rain and wind, all round the world, right now.<br><br>Or take one of Hoot's weather missions.</div>`;
  }

  // ---------- the weather somewhere, right now: guess first ----------
  function visit(lat, lon, w){
    room.dropPin(lat, lon); room.tune([660, 990], {gap: .07, dur: .12, vol: .05});
    const c = C = {kind: 'spot', lat, lon, name: placeName(lat, lon), w: w || null, guess: w ? -1 : null, failed: false};
    if (!w) weatherAt(lat, lon).then(x => { c.w = x; if (C === c) draw(); }, () => { c.failed = true; if (C === c) draw(); });
    draw();
  }
  function drawSpot(){
    const {w, name: {title}} = C;
    room.setColor('#2a6f9e');
    if (C.failed) { card.innerHTML = `${head('🌦️', 'The weather right now', title)}${sat.offline}`; return; }
    if (C.guess == null) {
      card.innerHTML = `${head('🦉', 'Guess first!', title)}<p class="gask">What do you think it feels like there, right now?</p>
        <div class="wfeels">${FEELS.map((f, i) => `<button data-f="${i}"><span aria-hidden="true">${f.icon}</span>${f.name}</button>`).join('')}</div>
        <div class="gbtns">${room.btn('gSkip', 'Just tell me', 'gb ghost')}</div>`;
      card.querySelectorAll('[data-f]').forEach(b => b.addEventListener('click', () => { C.guess = +b.dataset.f; Sound.tone(880, {type: 'triangle', dur: .06, vol: .05}); reveal(); }));
      room.on('gSkip', () => { C.guess = -1; reveal(); });
      return;
    }
    if (!w) { card.innerHTML = `${head('🌦️', 'The weather right now', title)}<div class="ghint">Asking the weather stations…</div>`; return; }
    const s = sky(w), f = feel(w.temperature), local = w.time ? w.time.slice(11, 16) : '';
    const verdict = C.guess >= 0 ? (FEELS[C.guess] === f ? `<p class="gwarm hot">✓ You guessed it: ${f.name.toLowerCase()}!</p>` : `<p class="gwarm">✗ You guessed ${FEELS[C.guess].name.toLowerCase()}. It's ${f.name.toLowerCase()}!</p>`) : '';
    card.innerHTML = `${head(s.icon, `The weather right now · ${local} local time`, title)}${C.won || ''}${verdict}
      <div class="wbig"><b aria-hidden="true">${s.icon}</b><div><strong>${Math.round(w.temperature)} °C</strong><br>${esc(s.words)}${w.day ? '' : ', at night'}</div></div>
      <dl class="gfacts">
        <dt aria-hidden="true">🌡️</dt><dd><b>Feels like:</b> ${Math.round(w.feelsLike)} °C${w.high != null ? `<small>Today: up to ${Math.round(w.high)} °C, down to ${Math.round(w.low)} °C</small>` : ''}</dd>
        <dt aria-hidden="true">🌬️</dt><dd><b>Wind:</b> ${Math.round(w.wind)} km/h from the ${compass(w.from)}<small>${esc(breeze(w.wind))}</small></dd>
        <dt aria-hidden="true">☁️</dt><dd><b>Clouds:</b> ${Math.round(w.clouds)}% of the sky</dd>
        ${w.rain > 0 || isSnowing(w) ? `<dt aria-hidden="true">${isSnowing(w) ? '❄️' : '💧'}</dt><dd><b>${isSnowing(w) ? 'Snow' : 'Rain'}:</b> ${isSnowing(w) && w.snow ? `${w.snow} cm` : `${w.rain} mm`} in the last hour</dd>` : ''}
        ${w.elevation > 200 ? `<dt aria-hidden="true">⛰️</dt><dd><b>Height:</b> ${Math.round(w.elevation).toLocaleString()} m above the sea</dd>` : ''}
      </dl>
      <div class="gsec">Why is it like this?</div>${why(w, C.lat, +w.time.slice(5, 7) - 1).slice(0, 3).map(t => `<p>${esc(t)}</p>`).join('')}`;
  }
  function reveal(){
    const c = C; draw();
    const said = () => {
      if (C !== c || !c.w) return;
      const f = feel(c.w.temperature), right = c.guess >= 0 && FEELS[c.guess] === f;
      if (c.guess >= 0) room.tune(right ? [659, 784, 1046] : [392, 330], {vol: .06});
      room.story([H(`${right ? 'You got it! ' : ''}It's ${Math.round(c.w.temperature)} degrees there right now: ${f.name.toLowerCase()}. ${sky(c.w).words}${c.w.day ? '' : ', and it is night'}.`), H(why(c.w, c.lat, +c.w.time.slice(5, 7) - 1)[0])]);
    };
    if (c.w) said(); else weatherAt(c.lat, c.lon).then(x => { c.w = x; if (C === c) { draw(); said(); } }, () => {});
  }

  // ---------- Hoot's missions: find this weather, right now ----------
  function mission(m){
    C = {kind: 'mission', m, misses: 0, said: ''}; sat.hideRing(); room.hidePin(); chips(); draw();
    room.tune([392, 523, 659], {gap: .1});
    room.story([H(m.ask), H(m.think), H('Spin the globe, then tap where you think it is!')]);
  }
  function drawMission(){
    const {m} = C;
    room.setColor('#6d3b5e');
    card.innerHTML = `${head('🦉', "Hoot's weather mission", `${m.icon} ${m.name}`)}<p class="gask">${esc(m.ask)}</p>
      ${C.said ? `<p class="gwarm">${esc(C.said)}</p>` : ''}${C.misses >= 2 ? `<p class="gtry">${esc(m.hint)}</p>` : ''}
      ${C.checking ? '<div class="ghint">Checking the weather there…</div>' : ''}
      <div class="gbtns">${room.btn('gStop', 'Stop the mission', 'gb ghost')}</div>`;
    room.on('gStop', () => { C = {kind: 'idle'}; sat.hideRing(); chips(); draw(); });
  }
  async function check(lat, lon){
    const c = C, {m} = c; if (c.checking) return;
    c.checking = true; room.dropPin(lat, lon); room.endTalk(); draw();
    let w;
    try { w = await weatherAt(lat, lon); } catch (e) { c.checking = false; c.said = 'The weather stations aren\'t answering. Try again in a moment!'; if (C === c) draw(); return; }
    c.checking = false; if (C !== c) return;
    const {where} = placeName(lat, lon), now = `${Math.round(w.temperature)} °C, ${sky(w).words.toLowerCase()}${w.day ? '' : ', at night'}`;
    if (m.ok(w)) {
      store.weather.add(m.id); room.keep(); sat.hideRing();
      room.toast(`Mission done · ${store.weather.size} of ${MISSIONS.length}`, `${m.icon} ${m.name}`);
      room.tune([523, 659, 784, 1046, 1319], {gap: .09, dur: .3, vol: .07});
      visit(lat, lon, w); C.won = `<p class="gwarm hot">✓ Mission done: ${esc(m.name.toLowerCase())}!</p>`; chips(); draw();
      room.story([H(`You did it! Right now it's ${now}, ${where}.`), H(m.learn)]);
      return;
    }
    c.misses++;
    c.said = `${m.close && m.close(w) ? 'So close! ' : 'Not here. '}Right now it's ${now}, ${where}.`;
    const lines = [H(c.said)];
    if (c.misses === 2) { lines.push(H(m.hint)); if (m.lens && sat.lens().id !== m.lens) sat.setLens(m.lens); }
    if (c.misses >= 4) {
      const gr = await weatherGrid().catch(() => null), spot = gr && gr.spots.filter(m.ok).sort((a, b) => Math.hypot(a.lat - lat, a.lon - lon) - Math.hypot(b.lat - lat, b.lon - lon))[0];
      if (spot && C === c) { sat.ring([spot.lat, spot.lon], 700); room.flyTo(spot.lat, spot.lon); lines.push(H("I've circled a place for you. Tap inside the gold circle!")); }
    }
    room.tune([330, 262], {gap: .1, dur: .16, vol: .05});
    draw(); room.story(lines);
  }

  function chips(){
    const [b] = sat.shelf.children;
    b.innerHTML = `🎯<span> Missions</span> ${store.weather.size}/${MISSIONS.length}`; b.setAttribute('aria-label', `Weather missions: ${store.weather.size} of ${MISSIONS.length} done`); b.setAttribute('aria-pressed', 'true');
    room.chips(MISSIONS.map(m => ({icon: m.icon, text: m.name, found: store.weather.has(m.id), hunting: C.kind === 'mission' && C.m === m,
      label: `Mission: find somewhere ${m.name.toLowerCase()} right now`, go: () => mission(m)})));
  }

  // ---------- coming and going ----------
  function enter(){
    C = {kind: 'idle'}; sat.shelf.innerHTML = '<button></button>'; chips();
    placeSun(); shade.visible = true;
    if (!store.met.has('weather')) { store.met.add('weather'); room.keep();
      room.story([H('This is my weather globe! It shows the sky over the real Earth today.'),
        H('The dark side of the globe is where it is night right now. The Earth spins, so night sweeps round the world.'),
        H('Tap anywhere and guess what the weather is like there. Then I\'ll show you the real weather, right now!')]); }
  }
  function leave(){ C = {kind: 'idle'}; shade.visible = wind.visible = false; legend.hidden = true; }
  let sunClock = 0;
  function frame(dt){
    if ((sunClock += dt) > 20) { sunClock = 0; placeSun(); }
    if (wind.visible && grid) blow(Math.min(dt, .05));
  }

  function tap(it){ if (C.kind === 'mission') check(it.lat, it.lon); else visit(it.lat, it.lon); return true; }
  function press(lat, lon){ if (C.kind === 'mission') check(lat, lon); else visit(lat, lon); }
  function back(){
    if (C.kind !== 'idle') { C = {kind: 'idle'}; sat.hideRing(); room.hidePin(); chips(); draw(); return true; }
    return false;
  }

  const api = {id: 'weather', on: false, shelfLabel: 'Weather missions', lenses: WEATHER_LENSES, lines: {borders: true}, credits: [CREDIT],
    loaded, names: () => labels, nameKey: () => '', draw, chips, enter, leave, tap, press, back, frame, lensChanged};
  return api;
}
