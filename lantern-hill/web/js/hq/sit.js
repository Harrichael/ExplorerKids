// Walking the explorer to a spot and sitting (or lying) them down there, and later standing them back
// up: the choreography HQ's sit-down activities share. The player has no control while it runs.
//
//   sitDown({x, z, angle, pose, seated})   // pose(p) bends the hero from standing (0) to sat (1);
//                                          // seated() runs once they are down
//   standUp()                              // the reverse; control comes back once they are up
//
// pose() is applied over the hero's resting pose every frame, so it only sets what it changes. An
// activity can layer more on top (arms that hold something, say) from its own hqAnims callback.

import { ease } from '../core/kit.js';
import { Sound } from '../core/sound.js';
import { blocked, hero, player } from '../player.js';
import { game } from '../state.js';
import { hqAnims } from './scene.js';

let s = null;
const parts = () => [hero.legL, hero.legR, hero.armL, hero.armR, hero.head, hero.body];

export function sitDown(spot){
  if (s || game.cutscene) return false;
  s = Object.assign({phase:'walk', walk:0, p:0, rest:parts().map(l => l.quaternion.clone())}, spot);
  game.cutscene = true; return true;
}
export function standUp(){
  if (!s || s.phase === 'rise') return;
  s.phase = 'rise'; s.from = {x:player.x, z:player.z}; s.to = clear(player.x, player.z);
}
// A spot snug against a seat leaves the explorer overlapping the seat's collider, and from inside a
// collider every step is blocked. They step to the nearest free spot as they rise.
function clear(x, z){
  if (!blocked(x, z, player.y)) return null;
  for (let r = .05; r <= 1.5; r += .05) for (let k = 0; k < 24; k++) {
    const a = k/24*Math.PI*2, cx = x + Math.sin(a)*r, cz = z + Math.cos(a)*r;
    if (!blocked(cx, cz, player.y)) return {x:cx, z:cz};
  }
  return null;
}

function rest(){
  parts().forEach((l, i) => l.quaternion.copy(s.rest[i])); hero.body.position.set(0, 0, 0);
  hero.root.position.set(player.x, player.y, player.z); hero.root.rotation.y = player.angle;
}
function turnTo(a, k){ let d = a - player.angle; d = Math.atan2(Math.sin(d), Math.cos(d)); player.angle += d*Math.min(1, k); return Math.abs(d); }
hqAnims.push(dt => {
  if (!s) return;
  if (s.phase === 'walk') {
    const dx = s.x - player.x, dz = s.z - player.z, d = Math.hypot(dx, dz);
    if (d < .04) s.phase = 'turn';
    else { const st = Math.min(d, 3.2*dt); player.x += dx/d*st; player.z += dz/d*st; turnTo(Math.atan2(dx, dz), dt*12); s.walk += dt*9.5;
      const sg = Math.sign(Math.sin(s.walk)); if (sg !== player.lastStepSign && sg !== 0) { player.lastStepSign = sg; Sound.step('wood'); } }
    rest(); const sw = Math.sin(s.walk)*.7; hero.legL.rotation.x = sw; hero.legR.rotation.x = -sw;
  } else if (s.phase === 'turn') {
    if (turnTo(s.angle, dt*9) < .05) s.phase = 'sit';
    rest();
  } else if (s.phase === 'rise') {
    s.p = Math.max(0, s.p - dt/.5);
    if (s.to) { const k = ease(1 - s.p); player.x = s.from.x + (s.to.x - s.from.x)*k; player.z = s.from.z + (s.to.z - s.from.z)*k; }
    rest(); s.pose(ease(s.p)); hero.body.position.y += Math.sin(s.p*Math.PI)*.1;
    if (s.p <= 0) { rest(); s = null; game.cutscene = false; }
  } else {
    s.p = Math.min(1, s.p + dt/.5); rest(); s.pose(ease(s.p));
    if (s.phase === 'sit' && s.p >= 1) { s.phase = 'seated'; if (s.seated) s.seated(); }
  }
});
