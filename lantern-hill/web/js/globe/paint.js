// A storybook map of the Earth for a globe: each biome in its own colour, inked coastlines. The
// colours come from the world model cell by cell, so the map shows exactly what tapping it says.

import { tex } from '../core/kit.js';
import { BIOMES } from '../earth/biomes.js';

const COLS = 720, ROWS = 360;   // how finely biomes are sampled; finer than the model's own grid gains nothing

function cells(biomeAt){
  const c = document.createElement('canvas'); c.width = COLS; c.height = ROWS;
  const g = c.getContext('2d'), img = g.createImageData(COLS, ROWS), rgb = new Map();
  for (let j = 0; j < ROWS; j++) for (let i = 0; i < COLS; i++) {
    const hex = biomeAt(90 - (j + .5)*180/ROWS, -180 + (i + .5)*360/COLS).color;
    if (!rgb.has(hex)) rgb.set(hex, [1, 3, 5].map(k => parseInt(hex.slice(k, k + 2), 16)));
    const [r, gg, b] = rgb.get(hex), o = (j*COLS + i)*4;
    img.data[o] = r; img.data[o + 1] = gg; img.data[o + 2] = b; img.data[o + 3] = 255;
  }
  g.putImageData(img, 0, 0); return c;
}

export function paintEarth(earth, w = 2048){
  const h = w/2, X = lon => (lon + 180)*w/360, Y = lat => (90 - lat)*h/180;
  const path = rings => { const p = new Path2D(); for (const r of rings) { p.moveTo(X(r[0]), Y(r[1])); for (let i = 2; i < r.length; i += 2) p.lineTo(X(r[i]), Y(r[i + 1])); p.closePath(); } return p; };
  return tex(w, h, g => {
    g.imageSmoothingEnabled = false;
    g.drawImage(cells(earth.seaBiome), 0, 0, w, h);
    const land = path(earth.land);
    // shallow water along every coast
    g.strokeStyle = 'rgba(160,215,235,.28)'; g.lineWidth = 7; g.lineJoin = 'round'; g.stroke(land);
    g.fillStyle = BIOMES.reef.color; g.globalAlpha = .75; g.fill(path(earth.reefs.map(r => r.ring))); g.globalAlpha = 1;
    g.save(); g.clip(land, 'evenodd'); g.drawImage(cells(earth.landBiome), 0, 0, w, h); g.restore();
    const lakes = path(earth.lakes.map(l => l.ring));
    g.fillStyle = BIOMES.lake.color; g.fill(lakes);
    g.strokeStyle = 'rgba(26,19,32,.85)'; g.lineWidth = 1.6; g.stroke(land); g.lineWidth = 1; g.stroke(lakes);
    // a faint graticule every 30°
    g.strokeStyle = 'rgba(239,224,191,.16)'; g.lineWidth = 1;
    for (let lon = -150; lon < 180; lon += 30) { g.beginPath(); g.moveTo(X(lon), 0); g.lineTo(X(lon), h); g.stroke(); }
    for (let lat = -60; lat <= 60; lat += 30) { g.beginPath(); g.moveTo(0, Y(lat)); g.lineTo(w, Y(lat)); g.stroke(); }
  });
}
