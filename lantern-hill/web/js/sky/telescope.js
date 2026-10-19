// Pip's telescope, on the treehouse deck: tonight's real sky over wherever the treehouse is, from
// what your eyes see, down into Hubble's and Webb's pictures, and out across light no eye can see;
// and the Moon and planets, each where it really is tonight and, up close, the face it turns to
// Earth. No tour and no goals; the kid turns, zooms and taps whatever catches their eye.
//
// It steers like a telescope on a tripod: turning round and tipping up and down, the horizon level
// and the ground below it. Aladin only paints the sky; where it looks, and how it is turned, comes
// from here.
//
// The imagery is far too big to ship, so it streams as HiPS tiles (all-sky image pyramids) from
// CDS Strasbourg, drawn by CDS's own viewer, Aladin Lite. What ships with the game is in web/sky/,
// built by tools/sky_data.py: the names to read the sky by and maps of where Hubble and Webb looked.
// Loaded the first time someone looks through the telescope.

import { Sound } from '../core/sound.js';
import { joy, keys } from '../input.js';
import { clock } from '../play.js';
import { load, save } from '../save.js';
import { game } from '../state.js';
import { closeDialog } from '../ui/dialogue.js';
import { parallactic, siderealTime, sunAltitude, toHorizon, toSky } from './astro.js';
import { BODIES, MOONS, PLANETS, sight } from './bodies.js';
import { localTime, tonight, where } from './observer.js';
import * as upClose from './up-close.js';

// Every survey here is a map of the whole sky in the same coordinates, so they stack like sheets of
// tracing paper on one sphere. A lens is just a recipe: how strongly each survey shows at this zoom.
// Switching lenses fades between recipes, so the stars hold still while the light around them changes.
const MELLINGER = 'CDS/P/Mellinger/color', DSS = 'CDS/P/DSS2/color';
const clamp01 = x => Math.min(1, Math.max(0, x));
// Mellinger's photo of the whole sky goes soft up close, so the Digitized Sky Survey fades in as you zoom
const nightSky = f => ({[MELLINGER]:1, [DSS]:clamp01((12 - f)/9)});
const only = id => () => ({[id]:1});
const LENSES = [
  {id:'sky', name:'Night Sky', layers:nightSky,
    tip:'The sky as your eyes see it. Find the Moon or a planet and tap it to look closer.', credit:'Axel Mellinger · Digitized Sky Survey (Caltech, STScI)'},
  // Hubble and Webb lay their pictures over the night sky, with a glow where they exist
  {id:'hubble', name:'Hubble', layers:f => ({...nightSky(f), 'CDS/P/HST/EPO':1}), moc:'sky/hubble-moc.json', glow:'#ffcf73',
    tip:'Hubble’s pictures, right where it took them. Find a glowing patch and zoom in!', credit:'Hubble: NASA, ESA, STScI'},
  {id:'webb', name:'Webb', layers:f => ({...nightSky(f), 'CDS/P/JWST/EPO':1}), moc:'sky/webb-moc.json', glow:'#ff9a6b',
    tip:'Webb’s pictures, right where it took them. Find a glowing patch and zoom in!', credit:'Webb: NASA, ESA, CSA, STScI'},
  // the rest run along the rainbow, from long, gentle light to short, fierce light
  {id:'micro', name:'Microwaves', layers:only('CDS/P/PLANCK/R2/HFI/color'),
    tip:'Cold, cold dust glowing in microwaves, the light a microwave oven uses.', credit:'Planck (ESA)'},
  {id:'ir', name:'Infrared', layers:only('CDS/P/2MASS/color'),
    tip:'Warm light. Infrared sees right through dusty clouds to the stars behind them.', credit:'2MASS (UMass, IPAC/Caltech, NASA, NSF)'},
  {id:'uv', name:'Ultraviolet', layers:only('CDS/P/GALEXGR6_7/color'),
    tip:'The light that gives you a sunburn. Young, hot stars shine bright in it.', credit:'GALEX (NASA)'},
  {id:'xray', name:'X-rays', layers:only('JAXA/P/MAXI/SSC/Image'),
    tip:'Gas millions of degrees hot, from exploded stars and hungry black holes.', credit:'MAXI (JAXA, RIKEN) on the International Space Station'},
  {id:'gamma', name:'Gamma rays', layers:only('CDS/P/Fermi/color'),
    tip:'The strongest light there is, from black holes and spinning dead stars.', credit:'Fermi (NASA, DOE)'}
];
const lensBy = id => LENSES.find(l => l.id === id) || LENSES[0];
// The lenses for light no eye can see open once a kid has spent a while at the telescope: the
// treat for coming back, after Pip's magic trip at twelve minutes
const DEEP = 22*60, UNSEEN = ['micro', 'ir', 'uv', 'xray', 'gamma'];
const looked = () => view.seconds + (game.activity === 'telescope' ? (Date.now() - since)/1000 : 0);
const locked = l => UNSEEN.includes(l.id) && looked() < DEEP;

const COLOR = {O:'a blue-white star, far hotter than our Sun', B:'a blue-white star, far hotter than our Sun', A:'a white star, hotter than our Sun',
  F:'a yellow-white star, a little hotter than our Sun', G:'a yellow star, just like our Sun', K:'an orange star, a bit cooler than our Sun', M:'a red star, cooler than our Sun'};
const KIND = {
  galaxy:'A galaxy: billions of stars, far beyond our own Milky Way.',
  globular:'A globular cluster: a giant ball of hundreds of thousands of very old stars.',
  cluster:'A star cluster: a family of stars that were born together.',
  nebula:'A nebula: a huge cloud of gas and dust where new stars are being born.',
  pn:'The glowing bubble a star like our Sun puffs off when it grows old.',
  snr:'The cloud left behind by a star that exploded!',
  dark:'A cloud of dust so thick it blocks the light behind it.',
  group:'A group of galaxies, bumping and swirling together.',
  deep:'Almost every speck in here is a whole galaxy, very, very far away.',
  center:'The very middle of our Milky Way. A giant black hole hides here, behind the dust.'};
// how close "Fly there" brings each kind of thing, in degrees of sky across the screen
const FLY = {star:.8, galaxy:1, globular:.25, cluster:1.2, nebula:1, pn:.08, snr:.15, dark:.4, group:.08, deep:.05, center:.3};

// where it was left pointing is kept as a direction in the sky (looking south, a third of the way up),
// not at a star, which may have set by the next time; `seconds` is how long it has been looked through
const saved = load('telescope'), view = Object.assign({az:180, alt:35, fov:70, lens:'sky', names:true, seconds:0}, saved && typeof saved === 'object' ? saved : {});

