import { test, expect } from '@playwright/test';
import { mkdirSync } from 'node:fs';
import { resolve } from 'node:path';

// Supermarket → checkout → snack stream (Store-*.png references). Fresh save: 1000 coins.
// Every action is real input; the debug snapshot only tells where things are.
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
const touch = () => test.info().project.use.hasTouch;
const tap = (page, p) => (touch() ? page.touchscreen.tap(p.x, p.y) : page.mouse.click(p.x, p.y));
async function drag(page, from, to) {
  await page.mouse.move(from.x, from.y);
  await page.mouse.down();
  for (let i = 1; i <= 8; i += 1) await page.mouse.move(from.x + ((to.x - from.x) * i) / 8, from.y + ((to.y - from.y) * i) / 8);
  await page.mouse.up();
}
const inside = (vp, r) => r.x >= -1 && r.y >= -1 && r.x + r.w <= vp.width + 1 && r.y + r.h <= vp.height + 1;
const overlap = (a, b) => Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x) > 1 && Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y) > 1;

async function openStore(page, via = 'store') {
  let s = await waitFor(page, (v) => v.scene === 'Home' && v.targets?.[via]);
  await tap(page, s.targets[via]);
  s = await waitFor(page, (v) => v.scene === 'Store' && v.targets?.buy);
  await page.waitForTimeout(300);
  return snapshot(page);
}
async function pick(page, keys) {
  let s = await snapshot(page);
  for (const key of keys) {
    if (!s.targets[`slot:${key}`]) {
      await tap(page, s.targets.arrowRight);
      s = await waitFor(page, (v) => v.targets[`slot:${key}`]);
    }
    const before = s.basket.count;
    await tap(page, s.targets[`slot:${key}`]);
    s = await waitFor(page, (v) => v.basket.count === before + 1);
  }
  return s;
}
async function scanAll(page) {
  let s = await waitFor(page, (v) => v.scene === 'Checkout');
  await page.waitForTimeout(300);
  for (;;) {
    s = await snapshot(page);
    const key = Object.keys(s.targets).find((k) => k.startsWith('item:'));
    if (!key) break;
    const left = s.items.filter((i) => !i.scanned).length;
    await tap(page, s.targets[key]);
    await waitFor(page, (v) => v.items.filter((i) => !i.scanned).length === left - 1);
  }
  return waitFor(page, (v) => v.phase === 'ready' && v.targets.pay);
}

test.beforeEach(async ({ page }) => {
  await page.goto('/?debug=1');
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await waitFor(page, (v) => v.scene === 'Home');
});

test('store and checkout layouts are safe in every supported viewport', async ({ page }, info) => {
  const vp = page.viewportSize();
  let s = await openStore(page);
  s = await pick(page, ['new-arrivals:0:0', 'new-arrivals:1:1', 'new-arrivals:2:2']);
  await page.waitForTimeout(400);
  s = await snapshot(page);
  const report = await page.evaluate(() => window.__GAME_DEBUG__.layout());
  expect(report.worstDistortion).toBeLessThan(0.02);
  for (const r of report.textRects) expect(inside(vp, r), r.text).toBe(true);
  const r = s.rects;
  for (const [name, rect] of Object.entries(r)) expect(inside(vp, rect), name).toBe(true);
  const tags = Object.entries(r).filter(([n]) => n.startsWith('tag-')).map(([, v]) => v);
  const products = Object.entries(r).filter(([n]) => n.startsWith('product-')).map(([, v]) => v);
  for (let i = 0; i < tags.length; i += 1) for (let j = i + 1; j < tags.length; j += 1) expect(overlap(tags[i], tags[j])).toBe(false);
  for (const p of products) {
    expect(overlap(p, r.sign), 'sign must not cover products').toBe(false);
    for (const t of tags) expect(overlap(p, t)).toBe(false);
  }
  // Bottom bar pieces never collide with each other or with the price tags.
  const bottom = ['live', 'basket', 'buy', 'cart', 'total'];
  for (let i = 0; i < bottom.length; i += 1) {
    for (let j = i + 1; j < bottom.length; j += 1) expect(overlap(r[bottom[i]], r[bottom[j]]), `${bottom[i]}/${bottom[j]}`).toBe(false);
    for (const t of tags) expect(overlap(r[bottom[i]], t), bottom[i]).toBe(false);
  }
  expect(overlap(r.close, r.coins)).toBe(false);
  expect(overlap(r.coins, r.sign)).toBe(false);
  for (const t of tags) expect(t.h).toBeGreaterThanOrEqual(18);
  mkdirSync(resolve('qa', 'store'), { recursive: true });
  await page.screenshot({ path: resolve('qa', 'store', `${info.project.name}-shelf.png`) });

  await tap(page, s.targets.buy);
  s = await scanAll(page);
  for (const [name, rect] of Object.entries(s.rects)) expect(inside(vp, rect), name).toBe(true);
  expect(overlap(s.rects.pay, s.rects.receipt)).toBe(false);
  await page.screenshot({ path: resolve('qa', 'store', `${info.project.name}-checkout.png`) });
});

