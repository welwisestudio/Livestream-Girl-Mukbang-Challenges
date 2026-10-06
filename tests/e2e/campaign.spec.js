import { test, expect } from '@playwright/test';
import { mkdirSync } from 'node:fs';
import { resolve } from 'node:path';

const snapshot = (page) => page.evaluate(() => window.__GAME_DEBUG__?.snapshot());
const layout = (page) => page.evaluate(() => window.__GAME_DEBUG__?.layout());

function overlaps(a, b, tolerance = 2) {
  return Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x) > tolerance
    && Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y) > tolerance;
}

async function expectLayoutSafe(page, { lobby = false } = {}) {
  const report = await layout(page);
  const vp = page.viewportSize();
  for (const r of report.rects) {
    expect(r.x, r.name).toBeGreaterThanOrEqual(-1);
    expect(r.y, r.name).toBeGreaterThanOrEqual(-1);
    expect(r.x + r.w, r.name).toBeLessThanOrEqual(vp.width + 1);
    expect(r.y + r.h, r.name).toBeLessThanOrEqual(vp.height + 1);
  }
  for (const t of report.targets) {
    expect(t.x).toBeGreaterThanOrEqual(-1); expect(t.y).toBeGreaterThanOrEqual(-1);
    expect(t.x + t.w).toBeLessThanOrEqual(vp.width + 1); expect(t.y + t.h).toBeLessThanOrEqual(vp.height + 1);
    expect(Math.min(t.w, t.h)).toBeGreaterThanOrEqual(44);
  }
  for (const t of report.textRects) {
    expect(t.x, t.text).toBeGreaterThanOrEqual(-1); expect(t.y, t.text).toBeGreaterThanOrEqual(-1);
    expect(t.x + t.w, t.text).toBeLessThanOrEqual(vp.width + 1); expect(t.y + t.h, t.text).toBeLessThanOrEqual(vp.height + 1);
  }
  expect(report.minFont).toBeGreaterThanOrEqual(12);
  expect(report.worstDistortion).toBeLessThan(0.02);

  if (lobby) {
    const named = Object.fromEntries(report.rects.map((r) => [r.name, r]));
    const disjointGroups = [
      ['hud-profile', 'hud-wallet', 'settings'],
      ['feature-part-time', 'feature-canteen'],
      ['feature-store', 'feature-skin', 'feature-daily'],
      ['nav-market', 'nav-start', 'nav-decor'],
      ['table-plate', 'table-spoon', 'table-phone', 'table-mitts'],
    ];
    for (const group of disjointGroups) for (let i = 0; i < group.length; i += 1) for (let j = i + 1; j < group.length; j += 1) {
      expect(overlaps(named[group[i]], named[group[j]]), `${group[i]} overlaps ${group[j]}`).toBe(false);
    }
    const features = ['feature-part-time', 'feature-canteen', 'feature-store', 'feature-skin', 'feature-daily'];
    const protectedCenter = ['character', 'mascot', 'thought-bubble'];
    const fixedUi = ['hud-profile', 'hud-wallet', 'settings', 'nav-market', 'nav-start', 'nav-decor'];
    for (const feature of features) for (const other of [...protectedCenter, ...fixedUi]) {
      expect(overlaps(named[feature], named[other]), `${feature} overlaps ${other}`).toBe(false);
    }
  } else {
    const chrome = report.rects.filter((r) => /^(hud-|header$|progress$|request$)/.test(r.name));
    for (let i = 0; i < chrome.length; i += 1) for (let j = i + 1; j < chrome.length; j += 1) {
      const intentionalAvatarTuck = new Set([chrome[i].name, chrome[j].name]);
      if (intentionalAvatarTuck.has('hud-avatar') && intentionalAvatarTuck.has('hud-profile')) continue;
      expect(overlaps(chrome[i], chrome[j]), `${chrome[i].name} overlaps ${chrome[j].name}`).toBe(false);
    }
    for (const target of report.targets) for (const item of chrome) {
      expect(overlaps(target, item), `interaction target overlaps ${item.name}`).toBe(false);
    }
    const categoryTitle = report.rects.find((r) => r.name === 'custom-category-title');
    if (categoryTitle) for (const card of report.rects.filter((r) => r.name.startsWith('item-'))) {
      expect(overlaps(categoryTitle, card), `custom category title overlaps ${card.name}`).toBe(false);
    }
  }
}

