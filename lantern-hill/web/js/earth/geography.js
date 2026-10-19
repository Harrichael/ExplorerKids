// What people call places on the Earth, beside model.js's what grows there: countries and their
// borders, rivers, and the named mountains, deserts, seas, peaks and capitals. From
// data/geography.json (built by tools/earth/build.mjs). Places carry `min`, the web-map zoom their
// name first shows at, and `wiki`, the Wikipedia article their pictures come from.
//
//   const geo = await loadGeography();
//   geo.countryAt(48.86, 2.35)      // {name: 'France', continent: 'Europe', capital: 'Paris', …}
//   geo.places.filter(p => p.kind === 'desert')

import { inRing, withBox } from './model.js';

let loading = null;
export function loadGeography(){
  if (!loading) {
    loading = fetch('data/geography.json').then(r => r.ok ? r.json() : Promise.reject(new Error(`geography.json: ${r.status}`))).then(makeGeography);
    loading.catch(() => { loading = null; });
  }
  return loading;
}

export function makeGeography(d){
  const deg = r => withBox(Float64Array.from(r, v => v/100));
  const countries = d.countries.map(c => ({...c, rings: c.rings.map(deg)}));
  const countryAt = (lat, lon) => countries.find(c => c.rings.reduce((inside, r) => inRing(r, lon, lat) ? !inside : inside, false)) || null;
  return {countries, countryAt, places: d.places, borders: d.borders.map(deg), rivers: d.rivers.map(r => ({...r, lines: r.lines.map(deg)})), credits: d.credits};
}
