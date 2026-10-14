import test from 'node:test';
import assert from 'node:assert/strict';
import { SaveService, SaveLoadError, SAVE_VERSION, createDefaultSave, parseSave } from '../../src/services/SaveService.js';
import { YouTubePlatformAdapter } from '../../src/platform/youtube/YouTubePlatformAdapter.js';
import { DevPlatformAdapter } from '../../src/platform/dev/DevPlatformAdapter.js';
import { AdService } from '../../src/services/AdService.js';
import { RewardService } from '../../src/services/RewardService.js';
import { PlatformLifecycle } from '../../src/app/PlatformLifecycle.js';
import { FREE_COINS_AD } from '../../src/content/economy.js';

// ---------------------------------------------------------------- fake ytgame (SDK reference shape)
function fakeYtgame({ inEnv = true, audio = true, data = '' } = {}) {
  const calls = [];
  const cb = { pause: [], resume: [], audio: [] };
  const sdk = {
    IN_PLAYABLES_ENV: inEnv,
    SDK_VERSION: 'fake-1',
    calls,
    data,
    loadImpl: null,
    saveImpl: null,
    rewardedImpl: async () => true,
    interstitialImpl: async () => {},
    game: {
      firstFrameReady: () => calls.push('firstFrameReady'),
      gameReady: () => calls.push('gameReady'),
      loadData: () => { calls.push('loadData'); return sdk.loadImpl ? sdk.loadImpl() : Promise.resolve(sdk.data); },
      saveData: (s) => { calls.push('saveData'); if (sdk.saveImpl) return sdk.saveImpl(s); sdk.data = s; return Promise.resolve(); },
    },
    system: {
      isAudioEnabled: () => audio,
      onAudioEnabledChange: (f) => { cb.audio.push(f); return () => {}; },
      onPause: (f) => { cb.pause.push(f); return () => {}; },
      onResume: (f) => { cb.resume.push(f); return () => {}; },
      getLanguage: async () => 'en-US',
    },
    ads: {
      requestRewardedAd: (id) => { calls.push(`rewarded:${id}`); return sdk.rewardedImpl(id); },
      requestInterstitialAd: () => { calls.push('interstitial'); return sdk.interstitialImpl(); },
    },
    health: { logError: () => calls.push('logError'), logWarning: () => calls.push('logWarning') },
    fire: { pause: () => cb.pause.forEach((f) => f()), resume: () => cb.resume.forEach((f) => f()), audio: (v) => cb.audio.forEach((f) => f(v)) },
  };
  return sdk;
}

const sdkError = (errorType) => Object.assign(new Error(errorType), { name: 'SdkError', errorType });

// ---------------------------------------------------------------- save safety
test('empty-save policy: "", whitespace, "null" and "{}" start fresh; anything else must parse', () => {
  for (const raw of ['', '   ', 'null', '{}']) assert.equal(parseSave(raw).fresh, true, JSON.stringify(raw));
  assert.throws(() => parseSave(undefined), (e) => e instanceof SaveLoadError && e.kind === 'invalid-response');
  assert.throws(() => parseSave('{"version":'), (e) => e.kind === 'corrupt');
  assert.throws(() => parseSave('[1,2]'), (e) => e.kind === 'corrupt');
  assert.throws(() => parseSave('{"coins":5}'), (e) => e.kind === 'corrupt', 'no version');
  assert.throws(() => parseSave(JSON.stringify({ version: SAVE_VERSION + 1, coins: 9 })), (e) => e.kind === 'future-version');
});

test('a failed or unreadable load blocks every write and keeps the cloud data untouched', async () => {
  for (const [label, sdkSetup] of [
    ['reject', (sdk) => { sdk.loadImpl = () => Promise.reject(sdkError('API_UNAVAILABLE')); }],
    ['corrupt', (sdk) => { sdk.data = '{"version":7,"coins":'; }],
    ['future', (sdk) => { sdk.data = JSON.stringify({ version: 99, coins: 123456 }); }],
    ['non-string', (sdk) => { sdk.loadImpl = () => Promise.resolve(undefined); }],
  ]) {
    const sdk = fakeYtgame();
    sdkSetup(sdk);
    const before = sdk.data;
    const platform = new YouTubePlatformAdapter({ sdk });
    await platform.init();
    const save = new SaveService(platform);
    await assert.rejects(save.load(), SaveLoadError, label);
    assert.equal(save.loaded, false, label);
    assert.throws(() => save.mutate((s) => { s.coins = 0; }), /load before mutation/, label);
    await assert.rejects(save.enqueueSave(), /blocked/, label);
    await save.flush();
    assert.ok(!sdk.calls.includes('saveData'), `${label}: no saveData after a failed load`);
    assert.equal(sdk.data, before, label);
  }
});

