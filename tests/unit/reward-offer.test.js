import test from 'node:test';
import assert from 'node:assert/strict';
import { SaveService } from '../../src/services/SaveService.js';
import { RewardService } from '../../src/services/RewardService.js';
import { LEVEL_REWARD_OFFER, pointerPosition, segmentAt } from '../../src/content/economy.js';
import { CAMPAIGN_ORDER, LEVELS } from '../../src/content/levels.js';
import { DevPlatformAdapter } from '../../src/platform/dev/DevPlatformAdapter.js';
import {
  APPEARANCE_CATEGORIES,
  APPEARANCE_REWARDED_PLACEMENT,
  itemsForCategory,
} from '../../src/content/appearance.js';

class MemoryPlatform {
  constructor() { this.raw = ''; this.ads = []; this.next = []; }
  async loadData() { return this.raw; }
  async saveData(raw) { this.raw = raw; return { status: 'saved' }; }
  // Each call consumes the next scripted outcome; `gate` lets a test hold the ad open.
  async requestRewarded(placementId) {
    this.ads.push(placementId);
    const step = this.next.shift() ?? { status: 'earned' };
    if (step.gate) await step.gate;
    if (step.throws) throw new Error('sdk failure');
    return { status: step.status };
  }
}

async function setup() {
  const platform = new MemoryPlatform();
  const save = new SaveService(platform);
  await save.load();
  return { platform, save, rewards: new RewardService(save, platform) };
}

const claim = { levelId: 'ramen-02', baseCoins: 220, unlockLevel: 3, placementId: LEVEL_REWARD_OFFER.placementId };

test('base rewards come from level data and the default multiplier bar is [2,3,5,3,2]', () => {
  assert.deepEqual([...LEVEL_REWARD_OFFER.multipliers], [2, 3, 5, 3, 2]);
  assert.deepEqual(CAMPAIGN_ORDER.slice(0, 5).map((id) => LEVELS[id].rewardCoins), [200, 220, 260, 300, 360]);
  assert.equal(CAMPAIGN_ORDER.length, 50);
  assert.equal(LEVELS['matcha-bubble-tea-50'].rewardCoins, 1690);
  for (const id of CAMPAIGN_ORDER) assert.equal(LEVELS[id].unlockPrice, undefined);
});

test('the pointer ping-pongs forever and selects the segment under it', () => {
  const stops = [0, 0.207, 0.398, 0.603, 0.794, 1];
  const sweep = 1600;
  assert.equal(pointerPosition(0, sweep), 0);
  assert.equal(pointerPosition(800, sweep), 0.5);
  assert.equal(pointerPosition(1600, sweep), 1);
  assert.equal(pointerPosition(2400, sweep), 0.5);
  assert.equal(pointerPosition(3200, sweep), 0);
  assert.ok(pointerPosition(1_000_000_123, sweep) >= 0 && pointerPosition(1_000_000_123, sweep) <= 1);
  const m = LEVEL_REWARD_OFFER.multipliers;
  assert.equal(m[segmentAt(0.05, stops)], 2);
  assert.equal(m[segmentAt(0.3, stops)], 3);
  assert.equal(m[segmentAt(0.5, stops)], 5);
  assert.equal(m[segmentAt(0.7, stops)], 3);
  assert.equal(m[segmentAt(0.95, stops)], 2);
  assert.equal(m[segmentAt(1, stops)], 2);
});

for (const multiplier of [2, 3, 5]) {
  test(`earned rewarded ad pays base × ${multiplier}`, async () => {
    const { save, rewards, platform } = await setup();
    const result = await rewards.claimLevelWithAd({ ...claim, runId: `r${multiplier}`, multiplier });
    assert.equal(result.status, 'granted');
    assert.equal(result.coins, 220 * multiplier);
    assert.equal(save.snapshot().coins, 1000 + 220 * multiplier);
    assert.equal(save.snapshot().availableLevel, 3);
    assert.deepEqual(platform.ads, [LEVEL_REWARD_OFFER.placementId]);
  });
}

