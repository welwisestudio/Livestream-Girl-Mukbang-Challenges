import sharp from 'sharp';

// Grid atlases are cut by whole objects, not by the grid: a pan handle or a stick that reaches
// past its cell line is kept, and pixels of neighbouring sprites inside the crop are erased.
// Objects are connected components of the alpha mask (searched at 1/DOWN size); a component
// belongs to the cell that contains its centre.
const DOWN = 2;
const ALPHA = 60;

const cache = new Map();

export async function labelSheet(sheetPath) {
  if (cache.has(sheetPath)) return cache.get(sheetPath);
  const { width, height } = await sharp(sheetPath).metadata();
  const w = Math.ceil(width / DOWN);
  const h = Math.ceil(height / DOWN);
  const { data } = await sharp(sheetPath).ensureAlpha().extractChannel(3).resize(w, h, { kernel: 'nearest' }).raw().toBuffer({ resolveWithObject: true });
  const label = new Int32Array(w * h).fill(-1);
  const comps = [];
  for (let start = 0; start < w * h; start += 1) {
    if (label[start] !== -1 || data[start] <= ALPHA) continue;
    const c = { id: comps.length, x0: w, y0: h, x1: 0, y1: 0, n: 0, sx: 0, sy: 0 };
    const stack = [start];
    label[start] = c.id;
    while (stack.length) {
      const i = stack.pop();
      const x = i % w; const y = (i - x) / w;
      c.n += 1; c.sx += x; c.sy += y;
      if (x < c.x0) c.x0 = x; if (x > c.x1) c.x1 = x; if (y < c.y0) c.y0 = y; if (y > c.y1) c.y1 = y;
      for (let dy = -1; dy <= 1; dy += 1) {
        for (let dx = -1; dx <= 1; dx += 1) {
          const nx = x + dx; const ny = y + dy;
          if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
          const j = ny * w + nx;
          if (label[j] === -1 && data[j] > ALPHA) { label[j] = c.id; stack.push(j); }
        }
      }
    }
    comps.push(c);
  }
  const sheet = { path: sheetPath, width, height, w, h, label, comps };
  cache.set(sheetPath, sheet);
  return sheet;
}

// `cell` is { left, top, width, height } in sheet pixels. Returns a PNG buffer of the cell's
// objects, cropped to their union box (+pad), with every other object's pixels cleared.
export async function cutCell(sheet, cell, { pad = 8, minArea = 12 } = {}) {
  const inCell = (c) => {
    const cx = (c.sx / c.n) * DOWN; const cy = (c.sy / c.n) * DOWN;
    return cx >= cell.left && cx < cell.left + cell.width && cy >= cell.top && cy < cell.top + cell.height;
  };
  const kept = sheet.comps.filter((c) => c.n >= minArea && inCell(c));
  if (!kept.length) throw new Error(`${sheet.path}: no object in cell ${JSON.stringify(cell)}`);
  const keep = new Set(kept.map((c) => c.id));
  const left = Math.max(0, Math.min(...kept.map((c) => c.x0)) * DOWN - pad);
  const top = Math.max(0, Math.min(...kept.map((c) => c.y0)) * DOWN - pad);
  const right = Math.min(sheet.width, (Math.max(...kept.map((c) => c.x1)) + 1) * DOWN + pad);
  const bottom = Math.min(sheet.height, (Math.max(...kept.map((c) => c.y1)) + 1) * DOWN + pad);
  const { data, info } = await sharp(sheet.path).extract({ left, top, width: right - left, height: bottom - top })
    .ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const { w, h, label } = sheet;
  for (let y = 0; y < info.height; y += 1) {
    for (let x = 0; x < info.width; x += 1) {
      const lx = Math.min(w - 1, Math.floor((x + left) / DOWN));
      const ly = Math.min(h - 1, Math.floor((y + top) / DOWN));
      const id = label[ly * w + lx];
      let erase = id >= 0 && !keep.has(id);
      if (id < 0) {
        // Soft edge pixels: keep them next to a kept object, drop them next to a neighbour.
        let near = 0;
        for (let dy = -2; dy <= 2 && near !== 1; dy += 1) {
          for (let dx = -2; dx <= 2; dx += 1) {
            const qx = lx + dx; const qy = ly + dy;
            if (qx < 0 || qy < 0 || qx >= w || qy >= h) continue;
            const q = label[qy * w + qx];
            if (q < 0) continue;
            if (keep.has(q)) { near = 1; break; }
            near = 2;
          }
        }
        erase = near === 2;
      }
      if (erase) data[(y * info.width + x) * 4 + 3] = 0;
    }
  }
  return sharp(data, { raw: info }).png().toBuffer();
}
