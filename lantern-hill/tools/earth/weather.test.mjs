// The weather globe's sense-making: the live reports blended into a map, Hoot's missions judged
// against a spot's real weather, his "why is it like this?", the kind of cloud overhead, and the jet
// stream's pull on a plane. The reports here are made up, in the shape Open-Meteo sends.
//
//   node --test tools/earth/*.test.mjs   (from lantern-hill/)

import assert from 'node:assert/strict';
import test from 'node:test';
import { CRUISE, GRID, MISSIONS, RACES, cloudKind, feel, flightHours, makeGrid, missionBy, sky, westerly, why } from '../../web/js/earth/weather.js';

const calm = {temperature: 15, feelsLike: 15, rain: 0, snow: 0, clouds: 50, wind: 0, from: 0, jet: 0, jetFrom: 0, day: true, code: 2, elevation: 10};
// the world as the live map asks for it, the same everywhere but where `at` says
const world = at => Array.from({length: GRID.lats*GRID.lons}, (_, k) => ({...calm, ...at(GRID.south + Math.floor(k/GRID.lons)*GRID.step, -180 + (k % GRID.lons)*GRID.step)}));

test('the live map blends between reports, across the date line, and blends winds as arrows', () => {
  const g = makeGrid(world((lat, lon) => lat === 0 && lon === 165 ? {temperature: 30} : lat === 0 && lon === -180 ? {temperature: 20} : {}));
  assert.equal(Math.round(g.at(0, 172.5).temperature), 25, 'halfway between 165°E and the date line');
  // a north-west wind beside a north-east one: between them, the wind comes from the north, at
  // somewhat less than either's speed, not from the south, as averaging the angles would say
  const w = makeGrid(world((lat, lon) => lat === 0 && lon === 0 ? {wind: 20, from: 315} : lat === 0 && lon === 15 ? {wind: 20, from: 45} : {})).at(0, 7.5);
  assert.ok(w.north < -10 && Math.abs(w.east) < 1e-9, `blowing south: ${w.east}, ${w.north}`);
});

test("Hoot's missions are judged by the real weather where the explorer tapped", () => {
  const snowing = {...calm, temperature: -3, snow: .4, code: 73}, night = {...calm, day: false}, gale = {...calm, wind: 55};
  assert.ok(missionBy('snow').ok(snowing) && missionBy('freezing').ok(snowing) && !missionBy('rain').ok(snowing));
  assert.ok(missionBy('night').ok(night) && !missionBy('night').ok(calm));
  assert.ok(missionBy('windy').ok(gale) && !missionBy('windy').ok(calm));
  assert.equal(sky(night).icon, '☁️'); assert.equal(sky({...night, code: 0}).icon, '🌙');
  assert.equal(feel(-3).id, 'freezing'); assert.equal(feel(31).id, 'hot');
  for (const m of MISSIONS) assert.ok(m.ask && m.think && m.hint && m.learn, m.id);
});

test('why it is hot or cold: the sun first, then height and the night', () => {
  const quito = why({...calm, elevation: 2850, day: false}, -.2, 0);
  assert.match(quito[0], /tropics/); assert.match(quito[1], /2,850 metres/); assert.match(quito[2], /night/);
  // July is winter south of the equator, summer north of it
  assert.match(why(calm, -34, 6)[0], /winter in the southern/);
  assert.match(why(calm, 48, 6)[0], /summer in the northern/);
  assert.match(why(calm, 48, 9)[0], /autumn/);
});

test('the kind of cloud overhead, from how much sky each layer covers', () => {
  const sky = (low, mid, high, more = {}) => cloudKind({...calm, layers: {low, mid, high}, ...more})?.id;
  assert.equal(sky(30, 0, 0), 'cumulus', 'a few low heaps');
  assert.equal(sky(95, 10, 0), 'stratus', 'a low grey blanket');
  assert.equal(sky(40, 0, 0, {code: 45}), 'stratus', 'fog is stratus on the ground');
  assert.equal(sky(5, 0, 60), 'cirrus');
  assert.equal(sky(10, 70, 20), 'altostratus');
  assert.equal(sky(60, 60, 60, {code: 95}), 'cumulonimbus', 'thunder means a thunderstorm cloud');
  assert.equal(sky(5, 0, 5), undefined, 'a clear sky has none');
});

test('the jet stream speeds a plane flying east and slows one flying west', () => {
  const jet = makeGrid(world(lat => lat >= 30 && lat <= 60 ? {jet: 180, jetFrom: 270} : {}));
  const {a, b} = RACES[0], east = flightHours(jet, a.at, b.at), west = flightHours(jet, b.at, a.at);
  assert.ok(east < 6.5 && west > 7.5, `New York to London ${east.toFixed(2)} h, back ${west.toFixed(2)} h`);
  const still = makeGrid(world(() => ({}))), there = flightHours(still, a.at, b.at);
  assert.ok(Math.abs(there - 5570/CRUISE) < .1, 'with no wind, it takes as long as the distance at cruising speed');
  assert.ok(westerly(jet, 30, 60, true) > 150 && Math.abs(westerly(jet, 30, 60)) < 1e-9, 'the wind up high, not on the ground');
});
