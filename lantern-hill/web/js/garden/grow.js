// How the garden changes with time and care: the rules, kept apart from how it looks so they can
// be tried over a week of growing in a moment. Every change takes the time it happens at.
//
// The garden grows in real time, even with the game closed: a plant grows while its soil is damp,
// and one watering keeps the soil damp for WET_HOURS. Dry plants wait for water; nothing ever dies.
// The bed is COLS wide and ROWS deep, and row 0 is the back, on the north side.

import { HOME } from '../sky/observer.js';
import { CROP, CROPS } from './crops.js';

export const COLS = 5, ROWS = 3, WET_HOURS = 8;
const H = 3600000;
const OUT_OF_SEASON = .4, SHADED = .5, FED = 1.3, REGROW = .65;
// a neighbour counts once it's big enough to: tall enough to cast shade, or in flower for the bees
const SHADES_AT = .4, BLOOMS_AT = .6;

export function newGarden(){
  return {plots:Array.from({length:COLS*ROWS}, () => ({crop:null, h:0, wet:0})), at:null, picked:{}, told:{}, secrets:{}};
}

const SEASONS = ['winter', 'winter', 'spring', 'spring', 'spring', 'summer', 'summer', 'summer', 'autumn', 'autumn', 'autumn', 'winter'];
export const season = ms => SEASONS[+new Date(ms).toLocaleString('en-US', {timeZone:HOME.zone, month:'numeric'}) - 1];
export const inSeason = (crop, ms) => crop.seasons.includes(season(ms));

export const growth = p => p.crop ? Math.min(1, p.h/CROP[p.crop].hours) : 0;
export const ripe = p => !!p.crop && p.h >= CROP[p.crop].hours;
export const damp = (p, ms) => ms < p.wet;
export const thirsty = (p, ms) => !!p.crop && !ripe(p) && !damp(p, ms);

function around(i){
  const c = i % COLS, r = Math.floor(i/COLS), out = [];
  if (c > 0) out.push(i - 1); if (c < COLS - 1) out.push(i + 1); if (r > 0) out.push(i - COLS); if (r < ROWS - 1) out.push(i + COLS);
  return out;
}
// the sun shines from the south, so the plot shading this one is the next one toward the front
function shadedBy(g, i){
  const front = g.plots[i + COLS], c = front && front.crop && CROP[front.crop];
  return c && c.tall && growth(front) >= SHADES_AT ? front : null;
}
const fedBy = (g, i) => around(i).some(j => g.plots[j].crop && CROP[g.plots[j].crop].feeds);
const beesFor = (g, i) => around(i).some(j => g.plots[j].crop && CROP[g.plots[j].crop].flower && growth(g.plots[j]) >= BLOOMS_AT);

// what is speeding or slowing a plot now, which the rate is made of and the kid is told
export function helps(g, i, ms){
  const p = g.plots[i], crop = CROP[p.crop];
  if (!crop) return {};
  return {offSeason:!inSeason(crop, ms), shade:!!(crop.sunny && shadedBy(g, i)), beans:!crop.feeds && fedBy(g, i), bees:!!crop.fruit && beesFor(g, i)};
}
export function rate(g, i, ms){
  const h = helps(g, i, ms);
  return (h.offSeason ? OUT_OF_SEASON : 1)*(h.shade ? SHADED : 1)*(h.beans ? FED : 1);
}

// Brings every plot up to now. Neighbours are judged as they stood when the stretch began, which is
// exact, because every change to the garden advances it first.
export function advance(g, now){
  if (g.at === null || now <= g.at) { g.at = Math.max(g.at || 0, now); return g; }
  const rates = g.plots.map((p, i) => p.crop ? rate(g, i, (g.at + now)/2) : 0);
  g.plots.forEach((p, i) => {
    if (!p.crop) return;
    const wetFor = Math.max(0, Math.min(now, p.wet) - g.at)/H;
    p.h = Math.min(CROP[p.crop].hours, p.h + wetFor*rates[i]);
  });
  g.at = now; return g;
}

export function plant(g, i, id, now){
  advance(g, now); const p = g.plots[i];
  if (p.crop || !unlocked(g).some(c => c.id === id)) return false;
  p.crop = id; p.h = 0; return true;
}
export function water(g, i, now){ advance(g, now); g.plots[i].wet = now + WET_HOURS*H; }
export function digUp(g, i, now){ advance(g, now); const p = g.plots[i]; p.crop = null; p.h = 0; }
export function harvest(g, i, now){
  advance(g, now); const p = g.plots[i];
  if (!ripe(p)) return null;
  const crop = CROP[p.crop], bees = !!crop.fruit && beesFor(g, i), n = bees ? 2 : 1;
  g.picked[crop.id] = (g.picked[crop.id] || 0) + n;
  if (crop.again) p.h = crop.hours*REGROW; else { p.crop = null; p.h = 0; }
  return {crop, n, bees};
}

// real hours until ripe if the soil stays damp
export function hoursLeft(g, i, ms){ const p = g.plots[i]; return p.crop ? (CROP[p.crop].hours - p.h)/rate(g, i, ms) : 0; }

export const picked = g => Object.values(g.picked).reduce((a, b) => a + b, 0);
export const unlocked = g => CROPS.filter(c => picked(g) >= c.unlock);
export const nextUnlock = g => CROPS.find(c => picked(g) < c.unlock) || null;