const css = document.createElement('style');
css.textContent = `
.stargazing #world,.stargazing .vignette,.stargazing .hud,.stargazing #stick,.stargazing #talk,.stargazing #use,.stargazing #prompt,.stargazing #dialog{display:none!important}
#scope{position:fixed;inset:0;background:#05040a;touch-action:none;animation:iris .8s cubic-bezier(.3,.7,.2,1)}
@keyframes iris{from{clip-path:circle(0 at 50% 50%)}to{clip-path:circle(75% at 50% 50%)}}
#scopeSky{position:absolute;inset:0}
#scopeSky .aladin-logo-container,#scopeSky .aladin-logo{display:none!important}
#scopeNames{position:absolute;inset:0;width:100%;height:100%;pointer-events:none}
#scopeGlass{position:absolute;inset:0;cursor:grab;touch-action:none}
#scopeGlass.dragging{cursor:grabbing}
#scope .rim{position:absolute;inset:0;pointer-events:none;background:radial-gradient(ellipse at 50% 50%,transparent 62%,rgba(5,4,10,.55) 88%,rgba(5,4,10,.85))}
#scope header{position:absolute;top:0;left:0;right:0;display:flex;align-items:flex-start;justify-content:space-between;gap:10px;padding:calc(10px + env(safe-area-inset-top,0px)) max(16px,env(safe-area-inset-right,0px)) 30px max(16px,env(safe-area-inset-left,0px));background:linear-gradient(rgba(10,8,18,.8),rgba(10,8,18,0));pointer-events:none}
#scope header>*{pointer-events:auto}
#scope h2{margin:0;font-family:var(--display);font-weight:400;font-size:clamp(20px,5vw,28px);color:var(--parch);line-height:1.1;text-shadow:0 2px 0 var(--ink)}
#scope .sub{font-size:12px;font-weight:900;letter-spacing:1.1px;text-transform:uppercase;color:var(--gold)}
#scope .tip{margin:4px 0 0;max-width:34em;font-weight:800;font-size:14px;color:var(--parch);text-shadow:0 1px 3px #000}
#scope .note{margin:6px 0 0;max-width:34em;font-weight:900;font-size:14px;color:#ffd98a;text-shadow:0 1px 3px #000}
#scope .tools{display:flex;gap:8px;flex:none}
#scope .sb{font-family:var(--display);font-size:16px;color:var(--parch);background:var(--plum);border:2.5px solid var(--gold);border-radius:14px;padding:7px 14px;box-shadow:0 0 0 3px var(--ink);cursor:pointer}
#scope .sb.ghost{background:rgba(26,19,32,.7)}
#scope .sb[aria-pressed=false]{opacity:.6}
#scope .sb:focus-visible,#scope .lens:focus-visible{outline:3px solid var(--parch);outline-offset:3px}
#scope .zoom{position:absolute;right:max(16px,env(safe-area-inset-right,0px));top:50%;transform:translateY(-50%);display:flex;flex-direction:column;align-items:center;gap:10px}
#scope .zoom .sb{width:52px;height:52px;padding:0;font-size:26px;line-height:1}
#scope .like{font-weight:900;font-size:12px;color:var(--parch);text-align:center;max-width:84px;line-height:1.25;text-shadow:0 1px 3px #000}
#scope footer{position:absolute;left:0;right:0;bottom:0;padding:26px 0 calc(8px + env(safe-area-inset-bottom,0px));background:linear-gradient(rgba(10,8,18,0),rgba(10,8,18,.85))}
#scope .lenses{display:flex;gap:8px;overflow-x:auto;padding:4px max(16px,env(safe-area-inset-left,0px)) 6px;scrollbar-width:none;align-items:center}
#scope .lenses::-webkit-scrollbar{display:none}
#scope .lens{flex:none;font-family:var(--body);font-weight:900;font-size:14px;color:var(--parch);background:rgba(26,19,32,.82);border:2px solid rgba(217,164,65,.55);border-radius:999px;padding:7px 14px;cursor:pointer;box-shadow:0 0 0 2px var(--ink)}
#scope .lens[aria-pressed=true]{background:var(--gold);color:var(--ink);border-color:var(--gold)}
#scope .lens{background-image:linear-gradient(var(--gold),var(--gold));background-repeat:no-repeat;background-size:0 100%;-webkit-touch-callout:none;user-select:none;-webkit-user-select:none}
#scope .lens.holding{background-size:100% 100%;transition:background-size .6s linear;color:var(--ink)}
#scope .holdhint{width:max-content;margin:0 auto 6px;padding:4px 12px;border-radius:999px;background:rgba(26,19,32,.92);border:2px solid var(--gold);color:var(--parch);font-weight:900;font-size:13px;animation:fadein .2s ease-out}
#scope .lens i{display:inline-block;width:10px;height:10px;border-radius:50%;margin-right:6px;vertical-align:-1px}
#scope .gap{flex:none;width:2px;height:24px;background:rgba(217,164,65,.4);margin:0 4px}
#scope .lenses[hidden]{display:none}
#scopeNear{position:absolute;inset:0;width:100%;height:100%}
#scope .credit{font-size:11px;font-weight:700;color:rgba(239,224,191,.6);padding:2px max(16px,env(safe-area-inset-left,0px)) 0}
#scope .info{position:absolute;left:50%;bottom:calc(142px + env(safe-area-inset-bottom,0px));transform:translateX(-50%);width:min(380px,calc(100% - 32px));box-sizing:border-box;background:rgba(26,19,32,.94);border:2.5px solid var(--gold);border-radius:16px;box-shadow:0 0 0 3px var(--ink),0 10px 30px rgba(0,0,0,.5);padding:12px 16px 14px}
#scope .info h3{margin:0;font-family:var(--display);font-weight:400;font-size:22px;color:var(--parch)}
#scope .info em{display:block;font-style:normal;font-weight:900;font-size:12px;letter-spacing:1px;text-transform:uppercase;color:var(--gold)}
#scope .info p{margin:6px 0 0;font-weight:700;font-size:15px;line-height:1.4;color:var(--parch)}
#scope .info .row{display:flex;gap:8px;margin-top:10px}
#scope .cloudy{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:12px;text-align:center;padding:24px;font-weight:800;font-size:16px;color:var(--parch)}
#scope .cloudy b{font-family:var(--display);font-weight:400;font-size:26px}`;
document.head.appendChild(css);