test('adding and removing items updates basket, count and total immediately', async ({ page }, info) => {
  test.skip(info.project.name !== 'mouse-390x844', 'Run once.');
  let s = await openStore(page, 'market');
  expect([s.cartText, s.totalText, s.basketIcons.length]).toEqual(['0/5', '0', 0]);
  s = await pick(page, ['new-arrivals:0:0', 'new-arrivals:1:2']);
  expect([s.cartText, s.totalText]).toEqual(['2/5', '180']);
  expect(s.basketIcons).toEqual(['store-cookie-jar', 'store-potato-chips']);
  expect(s.shelf.filter((x) => x.selected).map((x) => x.key)).toEqual(['new-arrivals:0:0', 'new-arrivals:1:2']);
  // Tap the selected facing again → back on the shelf.
  await tap(page, s.targets['slot:new-arrivals:0:0']);
  s = await waitFor(page, (v) => v.basket.count === 1);
  expect([s.cartText, s.totalText]).toEqual(['1/5', '80']);
  // Tap an item inside the basket → removed.
  await tap(page, s.targets['basket:0']);
  s = await waitFor(page, (v) => v.basket.count === 0);
  expect([s.cartText, s.totalText, s.basketIcons.length]).toEqual(['0/5', '0', 0]);
  // Checkout with an empty basket is refused with a hint.
  await tap(page, s.targets.buy);
  s = await waitFor(page, (v) => Boolean(v.toast));
  expect(s.scene).toBe('Store');
  // Capacity 5: the sixth unit is refused.
  s = await pick(page, ['new-arrivals:0:0', 'new-arrivals:0:1', 'new-arrivals:0:2', 'new-arrivals:1:0', 'new-arrivals:1:1']);
  expect(s.cartText).toBe('5/5');
  await tap(page, s.targets['slot:new-arrivals:2:0']);
  s = await waitFor(page, (v) => v.lastResult === 'full');
  expect(s.basket.count).toBe(5);
  expect(s.toast).toContain('full');
  expect(s.totalText).toBe(String(100 + 100 + 100 + 120 + 100));
  // Category arrows switch the shelves; the basket keeps its items.
  await tap(page, s.targets.arrowRight);
  s = await waitFor(page, (v) => v.category === 'matcha');
  expect(s.basket.count).toBe(5);
  await tap(page, s.targets.close);
  await waitFor(page, (v) => v.scene === 'Home');
});

test('scan, pay and eat: the bought snacks are exactly the stream menu', async ({ page }, info) => {
  test.skip(!['mouse-390x844', 'touch-360x800'].includes(info.project.name), 'One mouse and one touch project.');
  let s = await openStore(page);
  s = await pick(page, ['new-arrivals:0:2', 'new-arrivals:1:0', 'matcha:1:1']);
  const bought = s.basket.items.map((i) => i.productId);
  expect(bought).toEqual(['orez', 'strawberry-milk', 'tokboki']);
  expect(s.totalText).toBe('520');
  await tap(page, s.targets.buy);
  s = await waitFor(page, (v) => v.scene === 'Checkout');
  await page.waitForTimeout(300);
  s = await snapshot(page);
  expect(s.receiptText).toBe('Scanned 0/3 · 0');
  expect(s.targets.pay).toBeTruthy(); // Buy is visible before scanning
  if (!touch()) {
    // Drag the first item onto the scanner.
    await drag(page, s.targets['item:0'], s.targets.scanner);
    s = await waitFor(page, (v) => v.receiptText === 'Scanned 1/3 · 100');
    expect(s.items[0].scanned).toBe(true);
  }
  s = await scanAll(page);
  expect(s.receiptText).toBe('Scanned 3/3 · 520');
  expect(s.save.coins).toBe(1000); // nothing charged before Pay
  await tap(page, s.targets.pay);
  s = await waitFor(page, (v) => v.phase === 'paying' || v.phase === 'paid' || v.scene === 'Meal');
  s = await waitFor(page, (v) => v.scene === 'Meal' && v.targets?.serving);
  expect(s.save.coins).toBe(480);
  expect(s.save.orders).toHaveLength(1);
  expect(s.save.orders[0].source).toBe('store');
  expect(s.save.orders[0].items.map((i) => i.food)).toEqual(bought);
  expect(s.menu).toEqual(bought);
  expect(s.servingTextures).toEqual(['store-orez', 'store-strawberry-milk', 'store-tokboki']);
  expect(s.save.rewardReceipts.some((r) => r.startsWith('store:'))).toBe(true);
  for (let i = 0; i < bought.length; i += 1) {
    s = await waitFor(page, (v) => v.targets?.serving && v.eaten === i, 15000);
    if (touch()) await tap(page, s.targets.serving);
    else await drag(page, s.targets.serving, s.targets.mouth);
    s = await waitFor(page, (v) => v.eaten === i + 1, 15000);
  }
  s = await waitFor(page, (v) => v.dialog === 'Delicious!');
  expect(s.save.orders).toEqual([]);
  expect(s.save.coins).toBe(480);
  await tapDialog(page, 'dialogPrimary');
  await waitFor(page, (v) => v.scene === 'Home');
});