async function waitFor(page, predicate, timeout = 20000) {
  await expect.poll(async () => { const s = await snapshot(page); return Boolean(s && predicate(s)); }, { timeout }).toBe(true);
  await page.waitForTimeout(70);
  return snapshot(page);
}

function input(page, mode) {
  const touch = mode === 'touch';
  const path = async (points) => {
    const session = await page.context().newCDPSession(page);
    await session.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ ...points[0], id: 1 }] });
    for (const p of points.slice(1)) await session.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ ...p, id: 1 }] });
    await session.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    await session.detach();
  };
  const line = (a, b, n = 14) => Array.from({ length: n + 1 }, (_, i) => ({ x: a.x + ((b.x - a.x) * i) / n, y: a.y + ((b.y - a.y) * i) / n }));
  const ring = (c, r, turns) => Array.from({ length: 80 }, (_, i) => { const t = (Math.PI * 2 * turns * i) / 79; return { x: c.x + Math.cos(t) * r, y: c.y + Math.sin(t) * r }; });
  return {
    tap: async (p) => (touch ? page.touchscreen.tap(p.x, p.y) : page.mouse.click(p.x, p.y)),
    drag: async (a, b) => {
      if (touch) return path(line(a, b));
      await page.mouse.move(a.x, a.y); await page.mouse.down(); await page.mouse.move(b.x, b.y, { steps: 14 }); await page.mouse.up();
      return undefined;
    },
    circle: async (c, r, turns) => {
      const pts = ring(c, r, turns);
      if (touch) return path(pts);
      await page.mouse.move(pts[0].x, pts[0].y); await page.mouse.down();
      for (const p of pts.slice(1)) await page.mouse.move(p.x, p.y);
      await page.mouse.up();
      return undefined;
    },
  };
}

async function completeCooking(page, io, capture = null, audit = false) {
  const completed = new Set();
  while (true) {
    const s = await waitFor(page, (v) => v.phase === 'mukbang' || (v.phase === 'cooking' && v.stepId && v.targets && Object.keys(v.targets).length));
    if (s.phase === 'mukbang') return s;
    const id = s.stepId;
    if (audit) await expectLayoutSafe(page);
    await capture?.(`cooking-${id}`);
    expect(completed.has(id), `step repeated: ${id}`).toBe(false);
    const t = s.targets;
    if (t.correctChoice) {
      if (t.wrongChoice) { await io.tap(t.wrongChoice); await page.waitForTimeout(180); expect((await snapshot(page)).stepId).toBe(id); }
      await io.tap(t.correctChoice);
      const confirm = await waitFor(page, (v) => v.stepId === id && v.targets?.confirm);
      await io.tap(confirm.targets.confirm); await io.tap(confirm.targets.confirm);
    } else if (t.stirCenter) {
      await io.circle(t.stirCenter, t.stirRadius, 0.35);
      await page.waitForTimeout(120); expect((await snapshot(page)).stepId).toBe(id);
      await io.circle(t.stirCenter, t.stirRadius, 2.2);
    } else if (t.dragFrom) {
      await io.drag(t.dragFrom, t.wrongTarget);
      await page.waitForTimeout(260); expect((await snapshot(page)).stepId).toBe(id);
      const retry = await snapshot(page);
      await io.drag(retry.targets.dragFrom, retry.targets.target);
    } else if (t.process) {
      await io.tap(t.wrongTarget);
      await page.waitForTimeout(100); expect((await snapshot(page)).stepId).toBe(id);
      await io.tap(t.process); await io.tap(t.process);
    } else {
      throw new Error(`Unsupported targets for ${id}: ${JSON.stringify(t)}`);
    }
    completed.add(id);
    await waitFor(page, (v) => v.phase !== 'cooking' || v.stepId !== id, 12000);
  }
}

