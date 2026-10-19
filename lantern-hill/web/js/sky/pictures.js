// Hubble's and Webb's pictures, each laid on the sky where it was taken. Switched on, every picture
// in view is outlined, and a tap shows one picture whole, alone, so a wide picture isn't buried
// under the sharp little ones taken inside it. The pictures themselves come from ESA/Hubble and
// ESA/Webb; where each lies, and what it's called, ships in web/sky/ (tools/sky_data.py).
//
// Everything here works on the screen through `project`, (ra, dec) -> [x, y] or null, so it
// follows whatever projection the star view draws with.

export const SETS = [
  {id:'hubble', name:'Hubble', color:'#ffcf73', file:'sky/hubble-pictures.json',
    images:'https://cdn.esahubble.org/archives/images/', sizes:['screen', 'large'], lenses:['sky'],
    credit:'Hubble pictures: NASA, ESA, STScI, via ESA/Hubble'},
  {id:'webb', name:'Webb', color:'#ff9a6b', file:'sky/webb-pictures.json',
    // Webb sees in infrared, so its pictures sit as happily over the infrared sky as the night sky
    images:'https://cdn.esawebb.org/archives/images/', sizes:['screen', 'publicationjpg'], lenses:['sky', 'ir'],
    credit:'Webb pictures: NASA, ESA, CSA, STScI, via ESA/Webb'}];

const R = Math.PI/180;
const unit = (ra, dec) => [Math.cos(dec*R)*Math.cos(ra*R), Math.cos(dec*R)*Math.sin(ra*R), Math.sin(dec*R)];
const apart = (a, b) => Math.acos(Math.min(1, a[0]*b[0] + a[1]*b[1] + a[2]*b[2]))/R;

// bumped whenever what's drawn would change: a list or a picture arriving, or a new one chosen
export let version = 0;
const lists = {};
export async function load(set){
  if (!lists[set.id]) {
    const raw = await fetch(set.file).then(r => r.json());
    lists[set.id] = raw.map(p => {
      const corners = [0, 2, 4, 6].map(i => unit(p.c[i], p.c[i + 1]));
      const mid = [0, 1, 2].map(k => corners.reduce((s, c) => s + c[k], 0));
      const len = Math.hypot(...mid), m = mid.map(v => v/len);
      return {...p, set, mid:m, reach:Math.max(...corners.map(c => apart(c, m)))};
    });
    version++;
  }
  return lists[set.id];
}

const corners = (p, project) => {
  const out = [];
  for (let i = 0; i < 8; i += 2) { const q = project(p.c[i], p.c[i + 1]); if (!q) return null; out.push(q); }
  return out;
};
const area = q => Math.abs((q[0][0] - q[2][0])*(q[1][1] - q[3][1]) - (q[1][0] - q[3][0])*(q[0][1] - q[2][1]))/2;
function inside(q, x, y){
  let s = 0;
  for (let i = 0; i < 4; i++) {
    const [ax, ay] = q[i], [bx, by] = q[(i + 1)%4], c = (bx - ax)*(y - ay) - (by - ay)*(x - ax);
    if (c) { if (s && Math.sign(c) !== s) return false; s = Math.sign(c); }
  }
  return true;
}

// The outlines in view, for the sets switched on, as they were last drawn: a tap is tested against
// exactly what the kid sees. A picture too small to outline is a little ring, so a wide view still
// shows where to zoom.
let shown = [];
export function outline(g, on, at, radius, project){
  shown = [];
  const here = unit(at.ra, at.dec);
  for (const set of on) for (const p of lists[set.id] || []) {
    if (apart(here, p.mid) > radius + p.reach) continue;
    const q = corners(p, project);
    if (!q) continue;
    if (Math.hypot(q[0][0] - q[2][0], q[0][1] - q[2][1]) < 10) {
      g.globalAlpha = .9; g.strokeStyle = set.color; g.lineWidth = 1.5; g.beginPath(); g.arc((q[0][0] + q[2][0])/2, (q[0][1] + q[2][1])/2, 4, 0, 7); g.stroke();
      continue;
    }
    shown.push({p, q});
    g.beginPath(); g.moveTo(...q[0]); for (let i = 1; i < 4; i++) g.lineTo(...q[i]); g.closePath();
    const mine = chosen && chosen.p === p;
    g.lineWidth = mine ? 3 : 1.5; g.strokeStyle = mine ? '#fff6dc' : set.color; g.globalAlpha = mine ? 1 : .75; g.stroke();
  }
  g.globalAlpha = 1;
}
// the pictures under a point, smallest (closest in) first
export const under = (x, y) => shown.filter(s => inside(s.q, x, y)).sort((a, b) => area(a.q) - area(b.q)).map(s => s.p);

// ---------- one picture, shown ----------
let chosen = null;
export const picked = () => chosen && chosen.p;
export function choose(p){
  if (chosen && chosen.p === p) return;
  chosen = p ? {p, img:null, size:-1} : null; version++;
  if (p) fetchSize(0);
}
function fetchSize(i){
  const c = chosen, img = new Image();
  c.size = i;
  img.onload = () => { if (chosen === c) { c.img = img; version++; } };
  img.src = `${c.p.set.images}${c.p.set.sizes[i]}/${c.p.n}.jpg`;
}
// Laid on by its corners: top-left, top-right and bottom-left fix where the picture goes and how
// it turns, which is all a picture a few degrees across needs
export function draw(g, project, dpr){
  if (!chosen || !chosen.img) return;
  const q = corners(chosen.p, project), img = chosen.img;
  if (!q) return;
  const W = img.naturalWidth, H = img.naturalHeight, [tl, tr, , bl] = q;
  // close enough that the picture is bigger on screen than it was fetched, ask for the sharper one
  if (chosen.size === 0 && Math.hypot(tr[0] - tl[0], tr[1] - tl[1])*dpr > W*1.2) fetchSize(1);
  g.save();
  g.setTransform(dpr*(tr[0] - tl[0])/W, dpr*(tr[1] - tl[1])/W, dpr*(bl[0] - tl[0])/H, dpr*(bl[1] - tl[1])/H, dpr*tl[0], dpr*tl[1]);
  g.drawImage(img, 0, 0);
  g.restore();
}
