// Visual QA: plays Level 1 with real pointer input and screenshots every stage per viewport.
// Usage: node scripts/qa-capture.mjs <baseUrl> [outDir] [WxH ...]
// Needs a build with the test hook (dev server or `npm run build:qa` preview) and Chromium/Chrome
// (set PLAYWRIGHT_EXECUTABLE_PATH if Playwright's own browser is not installed).
import { chromium } from '@playwright/test';
import { mkdirSync } from 'node:fs';
import { resolve } from 'node:path';

const [, , baseUrl = 'http://127.0.0.1:5173/', outDir = 'qa-shots', ...sizes] = process.argv;
const viewports = (sizes.length ? sizes : ['390x844']).map((s) => { const [w, h] = s.split('x').map(Number); return { width: w, height: h }; });
const executablePath = process.env.PLAYWRIGHT_EXECUTABLE_PATH || undefined;

const snap = (page) => page.evaluate(() => window.__GAME_DEBUG__?.snapshot());
async function until(page, predicate, timeout = 15000) {
  const start = Date.now();
  for (;;) {
    const s = await snap(page);
    if (s && predicate(s)) return s;
    if (Date.now() - start > timeout) throw new Error(`timeout waiting; last=${JSON.stringify(s)}`);
    await page.waitForTimeout(60);
  }
}
async function tap(page, p) { await page.mouse.click(p.x, p.y); }
async function drag(page, a, b, steps = 16) {
  await page.mouse.move(a.x, a.y); await page.mouse.down();
  await page.mouse.move(b.x, b.y, { steps }); await page.mouse.up();
}
async function circle(page, c, r, turns = 2.4) {
  await page.mouse.move(c.x + r, c.y); await page.mouse.down();
  for (let i = 1; i <= 90; i += 1) { const a = (Math.PI * 2 * turns * i) / 90; await page.mouse.move(c.x + Math.cos(a) * r, c.y + Math.sin(a) * r); }
  await page.mouse.up();
}

const browser = await chromium.launch({ executablePath });
for (const vp of viewports) {
  const dir = resolve(outDir, `${vp.width}x${vp.height}`);
  mkdirSync(dir, { recursive: true });
  const page = await browser.newPage({ viewport: vp, deviceScaleFactor: 2 });
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  let n = 0;
  const shot = async (name) => { n += 1; await page.screenshot({ path: resolve(dir, `${String(n).padStart(2, '0')}-${name}.png`) }); };

  await page.goto(`${baseUrl}?debug=1`);
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await page.waitForTimeout(150);
  await shot('loading');
  let s = await until(page, (v) => v.scene === 'Home');
  await page.waitForTimeout(700);
  await shot('home');
  await tap(page, s.targets.start);
  s = await until(page, (v) => v.phase === 'prestream');
  await page.waitForTimeout(500);
  await shot('prestream');
  s = await until(page, (v) => v.targets?.startCooking);
  await page.waitForTimeout(500);
  await shot('request');
  await tap(page, s.targets.startCooking);

  s = await until(page, (v) => v.stepId === 'choose-mold' && v.targets?.correctChoice);
  await page.waitForTimeout(450);
  await shot('step1-choose');
  await tap(page, s.targets.correctChoice);
  s = await until(page, (v) => v.targets?.confirm);
  await page.waitForTimeout(400);
  await shot('step1-chosen');
  await tap(page, s.targets.confirm);

  s = await until(page, (v) => v.stepId === 'pour-mix' && v.targets?.dragFrom);
  await page.waitForTimeout(450);
  await shot('step2-pour');
  await drag(page, s.targets.dragFrom, s.targets.target);
  await page.waitForTimeout(900);
  await shot('step2-pouring');

  s = await until(page, (v) => v.stepId === 'stir' && v.targets?.stirCenter);
  await page.waitForTimeout(450);
  await shot('step3-stir');
  await circle(page, s.targets.stirCenter, s.targets.stirRadius, 1);
  await shot('step3-stir-half');
  await circle(page, s.targets.stirCenter, s.targets.stirRadius, 1.6);

  s = await until(page, (v) => v.stepId === 'unmold' && v.targets?.dragFrom);
  await page.waitForTimeout(300);
  await shot('step4-unmold');
  await drag(page, s.targets.dragFrom, s.targets.target);

  s = await until(page, (v) => v.stepId === 'add-berries' && v.targets?.correctChoice);
  await page.waitForTimeout(450);
  await shot('step5-topping');
  await tap(page, s.targets.correctChoice);
  s = await until(page, (v) => v.targets?.confirm);
  await page.waitForTimeout(450);
  await shot('step5-added');
  await tap(page, s.targets.confirm);

  s = await until(page, (v) => v.stepId === 'add-glaze' && v.targets?.correctChoice);
  await page.waitForTimeout(450);
  await shot('step6-glaze');
  await tap(page, s.targets.correctChoice);
  s = await until(page, (v) => v.targets?.confirm);
  await page.waitForTimeout(450);
  await shot('step6-added');
  await tap(page, s.targets.confirm);

  await until(page, (v) => v.phase === 'request-check');
  await page.waitForTimeout(700);
  await shot('request-done');
  await until(page, (v) => v.phase === 'perfect');
  await page.waitForTimeout(600);
  await shot('perfect');

  for (let i = 0; i < 3; i += 1) {
    s = await until(page, (v) => v.phase === 'mukbang' && v.targets?.serving);
    if (i === 0) { await page.waitForTimeout(600); await shot('mukbang'); }
    await drag(page, s.targets.serving, s.targets.mouth, 12);
    await page.waitForTimeout(420);
    if (i === 0) await shot('mukbang-eating');
  }
  s = await until(page, (v) => v.scene === 'Result' && v.targets?.next, 20000);
  await page.waitForTimeout(600);
  await shot('levelup');
  await tap(page, s.targets.next);
  s = await until(page, (v) => v.scene === 'Result' && v.targets?.claim);
  await page.waitForTimeout(600);
  await shot('complete');
  await tap(page, s.targets.claim);
  s = await until(page, (v) => v.scene === 'Home');
  await page.waitForTimeout(700);
  await shot('home-after');
  console.log(`${vp.width}x${vp.height}: coins=${s.save.coins} unlocked=${s.save.highestLevel} available=${s.save.availableLevel} errors=${errors.length}${errors.length ? `\n  ${errors.join('\n  ')}` : ''}`);
  await page.close();
}
await browser.close();
