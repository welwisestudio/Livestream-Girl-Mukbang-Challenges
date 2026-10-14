// QA: Checkout (scanner) screenshots at several viewports and basket sizes, plus a mid-scan frame.
// Usage: node scripts/qa/checkout-shots.mjs <outDir> [prefix] [WxH ...]
import { chromium } from '@playwright/test';
import { existsSync } from 'node:fs';
const [, , out, prefix = 'shot', ...sizes] = process.argv;
const edge = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';
const browser = await chromium.launch({ executablePath: existsSync(edge) ? edge : undefined });
const snap = (p) => p.evaluate(() => window.__GAME_DEBUG__?.snapshot());
const baskets = { 2: ['cookie-jar', 'green-tea'], 5: ['cookie-jar', 'orez', 'green-tea', 'swirl-soda', 'strawberry-milk'] };
for (const s of sizes.length ? sizes : ['390x844']) {
  const [width, height] = s.split('x').map(Number);
  for (const n of [2, 5]) {
    const page = await browser.newPage({ viewport: { width, height } });
    await page.goto('http://127.0.0.1:5173/?debug=1');
    for (let i = 0; i < 200; i++) { if ((await snap(page))?.scene === 'Home') break; await page.waitForTimeout(100); }
    await page.evaluate((ids) => window.__GAME_DEBUG__.stageScene('Checkout', { items: ids.map((productId, slot) => ({ slot, productId })) }), baskets[n]);
    let v; for (let i = 0; i < 200; i++) { v = await snap(page); if (v?.scene === 'Checkout' && v.targets?.['item:0']) break; await page.waitForTimeout(100); }
    await page.waitForTimeout(700);
    await page.screenshot({ path: `${out}/${prefix}-${s}-${n}.png` });
    if (n === 2 && s === sizes[0]) {
      // Tap the first item and capture the laser sweep and the success state.
      await page.mouse.click(v.targets['item:0'].x, v.targets['item:0'].y);
      await page.waitForTimeout(420);
      await page.screenshot({ path: `${out}/${prefix}-${s}-scanning.png` });
      await page.waitForTimeout(500);
      await page.screenshot({ path: `${out}/${prefix}-${s}-scanned.png` });
    }
    v = await snap(page);
    console.log(s, n, JSON.stringify(v.rects).slice(0, 400), v.receiptText);
    await page.close();
  }
}
await browser.close();