const el = document.createElement('div'); el.id = 'scope'; el.hidden = true; el.setAttribute('role', 'dialog'); el.setAttribute('aria-label', 'Pip’s telescope');
el.innerHTML = `<div id="scopeSky"></div><canvas id="scopeNames"></canvas><div class="rim"></div><div id="scopeGlass"></div>
  <header><div><div class="sub" id="sWhere">Pip’s Telescope</div><h2 id="sLens"></h2><p class="tip" id="sTip"></p><p class="note" id="sNote" hidden></p></div>
    <div class="tools"><button class="sb" id="sBack" hidden>Back to the sky</button><button class="sb ghost" id="sNames" aria-pressed="true">Names</button><button class="sb ghost" id="sClose">Close</button></div></header>
  <div class="zoom"><button class="sb" id="sIn" aria-label="Zoom in">+</button><div class="like" id="sLike"></div><button class="sb" id="sOut" aria-label="Zoom out">−</button></div>
  <div class="info" id="sCard" hidden></div>
  <footer><div class="holdhint" id="sHold" hidden>Press and hold to switch</div>
    <div class="lenses" id="sLenses"></div><div class="lenses" id="sWorld" hidden></div><div class="credit" id="sCredit"></div></footer>`;
document.body.appendChild(el);
const $s = id => el.querySelector('#' + id);
const skyEl = $s('scopeSky'), namesCv = $s('scopeNames'), glass = $s('scopeGlass'), card = $s('sCard');
upClose.canvas.id = 'scopeNear'; upClose.canvas.hidden = true; skyEl.after(upClose.canvas);

// Switching what the telescope shows takes a press held until the button fills, so a kid tapping
// down the row as fast as they can changes nothing, while one who wants a view gets it. A quick
// tap says to hold. The keyboard holds Space or Enter the same way (see the key handlers below).
const HOLD = 600;
function holdToPick(b, pick){
  let timer = 0;
  const start = () => {
    if (timer || b.getAttribute('aria-pressed') === 'true') return;
    b.classList.add('holding'); Sound.tone(440, {type:'sine', dur:.5, vol:.025});
    timer = setTimeout(() => { timer = 0; b.classList.remove('holding'); pick(); }, HOLD);
  };
  const stop = () => {
    if (!timer) return;
    clearTimeout(timer); timer = 0; b.classList.remove('holding'); holdHint();
  };
  b.addEventListener('pointerdown', start);
  for (const ev of ['pointerup', 'pointerleave', 'pointercancel']) b.addEventListener(ev, stop);
  b.addEventListener('contextmenu', e => e.preventDefault());
  b.hold = {start, stop};
}
let hintTimer = 0;
function holdHint(){
  const hint = $s('sHold'); hint.hidden = false;
  clearTimeout(hintTimer); hintTimer = setTimeout(() => { hint.hidden = true; }, 1600);
}

const BAND_DOT = {micro:'#c0392b', ir:'#e67e22', uv:'#8e44ad', xray:'#3c6fd1', gamma:'#20b2aa'};
for (const l of LENSES) {
  if (l.id === 'micro') { const g = document.createElement('span'); g.className = 'gap'; g.dataset.unseen = ''; $s('sLenses').append(g); }
  const b = document.createElement('button'); b.className = 'lens'; b.dataset.id = l.id;
  if (UNSEEN.includes(l.id)) b.dataset.unseen = '';
  b.innerHTML = (BAND_DOT[l.id] ? `<i style="background:${BAND_DOT[l.id]}"></i>` : '') + l.name;
  holdToPick(b, () => { setLens(l.id); Sound.tone(880, {type:'triangle', dur:.08, vol:.05}); });
  $s('sLenses').append(b);
}
// the lenses for unseen light stay out of sight until they open, and arrive with a card
let shut = null;   // whether they were locked when last looked at
function lenses(){
  const now = locked(LENSES.find(l => l.id === 'micro'));
  if (shut === now) return;
  if (shut && !now) openedCard();
  shut = now;
  el.querySelectorAll('#sLenses [data-unseen]').forEach(b => { b.hidden = now; });
}
function openedCard(){
  card.innerHTML = `<em>New lenses!</em><h3>Light no eye can see</h3>
    <p>You’ve spent so long at Pip’s telescope that its special lenses are open: microwaves, infrared, ultraviolet, X-rays and gamma rays.</p>
    <p>Each one shows the same sky in a light your eyes can’t see. Try them!</p>
    <div class="row"><button class="sb ghost" data-x>OK</button></div>`;
  card.querySelector('[data-x]').addEventListener('click', () => { card.hidden = true; });
  card.hidden = false; [523, 659, 784, 1047].forEach((f, i) => Sound.tone(f, {type:'triangle', t:i*.1, dur:.4, vol:.05}));
}

const TINT = {mercury:'#c9b8a6', venus:'#fff1cf', mars:'#e8845a', jupiter:'#ead6ad', saturn:'#e3cf94', uranus:'#a9e2e6', neptune:'#7c98ec'};

let A = null, aladin = null, stars = [], deepSky = [], lens = null, moc = null;
const mocs = {}, stack = new Map();   // survey id -> {layer, at: its opacity now}

// Aladin is fetched on first use, so a kid offline still gets the treehouse, and a cloudy-night note here
async function boot(){
  if (aladin) return true;
  try {
    A = (await import('aladin-lite')).default; await A.init;
    [stars, deepSky] = await Promise.all(['sky/stars.json', 'sky/deep-sky.json'].map(u => fetch(u).then(r => r.json())));
  } catch (e) {
    console.warn('telescope:', e);
    skyEl.innerHTML = `<div class="cloudy"><b>Too cloudy tonight!</b>The telescope needs the internet to bring down the sky.</div>`;
    return false;
  }
  // stereographic, as planetariums draw it: zoomed out, you look around from inside the sphere, not at a ball
  const c = centre();
  aladin = A.aladin(skyEl, {fov:view.fov, target:`${c.ra} ${c.dec}`, cooFrame:'ICRS', projection:'STG', backgroundColor:'rgb(5,4,10)',
    showReticle:false, showZoomControl:false, showLayersControl:false, showGotoControl:false, showFrame:false, showCooLocation:false,
    showFov:false, showProjectionControl:false, showFullscreenControl:false, showSettingsControl:false, showShareControl:false,
    showSimbadPointerControl:false, showStatusBar:false, showContextMenu:false, showCooGrid:false});
  aladin.setFoVRange(.002, 180);
  // Aladin insists on a base layer; Mellinger's whole-sky photo is it, and fades like any other
  const base = A.imageHiPS(MELLINGER); base.setOpacity(0); aladin.setBaseImageLayer(base);
  stack.set(MELLINGER, {layer:base, at:0});
  return true;
}

