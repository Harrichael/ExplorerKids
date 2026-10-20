// A storybook afternoon sky for a trip place out in the open: a gradient dome that melts into the
// fog at the horizon, painted Wind Waker clouds banked around it, and a few round toon clouds
// floating near enough to fly past.
//
//   storySky(w, {sun:[-9, 16, 7], clouds3d:[[x, y, z, size], ...]});

import * as THREE from 'three';
import { T, XF, meshOf, mergeGeos } from '../../core/kit.js';
import { camera } from '../../core/render.js';

// its own seed, so the sky never reshuffles the place's seeded layout
const seeded = s => () => (s = (s*16807) % 2147483647)/2147483647;
const srgb = h => new THREE.Color(h).convertSRGBToLinear();

function cloudTex(rnd, [base, mid, top, curl]){
  const c = document.createElement('canvas'); c.width = 512; c.height = 256; const g = c.getContext('2d');
  const floor = 196, n = 5 + Math.floor(rnd()*3), puffs = [];
  for (let i = 0; i < n; i++) { const t = (i + .5)/n, r = (34 + 52*Math.sin(t*Math.PI))*(.8 + rnd()*.32); puffs.push([60 + t*392 + (rnd() - .5)*28, floor - r*(.25 + rnd()*.3), r]); }
  const blob = (dx, dy, k) => { g.beginPath(); for (const [x, y, r] of puffs) { g.moveTo(x + dx + r*k, y + dy); g.arc(x + dx, y + dy, r*k, 0, Math.PI*2); } g.fill(); };
  g.beginPath(); g.rect(0, 0, 512, floor); g.clip();
  g.fillStyle = base; blob(0, 0, 1);
  g.globalCompositeOperation = 'source-atop';
  g.fillStyle = mid; blob(-5, -12, .93);
  g.fillStyle = top; blob(-9, -26, .78);
  g.strokeStyle = curl; g.lineWidth = 5; g.lineCap = 'round';
  for (const [x, y, r] of puffs) if (r > 62) { g.beginPath(); for (let k = 0; k <= 30; k++) { const a = -2.4 + k*.2, rr = r*.42*(1 - k/38), px = x - r*.2 + Math.cos(a)*rr, py = y - r*.18 + Math.sin(a)*rr; k ? g.lineTo(px, py) : g.moveTo(px, py); } g.stroke(); }
  const t = new THREE.CanvasTexture(c); t.encoding = THREE.sRGBEncoding; return t;
}

export function storySky(w, {sun = [-9, 16, 7], clouds3d = [], R = 520} = {}){
  const rnd = seeded(41), sky = new THREE.Group(); w.scene.add(sky);
  const toward = new THREE.Vector3(sun[0], 0, sun[2]).normalize();
  const dome = new THREE.Mesh(new THREE.SphereGeometry(R + 10, 40, 20), new THREE.ShaderMaterial({side:THREE.BackSide, depthWrite:false, depthTest:false,
    uniforms:{horizon:{value:w.scene.fog.color}, belt:{value:srgb(0xf6cdb4)}, upper:{value:srgb(0xa9c8ec)}, zenith:{value:srgb(0x6f92d8)}, glow:{value:srgb(0xfff0c8)}, sun:{value:toward}},
    vertexShader:'varying vec3 vDir; void main(){ vDir = position; gl_Position = projectionMatrix*modelViewMatrix*vec4(position, 1.0); }',
    fragmentShader:`uniform vec3 horizon, belt, upper, zenith, glow, sun; varying vec3 vDir;
      void main(){ vec3 d = normalize(vDir); float h = d.y;
        vec3 c = mix(horizon, belt, smoothstep(.0, .12, h));
        c = mix(c, upper, smoothstep(.1, .4, h));
        c = mix(c, zenith, smoothstep(.38, .95, h));
        float s = max(dot(normalize(vec3(d.x, 0., d.z) + 1e-5), sun), 0.);
        c = mix(c, glow, pow(s, 4.)*(1. - smoothstep(0., .4, h))*smoothstep(-.03, .03, h)*.7);
        gl_FragColor = linearToOutputTexel(vec4(c, 1.)); }`}));
  dome.renderOrder = -4; dome.frustumCulled = false; sky.add(dome);
  // warm sunlit tops and lavender bellies, so they sit in the afternoon light
  const PAINT = [['#9c8cc0', '#cdb6d6', '#fff1e4', '#ffffff'], ['#a893c2', '#e6c4cc', '#fff6ea', '#fffaf2']];
  const texes = [0, 1, 2, 3, 4, 5].map(i => cloudTex(rnd, PAINT[i % 2]));
  const ring = new THREE.Group(); sky.add(ring);
  // a low bank all round the horizon, and fewer, smaller ones higher up
  for (let i = 0; i < 26; i++) {
    const high = i >= 18, az = rnd()*Math.PI*2, el = high ? .2 + rnd()*.22 : .015 + rnd()*.11, wd = (high ? 70 + rnd()*60 : 110 + rnd()*120)*(R/520);
    const m = new THREE.Mesh(new THREE.PlaneGeometry(wd, wd/2), new THREE.MeshBasicMaterial({map:texes[i % texes.length], transparent:true, fog:false, depthWrite:false, side:THREE.DoubleSide,
      opacity:high ? .85 : 1, color:new THREE.Color(1, 1, 1).multiplyScalar(.9 + rnd()*.1)}));
    m.position.set(Math.cos(az)*Math.cos(el), Math.sin(el), Math.sin(az)*Math.cos(el)).multiplyScalar(R - i*.5); m.lookAt(0, 0, 0);
    if (rnd() < .5) m.scale.x = -1;
    m.renderOrder = -2; m.frustumCulled = false; ring.add(m);
  }
  // round toon clouds out in the world: flat-bottomed heaps of puffs, inked like the trees
  const parts = [], I = new THREE.Matrix4();
  for (const [x, y, z, s] of clouds3d) {
    const n = 5 + Math.floor(rnd()*3), heap = [];
    for (let i = 0; i < n; i++) { const t = i/(n - 1) - .5, r = s*(.34 + .3*Math.cos(t*Math.PI))*(.85 + rnd()*.3); heap.push(XF(x + t*s*1.7, y + r*.25, z + (rnd() - .5)*s*.5, r, r*.72, r*.9)); }
    heap.push(XF(x - s*.1, y + s*.38, z, s*.4, s*.32, s*.4));
    for (const m of heap) { const g = new THREE.IcosahedronGeometry(1, 2).applyMatrix4(m), p = g.attributes.position;
      for (let i = 0; i < p.count; i++) if (p.getY(i) < y) p.setY(i, y);
      parts.push([g, I]); }
  }
  if (parts.length) meshOf(mergeGeos(parts), T(0xfff4ec, {emissive:0x6a5a8a, emissiveIntensity:.35}), w.scene, .5, new THREE.MeshBasicMaterial({color:0x6a5a8a, side:THREE.BackSide}));
  w.anims.push(dt => { sky.position.copy(camera.position); ring.rotation.y += dt*.003; });
  return sky;
}
