import { canvas } from '../core/render.js';
import { Sound } from '../core/sound.js';
import { GENDER_DEFAULTS, cfg, groupsFor, normalize, saveCfg } from '../explorer.js';
import { coarse, startEl } from '../input.js';
import { buildHero, player } from '../player.js';
import { closeDialog } from './dialogue.js';
import { $ } from './dom.js';

const ward = $('wardrobe'), wbody = $('wbody');
export let dressing = false, dragX = null;
// how the wardrobe poses the hero: play.js turns them toward spin, walks them to walkTo and plays the hop
export const dress = {spin:0, hop:0, walkTo:null};
const hexOf = n => '#' + n.toString(16).padStart(6, '0');
const colorNames = {skin:['Fair','Light','Tan','Brown','Deep brown','Dark'], eyes:['Dark brown','Green','Blue','Amber']};
function renderWardrobe(){
  wbody.textContent = '';
  for (const g of groupsFor(cfg.kind)) {
    const div = document.createElement('div'); div.className = 'grp';
    const lab = document.createElement(g.type === 'text' ? 'label' : 'div'); lab.className = 't'; lab.textContent = g.label; div.append(lab);
    if (g.type === 'text') {
      const inp = document.createElement('input'); inp.id = 'wname'; inp.maxLength = 14; inp.value = cfg.name; inp.autocomplete = 'off'; inp.spellcheck = false;
      lab.htmlFor = 'wname';
      inp.addEventListener('input', () => { cfg.name = inp.value.trim() || 'Explorer'; saveCfg(); });
      div.append(inp);
    } else {
      const sw = document.createElement('div'); sw.className = 'sw'; sw.setAttribute('role', 'group'); sw.setAttribute('aria-label', g.label);
      const mk = (cls, k, v, label, bg) => { const b = document.createElement('button'); b.className = cls; b.dataset.k = k; b.dataset.v = JSON.stringify(v);
        if (bg !== undefined) { b.style.background = hexOf(bg); b.setAttribute('aria-label', label); b.title = label; } else b.textContent = label;
        b.addEventListener('click', () => pick(k, k === b.dataset.k && typeof v === 'boolean' ? !cfg[k] : v)); sw.append(b); };
      if (g.colors) g.colors.forEach((c, i) => mk('c', g.key, i, (colorNames[g.key] && colorNames[g.key][i]) || `${g.label} ${i + 1}`, c));
      if (g.opts) g.opts.forEach(([v, t]) => mk('o', g.key, v, t));
      if (g.toggles) g.toggles.forEach(([k, t]) => mk('o', k, true, t));
      div.append(sw);
    }
    wbody.append(div);
  }
  refreshPressed();
}
function refreshPressed(){
  wbody.querySelectorAll('button[data-k]').forEach(b => { const v = JSON.parse(b.dataset.v); b.setAttribute('aria-pressed', String(v === true ? !!cfg[b.dataset.k] : cfg[b.dataset.k] === v)); });
}
function pick(k, v){
  const relayout = k === 'kind' || k === 'outfit' || k === 'bottom';
  if (k === 'kind' && cfg.kind !== v) Object.assign(cfg, GENDER_DEFAULTS[v]);
  cfg[k] = v; normalize(); saveCfg(); buildHero(); dress.hop = .35;
  Sound.tone(880 + Math.random() * 300, {type:'triangle', dur:.09, vol:.08}); Sound.tone(1320, {type:'sine', t:.05, dur:.1, vol:.04});
  if (relayout) { const st = wbody.scrollTop; renderWardrobe(); wbody.scrollTop = st; } else refreshPressed();
}
function surprise(){
  const r = a => a[Math.floor(Math.random() * a.length)];
  // the explorer keeps the gender they picked; everything else is fair game
  Object.assign(cfg, GENDER_DEFAULTS[cfg.kind]);
  for (let pass = 0; pass < 2; pass++) for (const g of groupsFor(cfg.kind)) {
    if (g.key === 'kind') continue;
    if (g.colors) cfg[g.key] = Math.floor(Math.random() * g.colors.length);
    if (g.opts) cfg[g.key] = r(g.opts)[0];
    if (g.toggles) g.toggles.forEach(([k]) => cfg[k] = Math.random() < .3);
  }
  normalize(); saveCfg(); buildHero(); dress.hop = .35;
  const st = wbody.scrollTop; renderWardrobe(); wbody.scrollTop = st;
  [660, 880, 1175].forEach((f, i) => Sound.tone(f, {type:'triangle', t:i * .06, dur:.15, vol:.07}));
}
export function openWardrobe(first){
  if (dressing || !startEl.hidden) return;
  closeDialog();
  dressing = true; dress.spin = 0;
  dress.walkTo = (!first && Math.hypot(player.x - 8.95, player.z - 3.2) < 2.6) ? {x:7.2, z:3.5} : null;
  $('wTitle').textContent = first ? 'Create your explorer' : 'Wardrobe';
  renderWardrobe(); ward.hidden = false; document.documentElement.classList.add('dressing');
  Sound.tone(659, {type:'triangle', dur:.15, vol:.1}); Sound.tone(988, {type:'triangle', t:.08, dur:.25, vol:.1});
  setTimeout(() => { const b = wbody.querySelector('button[aria-pressed="true"]'); if (b && !coarse) b.focus({preventScroll:true}); }, 50);
}
function closeWardrobe(){
  if (!dressing) return;
  saveCfg();
  dressing = false; ward.hidden = true; document.documentElement.classList.remove('dressing');
  if (document.activeElement) document.activeElement.blur();
  [523, 659, 784, 1046].forEach((f, i) => Sound.tone(f, {type:'triangle', t:i * .07, dur:.3, vol:.08}));
}
export function wardrobeKey(e){
  const k = e.key;
  if (k === 'ArrowLeft' || k === 'a') { dress.spin -= .35; e.preventDefault(); }
  if (k === 'ArrowRight' || k === 'd') { dress.spin += .35; e.preventDefault(); }
  if (k === 'Escape' || ((k === 'e' || k === 'E') && !e.repeat)) closeWardrobe();
}
$('wDone').addEventListener('click', closeWardrobe);
$('wRand').addEventListener('click', surprise);

canvas.addEventListener('pointerdown', e => { if (dressing) { dragX = e.clientX; try { canvas.setPointerCapture(e.pointerId); } catch (_) {} } });
canvas.addEventListener('pointermove', e => { if (dressing && dragX !== null) { dress.spin += (e.clientX - dragX) * .012; dragX = e.clientX; } });
const endDrag = () => { dragX = null; };
canvas.addEventListener('pointerup', endDrag); canvas.addEventListener('pointercancel', endDrag);
