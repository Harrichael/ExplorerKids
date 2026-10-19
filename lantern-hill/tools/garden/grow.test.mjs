// The garden's rules played out over days of real time: what a kid would see if they planted,
// watered, wandered off and came back. Each test starts a fresh garden at a fixed moment.
//   node --test tools/garden/*.test.mjs   (from lantern-hill/)

import assert from 'node:assert/strict';
import { test } from 'node:test';
import { CROP } from '../../web/js/garden/crops.js';
import { COLS, WET_HOURS, advance, growth, harvest, newGarden, nextUnlock, picked, plant, ripe, season, thirsty, unlocked, water } from '../../web/js/garden/grow.js';

const H = 3600000;
const SUMMER = Date.UTC(2026, 6, 10, 18), AUTUMN = Date.UTC(2026, 9, 10, 18);
// plots by row (0 is the back) and column
const at = (r, c) => r*COLS + c;
const sown = (when, ...picks) => { const g = newGarden(); advance(g, when); g.picked = Object.assign({}, ...picks); return g; };
const plantAndWater = (g, i, id, t) => { assert.ok(plant(g, i, id, t), `planted ${id}`); water(g, i, t); };

test('a watered radish is ready in an hour and a half; a dry one waits, and never dies', () => {
  const g = sown(AUTUMN);
  plantAndWater(g, at(2, 0), 'radish', AUTUMN);
  plant(g, at(2, 1), 'radish', AUTUMN);
  advance(g, AUTUMN + 1.5*H);
  assert.ok(ripe(g.plots[at(2, 0)]));
  assert.equal(growth(g.plots[at(2, 1)]), 0);
  assert.ok(thirsty(g.plots[at(2, 1)], AUTUMN + 1.5*H));
  advance(g, AUTUMN + 30*24*H);
  assert.equal(g.plots[at(2, 1)].crop, 'radish');
  assert.deepEqual(harvest(g, at(2, 0), AUTUMN + 30*24*H), {crop:CROP.radish, n:1, bees:false});
  assert.equal(g.plots[at(2, 0)].crop, null);
});

test('one watering lasts a while; then the plant stops until it is watered again', () => {
  const g = sown(AUTUMN);
  plantAndWater(g, at(1, 1), 'kale', AUTUMN);                     // 6 hours of growing
  advance(g, AUTUMN + 2*24*H);
  assert.equal(growth(g.plots[at(1, 1)]), Math.min(1, WET_HOURS/6));
  const g2 = sown(AUTUMN, {radish:3});
  plantAndWater(g2, at(1, 1), 'carrot', AUTUMN);                   // 6 hours, and only half done after a day dry
  advance(g2, AUTUMN + 3*H);
  assert.equal(growth(g2.plots[at(1, 1)]), .5);
  advance(g2, AUTUMN + 24*H);
  assert.equal(growth(g2.plots[at(1, 1)]), 1);
});

test('out of season a plant grows slowly; sunflowers are for summer', () => {
  assert.equal(season(SUMMER), 'summer'); assert.equal(season(AUTUMN), 'autumn');
  const inSeason = sown(SUMMER), late = sown(AUTUMN);
  for (const [g, t] of [[inSeason, SUMMER], [late, AUTUMN]]) { plantAndWater(g, at(0, 0), 'sunflower', t); advance(g, t + 5*H); }
  assert.equal(growth(inSeason.plots[at(0, 0)]), .5);
  assert.ok(growth(late.plots[at(0, 0)]) < .25);
});

test('a tall sunflower shades the sun-lover behind it, but lettuce does not mind', () => {
  const g = sown(SUMMER);
  plantAndWater(g, at(2, 0), 'sunflower', SUMMER);
  plantAndWater(g, at(2, 4), 'sunflower', SUMMER);
  const t = SUMMER + 5*H;                                          // half grown: tall enough to cast shade
  for (const i of [at(2, 0), at(2, 4)]) water(g, i, t);
  plantAndWater(g, at(1, 0), 'beans', t);                          // behind a sunflower
  plantAndWater(g, at(1, 2), 'beans', t);                          // in the open
  plantAndWater(g, at(1, 4), 'lettuce', t);                        // behind the other
  advance(g, t + 3*H);
  assert.equal(growth(g.plots[at(1, 2)]), .5);
  assert.equal(growth(g.plots[at(1, 0)]), .25);
  // lettuce is out of season in summer, which slows it, but the shade costs it nothing more
  assert.ok(Math.abs(growth(g.plots[at(1, 4)]) - .4) < 1e-9);
});

test('beans feed their neighbours, and flowers bring bees that double the strawberries', () => {
  const g = sown(SUMMER, {radish:20});
  plantAndWater(g, at(1, 1), 'beans', SUMMER);
  plantAndWater(g, at(1, 2), 'carrot', SUMMER);                    // next to the beans
  plantAndWater(g, at(0, 4), 'carrot', SUMMER);                    // far from them
  advance(g, SUMMER + 3*H);
  assert.ok(growth(g.plots[at(1, 2)]) > growth(g.plots[at(0, 4)]));

  const b = sown(SUMMER, {radish:20});
  plantAndWater(b, at(2, 0), 'marigold', SUMMER);
  plantAndWater(b, at(2, 1), 'strawberry', SUMMER);
  plantAndWater(b, at(2, 4), 'strawberry', SUMMER);
  const later = SUMMER + 8*H; water(b, at(2, 1), SUMMER + 7*H); water(b, at(2, 4), SUMMER + 7*H);
  const helped = harvest(b, at(2, 1), later), alone = harvest(b, at(2, 4), later);
  assert.equal(helped.n, 2); assert.ok(helped.bees);
  assert.equal(alone.n, 1);
  // a strawberry plant stays and fruits again
  assert.equal(b.plots[at(2, 4)].crop, 'strawberry');
  assert.ok(growth(b.plots[at(2, 4)]) > .5 && !ripe(b.plots[at(2, 4)]));
});

test('every harvest counts toward the next seeds, from five to start up to the pumpkin', () => {
  const g = sown(AUTUMN);
  assert.deepEqual(unlocked(g).map(c => c.id), ['radish', 'lettuce', 'sunflower', 'beans', 'kale']);
  assert.equal(plant(g, 0, 'carrot', AUTUMN), false);
  for (let k = 0; k < 3; k++) { plantAndWater(g, k, 'radish', AUTUMN); }
  advance(g, AUTUMN + 2*H);
  for (let k = 0; k < 3; k++) harvest(g, k, AUTUMN + 2*H);
  assert.equal(picked(g), 3);
  assert.ok(plant(g, 0, 'carrot', AUTUMN + 2*H));
  assert.equal(nextUnlock(g).id, 'marigold');
  g.picked.radish = 1000;
  assert.equal(nextUnlock(g), null);
});

