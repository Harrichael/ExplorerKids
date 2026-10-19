// The supply cabinet along the back of the mat: glass-fronted shelves, one per kind of supply, holding a
// small model of everything the explorer has stocked by finishing experiments. Nothing they haven't
// earned is shown, and a shelf with nothing on it yet has no label. In the Free Lab it's a menu you
// reach into: tap a shelf and its door lifts and everything on it floats out over the mat, lit up and
// full size; tap one and a real one drops onto the mat beneath it. Positions are in the desk's frame.

import * as THREE from 'three';
import { T, add, box, outlineMat, tex } from '../core/kit.js';
import { bring, desk } from './desk.js';
import { labSound } from './sounds.js';
import { ITEMS } from './stuff.js';

// Rows from the bottom; a shelf's share of its row's width is its `w`. What's taken out comes as `o`.
const ROWS = [
  {h:.25, shelves:[
    {label:'Glassware', w:4, things:['cup', 'jar', 'dish', 'saucer', 'bottle', 'balloon', 'tub', 'volcano']},
    {label:'Bottles', w:3.6, things:['pitcher', 'vinegar', 'lemon', 'milk', 'cabbage', 'oil', 'soap']},
    {label:'Powders', w:2.6, things:['soda', 'sugar', 'saltbox', 'salt', 'sand', 'pepper']}]},
  {h:.19, shelves:[
    {label:'Colors', w:1.6, things:['red', 'yellow', 'blue']},
    {label:'Treasures', w:5.6, things:['egg', 'apple', 'rock', 'cork', 'coin', 'duck', 'paperclip', 'nail', 'key', 'foil', 'crayon', 'button', 'tablet']},
    {label:'Tools', w:3, things:['spoon', 'swab', 'strip', 'magnet', 'bar', 'chart']}]}];
// a penny from the cabinet is an old one, dull with tarnish
const TAKE = {tub:{fill:{water:950}}, coin:{tarnish:1}};
const MAX_ON_MAT = 30;
// where an open shelf's things float, over the mat and toward the explorer, a little bigger than life
const SHOW = {w:1.56, y:.2, z:-.16, h:.3, most:1.3};

const W = 1.68, BACK = -.7, FRONT = -.578, SIDE = .02, DIV = .014, PLINTH = .025, SHELF = .014;
const GOLD = new THREE.Color(0xffd36a), GOLD_OUT = new THREE.MeshBasicMaterial({color:0xffc94a, side:THREE.BackSide});
const HIT = new THREE.MeshBasicMaterial({visible:false});
const wood = T(0x6b4430), dark = T(0x3a2418);
const GLASS = T(0xdff1f5, {transparent:true, opacity:.16, depthWrite:false});
// a width for each thing that gives a tub more room than a cup without dwarfing it
const room = type => Math.sqrt(2*ITEMS[type].r);

export const shelves = [];
const hits = [];
let root = null, open = null, hoverShelf = null, hoverThing = null;