function setLens(id){
  const l = locked(lensBy(id)) ? LENSES[0] : lensBy(id); view.lens = l.id; card.hidden = true;
  el.querySelectorAll('#sLenses .lens').forEach(b => b.setAttribute('aria-pressed', b.dataset.id === l.id));
  $s('sLens').textContent = l.name; $s('sTip').textContent = l.tip;
  $s('sCredit').textContent = `${l.credit} · Sky tiles: CDS Strasbourg, Aladin Lite · Star names: HYG Database (CC BY-SA)`;
  if (!aladin || lens === l) return;
  lens = l;
  // new surveys go on top, in the recipe's order, starting invisible; fade() brings them up
  for (const id of Object.keys(l.layers(view.fov))) if (!stack.has(id)) {
    const layer = A.imageHiPS(id); layer.setOpacity(0); aladin.setOverlayImageLayer(layer, id); stack.set(id, {layer, at:0});
  }
  if (moc) { if (moc.ready) aladin.removeOverlay(moc); moc = null; }
  if (l.moc) showMoc(l);
  zoomed();
}
// eases every survey toward what the lens wants at this zoom. The old lens holds still underneath
// until the new one is all the way up, so tiles still on their way show the old sky, never black;
// a survey the lens has no use for is dropped once faded out, so it stops fetching tiles
function fade(dt){
  const want = lens.layers(view.fov), k = Math.min(1, dt*3);
  const up = Object.keys(want).every(id => stack.get(id).at === want[id]);
  for (const [id, s] of stack) {
    const to = id in want ? want[id] : up ? 0 : s.at;
    if (s.at !== to) { s.at = Math.abs(to - s.at) < .01 ? to : s.at + (to - s.at)*k; s.layer.setOpacity(s.at); }
    if (!(id in want) && s.at === 0 && id !== MELLINGER) { aladin.removeImageLayer(id); stack.delete(id); }
  }
}
async function showMoc(l){
  mocs[l.id] = mocs[l.id] || await fetch(l.moc).then(r => r.json());
  if (lens !== l) return;
  // Aladin adds a MOC asynchronously, and touching one before it is ready panics its WebAssembly,
  // so it is shown, hidden or removed only from here on
  moc = A.MOCFromJSON(mocs[l.id], {color:l.glow, fillColor:l.glow, fill:true, opacity:.45, lineWidth:2, perimeter:true},
    m => { if (m === moc) zoomed(); else aladin.removeOverlay(m); });
  aladin.addMOC(moc);
}
// the coverage glow goes out once Hubble's or Webb's pictures are big enough to see for themselves
function zoomed(){
  if (!aladin || !lens) return;
  const f = view.fov;
  if (moc && moc.ready) f > 3 ? moc.show() : moc.hide();
  $s('sLike').textContent = f > 30 ? 'Like your eyes' : f > 3 ? 'Like binoculars' : f > .3 ? 'Like a backyard telescope' : f > .05 ? 'Like a giant telescope' : 'As close as Hubble';
}

// ---------- the sky, or one world up close ----------
// Nothing is picked from a list: a kid finds the Moon or a planet in the sky and taps it to look
// closer. The star view is Aladin's; up close has its own picture, and Aladin rests.
let near = null, nearLens = 0, told = '';
const bodyShown = () => near;
function closeTo(b){
  near = b || null;
  card.hidden = true; drawn = told = '';
  $s('sLenses').hidden = !!b; $s('sLike').hidden = !!b; $s('sBack').hidden = !b; $s('sWorld').hidden = true;
  // hidden, not removed: Aladin keeps its size and tiles for the trip back
  skyEl.style.visibility = b ? 'hidden' : ''; upClose.canvas.hidden = !b;
  if (!b) { setLens(view.lens); if (aladin && game.activity === 'telescope') resume(); return; }
  if (aladin) park();
  upClose.show(b);
  $s('sLens').textContent = b.name; $s('sTip').textContent = '';
  // a world seen through more than one spacecraft's eyes gets its own row of lenses, here only
  const row = $s('sWorld'), ls = upClose.lenses(b);
  row.innerHTML = ''; row.hidden = ls.length < 2;
  ls.forEach((l, i) => {
    const c = document.createElement('button'); c.className = 'lens';
    c.innerHTML = (l.glow ? `<i style="background:${l.glow}"></i>` : '') + l.name;
    holdToPick(c, () => { worldLens(b, i); Sound.tone(880, {type:'triangle', dur:.08, vol:.05}); });
    row.append(c);
  });
  worldLens(b, 0);
}
function worldLens(b, i){
  nearLens = i; upClose.lens(i); told = '';
  $s('sWorld').querySelectorAll('.lens').forEach((c, j) => c.setAttribute('aria-pressed', j === i));
  $s('sCredit').textContent = upClose.lenses(b)[i]?.credit || b.credit;
}

