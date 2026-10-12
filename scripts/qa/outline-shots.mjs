// Outline/stroke consistency captures: the Lobby and the wardrobe (hair tab, then a priced item
// selected) at several viewports. Needs the dev server (npm run dev) on 127.0.0.1:5173.
// Usage: node scripts/qa/outline-shots.mjs [outDir] [WxH ...]
import { chromium } from '@playwright/test';
import { existsSync, mkdirSync } from 'node:fs';

const outDir = process.argv[2] ?? 'qa/outlines';
const sizes = (process.argv.length > 3 ? process.argv.slice(3) : ['390x844', '360x640', '768x1024', '1920x1080'])
  .map((s) => s.split('x').map(Number));
mkdirSync(outDir, { recursive: true });
const edge = process.env.PLAYWRIGHT_EXECUTABLE_PATH ?? 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';
const browser = await chromium.launch(existsSync(edge) ? { executablePath: edge } : undefined);
for (const [width, height] of sizes) {
  const page = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: 2 });
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  const snap = () => page.evaluate(() => window.__GAME_DEBUG__?.snapshot());
  const until = async (pred) => { for (let i = 0; i < 200; i += 1) { const s = await snap().catch(() => null); if (s && pred(s)) return s; await page.waitForTimeout(100); } throw new Error('timeout'); };
  await page.goto('http://127.0.0.1:5173/?debug=1');
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  let s = await until((v) => v.scene === 'Home' && v.targets?.skin);
  await page.waitForTimeout(500);
  await page.screenshot({ path: `${outDir}/lobby-${width}x${height}.png` });
  await page.mouse.click(s.targets.skin.x, s.targets.skin.y);
  s = await until((v) => v.scene === 'Customization' && v.targets?.['item:hair-honey']);
  await page.waitForTimeout(500);
  await page.screenshot({ path: `${outDir}/wardrobe-${width}x${height}.png` });
  await page.mouse.click(s.targets['item:hair-honey'].x, s.targets['item:hair-honey'].y);
  await page.waitForTimeout(500);
  await page.screenshot({ path: `${outDir}/wardrobe-selected-${width}x${height}.png` });
  console.log(`${width}x${height}`, errors.length ? errors : 'no page errors');
  await page.close();
}
await browser.close();
