import { test, expect } from '@playwright/test';
import { mkdirSync } from 'node:fs';
import { resolve } from 'node:path';

// Post-level reward offer (ClaimMoney.jpg). Staged UI state: the Result scene is opened for
// Ramen (base reward 220 from level data) with a fresh save of 1000 coins; every claim uses
// real mouse/touch input on the rendered buttons. The full campaign route in campaign.spec.js
// separately reaches this screen by really playing the levels.
const BASE = 220;
const START_COINS = 1000;
const snapshot = (page) => page.evaluate(() => window.__GAME_DEBUG__?.snapshot());

async function waitFor(page, predicate, timeout = 20000) {
  await expect.poll(async () => { const s = await snapshot(page); return Boolean(s && predicate(s)); }, { timeout }).toBe(true);
  return snapshot(page);
}

const tap = (page, p) => (test.info().project.use.hasTouch ? page.touchscreen.tap(p.x, p.y) : page.mouse.click(p.x, p.y));

async function stage(page, { adMode = 'earned', runId } = {}) {
  await page.evaluate((m) => window.__GAME_DEBUG__.setAdMode(m), adMode);
  const id = await page.evaluate((r) => window.__GAME_DEBUG__.stageResult('ramen-02', r), runId);
  let s = await waitFor(page, (v) => v.scene === 'Result' && (v.targets?.next || v.targets?.rewardAd));
  if (s.targets.next) {
    await tap(page, s.targets.next);
    s = await waitFor(page, (v) => v.phase === 'reward' && v.targets?.rewardAd);
  }
  await page.waitForTimeout(150);
  return { runId: id, s: await snapshot(page) };
}

// Waits in the page until the pointer is in the middle of a segment holding `multiplier`,
// then taps the green button straight away.
async function tapAdOn(page, multiplier) {
  const target = await page.evaluate((m) => new Promise((done) => {
    const tick = () => {
      const o = window.__GAME_DEBUG__.snapshot().offer;
      const stops = [0, 0.207, 0.398, 0.603, 0.794, 1];
      const i = o.multiplierIndex;
      const mid = (stops[i] + stops[i + 1]) / 2;
      if (o.multiplier === m && Math.abs(o.pointer - mid) < 0.035) done(window.__GAME_DEBUG__.snapshot().targets.rewardAd);
      else requestAnimationFrame(tick);
    };
    tick();
  }), multiplier);
  await tap(page, target);
}

test.beforeEach(async ({ page }) => {
  await page.goto('/?debug=1');
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await waitFor(page, (v) => v.scene === 'Home');
});

test('reward screen layout is safe in every supported viewport', async ({ page }, info) => {
  const { s } = await stage(page);
  const report = await page.evaluate(() => window.__GAME_DEBUG__.layout());
  const vp = page.viewportSize();
  const inside = (r) => r.x >= -1 && r.y >= -1 && r.x + r.w <= vp.width + 1 && r.y + r.h <= vp.height + 1;
  for (const r of [...report.rects, ...report.textRects]) expect(inside(r), r.name ?? r.text).toBe(true);
  for (const t of report.targets) expect(Math.min(t.w, t.h)).toBeGreaterThanOrEqual(44);
  expect(report.minFont).toBeGreaterThanOrEqual(12);
  expect(report.worstDistortion).toBeLessThan(0.02);
  const { 'reward-bar': bar, 'reward-ad': ad, 'reward-base': base } = s.offer.rects;
  const overlap = (a, b) => Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x) > 1 && Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y) > 1;
  expect(overlap(bar, ad)).toBe(false);
  expect(overlap(ad, base)).toBe(false);
  expect(overlap(bar, base)).toBe(false);
  for (const r of [bar, ad, base]) expect(inside(r)).toBe(true);
  expect(bar.w).toBeGreaterThan(Math.min(vp.width, 600) * 0.6);
  mkdirSync(resolve('qa', 'reward'), { recursive: true });
  await page.screenshot({ path: resolve('qa', 'reward', `${info.project.name}.png`) });
});

test('pointer moves continuously both ways and the green button shows base × multiplier', async ({ page }, info) => {
  test.skip(info.project.name !== 'mouse-390x844', 'Run once.');
  await stage(page);
  const samples = [];
  for (let i = 0; i < 45; i += 1) {
    samples.push((await snapshot(page)).offer);
    await page.waitForTimeout(90);
  }
  const positions = samples.map((o) => o.pointer);
  const deltas = positions.slice(1).map((p, i) => p - positions[i]);
  expect(deltas.some((d) => d > 0.01)).toBe(true);
  expect(deltas.some((d) => d < -0.01)).toBe(true);
  expect(Math.min(...positions)).toBeLessThan(0.15);
  expect(Math.max(...positions)).toBeGreaterThan(0.85);
  // Never stops on its own: no long run of identical samples.
  expect(deltas.filter((d) => Math.abs(d) < 1e-6).length).toBeLessThan(2);
  expect(new Set(samples.map((o) => o.multiplierIndex)).size).toBe(5);
  for (const o of samples) {
    expect(o.baseReward).toBe(BASE);
    expect(o.offerCoins).toBe(BASE * o.multiplier);
  }
});

