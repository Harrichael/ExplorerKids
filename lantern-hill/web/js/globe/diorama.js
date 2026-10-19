// The pop-up diorama: a place's food web as a little island that rises out of the globe. It is
// drawn as a web, not a pyramid: everyone stands on the flat island, plants and algae nearest the
// sun and each animal a row behind the farthest thing it eats, so arrows mostly run one way. Arrows
// run from food to eater with glowing specks riding them, the way energy moves, starting from the sun.
//
// One diorama at a time. It rises empty but for the sun; the globe calls in its living things as
// Hoot's lesson builds the web, and dresses it for each part: marks on guesses, arrows that grow
// in, animals that vanish or multiply.

import * as THREE from 'three';
import { C, T, glowTex, outline, sparkTex, tex } from '../core/kit.js';
import { BIOMES } from '../earth/biomes.js';
import { eatenBy, layout } from './food-web.js';

const TOKEN = .18, ASPECT = 320/256, DISC = .6125*TOKEN*ASPECT, RIM = TOKEN*.42;
const SPACE = .21, DEPTH = .4, ISLAND = .07;
const COL = {edge: 0xefe0bf, food: 0x8fd694, eater: 0xf2a65a, sun: 0xffd25a};
const EMOJI = '"Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif';

let D = null;            // the diorama on show: {root, tokens, edges, …}
let leaving = null;      // one shrinking away while the next grows

const rng = s => () => (s = s*16807 % 2147483647)/2147483647;
const hash = str => [...str].reduce((h, c) => (h*31 + c.charCodeAt(0)) % 2147483646, 7) + 1;

function label(g, lines, y, size){
  const x = g.canvas.width/2;
  g.font = `800 ${size}px Nunito, "Segoe UI", sans-serif`; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.lineJoin = 'round'; g.lineWidth = size*.28; g.strokeStyle = '#1a1320'; g.fillStyle = '#efe0bf';
  lines.forEach((t, i) => { g.strokeText(t, x, y + i*size*1.05); g.fillText(t, x, y + i*size*1.05); });
}
function tokenTex(s){
  const words = s.name.split(' '), half = Math.ceil(words.length/2);
  const lines = s.name.length > 11 && words.length > 1 ? [words.slice(0, half).join(' '), words.slice(half).join(' ')] : [s.name];
  const t = tex(256, 320, g => {
    g.fillStyle = '#1a1320'; g.beginPath(); g.arc(128, 124, 110, 0, 7); g.fill();
    g.fillStyle = s.eats.length ? '#f6ecd6' : '#cfe6b8'; g.beginPath(); g.arc(128, 124, 100, 0, 7); g.fill();
    g.font = `118px ${EMOJI}`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(s.icon, 128, 134);
    label(g, lines, lines.length > 1 ? 262 : 278, 36);
  });
  t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping; return t;
}
const BADGE = {guess: ['?', '#d9a441'], right: ['✓', '#3e9b54'], wrong: ['✗', '#c4473a'], missed: ['!', '#e0802e']};
const badgeTex = {};
for (const [k, [ch, bg]] of Object.entries(BADGE)) {
  badgeTex[k] = tex(96, 96, g => {
    g.fillStyle = '#1a1320'; g.beginPath(); g.arc(48, 48, 46, 0, 7); g.fill(); g.fillStyle = bg; g.beginPath(); g.arc(48, 48, 39, 0, 7); g.fill();
    g.fillStyle = '#fff8e8'; g.font = '900 58px Nunito, "Segoe UI", sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(ch, 48, 52);
  });
  badgeTex[k].wrapS = badgeTex[k].wrapT = THREE.ClampToEdgeWrapping;
}
const sunTex = tex(128, 128, g => {
  g.translate(64, 64); g.fillStyle = '#ffd25a'; g.strokeStyle = '#1a1320'; g.lineWidth = 5;
  for (let i = 0; i < 10; i++) { g.rotate(Math.PI/5); g.beginPath(); g.moveTo(-9, 34); g.lineTo(0, 60); g.lineTo(9, 34); g.closePath(); g.fill(); g.stroke(); }
  g.beginPath(); g.arc(0, 0, 34, 0, 7); g.fill(); g.stroke();
});
sunTex.wrapS = sunTex.wrapT = THREE.ClampToEdgeWrapping;