test('retry after a failed load reads the real progress and only then allows writes', async () => {
  const sdk = fakeYtgame({ data: JSON.stringify({ ...createDefaultSave(), coins: 4321, highestLevel: 7, availableLevel: 7 }) });
  let fail = true;
  sdk.loadImpl = () => (fail ? Promise.reject(sdkError('UNKNOWN')) : Promise.resolve(sdk.data));
  const platform = new YouTubePlatformAdapter({ sdk });
  await platform.init();
  const save = new SaveService(platform);
  await assert.rejects(save.load());
  fail = false;
  await save.load();
  assert.equal(save.state.coins, 4321);
  assert.equal(save.state.highestLevel, 7);
  await save.mutate((s) => { s.coins += 1; });
  assert.equal(JSON.parse(sdk.data).coins, 4322);
});

test('old cloud saves migrate without losing earned progress', async () => {
  const v1 = { version: 1, coins: 777, highestLevel: 4, availableLevel: 5, completedLevels: { 'ramen-02': 2 }, rewardReceipts: ['level-complete:a'] };
  const { state, fresh, fromVersion } = parseSave(JSON.stringify(v1));
  assert.equal(fresh, false);
  assert.equal(fromVersion, 1);
  assert.equal(state.version, SAVE_VERSION);
  assert.equal(state.coins, 777);
  assert.equal(state.highestLevel, 5);
  assert.deepEqual(state.completedLevels, { 'ramen-02': 2 });
  assert.deepEqual(state.rewardReceipts, ['level-complete:a']);
  assert.ok(state.appearance && state.playtime && state.audio && Array.isArray(state.orders));
});

test('writes are sequential and coalesced: the newest state always lands last', async () => {
  const sent = [];
  const gates = [];
  const platform = {
    loadData: async () => '',
    saveData: (s) => new Promise((resolve) => { sent.push(JSON.parse(s).coins); gates.push(resolve); }),
  };
  const save = new SaveService(platform);
  await save.load();
  const a = save.mutate((s) => { s.coins = 1; });
  const b = save.mutate((s) => { s.coins = 2; });
  const c = save.mutate((s) => { s.coins = 3; });
  assert.deepEqual(sent, [1], 'one write in flight');
  gates.shift()();
  await new Promise((r) => setTimeout(r, 0));
  assert.deepEqual(sent, [1, 3], 'intermediate state 2 is merged into the newest');
  gates.shift()();
  await Promise.all([a, b, c]);
  assert.equal(save.dirty, false);
});

test('a failed write keeps the save dirty and the next flush sends the newest state', async () => {
  let online = false;
  let stored = null;
  const platform = { loadData: async () => '', saveData: async (s) => { if (!online) throw new Error('offline'); stored = s; } };
  const save = new SaveService(platform);
  await save.load();
  await assert.rejects(save.mutate((s) => { s.coins = 50; }), /offline/);
  assert.equal(save.dirty, true);
  assert.match(save.status().error, /offline/);
  save.state.coins = 60; // later in-memory change
  online = true;
  await save.flush();
  assert.equal(JSON.parse(stored).coins, 60);
  assert.equal(save.dirty, false);
  clearTimeout(save.retryTimer);
});

test('oversized saves are refused before they reach the platform', async () => {
  let calls = 0;
  const platform = { loadData: async () => '', saveData: async () => { calls += 1; } };
  const save = new SaveService(platform);
  await save.load();
  await assert.rejects(save.mutate((s) => { s.rewardReceipts = ['x'.repeat(2 * 1024 * 1024)]; }), /too large/);
  assert.equal(calls, 0);
  clearTimeout(save.retryTimer);
});

