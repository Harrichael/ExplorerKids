// What Dr. Sparks' lab sounds like. Two kinds of sound live here.
//
// The desk's sounds come from what's happening on it, so they follow the physics: how hard a thing
// lands and what it's made of, how full a glass is getting, how fast something fizzes. Each is placed
// left or right by where it is on the mat (x across the desk, about -0.8 to 0.8).
//
// The lab's cues are music: short original phrases on bells and harp in C major pentatonic, marking the
// moments of an experiment the way a Zelda game marks a discovery. Everything is soft-edged and quiet,
// close-up and small like ASMR; nothing should sting at the volume a child plays at.

import { Sound } from '../core/sound.js';

const rnd = (a, b) => a + Math.random()*(b - a);
const pan = x => Math.max(-.8, Math.min(.8, (x || 0)*.9));
// the i-th step of C major pentatonic up from C5, so any run of steps sounds right together
const PENTA = [0, 2, 4, 7, 9];
const note = i => Sound.midi(72 + Math.floor(i/5)*12 + PENTA[(i % 5 + 5) % 5]);
// a sound that would otherwise fire every frame waits its turn, per thing that makes it
const last = new Map();
const crackle = {at:0, left:0};
function every(key, gap){ const t = Sound.now(), k = last.get(key); if (k !== undefined && t - k < gap) return false; last.set(key, t); return true; }

// ---------- things touching things, by what they're made of; k is how hard, 0 to 1 ----------
const VOICE = {
  glass(k, p){ const f = rnd(2300, 2900); Sound.tone(f, {dur:.25, vol:.045*k, attack:.001, pan:p}); Sound.tone(f*2.76, {dur:.08, vol:.016*k, attack:.001, pan:p}); Sound.ring(f, {dur:.5, vol:.01*k, attack:.002, pan:p}); },
  metal(k, p){ const f = rnd(3000, 3800); Sound.tone(f, {dur:.4, vol:.03*k, attack:.001, pan:p}); Sound.tone(f*1.52, {dur:.2, vol:.013*k, attack:.001, pan:p}); },
  clay(k, p){ Sound.tone(rnd(600, 750), {type:'triangle', dur:.07, vol:.055*k, f2:420, pan:p}); Sound.hiss({dur:.03, vol:.025*k, type:'bandpass', freq:2200, q:1.5, pan:p}); },
  plastic(k, p){ Sound.tone(rnd(900, 1200), {type:'triangle', dur:.045, vol:.04*k, f2:700, pan:p}); Sound.hiss({dur:.02, vol:.02*k, type:'highpass', freq:3500, pan:p}); },
  card(k, p){ Sound.tone(rnd(150, 190), {dur:.08, vol:.07*k, f2:110, pan:p}); Sound.hiss({dur:.05, vol:.035*k, type:'lowpass', freq:900, pan:p}); },
  wood(k, p){ Sound.tone(rnd(380, 470), {type:'triangle', dur:.06, vol:.06*k, f2:300, pan:p}); Sound.hiss({dur:.025, vol:.025*k, type:'bandpass', freq:1600, q:2, pan:p}); },
  rubber(k, p){ Sound.tone(rnd(200, 240), {dur:.12, vol:.055*k, f2:150, pan:p}); },
  stone(k, p){ Sound.tone(rnd(170, 210), {type:'triangle', dur:.06, vol:.07*k, f2:120, pan:p}); Sound.hiss({dur:.04, vol:.045*k, type:'bandpass', freq:2600, q:1.2, pan:p}); },
  food(k, p){ Sound.tone(rnd(130, 160), {dur:.09, vol:.065*k, f2:95, pan:p}); Sound.hiss({dur:.04, vol:.025*k, type:'lowpass', freq:700, pan:p}); },
  foil(k, p){ for (let i = 0; i < 5; i++) Sound.hiss({t:i*rnd(.01, .03), dur:.015, vol:.025*k, type:'highpass', freq:rnd(3000, 6500), pan:p}); },
  chalk(k, p){ Sound.tone(rnd(1300, 1600), {type:'triangle', dur:.03, vol:.03*k, pan:p}); },
  soft(k, p){ Sound.hiss({dur:.03, vol:.02*k, type:'lowpass', freq:1200, pan:p}); }
};
const voice = it => VOICE[it.def.matter] || VOICE.plastic;
// The ring of a bubble pinching off: the plink of a drop, the bloop of something going under. It
// rises in pitch as it closes, and the smaller the bubble the higher it rings (about 3.3 kHz for a
// millimetre).
function bubble(r, vol, p, t = 0){ const f = Math.max(250, Math.min(3200, 3.26/r)); Sound.tone(f, {t, dur:.1, vol, f2:f*1.7, attack:.002, pan:p}); }

