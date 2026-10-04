// Builds runtime WebP assets from the masters in art-source/. Masters are never modified.
// Run: npm run assets
import sharp from 'sharp';
import { mkdirSync, statSync } from 'node:fs';
import { resolve, dirname } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const src = (p) => resolve(root, 'art-source/level1', p);
const campaignSrc = (p) => resolve(root, 'art-source/campaign', p);
const out = (p) => resolve(root, 'public/assets', p);

// max = longest side in px after trimming. Sizes target ~2× the largest on-screen CSS size.
const ASSETS = [
  { key: 'room', from: 'original/kitchen-background.png', to: 'level1/room.webp', max: 2752, trim: false, quality: 80 },
  { key: 'character-happy', from: 'sprites/character-happy.png', to: 'level1/character-happy.webp', max: 900 },
  { key: 'character-eating', from: 'sprites/character-eating.png', to: 'level1/character-eating.webp', max: 900 },
  { key: 'character-chewing', from: 'generated/cutout/07-character-chewing.png', to: 'level1/character-chewing.webp', max: 900 },
  { key: 'mascot', from: 'sprites/mascot.png', to: 'level1/mascot.webp', max: 400 },
  { key: 'avatar', from: 'sprites/avatar.png', to: 'level1/avatar.webp', max: 256 },
  { key: 'bowl', from: 'sprites/bowl.png', to: 'level1/bowl.webp', max: 700 },
  { key: 'bowl-filled', from: 'generated/cutout/01b-bowl-filled.png', to: 'level1/bowl-filled.webp', max: 700 },
  { key: 'orange-mix', from: 'sprites/orange-mix.png', to: 'level1/orange-mix.webp', max: 500 },
  { key: 'whisk', from: 'generated/cutout/00-whisk.png', to: 'level1/whisk.webp', max: 520 },
  { key: 'jelly-plain', from: 'sprites/jelly-plain.png', to: 'level1/jelly-plain.webp', max: 700 },
  { key: 'jelly-berries', from: 'generated/cutout/02-jelly-berries.png', to: 'level1/jelly-berries.webp', max: 700 },
  { key: 'jelly-finished', from: 'sprites/jelly-finished.png', to: 'level1/jelly-finished.webp', max: 700 },
  { key: 'plate-empty', from: 'generated/cutout/03-plate-empty.png', to: 'level1/plate-empty.webp', max: 500 },
  { key: 'piece-full', from: 'generated/cutout/04-piece-full.png', to: 'level1/piece-full.webp', max: 420 },
  { key: 'piece-bitten', from: 'generated/cutout/05-piece-bitten.png', to: 'level1/piece-bitten.webp', max: 420 },
  { key: 'piece-last', from: 'generated/cutout/06-piece-last.png', to: 'level1/piece-last.webp', max: 420 },
  { key: 'berries', from: 'sprites/berries.png', to: 'level1/berries.webp', max: 360 },
  { key: 'glaze', from: 'sprites/glaze.png', to: 'level1/glaze.webp', max: 420 },
  { key: 'check', from: 'sprites/check.png', to: 'level1/check.webp', max: 220 },
  { key: 'coin', from: 'generated/cutout/08-coin.png', to: 'level1/coin.webp', max: 160 },
  { key: 'hint-hand', from: 'generated/cutout/09-hint-hand.png', to: 'level1/hint-hand.webp', max: 220 },
  { key: 'padlock', from: 'generated/cutout/10-padlock.png', to: 'level1/padlock.webp', max: 200 },
  { key: 'logo', from: 'generated/cutout/12-logo.png', to: 'loading/logo.webp', max: 1200 },
  { key: 'loading-mascot', from: 'sprites/mascot.png', to: 'loading/mascot.webp', max: 360 },
];

// The four viewer avatars come from one 2×2 sheet; each quadrant is trimmed separately.
const AVATAR_SHEET = { from: 'generated/cutout/11-viewer-avatars.png', names: ['viewer-bunny', 'viewer-bear', 'viewer-cat', 'viewer-chick'], max: 140 };

