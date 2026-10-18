// A thick storybook lying open on a wooden desk, on a small three.js stage of its own. The book
// knows its shape (page size, how thick each side's stack is, how a page curls as it turns);
// callers choose what is printed on the pages and where the camera looks.
//
// The book lies in the XZ plane with its spine along z at x = 0: the right-hand page spans
// x 0..W, the left-hand page -W..0, and the top of each page faces -z.

import * as THREE from 'three';
import { C, T, outline, rrect, shade, tex } from '../core/kit.js';

const H = 3, MARGIN = .17, BOARD = .12, STACK = .5, SEG = 32, LIFT = .004;

// a seeded random of its own, so the desk grain is the same on every page load (the cross-reload
// page turn repaints a saved frame of this desk) and so building a book never shifts kit's world seed
const seeded = s => () => (s = (s * 16807) % 2147483647) / 2147483647;

function deskTex(){
  const r = seeded(29);
  return tex(1024, 1024, (g, w, h) => {
    const n = 5, ph = h/n, tones = ['#7b4b30', '#86553a', '#704329', '#8c5b3b', '#774a2f'];
    for (let i = 0; i < n; i++) {
      const y0 = i*ph; g.fillStyle = tones[i]; g.fillRect(0, y0, w, ph);
      // long grain lines; whole sine periods across the width so the texture tiles without a seam
      for (let k = 0; k < 46; k++) {
        const yy = y0 + r()*ph, a = 2 + r()*7, f = 1 + Math.floor(r()*3), ph0 = r()*6.3, light = r() < .35;
        g.strokeStyle = light ? `rgba(196,140,92,${.12 + r()*.16})` : `rgba(48,24,14,${.14 + r()*.2})`; g.lineWidth = .8 + r()*2.2;
        g.beginPath(); for (let x = 0; x <= w; x += 8) { const y = yy + Math.sin(x/w*Math.PI*2*f + ph0)*a; x ? g.lineTo(x, y) : g.moveTo(x, y); } g.stroke();
      }
      for (let k = 0; k < 2; k++) { // knots
        const kx = r()*w, ky = y0 + ph*(.25 + r()*.5), kr = 7 + r()*9;
        for (let j = 4; j >= 0; j--) { g.strokeStyle = `rgba(52,26,14,${.18 + j*.07})`; g.lineWidth = 1.6; g.beginPath(); g.ellipse(kx, ky, kr*(1 + j*.9), kr*(.45 + j*.25), 0, 0, Math.PI*2); g.stroke(); }
      }
      g.fillStyle = 'rgba(28,14,8,.75)'; g.fillRect(0, y0, w, 4); g.fillStyle = 'rgba(230,180,130,.18)'; g.fillRect(0, y0 + 4, w, 2);
    }
  }, 3, 3);
}
function paperTex(){
  const r = seeded(5);
  return tex(256, 256, (g, w, h) => {
    g.fillStyle = '#f3e7cf'; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 900; i++) { g.fillStyle = r() < .5 ? 'rgba(160,120,70,.05)' : 'rgba(255,255,255,.08)'; g.fillRect(r()*w, r()*h, 1 + r()*3, 1); }
  });
}
// the edges of the page block: fine ruled lines of paper
function edgeTex(){
  return tex(8, 64, (g, w, h) => { g.fillStyle = '#efe2c4'; g.fillRect(0, 0, w, h); for (let y = 2; y < h; y += 5) { g.fillStyle = y % 3 ? 'rgba(150,115,70,.35)' : 'rgba(150,115,70,.55)'; g.fillRect(0, y, w, 1.4); } });
}
// soft dark falloff from one edge, for the gutter and the shadow a lifted page throws
function fadeTex(){
  const t = tex(128, 4, (g, w) => { const gr = g.createLinearGradient(0, 0, w, 0); gr.addColorStop(0, 'rgba(40,20,10,1)'); gr.addColorStop(.18, 'rgba(40,20,10,.45)'); gr.addColorStop(1, 'rgba(40,20,10,0)'); g.fillStyle = gr; g.fillRect(0, 0, w, 4); });
  t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping; return t;
}
function shadowTex(){
  const t = tex(256, 256, (g, w, h) => { g.shadowColor = 'rgba(0,0,0,1)'; g.shadowBlur = 26; g.shadowOffsetX = w; g.fillStyle = '#000'; rrect(g, -w + 30, 30, w - 60, h - 60, 18); g.fill(); });
  t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping; return t;
}
// a flat w x h quad lying on the desk, its image upright when seen from above; mirror flips it left to right
function flatGeo(w, h, x, mirror){
  const g = new THREE.PlaneGeometry(w, h); g.rotateX(-Math.PI/2); g.translate(x, 0, 0);
  if (mirror) { const uv = g.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setX(i, 1 - uv.getX(i)); }
  return g;
}
function roundedBox(w, d, t, r){
  const s = new THREE.Shape(), x = -w/2, y = -d/2;
  s.moveTo(x + r, y); s.lineTo(x + w - r, y); s.quadraticCurveTo(x + w, y, x + w, y + r); s.lineTo(x + w, y + d - r); s.quadraticCurveTo(x + w, y + d, x + w - r, y + d);
  s.lineTo(x + r, y + d); s.quadraticCurveTo(x, y + d, x, y + d - r); s.lineTo(x, y + r); s.quadraticCurveTo(x, y, x + r, y);
  const b = t*.32, g = new THREE.ExtrudeGeometry(s, {depth:t - 2*b, bevelEnabled:true, bevelThickness:b, bevelSize:b, bevelSegments:3, curveSegments:6});
  g.rotateX(-Math.PI/2); g.translate(0, b, 0); return g;   // base at y = 0, top at y = t
}
function frameGeo(w, d, inset, band){
  const ring = (x, y, ww, dd) => { const s = new THREE.Shape(); s.moveTo(x, y); s.lineTo(x + ww, y); s.lineTo(x + ww, y + dd); s.lineTo(x, y + dd); s.lineTo(x, y); return s; };
  const s = ring(-w/2 + inset, -d/2 + inset, w - 2*inset, d - 2*inset), hole = ring(-w/2 + inset + band, -d/2 + inset + band, w - 2*(inset + band), d - 2*(inset + band));
  s.holes.push(hole); const g = new THREE.ExtrudeGeometry(s, {depth:.012, bevelEnabled:false}); g.rotateX(-Math.PI/2); return g;
}
function cornerGeo(leg){
  const s = new THREE.Shape(); s.moveTo(0, 0); s.lineTo(leg, 0); s.quadraticCurveTo(leg*.45, leg*.45, 0, leg); s.lineTo(0, 0);
  const g = new THREE.ExtrudeGeometry(s, {depth:.02, bevelEnabled:true, bevelThickness:.012, bevelSize:.012, bevelSegments:2}); g.rotateX(-Math.PI/2); return g;
}

