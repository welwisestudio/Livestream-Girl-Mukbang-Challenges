import { test, expect } from '@playwright/test';

async function snapshot(page) {
  return page.evaluate(() => window.__GAME_DEBUG__?.snapshot());
}

async function waitFor(page, predicate) {
  await expect.poll(async () => predicate(await snapshot(page))).toBe(true);
  return snapshot(page);
}

async function point(page, logical) {
  const canvas = page.locator('canvas');
  const box = await canvas.boundingBox();
  const size = await page.evaluate(() => window.__GAME_DEBUG__.designSize());
  return { x: box.x + logical.x * box.width / size.width, y: box.y + logical.y * box.height / size.height };
}

async function mouseTap(page, logical) {
  const p = await point(page, logical);
  await page.mouse.click(p.x, p.y);
}

async function mouseDrag(page, from, to, steps = 14) {
  const a = await point(page, from);
  const b = await point(page, to);
  await page.mouse.move(a.x, a.y);
  await page.mouse.down();
  await page.mouse.move(b.x, b.y, { steps });
  await page.mouse.up();
}

async function touchTap(page, logical) {
  const p = await point(page, logical);
  await page.touchscreen.tap(p.x, p.y);
}

async function touchPath(page, logicalPoints) {
  const session = await page.context().newCDPSession(page);
  const points = [];
  for (const logical of logicalPoints) points.push(await point(page, logical));
  await session.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ ...points[0], id: 1 }] });
  for (const p of points.slice(1)) {
    await session.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ ...p, id: 1 }] });
  }
  await session.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
}

async function mouseCircle(page, center, radius, turns = 1.35) {
  const start = { x: center.x, y: center.y - radius };
  const p0 = await point(page, start);
  await page.mouse.move(p0.x, p0.y);
  await page.mouse.down();
  const count = 48;
  for (let i = 1; i <= count; i += 1) {
    const angle = -Math.PI / 2 + Math.PI * 2 * turns * i / count;
    const p = await point(page, { x: center.x + Math.cos(angle) * radius, y: center.y + Math.sin(angle) * radius });
    await page.mouse.move(p.x, p.y);
  }
  await page.mouse.up();
}

async function touchCircle(page, center, radius, turns = 1.35) {
  const values = [];
  const count = 52;
  for (let i = 0; i <= count; i += 1) {
    const angle = -Math.PI / 2 + Math.PI * 2 * turns * i / count;
    values.push({ x: center.x + Math.cos(angle) * radius, y: center.y + Math.sin(angle) * radius });
  }
  await touchPath(page, values);
}

