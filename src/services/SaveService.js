const SAVE_VERSION = 2;

export function createDefaultSave() {
  return {
    version: SAVE_VERSION,
    coins: 1000,
    highestLevel: 1,
    availableLevel: 1,
    completedLevels: {},
    rewardReceipts: [],
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
    if (!value || ![1, SAVE_VERSION].includes(value.version)) return createDefaultSave();
    const highestLevel = Math.max(1, Math.min(5, Number.isFinite(value.highestLevel) ? Math.floor(value.highestLevel) : 1));
    return {
      version: SAVE_VERSION,
      coins: Math.max(0, Number.isFinite(value.coins) ? Math.floor(value.coins) : 1000),
      highestLevel,
      availableLevel: Math.max(highestLevel, Math.min(5, Number.isFinite(value.availableLevel) ? Math.floor(value.availableLevel) : highestLevel)),
      completedLevels: value.completedLevels && typeof value.completedLevels === 'object' ? value.completedLevels : {},
      rewardReceipts: Array.isArray(value.rewardReceipts) ? value.rewardReceipts.slice(-50) : [],
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
