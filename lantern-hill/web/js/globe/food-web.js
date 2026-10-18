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

// the hunter to guess the menu of: as far up the web as there is one that eats more than one thing
export function hunter(web){
  const {rows} = layout(web.species);
  for (let k = rows.length - 1; k > 0; k--) {
    const pick = rows[k].filter(s => s.eats.length > 1).sort((a, b) => b.eats.length - a.eats.length)[0];
    if (pick) return pick;
  }
  return null;
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
