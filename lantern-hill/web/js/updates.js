// Keeps an open tab on the live version of the game. The server announces each new version;
// the tab moves onto it by reloading, but only at a moment the kid won't lose anything. The
// reload hides inside a storybook page turn: the old page turns out, the new one turns in, and
// resume() puts the kid back where they stood. Everything durable is already in localStorage.

import { Sound } from './core/sound.js';
import { HQ } from './hq/index.js';
import { setSound, startEl } from './input.js';
import { player } from './player.js';
import { game } from './state.js';
import { convo } from './ui/dialogue.js';
import { dressing } from './ui/wardrobe.js';

const KEY = 'lantern-hill-resume';
// the server pins each page to its version with <base href="/v/<version>/">
const mine = (document.baseURI.match(/\/v\/([^/]+)\/$/) || [])[1];
let live = mine, resumed = false;

// Called once the world is running.
export function followUpdates(){
  if (resumed) import('./ui/page-turn.js').then(m => m.turnIn());
  if (!mine) return;
  new EventSource('/updates').onmessage = e => { live = e.data; };
  const poll = setInterval(() => { if (live !== mine && safe()) { clearInterval(poll); applyUpdate(); } }, 500);
}
const safe = () => !startEl.hidden || (game.world === HQ && !game.activity && !game.cutscene && !convo && !dressing);

async function applyUpdate(){
  if (startEl.hidden) {
    try { sessionStorage.setItem(KEY, JSON.stringify({x:player.x, z:player.z, angle:player.angle, sound:Sound.isOn()})); } catch (e) {}
    try { await (await import('./ui/page-turn.js')).turnOut(); } catch (e) {}
  }
  location.reload();
}

// After an update's reload: where to spawn, with the start screen already passed. Null on a fresh visit.
export function resume(){
  let r = null;
  try { r = JSON.parse(sessionStorage.getItem(KEY)); sessionStorage.removeItem(KEY); } catch (e) {}
  if (!r || ![r.x, r.z, r.angle].every(Number.isFinite)) return null;
  startEl.hidden = true; setSound(r.sound !== false); resumed = true;
  return [r.x, r.z, r.angle];
}
