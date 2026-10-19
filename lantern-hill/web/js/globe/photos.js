// Real photos from the outside world, from two places a child can be sent: Wikipedia articles picked
// ahead of time (the game never searches Wikipedia, so it can't land somewhere unexpected), and
// iNaturalist's research-grade sightings of wild animals, each one checked by other naturalists.
// It all streams at play time, so none of it works offline; callers say so kindly.
//
//   const a = await article('Mount Fuji');     // {text, photo: {src, file}} or null
//   const credit = await photoCredit(a.photo); // 'Photo: Someone, CC BY-SA 4.0'
//   const animals = await seenNear(-2.5, 34.8); // [{name, group, photo, credit, count}, …]
//   const more = await pictures('Grand Canyon'); // [{small, src, file, caption}, …]

const kept = new Map();
// a Commons file's own name, from any picture of it: '…/commons/thumb/6/6f/Flag.svg/960px-Flag.svg.png' is 'Flag.svg'
const fileOf = src => { const m = src.match(/\/commons\/(?:thumb\/)?[0-9a-f]\/[0-9a-f]{2}\/([^/?]+)/); return m ? decodeURIComponent(m[1]) : null; };
// one fetch per key, kept for as long as the page lives; a failed one is forgotten so it can be tried again
const once = (key, f) => { if (!kept.has(key)) { const p = f(); kept.set(key, p); p.catch(() => kept.delete(key)); } return kept.get(key); };
const json = url => fetch(url).then(r => r.ok ? r.json() : Promise.reject(new Error(`${r.status} ${url}`)));

// the opening of an article, a sentence or two, and its lead photo; null if there's no such article
export function article(title){
  return once('a:' + title, async () => {
    const r = await fetch(`https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title.replace(/ /g, '_'))}`);
    if (r.status === 404) return null;
    if (!r.ok) throw new Error(`${r.status} ${title}`);
    const d = await r.json();
    if (d.type !== 'standard') return null;
    const sentences = (d.extract || '').match(/[^.!?]+[.!?]+(\s|$)/g) || [];
    const o = d.originalimage, t = d.thumbnail;
    // the thumbnail is too small for a card, and the original can be enormous. Wikimedia only makes
    // thumbnails at a few set widths, and 960 is the one that stays sharp on a phone.
    const photo = !o ? null : {src: o.width > 960 && t ? t.source.replace(/\/\d+px-/, '/960px-') : o.source, file: fileOf(o.source)};
    return {text: sentences.slice(0, 2).join('').trim(), photo};
  });
}

// The photos an article is illustrated with, with their captions: only photos, so no maps, charts,
// flags or logos. Only asked of articles about wonders and their sights, whose pictures are of the
// place itself.
const NOT_A_PHOTO = /map|diagram|chart|graph|logo|flag|locator|seal|coat_of_arms|icon|\.(svg|tiff?|gif|webm|ogv)$/i;
export function pictures(title){
  return once('p:' + title, async () => {
    const d = await json(`https://en.wikipedia.org/api/rest_v1/page/media-list/${encodeURIComponent(title.replace(/ /g, '_'))}`);
    return d.items.filter(i => i.type === 'image' && i.srcset && !NOT_A_PHOTO.test(i.title)).slice(0, 14).map(i => {
      // the list offers each photo at the sizes Wikimedia will make: a small one and a sharp one
      const url = k => 'https:' + i.srcset[k].src.replace(/^https?:/, '');
      return {small: url(0), src: url(i.srcset.length - 1), file: fileOf(url(0)), caption: (i.caption?.text || '').trim()};
    });
  });
}

// who took a Wikipedia photo, and the licence they shared it under, which their licence asks us to show
export function photoCredit(photo){
  if (!photo || !photo.file) return Promise.resolve('Photo: Wikipedia');
  return once('c:' + photo.file, async () => {
    const d = await json(`https://commons.wikimedia.org/w/api.php?action=query&format=json&origin=*&prop=imageinfo&iiprop=extmetadata&titles=${encodeURIComponent('File:' + photo.file)}`);
    const m = Object.values(d.query.pages)[0]?.imageinfo?.[0]?.extmetadata || {};
    const text = html => { const el = document.createElement('div'); el.innerHTML = html || ''; return el.textContent.replace(/\s+/g, ' ').trim(); };
    const who = text(m.Artist?.value).slice(0, 60), licence = text(m.LicenseShortName?.value);
    const by = [who, licence].filter(Boolean).join(', ');
    return by ? `Photo: ${by}, via Wikimedia Commons` : 'Photo: Wikimedia Commons';
  }).catch(() => 'Photo: Wikimedia Commons');
}

const GROUPS = {Mammalia: 'Mammal', Aves: 'Bird', Reptilia: 'Reptile', Amphibia: 'Amphibian', Actinopterygii: 'Fish'};

// The wild animals people have most often photographed near a spot, the commonest first. Birds
// outnumber everything on iNaturalist, so the list takes turns between kinds of animal.
export function seenNear(lat, lon){
  const key = `s:${lat.toFixed(1)},${lon.toFixed(1)}`;
  return once(key, async () => {
    const ask = radius => json(`https://api.inaturalist.org/v1/observations/species_counts?lat=${lat.toFixed(3)}&lng=${lon.toFixed(3)}&radius=${radius}`
      + `&quality_grade=research&photos=true&iconic_taxa=${Object.keys(GROUPS).join(',')}&per_page=60&locale=en`).then(d => d.results);
    let found = await ask(50);
    if (found.length < 8) found = await ask(300);
    const animals = found.filter(r => r.taxon.default_photo && !(r.taxon.default_photo.flags || []).length && GROUPS[r.taxon.iconic_taxon_name]).map(r => ({
      id: r.taxon.id, name: cap(r.taxon.preferred_common_name || r.taxon.name), sci: r.taxon.name, group: GROUPS[r.taxon.iconic_taxon_name], count: r.count,
      photo: r.taxon.default_photo.medium_url, credit: `Photo: ${r.taxon.default_photo.attribution}, via iNaturalist`}));
    return takeTurns(animals, 12);
  });
}
const cap = s => s[0].toUpperCase() + s.slice(1);
function takeTurns(animals, n){
  const by = new Map();
  for (const a of animals) (by.get(a.group) || by.set(a.group, []).get(a.group)).push(a);
  const out = [];
  while (out.length < n && [...by.values()].some(l => l.length)) for (const l of by.values()) if (l.length && out.length < n) out.push(l.shift());
  return out;
}

// Hoot's "which one doesn't live here?": three animals really seen here and one from far away that
// wasn't, in a random order
export function oddOneOut(here, far, rand = Math.random){
  const seen = new Set(here.map(a => a.id)), strangers = far.filter(a => !seen.has(a.id));
  if (here.length < 3 || !strangers.length) return null;
  const pick = (list, k) => { const l = [...list], out = []; while (out.length < k && l.length) out.push(l.splice(Math.floor(rand()*l.length), 1)[0]); return out; };
  const odd = pick(strangers.slice(0, 6), 1)[0], choices = [...pick(here.slice(0, 9), 3), odd];
  return {odd, choices: pick(choices, choices.length)};
}
