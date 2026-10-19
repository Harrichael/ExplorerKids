// The Moon or a planet up close: its real map on a ball, lit by the real Sun from where the Sun
// really is, turned the way it faces the treehouse tonight with the sky's "up" (the zenith) up. A
// kid drags to fly round it, out of Earth's view and onto the far side, and zooms in to the surface.
// The same picture, drawn small, is how the telescope's star view shows each body in place.
//
// World units are the body's radius, on the stars' own axes (RA 0, RA 90°, the celestial pole), with
// the body at the centre; that way the Sun, the Earth and the body's spin need no converting.

import * as THREE from 'three';
import { siderealTime } from './astro.js';
import { RINGS, axes, sight, surface } from './bodies.js';

export const canvas = document.createElement('canvas');
const renderer = new THREE.WebGLRenderer({canvas, antialias:true, alpha:true, preserveDrawingBuffer:true});
renderer.outputEncoding = THREE.sRGBEncoding; renderer.setClearColor(0x000000, 0);
const scene = new THREE.Scene();
const sunlight = new THREE.DirectionalLight(0xffffff, 1.15); scene.add(sunlight, sunlight.target);
// a whisper of light on the night side, about what earthshine gives the Moon
scene.add(new THREE.AmbientLight(0xffffff, .01));
const camera = new THREE.PerspectiveCamera(30, 1, .01, 100), flat = new THREE.OrthographicCamera(-1, 1, 1, -1, .01, 100);

// counts maps as they arrive, so whoever drew a body before its map came knows to draw it again
export let maps = 0;
const loader = new THREE.TextureLoader(), worlds = {}, arrived = () => { maps++; };
function world(body){
  if (worlds[body.id]) return worlds[body.id];
  const map = loader.load(`sky/maps/${body.map}.jpg`, arrived);
  map.encoding = THREE.sRGBEncoding; map.anisotropy = renderer.capabilities.getMaxAnisotropy();
  const frame = new THREE.Group(); frame.matrixAutoUpdate = false;
  const globe = new THREE.Mesh(new THREE.SphereGeometry(1, 128, 64), new THREE.MeshLambertMaterial({map}));
  globe.scale.y = 1 - (body.flat || 0);
  frame.add(globe);
  if (body.rings) frame.add(rings(body));
  return worlds[body.id] = frame;
}

// How much of the light behind each ring gets through comes from Voyager 2 watching a star through
// them (stored as optical depth, tau, in the texture's alpha); how much gets through depends on how
// slant you look, so the shader works it out rather than a fixed transparency. Lit from behind,
// thin rings glow and thick ones go dark, as they do in Cassini's pictures. Saturn shades them too.
function rings(body){
  const inner = RINGS.inner/(body.km/(1 - body.flat/3)), outer = RINGS.outer/(body.km/(1 - body.flat/3));
  const map = loader.load('sky/maps/saturn-rings.png', arrived); map.minFilter = THREE.LinearFilter;
  const mat = new THREE.ShaderMaterial({transparent:true, depthWrite:false, side:THREE.DoubleSide,
    uniforms:{map:{value:map}, sun:{value:new THREE.Vector3()}, pole:{value:new THREE.Vector3()}, inner:{value:inner}, outer:{value:outer}},
    vertexShader:`varying vec3 vWorld; varying float vR;
      void main(){ vR = length(position.xy); vec4 w = modelMatrix*vec4(position, 1.); vWorld = w.xyz; gl_Position = projectionMatrix*viewMatrix*w; }`,
    fragmentShader:`uniform sampler2D map; uniform vec3 sun, pole; uniform float inner, outer; varying vec3 vWorld; varying float vR;
      void main(){
        vec4 t = texture2D(map, vec2((vR - inner)/(outer - inner), .5));
        float tau = t.a*5.;
        vec3 view = normalize(cameraPosition - vWorld);
        float mu = max(abs(dot(view, pole)), .015), mu0 = max(abs(dot(sun, pole)), .015);
        float through = exp(-tau/mu0);
        float light = dot(view, pole)*dot(sun, pole) > 0. ? 1. : 2.*(1. - through)*through;
        float along = dot(vWorld, sun);
        if (along < 0. && length(vWorld - along*sun) < .95) light *= .03;
        gl_FragColor = vec4(t.rgb*light, 1. - exp(-tau/mu));
      }`});
  const mesh = new THREE.Mesh(new THREE.RingGeometry(inner, outer, 256, 1), mat);
  mesh.rotation.x = -Math.PI/2; mesh.userData.ring = mat;
  return mesh;
}

