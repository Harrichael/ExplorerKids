// What each sample looks like down the microscope, drawn the game's way: ink outlines, warm fills, soft
// light. Each is drawn from real micrographs (Haeckel's plates for the radiolarian and diatoms), so the
// shapes are true even when the colours are storybook. A draw gets a context centred on the eyepiece,
// its radius r, and a seeded random so a slide looks the same every time.

const ink = '#2a1828';
const TAU = Math.PI*2;
const lerp = (a, b, k) => a + (b - a)*k;

function light(c, r, inner, outer){ const g = c.createRadialGradient(-r*.15, -r*.2, 0, 0, 0, r); g.addColorStop(0, inner); g.addColorStop(1, outer); c.fillStyle = g; c.fillRect(-r, -r, r*2, r*2); }
// soft, out-of-focus specks floating above and below the focus
function haze(c, r, rnd, col, n = 14){ for (let i = 0; i < n; i++) { const x = (rnd()*2 - 1)*r, y = (rnd()*2 - 1)*r, s = r*(.03 + rnd()*.08);
  const g = c.createRadialGradient(x, y, 0, x, y, s); g.addColorStop(0, col); g.addColorStop(1, 'rgba(0,0,0,0)'); c.fillStyle = g; c.beginPath(); c.arc(x, y, s, 0, TAU); c.fill(); } }
function line(c, w = 3, col = ink){ c.strokeStyle = col; c.lineWidth = w; c.lineJoin = c.lineCap = 'round'; }
// a wobbly closed outline through n points round (x, y)
function blobPath(c, x, y, rx, ry, rnd, wob = .15, n = 9, rot = 0){
  const pts = []; for (let i = 0; i < n; i++) { const a = rot + i/n*TAU, k = 1 + (rnd()*2 - 1)*wob; pts.push([x + Math.cos(a)*rx*k, y + Math.sin(a)*ry*k]); }
  c.beginPath(); for (let i = 0; i < n; i++) { const p = pts[i], q = pts[(i + 1)%n]; const mx = (p[0] + q[0])/2, my = (p[1] + q[1])/2; i ? c.quadraticCurveTo(p[0], p[1], mx, my) : c.moveTo(mx, my); }
  const p = pts[0], q = pts[1]; c.quadraticCurveTo(p[0], p[1], (p[0] + q[0])/2, (p[1] + q[1])/2); c.closePath();
}
function shine(c, x, y, rx, ry, a = .55){ c.fillStyle = `rgba(255,255,255,${a})`; c.beginPath(); c.ellipse(x, y, rx, ry, -.6, 0, TAU); c.fill(); }
function fillInk(fill, w = 3){ return c => { c.fillStyle = fill; c.fill(); line(c, w); c.stroke(); }; }

