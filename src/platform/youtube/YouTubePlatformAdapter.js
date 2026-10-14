import { PlatformAdapter } from '../PlatformAdapter.js';

// YouTube Playables adapter: the only module that knows `ytgame`
// (SDK reference: https://developers.google.com/youtube/gaming/playables/reference/sdk,
// checked 2026-10-14). The SDK is loaded by index.html before any game code; it is a global
// lexical binding that is not guaranteed to be a property of `window`, so it is read through
// `typeof ytgame`. Release profile: cloud save only, host lifecycle, real ads only — a failing
// SDK call is reported as a failure, never replaced by a mock or by browser storage.

const LOAD_TIMEOUT_MS = 15000;

function findSdk() {
  // eslint-disable-next-line no-undef
  return typeof ytgame !== 'undefined' ? ytgame : null;
}

function errorType(error) {
  return error?.errorType ?? error?.name ?? 'UNKNOWN';
}

function withTimeout(promise, ms, label) {
  let timer;
  return Promise.race([
    promise,
    new Promise((_, reject) => { timer = setTimeout(() => reject(new Error(`${label} timed out after ${ms} ms`)), ms); }),
  ]).finally(() => clearTimeout(timer));
}

export class YouTubePlatformAdapter extends PlatformAdapter {
  constructor({ sdk = findSdk(), loadTimeoutMs = LOAD_TIMEOUT_MS } = {}) {
    super();
    this.sdk = sdk;
    this.loadTimeoutMs = loadTimeoutMs;
    this.unsubscribers = [];
    this.adBusy = false;
  }

  get available() { return Boolean(this.sdk); }
  // Outside YouTube the SDK runs as a no-op; its ad promises never settle there.
  get inPlayables() { return Boolean(this.sdk?.IN_PLAYABLES_ENV); }

  async init() {
    if (!this.sdk) throw new Error('YouTube Playables SDK is not loaded');
    const system = this.sdk.system;
    this.hostState = { paused: false, audioMuted: !system.isAudioEnabled() };
    this.unsubscribers.push(
      system.onAudioEnabledChange((enabled) => this.setHostState({ audioMuted: !enabled })),
      system.onPause(() => this.setHostState({ paused: true })),
      system.onResume(() => this.setHostState({ paused: false })),
    );
    return {
      capabilities: { cloudSave: true, rewarded: this.inPlayables, interstitial: this.inPlayables, score: false, hostLifecycle: true },
      audioMuted: this.hostState.audioMuted,
      paused: false,
      profile: 'youtube',
      testMode: false,
      sdkVersion: this.sdk.SDK_VERSION ?? null,
      inPlayablesEnv: this.inPlayables,
    };
  }

  notifyFirstFrame() { this.sdk?.game.firstFrameReady(); }
  notifyGameReady() { this.sdk?.game.gameReady(); }

  // The SDK contract is a string. Anything else is a failed load, not an empty save.
  async loadData() {
    const data = await withTimeout(this.sdk.game.loadData(), this.loadTimeoutMs, 'loadData');
    if (typeof data !== 'string') throw new Error(`loadData returned ${data === null ? 'null' : typeof data}, expected a string`);
    return data;
  }

  async saveData(serialized) {
    await this.sdk.game.saveData(serialized);
    return { status: 'saved' };
  }

  // true → earned; false → not-earned; API_UNAVAILABLE → unavailable; any other reject → error.
  // A result that arrives during a host pause is returned only after the host resumes.
  async requestRewarded(placementId) {
    if (!this.inPlayables) return { status: 'unavailable', reason: 'Not running inside YouTube Playables' };
    if (this.adBusy) return { status: 'error', reason: 'Another ad request is in progress' };
    this.adBusy = true;
    let result;
    try {
      const earned = await this.sdk.ads.requestRewardedAd(placementId);
      result = earned === true ? { status: 'earned' } : { status: 'not-earned' };
    } catch (error) {
      result = errorType(error) === 'API_UNAVAILABLE'
        ? { status: 'unavailable', reason: error?.message }
        : { status: 'error', reason: error?.message ?? String(error) };
    } finally {
      this.adBusy = false;
    }
    await this.whenResumed();
    return result;
  }

  // Resolves when the request completed; the SDK does not say whether an ad was shown.
  async requestInterstitial() {
    if (!this.inPlayables) return { status: 'unavailable', reason: 'Not running inside YouTube Playables' };
    if (this.adBusy) return { status: 'error', reason: 'Another ad request is in progress' };
    this.adBusy = true;
    let result;
    try {
      await this.sdk.ads.requestInterstitialAd();
      result = { status: 'request-completed' };
    } catch (error) {
      result = errorType(error) === 'API_UNAVAILABLE'
        ? { status: 'unavailable', reason: error?.message }
        : { status: 'error', reason: error?.message ?? String(error) };
    } finally {
      this.adBusy = false;
    }
    await this.whenResumed();
    return result;
  }

  // Score is deferred (no agreed metric): capabilities.score is false and the call refuses.
  async sendScore() { throw new Error('High score is not integrated for this game'); }

  getLanguage() { return this.sdk.system.getLanguage(); }

  // health.logWarning()/logError() take no arguments, are rate-limited and best effort.
  reportWarning() { try { this.sdk?.health?.logWarning(); } catch { /* best effort */ } }
  reportError() { try { this.sdk?.health?.logError(); } catch { /* best effort */ } }

  dispose() {
    for (const off of this.unsubscribers.splice(0)) { try { off?.(); } catch { /* ignore */ } }
    super.dispose();
  }
}
