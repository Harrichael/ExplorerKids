// The dusk sky over Lantern Hill: a gradient dome, banded Wind Waker clouds, stars and a moon.
// It rides along with the camera so it always reads as infinitely far, and its horizon is the
// fog colour, so the far hills melt into it.

import * as THREE from 'three';
import { glowTex, sparkTex, tex } from '../core/kit.js';
import { camera } from '../core/render.js';
import { hqAnims, scene } from './scene.js';

// its own seed: the shared layout RNG must not see the sky, or every tree would move
const seeded = s => { const r = () => (s = (s * 16807) % 2147483647) / 2147483647; return [r, (a, b) => a + r() * (b - a)]; };
const [srand, sr] = seeded(23);
const srgb = h => new THREE.Color(h).convertSRGBToLinear();
const R = 92;
const sky = new THREE.Group(); scene.add(sky);
// the sun has just set in the west-southwest, where the garden's warm light comes from
const SUN = new THREE.Vector3(-.8, 0, .6).normalize();
// drawn before the rest of its pass and never written to depth, so anything nearer covers it
const behind = (o, order) => { o.renderOrder = order; o.frustumCulled = false; o.material.depthWrite = false; sky.add(o); return o; };

behind(new THREE.Mesh(new THREE.SphereGeometry(R + 4, 40, 20), new THREE.ShaderMaterial({
  side: THREE.BackSide,
  uniforms: {horizon:{value:scene.fog.color}, shadow:{value:srgb(0x6a5f93)}, belt:{value:srgb(0xc78aa2)}, upper:{value:srgb(0x4b3d78)},
    zenith:{value:srgb(0x1f1c44)}, glow:{value:srgb(0xe8965e)}, sun:{value:SUN}},
  vertexShader: 'varying vec3 vDir; void main(){ vDir = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
  fragmentShader: `uniform vec3 horizon, shadow, belt, upper, zenith, glow, sun; varying vec3 vDir;
    void main(){
      vec3 d = normalize(vDir); float h = d.y;
      vec3 c = mix(horizon, shadow, smoothstep(-.01, .07, h));
      c = mix(c, belt, smoothstep(.05, .17, h));
      c = mix(c, upper, smoothstep(.16, .42, h));
      c = mix(c, zenith, smoothstep(.4, .95, h));
      float s = max(dot(normalize(vec3(d.x, 0., d.z) + 1e-5), sun), 0.);
      c = mix(c, glow, pow(s, 5.) * (1. - smoothstep(0., .32, h)) * smoothstep(-.03, .02, h) * .75);
      gl_FragColor = linearToOutputTexel(vec4(c, 1.));
    }`
})), -4).material.depthTest = false;

// ----- stars: thick overhead, thinning into the rosy band, a few big ones that twinkle -----
const onSky = (lo, hi) => { const y = lo + (hi - lo)*Math.sqrt(srand()), a = sr(0, Math.PI*2), r = Math.sqrt(1 - y*y); return new THREE.Vector3(Math.cos(a)*r, y, Math.sin(a)*r).multiplyScalar(R); };
{ const N = 420, pos = new Float32Array(N*3), col = new Float32Array(N*3);
  for (let i = 0; i < N; i++) { const v = onSky(.14, 1), b = Math.min(1, (v.y/R - .14)*2.4) * sr(.35, 1); pos.set([v.x, v.y, v.z], i*3); col.set([b, b*.95, b*.85], i*3); }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('color', new THREE.BufferAttribute(col, 3));
  behind(new THREE.Points(g, new THREE.PointsMaterial({size:3, sizeAttenuation:false, map:glowTex, vertexColors:true, transparent:true, fog:false, blending:THREE.AdditiveBlending})), -3); }
const twinkles = [0, 1].map(() => {
  const pos = []; for (let i = 0; i < 12; i++) pos.push(...onSky(.3, .95).toArray());
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  return behind(new THREE.Points(g, new THREE.PointsMaterial({size:15, sizeAttenuation:false, map:sparkTex, color:0xfff1cf, transparent:true, fog:false, blending:THREE.AdditiveBlending})), -3);
});

