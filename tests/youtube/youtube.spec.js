import { test, expect } from '@playwright/test';
import { preparePage, RELEASE, QA } from './harness.js';

// YouTube Playables integration suite. See tests/youtube/harness.js for the fake SDK, CSP and
// probes. RELEASE tests use the exact bundle that is zipped (no hooks: black-box checks);
// QA tests use the same profile with QA hooks to read game state and drive real input.

const SAVE = (patch = {}) => JSON.stringify({
  version: 11, coins: 1000, highestLevel: 1, availableLevel: 1, completedLevels: {}, rewardReceipts: [],
  appearance: undefined, playtime: { activeMs: 0, claimed: [] }, audio: { music: true, sfx: true, musicVolume: 1, sfxVolume: 1 }, orders: [], ...patch,
});

const snap = (page) => page.evaluate(() => window.__GAME_DEBUG__?.snapshot());
const pstate = (page) => page.evaluate(() => window.__GAME_DEBUG__?.platform.state());
async function waitSnap(page, predicate, timeout = 25000) {
  await expect.poll(async () => { const s = await snap(page); return Boolean(s && predicate(s)); }, { timeout }).toBe(true);
  await page.waitForTimeout(80);
  return snap(page);
}
const touch = () => test.info().project.use.hasTouch;
const tap = (page, p) => (touch() ? page.touchscreen.tap(p.x, p.y) : page.mouse.click(p.x, p.y));

async function expectCleanRun(h) {
  const probe = await h.probe();
  expect(probe.csp, 'no CSP violations').toEqual([]);
  expect(probe.listeners, 'no page-visibility / focus listeners').toEqual([]);
  expect(probe.handlers, 'no window.onblur/onfocus handlers').toEqual([]);
  // Phaser's device probe touches localStorage once inside try/catch; nothing else may.
  expect(probe.storage.filter((s) => s !== 'localStorage'), 'no session/indexedDB access').toEqual([]);
  expect(probe.storage.length, 'at most the engine feature probe').toBeLessThanOrEqual(1);
  expect(h.external, 'no external network calls').toEqual([]);
  expect(h.errors.filter((e) => !/Save load failed/.test(e)), 'no page errors').toEqual([]);
  const missing = await h.page.evaluate(() => window.__GAME_DEBUG__?.missingTextures?.() ?? []);
  expect(missing, 'no art used before it was loaded').toEqual([]);
}

async function waitCalls(h, call, timeout = 25000) {
  await expect.poll(async () => (await h.calls()).includes(call), { timeout }).toBe(true);
  return h.calls();
}

