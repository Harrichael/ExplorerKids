// The sharp ground of a world, streamed in as a kid comes close. The map a globe ships with is a few
// thousand pixels round; the spacecraft maps behind it are tens of thousands. CDS serves those as
// HiPS, the same tiled pyramids the star view streams, cut on the HEALPix grid: twelve curved faces,
// each split in four, and in four again, down to the sharpest the mission took. Only the tiles on
// screen are fetched, each no sharper than the screen can show, laid over the globe where they belong.
//
//   const ground = streamed(globe, {path:'Planets/CDS_P_Moon_LROC-WAC-100m', order:6, ext:'jpg'}, redraw);
//   ground.update(camera, radiansPerPixel);   // before each render
//   ground.use({path:'…', order:11, ext:'png', own:true});   // another survey: `own` when it isn't
//                                                            // the picture the globe already wears
//   globe.add(cells({3:[20, 21, 63]}, material));           // HEALPix cells, as a MOC lists them
//
// `globe` is a unit sphere wearing an east-from-180°W map, as three's SphereGeometry lays one on.

import * as THREE from 'three';

const CDS = 'https://alasky.cds.unistra.fr/';
const W = 512, JRLL = [2, 2, 2, 2, 3, 3, 3, 3, 4, 4, 4, 4], JPLL = [1, 3, 5, 7, 0, 2, 4, 6, 1, 3, 5, 7];
// a tile's pixels at order k are about this many radians of the globe across
const texel = k => 1.0233/(W << k);

// a point of HEALPix face f, at (x, y) across it from 0 to 1, on the unit sphere in the globe's axes:
// longitude 0 on +x, east toward -z, north up +y, which is where three's sphere puts the map
function onSphere(f, x, y, out){
  const jr = JRLL[f] - x - y;
  let nr = 1, z;
  if (jr < 1) { nr = jr; z = 1 - nr*nr/3; } else if (jr > 3) { nr = 4 - jr; z = nr*nr/3 - 1; } else z = (2 - jr)*2/3;
  const lon = Math.PI/4*(JPLL[f] + (nr > 1e-9 ? (x - y)/nr : 0)), c = Math.sqrt(Math.max(0, 1 - z*z));
  return out.set(c*Math.cos(lon), z, -c*Math.sin(lon));
}
// where tile n of order k sits: its face, and its corner on that face's grid
function cell(k, n){
  const p = n & ((1 << 2*k) - 1);
  let ix = 0, iy = 0;
  for (let b = 0; b < k; b++) { ix |= ((p >> 2*b) & 1) << b; iy |= ((p >> 2*b + 1) & 1) << b; }
  return {f: n >> 2*k, ix, iy, side: 1 << k};
}

