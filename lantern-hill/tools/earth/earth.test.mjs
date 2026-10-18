// The world model against places a child might tap, Hoot's riddles against the map, and the food
// webs against the rules every web must keep. Runs on the built data:
//   node --test tools/earth/*.test.mjs   (from lantern-hill/)

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { BIOMES, WEBS, visit } from '../../web/js/earth/biomes.js';
import { makeEarth } from '../../web/js/earth/model.js';
import { eatenBy, hunter, whatIf } from '../../web/js/globe/food-web.js';

const earth = makeEarth(JSON.parse(readFileSync(new URL('../../web/data/earth.json', import.meta.url), 'utf8')));

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
