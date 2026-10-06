import { test, expect } from '@playwright/test';
import { mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { PART_TIME_JOB } from '../../src/content/partTime.js';

// Part Time Job (PartTimeJob.png). Fresh save: 1000 coins. Every action is a real tap; the
// debug snapshot is only read to know which card the customer asks for next.
const snapshot = (page) => page.evaluate(() => window.__GAME_DEBUG__?.snapshot());
// Dialog buttons are new objects: Phaser hit-tests them from the next frame, so tap like a
// player would, a moment after the dialog appears.
async function tapDialog(page, key) {
  await page.waitForTimeout(250);
  const s = await snapshot(page);
  await (test.info().project.use.hasTouch ? page.touchscreen.tap(s.targets[key].x, s.targets[key].y) : page.mouse.click(s.targets[key].x, s.targets[key].y));
}
async function waitFor(page, predicate, timeout = 20000) {
  await expect.poll(async () => { const s = await snapshot(page); return Boolean(s && predicate(s)); }, { timeout }).toBe(true);
  return snapshot(page);
}
const tap = (page, p) => (test.info().project.use.hasTouch ? page.touchscreen.tap(p.x, p.y) : page.mouse.click(p.x, p.y));

async function openShift(page) {
  let s = await waitFor(page, (v) => v.scene === 'Home' && v.targets?.partTime);
  await tap(page, s.targets.partTime);
  s = await waitFor(page, (v) => v.scene === 'PartTime' && v.dialog === 'Part Time Job');
  await page.waitForTimeout(300);
  return snapshot(page);
}
async function start(page) {
  let s = await openShift(page);
  await tapDialog(page, 'dialogPrimary');
  s = await waitFor(page, (v) => v.phase === 'serving' && !v.dialog);
  return s;
}
async function serveCustomer(page) {
  let s = await waitFor(page, (v) => v.phase === 'serving');
  const customer = s.shift.customer;
  for (let i = 0; i < s.shift.request.length; i += 1) {
    const id = s.shift.request[i];
    await tap(page, s.targets[`card:${id}`]);
    s = await waitFor(page, (v) => v.shift.customer !== customer || v.shift.progress === i + 1 || v.phase !== 'serving');
  }
  return s;
}

test.beforeEach(async ({ page }) => {
  await page.goto('/?debug=1');
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await waitFor(page, (v) => v.scene === 'Home');
});

test('part time job layout is safe in every supported viewport', async ({ page }, info) => {
  const vp = page.viewportSize();
  const inside = (r) => r.x >= -1 && r.y >= -1 && r.x + r.w <= vp.width + 1 && r.y + r.h <= vp.height + 1;
  const overlap = (a, b) => Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x) > 1 && Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y) > 1;
  let s = await openShift(page);
  for (const [name, r] of Object.entries(s.rects).filter(([n]) => n.startsWith('dialog'))) expect(inside(r), name).toBe(true);
  mkdirSync(resolve('qa', 'part-time'), { recursive: true });
  await page.screenshot({ path: resolve('qa', 'part-time', `${info.project.name}-intro.png`) });
  await tapDialog(page, 'dialogPrimary');
  s = await waitFor(page, (v) => v.phase === 'serving' && !v.dialog);
  await page.waitForTimeout(300);
  s = await snapshot(page);
  const report = await page.evaluate(() => window.__GAME_DEBUG__.layout());
  for (const r of report.textRects) expect(inside(r), r.text).toBe(true);
  expect(report.worstDistortion).toBeLessThan(0.02);
  const r = s.rects;
  for (const [name, rect] of Object.entries(r)) expect(inside(rect), name).toBe(true);
  const cards = [r['card-0'], r['card-1'], r['card-2']];
  for (let i = 0; i < 3; i += 1) {
    expect(Math.min(cards[i].w, cards[i].h)).toBeGreaterThanOrEqual(64);
    for (let j = i + 1; j < 3; j += 1) expect(overlap(cards[i], cards[j])).toBe(false);
    expect(overlap(cards[i], r.progress)).toBe(false);
    expect(overlap(cards[i], r.timer)).toBe(false);
  }
  // Cards are one row of equal, aligned buttons.
  expect(Math.abs(cards[0].y - cards[2].y)).toBeLessThan(1);
  expect(Math.abs(cards[0].h - cards[1].h)).toBeLessThan(1);
  expect(overlap(r.bubble, r.timer)).toBe(false);
  expect(overlap(r.bubble, r['hud-wallet'])).toBe(false);
  expect(overlap(r.timer, r.progress)).toBe(false);
  expect(r.timer.h).toBeGreaterThanOrEqual(90);
  // Silhouettes are readable: each slot is a decent size and fully inside the bubble.
  for (const slot of s.slots) {
    expect(slot.silhouette).toBe(true);
    expect(slot.x).toBeGreaterThan(r.bubble.x);
    expect(slot.x).toBeLessThan(r.bubble.x + r.bubble.w);
  }
  expect(s.progressText).toBe('0/6');
  await page.screenshot({ path: resolve('qa', 'part-time', `${info.project.name}-serving.png`) });
});

