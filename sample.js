// Brute-force candidate finder: many random multi-piece setups biased toward the marble's and props' paths.
const fs = require('fs'), Sim = require('./sim.js'), T = require('./themes.js'), SV = require('./solve.js');
const [name, secs = 120, seed = 1] = process.argv.slice(2);
const L = JSON.parse(JSON.stringify(T[name])), R = SV.rngFrom(+seed), t0 = Date.now();
const base = Sim.run(L, []); L._propTrail = base.propTrail;
const sols = []; let n = 0;
while (Date.now() - t0 < secs * 1000) {
  let pl = [], trail = base.trail; const k = 1 + Math.floor(R() * 4);
  for (let i = 0; i < k; i++) { const left = Object.entries(L.tray).filter(([t, c]) => c - pl.filter(p => p.type === t).length > 0).map(([t]) => t); if (!left.length) break;
    const t = left[Math.floor(R() * left.length)]; const next = SV.propose(L, pl, t, trail, R); if (next) { pl = next; if (R() < .5) { const r = Sim.run(L, pl); n++; trail = r.trail; if (r.propTrail.length) L._propTrail = r.propTrail; } } }
  if (!pl.length) continue;
  const r = Sim.run(L, pl); n++;
  if (r.success) sols.push({ placements: pl, fam: Sim.family(r.tokens), pieces: pl.length, buttons: r.buttons, tokens: r.tokens });
}
const fams = {}; for (const s of sols) (fams[s.fam] = fams[s.fam] || []).push(s);
fs.writeFileSync(`out/${name}.samples.json`, JSON.stringify(sols));
console.log(name, 'sims', n, 'solutions', sols.length);
for (const [f, l] of Object.entries(fams).sort((a, b) => b[1].length - a[1].length)) console.log(`  ${l.length}x  ${f}  (min ${Math.min(...l.map(s => s.pieces))} pcs)`);
