import { INTERSTITIAL_POLICY } from '../content/ads.js';

// One gate for every ad: only one request at a time (rewarded or interstitial), audio is
// paused for its duration, and the interstitial policy is applied centrally.
// Rewarded results pass through unchanged — granting is the reward services' job and happens
// only on `earned`. Interstitials never grant anything.
export class AdService {
  constructor({ platform, audio = null, capabilities = {}, policy = INTERSTITIAL_POLICY, now = () => Date.now() }) {
    this.platform = platform;
    this.audio = audio;
    this.capabilities = capabilities;
    this.policy = policy;
    this.now = now;
    this.sessionStart = now();
    this.inFlight = null;
    this.lastRewardedAt = -Infinity;
    this.lastInterstitialRequestCompleted = -Infinity;
    this.log = [];
  }

  get busy() { return Boolean(this.inFlight); }

  async requestRewarded(placementId) {
    if (this.inFlight) return { status: 'error', reason: 'Another ad is in progress' };
    if (this.capabilities.rewarded === false) return { status: 'unavailable', reason: 'Rewarded ads are not available here' };
    this.inFlight = `rewarded:${placementId}`;
    this.audio?.setPaused('ad', true);
    let result;
    try {
      result = await this.platform.requestRewarded(placementId);
    } catch (error) {
      result = { status: 'error', reason: error?.message ?? String(error) };
    } finally {
      this.inFlight = null;
      this.audio?.setPaused('ad', false);
    }
    if (!result || typeof result.status !== 'string') result = { status: 'error', reason: 'No result' };
    this.lastRewardedAt = this.now();
    this.log.push({ type: 'rewarded', placementId, status: result.status });
    return result;
  }

  // Why an interstitial may not be requested now (null = eligible).
  interstitialBlock(placement, { lifecyclePaused = false } = {}) {
    const p = this.policy;
    const t = this.now();
    if (!p.enabled) return 'disabled';
    if (!this.capabilities.interstitial) return 'unsupported';
    if (!p.placements.includes(placement)) return 'not-a-break';
    if (this.inFlight) return 'busy';
    if (lifecyclePaused) return 'paused';
    if (t - this.sessionStart < p.sessionGraceMs) return 'session-grace';
    if (t - this.lastInterstitialRequestCompleted < p.minIntervalMs) return 'interval';
    if (t - this.lastRewardedAt < p.afterRewardedMs) return 'after-rewarded';
    return null;
  }

  // Called by scenes at a natural break, before they move on. Always resolves (the game
  // continues whatever happens); the cooldown starts only after a completed request.
  async interstitialBreak(placement, options = {}) {
    const blocked = this.interstitialBlock(placement, options);
    if (blocked) {
      this.log.push({ type: 'interstitial', placement, status: 'skipped', reason: blocked });
      return { status: 'skipped', reason: blocked };
    }
    this.inFlight = `interstitial:${placement}`;
    this.audio?.setPaused('ad', true);
    let result;
    try {
      result = await this.platform.requestInterstitial();
    } catch (error) {
      result = { status: 'error', reason: error?.message ?? String(error) };
    } finally {
      this.inFlight = null;
      this.audio?.setPaused('ad', false);
    }
    if (result?.status === 'request-completed') this.lastInterstitialRequestCompleted = this.now();
    this.log.push({ type: 'interstitial', placement, status: result?.status ?? 'error' });
    return result ?? { status: 'error' };
  }

  snapshot() {
    return {
      busy: this.busy,
      inFlight: this.inFlight,
      interstitialEnabled: this.policy.enabled,
      lastInterstitialRequestCompleted: Number.isFinite(this.lastInterstitialRequestCompleted) ? this.lastInterstitialRequestCompleted : null,
      log: this.log.slice(-20),
    };
  }
}
