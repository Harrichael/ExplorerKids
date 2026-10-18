// The frame loop: moves the player, animates whoever is nearby and steers the camera.

import * as THREE from 'three';
import { zany } from './characters/zany.js';
import { rr } from './core/kit.js';
import { camera, renderer } from './core/render.js';
import { Sound } from './core/sound.js';
import { coarse, joy, keys, startEl, useBtn } from './input.js';
import { blob, blocked, hero, player } from './player.js';
import { game } from './state.js';
import { active, closeDialog, convo, promptEl, renderBust, talkBtn, typing, updateTyping } from './ui/dialogue.js';
import { $ } from './ui/dom.js';
import { dress, dressing } from './ui/wardrobe.js';

export function enterWorld(w, spawn){
  game.world = w; w.scene.add(hero.root); w.scene.add(blob);
  player.x = spawn[0]; player.z = spawn[1]; player.angle = spawn[2] === undefined ? Math.PI : spawn[2];
  player.y = w.ground(player.x, player.z); player.vy = 0; player.walk = 0;
  hero.root.position.set(player.x, player.y, player.z); hero.root.rotation.y = player.angle;
  const co = w.cam || {}, portrait = innerWidth < innerHeight;
  camPos.set(player.x, player.y + (portrait ? (co.oyP || 7.4) : (co.oy || 5.6)), player.z + (portrait ? (co.ozP || 8.2) : (co.oz || 7)));
  camLook.set(player.x, player.y + 1.1 + (co.lookY || 0), player.z - .4);
  game.nearest = lastNearest = game.nearUse = lastUse = null; game.cutCam = null;
  w.npcs.forEach(n => { if (n.follow === undefined) return;
    n.x = player.x + (n.follow - 1)*1.3; n.z = player.z + 1.4 + (n.follow === 1 ? .7 : 0);
    if (w.bounds && !w.bounds(n.x, n.z)) n.z = player.z - 1.3 - (n.follow === 1 ? .7 : 0);
    n.y = n.gy = w.ground(n.x, n.z); n.model.root.position.set(n.x, n.y, n.z); });
}

export const clock = new THREE.Clock();
const camPos = new THREE.Vector3(), camLook = new THREE.Vector3(), tmpV = new THREE.Vector3(), tmpV2 = new THREE.Vector3(), dir = new THREE.Vector3();
const ray = new THREE.Raycaster();
const areaEl = $('area'); let areaName = '';
let lastNearest = null, lastUse = null;

