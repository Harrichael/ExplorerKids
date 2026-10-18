// ---------- Chapter 2: The Mantle Conveyor Belt ----------

import * as THREE from 'three';
import { C, T, add, box, clamp01, col, glowM, grp, outline, sph, tex } from '../../core/kit.js';
import { Sound } from '../../core/sound.js';
import { addUsable, inWorld, makeWorld } from '../../core/world.js';
import { game } from '../../state.js';
import { story } from '../../ui/dialogue.js';
import { objective, wagonDock } from '../field-trip.js';
import { crew, miniTree, signpost } from '../stop-kit.js';

export function buildConveyor(){
  const w = makeWorld({title:'The Mantle Conveyor Belt', bg:0x24131f, sky:0xe0b0b8, groundCol:0x6a2a1a, hemi:.72, sunCol:0xffc8a0, sunI:.65, cam:{oy:4.2, oz:9.4, lookY:-2.5, oyP:5.4, ozP:11, lookYP:-2.8}});
  w.ground = (x, z) => Math.abs(x) < .24 ? -.06 : 0;
  w.bounds = (x, z) => Math.abs(x) < 8.4 && z > -3.6 && z < 4.4;
  w.surface = () => 'stone';
  w.spawn = [-2.6, 3.6, Math.PI];
  let heat = 0, spinV = 0, mctx, mtex, ridge, texL, texR, rl; const drift = [], parts = [];
  inWorld(w, () => {
    const rock = () => tex(256, 256, (c, cw, ch) => { c.fillStyle = '#6b4a3a'; c.fillRect(0, 0, cw, ch); for (let i = 0; i < 400; i++){ c.fillStyle = ['#5a3c2c','#7a5644','#4e7a4e','#82604c'][i % 4]; c.beginPath(); c.arc(Math.random()*cw, Math.random()*ch, 2 + Math.random()*5, 0, 7); c.fill(); } c.fillStyle = 'rgba(30,15,8,.35)'; for (let x = 0; x < cw; x += 64) c.fillRect(x, 0, 4, ch); }, 4, 4);
    texL = rock(); texR = rock();
    box(8.8, 1.4, 9.2, T(0xffffff, {map:texL}), -4.64, -.7, .4); box(8.8, 1.4, 9.2, T(0xffffff, {map:texR}), 4.64, -.7, .4);
    ridge = box(.48, .5, 9.2, glowM(0xff7a2a, 1.2), 0, -.3, .4, null, false);
    box(18.4, 9, 9.2, glowM(0x7a2414, .35), 0, -5.9, .4, null, false);
    const mc = document.createElement('canvas'); mc.width = 768; mc.height = 384; mctx = mc.getContext('2d'); mtex = new THREE.CanvasTexture(mc); mtex.encoding = THREE.sRGBEncoding;
    add(new THREE.PlaneGeometry(18.4, 9), new THREE.MeshBasicMaterial({map:mtex}), 0, -5.9, 5.02, null, false);
    for (let i = 0; i < 160; i++) parts.push({cell: i % 2, a: Math.random()*Math.PI*2, r: .3 + Math.random()*.7});
    const gl = new THREE.PointLight(0xff7a3a, 1.1, 16, 1.5); gl.position.set(0, -.2, 6.4); w.scene.add(gl);
    rl = new THREE.PointLight(0xff8a3a, .8, 8, 2); rl.position.set(0, 1, .4); w.scene.add(rl);
    for (const [tx, tz] of [[-6.8, -2.6], [-3.4, -3], [3.8, -2.8], [6.6, -1.8], [7.4, 2.8]]) { miniTree(tx, 0, tz, 2.2); col(tx - .25, tx + .25, tz - .25, tz + .25); }
    for (let i = 0; i < 16; i++){ const side = i % 2 ? 1 : -1; drift.push({m: add(new THREE.DodecahedronGeometry(.2 + Math.random()*.2, 0), T(0x8a8090), side*(1 + Math.random()*7), .14, -3.2 + Math.random()*7), side}); }
    const wh = grp(-5.6, 0, .9);
    box(1.0, 1.0, .7, T(C.navy), 0, .5, 0, wh); box(1.1, .1, .8, T(C.gold), 0, 1.02, 0, wh);
    const wheelG = grp(0, 1.55, .38, 0, wh); outline(add(new THREE.TorusGeometry(.48, .07, 8, 28), T(C.gold), 0, 0, 0, wheelG), 1.05);
    for (let k = 0; k < 4; k++) box(.9, .06, .06, T(C.gold), 0, 0, 0, wheelG).rotation.z = k*Math.PI/4;
    sph(.1, T(C.rust), 0, 0, .04, wheelG, 8);
    w.wheel = wheelG;
    add(new THREE.CircleGeometry(.22, 20), T(C.cream), 0, .62, .36, wh, false); w.needle = box(.03, .18, .02, T(C.rust), 0, .66, .38, wh, false);
    signpost(-4.15, 1.5, 'Heat wheel', 0, .15);
    col(-6.15, -5.05, .5, 1.3);
  });
  function drawMantle(t){
    const c = mctx, cw = 768, ch = 384, h = .12 + heat*.5;
    const g1 = c.createLinearGradient(0, 0, 0, ch); g1.addColorStop(0, '#6a2416'); g1.addColorStop(.7, '#c8562c'); g1.addColorStop(1, '#f2963a'); c.fillStyle = g1; c.fillRect(0, 0, cw, ch);
    c.fillStyle = `rgb(255,${190 + heat*18},${90 + heat*30})`; c.fillRect(0, ch - 44, cw, 44);
    for (const q of parts) {
      q.a -= .016*(.25 + h*3)/(q.r*.8 + .4);
      const cx = q.cell ? 576 : 192, x = q.cell ? cx - 175*q.r*Math.cos(q.a) : cx + 175*q.r*Math.cos(q.a), y = 170 + 115*q.r*Math.sin(q.a), hot = clamp01((y - 40)/280);
      c.fillStyle = `rgba(255,${120 + hot*130},${60 + hot*90},${.55 + hot*.4})`; c.beginPath(); c.arc(x, y, 4 + hot*2, 0, 7); c.fill();
    }
    c.strokeStyle = 'rgba(255,235,190,.55)'; c.lineWidth = 4;
    for (const [cx, dir] of [[192, 1], [576, -1]]) { c.beginPath(); c.ellipse(cx, 170, 120, 80, 0, 0, Math.PI*2); c.stroke(); const ax = cx + dir*120; c.beginPath(); c.moveTo(ax - 10, 176); c.lineTo(ax, 160); c.lineTo(ax + 10, 176); c.stroke(); }
    c.font = '800 26px Nunito, sans-serif'; c.textAlign = 'left'; c.lineWidth = 6; c.strokeStyle = 'rgba(26,19,32,.8)'; c.strokeText('MANTLE', 18, 36); c.fillStyle = '#efe0bf'; c.fillText('MANTLE', 18, 36);
    c.textAlign = 'center'; c.strokeText('HOT CORE', cw/2, ch - 16); c.fillText('HOT CORE', cw/2, ch - 16);
    c.fillStyle = '#1a1320'; c.fillRect(0, 0, cw, 6);
    mtex.needsUpdate = true;
  }
  addUsable(w, {name:'Heat wheel', x:-5.6, z:1.9, range:1.6, verb:'Turn up the heat', short:'Turn', glow:[-5.6, 2.65, .9], action: () => {
    if (heat >= 3) { story([['sparks', "It's as hot as it goes! Watch those plates move."]]); return; }
    heat++; spinV = 2; game.camShake = 1.5; objective(`Turn up the heat (${heat}/3)`);
    Sound.tone(300 + heat*120, {type:'triangle', dur:.25, vol:.08}); Sound.hiss({dur:.9, vol:.12, type:'lowpass', freq:220}); Sound.tone(60, {dur:.9, vol:.12, f2:45});
    if (heat === 1) story([['pip', "The loops down there are speeding up!"]]);
    else if (heat === 2) story([['juniper', "Look at the crack in the middle! The plates are sliding apart!"]]);
    else story([['sparks', "Hot rock rises, cools off near the top, and sinks back down, round and round. Those slow currents help push and pull the plates."],
                ['sparks', "In real life, plates move about as fast as your fingernails grow. Just a few centimeters a year."],
                ['pip', "Slow... but over millions of years, that's really far!"]], () => { w.cleared = true; objective('Climb back into the Wonder Bus'); });
  }});
  crew(w, {sparks:["Turn the heat wheel and watch the mantle, {name}."], pip:["It's like we're standing on a giant slow-motion treadmill."], juniper:["The crack in the middle is where new rock comes up."]});
  wagonDock(w, 6.2, .35, 1.3, -.3, 5.0, 2.6);
  w.notYet = "Turn the heat wheel all the way up first, {name}!";
  w.update = (dt, t) => {
    drawMantle(t);
    const sp = .015 + heat*.035; texL.offset.x += dt*sp; texR.offset.x -= dt*sp;
    ridge.material.emissiveIntensity = 1 + heat*.25 + Math.sin(t*5)*.15; rl.intensity = .8 + heat*.35;
    drift.forEach(d => { d.m.position.x += d.side*dt*(.12 + heat*.5); if (Math.abs(d.m.position.x) > 8.4) d.m.position.x = d.side*.5; d.m.rotation.x += d.side*dt*.8; });
    w.wheel.rotation.z -= spinV*dt*3; spinV = Math.max(0, spinV - dt*1.5); w.needle.rotation.z = .9 - heat*.6;
    if (heat === 3 && Math.random() < dt*.3) game.camShake = Math.max(game.camShake, .6);
  };
  w.onEnter = () => story([['sparks', "Next stop: the mantle! We're standing on two giant plates of Earth's crust, with a crack between them."],
    ['sparks', "Look over the front edge, {name}. Underneath us, hot rock is slowly flowing around in big loops."],
    ['juniper', "Like soup bubbling in a pot!"],
    ['sparks', "Turn the heat wheel and watch what happens."]], () => objective('Turn up the heat (0/3)'));
  return w;
}
