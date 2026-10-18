// Solver + level fitness for Marble Run Rescue levels.
const Sim = require('./sim.js');
const { FLOOR_Y, PIECES } = Sim;

function rngFrom(seed) { let s = seed >>> 0 || 1; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296); }
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

function trayLeft(level, placements) {
  const left = { ...level.tray };
  for (const p of placements) left[p.type]--;
  return left;
}

// put a dynamic piece standing on whatever is below (x, y)
function standOn(level, placements, p) {
  const sy = Sim.surfaceBelow(level, placements, p.x, p.y);
  if (sy > FLOOR_Y + 300) return null;
  const half = p.type === 'yarn' ? PIECES.yarn.r : p.type === 'lever' ? 57 : PIECES[p.type].h / 2;
  p.y = sy - half - 1; if (p.type !== 'lever') p.a = 0;
  return p;
}

function valid(level, placements, i) { return !Sim.overlaps(level, placements, i); }

function propose(level, placements, type, trail, R) {
  for (let tries = 0; tries < 10; tries++) {
    let x, y; const k = R(), closed = (level.gates || []).filter((g, gi) => true);
    if (trail && trail.length && k < .45) { const t = trail[Math.floor((.6 + .4 * R()) * (trail.length - 1))]; x = t[0] + (R() - .3) * 110 * Math.sign(t[2] || 1); y = t[1] + 18 + R() * 60; }  // catch it where it went wrong
    else if (trail && trail.length && k < .7) { const t = trail[Math.floor(R() * trail.length)]; x = t[0] + (R() - .5) * 120; y = t[1] + 20 + R() * 70; }
    else if (closed.length && k < .85) { const g = closed[Math.floor(R() * closed.length)].trigger; x = g.x + (R() - .5) * 160; y = g.y + (R() - .2) * 80; }   // something near a trigger
    else { x = 60 + R() * (Sim.W - 120); y = 120 + R() * (FLOOR_Y - 140); }
    let p = { type, x, y, a: 0 };
    if (type === 'ruler' || type === 'book') p.a = R() < .7 ? Math.sign(level.cup.x - x) * (.08 + R() * .55) : (R() - .5) * 1.3;   // mostly sloping toward the cup
    if (type === 'lever') { p.a = (R() - .5) * .7; p.t = (R() - .5) * .8; p.y -= 30; if (!standOn(level, placements, p)) continue; }
    if (type === 'domino' || type === 'block' || type === 'yarn') { p.y -= 60; if (!standOn(level, placements, p)) continue; }
    const next = [...placements, p];
    if (valid(level, next, next.length - 1)) return next;
  }
  return null;
}

function addDominoRow(level, placements, trail, R) {
  const left = trayLeft(level, placements).domino; if (left < 2) return null;
  const n = 2 + Math.floor(R() * (left - 1)), gap = 26 + R() * 14, dir = R() < .5 ? 1 : -1;
  let x0, y0;
  if (trail && trail.length && R() < .7) { const t = trail[Math.floor(R() * trail.length)]; x0 = t[0]; y0 = t[1]; } else { x0 = 80 + R() * 1000; y0 = 150 + R() * 400; }
  let cur = placements;
  for (let i = 0; i < n; i++) {
    const p = standOn(level, cur, { type: 'domino', x: x0 + dir * i * gap, y: y0, a: 0 }); if (!p) break;
    const next = [...cur, p]; if (!valid(level, next, next.length - 1)) break; cur = next;
  }
  return cur.length > placements.length ? cur : null;
}

function mutate(level, placements, trail, R) {
  const left = trayLeft(level, placements), avail = Object.keys(left).filter(k => left[k] > 0);
  const r = R();
  if ((r < .3 || !placements.length) && avail.length) { const t = avail[Math.floor(R() * avail.length)]; return t === 'domino' && R() < .6 ? addDominoRow(level, placements, trail, R) : propose(level, placements, t, trail, R); }
  if (r < .38 && placements.length) {
    let i = Math.floor(R() * placements.length);
    if (trail && trail.length && R() < .6) { const e = trail[trail.length - 1]; let bd = 1e9; placements.forEach((p, j) => { const d = Math.hypot(p.x - e[0], p.y - e[1]); if (d < bd) { bd = d; i = j; } }); }
    return placements.filter((_, j) => j !== i); }
  if (!placements.length) return null;
  const i = Math.floor(R() * placements.length), p = { ...placements[i] }, big = R() < .35;
  const k = R();
  if (k < .55) { p.x += (R() - .5) * (big ? 160 : 30); p.y += (R() - .5) * (big ? 160 : 30); }
  else if (k < .85) { if (p.type === 'ruler' || p.type === 'book' || p.type === 'lever') p.a += (R() - .5) * (big ? 1 : .25); else p.x += (R() - .5) * 20; }
  else if (p.type === 'lever') p.t = clamp((p.t || 0) + (R() - .5) * .3, -.42, .42);
  else p.x += (R() - .5) * 40;
  if (p.type === 'ruler' || p.type === 'book') p.a = clamp(p.a, -1.2, 1.2);
  if (p.type === 'lever') p.a = clamp(p.a, -.6, .6);
  if (['domino', 'block', 'yarn', 'lever'].includes(p.type)) { p.y -= 40; if (!standOn(level, placements.filter((_, j) => j !== i), p)) return null; }
  const next = placements.map((q, j) => j === i ? p : q);
  return valid(level, next, i) ? next : null;
}

