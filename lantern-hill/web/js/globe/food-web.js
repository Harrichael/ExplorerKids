// What a food web says, apart from how it is drawn: who eats whom, how far each one is from
// sunlight, and which questions Hoot asks about it. A web is {species: [{name, icon, eats}]}.

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

// The order animals join the web as it's built. Everything they eat is always there before them,
// and next comes whoever eats the newest arrival, so hunters follow close behind their prey and the
// web grows outward instead of filling up one row at a time.
export function arrivals(web){
  const order = layout(web.species).rows.flat(), at = new Map(makers(web).map((n, i) => [n, i])), out = [];
  for (let left = order.filter(s => s.eats.length); left.length; ) {
    const ready = left.filter(s => s.eats.every(f => at.has(f))), newest = s => Math.max(...s.eats.map(f => at.get(f)));
    const next = ready.reduce((a, b) => newest(b) > newest(a) ? b : a);
    at.set(next.name, at.size); out.push(next); left = left.filter(s => s !== next);
  }
  return out;
}

// The animals Hoot asks about as the web is built; the rest walk on by themselves. A few plant
// eaters make an easy start, but they mostly just eat plants, so the questions go to the hunters,
// first the ones with the most on their menu.
export function asked(web){
  const order = arrivals(web), plantEater = s => s.eats.every(f => !order.some(a => a.name === f));
  const most = list => [...list].sort((a, b) => b.eats.length - a.eats.length || order.indexOf(a) - order.indexOf(b));
  const hunters = most(order.filter(s => !plantEater(s))).slice(0, 4);
  const grazers = most(order.filter(plantEater)).slice(0, Math.max(2, 5 - hunters.length));
  return new Set([...grazers, ...hunters].map(s => s.name));
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
