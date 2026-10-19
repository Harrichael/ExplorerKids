// How Hoot asks what kind of landform a place is: the right one and two it could be mistaken for,
// in a random order.

import { landformBy } from '../earth/landforms.js';

export function choices(landform, rand = Math.random){
  const others = [...landform.like], picked = [landform];
  while (picked.length < 3 && others.length) picked.push(landformBy(others.splice(Math.floor(rand()*others.length), 1)[0]));
  for (let i = picked.length - 1; i > 0; i--) { const j = Math.floor(rand()*(i + 1)); [picked[i], picked[j]] = [picked[j], picked[i]]; }
  return picked;
}
