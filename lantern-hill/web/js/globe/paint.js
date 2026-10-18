// A storybook map of the Earth for a globe: each biome in its own colour, inked coastlines. The
// colours come from the world model cell by cell, so the map shows exactly what tapping it says.

import { tex } from '../core/kit.js';
import { BIOMES } from '../earth/biomes.js';

const COLS = 720, ROWS = 360;   // how finely biomes are sampled; finer than the model's own grid gains nothing

function cells(biomeAt, colorOf){
  const c = document.createElement('canvas'); c.width = COLS; c.height = ROWS;
  const g = c.getContext('2d'), img = g.createImageData(COLS, ROWS), rgba = new Map();
  for (let j = 0; j < ROWS; j++) for (let i = 0; i < COLS; i++) {
    const b = biomeAt(90 - (j + .5)*180/ROWS, -180 + (i + .5)*360/COLS);
    if (!rgba.has(b)) { const hex = colorOf(b); rgba.set(b, hex ? [...[1, 3, 5].map(k => parseInt(hex.slice(k, k + 2), 16)), 255] : [0, 0, 0, 0]); }
    img.data.set(rgba.get(b), (j*COLS + i)*4);
  }
  g.putImageData(img, 0, 0); return c;
}

// the biomes as colorOf paints them: water, reefs, land clipped to the coast, then lakes
function biomes(g, earth, colorOf, w, h, path, shallows){
  g.imageSmoothingEnabled = false;
  g.drawImage(cells(earth.seaBiome, colorOf), 0, 0, w, h);
  const land = path(earth.land), reef = colorOf(BIOMES.reef), lake = colorOf(BIOMES.lake);
  if (shallows) { g.strokeStyle = shallows; g.lineWidth = 7; g.lineJoin = 'round'; g.stroke(land); }
  if (reef) { g.fillStyle = reef; g.globalAlpha = .75; g.fill(path(earth.reefs.map(r => r.ring))); g.globalAlpha = 1; }
  g.save(); g.clip(land, 'evenodd'); g.clearRect(0, 0, w, h); g.drawImage(cells(earth.landBiome, colorOf), 0, 0, w, h); g.restore();
  const lakes = path(earth.lakes.map(l => l.ring));
  g.save(); g.clip(lakes); g.clearRect(0, 0, w, h); g.restore();
  if (lake) { g.fillStyle = lake; g.fill(lakes); }
  return {land, lakes};
}

function projection(w){
  const h = w/2, X = lon => (lon + 180)*w/360, Y = lat => (90 - lat)*h/180;
  const path = rings => { const p = new Path2D(); for (const r of rings) { p.moveTo(X(r[0]), Y(r[1])); for (let i = 2; i < r.length; i += 2) p.lineTo(X(r[i]), Y(r[i + 1])); p.closePath(); } return p; };
  return {h, Y, path};
}

export function paintEarth(earth, w = 2048){
  const {h, Y, path} = projection(w);
  return tex(w, h, g => {
    const {land, lakes} = biomes(g, earth, b => b.color, w, h, path, 'rgba(160,215,235,.28)');
    g.strokeStyle = 'rgba(26,19,32,.85)'; g.lineWidth = 1.6; g.stroke(land); g.lineWidth = 1; g.stroke(lakes);
    // a faint graticule every 30°, and the equator in gold: Hoot's riddles measure from it
    g.strokeStyle = 'rgba(239,224,191,.16)'; g.lineWidth = 1;
    for (let lon = -150; lon < 180; lon += 30) { g.beginPath(); g.moveTo(lon*w/360 + w/2, 0); g.lineTo(lon*w/360 + w/2, h); g.stroke(); }
    for (const lat of [-60, -30, 30, 60]) { g.beginPath(); g.moveTo(0, Y(lat)); g.lineTo(w, Y(lat)); g.stroke(); }
    g.strokeStyle = 'rgba(217,164,65,.9)'; g.lineWidth = 3; g.setLineDash([14, 8]);
    g.beginPath(); g.moveTo(0, Y(0)); g.lineTo(w, Y(0)); g.stroke(); g.setLineDash([]);
  });
}

// white wherever the biome is and clear everywhere else, to light it up on the globe; haloed, so
// even a thin strip of mangrove shows
export function paintGlow(earth, id, w = 1024){
  const {h, path} = projection(w);
  const mask = document.createElement('canvas'); mask.width = w; mask.height = h;
  biomes(mask.getContext('2d'), earth, b => b === BIOMES[id] ? '#ffffff' : null, w, h, path);
  return tex(w, h, g => {
    g.shadowColor = '#ffffff'; g.shadowBlur = 10;
    for (let i = 0; i < 3; i++) g.drawImage(mask, 0, 0);
  });
}
