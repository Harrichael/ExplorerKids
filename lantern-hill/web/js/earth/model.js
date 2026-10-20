// The Earth as the game knows it: where the land and water are, which biome covers each spot, and
// which food web to tell about there. The geography comes from data/earth.json (built by
// tools/earth/build.mjs); the biomes and food webs from biomes.js.
//
//   const earth = await loadEarth();
//   const here = earth.placeAt(-2.5, 34.8);
//   here.name              // 'Serengeti volcanic grasslands'
//   here.biome.name        // 'Savanna'
//   here.web.place         // 'the Serengeti'

import { BIOMES, VENTS, WEBS } from './biomes.js';

let loading = null;
export function loadEarth(){
  if (!loading) {
    loading = fetch('data/earth.json').then(r => r.ok ? r.json() : Promise.reject(new Error(`earth.json: ${r.status}`))).then(makeEarth);
    // a failed load isn't kept, or the globe would stay blank until the page reloads
    loading.catch(() => { loading = null; });
  }
  return loading;
}

const BY_SOURCE = {};
for (const [id, b] of Object.entries(BIOMES)) for (const n of b.from) BY_SOURCE[n] = id;
const ROCK_AND_ICE = 0;

export function makeEarth(d){
  const W = 360/d.step, H = 180/d.step;
  const unpack = rows => { const g = new Uint16Array(W*H); rows.forEach((r, j) => { for (let p = 0, i = 0; p < r.length; i += r[p + 1], p += 2) g.fill(r[p], j*W + i, j*W + i + r[p + 1]); }); return g; };
  const ecoGrid = unpack(d.ecoregionGrid), seaGrid = unpack(d.seaGrid);
  const cell = (lat, lon) => Math.min(H - 1, Math.max(0, Math.floor((90 - lat)/d.step)))*W + Math.floor((((lon + 180) % 360 + 360) % 360)/d.step) % W;
  const deg = r => withBox(Float64Array.from(r, v => v/100));
  const land = d.land.map(deg), lakes = d.lakes.map(l => ({name: l.name, ring: deg(l.ring)})), reefs = d.reefs.map(r => ({name: r.name, ring: deg(r.ring)}));
  // a vent field is a few hundred metres across, far too small to find on a globe, so each is shown as a spot a degree wide
  const vents = VENTS.map(v => ({name: v.name, ring: withBox(Float64Array.from({length: 48}, (_, i) => {
    const a = Math.floor(i/2)/24*Math.PI*2; return i % 2 ? v.at[0] + Math.sin(a) : v.at[1] + Math.cos(a)/Math.cos(v.at[0]*Math.PI/180);
  }))}));

  const ecoregion = (lat, lon) => { const c = ecoGrid[cell(lat, lon)]; if (!c) return null; const [id, name, biome, realm] = d.ecoregions[c - 1]; return {id, name, biome, realm}; };
  const sea = (lat, lon) => { const [name, kind] = d.seas[seaGrid[cell(lat, lon)] - 1]; return {name, kind}; };
  const onLand = (lat, lon) => land.reduce((inside, r) => inRing(r, lon, lat) ? !inside : inside, false);
  // RESOLVE lumps every ice field together; only the polar ones are ice sheets, the rest are high mountains
  const iceSheet = (lat, lon) => lat < -60 || (lat > 59 && lon > -75 && lon < -10);
  const landKind = (e, lat, lon) => !e ? 'ice' : e.id !== ROCK_AND_ICE ? BY_SOURCE[e.biome] : iceSheet(lat, lon) ? 'ice' : 'mountains';
  const seaKind = s => s.kind === 'lake' ? 'lake' : s.name === 'Arctic Ocean' || s.name === 'Southern Ocean' ? 'polar-sea' : 'ocean';

  // the biome a spot would have if it were land or if it were sea; cheap enough to paint a map with
  const landBiome = (lat, lon) => BIOMES[landKind(ecoregion(lat, lon), lat, lon)];
  const seaBiome = (lat, lon) => BIOMES[seaKind(sea(lat, lon))];

  function placeAt(lat, lon){
    const lake = lakes.find(l => inRing(l.ring, lon, lat));
    if (lake) return place(lat, lon, lake.name, 'lake', null, null, lake.name, ringRegion(lake));
    if (onLand(lat, lon)) {
      const e = ecoregion(lat, lon), kind = landKind(e, lat, lon), own = e && e.id !== ROCK_AND_ICE;
      const name = own ? e.name : kind === 'mountains' ? 'Mountain glaciers' : lat < 0 ? 'Antarctica' : 'Greenland';
      return place(lat, lon, name, kind, own ? e.realm : null, null, undefined, own ? cellRegion(ecoGrid[cell(lat, lon)]) : null);
    }
    const s = sea(lat, lon), reef = reefs.find(r => inRing(r.ring, lon, lat)), vent = vents.find(v => inRing(v.ring, lon, lat));
    if (vent) return place(lat, lon, vent.name, 'vent', null, s.name, vent.name, ringRegion(vent));
    if (reef) return place(lat, lon, reef.name, 'reef', null, s.name, reef.name, ringRegion(reef));
    return place(lat, lon, s.name, seaKind(s), null, null, s.name, null);
  }
  function place(lat, lon, name, biomeId, realm, within, water, region){
    const web = webFor(biomeId, realm, lat, lon, water);
    return {lat, lon, name, within: within || null, biomeId, biome: BIOMES[biomeId], realm, web, webFits: fits(web, realm, lat, lon, water), region};
  }

  // The stretch of map a place belongs to, to light it up: an ecoregion, a lake or a reef. The open
  // sea and the ice have none, since they'd light up half the world. Its box is {w, s, e, n}; one
  // that wraps past 180° spans the whole width.
  const regions = new Map();
  function cellRegion(c){
    if (!regions.has(c)) {
      const b = {w: 180, s: 90, e: -180, n: -90};
      for (let k = 0; k < ecoGrid.length; k++) if (ecoGrid[k] === c) {
        const lon = (k % W)*d.step - 180, lat = 90 - Math.floor(k/W)*d.step;
        b.w = Math.min(b.w, lon); b.e = Math.max(b.e, lon + d.step); b.n = Math.max(b.n, lat); b.s = Math.min(b.s, lat - d.step);
      }
      regions.set(c, {key: 'eco' + c, has: (lat, lon) => ecoGrid[cell(lat, lon)] === c, box: b});
    }
    return regions.get(c);
  }
  function ringRegion(x){
    const [w, s, e, n] = x.ring.box;
    return regions.get(x) || regions.set(x, {key: x.name, ring: x.ring, box: {w, s, e, n}}).get(x);
  }

  return {land, lakes, reefs, vents, credits: d.credits, landBiome, seaBiome, placeAt};
}

