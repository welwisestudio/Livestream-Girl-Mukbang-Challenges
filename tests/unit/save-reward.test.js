import test from 'node:test';
import assert from 'node:assert/strict';
import { SaveService, createDefaultSave } from '../../src/services/SaveService.js';
import { RewardService } from '../../src/services/RewardService.js';
import { CAMPAIGN_ORDER, LEVELS } from '../../src/content/levels.js';

class MemoryPlatform {
  constructor(raw = '') { this.raw = raw; this.writes = 0; }
  async loadData() { return this.raw; }
  async saveData(raw) { this.raw = raw; this.writes += 1; return { status: 'saved' }; }
}

test('default save is loaded before writes and starts with the configured wallet', async () => {
  const platform = new MemoryPlatform();
  const save = new SaveService(platform);
  assert.throws(() => save.mutate(() => {}), /load before mutation/);
  const state = await save.load();
  assert.deepEqual(state, createDefaultSave());
  assert.equal(state.coins, 1000);
});

test('Level 1 reward is atomic and the same run cannot pay twice', async () => {
  const platform = new MemoryPlatform();
  const save = new SaveService(platform);
  await save.load();
  const rewards = new RewardService(save);
  const payload = { levelId: 'orange-jelly-01', runId: 'run-1', coins: 200, unlockLevel: 2 };
  const first = await rewards.grantLevelCompletion(payload);
  const second = await rewards.grantLevelCompletion(payload);
  assert.equal(first.applied, true);
  assert.equal(second.applied, false);
  assert.equal(save.snapshot().coins, 1200);
  assert.equal(save.snapshot().highestLevel, 1);
  assert.equal(save.snapshot().availableLevel, 2);
  assert.equal(save.snapshot().completedLevels['orange-jelly-01'], 1);
  assert.equal(platform.writes, 1);
});

test('campaign contains exactly the confirmed five standard levels in fixed order', () => {
  assert.deepEqual(CAMPAIGN_ORDER, ['orange-jelly-01', 'ramen-02', 'pizza-03', 'sushi-04', 'bubble-tea-05']);
  assert.deepEqual(Object.keys(LEVELS), CAMPAIGN_ORDER);
  assert.deepEqual(LEVELS['orange-jelly-01'].steps.map((step) => step.id), [
    'choose-mold', 'pour-mix', 'stir', 'unmold', 'add-berries', 'add-glaze',
  ]);
  assert.equal(LEVELS['orange-jelly-01'].servings, 3);
  assert.equal(LEVELS['orange-jelly-01'].rewardCoins, 200);
  for (const [index, id] of CAMPAIGN_ORDER.entries()) {
    assert.equal(LEVELS[id].number, index + 1);
    assert.ok(LEVELS[id].steps.length >= 5);
    assert.equal(LEVELS[id].servings, 3);
  }
});

test('every texture referenced by all five levels exists in the runtime asset manifest', async () => {
  const { IMAGE_ASSETS } = await import('../../src/content/assets.js');
  const keys = new Set(IMAGE_ASSETS.map((a) => a.key));
  const used = [];
  for (const level of Object.values(LEVELS)) {
    used.push(level.request.avatar, level.request.dish, level.finalTexture, level.servingTexture, level.emptyTexture, ...level.biteTextures, ...level.unlockPreview);
    for (const step of level.steps) {
      for (const k of ['result', 'tool', 'before', 'after', 'base', 'mold', 'reveal']) if (step[k]) used.push(step[k]);
      for (const o of step.options ?? []) if (o.texture) used.push(o.texture);
      if (step.options) assert.equal(step.options.filter((o) => o.correct).length, 1, step.id);
    }
  }
  for (const key of used) assert.ok(keys.has(key), key);
});

test('standard-level unlock spends coins once and cannot skip progression', async () => {
  const platform = new MemoryPlatform();
  const save = new SaveService(platform); await save.load();
  const rewards = new RewardService(save);
  await assert.rejects(rewards.unlockLevel({ levelId: 'pizza-03', levelNumber: 3, price: 160 }), /previous level/);
  await rewards.grantLevelCompletion({ levelId: 'orange-jelly-01', runId: 'unlock-run', coins: 200, unlockLevel: 2 });
  const unlocked = await rewards.unlockLevel({ levelId: 'ramen-02', levelNumber: 2, price: 120 });
  assert.equal(unlocked.state.highestLevel, 2);
  assert.equal(unlocked.state.coins, 1080);
  const repeated = await rewards.unlockLevel({ levelId: 'ramen-02', levelNumber: 2, price: 120 });
  assert.equal(repeated.applied, false);
  assert.equal(repeated.state.coins, 1080);
});

test('a failed save rejects the claim so the result screen can retry', async () => {
  let online = false;
  let stored = '';
  const platform = { loadData: async () => '', saveData: async (raw) => { if (!online) throw new Error('offline'); stored = raw; } };
  const save = new SaveService(platform);
  await save.load();
  const rewards = new RewardService(save);
  const payload = { levelId: 'orange-jelly-01', runId: 'r', coins: 200, unlockLevel: 2 };
  await assert.rejects(rewards.grantLevelCompletion(payload), /offline/);
  online = true;
  const retry = await rewards.grantLevelCompletion(payload);
  assert.equal(retry.applied, false);
  assert.equal(JSON.parse(stored).coins, 1200);
  assert.equal(save.snapshot().coins, 1200);
});