for (const multiplier of [2, 3, 5]) {
  test(`green button on x${multiplier} locks it and pays ${BASE * multiplier} after an earned ad`, async ({ page }, info) => {
    test.skip(info.project.name !== 'mouse-390x844', 'Run once.');
    await stage(page, { adMode: 'earned' });
    await tapAdOn(page, multiplier);
    let s = await waitFor(page, (v) => v.offer?.lockedMultiplier !== null && v.offer?.lockedMultiplier !== undefined);
    expect(s.offer.lockedMultiplier).toBe(multiplier);
    s = await waitFor(page, (v) => v.phase === 'returning');
    expect(s.offer.claimedCoins).toBe(BASE * multiplier);
    expect(s.offer.lastAdStatus).toBe('granted');
    expect(s.save.coins).toBe(START_COINS + BASE * multiplier);
    expect(s.offer.hudCoins).toBe(START_COINS + BASE * multiplier);
    s = await waitFor(page, (v) => v.scene === 'Home');
    expect(s.save.coins).toBe(START_COINS + BASE * multiplier);
    // Progression continues: Ramen counted as completed and Level 3 offered.
    expect(s.save.completedLevels['ramen-02']).toBe(1);
    expect(s.save.availableLevel).toBe(3);
  });
}

test('multiplier stays frozen while the ad shows; cancelled ad pays nothing; retry pays', async ({ page }, info) => {
  test.skip(info.project.name !== 'mouse-390x844', 'Run once.');
  await stage(page, { adMode: 'interactive' });
  await tapAdOn(page, 5);
  await expect(page.locator('#mock-rewarded-ad')).toBeVisible();
  const a = (await snapshot(page)).offer;
  await page.waitForTimeout(700);
  const b = (await snapshot(page)).offer;
  expect(a.lockedMultiplier).toBe(5);
  expect(b.lockedMultiplier).toBe(5);
  expect(b.pointer).toBe(a.pointer);
  expect((await snapshot(page)).phase).toBe('ad');

  await page.locator('#mock-rewarded-ad [data-close]').click();
  let s = await waitFor(page, (v) => v.phase === 'reward' && v.offer?.lastAdStatus === 'not-earned');
  expect(s.save.coins).toBe(START_COINS);
  expect(s.save.completedLevels['ramen-02']).toBeUndefined();
  expect(s.offer.lockedMultiplier).toBeNull();
  const p1 = s.offer.pointer; await page.waitForTimeout(250);
  expect((await snapshot(page)).offer.pointer).not.toBe(p1);

  // Retry: watch to the end this time.
  await tapAdOn(page, 3);
  await page.locator('#mock-rewarded-ad [data-finish]:not([disabled])').click({ timeout: 6000 });
  s = await waitFor(page, (v) => v.phase === 'returning');
  expect(s.offer.claimedCoins).toBe(BASE * 3);
  expect(s.save.coins).toBe(START_COINS + BASE * 3);
});

test('error and unavailable ads grant nothing and leave both options', async ({ page }, info) => {
  test.skip(info.project.name !== 'mouse-390x844', 'Run once.');
  await stage(page, { adMode: 'error' });
  await tapAdOn(page, 5);
  let s = await waitFor(page, (v) => v.phase === 'reward' && v.offer?.lastAdStatus === 'error');
  expect(s.save.coins).toBe(START_COINS);
  await page.evaluate(() => window.__GAME_DEBUG__.setAdMode('unavailable'));
  await tapAdOn(page, 2);
  s = await waitFor(page, (v) => v.phase === 'reward' && v.offer?.lastAdStatus === 'unavailable');
  expect(s.save.coins).toBe(START_COINS);
  expect(s.targets.rewardAd).toBeTruthy();
  expect(s.targets.rewardBase).toBeTruthy();
  await tap(page, s.targets.rewardBase);
  s = await waitFor(page, (v) => v.phase === 'returning');
  expect(s.save.coins).toBe(START_COINS + BASE);
});

test('small button pays only the base reward, without an ad, even on x5', async ({ page }, info) => {
  test.skip(info.project.name !== 'mouse-390x844', 'Run once.');
  await stage(page, { adMode: 'interactive' });
  const target = await page.evaluate(() => new Promise((done) => {
    const tick = () => { const s = window.__GAME_DEBUG__.snapshot(); if (s.offer.multiplier === 5) done(s.targets.rewardBase); else requestAnimationFrame(tick); };
    tick();
  }));
  await tap(page, target);
  const s = await waitFor(page, (v) => v.phase === 'returning');
  await expect(page.locator('#mock-rewarded-ad')).toHaveCount(0);
  expect(s.offer.claimedCoins).toBe(BASE);
  expect(s.offer.lastAdStatus).toBeNull();
  expect(s.save.coins).toBe(START_COINS + BASE);
});

test('double claiming is impossible: rapid taps, both buttons, and a replayed completion', async ({ page }, info) => {
  test.skip(info.project.name !== 'mouse-390x844', 'Run once.');
  const { runId, s: first } = await stage(page, { adMode: 'earned' });
  // Green then small button during the ad, then a second green tap.
  await tap(page, first.targets.rewardAd);
  await tap(page, first.targets.rewardBase);
  await tap(page, first.targets.rewardAd);
  let s = await waitFor(page, (v) => v.scene === 'Home');
  const paid = s.save.coins - START_COINS;
  expect([2, 3, 5].map((m) => BASE * m)).toContain(paid);
  expect(s.save.rewardReceipts.filter((r) => r === `level-complete:${runId}`)).toHaveLength(1);
  expect(s.save.completedLevels['ramen-02']).toBe(1);

  // The same completion opened again cannot be paid again by either button.
  await stage(page, { adMode: 'earned', runId });
  s = await snapshot(page);
  await tap(page, s.targets.rewardBase);
  s = await waitFor(page, (v) => v.scene === 'Home');
  expect(s.save.coins).toBe(START_COINS + paid);
  expect(s.save.completedLevels['ramen-02']).toBe(1);

  // Rapid double tap on the small button of a new completion pays once.
  const again = await stage(page, { adMode: 'earned' });
  await tap(page, again.s.targets.rewardBase);
  await tap(page, again.s.targets.rewardBase);
  s = await waitFor(page, (v) => v.scene === 'Home');
  expect(s.save.coins).toBe(START_COINS + paid + BASE);
});
