// Where things are in a watcher's sky: how far the Earth has turned (sidereal time), where the Sun,
// the Moon and the planets are, and the sums between a star's fixed place among the stars (right ascension and declination)
// and where it stands in someone's sky (altitude above the horizon, azimuth round from north
// through east). Angles in degrees, times in milliseconds since 1970, as Date.now() gives them.
//
//   const lst = siderealTime(Date.now(), 2.35);        // Paris
//   toHorizon(101.29, -16.72, 48.86, lst)              // Sirius: {alt, az}
//
// Star positions are J2000 and no precession is applied, so the horizon sits up to half a degree
// off by the 2020s; nothing a kid with a toy telescope will see.

const R = Math.PI/180;
const days = ms => ms/86400000 - 10957.5;   // since noon, 1 January 2000
const wrap = d => (d % 360 + 360) % 360;

export function siderealTime(ms, lon){ return wrap(280.46061837 + 360.98564736629*days(ms) + lon); }

export function toHorizon(ra, dec, lat, lst){
  const h = (lst - ra)*R, d = dec*R, p = lat*R;
  const alt = Math.asin(Math.sin(p)*Math.sin(d) + Math.cos(p)*Math.cos(d)*Math.cos(h));
  const az = Math.atan2(-Math.cos(d)*Math.sin(h), Math.sin(d)*Math.cos(p) - Math.cos(d)*Math.sin(p)*Math.cos(h));
  return {alt: alt/R, az: wrap(az/R)};
}
export function toSky(alt, az, lat, lst){
  const a = alt*R, z = az*R, p = lat*R;
  const dec = Math.asin(Math.sin(p)*Math.sin(a) + Math.cos(p)*Math.cos(a)*Math.cos(z));
  const h = Math.atan2(-Math.sin(z)*Math.cos(a), Math.cos(p)*Math.sin(a) - Math.sin(p)*Math.cos(a)*Math.cos(z));
  return {ra: wrap(lst - h/R), dec: dec/R};
}
// how far the way up to the zenith turns from the way to the celestial north pole, at a spot in the sky
export function parallactic(ra, dec, lat, lst){
  const h = (lst - ra)*R, d = dec*R, p = lat*R;
  return Math.atan2(Math.sin(h), Math.tan(p)*Math.cos(d) - Math.sin(d)*Math.cos(h))/R;
}

// the Sun to a few hundredths of a degree, plenty to tell day from night
export function sun(ms){
  const n = days(ms), g = (357.528 + .9856003*n)*R;
  const l = (280.460 + .9856474*n + 1.915*Math.sin(g) + .020*Math.sin(2*g))*R, e = (23.439 - .0000004*n)*R;
  return {ra: wrap(Math.atan2(Math.cos(e)*Math.sin(l), Math.cos(l))/R), dec: Math.asin(Math.sin(e)*Math.sin(l))/R};
}
export function sunAltitude(ms, lat, lon){ const s = sun(ms); return toHorizon(s.ra, s.dec, lat, siderealTime(ms, lon)).alt; }

// ---------- the Moon and the planets ----------
// Positions are vectors in km from the Earth's centre, along the same axes as the stars' RA and Dec.
export const AU = 149597870.7, LIGHT = 299792.458;   // km, and km a second
const OBLIQUITY = 23.43928*R;
const centuries = ms => days(ms)/36525;
const equatorial = ([x, y, z]) => [x, y*Math.cos(OBLIQUITY) - z*Math.sin(OBLIQUITY), y*Math.sin(OBLIQUITY) + z*Math.cos(OBLIQUITY)];
export const radec = ([x, y, z]) => ({ra: wrap(Math.atan2(y, x)/R), dec: Math.atan2(z, Math.hypot(x, y))/R});