// Down a tile's rows runs the face's x, and across its columns the face's y (found by fitting
// tiles against the maps cut from the same surveys)
function sheet(k, n){
  // enough rows that each flat strip sags less than the lift below, or the globe pokes through
  const segs = Math.max(4, Math.ceil(80/(1 << k)));
  const {f, ix, iy, side} = cell(k, n), pos = [], uv = [], index = [], v = new THREE.Vector3();
  for (let i = 0; i <= segs; i++) for (let j = 0; j <= segs; j++) {
    onSphere(f, (ix + i/segs)/side, (iy + j/segs)/side, v).multiplyScalar(LIFT);
    pos.push(v.x, v.y, v.z); uv.push(j/segs, 1 - i/segs);
  }
  for (let i = 0; i < segs; i++) for (let j = 0; j < segs; j++) {
    const a = i*(segs + 1) + j, b = a + segs + 1;
    index.push(a, b, a + 1, a + 1, b, b + 1);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(index); g.computeVertexNormals();
  return g;
}
// a hair above the globe, so its own flat facets stay under the tiles
const LIFT = 1.00005;

// what's needed to judge a tile without building it: its middle, and how far its corners reach
const shapes = new Map();
function shape(k, n){
  const key = k + '/' + n;
  if (shapes.has(key)) return shapes.get(key);
  const {f, ix, iy, side} = cell(k, n), mid = onSphere(f, (ix + .5)/side, (iy + .5)/side, new THREE.Vector3()), v = new THREE.Vector3();
  let reach = 0;
  for (const [a, b] of [[0, 0], [1, 0], [0, 1], [1, 1]]) reach = Math.max(reach, onSphere(f, (ix + a)/side, (iy + b)/side, v).distanceTo(mid));
  const s = {mid, reach};
  if (shapes.size > 20000) shapes.clear();
  shapes.set(key, s);
  return s;
}

const loader = new THREE.TextureLoader(); loader.setCrossOrigin('anonymous');
const KEEP = 60, AT_ONCE = 6;

// the cells a MOC lists, {order: [tile, …]}, as one mesh each over the globe
export function cells(moc, material){
  const g = new THREE.Group();
  for (const k in moc) for (const n of moc[k]) g.add(new THREE.Mesh(sheet(+k, n), material));
  return g;
}

export function streamed(globe, hips, arrived){
  const group = new THREE.Group(), queue = [];
  let tiles = new Map();
  globe.add(group);
  let busy = 0, frame = 0, base = 0;
  const cam = new THREE.Vector3(), frustum = new THREE.Frustum(), m = new THREE.Matrix4(), world = new THREE.Sphere();

  function fetch(t){
    if (t.state) return;
    t.state = 'queued'; queue.push(t);
    pump();
  }
  function pump(){
    // nearest-to-wanted first: a tile asked for this frame beats one left over from a zoom long gone
    queue.sort((a, b) => b.asked - a.asked || a.k - b.k);
    while (busy < AT_ONCE && queue.length) {
      const t = queue.shift();
      if (t.asked < frame - 30) { t.state = null; continue; }
      busy++;
      loader.load(`${CDS}${hips.path}/Norder${t.k}/Dir${Math.floor(t.n/10000)*10000}/Npix${t.n}.${hips.ext}`, tex => {
        busy--;
        if (tiles.get(t.key) !== t) { tex.dispose(); pump(); return; }   // from a survey since put away
        tex.encoding = THREE.sRGBEncoding; tex.anisotropy = 4;
        t.mesh = new THREE.Mesh(sheet(t.k, t.n),
          new THREE.MeshLambertMaterial({map:tex, transparent:true, depthWrite:false}));
        // finer tiles paint over coarser ones that are still standing in for their neighbours
        t.mesh.renderOrder = t.k; t.mesh.visible = false; group.add(t.mesh);
        t.state = 'ready'; arrived(); pump();
      }, undefined, () => { busy--; t.state = 'failed'; pump(); });
    }
  }
  const tile = (k, n) => {
    const key = k + '/' + n;
    if (!tiles.has(key)) tiles.set(key, {k, n, key, state:null, mesh:null, asked:0, shown:0});
    return tiles.get(key);
  };
  // the sharpest loaded tile at or above this one, to stand in while it comes
  function standIn(k, n){
    for (; k > base; k--, n >>= 2) { const t = tiles.get(k + '/' + n); if (t && t.state === 'ready') return t; }
    return null;
  }

  function update(camera, perPixel){
    frame++;
    // the shipped map already shows this sharp, so tiles coarser than it would add nothing; an
    // equator of HEALPix at order k is 2048 << k pixels round. Another survey covers it all.
    base = hips.own ? -1 : Math.max(0, Math.round(Math.log2((globe.material.map?.image?.width || 0)/2048)));
    globe.updateMatrixWorld();
    cam.copy(camera.position); globe.worldToLocal(cam);
    const horizon = Math.acos(Math.min(1, 1/cam.length())), up = cam.clone().normalize(), scale = globe.matrixWorld.getMaxScaleOnAxis();
    frustum.setFromProjectionMatrix(m.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse));
    const show = new Set();
    const visit = (k, n) => {
      const s = shape(k, n), spread = 2*Math.asin(Math.min(1, s.reach/2));
      // over the horizon, or off the screen
      if (Math.acos(Math.max(-1, Math.min(1, s.mid.dot(up)))) - spread > horizon) return;
      world.center.copy(s.mid).applyMatrix4(globe.matrixWorld); world.radius = s.reach*scale;
      if (!frustum.intersectsSphere(world)) return;
      const near = Math.max(1e-5, cam.distanceTo(s.mid) - s.reach);
      if (k < hips.order && texel(k)/near > perPixel*1.2) { for (let i = 0; i < 4; i++) visit(k + 1, n*4 + i); return; }
      if (k <= base) return;
      const t = tile(k, n); t.asked = frame;
      if (t.state === 'ready') show.add(t);
      else { fetch(t); const stand = standIn(k - 1, n >> 2); if (stand) show.add(stand); }
    };
    for (let n = 0; n < 12; n++) visit(0, n);
    for (const t of tiles.values()) if (t.mesh) { t.mesh.visible = show.has(t); if (t.mesh.visible) t.shown = frame; }
    if (tiles.size > KEEP) {
      const old = [...tiles.values()].filter(t => t.state !== 'queued' && !show.has(t)).sort((a, b) => a.shown - b.shown);
      for (const t of old.slice(0, tiles.size - KEEP)) { drop(t); tiles.delete(t.key); }
    }
  }
  function drop(t){
    if (t.mesh) { group.remove(t.mesh); t.mesh.geometry.dispose(); t.mesh.material.map.dispose(); t.mesh.material.dispose(); }
  }
  function use(next){
    if (next === hips) return;
    for (const t of tiles.values()) drop(t);
    hips = next; tiles = new Map(); queue.length = 0;
  }
  const hide = () => { for (const t of tiles.values()) if (t.mesh) t.mesh.visible = false; };
  return {update, use, hide};
}
