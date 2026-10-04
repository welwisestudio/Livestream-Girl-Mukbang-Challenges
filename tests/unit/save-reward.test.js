import test from 'node:test';
import assert from 'node:assert/strict';
import { SaveService, createDefaultSave } from '../../src/services/SaveService.js';
import { RewardService } from '../../src/services/RewardService.js';
import { LEVELS } from '../../src/content/levels.js';

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
  assert.equal(save.snapshot().highestLevel, 2);
  assert.equal(save.snapshot().completedLevels['orange-jelly-01'], 1);
  assert.equal(platform.writes, 1);
});

test('Level 1 is the only campaign content and retains the confirmed six-step order', () => {
  assert.deepEqual(Object.keys(LEVELS), ['orange-jelly-01']);
  assert.deepEqual(LEVELS['orange-jelly-01'].steps.map((step) => step.id), [
    'choose-mold', 'pour-mix', 'stir', 'unmold', 'add-berries', 'add-glaze',
  ]);
  assert.equal(LEVELS['orange-jelly-01'].servings, 3);
  assert.equal(LEVELS['orange-jelly-01'].rewardCoins, 200);
});