// ---------- scenery: a few props that say which biome this is ----------
const WOOD = T(C.woodLt), ROCK = T(0x8a8090), SNOW = T(0xf4f8fb), SAND = T(0xe3c486), POND = T(0x4a8ab8);
const PROP = {
  tree: (g, c) => { stem(g, .07); outline(ball(g, .05, c, 0, .11, 0), 1.08); ball(g, .035, c, .03, .14, .01); },
  pine: (g, c) => { stem(g, .05); outline(cone(g, .05, .12, c, .1), 1.08); cone(g, .036, .09, c, .16); },
  acacia: (g, c) => { stem(g, .11); outline(ball(g, .045, c, 0, .12, 0), 1.08).scale.set(1.7, .38, 1.5); },
  bush: (g, c) => { outline(ball(g, .035, c, 0, .022, 0), 1.1).scale.y = .7; },
  grass: (g, c) => { for (let i = 0; i < 3; i++) { const b = cone(g, .008, .06, c, .03); b.position.x = (i - 1)*.012; b.rotation.z = (i - 1)*.35; } },
  reed: (g, c) => { for (let i = 0; i < 3; i++) { const r = mesh(g, new THREE.CylinderGeometry(.003, .003, .1, 4), T(c), (i - 1)*.012, .05, 0); r.rotation.z = (i - 1)*.15; mesh(g, new THREE.CylinderGeometry(.007, .007, .025, 6), T(0x7a4a2a), (i - 1)*.012 + (i - 1)*.012, .1, 0); } },
  cactus: (g, c) => { const m = T(c); outline(mesh(g, new THREE.CylinderGeometry(.017, .017, .12, 8), m, 0, .06, 0), 1.1);
    for (const s of [-1, 1]) { mesh(g, new THREE.CylinderGeometry(.011, .011, .035, 6), m, s*.03, .06 + s*.01, 0).rotation.z = Math.PI/2; mesh(g, new THREE.CylinderGeometry(.01, .01, .04, 6), m, s*.045, .08 + s*.01, 0); } },
  rock: g => { outline(mesh(g, new THREE.DodecahedronGeometry(.03), ROCK, 0, .015, 0), 1.1).scale.y = .7; },
  peak: g => { outline(mesh(g, new THREE.ConeGeometry(.1, .24, 6), ROCK, 0, .12, 0), 1.05); mesh(g, new THREE.ConeGeometry(.042, .1, 6), SNOW, 0, .195, 0); },
  snow: g => { mesh(g, new THREE.CylinderGeometry(.045, .045, .006, 12), SNOW, 0, .003, 0); },
  dune: g => { mesh(g, new THREE.SphereGeometry(.08, 12, 8), SAND, 0, 0, 0).scale.set(1, .3, .6); },
  pond: g => { mesh(g, new THREE.CylinderGeometry(.07, .07, .006, 16), POND, 0, .003, 0); },
  mangrove: (g, c) => { for (let i = 0; i < 4; i++) { const r = mesh(g, new THREE.CylinderGeometry(.004, .004, .07, 4), WOOD, Math.cos(i*1.6)*.02, .03, Math.sin(i*1.6)*.02); r.rotation.set(Math.sin(i*1.6)*.5, 0, -Math.cos(i*1.6)*.5); }
    stem(g, .09, .03); outline(ball(g, .05, c, 0, .12, 0), 1.08).scale.y = .75; },
  berg: g => { outline(mesh(g, new THREE.ConeGeometry(.05, .07, 5), SNOW, 0, .02, 0), 1.08).scale.y = .8; },
  wave: g => { mesh(g, new THREE.SphereGeometry(.025, 8, 6), T(0xdff0f7), 0, .004, 0).scale.set(1.8, .3, .6); },
  coral: (g, c, r) => { for (let i = 0; i < 3; i++) { const b = mesh(g, new THREE.CylinderGeometry(.006, .01, .05 + r()*.03, 5), T(c), (i - 1)*.012, .03, 0); b.rotation.z = (i - 1)*.4; ball(g, .012, c, (i - 1)*.022, .06, 0); } },
};
const CORALS = [0xf27a8a, 0xf2a65a, 0xb07ad8, 0xf2d25a];
const SCENERY = {
  'tropical-forest': [['tree', 11, 0x2e6b3a], ['bush', 5, 0x3f8a4a]],
  'dry-forest': [['tree', 6, 0x9a8f3e], ['bush', 5, 0xa8803e]],
  'conifer-forest': [['pine', 12, 0x2f5a4a]],
  'temperate-forest': [['tree', 6, 0x6aa04e], ['tree', 3, 0xd08a3a], ['bush', 3, 0x5b8c50]],
  taiga: [['pine', 10, 0x2f5a4a], ['snow', 7]],
  savanna: [['acacia', 4, 0x6b7a32], ['grass', 12, 0xc9a43f]],
  grassland: [['grass', 20, 0x9fb24e]],
  wetland: [['pond', 4], ['reed', 10, 0x6a8a3a]],
  mountains: [['peak', 4], ['rock', 5]],
  tundra: [['rock', 5], ['bush', 5, 0x8a7a4a], ['snow', 6]],
  mediterranean: [['bush', 10, 0x6b7a3a], ['rock', 3]],
  desert: [['cactus', 5, 0x4f8a4a], ['rock', 4], ['dune', 3]],
  mangrove: [['mangrove', 8, 0x2f6b4a]],
  ice: [['berg', 7]],
  lake: [['reed', 12, 0x6a8a3a]],
  ocean: [['wave', 10]],
  reef: [['coral', 14]],
  'polar-sea': [['berg', 7]],
};
function mesh(g, geo, mat, x, y, z){ const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.castShadow = true; g.add(m); return m; }
const ball = (g, r, c, x, y, z) => mesh(g, new THREE.SphereGeometry(r, 12, 9), T(c), x, y, z);
const cone = (g, r, h, c, y) => mesh(g, new THREE.ConeGeometry(r, h, 8), T(c), 0, y, 0);
const stem = (g, h, y = h/2) => mesh(g, new THREE.CylinderGeometry(.009, .013, h, 6), WOOD, 0, y, 0);

