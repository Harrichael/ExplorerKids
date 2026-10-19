// The Moon and the planets as worlds: how big each is, which real map wraps it, which way its pole
// points and how far round it has spun, and what's worth a kid's tap on its surface.
//
//   const ax = axes(BODIES.mars, ms);        // Mars's own x (prime meridian), y and z (north pole)
//   underneath(ax, toEarth)                  // the {lat, lon} facing us, east longitude
//
// Spin comes from the IAU's rotation elements (Archinal et al. 2018), so the face a planet turns
// toward the treehouse tonight is the face it really turns. Maps run east from 180°W, as tools/sky_maps.py makes them.

import { LIGHT, galilean, geocentric, radec, siderealTime, toHorizon, topocentric } from './astro.js';

const R = Math.PI/180;

// d is days and T centuries since noon, 1 January 2000
function moonSpin(d, T){
  const E1 = (125.045 - .0529921*d)*R, E2 = (250.089 - .1059842*d)*R, E3 = (260.008 + 13.0120009*d)*R, E4 = (176.625 + 13.3407154*d)*R;
  return [269.9949 + .0031*T - 3.8787*Math.sin(E1) - .1204*Math.sin(E2) + .07*Math.sin(E3) - .0172*Math.sin(E4),
    66.5392 + .013*T + 1.5419*Math.cos(E1) + .0239*Math.cos(E2) - .0278*Math.cos(E3) + .0068*Math.cos(E4),
    38.3213 + 13.17635815*d + 3.561*Math.sin(E1) + .1208*Math.sin(E2) - .0642*Math.sin(E3) + .0158*Math.sin(E4)];
}
const steady = (ra, dec, w0, rate) => (d, T) => [ra, dec, w0 + rate*d];

