import test from 'node:test';
import assert from 'node:assert/strict';
import { SaveService } from '../../src/services/SaveService.js';
import { PlaytimeService } from '../../src/services/PlaytimeService.js';
import { PLAYTIME_REWARDS, PLAYTIME_TAKE_ALL_PLACEMENT } from '../../src/content/playtime.js';

class MemoryPlatform {
  constructor(raw = '') { this.raw = raw; this.ads = []; this.next = []; }
  async loadData() { return this.raw; }
  async saveData(raw) { this.raw = raw; return { status: 'saved' }; }
  async requestRewarded(id) { this.ads.push(id); const s = this.next.shift() ?? 'earned'; if (s === 'throw') throw new Error('x'); return { status: s }; }
}

async function setup(raw) {
  const platform = new MemoryPlatform(raw);
  const save = new SaveService(platform);
  await save.load();
  return { platform, save, playtime: new PlaytimeService(save, platform) };
}
const play = (pt, minutes) => { for (let ms = 0; ms < minutes * 60_000; ms += 1000) pt.tick(1000); };

test('seven one-time rewards unlock by active minutes; ticks are capped', async () => {
  const { playtime } = await setup();
  assert.deepEqual(PLAYTIME_REWARDS.map((r) => r.minutes), [1, 2, 4, 6, 9, 12, 15]);
  assert.equal(playtime.status().claimable, 0);
  playtime.tick(10 * 60_000); // a sleeping tab cannot add minutes at once
  assert.equal(playtime.status().activeMs, 2000);
  play(playtime, 2);
  const s = playtime.status();
  assert.deepEqual(s.rewards.filter((r) => r.unlocked).map((r) => r.id), ['pt-1', 'pt-2']);
  assert.ok(s.rewards[2].msLeft > 0);
});

test('claiming pays coins once, refuses locked rewards, and persists minutes', async () => {
  const { playtime, save, platform } = await setup();
  play(playtime, 1);
  assert.equal((await playtime.claim('pt-2')).status, 'locked');
  assert.equal((await playtime.claim('pt-1')).coins, 200);
  assert.equal((await playtime.claim('pt-1')).status, 'already-claimed');
  assert.equal(save.snapshot().coins, 1200);
  const reloaded = await setup(platform.raw);
  assert.ok(reloaded.playtime.activeMs() >= 60_000);
  assert.deepEqual(reloaded.save.snapshot().playtime.claimed, ['pt-1']);
});

test('item rewards grant the wardrobe item, or its price when already owned', async () => {
  const { playtime, save } = await setup();
  play(playtime, 4);
  const r = await playtime.claim('pt-3');
  assert.deepEqual(r.items, ['outfit-berry-pop']);
  assert.ok(save.snapshot().appearance.owned.includes('outfit-berry-pop'));
  await save.mutate((s) => { s.appearance.owned.push('hair-plum'); });
  play(playtime, 11);
  const plum = await playtime.claim('pt-7');
  assert.equal(plum.coins, 140);
  assert.deepEqual(plum.items, []);
});

test('Take All pays every unclaimed reward only after an earned ad', async () => {
  const { playtime, save, platform } = await setup();
  play(playtime, 1);
  await playtime.claim('pt-1');
  platform.next = ['not-earned', 'unavailable', 'error', 'throw'];
  for (const expected of ['not-earned', 'unavailable', 'error', 'error']) {
    assert.equal((await playtime.takeAllWithAd()).status, expected);
  }
  assert.equal(save.snapshot().coins, 1200);
  const all = await playtime.takeAllWithAd();
  assert.equal(all.status, 'granted');
  assert.equal(all.coins, 300 + 500 + 1000 + 2000);
  assert.deepEqual(all.items.sort(), ['hair-plum', 'outfit-berry-pop']);
  assert.equal(save.snapshot().coins, 1200 + 3800);
  assert.equal(playtime.status().remaining, 0);
  assert.equal((await playtime.takeAllWithAd()).status, 'nothing-left');
  assert.equal((await playtime.claim('pt-2')).status, 'already-claimed');
  assert.ok(platform.ads.every((id) => id === PLAYTIME_TAKE_ALL_PLACEMENT));
});

test('single claims are refused and time is frozen while the Take All ad is open', async () => {
  const { playtime, platform, save } = await setup();
  play(playtime, 1);
  let release;
  platform.requestRewarded = () => new Promise((r) => { release = () => r({ status: 'earned' }); });
  const pending = playtime.takeAllWithAd();
  assert.equal((await playtime.claim('pt-1')).status, 'ad-in-progress');
  const before = playtime.activeMs();
  playtime.tick(1000);
  assert.equal(playtime.activeMs(), before);
  assert.equal((await playtime.takeAllWithAd()).status, 'busy');
  release();
  await pending;
  assert.equal(save.snapshot().coins, 1000 + 4000 + 0);
  assert.equal(save.snapshot().playtime.claimed.length, 7);
});

test('v6 saves migrate to v7 with an empty playtime track', async () => {
  const { save } = await setup(JSON.stringify({ version: 6, coins: 500, highestLevel: 2, availableLevel: 2, completedLevels: {}, rewardReceipts: [] }));
  assert.equal(save.snapshot().version, 10);
  assert.deepEqual(save.snapshot().playtime, { activeMs: 0, claimed: [] });
  assert.equal(save.snapshot().coins, 500);
});
