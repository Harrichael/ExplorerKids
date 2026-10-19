// Builds the world model's data. web/data/earth.json is what grows where: Natural Earth coastlines and
// lakes for drawing and telling land from sea, RESOLVE's ecoregions on a half-degree grid, and the
// coral reef zones, drawn by hand. web/data/geography.json is what people call things: Natural
// Earth's countries, borders, rivers, lakes, mountains, deserts and seas, and Wikidata's volcanoes,
// each with the Wikipedia article its pictures come from, looked up through Wikidata.
//
//   node tools/earth/build.mjs        (from lantern-hill/; sources download once into tools/earth/cache)
//
// Needs `curl` and `unzip`. The ecoregions download is ~150 MB.

import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { LANDMARKS } from '../../web/js/earth/landforms.js';
import { arc } from '../../web/js/earth/model.js';

const HERE = dirname(fileURLToPath(import.meta.url)), CACHE = join(HERE, 'cache');
const OUT = join(HERE, '../../web/data/earth.json'), GEO_OUT = join(HERE, '../../web/data/geography.json');
const NE = 'https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/';
const RESOLVE = 'https://storage.googleapis.com/teow2016/Ecoregions2017.zip';
const STEP = .5, W = 360/STEP, H = 180/STEP;
// how far ecoregions spread out to sea, in cells, so every coastline pixel and small island has one
const REACH = 8;

function fetchOnce(url, name){
  const p = join(CACHE, name);
  if (!existsSync(p)) { console.log('downloading', url); execFileSync('curl', ['-sSfL', '-o', p, url]); }
  return p;
}

// ---------- RESOLVE Ecoregions 2017: a shapefile of polygons plus a dBASE table of names ----------
function readDbf(path){
  const b = readFileSync(path), n = b.readUInt32LE(4), headLen = b.readUInt16LE(8), recLen = b.readUInt16LE(10), fields = [];
  for (let o = 32; b[o] !== 0x0d; o += 32) fields.push({name: b.toString('latin1', o, o + 11).replace(/\0.*/, ''), len: b[o + 16]});
  const rows = [];
  for (let i = 0; i < n; i++) {
    let o = headLen + i*recLen + 1; const r = {};
    for (const f of fields) { r[f.name] = b.toString('latin1', o, o + f.len).trim(); o += f.len; }
    rows.push(r);
  }
  return rows;
}
// each record's rings as flat [lon, lat, lon, lat, …] arrays
function* readShp(path){
  const b = readFileSync(path);
  for (let o = 100; o < b.length;) {
    const len = b.readInt32BE(o + 4)*2, c = o + 8; o = c + len;
    if (b.readInt32LE(c) !== 5) { yield []; continue; }
    const parts = b.readInt32LE(c + 36), points = b.readInt32LE(c + 40), pts = c + 44 + parts*4, rings = [];
    for (let p = 0; p < parts; p++) {
      const a = b.readInt32LE(c + 44 + p*4), z = p + 1 < parts ? b.readInt32LE(c + 48 + p*4) : points, ring = new Float64Array((z - a)*2);
      for (let k = a; k < z; k++) { ring[(k - a)*2] = b.readDoubleLE(pts + k*16); ring[(k - a)*2 + 1] = b.readDoubleLE(pts + k*16 + 8); }
      rings.push(ring);
    }
    yield rings;
  }
}

// scanline fill, even-odd across all of a polygon's rings, sampling each cell at its centre
function rasterize(rings, grid, code){
  const rows = new Map();
  for (const r of rings) for (let k = 0, n = r.length/2; k < n; k++) {
    const x0 = r[k*2], y0 = r[k*2 + 1], x1 = r[((k + 1) % n)*2], y1 = r[((k + 1) % n)*2 + 1];
    const jA = Math.max(0, Math.floor((90 - Math.max(y0, y1))/STEP - .5)), jB = Math.min(H - 1, Math.ceil((90 - Math.min(y0, y1))/STEP - .5));
    for (let j = jA; j <= jB; j++) {
      const lat = 90 - (j + .5)*STEP;
      if ((y0 > lat) === (y1 > lat)) continue;
      let xs = rows.get(j); if (!xs) rows.set(j, xs = []);
      xs.push(x0 + (lat - y0)/(y1 - y0)*(x1 - x0));
    }
  }
  for (const [j, xs] of rows) {
    xs.sort((a, b) => a - b);
    for (let k = 0; k + 1 < xs.length; k += 2) {
      const iA = Math.max(0, Math.ceil((xs[k] + 180)/STEP - .5)), iB = Math.min(W - 1, Math.floor((xs[k + 1] + 180)/STEP - .5));
      for (let i = iA; i <= iB; i++) grid[j*W + i] = code;
    }
  }
}

// cells left empty near land take the nearest ecoregion, breadth first, wrapping round the date line
function spread(grid){
  let front = [];
  for (let c = 0; c < grid.length; c++) if (grid[c]) front.push(c);
  for (let d = 0; d < REACH && front.length; d++) {
    const next = [];
    for (const c of front) {
      const j = Math.floor(c/W), i = c % W;
      for (const [di, dj] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const jj = j + dj; if (jj < 0 || jj >= H) continue;
        const n = jj*W + (i + di + W) % W;
        if (!grid[n]) { grid[n] = grid[c]; next.push(n); }
      }
    }
    front = next;
  }
}

// ---------- Natural Earth: coastlines and lakes ----------
// each feature's rings as flat [lon, lat, …] arrays, holes included
const features = geojson => JSON.parse(readFileSync(geojson, 'utf8')).features.map(f => ({
  props: f.properties,
  rings: (f.geometry.type === 'Polygon' ? [f.geometry.coordinates] : f.geometry.coordinates).flatMap(poly => poly.map(r => Float64Array.from(r.flat()))),
}));
const hundredths = r => Array.from(r, v => Math.round(v*100));

// Douglas–Peucker, to about a third of a pixel on the globe's 2048-wide map
const TOLERANCE = .06;
function simplify(r, tolerance = TOLERANCE){
  const n = r.length/2, keep = new Uint8Array(n), stack = [[0, n - 1]];
  keep[0] = keep[n - 1] = 1;
  while (stack.length) {
    const [a, b] = stack.pop(), ax = r[a*2], ay = r[a*2 + 1], dx = r[b*2] - ax, dy = r[b*2 + 1] - ay, L = Math.hypot(dx, dy);
    let far = 0, at = -1;
    for (let i = a + 1; i < b; i++) {
      const px = r[i*2] - ax, py = r[i*2 + 1] - ay;
      // a closed ring starts and ends on the same point, so its first split is by distance from it
      const d = L < 1e-9 ? Math.hypot(px, py) : Math.abs(dy*px - dx*py)/L;
      if (d > far) { far = d; at = i; }
    }
    if (far > tolerance) { keep[at] = 1; stack.push([a, at], [at, b]); }
  }
  const out = []; for (let i = 0; i < n; i++) if (keep[i]) out.push(r[i*2], r[i*2 + 1]);
  return out;
}
const shapely = r => r.length >= 8;   // four points, the first repeated last: anything less has simplified away
const bboxArea = r => { let x0 = 180, x1 = -180, y0 = 90, y1 = -90; for (let i = 0; i < r.length; i += 2) { x0 = Math.min(x0, r[i]); x1 = Math.max(x1, r[i]); y0 = Math.min(y0, r[i + 1]); y1 = Math.max(y1, r[i + 1]); } return (x1 - x0)*(y1 - y0); };
// the big "lakes" of inland Australia are salt pans, dry most years
const saltPan = r => { const x = r[0], y = r[1]; return x > 113 && x < 154 && y > -35 && y < -18; };

