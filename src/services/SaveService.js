import { DEFAULT_EQUIPPED_APPEARANCE, sanitizeAppearanceState } from '../content/appearance.js';
import { PLAYTIME_REWARDS } from '../content/playtime.js';
import { sanitizeOrders } from './FoodOrderService.js';
import { CAMPAIGN_LENGTH } from '../content/levels.js';

// v8 added the supermarket pantry; v9 replaces it with food orders shared by the
// Supermarket and the Canteen (bought, not yet eaten).
export const SAVE_VERSION = 11;

const volume = (v) => (Number.isFinite(v) ? Math.min(1, Math.max(0, v)) : 1);
function sanitizeAudio(value = {}) {
  return { music: value.music !== false, sfx: value.sfx !== false, musicVolume: volume(value.musicVolume), sfxVolume: volume(value.sfxVolume) };
}

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
    audio: sanitizeAudio(),
    orders: [],
  };
}

// Cloud limits (YouTube: well-formed UTF-16, max 3 MiB, SHOULD be < 500 KiB). Both the UTF-16
// and the UTF-8 size are checked against a margin below the hard limit.
export const SAVE_LIMIT_BYTES = 3 * 1024 * 1024;
const SAVE_SAFE_BYTES = Math.floor(SAVE_LIMIT_BYTES * 0.9);
const SAVE_WARN_BYTES = 500 * 1024;
const RETRY_MS = [2000, 5000, 10000, 30000];

// A load that must not turn into an empty save: the game blocks writes and offers Retry.
export class SaveLoadError extends Error {
  constructor(kind, message, cause) {
    super(message);
    this.name = 'SaveLoadError';
    this.kind = kind; // 'load-failed' | 'invalid-response' | 'corrupt' | 'future-version'
    this.cause = cause;
  }
}

// Empty-save policy: an empty / whitespace string, "null" and "{}" mean "no progress yet".
// Everything else must parse to a known save version; anything newer than this build is
// refused (never downgraded or reset), anything unreadable is refused.
export function parseSave(raw) {
  if (typeof raw !== 'string') throw new SaveLoadError('invalid-response', `Save data is ${raw === null ? 'null' : typeof raw}, expected a string`);
  const text = raw.trim();
  if (text === '' || text === 'null' || text === '{}') return { state: createDefaultSave(), fresh: true, fromVersion: null };
  let value;
  try {
    value = JSON.parse(text);
  } catch (error) {
    throw new SaveLoadError('corrupt', 'Save data is not valid JSON', error);
  }
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new SaveLoadError('corrupt', 'Save data is not an object');
  if (!Number.isInteger(value.version) || value.version < 1) throw new SaveLoadError('corrupt', `Save data has no valid version (${value.version})`);
  if (value.version > SAVE_VERSION) throw new SaveLoadError('future-version', `Save version ${value.version} is newer than this game (${SAVE_VERSION})`);
  return { state: migrateSave(value), fresh: false, fromVersion: value.version };
}

export function measureSave(serialized) {
  const utf16 = serialized.length * 2;
  const utf8 = typeof TextEncoder !== 'undefined' ? new TextEncoder().encode(serialized).length : utf16;
  return { utf16, utf8, bytes: Math.max(utf16, utf8) };
}

export class SaveService {
  constructor(platform) {
    this.platform = platform;
    this.state = createDefaultSave();
    // Writes are allowed only after a successful load (YouTube rejects saveData before
    // loadData; a failed load must never be followed by a write of default data).
    this.loaded = false;
    this.loadError = null;
    this.lastError = null;
    this.dirty = false;
    this.pending = false;
    this.writing = null;
    this.writes = 0;
    this.retryTimer = null;
    this.retryIndex = 0;
    this.listeners = new Set();
  }

  async load() {
    this.loaded = false;
    let raw;
    try {
      raw = await this.platform.loadData();
    } catch (error) {
      this.loadError = new SaveLoadError('load-failed', error?.message ?? 'Cloud save could not be loaded', error);
      throw this.loadError;
    }
    try {
      const { state, fresh, fromVersion } = parseSave(raw);
      this.state = state;
      this.fresh = fresh;
      this.migratedFrom = fromVersion !== null && fromVersion !== SAVE_VERSION ? fromVersion : null;
    } catch (error) {
      this.loadError = error instanceof SaveLoadError ? error : new SaveLoadError('corrupt', error?.message, error);
      throw this.loadError;
    }
    this.loadError = null;
    this.loaded = true;
    this.emit();
    return this.snapshot();
  }

