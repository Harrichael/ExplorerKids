// The geography globe: the land and the sea, and nothing people drew on them. Lean in, and the names
// of mountains, canyons, rivers, reefs, beaches and trenches come out. Tap anywhere for its field
// guide: what grows there with a real photo, the landforms nearby, and the wild animals people have
// really photographed there, after Hoot asks which of four doesn't belong. Or pick a wonder of
// nature, and Hoot shows a real photo of it to find on the globe, saying how far off each guess is
// and which way to go. Or open Hoot's landform notebook (notebook.js) and find every kind there is.
//
// real-earth.js owns the pictures, the names and the card's photos; `sat` is what it lends.

import { Sound } from '../core/sound.js';
import { WEBS } from '../earth/biomes.js';
import { LANDMARKS, landformOf } from '../earth/landforms.js';
import { arc } from '../earth/model.js';
import { WONDERS } from '../earth/wonders.js';
import { LENSES } from './imagery.js';
import { makeNotebook } from './notebook.js';
import { oddOneOut, seenNear } from './photos.js';
import { makeRiddles } from './riddles.js';

const css = document.createElement('style');
css.textContent = `
.ganimals{display:grid;grid-template-columns:repeat(auto-fill,minmax(88px,1fr));gap:6px}
.ganimals button{position:relative;padding:0;border:2.5px solid var(--ink);border-radius:12px;overflow:hidden;background:#fbf4e2;aspect-ratio:1;display:block}
.ganimals img{display:block;width:100%;height:100%;object-fit:cover}
.ganimals b{position:absolute;left:0;right:0;bottom:0;font-size:11px;font-weight:900;line-height:1.15;color:#fff;background:linear-gradient(transparent,rgba(16,12,22,.85));padding:12px 4px 4px;text-align:left}
.ganimals.four{grid-template-columns:repeat(2,1fr)}
.ganimals button.odd{box-shadow:0 0 0 3px #3e9b54}.ganimals button.wrongpick{box-shadow:0 0 0 3px #c4473a}.ganimals button.dim{opacity:.55}`;
document.head.appendChild(css);

const NATURE = WONDERS.filter(w => !w.built);
// the words for kinds the landform notebook doesn't cover
const KIND_WORD = {continent: 'Continent', ocean: 'Ocean', sea: 'Sea', gulf: 'Gulf', bay: 'Bay', strait: 'Strait', channel: 'Channel', sound: 'Sound',
  lowest: 'Low point', basin: 'Basin', tundra: 'Tundra', wetland: 'Wetland', region: 'Region', islands: 'Islands', river: 'River', lake: 'Lake'};
const kindWord = kind => landformOf(kind)?.name || KIND_WORD[kind] || 'Place';
const WATERY = /ocean|sea|gulf|bay|strait|channel|sound|lake|lagoon|trench|ridge|seamount|abyssal|reef/;
const iconOf = it => landformOf(it.kind)?.icon || (it.kind === 'river' ? '🏞️' : WATERY.test(it.kind) ? '🌊' : '📍');

