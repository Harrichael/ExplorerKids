// Dr. Sparks's Explorer Check for the tectonics trip: a big bank of questions, with a fresh draw of
// eight from it for every check. Key questions hold the trip's big ideas, and every place the explorer
// visited makes its key questions eligible. Minor ones are fun details, each unlocked by something the
// explorer actually did: a classmate's find, a curio looked at closely, a "Tell me more!". So a child
// who wandered gets asked about what they wandered into, and a replay asks something new.
//
// What the explorer did is a list of keys, kept across trips so a check started from HQ draws from the
// same pool: 'ridge' (went there), 'ridge:pebble' (a find or a curio there, by its name), 'talk:iceland'.

const ink = '#1a1320';
function sky(c, w, h, top, bottom){ const g = c.createLinearGradient(0, 0, 0, h); g.addColorStop(0, top); g.addColorStop(1, bottom); c.fillStyle = g; c.fillRect(0, 0, w, h); }
const mix = (a, b, t) => { const p = s => [1, 3, 5].map(i => parseInt(s.slice(i, i + 2), 16)), A = p(a), B = p(b); return '#' + A.map((v, i) => Math.round(v + (B[i] - v)*t).toString(16).padStart(2, '0')).join(''); };
// Every picture is built from inked shapes, toon-shaded like the 3D world: a darker side down and to the right.
// The right answer and the silly ones share this one look, so no card's style gives the answer away.
// The ink is drawn under the fill, so a shape built of overlapping pieces gets one outline round it all.
let S = 1;
function part(c, f, col, lw = 3){
  const p = new Path2D(); f(p); c.lineJoin = c.lineCap = 'round';
  if (lw) { c.strokeStyle = ink; c.lineWidth = lw*2/S; c.stroke(p); }
  c.fillStyle = col; c.fill(p);
  if (lw && col[0] === '#' && col.length === 7) { c.save(); c.clip(p); c.fillStyle = mix(col, '#3a1830', .3); c.fillRect(-999, -999, 1998, 1998);
    const k = Math.min(1, lw/3); c.translate(-5*k/S, -6*k/S); c.fillStyle = col; c.fill(p); c.restore(); }
}
// a prop drawn about 100 across at s = 1, round its own (0, 0); ink and shading keep their weight at any size
const at = (c, x, y, s, f) => { c.save(); c.translate(x, y); c.scale(s, s); const o = S; S *= s; f(); S = o; c.restore(); };
const ell = (x, y, rx, ry, a = 0) => p => { p.moveTo(x + rx*Math.cos(a), y + rx*Math.sin(a)); p.ellipse(x, y, rx, ry, a, 0, Math.PI*2); };
const poly = pts => p => { pts.forEach(([x, y], i) => i ? p.lineTo(x, y) : p.moveTo(x, y)); p.closePath(); };
const cap = (x0, y0, x1, y1, r) => p => { const a = Math.atan2(y1 - y0, x1 - x0); p.moveTo(x0 + Math.cos(a + Math.PI/2)*r, y0 + Math.sin(a + Math.PI/2)*r); p.arc(x0, y0, r, a + Math.PI/2, a + Math.PI*1.5); p.arc(x1, y1, r, a - Math.PI/2, a + Math.PI/2); p.closePath(); };
const rr = (x, y, w, h, r) => p => { p.moveTo(x + r, y); p.arcTo(x + w, y, x + w, y + h, r); p.arcTo(x + w, y + h, x, y + h, r); p.arcTo(x, y + h, x, y, r); p.arcTo(x, y, x + w, y, r); p.closePath(); };
const all = (...fs) => p => fs.forEach(f => f(p));
const blob = (c, x, y, rx, ry, col, lw = 3) => part(c, ell(x, y, rx, ry), col, lw);
const cone = (c, x, base, hw, hgt, col) => part(c, poly([[x - hw, base], [x - hw*.12, base - hgt], [x + hw*.12, base - hgt], [x + hw, base]]), col);
const line = (c, pts, lw = 3, col = ink) => { c.strokeStyle = col; c.lineWidth = lw/S; c.lineCap = c.lineJoin = 'round'; c.beginPath(); pts.forEach(([x, y], i) => i ? c.lineTo(x, y) : c.moveTo(x, y)); c.stroke(); };
// a thick rope of colour with ink along both sides
const rope = (c, pts, col, wd) => { for (const [lw, k] of [[wd + 6/S, ink], [wd, col]]) line(c, pts, lw*S, k); };
const dots = (c, pts, r = 3.5, col = ink) => { c.fillStyle = col; for (const [x, y] of pts) { c.beginPath(); c.arc(x, y, r, 0, 7); c.fill(); } };
const smile = (c, x, y, r = 6) => { c.strokeStyle = ink; c.lineWidth = 2.5/S; c.beginPath(); c.arc(x, y, r, .3, Math.PI - .3); c.stroke(); };
const shut = (c, xs, y, r = 4) => { c.strokeStyle = ink; c.lineWidth = 2.5/S; for (const x of xs) { c.beginPath(); c.arc(x, y, r, .3, Math.PI - .3); c.stroke(); } };
const word = (c, t, x, y, px, col = '#efe0bf') => { c.font = `900 ${px}px Nunito, sans-serif`; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillStyle = col; c.strokeStyle = ink; c.lineWidth = 4/S; c.lineJoin = 'round'; c.strokeText(t, x, y); c.fillText(t, x, y); };
function arrow(c, x0, y0, x1, y1, col){
  const a = Math.atan2(y1 - y0, x1 - x0); c.lineCap = 'round';
  for (const [lw, k] of [[14, ink], [8, col]]) { c.strokeStyle = k; c.lineWidth = lw; c.beginPath(); c.moveTo(x0, y0); c.lineTo(x1 - Math.cos(a)*10, y1 - Math.sin(a)*10); c.stroke(); }
  c.fillStyle = col; c.strokeStyle = ink; c.lineWidth = 3; c.beginPath(); c.moveTo(x1 + Math.cos(a)*8, y1 + Math.sin(a)*8);
  c.lineTo(x1 - Math.cos(a - .55)*24, y1 - Math.sin(a - .55)*24); c.lineTo(x1 - Math.cos(a + .55)*24, y1 - Math.sin(a + .55)*24); c.closePath(); c.fill(); c.stroke();
}
// a little stick-and-ball kid, for the earthquake pictures
function kid(c, x, y, s = 1, pose = 'stand'){
  c.strokeStyle = ink; c.lineWidth = 5*s; c.lineCap = 'round'; c.beginPath();
  if (pose === 'run') { c.moveTo(x, y - 30*s); c.lineTo(x - 4*s, y - 8*s); c.lineTo(x - 16*s, y + 6*s); c.moveTo(x - 4*s, y - 8*s); c.lineTo(x + 12*s, y + 4*s); c.moveTo(x - 2*s, y - 26*s); c.lineTo(x - 16*s, y - 18*s); c.moveTo(x - 2*s, y - 26*s); c.lineTo(x + 14*s, y - 34*s); }
  else if (pose === 'duck') { c.moveTo(x - 10*s, y); c.lineTo(x, y - 16*s); c.lineTo(x + 12*s, y); c.moveTo(x, y - 16*s); c.lineTo(x + 10*s, y - 24*s); }
  else { c.moveTo(x, y - 30*s); c.lineTo(x, y - 8*s); c.lineTo(x - 8*s, y + 8*s); c.moveTo(x, y - 8*s); c.lineTo(x + 8*s, y + 8*s); c.moveTo(x, y - 24*s); c.lineTo(x - 12*s, y - 14*s); c.moveTo(x, y - 24*s); c.lineTo(x + 12*s, y - 14*s); }
  c.stroke(); blob(c, pose === 'duck' ? x + 14*s : x, pose === 'duck' ? y - 30*s : y - 40*s, 9*s, 9*s, '#f0c49a', 3*s);
}

// the volcano from the rim, with what Pip might have seen out along the coast
function coast(c, w, h){ sky(c, w, h, '#8ab0d8', '#f6cdb4'); c.fillStyle = '#3a78a8'; c.fillRect(0, h*.7, w, h); }
const row = (c, w, h) => { coast(c, w, h); [[34, 30, 34], [86, 38, 50], [146, 34, 44], [204, 28, 34]].forEach(([x, hw, hg]) => cone(c, x, h*.72, hw, hg, '#5a4a62'));
  c.fillStyle = 'rgba(240,235,230,.8)'; for (const x of [86, 146]) blob(c, x + 6, h*.72 - 62, 14, 9, '#e8e0dc', 2); };
const castle = (c, w, h) => { coast(c, w, h); for (const [x, y, rx] of [[120, 120, 70], [70, 110, 40], [175, 112, 40]]) blob(c, x, y, rx, 22, '#fff4ec', 3);
  c.fillStyle = '#c8a8d8'; c.strokeStyle = ink; c.lineWidth = 3; for (const [x, tw, th] of [[96, 18, 54], [120, 24, 76], [144, 18, 54]]) { c.fillRect(x - tw/2, 110 - th, tw, th); c.strokeRect(x - tw/2, 110 - th, tw, th);
    c.fillStyle = '#b5552f'; c.beginPath(); c.moveTo(x - tw/2 - 4, 110 - th); c.lineTo(x, 110 - th - 22); c.lineTo(x + tw/2 + 4, 110 - th); c.closePath(); c.fill(); c.stroke(); c.fillStyle = '#c8a8d8'; } };
const rainbow = (c, w, h) => { coast(c, w, h); ['#e0503a', '#f2963a', '#ffd36b', '#6fbf5a', '#4a86c0', '#7a5ab0'].forEach((col, i) => { c.strokeStyle = col; c.lineWidth = 9; c.beginPath(); c.arc(w/2, h*.72, 92 - i*9, Math.PI, 0); c.stroke(); }); };

// a peach cut in half, one part of it ringed and pointed at
function peach(part){ return (c, w, h) => {
  sky(c, w, h, '#fff1d8', '#f6d8b8');
  const x = w/2, y = h/2 + 6;
  blob(c, x, y, 70, 62, '#e8603a', 4);
  blob(c, x, y, 63, 55, '#ffc070', 0);
  c.fillStyle = '#ffd890'; c.beginPath(); c.ellipse(x - 14, y - 14, 30, 22, -.5, 0, Math.PI*2); c.fill();
  blob(c, x, y + 4, 22, 28, '#8a4a2e', 3);
  c.strokeStyle = '#6a3420'; c.lineWidth = 2; for (let k = -2; k <= 2; k++) { c.beginPath(); c.moveTo(x - 12, y + 4 + k*9); c.quadraticCurveTo(x, y + k*9, x + 12, y + 4 + k*9); c.stroke(); }
  c.fillStyle = '#4a7a3a'; c.strokeStyle = ink; c.lineWidth = 3; c.beginPath(); c.ellipse(x + 18, y - 66, 18, 8, -.4, 0, Math.PI*2); c.fill(); c.stroke();
  c.strokeStyle = '#ffd36b'; c.lineWidth = 6; c.setLineDash([10, 7]); c.beginPath();
  if (part === 'skin') c.ellipse(x, y, 76, 68, 0, 0, Math.PI*2); else if (part === 'pit') c.ellipse(x, y + 4, 30, 36, 0, 0, Math.PI*2); else c.ellipse(x + 40, y - 6, 18, 24, 0, 0, Math.PI*2);
  c.stroke(); c.setLineDash([]);
  const [tx, ty] = part === 'skin' ? [x + 54, y - 46] : part === 'pit' ? [x + 20, y - 12] : [x + 44, y - 24];
  arrow(c, tx + 50, ty - 30, tx + 6, ty - 4, '#ffd36b');
}; }

// melted rock under the ground, and out on it
const magma = (c, w, h) => { sky(c, w, h, '#a8c8e8', '#d8e8f0'); c.fillStyle = '#7a5a42'; c.fillRect(0, 54, w, h); c.strokeStyle = ink; c.lineWidth = 3; c.strokeRect(-3, 54, w + 6, h);
  c.fillStyle = '#5a6a3a'; c.fillRect(0, 48, w, 8);
  for (let i = 0; i < 18; i++) blob(c, (i*53) % w, 70 + (i*37) % 90, 6, 4, '#5a4030', 0);
  const g = c.createRadialGradient(w/2, 124, 4, w/2, 124, 52); g.addColorStop(0, '#ffe08a'); g.addColorStop(.5, '#ff8a3a'); g.addColorStop(1, '#c0401a');
  c.fillStyle = g; c.strokeStyle = ink; c.lineWidth = 4; c.beginPath(); c.ellipse(w/2, 124, 62, 30, 0, 0, Math.PI*2); c.fill(); c.stroke();
  kid(c, 46, 40, .8); };
const lava = (c, w, h) => { sky(c, w, h, '#8ab0d8', '#f6cdb4'); c.fillStyle = '#6a8a4a'; c.fillRect(0, h*.78, w, h);
  cone(c, w/2, h*.8, 96, 110, '#5a4048');
  c.fillStyle = '#ff7a2a'; c.strokeStyle = ink; c.lineWidth = 3; c.beginPath(); c.moveTo(w/2 - 10, h*.8 - 110); c.lineTo(w/2 + 10, h*.8 - 110);
  c.quadraticCurveTo(w/2 + 30, h*.8 - 50, w/2 + 70, h*.8 + 2); c.lineTo(w/2 + 30, h*.8 + 2); c.quadraticCurveTo(w/2 + 6, h*.8 - 50, w/2 - 10, h*.8 - 110); c.fill(); c.stroke();
  c.fillStyle = '#ffd36b'; c.beginPath(); c.ellipse(w/2 + 36, h*.8 - 30, 6, 10, -.5, 0, Math.PI*2); c.fill(); };

// what the mantle is made of
const putty = (c, w, h) => { sky(c, w, h, '#8a3424', '#ffb050');
  c.fillStyle = '#c86a3a'; c.strokeStyle = ink; c.lineWidth = 4; c.beginPath(); c.moveTo(60, 70); c.quadraticCurveTo(120, 30, 180, 70);
  c.quadraticCurveTo(190, 110, 168, 120); c.quadraticCurveTo(150, 160, 120, 160); c.quadraticCurveTo(96, 160, 86, 122); c.quadraticCurveTo(50, 110, 60, 70); c.fill(); c.stroke();
  c.fillStyle = 'rgba(255,230,180,.6)'; c.beginPath(); c.ellipse(100, 64, 20, 8, -.3, 0, Math.PI*2); c.fill();
  c.fillStyle = '#ffd36b'; c.font = '900 22px Nunito, sans-serif'; c.textAlign = 'center'; c.fillText('slowww', 196, 156); };
const lavaSea = (c, w, h) => { sky(c, w, h, '#3a1a20', '#8a3424');
  for (let k = 0; k < 4; k++) { c.fillStyle = ['#c0401a', '#e0602a', '#ff8a3a', '#ffb050'][k]; c.strokeStyle = ink; c.lineWidth = 3; c.beginPath(); c.moveTo(0, h);
    for (let x = 0; x <= w; x += 6) c.lineTo(x, 70 + k*24 + Math.sin(x/18 + k*2)*8); c.lineTo(w, h); c.fill(); c.stroke(); } };
const hotWater = (c, w, h) => { sky(c, w, h, '#2a5a8a', '#4a86c0');
  for (let i = 0; i < 14; i++) { const x = 16 + (i*47) % (w - 30), y = 30 + (i*61) % (h - 50), r = 6 + (i*7) % 12; c.strokeStyle = '#e8f6ff'; c.lineWidth = 3; c.beginPath(); c.arc(x, y, r, 0, Math.PI*2); c.stroke(); } };

// which way cool mantle rock goes
const flow = dir => (c, w, h) => { sky(c, w, h, '#8a3424', '#ffb050');
  blob(c, w/2, h/2, 34, 30, '#7aa0e0', 4);
  c.fillStyle = ink; for (const dx of [-10, 10]) { c.beginPath(); c.arc(w/2 + dx, h/2 - 4, 4, 0, 7); c.fill(); }
  if (dir === 'down') arrow(c, w/2, h/2 + 34, w/2, h - 8, '#7aa0e0');
  else if (dir === 'up') arrow(c, w/2, h/2 - 34, w/2, 8, '#7aa0e0');
  else { c.strokeStyle = ink; c.lineWidth = 4; c.beginPath(); c.moveTo(w/2 - 54, h/2 + 40); c.lineTo(w/2 + 54, h/2 + 40); c.stroke();
    c.fillStyle = '#efe0bf'; c.font = '900 26px Nunito, sans-serif'; c.textAlign = 'center'; c.fillText('z z z', w/2 + 70, h/2 - 30); } };

// what fills the gap at the ridge
const floor = (c, w, h) => { sky(c, w, h, '#1e5a8a', '#0e2a4a');
  for (let i = 0; i < 9; i++) blob(c, 14 + i*28, h*.7 + (i % 2)*8, 22, 15, '#2a2430', 3);
  c.fillStyle = '#ff8a3a'; c.strokeStyle = ink; c.lineWidth = 3; c.beginPath(); c.moveTo(w/2 - 6, h*.62); c.lineTo(w/2 + 6, h*.62); c.lineTo(w/2 + 3, h); c.lineTo(w/2 - 3, h); c.fill();
  arrow(c, w/2 - 20, h*.4, 30, h*.4, '#ffd36b'); arrow(c, w/2 + 20, h*.4, w - 30, h*.4, '#ffd36b'); };
const hole = (c, w, h) => { sky(c, w, h, '#1e5a8a', '#0e2a4a'); c.fillStyle = '#3a3440'; c.fillRect(0, h*.62, w, h);
  c.fillStyle = '#000'; c.strokeStyle = ink; c.lineWidth = 3; c.beginPath(); c.moveTo(w/2 - 60, h*.62); c.lineTo(w/2 + 60, h*.62); c.lineTo(w/2 + 20, h); c.lineTo(w/2 - 20, h); c.fill(); c.stroke(); };
const treasure = (c, w, h) => { sky(c, w, h, '#1e5a8a', '#0e2a4a'); c.fillStyle = '#c8b080'; c.fillRect(0, h*.75, w, h);
  c.fillStyle = '#8a5a3a'; c.strokeStyle = ink; c.lineWidth = 4; c.fillRect(w/2 - 50, 80, 100, 56); c.strokeRect(w/2 - 50, 80, 100, 56);
  c.beginPath(); c.moveTo(w/2 - 50, 80); c.quadraticCurveTo(w/2, 40, w/2 + 50, 80); c.closePath(); c.fill(); c.stroke();
  c.fillStyle = '#ffd36b'; c.fillRect(w/2 - 8, 76, 16, 18); c.strokeRect(w/2 - 8, 76, 16, 18); };

// the shell on the mountain top
const pushedUp = (c, w, h) => { sky(c, w, h, '#8ab0d8', '#e8d8f0');
  c.fillStyle = '#6b5a52'; c.strokeStyle = ink; c.lineWidth = 3; c.beginPath(); c.moveTo(0, h); c.lineTo(w/2 - 10, 34); c.lineTo(w/2 + 10, 34); c.lineTo(w, h); c.fill(); c.stroke();
  c.save(); c.clip(); c.fillStyle = '#5a8ac0'; c.beginPath(); c.moveTo(0, h - 10); c.quadraticCurveTo(w/2, 10, w, h - 10); c.lineTo(w, h + 10); c.quadraticCurveTo(w/2, 30, 0, h + 10); c.fill(); c.restore();
  blob(c, w/2, 44, 12, 9, '#f6ecd6', 3); arrow(c, 14, h - 14, 60, h - 14, '#ffd36b'); arrow(c, w - 14, h - 14, w - 60, h - 14, '#ffd36b'); };
const seagull = (c, w, h) => { sky(c, w, h, '#8ab0d8', '#e8d8f0'); cone(c, w/2, h, 120, 120, '#6b5a52');
  c.strokeStyle = ink; c.lineWidth = 5; c.lineCap = 'round'; c.beginPath(); c.moveTo(60, 50); c.quadraticCurveTo(80, 34, 100, 52); c.quadraticCurveTo(120, 34, 140, 50); c.stroke();
  blob(c, 100, 76, 9, 7, '#f6ecd6', 3); };
const lunchboxAt = bg => (c, w, h) => { bg(c, w, h); part(c, rr(w/2 - 64, 60, 128, 80, 6), '#c0483a', 4); line(c, [[w/2 - 24, 60], [w/2 - 24, 42], [w/2 + 24, 42], [w/2 + 24, 60]], 6); blob(c, w/2 + 30, 100, 14, 10, '#f6ecd6', 3); blob(c, w/2 - 26, 100, 20, 12, '#e8b858', 3); };
const lunchbox = lunchboxAt((c, w, h) => { sky(c, w, h, '#8ab0d8', '#e8d8f0'); cone(c, w/2, h + 3, 120, 120, '#6b5a52'); });
// a sea monster's lunchbox, with the monster's arm reaching in
const seaLunch = (c, w, h) => { lunchboxAt(BG.deep)(c, w, h); rope(c, [[w, 40], [196, 60], [190, 84], [174, 92]], '#5a9a6a', 12); };
// what to do when the ground shakes
function room(c, w, h){ sky(c, w, h, '#f2dcb8', '#e8c898'); c.fillStyle = '#b08058'; c.fillRect(0, h*.78, w, h);
  c.strokeStyle = '#c0483a'; c.lineWidth = 4; c.lineCap = 'round'; for (const [x, a] of [[18, Math.PI], [w - 18, 0]]) for (const k of [0, 1]) { c.beginPath(); c.arc(x, 70, 10 + k*9, a - .7, a + .7); c.stroke(); } }
const duck = (c, w, h) => { room(c, w, h);
  c.fillStyle = '#8a5a3a'; c.strokeStyle = ink; c.lineWidth = 4; c.fillRect(50, 70, 140, 14); c.strokeRect(50, 70, 140, 14);
  for (const x of [58, 176]) { c.fillRect(x, 84, 8, h*.78 - 84); c.strokeRect(x, 84, 8, h*.78 - 84); }
  kid(c, 110, h*.78, 1, 'duck'); c.strokeStyle = ink; c.lineWidth = 5; c.beginPath(); c.moveTo(124, 112); c.lineTo(166, 90); c.stroke(); };
const runOut = (c, w, h) => { room(c, w, h); c.fillStyle = '#6a4a3a'; c.strokeStyle = ink; c.lineWidth = 4; c.fillRect(170, 40, 50, h*.78 - 40); c.strokeRect(170, 40, 50, h*.78 - 40);
  kid(c, 110, h*.78 - 8, 1.1, 'run'); };
const byWindow = (c, w, h) => { room(c, w, h); c.fillStyle = '#bfe0f0'; c.strokeStyle = ink; c.lineWidth = 4; c.fillRect(120, 30, 80, 70); c.strokeRect(120, 30, 80, 70);
  c.beginPath(); c.moveTo(160, 30); c.lineTo(160, 100); c.moveTo(120, 65); c.lineTo(200, 65); c.stroke(); kid(c, 90, h*.78 - 8, 1.1); };

