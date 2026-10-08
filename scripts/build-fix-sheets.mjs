// Level-fix pass (2026-10-08): cuts the Nano Banana Pro sheets in art-source/level-fix/cutout
// (Higgsfield Background Remover results) into public/assets/kitchen/*.webp.
// Two sheets came back as a loose layout instead of the requested grid, so sprites are found as
// connected components: each named box (1000-px preview coordinates, see FIX_SHEETS) takes every
// component whose centre lies inside it, so a sprite is never clipped by its box.
// Run alone: node scripts/build-fix-sheets.mjs   (also called by scripts/build-assets.mjs)
import sharp from 'sharp';
import { existsSync, mkdirSync, statSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { pathToFileURL } from 'node:url';
import { FIX_SHEETS } from '../src/content/kitchenArt.js';

const root = resolve(import.meta.dirname, '..');
const DOWN = 4; // component search runs on a 1/4-size alpha mask
const ALPHA = 60;

async function components(sheetPath) {
  const { width, height } = await sharp(sheetPath).metadata();
  const w = Math.ceil(width / DOWN);
  const h = Math.ceil(height / DOWN);
  const { data } = await sharp(sheetPath).ensureAlpha().extractChannel(3).resize(w, h, { kernel: 'nearest' }).raw().toBuffer({ resolveWithObject: true });
  const label = new Int32Array(w * h).fill(-1);
  const comps = [];
  for (let start = 0; start < w * h; start += 1) {
    if (label[start] !== -1 || data[start] <= ALPHA) continue;
    const c = { x0: w, y0: h, x1: 0, y1: 0, n: 0, sx: 0, sy: 0 };
    const stack = [start];
    label[start] = comps.length;
    while (stack.length) {
      const i = stack.pop();
      const x = i % w; const y = (i - x) / w;
      c.n += 1; c.sx += x; c.sy += y;
      if (x < c.x0) c.x0 = x; if (x > c.x1) c.x1 = x; if (y < c.y0) c.y0 = y; if (y > c.y1) c.y1 = y;
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [-1, -1], [1, -1], [-1, 1]]) {
        const nx = x + dx; const ny = y + dy;
        if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
        const j = ny * w + nx;
        if (label[j] === -1 && data[j] > ALPHA) { label[j] = comps.length; stack.push(j); }
      }
    }
    comps.push(c);
  }
  return { width, height, comps: comps.filter((c) => c.n >= 6) };
}

export async function buildFixSheets(log = console.log) {
  let total = 0;
  for (const sheet of FIX_SHEETS) {
    if (!sheet.boxes.length) continue;
    const sheetPath = resolve(root, 'art-source/level-fix/cutout', sheet.file);
    if (!existsSync(sheetPath)) throw new Error(`Missing level-fix cutout: ${sheet.file}`);
    const { width, height, comps } = await components(sheetPath);
    const k = width / 1000;
    for (const [key, [bx0, by0, bx1, by1], options = {}] of sheet.boxes) {
      const inside = comps.filter((c) => {
        const cx = (c.sx / c.n) * DOWN / k; const cy = (c.sy / c.n) * DOWN / k;
        return cx >= bx0 && cx <= bx1 && cy >= by0 && cy <= by1;
      });
      if (!inside.length) throw new Error(`${sheet.file} → ${key}: no sprite inside its box`);
      const pad = 6;
      const left = Math.max(0, Math.min(...inside.map((c) => c.x0)) * DOWN - pad);
      const top = Math.max(0, Math.min(...inside.map((c) => c.y0)) * DOWN - pad);
      const right = Math.min(width, (Math.max(...inside.map((c) => c.x1)) + 1) * DOWN + pad);
      const bottom = Math.min(height, (Math.max(...inside.map((c) => c.y1)) + 1) * DOWN + pad);
      // Pixels of other components inside the crop rectangle are erased with the low-res label mask.
      const crop = await sharp(sheetPath).extract({ left, top, width: right - left, height: bottom - top }).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
      const keep = new Set(inside);
      const others = comps.filter((c) => !keep.has(c) && c.x1 * DOWN >= left && c.x0 * DOWN <= right && c.y1 * DOWN >= top && c.y0 * DOWN <= bottom);
      if (others.length) {
        // Conservative: clear neighbour bounding boxes that do not overlap the kept sprites' boxes.
        for (const o of others) {
          const overlapsKept = inside.some((c) => o.x0 <= c.x1 && o.x1 >= c.x0 && o.y0 <= c.y1 && o.y1 >= c.y0);
          if (overlapsKept) continue;
          for (let y = Math.max(top, o.y0 * DOWN - 2); y < Math.min(bottom, (o.y1 + 1) * DOWN + 2); y += 1) {
            for (let x = Math.max(left, o.x0 * DOWN - 2); x < Math.min(right, (o.x1 + 1) * DOWN + 2); x += 1) {
              crop.data[((y - top) * crop.info.width + (x - left)) * 4 + 3] = 0;
            }
          }
        }
      }
      // Explicit erase rectangles (1000-px preview coordinates) for neighbours that touch the sprite.
      for (const [ex0, ey0, ex1, ey1] of options.erase ?? []) {
        for (let y = Math.max(top, Math.round(ey0 * k)); y < Math.min(bottom, Math.round(ey1 * k)); y += 1) {
          for (let x = Math.max(left, Math.round(ex0 * k)); x < Math.min(right, Math.round(ex1 * k)); x += 1) {
            crop.data[((y - top) * crop.info.width + (x - left)) * 4 + 3] = 0;
          }
        }
      }
      const target = resolve(root, 'public/assets/kitchen', `${key}.webp`);
      mkdirSync(dirname(target), { recursive: true });
      await sharp(crop.data, { raw: crop.info }).trim({ threshold: 1 })
        .resize({ width: 600, height: 600, fit: 'inside', withoutEnlargement: true })
        .webp({ quality: 90, alphaQuality: 92, effort: 5, smartSubsample: true }).toFile(target);
      const size = statSync(target).size;
      total += size;
      log(`${key.padEnd(26)} ${String(inside.length).padStart(2)} part(s) ${(size / 1024).toFixed(0).padStart(6)} KB`);
    }
  }
  return total;
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) await buildFixSheets();