test('6 customers served in order complete the shift and pay the reward once', async ({ page }, info) => {
  test.skip(!['mouse-390x844', 'touch-360x800'].includes(info.project.name), 'Run on one mouse and one touch project.');
  let s = await start(page);
  const customers = new Set();
  for (let i = 0; i < 6; i += 1) {
    s = await waitFor(page, (v) => v.phase === 'serving' && v.shift.customer === i + 1);
    customers.add(s.customer);
    expect(s.shift.options).toHaveLength(3);
    expect(s.progressText).toBe(`${i}/6`);
    // The timer restarts full for every customer.
    expect(s.shift.timeFraction).toBeGreaterThan(0.85);
    s = await serveCustomer(page);
  }
  expect(customers.size).toBe(6);
  s = await waitFor(page, (v) => v.dialog === 'Shift complete!');
  expect(s.phase).toBe('won');
  expect(s.progressText).toBe('6/6');
  expect(s.reward).toEqual({ applied: true, coins: PART_TIME_JOB.reward });
  expect(s.save.coins).toBe(1000 + PART_TIME_JOB.reward);
  expect(s.hudCoins).toBe(s.save.coins);
  expect(s.save.rewardReceipts).toContain(`part-time:${s.runId}`);
  await tapDialog(page, 'dialogPrimary');
  s = await waitFor(page, (v) => v.scene === 'Home');
  expect(s.save.coins).toBe(1000 + PART_TIME_JOB.reward);
});

test('a wrong item shakes, costs 3 seconds and keeps the order; the right item continues', async ({ page }, info) => {
  test.skip(info.project.name !== 'mouse-390x844', 'Run once.');
  let s = await start(page);
  const expected = s.shift.request[0];
  const wrong = s.shift.options.find((id) => id !== expected);
  const before = s.shift.timeLeftMs;
  await tap(page, s.targets[`card:${wrong}`]);
  s = await waitFor(page, (v) => v.shift.mistakes === 1);
  expect(s.lastEvent).toBe('wrong');
  expect(s.shift.progress).toBe(0);
  expect(before - s.shift.timeLeftMs).toBeGreaterThanOrEqual(PART_TIME_JOB.wrongPenaltyMs);
  expect(s.slots.every((slot) => !slot.revealed)).toBe(true);
  await tap(page, s.targets[`card:${expected}`]);
  s = await waitFor(page, (v) => v.shift.progress === 1);
  expect(s.slots[0].revealed).toBe(true);
  expect(s.slots[0].silhouette).toBe(false);
  expect(s.slots[1].silhouette).toBe(true);
});

test('the timer runs down and 15 seconds without serving ends the shift with no reward', async ({ page }, info) => {
  test.skip(info.project.name !== 'mouse-390x844', 'Run once.');
  let s = await start(page);
  const a = s.timerFill;
  await page.waitForTimeout(2000);
  s = await snapshot(page);
  expect(s.timerFill).toBeLessThan(a - 0.08);
  expect(s.shift.timeLeftMs).toBeGreaterThan(10_000);
  s = await waitFor(page, (v) => v.phase === 'failed', 17_000);
  expect(s.dialog).toBe("Time's up!");
  expect(s.timerFill).toBe(0);
  expect(s.save.coins).toBe(1000);
  expect(s.reward).toBeNull();
  // Cards no longer work after the fail.
  const card = Object.entries(s.targets).find(([k]) => k.startsWith('card:'));
  expect(card).toBeTruthy();
  await tapDialog(page, 'dialogPrimary'); // Try again
  s = await waitFor(page, (v) => v.scene === 'PartTime' && v.dialog === 'Part Time Job' && v.phase === 'intro');
  expect(s.shift.timeLeftMs).toBe(PART_TIME_JOB.customerMs);
});

test('the gear pauses the clock; quitting leaves without a reward', async ({ page }, info) => {
  test.skip(info.project.name !== 'mouse-390x844', 'Run once.');
  let s = await start(page);
  await tap(page, s.targets.gear);
  s = await waitFor(page, (v) => v.paused && v.dialog === 'Paused');
  const frozen = s.shift.timeLeftMs;
  await page.waitForTimeout(1200);
  s = await snapshot(page);
  expect(s.shift.timeLeftMs).toBe(frozen);
  await tapDialog(page, 'dialogPrimary'); // Resume
  s = await waitFor(page, (v) => !v.paused && !v.dialog && v.shift.timeLeftMs < frozen);
  await tap(page, s.targets.gear);
  s = await waitFor(page, (v) => v.dialog === 'Paused');
  await tapDialog(page, 'dialogSecondary'); // Quit
  s = await waitFor(page, (v) => v.scene === 'Home');
  expect(s.save.coins).toBe(1000);
});
