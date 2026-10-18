import * as THREE from 'three';
import { C, T, add, box, outline, outlineMat, rrect, shade, sph, tex } from '../core/kit.js';

// rounded limb: tapered tube with domed ends, centered on its middle (length L between cap centers)
function limbGeo(r1, r2, L, seg=14){
  const pts = [], n = 6;
  for (let i = 0; i <= n; i++) { const a = -Math.PI/2 + i/n*Math.PI/2; pts.push(new THREE.Vector2(Math.max(.0001, r2*Math.cos(a)), -L/2 + r2*Math.sin(a))); }
  for (let i = 0; i <= n; i++) { const a = i/n*Math.PI/2; pts.push(new THREE.Vector2(Math.max(.0001, r1*Math.cos(a)), L/2 + r1*Math.sin(a))); }
  return new THREE.LatheGeometry(pts, seg);
}
// smooth body profile [[y, r], ...] spun around Y, recentred on cy
function latheGeo(prof, cy, seg=22){
  const curve = new THREE.SplineCurve(prof.map(([y, r]) => new THREE.Vector2(r, y - cy)));
  const pts = curve.getPoints(28).map(v => new THREE.Vector2(Math.max(.0001, v.x), v.y));
  return new THREE.LatheGeometry(pts, seg);
}
const _wrapRay = new THREE.Raycaster();
// shoots rays in a vertical plane at local x toward (x, cy, cz) and returns points just outside the first surface hit
function wrapPath(body, targets, x, cy, cz, phi0, phi1, n, off){
  body.updateMatrixWorld(true);
  const pts = [], c = new THREE.Vector3();
  for (let i = 0; i <= n; i++) {
    const ph = phi0 + (phi1 - phi0)*i/n, d = new THREE.Vector3(0, Math.sin(ph), Math.cos(ph));
    const o = body.localToWorld(new THREE.Vector3(x, cy, cz).addScaledVector(d, 1.0)), cw = body.localToWorld(c.set(x, cy, cz));
    _wrapRay.set(o, cw.clone().sub(o).normalize()); _wrapRay.far = 1.05;
    const hit = _wrapRay.intersectObjects(targets, false)[0];
    pts.push((hit ? body.worldToLocal(hit.point.clone()) : new THREE.Vector3(x, cy, cz).addScaledVector(d, .28)).addScaledVector(d, off));
  }
  // smooth out little bumps from collars and seams
  for (let k = 0; k < 2; k++) for (let i = 1; i < pts.length - 1; i++) pts[i].lerp(pts[i-1].clone().add(pts[i+1]).multiplyScalar(.5), .5);
  return pts;
}
export function human(o){
  const root = new THREE.Group(), body = new THREE.Group(); root.add(body);
  body.scale.setScalar(o.scale || 1);
  const P = (geo, color, x, y, z, parent, ol=true, extra) => {
    const m = new THREE.Mesh(geo, color && color.isMaterial ? color : T(color, extra)); m.position.set(x, y, z); m.castShadow = true; parent.add(m);
    if (ol) outline(m, typeof ol === 'number' ? ol : 1.07); return m;
  };
  const SG = (r, w=14, h=10) => new THREE.SphereGeometry(r, w, h);
  const CG = (a, b, h, s=12) => new THREE.CylinderGeometry(a, b, h, s);
  const shirtMat = o.shirtMap ? T(0xffffff, {map:o.shirtMap}) : T(o.shirt);
  const girl = o.build === 'girl', boy = o.build === 'boy';
  const shR = girl ? .235 : boy ? .3 : .27, waistR = girl ? .24 : boy ? .29 : .32, armX = girl ? .3 : boy ? .38 : .35, legX = girl ? .115 : .14;
  const legs = [];
  for (const sx of [-1, 1]) {
    const L = new THREE.Group(); L.position.set(sx*legX, .74, 0); body.add(L);
    if (o.shorts) { P(limbGeo(.125,.112,.16), o.pants, 0, -.1, 0, L); P(limbGeo(.074,.068,.3), o.skin, 0, -.36, 0, L); P(CG(.08,.078,.1,12), o.socks || C.cream, 0, -.55, 0, L, false); }
    else P(o.slimLegs ? limbGeo(.098,.074,.5) : limbGeo(.118,.092,.5), o.pants, 0, -.28, 0, L);
    if (o.boots) P(CG(.115,.12,.32,10), o.boots, 0, -.52, 0, L);
    const shoe = P(SG(.12,10,8), o.shoe, 0, -.65, .05, L); shoe.scale.set(girl ? .85 : boy ? 1.08 : 1, .6, girl ? 1.3 : 1.5);
    if (o.strap) P(new THREE.BoxGeometry(.2,.03,.05), o.strap, 0, -.6, .1, L, false);
    P(SG(.12,14,8), o.sole || 0x2a1e1a, 0, -.7, .05, L, false).scale.set(girl ? .9 : 1.02, .22, girl ? 1.35 : 1.55);
    legs.push(L);
  }
  P(SG(girl ? .27 : boy ? .3 : .32, 18, 12), o.pants, 0, .8, 0, body).scale.set(1, .5, .9);
  if (o.skirt && !o.dress) P(CG(.27,.44,.42,16), o.skirt, 0, .66, 0, body);
  const flows = [];
  if (o.dress) { const df = o.dressFlare || .46; const dm = P(new THREE.CylinderGeometry(.25,df,.5,24,4), o.dress, 0, .66, 0, body); const tm = P(new THREE.CylinderGeometry(df+.005,df+.005,.04,24), o.dressTrim || C.cream, 0, .43, 0, body, false); flows.push([dm,.91,.5],[tm,.91,.5]); }
  const mid = (shR + waistR)/2;
  const torsoProf = [[.74, .0001], [.755, waistR*.9], [.84, waistR*1.03], [.98, waistR*1.03], [1.14, mid*1.01], [1.3, shR*1.05], [1.39, shR*.98], [1.46, shR*.74], [1.5, .11], [1.53, .0001]];
  const torsoPts = new THREE.SplineCurve(torsoProf.map(([y, r]) => new THREE.Vector2(r, y))).getPoints(60);
  const torsoR = y => { for (let i = 1; i < torsoPts.length; i++) { const a = torsoPts[i-1], b = torsoPts[i]; if (b.y >= y) return a.x + (b.x - a.x)*(y - a.y)/((b.y - a.y) || 1); } return .1; };
  P(latheGeo([[.74, .0001], [.755, waistR*.9], [.84, waistR*1.03], [.98, waistR*1.03], [1.14, mid*1.01], [1.3, shR*1.05], [1.39, shR*.98], [1.46, shR*.74], [1.5, .11], [1.53, .0001]], 1.13), shirtMat, 0, 1.13, 0, body).scale.set(1, 1, .9);
  // a soft hem band where the top meets the trousers (storybook stitching detail)
  if (!o.dress && !(o.coat && o.closed)) { const hm = P(new THREE.TorusGeometry(waistR*.94, .028, 8, 22), o.hem || o.sleeve || o.shirt, 0, .79, 0, body, false); hm.rotation.x = Math.PI/2; hm.scale.set(1, .9, 1); }
  const cl = o.coatLen || .95, cf = o.coatFlare || .44;
  if (o.coat) {
    const gap = o.closed ? 0 : .45;
    const cm = T(o.coat, {side:THREE.DoubleSide});
    const coat = new THREE.Mesh(new THREE.CylinderGeometry(shR + .03, cf, cl, 24, o.flow ? 4 : 1, true, gap, Math.PI*2 - gap*2), cm);
    coat.position.y = 1.43 - cl/2; coat.castShadow = true; body.add(coat); flows.push([coat, 1.43, cl]);
    P(new THREE.SphereGeometry(shR + .02,14,8,0,Math.PI*2,0,Math.PI/2), o.coat, 0, 1.41, 0, body);
    if (!o.closed) for (const sx of [-1, 1]) { const lp = P(new THREE.BoxGeometry(.1,.38,.03), o.lapel || o.coat, sx*.11, 1.27, .29, body, false); lp.rotation.z = sx*.35; lp.rotation.x = -.15; }
    if (o.pockets) for (const sx of [-1, 1]) { const pk = P(new THREE.BoxGeometry(.16,.14,.03), o.coat, sx*.25, 1.43 - cl*.7, .33, body, 1.04); pk.rotation.y = sx*.5; }
  }
  if (o.buttons) for (let i=0;i<o.buttons;i++) {
    const y = 1.3 - i*.13;
    const r = (o.coat && o.closed) ? shR + .03 + (1.43 - y)/cl*(cf - shR - .03) + .01 : shR + .02 + (1.42 - y)*(waistR - shR + .02)/.66;
    P(SG(.025,6,5), o.buttonColor || C.gold, 0, y, r, body, false);
  }
  if (o.scarf) { const s = P(new THREE.TorusGeometry(.2,.07,8,16), o.scarf, 0, 1.47, 0, body); s.rotation.x = Math.PI/2; P(new THREE.BoxGeometry(.11,.32,.05), o.scarf, .1, 1.3, .3, body).rotation.z = .2; }
  if (o.collar) for (const sx of [-1,1]) { const c = P(new THREE.BoxGeometry(.14,.06,.12), o.collar, sx*.09, 1.47, .2, body, false); c.rotation.y = sx*.5; c.rotation.z = -sx*.2; }
  if (o.hood) { const hd = P(new THREE.TorusGeometry(.17,.08,8,14), o.hood, 0, 1.5, -.12, body); hd.rotation.x = Math.PI/2 + .5; }
  if (o.strings) for (const sx of [-1,1]) P(CG(.012,.012,.2,4), C.cream, sx*.06, 1.33, .27, body, false);
  if (o.satchel) { const st = P(new THREE.TorusGeometry(.36,.025,4,20), C.woodDk, 0, 1.12, 0, body, false); st.rotation.set(.1, 0, .8); P(new THREE.BoxGeometry(.26,.22,.1), C.woodLt, .3, .8, .2, body).rotation.y = .5; }
  if (o.binoculars) { for (const sx of [-1,1]) P(CG(.045,.05,.14,8), C.ink, sx*.05, 1.26, .34, body, false).rotation.x = Math.PI/2; const bs = P(new THREE.TorusGeometry(.16,.012,4,16,Math.PI), C.woodDk, 0, 1.4, .17, body, false); bs.rotation.x = -.6; bs.rotation.z = Math.PI; }
  if (o.patches) for (const [px,py] of [[-.18,1.2],[.2,.98]]) P(new THREE.CircleGeometry(.05,8), o.patches, px, py, .305, body, false).rotation.y = px*1.5;
  P(CG(.085,.095,.12,10), o.skin, 0, 1.5, 0, body, false);
  const arms = [];
  for (const sx of [-1, 1]) {
    const A = new THREE.Group(); A.position.set(sx*armX, 1.38, 0); A.rotation.z = sx*(girl ? .14 : .18); A.rotation.x = -.06; body.add(A);
    const sl = o.sleeve || o.coat || o.shirt;
    P(SG(.1,10,8), sl, 0, 0, 0, A, false);
    const ar = girl ? [.078,.064] : boy ? [.092,.074] : [.09,.072];
    P(o.shortSleeve ? limbGeo(ar[0]*1.08, ar[0]*1.02, .14) : limbGeo(ar[0], ar[1], .46), sl, 0, o.shortSleeve ? -.07 : -.24, 0, A);
    if (o.puffSleeve) P(SG(.12,10,8), sl, 0, -.04, 0, A, false).scale.set(1,.8,1);
    if (o.shortSleeve) P(limbGeo(ar[1]*.92, ar[1]*.85, .3), o.skin, 0, -.36, 0, A);
    if (o.cuff) { const c = P(new THREE.TorusGeometry(.072,.022,6,12), o.cuff, 0, -.52, 0, A, false); c.rotation.x = Math.PI/2; }
    P(SG(.092,12,10), o.skin, 0, -.61, .01, A).scale.set(.95, 1, .85);
    P(SG(.038,8,6), o.skin, -sx*.07, -.58, .05, A, false);
    arms.push(A);
  }
  const head = new THREE.Group(); head.position.set(0, 1.83, 0); head.scale.setScalar(o.headScale || 1.16); body.add(head);
  P(SG(.3,22,16), o.skin, 0, 0, 0, head).scale.set(girl ? .97 : boy ? 1.02 : 1, girl ? .99 : .97, .96);
  if (boy) P(SG(.2,14,10), o.skin, 0, -.13, .06, head, false).scale.set(1.15,.7,1);
  for (const sx of [-1, 1]) P(SG(.07,8,6), o.skin, sx*.29, -.02, 0, head, false).scale.set(.55,1,.8);
  P(SG(.036,8,6), o.skin, 0, -.055, .292, head, false).scale.set(1,.8,.9);
  const eyes = new THREE.Group(); eyes.position.y = .03; head.add(eyes);
  for (const sx of [-1, 1]) {
    // big Wind Waker eyes: tall whites, large pupils, a bright catchlight
    P(SG(.082,14,10), 0xfffaf0, sx*.118, 0, .236, eyes, false).scale.set(.84, 1.3, .48);
    P(SG(.052,12,10), o.eye || 0x2a1e1a, sx*.116, -.012, .27, eyes, false).scale.set(.86, 1.18, .62);
    P(SG(.022,8,6), 0xffffff, sx*.116 + .02, .028, .3, eyes, false);
    P(SG(.009,6,4), 0xffffff, sx*.116 - .016, -.04, .298, eyes, false);
    if (o.lashes) for (let j=0;j<2;j++) P(new THREE.BoxGeometry(.05,.015,.012), 0x1a1320, sx*(.172 + j*.018), .07 - j*.026, .258, eyes, false).rotation.z = sx*(.45 + j*.45);
    P(new THREE.BoxGeometry(.11,.026,.02), o.brow || o.hair, sx*.118, .15, .262, head, false).rotation.z = -sx*(o.browTilt || .12);
  }
  for (const sx of [-1, 1]) P(SG(.045,8,6), 0xe89a8f, sx*.185, -.07, .235, head, false).scale.set(1,.7,.4);
  if (o.freckles) for (const sx of [-1,1]) for (let i=0;i<3;i++) P(SG(.008,4,3), 0x3a1e12, sx*(.13 + i*.03), -.03 - (i%2)*.02, .275, head, false);
  const smile = P(new THREE.TorusGeometry(girl ? .05 : .055, girl ? .015 : .013,6,10,Math.PI), o.mouth || 0x6b2a2a, 0, -.11, .275, head, false); smile.rotation.z = Math.PI;
  const mouthOpen = P(SG(.05,10,8), 0x5a1e24, 0, -.12, .27, head, false); mouthOpen.scale.set(1,.7,.4); mouthOpen.visible = false;
  const hairM = o.hair, hs = o.hairStyle;
  const capG = new THREE.SphereGeometry(.325,18,10,0,Math.PI*2,0,Math.PI/2.15);
  const backHair = (tl=.62) => { const m = P(new THREE.SphereGeometry(.325,18,12,Math.PI,Math.PI,0,Math.PI*tl), hairM, 0, .03, -.01, head); m.scale.set(1.03, 1, 1.05); return m; };
  if (hs !== 'cap') P(capG, hairM, 0, .03, -.02, head).rotation.x = -.22;
  if (hs === 'short') {
    backHair(.6);
    for (const sx of [-1,1]) P(SG(.07,8,6), hairM, sx*.28, .06, .06, head, false).scale.set(.6,1,1);
    for (let i=0;i<5;i++) P(SG(.09,8,6), hairM, -.18 + i*.09, .2 - Math.abs(i-2)*.02, .2, head, false).scale.set(1,.8,.7);
  }
  if (hs === 'bun') {
    backHair(.66);
    for (const sx of [-1,1]) P(SG(.12,8,6), hairM, sx*.25, .08, .1, head, false).scale.set(.6,1,1);
    P(SG(.17,12,10), hairM, 0, .26, -.26, head);
    P(CG(.018,.018,.42,6), C.gold, .05, .32, -.26, head, false).rotation.z = 1.1;
  }
  if (hs === 'bob') {
    P(new THREE.BoxGeometry(.74,.52,.36), hairM, 0, -.12, -.12, head);
    for (const sx of [-1,1]) { P(new THREE.BoxGeometry(.15,.52,.34), hairM, sx*.33, -.13, .08, head); P(SG(.1,8,6), hairM, sx*.32, -.38, .16, head, false).scale.set(.8,.6,.9); }
    P(SG(.16,10,8), hairM, .12, .2, .19, head, false).scale.set(1.4,.6,.6);
    P(new THREE.BoxGeometry(.06,.5,.03), o.streak || hairM, .3, -.1, .26, head, false);
  }
  if (hs === 'cap') {
    P(capG, o.capColor, 0, .05, 0, head); P(new THREE.BoxGeometry(.38,.04,.3), o.capColor, 0, .08, .38, head);
    P(SG(.04,6,5), C.gold, 0, .37, 0, head, false);
    backHair(.6);
    for (const [hx,hy,hz] of [[-.3,0,.05],[.3,0,.05],[-.2,-.1,-.24],[.2,-.12,-.24],[0,-.16,-.27]]) P(SG(.07,6,5), hairM, hx, hy, hz, head, false);
    P(new THREE.CircleGeometry(.06,10), C.gold, 0, .22, .3, head, false).rotation.x = -.5;
  }
  if (hs === 'puffs') {
    for (let i=0;i<7;i++){ const a = i/7*Math.PI - Math.PI; P(SG(.09,8,6), hairM, Math.cos(a)*.27, .2 + Math.sin(-a)*.03, .18, head, false); }
    for (const sx of [-1,1]) { P(SG(.19,12,10), hairM, sx*.3, .3, -.06, head); P(new THREE.TorusGeometry(.09,.025,6,12), o.tie || C.rust, sx*.22, .23, -.04, head, false).rotation.set(.3, sx*.9, 0); }
    backHair(.62);
  }
  if (hs === 'buns') {
    backHair(.6);
    for (let i=0;i<4;i++) P(SG(.085,8,6), hairM, -.13 + i*.087, .21, .21, head, false).scale.set(1,.7,.6);
    for (const sx of [-1,1]) { P(SG(.17,12,10), hairM, sx*.27, .31, -.05, head); P(new THREE.TorusGeometry(.1,.028,6,14), o.tie || C.rust, sx*.21, .25, -.04, head, false).rotation.set(.3, sx*.9, 0); }
  }
  if (hs === 'spiky') {
    backHair(.58);
    for (let i=0;i<9;i++){ const a = i/9*Math.PI*2; const sp = P(new THREE.ConeGeometry(.08,.22,5), hairM, Math.cos(a)*.16, .3, Math.sin(a)*.16 - .03, head, false); sp.rotation.z = -Math.cos(a)*.7; sp.rotation.x = Math.sin(a)*.7; }
    P(new THREE.ConeGeometry(.08,.24,5), hairM, 0, .38, -.02, head, false);
    for (let i=0;i<4;i++) { const f = P(new THREE.ConeGeometry(.06,.16,5), hairM, -.13 + i*.087, .2, .25, head, false); f.rotation.x = 1.9; }
  }
  if (hs === 'braids') {
    backHair(.64);
    for (let i=0;i<4;i++) P(SG(.085,8,6), hairM, -.13 + i*.087, .21, .21, head, false).scale.set(1,.7,.6);
    for (const sx of [-1,1]) {
      for (let i=0;i<5;i++) P(SG(.075 - i*.006,8,6), hairM, sx*(.27 + i*.012), -.1 - i*.1, -.08 + i*.015, head);
      const tie = P(new THREE.TorusGeometry(.045,.018,6,10), o.tie || C.rust, sx*.33, -.55, -.02, head, false); tie.rotation.x = Math.PI/2;
      P(SG(.05,6,5), hairM, sx*.33, -.62, -.02, head, false);
    }
  }
  if (o.bow) {
    const bw = new THREE.Group(); bw.position.set(.2, .3, .02); bw.rotation.z = -.5; head.add(bw);
    for (const sx of [-1,1]) { const lb = P(SG(.07,8,6), o.bow, sx*.07, 0, 0, bw); lb.scale.set(1.2,.8,.5); }
    P(SG(.035,6,5), o.bow, 0, 0, .01, bw, false);
  }
  if (hs === 'long') {
    P(new THREE.BoxGeometry(.62,.8,.2), hairM, 0, -.26, -.2, head);
    for (const sx of [-1,1]) P(new THREE.BoxGeometry(.12,.62,.24), hairM, sx*.31, -.17, .02, head);
    for (let i=0;i<4;i++) P(SG(.085,8,6), hairM, -.13 + i*.087, .21, .21, head, false).scale.set(1,.7,.6);
  }
  if (hs === 'curly') {
    for (let i=0;i<12;i++){ const a = i/12*Math.PI*2, front = Math.sin(a) > .3; P(SG(.12,8,6), hairM, Math.cos(a)*.28, front ? .22 : .1 + Math.sin(i*1.7)*.04, Math.sin(a)*.27 - .03, head, false); }
    for (let i=0;i<5;i++){ const a = i/5*Math.PI*2; P(SG(.13,8,6), hairM, Math.cos(a)*.14, .3, Math.sin(a)*.14 - .04, head, false); }
    for (let i=0;i<5;i++) P(SG(.12,8,6), hairM, -.2 + i*.1, -.08, -.26, head, false);
  }
  if (o.glasses) {
    const gm = T(o.glasses);
    for (const sx of [-1, 1]) { const r = new THREE.Mesh(new THREE.TorusGeometry(.078,.012,6,16), gm); r.position.set(sx*.11, .03, .305); head.add(r); }
    P(new THREE.BoxGeometry(.06,.012,.012), o.glasses, 0, .045, .31, head, false);
    if (o.chain) { const ch = P(new THREE.TorusGeometry(.26,.006,4,24,Math.PI), C.gold, 0, -.15, .1, head, false); ch.rotation.z = Math.PI; ch.rotation.x = -.3; }
  }
  if (o.goggles) {
    P(new THREE.TorusGeometry(.33,.03,6,22), C.ink, 0, .2, 0, head, false).rotation.x = Math.PI/2 - .35;
    for (const sx of [-1, 1]) { P(CG(.085,.085,.08,14), C.gold, sx*.12, .25, .27, head).rotation.x = Math.PI/2 - .55; P(CG(.065,.065,.09,14), 0x7fd6e8, sx*.12, .25, .275, head, false, {emissive:0x3fb0c8, emissiveIntensity:.5}).rotation.x = Math.PI/2 - .55; }
  }
  if (o.earrings) for (const sx of [-1,1]) P(SG(.03,6,5), o.earrings, sx*.3, -.11, .02, head, false, {emissive:o.earrings, emissiveIntensity:.4});
  if (o.hold === 'book') { P(new THREE.BoxGeometry(.3,.38,.07), C.rust, .05, -.62, .12, arms[0]).rotation.y = .3; P(new THREE.BoxGeometry(.31,.04,.075), C.gold, .05, -.55, .12, arms[0], false).rotation.y = .3; arms[0].rotation.x = -.6; }
  if (o.hold === 'clipboard') { P(new THREE.BoxGeometry(.3,.4,.03), C.woodLt, 0, -.64, .14, arms[0]); P(new THREE.BoxGeometry(.24,.3,.01), C.cream, 0, -.66, .16, arms[0], false); P(new THREE.BoxGeometry(.1,.04,.03), C.ink, 0, -.45, .16, arms[0], false); arms[0].rotation.x = -.7; }
  if (o.hold === 'notebook') { P(new THREE.BoxGeometry(.22,.28,.05), 0x2f8f8a, 0, -.64, .12, arms[1]); arms[1].rotation.x = -.5; }
  if (o.vest) {
    // explorer vest: a fitted shell that follows the torso, open in a V at the front, with patch pockets and piping
    const N = 26, rows = 9, y0 = .8, y1 = 1.42, pos = [], idx = [];
    for (let j = 0; j <= rows; j++) {
      const t = j/rows, y = y0 + (y1 - y0)*t, r = torsoR(Math.min(y, 1.4)) + .034 + (1 - t)*.012, gap = .16 + Math.pow(t, 1.6)*.62;
      for (let i = 0; i <= N; i++) { const ph = gap + (Math.PI*2 - gap*2)*i/N; pos.push(r*Math.sin(ph), y, r*Math.cos(ph)*.9); }
    }
    for (let j = 0; j < rows; j++) for (let i = 0; i < N; i++) { const a = j*(N+1) + i, b = a + N + 1; idx.push(a, a + 1, b, a + 1, b + 1, b); }
    const vg = new THREE.BufferGeometry(); vg.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); vg.setIndex(idx); vg.computeVertexNormals();
    const vm = new THREE.Mesh(vg, T(o.vest, {side:THREE.DoubleSide})); vm.castShadow = true; body.add(vm);
    const ink = new THREE.Mesh(vg, outlineMat); ink.scale.set(1.04, 1.005, 1.04); vm.add(ink);
    const trim = o.vestTrim || C.ink;
    // piping down both front edges and along the hem
    for (const sd of [-1, 1]) { const ep = [];
      for (let j = 0; j <= rows; j++) { const t = j/rows, y = y0 + (y1 - y0)*t, r = torsoR(Math.min(y, 1.4)) + .04 + (1 - t)*.012, ph = sd*(.16 + Math.pow(t, 1.6)*.62); ep.push(new THREE.Vector3(r*Math.sin(ph), y, r*Math.cos(ph)*.9)); }
      body.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(ep), 20, .016, 5), T(trim))); }
    const hem = []; for (let i = 0; i <= 30; i++) { const ph = .16 + (Math.PI*2 - .32)*i/30, r = torsoR(y0) + .05; hem.push(new THREE.Vector3(r*Math.sin(ph), y0, r*Math.cos(ph)*.9)); }
    body.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(hem), 40, .018, 5), T(trim)));
    // four patch pockets with flaps and buttons, set flush to the curve
    const pocket = (y, ph, w, h) => { const r = torsoR(y) + .046, g = new THREE.Group(); g.position.set(r*Math.sin(ph), y, r*Math.cos(ph)*.9); g.rotation.y = Math.atan2(Math.sin(ph), Math.cos(ph)*.9); body.add(g);
      P(new THREE.BoxGeometry(w, h, .022), shade(o.vest, .9), 0, 0, 0, g, 1.04);
      P(new THREE.BoxGeometry(w*1.08, h*.32, .03), shade(o.vest, .78), 0, h*.38, .008, g, 1.04);
      P(SG(.016, 6, 5), C.gold, 0, h*.3, .03, g, false); };
    for (const sd of [-1, 1]) { pocket(1.2, sd*.62, .13, .12); pocket(.95, sd*.55, .15, .14); }
    // a compass badge stitched above the right chest pocket
    { const ph = -.7, y = 1.33, r = torsoR(y) + .05, b = P(CG(.035, .035, .015, 14), C.gold, r*Math.sin(ph), y, r*Math.cos(ph)*.9, body, 1.12); b.rotation.x = Math.PI/2; b.rotation.z = -Math.atan2(Math.sin(ph), Math.cos(ph)*.9); }
  }
  const wearTargets = () => body.children.filter(m => m.isMesh);
  if (o.suspenders) {
    for (const sx of [-1, 1]) {
      const pts = wrapPath(body, wearTargets(), sx*.13, 1.12, -.01, -.95, Math.PI + .95, 22, .018);
      const st = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 48, .024, 6), T(o.suspenders)); st.scale.x = 1; st.castShadow = true; body.add(st);
      for (const e of [pts[0], pts[pts.length - 1]]) P(SG(.024, 8, 6), C.gold, e.x, e.y + .02, e.z + Math.sign(e.z)*.01, body, false);
    }
  }
  if (o.bowtie) {
    _wrapRay.set(body.localToWorld(new THREE.Vector3(0, 1.45, 1)), new THREE.Vector3(0, 0, -1)); body.updateMatrixWorld(true);
    const hit = _wrapRay.intersectObjects(wearTargets(), false)[0], bz = hit ? body.worldToLocal(hit.point.clone()).z + .03 : .26;
    const bt = new THREE.Group(); bt.position.set(0, 1.45, bz); body.add(bt);
    for (const sd of [-1, 1]) { const w = P(new THREE.ConeGeometry(.055, .1, 4), o.bowtie, sd*.05, 0, 0, bt, 1.08); w.rotation.z = sd*Math.PI/2; w.scale.set(1, 1, .45); }
    P(SG(.03, 8, 6), shade(o.bowtie, .8), 0, 0, .01, bt, 1.1);
  }
  if (o.backpack) {
    // sit the pack on the back of whatever is worn, then run the straps over the shoulders into it
    body.updateMatrixWorld(true);
    _wrapRay.set(body.localToWorld(new THREE.Vector3(0, 1.12, -1.2)), body.localToWorld(new THREE.Vector3(0, 1.12, 0)).sub(body.localToWorld(new THREE.Vector3(0, 1.12, -1.2))).normalize());
    const hit = _wrapRay.intersectObjects(wearTargets(), false)[0], back = hit ? body.worldToLocal(hit.point.clone()).z : -.28;
    const pz = back - .115;
    const pack = P(new THREE.BoxGeometry(.46, .52, .24), o.backpack, 0, 1.12, pz, body);
    P(SG(.23, 14, 8, 0, Math.PI*2, 0, Math.PI/2), o.backpack, 0, 1.36, pz, body, 1.04).scale.set(1, .35, .52);
    P(new THREE.BoxGeometry(.36, .2, .08), o.backpackFlap || C.gold, 0, .98, pz - .14, body, 1.05);
    P(SG(.05, 8, 6), C.cream, .1, 1.22, pz - .13, body, false);
    for (const sx of [-1, 1]) {
      const pts = wrapPath(body, wearTargets().filter(m => m !== pack), sx*.16, 1.15, -.02, -.7, Math.PI - .55, 18, .02);
      const st = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 40, .03, 6), T(shade(o.backpack, .8))); st.castShadow = true; body.add(st);
      P(new THREE.BoxGeometry(.06, .05, .03), C.gold, pts[3].x, pts[3].y, pts[3].z + .01, body, false);
    }
  }
  if (o.pens) for (let i=0;i<2;i++) P(CG(.012,.012,.18,5), [C.rust, C.navy][i], -.16 + i*.04, 1.27, .3, body, false);
  return {root, body, legL:legs[0], legR:legs[1], armL:arms[0], armR:arms[1], head, eyes, smile, mouthOpen, holdsRight: o.hold === 'notebook', flows: o.flow ? flows : null};
}