// what a kid wants to know about a body tonight: is it up, where, and when it rises if not
const POINTS = ['north', 'northeast', 'east', 'southeast', 'south', 'southwest', 'west', 'northwest'];
const named = b => b.id === 'moon' ? 'The Moon' : b.name;
function status(b, ms){
  const s = sight(b, ms, place), name = named(b), phase = b.id === 'moon' ? ` ${moonPhase(s)}` : '';
  if (s.alt > hill(s.az)) return `${name} is up right now, ${s.alt < 15 ? 'low' : s.alt < 50 ? 'partway up' : 'high'} in the ${POINTS[Math.round(s.az/45) % 8]}.${phase}`;
  if (b.id !== 'moon' && s.fromSun < 15) return `${name} is too close to the Sun to see right now, lost in its glare.`;
  for (let t = ms + 600000; t < ms + 86400000; t += 600000) {
    const u = sight(b, t, place);
    if (u.alt > hill(u.az)) return `${name} is below the horizon right now. It rises at about ${localTime(place, t)}.${phase}`;
  }
  return `${name} stays below the horizon all day and all night.${phase}`;
}
function moonPhase(s){
  const k = s.lit, name = k < .03 ? 'new Moon' : k > .97 ? 'full Moon' : Math.abs(k - .5) < .06 ? (s.waxing ? 'first quarter Moon' : 'last quarter Moon')
    : `${s.waxing ? 'waxing' : 'waning'} ${k < .5 ? 'crescent' : 'gibbous'} Moon`;
  return `Tonight it’s a ${name}, ${Math.round(k*100)}% lit by the Sun.`;
}
function travelled(s){
  if (s.late < 60) return 'Its light takes just over a second to reach you.';
  const m = s.late/60;
  return m < 90 ? `The light you see left it ${Math.round(m)} minutes ago.` : `The light you see left it ${Math.round(m/6)/10} hours ago.`;
}
// closer: offer to fly up to it, from the star view or from Jupiter to one of its moons
function bodyCard(b, closer){
  const s = sight(b, skyNow(), place), lines = [status(b, skyNow()), ...(closer ? b.facts.slice(0, 1) : b.facts), travelled(s)];
  const kind = b.id === 'moon' ? 'Our Moon' : b.around ? 'Moon of Jupiter' : 'Planet';
  card.innerHTML = `<em>${kind}</em><h3></h3>${lines.map(t => `<p>${t}</p>`).join('')}
    <div class="row">${closer ? `<button class="sb" data-go>Look closer</button>` : ''}<button class="sb ghost" data-x>OK</button></div>`;
  card.querySelector('h3').textContent = b.name;
  card.querySelector('[data-go]')?.addEventListener('click', () => closeTo(b));
  card.querySelector('[data-x]').addEventListener('click', () => { card.hidden = true; });
  card.hidden = false; Sound.tone(1046, {type:'sine', dur:.12, vol:.05});
}
function placeCard(b, q){
  card.innerHTML = `<em></em><h3></h3><p></p><div class="row"><button class="sb ghost" data-x>OK</button></div>`;
  card.querySelector('em').textContent = b.name; card.querySelector('h3').textContent = q.name; card.querySelector('p').textContent = q.line;
  card.querySelector('[data-x]').addEventListener('click', () => { card.hidden = true; });
  card.hidden = false; Sound.tone(1046, {type:'sine', dur:.12, vol:.05});
}
// back out to the sky, with the world just left in view; a moon of Jupiter with its family round it
function backToSky(){
  const b = bodyShown(); if (!b) return;
  const s = sight(b, skyNow(), place);
  closeTo(null); flyTo(s.ra, s.dec, b.around ? .25 : Math.max(.003, s.radius*(b.rings ? 16 : 7)));
}
$s('sBack').addEventListener('click', backToSky);

// ---------- tonight, from here ----------
// The sky shows tonight over wherever the treehouse is: now if it's dark there, else the coming
// nightfall, held at that moment while the telescope is open. A real sky turns, and a view kept level
// with the horizon must spin to follow it, fastest overhead, so a turning sky slides away under a
// kid's hand all by itself.
const R = Math.PI/180;
let place = where(), t0 = 0, lst = 0;
const skyNow = () => t0;
// where the telescope points, as a direction from the deck; only a kid's hand moves it
const aim = {alt:35, az:180};
const facing = () => aim;
const centre = () => toSky(aim.alt, aim.az, place.lat, lst);
// Tipping down stops with the skyline two thirds of the way down the view, and tipping up stops with
// the point overhead a little way below the top. Centred, that point is where a level view has to
// spin round on the spot to turn at all.
const tall = () => 4*Math.atan(Math.tan(view.fov*R/4)*el.clientHeight/(el.clientWidth || 1))/R;
function look(alt, az){
  aim.alt = Math.max(.2*tall(), Math.min(89.5, 90 - .3*tall(), alt));
  aim.az = (az % 360 + 360) % 360;
}
// the hills along the skyline, a degree or two high
const hill = az => { const a = az*R; return 1.4 + .9*Math.sin(3*a + .7) + .5*Math.sin(7*a + 2.1) + .25*Math.sin(17*a); };
const COMPASS = [[0, 'North'], [90, 'East'], [180, 'South'], [270, 'West']];

