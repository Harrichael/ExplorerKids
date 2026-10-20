// What's in a container and how it behaves: mixing, dissolving, fizzing, floating and the colors
// that come out. Plain data in and out, so the desk can ask it anything and Free Lab gets every
// combination for free.
//
// A container's contents are {l, p}: `l` is the liquid, with whatever has dissolved into it, and
// `p` is the undissolved pile of powder at the bottom. Amounts are in game millilitres (or grams).
// `t` is how hot it is in °C, room temperature when it isn't there.

export const SUB = {
  water:   {liquid:true, d:1,    col:0x6fb8e0, tint:.7, cloud:.25},
  vinegar: {liquid:true, d:1.01, col:0xf2ead0, tint:.5, acid:.25, ph:2.5},
  lemon:   {liquid:true, d:1.03, col:0xf5df5a, tint:.9, acid:.4, ph:2, cloud:.4},
  milk:    {liquid:true, d:1.03, col:0xfbf7ee, tint:0, ph:6.5, cloud:2.5, fatty:true},
  cabbage: {liquid:true, d:1.0,  col:0x6e45a8, tint:1.2, cloud:.3, indicator:true},
  soap:    {liquid:true, d:1.03, col:0x7fd08a, tint:.8, ph:10, soap:true, cloud:.3},
  oil:     {liquid:true, d:.92,  col:0xf2c84b, oil:true},
  red:     {liquid:true, d:1, col:0xe0303a, tint:22, dye:true},
  yellow:  {liquid:true, d:1, col:0xf7d23a, tint:22, dye:true},
  blue:    {liquid:true, d:1, col:0x2f6fe0, tint:22, dye:true},
  // baking soda is a buffer: past a pinch per cup it holds the water near its own pH however much goes in
  soda:    {powder:true, col:0xf6f4ee, ph:9, buffer:.01, dissolve:.8, sol:.09, mass:.6},
  salt:    {powder:true, col:0xffffff, dissolve:.04, sol:.36, mass:.7},
  sugar:   {powder:true, col:0xfbf3e0, dissolve:.03, sol:2, mass:.6},
  sand:    {powder:true, col:0xd9b67a},
  pepper:  {powder:true, col:0x3a2e26, floats:true},
  // a fizzy tablet's acid and base, let into the water as the tablet melts away
  tablet:  {solute:true, col:0xffffff}
};

export const empty = () => ({l:{}, p:{}});
export function fill(spec){ const c = empty(); for (const k in spec) add(c, k, spec[k]); return c; }
export function add(c, k, n){ if (!(n > 0)) return; const box = SUB[k].powder ? c.p : c.l; box[k] = (box[k] || 0) + n; }
export function merge(c, o){
  const a = liquidVol(c), b = liquidVol(o);
  if (c.t !== undefined || o.t !== undefined) c.t = a + b > 0 ? (temp(c)*a + temp(o)*b)/(a + b) : temp(c);
  for (const k in o.l) c.l[k] = (c.l[k] || 0) + o.l[k]; for (const k in o.p) c.p[k] = (c.p[k] || 0) + o.p[k];
}
function tidy(c){ for (const b of [c.l, c.p]) for (const k in b) if (b[k] < 1e-3) delete b[k]; }

const sum = (o, f) => { let s = 0; for (const k in o) if (!f || f(SUB[k])) s += o[k]; return s; };
export const waterVol = c => sum(c.l, s => s.liquid && !s.oil);
export const oilVol = c => c.l.oil || 0;
export const liquidVol = c => waterVol(c) + oilVol(c);
export const pileVol = c => sum(c.p);
export const amount = (c, k) => (c.l[k] || 0) + (c.p[k] || 0);
export const isEmpty = c => liquidVol(c) + pileVol(c) < .01;
// milk carries food coloring on its skin instead of mixing it in
export const milky = c => (c.l.milk || 0) > waterVol(c) * .5;

