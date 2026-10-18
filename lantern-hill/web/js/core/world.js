// ---------- world building blocks ----------

import * as THREE from 'three';
import { BUILD, glowTex } from './kit.js';

export function makeWorld(o){
  const s = new THREE.Scene(); s.background = new THREE.Color(o.bg); s.fog = new THREE.Fog(o.bg, o.fogNear || 22, o.fogFar || 50);
  s.add(new THREE.HemisphereLight(o.sky || 0xa597d0, o.groundCol || 0x4a3626, o.hemi || .65));
  const sn = new THREE.DirectionalLight(o.sunCol || 0xffd9b0, o.sunI || .75); sn.castShadow = true; sn.shadow.mapSize.set(2048, 2048);
  Object.assign(sn.shadow.camera, {left:-16, right:16, top:16, bottom:-16, near:1, far:60}); sn.shadow.bias = -.0006; s.add(sn, sn.target);
  return {scene:s, colliders:[], occluders:[], occMeshes:[], npcs:[], usables:[], sun:sn, cam:o.cam || null, title:o.title,
    ground: () => 0, surface: () => 'stone', area: () => o.title, bounds: null, cleared: false};
}
export function inWorld(w, fn){
  const prev = {scene:BUILD.scene, colliders:BUILD.colliders, occluders:BUILD.occluders, occMeshes:BUILD.occMeshes};
  Object.assign(BUILD, {scene:w.scene, colliders:w.colliders, occluders:w.occluders, occMeshes:w.occMeshes});
  try { fn(); } finally { Object.assign(BUILD, prev); }
}
export function addUsable(w, u){
  u.sparkle = new THREE.Sprite(new THREE.SpriteMaterial({map:glowTex, transparent:true, depthWrite:false, blending:THREE.AdditiveBlending, color:0xffe39a, opacity:0}));
  u.sparkle.scale.set(.7, .7, 1); u.sparkle.position.set(u.glow[0], u.glow[1], u.glow[2]); w.scene.add(u.sparkle);
  w.usables.push(u); return u;
}
