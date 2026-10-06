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
  // Above this line the head is drawn in front of the body (face, bangs); below it
  // the back hair goes behind the clothes. Just under the chin outline.
  frontCut: 0.795,
});

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
  // shoulders 0.162 cells below the frame top. The body is drawn between the back hair and the face; its shoulders start just under the chin, so the head rests on the collar and the
  // hair ends lie over the shoulders instead of floating above a long neck.
  body: { cx: 0.5, width: 0.884, top: HEAD.chinY + 0.04 - 0.162 },
  hats: {
    bonnet: { cx: 0.5, cy: 0.22, width: 0.66 },
    beret: { cx: 0.42, cy: 0.25, width: 0.52 },
  },
  glasses: { cx: 0.5, cy: HEAD.eyeY, width: 0.46 },
});

// Outfit kind → rig body layer (drawn behind the head).
export const OUTFIT_LAYERS = Object.freeze({
  sweater: { body: 'body-sweater' },
  cat: { body: 'body-cat' },
  pink: { body: 'body-pink' },
});

// Mouth anchor as a fraction of the composed texture (feeding targets).
export const MOUTH = Object.freeze({ x: 0.5, y: (HEAD.mouthY - CANVAS.top) / CANVAS.height });

// Fixed crop frame applied to every body cutout at build time, in the 4096 px space of
// the template edits: the template garment box (548,910)-(3548,3184) plus 200 px margin.
export const BODY_FRAME = Object.freeze({ left: 348, top: 710, width: 3400, height: 2674 });
