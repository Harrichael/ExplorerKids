// Fetches a photo of everyone in the globe's food webs from Wikimedia Commons into web/wildlife/,
// with web/wildlife/photos.json naming each one's file, photographer and licence.
//
//   node tools/earth/photos.mjs           (from lantern-hill/; fetches only what's missing)
//   node tools/earth/photos.mjs Jaguar    (fetches that one again, after changing its SOURCE)
//
// A photo is found by a species' name, or by 'web/name' where the same name means a different animal
// in that web (a badger in Germany is not a badger on the Great Plains). SOURCE says where to look: a
// Wikipedia article, whose lead image is used, or a Commons file by name; anything not listed tries
// the article named after the species. Only files on Commons are taken, since everything there is free
// to use; their licences ask for credit, which the globe shows under each photo.
//
// Needs macOS, for sips.

import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, unlinkSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { WEBS } from '../../web/js/earth/biomes.js';

const OUT = join(dirname(fileURLToPath(import.meta.url)), '../../web/wildlife');
const WIDTH = 640;
const UA = 'ExplorerKids/1.0 (https://github.com/Harrichael/ExplorerKids)';

const SOURCE = {
  'Leaves': 'Leaf', 'Fruits & nuts': 'File:Brazil nut DSC05477.JPG', 'Insects': 'File:Colorful Katydid (Tettigoniidae) (15874932421).jpg', 'Sloth': 'Brown-throated sloth', 'Peccary': 'Collared peccary',
  'Agouti': 'Red-rumped agouti', 'Toucan': 'Toco toucan',
  'Wild fruit': 'File:Kcg-Bwan (Landolphia Owariensis).jpg', 'Gorilla': 'Western lowland gorilla', 'Forest elephant': 'African forest elephant', 'Bongo': 'Bongo (antelope)',
  'Colobus monkey': 'Mantled guereza', 'Crowned eagle': 'Crowned eagle',
  'Figs & fruit': 'File:Ficus racemosa - Flickr - Dick Culbert.jpg', 'Orangutan': 'Bornean orangutan', 'Bearded pig': 'Bornean bearded pig', 'Hornbill': 'Rhinoceros hornbill',
  'Fruit bat': 'Megabat', 'Tree frog': "Wallace's flying frog",
  'Grass': 'File:Close up of grass.jpg', 'Leaves & fruit': 'File:Sal tree.jpg', 'Grasshoppers & termites': 'Grasshopper', 'Chital deer': 'Chital',
  'Langur monkey': 'Gray langur', 'Peacock': 'Indian peafowl', 'Tiger': 'Bengal tiger',
  'Leaves & plants': 'Rhododendron maximum', 'Acorns & nuts': 'Acorn', 'Caterpillars': 'Caterpillar', 'Gray squirrel': 'Eastern gray squirrel',
  'Songbirds': 'Northern cardinal', 'Black bear': 'American black bear', 'Rat snake': 'Pantherophis alleghaniensis',
  'Leaves & grass': 'Meadow', 'Beechnuts & acorns': 'File:Zaaddozen van een beuk (Fagus sylvatica) 13-09-2024 (d.j.b.).jpg', 'Earthworms': 'Earthworm', 'Red squirrel': 'Red squirrel',
  'canada-taiga/Red squirrel': 'American red squirrel', 'Badger': 'European badger', 'great-plains/Badger': 'American badger',
  'Goshawk': 'Eurasian goshawk',
  'Fir & spruce trees': 'File:Pseudotsuga menziesii seed cones.jpg', 'Berries & shrubs': 'Salmonberry', 'Salmon': 'Sockeye salmon',
  'Spruce & pine': 'Picea glauca', 'Willows & berries': 'File:Vaccinium myrtilloides berries.jpg', 'Budworm caterpillars': 'Choristoneura fumiferana',
  'Vole': 'Vole', 'Warblers': 'Yellow warbler', 'Lynx': 'Eurasian lynx', 'canada-taiga/Lynx': 'Canada lynx',
  'Larch & pine': 'Larch', 'Shrubs & berries': 'Lingonberry', 'Capercaillie': 'Western capercaillie',
  'Acacia trees': 'Vachellia tortilis', 'Grasshoppers': 'Grasshopper', 'Zebra': 'Plains zebra', 'Wildebeest': 'Blue wildebeest',
  'Gazelle': "Thomson's gazelle", 'Elephant': 'African bush elephant', 'Roller bird': 'Lilac-breasted roller', 'Hyena': 'Spotted hyena',
  'Crocodile': 'Nile crocodile',
  'Eucalyptus trees': 'Eucalyptus', 'Termites': 'Termite', 'Wallaby': 'Agile wallaby', 'Cockatoo': 'Sulphur-crested cockatoo',
  'Flying fox': 'Black flying fox', 'Echidna': 'Short-beaked echidna', 'Frilled lizard': 'Frill-necked lizard',
  'Kookaburra': 'Blue-winged kookaburra',
  'Wildflowers & seeds': 'Wildflower', 'Bison': 'American bison', 'Prairie dog': 'Black-tailed prairie dog', 'Mouse': 'Western harvest mouse',
  'Meadowlark': 'Western meadowlark', 'Rattlesnake': 'Western diamondback rattlesnake', 'great-plains/Rattlesnake': 'File:Crotalus viridis 151463461.jpg',
  'Herbs & shrubs': 'Artemisia frigida', 'Marmot': 'Tarbagan marmot', 'tibet/Marmot': 'Himalayan marmot', 'Pika': "Pallas's pika",
  'tibet/Pika': 'Plateau pika', 'Lark': 'Mongolian lark',
  'Water plants': 'Aquatic plant', 'Palm nuts': 'File:Acrocomia totai fruits.jpeg', 'Apple snails': 'Pomacea', 'Small fish': 'File:Astyanax mexicanus.JPG',
  'Piranha': 'Red-bellied piranha', 'Jabiru stork': 'Jabiru', 'Caiman': 'Yacare caiman',
  'Grass & sedges': 'File:Summer Paradise - Flickr - Jaykhuang.jpg', 'Alpine flowers': 'Alpine plant', 'Blue sheep': 'Bharal', 'Tibetan fox': 'Tibetan fox',
  'Puna grass': 'File:Festuca orthophylla, geisers del Tatio, Region de Antofagasta, Chile 01.JPG', 'Cushion plants & shrubs': 'Azorella compacta', 'Viscacha': 'Southern viscacha',
  'Leaf-eared mouse': 'File:Phyllotis darwinii.jpg', 'Lizard': 'Liolaemus', 'Andean fox': 'Culpeo', 'Puma': 'Cougar',
  'Moss & lichen': 'Lichen', 'Sedges & willows': 'Salix arctica', 'Berries': 'Cloudberry', 'Lemming': 'File:Lemmus trimucronatus 302115320.jpg',
  'Caribou': 'Reindeer', 'Ground squirrel': 'Arctic ground squirrel', 'Ptarmigan': 'Willow ptarmigan',
  'Shrubs': 'Adenostoma fasciculatum', 'Acorns & seeds': 'File:Quercus agrifolia acorns Mount Diablo.jpg', 'Woodrat': 'Dusky-footed woodrat',
  'Fence lizard': 'Western fence lizard', 'Mountain lion': 'Cougar',
  'Herbs & grass': 'File:Dehesa in Extremadura.jpg', 'Acorns': 'File:Quercus ilex acorns RHU 001.JPG', 'Rabbit': 'European rabbit', 'Partridge': 'Red-legged partridge',
  'Imperial eagle': 'Spanish imperial eagle',
  'Desert grasses': 'Panicum turgidum', 'Acacias & shrubs': 'Calotropis procera', 'Locusts': 'Desert locust',
  'Darkling beetle': 'Darkling beetle', 'Spiny-tailed lizard': 'Uromastyx', 'Jerboa': 'Lesser Egyptian jerboa', 'Scorpion': 'Deathstalker',
  'Horned viper': 'Cerastes cerastes', 'Eagle-owl': 'File:Grand-duc ascalaphe Oued Tataouine (Bubo ascalaphus).jpg', 'Saharan cheetah': 'Northwest African cheetah',
  'Saguaro & prickly pear': 'Saguaro', 'Mesquite & shrubs': 'Prosopis velutina', 'Harvester ants': 'Pogonomyrmex',
  'Nectar bat': 'Lesser long-nosed bat', 'Kangaroo rat': "Merriam's kangaroo rat", 'Jackrabbit': 'Black-tailed jackrabbit',
  'Javelina': 'Collared peccary', 'Horned lizard': 'Regal horned lizard', 'Roadrunner': 'Greater roadrunner',
  'Spinifex grass': 'Triodia (plant)', 'Saltbush & shrubs': 'File:Atriplex nummularia subsp. nummularia 1DS-II 5020.jpg', 'Ants & termites': 'Meat ant', 'Hopping mouse': 'Spinifex hopping mouse',
  'Perentie lizard': 'Perentie', 'Mulga snake': 'King brown snake',
  'Mangrove leaves': 'File:Starr-130703-5577-Rhizophora mangle-leaves-Kealia Pond-Maui (25219400655).jpg', 'Algae & plankton': 'Plankton', 'Crabs': 'Fiddler crab', 'Shrimp': 'Shrimp', 'Kingfisher': 'Stork-billed kingfisher',
  'Water monitor': 'Asian water monitor', 'River dolphin': 'Ganges river dolphin',
  'Tiny algae': 'Zooxanthellae', 'Seaweed & seagrass': 'Seagrass', 'Coral': 'Coral', 'Crabs & shrimp': 'Cleaner shrimp',
  'Clownfish': 'Ocellaris clownfish', 'Giant triton': 'Charonia tritonis', 'Octopus': 'Octopus', 'Reef shark': 'Grey reef shark',
  'Krill & copepods': 'Copepod', 'Jellyfish': 'Jellyfish', 'Tuna': 'File:Yellowfin tuna nurp.jpg', 'Dolphin': 'Spinner dolphin', 'Frigatebird': 'Great frigatebird',
  'Ice algae & phytoplankton': 'Diatom', 'Copepods': 'Calanus glacialis', 'Clams': 'Mya truncata', 'Kittiwake': 'Black-legged kittiwake',
  'Beluga whale': 'Beluga whale', 'Orca': 'Orca',
  'Krill': 'Antarctic krill', 'Silverfish': 'Antarctic silverfish', 'Squid': 'Squid', 'Albatross': 'Wandering albatross', 'Skua': 'South polar skua',
  'Algae': 'File:The freshwater alga Spirogyra.jpg', 'Water fleas': 'Daphnia', 'Mayfly nymphs': 'Mayfly', 'Shiners': 'Emerald shiner', 'Loon': 'Common loon',
  'River otter': 'North American river otter',
  'Arctic cod': 'File:Boreogadus saida Kaiyukan.jpg',
  'Lanternfish': 'File:Bolinichthys supralateralis.jpg',
  'Lake trout': 'File:Lake trout fish in hands salvelinus namaycush.jpg',
  'Mongolian gazelle': 'File:Procapra gutturosa - Анна Васильченко - 464472315.jpeg',
  'Narwhal': 'File:Pod Monodon monoceros.jpg',
  'Snowy owl': 'File:Schneeeule Bubo scandiacus Grugapark 2013.jpg',
  'Tibetan antelope': 'File:Chiru (Pantholops hodgsonii) 02.jpg',
  'Wild yak': 'File:Bos grunniens at Letdar on Annapurna Circuit.jpg',
  'Weddell seal': 'File:Leptonychotes weddellii.jpg',
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
const slug = key => key.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

async function commonsFile(source){
  if (source.startsWith('File:')) return source.slice(5);
  const s = await json(`https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(source.replace(/ /g, '_'))}`);
  const src = s.originalimage && s.originalimage.source;
  if (!src) {
    // some articles have no lead photo, though Wikidata knows one
    const d = s.wikibase_item && await json(`https://www.wikidata.org/wiki/Special:EntityData/${s.wikibase_item}.json`);
    const p18 = d && d.entities[s.wikibase_item].claims.P18;
    if (!p18) throw new Error(`"${source}" has no lead image`);
    return p18[0].mainsnak.datavalue.value;
  }
  if (!src.includes('/wikipedia/commons/')) throw new Error(`"${source}"'s lead image isn't on Commons`);
  // a big original comes back as one of its thumbnails, …/thumb/a/ab/Name.jpg/3840px-Name.jpg
  const parts = src.split('?')[0].split('/');
  return decodeURIComponent(parts[parts.length - (parts.includes('thumb') ? 2 : 1)]);
}
async function fetchPhoto(key, source){
  const file = await commonsFile(source);
  const q = await json(`https://commons.wikimedia.org/w/api.php?action=query&format=json&prop=imageinfo&iiprop=url|extmetadata&iiurlwidth=${WIDTH}&titles=${encodeURIComponent('File:' + file)}`);
  const info = Object.values(q.query.pages)[0].imageinfo[0], m = info.extmetadata;
  const name = `${slug(key)}.jpg`, tmp = join(OUT, '.download');
  writeFileSync(tmp, Buffer.from(await (await get(info.thumburl)).arrayBuffer()));
  // Commons' thumbnails are kind to the eye and heavy; twice the card's width is plenty
  execFileSync('sips', ['--resampleWidth', String(WIDTH), '-s', 'format', 'jpeg', '-s', 'formatOptions', 'normal', tmp, '--out', join(OUT, name)], {stdio: 'ignore'});
  unlinkSync(tmp);
  return {file: name, by: plain(m.Artist && m.Artist.value) || 'Unknown', license: plain(m.LicenseShortName && m.LicenseShortName.value), page: info.descriptionurl};
}

mkdirSync(OUT, {recursive: true});
const manifest = existsSync(join(OUT, 'photos.json')) ? JSON.parse(readFileSync(join(OUT, 'photos.json'), 'utf8')) : {};
const again = new Set(process.argv.slice(2));
const wanted = new Set();
for (const w of WEBS) for (const s of w.species) wanted.add(SOURCE[`${w.id}/${s.name}`] ? `${w.id}/${s.name}` : s.name);
for (const key of Object.keys(manifest)) if (!wanted.has(key)) { unlinkSync(join(OUT, manifest[key].file)); delete manifest[key]; }
const failed = [];
for (const key of wanted) {
  if (manifest[key] && !again.has(key)) continue;
  try { manifest[key] = await fetchPhoto(key, SOURCE[key] || key); console.log('✓', key); }
  catch (e) { failed.push(key); console.log('✗', key, e.message); }
}
const sorted = Object.fromEntries(Object.keys(manifest).sort().map(k => [k, manifest[k]]));
writeFileSync(join(OUT, 'photos.json'), JSON.stringify(sorted, null, 1) + '\n');
console.log(`${Object.keys(sorted).length} photos, ${failed.length} missing${failed.length ? ': ' + failed.join(', ') : ''}`);
