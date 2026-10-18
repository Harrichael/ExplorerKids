import * as THREE from 'three';

export const canvas = document.getElementById('world');
export const renderer = new THREE.WebGLRenderer({canvas, antialias:true});
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputEncoding = THREE.sRGBEncoding;

export const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 120);

function resize(){
  const w = innerWidth, h = innerHeight;
  renderer.setSize(w, h, false);
  camera.aspect = w / h; camera.fov = w < h ? 56 : 44;
  camera.updateProjectionMatrix();
}
addEventListener('resize', resize); resize();
