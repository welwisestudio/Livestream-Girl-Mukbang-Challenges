// Supermarket bottom-bar captures (live card, basket, count/total pills, Buy) with three items in
// the basket, at short and regular screen sizes. Needs the dev server (npm run dev) on
// 127.0.0.1:5173. Usage: node scripts/qa/store-bar-shots.mjs [outDir] [WxH ...]
import { chromium } from '@playwright/test';
import { existsSync, mkdirSync } from 'node:fs';
import sharp from 'sharp';

const outDir = process.argv[2] ?? 'qa/store-bar';
const sizes = (process.argv.length > 3 ? process.argv.slice(3) : ['360x560', '375x600', '390x700', '360x640', '390x844', '844x390', '768x1024', '1920x1080'])
  .map((s) => s.split('x').map(Number));
mkdirSync(outDir, { recursive: true });
const edge = process.env.PLAYWRIGHT_EXECUTABLE_PATH ?? 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';
const browser = await chromium.launch(existsSync(edge) ? { executablePath: edge } : undefined);
for (const [width, height] of sizes) {
  const page = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: 2 });
  const snap = () => page.evaluate(() => window.__GAME_DEBUG__?.snapshot());
  const until = async (pred) => { for (let i = 0; i < 200; i += 1) { const s = await snap().catch(() => null); if (s && pred(s)) return s; await page.waitForTimeout(100); } throw new Error('timeout'); };
  await page.goto('http://127.0.0.1:5173/?debug=1');
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  let s = await until((v) => v.scene === 'Home' && v.targets?.store);
  await page.mouse.click(s.targets.store.x, s.targets.store.y);
  s = await until((v) => v.scene === 'Store' && v.targets?.buy);
  await page.waitForTimeout(400);
  for (const key of ['slot:new-arrivals:0:2', 'slot:new-arrivals:1:0', 'slot:new-arrivals:2:1']) {
    s = await snap();
    await page.mouse.click(s.targets[key].x, s.targets[key].y);
    await page.waitForTimeout(250);
  }
  await page.waitForTimeout(400);
  const file = `${outDir}/store-${width}x${height}.png`;
  await page.screenshot({ path: file });
  // Close-up of the bottom quarter for review.
  const meta = await sharp(file).metadata();
  const cropH = Math.round(meta.height * (width > height ? 0.45 : 0.24));
  await sharp(file).extract({ left: 0, top: meta.height - cropH, width: meta.width, height: cropH }).toFile(`${outDir}/bar-${width}x${height}.png`);
  console.log(`${width}x${height}`);
  await page.close();
}
await browser.close();
