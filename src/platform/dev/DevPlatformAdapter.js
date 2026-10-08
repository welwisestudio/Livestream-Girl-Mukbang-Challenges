import { PlatformAdapter } from '../PlatformAdapter.js';
import { MockRewardedAd } from './MockRewardedAd.js';

// v2 intentionally starts a clean local development campaign after the designer's
// explicit reset request. The old v1 slot is left untouched but is no longer read.
const STORAGE_KEY = 'livestream-mukbang-dev-save-v2';

function initialAdMode() {
  try {
    return new URLSearchParams(globalThis.location?.search ?? '').get('ad') ?? 'interactive';
  } catch {
    return 'interactive';
  }
}

function initialResetRequested() {
  try {
    return new URLSearchParams(globalThis.location?.search ?? '').get('reset') === '1';
  } catch {
    return false;
  }
}

function consumeResetParameter() {
  try {
    const url = new URL(globalThis.location.href);
    url.searchParams.delete('reset');
    globalThis.history?.replaceState?.(null, '', `${url.pathname}${url.search}${url.hash}`);
  } catch {
    // Non-browser tests and restricted hosts do not need URL cleanup.
  }
}

// Explicitly selected development adapter (TEST MODE). Rewarded ads are simulated by
// MockRewardedAd; the real YouTube adapter replaces this whole class at integration.
export class DevPlatformAdapter extends PlatformAdapter {
  constructor({ storage = globalThis.localStorage, adMode = initialAdMode(), reset = initialResetRequested() } = {}) {
    super();
    this.storage = storage;
    this.reset = reset;
    this.listeners = new Set();
    this.rewardedAd = new MockRewardedAd(adMode);
  }

  async init() {
    if (this.reset) {
      this.clearDevelopmentSave();
      consumeResetParameter();
      this.reset = false;
    }
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