// ---------- building one ----------
export function showDiorama(parent, at, web, biomeId){
  if (D) hideDiorama();
  const biome = BIOMES[biomeId], ground = new THREE.Color(biome.color).getHex();
  const root = new THREE.Group(); root.position.copy(at); root.scale.setScalar(.001); parent.add(root);
  const {rows, x} = layout(web.species), n = rows.length;
  const wide = Math.max(...rows.map(r => r.length*SPACE + .06));
  const front = ((n - 1)*DEPTH + .24)/2, back = front - (n - 1)*DEPTH - .2;
  const R = Math.max(Math.hypot(wide/2, Math.max(front, -back)) + .06, .5);

  const island = new THREE.Group(); root.add(island);
  outline(mesh(island, new THREE.CylinderGeometry(R, R*.93, ISLAND, 40), T(biome.water ? 0x3d5a78 : 0x6b4430), 0, ISLAND/2, 0), 1.02);
  mesh(island, new THREE.CylinderGeometry(R - .005, R - .005, .012, 40), T(ground), 0, ISLAND + .002, 0).receiveShadow = true;
  const disposables = [];
  scenery(island, biomeId, R, wide, front, back, rng(hash(web.id)));

  // the animals
  const tokens = new Map();
  rows.forEach((r, k) => r.forEach(s => {
    const map = tokenTex(s), mat = new THREE.SpriteMaterial({map, transparent: true, alphaTest: .1}); disposables.push(map, mat);
    const sp = new THREE.Sprite(mat); sp.center.set(.5, 0); sp.scale.set(TOKEN, TOKEN*ASPECT, 1); sp.userData.name = s.name;
    const home = new THREE.Vector3(x.get(s.name)*SPACE, ISLAND + .012, front - k*DEPTH);
    sp.position.copy(home); sp.visible = false; root.add(sp);
    const badge = new THREE.Sprite(new THREE.SpriteMaterial({transparent: true, depthTest: false})); badge.scale.setScalar(.06); badge.visible = false; badge.renderOrder = 3; root.add(badge); disposables.push(badge.material);
    tokens.set(s.name, {s, sp, home, badge, disc: home.clone().setY(home.y + DISC), shown: false, size: 0, want: 0, fade: 1, wantFade: 1, shake: 0, ph: Math.random()*6, copies: []});
  }));

  // the sun, and every arrow; each grows in when asked
  const sun = new THREE.Sprite(new THREE.SpriteMaterial({map: sunTex, transparent: true})); disposables.push(sun.material);
  // low and off to the right (the row names are on the left), so its light reaches the plants without crossing the animals
  sun.scale.setScalar(.2); sun.position.set(R*.9, ISLAND + .24, front + .02); root.add(sun);
  const edges = [];
  for (const s of web.species) {
    const to = tokens.get(s.name).disc;
    if (!s.eats.length) edges.push(arrow(root, sun.position, to, 'Sun', s.name, disposables, .1));
    for (const f of s.eats) edges.push(arrow(root, tokens.get(f).disc, to, f, s.name, disposables, RIM));
  }
  // the camera frames the animals and their steps; the island's rim can fall off the edge
  D = {root, web, tokens, edges, sun, disposables, grow: 0, t: 0, sparks: [], sel: null, radius: Math.max(wide/2 + .14, (front - back)/2 + .12), top: ISLAND + .3};
}

