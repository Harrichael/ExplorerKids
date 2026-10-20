// The real Earth, as NASA's satellites photograph it, on the same room globe. Three of the room
// globe's globes are this one Earth seen for different things: the geography globe (nature.js) for
// the land and the sea, the countries globe (countries.js) for the world's nations and the people in
// them, and the weather globe (weather.js) for the sky over it, today.
//
// This owns what they share: the pictures and their sharp close-ups, the names written over it, the
// lines drawn on it, and the card's real photos. Each globe owns its lenses, its names, its card and what Hoot says.
//
// globe.js owns the room globe, the camera and the hands; `room` is what it borrows from globe.js.

import * as THREE from 'three';
import { camera, canvas } from '../core/render.js';
import { Sound } from '../core/sound.js';
import { loadGeography } from '../earth/geography.js';
import { makeCountries } from './countries.js';
import { makeCloseUp } from './close-up.js';
import { LENSES, wholeEarth } from './imagery.js';
import { makeNames } from './names.js';
import { makeNature } from './nature.js';
import { article, photoCredit, pictures } from './photos.js';
import { makeWeather } from './weather.js';

const css = document.createElement('style');
css.textContent = `
#globeNames{position:fixed;inset:0;width:100%;height:100%;pointer-events:none}
.glenses{pointer-events:auto;position:absolute;left:0;right:0;bottom:calc(52px + env(safe-area-inset-bottom,0px));display:flex;gap:6px;overflow-x:auto;padding:4px max(16px,env(safe-area-inset-left,0px));scrollbar-width:none;touch-action:pan-x}
.glenses::-webkit-scrollbar{display:none}
.glens{flex:none;font-weight:900;font-size:13px;color:var(--parch);background:rgba(26,19,32,.82);border:2px solid rgba(217,164,65,.55);border-radius:999px;padding:5px 12px;box-shadow:0 0 0 2px var(--ink)}
.glens[aria-pressed=true]{background:var(--gold);color:var(--ink);border-color:var(--gold)}
.realearth .gcredit{bottom:calc(92px + env(safe-area-inset-bottom,0px));max-width:45%}
.glenstip{position:absolute;left:max(16px,env(safe-area-inset-left,0px));max-width:50%;bottom:calc(92px + env(safe-area-inset-bottom,0px));font-weight:800;font-size:12px;color:var(--parch);text-shadow:0 1px 3px #000;pointer-events:none}
.talking .glenses,.talking .glenstip{visibility:hidden}
.gshelf{pointer-events:auto;flex:none;display:flex;gap:4px}.realearth .gfound{display:none}
.gshelf button{font-weight:900;font-size:13px;color:var(--parch);background:rgba(26,19,32,.82);border:2px solid rgba(217,164,65,.6);border-radius:999px;padding:4px 10px;white-space:nowrap;font-variant-numeric:tabular-nums}
.gshelf button[aria-pressed=true]{background:var(--gold);color:var(--ink);border-color:var(--gold)}
#gCard .gpic{position:relative;margin:0 -4px;border-radius:12px;overflow:hidden;background:#d9c9a4;border:2.5px solid var(--ink);aspect-ratio:16/10}
#gCard .gpic img{display:block;width:100%;height:100%;object-fit:cover}
#gCard .gpic.tall{aspect-ratio:4/3}
#gCard .gcap{font-size:10px;font-weight:700;color:#6b5a6e;line-height:1.3;overflow-wrap:anywhere}
#gCard .gsec{font-weight:900;font-size:12px;letter-spacing:1.1px;text-transform:uppercase;color:#6d3b5e;margin-top:2px}
#gCard .gbadge{display:inline-flex;align-items:center;gap:5px;font-weight:900;font-size:13px;background:var(--c,#ccc);border:2px solid var(--ink);border-radius:999px;padding:1px 9px 1px 4px;color:var(--ink)}
@media (min-aspect-ratio:1/1){.realearth #gCard{max-height:calc(100% - 74px - 150px - env(safe-area-inset-top,0px))}}
.gshots{display:flex;gap:6px;overflow-x:auto;padding-bottom:4px;touch-action:pan-x}
.gshots button{flex:none;width:84px;height:62px;padding:0;border:2.5px solid var(--ink);border-radius:10px;overflow:hidden;background:#d9c9a4}
.gshots button[aria-pressed=true]{box-shadow:0 0 0 3px var(--gold)}
.gshots img{display:block;width:100%;height:100%;object-fit:cover}
.gsights{display:flex;flex-wrap:wrap;gap:6px}
.gsights button{font-weight:900;font-size:13px;color:var(--ink);background:#fbf4e2;border:2px solid var(--ink);border-radius:999px;padding:3px 11px}
.gwarm{font-weight:900;font-size:15px;color:#b5552f}.gwarm.hot{color:#2f7a3a}
#gCard .gfacts{display:grid;grid-template-columns:auto 1fr;gap:4px 8px;font-weight:800;font-size:14px;line-height:1.35;margin:0}
#gCard .gfacts dt{font-size:16px}
#gCard .gfacts dd{margin:0}
#gCard .gfacts small{display:block;font-size:12px;color:#5a4a5e}
.gchoices{display:grid;grid-template-columns:repeat(auto-fill,minmax(120px,1fr));gap:6px}
.gchoices button{font-weight:900;font-size:14px;color:var(--ink);background:#fbf4e2;border:2.5px solid var(--ink);border-radius:12px;padding:7px 8px;line-height:1.25}
.gchoices button.right{box-shadow:0 0 0 3px #3e9b54}.gchoices button.wrong{box-shadow:0 0 0 3px #c4473a}.gchoices button.dim{opacity:.55}
@media (max-aspect-ratio:1/1){.glenstip{max-width:calc(100% - 140px)}#gCard .gpic{aspect-ratio:16/8}.gshelf span{display:none}}`;
document.head.appendChild(css);