// ------------------------------------------------------------------------------- RELEASE bundle
test.describe('release bundle (dist-youtube)', () => {
  test('fresh launch: SDK first, firstFrameReady → loadData → gameReady after the loader; clean CSP/storage/listeners', async ({ page }) => {
    const h = await preparePage(page, { data: '' });
    await page.goto(RELEASE);
    const scripts = await page.evaluate(() => [...document.scripts].map((s) => s.src || 'inline'));
    expect(scripts[0]).toBe('https://www.youtube.com/game_api/v1');
    const calls = await waitCalls(h, 'gameReady');
    const order = calls.filter((c) => ['firstFrameReady', 'loadData', 'gameReady'].includes(c));
    expect(order).toEqual(['firstFrameReady', 'loadData', 'gameReady']);
    expect(calls.indexOf('saveData') === -1 || calls.indexOf('saveData') > calls.indexOf('loadData')).toBe(true);
    expect(await page.evaluate(() => window.__yt.state.loaderAtGameReady), 'gameReady only after the loading screen is gone').toBe(false);
    expect(await page.evaluate(() => typeof window.__GAME_DEBUG__), 'no QA hook in release').toBe('undefined');
    expect(await page.evaluate(() => Object.prototype.hasOwnProperty.call(window, 'ytgame')), 'the SDK binding is lexical, not a window property').toBe(false);
    await page.waitForTimeout(1500);
    expect((await h.calls()).filter((c) => c === 'gameReady')).toHaveLength(1);
    await expectCleanRun(h);
  });

  test('initial download before gameReady stays under the recommended 15 MiB; the rest streams after it', async ({ page }) => {
    await page.addInitScript(() => performance.setResourceTimingBufferSize(5000));
    const h = await preparePage(page, { data: '' });
    await page.goto(RELEASE);
    await waitCalls(h, 'gameReady');
    await page.waitForTimeout(4000);
    const { before, after, total } = await page.evaluate(async () => {
      const at = window.__yt.state.gameReadyAt;
      const doc = (await fetch(location.href)).headers.get('content-length');
      const entries = performance.getEntriesByType('resource').filter((e) => new URL(e.name).hostname === location.hostname);
      const sum = (list) => list.reduce((n, e) => n + (e.encodedBodySize || e.decodedBodySize || 0), 0);
      return { before: sum(entries.filter((e) => e.startTime < at)) + Number(doc || 0), after: sum(entries.filter((e) => e.startTime >= at)), total: entries.length };
    });
    test.info().annotations.push({ type: 'initial-bytes', description: String(before) });
    expect(before, 'bytes requested before gameReady').toBeLessThan(15 * 1024 * 1024);
    expect(after, 'deferred art and music stream after gameReady').toBeGreaterThan(5 * 1024 * 1024);
    expect(total).toBeGreaterThan(300);
    await expectCleanRun(h);
  });

  test('cloud load failure: Retry screen, no write, no gameReady; Retry with a working cloud starts the game', async ({ page }) => {
    const h = await preparePage(page, { load: 'reject', data: SAVE({ coins: 4321 }) });
    await page.goto(RELEASE);
    const retry = page.locator('.save-error-retry');
    await expect(retry).toBeVisible({ timeout: 20000 });
    await page.waitForTimeout(800);
    let calls = await h.calls();
    expect(calls).not.toContain('saveData');
    expect(calls).not.toContain('gameReady');
    expect(calls).toContain('firstFrameReady');
    await h.yt('set', { load: 'ok' });
    await retry.click();
    calls = await waitCalls(h, 'gameReady');
    expect(calls.filter((c) => c === 'loadData').length).toBeGreaterThanOrEqual(2);
    expect(JSON.parse(await h.cloud()).coins, 'cloud progress untouched').toBe(4321);
    await expectCleanRun(h);
  });

  for (const [label, data] of [['corrupted', '{"version":11,"coins":'], ['newer-version', SAVE({ version: 99, coins: 777 })]]) {
    test(`${label} cloud data is never overwritten: Retry screen and no saveData`, async ({ page }) => {
      const h = await preparePage(page, { data });
      await page.goto(RELEASE);
      await expect(page.locator('.save-error-retry')).toBeVisible({ timeout: 20000 });
      await page.waitForTimeout(1500);
      expect(await h.calls()).not.toContain('saveData');
      expect(await h.cloud()).toBe(data);
    });
  }

  test('host pause stops rendering; resume restarts it; mute/unmute do not break the game', async ({ page }) => {
    const h = await preparePage(page, { data: SAVE({ coins: 2222 }) });
    await page.goto(RELEASE);
    await waitCalls(h, 'gameReady');
    await page.waitForTimeout(1200);
    const frame = () => page.locator('canvas').screenshot();
    const moving = Buffer.compare(await frame(), (await page.waitForTimeout(700), await frame())) !== 0;
    expect(moving, 'the lobby animates while running').toBe(true);
    await h.yt('pause');
    await page.waitForTimeout(300);
    const a = await frame();
    await page.waitForTimeout(900);
    expect(Buffer.compare(a, await frame()), 'nothing renders while paused').toBe(0);
    await h.yt('setAudio', false);
    await h.yt('resume');
    await page.waitForTimeout(700);
    const b = await frame();
    await page.waitForTimeout(700);
    expect(Buffer.compare(b, await frame()), 'rendering resumed').not.toBe(0);
    await h.yt('setAudio', true);
    await expectCleanRun(h);
  });
});

