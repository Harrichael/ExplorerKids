// Hoot's photo riddles about wonders of the world: a real photo, and where in the world is it? Hoot
// says how far off each guess is and which way to go, and draws a circle round it after a few. Once
// found, a wonder has its own card, and some have sights to lean in on. The geography globe has the
// wonders of nature, the countries globe the ones people built; `opts` says which, and how to say
// where a spot is.
//
// The card's state is the globe's own (`ui.now()` and `ui.show()`), so a riddle sits among its others.

import { judge } from './wonder-hunt.js';

export function makeRiddles(sat, opts){
  const {room, card, store, esc, head, photoBlock, gallery, MAX_MAG} = sat, H = room.H;
  const {list, word, whereIs, here, ui} = opts;
  const count = () => list.filter(w => store.wonders.has(w.id)).length;

  function chips(){
    // an unfound wonder's own icon would give its riddle away
    const C = ui.now();
    return list.map(w => ({icon: store.wonders.has(w.id) ? w.icon : '📷', found: store.wonders.has(w.id), hunting: C.kind === 'hunt' && C.w === w,
      label: store.wonders.has(w.id) ? `Go to the ${w.name}` : 'Photo riddle: where in the world?',
      text: store.wonders.has(w.id) ? w.name : 'Where in the world?',
      go: () => store.wonders.has(w.id) ? show(w) : hunt(w)}));
  }
  function hunt(w){
    ui.show({kind: 'hunt', w, misses: 0, last: null, said: ''}); room.hidePin();
    room.tune([392, 523, 659], {gap: .1});
    room.story([H(`Here's a real photo of one of the ${word.toLowerCase()}s. Where in the world do you think it is?`), H(w.clue), H('Spin the globe, then tap where you think it is!')]);
  }
  function drawHunt(C){
    const {w} = C;
    room.setColor('#6d3b5e');
    card.innerHTML = `${head('🦉', "Hoot's photo riddle", 'Where in the world?')}
      ${photoBlock(w.wiki, 'h', {words: false, alt: `A ${word.toLowerCase()}`})}<p class="gask">${esc(w.clue)}</p>
      ${C.said ? `<p class="gwarm">${esc(C.said)}</p>` : ''}${C.misses >= 2 ? `<p class="gtry">${esc(w.hint)}</p>` : ''}
      <div class="gbtns">${room.btn('gStop', 'Stop the riddle', 'gb ghost')}</div>`;
    room.on('gStop', () => ui.show({kind: 'idle'}));
  }
  function guess(lat, lon){
    const C = ui.now(), {w} = C, j = judge({lat, lon}, w, C.last);
    room.dropPin(lat, lon); room.endTalk();
    if (j.found) {
      store.wonders.add(w.id); room.keep(); sat.hideRing();
      room.toast(`${word} found · ${count()} of ${list.length}`, `${w.icon} ${w.name}`);
      room.tune([523, 659, 784, 1046, 1319], {gap: .09, dur: .3, vol: .07});
      show(w, [H(`You found it! It's the ${w.name}!`), H(w.fact)]);
      return;
    }
    C.misses++; C.last = j.km;
    const warm = j.warmer == null ? '' : j.warmer ? 'Warmer! ' : 'Colder! ';
    C.said = `${warm}That's ${whereIs(lat, lon)}. It's about ${j.about.toLocaleString()} km to the ${j.way}.`;
    const lines = [H(C.said)];
    if (C.misses === 2) lines.push(H(w.hint));
    if (C.misses >= 4) { sat.ring(w.at, Math.max(w.r, 400)); lines.push(H("I've drawn a gold circle around it for you. Tap inside it!")); }
    room.tune(j.warmer ? [523, 659] : [330, 262], {gap: .1, dur: .16, vol: .05});
    ui.redraw(); room.story(lines);
  }
  function show(w, lines){
    ui.show({kind: 'wonder', w}); room.dropPin(...w.at); room.flyTo(...w.at, w.zoom);
    if (lines) room.story(lines);
  }
  function drawWonder({w}){
    room.setColor('#d9a441');
    card.innerHTML = `${head(w.icon, word, w.name, w.where || whereIs(...w.at))}
      ${photoBlock(w.wiki, 'w')}<p class="gask">${esc(w.fact)}</p>
      ${w.sights ? `<div class="gsec">Sights to lean in on</div><div class="gsights">${w.sights.map((s, i) => `<button data-s="${i}">📍 ${esc(s.name)}</button>`).join('')}</div>` : ''}
      ${gallery(w.wiki, 'wg')}
      <div class="gbtns">${room.btn('gHere', here.label)}${room.btn('gZoom', 'Lean in close', 'gb ghost')}</div>`;
    room.on('gHere', () => here.go(...w.at));
    room.on('gZoom', () => room.flyTo(...w.at, Math.min(MAX_MAG, w.zoom*2)));
    card.querySelectorAll('.gsights button').forEach(b => b.addEventListener('click', () => goSight(w, w.sights[+b.dataset.s])));
  }

  // ---------- a wonder's sights: lean in on one part of it ----------
  function goSight(w, s){
    ui.show({kind: 'sight', w, s}); room.dropPin(...s.at); room.flyTo(...s.at, Math.max(w.zoom*2.5, 40));
    room.tune([784, 1046], {gap: .06, dur: .1, vol: .05});
  }
  function drawSight({w, s}){
    room.setColor('#d9a441');
    card.innerHTML = `${head(w.icon, `Part of the ${w.name}`, s.name)}
      ${photoBlock(s.wiki, 's', {words: false})}<p class="gask">${esc(s.line)}</p>
      ${gallery(s.wiki, 'sg')}
      <div class="gsights">${w.sights.filter(o => o !== s).map(o => `<button data-s="${w.sights.indexOf(o)}">📍 ${esc(o.name)}</button>`).join('')}</div>
      <div class="gbtns">${room.btn('gHere', here.label)}${room.btn('gWonder', `The whole ${w.name}`, 'gb ghost')}</div>`;
    room.on('gHere', () => here.go(...s.at));
    room.on('gWonder', () => show(w));
    card.querySelectorAll('.gsights button').forEach(b => b.addEventListener('click', () => goSight(w, w.sights[+b.dataset.s])));
  }

  // the names of found wonders, and their sights once leant in on; a wonder's own name, which would
  // sit on top of one of its sights, steps aside
  function names(m){
    const found = list.filter(w => store.wonders.has(w.id)), near = found.filter(w => w.sights && m >= w.zoom*.75);
    return [...found.filter(w => !near.includes(w)).map(w => ({text: w.name, kind: 'wonder', lat: w.at[0], lon: w.at[1], rank: -1.5, ref: {wonder: w}})),
      ...near.flatMap(w => w.sights.map(s => ({text: s.name, kind: 'sight', lat: s.at[0], lon: s.at[1], rank: -1.4, ref: {sight: s, wonder: w}})))];
  }
  // a wonder's or sight's name, tapped
  function tapped(it){
    if (it.ref.sight) { ui.show({kind: 'sight', w: it.ref.wonder, s: it.ref.sight}); return true; }
    if (it.ref.wonder) { ui.show({kind: 'wonder', w: it.ref.wonder}); return true; }
    return false;
  }

  return {chips, hunt, guess, show, names, tapped, count, cards: {hunt: drawHunt, wonder: drawWonder, sight: drawSight}};
}
