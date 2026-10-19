// Hoot's sky lessons on the weather globe, where the globe itself does the showing. Each lesson is a
// handful of steps, and every step asks the explorer to predict before anything happens; then the
// globe shows it, and Hoot says what it was they just saw.
//
// The journey of a raindrop: one drop of the Bay of Bengal rises as vapour, turns to cloud, rides the
// monsoon to the hills of Cherrapunji, rains, and runs down the river home. The winds of the world:
// read the real trade winds off the moving streaks, guess which way the wind blows up high before the
// jet stream appears, race two planes through today's real jet stream, then hunt for its fastest spot.
//
// The card's state is the weather globe's (`ui.now()` and `ui.show()`); the drop, the cloud, the rain
// and the planes are this file's, laid on the globe.

import * as THREE from 'three';
import { Sound } from '../core/sound.js';
import { RACES, RAINDROP, fastestJet, flightHours, route, weatherAt, weatherGrid, westerly, sky as skyOf } from '../earth/weather.js';

const css = document.createElement('style');
css.textContent = `
#gCard .wstep{font-size:12px;font-weight:900;letter-spacing:1px;text-transform:uppercase;color:#6d3b5e}
#gCard .wcycle{display:block;width:100%;max-width:230px;margin:0 auto}
#gCard .wstages{display:none;flex-wrap:wrap;gap:2px 4px;font-weight:900;font-size:12px;color:#8a7a8e}
#gCard .wstages b{color:#1a1320;background:#ffd36b;border-radius:6px;padding:0 4px}#gCard .wstages i{font-style:normal;color:#2a6f9e}
@media (max-aspect-ratio:1/1){#gCard .wcycle{display:none}#gCard .wstages{display:flex}}
#gCard .wcycle .node circle{fill:#fbf4e2;stroke:#1a1320;stroke-width:2.5}
#gCard .wcycle .node.done circle{fill:#bfe3ff}
#gCard .wcycle .node.now circle{fill:#ffd36b;stroke-width:3.5}
#gCard .wcycle .node.now{animation:wpulse 1.2s ease-in-out infinite;transform-box:fill-box;transform-origin:center}
#gCard .wcycle text{font-family:Nunito,system-ui,sans-serif;font-weight:900;font-size:11px;fill:#1a1320;text-anchor:middle}
#gCard .wcycle .arc{fill:none;stroke:#8fb7d9;stroke-width:3;stroke-dasharray:5 5}
#gCard .wcycle .arc.done{stroke:#2a6f9e;stroke-dasharray:none}
#gCard .wcycle.whole .arc{stroke:#2a6f9e;stroke-dasharray:8 6;animation:wflow 1s linear infinite}
@keyframes wpulse{50%{transform:scale(1.08)}}
@keyframes wflow{to{stroke-dashoffset:-14}}
#gCard .wdots{display:flex;gap:6px}#gCard .wdots i{width:22px;height:8px;border-radius:4px;background:#d8c8a4;border:2px solid #1a1320}#gCard .wdots i.done{background:#2a6f9e}#gCard .wdots i.now{background:#ffd36b}
#gCard .wrace{display:grid;grid-template-columns:auto 1fr auto;gap:4px 8px;align-items:center;font-weight:900;font-size:14px}
#gCard .wrace i{display:block;height:12px;border-radius:6px;border:2px solid #1a1320;background:var(--c);width:var(--w)}
@media (prefers-reduced-motion:reduce){#gCard .wcycle .node.now,#gCard .wcycle.whole .arc{animation:none}}`;
document.head.appendChild(css);

const RAD = Math.PI/180;
const ARROWS = [{icon: '⬅️', text: 'From east to west'}, {icon: '➡️', text: 'From west to east'}, {icon: '↕️', text: 'Towards the poles'}];
const hm = h => `${Math.floor(h)} h ${String(Math.round(h % 1*60)).padStart(2, '0')} min`;

