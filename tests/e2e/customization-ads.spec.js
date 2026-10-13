import { test, expect } from '@playwright/test';
import { mkdirSync } from 'node:fs';
import { resolve } from 'node:path';

const REWARDED_ITEMS = [
  { category: 'hair', first: 'hair-silver', second: 'hair-honey', third: 'hair-plum', oldPrice: '140' },
  { category: 'skin', first: 'skin-peach', second: 'skin-warm', third: 'skin-deep', oldPrice: '0' },
  { category: 'outfit', first: 'outfit-frog-sweater', second: 'outfit-orange-cat', third: 'outfit-berry-pop', oldPrice: '220' },
  { category: 'accessory', first: 'accessory-none', second: 'accessory-bow', third: 'accessory-daisy', oldPrice: '120' },
  { category: 'glasses', first: 'glasses-none', second: 'glasses-round', third: 'glasses-heart', oldPrice: '130' },
  { category: 'tablecloth', first: 'table-lavender', second: 'table-winter', third: 'table-floral', oldPrice: '180' },
  { category: 'background', first: 'background-hearts', second: 'background-bunnies', third: 'background-garden', oldPrice: '220' },
];

const snapshot = (page) => page.evaluate(() => window.__GAME_DEBUG__?.snapshot());
const layout = (page) => page.evaluate(() => window.__GAME_DEBUG__?.layout());
const touch = () => test.info().project.use.hasTouch;
const tap = (page, p) => (touch() ? page.touchscreen.tap(p.x, p.y) : page.mouse.click(p.x, p.y));

async function waitFor(page, predicate, timeout = 20000) {
  await expect.poll(async () => {
    const state = await snapshot(page);
    return Boolean(state && predicate(state));
  }, { timeout }).toBe(true);
  await page.waitForTimeout(70);
  return snapshot(page);
}

function inside(outer, inner) {
  return inner.x >= outer.x - 1
    && inner.y >= outer.y - 1
    && inner.x + inner.w <= outer.x + outer.w + 1
    && inner.y + inner.h <= outer.y + outer.h + 1;
}

function overlaps(a, b) {
  return Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x) > 1
    && Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y) > 1;
}

async function openCustomization(page) {
  let state = await waitFor(page, (value) => value.scene === 'Home' && value.targets?.skin);
  await tap(page, state.targets.skin);
  return waitFor(page, (value) => value.scene === 'Customization' && value.targets?.['item:hair-plum']);
}

async function selectCategory(page, category, itemId) {
  let state = await snapshot(page);
  if (state.categoryId !== category) {
    await tap(page, state.targets[`category:${category}`]);
    state = await waitFor(page, (value) => value.categoryId === category && value.targets?.[`item:${itemId}`]);
  }
  return state;
}

test.beforeEach(async ({ page }) => {
  await page.goto('/?debug=1');
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await waitFor(page, (value) => value.scene === 'Home');
});

test('the rewarded card is clear and contained at every viewport size', async ({ page }, info) => {
  const state = await openCustomization(page);
  const rewarded = state.cardStates['hair-plum'];
  expect(rewarded).toMatchObject({ owned: false, unlockKind: 'rewarded' });
  expect(rewarded.adRect).toBeTruthy();

  const report = await layout(page);
  const named = Object.fromEntries(report.rects.map((rect) => [rect.name, rect]));
  expect(inside(named['item-hair-plum'], rewarded.adRect), 'AD badge stays inside its card').toBe(true);
  expect(overlaps(rewarded.adRect, named['custom-action']), 'AD badge overlaps the action button').toBe(false);
  expect(report.textRects.some((entry) => entry.text === 'AD')).toBe(true);
  expect(report.textRects.some((entry) => entry.text === '140')).toBe(false);

  if (info.project.name === 'mouse-390x844') {
    mkdirSync(resolve('qa', 'customization-ads'), { recursive: true });
    await page.screenshot({ path: resolve('qa', 'customization-ads', 'rewarded-card-390x844.png') });
  }
});

