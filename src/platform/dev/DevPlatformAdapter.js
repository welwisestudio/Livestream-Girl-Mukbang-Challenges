import { PlatformAdapter } from '../PlatformAdapter.js';
import { MockRewardedAd } from './MockRewardedAd.js';
import { MockInterstitialAd } from './MockInterstitialAd.js';
import { CAMPAIGN_ORDER } from '../../content/levels.js';

// v2 intentionally starts a clean local development campaign after the designer's
// explicit reset request. The old v1 slot is left untouched but is no longer read.
const STORAGE_KEY = 'livestream-mukbang-dev-save-v2';

// Simulated cloud behaviour (`?save=<mode>` or `__GAME_DEBUG__.platform.setSaveMode(mode)`):
//   ok           – normal local test storage (default)
//   fail-load    – loadData rejects (the game must show Retry and write nothing)
//   fail-save    – saveData rejects (the save stays dirty and is retried)
export const DEV_SAVE_MODES = Object.freeze(['ok', 'fail-load', 'fail-save']);

function param(name) {
  try {
    return new URLSearchParams(globalThis.location?.search ?? '').get(name);
  } catch {
    return null;
  }
}

// Dev-only `?progress=N`: moves the local save to campaign Level N once (coins, wardrobe
// and other meta state are kept), then the parameter is removed from the address bar.
function initialProgressRequest() {
  const n = Number(param('progress'));
  return Number.isInteger(n) && n >= 1 && n <= CAMPAIGN_ORDER.length ? n : null;
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

// Explicitly selected development adapter (TEST MODE): same contract as the YouTube adapter,
// with local test storage, simulated ads and a simulated host. The browser tab plays the host:
// hiding the tab is a host pause. It is never part of the YouTube release build.
export class DevPlatformAdapter extends PlatformAdapter {
  constructor({
    storage = globalThis.localStorage,
    adMode = param('ad') ?? 'interactive',
    interstitialMode = param('interstitial') ?? 'shown',
    saveMode = param('save') ?? 'ok',
    reset = param('reset') === '1',
    progress = initialProgressRequest(),
    muted = param('mute') === '1',
    watchVisibility = typeof document !== 'undefined',
  } = {}) {
    super();
    this.storage = storage;
    this.reset = reset;
    this.progress = progress;
    this.watchVisibility = watchVisibility;
    this.rewardedAd = new MockRewardedAd(adMode);
    this.interstitialAd = new MockInterstitialAd(interstitialMode);
    this.setSaveMode(saveMode);
    this.hostState = { paused: false, audioMuted: muted };
    this.hostPauseReasons = new Set();
    this.events = []; // QA: lifecycle calls in order
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
    if (this.watchVisibility) {
      // Dev host only: a hidden tab is treated like a YouTube onPause / onResume pair.
      document.addEventListener('visibilitychange', () => this.setHostPaused('visibility', document.visibilityState !== 'visible'));
    }
    return {
      capabilities: { cloudSave: false, rewarded: true, interstitial: true, score: false, hostLifecycle: true },
      audioMuted: this.hostState.audioMuted,
      paused: this.hostState.paused,
      profile: 'development',
      testMode: true,
    };
  }

  notifyFirstFrame() { this.events.push('firstFrameReady'); }
  notifyGameReady() { this.events.push('gameReady'); }

  async loadData() {
    this.events.push('loadData');
    if (this.saveMode === 'fail-load') throw new Error('TEST: cloud load failed');
    return this.storage?.getItem(STORAGE_KEY) ?? '';
  }

  async saveData(serialized) {
    this.events.push('saveData');
    if (this.saveMode === 'fail-save') throw new Error('TEST: cloud save failed');
    this.storage?.setItem(STORAGE_KEY, serialized);
    return { status: 'saved' };
  }

  async requestRewarded(placementId) {
    this.events.push(`rewarded:${placementId}`);
    const result = await this.rewardedAd.request(placementId);
    await this.whenResumed();
    return result;
  }

  async requestInterstitial() {
    this.events.push('interstitial');
    const result = await this.interstitialAd.request();
    await this.whenResumed();
    return result;
  }

  // ---- simulated host controls (debug hooks and tests)
  setRewardedMode(mode) {
    this.rewardedAd.setMode(mode);
    return this.rewardedAd.mode;
  }

  setInterstitialMode(mode) {
    this.interstitialAd.setMode(mode);
    return this.interstitialAd.mode;
  }

  setSaveMode(mode) {
    this.saveMode = DEV_SAVE_MODES.includes(mode) ? mode : 'ok';
    return this.saveMode;
  }

  // Host pause has independent reasons (tab hidden, QA "YouTube pause"); resume clears one.
  setHostPaused(reason, value) {
    if (value) this.hostPauseReasons.add(reason);
    else this.hostPauseReasons.delete(reason);
    this.events.push(value ? `pause:${reason}` : `resume:${reason}`);
    this.setHostState({ paused: this.hostPauseReasons.size > 0 });
    return this.hostState;
  }

  setHostMuted(value) {
    this.setHostState({ audioMuted: Boolean(value) });
    return this.hostState;
  }

  readDevelopmentSave() {
    return this.storage?.getItem(STORAGE_KEY) ?? '';
  }

  writeDevelopmentSave(serialized) {
    this.storage?.setItem(STORAGE_KEY, serialized);
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
