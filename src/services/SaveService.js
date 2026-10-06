import { DEFAULT_EQUIPPED_APPEARANCE, sanitizeAppearanceState } from '../content/appearance.js';
import { PLAYTIME_REWARDS } from '../content/playtime.js';
import { sanitizeOrders } from './FoodOrderService.js';

// v8 added the supermarket pantry; v9 replaces it with food orders shared by the
// Supermarket and the Canteen (bought, not yet eaten).
const SAVE_VERSION = 9;

// v7 adds the one-time Playtime Rewards track (active ms + claimed reward IDs).
function sanitizePlaytime(value = {}) {
  const known = new Set(PLAYTIME_REWARDS.map((r) => r.id));
  const claimed = Array.isArray(value.claimed) ? [...new Set(value.claimed.filter((id) => known.has(id)))] : [];
  return { activeMs: Math.max(0, Number.isFinite(value.activeMs) ? Math.floor(value.activeMs) : 0), claimed };
}

// The v4/v5 free default heroine (Cocoa hair + Orange Cat, without or with the Heart Pop
// glasses that v5 granted). It was replaced by the silver-haired Frog Sweater heroine in v6.
const LEGACY_DEFAULT_CHARACTER = Object.freeze({
  hair: 'hair-cocoa',
  skin: 'skin-peach',
  outfit: 'outfit-orange-cat',
  accessory: 'accessory-none',
});

function migrateLegacyDefaultCharacter(appearance, rawEquipped, sourceVersion) {
  if (sourceVersion > 5 || !rawEquipped) return appearance;
  const wasOldDefault = Object.entries(LEGACY_DEFAULT_CHARACTER)
    .every(([category, itemId]) => rawEquipped[category] === itemId)
    && ['glasses-none', 'glasses-heart'].includes(rawEquipped.glasses);
  if (!wasOldDefault) return appearance;
  // Only the character changes; table/background choices and everything already owned stay.
  for (const category of ['hair', 'skin', 'outfit', 'accessory', 'glasses']) {
    appearance.equipped[category] = DEFAULT_EQUIPPED_APPEARANCE[category];
  }
  return appearance;
}

export function createDefaultSave() {
  return {
    version: SAVE_VERSION,
    coins: 1000,
    highestLevel: 1,
    availableLevel: 1,
    completedLevels: {},
    rewardReceipts: [],
    appearance: sanitizeAppearanceState(),
    playtime: sanitizePlaytime(),
    orders: [],
  };
}

export class SaveService {
  constructor(platform) {
    this.platform = platform;
    this.state = createDefaultSave();
    this.loaded = false;
    this.saveQueue = Promise.resolve();
    this.lastError = null;
    this.dirty = false;
  }

  async load() {
    const raw = await this.platform.loadData();
    if (raw) {
      try {
        this.state = this.validate(JSON.parse(raw));
      } catch (error) {
        this.lastError = error;
        this.state = createDefaultSave();
      }
    }
    this.loaded = true;
    return this.snapshot();
  }

  validate(value) {
    if (!value || ![1, 2, 3, 4, 5, 6, 7, 8, SAVE_VERSION].includes(value.version)) return createDefaultSave();
    const highestLevel = Math.max(1, Math.min(5, Number.isFinite(value.highestLevel) ? Math.floor(value.highestLevel) : 1));
    return {
      version: SAVE_VERSION,
      coins: Math.max(0, Number.isFinite(value.coins) ? Math.floor(value.coins) : 1000),
      highestLevel,
      availableLevel: Math.max(highestLevel, Math.min(5, Number.isFinite(value.availableLevel) ? Math.floor(value.availableLevel) : highestLevel)),
      completedLevels: value.completedLevels && typeof value.completedLevels === 'object' ? value.completedLevels : {},
      rewardReceipts: Array.isArray(value.rewardReceipts) ? value.rewardReceipts.slice(-50) : [],
      appearance: migrateLegacyDefaultCharacter(sanitizeAppearanceState(value.appearance), value.appearance?.equipped, value.version),
      playtime: sanitizePlaytime(value.playtime),
      orders: sanitizeOrders(value.orders, value.pantry),
    };
  }

  snapshot() {
    return structuredClone(this.state);
  }

  hasReceipt(receiptId) {
    return this.state.rewardReceipts.includes(receiptId);
  }

  mutate(mutator) {
    if (!this.loaded) throw new Error('SaveService must load before mutation');
    mutator(this.state);
    return this.enqueueSave();
  }

  enqueueSave() {
    const serialized = JSON.stringify(this.state);
    this.dirty = true;
    this.saveQueue = this.saveQueue
      .catch(() => undefined)
      .then(() => this.platform.saveData(serialized))
      .then((result) => {
        if (JSON.stringify(this.state) === serialized) this.dirty = false;
        return result;
      })
      .catch((error) => {
        this.lastError = error;
        throw error;
      });
    return this.saveQueue;
  }
}