// ---------- more pictures: backdrops, and a kit of drawn props to put on them ----------
const BG = {
  day: coast, room,
  air: (c, w, h) => sky(c, w, h, '#8ab0d8', '#f6cdb4'),
  warm: (c, w, h) => sky(c, w, h, '#fff1d8', '#f6d8b8'),
  hot: (c, w, h) => sky(c, w, h, '#8a3424', '#ffb050'),
  deep: (c, w, h) => { sky(c, w, h, '#16385e', '#081a30'); c.fillStyle = '#3a3440'; c.fillRect(0, h*.8, w, h); },
  cave: (c, w, h) => sky(c, w, h, '#4a3440', '#2a1e28'),
  rock: (c, w, h) => { sky(c, w, h, '#8ab0d8', '#f6cdb4'); c.fillStyle = '#4a3a40'; c.fillRect(0, h*.74, w, h); c.strokeStyle = ink; c.lineWidth = 3; c.strokeRect(-3, h*.74, w + 6, h); },
  peaks: (c, w, h) => { sky(c, w, h, '#8ab0d8', '#e8d8f0');
    for (const [x, hw, hg] of [[40, 70, 110], [130, 80, 140], [215, 60, 100]]) { cone(c, x, h + 3, hw, hg, '#7a6a72');
      c.fillStyle = '#f6f2f0'; c.beginPath(); c.moveTo(x - hw*.12 - hw*.2, h - hg*.78); c.lineTo(x - hw*.12, h - hg); c.lineTo(x + hw*.12, h - hg); c.lineTo(x + hw*.12 + hw*.2, h - hg*.78); c.fill(); } },
  hills: (c, w, h) => { sky(c, w, h, '#9ac0e0', '#f6e0b4');
    part(c, p => { p.moveTo(-4, h + 4); p.lineTo(-4, h*.7); p.quadraticCurveTo(w*.3, h*.48, w*.6, h*.68); p.quadraticCurveTo(w*.85, h*.82, w + 4, h*.6); p.lineTo(w + 4, h + 4); p.closePath(); }, '#d8a848'); },
  night: (c, w, h) => { sky(c, w, h, '#1a2450', '#4a4a80'); c.fillStyle = '#fff8e0'; for (let i = 0; i < 22; i++) c.fillRect((i*67) % w, (i*29) % (h*.5), 2, 2); moon(c, 196, 34, .42);
    part(c, p => { p.moveTo(-4, h + 4); p.lineTo(-4, h*.7); p.quadraticCurveTo(w*.3, h*.5, w*.6, h*.68); p.quadraticCurveTo(w*.85, h*.82, w + 4, h*.62); p.lineTo(w + 4, h + 4); p.closePath(); }, '#5a5a3a'); },
};
// a backdrop with props on it: [prop, x, y, scale]
const pic = (bg, ...items) => (c, w, h) => { BG[bg](c, w, h); for (const [f, x = w/2, y = h/2, s = 1] of items) f(c, x, y, s); };
const dashed = (c, f) => { c.strokeStyle = '#ffd36b'; c.lineWidth = 6; c.setLineDash([10, 7]); c.beginPath(); f(); c.stroke(); c.setLineDash([]); };
const glowBlob = (c, x, y, r, inner, outer) => { const g = c.createRadialGradient(x, y, 2, x, y, r); g.addColorStop(0, inner); g.addColorStop(1, outer); c.fillStyle = g; c.strokeStyle = ink; c.lineWidth = 3; c.beginPath(); c.ellipse(x, y, r, r*.8, 0, 0, Math.PI*2); c.fill(); c.stroke(); };

// ---- the props ----
const zzz = (c, x, y, s = 1) => [[0, 0, 18], [14, -16, 22], [30, -34, 26]].forEach(([dx, dy, px]) => word(c, 'z', x + dx*s, y + dy*s, px*s));
const note = (c, x, y, s = 1) => at(c, x, y, s, () => { rope(c, [[7, 0], [7, -30], [20, -22]], '#ffd36b', 4); part(c, ell(0, 0, 9, 7, -.4), '#ffd36b'); });
const wavy = (c, x, y, col, n = 3) => { for (let k = 0; k < n; k++) { c.strokeStyle = col; c.lineWidth = 4; c.lineCap = 'round'; c.beginPath(); for (let i = 0; i <= 10; i++) c.lineTo(x + k*16 + Math.sin(i*.9 + k)*5, y - i*4); c.stroke(); } };
const puff = (c, x, y, s, col = '#f4eee8') => at(c, x, y, s, () => part(c, p => { for (const [dx, dy, r] of [[-26, 8, 20], [0, -6, 28], [26, 6, 22], [8, 16, 20], [-12, 18, 16]]) ell(dx, dy, r, r*.9)(p); }, col));
const tear = (w, hh, dy = 0) => p => { p.moveTo(-w, 22 + dy); p.quadraticCurveTo(-w*1.1, -hh*.3 + dy, 0, -hh + dy); p.quadraticCurveTo(w*1.1, -hh*.3 + dy, w, 22 + dy); p.quadraticCurveTo(0, 34 + dy, -w, 22 + dy); };
const flame = (c, x, y, s) => at(c, x, y, s, () => { part(c, all(cap(-36, 34, 36, 20, 7), cap(-36, 20, 36, 34, 7)), '#8a5634'); part(c, tear(26, 50), '#f2803a'); part(c, tear(14, 22, 4), '#ffd36b', 0); });
const balloon = (c, x, y, s, col = '#e0503a') => at(c, x, y, s, () => { line(c, [[0, 30], [8, 46], [-2, 70]], 2.5);
  part(c, all(ell(0, -6, 26, 32), poly([[-6, 30], [6, 30], [0, 22]])), col); c.fillStyle = 'rgba(255,255,255,.6)'; c.beginPath(); c.ellipse(-10, -18, 6, 10, -.4, 0, 7); c.fill(); });
const drop = (c, x, y, s, col = '#7ab8e8') => at(c, x, y, s, () => part(c, p => { p.moveTo(0, -40); p.quadraticCurveTo(30, -4, 26, 14); p.arc(0, 14, 26, 0, Math.PI); p.quadraticCurveTo(-30, -4, 0, -40); }, col));
const tree = (c, x, y, s, fruit) => at(c, x, y, s, () => { part(c, poly([[-8, 50], [-6, 0], [6, 0], [8, 50]]), '#8a5634');
  part(c, all(ell(-22, -10, 26, 22), ell(20, -12, 26, 22), ell(0, -34, 30, 24)), '#5e9a4a'); if (fruit) for (const [fx, fy] of [[-26, -6], [10, -28], [24, -2], [-6, -38]]) fruit(c, fx, fy); });
const pine = (c, x, y, s) => at(c, x, y, s, () => { part(c, poly([[-5, 46], [-5, 34], [5, 34], [5, 46]]), '#8a5634');
  part(c, all(poly([[-30, 36], [0, 4], [30, 36]]), poly([[-24, 16], [0, -18], [24, 16]]), poly([[-17, -4], [0, -38], [17, -4]])), '#3e7a4a'); });
const rockLump = (c, x, y, s, col = '#8a8090') => at(c, x, y, s, () => part(c, poly([[-30, 16], [-26, -6], [-8, -18], [16, -16], [30, -2], [28, 16]]), col));
const fish = (c, x, y, s, col = '#f2963a') => at(c, x, y, s, () => { part(c, all(ell(0, 0, 26, 15), poly([[-20, 0], [-40, -14], [-40, 14]])), col); dots(c, [[14, -4]], 3); line(c, [[4, -12], [4, 12]], 2); });
const crabBody = (c, x, y, s, col = '#e0503a') => at(c, x, y, s, () => { for (const sx of [-1, 1]) { for (const k of [0, 1, 2]) line(c, [[sx*14, 6 + k*3], [sx*30, 12 + k*4], [sx*36, 22 + k*2]], 4); line(c, [[sx*16, -4], [sx*30, -16]], 5); part(c, all(ell(sx*34, -24, 11, 9), poly([[sx*34, -24], [sx*48, -38], [sx*40, -20]])), col); }
  part(c, ell(0, 4, 24, 15), col); line(c, [[-6, -10], [-8, -18]], 3); line(c, [[6, -10], [8, -18]], 3); dots(c, [[-8, -20], [8, -20]], 3.5); });
const pizza = (c, x, y, s) => at(c, x, y, s, () => { part(c, ell(0, 0, 34, 34), '#e8b05a'); part(c, ell(0, 0, 27, 27), '#e0503a', 2);
  for (const [px, py] of [[-10, -10], [12, -6], [-4, 12], [14, 14]]) part(c, ell(px, py, 6, 6), '#a8302a', 2); line(c, [[-27, 0], [27, 0]], 2); line(c, [[0, -27], [0, 27]], 2); });
const cookie = (c, x, y, s) => at(c, x, y, s, () => { part(c, ell(0, 0, 22, 20), '#d89a50'); dots(c, [[-8, -6], [6, -8], [-2, 6], [10, 6], [-10, 8]], 3, '#5a3420'); });
const iceCube = (c, x, y, s, col = '#bfe6f6') => at(c, x, y, s, () => { part(c, rr(-30, -30, 60, 60, 10), col); line(c, [[-18, -16], [-18, 6]], 4, 'rgba(255,255,255,.75)'); line(c, [[-10, -20], [6, -20]], 4, 'rgba(255,255,255,.75)'); });
const bus = (c, x, y, s) => at(c, x, y, s, () => { part(c, rr(-50, -30, 100, 46, 12), '#2f8f8a'); part(c, poly([[-50, 0], [50, 0], [50, 6], [-50, 6]]), '#d9a441', 2);
  for (const wx of [-38, -14, 10]) part(c, rr(wx, -22, 18, 16, 3), '#cfe8f0', 2); part(c, rr(32, -22, 14, 20, 3), '#cfe8f0', 2); for (const wx of [-28, 28]) { part(c, ell(wx, 18, 11, 11), '#2a2430'); part(c, ell(wx, 18, 4, 4), '#9aa0b0', 2); } });
const house = (c, x, y, s) => at(c, x, y, s, () => { part(c, rr(-40, -16, 80, 56, 3), '#f2dcb8'); part(c, poly([[-50, -14], [0, -48], [50, -14]]), '#b5552f'); part(c, rr(-10, 12, 20, 28, 3), '#8a5634', 2); for (const wx of [-30, 18]) part(c, rr(wx, -6, 13, 13, 2), '#bfe0f0', 2); });
const hand = (c, x, y, s) => at(c, x, y, s, () => { part(c, all(ell(0, 16, 24, 24), cap(-17, 6, -19, -22, 6.5), cap(-5, 2, -6, -32, 6.5), cap(7, 2, 7, -30, 6.5), cap(18, 8, 20, -18, 6), cap(-20, 22, -36, 4, 7)), '#f0c49a');
  for (const [nx, ny] of [[-19, -22], [-6, -32], [7, -30], [20, -18]]) part(c, ell(nx, ny + 1, 3.5, 4), '#fff0e8', 1.5); });
const snail = (c, x, y, s) => at(c, x, y, s, () => { part(c, p => { p.moveTo(-40, 20); p.lineTo(34, 20); p.quadraticCurveTo(44, 20, 40, 4); p.lineTo(30, 4); p.closePath(); }, '#c8b088'); line(c, [[36, 4], [38, -12]], 3); line(c, [[40, 4], [46, -10]], 3); dots(c, [[38, -13], [46, -11]], 3);
  part(c, ell(-6, -2, 24, 22), '#c0703a'); c.strokeStyle = ink; c.lineWidth = 3/S; c.beginPath(); for (let a = 0; a < 12; a += .3) c.lineTo(-6 + Math.cos(a)*a*1.7, -2 + Math.sin(a)*a*1.6); c.stroke(); });
const car = (c, x, y, s) => at(c, x, y, s, () => { part(c, all(rr(-46, -10, 92, 26, 10), rr(-26, -30, 48, 26, 10)), '#d8403a'); part(c, rr(-20, -24, 16, 14, 3), '#cfe8f0', 2); part(c, rr(2, -24, 16, 14, 3), '#cfe8f0', 2);
  for (const wx of [-26, 26]) part(c, ell(wx, 16, 10, 10), '#2a2430'); line(c, [[-70, -4], [-54, -4]], 4); line(c, [[-74, 8], [-54, 8]], 4); });
const cloud = (c, x, y, s, col = '#c8c8d8', rain = '#4a86c0') => at(c, x, y, s, () => { if (rain) for (let i = 0; i < 6; i++) line(c, [[-30 + i*12, 22], [-36 + i*12, 40]], 4, rain); puff(c, 0, 0, .9, col); });
const duckling = (c, x, y, s) => at(c, x, y, s, () => { part(c, all(ell(0, 6, 26, 14), poly([[-22, 2], [-34, -8], [-22, 12]])), '#f6f2e8'); part(c, ell(16, -14, 12, 11), '#3a8a5a'); part(c, poly([[26, -16], [40, -12], [26, -8]]), '#f2a03a', 2); dots(c, [[18, -17]], 2.5); line(c, [[-10, 6], [8, 6]], 2.5); });
const squirrel = (c, x, y, s, tail = '#b0703a') => at(c, x, y, s, () => { part(c, p => { p.moveTo(-10, 30); p.quadraticCurveTo(-56, 26, -40, -16); p.quadraticCurveTo(-30, -44, -10, -30); p.quadraticCurveTo(-30, -10, -16, 18); p.closePath(); }, tail);
  part(c, all(ell(6, 14, 16, 20), ell(12, -12, 13, 12), poly([[4, -20], [6, -34], [12, -22]])), '#c8905a'); dots(c, [[16, -14]], 3); part(c, ell(24, -10, 3, 3), '#3a2a2a', 1); });
const hawk = (c, x, y, s) => at(c, x, y, s, () => { part(c, p => { p.moveTo(-60, -10); p.quadraticCurveTo(-30, -26, -8, -6); p.quadraticCurveTo(-30, -6, -50, 4); p.closePath(); p.moveTo(60, -10); p.quadraticCurveTo(30, -26, 8, -6); p.quadraticCurveTo(30, -6, 50, 4); p.closePath(); }, '#8a5a3a');
  part(c, poly([[-8, 18], [0, 34], [8, 18]]), '#c8502a'); part(c, ell(0, 4, 13, 18), '#e8d8c0'); part(c, ell(0, -14, 10, 10), '#8a5a3a'); part(c, poly([[-3, -10], [3, -10], [0, -2]]), '#f2c03a', 1.5); dots(c, [[-4, -16], [4, -16]], 2.5); });
const mouse = (c, x, y, s) => at(c, x, y, s, () => { line(c, [[-16, 6], [-30, 0], [-38, 8]], 2.5); part(c, all(ell(0, 4, 18, 11), ell(10, -8, 7, 7)), '#a8a0b0'); dots(c, [[18, 0]], 2.5); });
const marmot = (c, x, y, s) => at(c, x, y, s, () => { part(c, all(ell(0, 10, 28, 26), ell(0, -22, 18, 15), ell(-14, -34, 5, 5), ell(14, -34, 5, 5)), '#a8743a'); part(c, ell(0, 14, 16, 16), '#d8b080', 0); part(c, ell(0, -16, 8, 6), '#e8c898', 1.5); dots(c, [[0, -19]], 2.5); });
const goat = (c, x, y, s) => at(c, x, y, s, () => { for (const lx of [-20, -10, 12, 22]) { line(c, [[lx, 8], [lx, 30]], 6); part(c, rr(lx - 4, 28, 8, 6, 2), '#3a3440', 1.5); }
  part(c, all(ell(0, 0, 32, 18), ell(28, -20, 11, 14, -.5)), '#f6f2ea'); line(c, [[24, -32], [16, -46], [10, -40]], 4); line(c, [[30, -32], [28, -48], [22, -44]], 4); part(c, poly([[30, -8], [34, 6], [26, -4]]), '#f6f2ea', 2); dots(c, [[32, -22]], 2.5); });
const flower = (c, x, y, s, col = '#ffd36b', fuzzy) => at(c, x, y, s, () => { line(c, [[0, 0], [0, 50]], 4, '#3a8a3a'); part(c, ell(-10, 34, 10, 4, -.5), '#5e9a4a', 2);
  part(c, p => { for (let k = 0; k < 8; k++) { const a = k*Math.PI/4; ell(Math.cos(a)*14, Math.sin(a)*14, 10, 6, a)(p); } }, col); part(c, ell(0, 0, 8, 8), '#e0802a', 2);
  if (fuzzy) { c.strokeStyle = '#ffffff'; c.lineWidth = 2/S; for (let k = 0; k < 20; k++) { const a = k*.31; c.beginPath(); c.moveTo(Math.cos(a)*24, Math.sin(a)*24); c.lineTo(Math.cos(a)*30, Math.sin(a)*30); c.stroke(); } } });
const poppy = (c, x, y, s, open = true) => at(c, x, y, s, () => { line(c, [[0, 4], [0, 46]], 4, '#3a8a3a');
  if (open) part(c, p => { p.moveTo(-24, -18); p.quadraticCurveTo(-20, 8, 0, 8); p.quadraticCurveTo(20, 8, 24, -18); p.quadraticCurveTo(12, -8, 0, -16); p.quadraticCurveTo(-12, -8, -24, -18); }, '#f2803a');
  else part(c, p => { p.moveTo(-8, -26); p.quadraticCurveTo(-14, 4, 0, 8); p.quadraticCurveTo(14, 4, 8, -26); p.quadraticCurveTo(0, -18, -8, -26); }, '#e0702a'); });
const moon = (c, x, y, s) => at(c, x, y, s, () => { part(c, ell(0, 0, 40, 40), '#f2ecd0'); for (const [mx, my, r] of [[-12, -10, 8], [14, 6, 10], [-6, 18, 5]]) part(c, ell(mx, my, r, r), '#d8d0b0', 1.5); });
const ammonite = (c, x, y, s) => at(c, x, y, s, () => { for (const k of [0, 1, 2]) line(c, [[26, 8 + k*6], [40, 10 + k*8], [44, 18 + k*10]], 4, '#e8a090'); part(c, ell(0, 0, 30, 30), '#d8b078');
  c.strokeStyle = ink; c.lineWidth = 3/S; c.beginPath(); for (let a = 0; a < 15; a += .2) c.lineTo(Math.cos(a)*a*1.9, Math.sin(a)*a*1.9); c.stroke(); dots(c, [[30, 4]], 2.5); });
const crystalSpray = (c, x, y, s, col) => at(c, x, y, s, () => { for (const [cx, hg, a] of [[-30, 70, -.3], [0, 90, 0], [30, 60, .3], [-12, 46, -.6], [20, 42, .6]]) { c.save(); c.translate(cx, 40); c.rotate(a);
  part(c, poly([[-10, 0], [-10, -hg], [0, -hg - 14], [10, -hg], [10, 0]]), col); line(c, [[0, 0], [0, -hg - 14]], 2); c.restore(); } });
const sparkle = (c, x, y, r, col = '#fff2a0') => part(c, p => { for (let k = 0; k < 8; k++) { const rr2 = k % 2 ? r*.3 : r, a = k*Math.PI/4; p.lineTo(x + Math.cos(a)*rr2, y + Math.sin(a)*rr2); } p.closePath(); }, col, 2);
const bone = (c, x, y, s, a = 0) => at(c, x, y, s, () => { c.rotate(a); part(c, all(cap(-26, 0, 26, 0, 5), ell(-28, -5, 6, 6), ell(-28, 5, 6, 6), ell(28, -5, 6, 6), ell(28, 5, 6, 6)), '#f6efe0', 2.5); });
const whaleBody = (c, x, y, s, col = '#4a6a8a') => at(c, x, y, s, () => { part(c, all(ell(0, 0, 56, 22, -.05), poly([[-50, -2], [-72, -20], [-66, 2], [-72, 22]])), col); part(c, ell(6, 10, 40, 8), mix(col, '#ffffff', .4), 0); dots(c, [[38, -4]], 3.5); line(c, [[20, 10], [48, 6]], 2.5); });

// ---- the cards built from them: a silly answer is drawn with as much care as the right one ----
// the volcanoes in a row: planted, or piled up by waves
const plantedRow = (c, w, h) => { coast(c, w, h); for (const x of [126, 166, 206]) sprout(c, x, h*.7 - 18, .95); kid(c, 60, h*.7 + 6, 1.4); hat(c, 60, h*.7 - 54, 1.1); can(c, 88, h*.7 - 30, .6); };
const sprout = (c, x, y, s) => at(c, x, y, s, () => { cone(c, 0, 20, 26, 26, '#5a4a62'); line(c, [[0, -6], [0, -22]], 3); for (const sx of [-1, 1]) part(c, ell(sx*9, -24, 9, 5, sx*-.4), '#6fbf5a', 2); });
const can = (c, x, y, s) => at(c, x, y, s, () => { part(c, all(poly([[-18, -14], [18, -14], [16, 18], [-16, 18]]), poly([[14, -4], [44, -22], [48, -16], [16, 6]])), '#4a86c0');
  c.fillStyle = '#d8f0ff'; for (const [dx, dy] of [[56, -6], [62, 6], [52, 12]]) { c.beginPath(); c.ellipse(dx, dy, 3, 5, 0, 0, 7); c.fill(); } });
const hat = (c, x, y, s) => at(c, x, y, s, () => part(c, all(ell(0, 0, 22, 6), p => { p.moveTo(-11, 0); p.quadraticCurveTo(-10, -16, 0, -16); p.quadraticCurveTo(10, -16, 11, 0); p.closePath(); }), '#e8c060', 2.5));
const wave = (c, x, y, s) => at(c, x, y, s, () => { part(c, p => { p.moveTo(-50, 30); p.quadraticCurveTo(-40, -30, 10, -34); p.quadraticCurveTo(46, -34, 40, -6); p.quadraticCurveTo(30, -20, 16, -10); p.quadraticCurveTo(4, 4, 30, 30); p.closePath(); }, '#4a90c8');
  line(c, [[-34, 0], [-28, -16], [-14, -24], [6, -26]], 4, '#e8f6ff'); });
const wavesMade = (c, w, h) => { coast(c, w, h); for (const x of [150, 200]) cone(c, x, h*.72, 30, 34, '#d8b878'); wave(c, 70, h*.6, 1); wave(c, 130, h*.66, .6); };
// plates, pancakes or bricks
const pancakes = (c, x, y, s) => at(c, x, y, s, () => { part(c, ell(0, 36, 60, 14), '#f2ece4');
  for (let k = 0; k < 4; k++) part(c, p => { p.moveTo(-44, 26 - k*13); p.lineTo(-44, 16 - k*13); p.ellipse(0, 16 - k*13, 44, 11, 0, Math.PI, 0); p.lineTo(44, 26 - k*13); p.ellipse(0, 26 - k*13, 44, 11, 0, 0, Math.PI); }, '#e8b05a');
  part(c, p => { p.moveTo(-36, -36); p.ellipse(0, -36, 36, 8, 0, Math.PI, 0); p.lineTo(36, -36); p.quadraticCurveTo(38, -22, 32, -18); p.quadraticCurveTo(26, -26, 20, -30); p.lineTo(-20, -30); p.quadraticCurveTo(-28, -10, -34, -20); p.closePath(); }, '#b5652f', 2);
  part(c, poly([[-10, -48], [10, -48], [12, -40], [-8, -40]]), '#ffe28a', 2); });
const bricks = (c, x, y, s) => at(c, x, y, s, () => { for (let r = 0; r < 4; r++) for (let k = -2; k <= 2; k++) { const bx = k*34 + (r % 2 ? 17 : 0); if (Math.abs(bx) > 60) continue; part(c, rr(bx - 16, 22 - r*20, 32, 18, 2), (r*3 + k) & 1 ? '#c0583a' : '#b04a30', 2.5); } });
// what hissed out of the rock
const crack = (c, x, y) => { c.fillStyle = '#ff8a3a'; c.strokeStyle = ink; c.lineWidth = 3; c.beginPath(); c.moveTo(x - 40, y); c.lineTo(x - 10, y + 10); c.lineTo(x + 10, y + 4); c.lineTo(x + 40, y); c.lineTo(x + 10, y + 8); c.lineTo(x - 10, y + 16); c.closePath(); c.fill(); c.stroke(); };
const steam = (c, w, h) => { BG.rock(c, w, h); crack(c, w/2, h*.74 + 6); for (const [x, y, s] of [[w/2 - 6, 100, .55], [w/2 + 16, 66, .7], [w/2 - 4, 30, .6]]) puff(c, x, y, s); };
const snake = (c, x, y, s) => at(c, x, y, s, () => { rope(c, [[-20, 40], [-26, 20], [-8, 4], [8, -10], [14, -30]], '#6fae4a', 16);
  part(c, ell(22, -38, 18, 13, -.3), '#6fae4a'); dots(c, [[18, -44], [30, -46]], 3); line(c, [[12, -53], [22, -48]], 3); line(c, [[38, -55], [30, -50]], 3); line(c, [[38, -34], [52, -32], [56, -38]], 3, '#d8303a'); line(c, [[52, -32], [58, -28]], 3, '#d8303a'); });
