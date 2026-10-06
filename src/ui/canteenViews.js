// Geometry of the generated Canteen art (reference: reference/input/Canteen.png), as fractions
// of each image. Measured on the masters in art-source/canteen/.
export const CANTEEN_ART = Object.freeze({
  // canteen-background: y where each counter shelf's containers stand, and the free height
  // above it; the tray rests on the lilac rail panel.
  shelves: [
    { stand: 0.438, room: 0.13 },
    { stand: 0.598, room: 0.13 },
  ],
  trayCenter: 0.742,
  // canteen-tray (trimmed, measured on the outlines): the five compartments, top row 3 small, bottom row 2 big.
  compartments: [
    { x: 0.096, y: 0.086, w: 0.249, h: 0.318 },
    { x: 0.375, y: 0.086, w: 0.250, h: 0.318 },
    { x: 0.654, y: 0.086, w: 0.250, h: 0.318 },
    { x: 0.070, y: 0.439, w: 0.415, h: 0.433 },
    { x: 0.510, y: 0.439, w: 0.416, h: 0.433 },
  ],
});

export const CANTEEN_DEPTH = Object.freeze({
  background: -60,
  containers: 0,
  tray: 10,
  portions: 11,
  spoon: 30,
  ui: 40,
  feedback: 90,
  dialog: 110,
});