// glass blown apart by a volcano: curved, three-pointed shards that were the walls between bubbles
function ash(c, r, rnd){
  light(c, r, '#fff6dc', '#e9cf9c'); haze(c, r, rnd, 'rgba(150,120,90,.25)');
  const shard = (x, y, s, rot) => { c.save(); c.translate(x, y); c.rotate(rot); const pts = [0, 1, 2].map(i => [Math.cos(i/3*TAU - Math.PI/2)*s, Math.sin(i/3*TAU - Math.PI/2)*s]);
    c.beginPath(); c.moveTo(...pts[0]); for (let i = 0; i < 3; i++) { const p = pts[i], q = pts[(i + 1)%3]; c.quadraticCurveTo((p[0] + q[0])*.12, (p[1] + q[1])*.12, q[0], q[1]); } c.closePath();
    c.fillStyle = 'rgba(176,214,212,.78)'; c.fill(); line(c, 3); c.stroke(); shine(c, -s*.1, -s*.35, s*.18, s*.06, .7); c.restore(); };
  // a pumice crumb, more hole than rock
  const crumb = () => blobPath(c, r*.2, r*.18, r*.36, r*.3, mulberry(11), .18, 10);
  c.save(); crumb(); c.fillStyle = '#d8ccb4'; c.fill(); c.clip();
  for (let i = 0; i < 26; i++) { const x = r*.2 + (rnd()*2 - 1)*r*.36, y = r*.18 + (rnd()*2 - 1)*r*.3, s = r*(.03 + rnd()*.06);
    c.fillStyle = '#9c8a74'; c.beginPath(); c.arc(x, y, s, 0, TAU); c.fill(); c.fillStyle = '#efe4cf'; c.beginPath(); c.arc(x + s*.2, y + s*.25, s*.7, 0, TAU); c.fill(); }
  c.restore(); crumb(); line(c, 3.5); c.stroke();
  [[-.42, -.38, .3, .3], [.15, -.6, .2, 1.4], [-.48, .38, .24, 2.2], [.62, -.18, .17, .9], [-.08, .66, .16, 2.9], [.62, .6, .14, 1.9], [-.74, -.02, .13, 4]].forEach(([x, y, s, a]) => shard(x*r, y*r, s*r, a));
}
// sulfur crystallised straight out of volcano gas: little yellow double pyramids on dark rock
function sulfur(c, r, rnd){
  light(c, r, '#7a6a64', '#3e3236');
  for (let i = 0; i < 90; i++) { c.fillStyle = rnd() < .5 ? 'rgba(255,255,255,.08)' : 'rgba(0,0,0,.18)'; c.beginPath(); c.arc((rnd()*2 - 1)*r, (rnd()*2 - 1)*r, r*(.01 + rnd()*.04), 0, TAU); c.fill(); }
  const gem = (x, y, s, rot) => { c.save(); c.translate(x, y); c.rotate(rot);
    const T = [0, -s*1.25], B = [0, s*1.25], L = [-s*.62, 0], R = [s*.62, 0], M = [s*.12, s*.1];
    const face = (a, b, col) => { c.beginPath(); c.moveTo(...a); c.lineTo(...b); c.lineTo(...M); c.closePath(); c.fillStyle = col; c.fill(); };
    face(T, L, '#ffe36a'); face(T, R, '#f2c22e'); face(B, L, '#e0a81e'); face(B, R, '#c88a12');
    c.beginPath(); c.moveTo(...T); c.lineTo(...R); c.lineTo(...B); c.lineTo(...L); c.closePath(); line(c, 3); c.stroke();
    line(c, 1.5, 'rgba(42,24,40,.55)'); c.beginPath(); [T, B, L, R].forEach(p => { c.moveTo(...p); c.lineTo(...M); }); c.stroke();
    shine(c, -s*.2, -s*.55, s*.1, s*.24, .75); c.restore(); };
  [[-.3, .05, .3, -.3], [.25, -.25, .24, .4], [.35, .35, .2, -.1], [-.5, -.45, .14, .7], [-.05, .55, .13, .2], [.62, -.02, .12, -.6], [-.68, .32, .1, .3], [.02, -.62, .1, -.2]]
    .forEach(([x, y, s, a]) => gem(x*r, y*r, s*r, a));
}
// mantle rock sliced thin as paper, between two polarising filters: each olivine grain lights up its own colour
function olivine(c, r, rnd){
  const n = 22, seeds = [], cols = ['#e04a8c', '#3cb8c8', '#f4c040', '#5a7ae0', '#8fd05a', '#ff8a4a', '#b05ad8', '#2f3a6a', '#f07ab0', '#4ad0a0'];
  for (let i = 0; i < n; i++) { const a = rnd()*TAU, d = Math.sqrt(rnd())*r*1.05; seeds.push([Math.cos(a)*d, Math.sin(a)*d, cols[i%cols.length]]); }
  const S = Math.ceil(r*2), img = c.createImageData(S, S), owner = new Int16Array(S*S), rgb = seeds.map(s => [parseInt(s[2].slice(1, 3), 16), parseInt(s[2].slice(3, 5), 16), parseInt(s[2].slice(5, 7), 16)]);
  for (let py = 0; py < S; py++) for (let px = 0; px < S; px++) { const x = px - r, y = py - r; let best = 0, bd = 1e9;
    for (let i = 0; i < n; i++) { const d = (x - seeds[i][0])**2 + (y - seeds[i][1])**2; if (d < bd) { bd = d; best = i; } } owner[py*S + px] = best; }
  for (let py = 0; py < S; py++) for (let px = 0; px < S; px++) { const o = owner[py*S + px], k = (py*S + px)*4;
    let edge = false; for (const [dx, dy] of [[2, 0], [0, 2], [-2, 0], [0, -2]]) { const qx = px + dx, qy = py + dy; if (qx >= 0 && qy >= 0 && qx < S && qy < S && owner[qy*S + qx] !== o) edge = true; }
    const [R, G, B] = rgb[o], sh = 1 + .18*Math.sin((px + py*.6)*.02 + o);
    if (edge) img.data.set([42, 24, 40, 255], k); else img.data.set([Math.min(255, R*sh), Math.min(255, G*sh), Math.min(255, B*sh), 255], k); }
  // putImageData ignores the eyepiece's clip, so it goes through a canvas of its own
  const off = document.createElement('canvas'); off.width = off.height = S; off.getContext('2d').putImageData(img, 0, 0); c.drawImage(off, -r, -r);
  // olivine breaks along curvy cracks, not neat flat faces
  line(c, 2, 'rgba(42,24,40,.6)');
  for (let i = 0; i < 26; i++) { let x = (rnd()*2 - 1)*r, y = (rnd()*2 - 1)*r, a = rnd()*TAU; c.beginPath(); c.moveTo(x, y);
    for (let j = 0; j < 4; j++) { a += (rnd() - .5)*1.2; x += Math.cos(a)*r*.07; y += Math.sin(a)*r*.07; c.lineTo(x, y); } c.stroke(); }
}
// a foram: one cell that builds itself a shell of chalk, bigger room after bigger room
function foram(c, r, rnd){
  light(c, r, '#f2fbf6', '#bfdcd4'); haze(c, r, rnd, 'rgba(90,140,140,.2)');
  const bubbleShell = (x, y, s, turns, rot) => { const ch = [];
    for (let i = 0; i < 7; i++) { const a = rot + i*1.05, d = s*(.15 + i*.1), sz = s*(.16 + i*.07); ch.push([x + Math.cos(a)*d, y + Math.sin(a)*d, sz]); }
    ch.forEach(([cx, cy, sz]) => { const g = c.createRadialGradient(cx - sz*.35, cy - sz*.35, sz*.1, cx, cy, sz); g.addColorStop(0, '#fffaf0'); g.addColorStop(1, '#e2c9a4');
      c.beginPath(); c.arc(cx, cy, sz, 0, TAU); c.fillStyle = g; c.fill(); line(c, 3); c.stroke();
      c.fillStyle = 'rgba(140,100,70,.45)'; for (let k = 0; k < 14; k++) { const a = rnd()*TAU, d = rnd()*sz*.8; c.beginPath(); c.arc(cx + Math.cos(a)*d, cy + Math.sin(a)*d, sz*.05, 0, TAU); c.fill(); } }); };
  bubbleShell(-r*.15, -r*.05, r*.55, 7, .4);
  // a flat, coiled one, seen from above
  c.save(); c.translate(r*.48, r*.42); c.rotate(.5); const sz = r*.24;
  c.beginPath(); c.arc(0, 0, sz, 0, TAU); c.fillStyle = '#f0dcb8'; c.fill(); line(c, 3); c.stroke();
  line(c, 2); c.beginPath(); for (let a = 0; a < 5*Math.PI; a += .1) { const d = sz*.95*a/(5*Math.PI); a ? c.lineTo(Math.cos(a)*d, Math.sin(a)*d) : c.moveTo(0, 0); } c.stroke();
  for (let a = 1; a < 5*Math.PI; a += .55) { const d = sz*.95*a/(5*Math.PI); c.beginPath(); c.moveTo(Math.cos(a)*d, Math.sin(a)*d); c.lineTo(Math.cos(a)*(d + sz*.19), Math.sin(a)*(d + sz*.19)); c.stroke(); }
  c.restore();
  c.save(); c.translate(-r*.55, r*.55); c.scale(.5, .5); c.translate(r*.15, r*.05); bubbleShell(-r*.15, -r*.05, r*.55, 7, 2.2); c.restore();
}
// a radiolarian: a glass skeleton like a lacy ball with spikes, after Haeckel's plates
function radiolarian(c, r, rnd){
  light(c, r, '#eef6ff', '#a8c4e0'); haze(c, r, rnd, 'rgba(80,110,160,.18)');
  const R = r*.42;
  line(c, 5); for (let i = 0; i < 16; i++) { const a = i/16*TAU + .1; c.beginPath(); c.moveTo(Math.cos(a)*R*.9, Math.sin(a)*R*.9); c.lineTo(Math.cos(a)*R*(i%2 ? 1.75 : 2.1), Math.sin(a)*R*(i%2 ? 1.75 : 2.1)); c.stroke(); }
  line(c, 2.5, '#e6f2ff'); for (let i = 0; i < 16; i++) { const a = i/16*TAU + .1; c.beginPath(); c.moveTo(Math.cos(a)*R*.9, Math.sin(a)*R*.9); c.lineTo(Math.cos(a)*R*(i%2 ? 1.72 : 2.07), Math.sin(a)*R*(i%2 ? 1.72 : 2.07)); c.stroke(); }
  const g = c.createRadialGradient(-R*.3, -R*.3, R*.1, 0, 0, R); g.addColorStop(0, 'rgba(255,255,255,.95)'); g.addColorStop(1, 'rgba(150,200,230,.85)');
  c.beginPath(); c.arc(0, 0, R, 0, TAU); c.fillStyle = g; c.fill(); line(c, 3.5); c.stroke();
  // the lattice: rings of round windows, smaller toward the rim as the ball curves away
  for (let ring = 0; ring < 5; ring++) { const d = R*ring/5.2, k = Math.cos(d/R*1.2), m = ring ? ring*6 : 1;
    for (let i = 0; i < m; i++) { const a = i/m*TAU + ring*.3; c.beginPath(); c.ellipse(Math.cos(a)*d, Math.sin(a)*d, R*.08*k + 2, R*.08 + 1, a, 0, TAU);
      c.fillStyle = 'rgba(120,170,210,.55)'; c.fill(); line(c, 2); c.stroke(); } }
  c.beginPath(); c.arc(0, 0, R*.32, 0, TAU); c.fillStyle = 'rgba(232,170,90,.55)'; c.fill();
  shine(c, -R*.45, -R*.5, R*.2, R*.08, .8);
}
// diatoms: single cells living in glass boxes; a round one patterned with rows of dots, and boat-shaped ones
function diatom(c, r, rnd){
  light(c, r, '#fbf8e6', '#d8d8a8'); haze(c, r, rnd, 'rgba(120,130,60,.2)');
  const R = r*.4; c.save(); c.translate(-r*.18, -r*.12);
  const g = c.createRadialGradient(-R*.3, -R*.3, 0, 0, 0, R); g.addColorStop(0, '#fff9e4'); g.addColorStop(1, '#d4c48a');
  c.beginPath(); c.arc(0, 0, R, 0, TAU); c.fillStyle = g; c.fill(); line(c, 3.5); c.stroke();
  c.beginPath(); c.arc(0, 0, R*.9, 0, TAU); line(c, 1.5); c.stroke();
  c.fillStyle = '#7a6a3a'; for (let i = 0; i < 40; i++) { const a = i/40*TAU; for (let d = R*.12; d < R*.86; d += R*.075) { c.beginPath(); c.arc(Math.cos(a)*d, Math.sin(a)*d, 1.2 + d/R*1.6, 0, TAU); c.fill(); } }
  c.beginPath(); c.arc(0, 0, R*.1, 0, TAU); c.fillStyle = '#fff9e4'; c.fill(); line(c, 2); c.stroke(); c.restore();
  const boat = (x, y, L, rot) => { c.save(); c.translate(x, y); c.rotate(rot);
    c.beginPath(); c.ellipse(0, 0, L, L*.24, 0, 0, TAU); c.fillStyle = '#efe0a8'; c.fill(); line(c, 3); c.stroke();
    c.fillStyle = 'rgba(176,130,40,.7)'; c.beginPath(); c.ellipse(-L*.35, 0, L*.3, L*.13, 0, 0, TAU); c.ellipse(L*.35, 0, L*.3, L*.13, 0, 0, TAU); c.fill();
    line(c, 1.5); c.beginPath(); c.moveTo(-L*.9, 0); c.lineTo(L*.9, 0); c.stroke();
    for (let k = -8; k <= 8; k++) { if (!k) continue; const xx = k/9*L*.85, hh = L*.22*Math.sqrt(1 - (xx/L)**2); c.beginPath(); c.moveTo(xx, -hh); c.lineTo(xx*.96, -L*.04); c.moveTo(xx, hh); c.lineTo(xx*.96, L*.04); c.stroke(); }
    c.beginPath(); c.arc(0, 0, L*.05, 0, TAU); c.fillStyle = '#efe0a8'; c.fill(); c.stroke(); c.restore(); };
  boat(r*.45, r*.4, r*.34, -.5); boat(-r*.42, r*.55, r*.26, .25); boat(r*.55, -r*.45, r*.2, 1.1);
}
// white threads of microbes from round a vent; the shiny dots inside are sulfur they've stored up
function microbes(c, r, rnd){
  light(c, r, '#c8d6dc', '#6a8090'); haze(c, r, rnd, 'rgba(255,255,255,.2)', 20);
  for (let i = 0; i < 11; i++) {
    let x = (rnd()*2 - 1)*r*1.1, y = -r*1.1, a = Math.PI/2 + (rnd() - .5)*1.4; const pts = [[x, y]], w = r*(.035 + rnd()*.025);
    for (let j = 0; j < 30; j++) { a += (rnd() - .5)*.35; x += Math.cos(a)*r*.08; y += Math.sin(a)*r*.08; pts.push([x, y]); }
    const path = () => { c.beginPath(); pts.forEach((p, k) => k ? c.lineTo(...p) : c.moveTo(...p)); };
    path(); line(c, w*2 + 5); c.stroke(); path(); line(c, w*2, '#f6f2e4'); c.stroke();
    for (let k = 1; k < pts.length; k++) { const [px, py] = pts[k];
      if (k%2) { c.fillStyle = 'rgba(42,24,40,.35)'; c.beginPath(); c.arc(px, py, 1.2, 0, TAU); c.fill(); }
      if (rnd() < .55) { c.fillStyle = '#ffe680'; c.beginPath(); c.arc(px + (rnd() - .5)*w, py + (rnd() - .5)*w, w*.32, 0, TAU); c.fill(); line(c, 1); c.stroke(); } }
  }
}
// bits of a sea lily's stem, turned to stone: stacked star-shaped discs
function crinoid(c, r, rnd){
  light(c, r, '#ecdcc0', '#b89a74');
  for (let i = 0; i < 160; i++) { c.fillStyle = rnd() < .5 ? 'rgba(255,255,255,.14)' : 'rgba(90,60,40,.16)'; c.beginPath(); c.arc((rnd()*2 - 1)*r, (rnd()*2 - 1)*r, r*(.005 + rnd()*.02), 0, TAU); c.fill(); }
  const star = (x, y, s, rot) => { c.save(); c.translate(x, y); c.rotate(rot);
    c.beginPath(); for (let i = 0; i <= 10; i++) { const a = i/10*TAU - Math.PI/2, d = i%2 ? s*.55 : s; c.lineTo(Math.cos(a)*d, Math.sin(a)*d); } c.closePath();
    c.fillStyle = '#e4c890'; c.fill(); line(c, 3.5); c.stroke();
    // five petals ridged like a flower, round a little hole
    for (let i = 0; i < 5; i++) { const a = i/5*TAU - Math.PI/2; c.save(); c.rotate(a); c.beginPath(); c.ellipse(s*.48, 0, s*.36, s*.15, 0, 0, TAU); c.fillStyle = '#c99a5a'; c.fill(); line(c, 1.5); c.stroke();
      for (let k = -2; k <= 2; k++) { c.beginPath(); c.moveTo(s*.2, k*s*.05); c.lineTo(s*.78, k*s*.03); c.stroke(); } c.restore(); }
    c.beginPath(); c.arc(0, 0, s*.1, 0, TAU); c.fillStyle = '#5a3a2a'; c.fill(); c.restore(); };
  star(-r*.22, -r*.18, r*.36, .1); star(r*.45, r*.3, r*.22, .7); star(-r*.48, r*.5, r*.16, -.3);
  // a piece of stem, from the side
  c.save(); c.translate(r*.42, -r*.42); c.rotate(.7);
  for (let i = -3; i <= 3; i++) { c.beginPath(); c.roundRect ? c.roundRect(i*r*.07 - r*.035, -r*.11, r*.07, r*.22, r*.02) : c.rect(i*r*.07 - r*.035, -r*.11, r*.07, r*.22); c.fillStyle = i%2 ? '#d8b47a' : '#e8cc96'; c.fill(); line(c, 2.5); c.stroke(); }
  c.restore();
}
// a nummulite, a coin-sized foram from an old sea floor now high in the mountains, cut through the middle
function nummulite(c, r, rnd){
  light(c, r, '#f4e6c6', '#c8a878');
  const R = r*.55; c.save(); c.translate(-r*.08, -r*.05);
  c.beginPath(); c.arc(0, 0, R, 0, TAU); c.fillStyle = '#ead2a0'; c.fill(); line(c, 4); c.stroke();
  const turns = 6, rad = a => R*.97*a/(turns*TAU);
  c.beginPath(); for (let a = 0; a < turns*TAU; a += .05) c.lineTo(Math.cos(a)*rad(a), Math.sin(a)*rad(a)); line(c, 3); c.stroke();
  // the walls between its rooms, curving back like a ram's horn
  line(c, 1.8); for (let a = 1.2; a < turns*TAU; a += .2 + a*.012) { const d0 = rad(a), d1 = rad(a + TAU); c.beginPath(); c.moveTo(Math.cos(a)*d0, Math.sin(a)*d0);
    c.quadraticCurveTo(Math.cos(a + .12)*(d0 + d1)/2, Math.sin(a + .12)*(d0 + d1)/2, Math.cos(a + .05)*d1, Math.sin(a + .05)*d1); c.stroke(); }
  c.fillStyle = 'rgba(160,110,60,.35)'; for (let a = 1.2; a < turns*TAU; a += .2 + a*.012) { const d = rad(a + Math.PI); c.beginPath(); c.arc(Math.cos(a + .1)*d, Math.sin(a + .1)*d, 2 + d/R*3, 0, TAU); c.fill(); }
  c.beginPath(); c.arc(0, 0, R*.06, 0, TAU); c.fillStyle = '#fff4dc'; c.fill(); line(c, 2); c.stroke(); c.restore();
  // another, cut across: a lens with its layers
  c.save(); c.translate(r*.48, r*.58); c.rotate(-.35); c.beginPath(); c.ellipse(0, 0, r*.3, r*.11, 0, 0, TAU); c.fillStyle = '#e0c48c'; c.fill(); line(c, 3); c.stroke();
  line(c, 1.5); for (let k = 1; k < 5; k++) { c.beginPath(); c.ellipse(0, 0, r*.3*k/5, r*.11*k/5, 0, 0, TAU); c.stroke(); } c.restore();
}
// snow algae: red cells living in snow, the colour that makes "watermelon snow"
function snowalgae(c, r, rnd){
  light(c, r, '#ffffff', '#cfe0f2');
  line(c, 2, 'rgba(120,160,210,.45)');
  for (let i = 0; i < 7; i++) { const x = (rnd()*2 - 1)*r, y = (rnd()*2 - 1)*r, s = r*(.12 + rnd()*.15), a0 = rnd(); c.beginPath();
    for (let k = 0; k < 6; k++) { const a = a0 + k/6*TAU; c.moveTo(x, y); c.lineTo(x + Math.cos(a)*s, y + Math.sin(a)*s);
      c.moveTo(x + Math.cos(a)*s*.55, y + Math.sin(a)*s*.55); c.lineTo(x + Math.cos(a + .5)*s*.75, y + Math.sin(a + .5)*s*.75); } c.stroke(); }
  for (let i = 0; i < 22; i++) { const a = rnd()*TAU, d = Math.sqrt(rnd())*r*.85, x = Math.cos(a)*d, y = Math.sin(a)*d, s = r*(.05 + rnd()*.06), green = rnd() < .15;
    const g = c.createRadialGradient(x - s*.3, y - s*.3, s*.1, x, y, s); g.addColorStop(0, green ? '#b8e07a' : '#ff9a9a'); g.addColorStop(1, green ? '#5a9a3a' : '#c8283c');
    c.beginPath(); c.arc(x, y, s*1.2, 0, TAU); c.fillStyle = 'rgba(255,220,220,.5)'; c.fill(); line(c, 1.5, 'rgba(42,24,40,.5)'); c.stroke();
    c.beginPath(); c.arc(x, y, s, 0, TAU); c.fillStyle = g; c.fill(); line(c, 2.5); c.stroke(); shine(c, x - s*.35, y - s*.4, s*.25, s*.12, .8); }
}
// a water flea, see-through enough to watch its heart beat and the eggs it carries
function daphnia(c, r, rnd){
  light(c, r, '#f6f8de', '#c8d8a0'); haze(c, r, rnd, 'rgba(100,140,60,.2)');
  c.save(); c.rotate(-.25); c.translate(r*.05, r*.08); c.scale(1.2, 1.2);
  // the shell, ending in a long tail spine
  c.beginPath(); c.moveTo(-r*.3, -r*.38); c.bezierCurveTo(r*.15, -r*.52, r*.48, -r*.3, r*.5, r*.02); c.lineTo(r*.86, r*.32);
  c.lineTo(r*.48, r*.16); c.bezierCurveTo(r*.36, r*.46, -r*.05, r*.5, -r*.3, r*.28); c.closePath();
  c.fillStyle = 'rgba(232,214,150,.75)'; c.fill(); line(c, 3.5); c.stroke();
  c.beginPath(); c.moveTo(-r*.3, -r*.38); c.bezierCurveTo(-r*.62, -r*.34, -r*.66, r*.04, -r*.46, r*.12); c.bezierCurveTo(-r*.4, r*.22, -r*.32, r*.26, -r*.3, r*.28);
  c.fillStyle = 'rgba(238,222,164,.85)'; c.fill(); line(c, 3.5); c.stroke();
  c.beginPath(); c.arc(-r*.48, -r*.12, r*.075, 0, TAU); c.fillStyle = '#1e1428'; c.fill(); shine(c, -r*.5, -r*.15, r*.025, r*.015, .9);
  // the gut, curling round, green with eaten algae
  c.beginPath(); c.moveTo(-r*.36, -r*.12); c.bezierCurveTo(-r*.1, -r*.28, r*.3, -r*.18, r*.36, r*.08); line(c, r*.07, '#6a8a3a'); c.stroke(); line(c, 2); c.stroke();
  c.beginPath(); c.arc(-r*.08, -r*.32, r*.07, 0, TAU); c.fillStyle = '#ff8a7a'; c.fill(); line(c, 2.5); c.stroke();
  for (const [x, y] of [[.1, .1], [.22, .2], [.3, .06], [.0, .22], [.16, .32]]) { c.beginPath(); c.arc(x*r, y*r, r*.055, 0, TAU); c.fillStyle = '#8ac860'; c.fill(); line(c, 2); c.stroke(); }
  // the big feathery arms it rows with
  c.save(); c.translate(-r*.4, -r*.32); line(c, 3.5);
  for (const [a, L] of [[-2.3, .5], [-1.8, .44]]) { const ex = Math.cos(a)*L*r, ey = Math.sin(a)*L*r; c.beginPath(); c.moveTo(0, 0); c.quadraticCurveTo(ex*.4, ey*.7, ex, ey); c.stroke();
    for (let k = 1; k < 7; k++) { const px = ex*k/7, py = ey*k/7; c.beginPath(); c.moveTo(px, py); c.lineTo(px - r*.05, py - r*.06); c.stroke(); } }
  c.restore(); c.restore();
}
// pond algae in see-through tubes, each cell with a green ribbon twisting down it
function spirogyra(c, r, rnd){
  light(c, r, '#f4faea', '#b8d8a8');
  for (const [x0, rot, w] of [[-.42, .5, .17], [.05, .3, .2], [.5, .62, .15]]) {
    c.save(); c.translate(x0*r, 0); c.rotate(rot); const W = w*r, L = r*1.6;
    c.fillStyle = 'rgba(220,240,200,.7)'; c.fillRect(-W/2, -L, W, L*2); line(c, 3); c.beginPath(); c.moveTo(-W/2, -L); c.lineTo(-W/2, L); c.moveTo(W/2, -L); c.lineTo(W/2, L); c.stroke();
    // the back half of the spiral, dim, then the front half, bright
    for (const front of [0, 1]) { c.beginPath(); let first = true;
      for (let y = -L; y < L; y += 2) { const ph = y/(W*.9)*Math.PI, s = Math.sin(ph), cz = Math.cos(ph); if ((cz > 0) !== !!front) { first = true; continue; }
        first ? c.moveTo(s*W*.42, y) : c.lineTo(s*W*.42, y); first = false; }
      line(c, W*.2, front ? '#3a9a3a' : 'rgba(80,140,70,.5)'); c.stroke(); }
    line(c, 2); for (let y = -L + W*1.8; y < L; y += W*3.3) { c.beginPath(); c.moveTo(-W/2, y); c.lineTo(W/2, y); c.stroke(); }
    c.restore(); }
}
// a rotifer: a tiny animal with two crowns of beating hairs that look like spinning wheels
function rotifer(c, r, rnd){
  light(c, r, '#fbf6e8', '#d8c8a8'); haze(c, r, rnd, 'rgba(140,110,70,.18)');
  c.save(); c.rotate(.35);
  c.beginPath(); c.moveTo(-r*.24, -r*.28); c.bezierCurveTo(-r*.34, r*.1, -r*.18, r*.35, -r*.06, r*.48); c.lineTo(-r*.05, r*.72); c.lineTo(r*.05, r*.72); c.lineTo(r*.06, r*.48);
  c.bezierCurveTo(r*.18, r*.35, r*.34, r*.1, r*.24, -r*.28); c.closePath(); c.fillStyle = 'rgba(238,220,180,.85)'; c.fill(); line(c, 3.5); c.stroke();
  line(c, 3); c.beginPath(); c.moveTo(-r*.04, r*.72); c.lineTo(-r*.08, r*.84); c.moveTo(r*.04, r*.72); c.lineTo(r*.08, r*.84); c.stroke();
  for (const y of [.55, .62]) { c.beginPath(); c.moveTo(-r*.06, y*r); c.lineTo(r*.06, y*r); line(c, 1.5); c.stroke(); }
  c.beginPath(); c.ellipse(0, r*.08, r*.13, r*.18, 0, 0, TAU); c.fillStyle = 'rgba(200,150,80,.6)'; c.fill(); line(c, 2); c.stroke();
  c.beginPath(); c.arc(0, -r*.14, r*.07, 0, TAU); c.fillStyle = '#d88a5a'; c.fill(); line(c, 2); c.stroke();
  for (const sx of [-1, 1]) { const cx = sx*r*.17, cy = -r*.34, R = r*.15;
    c.beginPath(); c.arc(cx, cy, R, 0, TAU); c.fillStyle = 'rgba(250,240,210,.9)'; c.fill(); line(c, 3); c.stroke();
    line(c, 2); for (let i = 0; i < 18; i++) { const a = i/18*TAU; c.beginPath(); c.moveTo(cx + Math.cos(a)*R, cy + Math.sin(a)*R); c.quadraticCurveTo(cx + Math.cos(a + .2)*R*1.35, cy + Math.sin(a + .2)*R*1.35, cx + Math.cos(a + .35)*R*1.45, cy + Math.sin(a + .35)*R*1.45); c.stroke(); } }
  c.beginPath(); c.arc(-r*.04, -r*.24, r*.02, 0, TAU); c.arc(r*.04, -r*.24, r*.02, 0, TAU); c.fillStyle = '#c8283c'; c.fill();
  c.restore();
}
// a water bear, from wet moss: eight stubby clawed legs, and tough enough to dry out and wake years later
function tardigrade(c, r, rnd){
  light(c, r, '#eef4d8', '#a8c088');
  c.save(); for (let i = 0; i < 5; i++) { c.save(); c.translate((rnd()*2 - 1)*r, (rnd()*2 - 1)*r); c.rotate(rnd()*TAU); c.beginPath(); c.ellipse(0, 0, r*.32, r*.1, 0, 0, TAU);
    c.fillStyle = 'rgba(110,160,70,.35)'; c.fill(); line(c, 1.5, 'rgba(60,100,40,.4)'); c.stroke(); c.restore(); } c.restore();
  c.save(); c.rotate(-.2);
  for (let i = 0; i < 4; i++) { const x = -r*.36 + i*r*.24; for (const s of [1]) { c.beginPath(); c.ellipse(x, r*.2, r*.075, r*.13, 0, 0, TAU); c.fillStyle = '#e0b880'; c.fill(); line(c, 3); c.stroke();
    line(c, 2); for (const d of [-.03, 0, .03]) { c.beginPath(); c.moveTo(x + d*r, r*.32); c.lineTo(x + d*r*1.8, r*.38); c.stroke(); } } }
  c.beginPath(); c.moveTo(-r*.58, 0); c.bezierCurveTo(-r*.58, -r*.3, r*.5, -r*.32, r*.58, -r*.04); c.bezierCurveTo(r*.62, r*.2, -r*.55, r*.26, -r*.58, 0);
  c.fillStyle = '#f0cc94'; c.fill(); line(c, 3.5); c.stroke();
  line(c, 1.5, 'rgba(42,24,40,.5)'); for (let i = 1; i < 5; i++) { const x = -r*.5 + i*r*.21; c.beginPath(); c.moveTo(x, -r*.2); c.quadraticCurveTo(x + r*.03, 0, x, r*.15); c.stroke(); }
  c.fillStyle = 'rgba(180,120,60,.35)'; for (let i = 0; i < 18; i++) { c.beginPath(); c.arc(-r*.4 + rnd()*r*.85, -r*.12 + rnd()*r*.22, r*.02, 0, TAU); c.fill(); }
  c.beginPath(); c.arc(-r*.48, -r*.08, r*.025, 0, TAU); c.fillStyle = '#1e1428'; c.fill();
  c.beginPath(); c.ellipse(-r*.585, -r*.01, r*.02, r*.035, 0, 0, TAU); c.fillStyle = '#c87a6a'; c.fill();
  shine(c, -r*.2, -r*.17, r*.12, r*.03, .5);
  c.restore();
}