export function makeNature(sat){
  const {room, card, store, esc, the, head, photoBlock, gallery, offline, MAX_MAG, magFor} = sat;
  const H = room.H;
  let labels = [], C = {kind: 'idle'}, shelf = 'wonders';

  // every name this globe shows, most important first: the order names.js places them in
  function loaded({geo}){
    labels = [
      ...[...geo.places, ...LANDMARKS].filter(p => p.kind !== 'capital').map(p => ({text: p.elevation && /peak|volcano/.test(p.kind) ? `${p.name} ${p.elevation.toLocaleString()} m` : p.name, kind: p.kind, lat: p.at[0], lon: p.at[1],
        rank: p.kind === 'continent' ? -2 : p.kind === 'ocean' ? -1 : p.min + (/peak|volcano/.test(p.kind) ? 1 : .4), ref: {place: p}})),
      ...geo.rivers.map(r => { const l = r.lines.reduce((a, b) => b.length > a.length ? b : a), i = Math.floor(l.length/4)*2;
        return {text: r.name, kind: 'river', lat: l[i + 1], lon: l[i], rank: r.min + 1, ref: {river: r}}; }),
    ].sort((a, b) => a.rank - b.rank);
  }
  function names(m){
    // the name Hoot has circled for a challenge goes first, or a neighbour's name could take its place
    const circled = C.kind === 'seek' && C.target ? [{...C.target, rank: -3}] : [];
    return [...circled, ...riddles.names(m), ...labels.filter(l => !C.target || l.text !== C.target.text)];
  }
  // where a spot is, in the land and sea's own words: a continent, or an ocean
  function whereIs(lat, lon){
    const {geo, earth} = sat.maps(), c = geo.countryAt(lat, lon), p = earth.placeAt(lat, lon);
    return the(c ? c.continent : p.within || p.name);
  }

  // ---------- the card ----------
  function draw(){
    if (riddles.cards[C.kind]) return riddles.cards[C.kind](C);
    if (C.kind === 'place') return drawPlace();
    if (C.kind === 'feature') return drawFeature();
    if (nb.cards[C.kind]) return nb.cards[C.kind](C);
    card.innerHTML = `<div class="ghint">Drag to spin. Pinch, scroll or press + to lean in close.<br>Tap anywhere to explore it, or tap a name!<br><br>Try "Mountains & sea floor" to see the hidden land under the sea.<br><br>Or pick a wonder at the bottom for one of Hoot's photo riddles, or open Hoot's landform notebook.</div>`;
  }

  // ---------- a field guide to wherever was tapped ----------
  function visit(lat, lon){
    const {geo, earth} = sat.maps(), p = earth.placeAt(lat, lon), c = geo.countryAt(lat, lon);
    C = {kind: 'place', lat, lon, p, continent: c && c.continent, animals: null};
    room.dropPin(lat, lon); room.tune([660, 990], {gap: .07, dur: .12, vol: .05});
    draw();
  }
  // the named landforms nearest a spot: the nearer the globe leans in, the nearer they must be
  function nearby(lat, lon, n = 6){
    const reach = Math.max(80, 900/Math.sqrt(room.view.mag));
    return labels.filter(l => l.rank >= 0 && l.kind !== 'continent').map(l => ({l, d: arc(lat, lon, l.lat, l.lon)})).filter(x => x.d < reach)
      .sort((a, b) => a.d - b.d).slice(0, n).map(x => x.l);
  }
  function drawPlace(){
    const {p} = C, b = p.biome, land = !b.water;
    // the ecoregion is the most exact thing the model knows here: 847 of them, against 18 biomes
    const title = land || p.biomeId === 'reef' || p.biomeId === 'lake' ? p.name : p.within || p.name;
    const within = land ? C.continent || '' : p.within && p.within !== title ? `In the ${p.within}` : '';
    const close = nearby(C.lat, C.lon);
    room.setColor(b.color);
    card.innerHTML = `${head(b.icon, b.name, title, within)}
      ${photoBlock([title, p.name], 'eco')}
      ${close.length ? `<div class="gsec">Near here</div><div class="gsights">${close.map((l, i) => `<button data-n="${i}">${iconOf(l)} ${esc(l.text)}</button>`).join('')}</div>` : ''}
      ${C.animals ? animalsBlock() : ''}
      <div class="gbtns">${C.animals ? '' : room.btn('gWho', 'Who lives here?')}${room.btn('gWeb', 'Its food web', 'gb ghost')}</div>`;
    card.querySelectorAll('[data-n]').forEach(el => el.addEventListener('click', () => tap(close[+el.dataset.n])));
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
  const showAnimals = () => card.querySelector('.ganimals')?.scrollIntoView({block: 'start', behavior: 'smooth'});
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
    C = {kind: 'feature', it}; room.dropPin(it.lat, it.lon); room.tune([784, 1046], {gap: .06, dur: .1, vol: .05}); draw();
  }
  function drawFeature(){
    const {it} = C, r = it.ref;
    const p = r.place, title = p ? p.name : it.text, wiki = p ? p.wiki : `${it.text} River`;
    const within = p && p.depth ? `${p.depth.toLocaleString()} metres deep` : p && p.elevation ? `${p.elevation.toLocaleString()} metres ${p.kind === 'lowest' ? 'below the sea' : 'high'}` : whereIs(it.lat, it.lon);
    const lf = landformOf(it.kind);
    // a big area's article is often illustrated with maps and charts, which the gallery leaves out
    card.innerHTML = `${head(iconOf(it), kindWord(it.kind), title, within)}
      ${photoBlock(wiki, 'f')}
      ${lf && store.landforms.has(lf.id) ? `<p class="gtry">${esc(lf.means)}</p>` : ''}
      ${gallery(wiki, 'fg')}
      <div class="gbtns">${room.btn('gHere', 'Explore here')}${room.btn('gIn', 'Lean in close', 'gb ghost')}</div>`;
    room.on('gHere', () => visit(it.lat, it.lon));
    room.on('gIn', () => room.flyTo(it.lat, it.lon, Math.min(MAX_MAG, Math.max(room.view.mag*2, magFor(Math.max(0, it.rank))*2))));
  }

  // ---------- wonders of nature, and the bar along the bottom ----------
  function chips(){
    const [w, l] = sat.shelf.children;
    w.innerHTML = `📷<span> Wonders</span> ${riddles.count()}/${NATURE.length}`; l.innerHTML = `📒<span> Landforms</span> ${nb.tally()}`;
    w.setAttribute('aria-label', `Wonders of nature: ${riddles.count()} of ${NATURE.length} found`); l.setAttribute('aria-label', `Hoot's landform notebook: ${nb.tally().replace('/', ' of ')} found`);
    w.setAttribute('aria-pressed', shelf === 'wonders'); l.setAttribute('aria-pressed', shelf === 'landforms');
    room.chips(shelf === 'landforms' ? nb.chips() : riddles.chips());
  }
  const show = c => { C = c; sat.hideRing(); chips(); draw(); };
  const riddles = makeRiddles(sat, {list: NATURE, word: 'Wonder of nature', whereIs, ui: {now: () => C, show, redraw: () => draw()},
    here: {label: 'Who lives here?', go: (lat, lon) => { visit(lat, lon); whoLivesHere(); }}});

  // ---------- Hoot's landform notebook ----------
  const nb = makeNotebook(room, {card, esc, the, head, photoBlock, gallery, MAX_MAG, magFor,
    now: () => C, show, redraw: () => draw(),
    labels: () => labels, centre: sat.centre, ring: sat.ring, explore: visit,
    countryAt: (lat, lon) => sat.maps().geo.countryAt(lat, lon), whereIs,
    shelf: s => { shelf = s; chips(); }});

  // ---------- coming and going ----------
  function enter(){
    C = {kind: 'idle'};
    sat.shelf.innerHTML = '<button data-s="wonders"></button><button data-s="landforms"></button>';
    sat.shelf.querySelectorAll('button').forEach(b => b.addEventListener('click', () => {
      if (shelf === b.dataset.s) return;
      shelf = b.dataset.s; Sound.tone(880, {type: 'triangle', dur: .08, vol: .05}); chips();
      if (shelf === 'landforms') nb.opened();
    }));
    chips();
    if (!store.met.has('geo')) { store.met.add('geo'); room.keep();
      room.story([H('This is the real Earth, photographed from space by satellites! On this globe we look at the land and the sea.'),
        H('Lean in close and you can see real mountains, rivers, canyons and reefs. Tap anywhere and I\'ll show you what\'s there, and who lives there.'),
        H('Try "Mountains & sea floor" to see the mountains and trenches hidden under the sea!'),
        H('And tap the names! Every new kind of landform goes in my notebook.')]); }
  }
  function leave(){ C = {kind: 'idle'}; }

  // a wonder's name has its own card, but finding one still counts in the notebook's challenges
  function tap(it){ if (!nb.tapped(it) && !riddles.tapped(it)) feature(it); return true; }
  function press(lat, lon){ if (C.kind === 'hunt') riddles.guess(lat, lon); else if (!nb.pressed()) visit(lat, lon); }
  // Esc: a riddle or challenge, then whatever's on the card
  function back(){
    if (C.kind === 'hunt' || C.kind === 'seek') { C = {kind: 'idle'}; sat.hideRing(); chips(); draw(); return true; }
    if (C.kind === 'sight') { riddles.show(C.w); return true; }
    if (C.kind !== 'idle') { C = {kind: 'idle'}; sat.hideRing(); room.hidePin(); draw(); return true; }
    return false;
  }

  return {id: 'geo', on: false, shelfLabel: 'Wonders or landforms',
    lenses: ['earth', 'relief'].map(id => LENSES.find(l => l.id === id)), lines: {rivers: true}, credits: ['Photos: Wikipedia and iNaturalist'],
    loaded, names, nameKey: () => [store.wonders.size, C.target?.text].join(), draw, chips, enter, leave, tap, press, back};
}
