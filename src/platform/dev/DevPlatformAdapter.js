import { PlatformAdapter } from '../PlatformAdapter.js';

const STORAGE_KEY = 'livestream-mukbang-dev-save-v1';

export class DevPlatformAdapter extends PlatformAdapter {
  constructor({ storage = globalThis.localStorage } = {}) {
    super();
    this.storage = storage;
    this.listeners = new Set();
  }

  async init() {
    return {
      capabilities: { cloudSave: false, rewarded: false, interstitial: false, score: false, hostLifecycle: false },
      audioMuted: false,
      paused: false,
      profile: 'development',
    };
  }

  async loadData() {
    return this.storage?.getItem(STORAGE_KEY) ?? '';
  }

  async saveData(serialized) {
    this.storage?.setItem(STORAGE_KEY, serialized);
    return { status: 'saved' };
  }

  async requestRewarded() {
    return { status: 'unavailable', reason: 'Level 1 checkpoint does not enable rewarded ads.' };
  }

  subscribe(listener) {
    this.listeners.add(listener);
    listener({ paused: false, audioMuted: false });
    return () => this.listeners.delete(listener);
  }

  clearDevelopmentSave() {
    this.storage?.removeItem(STORAGE_KEY);
  }
}