const hiss = (c, w, h) => { BG.rock(c, w, h); crack(c, w/2, h*.74 + 6); snake(c, w/2 + 6, 96, 1.1); };
const balloonAir = (c, w, h) => { BG.rock(c, w, h); crack(c, w/2, h*.74 + 6); balloon(c, w/2 - 30, 54, .8, '#4a86c0'); balloon(c, w/2 + 30, 48, .8, '#ffd36b'); balloon(c, w/2, 72, .9, '#e0503a'); };
// where Mo toasted the marshmallow
const mallow = (c, x0, y0, x1, y1) => { rope(c, [[x0, y0], [x1, y1]], '#8a5a3a', 5); part(c, rr(x1 - 14, y1 - 10, 28, 20, 6), '#f0c070'); };
const fireToast = (c, w, h) => { BG.rock(c, w, h); flame(c, 110, h*.74 - 24, 1); mallow(c, 220, 30, 132, 76); };
const busToast = (c, w, h) => { BG.rock(c, w, h); bus(c, 100, h*.74 - 26, 1.2); puff(c, 176, 70, .4, '#c8c0c8'); mallow(c, 226, 26, 176, 84); };
// how the lemon-shaped bomb got its shape
const bomb = (c, x, y, s) => at(c, x, y, s, () => part(c, p => { p.moveTo(-54, 0); p.quadraticCurveTo(0, -40, 54, 0); p.quadraticCurveTo(0, 40, -54, 0); }, '#5a3430'));
const carved = (c, w, h) => { BG.air(c, w, h); part(c, rr(30, 124, 180, 50, 6), '#8a8090'); bomb(c, 112, 104, .8);
  at(c, 170, 80, 1, () => { c.rotate(.7); part(c, cap(0, -40, 0, 20, 5), '#8a5a3a', 2.5); part(c, rr(-20, -54, 40, 18, 4), '#9aa0b0'); });
  for (const [x, y] of [[150, 112], [160, 100], [142, 96]]) part(c, poly([[x, y], [x + 6, y - 3], [x + 4, y + 4]]), '#5a3430', 2); };
const lemonTree = (c, w, h) => { BG.day(c, w, h); tree(c, w/2, 76, 1.5, (c, x, y) => at(c, x, y, .22, () => bomb(c, 0, 0, 1))); };
// what the shiny black rock really is
const blackIce = (c, w, h) => { BG.warm(c, w, h); iceCube(c, 104, 96, 1.2, '#2a3448'); iceCube(c, 156, 108, .8, '#2a3448'); };
const chocolate = (c, w, h) => { BG.warm(c, w, h); at(c, w/2, h/2 + 6, 1, () => { c.rotate(-.25); part(c, rr(-56, -32, 90, 64, 6), '#6a3a24'); for (const [gx, gy] of [[-50, -26], [-22, -26], [-50, 2], [-22, 2]]) part(c, rr(gx, gy, 24, 22, 3), '#7a4a2e', 2);
  part(c, poly([[20, -38], [64, -40], [62, 40], [20, 38], [28, 0]]), '#c0483a'); part(c, poly([[24, -38], [40, -38], [38, 38], [24, 38]]), '#e8d8b0', 2); }); };
// what the yellow crack smelled like
const eggs = (c, w, h) => { BG.rock(c, w, h); part(c, ell(90, 108, 22, 28), '#f6f2e8'); part(c, p => { p.moveTo(130, 116); p.lineTo(128, 100); p.lineTo(138, 108); p.lineTo(146, 96); p.lineTo(154, 108); p.lineTo(164, 98); p.lineTo(166, 116); p.arc(148, 116, 18, 0, Math.PI); p.closePath(); }, '#f6f2e8'); part(c, ell(148, 106, 9, 5), '#c8c040', 2); wavy(c, 76, 70, '#9ac040'); wavy(c, 134, 78, '#9ac040', 2); };
const rose = (c, x, y, s) => at(c, x, y, s, () => { line(c, [[0, 0], [2, 56]], 4, '#3a8a3a'); part(c, ell(-12, 34, 12, 5, -.6), '#5e9a4a', 2); part(c, ell(14, 26, 12, 5, .6), '#5e9a4a', 2);
  part(c, all(ell(0, -4, 22, 18), poly([[-22, -8], [-12, -26], [0, -16], [12, -26], [22, -8]])), '#d8303a'); c.strokeStyle = ink; c.lineWidth = 2.5/S; c.beginPath(); for (let a = 0; a < 11; a += .3) c.lineTo(Math.cos(a)*a*1.2, -6 + Math.sin(a)*a*1); c.stroke(); });
const roses = (c, w, h) => { BG.rock(c, w, h); rose(c, 100, 84, 1); rose(c, 150, 96, .8); wavy(c, 112, 50, '#f0a0c0', 2); };
const cookies = (c, w, h) => { BG.rock(c, w, h); part(c, ell(w/2, 118, 70, 16), '#f2ece4'); cookie(c, 96, 104, 1); cookie(c, 140, 104, 1); cookie(c, 118, 90, 1); wavy(c, 100, 66, '#f6d8a0'); };
// golden threads, spider webs or spaghetti
const web = (c, w, h) => { BG.rock(c, w, h); const cx = w/2, cy = 64; c.strokeStyle = '#f6f2f0'; c.lineWidth = 2.5;
  for (let k = 0; k < 8; k++) { const a = k*Math.PI/4; c.beginPath(); c.moveTo(cx, cy); c.lineTo(cx + Math.cos(a)*64, cy + Math.sin(a)*54); c.stroke(); }
  for (const r of [16, 30, 44, 58]) { c.beginPath(); for (let k = 0; k <= 8; k++) { const a = k*Math.PI/4; c.lineTo(cx + Math.cos(a)*r, cy + Math.sin(a)*r*.84); } c.stroke(); }
  line(c, [[cx + 30, 0], [cx + 30, 92]], 2); part(c, all(ell(cx + 30, 100, 10, 9), ell(cx + 30, 88, 6, 6)), '#3a3440', 2.5); for (const sx of [-1, 1]) for (const k of [0, 1, 2]) line(c, [[cx + 30, 98], [cx + 30 + sx*18, 92 + k*8], [cx + 30 + sx*22, 100 + k*8]], 2.5); };
const spaghetti = (c, w, h) => { BG.rock(c, w, h); part(c, ell(w/2, 118, 72, 18), '#f2ece4');
  part(c, p => { p.moveTo(w/2 - 52, 116); p.quadraticCurveTo(w/2 - 40, 70, w/2, 72); p.quadraticCurveTo(w/2 + 40, 70, w/2 + 52, 116); p.closePath(); }, '#f2d070');
  c.strokeStyle = '#c8a040'; c.lineWidth = 2.5; for (let k = 0; k < 6; k++) { c.beginPath(); c.moveTo(w/2 - 40 + k*16, 112); c.quadraticCurveTo(w/2 - 30 + k*14, 86, w/2 - 20 + k*10, 100); c.stroke(); }
  part(c, ell(w/2, 80, 26, 12), '#c0402a'); for (const dx of [-14, 12]) part(c, ell(w/2 + dx, 84, 8, 7), '#7a3a2a', 2); };
// the first things to grow on new lava
const fern = (c, x, y, s) => at(c, x, y, s, () => { for (const [a, l] of [[-.5, 40], [0, 50], [.5, 40]]) { c.save(); c.rotate(a); line(c, [[0, 0], [0, -l]], 3, '#2e6a34');
  for (let k = 1; k < 6; k++) for (const sx of [-1, 1]) part(c, ell(sx*9, -k*l/6, 10 - k, 4.5, sx*.4), '#6ab84a', 2); c.restore(); } });
const lichen = (c, w, h) => { BG.rock(c, w, h); c.strokeStyle = ink; c.lineWidth = 3; for (const x of [70, 160]) { c.beginPath(); c.moveTo(x - 20, h*.74); c.lineTo(x, h*.74 + 10); c.lineTo(x + 20, h*.74); c.stroke(); }
  fern(c, 70, h*.74 + 2, 1.1); fern(c, 160, h*.74 + 2, .8); for (const [x, y, r] of [[30, 140, 9], [110, 150, 12], [200, 144, 8], [130, 136, 6]]) part(c, ell(x, y, r*1.4, r*.7), '#b8c860', 2); };
const forest = (c, w, h) => { BG.rock(c, w, h); pine(c, 60, 82, 1.3); pine(c, 120, 70, 1.6); pine(c, 184, 84, 1.25); };
const cactus = (c, x, y, s) => at(c, x, y, s, () => part(c, all(cap(0, 40, 0, -40, 14), cap(-28, -4, -28, -26, 8), cap(-28, 4, -6, 4, 8), cap(28, -12, 28, -34, 8), cap(28, -4, 6, -4, 8)), '#5e9a4a'));
// what a seismometer does, or doesn't
const clock = (c, x, y, s) => at(c, x, y, s, () => { for (const sx of [-1, 1]) { line(c, [[sx*22, 30], [sx*30, 44]], 5); part(c, ell(sx*24, -34, 14, 10, sx*.6), '#d8a83a'); }
  part(c, ell(0, 0, 40, 40), '#d8403a'); part(c, ell(0, 0, 31, 31), '#fff6e0', 2.5); line(c, [[0, 0], [0, -20]], 4); line(c, [[0, 0], [14, 6]], 4); dots(c, [[0, 0]], 4); });
const popcorn = (c, x, y, s) => at(c, x, y, s, () => { for (const [px, py] of [[-24, -36], [-6, -44], [14, -40], [28, -32], [0, -30], [-16, -26], [18, -24]]) part(c, all(ell(px, py, 10, 9), ell(px + 6, py - 4, 7, 7)), '#fff4d8', 2.5);
  part(c, poly([[-34, -26], [34, -26], [24, 44], [-24, 44]]), '#f6f2e8'); for (const k of [-1, 0, 1]) part(c, poly([[k*22 - 6, -26], [k*22 + 6, -26], [k*16 + 4, 44], [k*16 - 4, 44]]), '#d8403a', 0); line(c, [[-34, -26], [34, -26], [24, 44], [-24, 44], [-34, -26]], 3); });
// what moves the plates: wind, or turtles
const windFace = (c, x, y, s) => at(c, x, y, s, () => { puff(c, 0, 0, .9, '#f6f2f0'); part(c, ell(14, 6, 6, 7), '#3a3440', 2); dots(c, [[-6, -6], [10, -10]], 3.5); part(c, ell(-12, 6, 6, 4), '#f0a0a0', 0); });
const windBlows = (c, w, h) => { BG.day(c, w, h); windFace(c, 50, 50, 1); for (const y of [44, 60, 76]) line(c, [[90, y], [130, y - 4], [160, y + 2]], 4, '#f6f2f0'); part(c, rr(110, h*.7 - 10, 140, 22, 4), '#7a5a42'); cone(c, 170, h*.7 - 8, 26, 30, '#5a4a62'); };
const turtle = (c, x, y, s) => at(c, x, y, s, () => { for (const lx of [-30, 26]) part(c, ell(lx, 20, 9, 12), '#7aa04a'); part(c, ell(52, 2, 13, 11), '#7aa04a'); dots(c, [[56, -2]], 3); smile(c, 54, 2, 5);
  part(c, p => { p.moveTo(-46, 14); p.quadraticCurveTo(-40, -34, 0, -34); p.quadraticCurveTo(40, -34, 46, 14); p.closePath(); }, '#4a8040'); for (const hx of [-22, 0, 22]) part(c, poly([[hx - 9, -4], [hx, -16], [hx + 9, -4], [hx, 8]]), '#6aa050', 2); });
const turtles = (c, w, h) => { BG.hot(c, w, h); part(c, rr(-4, 18, w + 8, 26, 3), '#7a5a42'); turtle(c, 80, 96, .9); turtle(c, 180, 110, .7); for (const y of [80, 96]) line(c, [[10, y], [30, y]], 4, '#ffd36b'); };
// the putty ball that bounced
const bounced = (c, w, h) => { putty2('none')(c, w, h); blob(c, 150, 60, 30, 28, '#c86a3a', 4); c.strokeStyle = '#efe0bf'; c.lineWidth = 4; c.setLineDash([6, 8]); c.beginPath(); c.moveTo(40, 120); c.quadraticCurveTo(70, 20, 100, 126); c.quadraticCurveTo(116, 60, 128, 80); c.stroke(); c.setLineDash([]);
  for (const x of [92, 108]) line(c, [[x, 132], [x + (x < 100 ? -6 : 6), 122]], 3); };
// how hot the middle of the Earth is: a slice of it, beside something just as hot
const slice = (c, x, y, s) => at(c, x, y, s, () => { part(c, p => { p.moveTo(-40, 30); p.arc(0, 30, 40, Math.PI, 0); p.closePath(); }, '#7a5a42'); part(c, p => { p.moveTo(-34, 30); p.arc(0, 30, 34, Math.PI, 0); p.closePath(); }, '#e0602a', 2);
  glowBlob(c, 0, 30, 14, '#fff8c0', '#ffb040'); line(c, [[-44, 30], [44, 30]], 3); });
const same = (c, x, y) => word(c, '=', x, y, 48, '#ffd36b');
const sun = (c, x, y, s) => at(c, x, y, s, () => { part(c, p => { for (let k = 0; k < 12; k++) { const a = k*Math.PI/6; p.moveTo(Math.cos(a - .14)*30, Math.sin(a - .14)*30); p.lineTo(Math.cos(a)*46, Math.sin(a)*46); p.lineTo(Math.cos(a + .14)*30, Math.sin(a + .14)*30); p.closePath(); } }, '#ffb040', 2);
  part(c, ell(0, 0, 32, 32), '#ffd36b'); dots(c, [[-10, -4], [10, -4]], 3); smile(c, 0, 4, 9); });
const oven = (c, x, y, s) => at(c, x, y, s, () => { part(c, p => { p.moveTo(-46, 30); p.arc(0, 30, 46, Math.PI, 0); p.closePath(); }, '#c0583a'); part(c, p => { p.moveTo(-20, 30); p.arc(0, 30, 20, Math.PI, 0); p.closePath(); }, '#2a1a1e', 2);
  at(c, 0, 18, .45, () => flame(c, 0, 0, 1)); part(c, rr(-56, 30, 112, 10, 3), '#8a8090', 2); });
const iceCream = (c, x, y, s) => at(c, x, y, s, () => { part(c, poly([[-20, -6], [20, -6], [0, 46]]), '#d89a50'); line(c, [[-12, 4], [8, 30]], 2); line(c, [[12, 4], [-8, 30]], 2); part(c, all(ell(0, -18, 22, 18), ell(-10, -34, 14, 12), ell(10, -34, 14, 12)), '#f6b0c8'); part(c, ell(0, -48, 7, 7), '#d8303a', 2); });
const coreAs = (thing, bg = 'hot', s = 1) => (c, w, h) => { BG[bg](c, w, h); slice(c, 60, 100, 1.3); same(c, 124, 96); thing(c, 186, 92, s*1.15); };
const ovenPizza = (c, x, y, s) => { oven(c, x, y, s); at(c, x, y + 46*s, s*.5, () => pizza(c, 0, 0, 1)); };
// what the mantle's green crystals are
const broccoli = (c, x, y, s) => at(c, x, y, s, () => { part(c, poly([[-10, 40], [-8, 0], [8, 0], [10, 40]]), '#9ac060'); part(c, all(ell(-20, -6, 18, 16), ell(18, -6, 18, 16), ell(0, -22, 22, 18), ell(-6, 4, 14, 12), ell(8, 4, 14, 12)), '#3e8a3a'); });
const beans = (c, w, h) => { BG.cave(c, w, h); for (const [x, y, a, col] of [[80, 130, .3, '#7ab84a'], [112, 136, -.4, '#5ea040'], [146, 128, .7, '#8ac85a'], [176, 136, -.2, '#6ab04a'], [96, 112, -.8, '#8ac85a'], [130, 110, .2, '#7ab84a'], [160, 112, -.6, '#5ea040'], [116, 92, .5, '#6ab04a']])
  at(c, x, y, 1, () => { c.rotate(a); part(c, p => { p.moveTo(-16, 0); p.bezierCurveTo(-16, -14, 0, -12, 4, -8); p.bezierCurveTo(10, -14, 18, -10, 16, 0); p.bezierCurveTo(16, 12, -16, 12, -16, 0); }, col, 2.5); c.fillStyle = 'rgba(255,255,255,.6)'; c.beginPath(); c.ellipse(-6, -4, 4, 2, -.3, 0, 7); c.fill(); }); };
// what a diamond is made of: a diamond, beside the same stuff
const diamond = (c, x, y, s) => at(c, x, y, s, () => { part(c, poly([[-30, -12], [-16, -28], [16, -28], [30, -12], [0, 30]]), '#c8eef8'); line(c, [[-30, -12], [30, -12]], 2.5); line(c, [[-12, -12], [0, 30], [12, -12]], 2.5); line(c, [[-16, -28], [-12, -12]], 2.5); line(c, [[16, -28], [12, -12]], 2.5); });
const pencil = (c, x, y, s) => at(c, x, y, s, () => { c.rotate(-.6); part(c, rr(-36, -9, 56, 18, 2), '#f2c03a'); part(c, rr(-48, -9, 14, 18, 4), '#f0a0b0'); part(c, poly([[20, -9], [44, 0], [20, 9]]), '#e8c898'); part(c, poly([[36, -3], [44, 0], [36, 3]]), '#3a3440', 1.5); });
const candy = (c, x, y, s) => at(c, x, y, s, () => { for (const sx of [-1, 1]) part(c, poly([[sx*20, 0], [sx*44, -16], [sx*40, 0], [sx*44, 16]]), '#e0503a'); part(c, ell(0, 0, 26, 20), '#e0503a'); for (const k of [-1, 0, 1]) line(c, [[k*12 - 6, -16], [k*12 + 6, 16]], 4, '#fff4ec'); });
const madeOf = (thing, n = 1) => (c, w, h) => { BG.warm(c, w, h); diamond(c, 54, 90, 1.1); same(c, 108, 90); if (n > 1) { thing(c, 150, 100, .75); thing(c, 196, 80, .75); } else thing(c, 170, 92, 1); };
// caves full of bats
const bats = (c, w, h) => { BG.hot(c, w, h); part(c, p => { p.moveTo(-4, h + 4); p.lineTo(-4, -4); p.lineTo(w + 4, -4); p.lineTo(w + 4, h + 4); p.lineTo(200, h + 4); p.quadraticCurveTo(200, 30, w/2, 30); p.quadraticCurveTo(40, 30, 40, h + 4); p.closePath(); }, '#5a3a34');
  for (const [x, y, s] of [[90, 70, 1], [150, 56, .8], [130, 104, .9], [176, 92, .7]]) at(c, x, y, s, () => { part(c, p => { p.moveTo(0, -4); p.quadraticCurveTo(-14, -18, -32, -10); p.quadraticCurveTo(-26, -4, -26, 4); p.quadraticCurveTo(-18, -2, -12, 6); p.quadraticCurveTo(-6, 0, 0, 8);
    p.quadraticCurveTo(6, 0, 12, 6); p.quadraticCurveTo(18, -2, 26, 4); p.quadraticCurveTo(26, -4, 32, -10); p.quadraticCurveTo(14, -18, 0, -4); }, '#2a2026', 2.5); dots(c, [[-3, 0], [3, 0]], 1.8, '#ffd36b'); }); };
// why the vent water can't boil: the sea's squeeze, shyness, or thirsty fish
const vent = (c, x, y, s, smoke = '#2a2430') => at(c, x, y, s, () => { part(c, poly([[-22, 40], [-12, -20], [12, -20], [22, 40]]), '#6a5450'); part(c, ell(0, -20, 12, 4), '#2a2026', 2); if (smoke) puff(c, 2, -46, .55, smoke); });
const squeeze = (c, w, h) => { BG.deep(c, w, h); vent(c, w/2, h*.8 - 34, 1, '#5a6a8a'); for (const x of [40, 200]) arrow(c, x, 12, x, 92, '#7aa0e0'); arrow(c, w/2 - 50, 12, w/2 - 40, 40, '#7aa0e0'); arrow(c, w/2 + 50, 12, w/2 + 40, 40, '#7aa0e0'); };
const shy = (c, w, h) => { BG.deep(c, w, h); vent(c, 60, h*.8 - 34, .8, null); drop(c, 150, 92, 1.1); part(c, ell(130, 104, 9, 13, .3), '#7ab8e8'); part(c, ell(170, 104, 9, 13, -.3), '#7ab8e8'); for (const x of [134, 166]) part(c, ell(x, 116, 7, 4), '#f0a0b0', 0); smile(c, 150, 112, 6); };
const thirsty = (c, w, h) => { BG.deep(c, w, h); vent(c, 80, h*.8 - 34, 1, null); line(c, [[80, h*.8 - 54], [80, 60], [128, 50]], 5, '#f2ece4'); fish(c, 160, 52, 1.2); fish(c, 190, 104, .8, '#ffd36b'); };
// what made the black smoke
const minerals = (c, w, h) => { BG.deep(c, w, h); vent(c, w/2, h*.8 - 34, 1, null); puff(c, w/2, 58, .9, '#4a4452'); puff(c, w/2 + 20, 24, .6, '#4a4452'); c.fillStyle = '#f2e0b0'; for (let i = 0; i < 18; i++) c.fillRect(70 + (i*37) % 100, 18 + (i*23) % 60, 4, 4); };
const stillThere = (c, w, h) => { BG.deep(c, w, h); c.fillStyle = '#ff8a3a'; c.strokeStyle = ink; c.lineWidth = 3; c.beginPath(); c.moveTo(w/2 - 70, h*.8); c.lineTo(w/2 - 60, h*.8); c.lineTo(w/2 - 63, h); c.lineTo(w/2 - 67, h); c.fill(); rockLump(c, w/2 + 10, h*.8 - 8, .9, '#b8b0b8'); };
const fireDeep = (c, w, h) => { BG.deep(c, w, h); flame(c, w/2, h*.8 - 26, 1.2); puff(c, w/2 + 8, 34, .6, '#4a4452'); };
const dragon = (c, x, y, s) => at(c, x, y, s, () => { part(c, p => { p.moveTo(-60, 70); p.quadraticCurveTo(-50, 10, -20, -6); p.lineTo(-30, -36); p.lineTo(-8, -18); p.lineTo(4, -40); p.lineTo(12, -14); p.quadraticCurveTo(50, -16, 58, 0); p.quadraticCurveTo(62, 18, 30, 18); p.quadraticCurveTo(0, 22, -10, 70); p.closePath(); }, '#4aa070');
  part(c, ell(16, -4, 7, 6), '#fff4d0', 2); dots(c, [[18, -4]], 3); dots(c, [[50, 4]], 2.5); line(c, [[30, 12], [58, 12]], 3); for (const [fx, fy] of [[-40, 40], [-30, 14]]) part(c, poly([[fx, fy], [fx + 10, fy - 10], [fx + 6, fy + 6]]), '#f2c060', 2); });
