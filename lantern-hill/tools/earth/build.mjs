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
async function volcanoes(){
  const p = join(CACHE, 'volcanoes.json');
  if (!existsSync(p)) {
    console.log('asking wikidata for volcanoes');
    const r = await fetch(`https://query.wikidata.org/sparql?format=json&query=${encodeURIComponent(VOLCANOES)}`, {headers: {'User-Agent': 'LanternHill-earth-build/1.0 (educational game)'}});
    if (!r.ok) throw new Error(`wikidata query: ${r.status}`);
    writeFileSync(p, await r.text());
  }
  const seen = new Map();
  for (const b of JSON.parse(readFileSync(p, 'utf8')).results.bindings) {
    const [lon, lat] = b.coord.value.match(/-?[\d.]+/g).map(Number);
    // Wikidata doesn't always say a volcanic island is an island, but its name does
    if (!seen.has(b.item.value) && !/\bIslands?\b/.test(b.title.value)) seen.set(b.item.value, {title: b.title.value, at: [lat, lon].map(v => Math.round(v*1000)/1000), links: +b.links.value});
  }
  return [...seen.values()].sort((a, b) => b.links - a.links);
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
    ...capitals.map(f => ({name: f.properties.NAME.replace(/\s+/g, ' '), kind: 'capital', at: [f.geometry.coordinates[1], f.geometry.coordinates[0]].map(v => Math.round(v*100)/100),
      min: min(f.properties.MIN_LABEL || 3), wiki: wiki(f.properties.wikidataid)})),
    ...lakes.map(f => ({name: shown(f.props.name, f.props.wikidataid), kind: 'lake', at: labelPoint(f.rings.map(r => simplify(r))), min: min(f.props.min_label), wiki: wiki(f.props.wikidataid)})),
  ];
  const peaked = new Set(places.map(p => p.wiki));
  // the most famous come out with the great ranges' peaks, the rest only close up
  for (const v of fiery) if (!peaked.has(v.title)) places.push({name: nameOf(v.title), kind: 'volcano', at: v.at, min: v.links >= 100 ? 4 : v.links >= 60 ? 4.7 : v.links >= 40 ? 5.3 : 6, wiki: v.title});
  const capitalOf = new Map(capitals.map(f => [f.properties.ISO_A2, f.properties.NAME.replace(/\s+/g, ' ')]));
  const out = {
    credits: ['Countries, borders, rivers and place names: Natural Earth, public domain', 'Article links and volcanoes: Wikidata, CC0'],
    countries: countries.map(f => ({name: english(f.props), ...(f.props.NAME !== english(f.props) && {short: f.props.NAME}), continent: f.props.CONTINENT, at: [f.props.LABEL_Y, f.props.LABEL_X].map(v => Math.round(v*100)/100),
      min: min(f.props.MIN_LABEL), color: f.props.MAPCOLOR7, wiki: wiki(f.props.WIKIDATAID), capital: capitalOf.get(f.props.ISO_A2_EH) || null,
      rings: f.rings.map(r => simplify(r, COUNTRY_TOLERANCE)).filter(shapely).map(hundredths)})),
    borders: borders.flatMap(f => f.parts.map(l => hundredths(simplify(l, COUNTRY_TOLERANCE)))),
    rivers: rivers.filter(f => f.props.name).map(f => ({name: titleCase(f.props.name_en || f.props.name), min: min(f.props.min_label || f.props.scalerank + 1), lines: f.parts.map(l => hundredths(simplify(l))).filter(l => l.length >= 4)})).filter(r => r.lines.length),
    places,
  };
  writeFileSync(GEO_OUT, JSON.stringify(out));
  console.log(`wrote ${GEO_OUT}: ${out.countries.length} countries, ${places.length} places, ${(JSON.stringify(out).length/1024).toFixed(0)} KB`);
}

build();
await buildGeography();
