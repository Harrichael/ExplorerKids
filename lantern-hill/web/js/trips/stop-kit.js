import * as THREE from 'three';
import { makeLabel } from '../characters/build.js';
import { PERSONA } from '../characters/cast.js';
import { C, T, XF, add, box, cyl, grp, leafCloud, mergeGeos, meshOf, outlineMat, rrect, sparkTex, tex } from '../core/kit.js';
import { Sound } from '../core/sound.js';
import { addUsable, makeWorld } from '../core/world.js';
import { blob, hero, player } from '../player.js';
import { collect, has } from '../samples/index.js';
import { game } from '../state.js';

// A field trip place: a world whose frame update runs whatever its builders pushed onto w.anims.
export function tripWorld(o){
  const w = makeWorld(o); w.anims = [];
  w.update = (dt, t) => w.anims.forEach(f => f(dt, t));
  return w;
}
// a soft round puff, for steam, smoke and bubbles
export const puffTex = tex(64, 64, (c, w, h) => { const g = c.createRadialGradient(32, 32, 0, 32, 32, 32); g.addColorStop(0, 'rgba(255,255,255,.9)'); g.addColorStop(.55, 'rgba(255,255,255,.45)'); g.addColorStop(1, 'rgba(255,255,255,0)'); c.fillStyle = g; c.fillRect(0, 0, w, h); });
puffTex.wrapS = puffTex.wrapT = THREE.ClampToEdgeWrapping;
// a column of puffs rising from a spot and fading as they go; puffs(w, x, y, z, {rate, rise, size, color})
export function puffs(w, x, y, z, {rate = 3, rise = 1.2, size = 1, color = 0xffffff, opacity = .55, spread = .3, life = 2.4} = {}){
  const all = [], src = {x, y, z, rate, burst:0};
  for (let i = 0; i < Math.ceil(rate*life) + 8; i++) { const s = new THREE.Sprite(new THREE.SpriteMaterial({map:puffTex, color, transparent:true, depthWrite:false, opacity:0})); s.visible = false; w.scene.add(s); all.push({s, age:life}); }
  let acc = 0, next = 0;
  w.anims.push(dt => {
    acc += dt*(src.rate + src.burst*12); src.burst = Math.max(0, src.burst - dt);
    while (acc >= 1) { acc -= 1; const p = all[next]; next = (next + 1) % all.length; p.age = 0; p.dx = (Math.random() - .5)*spread; p.dz = (Math.random() - .5)*spread; p.s.visible = true; }
    for (const p of all) { if (p.age >= life) { p.s.visible = false; continue; } p.age += dt; const k = p.age/life;
      p.s.position.set(src.x + p.dx*(1 + k*3), src.y + k*rise*life, src.z + p.dz*(1 + k*3)); p.s.scale.setScalar(size*(.4 + k*1.6)); p.s.material.opacity = opacity*Math.sin(Math.PI*Math.min(1, k*1.3)); }
  });
  return src;
}
export function spawnNPC(w, pid, x, z, ry, lines = []){
  const p = PERSONA[pid], model = p.make();
  model.root.traverse(m => { if (m.isMesh && m.material !== outlineMat) m.castShadow = true; });
  const y = w.ground(x, z); model.root.position.set(x, y, z); model.root.rotation.y = ry; w.scene.add(model.root);
  const label = makeLabel(p.name, p.dot); label.position.set(x, y + p.labelY, z); w.scene.add(label);
  const n = {model, x, y, z, gy:y, baseAngle:ry, label, labelY:p.labelY, line:0, t:Math.random()*10, range:1.7,
    blinkAt:1 + Math.random()*3, name:p.name, role:p.role, dot:p.dot, voice:p.voice, kind:p.kind, persona:p, lines, walk:0};
  w.npcs.push(n); return n;
}
// The Wonder Bus door is barely a metre high and everyone is taller, Dr. Sparks most of all. So they
// shrink to fit as they hop up to it, magic-bus style, and their heads never go through the wall above.
const DOOR = 1.0, smooth = k => (k = Math.min(1, Math.max(0, k)), k*k*(3 - 2*k));
// with a little hop, up through a door at [x, y, z] just inside the wall, and gone from sight; resolves once they're in.
// They start about half a metre out, so they've shrunk before they meet the wall.
export function hopIn(n, [x, y, z], s = .45){
  const x0 = n.x, y0 = n.y, z0 = n.z, t0 = game.elapsed, m = n.model.root, sc = m.scale.x, fit = Math.min(1, DOOR/(n.labelY - .25));
  n.range = 0; n.label.visible = false; n.pose = null; m.rotation.y = n.baseAngle = Math.atan2(x - x0, z - z0);
  Sound.tone(440, {type:'triangle', dur:.14, vol:.05, f2:880});
  return frames(() => { const u = Math.min(1, (game.elapsed - t0)/s);
    // high enough to clear the step, which is well off the ground
    n.x = x0 + (x - x0)*u; n.z = z0 + (z - z0)*u; n.y = y0 + (y - y0)*u + Math.sin(u*Math.PI)*.45;
    m.position.set(n.x, n.y, n.z); m.scale.setScalar(sc*(1 - (1 - fit)*smooth(u/.55)));
    if (u < 1) return false; m.visible = false; m.scale.setScalar(sc); return true; });
}
// the explorer too: one bouncy leap from wherever they stand, shrinking to fit over the last stretch to the door
export function heroHopIn([x, z], s = .55){
  const x0 = player.x, z0 = player.z, t0 = game.elapsed, sc = hero.root.scale.x, fit = DOOR/1.75;
  player.angle = Math.atan2(x - x0, z - z0); player.y += .06; player.vy = 22*s/2;
  Sound.tone(392, {type:'triangle', dur:.18, vol:.06, f2:880});
  return frames(() => { const u = Math.min(1, (game.elapsed - t0)/s);
    player.x = x0 + (x - x0)*u; player.z = z0 + (z - z0)*u;
    hero.root.scale.setScalar(sc*(1 - (1 - fit)*smooth((1.2 - Math.hypot(x - player.x, z - player.z))/.75)));
    if (u < 1) return false; hero.root.visible = blob.visible = false; hero.root.scale.setScalar(sc);
    // the bus faded to show them climbing in; with them gone it's solid again at once
    game.world.occluders.forEach(o => { o.cur = 1; }); return true; });
}
const frames = test => new Promise(ok => { const f = () => test() ? ok() : requestAnimationFrame(f); f(); });
export function signpost(x, z, text, y0 = 0, ry = 0){
  const g = grp(x, y0, z, ry);
  cyl(.06, .07, 1.4, T(C.woodDk), 0, .7, 0, g, 6);
  const t = tex(320, 110, (c, cw, ch) => { c.fillStyle = '#8a5a3a'; rrect(c, 5, 5, cw - 10, ch - 10, 16); c.fill(); c.strokeStyle = '#4a2e22'; c.lineWidth = 7; rrect(c, 5, 5, cw - 10, ch - 10, 16); c.stroke();
    c.fillStyle = '#f6ecd6'; c.font = `800 ${text.length > 11 ? 34 : 42}px Nunito, sans-serif`; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(text, cw/2, ch/2 + 2); });
  box(1.8, .62, .08, T(C.woodDk), 0, 1.45, 0, g);
  add(new THREE.PlaneGeometry(1.75, .6), T(0xffffff, {map:t, transparent:true}), 0, 1.45, .045, g, false);
  return g;
}

