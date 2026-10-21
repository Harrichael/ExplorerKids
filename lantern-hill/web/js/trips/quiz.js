// Dr. Sparks's Explorer Check: her clipboard, with a worksheet on it that fills the screen. Each
// question is written on the sheet with who in the class is asking it, and the answers sit under it
// as drawn cards to tap, click, or pick with a number key. A wrong card is crossed out in pencil and
// Dr. Sparks writes a hint; the right one is ringed, and on the first try it earns a star.
//
//   const {got, of, perfect} = await explorerCheck(trip.quiz, found, {done:'Back to my seat'});
//   story(cheers(got, of), ...);
//
// trip.quiz is the trip's bank (see tectonics/quiz.js): its questions(found) draws this check's
// questions, and the best score is kept under its key. `perfect` is a first perfect score.
//
// Mashing must not breeze through, and there is no "are you sure?". Instead the cards only wake once
// the question has been written out; a wrong pick freezes the rest until the hint is written; and
// "Next" waits for the cheer to be written, down in the corner away from the cards. A child who
// taps at random still gets every answer in the end, just without the stars.

import { PERSONA } from '../characters/cast.js';
import { Sound } from '../core/sound.js';
import { load, save } from '../save.js';
import { game } from '../state.js';

const el = document.createElement('div'); el.id = 'xcheck'; el.hidden = true; el.setAttribute('role', 'dialog'); el.setAttribute('aria-label', "Dr. Sparks's Explorer Check");
el.innerHTML = `<div class="board"><div class="clip"></div><div class="sheet">
  <header><span class="ttl">Dr. Sparks's Explorer Check</span><span class="num"></span><span class="xstars"></span><button class="away" aria-label="Put it away">Put away</button></header>
  <div class="ask"><span class="who"></span><span class="secret">From a secret you found!</span></div>
  <h2 class="q"></h2>
  <div class="cards"></div>
  <div class="foot"><p class="note"></p><button class="next wbtn"></button></div>
</div></div>`;
document.body.append(el);
const $ = s => el.querySelector(s), sheet = $('.sheet'), num = $('.num'), starsEl = $('.xstars'), whoEl = $('.who'), secretEl = $('.secret'),
  qEl = $('.q'), cardsEl = $('.cards'), noteEl = $('.note'), nextEl = $('.next'), awayEl = $('.away');

const STAR = '<svg viewBox="-12 -12 24 24" aria-hidden="true"><path d="M0-10.5 3 -3.4 10.6-3.2 4.6 1.6 6.6 9.2 0 4.9-6.6 9.2-4.6 1.6-10.6-3.2-3-3.4Z"/></svg>';
const reduced = matchMedia('(prefers-reduced-motion: reduce)');
const sleep = ms => new Promise(r => setTimeout(r, ms));

// letter by letter, like it's being written, after `lead` (who is speaking). Without motion it's all
// there at once but takes as long: the wait is what keeps mashing at bay, so there's no tap to hurry it.
async function write(node, text, {lead = '', cps = 48} = {}){
  const shown = document.createElement('span'), rest = document.createElement('span'); rest.className = 'rest';
  node.innerHTML = lead; node.append(shown, rest);
  if (reduced.matches) { shown.textContent = text; await sleep(text.length*1000/cps); return; }
  for (let n = 1; n <= text.length; n++) { shown.textContent = text.slice(0, n); rest.textContent = text.slice(n); await sleep(1000/cps); }
}
function tag(id){ const p = PERSONA[id]; return `<b class="xtag" style="--dot:${p.dot}">${p.name}</b>`; }
function paintStars(got, of, now = -1){ starsEl.innerHTML = Array.from({length:of}, (_, i) => `<i class="${i < got ? 'on' : ''}${i === now ? ' pop' : ''}">${STAR}</i>`).join(''); }

