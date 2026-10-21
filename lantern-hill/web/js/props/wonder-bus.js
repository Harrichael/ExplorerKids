import * as THREE from 'three';
import { C, T, add, box, cyl, glowM, outline, sph, tex } from '../core/kit.js';

// The bus stands tall enough that the class walks in through its door at their own size. Its door
// (on the -z side, in the model's coordinates) is what boarding aims for and must stay clear of.
const L = .55;
export const BUS = {top:1.9 + L, door:{x:1.62, w:.8, y0:.62, y1:1.86 + L, step:.39}};

// Returns the parts that glow, so the bus at home can sleep with its lamps out (hq/garden.js).
export function buildBus(body){
  const teal = T(0x2f8f8a), tealDk = T(0x24706b), gold = T(C.gold), plum = T(C.plum), ink = T(C.ink), cream = T(C.cream);
  const glass = T(0xa8dcef, {emissive:0x4a8ab8, emissiveIntensity:.45});
  const top = BUS.top;
  outline(box(4.6, 1.3 + L, 1.9, teal, 0, 1.25 + L/2, 0, body), 1.02);
  const roof = add(new THREE.CylinderGeometry(.95, .95, 4.6, 22, 1, false, 0, Math.PI), teal, 0, top, 0, body); roof.rotation.z = Math.PI/2; roof.scale.set(.42, 1, 1);
  box(4.64, .14, 1.94, gold, 0, 1.16, 0, body);
  box(4.64, .34, 1.94, plum, 0, .77, 0, body);
  // a pane a side, so the door can take the place of the front one on its side
  const wh = .56 + L*.7, wy = top - .02 - wh/2;
  for (let i = 0; i < 4; i++) for (const sz of [-1, 1]) { const x = -1.55 + i*.98; if (i === 3 && sz < 0) continue;
    box(.76, wh, .03, glass, x, wy, sz*.96, body, false); box(.86, .06, .02, gold, x, top + .01, sz*.98, body, false); box(.86, .06, .02, gold, x, wy - wh/2 - .02, sz*.98, body, false); }
  const hood = box(.72, .82, 1.84, teal, 2.62, .97, 0, body); outline(hood, 1.03);
  box(.74, .1, 1.86, gold, 2.62, 1.16, 0, body);
  // a tall windshield is a lot of glass: two panes split by a pillar, under a teal brow
  const wsH = .7 + L*.6, wsY = 1.3 + wsH/2, wsGlass = T(0x94cde4, {emissive:0x2f6a98, emissiveIntensity:.35});
  for (const sz of [-1, 1]) box(.06, wsH, .76, wsGlass, 2.27 + L*.06, wsY, sz*.41, body, false).rotation.z = -.18;
  box(.08, wsH + .04, .07, tealDk, 2.28 + L*.06, wsY, 0, body, false).rotation.z = -.18;
  box(.06, .55 + L*.6, 1.4, glass, -2.31, 1.6 + L/2, 0, body, false);
  box(.22, .2, 2.0, ink, 3.02, .62, 0, body); box(.22, .2, 2.0, ink, -2.38, .62, 0, body);
  box(.05, .38, 1.0, ink, 2.99, .97, 0, body, false); for (let k = 0; k < 4; k++) box(.06, .04, .96, gold, 3.0, .83 + k*.09, 0, body, false);
  const lamps = [];
  for (const zz of [-.68, .68]) { lamps.push(sph(.14, glowM(0xfff0b0, 1.3).clone(), 2.98, 1.12, zz, body, 10, false)); add(new THREE.TorusGeometry(.15, .03, 6, 14), gold, 2.99, 1.12, zz, body, false).rotation.y = Math.PI/2; }
  // The door stands open, as tall as the side, so the class can walk in upright. The doorway is dark
  // and drawn just proud of the side, so whoever is halfway through has their front half in the dark.
  const {x:DX, w:DW, y0:D0, y1:D1} = BUS.door, dm = (D0 + D1)/2;
  box(DW, D1 - D0, .02, T(0x241a2c, {emissive:0x3a2418, emissiveIntensity:.35}), DX, dm, -.96, body, false);
  box(.04, D1 - D0 - .3, .03, gold, DX + DW/2 - .12, dm + .05, -.965, body, false);
  for (const s of [-1, 1]) { box(.05, D1 - D0 + .05, .05, gold, DX + s*(DW/2 + .02), dm, -.975, body, false);
    // the folding doors, pushed back against each side of the doorway
    box(.16, D1 - D0 - .1, .04, tealDk, DX + s*(DW/2 + .12), dm, -.99, body, false); box(.1, (D1 - D0)*.4, .045, glass, DX + s*(DW/2 + .12), dm + (D1 - D0)*.18, -.99, body, false); }
  box(DW + .14, .05, .05, gold, DX, D1 + .03, -.975, body, false);
  box(DW + .06, .08, .34, gold, DX, .34, -1.08, body); box(DW, .04, .3, plum, DX, .385, -1.08, body, false);
  for (const zz of [-1.07, 1.07]) { box(.05, .05, .2, ink, 2.42, 1.62 + L/2, zz*.97, body, false); box(.06, .2, .1, ink, 2.42, 1.62 + L/2, zz*1.03, body, false); }
  // the front wheels sit under the hood, as on a school bus, leaving the door clear
  for (const [wx, wz] of [[2.55, -.96], [2.55, .96], [-1.5, -.96], [-1.5, .96]]) {
    const wh = add(new THREE.CylinderGeometry(.4, .4, .3, 18), ink, wx, .42, wz, body); wh.rotation.x = Math.PI/2; outline(wh, 1.05);
    const hub = add(new THREE.CylinderGeometry(.17, .17, .32, 12), gold, wx, .42, wz, body, false); hub.rotation.x = Math.PI/2;
    const arch = add(new THREE.CylinderGeometry(.5, .5, .34, 16, 1, true, -Math.PI/2, Math.PI), T(0x24706b, {side:THREE.DoubleSide}), wx, .5, wz, body, false); arch.rotation.x = Math.PI/2; arch.rotation.z = Math.PI/2;
  }
  const pads = [];
  for (const px of [-.9, .9]) pads.push(cyl(.45, .38, .1, glowM(0x6ff0ff, 1.1), px, .55, 0, body));
  for (const zz of [-.55, .55]) { const th = add(new THREE.CylinderGeometry(.2, .26, .5, 12), T(0x5a5068), -2.62, 1.05, zz, body); th.rotation.z = Math.PI/2; outline(th, 1.06); const fl = add(new THREE.CircleGeometry(.16, 12), glowM(0xffa040, 1.3), -2.88, 1.05, zz, body, false); fl.rotation.y = -Math.PI/2; pads.push(fl); }
  for (const zz of [-.62, .62]) box(3.2, .05, .05, gold, -.2, top + .46, zz, body, false);
  for (let k = 0; k < 4; k++) box(.05, .12, 1.3, gold, -1.6 + k*.95, top + .42, 0, body, false);
  box(.8, .38, .6, plum, -.9, top + .65, .15, body).rotation.y = .2; box(.5, .3, .5, gold, .1, top + .62, -.2, body).rotation.y = -.3;
  const sb = box(.08, .34, 1.3, ink, 2.18, top + .38, 0, body);
  const signTex = tex(320, 84, (c, cw, ch) => { c.fillStyle = '#1a1320'; c.fillRect(0, 0, cw, ch); c.fillStyle = '#ffd36b'; c.font = '800 46px Nunito, sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('FIELD TRIP', cw/2, ch/2 + 2); });
  const sp = add(new THREE.PlaneGeometry(1.24, .3), T(0xffffff, {map:signTex, emissive:0x553300, emissiveIntensity:.4}), 2.23, top + .38, 0, body, false); sp.rotation.y = Math.PI/2;
  const sideTex = tex(512, 96, (c, cw, ch) => { c.fillStyle = '#d9a441'; c.beginPath(); for (let i = 0; i < 10; i++) { const r = i % 2 ? 14 : 34, a2 = i*Math.PI/5 - Math.PI/2; c.lineTo(48 + Math.cos(a2)*r, ch/2 + Math.sin(a2)*r); } c.fill(); c.font = '58px Caprasimo, Georgia, serif'; c.textAlign = 'left'; c.textBaseline = 'middle'; c.fillStyle = '#efe0bf'; c.fillText('Wonder Bus', 98, ch/2 + 4); });
  for (const zz of [-.975, .975]) { const d = add(new THREE.PlaneGeometry(2.4, .45), T(0xffffff, {map:sideTex, transparent:true}), -.3, .77, zz, body, false); if (zz < 0) d.rotation.y = Math.PI; }
  cyl(.02, .02, .7, ink, -1.9, top + .55, 0, body, 5, false); const stb = sph(.09, glowM(0xffd36b, 1.2), -1.9, top + .92, 0, body, 8, false);
  return {pads, lamps, sign:sp, beacon:stb};
}