// ---------------------------------------------------------------- YouTube adapter contract
test('YouTube adapter: lifecycle notifications once and in order; initial mute; pause/resume/mute events', async () => {
  const sdk = fakeYtgame({ audio: false });
  const platform = new YouTubePlatformAdapter({ sdk });
  platform.gameReady(); // too early: firstFrameReady is sent first
  platform.firstFrameReady();
  platform.gameReady();
  assert.deepEqual(sdk.calls, ['firstFrameReady', 'gameReady']);
  const info = await platform.init();
  assert.equal(info.audioMuted, true);
  assert.equal(info.capabilities.cloudSave, true);
  assert.equal(info.capabilities.score, false, 'score deferred');
  const seen = [];
  const off = platform.subscribe((s) => seen.push(s));
  sdk.fire.pause();
  sdk.fire.audio(true);
  sdk.fire.resume();
  assert.deepEqual(seen, [
    { paused: false, audioMuted: true },
    { paused: true, audioMuted: true },
    { paused: true, audioMuted: false },
    { paused: false, audioMuted: false },
  ]);
  off();
  sdk.fire.pause();
  assert.equal(seen.length, 4, 'unsubscribed');
});

test('YouTube adapter: rewarded maps true/false/unavailable/error and never earns on failure', async () => {
  const sdk = fakeYtgame();
  const platform = new YouTubePlatformAdapter({ sdk });
  await platform.init();
  sdk.rewardedImpl = async () => true;
  assert.deepEqual(await platform.requestRewarded('free-coins'), { status: 'earned' });
  assert.ok(sdk.calls.includes('rewarded:free-coins'), 'stable placement id passed as rewardId');
  sdk.rewardedImpl = async () => false;
  assert.equal((await platform.requestRewarded('free-coins')).status, 'not-earned');
  sdk.rewardedImpl = async () => { throw sdkError('API_UNAVAILABLE'); };
  assert.equal((await platform.requestRewarded('free-coins')).status, 'unavailable');
  sdk.rewardedImpl = async () => { throw sdkError('UNKNOWN'); };
  assert.equal((await platform.requestRewarded('free-coins')).status, 'error');
  sdk.rewardedImpl = async () => 'yes';
  assert.equal((await platform.requestRewarded('free-coins')).status, 'not-earned', 'only a literal true earns');
});

test('YouTube adapter: outside the Playables environment ads are unavailable (no hanging SDK promise)', async () => {
  const sdk = fakeYtgame({ inEnv: false });
  sdk.rewardedImpl = () => new Promise(() => {});
  const platform = new YouTubePlatformAdapter({ sdk });
  const info = await platform.init();
  assert.equal(info.capabilities.rewarded, false);
  assert.equal((await platform.requestRewarded('x')).status, 'unavailable');
  assert.equal((await platform.requestInterstitial()).status, 'unavailable');
  assert.ok(!sdk.calls.some((c) => c.startsWith('rewarded')));
});

test('YouTube adapter: a second ad request while one is open is refused', async () => {
  const sdk = fakeYtgame();
  let finish;
  sdk.rewardedImpl = () => new Promise((r) => { finish = r; });
  const platform = new YouTubePlatformAdapter({ sdk });
  await platform.init();
  const first = platform.requestRewarded('a');
  assert.equal((await platform.requestRewarded('b')).status, 'error');
  finish(true);
  assert.equal((await first).status, 'earned');
});

test('YouTube adapter: an ad result that arrives during a host pause is returned after resume', async () => {
  const sdk = fakeYtgame();
  let finish;
  sdk.rewardedImpl = () => new Promise((r) => { finish = r; });
  const platform = new YouTubePlatformAdapter({ sdk });
  await platform.init();
  let settled = false;
  const pending = platform.requestRewarded('a').then((r) => { settled = true; return r; });
  sdk.fire.pause();
  finish(true);
  await new Promise((r) => setTimeout(r, 5));
  assert.equal(settled, false, 'held while paused');
  sdk.fire.resume();
  assert.equal((await pending).status, 'earned');
});

test('YouTube adapter: interstitial reports a completed request, never "shown"; failures map', async () => {
  const sdk = fakeYtgame();
  const platform = new YouTubePlatformAdapter({ sdk });
  await platform.init();
  assert.deepEqual(await platform.requestInterstitial(), { status: 'request-completed' });
  sdk.interstitialImpl = async () => { throw sdkError('API_UNAVAILABLE'); };
  assert.equal((await platform.requestInterstitial()).status, 'unavailable');
  await assert.rejects(platform.sendScore(5), /not integrated/);
});

test('YouTube adapter: loadData times out instead of hanging', async () => {
  const sdk = fakeYtgame();
  sdk.loadImpl = () => new Promise(() => {});
  const platform = new YouTubePlatformAdapter({ sdk, loadTimeoutMs: 20 });
  await platform.init();
  await assert.rejects(platform.loadData(), /timed out/);
});