const dragonDeep = (c, w, h) => { BG.deep(c, w, h); dragon(c, 84, 104, 1.1); puff(c, 186, 80, .55, '#4a4452'); puff(c, 206, 46, .45, '#4a4452'); };
// where the black lumps came from: a boat
const ship = (c, x, y, s) => at(c, x, y, s, () => { line(c, [[0, 10], [0, -50]], 5); part(c, poly([[4, -46], [40, -10], [4, -6]]), '#f6efe0'); part(c, poly([[-50, 0], [50, 0], [36, 22], [-36, 22]]), '#8a5a3a'); });
const offBoat = (c, w, h) => { BG.deep(c, w, h); c.fillStyle = '#3a78a8'; c.fillRect(0, 0, w, 40); ship(c, 90, 22, .8); for (const [x, y, s] of [[120, 70, .45], [130, 110, .55], [100, 134, .6]]) rockLump(c, x, y, s, '#1e1a22'); };
const toSand = (c, w, h) => { BG.deep(c, w, h); part(c, p => { p.moveTo(30, h*.8 + 2); p.quadraticCurveTo(120, 60, 210, h*.8 + 2); p.closePath(); }, '#e8c890'); c.fillStyle = '#c8a060'; for (let i = 0; i < 20; i++) c.fillRect(70 + (i*37) % 100, 110 + (i*17) % 22, 3, 3);
  part(c, p => { p.moveTo(110, -4); p.lineTo(132, -4); p.quadraticCurveTo(128, 50, 124, 80); p.lineTo(116, 80); p.quadraticCurveTo(116, 40, 110, -4); }, '#ff8a3a'); };
// what the chimney worms eat
const worms = (c, x, y, s) => at(c, x, y, s, () => { for (const [wx, hg] of [[-24, 50], [-8, 66], [8, 56], [24, 44]]) { part(c, rr(wx - 5, -hg, 10, hg, 4), '#f2ece4', 2.5); part(c, all(ell(wx, -hg - 6, 8, 9), ell(wx - 5, -hg - 1, 5, 5), ell(wx + 5, -hg - 1, 5, 5)), '#e0303a', 2.5); } });
const wormFood = (c, w, h) => { BG.deep(c, w, h); vent(c, 170, h*.8 - 34, 1, '#5a6a8a'); worms(c, 90, h*.8 + 4, 1); for (let i = 0; i < 5; i++) line(c, [[150 - i*10, 70 + i*8], [140 - i*10, 72 + i*8]], 3, '#a8c8f0'); };
const sunflower = (c, w, h) => { BG.deep(c, w, h); worms(c, 60, h*.8 + 4, .8); flower(c, 160, 70, 1.4, '#ffd36b'); };
const pizzaBox = (c, w, h) => { BG.deep(c, w, h); worms(c, 60, h*.8 + 4, .8); part(c, poly([[110, 140], [200, 140], [210, 120], [120, 120]]), '#d8b078'); part(c, poly([[120, 120], [210, 120], [214, 60], [124, 64]]), '#e8c890'); pizza(c, 160, 128, .7); };
// what the yeti crab grows in its fuzz
const yeti = extra => (c, w, h) => { BG.deep(c, w, h); at(c, w/2, 104, 1.5, () => { crabBody(c, 0, 0, 1, '#f2ece4');
  c.strokeStyle = '#e0d8c8'; c.lineWidth = 2/S; for (const sx of [-1, 1]) for (let k = 0; k < 9; k++) { const x = sx*(20 + k*2.2), y = -4 - k*2; c.beginPath(); c.moveTo(x, y); c.lineTo(x + sx*2, y + 8); c.stroke(); }
  for (const sx of [-1, 1]) for (const [dx, dy] of [[22, -2], [27, -10], [32, -18]]) extra(c, sx*dx, dy); }); };
const germs = (c, x, y) => dots(c, [[x - 3, y], [x + 3, y + 4], [x + 1, y - 4]], 2.4, '#8af8d8');
const tinyFlower = (c, x, y) => at(c, x, y, .22, () => flower(c, 0, 0, 1, '#f6a0c8'));
const bow = (c, x, y) => part(c, all(poly([[x, y], [x - 7, y - 5], [x - 7, y + 5]]), poly([[x, y], [x + 7, y - 5], [x + 7, y + 5]])), '#f070a0', 1.5);
// sea pigs: pigs, or bubblegum
const pig = (c, x, y, s) => at(c, x, y, s, () => { for (const lx of [-22, -8, 10, 24]) part(c, rr(lx - 4, 10, 9, 20, 3), '#f0a0b0', 2); line(c, [[-40, -6], [-48, -12], [-44, -18]], 3);
  part(c, all(ell(0, 0, 40, 24), poly([[20, -20], [28, -36], [34, -18]])), '#f6b0c0'); part(c, ell(40, 2, 9, 11), '#f090a8'); dots(c, [[38, -1], [42, 5]], 2); dots(c, [[24, -8]], 3); });
const realPig = (c, w, h) => { BG.deep(c, w, h); pig(c, w/2, 110, 1.3); for (const [x, y, r] of [[176, 70, 6], [186, 50, 4], [180, 32, 3]]) { c.strokeStyle = '#e8f6ff'; c.lineWidth = 2.5; c.beginPath(); c.arc(x, y, r, 0, 7); c.stroke(); } };
const gum = (c, w, h) => { BG.deep(c, w, h); part(c, ell(w/2, 86, 56, 50), '#f6a0c8'); c.fillStyle = 'rgba(255,255,255,.55)'; c.beginPath(); c.ellipse(w/2 - 22, 62, 12, 18, -.5, 0, 7); c.fill(); part(c, poly([[60, 150], [100, 140], [110, 156], [70, 166]]), '#f2ece4', 2.5); };
// the ghost octopus, scared, or a real ghost
const octoScared = (c, w, h) => { ghost(c, w, h); for (const dx of [-14, 14]) blob(c, w/2 + dx, 76, 9, 10, '#ffffff', 2.5); dots(c, [[w/2 - 14, 78], [w/2 + 14, 78]], 3.5); blob(c, w/2, 98, 5, 7, '#3a3440', 2);
  for (const sx of [-1, 1]) line(c, [[w/2 + sx*52, 50], [w/2 + sx*60, 60], [w/2 + sx*52, 70]], 3, '#f4f0f6'); drop(c, w/2 + 46, 40, .25); };
const sheetGhost = (c, w, h) => { BG.deep(c, w, h); part(c, p => { p.moveTo(w/2 - 44, 150); p.lineTo(w/2 - 44, 70); p.quadraticCurveTo(w/2 - 44, 20, w/2, 20); p.quadraticCurveTo(w/2 + 44, 20, w/2 + 44, 70); p.lineTo(w/2 + 44, 150);
  for (let k = 0; k < 4; k++) p.quadraticCurveTo(w/2 + 44 - k*22 - 11, 136, w/2 + 44 - (k + 1)*22, 150); p.closePath(); }, '#f4f0f6'); dots(c, [[w/2 - 14, 64], [w/2 + 14, 64]], 6); blob(c, w/2, 90, 8, 11, '#3a3440', 2); };
// the anglerfish's light: bait, a night-light, or a hot-water bottle
const anglerFish = (c, w, h, light = true) => { sky(c, w, h, '#0b1a30', '#04101e'); line(c, [[110, 66], [124, 24], [160, 34]], 3, '#8a7a6a'); if (light) glowBlob(c, 164, 38, 14, '#fffbd0', '#a0f0c0');
  blob(c, 96, 100, 60, 42, '#3a3440', 4); c.fillStyle = '#f6f2f0'; for (let i = 0; i < 5; i++) { c.beginPath(); c.moveTo(126 + i*6, 108); c.lineTo(129 + i*6, 120); c.lineTo(132 + i*6, 108); c.fill(); } };
const angler = (c, w, h) => { anglerFish(c, w, h); dots(c, [[90, 84]], 5, '#fff4d0'); fish(c, 200, 94, .7, '#f2963a'); };
const anglerBed = (c, w, h) => { anglerFish(c, w, h); part(c, rr(10, 120, 220, 50, 10), '#4a86c0'); for (let k = 0; k < 4; k++) part(c, rr(20 + k*52, 126, 36, 36, 6), '#6aa0d8', 2); shut(c, [90], 84, 6); zzz(c, 30, 70, .9); };
const anglerScarf = (c, w, h) => { anglerFish(c, w, h); dots(c, [[90, 84]], 5, '#fff4d0'); part(c, p => { p.moveTo(100, 60); p.quadraticCurveTo(118, 96, 104, 140); p.lineTo(120, 140); p.quadraticCurveTo(132, 96, 116, 58); p.closePath(); }, '#d8403a');
  for (const y of [80, 100, 120]) line(c, [[106, y], [124, y]], 4, '#ffd36b'); };
// the flashing jelly: an alarm, a dancer, a reader
const jellyBell = (c, x, y, s) => at(c, x, y, s, () => part(c, p => { p.moveTo(-34, 0); p.arc(0, 0, 34, Math.PI, 0); p.closePath(); }, '#c0a0f0'));
const jellyDance = (c, w, h) => { sky(c, w, h, '#0b1a30', '#04101e'); for (let i = 0; i < 5; i++) line(c, [[w/2 - 24 + i*12, 84], [w/2 - 40 + i*12 + (i % 2)*30, 120], [w/2 - 24 + i*12, 156]], 4, '#c0a0f0');
  jellyBell(c, w/2, 84, 1); dots(c, [[w/2 - 10, 70], [w/2 + 10, 70]], 3); smile(c, w/2, 74, 7); note(c, 50, 70, 1); note(c, 196, 50, .8); };
const jellyBook = (c, w, h) => { sky(c, w, h, '#0b1a30', '#04101e'); for (let i = 0; i < 5; i++) line(c, [[w/2 - 24 + i*12, 64], [w/2 - 30 + i*12, 110]], 4, '#c0a0f0'); jellyBell(c, w/2, 64, 1); dots(c, [[w/2 - 10, 52], [w/2 + 10, 52]], 3);
  part(c, poly([[w/2, 112], [w/2 - 50, 102], [w/2 - 50, 150], [w/2, 160]]), '#f6efe0'); part(c, poly([[w/2, 112], [w/2 + 50, 102], [w/2 + 50, 150], [w/2, 160]]), '#f6efe0'); for (const sx of [-1, 1]) for (const k of [0, 1, 2]) line(c, [[w/2 + sx*10, 122 + k*10], [w/2 + sx*40, 116 + k*10]], 2, '#9a8a9a'); };
// a whale on the sea floor: a feast, swimming off, or turned to stone
const whaleFeast = (c, w, h) => { BG.deep(c, w, h); for (const [x, a] of [[70, -.9], [100, -1.1], [130, -1.3], [160, -1.7]]) bone(c, x, 128, .8, a); bone(c, 110, 146, 1.6, 0); crabBody(c, 190, 132, .55); fish(c, 60, 50, .6); fish(c, 150, 40, .5, '#ffd36b'); };
const whaleUp = (c, w, h) => { BG.deep(c, w, h); at(c, 120, 90, 1.2, () => { c.rotate(-.5); whaleBody(c, 0, 0, 1); }); arrow(c, 210, 140, 210, 30, '#ffd36b'); };
const whaleRock = (c, w, h) => { BG.deep(c, w, h); whaleBody(c, 120, 118, 1.3, '#7a7480'); line(c, [[90, 104], [100, 116], [96, 128]], 3); line(c, [[140, 106], [132, 118]], 3); };
// where the ridge comes out of the sea: Iceland, the moon, Mo's backyard
const moonCrack = (c, w, h) => { sky(c, w, h, '#14102a', '#2a2050'); c.fillStyle = '#fff8e0'; for (let i = 0; i < 30; i++) c.fillRect((i*67) % w, (i*41) % h, 2, 2); moon(c, w/2, 88, 1.5);
  c.strokeStyle = '#ff8a3a'; c.lineWidth = 6; c.beginPath(); c.moveTo(w/2 - 30, 44); c.lineTo(w/2 - 6, 80); c.lineTo(w/2 + 10, 96); c.lineTo(w/2 + 22, 132); c.stroke(); };
const backyard = (c, w, h) => { BG.hills(c, w, h); house(c, 70, 80, .9); for (let x = 130; x < 240; x += 16) part(c, poly([[x, 130], [x, 100], [x + 5, 94], [x + 10, 100], [x + 10, 130]]), '#f6efe0', 2);
  c.strokeStyle = '#ff8a3a'; c.lineWidth = 6; c.lineCap = 'round'; c.beginPath(); c.moveTo(20, 160); c.lineTo(110, 140); c.lineTo(230, 150); c.stroke(); };
// crashing plates that just doze
const dozing = (c, w, h) => { coast(c, w, h); part(c, rr(-4, 104, w/2 + 4, 40, 3), '#5a4a52'); part(c, rr(w/2, 104, w/2 + 4, 40, 3), '#5a4a52'); for (const x of [60, 180]) { shut(c, [x - 16, x + 16], 116, 9); smile(c, x, 126, 5); } zzz(c, 150, 60, 1.2); };
// how pebbles got round: water, polishing, or growing
const pebbleBg = (c, w, h) => { sky(c, w, h, '#8ab0d8', '#e8d8f0'); c.fillStyle = '#4a86c0'; c.fillRect(0, 70, w, h); };
const sponge = (c, x, y, s) => at(c, x, y, s, () => { c.rotate(-.3); part(c, rr(-30, -18, 60, 36, 8), '#f2d050'); dots(c, [[-16, -6], [0, 4], [14, -8], [18, 8], [-12, 10]], 3.5, '#c8a030'); });
const polished = (c, w, h) => { pebbleBg(c, w, h); blob(c, 110, 124, 44, 28, '#b8b0b8'); sponge(c, 150, 84, 1); for (const [x, y, r] of [[76, 90, 8], [190, 60, 6], [94, 66, 5], [206, 92, 7]]) { c.strokeStyle = '#ffffff'; c.lineWidth = 3; c.beginPath(); c.arc(x, y, r, 0, 7); c.stroke(); } sparkle(c, 78, 116, 9); };
const pebbleSprouts = (c, w, h) => { pebbleBg(c, w, h); for (const [x, y, r] of [[60, 130, 22], [130, 140, 26], [196, 124, 18]]) { line(c, [[x, y - r*.6], [x, y - r*.6 - 22]], 3, '#2e6a34'); for (const sx of [-1, 1]) part(c, ell(x + sx*8, y - r*.6 - 24, 8, 4, sx*-.4), '#6fbf5a', 2); blob(c, x, y, r, r*.7, '#b8b0b8'); } };
// how fast mountains grow: fingernails, a tree, a balloon
const growTree = (c, w, h) => { BG.peaks(c, w, h); tree(c, 120, 100, 1.1); arrow(c, 196, 150, 196, 40, '#ffd36b'); };
const growBalloon = (c, w, h) => { BG.peaks(c, w, h); balloon(c, 130, 38, .9, '#e0503a'); arrow(c, 196, 150, 196, 40, '#ffd36b'); };
// where the ammonite lived
const ammoSea = (c, w, h) => { BG.day(c, w, h); ammonite(c, 120, 130, 1); for (const [x, y] of [[176, 110], [186, 96]]) { c.strokeStyle = '#e8f6ff'; c.lineWidth = 2.5; c.beginPath(); c.arc(x, y, 5, 0, 7); c.stroke(); } };
const ammoTree = (c, w, h) => { BG.day(c, w, h); tree(c, 120, 90, 1.5); ammonite(c, 126, 56, .55); };
const ammoDesert = (c, w, h) => { sky(c, w, h, '#f6c890', '#f6e0b4'); part(c, p => { p.moveTo(-4, h + 4); p.lineTo(-4, 120); p.quadraticCurveTo(80, 90, 160, 120); p.quadraticCurveTo(200, 130, w + 4, 110); p.lineTo(w + 4, h + 4); p.closePath(); }, '#e8b860'); cactus(c, 190, 92, .6); ammonite(c, 90, 118, .8); sun(c, 40, 34, .45); };
// a glacier: a slow river of ice, or of chocolate
const river = col => (c, w, h) => { BG.peaks(c, w, h); part(c, p => { p.moveTo(110, 40); p.lineTo(140, 40); p.quadraticCurveTo(150, 100, 200, h + 4); p.lineTo(60, h + 4); p.quadraticCurveTo(110, 100, 110, 40); }, col);
  for (const [x0, y0, x1, y1] of [[110, 90, 130, 92], [92, 130, 124, 134], [140, 128, 170, 132]]) line(c, [[x0, y0], [x1, y1]], 3, mix(col, '#ffffff', .5)); };
// the mountain goat on its ledge: grippy pads, glue, or wings
const ledge = (c, w, h) => { BG.peaks(c, w, h); part(c, poly([[60, 120], [200, 116], [190, 136], [80, 140]]), '#8a7a80'); };
const goatGrip = (c, w, h) => { ledge(c, w, h); goat(c, 128, 80, 1.3); };
const goatGlue = (c, w, h) => { ledge(c, w, h); goat(c, 110, 80, 1.3); part(c, rr(172, 76, 26, 40, 5), '#f6f2ea'); part(c, poly([[176, 76], [190, 76], [186, 62], [180, 62]]), '#e0503a', 2); for (const lx of [-20, -10, 12, 22]) blob(c, 110 + lx*1.3, 123, 8, 3.5, '#fff8e0', 2); };
const goatWings = (c, w, h) => { ledge(c, w, h); for (const dx of [-10, 6]) part(c, p => { p.moveTo(110 + dx, 74); p.quadraticCurveTo(96 + dx, 40, 120 + dx, 30); p.quadraticCurveTo(116 + dx, 50, 130 + dx, 60); p.closePath(); }, '#f6efe0'); goat(c, 128, 80, 1.3); };
// what the marmot does all winter
const marmotSleep = (c, w, h) => { BG.peaks(c, w, h); part(c, ell(120, 132, 80, 38), '#5a4a42'); marmot(c, 120, 126, 1.1); shut(c, [112, 128], 98, 4.5); zzz(c, 176, 70, 1.2); };
const marmotSki = (c, w, h) => { BG.peaks(c, w, h); at(c, 120, 100, 1.25, () => { c.rotate(.25); rope(c, [[-50, 40], [50, 40], [58, 32]], '#d8403a', 5); marmot(c, 0, 0, .8); line(c, [[-20, 0], [-40, 40]], 3); line(c, [[20, 0], [40, 40]], 3); dots(c, [[-6, -20], [6, -20]], 2.5); part(c, rr(-18, -10, 36, 7, 3), '#4a86c0', 2); }); };
const marmotBake = (c, w, h) => { BG.peaks(c, w, h); marmot(c, 100, 110, 1.1); dots(c, [[93, 82], [107, 82]], 3); part(c, all(ell(100, 52, 18, 11), ell(89, 47, 10, 10), ell(111, 47, 10, 10)), '#f6f2ea'); part(c, rr(87, 56, 26, 9, 2), '#f6f2ea', 2);
  part(c, rr(130, 110, 80, 10, 3), '#9aa0b0'); for (const x of [146, 170, 194]) cookie(c, x, 104, .45); };
// why alpine flowers are fuzzy
const fuzzyFlowers = (c, w, h) => { BG.peaks(c, w, h); flower(c, 90, 100, 1.1, '#f6f2ea', true); flower(c, 160, 110, .9, '#f6f2ea', true); for (const y of [40, 56]) line(c, [[10, y], [60, y - 6], [110, y]], 4, '#f6f2f0'); };
const sneeze = (c, w, h) => { BG.peaks(c, w, h); flower(c, 160, 100, 1, '#f6f2ea', true); kid(c, 80, 140, 1.4); for (const a of [-.4, 0, .4]) line(c, [[100 + Math.cos(a)*10, 84 + Math.sin(a)*10], [100 + Math.cos(a)*26, 84 + Math.sin(a)*26]], 3); };
const beeNap = (c, w, h) => { BG.peaks(c, w, h); flower(c, 120, 100, 1.5, '#f6f2ea', true); at(c, 126, 86, 1, () => { part(c, ell(-4, -10, 9, 7, -.4), '#e8f6ff', 2); part(c, ell(0, 0, 16, 11), '#f2c03a'); for (const x of [-4, 6]) line(c, [[x, -10], [x, 10]], 4); shut(c, [12], -2, 3); }); zzz(c, 160, 60, 1); };
// who made the cave's crystals
const wizard = (c, w, h) => { BG.cave(c, w, h); crystalSpray(c, 150, 110, .9, '#a07ad8'); part(c, all(poly([[30, 90], [80, 90], [56, 20]]), ell(55, 90, 34, 8)), '#3a4a9a'); for (const [x, y] of [[50, 60], [62, 76], [56, 40]]) sparkle(c, x, y, 6, '#ffd36b');
  line(c, [[90, 140], [120, 80]], 5, '#8a5a3a'); for (const [x, y, r] of [[124, 72, 10], [108, 58, 6], [140, 70, 6]]) sparkle(c, x, y, r); };
const beaver = (c, x, y, s) => at(c, x, y, s, () => { part(c, ell(-30, 30, 22, 10, -.3), '#6a4a3a'); part(c, all(ell(0, 10, 26, 30), ell(0, -26, 18, 16), ell(-14, -38, 5, 5), ell(14, -38, 5, 5)), '#a0703a'); part(c, rr(-6, -16, 12, 9, 2), '#f6f2ea', 2); dots(c, [[-7, -30], [7, -30]], 3); part(c, ell(0, -20, 5, 4), '#3a2a2a', 1.5); });
const beavers = (c, w, h) => { BG.cave(c, w, h); crystalSpray(c, 160, 110, .8, '#a07ad8'); beaver(c, 70, 110, 1); };
// why the ground shook at the fault: a giant's foot, the bus landing
const foot = (c, w, h) => { BG.hills(c, w, h); part(c, all(rr(80, -30, 70, 90, 30), ell(154, 52, 26, 22)), '#f0c49a'); for (const [x, y, r] of [[176, 34, 10], [182, 50, 8], [182, 64, 7], [176, 76, 6]]) part(c, ell(x, y, r, r*.8), '#f0c49a', 2.5);
  for (const x of [70, 190]) line(c, [[x, 116], [x + (x < 100 ? -16 : 16), 106]], 4); line(c, [[100, 120], [140, 120]], 4); };
const busBump = (c, w, h) => { BG.hills(c, w, h); at(c, 120, 82, 1.2, () => { c.rotate(-.12); bus(c, 0, 0, 1); }); for (const a of [-2.6, -2.2, -.9, -.5]) line(c, [[120 + Math.cos(a)*76, 120 - Math.sin(a)*-20], [120 + Math.cos(a)*96, 128 - Math.sin(a)*-30]], 4); for (const x of [60, 180]) puff(c, x, 120, .3, '#e8d8c0'); };
// why the creek took a detour: a fish with a spade, or lost
const fishDig = (c, w, h) => { creek(c, w, h); fish(c, 70, 90, 1.1, '#f2963a'); line(c, [[92, 86], [140, 60]], 5, '#8a5a3a'); part(c, poly([[136, 54], [156, 46], [150, 70]]), '#9aa0b0'); };
const lostCreek = (c, w, h) => { BG.hills(c, w, h); c.fillStyle = '#9ac060'; c.fillRect(0, 0, w, h); line(c, [[0, 40], [60, 50], [90, 110], [40, 120], [70, 80], [150, 70], [170, 130], [240, 120]], 18, ink); line(c, [[0, 40], [60, 50], [90, 110], [40, 120], [70, 80], [150, 70], [170, 130], [240, 120]], 12, '#4a86c0');
  word(c, '?', 120, 36, 36, '#ffd36b'); word(c, '?', 200, 70, 28, '#ffd36b'); };
