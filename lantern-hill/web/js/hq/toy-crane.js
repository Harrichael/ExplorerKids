// The toy crane in the hearth room, standing by its round play mat. Its hook is a true pendulum:
// a cable of fixed length hangs from the trolley and gravity swings it, so the hook rides an arc,
// rising at each end of the swing. A gentle pump, like a kid on a swing, holds whatever swing
// the crane is asked for. Block Tower drives it; left alone it barely sways.

import * as THREE from 'three';
import { C, T, add, box, col, cyl, glowM, grp, outline, tex } from '../core/kit.js';
import { hqAnims } from './scene.js';

// The tower is played side on, in the plane z = PLAY.z, centred on the mat. G is the toy world's
// gravity, which the tower's physics shares, so a dropped block leaves the hook just as it swung.
export const PLAY = {x:1.4, z:3.5, floor:.04, top:.14, r:.59, mastX:2.45, mastW:.16, baseW:.5, baseH:.12, G:3.6};
export const GRIP = .05;   // from the claw to the top of a held block

const matTex = tex(256, 256, (g, w, h) => {
  g.fillStyle = '#4a5a8a'; g.fillRect(0, 0, w, h);
  g.strokeStyle = '#d9a441'; g.lineWidth = 9; g.beginPath(); g.arc(w/2, h/2, w/2 - 18, 0, 7); g.stroke();
  g.strokeStyle = '#e9d9b8'; g.lineWidth = 4; g.setLineDash([10, 9]); g.beginPath(); g.arc(w/2, h/2, w/2 - 38, 0, 7); g.stroke(); g.setLineDash([]);
  g.fillStyle = '#d9a441'; for (let i = 0; i < 8; i++) { const a = i/8*Math.PI*2; g.beginPath(); g.arc(w/2 + Math.cos(a)*(w/2 - 60), h/2 + Math.sin(a)*(h/2 - 60), 6, 0, 7); g.fill(); }
});
add(new THREE.CylinderGeometry(PLAY.r, PLAY.r + .02, PLAY.top - PLAY.floor, 40), [T(C.navy), T(0xffffff, {map:matTex}), T(C.navy)], PLAY.x, (PLAY.top + PLAY.floor)/2, PLAY.z, null, false);
col(PLAY.x - PLAY.r, PLAY.x + PLAY.r, PLAY.z - PLAY.r, PLAY.z + PLAY.r, -5, .3);

const yellow = T(0xe8b94a), gold = T(C.gold), rust = T(C.rust), ink = T(C.ink);
const base = grp(PLAY.mastX, PLAY.floor, PLAY.z);
outline(box(PLAY.baseW, .07, PLAY.baseW, rust, 0, PLAY.baseH - .035, 0, base), 1.04);
for (const [wx, wz] of [[-.2, -.26], [.2, -.26], [-.2, .26], [.2, .26]]) { const wh = cyl(.055, .055, .05, ink, wx, .055, wz, base, 12); wh.rotation.x = Math.PI/2; }
col(PLAY.mastX - .28, PLAY.mastX + .28, PLAY.z - .3, PLAY.z + .3);

// a telescoping mast: every stage slides out the same amount, the thinner ones nested inside
const STAGES = 12, STAGE = .9, mastFoot = PLAY.floor + PLAY.baseH;
const stages = [];
for (let i = 0; i < STAGES; i++) {
  const w = PLAY.mastW - i*.008, s = grp(PLAY.mastX, 0, PLAY.z);
  outline(box(w, STAGE, w, i % 2 ? gold : yellow, 0, STAGE/2, 0, s), 1.05);
  stages.push(s);
}

