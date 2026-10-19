// The Moon and planets against JPL Horizons: where each one is among the stars, how far away, and
// which face of it looks back at the Earth, at 03:00 UT on 18 October 2026 (an evening in Utah).
// Runs with:  node --test tools/sky/*.test.mjs   (from lantern-hill/)

import assert from 'node:assert/strict';
import { test } from 'node:test';
import { AU, LIGHT, geocentric, radec } from '../../web/js/sky/astro.js';
import { BODIES, axes, sight, underneath } from '../../web/js/sky/bodies.js';

const WHEN = Date.UTC(2026, 9, 18, 3);
// Horizons, seen from the Earth's centre: RA and Dec (J2000), distance in AU, and the point on the
// body straight under the Earth, in east longitude
const HORIZONS = {
  moon: [290.40414, -25.3807, .0026993, 4.219, -1.914],
  mercury: [225.05519, -20.37093, .8997946, 3.129, -245.929],
  venus: [209.04739, -19.66813, .2798307, 8.529, 328.782],
  mars: [133.80911, 18.74848, 1.5415681, 18.507, -275.869],
  jupiter: [144.63439, 14.76711, 5.701335, -.047, -142.556],
  saturn: [10.13118, 1.4166, 8.4624675, -8.562, -116.488],
  uranus: [62.82564, 20.93311, 18.668238, 75.731, 333.281],
  neptune: [2.42106, -.4972, 28.953985, -19.721, -331.455]
};
const turn = d => ((d % 360) + 540) % 360 - 180;

test('every body is where JPL puts it, to within a tenth of a degree', () => {
  for (const [id, [ra, dec, au]] of Object.entries(HORIZONS)) {
    const v = geocentric(id, WHEN), at = radec(v);
    assert.ok(Math.abs(turn(at.ra - ra))*Math.cos(dec*Math.PI/180) < .1 && Math.abs(at.dec - dec) < .1, `${id} at ${at.ra}, ${at.dec}`);
    assert.ok(Math.abs(Math.hypot(...v)/AU/au - 1) < .002, `${id} distance`);
  }
});

test('each world turns the same face to the Earth that it really does', () => {
  for (const [id, [, , , lat, lon]] of Object.entries(HORIZONS)) {
    const v = geocentric(id, WHEN), late = Math.hypot(...v)/LIGHT*1000;
    const under = underneath(axes(BODIES[id], WHEN - late), v.map(x => -x));
    // gas giants' longitudes count by their deep spin; a few degrees is a sliver of their face
    assert.ok(Math.abs(under.lat - lat) < 3, `${id} latitude ${under.lat} vs ${lat}`);
    assert.ok(Math.abs(turn(under.lon - lon)) < 4, `${id} longitude ${under.lon} vs ${lon}`);
  }
});

// Horizons again, same moment: Io, Europa, Ganymede and Callisto among the stars
const MOONS_AT = {io: [144.634692685, 14.767006965], europa: [144.651351629, 14.760436818],
  ganymede: [144.675062197, 14.751921603], callisto: [144.75662032, 14.722093521]};
const JUPITER_AT = [144.634388624, 14.767111633];

test('Jupiter’s four big moons sit where JPL puts them beside Jupiter', () => {
  const place = {lat: 0, lon: 0}, jupiter = sight(BODIES.jupiter, WHEN, place);
  // measured from Jupiter, so a small slip in Jupiter's own place doesn't count against the moons
  const off = (at, from) => [turn(at[0] - from[0])*Math.cos(from[1]*Math.PI/180)*3600, (at[1] - from[1])*3600];
  for (const [id, at] of Object.entries(MOONS_AT)) {
    const m = sight(BODIES[id], WHEN, place), [ex, ey] = off(at, JUPITER_AT), [gx, gy] = off([m.ra, m.dec], [jupiter.ra, jupiter.dec]);
    // a third of Jupiter's radius, about 6 arcseconds
    assert.ok(Math.hypot(gx - ex, gy - ey) < 6, `${id} is ${Math.hypot(gx - ex, gy - ey).toFixed(1)}" off`);
  }
});