// how fast the plates slide: fingernails, a snail, a car
// what crushed Mo's rock: the plates, Mo sitting on it, or rain
const satOn = (c, w, h) => { BG.warm(c, w, h); part(c, p => { p.moveTo(60, 150); p.lineTo(64, 128); p.lineTo(176, 126); p.lineTo(180, 150); p.closePath(); }, '#9a8a7a'); dots(c, [[54, 146], [190, 148], [70, 156], [184, 156]], 3, '#9a8a7a');
  c.strokeStyle = ink; c.lineWidth = 5; c.lineCap = 'round'; c.beginPath(); c.moveTo(120, 90); c.lineTo(120, 120); c.lineTo(146, 122); c.lineTo(150, 148); c.moveTo(120, 100); c.lineTo(100, 110); c.stroke(); blob(c, 120, 78, 11, 11, '#f0c49a'); };
const rained = (c, w, h) => { BG.warm(c, w, h); blob(c, 120, 136, 54, 22, '#9a8a7a'); cloud(c, 120, 50, 1.1); };
// what the San Andreas Fault is not called
const pudding = (c, w, h) => { BG.hills(c, w, h); part(c, p => { p.moveTo(70, 130); p.lineTo(84, 60); p.quadraticCurveTo(120, 48, 156, 60); p.lineTo(170, 130); p.quadraticCurveTo(120, 140, 70, 130); }, '#e0a040'); part(c, p => { p.moveTo(84, 60); p.quadraticCurveTo(120, 48, 156, 60); p.quadraticCurveTo(150, 80, 140, 72); p.quadraticCurveTo(130, 86, 118, 72); p.quadraticCurveTo(100, 84, 90, 72); p.closePath(); }, '#8a4a24', 2);
  for (const sx of [-1, 1]) for (const k of [0, 1]) line(c, [[120 + sx*(62 + k*10), 70 + k*14], [120 + sx*(66 + k*10), 92 + k*14]], 3); };
const sandwich = (c, w, h) => { BG.hills(c, w, h); at(c, 120, 100, 1, () => { part(c, rr(-70, 6, 140, 18, 8), '#e8b878'); part(c, poly([[-72, 4], [72, 4], [64, 12], [-64, 12]]), '#6fbf5a', 2); part(c, rr(-66, -6, 132, 10, 3), '#f2c03a', 2); part(c, rr(-70, -26, 140, 20, 8), '#e8b878'); }); };
// the ponds along the fault: dips, a spilled bucket, lemonade rain
const ponds = (c, w, h) => { BG.hills(c, w, h); for (const [x, y] of [[60, 128], [130, 132], [200, 124]]) blob(c, x, y, 28, 8, '#4a86c0'); duckling(c, 130, 120, .6); };
const bucket = (c, w, h) => { BG.hills(c, w, h); blob(c, 150, 136, 50, 12, '#4a86c0'); at(c, 90, 110, 1, () => { c.rotate(-1.2); part(c, poly([[-22, -26], [22, -26], [16, 22], [-16, 22]]), '#9aa0b0'); part(c, ell(0, -26, 22, 6), '#4a86c0', 2.5); line(c, [[-22, -26], [0, -46], [22, -26]], 3); }); };
const lemonade = (c, w, h) => { BG.hills(c, w, h); cloud(c, 120, 40, 1.2, '#f6f2f0', '#f2d040'); for (const [x, y] of [[66, 128], [176, 124]]) at(c, x, y, 1.4, () => { part(c, ell(0, 0, 16, 16), '#f2c03a'); part(c, ell(0, 0, 12, 12), '#fff2a0', 0); for (let k = 0; k < 6; k++) line(c, [[0, 0], [Math.cos(k*1.05)*12, Math.sin(k*1.05)*12]], 2, '#f0b020'); }); };
// how ground squirrels scare off rattlesnakes
const tailWave = (c, w, h) => { BG.hills(c, w, h); squirrel(c, 80, 110, 1, '#e8803a'); for (const [x, y] of [[20, 60], [30, 44]]) wavy(c, x, y, '#ff8a3a', 1); snake(c, 180, 140, .7); };
const squirrelSing = (c, w, h) => { BG.hills(c, w, h); squirrel(c, 100, 110, 1); part(c, ell(124, 100, 4, 5), '#3a2a2a', 1.5); note(c, 150, 70, 1); note(c, 186, 50, .8); note(c, 200, 92, .7); };
const bearHead = (c, x, y, s) => at(c, x, y, s, () => { part(c, all(ell(0, 0, 34, 30), ell(-26, -24, 10, 10), ell(26, -24, 10, 10)), '#8a5a3a'); part(c, ell(0, 10, 14, 10), '#c8a070', 2); dots(c, [[0, 4]], 4); dots(c, [[-12, -8], [12, -8]], 3.5); });
const callBear = (c, w, h) => { BG.hills(c, w, h); bearHead(c, 170, 80, 1.1); squirrel(c, 70, 116, .9); };
// what keeps a house strong: braces, balloons, paint
const houseBalloons = (c, w, h) => { BG.hills(c, w, h); for (const [x, col] of [[80, '#4a86c0'], [120, '#e0503a'], [160, '#ffd36b']]) balloon(c, x, 26, .6, col); house(c, 120, 104, 1.1); };
const housePaint = (c, w, h) => { BG.hills(c, w, h); house(c, 110, 104, 1.1); part(c, rr(176, 116, 30, 30, 4), '#9aa0b0'); part(c, ell(191, 116, 15, 4), '#4aa8c8', 2); line(c, [[200, 50], [176, 90]], 6, '#8a5a3a'); part(c, rr(166, 86, 16, 14, 3), '#4aa8c8', 2); };
// why a spring bubbles up on the fault
const spring = (c, w, h) => { BG.hills(c, w, h); c.strokeStyle = ink; c.lineWidth = 4; c.beginPath(); c.moveTo(126, h + 4); c.lineTo(116, 150); c.lineTo(124, 140); c.stroke(); blob(c, 120, 136, 70, 18, '#4a86c0');
  part(c, all(ell(120, 128, 22, 12), ell(108, 124, 10, 8), ell(132, 124, 10, 8)), '#9ad0f0', 2.5); for (const [x, y] of [[110, 108], [126, 100], [118, 90]]) drop(c, x, y, .22, '#9ad0f0'); };
const fishBubbles = (c, w, h) => { BG.hills(c, w, h); blob(c, 120, 136, 70, 18, '#4a86c0'); fish(c, 100, 130, .8); for (const [x, y, r] of [[130, 110, 6], [140, 90, 8], [134, 66, 10]]) { c.strokeStyle = '#ffffff'; c.lineWidth = 3; c.beginPath(); c.arc(x, y, r, 0, 7); c.stroke(); } };
const hose = (c, w, h) => { BG.hills(c, w, h); blob(c, 160, 140, 56, 14, '#4a86c0'); line(c, [[20, 150], [60, 140], [40, 120], [80, 110], [110, 100]], 14, ink); line(c, [[20, 150], [60, 140], [40, 120], [80, 110], [110, 100]], 8, '#4aa84a'); part(c, rr(104, 92, 22, 14, 3), '#d9a441', 2);
  for (const [x, y] of [[140, 100], [150, 110], [160, 104], [170, 116], [156, 124]]) part(c, ell(x, y, 3, 5), '#9ad0f0', 1.5); };
// where earthquakes happen: along plate edges, everywhere, on Tuesdays
const shakyGlobe = (c, w, h) => { BG.hills(c, w, h); blob(c, 120, 84, 54, 54, '#3a78a8'); for (const [x, y, rx, ry] of [[100, 66, 20, 14], [140, 94, 22, 16], [104, 108, 12, 8]]) blob(c, x, y, rx, ry, '#6fa04a', 2);
  for (let k = 0; k < 8; k++) { const a = k*Math.PI/4; line(c, [[120 + Math.cos(a)*62, 84 + Math.sin(a)*62], [120 + Math.cos(a + .15)*72, 84 + Math.sin(a + .15)*72], [120 + Math.cos(a)*80, 84 + Math.sin(a)*80]], 3); } };
const calendar = (c, w, h) => { BG.hills(c, w, h); part(c, rr(60, 26, 120, 120, 8), '#f6f2ea'); part(c, rr(60, 26, 120, 30, 8), '#d8403a'); word(c, 'TUE', 120, 42, 22, '#f6f2ea');
  for (let r = 0; r < 3; r++) for (let k = 0; k < 4; k++) part(c, rr(70 + k*26, 64 + r*26, 20, 20, 3), r === 1 && k === 1 ? '#ffd36b' : '#e8dcc8', 1.5); for (const x of [80, 160]) line(c, [[x, 18], [x, 34]], 6, '#9aa0b0'); };
// what poppies do at night
const poppiesShut = (c, w, h) => { BG.night(c, w, h); for (const [x, y, s] of [[70, 110, 1.1], [130, 120, .9], [180, 112, 1]]) poppy(c, x, y, s, false); };
const poppiesGlow = (c, w, h) => { BG.night(c, w, h); for (const [x, y, s] of [[70, 110, 1.1], [130, 120, .9], [180, 112, 1]]) { const g = c.createRadialGradient(x, y - 10, 2, x, y - 10, 40); g.addColorStop(0, 'rgba(255,230,120,.8)'); g.addColorStop(1, 'rgba(255,230,120,0)'); c.fillStyle = g; c.fillRect(x - 40, y - 50, 80, 80); poppy(c, x, y, s, true); } };
const poppiesSing = (c, w, h) => { BG.night(c, w, h); for (const [x, y, s] of [[70, 110, 1.1], [130, 120, .9], [180, 112, 1]]) poppy(c, x, y, s, true); note(c, 100, 60, .9); note(c, 156, 48, .8); };
// what a hawk spots from the sky
const hawkMouse = (c, w, h) => { BG.hills(c, w, h); hawk(c, 80, 44, 1.1); c.strokeStyle = '#ffd36b'; c.lineWidth = 3; c.setLineDash([6, 6]); c.beginPath(); c.moveTo(84, 60); c.lineTo(166, 126); c.stroke(); c.setLineDash([]); mouse(c, 180, 134, .8); };
const pretzel = (c, x, y, s) => at(c, x, y, s, () => { for (const k of [[[-30, 10], [-36, -16], [-10, -20], [10, 12]], [[30, 10], [36, -16], [10, -20], [-10, 12]], [[-30, 10], [0, 18], [30, 10]]]) { line(c, k, 14, ink); line(c, k, 8, '#b5652f'); } });
const hawkSnack = (c, w, h) => { BG.hills(c, w, h); hawk(c, 80, 44, 1.1); pretzel(c, 176, 130, .8); };
const hawkNap = (c, w, h) => { BG.hills(c, w, h); line(c, [[40, 100], [200, 90]], 8, '#8a5634'); at(c, 120, 68, 1, () => { part(c, poly([[-6, 20], [0, 36], [6, 20]]), '#c8502a'); part(c, ell(0, 4, 16, 22), '#8a5a3a'); part(c, ell(0, 8, 9, 14), '#e8d8c0', 0); part(c, ell(0, -18, 11, 11), '#8a5a3a'); part(c, poly([[-3, -14], [3, -14], [0, -6]]), '#f2c03a', 1.5); shut(c, [-4, 4], -20, 3); }); zzz(c, 150, 40, 1); };

// one plate diving under another, with the volcanoes lined up above where it melts
const dive = (c, w, h) => { coast(c, w, h);
  c.fillStyle = '#7a5a42'; c.strokeStyle = ink; c.lineWidth = 3; c.beginPath(); c.moveTo(110, h*.7); c.lineTo(w + 4, h*.7); c.lineTo(w + 4, h + 4); c.lineTo(160, h + 4); c.closePath(); c.fill(); c.stroke();
  c.fillStyle = '#3a3440'; c.beginPath(); c.moveTo(-4, h*.82); c.lineTo(110, h*.82); c.lineTo(190, h + 4); c.lineTo(150, h + 4); c.lineTo(100, h*.94); c.lineTo(-4, h*.94); c.closePath(); c.fill(); c.stroke();
  for (const x of [150, 184, 218]) cone(c, x, h*.71, 20, 30, '#5a4a62');
  glowBlob(c, 186, 150, 12, '#ffe08a', '#e0602a'); arrow(c, 30, h*.88, 110, h*.88, '#ffd36b'); };
// the Earth, its crust cracked into plates
const cracked = (c, w, h) => { BG.warm(c, w, h); blob(c, w/2, h/2, 66, 66, '#3a78a8', 4);
  for (const [x, y, rx, ry] of [[100, 60, 22, 16], [146, 96, 26, 18], [96, 118, 14, 10]]) blob(c, x, y, rx, ry, '#6fa04a', 2);
  c.strokeStyle = ink; c.lineWidth = 4; c.lineCap = 'round';
  for (const pts of [[[64, 70], [96, 84], [120, 76], [150, 90], [178, 72]], [[120, 76], [114, 110], [128, 150]], [[150, 90], [160, 130]]]) { c.beginPath(); pts.forEach(([x, y]) => c.lineTo(x, y)); c.stroke(); } };
// a slice of the Earth, its crust or its mantle ringed
const layers = which => (c, w, h) => { sky(c, w, h, '#fff1d8', '#f6d8b8');
  const x = w/2, y = h + 10;
  for (const [r, col] of [[150, '#7a5a42'], [138, '#e0602a'], [52, '#ffd36b']]) blob(c, x, y, r, r, col, 3);
  dashed(c, () => which === 'crust' ? c.arc(x, y, 144, Math.PI*1.08, Math.PI*1.92) : c.arc(x, y, 95, Math.PI*1.1, Math.PI*1.9)); };
// a plate riding along on the mantle turning over underneath it
const ride = (c, w, h) => { sky(c, w, h, '#8a3424', '#ffb050'); c.fillStyle = '#7a5a42'; c.strokeStyle = ink; c.lineWidth = 3; c.fillRect(-4, 18, w + 8, 26); c.strokeRect(-4, 18, w + 8, 26);
  arrow(c, 40, 150, 40, 70, '#ff8a3a'); arrow(c, 56, 60, 184, 60, '#ffd36b'); arrow(c, 200, 70, 200, 150, '#7aa0e0'); arrow(c, 184, 160, 56, 160, '#ffb050'); };
// two plates, and which way they go
const plates = how => (c, w, h) => {
  if (how === 'slide') { BG.hills(c, w, h); c.strokeStyle = ink; c.lineWidth = 5; c.beginPath(); c.moveTo(w/2 - 10, 0); c.lineTo(w/2 + 10, h); c.stroke();
    arrow(c, 70, 140, 70, 40, '#ffd36b'); arrow(c, 170, 40, 170, 140, '#ffd36b'); return; }
  (how === 'apart' ? BG.deep : coast)(c, w, h);
  const gap = how === 'apart' ? 14 : 0;
  c.fillStyle = '#5a4a52'; c.strokeStyle = ink; c.lineWidth = 3; c.fillRect(-4, 100, w/2 - gap + 4, 70); c.strokeRect(-4, 100, w/2 - gap + 4, 70); c.fillRect(w/2 + gap, 100, w/2, 70); c.strokeRect(w/2 + gap, 100, w/2 + 4, 70);
  if (how === 'apart') { c.fillStyle = '#ff8a3a'; c.fillRect(w/2 - gap + 2, 104, gap*2 - 4, 66); arrow(c, w/2 - 30, 70, 30, 70, '#ffd36b'); arrow(c, w/2 + 30, 70, w - 30, 70, '#ffd36b'); }
  else { cone(c, w/2, 102, 40, 60, '#6b5a52'); arrow(c, 14, 80, 70, 80, '#ffd36b'); arrow(c, w - 14, 80, w - 70, 80, '#ffd36b'); } };
// rock in water, floating or sunk
const bob = floats => (c, w, h) => { sky(c, w, h, '#fff1d8', '#f6d8b8'); c.fillStyle = '#4a86c0'; c.fillRect(0, 70, w, h); c.strokeStyle = ink; c.lineWidth = 3; c.strokeRect(-3, 70, w + 6, h);
  blob(c, w/2, floats ? 68 : 148, 34, 18, '#c8b8a8', 3); c.fillStyle = '#8a7a6a'; for (let i = 0; i < 7; i++) { c.beginPath(); c.arc(w/2 - 20 + (i*13) % 40, (floats ? 64 : 144) + (i % 3)*4, 2.5, 0, 7); c.fill(); } };
const marshmallow = (c, w, h) => { BG.rock(c, w, h); crack(c, 70, h*.74 + 6); crack(c, 170, h*.74 + 8); wavy(c, 48, 118, '#ffb050', 2); wavy(c, 150, 120, '#ffb050', 2); mallow(c, 220, 30, 122, 112); };
const lemonRock = (c, w, h) => { sky(c, w, h, '#8ab0d8', '#f6cdb4');
  c.strokeStyle = '#fff4ec'; c.lineWidth = 4; for (const r of [52, 66]) { c.beginPath(); c.arc(w/2, h/2, r, -.4, .9); c.stroke(); c.beginPath(); c.arc(w/2, h/2, r, Math.PI - .4, Math.PI + .9); c.stroke(); }
  c.fillStyle = '#5a3430'; c.strokeStyle = ink; c.lineWidth = 3; c.beginPath(); c.moveTo(w/2 - 54, h/2); c.quadraticCurveTo(w/2, h/2 - 40, w/2 + 54, h/2); c.quadraticCurveTo(w/2, h/2 + 40, w/2 - 54, h/2); c.fill(); c.stroke(); };
const glass = (c, w, h) => { sky(c, w, h, '#fff1d8', '#f6d8b8'); c.fillStyle = '#14101a'; c.strokeStyle = ink; c.lineWidth = 3;
  c.beginPath(); c.moveTo(70, 140); c.lineTo(96, 40); c.lineTo(150, 30); c.lineTo(180, 120); c.lineTo(130, 150); c.closePath(); c.fill(); c.stroke();
  c.strokeStyle = '#e8f0ff'; c.lineWidth = 4; c.beginPath(); c.moveTo(104, 56); c.lineTo(118, 100); c.moveTo(146, 50); c.lineTo(156, 80); c.stroke(); };
const threads = (c, w, h) => { BG.rock(c, w, h); crack(c, w/2, h*.74 + 6); c.lineCap = 'round';
  for (let i = 0; i < 8; i++) { const x = 30 + i*24, y = 26 + (i % 3)*16; for (const [lw, col] of [[4, '#e8b840'], [1.5, '#fff6c8']]) { c.strokeStyle = col; c.lineWidth = lw; c.beginPath(); c.moveTo(x, y); c.quadraticCurveTo(x + 30, y - 16, x + 20, y + 30); c.quadraticCurveTo(x + 10, y + 60, x + 34, y + 72); c.stroke(); } } };
// a slope striped with old lava flows, one ringed
const flows = which => (c, w, h) => { sky(c, w, h, '#8ab0d8', '#f6cdb4');
  const cols = {green:'#6a9a4a', brown:'#8a6a4a', black:'#1e1a22'};
  ['green', 'brown', 'black'].forEach((k, i) => { const x = 30 + i*66; c.fillStyle = cols[k]; c.strokeStyle = ink; c.lineWidth = 3; c.beginPath(); c.moveTo(x, 10); c.lineTo(x + 40, 10); c.lineTo(x + 66, h + 4); c.lineTo(x + 10, h + 4); c.closePath(); c.fill(); c.stroke();
    if (k === which) dashed(c, () => c.ellipse(x + 34, h/2, 38, 70, -.2, 0, Math.PI*2)); }); };
const wiggles = (c, w, h) => { sky(c, w, h, '#fff1d8', '#f6d8b8'); c.fillStyle = '#e0702a'; c.strokeStyle = ink; c.lineWidth = 4; c.fillRect(30, 26, 180, 118); c.strokeRect(30, 26, 180, 118);
  c.fillStyle = '#12301e'; c.fillRect(44, 40, 152, 90); c.strokeStyle = '#8cf5a8'; c.lineWidth = 3; c.beginPath();
  for (let x = 0; x <= 150; x += 5) c.lineTo(46 + x, 85 + (x > 50 && x < 110 ? (x % 10 ? -1 : 1)*(30 - Math.abs(x - 80)*.6) : (x % 10 ? -2 : 2))); c.stroke(); };
const putty2 = shape => (c, w, h) => { sky(c, w, h, '#8a3424', '#ffb050'); c.fillStyle = '#7a4a3a'; c.fillRect(0, 130, w, h);
  if (shape === 'flat') blob(c, w/2, 122, 80, 14, '#c86a3a', 4); else if (shape === 'round') blob(c, w/2, 92, 40, 38, '#c86a3a', 4); };
const swatch = (inner, outer) => (c, w, h) => { sky(c, w, h, '#2a1418', '#4a2420'); glowBlob(c, w/2, h/2, 60, inner, outer); };
const crystals = col => (c, w, h) => { sky(c, w, h, '#4a3440', '#2a1e28'); c.fillStyle = col; c.strokeStyle = ink; c.lineWidth = 3;
  for (const [x, hg, a] of [[80, 90, -.3], [120, 120, 0], [160, 80, .3], [100, 60, -.6], [146, 56, .6]]) { c.save(); c.translate(x, 150); c.rotate(a);
    c.beginPath(); c.moveTo(-12, 0); c.lineTo(-12, -hg); c.lineTo(0, -hg - 18); c.lineTo(12, -hg); c.lineTo(12, 0); c.closePath(); c.fill(); c.stroke();
    c.beginPath(); c.moveTo(0, 0); c.lineTo(0, -hg - 18); c.stroke(); c.restore(); } };
const solid = (c, w, h) => { sky(c, w, h, '#c86a3a', '#a04a2a'); for (let i = 0; i < 40; i++) blob(c, (i*97) % w, (i*61 + (i*i*7) % 40) % h, 6 + i % 5, 4 + i % 3, i % 2 ? '#8a3a24' : '#d88a5a', 0);
  c.strokeStyle = ink; c.lineWidth = 4; c.strokeRect(2, 2, w - 4, h - 4); };
const pillows = (c, w, h) => { BG.deep(c, w, h); c.fillStyle = '#ff8a3a'; c.fillRect(w/2 - 5, h*.6, 10, h);
  for (const [x, y, r] of [[40, 130, 30], [80, 118, 26], [168, 120, 28], [206, 132, 30], [120, 140, 22]]) blob(c, x, y, r, r*.66, '#1e1a22', 3);
  c.strokeStyle = 'rgba(255,255,255,.3)'; c.lineWidth = 3; for (const [x, y] of [[34, 118], [74, 108], [162, 110]]) { c.beginPath(); c.arc(x, y, 10, Math.PI*1.1, Math.PI*1.6); c.stroke(); } };
// the sea floor's stripes either side of the crack, the newest or the oldest ringed
const stripes = where => (c, w, h) => { const cols = ['#14101a', '#3a2e30', '#5a4a3e', '#7a6448', '#8a7454'];
  cols.forEach((col, i) => { c.fillStyle = col; c.fillRect(w/2 - 12 - (i + 1)*22, 0, 22, h); c.fillRect(w/2 + 12 + i*22, 0, 22, h); });
  c.fillStyle = '#ff8a3a'; c.fillRect(w/2 - 12, 0, 24, h); c.fillStyle = '#5a4630'; c.fillRect(0, 0, w/2 - 122, h); c.fillRect(w/2 + 122, 0, w, h);
  dashed(c, () => where === 'far' ? c.ellipse(w - 16, h/2, 22, 70, 0, 0, Math.PI*2) : c.ellipse(w/2 + 24, h/2, 20, 70, 0, 0, Math.PI*2)); };
