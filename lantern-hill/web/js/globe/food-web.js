// What a food web says, apart from how it is drawn: who eats whom, how far each one is from
// sunlight, and which questions Hoot asks about it. A web is {species: [{name, icon, eats, sometimes}]}:
// what each one usually eats, and what it only sometimes does.

export const eatenBy = (web, name) => web.species.filter(s => s.eats.includes(name)).map(s => s.name);
export const makers = web => web.species.filter(s => !s.eats.length).map(s => s.name);

// rows by steps from sunlight (plants and algae first, each animal one row above the highest thing
// it eats), each ordered so arrows cross as little as they can: every animal sits near the middle of what it eats
export function layout(species){
  const by = new Map(species.map(s => [s.name, s])), level = new Map();
  const lv = s => { if (!level.has(s.name)) level.set(s.name, s.eats.length ? 1 + Math.max(...s.eats.map(f => lv(by.get(f)))) : 0); return level.get(s.name); };
  const rows = [];
  for (const s of species) (rows[lv(s)] = rows[lv(s)] || []).push(s);
  const x = new Map(), place = () => rows.forEach(r => r.forEach((s, i) => x.set(s.name, i - (r.length - 1)/2)));
  place();
  const eaters = s => species.filter(e => e.eats.includes(s.name));
  for (let pass = 0; pass < 3; pass++) {
    for (let k = 1; k < rows.length; k++) { rows[k].sort((a, b) => mean(a.eats.map(f => x.get(f))) - mean(b.eats.map(f => x.get(f)))); place(); }
    rows[0].sort((a, b) => mean(eaters(a).map(e => x.get(e.name))) - mean(eaters(b).map(e => x.get(e.name)))); place();
  }
  return {rows, x};
}
const mean = v => v.length ? v.reduce((a, b) => a + b, 0)/v.length : 0;

// ---------- Hoot's matching game ----------
// A question shows one living thing and a handful of others, and asks which of them it eats, which
// of them eat it, or which make their own food from sunlight. A web can be fifty strong, so only a
// few right answers are shown, among wrong ones that are surely wrong. A web leaves out what an
// animal only sometimes eats, and an animal it doesn't eat here may well be food somewhere, so a
// wrong answer is only ever one it couldn't be: something that eats it, something no lower in the
// web than it (it doesn't hunt its hunters or its rivals), or a plant, for an animal that eats no
// plants. "Who eats it?" turns that round. What it sometimes eats is never wrong: picked, it's a bonus.
const CHOICES = 8, RIGHT = 5;

export function question(web, kind, name, rand = Math.random){
  const {rows} = layout(web.species), level = new Map(rows.flatMap((r, k) => r.map(s => [s.name, k])));
  const by = new Map(web.species.map(s => [s.name, s])), who = name && by.get(name);
  const plant = s => !s.eats.length, often = n => [...by.get(n).eats, ...by.get(n).sometimes];
  let right, wrong;
  if (kind === 'makers') { right = makers(web); wrong = web.species.filter(s => !plant(s)).map(s => s.name); }
  else if (kind === 'eats') {
    const meatOnly = who.eats.every(f => !plant(by.get(f)));
    right = who.eats;
    wrong = web.species.filter(s => s !== who && !often(name).includes(s.name)
      && (plant(s) ? meatOnly : eatenBy(web, name).includes(s.name) || level.get(s.name) >= level.get(name))).map(s => s.name);
  } else {
    right = eatenBy(web, name);
    wrong = web.species.filter(s => s !== who && !right.includes(s.name) && !s.sometimes.includes(name)
      && (plant(s) || level.get(s.name) <= level.get(name))).map(s => s.name);
  }
  // what it sometimes eats (or what sometimes eats it) can be offered too, as a bonus
  const bonus = kind === 'eats' ? who.sometimes : kind === 'eaten' ? web.species.filter(s => s.sometimes.includes(name)).map(s => s.name) : [];
  const shown = pick(right, RIGHT, rand), extra = pick(bonus, 1, rand);
  const choices = pick([...shown, ...extra, ...pick(wrong, CHOICES - shown.length - extra.length, rand)], CHOICES, rand);
  return {kind, who, right: new Set(shown), bonus: new Set(extra), choices: choices.map(n => by.get(n))};
}

// A visit's questions, in no set order: the makers once, then animals with more than one answer, about
// half asked what they eat and half who eats them, no one asked about twice. A question needs two
// wrong answers to be worth asking, which an orca that eats everyone in its sea can't give.
export function questions(web, n = 6, rand = Math.random){
  const fair = q => q.choices.length - q.right.size - q.bonus.size >= 2, out = [question(web, 'makers', null, rand)];
  const eats = pick(web.species.filter(s => s.eats.length > 1), web.species.length, rand).map(s => question(web, 'eats', s.name, rand)).filter(fair);
  const eaten = pick(web.species.filter(s => s.eats.length && eatenBy(web, s.name).length > 1), web.species.length, rand).map(s => question(web, 'eaten', s.name, rand)).filter(fair);
  for (let turn = 0; out.length < n && (eats.length || eaten.length); turn++) {
    const from = turn % 2 ? eaten : eats, q = from.shift() || (turn % 2 ? eats : eaten).shift();
    if (!out.some(o => o.who === q.who)) out.push(q);
  }
  return pick(out, out.length, rand);
}
// k of a list, at random, in a random order
function pick(list, k, rand){
  const l = [...list], out = [];
  while (out.length < k && l.length) out.push(l.splice(Math.floor(rand()*l.length), 1)[0]);
  return out;
}

// one name, or many of them: "fewer jaguars", "fewer fish", "fewer krill & copepods"
const SAME = /(fish|deer|sheep|moose|bison|salmon|trout|cod|char|tuna|mahi|carp|perch|pike|herring|bream|barramundi|halibut|pollock|capelin|smelt|krill|plankton|algae|grass|kelp|caribou|reindeer|elk|squid|shrimp|swine|s)$/i;
const ODD = {mouse: 'mice', goose: 'geese', wolf: 'wolves', ox: 'oxen', louse: 'lice', calf: 'calves', leaf: 'leaves'};
export function plural(s){
  if (s.many || / & /.test(s.name)) return s.name;
  const words = s.name.split(' '), last = words.pop(), low = last.toLowerCase();
  const p = SAME.test(low) ? last : ODD[low] ? last[0] + ODD[low].slice(1) : /[^aeiou]y$/.test(low) ? last.slice(0, -1) + 'ies' : /(x|z|ch|sh)$/.test(low) ? last + 'es' : last + 's';
  return [...words, p].join(' ');
}

// "What if every ___ disappeared?" A plant eater that is also food makes the clearest case, and of
// what it eats and what eats it, Hoot asks about the ones that lean on it most: the food with the
// fewest other eaters (so it would surely grow), and the eater with the fewest other foods.
export function whatIf(web){
  const {rows} = layout(web.species), level = new Map(rows.flatMap((r, k) => r.map(s => [s.name, k])));
  const middle = web.species.filter(s => s.eats.length && eatenBy(web, s.name).length);
  const gone = middle.sort((a, b) => level.get(a.name) - level.get(b.name) || eatenBy(web, b.name).length - eatenBy(web, a.name).length)[0];
  if (!gone) return null;
  const by = new Map(web.species.map(s => [s.name, s]));
  const food = [...gone.eats].sort((a, b) => eatenBy(web, a).length - eatenBy(web, b).length)[0];
  const eater = eatenBy(web, gone.name).sort((a, b) => by.get(a).eats.length - by.get(b).eats.length)[0];
  return {gone, food: by.get(food), eater: by.get(eater)};
}
