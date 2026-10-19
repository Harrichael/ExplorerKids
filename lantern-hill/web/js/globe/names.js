// The names written over the geography globe, as a flat layer above the 3D one so they stay crisp
// at any zoom. Like the telescope's star names: the most important are placed first, and a name
// that would overlap one already placed is skipped, so a wide view never turns to alphabet soup.
// The bigger the zoom, the more names earn a place.

const STYLE = {
  continent: {font: '900 15px', color: '#fff3d6', caps: true},
  ocean: {font: 'italic 800 14px', color: '#cfe9ff', caps: true},
  wonder: {font: '900 14px', color: '#ffd36b', mark: '📷'},
  sight: {font: '900 12px', color: '#ffe9a8', dot: true},
  country: {font: '900 13px', color: '#fff8ea'},
  sea: {font: 'italic 800 12px', color: '#bfe1ff'},
  capital: {font: '800 12px', color: '#fff8ea', dot: true},
  land: {font: 'italic 800 12px', color: '#f3dca6'},
  mountains: {font: 'italic 800 12px', color: '#f0c9a0', mark: '⛰'},
  peak: {font: '800 12px', color: '#f7dcc0', mark: '▲'},
  volcano: {font: '800 12px', color: '#ffc29a', mark: '🌋'},
  river: {font: 'italic 800 11px', color: '#a8dcff'},
  island: {font: 'italic 700 11px', color: '#f4f4f4'},
  waterfall: {font: '800 12px', color: '#c4ecff', mark: '💧'},
};
const LOOK = {gulf: 'sea', bay: 'sea', strait: 'sea', channel: 'sea', sound: 'sea', lake: 'sea', fjord: 'sea', lowest: 'peak', islands: 'island', glacier: 'island',
  desert: 'land', plateau: 'land', basin: 'land', plain: 'land', tundra: 'land', delta: 'land', peninsula: 'land', valley: 'land', gorge: 'land', wetland: 'land', region: 'land', isthmus: 'land'};
const look = kind => STYLE[kind] || STYLE[LOOK[kind]] || STYLE.land;

export function makeNames(){
  const cv = document.createElement('canvas'); cv.id = 'globeNames';
  let placed = [];
  // items: [{text, kind, lat, lon, rank}], fewest rank first; project(lat, lon) gives screen [x, y],
  // or null round the back of the globe
  function draw(items, project){
    const dpr = Math.min(devicePixelRatio, 2), w = innerWidth, h = innerHeight;
    if (cv.width !== Math.round(w*dpr) || cv.height !== Math.round(h*dpr)) { cv.width = Math.round(w*dpr); cv.height = Math.round(h*dpr); }
    const g = cv.getContext('2d'); g.setTransform(dpr, 0, 0, dpr, 0, 0); g.clearRect(0, 0, w, h);
    placed = [];
    g.textBaseline = 'middle'; g.lineJoin = 'round';
    for (const it of items) {
      const p = project(it.lat, it.lon); if (!p) continue;
      const s = look(it.kind), text = (s.mark ? s.mark + ' ' : '') + (s.caps ? it.text.toUpperCase() : it.text);
      g.font = `${s.font} Nunito, system-ui, sans-serif`;
      const tw = g.measureText(text).width + (s.caps ? text.length*.8 : 0), x = s.dot ? p[0] + 7 : p[0] - tw/2, y = p[1];
      const box = [x - 4, y - 9, x + tw + 4, y + 9];
      if (box[2] < 0 || box[0] > w || box[3] < 0 || box[1] > h) continue;
      if (placed.some(q => box[0] < q.box[2] && box[2] > q.box[0] && box[1] < q.box[3] && box[3] > q.box[1])) continue;
      placed.push({box, it});
      if (s.dot) { g.fillStyle = '#fff8ea'; g.strokeStyle = '#1a1320'; g.lineWidth = 2; g.beginPath(); g.arc(p[0], p[1], 3, 0, 7); g.fill(); g.stroke(); }
      if (s.caps) g.letterSpacing = '.8px';
      g.lineWidth = 3.5; g.strokeStyle = 'rgba(16,12,22,.85)'; g.strokeText(text, x, y);
      g.fillStyle = s.color; g.fillText(text, x, y);
      if (s.caps) g.letterSpacing = '0px';
    }
  }
  const hit = (x, y) => placed.find(q => x >= q.box[0] - 6 && x <= q.box[2] + 6 && y >= q.box[1] - 6 && y <= q.box[3] + 6)?.it || null;
  const clear = () => { cv.getContext('2d').clearRect(0, 0, cv.width, cv.height); placed = []; };
  return {el: cv, draw, hit, clear};
}
