import * as THREE from 'three';
import { C, T, add, box, cyl, glowM, outline, sph, tex } from '../core/kit.js';

export function buildBus(body){
  const teal = T(0x2f8f8a), tealDk = T(0x24706b), gold = T(C.gold), plum = T(C.plum), ink = T(C.ink), cream = T(C.cream);
  const glass = T(0xa8dcef, {emissive:0x4a8ab8, emissiveIntensity:.45});
  outline(box(4.6, 1.3, 1.9, teal, 0, 1.25, 0, body), 1.02);
  const roof = add(new THREE.CylinderGeometry(.95, .95, 4.6, 22, 1, false, 0, Math.PI), teal, 0, 1.9, 0, body); roof.rotation.z = Math.PI/2; roof.scale.set(.42, 1, 1);
  box(4.64, .14, 1.94, gold, 0, 1.16, 0, body);
  box(4.64, .34, 1.94, plum, 0, .77, 0, body);
  for (let i = 0; i < 4; i++) { const x = -1.55 + i*.98; box(.76, .56, 1.95, glass, x, 1.6, 0, body, false); for (const zz of [-.98, .98]) { box(.86, .06, .02, gold, x, 1.91, zz, body, false); box(.86, .06, .02, gold, x, 1.3, zz, body, false); } }
  const hood = box(.72, .82, 1.84, teal, 2.62, .97, 0, body); outline(hood, 1.03);
  box(.74, .1, 1.86, gold, 2.62, 1.16, 0, body);
  const ws = box(.06, .7, 1.62, glass, 2.27, 1.62, 0, body, false); ws.rotation.z = -.18;
  box(.06, .55, 1.4, glass, -2.31, 1.6, 0, body, false);
  box(.22, .2, 2.0, ink, 3.02, .62, 0, body); box(.22, .2, 2.0, ink, -2.38, .62, 0, body);
  box(.05, .38, 1.0, ink, 2.99, .97, 0, body, false); for (let k = 0; k < 4; k++) box(.06, .04, .96, gold, 3.0, .83 + k*.09, 0, body, false);
  for (const zz of [-.68, .68]) { sph(.14, glowM(0xfff0b0, 1.3), 2.98, 1.12, zz, body, 10, false); add(new THREE.TorusGeometry(.15, .03, 6, 14), gold, 2.99, 1.12, zz, body, false).rotation.y = Math.PI/2; }
  box(.62, 1.12, .04, tealDk, 1.62, 1.18, -.97, body, false); box(.04, 1.0, .05, gold, 1.62, 1.18, -.99, body, false); box(.5, .4, .05, glass, 1.62, 1.45, -.985, body, false);
  for (const zz of [-1.07, 1.07]) { box(.05, .05, .2, ink, 2.42, 1.62, zz*.97, body, false); box(.06, .2, .1, ink, 2.42, 1.62, zz*1.03, body, false); }
  for (const [wx, wz] of [[1.6, -.96], [1.6, .96], [-1.5, -.96], [-1.5, .96]]) {
    const wh = add(new THREE.CylinderGeometry(.4, .4, .3, 18), ink, wx, .42, wz, body); wh.rotation.x = Math.PI/2; outline(wh, 1.05);
    const hub = add(new THREE.CylinderGeometry(.17, .17, .32, 12), gold, wx, .42, wz, body, false); hub.rotation.x = Math.PI/2;
    const arch = add(new THREE.CylinderGeometry(.5, .5, .34, 16, 1, true, -Math.PI/2, Math.PI), T(0x24706b, {side:THREE.DoubleSide}), wx, .5, wz, body, false); arch.rotation.x = Math.PI/2; arch.rotation.z = Math.PI/2;
  }
  const pads = [];
  for (const px of [-.9, .9]) pads.push(cyl(.45, .38, .1, glowM(0x6ff0ff, 1.1), px, .55, 0, body));
  for (const zz of [-.55, .55]) { const th = add(new THREE.CylinderGeometry(.2, .26, .5, 12), T(0x5a5068), -2.62, 1.05, zz, body); th.rotation.z = Math.PI/2; outline(th, 1.06); const fl = add(new THREE.CircleGeometry(.16, 12), glowM(0xffa040, 1.3), -2.88, 1.05, zz, body, false); fl.rotation.y = -Math.PI/2; pads.push(fl); }
  for (const zz of [-.62, .62]) box(3.2, .05, .05, gold, -.2, 2.36, zz, body, false);
  for (let k = 0; k < 4; k++) box(.05, .12, 1.3, gold, -1.6 + k*.95, 2.32, 0, body, false);
  box(.8, .38, .6, plum, -.9, 2.55, .15, body).rotation.y = .2; box(.5, .3, .5, gold, .1, 2.52, -.2, body).rotation.y = -.3;
  const sb = box(.08, .34, 1.3, ink, 2.18, 2.28, 0, body);
  const signTex = tex(320, 84, (c, cw, ch) => { c.fillStyle = '#1a1320'; c.fillRect(0, 0, cw, ch); c.fillStyle = '#ffd36b'; c.font = '800 46px Nunito, sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('FIELD TRIP', cw/2, ch/2 + 2); });
  const sp = add(new THREE.PlaneGeometry(1.24, .3), T(0xffffff, {map:signTex, emissive:0x553300, emissiveIntensity:.4}), 2.23, 2.28, 0, body, false); sp.rotation.y = Math.PI/2;
  const sideTex = tex(512, 96, (c, cw, ch) => { c.fillStyle = '#d9a441'; c.beginPath(); for (let i = 0; i < 10; i++) { const r = i % 2 ? 14 : 34, a2 = i*Math.PI/5 - Math.PI/2; c.lineTo(48 + Math.cos(a2)*r, ch/2 + Math.sin(a2)*r); } c.fill(); c.font = '58px Caprasimo, Georgia, serif'; c.textAlign = 'left'; c.textBaseline = 'middle'; c.fillStyle = '#efe0bf'; c.fillText('Wonder Bus', 98, ch/2 + 4); });
  for (const zz of [-.975, .975]) { const d = add(new THREE.PlaneGeometry(2.4, .45), T(0xffffff, {map:sideTex, transparent:true}), -.3, .77, zz, body, false); if (zz < 0) d.rotation.y = Math.PI; }
  cyl(.02, .02, .7, ink, -1.9, 2.45, 0, body, 5, false); const stb = sph(.09, glowM(0xffd36b, 1.2), -1.9, 2.82, 0, body, 8, false);
  return pads;
}