export function makeStorybook(canvas){
  const renderer = new THREE.WebGLRenderer({canvas, antialias:true});
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2)); renderer.outputEncoding = THREE.sRGBEncoding;
  const scene = new THREE.Scene(), camera = new THREE.PerspectiveCamera(35, 1, .05, 80);
  scene.background = new THREE.Color(0x2a1a14);
  scene.add(new THREE.HemisphereLight(0xfff2dd, 0x5a3a50, .6));
  const key = new THREE.DirectionalLight(0xffe2bf, .5); key.position.set(-3, 6, 4); scene.add(key);
  const desk = new THREE.Mesh(flatGeo(60, 60, 0), T(0xffffff, {map:deskTex()})); desk.material.map.repeat.set(14, 14); scene.add(desk);
  const paper = paperTex(), edges = edgeTex(), fade = fadeTex(), shadowT = shadowTex();
  const group = new THREE.Group(); scene.add(group);
  let W = H, stackL = .5, stackR = .5, dim = 0, turnP = 0, meshes = null;

  function build(){
    while (group.children.length) { const o = group.children.pop(); o.traverse(m => { if (m.geometry) m.geometry.dispose(); }); }
    const bw = W + MARGIN, bd = H + 2*MARGIN, plum = T(shade(C.plum, .45)), gold = T(shade(C.gold, .8));
    const shadow = new THREE.Mesh(flatGeo(2*bw + 1.1, bd + 1.1, 0), new THREE.MeshBasicMaterial({map:shadowT, transparent:true, opacity:.6, depthWrite:false}));
    shadow.position.y = .003; group.add(shadow);
    for (const sd of [-1, 1]) {
      // the cover board: bigger than the pages, rounded and bevelled, with a gold rule and corner caps
      const board = outline(new THREE.Mesh(roundedBox(bw, bd, BOARD, .1), plum), 1.012); board.position.set(sd*(bw/2 + .015), 0, 0); group.add(board);
      const rule = new THREE.Mesh(frameGeo(bw, bd, .05, .03), gold); rule.position.set(board.position.x, BOARD, 0); group.add(rule);
      for (const sz of [-1, 1]) {
        // the cap's legs run +x and -z from its corner; turn them to point inward from this corner
        const cap = new THREE.Mesh(cornerGeo(.34), gold); cap.rotation.y = sd > 0 ? (sz > 0 ? Math.PI/2 : Math.PI) : (sz > 0 ? 0 : -Math.PI/2);
        cap.position.set(sd*(bw + .015 - .012), BOARD + .001, sz*(bd/2 - .012)); group.add(cap);
      }
    }
    const spine = new THREE.Mesh(new THREE.CylinderGeometry(.1, .1, bd - .02, 14), plum); spine.rotation.x = Math.PI/2; spine.position.y = BOARD*.5; group.add(spine);
    const block = sd => { const sideM = T(0xffffff, {map:edges}), m = new THREE.Mesh(new THREE.BoxGeometry(W - .02, 1, H), [sideM, sideM, T(0xf3e7cf), sideM, sideM, sideM]); m.position.x = sd*(W/2 + .01); group.add(m); return m; };
    const page = (sd, map) => { const m = new THREE.Mesh(flatGeo(W, H, sd*W/2), new THREE.MeshBasicMaterial({map})); group.add(m); return m; };
    const gutter = sd => { const m = new THREE.Mesh(flatGeo(W, H, sd*W/2, sd < 0), new THREE.MeshBasicMaterial({map:fade, transparent:true, opacity:0, depthWrite:false})); m.visible = false; group.add(m); return m; };
    // the turning page: one strip of columns bent around the spine, an image on each face
    const fg = new THREE.PlaneGeometry(W, H, SEG, 1); fg.rotateX(-Math.PI/2); fg.translate(W/2, 0, 0);
    fg.setAttribute('color', new THREE.BufferAttribute(new Float32Array(fg.attributes.position.count*3).fill(1), 3));
    const bg = new THREE.BufferGeometry(); bg.setIndex(fg.index); bg.setAttribute('position', fg.attributes.position); bg.setAttribute('color', fg.attributes.color);
    const buv = fg.attributes.uv.clone(); for (let i = 0; i < buv.count; i++) buv.setX(i, 1 - buv.getX(i)); bg.setAttribute('uv', buv);
    const front = new THREE.Mesh(fg, new THREE.MeshBasicMaterial({map:paper, vertexColors:true})), back = new THREE.Mesh(bg, new THREE.MeshBasicMaterial({map:paper, vertexColors:true, side:THREE.BackSide}));
    front.frustumCulled = back.frustumCulled = false;
    const turning = new THREE.Group(); turning.add(front, back); turning.visible = false; group.add(turning);
    meshes = {blockL:block(-1), blockR:block(1), left:page(-1, paper), right:page(1, paper), gutL:gutter(-1), gutR:gutter(1), turning, front, back, base:fg.attributes.position.array.slice()};
    stack(); sb.curl(0);
  }
  const height = f => f > 0 ? .02 + f*STACK : 0;
  function stack(){
    for (const [blk, pg, gut, f] of [[meshes.blockL, meshes.left, meshes.gutL, stackL], [meshes.blockR, meshes.right, meshes.gutR, stackR]]) {
      const h = height(f); blk.visible = f > 0; blk.scale.y = Math.max(h, .001); blk.position.y = BOARD + h/2;
      pg.position.y = BOARD + h + .001; gut.position.y = pg.position.y + .0015;
    }
  }
  const sb = {renderer, scene, camera, paper,
    get W(){ return W; }, get H(){ return H; }, MARGIN,
    // page width over height; the transition matches it to the screen, the reader to its book
    setAspect(a){ if (meshes && Math.abs(H*a - W) < 1e-9) return; W = H*a; build(); },
    resize(w, h){ renderer.setSize(w, h, false); camera.aspect = w/h; camera.updateProjectionMatrix(); },
    // a null page leaves that side showing the open cover board alone
    setPages(left, right){
      for (const [m, t] of [[meshes.left, left], [meshes.right, right]]) { m.visible = !!t; if (t && m.material.map !== t) { m.material.map = t; m.material.needsUpdate = true; } }
    },
    // how full each side's stack of pages is, 0..1; 0 leaves no pages on that side
    setStacks(l, r){ stackL = l; stackR = r; stack(); sb.curl(turnP); },
    pageY(side){ return (side < 0 ? meshes.left : meshes.right).position.y; },
    turnY(){ return meshes.turning.position.y; },
    // gutter shading over the resting pages, 0..1: 0 leaves the page images exactly as they are
    setShade(k){ dim = k; sb.curl(turnP); },
    turnPage(front, back){
      for (const [m, t] of [[meshes.front, front], [meshes.back, back]]) if (m.material.map !== t) { m.material.map = t; m.material.needsUpdate = true; }
      meshes.turning.visible = true;
    },
    settle(){ meshes.turning.visible = false; sb.curl(0); },
    // p runs 0 (lying on the right) to 1 (lying on the left); lead > 0 curls the free edge ahead
    // when turning forward, < 0 when turning back, 0 turns the page stiff
    curl(p, lead = 0){
      turnP = p;
      const a = meshes.front.geometry.attributes.position, col = meshes.front.geometry.attributes.color, base = meshes.base, n = SEG + 1;
      const xs = [0], ys = [0], sh = [1], k = Math.sin(Math.PI*p)*.65*lead;
      for (let i = 1, x = 0, y = 0; i < n; i++) {
        const ang = Math.max(0, Math.min(Math.PI, p*Math.PI + k*i/SEG));
        x += Math.cos(ang)*W/SEG; y += Math.sin(ang)*W/SEG; xs.push(x); ys.push(y); sh.push(1 - .32*Math.sin(ang));
      }
      // shaded a little warmer as it tips away from the light; lying flat it is exactly its image
      for (let v = 0; v < a.count; v++) { const i = v % n, d = 1 - sh[i]; a.setXYZ(v, xs[i], ys[i], base[v*3 + 2]); col.setXYZ(v, sh[i], sh[i] - d*.06, sh[i] - d*.15); }
      a.needsUpdate = col.needsUpdate = true;
      meshes.turning.position.y = meshes.right.position.y + (meshes.left.position.y - meshes.right.position.y)*p + LIFT;
      // the turning page darkens the side it is leaving and the side it is about to cover
      const lift = meshes.turning.visible ? Math.sin(Math.PI*p)*.38 : 0;
      for (const [g, o] of [[meshes.gutL, dim*.32 + lift*p], [meshes.gutR, dim*.32 + lift*(1 - p)]]) { g.material.opacity = o; g.visible = o > .002; }
    },
    render(){ renderer.render(scene, camera); }
  };
  sb.setAspect(1);
  return sb;
}