// Places a whole world: its spin tonight, the Sun's direction, and which way is the Earth and the zenith
const v3 = a => new THREE.Vector3(a[0], a[1], a[2]);
function place(body, ms, where){
  const s = sight(body, ms, where), ax = axes(body, ms - s.late*1000), frame = world(body);
  if (shown && shown !== frame) scene.remove(shown);
  scene.add(frame); shown = frame;
  // the map's sphere has its pole on y and longitude 0 on x; the body's are z and x
  frame.matrix.makeBasis(v3(ax.x), v3(ax.z), v3(ax.y).negate());
  frame.updateMatrixWorld(true);
  const sun = v3(s.sun.map((x, i) => x - s.v[i])).normalize(), toUs = v3(s.v).negate().normalize();
  sunlight.position.copy(sun);
  for (const c of frame.children) if (c.userData.ring) { c.userData.ring.uniforms.sun.value.copy(sun); c.userData.ring.uniforms.pole.value.copy(v3(ax.z)); }
  const lst = siderealTime(ms, where.lon)*Math.PI/180, lat = where.lat*Math.PI/180;
  const zenith = new THREE.Vector3(Math.cos(lat)*Math.cos(lst), Math.cos(lat)*Math.sin(lst), Math.sin(lat));
  const up = zenith.sub(toUs.clone().multiplyScalar(zenith.dot(toUs))).normalize();
  return {s, ax, toUs, up};
}
let shown = null;

// ---------- the close-up ----------
let body = null, eye = null, zoomTo = 1, zoomAt = 1, labelled = [], last = '';
export function show(b){ body = b; eye = null; zoomTo = zoomAt = 1; last = ''; }
// a drag of the screen's height swings round a third of the way about the body when far off, less
// as the surface nears, so the ground doesn't race by
export function orbit(dx, dy){
  if (!eye) return;
  const k = 2*(1 - 1/dist())/(canvas.clientHeight || 1), right = new THREE.Vector3().crossVectors(eye.up, eye.dir);
  eye.dir.addScaledVector(right, -dx*k).addScaledVector(eye.up, dy*k).normalize();
  eye.up.addScaledVector(eye.dir, -eye.up.dot(eye.dir)).normalize();
  eye.mine = true;
}
export function zoom(k){ zoomTo = Math.min(4, Math.max(nearest(), zoomTo*k)); }
const reach = () => body.rings ? RINGS.outer/body.km*1.05 : 1.08;
// how far the camera sits to fit the body (rings and all) in the view, times the zoom
const fit = () => reach()/Math.tan(Math.min(15, Math.atan(Math.tan(15*Math.PI/180)*camera.aspect)/Math.PI*180)*Math.PI/180);
const dist = () => fit()*zoomAt;
const nearest = () => 1.06/fit();

// Draws only when something shows a change: a drag, a zoom, a map arriving, or every couple of
// seconds as the world spins and the night goes on. Says whether it drew.
export function draw(ms, where, w, h, dt){
  if (!body) return false;
  const dpr = Math.min(devicePixelRatio, 2);
  if (canvas.width !== Math.round(w*dpr) || canvas.height !== Math.round(h*dpr)) { renderer.setPixelRatio(dpr); renderer.setSize(w, h, false); last = ''; }
  camera.aspect = w/h;
  zoomAt *= Math.pow(zoomTo/zoomAt, Math.min(1, dt*8));
  const at = place(body, ms, where);
  // until the kid flies off, the camera rides along with the Earth's view as the night goes on
  if (!eye || !eye.mine) eye = {dir:at.toUs.clone(), up:at.up.clone(), mine:false};
  const key = [...eye.dir.toArray(), ...eye.up.toArray()].map(v => v.toFixed(4)).concat([zoomAt.toFixed(4), w, h, Math.floor(ms/2000), maps]).join();
  if (key === last) return false;
  last = key;
  camera.position.copy(eye.dir).multiplyScalar(dist()); camera.up.copy(eye.up); camera.lookAt(0, 0, 0);
  camera.near = Math.max(.002, dist() - reach() - .01); camera.far = dist() + reach() + 1; camera.updateProjectionMatrix();
  renderer.render(scene, camera);
  return true;
}

