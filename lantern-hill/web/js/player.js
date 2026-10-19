import * as THREE from 'three';
import { human } from './characters/build.js';
import { outlineMat } from './core/kit.js';
import { cfg, heroOpts } from './explorer.js';
import { game } from './state.js';

export let hero = null;
export function buildHero(){
  const old = hero;
  hero = human(heroOpts(cfg));
  hero.root.traverse(m => { if (m.isMesh && m.material !== outlineMat) m.castShadow = true; });
  hero.root.position.set(player.x, player.y, player.z); hero.root.rotation.y = player.angle;
  if (old) hero.root.visible = old.root.visible;
  if (game.world) game.world.scene.add(hero.root);
  if (old) { if (old.root.parent) old.root.parent.remove(old.root); old.root.traverse(m => { if (m.isMesh && m.material !== outlineMat) m.geometry.dispose(); }); }
}
// a soft round shadow under the hero, which enterWorld() carries from world to world
export const blob = new THREE.Mesh(new THREE.CircleGeometry(.42,20), new THREE.MeshBasicMaterial({color:0x120c18, transparent:true, opacity:.28, depthWrite:false}));
blob.position.set(0, .05, 0); blob.rotation.x = -Math.PI/2; blob.receiveShadow = true;

export const player = {x:0, y:0, z:2.6, vy:0, angle:Math.PI, walk:0, lastStepSign:0, pose:null};
const R = .36, H = 1.5;

export function blocked(x, z, y){
  if (game.world.bounds && !game.world.bounds(x, z)) return true;
  if (game.world.ground(x, z) > y + .45) return true;
  for (const c of game.world.colliders) {
    if (y + H <= c.minY || y >= c.maxY - .05) continue;
    if (x + R > c.minX && x - R < c.maxX && z + R > c.minZ && z - R < c.maxZ) return true;
  }
  return false;
}