function plate(text){
  const m = T(0xffffff, {map:tex(256, 56, (g, w, h) => { g.fillStyle = '#3a1f34'; g.fillRect(0, 0, w, h); g.strokeStyle = '#d9a441'; g.lineWidth = 5; g.strokeRect(3, 3, w - 6, h - 6);
    g.fillStyle = '#f3e6c8'; g.font = '900 34px Nunito, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(text.toUpperCase(), w/2, h/2 + 2); })});
  return add(new THREE.PlaneGeometry(.2, .044), m, 0, 0, 0, null, false);
}

export function initCabinet(parent){
  root = new THREE.Group(); parent.add(root);
  const depth = FRONT - BACK, midZ = (FRONT + BACK)/2, inner = W - 2*SIDE;
  const H = PLINTH + ROWS.reduce((s, r) => s + r.h + SHELF, 0) + .012;
  box(W, H, .012, dark, 0, H/2 - .006, BACK + .006, root, false);
  for (const sx of [-1, 1]) box(SIDE, H, depth, wood, sx*(W - SIDE)/2, H/2 - .006, midZ, root);
  box(W + .02, PLINTH, depth + .01, wood, 0, PLINTH/2 - .006, midZ, root);
  box(W + .04, .018, depth + .02, wood, 0, H, midZ, root);
  let y = PLINTH - .006;
  for (const row of ROWS) {
    const usable = inner - DIV*(row.shelves.length - 1), total = row.shelves.reduce((s, sh) => s + sh.w, 0);
    let x = -inner/2;
    row.shelves.forEach((def, i) => {
      const w = usable*def.w/total, cx = x + w/2;
      if (i) box(DIV, row.h, depth, wood, x - DIV/2, y + row.h/2, midZ, root);
      const sh = {def, x:cx, y, w, h:row.h, slots:[], k:0, ajar:0};
      // the glass door hinges at the top of its shelf and swings up inside, out of the way
      sh.door = new THREE.Group(); sh.door.position.set(cx, y + row.h, FRONT - .004); root.add(sh.door);
      const pane = add(new THREE.PlaneGeometry(w - .01, row.h - .01), GLASS, 0, -row.h/2, 0, sh.door, false); pane.renderOrder = 4;
      for (const [fw, fh, fx, fy] of [[w, .008, 0, -.004], [w, .008, 0, -row.h + .004], [.008, row.h, -w/2 + .004, -row.h/2], [.008, row.h, w/2 - .004, -row.h/2]]) box(fw, fh, .006, wood, fx, fy, 0, sh.door, false);
      box(.014, .01, .012, T(0xd9a441), 0, -row.h + .016, .008, sh.door, false);
      sh.plate = plate(def.label); sh.plate.position.set(cx, y + row.h + SHELF/2, FRONT + .002); sh.plate.visible = false; root.add(sh.plate);
      sh.hit = add(new THREE.BoxGeometry(w, row.h, depth), HIT, cx, y + row.h/2, midZ, root, false); sh.hit.userData.shelf = sh; hits.push(sh.hit);
      const sum = def.things.reduce((a, t) => a + room(t), 0);
      let sx = cx - w/2 + .006;
      for (const type of def.things) {
        const sw = (w - .012)*room(type)/sum, d = ITEMS[type];
        const s = Math.min(.75, sw*.88/(2*d.r), row.h*.8/d.h, (depth - .02)/(2*d.r));
        sh.slots.push({type, sh, home:new THREE.Vector3(sx + sw/2, y, midZ), s, at:new THREE.Vector3(), big:1, model:null, out:0, k:0, lift:0});
        sx += sw;
      }
      shelves.push(sh); x += w + DIV;
    });
    y += row.h + SHELF;
    box(inner, SHELF, depth, wood, 0, y - SHELF/2, midZ, root);
  }
}

function model(slot){
  const g = new THREE.Group(), d = ITEMS[slot.type];
  d.build(g, {});
  g.rotation.y = -.35;
  // its own materials, so lighting it up doesn't light up every cup on the mat
  g.traverse(m => {
    if (!m.isMesh) return;
    if (m.material === outlineMat) { m.userData.outline = true; return; }
    m.material = m.material.clone(); m.userData.em = m.material.emissive.clone(); m.userData.ei = m.material.emissiveIntensity;
  });
  // a little more than its own size to tap, since some things are very thin
  const hit = add(new THREE.BoxGeometry(Math.max(2*d.r, .05)*1.2, Math.max(d.h, .05)*1.15, Math.max(2*d.r, .05)*1.2), HIT, 0, d.h/2, 0, g, false);
  hit.userData.slot = slot; slot.hit = hit;
  root.add(g); return g;
}

// show exactly what's been stocked
export function stockCabinet(have){
  for (const sh of shelves) {
    for (const slot of sh.slots) {
      if (have.has(slot.type) && !slot.model) slot.model = model(slot);
      else if (!have.has(slot.type) && slot.model) { root.remove(slot.model); slot.model = null; }
    }
    sh.plate.visible = sh.slots.some(s => s.model);
  }
  if (open && !open.plate.visible) open = null;
}
export function closeCabinet(){ const was = !!open; open = null; return was; }

// an opened shelf's things line up over the mat, each as big as it can be in its share of the row
function lineUp(sh){
  const out = sh.slots.filter(s => s.model), sum = out.reduce((a, s) => a + room(s.type), 0), w = Math.min(SHOW.w, out.length*.24);
  let x = -w/2;
  for (const s of out) {
    const sw = w*room(s.type)/sum, d = ITEMS[s.type];
    s.big = Math.min(SHOW.most, sw*.82/(2*d.r), SHOW.h/d.h); s.at.set(x + sw/2, SHOW.y, SHOW.z); x += sw;
  }
}

// What the ray points at: something floating out of the open shelf first, since it's in front of
// everything; then a shelf, unless something on the mat stands in front of it.
const _rc = new THREE.Raycaster();
function aimAt(ray){
  if (!ray || !root) return null;
  _rc.ray.copy(ray);
  if (open) { const h = _rc.intersectObjects(open.slots.filter(s => s.model).map(s => s.hit), false)[0]; if (h) return h.object.userData; }
  const hit = _rc.intersectObjects(hits.filter(h => h.userData.shelf.plate.visible), false)[0];
  if (!hit) return null;
  const mat = _rc.intersectObjects(desk.items.filter(it => !it.gone).map(it => it.g), true)[0];
  return mat && mat.distance < hit.distance ? null : hit.object.userData;
}

export const reach = {
  point(ray){
    const a = aimAt(ray), thing = a && a.slot || null, shelf = a && a.shelf || null;
    // moving along an open shelf plays up the scale, like a cursor in a menu
    if (thing && thing !== hoverThing) labSound.hoverThing(open.slots.filter(s => s.model).indexOf(thing));
    if (shelf && shelf !== hoverShelf && shelf !== open) labSound.hoverShelf(shelves.indexOf(shelf));
    hoverThing = thing; hoverShelf = shelf;
  },
  press(ray){
    const a = aimAt(ray);
    if (!a) { open = null; return false; }
    if (a.slot) take(a.slot);
    else if (a.shelf !== open) { open = a.shelf; lineUp(open); labSound.openShelf(open.x); }
    return true;
  }
};
function take(slot){
  const n = desk.items.filter(it => !it.gone).length, p = slot.model.position;
  const it = n < MAX_ON_MAT && bring(slot.type, TAKE[slot.type], {x:p.x, z:p.z});
  if (!it) { slot.lift = -1; labSound.refuse(p.x); return; }
  labSound.take(p.x);
  slot.lift = 1;
}

const _c = new THREE.Color();
export function updateCabinet(dt){
  if (!root) return;
  const ease = Math.min(1, dt*10), t = performance.now()/1000;
  for (const sh of shelves) {
    sh.k += ((sh === open ? 1 : sh === hoverShelf ? .35 : 0) - sh.k)*ease;
    sh.ajar += ((sh === open ? 1 : 0) - sh.ajar)*ease;
    sh.door.rotation.x = 1.45*sh.ajar;
    sh.slots.forEach((slot, i) => {
      const g = slot.model; if (!g) return;
      slot.out += ((sh === open ? 1 : 0) - slot.out)*Math.min(1, dt*6);
      slot.k += ((sh === open && slot === hoverThing ? 1 : 0) - slot.k)*ease;
      // a hop when one is taken, a shake when there's no room for it
      slot.lift += (0 - slot.lift)*Math.min(1, dt*5);
      const o = slot.out, arc = Math.sin(o*Math.PI)*.08, bob = o*Math.sin(t*2 + i)*.006;
      g.position.lerpVectors(slot.home, slot.at, o);
      g.position.y += arc + bob + .02*slot.k + .03*Math.max(0, slot.lift);
      if (slot.lift < 0) g.position.x += Math.sin(t*200)*.006*-slot.lift;
      g.scale.setScalar((slot.s + (slot.big - slot.s)*o)*(1 + .18*slot.k));
      // an open shelf's things are all ringed in gold; the one being considered glows too
      const glow = sh.k*.2 + slot.k*.6, ringed = sh.k > .5 || slot.k > .5;
      g.traverse(m => {
        if (!m.isMesh || !m.userData.em && !m.userData.outline) return;
        if (m.userData.outline) { m.material = ringed ? GOLD_OUT : outlineMat; return; }
        m.material.emissive.copy(_c.copy(m.userData.em).lerp(GOLD, glow)); m.material.emissiveIntensity = m.userData.ei + (.5 - m.userData.ei)*glow;
      });
    });
  }
}
