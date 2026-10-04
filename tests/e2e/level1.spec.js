import { test, expect } from '@playwright/test';

// Real pointer input only: the hook exposes positions/state, never sets progress.
const snapshot = (page) => page.evaluate(() => window.__GAME_DEBUG__?.snapshot());
const layout = (page) => page.evaluate(() => window.__GAME_DEBUG__?.layout());

async function waitFor(page, predicate, timeout = 15000) {
  await expect.poll(async () => { const s = await snapshot(page); return Boolean(s && predicate(s)); }, { timeout }).toBe(true);
  await page.waitForTimeout(60); // new hit zones become active on the next game frame
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
      await page.mouse.move(a.x, a.y); await page.mouse.down();
      await page.mouse.move(b.x, b.y, { steps: 14 }); await page.mouse.up();
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

async function expectStuckOn(page, stepId) {
  await page.waitForTimeout(450);
  expect((await snapshot(page)).stepId).toBe(stepId);
}

async function playLevel(page, mode, { expectedCoins, expectedCompletions, firstClear = true, resizeTo = null }) {
  const io = input(page, mode);
  let s = await waitFor(page, (v) => v.scene === 'Home');
  await io.tap(s.targets.start);

  s = await waitFor(page, (v) => v.phase === 'prestream');
  // Before the viewer request arrives the action is disabled: tapping it must do nothing.
  await page.waitForTimeout(300);
  s = await waitFor(page, (v) => Boolean(v.targets?.makeJelly));
  // Rapid repeated taps start cooking exactly once.
  await io.tap(s.targets.makeJelly);
  await io.tap(s.targets.makeJelly);

  // 1. Mold choice: locked card is rejected, correct card + ✓ advances once.
  s = await waitFor(page, (v) => v.stepId === 'choose-mold' && v.targets?.correctChoice);
  await io.tap(s.targets.wrongChoice);
  await expectStuckOn(page, 'choose-mold');
  await io.tap(s.targets.correctChoice);
  s = await waitFor(page, (v) => Boolean(v.targets?.confirm));
  await io.tap(s.targets.confirm);
  await io.tap(s.targets.confirm);

  // 2. Pour: drop away from the bowl springs back.
  s = await waitFor(page, (v) => v.stepId === 'pour-mix' && v.targets?.dragFrom);
  if (resizeTo) {
    await page.setViewportSize(resizeTo);
    await page.waitForTimeout(400);
    s = await waitFor(page, (v) => v.stepId === 'pour-mix' && v.targets?.dragFrom);
  }
  await io.drag(s.targets.dragFrom, s.targets.wrongTarget);
  await expectStuckOn(page, 'pour-mix');
  s = await snapshot(page);
  await io.drag(s.targets.dragFrom, s.targets.target);

  // 3. Stir: one short circle is not enough; progress is kept and the next circles finish it.
  s = await waitFor(page, (v) => v.stepId === 'stir' && v.targets?.stirCenter);
  await io.circle(s.targets.stirCenter, s.targets.stirRadius, 0.6);
  await expectStuckOn(page, 'stir');
  await io.circle(s.targets.stirCenter, s.targets.stirRadius, 2);

  // 4. Unmold: a sideways drag is rejected, an upward lift works.
  s = await waitFor(page, (v) => v.stepId === 'unmold' && v.targets?.dragFrom);
  await io.drag(s.targets.dragFrom, s.targets.wrongTarget);
  await expectStuckOn(page, 'unmold');
  s = await snapshot(page);
  await io.drag(s.targets.dragFrom, s.targets.target);

  // 5–6. Toppings.
  for (const id of ['add-berries', 'add-glaze']) {
    s = await waitFor(page, (v) => v.stepId === id && v.targets?.correctChoice);
    await io.tap(s.targets.wrongChoice);
    await expectStuckOn(page, id);
    await io.tap(s.targets.correctChoice);
    s = await waitFor(page, (v) => Boolean(v.targets?.confirm));
    await io.tap(s.targets.confirm);
  }

  // Mukbang: dropping a portion away from the mouth keeps it; three servings finish.
  s = await waitFor(page, (v) => v.phase === 'mukbang' && v.targets?.serving);
  await io.drag(s.targets.serving, s.targets.wrongTarget);
  await page.waitForTimeout(450);
  expect((await snapshot(page)).servingsEaten).toBe(0);
  for (let i = 0; i < 3; i += 1) {
    s = await waitFor(page, (v) => v.phase === 'mukbang' && v.servingsEaten === i && v.targets?.serving);
    if (i === 1) await io.tap(s.targets.serving); // tap-to-feed also works
    else await io.drag(s.targets.serving, s.targets.mouth);
  }

  s = await waitFor(page, (v) => v.scene === 'Result' && (v.targets?.next || v.targets?.claim), 20000);
  if (firstClear) {
    expect(s.phase).toBe('level-up');
    await io.tap(s.targets.next);
    s = await waitFor(page, (v) => Boolean(v.targets?.claim));
  }
  await io.tap(s.targets.claim);
  await io.tap(s.targets.claim);
  const home = await waitFor(page, (v) => v.scene === 'Home');
  expect(home.save.coins).toBe(expectedCoins);
  expect(home.save.highestLevel).toBe(2);
  expect(home.save.completedLevels['orange-jelly-01']).toBe(expectedCompletions);
}

test.beforeEach(async ({ page }) => {
  await page.goto('/?debug=1');
  await page.evaluate(() => localStorage.clear());
  await page.reload();
});

test('every screen fits the viewport with readable, undistorted UI', async ({ page }) => {
  await waitFor(page, (s) => s.scene === 'Home');
  await page.waitForTimeout(400);
  const report = await layout(page);
  const vp = page.viewportSize();
  for (const r of report.rects) {
    expect(r.x, r.name).toBeGreaterThanOrEqual(-1);
    expect(r.y, r.name).toBeGreaterThanOrEqual(-1);
    expect(r.x + r.w, r.name).toBeLessThanOrEqual(vp.width + 1);
    expect(r.y + r.h, r.name).toBeLessThanOrEqual(vp.height + 1);
  }
  const avatar = report.rects.find((r) => r.name === 'hud-avatar');
  expect(avatar.h).toBeGreaterThanOrEqual(56);
  const button = report.rects.find((r) => r.name.startsWith('button:'));
  expect(button.h).toBeGreaterThanOrEqual(60);
  expect(button.w).toBeGreaterThanOrEqual(220);
  for (const t of report.targets) expect(Math.min(t.w, t.h)).toBeGreaterThanOrEqual(44);
  expect(report.minFont).toBeGreaterThanOrEqual(12);
  expect(report.worstDistortion).toBeLessThan(0.02);
});

test('Level 1 completes with mouse input and rejects incorrect actions', async ({ page }, info) => {
  test.skip(info.project.name.startsWith('touch'), 'Touch is covered by its own project.');
  await playLevel(page, 'mouse', { expectedCoins: 1200, expectedCompletions: 1 });
});

test('Level 1 completes with touch input', async ({ page }, info) => {
  test.skip(!info.project.name.startsWith('touch'), 'Touch-only project.');
  await playLevel(page, 'touch', { expectedCoins: 1200, expectedCompletions: 1 });
});

test('layout survives a live resize mid-level and a replay pays again once', async ({ page }, info) => {
  test.skip(!info.project.name.startsWith('mouse'), 'Covered once in the mouse project.');
  await playLevel(page, 'mouse', { expectedCoins: 1200, expectedCompletions: 1, resizeTo: { width: 820, height: 600 } });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.reload();
  await playLevel(page, 'mouse', { expectedCoins: 1400, expectedCompletions: 2, firstClear: false });
});
