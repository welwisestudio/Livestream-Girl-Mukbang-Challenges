import { test, expect } from '@playwright/test';
import { mkdirSync } from 'node:fs';
import { resolve } from 'node:path';

// Playtime Rewards (PlaytimeRewards.png). Fresh save: 1000 coins. Minutes are staged with
// the dev-only addPlaytime hook except in the real-clock test; every claim uses real input.
const snapshot = (page) => page.evaluate(() => window.__GAME_DEBUG__?.snapshot());
async function waitFor(page, predicate, timeout = 20000) {
  await expect.poll(async () => { const s = await snapshot(page); return Boolean(s && predicate(s)); }, { timeout }).toBe(true);
  return snapshot(page);
}
const tap = (page, p) => (test.info().project.use.hasTouch ? page.touchscreen.tap(p.x, p.y) : page.mouse.click(p.x, p.y));
const addMinutes = (page, m) => page.evaluate((ms) => window.__GAME_DEBUG__.addPlaytime(ms), m * 60_000);

async function open(page) {
  let s = await waitFor(page, (v) => v.scene === 'Home' && v.targets?.daily);
  await tap(page, s.targets.daily);
  s = await waitFor(page, (v) => v.playtime?.open && v.targets?.['pt:pt-1']);
  await page.waitForTimeout(150);
  return snapshot(page);
}

test.beforeEach(async ({ page }) => {
  await page.goto('/?debug=1&ad=earned');
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await waitFor(page, (v) => v.scene === 'Home');
});

test('playtime window layout is safe in every supported viewport', async ({ page }, info) => {
  await addMinutes(page, 2.5);
  const s = await open(page);
  const vp = page.viewportSize();
  const inside = (r) => r.x >= -1 && r.y >= -1 && r.x + r.w <= vp.width + 1 && r.y + r.h <= vp.height + 1;
  const report = await page.evaluate(() => window.__GAME_DEBUG__.layout());
  for (const r of report.textRects) expect(inside(r), r.text).toBe(true);
  expect(report.worstDistortion).toBeLessThan(0.02);
  const rects = s.playtime.rects;
  for (const [name, r] of Object.entries(rects)) expect(inside(r), name).toBe(true);
  const tiles = Object.entries(rects).filter(([n]) => /^playtime-pt-/.test(n)).map(([, r]) => r);
  const overlap = (a, b) => Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x) > 1 && Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y) > 1;
  for (let i = 0; i < tiles.length; i += 1) for (let j = i + 1; j < tiles.length; j += 1) expect(overlap(tiles[i], tiles[j])).toBe(false);
  for (const t of tiles) {
    expect(overlap(t, rects['playtime-take-all'])).toBe(false);
    expect(Math.min(t.w, t.h)).toBeGreaterThanOrEqual(44);
  }
  expect(overlap(rects['playtime-panel'], rects['playtime-take-all'])).toBe(false);
  mkdirSync(resolve('qa', 'playtime'), { recursive: true });
  await page.screenshot({ path: resolve('qa', 'playtime', `${info.project.name}.png`) });
});

test('the clock counts real active play time', async ({ page }, info) => {
  test.skip(info.project.name !== 'mouse-390x844', 'Run once.');
  const a = (await snapshot(page)).playtime.activeMs;
  await page.waitForTimeout(3500);
  const b = (await snapshot(page)).playtime.activeMs;
  expect(b - a).toBeGreaterThanOrEqual(2000);
  expect(b - a).toBeLessThan(5000);
});

test('locked rewards cannot be claimed; unlocked ones pay once and show a check', async ({ page }, info) => {
  test.skip(info.project.name !== 'mouse-390x844', 'Run once.');
  let s = await open(page);
  await tap(page, s.targets['pt:pt-1']);
  await page.waitForTimeout(300);
  s = await snapshot(page);
  expect(s.save.coins).toBe(1000);
  expect(s.save.playtime.claimed).toEqual([]);

  await addMinutes(page, 1);
  s = await waitFor(page, (v) => v.playtime.claimable === 1 && v.playtime.badge);
  await tap(page, s.targets['pt:pt-1']);
  s = await waitFor(page, (v) => v.save.playtime.claimed.includes('pt-1'));
  expect(s.save.coins).toBe(1200);
  expect(s.playtime.hudCoins).toBe(1200);
  await tap(page, s.targets['pt:pt-1']);
  await page.waitForTimeout(300);
  expect((await snapshot(page)).save.coins).toBe(1200);
  expect((await snapshot(page)).playtime.badge).toBe(false);
});

test('item rewards add the wardrobe item and survive a reload', async ({ page }, info) => {
  test.skip(info.project.name !== 'mouse-390x844', 'Run once.');
  await addMinutes(page, 4);
  let s = await open(page);
  await tap(page, s.targets['pt:pt-3']);
  s = await waitFor(page, (v) => v.save.playtime.claimed.includes('pt-3'));
  expect(s.save.appearance.owned).toContain('outfit-berry-pop');
  expect(s.save.coins).toBe(1000);
  await page.reload();
  s = await waitFor(page, (v) => v.scene === 'Home');
  expect(s.save.playtime.claimed).toEqual(['pt-3']);
  expect(s.save.appearance.owned).toContain('outfit-berry-pop');
  expect(s.playtime.activeMs).toBeGreaterThanOrEqual(4 * 60_000);
  expect(s.playtime.claimable).toBe(2);
});

test('Take All pays nothing on a cancelled/failed ad and everything after an earned ad', async ({ page }, info) => {
  test.skip(info.project.name !== 'mouse-390x844', 'Run once.');
  await addMinutes(page, 1);
  let s = await open(page);
  await tap(page, s.targets['pt:pt-1']);
  s = await waitFor(page, (v) => v.save.coins === 1200);

  for (const mode of ['not-earned', 'error', 'unavailable']) {
    await page.evaluate((m) => window.__GAME_DEBUG__.setAdMode(m), mode);
    await tap(page, s.targets.takeAll);
    s = await waitFor(page, (v) => v.playtime.lastAd === mode && !v.playtime.busy);
    expect(s.save.coins).toBe(1200);
    expect(s.save.playtime.claimed).toEqual(['pt-1']);
  }

  await page.evaluate(() => window.__GAME_DEBUG__.setAdMode('interactive'));
  await tap(page, s.targets.takeAll);
  await expect(page.locator('#mock-rewarded-ad')).toBeVisible();
  // While the ad shows, a single claim cannot sneak in and time does not run.
  const during = (await snapshot(page)).playtime.activeMs;
  await page.waitForTimeout(1200);
  expect((await snapshot(page)).playtime.activeMs).toBe(during);
  await page.locator('#mock-rewarded-ad [data-finish]:not([disabled])').click({ timeout: 6000 });
  s = await waitFor(page, (v) => v.playtime.lastAd === 'granted');
  expect(s.save.coins).toBe(1200 + 300 + 500 + 1000 + 2000);
  expect(s.save.playtime.claimed).toHaveLength(7);
  expect(s.save.appearance.owned).toEqual(expect.arrayContaining(['outfit-berry-pop', 'hair-plum']));
  expect(s.playtime.remaining).toBe(0);
  expect(s.targets.takeAll).toBeUndefined();
  expect(s.playtime.hudCoins).toBe(s.save.coins);

  await tap(page, s.targets.playtimeClose);
  s = await waitFor(page, (v) => !v.playtime.open);
  expect(s.playtime.badge).toBe(false);
});
