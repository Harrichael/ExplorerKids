// The Moon or a planet up close: its real map on a ball, lit by the real Sun from where the Sun
// really is, turned the way it faces the treehouse tonight with the sky's "up" (the zenith) up. It is
// a telescope's view, so a kid sees only the side facing Earth: a drag aims across the face and a
// zoom goes down to the surface, but nothing flies round to the far side.
// The same picture, drawn small, is how the telescope's star view shows each body in place.
//
// World units are the body's radius, on the stars' own axes (RA 0, RA 90°, the celestial pole), with
// the body at the centre; that way the Sun, the Earth and the body's spin need no converting.
// Jupiter brings its four big moons, each where it really is tonight.

import * as THREE from 'three';
import { siderealTime } from './astro.js';
import { RINGS, aroundJupiter, axes, equatorial, sight, surface } from './bodies.js';
import { cells, streamed } from './detail.js';

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
const loader = new THREE.TextureLoader(), worlds = {}, globes = {}, arrived = () => { maps++; };
const texture = (file, done = arrived) => loader.load(`sky/maps/${file}`, t => {
  t.encoding = THREE.sRGBEncoding; t.anisotropy = renderer.capabilities.getMaxAnisotropy(); t.needsUpdate = true; done(t);
});
// Every globe starts in its small map, plenty for the star view; the sharp one, megabytes for the
// biggest, is only fetched once a kid comes close
function ball(b){
  const globe = new THREE.Mesh(new THREE.SphereGeometry(1, 128, 64), new THREE.MeshLambertMaterial({map:texture(`${b.map}-small.jpg`)}));
  globe.material.map.encoding = THREE.sRGBEncoding;
  if (b.lenses) globe.userData.ground = streamed(globe, b.lenses[0].hips, arrived);
  return globes[b.id] = globe;
}
function sharpen(b){
  const globe = globes[b.id];
  if (!globe || globe.userData.sharp) return;
  globe.userData.sharp = true;
  texture(`${b.map}.jpg`, t => { const small = globe.material.map; globe.material.map = t; globe.material.needsUpdate = true; small.dispose(); maps++; });
}
// a world's own spinning frame, its rings, and for Jupiter a frame for each of its moons
function world(body){
  if (worlds[body.id]) return worlds[body.id];
  const root = new THREE.Group(), frame = new THREE.Group(); frame.matrixAutoUpdate = false;
  const globe = ball(body); globe.scale.y = 1 - (body.flat || 0);
  frame.add(globe);
  if (body.rings) frame.add(rings(body));
  root.add(frame); root.userData.frame = frame;
  if (body.moons) {
    const moons = new THREE.Group();
    for (const m of body.moons) {
      const f = new THREE.Group(), globe = ball(m); f.matrixAutoUpdate = false; f.userData.moon = m;
      globe.scale.setScalar(m.km/equatorial(body)); globe.userData.moon = m;
      f.add(globe); moons.add(f);
    }
    root.add(moons); root.userData.moons = moons;
  }
  return worlds[body.id] = root;
}