// ---------- the overlay: twilight, the ground, the compass and the names ----------
// Brighter stars earn their names first; dimmer ones join as the view narrows. Labels are placed
// most important first and skip any spot already taken, so a wide view never turns to alphabet soup.
let placed = [];
const px = (alt, az, lst) => { const s = toSky(alt, az, place.lat, lst), p = aladin.world2pix(s.ra, s.dec); return [Math.max(-1e6, Math.min(1e6, p[0])), Math.max(-1e6, Math.min(1e6, p[1]))]; };
function overlay(w, h){
  const dpr = Math.min(devicePixelRatio, 2);
  if (namesCv.width !== Math.round(w*dpr) || namesCv.height !== Math.round(h*dpr)) { namesCv.width = Math.round(w*dpr); namesCv.height = Math.round(h*dpr); }
  const g = namesCv.getContext('2d'); g.setTransform(dpr, 0, 0, dpr, 0, 0); g.clearRect(0, 0, w, h);
  return g;
}
function drawOverlay(lst, sunAlt, ms){
  const w = el.clientWidth, h = el.clientHeight, g = overlay(w, h);
  placed = [];
  // until the Sun is 12° down the sky still glows (the same line tonight() draws), washing faint stars out
  const glow = clamp01((sunAlt + 12)/14)*.9;
  if (glow > 0) { g.fillStyle = `rgba(78,112,168,${glow})`; g.fillRect(0, 0, w, h); }
  const shown = drawBodies(g, w, h, lst, ms);
  drawGround(g, w, h, lst);
  if (!view.names) return;
  const f = view.fov, starLimit = Math.min(6.5, 1.2 + 2.6*Math.log10(100/f)) - glow*2;
  // the Moon and planets are named first, and whatever they cover goes unnamed
  for (const m of shown) {
    if (m.alt < hill(m.az)) continue;
    placed.push({box:[m.x - m.r, m.y - m.r, m.x + m.r, m.y + m.r], o:m.b, body:true, x:m.x, y:m.y});
    const tx = m.x + Math.max(m.r, 4) + 6, tw = g.measureText(m.b.name).width, box = [tx - 4, m.y - 10, tx + tw + 4, m.y + 10];
    if (m.r > w/3 || placed.some(q => q.o !== m.b && box[0] < q.box[2] && box[2] > q.box[0] && box[1] < q.box[3] && box[3] > q.box[1])) continue;
    placed.push({box, o:m.b, body:true, x:m.x, y:m.y});
    g.font = '900 14px Nunito, system-ui, sans-serif'; g.textBaseline = 'middle'; g.lineJoin = 'round';
    g.lineWidth = 3; g.strokeStyle = 'rgba(5,4,10,.85)'; g.strokeText(m.b.name, tx, m.y);
    g.fillStyle = '#ffe9a8'; g.fillText(m.b.name, tx, m.y);
  }
  const want = [];
  for (const d of deepSky) if (f < 70 || (d.mag != null && d.mag < 4.5)) want.push([d.mag != null ? d.mag - 1 : 2, d, true]);
  for (const s of stars) { if (s.mag > starLimit) break; want.push([s.mag, s, false]); }
  want.sort((a, b) => a[0] - b[0]);
  g.font = '800 13px Nunito, system-ui, sans-serif'; g.textBaseline = 'middle'; g.lineJoin = 'round';
  for (const [, o, deep] of want) {
    const hz = toHorizon(o.ra, o.dec, place.lat, lst);
    if (hz.alt < hill(hz.az)) continue;
    const p = aladin.world2pix(o.ra, o.dec);
    if (!p || p[0] < -20 || p[1] < -20 || p[0] > w + 20 || p[1] > h + 20) continue;
    const [x, y] = p, tw = g.measureText(o.name).width, box = [x - 10, y - 10, x + 14 + tw, y + 10];
    if (placed.some(q => box[0] < q.box[2] && box[2] > q.box[0] && box[1] < q.box[3] && box[3] > q.box[1])) continue;
    placed.push({box, o, deep, x, y});
    g.strokeStyle = deep ? 'rgba(217,164,65,.8)' : 'rgba(239,224,191,.55)'; g.lineWidth = 1.5;
    g.setLineDash(deep ? [3, 3] : []); g.beginPath(); g.arc(x, y, deep ? 9 : 6, 0, 7); g.stroke(); g.setLineDash([]);
    g.lineWidth = 3; g.strokeStyle = 'rgba(5,4,10,.85)'; g.strokeText(o.name, x + 12, y);
    g.fillStyle = deep ? '#f0c060' : '#efe0bf'; g.fillText(o.name, x + 12, y);
  }
}
// The Moon and planets, drawn where they are tonight from the same picture the close-up shows,
// turned so the zenith at their spot on the screen is up. The Moon is always drawn as a disc you can
// see the phase of, a little bigger than life when zoomed far out; a planet is a dot until it grows.
// Jupiter's moons are dots too, once zoomed in enough to see them apart from Jupiter.
function drawBodies(g, w, h, lst, ms){
  const out = [];
  let jupiter = null;
  for (const b of [BODIES.moon, ...PLANETS, ...MOONS]) {
    const s = sight(b, ms, place), p = aladin.world2pix(s.ra, s.dec);
    const r = s.radius*w/view.fov, reach = b.rings ? r*2.4 : r;
    if (!p || p[0] < -reach - 40 || p[1] < -reach - 40 || p[0] > w + reach + 40 || p[1] > h + reach + 40) continue;
    const [x, y] = p;
    if (b.id === 'jupiter') jupiter = {x, y, r};
    if (b.around) {
      if (!jupiter || Math.hypot(x - jupiter.x, y - jupiter.y) < Math.max(jupiter.r, 3) + 8) continue;
      out.push({b, x, y, r:2, alt:s.alt, az:s.az});
      g.fillStyle = '#f3ead2'; g.beginPath(); g.arc(x, y, Math.max(1.6, r), 0, 7); g.fill();
      continue;
    }
    out.push({b, x, y, r:Math.max(r, b.id === 'moon' ? 6 : 3), alt:s.alt, az:s.az});
    if (b.id !== 'moon' && r < 3) {
      g.fillStyle = TINT[b.id]; g.shadowColor = TINT[b.id]; g.shadowBlur = 8;
      g.beginPath(); g.arc(x, y, 2.6, 0, 7); g.fill(); g.shadowBlur = 0;
      continue;
    }
    const step = Math.min(1, view.fov/40), up = toSky(s.alt + step, s.az, place.lat, lst), q = aladin.world2pix(up.ra, up.dec);
    const turn = q ? Math.atan2(q[0] - x, y - q[1]) : 0;
    // past a thousand pixels the picture only gets blurrier, so it's stretched instead of drawn bigger
    const drawnR = Math.min(Math.max(r, b.id === 'moon' ? 6 : 3), 1000), img = upClose.portrait(b, ms, place, drawnR), k = Math.max(r, drawnR)/Math.round(drawnR);
    g.save(); g.translate(x, y); g.rotate(turn); g.drawImage(img, -img.width*k/2, -img.height*k/2, img.width*k, img.height*k); g.restore();
  }
  return out;
}

// The skyline is traced all the way round, finely where the telescope is looking. Seen through the
// projection the ground can land inside that loop or outside it, so whichever side holds the
// point straight down is the side that gets filled.
function drawGround(g, w, h, lst){
  const here = facing();
  // zoomed deep the skyline's points land millions of pixels off and the side test breaks down, so a
  // view wholly above the hills (they top out near 3°) skips the ground altogether
  if (here.alt - view.fov*Math.max(1, h/w) > 3.1) return;
  const near = Math.min(180, view.fov*1.5 + 5), fine = Math.min(1, view.fov/60), line = new Path2D();
  let first = true;
  for (let d = -180; d < 180; d += Math.abs(d) < near ? fine : 2) {
    const az = here.az + d, [x, y] = px(hill(az), az, lst);
    if (first) { line.moveTo(x, y); first = false; } else line.lineTo(x, y);
  }
  line.closePath();
  const [nx, ny] = px(-90, 0, lst), ground = new Path2D();
  if (!g.isPointInPath(line, nx, ny)) ground.rect(-2e6, -2e6, 4e6, 4e6);
  ground.addPath(line);
  g.fillStyle = '#0d0b16'; g.fill(ground, 'evenodd');
  g.strokeStyle = 'rgba(150,140,200,.55)'; g.lineWidth = 2; g.stroke(line);
  g.font = '900 13px Nunito, system-ui, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'top'; g.fillStyle = '#d9a441';
  for (const [az, name] of COMPASS) {
    const [x, y] = px(hill(az), az, lst), [x2, y2] = px(hill(az) - 1, az, lst), len = Math.hypot(x2 - x, y2 - y) || 1;
    if (x > -40 && x < w + 40 && y > -40 && y < h + 40) g.fillText(name, x + (x2 - x)/len*14, y + (y2 - y)/len*14);
  }
  g.textAlign = 'start';
}

