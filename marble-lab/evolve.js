// Simulated annealing over level structures. Usage: node evolve.js <theme> [iterations]
const fs = require('fs');
const T = require('./themes.js'), { evaluate, rngFrom } = require('./solve.js');
const name = process.argv[2], N = +(process.argv[3] || 60), R = rngFrom(1234 + name.length);
const clone = o => JSON.parse(JSON.stringify(o));
const LIM = { ruler: [1, 5], book: [0, 2], domino: [0, 6], block: [0, 2], lever: [0, 2], yarn: [0, 1] };
const pick = a => a[Math.floor(R() * a.length)];
const near = (a, b, d) => Math.hypot(a.x - b.x, a.y - b.y) < d;

function sane(L) {
  for (const s of L.statics) {
    if (s.kind === 'floor') continue;
    const inside = (p, pad) => Math.abs(p.x - s.x) < s.w / 2 + pad && Math.abs(p.y - s.y) < s.h / 2 + pad;
    if (inside(L.start, 14) || inside({ x: L.cup.x, y: L.cup.y - 25 }, 34)) return false;
    for (const g of L.gates || []) if (inside(g.trigger, 0)) return false;
    if (s.x < 30 || s.x > 1170 || s.y < 120 || s.y > 640) return false;
  }
  for (const b of L.buttons) if (b.x < 30 || b.x > 1170 || b.y < 80 || b.y > 625) return false;
  for (const g of L.gates || []) { const t = g.trigger; if (t.x < 30 || t.x > 1170 || t.y < 100 || t.y > 625) return false; }
  return true;
}

function mutateLevel(L0) {
  for (let tries = 0; tries < 20; tries++) {
    const L = clone(L0), k = R(), shelves = L.statics.filter(s => s.kind === 'shelf');
    if (k < .22 && shelves.length) { const s = pick(shelves); s.x += (R() - .5) * 120; s.y += (R() - .5) * 120; if (R() < .4) s.w = Math.max(70, Math.min(260, s.w + (R() - .5) * 80)); if (R() < .3) s.a = Math.max(-.3, Math.min(.3, (s.a || 0) + (R() - .5) * .2)); L.mut = 'move shelf'; }
    else if (k < .32 && shelves.length < L.maxShelves) { L.statics.push({ x: 120 + R() * 960, y: 180 + R() * 400, w: 90 + R() * 120, h: 14, a: (R() - .5) * .3, kind: 'shelf', added: true }); L.mut = 'add shelf'; }
    else if (k < .38) { const add = L.statics.filter(s => s.added); if (!add.length) continue; L.statics.splice(L.statics.indexOf(pick(add)), 1); L.mut = 'remove shelf'; }
    else if (k < .52 && (L.gates || []).length) { const g = pick(L.gates); g.trigger.x += (R() - .5) * 140; g.trigger.y += (R() - .5) * 120; L.mut = 'move trigger'; }
    else if (k < .62) { const b = pick(L.buttons); b.x += (R() - .5) * 160; b.y += (R() - .5) * 140; L.mut = 'move button'; }
    else if (k < .8) { const t = pick(Object.keys(LIM)); L.tray[t] = Math.max(LIM[t][0], Math.min(LIM[t][1], (L.tray[t] || 0) + (R() < .5 ? -1 : 1))); L.mut = 'tray ' + t; }
    else if (k < .87 && (L.tails || []).length) { const t = pick(L.tails); t.px += (R() - .5) * 80; t.amp = Math.max(.3, Math.min(.9, t.amp + (R() - .5) * .2)); t.period = Math.max(1.4, Math.min(3.2, t.period + (R() - .5) * .5)); L.mut = 'tail'; }
    else if (k < .93) { const f = L.statics.filter(s => s.kind === 'furniture'); if (!f.length) continue; const s = pick(f); s.x += (R() - .5) * 40; s.y += (R() - .5) * 30; L.mut = 'nudge furniture'; }
    else if (k < .965) {
      // raise or lower the cup together with whatever it sits on
      const sup = L.statics.find(s => Math.abs((s.y - s.h / 2) - L.cup.y) < 3 && Math.abs(s.x - L.cup.x) < s.w / 2 && s.kind !== 'floor'); if (!sup) continue;
      const dy = (R() - .5) * 80; sup.y += dy / 2; sup.h -= dy; L.cup.y += dy; if (sup.h < 20) continue; L.mut = 'cup height';
    }
    else if (k < .985) {
      const sup = L.statics.find(s => Math.abs((s.y - s.h / 2) - (L.start.y + 16)) < 4 && Math.abs(s.x - L.start.x) < s.w / 2); if (!sup) continue;
      const dy = (R() - .5) * 80; sup.y += dy; L.start.y += dy; L.mut = 'start height';
    }
    else { L.start.vx = Math.max(2.5, Math.min(5.5, L.start.vx + (R() - .5))); L.mut = 'start push'; }
    if (sane(L)) return L;
  }
  return clone(L0);
}

const evalOpt = { seed: 11, restarts: 34, iters: 60, robustN: 3 };
let cur = clone(T[name]), t0 = Date.now();
let curE = evaluate(cur, evalOpt), best = { L: cur, E: curE }, history = [curE.report.fitness];
const top = [{ L: cur, E: curE }];
fs.writeFileSync(`out/${name}.log`, ''); const log = { write: t => fs.appendFileSync(`out/${name}.log`, t), end() {} };
const save = () => fs.writeFileSync(`out/${name}.json`, JSON.stringify({ history, cands: top.slice(0, 3).map(c => ({ level: c.L, report: c.E.report })) }));
log.write(`start fitness ${curE.report.fitness.toFixed(2)}\n`); save();
for (let i = 1; i <= N; i++) {
  const temp = 3 * Math.pow(.05, i / N);
  const cand = mutateLevel(cur), E = evaluate(cand, evalOpt), d = E.report.fitness - curE.report.fitness;
  const acc = d > 0 || R() < Math.exp(d / temp);
  if (acc) { cur = cand; curE = E; }
  if (E.report.fitness > best.E.report.fitness) best = { L: cand, E };
  // keep a few distinct strong candidates (differing in structure)
  if (E.report.F) { top.push({ L: cand, E }); top.sort((a, b) => b.E.report.fitness - a.E.report.fitness); for (let a = 0; a < top.length; a++) for (let b = top.length - 1; b > a; b--) if (Math.abs(top[a].E.report.fitness - top[b].E.report.fitness) < .3) top.splice(b, 1); top.length = Math.min(top.length, 5); }
  history.push(best.E.report.fitness);
  log.write(`${i}/${N} T=${temp.toFixed(2)} ${cand.mut} fit=${E.report.fitness.toFixed(2)} F=${E.report.F || 0} find=${E.report.findRate.toFixed(2)} ${acc ? 'ACCEPT' : ''} best=${best.E.report.fitness.toFixed(2)} ${((Date.now() - t0) / 60000).toFixed(1)}min\n`);
  save();
}
log.write('done\n'); log.end();
