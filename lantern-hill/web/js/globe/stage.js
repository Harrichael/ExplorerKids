// A storybook Earth on a canvas of its own: drag to spin it, pinch or scroll to zoom, arrow keys to
// turn it, tap to pick a spot. The Explorer's Globe and Pip's treehouse magic both stand on it.
//
//   const globe = makeGlobe(canvas, (lat, lon) => globe.pinAt(lat, lon));
//   globe.setMap(texture);
//   function frame(dt){ globe.frame(dt); requestAnimationFrame(...) }
//   addEventListener('keydown', e => globe.key(e));   // arrows; the caller decides when keys are its

import * as THREE from 'three';
import { C, T, glowTex, outline } from '../core/kit.js';
import { Sound } from '../core/sound.js';

const RAD = Math.PI/180, PITCH = 1.35, wrap = a => Math.atan2(Math.sin(a), Math.cos(a));
// a point on the globe's surface, in the globe's own frame; matches three's sphere UVs
const surface = (lat, lon) => new THREE.Vector3(Math.cos(lat*RAD)*Math.cos(lon*RAD), Math.sin(lat*RAD), -Math.cos(lat*RAD)*Math.sin(lon*RAD));
// the spin and tilt that turn a place to face the camera
const facing = (lat, lon) => ({yaw: -(Math.PI/2 + lon*RAD), pitch: lat*RAD});