export function miniTree(x, y, z, s, parent){ const g = grp(x, y, z, 0, parent);
  meshOf(mergeGeos([[new THREE.CylinderGeometry(.05*s, .09*s, .5*s, 8), XF(0, .25*s, 0)]]), C.woodDk, g, .02*s);
  leafCloud(g, [[0, .68*s, 0, .26*s, 1], [.17*s, .6*s, .08*s, .17*s, 0], [-.16*s, .62*s, -.06*s, .18*s, 1], [.02*s, .86*s, .02*s, .16*s, 2]], .025*s);
  return g; }

// Something a curious explorer can stop and look closer at, off the trip's path: the camera leans in
// and a few lines of real science play. Each can be seen once; w.curios counts what has been.
//   curio(w, t, {name:'Fuzzy crabs', at:[x, z], y:1.2, view:[-.6, 1], lines:[['sparks', "Yeti crabs!"]]})
// A find out of reach is used from where the explorer can stand, `from`. pre() plays out first (a guess,
// say), act() starts as the look does and runs alongside it, and post() follows once it's over.
export function curio(w, t, {name, at:[x, z], y, lines, view = [0, 1], lift = .6, verb = 'Look closer', from, pre, act, post}){
  const c = w.curios || (w.curios = {all:[], seen:new Set()}); c.all.push(name);
  const [ax, az] = from || [x, z];
  return addUsable(w, {name, verb, short:'Look', x:ax, z:az, y:w.ground(ax, az), range:2.2, glow:[x, y, z], when: () => !c.seen.has(name) && !t.busy,
    async action(){
      if (game.cutscene) return;
      const gone = e => { if (!t.gone) throw e; };
      if (pre) { game.cutscene = true; try { await pre(); } catch (e) { return gone(e); } finally { game.cutscene = false; } }
      if (act) (async () => act())().catch(gone);
      c.seen.add(name); game.cutscene = true;
      const [vx, vz] = view, d = Math.hypot(vx, vz), ux = vx/d, uz = vz/d, cy = w.ground(x, z);
      // the explorer steps well aside, to whichever side there's ground, and peers in from the edge of the
      // shot, so the find has it to itself
      for (const sd of [2.2, -2.2]) { const sx = x + ux*.3 + uz*sd, sz = z + uz*.3 - ux*sd;
        if (!w.bounds || w.bounds(sx, sz)) { player.x = sx; player.z = sz; player.angle = Math.atan2(x - sx, z - sz); break; } }
      player.pose = 'peer';
      t.cut((pos, look) => { pos.set(x + ux*4.6, cy + lift + 1.8, z + uz*4.6); look.set(x, cy + lift, z); });
      try { await t.say(lines); } catch (e) { return gone(e); } finally { player.pose = null; }
      t.cut(null); game.cutscene = false;
      if (post) post();
    }});
}

