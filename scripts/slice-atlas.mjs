// Slices the approved CP1 atlas into individual trimmed sprite masters.
import sharp from 'sharp';
import { mkdirSync } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const src = resolve(root, 'art-source/level1/original/level1-sprite-atlas-transparent.png');
const out = resolve(root, 'art-source/level1/sprites');
const NAMES = [
  'character-happy', 'character-eating', 'mascot', 'avatar',
  'bowl', 'orange-mix', 'mixing-bowl-spoon', 'mold',
  'jelly-plain', 'berries', 'glaze', 'jelly-finished',
  'servings', 'hand-legacy', 'circular-arrow', 'check',
];
mkdirSync(out, { recursive: true });
for (let i = 0; i < NAMES.length; i += 1) {
  const left = (i % 4) * 512;
  const top = Math.floor(i / 4) * 512;
  const cell = await sharp(src).extract({ left, top, width: 512, height: 512 }).png().toBuffer();
  await sharp(cell).trim({ threshold: 8 }).png().toFile(resolve(out, `${NAMES[i]}.png`));
}
console.log('sliced', NAMES.length);