// The web for a biome from the same realm if there is one, else the nearest; animals differ more
// between realms than within one, so a web from across the realm beats a closer one over the border.
// A web can keep to its own island, coast or band of sea (bounds), or to the waters it names, where
// being nearest isn't enough: Madagascar's lemurs are closer to Tanzania than the Congo's gorillas are.
export function webFor(biomeId, realm, lat, lon, water){
  let best = null, bestScore = Infinity;
  for (const w of WEBS) {
    if (!w.biomes.includes(biomeId)) continue;
    const score = (sameRealm(w, realm) ? 0 : 2e5) + (inLimits(w, lat, lon, water) ? 0 : 1e5) + arc(lat, lon, w.at[0], w.at[1]);
    if (score < bestScore) { best = w; bestScore = score; }
  }
  return best;
}
// whether a web's animals are the ones that live at a spot, rather than the nearest stand-ins
export const fits = (w, realm, lat, lon, water) => sameRealm(w, realm) && inLimits(w, lat, lon, water);
const sameRealm = (w, realm) => !realm || w.realms.includes(realm);
const inLimits = (w, lat, lon, water) => (!w.bounds || w.bounds.some(b => inBox(b, lat, lon))) && (!w.waters || w.waters.includes(water));
// [south, west, north, east], wrapping past 180° when west is greater than east
const inBox = ([s, w, n, e], lat, lon) => lat >= s && lat <= n && (w <= e ? lon >= w && lon <= e : lon >= w || lon <= e);

// kilometres along the surface
export function arc(lat1, lon1, lat2, lon2){
  const r = Math.PI/180, a = Math.sin((lat2 - lat1)*r/2)**2 + Math.cos(lat1*r)*Math.cos(lat2*r)*Math.sin((lon2 - lon1)*r/2)**2;
  return 2*6371*Math.asin(Math.min(1, Math.sqrt(a)));
}

// a flat [lon, lat, …] ring, with its bounds so most tests can skip it at a glance
export function withBox(r){
  r.box = [Infinity, Infinity, -Infinity, -Infinity];
  for (let i = 0; i < r.length; i += 2) { r.box[0] = Math.min(r.box[0], r[i]); r.box[1] = Math.min(r.box[1], r[i + 1]); r.box[2] = Math.max(r.box[2], r[i]); r.box[3] = Math.max(r.box[3], r[i + 1]); }
  return r;
}
// even-odd test against a ring
export function inRing(r, x, y){
  const b = r.box; if (x < b[0] || x > b[2] || y < b[1] || y > b[3]) return false;
  let inside = false;
  for (let i = 0, j = r.length - 2; i < r.length; j = i, i += 2) {
    const xi = r[i], yi = r[i + 1], xj = r[j], yj = r[j + 1];
    if ((yi > y) !== (yj > y) && x < (xj - xi)*(y - yi)/(yj - yi) + xi) inside = !inside;
  }
  return inside;
}