// ---------- which sea each water cell belongs to ----------
// Each ocean floods out from a few seeds, by distance through water, until it meets another.
// The polar oceans are bands of latitude instead (south of 60°S is the Southern Ocean), and
// walls along the standard dividing lines keep the oceans from leaking round the southern capes.
const SEAS = [
  ['Pacific Ocean', 'ocean', [[0, -150], [20, 140], [-20, 170], [40, -140], [30, 160], [-40, -100]]],
  ['Atlantic Ocean', 'ocean', [[0, -30], [35, -40], [-30, -15], [55, -30]]],
  ['Indian Ocean', 'ocean', [[-20, 80], [5, 65], [-35, 100]]],
  ['Arctic Ocean', 'ocean', []],
  ['Southern Ocean', 'ocean', []],
  ['Mediterranean Sea', 'sea', [[35, 18], [38, 5]]],
  ['Black Sea', 'sea', [[43, 34]]],
  ['Red Sea', 'sea', [[20, 38.5]]],
  ['Baltic Sea', 'sea', [[58, 20]]],
  ['Caspian Sea', 'lake', [[42, 51]]],
];
const WALLS = [[20, -90, -34], [147, -90, -43.5], [-68, -90, -55]];   // [lon, from lat, to lat]
const cellLat = j => 90 - (j + .5)*STEP, cellLon = i => -180 + (i + .5)*STEP;
function seas(landRings){
  const land = new Uint8Array(W*H); rasterize(landRings, land, 1);
  const sea = new Uint8Array(W*H), wall = c => WALLS.some(([lon, a, b]) => { const lat = cellLat(Math.floor(c/W)); return Math.abs(cellLon(c % W) - lon) < STEP && lat > a && lat < b; });
  const polar = j => cellLat(j) < -60 ? SEAS.findIndex(s => s[0] === 'Southern Ocean') + 1 : cellLat(j) > 66 ? SEAS.findIndex(s => s[0] === 'Arctic Ocean') + 1 : 0;
  for (let c = 0; c < W*H; c++) if (!land[c]) sea[c] = polar(Math.floor(c/W));
  const flood = (front, open) => {
    while (front.length) {
      const next = [];
      for (const c of front) {
        const j = Math.floor(c/W), i = c % W;
        for (const [di, dj] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
          const jj = j + dj; if (jj < 0 || jj >= H) continue;
          const n = jj*W + (i + di + W) % W;
          if (!sea[n] && open(n)) { sea[n] = sea[c]; next.push(n); }
        }
      }
      front = next;
    }
  };
  const seeds = [];
  SEAS.forEach(([, , pts], k) => { for (const [lat, lon] of pts) { const c = Math.floor((90 - lat)/STEP)*W + Math.floor((lon + 180)/STEP); if (land[c]) throw new Error(`${SEAS[k][0]} seed ${lat},${lon} is on land`); sea[c] = k + 1; seeds.push(c); } });
  flood(seeds, n => !land[n] && !wall(n));
  // the walls, anything they cut off, and the land too, join whichever water is nearest: a coastline
  // drawn finer than the grid can put sea where the grid has land
  const filled = []; for (let c = 0; c < W*H; c++) if (sea[c]) filled.push(c);
  flood(filled, () => true);
  return sea;
}

function runs(grid){
  const rows = [];
  for (let j = 0; j < H; j++) {
    const row = [];
    for (let k = 0; k < W;) { const c = grid[j*W + k]; let n = 1; while (k + n < W && grid[j*W + k + n] === c) n++; row.push(c, n); k += n; }
    rows.push(row);
  }
  return rows;
}

// Coral reefs: the major warm-water reef regions as loose outlines, traced from the UNEP-WCMC
// global distribution of coral reefs. They mark where reefs are, not each reef's edge.
const REEFS = [
  ['Great Barrier Reef', [[142.5, -10], [145, -10.5], [146.5, -14.5], [148.5, -17.5], [151.5, -20], [153.5, -23.5], [152, -24.5], [149.5, -22], [147, -19.5], [145.4, -16], [143.5, -12.5]]],
  ['Coral Sea and New Caledonia', [[163.5, -19], [166, -19.5], [168, -22.5], [166.5, -23], [164, -21]]],
  ['Coral Triangle', [[118, 7.5], [122, 13], [126.5, 9.5], [128, 2], [135, -1], [141, -3], [151, -4], [156, -7], [161, -10], [158, -12], [150, -11], [141, -9.5], [134, -6], [127, -9], [118, -9.5], [116, -5], [117.5, 0], [117.5, 4.5]]],
  ['Red Sea', [[34.2, 28], [35, 27.5], [39.5, 21], [42, 16.5], [43.4, 12.7], [42.8, 12.6], [40.5, 15.5], [38, 18], [36.5, 22], [33.7, 27]]],
  ['Maldives and Chagos', [[72.4, 7.2], [73.8, 7.2], [73.8, -.8], [72.8, -.8], [71.2, -5], [72.8, -7.5], [72.3, -.6]]],
  ['Mesoamerican Reef and the Caribbean', [[-88.2, 21.6], [-86.6, 21.5], [-87.4, 18.5], [-87.8, 16], [-88.8, 15.8], [-88.4, 17.8]]],
  ['Bahamas and Florida Keys', [[-81.8, 24.4], [-80, 25.4], [-78.5, 27.2], [-77, 26.7], [-73, 22.6], [-74.2, 21], [-77.5, 22.4], [-79.8, 23.6]]],
  ['Lesser Antilles', [[-61.8, 18.3], [-60.8, 17.8], [-60.8, 12.2], [-61.9, 11.9], [-62.4, 16.8]]],
  ['Fiji', [[176.8, -15.5], [180, -16], [180, -19.5], [177, -19.5]]],
  ['East African coast', [[39.5, -3.6], [41, -2], [41.5, -2.7], [40.5, -5.5], [40.6, -11], [40.9, -15], [40, -15], [39.3, -9], [39, -5]]],
];

function build(){
  mkdirSync(CACHE, {recursive: true});
  const zip = fetchOnce(RESOLVE, 'Ecoregions2017.zip'), shp = join(CACHE, 'resolve/Ecoregions2017.shp');
  if (!existsSync(shp)) execFileSync('unzip', ['-o', '-q', zip, '-d', join(CACHE, 'resolve')]);
  const land = fetchOnce(NE + 'ne_50m_land.geojson', 'ne_50m_land.geojson'), lakes = fetchOnce(NE + 'ne_50m_lakes.geojson', 'ne_50m_lakes.geojson');

  // grid codes are positions in the ecoregion table, starting at 1; 0 is open sea
  const table = readDbf(join(CACHE, 'resolve/Ecoregions2017.dbf')), grid = new Uint16Array(W*H), ecoregions = [];
  const codeOf = new Map(); let i = 0;
  for (const shape of readShp(shp)) {
    const r = table[i++], id = +r.ECO_ID;
    if (!codeOf.has(id)) { ecoregions.push([id, r.ECO_NAME, +r.BIOME_NUM, r.REALM]); codeOf.set(id, ecoregions.length); }
    rasterize(shape, grid, codeOf.get(id));
  }
  spread(grid);
  const landRings = features(land).flatMap(f => f.rings).map(r => simplify(r)).filter(shapely);
  const lakeRings = features(lakes).filter(f => f.props.name).flatMap(f => f.rings.map(r => ({name: f.props.name, ring: simplify(r)})))
    .filter(l => shapely(l.ring) && bboxArea(l.ring) > .25 && !saltPan(l.ring)).map(l => ({name: l.name, ring: hundredths(l.ring)}));
  // grids are run-length rows, [code, count, code, count, …], from the north pole down, starting at 180°W
  const out = {
    credits: ['Ecoregions: RESOLVE Ecoregions 2017 (Dinerstein et al.), CC BY 4.0', 'Coastlines and lakes: Natural Earth, public domain', 'Reef zones: after UNEP-WCMC global distribution of coral reefs'],
    step: STEP,
    land: landRings.map(hundredths), lakes: lakeRings,
    reefs: REEFS.map(([name, pts]) => ({name, ring: pts.flatMap(([x, y]) => [Math.round(x*100), Math.round(y*100)])})),
    ecoregions, ecoregionGrid: runs(grid),
    seas: SEAS.map(([name, kind]) => [name, kind]), seaGrid: runs(seas(landRings)),
  };
  mkdirSync(dirname(OUT), {recursive: true});
  writeFileSync(OUT, JSON.stringify(out));
  console.log(`wrote ${OUT}: ${ecoregions.length} ecoregions, ${(JSON.stringify(out).length/1024).toFixed(0)} KB`);
}
// ---------- geography.json: what people call things ----------
// how finely countries are kept: fine enough that tapping near a border names the right side
const COUNTRY_TOLERANCE = .03;
// a country's English name, which spells out Natural Earth's short ones ('Dem. Rep. Congo'), but
// not as far as a state's formal title
const english = p => /^People's Republic of /.test(p.NAME_EN) ? p.NAME : p.NAME_EN;
const nameOf = s => s.replace(/\s*\(.*\)$/, '');
// Natural Earth shouts some names ('GOBI DESERT'); Wikipedia's title is the friendlier name when there is one
const titleCase = s => s === s.toUpperCase() ? s.toLowerCase().replace(/(^|[\s-])(\p{L})/gu, (m, a, b) => a + b.toUpperCase()) : s;