// What runs out when a container is tipped: oil floats, so it goes first, then the watery layer
// with everything dissolved in it. Powder only pours once the liquid is gone.
export function take(c, n){
  const out = empty(), oil = oilVol(c), wv = waterVol(c);
  if (oil + wv > .01) {
    const o = Math.min(oil, n); if (o > 0) { out.l.oil = o; c.l.oil = oil - o; n -= o; }
    if (n > 0 && wv > 0) { const f = Math.min(1, n/wv); for (const k in c.l) if (k !== 'oil') { const t = c.l[k]*f; out.l[k] = t; c.l[k] -= t; } }
  } else {
    const pv = pileVol(c), f = pv > 0 ? Math.min(1, n/pv) : 0;
    for (const k in c.p) { const t = c.p[k]*f; out.p[k] = t; c.p[k] -= t; }
  }
  if (c.t !== undefined) out.t = c.t;
  tidy(c); return out;
}

// One tick of chemistry. `stir` is how fast a spoon is moving through it; `contact` is how much of
// the acid and baking soda have reached each other yet (0 to 1). Returns the gas made.
export function step(c, dt, stir=0, contact=1){
  const wv = waterVol(c);
  if (wv > 0) for (const k in c.p) {
    const s = SUB[k]; if (!s.dissolve) continue;
    const room = s.sol*wv - (c.l[k] || 0); if (room <= 0) continue;
    const rate = s.dissolve + stir*2.2;
    const n = Math.min(c.p[k], room, c.p[k]*(1 - Math.exp(-rate*dt)) + rate*.4*dt);
    c.p[k] -= n; c.l[k] = (c.l[k] || 0) + n;
  }
  let gas = 0;
  // acid + baking soda: carbon dioxide. Spent acid stays behind as watery liquid.
  const soda = (c.l.soda || 0) + (wv > 0 ? c.p.soda || 0 : 0);
  let acid = 0; for (const k in c.l) acid += c.l[k]*(SUB[k].acid || 0);
  if (acid > .01 && soda > .01) {
    const r = Math.min(acid, soda, (Math.min(acid, soda)*(1 - Math.exp(-4*dt)) + .5*dt)*contact);
    for (const k in c.l) if (SUB[k].acid) { const used = c.l[k]*r/acid; c.l[k] -= used; c.l.water = (c.l.water || 0) + used; }
    const fromL = Math.min(c.l.soda || 0, r); if (fromL) c.l.soda -= fromL; if (r > fromL) c.p.soda -= r - fromL;
    gas += r*2;
  }
  if (c.l.tablet) { const r = Math.min(c.l.tablet, c.l.tablet*(1 - Math.exp(-1.4*dt)) + .2*dt); c.l.tablet -= r; gas += r*2; }
  tidy(c); return gas;
}

// Heat in watts goes into the watery layer (4.2 J per °C per millilitre). At 100 °C the rest boils
// water away as steam, 2260 J a millilitre; only plain water boils off here, and what was dissolved in
// it stays behind. Anything hotter than the room cools back toward it. Returns the water boiled.
export const ROOM = 20, BOIL = 100;
const COOL = .012;
export const temp = c => c.t === undefined ? ROOM : c.t;
export function warm(c, dt, watts){
  const wv = waterVol(c); if (!wv) { delete c.t; return 0; }
  let t = temp(c) + watts*dt/(4.2*wv) - (temp(c) - ROOM)*COOL*dt, boiled = 0;
  if (t > BOIL) { boiled = Math.min(c.l.water || 0, (t - BOIL)*4.2*wv/2260); c.l.water = (c.l.water || 0) - boiled; t = BOIL; }
  if (Math.abs(t - ROOM) < .05) delete c.t; else c.t = t;
  tidy(c); return boiled;
}

// how heavy the watery layer is for its size; floating things compare themselves to this
export function density(c){
  const wv = waterVol(c); if (!wv) return 0;
  let m = 0; for (const k in c.l) { const s = SUB[k]; m += c.l[k]*(s.liquid ? (s.oil ? 0 : s.d) : (s.mass || 0)); }
  return m/wv;
}
export const OIL_DENSITY = SUB.oil.d;

