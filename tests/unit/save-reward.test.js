import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { SaveService, createDefaultSave } from '../../src/services/SaveService.js';
import { RewardService } from '../../src/services/RewardService.js';
import { CAMPAIGN_LENGTH, CAMPAIGN_ORDER, LEVELS } from '../../src/content/levels.js';
import { NEW_RECIPE_DEFINITIONS, REQUIRED_INTERACTIONS } from '../../src/content/recipeCatalog.js';
import { AppearanceService } from '../../src/services/AppearanceService.js';

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

test('finishing Level 50 restarts campaign progression at Level 1 without resetting meta state', async () => {
  const initial = createDefaultSave();
  initial.coins = 4321;
  initial.highestLevel = CAMPAIGN_LENGTH;
  initial.availableLevel = CAMPAIGN_LENGTH;
  initial.completedLevels = Object.fromEntries(CAMPAIGN_ORDER.slice(0, -1).map((id) => [id, 1]));
  initial.appearance.owned.push('glasses-round');
  const platform = new MemoryPlatform(JSON.stringify(initial));
  const save = new SaveService(platform);
  await save.load();
  const rewards = new RewardService(save);
  const finalLevel = LEVELS[CAMPAIGN_ORDER.at(-1)];

  const result = await rewards.grantLevelCompletion({
    levelId: finalLevel.id,
    runId: 'cycle-one-final',
    coins: finalLevel.rewardCoins,
    unlockLevel: finalLevel.number,
  });

  assert.equal(result.applied, true);
  assert.equal(result.state.coins, 4321 + finalLevel.rewardCoins);
  assert.equal(result.state.highestLevel, 1);
  assert.equal(result.state.availableLevel, 1);
  assert.deepEqual(result.state.completedLevels, {});
  assert.ok(result.state.appearance.owned.includes('glasses-round'));
  assert.ok(result.state.rewardReceipts.includes('level-complete:cycle-one-final'));
});

test('campaign contains exactly 50 confirmed levels in fixed order', () => {
  assert.equal(CAMPAIGN_LENGTH, 50);
  assert.deepEqual(CAMPAIGN_ORDER.slice(0, 5), ['orange-jelly-01', 'ramen-02', 'pizza-03', 'sushi-04', 'bubble-tea-05']);
  assert.equal(CAMPAIGN_ORDER.at(-1), 'matcha-bubble-tea-50');
  assert.deepEqual(Object.keys(LEVELS), CAMPAIGN_ORDER);
  assert.deepEqual(LEVELS['orange-jelly-01'].steps.map((step) => step.id), [
    'choose-mold', 'pour-mix', 'stir', 'unmold', 'add-berries', 'add-glaze',
  ]);
  assert.equal(LEVELS['orange-jelly-01'].servings, 3);
  assert.equal(LEVELS['orange-jelly-01'].rewardCoins, 200);
  for (const [index, id] of CAMPAIGN_ORDER.entries()) {
    assert.equal(LEVELS[id].number, index + 1);
    assert.ok(LEVELS[id].steps.length >= (index < 5 ? 5 : 4));
    assert.equal(LEVELS[id].servings, 3);
  }
  assert.deepEqual(NEW_RECIPE_DEFINITIONS.map((recipe) => recipe.title), [
    'Corn Dogs', 'Pancakes', 'Burger', 'Donuts', 'French Fries', 'Tacos',
    'Pasta with Tomato Sauce', 'Mochi', 'Onigiri', 'Chicken Nuggets', 'Waffles with Ice Cream',
    'Mini Hot Dogs', 'Mac and Cheese', 'Chocolate-Covered Strawberries', 'Cake Pops', 'Skewers',
    'Eggs and Bacon', 'Sandwich', 'Mini Pepperoni Pizza', 'Egg Fried Rice', 'Udon', 'Kimbap',
    'Fruit Salad', 'Chocolate Banana', 'Cupcakes', 'Churros', 'Caramel Popcorn', 'Chicken Wings',
    'Cheese Sticks', 'Potato Wedges', 'Omurice', 'Fried Dumplings / Gyoza', 'Croquettes',
    'Taiyaki', 'Egg and Cheese Toast', 'Fruit Sandwich', 'Mini Strawberry Pancakes',
    'French Toast', 'Chicken Wrap', 'Nachos with Cheese', 'Mini Chicken Tacos',
    'Chocolate Chip Cookies', 'Blueberry Muffins', 'Strawberry Milkshake', 'Matcha Bubble Tea',
  ]);
  assert.ok(REQUIRED_INTERACTIONS.length >= 20);
  for (const definition of NEW_RECIPE_DEFINITIONS) {
    assert.ok(definition.steps.length >= 4 && definition.steps.length <= 8, definition.title);
    assert.ok(definition.uniqueMechanic, definition.title);
  }
});

