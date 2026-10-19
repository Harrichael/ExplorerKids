// The garden's rules played out over hours of play: what a kid would see if they planted, watered,
// played on and came back to the bed. Each test starts a fresh garden, its clock at zero, in a season.
//   node --test tools/garden/*.test.mjs   (from lantern-hill/)

import assert from 'node:assert/strict';
import { test } from 'node:test';
import { CROP } from '../../web/js/garden/crops.js';
import { COLS, WET_HOURS, advance, growth, harvest, newGarden, nextUnlock, picked, plant, ripe, season, thirsty, unlocked, water } from '../../web/js/garden/grow.js';

const H = 3600000;
// plots by row (0 is the back) and column
const at = (r, c) => r*COLS + c;
const sown = (s, ...picks) => { const g = newGarden(); g.season = s; advance(g, 0); g.picked = Object.assign({}, ...picks); return g; };
const plantAndWater = (g, i, id, t) => { assert.ok(plant(g, i, id, t), `planted ${id}`); water(g, i, t); };
const near = (a, b) => assert.ok(Math.abs(a - b) < 1e-9, `${a} is not ${b}`);

test('a watered radish is ready after its time; a dry one waits, and never dies', () => {
  const g = sown('autumn'), ready = CROP.radish.hours*H;
  plantAndWater(g, at(2, 0), 'radish', 0);
  plant(g, at(2, 1), 'radish', 0);
  advance(g, ready);
  assert.ok(ripe(g.plots[at(2, 0)]));
  assert.equal(growth(g.plots[at(2, 1)]), 0);
  assert.ok(thirsty(g.plots[at(2, 1)], ready));
  advance(g, 300*H);
  assert.equal(g.plots[at(2, 1)].crop, 'radish');
  assert.deepEqual(harvest(g, at(2, 0), 300*H), {crop:CROP.radish, n:1, bees:false});
  assert.equal(g.plots[at(2, 0)].crop, null);
});

test('one watering lasts a while; then the plant stops until it is watered again', () => {
  const g = sown('autumn', {radish:45});
  assert.ok(CROP.garlic.hours > WET_HOURS);
  plantAndWater(g, at(1, 1), 'garlic', 0);
  advance(g, 50*H);
  near(growth(g.plots[at(1, 1)]), WET_HOURS/CROP.garlic.hours);
  assert.ok(thirsty(g.plots[at(1, 1)], 50*H));
  water(g, at(1, 1), 50*H);
  advance(g, 50*H + WET_HOURS*H);
  near(growth(g.plots[at(1, 1)]), 2*WET_HOURS/CROP.garlic.hours);
});

test('out of season a plant grows slowly; sunflowers are for summer', () => {
  assert.equal(season(Date.UTC(2026, 6, 10, 18)), 'summer'); assert.equal(season(Date.UTC(2026, 9, 10, 18)), 'autumn');
  const inSeason = sown('summer'), late = sown('autumn'), half = CROP.sunflower.hours/2*H;
  for (const g of [inSeason, late]) { plantAndWater(g, at(0, 0), 'sunflower', 0); advance(g, half); }
  assert.equal(growth(inSeason.plots[at(0, 0)]), .5);
  assert.ok(growth(late.plots[at(0, 0)]) < .25);
});

test('a tall sunflower shades the sun-lover behind it, but lettuce does not mind', () => {
  const g = sown('summer');
  plantAndWater(g, at(2, 0), 'sunflower', 0);
  plantAndWater(g, at(2, 4), 'sunflower', 0);
  const t = CROP.sunflower.hours/2*H;                              // half grown: tall enough to cast shade
  for (const i of [at(2, 0), at(2, 4)]) water(g, i, t);
  plantAndWater(g, at(1, 0), 'beans', t);                          // behind a sunflower
  plantAndWater(g, at(1, 2), 'beans', t);                          // in the open
  plantAndWater(g, at(1, 4), 'lettuce', t);                        // behind the other
  const later = CROP.beans.hours/2;
  advance(g, t + later*H);
  assert.equal(growth(g.plots[at(1, 2)]), .5);
  assert.equal(growth(g.plots[at(1, 0)]), .25);
  // lettuce is out of season in summer, which slows it, but the shade costs it nothing more
  near(growth(g.plots[at(1, 4)]), .4*later/CROP.lettuce.hours);
});

test('beans feed their neighbours, and flowers bring bees that double the strawberries', () => {
  const g = sown('summer', {radish:20});
  plantAndWater(g, at(1, 1), 'beans', 0);
  plantAndWater(g, at(1, 2), 'carrot', 0);                         // next to the beans
  plantAndWater(g, at(0, 4), 'carrot', 0);                         // far from them
  advance(g, CROP.carrot.hours/2*H);
  assert.ok(growth(g.plots[at(1, 2)]) > growth(g.plots[at(0, 4)]));

  const b = sown('summer', {radish:20}), later = CROP.strawberry.hours*H;
  plantAndWater(b, at(2, 0), 'marigold', 0);
  plantAndWater(b, at(2, 1), 'strawberry', 0);
  plantAndWater(b, at(2, 4), 'strawberry', 0);
  water(b, at(2, 1), later/2); water(b, at(2, 4), later/2);
  const helped = harvest(b, at(2, 1), later), alone = harvest(b, at(2, 4), later);
  assert.equal(helped.n, 2); assert.ok(helped.bees);
  assert.equal(alone.n, 1);
  // a strawberry plant stays and fruits again
  assert.equal(b.plots[at(2, 4)].crop, 'strawberry');
  assert.ok(growth(b.plots[at(2, 4)]) > .5 && !ripe(b.plots[at(2, 4)]));
});

test('every harvest counts toward the next seeds, from five to start up to the pumpkin', () => {
  const g = sown('autumn');
  assert.deepEqual(unlocked(g).map(c => c.id), ['radish', 'lettuce', 'sunflower', 'beans', 'kale']);
  assert.equal(plant(g, 0, 'carrot', 0), false);
  for (let k = 0; k < 3; k++) { plantAndWater(g, k, 'radish', 0); }
  advance(g, H);
  for (let k = 0; k < 3; k++) harvest(g, k, H);
  assert.equal(picked(g), 3);
  assert.ok(plant(g, 0, 'carrot', H));
  assert.equal(nextUnlock(g).id, 'marigold');
  g.picked.radish = 1000;
  assert.equal(nextUnlock(g), null);
});