export const BODIES = {
  moon: {id:'moon', name:'The Moon', km:1737.4, spin:moonSpin, map:'moon',
    credit:'Moon: NASA Lunar Reconnaissance Orbiter (LROC, Arizona State University), via CDS',
    facts:['Our nearest neighbour in space. It always keeps the same face toward us, so this is the face every person who ever lived has looked up at.',
      'Twelve astronauts have walked on it.'],
    places:[
      ['Sea of Tranquility', 8.5, 31.4, 'A wide plain of old, dark lava. The first people to visit the Moon landed at its edge.'],
      ['Apollo 11', .674, 23.473, 'Where Neil Armstrong and Buzz Aldrin took the first steps on the Moon, in July 1969.'],
      ['Apollo 17', 20.19, 30.77, 'The last time people walked on the Moon, in December 1972.'],
      ['Sea of Serenity', 28, 17.5, 'A round sea of lava inside a giant old crater.'],
      ['Sea of Rains', 32.8, -15.6, 'A huge crater, flooded with lava. You can see it with just your eyes.'],
      ['Sea of Crises', 17, 59.1, 'A dark oval sea near the Moon’s edge.'],
      ['Ocean of Storms', 18.4, -57.4, 'The biggest dark plain on the whole Moon.'],
      ['Sea of Clouds', -21.3, -16.6, 'A sea of lava. There’s no water on any of the Moon’s “seas”!'],
      ['Sea of Fertility', -7.8, 51.3, 'A long sea of lava on the Moon’s eastern side.'],
      ['Sea of Nectar', -15.2, 35.5, 'A small round sea of lava.'],
      ['Copernicus', 9.6, -20.1, 'A big crater with terraced walls and mountains in the middle.'],
      ['Tycho', -43.3, -11.4, 'A young crater. Bright rays from its splash reach across the Moon.'],
      ['Plato', 51.6, -9.4, 'A crater with a smooth, dark floor, like a pond.'],
      ['South Pole–Aitken Basin', -53, 169, 'One of the biggest craters anywhere in the solar system, on the side we never see from Earth.'],
      ['Chang’e 4', -45.44, 177.6, 'China’s Chang’e 4 landed here in 2019, the first visit to the Moon’s far side.']]},
  mercury: {id:'mercury', name:'Mercury', km:2439.4, spin:steady(281.0103, 61.4155, 329.5988, 6.1385108), map:'mercury',
    credit:'Mercury: NASA MESSENGER (MDIS), via CDS',
    facts:['The smallest planet and the closest to the Sun. A year there is only 88 days long.']},
  venus: {id:'venus', name:'Venus', km:6051.8, spin:steady(272.76, 67.16, 160.2, -1.4813688), map:'venus',
    credit:'Venus: NASA Magellan radar (colour shows height), via CDS',
    facts:['The hottest planet, wrapped in thick clouds. This map comes from Magellan’s radar, which saw right through them.',
      'Red is high ground and blue is low.']},
  mars: {id:'mars', name:'Mars', km:3389.5, spin:steady(317.269, 54.433, 176.049863, 350.891982443), map:'mars',
    credit:'Mars: NASA Viking (USGS MDIM 2.1), via CDS',
    facts:['The red planet. The red is rust in its dust!'],
    places:[
      ['Olympus Mons', 18.65, -133.8, 'The tallest volcano we know of, nearly three times as tall as Mount Everest.'],
      ['Valles Marineris', -13.9, -59.2, 'A canyon so long it would stretch across the United States.'],
      ['Tharsis volcanoes', 1.5, -113, 'Three giant volcanoes standing in a row.'],
      ['Hellas Basin', -42.4, 70.5, 'A giant crater, deep enough to swallow Mount Everest.'],
      ['Syrtis Major', 8.4, 69.5, 'A dark patch you can spot from Earth with a backyard telescope.'],
      ['Gale Crater', -5.4, 137.8, 'The rover Curiosity has been exploring here since 2012.'],
      ['Jezero Crater', 18.4, 77.5, 'An old lake bed. The rover Perseverance landed here in 2021.'],
      ['North polar cap', 85, 0, 'Ice at the top of Mars, water and frozen carbon dioxide.']]},
  jupiter: {id:'jupiter', name:'Jupiter', km:69911, flat:.06487, spin:steady(268.056595, 64.495303, 284.95, 870.536), map:'jupiter',
    credit:'Jupiter: NASA/JPL/Space Science Institute, Cassini (PIA07782), via CDS',
    facts:['The biggest planet. More than a thousand Earths could fit inside.', 'The Great Red Spot is a storm bigger than the whole Earth.']},
  saturn: {id:'saturn', name:'Saturn', km:58232, flat:.09796, spin:steady(40.589, 83.537, 38.9, 810.7939024), map:'saturn', rings:true,
    credit:'Saturn: Hubble OPAL 2025 and 2018 (NASA, ESA, A. Simon, CC BY 4.0) · Rings: Voyager 2 starlight through the rings (NASA PDS) and Cassini (PIA06193, NASA/JPL/SSI)',
    facts:['Its rings are billions of chunks of ice, some as small as sand and some as big as a house.', 'Saturn is so light it would float in a big enough bathtub.']},
  uranus: {id:'uranus', name:'Uranus', km:25362, flat:.02293, spin:steady(257.311, -15.175, 203.81, -501.1600928), map:'uranus',
    credit:'Uranus: Hubble OPAL 2025 and 2014 (NASA, ESA, A. Simon, CC BY 4.0) · South pole: Voyager 2 (PIA18182, NASA/JPL)',
    facts:['An ice giant tipped right over on its side, so it rolls around the Sun like a ball.']},
  neptune: {id:'neptune', name:'Neptune', km:24622, flat:.01708, spin:(d, T) => {
      const N = (357.85 + 52.316*T)*R;
      return [299.36 + .7*Math.sin(N), 43.46 - .51*Math.cos(N), 249.978 + 541.1397757*d - .48*Math.sin(N)];
    }, map:'neptune',
    credit:'Neptune: NASA Voyager 2, via CDS',
    facts:['The windiest planet, with winds faster than a jet plane.', 'The dark spot is a storm Voyager 2 flew past in 1989.']},
  // Jupiter's moons keep one face to Jupiter, so their spin comes from where they are, not from a rate
  io: {id:'io', name:'Io', km:1821.6, around:'jupiter', map:'io', credit:'Io: NASA Galileo (SSI), via CDS',
    facts:['The most volcanic world we know. Its volcanoes throw sulfur fountains hundreds of kilometres high.']},
  europa: {id:'europa', name:'Europa', km:1560.8, around:'jupiter', map:'europa', credit:'Europa: NASA Voyager and Galileo (SSI), via CDS',
    facts:['Under its cracked shell of ice is a deep, salty ocean, with more water than all of Earth’s oceans.']},
  ganymede: {id:'ganymede', name:'Ganymede', km:2634.1, around:'jupiter', map:'ganymede', credit:'Ganymede: NASA Voyager and Galileo (SSI), via CDS',
    facts:['The biggest moon in the solar system, bigger than the planet Mercury.']},
  callisto: {id:'callisto', name:'Callisto', km:2410.3, around:'jupiter', map:'callisto', credit:'Callisto: NASA Voyager and Galileo (SSI), via CDS',
    facts:['One of the most cratered places anywhere. Its face has hardly changed in four billion years.']}
};
export const PLANETS = ['mercury', 'venus', 'mars', 'jupiter', 'saturn', 'uranus', 'neptune'].map(id => BODIES[id]);
export const MOONS = ['io', 'europa', 'ganymede', 'callisto'].map(id => BODIES[id]);
BODIES.jupiter.moons = MOONS;
for (const m of MOONS) m.facts.push('Galileo spotted Jupiter’s four big moons through his own small telescope in 1610.');
// a world's radius at its equator, which is the globe's radius in the close-up
export const equatorial = b => b.km/(1 - (b.flat || 0)/3);

