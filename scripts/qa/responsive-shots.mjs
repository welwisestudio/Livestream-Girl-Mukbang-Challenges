// Responsive QA: opens every major screen at several viewport sizes and saves screenshots to
// qa/responsive/<size>/<screen>.png. Needs the dev server (npm run dev) on 127.0.0.1:5173.
// Usage: node scripts/qa/responsive-shots.mjs [WxH ...]
import { chromium } from '@playwright/test';
import { existsSync, mkdirSync } from 'node:fs';
import { resolve } from 'node:path';

const sizes = (process.argv.slice(2).length ? process.argv.slice(2) : ['390x844', '1366x768', '1920x1080', '2560x1440', '1024x768', '768x1024'])
  .map((s) => s.split('x').map(Number));
const edge = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';
const browser = await chromium.launch(existsSync(edge) ? { executablePath: edge } : {});
const errors = [];
for (const [width, height] of sizes) {
  const dir = resolve('qa', 'responsive', `${width}x${height}`);
  mkdirSync(dir, { recursive: true });
  const page = await browser.newPage({ viewport: { width, height } });
  page.on('pageerror', (e) => errors.push(`${width}x${height}: ${e.message}`));
  const snap = () => page.evaluate(() => window.__GAME_DEBUG__?.snapshot()).catch(() => null);
  const until = async (pred, label) => { for (let i = 0; i < 150; i += 1) { const s = await snap(); if (s && pred(s)) return s; await page.waitForTimeout(100); } throw new Error(`${width}x${height} ${label}: timeout`); };
  const shot = async (name, wait = 600) => { await page.waitForTimeout(wait); await page.screenshot({ path: resolve(dir, `${name}.png`) }); };
  const home = async () => { await page.goto('http://127.0.0.1:5173/?debug=1'); return until((s) => s.scene === 'Home' && s.targets?.levels, 'home'); };
  const open = async (target, scene) => { const h = await home(); await page.mouse.click(h.targets[target].x, h.targets[target].y); return until((s) => s.scene === scene, scene); };
  try {
    await page.goto('http://127.0.0.1:5173/?debug=1&reset=1&progress=7');
    await until((s) => s.scene === 'Home', 'home');
    await shot('01-lobby');
    let s = await home(); await page.mouse.click(s.targets.daily.x, s.targets.daily.y); await shot('02-playtime');
    await open('levels', 'Levels'); await shot('03-levels');
    await open('skin', 'Customization'); await shot('04-customization');
    await open('store', 'Store'); await shot('05-store');
    await open('canteen', 'Canteen'); await shot('06-canteen');
    s = await open('partTime', 'PartTime'); await shot('07-part-time-intro');
    s = await snap(); const start = s.targets?.dialogPrimary;
    if (start) { await page.mouse.click(start.x, start.y); await shot('08-part-time-serving', 900); }
    await home(); await page.evaluate(() => window.__GAME_DEBUG__.stageLevel('pizza-03'));
    await until((v) => v.scene === 'Level' && v.phase === 'cooking', 'cooking'); await shot('09-cooking');
    await page.evaluate(() => window.__GAME_DEBUG__.stageMukbang('pizza-03'));
    await until((v) => v.scene === 'Level' && v.phase === 'mukbang', 'mukbang'); await shot('10-mukbang', 900);
    await page.evaluate(() => window.__GAME_DEBUG__.stageResult('pizza-03'));
    await until((v) => v.scene === 'Result', 'result'); await shot('11-result', 1500);
  } catch (e) { errors.push(e.message); }
  await page.close();
}
await browser.close();
console.log(errors.length ? errors.join('\n') : 'ok');
