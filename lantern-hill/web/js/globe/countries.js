// The countries globe: the world's nations, and the people who live in them. Tap a country and Hoot
// asks a quick guess first, its capital, its flag or how many people live there, then opens its
// page: capital, people, size, money, languages, how it's governed and when it became a country,
// its biggest cities, and real photos of its land, cities, culture, food and money. Or play Hoot's
// flag and capital riddles, or the photo riddles about wonders people built.
//
// real-earth.js owns the pictures, the names and the card's photos; `sat` is what it lends.

import { Sound } from '../core/sound.js';
import { governmentOf, loadNations, foundedSaying } from '../earth/nations.js';
import { WONDERS } from '../earth/wonders.js';
import { LENSES } from './imagery.js';
import { makeRiddles } from './riddles.js';
import { judge } from './wonder-hunt.js';

const css = document.createElement('style');
css.textContent = `
#gCard .gflag{display:block;align-self:flex-start;height:58px;max-width:100%;border:2px solid var(--ink);border-radius:4px;background:#fff;object-fit:contain}
.gflags{display:grid;grid-template-columns:repeat(3,1fr);gap:6px}
.gflags button{padding:6px;background:#fbf4e2;border:2.5px solid var(--ink);border-radius:10px;display:grid;place-items:center}
.gflags img{display:block;width:100%;aspect-ratio:3/2;object-fit:contain}
.gflags button.right{box-shadow:0 0 0 3px #3e9b54}.gflags button.wrong{box-shadow:0 0 0 3px #c4473a}.gflags button.dim{opacity:.55}`;
document.head.appendChild(css);

const BUILT = WONDERS.filter(w => w.built);
const flagSrc = (file, w = 320) => `https://commons.wikimedia.org/wiki/Special:FilePath/${encodeURIComponent(file)}?width=${w}`;
const pick = (list, k, rand = Math.random) => { const l = [...list], out = []; while (out.length < k && l.length) out.push(l.splice(Math.floor(rand()*l.length), 1)[0]); return out; };
const shuffle = list => pick(list, list.length);
// '68 million', '1.4 billion', '38,000'
function many(n){
  if (n >= 1e9) return `${(n/1e9).toFixed(1).replace(/\.0$/, '')} billion`;
  if (n >= 1e6) return `${n >= 1e7 ? Math.round(n/1e6) : (n/1e6).toFixed(1).replace(/\.0$/, '')} million`;
  return n >= 1e4 ? Math.round(n/1e3).toLocaleString() + ',000' : n.toLocaleString();
}
// how many people, as a choice a child can weigh: the right one, and its neighbours ten times off
const CROWDS = [[1e5, 'Fewer than 100 thousand'], [1e6, 'Between 100 thousand and a million'], [1e7, 'Between 1 and 10 million'], [1e8, 'Between 10 and 100 million'], [1e9, 'Between 100 million and a billion'], [1e11, 'More than a billion']];
const crowdOf = n => CROWDS.findIndex(([top]) => n < top);

