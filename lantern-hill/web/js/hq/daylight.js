// Day and night at Lantern Hill follow the real Sun over the hill's spot in Utah (sky/observer.js):
// play after school and it's afternoon on the hill, play at bedtime and the stars are out. The dusk
// the hill was first painted in is the twilight between them.
//
// Each area lights its own things by these weights, which always add up to 1. tint() mixes a
// colour for each.

import * as THREE from 'three';
import { clamp01 } from '../core/kit.js';
import { siderealTime, sun, toHorizon } from '../sky/astro.js';
import { HOME } from '../sky/observer.js';
import { hemi, hqAnims, scene, sun as sunLight } from './scene.js';

// toward: which way the Sun is, flat along the ground, in the hill's east (+x) and south (+z)
export const daylight = {alt:-5, az:270, day:0, dusk:1, night:0, toward:new THREE.Vector3(-1, 0, 0)};
// where the garden's key light shines from, relative to the player; it swings round with the Sun
export const sunFrom = new THREE.Vector3(-9, 16, 7);

const smooth = (a, b, x) => { const t = clamp01((x - a)/(b - a)); return t*t*(3 - 2*t); };
const parts = new THREE.Color();
export function tint(out, day, dusk, night){
  out.setHex(day).multiplyScalar(daylight.day);
  out.add(parts.setHex(dusk).multiplyScalar(daylight.dusk));
  return out.add(parts.setHex(night).multiplyScalar(daylight.night));
}
export const weigh = (day, dusk, night) => day*daylight.day + dusk*daylight.dusk + night*daylight.night;

function look(ms){
  const s = sun(ms), h = toHorizon(s.ra, s.dec, HOME.lat, siderealTime(ms, HOME.lon));
  daylight.alt = h.alt; daylight.az = h.az;
  daylight.day = smooth(-3, 10, h.alt);
  daylight.night = 1 - smooth(-16, -6, h.alt);
  daylight.dusk = 1 - daylight.day - daylight.night;
  const a = h.az*Math.PI/180;
  daylight.toward.set(Math.sin(a), 0, -Math.cos(a));
  sunFrom.set(daylight.toward.x*11.4, 16, daylight.toward.z*11.4);
}
look(Date.now());

let since = 0;
hqAnims.push(dt => {
  if ((since += dt) > 1) { since = 0; look(Date.now()); }
  tint(scene.fog.color, 0xa9cde6, 0x2a2240, 0x110f20); scene.background.copy(scene.fog.color);
  tint(hemi.color, 0xb4cbe8, 0xa597d0, 0x4a4f86); tint(hemi.groundColor, 0x5a4a30, 0x4a3626, 0x201822);
  hemi.intensity = weigh(.5, .62, .42);
  tint(sunLight.color, 0xffeccc, 0xffb47c, 0x9aaee8); sunLight.intensity = weigh(.8, .72, .3);
});
