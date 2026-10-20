// Dr. Sparks's Explorer Check for the tectonics trip: what the trip taught, easiest first, each
// answer with a picture. A hint points back at what the explorer saw, so it reads differently for a
// child who found the shell on the mountain than for one who never climbed up. Played again from HQ,
// with no trip behind it, the hints fall back to the plain idea.

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

// places: the trip's places in notebook order, each one's classmates able to say what was seen there
export const quiz = {key:'tectonicsQuiz', questions: places => {
  const saw = (i, name) => !!(places && places[i]) && places[i].saw(name);
  return [
    {who:'pip', q:"From the top of the volcano, what did I see way out along the coast?",
      answers:[["Volcanoes in a row", row], ["A castle in the clouds", castle], ["A giant rainbow", rainbow]],
      hint: saw(0, 'row') ? "Remember my binoculars? One, two, three…" : "Pip looked out along the coast with binoculars. One, two, three…",
      yay:"Volcanoes, all in a row, like beads on a string!"},
    {who:'sparks', q:"Earth's crust is its rocky skin. Which part of a peach is it like?",
      answers:[["The thin skin", peach('skin')], ["The big pit", peach('pit')], ["The juicy middle", peach('middle')]],
      hint:"The crust is on the very outside, and it's thin.", yay:"The skin! The crust is thin, like the skin of a peach."},
    {who:'mo', q:"Melted rock, still deep under the ground. What's it called?",
      answers:[["Magma", magma], ["Lava", lava]],
      hint:"Indoor Mo, outdoor Mo! Under the ground, melted rock has a different name.", yay:"Magma! Once it comes out, it gets called lava."},
    {who:'basil', q:"What is the mantle made of?",
      answers:[["Solid rock that flows slowly", putty], ["A sea of lava", lavaSea], ["Bubbly hot water", hotWater]],
      hint: saw(1, 'tap') ? "Remember when Basil's hammer went clink?" : saw(1, 'putty') ? "Remember Juniper's putty?" : "It's not runny at all. It's solid, but it's slow, like putty.",
      yay:"Solid rock that flows, very, very slowly. Like putty!"},
    {who:'juniper', q:"In the mantle, hot rock rises. What does cool rock do?",
      answers:[["It sinks down", flow('down')], ["It rises up too", flow('up')], ["It takes a nap", flow('still')]],
      hint: saw(1, 'goggles') ? "Remember Pip's time goggles? Round and round it went." : "Round and round, like soup in a pot. Hot goes up, so cool goes…",
      yay:"It sinks! Hot rises, cool sinks, round and round."},
    {who:'mo', q:"At the ridge, the plates pull apart. What fills the gap?",
      answers:[["New sea floor", floor], ["A hole, forever", hole], ["Lost treasure", treasure]],
      hint: saw(2, 'pebble') ? "What happened to Mo's pebble, in the time goggles?" : saw(2, 'pillow') ? "Remember the lumpy black pillows by the crack?" : "Magma comes up into the crack, and cools into new rock.",
      yay:"New sea floor! Magma comes up, cools, and fills the gap."},
    {who:'pip', q:"I found a seashell way up on a mountain! How did it get there?",
      answers:[["Crashing plates pushed old sea floor up", pushedUp], ["A seagull dropped it", seagull], ["Mo packed it for lunch", lunchbox]],
      hint: saw(3, 'shell') ? "Remember the blue layer with the shells, in the time goggles?" : saw(3, 'rug') ? "Remember the rocks, crumpled like a pushed rug?" : "When plates crash, the ground crumples up. What was that ground, long, long ago?",
      yay:"The crash crumpled the old sea floor up into mountains. Shells and all!"},
    {who:'basil', q:"Stuck plates snap, and the ground starts to shake! What do you do?",
      answers:[["Drop, cover, hold on!", duck], ["Run outside", runOut], ["Stand by a window", byWindow]],
      hint: saw(4, 'quake') ? "What did the class do at the fault, when the ground shook?" : "Get low, get under something strong, and hold on.",
      yay:"Drop, cover, hold on! Now I can cross that off my worry list."},
  ];
}};