export function makeOwl(){
  const root = new THREE.Group();
  const featherTex = tex(128,128,(g,w,h)=>{ g.fillStyle='#8a5e3d'; g.fillRect(0,0,w,h); for (let r=0;r<8;r++) for (let c=0;c<8;c++){ g.fillStyle = (r+c)%3 ? '#76502f' : '#9a6c47'; g.beginPath(); g.arc(c*16 + (r%2)*8 + 8, r*16 + 12, 8, 0, Math.PI); g.fill(); } }, 2, 2);
  const bellyTex = tex(128,128,(g,w,h)=>{ g.fillStyle='#ecd3a6'; g.fillRect(0,0,w,h); g.strokeStyle='#b58a5a'; g.lineWidth=3; for (let r=0;r<7;r++) for (let c=0;c<6;c++){ g.beginPath(); g.arc(c*22 + (r%2)*11 + 8, r*18 + 10, 6, .2, Math.PI-.2); g.stroke(); } });
  const feather = T(0xffffff, {map:featherTex}), belly = T(0xffffff, {map:bellyTex}), dark = T(0x5e3e26);
  const body = add(new THREE.SphereGeometry(.42,18,14), feather, 0,.48,0, root); body.scale.set(1,1.22,.92); outline(body, 1.05);
  add(new THREE.SphereGeometry(.32,16,12), belly, 0,.42,.17, root).scale.set(1,1.15,.62);
  const head = new THREE.Group(); head.position.set(0,1.04,0); root.add(head);
  const hd = add(new THREE.SphereGeometry(.36,18,14), feather, 0,0,0, head); hd.scale.set(1.12,.94,1); outline(hd, 1.05);
  for (const sx of [-1,1]) add(new THREE.CircleGeometry(.19,20), T(0xf1dcb6), sx*.13,.02,.335, head, false).rotation.y = sx*.25;
  const lids = [];
  for (const sx of [-1, 1]) {
    add(new THREE.SphereGeometry(.12,14,10), T(0xffffff), sx*.14,.03,.3, head, false).scale.set(1,1,.45);
    add(new THREE.SphereGeometry(.09,12,10), T(0xe8a83a,{emissive:0xb06a10, emissiveIntensity:.35}), sx*.14,.03,.335, head, false).scale.set(1,1,.4);
    add(new THREE.SphereGeometry(.05,10,8), T(C.ink), sx*.14,.03,.36, head, false).scale.set(1,1,.4);
    add(new THREE.SphereGeometry(.018,6,4), T(0xffffff), sx*.14+.03,.07,.38, head, false);
    const lid = add(new THREE.SphereGeometry(.13,14,8,0,Math.PI*2,0,Math.PI/2), feather, sx*.14,.03,.3, head, false); lid.rotation.x = -.2; lid.scale.set(1,.15,.6); lids.push(lid);
    add(new THREE.BoxGeometry(.16,.035,.04), dark, sx*.14,.16,.32, head, false).rotation.z = sx*.25;
  }
  for (const sx of [-1,1]) add(new THREE.TorusGeometry(.13,.012,6,18), T(C.gold), sx*.14,.02,.38, head, false);
  box(.05,.012,.012,T(C.gold),0,.04,.38,head,false);
  const beak = add(new THREE.ConeGeometry(.055,.16,6), T(0xe0a03a), 0,-.09,.37, head, false); beak.rotation.x = Math.PI/2 + .5; outline(beak, 1.1);
  for (const sx of [-1,1]) { const t = add(new THREE.ConeGeometry(.08,.26,5), dark, sx*.25,.32,-.02, head); t.rotation.z = -sx*.5; outline(t, 1.08); }
  const sc = add(new THREE.TorusGeometry(.3,.07,8,18), T(C.rust), 0,.8,0, root); sc.rotation.x = Math.PI/2; outline(sc,1.05);
  for (let i=0;i<3;i++) box(.08,.03,.02,T(C.gold),-.08+i*.08,.8,.36,root,false);
  box(.12,.3,.22,T(C.rust),.18,.62,.3,root).rotation.z = -.2;
  const wings = [];
  for (const sx of [-1, 1]) {
    const W = new THREE.Group(); W.position.set(sx*.37,.78,-.02); root.add(W);
    const w = add(new THREE.SphereGeometry(.26,12,10), feather, sx*.03,-.25,0, W); w.scale.set(.36,1.1,.82); outline(w, 1.06);
    for (let i=0;i<3;i++) add(new THREE.SphereGeometry(.09,8,6), dark, sx*.05, -.48 - i*.04, -.08 + i*.08, W, false).scale.set(.4,1.4,.6);
    wings.push(W);
  }
  for (let i=0;i<3;i++) { const tf = add(new THREE.SphereGeometry(.08,8,6), dark, -.08+i*.08, .1, -.3, root, false); tf.scale.set(.6,1.5,.4); tf.rotation.x = .6; }
  for (const sx of [-1,1]) for (let i=0;i<3;i++) add(new THREE.ConeGeometry(.025,.1,5), T(0xe0a03a), sx*.12 + (i-1)*.04, .03, .12, root, false).rotation.x = Math.PI/2;
  return {root, head, lids, wingL:wings[0], wingR:wings[1]};
}