function tap(x, y){
  const b = bodyShown();
  if (b) {
    const hit = upClose.tapped(x, y, el.clientWidth, el.clientHeight);
    if (!hit) card.hidden = true; else if (hit.moon) bodyCard(hit.moon, true); else if (hit.place) placeCard(b, hit.place); else bodyCard(b, false);
    return;
  }
  const hit = placed.find(q => x >= q.box[0] - 6 && x <= q.box[2] + 6 && y >= q.box[1] - 6 && y <= q.box[3] + 6);
  if (!hit) { card.hidden = true; return; }
  if (hit.body) { bodyCard(hit.o, true); return; }
  const o = hit.o; let kind, lines;
  if (hit.deep) {
    kind = o.kind;
    lines = [KIND[o.kind]];
  } else {
    kind = 'star';
    lines = [`${COLOR[o.sp] ? `It’s ${COLOR[o.sp]}` : 'A star'}${o.con ? `, in ${o.con}` : ''}.`];
    if (o.mag < 1) lines.push('One of the brightest stars in the whole sky!');
    if (o.ly) lines.push(`Its light took ${o.ly.toLocaleString()} year${o.ly === 1 ? '' : 's'} to reach you.`);
  }
  const sub = hit.deep ? (o.m && o.m !== o.name ? o.m.replace('M', 'Messier ') : '') : 'Star';
  card.innerHTML = `${sub ? `<em>${sub}</em>` : ''}<h3></h3>${lines.map(t => `<p>${t}</p>`).join('')}
    <div class="row"><button class="sb" data-go>Fly there</button><button class="sb ghost" data-x>OK</button></div>`;
  card.querySelector('h3').textContent = o.name;
  card.querySelector('[data-go]').addEventListener('click', () => { card.hidden = true; flyTo(o.ra, o.dec, Math.min(view.fov, FLY[kind] || 1)); });
  card.querySelector('[data-x]').addEventListener('click', () => { card.hidden = true; });
  card.hidden = false; Sound.tone(1046, {type:'sine', dur:.12, vol:.05});
}

// ---------- steering: drag to turn, pinch or scroll to zoom, tap to ask what something is ----------
let wantFov = view.fov, fly = null;
const zoom = k => { if (bodyShown()) { upClose.zoom(k); return; } fly = null; wantFov = Math.min(150, Math.max(.002, wantFov*k)); };
// A drag across the screen turns the telescope by about the width of what it sees. Looking high, a
// sideways turn swings round the point overhead, and following the finger exactly would whirl it,
// so up there it turns slower than the finger.
function turn(dx, dy){
  const k = view.fov/el.clientWidth;
  look(aim.alt + dy*k, aim.az - dx*k/Math.max(.5, Math.cos(aim.alt*R)));
}
function flyTo(ra, dec, fov){
  fly = {ra, dec, fov};
  Sound.tone(523, {type:'triangle', dur:.3, vol:.05}); Sound.tone(784, {type:'triangle', t:.12, dur:.3, vol:.05});
}
// swing round to the target first, then zoom in once it's on screen
function flying(dt){
  const to = toHorizon(fly.ra, fly.dec, place.lat, lst), k = Math.min(1, dt*3), alt = Math.min(89.5, to.alt);
  const daz = ((to.az - aim.az + 540) % 360) - 180, left = Math.hypot(daz*Math.cos(aim.alt*R), alt - aim.alt);
  if (left < view.fov*.3) wantFov = fly.fov;
  if (left < .0005 && Math.abs(Math.log(view.fov/fly.fov)) < .01) { look(alt, to.az); fly = null; return; }
  look(aim.alt + (alt - aim.alt)*k, aim.az + daz*k);
}

const pointers = new Map();
let drag = null;
const span = () => { const [a, b] = [...pointers.values()]; return Math.hypot(a.x - b.x, a.y - b.y) || 1; };
glass.addEventListener('pointerdown', e => {
  glass.setPointerCapture(e.pointerId); pointers.set(e.pointerId, {x:e.clientX, y:e.clientY});
  drag = {moved:0, span:pointers.size > 1 ? span() : 0, fov:wantFov}; fly = null; glass.classList.add('dragging'); Sound.init();
});
glass.addEventListener('pointermove', e => {
  const p = pointers.get(e.pointerId); if (!p || !drag) return;
  const dx = e.clientX - p.x, dy = e.clientY - p.y; p.x = e.clientX; p.y = e.clientY; drag.moved += Math.hypot(dx, dy);
  if (pointers.size > 1) {
    if (!drag.span) return;
    if (bodyShown()) { const now = span(); upClose.zoom(drag.span/now); drag.span = now; }
    else wantFov = view.fov = Math.min(150, Math.max(.002, drag.fov*drag.span/span()));
    return;
  }
  if (bodyShown()) upClose.pan(dx, dy); else if (aladin) turn(dx, dy);
});
const lift = e => {
  if (!pointers.delete(e.pointerId)) return;
  if (drag && drag.moved < 8 && pointers.size === 0) tap(e.clientX, e.clientY);
  if (pointers.size === 0) { drag = null; glass.classList.remove('dragging'); }
  else drag = {moved:99, span:span(), fov:wantFov};
};
glass.addEventListener('pointerup', lift); glass.addEventListener('pointercancel', lift);
// A mouse wheel zooms. A trackpad speaks in wheel events too: two fingers sliding turn the telescope
// the way a drag does, and a pinch, which browsers send as a wheel with Ctrl held, zooms with the
// fingers. A wheel clicks in big even steps straight up and down; a trackpad glides in small ones.
let pad = -1e9, pinched = -1e9;
glass.addEventListener('wheel', e => {
  e.preventDefault(); fly = null;
  const unit = e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? el.clientHeight : 1, dx = e.deltaX*unit, dy = e.deltaY*unit;
  if (e.ctrlKey) { pinched = e.timeStamp; zoom(Math.exp(dy*.01)); return; }
  if (e.deltaMode === 0 && (dx || !Number.isInteger(dy) || Math.abs(dy) < 50)) pad = e.timeStamp;
  if (e.timeStamp - pad < 400) { if (bodyShown()) upClose.pan(-dx, -dy); else if (aladin) turn(-dx, -dy); return; }
  zoom(dy > 0 ? 1.15 : 1/1.15);
}, {passive:false});
// Safari tells of a trackpad pinch with its own gesture events instead; a touch screen's pinch is
// already handled by the pointers above
let gesture = 1;
glass.addEventListener('gesturestart', e => { e.preventDefault(); gesture = 1; });
glass.addEventListener('gesturechange', e => {
  e.preventDefault();
  if (pointers.size < 2 && e.timeStamp - pinched > 300) zoom(gesture/e.scale);
  gesture = e.scale;
});

$s('sIn').addEventListener('click', () => zoom(.5)); $s('sOut').addEventListener('click', () => zoom(2));
$s('sNames').addEventListener('click', () => { view.names = !view.names; $s('sNames').setAttribute('aria-pressed', view.names); upClose.refresh(); });
$s('sClose').addEventListener('click', () => close());

