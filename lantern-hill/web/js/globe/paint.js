// A storybook map of the Earth for a globe: each biome in its own colour, inked coastlines. The
// colours come from the world model cell by cell, so the map shows exactly what tapping it says.
// A plain map is just land, sea and polar ice, for a globe that's about places, not biomes; a
// countries map is each country in its own colour, for the geography globe.

import { tex } from '../core/kit.js';
import { BIOMES } from '../earth/biomes.js';
import { loadEarth } from '../earth/model.js';

const STEP = .5;   // how finely biomes are sampled, in degrees; finer than the model's own grid gains nothing
const WORLD = {w: -180, e: 180, s: -90, n: 90};

// the box's cells, each in the colour colorOf gives what's at its middle, laid over the w × h picture
// of the box; the cells are the model's own, so they line up with what tapping says even in a close-up
function cells(g, at, colorOf, w, h, box){
  const i0 = Math.floor((box.w + 180)/STEP), i1 = Math.ceil((box.e + 180)/STEP), j0 = Math.floor((90 - box.n)/STEP), j1 = Math.ceil((90 - box.s)/STEP);
  const c = document.createElement('canvas'); c.width = i1 - i0; c.height = j1 - j0;
  const cg = c.getContext('2d'), img = cg.createImageData(c.width, c.height), rgba = new Map();
  for (let j = j0; j < j1; j++) for (let i = i0; i < i1; i++) {
    const b = at(90 - (j + .5)*STEP, -180 + (i + .5)*STEP);
    if (!rgba.has(b)) { const hex = colorOf(b); rgba.set(b, hex ? [...[1, 3, 5].map(k => parseInt(hex.slice(k, k + 2), 16)), 255] : [0, 0, 0, 0]); }
    img.data.set(rgba.get(b), ((j - j0)*c.width + i - i0)*4);
  }
  cg.putImageData(img, 0, 0);
  const kx = w/(box.e - box.w), ky = h/(box.n - box.s);
  g.imageSmoothingEnabled = false;
  g.drawImage(c, (i0*STEP - 180 - box.w)*kx, (box.n - 90 + j0*STEP)*ky, c.width*STEP*kx, c.height*STEP*ky);
}

// the biomes as colorOf paints them: water, reefs, land clipped to the coast, then lakes
function biomes(g, earth, colorOf, w, h, path, shallows, box = WORLD){
  cells(g, earth.seaBiome, colorOf, w, h, box);
  const land = path(earth.land), reef = colorOf(BIOMES.reef), lake = colorOf(BIOMES.lake);
  if (shallows) { g.strokeStyle = shallows; g.lineWidth = 7; g.lineJoin = 'round'; g.stroke(land); }
  if (reef) { g.fillStyle = reef; g.globalAlpha = .75; g.fill(path(earth.reefs.map(r => r.ring))); g.globalAlpha = 1; }
  const vent = colorOf(BIOMES.vent);
  if (vent) { g.fillStyle = vent; g.fill(path(earth.vents.map(v => v.ring))); }
  g.save(); g.clip(land, 'evenodd'); g.clearRect(0, 0, w, h); cells(g, earth.landBiome, colorOf, w, h, box); g.restore();
  const lakes = path(earth.lakes.map(l => l.ring));
  g.save(); g.clip(lakes); g.clearRect(0, 0, w, h); g.restore();
  if (lake) { g.fillStyle = lake; g.fill(lakes); }
  return {land, lakes};
}

// the whole world, or just a box of it ({w, e, s, n} in degrees) for a close-up
function projection(w, h = w/2, box = WORLD){
  const X = lon => (lon - box.w)*w/(box.e - box.w), Y = lat => (box.n - lat)*h/(box.n - box.s);
  const path = rings => { const p = new Path2D(); for (const r of rings) { p.moveTo(X(r[0]), Y(r[1])); for (let i = 2; i < r.length; i += 2) p.lineTo(X(r[i]), Y(r[i + 1])); p.closePath(); } return p; };
  return {h, X, Y, path};
}

const PLAIN = {sea: '#3a74a6', land: '#9bb56a', ice: '#eef2f4', lake: BIOMES.lake.color};
const plainColor = b => b === BIOMES.ice ? PLAIN.ice : b === BIOMES.lake ? PLAIN.lake : b.water ? (b === BIOMES.reef || b === BIOMES.vent ? null : PLAIN.sea) : PLAIN.land;

