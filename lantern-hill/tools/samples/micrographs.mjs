// Fetches real photos of each microscope sample from Wikimedia Commons into web/micrographs/, with
// web/micrographs/micrographs.json listing, per sample, each photo's file, what took it, how wide the
// whole picture is in real life, and its photographer and licence.
//
//   node tools/samples/micrographs.mjs           (from lantern-hill/; fetches only what's missing)
//   node tools/samples/micrographs.mjs foram     (fetches that sample's photos again)
//
// Photos are picked by hand: taken down a microscope or an electron microscope wherever Commons has
// one, and a close-up with a scale only where it doesn't. `across` is the real width of the whole
// picture in millimetres, so the microscope can draw a scale bar that stays true as you zoom. Commons
// has no field for it; each is read off the file's stated field of view, a scale bar in the picture,
// or the known size of what's pictured, in that order of trust.
//
// Needs ImageMagick.

import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, rmSync, unlinkSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const OUT = join(dirname(fileURLToPath(import.meta.url)), '../../web/micrographs');
const LONG = 1800;   // the long side; enough to zoom a few times into a big lens before it softens
const UA = 'ExplorerKids/1.0 (https://github.com/Harrichael/ExplorerKids)';
const M = 'Microscope', EM = 'Electron microscope', C = 'Close-up';

// sample id → [Commons file, how it was taken, real width of the picture in mm]
const SOURCE = {
  ash: [
    ['Micrograph of Rockland Ash.jpg', EM, 0.4],
    ['SarnaSem 60-010 large.jpg', EM, 0.15],
    ['Volcanic dust Mount Soufriere YORYM-TA0019.jpg', M, 2],
  ],
  sulfur: [
    ['Microscopic image of crystals growing from melted sulfur 2.jpg', M, 2],
    ['Microscopic image of crystals growing from melted sulfur 3.jpg', M, 2],
    ['Microscopic image of crystals growing from melted sulfur.jpg', M, 2],
  ],
  olivine: [
    ['Olivine in polarizing light.jpg', M, 4],
    ['Xenolith Thin Section.jpg', M, 8],
    ['Dunite in thin section.jpg', M, 6],
  ],
  foram: [
    ['Foram-globigerina hg.jpg', EM, 0.6],
    ['Planktic Foraminifera of the northern Gulf of Mexico.jpg', M, 1.5],
    ['Starsand from Japan.jpg', M, 4],
  ],
  radiolarian: [
    ['Radiolarian - Dorataspida sp.jpg', M, 0.35],
    ['Radiolaria - Dictyoprora (Sethamphora) mongolfieri - 400x (46419193611).jpg', M, 0.25],
    ['Calocyclas sp - Radiolaria - Magnification 400x (50637072613).jpg', M, 0.25],
    ['Radiolarian - Lampromitra sp. (38359221331).jpg', M, 0.25],
  ],
  diatom: [
    ['Diatoms through the microscope.jpg', M, 0.4],
    ['Coscinodiscus oculus-iridis (Ehrenberg) Ehrenberg 1840 diatom shell. Colored SEM image.jpg', EM, 0.04],
    ['CSIRO ScienceImage 7632 SEM diatom.jpg', EM, 0.06],
    ['CSIRO ScienceImage 8289 SEM diatom.jpg', EM, 0.08],
  ],
  microbes: [
    ['Beggiatoa leptomitoformis in Phase contrasto microscopy 1000x.jpg', M, 0.15],
    ['Bacterial mat.jpg', C, 200],
  ],
  crinoid: [
    ['BMR Mml 108-5 50x a ppl 01.jpg', M, 2.4],
    ['R2614 PPL PKSTST inntra crinoid 20x.jpg', M, 6],
  ],
  nummulite: [
    ['ETH-BIB-Nummuliten-Breccie, Fly bei Weesen, Schliff L. W. 3-Dia 247-02324.tif', M, 25],
    ['Nummulite Naturhistorisches Museum Basel 27102013.jpg', C, 35],
    ['Nummulitids.jpg', C, 114],
  ],
  trilobite: [
    ['Itagnostus interstrictus (White, 1874) - 8 mm 1.JPG', C, 16],
    ['Peronopsis interstrictus 34.JPG', C, 100],
  ],
  snowalgae: [
    ['Chloromonas miwae cyst 1E.png', M, 0.025],
    ['Green algal.jpg', EM, 0.03],
  ],
  daphnia: [
    ['Kiivrik (Daphnia).jpg', M, 3],
    ['Daphnia with eggs.jpg', M, 3.5],
    ['Vesikirbu (Daphnia) mikroskoopiline portree.jpg', M, 1.5],
  ],
  spirogyra: [
    ['The freshwater alga Spirogyra.jpg', M, 0.5],
    ['Spirogyra im Duchlichtmikroskop.jpg', M, 0.48],
  ],
  rotifer: [
    ['The Rotifer Notholca sp.jpg', M, 0.4],
    ['Mikrofoto.de-Raedertier-14.jpg', M, 0.5],
    ['Philodina sp. (Classː Bdelloidea) - Rotifera.jpg', M, 0.8],
  ],
  tardigrade: [
    ['SEM image of Milnesium tardigradum in active state - journal.pone.0045682.g001-2.png', EM, 0.8],
    ['Tardígrado género Milnesium.jpg', M, 1.6],
  ],
  limu: [
    ["Limu o Pele Hawaii.jpg", C, 100],
  ],
  urchin: [
    ['MenuhaEchinoidSpine.jpg', M, 0.62],
    ['Echinoid Spines Picture -1 for IS.jpg', C, 21],
  ],
  copepod: [
    ['Freshwater copepod (Copepoda) under darkfield microscopy.jpg', M, 1.5],
    ['Adult Male harpacticoid copepod Tigriopus brevicornis.jpg', M, 1.7],
    ['Hormikuline (Calanoida).jpg', M, 3],
  ],
  coralline: [
    ['Maerl - Sediment from Tromsø, Norway - thin section.jpg', M, 25],
    ['Lithophyllum underside.jpg', EM, 0.43],
  ],
};

