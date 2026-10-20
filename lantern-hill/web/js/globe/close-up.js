// A sharper picture of just what's in view, laid over the room globe once it holds still. The globe's
// own picture is painted once for the whole Earth; leaning in past what that picture can show, a
// close-up of the box in view is painted (or fetched) through the lens and fades in on top.
//
//   const zoom = makeCloseUp(globeBall, R);
//   zoom.frame(dt, still, mag, lens, maps);   // every frame the globe is on show
//   zoom.reset();                             // the lens changed, or the globe is put away

import * as THREE from 'three';
import { camera } from '../core/render.js';
import { closeUp } from './imagery.js';

const RAD = Math.PI/180;

export function makeCloseUp(globeBall, R){
  let patch = null, want = null, asking = null, settled = 0, lens = null;
  const at = new THREE.Vector3(), mid = new THREE.Vector3();

  // The explorer looks along the line from the camera to the globe's middle, so what's in the middle
  // of the view is where that line meets the surface; how much shows round it depends on the zoom.
  function centre(){
    const c = globeBall.getWorldPosition(mid), d = camera.position.distanceTo(c);
    at.copy(camera.position).sub(c).normalize().multiplyScalar(R).add(c);
    const p = globeBall.worldToLocal(at.clone()).normalize();
    const tanH = Math.tan(camera.fov*RAD/2)/camera.zoom, half = Math.min(60, (d - R)*tanH/R/RAD*1.15);
    return {lat: Math.asin(p.y)/RAD, lon: Math.atan2(-p.z, p.x)/RAD, half, perDeg: innerHeight/2/half};
  }
  function wanted(v, mag){
    // the whole-Earth picture is 4096 wide, about 11 pixels a degree; leaning in past that is when a close-up helps
    if (v.perDeg < 14 || mag < 2) return null;
    const half = v.half*1.6, grid = Math.max(.5, half/2), snap = x => Math.round(x/grid)*grid;
    const lonHalf = Math.min(180, half*Math.max(1, camera.aspect)/Math.max(.15, Math.cos(v.lat*RAD)));
    const box = {s: Math.max(-90, snap(v.lat) - half), n: Math.min(90, snap(v.lat) + half), w: Math.max(-180, snap(v.lon) - lonHalf), e: Math.min(180, snap(v.lon) + lonHalf)};
    const perDeg = Math.min(lens.sharpest, v.perDeg*Math.min(devicePixelRatio, 1.5));
    const w = Math.round(Math.min(2048, (box.e - box.w)*perDeg)), h = Math.round(Math.min(2048, (box.n - box.s)*perDeg));
    return {box, w, h, perDeg: Math.min(w/(box.e - box.w), h/(box.n - box.s)), lens};
  }
  const covers = (a, v) => a && a.lens === lens && v.lat - v.half > a.box.s && v.lat + v.half < a.box.n && v.lon > a.box.w && v.lon < a.box.e
    && a.perDeg >= Math.min(lens.sharpest, v.perDeg)*.7;
  async function fetch(w, maps){
    asking = w;
    try {
      const t = await closeUp(w.lens, w.box, w.w, w.h, maps);
      if (asking !== w) { t.dispose(); return; }
      const b = w.box, mesh = new THREE.Mesh(
        new THREE.SphereGeometry(R*1.0006, Math.max(8, Math.ceil((b.e - b.w)/2)), Math.max(6, Math.ceil((b.n - b.s)/2)), (b.w + 180)*RAD, (b.e - b.w)*RAD, (90 - b.n)*RAD, (b.n - b.s)*RAD),
        new THREE.MeshBasicMaterial({map: t, transparent: true, opacity: 0}));
      drop(); patch = Object.assign(mesh, {want: w}); globeBall.add(patch);
    } catch (e) { if (want === w) want = null; /* the whole-Earth picture still shows; the next settle tries again */ } finally { if (asking === w) asking = null; }
  }
  function drop(){ if (!patch) return; globeBall.remove(patch); patch.geometry.dispose(); patch.material.map.dispose(); patch.material.dispose(); patch = null; }
  function reset(){ drop(); want = null; asking = null; }

  function frame(dt, still, mag, l, maps){
    if (l !== lens) { reset(); lens = l; }
    if (patch && patch.material.opacity < 1) patch.material.opacity = Math.min(1, patch.material.opacity + dt*3);
    // a close-up is asked for once the globe has held still a moment, and only if the one shown won't do
    settled = still ? settled + dt : 0;
    if (settled > .3 && !asking) {
      const v = centre();
      if (!covers(patch && patch.want, v)) { const w = wanted(v, mag); if (w && JSON.stringify(w.box) !== JSON.stringify(want && want.box)) { want = w; fetch(w, maps); } }
      if (patch && mag < 1.6) drop();
    }
  }

  return {frame, reset, centre};
}