test('YouTube adapter: no SDK means init fails (never a silent fallback to a mock)', async () => {
  const platform = new YouTubePlatformAdapter({ sdk: null });
  await assert.rejects(platform.init(), /not loaded/);
});

// ---------------------------------------------------------------- dev adapter (same contract)
test('dev adapter simulates host pause reasons, mute, cloud failures and interstitial outcomes', async () => {
  const store = new Map();
  const storage = { getItem: (k) => store.get(k) ?? null, setItem: (k, v) => store.set(k, v), removeItem: (k) => store.delete(k) };
  const platform = new DevPlatformAdapter({ storage, adMode: 'earned', interstitialMode: 'completed', watchVisibility: false });
  const info = await platform.init();
  assert.equal(info.testMode, true);
  const seen = [];
  platform.subscribe((s) => seen.push(s.paused));
  platform.setHostPaused('qa', true);
  platform.setHostPaused('visibility', true);
  platform.setHostPaused('qa', false);
  assert.equal(platform.hostState.paused, true, 'another reason still holds the pause');
  platform.setHostPaused('visibility', false);
  assert.deepEqual(seen, [false, true, false]);
  platform.setHostMuted(true);
  assert.equal(platform.hostState.audioMuted, true);
  platform.setSaveMode('fail-load');
  await assert.rejects(platform.loadData(), /TEST/);
  platform.setSaveMode('fail-save');
  await assert.rejects(platform.saveData('{}'), /TEST/);
  assert.equal((await platform.requestInterstitial()).status, 'request-completed');
  platform.setInterstitialMode('unavailable');
  assert.equal((await platform.requestInterstitial()).status, 'unavailable');
});

// ---------------------------------------------------------------- ad gate / interstitial policy
const ON = { enabled: true, placements: ['level-break'], sessionGraceMs: 1000, minIntervalMs: 5000, afterRewardedMs: 2000 };

test('interstitials are off by policy: no request ever reaches the platform', async () => {
  let calls = 0;
  const ads = new AdService({ platform: { requestInterstitial: async () => { calls += 1; return { status: 'request-completed' }; } }, capabilities: { interstitial: true } });
  const result = await ads.interstitialBreak('level-break');
  assert.deepEqual(result, { status: 'skipped', reason: 'disabled' });
  assert.equal(calls, 0);
});

test('interstitial eligibility: grace, interval after a completed request, after rewarded, busy, pause, placement', async () => {
  let t = 0;
  let calls = 0;
  const platform = {
    requestInterstitial: async () => { calls += 1; return { status: 'request-completed' }; },
    requestRewarded: async () => ({ status: 'earned' }),
  };
  const ads = new AdService({ platform, capabilities: { interstitial: true, rewarded: true }, policy: ON, now: () => t });
  assert.equal((await ads.interstitialBreak('level-break')).reason, 'session-grace');
  t = 1500;
  assert.equal((await ads.interstitialBreak('mid-cooking')).reason, 'not-a-break');
  assert.equal((await ads.interstitialBreak('level-break', { lifecyclePaused: true })).reason, 'paused');
  assert.equal((await ads.interstitialBreak('level-break')).status, 'request-completed');
  t = 3000;
  assert.equal((await ads.interstitialBreak('level-break')).reason, 'interval');
  t = 7000;
  await ads.requestRewarded('free-coins');
  assert.equal((await ads.interstitialBreak('level-break')).reason, 'after-rewarded');
  t = 9500;
  assert.equal((await ads.interstitialBreak('level-break')).status, 'request-completed');
  assert.equal(calls, 2);
  const noSupport = new AdService({ platform, capabilities: { interstitial: false }, policy: ON, now: () => 99999 });
  assert.equal((await noSupport.interstitialBreak('level-break')).reason, 'unsupported');
});

test('a failed interstitial request does not start the cooldown', async () => {
  let t = 0;
  let status = 'error';
  const ads = new AdService({ platform: { requestInterstitial: async () => ({ status }) }, capabilities: { interstitial: true }, policy: ON, now: () => t });
  t = 2000; // past the session grace
  assert.equal((await ads.interstitialBreak('level-break')).status, 'error');
  t += 10;
  status = 'request-completed';
  assert.equal((await ads.interstitialBreak('level-break')).status, 'request-completed');
});

