import test from 'node:test';
import assert from 'node:assert/strict';
import { statSync } from 'node:fs';
import { ASSET_URL, backgroundOrder, equippedHeadKeys, levelKeys, sceneKeys, startKeys } from '../../src/content/assetGroups.js';
import { CAMPAIGN_LOBBY, IMAGE_ASSETS } from '../../src/content/assets.js';
import { CAMPAIGN_ORDER, LEVELS } from '../../src/content/levels.js';
import { APPEARANCE_ITEMS, DEFAULT_EQUIPPED_APPEARANCE } from '../../src/content/appearance.js';
import { PLAYTIME_REWARDS } from '../../src/content/playtime.js';

const save = (patch = {}) => ({ availableLevel: 1, appearance: { equipped: { ...DEFAULT_EQUIPPED_APPEARANCE } }, ...patch });
const bytes = (keys) => keys.reduce((n, k) => n + statSync(`public/${ASSET_URL.get(k)}`).size, 0);

test('the start set is small and holds everything the Lobby and its popups show', () => {
  const start = new Set(startKeys(save()));
  for (const k of CAMPAIGN_LOBBY) assert.ok(start.has(k), `lobby art ${k}`);
  for (const k of ['room', 'avatar', 'coin', 'hint-hand', 'custom-close', 'custom-card', 'jelly-finished']) assert.ok(start.has(k), k);
  for (const k of IMAGE_ASSETS.map((a) => a.key).filter((k) => /^(settings|playtime|reward)-/.test(k))) assert.ok(start.has(k), k);
  for (const r of PLAYTIME_REWARDS.filter((x) => x.item)) {
    assert.ok(start.has(APPEARANCE_ITEMS.find((i) => i.id === r.item).texture), `playtime icon ${r.item}`);
  }
  // Every wearable part except the 27 head variants (the equipped three are included).
  for (const item of APPEARANCE_ITEMS.filter((i) => i.texture && !i.texture.startsWith('custom-head-'))) assert.ok(start.has(item.texture), item.id);
  for (const k of equippedHeadKeys(DEFAULT_EQUIPPED_APPEARANCE)) assert.ok(start.has(k), k);
  assert.ok(bytes([...start]) < 5 * 1024 * 1024, `start set ${bytes([...start])} bytes`);
});

test('the Lobby dish follows the offered level and the equipped look follows the save', () => {
  const s = new Set(startKeys(save({ availableLevel: 31, appearance: { equipped: { ...DEFAULT_EQUIPPED_APPEARANCE, hair: 'hair-plum', skin: 'skin-deep' } } })));
  assert.ok(s.has(LEVELS[CAMPAIGN_ORDER[30]].finalTexture));
  for (const pose of ['happy', 'eating', 'chewing']) assert.ok(s.has(`custom-head-plum-deep-${pose}`));
  // The compositor's jaw mask is the plum head of the equipped skin, whatever the hair.
  const honeyWarm = new Set(startKeys(save({ appearance: { equipped: { ...DEFAULT_EQUIPPED_APPEARANCE, hair: 'hair-honey', skin: 'skin-warm' } } })));
  for (const pose of ['happy', 'eating', 'chewing']) for (const hair of ['honey', 'plum']) assert.ok(honeyWarm.has(`custom-head-${hair}-warm-${pose}`), `${hair}-warm-${pose}`);
  assert.deepEqual(sceneKeys('Home', {}, save({ availableLevel: 31 })), [LEVELS[CAMPAIGN_ORDER[30]].finalTexture]);
});

test('every level asks for its own dish, servings, bites and recipe art; Result adds the next preview', () => {
  for (const [i, id] of CAMPAIGN_ORDER.entries()) {
    const level = LEVELS[id];
    const keys = new Set(sceneKeys('Level', { levelId: id }));
    for (const k of [level.finalTexture, level.servingTexture, level.emptyTexture, ...level.biteTextures]) assert.ok(keys.has(k), `${id}: ${k}`);
    for (const k of levelKeys(id)) assert.ok(ASSET_URL.has(k), `${id}: ${k} is in the manifest`);
    const next = CAMPAIGN_ORDER[i + 1];
    const result = new Set(sceneKeys('Result', { levelId: id }));
    assert.ok(result.has(level.finalTexture), `${id} result dish ${level.finalTexture}`);
    if (next) {
      for (const k of LEVELS[next].unlockPreview ?? []) if (ASSET_URL.has(k)) assert.ok(result.has(k), `${id} result preview ${k}`);
      for (const k of levelKeys(next)) {
        if (!(LEVELS[next].unlockPreview ?? []).includes(k)) assert.ok(!result.has(k), `${id} must not block Result on next-level art ${k}`);
      }
    }
  }
});

test('the background stream eventually loads every image', () => {
  const order = new Set(backgroundOrder(save()));
  for (const { key } of IMAGE_ASSETS) assert.ok(order.has(key), key);
  for (const scene of ['Level', 'Result', 'Levels', 'Customization', 'Store', 'Checkout', 'Canteen', 'Meal', 'PartTime']) {
    for (const k of sceneKeys(scene, { levelId: CAMPAIGN_ORDER[0] })) assert.ok(ASSET_URL.has(k), `${scene}: ${k}`);
  }
});