async function playSuggestedLevel(page, mode, expectedId, { expectNext = true, capture = false, audit = false } = {}) {
  const io = input(page, mode);
  const shot = capture ? async (label) => page.screenshot({ path: resolve('qa', 'campaign', `${expectedId}-${label}.png`) }) : null;
  let s = await waitFor(page, (v) => v.scene === 'Home' && v.levelId === expectedId);
  // The thought cloud shows the dish of the level Start leads to.
  const dishes = { 'orange-jelly-01': 'jelly-finished', 'ramen-02': 'ramen-finished', 'pizza-03': 'pizza-finished', 'sushi-04': 'sushi-finished', 'bubble-tea-05': 'bubble-tea-finished' };
  expect(s.bubbleDish).toBe(dishes[expectedId]);
  if (audit) await expectLayoutSafe(page, { lobby: true });
  if (s.phase === 'locked') {
    const before = s.save.coins;
    await io.tap(s.targets.start); await io.tap(s.targets.start);
    s = await waitFor(page, (v) => v.scene === 'Home' && v.phase === 'home' && v.levelId === expectedId);
    expect(s.save.coins).toBeLessThan(before);
  }
  await io.tap(s.targets.start); await io.tap(s.targets.start);
  s = await waitFor(page, (v) => v.scene === 'Level' && v.levelId === expectedId && v.targets?.startCooking);
  if (audit) await expectLayoutSafe(page);
  await shot?.('prestream');
  await io.tap(s.targets.startCooking); await io.tap(s.targets.startCooking);
  s = await completeCooking(page, io, shot, audit);
  if (audit) await expectLayoutSafe(page);
  await shot?.('mukbang');
  await io.drag(s.targets.serving, s.targets.wrongTarget);
  await page.waitForTimeout(280); expect((await snapshot(page)).servingsEaten).toBe(0);
  for (let i = 0; i < 3; i += 1) {
    s = await waitFor(page, (v) => v.phase === 'mukbang' && v.servingsEaten === i && v.targets?.serving);
    if (i === 1) await io.tap(s.targets.serving); else await io.drag(s.targets.serving, s.targets.mouth);
  }
  s = await waitFor(page, (v) => v.scene === 'Result' && (v.targets?.next || v.targets?.rewardBase), 25000);
  if (audit) await expectLayoutSafe(page);
  await shot?.('result');
  if (expectNext) {
    expect(s.targets.next).toBeTruthy();
    await io.tap(s.targets.next);
    s = await waitFor(page, (v) => v.targets?.rewardBase);
  }
  await io.tap(s.targets.rewardBase); await io.tap(s.targets.rewardBase);
  return waitFor(page, (v) => v.scene === 'Home');
}

test.beforeEach(async ({ page }) => {
  await page.goto('/?debug=1');
  await page.evaluate(() => localStorage.clear());
  await page.reload();
});

test('lobby UI stays inside every supported viewport', async ({ page }, info) => {
  await waitFor(page, (s) => s.scene === 'Home');
  await page.waitForTimeout(350);
  await expectLayoutSafe(page, { lobby: true });
  mkdirSync(resolve('qa', 'lobby'), { recursive: true });
  await page.screenshot({ path: resolve('qa', 'lobby', `${info.project.name}.png`) });
});

test('all visible secondary Lobby controls respond safely', async ({ page }, info) => {
  test.skip(info.project.name !== 'mouse-390x844', 'Lobby control response is run once.');
  const io = input(page, 'mouse');
  // Playtime Reward opens its own window (playtime.spec.js); Part-Time opens its minigame (part-time.spec.js).
  // Store and Super Market open the supermarket (store.spec.js).
  // Canteen opens its own screen (canteen.spec.js).
  const names = ['settings'];
  for (const name of names) {
    const s = await waitFor(page, (v) => v.scene === 'Home' && v.targets?.[name]);
    await io.tap(s.targets[name]);
    await page.waitForTimeout(150);
    expect((await snapshot(page)).scene, name).toBe('Home');
  }
  // DECOR is a second entrance to the Skin wardrobe.
  const s = await waitFor(page, (v) => v.scene === 'Home' && v.targets?.decor);
  await io.tap(s.targets.decor);
  await waitFor(page, (v) => v.scene === 'Customization' && v.targets?.action);
});

