import { PlatformAdapter } from '../PlatformAdapter.js';
import { MockRewardedAd } from './MockRewardedAd.js';

const STORAGE_KEY = 'livestream-mukbang-dev-save-v1';

function initialAdMode() {
  try {
    return new URLSearchParams(globalThis.location?.search ?? '').get('ad') ?? 'interactive';
  } catch {
    return 'interactive';
  }
}

// Explicitly selected development adapter (TEST MODE). Rewarded ads are simulated by
// MockRewardedAd; the real YouTube adapter replaces this whole class at integration.
export class DevPlatformAdapter extends PlatformAdapter {
  constructor({ storage = globalThis.localStorage, adMode = initialAdMode() } = {}) {
    super();
    this.storage = storage;
    this.listeners = new Set();
    this.rewardedAd = new MockRewardedAd(adMode);
  }

  async init() {
    return {
      capabilities: { cloudSave: false, rewarded: true, interstitial: false, score: false, hostLifecycle: false },
      audioMuted: false,
      paused: false,
      profile: 'development',
      testMode: true,
    };
  }

  async loadData() {
    return this.storage?.getItem(STORAGE_KEY) ?? '';
  }

  async saveData(serialized) {
    this.storage?.setItem(STORAGE_KEY, serialized);
    return { status: 'saved' };
  }

  async requestRewarded(placementId) {
    return this.rewardedAd.request(placementId);
  }

  setRewardedMode(mode) {
    this.rewardedAd.setMode(mode);
    return this.rewardedAd.mode;
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
