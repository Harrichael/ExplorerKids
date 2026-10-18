// Seed levels: hand-authored starting structures that the annealer evolves.
// Coordinates in mm-ish units, y down, floor top at 640.
const floor = (x0, x1) => ({ x: (x0 + x1) / 2, y: 680, w: x1 - x0, h: 80, kind: 'floor', fr: .03 });
const box = (x0, y0, x1, y1, kind = 'furniture') => ({ x: (x0 + x1) / 2, y: (y0 + y1) / 2, w: x1 - x0, h: y1 - y0, kind });

module.exports = {
  // 1 — The Drawbridge: get off the toy chest, open the bridge, cross the gap
  drawbridge: {
    name: 'The Drawbridge', depthTarget: 3, band: [.25, .7], maxShelves: 4,
    start: { x: 140, y: 404, vx: 4.2 },
    cup: { x: 1080, y: 640 },
    statics: [floor(0, 700), floor(850, 1200), box(60, 420, 250, 640), box(380, 480, 540, 494, 'shelf'), box(560, 330, 680, 344, 'shelf')],
    gates: [{ hx: 850, hy: 633, len: 170, dir: -1, trigger: { x: 520, y: 466, r: 16 } }],
    tails: [], props: [],
    buttons: [{ x: 470, y: 440 }, { x: 775, y: 600 }, { x: 330, y: 560 }],
    tray: { ruler: 3, book: 1, domino: 5, block: 1, lever: 1, yarn: 0 },
  },
  // 2 — Biscuit's Nap: the cup is up on the armchair arm, higher than the start. An ABC block waits on a high
  //     shelf behind a little gate; open it at the right moment and it can drop onto a lever to fling the marble up.
  nap: {
    name: "Biscuit's Nap", depthTarget: 4, band: [.1, .45], maxShelves: 4,
    start: { x: 110, y: 504, vx: 4.0 },
    cup: { x: 1100, y: 380 },
    statics: [floor(0, 1200), box(40, 520, 240, 534, 'shelf'), { x: 340, y: 262, w: 180, h: 14, a: .06, kind: 'shelf' }, box(900, 470, 1180, 640), box(1050, 380, 1180, 470)],
    gates: [{ hx: 428, hy: 246, len: 60, dir: 1, kind: 'latch', tilt: .12, trigger: { x: 560, y: 600, r: 16 } }],
    props: [{ type: 'ball', x: 405, y: 236 }],
    tails: [{ px: 760, py: 640, len: 110, amp: .65, period: 2.4 }],
    buttons: [{ x: 820, y: 300 }, { x: 640, y: 560 }, { x: 980, y: 420 }],
    tray: { ruler: 3, book: 1, domino: 3, block: 1, lever: 1, yarn: 0 },
  },
  // 3 — The Midnight Snack Machine: cup on the mantel. Open the bridge over the gap, cross it, then release the
  //     block from the high shelf onto a lever to reach the mantel — with the cat's tail sweeping by the hearth.
  snack: {
    name: 'The Midnight Snack Machine', depthTarget: 6, band: [.04, .3], maxShelves: 5,
    start: { x: 100, y: 519, vx: 4.0 },
    cup: { x: 1110, y: 300 },
    statics: [floor(0, 520), floor(650, 1200), box(40, 535, 200, 549, 'shelf'), box(840, 300, 1160, 640), box(330, 470, 470, 640), { x: 680, y: 330, w: 170, h: 14, a: -.05, kind: 'shelf' }],
    gates: [{ hx: 650, hy: 633, len: 150, dir: -1, trigger: { x: 420, y: 455, r: 16 } },
            { hx: 598, hy: 314, len: 60, dir: -1, kind: 'latch', tilt: .12, trigger: { x: 760, y: 620, r: 16 } }],
    props: [{ type: 'ball', x: 622, y: 302 }],
    tails: [{ px: 800, py: 640, len: 100, amp: .6, period: 2.0 }],
    buttons: [{ x: 450, y: 220 }, { x: 700, y: 450 }, { x: 980, y: 250 }],
    tray: { ruler: 3, book: 1, domino: 4, block: 1, lever: 1, yarn: 1 },
  },
};
