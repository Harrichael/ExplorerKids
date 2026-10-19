// The weather globe: the sky over the real Earth, today. Its lenses are yesterday's real clouds as
// a satellite saw them, and maps of the temperature, rain and snow, and wind right now, painted from
// live weather reports all round the world; the wind's map moves. Night's shadow lies where it really
// is. Tap anywhere and Hoot asks what it feels like there right now before he shows the real
// weather, and why it's like that, and then to look up and guess the kind of cloud overhead. Or take
// one of Hoot's missions: find somewhere it's snowing, say, right now, checked against the real
// weather where the explorer taps. Or one of his sky lessons (sky-lessons.js), or go cloud spotting:
// find all five kinds of cloud somewhere on the real Earth.
//
// real-earth.js owns the pictures, the names and the card's photos; `sat` is what it lends.

import * as THREE from 'three';
import { Sound } from '../core/sound.js';
import { CLOUDS, CREDIT, FEELS, MISSIONS, breeze, cloudKind, compass, feel, isRaining, isSnowing, sky, weatherAt, weatherGrid, why } from '../earth/weather.js';
import { LENSES } from './imagery.js';
import { article } from './photos.js';
import { makeLessons } from './sky-lessons.js';

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
.wclouds{display:grid;grid-template-columns:repeat(3,1fr);gap:6px}
.wclouds button,.wclouds div{position:relative;padding:0;border:2.5px solid var(--ink);border-radius:12px;overflow:hidden;background:#9fc3e0;aspect-ratio:4/3;color:#fff}
.wclouds img{display:block;width:100%;height:100%;object-fit:cover}
.wclouds b{position:absolute;left:0;right:0;bottom:0;font-size:11px;font-weight:900;line-height:1.15;background:linear-gradient(transparent,rgba(16,12,22,.85));padding:10px 4px 3px;text-align:left}
.wclouds .none{display:grid;place-items:center;font-size:30px;background:linear-gradient(#6fb7f0,#cfe9ff)}
.wclouds .right{box-shadow:0 0 0 3px #3e9b54}.wclouds .wrong{box-shadow:0 0 0 3px #c4473a}.wclouds .dim{opacity:.5}
.wclouds .locked img{filter:grayscale(1) brightness(.75)}.wclouds .got::after{content:"✓";position:absolute;top:3px;right:6px;font-weight:900;font-size:16px;color:#ffd36b;text-shadow:0 1px 2px #000}
.wtower{display:flex;flex-direction:column;border:2.5px solid var(--ink);border-radius:12px;overflow:hidden;background:linear-gradient(#2d5f9a,#7fb6e8 70%,#bfe0f7)}
.wtower .band{position:relative;display:flex;align-items:center;gap:6px;height:46px;padding:0 8px;border-bottom:1.5px dashed rgba(255,255,255,.45);color:#fff;font-weight:900;font-size:11px;text-shadow:0 1px 2px rgba(0,0,0,.6)}
.wtower .band.on{box-shadow:inset 0 0 0 3px #ffd36b}
.wtower .band small{width:74px;flex:none;line-height:1.2}
.wtower .band span{flex:1;font-size:20px;letter-spacing:-6px;white-space:nowrap;overflow:hidden;opacity:.95}
.wtower .band em{font-style:normal;width:36px;text-align:right}
.wtower .ground{height:18px;background:#5d8f3e;font-size:13px;line-height:18px;padding:0 8px}
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
  {...live, data: () => weatherGrid('jet'), id: 'jet', name: 'Wind up high', tip: 'The wind 10 kilometres up, where jet planes fly. The gold streaks are the jet stream, the fastest winds on Earth.',
    over: (g, x, y, w, h) => dim(g, x, y, w, h, .55)},
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
    // the jet stream blows five times as hard, so its streaks are slowed to keep them on screen
    const up = high, k = dt*(up ? .18 : .5), [fast, brisk] = up ? [150, 80] : [40, 20];
    for (const p of puffs) {
      const v = grid.at(p.lat, p.lon), e = up ? v.jetEast : v.east, n = up ? v.jetNorth : v.north, [x0, y0] = xy(p.lat, p.lon);
      p.lat += n*k; p.lon += e*k/Math.max(.2, Math.cos(p.lat*RAD));
      if (p.lon > 180) p.lon -= 360; if (p.lon < -180) p.lon += 360;
      const [x1, y1] = xy(p.lat, p.lon), speed = Math.hypot(e, n);
      if (Math.abs(x1 - x0) < wc.width/4) { wg.strokeStyle = speed > fast ? '#ffd36b' : speed > brisk ? '#ffffff' : 'rgba(190,225,255,.85)'; wg.beginPath(); wg.moveTo(x0, y0); wg.lineTo(x1, y1); wg.stroke(); }
      if (++p.age > 100 || Math.abs(p.lat) > 85) respawn(p);
    }
    wtex.needsUpdate = true;
  }

  let high = false;
  function lensChanged(l){
    wind.visible = false; high = l.id === 'jet';
    legend.hidden = !l.legend;
    if (l.legend) legend.innerHTML = `<i style="background:linear-gradient(90deg,${l.legend.stops.map(s => css3(s[1])).join(',')})"></i><span>${l.legend.words.map(w => `<b>${esc(w)}</b>`).join('')}</span>`;
    if (l.data) l.data().then(gr => { grid = gr; if (sat.lens() === l && (l.id === 'wind' || l.id === 'jet') && api.on) { wg.clearRect(0, 0, wc.width, wc.height); wind.visible = true; } }, () => {});
  }

  // ---------- the card ----------
  function draw(){
    if (C.kind === 'spot') return drawSpot();
    if (C.kind === 'mission') return drawMission();
    if (C.kind === 'lesson') return lessons.draw(C);
    if (C.kind === 'spotter') return drawSpotter();
    if (C.kind === 'look') return drawLook();
    card.innerHTML = `<div class="ghint">Drag to spin. Pinch, scroll or press + to lean in close.<br>Tap anywhere to see its weather right now!<br><br>Try the maps at the bottom: the temperature, rain and wind, all round the world, right now.<br><br>Or try Hoot's sky lessons, go cloud spotting, or take one of his weather missions.</div>`;
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
      <div class="gsec">Why is it like this?</div>${why(w, C.lat, +w.time.slice(5, 7) - 1).slice(0, 3).map(t => `<p>${esc(t)}</p>`).join('')}
      <div class="gbtns">${room.btn('gLook', '☁️ Look up: which clouds?')}</div>`;
    room.on('gLook', () => look(C.lat, C.lon, C.w));
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

  let shelf = 'lessons';
  function chips(){
    const [l, b] = sat.shelf.children;
    l.innerHTML = `🎓<span> Sky lessons</span> ${store.lessons.size + store.clouds.size}`; l.setAttribute('aria-label', 'Sky lessons and cloud spotting'); l.setAttribute('aria-pressed', shelf === 'lessons');
    b.innerHTML = `🎯<span> Missions</span> ${store.weather.size}/${MISSIONS.length}`; b.setAttribute('aria-label', `Weather missions: ${store.weather.size} of ${MISSIONS.length} done`); b.setAttribute('aria-pressed', shelf === 'missions');
    if (shelf === 'lessons') return room.chips([
      ...lessons.LESSONS.map(L => ({icon: L.icon, text: L.name, found: store.lessons.has(L.id), hunting: C.kind === 'lesson' && C.L === L, label: `Sky lesson: ${L.name}`, go: () => lessons.start(L)})),
      {icon: '☁️', text: `Cloud spotter ${store.clouds.size}/${CLOUDS.length}`, found: store.clouds.size === CLOUDS.length, hunting: C.kind === 'spotter' || (C.kind === 'look' && C.spotting),
        label: `Cloud spotter: ${store.clouds.size} of ${CLOUDS.length} kinds of cloud found`, go: spotter}]);
    room.chips(MISSIONS.map(m => ({icon: m.icon, text: m.name, found: store.weather.has(m.id), hunting: C.kind === 'mission' && C.m === m,
      label: `Mission: find somewhere ${m.name.toLowerCase()} right now`, go: () => mission(m)})));
  }

  // ---------- cloud spotting: look up anywhere on Earth, and guess the cloud first ----------
  // the clouds' photos, from their articles, filled in as they arrive
  const cloudPhoto = c => article(c.wiki).then(a => a && a.photo && a.photo.src, () => null);
  function fillPhotos(){
    card.querySelectorAll('[data-cloud]').forEach(el => cloudPhoto(CLOUDS.find(c => c.id === el.dataset.cloud)).then(src => { if (src && el.isConnected) el.insertAdjacentHTML('afterbegin', `<img alt="" src="${esc(src)}">`); }));
  }
  function spotter(){
    C = {kind: 'spotter'}; sat.hideRing(); room.hidePin(); if (sat.lens().id !== 'clouds') sat.setLens('clouds'); chips(); draw();
    room.tune([392, 523, 659], {gap: .1});
    const missing = CLOUDS.filter(c => !store.clouds.has(c.id));
    room.story(missing.length ? [H("Let's go cloud spotting! There are five kinds of cloud to find, and every one of them is somewhere on Earth right now."),
      H("Tap anywhere on the globe and we'll look up at its sky. Guess the cloud first, then we'll see!")] : [H("You've spotted all five kinds of cloud! Keep looking: the sky is different every hour.")]);
  }
  function drawSpotter(){
    room.setColor('#2a6f9e');
    const missing = CLOUDS.filter(c => !store.clouds.has(c.id));
    card.innerHTML = `${head('☁️', 'Cloud spotter', `${store.clouds.size} of ${CLOUDS.length} kinds found`)}
      <div class="wclouds">${CLOUDS.map(c => `<div data-cloud="${c.id}" class="${store.clouds.has(c.id) ? 'got' : 'locked'}"><b>${c.icon} ${esc(c.name)}</b></div>`).join('')}</div>
      <p class="gask">Tap anywhere on the globe to look up at its sky right now.</p>
      ${missing.length ? `<p class="gtry">Hoot's tip for ${esc(missing[0].name.toLowerCase())}: ${esc(missing[0].where)}</p>` : ''}
      <div class="gbtns">${room.btn('gStop', 'Stop spotting', 'gb ghost')}</div>`;
    fillPhotos(); room.on('gStop', () => { C = {kind: 'idle'}; chips(); draw(); });
  }
  function look(lat, lon, w){
    const c = C = {kind: 'look', lat, lon, place: placeName(lat, lon), w: w || null, guess: null, spotting: C.kind === 'spotter' || (C.kind === 'look' && C.spotting)};
    room.dropPin(lat, lon); room.tune([660, 990], {gap: .07, dur: .12, vol: .05});
    if (!w) weatherAt(lat, lon).then(x => { c.w = x; if (C === c) draw(); }, () => { c.failed = true; if (C === c) draw(); });
    chips(); draw();
  }
  function drawLook(){
    const {w, place} = C;
    room.setColor('#2a6f9e');
    const title = `Look up over ${the(place.title)}!`;
    if (C.failed) { card.innerHTML = `${head('☁️', 'Cloud spotter', title)}${sat.offline}`; return; }
    if (C.guess == null) {
      card.innerHTML = `${head('🦉', 'Guess first!', title)}<p class="gask">Which kind of cloud do you think is up there, right now?</p>
        <div class="wclouds">${CLOUDS.map((c, i) => `<button data-g="${i}" data-cloud="${c.id}" aria-label="${esc(c.name)}"><b>${c.icon} ${esc(c.name)}</b></button>`).join('')}
          <button data-g="-1" class="none" aria-label="No clouds at all">☀️<b>No clouds</b></button></div>`;
      fillPhotos();
      card.querySelectorAll('[data-g]').forEach(b => b.addEventListener('click', () => { C.guess = +b.dataset.g; Sound.tone(880, {type: 'triangle', dur: .06, vol: .05}); draw(); revealCloud(); }));
      return;
    }
    if (!w) { card.innerHTML = `${head('☁️', 'Cloud spotter', title)}<div class="ghint">Looking up…</div>`; return; }
    const kind = cloudKind(w), right = kind ? CLOUDS[C.guess] === kind : C.guess === -1;
    const L = w.layers, band = (id, name, km, v) => `<div class="band${kind && (kind.level === id || kind.level === 'all') ? ' on' : ''}"><small>${name}<br>${km}</small><span aria-hidden="true">${'☁️'.repeat(Math.round((v || 0)/20))}</span><em>${Math.round(v || 0)}%</em></div>`;
    card.innerHTML = `${head(kind ? kind.icon : '☀️', `The sky over ${the(place.title)}, right now`, kind ? kind.name : 'A clear sky')}
      <p class="gwarm ${right ? 'hot' : ''}">${right ? '✓ You guessed it!' : `✗ You guessed ${C.guess >= 0 ? CLOUDS[C.guess].name.toLowerCase() : 'no clouds'}.`}</p>
      <div class="wtower" role="img" aria-label="How much of the sky each layer of cloud covers: high ${Math.round(L.high)}%, middle ${Math.round(L.mid)}%, low ${Math.round(L.low)}%">
        ${band('high', 'High', '6–12 km', L.high)}${band('mid', 'Middle', '2–6 km', L.mid)}${band('low', 'Low', '0–2 km', L.low)}<div class="ground" aria-hidden="true">🏠 🌳 🧍</div></div>
      ${kind ? `<div class="wclouds" style="grid-template-columns:1fr"><div data-cloud="${kind.id}" style="aspect-ratio:16/9"><b>${kind.icon} ${esc(kind.name)}: ${esc(kind.looks)}</b></div></div><p>${esc(kind.about)}</p>`
        : '<p>Not a cloud in the sky: the air here is too dry to make them.</p>'}
      <div class="gcap">Which cloud: worked out from how much of the sky each layer covers, the way forecasters do. Weather: Open-Meteo.</div>
      <div class="gbtns">${C.spotting ? room.btn('gMore', 'Look somewhere else') : room.btn('gSpot', '☁️ Go cloud spotting')}</div>`;
    fillPhotos();
    room.on('gMore', () => { C = {kind: 'spotter'}; chips(); draw(); }); room.on('gSpot', spotter);
  }
  function revealCloud(){
    const c = C;
    const said = () => {
      if (C !== c || !c.w) return;
      const kind = cloudKind(c.w), right = kind ? CLOUDS[c.guess] === kind : c.guess === -1;
      room.tune(right ? [659, 784, 1046] : [392, 330], {vol: .06});
      const lines = [H(`${right ? 'You got it! ' : ''}${kind ? `Up there right now: ${kind.name.toLowerCase()} clouds. ${kind.looks}` : 'Not a cloud in the sky up there!'}`)];
      if (kind && !store.clouds.has(kind.id)) {
        store.clouds.add(kind.id); room.keep(); chips();
        room.toast(`New cloud spotted · ${store.clouds.size} of ${CLOUDS.length}`, `${kind.icon} ${kind.name}`);
        if (store.clouds.size === CLOUDS.length) lines.push(H("That's all five kinds of cloud! You're a real cloud spotter."));
      }
      room.story(lines);
    };
    if (c.w) said(); else weatherAt(c.lat, c.lon).then(x => { c.w = x; if (C === c) { draw(); said(); } }, () => {});
  }

  // ---------- coming and going ----------
  function enter(){
    C = {kind: 'idle'}; sat.shelf.innerHTML = '<button data-s="lessons"></button><button data-s="missions"></button>';
    sat.shelf.querySelectorAll('button').forEach(b => b.addEventListener('click', () => { if (shelf === b.dataset.s) return; shelf = b.dataset.s; Sound.tone(880, {type: 'triangle', dur: .08, vol: .05}); chips(); }));
    chips();
    placeSun(); shade.visible = true;
    if (!store.met.has('weather')) { store.met.add('weather'); room.keep();
      room.story([H('This is my weather globe! It shows the sky over the real Earth today.'),
        H('The dark side of the globe is where it is night right now. The Earth spins, so night sweeps round the world.'),
        H('Tap anywhere and guess what the weather is like there. Then I\'ll show you the real weather, right now!')]); }
  }
  function leave(){ C = {kind: 'idle'}; shade.visible = wind.visible = false; legend.hidden = true; lessons.stop(); }
  let sunClock = 0, lessonOn = false;
  function frame(dt){
    if ((sunClock += dt) > 20) { sunClock = 0; placeSun(); }
    if (wind.visible && grid) blow(Math.min(dt, .05));
    // a lesson's drop and planes stay on the globe only while the lesson's on the card
    if (C.kind === 'lesson') { lessonOn = true; lessons.frame(dt); } else if (lessonOn) { lessonOn = false; lessons.stop(); }
  }

  function press(lat, lon){
    if (C.kind === 'mission') check(lat, lon);
    else if (C.kind === 'lesson') lessons.tapped(C, lat, lon);
    else if (C.kind === 'spotter' || (C.kind === 'look' && C.spotting)) look(lat, lon);
    else visit(lat, lon);
  }
  const tap = it => { press(it.lat, it.lon); return true; };
  function back(){
    if (C.kind === 'look' && C.spotting) { C = {kind: 'spotter'}; room.hidePin(); chips(); draw(); return true; }
    if (C.kind !== 'idle') { show({kind: 'idle'}); room.hidePin(); return true; }
    return false;
  }

  function show(c){ C = c; sat.hideRing(); chips(); draw(); }
  const lessons = makeLessons(sat, {now: () => C, show, redraw: () => draw()});

  const api = {id: 'weather', on: false, shelfLabel: 'Weather missions', lenses: WEATHER_LENSES, lines: {borders: true}, credits: [CREDIT],
    loaded, names: () => labels, nameKey: () => '', draw, chips, enter, leave, tap, press, back, frame, lensChanged};
  return api;
}
