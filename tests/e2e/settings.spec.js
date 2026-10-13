import { test, expect } from '@playwright/test';
import { mkdirSync } from 'node:fs';
import { resolve } from 'node:path';

const snapshot = (page) => page.evaluate(() => window.__GAME_DEBUG__?.snapshot());
async function waitFor(page, predicate, timeout = 20000) {
  await expect.poll(async () => { const s = await snapshot(page); return Boolean(s && predicate(s)); }, { timeout }).toBe(true);
  return snapshot(page);
}
const tap = (page, p) => (test.info().project.use.hasTouch ? page.touchscreen.tap(p.x, p.y) : page.mouse.click(p.x, p.y));

test.beforeEach(async ({ page }) => {
  await page.goto('/?debug=1');
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await waitFor(page, (v) => v.scene === 'Home' && v.targets?.settings);
});

test('settings menu is responsive and both audio switches work', async ({ page }, info) => {
  let s = await snapshot(page);
  await tap(page, s.targets.settings);
  s = await waitFor(page, (v) => v.phase === 'settings' && v.targets?.sound && v.targets?.music);
  await page.waitForTimeout(220);

  const viewport = page.viewportSize();
  const rect = s.settings.rect;
  expect(rect.x).toBeGreaterThanOrEqual(-1);
  expect(rect.y).toBeGreaterThanOrEqual(-1);
  expect(rect.x + rect.w).toBeLessThanOrEqual(viewport.width + 1);
  expect(rect.y + rect.h).toBeLessThanOrEqual(viewport.height + 1);
  expect(s.audio).toMatchObject({ music: true, sfx: true });

  mkdirSync(resolve('qa', 'settings'), { recursive: true });
  await page.screenshot({ path: resolve('qa', 'settings', `${info.project.name}.png`) });

  await tap(page, s.targets.music);
  s = await waitFor(page, (v) => v.audio?.music === false && v.audio?.sfx === true);
  await tap(page, s.targets.sound);
  s = await waitFor(page, (v) => v.audio?.music === false && v.audio?.sfx === false);
  expect(s.save.audio).toEqual({ music: false, sfx: false, musicVolume: 1, sfxVolume: 1 });

  await page.reload();
  s = await waitFor(page, (v) => v.scene === 'Home');
  expect(s.audio).toMatchObject({ music: false, sfx: false });
});
