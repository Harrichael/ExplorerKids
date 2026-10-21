// Checks the harness itself, and shows how to use it: land on the hotspot island at eight times
// speed, wait out the arrival, walk round the rocks to a classmate, talk, log pictures closer
// together for a while, and find the whole visit in the picture log. Then put Mo inside the parked
// bus on purpose, to see the clip log catch it.
//
//   node tools/harness/check.mjs http://127.0.0.1:8000/
//
// Exits non-zero if anything fails.

import { existsSync, readFileSync } from 'node:fs';
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
  const closer = (await h.state()).t;
  await h.pace({every: .25});
  await h.wait(30);
  s = await h.state();
  expect(s.heard.some(l => l.who === kid.name), `${kid.name} said something`);
  expect(!s.errors.length, 'no page errors' + (s.errors.length ? ': ' + s.errors.join(' | ') : ''));
  expect(!s.clips.length, 'nobody stood inside anything solid' + (s.clips.length ? ': ' + s.clips.map(c => `${c.who} at t ${c.t}`).join(', ') : ''));

  await h.pace({every: 1});
  await h.eval(`import(document.baseURI + 'js/state.js').then(({game}) => { const w = game.world, area = c => (c.maxX - c.minX)*(c.maxZ - c.minZ);
    const c = w.colliders.reduce((a, b) => area(b) > area(a) ? b : a), mo = w.npcs.find(n => n.name === 'Mo'); mo.goal = null; mo.x = (c.minX + c.maxX)/2; mo.z = (c.minZ + c.maxZ)/2; mo.model.root.position.set(mo.x, mo.y, mo.z); })`);
  // wait() comes straight back if a question is up, so give the game a real second to see him
  await new Promise(ok => setTimeout(ok, 1000));
  s = await h.state();
  expect(s.clips.some(c => c.who === 'Mo'), `Mo, moved into the biggest solid box, is caught there (${s.clips.map(c => c.who).join(', ') || 'nobody'})`);

  const log = readFileSync(join(h.log, 'index.jsonl'), 'utf8').trim().split('\n').map(l => JSON.parse(l)), gap = (f, i) => i && f.t - log[i - 1].t;
  expect(log.length > 10 && log.every((f, i) => !i || f.t <= closer || gap(f, i) < 1.2), `${log.length} pictures, about one a second of game time`);
  expect(log.filter((f, i) => f.t > closer + .5 && gap(f, i) < .3).length > 8, `pictures four times closer after pace --every .25`);
  expect(log.some(f => f.talk && f.talk.startsWith(kid.name)), `a picture of ${kid.name} talking`);
  expect(log.every(f => f.shot && f.cam.length === 3) && log.some(f => f.shot === 'follow'), `each picture says which camera shot it (${[...new Set(log.map(f => f.shot))].join(', ')})`);
} finally { console.log('pictures in', await h.close()); }
expect(existsSync(join(h.log, 'sheets', 's0001.jpg')), 'labelled contact sheets were made');
process.exit(fails.length ? 1 : 0);