test('not enough coins: payment is refused, nothing charged, basket kept; a smaller basket pays', async ({ page }, info) => {
  test.skip(info.project.name !== 'mouse-390x844', 'Run once.');
  let s = await openStore(page);
  s = await pick(page, ['matcha:0:0', 'matcha:0:2', 'matcha:1:1', 'matcha:1:0']); // 300+300+300+250
  expect(s.totalText).toBe('1150');
  expect(s.totalColor).toBe('#e53950'); // early warning
  await tap(page, s.targets.buy);
  s = await scanAll(page);
  await tap(page, s.targets.pay);
  s = await waitFor(page, (v) => v.dialog === 'Not enough coins');
  expect(s.result).toEqual({ status: 'insufficient', total: 1150, missing: 150 });
  expect(s.screenText).toBe('Not enough coins!');
  expect(s.save.coins).toBe(1000);
  expect(s.save.orders).toEqual([]);
  expect(s.coinsText).toBe('1000');
  await tapDialog(page, 'dialogPrimary'); // Back to shelves
  s = await waitFor(page, (v) => v.scene === 'Store' && v.basket.count === 4);
  await tap(page, s.targets['basket:0']);
  s = await waitFor(page, (v) => v.basket.count === 3);
  expect(s.totalText).toBe('850');
  await tap(page, s.targets.buy);
  s = await scanAll(page);
  await tap(page, s.targets.pay);
  s = await waitFor(page, (v) => v.scene === 'Meal');
  expect(s.save.coins).toBe(150);
  expect(s.menu).toHaveLength(3);
});

test('leaving the checkout before paying keeps the basket and charges nothing', async ({ page }, info) => {
  test.skip(info.project.name !== 'mouse-390x844', 'Run once.');
  let s = await openStore(page);
  s = await pick(page, ['new-arrivals:2:1', 'new-arrivals:2:2']);
  await tap(page, s.targets.buy);
  s = await waitFor(page, (v) => v.scene === 'Checkout');
  await page.waitForTimeout(300);
  await tap(page, (await snapshot(page)).targets.back);
  s = await waitFor(page, (v) => v.scene === 'Store' && v.basket.count === 2);
  expect(s.totalText).toBe('300');
  expect(s.save.coins).toBe(1000);
  expect(s.save.orders).toEqual([]);
});

test('Buy right away: the checkout scans the rest by itself and pays', async ({ page }, info) => {
  test.skip(!['mouse-390x844', 'touch-360x800'].includes(info.project.name), 'One mouse and one touch project.');
  let s = await openStore(page);
  s = await pick(page, ['new-arrivals:0:2', 'new-arrivals:1:0']); // 100 + 120
  await tap(page, s.targets.buy);
  s = await waitFor(page, (v) => v.scene === 'Checkout' && v.targets?.pay);
  await page.waitForTimeout(300);
  expect(s.receiptText).toBe('Scanned 0/2 · 0');
  await tap(page, (await snapshot(page)).targets.pay);
  s = await waitFor(page, (v) => v.scene === 'Meal' && v.targets?.serving);
  expect(s.save.coins).toBe(780);
  expect(s.menu).toEqual(['orez', 'strawberry-milk']);
});
