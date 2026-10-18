// Marble Run Rescue — shared physics sim (Node + browser).
// Side view, Matter.js units: ~1 unit = 1 mm. y grows downward.
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory(require('matter-js'));
  else root.MarbleSim = factory(root.Matter);
})(typeof self !== 'undefined' ? self : this, function (Matter) {
  const { Engine, Bodies, Body, Composite, Constraint, Events, Query, Common } = Matter;
  const W = 1200, H = 720, FLOOR_Y = 640, DT = 1000 / 60;

  // ---- piece catalogue: what the player can place ----
  const PIECES = {
    ruler:  { w: 150, h: 10, static: true,  friction: .02 },              // smooth, fast ramp
    book:   { w: 110, h: 26, static: true,  friction: .35 },              // grippy, slow slope
    domino: { w: 10,  h: 58, static: false, friction: .45, density: .0022 },
    block:  { w: 36,  h: 36, static: false, friction: .6,  density: .006 },
    lever:  { w: 210, h: 10, static: false, friction: .3,  density: .0004 }, // plank on a sliding cotton-reel fulcrum
    yarn:   { r: 17,          static: false, friction: .9,  density: .0016 },
    ball:   { r: 17,          static: false, friction: .2,  density: .008 },             // a heavy wooden toy ball
  };
  const MARBLE = { r: 10, density: .0045, restitution: .3, friction: 0, frictionAir: .0012 };

  function makePiece(p, extra = {}) {
    const d = PIECES[p.type], o = { label: p.type, friction: d.friction, isStatic: d.static, ...extra };
    if (d.density) o.density = d.density;
    let b;
    if (p.type === 'yarn') b = Bodies.circle(p.x, p.y, d.r, { ...o, restitution: 0, frictionAir: .02, frictionStatic: 1 });
    else if (p.type === 'ball') b = Bodies.circle(p.x, p.y, d.r, { ...o, friction: 0, frictionStatic: 0, restitution: .1, frictionAir: .002 });
    else b = Bodies.rectangle(p.x, p.y, d.w, d.h, { ...o, chamfer: p.type === 'block' ? { radius: 4 } : undefined });
    Body.setAngle(b, p.a || 0);
    return b;
  }

  // ---- world construction ----
  function build(level, placements) {
    Common._nextId = 0;
    const engine = Engine.create({ positionIterations: 8, velocityIterations: 6 });
    engine.gravity.y = 1;
    const world = engine.world, S = { engine, level, statics: [], dyn: [], placed: [], gates: [], tails: [], triggers: [], buttons: [], levers: [] };
    const st = (x, y, w, h, a, label, fr = .02) => { const b = Bodies.rectangle(x, y, w, h, { isStatic: true, label, friction: fr, frictionStatic: 0, angle: a || 0 }); S.statics.push(b); return b; };
    for (const s of level.statics) {
      if (s.r) { const b = Bodies.circle(s.x, s.y, s.r, { isStatic: true, label: s.kind || 'cat', friction: .02, frictionStatic: 0 }); S.statics.push(b); continue; }   // round things, like a sleeping cat
      st(s.x, s.y, s.w, s.h, s.a, s.kind || 'shelf', s.fr ?? .02);
    }
    // cup: a little U
    const c = level.cup; S.cupBox = { x0: c.x - 23, x1: c.x + 23, y0: c.y - 26, y1: c.y };
    // a teacup tipped on its side: a low lip toward the approach, a tall back
    const side = c.open || -1, lip = 7, back = 46;
    st(c.x - side * 27, c.y - back / 2, 6, back, 0, 'cup'); st(c.x, c.y + 2, 60, 6, 0, 'cup');
    // pre-set dynamic props (dominoes, blocks, yarn that are part of the level)
    for (const p of level.props || []) { const b = makePiece(p); b.label = p.type; b.isProp = true; S.dyn.push(b); }
    // gates: a plank hinged at one end, held by a latch until its trigger is hit
    for (const g of level.gates || []) {
      const len = g.len, tilt = g.tilt ?? .55, ang = g.dir > 0 ? -Math.PI/2 + tilt : -Math.PI/2 - tilt;   // standing, tipped toward the gap
      const cx = g.hx + Math.cos(ang) * len / 2, cy = g.hy + Math.sin(ang) * len / 2;
      const plank = Bodies.rectangle(cx, cy, len, 14, { label: 'gate', density: .002, friction: .2, angle: ang });
      const hinge = Constraint.create({ bodyA: plank, pointA: { x: -Math.cos(ang) * len / 2, y: -Math.sin(ang) * len / 2 }, pointB: { x: g.hx, y: g.hy }, stiffness: 1, length: 0 });
      const tip = { x: g.hx + Math.cos(ang) * len, y: g.hy + Math.sin(ang) * len };
      const latch = Constraint.create({ bodyA: plank, pointA: { x: Math.cos(ang) * len / 2, y: Math.sin(ang) * len / 2 }, pointB: tip, stiffness: 1, length: 0 });
      S.gates.push({ plank, hinge, latch, open: false, g });
      const trig = Bodies.circle(g.trigger.x, g.trigger.y, g.trigger.r || 16, { isStatic: true, isSensor: true, label: 'trigger' });
      trig.gate = S.gates[S.gates.length - 1]; S.triggers.push(trig);
    }
    // Biscuit's tail: a kinematic paddle swinging about a pivot
    for (const t of level.tails || []) { const b = Bodies.rectangle(t.px, t.py - t.len / 2, 18, t.len, { isStatic: true, label: 'tail', friction: .3 }); b.tail = t; S.tails.push(b); }
    for (const bt of level.buttons || []) { const b = Bodies.circle(bt.x, bt.y, 13, { isStatic: true, isSensor: true, label: 'button' }); b.got = false; S.buttons.push(b); }
    // player placements
    for (const p of placements) {
      if (p.type === 'lever') {
        const d = PIECES.lever, off = (p.t || 0) * d.w;              // fulcrum offset along the plank
        const cx = p.x - Math.cos(p.a) * off, cy = p.y - Math.sin(p.a) * off;
        // a ruler with a little stopper at each end, so a marble can sit in the end like a spoon's bowl
        const f = { group: -7 }, d2 = PIECES.lever;
        const parts = [Bodies.rectangle(cx, cy, d2.w, d2.h, { label: 'lever', collisionFilter: f, friction: d2.friction, density: d2.density }),
          Bodies.rectangle(cx - d2.w / 2 + 10, cy - 7, 8, 6, { label: 'lever', collisionFilter: f, density: d2.density, chamfer: { radius: 2.5 } }),
          Bodies.rectangle(cx + d2.w / 2 - 10, cy - 7, 8, 6, { label: 'lever', collisionFilter: f, density: d2.density, chamfer: { radius: 2.5 } })];
        const plank = Body.create({ parts, label: 'lever', collisionFilter: f, friction: d2.friction });
        Body.setPosition(plank, { x: cx, y: cy + (plank.position.y - cy) }); Body.setAngle(plank, p.a);
        const reel = Bodies.circle(p.x, p.y + 14, 13, { isStatic: true, label: 'reel', collisionFilter: { group: -7 } });
        const stand = Bodies.rectangle(p.x, p.y + 42, 26, 30, { isStatic: true, label: 'reel', collisionFilter: { group: -7 } });   // reel sits on a little block
        S.statics.push(stand);
        const pin = Constraint.create({ bodyA: plank, pointA: { x: Math.cos(p.a) * off, y: Math.sin(p.a) * off }, pointB: { x: p.x, y: p.y }, stiffness: 1, length: 0 });
        plank.placed = true; S.placed.push(plank); S.statics.push(reel); S.levers.push({ plank, pin }); continue;
      }
      const b = makePiece(p); b.placed = true; S.placed.push(b);
    }
    // the marble, held until the settle phase ends
    S.marble = Bodies.circle(level.start.x, level.start.y, MARBLE.r, { label: 'marble', density: MARBLE.density, restitution: MARBLE.restitution, friction: MARBLE.friction, frictionStatic: 0, frictionAir: MARBLE.frictionAir, isStatic: true });
    Composite.add(world, [...S.statics, ...S.dyn, ...S.placed, ...S.tails, ...S.triggers, ...S.buttons, S.marble]);
    for (const g of S.gates) Composite.add(world, [g.plank, g.hinge, g.latch]);
    for (const l of S.levers) Composite.add(world, l.pin);
    return S;
  }

  // ---- validity of a player placement (no overlap with the level or other pieces) ----
  function overlaps(level, placements, idx) {
    const S = build(level, placements), p = placements[idx];
    const body = S.placed[idx];
    if (p.x < 20 || p.x > W - 20 || p.y < 20 || p.y > FLOOR_Y + 5) return true;
    const others = [...S.statics, ...S.dyn, ...S.placed.filter((_, i) => i !== idx), ...S.gates.map(g => g.plank), ...S.tails].filter(b => b.label !== 'reel' || p.type !== 'lever');
    if (Query.collides(body, others).length) return true;
    if (Math.hypot(p.x - level.start.x, p.y - level.start.y) < 40) return true;
    for (const g of level.gates || []) if (Math.hypot(p.x - g.trigger.x, p.y - g.trigger.y) < (g.trigger.r || 16) + 14) return true;   // no parking things on a trigger
    if (Math.abs(p.x - level.cup.x) < 45 && p.y > level.cup.y - 60 && p.y < level.cup.y + 10) return true;
    return false;
  }

  // drop point: highest surface below (x, y) — used to stand dominoes, blocks and yarn on something
  function surfaceBelow(level, placements, x, y) {
    const S = build(level, placements);
    const bodies = [...S.statics, ...S.placed.filter(b => b.isStatic)];
    let best = FLOOR_Y + 400;
    for (let yy = y; yy < H + 10; yy += 4) { if (Query.point(bodies, { x, y: yy }).length) { best = yy; break; } }
    return best;
  }

  // ---- run one attempt ----
  // a stepwise runner, so the viewer can animate exactly what the solver saw
  function runner(level, placements, opt = {}) {
    const S = build(level, placements), { engine } = S, m = S.marble;
    const maxSteps = opt.maxSteps || 900, settle = 45, trail = [];
    const R = { S, steps: 0, done: false, success: false, fell: false, minDist: 1e9, trigDist: 1e9, propTrail: [], tokens: [], trail, launched: false };
    const push = t => { if (R.tokens[R.tokens.length - 1] !== t) R.tokens.push(t); };
    let inCup = 0;
    const toppled = new Set(), touching = new Map();
    const touch = (b, d) => touching.set(b, Math.max(0, (touching.get(b) || 0) + d));
    Events.on(engine, 'collisionStart', ev => {
      for (const pr of ev.pairs) {
        const a = pr.bodyA, b = pr.bodyB;
        for (const [x, y] of [[a, b], [b, a]]) {
          if (x.label === 'trigger' && !x.gate.open && !y.isStatic && y !== x.gate.plank && R.steps > settle) {
            x.gate.open = true; Composite.remove(engine.world, x.gate.latch); push('T:' + y.label);
            if (x.gate.g.kind === 'latch') { Composite.remove(engine.world, [x.gate.plank, x.gate.hinge]); x.gate.gone = true; }   // a peg that lifts away
          }
          if (x.label === 'button' && y === m && !x.got) x.got = true;
          if (x === m) touch(y.label, 1);
          if (x === m && R.steps > settle && ['ruler', 'book', 'domino', 'block', 'lever', 'yarn', 'gate', 'tail', 'ball'].includes(y.label)) push(y.label);
          if (x.label === 'domino' && y.label === 'domino') { toppled.add(x.id); toppled.add(y.id); }
          // lever catapult: a heavy thing landing on one arm flings a marble sitting on the other arm.
          // Speed scales with the arm ratio (long arm / short arm), which is the lesson of the sliding fulcrum.
          if (x.label === 'lever' && ['ball', 'block'].includes(y.label) && (touching.get('lever') || 0) > 0 && R.steps > settle) {
            const lv = S.levers.find(l => l.plank === x.parent || l.plank === x); if (!lv) continue;
            const f = lv.pin.pointB, a = lv.plank.angle, ux = Math.cos(a), uy = Math.sin(a);
            const di = (y.position.x - f.x) * ux + (y.position.y - f.y) * uy, dm = (m.position.x - f.x) * ux + (m.position.y - f.y) * uy;
            const vi = Math.hypot(y.velocity.x - x.parent.velocity.x, y.velocity.y - x.parent.velocity.y);
            if (di * dm < 0 && vi > 2 && Math.abs(di) > 8) {
              let nx = -uy, ny = ux; if (ny > 0) { nx = -nx; ny = -ny; }
              const sp = Math.min(15, vi * Math.min(3, Math.abs(dm / di)) * .55);
              // a real catapult throws the marble up and back over the fulcrum, not straight up
              const bx = nx - Math.sign(dm) * ux * .95, by = ny - Math.sign(dm) * uy * .95, bl = Math.hypot(bx, by);
              Body.setVelocity(m, { x: bx / bl * sp, y: by / bl * sp });
              push('launch');
            }
          }
        }
      }
    });
    Events.on(engine, 'collisionEnd', ev => {
      for (const pr of ev.pairs) {
        const o = pr.bodyA === m ? pr.bodyB : pr.bodyB === m ? pr.bodyA : null; if (!o) continue;
        touch(o.label, -1);
        if (o.label === 'lever' && m.velocity.y < -3.2 && !R.launched) { R.launched = true; push('launch'); }
      }
    });
    R.step = () => {
      if (R.done) return R;
      const steps = R.steps;
      if (steps === settle) { Body.setStatic(m, false); Body.setVelocity(m, { x: (level.start.vx || 0), y: 0 }); }
      for (const tb of S.tails) {
        const t = tb.tail, ang = Math.sin((steps / 60) * Math.PI * 2 / t.period + (t.phase || 0)) * t.amp;
        const nx = t.px + Math.sin(ang) * t.len / 2, ny = t.py - Math.cos(ang) * t.len / 2;
        Body.setVelocity(tb, { x: nx - tb.position.x, y: ny - tb.position.y }); Body.setPosition(tb, { x: nx, y: ny }); Body.setAngle(tb, ang);
      }
      Engine.update(engine, DT);
      R.steps++;
      if (steps <= settle) return R;
      // rolling resistance (Matter slides circles, so we model the roll), and books are grippy
      let contact = 0; for (const v of touching.values()) contact += v;
      if (contact > 0) { const v = m.velocity, sp = Math.hypot(v.x, v.y), dec = (touching.get('book') ? .07 : .004);
        if (sp > 0) { const k = Math.max(0, sp - dec) / sp; Body.setVelocity(m, { x: v.x * k, y: v.y * k }); } }
      if (steps % 6 === 0) { trail.push([m.position.x, m.position.y, m.velocity.x]); for (const b of S.dyn) if (b.speed > .5) R.propTrail.push([b.position.x, b.position.y, b.velocity.x]); }
      R.minDist = Math.min(R.minDist, Math.hypot(m.position.x - level.cup.x, m.position.y - (level.cup.y - 15)));
      for (const t of S.triggers) if (!t.gate.open) { for (const b of [m, ...S.dyn, ...S.placed]) if (!b.isStatic) R.trigDist = Math.min(R.trigDist, Math.hypot(b.position.x - t.position.x, b.position.y - t.position.y)); }
      const cb = S.cupBox;
      if (m.position.x > cb.x0 && m.position.x < cb.x1 && m.position.y > cb.y0 && m.position.y < cb.y1 + 2) { if (++inCup > 4) { R.success = true; R.done = true; } } else inCup = 0;
      if (m.position.y > H + 40 || m.position.x < -40 || m.position.x > W + 40) { R.fell = true; R.done = true; }
      if (steps > settle + 120 && m.speed < .02 && !S.gates.some(g => g.open && g.plank.angularSpeed > .01)
          && S.dyn.concat(S.placed).every(b => b.isStatic || b.speed < .05)) R.done = true;   // everything has come to rest
      if (R.steps >= maxSteps) R.done = true;
      if (R.done) { if (toppled.size >= 3) R.tokens.push('dominoes'); if (R.success) R.tokens.push('cup'); }
      return R;
    };
    return R;
  }

  function run(level, placements, opt = {}) {
    const R = runner(level, placements, opt);
    while (!R.done) R.step();
    return { success: R.success, steps: R.steps, minDist: R.minDist, fell: R.fell, tokens: R.tokens, buttons: R.S.buttons.map(b => b.got),
      gateOpen: R.S.gates.map(g => g.open), trigDist: R.trigDist, trail: R.trail, propTrail: R.propTrail, launched: R.launched, pieces: placements.length };
  }

  function snapshot(S) {
    const out = [];
    const add = b => out.push(+b.position.x.toFixed(1), +b.position.y.toFixed(1), +b.angle.toFixed(3));
    S.dyn.forEach(add); S.placed.forEach(add); S.gates.forEach(g => add(g.plank)); S.tails.forEach(add); add(S.marble);
    return out;
  }

  // collapse a run's tokens into a "route family" key
  function family(tokens) {
    const t = tokens.filter(x => x !== 'cup').map(x => (x === 'ruler' || x === 'book') ? 'ramp' : x.startsWith('T:') ? 'T:' + (x.slice(2) === 'marble' ? 'marble' : x.slice(2) === 'ramp' ? 'ramp' : x.slice(2)) : x);
    const out = []; for (const x of t) if (!out.includes(x)) out.push(x);   // first time each mechanism shows up
    return out.join('>');
  }

  return { W, H, FLOOR_Y, PIECES, MARBLE, build, run, runner, overlaps, surfaceBelow, family, makePiece };
});