// a tiny trilobite pressed into dark shale: a head shield with crescent eyes, a ribbed body in three lobes, a tail
function trilobite(c, r, rnd){
  light(c, r, '#a8a4a8', '#5a5660');
  for (let i = 0; i < 120; i++) { c.fillStyle = rnd() < .5 ? 'rgba(255,255,255,.1)' : 'rgba(20,10,30,.15)'; c.beginPath(); c.arc((rnd()*2 - 1)*r, (rnd()*2 - 1)*r, r*(.005 + rnd()*.02), 0, TAU); c.fill(); }
  line(c, 1.5, 'rgba(30,20,40,.3)'); for (let i = -4; i <= 4; i++) { c.beginPath(); c.moveTo(-r, i*r*.22 + r*.05); c.lineTo(r, i*r*.22 - r*.05); c.stroke(); }
  c.save(); c.rotate(-.2); const sh = '#d8c8a8', dk = '#a8916c';
  c.beginPath(); c.moveTo(-r*.42, -r*.3); c.quadraticCurveTo(-r*.5, -r*.66, 0, -r*.68); c.quadraticCurveTo(r*.5, -r*.66, r*.42, -r*.3);
  c.lineTo(r*.48, -r*.18); c.quadraticCurveTo(0, -r*.3, -r*.48, -r*.18); c.closePath(); c.fillStyle = sh; c.fill(); line(c, 3.5); c.stroke();
  c.beginPath(); c.ellipse(0, -r*.46, r*.11, r*.17, 0, 0, TAU); c.fillStyle = dk; c.fill(); line(c, 2.5); c.stroke();
  for (const sx of [-1, 1]) { c.beginPath(); c.arc(sx*r*.24, -r*.4, r*.07, sx > 0 ? Math.PI*.6 : -Math.PI*.4, sx > 0 ? Math.PI*1.4 : Math.PI*.4); line(c, 4, '#4a3a2a'); c.stroke(); }
  for (let i = 0; i < 9; i++) { const y = -r*.26 + i*r*.075, wd = r*(.44 - i*.025);
    c.beginPath(); c.roundRect ? c.roundRect(-wd, y, wd*2, r*.065, r*.03) : c.rect(-wd, y, wd*2, r*.065); c.fillStyle = i%2 ? sh : '#e2d4b6'; c.fill(); line(c, 2.2); c.stroke(); }
  line(c, 2.5); for (const sx of [-1, 1]) { c.beginPath(); c.moveTo(sx*r*.11, -r*.27); c.lineTo(sx*r*.09, r*.4); c.stroke(); }
  c.beginPath(); c.moveTo(-r*.24, r*.42); c.quadraticCurveTo(0, r*.4, r*.24, r*.42); c.quadraticCurveTo(r*.2, r*.62, 0, r*.64); c.quadraticCurveTo(-r*.2, r*.62, -r*.24, r*.42);
  c.fillStyle = dk; c.fill(); line(c, 3); c.stroke();
  shine(c, -r*.2, -r*.55, r*.1, r*.03, .5); c.restore();
}