// Saturn's rings, in km from its centre; the same span tools/sky_maps.py samples them over
export const RINGS = {inner:74000, outer:140500};

// the body's own axes, as directions among the stars: x through longitude 0 on its equator, y through 90°E, z its north pole
export function axes(body, ms){
  if (body.around) {
    // longitude 0 is the point that faces Jupiter
    const z = axes(BODIES[body.around], ms).z, p = aroundJupiter(body, ms), x = unit(along(p.map(v => -v), z));
    return {x, y:cross(z, x), z};
  }
  const d = ms/86400000 - 10957.5, [ra, dec, w] = body.spin(d, d/36525).map(v => v*R);
  const z = [Math.cos(dec)*Math.cos(ra), Math.cos(dec)*Math.sin(ra), Math.sin(dec)];
  const node = [-Math.sin(ra), Math.cos(ra), 0], ahead = cross(z, node);
  const x = node.map((n, i) => n*Math.cos(w) + ahead[i]*Math.sin(w));
  return {x, y:cross(z, x), z};
}
export function underneath(ax, dir){
  const n = Math.hypot(...dir), [x, y, z] = ['x', 'y', 'z'].map(k => dot(ax[k], dir)/n);
  return {lat:Math.asin(z)/R, lon:Math.atan2(y, x)/R};
}
export function surface(ax, lat, lon){
  const c = Math.cos(lat*R), p = [c*Math.cos(lon*R), c*Math.sin(lon*R), Math.sin(lat*R)];
  return [0, 1, 2].map(i => ax.x[i]*p[0] + ax.y[i]*p[1] + ax.z[i]*p[2]);
}
const cross = (a, b) => [a[1]*b[2] - a[2]*b[1], a[2]*b[0] - a[0]*b[2], a[0]*b[1] - a[1]*b[0]];
const dot = (a, b) => a[0]*b[0] + a[1]*b[1] + a[2]*b[2];
const unit = a => { const n = Math.hypot(...a); return a.map(x => x/n); };
// a with the part along the unit direction n taken out
const along = (a, n) => { const k = dot(a, n); return a.map((x, i) => x - k*n[i]); };

// where one of Jupiter's moons is, in km from Jupiter's centre, as the Earth sees it now
export function aroundJupiter(moon, ms){
  const m = galilean(ms)[MOONS.indexOf(moon)], jupiter = geocentric('jupiter', ms), z = axes(BODIES.jupiter, ms).z;
  // straight in front of Jupiter, toward the Earth, along Jupiter's equator; the moons go round anticlockwise from above
  const front = unit(along(jupiter.map(v => -v), z)), ahead = cross(z, front), k = m.r*equatorial(BODIES.jupiter), u = m.u*R;
  return front.map((f, i) => k*(f*Math.cos(u) + ahead[i]*Math.sin(u)));
}

// how a body looks from a spot on the Earth: where it stands in the sky, how far, how big, how much
// of the face we see is sunlit, and how far from the Sun it seems (planets close to it are lost in its glare)
const ECLIPTIC_POLE = [0, -Math.sin(23.43928*R), Math.cos(23.43928*R)];
export function sight(body, ms, place){
  const lst = siderealTime(ms, place.lon), sun = geocentric('sun', ms);
  const off = body.around && aroundJupiter(body, ms);
  let v = off ? geocentric(body.around, ms).map((x, i) => x + off[i]) : geocentric(body.id, ms);
  if (body.id === 'moon') v = topocentric(v, place.lat, lst);
  const at = radec(v), km = Math.hypot(...v), toSun = sun.map((s, i) => s - v[i]);
  return {v, sun, ...at, ...toHorizon(at.ra, at.dec, place.lat, lst), km, late:km/LIGHT,
    radius:Math.asin(body.km/km)/R, lit:(1 + Math.cos(angle(toSun, v.map(x => -x))))/2,
    fromSun:angle(sun, v)/R, waxing:dot(cross(sun, v), ECLIPTIC_POLE) > 0};
}
const angle = (a, b) => Math.acos(Math.max(-1, Math.min(1, dot(a, b)/Math.hypot(...a)/Math.hypot(...b))));
