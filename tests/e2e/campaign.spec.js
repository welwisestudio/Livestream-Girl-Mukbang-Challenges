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
  s = await waitFor(page, (v) => v.scene === 'Result' && (v.targets?.next || v.targets?.claim), 25000);
  if (audit) await expectLayoutSafe(page);
  await shot?.('result');
  if (expectNext) {
    expect(s.targets.next).toBeTruthy();
    await io.tap(s.targets.next);
    s = await waitFor(page, (v) => v.targets?.claim);
  }
  await io.tap(s.targets.claim); await io.tap(s.targets.claim);
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