const seaPig = (c, w, h) => { BG.deep(c, w, h); blob(c, w/2, 112, 64, 30, '#f0a0b8', 4);
  c.strokeStyle = ink; c.lineWidth = 4; for (let i = 0; i < 6; i++) { c.beginPath(); c.moveTo(w/2 - 48 + i*19, 136); c.lineTo(w/2 - 50 + i*19, 152); c.stroke(); }
  for (const x of [w/2 - 20, w/2 + 10]) { c.beginPath(); c.moveTo(x, 84); c.lineTo(x - 6, 62); c.stroke(); } c.fillStyle = ink; c.beginPath(); c.arc(w/2 + 46, 104, 4, 0, 7); c.fill(); };
const ghost = (c, w, h) => { BG.deep(c, w, h); c.strokeStyle = '#f4f0f6'; c.lineWidth = 9; c.lineCap = 'round';
  for (let i = 0; i < 6; i++) { const x = w/2 - 40 + i*16; c.beginPath(); c.moveTo(x, 100); c.quadraticCurveTo(x - 10, 130, x + 6, 150); c.stroke(); }
  blob(c, w/2, 76, 42, 38, '#f4f0f6', 4); c.fillStyle = ink; for (const dx of [-14, 14]) { c.beginPath(); c.arc(w/2 + dx, 80, 5, 0, 7); c.fill(); } };
const jelly = (c, w, h) => { sky(c, w, h, '#0b1a30', '#04101e');
  for (const r of [70, 54]) { c.strokeStyle = 'rgba(160,240,255,.5)'; c.lineWidth = 4; c.beginPath(); c.arc(w/2, 70, r, 0, Math.PI*2); c.stroke(); }
  c.strokeStyle = '#c0a0f0'; c.lineWidth = 4; for (let i = 0; i < 5; i++) { c.beginPath(); c.moveTo(w/2 - 24 + i*12, 80); c.quadraticCurveTo(w/2 - 34 + i*12, 120, w/2 - 22 + i*12, 160); c.stroke(); }
  c.fillStyle = '#c0a0f0'; c.strokeStyle = ink; c.lineWidth = 3; c.beginPath(); c.arc(w/2, 82, 34, Math.PI, 0); c.closePath(); c.fill(); c.stroke(); };
const icelandCrack = (c, w, h) => { coast(c, w, h); blob(c, w/2, h*.7, 90, 30, '#6a9a4a', 3);
  c.strokeStyle = '#ff8a3a'; c.lineWidth = 6; c.beginPath(); c.moveTo(w/2 - 30, h*.7 - 26); c.lineTo(w/2 - 6, h*.7); c.lineTo(w/2 + 20, h*.7 + 26); c.stroke(); kid(c, w/2 - 40, h*.7 + 6, .6); kid(c, w/2 + 34, h*.7 - 2, .6); };
const rug = how => (c, w, h) => { sky(c, w, h, '#fff1d8', '#f6d8b8'); c.fillStyle = '#c0483a'; c.strokeStyle = ink; c.lineWidth = 4;
  if (how === 'bumps') { c.beginPath(); c.moveTo(20, 130); for (let x = 20; x <= 220; x += 4) c.lineTo(x, 130 - Math.abs(Math.sin((x - 20)/200*Math.PI*3))*44); c.lineTo(220, 146); c.lineTo(20, 146); c.closePath(); c.fill(); c.stroke(); arrow(c, 236, 150, 206, 150, '#ffd36b'); }
  else if (how === 'flat') { c.fillRect(20, 120, 200, 18); c.strokeRect(20, 120, 200, 18); }
  else { c.fillRect(14, 120, 90, 18); c.strokeRect(14, 120, 90, 18); c.save(); c.translate(150, 116); c.rotate(-.2); c.fillRect(0, 0, 80, 18); c.strokeRect(0, 0, 80, 18); c.restore(); } };
const pebbles = (c, w, h) => { sky(c, w, h, '#8ab0d8', '#e8d8f0'); c.fillStyle = '#4a86c0'; c.fillRect(0, 70, w, h);
  for (const [x, y, r] of [[60, 110, 22], [120, 130, 26], [180, 106, 20], [96, 150, 14], [200, 150, 16]]) blob(c, x, y, r, r*.7, '#b8b0b8', 3);
  c.strokeStyle = '#e8f6ff'; c.lineWidth = 3; for (const y of [86, 96]) { c.beginPath(); c.moveTo(20, y); c.quadraticCurveTo(80, y - 8, 140, y); c.stroke(); } };
const creek = (c, w, h) => { BG.hills(c, w, h); c.fillStyle = '#9ac060'; c.fillRect(0, 0, w, h);
  c.strokeStyle = ink; c.lineWidth = 4; c.beginPath(); c.moveTo(w/2 - 8, 0); c.lineTo(w/2 + 8, h); c.stroke();
  c.strokeStyle = '#4a86c0'; c.lineWidth = 12; c.lineCap = 'round'; c.beginPath(); c.moveTo(0, 40); c.lineTo(w/2 - 4, 40); c.lineTo(w/2 + 2, 120); c.lineTo(w, 120); c.stroke(); };
const halves = (c, w, h) => { sky(c, w, h, '#fff1d8', '#f6d8b8'); c.fillStyle = '#9a8a7a'; c.strokeStyle = ink; c.lineWidth = 4;
  c.beginPath(); c.moveTo(w/2, 40); c.lineTo(w/2 - 60, 50); c.lineTo(w/2 - 70, 130); c.lineTo(w/2, 140); c.closePath(); c.fill(); c.stroke();
  c.beginPath(); c.moveTo(w/2 + 4, 40); c.lineTo(w/2 + 64, 56); c.lineTo(w/2 + 70, 126); c.lineTo(w/2 + 4, 140); c.closePath(); c.fill(); c.stroke();
  c.strokeStyle = '#d8c8a8'; c.lineWidth = 8; c.beginPath(); c.moveTo(w/2 - 60, 90); c.lineTo(w/2 + 64, 90); c.stroke(); };
const braced = (c, w, h) => { BG.hills(c, w, h); house(c, 120, 100, 1.4); line(c, [[72, 82], [168, 152]], 12); line(c, [[168, 82], [72, 152]], 12); line(c, [[72, 82], [168, 152]], 6, '#c08a4a'); line(c, [[168, 82], [72, 152]], 6, '#c08a4a');
  part(c, rr(60, 154, 120, 10, 3), '#8a8090', 2); dots(c, [[74, 159], [120, 159], [166, 159]], 4, '#3a3440'); };
const loop = (col, dir) => (c, w, h) => { flow(dir)(c, w, h); if (col) { blob(c, w/2, h/2, 34, 30, col, 4); c.fillStyle = ink; for (const dx of [-10, 10]) { c.beginPath(); c.arc(w/2 + dx, h/2 - 4, 4, 0, 7); c.fill(); } } };

// ---------- the hotspot island ----------
const sea = (c, w, h, y = .58) => { coast(c, w, h); c.fillStyle = '#3a78a8'; c.fillRect(0, h*y, w, h); c.strokeStyle = '#e8f6ff'; c.lineWidth = 3;
  for (const x of [30, 120, 200]) { c.beginPath(); c.moveTo(x, h*y + 14); c.quadraticCurveTo(x + 10, h*y + 8, x + 20, h*y + 14); c.stroke(); } };
const smoke = (c, x, y) => { for (const [dx, dy, r] of [[0, 0, 9], [8, -12, 12], [20, -22, 10]]) blob(c, x + dx, y + dy, r, r*.8, '#f0ebe6', 2); };
// a cross-section: sea over a plate over the mantle, and whatever is underneath
function underSea(c, w, h){ sky(c, w, h, '#8ab0d8', '#f6cdb4'); c.fillStyle = '#3a78a8'; c.fillRect(0, 50, w, 40);
  c.fillStyle = '#6a5a52'; c.strokeStyle = ink; c.lineWidth = 3; c.fillRect(-3, 90, w + 6, 18); c.strokeRect(-3, 90, w + 6, 18);
  const g = c.createLinearGradient(0, 108, 0, h); g.addColorStop(0, '#e0602a'); g.addColorStop(1, '#8a2a20'); c.fillStyle = g; c.fillRect(0, 108, w, h); }
const plumeUp = (c, w, h) => { underSea(c, w, h); cone(c, 150, 92, 40, 60, '#2a2430'); smoke(c, 152, 26);
  const g = c.createLinearGradient(130, 0, 170, 0); g.addColorStop(0, 'rgba(255,200,90,0)'); g.addColorStop(.5, '#fff0a0'); g.addColorStop(1, 'rgba(255,200,90,0)'); c.fillStyle = g; c.fillRect(132, 108, 36, h);
  blob(c, 150, 112, 28, 9, '#ffd36b', 2); };
const campfire = (c, w, h) => { sea(c, w, h); cone(c, w/2, h*.6, 70, 50, '#6a5a52');
  c.strokeStyle = '#6b4430'; c.lineWidth = 9; c.lineCap = 'round'; c.beginPath(); c.moveTo(w/2 - 24, 70); c.lineTo(w/2 + 24, 58); c.moveTo(w/2 + 24, 70); c.lineTo(w/2 - 24, 58); c.stroke();
  for (const [dx, hh, col] of [[0, 44, '#f2963a'], [-10, 30, '#ffd36b'], [10, 32, '#ffd36b']]) { c.fillStyle = col; c.strokeStyle = ink; c.lineWidth = 2.5; c.beginPath(); c.moveTo(w/2 + dx - 10, 62); c.quadraticCurveTo(w/2 + dx - 8, 62 - hh*.6, w/2 + dx, 62 - hh); c.quadraticCurveTo(w/2 + dx + 8, 62 - hh*.6, w/2 + dx + 10, 62); c.closePath(); c.fill(); c.stroke(); } };
// the row of islands, old and green on the left, new and smoking on the right, one ringed
const chainOf = which => (c, w, h) => { sea(c, w, h);
  const isles = which === 'same' ? [[46, 30, 40, '#7a7480'], [120, 30, 40, '#7a7480'], [194, 30, 40, '#7a7480']] : [[40, 26, 14, '#6a9a4a'], [118, 32, 30, '#7a6a4a'], [194, 38, 56, '#2a2430']];
  isles.forEach(([x, hw, hg, col]) => cone(c, x, h*.6, hw, hg, col)); if (which !== 'same') smoke(c, 196, h*.6 - 64);
  if (which === 'old') dashed(c, () => c.ellipse(40, h*.6 - 6, 38, 26, 0, 0, Math.PI*2)); else if (which === 'new') dashed(c, () => c.ellipse(194, h*.6 - 26, 46, 46, 0, 0, Math.PI*2));
  else { c.fillStyle = '#ffd36b'; c.strokeStyle = ink; c.lineWidth = 4; c.font = '900 30px Nunito, sans-serif'; c.textAlign = 'center'; for (const x of [83, 157]) { c.strokeText('=', x, h*.6 - 18); c.fillText('=', x, h*.6 - 18); } } };
// paper sliding over a candle: a row of scorch marks, newest over the flame
const candle = (c, w, h) => { sky(c, w, h, '#fff1d8', '#f6d8b8');
  c.fillStyle = '#f6efe0'; c.strokeStyle = ink; c.lineWidth = 3; c.beginPath(); c.moveTo(10, 60); c.lineTo(230, 50); c.lineTo(230, 74); c.lineTo(10, 84); c.closePath(); c.fill(); c.stroke();
  for (const [x, r] of [[60, 5], [110, 7], [160, 9]]) blob(c, x, 70 - x*.045, r*1.4, r*.7, '#8a5a3a', 0);
  c.fillStyle = '#e8e0c8'; c.fillRect(170, 112, 26, 50); c.strokeRect(170, 112, 26, 50);
  c.fillStyle = '#ffd36b'; c.beginPath(); c.moveTo(176, 110); c.quadraticCurveTo(183, 84, 190, 110); c.closePath(); c.fill(); c.stroke();
  arrow(c, 120, 30, 50, 34, '#ffd36b'); };
const wiggly = (c, w, h) => { underSea(c, w, h); c.strokeStyle = '#ffd36b'; c.lineWidth = 12; c.beginPath(); for (let y = h; y > 108; y -= 6) c.lineTo(w/2 + 30*Math.sin(y/10), y); c.stroke();
  arrow(c, w/2 - 30, 130, w/2 - 80, 130, '#ffd36b'); arrow(c, w/2 + 30, 130, w/2 + 80, 130, '#ffd36b'); };
const swimmer = (c, w, h) => { sea(c, w, h); cone(c, 130, h*.6, 46, 50, '#5a8a4a'); c.strokeStyle = '#e8f6ff'; c.lineWidth = 4;
  for (const x of [70, 82]) { c.beginPath(); c.arc(x, h*.6 + 4, 8, Math.PI, Math.PI*2); c.stroke(); } arrow(c, 120, 40, 60, 40, '#ffd36b');
  for (const sx of [-1, 1]) blob(c, 130 + sx*30, h*.6 + 14, 12, 6, '#5a8a4a', 3); };
// under the volcano: magma swelling, the ground bulging, the rock cracking
const swelling = (c, w, h) => { sky(c, w, h, '#8ab0d8', '#f6cdb4'); c.fillStyle = '#5a4a52'; c.strokeStyle = ink; c.lineWidth = 3;
  c.beginPath(); c.moveTo(-3, 80); c.quadraticCurveTo(w/2, 26, w + 3, 80); c.lineTo(w + 3, h + 3); c.lineTo(-3, h + 3); c.closePath(); c.fill(); c.stroke();
  glowBlob(c, w/2, 122, 42, '#ffe08a', '#e0602a'); c.strokeStyle = ink; c.lineWidth = 4;
  for (const [x0, y0, x1, y1] of [[w/2 - 20, 92, w/2 - 30, 64], [w/2 + 18, 90, w/2 + 34, 60]]) { c.beginPath(); c.moveTo(x0, y0); c.lineTo((x0 + x1)/2 + 6, (y0 + y1)/2); c.lineTo(x1, y1); c.stroke(); }
  arrow(c, w/2, 40, w/2, 12, '#ffd36b'); };
const whale = (c, w, h) => { sea(c, w, h); cone(c, 170, h*.6, 46, 50, '#5a8a4a');
  c.fillStyle = '#4a6a8a'; c.strokeStyle = ink; c.lineWidth = 3; c.beginPath(); c.ellipse(80, h*.6 + 20, 56, 20, -.1, 0, Math.PI*2); c.fill(); c.stroke();
  c.beginPath(); c.moveTo(26, h*.6 + 18); c.lineTo(8, h*.6 + 2); c.lineTo(14, h*.6 + 28); c.closePath(); c.fill(); c.stroke(); c.fillStyle = ink; c.beginPath(); c.arc(118, h*.6 + 16, 3, 0, 7); c.fill(); };
// the volcano breathing: puffed up (dashed) and sunk back, with the GPS on top
const breathing = (c, w, h) => { sky(c, w, h, '#8ab0d8', '#f6cdb4'); c.fillStyle = '#4a4048'; c.strokeStyle = ink; c.lineWidth = 3;
  c.beginPath(); c.moveTo(-3, 120); c.quadraticCurveTo(w/2, 60, w + 3, 120); c.lineTo(w + 3, h + 3); c.lineTo(-3, h + 3); c.closePath(); c.fill(); c.stroke();
  dashed(c, () => { c.moveTo(-3, 116); c.quadraticCurveTo(w/2, 36, w + 3, 116); });
  c.strokeStyle = ink; c.lineWidth = 3; c.beginPath(); c.moveTo(w/2 - 8, 92); c.lineTo(w/2, 72); c.lineTo(w/2 + 8, 92); c.stroke(); blob(c, w/2, 68, 9, 6, '#f2ece0', 2.5);
  arrow(c, 40, 70, 40, 34, '#ffd36b'); arrow(c, 200, 40, 200, 76, '#7aa0e0'); };
const talking = (c, w, h) => { sea(c, w, h); cone(c, 90, h*.6, 60, 70, '#4a4048');
  c.fillStyle = '#fff8e8'; c.strokeStyle = ink; c.lineWidth = 3; c.beginPath(); c.ellipse(184, 40, 44, 26, 0, 0, Math.PI*2); c.fill(); c.stroke();
  c.beginPath(); c.moveTo(150, 54); c.lineTo(126, 74); c.lineTo(162, 60); c.fill(); c.fillStyle = ink; for (const x of [168, 184, 200]) { c.beginPath(); c.arc(x, 40, 4, 0, 7); c.fill(); } };
const snoring = (c, w, h) => { sea(c, w, h); cone(c, 100, h*.6, 60, 70, '#4a4048'); c.fillStyle = '#efe0bf'; c.strokeStyle = ink; c.lineWidth = 4; c.font = '900 26px Nunito, sans-serif'; c.textAlign = 'center';
  for (const [x, y] of [[160, 60], [184, 40], [208, 20]]) { c.strokeText('z', x, y); c.fillText('z', x, y); } };
// a volcano's heavy side slipping toward the sea
const slump = (c, w, h) => { sky(c, w, h, '#8ab0d8', '#f6cdb4'); c.fillStyle = '#3a78a8'; c.fillRect(0, 96, w, h);
  c.fillStyle = '#5a4a52'; c.strokeStyle = ink; c.lineWidth = 3; c.beginPath(); c.moveTo(-3, h + 3); c.lineTo(-3, 90); c.lineTo(60, 40); c.lineTo(110, 60); c.lineTo(130, h + 3); c.closePath(); c.fill(); c.stroke();
  c.fillStyle = '#6a5a5e'; c.beginPath(); c.moveTo(118, 64); c.lineTo(150, 72); c.lineTo(214, 120); c.lineTo(214, h + 3); c.lineTo(144, h + 3); c.closePath(); c.fill(); c.stroke();
  arrow(c, 150, 92, 200, 124, '#ffd36b'); };
// lava pouring into the sea and making land; or boiling the sea away; or floating off
const newLand = (c, w, h) => { sea(c, w, h, .62); c.fillStyle = '#2a2430'; c.strokeStyle = ink; c.lineWidth = 3;
  c.beginPath(); c.moveTo(-3, 40); c.lineTo(80, 70); c.lineTo(150, 112); c.lineTo(150, h + 3); c.lineTo(-3, h + 3); c.closePath(); c.fill(); c.stroke();
  c.fillStyle = '#ff8a3a'; c.beginPath(); c.moveTo(-3, 48); c.lineTo(80, 76); c.lineTo(146, 112); c.lineTo(136, 116); c.lineTo(76, 84); c.lineTo(-3, 60); c.closePath(); c.fill();
  smoke(c, 150, 92); arrow(c, 160, 130, 214, 130, '#ffd36b'); };
const boiling = (c, w, h) => { sea(c, w, h, .4); c.strokeStyle = '#e8f6ff'; c.lineWidth = 3; for (let i = 0; i < 12; i++) { c.beginPath(); c.arc(20 + (i*53) % 200, 90 + (i*37) % 70, 5 + i % 4*2, 0, 7); c.stroke(); }
  for (const x of [60, 130, 190]) smoke(c, x, 50); };
const floating = (c, w, h) => { sea(c, w, h, .5); for (const [x, y, r] of [[60, 90, 16], [130, 96, 20], [196, 88, 14]]) glowBlob(c, x, y, r, '#ffe08a', '#e0602a'); arrow(c, 90, 130, 180, 130, '#ffd36b'); };
// black sand: lava meeting the sea and shattering; pepper; toast crumbs
const blackSand = (c, w, h) => { sea(c, w, h, .5); c.fillStyle = '#26232a'; c.beginPath(); c.moveTo(-3, h + 3); c.lineTo(-3, 110); c.quadraticCurveTo(w/2, 96, w + 3, 120); c.lineTo(w + 3, h + 3); c.closePath(); c.fill();
  c.fillStyle = '#8a9ab8'; for (let i = 0; i < 40; i++) c.fillRect((i*47) % w, 116 + (i*29) % 50, 3, 3);
  c.fillStyle = '#ff8a3a'; c.strokeStyle = ink; c.lineWidth = 3; c.beginPath(); c.moveTo(150, 10); c.lineTo(172, 10); c.lineTo(170, 80); c.lineTo(152, 80); c.closePath(); c.fill(); c.stroke();
  c.strokeStyle = '#f6f2f0'; c.lineWidth = 3; for (let k = 0; k < 6; k++) { const a = Math.PI + k*.6; c.beginPath(); c.moveTo(161 + Math.cos(a)*12, 86 + Math.sin(a)*6); c.lineTo(161 + Math.cos(a)*24, 86 + Math.sin(a)*14); c.stroke(); } };
const pepper = (c, w, h) => { sky(c, w, h, '#fff1d8', '#f6d8b8'); c.fillStyle = '#e8d8b0'; c.fillRect(0, 130, w, h);
  c.fillStyle = '#c8c0d0'; c.strokeStyle = ink; c.lineWidth = 3; c.save(); c.translate(130, 70); c.rotate(.6); c.fillRect(-18, -34, 36, 64); c.strokeRect(-18, -34, 36, 64);
  c.fillStyle = '#9a8aa8'; c.beginPath(); c.ellipse(0, -34, 18, 8, 0, 0, Math.PI*2); c.fill(); c.stroke(); c.restore();
  c.fillStyle = ink; for (let i = 0; i < 26; i++) c.fillRect(60 + (i*37) % 70, 100 + (i*23) % 50, 3, 3); };
const toast = (c, w, h) => { sky(c, w, h, '#fff1d8', '#f6d8b8'); c.fillStyle = '#a8703a'; c.strokeStyle = ink; c.lineWidth = 4;
  c.beginPath(); c.moveTo(70, 140); c.lineTo(70, 66); c.quadraticCurveTo(70, 34, 100, 34); c.quadraticCurveTo(120, 22, 140, 34); c.quadraticCurveTo(170, 34, 170, 66); c.lineTo(170, 140); c.closePath(); c.fill(); c.stroke();
  c.fillStyle = '#5a3420'; c.fillRect(84, 60, 72, 66); for (let i = 0; i < 9; i++) blob(c, 186 + (i % 3)*12, 130 + Math.floor(i/3)*10, 4, 3, '#8a5a30', 1.5); };
// an open question: deep under the plume, where nobody has been
const unknown = (c, w, h) => { const x = w/2, y = h + 10; sky(c, w, h, '#fff1d8', '#f6d8b8');
  for (const [r, col] of [[150, '#7a5a42'], [138, '#e0602a'], [52, '#ffd36b']]) blob(c, x, y, r, r, col, 3);
  c.fillStyle = 'rgba(255,240,170,.85)'; c.fillRect(x - 8, y - 136, 16, 82);
  c.font = '64px Caprasimo, Georgia, serif'; c.fillStyle = '#ffd36b'; c.strokeStyle = ink; c.lineWidth = 5; c.textAlign = 'center'; c.strokeText('?', x + 60, 70); c.fillText('?', x + 60, 70); };
const shovel = (c, w, h) => { sky(c, w, h, '#8ab0d8', '#f6cdb4'); c.fillStyle = '#26232a'; c.fillRect(0, 110, w, h);
  c.strokeStyle = '#8a5a3a'; c.lineWidth = 8; c.beginPath(); c.moveTo(150, 20); c.lineTo(120, 100); c.stroke();
  c.fillStyle = '#9aa0b0'; c.strokeStyle = ink; c.lineWidth = 3; c.beginPath(); c.moveTo(106, 96); c.lineTo(134, 104); c.lineTo(120, 136); c.closePath(); c.fill(); c.stroke(); };
