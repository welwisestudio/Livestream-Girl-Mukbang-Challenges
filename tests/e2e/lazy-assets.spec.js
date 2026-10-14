import { test, expect } from '@playwright/test';
import './_texture-guard.js';

// Deferred art on a slow connection: every deferred image is delayed, and each screen is opened
// right after the Lobby appears. Screens must wait for their own art (no missing textures), the
// Lobby popups must work at once, and the game must stay usable.
const DEFERRED = /\/assets\/(campaign50|kitchen|store|canteen|part-time|customization|levels)\//;
const snapshot = (page) => page.evaluate(() => window.__GAME_DEBUG__?.snapshot());
async function waitFor(page, predicate, timeout = 30000) {
  await expect.poll(async () => { const s = await snapshot(page); return Boolean(s && predicate(s)); }, { timeout }).toBe(true);
  await page.waitForTimeout(80);
  return snapshot(page);
}
const missing = (page) => page.evaluate(() => window.__GAME_DEBUG__.missingTextures());

let delay = 0;
async function freshStart(page, delayMs) {
  delay = delayMs;
  await page.route(DEFERRED, async (route) => { await new Promise((r) => setTimeout(r, delay)); await route.continue(); });
  await page.goto('/?debug=1');
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  const s = await waitFor(page, (v) => v.scene === 'Home' && v.targets?.start);
  const assets = await page.evaluate(() => window.__GAME_DEBUG__.assets());
  expect(assets.loaded, 'only the start set is loaded with the Lobby').toBeLessThan(assets.total / 2);
  return s;
}

test.beforeEach(({}, info) => {
  test.skip(!['mouse-390x844', 'mouse-desktop-1280x720'].includes(info.project.name), 'One phone and one desktop project.');
});

test('Lobby popups work immediately while the rest of the art is still streaming', async ({ page }) => {
  let s = await freshStart(page, 4000);
  await page.mouse.click(s.targets.daily.x, s.targets.daily.y);
  s = await waitFor(page, (v) => v.playtime?.open && v.targets?.['pt:pt-1']);
  await page.waitForTimeout(400);
  expect(await missing(page)).toEqual([]);
  await page.keyboard.press('Escape');
  await page.reload();
  s = await waitFor(page, (v) => v.scene === 'Home' && v.targets?.plus);
  await page.mouse.click(s.targets.plus.x, s.targets.plus.y);
  await waitFor(page, (v) => v.phase === 'free-coins');
  await page.waitForTimeout(300);
  s = await snapshot(page);
  await page.mouse.click(s.targets.settings.x, s.targets.settings.y);
  await page.waitForTimeout(400);
  expect(await missing(page)).toEqual([]);
});

for (const [target, scene] of [['start', 'Level'], ['levels', 'Levels'], ['skin', 'Customization'], ['store', 'Store'], ['canteen', 'Canteen'], ['partTime', 'PartTime']]) {
  test(`${scene} opened right after start waits for its art`, async ({ page }) => {
    const s = await freshStart(page, 1500);
    const t0 = Date.now();
    await page.mouse.click(s.targets[target].x, s.targets[target].y);
    if (target === 'start') { await page.waitForTimeout(150); const again = await snapshot(page); if (again.scene === 'Home') await page.mouse.click(again.targets.start.x, again.targets.start.y); }
    const opened = await waitFor(page, (v) => v.scene === scene, 40000);
    expect(Date.now() - t0, 'the screen waited for its delayed art').toBeGreaterThan(1200);
    await page.waitForTimeout(600);
    expect(await missing(page)).toEqual([]);
    expect(opened.scene).toBe(scene);
    // Everything arrives in the background eventually (artificial delay lifted for the rest).
    delay = 0;
    await expect.poll(async () => { const a = await page.evaluate(() => window.__GAME_DEBUG__.assets()); return a.loaded === a.total && a.queued === 0; }, { timeout: 60000 }).toBe(true);
    expect(await missing(page)).toEqual([]);
  });
}
