// The pictures on the real-Earth globes. Most are NASA's own photos of the Earth, streamed from GIBS
// (NASA's Global Imagery Browse Services) as plain images cut to any box of latitude and longitude,
// far too big to ship. Like the telescope's lenses, each lens is another way of seeing the same Earth.
// A lens can instead `paint` its own map, or lay one `over` NASA's photo, from `data` it waits for
// first: the weather globe paints the live weather that way.
//
// The whole globe gets one picture, sharpened as more of it arrives; when the explorer leans in
// close, a close-up of just what they're looking at is laid over it.

import * as THREE from 'three';
import { paintCountries } from './paint.js';

const GIBS = 'https://gibs.earthdata.nasa.gov/wms/epsg4326/best/wms.cgi?SERVICE=WMS&REQUEST=GetMap&VERSION=1.3.0&STYLES=&CRS=EPSG:4326';
// the latest whole day: a day's satellite passes take a few hours after midnight (UTC) to all come in,
// and wherever they haven't, the picture is black
const lastDay = () => new Date(Date.now() - 864e5 - 6*36e5).toISOString().slice(0, 10);

// `sharpest` is how many pixels a degree of the picture is worth: the satellite saw no finer
export const LENSES = [
  {id: 'earth', name: 'Satellite', layers: 'BlueMarble_NextGeneration', sharpest: 220, lift: 'rgb(12,30,62)',
    tip: 'The real Earth from space, stitched together from many cloud-free days.', credit: 'NASA Blue Marble, via NASA GIBS'},
  // GIBS stacks the layers itself, so the Blue Marble shows at the poles in their dark season
  {id: 'clouds', name: 'Real clouds', layers: 'BlueMarble_NextGeneration,VIIRS_SNPP_CorrectedReflectance_TrueColor', time: true, sharpest: 440, lift: 'rgb(12,30,62)',
    tip: 'The real Earth a day or so ago, clouds, storms and all, photographed by a weather satellite.', credit: 'NASA Suomi NPP VIIRS, via NASA GIBS'},
  {id: 'night', name: 'Night lights', layers: 'VIIRS_Black_Marble', sharpest: 220, coasts: true,
    tip: 'The Earth at night. Every bright speck is a town or a city.', credit: 'NASA Black Marble, via NASA GIBS'},
  {id: 'relief', name: 'Mountains & sea floor', layers: 'BlueMarble_ShadedRelief_Bathymetry', sharpest: 220,
    tip: 'Mountains on land, and the hidden mountains and trenches under the sea. The darker the blue, the deeper.', credit: 'NASA Blue Marble shaded relief and bathymetry, via NASA GIBS'},
  {id: 'countries', name: 'Countries', paint: (g, w, h, box, maps) => paintCountries(g, maps.geo, maps.earth, w, h, box), sharpest: 1e9,
    tip: 'Every country in its own colour. No two neighbours share one.', credit: 'Natural Earth'},
];
export const lensBy = id => LENSES.find(l => l.id === id) || LENSES[0];

const picture = (lens, box, w, h) => new Promise((ok, fail) => {
  const im = new Image(); im.crossOrigin = 'anonymous';
  im.onload = () => ok(im); im.onerror = () => fail(new Error(`no picture for ${lens.id}`));
  im.src = `${GIBS}&LAYERS=${lens.layers}${lens.time ? '&TIME=' + lastDay() : ''}&FORMAT=image/jpeg&BBOX=${box.s},${box.w},${box.n},${box.e}&WIDTH=${w}&HEIGHT=${h}`;
});
function texture(canvas){
  const t = new THREE.CanvasTexture(canvas); t.encoding = THREE.sRGBEncoding; t.anisotropy = 8;
  return t;
}
const WORLD = {w: -180, e: 180, s: -90, n: 90};
// The open sea photographs nearly black, and on a globe in a lamplit room it reads as a hole. Screening
// a deep blue over the picture lifts only its darkest parts, so the sea is blue and the land stays true.
function put(g, lens, im, x, y, w, h, box, data){
  g.drawImage(im, x, y, w, h);
  if (lens.lift) { g.globalCompositeOperation = 'screen'; g.fillStyle = lens.lift; g.fillRect(x, y, w, h); g.globalCompositeOperation = 'source-over'; }
  if (lens.over) lens.over(g, x, y, w, h, box, data);
}

// A quick small picture of the whole Earth first, then eight sharper pieces as they come. The texture
// is ready once the quick one is; it fails only if that does.
export async function wholeEarth(lens, maps){
  const c = document.createElement('canvas'); c.width = 4096; c.height = 2048;
  const g = c.getContext('2d');
  if (lens.paint) { lens.paint(g, c.width, c.height, WORLD, maps); return texture(c); }
  const [im, data] = await Promise.all([picture(lens, WORLD, 2048, 1024), lens.data && lens.data()]);
  put(g, lens, im, 0, 0, c.width, c.height, WORLD, data);
  const t = texture(c);
  for (let i = 0; i < 4; i++) for (let j = 0; j < 2; j++) {
    const box = {w: -180 + i*90, e: -90 + i*90, s: 0 - j*90, n: 90 - j*90};
    picture(lens, box, 1024, 1024).then(im => { put(g, lens, im, i*1024, j*1024, 1024, 1024, box, data); t.needsUpdate = true; }, () => {});
  }
  return t;
}

// just one box of the Earth, w × h pixels
export async function closeUp(lens, box, w, h, maps){
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  const g = c.getContext('2d');
  if (lens.paint) lens.paint(g, w, h, box, maps);
  else { const [im, data] = await Promise.all([picture(lens, box, w, h), lens.data && lens.data()]); put(g, lens, im, 0, 0, w, h, box, data); }
  return texture(c);
}
