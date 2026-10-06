import { APPEARANCE_ITEM_BY_ID } from '../content/appearance.js';
import {
  PLAYTIME_MAX_TICK_MS,
  PLAYTIME_PERSIST_EVERY_MS,
  PLAYTIME_REWARDS,
  PLAYTIME_TAKE_ALL_PLACEMENT,
} from '../content/playtime.js';

// Active-playtime reward track. The save is the single source of truth for minutes and
// claims; the in-memory buffer only holds play time not yet persisted (≤ 10 s).
export class PlaytimeService {
  constructor(saveService, platform = null) {
    this.saveService = saveService;
    this.platform = platform;
    this.pendingMs = 0;
    this.adInFlight = false;
    this.listeners = new Set();
  }

  activeMs() {
    return (this.saveService.state.playtime?.activeMs ?? 0) + this.pendingMs;
  }

  // Adds active play time. Callers pass only time while the game is visible, unpaused and
  // no ad is showing; each tick is capped.
  tick(deltaMs) {
    if (!(deltaMs > 0) || this.adInFlight) return;
    const before = this.status().claimable;
    this.pendingMs += Math.min(deltaMs, PLAYTIME_MAX_TICK_MS);
    if (this.pendingMs >= PLAYTIME_PERSIST_EVERY_MS) this.flush();
    if (this.status().claimable !== before) this.emit();
  }

  async flush() {
    if (this.pendingMs <= 0) return;
    const add = this.pendingMs;
    this.pendingMs = 0;
    await this.saveService.mutate((state) => { state.playtime.activeMs += add; });
  }

  status() {
    const ms = this.activeMs();
    const claimed = new Set(this.saveService.state.playtime?.claimed ?? []);
    const rewards = PLAYTIME_REWARDS.map((reward) => {
      const unlockMs = reward.minutes * 60_000;
      return {
        ...reward,
        claimed: claimed.has(reward.id),
        unlocked: ms >= unlockMs,
        msLeft: Math.max(0, unlockMs - ms),
      };
    });
    return {
      activeMs: ms,
      rewards,
      claimable: rewards.filter((r) => r.unlocked && !r.claimed).length,
      remaining: rewards.filter((r) => !r.claimed).length,
    };
  }

  // What a reward pays right now (an owned item converts to its price in coins).
  payout(reward, state = this.saveService.state) {
    if (reward.coins) return { coins: reward.coins, item: null };
    if (state.appearance.owned.includes(reward.item)) return { coins: APPEARANCE_ITEM_BY_ID[reward.item].price, item: null };
    return { coins: 0, item: reward.item };
  }

  async applyRewards(ids) {
    let coins = 0;
    const items = [];
    await this.saveService.mutate((state) => {
      state.playtime.activeMs += this.pendingMs;
      this.pendingMs = 0;
      for (const id of ids) {
        const reward = PLAYTIME_REWARDS.find((r) => r.id === id);
        if (!reward || state.playtime.claimed.includes(id)) continue;
        const payout = this.payout(reward, state);
        state.coins += payout.coins;
        coins += payout.coins;
        if (payout.item) { state.appearance.owned.push(payout.item); items.push(payout.item); }
        state.playtime.claimed.push(id);
      }
    });
    this.emit();
    return { coins, items, state: this.saveService.snapshot() };
  }

  async claim(id) {
    const reward = this.status().rewards.find((r) => r.id === id);
    if (!reward) throw new Error(`Unknown playtime reward ${id}`);
    if (reward.claimed) return { applied: false, status: 'already-claimed', state: this.saveService.snapshot() };
    if (!reward.unlocked) return { applied: false, status: 'locked', msLeft: reward.msLeft, state: this.saveService.snapshot() };
    if (this.adInFlight) return { applied: false, status: 'ad-in-progress', state: this.saveService.snapshot() };
    return { applied: true, status: 'granted', ...(await this.applyRewards([id])) };
  }

  // Rewarded "Take All": after an earned ad, every unclaimed reward is paid at once,
  // including ones whose minutes are not reached yet. Anything else pays nothing.
  async takeAllWithAd() {
    const remaining = this.status().rewards.filter((r) => !r.claimed).map((r) => r.id);
    if (!remaining.length) return { applied: false, status: 'nothing-left', state: this.saveService.snapshot() };
    if (this.adInFlight) return { applied: false, status: 'busy', state: this.saveService.snapshot() };
    if (!this.platform) return { applied: false, status: 'unavailable', state: this.saveService.snapshot() };
    this.adInFlight = true;
    let ad;
    try {
      ad = await this.platform.requestRewarded(PLAYTIME_TAKE_ALL_PLACEMENT);
    } catch (error) {
      ad = { status: 'error', reason: error?.message ?? String(error) };
    } finally {
      this.adInFlight = false;
    }
    if (ad?.status !== 'earned') return { applied: false, status: ad?.status ?? 'error', state: this.saveService.snapshot() };
    // Re-read: a single claim may have landed meanwhile; applyRewards skips claimed IDs.
    return { applied: true, status: 'granted', ...(await this.applyRewards(remaining)) };
  }

  subscribe(listener) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  emit() {
    const status = this.status();
    this.listeners.forEach((listener) => listener(status));
  }
}

// Drives the clock from wall time while the page is visible and the platform is not paused.
// `isAdShowing` covers every rewarded ad (level offer too): ad time is never play time.
export function startPlaytimeClock(playtime, platform, isAdShowing = () => false) {
  let paused = false;
  platform?.subscribe?.((s) => { paused = Boolean(s.paused); });
  let last = performance.now();
  const timer = setInterval(() => {
    const now = performance.now();
    const delta = now - last;
    last = now;
    const visible = typeof document === 'undefined' || document.visibilityState === 'visible';
    if (visible && !paused && !isAdShowing()) playtime.tick(delta);
  }, 1000);
  if (typeof document !== 'undefined') {
    document.addEventListener('visibilitychange', () => {
      last = performance.now();
      if (document.visibilityState === 'hidden') playtime.flush();
    });
  }
  return () => clearInterval(timer);
}
