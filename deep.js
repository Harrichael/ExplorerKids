// One bigger solver pass on a candidate, merging route families across a few seeds.
const fs = require('fs'), { evaluate } = require('./solve.js');
const [name, idx = 0, seeds = 3] = process.argv.slice(2);
const d = JSON.parse(fs.readFileSync(`out/${name}.json`, 'utf8')), c = d.cands[+idx];
const fams = new Map(); let find = 0;
for (let s = 0; s < +seeds; s++) {
  const r = evaluate(c.level, { seed: 101 + s * 97, restarts: 50, iters: 70, robustN: 3 }).report; find += r.findRate;
  for (const f of r.families) { const e = fams.get(f.fam); if (!e) fams.set(f.fam, f); else { e.count += f.count; if (f.minPieces < e.minPieces) Object.assign(e, { ...f, count: e.count }); } }
}
const rep = { ...c.report, families: [...fams.values()].sort((a, b) => b.count - a.count), F: fams.size, findRate: find / +seeds };
fs.writeFileSync(`out/${name}.c${idx}.json`, JSON.stringify({ level: c.level, report: rep }));
console.log(name, idx, 'F', rep.F, rep.families.map(f => `${f.fam} (${f.minPieces}pc, ${f.count}x)`).join(' | '));
