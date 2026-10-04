const SAVE_VERSION = 1;

export function createDefaultSave() {
  return {
    version: SAVE_VERSION,
    coins: 1000,
    highestLevel: 1,
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
    if (!value || value.version !== SAVE_VERSION) return createDefaultSave();
    return {
      version: SAVE_VERSION,
      coins: Math.max(0, Number.isFinite(value.coins) ? Math.floor(value.coins) : 1000),
      highestLevel: Math.max(1, Number.isFinite(value.highestLevel) ? Math.floor(value.highestLevel) : 1),
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