export const labSound = {
  // ---------- on the desk ----------
  lift(it, x){ const p = pan(x); Sound.tone(rnd(620, 700), {type:'triangle', dur:.05, vol:.025, f2:900, pan:p}); Sound.hiss({dur:.04, vol:.012, type:'bandpass', freq:2400, q:1, pan:p}); },
  land(it, x, k){ voice(it)(Math.max(.15, Math.min(1, k)), pan(x)); },
  // something solid goes under: a bigger thing traps a bigger, lower bubble
  plop(x, size){ const p = pan(x); bubble(Math.max(.0015, size*.1), .06, p); Sound.hiss({dur:.1, vol:.03, type:'lowpass', freq:1200, pan:p}); },
  drip(x){ const p = pan(x); bubble(rnd(.0022, .003), .05, p); Sound.ring(rnd(2200, 2800), {t:.03, dur:.25, vol:.008, pan:p}); },
  // Liquid landing in a container rings at the air left above it, a pipe closed at the bottom, so the
  // note climbs as it fills (a quarter wave: 343 m/s over four times the air's height).
  fill(v, x, air){
    if (!every(v, .05)) return;
    const f = Math.max(280, Math.min(4800, 343/(4*Math.max(.018, air)))), p = pan(x);
    Sound.hiss({dur:.11, vol:.055, type:'bandpass', freq:f, q:12, attack:.025, pan:p});
    if (Math.random() < .25) bubble(rnd(.0015, .004), .025, p);
  },
  grains(v, x){ if (!every(v, .06)) return; const p = pan(x); for (let i = 0; i < 3; i++) Sound.tone(rnd(3500, 6000), {t:rnd(0, .05), type:'triangle', dur:.01, vol:.012, pan:p}); },
  pour(x, rate, powder){
    if (!every('pour', .07)) return;
    const p = pan(x);
    if (powder) { Sound.hiss({dur:.12, vol:.022, type:'highpass', freq:rnd(3000, 5000), attack:.02, pan:p}); return; }
    Sound.hiss({dur:.15, vol:.012 + Math.min(.03, rate*.00018), type:'bandpass', freq:rnd(700, 1100), q:.8, attack:.03, pan:p});
    if (Math.random() < .35) bubble(rnd(.002, .005), .02, p, rnd(0, .06));
  },
  shake(x){ const p = pan(x); for (let i = 0; i < 6; i++) Sound.tone(rnd(4000, 7000), {t:rnd(0, .07), type:'triangle', dur:.012, vol:.018, pan:p}); Sound.hiss({dur:.07, vol:.025, type:'highpass', freq:5000, pan:p}); },
  // a fizz is many tiny bubbles bursting: crackles that come thicker as it goes faster, over a soft bed
  fizz(key, x, rate, dt){
    // crackles share a budget across the desk, so a big eruption can't flood a phone with sounds
    const now = Sound.now(); if (now - crackle.at > .016) { crackle.at = now; crackle.left = 3; }
    const p = pan(x), n = Math.min(crackle.left, Math.floor(rate*dt*1.5 + Math.random())); crackle.left -= n;
    for (let i = 0; i < n; i++) Sound.hiss({t:rnd(0, dt), dur:rnd(.004, .012), vol:rnd(.01, .028)*(1 + Math.min(1, rate/80)), type:'highpass', freq:rnd(4000, 8000), pan:p});
    if (rate > 12 && every(key, .1)) Sound.hiss({dur:.22, vol:Math.min(.06, .012 + rate*.0004), type:'bandpass', freq:rnd(2500, 3500), q:.6, attack:.05, pan:p});
    if (rate > 60 && every('roar', .25)) Sound.hiss({dur:.4, vol:Math.min(.1, .02 + rate*.0004), type:'lowpass', freq:rnd(500, 700), attack:.06, pan:p});
  },
  bloop(key, x){ if (every(key, .2)) bubble(rnd(.003, .006), .02, pan(x)); },
  stir(v, x, speed){
    if (speed < .08 || !every(v, .09)) return;
    const p = pan(x);
    if (Math.random() < speed*1.5) Sound.tone(rnd(3600, 4600), {dur:.12, vol:.022, attack:.001, pan:p});
    Sound.hiss({dur:.12, vol:.016 + speed*.016, type:'lowpass', freq:1400, attack:.03, pan:p});
  },
  scoop(x){ const p = pan(x); for (let i = 0; i < 8; i++) Sound.hiss({t:i*.013 + rnd(0, .006), dur:.012, vol:.03, type:'bandpass', freq:rnd(1500, 3200), q:2, pan:p}); },
  tipOut(x){ Sound.hiss({dur:.2, vol:.035, type:'lowpass', freq:2600, f2:900, attack:.03, pan:pan(x)}); },
  swab(x){ const p = pan(x); Sound.hiss({dur:.06, vol:.022, type:'lowpass', freq:800, pan:p}); Sound.tone(520, {dur:.05, vol:.012, f2:440, pan:p}); },
  magnet(x){ const p = pan(x); Sound.tone(2100, {type:'triangle', dur:.025, vol:.04, pan:p}); VOICE.metal(.8, p); },
  // steel slid along a magnet: a fine scrape, with a faint ring that climbs as the steel turns magnetic
  stroke(key, x, k){
    if (!every(key, .14)) return;
    const p = pan(x);
    Sound.hiss({dur:.1, vol:.014, type:'bandpass', freq:rnd(5000, 6500), q:3, attack:.02, pan:p});
    if (k > .04) Sound.ring(note(Math.round(k*9) + 3), {type:'triangle', dur:.25, vol:.006 + k*.01, attack:.004, pan:p});
  },
  // two magnets meeting pole to pole: a hard little clack, felt more than heard
  snap(x){ const p = pan(x); VOICE.metal(1, p); Sound.tone(rnd(160, 190), {type:'triangle', dur:.05, vol:.06, f2:110, pan:p}); },
  // a boat going under: one big gulp of air let go, and a gurgle after it
  sink(x){ const p = pan(x); bubble(.007, .07, p); bubble(.004, .04, p, .12); bubble(.0028, .03, p, .22); Sound.hiss({t:.05, dur:.5, vol:.04, type:'lowpass', freq:700, f2:300, attack:.05, pan:p}); },
  // a burner's knob: a click, and the soft whump of the flame catching; off, just the click and a sigh
  ignite(x, on){
    const p = pan(x); Sound.tone(rnd(1800, 2100), {type:'triangle', dur:.02, vol:.03, pan:p});
    if (on) { Sound.hiss({t:.05, dur:.3, vol:.05, type:'lowpass', freq:500, f2:1400, attack:.02, pan:p}); Sound.tone(90, {t:.05, dur:.25, vol:.05, f2:140, pan:p}); }
    else Sound.hiss({t:.03, dur:.2, vol:.02, type:'lowpass', freq:900, f2:300, pan:p});
  },
  // a lit flame's low, steady roar, kept very soft
  burn(key, x){ if (every(key, .45)) Sound.hiss({dur:.55, vol:.014, type:'lowpass', freq:rnd(320, 420), attack:.15, pan:pan(x)}); },
  // water at a rolling boil: big soft bubbles bursting at the top
  boil(key, x, rate){ if (!every(key, .09)) return; const p = pan(x); bubble(rnd(.004, .009), .025 + Math.min(.02, rate*.01), p); if (Math.random() < .5) bubble(rnd(.002, .004), .015, p, rnd(.02, .06)); },
  // steam forced out of a nozzle: a thin hiss, louder as it comes faster
  hiss(key, x, rate){ if (every(key, .12)) Sound.hiss({dur:.18, vol:Math.min(.05, .008 + rate*.00002), type:'bandpass', freq:rnd(5200, 6200), q:1.4, attack:.03, pan:pan(x)}); },
  // a spinning paddle wheel: a soft flutter that climbs with its speed
  whirr(key, x, spin){ if (every(key, .15)) Sound.tone(120 + spin*14, {type:'triangle', dur:.16, vol:Math.min(.025, .004 + spin*.0012), vib:[spin*1.27, 30], cut:900, pan:pan(x)}); },
  // paper drinking up a drop: a soft wet touch
  dip(x){ const p = pan(x); Sound.hiss({dur:.09, vol:.022, type:'lowpass', freq:900, attack:.01, pan:p}); bubble(rnd(.0025, .0035), .012, p, .03); },
  // the last of the dull oxide lets go and the copper gleams
  shine(x){ const p = pan(x); Sound.ring(note(12), {dur:.7, vol:.016, attack:.003, pan:p}); Sound.ring(note(14), {t:.07, dur:.8, vol:.012, attack:.003, pan:p}); Sound.sparkle(2, {t:.05, span:.25, vol:.01}); },
  // a cork squeaks into a neck; a balloon's mouth snaps over it
  cap(x, matter){
    const p = pan(x);
    if (matter === 'rubber') { Sound.tone(300, {type:'triangle', dur:.12, vol:.05, f2:520, pan:p}); Sound.tone(900, {t:.08, dur:.05, vol:.02, pan:p}); }
    else { Sound.tone(1300, {type:'triangle', dur:.09, vol:.03, f2:1700, vib:[40, 60], cut:2500, pan:p}); VOICE.wood(.7, p); }
  },
  uncork(x, pressure){ const p = pan(x); Sound.tone(500, {dur:.08, vol:.03 + Math.min(.05, pressure*.05), f2:1100, pan:p}); Sound.hiss({dur:.25*Math.min(1, pressure + .2), vol:.03, type:'bandpass', freq:1800, pan:p}); },
  // the cork goes: a hollow thoonk as the neck lets go, the gas rushing out, and a little magic
  pop(x, power){
    const p = pan(x), k = Math.min(1, power/2.5);
    Sound.tone(900, {dur:.14, vol:.1 + .05*k, f2:160, attack:.002, pan:p});
    Sound.hiss({dur:.08, vol:.08, type:'bandpass', freq:1500, q:1.2, pan:p});
    Sound.hiss({t:.03, dur:.6, vol:.06, type:'bandpass', freq:4000, f2:700, q:.7, attack:.02, pan:p});
    Sound.bell(note(10), {t:.12, dur:1.2, vol:.03, pan:p}); Sound.sparkle(4, {t:.15, span:.4, vol:.015});
  },
  // rubber stretching as gas fills a balloon, higher the fuller it gets
  stretch(key, x, inflate){ if (every(key, .35)) Sound.tone(260 + inflate*420, {type:'triangle', dur:.18, vol:.035, f2:300 + inflate*480, vib:[16, 14], cut:1600, pan:pan(x)}); },
  deflate(x){ const p = pan(x); Sound.hiss({dur:.8, vol:.08, type:'bandpass', freq:900, q:2, pan:p}); Sound.tone(500, {type:'sawtooth', dur:.7, vol:.03, f2:200, cut:1200, pan:p}); },

  // ---------- the cabinet: a menu you can hear, rising like a xylophone as you go along a shelf ----------
  hoverShelf(i){ Sound.tone(note(i), {type:'triangle', dur:.08, vol:.015, attack:.002}); },
  hoverThing(i){ Sound.tone(note(i + 3), {dur:.2, vol:.025, attack:.002}); Sound.ring(note(i + 8), {dur:.3, vol:.006, attack:.002}); },
  openShelf(x){
    const p = pan(x);
    VOICE.wood(.5, p); Sound.hiss({dur:.35, vol:.025, type:'bandpass', freq:600, f2:1800, attack:.12, pan:p});
    Sound.bell(note(10), {t:.12, dur:.9, vol:.022, pan:p}); Sound.bell(note(12), {t:.2, dur:1, vol:.018, pan:p}); Sound.sparkle(2, {t:.2, span:.3, vol:.012});
  },
  take(x){
    const p = pan(x);
    Sound.hiss({dur:.22, vol:.03, type:'bandpass', freq:1600, f2:500, attack:.04, pan:p});
    Sound.tone(note(9), {type:'triangle', t:.05, dur:.15, vol:.03, pan:p}); Sound.tone(note(12), {type:'triangle', t:.11, dur:.25, vol:.03, pan:p}); Sound.sparkle(2, {t:.12, span:.2, vol:.012});
  },
  refuse(x){ const p = pan(x); VOICE.wood(.6, p); setTimeout(() => VOICE.wood(.45, p), 110); },

  // ---------- the moments of an experiment ----------
  book(){ Sound.hiss({dur:.3, vol:.03, type:'bandpass', freq:2000, f2:4500, attack:.08}); [0, 2, 4].forEach((n, i) => Sound.ring(note(n + 5), {type:'triangle', t:.06 + i*.07, dur:.6, vol:.03, attack:.003})); },
  // things pop onto the desk, each a step up the scale
  setup(n){ for (let i = 0; i < n; i++) Sound.tone(note(i % 10), {type:'triangle', t:i*.05 + .05, dur:.12, vol:.03}); },
  predict(){ Sound.bell(note(5), {dur:.7, vol:.035}); Sound.bell(note(7), {t:.12, dur:1, vol:.04}); },
  hint(){ Sound.bell(note(9), {dur:1, vol:.03}); Sound.sparkle(2, {t:.1, span:.3, vol:.012}); },
  // one sorted thing tested: a bright ping if it matched the guess, a curious lower one if not
  tested(matched){ if (matched) Sound.bell(note(11), {dur:.8, vol:.035}); else { Sound.tone(note(4), {type:'triangle', dur:.25, vol:.03, f2:note(6)}); } },
  right(){
    [5, 7, 9, 10].forEach((n, i) => Sound.bell(note(n), {t:i*.08, dur:1.1, vol:.04}));
    Sound.tone(Sound.midi(48), {t:.3, dur:1.4, vol:.06, attack:.1}); Sound.sparkle(5, {t:.3, span:.5});
  },
  // a surprise isn't a mistake: a curious "hm?" that lifts, then lands somewhere warm
  surprise(){
    Sound.ring(note(4), {type:'triangle', dur:.35, vol:.04, f2:note(7), attack:.01});
    Sound.ring(note(6), {type:'triangle', t:.35, dur:.3, vol:.035});
    Sound.bell(note(5), {t:.6, dur:1.2, vol:.04}); Sound.tone(Sound.midi(53), {t:.6, dur:1.2, vol:.05, attack:.1});
  },
  complete(){
    [[5, 7, 9], [6, 8, 10], [7, 9, 12]].forEach((ch, j) => ch.forEach((n, i) => Sound.bell(note(n), {t:j*.22 + i*.05, dur:1.4, vol:.035})));
    Sound.bell(note(15), {t:.75, dur:2.2, vol:.05});
    Sound.tone(Sound.midi(48), {t:.7, dur:2.2, vol:.07, attack:.15}); Sound.tone(Sound.midi(55), {t:.7, dur:2.2, vol:.04, attack:.15});
    Sound.sparkle(8, {t:.75, span:.9});
  },
  // a new page in the book: a harp run all the way up, then a ring
  unlock(t = 0){
    for (let i = 0; i < 11; i++) Sound.ring(note(i + 2), {type:'triangle', t:t + i*.045, dur:.6, vol:.03 - i*.0012, attack:.003});
    Sound.bell(note(15), {t:t + .55, dur:1.8, vol:.045}); Sound.sparkle(6, {t:t + .55, span:.7, vol:.018});
  },
  reset(){ Sound.hiss({dur:.35, vol:.04, type:'bandpass', freq:2400, f2:600, attack:.05}); }
};