export function makeLessons(sat, ui){
  const {room, card, store, esc, head, surface, R} = sat, H = room.H;

  // ---------- the props on the globe ----------
  const props = new THREE.Group(); sat.layer.add(props);
  const mat = (color, opacity = 1) => new THREE.MeshBasicMaterial({color, transparent: true, opacity, depthWrite: false});
  const drop = new THREE.Mesh(new THREE.SphereGeometry(.013, 18, 14), mat(0x5ec8ff));
  const puff = new THREE.Group();
  for (const [x, y, r] of [[0, 0, .028], [.025, -.007, .021], [-.025, -.007, .021], [.012, .014, .019], [-.012, .016, .018], [.04, -.011, .014]]) {
    const m = new THREE.Mesh(new THREE.SphereGeometry(r, 14, 10), mat(0xffffff, .95)); m.position.set(x, y, 0); puff.add(m);
  }
  const wisps = Array.from({length: 7}, () => new THREE.Mesh(new THREE.SphereGeometry(.007, 10, 8), mat(0xdff4ff, .7)));
  const RAIN = 70, rainPos = new Float32Array(RAIN*6);
  const rain = new THREE.LineSegments(new THREE.BufferGeometry().setAttribute('position', new THREE.BufferAttribute(rainPos, 3)), new THREE.LineBasicMaterial({color: 0xd4eeff}));
  const plane = color => { const g = new THREE.Group();
    const body = new THREE.Mesh(new THREE.ConeGeometry(.007, .028, 10), mat(color)); body.rotation.x = Math.PI/2; g.add(body);
    const wing = new THREE.Mesh(new THREE.BoxGeometry(.03, .0025, .008), mat(color)); g.add(wing); return g; };
  const planes = [plane(0xffd36b), plane(0xff8a6b)];
  let trails = [];
  props.add(drop, puff, rain, ...wisps, ...planes);
  function hideProps(){
    for (const o of props.children) o.visible = false;
    puff.children.forEach(m => { m.material.opacity = .95; m.material.color.setScalar(1); m.scale.setScalar(1); }); raining = null; for (const t of trails) { props.remove(t); t.geometry.dispose(); } trails = []; tweens = []; }
  // a spot above the globe: `up` is height, much exaggerated, as a share of the globe's radius
  const spot = (lat, lon, up = 0) => surface(lat, lon).multiplyScalar(R*(1.002 + up));
  // stands an object up off the surface, facing along `toward` if given
  function place(o, lat, lon, up, toward){
    o.position.copy(spot(lat, lon, up));
    const n = surface(lat, lon);
    // lookAt works in the room's frame, which the spinning globe isn't
    if (toward) { o.up.copy(n).transformDirection(props.matrixWorld); o.lookAt(spot(...toward, up).applyMatrix4(props.matrixWorld)); }
    else o.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), n);
  }
  function trail(path, color, up = .001){
    const t = new THREE.Line(new THREE.BufferGeometry().setFromPoints(path.map(p => spot(...p, up))), new THREE.LineBasicMaterial({color, transparent: true, opacity: .9}));
    props.add(t); trails.push(t); return t;
  }
  // along a path of [lat, lon], t from 0 to 1, by distance along it
  function along(path, t){
    const legs = path.slice(1).map((p, i) => Math.hypot(p[0] - path[i][0], ((p[1] - path[i][1] + 540) % 360 - 180)*Math.cos(p[0]*RAD))), total = legs.reduce((a, b) => a + b, 0);
    let d = t*total;
    for (let i = 0; i < legs.length; i++) {
      if (d <= legs[i] || i === legs.length - 1) { const f = legs[i] ? Math.min(1, d/legs[i]) : 0, a = path[i], b = path[i + 1];
        return [a[0] + (b[0] - a[0])*f, a[1] + (((b[1] - a[1] + 540) % 360) - 180)*f, b]; }
      d -= legs[i];
    }
    return [...path[path.length - 1], path[path.length - 1]];
  }

  // ---------- moving things ----------
  // These play even when the explorer asks for less motion: they are small and slow, and they are
  // the lesson itself. Only the card's decoration stops moving.
  let tweens = [];
  const animate = (dur, f) => new Promise(done => tweens.push({t: 0, dur, f, done}));
  let raining = null;
  function frame(dt){
    // the props keep their size on screen as the globe leans in, like the pin
    const k = 1/room.view.mag; for (const o of props.children) if (!o.isLine) o.scale.setScalar(k);
    for (const tw of [...tweens]) { tw.t = Math.min(tw.dur, tw.t + dt); tw.f(tw.t/tw.dur); if (tw.t >= tw.dur) { tweens.splice(tweens.indexOf(tw), 1); tw.done(); } }
    if (raining && rain.visible) {
      const [lat, lon] = raining, top = .03, now = performance.now()/1000;
      for (let i = 0; i < RAIN; i++) {
        const a = i*2.4, r = (i % 7)*.14 + .08, la = lat + Math.cos(a)*r*k*4, lo = lon + Math.sin(a)*r*k*4/Math.cos(lat*RAD);
        const f = (now*1.1 + i*.37) % 1, h = top*(1 - f), p = spot(la, lo, h), q = spot(la, lo, Math.max(0, h - .012*k*2));
        rainPos.set([p.x, p.y, p.z, q.x, q.y, q.z], i*6);
      }
      rain.geometry.attributes.position.needsUpdate = true;
    }
  }

  // ---------- the lessons ----------
  // A step: what Hoot asks, the choices (or `tap` for an explore step), which is right (worked out
  // from the live weather where it can be), what the globe shows once they've guessed, and then
  // what Hoot says about what they saw.
  const WATER = {id: 'water', name: 'Journey of a raindrop', icon: '💧', stages: ['Evaporation', 'Condensation', 'Precipitation', 'Collection'],
    async start(){
      hideProps(); sat.setLens('temp'); room.flyTo(...RAINDROP.sea.at, 2.4);
      drop.visible = true; drop.material.opacity = 1; place(drop, ...RAINDROP.sea.at, 0);
      // the sea's real warmth is a bonus for Hoot to mention, if it comes in time
      const n = {sea: null};
      weatherGrid().then(g => { n.sea = Math.round(g.at(...RAINDROP.sea.at).temperature); }, () => {});
      return n;
    },
    steps: [
      {stage: 0, ask: 'Meet a drop of sea water in the Bay of Bengal, near India. The sun is beating down. Which do you think sends more water up into the air: a warm sea, or an icy one?',
        choices: [{icon: '🌡️', text: 'A warm sea'}, {icon: '🧊', text: 'An icy sea'}, {icon: '🤝', text: 'Both the same'}], right: () => 0,
        async show(){
          wisps.forEach((w, i) => { w.visible = true; w.material.opacity = 0; });
          await animate(2.6, f => {
            wisps.forEach((w, i) => { const g = (f*1.6 + i/7) % 1, a = i*.9; place(w, RAINDROP.sea.at[0] + Math.cos(a)*.6, RAINDROP.sea.at[1] + Math.sin(a)*.6, g*.035); w.material.opacity = .8*(1 - g)*Math.min(1, f*4); });
            place(drop, ...RAINDROP.sea.at, f*.035); drop.material.opacity = 1 - f*.75;
          });
          wisps.forEach(w => { w.visible = false; });
        },
        says: (L, n) => [`${n.sea != null ? `The air over this sea is ${n.sea} °C right now: a warm sea. ` : ''}The sun's heat turned the drop into water vapour, a gas too tiny to see, and it floated up into the sky.`,
          'Warm water does this much faster than cold water. It is called evaporation. It happens to puddles too: that is where they go on a sunny day!']},
      {stage: 1, ask: 'The vapour rises higher and higher, and up there the air gets colder and colder. What do you think happens to it?',
        choices: [{icon: '☁️', text: 'It makes a cloud'}, {icon: '💨', text: 'It vanishes for good'}, {icon: '🧊', text: 'It turns into hailstones'}], right: () => 0,
        async show(){
          sat.setLens('clouds'); puff.visible = true; place(puff, ...RAINDROP.sea.at, .035);
          await animate(1.8, f => { puff.children.forEach((m, i) => { m.scale.setScalar(Math.min(1, Math.max(.01, f*1.6 - i*.1))); }); drop.material.opacity = .25*(1 - f); });
          drop.visible = false;
        },
        says: () => ['In the cold air, the vapour turned back into tiny droplets of water, far too small to fall. Billions of them, all together, make a cloud!',
          'That is called condensation. You can make it yourself: breathe on a cold window, and a little cloud appears.']},
      {stage: 1, ask: 'In summer, the monsoon wind blows from the sea towards the land. Where do you think it will carry our cloud?',
        choices: [{icon: '⛰️', text: 'North, to the hills'}, {icon: '🌊', text: 'Out to the open sea'}, {icon: '🏜️', text: 'West, to the desert'}], right: () => 0,
        async show(){
          room.flyTo(21.5, 90.5, 3);
          await animate(3.2, f => { const [lat, lon] = along(RAINDROP.sky, f); place(puff, lat, lon, .035); });
        },
        says: () => ['The wind blew the cloud north over the land, to the Khasi Hills. Winds carry clouds, and their water, all round the world.']},
      {stage: 2, ask: 'The wind pushes the cloud up the side of the hills, where the air is colder still. Its droplets crowd closer together. What do you think happens now?',
        choices: [{icon: '🌧️', text: 'It rains'}, {icon: '☁️', text: 'It just floats on by'}, {icon: '🌈', text: 'It turns into a rainbow'}], right: () => 0,
        async show(L, n){
          sat.setLens('rain'); room.flyTo(...RAINDROP.rain.at, 6);
          weatherAt(...RAINDROP.rain.at).then(w => { n.now = w; }, () => {});
          rain.visible = true; raining = RAINDROP.rain.at;
          await animate(3.4, f => { puff.children.forEach(m => m.material.color.setScalar(1 - f*.35)); });
        },
        says: (L, n) => ['The droplets bumped together and grew into raindrops, too heavy for the cloud to hold. Down they fell: rain! Rain, snow and hail are all called precipitation.',
          `This is Cherrapunji, one of the rainiest places on Earth. In a year it gets about 11 metres of rain, enough to cover a two-storey house!${n.now ? ` Right now it's ${Math.round(n.now.temperature)} °C there, ${skyOf(n.now).words.toLowerCase()}.` : ''}`]},
      {stage: 3, ask: 'The rain lands on the hills. Where do you think the water goes next?',
        choices: [{icon: '🏞️', text: 'Downhill, into rivers'}, {icon: '⛰️', text: 'It stays on the hill for ever'}, {icon: '☁️', text: 'Straight back up to the sky'}], right: () => 0,
        async show(){
          raining = null; rain.visible = false;
          await animate(1, f => puff.children.forEach(m => { m.material.opacity = .95*(1 - f); }));
          puff.visible = false; puff.children.forEach(m => { m.material.opacity = .95; m.material.color.setScalar(1); });
          drop.visible = true; drop.material.opacity = 1; room.flyTo(21, 90.3, 2.6);
          const line = trail([RAINDROP.river.path[0]], 0x5ec8ff), pts = [];
          await animate(4.5, f => {
            const [lat, lon] = along(RAINDROP.river.path, f); place(drop, lat, lon, .001); pts.push(spot(lat, lon, .001));
            line.geometry.setFromPoints(pts);
          });
        },
        says: () => ['Water always runs downhill. It trickled into streams, the streams joined into the Meghna River, and the river carried it all the way back to the Bay of Bengal, where it started!',
          'Gathering back into rivers, lakes and the sea is called collection. And then the sun warms it, and round it goes again.']},
    ],
    finish: () => [H('That was the water cycle! Evaporation, condensation, precipitation, collection, and round again.'),
      H('The Earth has had the same water for billions of years, going round and round. The water you drink today might once have rained on a dinosaur!')]};

  const WINDS = {id: 'winds', name: 'Winds of the world', icon: '🌬️',
    async start(){
      hideProps(); sat.setLens('wind'); room.flyTo(12, -40, 1.6);
      const [g, up] = await Promise.all([weatherGrid(), weatherGrid('jet')]);
      // the race today's jet stream makes the most of
      const races = RACES.map(r => ({...r, east: flightHours(up, r.a.at, r.b.at), west: flightHours(up, r.b.at, r.a.at)}));
      return {up, trades: westerly(g, -25, 25), jet: westerly(up, 30, 60, true), fastest: fastestJet(up), race: races.reduce((b, r) => r.west - r.east > b.west - b.east ? r : b)};
    },
    steps: [
      {ask: 'These streaks are the real wind, blowing over the Earth right now. Watch the ones near the equator, out over the sea. Which way are they blowing?',
        choices: ARROWS, right: (L, n) => n.trades < 0 ? 0 : 1,
        says: (L, n) => n.trades < 0 ? ['They blow from east to west! These are the trade winds. They blow almost all year round, on both sides of the equator.',
          'Long ago, sailing ships rode the trade winds across the oceans to trade with faraway lands. That is how they got their name.']
          : ['Today they blow mostly from the west, which is unusual! Most days, the winds near the equator blow from east to west: the trade winds.']},
      {ask: 'Now imagine flying up 10 kilometres, as high as jet planes fly, above North America and Europe. Which way do you think the wind blows up there?',
        choices: ARROWS, right: (L, n) => n.jet > 0 ? 1 : 0,
        async show(){ sat.setLens('jet'); room.flyTo(45, -40, 1.6); await animate(2, () => {}); },
        says: (L, n) => [`From west to east, and fast! This is the jet stream: a river of wind high in the sky, wiggling round the whole Earth.${n.fastest ? ` Right now its fastest part is blowing at ${Math.round(n.fastest.jet)} kilometres an hour, faster than a racing car!` : ''}`,
          'There is one jet stream in the north half of the Earth and one in the south. The gold streaks are the fastest.']},
      {ask: (L, n) => `Two jet planes, exactly as fast as each other, take off at the same moment: one from ${n.race.a.name} to ${n.race.b.name}, the other from ${n.race.b.name} to ${n.race.a.name}. Which do you think lands first?`,
        choices: (L, n) => [{icon: '✈️', text: `The one flying to ${n.race.b.name}`}, {icon: '✈️', text: `The one flying to ${n.race.a.name}`}, {icon: '🤝', text: 'They land together'}],
        right: (L, n) => Math.abs(n.race.west - n.race.east) < 1/12 ? 2 : n.race.east < n.race.west ? 0 : 1,
        async show(L, n){
          const {a, b, east, west} = n.race, there = route(a.at, b.at), back = route(b.at, a.at);
          room.flyTo((a.at[0] + b.at[0])/2 + 8, there[Math.floor(there.length/2)][1], 1.4);
          trail(there, 0xffd36b, .012); trail(back, 0xff8a6b, .018);
          planes.forEach(p => { p.visible = true; });
          // an hour of flying is a second of watching
          const slow = Math.max(east, west);
          await animate(slow, f => {
            const t = f*slow, p1 = along(there, Math.min(1, t/east)), p2 = along(back, Math.min(1, t/west));
            place(planes[0], p1[0], p1[1], .012, p1[2]); place(planes[1], p2[0], p2[1], .018, p2[2]);
            n.clock = t;
          });
        },
        extra: (L, n) => `<div class="wrace" style="--c:#ffd36b"><span>✈️ To ${esc(n.race.b.name)}</span><i style="--w:${Math.round(100*n.race.east/Math.max(n.race.east, n.race.west))}%;--c:#ffd36b"></i><b>${hm(n.race.east)}</b>
          <span>✈️ To ${esc(n.race.a.name)}</span><i style="--w:${Math.round(100*n.race.west/Math.max(n.race.east, n.race.west))}%;--c:#ff8a6b"></i><b>${hm(n.race.west)}</b></div>`,
        says: (L, n) => {
          const gain = Math.round(Math.abs(n.race.west - n.race.east)*60);
          return n.race.east < n.race.west ? [`The plane flying east won by ${gain} minutes! It rode the jet stream, which pushed it along. The plane flying west had to fight against it the whole way.`,
            'Real pilots plan their flights to catch the jet stream going east, and to dodge it coming back. It saves time and fuel.']
            : ['Today the jet stream is wiggling about, so it hardly helped either plane. On most days, the plane flying east wins easily!'];
        }},
      {tap: true, ask: 'Your turn to explore! The jet stream moves and changes every day. Tap where you think the wind up high is blowing fastest, right now.',
        judge(lat, lon, L, n){
          // the gold streaks are the jet stream: anywhere in them counts
          const v = n.up.at(lat, lon), speed = Math.hypot(v.jetEast, v.jetNorth), best = n.fastest.jet, ok = speed >= Math.min(150, best*.75);
          return {ok, said: ok ? `${Math.round(speed)} km/h up there! You found the jet stream. Its very fastest spot right now is blowing at ${Math.round(best)} km/h.`
            : `Up there it's ${Math.round(speed)} km/h. The jet stream is faster still: look for the gold streaks.`};
        },
        help(L, n){ sat.ring([n.fastest.lat, n.fastest.lon], 900); room.flyTo(n.fastest.lat, n.fastest.lon, 1.6); return "I've circled the fastest spot. Tap inside the gold circle!"; },
        says: () => ['The jet stream blows fastest in winter, when the cold air near the poles and the warm air near the equator are most different. That difference is what drives it.']},
    ],
    finish: () => [H('Now you know the winds of the world: the trade winds near the equator, blowing west, and the jet stream up high, blowing east.'),
      H('Together they carry heat, clouds and rain all round the Earth.')]};

  const LESSONS = [WATER, WINDS];

  // ---------- running a lesson ----------
  async function start(L){
    const c = {kind: 'lesson', L, i: 0, picked: null, shown: false, busy: true, n: {}, tries: 0, said: ''};
    ui.show(c); room.tune([392, 523, 659], {gap: .1});
    try { c.n = await L.start(); } catch (e) { c.failed = true; }
    c.busy = false; if (ui.now() === c) { ui.redraw(); room.story([H(text(c, 'ask'))]); }
  }
  const text = (c, k) => { const s = c.L.steps[c.i][k]; return typeof s === 'function' ? s(c.L, c.n) : s; };
  async function pick(c, i){
    const s = c.L.steps[c.i]; if (c.picked != null || c.busy) return;
    c.picked = i; c.busy = true; room.endTalk(); Sound.tone(880, {type: 'triangle', dur: .06, vol: .05}); ui.redraw();
    if (s.show) await s.show(c.L, c.n);
    if (ui.now() !== c) return;
    c.busy = false; c.shown = true;
    const right = i === s.right(c.L, c.n);
    room.tune(right ? [659, 784, 1046] : [523, 659], {vol: .06});
    room.story([H((right ? 'You predicted it! ' : 'Not what you guessed, but now you know! ') + s.says(c.L, c.n)[0]), ...s.says(c.L, c.n).slice(1).map(H)]);
    ui.redraw();
  }
  function next(c){
    room.endTalk();
    if (c.i + 1 < c.L.steps.length) { Object.assign(c, {i: c.i + 1, picked: null, shown: false, tries: 0, said: ''}); sat.hideRing(); ui.redraw(); room.story([H(text(c, 'ask'))]); return; }
    c.done = true; sat.hideRing();
    // a cycle's stages are worth remembering in order, so the explorer puts them back before it's learned
    if (c.L.stages) { c.recall = []; c.shuffled = [...c.L.stages].sort(() => Math.random() - .5); ui.redraw(); room.story([H('Before we finish: can you remember the order? Tap the four steps, starting from the sea.')]); return; }
    learned(c);
  }
  function learned(c){
    c.recall = null;
    if (!store.lessons.has(c.L.id)) { store.lessons.add(c.L.id); room.keep(); room.toast('Lesson learned', `${c.L.icon} ${c.L.name}`); }
    room.tune([523, 659, 784, 1046, 1319], {gap: .12, dur: .3, vol: .06});
    ui.redraw(); room.story(c.L.finish());
  }
  function recall(c, name){
    room.endTalk();
    if (name === c.L.stages[c.recall.length]) {
      c.recall.push(name); Sound.tone(660 + c.recall.length*110, {type: 'triangle', dur: .1, vol: .05});
      if (c.recall.length === c.L.stages.length) return learned(c);
    } else { c.miss = name; room.tune([330, 262], {gap: .1, dur: .14, vol: .05}); room.story([H(`Not ${name.toLowerCase()} yet. What happened to the drop next?`)]); }
    ui.redraw(); c.miss = null;
  }
  // an explore step: the explorer taps the globe
  function tapped(c, lat, lon){
    const s = c.L.steps[c.i]; if (!s.tap || c.shown) return false;
    room.dropPin(lat, lon); room.endTalk();
    const r = s.judge(lat, lon, c.L, c.n); c.tries++; c.said = r.said;
    if (r.ok) { c.shown = true; c.picked = 0; room.tune([659, 784, 1046], {vol: .06}); room.story([H(r.said), ...s.says(c.L, c.n).map(H)]); }
    else { room.tune([330, 262], {gap: .1, dur: .16, vol: .05}); const more = c.tries >= 3 ? s.help(c.L, c.n) : ''; if (more) c.said += ' ' + more; room.story([H(c.said)]); }
    ui.redraw(); return true;
  }

  function cycle(c){
    // while recalling the order, only the stages put back so far are lit
    const done = c.recall ? c.recall.length : c.done ? 4 : c.L.steps[c.i].stage + (c.shown ? 1 : 0), now = c.done ? -1 : c.L.steps[c.i].stage;
    const at = [[150, 34], [262, 105], [150, 176], [38, 105]], icons = ['☀️', '☁️', '🌧️', '🏞️'];
    const arcs = ['M178 40 Q240 52 252 80', 'M252 130 Q240 160 178 170', 'M122 170 Q60 160 48 130', 'M48 80 Q60 52 122 40'];
    return `<svg class="wcycle${c.done && !c.recall ? ' whole' : ''}" viewBox="0 0 300 222" role="img" aria-label="The water cycle: ${c.L.stages.join(', ')}">
      ${arcs.map((d, k) => `<path class="arc${k < done ? ' done' : ''}" d="${d}" marker-end="url(#wArrow)"/>`).join('')}
      <defs><marker id="wArrow" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse"><path d="M0 0L10 5L0 10z" fill="#2a6f9e"/></marker></defs>
      ${at.map(([x, y], k) => { const hid = c.recall && k >= c.recall.length;
        return `<g class="node${k === now ? ' now' : k < done ? ' done' : ''}"><circle cx="${x}" cy="${y}" r="22"/><text x="${x}" y="${y + 6}" style="font-size:20px">${hid ? '?' : icons[k]}</text><text x="${x}" y="${y + (k === 0 ? -27 : 36)}">${hid ? '?' : c.L.stages[k]}</text></g>`; }).join('')}
    </svg>`;
  }
  function draw(c){
    const s = c.L.steps[c.i];
    room.setColor('#2a6f9e');
    // on a tall screen the card is short, so the cycle is a line of words
    const stages = c.L.stages && `<div class="wstages">${c.L.stages.map((st, k) => { const s2 = c.done ? -1 : c.L.steps[c.i].stage, done = c.done || k < s2 || (k === s2 && c.shown);
      if (c.recall) return k < c.recall.length ? `<i>✓ ${st}</i>` : '<span>?</span>';
      return k === s2 && !c.shown ? `<b>${st}</b>` : done ? `<i>✓ ${st}</i>` : `<span>${st}</span>`; }).join(' → ')}</div>`;
    const progress = c.L.stages ? cycle(c) + stages : `<div class="wdots">${c.L.steps.map((_, k) => `<i class="${c.done || k < c.i || (k === c.i && c.shown) ? 'done' : k === c.i ? 'now' : ''}"></i>`).join('')}</div>`;
    const top = head(c.L.icon, "Hoot's sky lesson", c.L.name);
    if (c.failed) { card.innerHTML = `${top}${sat.offline}`; return; }
    if (c.busy && c.picked == null) { card.innerHTML = `${top}<div class="ghint">Getting the sky ready…</div>`; return; }
    if (c.recall) {
      card.innerHTML = `${top}${progress}<p class="gask">Can you remember the order? Tap them, starting from the sea.</p>
        <div class="gchoices">${c.shuffled.map(st => `<button data-st="${esc(st)}" class="${c.recall.includes(st) ? 'right' : st === c.miss ? 'wrong' : ''}" ${c.recall.includes(st) ? 'disabled' : ''}>${esc(st)}</button>`).join('')}</div>
        <div class="gbtns">${room.btn('gSkipR', 'Show me', 'gb ghost')}</div>`;
      card.querySelectorAll('[data-st]').forEach(b => b.addEventListener('click', () => recall(c, b.dataset.st)));
      room.on('gSkipR', () => learned(c));
      return;
    }
    if (c.done) {
      card.innerHTML = `${top}${progress}<p class="gwarm hot">✓ Lesson learned!</p>
        <div class="gbtns">${room.btn('gAgain', 'Watch it again', 'gb ghost')}${room.btn('gDone', 'Done')}</div>`;
      room.on('gAgain', () => start(c.L)); room.on('gDone', () => ui.show({kind: 'idle'}));
      return;
    }
    const choices = s.choices ? (typeof s.choices === 'function' ? s.choices(c.L, c.n) : s.choices) : null, right = c.shown && choices ? s.right(c.L, c.n) : -1;
    card.innerHTML = `${top}${progress}<div class="wstep">Step ${c.i + 1} of ${c.L.steps.length}${s.stage != null ? ` · ${c.L.stages[s.stage]}` : ''}</div>
      <p class="gask">${esc(text(c, 'ask'))}</p>
      ${choices ? `<div class="gchoices">${choices.map((x, k) => `<button data-k="${k}" class="${!c.shown ? '' : k === right ? 'right' : k === c.picked ? 'wrong' : 'dim'}" ${c.picked != null ? 'disabled' : ''}>${x.icon} ${esc(x.text)}</button>`).join('')}</div>` : ''}
      ${c.said ? `<p class="gwarm ${c.shown ? 'hot' : ''}">${esc(c.said)}</p>` : ''}
      ${c.busy ? '<div class="ghint">Watch the globe!</div>' : ''}
      ${c.shown && s.extra ? s.extra(c.L, c.n) : ''}
      ${c.shown ? s.says(c.L, c.n).map(t => `<p>${esc(t)}</p>`).join('') : ''}
      <div class="gbtns">${c.shown ? room.btn('gNext', c.i + 1 < c.L.steps.length ? 'Next →' : 'Finish') : ''}${room.btn('gStop', 'Stop the lesson', 'gb ghost')}</div>`;
    card.querySelectorAll('[data-k]').forEach(b => b.addEventListener('click', () => pick(c, +b.dataset.k)));
    room.on('gNext', () => next(c)); room.on('gStop', () => ui.show({kind: 'idle'}));
  }

  return {LESSONS, start, draw, tapped, frame, stop: hideProps};
}