const highSky = (c, w, h) => { sky(c, w, h, '#6a9ae0', '#cfe2f6'); for (const [x, y, r] of [[60, 60, 26], [86, 52, 30], [116, 62, 24], [170, 110, 22], [192, 104, 26]]) blob(c, x, y, r, r*.7, '#fff8f0', 2.5); };
// what makes green sand green
const greenSand = (c, w, h) => { sky(c, w, h, '#8ab0d8', '#f6cdb4'); c.fillStyle = '#8a9440'; c.fillRect(0, 100, w, h);
  for (let i = 0; i < 9; i++) { const x = 30 + (i*61) % 190, y = 112 + (i*29) % 46; c.fillStyle = '#7ab84a'; c.strokeStyle = ink; c.lineWidth = 2; c.beginPath(); c.moveTo(x, y - 9); c.lineTo(x + 8, y); c.lineTo(x, y + 9); c.lineTo(x - 8, y); c.closePath(); c.fill(); c.stroke(); }
  cone(c, 60, 100, 60, 56, '#8a4634'); };
const seaweed = (c, w, h) => { sea(c, w, h, .3); c.strokeStyle = '#3a8a3a'; c.lineWidth = 7; c.lineCap = 'round';
  for (const x of [50, 90, 130, 170, 200]) { c.beginPath(); c.moveTo(x, h); c.quadraticCurveTo(x - 16, h - 40, x + 4, h - 70); c.quadraticCurveTo(x + 18, h - 96, x - 2, h - 110); c.stroke(); } };
const paint = (c, w, h) => { sky(c, w, h, '#fff1d8', '#f6d8b8'); c.fillStyle = '#9aa0b0'; c.strokeStyle = ink; c.lineWidth = 3; c.fillRect(80, 70, 70, 70); c.strokeRect(80, 70, 70, 70);
  c.fillStyle = '#4aa84a'; c.beginPath(); c.ellipse(115, 70, 35, 10, 0, 0, Math.PI*2); c.fill(); c.stroke(); c.fillRect(140, 70, 12, 40); c.strokeRect(140, 70, 12, 40);
  c.strokeStyle = '#8a5a3a'; c.lineWidth = 6; c.beginPath(); c.moveTo(80, 40); c.lineTo(110, 70); c.stroke(); };
// two kinds of lava: smooth ropes, rough rubble; and a bowl of noodles
const ropes = (c, w, h) => { sky(c, w, h, '#3a3440', '#26222c'); c.strokeStyle = '#8a8aa8'; c.lineWidth = 5; c.lineCap = 'round';
  for (let k = 0; k < 6; k++) { c.beginPath(); c.arc(w/2, 190, 40 + k*20, Math.PI*1.15, Math.PI*1.85); c.stroke(); } };
const rubble = (c, w, h) => { sky(c, w, h, '#8ab0d8', '#f6cdb4');
  for (let i = 0; i < 16; i++) { const x = 20 + (i*53) % 210, y = 90 + (i*31) % 70, r = 12 + (i % 4)*5; c.fillStyle = ['#2a2228', '#4a3430', '#3a2e34'][i % 3]; c.strokeStyle = ink; c.lineWidth = 2.5;
    c.beginPath(); for (let k = 0; k < 6; k++) { const a = k/6*Math.PI*2 + i; c.lineTo(x + Math.cos(a)*r*(.8 + (k % 2)*.4), y + Math.sin(a)*r*.8); } c.closePath(); c.fill(); c.stroke(); } };
const noodles = (c, w, h) => { sky(c, w, h, '#fff1d8', '#f6d8b8'); c.fillStyle = '#c0483a'; c.strokeStyle = ink; c.lineWidth = 4;
  c.beginPath(); c.moveTo(40, 80); c.quadraticCurveTo(w/2, 190, 200, 80); c.closePath(); c.fill(); c.stroke();
  c.strokeStyle = '#f6d890'; c.lineWidth = 4; for (let k = 0; k < 7; k++) { c.beginPath(); c.moveTo(60 + k*20, 80); c.quadraticCurveTo(70 + k*20, 50, 56 + k*20, 30 + (k % 3)*6); c.stroke(); } };
// a lava tube: a tunnel under a crust, drained; a worm; a railway tunnel
const tube = (c, w, h) => { sky(c, w, h, '#8ab0d8', '#f6cdb4'); c.fillStyle = '#3a3440'; c.strokeStyle = ink; c.lineWidth = 3; c.fillRect(-3, 60, w + 6, h); c.strokeRect(-3, 60, w + 6, h);
  c.fillStyle = '#140e18'; c.beginPath(); c.ellipse(w/2, 118, 90, 30, 0, 0, Math.PI*2); c.fill(); c.stroke();
  c.fillStyle = '#ff8a3a'; c.beginPath(); c.ellipse(w/2 + 40, 140, 36, 6, 0, 0, Math.PI*2); c.fill(); arrow(c, 70, 118, 150, 118, '#ffd36b'); };
const worm = (c, w, h) => { sky(c, w, h, '#8a6a4a', '#5a4030'); c.strokeStyle = '#f0a0a8'; c.lineWidth = 26; c.lineCap = 'round';
  c.beginPath(); c.moveTo(30, 120); c.quadraticCurveTo(80, 60, 120, 110); c.quadraticCurveTo(160, 150, 200, 80); c.stroke(); c.fillStyle = ink; c.beginPath(); c.arc(204, 76, 4, 0, 7); c.fill(); };
const railway = (c, w, h) => { sky(c, w, h, '#8ab0d8', '#f6cdb4'); c.fillStyle = '#7a6a5e'; c.strokeStyle = ink; c.lineWidth = 3; c.beginPath(); c.moveTo(-3, h); c.lineTo(-3, 40); c.quadraticCurveTo(w/2, 0, w + 3, 40); c.lineTo(w + 3, h); c.closePath(); c.fill(); c.stroke();
  c.fillStyle = '#1a1320'; c.beginPath(); c.moveTo(80, h); c.lineTo(80, 100); c.arc(w/2, 100, 40, Math.PI, 0); c.lineTo(160, h); c.closePath(); c.fill();
  c.strokeStyle = '#c8c0b0'; c.lineWidth = 4; c.beginPath(); c.moveTo(100, h); c.lineTo(112, 120); c.moveTo(140, h); c.lineTo(128, 120); c.stroke(); };
// how life reaches an island: wind, wings and waves; or planted; or from space
const arrivals = (c, w, h) => { sea(c, w, h, .7); cone(c, 170, h*.7, 50, 40, '#5e9a4a');
  c.strokeStyle = '#f6f2f0'; c.lineWidth = 4; for (const y of [30, 46]) { c.beginPath(); c.moveTo(10, y); c.quadraticCurveTo(60, y - 14, 110, y); c.stroke(); }
  c.strokeStyle = '#d8303a'; c.lineWidth = 5; c.beginPath(); c.moveTo(70, 80); c.quadraticCurveTo(80, 70, 90, 80); c.quadraticCurveTo(100, 70, 110, 80); c.stroke();
  blob(c, 60, h*.7 + 8, 8, 6, '#8a6a4a', 2); arrow(c, 74, h*.7 + 8, 116, h*.7 + 8, '#ffd36b'); };
const planted = (c, w, h) => { sky(c, w, h, '#fff1d8', '#f6d8b8'); c.fillStyle = '#b5552f'; c.strokeStyle = ink; c.lineWidth = 3;
  c.beginPath(); c.moveTo(90, 100); c.lineTo(150, 100); c.lineTo(140, 150); c.lineTo(100, 150); c.closePath(); c.fill(); c.stroke();
  c.strokeStyle = '#3a8a3a'; c.lineWidth = 5; c.beginPath(); c.moveTo(120, 100); c.lineTo(120, 50); c.stroke(); blob(c, 108, 62, 12, 6, '#5e9a4a', 2); blob(c, 132, 54, 12, 6, '#5e9a4a', 2); };
const space = (c, w, h) => { sky(c, w, h, '#14102a', '#2a2050'); c.fillStyle = '#fff8e0'; for (let i = 0; i < 30; i++) c.fillRect((i*67) % w, (i*41) % h, 2, 2);
  blob(c, 170, 60, 30, 30, '#c8a0e0', 3); c.strokeStyle = '#ffd36b'; c.lineWidth = 3; c.beginPath(); c.ellipse(170, 60, 46, 10, -.3, 0, Math.PI*2); c.stroke(); };
// a hidden volcano under the waves; a whirlpool; a sea monster
const seamount = (c, w, h) => { sea(c, w, h, .4); c.fillStyle = '#2a4a6a'; c.strokeStyle = ink; c.lineWidth = 3; c.beginPath(); c.moveTo(20, h + 3); c.lineTo(110, 80); c.lineTo(140, 80); c.lineTo(230, h + 3); c.closePath(); c.fill(); c.stroke();
  c.strokeStyle = '#ffffff'; c.lineWidth = 5; c.beginPath(); c.moveTo(96, 64); c.quadraticCurveTo(120, 50, 150, 66); c.stroke(); c.fillStyle = '#ff8a3a'; c.fillRect(118, 80, 14, 6); };
const whirlpool = (c, w, h) => { sea(c, w, h, .3); c.strokeStyle = '#e8f6ff'; c.lineWidth = 4; c.beginPath(); for (let a = 0; a < 18; a += .2) c.lineTo(w/2 + Math.cos(a)*a*4, 110 + Math.sin(a)*a*1.6); c.stroke(); };
const monster = (c, w, h) => { sea(c, w, h, .55); for (const [x, r] of [[60, 18], [110, 24], [160, 18]]) { c.fillStyle = '#5a9a6a'; c.strokeStyle = ink; c.lineWidth = 3; c.beginPath(); c.arc(x, h*.55, r, Math.PI, 0); c.fill(); c.stroke(); }
  blob(c, 196, h*.55 - 26, 16, 14, '#5a9a6a', 3); c.fillStyle = ink; c.beginPath(); c.arc(202, h*.55 - 30, 3, 0, 7); c.fill(); };
// the atoll: a reef ring round a lagoon, the sunk volcano a shadow underneath; pirates; rain
const atoll = (c, w, h) => { sky(c, w, h, '#3a78a8', '#2a5a8a');
  c.fillStyle = 'rgba(20,40,70,.5)'; c.beginPath(); c.ellipse(w/2, h/2 + 6, 70, 40, 0, 0, Math.PI*2); c.fill();
  c.lineWidth = 18; c.strokeStyle = '#f2e6c4'; c.beginPath(); c.ellipse(w/2, h/2, 84, 50, 0, 0, Math.PI*2); c.stroke();
  c.fillStyle = '#6ad8c8'; c.beginPath(); c.ellipse(w/2, h/2, 74, 40, 0, 0, Math.PI*2); c.fill(); c.strokeStyle = ink; c.lineWidth = 3; c.beginPath(); c.ellipse(w/2, h/2, 93, 59, 0, 0, Math.PI*2); c.stroke();
  for (const a of [.4, 1.6, 2.9, 4.4, 5.5]) blob(c, w/2 + Math.cos(a)*84, h/2 + Math.sin(a)*50, 7, 7, '#4e8a3e', 2); };
const pirates = (c, w, h) => { sea(c, w, h, .62); c.fillStyle = '#8a5a3a'; c.strokeStyle = ink; c.lineWidth = 3; c.beginPath(); c.moveTo(60, 100); c.lineTo(180, 100); c.lineTo(160, 124); c.lineTo(80, 124); c.closePath(); c.fill(); c.stroke();
  c.strokeRect(118, 30, 4, 70); c.fillStyle = '#f6efe0'; c.beginPath(); c.moveTo(122, 34); c.lineTo(170, 60); c.lineTo(122, 86); c.closePath(); c.fill(); c.stroke(); };
const jumping = (c, w, h) => { sea(c, w, h, .7); cone(c, w/2, h*.7, 100, 50, '#5e9a4a'); for (const [x, y] of [[80, 74], [120, 62], [160, 74]]) kid(c, x, y, .8, 'stand');
  c.strokeStyle = '#ffd36b'; c.lineWidth = 3; for (const x of [80, 120, 160]) { c.beginPath(); c.moveTo(x - 8, (x === 120 ? 62 : 74) + 14); c.lineTo(x + 8, (x === 120 ? 62 : 74) + 14); c.stroke(); } };
const rainy = (c, w, h) => { sea(c, w, h); cone(c, w/2, h*.6, 60, 50, '#7a6a5e'); blob(c, w/2, 30, 50, 18, '#c8c8d8', 3);
  c.strokeStyle = '#4a86c0'; c.lineWidth = 3; for (let i = 0; i < 8; i++) { c.beginPath(); c.moveTo(80 + i*12, 50); c.lineTo(74 + i*12, 64); c.stroke(); } };

