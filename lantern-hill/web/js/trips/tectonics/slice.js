// ---------- Chapter 1: A Slice of the Earth ----------

import * as THREE from 'three';
import { C, T, add, cyl, glowM, glowTex, grp, outline, sph, tex } from '../../core/kit.js';
import { Sound } from '../../core/sound.js';
import { addUsable, inWorld, makeWorld } from '../../core/world.js';
import { story } from '../../ui/dialogue.js';
import { objective, wagonDock } from '../field-trip.js';
import { crew, signpost } from '../stop-kit.js';

export function buildSlice(){
  const w = makeWorld({title:'A Slice of the Earth', bg:0x1a1430, sky:0xc0b0e8, groundCol:0x3a2418, hemi:.72, sunCol:0xffd8b0, sunI:.55});
  const AZ = -7;
  w.ground = (x, z) => { const r = Math.hypot(x, z - AZ); return r < 7.5 ? .62 : r < 13.2 ? .45 : .25; };
  w.bounds = (x, z) => { const r = Math.hypot(x, z - AZ), a = Math.atan2(x, z - AZ); return Math.abs(a) < .55 && r < 13.7 && r > 2.85; };
  w.spawn = [0, 6.1, Math.PI];
  const seen = new Set(), bubbles = [], rocks = [];
  let mantleTex, outerTex, halo;
  inWorld(w, () => {
    const sg = new THREE.BufferGeometry(), sp = new Float32Array(500*3);
    for (let i = 0; i < 500; i++){ const a = Math.random()*Math.PI*2, r = 26 + Math.random()*16; sp[i*3] = Math.cos(a)*r; sp[i*3+1] = -14 + Math.random()*30; sp[i*3+2] = Math.sin(a)*r - 6; }
    sg.setAttribute('position', new THREE.BufferAttribute(sp, 3));
    const stars = new THREE.Points(sg, new THREE.PointsMaterial({size:.35, map:glowTex, transparent:true, depthWrite:false, blending:THREE.AdditiveBlending, color:0xffe8c0})); stars.frustumCulled = false; w.scene.add(stars);
    const wedge = (r, h, mat) => add(new THREE.CylinderGeometry(r, r, h, 64, 1, false, -.6, 1.2), mat, 0, h/2, AZ);
    const crustTex = tex(256, 256, (c, cw, ch) => { c.fillStyle = '#7a4e32'; c.fillRect(0, 0, cw, ch); for (let i = 0; i < 600; i++){ c.fillStyle = ['#6b4430','#8a5a3a','#5e3c27','#4e7a4e'][i % 4]; c.fillRect(Math.random()*cw, Math.random()*ch, 5, 5); } }, 8, 8);
    wedge(14, .25, T(0xffffff, {map:crustTex}));
    mantleTex = tex(256, 256, (c, cw, ch) => { c.fillStyle = '#a8402a'; c.fillRect(0, 0, cw, ch); for (let i = 0; i < 46; i++){ const x = Math.random()*cw, y = Math.random()*ch, r = 10 + Math.random()*30; const gr = c.createRadialGradient(x, y, 0, x, y, r); gr.addColorStop(0, i % 3 ? 'rgba(240,130,60,.8)' : 'rgba(255,190,90,.8)'); gr.addColorStop(1, 'rgba(240,130,60,0)'); c.fillStyle = gr; c.fillRect(x - r, y - r, r*2, r*2); } }, 3, 3);
    wedge(13.2, .45, T(0xffffff, {map:mantleTex, emissive:0x6a200c, emissiveIntensity:.55}));
    outerTex = tex(256, 256, (c, cw, ch) => { c.fillStyle = '#f29a3a'; c.fillRect(0, 0, cw, ch); c.strokeStyle = 'rgba(255,240,170,.75)'; c.lineWidth = 5; for (let k = 0; k < 9; k++){ c.beginPath(); for (let x = 0; x <= cw; x += 8) c.lineTo(x, k*30 + Math.sin(x*.05 + k)*8); c.stroke(); } }, 2, 2);
    wedge(7.5, .62, T(0xffffff, {map:outerTex, emissive:0x9a5010, emissiveIntensity:.65}));
    outline(sph(2.5, glowM(0xffe08a, 1.15), 0, .55, AZ, null, 28), 1.025);
    halo = new THREE.Sprite(new THREE.SpriteMaterial({map:glowTex, transparent:true, depthWrite:false, blending:THREE.AdditiveBlending, color:0xffd070, opacity:.8})); halo.scale.set(11, 11, 1); halo.position.set(0, 1.6, AZ); w.scene.add(halo);
    const cl = new THREE.PointLight(0xffc860, 1.5, 15, 1.4); cl.position.set(0, 3, AZ + 1.5); w.scene.add(cl);
    const ml = new THREE.PointLight(0xff6a30, .8, 14, 2); ml.position.set(0, 2.2, AZ + 10); w.scene.add(ml);
    for (let i = 0; i < 30; i++){ const a = -.57 + i/29*1.14, r = 13.55 + Math.random()*.35; add(new THREE.ConeGeometry(.1, .32, 5), T(i % 2 ? C.forest : C.moss), Math.sin(a)*r, .4, AZ + Math.cos(a)*r, null, false); }
    for (let i = 0; i < 16; i++){ const a = -.52 + Math.random()*1.04, r = 13.3 + Math.random()*.6; sph(.1 + Math.random()*.1, T(0x8a8090), Math.sin(a)*r, .3, AZ + Math.cos(a)*r, null, 6).scale.y = .6; }
    for (let i = 0; i < 18; i++){ const a = Math.random()*Math.PI*2, r = 16 + Math.random()*9; const rk = add(new THREE.DodecahedronGeometry(.4 + Math.random()*.9, 0), T(i % 2 ? 0x6b5a52 : 0x5a4a3a), Math.cos(a)*r, -3 + Math.random()*7, AZ + Math.sin(a)*r); rocks.push({m:rk, ph:Math.random()*6, y0:rk.position.y}); }
    for (let i = 0; i < 18; i++){ const a = -.5 + Math.random(), r = 3 + Math.random()*4.2; bubbles.push({m: sph(.11, glowM(0xfff0b0, 1.1), Math.sin(a)*r, .7, AZ + Math.cos(a)*r, null, 8, false), t: Math.random()*2}); }
  });
  const lens = (x, z, label) => inWorld(w, () => {
    const y = w.ground(x, z), g = grp(x, y, z);
    cyl(.26, .32, .14, T(C.woodDk), 0, .07, 0, g, 10); cyl(.05, .05, 1.15, T(C.gold), 0, .66, 0, g, 8);
    outline(add(new THREE.TorusGeometry(.34, .065, 8, 24), T(C.gold), 0, 1.5, 0, g), 1.06);
    add(new THREE.CircleGeometry(.32, 24), T(0xbfe6ff, {emissive:0x6ab0e0, emissiveIntensity:.6, transparent:true, opacity:.75, side:THREE.DoubleSide}), 0, 1.5, 0, g, false);
    signpost(x + 1.15, z + .15, label, y, -.25);
  });
  const STATIONS = [
    ['crust', 3.3, 5.8, 'Crust', [['sparks', "The crust! This is the rocky shell we live on. It's only 5 to 70 kilometers thick. Compared to the whole Earth, that's thinner than the skin on an apple!"]]],
    ['mantle', -2.7, 1.4, 'Mantle', [['sparks', "The mantle is the thickest layer, almost 3,000 kilometers deep. It's solid rock, but so hot that it slowly flows, like very thick putty."]]],
    ['outer', 2.2, -2.2, 'Outer core', [['pip', "Whoa, it's a sea of melted metal!"], ['sparks', "The outer core is liquid iron and nickel. As it swirls, it makes Earth's magnetic field, the invisible force that makes compasses point north."]]],
    ['inner', 1.3, -3.75, 'Inner core', [['sparks', "The inner core is a solid ball of iron and nickel, about as hot as the surface of the Sun! It's squeezed so hard that it can't melt."]]]
  ];
  for (const [id, x, z, nm, lines] of STATIONS) {
    lens(x, z, nm);
    addUsable(w, {name:nm, x, z: z + .7, range:1.6, verb:`Look through the ${nm} lens`, short:'Look',
      glow:[x, w.ground(x, z) + 2.25, z], action: () => {
        Sound.tone(660, {type:'triangle', dur:.15, vol:.08}); Sound.tone(990, {type:'triangle', t:.08, dur:.2, vol:.07});
        story(lines, () => {
          if (!seen.has(id)) { seen.add(id); objective(`Look through the Wonder Lenses (${seen.size}/4)`); }
          if (seen.size === 4 && !w.cleared) { w.cleared = true; story([['juniper', "A thin skin, a thick middle and a hot center. Earth really is like a peach!"], ['sparks', "And here's the secret, {name}: the crust isn't one solid shell. It's cracked into giant pieces called plates. Back to the bus! Let's find out what moves them."]], () => objective('Climb back into the Wonder Bus')); }
        });
      }});
  }
  crew(w, {sparks:["Each Wonder Lens shows a different layer, {name}."], pip:["The core is glowing like a giant light bulb!"], juniper:["I'm drawing every layer in my notebook."]});
  wagonDock(w, -5.8, .35, 7.8, .45, -3.9, 6.1);
  w.notYet = "Not yet, {name}! Look through all four Wonder Lenses first.";
  w.update = (dt, t) => {
    mantleTex.offset.set(t*.012, t*.007); outerTex.offset.x = -t*.04; halo.material.opacity = .65 + Math.sin(t*2)*.15;
    bubbles.forEach(b => { b.t += dt; const k = (b.t % 2)/2; b.m.position.y = .62 + k*.9; b.m.scale.setScalar(1 - k*.6); });
    rocks.forEach(r => { r.m.position.y = r.y0 + Math.sin(t*.6 + r.ph)*.4; r.m.rotation.y += dt*.2; });
  };
  w.onEnter = () => story([['sparks', "Welcome to a slice of planet Earth! I've cut it just like a giant piece of pie, so we can see what's inside."],
    ['pip', "We're standing on the crust, and the middle is glowing!"],
    ['sparks', "Walk to each Wonder Lens and take a closer look, {name}."]], () => objective('Look through the Wonder Lenses (0/4)'));
  return w;
}
