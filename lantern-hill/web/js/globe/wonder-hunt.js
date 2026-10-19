// How Hoot judges a guess at where a wonder is: found if it's near enough, and if not, how far off it
// is, which way to go, and whether it's warmer or colder than the guess before.

import { arc } from '../earth/model.js';

const WAYS = ['north', 'north-east', 'east', 'south-east', 'south', 'south-west', 'west', 'north-west'];
const RAD = Math.PI/180;

// the compass heading to set off on, from a to b, the short way round the globe
export function way(lat1, lon1, lat2, lon2){
  const y = Math.sin((lon2 - lon1)*RAD)*Math.cos(lat2*RAD);
  const x = Math.cos(lat1*RAD)*Math.sin(lat2*RAD) - Math.sin(lat1*RAD)*Math.cos(lat2*RAD)*Math.cos((lon2 - lon1)*RAD);
  const deg = (Math.atan2(y, x)/RAD + 360) % 360;
  return WAYS[Math.round(deg/45) % 8];
}

// km is rounded to something a child can hold in their head: 9,000, not 8,943
export function judge(guess, wonder, lastKm = null){
  const km = arc(guess.lat, guess.lon, ...wonder.at);
  if (km <= wonder.r) return {found: true, km};
  const round = km < 1000 ? Math.round(km/50)*50 : Math.round(km/500)*500;
  // at the poles every way is the same way, so only the distance helps
  const pole = Math.abs(wonder.at[0]) === 90 ? (wonder.at[0] > 0 ? 'north' : 'south') : null;
  return {found: false, km, about: Math.max(50, round), way: pole || way(guess.lat, guess.lon, ...wonder.at), warmer: lastKm == null ? null : km < lastKm};
}