// JPL's orbits for the years 1800 to 2050 (Standish): size (AU), stretch, tilt, mean longitude,
// longitude of the nearest point to the Sun, longitude of the rising node; then each one's drift a century
const ORBIT = {
  mercury: [.38709927, .20563593, 7.00497902, 252.2503235, 77.45779628, 48.33076593, .00000037, .00001906, -.00594749, 149472.67411175, .16047689, -.12534081],
  venus: [.72333566, .00677672, 3.39467605, 181.9790995, 131.60246718, 76.67984255, .0000039, -.00004107, -.0007889, 58517.81538729, .00268329, -.27769418],
  earth: [1.00000261, .01671123, -.00001531, 100.46457166, 102.93768193, 0, .00000562, -.00004392, -.01294668, 35999.37244981, .32327364, 0],
  mars: [1.52371034, .0933941, 1.84969142, -4.55343205, -23.94362959, 49.55953891, .00001847, .00007882, -.00813131, 19140.30268499, .44441088, -.29257343],
  jupiter: [5.202887, .04838624, 1.30439695, 34.39644051, 14.72847983, 100.47390909, -.00011607, -.00013253, -.00183714, 3034.74612775, .21252668, .20469106],
  saturn: [9.53667594, .05386179, 2.48599187, 49.95424423, 92.59887831, 113.66242448, -.0012506, -.00050991, .00193609, 1222.49362201, -.41897216, -.28867794],
  uranus: [19.18916464, .04725744, .77263783, 313.23810451, 170.9542763, 74.01692503, -.00196176, -.00004397, -.00242939, 428.48202785, .40805281, .04240589],
  neptune: [30.06992276, .00859048, 1.77004347, -55.12002969, 44.96476227, 131.78422574, .00026291, .00005105, .00035372, 218.45945325, -.32241464, -.01683669]
};
function aroundSun(id, T){
  const o = ORBIT[id], [a, e, I, L, P, N] = o.slice(0, 6).map((v, i) => v + o[i + 6]*T);
  const M = (L - P)*R, w = (P - N)*R, n = N*R, i = I*R;
  let E = M + e*Math.sin(M);
  for (let k = 0; k < 6; k++) E -= (E - e*Math.sin(E) - M)/(1 - e*Math.cos(E));
  const x = a*(Math.cos(E) - e), y = a*Math.sqrt(1 - e*e)*Math.sin(E);
  const cw = Math.cos(w), sw = Math.sin(w), cn = Math.cos(n), sn = Math.sin(n), ci = Math.cos(i), si = Math.sin(i);
  return [(cw*cn - sw*sn*ci)*x - (sw*cn + cw*sn*ci)*y, (cw*sn + sw*cn*ci)*x + (cw*cn*ci - sw*sn)*y, sw*si*x + cw*si*y].map(v => v*AU);
}
// the Moon to a few tenths of a degree (the Astronomical Almanac's short series)
function moonAround(T){
  const s = (a, b) => Math.sin((a + b*T)*R), c = (a, b) => Math.cos((a + b*T)*R);
  // the series counts longitude from today's equinox; 1.397° a century takes it back to 2000's, which the stars use
  const lon = (218.32 + 481267.881*T + 6.29*s(135, 477198.87) - 1.27*s(259.3, -413335.36) + .66*s(235.7, 890534.22)
    + .21*s(269.9, 954397.74) - .19*s(357.5, 35999.05) - .11*s(186.5, 966404.03) - 1.397*T)*R;
  const lat = (5.13*s(93.3, 483202.03) + .28*s(228.2, 960400.87) - .28*s(318.3, 6003.18) - .17*s(217.6, -407332.2))*R;
  const parallax = .9508 + .0518*c(135, 477198.87) + .0095*c(259.3, -413335.38) + .0078*c(235.7, 890534.23) + .0028*c(269.9, 954397.7);
  const km = 6378.14/Math.sin(parallax*R);
  return [km*Math.cos(lat)*Math.cos(lon), km*Math.cos(lat)*Math.sin(lon), km*Math.sin(lat)];
}
// where 'sun', 'moon' or a planet is seen from the Earth's centre; a planet is seen where it was when
// its light set off, minutes to hours ago
export function geocentric(id, ms){
  const T = centuries(ms);
  if (id === 'moon') return equatorial(moonAround(T));
  const earth = aroundSun('earth', T);
  if (id === 'sun') return equatorial(earth.map(v => -v));
  let p = aroundSun(id, T);
  for (let k = 0; k < 2; k++) {
    const late = Math.hypot(...p.map((v, i) => v - earth[i]))/LIGHT;
    p = aroundSun(id, T - late/86400/36525);
  }
  return equatorial(p.map((v, i) => v - earth[i]));
}
// The Moon is close enough that where you stand on the Earth moves it against the stars by up to a
// degree, two Moons wide; the planets are far enough not to care
export function topocentric(v, lat, lst){
  const p = lat*R, t = lst*R, me = [Math.cos(p)*Math.cos(t), Math.cos(p)*Math.sin(t), Math.sin(p)].map(x => x*6378.14);
  return v.map((x, i) => x - me[i]);
}

// Jupiter's four big moons (Meeus, Astronomical Algorithms ch. 44, the shorter method). For each, u
// is how far round its orbit it has gone, counted from straight in front of Jupiter as the Earth sees
// it, and r its distance from Jupiter's centre in Jupiter's equatorial radii.
export function galilean(ms){
  const d = days(ms), s = x => Math.sin(x*R), c = x => Math.cos(x*R);
  const V = 172.74 + .00111588*d, M = 357.529 + .9856003*d;
  const N = 20.02 + .0830853*d + .329*s(V), J = 66.115 + .9025179*d - .329*s(V);
  const A = 1.915*s(M) + .02*s(2*M), B = 5.555*s(N) + .168*s(2*N), K = J + A - B;
  const sunEarth = 1.00014 - .01671*c(M) - .00014*c(2*M), sunJupiter = 5.20872 - .25208*c(N) - .00611*c(2*N);
  const away = Math.sqrt(sunJupiter**2 + sunEarth**2 - 2*sunJupiter*sunEarth*c(K)), psi = Math.asin(sunEarth/away*s(K))/R;
  // seen as they were when the light left, the better part of an hour ago
  const t = d - away/173;
  const u = [163.8069 + 203.4058646*t, 358.414 + 101.2916335*t, 5.7176 + 50.234518*t, 224.8092 + 21.48798*t].map(x => x + psi - B);
  const G = 331.18 + 50.310482*t, H = 87.45 + 21.569231*t;
  return [
    {u:u[0] + .473*s(2*(u[0] - u[1])), r:5.9057 - .0244*c(2*(u[0] - u[1]))},
    {u:u[1] + 1.065*s(2*(u[1] - u[2])), r:9.3966 - .0882*c(2*(u[1] - u[2]))},
    {u:u[2] + .165*s(G), r:14.9883 - .0216*c(G)},
    {u:u[3] + .843*s(H), r:26.3627 - .1939*c(H)}];
}