// ------------------------------------------------------------------------------- QA twin
test.describe('YouTube profile with QA hooks (dist-youtube-qa)', () => {
  test('returning player: cloud progress is restored; old save versions migrate without loss', async ({ page }) => {
    const h = await preparePage(page, { data: SAVE({ coins: 4321, highestLevel: 3, availableLevel: 3, completedLevels: { 'orange-jelly-01': 1, 'ramen-02': 1 } }) });
    await page.goto(`${QA}?debug=1`);
    let s = await waitSnap(page, (v) => v.scene === 'Home');
    expect(s.save.coins).toBe(4321);
    expect(s.levelId).toBe('pizza-03');
    const st = await pstate(page);
    expect(st.profile).toBe('youtube');
    expect(st.capabilities).toMatchObject({ cloudSave: true, rewarded: true, interstitial: true, score: false, hostLifecycle: true });

    // v3 save from an old build
    h.setSdk({ data: JSON.stringify({ version: 3, coins: 2500, highestLevel: 2, availableLevel: 2, completedLevels: { 'orange-jelly-01': 1 }, rewardReceipts: ['level-complete:old'] }) });
    await page.reload();
    s = await waitSnap(page, (v) => v.scene === 'Home');
    expect(s.save.version).toBe(11);
    expect(s.save.coins).toBe(2500);
    expect(s.save.completedLevels).toEqual({ 'orange-jelly-01': 1 });
    expect(s.save.rewardReceipts).toContain('level-complete:old');
    await expectCleanRun(h);
  });

  test('rewarded Free Coins: only `true` pays; false / unavailable / error pay nothing; one tap = one ad; saved to the cloud', async ({ page }) => {
    const h = await preparePage(page, { data: SAVE({ coins: 1000 }) });
    await page.goto(`${QA}?debug=1`);
    let s = await waitSnap(page, (v) => v.scene === 'Home' && v.targets?.plus);
    await page.waitForTimeout(300);
    await tap(page, s.targets.plus);
    s = await waitSnap(page, (v) => v.phase === 'free-coins' && v.targets?.dialogPrimary);
    await page.waitForTimeout(300);
    for (const [mode, status] of [['false', 'not-earned'], ['unavailable', 'unavailable'], ['error', 'error']]) {
      await h.yt('set', { rewarded: mode });
      await tap(page, s.targets.dialogPrimary);
      s = await waitSnap(page, (v) => v.freeCoins.lastStatus === status && !v.freeCoins.busy);
      expect(s.save.coins, `${mode} pays nothing`).toBe(1000);
      expect(s.freeCoins.open).toBe(true);
    }
    expect(s.freeCoins.note, 'unavailable/failed ads explain themselves').toBeTruthy();
    // A slow ad: double tap → one request; pay only when the SDK resolves true.
    await h.yt('set', { rewarded: 'manual' });
    await tap(page, s.targets.dialogPrimary);
    await page.waitForTimeout(150);
    await tap(page, s.targets.dialogPrimary);
    await page.waitForTimeout(400);
    expect((await h.calls()).filter((c) => c === 'rewarded:lobby-free-coins').length).toBe(4);
    expect((await snap(page)).save.coins, 'nothing on request/start').toBe(1000);
    await h.yt('finishAd', true);
    s = await waitSnap(page, (v) => v.freeCoins.lastStatus === 'granted');
    expect(s.save.coins).toBe(2000);
    await expect.poll(async () => JSON.parse(await h.cloud()).coins).toBe(2000);
    expect(s.save.rewardReceipts.filter((r) => r.startsWith('free-coins:'))).toHaveLength(1);
    await expectCleanRun(h);
  });

  test('an ad result that arrives during a host pause is applied only after resume', async ({ page }) => {
    const h = await preparePage(page, { data: SAVE({ coins: 1000 }), rewarded: 'manual' });
    await page.goto(`${QA}?debug=1`);
    let s = await waitSnap(page, (v) => v.scene === 'Home' && v.targets?.plus);
    await page.waitForTimeout(300);
    await tap(page, s.targets.plus);
    s = await waitSnap(page, (v) => v.phase === 'free-coins' && v.targets?.dialogPrimary);
    await page.waitForTimeout(300);
    await tap(page, s.targets.dialogPrimary);
    await page.waitForTimeout(300);
    await h.yt('pause');
    await h.yt('finishAd', true);
    await page.waitForTimeout(800);
    expect((await snap(page)).save.coins, 'held during the pause').toBe(1000);
    await h.yt('resume');
    s = await waitSnap(page, (v) => v.save.coins === 2000);
    expect(s.freeCoins.lastStatus).toBe('granted');
  });

  test('host pause: loop, input, audio and playtime stop; progress is flushed; resume restores; player pause stays', async ({ page }) => {
    const h = await preparePage(page, { data: SAVE({ coins: 1000 }) });
    await page.goto(`${QA}?debug=1`);
    let s = await waitSnap(page, (v) => v.scene === 'Home' && v.targets?.plus);
    await page.mouse.click(5, 5); // first gesture creates the audio context
    await page.waitForTimeout(400);
    const before = await page.evaluate(() => window.__GAME_DEBUG__.addPlaytime(0).activeMs);
    await h.yt('pause');
    await page.waitForTimeout(300);
    let st = await pstate(page);
    expect(st.lifecycle).toMatchObject({ paused: true, loopRunning: false, inputEnabled: false });
    const frame = st.lifecycle.frame;
    expect((await page.evaluate(() => window.__GAME_DEBUG__.audio())).pauseReasons).toContain('platform');
    // Input is ignored while paused.
    await tap(page, s.targets.plus);
    await page.waitForTimeout(2500);
    st = await pstate(page);
    expect(st.lifecycle.frame, 'no frames while paused').toBe(frame);
    s = await snap(page);
    expect(s.phase, 'the tap during the pause did nothing').toBe('home');
    const during = await page.evaluate(() => window.__GAME_DEBUG__.addPlaytime(0).activeMs);
    expect(during - before, 'paused time is not play time').toBeLessThan(1100);
    await h.yt('resume');
    await page.waitForTimeout(500);
    st = await pstate(page);
    expect(st.lifecycle).toMatchObject({ paused: false, loopRunning: true, inputEnabled: true });
    expect(st.lifecycle.frame).toBeGreaterThan(frame);
    expect((await page.evaluate(() => window.__GAME_DEBUG__.audio())).pauseReasons).not.toContain('platform');
    // The player's own pause (Part-Time gear menu) survives a host pause/resume.
    s = await snap(page);
    await tap(page, s.targets.partTime);
    s = await waitSnap(page, (v) => v.scene === 'PartTime' && v.targets?.dialogPrimary);
    await page.waitForTimeout(300);
    await tap(page, s.targets.dialogPrimary);
    s = await waitSnap(page, (v) => v.scene === 'PartTime' && v.phase === 'serving' && v.targets?.gear);
    await tap(page, s.targets.gear);
    s = await waitSnap(page, (v) => v.paused === true);
    await h.yt('pause');
    await h.yt('resume');
    await page.waitForTimeout(400);
    s = await snap(page);
    expect(s.paused, 'host resume does not close the player pause').toBe(true);
    expect((await page.evaluate(() => window.__GAME_DEBUG__.audio())).pauseReasons).toContain('menu');
    await expectCleanRun(h);
  });

  test('YouTube mute has priority and never rewrites the player audio settings', async ({ page }) => {
    const h = await preparePage(page, { data: SAVE({ audio: { music: false, sfx: true, musicVolume: 1, sfxVolume: 1 } }), audio: false });
    await page.goto(`${QA}?debug=1`);
    await waitSnap(page, (v) => v.scene === 'Home');
    await page.mouse.click(5, 5);
    await page.waitForTimeout(400);
    let a = await page.evaluate(() => window.__GAME_DEBUG__.audio());
    expect(a.platformMuted, 'initial isAudioEnabled() = false').toBe(true);
    expect(a.musicPlaying).toBe(false);
    await h.yt('setAudio', true);
    await page.waitForTimeout(400);
    a = await page.evaluate(() => window.__GAME_DEBUG__.audio());
    expect(a.platformMuted).toBe(false);
    expect(a.music, 'the player kept music off').toBe(false);
    expect(a.sfx).toBe(true);
    await h.yt('setAudio', false);
    await page.waitForTimeout(200);
    a = await page.evaluate(() => window.__GAME_DEBUG__.audio());
    expect(a.platformMuted).toBe(true);
    expect(a.context === 'suspended' || a.context === 'none').toBe(true);
    const saved = JSON.parse(await h.cloud() ?? '{}');
    if (saved.audio) expect(saved.audio).toMatchObject({ music: false, sfx: true });
    expect((await snap(page)).save.audio).toMatchObject({ music: false, sfx: true });
  });

  test('normal progression after pause and an ad: Level 1 played with real input, saved, no interstitial (policy off), relaunch restores it', async ({ page }) => {
    const h = await preparePage(page, { data: '' });
    await page.goto(`${QA}?debug=1`);
    let s = await waitSnap(page, (v) => v.scene === 'Home' && v.levelId === 'orange-jelly-01');
    await page.evaluate(() => window.__GAME_DEBUG__.setTimeScale(6));
    await h.yt('pause');
    await h.yt('resume');
    await tap(page, s.targets.start);
    await page.waitForTimeout(150);
    s = await snap(page);
    if (s.scene === 'Home') await tap(page, s.targets.start);
    await waitSnap(page, (v) => v.scene === 'Level' && v.phase === 'cooking');
    s = await playCooking(page);
    for (let i = 0; i < 3; i += 1) {
      s = await waitSnap(page, (v) => v.phase === 'mukbang' && v.servingsEaten === i && v.targets?.serving);
      await drag(page, s.targets.serving, s.targets.mouth);
    }
    s = await waitSnap(page, (v) => v.scene === 'Result' && (v.targets?.next || v.targets?.rewardBase), 30000);
    if (s.targets.next) { await tap(page, s.targets.next); s = await waitSnap(page, (v) => v.targets?.rewardBase); }
    await tap(page, s.targets.rewardBase);
    s = await waitSnap(page, (v) => v.scene === 'Home' && v.levelId === 'ramen-02', 30000);
    const cloud = JSON.parse(await h.cloud());
    expect(cloud.completedLevels['orange-jelly-01']).toBe(1);
    expect(cloud.highestLevel).toBe(2);
    expect(cloud.coins).toBe(s.save.coins);
    const st = await pstate(page);
    expect(st.ads.log.filter((e) => e.type === 'interstitial').map((e) => e.reason)).toEqual(['disabled']);
    expect(await h.calls()).not.toContain('interstitial');
    // Relaunch with the cloud data from this session.
    h.setSdk({ data: await h.cloud() });
    await page.reload();
    s = await waitSnap(page, (v) => v.scene === 'Home');
    expect(s.levelId).toBe('ramen-02');
    expect(s.save.coins).toBe(cloud.coins);
    await expectCleanRun(h);
  });
});

