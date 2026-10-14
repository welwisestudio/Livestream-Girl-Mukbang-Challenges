import { test, expect } from '@playwright/test';
import './_texture-guard.js';
import { mkdirSync } from 'node:fs';
import { resolve } from 'node:path';

// Lobby "+" next to the wallet → Free Coins popup → optional rewarded ad. Fresh save: 1000 coins.
// Real taps only; the debug snapshot tells where things are and selects the mock ad outcome.
const snapshot = (page) => page.evaluate(() => window.__GAME_DEBUG__?.snapshot());
const layout = (page) => page.evaluate(() => window.__GAME_DEBUG__?.layout());
const touch = () => test.info().project.use.hasTouch;
const tap = (page, p) => (touch() ? page.touchscreen.tap(p.x, p.y) : page.mouse.click(p.x, p.y));
async function waitFor(page, predicate, timeout = 20000) {
  await expect.poll(async () => { const s = await snapshot(page); return Boolean(s && predicate(s)); }, { timeout }).toBe(true);
  return snapshot(page);
}
const overlap = (a, b) => Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x) > 1 && Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y) > 1;
const inside = (vp, r) => r.x >= -1 && r.y >= -1 && r.x + r.w <= vp.width + 1 && r.y + r.h <= vp.height + 1;

async function openPopup(page) {
  let s = await waitFor(page, (v) => v.scene === 'Home' && v.targets?.plus);
  await page.waitForTimeout(250);
  await tap(page, s.targets.plus);
  s = await waitFor(page, (v) => v.phase === 'free-coins' && v.targets?.dialogPrimary);
  await page.waitForTimeout(300); // dialog buttons hit-test from the next frame
  return snapshot(page);
}

test.beforeEach(async ({ page }) => {
  await page.goto('/?debug=1');
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await waitFor(page, (v) => v.scene === 'Home');
});

test('the + button and the Free Coins popup fit every viewport without overlaps', async ({ page }, info) => {
  const vp = page.viewportSize();
  await page.waitForTimeout(300);
  let report = await layout(page);
  const named = Object.fromEntries(report.rects.map((r) => [r.name, r]));
  const plus = named['hud-plus'];
  expect(plus, 'plus button is shown').toBeTruthy();
  expect(inside(vp, plus)).toBe(true);
  for (const other of ['settings', 'hud-profile', 'feature-store', 'feature-part-time']) {
    expect(overlap(plus, named[other]), `plus overlaps ${other}`).toBe(false);
  }
  // The count stays between the coin stack and the "+", also for a large balance.
  for (const coins of [1000, 17930, 999999]) {
    await page.evaluate((c) => window.__GAME_DEBUG__.setCoins(c), coins);
    await page.waitForTimeout(200);
    const rep = await layout(page);
    const rects = Object.fromEntries(rep.rects.map((r) => [r.name, r]));
    const text = rep.textRects.find((t) => t.text === String(coins));
    expect(text, `${coins} shown`).toBeTruthy();
    expect(overlap(rects['hud-plus'], text), `${coins} overlaps the plus`).toBe(false);
    expect(text.h, `${coins} readable`).toBeGreaterThanOrEqual(14);
  }
  await page.evaluate(() => window.__GAME_DEBUG__.setCoins(1000));
  await page.reload();
  await waitFor(page, (v) => v.scene === 'Home' && v.save.coins === 1000);
  expect(plus.w).toBeGreaterThanOrEqual(30);

  let s = await openPopup(page);
  expect(s.freeCoins).toMatchObject({ open: true, reward: 1000, busy: false });
  report = await layout(page);
  for (const t of report.textRects) expect(inside(vp, t), t.text).toBe(true);
  const r = s.freeCoins.rects;
  for (const [name, rect] of Object.entries(r)) expect(inside(vp, rect), name).toBe(true);
  expect(overlap(r['dialog-close'], r['dialog-primary'])).toBe(false);
  // The exact reward is on the card before any ad.
  expect(report.textRects.some((t) => t.text === '+1000')).toBe(true);
  mkdirSync(resolve('qa', 'free-coins'), { recursive: true });
  await page.screenshot({ path: resolve('qa', 'free-coins', `${info.project.name}.png`) });

  // Optional: closing pays nothing and returns to the Lobby.
  await tap(page, s.targets.dialogClose);
  s = await waitFor(page, (v) => v.phase === 'home' && !v.freeCoins.open);
  expect(s.save.coins).toBe(1000);
});

test('a cancelled, failed or missing ad gives nothing; an earned ad pays +1000 once', async ({ page }, info) => {
  test.skip(!['mouse-390x844', 'touch-360x800'].includes(info.project.name), 'One mouse and one touch project.');
  let s = await openPopup(page);
  for (const mode of ['not-earned', 'error', 'unavailable']) {
    await page.evaluate((m) => window.__GAME_DEBUG__.setAdMode(m), mode);
    await tap(page, s.targets.dialogPrimary);
    s = await waitFor(page, (v) => v.freeCoins.lastStatus === mode && !v.freeCoins.busy);
    expect(s.freeCoins.open).toBe(true);
    expect(s.save.coins).toBe(1000);
    expect(s.freeCoins.hudCoins).toBe(1000);
    expect(s.save.rewardReceipts.some((r) => r.startsWith('free-coins:'))).toBe(false);
    await page.evaluate(() => window.__GAME_DEBUG__.setAdMode('interactive'));
  }
  expect(s.freeCoins.note).toBe('No video available right now.');

  await page.evaluate(() => window.__GAME_DEBUG__.setAdMode('earned'));
  await page.waitForTimeout(150);
  await tap(page, s.targets.dialogPrimary);
  s = await waitFor(page, (v) => v.freeCoins.lastStatus === 'granted' && !v.freeCoins.open);
  expect(s.save.coins).toBe(2000);
  s = await waitFor(page, (v) => v.freeCoins.hudCoins === 2000);
  expect(s.save.rewardReceipts.filter((r) => r.startsWith('free-coins:'))).toHaveLength(1);

  // Reload: the coins were saved, and nothing is paid twice.
  await page.reload();
  s = await waitFor(page, (v) => v.scene === 'Home');
  expect(s.save.coins).toBe(2000);
});

test('the TEST ad overlay: closing it early gives nothing, finishing it pays', async ({ page }, info) => {
  test.skip(info.project.name !== 'mouse-390x844', 'Run once.');
  let s = await openPopup(page);
  await tap(page, s.targets.dialogPrimary);
  await page.getByRole('button', { name: /close ad/i }).click();
  s = await waitFor(page, (v) => v.freeCoins.lastStatus === 'not-earned' && !v.freeCoins.busy);
  expect(s.save.coins).toBe(1000);
  expect(s.freeCoins.note).toBe('Video closed early — no coins this time.');
  await page.waitForTimeout(150);
  await tap(page, s.targets.dialogPrimary);
  await page.getByRole('button', { name: /finish ad/i }).click({ timeout: 15000 });
  s = await waitFor(page, (v) => v.freeCoins.lastStatus === 'granted');
  expect(s.save.coins).toBe(2000);
});