// ---------- the bank ----------
// A key question is eligible once its place was visited; an idea shared by key questions is asked once
// a check. A minor question waits until the explorer did one of its `need`s.
const key = (at, o) => ({...o, at:[].concat(at), key:true});
const minor = (need, o) => ({...o, need:[].concat(need)});
const BANK = [
  // ---- the volcano rim, and the answer to its mystery on the way home ----
  key('rim', {who:'pip', q:"From the top of the volcano, what did I see way out along the coast?",
    answers:[["Volcanoes in a row", row], ["A castle in the clouds", castle], ["A giant rainbow", rainbow]],
    hint: has => has('rim:row') ? "Remember Pip's binoculars? One, two, three…" : "Pip looked out along the coast with binoculars. One, two, three…",
    yay:"Volcanoes, all in a row, like beads on a string!"}),
  key('rim', {who:'juniper', q:"Our very first question! Why are the volcanoes in a row?",
    answers:[["Where one plate dives under another", dive], ["Somebody planted them", plantedRow], ["The waves made them", wavesMade]],
    hint:"Remember the flight home? One plate dives down, and melted rock rises up along its edge.",
    yay:"They line up along the edge where one plate dives under another!"}),
  key('rim', {who:'sparks', q:"Earth's rocky crust is broken into giant pieces. What are they called?",
    answers:[["Plates", cracked], ["Pancakes", pic('warm', [pancakes, 120, 90])], ["Bricks", pic('warm', [bricks, 120, 84, 1.15])]],
    hint:"Pieces that move, crash, slide and pull apart. They share a name with what you eat dinner on!",
    yay:"Plates! And they're always moving, very, very slowly."}),
  minor('rim:pumice', {who:'juniper', q:"Toss one of my holey volcano rocks into water. What happens?",
    answers:[["It floats!", bob(true)], ["It sinks", bob(false)]],
    hint:"Remember the rock as light as a cookie?", yay:"It floats! It's full of tiny holes, from gas bubbles in the lava."}),
  minor('rim:vent', {who:'basil', q:"That rock on the rim kept hissing at me! What was coming out?",
    answers:[["Steam, from deep heat", steam], ["A grumpy snake", hiss], ["Balloon air", balloonAir]],
    hint:"Something deep under the volcano is really, really hot.", yay:"Steam! The heat is way down deep, so it can't burn us up top."}),
  minor('rim:toast', {who:'mo', q:"I toasted a marshmallow up on the volcano. What did I toast it on?",
    answers:[["The warm ground", marshmallow], ["A campfire", fireToast], ["The bus's engine", busToast]],
    hint:"Feel the ground, Mo said. It's warm, like a stove!", yay:"The warm ground! The heat comes from deep down below."}),
  minor('rim:Lemon-shaped rock', {who:'sparks', q:"The lemon-shaped rock was a volcanic bomb. How did it get its shape?",
    answers:[["It spun as it flew through the sky", lemonRock], ["Somebody carved it", carved], ["It grew on a lemon tree", lemonTree]],
    hint:"The volcano threw that blob of lava high up into the air…", yay:"It spun as it flew, and cooled into a lemon, with twisty ends!"}),
  minor('rim:Shiny black rock', {who:'pip', q:"I saw myself in that shiny black rock! What is it really?",
    answers:[["Volcano glass", glass], ["Black ice", blackIce], ["A chocolate bar", chocolate]],
    hint:"Tink, tink! It's not rock at all.", yay:"Obsidian! Lava that cooled so fast, it turned to glass."}),
  minor('rim:Smelly yellow crack', {who:'mo', q:"PEE-YEW! What did that smelly yellow crack smell like?",
    answers:[["Rotten eggs", eggs], ["Roses", roses], ["Fresh cookies", cookies]],
    hint:"Mo nearly dropped a marshmallow, it was so stinky!", yay:"Rotten eggs! That's volcano gas, carrying sulfur up from deep down."}),
  minor('rim:Golden threads', {who:'basil', q:"Those golden threads floating off the rim. What were they made of?",
    answers:[["Glass, thinner than hair", threads], ["Spider webs", web], ["Spaghetti", spaghetti]],
    hint:"Lava spray, stretched long and thin by the wind…", yay:"Glass! Pele's hair, stretched from lava spray by the wind."}),
  minor('rim:Something green', {who:'juniper', q:"What are the first living things to grow on brand-new lava rock?",
    answers:[["Lichen and little ferns", lichen], ["A tall forest", forest], ["Cactus", pic('rock', [cactus, 120, 78, 1.1])]],
    hint:"Remember the little green thing growing out of a crack?", yay:"Lichen and ferns! Bit by bit, they crumble the rock into soil."}),
  minor('rim:Stripes down the mountain', {who:'sparks', q:"Stripes of old lava ran down the mountain. Which was the oldest?",
    answers:[["The green one", flows('green')], ["The black one", flows('black')], ["The brown one", flows('brown')]],
    hint:"The oldest has had the longest time for plants to grow on it.", yay:"The green one! It's been there so long that plants grew all over it."}),
  minor(['rim:Orange box', 'slide:Little white station'], {who:'basil', q:"The line jumped when you stomped by the scientists' machine. What does a seismometer do?",
    answers:[["Feels the ground shake", wiggles], ["Tells the time", pic('warm', [clock, 120, 88, 1.3])], ["Makes popcorn", pic('warm', [popcorn, 120, 92, 1.3])]],
    hint:"Stomp, stomp! And the line went wiggle, wiggle.", yay:"It feels the ground shake, even shakes too tiny for us to feel!"}),

  // ---- the ride down, and the mantle ----
  key('mantle', {who:'sparks', q:"Earth's crust is its rocky skin. Which part of a peach is it like?",
    answers:[["The thin skin", peach('skin')], ["The big pit", peach('pit')], ["The juicy middle", peach('middle')]],
    hint:"The crust is on the very outside, and it's thin.", yay:"The skin! The crust is thin, like the skin of a peach."}),
  key('mantle', {idea:'magma', who:'mo', q:"Melted rock, still deep under the ground. What's it called?",
    answers:[["Magma", magma], ["Lava", lava]],
    hint:"Indoor Mo, outdoor Mo! Under the ground, melted rock has a different name.", yay:"Magma! Once it comes out, it gets called lava."}),
  key('mantle', {idea:'magma', who:'pip', q:"Melted rock pouring OUT of a volcano. What do we call it?",
    answers:[["Lava", lava], ["Magma", magma]],
    hint:"Indoor Mo, outdoor Mo! Out in the open air, it gets a new name.", yay:"Lava! Under the ground it's magma. Same stuff, new name."}),
  key('mantle', {who:'juniper', q:"Which layer of the Earth is much, much thicker?",
    answers:[["The mantle", layers('mantle')], ["The crust", layers('crust')]],
    hint:"Remember how far down the bus went? The crust is just a thin skin.", yay:"The mantle! It goes almost halfway to the middle of the Earth."}),
  key('mantle', {who:'basil', q:"What is the mantle made of?",
    answers:[["Solid rock that flows slowly", putty], ["A sea of lava", lavaSea], ["Bubbly hot water", hotWater]],
    hint: has => has('mantle:tap') ? "Remember when Basil's hammer went clink?" : has('mantle:putty') ? "Remember Juniper's putty?" : "It's not runny at all. It's solid, but it's slow, like putty.",
    yay:"Solid rock that flows, very, very slowly. Like putty!"}),
  key('mantle', {idea:'turnover', who:'juniper', q:"In the mantle, hot rock rises. What does cool rock do?",
    answers:[["It sinks down", flow('down')], ["It rises up too", flow('up')], ["It takes a nap", flow('still')]],
    hint: has => has('mantle:goggles') ? "Remember Pip's time goggles? Round and round it went." : "Round and round, like soup in a pot. Hot goes up, so cool goes…",
    yay:"It sinks! Hot rises, cool sinks, round and round."}),
  key('mantle', {idea:'turnover', who:'mo', q:"Deep in the mantle, what does HOT rock do?",
    answers:[["It rises up", loop('#ff8a3a', 'up')], ["It sinks down", loop('#ff8a3a', 'down')], ["It takes a nap", loop('#ff8a3a', 'still')]],
    hint:"Hot things rise. Hot air does it too!", yay:"It rises! And we rode it all the way up to the sea floor."}),
  key('mantle', {who:'sparks', q:"What makes the plates move?",
    answers:[["The mantle turning over below", ride], ["The wind blows them", windBlows], ["Giant turtles push them", turtles]],
    hint:"Remember the time goggles? Round and round, and the plates on top…", yay:"The moving mantle drags the plates along!"}),
  minor('mantle:putty', {who:'juniper', q:"My putty ball sat on the warm rock. What did it do?",
    answers:[["Slowly sagged flat", putty2('flat')], ["Stayed round", putty2('round')], ["Bounced away", bounced]],
    hint:"It's solid, but it still flows. Slowly!", yay:"It sagged flat! Mantle rock flows too, just much, much slower."}),
  minor('mantle:heat', {who:'mo', q:"How hot is the very middle of the Earth?",
    answers:[["As hot as the sun's surface", coreAs(sun)], ["As hot as an oven", coreAs(ovenPizza, 'hot', .8)], ["As cold as ice cream", coreAs(iceCream, 'warm')]],
    hint:"Hotter than a pizza oven. Much, much hotter!", yay:"As hot as the surface of the sun! Good thing we had the heat bubble."}),
  minor('mantle:Glowing crack', {who:'sparks', q:"Hot rock glows in different colours. Which colour is hottest?",
    answers:[["Yellow", swatch('#fff2b0', '#ffd36b')], ["Orange", swatch('#ffb070', '#ff7a2a')], ["Red", swatch('#e0402a', '#a0201a')]],
    hint:"Red is hot, and orange is hotter…", yay:"Yellow! Red is hot, orange is hotter, and yellow is hottest of all."}),
  minor('mantle:Green crystals', {who:'juniper', q:"The mantle is made mostly of green crystals. What are they?",
    answers:[["Olivine", crystals('#7ab84a')], ["Broccoli", pic('cave', [broccoli, 120, 86, 1.5])], ["Green jelly beans", beans]],
    hint:"When it's sparkly, people wear it as a gem, called peridot.", yay:"Olivine! A volcano even washed some into a green sand beach."}),
  minor('mantle:Twinkle in the rock', {who:'mo', q:"A diamond is made of the same stuff as what?",
    answers:[["The black in a pencil", madeOf(pencil)], ["Ice cubes", madeOf(iceCube, 2)], ["Sugar", madeOf(candy, 2)]],
    hint:"If I squeeze my pencil really, really hard…", yay:"Carbon, like a pencil! Squeezed into diamond, deep in the hot mantle."}),
  minor('mantle:Edge of the chasm', {who:'pip', q:"My shout echoed in the mantle cave! Does the real mantle have caves?",
    answers:[["No, it's solid rock", solid], ["Yes, full of bats", bats]],
    hint:"Dr. Sparks told us a secret about that cave…", yay:"No caves at all! That one was a little Wonder Bus magic."}),

  // ---- the ridge ----
  key('ridge', {who:'sparks', q:"At the ridge on the sea floor, what were the two plates doing?",
    answers:[["Pulling apart", plates('apart')], ["Crashing together", plates('crash')], ["Sliding past each other", plates('slide')]],
    hint:"Remember the glowing crack, and Mo's feet sliding apart?", yay:"Pulling apart! And new sea floor fills the gap."}),
  key('ridge', {idea:'spread', who:'mo', q:"At the ridge, the plates pull apart. What fills the gap?",
    answers:[["New sea floor", floor], ["A hole, forever", hole], ["Lost treasure", treasure]],
    hint: has => has('ridge:pillow') ? "Remember the lumpy black pillows by the crack?" : "What happened to Mo's pebble, in the time goggles?",
    yay:"New sea floor! Magma comes up, cools, and fills the gap."}),
  key('ridge', {idea:'spread', who:'basil', q:"What happened to the pebble you dropped by the crack?",
    answers:[["New rock carried it away", floor], ["The crack swallowed it", hole], ["Nothing at all", stillThere]],
    hint:"Think back to the time goggles. Where did the pebble end up?", yay:"New rock carried it away from the crack. Slowly!"}),
  key('ridge', {idea:'vent', who:'basil', q:"The water by the crack is super hot. So why doesn't it boil?",
    answers:[["The sea squeezes it too hard", squeeze], ["It's too shy", shy], ["The fish drink it first", thirsty]],
    hint:"Way down deep, there's a whole ocean of water pressing down on it.", yay:"It's squeezed so hard by all that water, it can't even boil!"}),
  key('ridge', {idea:'vent', who:'pip', q:"What made the black smoke puffing out of the sea floor?",
    answers:[["Tiny specks of minerals", minerals], ["A campfire", fireDeep], ["A sea dragon's breath", dragonDeep]],
    hint:"The hot water soaks things out of the rock, the way tea soaks up sugar…", yay:"Minerals from deep down, turning into tiny black specks in the icy sea!"}),
  minor('ridge:pillow', {who:'juniper', q:"Where did the lumpy black rocks by the crack come from?",
    answers:[["Lava from the crack", pillows], ["They fell off a boat", offBoat], ["A sea monster's lunchbox", seaLunch]],
    hint:"They were still a tiny bit warm…", yay:"Lava oozed out of the crack, and the cold water cooled it into new rock!"}),
  key('ridge', {who:'pip', q:"What happens when hot lava touches the icy sea water?",
    answers:[["It cools into black rock", pillows], ["It stays runny forever", lavaSea], ["It turns into sand", toSand]],
    hint:"Remember when the bus's fan blew the murk away?", yay:"Its skin cools fast, into a lumpy black pillow. New sea floor!"}),
  minor('ridge:stripes', {who:'pip', q:"On the sea floor's stripes, where was the OLDEST rock?",
    answers:[["Far from the crack", stripes('far')], ["Right by the crack", stripes('near')]],
    hint:"New rock comes out of the crack. The muddiest rock had the longest time.", yay:"Far away! Newest by the crack, oldest far away. Like rings in a tree."}),
  minor('ridge:smoker', {who:'basil', q:"No sunlight reaches the chimney worms. Where do they get their food?",
    answers:[["From the hot water", wormFood], ["From plants", sunflower], ["Pizza delivery", pizzaBox]],
    hint:"It's much too dark for plants down there.", yay:"From the hot water! Down there, there are no plants at all."}),
  minor('ridge:Fuzzy crabs', {who:'sparks', q:"Yeti crabs wave their fuzzy arms. What grows in all that fuzz?",
    answers:[["Tiny living things they eat", yeti(germs)], ["Flowers", yeti(tinyFlower)], ["Hair bows", yeti(bow)]],
    hint:"They grow a tiny garden. Then they eat it!", yay:"Bacteria! They farm them in their fuzz, then eat them."}),
  minor('ridge:Pink blobs', {who:'mo', q:"Sea pigs aren't pigs at all! What are they really?",
    answers:[["A kind of sea cucumber", seaPig], ["A real pig", realPig], ["Bubblegum", gum]],
    hint:"They walk on squishy tube feet, slurping up mud.", yay:"Sea cucumbers! Walking on squishy tube feet."}),
  minor('ridge:Something pale', {who:'pip', q:"The ghost octopus is so pale. Why doesn't it need any colours?",
    answers:[["It's too dark to see them", ghost], ["It's scared", octoScared], ["It's a real ghost", sheetGhost]],
    hint:"Remember how dark it was, even with our lamps on?", yay:"In the deep dark, nobody would see its colours anyway!"}),
  minor('ridge:Glowing light', {who:'sparks', q:"What is the anglerfish's glowing ball for?",
    answers:[["Luring little fish to eat", angler], ["A night-light for bed", anglerBed], ["Keeping it warm", anglerScarf]],
    hint:"Little fish swim up to see the glow, and then…", yay:"Gulp! The glow lures little fish right up to its mouth."}),
  minor('ridge:Flashing jelly', {who:'juniper', q:"Why does the jellyfish flash its lights?",
    answers:[["Like a burglar alarm", jelly], ["It's dancing", jellyDance], ["To read a book", jellyBook]],
    hint:"If something tries to eat it…", yay:"Like a burglar alarm! It calls a bigger animal to scare the attacker away."}),
  minor('ridge:Big bones', {who:'mo', q:"When a whale sinks all the way down to the sea floor, what happens?",
    answers:[["It feeds animals for years", whaleFeast], ["It swims back up", whaleUp], ["It turns into a rock", whaleRock]],
    hint:"Crabs, fish, and bone-eating worms come for a feast…", yay:"A feast! One whale can feed them for years and years."}),
  minor('talk:iceland', {who:'sparks', q:"This ridge comes up out of the sea somewhere. Where?",
    answers:[["Iceland", icelandCrack], ["The moon", moonCrack], ["Mo's backyard", backyard]],
    hint:"An icy island, where people can walk between two plates!", yay:"Iceland! People there can walk between two plates."}),

  // ---- where plates crash ----
  key('crash', {who:'juniper', q:"What happens when two plates crash together?",
    answers:[["The ground crumples into mountains", pushedUp], ["The plates melt into lava", lavaSea], ["Nothing happens", dozing]],
    hint: has => has('crash:rug') ? "Remember Juniper's picnic rug?" : "Think of the tall mountains in the valley.",
    yay:"Mountains! The ground crumples up, a tiny bit every year."}),
  minor('crash:rug', {who:'juniper', q:"Push one end of a picnic rug along the ground. What does it do?",
    answers:[["Bunches up into bumps", rug('bumps')], ["Stays flat", rug('flat')], ["Rips in half", rug('rip')]],
    hint:"Remember the stripy rock in the cliff, all bent and wavy?", yay:"Bumps! Crashing plates crumple the ground the very same way."}),
  minor(['crash:shell', 'crash:peaks'], {who:'pip', q:"I found a seashell way up on a mountain! How did it get there?",
    answers:[["Crashing plates pushed old sea floor up", pushedUp], ["A seagull dropped it", seagull], ["Mo packed it for lunch", lunchbox]],
    hint: has => has('crash:peaks') ? "Remember the pale shell layer, in the time goggles?" : "When plates crash, the ground crumples up. What was that ground, long ago?",
    yay:"The crash crumpled the old sea floor up into mountains. Shells and all!"}),
  minor('crash:pebble', {who:'basil', q:"Why are the pebbles in the mountain stream so round and smooth?",
    answers:[["The water rolled them smooth", pebbles], ["Somebody polished them", polished], ["They grew that way", pebbleSprouts]],
    hint:"Bump, roll, tumble, all the way down from the mountain…", yay:"The water tumbled them along and rubbed them smooth!"}),
  minor('talk:grow', {who:'sparks', q:"These mountains are still growing taller! How fast?",
    answers:[["Slower than fingernails grow", pic('peaks', [hand, 120, 108, 1.2])], ["As fast as a tree", growTree], ["As fast as a balloon", growBalloon]],
    hint:"Only a few millimeters a year!", yay:"A few millimeters a year. Slower than your fingernails!"}),
  minor('crash:Curly stone', {who:'pip', q:"The curly stone fossil in the mountain was an ammonite. Where did it live?",
    answers:[["In the sea", ammoSea], ["Up a tree", ammoTree], ["In the desert", ammoDesert]],
    hint:"It had arms like a squid, poking out of its shell.", yay:"In the sea! That mountain top was once sea floor."}),
  minor('crash:Ice', {who:'juniper', q:"A glacier is a giant, slow river of what?",
    answers:[["Ice", river('#d8eef8')], ["Chocolate", river('#6a3a24')], ["Lava", lava]],
    hint:"Brr! Cold!", yay:"Ice! It creeps downhill, slower than a snail, and carves out whole valleys."}),
  minor('crash:Something on the cliff', {who:'basil', q:"How does a mountain goat stand on such tiny ledges?",
    answers:[["Grippy pads on its hooves", goatGrip], ["Sticky glue", goatGlue], ["Tiny wings", goatWings]],
    hint:"Like the bottoms of your sneakers!", yay:"Soft, grippy pads under its hooves. They cling to the rock!"}),
  minor('crash:Whistle in the rocks', {who:'mo', q:"What does a marmot do all winter long?",
    answers:[["Sleeps for months", marmotSleep], ["Goes skiing", marmotSki], ["Bakes cookies", marmotBake]],
    hint:"Mo called it 'my kind of animal'!", yay:"It sleeps, for six months or more! My kind of animal."}),
  minor('crash:Fuzzy flowers', {who:'juniper', q:"Why are the little flowers up in the mountains so fuzzy?",
    answers:[["Fuzz keeps them warm", fuzzyFlowers], ["To tickle noses", sneeze], ["So bees can nap", beeNap]],
    hint:"Up high, it's cold and windy.", yay:"The fuzz is like a woolly sweater for the flower!"}),
  minor('crash:Dark gap in the rocks', {who:'pip', q:"Who made the neat six-sided crystals in the secret cave?",
    answers:[["Nobody! They grew themselves", crystals('#a07ad8')], ["A crystal wizard", wizard], ["Busy beavers", beavers]],
    hint:"Tiny bits, carried in by water, stacking up…", yay:"Nobody! The tiny bits always stack up in the same pattern, all by themselves."}),

  // ---- where plates slide ----
  key('slide', {who:'sparks', q:"At the farm with the long crack, what were the plates doing?",
    answers:[["Sliding past each other", plates('slide')], ["Crashing together", plates('crash')], ["Pulling apart", plates('apart')]],
    hint:"Remember the broken road, its two sides not lining up?", yay:"Sliding past each other! And sometimes they get stuck…"}),
  key('slide', {who:'basil', q:"Why did the ground shake at the fault?",
    answers:[["Stuck plates bent, then snapped", plates('slide')], ["A giant stomped on it", foot], ["The bus landed too hard", busBump]],
    hint: has => has('slide:quake') ? "Remember the fence that bent and bent, then broke?" : "Think of the crack across the road.",
    yay:"Stuck plates bend and bend, then SNAP! That's an earthquake."}),
  key(['slide', 'hotspot'], {who:'basil', q:"The ground starts to shake! What do you do?",
    answers:[["Drop, cover, hold on!", duck], ["Run outside", runOut], ["Stand by a window", byWindow]],
    hint: has => has('slide:quake') ? "What did the class do at the fault, when the ground shook?" : has('hotspot:swell') ? "What did the class do on the island, when the ground shook?" : "Get low, get under something strong, and hold on.",
    yay:"Drop, cover, hold on! Now I know just what to do."}),
  minor('slide:creek', {who:'juniper', q:"Why did the creek take a detour, right at the crack?",
    answers:[["The ground slid and dragged it", creek], ["A fish dug a shortcut", fishDig], ["It got lost", lostCreek]],
    hint:"Remember the leaf boat, and the time goggles?", yay:"The ground slid, a little every year, and dragged the creek along!"}),
  minor('slide:trees', {who:'pip', q:"How fast do the plates slide past each other?",
    answers:[["As fast as fingernails grow", pic('hills', [hand, 120, 104, 1.2])], ["As fast as a snail", pic('hills', [snail, 120, 112, 1.3])], ["As fast as a car", pic('hills', [car, 120, 112, 1.3])]],
    hint:"Remember the crooked row of orange trees?", yay:"About as fast as your fingernails grow. Slow, but it never stops!"}),
  minor('slide:crumbs', {who:'mo', q:"My rock was all crumbly right at the crack. What crushed it?",
    answers:[["Plates grinding past each other", halves], ["I sat on it", satOn], ["The rain", rained]],
    hint:"Two giant plates, rubbing and rubbing…", yay:"The plates grind the rock between them into powder. Scientists call it fault gouge!"}),
  minor('talk:sanAndreas', {who:'juniper', q:"There's a real fault like this one in California. What's it called?",
    answers:[["The San Andreas Fault", plates('slide')], ["The Big Wobbly", pudding], ["The Sandwich Crack", sandwich]],
    hint:"San… An…", yay:"The San Andreas Fault! It runs for more than a thousand kilometers."}),
  minor('slide:Ducks', {who:'mo', q:"Why are there little ponds in a row along the fault?",
    answers:[["The ground sank into dips", ponds], ["Somebody spilled a bucket", bucket], ["It rained lemonade", lemonade]],
    hint:"Right on the fault, the ground got stretched…", yay:"The ground sank into dips, and rain and springs filled them up!"}),
  minor('slide:Little burrows', {who:'basil', q:"How do ground squirrels scare off rattlesnakes?",
    answers:[["They wave warm tails", tailWave], ["They sing loudly", squirrelSing], ["They call a bear", callBear]],
    hint:"Rattlesnakes can sense warmth…", yay:"A hot, waving tail says: I see you, snake. Go away!"}),
  minor('slide:A sturdy house', {who:'basil', q:"What keeps a house strong when the ground shakes?",
    answers:[["Braces and bolts", braced], ["Lots of balloons", houseBalloons], ["Fresh paint", housePaint]],
    hint:"Remember the big X's on its walls?", yay:"Braces keep the walls stiff, and bolts hold it tight to its base."}),
  minor('slide:Bubbling spring', {who:'juniper', q:"Why does a spring bubble up right on the fault?",
    answers:[["Water squeezes up through cracks", spring], ["A fish is blowing bubbles", fishBubbles], ["Someone left a hose on", hose]],
    hint:"The rock along the fault is all cracked…", yay:"Water squeezes up through the cracks! Springs pop up in a line along faults."}),
  minor('slide:High rock', {who:'basil', q:"Where do earthquakes happen most?",
    answers:[["Along cracks where plates meet", plates('slide')], ["Everywhere the same", shakyGlobe], ["Only on Tuesdays", calendar]],
    hint:"Remember looking along the crack from the high rock?", yay:"Along the cracks where plates meet! Far from them, the ground hardly ever shakes."}),
  minor('slide:Orange flowers', {who:'juniper', q:"What do poppies do at night?",
    answers:[["Close their petals", poppiesShut], ["Glow in the dark", poppiesGlow], ["Sing lullabies", poppiesSing]],
    hint:"Flowers with a bedtime!", yay:"They close up at night, and open again when the sun comes back."}),
  minor('slide:trees', {who:'pip', q:"What can a red-tailed hawk spot from way up in the sky?",
    answers:[["A mouse in the grass", hawkMouse], ["Mo's missing snack", hawkSnack], ["Nothing, it's asleep", hawkNap]],
    hint:"Its eyes are super sharp.", yay:"A tiny mouse, from way up high!"}),

  // ---- the hotspot island ----
  key('hotspot', {who:'pip', q:"The island volcano was far from any plate edge. What made it?",
    answers:[["A hot plume rising from deep down", plumeUp], ["Two plates crashing", plates('crash')], ["A giant campfire", campfire]],
    hint:"Remember the skinny glowing tower we saw in the mantle?", yay:"A plume! Hot rock rising from deep, deep down, right in the middle of a plate."}),
  key('hotspot', {idea:'chain', who:'juniper', q:"In the row of islands, which one is the oldest?",
    answers:[["The far one, green and worn down", chainOf('old')], ["The new black one, smoking", chainOf('new')], ["They're all the same age", chainOf('same')]],
    hint:"New islands are black and smoking. What happens to them as they ride away?", yay:"The far one! It's had the longest time to cool, wear down and sink."}),
  key('hotspot', {idea:'chain', who:'sparks', q:"The plume stays put. So what moves, to make a row of islands?",
    answers:[["The plate slides over the plume", candle], ["The plume wiggles around", wiggly], ["The islands swim away", swimmer]],
    hint:"Remember the paper sliding over a candle?", yay:"The plate slides over it, like paper over a candle, and carries each volcano away!"}),
  key('hotspot', {who:'basil', q:"There was no plate edge at the island. So why did the ground shake?",
    answers:[["Magma squeezed in and cracked the rock", swelling], ["Two plates bumped", plates('crash')], ["A whale bumped the island", whale]],
    hint: has => has('hotspot:swell') ? "Remember the goggles, under the volcano? It swelled up like a balloon…" : "Under a volcano, magma pushes and pushes…",
    yay:"Magma squeezed in, the ground swelled up, and the rock cracked. That crack is the shake!"}),
  minor('hotspot:swell', {who:'sparks', q:"How can scientists tell that magma is moving under a volcano?",
    answers:[["The ground puffs up and sinks back", breathing], ["The volcano tells them", talking], ["They hear it snore", snoring]],
    hint:"Remember the GPS station, and the tiltmeter in the lava?", yay:"The ground puffs up and sinks back, like breathing. The GPS and the tiltmeter feel it!"}),
  minor('talk:flank', {who:'basil', q:"What else can make a volcano island shake?",
    answers:[["Its heavy side slipping toward the sea", slump], ["A whale bumping it", whale], ["Everybody jumping at once", jumping]],
    hint:"A big volcano is very, very heavy…", yay:"Its heavy side can slip toward the sea, all at once. That happened on Kīlauea!"}),
  minor('hotspot:land', {who:'juniper', q:"What happens when lava pours into the sea?",
    answers:[["It makes brand-new land", newLand], ["The sea boils away", boiling], ["The lava floats away", floating]],
    hint:"Remember the edge of the island, out where the steam was?", yay:"Brand-new land! The island grows, right where the lava cools in the sea."}),
  minor('hotspot:sand', {who:'mo', q:"How did the island's beach get its black sand?",
    answers:[["Hot lava hit the cold sea and shattered", blackSand], ["Somebody spilled pepper", pepper], ["It's burnt toast crumbs", toast]],
    hint:"Every grain was a tiny bit of shiny black glass…", yay:"The lava cooled so fast it shattered, and the waves ground it into sand. Volcano glitter!"}),
  minor('talk:plumeDeep', {who:'sparks', q:"How deep down do plumes start?",
    answers:[["Scientists are still finding out!", unknown], ["Just under the beach", shovel], ["Up in the sky", highSky]],
    hint:"Remember the mystery scientists are still arguing about?", yay:"Nobody knows for sure yet! Maybe as deep as the core. Maybe you'll find out."}),
  minor('hotspot:Green sand', {who:'juniper', q:"What makes a green sand beach green?",
    answers:[["Tiny olivine crystals", greenSand], ["Seaweed", seaweed], ["Green paint", paint]],
    hint:"The same green crystals the mantle is mostly made of…", yay:"Olivine! Heavy green crystals, left behind when the waves wash the light bits away."}),
  minor('hotspot:Ropy lava', {who:'basil', q:"Smooth, ropy lava has a Hawaiian name. What is it?",
    answers:[["Pāhoehoe", ropes], ["ʻAʻā", rubble], ["Noodle rock", noodles]],
    hint:"The rough, crunchy kind is ʻaʻā. The smooth kind is…", yay:"Pāhoehoe! And the rough, crunchy kind is ʻaʻā."}),
  minor('hotspot:Lava tube', {who:'pip', q:"How was the long cave in the lava made?",
    answers:[["Lava ran out from under a crust", tube], ["A giant worm dug it", worm], ["People built it for trains", railway]],
    hint:"The top cooled hard, and the hot lava kept running underneath…", yay:"A lava tube! The lava drained out, and left the tunnel behind."}),
  minor('hotspot:Red flowers', {who:'mo', q:"How did plants get to a brand-new island, far out in the sea?",
    answers:[["Seeds rode on wind, wings and waves", arrivals], ["Somebody planted them", planted], ["They fell from space", space]],
    hint:"Seeds that fly, ride and swim. Like a field trip!", yay:"By wind, wings and waves! Tiny seeds blow, stick to birds, and float."}),
  minor('hotspot:Waves breaking', {who:'pip', q:"Waves broke out at sea, where there was no island. What was under there?",
    answers:[["A new volcano, growing up", seamount], ["A whirlpool", whirlpool], ["A sea monster", monster]],
    hint:"It sits on the plume too, and it's still growing…", yay:"A volcano under the sea: the next island in the row, still being born!"}),
  minor('hotspot:Ring in the sea', {who:'juniper', q:"The oldest island is just a ring of reef now. What happened to its volcano?",
    answers:[["It sank, and coral kept growing up", atoll], ["Pirates took it", pirates], ["The rain melted it", rainy]],
    hint:"Coral grows in warm, sunny water, near the top of the sea…", yay:"It sank, and the coral kept building up toward the sunshine, and left a ring!"}),
];

// the trip's places in notebook order, as tectonics/index.js keeps them in shared.places
const PLACES = ['rim', 'mantle', 'ridge', 'crash', 'slide', 'hotspot'];
// a "Tell me more!" is known by what was asked
const TALKS = {iceland:"Want to hear something amazing about this crack?", grow:"Want to know which one is winning here?", sanAndreas:"Want to know where in the world a place like this is?",
  plumeDeep:"Want to hear a mystery scientists are still arguing about?", flank:"Want to know another way a volcano island can shake?"};
// a key question is three times as likely as a minor one, and a check asks three minor ones at most
const RUN = 8, KEY_WEIGHT = 3, MINORS = 3;

export const quiz = {key:'tectonicsQuiz', pool:'tectonicsFound', bank:BANK,
  // what the explorer did on a trip just finished, as keys
  found(shared, heard = new Set()){
    const keys = [];
    (shared && shared.places || []).forEach((cls, i) => { const at = PLACES[i]; if (cls && at) keys.push(at, ...cls.seen().map(n => `${at}:${n}`)); });
    for (const [k, text] of Object.entries(TALKS)) if (heard.has(text)) keys.push(`talk:${k}`);
    return keys;
  },
  // a check's questions, drawn from what was found; one played before anything was kept counts every place as visited
  questions(found, rnd = Math.random){
    const has = (s => k => s.has(k))(new Set(found && found.length ? found : PLACES));
    const pool = BANK.filter(q => q.key ? q.at.some(has) : q.need.some(has)), picked = [], ideas = new Set();
    while (picked.length < RUN && pool.length) {
      let r = rnd()*pool.reduce((n, q) => n + (q.key ? KEY_WEIGHT : 1), 0), i = 0;
      while ((r -= pool[i].key ? KEY_WEIGHT : 1) > 0 && i < pool.length - 1) i++;
      const [q] = pool.splice(i, 1);
      if (q.idea && ideas.has(q.idea) || !q.key && picked.filter(p => !p.key).length >= MINORS) continue;
      if (q.idea) ideas.add(q.idea); picked.push(q);
    }
    for (let i = picked.length - 1; i > 0; i--) { const j = Math.floor(rnd()*(i + 1)); [picked[i], picked[j]] = [picked[j], picked[i]]; }
    return picked.map(q => ({who:q.who, q:q.q, answers:q.answers, yay:q.yay, secret:!q.key, hint:typeof q.hint === 'function' ? q.hint(has) : q.hint}));
  },
};
