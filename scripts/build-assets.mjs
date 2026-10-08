// Builds runtime WebP assets from the masters in art-source/. Masters are never modified.
// Run: npm run assets
import sharp from 'sharp';
import { existsSync, mkdirSync, statSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { BODY_FRAME } from '../src/content/characterRig.js';
import { NEW_RECIPE_DEFINITIONS, foodTexture } from '../src/content/recipeCatalog.js';
import { KITCHEN_SHEETS } from '../src/content/kitchenArt.js';
import { buildFixSheets } from './build-fix-sheets.mjs';

const root = resolve(import.meta.dirname, '..');
const src = (p) => resolve(root, 'art-source/level1', p);
const campaignSrc = (p) => resolve(root, 'art-source/campaign', p);
const campaign50Src = (p) => resolve(root, 'art-source/campaign-50', p);
const customizationSrc = (p) => resolve(root, 'art-source/customization', p);
const lobbySrc = (p) => resolve(root, 'art-source/lobby', p);
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

// The rejected Lobby atlas is intentionally superseded by one Nano Banana 2 job per
// visible object. Every transparent source below has its own Higgsfield Background
// Remover result, so no runtime chroma-key or generated grid slicing is involved.
const LOBBY_INDIVIDUALS = [
  ['settings', 'generated/cutout/01-settings.png'],
  ['part-time', 'generated/buttons-v2/cutout/01-part-time.png'],
  ['canteen', 'generated/buttons-v2/cutout/02-canteen.png'],
  ['store', 'generated/buttons-v2/cutout/03-store.png'],
  ['skin', 'generated/buttons-v2/cutout/04-skin.png'],
  // Renamed to Playtime Reward (Nano Banana 2 text edit of the accepted Daily button).
  ['daily', 'generated/buttons-v2/cutout/05-playtime-4c638d70.png'],
  // Wide orange tiles redrawn one-to-one from reference/input/LobbyBottomButtons.png.
  ['supermarket', 'generated/nav-v3/cutout/supermarket.png'],
  ['decor', 'generated/nav-v3/cutout/decor.png'],
  ['sprout-mascot', 'generated/cutout/09-sprout-pet-bed.png'],
  ['thought-bubble', 'generated/cutout/10-thought-bubble.png'],
  ['lobby-placemat', 'generated/cutout/11-heart-placemat.png'],
  ['lobby-plate', 'generated/cutout/12-silver-plate.png'],
  ['lobby-spoon', 'generated/cutout/13-spoon.png'],
  ['phone', 'generated/cutout/14-phone.png'],
  ['mitts', 'generated/cutout/15-mitts.png'],
  ['lobby-cutlery-tray', 'generated/cutout/16-cutlery-tray.png'],
  ['lobby-coins', 'generated/cutout/17-coins.png'],
  ['new-badge', 'generated/cutout/18-new-badge.png'],
  ['lobby-start', 'generated/refresh/cutout/08-start.png'],
  ['lobby-chicken', 'generated/cutout/20-fried-chicken.png'],
];

const LOBBY_SIDE_BUTTONS = new Set(['part-time', 'canteen', 'store', 'skin', 'daily']);

const LOBBY_TEXTURES = [
  ['lobby-wallpaper', 'generated/raw/23-wallpaper.png'],
  ['lobby-tablecloth', 'generated/raw/24-tablecloth.png'],
];


const CUSTOMIZATION_ACCESSORY_SHEET = {
  file: 'generated/cutout/accessory-ui-atlas.png',
  names: [
    'custom-beret', 'custom-bonnet', 'custom-flower', 'custom-carrot',
    null, null, 'custom-card', 'custom-card-selected',
    'custom-icon-hair', 'custom-icon-outfit', 'custom-icon-hat', 'custom-icon-glasses',
    'custom-icon-tablecloth', null, 'custom-price-pill', 'custom-close',
  ],
};

const CUSTOMIZATION_GLASSES_SHEET = {
  file: 'generated/cutout/glasses-corrected-atlas.png',
  columns: 2,
  rows: 4,
  cells: [
    { index: 2, name: 'custom-glasses-round' },
    { index: 5, name: 'custom-glasses-heart' },
  ],
};

const CUSTOMIZATION_ENVIRONMENT_SHEET = {
  file: 'generated/raw/environment-atlas-raw.png',
  cells: [
    { index: 0, name: 'custom-bg-hearts' },
    { index: 1, name: 'custom-bg-bunnies' },
    { index: 2, name: 'custom-bg-garden' },
    { index: 6, name: 'custom-table-lavender' },
    { index: 7, name: 'custom-table-winter' },
    { index: 8, name: 'custom-table-floral' },
  ],
};

// Silver-heroine head sets (2026-10-06). Happy/eating are edits of the chewing grid,
// so all three poses share identical cell anchors.
const CUSTOMIZATION_HEAD_SHEETS = [
  { pose: 'happy', file: 'generated/heroine-silver/cutout/heads-happy-1bdc1ebd.png' },
  { pose: 'eating', file: 'generated/heroine-silver/cutout/heads-eating-3b26666d.png' },
  { pose: 'chewing', file: 'generated/heroine-silver/cutout/heads-chewing-cdfc8a7c.png' },
];
const CUSTOMIZATION_HAIR = ['silver', 'honey', 'plum'];
// Rig bodies: Nano Banana 2 edits of one template, cut with the same fixed frame
// (see BODY_FRAME in src/content/characterRig.js) — never trimmed per asset.
const CUSTOMIZATION_BODIES = [
  ['body-sweater', 'generated/rig/cutout/body-sweater-4526701e.png'],
  ['body-cat', 'generated/rig/cutout/body-cat-2d2afb03.png'],
  ['body-pink', 'generated/rig/cutout/body-pink-6098fb4e.png'],
];
const CUSTOMIZATION_SKIN = ['peach', 'warm', 'deep'];

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

// Levels 6–50 are authored as nine 5×5 Nano Banana 2 atlases. Each row is a recipe;
// columns are raw, prepared, cooked, final and mukbang bite. The input is always the
// separate Higgsfield Background Remover result, never a locally keyed white background.
for (let group = 0; group < NEW_RECIPE_DEFINITIONS.length; group += 5) {
  const definitions = NEW_RECIPE_DEFINITIONS.slice(group, group + 5);
  const first = String(definitions[0].number).padStart(2, '0');
  const last = String(definitions.at(-1).number).padStart(2, '0');
  const sheetPath = campaign50Src(`generated/cutout/atlas-${first}-${last}.png`);
  const { width, height } = await sharp(sheetPath).metadata();
  const cellW = Math.floor(width / 5);
  const cellH = Math.floor(height / 5);
  for (let row = 0; row < definitions.length; row += 1) {
    for (let col = 0; col < 5; col += 1) {
      const stage = ['raw', 'prep', 'cooked', 'final', 'bite'][col];
      const key = foodTexture(definitions[row], stage);
      const inset = 5;
      const cell = await sharp(sheetPath).extract({
        left: col * cellW + inset,
        top: row * cellH + inset,
        width: cellW - inset * 2,
        height: cellH - inset * 2,
      }).png().toBuffer();
      const trimmed = await cropToOpaque(cell, 75, 4);
      const size = await writeWebp(
        sharp(trimmed).resize({ width: 700, height: 700, fit: 'inside', withoutEnlargement: true }),
        out(`campaign50/${key}.webp`),
        90,
      );
      total += size;
      console.log(`${key.padEnd(42)} ${(size / 1024).toFixed(0).padStart(8)} KB`);
    }
  }
}

// Recipe redesign: shared kitchen tools + Levels 6–10 intermediate states (5×5 each). Inputs are the
// Higgsfield Background Remover results. `erase` paints alpha=0 polygons in cell pixels before trimming
// (the sausage cell came back with a stick tip; the stick is a separate tool in this recipe).
const ERASE = {
  's-sausage': [[[277, 266], [370, 345], [335, 390], [249, 301]]],
};
for (const sheet of KITCHEN_SHEETS) {
  const sheetPath = resolve(root, 'art-source/recipe-redesign/generated/cutout', sheet.file);
  const { width, height } = await sharp(sheetPath).metadata();
  const cellW = Math.floor(width / 5);
  const cellH = Math.floor(height / 5);
  for (const [i, key] of sheet.names.entries()) {
    if (!key) continue; // rejected cell (see ASSET-MANIFEST)
    const inset = 5;
    const w = cellW - inset * 2;
    const h = cellH - inset * 2;
    let cell = await sharp(sheetPath).extract({ left: (i % 5) * cellW + inset, top: Math.floor(i / 5) * cellH + inset, width: w, height: h }).png().toBuffer();
    if (ERASE[key]) {
      const polys = ERASE[key].map((p) => `<polygon points="${p.map((q) => q.join(',')).join(' ')}" fill="#000"/>`).join('');
      const mask = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}">${polys}</svg>`);
      cell = await sharp(cell).composite([{ input: mask, blend: 'dest-out' }]).png().toBuffer();
    }
    let trimmed;
    try { trimmed = await cropToOpaque(cell, 75, 4); } catch (error) { throw new Error(`${sheet.file} → ${key}: empty crop box`); }
    const size = await writeWebp(
      sharp(trimmed).resize({ width: 600, height: 600, fit: 'inside', withoutEnlargement: true }),
      out(`kitchen/${key}.webp`),
      90,
    );
    total += size;
    console.log(`${key.padEnd(26)} ${(size / 1024).toFixed(0).padStart(8)} KB`);
  }
}

