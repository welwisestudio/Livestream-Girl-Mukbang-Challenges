import sharp from 'sharp';

// Straightens a head cell whose hair silhouette leans to one side (the silver heads:
// crown and back hair sit ~1.5% left of the face, and the lower-right hair edge has no
// outline, so the head looked tilted and left a gap at the shoulder).
// The left half and the face stay exactly as drawn. On the right half:
//  1. each row's outer hair is stretched so its edge mirrors the left edge around the
//     cell centre (the face part of the row is untouched — no doubled strokes);
//  2. plain back hair below the ear / outside the side strand, and everything below
//     the chin, is taken from the mirrored left side so the outline matches.
// Fractions are of the 512 px head cell (see HEAD in src/content/characterRig.js).
export async function levelHead(input, { inner = 0.22, sideFrom = 0.7, sideX = 0.8, lowFrom = 0.83 } = {}) {
  const { data, info } = await sharp(input).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const W = info.width;
  const H = info.height;
  const axis = (W - 1) / 2;
  const out = Buffer.alloc(data.length);

  const sample = (sx, y, i) => {
    if (sx < 0 || sx > W - 1) {
      out.fill(0, i, i + 4);
      return;
    }
    const x0 = Math.floor(sx);
    const x1 = Math.min(W - 1, x0 + 1);
    const t = sx - x0;
    for (let k = 0; k < 4; k += 1) out[i + k] = Math.round(data[(y * W + x0) * 4 + k] * (1 - t) + data[(y * W + x1) * 4 + k] * t);
  };

  // Silhouette edges per row; the edge correction is smoothed vertically to avoid jitter.
  const left = [];
  const right = [];
  for (let y = 0; y < H; y += 1) {
    let l = -1;
    let r = -1;
    for (let x = 0; x < W; x += 1) {
      if (data[(y * W + x) * 4 + 3] > 128) {
        if (l < 0) l = x;
        r = x;
      }
    }
    left.push(l);
    right.push(r);
  }
  const delta = left.map((l, y) => (l < 0 || right[y] <= axis ? null : 2 * axis - l - right[y]));
  const smooth = delta.map((d, y) => {
    if (d === null) return null;
    let sum = 0;
    let n = 0;
    for (let k = -6; k <= 6; k += 1) {
      const v = delta[y + k];
      if (v != null) { sum += v; n += 1; }
    }
    return sum / n;
  });

  for (let y = 0; y < H; y += 1) {
    const r = right[y];
    const d = smooth[y];
    for (let x = 0; x < W; x += 1) {
      const i = (y * W + x) * 4;
      if (x <= axis || d === null) { sample(x, y, i); continue; }
      const keep = axis + Math.min(inner * W, 0.6 * (r - axis));
      const target = r + d;
      let sx = x;
      if (x > target) sx = r + (x - target);
      else if (x > keep) sx = keep + ((x - keep) * (r - keep)) / (target - keep);
      sample(sx, y, i);
    }
  }

  const warped = Buffer.from(out);
  const feather = 0.012;
  const ramp = (v) => Math.min(1, Math.max(0, (v + feather) / (2 * feather)));
  for (let y = 0; y < H; y += 1) {
    for (let x = Math.ceil(axis); x < W; x += 1) {
      const u = x / W;
      const v = y / H;
      const t = Math.max(ramp(v - lowFrom), Math.min(ramp(v - sideFrom), ramp(u - sideX)));
      if (t <= 0) continue;
      const i = (y * W + x) * 4;
      const j = (y * W + (W - 1 - x)) * 4;
      for (let k = 0; k < 4; k += 1) out[i + k] = Math.round(warped[i + k] * (1 - t) + warped[j + k] * t);
    }
  }
  return sharp(out, { raw: { width: W, height: H, channels: 4 } });
}