// leaning in past where the satellites stop getting sharper (about 48) is only for telling a
// wonder's sights apart
const RAD = Math.PI/180, MAX_MAG = 96;
// Natural Earth says at which web-map zoom each name first shows; the whole globe in view is about zoom 2
const magFor = min => Math.max(1, 2**(min - 2.4));
const esc = s => String(s).replace(/[&<>"]/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;'})[c]);
// 'That's the Pacific Ocean', 'the United States of America', but 'Lake Victoria', 'France'
const the = name => /^(the |lake )/i.test(name) || !/ocean|sea$|gulf|bay$|united|republic|kingdom|islands$|netherlands|philippines|emirates|bahamas/i.test(name) ? name : 'the ' + name;
const offline = '<p class="gtry">The pictures come over the internet, and it isn\'t answering. Try again in a moment!</p>';

export function makeRealEarth(room){
  const {card, hud, globeBall, R, surface, store} = room;
  // just above the 3D world, and under everything else: Hoot's words, the card, the buttons
  const names = makeNames(); canvas.after(names.el);
  names.el.hidden = true;
  const bar = document.createElement('div'); bar.className = 'glenses'; bar.setAttribute('role', 'group'); bar.setAttribute('aria-label', 'Ways to see the Earth');
  const tip = document.createElement('div'); tip.className = 'glenstip';
  // beside the chips along the bottom: each globe's own buttons for what its chips are about
  const shelf = document.createElement('div'); shelf.className = 'gshelf'; shelf.setAttribute('role', 'group');
  hud.querySelector('#gChips').before(shelf);
  hud.append(tip, bar); tip.hidden = bar.hidden = shelf.hidden = true;

  // ---------- on the globe: its pictures, a close-up, borders, coasts and rivers, and a ring ----------
  const layer = new THREE.Group(); layer.visible = false; globeBall.add(layer);
  // photos of the Earth are already lit by the Sun, so the room's lamps don't shade them again
  const skin = new THREE.MeshBasicMaterial({color: 0xffffff});
  let maps = null, lens = null, textures = new Map();
  const zoom = makeCloseUp(globeBall, R);
  const lines = (polylines, color, opacity, lift) => {
    const pts = [];
    for (const l of polylines) for (let i = 0; i + 3 < l.length; i += 2) pts.push(surface(l[i + 1], l[i]).multiplyScalar(R*lift), surface(l[i + 3], l[i + 2]).multiplyScalar(R*lift));
    const m = new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(pts), new THREE.LineBasicMaterial({color, transparent: true, opacity, depthWrite: false}));
    layer.add(m); return m;
  };
  let borders = null, coasts = null, rivers = [];
  const ring = new THREE.Mesh(new THREE.RingGeometry(.92, 1, 64), new THREE.MeshBasicMaterial({color: 0xffd36b, transparent: true, side: THREE.DoubleSide, depthWrite: false}));
  ring.visible = false; layer.add(ring);

  async function load(){
    if (maps) return maps;
    const [geo, earth] = await Promise.all([loadGeography(), room.earth()]);
    if (maps) return maps;
    borders = lines(geo.borders, 0xfff4d6, .7, 1.0015);
    coasts = lines(earth.land, 0xbfe0ff, .45, 1.0012);
    // rivers come out with zoom, the great ones first, like their names
    const byMag = new Map();
    for (const r of geo.rivers) { const k = Math.round(magFor(r.min)); (byMag.get(k) || byMag.set(k, []).get(k)).push(...r.lines); }
    rivers = [...byMag].map(([k, ls]) => Object.assign(lines(ls, 0x8fd0ff, .75, 1.001), {mag: k}));
    maps = {geo, earth};
    for (const g of Object.values(globes)) g.loaded?.(maps);
    return maps;
  }

  function showLenses(){
    bar.replaceChildren(...g.lenses.map(l => {
      const b = document.createElement('button'); b.className = 'glens'; b.dataset.id = l.id; b.textContent = l.name; b.title = l.tip;
      b.addEventListener('click', () => { setLens(l.id); Sound.tone(880, {type: 'triangle', dur: .08, vol: .05}); });
      return b;
    }));
  }
  async function setLens(id){
    const l = lens = g.lenses.find(x => x.id === id) || g.lenses[0], was = g;
    store.lenses[g.id] = l.id; room.keep(); tip.textContent = l.tip;
    bar.querySelectorAll('.glens').forEach(b => b.setAttribute('aria-pressed', b.dataset.id === l.id));
    zoom.reset(); drawnAt = '';
    g.lensChanged?.(l);
    // a live lens's picture is of now, so it's painted afresh once its data is
    const key = l.id + (l.stamp ? l.stamp() : '');
    try {
      await load();
      if (!textures.has(key)) textures.set(key, wholeEarth(l, maps));
      // a live lens waits on its data, which can be slow; NASA's plain photo of the Earth stands in
      if (l.data) {
        const base = LENSES[0];
        if (!textures.has(base.id)) textures.set(base.id, wholeEarth(base, maps));
        Promise.race([textures.get(key).then(() => null), textures.get(base.id)]).then(t => {
          if (t && lens === l && g === was && g.on && globeBall.material !== skin) { skin.map = t; skin.needsUpdate = true; globeBall.material = skin; }
        }, () => {});
      }
      const t = await textures.get(key);
      if (lens !== l || g !== was || !g.on) return;
      skin.map = t; skin.needsUpdate = true; globeBall.material = skin;
      room.credit([`Pictures: ${l.credit}`, ...g.credits, ...maps.geo.credits, ...maps.earth.credits].join(' · '));
    } catch (e) { console.warn('real earth:', e); textures.delete(key); if (lens === l && g.on) room.toast('The pictures need the internet', 'Try again in a moment'); }
    lineUp();
    room.redraw();
  }
  // which lines show: a globe's own, and the coasts on a dark picture, which needs them to be read
  function lineUp(){
    if (!maps) return;
    borders.visible = !!g.lines.borders; coasts.visible = !!lens.coasts;
    for (const r of rivers) r.visible = false;
  }

  // ---------- names ----------
  const shown = new THREE.Vector3(), normal = new THREE.Vector3(), toCam = new THREE.Vector3(), mid = new THREE.Vector3();
  function project(lat, lon){
    shown.copy(surface(lat, lon)).multiplyScalar(R); globeBall.localToWorld(shown);
    normal.copy(shown).sub(globeBall.getWorldPosition(mid)).normalize(); toCam.copy(camera.position).sub(shown).normalize();
    if (normal.dot(toCam) < .12) return null;
    shown.project(camera);
    return [(shown.x + 1)/2*innerWidth, (1 - shown.y)/2*innerHeight];
  }
  let drawnAt = '';
  function drawNames(){
    const m = room.view.mag, e = globeBall.matrixWorld.elements;
    const key = [e[0], e[1], e[2], e[4], m, innerWidth, innerHeight, camera.position.x, camera.position.y, lens.id, g.nameKey()].map(v => typeof v === 'number' ? v.toFixed(4) : v).join();
    if (key === drawnAt) return; drawnAt = key;
    // a name with a rank below 0 always shows; the rest come out with zoom
    names.draw(g.names(m).filter(l => l.rank < 0 || magFor(l.rank) <= m*1.1), project);
  }

  // ---------- the card's building blocks ----------
  const head = (icon, kind, title, within) => `<div class="gtop"><span class="gicon" aria-hidden="true">${icon}</span><div><div class="gkind">${esc(kind)}</div><h3>${esc(title)}</h3>${within ? `<div class="gwithin">${esc(within)}</div>` : ''}</div></div>`;
  // A photo, its first words and its credit, filled in when the article arrives: the first of the
  // titles there's an article for. A riddle's photo comes without words, which would name it.
  function photoBlock(titles, slot, {words = true, alt} = {}){
    titles = [].concat(titles).filter(Boolean);
    if (!titles.length) return '';
    const find = async () => { for (const t of titles) { const a = await article(t); if (a) return [t, a]; } return []; };
    find().then(([title, a]) => {
      const el = card.querySelector(`[data-slot="${slot}"]`); if (!el) return;
      if (!a || (!a.photo && !words)) { el.remove(); return; }
      el.innerHTML = `${a.photo ? `<div class="gpic"><img alt="${esc(alt || title)}" src="${esc(a.photo.src)}"></div><div class="gcap" data-credit></div>` : ''}${words && a.text ? `<p>${esc(a.text)}</p>` : ''}`;
      if (a.photo) photoCredit(a.photo).then(c => { const cr = el.querySelector('[data-credit]'); if (cr) cr.textContent = c; });
    }, () => { const el = card.querySelector(`[data-slot="${slot}"]`); if (el) el.innerHTML = offline; });
    return `<div data-slot="${slot}"><div class="gpic"></div></div>`;
  }
  // A strip of an article's other photos; tapping one shows it big, with its caption and who took it.
  // Only for articles whose pictures are of the thing itself. Given several titles, it strings
  // their photos together, and with tabs, each tab is its own titles.
  function gallery(titles, slot, {heading = 'More real photos', tabs} = {}){
    const sets = tabs || [{titles}];
    const fill = (el, list) => {
      const strip = el.querySelector('.gshots'), big = el.querySelector('.gbig');
      big.innerHTML = '';
      strip.innerHTML = list.length ? list.map((p, i) => `<button data-i="${i}" aria-pressed="false" aria-label="${esc(p.caption || 'Photo ' + (i + 1))}"><img alt="" loading="lazy" src="${esc(p.small)}"></button>`).join('') : '<span class="gcap">No photos for this one.</span>';
      strip.querySelectorAll('button').forEach(b => b.addEventListener('click', () => {
        const p = list[+b.dataset.i], open = b.getAttribute('aria-pressed') === 'true';
        strip.querySelectorAll('button').forEach(o => o.setAttribute('aria-pressed', 'false'));
        Sound.tone(880, {type: 'triangle', dur: .06, vol: .04});
        if (open) { big.innerHTML = ''; return; }
        b.setAttribute('aria-pressed', 'true');
        big.innerHTML = `<div class="gpic tall"><img alt="${esc(p.caption)}" src="${esc(p.src)}"></div>${p.caption ? `<p>${esc(p.caption)}</p>` : ''}<div class="gcap" data-credit></div>`;
        photoCredit(p).then(c => { const cr = big.querySelector('[data-credit]'); if (cr) cr.textContent = c; });
      }));
    };
    // the same photo often illustrates several of the articles
    const photosOf = ts => Promise.all([].concat(ts).filter(Boolean).map(t => pictures(t).catch(() => []))).then(ls => {
      const seen = new Set(); return ls.flat().filter(p => !seen.has(p.file) && seen.add(p.file)).slice(0, 18);
    });
    const show = i => {
      const el = card.querySelector(`[data-slot="${slot}"]`); if (!el) return;
      el.querySelectorAll('.gtabs button').forEach((b, k) => b.setAttribute('aria-pressed', k === i));
      photosOf(sets[i].titles).then(list => {
        const now = card.querySelector(`[data-slot="${slot}"]`); if (now !== el) return;
        if (!tabs && list.length < 2) { el.remove(); return; }
        fill(el, list);
      });
    };
    setTimeout(() => {
      const el = card.querySelector(`[data-slot="${slot}"]`); if (!el) return;
      el.querySelectorAll('.gtabs button').forEach((b, i) => b.addEventListener('click', () => { Sound.tone(880, {type: 'triangle', dur: .06, vol: .04}); show(i); }));
      show(0);
    });
    return `<div data-slot="${slot}"><div class="gsec">${esc(heading)}</div>${tabs ? `<div class="gsights gtabs" role="group">${tabs.map(t => `<button aria-pressed="false">${esc(t.name)}</button>`).join('')}</div>` : ''}<div class="gbig"></div><div class="gshots"></div></div>`;
  }
  function showRing(at, km){
    const n = surface(...at), k = km/6371*R*1.6;
    ring.position.copy(n).multiplyScalar(R*1.002); ring.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), n); ring.scale.setScalar(k); ring.visible = true;
  }

  // ---------- the three globes, and what they share ----------
  const sat = {room, card, store, esc, the, head, photoBlock, gallery, offline, MAX_MAG, magFor, layer, globeBall, R, surface, project,
    maps: () => maps, centre: () => zoom.centre(), ring: showRing, hideRing: () => { ring.visible = false; },
    shelf, lens: () => lens, setLens: id => setLens(id), renamed: () => { drawnAt = ''; }, redraw: () => room.redraw()};
  const globes = {geo: makeNature(sat), countries: makeCountries(sat), weather: makeWeather(sat)};
  let g = globes.geo;

  function draw(){
    room.setColor(null);
    if (!maps) { card.innerHTML = '<div class="ghint">Bringing the Earth down from space…</div>'; return; }
    g.draw();
  }

  // ---------- coming and going ----------
  async function enter(kind){
    if (g.on) leave();
    g = globes[kind]; g.on = true;
    hud.classList.add('realearth', kind); layer.visible = true; names.el.hidden = false; tip.hidden = bar.hidden = shelf.hidden = false;
    shelf.setAttribute('aria-label', g.shelfLabel); shelf.replaceChildren();
    drawnAt = ''; ring.visible = false; showLenses(); lineUp(); g.enter();
    await setLens(store.lenses[kind]);
    if (g.on) draw();
  }
  function leave(){
    if (!g.on) return;
    g.leave(); g.on = false;
    hud.classList.remove('realearth', g.id); layer.visible = false; names.el.hidden = true; names.clear(); tip.hidden = bar.hidden = shelf.hidden = true;
    zoom.reset(); ring.visible = false; room.credit('');
  }

  // a tap: a name if it's on one, else wherever on the globe it landed
  function tap(x, y){ const it = names.hit(x, y); if (!it) return false; return g.tap(it); }
  function press(lat, lon){ if (maps) g.press(lat, lon); }
  // Esc: whatever the globe's showing, then it's the room's to handle
  const back = () => g.back();

  function frame(dt, still){
    if (!g.on || !maps) return;
    const m = room.view.mag;
    if (g.lines.rivers) for (const r of rivers) r.visible = m >= r.mag;
    if (ring.visible) ring.material.opacity = .6 + Math.sin(performance.now()/240)*.35;
    g.frame?.(dt);
    drawNames();
    zoom.frame(dt, still, m, lens, maps);
  }

  return {enter, leave, draw, chips: () => g.on && g.chips(), tap, press, back, frame, MAX_MAG};
}
