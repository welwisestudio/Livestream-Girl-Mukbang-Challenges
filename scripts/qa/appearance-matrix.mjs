// Renders appearance combinations with the game's real compositor and writes contact
// sheets to qa/appearance/. Needs the dev server (npm run dev) on 127.0.0.1:5173.
import { chromium } from '@playwright/test';
import sharp from 'sharp';
import { mkdirSync, existsSync } from 'node:fs';
import { join, resolve } from 'node:path';

const edge = join(process.env['PROGRAMFILES(X86)'] ?? 'C:\Program Files (x86)', 'Microsoft', 'Edge', 'Application', 'msedge.exe');
const browser = await chromium.launch(existsSync(edge) ? { executablePath: edge } : {});
const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
await page.goto('http://127.0.0.1:5173/?debug=1');
await page.waitForFunction(() => window.__GAME_DEBUG__?.snapshot().scene === 'Home', null, { timeout: 30000 });

const base = { hair: 'hair-silver', skin: 'skin-peach', outfit: 'outfit-frog-sweater', accessory: 'accessory-none', glasses: 'glasses-none', tablecloth: 'table-lavender', background: 'background-hearts' };
const HAIR = ['hair-silver', 'hair-honey', 'hair-plum'];
const SKIN = ['skin-peach', 'skin-warm', 'skin-deep'];
const OUTFIT = ['outfit-frog-sweater', 'outfit-orange-cat', 'outfit-berry-pop'];
const HAT = ['accessory-none', 'accessory-bow', 'accessory-daisy'];
const GLASSES = ['glasses-none', 'glasses-round', 'glasses-heart'];
const POSE = ['happy', 'eating', 'chewing'];

async function render(look, pose) {
  // The save is never touched: this only builds textures from item IDs.
  const data = await page.evaluate(([l, p]) => window.__GAME_DEBUG__.renderAppearance(l, p), [look, pose]);
  return Buffer.from(data.split(',')[1], 'base64');
}

const TILE = 180;
async function sheet(name, rows) {
  const cols = Math.max(...rows.map((r) => r.length));
  const tiles = [];
  for (let y = 0; y < rows.length; y += 1) {
    for (let x = 0; x < rows[y].length; x += 1) {
      const [look, pose] = rows[y][x];
      const img = await sharp(await render({ ...base, ...look }, pose)).resize({ width: TILE - 10, height: Math.round(TILE * 1.39) - 10, fit: 'contain', background: '#0000' }).png().toBuffer();
      tiles.push({ input: img, left: x * TILE + 5, top: Math.round(y * TILE * 1.39) + 5 });
    }
  }
  mkdirSync(resolve('qa', 'appearance'), { recursive: true });
  const out = resolve('qa', 'appearance', `${name}.png`);
  await sharp({ create: { width: cols * TILE, height: Math.round(rows.length * TILE * 1.39), channels: 4, background: '#e8f6ec' } })
    .composite(tiles).png().toFile(out);
  console.log(out, `${rows.length}x${cols}`);
}

// 1. Every outfit with every hair × skin (27 combos).
await sheet('outfit-hair-skin', OUTFIT.map((outfit) => HAIR.flatMap((hair) => SKIN.map((skin) => [{ outfit, hair, skin }, 'happy']))));
// 2. Every hair with every hat × glasses (27 combos).
await sheet('hair-hat-glasses', HAIR.map((hair) => HAT.flatMap((accessory) => GLASSES.map((glasses) => [{ hair, accessory, glasses }, 'happy']))));
// 3. Every outfit with every hat × glasses, warm skin (27 combos).
await sheet('outfit-hat-glasses', OUTFIT.map((outfit) => HAT.flatMap((accessory) => GLASSES.map((glasses) => [{ outfit, accessory, glasses, skin: 'skin-warm' }, 'happy']))));
// 4. Every pose for each hair × outfit, with heart glasses and the bonnet (27 combos).
await sheet('poses', HAIR.map((hair) => OUTFIT.flatMap((outfit) => POSE.map((pose) => [{ hair, outfit, glasses: 'glasses-heart', accessory: 'accessory-bow', skin: 'skin-deep' }, pose]))));
await browser.close();
