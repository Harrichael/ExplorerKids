import { load, save } from '../save.js';

// The songs, all by Kevin MacLeod (incompetech.com) under CC BY 4.0, which asks that each be credited
// by title where players can find it; the start screen lists them from here.
const track = title => ({title, src:`audio/music/${title.toLowerCase().replace(/ /g, '-')}.mp3`});
export const MUSIC = {
  home: ['Carefree', 'Industrious Ferret', 'Life of Riley', 'Thatched Villagers', 'Daily Beetle'].map(track),
  trip: ['Fiddles McGinty', 'Monkeys Spinning Monkeys', 'Carpe Diem'].map(track),
};
// the songs are loudness-matched at -16 LUFS; this sits them under the sound effects
const MUSIC_VOL = {songs:.075, box:.14};

export const Sound = (() => {
  let ctx = null, master, sfx, music, echo, air, noise, on = true, mode = load('musicBox') ? 'box' : 'songs';
  function init(){
    if (ctx) { if (ctx.state === 'suspended') ctx.resume(); return; }
    const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return;
    ctx = new AC();
    master = ctx.createGain(); master.gain.value = on ? 0.9 : 0; master.connect(ctx.destination);
    sfx = ctx.createGain(); sfx.gain.value = 0.85; sfx.connect(master);
    music = ctx.createGain(); music.gain.value = 0; music.connect(master);
    const dly = ctx.createDelay(1); dly.delayTime.value = 0.39;
    const fb = ctx.createGain(); fb.gain.value = 0.33;
    const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 1700;
    dly.connect(lp); lp.connect(fb); fb.connect(dly); lp.connect(master);
    // the music box rings in the echo; recorded songs would only turn to mud in it
    echo = ctx.createGain(); echo.gain.value = mode === 'box' ? 1 : 0; music.connect(echo); echo.connect(dly);
    // sfx with a tail, so magical cues ring in the same room as the music box
    air = ctx.createGain(); air.connect(sfx);
    const send = ctx.createGain(); send.gain.value = .55; air.connect(send); send.connect(dly);
    noise = ctx.createBuffer(1, ctx.sampleRate * 0.5, ctx.sampleRate);
    const d = noise.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    music.gain.setValueAtTime(0, ctx.currentTime);
    music.gain.linearRampToValueAtTime(awake ? MUSIC_VOL[mode] : 0, ctx.currentTime + 4);
    startMusic();
  }
  // `pan` from -1 (left) to 1 (right) places a sound in the stereo field
  function out(node, bus, pan){
    if (pan && ctx.createStereoPanner) { const p = ctx.createStereoPanner(); p.pan.value = Math.max(-1, Math.min(1, pan)); node.connect(p); p.connect(bus || sfx); }
    else node.connect(bus || sfx);
  }
  function tone(f, {type='sine', t=0, dur=.2, vol=.2, bus, attack=.006, f2, cut, vib, pan}={}){
    if (!ctx) return;
    const now = ctx.currentTime + t;
    const o = ctx.createOscillator(); o.type = type;
    o.frequency.setValueAtTime(f, now);
    if (f2) o.frequency.exponentialRampToValueAtTime(f2, now + dur * .8);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, now);
    g.gain.linearRampToValueAtTime(vol, now + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, now + dur);
    let node = o;
    if (cut) { const fl = ctx.createBiquadFilter(); fl.type = 'lowpass'; fl.frequency.value = cut; o.connect(fl); node = fl; }
    if (vib) { const lfo = ctx.createOscillator(), lg = ctx.createGain(); lfo.frequency.value = vib[0]; lg.gain.value = vib[1]; lfo.connect(lg); lg.connect(o.frequency); lfo.start(now); lfo.stop(now + dur + .05); }
    node.connect(g); out(g, bus, pan);
    o.start(now); o.stop(now + dur + .05);
  }
  function hiss({t=0, dur=.08, vol=.1, type='lowpass', freq=800, f2, q=1, bus, attack, pan}={}){
    if (!ctx) return;
    const now = ctx.currentTime + t;
    const s = ctx.createBufferSource(); s.buffer = noise; s.loop = true; s.playbackRate.value = .8 + Math.random() * .4;
    const f = ctx.createBiquadFilter(); f.type = type; f.frequency.setValueAtTime(freq, now); f.Q.value = q;
    if (f2) f.frequency.exponentialRampToValueAtTime(f2, now + dur);
    const g = ctx.createGain();
    if (attack) { g.gain.setValueAtTime(0.0001, now); g.gain.linearRampToValueAtTime(vol, now + attack); } else g.gain.setValueAtTime(vol, now);
    g.gain.exponentialRampToValueAtTime(0.0001, now + dur);
    s.connect(f); f.connect(g); out(g, bus, pan);
    s.start(now, Math.random() * .3); s.stop(now + dur + .02);
  }
  const semi = n => Math.pow(2, n / 12);
  // a struck bell: a pure fundamental under quickly fading inharmonic partials
  function bell(f, t, dur, vol, pan){
    tone(f, {t, dur, vol, bus:air, attack:.003, pan});
    tone(f * 2.76, {t, dur:dur * .35, vol:vol * .3, bus:air, attack:.002, pan});
    tone(f * 5.4, {t, dur:dur * .15, vol:vol * .12, bus:air, attack:.001, pan});
  }
  // fairy dust: a few random high pings scattered over `span` seconds
  function sparkle(t, n, span = .5, vol = .025){
    for (let i = 0; i < n; i++) tone(midi(96 + [0, 2, 4, 7, 9, 12][Math.floor(Math.random() * 6)]), {t:t + Math.random() * span, dur:.25, vol, bus:air, attack:.002});
  }
  function blip(v){
    if (!ctx) return;
    const step = v.scale[Math.floor(Math.random() * v.scale.length)];
    const f = v.base * semi(step) * (1 + (Math.random() - .5) * .03);
    tone(f * (v.glide || 1.06), {type:v.type, dur:v.len, vol:v.vol, f2:f, cut:v.cut, vib:v.vib});
    if (v.layer) tone(f * 2, {type:'sine', dur:v.len * .7, vol:v.vol * .25});
  }
  const midi = n => 440 * Math.pow(2, (n - 69) / 12);
  // Each theme is a playlist of songs, played in a shuffled order that reshuffles when it runs out.
  // Changing theme fades the song out and starts the new playlist rather than waiting for the song to end.
  let theme = 'home', order = [], el = null, fade = null, fadeT = 0;
  function play(){
    if (!order.length) order = MUSIC[theme].slice().sort(() => Math.random() - .5);
    el.src = order.shift().src; if (awake) resume();
    clearTimeout(fadeT); fade.gain.cancelScheduledValues(ctx.currentTime); fade.gain.setTargetAtTime(1, ctx.currentTime, .4);
  }
  // a touch lets a page start audio only once the finger lifts, so a song may have to wait for it
  function resume(){ el.play().catch(() => addEventListener('pointerup', () => awake && el.play().catch(() => {}), {once:true})); }
  function fadeOut(then){
    clearTimeout(fadeT); fade.gain.cancelScheduledValues(ctx.currentTime); fade.gain.setTargetAtTime(0, ctx.currentTime, .25);
    fadeT = setTimeout(then, 1000);
  }
  // the music box: tunes played live on the synth, the game's music before it had songs
  const THEMES = {
    // cozy music box for the cottage
    home: {step:.4, chords:[[53,57,60,64],[50,53,57,60],[46,50,53,57],[48,52,55,58]], pattern:[0,2,1,3,2,1,3,2], play(ch, i, t, n){
      tone(midi(n), {type:'sine', t, dur:1.1, vol:.16, bus:music, attack:.004});
      tone(midi(n) * 3, {type:'sine', t, dur:.25, vol:.025, bus:music, attack:.002});
      if (i === 0) tone(midi(ch[0] - 12), {type:'triangle', t, dur:2.6, vol:.09, bus:music, attack:.05});
      if ((i === 3 || i === 6) && Math.random() < .45) { const mel = [0, 2, 4, 7, 9][Math.floor(Math.random() * 5)]; tone(midi(ch[0] + 24 + mel), {type:'sine', t:t + .05, dur:1.4, vol:.07, bus:music, attack:.01}); }
    }},
    // bouncy adventure march for field trips
    trip: {step:.25, chords:[[55,59,62,67],[52,55,59,64],[48,52,55,60],[50,54,57,62]], pattern:[0,1,2,3,2,1,2,3], play(ch, i, t, n){
      tone(midi(n), {type:'triangle', t, dur:.3, vol:.12, bus:music, attack:.003});
      tone(midi(n) * 2, {type:'sine', t, dur:.12, vol:.03, bus:music, attack:.002});
      if (i % 4 === 0) { tone(midi(ch[0] - 24), {type:'triangle', t, dur:.45, vol:.17, bus:music, attack:.01}); tone(115, {type:'sine', t, dur:.18, vol:.2, f2:42, bus:music, attack:.002}); }
      if (i % 4 === 2) tone(midi(ch[2] - 24), {type:'triangle', t, dur:.35, vol:.13, bus:music, attack:.01});
      if (i % 2 === 1) hiss({t, dur:.035, vol:.05, type:'highpass', freq:6500, bus:music});
      if (i === 4) hiss({t, dur:.09, vol:.06, type:'bandpass', freq:1800, q:.8, bus:music});
      if ((i === 2 || i === 5 || i === 7) && Math.random() < .55) { const mel = [0, 2, 4, 7, 9, 12][Math.floor(Math.random() * 6)]; tone(midi(ch[0] + 24 + mel), {type:'square', t:t + .02, dur:.22, vol:.032, cut:2400, bus:music, attack:.005}); }
    }}
  };
  // the music box changes tune only on a bar line
  let boxTheme = theme, step = 0, next = 0;
  function tickBox(){
    if (mode !== 'box' || !awake) { next = 0; return; }
    if (!next) next = ctx.currentTime + .2;
    while (next < ctx.currentTime + .35) {
      if (boxTheme !== theme && step % 8 === 0) { boxTheme = theme; step = 0; }
      const th = THEMES[boxTheme], bar = Math.floor(step / 8) % th.chords.length, ch = th.chords[bar], i = step % 8, t = next - ctx.currentTime;
      th.play(ch, i, t, ch[th.pattern[i]] + 12);
      next += th.step; step++;
    }
  }
  function startMusic(){
    // streamed, not decoded: a whole song decoded is tens of megabytes, too much for a phone
    el = new Audio(); el.preload = 'auto'; el.addEventListener('ended', play);
    fade = ctx.createGain(); ctx.createMediaElementSource(el).connect(fade); fade.connect(music);
    setInterval(tickBox, 90);
    if (mode === 'songs') play();
  }
  function switchTo(name){
    theme = name; order = [];
    if (el && mode === 'songs') fadeOut(play);
  }
  function toggleMusic(){
    mode = mode === 'songs' ? 'box' : 'songs'; save('musicBox', mode === 'box');
    if (!ctx) return;
    echo.gain.setTargetAtTime(mode === 'box' ? 1 : 0, ctx.currentTime, .3);
    level();
    if (mode === 'songs') play(); else fadeOut(() => el.pause());
  }
  // The music rests while nobody is there to hear it: the tab is in the background or its window
  // isn't focused, or no one has touched it for five minutes. It comes back with the next tap or key
  // in the focused tab. Input alone doesn't count: an AI agent can drive a tab nobody is looking at.
  const IDLE = 5*60e3;
  let awake = true, ducked = false, lastActive = performance.now(), restT = 0;
  function level(){ if (ctx) music.gain.setTargetAtTime(awake ? MUSIC_VOL[mode] * (ducked ? .35 : 1) : 0, ctx.currentTime, awake ? .3 : .8); }
  function setAwake(a){
    if (a === awake) return;
    awake = a; level(); clearTimeout(restT);
    if (!el || mode !== 'songs') return;
    // a resting song pauses rather than playing on silently, so it picks up where it left off
    if (awake) { if (el.paused && el.src) resume(); } else restT = setTimeout(() => el.pause(), 3000);
  }
  const present = () => !document.hidden && document.hasFocus();
  function active(){ lastActive = performance.now(); if (present()) setAwake(true); }
  for (const ev of ['pointerdown', 'pointermove', 'keydown', 'wheel', 'focus']) addEventListener(ev, active, {capture:true, passive:true});
  const away = () => { if (!present()) setAwake(false); };
  addEventListener('blur', away); document.addEventListener('visibilitychange', () => document.hidden ? away() : active());
  setInterval(() => { if (performance.now() - lastActive > IDLE) setAwake(false); }, 5000);
  const bufCache = new Map(); let seqId = 0, seqSrc = [], seqTimers = [];
  function clipBuffer(url){
    if (bufCache.has(url)) return bufCache.get(url);
    const pr = fetch(url).then(r => { if (!r.ok) throw new Error(`${r.status} ${url}`); return r.arrayBuffer(); })
      .then(buf => new Promise((res, rej) => ctx.decodeAudioData(buf, res, rej)));
    // a failed fetch shouldn't stay cached, or that clip would be silent until reload
    pr.catch(() => bufCache.delete(url));
    bufCache.set(url, pr); return pr;
  }
  function stopSeq(){ seqId++; seqSrc.forEach(s => { try { s.stop(); } catch (e) {} }); seqSrc = []; seqTimers.forEach(clearTimeout); seqTimers = []; }
  async function playSeq(uris, gap, onEach){
    init(); if (!ctx || !uris.length) return;
    stopSeq(); const my = seqId;
    let bufs; try { bufs = await Promise.all(uris.map(clipBuffer)); } catch (e) { return; }
    if (my !== seqId) return;
    let t = ctx.currentTime + .05;
    bufs.forEach((b, i) => {
      const src = ctx.createBufferSource(); src.buffer = b; const g = ctx.createGain(); g.gain.value = 1.5;
      src.connect(g); g.connect(sfx); src.start(t); seqSrc.push(src);
      if (onEach) { const at = (t - ctx.currentTime) * 1000; seqTimers.push(setTimeout(() => onEach(i, b.duration), at)); }
      t += b.duration + gap;
    });
    if (onEach) seqTimers.push(setTimeout(() => onEach(-1, 0), (t - ctx.currentTime) * 1000));
  }
  return {
    init, blip, tone, hiss, playSeq, stopSeq, toggleMusic, midi,
    // the ringing, echoing voices magical cues are made of
    bell(f, {t = 0, dur = 1, vol = .05, pan} = {}){ if (ctx) bell(f, t, dur, vol, pan); },
    sparkle(n, {t = 0, span = .5, vol = .025} = {}){ if (ctx) sparkle(t, n, span, vol); },
    ring(f, o = {}){ tone(f, Object.assign({bus:air}, o)); },
    now(){ return ctx ? ctx.currentTime : 0; },
    setTheme(name){ if (MUSIC[name] && name !== theme) switchTo(name); },
    isOn(){ return on; },
    toggle(){ on = !on; if (ctx) master.gain.setTargetAtTime(on ? .9 : 0, ctx.currentTime, .05); return on; },
    duck(d){ ducked = d; level(); },
    open(){ tone(784, {type:'triangle', dur:.14, vol:.13}); tone(1175, {type:'triangle', t:.08, dur:.22, vol:.12}); },
    next(){ tone(1046, {type:'square', dur:.05, vol:.035, cut:2500}); },
    close(){ tone(988, {type:'triangle', dur:.12, vol:.11}); tone(659, {type:'triangle', t:.08, dur:.2, vol:.1}); },
    near(){ tone(1568, {dur:.12, vol:.045}); tone(2093, {t:.07, dur:.18, vol:.04}); },
    step(surface){
      if (surface === 'wood') { tone(150 + Math.random() * 30, {dur:.07, vol:.09, f2:90}); hiss({dur:.03, vol:.05, type:'bandpass', freq:1600, q:2}); }
      else if (surface === 'deck') { tone(210 + Math.random() * 30, {type:'triangle', dur:.08, vol:.06, f2:120}); hiss({dur:.03, vol:.04, type:'bandpass', freq:1200, q:2}); }
      else if (surface === 'stone') { tone(240 + Math.random() * 40, {type:'triangle', dur:.05, vol:.05, f2:150}); hiss({dur:.04, vol:.05, type:'bandpass', freq:2600, q:1.5}); }
      // a soft slosh, then the bloop of a pocket of air closing, which rises in pitch as it shrinks
      else if (surface === 'water') { const p = .85 + Math.random() * .3;
        hiss({dur:.18, vol:.06, type:'bandpass', freq:700 * p, f2:2200 * p, q:.8, attack:.012});
        tone(330 * p, {t:.03, dur:.1, vol:.04, f2:620 * p, attack:.004});
        hiss({t:.06, dur:.14, vol:.018, type:'highpass', freq:3400 * p, attack:.02}); }
      else hiss({dur:.09, vol:.07, type:'lowpass', freq:700 + Math.random() * 300});
    },
    crackle(vol){ hiss({dur:.02 + Math.random() * .03, vol:vol, type:'highpass', freq:1800 + Math.random() * 2000}); },
    // Updates, scored the way Zelda scores a discovery: the background music falls silent so the cue
    // owns the moment, every sound lands on a beat of the animation, and the cue resolves home.
    updateReady(){ bell(midi(91), 0, 1.1, .045); bell(midi(96), .14, 1.4, .05); sparkle(.3, 4, .4, .018); },
    // the old page: music hushes, the page lifts with a breath of air, a harp sweeps up as the
    // camera pulls back, bells ring as the book settles, then everything fades before the reload
    updateOut(){
      if (!ctx) return;
      const now = ctx.currentTime;
      music.gain.cancelScheduledValues(now); music.gain.setTargetAtTime(0, now, .12);
      hiss({dur:.55, vol:.07, type:'bandpass', freq:500, f2:3200, q:.9, attack:.2});
      [60, 62, 64, 67, 69, 72, 74, 76, 79, 81, 84, 88].forEach((n, i) =>
        tone(midi(n), {type:'triangle', t:.06 + i * .036, dur:.7, vol:.05 - i * .002, bus:air, attack:.003}));
      [72, 76, 79].forEach((n, i) => bell(midi(n), .56 + i * .03, 1.6, .05));
      tone(midi(48), {type:'sine', t:.5, dur:1.4, vol:.08, attack:.12});
      sparkle(.6, 7, .7);
      master.gain.setTargetAtTime(0, now + 1.25, .05);
    },
    // the new page: a gentle two-note landing as the page settles into the world
    updateIn(){ bell(midi(79), .9, 1, .04); bell(midi(84), 1.1, 1.6, .05); tone(midi(48), {type:'sine', t:1.1, dur:1.2, vol:.06, attack:.08}); },
    // a reloaded page may not have earned audio yet: browsers wait for a tap or key
    running(){ return !!ctx && ctx.state === 'running'; },
    meow(){ tone(520, {type:'triangle', dur:.42, vol:.12, f2:820, cut:2200, vib:[7,18]}); tone(820, {type:'triangle', t:.28, dur:.3, vol:.08, f2:480, cut:2000}); }
  };
})();
