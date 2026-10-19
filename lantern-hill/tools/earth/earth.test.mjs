// The world model against places a child might tap, Hoot's riddles against the map, the food webs
// against the rules every web must keep, and the geography globe's wonders and landforms against the
// map. Runs on the built data:
//   node --test tools/earth/*.test.mjs   (from lantern-hill/)

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { BIOMES, WEBS, visit } from '../../web/js/earth/biomes.js';
import { makeGeography } from '../../web/js/earth/geography.js';
import { LANDFORMS, LANDMARKS, landformBy, landformOf } from '../../web/js/earth/landforms.js';
import { arc, makeEarth } from '../../web/js/earth/model.js';
import { WONDERS } from '../../web/js/earth/wonders.js';
import { eatenBy, hunter, whatIf } from '../../web/js/globe/food-web.js';
import { choices } from '../../web/js/globe/landform-quiz.js';
import { oddOneOut } from '../../web/js/globe/photos.js';
import { judge } from '../../web/js/globe/wonder-hunt.js';

const data = name => JSON.parse(readFileSync(new URL(`../../web/data/${name}.json`, import.meta.url), 'utf8'));
const earth = makeEarth(data('earth')), geo = makeGeography(data('geography'));

test('famous places are in the biome you would expect, with their own food web', () => {
  const cases = [
    // [lat, lon, biome, web]
    [-2.5, 34.8, 'savanna', 'serengeti'],
    [-3.5, -62, 'tropical-forest', 'amazon'],
    [1, 114, 'tropical-forest', 'borneo'],
    [23.5, 9, 'desert', 'sahara'],
    [32, -112.5, 'desert', 'sonoran'],
    [-24, 132, 'desert', 'outback'],
    [62, 100, 'taiga', 'siberia'],
    [39, -99, 'grassland', 'great-plains'],
    [-17.5, -57, 'wetland', 'pantanal'],
    [33, 88, 'mountains', 'tibet'],
    [21.9, 89.2, 'mangrove', 'sundarbans'],
    [5, -140, 'ocean', 'open-pacific'],
    [-18.3, 147.7, 'reef', 'great-barrier-reef'],
  ];
  for (const [lat, lon, biome, web] of cases) {
    const p = earth.placeAt(lat, lon);
    assert.equal(p.biomeId, biome, `${lat},${lon} is ${p.name}`);
    assert.equal(p.web.id, web, `${lat},${lon} (${p.name})`);
  }
});

test('a web from the same realm beats a closer one across the border', () => {
  // central India shares its realm with Borneo but has a closer web of its own
  assert.equal(earth.placeAt(22.3, 80.6).web.id, 'kanha');
  // Gabon is Afrotropic, so it gets the Congo, not whichever rainforest is nearest by distance
  assert.equal(earth.placeAt(-1, 12).web.id, 'congo');
  // the Gobi has no web of its own, and borrows the Sahara's: same realm, and labelled with where it's from
  const gobi = earth.placeAt(43, 105);
  assert.equal(gobi.biomeId, 'desert'); assert.equal(gobi.web.place, 'the Sahara');
});

test('water knows which sea it is', () => {
  assert.equal(earth.placeAt(0, -30).name, 'Atlantic Ocean');
  assert.equal(earth.placeAt(-20, 80).name, 'Indian Ocean');
  assert.equal(earth.placeAt(35, 18).name, 'Mediterranean Sea');
  assert.deepEqual([earth.placeAt(42, 51).name, earth.placeAt(42, 51).biomeId], ['Caspian Sea', 'lake']);
  assert.deepEqual([earth.placeAt(-1, 33).name, earth.placeAt(-1, 33).biomeId], ['Lake Victoria', 'lake']);
  const arctic = earth.placeAt(80, 0), southern = earth.placeAt(-62, 0);
  assert.deepEqual([arctic.name, arctic.biomeId, arctic.web.id], ['Arctic Ocean', 'polar-sea', 'arctic-ocean']);
  assert.deepEqual([southern.name, southern.biomeId, southern.web.id], ['Southern Ocean', 'polar-sea', 'antarctic']);
});

test('the ice sheets borrow the food web of their own pole', () => {
  const ant = earth.placeAt(-80, 0), green = earth.placeAt(72, -40);
  assert.deepEqual([ant.name, ant.biomeId, ant.web.id], ['Antarctica', 'ice', 'antarctic']);
  assert.deepEqual([green.name, green.biomeId, green.web.id], ['Greenland', 'ice', 'arctic-ocean']);
});

test('visiting a biome lands in it', () => {
  for (const id of Object.keys(BIOMES)) {
    const p = earth.placeAt(...visit(id));
    assert.equal(p.biomeId, id, `visiting ${id} lands in ${p.name}`);
  }
});