// Level-fix pass: component-based cuts, see scripts/build-fix-sheets.mjs.
total += await buildFixSheets();

for (const [key, file] of LOBBY_INDIVIDUALS) {
  const trimmed = await cropToOpaque(await sharp(lobbySrc(file)).ensureAlpha().png().toBuffer(), 90, 4);
  const resized = LOBBY_SIDE_BUTTONS.has(key)
    ? sharp(trimmed).resize({ height: 900, withoutEnlargement: true })
    : sharp(trimmed).resize({ width: 900, height: 900, fit: 'inside', withoutEnlargement: true });
  const size = await writeWebp(
    resized,
    out(`campaign/${key}.webp`),
    92,
  );
  total += size;
  console.log(`${key.padEnd(26)} ${(size / 1024).toFixed(0).padStart(8)} KB`);
}

for (const [key, file] of LOBBY_TEXTURES) {
  const size = await writeWebp(
    sharp(lobbySrc(file)).resize({ width: 1024, height: 1024, fit: 'cover' }),
    out(`campaign/${key}.webp`),
    90,
  );
  total += size;
  console.log(`${key.padEnd(26)} ${(size / 1024).toFixed(0).padStart(8)} KB`);
}

async function splitCustomizationCutout(sheetDef, columns, rows) {
  const sheetPath = customizationSrc(sheetDef.file);
  const { width, height } = await sharp(sheetPath).metadata();
  const cellW = Math.floor(width / columns);
  const cellH = Math.floor(height / rows);
  for (let i = 0; i < sheetDef.names.length; i += 1) {
    const key = sheetDef.names[i];
    if (!key) continue;
    // Nano Banana may leave a narrow white grid seam; the inset is deliberately larger
    // than campaign atlases so no seam can become part of a runtime layer.
    const inset = 10;
    const cell = await sharp(sheetPath).extract({
      left: (i % columns) * cellW + inset,
      top: Math.floor(i / columns) * cellH + inset,
      width: cellW - inset * 2,
      height: cellH - inset * 2,
    }).png().toBuffer();
    const trimmed = await cropToOpaque(cell, 90, 3);
    const size = await writeWebp(
      sharp(trimmed).resize({ width: 900, height: 900, fit: 'inside', withoutEnlargement: true }),
      out(`customization/${key}.webp`),
      90,
    );
    total += size;
    console.log(`${key.padEnd(26)} ${(size / 1024).toFixed(0).padStart(8)} KB`);
  }
}

