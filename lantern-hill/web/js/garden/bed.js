// The vegetable bed in the garden yard and the garden growing in it: the save brought up to the
// present as real time passes, and each plot drawn as it stands, its soil damp or dry and its plant
// as grown as it is. The plants grow in front of whoever walks by, gardening or not.
//
// Tending (tend.js) changes the garden only through tend(), so every change is saved and seen.

import * as THREE from 'three';
import { C, T, box, col, outline, sparkTex, tex } from '../core/kit.js';
import { daylight } from '../hq/daylight.js';
import { hqAnims, scene } from '../hq/scene.js';
import { load, save } from '../save.js';
import { CROP } from './crops.js';
import { COLS, ROWS, advance, damp, growth, newGarden, ripe, thirsty } from './grow.js';
import { buildPlant } from './plants.js';

export const BED = {x:16.2, z:-8.53, pitch:.62};
BED.front = BED.z + ROWS/2*BED.pitch + .1;
export const plotAt = i => ({x:BED.x + (i % COLS - (COLS - 1)/2)*BED.pitch, z:BED.z + (Math.floor(i/COLS) - (ROWS - 1)/2)*BED.pitch});

export const garden = (() => {
  const g = newGarden(), s = load('garden');
  if (s && Array.isArray(s.plots) && s.plots.length === g.plots.length) Object.assign(g, s);
  return advance(g, Date.now());
})();
export function tend(fn){
  const out = fn(garden, Date.now());
  save('garden', garden); refresh(); return out;
}

// ----- the bed: a plank frame, a plot of soil for each square -----
const W = COLS*BED.pitch, D = ROWS*BED.pitch, plank = T(C.woodLt), plankDk = T(C.woodDk);
for (const sd of [-1, 1]) {
  outline(box(W + .2, .26, .1, plank, BED.x, .13, BED.z + sd*(D/2 + .05)), 1.02);
  outline(box(.1, .26, D, plank, BED.x + sd*(W/2 + .05), .13, BED.z), 1.02);
}
for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) box(.14, .32, .14, plankDk, BED.x + sx*(W/2 + .05), .16, BED.z + sz*(D/2 + .05));
box(W, .16, D, T(0x5a4030), BED.x, .08, BED.z, null, false).receiveShadow = true;
col(BED.x - W/2 - .1, BED.x + W/2 + .1, BED.z - D/2 - .1, BED.z + D/2 + .1, -5, .4);

const DRY = new THREE.Color(0x8a6444), WET = new THREE.Color(0x3e281a);
const dropTex = tex(64, 64, (g) => {
  g.fillStyle = '#7ac8f0'; g.strokeStyle = '#1a1320'; g.lineWidth = 5;
  g.beginPath(); g.moveTo(32, 6); g.bezierCurveTo(46, 26, 52, 34, 52, 42); g.arc(32, 42, 20, 0, Math.PI); g.bezierCurveTo(12, 34, 18, 26, 32, 6); g.fill(); g.stroke();
  g.fillStyle = 'rgba(255,255,255,.8)'; g.beginPath(); g.ellipse(25, 42, 4, 7, -.4, 0, 7); g.fill();
});
dropTex.wrapS = dropTex.wrapT = THREE.ClampToEdgeWrapping;

export const plots = garden.plots.map((p, i) => {
  const {x, z} = plotAt(i), mat = T(0xffffff).clone();
  const soil = new THREE.Mesh(new THREE.BoxGeometry(BED.pitch - .07, .06, BED.pitch - .07), mat);
  soil.position.set(x, .17, z); soil.receiveShadow = true; scene.add(soil);
  const holder = new THREE.Group(); holder.position.set(x, .2, z); scene.add(holder);
  const spark = new THREE.Sprite(new THREE.SpriteMaterial({map:sparkTex, transparent:true, depthWrite:false, opacity:0}));
  const drop = new THREE.Sprite(new THREE.SpriteMaterial({map:dropTex, transparent:true, depthWrite:false, opacity:0}));
  spark.scale.set(.32, .32, 1); drop.scale.set(.16, .16, 1); scene.add(spark, drop);
  return {i, x, z, soil, holder, spark, drop, model:null, key:'', wet:0, wetShown:0, top:.2, pop:0, ph:i*1.7};
});

function heightOf(m){
  let top = 0;
  m.root.children.forEach(c => { if (c.geometry) { c.geometry.computeBoundingBox(); top = Math.max(top, c.geometry.boundingBox.max.y); } });
  return m.head ? Math.max(top, m.head.position.y + .25) : top;
}
function refresh(){
  const now = Date.now(), night = daylight.day < .3;
  garden.plots.forEach((p, i) => {
    const v = plots[i], g = growth(p), crop = CROP[p.crop];
    v.wet = damp(p, now) ? 1 : 0;
    // rebuilt in small steps of growth; flowers rebuild at nightfall to close
    const key = crop ? `${crop.id}:${Math.round(g*40)}:${crop.look === 'flower' && night}:${i}` : '';
    if (key === v.key) return;
    v.key = key;
    if (v.model) { v.holder.remove(v.model.root); v.model.root.traverse(m => m.geometry && m.geometry.dispose()); v.model = null; }
    if (crop) { v.model = buildPlant(crop, g, {seed:i + 1, night}); v.holder.add(v.model.root); }
    v.top = .2 + (v.model ? heightOf(v.model) : 0);
  });
}
refresh();

// east, turned a little south so a kid at the front of the bed sees the face
const EAST = new THREE.Vector3(1, 0, .6).normalize();
let since = 0;
hqAnims.push((dt, t) => {
  if ((since += dt) > 1) { since = 0; advance(garden, Date.now()); refresh(); }
  const now = Date.now();
  for (const v of plots) {
    const p = garden.plots[v.i], m = v.model, dry = thirsty(p, now);
    v.wetShown += (v.wet - v.wetShown)*Math.min(1, dt*2); v.soil.material.color.copy(DRY).lerp(WET, v.wetShown);
    v.pop = Math.max(0, v.pop - dt*2.2);
    const bounce = 1 + Math.sin(v.pop*Math.PI*2)*v.pop*.25;
    v.holder.scale.set(bounce, bounce*(dry ? .9 : 1), bounce);
    v.holder.rotation.x = dry ? .16 : 0;
    v.holder.rotation.z = Math.sin(t*1.4 + v.ph)*.035;
    if (m && m.head) {
      // young sunflowers follow the sun round; grown ones face the sunrise
      const to = growth(p) < .9 && daylight.day > .1 ? daylight.toward : EAST, want = Math.atan2(to.x, to.z), d = want - m.head.rotation.y;
      m.head.rotation.y += Math.atan2(Math.sin(d), Math.cos(d))*Math.min(1, dt*.5);
    }
    v.spark.material.opacity += ((ripe(p) ? 1 : 0) - v.spark.material.opacity)*Math.min(1, dt*4);
    v.spark.position.set(v.x, v.top + .2 + Math.sin(t*3 + v.ph)*.05, v.z); v.spark.material.rotation = t*.8 + v.ph;
    v.drop.material.opacity += ((dry ? .95 : 0) - v.drop.material.opacity)*Math.min(1, dt*4);
    v.drop.position.set(v.x, v.top + .14 + Math.abs(Math.sin(t*2.4 + v.ph))*.06, v.z);
  }
});