// ---------------------------------------------------------------- minimal real-input level driver
async function drag(page, a, b) {
  if (touch()) {
    const session = await page.context().newCDPSession(page);
    const pts = Array.from({ length: 15 }, (_, i) => ({ x: a.x + ((b.x - a.x) * i) / 14, y: a.y + ((b.y - a.y) * i) / 14 }));
    await session.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ ...pts[0], id: 1 }] });
    for (const p of pts.slice(1)) await session.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ ...p, id: 1 }] });
    await session.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    await session.detach();
    return;
  }
  await page.mouse.move(a.x, a.y); await page.mouse.down(); await page.mouse.move(b.x, b.y, { steps: 14 }); await page.mouse.up();
}

async function path(page, pts) {
  if (touch()) {
    const session = await page.context().newCDPSession(page);
    await session.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ ...pts[0], id: 1 }] });
    for (const p of pts.slice(1)) await session.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ ...p, id: 1 }] });
    await session.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    await session.detach();
    return;
  }
  await page.mouse.move(pts[0].x, pts[0].y); await page.mouse.down();
  for (const p of pts.slice(1)) await page.mouse.move(p.x, p.y, { steps: 2 });
  await page.mouse.up();
}

async function playCooking(page) {
  for (let guard = 0; guard < 200; guard += 1) {
    const s = await waitSnap(page, (v) => v.phase === 'mukbang' || (v.phase === 'cooking' && v.targets && Object.keys(v.targets).length));
    if (s.phase === 'mukbang') return s;
    const t = s.targets;
    if (t.stirCenter) {
      await path(page, Array.from({ length: 80 }, (_, i) => { const a = (Math.PI * 2 * 2.2 * i) / 79; return { x: t.stirCenter.x + Math.cos(a) * t.stirRadius, y: t.stirCenter.y + Math.sin(a) * t.stirRadius }; }));
    } else if (t.tracePath) await path(page, t.tracePath);
    else if (t.lift) { if (t.liftReady) await tap(page, t.lift); else await page.waitForTimeout(150); }
    else if (t.gestureFrom) { if (t.strokesRemaining !== 0) await drag(page, t.gestureFrom, t.gestureTo); }
    else if (t.dragFrom) { if (t.placementsRemaining !== 0) await drag(page, t.dragFrom, t.target); }
    else if (t.process) await tap(page, t.process);
    await page.waitForTimeout(250);
  }
  throw new Error('cooking did not finish');
}
