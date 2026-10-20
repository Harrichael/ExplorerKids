// An earthquake, wherever stuck rock has just snapped: the camera and the place shake, the class drops,
// covers and holds on, Basil freezes until the explorer shows him how, and the explorer presses the key to
// do it too. Called from inside a find's scene, which goes on once the ground is still.
//
//   await quake(w, t, cls, {where:[x, z], strength:1, lines:[['sparks', "That jolt was an earthquake."]]});
//
// where: what the camera looks toward, past the explorer. lines: said once it's over.
// While it shakes, w.shake runs from strength down to 0, for anything in the place that ought to sway.

import { Sound } from '../../core/sound.js';
import { coarse } from '../../input.js';
import { player } from '../../player.js';
import { game } from '../../state.js';

export async function quake(w, t, cls, {where = [player.x, player.z - 4], strength = 1, lines = []} = {}){
  if (!w.shakes) { w.shakes = true; w.shake = 0; let next = 0;
    w.anims.push((dt, tt) => { if (!(w.shake > 0)) return;
      game.camShake = Math.max(game.camShake, 3.6*w.shake);
      if (tt > next) { next = tt + .42; Sound.hiss({dur:.7, vol:.2*Math.min(1, w.shake), type:'lowpass', freq:180}); Sound.tone(46, {dur:.8, vol:.2*Math.min(1, w.shake), f2:30}); } }); }
  const n = cls.n, poses = {};
  for (const id in n) { poses[id] = n[id].pose; n[id].pose = id === 'basil' ? null : 'cover'; }
  t.onEnd(() => { player.pose = null; w.shake = 0; });
  const near = (pos, look) => { const dx = where[0] - player.x, dz = where[1] - player.z, d = Math.hypot(dx, dz) || 1;
    pos.set(player.x - dx/d*4.6 + 1.2, player.y + 3.4, player.z - dz/d*4.6); look.set(player.x + dx/d*1.2, player.y + .6, player.z + dz/d*1.2); };
  t.cut(near);
  w.shake = strength;
  await t.wait(.9);
  // the shaking holds while the explorer does the right thing, with a nudge if they don't. The key goes
  // wherever they do, so there is no spot to find and no way to walk out of it.
  let covered = false; const nudge = game.elapsed + 6, VERB = 'Drop, cover, hold on!';
  const cover = t.free(t.use(w, {name:'Drop, cover, hold on', x:player.x, z:player.z, y:player.y, range:5, verb:VERB, short:VERB, glow:[player.x, player.y + 2.2, player.z], big:true}),
    'The ground is shaking! What do you do?').then(() => { covered = true; });
  const u = w.usables.find(u => u.verb === VERB);
  const follow = () => { if (covered || !u) return; u.x = player.x; u.z = player.z; u.y = player.y; u.glow[0] = player.x; u.glow[1] = player.y + 2.2; u.glow[2] = player.z; u.sparkle.position.set(...u.glow); };
  w.anims.push(follow);
  await t.until(() => covered || game.elapsed > nudge);
  if (!covered) await t.say([['basil', "{name}! What do we do?!"], ['sparks', coarse ? "Drop, cover, and hold on! Tap the big button!" : "Drop, cover, and hold on! Press E!"]]);
  await cover;
  w.anims.splice(w.anims.indexOf(follow), 1);
  t.cut(near); player.pose = 'cover';
  Sound.tone(392, {type:'triangle', dur:.15, vol:.07});
  await t.wait(.9);
  n.basil.pose = 'cover';
  await t.say([['basil', "Drop, cover, hold on. Like {name}!"]]);
  await t.tween(2.6, k => { w.shake = strength*(1 - k*k); });
  w.shake = 0;
  await t.wait(.8);
  for (const id in n) n[id].pose = poses[id];
  player.pose = null;
  if (lines.length) await t.say(lines);
}