// Wikidata ids to English Wikipedia titles, fifty at a time, remembered in the cache between builds
async function wikiTitles(ids){
  const p = join(CACHE, 'wiki-titles.json'), known = existsSync(p) ? JSON.parse(readFileSync(p, 'utf8')) : {};
  const want = [...new Set(ids)].filter(id => id && !(id in known));
  for (let i = 0; i < want.length; i += 50) {
    const batch = want.slice(i, i + 50);
    const url = `https://www.wikidata.org/w/api.php?action=wbgetentities&format=json&props=sitelinks&sitefilter=enwiki&ids=${batch.join('|')}`;
    let r;
    for (let tries = 0; (r = await fetch(url, {headers: {'User-Agent': 'LanternHill-earth-build/1.0 (educational game)'}})).status === 429 && tries < 6; tries++) {
      const wait = 1000*(+r.headers.get('retry-after') || 30); console.log(`wikidata: asked to wait ${wait/1000}s`); await new Promise(ok => setTimeout(ok, wait));
    }
    if (!r.ok) throw new Error(`wikidata: ${r.status} ${await r.text()}`);
    const d = await r.json();
    for (const id of batch) known[id] = d.entities?.[id]?.sitelinks?.enwiki?.title || null;
    console.log(`wikidata: ${Math.min(i + 50, want.length)} of ${want.length}`);
    writeFileSync(p, JSON.stringify(known));
    await new Promise(ok => setTimeout(ok, 1500));   // Wikidata turns away bursts
  }
  writeFileSync(p, JSON.stringify(known));
  return known;
}

// where to write a region's name: the spot inside it farthest from its edge, found on a coarse grid
function labelPoint(rings){
  const big = rings.reduce((a, r) => bboxArea(r) > bboxArea(a) ? r : a);
  let x0 = 180, x1 = -180, y0 = 90, y1 = -90;
  for (let i = 0; i < big.length; i += 2) { x0 = Math.min(x0, big[i]); x1 = Math.max(x1, big[i]); y0 = Math.min(y0, big[i + 1]); y1 = Math.max(y1, big[i + 1]); }
  const inside = (x, y) => rings.reduce((v, r) => { let c = false; for (let i = 0, j = r.length - 2; i < r.length; j = i, i += 2) { const xi = r[i], yi = r[i + 1], xj = r[j], yj = r[j + 1]; if ((yi > y) !== (yj > y) && x < (xj - xi)*(y - yi)/(yj - yi) + xi) c = !c; } return c ? !v : v; }, false);
  const edge = (x, y) => { let d = Infinity; for (const r of rings) for (let i = 0; i + 3 < r.length; i += 2) { const ax = r[i], ay = r[i + 1], dx = r[i + 2] - ax, dy = r[i + 3] - ay, L = dx*dx + dy*dy, t = L ? Math.max(0, Math.min(1, ((x - ax)*dx + (y - ay)*dy)/L)) : 0; d = Math.min(d, Math.hypot(x - ax - t*dx, y - ay - t*dy)); } return d; };
  let best = [(y0 + y1)/2, (x0 + x1)/2], far = -1;
  for (let a = 0; a <= 24; a++) for (let b = 0; b <= 24; b++) {
    const x = x0 + (x1 - x0)*(b + .5)/25, y = y0 + (y1 - y0)*(a + .5)/25;
    if (!inside(x, y)) continue;
    const d = edge(x, y); if (d > far) { far = d; best = [y, x]; }
  }
  return best.map(v => Math.round(v*100)/100);
}

// what kind of thing each Natural Earth feature class is, in a child's words; anything else is left out
const REGION_KIND = {'Continent': 'continent', 'Range/mtn': 'mountains', 'Desert': 'desert', 'Plateau': 'plateau', 'Basin': 'basin', 'Plain': 'plain',
  'Tundra': 'tundra', 'Delta': 'delta', 'Peninsula': 'peninsula', 'Pen/cape': 'peninsula', 'Valley': 'valley', 'Gorge': 'gorge', 'Wetlands': 'wetland',
  'Island group': 'islands', 'Island': 'island', 'Isthmus': 'isthmus', 'Geoarea': 'region'};
const MARINE_KIND = {ocean: 'ocean', sea: 'sea', bay: 'bay', gulf: 'gulf', strait: 'strait', channel: 'channel', sound: 'sound'};
// Natural Earth files a few names under a class a child would be misled by: a peninsula as a plateau,
// provinces as islands, farmland as desert, the ice domes on Antarctica's plateau as plateaus, and
// the Caspian, the biggest lake on Earth, as a sea
const REKIND = {'Caspian Sea': 'lake', 'PENÍNSULA IBÉRICA': 'peninsula', 'LABRADOR': 'region', 'Nova Scotia': 'region', 'PUNJAB': 'region', 'CAATINGAS': 'region', 'SAHEL': 'region',
  'LES LAURENTIDES': 'region', 'Talos Dome': 'region', 'Dome C (Charlie)': 'region', 'Dome A (Argus)': 'region', 'Dome F (Fuji)': 'region',
  'Cà Mau Point': 'cape', 'Cape Chelyuskin': 'cape', 'Arctic Institute I.': 'islands', 'Bristol Channel': 'bay'};

// The volcanoes the Smithsonian's Global Volcanism Program numbers, from Wikidata, kept to the ones
// famous enough for articles in thirty languages. Volcanic islands stay islands.
const VOLCANOES = `SELECT ?item ?title ?coord ?links WHERE {
  ?item wdt:P1886 ?gvp; wdt:P625 ?coord; wikibase:sitelinks ?links; wdt:P31/wdt:P279* wd:Q8072.
  ?article schema:about ?item; schema:isPartOf <https://en.wikipedia.org/>; schema:name ?title.
  FILTER(?links >= 30) FILTER NOT EXISTS { ?item wdt:P31/wdt:P279* wd:Q23442. }
}`;
// a Wikidata query's answer, asked once and kept in the cache; the query service turns away bursts
// and gives up on slow queries, so it's asked again after a rest
async function ask(name, query){
  const p = join(CACHE, name + '.json');
  if (!existsSync(p)) {
    for (let tries = 0; ; tries++) {
      console.log(`asking wikidata for ${name}`);
      const r = await fetch(`https://query.wikidata.org/sparql?format=json&query=${encodeURIComponent(query)}`, {headers: {'User-Agent': 'LanternHill-earth-build/1.0 (educational game)'}});
      if (r.ok) { writeFileSync(p, await r.text()); break; }
      if (tries >= 5 || ![429, 500, 502, 503, 504].includes(r.status)) throw new Error(`wikidata query ${name}: ${r.status}`);
      const wait = 1000*(+r.headers.get('retry-after') || 20*(tries + 1)); console.log(`wikidata: ${r.status}, waiting ${wait/1000}s`); await new Promise(ok => setTimeout(ok, wait));
    }
    await new Promise(ok => setTimeout(ok, 1500));
  }
  return JSON.parse(readFileSync(p, 'utf8')).results.bindings;
}

async function volcanoes(){
  const seen = new Map();
  for (const b of await ask('volcanoes', VOLCANOES)) {
    const [lon, lat] = b.coord.value.match(/-?[\d.]+/g).map(Number);
    // Wikidata doesn't always say a volcanic island is an island, but its name does
    if (!seen.has(b.item.value) && !/\bIslands?\b/.test(b.title.value)) seen.set(b.item.value, {title: b.title.value, at: [lat, lon].map(v => Math.round(v*1000)/1000), links: +b.links.value});
  }
  return [...seen.values()].sort((a, b) => b.links - a.links);
}