test('every spot on Earth gets a biome and a food web', () => {
  for (let lat = -89; lat <= 89; lat += 4) for (let lon = -179; lon <= 179; lon += 4) {
    const p = earth.placeAt(lat, lon);
    assert.ok(p.biome && p.web, `${lat},${lon} (${p.name}, ${p.biomeId})`);
  }
});

test('every food web is a web: it starts from plants or algae and has no loops', () => {
  for (const w of WEBS) {
    assert.ok(w.species.some(s => !s.eats.length), `${w.id} has no producers`);
    for (const b of w.biomes) assert.ok(BIOMES[b], `${w.id} names unknown biome ${b}`);
    const names = w.species.map(s => s.name);
    assert.equal(new Set(names).size, names.length, `${w.id} repeats a name`);
    const byName = new Map(w.species.map(s => [s.name, s])), seen = new Set();
    const climb = (s, path) => {
      assert.ok(!path.includes(s.name), `${w.id}: ${[...path, s.name].join(' → ')} is a loop`);
      if (seen.has(s.name)) return; seen.add(s.name);
      for (const f of s.eats) climb(byName.get(f), [...path, s.name]);
    };
    w.species.forEach(s => climb(s, []));
  }
  for (const id of Object.keys(BIOMES)) assert.ok(WEBS.some(w => w.biomes.includes(id)), `no food web for ${id}`);
});

test("Hoot's riddles point the right way: most of each biome lies in the band of latitude its hints use", () => {
  const inBand = {}, all = {};
  for (let lat = -89.5; lat < 90; lat += 1) for (let lon = -179.5; lon < 180; lon += 2) {
    const p = earth.placeAt(lat, lon), area = Math.cos(lat*Math.PI/180), [lo, hi] = BIOMES[p.biomeId].hunt.band;
    all[p.biomeId] = (all[p.biomeId] || 0) + area;
    if (Math.abs(lat) >= lo && Math.abs(lat) <= hi) inBand[p.biomeId] = (inBand[p.biomeId] || 0) + area;
  }
  for (const id of Object.keys(BIOMES)) {
    assert.ok((inBand[id] || 0)/all[id] > .85, `${id}: only ${Math.round(100*(inBand[id] || 0)/all[id])}% inside ${BIOMES[id].hunt.band}`);
    assert.equal(!!BIOMES[id].water, !!earth.placeAt(...visit(id)).biome.water, `${id} is ${BIOMES[id].water ? 'water' : 'land'}`);
  }
});

test("every food web can carry Hoot's lessons", () => {
  for (const w of WEBS) {
    const h = hunter(w);
    assert.ok(h && h.eats.length > 1, `${w.id} has no hunter that eats more than one thing`);
    const q = whatIf(w);
    assert.ok(q, `${w.id} has nothing to make disappear`);
    assert.ok(q.gone.eats.includes(q.food.name), `${w.id}: ${q.gone.name} doesn't eat ${q.food.name}`);
    assert.ok(eatenBy(w, q.gone.name).includes(q.eater.name), `${w.id}: ${q.eater.name} doesn't eat ${q.gone.name}`);
  }
  // the classic case: with no prairie dogs, more grass and fewer of the ferrets that hunt them
  const plains = whatIf(WEBS.find(w => w.id === 'great-plains'));
  assert.deepEqual([plains.gone.name, plains.food.name, plains.eater.name], ['Prairie dog', 'Grass', 'Black-footed ferret']);
});

test('the wonders are where Hoot says, and their sights are part of them', () => {
  for (const w of WONDERS) {
    if (w.country) assert.equal(geo.countryAt(...w.at)?.name, w.country, w.id);
    for (const s of w.sights || []) assert.ok(arc(...s.at, ...w.at) < 250, `${w.id}: ${s.name} is ${Math.round(arc(...s.at, ...w.at))} km away`);
  }
  assert.equal(new Set(WONDERS.map(w => w.id)).size, WONDERS.length);
  // and the map names the countries a guess lands in, capitals and all
  assert.deepEqual(['France', 'Paris'], [geo.countryAt(48.86, 2.35).name, geo.countryAt(48.86, 2.35).capital]);
  assert.equal(geo.countryAt(-4.3, 15.3).name, 'Democratic Republic of the Congo');
  assert.equal(geo.countryAt(0, -30), null);
});

