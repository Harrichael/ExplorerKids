// Looks through Pip's telescope headless and checks that it works as a tool: lenses switch the way
// they should, Hubble's pictures can be found and shown, and the top of the sky says which way to go.
// Each story starts fresh, on one evening's sky (9 pm at Lantern Hill on 18 October 2026) with the
// telescope aimed at the Veil Nebula, and passes on what the telescope shows afterwards.
//
// From lantern-hill/ with the game served (`rebar3 shell` in server/, or any static server on web/),
// and online, for the sky's tiles and Hubble's pictures:
//
//   node tools/telescope-check.mjs http://localhost:8080/ [words]   (only the stories whose names contain the words)
//
// Exits non-zero if any story fails.

import { phone } from './phone.mjs';

const args = process.argv.slice(2), url = args.find(a => /^https?:/.test(a)) || 'http://localhost:8080/', only = args.filter(a => !/^https?:/.test(a)).join(' ');

const HARNESS = `(async () => {
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  const until = async (fn, ms = 20000) => { const t = performance.now(); while (performance.now() - t < ms) { const v = fn(); if (v) return v; await sleep(100); } return null; };
  const NOW = Date.UTC(2026, 9, 19, 3); Date.now = () => NOW;
  document.getElementById('start').dispatchEvent(new PointerEvent('pointerdown'));
  await sleep(600); if (!document.getElementById('wardrobe').hidden) document.getElementById('wDone').click();
  const [{Sound}, {game}, astro, {HOME}] = await Promise.all(['/js/core/sound.js', '/js/state.js', '/js/sky/astro.js', '/js/sky/observer.js'].map(m => import(m)));
  if (Sound.toggle()) Sound.toggle();
  const veil = astro.toHorizon(312.87, 30.49, HOME.lat, astro.siderealTime(NOW, HOME.lon));
  localStorage.setItem('lantern-hill-travel', JSON.stringify({home:true}));
  localStorage.setItem('lantern-hill-telescope', JSON.stringify({alt:veil.alt, az:veil.az, fov:6, lens:'sky', names:true, seconds:3000, pictures:[]}));
  const {openTelescope} = await import('/js/sky/telescope.js');
  game.activity = null; await openTelescope();
  const $ = id => document.getElementById(id), lens = id => document.querySelector('#sLenses [data-id="' + id + '"]'), pics = id => document.querySelector('#sLenses [data-pics="' + id + '"]');
  await until(() => document.querySelector('#scopeSky canvas')); await sleep(1500);
  const press = async (b, ms) => { b.dispatchEvent(new PointerEvent('pointerdown', {bubbles:true})); await sleep(ms); b.dispatchEvent(new PointerEvent('pointerup', {bubbles:true})); await sleep(300); };
  // how much of the overlay is drawn in the pale gold of the sideways arrows
  const cue = () => { const c = $('scopeNames'), d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data; let n = 0;
    for (let i = 0; i < d.length; i += 4) if (d[i + 3] > 120 && d[i] > 235 && d[i + 1] > 200 && d[i + 1] < 232 && d[i + 2] > 110 && d[i + 2] < 165) n++; return n; };
  window.scope = {sleep, until, $, lens, pics, press, cue};
  return true;
})()`;

// Each story is run in the page, except where a tap has to be a real touch on the glass
const STORIES = [
  ['held up against the top of the sky, arrows point off to either side', `(async () => { const {sleep, cue} = scope;
    const before = cue(), key = (type, k) => dispatchEvent(new KeyboardEvent(type, {key:k}));
    // wide enough that a few seconds of looking up reaches the top
    for (const k of ['-', '-']) { key('keydown', k); key('keyup', k); }
    await sleep(1200);
    key('keydown', 'ArrowUp'); await sleep(5000);
    const during = cue();
    key('keyup', 'ArrowUp');
    return during > 200 && before < 50 ? '' : 'sideways arrows: ' + before + ' gold pixels before, ' + during + ' while held';
  })()`],
  ['a quick tap on Microwaves changes nothing, and holding it puts Hubble’s pictures away', `(async () => { const {$, lens, pics, press} = scope;
    pics('hubble').click();
    if (pics('hubble').getAttribute('aria-pressed') !== 'true') return 'Hubble’s pictures did not switch on with one click';
    await press(lens('micro'), 100);
    if ($('sLens').textContent !== 'Night Sky') return 'a quick tap switched to ' + $('sLens').textContent;
    await press(lens('micro'), 900);
    if ($('sLens').textContent !== 'Microwaves') return 'holding Microwaves left the lens on ' + $('sLens').textContent;
    return pics('hubble').hidden && pics('hubble').getAttribute('aria-pressed') === 'false' ? '' : 'Hubble’s pictures are still on through the microwave lens';
  })()`],
  ['through the infrared lens Webb’s pictures stay, and one click brings the night sky back', `(async () => { const {$, lens, pics, press} = scope;
    await press(lens('ir'), 900);
    if (pics('webb').hidden) return 'no Webb switch through the infrared lens';
    if (!pics('hubble').hidden) return 'a Hubble switch through the infrared lens';
    lens('sky').click();
    return $('sLens').textContent === 'Night Sky' && !pics('hubble').hidden ? '' : 'one click on Night Sky left ' + $('sLens').textContent;
  })()`],
  ['tapping inside a Hubble outline shows that picture, and again the next one there', async p => {
    await p.eval(`scope.pics('hubble').click()`); await p.wait(2000);
    const glass = await p.box('#scopeGlass'), shown = () => p.eval(`scope.$('sCard').hidden ? '' : scope.$('sCard').querySelector('em').textContent + '|' + scope.$('sCard').querySelector('h3').textContent`);
    await p.tap(glass.x, glass.y); await p.wait(800);
    const first = await shown();
    if (!first.startsWith('Hubble picture')) return 'no Hubble picture card from a tap on the Veil';
    if (!/ of \d+ here/.test(first)) return '';
    await p.tap(glass.x, glass.y); await p.wait(800);
    return (await shown()).split('|')[1] !== first.split('|')[1] ? '' : 'tapping the same spot again showed the same picture';
  }]
];

let failed = 0;
for (const [name, js] of STORIES.filter(([n]) => n.includes(only))) {
  const p = await phone(url, {device: 'pixel-7', landscape: true, dpr: 1});
  let why;
  try {
    await p.wait(2500);
    await p.eval(HARNESS);
    why = typeof js === 'function' ? await js(p) : await p.eval(js);
  } catch (e) { why = e.message; }
  console.log(`${why ? 'FAIL' : 'pass'}  ${name}${why ? ': ' + why : ''}`);
  for (const l of p.logs.splice(0)) if (l.startsWith('exception')) { console.log('  ' + l.split('\n').slice(0, 14).join('\n  ')); failed++; }
  if (why) failed++;
  await p.close();
}
process.exit(failed ? 1 : 0);
