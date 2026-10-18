// The home world's scene and the lists its area builders fill in. Importing this points the
// build kit at HQ, so every area module must import it before building anything.

import * as THREE from 'three';
import { BUILD } from '../core/kit.js';

export const scene = new THREE.Scene();
scene.background = new THREE.Color(0x2a2240);
scene.fog = new THREE.Fog(0x2a2240, 22, 60);

scene.add(new THREE.HemisphereLight(0xa597d0, 0x4a3626, 0.62));
export const sun = new THREE.DirectionalLight(0xffb47c, 0.72);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
Object.assign(sun.shadow.camera, {left:-15, right:15, top:15, bottom:-15, near:1, far:60});
sun.shadow.bias = -0.0006;
scene.add(sun, sun.target);

export const colliders = [];
export const occluders = [], occMeshes = [];
Object.assign(BUILD, {scene, colliders, occluders, occMeshes});

// per-frame animations of HQ props, run only while the player is home
export const hqAnims = [];
