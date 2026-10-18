// Builds web/data/earth.json, the geography behind the globe: Natural Earth coastlines and lakes for
// drawing and telling land from sea, RESOLVE's ecoregions on a half-degree grid for what grows where,
// and the coral reef zones, drawn by hand.
//
//   node tools/earth/build.mjs        (from lantern-hill/; sources download once into tools/earth/cache)
//
// Needs `curl` and `unzip`. The ecoregions download is ~150 MB.

import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url)), CACHE = join(HERE, 'cache');
const OUT = join(HERE, '../../web/data/earth.json');
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
function simplify(r){
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
    if (far > TOLERANCE) { keep[at] = 1; stack.push([a, at], [at, b]); }
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
  const landRings = features(land).flatMap(f => f.rings).map(simplify).filter(shapely);
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
build();