await splitCustomizationCutout(CUSTOMIZATION_ACCESSORY_SHEET, 4, 4);

{
  const sheetPath = customizationSrc(CUSTOMIZATION_GLASSES_SHEET.file);
  const { width, height } = await sharp(sheetPath).metadata();
  const cellW = Math.floor(width / CUSTOMIZATION_GLASSES_SHEET.columns);
  const cellH = Math.floor(height / CUSTOMIZATION_GLASSES_SHEET.rows);
  for (const { index, name } of CUSTOMIZATION_GLASSES_SHEET.cells) {
    const inset = 12;
    const cell = await sharp(sheetPath).extract({
      left: (index % CUSTOMIZATION_GLASSES_SHEET.columns) * cellW + inset,
      top: Math.floor(index / CUSTOMIZATION_GLASSES_SHEET.columns) * cellH + inset,
      width: cellW - inset * 2,
      height: cellH - inset * 2,
    }).png().toBuffer();
    const trimmed = await cropToOpaque(cell, 90, 3);
    const size = await writeWebp(
      sharp(trimmed).resize({ width: 900, height: 900, fit: 'inside', withoutEnlargement: true }),
      out(`customization/${name}.webp`),
      90,
    );
    total += size;
    console.log(`${name.padEnd(26)} ${(size / 1024).toFixed(0).padStart(8)} KB`);
  }
}

