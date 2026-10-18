// Keeps an open tab on the live version of the game. The server announces each new version;
// the tab moves onto it by reloading, but only at a moment the kid won't lose anything. The
// reload hides inside a storybook page turn: the old page turns out, the new one turns in, and
// resume() puts the kid back where they stood. Everything durable is already in localStorage.
// While the kid is busy (a trip, a game, a conversation) a toast offers to turn the page now,
// for those who would rather have the new version than finish what they're doing.

import { Sound } from './core/sound.js';
import { HQ } from './hq/index.js';
import { setSound, startEl } from './input.js';
import { player } from './player.js';
import { game } from './state.js';
import { convo } from './ui/dialogue.js';
import { $ } from './ui/dom.js';
import { dressing } from './ui/wardrobe.js';

const KEY = 'lantern-hill-resume';
// a moment's grace before the toast, in case a safe moment is about to come anyway
const TOAST_AFTER = 1500;
const toastEl = $('updateToast');
// the server pins each page to its version with <base href="/v/<version>/">
const mine = (document.baseURI.match(/\/v\/([^/]+)\/$/) || [])[1];
let live = mine, resumed = false, applying = false;

// Called once the world is running.
export function followUpdates(){
  if (resumed) import('./ui/page-turn.js').then(m => m.turnIn());
  if (!mine) return;
  new EventSource('/updates').onmessage = e => { live = e.data; };
  let waiting = 0;
  const poll = setInterval(() => {
    if (applying) return;
    if (live === mine) { waiting = 0; toastEl.hidden = true; return; }
    if (safe()) { clearInterval(poll); applyUpdate(); return; }
    waiting += 500;
    if (waiting >= TOAST_AFTER && toastEl.hidden) { toastEl.hidden = false; Sound.updateReady(); }
  }, 500);
  $('updateNow').addEventListener('click', e => { e.stopPropagation(); clearInterval(poll); applyUpdate(); });
}
const safe = () => !startEl.hidden || (game.world === HQ && !game.activity && !game.cutscene && !convo && !dressing);

async function applyUpdate(){
  if (applying) return;
  applying = true; toastEl.hidden = true;
  if (startEl.hidden) {
    // a spot outside HQ means nothing after the reload, which always starts at home
    const at = game.world === HQ ? {x:player.x, z:player.z, angle:player.angle} : {};
    try { sessionStorage.setItem(KEY, JSON.stringify({...at, sound:Sound.isOn()})); } catch (e) {}
    try { await (await import('./ui/page-turn.js')).turnOut(); } catch (e) {}
  }
  location.reload();
}

// After an update's reload: where to spawn, with the start screen already passed. Null on a fresh
// visit, or when the kid left from somewhere other than HQ.
export function resume(){
  let r = null;
  try { r = JSON.parse(sessionStorage.getItem(KEY)); sessionStorage.removeItem(KEY); } catch (e) {}
  if (!r || typeof r !== 'object') return null;
  startEl.hidden = true; setSound(r.sound !== false); resumed = true;
  return [r.x, r.z, r.angle].every(Number.isFinite) ? [r.x, r.z, r.angle] : null;
}