export function makeGlobe(cv, onTap){
  // ---------- the stage: a globe that spins about its axis inside a frame that tilts ----------
  const renderer = new THREE.WebGLRenderer({canvas: cv, antialias: true, alpha: true});
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2)); renderer.outputEncoding = THREE.sRGBEncoding;
  const scene = new THREE.Scene(), camera = new THREE.PerspectiveCamera(30, 1, .1, 50);
  scene.add(new THREE.HemisphereLight(0xfff2e0, 0x4a3f78, .8));
  const sun = new THREE.DirectionalLight(0xffe6c8, .7); sun.position.set(-3, 2.5, 4); scene.add(sun);
  const halo = new THREE.Sprite(new THREE.SpriteMaterial({map: glowTex, color: 0x8fc4ff, transparent: true, opacity: .55, depthWrite: false, blending: THREE.AdditiveBlending}));
  halo.scale.set(3.3, 3.3, 1); halo.position.z = -1.2; scene.add(halo);
  const tilt = new THREE.Group(), spin = new THREE.Group(); tilt.add(spin); scene.add(tilt);
  const ball = new THREE.Mesh(new THREE.SphereGeometry(1, 96, 64), T(0x2a5b8c)); outline(ball, 1.012); spin.add(ball);
  const pin = new THREE.Group(); pin.visible = false; spin.add(pin);
  { const stick = new THREE.Mesh(new THREE.CylinderGeometry(.007, .007, .13, 6), T(C.ink)); stick.position.y = .065; pin.add(stick);
    const head = new THREE.Mesh(new THREE.SphereGeometry(.03, 14, 10), T(0xe0453a)); head.position.y = .13; outline(head, 1.25); pin.add(head); }
  const view = {yaw: facing(20, 0).yaw, pitch: 20*RAD, zoom: 1, vyaw: 0, vpitch: 0, fly: null, idle: true};

  // ---------- spinning and tapping ----------
  const pointers = new Map(), ray = new THREE.Raycaster(), ndc = new THREE.Vector2();
  let drag = null;
  cv.addEventListener('pointerdown', e => {
    cv.setPointerCapture(e.pointerId); pointers.set(e.pointerId, {x: e.clientX, y: e.clientY});
    drag = {x: e.clientX, y: e.clientY, moved: 0, pinch: pointers.size > 1 ? pinchSpan() : 0, zoom: view.zoom};
    view.fly = null; view.vyaw = view.vpitch = 0; cv.classList.add('dragging'); Sound.init();
  });
  cv.addEventListener('pointermove', e => {
    const p = pointers.get(e.pointerId); if (!p || !drag) return;
    const dx = e.clientX - p.x, dy = e.clientY - p.y; p.x = e.clientX; p.y = e.clientY;
    drag.moved += Math.hypot(dx, dy);
    if (pointers.size > 1) { if (drag.pinch) view.zoom = clampZoom(drag.zoom*drag.pinch/pinchSpan()); return; }
    // a drag across the globe's width turns it about half a turn, whatever the zoom
    const k = Math.PI/(cv.clientHeight*.9)*view.zoom;
    view.yaw += dx*k; view.pitch = Math.max(-PITCH, Math.min(PITCH, view.pitch + dy*k));
    view.vyaw = dx*k*60; view.vpitch = dy*k*60; view.idle = false;
  });
  const lift = e => {
    if (!pointers.delete(e.pointerId)) return;
    if (drag && drag.moved < 8 && pointers.size === 0) tap(e.clientX, e.clientY);
    if (pointers.size === 0) { drag = null; cv.classList.remove('dragging'); }
    else drag = {moved: 99, pinch: pinchSpan(), zoom: view.zoom};
  };
  cv.addEventListener('pointerup', lift); cv.addEventListener('pointercancel', lift);
  cv.addEventListener('wheel', e => { e.preventDefault(); view.zoom = clampZoom(view.zoom*(1 + Math.sign(e.deltaY)*.1)); }, {passive: false});
  function pinchSpan(){ const [a, b] = [...pointers.values()]; return Math.hypot(a.x - b.x, a.y - b.y) || 1; }
  const clampZoom = z => Math.max(.45, Math.min(1, z));
  function tap(x, y){
    const r = cv.getBoundingClientRect(); ndc.set((x - r.left)/r.width*2 - 1, -(y - r.top)/r.height*2 + 1);
    ray.setFromCamera(ndc, camera);
    const hit = ray.intersectObject(ball, false)[0]; if (!hit) return;
    onTap(hit.uv.y*180 - 90, hit.uv.x*360 - 180);
  }

  const held = new Set();
  addEventListener('keyup', e => held.delete(e.key));
  return {
    setMap(map){ ball.material = T(0xffffff, {map}); },
    pinAt(lat, lon, fly = true){
      pin.position.copy(surface(lat, lon)); pin.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), pin.position); pin.visible = true; pin.t = 0;
      if (fly) view.fly = facing(lat, lon);
      view.idle = false;
    },
    // what faces the camera, for picking from the keyboard
    middle: () => ({lat: view.pitch/RAD, lon: wrap(-view.yaw - Math.PI/2)/RAD}),
    key(e){
      if (!e.key.startsWith('Arrow')) return;
      e.preventDefault(); held.add(e.key);
      // a tap is over before the next frame sees it held, so each fresh press turns the globe a notch too
      if (!e.repeat) { const n = .12*view.zoom; view.fly = null; view.idle = false;
        if (e.key === 'ArrowLeft') view.yaw += n; if (e.key === 'ArrowRight') view.yaw -= n;
        if (e.key === 'ArrowUp') view.pitch += n; if (e.key === 'ArrowDown') view.pitch -= n; }
    },
    release(){ held.clear(); },
    frame(dt){
      const r = cv.getBoundingClientRect();
      const pr = renderer.getPixelRatio();
      if (r.width && (cv.width !== Math.round(r.width*pr) || cv.height !== Math.round(r.height*pr))) { renderer.setSize(r.width, r.height, false); camera.aspect = r.width/r.height; camera.updateProjectionMatrix(); }
      const turn = 1.6*dt*view.zoom;
      if (held.has('ArrowLeft')) view.yaw += turn; if (held.has('ArrowRight')) view.yaw -= turn;
      if (held.has('ArrowUp')) view.pitch += turn; if (held.has('ArrowDown')) view.pitch -= turn;
      if (held.size) { view.fly = null; view.idle = false; }
      if (view.fly) {
        const k = Math.min(1, dt*4), dy = wrap(view.fly.yaw - view.yaw), dp = view.fly.pitch - view.pitch;
        view.yaw += dy*k; view.pitch += dp*k;
        if (Math.abs(dy) + Math.abs(dp) < .002) view.fly = null;
      } else if (!drag) {
        view.yaw += view.vyaw*dt; view.pitch += view.vpitch*dt;
        const f = Math.exp(-dt*3.5); view.vyaw *= f; view.vpitch *= f;
        if (view.idle) view.yaw -= dt*.12;
      }
      view.pitch = Math.max(-PITCH, Math.min(PITCH, view.pitch));
      spin.rotation.y = view.yaw; tilt.rotation.x = view.pitch;
      // the whole globe fits the canvas, with room for its halo; zooming brings the camera closer
      const fit = 1.18/(Math.tan(camera.fov*RAD/2)*Math.min(1, camera.aspect));
      camera.position.set(0, 0, 1 + (fit - 1)*view.zoom); camera.lookAt(0, 0, 0);
      if (pin.visible) { pin.t += dt; const s = 1 + Math.max(0, 1 - pin.t*3)*Math.sin(pin.t*20)*.4; pin.scale.setScalar(s); }
      renderer.render(scene, camera);
    }
  };
}
