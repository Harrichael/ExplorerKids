const T = require('./themes.js'), { evaluate } = require('./solve.js');
const name = process.argv[2] || 'drawbridge';
const t0 = Date.now(); const { report } = evaluate(T[name], { seed: 3 });
console.log(name, ((Date.now() - t0) / 1000).toFixed(1) + 's', JSON.stringify({ ...report, families: report.families.map(f => ({ fam: f.fam, n: f.count, minP: f.minPieces, rob: f.robust })) }, null, 1));
