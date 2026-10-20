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
  // the checks play sound effects but never the songs, which would come out of the speakers
  HTMLMediaElement.prototype.play = () => Promise.resolve();
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  const until = async (fn, ms = 20000) => { const t = performance.now(); while (performance.now() - t < ms) { const v = fn(); if (v) return v; await sleep(100); } return null; };
  document.getElementById('start').dispatchEvent(new PointerEvent('pointerdown'));
  await sleep(600); if (!document.getElementById('wardrobe').hidden) document.getElementById('wDone').click();
  const [PL, LAB, dlg, D, H, chem, PH, THREE, R, C] = await Promise.all(['/js/player.js', '/js/lab/index.js', '/js/ui/dialogue.js', '/js/lab/desk.js',
    '/js/lab/hands.js', '/js/lab/chem.js', '/js/lab/physics.js', 'three', '/js/core/render.js', '/js/lab/cabinet.js'].map(m => import(m)));
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
  const shake = (n, at = 'jar') => async h => { H.setTipKey(true); await sleep(1200); const t = pos(at);
    for (let i = 0; i < n*2; i++) { point('pointermove', screen(t.x + (i % 2 ? .04 : -.04), handY(h), t.z)); await sleep(180); }
    H.setTipKey(false); await sleep(600); };
  const stir = (ms, at = 'jar') => async h => { const t = pos(at); for (let k = 0; k < ms/30; k++) { point('pointermove', screen(t.x + Math.cos(k*.35)*.025, handY(h), t.z + Math.sin(k*.35)*.025)); await sleep(30); } };
  const open = async id => {
    if (!document.getElementById('labHud').hidden) document.getElementById('lhBook').click();
    else { PL.player.x = 8.6; PL.player.z = -4.4; await sleep(200); LAB.openLab(); }
    if (!await until(() => !document.getElementById('labBook').hidden)) throw new Error('the experiment book never opened');
    document.querySelector(id === 'free' ? '#lbFree .lb-card' : '#lbGrid [data-id="' + id + '"]').click();
    await until(() => D.desk.items.length ? D.desk.items.every(it => it.pop >= 1) : !document.getElementById('labHud').hidden);
    dlg.endConvo(true);
  };
  // every time there are cards to answer, they must leave the question and the sound button showing
  const covers = (a, b) => a.left < b.right && b.left < a.right && a.top < b.bottom && b.top < a.bottom, rect = e => e.getBoundingClientRect();
  const choose = async i => {
    await until(() => !document.getElementById('lhChoose').hidden); await sleep(100);
    const q = rect(document.getElementById('lhCard')), snd = rect(document.getElementById('sound'));
    if (covers(q, snd)) throw new Error('the question card covers the sound button');
    for (const c of document.querySelectorAll('#lhChoose .lc-card')) if (covers(rect(c), q) || covers(rect(c), snd)) throw new Error('the answer card "' + c.textContent + '" covers the question or the sound button');
    document.querySelectorAll('#lhChoose .lc-card')[i].click(); await sleep(300); dlg.endConvo(true);
  };
  const status = () => document.getElementById('lhStatus').textContent;
  // read through whatever Dr. Sparks is saying, as a player tapping along would
  const listen = async () => { for (let i = 0; i < 200 && dlg.convo; i++) { dlg.talk(); await sleep(40); } };
  const click = async p => { point('pointermove', p); await sleep(100); point('pointerdown', p); await sleep(60); cv.dispatchEvent(new PointerEvent('pointerup', {...O, buttons:0, clientX:p[0], clientY:p[1]})); await sleep(100); };
  const right = () => /prediction was right|got all/.test(status());
  window.lab = {sleep, until, carry, move, tip, shake, stir, open, choose, status, listen, click, screen, right, D, C, chem, pos};
  // the Heat Rises experiment also needs the field trip where it's learned
  localStorage.setItem('lantern-hill-trips', JSON.stringify({heatRises:true}));
  localStorage.setItem('lantern-hill-lab', JSON.stringify({done:['sinkfloat', 'magnets', 'volcano', 'rainbow', 'egg', 'dissolve', 'balloon', 'lava', 'fizztest', 'makemagnet']}));
  return true;
})()`;

const STORIES = [
  ['vinegar poured on the baking soda box fizzes, and the first eruption opens the Wonder Bus', `(async () => { const {open, choose, carry, tip, until, sleep, D} = lab;
    const rec = JSON.parse(localStorage.getItem('lantern-hill-lab'));
    localStorage.setItem('lantern-hill-lab', JSON.stringify({...rec, done:rec.done.filter(id => id !== 'volcano')}));
    await open('volcano'); await choose(0);
    const before = D.totalGas();
    await carry('vinegar', 'soda', tip(1800));
    if (!await until(() => D.totalGas() - before > 8)) return 'no gas after vinegar met the baking soda';
    const dlg = await import('/js/ui/dialogue.js');
    for (let i = 0; i < 300; i++) { if (document.body.innerText.includes('Wonder Bus')) return ''; if (dlg.convo) dlg.talk(); await sleep(60); }
    return 'finishing the volcano never mentioned the Wonder Bus';
  })()`],
  ['a rock sinks and a cork floats', `(async () => { const {open, carry, until, D, sleep} = lab;
    await open('sinkfloat');
    for (const [id, dx] of [['rock', -.05], ['cork', .05]]) { const t = lab.pos('tub'); await carry(id, {x:t.x + dx, y:0, z:t.z}); }
    const ok = await until(() => D.find('rock').settled && D.find('cork').settled);
    if (!ok) return 'they never settled in the tub';
    return D.find('rock').settled.floating ? 'the rock floated' : !D.find('cork').settled.floating ? 'the cork sank' : '';
  })()`],
  ['an egg sinks in water, then floats once salt is stirred in', `(async () => { const {open, choose, carry, shake, stir, until, D, chem} = lab;
    await open('egg'); await choose(0);
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
    await open('cabbage'); await choose(0);
    await carry('lemon', 'k1', tip(1500));
    return await until(() => chem.ph(D.find('k1').c) < 5) ? '' : 'the juice stayed at pH ' + chem.ph(D.find('k1').c).toFixed(1);
  })()`],
  ['lemon poured from a little off to the side still lands in the cabbage juice', `(async () => { const {open, choose, carry, tip, until, D, chem} = lab;
    await open('cabbage'); await choose(0);
    const k = lab.pos('k1'), before = chem.amount(D.find('lemon').c, 'lemon');
    await carry('lemon', {x:k.x - .04, y:0, z:k.z + .05}, tip(1500));
    const poured = before - chem.amount(D.find('lemon').c, 'lemon'), got = chem.amount(D.find('k1').c, 'lemon');
    return got > poured*.8 ? '' : 'only ' + got.toFixed(0) + ' of ' + poured.toFixed(0) + ' lemon reached the juice';
  })()`],
  ['a carried bottle keeps one height as it passes over other things', `(async () => { const {open, carry, sleep, D} = lab;
    await open('volcano');
    const ys = [];
    await carry('vinegar', {x:.3, y:0, z:0}, async () => {
      const h = D.desk.held, at = D.desk.held.body.translation();
      for (const x of [.1, -.1, -.3, .3, 0]) { await lab.move(h, {x, z:at.z}); ys.push(h.body.translation().y); }
    });
    const lo = Math.min(...ys), hi = Math.max(...ys);
    return hi - lo < .01 ? '' : 'it rose and fell by ' + ((hi - lo)*100).toFixed(1) + ' cm';
  })()`],
  ['a balloon let go a little off the bottle neck stretches onto it', `(async () => { const {open, choose, carry, until, D} = lab;
    await open('balloon'); await lab.listen();
    if (!document.getElementById('lhChoose').hidden) await choose(0);
    const b = lab.pos('bottle');
    await carry('balloon', {x:b.x + .055, y:0, z:b.z + .035});
    return await until(() => D.find('balloon').attached, 3000) ? '' : 'the balloon fell off beside the bottle';
  })()`],
  ['a magnet picks up a paperclip and not a coin', `(async () => { const {open, carry, until, D, sleep} = lab;
    await open('magnets');
    const linger = () => sleep(1200);
    await carry('magnet', 'paperclip', linger); await carry('magnet', 'coin', linger);
    return !D.find('paperclip').stuck ? 'the paperclip did not stick' : D.find('coin').stuck ? 'the coin stuck' : '';
  })()`],
  ['red and yellow drops make an orange cup', `(async () => { const {open, choose, carry, tip, until, right} = lab;
    await open('colors'); await choose(0);
    await carry('red', 'c1', tip(2200)); await carry('yellow', 'c1', tip(2200));
    return await until(right, 8000) ? '' : 'no orange: ' + lab.status();
  })()`],
  ['pepper on water runs to the edges from a soapy swab', `(async () => { const {open, choose, carry, shake, until, sleep, right} = lab;
    await open('pepper');
    await carry('pepper', 'dish', shake(4, 'dish'));
    if (!await until(() => !document.getElementById('lhChoose').hidden, 8000)) return 'the pepper never settled on the water: ' + lab.status();
    await choose(1);
    await carry('swab', 'saucer', () => sleep(800)); await carry('swab', 'dish', () => sleep(1500));
    return await until(right, 6000) ? '' : 'the pepper stayed put: ' + lab.status();
  })()`],
  ['acids fizz with baking soda; soap and water do not', `(async () => { const {open, carry, tip, until, sleep, right, pos} = lab;
    await open('fizztest');
    const tray = (id, dx) => { const t = pos(id); return {x:t.x + dx, y:0, z:t.z}; };
    await carry('vinegar', tray('fizz', -.06)); await carry('lemon', tray('fizz', .06)); await carry('soap', tray('none', -.07)); await carry('water', tray('none', .06));
    if (!await until(() => !document.getElementById('lhLock').hidden, 4000)) return 'the guesses never locked in';
    document.getElementById('lhLock').click(); await sleep(300); (await import('/js/ui/dialogue.js')).endConvo(true);
    for (const [id, cup] of [['vinegar', 's1'], ['lemon', 's2'], ['soap', 's3'], ['water', 's4']]) await carry(id, cup, tip(1400));
    return await until(right, 10000) ? '' : lab.status();
  })()`],
  ['a little cup holds a few spoonfuls of salt, and more of sugar', `(async () => { const {open, choose, carry, stir, until, sleep, right, listen} = lab;
    await open('saturate'); await choose(1);
    for (let i = 0; i < 8 && !right(); i++) { await carry('spoon', 'saltbox', () => sleep(500)); await carry('spoon', 'c1', stir(3500, 'c1')); }
    if (!right()) return 'the salt never stopped dissolving: ' + lab.status();
    await listen(); await choose(2);
    for (let i = 0; i < 10 && !right(); i++) { await carry('spoon', 'sugar', () => sleep(500)); await carry('spoon', 'c2', stir(3500, 'c2')); }
    return right() ? '' : 'sugar: ' + lab.status();
  })()`],
  ['gas sealed in a corked bottle pops the cork', `(async () => { const {open, choose, carry, tip, until, D} = lab;
    await open('cork'); await choose(1);
    await carry('t1', 'bottle');
    await carry('cork', 'bottle');
    const b = D.find('bottle'), at = () => JSON.stringify(b.c) + ' tablet at ' + ['x','y','z'].map(k => lab.pos('t1')[k].toFixed(3)) + ' bottle at ' + ['x','y','z'].map(k => lab.pos('bottle')[k].toFixed(3)) + ' at ' + D.gauge('bottle').toFixed(0) + ' kPa, made ' + b.stats.gas.toFixed(1) + ' mmol';
    if (!D.find('cork').plugged && !D.find('cork').popped) return 'the cork did not go in the neck: ' + at();
    return await until(() => D.find('cork').popped, 10000) ? '' : 'the cork held: ' + at();
  })()`],
  // a third of a bottle of vinegar, as Dr. Sparks hints; a full one makes more gas than the balloon can hold
  ['gas from inside blows the balloon up', `(async () => { const {open, choose, carry, tip, until, sleep, D, listen} = lab;
    await open('balloon'); await listen();
    if (!document.getElementById('lhChoose').hidden) await choose(1);
    await carry('vinegar', 'bottle', async h => { await tip(800)(); await lab.move(h, {x:.55, y:0, z:-.3}); });
    await carry('soda', 'balloon', async h => { await tip(1200)(); await lab.move(h, {x:-.55, y:0, z:-.3}); });
    await carry('balloon', 'bottle');
    await carry('balloon', 'bottle', () => sleep(2000));
    return await until(() => D.find('balloon').inflate >= .5, 10000) ? '' : 'the balloon only reached ' + D.find('balloon').inflate.toFixed(2);
  })()`],
  ['a balloon on a bottle of vinegar overfilled with baking soda bursts, and its gas gets out', `(async () => { const {open, choose, carry, tip, until, sleep, D, listen} = lab;
    // with this seed the rubber tears at 6 times its size round; a full bottle of vinegar's gas would stretch it 7.5
    D.reseed(7); await open('balloon'); await listen();
    if (!document.getElementById('lhChoose').hidden) await choose(1);
    await carry('vinegar', 'bottle', tip(1500));
    await carry('soda', 'balloon', async h => { await tip(1200)(); await lab.move(h, {x:-.55, y:0, z:-.3}); });
    const b = D.find('balloon'), at = () => 'stretched ' + Math.cbrt(b.vol/b.def.rest).toFixed(2) + ' of ' + b.burstAt.toFixed(2) + ', ' + D.gauge('bottle').toFixed(1) + ' kPa';
    await carry('balloon', 'bottle'); await carry('balloon', 'bottle', () => sleep(2000));
    if (!await until(() => b.burst, 10000)) return 'the balloon held: ' + at();
    return await until(() => Math.abs(D.gauge('bottle')) < 1, 5000) ? '' : 'the gas stayed in the bottle at ' + D.gauge('bottle').toFixed(1) + ' kPa';
  })()`],
  ['the same fizz jets froth higher out of a narrow bottle neck than out of a wide cup', `(async () => { const {open, carry, tip, until, D} = lab;
    await open('free');
    const b = D.bring('bottle', {fill:{vinegar:40}}, {x:-.3, z:.1}), c = D.bring('cup', {fill:{vinegar:40}}, {x:.3, z:.1}), s = D.bring('soda', {}, {x:0, z:-.3});
    await until(() => [b, c, s].every(it => it.pop >= 1));
    // plenty of baking soda in each, so the 40 mL of vinegar is what runs out: the same gas from both
    await carry(s.id, b.id, tip(1200)); await carry(s.id, c.id, tip(1200));
    const t0 = D.desk.t; await until(() => D.desk.t - t0 > 6, 30000);
    const how = 'bottle ' + b.stats.gas.toFixed(1) + ' mmol, ' + (b.stats.rise*100).toFixed(0) + ' cm high; cup ' + c.stats.gas.toFixed(1) + ' mmol, ' + (c.stats.rise*100).toFixed(0) + ' cm high';
    if (Math.abs(b.stats.gas - c.stats.gas) > .2*c.stats.gas) return 'they made different amounts of gas: ' + how;
    return b.stats.rise > 2*c.stats.rise && b.stats.rise > .2 ? '' : how;
  })()`],
  ['a sealed flask taken off the heat loses pressure as its steam turns back to water', `(async () => { const {open, choose, carry, click, screen, until, sleep, D, chem, pos} = lab;
    await open('heat'); await choose(0);
    const k = D.bring('cork', {}, {x:-.25, z:-.2}), b = pos('burner'), f = D.find('flask');
    await click(screen(b.x, .012, b.z + .05));
    if (!await until(() => chem.temp(f.c) >= 100, 30000)) return 'the water never boiled: ' + chem.temp(f.c).toFixed(0) + ' C';
    await sleep(1500);
    await carry('flask', {x:-.3, y:0, z:-.05}); await carry(k.id, 'flask');
    if (!k.plugged) return 'the cork did not go into the flask';
    const t0 = D.desk.t; let most = -Infinity;
    await until(() => { most = Math.max(most, D.gauge('flask')); return D.desk.t - t0 > 12; }, 40000);
    const now = D.gauge('flask'), how = 'from ' + most.toFixed(1) + ' to ' + now.toFixed(1) + ' kPa at ' + chem.temp(f.c).toFixed(0) + ' C';
    return k.popped ? 'the cork popped: ' + how : now < most - 15 && now < 0 ? '' : how;
  })()`],
  ['more gas stays dissolved in a cold, corked bottle of fizzy water than in a warm, open one', `(async () => { const {open, carry, until, D} = lab;
    await open('free');
    const fizzy = {water:60, co2:3}, cold = D.bring('bottle', {fill:fizzy, t:5}, {x:-.3, z:.1}), warm = D.bring('bottle', {fill:fizzy, t:45}, {x:.3, z:.1}), k = D.bring('cork', {}, {x:0, z:-.3});
    await until(() => [cold, warm, k].every(it => it.pop >= 1));
    await carry(k.id, cold.id);
    if (!k.plugged) return 'the cork did not go into the cold bottle';
    const t0 = D.desk.t; await until(() => D.desk.t - t0 > 10, 40000);
    const a = cold.c.l.co2 || 0, b = warm.c.l.co2 || 0;
    return a > 3*b && !k.popped ? '' : 'cold and corked ' + a.toFixed(2) + ' mmol, warm and open ' + b.toFixed(2) + (k.popped ? ', and the cork popped' : '');
  })()`],
  ['vinegar and salt shine a dull penny fastest; salt water alone does not', `(async () => { const {open, choose, carry, stir, until, sleep, right, listen, D} = lab;
    await open('pennies'); await choose(2);
    const salt = async dish => { await carry('spoon', 'saltbox', () => sleep(500)); await carry('spoon', dish, stir(3000, dish)); await carry('spoon', {x:.25, y:0, z:-.32}); };
    await salt('d3');
    for (const [p, d] of [['p1', 'd1'], ['p2', 'd2'], ['p3', 'd3']]) await carry(p, d);
    const how = () => ['p1', 'p2', 'p3'].map(id => { const p = D.find(id); return id + ' ' + p.tarnish.toFixed(2) + ' in ' + (p.soakIn ? p.soakIn.id : '-'); }).join(', ');
    if (!await until(right, 20000)) return 'the race: ' + lab.status() + ' (' + how() + ')';
    await listen(); await choose(1);
    await salt('d1');
    return await until(right, 30000) ? '' : 'salt water: ' + lab.status() + ' (' + how() + ') d1 ' + JSON.stringify(D.find('d1').c);
  })()`],
  ['a test strip sorts acids, bases and water, and baking soda raises lemon juice', `(async () => { const {open, choose, carry, tip, until, sleep, right, listen, pos, D, chem} = lab;
    const saved = localStorage.getItem('lantern-hill-lab'), rec = JSON.parse(saved);
    localStorage.setItem('lantern-hill-lab', JSON.stringify({...rec, done:[...rec.done, 'cabbage']}));
    try {
      await open('ph');
      const tray = (id, dx) => { const t = pos(id); return {x:t.x + dx, y:0, z:t.z}; };
      await carry('lemon', tray('acid', -.07)); await carry('vinegar', tray('acid', .07)); await carry('water', tray('neutral', 0)); await carry('soap', tray('base', -.08)); await carry('soda', tray('base', .07));
      if (!await until(() => !document.getElementById('lhLock').hidden, 4000)) return 'the guesses never locked in';
      document.getElementById('lhLock').click(); await sleep(300); (await import('/js/ui/dialogue.js')).endConvo(true);
      // a full cup glugs out fast, so the water only gets a short tip each time
      for (const [id, cup, ms] of [['lemon', 'c1', 1400], ['vinegar', 'c2', 1400], ['water', 'c3', 500], ['soap', 'c4', 1400], ['water', 'c5', 900], ['soda', 'c5', 1400]]) await carry(id, cup, async h => { await tip(ms)(); await lab.move(h, {x:pos(cup).x, z:-.3}); });
      const dip = async cup => { await until(() => chem.steady(D.find(cup).c), 15000); await carry('strip', cup, async h => { await sleep(700); await lab.move(h, {x:.72, z:-.16}); }); };
      for (const cup of ['c1', 'c2', 'c3', 'c4', 'c5']) await dip(cup);
      const read = () => ['c1', 'c2', 'c3', 'c4', 'c5'].map(id => { const d = D.find(id).stats.dip; return id + ' ' + (d ? d.ph.toFixed(1) : '-'); }).join(', ');
      if (!await until(right, 6000)) return 'sorting: ' + lab.status() + ' (' + read() + ')';
      await listen(); await choose(0);
      for (let i = 0; i < 3 && !right(); i++) { await carry('soda', 'c1', tip(1500)); await dip('c1'); await until(right, 3000); }
      return right() ? '' : 'lemon with baking soda: ' + lab.status() + ' (' + read() + ')';
    } finally { localStorage.setItem('lantern-hill-lab', saved); }
  })()`],
  ['a nail stroked one way across a magnet picks up a paperclip', `(async () => { const {open, choose, carry, move, until, sleep, right, listen, pos, D} = lab;
    await open('makemagnet'); await choose(1);
    await carry('nail', 'pc1', () => sleep(2600));
    if (!await until(right, 2000)) return 'the plain nail: ' + lab.status();
    await listen(); await choose(0);
    const b = pos('bar'), z = b.z + .066, c = pos('pc1');
    await carry('nail', {x:b.x - .12, y:0, z}, async h => {
      for (let i = 0; i < 14; i++) { await move(h, {x:b.x + .12, z}); await move(h, {x:b.x + .12, z:z + .14}); await move(h, {x:b.x - .12, z:z + .14}); await move(h, {x:b.x - .12, z}); }
      await move(h, {x:c.x - .036, z:c.z}); await sleep(1000); await move(h, {x:c.x - .2, z:c.z + .05}); await sleep(600);
    });
    return await until(right, 2000) ? '' : 'the nail got to ' + Math.abs(D.find('nail').mag || 0).toFixed(2) + ': ' + lab.status();
  })()`],
  ['a balance tips toward the apple, and a small rock outweighs a big duck', `(async () => { const {open, choose, carry, until, right, listen, D} = lab;
    await open('balance'); await choose(0);
    const pan = s => { const t = D.find('balance').beam.translation(); return {x:t.x + s*.22, y:0, z:t.z}; };
    await carry('apple', pan(-1)); await carry('rock', pan(1));
    const how = () => { const w = D.weighing('balance'); return 'tilt ' + w.tilt.toFixed(3) + ' calm ' + w.calm.toFixed(1) + ' left ' + w.left.map(o => o.id) + ' right ' + w.right.map(o => o.id); };
    if (!await until(right, 15000)) return 'apple and rock: ' + lab.status() + ' (' + how() + ')';
    await listen(); await choose(1);
    await carry('apple', {x:-.5, y:0, z:.38}); await carry('duck', pan(-1));
    return await until(right, 15000) ? '' : 'duck and rock: ' + lab.status() + ' (' + how() + ')';
  })()`],
  ['a foil boat carries a few pennies, and a wider one carries more', `(async () => { const {open, choose, carry, until, sleep, right, listen, D, chem} = lab;
    await open('boat'); await choose(1);
    const load = async (boat, tub, coins) => {
      await carry(boat, tub); await sleep(1500);
      for (const c of coins) { if (right()) break; await carry(c, boat); await sleep(2500); }
      await until(right, 5000);
    };
    const how = id => { const b = D.find(id); return id + ' water ' + chem.liquidVol(b.c).toFixed(0) + ' coins ' + D.desk.items.filter(c => c.type === 'coin' && D.restingIn(c.id) === id).length; };
    await load('boat', 'tub1', ['p0', 'p1', 'p2', 'p3', 'p4', 'p5', 'p6']);
    if (!right()) return 'the little boat: ' + lab.status() + ' (' + how('boat') + ')';
    await listen(); await choose(0);
    await load('wideboat', 'tub2', ['q0', 'q1', 'q2', 'q3', 'q4', 'q5', 'q6']);
    return right() ? '' : 'the wide boat: ' + lab.status() + ' (' + how('wideboat') + ')';
  })()`],
  ['unlike magnet poles snap together, like poles shove apart, and the pull goes through glass', `(async () => { const {open, choose, carry, move, sleep, until, right, listen, pos, D} = lab;
    await open('poles'); await choose(0);
    const meets = () => D.poleMeets().map(m => m.a + '-' + m.b + ' ' + m.d.toFixed(3) + (m.like ? ' like' : ' unlike')).join(', ');
    // slide in end first; the held magnet points north to the left, so from the left its blue south end leads
    const approach = async (to, side) => { const t = pos(to); await carry('bar', {x:t.x + side*.33, y:0, z:t.z}, async h => {
      for (const dx of [.3, .22, .18, .16, .15]) { await move(h, {x:t.x + side*dx, z:t.z}); await sleep(500); if (right()) break; }
      await sleep(800); await move(h, {x:-.5, z:.3}); }); };
    await approach('b1', -1);
    if (!await until(right, 3000)) return 'south to north: ' + lab.status() + ' (' + meets() + ')';
    await listen(); await choose(1);
    await approach('b2', 1);
    if (!await until(right, 3000)) return 'south to south: ' + lab.status() + ' (' + meets() + ')';
    await listen(); await choose(0);
    const d = pos('dish');
    await carry('magnet', {x:d.x + .4, y:0, z:d.z}, async h => { for (const dx of [.3, .22, .2, .19]) { await move(h, {x:d.x + dx, z:d.z}); await sleep(700); } });
    return await until(right, 4000) ? '' : 'through the glass: ' + lab.status() + ' clip at ' + JSON.stringify(pos('clip'));
  })()`],
  ['rising steam spins the wheel above a boiling flask and not beside it, and the jet from a stoppered flask spins it sideways', `(async () => { const {open, choose, carry, move, click, screen, sleep, until, right, listen, D, chem, pos} = lab;
    await open('heat');
    const badge = document.querySelector('#lbGrid [data-id="heat"] .trip');
    if (!badge || badge.getAttribute('aria-label') !== 'Found on the Plate Tectonics field trip') return 'the book card has no Plate Tectonics trip badge';
    if (document.querySelector('#lbGrid [data-id="sinkfloat"] .trip')) return 'a lab experiment shows a trip badge';
    await choose(0);
    const b = pos('burner'), f = D.find('flask'), w = D.find('wheel');
    await click(screen(b.x, .012, b.z + .05));
    if (!D.find('burner').lit) return 'tapping the burner did not light it';
    if (!await until(() => chem.temp(f.c) >= 100, 30000)) return 'the water never boiled: ' + chem.temp(f.c).toFixed(0) + ' C';
    const fl = pos('flask');
    // held a little to one side of the flask, so the plume pushes the paddles on one side of the axle
    await carry('wheel', {x:fl.x + .03, y:0, z:fl.z}, async h => { await until(() => w.spin > 3, 6000); await sleep(500); await move(h, {x:fl.x + .3, z:fl.z}); await until(right, 8000); });
    if (!right()) return 'above and beside: ' + lab.status() + ' spin ' + w.spin.toFixed(1) + ' blown ' + JSON.stringify(w.blown);
    await listen(); await choose(0);
    await carry('tube', 'flask');
    if (!D.find('tube').plugged) return 'the stopper did not go into the flask';
    await carry('wheel', {x:fl.x + .17, y:0, z:fl.z});
    return await until(right, 10000) ? '' : 'the jet: ' + lab.status() + ' spin ' + w.spin.toFixed(1) + ' blown ' + JSON.stringify(w.blown) + ' jet ' + (D.find('tube').jet || 0).toFixed(0);
  })()`],
  ['water poured sideways from a tipped cup runs out long on the mat, and water dripped straight down spreads round', `(async () => { const {open, carry, tip, until, D, pos} = lab;
    await open('free');
    const cup = D.bring('cup', {fill:{water:40}}, {x:-.35, z:.15}), dropper = D.bring('red', {fill:{water:5}}, {x:.35, z:.15});
    await until(() => [cup, dropper].every(it => it.pop >= 1));
    // a puddle's length along a way, and across it
    const span = (o, ux, uz) => { const a = o.pts.map(p => p.x*ux + p.z*uz), b = o.pts.map(p => p.z*ux - p.x*uz); return [Math.max(...a) - Math.min(...a), Math.max(...b) - Math.min(...b)]; };
    const near = (x, z) => D.desk.fluid.outlines().sort((a, b) => Math.hypot(a.x - x, a.z - z) - Math.hypot(b.x - x, b.z - z))[0];
    let from;
    await carry(cup.id, {x:-.15, y:0, z:.05}, async () => { from = {...pos(cup.id)}; await tip(1300)(); });
    await carry(cup.id, {x:-.45, y:0, z:-.3});
    await carry(dropper.id, {x:.3, y:0, z:.05}, tip(3500));
    await carry(dropper.id, {x:.5, y:0, z:-.3});
    const t0 = D.desk.t; await until(() => D.desk.t - t0 > 1.5, 15000);
    const pour = near(-.15, .05), drip = near(.3, .05);
    if (!pour || Math.hypot(drip.x - .3, drip.z - .05) > .08) return 'no puddles: ' + JSON.stringify(D.desk.fluid.outlines().map(o => [o.x.toFixed(2), o.z.toFixed(2)]));
    const ux = pour.x - from.x, uz = pour.z - from.z, ul = Math.hypot(ux, uz), [along, across] = span(pour, ux/ul, uz/ul);
    // the dripped one is measured along whichever way it is longest
    let most = 0, least = Infinity; for (let a = 0; a < Math.PI; a += .1) { const [l] = span(drip, Math.cos(a), Math.sin(a)); most = Math.max(most, l); least = Math.min(least, l); }
    const how = 'poured ' + (along*100).toFixed(1) + ' cm along by ' + (across*100).toFixed(1) + ' across; dripped ' + (most*100).toFixed(1) + ' by ' + (least*100).toFixed(1);
    return along > 1.5*across && most < 1.25*least ? '' : how;
  })()`],
  ['the Free Lab cabinet hands out a tub, then the water, then the same cup three times running', `(async () => { const {open, click, screen, sleep, until, D, C} = lab;
    await open('free');
    const R = await import('/js/core/render.js'), cam = R.camera.position;
    for (let i = 0, was = cam.clone(); i < 60; i++) { await sleep(150); if (was.distanceTo(cam) < 1e-4) break; was.copy(cam); }
    const shelf = label => { const s = C.shelves.find(s => s.def.label === label); return screen(s.x, s.y + s.h/2, -.64); };
    const slot = type => { for (const s of C.shelves) for (const t of s.slots) if (t.type === type && t.model) { const v = t.model.position; return screen(v.x, v.y + .04, v.z); } };
    const count = type => D.desk.items.filter(it => !it.gone && it.type === type).length, mat = () => D.desk.items.filter(it => !it.gone).map(it => it.type).join(',');
    // a finger, not a mouse: touch pointers only move the hand while they're down
    const cv = document.getElementById('world'), tap = async ([x, y]) => { for (const [type, buttons] of [['pointerdown', 1], ['pointerup', 0]]) { cv.dispatchEvent(new PointerEvent(type, {pointerId:9, pointerType:'touch', isPrimary:true, bubbles:true, button:0, buttons, clientX:x, clientY:y})); await sleep(80); } };
    await click(shelf('Containers')); await sleep(1200); await click(slot('tub'));
    if (!await until(() => count('tub'), 3000)) return 'no tub came out';
    await click(shelf('Bottles')); await sleep(1200); await click(slot('pitcher'));
    if (!await until(() => count('pitcher'), 3000)) return 'no water after the tub: ' + mat();
    await tap(shelf('Containers')); await sleep(1200);
    for (let i = 1; i <= 3; i++) { await tap(slot('cup')); if (!await until(() => count('cup') === i, 3000)) return 'cup ' + i + ' never came: ' + mat(); }
    return '';
  })()`],
  ['leaving the Free Lab by any route puts the cabinet away and the camera back on the desk', `(async () => { const {open, click, screen, sleep, until, C} = lab;
    const [R, {game}, THREE, dlg] = await Promise.all(['/js/core/render.js', '/js/state.js', 'three', '/js/ui/dialogue.js'].map(m => import(m)));
    const saved = localStorage.getItem('lantern-hill-lab'), rec = JSON.parse(saved);
    // with Heat Rises done its burner, whose flame is unlit, is on the shelves too
    localStorage.setItem('lantern-hill-lab', JSON.stringify({...rec, done:[...rec.done, 'heat']}));
    const settle = async () => { const cam = R.camera.position; for (let i = 0, was = cam.clone(); i < 60; i++) { await sleep(150); if (was.distanceTo(cam) < 1e-4) break; was.copy(cam); } };
    const shelf = label => { const s = C.shelves.find(s => s.def.label === label); return screen(s.x, s.y + s.h/2, -.64); };
    const away = () => { const p = new THREE.Vector3(), l = new THREE.Vector3(); game.cutCam(p, l); return p.distanceTo(R.camera.position); };
    const home = () => C.shelves.every(sh => sh.slots.every(s => !s.model || s.model.position.distanceTo(s.home) < .002));
    try {
      for (const route of ['book', 'escape', 'step away']) {
        await open('free'); await settle(); await click(shelf('Tools')); await sleep(1500);
        if (!C.menu().veil || !C.menu().open) return route + ': the Tools shelf never opened';
        if (route === 'book') document.getElementById('lhBook').click();
        if (route === 'escape') for (let i = 0; i < 2; i++) { dispatchEvent(new KeyboardEvent('keydown', {key:'Escape'})); await sleep(300); }
        if (route === 'step away') { document.getElementById('lhLeave').click(); await sleep(600); }
        await open('sinkfloat'); dlg.endConvo(true); await settle(); await sleep(1500);
        const m = C.menu(), bad = [m.open && 'shelf ' + m.open + ' open', m.veil && 'veil up', m.plank && 'plank up', m.out > .01 && 'things out', m.ajar > .01 && 'a door ajar',
          !home() && 'things not home', away() > .01 && 'camera ' + away().toFixed(3) + ' off the desk view', document.getElementById('lhCard').hidden && 'question card hidden'].filter(Boolean);
        if (bad.length) return route + ': ' + bad.join(', ');
      }
      return '';
    } finally { localStorage.setItem('lantern-hill-lab', saved); }
  })()`],
  ['the Free Lab cabinet holds only what finished experiments used, and hands it out', `(async () => { const {open, click, screen, until, sleep, D, C} = lab;
    await open('free');
    if (D.desk.items.length) return 'the Free Lab started with things already on the mat';
    const bottles = C.shelves.find(s => s.def.label === 'Bottles'), has = t => !!bottles.slots.find(s => s.type === t).model;
    if (has('cabbage')) return 'cabbage juice is in the cabinet before its experiment is done';
    // let the camera finish easing back to take in the cabinet
    const R = await import('/js/core/render.js'), cam = R.camera.position;
    for (let i = 0, was = cam.clone(); i < 60; i++) { await sleep(150); if (was.distanceTo(cam) < 1e-4) break; was.copy(cam); }
    if (!has('vinegar')) return 'vinegar is missing after the volcano';
    await click(screen(bottles.x, bottles.y + bottles.h/2, -.64)); await sleep(1200);
    const v = bottles.slots.find(s => s.type === 'vinegar').model.position;
    await click(screen(v.x, v.y + .06, v.z));
    return await until(() => D.desk.items.some(it => it.type === 'vinegar'), 3000) ? '' : 'tapping the vinegar put nothing on the mat';
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