// How much of the light behind each ring gets through comes from Voyager 2 watching a star through
// them (stored as optical depth, tau, in the texture's alpha); how much gets through depends on how
// slant you look, so the shader works it out rather than a fixed transparency. Lit from behind,
// thin rings glow and thick ones go dark, as they do in Cassini's pictures. Saturn shades them too.
function rings(body){
  const inner = RINGS.inner/equatorial(body), outer = RINGS.outer/equatorial(body);
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
  const s = sight(body, ms, where), ax = axes(body, ms - s.late*1000), root = world(body), frame = root.userData.frame;
  if (shown && shown !== root) scene.remove(shown);
  scene.add(root); shown = root;
  // the map's sphere has its pole on y and longitude 0 on x; the body's are z and x
  frame.matrix.makeBasis(v3(ax.x), v3(ax.z), v3(ax.y).negate());
  for (const f of root.userData.moons ? root.userData.moons.children : []) {
    const m = f.userData.moon, mx = axes(m, ms), p = aroundJupiter(m, ms).map(x => x/equatorial(body));
    f.matrix.makeBasis(v3(mx.x), v3(mx.z), v3(mx.y).negate()).setPosition(p[0], p[1], p[2]);
  }
  root.updateMatrixWorld(true);
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
let body = null, aim = {x:0, y:0}, tilt = {x:0, y:0}, steered = 0, zoomTo = 1, zoomAt = 1, labelled = [], last = '';
export function show(b){ body = b; aim = {x:0, y:0}; tilt = {x:0, y:0}; zoomTo = zoomAt = 1; last = ''; world(b); sharpen(b); lens(0); }
export function refresh(){ last = ''; }

// ---------- lenses ----------
let lensAt = 0, glow = null, closeups = null;
export const lenses = b => b.lenses || [];
const lensNow = () => lenses(body)[lensAt];
const hipsNow = () => lensNow()?.hips || lenses(body)[0]?.hips;
export function lens(i){
  lensAt = i;
  const l = lensNow(), globe = globes[body.id];
  if (globe.userData.ground) globe.userData.ground.use(hipsNow());
  if (glow) { glow.parent.remove(glow); glow = null; }
  if (l?.glow) glowing(l, globe);
  zoom(1); last = '';
}
async function glowing(l, globe){
  try { closeups = closeups || await fetch('sky/maps/closeups.json').then(r => r.json()); } catch { return; }
  if (lensNow() !== l || globes[body.id] !== globe || glow) return;
  const mat = new THREE.MeshBasicMaterial({color:l.glow, transparent:true, opacity:.45, depthWrite:false});
  glow = cells(closeups[body.id] || {}, mat); glow.userData.mat = mat;
  for (const c of glow.children) c.renderOrder = 99;
  globe.add(glow); maps++;
}
// The Moon rocks a little as it goes round, nodding and turning about 7° each way, so over a month
// Earth sees 59% of it rather than half. A drag rocks it that far and lets go; the planets hold still.
const ROCK = 7*Math.PI/180;
// a drag moves the view across the face as far as the finger goes, and no further off than there is
// something to see
export function pan(dx, dy){
  const k = 2*(dist() - ground())*Math.tan(15*Math.PI/180)/(canvas.clientHeight || 1);
  aim.x -= dx*k; aim.y += dy*k;
  const far = Math.hypot(aim.x, aim.y), most = system();
  if (far > most) { aim.x *= most/far; aim.y *= most/far; }
  if (body.id === 'moon') {
    tilt.x -= dx*ROCK*2/(canvas.clientHeight || 1); tilt.y += dy*ROCK*2/(canvas.clientHeight || 1);
    const t = Math.hypot(tilt.x, tilt.y); if (t > ROCK) { tilt.x *= ROCK/t; tilt.y *= ROCK/t; }
  }
  steered = performance.now();
}
// Jupiter lets you back off far enough to take in Callisto's orbit, 26 Jupiters out
export function zoom(k){ zoomTo = Math.min(body.moons ? 28 : 4, Math.max(nearest(), zoomTo*k)); }
const reach = () => body.rings ? RINGS.outer/body.km*1.05 : 1.08;
const system = () => body.moons ? 28 : reach();
// how far the camera sits to fit the body (rings and all) in the view, times the zoom
const fit = () => reach()/Math.tan(Math.min(15, Math.atan(Math.tan(15*Math.PI/180)*camera.aspect)/Math.PI*180)*Math.PI/180);
const dist = () => fit()*zoomAt;
// No closer than a fifth of the body's radius above the ground in the middle of the view, where the
// shipped map runs out of detail; a world with sharper ground streamed in lets you down until its
// finest pixels are two screen pixels
const HALF = 15*Math.PI/180;
const perPixel = () => 2*HALF/((canvas.clientHeight || 600)*Math.min(devicePixelRatio, 2));
const ground = () => { const off = Math.hypot(aim.x, aim.y); return off < 1 ? Math.sqrt(1 - off*off) : 0; };
const nearest = () => { const h = hipsNow(); return (ground() + Math.min(.2, h ? 1.0233/(512 << h.order)/(2*perPixel()) : .2))/fit(); };

// Draws only when something shows a change: a drag, a zoom, a map arriving, or the Moon rocking
// back. Says whether it drew.
export function draw(ms, where, w, h, dt){
  if (!body) return false;
  const dpr = Math.min(devicePixelRatio, 2);
  if (canvas.width !== Math.round(w*dpr) || canvas.height !== Math.round(h*dpr)) { renderer.setPixelRatio(dpr); renderer.setSize(w, h, false); last = ''; }
  camera.aspect = w/h;
  zoomAt *= Math.pow(zoomTo/zoomAt, Math.min(1, dt*8));
  // panned in toward the middle, the ground rises to meet the view; it backs off rather than sink in
  const lo = nearest(); zoomTo = Math.max(zoomTo, lo); zoomAt = Math.max(zoomAt, lo);
  if (performance.now() - steered > 150) { const k = Math.exp(-dt*4); tilt.x *= k; tilt.y *= k; }
  const at = place(body, ms, where);
  const key = [aim.x, aim.y, tilt.x, tilt.y, zoomAt].map(v => v.toFixed(5)).concat([w, h, Math.floor(ms/2000), maps]).join();
  if (key === last) return false;
  last = key;
  // looking straight down Earth's line of sight, moved across the face, and tipped by the Moon's rock
  const right = new THREE.Vector3().crossVectors(at.up, at.toUs), centre = right.clone().multiplyScalar(aim.x).addScaledVector(at.up, aim.y);
  const dir = at.toUs.clone().addScaledVector(right, Math.sin(tilt.x)).addScaledVector(at.up, Math.sin(tilt.y)).normalize();
  camera.position.copy(centre).addScaledVector(dir, dist()); camera.up.copy(at.up); camera.lookAt(centre);
  // nothing is nearer than the ground, and zoomed right in that is a few kilometres away
  camera.near = Math.max(1e-5, (camera.position.length() - 1)*.5); camera.far = dist() + system() + 1; camera.updateProjectionMatrix();
  camera.updateMatrixWorld(); globes[body.id].userData.ground?.update(camera, perPixel());
  // the glow goes out as the close-up it marks fills the screen
  if (glow) { glow.visible = true; glow.userData.mat.opacity = .45*Math.min(1, Math.max(0, (dist() - 1.25)/.5)); }
  renderer.render(scene, camera);
  return true;
}

// Names on the surface, nearest-facing first, skipping any that would land on another. Jupiter's
// moons get a dot as well, for when they're too small to see, and the dot shows even with names off.
export function names(g, ms, where, w, h, named){
  labelled = [];
  if (!body) return;
  const cam = camera.position;
  g.font = '800 13px Nunito, system-ui, sans-serif'; g.textBaseline = 'middle'; g.lineJoin = 'round';
  for (const f of shown.userData.moons ? shown.userData.moons.children : []) {
    const p = new THREE.Vector3().setFromMatrixPosition(f.matrixWorld), s = p.clone().project(camera);
    const x = (s.x + 1)/2*w, y = (1 - s.y)/2*h, look = p.clone().sub(cam), along = -cam.dot(look.clone().normalize());
    // hidden if the line of sight passes through Jupiter on the way
    if (s.z > 1 || x < -20 || y < -20 || x > w + 20 || y > h + 20) continue;
    if (along > 0 && along < look.length() && cam.lengthSq() - along*along < 1) continue;
    const name = f.userData.moon.name, tw = g.measureText(name).width, box = [x - 10, y - 10, x + 14 + tw, y + 10];
    g.fillStyle = 'rgba(239,224,191,.9)'; g.beginPath(); g.arc(x, y, 2, 0, 7); g.fill();
    if (!named || labelled.some(o => box[0] < o.box[2] && box[2] > o.box[0] && box[1] < o.box[3] && box[3] > o.box[1])) continue;
    labelled.push({box, moon:f.userData.moon});
    g.lineWidth = 3; g.strokeStyle = 'rgba(5,4,10,.85)'; g.strokeText(name, x + 10, y);
    g.fillStyle = '#ffe9a8'; g.fillText(name, x + 10, y);
  }
  if (!body.places || !named) return;
  const ax = axes(body, ms - sight(body, ms, where).late*1000);
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
// what a tap lands on: {moon} for one of Jupiter's moons, {place} for a named place, else
// {body} for the world itself, else nothing
export function tapped(x, y, w, h){
  const hit = labelled.find(q => x >= q.box[0] - 6 && x <= q.box[2] + 6 && y >= q.box[1] - 6 && y <= q.box[3] + 6);
  if (hit) return hit.moon ? {moon:hit.moon} : {place:hit.place};
  const ray = new THREE.Raycaster(); ray.setFromCamera({x:x/w*2 - 1, y:1 - y/h*2}, camera);
  const first = ray.intersectObject(shown, true).find(i => !i.object.userData.ring);
  return !first ? null : first.object.userData.moon ? {moon:first.object.userData.moon} : {body};
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
  const at = place(b, ms, where), e = size/2/px, moons = shown.userData.moons;
  // drawn small, a world wears only its own map
  globes[b.id]?.userData.ground?.hide(); if (glow) glow.visible = false;
  Object.assign(flat, {left:-e, right:e, top:e, bottom:-e}); flat.updateProjectionMatrix();
  flat.position.copy(at.toUs).multiplyScalar(span + 5); flat.up.copy(at.up); flat.lookAt(0, 0, 0);
  // the star view draws the moons itself, where they are beside Jupiter
  if (moons) moons.visible = false;
  renderer.render(scene, flat);
  if (moons) moons.visible = true;
  const out = document.createElement('canvas'); out.width = out.height = size;
  out.getContext('2d').drawImage(canvas, 0, 0);
  cache.set(key, out);
  // the close-up resizes itself back on its next frame
  canvas.width = 0;
  return out;
}