test('not-earned, unavailable, error and a throwing SDK grant nothing and keep the run claimable', async () => {
  const { save, rewards, platform } = await setup();
  platform.next = [{ status: 'not-earned' }, { status: 'unavailable' }, { status: 'error' }, { throws: true }];
  for (const expected of ['not-earned', 'unavailable', 'error', 'error']) {
    const result = await rewards.claimLevelWithAd({ ...claim, runId: 'fail', multiplier: 5 });
    assert.equal(result.applied, false);
    assert.equal(result.status, expected);
  }
  assert.equal(save.snapshot().coins, 1000);
  assert.equal(save.snapshot().completedLevels['ramen-02'], undefined);
  // Retry succeeds after the failures.
  const retry = await rewards.claimLevelWithAd({ ...claim, runId: 'fail', multiplier: 3 });
  assert.equal(retry.coins, 660);
  assert.equal(save.snapshot().coins, 1660);
});

test('base claim ignores the multiplier and needs no ad', async () => {
  const { save, rewards, platform } = await setup();
  const result = await rewards.claimLevelBase({ ...claim, runId: 'base' });
  assert.equal(result.coins, 220);
  assert.equal(save.snapshot().coins, 1220);
  assert.equal(platform.ads.length, 0);
});

test('one completion can never be paid twice in any order', async () => {
  const { save, rewards } = await setup();
  await rewards.claimLevelWithAd({ ...claim, runId: 'once', multiplier: 5 });
  assert.equal((await rewards.claimLevelWithAd({ ...claim, runId: 'once', multiplier: 5 })).status, 'already-claimed');
  assert.equal((await rewards.claimLevelBase({ ...claim, runId: 'once' })).status, 'already-claimed');
  assert.equal(save.snapshot().coins, 2100);

  await rewards.claimLevelBase({ ...claim, runId: 'once-b' });
  assert.equal((await rewards.claimLevelWithAd({ ...claim, runId: 'once-b', multiplier: 5 })).status, 'already-claimed');
  assert.equal(save.snapshot().coins, 2320);
  assert.equal(save.snapshot().rewardReceipts.filter((r) => r.startsWith('level-complete:once')).length, 2);
});

test('base claim is refused while the same run\'s ad is open, so both rewards cannot land', async () => {
  const { save, rewards, platform } = await setup();
  let release;
  platform.next = [{ status: 'earned', gate: new Promise((r) => { release = r; }) }];
  const adPromise = rewards.claimLevelWithAd({ ...claim, runId: 'race', multiplier: 5 });
  const base = await rewards.claimLevelBase({ ...claim, runId: 'race' });
  assert.equal(base.status, 'ad-in-progress');
  const parallelAd = await rewards.claimLevelWithAd({ ...claim, runId: 'race', multiplier: 5 });
  assert.equal(parallelAd.status, 'busy');
  release();
  const ad = await adPromise;
  assert.equal(ad.coins, 1100);
  assert.equal(save.snapshot().coins, 2100);
});

test('the service rejects multipliers outside the configured offer', async () => {
  const { rewards } = await setup();
  await assert.rejects(rewards.claimLevelWithAd({ ...claim, runId: 'cheat', multiplier: 50 }), /Invalid reward multiplier/);
});

test('dev mock rewarded ad resolves every scripted outcome and refuses parallel ads', async () => {
  for (const mode of ['earned', 'not-earned', 'error', 'unavailable']) {
    const adapter = new DevPlatformAdapter({ storage: null, adMode: mode });
    assert.equal((await adapter.requestRewarded('p')).status, mode);
  }
  const adapter = new DevPlatformAdapter({ storage: null, adMode: 'earned' });
  const first = adapter.requestRewarded('p');
  assert.equal((await adapter.requestRewarded('p')).status, 'error');
  assert.equal((await first).status, 'earned');
});

test('free coins: paid only after an earned ad, exactly once per popup opening', async () => {
  const { FREE_COINS_AD } = await import('../../src/content/economy.js');
  const { platform, save, rewards } = await setup();
  const start = save.state.coins;
  for (const status of ['not-earned', 'unavailable', 'error']) {
    platform.next.push({ status });
    const r = await rewards.claimFreeCoinsWithAd({ claimId: 'open-1' });
    assert.deepEqual([r.applied, r.status], [false, status]);
    assert.equal(save.state.coins, start, `${status} pays nothing`);
  }
  platform.next.push({ throws: true });
  assert.deepEqual([(await rewards.claimFreeCoinsWithAd({ claimId: 'open-1' })).status, save.state.coins], ['error', start]);
  assert.ok(platform.ads.every((p) => p === FREE_COINS_AD.placementId));

  const won = await rewards.claimFreeCoinsWithAd({ claimId: 'open-1' });
  assert.deepEqual([won.applied, won.status, won.coins], [true, 'granted', FREE_COINS_AD.coins]);
  assert.equal(save.state.coins, start + FREE_COINS_AD.coins);
  const again = await rewards.claimFreeCoinsWithAd({ claimId: 'open-1' });
  assert.deepEqual([again.applied, again.status], [false, 'already-claimed']);
  assert.equal(save.state.coins, start + FREE_COINS_AD.coins);
  // A new opening can be claimed again after its own earned ad.
  assert.equal((await rewards.claimFreeCoinsWithAd({ claimId: 'open-2' })).applied, true);
  assert.equal(save.state.coins, start + FREE_COINS_AD.coins * 2);
});

