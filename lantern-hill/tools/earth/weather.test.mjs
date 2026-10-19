// The weather globe's sense-making: the live reports blended into a map, Hoot's missions judged
// against a spot's real weather, and his "why is it like this?". The reports here are made up, in
// the shape Open-Meteo sends.
//
//   node --test tools/earth/*.test.mjs   (from lantern-hill/)

import assert from 'node:assert/strict';
import test from 'node:test';
import { MISSIONS, feel, makeGrid, missionBy, sky, why } from '../../web/js/earth/weather.js';

const calm = {temperature: 15, feelsLike: 15, rain: 0, snow: 0, clouds: 50, wind: 0, from: 0, day: true, code: 2, elevation: 10};
// the world every 10° (17 rows of latitude, 36 of longitude), the same everywhere but where `at` says
const world = at => Array.from({length: 17*36}, (_, k) => ({...calm, ...at(-80 + Math.floor(k/36)*10, -180 + (k % 36)*10)}));

test('the live map blends between reports, across the date line, and blends winds as arrows', () => {
  const g = makeGrid(world((lat, lon) => lat === 0 && lon === 170 ? {temperature: 30} : lat === 0 && lon === -180 ? {temperature: 20} : {}));
  assert.equal(Math.round(g.at(0, 175).temperature), 25, 'halfway between 170°E and the date line');
  // a north-west wind beside a north-east one: between them, the wind comes from the north, at
  // somewhat less than either's speed, not from the south, as averaging the angles would say
  const w = makeGrid(world((lat, lon) => lat === 0 && lon === 0 ? {wind: 20, from: 315} : lat === 0 && lon === 10 ? {wind: 20, from: 45} : {})).at(0, 5);
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