async function completeLevel(page, mode, { expectedCoins = 1200, expectedCompletions = 1 } = {}) {
  const tap = mode === 'touch' ? touchTap : mouseTap;
  const drag = mode === 'touch'
    ? (pageArg, from, to) => touchPath(pageArg, [from, { x: (from.x + to.x) / 2, y: (from.y + to.y) / 2 }, to])
    : mouseDrag;

  await page.goto('/?debug=1');
  await waitFor(page, (s) => s?.scene === 'Home');
  let s = await snapshot(page);
  await tap(page, s.targets.start);
  await waitFor(page, (value) => value?.scene === 'Level' && value.phase === 'prestream');
  s = await snapshot(page);
  await tap(page, s.targets.makeJelly);
  await waitFor(page, (value) => value?.stepId === 'choose-mold');

  s = await snapshot(page);
  await tap(page, s.targets.wrongChoice);
  await page.waitForTimeout(350);
  expect((await snapshot(page)).stepId).toBe('choose-mold');
  await tap(page, s.targets.correctChoice);
  await waitFor(page, (value) => Boolean(value?.targets?.confirm));
  s = await snapshot(page);
  await tap(page, s.targets.confirm);
  await tap(page, s.targets.confirm);
  await waitFor(page, (value) => value?.stepId === 'pour-mix');

  s = await snapshot(page);
  await drag(page, s.targets.dragFrom, s.targets.wrongTarget);
  await page.waitForTimeout(350);
  expect((await snapshot(page)).stepId).toBe('pour-mix');
  s = await snapshot(page);
  await drag(page, s.targets.dragFrom, s.targets.target);
  await waitFor(page, (value) => value?.stepId === 'stir');

  s = await snapshot(page);
  await drag(page, s.targets.handle, s.targets.wrongPathEnd);
  await page.waitForTimeout(300);
  expect((await snapshot(page)).stepId).toBe('stir');
  if (mode === 'touch') await touchCircle(page, s.targets.stirCenter, s.targets.stirRadius);
  else await mouseCircle(page, s.targets.stirCenter, s.targets.stirRadius);
  await waitFor(page, (value) => value?.stepId === 'unmold');

  s = await snapshot(page);
  await drag(page, s.targets.dragFrom, s.targets.wrongTarget);
  await page.waitForTimeout(300);
  expect((await snapshot(page)).stepId).toBe('unmold');
  s = await snapshot(page);
  await drag(page, s.targets.dragFrom, s.targets.target);
  await waitFor(page, (value) => value?.stepId === 'add-berries');

  s = await snapshot(page);
  await drag(page, s.targets.dragFrom, s.targets.target);
  await waitFor(page, (value) => value?.stepId === 'add-glaze');
  s = await snapshot(page);
  await drag(page, s.targets.dragFrom, s.targets.target);
  await waitFor(page, (value) => value?.phase === 'mukbang');

  for (let i = 0; i < 3; i += 1) {
    s = await snapshot(page);
    if (i === 0) {
      await drag(page, s.targets.serving, s.targets.wrongTarget);
      await page.waitForTimeout(300);
      expect((await snapshot(page)).servingsEaten).toBe(0);
      s = await snapshot(page);
    }
    await drag(page, s.targets.serving, s.targets.mouth);
    if (i < 2) {
      await waitFor(page, (value) => value?.phase === 'mukbang'
        && value.servingsEaten === i + 1
        && Boolean(value.targets?.serving));
    }
  }

  await waitFor(page, (value) => value?.scene === 'Result');
  s = await snapshot(page);
  if (s.phase === 'level-up') {
    await tap(page, s.targets.next);
    await waitFor(page, (value) => value?.phase === 'reward');
  }
  s = await snapshot(page);
  await tap(page, s.targets.claim);
  await waitFor(page, (value) => value?.scene === 'Home');
  const final = await snapshot(page);
  expect(final.save.coins).toBe(expectedCoins);
  expect(final.save.highestLevel).toBe(2);
  expect(final.save.completedLevels['orange-jelly-01']).toBe(expectedCompletions);
}

test.beforeEach(async ({ page }) => {
  await page.goto('/?debug=1');
  await page.evaluate(() => localStorage.clear());
  await page.reload();
});

test('portrait layout keeps the full design canvas visible', async ({ page }) => {
  await waitFor(page, (s) => s?.scene === 'Home');
  const canvas = page.locator('canvas');
  const box = await canvas.boundingBox();
  const viewport = page.viewportSize();
  expect(box).not.toBeNull();
  expect(box.x).toBeGreaterThanOrEqual(0);
  expect(box.y).toBeGreaterThanOrEqual(0);
  expect(box.x + box.width).toBeLessThanOrEqual(viewport.width + 1);
  expect(box.y + box.height).toBeLessThanOrEqual(viewport.height + 1);
});

test('Level 1 completes with real mouse input and rejects incorrect gestures', async ({ page }, testInfo) => {
  test.skip(!testInfo.project.name.startsWith('mouse'), 'Mouse route is covered in the mouse project.');
  await completeLevel(page, 'mouse');
});

test('Level 1 completes with touch-compatible pointer input', async ({ page }, testInfo) => {
  test.skip(!testInfo.project.name.startsWith('touch'), 'Touch route is covered in the touch project.');
  await completeLevel(page, 'touch');
});

test('Level 1 remains completable after reload and a second full run', async ({ page }, testInfo) => {
  test.skip(!testInfo.project.name.startsWith('mouse'), 'Reload replay is covered once in the mouse project.');
  await completeLevel(page, 'mouse', { expectedCoins: 1200, expectedCompletions: 1 });
  await page.reload();
  await completeLevel(page, 'mouse', { expectedCoins: 1400, expectedCompletions: 2 });
});