const CAMPAIGN_SHEETS = [
  { folder: 'ramen', file: 'generated/cutout/ramen-sheet.png', names: [
    'pot-empty', 'noodles', 'broth', 'pot-noodles', 'seasoning', 'egg', 'ramen-toppings', 'ramen-finished',
    'stove', 'ramen-boiling', 'ramen-chopsticks', 'ramen-bite', 'ramen-bite-small', 'ramen-empty', 'ramen-tray', 'ramen-check',
  ] },
  { folder: 'pizza', file: 'generated/cutout/pizza-sheet.png', names: [
    'dough', 'pizza-sauce', 'dough-sauced', 'cheese', 'pizza-toppings', 'pizza-raw', 'oven', 'oven-baking',
    'pizza-finished', 'pizza-cutter', 'pizza-slice', 'pizza-slice-bitten', 'pizza-empty', 'tomato', 'cheese-wedge', 'pizza-check',
  ] },
  { folder: 'sushi', file: 'generated/cutout/sushi-sheet.png', names: [
    'sushi-mat', 'nori', 'rice', 'nori-rice', 'sushi-fillings', 'sushi-open', 'sushi-roll', 'sushi-knife',
    'sushi-cut', 'sushi-finished', 'sushi-chopsticks', 'sushi-piece', 'sushi-piece-bitten', 'sushi-empty', 'soy-sauce', 'sushi-check',
  ] },
  { folder: 'bubble-tea', file: 'generated/cutout/bubble-tea-sheet.png', names: [
    'tea-cup', 'pearls', 'cup-pearls', 'syrup', 'cup-syrup', 'milk-tea', 'cup-tea', 'ice',
    'cup-ice', 'shaker', 'bubble-tea-finished', 'bubble-tea-full', 'bubble-tea-half', 'bubble-tea-empty', 'sealer', 'tea-check',
  ] },
  { folder: 'lobby', file: 'generated/cutout/lobby-sheet.png', names: [
    'settings', 'part-time', 'canteen', 'store', 'skin', 'daily', 'supermarket', 'decor',
    'lobby-plate', 'lobby-spoon', 'phone', 'mitts', 'sprout-mascot', 'thought-bubble', 'new-badge', 'level-lock',
  ] },
];

// Crops to the solidly-opaque bounds (+margin). This drops faint stray pixels left by older
// cutouts, which otherwise inflate the sprite box and shift its visual centre.
async function cropToOpaque(buffer, threshold = 180, margin = 4) {
  const { data, info } = await sharp(buffer).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  let x0 = info.width; let y0 = info.height; let x1 = -1; let y1 = -1;
  for (let y = 0; y < info.height; y += 1) {
    for (let x = 0; x < info.width; x += 1) {
      if (data[(y * info.width + x) * 4 + 3] > threshold) {
        if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y;
      }
    }
  }
  const left = Math.max(0, x0 - margin);
  const top = Math.max(0, y0 - margin);
  const width = Math.min(info.width, x1 + margin + 1) - left;
  const height = Math.min(info.height, y1 + margin + 1) - top;
  return sharp(buffer).extract({ left, top, width, height }).png().toBuffer();
}

async function writeWebp(pipeline, target, quality) {
  mkdirSync(dirname(target), { recursive: true });
  await pipeline.webp({ quality, alphaQuality: 92, effort: 5, smartSubsample: true }).toFile(target);
  return statSync(target).size;
}

let total = 0;
for (const asset of ASSETS) {
  let buffer = await sharp(src(asset.from)).ensureAlpha().png().toBuffer();
  if (asset.trim !== false) buffer = await cropToOpaque(buffer);
  const pipeline = sharp(buffer).resize({ width: asset.max, height: asset.max, fit: 'inside', withoutEnlargement: true });
  const size = await writeWebp(pipeline, out(asset.to), asset.quality ?? 88);
  total += size;
  const meta = await sharp(out(asset.to)).metadata();
  console.log(`${asset.key.padEnd(18)} ${String(meta.width).padStart(4)}×${String(meta.height).padEnd(4)} ${(size / 1024).toFixed(0).padStart(5)} KB`);
}

{
  const sheet = sharp(src(AVATAR_SHEET.from));
  const { width, height } = await sheet.metadata();
  const half = { w: Math.floor(width / 2), h: Math.floor(height / 2) };
  for (let i = 0; i < 4; i += 1) {
    const cell = await sharp(src(AVATAR_SHEET.from)).extract({ left: (i % 2) * half.w, top: Math.floor(i / 2) * half.h, width: half.w, height: half.h }).png().toBuffer();
    const trimmed = await cropToOpaque(cell);
    const size = await writeWebp(sharp(trimmed).resize({ width: AVATAR_SHEET.max, height: AVATAR_SHEET.max, fit: 'inside' }), out(`level1/${AVATAR_SHEET.names[i]}.webp`), 88);
    total += size;
    console.log(`${AVATAR_SHEET.names[i].padEnd(18)} ${(size / 1024).toFixed(0).padStart(16)} KB`);
  }
}

for (const sheetDef of CAMPAIGN_SHEETS) {
  const sheetPath = campaignSrc(sheetDef.file);
  const { width, height } = await sharp(sheetPath).metadata();
  const cellW = Math.floor(width / 4);
  const cellH = Math.floor(height / 4);
  for (let i = 0; i < sheetDef.names.length; i += 1) {
    // Inset two pixels so a generated grid line can never leak into the runtime crop.
    const cell = await sharp(sheetPath).extract({
      left: (i % 4) * cellW + 2,
      top: Math.floor(i / 4) * cellH + 2,
      width: cellW - 4,
      height: cellH - 4,
    }).png().toBuffer();
    const trimmed = await cropToOpaque(cell, 150, 5);
    const key = sheetDef.names[i];
    const size = await writeWebp(
      sharp(trimmed).resize({ width: 700, height: 700, fit: 'inside', withoutEnlargement: true }),
      out(`campaign/${key}.webp`),
      88,
    );
    total += size;
    console.log(`${key.padEnd(22)} ${(size / 1024).toFixed(0).padStart(12)} KB`);
  }
}

console.log(`total ${(total / 1024).toFixed(0)} KB`);
