// What the player has made and done: their explorer, phonogram stars, trips, books read and best tower.
// The storage keys predate the module split; renaming them orphans existing saves.

const KEYS = {explorer:'lantern-hill-explorer', phonograms:'lantern-hill-phonograms', trips:'lantern-hill-trips',
  books:'lantern-hill-books', towerBest:'lantern-hill-tower-best'};

export function load(slot){ try { return JSON.parse(localStorage.getItem(KEYS[slot]) || 'null'); } catch (e) { return null; } }
export function save(slot, value){ try { localStorage.setItem(KEYS[slot], JSON.stringify(value)); } catch (e) {} }
