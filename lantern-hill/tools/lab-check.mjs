// Plays Dr. Sparks' experiment desk headless and checks that the science still happens: things are
// picked up, carried, tipped and stirred by the explorer's hand (real pointer events through hands.js),
// and each story passes on what the desk shows afterwards, not on how it got there.
//
// From lantern-hill/ with the game served (`rebar3 shell` in server/, or any static server on web/):
//
//   node tools/lab-check.mjs http://localhost:8080/ [words]   (only the stories whose names contain the words)
//
// Exits non-zero if any story fails.

import { phone } from './phone.mjs';

const args = process.argv.slice(2), url = args.find(a => /^https?:/.test(a)) || 'http://localhost:8080/', only = args.filter(a => !/^https?:/.test(a)).join(' ');

// Runs in the page. Everything waits on the desk rather than on the clock, because headless Chrome
// renders slowly and the physics only advances as fast as frames arrive.
const HARNESS = `(async () => {
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  const until = async (fn, ms = 20000) => { const t = performance.now(); while (performance.now() - t < ms) { const v = fn(); if (v) return v; await sleep(100); } return null; };
  document.getElementById('start').dispatchEvent(new PointerEvent('pointerdown'));
  await sleep(600); if (!document.getElementById('wardrobe').hidden) document.getElementById('wDone').click();
  const [PL, LAB, dlg, D, H, chem, PH, THREE, R] = await Promise.all(['/js/player.js', '/js/lab/index.js', '/js/ui/dialogue.js', '/js/lab/desk.js',
    '/js/lab/hands.js', '/js/lab/chem.js', '/js/lab/physics.js', 'three', '/js/core/render.js'].map(m => import(m)));
  const cv = document.getElementById('world'), O = {pointerId:7, pointerType:'mouse', bubbles:true, button:0, buttons:1};
  const pos = id => D.find(id).body.translation();
  const screen = (x, y, z) => { const v = new THREE.Vector3(x, y, z).add(D.desk.root.position).project(R.camera), r = cv.getBoundingClientRect(); return [(v.x + 1)/2*r.width, (1 - v.y)/2*r.height]; };
  const handY = h => PH.toWorld(h.body, 0, h.grip, 0, {}).y;
  const point = (type, [x, y]) => cv.dispatchEvent(new PointerEvent(type, {...O, clientX:x, clientY:y}));
  // bring the held thing's grip over a spot
  const move = async (h, at) => {
    for (let i = 0; i < 300; i++) {
      point('pointermove', screen(at.x, handY(h), at.z)); await sleep(30);
      const hp = PH.toWorld(h.body, 0, h.grip, 0, {}); if (i > 20 && Math.hypot(hp.x - at.x, hp.z - at.z) < .01) break;
    }
  };
  // pick a thing up, bring the hand over a spot (or a thing), do something there, let go
  const carry = async (id, to, there) => {
    // tap where the hand will hold it: halfway up a horseshoe magnet is the gap in its arch
    const t0 = pos(id), g = PH.toWorld(D.find(id).body, 0, D.find(id).grip, 0, {}); point('pointerdown', screen(g.x, g.y, g.z));
    const h = D.desk.held; if (!h || h.id !== id) { point('pointerup', [0, 0]); throw new Error('could not pick up ' + id + ' (got ' + (h && h.id) + ', ' + id + ' at ' + [t0.x, t0.y, t0.z].map(n => n.toFixed(2)) + ')'); }
    // aim where the target is when the hand sets off; chasing it live, a paperclip leaping onto the
    // magnet's leading pole drags the hand along after it into the wall
    await move(h, typeof to === 'string' ? {...pos(to)} : to);
    if (there) await there(h);
    point('pointerup', [0, 0]); await sleep(300);
  };
  const tip = ms => async () => { H.setTipKey(true); await sleep(ms); H.setTipKey(false); await sleep(600); };
  const shake = n => async h => { H.setTipKey(true); await sleep(1200); const t = pos('jar');
    for (let i = 0; i < n*2; i++) { point('pointermove', screen(t.x + (i % 2 ? .04 : -.04), handY(h), t.z)); await sleep(180); }
    H.setTipKey(false); await sleep(600); };
  const stir = ms => async h => { const t = pos('jar'); for (let k = 0; k < ms/30; k++) { point('pointermove', screen(t.x + Math.cos(k*.35)*.025, handY(h), t.z + Math.sin(k*.35)*.025)); await sleep(30); } };
  const open = async n => {
    if (!document.getElementById('labHud').hidden) document.getElementById('lhBook').click();
    else { PL.player.x = 8.6; PL.player.z = -4.4; await sleep(200); LAB.openLab(); }
    if (!await until(() => !document.getElementById('labBook').hidden)) throw new Error('the experiment book never opened');
    document.querySelectorAll('#lbGrid .lb-card')[n].click();
    await until(() => D.desk.items.length && D.desk.items.every(it => it.pop >= 1));
    dlg.endConvo(true);
  };
  const choose = async i => { await until(() => !document.getElementById('lhChoose').hidden); document.querySelectorAll('#lhChoose .lc-card')[i].click(); await sleep(300); dlg.endConvo(true); };
  const status = () => document.getElementById('lhStatus').textContent;
  // read through whatever Dr. Sparks is saying, as a player tapping along would
  const listen = async () => { for (let i = 0; i < 200 && dlg.convo; i++) { dlg.talk(); await sleep(40); } };
  window.lab = {sleep, until, carry, move, tip, shake, stir, open, choose, status, listen, D, chem, pos};
  localStorage.setItem('lantern-hill-lab', JSON.stringify({done:['sinkfloat', 'magnets', 'volcano', 'rainbow', 'egg', 'dissolve', 'balloon', 'lava']}));
  return true;
})()`;