test('every category uses the 1–2 normal, 3 rewarded pattern', async ({ page }, info) => {
  test.skip(info.project.name !== 'mouse-390x844', 'The complete catalog audit runs once.');
  await openCustomization(page);

  for (const item of REWARDED_ITEMS) {
    const state = await selectCategory(page, item.category, item.third);
    expect(state.cardStates[item.first].unlockKind).not.toBe('rewarded');
    expect(state.cardStates[item.second].unlockKind).not.toBe('rewarded');
    expect(state.cardStates[item.third]).toMatchObject({ owned: false, unlockKind: 'rewarded' });
    expect(state.cardStates[item.third].adRect).toBeTruthy();

    const report = await layout(page);
    const named = Object.fromEntries(report.rects.map((rect) => [rect.name, rect]));
    expect(inside(named[`item-${item.third}`], state.cardStates[item.third].adRect), item.third).toBe(true);
    expect(report.textRects.some((entry) => entry.text === 'AD'), `${item.third} has an AD label`).toBe(true);
    if (item.oldPrice !== '0') {
      expect(report.textRects.some((entry) => entry.text === item.oldPrice), `${item.third} still shows its coin price`).toBe(false);
    }
  }
});

test('cancelled and failed ads keep the item locked; earned ad unlocks and persists', async ({ page }, info) => {
  test.skip(!['mouse-390x844', 'touch-360x800'].includes(info.project.name), 'One mouse and one touch route.');
  let state = await openCustomization(page);
  state = await selectCategory(page, 'glasses', 'glasses-heart');
  await tap(page, state.targets['item:glasses-heart']);
  state = await waitFor(page, (value) => value.pendingItemId === 'glasses-heart' && value.phase === 'watch');
  expect(state).toMatchObject({ actionLabel: 'Unlock', actionVariant: 'primary', actionIcon: 'reward-play' });
  expect(state.coins).toBe(1000);

  for (const mode of ['not-earned', 'error', 'unavailable']) {
    await page.evaluate((value) => window.__GAME_DEBUG__.setAdMode(value), mode);
    await tap(page, state.targets.action);
    state = await waitFor(page, (value) => value.lastUnlockStatus === mode && value.phase === 'watch');
    expect(state.owned).not.toContain('glasses-heart');
    expect(state.coins).toBe(1000);
  }

  await page.evaluate(() => window.__GAME_DEBUG__.setAdMode('earned'));
  await tap(page, state.targets.action);
  state = await waitFor(page, (value) => value.lastUnlockStatus === 'granted' && value.owned?.includes('glasses-heart'));
  expect(state.phase).toBe('apply');
  expect(state.coins).toBe(1000);
  expect(state.cardStates['glasses-heart'].adRect).toBeNull();

  await page.reload();
  state = await openCustomization(page);
  state = await selectCategory(page, 'glasses', 'glasses-heart');
  expect(state.owned).toContain('glasses-heart');
  expect(state.cardStates['glasses-heart']).toMatchObject({ owned: true, unlockKind: 'rewarded', adRect: null });
  expect(state.coins).toBe(1000);
});

test('coin items: green buy when affordable, orange ad unlock when not', async ({ page }, info) => {
  test.skip(!['mouse-390x844', 'touch-360x800'].includes(info.project.name), 'One mouse and one touch route.');
  let state = await openCustomization(page);
  state = await selectCategory(page, 'glasses', 'glasses-round');
  await tap(page, state.targets['item:glasses-round']);
  state = await waitFor(page, (value) => value.pendingItemId === 'glasses-round' && value.phase === 'buy');
  expect(state).toMatchObject({ actionLabel: 'Buy · 90', actionVariant: 'green', actionIcon: null });

  // Not enough coins: the same item switches to the orange rewarded button.
  await page.evaluate(() => window.__GAME_DEBUG__.setCoins(50));
  await tap(page, state.targets['item:glasses-none']);
  state = await waitFor(page, (value) => value.phase === 'apply');
  await tap(page, state.targets['item:glasses-round']);
  state = await waitFor(page, (value) => value.pendingItemId === 'glasses-round' && value.phase === 'watch');
  expect(state).toMatchObject({ actionLabel: 'Unlock', actionVariant: 'primary', actionIcon: 'reward-play', coins: 50 });

  await page.evaluate(() => window.__GAME_DEBUG__.setAdMode('not-earned'));
  await tap(page, state.targets.action);
  state = await waitFor(page, (value) => value.lastUnlockStatus === 'not-earned' && value.phase === 'watch');
  expect(state.owned).not.toContain('glasses-round');
  expect(state.coins).toBe(50);

  await page.evaluate(() => window.__GAME_DEBUG__.setAdMode('earned'));
  await tap(page, state.targets.action);
  state = await waitFor(page, (value) => value.lastUnlockStatus === 'granted' && value.owned?.includes('glasses-round'));
  expect(state.phase).toBe('apply');
  expect(state.coins).toBe(50);
});
