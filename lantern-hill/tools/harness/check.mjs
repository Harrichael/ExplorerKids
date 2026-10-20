// Checks the harness itself, and shows how to use it: land on the hotspot island at eight times
// speed, wait out the arrival, walk round the rocks to a classmate, talk, and find the whole visit
// in the picture log.
//
//   node tools/harness/check.mjs http://127.0.0.1:8000/
//
// Exits non-zero if anything fails.

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { harness } from './harness.mjs';

const url = process.argv.find(a => /^https?:/.test(a)) || 'http://127.0.0.1:8000/';
const fails = [], expect = (ok, what) => { console.log((ok ? 'ok    ' : 'FAIL  ') + what); if (!ok) fails.push(what); };

const h = await harness(url, {speed: 8, every: 1, minutes: 5});
try {
  const t0 = Date.now();
  await h.start({trip: 'tectonics', chapter: 'adventure', seed: {pick: 'hotspot'}});
  const why = await h.wait(120);
  let s = await h.state();
  expect(why === 'your turn' && s.control === 'walk', `the explorer gets control after landing (${why}, ${s.control})`);
  expect(s.trip === 'tectonics' && /adventure/.test(s.chapter), `the trip is at the adventure picked (${s.chapter}, ${s.place})`);
  expect(s.heard.some(l => /Sparks/.test(l.who)), `Dr. Sparks was heard on the way in (${s.heard.length} lines)`);
  expect(s.t > (Date.now() - t0)/1000*2, `game time ran faster than life (${s.t} s of game in ${((Date.now() - t0)/1000).toFixed(1)} s)`);

  const kid = s.people.find(p => p.calling) || s.people.find(p => !/Sparks/.test(p.name));
  const walked = await h.talkTo(kid.name);
  expect(walked.startsWith('talking'), `walked ${kid.dist} m to ${kid.name} and talked (${walked})`);
  await h.wait(30);
  s = await h.state();
  expect(s.heard.some(l => l.who === kid.name), `${kid.name} said something`);
  expect(!s.errors.length, 'no page errors' + (s.errors.length ? ': ' + s.errors.join(' | ') : ''));

  const log = readFileSync(join(h.log, 'index.jsonl'), 'utf8').trim().split('\n').map(l => JSON.parse(l));
  expect(log.length > 10 && log.every((f, i) => !i || f.t - log[i - 1].t < 1.2), `${log.length} pictures, about one a second of game time`);
  expect(log.some(f => f.talk && f.talk.startsWith(kid.name)), `a picture of ${kid.name} talking`);
} finally { console.log('pictures in', await h.close()); }
process.exit(fails.length ? 1 : 0);