function update(dt){
  game.elapsed += dt;
  let ix = 0, iz = 0;
  if (!convo && !dressing && !game.cutscene && startEl.hidden) {
    if (keys.ArrowLeft || keys.a) ix -= 1;
    if (keys.ArrowRight || keys.d) ix += 1;
    if (keys.ArrowUp || keys.w) iz -= 1;
    if (keys.ArrowDown || keys.s) iz += 1;
    ix += joy.x; iz += joy.y;
  }
  let mag = Math.hypot(ix, iz);
  if (mag > 1) { ix /= mag; iz /= mag; mag = 1; }
  const running = keys.Shift || (coarse && mag > .93);
  const speed = (running ? 6.2 : 3.6) * mag;
  if (mag > .08) {
    const nx = player.x + ix/mag * speed * dt, nz = player.z + iz/mag * speed * dt;
    if (!blocked(nx, player.z, player.y)) player.x = nx;
    if (!blocked(player.x, nz, player.y)) player.z = nz;
    let d = Math.atan2(ix, iz) - player.angle; d = Math.atan2(Math.sin(d), Math.cos(d));
    player.angle += d * Math.min(1, dt * 12);
    player.walk += dt * (running ? 13 : 9.5) * mag;
    const sgn = Math.sign(Math.sin(player.walk));
    if (sgn !== player.lastStepSign && sgn !== 0) { player.lastStepSign = sgn; Sound.step(game.world.surface(player.x, player.z, player.y)); }
  } else player.walk *= .82;
  if (dressing && dress.walkTo) {
    const wx = dress.walkTo.x - player.x, wz = dress.walkTo.z - player.z, wd = Math.hypot(wx, wz);
    if (wd < .04) dress.walkTo = null;
    else {
      const st = Math.min(wd, 3.4 * dt); player.x += wx/wd * st; player.z += wz/wd * st;
      let da = Math.atan2(wx, wz) - player.angle; da = Math.atan2(Math.sin(da), Math.cos(da)); player.angle += da * Math.min(1, dt * 12);
      player.walk += dt * 9.5; mag = 1;
      const sg = Math.sign(Math.sin(player.walk)); if (sg !== player.lastStepSign && sg !== 0) { player.lastStepSign = sg; Sound.step('wood'); }
    }
  }
  const gnd = game.world.ground(player.x, player.z);
  if (gnd >= player.y - .05) { player.y = gnd; player.vy = 0; }
  else { player.vy -= 22 * dt; player.y = Math.max(gnd, player.y + player.vy * dt); }

  if (dressing && !dress.walkTo) { let ds = dress.spin - player.angle; ds = Math.atan2(Math.sin(ds), Math.cos(ds)); player.angle += ds * Math.min(1, dt * 8); }
  const sw = Math.sin(player.walk) * Math.min(1, mag * 1.4) * .7;
  hero.root.position.set(player.x, player.y, player.z); hero.root.rotation.y = player.angle;
  hero.legL.rotation.x = sw; hero.legR.rotation.x = -sw;
  hero.armL.rotation.x = -sw * .9; hero.armR.rotation.x = sw * .9;
  hero.body.position.y = Math.abs(Math.sin(player.walk)) * .05 * mag + Math.sin(game.elapsed * 2) * .008;
  if (dress.hop > 0) { dress.hop = Math.max(0, dress.hop - dt); hero.body.position.y += Math.sin((1 - dress.hop / .35) * Math.PI) * .14; }
  if (dressing) { hero.armR.rotation.x = dress.hop > 0 ? -2.2 : 0; hero.armR.rotation.z = dress.hop > 0 ? .3 : .12; }
  hero.head.rotation.z = Math.sin(player.walk * .5) * .04 * mag;
  hero.eyes.scale.y = (game.elapsed % 4.2) < .1 ? .1 : 1;
  blob.position.set(player.x, gnd + .05, player.z);

  game.nearest = null; let best = Infinity;
  for (const n of game.world.npcs) {
    n.t += dt;
    const dx = player.x - n.x, dz = player.z - n.z, dy = Math.abs(player.y - n.gy), d = Math.hypot(dx, dz);
    if (d < n.range && dy < 1.6 && d < best) { best = d; game.nearest = n; }
    const near = d < 5 && dy < 2.5;
    const look = near ? Math.atan2(dx, dz) : n.baseAngle;
    const talking = active === n && !typing.done;
    const m = n.model;
    if (n.kind === 'owl') {
      let rel = look - m.root.rotation.y; rel = Math.atan2(Math.sin(rel), Math.cos(rel)); rel = Math.max(-2.3, Math.min(2.3, rel));
      m.head.rotation.y += (rel - m.head.rotation.y) * Math.min(1, dt * 4);
      m.head.rotation.z = talking ? Math.sin(n.t * 9) * .08 : Math.sin(n.t * .7) * .06;
      const blink = (n.t % 3.4) < .14;
      m.lids.forEach(l => l.scale.y = blink ? 1 : .15);
      const flap = talking ? Math.abs(Math.sin(n.t * 10)) * .5 : Math.max(0, Math.sin(n.t * 1.1) - .92) * 5;
      m.wingL.rotation.z = -flap; m.wingR.rotation.z = flap;
      m.root.position.y = n.y + Math.sin(n.t * 2) * .015;
    } else if (n.kind === 'cat') {
      m.body.scale.y = .62 + Math.sin(n.t * 2.2) * .02;
      m.tail.forEach((s, i) => s.rotation.y = Math.sin(n.t * 1.6 + i * .6) * (.25 + (active === n ? .2 : 0)));
      m.head.rotation.z = active === n ? .25 + Math.sin(n.t * 3) * .05 : Math.sin(n.t * .5) * .05;
    } else {
      let lookA = look;
      if (n.follow !== undefined) {
        let moving = false;
        if (!convo && !game.cutscene) {
          const fx = Math.sin(player.angle), fz = Math.cos(player.angle), back = 1.6 + (n.follow === 1 ? .9 : 0), side = (n.follow - 1)*1.1, sd = side || 1.2;
          const cands = [[player.x - fx*back + fz*side, player.z - fz*back - fx*side], [player.x + fz*sd*1.2, player.z - fx*sd*1.2], [player.x - fz*sd*1.2, player.z + fx*sd*1.2]];
          const tgt = cands.find(c => !game.world.bounds || game.world.bounds(c[0], c[1])) || [n.x, n.z];
          const ddx = tgt[0] - n.x, ddz = tgt[1] - n.z, dd = Math.hypot(ddx, ddz);
          if (dd > .45) { const st = Math.min(dd - .3, (dd > 3 ? 6 : 3.6)*dt), nx2 = n.x + ddx/dd*st, nz2 = n.z + ddz/dd*st; if (!game.world.bounds || game.world.bounds(nx2, nz2)) { n.x = nx2; n.z = nz2; } moving = true; lookA = Math.atan2(ddx, ddz); n.walk += dt*9.5; }
        }
        n.y = n.gy = game.world.ground(n.x, n.z); m.root.position.set(n.x, n.y, n.z);
        n.moving = moving; const swing = moving ? Math.sin(n.walk)*.6 : 0; m.legL.rotation.x = swing; m.legR.rotation.x = -swing;
      }
      let d2 = lookA - m.root.rotation.y; d2 = Math.atan2(Math.sin(d2), Math.cos(d2));
      m.root.rotation.y += d2 * Math.min(1, dt * 4);
      m.body.position.y = Math.sin(n.t * 2.2) * .018;
      m.head.rotation.z = talking ? Math.sin(n.t * 5) * .07 : Math.sin(n.t * .9) * .04;
      m.head.rotation.x = talking ? Math.sin(n.t * 11) * .05 : 0;
      if (!m.holdsRight) { m.armR.rotation.x = talking ? -.7 + Math.sin(n.t * 5) * .35 : Math.sin(n.t * 1.5) * .05; m.armR.rotation.z = talking ? .45 : .12; }
      const open = talking && Math.sin(n.t * 22) > -.2;
      m.mouthOpen.visible = open; m.smile.visible = !open;
      m.mouthOpen.scale.y = .5 + Math.abs(Math.sin(n.t * 17)) * .5;
      if (n.t > n.blinkAt) { m.eyes.scale.y = .1; if (n.t > n.blinkAt + .1) { m.eyes.scale.y = 1; n.blinkAt = n.t + rr(2, 5); } }
      if ((n.pid || (n.persona && n.persona.id)) === 'sparks') zany(n, m, talking, dt);
    }
    n.label.position.set(n.x, n.y + n.labelY + Math.sin(n.t * 2) * .03, n.z);
    const lo = d < 4.5 && dy < 2 && n.follow === undefined ? 1 : 0;
    n.label.material.opacity += (lo - n.label.material.opacity) * Math.min(1, dt * 6);
  }
  if (game.nearest && game.nearest !== lastNearest && !active) Sound.near();
  lastNearest = game.nearest;
  if (convo && convo.npc && Math.hypot(player.x - convo.npc.x, player.z - convo.npc.z) > convo.npc.range + .8) closeDialog();
  game.nearUse = null;
  if (!dressing && !convo && !game.cutscene && startEl.hidden) for (const u of game.world.usables) { if (Math.hypot(player.x - u.x, player.z - u.z) < u.range && player.y < 1) { game.nearUse = u; break; } }
  if (game.nearUse && game.nearUse !== lastUse) Sound.near();
  lastUse = game.nearUse;
  if (!convo) {
    const parts = [];
    if (game.nearest) parts.push(`<b>Space</b> Talk to ${game.nearest.name}`);
    if (game.nearUse) parts.push(`<b>E</b> ${game.nearUse.verb}`);
    promptEl.hidden = !parts.length || coarse || !startEl.hidden || dressing || game.cutscene;
    if (parts.length) promptEl.innerHTML = parts.join('<br>');
  }
  talkBtn.classList.toggle('ready', !!game.nearest);
  const showUse = !!game.nearUse;
  if (useBtn.hidden === showUse) useBtn.hidden = !showUse;
  if (game.nearUse && useBtn.textContent !== game.nearUse.short) { useBtn.textContent = game.nearUse.short; useBtn.setAttribute('aria-label', game.nearUse.verb); }
  for (const u of game.world.usables) { const sm = u.sparkle.material; sm.opacity += ((game.nearUse === u ? 1 : 0) - sm.opacity) * Math.min(1, dt * 7);
    u.sparkle.position.y = u.glow[1] + Math.sin(game.elapsed * 3) * .08; sm.rotation = game.elapsed * .8; }
  updateTyping(dt);

  if (game.world.update) game.world.update(dt, game.elapsed);
  if (game.world.wagon) game.world.wagon.update();

  const a = game.world.area(player.x, player.z, player.y);
  if (a !== areaName) { areaName = a; areaEl.textContent = a; }

  const portrait = innerWidth < innerHeight;
  if (dressing) {
    const sheet = innerWidth <= 640, side = sheet ? 0 : .8;
    tmpV.set(player.x + side, player.y + (sheet ? 1.7 : 1.5), player.z + (sheet ? 4.4 : 3.4));
    tmpV2.set(player.x + side, player.y + (sheet ? .25 : .95), player.z);
    camPos.lerp(tmpV, Math.min(1, dt * 4));
  } else if (game.cutCam) {
    game.cutCam(tmpV, tmpV2); camPos.lerp(tmpV, Math.min(1, dt * 2.2));
  } else {
    const co = game.world.cam || {};
    const oy = portrait ? (co.oyP || 7.4) : (co.oy || 5.6), oz = portrait ? (co.ozP || 8.2) : (co.oz || 7.0);
    tmpV.set(player.x, player.y + oy, player.z + oz);
    camPos.lerp(tmpV, Math.min(1, dt * 3.5));
    tmpV2.set(player.x, player.y + 1.1 + (co.lookY || 0), player.z - .4);
  }
  camLook.lerp(tmpV2, Math.min(1, dt * 5));
  camera.position.copy(camPos); camera.lookAt(camLook);
  if (game.camShake > 0) { camera.position.x += (Math.random() - .5)*game.camShake*.12; camera.position.y += (Math.random() - .5)*game.camShake*.12; game.camShake = Math.max(0, game.camShake - dt*5); }
  game.world.sun.position.set(player.x - 9, 16, player.z + 7); game.world.sun.target.position.set(player.x, 0, player.z);

  game.world.occluders.forEach(o => o.target = 1);
  tmpV.set(player.x, player.y + 1.0, player.z);
  dir.copy(tmpV).sub(camera.position); const dist = dir.length(); dir.normalize();
  ray.set(camera.position, dir); ray.far = Math.max(.1, dist - .3);
  for (const hit of ray.intersectObjects(game.world.occMeshes, false)) if (hit.object.userData.occ) hit.object.userData.occ.target = .2;
  game.world.occluders.forEach(o => { o.cur += (o.target - o.cur) * Math.min(1, dt * 6);
    o.meshes.forEach(mm => { mm.material.opacity = o.cur * mm.userData.baseOp; mm.material.depthWrite = o.cur > .95; }); });
}

function frame(){
  const dt = Math.min(clock.getDelta(), .05);
  if (!game.learning) { update(dt); renderer.render(game.world.scene, camera); renderBust(dt); }
  requestAnimationFrame(frame);
}
export function start(){ frame(); }