test('customization screen stays safe in every supported viewport', async ({ page }, info) => {
  const io = input(page, info.project.name.startsWith('touch-') ? 'touch' : 'mouse');
  let s = await waitFor(page, (v) => v.scene === 'Home' && v.targets?.skin);
  await io.tap(s.targets.skin);
  s = await waitFor(page, (v) => v.scene === 'Customization' && v.targets?.action);
  expect(s.cardTextures.every(Boolean), 'Hair cards must use generated image thumbnails').toBe(true);
  await expectLayoutSafe(page);
  mkdirSync(resolve('qa', 'customization'), { recursive: true });
  await page.screenshot({ path: resolve('qa', 'customization', `${info.project.name}.png`) });
  if (info.project.name === 'mouse-390x844') {
    await io.tap(s.targets['category:skin']);
    s = await waitFor(page, (v) => v.scene === 'Customization' && v.categoryId === 'skin');
    expect(s.cardTextures.every(Boolean), 'Skin cards must use generated image thumbnails').toBe(true);
    await expectLayoutSafe(page);
    await page.screenshot({ path: resolve('qa', 'customization', 'skin-390x844.png') });
  }
});

test('customization Back cancels an unpurchased preview safely', async ({ page }, info) => {
  test.skip(info.project.name !== 'mouse-390x844', 'Customization cancel is run once.');
  const io = input(page, 'mouse');
  let s = await waitFor(page, (v) => v.scene === 'Home' && v.targets?.skin);
  await io.tap(s.targets.skin);
  s = await waitFor(page, (v) => v.scene === 'Customization' && v.targets?.['item:hair-honey']);
  await io.tap(s.targets['item:hair-honey']);
  s = await waitFor(page, (v) => v.scene === 'Customization' && v.draft?.hair === 'hair-honey' && v.phase === 'buy');
  await io.tap(s.targets.back);
  s = await waitFor(page, (v) => v.scene === 'Home');
  expect(s.save.coins).toBe(1000);
  expect(s.save.appearance.equipped.hair).toBe('hair-silver');
  expect(s.save.appearance.owned).not.toContain('hair-honey');
});

test('customization previews every hat and glasses option with safe layering', async ({ page }, info) => {
  test.skip(info.project.name !== 'mouse-390x844', 'Accessory visual regression is run once.');
  const io = input(page, 'mouse');
  let s = await waitFor(page, (v) => v.scene === 'Home' && v.targets?.skin);
  await io.tap(s.targets.skin);
  s = await waitFor(page, (v) => v.scene === 'Customization' && v.targets?.['category:accessory']);
  mkdirSync(resolve('qa', 'customization'), { recursive: true });

  await io.tap(s.targets['category:outfit']);
  for (const item of ['outfit-frog-sweater', 'outfit-orange-cat', 'outfit-berry-pop']) {
    s = await waitFor(page, (v) => v.categoryId === 'outfit' && v.targets?.[`item:${item}`]);
    await io.tap(s.targets[`item:${item}`]);
    s = await waitFor(page, (v) => v.draft?.outfit === item && v.previewTexture?.startsWith('appearance:v15:'));
    await page.screenshot({ path: resolve('qa', 'customization', `head-only-${item}-390x844.png`) });
  }

  await io.tap(s.targets['category:accessory']);
  for (const item of ['accessory-bow', 'accessory-daisy']) {
    s = await waitFor(page, (v) => v.categoryId === 'accessory' && v.targets?.[`item:${item}`]);
    await io.tap(s.targets[`item:${item}`]);
    s = await waitFor(page, (v) => v.draft?.accessory === item && v.previewTexture?.startsWith('appearance:v15:'));
    await expectLayoutSafe(page);
    await page.screenshot({ path: resolve('qa', 'customization', `${item}-390x844.png`) });
  }

  await io.tap(s.targets['category:glasses']);
  for (const item of ['glasses-round', 'glasses-heart']) {
    s = await waitFor(page, (v) => v.categoryId === 'glasses' && v.targets?.[`item:${item}`]);
    await io.tap(s.targets[`item:${item}`]);
    s = await waitFor(page, (v) => v.draft?.glasses === item && v.previewTexture?.startsWith('appearance:v15:'));
    await expectLayoutSafe(page);
    await page.screenshot({ path: resolve('qa', 'customization', `${item}-390x844.png`) });
  }
});