// The natural world beyond Natural Earth's names: under the sea, along the coasts and on land, from
// Wikidata, the best known of each kind first. A thing that is two kinds goes to the first one here,
// so an atoll is a reef before it's an island, and a geyser isn't also a hot spring. `links` is how
// many Wikipedias it takes to count; `take` keeps the catalogue to what a child might look for.
const CATALOGUE = [
  {kind: 'trench', of: ['Q119253'], links: 1, take: 40, deep: true},
  {kind: 'ridge', of: ['Q104698'], links: 1, take: 40, deep: true},
  {kind: 'abyssal', of: ['Q570554'], links: 1, take: 20, deep: true},
  {kind: 'seamount', of: ['Q503269', 'Q151957'], links: 2, take: 80, deep: true, floor: 3.5},
  {kind: 'reef', of: ['Q11292', 'Q4078911', 'Q42523'], links: 3, take: 160, floor: 3.5},
  {kind: 'geyser', of: ['Q83471'], links: 2, take: 60, floor: 5},
  {kind: 'hotspring', of: ['Q177380'], links: 6, take: 60, floor: 5},
  {kind: 'glacier', of: ['Q35666'], links: 8, take: 250},
  {kind: 'waterfall', of: ['Q34038'], links: 8, take: 250, floor: 4},
  {kind: 'cave', of: ['Q35509'], links: 10, take: 200, floor: 5},
  {kind: 'canyon', of: ['Q150784'], links: 4, take: 180, floor: 4},
  {kind: 'fjord', of: ['Q45776'], links: 6, take: 150, floor: 4},
  {kind: 'lagoon', of: ['Q187223'], links: 6, take: 100, floor: 4},
  {kind: 'beach', of: ['Q40080'], links: 6, take: 200, floor: 4.5},
  {kind: 'cape', of: ['Q185113', 'Q191992'], links: 10, take: 150, floor: 4},
  {kind: 'cliff', of: ['Q107679'], links: 5, take: 80, floor: 4.5},
  {kind: 'mesa', of: ['Q623319'], links: 2, take: 60, floor: 4.5},
  {kind: 'butte', of: ['Q6554910'], links: 2, take: 60, floor: 5},
  {kind: 'dune', of: ['Q319120', 'Q25391'], links: 2, take: 50, floor: 4},
  {kind: 'plateau', of: ['Q75520'], links: 8, take: 150},
  {kind: 'hill', of: ['Q54050'], links: 12, take: 150, floor: 4.5},
  {kind: 'island', of: ['Q23442'], links: 40, take: 300},
];
// Wikidata files these with the kind, but a child would be misled: a valley on land called a trench,
// a weapons dump, temples and tombs cut into rock called caves, holy places and war memorials called
// hills, mountains called glaciers or cliffs, estuaries called fjords, barrier islands called dunes
const NOT_NATURE = new Set(['Intermontane Trench', 'Beaufort\'s Dyke', 'Devil\'s Hole (North Sea)', 'Farallon Trench', 'Calvary', 'Temple Mount', 'Mount Zion', 'Larsa',
  'Aoraki / Mount Cook', 'Mount Bulusan', 'Brimstone Hill Fortress National Park', 'Mamayev Kurgan', 'Vredefort impact structure', 'Areopagus', 'Cave of the Patriarchs',
  'Ajanta Caves', 'Ellora Caves', 'Elephanta Caves', 'Mogao Caves', 'Head-Smashed-In Buffalo Jump', 'Laurel Canyon', 'Leptokarya', 'Lake Louise', 'Taal Lake', 'Binnenalster',
  'Caliphal Baths', 'Trango Towers', 'Suicide Cliff', 'Banzai Cliff', 'Plane Table Glacier', 'Nevado del Huila', 'Sierra Nevada de Santa Marta', 'Nevado del Tolima',
  'Firth of Forth', 'Solway Firth', 'Firth of Tay', 'Norton Sound', 'Seokguram', 'Ironbridge Gorge', 'Mount Kirigamine', 'Hotel Zone (Cancún)', 'Lake Louise', 'Bulgarian Black Sea Coast', 'Valley of Geysers', 'Pankisi', 'Kodori Valley']);
const NOT_NATURE_LIKE = {cave: /Grottoes|Rock[- ]Art|rock shelters|Thousand Buddha|Temple/i, dune: /\bIsland\b/, fjord: /Firth|Estuary|\bBay\b/, glacier: /^(Nevado|Mount|Sierra|Volcán)\b/};
// the deepest point of trenches Wikidata gives no depth for, in metres
const DEPTHS = {'Japan Trench': 8412, 'Philippine Trench': 10540, 'Kermadec Trench': 10047, 'South Sandwich Trench': 8265, 'Izu–Ogasawara Trench': 9780,
  'Middle America Trench': 6669, 'Romanche Trench': 7760, 'Yap Trench': 8527, 'New Britain Trench': 9140, 'New Hebrides Trench': 7600, 'Manila Trench': 5400,
  'Puysegur Trench': 6300, 'Hellenic Trench': 5267, 'Timor Trough': 3300, 'Hikurangi Trough': 3750};
const catalogueQuery = (of, links) => `SELECT ?item ?title ?coord ?links ?el ?dep ?is WHERE {
  ?item wdt:P31/wdt:P279* wd:${of}; wdt:P625 ?coord; wikibase:sitelinks ?links. FILTER(?links >= ${links})
  ?article schema:about ?item; schema:isPartOf <https://en.wikipedia.org/>; schema:name ?title.
  OPTIONAL { ?item p:P2044/psn:P2044/wikibase:quantityAmount ?el } OPTIONAL { ?item p:P4511/psn:P4511/wikibase:quantityAmount ?dep }
  OPTIONAL { ?item wdt:P31 ?type. ?type rdfs:label ?is FILTER(lang(?is) = "en") }
}`;
// What else Wikidata says a thing is gives away a town or resort filed as a beach, an airport built
// on an island it made, or a mountain filed as a plateau. A few seaside neighbourhoods are the
// beach a child has heard of, so they stay.
const ALSO_PEOPLE = /\b(airport|artificial island|town|city|village|hamlet|resort|neighbou?rhood|settlement|hotel|commune|municipality|suburb|district|quarter|borough|census|tourist destination|hotel zone)\b/i;
const ALSO_IS = {island: /\b(airport|artificial island)\b/i, plateau: /\b(mountain|volcano|peak|summit)\b/i, hill: /\b(mountain|volcano|archaeological|fort|castle|cemetery|monument)\b/i,
  beach: ALSO_PEOPLE, dune: ALSO_PEOPLE, canyon: ALSO_PEOPLE, lagoon: ALSO_PEOPLE, cape: ALSO_PEOPLE, cliff: ALSO_PEOPLE, cave: /\b(temple|monastery|church|tomb)\b/i};
const SEASIDE = new Set(['Copacabana, Rio de Janeiro', 'Ipanema', 'Waikīkī', 'Coney Island', 'Bondi Beach']);
// famous natural places Wikidata can't find by kind, or files without a spot: regions, forests and
// the long ridges and reefs that a single point barely does justice to
const spot = (name, kind, at, min, extra) => ({name, kind, at, min, wiki: name, ...extra});
const NATURAL_REGIONS = [
  spot('Fertile Crescent', 'region', [33.5, 40.5], 3.5),
  spot('Serengeti', 'plain', [-2.33, 34.83], 4.5),
  spot('Amazon rainforest', 'forest', [-4, -62], 2.5),
  spot('Congo Rainforest', 'forest', [0.5, 20], 3),
  spot('Taiga', 'forest', [61, 100], 3),
  spot('Daintree Rainforest', 'forest', [-16.17, 145.42], 6),
  spot('Black Forest', 'forest', [48.3, 8.15], 5.5),
  spot('Białowieża Forest', 'forest', [52.73, 23.85], 6),
  spot('Sundarbans', 'forest', [21.95, 89.18], 5),
  spot('Valdivian temperate rainforest', 'forest', [-40.5, -73], 5),
  spot('Outback', 'region', [-25, 134], 3),
  spot('Everglades', 'wetland', [25.5, -80.9], 5),
  spot('Okavango Delta', 'delta', [-19.3, 22.9], 5),
  spot('Great Barrier Reef', 'reef', [-18.29, 147.7], 2),
  spot('Coral Triangle', 'reef', [-2, 125], 3.5),
  spot('Mesoamerican Barrier Reef System', 'reef', [17.3, -87.8], 4.5),
  spot('Mid-Atlantic Ridge', 'ridge', [25, -45], 2),
  spot('East Pacific Rise', 'ridge', [-15, -112], 2.5),
  spot('Hawaiian–Emperor seamount chain', 'seamount', [33, 171], 3),
  spot('Great Blue Hole', 'cave', [17.32, -87.53], 6),
];
// how close the globe leans before a name shows: the more Wikipedias have an article on it, the sooner.
// The sea floor's features are huge but little written about, so they come out sooner than their fame.
// Small things, a cave or a beach, wait for a close look however famous they are.
const fame = (links, c) => Math.round(Math.max(c.floor || 2.5, Math.min(8, 12 - 1.6*Math.log2(links) - (c.deep ? 1.5 : 0)))*10)/10;
async function catalogue(places, titles){
  const claimed = new Set(), out = [], kept = [...places];
  const near = (name, at) => kept.some(p => p.name === name && arc(p.at[0], p.at[1], at[0], at[1]) < 50);
  for (const c of CATALOGUE) {
    const found = new Map();
    for (const of of c.of) for (const b of await ask(`nature-${c.kind}-${of}`, catalogueQuery(of, c.links))) {
      const id = b.item.value, title = b.title.value, prior = found.get(id);
      if (claimed.has(id) || NOT_NATURE.has(title) || NOT_NATURE.has(nameOf(title)) || NOT_NATURE_LIKE[c.kind]?.test(title)) continue;
      const [lon, lat] = b.coord.value.match(/-?[\d.]+(E-?\d+)?/g).map(Number), el = b.el ? +b.el.value : null, dep = b.dep ? +b.dep.value : null;
      if (!prior) found.set(id, {title, at: [lat, lon].map(v => Math.round(v*100)/100), links: +b.links.value, el, dep, is: new Set(b.is ? [b.is.value] : [])});
      else { if (prior.el == null) prior.el = el; if (prior.dep == null) prior.dep = dep; if (b.is) prior.is.add(b.is.value); }
    }
    const ranked = [...found].sort((a, b) => b[1].links - a[1].links), picked = [];
    for (const [id, f] of ranked) {
      claimed.add(id);
      if (picked.length >= c.take || (!f.at[0] && !f.at[1]) || titles.has(f.title)) continue;
      const name = nameOf(f.title).replace(/, .*$/, '');
      // a hill higher than this is a mountain
      if (near(name, f.at) || (c.kind === 'hill' && f.el > 1500)) continue;
      if (ALSO_IS[c.kind] && !SEASIDE.has(f.title) && [...f.is].some(t => ALSO_IS[c.kind].test(t))) continue;
      const place = {name, kind: c.kind, at: f.at, min: fame(f.links, c), wiki: f.title};
      if (c.kind === 'trench') place.depth = Math.round(Math.max(f.el < 0 ? -f.el : 0, f.dep || 0) || DEPTHS[f.title] || 0) || null;
      else if (f.el > 0 && /hill|mesa|butte|plateau|cliff|glacier/.test(c.kind)) place.elevation = Math.round(f.el);
      picked.push(place); kept.push(place); titles.add(f.title);
    }
    out.push(...picked);
    console.log(`${c.kind}: ${picked.length}`);
  }
  return out;
}

