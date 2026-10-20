// The class out exploring a place. They hop off the bus and head for whatever caught their eye; when
// one has found something, they call the explorer over, and talking to them plays out the find.
// Nobody follows the explorer around: the explorer goes to them.
//
//   const cls = classmates(w, t, [busX, busZ]);
//   cls.find('juniper', {name:'rock', at:[x, z, facing], pose:'crouch', call:"Come feel this!",
//     scene: async () => { ... }, after:["Still warm!"]});
//   cls.hint = () => "...";                    // what Dr. Sparks says if asked
//   cls.arrive();                              // everyone runs to their spots
//   await t.until(() => cls.saw('rock'));      // the find the place can't be left without
//
// A place needs only its key find seen; the rest are the explorer's to choose. When Dr. Sparks calls
// everyone back to the bus, anyone with a find not yet seen stays and keeps calling, and heads for
// the bus once the explorer has been to see it, or the explorer can just climb aboard.
//
//   await t.say(cls.leaving("next stop: down!"));   // Dr. Sparks calls everyone back
//   cls.gather([x, z, facing]);                      // where they wait for the bus
//   await cls.board(bus);                            // in through the door, Dr. Sparks and the explorer last

import * as THREE from 'three';
import { tex } from '../core/kit.js';
import { camera } from '../core/render.js';
import { Sound } from '../core/sound.js';
import { player } from '../player.js';
import { game } from '../state.js';
import { convo } from '../ui/dialogue.js';
import { heroHopIn, hopIn, spawnNPC } from './stop-kit.js';

export const CLASS = ['sparks', 'pip', 'juniper', 'basil', 'mo'];
const bang = tex(128, 128, (c, w, h) => {
  c.fillStyle = '#efe0bf'; c.strokeStyle = '#1a1320'; c.lineWidth = 8;
  c.beginPath(); c.arc(64, 56, 44, 0, 7); c.moveTo(48, 92); c.lineTo(40, 120); c.lineTo(72, 96); c.fill(); c.stroke();
  c.fillStyle = '#d9a441'; c.beginPath(); c.arc(64, 56, 36, 0, 7); c.fill();
  c.fillStyle = '#1a1320'; c.font = '900 64px Nunito, sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('!', 64, 60);
});
bang.wrapS = bang.wrapT = THREE.ClampToEdgeWrapping;
const arrowEl = document.createElement('div'); arrowEl.id = 'callArrow'; arrowEl.hidden = true; document.body.append(arrowEl);
const sp = new THREE.Vector3();