// the jib rides on the mast top; its origin is the pivot height, where the cable leaves the trolley
const reach = PLAY.mastX - PLAY.x;
const jib = grp(PLAY.mastX, 0, PLAY.z);
outline(box(reach + .7, .07, .08, yellow, (.5 - reach - .2)/2, .1, 0, jib), 1.06);
outline(box(.26, .24, .26, rust, 0, -.04, 0, jib), 1.04);
box(.02, .1, .16, glowM(0x8fb3e0, .5), -.135, -.01, 0, jib, false);
outline(box(.18, .16, .14, T(C.stone), .42, .02, 0, jib), 1.05);
box(.12, .06, .1, gold, -reach, .045, 0, jib);
const apex = new THREE.Vector3(0, .42, 0);
for (const end of [new THREE.Vector3(-reach - .15, .13, 0), new THREE.Vector3(.48, .13, 0)]) {
  const d = end.clone().sub(apex), r = cyl(.012, .012, d.length(), ink, (apex.x + end.x)/2, (apex.y + end.y)/2, 0, jib, 6, false);
  r.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.normalize());
}
cyl(.03, .03, .32, yellow, 0, .26, 0, jib, 8);

// the pendulum: the cable, the claw at its end, and `load`, where a held block hangs
const swing = grp(PLAY.x, 0, PLAY.z);
const cable = cyl(.007, .007, 1, ink, 0, -.5, 0, swing, 6, false);
const claw = grp(0, 0, 0, 0, swing);
outline(box(.13, .035, .1, gold, 0, -.018, 0, claw), 1.08);
const prongs = [-1, 1].map(sx => box(.02, .075, .08, rust, sx*.055, -.06, 0, claw));
const load = grp(0, 0, 0, 0, swing);

// the swing: angle th from straight down (positive swings towards +x), cable length L, and the
// trolley height `top`; L and `top` ease towards what was asked, like a crane's motors would
const sw = {th:.05, w:0, L:.9, Ld:0, top:1.95, topV:0, topA:0, held:null, want:{top:1.95, L:.9, amp:.03}};

export const crane = {
  load,
  // where the trolley should ride, how long the cable, and how far side to side the held block should swing (metres)
  aim(top, L, amp){ Object.assign(sw.want, {top, L, amp}); },
  hold(w, h){ sw.held = w ? {w, h} : null; },
  // the held block's centre, velocity and spin right now, for handing it over to the tower's physics
  release(pos, vel){
    const h = sw.held ? sw.held.h : 0, r = sw.L + GRIP + h/2, s = Math.sin(sw.th), c = Math.cos(sw.th);
    pos.set(PLAY.x + r*s, sw.top - r*c, PLAY.z);
    vel.set(sw.Ld*s + r*sw.w*c, sw.topV - sw.Ld*c + r*sw.w*s, 0);
    sw.held = null;
    return {angle:sw.th, spin:sw.w};
  }
};

function step(h){
  const s = sw, k = 2.2;
  s.topA = k*k*(s.want.top - s.top) - 2*k*s.topV; s.topV += s.topA*h; s.top += s.topV*h;
  s.Ld += (k*k*(s.want.L - s.L) - 2*k*s.Ld)*h; s.L += s.Ld*h;
  // a held block makes a compound pendulum: it swings like a point mass on a slightly longer cable
  const r = s.held ? s.L + GRIP + s.held.h/2 : s.L, len = s.held ? r + (s.held.w**2 + s.held.h**2)/(12*r) : r;
  const g = (PLAY.G + s.topA)/len;
  const e = .5*s.w*s.w + g*(1 - Math.cos(s.th)), want = g*(1 - Math.cos(Math.asin(Math.min(.8, s.want.amp/r))));
  const pump = 1.2*(want - e)/Math.max(want, 1e-4)*s.w;
  // reeling the cable in speeds the swing up (the -2 L'/r term), as it does on a real pendulum
  s.w += (-g*Math.sin(s.th) - 2*s.Ld/r*s.w + pump)*h; s.th += s.w*h;
}
hqAnims.push(dt => {
  const n = Math.ceil(dt*240); for (let i = 0; i < n; i++) step(dt/n);
  const mastTop = sw.top - .16, e = Math.max(0, (mastTop - mastFoot - STAGE)/(STAGES - 1));
  stages.forEach((s, i) => s.position.y = mastFoot + i*e);
  jib.position.y = swing.position.y = sw.top; swing.rotation.z = sw.th;
  cable.scale.y = sw.L; cable.position.y = -sw.L/2;
  claw.position.y = -sw.L; load.position.y = -sw.L - GRIP;
  const spread = sw.held ? sw.held.w/2 + .012 : .055;
  prongs[0].position.x = -spread; prongs[1].position.x = spread;
});
