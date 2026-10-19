// What a plant looks like at any point in its growing, from the first two seed leaves to the day
// it's ready to pick. A plant grows over hours, so rather than animating parts, it's rebuilt now
// and then: buildPlant() makes a fresh model for a given growth (0..1), merged into a mesh per colour.
//
//   const m = buildPlant(CROP.tomato, .8, {seed:3, night:false});
//   scene.add(m.root);  m.head  // the sunflower's head, for whoever turns it to the sun
//
// The produce alone, as it's picked, is buildProduce(crop).

import * as THREE from 'three';
import { clamp01, meshOf, mergeGeos } from '../core/kit.js';

const M = new THREE.Matrix4(), RX = new THREE.Matrix4(), SC = new THREE.Matrix4();
// translate, turn about y, tip about x, then scale: how a leaf is laid out from its stem
const place = (x, y, z, ry = 0, rx = 0, sx = 1, sy = sx, sz = sx) =>
  new THREE.Matrix4().makeTranslation(x, y, z).multiply(M.makeRotationY(ry)).multiply(RX.makeRotationX(rx)).multiply(SC.makeScale(sx, sy, sz));
const smooth = (a, b, g) => { const t = clamp01((g - a)/(b - a)); return t*t*(3 - 2*t); };
const mixHex = (a, b, t) => new THREE.Color(a).lerp(new THREE.Color(b), t).getHex();
const GREEN = 0x6aa848, STEM = 0x4f8a3a, SEEDLEAF = 0x8cc45a;

function kit(seed){
  const by = new Map();
  let s = (seed*7919 + 13) % 2147483647 || 1;
  const rnd = (a = 0, b = 1) => a + ((s = s*16807 % 2147483647)/2147483647)*(b - a);
  const put = (color, geo, m) => { if (!by.has(color)) by.set(color, []); by.get(color).push([geo, m]); };
  const k = {rnd, put,
    blob: (color, m) => put(color, new THREE.SphereGeometry(1, 10, 7), m),
    // a leaf lying along +z from its base, tipped up by `up`
    leaf: (color, x, y, z, a, up, len, wid) => put(color, new THREE.SphereGeometry(1, 10, 6), place(x, y, z, a, -up).multiply(new THREE.Matrix4().makeTranslation(0, 0, len/2).multiply(SC.makeScale(wid, .018 + len*.04, len/2)))),
    stem: (color, x0, y0, z0, x1, y1, z1, r) => {
      const a = new THREE.Vector3(x0, y0, z0), b = new THREE.Vector3(x1, y1, z1), d = b.clone().sub(a), L = d.length();
      if (L < 1e-4) return;
      const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.normalize());
      put(color, new THREE.CylinderGeometry(r*.8, r, L, 6), new THREE.Matrix4().compose(a.add(b).multiplyScalar(.5), q, new THREE.Vector3(1, 1, 1)));
    },
    finish(parent, ink = .012){ for (const [color, parts] of by) meshOf(mergeGeos(parts), color, parent, ink); by.clear(); }
  };
  return k;
}

// the first two round seed leaves, which every plant starts with and later hides under its own
function seedLeaves(k, g){
  const s = smooth(.02, .12, g)*(1 - smooth(.25, .45, g));
  if (s < .02) return;
  k.stem(STEM, 0, 0, 0, 0, .08*s, 0, .012);
  for (const sd of [-1, 1]) k.leaf(SEEDLEAF, 0, .08*s, 0, sd*Math.PI/2, .35, .09*s, .045*s);
}