  // Kept for callers/tests: migrates a parsed save object of a known version.
  validate(value) {
    return migrateSave(value);
  }

  snapshot() {
    return structuredClone(this.state);
  }

  status() {
    return { loaded: this.loaded, dirty: this.dirty, saving: Boolean(this.writing), error: this.lastError ? String(this.lastError.message ?? this.lastError) : null, writes: this.writes };
  }

  subscribe(listener) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  emit() {
    for (const listener of [...this.listeners]) listener(this.status());
  }

  hasReceipt(receiptId) {
    return this.state.rewardReceipts.includes(receiptId);
  }

  mutate(mutator) {
    if (!this.loaded) throw new Error('SaveService must load before mutation');
    mutator(this.state);
    return this.enqueueSave();
  }

  // Sequential, coalescing writes: while one write is in flight, later changes are merged
  // into one follow-up write of the newest state, so an older snapshot can never land after
  // a newer one. Resolves when the newest state at call time is stored.
  enqueueSave() {
    if (!this.loaded) return Promise.reject(new Error('Save is not loaded; writing is blocked'));
    this.dirty = true;
    this.pending = true;
    if (!this.writing) {
      this.writing = this.drain().finally(() => { this.writing = null; this.emit(); });
    }
    this.emit();
    return this.writing;
  }

  async drain() {
    while (this.pending) {
      this.pending = false;
      const serialized = JSON.stringify(this.state);
      try {
        const { bytes } = measureSave(serialized);
        if (bytes > SAVE_SAFE_BYTES) throw new Error(`Save is too large (${bytes} bytes)`);
        if (typeof serialized.isWellFormed === 'function' && !serialized.isWellFormed()) throw new Error('Save is not well-formed UTF-16');
        if (bytes > SAVE_WARN_BYTES) this.platform.reportWarning?.('save-size');
        await this.platform.saveData(serialized);
        this.writes += 1;
        this.lastError = null;
        this.retryIndex = 0;
      } catch (error) {
        this.lastError = error;
        this.pending = false;
        this.scheduleRetry();
        throw error;
      }
    }
    this.dirty = false;
    clearTimeout(this.retryTimer);
    this.retryTimer = null;
  }

  // A failed write keeps the save dirty and is retried with backoff (and by the next change
  // or a host pause flush); the retry always sends the newest state.
  scheduleRetry() {
    if (this.retryTimer || typeof setTimeout === 'undefined') return;
    const delay = RETRY_MS[Math.min(this.retryIndex, RETRY_MS.length - 1)];
    this.retryIndex += 1;
    this.retryTimer = setTimeout(() => {
      this.retryTimer = null;
      if (this.dirty && !this.paused) this.enqueueSave().catch(() => {});
    }, delay);
    this.retryTimer?.unref?.();
  }

  // Host pause: write unsaved progress now (the window before eviction may be short).
  flush() {
    if (!this.loaded || !this.dirty) return this.writing ?? Promise.resolve();
    return this.enqueueSave();
  }

  setPaused(value) {
    this.paused = Boolean(value);
    if (!this.paused && this.dirty && !this.writing) this.enqueueSave().catch(() => {});
  }
}

// Migrates any known save version (1 … SAVE_VERSION) to the current shape. Earned progress
// (coins, levels, wardrobe, receipts, playtime, orders, settings) is always carried over.
export function migrateSave(value) {
  // Paid level unlocks were removed: a level that was earned (availableLevel) is open,
  // so older saves waiting on an unpaid unlock are opened here.
  const highestLevel = Math.max(1, Math.min(CAMPAIGN_LENGTH, Math.max(
    Number.isFinite(value.highestLevel) ? Math.floor(value.highestLevel) : 1,
    Number.isFinite(value.availableLevel) ? Math.floor(value.availableLevel) : 1,
  )));
  return {
    version: SAVE_VERSION,
    coins: Math.max(0, Number.isFinite(value.coins) ? Math.floor(value.coins) : 1000),
    highestLevel,
    availableLevel: highestLevel,
    completedLevels: value.completedLevels && typeof value.completedLevels === 'object' ? value.completedLevels : {},
    rewardReceipts: Array.isArray(value.rewardReceipts) ? value.rewardReceipts.slice(-50) : [],
    appearance: migrateLegacyDefaultCharacter(sanitizeAppearanceState(value.appearance), value.appearance?.equipped, value.version),
    playtime: sanitizePlaytime(value.playtime),
    audio: sanitizeAudio(value.audio),
    orders: sanitizeOrders(value.orders, value.pantry),
  };
}
