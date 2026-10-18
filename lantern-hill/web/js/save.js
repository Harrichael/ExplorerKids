// What the player has made and done: their explorer, phonogram stars, trips, books read and best tower.
// The storage keys predate the module split; renaming them orphans existing saves.
//
// Saves outlive the code that wrote them, and during a rollout tabs on two versions share them:
// - add fields, never repurpose one;
// - a save merges into what is stored, so a field an older tab doesn't know survives that tab's
//   saves (the cost: saving can't remove a field);
// - when a slot's shape must change, bump its VERSION and add a MIGRATE step from the old one.
//   The version rides inside the record as `_v`, which older code reads past harmlessly.
const KEYS = {explorer:'lantern-hill-explorer', phonograms:'lantern-hill-phonograms', trips:'lantern-hill-trips',
  books:'lantern-hill-books', towerBest:'lantern-hill-tower-best'};
const VERSION = {};
const MIGRATE = {};   // slot -> {fromVersion: record => record}

const isRecord = d => !!d && typeof d === 'object' && !Array.isArray(d);
export function load(slot){
  let d = null;
  try { d = JSON.parse(localStorage.getItem(KEYS[slot]) || 'null'); } catch (e) {}
  if (!isRecord(d)) return d;
  for (let v = d._v || 0; v < (VERSION[slot] || 0); v++) d = MIGRATE[slot][v](d);
  delete d._v; return d;
}

export function save(slot, value){
  const stored = load(slot), merged = isRecord(value) && isRecord(stored) ? Object.assign(stored, value) : value;
  if (isRecord(merged) && VERSION[slot]) merged._v = VERSION[slot];
  try { localStorage.setItem(KEYS[slot], JSON.stringify(merged)); } catch (e) {}
}
