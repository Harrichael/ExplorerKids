// Local search around a hand-made sketch until it actually works in the sim.
// usage (as module): polish(level, sketch, {tries, spread}) -> working placements or null
const Sim = require('./sim.js'), { rngFrom } = require('./solve.js');
function polish(level, sketch, opt = {}) {
  const R = rngFrom(opt.seed || 1), tries = opt.tries || 3000, sp = opt.spread || 1;
  const first = Sim.run(level, sketch); if (first.success) return { pl: sketch, res: first, tries: 0 };
  let best = sketch, bestSc = -first.minDist;
  for (let i = 0; i < tries; i++) {
    const base = R() < .5 ? best : sketch;
    const pl = base.map(p => { const q = { ...p };
      if (R() < .7) { q.x += (R() - .5) * 40 * sp; if (!['domino', 'block', 'yarn', 'lever'].includes(q.type)) q.y += (R() - .5) * 40 * sp; }
      if (R() < .5 && ['ruler', 'book', 'lever'].includes(q.type)) q.a += (R() - .5) * .25 * sp;
      if (q.type === 'lever' && R() < .5) q.t = Math.max(-.42, Math.min(.42, (q.t || 0) + (R() - .5) * .2 * sp));
      return q; });
    if (pl.some((_, j) => Sim.overlaps(level, pl, j))) continue;
    const r = Sim.run(level, pl);
    if (r.success) return { pl, res: r, tries: i + 1 };
    const sc = -r.minDist + (r.gateOpen.filter(Boolean).length * 200) + (r.launched ? 100 : 0);
    if (sc > bestSc) { bestSc = sc; best = pl; }
  }
  return null;
}
module.exports = { polish };
