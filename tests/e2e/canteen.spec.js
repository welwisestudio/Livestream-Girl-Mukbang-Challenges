import { test, expect } from '@playwright/test';
import { mkdirSync } from 'node:fs';
import { resolve } from 'node:path';

// Canteen → pay → meal stream (Canteen.png reference). Fresh save: 1000 coins. Every action
// is real input; the debug snapshot only says where things are.
const snapshot = (page) => page.evaluate(() => window.__GAME_DEBUG__?.snapshot());
async function waitFor(page, predicate, timeout = 20000) {
  await expect.poll(async () => { const s = await snapshot(page); return Boolean(s && predicate(s)); }, { timeout }).toBe(true);
  return snapshot(page);
}
const touch = () => test.info().project.use.hasTouch;
const tap = (page, p) => (touch() ? page.touchscreen.tap(p.x, p.y) : page.mouse.click(p.x, p.y));
async function drag(page, from, to) {
  await page.mouse.move(from.x, from.y);
  await page.mouse.down();
  for (let i = 1; i <= 10; i += 1) await page.mouse.move(from.x + ((to.x - from.x) * i) / 10, from.y + ((to.y - from.y) * i) / 10);
  await page.mouse.up();
}
// Dialog buttons are new objects: tap a moment after the dialog appears, like a player.
async function tapDialog(page, key) {
  await page.waitForTimeout(250);
  await tap(page, (await snapshot(page)).targets[key]);
}
const inside = (vp, r) => r.x >= -1 && r.y >= -1 && r.x + r.w <= vp.width + 1 && r.y + r.h <= vp.height + 1;
const overlap = (a, b) => Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x) > 1 && Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y) > 1;

async function openCanteen(page) {
  let s = await waitFor(page, (v) => v.scene === 'Home' && v.targets?.canteen);
  await tap(page, s.targets.canteen);
  await waitFor(page, (v) => v.scene === 'Canteen' && v.targets?.['dish:rice']);
  await page.waitForTimeout(300);
  return snapshot(page);
}
const PORTION = { rice: 'canteen-rice', 'corn-soup': 'canteen-soup', veggies: 'canteen-veggies', jelly: 'canteen-jelly', cookies: 'canteen-cookies', 'fried-chicken': 'canteen-chicken' };
// Tap a dish, then a compartment; waits until the portion is shown in the tray.
async function serve(page, dish, slot) {
  let s = await snapshot(page);
  await tap(page, s.targets[`dish:${dish}`]);
  s = await waitFor(page, (v) => v.selected === dish);
  await tap(page, s.targets[`slot:${slot}`]);
  return waitFor(page, (v) => v.tray.slots[slot] === dish && v.portions[slot] === PORTION[dish] && !v.selected);
}

test.beforeEach(async ({ page }) => {
  await page.goto('/?debug=1');
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await waitFor(page, (v) => v.scene === 'Home');
});

test('canteen layout is safe in every supported viewport', async ({ page }, info) => {
  const vp = page.viewportSize();
  let s = await openCanteen(page);
  s = await serve(page, 'rice', 0);
  await page.waitForTimeout(400);
  s = await snapshot(page);
  const report = await page.evaluate(() => window.__GAME_DEBUG__.layout());
  expect(report.worstDistortion).toBeLessThan(0.02);
  for (const t of report.textRects) expect(inside(vp, t), t.text).toBe(true);
  const r = s.rects;
  for (const [name, rect] of Object.entries(r)) expect(inside(vp, rect), name).toBe(true);
  const dishes = Object.entries(r).filter(([n]) => n.startsWith('dish-')).map(([, v]) => v);
  const tags = Object.entries(r).filter(([n]) => n.startsWith('tag-')).map(([, v]) => v);
  for (let i = 0; i < tags.length; i += 1) for (let j = i + 1; j < tags.length; j += 1) expect(overlap(tags[i], tags[j])).toBe(false);
  for (let i = 0; i < dishes.length; i += 1) for (let j = i + 1; j < dishes.length; j += 1) expect(overlap(dishes[i], dishes[j]), `dish ${i}/${j}`).toBe(false);
  for (const d of [...dishes, ...tags]) {
    expect(overlap(d, r.tray), 'counter vs tray').toBe(false);
    expect(overlap(d, r.count)).toBe(false);
  }
  for (const a of ['live', 'pay', 'count']) expect(overlap(r[a], r.tray), a).toBe(false);
  expect(overlap(r.live, r.pay)).toBe(false);
  expect(overlap(r.pay, r.count)).toBe(false);
  expect(overlap(r.close, r.coins)).toBe(false);
  for (const d of dishes) expect(Math.min(d.w, d.h)).toBeGreaterThanOrEqual(44);
  mkdirSync(resolve('qa', 'canteen'), { recursive: true });
  await page.screenshot({ path: resolve('qa', 'canteen', `${info.project.name}.png`) });
});

