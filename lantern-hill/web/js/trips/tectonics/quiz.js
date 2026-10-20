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
const cone = (c, x, base, hw, hgt, col) => { c.fillStyle = col; c.strokeStyle = ink; c.lineWidth = 3; c.beginPath(); c.moveTo(x - hw, base); c.lineTo(x - hw*.12, base - hgt); c.lineTo(x + hw*.12, base - hgt); c.lineTo(x + hw, base); c.fill(); c.stroke(); };
const blob = (c, x, y, rx, ry, col, lw = 3) => { c.fillStyle = col; c.strokeStyle = ink; c.lineWidth = lw; c.beginPath(); c.ellipse(x, y, rx, ry, 0, 0, Math.PI*2); c.fill(); c.stroke(); };
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
const lunchbox = (c, w, h) => { sky(c, w, h, '#fff1d8', '#f6d8b8');
  c.fillStyle = '#c0483a'; c.strokeStyle = ink; c.lineWidth = 4; c.fillRect(w/2 - 64, 60, 128, 80); c.strokeRect(w/2 - 64, 60, 128, 80);
  c.strokeRect(w/2 - 24, 40, 48, 22); blob(c, w/2 + 30, 100, 14, 10, '#f6ecd6', 3); blob(c, w/2 - 26, 100, 20, 12, '#e8b858', 3); };

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

// ---------- more pictures ----------
const EMOJI = '"Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif';
const BG = {
  day: coast, room,
  warm: (c, w, h) => sky(c, w, h, '#fff1d8', '#f6d8b8'),
  hot: (c, w, h) => sky(c, w, h, '#8a3424', '#ffb050'),
  deep: (c, w, h) => { sky(c, w, h, '#16385e', '#081a30'); c.fillStyle = '#3a3440'; c.fillRect(0, h*.8, w, h); },
  rock: (c, w, h) => { sky(c, w, h, '#8ab0d8', '#f6cdb4'); c.fillStyle = '#4a3a40'; c.fillRect(0, h*.74, w, h); c.strokeStyle = ink; c.lineWidth = 3; c.strokeRect(-3, h*.74, w + 6, h); },
  peaks: (c, w, h) => { sky(c, w, h, '#8ab0d8', '#e8d8f0');
    for (const [x, hw, hg] of [[40, 70, 110], [130, 80, 140], [215, 60, 100]]) { cone(c, x, h, hw, hg, '#7a6a72');
      c.fillStyle = '#f6f2f0'; c.beginPath(); c.moveTo(x - hw*.12 - hw*.2, h - hg*.78); c.lineTo(x - hw*.12, h - hg); c.lineTo(x + hw*.12, h - hg); c.lineTo(x + hw*.12 + hw*.2, h - hg*.78); c.fill(); } },
  hills: (c, w, h) => { sky(c, w, h, '#9ac0e0', '#f6e0b4'); c.fillStyle = '#d8a848'; c.strokeStyle = ink; c.lineWidth = 3;
    c.beginPath(); c.moveTo(-4, h + 4); c.lineTo(-4, h*.7); c.quadraticCurveTo(w*.3, h*.48, w*.6, h*.68); c.quadraticCurveTo(w*.85, h*.82, w + 4, h*.6); c.lineTo(w + 4, h + 4); c.fill(); c.stroke(); },
};
// a backdrop with emoji on it: [emoji, x, y, size]
const pic = (bg, ...items) => (c, w, h) => { BG[bg](c, w, h);
  c.textAlign = 'center'; c.textBaseline = 'middle';
  for (const [e, x = w/2, y = h/2, s = 84] of items) { c.font = `${s}px ${EMOJI}`; c.fillText(e, x, y); } };
const dashed = (c, f) => { c.strokeStyle = '#ffd36b'; c.lineWidth = 6; c.setLineDash([10, 7]); c.beginPath(); f(); c.stroke(); c.setLineDash([]); };
const glowBlob = (c, x, y, r, inner, outer) => { const g = c.createRadialGradient(x, y, 2, x, y, r); g.addColorStop(0, inner); g.addColorStop(1, outer); c.fillStyle = g; c.strokeStyle = ink; c.lineWidth = 3; c.beginPath(); c.ellipse(x, y, r, r*.8, 0, 0, Math.PI*2); c.fill(); c.stroke(); };