// Names on the surface, nearest-facing first, skipping any that would land on another
export function names(g, ms, where, w, h){
  labelled = [];
  if (!body || !body.places) return;
  const ax = axes(body, ms - sight(body, ms, where).late*1000), cam = camera.position;
  g.font = '800 13px Nunito, system-ui, sans-serif'; g.textBaseline = 'middle'; g.lineJoin = 'round';
  const want = body.places.map(([name, lat, lon, line]) => {
    const p = v3(surface(ax, lat, lon)), facing = p.dot(cam.clone().sub(p).normalize());
    return {name, line, p, facing};
  }).filter(q => q.facing > .12).sort((a, b) => b.facing - a.facing);
  for (const q of want) {
    const s = q.p.clone().project(camera), x = (s.x + 1)/2*w, y = (1 - s.y)/2*h;
    if (x < -20 || y < -20 || x > w + 20 || y > h + 20) continue;
    const tw = g.measureText(q.name).width, box = [x - 10, y - 10, x + 14 + tw, y + 10];
    if (labelled.some(o => box[0] < o.box[2] && box[2] > o.box[0] && box[1] < o.box[3] && box[3] > o.box[1])) continue;
    labelled.push({box, place:q});
    g.strokeStyle = 'rgba(239,224,191,.75)'; g.lineWidth = 1.5; g.beginPath(); g.arc(x, y, 4, 0, 7); g.stroke();
    g.lineWidth = 3; g.strokeStyle = 'rgba(5,4,10,.85)'; g.strokeText(q.name, x + 10, y);
    g.fillStyle = '#efe0bf'; g.fillText(q.name, x + 10, y);
  }
}
// what a tap lands on: a named place, else the body itself (true), else nothing
export function tapped(x, y, w, h){
  const hit = labelled.find(q => x >= q.box[0] - 6 && x <= q.box[2] + 6 && y >= q.box[1] - 6 && y <= q.box[3] + 6);
  if (hit) return hit.place;
  const ray = new THREE.Raycaster(); ray.setFromCamera({x:x/w*2 - 1, y:1 - y/h*2}, camera);
  return ray.intersectObject(shown, true).some(i => !i.object.userData.ring);
}

// ---------- the body drawn small, for the star view ----------
// r is the globe's radius in screen pixels. The picture comes back with the zenith up, centred, and
// sized to hold the rings too. The renderer is borrowed, so this only runs while the close-up is hidden.
const cache = new Map();
export function portrait(b, ms, where, r){
  const px = Math.max(2, Math.round(r)), key = `${b.id}:${px}:${Math.round(ms/60000)}:${where.lat},${where.lon}:${maps}`;
  if (cache.has(key)) return cache.get(key);
  if (cache.size > 24) cache.clear();
  const span = b.rings ? RINGS.outer/b.km*1.02 : 1.02, size = Math.min(2048, Math.ceil(px*span)*2 + 2);
  renderer.setPixelRatio(1); renderer.setSize(size, size, false);
  const at = place(b, ms, where), e = size/2/px;
  Object.assign(flat, {left:-e, right:e, top:e, bottom:-e}); flat.updateProjectionMatrix();
  flat.position.copy(at.toUs).multiplyScalar(span + 5); flat.up.copy(at.up); flat.lookAt(0, 0, 0);
  renderer.render(scene, flat);
  const out = document.createElement('canvas'); out.width = out.height = size;
  out.getContext('2d').drawImage(canvas, 0, 0);
  cache.set(key, out);
  // the close-up resizes itself back on its next frame
  canvas.width = 0;
  return out;
}