function scenery(g, biomeId, R, w, front, back, r){
  const keepOut = (x, z) => (Math.abs(x) < w/2 + .05 && z > back - .05) || Math.hypot(x, z) > R - .05;
  for (const [kind, count, c] of SCENERY[biomeId] || []) {
    for (let i = 0, tries = 0; i < count && tries < 200; tries++) {
      const a = r()*Math.PI*2, d = Math.sqrt(r())*R, x = Math.sin(a)*d, z = Math.cos(a)*d;
      if (keepOut(x, z)) continue;
      const p = new THREE.Group(); p.position.set(x, ISLAND + .008, z); p.rotation.y = r()*6; p.scale.setScalar(1.1 + r()*.6); g.add(p);
      PROP[kind](p, kind === 'coral' ? CORALS[Math.floor(r()*CORALS.length)] : c, r); i++;
    }
  }
}

function arrow(root, a, b, food, eater, disposables, startGap){
  // the longer the jump, the higher the arc, so arrows that skip a row pass over it
  const mid = a.clone().add(b).multiplyScalar(.5); mid.y += .04 + a.distanceTo(b)*.18; mid.z += .07;
  const bez = new THREE.QuadraticBezierCurve3(a.clone(), mid, b.clone());
  // leave the food's rim and stop at the eater's, so the head isn't hidden behind the token
  let t0 = 0, t1 = 1;
  while (t0 < .45 && bez.getPoint(t0).distanceTo(a) < startGap) t0 += .01;
  while (t1 > .55 && bez.getPoint(t1).distanceTo(b) < RIM + .012) t1 -= .01;
  const pts = []; for (let i = 0; i <= 16; i++) pts.push(bez.getPoint(t0 + (t1 - t0)*i/16));
  const curve = new THREE.CatmullRomCurve3(pts), mat = new THREE.MeshBasicMaterial({color: food === 'Sun' ? COL.sun : COL.edge, transparent: true, opacity: .8, depthWrite: false});
  const geo = new THREE.TubeGeometry(curve, 24, food === 'Sun' ? .004 : .0055, 5); geo.setDrawRange(0, 0);
  const tube = new THREE.Mesh(geo, mat); root.add(tube);
  const head = new THREE.Mesh(new THREE.ConeGeometry(.016, .036, 8), mat); head.visible = false;
  const end = curve.getPoint(1), dir = curve.getTangent(1);
  head.position.copy(end).addScaledVector(dir, -.018); head.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir); root.add(head);
  const dots = [0, .5].map(o => { const d = new THREE.Sprite(new THREE.SpriteMaterial({map: glowTex, color: food === 'Sun' ? 0xffe9a0 : 0xffd98a, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false})); d.scale.setScalar(.04); d.visible = false; d.userData.o = o; root.add(d); disposables.push(d.material); return d; });
  disposables.push(mat);
  return {food, eater, tube, head, dots, curve, mat, p: 0, want: 0, kind: null};
}