test('serving builds the tray: tap and drag, replace, take back, live total', async ({ page }, info) => {
  test.skip(info.project.name !== 'mouse-390x844', 'Run once.');
  let s = await openCanteen(page);
  expect([s.countText, s.targets.pay]).toEqual(['0/5', undefined]);
  // A compartment without a scoop only shows a hint.
  await tap(page, s.targets['slot:0']);
  s = await waitFor(page, (v) => Boolean(v.toast));
  expect(s.tray.count).toBe(0);
  s = await serve(page, 'rice', 0);
  expect([s.countText, s.payText]).toEqual(['1/5', 'Pay 40']);
  expect(s.portions[0]).toBe('canteen-rice');
  // Drag the chicken straight from its basket into the big left compartment.
  await drag(page, s.targets['dish:fried-chicken'], s.targets['slot:3']);
  s = await waitFor(page, (v) => v.tray.slots[3] === 'fried-chicken' && v.portions[3] === 'canteen-chicken');
  expect(s.payText).toBe('Pay 160');
  s = await serve(page, 'corn-soup', 1);
  expect(s.payText).toBe('Pay 220');
  // Scooping into a filled compartment replaces it.
  s = await serve(page, 'jelly', 1);
  expect(s.lastAction).toBe('replaced');
  expect([s.payText, s.portions[1]]).toEqual(['Pay 230', 'canteen-jelly']);
  // Tapping a dish twice puts the spoon back without serving.
  await tap(page, s.targets['dish:veggies']);
  s = await waitFor(page, (v) => v.selected === 'veggies');
  await tap(page, s.targets['dish:veggies']);
  s = await waitFor(page, (v) => v.selected === null && v.lastAction === 'deselected');
  // Empty spoon + filled compartment = take the food back.
  await page.waitForTimeout(300);
  await tap(page, s.targets['slot:0']);
  s = await waitFor(page, (v) => v.tray.slots[0] === null);
  expect([s.countText, s.payText, s.portions[0]]).toEqual(['2/5', 'Pay 190', null]);
  expect(s.save.coins).toBe(1000);
});

test('paying the tray charges once and the stream eats exactly that tray', async ({ page }, info) => {
  test.skip(!['mouse-390x844', 'touch-360x800'].includes(info.project.name), 'One mouse and one touch project.');
  let s = await openCanteen(page);
  const meal = [['rice', 0], ['corn-soup', 1], ['veggies', 2], ['fried-chicken', 3], ['cookies', 4]];
  for (const [dish, slot] of meal) s = await serve(page, dish, slot);
  expect([s.countText, s.payText]).toEqual(['5/5', 'Pay 330']);
  await tap(page, s.targets.pay);
  s = await waitFor(page, (v) => v.scene === 'Meal' && v.targets?.serving);
  expect(s.save.coins).toBe(670);
  expect(s.source).toBe('canteen');
  expect(s.menu).toEqual(meal.map(([d]) => d));
  expect(s.slots).toEqual(meal.map(([, i]) => i));
  expect(s.servingTextures).toEqual(['canteen-rice', 'canteen-soup', 'canteen-veggies', 'canteen-chicken', 'canteen-cookies']);
  expect(s.rects.tray).toBeTruthy();
  for (const [name, rect] of Object.entries(s.rects)) if (name.startsWith('food-')) expect(overlap(rect, s.rects.tray), name).toBe(true);
  expect(s.save.orders).toHaveLength(1);
  expect(s.save.rewardReceipts.some((r) => r.startsWith('canteen:'))).toBe(true);
  for (let i = 0; i < meal.length; i += 1) {
    s = await waitFor(page, (v) => v.targets?.serving && v.eaten === i, 15000);
    if (touch()) await tap(page, s.targets.serving);
    else await drag(page, s.targets.serving, s.targets.mouth);
    s = await waitFor(page, (v) => v.eaten === i + 1, 15000);
  }
  s = await waitFor(page, (v) => v.dialog === 'Delicious!');
  expect(s.save.orders).toEqual([]);
  expect(s.save.coins).toBe(670);
  await tapDialog(page, 'dialogPrimary');
  await waitFor(page, (v) => v.scene === 'Home');
});

test('not enough coins: payment refused, nothing charged, tray kept; a smaller tray pays', async ({ page }, info) => {
  test.skip(info.project.name !== 'mouse-390x844', 'Run once.');
  await page.evaluate(() => window.__GAME_DEBUG__.setCoins(150)); // staged wallet
  let s = await openCanteen(page);
  expect(s.coinsText).toBe('150');
  s = await serve(page, 'fried-chicken', 3);
  s = await serve(page, 'rice', 0);
  expect(s.payText).toBe('Pay 160');
  await tap(page, s.targets.pay);
  s = await waitFor(page, (v) => v.dialog === 'Not enough coins');
  expect(s.result).toEqual({ status: 'insufficient', total: 160, missing: 10 });
  expect(s.save.coins).toBe(150);
  expect(s.save.orders).toEqual([]);
  await tapDialog(page, 'dialogPrimary'); // Change tray
  s = await waitFor(page, (v) => !v.dialog && v.phase === 'serving');
  expect(s.tray.count).toBe(2);
  await page.waitForTimeout(300);
  await tap(page, s.targets['slot:0']); // take the rice back
  s = await waitFor(page, (v) => v.tray.count === 1);
  expect(s.payText).toBe('Pay 120');
  await tap(page, s.targets.pay);
  s = await waitFor(page, (v) => v.scene === 'Meal');
  expect(s.save.coins).toBe(30);
  expect(s.menu).toEqual(['fried-chicken']);
});
