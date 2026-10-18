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
    name: "Biscuit's Nap", depthTarget: 4, band: [.1, .5], maxShelves: 4,
    start: { x: 70, y: 284, vx: 3.0 },
    cup: { x: 1030, y: 500 },
    statics: [floor(0, 1200), box(20, 300, 190, 640), { x: 600, y: 662, r: 100, kind: 'cat' },
      box(820, 500, 1080, 640), box(1080, 300, 1130, 640), box(800, 462, 840, 500), { x: 320, y: 225, w: 130, h: 14, a: .06, kind: 'shelf' }],
    gates: [{ hx: 300, hy: 205, len: 46, dir: 1, kind: 'latch', trigger: { x: 152, y: 250, r: 14 } }],
    props: [{ type: 'ball', x: 276, y: 199 }],
    tails: [{ px: 720, py: 640, len: 90, amp: .6, period: 2.4 }],
    buttons: [{ x: 600, y: 380 }, { x: 430, y: 600 }, { x: 900, y: 420 }],
    tray: { ruler: 2, book: 1, domino: 3, block: 1, lever: 1, yarn: 0 },
  },
  // 3 — The Midnight Snack Machine: cup on the mantel. Open the bridge over the gap, cross it, then release the
  //     block from the high shelf onto a lever to reach the mantel — with the cat's tail sweeping by the hearth.
  snack: {
    name: 'The Midnight Snack Machine', depthTarget: 6, band: [.04, .35], maxShelves: 5,
    start: { x: 80, y: 384, vx: 3.4 },
    cup: { x: 1080, y: 450 },
    statics: [{ x: 225, y: 615, w: 450, h: 50, kind: 'floor', fr: .03 }, floor(450, 1200).w ? { x: 890, y: 680, w: 620, h: 80, kind: 'floor', fr: .03 } : null,
      box(30, 400, 170, 414, 'shelf'), box(240, 470, 370, 590), box(580, 590, 700, 640), box(940, 450, 1160, 640), box(1130, 250, 1170, 450),
      { x: 815, y: 300, w: 130, h: 14, a: .06, kind: 'shelf' }].filter(Boolean),
    gates: [{ hx: 580, hy: 583, len: 150, dir: -1, trigger: { x: 320, y: 455, r: 16 } },
            { hx: 790, hy: 282, len: 50, dir: 1, kind: 'latch', trigger: { x: 650, y: 575, r: 18 } }],
    props: [{ type: 'ball', x: 767, y: 274 }],
    tails: [{ px: 420, py: 590, len: 80, amp: .6, period: 2.2 }],
    buttons: [{ x: 300, y: 330 }, { x: 515, y: 520 }, { x: 960, y: 330 }],
    tray: { ruler: 3, book: 1, domino: 4, block: 1, lever: 1, yarn: 1 },
  },
};