async function buildGeography(){
  const ne = name => features(fetchOnce(NE + name + '.geojson', name + '.geojson'));
  const lines = name => JSON.parse(readFileSync(fetchOnce(NE + name + '.geojson', name + '.geojson'), 'utf8')).features.map(f => ({props: f.properties,
    parts: (f.geometry.type === 'LineString' ? [f.geometry.coordinates] : f.geometry.coordinates).map(l => Float64Array.from(l.flat()))}));
  const countries = ne('ne_50m_admin_0_countries'), regions = ne('ne_50m_geography_regions_polys'), marine = ne('ne_50m_geography_marine_polys');
  const peaks = JSON.parse(readFileSync(fetchOnce(NE + 'ne_10m_geography_regions_elevation_points.geojson', 'ne_10m_geography_regions_elevation_points.geojson'), 'utf8')).features;
  const falls = JSON.parse(readFileSync(fetchOnce(NE + 'ne_50m_geography_regions_points.geojson', 'ne_50m_geography_regions_points.geojson'), 'utf8')).features.filter(f => f.properties.featurecla === 'waterfall');
  const capitals = JSON.parse(readFileSync(fetchOnce(NE + 'ne_110m_populated_places.geojson', 'ne_110m_populated_places.geojson'), 'utf8')).features.filter(f => f.properties.FEATURECLA === 'Admin-0 capital');
  const borders = lines('ne_50m_admin_0_boundary_lines_land'), rivers = lines('ne_50m_rivers_lake_centerlines');
  const lakes = ne('ne_50m_lakes').filter(f => f.props.name && f.props.featurecla !== 'Reservoir');

  const keptPeaks = peaks.filter(f => f.properties.scalerank <= 5 && f.properties.name && /mountain|depression/.test(f.properties.featurecla));
  const titles = await wikiTitles([...countries.map(f => f.props.WIKIDATAID), ...regions.map(f => f.props.WIKIDATAID), ...marine.map(f => f.props.wikidataid),
    ...keptPeaks.map(f => f.properties.wikidataid), ...falls.map(f => f.properties.wikidataid), ...capitals.map(f => f.properties.wikidataid),
    ...lakes.map(f => f.props.wikidataid)]);
  const wiki = id => titles[id] || null;
  const shown = (name, id) => wiki(id) ? nameOf(wiki(id)) : titleCase(name);
  // Natural Earth's min_label is the web-map zoom a name first shows at; places carry it as `min`
  const min = v => Math.round((+v || 0)*10)/10;
  // each country's capital, as a town on the map: Natural Earth's small map knows which the most
  // famous are, and its big one where they all are
  const towns = townsByCountry(), seat = new Map(countries.map(f => [countryId(f.props), capitalTown(f.props, towns)]));
  const famous = new Map(capitals.map(f => [f.properties.wikidataid, f.properties]));
  const capitalTitles = await wikiTitles([...seat.values()].filter(Boolean).map(t => t.WIKIDATAID));
  const capitalPlaces = [...new Map([...seat.values()].filter(Boolean).map(t => [t.WIKIDATAID || t.NAME_EN, t])).values()].map(t => ({name: CAPITAL_NAME[t.NAME_EN] || t.NAME_EN, kind: 'capital',
    at: [t.LATITUDE, t.LONGITUDE].map(v => Math.round(v*100)/100), min: min(famous.get(t.WIKIDATAID)?.MIN_LABEL || Math.max(4, t.MIN_ZOOM || 0)), wiki: capitalTitles[t.WIKIDATAID] || null}));

  // a volcano Natural Earth already has as a peak becomes one, keeping its height
  const fiery = await volcanoes(), volcano = new Set(fiery.map(v => v.title));
  const places = [
    ...regions.filter(f => REGION_KIND[f.props.FEATURECLA] && f.props.NAME).map(f => ({name: shown(f.props.NAME, f.props.WIKIDATAID), kind: REKIND[f.props.NAME] || REGION_KIND[f.props.FEATURECLA],
      at: labelPoint(f.rings.map(r => simplify(r))), min: min(f.props.MIN_LABEL), wiki: wiki(f.props.WIKIDATAID)})),
    ...marine.filter(f => MARINE_KIND[f.props.featurecla] && f.props.name).map(f => ({name: shown(f.props.name, f.props.wikidataid), kind: REKIND[f.props.name] || MARINE_KIND[f.props.featurecla],
      at: labelPoint(f.rings.map(r => simplify(r))), min: min(f.props.min_label), wiki: wiki(f.props.wikidataid)})),
    ...keptPeaks.map(f => ({name: shown(f.properties.name, f.properties.wikidataid), kind: f.properties.featurecla === 'depression' ? 'lowest' : volcano.has(wiki(f.properties.wikidataid)) ? 'volcano' : 'peak',
      at: [f.properties.lat_y, f.properties.long_x].map(v => Math.round(v*100)/100), min: min(f.properties.min_zoom || f.properties.scalerank), wiki: wiki(f.properties.wikidataid), elevation: +f.properties.elevation || null})),
    ...falls.map(f => ({name: shown(f.properties.name, f.properties.wikidataid), kind: 'waterfall', at: [f.properties.lat_y, f.properties.long_x].map(v => Math.round(v*100)/100), min: min(f.properties.min_zoom), wiki: wiki(f.properties.wikidataid)})),
    ...capitalPlaces,
    ...lakes.map(f => ({name: shown(f.props.name, f.props.wikidataid), kind: 'lake', at: labelPoint(f.rings.map(r => simplify(r))), min: min(f.props.min_label), wiki: wiki(f.props.wikidataid)})),
  ];
  const peaked = new Set(places.map(p => p.wiki));
  // the most famous come out with the great ranges' peaks, the rest only close up
  for (const v of fiery) if (!peaked.has(v.title)) places.push({name: nameOf(v.title), kind: 'volcano', at: v.at, min: v.links >= 100 ? 4 : v.links >= 60 ? 4.7 : v.links >= 40 ? 5.3 : 6, wiki: v.title});
  // hand-picked first, so a famous place keeps the kind and spot it was picked with
  const taken = new Set([...places, ...LANDMARKS].map(p => p.wiki).filter(Boolean));
  for (const p of NATURAL_REGIONS) if (!taken.has(p.wiki)) { places.push(p); taken.add(p.wiki); }
  places.push(...await catalogue([...places, ...LANDMARKS], taken));
  const capitalOf = id => seat.get(id) ? CAPITAL_NAME[seat.get(id).NAME_EN] || seat.get(id).NAME_EN : null;
  const out = {
    credits: ['Countries, borders, rivers and place names: Natural Earth, public domain', 'Article links and volcanoes: Wikidata, CC0'],
    countries: countries.map(f => ({id: countryId(f.props), name: english(f.props), ...(f.props.NAME !== english(f.props) && {short: f.props.NAME}), continent: f.props.CONTINENT, at: [f.props.LABEL_Y, f.props.LABEL_X].map(v => Math.round(v*100)/100),
      min: min(f.props.MIN_LABEL), color: f.props.MAPCOLOR7, wiki: wiki(f.props.WIKIDATAID), capital: capitalOf(countryId(f.props)),
      rings: f.rings.map(r => simplify(r, COUNTRY_TOLERANCE)).filter(shapely).map(hundredths)})),
    borders: borders.flatMap(f => f.parts.map(l => hundredths(simplify(l, COUNTRY_TOLERANCE)))),
    rivers: rivers.filter(f => f.props.name).map(f => ({name: titleCase(f.props.name_en || f.props.name), min: min(f.props.min_label || f.props.scalerank + 1), lines: f.parts.map(l => hundredths(simplify(l))).filter(l => l.length >= 4)})).filter(r => r.lines.length),
    places,
  };
  writeFileSync(GEO_OUT, JSON.stringify(out));
  await buildNations(countries, capitalOf, wiki, towns);
  console.log(`wrote ${GEO_OUT}: ${out.countries.length} countries, ${places.length} places, ${(JSON.stringify(out).length/1024).toFixed(0)} KB`);
}

