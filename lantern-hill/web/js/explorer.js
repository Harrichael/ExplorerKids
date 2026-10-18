import { C, shade, tex } from './core/kit.js';
import { load, save } from './save.js';

const SKIN = [0xf6d6bd,0xf0c4a0,0xd9a07a,0xb87a55,0x8a5638,0x5e3a26];
const EYES = [0x2a1e1a,0x3a6b45,0x3a5f8a,0x7a4a20];
const HAIRC = [0x1e1612,0x3a2418,0x6b3e22,0xa0602e,0xd9a441,0xd6d4dc,0x8a4a7a,0x2f8f8a];
const CLOTH = [0x2f8f8a,0xb5552f,0x6d3b5e,0xd9a441,0x3e6b45,0x34406b,0x8c3b3b,0xe9d9b8,0xd36a8f,0x8f7ad6];
const BOTTOM = [0x34406b,0x6b5a3a,0x2f5552,0x4a2e22,0x6d3b5e,0x8a8090];
const SHOES = [0xe9d9b8,0xb5552f,0x4a2e22,0x2f8f8a,0xd9a441,0x1a1320];
const HAIR_OPTS = {boy:[['short','Short'],['curly','Curly'],['spiky','Spiky'],['cap','Cap']], girl:[['long','Long'],['braids','Braids'],['bob','Bob'],['bun','Bun'],['puffs','Puffs']]};
const OUTFIT_OPTS = {boy:[['hoodie','Hoodie'],['raincoat','Raincoat'],['vest','Explorer vest'],['sweater','Striped sweater']], girl:[['dress','Dress'],['raincoat','Raincoat'],['cardigan','Cardigan'],['sweater','Striped sweater']]};
const BOTTOM_OPTS = {boy:[['pants','Pants'],['shorts','Shorts']], girl:[['skirt','Skirt'],['leggings','Leggings']]};
const EXTRA_OPTS = {boy:[['glasses','Glasses'],['freckles','Freckles'],['binoculars','Binoculars'],['suspenders','Suspenders'],['bowtie','Bow tie']], girl:[['glasses','Glasses'],['freckles','Freckles'],['bow','Hair bow']]};
export const GENDER_DEFAULTS = {boy:{hairStyle:'short', outfit:'hoodie', bottom:'pants', top:0, bow:false}, girl:{hairStyle:'long', outfit:'dress', bottom:'skirt', top:8, binoculars:false}};
export function groupsFor(kind){
  const dress = kind === 'girl' && cfg.outfit === 'dress';
  const g = [
    {key:'name', label:'Name', type:'text'},
    {key:'kind', label:'I am a', opts:[['boy','Boy'],['girl','Girl']]},
    {key:'skin', label:'Skin', colors:SKIN},
    {key:'eyes', label:'Eyes', colors:EYES},
    {key:'hairStyle', label:'Hair', opts:HAIR_OPTS[kind]},
    {key:'hairColor', label:'Hair color', colors:HAIRC},
    {key:'outfit', label:'Outfit', opts:OUTFIT_OPTS[kind]},
    {key:'top', label: dress ? 'Dress color' : 'Outfit color', colors:CLOTH}
  ];
  if (!dress) g.push({key:'bottom', label: kind === 'girl' ? 'Skirt or leggings' : 'Pants or shorts', opts:BOTTOM_OPTS[kind]});
  g.push({key:'bottomColor', label: dress ? 'Tights color' : (kind === 'girl' && cfg.bottom === 'skirt' ? 'Skirt color' : (cfg.bottom === 'shorts' ? 'Shorts color' : (kind === 'girl' ? 'Leggings color' : 'Pants color'))), colors:BOTTOM},
    {key:'shoes', label:'Shoes', colors:SHOES},
    {key:'pack', label:'Bag', opts:[['backpack','Backpack'],['satchel', kind === 'girl' ? 'Shoulder bag' : 'Satchel'],['none','No bag']]},
    {key:'extras', label:'Extras', toggles:EXTRA_OPTS[kind]});
  return g;
}
const DEFAULT_CFG = {name:'Explorer', kind:'boy', skin:1, eyes:0, hairStyle:'short', hairColor:2, outfit:'hoodie', top:0, bottom:'pants', bottomColor:0, shoes:0, pack:'backpack', glasses:false, freckles:false, binoculars:false, bow:false, suspenders:false, bowtie:false};
const savedCfg = load('explorer');
export const isNewExplorer = !savedCfg;
export const cfg = Object.assign({}, DEFAULT_CFG);
export function normalize(){
  const k = cfg.kind === 'girl' ? 'girl' : 'boy'; cfg.kind = k;
  const D = GENDER_DEFAULTS[k];
  if (!HAIR_OPTS[k].some(o => o[0] === cfg.hairStyle)) cfg.hairStyle = D.hairStyle;
  if (!OUTFIT_OPTS[k].some(o => o[0] === cfg.outfit)) cfg.outfit = D.outfit;
  if (!BOTTOM_OPTS[k].some(o => o[0] === cfg.bottom)) cfg.bottom = D.bottom;
  if (!['backpack','satchel','none'].includes(cfg.pack)) cfg.pack = 'backpack';
  const allowed = EXTRA_OPTS[k].map(e => e[0]);
  for (const e of ['glasses','freckles','binoculars','bow','suspenders','bowtie']) cfg[e] = allowed.includes(e) && cfg[e] === true;
  for (const [key, arr] of [['skin',SKIN],['eyes',EYES],['hairColor',HAIRC],['top',CLOTH],['bottomColor',BOTTOM],['shoes',SHOES]])
    if (!Number.isInteger(cfg[key]) || cfg[key] < 0 || cfg[key] >= arr.length) cfg[key] = DEFAULT_CFG[key];
  cfg.name = (typeof cfg.name === 'string' ? cfg.name.slice(0, 14).trim() : '') || 'Explorer';
}
if (savedCfg && typeof savedCfg === 'object') for (const key of Object.keys(DEFAULT_CFG)) if (typeof savedCfg[key] === typeof DEFAULT_CFG[key]) cfg[key] = savedCfg[key];
normalize();
export function saveCfg(){ save('explorer', cfg); }