// Pele's seaweed (limu o Pele): glass flakes thinner than paper, from lava bubbles bursting in the sea
function limu(c, r, rnd){
  light(c, r, '#fdf6e0', '#d8cc9c'); haze(c, r, rnd, 'rgba(110,100,60,.18)');
  const flake = (x, y, s, rot) => { c.save(); c.translate(x, y); c.rotate(rot);
    c.beginPath(); c.moveTo(-s, -s*.2); c.bezierCurveTo(-s*.6, -s*.9, s*.5, -s*.8, s, -s*.1); c.bezierCurveTo(s*.7, s*.5, s*.1, s*.3, -s*.2, s*.7); c.bezierCurveTo(-s*.6, s*.5, -s*.8, s*.3, -s, -s*.2); c.closePath();
    c.fillStyle = 'rgba(150,150,80,.45)'; c.fill(); line(c, 3); c.stroke();
    // the curve of the bubble it once was, and a fold where the film creased
    line(c, 1.5, 'rgba(42,24,40,.45)'); c.beginPath(); c.arc(s*.1, s*.9, s*.95, -2.3, -.9); c.stroke();
    c.fillStyle = 'rgba(255,250,230,.75)'; c.beginPath(); c.arc(-s*.35, -s*.1, s*.12, 0, TAU); c.fill(); line(c, 1.5); c.stroke();
    shine(c, -s*.2, -s*.45, s*.3, s*.06, .75); c.restore(); };
  [[-.25, -.2, .42, .3], [.4, .35, .3, 2.1], [.42, -.45, .22, -1], [-.5, .5, .22, 1.2]].forEach(([x, y, s, a]) => flake(x*r, y*r, s*r, a));
}
// a sea urchin's spine cut across: wedges of crystal radiating out from the middle, ring after ring
function urchin(c, r, rnd){
  light(c, r, '#fff2f4', '#e0b8c8');
  const R = r*.62;
  c.beginPath(); for (let i = 0; i < 48; i++) { const a = i/48*TAU, d = R*(i%2 ? .93 : 1); c.lineTo(Math.cos(a)*d, Math.sin(a)*d); } c.closePath();
  c.fillStyle = '#c86a9c'; c.fill(); line(c, 3.5); c.stroke();
  for (let ring = 3; ring >= 1; ring--) { const d0 = R*ring/3.3; c.beginPath(); c.arc(0, 0, d0, 0, TAU); c.fillStyle = ['', '#f4c8dc', '#e8a4c4', '#d888b4'][ring]; c.fill(); line(c, 2); c.stroke(); }
  line(c, 2); for (let i = 0; i < 24; i++) { const a = i/24*TAU; c.beginPath(); c.moveTo(Math.cos(a)*R*.16, Math.sin(a)*R*.16); c.lineTo(Math.cos(a)*R*.95, Math.sin(a)*R*.95); c.stroke(); }
  c.fillStyle = 'rgba(255,255,255,.6)'; for (let i = 0; i < 24; i++) { const a = (i + .5)/24*TAU; for (const k of [.4, .62, .84]) { c.beginPath(); c.arc(Math.cos(a)*R*k, Math.sin(a)*R*k, R*.025, 0, TAU); c.fill(); } }
  c.beginPath(); c.arc(0, 0, R*.16, 0, TAU); c.fillStyle = '#fff4f8'; c.fill(); line(c, 2.5); c.stroke();
}
// a copepod: a teardrop body, long feelers, and one red eye in the middle of its head
function copepod(c, r, rnd){
  light(c, r, '#eef8fa', '#a8d0d8'); haze(c, r, rnd, 'rgba(60,120,140,.18)');
  c.save(); c.rotate(.3);
  line(c, 3); for (const sx of [-1, 1]) { c.beginPath(); c.moveTo(sx*r*.12, -r*.42); c.quadraticCurveTo(sx*r*.55, -r*.6, sx*r*.85, -r*.25); c.stroke();
    for (let k = 1; k < 8; k++) { const u = k/8, x = sx*(r*.12 + (r*.73)*u), y = -r*.42 - Math.sin(u*Math.PI)*r*.14 + u*r*.17; c.beginPath(); c.moveTo(x, y); c.lineTo(x + sx*r*.02, y - r*.05); c.stroke(); } }
  c.beginPath(); c.moveTo(0, -r*.5); c.bezierCurveTo(r*.3, -r*.48, r*.26, r*.05, r*.06, r*.18); c.lineTo(-r*.06, r*.18); c.bezierCurveTo(-r*.26, r*.05, -r*.3, -r*.48, 0, -r*.5);
  c.fillStyle = 'rgba(236,224,190,.85)'; c.fill(); line(c, 3.5); c.stroke();
  line(c, 1.5, 'rgba(42,24,40,.5)'); for (let k = 0; k < 4; k++) { const y = -r*.28 + k*r*.1; c.beginPath(); c.moveTo(-r*.2 + k*r*.03, y); c.lineTo(r*.2 - k*r*.03, y); c.stroke(); }
  c.beginPath(); c.moveTo(-r*.05, r*.18); c.lineTo(-r*.04, r*.46); c.lineTo(r*.04, r*.46); c.lineTo(r*.05, r*.18); c.fillStyle = 'rgba(236,224,190,.85)'; c.fill(); line(c, 3); c.stroke();
  line(c, 2.5); for (const sx of [-1, 1]) { c.beginPath(); c.moveTo(sx*r*.03, r*.46); c.lineTo(sx*r*.1, r*.62); c.stroke(); }
  for (const sx of [-1, 1]) { c.beginPath(); c.ellipse(sx*r*.17, r*.32, r*.07, r*.14, -sx*.3, 0, TAU); c.fillStyle = 'rgba(120,170,90,.7)'; c.fill(); line(c, 2); c.stroke(); }
  c.beginPath(); c.arc(0, -r*.38, r*.045, 0, TAU); c.fillStyle = '#d82838'; c.fill(); line(c, 1.5); c.stroke();
  c.beginPath(); c.ellipse(0, -r*.12, r*.06, r*.16, 0, 0, TAU); c.fillStyle = 'rgba(220,150,70,.55)'; c.fill();
  c.restore();
}
// coralline algae: pink branches of stony segments, each packed with rows of tiny cells
function coralline(c, r, rnd){
  light(c, r, '#fff6ee', '#e8c8c0');
  const seg = (x, y, a, len, w, depth) => { const ex = x + Math.cos(a)*len, ey = y + Math.sin(a)*len;
    c.save(); c.translate(x, y); c.rotate(a); c.beginPath(); c.roundRect ? c.roundRect(0, -w/2, len, w, w*.45) : c.rect(0, -w/2, len, w);
    c.fillStyle = depth%2 ? '#e87a98' : '#f098b0'; c.fill(); line(c, 2.5); c.stroke();
    line(c, 1, 'rgba(42,24,40,.35)'); for (let k = w*.4; k < len - 2; k += w*.28) { c.beginPath(); c.moveTo(k, -w*.4); c.lineTo(k, w*.4); c.stroke(); } c.restore();
    if (depth < 4) { seg(ex, ey, a - .45 + rnd()*.15, len*.85, w*.88, depth + 1); if (depth < 3) seg(ex, ey, a + .4 + rnd()*.15, len*.8, w*.85, depth + 1); } };
  seg(-r*.1, r*.85, -Math.PI/2, r*.28, r*.15, 0);
  seg(r*.55, r*.8, -Math.PI/2 - .5, r*.2, r*.11, 1);
}

export const DRAW = {ash, sulfur, olivine, foram, radiolarian, diatom, microbes, crinoid, nummulite, trilobite, snowalgae, daphnia, spirogyra, rotifer, tardigrade, limu, urchin, copepod, coralline};

export function mulberry(a){ return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0)/4294967296; }; }
const seedOf = id => [...id].reduce((h, ch) => Math.imul(h ^ ch.charCodeAt(0), 16777619), 2166136261);

// the view down the eyepiece, size px across: the slide, then the dark ring of the tube round it
export function drawSlide(cv, id, size){
  cv.width = cv.height = size; const c = cv.getContext('2d'), r = size/2;
  c.save(); c.translate(r, r); c.beginPath(); c.arc(0, 0, r*.98, 0, TAU); c.clip();
  DRAW[id](c, r, mulberry(seedOf(id)));
  const v = c.createRadialGradient(0, 0, r*.62, 0, 0, r); v.addColorStop(0, 'rgba(20,10,20,0)'); v.addColorStop(.85, 'rgba(20,10,20,.35)'); v.addColorStop(1, 'rgba(20,10,20,.9)');
  c.fillStyle = v; c.fillRect(-r, -r, size, size); c.restore();
  return cv;
}