export const paintEarth = (earth, {plain = false, w = 2048} = {}) => tex(w, w/2, g => paintMap(g, earth, w, w/2, WORLD, plain));

// the map, or a box of it ({w, e, s, n} in degrees) for a close-up as the biome globe leans in
export function paintMap(g, earth, w, h, box, plain = false){
  const {X, Y, path} = projection(w, h, box);
  const {land, lakes} = biomes(g, earth, plain ? plainColor : b => b.color, w, h, path, 'rgba(160,215,235,.28)', box);
  g.strokeStyle = 'rgba(26,19,32,.85)'; g.lineWidth = 1.6; g.stroke(land); g.lineWidth = 1; g.stroke(lakes);
  // a faint graticule every 30°, and the equator in gold: Hoot's riddles measure from it
  g.strokeStyle = 'rgba(239,224,191,.16)'; g.lineWidth = 1;
  for (let lon = -150; lon < 180; lon += 30) { g.beginPath(); g.moveTo(X(lon), 0); g.lineTo(X(lon), h); g.stroke(); }
  for (const lat of [-60, -30, 30, 60]) { g.beginPath(); g.moveTo(0, Y(lat)); g.lineTo(w, Y(lat)); g.stroke(); }
  if (plain) return;
  g.strokeStyle = 'rgba(217,164,65,.9)'; g.lineWidth = 3; g.setLineDash([14, 8]);
  g.beginPath(); g.moveTo(0, Y(0)); g.lineTo(w, Y(0)); g.stroke(); g.setLineDash([]);
}

// every country in its own colour; Natural Earth numbers them so no two neighbours share one
const COUNTRY = ['#e8c87a', '#c9dd8f', '#f0a98e', '#b9c7ef', '#e3b3d6', '#9fd5c4', '#f2d6a2'];
export function paintCountries(g, geo, earth, w, h, box){
  const {path} = projection(w, h, box);
  g.fillStyle = PLAIN.sea; g.fillRect(0, 0, w, h);
  for (const c of geo.countries) { g.fillStyle = COUNTRY[(c.color - 1) % COUNTRY.length]; g.fill(path(c.rings), 'evenodd'); }
  g.fillStyle = PLAIN.lake; g.fill(path(earth.lakes.map(l => l.ring)));
  g.strokeStyle = 'rgba(26,19,32,.7)'; g.lineWidth = 1.2; g.stroke(path(earth.land));
}

// white wherever the biome is and clear everywhere else, to light it up on the globe; haloed, so
// even a thin strip of mangrove shows
// one region of the map (an ecoregion, a lake or a reef: a place's `region`) lit up the same way, in a
// w × h picture of its box
export function paintRegion(earth, region, w, h, box){
  const {path} = projection(w, h, box), mask = document.createElement('canvas'); mask.width = w; mask.height = h;
  const m = mask.getContext('2d'); m.fillStyle = '#ffffff';
  if (region.ring) m.fill(path([region.ring]));
  else { m.save(); m.clip(path(earth.land), 'evenodd'); cells(m, (lat, lon) => region.has(lat, lon), on => on ? '#ffffff' : null, w, h, box); m.restore(); }
  return tex(w, h, g => {
    g.shadowColor = '#ffffff'; g.shadowBlur = 8;
    for (let i = 0; i < 2; i++) g.drawImage(mask, 0, 0);
  });
}

export function paintGlow(earth, id, w = 1024){
  const {h, path} = projection(w);
  const mask = document.createElement('canvas'); mask.width = w; mask.height = h;
  biomes(mask.getContext('2d'), earth, b => b === BIOMES[id] ? '#ffffff' : null, w, h, path);
  return tex(w, h, g => {
    g.shadowColor = '#ffffff'; g.shadowBlur = 10;
    for (let i = 0; i < 3; i++) g.drawImage(mask, 0, 0);
  });
}

// the world model and its map, each style painted once for every globe that wants it; a failed load isn't kept
const painted = {};
export function earthMap(plain = false){
  const k = plain ? 'plain' : 'biomes';
  if (!painted[k]) { painted[k] = loadEarth().then(earth => ({earth, map: paintEarth(earth, {plain})})); painted[k].catch(() => { delete painted[k]; }); }
  return painted[k];
}
