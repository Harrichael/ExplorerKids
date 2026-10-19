// Juniper's notebook stickers, one per place: what the class found there, drawn the way a kid would
// remember it.

const ink = '#1a1320';
function sky(c, w, h, top, bottom){ const g = c.createLinearGradient(0, 0, 0, h); g.addColorStop(0, top); g.addColorStop(1, bottom); c.fillStyle = g; c.fillRect(0, 0, w, h); }
function arrow(c, x0, y0, x1, y1, col = '#ffd36b'){
  const a = Math.atan2(y1 - y0, x1 - x0); c.strokeStyle = col; c.fillStyle = col; c.lineWidth = 6; c.lineCap = 'round';
  c.beginPath(); c.moveTo(x0, y0); c.lineTo(x1, y1); c.stroke();
  c.beginPath(); c.moveTo(x1 + Math.cos(a)*6, y1 + Math.sin(a)*6); c.lineTo(x1 - Math.cos(a - .5)*16, y1 - Math.sin(a - .5)*16); c.lineTo(x1 - Math.cos(a + .5)*16, y1 - Math.sin(a + .5)*16); c.fill();
}
const cone = (c, x, base, hw, hgt, col) => { c.fillStyle = col; c.strokeStyle = ink; c.lineWidth = 3; c.beginPath(); c.moveTo(x - hw, base); c.lineTo(x - hw*.12, base - hgt); c.lineTo(x + hw*.12, base - hgt); c.lineTo(x + hw, base); c.fill(); c.stroke(); };

export const PAGES = [
  {title:'The volcano', note:'Why are the volcanoes in a row?', draw(c, w, h){
    sky(c, w, h, '#8a7ab8', '#f2b8a0'); c.fillStyle = '#3a78a8'; c.fillRect(0, h*.72, w, h);
    [[40, 34, 40], [92, 46, 62], [150, 34, 44], [205, 28, 34]].forEach(([x, hw, hg]) => cone(c, x, h*.74, hw, hg, '#5a4a62'));
    cone(c, 92, h*.74, 46, 62, '#5a4048'); c.fillStyle = '#ff8a3a'; c.fillRect(86, h*.74 - 64, 12, 8);
    c.font = '64px Caprasimo, Georgia, serif'; c.fillStyle = '#ffd36b'; c.strokeStyle = ink; c.lineWidth = 5; c.textAlign = 'center'; c.strokeText('?', 190, 70); c.fillText('?', 190, 70);
  }},
  {title:'The mantle', note:'Hot rock rises, cool rock sinks, round and round.', draw(c, w, h){
    sky(c, w, h, '#8a3424', '#ffb050'); c.fillStyle = '#8a5a3a'; c.fillRect(0, 0, w, 24); c.strokeStyle = ink; c.lineWidth = 3; c.strokeRect(-2, -2, w + 4, 26);
    c.strokeStyle = 'rgba(255,240,200,.85)'; c.lineWidth = 5; for (const cx of [65, 175]) { c.beginPath(); c.ellipse(cx, 100, 48, 46, 0, 0, Math.PI*2); c.stroke(); }
    arrow(c, 113, 150, 113, 60); arrow(c, 17, 60, 17, 140, '#7aa0e0'); arrow(c, 223, 60, 223, 140, '#7aa0e0');
  }},
  {title:'The ridge', note:'Plates pull apart, and new sea floor fills the gap.', draw(c, w, h){
    sky(c, w, h, '#1e5a8a', '#0e2a4a'); c.fillStyle = '#3a3440'; c.fillRect(0, h*.62, w, h);
    c.fillStyle = '#ff8a3a'; c.fillRect(w/2 - 8, h*.62, 16, h); arrow(c, w/2 - 24, h*.5, 30, h*.5); arrow(c, w/2 + 24, h*.5, w - 30, h*.5);
    c.fillStyle = '#d0d0d0'; c.beginPath(); c.arc(w*.2, h*.6, 9, 0, 7); c.fill(); c.stroke();
  }},
  {title:'Crash and slide', note:'Crashing plates push up mountains. Stuck plates snap: an earthquake!', draw(c, w, h){
    sky(c, w, h, '#8ab0d8', '#e8d8f0'); cone(c, 70, h*.7, 60, 90, '#6b5a52'); c.fillStyle = '#f6ecd6'; c.beginPath(); c.moveTo(62, h*.7 - 78); c.lineTo(70, h*.7 - 90); c.lineTo(78, h*.7 - 78); c.fill();
    c.fillStyle = '#4e7a4e'; c.fillRect(0, h*.7, w, h);
    c.strokeStyle = ink; c.lineWidth = 5; c.beginPath(); c.moveTo(165, h*.7); c.lineTo(158, h*.8); c.lineTo(170, h*.88); c.lineTo(162, h); c.stroke();
    c.strokeStyle = '#efe0bf'; c.lineWidth = 6; c.beginPath(); c.moveTo(130, h*.78); c.lineTo(160, h*.78); c.moveTo(166, h*.86); c.lineTo(220, h*.86); c.stroke();
  }},
];