// ---------- nations.json: what a child might ask about a country ----------
const NATIONS_OUT = join(HERE, '../../web/data/nations.json');
const countryId = p => p.ISO_A3 !== '-99' ? p.ISO_A3 : p.ADM0_A3;
// the currencies in use today (ISO 4217); Wikidata also lists the ones a country used to have
const LIVE_MONEY = new Set(`AED AFN ALL AMD ANG AOA ARS AUD AWG AZN BAM BBD BDT BHD BIF BMD BND BOB BRL BSD BTN BWP BYN BZD CAD CDF CHF CLP CNY COP CRC CUP
  CVE CZK DJF DKK DOP DZD EGP ERN ETB EUR FJD FKP GBP GEL GHS GIP GMD GNF GTQ GYD HKD HNL HTG HUF IDR ILS INR IQD IRR ISK JMD JOD JPY KES KGS KHR KMF
  KPW KRW KWD KYD KZT LAK LBP LKR LRD LSL LYD MAD MDL MGA MKD MMK MNT MOP MRU MUR MVR MWK MXN MYR MZN NAD NGN NIO NOK NPR NZD OMR PAB PEN PGK PHP PKR
  PLN PYG QAR RON RSD RUB RWF SAR SBD SCR SDG SEK SGD SHP SLE SOS SRD SSP STN SVC SYP SZL THB TJS TMT TND TOP TRY TTD TWD TZS UAH UGX USD UYU UZS VES
  VND VUV WST XAF XCD XCG XOF XPF YER ZAR ZMW ZWG`.split(/\s+/));
// where Wikidata leaves a country with the wrong money, or none, or too many
const MONEY = {FRA: ['EUR'], DEU: ['EUR'], BGR: ['EUR'], HRV: ['EUR'], CUW: ['XCG'], SXM: ['XCG'], ZWE: ['ZWG', 'USD'], SLE: ['SLE'], PSE: ['ILS', 'JOD'], SLV: ['USD'], CHN: ['CNY'], MAC: ['MOP'], FRO: ['DKK'], HMD: ['AUD'], IOT: ['USD'], SHN: ['SHP'], IMN: ['GBP'], GBR: ['GBP'], PAN: ['PAB', 'USD'], NAM: ['NAD', 'ZAR'], LSO: ['LSL', 'ZAR'],
  KOS: ['EUR'], MNE: ['EUR'], ATA: [], ESH: ['MAD'], ALA: ['EUR'], CYN: ['TRY'], SOL: [], IOA: ['AUD'], ATC: [], KAS: []};
