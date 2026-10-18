// The explorer's hands at the desk: a lab glove that follows the pointer, grabs what's under it,
// carries it while the pointer drags, and tips it while Space, the right mouse button or the
// on-screen Tip button is held.

import * as THREE from 'three';
import { T, cyl, outline, sph } from '../core/kit.js';
import { canvas, camera } from '../core/render.js';
import { Sound } from '../core/sound.js';
import { deskPoint, desk, grab, pick, release } from './desk.js';

const glove = new THREE.Group(), fingers = [];
const latex = T(0xa9d8ef);
{
  const palm = outline(sph(.026, latex, 0, 0, 0, glove, 12), 1.08); palm.scale.set(1.1, .55, 1.2);
  cyl(.022, .025, .03, T(0x2f8f8a), 0, .004, .036, glove, 12).rotation.x = Math.PI/2;
  [[-.016, .2], [-.005, .05], [.006, -.05], [.017, -.2]].forEach(([x, sp], i) => {
    const f = new THREE.Group(); f.position.set(x, 0, -.022); f.rotation.y = sp*.4; glove.add(f);
    const len = i === 0 || i === 3 ? .022 : .028;
    cyl(.0055, .0055, len, latex, 0, 0, -len/2, f, 6).rotation.x = Math.PI/2; sph(.0058, latex, 0, 0, -len, f, 6);
    fingers.push(f);
  });
  const th = new THREE.Group(); th.position.set(-.026, 0, -.002); th.rotation.y = .9; glove.add(th);
  cyl(.0065, .0065, .022, latex, 0, 0, -.011, th, 6).rotation.x = Math.PI/2; sph(.0068, latex, 0, 0, -.022, th, 6);
  fingers.push(th);
  glove.traverse(m => { if (m.isMesh) m.castShadow = true; });
  glove.scale.setScalar(1.3); glove.visible = false;
}

let on = false, pid = null, hover = false, curl = 0, tipKey = false, tipMouse = false, tipBtn = false;
const ndc = new THREE.Vector2(), rc = new THREE.Raycaster(), _m = new THREE.Vector3();
function aim(e){
  const r = canvas.getBoundingClientRect();
  ndc.set((e.clientX - r.left)/r.width*2 - 1, -((e.clientY - r.top)/r.height)*2 + 1);
  rc.setFromCamera(ndc, camera); desk.ray = rc.ray;
}
function down(e){
  if (!on) return;
  if (e.button === 2) { tipMouse = true; e.preventDefault(); return; }
  if (pid !== null || e.button > 0) return;
  Sound.init(); pid = e.pointerId; try { canvas.setPointerCapture(pid); } catch (err) {} aim(e); hover = true;
  const it = pick(desk.ray); if (it) grab(it);
}
function move(e){ if (!on) return; if (pid === null && e.pointerType !== 'mouse') return; if (pid !== null && e.pointerId !== pid) return; aim(e); hover = true; }
function up(e){
  if (e.button === 2) { tipMouse = false; return; }
  if (e.pointerId !== pid) return;
  pid = null; release(); if (e.pointerType !== 'mouse') hover = false;
}
canvas.addEventListener('pointerdown', down);
canvas.addEventListener('pointermove', move);
canvas.addEventListener('pointerup', up);
canvas.addEventListener('pointercancel', up);
canvas.addEventListener('pointerleave', e => { if (on && pid === null && e.pointerType === 'mouse') hover = false; });
canvas.addEventListener('contextmenu', e => { if (on) e.preventDefault(); });

export function handsOn(root){ on = true; root.add(glove); glove.visible = false; hover = false; }
export function handsOff(){
  on = false; if (pid !== null) { try { canvas.releasePointerCapture(pid); } catch (e) {} } pid = null;
  release(); glove.visible = false; tipKey = tipMouse = tipBtn = false; desk.tip = false;
}
export const setTipKey = v => { tipKey = v; }, setTipButton = v => { tipBtn = v; };
export const holding = () => desk.held;

export function updateHands(dt, t){
  desk.tip = tipKey || tipMouse || tipBtn;
  const it = desk.held;
  curl += ((it ? 1 : 0) - curl)*Math.min(1, dt*14);
  fingers.forEach((f, i) => { f.rotation.x = -curl*(i === 4 ? .5 : 1.4); });
  glove.visible = on && (hover || !!it);
  if (!glove.visible) return;
  if (it) {
    // grip the near side of whatever is held, turning with it as it tips
    const g = it.state === 'attached' ? it.host.g : it.g;
    g.updateMatrix(); _m.set(0, it.state === 'attached' ? it.host.def.h*.25 + .05 : .006, (it.state === 'attached' ? it.host.def.r : it.def.r) + .016).applyMatrix4(g.matrix);
    glove.position.lerp(_m, Math.min(1, dt*25)); glove.rotation.set(-.35, 0, it.state === 'attached' ? 0 : it.tilt + it.swz);
  } else if (desk.ray) {
    const p = deskPoint(desk.ray, .11);
    if (p) { glove.position.set(p.x, p.y + Math.sin(t*3)*.004, p.z); glove.rotation.set(-.55, 0, 0); }
  }
}
