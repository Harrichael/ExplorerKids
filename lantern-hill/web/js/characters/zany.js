import { rr } from '../core/kit.js';

// skirt and lab coat hems flare out on spins and swish behind her when she sways or bounces
function flowFabric(z, m, dt){
  const b = m.body, k = Math.min(1, dt * 7);
  if (z.pry === undefined) { z.pry = b.rotation.y; z.ppy = b.position.y; z.fl = 0; z.sx = 0; z.lift = 0; z.ph = 0; z.vy = 0; }
  const w = dt > 0 ? (b.rotation.y - z.pry) / dt : 0, vy = dt > 0 ? (b.position.y - z.ppy) / dt : 0;
  z.pry = b.rotation.y; z.ppy = b.position.y;
  z.fl += (Math.min(.6, Math.abs(w) * .06) - z.fl) * k;
  z.sx += (-b.rotation.z * .9 - z.sx) * k;
  z.lift += (Math.max(-.06, Math.min(.06, -vy * .05)) - z.lift) * k;
  z.ph += dt * (2.2 + Math.abs(w) * .6) * (w < 0 ? -1 : 1);
  const rip = .025 + z.fl * .12;
  for (const [mesh, top, h] of m.flows) {
    const g = mesh.geometry, pa = g.attributes.position;
    if (!g.userData.base) g.userData.base = pa.array.slice();
    const bs = g.userData.base, a = pa.array;
    for (let i = 0; i < a.length; i += 3) {
      const x0 = bs[i], y0 = bs[i+1], z0 = bs[i+2];
      let t = (top - (mesh.position.y + y0)) / h; t = t < 0 ? 0 : t > 1 ? 1 : t; const q = t * t;
      const ang = Math.atan2(z0, x0), rad = 1 + z.fl * q + rip * q * Math.sin(ang * 5 + z.ph);
      a[i] = x0 * rad + z.sx * q; a[i+1] = y0 + (z.fl * .22 + z.lift) * q * h; a[i+2] = z0 * rad;
    }
    pa.needsUpdate = true; g.computeVertexNormals();
  }
}
// Dr. Vega Sparks can't stand still: random spins, twirls, hops and little dances
const ZANY = {spin:.75, twirl:1.5, hop:1.1, dance:2.6, wiggle:1.6};
export function zany(n, m, talking, dt){ zanyPose(n, m, talking, dt); if (m.flows) flowFabric(n.zd, m, dt); }
function zanyPose(n, m, talking, dt){
  if (!n.zd) n.zd = {aLx:m.armL.rotation.x, aLz:m.armL.rotation.z, aRz:m.armR.rotation.z, next:rr(.8, 2.5), move:null, mt:0, spin:0};
  const z = n.zd, b = m.body;
  b.rotation.set(0, 0, 0); m.legL.rotation.z = m.legR.rotation.z = 0;
  if (!n.moving) m.legL.rotation.x = m.legR.rotation.x = 0;
  m.armL.rotation.x = z.aLx; m.armL.rotation.z = z.aLz;
  if (n.moving) { z.move = null; return; }
  if (talking) {
    // can't contain herself: bouncy, swaying, rocking on her toes
    z.move = null; z.next = 1.2;
    b.position.y = Math.abs(Math.sin(n.t * 7)) * .07;
    b.rotation.z = Math.sin(n.t * 3.5) * .08;
    m.armL.rotation.z = z.aLz - Math.abs(Math.sin(n.t * 3.5)) * .25;
    return;
  }
  if (!z.move) {
    z.next -= dt;
    // fidget while waiting
    b.position.y += Math.max(0, Math.sin(n.t * 4.3)) * .02;
    b.rotation.z = Math.sin(n.t * 1.7) * .04;
    if (z.next <= 0) { const k = Object.keys(ZANY); z.move = k[Math.floor(Math.random() * k.length)]; z.mt = 0; z.dir = Math.random() < .5 ? -1 : 1; }
    return;
  }
  z.mt += dt; const T = ZANY[z.move], u = Math.min(1, z.mt / T), ease = u < .5 ? 2*u*u : 1 - Math.pow(-2*u + 2, 2)/2;
  if (z.move === 'spin') {
    b.rotation.y = z.dir * ease * Math.PI * 2;
    b.position.y = Math.sin(u * Math.PI) * .22;
    m.armR.rotation.x = -2.6 * Math.sin(u * Math.PI); m.armR.rotation.z = .3;
    m.legL.rotation.x = Math.sin(u * Math.PI) * -.5;
  } else if (z.move === 'twirl') {
    b.rotation.y = z.dir * ease * Math.PI * 4;
    const out = Math.sin(u * Math.PI);
    m.armR.rotation.z = .12 + out * 1.3; m.armR.rotation.x = 0;
    m.armL.rotation.z = z.aLz - out * 1.1; m.armL.rotation.x = z.aLx * (1 - out);
    b.position.y = Math.abs(Math.sin(u * Math.PI * 4)) * .06;
    b.rotation.z = Math.sin(u * Math.PI * 4) * .06;
  } else if (z.move === 'hop') {
    const h = Math.abs(Math.sin(u * Math.PI * 3));
    b.position.y = h * .3;
    m.armR.rotation.x = -2.8 * h; m.armR.rotation.z = .25;
    m.legL.rotation.x = -.6 * h; m.legR.rotation.x = .25 * h;
  } else if (z.move === 'dance') {
    const beat = z.mt * 6.5, s1 = Math.sin(beat), s2 = Math.sin(beat * .5);
    b.position.y = Math.abs(s1) * .1;
    b.rotation.z = s2 * .16;
    b.rotation.y = Math.sin(beat * .25) * .7;
    m.armR.rotation.x = -2.4 + s1 * .5; m.armR.rotation.z = .4 + s2 * .3;
    m.armL.rotation.z = z.aLz - (.5 + Math.max(0, -s2) * .5);
    m.legL.rotation.x = Math.max(0, s1) * -.7; m.legR.rotation.x = Math.max(0, -s1) * -.7;
    m.head.rotation.z = s2 * .15;
    if (u > .85) b.rotation.y *= (1 - u) / .15;
  } else if (z.move === 'wiggle') {
    const w = Math.sin(z.mt * 14);
    b.rotation.z = w * .12; b.rotation.y = Math.sin(z.mt * 7) * .35;
    m.armR.rotation.x = -1.2 + w * .6; m.armR.rotation.z = .6;
    m.legL.rotation.z = w * .15; m.legR.rotation.z = w * .15;
    b.position.y = Math.abs(w) * .04;
  }
  if (u >= 1) { z.move = null; z.next = rr(1.5, 4.5); }
}