// Hair and skin are authored as complete, aligned heads rather than runtime colour masks.
// Keep every cell on the same transparent square canvas so switching tone/style cannot jump.
for (const sheetDef of CUSTOMIZATION_HEAD_SHEETS) {
  const sheetPath = customizationSrc(sheetDef.file);
  const { width, height } = await sharp(sheetPath).metadata();
  const cellW = Math.floor(width / 3);
  const cellH = Math.floor(height / 3);
  for (let row = 0; row < 3; row += 1) {
    for (let col = 0; col < 3; col += 1) {
      const inset = 12;
      const key = `custom-head-${CUSTOMIZATION_HAIR[row]}-${CUSTOMIZATION_SKIN[col]}-${sheetDef.pose}`;
      const pipeline = sharp(sheetPath)
        .extract({
          left: col * cellW + inset,
          top: row * cellH + inset,
          width: cellW - inset * 2,
          height: cellH - inset * 2,
        })
        .resize({ width: 512, height: 512, fit: 'fill' });
      const size = await writeWebp(pipeline, out(`customization/${key}.webp`), 92);
      total += size;
      console.log(`${key.padEnd(36)} ${(size / 1024).toFixed(0).padStart(8)} KB`);
    }
  }
}

for (const [key, file] of CUSTOMIZATION_BODIES) {
  const source = sharp(customizationSrc(file));
  const { width } = await source.metadata();
  if (width !== 4096) throw new Error(`${file}: rig bodies must stay in the 4096 px template space`);
  const size = await writeWebp(
    sharp(customizationSrc(file)).extract(BODY_FRAME).resize({ width: 900 }),
    out(`customization/${key}.webp`),
    90,
  );
  total += size;
  console.log(`${key.padEnd(26)} ${(size / 1024).toFixed(0).padStart(8)} KB`);
}

{
  const sheetPath = customizationSrc(CUSTOMIZATION_ENVIRONMENT_SHEET.file);
  const { width, height } = await sharp(sheetPath).metadata();
  const cellW = Math.floor(width / 3);
  const cellH = Math.floor(height / 3);
  for (const { index, name } of CUSTOMIZATION_ENVIRONMENT_SHEET.cells) {
    const inset = 3;
    const pipeline = sharp(sheetPath)
      .extract({
        left: (index % 3) * cellW + inset,
        top: Math.floor(index / 3) * cellH + inset,
        width: cellW - inset * 2,
        height: cellH - inset * 2,
      })
      .resize({ width: 1024, height: 1024, fit: 'cover' });
    const size = await writeWebp(pipeline, out(`customization/${name}.webp`), 88);
    total += size;
    console.log(`${name.padEnd(26)} ${(size / 1024).toFixed(0).padStart(8)} KB`);
  }
}