test('customization purchases, applies and persists every required category', async ({ page }, info) => {
  test.skip(info.project.name !== 'mouse-390x844', 'Full customization flow is run once.');
  const io = input(page, 'mouse');
  let s = await waitFor(page, (v) => v.scene === 'Home' && v.targets?.skin);
  await io.tap(s.targets.skin);
  s = await waitFor(page, (v) => v.scene === 'Customization' && v.targets?.['item:hair-honey']);
  const originalTexture = s.previewTexture;

  const choose = async (category, item, price = 0) => {
    s = await snapshot(page);
    if (s.categoryId !== category) {
      await io.tap(s.targets[`category:${category}`]);
      s = await waitFor(page, (v) => v.scene === 'Customization' && v.categoryId === category && v.targets?.[`item:${item}`]);
    }
    await io.tap(s.targets[`item:${item}`]);
    s = await waitFor(page, (v) => v.draft?.[category] === item);
    if (price > 0) {
      expect(s.phase, JSON.stringify({ draft: s.draft, owned: s.owned, pendingItemId: s.pendingItemId, draftOwnership: s.draftOwnership })).toBe('buy');
      const before = s.coins;
      await io.tap(s.targets.action);
      s = await waitFor(page, (v) => v.scene === 'Customization' && v.owned?.includes(item) && v.phase === 'apply');
      expect(s.coins).toBe(before - price);
    }
  };

  await choose('hair', 'hair-honey', 100);
  await choose('skin', 'skin-deep');
  s = await snapshot(page);
  await io.tap(s.targets['category:hair']);
  s = await waitFor(page, (v) => v.categoryId === 'hair' && v.cardTextures?.every((key) => key?.includes('-deep-happy')));
  expect(s.tabTextures.hair).toBe('custom-head-honey-deep-happy');
  expect(s.tabTextures.skin).toBe('custom-head-honey-deep-chewing');
  expect(s.tabTextures.skin).not.toBe(s.tabTextures.hair);
  await choose('outfit', 'outfit-orange-cat', 180);
  await choose('accessory', 'accessory-bow', 100);
  await choose('glasses', 'glasses-round', 90);
  await choose('tablecloth', 'table-winter', 160);
  expect(s.panelTheme).toBe('winter');
  await choose('background', 'background-bunnies', 180);
  s = await snapshot(page);
  expect(s.previewTexture).not.toBe(originalTexture);
  expect(s.coins).toBe(190);
  mkdirSync(resolve('qa', 'customization'), { recursive: true });
  await page.waitForTimeout(1300);
  await page.screenshot({ path: resolve('qa', 'customization', 'selected-390x844.png') });
  await io.tap(s.targets.action);
  s = await waitFor(page, (v) => v.scene === 'Home' && v.save?.appearance?.equipped?.glasses === 'glasses-round');
  expect(s.save.appearance.equipped).toEqual({ hair: 'hair-honey', skin: 'skin-deep', outfit: 'outfit-orange-cat', accessory: 'accessory-bow', glasses: 'glasses-round', tablecloth: 'table-winter', background: 'background-bunnies' });
  await page.screenshot({ path: resolve('qa', 'customization', 'lobby-updated-390x844.png') });
  await page.reload();
  s = await waitFor(page, (v) => v.scene === 'Home' && v.save?.appearance?.equipped?.outfit === 'outfit-orange-cat');
  expect(s.save.coins).toBe(190);
  await io.tap(s.targets.start);
  s = await waitFor(page, (v) => v.scene === 'Level' && v.targets?.startCooking);
  expect(s.appearance).toEqual({ hair: 'hair-honey', skin: 'skin-deep', outfit: 'outfit-orange-cat', accessory: 'accessory-bow', glasses: 'glasses-round', tablecloth: 'table-winter', background: 'background-bunnies' });
  expect(s.characterTexture).toContain('hair-honey');
  await page.screenshot({ path: resolve('qa', 'customization', 'level-updated-390x844.png') });
  await io.tap(s.targets.startCooking);
  s = await completeCooking(page, io);
  expect(s.phase).toBe('mukbang');
  expect(s.characterTexture).toContain('hair-honey');
  await io.drag(s.targets.serving, s.targets.mouth);
  s = await waitFor(page, (v) => v.scene === 'Level' && v.phase === 'mukbang' && v.servingsEaten === 1);
  expect(s.characterTexture).toContain('hair-honey');
  await page.screenshot({ path: resolve('qa', 'customization', 'mukbang-updated-390x844.png') });
});