export function makeCat(){
  const root = new THREE.Group();
  const tabby = tex(128,128,(g,w,h)=>{ g.fillStyle='#d68a45'; g.fillRect(0,0,w,h); g.fillStyle='#b06a2f'; for (let i=0;i<8;i++) g.fillRect(0, i*16+4, w, 6); });
  const fur = T(0xffffff, {map:tabby}), cream = T(0xf3e0c0);
  const body = add(new THREE.SphereGeometry(.34,16,12), fur, 0,.22,0, root); body.scale.set(1.2,.62,.95); outline(body, 1.05);
  const head = new THREE.Group(); head.position.set(.36,.26,.12); root.add(head);
  const hd = add(new THREE.SphereGeometry(.17,16,12), fur, 0,0,0, head); hd.scale.set(1,.9,1); outline(hd, 1.06);
  add(new THREE.SphereGeometry(.08,10,8), cream, .07,-.04,.1, head, false).scale.set(1,.7,1);
  for (const sz of [-1,1]) { const e = add(new THREE.ConeGeometry(.06,.12,4), fur, -.02,.14,sz*.09, head); e.rotation.x = sz*.25; outline(e, 1.1); }
  const eyes = [];
  for (const sz of [-1,1]) { const e = add(new THREE.TorusGeometry(.03,.008,4,8,Math.PI), T(C.ink), .14,.03,sz*.06, head, false); e.rotation.y = Math.PI/2; eyes.push(e); }
  sph(.018, T(0xd36a8f), .17,-.02,0, head, 6, false);
  const segs = []; let parent = root;
  for (let i=0;i<6;i++){ const s = new THREE.Group(); s.position.set(i ? -.1 : -.38, i ? 0 : .12, i ? .02 : .1); parent.add(s); sph(.05 - i*.004, i === 5 ? cream : fur, -.05, 0, 0, s, 8); segs.push(s); parent = s; }
  return {root, body, head, eyes, tail:segs};
}

export function makeLabel(name, color){
  const c = document.createElement('canvas'); c.width = 512; c.height = 128;
  const tx = new THREE.CanvasTexture(c); tx.encoding = THREE.sRGBEncoding;
  const draw = () => { const g = c.getContext('2d'); g.clearRect(0,0,512,128); g.font = '52px "Caprasimo", Georgia, serif';
    const w = Math.min(500, g.measureText(name).width + 80), x = (512 - w)/2;
    g.fillStyle = 'rgba(26,19,32,.88)'; rrect(g, x, 14, w, 92, 46); g.fill();
    g.strokeStyle = '#d9a441'; g.lineWidth = 5; rrect(g, x+6, 20, w-12, 80, 40); g.stroke();
    g.fillStyle = color; g.beginPath(); g.arc(x + 36, 60, 10, 0, 7); g.fill();
    g.fillStyle = '#efe0bf'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(name, 256 + 12, 64); tx.needsUpdate = true; };
  draw(); document.fonts && document.fonts.ready.then(draw);
  const s = new THREE.Sprite(new THREE.SpriteMaterial({map:tx, transparent:true, depthWrite:false, opacity:0}));
  s.scale.set(1.9, .48, 1); s.renderOrder = 10;
  return s;
}
