// ---------- page turns: the current view becomes a page and flips away ----------

import { ease } from '../core/kit.js';
import { camera, canvas, renderer } from '../core/render.js';
import { Sound } from '../core/sound.js';
import { game } from '../state.js';
import { $ } from './dom.js';

const ptEl = $('pageTurn'), bannerEl = $('banner');
export function pageTurn(mid, after, chapter){
  game.cutscene = true;
  renderer.render(game.world.scene, camera);
  let url = ''; try { url = canvas.toDataURL('image/jpeg', .85); } catch (e) {}
  const book = $('ptBook'), shadow = $('ptShadow'), vw = innerWidth, vh = innerHeight;
  const N = vw < 600 ? 14 : 22, sw = vw/N, k = 230/(N*(N - 1)), strips = [];
  book.textContent = ''; let parent = book;
  for (let i = 0; i < N; i++) {
    const st = document.createElement('div'); st.className = 'pt-s'; st.style.width = sw + 'px'; st.style.left = (i ? sw : 0) + 'px';
    const f = document.createElement('div'); f.className = 'pt-f';
    if (url) { f.style.backgroundImage = `url(${url})`; f.style.backgroundSize = `${vw}px ${vh}px`; f.style.backgroundPosition = `${-i*sw}px 0`; }
    const fs = document.createElement('i'); fs.className = 'pt-sh'; f.append(fs);
    const bk = document.createElement('div'); bk.className = 'pt-b'; const bs = document.createElement('i'); bs.className = 'pt-sh'; bk.append(bs);
    st.append(f, bk); parent.append(st); strips.push({st, fs, bs}); parent = st;
  }
  const edge = document.createElement('div'); edge.className = 'pt-edge'; parent.append(edge);
  ptEl.hidden = false; bannerEl.hidden = true; shadow.style.opacity = 0;
  if (mid) mid();
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches, dur = reduce ? 350 : 1550;
  setTimeout(() => {
    Sound.hiss({dur:.7, vol:.09, type:'bandpass', freq:2400, q:.7}); Sound.hiss({t:.5, dur:.3, vol:.06, type:'bandpass', freq:1400, q:.8});
    Sound.tone(523, {type:'triangle', t:.3, dur:.35, vol:.05}); Sound.tone(784, {type:'triangle', t:.5, dur:.45, vol:.05});
    let t0 = null;
    const step = now => {
      if (t0 === null) t0 = now;
      const p = Math.min(1, (now - t0)/dur), e = ease(p), curl = reduce ? 0 : Math.sin(Math.PI*p), base = 180*e;
      let cum = 0;
      strips.forEach((o, i) => {
        const r = i === 0 ? base - curl*32 : curl*k*i;
        cum += r; o.st.style.transform = i === 0 ? `rotateX(${(curl*7).toFixed(2)}deg) rotateY(${(-r).toFixed(2)}deg)` : `rotateY(${(-r).toFixed(2)}deg)`;
        const lit = Math.max(0, Math.sin(cum*Math.PI/180));
        o.fs.style.opacity = (lit*.5).toFixed(3); o.bs.style.opacity = (lit*.3 + .04).toFixed(3);
      });
      shadow.style.opacity = (curl*.95).toFixed(3); shadow.style.transform = `translateX(${(vw*Math.max(0, Math.cos(base*Math.PI/180)) - 30).toFixed(1)}px)`;
      if (p < 1) { requestAnimationFrame(step); return; }
      ptEl.hidden = true; book.textContent = ''; game.cutscene = !!game.cutCam;
      if (chapter) showBanner(chapter[0], chapter[1]);
      if (after) after();
    };
    requestAnimationFrame(step);
  }, 140);
}
function showBanner(ch, title){
  $('bnCh').textContent = ch; $('bnT').textContent = title;
  bannerEl.hidden = true; void bannerEl.offsetWidth; bannerEl.hidden = false;
  clearTimeout(showBanner.t); showBanner.t = setTimeout(() => { bannerEl.hidden = true; }, 3400);
}
