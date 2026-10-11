import sharp from 'sharp';
import { mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const atlas = resolve(root, 'art-source/settings/generated/cutout/settings-atlas.png');
const parts = [
  ['settings-panel', [80, 70, 1120, 1700], 1100],
  ['settings-sound', [1160, 60, 1710, 620], 420],
  ['settings-music', [1720, 60, 2280, 620], 420],
  ['settings-toggle', [1160, 680, 1720, 1060], 520],
  ['settings-knob', [1760, 650, 2250, 1100], 320],
  ['settings-home', [1150, 1160, 2300, 1730], 1000],
];

async function trim(buffer, threshold = 60, margin = 4) {
  const { data, info } = await sharp(buffer).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  let x0 = info.width; let y0 = info.height; let x1 = -1; let y1 = -1;
  for (let y = 0; y < info.height; y += 1) for (let x = 0; x < info.width; x += 1) {
    if (data[(y * info.width + x) * 4 + 3] > threshold) {
      x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y);
    }
  }
  const left = Math.max(0, x0 - margin); const top = Math.max(0, y0 - margin);
  return sharp(buffer).extract({ left, top, width: Math.min(info.width, x1 + margin + 1) - left, height: Math.min(info.height, y1 + margin + 1) - top }).png().toBuffer();
}

for (const [key, [x0, y0, x1, y1], max] of parts) {
  const cell = await sharp(atlas).extract({ left: x0, top: y0, width: x1 - x0, height: y1 - y0 }).png().toBuffer();
  const input = await trim(cell);
  const target = resolve(root, `public/assets/settings/${key}.webp`);
  mkdirSync(dirname(target), { recursive: true });
  await sharp(input).resize({ width: max, height: max, fit: 'inside', withoutEnlargement: true }).webp({ quality: 92, alphaQuality: 92, effort: 5 }).toFile(target);
  const meta = await sharp(target).metadata();
  console.log(`${key} ${meta.width}x${meta.height}`);
}
