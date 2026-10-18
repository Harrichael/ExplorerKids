// A food web drawn as an SVG: plants and algae along the bottom, each animal one row above the
// highest thing it eats, arrows running from food to eater the way energy flows. Tapping an
// animal lights up what it eats and what eats it.

const NS = 'http://www.w3.org/2000/svg';
const SPACE = 112, ROW = 128, R = 30, TOP = 34, SIDE = 64;
const ROWS = ['Plants & algae: they make food from sunlight', 'Plant eaters', 'Animal eaters'];

const el = (tag, attrs, parent) => { const e = document.createElementNS(NS, tag); for (const k in attrs) e.setAttribute(k, attrs[k]); if (parent) parent.append(e); return e; };

// rows, each ordered so arrows cross as little as they can: every animal sits near the middle of what it eats
function layout(species){
  const by = new Map(species.map(s => [s.name, s])), level = new Map();
  const lv = s => { if (!level.has(s.name)) level.set(s.name, s.eats.length ? 1 + Math.max(...s.eats.map(f => lv(by.get(f)))) : 0); return level.get(s.name); };
  const rows = [];
  for (const s of species) (rows[lv(s)] = rows[lv(s)] || []).push(s);
  const x = new Map(), place = () => rows.forEach(r => r.forEach((s, i) => x.set(s.name, i - (r.length - 1)/2)));
  place();
  const eaters = s => species.filter(e => e.eats.includes(s.name));
  for (let pass = 0; pass < 3; pass++) {
    for (let k = 1; k < rows.length; k++) { rows[k].sort((a, b) => mean(a.eats.map(f => x.get(f))) - mean(b.eats.map(f => x.get(f)))); place(); }
    rows[0].sort((a, b) => mean(eaters(a).map(e => x.get(e.name))) - mean(eaters(b).map(e => x.get(e.name)))); place();
  }
  return {rows, x};
}
const mean = v => v.length ? v.reduce((a, b) => a + b, 0)/v.length : 0;

export function drawFoodWeb(svg, web, onSelect){
  svg.replaceChildren();
  const {rows, x} = layout(web.species), wide = Math.max(...rows.map(r => r.length));
  const W = wide*SPACE + 2*SIDE, H = rows.length*ROW + TOP;
  svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
  const at = new Map();
  rows.forEach((r, k) => r.forEach(s => at.set(s.name, [W/2 + x.get(s.name)*SPACE, H - ROW/2 - k*ROW + 6])));

  const defs = el('defs', {}, svg);
  for (const kind of ['', 'food', 'eater']) {
    const m = el('marker', {id: 'fw-arrow' + kind, viewBox: '0 0 10 10', refX: 9, refY: 5, markerWidth: 7, markerHeight: 7, orient: 'auto-start-reverse'}, defs);
    el('path', {d: 'M0,0 L10,5 L0,10 z', class: 'fw-head ' + kind}, m);
  }
  rows.forEach((r, k) => {
    el('rect', {x: 0, y: H - (k + 1)*ROW, width: W, height: ROW, class: 'fw-band' + (k % 2 ? ' odd' : '')}, svg);
    if (ROWS[k]) el('text', {x: 14, y: H - (k + 1)*ROW + 20, class: 'fw-row'}, svg).textContent = ROWS[k];
  });

  const edges = [], nodes = new Map(), arrows = el('g', {}, svg);
  for (const s of web.species) for (const f of s.eats) {
    const [x0, y0] = at.get(f), [x1, y1] = at.get(s.name), dx = x1 - x0, dy = y1 - y0, d = Math.hypot(dx, dy);
    // leave the food's top and arrive at the eater's rim, bowing gently so arrows along one row stay apart
    const sx = x0 + dx/d*R, sy = y0 + dy/d*R, ex = x1 - dx/d*(R + 4), ey = y1 - dy/d*(R + 4), bow = Math.min(40, Math.abs(dx)*.15);
    const path = el('path', {d: `M${sx},${sy} Q${(sx + ex)/2 + (dx > 0 ? -bow : bow)*.3},${(sy + ey)/2 - bow} ${ex},${ey}`, class: 'fw-edge', 'marker-end': 'url(#fw-arrow)'}, arrows);
    edges.push({path, food: f, eater: s.name});
  }
  for (const s of web.species) {
    const [cx, cy] = at.get(s.name), g = el('g', {class: 'fw-node', tabindex: 0, role: 'button', 'aria-label': s.name, transform: `translate(${cx},${cy})`}, svg);
    el('circle', {r: R, class: 'fw-disc' + (s.eats.length ? '' : ' maker')}, g);
    el('text', {class: 'fw-icon', y: 1}, g).textContent = s.icon;
    const words = s.name.split(' '), lines = s.name.length > 12 && words.length > 1 ? [words.slice(0, Math.ceil(words.length/2)).join(' '), words.slice(Math.ceil(words.length/2)).join(' ')] : [s.name];
    lines.forEach((t, i) => { el('text', {class: 'fw-name', y: R + 16 + i*15}, g).textContent = t; });
    g.addEventListener('click', () => select(s.name));
    g.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.stopPropagation(); select(s.name); } });
    nodes.set(s.name, g);
  }

  let chosen = null;
  function select(name){
    chosen = chosen === name ? null : name;
    for (const [n, g] of nodes) g.classList.remove('sel', 'near', 'dim');
    for (const e of edges) { e.path.classList.remove('food', 'eater', 'dim'); e.path.setAttribute('marker-end', 'url(#fw-arrow)'); }
    if (!chosen) { onSelect(null); return; }
    const s = web.species.find(t => t.name === chosen), eatenBy = web.species.filter(t => t.eats.includes(chosen)).map(t => t.name);
    for (const [n, g] of nodes) g.classList.add(n === chosen ? 'sel' : s.eats.includes(n) || eatenBy.includes(n) ? 'near' : 'dim');
    for (const e of edges) {
      const kind = e.eater === chosen ? 'food' : e.food === chosen ? 'eater' : 'dim';
      e.path.classList.add(kind); if (kind !== 'dim') e.path.setAttribute('marker-end', `url(#fw-arrow${kind})`);
    }
    onSelect({name: chosen, icon: s.icon, eats: s.eats, eatenBy});
  }
  return {select};
}