export function hideDiorama(){
  if (!D) return;
  if (leaving) dispose(leaving);
  leaving = D; D = null;
}
function dispose(d){
  d.root.parent?.remove(d.root);
  d.root.traverse(m => { if (m.geometry) m.geometry.dispose(); });
  d.disposables.forEach(x => x.dispose());
}

// ---------- what the globe asks of it ----------
export const dioramaSize = () => D && {radius: D.radius, top: D.top};

export function pickAnimal(ray){
  if (!D || D.grow < .9) return null;
  const hits = ray.intersectObjects([...D.tokens.values()].filter(t => t.want > .1).map(t => t.sp), false);
  return hits.length ? hits[0].object.userData.name : null;
}

// light up what one animal eats (green) and what eats it (orange); null clears it
export function selectAnimal(name){
  if (!D) return;
  D.sel = name;
  const eats = name ? D.tokens.get(name).s.eats : [], by = name ? eatenBy(D.web, name) : [];
  for (const [n, t] of D.tokens) t.wantFade = t.gone ? 0 : !name || n === name || eats.includes(n) || by.includes(n) ? 1 : .3;
  for (const e of D.edges) e.kind = !name ? null : e.eater === name ? 'food' : e.food === name ? 'eater' : 'dim';
}

export function markAnimal(name, kind){
  const t = D && D.tokens.get(name); if (!t) return;
  t.badge.visible = !!kind && t.shown; if (kind) { t.badge.material.map = badgeTex[kind]; t.badge.material.needsUpdate = true; }
  if (kind === 'wrong') t.shake = .5;
  if (kind === 'right' || kind === 'guess') t.size = 1.18;
}
export function clearMarks(){ if (D) for (const name of D.tokens.keys()) markAnimal(name, null); }
// one animal stands up tall and bounces, so it's clear who a question is about; null settles everyone
export function spotlight(name){ if (D) for (const [n, t] of D.tokens) if (t.shown && !t.gone) t.want = n === name ? 1.3 : 1; }

// living things join the island, springing up where they stand
export function enter(names){
  if (!D) return;
  for (const n of names) { const t = D.tokens.get(n); if (t.shown) continue; t.shown = true; t.want = 1; burst(t.disc, 6); }
}

// grow in the arrows that match, in the order energy would reach them; resolves when they're in
export function growArrows(match = () => true){
  if (!D) return Promise.resolve();
  const level = new Map(), by = new Map(D.web.species.map(s => [s.name, s]));
  const lv = n => n === 'Sun' ? -1 : level.has(n) ? level.get(n) : (level.set(n, by.get(n).eats.length ? 1 + Math.max(...by.get(n).eats.map(lv)) : 0), level.get(n));
  let last = 0;
  for (const e of D.edges) if (e.want === 0 && match(e)) { e.want = 1; e.delay = (lv(e.food) + 1)*.45; last = Math.max(last, e.delay); }
  return new Promise(res => setTimeout(res, (last + .9)*1000));
}

// "what if they were gone": the gone fade away, those with fewer eaters multiply, those with less food shrink
export function vanish(gone, more, fewer){
  if (!D) return;
  const t = D.tokens.get(gone); t.gone = true; t.want = 0; t.wantFade = 0; burst(t.disc, 14);
  for (const e of D.edges) if (e.food === gone || e.eater === gone) e.kind = 'dim';
  for (const n of more) { const m = D.tokens.get(n); m.want = 1.2; m.wantFade = 1;
    for (const dx of [-1, 1]) { const c = new THREE.Sprite(m.sp.material); c.center.set(.5, 0); c.scale.set(.001, .001, 1); c.position.copy(m.home).add(new THREE.Vector3(dx*.075, .005, -.04)); c.userData.want = .62; D.root.add(c); m.copies.push(c); } }
  for (const n of fewer) { const f = D.tokens.get(n); f.want = .72; f.wantFade = .5; }
  for (const [n, o] of D.tokens) if (!o.gone && !more.includes(n) && !fewer.includes(n)) o.wantFade = .7;
}
export function restore(){
  if (!D) return;
  for (const t of D.tokens.values()) { if (t.gone) burst(t.disc, 8); t.gone = false; t.want = t.shown ? 1 : 0; t.wantFade = 1; t.copies.forEach(c => { c.userData.want = 0; }); }
  selectAnimal(D.sel);
}