// ----- the moon, risen in the east-northeast where the bus flies off -----
const moonTex = tex(256, 256, (g, w, h) => {
  const gr = g.createRadialGradient(128, 128, 30, 128, 128, 128); gr.addColorStop(0, 'rgba(255,228,190,.5)'); gr.addColorStop(.45, 'rgba(240,190,200,.14)'); gr.addColorStop(1, 'rgba(240,190,200,0)');
  g.fillStyle = gr; g.fillRect(0, 0, w, h);
  g.fillStyle = '#f7e9c6'; g.beginPath(); g.arc(128, 128, 40, 0, 7); g.fill();
  g.fillStyle = '#e9d3a6'; for (const [x, y, r] of [[114, 116, 9], [142, 136, 12], [124, 148, 6], [146, 110, 5]]) { g.beginPath(); g.arc(x, y, r, 0, 7); g.fill(); }
  g.strokeStyle = 'rgba(255,250,232,.85)'; g.lineWidth = 4; g.beginPath(); g.arc(128, 128, 34, Math.PI*1.05, Math.PI*1.55); g.stroke();
});
moonTex.wrapS = moonTex.wrapT = THREE.ClampToEdgeWrapping;
const moon = behind(new THREE.Sprite(new THREE.SpriteMaterial({map:moonTex, transparent:true, fog:false})), -3);
moon.position.set(.6, .42, -.68).normalize().multiplyScalar(R - 4); moon.scale.set(26, 26, 1);

// ----- clouds: flat-bottomed, banded and curled, like a painted backdrop -----
function cloudTex(seed){
  const [, sr] = seeded(seed);
  const t = tex(512, 256, (g, w, h) => {
    const base = 196, n = 5 + Math.floor(sr(0, 3)), puffs = [];
    for (let i = 0; i < n; i++) { const t = (i + .5)/n, r = (34 + 52*Math.sin(t*Math.PI)) * sr(.8, 1.12); puffs.push([60 + t*392 + sr(-14, 14), base - r*sr(.25, .55), r]); }
    const blob = (dx, dy, k) => { g.beginPath(); for (const [x, y, r] of puffs) { g.moveTo(x + dx + r*k, y + dy); g.arc(x + dx, y + dy, r*k, 0, Math.PI*2); } g.fill(); };
    g.save(); g.beginPath(); g.rect(0, 0, w, base); g.clip();
    g.fillStyle = '#76689c'; blob(0, 0, 1);
    g.globalCompositeOperation = 'source-atop';
    g.fillStyle = '#a084ad'; blob(-5, -12, .93);
    g.fillStyle = '#dfaab0'; blob(-9, -26, .78);
    // the curl on each big puff, Wind Waker's signature
    g.strokeStyle = '#f3d0c6'; g.lineWidth = 5; g.lineCap = 'round';
    for (const [x, y, r] of puffs) if (r > 66) { g.beginPath(); for (let k = 0; k <= 30; k++) { const a = -2.4 + k*.2, rr = r*.42*(1 - k/38); const px = x - r*.2 + Math.cos(a)*rr, py = y - r*.18 + Math.sin(a)*rr; k ? g.lineTo(px, py) : g.moveTo(px, py); } g.stroke(); }
    g.restore();
  });
  t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping; return t;
}
const cloudTexes = [101, 202, 303, 404].map(cloudTex);
const clouds = new THREE.Group(); sky.add(clouds);
// a ring low around the horizon, with a few bigger ones banked up where the bus flies off
for (let i = 0; i < 16; i++) {
  const big = i < 3, az = big ? -.7 + (i - 1)*.55 + sr(-.12, .12) : sr(0, Math.PI*2), el = big ? sr(.06, .19) : sr(.02, .13), w = big ? sr(34, 48) : sr(20, 34);
  const m = behind(new THREE.Mesh(new THREE.PlaneGeometry(w, w/2), new THREE.MeshBasicMaterial({map:cloudTexes[i % 4], transparent:true, fog:false, side:THREE.DoubleSide, color:new THREE.Color(1, 1, 1).multiplyScalar(sr(.86, 1))})), -2);
  clouds.add(m); m.position.set(Math.cos(az)*Math.cos(el), Math.sin(el), Math.sin(az)*Math.cos(el)).multiplyScalar(R - 8 - i*.3); m.lookAt(0, 0, 0);
  if (srand() < .5) m.scale.x = -1;
}

hqAnims.push((dt, t) => {
  sky.position.copy(camera.position);
  clouds.rotation.y += dt*.004;
  twinkles[0].material.opacity = .55 + .45*Math.sin(t*1.7);
  twinkles[1].material.opacity = .55 + .45*Math.sin(t*1.3 + 2);
});