function score(level, res) {
  const nb = res.buttons.filter(Boolean).length;
  if (res.success) return 1000 + 30 * nb - res.steps * .05 - res.pieces * 2;
  const g = res.gateOpen.length ? res.gateOpen.filter(Boolean).length / res.gateOpen.length : 0;
  // unsolved: closer is better, opening gates is good, and surviving longer helps timing puzzles
  const tg = res.gateOpen.length && g < 1 ? (400 - Math.min(400, res.trigDist)) * .5 : (res.gateOpen.length ? 200 : 0);
  return 300 * g + tg + (800 - Math.min(800, res.minDist)) * .6 + 20 * nb + (res.launched ? 60 : 0) + Math.min(res.steps, 700) * .12;
}

// search for many different solutions to one level
function solve(level, opt = {}) {
  const R = rngFrom(opt.seed || 7), restarts = opt.restarts || 40, iters = opt.iters || 70;
  const sols = [], famSeen = new Map(); let sims = 0, restartHits = 0, bestScore = -1e9, bestRes = null;
  for (let r = 0; r < restarts; r++) {
    let cur = [], curRes = Sim.run(level, cur, {}); sims++;
    let curScore = score(level, curRes), hit = false;
    for (let it = 0; it < iters; it++) {
      const cand = mutate(level, cur, curRes.trail, R); if (!cand) continue;
      const res = Sim.run(level, cand, {}); sims++;
      const sc = score(level, res);
      if (res.success) {
        hit = true; const fam = Sim.family(res.tokens);
        sols.push({ placements: cand, fam, pieces: cand.length, buttons: res.buttons, steps: res.steps, tokens: res.tokens });
        if (!famSeen.has(fam)) famSeen.set(fam, sols.length - 1);
      }
      const temp = 60 * (1 - it / iters) + 2;
      if (sc >= curScore || R() < Math.exp((sc - curScore) / temp)) { cur = cand; curRes = res; curScore = sc; }
      if (sc > bestScore) { bestScore = sc; bestRes = res; }
      if (res.success && R() < .5) break;          // found one; move on to look for different routes
    }
    if (hit) restartHits++;
  }
  return { sols, sims, findRate: restartHits / restarts, bestScore, bestRes };
}

// how good is this level as a puzzle?
function evaluate(level, opt = {}) {
  const sv = solve(level, opt), R = rngFrom((opt.seed || 7) + 99);
  const fams = new Map();
  for (const s of sv.sols) { if (!fams.has(s.fam)) fams.set(s.fam, []); fams.get(s.fam).push(s); }
  const report = { sims: sv.sims, findRate: sv.findRate, families: [], fitness: 0, notes: [] };
  if (!sv.sols.length) { report.fitness = -20 + sv.bestScore / 100; report.notes.push('unsolved'); return { report, sv }; }
  // per family: simplest solution, robustness to small nudges
  let robustSum = 0;
  for (const [fam, list] of fams) {
    list.sort((a, b) => a.pieces - b.pieces);
    const best = list[0]; let ok = 0; const N = opt.robustN || 3;
    for (let k = 0; k < N; k++) {
      const pert = best.placements.map(p => ({ ...p, x: p.x + (R() - .5) * 8, a: p.a + (p.type === 'ruler' || p.type === 'book' || p.type === 'lever' ? (R() - .5) * .06 : 0) }));
      if (Sim.run(level, pert).success) ok++;
    }
    const depth = fam ? fam.split('>').length : 0;
    report.families.push({ fam, count: list.length, minPieces: best.pieces, depth, robust: ok / N, buttons: best.buttons, example: best.placements });
    robustSum += ok / N;
  }
  const F = report.families.length, total = sv.sols.length;
  const H = -[...fams.values()].reduce((h, l) => { const p = l.length / total; return h + p * Math.log(p); }, 0);
  const minPieces = Math.min(...report.families.map(f => f.minPieces)), minDepth = Math.min(...report.families.map(f => f.depth));
  const trivial = (minPieces <= 1 ? 1 : 0) + (minDepth < level.depthTarget ? (level.depthTarget - minDepth) * .6 : 0);
  const [b0, b1] = level.band, fr = sv.findRate, band = fr < b0 ? (b0 - fr) / b0 : fr > b1 ? (fr - b1) / (1 - b1) : 0;
  const btnReach = (level.buttons || []).map((_, i) => report.families.some(f => f.buttons[i]));
  const btnFamilies = (level.buttons || []).map((_, i) => report.families.filter(f => f.buttons[i]).map(f => f.fam));
  const btnDistinct = new Set(btnFamilies.flat()).size;
  const leverFams = report.families.filter(f => f.fam.includes('lever') || f.fam.includes('launch')).length;
  report.fitness = 3 * Math.min(F, 5) + 2.2 * H + 2 * (robustSum / F) + 1 * btnReach.filter(Boolean).length + .6 * Math.min(btnDistinct, 3)
    + .4 * Math.min(minDepth, level.depthTarget + 2) + .6 * Math.min(leverFams, 2) - 4 * trivial - 4 * band;
  Object.assign(report, { F, H: +H.toFixed(2), minPieces, minDepth, trivial, band: +band.toFixed(2), btnReach, robust: +(robustSum / F).toFixed(2) });
  return { report, sv };
}

module.exports = { solve, evaluate, rngFrom, score };