export function makeCountries(sat){
  const {room, card, store, esc, the, head, photoBlock, gallery} = sat;
  const H = room.H;
  let nations = null, labels = [], C = {kind: 'idle'}, shelf = 'riddles';
  const nationOf = c => c && nations ? nations[c.id] || null : null;

  // every name this globe shows: countries, then capitals, then their other big cities
  function loaded({geo}){
    labels = [
      ...geo.countries.map(c => ({text: c.short || c.name, kind: 'country', lat: c.at[0], lon: c.at[1], rank: c.min, ref: {country: c}})),
      ...geo.places.filter(p => p.kind === 'continent' || p.kind === 'ocean' || p.kind === 'capital').map(p => ({text: p.name, kind: p.kind, lat: p.at[0], lon: p.at[1],
        rank: p.kind === 'continent' ? -2 : p.kind === 'ocean' ? -1 : p.min + 1, ref: {place: p}})),
    ];
    addCities();
  }
  function addCities(){
    if (!nations || !labels.length || labels.some(l => l.kind === 'city')) return;
    const {geo} = sat.maps(), capitals = new Set(geo.places.filter(p => p.kind === 'capital').map(p => p.name));
    for (const c of geo.countries) for (const city of nationOf(c)?.cities || []) {
      if (capitals.has(city.name)) continue;
      // the bigger the city, the sooner its name comes out
      labels.push({text: city.name, kind: 'city', lat: city.at[0], lon: city.at[1], rank: city.population > 5e6 ? 3.6 : city.population > 1e6 ? 4.4 : 5.2, ref: {city, country: c}});
    }
    labels.sort((a, b) => a.rank - b.rank); sat.renamed();
  }
  const names = m => [...riddles.names(m), ...labels];
  const countryOf = (lat, lon) => sat.maps().geo.countryAt(lat, lon);
  function whereIs(lat, lon){ const c = countryOf(lat, lon); return c ? the(c.name) : the(sat.maps().earth.placeAt(lat, lon).within || 'the open sea'); }

  // ---------- the card ----------
  function draw(){
    if (riddles.cards[C.kind]) return riddles.cards[C.kind](C);
    if (C.kind === 'country') return drawCountry();
    if (C.kind === 'city') return drawCity();
    if (C.kind === 'sea') return drawSea();
    if (C.kind === 'flag' || C.kind === 'capital') return drawFind();
    card.innerHTML = `<div class="ghint">Drag to spin. Pinch, scroll or press + to lean in close.<br>Tap a country to visit it!<br><br>Or try one of Hoot's flag and capital riddles at the bottom.</div>`;
  }

  // ---------- a country: guess first, then its page ----------
  function visit(c, fly){
    room.dropPin(...c.at); room.tune([660, 990], {gap: .07, dur: .12, vol: .05});
    if (fly) room.flyTo(...c.at, Math.max(room.view.mag, 2));
    const n = nationOf(c), first = !store.countries.has(c.id);
    C = {kind: 'country', c, n, quiz: first && n ? quizFor(c, n) : null};
    if (!first) { draw(); return; }
    store.countries.add(c.id); room.keep(); chips();
    if (C.quiz) room.story([H(`${the(c.name)[0].toUpperCase() + the(c.name).slice(1)}! Before I tell you about it, a quick guess.`), H(C.quiz.ask)]);
    draw();
  }
  // the kind of guess turns over from one new country to the next
  function quizFor(c, n){
    const kinds = ['capital', 'flag', 'people'], kind = kinds[store.countries.size % 3];
    const {geo} = sat.maps(), near = geo.countries.filter(o => o !== c && nationOf(o) && o.continent === c.continent);
    if (kind === 'capital' && n.capital) {
      const others = (n.cities || []).map(x => x.name).filter(x => x !== n.capital);
      const fill = pick(near.map(o => nationOf(o).capital).filter(x => x && !others.includes(x)), 3);
      const wrong = [...pick(others, 2), ...fill].slice(0, 2);
      if (wrong.length === 2) return {kind, ask: `Which city do you think is the capital of ${the(c.name)}? The capital is where its government meets.`, right: n.capital, choices: shuffle([n.capital, ...wrong])};
    }
    if (kind === 'flag' && n.flag && !n.disputed) {
      const wrong = pick(near.filter(o => nationOf(o).flag && !nationOf(o).disputed), 2);
      if (wrong.length === 2) return {kind, ask: `Which of these do you think is the flag of ${the(c.name)}?`, right: n.flag, choices: shuffle([n.flag, ...wrong.map(o => nationOf(o).flag)])};
    }
    if (n.population) {
      const i = crowdOf(n.population), lo = Math.max(0, Math.min(i - 1, CROWDS.length - 3));
      return {kind: 'people', ask: `How many people do you think live in ${the(c.name)}?`, right: CROWDS[i][1], choices: CROWDS.slice(lo, lo + 3).map(x => x[1])};
    }
    return null;
  }
  function answer(i){
    const q = C.quiz; if (q.picked != null) return;
    q.picked = i; const right = q.choices[i] === q.right, c = C.c, n = C.n;
    room.endTalk(); room.tune(right ? [659, 784, 1046] : [392, 330], {vol: .06});
    const said = q.kind === 'capital' ? `The capital of ${the(c.name)} is ${n.capital}.`
      : q.kind === 'flag' ? `That's the flag of ${the(c.name)}.`
      : `About ${many(n.population)} people live in ${the(c.name)}.`;
    room.story([H((right ? 'You got it! ' : 'Good guess, but no. ') + said)]);
    draw();
  }
  function drawCountry(){
    const {c, n, quiz} = C;
    room.setColor('#6d3b5e');
    const kind = n?.sovereign ? `Part of ${the(n.sovereign)}` : 'Country';
    if (quiz && quiz.picked == null) {
      const opts = quiz.kind === 'flag'
        ? `<div class="gflags">${quiz.choices.map((f, i) => `<button data-q="${i}" aria-label="Flag ${i + 1}"><img alt="" src="${esc(flagSrc(f, 160))}"></button>`).join('')}</div>`
        : `<div class="gchoices">${quiz.choices.map((x, i) => `<button data-q="${i}">${esc(x)}</button>`).join('')}</div>`;
      card.innerHTML = `${head('🦉', 'Guess first!', c.name, c.continent)}<p class="gask">${esc(quiz.ask)}</p>${opts}
        <div class="gbtns">${room.btn('gSkip', 'Just tell me', 'gb ghost')}</div>`;
      card.querySelectorAll('[data-q]').forEach(b => b.addEventListener('click', () => answer(+b.dataset.q)));
      room.on('gSkip', () => { quiz.picked = -1; room.endTalk(); draw(); });
      return;
    }
    const mark = quiz && quiz.picked >= 0 ? `<p class="gwarm ${quiz.choices[quiz.picked] === quiz.right ? 'hot' : ''}">${quiz.choices[quiz.picked] === quiz.right ? '✓ You guessed right!' : '✗ Not quite: see below!'}</p>` : '';
    if (!n) {
      card.innerHTML = `${head('🏳️', kind, c.name, c.continent)}${photoBlock(c.wiki, 'c')}<div class="gbtns">${room.btn('gIn', 'Lean in close', 'gb ghost')}</div>`;
      room.on('gIn', () => room.flyTo(...c.at, Math.max(room.view.mag*2, 4)));
      return;
    }
    const gov = governmentOf(n.government), founded = foundedSaying(n);
    const fact = (icon, label, value, more) => value ? `<dt aria-hidden="true">${icon}</dt><dd><b>${label}:</b> ${esc(value)}${more ? `<small>${esc(more)}</small>` : ''}</dd>` : '';
    const cities = (n.cities || []).filter(x => x.wiki);
    card.innerHTML = `${head('🏳️', kind, c.name, c.continent)}${mark}
      ${n.flag ? `<img class="gflag" alt="The flag of ${esc(the(c.name))}" src="${esc(flagSrc(n.flag))}">` : ''}
      ${n.disputed ? `<p class="gtry">${esc(n.disputed)}</p>` : ''}
      <dl class="gfacts">
        ${fact('🏛️', 'Capital', n.capital)}
        ${fact('👥', 'People', n.population && `about ${many(n.population)}`, n.populationYear && `counted in ${n.populationYear}`)}
        ${fact('📐', 'Size', n.area && `${n.area.toLocaleString()} square kilometres`)}
        ${fact('💰', 'Money', (n.currency || []).map(m => m.name).join(', '))}
        ${fact('🗣️', n.languages?.length > 1 ? 'Languages' : 'Language', (n.languages || []).join(', '))}
        ${fact('⚖️', 'Government', gov && gov.name, gov && [gov.means, n.federal && 'It is a federation: its states or provinces run some things for themselves.'].filter(Boolean).join(' '))}
        ${fact('🎂', 'Became a country', founded)}
        ${fact('⛰️', 'Highest point', n.highest && `${n.highest.name}, ${n.highest.elevation.toLocaleString()} m`)}
      </dl>
      ${cities.length ? `<div class="gsec">Biggest cities</div><div class="gsights">${cities.map((x, i) => `<button data-c="${i}">${x.name === n.capital ? '⭐' : '🏙️'} ${esc(x.name)}</button>`).join('')}</div>` : ''}
      ${photoBlock(n.wiki || c.wiki, 'c')}
      ${gallery(null, 'cg', {heading: 'Real photos', tabs: [
        {name: '🏞️ Land', titles: [`Geography of ${the(c.wiki)}`, `Tourism in ${the(c.wiki)}`]},
        {name: '🏙️ Cities', titles: cities.map(x => x.wiki)},
        {name: '🎎 Culture', titles: [`Culture of ${the(c.wiki)}`]},
        {name: '🍲 Food', titles: [`Cuisine of ${the(c.wiki)}`]},
        {name: '💰 Money', titles: (n.currency || []).map(m => m.wiki).filter(Boolean)},
      ]})}
      <div class="gbtns">${room.btn('gIn', 'Lean in close', 'gb ghost')}</div>`;
    card.querySelectorAll('[data-c]').forEach(b => b.addEventListener('click', () => city(cities[+b.dataset.c], c)));
    room.on('gIn', () => room.flyTo(...c.at, Math.max(room.view.mag*2, 4)));
  }

  // ---------- a city ----------
  function city(x, c){
    C = {kind: 'city', x, c}; room.dropPin(...x.at); room.flyTo(...x.at, Math.max(room.view.mag, 12));
    room.tune([784, 1046], {gap: .06, dur: .1, vol: .05}); draw();
  }
  function drawCity(){
    const {x, c} = C, n = nationOf(c);
    room.setColor('#6d3b5e');
    card.innerHTML = `${head(n && x.name === n.capital ? '⭐' : '🏙️', n && x.name === n.capital ? 'Capital city' : 'City', x.name, `in ${the(c.name)}`)}
      ${x.population ? `<p>About ${many(x.population)} people live here.</p>` : ''}
      ${photoBlock(x.wiki, 'x')}
      ${gallery(x.wiki, 'xg')}
      <div class="gbtns">${room.btn('gBackC', `About ${the(c.name)}`)}</div>`;
    room.on('gBackC', () => visit(c));
  }
  // the open sea is no country's
  function drawSea(){
    room.setColor('#2a6f9e');
    card.innerHTML = `${head('🌊', 'The open sea', C.name)}<p>No country owns the open sea, far from any coast. Ships of every country can sail it, and it belongs to everyone.</p>`;
  }

  // ---------- Hoot's riddles: whose flag, whose capital? ----------
  // The riddles pick countries a child might know: the ones whose names show from far out. Where
  // which flag or capital is right is itself in dispute, there's no riddle about it.
  function riddle(kind){
    const {geo} = sat.maps(), done = kind === 'flag' ? store.flags : store.capitals;
    const pool = geo.countries.filter(c => { const n = nationOf(c); return n && (kind === 'flag' ? n.flag : n.capital) && !n.sovereign && !n.disputed && c.min <= 4; });
    const fresh = pool.filter(c => !done.has(c.id)), c = pick(fresh.length ? fresh : pool, 1)[0];
    if (!c) return;
    C = {kind, c, misses: 0, last: null, said: ''}; sat.hideRing(); room.hidePin(); chips(); draw();
    room.tune([392, 523, 659], {gap: .1});
    room.story(kind === 'flag' ? [H("Whose flag is this? Find its country on the globe and tap it!")]
      : [H(`${nationOf(c).capital} is the capital of a country. Which one? Find it on the globe and tap it!`)]);
  }
  function drawFind(){
    const {c, kind} = C, n = nationOf(c);
    room.setColor('#6d3b5e');
    card.innerHTML = `${head('🦉', "Hoot's riddle", kind === 'flag' ? 'Whose flag is this?' : `Whose capital is ${n.capital}?`)}
      ${kind === 'flag' ? `<img class="gflag" style="height:110px" alt="A flag" src="${esc(flagSrc(n.flag))}">` : photoBlock(n.cities?.find(x => x.name === n.capital)?.wiki, 'k', {words: false, alt: `The city of ${n.capital}`})}
      ${C.said ? `<p class="gwarm">${esc(C.said)}</p>` : ''}${C.misses >= 2 ? `<p class="gtry">It's in ${esc(c.continent)}.</p>` : ''}
      <div class="gbtns">${room.btn('gStop', 'Stop the riddle', 'gb ghost')}</div>`;
    room.on('gStop', () => show({kind: 'idle'}));
  }
  function find(lat, lon){
    const {c, kind} = C, there = countryOf(lat, lon);
    room.dropPin(lat, lon); room.endTalk();
    if (there === c) {
      (kind === 'flag' ? store.flags : store.capitals).add(c.id); room.keep(); sat.hideRing();
      room.toast(kind === 'flag' ? `Flag riddle solved · ${store.flags.size}` : `Capital riddle solved · ${store.capitals.size}`, c.name);
      room.tune([523, 659, 784, 1046, 1319], {gap: .09, dur: .3, vol: .07});
      const n = nationOf(c);
      room.story([H(kind === 'flag' ? `Yes! That's the flag of ${the(c.name)}.` : `Yes! ${n.capital} is the capital of ${the(c.name)}.`)]);
      store.countries.delete(c.id); visit(c);
      return;
    }
    // how far, from the middle of the country, and which way
    const j = judge({lat, lon}, {at: c.at, r: 0}, C.last);
    C.misses++; C.last = j.km;
    const warm = j.warmer == null ? '' : j.warmer ? 'Warmer! ' : 'Colder! ';
    C.said = `${warm}That's ${whereIs(lat, lon)}. Try about ${j.about.toLocaleString()} km to the ${j.way}.`;
    if (C.misses >= 4) { sat.ring(c.at, Math.max(300, Math.sqrt(nationOf(c).area || 1e5))); C.said += " I've circled it for you."; }
    room.tune(j.warmer ? [523, 659] : [330, 262], {gap: .1, dur: .16, vol: .05});
    draw(); room.story([H(C.said)]);
  }

  // ---------- the bar along the bottom ----------
  function chips(){
    const [r, l] = sat.shelf.children;
    r.innerHTML = `🏳️<span> Riddles</span> ${store.flags.size + store.capitals.size}`; l.innerHTML = `🏛️<span> Landmarks</span> ${riddles.count()}/${BUILT.length}`;
    r.setAttribute('aria-label', `Flag and capital riddles: ${store.flags.size + store.capitals.size} solved`); l.setAttribute('aria-label', `Landmarks: ${riddles.count()} of ${BUILT.length} found`);
    r.setAttribute('aria-pressed', shelf === 'riddles'); l.setAttribute('aria-pressed', shelf === 'landmarks');
    if (shelf === 'landmarks') return room.chips(riddles.chips());
    room.chips([
      {icon: '🏳️', text: 'Whose flag is this?', label: 'Flag riddle', hunting: C.kind === 'flag', found: false, go: () => riddle('flag')},
      {icon: '🏙️', text: 'Whose capital is it?', label: 'Capital riddle', hunting: C.kind === 'capital', found: false, go: () => riddle('capital')},
      {icon: '🧭', text: `${store.countries.size} countries visited`, label: `${store.countries.size} countries visited`, found: store.countries.size > 0, go: () => {}},
    ]);
  }
  const show = c => { C = c; sat.hideRing(); chips(); draw(); };
  const riddles = makeRiddles(sat, {list: BUILT, word: 'Landmark', whereIs, ui: {now: () => C, show, redraw: () => draw()},
    here: {label: 'About this country', go: (lat, lon) => { const c = countryOf(lat, lon); if (c) visit(c); }}});

  // ---------- coming and going ----------
  function enter(){
    C = {kind: 'idle'};
    sat.shelf.innerHTML = '<button data-s="riddles"></button><button data-s="landmarks"></button>';
    sat.shelf.querySelectorAll('button').forEach(b => b.addEventListener('click', () => {
      if (shelf === b.dataset.s) return;
      shelf = b.dataset.s; Sound.tone(880, {type: 'triangle', dur: .08, vol: .05}); chips();
    }));
    chips();
    if (!nations) loadNations().then(n => { nations = n; addCities(); if (C.kind === 'country' && !C.n) C.n = nationOf(C.c); sat.redraw(); }, e => console.warn('nations:', e));
    if (!store.met.has('countries')) { store.met.add('countries'); room.keep();
      room.story([H('This is my countries globe! People have drawn lines on the Earth to share it out into countries.'),
        H('Every country has its own flag, its own capital city, and often its own money and language. Tap one to visit it!')]); }
  }
  function leave(){ C = {kind: 'idle'}; }

  function tap(it){
    if (riddles.tapped(it)) return true;
    if (C.kind === 'flag' || C.kind === 'capital') { find(it.lat, it.lon); return true; }
    if (it.ref.city) { city(it.ref.city, it.ref.country); return true; }
    if (it.ref.country) { visit(it.ref.country); return true; }
    const c = countryOf(it.lat, it.lon);
    if (it.kind === 'capital' && c) { const x = nationOf(c)?.cities?.find(y => y.name === it.text); if (x) { city(x, c); return true; } }
    return false;
  }
  function press(lat, lon){
    if (C.kind === 'hunt') return riddles.guess(lat, lon);
    if (C.kind === 'flag' || C.kind === 'capital') return find(lat, lon);
    const c = countryOf(lat, lon);
    if (c) return visit(c);
    C = {kind: 'sea', name: sat.maps().earth.placeAt(lat, lon).name}; room.dropPin(lat, lon); draw();
  }
  function back(){
    if (C.kind === 'sight') { riddles.show(C.w); return true; }
    if (C.kind === 'city') { visit(C.c); return true; }
    if (C.kind !== 'idle') { show({kind: 'idle'}); room.hidePin(); return true; }
    return false;
  }

  return {id: 'countries', on: false, shelfLabel: 'Riddles or landmarks',
    lenses: ['countries', 'earth', 'night'].map(id => LENSES.find(l => l.id === id)), lines: {borders: true}, credits: ['Photos: Wikipedia', 'Country facts: Wikidata'],
    loaded, names, nameKey: () => [store.wonders.size, labels.length].join(), draw, chips, enter, leave, tap, press, back};
}