export function explorerCheck(quiz, found, {done = 'All done!'} = {}){
  const qs = quiz.questions(found), of = qs.length;
  let got = 0, quit = false, onKey = null, wake = () => {};
  el.hidden = false; el.classList.remove('end'); game.cutscene = true;
  Sound.tone(392, {type:'triangle', dur:.15, vol:.07}); Sound.tone(587, {type:'triangle', t:.12, dur:.25, vol:.07});
  const key = e => { e.stopPropagation(); if (onKey) onKey(e); };
  addEventListener('keydown', key, true);
  awayEl.hidden = false; awayEl.onclick = () => { quit = true; wake(); };
  // resolves when the explorer does something: picks a card (its index), presses Next, or puts the sheet away
  const until = setup => new Promise(r => { wake = v => { onKey = null; wake = () => {}; r(v); }; setup(wake); });

  async function one(q, n){
    num.textContent = `Question ${n + 1} of ${of}`; paintStars(got, of);
    whoEl.innerHTML = `${tag(q.who)} asks:`; secretEl.hidden = !q.secret;
    noteEl.innerHTML = ''; nextEl.hidden = true; qEl.textContent = '';
    const order = q.answers.map((a, i) => i).sort(() => Math.random() - .5);
    const cards = order.map((ai, k) => {
      const [label, draw] = q.answers[ai], b = document.createElement('button');
      b.className = 'xcard sleep'; b.disabled = true; b.style.setProperty('--k', k); b.dataset.k = k + 1;
      const cv = document.createElement('canvas'); cv.width = 480; cv.height = 340;
      const c = cv.getContext('2d'); c.scale(2, 2); draw(c, 240, 170);
      b.innerHTML = `<span class="k">${k + 1}</span>`; b.append(cv);
      const lab = document.createElement('span'); lab.className = 'lab'; lab.textContent = label; b.append(lab);
      b.insertAdjacentHTML('beforeend', '<svg class="mark" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true"><path class="x" pathLength="1" d="M14 16 Q50 52 86 84 M84 14 Q48 50 16 86"/><path class="o ink" pathLength="1" d="M76 12 L84 22 L97 2"/><path class="o" pathLength="1" d="M76 12 L84 22 L97 2"/></svg>');
      b.right = ai === 0; return b;
    });
    cardsEl.className = `cards n${cards.length}`; cardsEl.replaceChildren(...cards);
    await write(qEl, q.q, {cps:40});
    // the cards are dealt onto the sheet once the question is written, and wake as they land
    await sleep(250); if (quit) return;
    cards.forEach(b => b.classList.replace('sleep', 'deal'));
    await sleep(380 + cards.length*120);
    let missed = false;
    for (;;) {
      if (quit) return;
      const live = cards.filter(b => !b.classList.contains('no'));
      live.forEach(b => b.disabled = false);
      const pick = await until(go => {
        live.forEach(b => b.onclick = () => go(b));
        onKey = e => { const b = cards[+e.key - 1]; if (b && !b.disabled && live.includes(b)) go(b); };
      });
      cards.forEach(b => { b.onclick = null; b.disabled = true; });
      if (quit || !pick) return;
      if (pick.right) {
        if (!missed) got++;
        pick.classList.add('yes'); paintStars(got, of, missed ? -1 : got - 1);
        [659, 880, 1175].forEach((f, k) => Sound.tone(f, {type:'triangle', t:k*.06, dur:.25, vol:.09}));
        cards.forEach(b => { if (b !== pick) b.classList.add('dim'); });
        await write(noteEl, `${missed ? 'You got it!' : 'First try!'} ${q.yay}`, {lead:tag(q.who)});
        break;
      }
      missed = true; pick.classList.add('no');
      Sound.tone(520, {type:'square', dur:.2, vol:.05, f2:260, cut:1600}); Sound.tone(150, {dur:.3, vol:.12, f2:90});
      await write(noteEl, `Hmm, not quite! ${q.hint} Try another card!`, {lead:tag('sparks')});
      await sleep(350);
    }
    // Next sits in the corner, away from the cards, and only once the cheer is written
    await sleep(500); if (quit) return;
    nextEl.textContent = n + 1 < of ? 'Next question' : 'See my stars!'; nextEl.hidden = false; nextEl.focus({preventScroll:true});
    await until(go => { nextEl.onclick = () => go(); onKey = e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); go(); } }; });
    nextEl.onclick = null; Sound.next();
  }

  return (async () => {
    for (let n = 0; n < of && !quit; n++) { sheet.classList.remove('turn'); void sheet.offsetWidth; sheet.classList.add('turn'); await one(qs[n], n); }
    const best = (load('trips') || {})[quiz.key] || 0, perfect = !quit && got === of && best < of;
    save('trips', {[quiz.key]: Math.max(best, got)});
    if (!quit) {
      // the last page: the stars, big, and a word from Dr. Sparks
      el.classList.add('end'); awayEl.hidden = true; secretEl.hidden = true; num.textContent = ''; paintStars(got, of);
      cardsEl.className = 'cards tally'; cardsEl.innerHTML = Array.from({length:of}, (_, i) => `<i class="${i < got ? 'on' : ''}" style="--k:${i}">${STAR}</i>`).join('');
      whoEl.innerHTML = `${tag('sparks')} says:`; noteEl.innerHTML = ''; nextEl.hidden = true;
      if (got === of) [523, 659, 784, 1046, 1319, 1568].forEach((f, k) => Sound.tone(f, {type:'triangle', t:k*.09, dur:.5, vol:.08}));
      await write(qEl, got === of ? `${of} stars out of ${of}! A perfect Explorer Check!` : `${got} ${got === 1 ? 'star' : 'stars'} out of ${of}!`, {cps:40});
      await write(noteEl, got >= of - 2 ? "Wonderful exploring! You really were paying attention." : "And you found every answer in the end. That's what explorers do!", {lead:tag('sparks')});
      await sleep(400);
      nextEl.textContent = done; nextEl.hidden = false; nextEl.focus({preventScroll:true});
      await until(go => { nextEl.onclick = () => go(); onKey = e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); go(); } }; });
      nextEl.onclick = null;
    }
    removeEventListener('keydown', key, true); el.hidden = true; Sound.next();
    return {got, of, quit, perfect};
  })();
}

// what the class says once the sheet is handed back
export function cheers({got, of, quit}){
  if (quit) return [['sparks', "Saving it for later? Any time, {name}! Just ask me at the Wonder Bus."]];
  if (got === of) return [['juniper', "Every single one! I'm giving you a gold star in my notebook."], ['basil', "And every 'I wonder' on my list, answered. Thanks, {name}."]];
  if (got >= of - 2) return [['pip', "That's almost all of them!"], ['mo', "Snack to celebrate?"]];
  return [['basil', "Phew. I'd have needed a hint on most of those too."], ['sparks', "Want more stars? Try my Explorer Check again any time. Just ask me at the Wonder Bus!"]];
}