test('every texture referenced by all 50 levels exists in the runtime asset manifest', async () => {
  const { IMAGE_ASSETS } = await import('../../src/content/assets.js');
  const keys = new Set(IMAGE_ASSETS.map((a) => a.key));
  const used = [];
  for (const level of Object.values(LEVELS)) {
    used.push(level.request.avatar, level.request.dish, level.finalTexture, level.servingTexture, level.emptyTexture, ...level.biteTextures, ...level.unlockPreview);
    for (const step of level.steps) {
      for (const k of ['result', 'tool', 'before', 'after', 'base', 'mold', 'reveal', 'item', 'cooking', 'ready', 'heat']) if (step[k]) used.push(step[k]);
      for (const entry of step.sequence ?? []) used.push(entry.item, ...(entry.result ? [entry.result] : []));
      for (const o of step.options ?? []) if (o.texture) used.push(o.texture);
      if (step.options) assert.equal(step.options.filter((o) => o.correct).length, 1, step.id);
    }
  }
  for (const key of used) assert.ok(keys.has(key), key);
  const campaign50 = IMAGE_ASSETS.filter((asset) => asset.url.startsWith('assets/campaign50/'));
  assert.equal(campaign50.length, 225);
  for (const asset of campaign50) assert.ok(existsSync(resolve('public', asset.url)), asset.url);
  for (const asset of IMAGE_ASSETS.filter((a) => a.url.startsWith('assets/kitchen/'))) assert.ok(existsSync(resolve('public', asset.url)), asset.url);
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

test('legacy saves migrate to the default structured appearance without losing progression', async () => {
  const platform = new MemoryPlatform(JSON.stringify({ version: 2, coins: 777, highestLevel: 2, availableLevel: 3, completedLevels: { 'orange-jelly-01': 1 }, rewardReceipts: [] }));
  const save = new SaveService(platform);
  const state = await save.load();
  assert.equal(state.version, 10);
  assert.equal(state.coins, 777);
  assert.equal(state.appearance.equipped.hair, 'hair-silver');
  assert.equal(state.appearance.equipped.outfit, 'outfit-frog-sweater');
  assert.equal(state.appearance.equipped.tablecloth, 'table-lavender');
  assert.equal(state.appearance.equipped.background, 'background-hearts');
  assert.equal(state.appearance.equipped.glasses, 'glasses-none');
  assert.ok(state.appearance.owned.includes('skin-deep'));
});

test('the old Cocoa/Orange Cat default becomes the silver heroine without losing owned or customized items', async () => {
  const oldDefault = {
    hair: 'hair-cocoa', skin: 'skin-peach', outfit: 'outfit-orange-cat', accessory: 'accessory-none',
    glasses: 'glasses-heart', tablecloth: 'table-winter', background: 'background-hearts',
  };
  for (const version of [4, 5]) {
    const migrated = await new SaveService(new MemoryPlatform(JSON.stringify({
      ...createDefaultSave(), version, appearance: { equipped: oldDefault, owned: [...Object.values(oldDefault)] },
    }))).load();
    assert.equal(migrated.version, 10);
    assert.deepEqual(migrated.appearance.equipped, {
      hair: 'hair-silver', skin: 'skin-peach', outfit: 'outfit-frog-sweater', accessory: 'accessory-none',
      glasses: 'glasses-none', tablecloth: 'table-winter', background: 'background-hearts',
    });
    assert.ok(migrated.appearance.owned.includes('outfit-orange-cat'));
    assert.ok(migrated.appearance.owned.includes('glasses-heart'));
    assert.ok(!migrated.appearance.owned.includes('hair-cocoa'));
  }

  const customized = await new SaveService(new MemoryPlatform(JSON.stringify({
    ...createDefaultSave(), version: 5,
    appearance: { equipped: { ...oldDefault, hair: 'hair-honey', outfit: 'outfit-mint-cafe' }, owned: [...Object.values(oldDefault), 'hair-honey', 'outfit-mint-cafe'] },
  }))).load();
  assert.equal(customized.appearance.equipped.hair, 'hair-honey');
  assert.equal(customized.appearance.equipped.glasses, 'glasses-heart');
  // The retired Frog Hoodie falls back to the free default outfit.
  assert.equal(customized.appearance.equipped.outfit, 'outfit-frog-sweater');
});

test('appearance purchase is atomic and equip rejects unowned items', async () => {
  const platform = new MemoryPlatform();
  const save = new SaveService(platform); await save.load();
  const appearance = new AppearanceService(save);
  await assert.rejects(appearance.equip({ ...appearance.snapshot().equipped, glasses: 'glasses-round' }), /Buy this item/);
  const first = await appearance.purchase('glasses-round');
  const second = await appearance.purchase('glasses-round');
  assert.equal(first.applied, true);
  assert.equal(second.applied, false);
  assert.equal(save.snapshot().coins, 910);
  await appearance.equip({ ...appearance.snapshot().equipped, glasses: 'glasses-round' });
  assert.equal(save.snapshot().appearance.equipped.glasses, 'glasses-round');
  assert.equal(platform.writes, 2);
});

test('appearance purchase cannot overdraw the soft-currency wallet', async () => {
  const platform = new MemoryPlatform();
  const save = new SaveService(platform); await save.load();
  await save.mutate((state) => { state.coins = 50; });
  const appearance = new AppearanceService(save);
  await assert.rejects(appearance.purchase('outfit-orange-cat'), /Not enough coins/);
  assert.equal(save.snapshot().coins, 50);
  assert.equal(appearance.isOwned('outfit-orange-cat'), false);
});
