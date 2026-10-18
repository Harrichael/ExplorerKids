// Where things are in a watcher's sky: how far the Earth has turned (sidereal time), where the Sun
// is, and the sums between a star's fixed place among the stars (right ascension and declination)
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
