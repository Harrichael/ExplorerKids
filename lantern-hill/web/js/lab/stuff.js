// Everything that can sit on the experiment desk: how big it is, how it pours, floats or sticks,
// and how to build it. Sizes are in world units, desk top at y = 0, each model's bottom at y = 0.
//
// kind 'vessel' holds contents and pours from its mouth when tipped (flow: liquid, drops or shake);
// kind 'solid' sinks or floats by its density; kind 'tool' is a spoon, swab, test strip or magnet; kind
// 'tray' holds things to show a prediction.

import * as THREE from 'three';
import { C, T, add, box, cyl, grad, outline, sph, tex } from '../core/kit.js';
import { UNIVERSAL, lerpCol } from './chem.js';

export const UNITS_PER_M3 = 145000;
export const capacity = d => d.cap || UNITS_PER_M3*Math.PI*d.ri*d.ri*d.hi;

const GLASS = T(0xdff1f5, {transparent:true, opacity:.2, side:THREE.DoubleSide, depthWrite:false});
const RIM = T(0xeef8fb, {transparent:true, opacity:.55, depthWrite:false});
// What's inside draws between the glass's far side and its near side, so only the near wall veils it.
const GLASS_FAR = T(0xdff1f5, {transparent:true, opacity:.2, side:THREE.BackSide, depthWrite:false});
const GLASS_NEAR = T(0xdff1f5, {transparent:true, opacity:.2, side:THREE.FrontSide, depthWrite:false});
function glass(b, ri, h, floor, wall=.006){
  const geo = new THREE.CylinderGeometry(ri + wall, ri + wall*.6, h, 24, 1, true);
  add(geo, GLASS_FAR, 0, h/2, 0, b, false).renderOrder = 0;
  add(geo, GLASS_NEAR, 0, h/2, 0, b, false).renderOrder = 3;
  const f = cyl(ri + wall*.6, ri + wall*.6, floor, GLASS, 0, floor/2, 0, b, 24, false); f.renderOrder = 0;
  const rim = add(new THREE.TorusGeometry(ri + wall*.5, wall*.5, 5, 24), RIM, 0, h, 0, b, false); rim.rotation.x = Math.PI/2; rim.renderOrder = 4;
}
function label(text, bg, fg, w=256, h=96, size=34){
  return T(0xffffff, {map:tex(w, h, (g, W, H) => { g.fillStyle = bg; g.fillRect(0, 0, W, H); g.fillStyle = fg; g.font = `900 ${size}px Nunito, sans-serif`;
    g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(text, W/2, H/2 + 2); })});
}
function band(b, r, y, h, mat){ const m = add(new THREE.CylinderGeometry(r, r, h, 20, 1, true), mat, 0, y, 0, b, false); m.rotation.y = -Math.PI/2; return m; }
function bottle(b, r, h, col, capCol, neckR, bodyH){
  outline(cyl(r, r, bodyH, T(col), 0, bodyH/2, 0, b, 18), 1.04);
  cyl(neckR*1.15, r, h*.12, T(col), 0, bodyH + h*.06, 0, b, 16);
  cyl(neckR, neckR, h - bodyH - h*.12, T(capCol), 0, (h + bodyH + h*.12)/2, 0, b, 12);
}
function dropper(col){
  return b => { outline(cyl(.019, .02, .05, T(col), 0, .025, 0, b, 14), 1.06); cyl(.012, .016, .01, T(0xf4f0e6), 0, .055, 0, b, 12);
    add(new THREE.ConeGeometry(.009, .022, 10), T(0xf4f0e6), 0, .071, 0, b); };
}
function shaker(topCol){
  return b => { const w = add(new THREE.CylinderGeometry(.022, .026, .065, 16, 1, true), GLASS, 0, .0325, 0, b, false); w.renderOrder = 3;
    cyl(.02, .024, .05, T(0xf7f7f2), 0, .027, 0, b, 14, false);
    outline(add(new THREE.SphereGeometry(.024, 14, 8, 0, Math.PI*2, 0, Math.PI/2), T(topCol), 0, .064, 0, b), 1.06);
    for (let i = 0; i < 5; i++) sph(.003, T(C.ink), Math.cos(i*1.26)*.01, .087, Math.sin(i*1.26)*.01, b, 4, false); };
}
function powderBox(text, bg, fg, fill){
  return b => { const m = T(bg);
    box(.095, .006, .065, m, 0, .003, 0, b);
    for (const [w, d, x, z] of [[.095, .004, 0, .0305], [.095, .004, 0, -.0305], [.004, .065, .0455, 0], [.004, .065, -.0455, 0]]) outline(box(w, .13, d, m, x, .065, z, b), 1.04);
    const f = add(new THREE.PlaneGeometry(.085, .05), label(text, bg, fg, 256, 150, 38), 0, .07, .0331, b, false); f.renderOrder = 1;
    // the folded-back flap, and the powder showing through the open top
    const flap = box(.095, .004, .04, m, 0, .15, -.045, b); flap.rotation.x = -.9;
    add(new THREE.PlaneGeometry(.086, .056), T(fill), 0, .12, 0, b, false).rotation.x = -Math.PI/2; };
}
function flat(b, mesh){ mesh.rotation.x = Math.PI/2; return mesh; }
const own = c => { const m = new THREE.MeshToonMaterial({gradientMap:grad, color:c}); m.userData.own = true; return m; };
// an old penny is brown with copper oxide; scrubbed off, the bright copper underneath shows
const COPPER = 0xf07a2a, OXIDE = 0x4a3a2e;
function chart(b){
  const t = tex(512, 168, (g, W, H) => {
    g.fillStyle = '#fbf4e2'; g.fillRect(0, 0, W, H);
    const w = (W - 24)/14;
    for (let i = 0; i < 14; i++) {
      const col = UNIVERSAL[i + 1], x = 12 + i*w;
      g.fillStyle = '#' + col.toString(16).padStart(6, '0'); g.fillRect(x + 2, 12, w - 4, 84);
      g.fillStyle = i > 3 && i < 8 ? '#1a1320' : '#ffffff'; g.font = '900 30px Nunito, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(i + 1, x + w/2, 56);
    }
    g.fillStyle = '#1a1320'; g.font = '900 34px Nunito, sans-serif'; g.textBaseline = 'middle';
    g.fillText('ACID', 12 + 3*w, 130); g.fillText('BASE', 12 + 10.5*w, 130);
    g.font = '900 22px Nunito, sans-serif'; g.fillText('NEUTRAL', 12 + 6.5*w, 130);
  });
  box(.36, .004, .12, T(0xf4ecd8), 0, .002, 0, b);
  const f = add(new THREE.PlaneGeometry(.35, .115), T(0xffffff, {map:t}), 0, .0042, 0, b, false); f.rotation.x = -Math.PI/2;
}

