const S = require('./sim.js'), T = require('./themes.js'), { polish } = require('./polish.js');
const L = T.nap, out = {};
const sketches = {
  catapult: [{ type: 'lever', x: 440, y: 583, a: 0, t: .17 }],
  skyway:   [{ type: 'ruler', x: 300, y: 350, a: .25 }, { type: 'ruler', x: 640, y: 420, a: .2 }],
  kicker:   [{ type: 'ruler', x: 260, y: 470, a: .7 }, { type: 'ruler', x: 450, y: 600, a: -.45 }],
  catapultBackstop: [{ type: 'lever', x: 440, y: 583, a: 0, t: .1 }, { type: 'book', x: 1000, y: 380, a: 0 }],
};
for (const [k, sk] of Object.entries(sketches)) {
  const r = polish(L, sk, { tries: +(process.argv[2] || 2500), seed: 3 });
  if (r) { out[k] = r.pl; console.log(k, 'WORKS after', r.tries, r.res.tokens.join('>'), JSON.stringify(r.pl.map(p => ({ ...p, x: Math.round(p.x), y: Math.round(p.y), a: +p.a.toFixed(3), t: p.t !== undefined ? +p.t.toFixed(3) : undefined })))); }
  else console.log(k, 'no luck');
}
require('fs').writeFileSync('out/nap.design.json', JSON.stringify(out));
