// The Explorer Check's draw, told as stories about explorers who did different things on the trip.
// From lantern-hill/:  node tools/quiz-check.mjs
import { readFileSync } from 'node:fs';
import assert from 'node:assert/strict';

const dir = new URL('../web/js/trips/tectonics/', import.meta.url);
const { quiz } = await import(new URL('quiz.js', dir));
const join = (d, f) => new URL(f, d);

let seed = 7; const rnd = () => (seed = (seed*16807) % 2147483647)/2147483647;
const PLACES = ['rim', 'mantle', 'ridge', 'crash', 'slide'];
const isKey = q => !q.secret;
const draws = (found, n = 2000) => Array.from({length:n}, () => quiz.questions(found, rnd));
const test = (name, f) => { f(); console.log('ok -', name); };

test('an explorer who only did the required path gets eight different key questions', () => {
  for (const d of draws(PLACES, 300)) {
    assert.equal(d.length, 8);
    assert.equal(new Set(d.map(q => q.q)).size, 8);
    assert.ok(d.every(isKey));
    // the magma and lava questions teach one idea; never both in one check
    assert.ok(!(d.some(q => /still deep under the ground/.test(q.q)) && d.some(q => /OUT of a volcano/.test(q.q))));
  }
});

test('a curio looked at unlocks its question; one never looked at stays locked', () => {
  const found = [...PLACES, 'ridge:Fuzzy crabs'], all = draws(found).flat();
  assert.ok(all.some(q => /Yeti crabs/.test(q.q)));
  assert.ok(!all.some(q => /Sea pigs/.test(q.q)));
  assert.ok(all.filter(q => q.secret).every(q => /Yeti crabs/.test(q.q)));
});

test('a "Tell me more" heard and a find seen both count, from the classmates the trip kept', () => {
  const cls = names => ({seen: () => names});
  const shared = {places:[cls(['row', 'Shiny black rock']), cls(['goggles']), cls(['pebble']), cls(['rug']), cls(['quake'])]};
  const keys = quiz.found(shared, new Set(["Want to hear something amazing about this crack?", "Some other question"]));
  assert.deepEqual(keys, ['rim', 'rim:row', 'rim:Shiny black rock', 'mantle', 'mantle:goggles', 'ridge', 'ridge:pebble', 'crash', 'crash:rug', 'slide', 'slide:quake', 'talk:iceland']);
  const all = draws(keys).flat();
  for (const re of [/shiny black rock/, /comes up out of the sea/, /picnic rug/]) assert.ok(all.some(q => re.test(q.q)), re);
});

test('key questions dominate, but a wanderer still gets a couple of minor ones', () => {
  const everything = [...PLACES, ...quiz.bank.flatMap(q => q.need || [])];
  const minors = draws(everything).map(d => d.filter(q => q.secret).length), avg = minors.reduce((a, b) => a + b)/minors.length;
  console.log(`   with everything unlocked: ${avg.toFixed(2)} minor questions a check`);
  assert.ok(avg > 1.5 && avg <= 3);
  const some = [...PLACES, 'rim:pumice', 'mantle:putty', 'ridge:smoker', 'crash:rug', 'slide:creek', 'slide:trees'];
  const few = draws(some).map(d => d.filter(q => q.secret).length), avg2 = few.reduce((a, b) => a + b)/few.length;
  console.log(`   with six unlocked: ${avg2.toFixed(2)}`);
  assert.ok(avg2 > .5 && avg2 < 2.5);
});

test('replays feel different: two checks in a row rarely ask the same eight, in the same order', () => {
  const d = draws(PLACES, 200).map(d => d.map(q => q.q).join('|'));
  assert.ok(new Set(d).size > 190);
});

test('an explorer who took the island fork is asked about the island, never the sliding hills; a replay down the other fork adds them', () => {
  const cls = names => ({seen: () => names});
  const shared = {places:[cls([]), cls([]), cls([]), cls(['rug']), , cls(['chain', 'swell', 'Green sand'])]};
  const island = quiz.found(shared);
  assert.ok(island.includes('hotspot') && island.includes('hotspot:Green sand') && !island.some(k => k.startsWith('slide')));
  const only = at => new Set(quiz.bank.filter(q => q.key ? q.at.every(a => a === at) : q.need.every(n => n.startsWith(at + ':'))).map(q => q.q));
  const slideQs = only('slide'), islandQs = only('hotspot');
  const first = draws(island).flat();
  assert.ok(first.some(q => islandQs.has(q.q)) && !first.some(q => slideQs.has(q.q)));
  assert.ok(first.some(q => /green sand/.test(q.q)));
  // the saved pool is the union of every trip's keys, so the replay's slide keys join the island's
  const both = [...new Set([...island, ...quiz.found({places:[cls([]), cls([]), cls([]), cls([]), cls(['quake'])]})])];
  const after = draws(both).flat();
  assert.ok(after.some(q => slideQs.has(q.q)) && after.some(q => islandQs.has(q.q)));
});

test('a place never visited asks nothing about it', () => {
  for (const d of draws(['rim', 'rim:pumice', 'slide:creek'], 200)) {
    assert.ok(d.length < 8);
    assert.ok(d.every(q => !/mantle|ridge/i.test(q.q)));
  }
});

test('an old save with no finds kept draws as if every place was visited', () => {
  const d = quiz.questions(undefined, rnd);
  assert.equal(d.length, 8); assert.ok(d.every(isKey));
});

test('every unlock names a real find or curio in its place', () => {
  const FILE = {rim:'rim.js', mantle:'mantle.js', ridge:'ridge.js', crash:'valley.js', slide:'fault.js', hotspot:'hotspot.js'};
  for (const need of quiz.bank.flatMap(q => q.need || [])) {
    const [at, name] = need.split(/:(.*)/);
    if (at === 'talk') continue;
    const src = readFileSync(join(dir, FILE[at]), 'utf8');
    assert.ok(src.includes(`name:'${name}'`) || src.includes(`curio('${name}'`), need);
  }
});

test('the bank: 30+ questions, three or fewer answers each, and every hint and yay filled in', () => {
  const keys = quiz.bank.filter(q => q.key).length;
  console.log(`   ${quiz.bank.length} questions: ${keys} key, ${quiz.bank.length - keys} minor`);
  assert.ok(quiz.bank.length >= 30);
  for (const q of quiz.bank) { assert.ok(q.answers.length >= 2 && q.answers.length <= 3, q.q); assert.ok(q.hint && q.yay, q.q);
    for (const [label, draw] of q.answers) { assert.equal(typeof draw, 'function', label); assert.ok(label.length <= 40, label); } }
});
