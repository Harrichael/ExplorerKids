const fs = require('fs'), out = {};
for (const k of ['drawbridge', 'nap', 'snack']) {
  const f = fs.existsSync(`out/${k}.deep.json`) ? `out/${k}.deep.json` : `out/${k}.json`; if (!fs.existsSync(f)) continue;
  const d = JSON.parse(fs.readFileSync(f, 'utf8'));
  let cands = d.cands.filter(c => c.report.F > 0); if (!cands.length) cands = d.cands.slice(0, 1);
  out[k] = { cands, history: d.history };
}
fs.writeFileSync('out/results.json', JSON.stringify(out)); console.log(Object.entries(out).map(([k, v]) => k + ':' + v.cands.length + ' cands, best F=' + (v.cands[0].report.F || 0)).join(' | '));