function burst(at, count){
  for (let i = 0; i < count; i++) {
    const s = new THREE.Sprite(new THREE.SpriteMaterial({map: sparkTex, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending}));
    s.position.copy(at); s.scale.setScalar(.05); D.root.add(s);
    const a = Math.random()*Math.PI*2, up = Math.random();
    D.sparks.push({s, v: new THREE.Vector3(Math.cos(a)*.35, .2 + up*.4, Math.sin(a)*.35), life: .7});
  }
}

export function updateDiorama(dt){
  if (leaving) { leaving.grow = Math.max(0, leaving.grow - dt*3.2); leaving.root.scale.setScalar(Math.max(.001, leaving.grow)); if (!leaving.grow) { dispose(leaving); leaving = null; } }
  if (!D) return;
  D.t += dt;
  D.grow = Math.min(1, D.grow + dt*1.6);
  // a pop-up book's spring: overshoot, then settle
  const g = D.grow, s = g >= 1 ? 1 : 1 - Math.cos(g*Math.PI*1.5)*Math.exp(-g*4.2)*(1 - g);
  D.root.scale.setScalar(Math.max(.001, s));
  for (const t of D.tokens.values()) {
    t.size += (t.want - t.size)*Math.min(1, dt*8); t.fade += (t.wantFade - t.fade)*Math.min(1, dt*6); t.shake = Math.max(0, t.shake - dt);
    const bob = t.want > 1 ? Math.abs(Math.sin(D.t*6 + t.ph))*.02 : Math.sin(D.t*2 + t.ph)*.003;
    t.sp.position.set(t.home.x + Math.sin(t.shake*40)*t.shake*.04, t.home.y + bob, t.home.z);
    t.sp.scale.set(TOKEN*t.size, TOKEN*ASPECT*t.size, 1); t.sp.material.opacity = t.fade; t.sp.visible = t.size > .02;
    t.badge.position.set(t.sp.position.x + TOKEN*.36*t.size, t.sp.position.y + DISC*t.size + TOKEN*.33, t.home.z + .01); t.badge.material.opacity = t.fade;
    for (const c of t.copies) { const k = Math.min(1, dt*7); c.scale.x += (TOKEN*c.userData.want - c.scale.x)*k; c.scale.y = c.scale.x*ASPECT; c.visible = c.scale.x > .004; }
    t.copies = t.copies.filter(c => { if (c.userData.want || c.scale.x > .005) return true; D.root.remove(c); return false; });
  }
  for (const e of D.edges) {
    if (e.want && (e.delay -= dt) <= 0) e.p = Math.min(1, e.p + dt*1.8);
    e.tube.geometry.setDrawRange(0, Math.ceil(e.p*24)*5*6);
    e.head.visible = e.p >= 1;
    const color = e.kind === 'food' ? COL.food : e.kind === 'eater' ? COL.eater : e.food === 'Sun' ? COL.sun : COL.edge;
    e.mat.color.setHex(color); e.mat.opacity = e.kind === 'dim' ? .07 : e.kind ? 1 : .75;
    for (const d of e.dots) {
      d.visible = e.p >= 1 && e.kind !== 'dim';
      if (d.visible) { d.position.copy(e.curve.getPointAt((D.t*.45 + d.userData.o) % 1)); d.material.color.setHex(e.kind ? color : e.food === 'Sun' ? 0xffe9a0 : 0xffd98a); }
    }
  }
  D.sun.material.rotation = D.t*.3;
  D.sparks = D.sparks.filter(p => {
    p.life -= dt; p.s.position.addScaledVector(p.v, dt); p.v.y -= dt*.6; p.s.material.opacity = Math.max(0, p.life/.7);
    if (p.life > 0) return true; D.root.remove(p.s); p.s.material.dispose(); return false;
  });
}