test('free coins: a second request while the ad is open is refused', async () => {
  const { platform, save, rewards } = await setup();
  let release;
  platform.next.push({ status: 'earned', gate: new Promise((r) => { release = r; }) });
  const first = rewards.claimFreeCoinsWithAd({ claimId: 'a' });
  const second = await rewards.claimFreeCoinsWithAd({ claimId: 'a' });
  assert.equal(second.status, 'busy');
  release();
  assert.equal((await first).status, 'granted');
  assert.equal(save.state.rewardReceipts.filter((r) => r === 'free-coins:a').length, 1);
});

test('customization ad unlocks every third item without spending coins', async () => {
  const { platform, save, rewards } = await setup();
  const adItems = APPEARANCE_CATEGORIES.map((category) => itemsForCategory(category.id)[2]);
  for (const item of adItems) {
    const result = await rewards.unlockAppearanceWithAd(item.id);
    assert.deepEqual([result.applied, result.status], [true, 'granted'], item.id);
    assert.ok(save.state.appearance.owned.includes(item.id), item.id);
    assert.ok(save.state.rewardReceipts.includes(`appearance-rewarded:${item.id}`), item.id);
  }
  assert.equal(save.state.coins, 1000);
  assert.ok(platform.ads.every((placement) => placement === APPEARANCE_REWARDED_PLACEMENT));
  assert.equal((await rewards.unlockAppearanceWithAd(adItems[0].id)).status, 'already-unlocked');
  assert.equal((await rewards.unlockAppearanceWithAd('glasses-round')).status, 'invalid-item');
});

test('customization ad unlocks an unaffordable coin item without spending coins', async () => {
  const { save, rewards } = await setup();
  // Affordable coin items must be bought with coins, not with an ad.
  assert.equal((await rewards.unlockAppearanceWithAd('glasses-round')).status, 'invalid-item');
  await save.mutate((state) => { state.coins = 10; });
  const result = await rewards.unlockAppearanceWithAd('glasses-round');
  assert.deepEqual([result.applied, result.status], [true, 'granted']);
  assert.ok(save.state.appearance.owned.includes('glasses-round'));
  assert.equal(save.state.coins, 10);
  assert.equal((await rewards.unlockAppearanceWithAd('glasses-round')).status, 'already-unlocked');
});

test('customization ad for an unaffordable coin item grants nothing unless earned', async () => {
  const { platform, save, rewards } = await setup();
  await save.mutate((state) => { state.coins = 10; });
  platform.next = [{ status: 'not-earned' }, { status: 'error' }, { throws: true }];
  for (const status of ['not-earned', 'error', 'error']) {
    const result = await rewards.unlockAppearanceWithAd('outfit-orange-cat');
    assert.deepEqual([result.applied, result.status], [false, status]);
    assert.ok(!save.state.appearance.owned.includes('outfit-orange-cat'));
    assert.equal(save.state.coins, 10);
  }
});

test('customization cancel, unavailable, error and SDK rejection unlock nothing', async () => {
  const { platform, save, rewards } = await setup();
  const itemId = 'glasses-heart';
  platform.next = [{ status: 'not-earned' }, { status: 'unavailable' }, { status: 'error' }, { throws: true }];
  for (const status of ['not-earned', 'unavailable', 'error', 'error']) {
    const result = await rewards.unlockAppearanceWithAd(itemId);
    assert.deepEqual([result.applied, result.status], [false, status]);
    assert.ok(!save.state.appearance.owned.includes(itemId));
    assert.equal(save.state.coins, 1000);
  }
  assert.equal((await rewards.unlockAppearanceWithAd(itemId)).status, 'granted');
  assert.ok(save.state.appearance.owned.includes(itemId));
});
