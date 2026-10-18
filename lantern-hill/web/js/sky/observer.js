// Where the treehouse is tonight, and which moment of tonight its telescope shows. Pip's magic can
// whisk the treehouse anywhere in the world; home is Lantern Hill.
//
// Lantern Hill is a little bit magic: it sits at 42° north, at the longitude of the player's own
// time zone, so its tonight is the player's own evening by their clock.

import { load, save } from '../save.js';
import { sunAltitude } from './astro.js';

export const HOME = {name:'Lantern Hill', lat:42, lon:-new Date().getTimezoneOffset()/4, home:true};

export function where(){
  const t = load('travel');
  return t && !t.home && Number.isFinite(t.lat) ? {name:t.name, lat:t.lat, lon:t.lon, home:false} : HOME;
}
export function whisk(place){ save('travel', place.home ? {home:true} : {name:place.name, lat:place.lat, lon:place.lon, home:false}); }

// Dark enough for stars is the Sun 12° below the horizon. Already dark: now. Otherwise the coming
// nightfall, and where night never falls (a polar summer), the darkest moment of the next day.
const DARK = -12, STEP = 10*60000;
export function tonight(place, ms){
  let best = ms, low = Infinity;
  for (let t = ms; t < ms + 86400000; t += STEP) {
    const a = sunAltitude(t, place.lat, place.lon);
    if (a < DARK) return t;
    if (a < low) { low = a; best = t; }
  }
  return best;
}

// the time by the Sun at that spot, near enough to its clocks for a kid
export function localTime(place, ms){
  const h = ((ms/3600000 + place.lon/15) % 24 + 24) % 24, m = Math.floor(h % 1*60);
  return `${(Math.floor(h) + 11) % 12 + 1}:${String(m).padStart(2, '0')} ${h < 12 ? 'am' : 'pm'}`;
}