// Wikidata's list of governments mixes up how a country is set up with words about it ('unitary
// state', 'democracy'); Hoot only says how it's set up, first match wins
const GOVERN = [[/absolute monarchy/i, 'absolute-monarchy'], [/theocra|islamic republic|islamic emirate/i, 'theocracy'], [/military junta|military dictatorship/i, 'military'],
  [/monarchy|kingdom|emirate|principality|grand duchy|sultanate/i, 'constitutional-monarchy'], [/one-party|socialist state|people's republic|communist state|marxist/i, 'one-party'],
  [/directorial/i, 'council'], [/semi-presidential/i, 'semi-presidential'], [/presidential/i, 'presidential'], [/parliamentary/i, 'parliamentary']];
// Wikidata says nothing useful for most countries, and is out of date for some; this is how each is
// set up on paper as of 2026. Where the army or a war has taken over, that's what a child is told.
const GOVERNMENT = {VAT: 'absolute-monarchy', CHE: 'council', ATA: 'shared', ESH: 'territory', KAS: 'territory', AFG: 'theocracy', IRN: 'theocracy',
  MMR: 'military', MLI: 'military', BFA: 'military', NER: 'military', GIN: 'military', SDN: 'military', MDG: 'military', GNB: 'military', YEM: 'divided', LBY: 'divided',
  SAU: 'absolute-monarchy', QAT: 'absolute-monarchy', NPL: 'parliamentary', DZA: 'presidential', BOL: 'presidential', COG: 'presidential', AUT: 'parliamentary', KGZ: 'presidential',
  ZWE: 'presidential', VUT: 'parliamentary', FSM: 'presidential', MHL: 'parliamentary', USA: 'presidential', TON: 'constitutional-monarchy', TGO: 'parliamentary', TZA: 'presidential',
  SYR: 'presidential', SUR: 'parliamentary', SSD: 'presidential', SOM: 'parliamentary', SOL: 'presidential', SLB: 'constitutional-monarchy', SVN: 'parliamentary', SYC: 'presidential',
  STP: 'semi-presidential', WSM: 'parliamentary', PRT: 'semi-presidential', PHL: 'presidential', PRY: 'presidential', PNG: 'constitutional-monarchy', PLW: 'presidential',
  NGA: 'presidential', NIC: 'presidential', NRU: 'parliamentary', NAM: 'presidential', MOZ: 'presidential', MNE: 'parliamentary', MDV: 'presidential', MWI: 'presidential',
  KIR: 'presidential', KEN: 'presidential', JOR: 'constitutional-monarchy', JAM: 'constitutional-monarchy', PSE: 'semi-presidential', IRQ: 'parliamentary', IND: 'parliamentary',
  HND: 'presidential', HTI: 'semi-presidential', GRD: 'constitutional-monarchy', GHA: 'presidential', GMB: 'presidential', FJI: 'parliamentary', ETH: 'parliamentary',
  ERI: 'one-party', GNQ: 'presidential', EGY: 'presidential', DOM: 'presidential', DMA: 'parliamentary', DJI: 'presidential', CUB: 'one-party', HRV: 'parliamentary',
  CIV: 'presidential', CRI: 'presidential', COD: 'semi-presidential', COM: 'presidential', COL: 'presidential', CHL: 'presidential', TCD: 'presidential', CAF: 'presidential',
  CMR: 'presidential', LKA: 'presidential', BEN: 'presidential', BEL: 'constitutional-monarchy', ARG: 'presidential', TUV: 'constitutional-monarchy', GAB: 'presidential'};
// countries made of states, provinces or regions that each run some things for themselves
const FEDERAL = new Set(['USA', 'MEX', 'BRA', 'ARG', 'VEN', 'CAN', 'AUS', 'IND', 'PAK', 'NGA', 'ETH', 'SOM', 'SSD', 'DEU', 'AUT', 'BEL', 'CHE', 'RUS', 'BIH', 'MYS', 'ARE',
  'IRQ', 'NPL', 'COM', 'FSM', 'KNA']);
// a neutral sentence for the places countries disagree about
const DISPUTED = {
  KOS: 'Kosovo says it is its own country. Many countries agree, but Serbia and some others say it is part of Serbia.',
  TWN: 'Taiwan runs itself, but China says Taiwan is part of China. Only a few countries call Taiwan a country of its own.',
  ESH: 'Morocco runs most of Western Sahara, but many of the people who live there want it to be a country of its own. The world hasn\'t decided.',
  PSE: 'Palestine is made of two areas, the West Bank and Gaza. Many countries call it a country of its own, and some don\'t. It has been in a long conflict with Israel.',
  CYN: 'Northern Cyprus says it is its own country, but only Turkey agrees. Everyone else says it is part of Cyprus.',
  CYP: 'The northern part of the island is run separately, as Northern Cyprus.',
  SOL: 'Somaliland has run itself since 1991, but almost no other country says it is a country of its own; they count it as part of Somalia.',
  FLK: 'The United Kingdom runs the Falkland Islands, but Argentina says they belong to Argentina.',
  KAS: 'India and Pakistan both say this icy land in the mountains is theirs, and both have soldiers there.',
  AFG: 'The Taliban took control of Afghanistan in 2021. Most countries have not recognised them as its government, so its flag and leaders are disputed.',
  MMR: 'The army took power in Myanmar in 2021, and a civil war has gone on since. Many countries do not accept the army as the rightful government.',
  LBY: 'Since a civil war, two rival governments, one in the west and one in the east, each say they run Libya.',
  YEM: 'A civil war has split Yemen. The Houthis hold the capital, Sanaa, while the government most countries recognise works from Aden.',
  SDN: 'Since 2023, Sudan\'s army and a rival armed group have been fighting a war over who runs the country.',
  VEN: 'Many countries said Venezuela\'s 2024 election was not fair, so who should lead Venezuela is disputed.',
  ISR: 'Israel and the Palestinians have long disagreed about land, borders and who runs some places. Israel calls Jerusalem its capital, but many countries don\'t agree.',
};
// Wikidata's 'inception' is when anything by that name began: Egypt's first pharaohs, or Germany's
// 1949 constitution. Hoot gives the moment a child would recognise as the country beginning.
const ind = (year, from) => ({year, how: 'independence', from}), soviet = ind(1991, 'the Soviet Union'), uk = from => ind(from, 'the United Kingdom'), fr = y => ind(y, 'France');
const FOUNDED = {
  USA: ind(1776, 'Great Britain'), CAN: {year: 1867, how: 'union', from: 'three British colonies'}, MEX: ind(1821, 'Spain'), BRA: ind(1822, 'Portugal'), ARG: ind(1816, 'Spain'),
  CHL: ind(1818, 'Spain'), COL: ind(1810, 'Spain'), PER: ind(1821, 'Spain'), VEN: ind(1811, 'Spain'), BOL: ind(1825, 'Spain'), PRY: ind(1811, 'Spain'), URY: ind(1825, 'Brazil'),
  ECU: ind(1830, 'Gran Colombia'), PAN: ind(1903, 'Colombia'), HTI: ind(1804, 'France'), DOM: ind(1844, 'Haiti'), CUB: {year: 1902, how: 'founded'}, JAM: uk(1962),
  GBR: {year: 1707, how: 'union', from: 'England and Scotland'}, IRL: uk(1922), FRA: {year: 843, how: 'founded'}, DEU: {year: 1871, how: 'unification'}, ITA: {year: 1861, how: 'unification'},
  ESP: {year: 1479, how: 'union', from: 'the kingdoms of Castile and Aragon'}, PRT: {year: 1143, how: 'founded'}, NLD: ind(1581, 'Spain'), BEL: ind(1830, 'the Netherlands'),
  CHE: {year: 1291, how: 'union', from: 'three mountain valleys'}, AUT: {year: 1918, how: 'republic'}, POL: {year: 966, how: 'founded'}, GRC: ind(1830, 'the Ottoman Empire'),
  TUR: {year: 1923, how: 'republic'}, RUS: {year: 862, how: 'founded'}, UKR: soviet, BLR: soviet, MDA: soviet, GEO: soviet, ARM: soviet, AZE: soviet, KAZ: soviet, UZB: soviet,
  TKM: soviet, KGZ: soviet, TJK: soviet, EST: ind(1918, 'the Russian Empire'), LVA: ind(1918, 'the Russian Empire'), LTU: ind(1918, 'the Russian Empire'), FIN: ind(1917, 'Russia'),
  CZE: {year: 1993, how: 'split', from: 'Czechoslovakia'}, SVK: {year: 1993, how: 'split', from: 'Czechoslovakia'}, SVN: ind(1991, 'Yugoslavia'), HRV: ind(1991, 'Yugoslavia'),
  BIH: ind(1992, 'Yugoslavia'), MKD: ind(1991, 'Yugoslavia'), SRB: {year: 2006, how: 'split', from: 'Serbia and Montenegro'}, MNE: ind(2006, 'Serbia and Montenegro'),
  KOS: ind(2008, 'Serbia'), NOR: ind(1905, 'Sweden'), SWE: ind(1523, 'the Kalmar Union'), DNK: {year: 950, how: 'founded'}, ISL: ind(1944, 'Denmark'), HUN: {year: 1000, how: 'founded'},
  ROU: {year: 1859, how: 'union', from: 'Moldavia and Wallachia'}, BGR: {year: 681, how: 'founded'}, VAT: {year: 1929, how: 'founded'},
  CHN: {year: 1949, how: 'revolution'}, JPN: {year: 300, how: 'ancient'}, KOR: {year: 1948, how: 'split', from: 'Korea'}, PRK: {year: 1948, how: 'split', from: 'Korea'},
  TWN: {year: 1912, how: 'republic'}, MNG: ind(1911, 'China'), IND: uk(1947), PAK: uk(1947), BGD: ind(1971, 'Pakistan'), LKA: uk(1948), MMR: uk(1948), NPL: {year: 1768, how: 'unification'},
  VNM: fr(1945), LAO: fr(1953), KHM: fr(1953), THA: {year: 1238, how: 'ancient'}, IDN: ind(1945, 'the Netherlands'), MYS: uk(1957), SGP: ind(1965, 'Malaysia'),
  PHL: ind(1946, 'the United States'), TLS: ind(2002, 'Indonesia'), AUS: {year: 1901, how: 'union', from: 'six British colonies'}, NZL: {year: 1907, how: 'founded'},
  EGY: {year: -3100, how: 'ancient'}, IRN: {year: -550, how: 'ancient'}, IRQ: uk(1932), SAU: {year: 1932, how: 'unification'}, ISR: uk(1948), JOR: uk(1946), SYR: fr(1946), LBN: fr(1943),
  ARE: {year: 1971, how: 'union', from: 'seven emirates'}, QAT: uk(1971), KWT: uk(1961), AFG: uk(1919), ETH: {year: 100, how: 'ancient'},
  NGA: uk(1960), KEN: uk(1963), ZAF: {year: 1910, how: 'union', from: 'four British colonies'}, GHA: uk(1957), MAR: fr(1956), DZA: fr(1962), TUN: fr(1956), LBY: {year: 1951, how: 'founded'},
  TZA: {year: 1964, how: 'union', from: 'Tanganyika and Zanzibar'}, UGA: uk(1962), COD: ind(1960, 'Belgium'), SEN: fr(1960), CMR: fr(1960), CIV: fr(1960), MDG: fr(1960),
  AGO: ind(1975, 'Portugal'), MOZ: ind(1975, 'Portugal'), ZWE: uk(1980), NAM: ind(1990, 'South Africa'), SDN: ind(1956, 'the United Kingdom and Egypt'), SSD: ind(2011, 'Sudan'),
  ERI: ind(1993, 'Ethiopia'), SOM: {year: 1960, how: 'founded'},
  YEM: {year: 1990, how: 'union', from: 'North and South Yemen'}, BRB: uk(1966), BRN: uk(1984), BTN: {year: 1634, how: 'unification'}, ALB: ind(1912, 'the Ottoman Empire'),
  GIN: fr(1958), TGO: fr(1960), NER: fr(1960), MLI: fr(1960), MRT: fr(1960), GAB: fr(1960), COG: fr(1960), TCD: fr(1960), CAF: fr(1960), BFA: fr(1960), BEN: fr(1960),
  DJI: fr(1977), COM: fr(1975), RWA: ind(1962, 'Belgium'), BDI: ind(1962, 'Belgium'), ZMB: uk(1964), MWI: uk(1964), BWA: uk(1966), LSO: uk(1966), SWZ: uk(1968),
  MUS: uk(1968), SYC: uk(1976), GMB: uk(1965), SLE: uk(1961), GUY: uk(1966), TTO: uk(1962), BHS: uk(1973), BLZ: uk(1981), ATG: uk(1981), DMA: uk(1978), LCA: uk(1979),
  VCT: uk(1979), KNA: uk(1983), GRD: uk(1974), MLT: uk(1964), CYP: uk(1960), BHR: uk(1971), OMN: ind(1650, 'Portugal'), FJI: uk(1970), SLB: uk(1978), TUV: uk(1978),
  KIR: uk(1979), VUT: ind(1980, 'the United Kingdom and France'), NRU: ind(1968, 'Australia'), PNG: ind(1975, 'Australia'), WSM: ind(1962, 'New Zealand'), TON: uk(1970),
  PLW: ind(1994, 'the United States'), FSM: ind(1986, 'the United States'), MHL: ind(1986, 'the United States'), SUR: ind(1975, 'the Netherlands'), CPV: ind(1975, 'Portugal'),
  STP: ind(1975, 'Portugal'), GNB: ind(1973, 'Portugal'), GNQ: ind(1968, 'Spain'), LBR: {year: 1847, how: 'founded'}, NIC: ind(1821, 'Spain'), HND: ind(1821, 'Spain'),
  GTM: ind(1821, 'Spain'), CRI: ind(1821, 'Spain'), SLV: ind(1821, 'Spain'), MDV: uk(1965),
};

// The towns Natural Earth knows, by country. A town's people are counted the UN's way, the whole
// built-up area, where that's known; Natural Earth's own biggest counts are of whole regions, which
// would put Stuttgart ahead of Munich.
function townsByCountry(){
  const all = JSON.parse(readFileSync(fetchOnce(NE + 'ne_10m_populated_places.geojson', 'ne_10m_populated_places.geojson'), 'utf8')).features.map(f => f.properties);
  const by = new Map();
  for (const t of all) if (people(t) > 0) (by.get(t.ADM0_A3) || by.set(t.ADM0_A3, []).get(t.ADM0_A3)).push(t);
  return by;
}
const people = t => t.POP2020 ? t.POP2020*1000 : t.POP_MIN;
// which town is the capital, where Natural Earth names two or more, is out of date, or has none
const CAPITAL = {MMR: 'Naypyidaw', NLD: 'Amsterdam', BOL: 'Sucre', ZAF: 'Pretoria', CIV: 'Yamoussoukro', LKA: 'Sri Jayawardenepura Kotte', MYS: 'Kuala Lumpur',
  NGA: 'Abuja', ISR: 'Jerusalem', GRL: 'Nuuk', CYN: null, PSE: null, ESH: null, KAS: null, ATA: null, HKG: null, MAC: null};
const CAPITAL_NAME = {'Nur-Sultan': 'Astana', 'Washington': 'Washington, D.C.'};
// Natural Earth's towns sometimes use a different code for the country than its countries do (South Sudan)
const townsOf = (p, towns) => towns.get(p.ADM0_A3) || towns.get(countryId(p)) || [];
function capitalTown(p, towns){
  const id = countryId(p), list = townsOf(p, towns);
  if (id in CAPITAL) return CAPITAL[id] && (list.find(t => t.NAME_EN === CAPITAL[id]) || [...towns.values()].flat().find(t => t.NAME_EN === CAPITAL[id] && t.FEATURECLA.startsWith('Admin-0'))) || null;
  return list.find(t => t.FEATURECLA === 'Admin-0 capital') || null;
}
const nationQuery = (ids, body, vars) => `SELECT ?c ${vars} WHERE { VALUES ?c { ${ids.map(id => 'wd:' + id).join(' ')} } ${body} }`;
const label = v => `?${v} rdfs:label ?${v}Name FILTER(lang(?${v}Name) = "en")`;

// Natural Earth's Palestine is the region; its facts are the State of Palestine's
const WIKIDATA = {PSE: 'Q219060'};
// the languages a child would hear there, where Wikidata lists every language the law names
const LANGUAGES = {USA: ['English'], CHN: ['Mandarin Chinese'], TWN: ['Mandarin Chinese'], HKG: ['Chinese', 'English'], MAC: ['Chinese', 'Portuguese'], AFG: ['Pashto', 'Dari']};
const LANGUAGE_NAME = {'Standard Chinese': 'Mandarin Chinese', 'Putonghua': 'Mandarin Chinese'};

async function buildNations(countries, capitalOf, wiki, towns){
  const qOf = p => WIKIDATA[countryId(p)] || p.WIKIDATAID;
  const ids = countries.map(f => qOf(f.props)).filter(Boolean);
  const rows = async (name, body, vars) => (await ask(`nations-${name}`, nationQuery(ids, body, vars))).map(b => Object.fromEntries(Object.entries(b).map(([k, v]) => [k, v.value.replace('http://www.wikidata.org/entity/', '')])));
  const group = list => list.reduce((m, r) => (m.get(r.c) || m.set(r.c, []).get(r.c)).push(r) && m, new Map());
  const [basics, counts, money, govts, tongues, highs] = [
    group(await rows('basics', 'OPTIONAL { ?c wdt:P41 ?flag } OPTIONAL { ?c p:P2046/psn:P2046/wikibase:quantityAmount ?area } OPTIONAL { ?c wdt:P571 ?inception }', '?flag ?area ?inception')),
    group(await rows('population', '?c p:P1082 ?s. ?s ps:P1082 ?pop. OPTIONAL { ?s pq:P585 ?when }', '?pop ?when')),
    group(await rows('money', `{ ?c wdt:P38 ?cur } UNION { ?cur wdt:P17 ?c. ?cur wdt:P31/wdt:P279* wd:Q8142 } ?cur wdt:P498 ?code.
      ?article schema:about ?cur; schema:isPartOf <https://en.wikipedia.org/>; schema:name ?title.`, '?code ?title')),
    group(await rows('government', `?c wdt:P122 ?g. ${label('g')}`, '?gName')),
    group(await rows('languages', `?c wdt:P37 ?l. ${label('l')} ?l wikibase:sitelinks ?links.`, '?lName ?links')),
    group(await rows('highest', `?c wdt:P610 ?h. ${label('h')} OPTIONAL { ?h p:P2044/psn:P2044/wikibase:quantityAmount ?el }`, '?hName ?el')),
  ];
  const biggest = p => [...townsOf(p, towns)].sort((a, b) => people(b) - people(a));
  const moneyTitle = new Map([...money.values()].flat().map(r => [r.code, r.title]));
  const cityTitles = await wikiTitles(countries.flatMap(f => biggest(f.props).slice(0, 8).map(p => p.WIKIDATAID)));
  const out = {}, unsure = [];
  for (const f of countries) {
    const p = f.props, id = countryId(p), q = qOf(p), b = (basics.get(q) || [])[0] || {};
    const sovereign = p.SOVEREIGNT !== p.ADMIN && !['Israel', 'Kashmir'].includes(p.SOVEREIGNT) ? p.SOVEREIGNT.replace(/^United States of America$/, 'the United States').replace(/^United Kingdom$/, 'the United Kingdom').replace(/^Netherlands$/, 'the Netherlands') : null;
    // the latest count, or failing a date, the biggest
    const pops = (counts.get(q) || []).map(r => ({n: +r.pop, when: r.when ? +r.when.slice(0, 4) : 0})).sort((a, b) => b.when - a.when || b.n - a.n);
    const codes = MONEY[id] || [...new Set((money.get(q) || []).map(r => r.code))].filter(c => LIVE_MONEY.has(c));
    const titleOf = moneyTitle;
    const said = (govts.get(q) || []).map(r => r.gName).join('; ');
    const government = GOVERNMENT[id] || (sovereign ? 'territory' : GOVERN.find(([re]) => re.test(said))?.[1]) || null;
    if (!government) unsure.push(`${id} government: ${said || 'none'}`);
    if (codes.length !== 1 && !MONEY[id]) unsure.push(`${id} money: ${codes.join(',') || 'none'}`);
    const capital = capitalOf(id);
    const cities = biggest(p).filter((c, i, all) => all.findIndex(o => o.NAME_EN === c.NAME_EN) === i);
    const capitalCity = cities.find(c => (CAPITAL_NAME[c.NAME_EN] || c.NAME_EN) === capital);
    const top = [...new Set([...cities.slice(0, 6), capitalCity].filter(Boolean))].sort((a, b) => people(b) - people(a));
    const high = (highs.get(q) || []).map(r => ({name: nameOf(r.hName), elevation: r.el ? Math.round(+r.el) : null})).sort((a, b) => (b.elevation || 0) - (a.elevation || 0))[0];
    const founded = FOUNDED[id] || (sovereign || !b.inception ? null : {year: +b.inception.match(/^-?\d+/)[0], how: 'founded'});
    // Wikidata gives land and total areas, and now and then one that is wildly wrong (Taiwan as big as Africa)
    const areas = (basics.get(q) || []).map(r => +r.area || 0).filter(Boolean).sort((a, b) => a - b), area = areas.filter(a => a <= areas[0]*1.5).pop() || 0;
    out[id] = {
      name: english(p), flag: b.flag ? decodeURIComponent(b.flag.replace(/^.*\/Special:FilePath\//, '')) : null,
      population: pops[0]?.n || p.POP_EST || null, populationYear: pops[0]?.when || (pops[0] ? null : p.POP_YEAR) || null,
      area: area ? Math.round(area/1e6) : null, capital,
      cities: top.map(c => ({name: CAPITAL_NAME[c.NAME_EN] || c.NAME_EN, at: [c.LATITUDE, c.LONGITUDE].map(v => Math.round(v*100)/100), population: people(c), wiki: cityTitles[c.WIKIDATAID] || null})),
      currency: codes.map(code => ({name: nameOf(titleOf.get(code) || code), code, wiki: titleOf.get(code) || null})),
      government, ...(FEDERAL.has(id) && {federal: true}), founded,
      languages: LANGUAGES[id] || [...new Set((tongues.get(q) || []).sort((a, b) => b.links - a.links).map(r => LANGUAGE_NAME[r.lName] || r.lName))].slice(0, 6),
      ...(sovereign && {sovereign}), ...(DISPUTED[id] && {disputed: DISPUTED[id]}), highest: high || null, wiki: id === 'PSE' ? 'State of Palestine' : wiki(p.WIKIDATAID),
    };
  }
  if (unsure.length) console.log('nations: check these\n  ' + unsure.join('\n  '));
  writeFileSync(NATIONS_OUT, JSON.stringify(out));
  console.log(`wrote ${NATIONS_OUT}: ${Object.keys(out).length} nations, ${(JSON.stringify(out).length/1024).toFixed(0)} KB`);
}

build();
await buildGeography();