const STORIES = [
  ['vinegar poured on the baking soda box fizzes', `(async () => { const {open, choose, carry, tip, until, D} = lab;
    await open(2); await choose(0);
    const before = D.totalGas();
    await carry('vinegar', 'soda', tip(1800));
    return await until(() => D.totalGas() - before > 5) ? '' : 'no gas after vinegar met the baking soda';
  })()`],
  ['a rock sinks and a cork floats', `(async () => { const {open, carry, until, D, sleep} = lab;
    await open(0);
    for (const [id, dx] of [['rock', -.05], ['cork', .05]]) { const t = lab.pos('tub'); await carry(id, {x:t.x + dx, y:0, z:t.z}); }
    const ok = await until(() => D.find('rock').settled && D.find('cork').settled);
    if (!ok) return 'they never settled in the tub';
    return D.find('rock').settled.floating ? 'the rock floated' : !D.find('cork').settled.floating ? 'the cork sank' : '';
  })()`],
  ['an egg sinks in water, then floats once salt is stirred in', `(async () => { const {open, choose, carry, shake, stir, until, D, chem} = lab;
    await open(4); await choose(0);
    await carry('egg', 'jar');
    if (!await until(() => D.find('egg').settled)) return 'the egg never settled';
    if (D.find('egg').settled.floating) return 'the egg floated in plain water';
    await lab.listen(); await choose(1);
    await carry('salt', 'jar', shake(8));
    if (chem.amount(D.find('jar').c, 'salt') < 6) return 'too little salt reached the jar: ' + chem.amount(D.find('jar').c, 'salt').toFixed(1);
    await carry('spoon', 'jar', stir(4000));
    await carry('spoon', {x:.45, y:0, z:.22});
    return await until(() => D.find('egg').settled && D.find('egg').settled.floating) ? '' : 'the egg stayed down in salt water (density ' + chem.density(D.find('jar').c).toFixed(3) + ')';
  })()`],
  ['cabbage juice turns pink with lemon', `(async () => { const {open, choose, carry, tip, until, D, chem} = lab;
    await open(8); await choose(0);
    await carry('lemon', 'k1', tip(1500));
    return await until(() => chem.ph(D.find('k1').c) < 5) ? '' : 'the juice stayed at pH ' + chem.ph(D.find('k1').c).toFixed(1);
  })()`],
  ['lemon poured from a little off to the side still lands in the cabbage juice', `(async () => { const {open, choose, carry, tip, until, D, chem} = lab;
    await open(8); await choose(0);
    const k = lab.pos('k1'), before = chem.amount(D.find('lemon').c, 'lemon');
    await carry('lemon', {x:k.x - .04, y:0, z:k.z + .05}, tip(1500));
    const poured = before - chem.amount(D.find('lemon').c, 'lemon'), got = chem.amount(D.find('k1').c, 'lemon');
    return got > poured*.8 ? '' : 'only ' + got.toFixed(0) + ' of ' + poured.toFixed(0) + ' lemon reached the juice';
  })()`],
  ['a carried bottle keeps one height as it passes over other things', `(async () => { const {open, carry, sleep, D} = lab;
    await open(2);
    const ys = [];
    await carry('vinegar', {x:.3, y:0, z:0}, async () => {
      const h = D.desk.held, at = D.desk.held.body.translation();
      for (const x of [.1, -.1, -.3, .3, 0]) { await lab.move(h, {x, z:at.z}); ys.push(h.body.translation().y); }
    });
    const lo = Math.min(...ys), hi = Math.max(...ys);
    return hi - lo < .01 ? '' : 'it rose and fell by ' + ((hi - lo)*100).toFixed(1) + ' cm';
  })()`],
  ['a magnet picks up a paperclip and not a coin', `(async () => { const {open, carry, until, D, sleep} = lab;
    await open(1);
    const linger = () => sleep(1200);
    await carry('magnet', 'paperclip', linger); await carry('magnet', 'coin', linger);
    return !D.find('paperclip').stuck ? 'the paperclip did not stick' : D.find('coin').stuck ? 'the coin stuck' : '';
  })()`]
];

const p = await phone(url, {device: 'pixel-7', landscape: true, dpr: 1});
let failed = 0;
try {
  await p.wait(2500);
  await p.eval(HARNESS);
  for (const [name, js] of STORIES.filter(([n]) => n.includes(only))) {
    let why;
    try { why = await p.eval(js); } catch (e) { why = e.message; }
    console.log(`${why ? 'FAIL' : 'pass'}  ${name}${why ? ': ' + why : ''}`);
    for (const l of p.logs.splice(0)) if (l.startsWith('exception') || l.startsWith('error')) { console.log('  ' + l.split('\n').slice(0, 14).join('\n  ')); failed++; }
    if (why) failed++;
  }
} finally { await p.close(); }
process.exit(failed ? 1 : 0);
