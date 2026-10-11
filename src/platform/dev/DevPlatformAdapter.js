import { PlatformAdapter } from '../PlatformAdapter.js';
import { MockRewardedAd } from './MockRewardedAd.js';
import { CAMPAIGN_ORDER } from '../../content/levels.js';

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

// Dev-only `?progress=N`: moves the local save to campaign Level N once (coins, wardrobe
// and other meta state are kept), then the parameter is removed from the address bar.
function initialProgressRequest() {
  try {
    const n = Number(new URLSearchParams(globalThis.location?.search ?? '').get('progress'));
    return Number.isInteger(n) && n >= 1 && n <= CAMPAIGN_ORDER.length ? n : null;
  } catch {
    return null;
  }
}

function consumeParameter(name) {
  try {
    const url = new URL(globalThis.location.href);
    url.searchParams.delete(name);
    globalThis.history?.replaceState?.(null, '', `${url.pathname}${url.search}${url.hash}`);
  } catch {
    // Non-browser tests and restricted hosts do not need URL cleanup.
  }
}

// Explicitly selected development adapter (TEST MODE). Rewarded ads are simulated by
// MockRewardedAd; the real YouTube adapter replaces this whole class at integration.
export class DevPlatformAdapter extends PlatformAdapter {
  constructor({ storage = globalThis.localStorage, adMode = initialAdMode(), reset = initialResetRequested(), progress = initialProgressRequest() } = {}) {
    super();
    this.storage = storage;
    this.reset = reset;
    this.progress = progress;
    this.listeners = new Set();
    this.rewardedAd = new MockRewardedAd(adMode);
  }

  async init() {
    if (this.reset) {
      this.clearDevelopmentSave();
      consumeParameter('reset');
      this.reset = false;
    }
    if (this.progress) {
      this.setDevelopmentProgress(this.progress);
      consumeParameter('progress');
      this.progress = null;
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

  // Levels before N count as completed once; N is the open, selected level.
  setDevelopmentProgress(n) {
    let save = {};
    try { save = JSON.parse(this.storage?.getItem(STORAGE_KEY) || '{}') ?? {}; } catch { save = {}; }
    const completed = {};
    for (const id of CAMPAIGN_ORDER.slice(0, n - 1)) completed[id] = Math.max(1, save.completedLevels?.[id] ?? 0);
    const next = { version: 10, coins: 1000, ...save, highestLevel: n, availableLevel: n, completedLevels: completed };
    this.storage?.setItem(STORAGE_KEY, JSON.stringify(next));
  }
}
