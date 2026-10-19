// Hoot's landform notebook, on the geography globe: every kind of landform in landforms.js, and which
// the explorer has found. Tap a name on the globe whose kind isn't in the notebook yet, and Hoot asks
// what kind of landform it is before he tells. Pick one from the notebook to read its page, or, if
// it's still to find, for Hoot's challenge to find one, with hints that lean in closer each time.
//
// real-earth.js owns the card, the names and the globe; `ui` is what it lends.

import { LANDFORMS, landformBy, landformOf } from '../earth/landforms.js';
import { arc } from '../earth/model.js';
import { choices } from './landform-quiz.js';

const a = lf => (/^[aeiou]/i.test(lf.name) ? 'an ' : 'a ') + lf.name.toLowerCase();

export function makeNotebook(room, ui){
  const {store, H, btn, on} = room, {card, esc, the, head, photoBlock, gallery} = ui;
  const found = lf => store.landforms.has(lf.id);
  // a found wonder counts towards a challenge, but has its own card
  const kindOf = it => it.ref.wonder ? landformBy(it.ref.wonder.landform) || null : it.ref.sight ? null : landformOf(it.kind);
  const titleOf = it => it.ref.place ? it.ref.place.name : it.text;
  const wikiOf = it => it.ref.place ? it.ref.place.wiki : it.ref.wonder ? it.ref.wonder.wiki : `${it.text} River`;
  const colour = lf => lf.water ? '#2a6f9e' : '#9a6a3a';

  // the one nearest the middle of the view, so a hint doesn't spin the whole globe round
  function nearest(lf, pictured){
    const v = ui.centre(), d = l => arc(v.lat, v.lon, l.lat, l.lon);
    return ui.labels().filter(l => landformOf(l.kind) === lf && (!pictured || l.ref.place?.wiki)).reduce((b, l) => !b || d(l) < d(b) ? l : b, null);
  }
  const closeUp = l => Math.min(ui.MAX_MAG, ui.magFor(l.rank)*1.3);

  function record(lf){
    if (found(lf)) return;
    store.landforms.add(lf.id); room.keep();
    room.toast(`New landform found · ${store.landforms.size} of ${LANDFORMS.length}`, `${lf.icon} ${lf.name}`);
    room.tune([523, 659, 784, 1046], {dur: .25, vol: .07});
  }

  // ---------- a name on the map, tapped ----------
  function tapped(it){
    const lf = kindOf(it), C = ui.now();
    if (C.kind === 'seek') {
      room.endTalk();
      if (lf === C.lf) {
        record(lf); ui.show({kind: 'landform', lf, it});
        room.tune([523, 659, 784, 1046, 1319], {gap: .09, dur: .3, vol: .07});
        room.story([H(`You found ${a(lf)}! That's ${the(titleOf(it))}.`), H(lf.compare || lf.means)]);
      } else {
        C.said = `That's ${the(titleOf(it))}. It isn't ${a(C.lf)}. Keep looking!`;
        room.tune([330, 262], {gap: .1, dur: .16, vol: .05}); ui.redraw(); room.story([H(C.said)]);
      }
      return true;
    }
    if (!lf || it.ref.wonder) return false;
    room.tune([784, 1046], {gap: .06, dur: .1, vol: .05});
    if (found(lf)) { ui.show({kind: 'landform', lf, it}); return true; }
    ui.show({kind: 'guess', lf, it, options: choices(lf)});
    room.story([H("Ooh, a kind of landform that isn't in my notebook yet!"), H('What kind of landform do you think this is?')]);
    return true;
  }
  // a tap on the globe away from any name, while looking for one
  function pressed(){
    const C = ui.now(); if (C.kind !== 'seek') return false;
    C.said = `To find ${a(C.lf)}, tap its name on the globe. Lean in close to see more names!`;
    room.endTalk(); ui.redraw(); room.story([H(C.said)]);
    return true;
  }

  // ---------- predict first ----------
  function drawGuess(C){
    room.setColor('#6d3b5e');
    card.innerHTML = `${head('🦉', 'Professor Hoot asks', titleOf(C.it))}
      ${photoBlock(wikiOf(C.it), 'q', {words: false})}
      <p class="gask">What kind of landform do you think this is?</p>
      <div class="gpick">${C.options.map((o, i) => `<button data-o="${i}"><b>${o.icon} ${esc(o.name)}</b></button>`).join('')}</div>
      <div class="gbtns">${btn('gTell', 'Just tell me', 'gb ghost')}</div>`;
    card.querySelectorAll('.gpick button').forEach(b => b.addEventListener('click', () => answer(C, C.options[+b.dataset.o])));
    on('gTell', () => answer(C, null));
  }
  function answer(C, pick){
    const {lf, it} = C, right = pick === lf;
    const said = !pick ? `It's ${a(lf)}!` : right ? `Yes! It's ${a(lf)}!` : `Good guess, but it isn't ${a(pick)}. It's ${a(lf)}!`;
    room.endTalk(); if (pick) room.tune(right ? [659, 784, 1046] : [392, 330], {vol: .06});
    record(lf); ui.show({kind: 'landform', lf, it, said, right});
    room.story([H(said), H(lf.means)]);
  }

  // ---------- a landform's page: about one on the map, or from the notebook ----------
  function drawLandform(C){
    const {lf, it} = C, p = it?.ref.place;
    room.setColor(colour(lf));
    const compare = lf.compare ? `<div class="gsec">Compare</div><p>${esc(lf.compare)}</p>` : '';
    if (!it) {
      const ex = C.ex;
      card.innerHTML = `${head(lf.icon, "Hoot's landform notebook", lf.name)}<p class="gask">${esc(lf.means)}</p>${compare}
        ${ex ? `<div class="gsec">Here's one: ${esc(titleOf(ex))}</div>${photoBlock(wikiOf(ex), 'l', {words: false})}` : ''}
        <div class="gbtns">${ex ? btn('gGo', 'Take me there') : ''}</div>`;
      on('gGo', () => { ui.show({kind: 'landform', lf, it: ex}); room.flyTo(ex.lat, ex.lon, closeUp(ex)); ui.ring([ex.lat, ex.lon], 1200/closeUp(ex)); });
      return;
    }
    const within = p && p.elevation ? `${p.elevation.toLocaleString()} metres high` : ui.countryAt(it.lat, it.lon)?.name || '';
    card.innerHTML = `${head(lf.icon, lf.name, titleOf(it), within)}
      ${C.said ? `<p class="gwarm ${C.right ? 'hot' : ''}">${esc(C.said)}</p>` : ''}<p class="gask">${esc(lf.means)}</p>
      ${photoBlock(wikiOf(it), 'l')}${compare}
      ${p && p.wiki ? gallery(p.wiki, 'lg') : ''}
      <div class="gbtns">${btn('gHere', 'Explore here')}${btn('gBook', "Hoot's notebook", 'gb ghost')}</div>`;
    on('gHere', () => ui.explore(it.lat, it.lon)); on('gBook', () => ui.shelf('landforms'));
  }
  const page = lf => ui.show({kind: 'landform', lf, ex: nearest(lf, true) || nearest(lf)});

  // ---------- Hoot's challenge: go and find one ----------
  function seek(lf){
    room.endTalk(); room.hidePin(); ui.show({kind: 'seek', lf, hints: 0, said: '', tip: ''});
    room.tune([392, 523, 659], {gap: .1});
    room.story([H(lf.means), H(lf.ask)]);
  }
  function drawSeek(C){
    room.setColor('#6d3b5e');
    card.innerHTML = `${head('🦉', "Hoot's challenge", `Find ${a(C.lf)}`)}
      <p class="gask">${esc(C.lf.ask)}</p><p>${esc(C.lf.means)}</p>
      ${C.said ? `<p class="gwarm">${esc(C.said)}</p>` : ''}${C.tip ? `<p class="gtry">${esc(C.tip)}</p>` : ''}
      <div class="gbtns">${btn('gHint', C.hints ? 'Another hint' : 'Give me a hint')}${btn('gStop', 'Stop the challenge', 'gb ghost')}</div>`;
    on('gHint', () => hint(C)); on('gStop', () => ui.show({kind: 'idle'}));
  }
  // first the part of the world to look in, then right up close with a gold circle round it
  function hint(C){
    const l = C.target || (C.target = nearest(C.lf)); if (!l) return;
    C.hints++; C.said = ''; room.endTalk();
    if (C.hints === 1) {
      C.tip = `There's one in ${ui.whereIs(l.lat, l.lon)}. Lean in close, and look for its name!`;
      room.flyTo(l.lat, l.lon, Math.max(1.5, closeUp(l)/5));
    } else {
      C.tip = "I've drawn a gold circle around one. Tap its name!";
      room.flyTo(l.lat, l.lon, closeUp(l)); ui.ring([l.lat, l.lon], 1200/closeUp(l));
    }
    room.tune([523, 659], {gap: .1, dur: .16, vol: .05});
    ui.redraw(); room.story([H(C.tip)]);
  }

  function chips(){
    const C = ui.now();
    return LANDFORMS.map(lf => ({icon: lf.icon, text: lf.name, color: colour(lf), found: found(lf), hunting: C.kind === 'seek' && C.lf === lf,
      label: found(lf) ? `${lf.name}, in Hoot's notebook` : `Challenge: find ${a(lf)}`,
      go: () => found(lf) ? page(lf) : seek(lf)}));
  }
  function opened(){
    if (store.landforms.size) return;
    room.story([H('This is my landform notebook! Mountains, valleys, volcanoes, rivers: every shape the land and water make has its own name.'),
      H("Tap names on the globe, and I'll ask what kind of landform each one is. Or pick one here, and I'll challenge you to find it!")]);
  }

  return {cards: {guess: drawGuess, landform: drawLandform, seek: drawSeek}, tapped, pressed, chips, opened,
    tally: () => `${store.landforms.size}/${LANDFORMS.length}`};
}