export function classmates(w, t, door){
  const n = {}, finds = [], found = new Set();
  for (const id of CLASS) { n[id] = spawnNPC(w, id, door[0], door[1], 0); n[id].model.root.visible = false; n[id].label.visible = false; }
  const cls = {n, found, hint: () => "Look around, {name}! Somebody's sure to find something.",
    find(id, f){ f.id = id; f.who = n[id]; f.mark = new THREE.Sprite(new THREE.SpriteMaterial({map:bang, transparent:true, depthWrite:false}));
      f.mark.scale.set(.6, .6, 1); f.mark.visible = false; w.scene.add(f.mark); finds.push(f); return f; },
    saw: name => [...found].some(f => f.name === name),
    // the names of every find and curio the explorer has seen here
    seen: () => [...[...found].map(f => f.name), ...(w.curios ? w.curios.seen : [])],
    // curios are the place's own "Look closer" secrets, which it may add any time before this is asked
    tally: () => ({seen:found.size, of:finds.length, curios:{seen:w.curios ? w.curios.seen.size : 0, of:w.curios ? w.curios.all.length : 0}}),
    // Dr. Sparks calls everyone back, teasing what's next; those still with something to show stay out
    leaving(next){
      const who = [...waving(), '{name}'], names = who.slice(0, -1).join(', ') + (who.length > 2 ? ', and ' : ' and ') + '{name}';
      return [['sparks', `Alright class, ${next}`], ['sparks', who.length > 1 ? `${names}, when you're done, come to the bus!` : 'Everyone back on the bus!']];
    },
    stillWaving(or = 'hop on the bus'){
      const who = waving();
      if (!who.length) return [];
      const names = who.length > 1 ? who.slice(0, -1).join(', ') + ' and ' + who.at(-1) : who[0];
      return [['sparks', `${names} ${who.length > 1 ? 'still want' : 'still wants'} to show you something. Go and see, or ${or}!`]];
    },
    // off the bus, everyone to their spot: the first find of each kid, or where they were told to stand
    arrive(spots = {}){
      CLASS.forEach((id, i) => {
        const k = n[id], f = finds.find(f => f.id === id), at = spots[id] || (f && f.at);
        k.x = door[0] + (i - 2)*.35; k.z = door[1]; k.model.root.position.set(k.x, w.ground(k.x, k.z), k.z); k.model.root.visible = true; k.label.visible = true;
        // each spots their find a moment after getting there, so the calls come one by one
        if (at) k.goal = {...clear(at[0], at[1]), angle:at[2], run:true, then: () => { k.pose = (f && f.at === at && f.pose) || null; k.spotted = game.elapsed + 1 + i*1.6; }};
      });
    },
    // everyone back to the bus door to wait for the explorer
    gather(at){ bus = at; },
    // until the explorer climbs aboard; never in the middle of a find, whose scene would be left running.
    // The class files in through the door as they get there; the explorer climbing aboard calls in
    // anyone still out, then Dr. Sparks, then the explorer last of all.
    async board(b){
      aboard = b;
      await b.boarding(t, () => !running);
      game.cutscene = true;
      const out = CLASS.filter(id => n[id].model.root.visible && !n[id].in);
      for (const id of out) if (id !== 'sparks') goIn(n[id], true);
      const end = game.elapsed + 5, kids = CLASS.filter(id => id !== 'sparks').map(id => n[id]);
      await t.until(() => game.elapsed > end || kids.every(k => !k.model.root.visible));
      // anyone from the far side of the place is taken as already aboard, so Dr. Sparks is still last
      for (const k of kids) { k.goal = null; k.model.root.visible = false; }
      if (n.sparks.model.root.visible) { goIn(n.sparks, true); await t.until(() => game.elapsed > end + 3 || !n.sparks.model.root.visible); }
      let inside = false; heroHopIn(b.door(-.2)).then(() => { inside = true; });
      await t.until(() => inside);
    },
  };
  let bus = null, aboard = null, nextIn = 0;
  // nobody stands where the explorer couldn't: inside the parked bus, a boulder
  const clear = (x, z) => {
    for (let pass = 0; pass < 3; pass++) { let moved = false;
      for (const c of w.colliders) { const m = .45, y = w.ground(x, z);
        if (y < c.minY || y > c.maxY || x <= c.minX - m || x >= c.maxX + m || z <= c.minZ - m || z >= c.maxZ + m) continue;
        const [dx, dz] = [[c.minX - m - x, 0], [c.maxX + m - x, 0], [0, c.minZ - m - z], [0, c.maxZ + m - z]].sort((a, b) => Math.hypot(...a) - Math.hypot(...b))[0];
        x += dx; z += dz; moved = true; }
      if (!moved) break; }
    return {x, z};
  };
  const waving = () => [...new Set(finds.filter(f => !found.has(f) && (!f.when || f.when()) && f.id !== 'sparks').map(f => f.who.name))];
  // up to the door and in with a hop
  function goIn(k, run){
    const [x, z] = aboard.door(.35), [ix, iz] = aboard.door(-.2);
    k.in = true; k.pose = null; k.calling = false;
    k.goal = {x, z, run, then: () => hopIn(k, [ix, aboard.root.position.y + .3, iz])};
  }
  const ready = f => !found.has(f) && !f.who.goal && !f.who.in && game.elapsed > (f.who.spotted || 0) && (!f.when || f.when());
  let running = false, callAt = 0;
  async function play(f){
    if (running) return; running = true; game.cutscene = true;
    // leaving the trip mid-find strands the scene; it simply stops
    try { await f.scene(); } catch (e) { if (t.gone) return; throw e; } finally { running = false; if (!t.gone) game.cutscene = false; }
    found.add(f); f.mark.visible = false;
    if (f.after) f.who.lines = f.after;
  }
  t.onEnd(() => { arrowEl.hidden = true; });
  const sparksHint = () => { if (!running) t.say([['sparks', cls.hint()]]); };
  w.anims.push((dt, tt) => {
    let near = null, nd = Infinity;
    for (const id of CLASS) {
      const k = n[id], f = finds.find(f => f.who === k && ready(f));
      if (k.in) { k.onTalk = null; k.calling = false; k.range = 0; continue; }
      // one who has just run to a new find stays by it, even in the beat before they spot it
      if (bus && !f && !k.goal && !k.atBus && id !== 'sparks' && !finds.some(g => g.who === k && !found.has(g) && (!g.when || g.when()))) { const i = CLASS.indexOf(id); k.atBus = true; k.pose = null; k.goal = {...clear(bus[0] + (i - 2.5)*.8, bus[1] + (i % 2)*.6), angle:bus[2] || 0}; }
      // with the bus here, those waiting file in one by one, and Dr. Sparks waits by the door for the explorer
      if (aboard && k.atBus && !k.goal && id !== 'sparks' && tt > nextIn) { nextIn = tt + .6; goIn(k, false); continue; }
      if (aboard && id === 'sparks' && !k.atBus && !f) { const a = aboard.root.rotation.y, [x, z] = aboard.door(.8);
        k.atBus = true; k.pose = null; k.goal = {...clear(x + Math.cos(a)*1.1, z - Math.sin(a)*1.1), angle:a + Math.PI}; }
      // whoever has something to show is talked to through it; the rest just chat
      k.onTalk = f ? () => play(f) : id === 'sparks' ? sparksHint : null;
      // mid-find, with the explorer handed the controls to do something, nobody calls or talks
      // a talk prompt with nothing behind it reads as a broken button, so only those with something to say offer one
      k.calling = !!f && !running; k.range = running || !(k.onTalk || k.lines.length) ? 0 : 1.7;
      if (!k.calling) continue;
      const d = Math.hypot(player.x - k.x, player.z - k.z); if (d < nd) { nd = d; near = f; }
    }
    for (const f of finds) {
      f.mark.visible = ready(f) && f.who.model.root.visible && f.who.onTalk && !convo && !running && finds.find(g => g.who === f.who && ready(g)) === f;
      if (f.mark.visible) f.mark.position.set(f.who.x, f.who.y + f.who.labelY + .55 + Math.abs(Math.sin(tt*3))*.12, f.who.z);
    }
    // a caller nobody has come to calls again now and then
    if (near && nd > 4 && tt > callAt) { callAt = tt + 9; if (!game.cutscene && !convo) Sound.near(); }
    showArrow(near && nd > 3 && !game.cutscene && !convo ? near.who : null);
  });
  return cls;
}
// points from the edge of the screen toward a caller who is out of sight
function showArrow(k){
  if (!k) { arrowEl.hidden = true; return; }
  sp.set(k.x, k.y + 1.2, k.z).project(camera);
  const behind = sp.z > 1, on = !behind && Math.abs(sp.x) < .92 && Math.abs(sp.y) < .88;
  if (on) { arrowEl.hidden = true; return; }
  let x = behind ? -sp.x : sp.x, y = behind ? -sp.y : sp.y; const m = Math.max(Math.abs(x)/.9, Math.abs(y)/.82); x /= m; y /= m;
  arrowEl.style.left = (x + 1)*50 + '%'; arrowEl.style.top = (1 - y)*50 + '%';
  arrowEl.style.setProperty('--a', Math.atan2(-y, x) + 'rad'); arrowEl.textContent = k.name; arrowEl.hidden = false;
}