// Post-level reward screen (ClaimMoney.jpg reference). Atlas cells are quadrants of the
// 4096² Background Remover results; every element is trimmed to its opaque bounds.
const rewardSrc = (p) => resolve(root, 'art-source/reward/generated/cutout', p);
const REWARD_PARTS = [
  ['reward-bar', 'bar-4db83828.png', null],
  ['reward-button', 'ui-a-6b8543b5.png', 0],
  ['reward-pill', 'ui-a-6b8543b5.png', 1],
  ['reward-pointer', 'ui-b-25cb6bf3.png', 2],
  ['reward-play', 'ui-b-25cb6bf3.png', 3],
];
for (const [key, file, quadrant] of REWARD_PARTS) {
  let input = await sharp(rewardSrc(file)).ensureAlpha().png().toBuffer();
  if (quadrant !== null) {
    const { width, height } = await sharp(input).metadata();
    const half = { w: Math.floor(width / 2), h: Math.floor(height / 2) };
    input = await sharp(input).extract({ left: (quadrant % 2) * half.w, top: Math.floor(quadrant / 2) * half.h, width: half.w, height: half.h }).png().toBuffer();
  }
  const trimmed = await cropToOpaque(input, 90, 3);
  const size = await writeWebp(
    sharp(trimmed).resize({ width: key === 'reward-bar' ? 1400 : 700, height: 700, fit: 'inside', withoutEnlargement: true }),
    out(`reward/${key}.webp`),
    90,
  );
  total += size;
  console.log(`${key.padEnd(26)} ${(size / 1024).toFixed(0).padStart(8)} KB`);
}

// Playtime Rewards window (PlaytimeRewards.png reference): atlas quadrants + header.
const playtimeSrc = (p) => resolve(root, 'art-source/playtime/generated/cutout', p);
const PLAYTIME_PARTS = [
  ['playtime-header', 'header-cb56d89a.png', null],
  ['playtime-panel', 'atlas-3dc63f25.png', 0],
  ['playtime-tile', 'atlas-3dc63f25.png', 1],
  ['playtime-tile-selected', 'atlas-3dc63f25.png', 2],
  ['playtime-check', 'atlas-3dc63f25.png', 3],
];
for (const [key, file, quadrant] of PLAYTIME_PARTS) {
  let input = await sharp(playtimeSrc(file)).ensureAlpha().png().toBuffer();
  if (quadrant !== null) {
    const { width, height } = await sharp(input).metadata();
    const half = { w: Math.floor(width / 2), h: Math.floor(height / 2) };
    input = await sharp(input).extract({ left: (quadrant % 2) * half.w, top: Math.floor(quadrant / 2) * half.h, width: half.w, height: half.h }).png().toBuffer();
  }
  const trimmed = await cropToOpaque(input, 90, 3);
  const size = await writeWebp(
    sharp(trimmed).resize({ width: key === 'playtime-header' ? 1400 : 800, height: 800, fit: 'inside', withoutEnlargement: true }),
    out(`playtime/${key}.webp`),
    90,
  );
  total += size;
  console.log(`${key.padEnd(26)} ${(size / 1024).toFixed(0).padStart(8)} KB`);
}