test("Hoot's photo riddles say how far off a guess is, which way to go, and whether it's warmer", () => {
  const pyramid = WONDERS.find(w => w.id === 'pyramids');
  const fromParis = judge({lat: 48.86, lon: 2.35}, pyramid);
  assert.deepEqual([fromParis.found, fromParis.about, fromParis.way, fromParis.warmer], [false, 3000, 'south-east', null]);
  assert.equal(judge({lat: 35, lon: 25}, pyramid, fromParis.km).warmer, true);
  assert.equal(judge({lat: -30, lon: 25}, pyramid, fromParis.km).way, 'north');
  assert.equal(judge({lat: 30.1, lon: 31.3}, pyramid).found, true);
  // at a pole every way is the same way
  assert.equal(judge({lat: 0, lon: 100}, WONDERS.find(w => w.id === 'south-pole')).way, 'south');
});

test("Hoot's odd one out is never an animal really seen here", () => {
  const animal = id => ({id, name: `animal ${id}`});
  const here = [1, 2, 3, 4, 5].map(animal), far = [3, 4, 9].map(animal);
  for (let i = 0; i < 20; i++) {
    const q = oddOneOut(here, far);
    assert.equal(q.odd.id, 9);
    assert.equal(q.choices.length, 4);
    assert.deepEqual(q.choices.filter(a => a !== q.odd).every(a => here.includes(a)), true);
  }
  assert.equal(oddOneOut(here.slice(0, 2), far), null, 'too few animals here to ask');
  assert.equal(oddOneOut(here, [animal(1)]), null, 'nothing from far away that is not also here');
});

test("every kind of landform in Hoot's notebook can be found on the globe, with a real photo", () => {
  // a name shows once the globe leans in far enough: Natural Earth's zoom 8 is about as close as it goes
  const names = [...geo.places, ...LANDMARKS, ...geo.rivers.map(r => ({...r, kind: 'river'}))].filter(p => p.min <= 8);
  for (const lf of LANDFORMS) {
    const all = names.filter(p => landformOf(p.kind) === lf);
    assert.ok(all.length, `no ${lf.name.toLowerCase()} on the globe`);
    if (lf.id !== 'river') assert.ok(all.some(p => p.wiki), `no ${lf.name.toLowerCase()} with an article`);
  }
  const named = name => landformOf(geo.places.find(p => p.name === name).kind)?.id;
  assert.deepEqual(['Mount Fuji', 'Grand Canyon', 'Lake Victoria', 'Caspian Sea', 'Hudson Bay', 'English Channel', 'Nile Delta', 'Iberian Peninsula'].map(named),
    ['volcano', 'canyon', 'lake', 'lake', 'bay', 'strait', 'delta', 'peninsula']);
  // Natural Earth calls the Punjab's farmland a desert; the notebook doesn't
  assert.equal(named('Punjab'), undefined);
  for (const w of WONDERS) if (w.landform) assert.ok(landformBy(w.landform), `${w.id}: no landform ${w.landform}`);
});

test("Hoot's hand-picked landforms are where he says: on land, in their country, or a fjord on its coast", () => {
  for (const p of LANDMARKS) {
    const lf = landformOf(p.kind);
    assert.ok(lf && p.wiki, p.name);
    // a fjord is finer than the map's coastline, so the map can have it as land or as open sea, but
    // its country is right beside it
    const near = p.kind !== 'fjord' ? [p.at] : [[0, 0], ...[0, 1, 2, 3, 4, 5, 6, 7].map(k => [Math.cos(k*Math.PI/4)*.2, Math.sin(k*Math.PI/4)*.4])].map(([n, e]) => [p.at[0] + n, p.at[1] + e]);
    if (p.country) assert.ok(near.some(at => geo.countryAt(...at)?.name === p.country), `${p.name} is not in ${p.country}`);
    if (p.kind !== 'fjord') assert.ok(!earth.placeAt(...p.at).biome.water, `${p.name} is in the ${earth.placeAt(...p.at).name}`);
  }
  assert.equal(new Set(LANDMARKS.map(p => p.name)).size, LANDMARKS.length);
});

test("Hoot asks what kind of landform it is from three: the right one, and two it isn't", () => {
  for (const lf of LANDFORMS) {
    assert.ok(lf.like.length >= 2 && !lf.like.includes(lf.id), lf.id);
    for (const id of lf.like) assert.ok(landformBy(id), `${lf.id} is like unknown ${id}`);
    for (let i = 0; i < 20; i++) {
      const c = choices(lf);
      assert.equal(c.length, 3); assert.equal(new Set(c).size, 3);
      assert.ok(c.includes(lf) && c.every(o => o === lf || lf.like.includes(o.id)), lf.id);
    }
  }
  // never something it also is: a volcano is a mountain too, and a canyon is a valley
  const offers = (id, other) => landformBy(id).like.includes(other);
  assert.ok(!offers('volcano', 'peak') && !offers('volcano', 'mountains') && !offers('canyon', 'valley') && !offers('bay', 'gulf') && !offers('gulf', 'bay'));
});