const LOOKS = {
  root(k, c, g, o){
    const s = smooth(.08, .8, g), n = c.spiky ? 5 : c.feathery ? 7 : 6;
    for (let i = 0; i < n && s > .01; i++) {
      const a = i/n*Math.PI*2 + k.rnd(-.2, .2);
      if (c.spiky) { k.put(c.colors.leaf, new THREE.ConeGeometry(.018*s + .004, .5*s, 4), place(Math.sin(a)*.02, .25*s, Math.cos(a)*.02, a, .12)); continue; }
      if (c.feathery) {
        const len = .32*s, up = 1.05 + k.rnd(-.1, .1);
        k.stem(STEM, 0, 0, 0, Math.sin(a)*len*Math.cos(up), len*Math.sin(up), Math.cos(a)*len*Math.cos(up), .007);
        for (let j = 1; j <= 3; j++) { const t = j/3.4; k.blob(c.colors.leaf, place(Math.sin(a)*len*t*Math.cos(up), len*t*Math.sin(up), Math.cos(a)*len*t*Math.cos(up), a, 0, .045*s, .02*s, .045*s)); }
        continue;
      }
      k.leaf(c.colors.leaf, 0, .02, 0, a, .75 + k.rnd(-.15, .15), .22*s, .07*s);
    }
    // the top of the root, swelling at the surface as it grows
    const r = smooth(.5, 1, g);
    if (r > .02) {
      if (c.feathery) k.put(c.colors.crop, new THREE.CylinderGeometry(.04*r, .038*r, .05*r, 10), place(0, .015, 0));
      else k.blob(c.colors.crop, place(0, .025*r, 0, 0, 0, .075*r, (c.spiky ? .06 : .065)*r, .075*r));
    }
  },
  leafy(k, c, g, o){
    const s = smooth(.08, .9, g), rings = c.curly ? [[5, .9], [4, 1.15]] : [[6, .55], [5, .85], [4, 1.15]];
    rings.forEach(([n, up], ri) => { for (let i = 0; i < n; i++) {
      const a = i/n*Math.PI*2 + ri*.5 + k.rnd(-.15, .15), len = (c.curly ? .3 : .2 - ri*.03)*s, col = ri === rings.length - 1 ? mixHex(c.colors.leaf, 0xffffff, .15) : c.colors.leaf;
      k.leaf(col, 0, .02 + ri*.02*s, 0, a, up, len, (c.smooth ? .07 : .09)*s);
      if (c.curly) for (let j = 1; j <= 2; j++) k.blob(col, place(Math.sin(a)*len*j/3*Math.cos(up), .02 + len*j/3*Math.sin(up), Math.cos(a)*len*j/3*Math.cos(up), a, 0, .05*s, .03*s, .05*s));
    } });
    if (!c.curly && !c.smooth) k.blob(c.colors.crop, place(0, .07*s, 0, 0, 0, .1*s, .08*s, .1*s));
  },
  flower(k, c, g, o){
    const s = smooth(.08, .7, g), b = smooth(.5, .8, g), shut = o.night ? .6 : 1;
    for (let i = 0; i < 7 && s > .01; i++) { const a = i/7*Math.PI*2 + k.rnd(-.2, .2); k.leaf(c.colors.leaf, 0, .02, 0, a, .7, .16*s, .06*s); }
    k.blob(c.colors.leaf, place(0, .1*s, 0, 0, 0, .13*s, .1*s, .13*s));
    if (b > .02) for (let i = 0; i < 5; i++) {
      const a = i/5*Math.PI*2 + .4, rr = i ? .1 : 0, y = .2 + (i ? 0 : .05), x = Math.sin(a)*rr, z = Math.cos(a)*rr;
      k.stem(STEM, x*.5, .1, z*.5, x, y*s, z, .008);
      k.blob(i % 2 ? c.colors.crop : c.colors.flower, place(x, y*s + .02*b, z, 0, 0, .055*b*shut, .04*b, .055*b*shut));
      k.blob(mixHex(c.colors.crop, 0x8a3a10, .4), place(x, y*s + .045*b, z, 0, 0, .02*b, .015*b, .02*b));
    }
  },
  sunflower(k, c, g, o){
    const s = smooth(.08, .75, g), h = 1.5*s;
    k.stem(STEM, 0, 0, 0, 0, h, 0, .03*s + .005);
    for (let i = 0; i < 6; i++) { const y = h*(.15 + i*.13), a = i*2.4; if (y > h - .05) break; k.leaf(c.colors.leaf, 0, y, 0, a, .25, .22*s + .02, .12*s + .01); }
    // the head is built apart so it can turn to the sun
    const head = new THREE.Group(); head.position.y = h; o.head = head;
    const bud = smooth(.4, .6, g), open = smooth(.62, .9, g);
    if (bud > .02) {
      k.head = kit(o.seed + 99);
      const hk = k.head, r = (.08 + .12*open)*bud;
      hk.put(open > .1 ? c.colors.flower : GREEN, new THREE.CylinderGeometry(r, r*.9, .05, 16), place(0, 0, .03, 0, Math.PI/2));
      if (open > .02) for (let i = 0; i < 16; i++) { const a = i/16*Math.PI*2;
        hk.put(c.colors.crop, new THREE.SphereGeometry(1, 8, 5), new THREE.Matrix4().makeRotationZ(a).multiply(new THREE.Matrix4().makeTranslation(0, r + .05*open, .02)).multiply(SC.makeScale(.035*open, .07*open, .012))); }
    }
  },
  vine(k, c, g, o){
    const s = smooth(.08, .75, g), h = (c.climb ? .7 : .95)*s;
    if (c.climb) { for (const x of [-.18, .18]) k.stem(0x8a6a44, x, 0, -.1, x*.6, .75, -.1, .012); k.stem(0x8a6a44, -.17, .5, -.1, .17, .5, -.1, .01); }
    else k.stem(0x8a6a44, 0, 0, -.05, 0, 1.05, -.05, .016);
    const n = Math.round(4 + 6*s);
    for (let i = 0; i < n; i++) { const t = (i + 1)/(n + 1), a = i*2.2, y = h*t, x = Math.sin(a)*.06, z = Math.cos(a)*.06 - .05;
      k.leaf(c.colors.leaf, x, y, z, a, .3, .12*s + .02, .07*s + .01); }
    const b = smooth(.5, .7, g)*(1 - smooth(.85, 1, g)), f = smooth(.72, 1, g);
    for (let i = 0; i < 5; i++) { const a = i*2.6 + 1, y = h*(.35 + i*.12), x = Math.sin(a)*.1, z = Math.cos(a)*.1 - .05;
      if (b > .05) k.blob(c.colors.flower, place(x, y, z, 0, 0, .03*b));
      if (f > .05) k.put(mixHex(GREEN, c.colors.crop, f), new THREE.CylinderGeometry(.018*f, .014*f, .14*f, 6), place(x, y - .07*f, z, a, .15)); }
  },
  tomato(k, c, g, o){
    const s = smooth(.08, .75, g), h = .95*s;
    // a wire cage keeps it standing
    for (let i = 0; i < 3; i++) { const a = i/3*Math.PI*2; k.stem(0x9aa0a8, Math.sin(a)*.2, 0, Math.cos(a)*.2, Math.sin(a)*.24, 1, Math.cos(a)*.24, .007); }
    for (const y of [.35, .7]) k.put(0x9aa0a8, new THREE.TorusGeometry(.2 + y*.05, .006, 4, 20), place(0, y, 0, 0, Math.PI/2));
    k.stem(STEM, 0, 0, 0, 0, h, 0, .02*s + .004);
    const n = Math.round(4 + 8*s);
    for (let i = 0; i < n; i++) { const t = (i + 1)/(n + 1), a = i*2.4; k.leaf(c.colors.leaf, 0, h*t, 0, a, .2 - t*.3, .16*s + .02, .08*s + .01); }
    const b = smooth(.5, .7, g)*(1 - smooth(.8, .95, g)), f = smooth(.7, .92, g), red = smooth(.85, 1, g);
    for (let i = 0; i < 6; i++) { const a = i*2.1 + .3, y = h*(.3 + (i % 3)*.2), x = Math.sin(a)*.12, z = Math.cos(a)*.12;
      if (b > .05) k.blob(c.colors.flower, place(x, y, z, 0, 0, .025*b));
      if (f > .05) k.blob(mixHex(GREEN, c.colors.crop, i < 4 ? red : red*.6), place(x, y - .03, z, 0, 0, .055*f, .05*f, .055*f)); }
  },
  berry(k, c, g, o){
    const s = smooth(.08, .7, g);
    for (let i = 0; i < 5; i++) { const a = i/5*Math.PI*2 + k.rnd(-.2, .2), len = .14*s + .02, up = .6;
      const tx = Math.sin(a)*len*Math.cos(up), ty = .02 + len*Math.sin(up), tz = Math.cos(a)*len*Math.cos(up);
      k.stem(STEM, 0, .01, 0, tx, ty, tz, .006);
      for (let j = -1; j <= 1; j++) k.leaf(c.colors.leaf, tx, ty, tz, a + j*.8, .15, .08*s + .01, .05*s + .01); }
    const b = smooth(.45, .65, g)*(1 - smooth(.75, .9, g)), f = smooth(.68, .95, g), red = smooth(.85, 1, g);
    for (let i = 0; i < 4; i++) { const a = i/4*Math.PI*2 + .7, x = Math.sin(a)*.17, z = Math.cos(a)*.17;
      if (b > .05) { k.blob(c.colors.flower, place(x, .1, z, 0, 0, .03*b, .012*b, .03*b)); k.blob(0xf2d22e, place(x, .108, z, 0, 0, .01*b)); }
      if (f > .05) k.put(mixHex(0xe8e8c8, c.colors.crop, red), new THREE.ConeGeometry(.035*f, .07*f, 8), place(x, .045, z, 0, Math.PI)); }
  },
  pumpkin(k, c, g, o){
    const s = smooth(.08, .7, g);
    // the vine wanders out across the soil, leaves along it
    for (let i = 0; i < 7 && s > .01; i++) { const a = i*.9 - 2.4, r = (.08 + i*.04)*s;
      k.leaf(c.colors.leaf, Math.sin(a)*r, .03, Math.cos(a)*r, a + 1.4, .5, .15*s + .02, .13*s + .02); }
    const b = smooth(.45, .62, g)*(1 - smooth(.72, .85, g)), f = smooth(.65, 1, g), ripe = smooth(.82, 1, g);
    if (b > .05) k.put(c.colors.flower, new THREE.ConeGeometry(.06*b, .1*b, 6, 1, true), place(.12, .1, .08, 0, Math.PI*.9));
    if (f > .02) {
      const r = .05 + .15*f, col = mixHex(GREEN, c.colors.crop, ripe);
      for (let i = 0; i < 6; i++) { const a = i/6*Math.PI*2; k.blob(col, place(.05 + Math.cos(a)*r*.32, r*.8, .06 + Math.sin(a)*r*.32, -a, 0, r*.62, r*.8, r*.82)); }
      k.stem(0x6a5a2a, .05, r*1.5, .06, .07, r*1.75, .06, .015);
    }
  },
  corn(k, c, g, o){
    const s = smooth(.08, .78, g), h = 1.7*s;
    k.stem(STEM, 0, 0, 0, 0, h, 0, .028*s + .006);
    for (let i = 0; i < 7; i++) { const y = h*(.08 + i*.12), a = i*Math.PI + k.rnd(-.3, .3); if (y > h*.9) break;
      k.leaf(c.colors.leaf, 0, y, 0, a, .5 - i*.04, .42*s + .03, .03*s + .006); }
    const t = smooth(.6, .8, g);
    if (t > .02) for (let i = 0; i < 5; i++) { const a = i/5*Math.PI*2; k.stem(c.colors.flower, 0, h, 0, Math.sin(a)*.08*t, h + .16*t, Math.cos(a)*.08*t, .006); }
    const f = smooth(.72, 1, g);
    if (f > .02) for (const [y, a] of [[.45, .5], [.6, 3.6]]) {
      const x = Math.sin(a)*.05, z = Math.cos(a)*.05;
      k.put(mixHex(GREEN, 0x8ab85a, .5), new THREE.CylinderGeometry(.035*f, .028*f, .2*f, 8), place(x, h*y, z, a, .35));
      k.put(mixHex(0xd8c890, c.colors.crop, f), new THREE.ConeGeometry(.03*f, .06*f, 6), place(x + Math.sin(a)*.03, h*y + .11*f, z + Math.cos(a)*.03, a, .35));
    }
  }
};