export const ITEMS = {
  // ---------- containers to pour into ----------
  cup:    {name:'Cup', kind:'vessel', r:.066, h:.13, ri:.058, floor:.012, hi:.115, see:true, flow:'liquid', rate:80, build: b => glass(b, .058, .13, .012)},
  jar:    {name:'Tall jar', kind:'vessel', r:.058, h:.25, ri:.05, floor:.015, hi:.23, see:true, flow:'liquid', rate:70, build: b => glass(b, .05, .25, .015)},
  tub:    {name:'Tub of water', kind:'vessel', r:.17, h:.12, ri:.16, floor:.01, hi:.105, see:true, flow:'liquid', rate:120, build: b => glass(b, .16, .12, .01, .008)},
  dish:   {name:'Dish', kind:'vessel', r:.12, h:.032, ri:.11, floor:.006, hi:.024, see:true, flow:'liquid', rate:70, build: b => glass(b, .11, .032, .006, .007)},
  saucer: {name:'Soap dish', kind:'vessel', r:.056, h:.024, ri:.048, floor:.008, hi:.014, see:true, flow:'liquid', rate:30,
    build: b => { outline(add(new THREE.CylinderGeometry(.056, .045, .024, 20, 1, true), T(0xf4f0e6, {side:THREE.DoubleSide}), 0, .012, 0, b), 1.05); cyl(.045, .045, .008, T(0xf4f0e6), 0, .004, 0, b, 20); }},
  bottle: {name:'Bottle', kind:'vessel', r:.05, h:.19, ri:.044, floor:.012, hi:.11, see:true, flow:'liquid', rate:40, mouth:.02, neck:true,
    build: b => { const w = add(new THREE.CylinderGeometry(.05, .05, .12, 22, 1, true), GLASS, 0, .06, 0, b, false); w.renderOrder = 3;
      const sh = add(new THREE.CylinderGeometry(.024, .05, .03, 22, 1, true), GLASS, 0, .135, 0, b, false); sh.renderOrder = 3;
      const nk = add(new THREE.CylinderGeometry(.022, .024, .04, 16, 1, true), GLASS, 0, .17, 0, b, false); nk.renderOrder = 3;
      const f = cyl(.05, .05, .012, GLASS, 0, .006, 0, b, 22, false); f.renderOrder = 3;
      const rim = add(new THREE.TorusGeometry(.023, .004, 5, 16), RIM, 0, .19, 0, b, false); rim.rotation.x = Math.PI/2; rim.renderOrder = 4; }},
  // a wide chamber inside under a narrow crater, like a bottle hidden in a hill: the gas has to squeeze out
  volcano: {name:'Volcano', kind:'vessel', r:.2, h:.17, ri:.05, floor:.025, hi:.115, see:true, flow:'liquid', rate:40, mouth:.03,
    build: b => { outline(add(new THREE.CylinderGeometry(.034, .2, .17, 18, 1, true), T(0x8a5a3a, {side:THREE.DoubleSide}), 0, .085, 0, b), 1.03);
      for (const [y, r, c] of [[.04, .175, 0x6b4430], [.11, .1, 0x9a6a45]]) { const s = add(new THREE.TorusGeometry(r, .012, 5, 18), T(c), 0, y, 0, b); s.rotation.x = Math.PI/2; s.scale.z = .5; }
      add(new THREE.CylinderGeometry(.03, .03, .03, 14, 1, true), T(C.woodDk, {side:THREE.BackSide}), 0, .155, 0, b, false);
      const rim = add(new THREE.TorusGeometry(.032, .007, 6, 18), T(0x5a3626), 0, .17, 0, b); rim.rotation.x = Math.PI/2; }},
  // ---------- supplies ----------
  pitcher: {name:'Water', kind:'vessel', r:.08, h:.19, ri:.068, floor:.012, hi:.17, see:true, flow:'liquid', rate:90,
    build: b => { glass(b, .068, .19, .012); const hd = add(new THREE.TorusGeometry(.045, .009, 6, 14, Math.PI), T(0xdff1f5, {transparent:true, opacity:.6}), .072, .1, 0, b, false); hd.rotation.z = -Math.PI/2; }},
  vinegar: {name:'Vinegar', kind:'vessel', r:.036, h:.19, ri:.032, floor:.01, hi:.13, flow:'liquid', rate:55, mouth:.012,
    build: b => { bottle(b, .036, .19, 0xf4f1e8, C.rust, .013, .13); band(b, .037, .07, .06, label('VINEGAR', '#f4f1e8', '#b5552f', 256, 64, 40)); }},
  lemon:  {name:'Lemon juice', kind:'vessel', r:.038, h:.11, ri:.03, floor:.01, hi:.07, flow:'liquid', rate:35, mouth:.008,
    build: b => { const l = outline(sph(.038, T(0xf2d43a), 0, .045, 0, b, 16), 1.05); l.scale.set(1, 1.15, 1); add(new THREE.ConeGeometry(.012, .03, 10), T(0x4f9a3e), 0, .098, 0, b); }},
  milk:   {name:'Milk', kind:'vessel', r:.054, h:.19, ri:.034, floor:.01, hi:.13, flow:'liquid', rate:60, mouth:.016,
    build: b => { outline(box(.075, .14, .075, T(0xf7f6f0), 0, .07, 0, b), 1.03);
      const f = add(new THREE.PlaneGeometry(.07, .06), label('MILK', '#4a7ad0', '#ffffff', 128, 110, 40), 0, .075, .0381, b, false); f.renderOrder = 1;
      for (const sz of [-1, 1]) box(.077, .005, .054, T(0x4a7ad0), 0, .158, sz*.019, b).rotation.x = sz*.78;
      box(.077, .014, .006, T(0xf7f6f0), 0, .181, 0, b); }},
  cabbage: {name:'Cabbage juice', kind:'vessel', r:.064, h:.16, ri:.054, floor:.012, hi:.14, see:true, flow:'liquid', rate:70,
    build: b => { glass(b, .054, .16, .012); const hd = add(new THREE.TorusGeometry(.038, .008, 6, 14, Math.PI), T(0xdff1f5, {transparent:true, opacity:.6}), .058, .085, 0, b, false); hd.rotation.z = -Math.PI/2; }},
  oil:    {name:'Oil', kind:'vessel', r:.035, h:.22, ri:.03, floor:.01, hi:.14, see:true, flow:'liquid', rate:45, mouth:.012,
    build: b => { const w = add(new THREE.CylinderGeometry(.035, .035, .15, 18, 1, true), GLASS, 0, .075, 0, b, false); w.renderOrder = 3;
      const nk = add(new THREE.CylinderGeometry(.013, .035, .045, 16, 1, true), GLASS, 0, .172, 0, b, false); nk.renderOrder = 3;
      cyl(.014, .014, .02, T(C.gold), 0, .21, 0, b, 10); }},
  soap:   {name:'Dish soap', kind:'vessel', r:.034, h:.18, ri:.028, floor:.01, hi:.13, flow:'liquid', rate:25, mouth:.008,
    build: b => { bottle(b, .034, .18, 0x5fbf73, 0xf4f0e6, .012, .14); band(b, .035, .075, .05, label('SOAP', '#f4f0e6', '#2f8f4a', 256, 64, 42)); }},
  red:    {name:'Red coloring', kind:'vessel', r:.021, h:.082, ri:.016, floor:.005, hi:.045, flow:'drops', mouth:.003, build: dropper(0xd8303a)},
  yellow: {name:'Yellow coloring', kind:'vessel', r:.021, h:.082, ri:.016, floor:.005, hi:.045, flow:'drops', mouth:.003, build: dropper(0xf2c82e)},
  blue:   {name:'Blue coloring', kind:'vessel', r:.021, h:.082, ri:.016, floor:.005, hi:.045, flow:'drops', mouth:.003, build: dropper(0x2f6fe0)},
  soda:   {name:'Baking soda', kind:'vessel', r:.06, h:.13, ri:.04, floor:.01, hi:.12, flow:'liquid', rate:22, mouth:.036, build: powderBox('BAKING SODA', '#e8752e', '#ffffff', 0xf6f4ee)},
  sugar:  {name:'Sugar', kind:'vessel', r:.06, h:.13, ri:.04, floor:.01, hi:.12, flow:'liquid', rate:18, mouth:.036, build: powderBox('SUGAR', '#f4efe2', '#6d3b5e', 0xfbf3e0)},
  saltbox: {name:'Salt box', kind:'vessel', r:.06, h:.13, ri:.04, floor:.01, hi:.12, flow:'liquid', rate:18, mouth:.036, build: powderBox('SALT', '#2f5d9e', '#ffffff', 0xffffff)},
  sand:   {name:'Sand', kind:'vessel', r:.046, h:.075, ri:.04, floor:.008, hi:.06, see:true, flow:'liquid', rate:18,
    build: b => { outline(add(new THREE.CylinderGeometry(.046, .036, .075, 16, 1, true), T(0xd8473a, {side:THREE.DoubleSide}), 0, .0375, 0, b), 1.04); cyl(.036, .036, .008, T(0xd8473a), 0, .004, 0, b, 16);
      const hd = add(new THREE.TorusGeometry(.046, .003, 4, 16, Math.PI), T(C.ink), 0, .075, 0, b, false); hd.rotation.y = Math.PI/2; }},
  salt:   {name:'Salt', kind:'vessel', r:.026, h:.09, ri:.02, floor:.005, hi:.06, flow:'shake', mouth:.01, build: shaker(0xc9ced6)},
  pepper: {name:'Pepper', kind:'vessel', r:.026, h:.09, ri:.02, floor:.005, hi:.06, flow:'shake', mouth:.01, build: shaker(0x3a2e26)},
  balloon: {name:'Balloon', kind:'vessel', r:.045, h:.11, ri:.03, floor:.01, hi:.08, flow:'liquid', rate:30, mouth:.016, balloon:true,
    build: b => {
      // the blob is built mouth-down at its origin so it can hang off a bottle neck; standing free it's flipped over
      const blob = new THREE.Group(); b.add(blob);
      const skin = T(0xe0423a), sk = outline(sph(.042, skin, 0, .06, 0, blob, 16), 1.05); sk.scale.set(.85, 1.15, .85);
      cyl(.012, .016, .03, skin, 0, .012, 0, blob, 10); const lip = add(new THREE.TorusGeometry(.012, .004, 5, 12), skin, 0, 0, 0, blob); lip.rotation.x = Math.PI/2;
      blob.rotation.z = Math.PI; blob.position.y = .11; return {blob}; }},
  // ---------- things that sink or float ----------
  egg:    {name:'Egg', kind:'solid', r:.028, h:.07, density:1.03, build: b => { const e = outline(sph(.028, T(0xf4e8d2), 0, .035, 0, b, 16), 1.06); e.scale.y = 1.25; }},
  apple:  {name:'Apple', kind:'solid', r:.043, h:.09, density:.8, build: b => { const a = outline(sph(.043, T(0xd23a2e), 0, .042, 0, b, 16), 1.05); a.scale.y = .92;
    cyl(.004, .004, .025, T(C.woodDk), 0, .085, 0, b, 5); const lf = sph(.012, T(C.moss), .012, .088, 0, b, 8); lf.scale.set(1.4, .4, .8); }},
  rock:   {name:'Rock', kind:'solid', r:.032, h:.05, density:2.6, build: b => { const r = outline(add(new THREE.DodecahedronGeometry(.032), T(0x8a8494), 0, .024, 0, b), 1.06); r.scale.y = .75; r.rotation.set(.4, .7, .2); }},
  // it fits a bottle's neck: let go on one, it plugs it
  cork:   {name:'Cork', kind:'solid', r:.02, h:.042, density:.24, stopper:true, build: b => outline(cyl(.018, .021, .042, T(0xc89a64), 0, .021, 0, b, 12), 1.06)},
  coin:   {name:'Coin', kind:'solid', r:.021, h:.006, density:8.9, build: (b, o) => { const face = outline(cyl(.021, .021, .006, own(0), 0, .003, 0, b, 18), 1.08); ITEMS.coin.shade({face}, o.tarnish || 0); return {face}; },
    shade: ({face}, t) => { face.material.color.setHex(lerpCol(COPPER, OXIDE, t)); face.material.emissive.setHex(COPPER); face.material.emissiveIntensity = .4*(1 - t)**2; }},
  duck:   {name:'Rubber duck', kind:'solid', r:.036, h:.07, density:.25, build: b => { const y = T(0xf7d23a), bd = outline(sph(.032, y, 0, .026, 0, b, 14), 1.05); bd.scale.set(1.2, .8, 1);
    outline(sph(.02, y, .022, .058, 0, b, 12), 1.06); const bk = sph(.009, T(0xe8752e), .043, .055, 0, b, 8); bk.scale.set(1.4, .6, 1);
    for (const z of [-.009, .009]) sph(.0035, T(C.ink), .035, .064, z, b, 5, false); }},
  paperclip: {name:'Paperclip', kind:'solid', r:.022, h:.006, density:7.8, magnetic:true,
    build: b => { const m = T(0xc8ced8); for (const [s, x] of [[1, 0], [.62, .004]]) { const t = flat(b, add(new THREE.TorusGeometry(.01*s, .0018, 4, 14), m, x, .003, 0, b)); t.scale.x = 1.9; } }},
  nail:   {name:'Nail', kind:'solid', r:.036, h:.012, density:7.8, magnetic:true,
    build: b => { const s = cyl(.0028, .0028, .065, T(0x9aa0aa), 0, .005, 0, b, 6); s.rotation.z = Math.PI/2; const hd = cyl(.008, .008, .003, T(0x9aa0aa), -.033, .005, 0, b, 10); hd.rotation.z = Math.PI/2;
      const tp = add(new THREE.ConeGeometry(.0028, .008, 6), T(0x9aa0aa), .036, .005, 0, b); tp.rotation.z = -Math.PI/2; }},
  key:    {name:'Key', kind:'solid', r:.03, h:.008, density:7.8, magnetic:true,
    build: b => { const m = T(0xb8bec8); flat(b, add(new THREE.TorusGeometry(.011, .004, 5, 14), m, -.018, .004, 0, b)); box(.034, .005, .006, m, .01, .004, 0, b); box(.006, .005, .008, m, .022, .004, .006, b); box(.005, .005, .006, m, .014, .004, .005, b); }},
  foil:   {name:'Foil ball', kind:'solid', r:.024, h:.046, density:.4,
    build: b => { const g = new THREE.IcosahedronGeometry(.023, 1), p = g.attributes.position;
      for (let i = 0; i < p.count; i++) { const k = .82 + ((i*7919) % 13)/13*.3; p.setXYZ(i, p.getX(i)*k, p.getY(i)*k, p.getZ(i)*k); } g.computeVertexNormals();
      outline(add(g, T(0xdfe4ea, {emissive:0x555a60, emissiveIntensity:.3}), 0, .023, 0, b), 1.06); }},
  crayon: {name:'Crayon', kind:'solid', r:.037, h:.016, density:1.1,
    build: b => { const c = cyl(.008, .008, .06, T(0x3f63c8), 0, .008, 0, b, 8); c.rotation.z = Math.PI/2; const t = add(new THREE.ConeGeometry(.008, .014, 8), T(0x3f63c8), .037, .008, 0, b); t.rotation.z = -Math.PI/2;
      const w = cyl(.0085, .0085, .03, T(0xf4f0e6), -.005, .008, 0, b, 8); w.rotation.z = Math.PI/2; }},
  button: {name:'Button', kind:'solid', r:.02, h:.007, density:1.2,
    build: b => { outline(cyl(.02, .02, .007, T(0xd36a8f), 0, .0035, 0, b, 16), 1.08); for (const [x, z] of [[-.005, -.005], [.005, -.005], [-.005, .005], [.005, .005]]) cyl(.0025, .0025, .008, T(0x8a3a5a), x, .004, z, b, 6, false); }},
  tablet: {name:'Fizzy tablet', kind:'solid', r:.02, h:.008, density:2, fizz:8, build: b => outline(cyl(.02, .02, .008, T(0xf6f6f0), 0, .004, 0, b, 16), 1.08)},
  chart:  {name:'pH chart', kind:'solid', r:.18, h:.004, density:.9, build: chart},
  // ---------- prediction trays: put each thing in the tray that matches your guess ----------
  tray:   {name:'Tray', kind:'tray', r:.15, h:.035, w:.28, d:.17,
    build: (b, o) => { const m = T(o.color || 0x6d3b5e);
      box(.28, .008, .17, m, 0, .004, 0, b);
      for (const [w, d, x, z] of [[.28, .01, 0, .08], [.28, .01, 0, -.08], [.01, .17, .135, 0], [.01, .17, -.135, 0]]) outline(box(w, .035, d, m, x, .0175, z, b), 1.03);
      const t = add(new THREE.PlaneGeometry(.26, .15), T(0xffffff, {map:tex(256, 148, (g, W, H) => { g.fillStyle = '#efe0bf'; g.fillRect(0, 0, W, H);
        g.fillStyle = '#1a1320'; g.font = '900 46px Nunito, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(o.label || '?', W/2, H/2 + 3); }), transparent:true, opacity:.9}), 0, .0085, 0, b, false);
      t.rotation.x = -Math.PI/2; }},
  // ---------- tools ----------
  // stirs, and carries a spoonful of powder from a box to wherever it dips next
  spoon:  {name:'Spoon', kind:'tool', tool:'spoon', dips:true, r:.02, h:.2, grip:.17,
    build: b => { const m = T(0xc8ced8); box(.008, .17, .004, m, 0, .11, 0, b); const bowl = outline(sph(.016, m, 0, .016, 0, b, 12), 1.08); bowl.scale.set(1, 1.3, .5);
      const heap = sph(.012, new THREE.MeshToonMaterial({gradientMap:grad, color:0xffffff}), 0, .02, .005, b, 8, false); heap.scale.set(1, .6, .8);
      heap.visible = false; heap.userData.own = true; return {heap}; }},
  swab:   {name:'Cotton swab', kind:'tool', tool:'swab', dips:true, r:.012, h:.15, grip:.12,
    build: b => { cyl(.0025, .0025, .13, T(0xf4f0e6), 0, .075, 0, b, 6); const tip = sph(.008, T(0xffffff), 0, .009, 0, b, 10); tip.scale.y = 1.5; const top = sph(.008, T(0xffffff), 0, .141, 0, b, 10); top.scale.y = 1.5; return {tip}; }},
  magnet: {name:'Magnet', kind:'tool', tool:'magnet', r:.045, h:.085, grip:.07,
    build: b => { outline(add(new THREE.TorusGeometry(.03, .011, 8, 18, Math.PI), T(0xd8303a), 0, .05, 0, b), 1.06);
      for (const x of [-.03, .03]) { box(.022, .03, .022, T(0xd8303a), x, .035, 0, b); box(.022, .018, .022, T(0xc8ced8), x, .011, 0, b); } }},
  // its pad takes the universal indicator color of whatever it's dipped in
  strip:  {name:'Test strip', kind:'tool', tool:'strip', dips:true, r:.014, h:.14, grip:.11,
    build: b => { outline(box(.013, .11, .0018, T(0xf7f5ee), 0, .085, 0, b), 1.08); const pad = outline(box(.02, .032, .005, own(0xf2dfa6), 0, .016, 0, b), 1.08); return {pad}; }},
  bar:    {name:'Bar magnet', kind:'tool', tool:'magnet', r:.07, h:.026, grip:.018, density:7.3, pull:.5,
    build: b => { for (const [x, col, n] of [[-.035, 0xd8303a, 'N'], [.035, 0x3f63c8, 'S']]) { outline(box(.07, .026, .024, T(col), x, .013, 0, b), 1.03);
      const f = add(new THREE.PlaneGeometry(.022, .018), label(n, col === 0xd8303a ? '#d8303a' : '#3f63c8', '#ffffff', 64, 52, 46), x*1.5, .0262, 0, b, false); f.rotation.x = -Math.PI/2; } }}
};

// what each supply comes filled with, and how much it holds; Free Lab tops them up whenever they're set down
const STOCK = {pitcher:[340, {water:340}], vinegar:[250, {vinegar:250}], lemon:[150, {lemon:150}], milk:[300, {milk:300}],
  cabbage:[300, {cabbage:300}], oil:[200, {oil:200}], soap:[150, {soap:150}], saucer:[20, {soap:20}],
  red:[60, {red:60}], yellow:[60, {yellow:60}], blue:[60, {blue:60}], soda:[160, {soda:160}], sugar:[120, {sugar:120}], saltbox:[150, {salt:150}],
  sand:[80, {sand:80}], salt:[60, {salt:60}], pepper:[40, {pepper:40}]};
for (const k in STOCK) Object.assign(ITEMS[k], {cap:STOCK[k][0], fill:STOCK[k][1], supply:true});

// What each thing is to the physics engine, in its own frame with the bottom centre at the origin:
//   ['hollow', ri, h, wall, floor]   an open cup: a floor and a ring of wall panels, so things drop inside
//   ['neck', r, y0, y1, rOut]        a narrower ring on top of a hollow, with a shoulder out to rOut
//   ['cyl', r, h, y0]  ['box', w, h, d, y0]  ['ball', r, y]
//   ['crater', rTop, rBottom, h, ri, neckY, rNeck, floor]   a cone with a chamber inside, narrow at the top
//   ['bar', len, thick, axis, y]     a thin rod lying along x, or standing up (axis 'y')
// Solids weigh their density; containers are light shells that carry the weight of what's in them.
const SHAPE = {
  cup: [['hollow', .058, .13, .008, .012]], jar: [['hollow', .05, .25, .008, .015]], tub: [['hollow', .16, .12, .01, .01]],
  dish: [['hollow', .11, .032, .01, .006]], saucer: [['hollow', .048, .024, .008, .008]], pitcher: [['hollow', .068, .19, .012, .012]],
  cabbage: [['hollow', .054, .16, .01, .012]], sand: [['hollow', .04, .075, .006, .008]],
  bottle: [['hollow', .044, .12, .006, .012], ['neck', .022, .12, .19, .05]],
  volcano: [['crater', .034, .2, .17, .05, .14, .03, .025]],
  vinegar: [['cyl', .036, .19, 0]], lemon: [['cyl', .036, .1, 0]], milk: [['box', .075, .18, .075, 0]], oil: [['cyl', .035, .22, 0]],
  soap: [['cyl', .034, .18, 0]], red: [['cyl', .02, .08, 0]], yellow: [['cyl', .02, .08, 0]], blue: [['cyl', .02, .08, 0]],
  soda: [['hollow-box', .095, .13, .065, .005]], sugar: [['hollow-box', .095, .13, .065, .005]], saltbox: [['hollow-box', .095, .13, .065, .005]],
  salt: [['cyl', .025, .09, 0]], pepper: [['cyl', .025, .09, 0]],
  balloon: [['cyl', .036, .07, 0], ['cyl', .014, .04, .07]],
  egg: [['ball', .028, .032]], apple: [['ball', .043, .042]], rock: [['ball', .027, .024]], cork: [['cyl', .02, .042, 0]],
  coin: [['cyl', .021, .006, 0]], duck: [['ball', .033, .028]], paperclip: [['box', .04, .005, .014, 0]], nail: [['bar', .075, .008, 'x', .005]],
  key: [['box', .055, .006, .022, 0]], foil: [['ball', .022, .023]], crayon: [['bar', .074, .016, 'x', .008]], button: [['cyl', .02, .007, 0]],
  tablet: [['cyl', .02, .008, 0]], chart: [['box', .36, .004, .12, 0]],
  tray: [['hollow-box', .28, .035, .17, .008]],
  spoon: [['box', .01, .17, .005, .03], ['ball', .016, .016]], swab: [['bar', .15, .012, 'y', 0]],
  magnet: [['box', .085, .03, .022, .05], ['box', .022, .05, .022, 0, -.03], ['box', .022, .05, .022, 0, .03]],
  strip: [['bar', .14, .012, 'y', 0]], bar: [['box', .14, .026, .024, 0]]
};
// Where a magnet pulls from, [x, y, z, which way round], in its own frame. Steel has poles at its two
// ends too, but they only pull once it's been made into a magnet, and which end is which depends on how.
const POLES = {magnet: [[-.03, .004, 0, 1], [.03, .004, 0, -1]], bar: [[-.066, .02, 0, 1], [.066, .02, 0, -1]],
  nail: [[-.033, .005, 0, 1], [.036, .005, 0, -1]], paperclip: [[-.02, .003, 0, 1], [.02, .003, 0, -1]], key: [[-.028, .004, 0, 1], [.028, .004, 0, -1]]};
for (const k in POLES) ITEMS[k].poles = POLES[k].map(([x, y, z, n]) => ({x, y, z, n}));
// where a container opens: liquid and powder inside this cylinder belong to it; it pours from its rim
const OPEN = {bottle: {y:.19, r:.022, neckY:.12}, volcano: {y:.17, r:.03, neckY:.14}, soda: {y:.13, r:.04}, sugar: {y:.13, r:.04}, saltbox: {y:.13, r:.04}, balloon: {y:.11, r:.03}};
// what each thing is made of, which is how it sounds when it's set down or knocked
const MATTER = {
  glass: ['cup', 'jar', 'dish', 'bottle', 'pitcher', 'cabbage', 'oil'], clay: ['saucer', 'volcano'], metal: ['coin', 'paperclip', 'nail', 'key', 'spoon', 'magnet', 'bar'],
  plastic: ['tub', 'vinegar', 'soap', 'red', 'yellow', 'blue', 'salt', 'pepper', 'lemon', 'sand', 'button', 'crayon'], card: ['milk', 'soda', 'sugar', 'saltbox', 'chart'],
  wood: ['tray', 'cork'], rubber: ['duck', 'balloon'], stone: ['rock'], food: ['apple', 'egg'], foil: ['foil'], chalk: ['tablet'], soft: ['swab', 'strip']};
for (const m in MATTER) for (const k of MATTER[m]) ITEMS[k].matter = m;
// glass weighs what glass weighs; plastic tubs and trays are lighter
for (const k of ['cup', 'jar', 'dish', 'bottle', 'pitcher', 'cabbage']) ITEMS[k].glass = true;
for (const k in ITEMS) { const d = ITEMS[k]; d.shape = SHAPE[k];
  if (d.kind === 'vessel') d.open = Object.assign({y:d.h, r:d.mouth || d.ri}, OPEN[k]); }