// one plate diving under another, with the volcanoes lined up above where it melts
const dive = (c, w, h) => { coast(c, w, h);
  c.fillStyle = '#7a5a42'; c.strokeStyle = ink; c.lineWidth = 3; c.beginPath(); c.moveTo(110, h*.7); c.lineTo(w + 4, h*.7); c.lineTo(w + 4, h + 4); c.lineTo(160, h + 4); c.closePath(); c.fill(); c.stroke();
  c.fillStyle = '#3a3440'; c.beginPath(); c.moveTo(-4, h*.82); c.lineTo(110, h*.82); c.lineTo(190, h + 4); c.lineTo(150, h + 4); c.lineTo(100, h*.94); c.lineTo(-4, h*.94); c.closePath(); c.fill(); c.stroke();
  for (const x of [150, 184, 218]) cone(c, x, h*.71, 20, 30, '#5a4a62');
  glowBlob(c, 186, 150, 12, '#ffe08a', '#e0602a'); arrow(c, 30, h*.88, 110, h*.88, '#ffd36b'); };
// the Earth, its crust cracked into plates
const cracked = (c, w, h) => { sky(c, w, h, '#1a2a4a', '#3a4a7a'); blob(c, w/2, h/2, 66, 66, '#3a78a8', 4);
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
const marshmallow = (c, w, h) => { BG.rock(c, w, h);
  c.strokeStyle = '#ffb050'; c.lineWidth = 3; for (const x of [60, 120, 180]) { c.beginPath(); c.moveTo(x, 120); c.quadraticCurveTo(x + 8, 108, x, 96); c.quadraticCurveTo(x - 8, 84, x, 72); c.stroke(); }
  c.strokeStyle = '#8a5a3a'; c.lineWidth = 5; c.beginPath(); c.moveTo(220, 40); c.lineTo(130, 100); c.stroke();
  c.fillStyle = '#f0c070'; c.strokeStyle = ink; c.lineWidth = 3; c.fillRect(112, 96, 30, 24); c.strokeRect(112, 96, 30, 24); };
const lemonRock = (c, w, h) => { sky(c, w, h, '#8ab0d8', '#f6cdb4');
  c.strokeStyle = '#fff4ec'; c.lineWidth = 4; for (const r of [52, 66]) { c.beginPath(); c.arc(w/2, h/2, r, -.4, .9); c.stroke(); c.beginPath(); c.arc(w/2, h/2, r, Math.PI - .4, Math.PI + .9); c.stroke(); }
  c.fillStyle = '#5a3430'; c.strokeStyle = ink; c.lineWidth = 3; c.beginPath(); c.moveTo(w/2 - 54, h/2); c.quadraticCurveTo(w/2, h/2 - 40, w/2 + 54, h/2); c.quadraticCurveTo(w/2, h/2 + 40, w/2 - 54, h/2); c.fill(); c.stroke(); };
const glass = (c, w, h) => { sky(c, w, h, '#fff1d8', '#f6d8b8'); c.fillStyle = '#14101a'; c.strokeStyle = ink; c.lineWidth = 3;
  c.beginPath(); c.moveTo(70, 140); c.lineTo(96, 40); c.lineTo(150, 30); c.lineTo(180, 120); c.lineTo(130, 150); c.closePath(); c.fill(); c.stroke();
  c.strokeStyle = '#e8f0ff'; c.lineWidth = 4; c.beginPath(); c.moveTo(104, 56); c.lineTo(118, 100); c.moveTo(146, 50); c.lineTo(156, 80); c.stroke(); };
const threads = (c, w, h) => { BG.rock(c, w, h); c.strokeStyle = '#e8c050'; c.lineWidth = 2.5;
  for (let i = 0; i < 9; i++) { const x = 30 + i*22, y = 40 + (i % 3)*20; c.beginPath(); c.moveTo(x, y); c.quadraticCurveTo(x + 30, y - 20, x + 20, y + 30); c.quadraticCurveTo(x + 10, y + 60, x + 34, y + 70); c.stroke(); } };
// a slope striped with old lava flows, one ringed
const flows = which => (c, w, h) => { sky(c, w, h, '#8ab0d8', '#f6cdb4');
  const cols = {green:'#6a9a4a', brown:'#8a6a4a', black:'#1e1a22'};
  ['green', 'brown', 'black'].forEach((k, i) => { const x = 30 + i*66; c.fillStyle = cols[k]; c.strokeStyle = ink; c.lineWidth = 3; c.beginPath(); c.moveTo(x, 10); c.lineTo(x + 40, 10); c.lineTo(x + 66, h + 4); c.lineTo(x + 10, h + 4); c.closePath(); c.fill(); c.stroke();
    if (k === which) dashed(c, () => c.ellipse(x + 34, h/2, 38, 70, -.2, 0, Math.PI*2)); }); };
const wiggles = (c, w, h) => { sky(c, w, h, '#fff1d8', '#f6d8b8'); c.fillStyle = '#e0702a'; c.strokeStyle = ink; c.lineWidth = 4; c.fillRect(30, 26, 180, 118); c.strokeRect(30, 26, 180, 118);
  c.fillStyle = '#12301e'; c.fillRect(44, 40, 152, 90); c.strokeStyle = '#8cf5a8'; c.lineWidth = 3; c.beginPath();
  for (let x = 0; x <= 150; x += 5) c.lineTo(46 + x, 85 + (x > 50 && x < 110 ? (x % 10 ? -1 : 1)*(30 - Math.abs(x - 80)*.6) : (x % 10 ? -2 : 2))); c.stroke(); };
const putty2 = shape => (c, w, h) => { sky(c, w, h, '#8a3424', '#ffb050'); c.fillStyle = '#7a4a3a'; c.fillRect(0, 130, w, h);
  if (shape === 'flat') blob(c, w/2, 122, 80, 14, '#c86a3a', 4); else blob(c, w/2, 92, 40, 38, '#c86a3a', 4); };
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
const angler = (c, w, h) => { sky(c, w, h, '#0b1a30', '#04101e');
  c.strokeStyle = '#8a7a6a'; c.lineWidth = 3; c.beginPath(); c.moveTo(110, 66); c.quadraticCurveTo(120, 20, 160, 34); c.stroke();
  glowBlob(c, 164, 38, 14, '#fffbd0', '#a0f0c0');
  blob(c, 96, 100, 60, 42, '#3a3440', 4); c.fillStyle = '#f6f2f0'; for (let i = 0; i < 5; i++) { c.beginPath(); c.moveTo(126 + i*6, 108); c.lineTo(129 + i*6, 120); c.lineTo(132 + i*6, 108); c.fill(); }
  c.font = `42px ${EMOJI}`; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('🐟', 198, 92); };
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
const braced = (c, w, h) => { BG.hills(c, w, h); c.fillStyle = '#f2dcb8'; c.strokeStyle = ink; c.lineWidth = 4; c.fillRect(60, 60, 120, 80); c.strokeRect(60, 60, 120, 80);
  c.fillStyle = '#b5552f'; c.beginPath(); c.moveTo(50, 62); c.lineTo(120, 20); c.lineTo(190, 62); c.closePath(); c.fill(); c.stroke();
  c.strokeStyle = '#8a5a3a'; c.lineWidth = 6; c.beginPath(); c.moveTo(66, 66); c.lineTo(174, 134); c.moveTo(174, 66); c.lineTo(66, 134); c.stroke();
  c.fillStyle = '#5a5a6a'; for (const x of [72, 120, 168]) { c.beginPath(); c.arc(x, 144, 5, 0, 7); c.fill(); } };
const loop = (col, dir) => (c, w, h) => { flow(dir)(c, w, h); if (col) { blob(c, w/2, h/2, 34, 30, col, 4); c.fillStyle = ink; for (const dx of [-10, 10]) { c.beginPath(); c.arc(w/2 + dx, h/2 - 4, 4, 0, 7); c.fill(); } } };

// ---------- the bank ----------
// A key question is eligible once its place was visited; an idea shared by key questions is asked once
// a check. A minor question waits until the explorer did one of its `need`s.
const key = (at, o) => ({...o, at, key:true});
const minor = (need, o) => ({...o, need:[].concat(need)});
const BANK = [
  // ---- the volcano rim, and the answer to its mystery on the way home ----
  key('rim', {who:'pip', q:"From the top of the volcano, what did I see way out along the coast?",
    answers:[["Volcanoes in a row", row], ["A castle in the clouds", castle], ["A giant rainbow", rainbow]],
    hint: has => has('rim:row') ? "Remember Pip's binoculars? One, two, three…" : "Pip looked out along the coast with binoculars. One, two, three…",
    yay:"Volcanoes, all in a row, like beads on a string!"}),
  key('rim', {who:'juniper', q:"Our very first question! Why are the volcanoes in a row?",
    answers:[["Where one plate dives under another", dive], ["Somebody planted them", pic('day', ['🧑‍🌾', 80, 90, 70], ['🌱', 160, 110, 60])], ["The waves made them", pic('day', ['🌊', 80, 110, 66], ['🌊', 160, 110, 66])]],
    hint:"Remember the flight home? One plate dives down, and melted rock rises up along its edge.",
    yay:"They line up along the edge where one plate dives under another!"}),
  key('rim', {who:'sparks', q:"Earth's rocky crust is broken into giant pieces. What are they called?",
    answers:[["Plates", cracked], ["Pancakes", pic('warm', ['🥞'])], ["Bricks", pic('warm', ['🧱'])]],
    hint:"Pieces that move, crash, slide and pull apart. They share a name with what you eat dinner on!",
    yay:"Plates! And they're always moving, very, very slowly."}),
  minor('rim:pumice', {who:'juniper', q:"Toss one of my holey volcano rocks into water. What happens?",
    answers:[["It floats!", bob(true)], ["It sinks", bob(false)]],
    hint:"Remember the rock as light as a cookie?", yay:"It floats! It's full of tiny holes, from gas bubbles in the lava."}),
  minor('rim:vent', {who:'basil', q:"That rock on the rim kept hissing at me! What was coming out?",
    answers:[["Steam, from deep heat", pic('rock', ['💨'])], ["A grumpy snake", pic('rock', ['🐍'])], ["Balloon air", pic('rock', ['🎈'])]],
    hint:"Something deep under the volcano is really, really hot.", yay:"Steam! The heat is way down deep, so it can't burn us up top."}),
  minor('rim:toast', {who:'mo', q:"I toasted a marshmallow up on the volcano. What did I toast it on?",
    answers:[["The warm ground", marshmallow], ["A campfire", pic('day', ['🔥', 120, 110, 80])], ["The bus's engine", pic('day', ['🚌', 120, 110, 80])]],
    hint:"Feel the ground, Mo said. It's warm, like a stove!", yay:"The warm ground! The heat comes from deep down below."}),
  minor('rim:Lemon-shaped rock', {who:'sparks', q:"The lemon-shaped rock was a volcanic bomb. How did it get its shape?",
    answers:[["It spun as it flew through the sky", lemonRock], ["Somebody carved it", pic('warm', ['🔨'])], ["It grew on a lemon tree", pic('day', ['🍋', 80, 90, 64], ['🌳', 160, 100, 80])]],
    hint:"The volcano threw that blob of lava high up into the air…", yay:"It spun as it flew, and cooled into a lemon, with twisty ends!"}),
  minor('rim:Shiny black rock', {who:'pip', q:"I saw myself in that shiny black rock! What is it really?",
    answers:[["Volcano glass", glass], ["Black ice", pic('warm', ['🧊'])], ["A chocolate bar", pic('warm', ['🍫'])]],
    hint:"Tink, tink! It's not rock at all.", yay:"Obsidian! Lava that cooled so fast, it turned to glass."}),
  minor('rim:Smelly yellow crack', {who:'mo', q:"PEE-YEW! What did that smelly yellow crack smell like?",
    answers:[["Rotten eggs", pic('rock', ['🥚', 90, 90, 70], ['🤢', 160, 90, 60])], ["Roses", pic('rock', ['🌹'])], ["Fresh cookies", pic('rock', ['🍪'])]],
    hint:"Mo nearly dropped a marshmallow, it was so stinky!", yay:"Rotten eggs! That's volcano gas, carrying sulfur up from deep down."}),
  minor('rim:Golden threads', {who:'basil', q:"Those golden threads floating off the rim. What were they made of?",
    answers:[["Glass, thinner than hair", threads], ["Spider webs", pic('rock', ['🕸️'])], ["Spaghetti", pic('rock', ['🍝'])]],
    hint:"Lava spray, stretched long and thin by the wind…", yay:"Glass! Pele's hair, stretched from lava spray by the wind."}),
  minor('rim:Something green', {who:'juniper', q:"What are the first living things to grow on brand-new lava rock?",
    answers:[["Lichen and little ferns", pic('rock', ['🌿', 120, 100, 80])], ["A tall forest", pic('rock', ['🌲', 70, 90, 64], ['🌲', 120, 80, 72], ['🌲', 170, 90, 64])], ["Cactus", pic('rock', ['🌵'])]],
    hint:"Remember the little green thing growing out of a crack?", yay:"Lichen and ferns! Bit by bit, they crumble the rock into soil."}),
  minor('rim:Stripes down the mountain', {who:'sparks', q:"Stripes of old lava ran down the mountain. Which was the oldest?",
    answers:[["The green one", flows('green')], ["The black one", flows('black')], ["The brown one", flows('brown')]],
    hint:"The oldest has had the longest time for plants to grow on it.", yay:"The green one! It's been there so long that plants grew all over it."}),
  minor(['rim:Orange box', 'slide:Little white station'], {who:'basil', q:"The line jumped when you stomped by the scientists' machine. What does a seismometer do?",
    answers:[["Feels the ground shake", wiggles], ["Tells the time", pic('warm', ['⏰'])], ["Makes popcorn", pic('warm', ['🍿'])]],
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
    answers:[["The mantle turning over below", ride], ["The wind blows them", pic('day', ['🌬️'])], ["Giant turtles push them", pic('day', ['🐢'])]],
    hint:"Remember the time goggles? Round and round, and the plates on top…", yay:"The moving mantle drags the plates along!"}),
  minor('mantle:putty', {who:'juniper', q:"My putty ball sat on the warm rock. What did it do?",
    answers:[["Slowly sagged flat", putty2('flat')], ["Stayed round", putty2('round')], ["Bounced away", pic('hot', ['⚽'])]],
    hint:"It's solid, but it still flows. Slowly!", yay:"It sagged flat! Mantle rock flows too, just much, much slower."}),
  minor('mantle:heat', {who:'mo', q:"How hot is the very middle of the Earth?",
    answers:[["As hot as the sun's surface", pic('hot', ['☀️'])], ["As hot as an oven", pic('hot', ['🍕'])], ["As cold as ice cream", pic('warm', ['🍦'])]],
    hint:"Hotter than a pizza oven. Much, much hotter!", yay:"As hot as the surface of the sun! Good thing we had the heat bubble."}),
  minor('mantle:Glowing crack', {who:'sparks', q:"Hot rock glows in different colours. Which colour is hottest?",
    answers:[["Yellow", swatch('#fff2b0', '#ffd36b')], ["Orange", swatch('#ffb070', '#ff7a2a')], ["Red", swatch('#e0402a', '#a0201a')]],
    hint:"Red is hot, and orange is hotter…", yay:"Yellow! Red is hot, orange is hotter, and yellow is hottest of all."}),
  minor('mantle:Green crystals', {who:'juniper', q:"The mantle is made mostly of green crystals. What are they?",
    answers:[["Olivine", crystals('#7ab84a')], ["Broccoli", pic('hot', ['🥦'])], ["Green jelly beans", pic('hot', ['🫘'])]],
    hint:"When it's sparkly, people wear it as a gem, called peridot.", yay:"Olivine! A volcano even washed some into a green sand beach."}),
  minor('mantle:Twinkle in the rock', {who:'mo', q:"A diamond is made of the same stuff as what?",
    answers:[["The black in a pencil", pic('warm', ['✏️'])], ["Ice cubes", pic('warm', ['🧊'])], ["Sugar", pic('warm', ['🍬'])]],
    hint:"If I squeeze my pencil really, really hard…", yay:"Carbon, like a pencil! Squeezed into diamond, deep in the hot mantle."}),
  minor('mantle:Edge of the chasm', {who:'pip', q:"My shout echoed in the mantle cave! Does the real mantle have caves?",
    answers:[["No, it's solid rock", solid], ["Yes, full of bats", pic('hot', ['🦇'])]],
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
    answers:[["New rock carried it away", floor], ["The crack swallowed it", hole], ["Nothing at all", pic('deep', ['🪨', 120, 110, 70])]],
    hint:"Think back to the time goggles. Where did the pebble end up?", yay:"New rock carried it away from the crack. Slowly!"}),
  key('ridge', {idea:'vent', who:'basil', q:"The water by the crack is super hot. So why doesn't it boil?",
    answers:[["The sea squeezes it too hard", pic('deep', ['🗜️'])], ["It's too shy", pic('deep', ['🙈'])], ["The fish drink it first", pic('deep', ['🐟'])]],
    hint:"Way down deep, there's a whole ocean of water pressing down on it.", yay:"It's squeezed so hard by all that water, it can't even boil!"}),
  key('ridge', {idea:'vent', who:'pip', q:"What made the black smoke puffing out of the sea floor?",
    answers:[["Tiny specks of minerals", pic('deep', ['💨', 90, 90, 70], ['🪨', 160, 120, 44])], ["A campfire", pic('deep', ['🔥'])], ["A sea dragon's breath", pic('deep', ['🐉'])]],
    hint:"The hot water soaks things out of the rock, the way tea soaks up sugar…", yay:"Minerals from deep down, turning into tiny black specks in the icy sea!"}),
  minor('ridge:pillow', {who:'juniper', q:"Where did the lumpy black rocks by the crack come from?",
    answers:[["Lava from the crack", pillows], ["They fell off a boat", pic('day', ['🚢'])], ["A sea monster's lunchbox", lunchbox]],
    hint:"They were still a tiny bit warm…", yay:"Lava oozed out of the crack, and the cold water cooled it into new rock!"}),
  key('ridge', {who:'pip', q:"What happens when hot lava touches the icy sea water?",
    answers:[["It cools into black rock", pillows], ["It stays runny forever", lavaSea], ["It turns into sand", pic('day', ['🏖️'])]],
    hint:"Remember when the bus's fan blew the murk away?", yay:"Its skin cools fast, into a lumpy black pillow. New sea floor!"}),
  minor('ridge:stripes', {who:'pip', q:"On the sea floor's stripes, where was the OLDEST rock?",
    answers:[["Far from the crack", stripes('far')], ["Right by the crack", stripes('near')]],
    hint:"New rock comes out of the crack. The muddiest rock had the longest time.", yay:"Far away! Newest by the crack, oldest far away. Like rings in a tree."}),
  minor('ridge:smoker', {who:'basil', q:"No sunlight reaches the chimney worms. Where do they get their food?",
    answers:[["From the hot water", pic('deep', ['🪱', 90, 110, 60], ['💨', 150, 70, 60])], ["From plants", pic('deep', ['🌻'])], ["Pizza delivery", pic('deep', ['🍕'])]],
    hint:"It's much too dark for plants down there.", yay:"From the hot water! Down there, there are no plants at all."}),
  minor('ridge:Fuzzy crabs', {who:'sparks', q:"Yeti crabs wave their fuzzy arms. What grows in all that fuzz?",
    answers:[["Tiny living things they eat", pic('deep', ['🦀'])], ["Flowers", pic('deep', ['🌸'])], ["Hair bows", pic('deep', ['🎀'])]],
    hint:"They grow a tiny garden. Then they eat it!", yay:"Bacteria! They farm them in their fuzz, then eat them."}),
  minor('ridge:Pink blobs', {who:'mo', q:"Sea pigs aren't pigs at all! What are they really?",
    answers:[["A kind of sea cucumber", seaPig], ["A real pig", pic('deep', ['🐖'])], ["Bubblegum", pic('deep', ['🫧'])]],
    hint:"They walk on squishy tube feet, slurping up mud.", yay:"Sea cucumbers! Walking on squishy tube feet."}),
  minor('ridge:Something pale', {who:'pip', q:"The ghost octopus is so pale. Why doesn't it need any colours?",
    answers:[["It's too dark to see them", ghost], ["It's scared", pic('deep', ['😱'])], ["It's a real ghost", pic('deep', ['👻'])]],
    hint:"Remember how dark it was, even with our lamps on?", yay:"In the deep dark, nobody would see its colours anyway!"}),
  minor('ridge:Glowing light', {who:'sparks', q:"What is the anglerfish's glowing ball for?",
    answers:[["Luring little fish to eat", angler], ["A night-light for bed", pic('deep', ['🛏️'])], ["Keeping it warm", pic('deep', ['🧣'])]],
    hint:"Little fish swim up to see the glow, and then…", yay:"Gulp! The glow lures little fish right up to its mouth."}),
  minor('ridge:Flashing jelly', {who:'juniper', q:"Why does the jellyfish flash its lights?",
    answers:[["Like a burglar alarm", jelly], ["It's dancing", pic('deep', ['💃'])], ["To read a book", pic('deep', ['📖'])]],
    hint:"If something tries to eat it…", yay:"Like a burglar alarm! It calls a bigger animal to scare the attacker away."}),
  minor('ridge:Big bones', {who:'mo', q:"When a whale sinks all the way down to the sea floor, what happens?",
    answers:[["It feeds animals for years", pic('deep', ['🦴', 90, 120, 64], ['🦀', 160, 120, 50])], ["It swims back up", pic('deep', ['🐳'])], ["It turns into a rock", pic('deep', ['🪨'])]],
    hint:"Crabs, fish, and bone-eating worms come for a feast…", yay:"A feast! One whale can feed them for years and years."}),
  minor('talk:iceland', {who:'sparks', q:"This ridge comes up out of the sea somewhere. Where?",
    answers:[["Iceland", icelandCrack], ["The moon", pic('deep', ['🌙'])], ["Mo's backyard", pic('day', ['🏡', 120, 110, 80])]],
    hint:"An icy island, where people can walk between two plates!", yay:"Iceland! People there can walk between two plates."}),

  // ---- where plates crash ----
  key('crash', {who:'juniper', q:"What happens when two plates crash together?",
    answers:[["The ground crumples into mountains", pushedUp], ["The plates melt into lava", lavaSea], ["Nothing happens", pic('day', ['😴'])]],
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
    answers:[["The water rolled them smooth", pebbles], ["Somebody polished them", pic('warm', ['🧽'])], ["They grew that way", pic('warm', ['🌱'])]],
    hint:"Bump, roll, tumble, all the way down from the mountain…", yay:"The water tumbled them along and rubbed them smooth!"}),
  minor('talk:grow', {who:'sparks', q:"These mountains are still growing taller! How fast?",
    answers:[["Slower than fingernails grow", pic('peaks', ['✋', 120, 110, 70])], ["As fast as a tree", pic('peaks', ['🌳', 120, 110, 70])], ["As fast as a balloon", pic('peaks', ['🎈', 120, 100, 70])]],
    hint:"Only a few millimeters a year!", yay:"A few millimeters a year. Slower than your fingernails!"}),
  minor('crash:Curly stone', {who:'pip', q:"The curly stone fossil in the mountain was an ammonite. Where did it live?",
    answers:[["In the sea", pic('day', ['🐚', 120, 120, 70])], ["Up a tree", pic('day', ['🌳'])], ["In the desert", pic('warm', ['🏜️'])]],
    hint:"It had arms like a squid, poking out of its shell.", yay:"In the sea! That mountain top was once sea floor."}),
  minor('crash:Ice', {who:'juniper', q:"A glacier is a giant, slow river of what?",
    answers:[["Ice", pic('peaks', ['🧊', 120, 120, 70])], ["Chocolate", pic('peaks', ['🍫', 120, 120, 70])], ["Lava", lava]],
    hint:"Brr! Cold!", yay:"Ice! It creeps downhill, slower than a snail, and carves out whole valleys."}),
  minor('crash:Something on the cliff', {who:'basil', q:"How does a mountain goat stand on such tiny ledges?",
    answers:[["Grippy pads on its hooves", pic('peaks', ['🐐', 120, 110, 80])], ["Sticky glue", pic('peaks', ['🍯', 120, 110, 70])], ["Tiny wings", pic('peaks', ['🪶', 120, 110, 70])]],
    hint:"Like the bottoms of your sneakers!", yay:"Soft, grippy pads under its hooves. They cling to the rock!"}),
  minor('crash:Whistle in the rocks', {who:'mo', q:"What does a marmot do all winter long?",
    answers:[["Sleeps for months", pic('peaks', ['💤', 120, 110, 70])], ["Goes skiing", pic('peaks', ['⛷️', 120, 110, 70])], ["Bakes cookies", pic('warm', ['🍪'])]],
    hint:"Mo called it 'my kind of animal'!", yay:"It sleeps, for six months or more! My kind of animal."}),
  minor('crash:Fuzzy flowers', {who:'juniper', q:"Why are the little flowers up in the mountains so fuzzy?",
    answers:[["Fuzz keeps them warm", pic('peaks', ['🌼', 120, 120, 60])], ["To tickle noses", pic('peaks', ['🤧', 120, 110, 70])], ["So bees can nap", pic('peaks', ['🐝', 120, 110, 70])]],
    hint:"Up high, it's cold and windy.", yay:"The fuzz is like a woolly sweater for the flower!"}),
  minor('crash:Dark gap in the rocks', {who:'pip', q:"Who made the neat six-sided crystals in the secret cave?",
    answers:[["Nobody! They grew themselves", crystals('#a07ad8')], ["A crystal wizard", pic('warm', ['🧙'])], ["Busy beavers", pic('warm', ['🦫'])]],
    hint:"Tiny bits, carried in by water, stacking up…", yay:"Nobody! The tiny bits always stack up in the same pattern, all by themselves."}),

  // ---- where plates slide ----
  key('slide', {who:'sparks', q:"At the farm with the long crack, what were the plates doing?",
    answers:[["Sliding past each other", plates('slide')], ["Crashing together", plates('crash')], ["Pulling apart", plates('apart')]],
    hint:"Remember the broken road, its two sides not lining up?", yay:"Sliding past each other! And sometimes they get stuck…"}),
  key('slide', {who:'basil', q:"Why did the ground shake at the fault?",
    answers:[["Stuck plates bent, then snapped", plates('slide')], ["A giant stomped on it", pic('hills', ['🦶'])], ["The bus landed too hard", pic('hills', ['🚌'])]],
    hint: has => has('slide:quake') ? "Remember the fence you pushed and pushed?" : "Think of the crack across the road.",
    yay:"Stuck plates bend and bend, then SNAP! That's an earthquake."}),
  key('slide', {who:'basil', q:"Stuck plates snap, and the ground starts to shake! What do you do?",
    answers:[["Drop, cover, hold on!", duck], ["Run outside", runOut], ["Stand by a window", byWindow]],
    hint: has => has('slide:quake') ? "What did the class do at the fault, when the ground shook?" : "Get low, get under something strong, and hold on.",
    yay:"Drop, cover, hold on! Now I know just what to do."}),
  minor('slide:creek', {who:'juniper', q:"Why did the creek take a detour, right at the crack?",
    answers:[["The ground slid and dragged it", creek], ["A fish dug a shortcut", pic('hills', ['🐟'])], ["It got lost", pic('hills', ['❓'])]],
    hint:"Remember the leaf boat, and the time goggles?", yay:"The ground slid, a little every year, and dragged the creek along!"}),
  minor('slide:trees', {who:'pip', q:"How fast do the plates slide past each other?",
    answers:[["As fast as fingernails grow", pic('hills', ['✋', 120, 100, 70])], ["As fast as a snail", pic('hills', ['🐌', 120, 100, 70])], ["As fast as a car", pic('hills', ['🚗', 120, 100, 70])]],
    hint:"Remember the crooked row of orange trees?", yay:"About as fast as your fingernails grow. Slow, but it never stops!"}),
  minor('slide:rock', {who:'mo', q:"Somebody sliced my rock in half! When you pushed it back, what did you see?",
    answers:[["The halves fit together", halves], ["Nothing special", pic('warm', ['🤷'])], ["It fell over", pic('warm', ['🪨'])]],
    hint:"It used to be ONE rock…", yay:"One rock! The plates slid one half away, a little every year."}),
  minor('talk:sanAndreas', {who:'juniper', q:"There's a real fault like this one in California. What's it called?",
    answers:[["The San Andreas Fault", plates('slide')], ["The Big Wobbly", pic('hills', ['🍮'])], ["The Sandwich Crack", pic('hills', ['🥪'])]],
    hint:"San… An…", yay:"The San Andreas Fault! It runs for more than a thousand kilometers."}),
  minor('slide:Ducks', {who:'mo', q:"Why are there little ponds in a row along the fault?",
    answers:[["The ground sank into dips", pic('hills', ['🦆', 120, 120, 60])], ["Somebody spilled a bucket", pic('hills', ['🪣'])], ["It rained lemonade", pic('hills', ['🍋'])]],
    hint:"Right on the fault, the ground got stretched…", yay:"The ground sank into dips, and rain and springs filled them up!"}),
  minor('slide:Little burrows', {who:'basil', q:"How do ground squirrels scare off rattlesnakes?",
    answers:[["They wave warm tails", pic('hills', ['🐿️'])], ["They sing loudly", pic('hills', ['🎵'])], ["They call a bear", pic('hills', ['🐻'])]],
    hint:"Rattlesnakes can sense warmth…", yay:"A hot, waving tail says: I see you, snake. Go away!"}),
  minor('slide:A sturdy house', {who:'basil', q:"What keeps a house strong when the ground shakes?",
    answers:[["Braces and bolts", braced], ["Lots of balloons", pic('hills', ['🎈'])], ["Fresh paint", pic('hills', ['🖌️'])]],
    hint:"Remember the big X's on its walls?", yay:"Braces keep the walls stiff, and bolts hold it tight to its base."}),
  minor('slide:Orange flowers', {who:'juniper', q:"What do poppies do at night?",
    answers:[["Close their petals", pic('hills', ['🌷', 120, 110, 70])], ["Glow in the dark", pic('deep', ['✨'])], ["Sing lullabies", pic('hills', ['🎶'])]],
    hint:"Flowers with a bedtime!", yay:"They close up at night, and open again when the sun comes back."}),
  minor('slide:A bird on the old tree', {who:'pip', q:"What can a red-tailed hawk spot from way up in the sky?",
    answers:[["A mouse in the grass", pic('hills', ['🐭', 120, 120, 60])], ["Mo's missing snack", pic('hills', ['🥨'])], ["Nothing, it's asleep", pic('hills', ['😴'])]],
    hint:"Its eyes are super sharp.", yay:"A tiny mouse, from way up high!"}),
];

// the trip's places in notebook order, as tectonics/index.js keeps them in shared.places
const PLACES = ['rim', 'mantle', 'ridge', 'crash', 'slide'];
// a "Tell me more!" is known by what was asked
const TALKS = {iceland:"Want to hear something amazing about this crack?", grow:"Want to know which one is winning here?", sanAndreas:"Want to know where in the world a place like this is?"};
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
    const pool = BANK.filter(q => q.key ? has(q.at) : q.need.some(has)), picked = [], ideas = new Set();
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
