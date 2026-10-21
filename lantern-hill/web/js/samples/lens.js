// The microscope's lens showing a real photo of a sample: dragged to move the slide about, pinched,
// scrolled or tapped twice to zoom, with a scale bar that stays true at every zoom. Each photo knows how
// wide it is in real life (see tools/samples/micrographs.mjs), which is all the scale bar needs.

let manifest = null, loading = null;
// resolves a sample's photos, or none when the list can't be had; a failed load is tried again next time
export function photosOf(id){
  if (manifest) return Promise.resolve(manifest[id] || []);
  loading ||= fetch('micrographs/micrographs.json').then(r => r.ok ? r.json() : Promise.reject(new Error(r.status)))
    .then(m => { manifest = m; }).catch(() => {}).finally(() => { loading = null; });
  return loading.then(() => manifest ? manifest[id] || [] : []);
}

// the bar's length is the roundest number that comes out a pleasant size on screen
function nice(mm, pxPerMm, lo, hi){
  for (let e = -4; e <= 3; e++) for (const m of [1, 2, 5]) { const n = m*10**e; if (n*pxPerMm >= lo && n*pxPerMm <= hi) return n; }
  return null;
}
function words(mm){
  const r = n => +n.toPrecision(3);
  if (mm < 1) return `${r(mm*1000)} µm`;
  if (mm < 10) return `${r(mm)} mm`;
  return mm < 1000 ? `${r(mm/10)} cm` : `${r(mm/1000)} m`;
}
// a hair is a thing a child can hold up and squint at, so a bar near its width says so
const HAIR = mm => mm >= .05 && mm <= .1;

export function makeLens(box, onZoom){
  const img = document.createElement('img'); img.className = 'photo'; img.draggable = false;
  const kind = document.createElement('span'); kind.className = 'kind';
  const bar = document.createElement('div'); bar.className = 'scale'; bar.innerHTML = '<i></i><span></span>';
  box.append(img, kind, bar);
  const V = {p:null, z:1, x:0, y:0, L:0, s0:1, zMax:1, ptrs:new Map(), pinch:null, moved:false};

  function fit(){
    V.L = box.clientWidth; if (!V.p || !V.L) return;
    V.s0 = Math.max(V.L/V.p.w, V.L/V.p.h);
    // past twice the photo's own pixels it only gets blurrier
    V.zMax = Math.max(1.5, 2/(V.s0*(devicePixelRatio || 1)));
    place();
  }
  function place(){
    V.z = Math.min(V.zMax, Math.max(1, V.z));
    const s = V.s0*V.z, w = V.p.w*s, h = V.p.h*s;
    V.x = Math.max(-(w - V.L)/2, Math.min((w - V.L)/2, V.x)); V.y = Math.max(-(h - V.L)/2, Math.min((h - V.L)/2, V.y));
    img.style.width = w + 'px'; img.style.height = h + 'px';
    img.style.transform = `translate(${V.L/2 - w/2 + V.x}px, ${V.L/2 - h/2 + V.y}px)`;
    const ppm = w/V.p.across, n = nice(V.p.across, ppm, V.L*.12, V.L*.3);
    bar.hidden = !n;
    if (n) { bar.firstChild.style.width = n*ppm + 'px'; bar.lastChild.textContent = words(n) + (HAIR(n) ? ' · a hair' : ''); }
    onZoom?.(V.z, V.zMax);
  }
  // zooms by k about a point on screen, so what's under the finger stays under it
  function zoomAt(k, cx, cy){
    if (!V.p) return;
    const r = box.getBoundingClientRect(), px = cx - r.left - V.L/2, py = cy - r.top - V.L/2, was = V.z;
    V.z = Math.min(V.zMax, Math.max(1, V.z*k)); const f = V.z/was;
    V.x = px - (px - V.x)*f; V.y = py - (py - V.y)*f; place();
  }
  const centre = () => { const r = box.getBoundingClientRect(); return [r.left + r.width/2, r.top + r.height/2]; };

  box.addEventListener('pointerdown', e => {
    if (!V.p || img.hidden) return;
    box.setPointerCapture(e.pointerId); V.ptrs.set(e.pointerId, [e.clientX, e.clientY]); V.moved = false;
    if (V.ptrs.size === 2) { const [a, b] = [...V.ptrs.values()]; V.pinch = {d:Math.hypot(a[0] - b[0], a[1] - b[1]), z:V.z}; }
  });
  box.addEventListener('pointermove', e => {
    const was = V.ptrs.get(e.pointerId); if (!was) return;
    V.ptrs.set(e.pointerId, [e.clientX, e.clientY]);
    if (V.ptrs.size === 2 && V.pinch) {
      const [a, b] = [...V.ptrs.values()], d = Math.hypot(a[0] - b[0], a[1] - b[1]);
      zoomAt(V.pinch.z*d/V.pinch.d/V.z, (a[0] + b[0])/2, (a[1] + b[1])/2);
    } else if (V.ptrs.size === 1) { V.x += e.clientX - was[0]; V.y += e.clientY - was[1]; place(); }
    V.moved = true;
  });
  const up = e => { V.ptrs.delete(e.pointerId); if (V.ptrs.size < 2) V.pinch = null; };
  box.addEventListener('pointerup', up); box.addEventListener('pointercancel', up);
  box.addEventListener('wheel', e => { if (!V.p || img.hidden) return; e.preventDefault(); zoomAt(Math.exp(-e.deltaY*.0015), e.clientX, e.clientY); }, {passive:false});
  box.addEventListener('dblclick', e => { if (!V.p || img.hidden) return; V.z >= V.zMax*.99 ? (V.z = 1, place()) : zoomAt(2, e.clientX, e.clientY); });
  new ResizeObserver(fit).observe(box);

  return {
    show(p, alt){
      V.p = p; V.z = 1; V.x = V.y = 0; img.alt = alt; kind.textContent = p.kind;
      img.classList.remove('in'); img.hidden = false; kind.hidden = false;
      img.onload = () => { if (V.p === p) img.classList.add('in'); };
      img.src = 'micrographs/' + p.file; fit();
      if (img.complete && img.naturalWidth) img.classList.add('in');
    },
    hide(){ V.p = null; img.hidden = kind.hidden = bar.hidden = true; img.classList.remove('in'); onZoom?.(1, 1); },
    zoom(k){ zoomAt(k, ...centre()); },
    pan(dx, dy){ if (V.p) { V.x += dx; V.y += dy; place(); } },
    get showing(){ return !!V.p; },
  };
}