// Samples for the microscope at home (samples/index.js), tucked somewhere for the explorer who wanders:
// a glint now and then draws the eye, and taking it is quick, a note and a cheer with no talk. Dr. Sparks
// says a word about the first few only. The place draws what's there; a spot found before is just scenery.
//   sample(w, t, {ids:['ash'], at:[x, z], y:1.2, verb:'Scoop up some ash'})
const SPARKS_ON = ["A sample, {name}! Keep it safe in your backpack. We'll look at it under my microscope back home.",
  "More for your collection! You have sharp eyes, {name}.", "Look at you, {name}. A real sample collector!"];
export function sample(w, t, {ids, at:[x, z], y, verb, from, range = 1.6}){
  if (ids.every(has)) return null;
  const [ax, az] = from || [x, z];
  const glint = new THREE.Sprite(new THREE.SpriteMaterial({map:sparkTex, color:0xfff0c0, transparent:true, depthWrite:false, blending:THREE.AdditiveBlending, opacity:0}));
  glint.position.set(x, y, z); w.scene.add(glint);
  const phase = (x*7.3 + z*3.1) % 5;
  // a twinkle every few seconds, like sun catching something, rather than a steady beacon
  w.anims.push((dt, tt) => { if (!glint.visible) return; const k = ((tt + phase) % 4.2)/.7;
    glint.material.opacity = k < 1 ? Math.sin(k*Math.PI)*.95 : 0; glint.scale.setScalar(.25 + (k < 1 ? Math.sin(k*Math.PI)*.45 : 0)); glint.material.rotation = tt*.6; });
  let taken = false;
  const u = addUsable(w, {name:'Sample', verb, short:'Take', x:ax, z:az, y:w.ground(ax, az), range, glow:[x, y, z], when: () => !taken && !t.busy,
    async action(){
      if (game.cutscene || taken) return;
      taken = true; glint.visible = false; w.scene.remove(glint);
      const told = collect(ids);
      if (told === null || told >= SPARKS_ON.length) return;
      try { await t.wait(1.4); await t.say([['sparks', SPARKS_ON[told]]]); } catch (e) { if (!t.gone) throw e; }
    }});
  return u;
}
