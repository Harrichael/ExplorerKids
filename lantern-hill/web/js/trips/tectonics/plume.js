// A volcano's breath: a thick, billowy column of toon smoke puffs that never settles into a loop.
// Its rate wanders at random, the wind swings slowly round, and now and then it burps out a great
// dark gush all at once. Every puff is one instance of a single camera-facing quad, so a plume is
// one draw call however many puffs it holds.
//
//   const p = plume(w, [x, y, z], {scale:1, burps:true});
//   p.burp();                  // a gush right now
//   p.onBurp = () => { ... };  // told when one starts

import * as THREE from 'three';
import { camera } from '../../core/render.js';

// four puff shapes in a 2x2 atlas, cel-shaded in grey: shadowed belly, body, sunlit top-left
const atlas = (() => {
  const c = document.createElement('canvas'); c.width = c.height = 256; const g = c.getContext('2d');
  let s = 5; const rnd = () => (s = (s*16807) % 2147483647)/2147483647;
  for (let cell = 0; cell < 4; cell++) {
    const ox = (cell % 2)*128, oy = Math.floor(cell/2)*128, lumps = [];
    for (let i = 0; i < 5 + cell; i++) { const a = rnd()*Math.PI*2, d = 14 + rnd()*16; lumps.push([64 + Math.cos(a)*d, 66 + Math.sin(a)*d*.8, 20 + rnd()*12]); }
    lumps.push([64, 64, 34]);
    const blob = (dx, dy, k) => { g.beginPath(); for (const [x, y, r] of lumps) { g.moveTo(ox + x + dx + r*k, oy + y + dy); g.arc(ox + x + dx, oy + y + dy, r*k, 0, 7); } g.fill(); };
    g.save(); g.beginPath(); g.rect(ox, oy, 128, 128); g.clip();
    g.fillStyle = '#9d97a8'; blob(0, 0, 1);
    g.globalCompositeOperation = 'source-atop';
    g.fillStyle = '#d4cfdc'; blob(-5, -7, .86);
    g.fillStyle = '#ffffff'; blob(-10, -14, .62);
    g.restore();
  }
  const t = new THREE.CanvasTexture(c); t.minFilter = THREE.LinearMipmapLinearFilter; return t;
})();

const VERT = `attribute vec3 iPos; attribute vec4 iData; attribute vec3 iTint; uniform float fogNear, fogFar, dim;
  varying vec2 vUv; varying float vA, vFog; varying vec3 vT;
  void main(){
    vec4 mv = modelViewMatrix*vec4(iPos, 1.); float c = cos(iData.z), s = sin(iData.z);
    mv.xy += mat2(c, s, -s, c)*position.xy*iData.x;
    float d = -mv.z;
    // a puff right in front of the lens fades, so a shot from inside the plume still sees out
    vA = iData.y*dim*smoothstep(1., 3.5, d/max(iData.x, .5)); vFog = smoothstep(fogNear, fogFar, d);
    float f = iData.w; vUv = (uv + vec2(mod(f, 2.), 1. - floor(f/2.)))*.5; vT = iTint;
    gl_Position = projectionMatrix*mv; }`;
const FRAG = `uniform sampler2D map; uniform vec3 fogColor; varying vec2 vUv; varying float vA, vFog; varying vec3 vT;
  void main(){ vec4 t = texture2D(map, vUv); if (t.a*vA < .01) discard;
    gl_FragColor = vec4(mix(vT*t.rgb, linearToOutputTexel(vec4(fogColor, 1.)).rgb, vFog), t.a*vA); }`;

const rnd = Math.random, lerp = (a, b, k) => a + (b - a)*k;
const WARM = new THREE.Color(0xffb48a), BODY = new THREE.Color(0xe6dcea), ASH = new THREE.Color(0x857a8e);