test('Level 1 player-facing UI stays safe through cooking, mukbang and result', async ({ page }, info) => {
  test.setTimeout(120_000);
  const mode = info.project.name.startsWith('touch-') ? 'touch' : 'mouse';
  await playSuggestedLevel(page, mode, 'orange-jelly-01', { audit: true });
});

test('lobby recomposes safely during live resize', async ({ page }, info) => {
  test.skip(info.project.name !== 'mouse-390x844', 'Dynamic Lobby resize is run once.');
  await waitFor(page, (s) => s.scene === 'Home');
  for (const size of [{ width: 430, height: 932 }, { width: 480, height: 640 }, { width: 360, height: 800 }, { width: 390, height: 844 }]) {
    await page.setViewportSize(size); await page.waitForTimeout(180);
    await expectLayoutSafe(page, { lobby: true });
  }
});

test('all five levels complete in the confirmed order with unlocks and coins', async ({ page }, info) => {
  test.setTimeout(300_000);
  test.skip(info.project.name !== 'mouse-390x844', 'Full campaign is run once.');
  mkdirSync(resolve('qa', 'campaign'), { recursive: true });
  const order = ['orange-jelly-01', 'ramen-02', 'pizza-03', 'sushi-04', 'bubble-tea-05'];
  for (let i = 0; i < order.length; i += 1) await playSuggestedLevel(page, 'mouse', order[i], { expectNext: i < order.length - 1, capture: true });
  const s = await snapshot(page);
  expect(s.save.highestLevel).toBe(5);
  expect(s.save.availableLevel).toBe(5);
  expect(s.save.coins).toBe(1620);
  for (const id of order) expect(s.save.completedLevels[id]).toBe(1);
});

test('Level 1 completes with real touch input', async ({ page }, info) => {
  test.skip(info.project.name !== 'touch-360x800', 'Touch run is kept to one full level.');
  const s = await playSuggestedLevel(page, 'touch', 'orange-jelly-01');
  expect(s.save.coins).toBe(1200);
  expect(s.save.completedLevels['orange-jelly-01']).toBe(1);
});

test('live resize during cooking keeps the interaction usable', async ({ page }, info) => {
  test.skip(info.project.name !== 'mouse-390x844', 'Resize regression is run once.');
  const io = input(page, 'mouse');
  let s = await waitFor(page, (v) => v.scene === 'Home');
  await io.tap(s.targets.start);
  s = await waitFor(page, (v) => v.targets?.startCooking); await io.tap(s.targets.startCooking);
  s = await waitFor(page, (v) => v.stepId === 'pour-mix' || v.stepId === 'choose-mold');
  if (s.stepId === 'choose-mold') {
    await io.tap(s.targets.correctChoice); s = await waitFor(page, (v) => v.targets?.confirm); await io.tap(s.targets.confirm);
    s = await waitFor(page, (v) => v.stepId === 'pour-mix' && v.targets?.dragFrom);
  }
  await page.setViewportSize({ width: 520, height: 680 }); await page.waitForTimeout(350);
  s = await snapshot(page); await io.drag(s.targets.dragFrom, s.targets.target);
  await waitFor(page, (v) => v.stepId === 'stir');
});

test('coins and progression survive a browser reload', async ({ page }, info) => {
  test.setTimeout(100_000);
  test.skip(info.project.name !== 'mouse-390x844', 'Persistence regression is run once.');
  let s = await playSuggestedLevel(page, 'mouse', 'orange-jelly-01');
  expect(s.save.coins).toBe(1200);
  await page.reload();
  s = await waitFor(page, (v) => v.scene === 'Home' && v.levelId === 'ramen-02');
  expect(s.phase).toBe('locked');
  expect(s.save.availableLevel).toBe(2);
  expect(s.save.completedLevels['orange-jelly-01']).toBe(1);
});