const get = async url => {
  for (let i = 0; ; i++) {
    const r = await fetch(url, {headers: {'User-Agent': UA}});
    if (r.ok) return r;
    if (r.status !== 429 || i > 4) throw new Error(`${r.status} ${url}`);
    await new Promise(ok => setTimeout(ok, 2000*(i + 1)));
  }
};
const json = async url => (await get(url)).json();
const plain = html => (html || '').replace(/<[^>]*>/g, '').replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#0?39;/g, "'").replace(/\s+/g, ' ').trim();

async function fetchPhoto(name, file){
  const q = await json(`https://commons.wikimedia.org/w/api.php?action=query&format=json&prop=imageinfo&iiprop=url|size|extmetadata&iiurlwidth=${LONG}&titles=${encodeURIComponent('File:' + file)}`);
  const info = Object.values(q.query.pages)[0].imageinfo[0], m = info.extmetadata;
  // a small original has no bigger thumbnail; Commons hands back the original itself
  const src = info.width > LONG || info.height > LONG || /\.tiff?$/i.test(file) ? info.thumburl : info.url, tmp = join(OUT, '.download');
  writeFileSync(tmp, Buffer.from(await (await get(src)).arrayBuffer()));
  execFileSync('convert', [tmp + '[0]', '-resize', `${LONG}x${LONG}>`, '-strip', '-quality', '82', join(OUT, name)]);
  unlinkSync(tmp);
  const [w, h] = execFileSync('identify', ['-format', '%w %h', join(OUT, name)], {encoding: 'utf8'}).split(' ').map(Number);
  return {file: name, w, h, by: plain(m.Artist && m.Artist.value) || 'Unknown', license: plain(m.LicenseShortName && m.LicenseShortName.value), page: info.descriptionurl};
}

mkdirSync(OUT, {recursive: true});
const manifest = existsSync(join(OUT, 'micrographs.json')) ? JSON.parse(readFileSync(join(OUT, 'micrographs.json'), 'utf8')) : {};
const again = new Set(process.argv.slice(2));
const next = {}, failed = [];
for (const [id, list] of Object.entries(SOURCE)) {
  next[id] = [];
  for (const [i, [file, kind, across]] of list.entries()) {
    const name = `${id}-${i + 1}.jpg`, had = (manifest[id] || []).find(p => p.source === file);
    try {
      const p = had && !again.has(id) && existsSync(join(OUT, had.file)) && had.file === name ? had : {...await fetchPhoto(name, file), source: file};
      next[id].push({...p, kind, across}); console.log('✓', name);
    } catch (e) { failed.push(name); console.log('✗', name, e.message); }
  }
}
// photos no longer listed go, so the folder holds just what the game shows
const keep = new Set(Object.values(next).flat().map(p => p.file).concat('micrographs.json'));
for (const f of execFileSync('ls', [OUT], {encoding: 'utf8'}).split('\n').filter(Boolean)) if (!keep.has(f)) rmSync(join(OUT, f));
writeFileSync(join(OUT, 'micrographs.json'), JSON.stringify(next, null, 1) + '\n');
console.log(`${Object.values(next).flat().length} photos, ${failed.length} missing${failed.length ? ': ' + failed.join(', ') : ''}`);