const stripeCache = {};
function stripes(c){
  if (!stripeCache[c]) stripeCache[c] = tex(64,64,(g,w,h)=>{ g.fillStyle = '#' + c.toString(16).padStart(6,'0'); g.fillRect(0,0,w,h); g.fillStyle = c === 0xe9d9b8 ? '#6d3b5e' : '#e9d9b8'; for (let y=0;y<h;y+=16) g.fillRect(0,y,w,6); }, 1, 2);
  return stripeCache[c];
}
export function heroOpts(c){
  const top = CLOTH[c.top], dk = shade(top, .78), girl = c.kind === 'girl';
  const o = {build:c.kind, skin:SKIN[c.skin], eye:EYES[c.eyes], hair:HAIRC[c.hairColor], hairStyle:c.hairStyle, capColor: CLOTH[(c.top + 5) % CLOTH.length],
    pants:BOTTOM[c.bottomColor], shoe:SHOES[c.shoes], sole: c.shoes === 5 ? 0x8a8090 : 0x2a1e1a, scale: girl ? .86 : .9,
    glasses: c.glasses ? C.gold : null, freckles:c.freckles, binoculars: !girl && c.binoculars, lashes: girl, browTilt: girl ? .18 : .08,
    mouth: girl ? 0xb8475a : 0x6b2a2a, tie: top === 0xd36a8f ? C.gold : 0xd36a8f};
  if (girl) { o.strap = 0x1a1320; if (c.bow) o.bow = top === 0xd36a8f ? C.gold : 0xd36a8f; }
  if (c.bottom === 'shorts') { o.shorts = true; o.socks = C.cream; }
  if (c.bottom === 'skirt') { o.skirt = BOTTOM[c.bottomColor]; o.pants = SKIN[c.skin]; o.slimLegs = true; }
  if (c.bottom === 'leggings') o.slimLegs = true;
  if (c.pack === 'backpack') { o.backpack = c.top === 1 ? C.navy : C.rust; o.backpackFlap = C.gold; }
  if (c.pack === 'satchel') o.satchel = true;
  if (c.outfit === 'hoodie') Object.assign(o, {shirt:top, sleeve:top, hood:top, strings:true, cuff:dk, patches: c.top === 3 ? C.plum : C.gold});
  if (c.outfit === 'raincoat') Object.assign(o, {shirt:top, coat:top, closed:true, coatLen:.8, coatFlare: girl ? .48 : .4, buttons:4, buttonColor:C.ink, collar:dk, hood:top});
  if (c.outfit === 'vest') Object.assign(o, {shirt:C.cream, sleeve:C.cream, shortSleeve:true, vest:top, vestTrim:dk});
  if (!girl && c.suspenders) o.suspenders = c.top === 1 ? C.navy : C.rust;
  if (!girl && c.bowtie) o.bowtie = c.top === 6 || c.top === 1 ? C.navy : 0x8c3b3b;
  if (c.outfit === 'sweater') Object.assign(o, {shirt:top, shirtMap:stripes(top), sleeve:top, cuff:C.cream});
  if (c.outfit === 'cardigan') Object.assign(o, {shirt:C.cream, sleeve:top, coat:top, coatLen:.62, coatFlare:.32, cuff:C.cream, buttons:3, buttonColor:C.gold});
  if (c.outfit === 'dress') Object.assign(o, {shirt:top, sleeve:top, shortSleeve:true, puffSleeve:true, dress:top, dressTrim:C.cream, collar:C.cream, skirt:null, pants:BOTTOM[c.bottomColor], slimLegs:true, buttons:2, buttonColor:C.cream});
  return o;
}
