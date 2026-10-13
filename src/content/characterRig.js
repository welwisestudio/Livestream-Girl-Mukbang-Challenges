// One character rig for every appearance combination.
//
// Unit: the HEAD CELL — the square head-only sprite. All 27 Hair × Skin × pose heads
// are sliced from aligned grids, so they share these anchors (measured on the cutouts).
// Every wearable is fitted into a box expressed in head cells: the build trims each
// asset to its opaque bounds, and the compositor scales that bound box to the rule
// below. No asset carries its own ad-hoc scale.
export const HEAD = Object.freeze({
  hairTop: 0.08,
  eyeY: 0.535,
  mouthY: 0.69,
  chinY: 0.78,
  // Front head layer = everything above the collar top plus a half-ellipse around the
  // chin (half-width `chinRx`, down to `chinBottom`). The chin rests on the collar rim;
  // the hair below the collar line goes behind the clothes, so no straight clip line
  // ever crosses the hair.
  chinRx: 0.2,
  chinBottom: 0.8,
});

// Collar top of every body (template turtleneck rim), just above the chin outline.
export const COLLAR_TOP = 0.7;

// The head (with its hats, glasses and mouth anchor) is drawn this many head cells lower than
// its cell, so the chin rests on the collar and the shoulders meet the jaw — no strip of hair or
// background between head and torso. The clothes stay where they are (designer, 2026-10-13).
export const HEAD_DROP = 0.03;

// Fixed canvas shared by every combination, so switching any item never rescales
// or shifts the character on screen. x: 0..width, y: top..top+height.
export const CANVAS = Object.freeze({ width: 1, top: -0.04, height: 1.39, pxPerCell: 512 });

// Fit rules. `width` is the opaque width in head cells; `top` / `cy` are vertical
// anchors in head cells; `cx` horizontal centre.
export const FIT = Object.freeze({
  // Bodies are NOT trimmed: every outfit is a Nano Banana 2 edit of one body template
  // (art-source/customization/generated/rig/template) and is cut with the same fixed
  // BODY_FRAME, so all garments share one silhouette. In that template the garment is
  // 0.78 head cells wide (narrower than the ≈0.8 hair silhouette, so clothes never read
  // larger than the head). Within BODY_FRAME the collar starts 0.054 cells and the
  // shoulders 0.162 cells below the frame top. The body is drawn between the back hair and the face;
  // the whole collar shows under the chin and the back hair fills the space beside it.
  body: { cx: 0.5, width: 0.884, top: COLLAR_TOP - 0.054 },
  // Head-worn items follow the lowered head.
  hats: {
    bonnet: { cx: 0.5, cy: 0.22 + HEAD_DROP, width: 0.66 },
    beret: { cx: 0.42, cy: 0.25 + HEAD_DROP, width: 0.52 },
  },
  glasses: { cx: 0.5, cy: HEAD.eyeY + HEAD_DROP, width: 0.46 },
});

// Outfit kind → rig body layer (drawn behind the head).
export const OUTFIT_LAYERS = Object.freeze({
  sweater: { body: 'body-sweater' },
  cat: { body: 'body-cat' },
  pink: { body: 'body-pink' },
});

// Mouth anchor as a fraction of the composed texture (feeding targets).
export const MOUTH = Object.freeze({ x: 0.5, y: (HEAD.mouthY + HEAD_DROP - CANVAS.top) / CANVAS.height });

// Fixed crop frame applied to every body cutout at build time, in the 4096 px space of
// the template edits: the template garment box (548,910)-(3548,3184) plus 200 px margin.
export const BODY_FRAME = Object.freeze({ left: 348, top: 710, width: 3400, height: 2674 });