test('one ad at a time across rewarded and interstitial; audio paused only while it runs', async () => {
  let finish;
  const reasons = new Set();
  const audio = { setPaused: (r, v) => (v ? reasons.add(r) : reasons.delete(r)) };
  const ads = new AdService({
    platform: { requestRewarded: () => new Promise((r) => { finish = r; }), requestInterstitial: async () => ({ status: 'request-completed' }) },
    audio, capabilities: { rewarded: true, interstitial: true }, policy: { ...ON, sessionGraceMs: 0 }, now: () => 1e9,
  });
  const first = ads.requestRewarded('a');
  assert.ok(reasons.has('ad'));
  assert.equal((await ads.requestRewarded('b')).status, 'error');
  assert.equal((await ads.interstitialBreak('level-break')).reason, 'busy');
  finish({ status: 'earned' });
  await first;
  assert.ok(!reasons.has('ad'));
});

test('rewarded grants only on earned through the YouTube adapter, and never twice', async () => {
  const sdk = fakeYtgame();
  const platform = new YouTubePlatformAdapter({ sdk });
  const info = await platform.init();
  const save = new SaveService(platform);
  await save.load();
  const ads = new AdService({ platform, capabilities: info.capabilities });
  const rewards = new RewardService(save, ads, null);
  const start = save.state.coins;
  for (const [impl, status] of [[async () => false, 'not-earned'], [async () => { throw sdkError('API_UNAVAILABLE'); }, 'unavailable'], [async () => { throw sdkError('UNKNOWN'); }, 'error']]) {
    sdk.rewardedImpl = impl;
    const r = await rewards.claimFreeCoinsWithAd({ claimId: 'open-1' });
    assert.equal(r.status, status);
    assert.equal(save.state.coins, start, `${status} grants nothing`);
  }
  sdk.rewardedImpl = async () => true;
  assert.equal((await rewards.claimFreeCoinsWithAd({ claimId: 'open-1' })).status, 'granted');
  assert.equal(save.state.coins, start + FREE_COINS_AD.coins);
  assert.equal((await rewards.claimFreeCoinsWithAd({ claimId: 'open-1' })).status, 'already-claimed');
  assert.equal(save.state.coins, start + FREE_COINS_AD.coins);
  assert.equal(JSON.parse(sdk.data).coins, start + FREE_COINS_AD.coins, 'saved to the cloud');
});

// ---------------------------------------------------------------- lifecycle
function fakeGame() {
  const loop = { running: true, calls: [], pause() { this.calls.push('pause'); }, sleep() { this.calls.push('sleep'); this.running = false; }, resume() { this.calls.push('resume'); }, wake() { this.calls.push('wake'); this.running = true; } };
  return { isRunning: true, loop, input: { enabled: true }, events: { once() {} } };
}

test('host pause freezes the loop, input, audio and flushes the save; resume restores only the host pause', async () => {
  const sdk = fakeYtgame();
  const platform = new YouTubePlatformAdapter({ sdk });
  await platform.init();
  const save = new SaveService(platform);
  await save.load();
  const reasons = new Set();
  let muted = false;
  const audio = { setPlatformMuted: (v) => { muted = v; }, setPaused: (r, v) => (v ? reasons.add(r) : reasons.delete(r)) };
  let flushed = 0;
  const lifecycle = new PlatformLifecycle({ platform, audio, save, playtime: { flush: () => { flushed += 1; } } });
  const game = fakeGame();
  lifecycle.attachGame(game);
  save.state.coins = 999;
  save.dirty = true;
  audio.setPaused('menu', true); // the player's own pause menu
  sdk.fire.pause();
  assert.equal(game.input.enabled, false);
  assert.deepEqual(game.loop.calls, ['pause', 'sleep']);
  assert.ok(reasons.has('platform'));
  assert.equal(flushed, 1);
  await new Promise((r) => setTimeout(r, 0));
  assert.equal(JSON.parse(sdk.data).coins, 999, 'progress saved on pause');
  sdk.fire.pause(); // repeated pause: no second sleep
  assert.deepEqual(game.loop.calls, ['pause', 'sleep']);
  sdk.fire.resume();
  assert.deepEqual(game.loop.calls, ['pause', 'sleep', 'resume', 'wake'], 'resume resets the delta before waking');
  assert.equal(game.input.enabled, true);
  assert.ok(!reasons.has('platform'));
  assert.ok(reasons.has('menu'), 'host resume does not close the player pause');
  sdk.fire.audio(false);
  assert.equal(muted, true);
  sdk.fire.audio(true);
  assert.equal(muted, false);
  assert.deepEqual(save.state.audio, createDefaultSave().audio, 'platform mute never rewrites the player settings');
});