export function plume(w, at, {scale = 1, burps = true, max = 130, base = 1.6, top = 30, mouth = 0} = {}){
  const geo = new THREE.InstancedBufferGeometry(), quad = new THREE.PlaneGeometry(1, 1);
  geo.index = quad.index; geo.setAttribute('position', quad.attributes.position); geo.setAttribute('uv', quad.attributes.uv);
  const aPos = new THREE.InstancedBufferAttribute(new Float32Array(max*3), 3), aData = new THREE.InstancedBufferAttribute(new Float32Array(max*4), 4), aTint = new THREE.InstancedBufferAttribute(new Float32Array(max*3), 3);
  for (const a of [aPos, aData, aTint]) a.setUsage(THREE.DynamicDrawUsage);
  geo.setAttribute('iPos', aPos); geo.setAttribute('iData', aData); geo.setAttribute('iTint', aTint); geo.instanceCount = 0;
  const fog = w.scene.fog;
  const mat = new THREE.ShaderMaterial({vertexShader:VERT, fragmentShader:FRAG, transparent:true, depthWrite:false,
    uniforms:{map:{value:atlas}, fogColor:{value:fog.color}, fogNear:{value:fog.near}, fogFar:{value:fog.far}, dim:{value:1}}});
  const mesh = new THREE.Mesh(geo, mat); mesh.frustumCulled = false; w.scene.add(mesh);
  const pool = [], live = [], cam = new THREE.Vector3(), c = new THREE.Color();
  for (let i = 0; i < max; i++) pool.push({x:0, y:0, z:0, vx:0, vy:0, vz:0, age:0, life:1, s0:1, grow:1, ash:0, rot:0, spin:0, f:0, d:0});
  const p = {rate:base, dim:1, burp(){ gush = 2; next = 30 + rnd()*90; if (p.onBurp) p.onBurp(); }, onBurp:null, mesh};
  // wind and rate wander on their own; nothing here repeats on a schedule
  let acc = 0, gacc = 0, gush = 0, next = 20 + rnd()*60, wind = rnd()*7, windK = 1, drift = 0;
  const emit = big => { const q = pool.pop(); if (!q) return; const a = rnd()*7, r = rnd()*1.4*scale;
    Object.assign(q, {x:at[0] + Math.cos(a)*r, y:at[1], z:at[2] + Math.sin(a)*r, vx:(rnd() - .5)*.6*scale, vz:(rnd() - .5)*.6*scale,
      vy:(big ? 6 + rnd()*3 : 2.6 + rnd()*1.2)*scale, age:0, life:big ? 16 + rnd()*6 : 14 + rnd()*7, s0:(big ? 2.4 : 1.1 + rnd()*.6)*scale,
      grow:big ? .55 : .42, ash:big ? .7 + rnd()*.3 : rnd()*.25, rot:(rnd() - .5)*.5, spin:(rnd() - .5)*.06, f:Math.floor(rnd()*4)}); live.push(q); };
  w.anims.push((dt, tt) => {
    drift = Math.max(-1, Math.min(1, drift + (rnd() - .5)*dt*.9 - drift*dt*.05));
    p.rate = Math.max(.35, base*(1 + .55*drift + .25*Math.sin(tt*.31 + Math.sin(tt*.047)*4)));
    wind += (rnd() - .5)*dt*.12; windK = Math.max(.4, Math.min(1.6, windK + (rnd() - .5)*dt*.2));
    if (burps && (next -= dt) < 0) p.burp();
    acc += dt*p.rate; while (acc >= 1) { acc -= 1; emit(false); }
    if (gush > 0) { gacc += dt*22; while (gacc >= 1) { gacc -= 1; emit(true); } gush -= dt; }
    const wx = Math.cos(wind)*windK*scale, wz = Math.sin(wind)*windK*scale;
    for (let i = live.length - 1; i >= 0; i--) { const q = live[i]; q.age += dt;
      if (q.age >= q.life) { live[i] = live[live.length - 1]; live.pop(); pool.push(q); continue; }
      // buoyant: shoots up fast, slows to a lazy rise, and leans with the wind the higher it gets
      const h = Math.min(1, (q.y - at[1])/(top*scale));
      q.vy += (2.3*scale*(1 - h*.55) - q.vy)*dt*.45; q.vx += (wx*h - q.vx)*dt*.4; q.vz += (wz*h - q.vz)*dt*.4;
      q.x += q.vx*dt; q.y += q.vy*dt; q.z += q.vz*dt; q.rot += q.spin*dt;
    }
    cam.copy(camera.position);
    for (const q of live) q.d = (q.x - cam.x)**2 + (q.y - cam.y)**2 + (q.z - cam.z)**2;
    live.sort((a, b) => b.d - a.d);
    live.forEach((q, i) => { const k = q.age/q.life, h = Math.min(1, (q.y - at[1])/(10*scale));
      aPos.array.set([q.x, q.y, q.z], i*3);
      // a narrow column until it's out of the vent's mouth, then it billows out
      aData.array.set([q.s0*(1 + q.age*q.grow*.25 + Math.max(0, q.y - at[1] - mouth)*q.grow*.32/scale), .92*Math.min(1, k*8)*Math.min(1, (1 - k)*2.4), q.rot, q.f], i*4);
      c.copy(WARM).lerp(BODY, Math.min(1, h*1.6)).lerp(ASH, q.ash*(1 - k*.5)); aTint.array.set([c.r, c.g, c.b], i*3); });
    geo.instanceCount = live.length;
    aPos.needsUpdate = aData.needsUpdate = aTint.needsUpdate = true;
    mat.uniforms.dim.value += (Math.max(p.dim, Math.min(1, gush)) - mat.uniforms.dim.value)*Math.min(1, dt*3); mat.uniforms.fogNear.value = fog.near; mat.uniforms.fogFar.value = fog.far;
  });
  return p;
}