// Part Time Job minigame (PartTimeJob.png reference). Grids are cut into equal cells; the UI
// sheet is irregular, so each element uses its own box (fractions of the sheet).
const partTimeSrc = (p) => resolve(root, 'art-source/part-time', p);
{
  const bg = sharp(partTimeSrc('generated/bg-5f1f4c23.png')).resize({ width: 1080 });
  const size = await writeWebp(bg, out('part-time/ptj-background.webp'), 82);
  total += size;
  console.log(`${'ptj-background'.padEnd(26)} ${(size / 1024).toFixed(0).padStart(8)} KB`);
}
const PART_TIME_GRIDS = [
  // Customers keep ONE common scale (not fitted per cell) so their relative sizes stay true.
  { file: 'cutout/customers-a-85f9d844.png', names: ['ptj-customer-1', 'ptj-customer-2', 'ptj-customer-3', 'ptj-customer-4', 'ptj-customer-5', 'ptj-customer-6'], scale: 0.42 },
  { file: 'cutout/products-419eb6d0.png', names: ['ptj-corn-dog', 'ptj-snack', 'ptj-milk', 'ptj-donut', 'ptj-ice-cream', 'ptj-onigiri'], max: 360 },
];
for (const grid of PART_TIME_GRIDS) {
  const input = await sharp(partTimeSrc(grid.file)).ensureAlpha().png().toBuffer();
  const { width, height } = await sharp(input).metadata();
  const cell = { w: Math.floor(width / 3), h: Math.floor(height / 2) };
  for (let i = 0; i < grid.names.length; i += 1) {
    const part = await sharp(input).extract({ left: (i % 3) * cell.w, top: Math.floor(i / 3) * cell.h, width: cell.w, height: cell.h }).png().toBuffer();
    const trimmed = await cropToOpaque(part, 90, 3);
    const meta = await sharp(trimmed).metadata();
    const pipeline = grid.scale
      ? sharp(trimmed).resize({ width: Math.round(meta.width * grid.scale) })
      : sharp(trimmed).resize({ width: grid.max, height: grid.max, fit: 'inside' });
    const size = await writeWebp(pipeline, out(`part-time/${grid.names[i]}.webp`), 88);
    total += size;
    console.log(`${grid.names[i].padEnd(26)} ${(size / 1024).toFixed(0).padStart(8)} KB`);
  }
}
const PART_TIME_UI = [
  ['ptj-card', [0.04, 0.04, 0.34, 0.40], 420],
  ['ptj-progress', [0.37, 0.08, 0.97, 0.33], 640],
  ['ptj-timer', [0.06, 0.40, 0.23, 0.95], 600],
  ['ptj-bubble', [0.245, 0.39, 0.975, 0.705], 1400],
  ['ptj-arrow', [0.47, 0.71, 0.73, 0.93], 200],
];
{
  const input = await sharp(partTimeSrc('cutout/ui-8b47b3ba.png')).ensureAlpha().png().toBuffer();
  const { width, height } = await sharp(input).metadata();
  for (const [key, [x0, y0, x1, y1], max] of PART_TIME_UI) {
    const part = await sharp(input).extract({ left: Math.round(x0 * width), top: Math.round(y0 * height), width: Math.round((x1 - x0) * width), height: Math.round((y1 - y0) * height) }).png().toBuffer();
    const trimmed = await cropToOpaque(part, 90, 3);
    const size = await writeWebp(sharp(trimmed).resize({ width: max, height: max, fit: 'inside', withoutEnlargement: true }), out(`part-time/${key}.webp`), 90);
    total += size;
    console.log(`${key.padEnd(26)} ${(size / 1024).toFixed(0).padStart(8)} KB`);
  }
}