// Aladin redraws every frame for as long as it lives and has no off switch, so closing the telescope
// parks its frame callback and opening hands it back; a slow computer shouldn't pay for a hidden sky
let redraw = null, stopped = false;
function park(){ redraw = redraw || aladin.view.redrawClbk; aladin.view.redrawClbk = () => { stopped = true; }; }
// reopened before the parked frame came round, the loop never stopped and only needs its callback back
function resume(){ if (!redraw) return; aladin.view.redrawClbk = redraw; if (stopped) requestAnimationFrame(redraw); stopped = false; }

// ---------- the frame loop, while the telescope is open ----------
let raf = 0, drawn = '', last = 0, sent = '', clockShown = '', kept = 0;
function loop(now){
  if (game.activity !== 'telescope') return;
  const dt = Math.min(.1, (now - last)/1000 || 0); last = now;
  const ms = skyNow(), b = bodyShown();
  steer(b, dt);
  if (b) closeUp(b, ms, dt); else if (aladin) starsUp(ms, dt);
  const shown = localTime(place, ms);
  if (shown !== clockShown) { clockShown = shown; $s('sWhere').textContent = `Tonight · ${place.name} · ${shown}`; }
  // the time spent looking is saved as it goes, so closing the tab doesn't lose it
  if (now - kept > 20000) { keep(); kept = now; }
  lenses();
  raf = requestAnimationFrame(loop);
}
function closeUp(b, ms, dt){
  const w = el.clientWidth, h = el.clientHeight;
  if (upClose.draw(ms, place, w, h, dt)) upClose.names(overlay(w, h), ms, place, w, h, view.names);
  const minute = `${b.id}:${Math.floor(ms/60000)}`;
  if (minute !== told) {
    told = minute; $s('sTip').textContent = [status(b, ms), upClose.lenses(b)[nearLens]?.tip].filter(Boolean).join(' ');
  }
}
// arrows glide while held, about a third of a view a second, easing in and out
const held = new Set(), glide = {x:0, y:0};
function steer(b, dt){
  let x = 0, y = 0;
  for (const k of held) { x += TURN[k][0]; y += TURN[k][1]; }
  const k = Math.min(1, dt*6); glide.x += (x - glide.x)*k; glide.y += (y - glide.y)*k;
  if (Math.abs(glide.x) + Math.abs(glide.y) < 1e-3) return;
  if (b) upClose.pan(-glide.x*el.clientHeight*.7*dt, -glide.y*el.clientHeight*.7*dt);
  else if (aladin) turn(-glide.x*el.clientWidth*.35*dt, -glide.y*el.clientWidth*.35*dt);
}
function starsUp(ms, dt){
  if (fly) flying(dt);
  if (Math.abs(Math.log(wantFov/view.fov)) > .001) { view.fov *= Math.pow(wantFov/view.fov, Math.min(1, dt*8)); aladin.setFoV(view.fov); zoomed(); }
  // zooming out raises the floor, and the view rises with it
  look(aim.alt, aim.az);
  const c = centre(), to = `${c.ra},${c.dec}`;
  if (to !== sent) {
    sent = to; aladin.gotoRaDec(c.ra, c.dec);
    // keep the way up to the zenith pointing up the screen; Aladin refuses a rotation of exactly 0
    aladin.setRotation(-parallactic(c.ra, c.dec, place.lat, lst) || 1e-6);
  }
  fade(dt);
  const at = [to, view.fov, view.names, el.clientWidth, el.clientHeight, upClose.maps].join();
  if (at !== drawn) { drawn = at; drawOverlay(lst, sunAltitude(ms, place.lat, place.lon), ms); }
}
let since = 0;
function keep(){
  const n = Date.now(); view.seconds += (n - since)/1000; since = n;
  Object.assign(view, aim);
  save('telescope', view);
}
// a sky the Sun never leaves is worth a word, or the kid wonders where the stars went
function nightNote(){
  const a = sunAltitude(t0, place.lat, place.lon), note = $s('sNote');
  note.hidden = a < -12;
  note.textContent = a > -1 ? 'The Sun never sets here at this time of year, so the sky stays bright all night!'
    : 'The sky never gets all the way dark here tonight. Only the brightest stars peek through.';
}

export async function openTelescope(){
  if (game.activity) return;
  closeDialog(); game.activity = 'telescope'; for (const k in keys) keys[k] = false; joy.x = joy.y = 0;
  document.documentElement.classList.add('stargazing'); el.hidden = false; card.hidden = true;
  el.style.animation = 'none'; void el.offsetWidth; el.style.animation = '';
  $s('sNames').setAttribute('aria-pressed', view.names);
  place = where(); since = Date.now(); t0 = tonight(place, since); lst = siderealTime(t0, place.lon); fly = null; wantFov = view.fov;
  look(view.alt, view.az); nightNote(); clockShown = '';
  Sound.duck(true); [392, 523, 659].forEach((f, i) => Sound.tone(f, {type:'sine', t:i*.12, dur:.5, vol:.05}));
  lenses(); closeTo(null);
  // the Moon and planets ship with the game, so they still work when the sky's tiles can't come down
  const sky = await boot();
  if (game.activity !== 'telescope') return;
  if (sky) { closeTo(null); aladin.setFoV(view.fov); zoomed(); }
  drawn = sent = ''; last = performance.now(); kept = last; raf = requestAnimationFrame(loop);
}
function close(){
  if (game.activity !== 'telescope') return;
  keep(); if (aladin) park();
  game.activity = null; el.hidden = true; document.documentElement.classList.remove('stargazing'); cancelAnimationFrame(raf);
  pointers.clear(); drag = null; glass.classList.remove('dragging'); held.clear();
  Sound.duck(false); clock.getDelta();
}
const TURN = {ArrowLeft:[-1, 0], ArrowRight:[1, 0], ArrowUp:[0, -1], ArrowDown:[0, 1]};
addEventListener('keydown', e => {
  if (game.activity !== 'telescope') return;
  e.stopPropagation();
  if ((e.key === ' ' || e.key === 'Enter') && e.target.hold) { e.preventDefault(); if (!e.repeat) e.target.hold.start(); }
  else if (e.key === 'Escape') { if (!card.hidden) card.hidden = true; else if (bodyShown()) backToSky(); else close(); }
  else if (e.key === '+' || e.key === '=') zoom(.5);
  else if (e.key === '-' || e.key === '_') zoom(2);
  else if (TURN[e.key]) { e.preventDefault(); fly = null; held.add(e.key); }
}, true);
addEventListener('keyup', e => {
  held.delete(e.key);
  if (game.activity !== 'telescope' || !e.target.hold || (e.key !== ' ' && e.key !== 'Enter')) return;
  e.preventDefault(); e.target.hold.stop();
}, true);
addEventListener('blur', () => held.clear());