export function buildPlant(crop, g, {seed = 1, night = false} = {}){
  const root = new THREE.Group(), k = kit(seed), o = {seed, night, head:null};
  seedLeaves(k, g);
  if (g >= .06) LOOKS[crop.look](k, crop, g, o);
  k.finish(root);
  if (o.head) { root.add(o.head); if (k.head) k.head.finish(o.head); }
  return {root, head:o.head};
}

export function buildProduce(crop){
  const root = new THREE.Group(), k = kit(5), col = crop.colors.crop;
  switch (crop.look) {
    case 'root':
      if (crop.feathery) { k.put(col, new THREE.ConeGeometry(.045, .26, 10), place(0, -.13, 0, 0, Math.PI)); }
      else k.blob(col, place(0, 0, 0, 0, 0, .085, crop.spiky ? .075 : .085, .085));
      if (!crop.spiky) for (let i = 0; i < 4; i++) k.leaf(crop.colors.leaf, 0, .04, 0, i*1.6, 1.2, .16, .05);
      else k.put(crop.colors.leaf, new THREE.ConeGeometry(.02, .14, 4), place(0, .1, 0));
      break;
    case 'leafy': for (let i = 0; i < 7; i++) k.leaf(crop.colors.leaf, 0, 0, 0, i*.9, 1, .16, .08); k.blob(col, place(0, .05, 0, 0, 0, .08)); break;
    case 'flower': for (let i = 0; i < 3; i++) { k.stem(STEM, 0, -.1, 0, (i - 1)*.04, .06, 0, .006); k.blob(i % 2 ? crop.colors.flower : col, place((i - 1)*.04, .08, 0, 0, 0, .045, .035, .045)); } break;
    case 'sunflower': k.put(crop.colors.flower, new THREE.CylinderGeometry(.11, .1, .04, 16), place(0, 0, 0, 0, Math.PI/2));
      for (let i = 0; i < 14; i++) k.put(col, new THREE.SphereGeometry(1, 8, 5), new THREE.Matrix4().makeRotationZ(i/14*Math.PI*2).multiply(new THREE.Matrix4().makeTranslation(0, .15, .01)).multiply(SC.makeScale(.03, .06, .01)));
      break;
    case 'vine': for (let i = 0; i < 3; i++) k.put(col, new THREE.CylinderGeometry(.018, .014, .16, 6), place((i - 1)*.035, 0, 0, 0, .2*(i - 1))); break;
    case 'tomato': case 'berry':
      if (crop.look === 'berry') k.put(col, new THREE.ConeGeometry(.05, .1, 10), place(0, 0, 0, 0, Math.PI)); else k.blob(col, place(0, 0, 0, 0, 0, .07, .062, .07));
      k.put(STEM, new THREE.ConeGeometry(.03, .02, 5), place(0, crop.look === 'berry' ? .01 : .06, 0));
      break;
    case 'pumpkin': for (let i = 0; i < 6; i++) { const a = i/6*Math.PI*2; k.blob(col, place(Math.cos(a)*.06, 0, Math.sin(a)*.06, -a, 0, .12, .15, .15)); } k.stem(0x6a5a2a, 0, .13, 0, .02, .18, 0, .02); break;
    case 'corn': k.put(col, new THREE.CylinderGeometry(.045, .035, .22, 10), place(0, 0, 0)); k.leaf(0x8ab85a, 0, -.1, 0, 0, 1.3, .2, .05); k.leaf(0x8ab85a, 0, -.1, 0, Math.PI, 1.3, .2, .05); break;
  }
  k.finish(root, .01);
  return root;
}