// pH from the balance of acid and base in the water, on the log scale it really is: each thing pulls
// by its share of the water toward its own pH when pure, and acid and base cancel.
export function ph(c){
  const wv = waterVol(c); if (!wv) return 7;
  let h = 0;
  for (const k in c.l) { const s = SUB[k]; if (s.ph === undefined) continue; h += Math.min(1, c.l[k]/wv/(s.buffer || 1))*(10**-s.ph - 10**(s.ph - 14)); }
  return Math.max(0, Math.min(14, -Math.log10((h + Math.sqrt(h*h + 4e-14))/2)));
}
// nothing in it is still dissolving or fizzing, so what it reads now is what it will keep reading
export function steady(c){
  const wv = waterVol(c); if (!wv) return true;
  for (const k in c.p) { const s = SUB[k]; if (s.dissolve && s.sol*wv - (c.l[k] || 0) > .3) return false; }
  let acid = 0; for (const k in c.l) acid += c.l[k]*(SUB[k].acid || 0);
  return !(acid > .01 && amount(c, 'soda') > .01);
}
// How much of a penny's dull copper oxide this scrubs off a second. Acid dissolves the oxide, slowly;
// salt in the acid makes it many times faster, because chloride grabs the copper and carries it off.
// Salt water with no acid does nothing.
export function polish(c){
  const wv = waterVol(c); if (!wv) return 0;
  const acid = Math.max(0, Math.min(1, (5.5 - ph(c))/3)), salt = Math.min(1, (c.l.salt || 0)/wv/.04);
  return acid*(1/200 + salt/7);
}
// universal indicator: red for strong acid, through orange, yellow and green at neutral, to blue and purple
export const UNIVERSAL = [0xc81e2e, 0xd8262e, 0xe23a2c, 0xee6f2a, 0xf39a2c, 0xf3c62e, 0xe2d838, 0x4fae3e, 0x2b8fa8, 0x2f6fd0, 0x3456c0, 0x4a3aa8, 0x5a32a0, 0x66308f, 0x6a2a80];
export function universal(p){ const i = Math.max(0, Math.min(13.999, p)), k = Math.floor(i); return lerpCol(UNIVERSAL[k], UNIVERSAL[k + 1], i - k); }
const CAB = [[1,0xd01f3c],[3,0xe2457f],[5,0xb04aa8],[7,0x6e45a8],[8.5,0x3d5fc4],[10,0x239a8c],[12,0x5cb83a],[13,0xc8c040]];
function cabbageColor(p){
  for (let i = 1; i < CAB.length; i++) if (p <= CAB[i][0]) { const [p0, a] = CAB[i-1], [p1, b] = CAB[i]; return lerpCol(a, b, (p - p0)/(p1 - p0)); }
  return CAB[CAB.length - 1][1];
}
export function lerpCol(a, b, t){
  const ch = s => Math.round(((a >> s) & 255)*(1 - t) + ((b >> s) & 255)*t);
  return (ch(16) << 16) | (ch(8) << 8) | ch(0);
}

// The watery layer's color and cloudiness. Colors mix like paint (absorbance adds up), so blue and
// yellow make green instead of the gray an RGB average would give. Water's own blue is only there so
// clear water shows up; real water adds no color, so any food coloring takes it over.
const absorb = (col, s) => -Math.log(Math.max(.03, ((col >> s) & 255)/255));
export function look(c){
  const wv = waterVol(c); if (!wv) return null;
  const p = c.l.cabbage ? ph(c) : 7; let ar = 0, ag = 0, ab = 0, cl = 0, dye = 0;
  for (const k in c.l) if (SUB[k].dye) dye += c.l[k]/wv*SUB[k].tint;
  for (const k in c.l) {
    const s = SUB[k]; if (!s.liquid || s.oil) continue;
    const col = s.indicator ? cabbageColor(p) : s.col, w = c.l[k]/wv*s.tint/(s.dye ? 1 : 1 + dye*6);
    ar += absorb(col, 16)*w; ag += absorb(col, 8)*w; ab += absorb(col, 0)*w; cl += c.l[k]/wv*(s.cloud || 0);
  }
  const ch = a => Math.round(255*Math.exp(-a)), dark = (ar + ag + ab)/3;
  let col = (ch(ar) << 16) | (ch(ag) << 8) | ch(ab);
  if (c.l.milk) col = lerpCol(col, SUB.milk.col, Math.min(1, c.l.milk/wv*1.4));
  return {col, op: .4 + .55*Math.min(1, cl + dark*.35 + dye*.8)};
}
export function pileColor(c){
  let w = 0, r = 0, g = 0, b = 0;
  for (const k in c.p) { const col = SUB[k].col, n = c.p[k]; r += ((col >> 16) & 255)*n; g += ((col >> 8) & 255)*n; b += (col & 255)*n; w += n; }
  return w ? (Math.round(r/w) << 16) | (Math.round(g/w) << 8) | Math.round(b/w) : 0xffffff;
}