// Supermarket (Store-Shelf / Store-Matcha / Store-Scan references): opaque backgrounds,
// two 3×2 product sheets and a 3×3 UI sheet, all cut into equal cells.
const storeSrc = (p) => resolve(root, 'art-source/store', p);
for (const [key, file] of [
  ['store-shelf-pink', 'generated/shelf-pink-7e8bd689.png'],
  ['store-shelf-matcha', 'generated/shelf-matcha-b5a5e397.png'],
  ['store-scan', 'generated/scan-a12141ca.png'],
]) {
  const size = await writeWebp(sharp(storeSrc(file)).resize({ width: 1080 }), out(`store/${key}.webp`), 82);
  total += size;
  console.log(`${key.padEnd(26)} ${(size / 1024).toFixed(0).padStart(8)} KB`);
}
const STORE_GRIDS = [
  { file: 'cutout/products-a-4754e7b6.png', cols: 3, rows: 2, max: 360, names: ['store-cookie-jar', 'store-orez', 'store-green-tea', 'store-swirl-soda', 'store-strawberry-milk', 'store-potato-chips'] },
  { file: 'cutout/products-b-b46b3a6c.png', cols: 3, rows: 2, max: 360, names: ['store-matcha-sticks', 'store-matcha-biscuits', 'store-matcha-latte', 'store-tokboki', 'store-matcha-cookies', 'store-matcha-wafer'] },
  { file: 'cutout/ui-47bf7857.png', cols: 3, rows: 3, max: 520, names: ['store-close', 'store-arrow', 'store-check', 'store-basket', 'store-price-tag', 'store-pill', 'store-cart', 'store-live', 'store-sign'] },
];
for (const grid of STORE_GRIDS) {
  const input = await sharp(storeSrc(grid.file)).ensureAlpha().png().toBuffer();
  const { width, height } = await sharp(input).metadata();
  const cell = { w: Math.floor(width / grid.cols), h: Math.floor(height / grid.rows) };
  for (let i = 0; i < grid.names.length; i += 1) {
    const part = await sharp(input).extract({ left: (i % grid.cols) * cell.w, top: Math.floor(i / grid.cols) * cell.h, width: cell.w, height: cell.h }).png().toBuffer();
    const trimmed = await cropToOpaque(part, 90, 3);
    const size = await writeWebp(sharp(trimmed).resize({ width: grid.max, height: grid.max, fit: 'inside', withoutEnlargement: true }), out(`store/${grid.names[i]}.webp`), 88);
    total += size;
    console.log(`${grid.names[i].padEnd(26)} ${(size / 1024).toFixed(0).padStart(8)} KB`);
  }
}

// Canteen (Canteen.png reference): opaque background, containers 3×2, portions + tools 4×2,
// the clean tray (label removed by an NB2 edit) as a single cutout.
const canteenSrc = (p) => resolve(root, 'art-source/canteen', p);
{
  const size = await writeWebp(sharp(canteenSrc('generated/bg-22291b2e.png')).resize({ width: 1080 }), out('canteen/canteen-background.webp'), 82);
  total += size;
  console.log(`${'canteen-background'.padEnd(26)} ${(size / 1024).toFixed(0).padStart(8)} KB`);
  const tray = await cropToOpaque(await sharp(canteenSrc('cutout/tray-5b091454.png')).ensureAlpha().png().toBuffer(), 90, 2);
  const traySize = await writeWebp(sharp(tray).resize({ width: 1100 }), out('canteen/canteen-tray.webp'), 90);
  total += traySize;
  console.log(`${'canteen-tray'.padEnd(26)} ${(traySize / 1024).toFixed(0).padStart(8)} KB`);
}
const CANTEEN_GRIDS = [
  { file: 'cutout/containers-efe86803.png', cols: 3, rows: 2, max: 520, names: ['canteen-rice-pot', 'canteen-soup-bowl', 'canteen-veggie-bowl', 'canteen-jelly-tray', 'canteen-cookie-box', 'canteen-chicken-basket'] },
  { file: 'cutout/portions-56af97fd.png', cols: 4, rows: 2, max: 360, names: ['canteen-rice', 'canteen-soup', 'canteen-veggies', 'canteen-jelly', 'canteen-cookies', 'canteen-chicken', 'canteen-spoon', 'canteen-ladle'] },
];
for (const grid of CANTEEN_GRIDS) {
  const input = await sharp(canteenSrc(grid.file)).ensureAlpha().png().toBuffer();
  const { width, height } = await sharp(input).metadata();
  const cell = { w: Math.floor(width / grid.cols), h: Math.floor(height / grid.rows) };
  for (let i = 0; i < grid.names.length; i += 1) {
    const part = await sharp(input).extract({ left: (i % grid.cols) * cell.w, top: Math.floor(i / grid.cols) * cell.h, width: cell.w, height: cell.h }).png().toBuffer();
    const trimmed = await cropToOpaque(part, 90, 3);
    const size = await writeWebp(sharp(trimmed).resize({ width: grid.max, height: grid.max, fit: 'inside', withoutEnlargement: true }), out(`canteen/${grid.names[i]}.webp`), 88);
    total += size;
    console.log(`${grid.names[i].padEnd(26)} ${(size / 1024).toFixed(0).padStart(8)} KB`);
  }
}

console.log(`total ${(total / 1024).toFixed(0)} KB`);
