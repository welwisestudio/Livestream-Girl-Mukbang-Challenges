import { FREE_COINS_AD, LEVEL_SELECT_AD_PLACEMENT, MAX_REWARD_MULTIPLIER } from '../content/economy.js';
import { CAMPAIGN_LENGTH, CAMPAIGN_ORDER } from '../content/levels.js';
import {
  APPEARANCE_ITEM_BY_ID,
  APPEARANCE_REWARDED_PLACEMENT,
  isRewardedAppearanceItem,
} from '../content/appearance.js';

const FINAL_CAMPAIGN_LEVEL_ID = CAMPAIGN_ORDER.at(-1);

export class RewardService {
  constructor(saveService, platform = null, audio = null) {
    this.saveService = saveService;
    this.platform = platform;
    this.audio = audio;
    // runId of the level completion whose rewarded ad is currently showing.
    this.adInFlight = null;
  }

  // One level completion = one receipt. Whichever claim (base or rewarded) lands first
  // wins; every later attempt for the same run is a no-op.
  async grantLevelCompletion({ levelId, runId, coins, unlockLevel, multiplier = 1 }) {
    const receiptId = `level-complete:${runId}`;
    if (this.saveService.hasReceipt(receiptId)) {
      // Already granted. If the earlier write failed, persist it now (never grant twice).
      if (this.saveService.dirty) await this.saveService.enqueueSave();
      return { applied: false, receiptId, coins: 0, state: this.saveService.snapshot() };
    }
    if (!Number.isInteger(multiplier) || multiplier < 1 || multiplier > MAX_REWARD_MULTIPLIER) {
      throw new Error(`Invalid reward multiplier: ${multiplier}`);
    }
    if (!Number.isInteger(coins) || coins < 0) throw new Error(`Invalid base reward: ${coins}`);
    const granted = coins * multiplier;

    await this.saveService.mutate((state) => {
      state.coins += granted;
      // Completing a level opens the next one for free (no paid unlock step).
      state.availableLevel = Math.max(state.availableLevel, Math.min(CAMPAIGN_LENGTH, unlockLevel));
      state.highestLevel = state.availableLevel;
      state.completedLevels[levelId] = (state.completedLevels[levelId] ?? 0) + 1;
      state.rewardReceipts.push(receiptId);
      state.rewardReceipts = state.rewardReceipts.slice(-50);
      // The standard campaign is a loop. Finishing Level 50 starts a clean recipe
      // progression at Level 1, while coins, appearance and all meta purchases stay.
      if (levelId === FINAL_CAMPAIGN_LEVEL_ID) {
        state.highestLevel = 1;
        state.availableLevel = 1;
        state.completedLevels = {};
      }
    });

    return { applied: true, receiptId, coins: granted, multiplier, state: this.saveService.snapshot() };
  }

  // Base reward without an ad. Refused while this run's rewarded ad is still open, so the
  // two claims can never both be paid.
  async claimLevelBase({ levelId, runId, baseCoins, unlockLevel }) {
    if (this.adInFlight === runId) return { applied: false, status: 'ad-in-progress', state: this.saveService.snapshot() };
    const result = await this.grantLevelCompletion({ levelId, runId, coins: baseCoins, unlockLevel, multiplier: 1 });
    return { ...result, status: result.applied ? 'granted' : 'already-claimed' };
  }

  // Rewarded claim: base × the multiplier locked by the caller, paid ONLY when the platform
  // confirms `earned`. not-earned / unavailable / error grant nothing and leave the run
  // claimable (retry or base reward).
  async claimLevelWithAd({ levelId, runId, baseCoins, multiplier, unlockLevel, placementId }) {
    const receiptId = `level-complete:${runId}`;
    if (this.saveService.hasReceipt(receiptId)) return { applied: false, status: 'already-claimed', state: this.saveService.snapshot() };
    if (this.adInFlight) return { applied: false, status: 'busy', state: this.saveService.snapshot() };
    if (!this.platform) return { applied: false, status: 'unavailable', state: this.saveService.snapshot() };

    this.adInFlight = runId;
    this.audio?.setPaused('ad', true);
    let ad;
    try {
      ad = await this.platform.requestRewarded(placementId);
    } catch (error) {
      ad = { status: 'error', reason: error?.message ?? String(error) };
    } finally {
      this.adInFlight = null;
      this.audio?.setPaused('ad', false);
    }
    if (ad?.status !== 'earned') return { applied: false, status: ad?.status ?? 'error', reason: ad?.reason, state: this.saveService.snapshot() };

    const result = await this.grantLevelCompletion({ levelId, runId, coins: baseCoins, unlockLevel, multiplier });
    return { ...result, status: result.applied ? 'granted' : 'already-claimed' };
  }

  // Level select: playing any level other than the next one in order needs an earned rewarded
  // ad. Nothing is written to the save; the caller starts the level only on `earned`.
  async requestLevelPlayAd(levelId) {
    if (this.adInFlight) return { status: 'busy' };
    if (!this.platform) return { status: 'unavailable' };
    this.adInFlight = `level-select:${levelId}`;
    this.audio?.setPaused('ad', true);
    try {
      const ad = await this.platform.requestRewarded(LEVEL_SELECT_AD_PLACEMENT);
      return { status: ad?.status ?? 'error', reason: ad?.reason };
    } catch (error) {
      return { status: 'error', reason: error?.message ?? String(error) };
    } finally {
      this.adInFlight = null;
      this.audio?.setPaused('ad', false);
    }
  }

  // Lobby free coins: FREE_COINS_AD.coins, paid ONLY when the platform confirms `earned`.
  // not-earned / unavailable / error grant nothing. claimId is one popup opening, so a
  // retried or repeated claim of the same opening can never pay twice.
  async claimFreeCoinsWithAd({ claimId }) {
    const receiptId = `free-coins:${claimId}`;
    if (this.saveService.hasReceipt(receiptId)) return { applied: false, status: 'already-claimed', state: this.saveService.snapshot() };
    if (this.adInFlight) return { applied: false, status: 'busy', state: this.saveService.snapshot() };
    if (!this.platform) return { applied: false, status: 'unavailable', state: this.saveService.snapshot() };
    this.adInFlight = receiptId;
    this.audio?.setPaused('ad', true);
    let ad;
    try {
      ad = await this.platform.requestRewarded(FREE_COINS_AD.placementId);
    } catch (error) {
      ad = { status: 'error', reason: error?.message ?? String(error) };
    } finally {
      this.adInFlight = null;
      this.audio?.setPaused('ad', false);
    }
    if (ad?.status !== 'earned') return { applied: false, status: ad?.status ?? 'error', reason: ad?.reason, state: this.saveService.snapshot() };
    if (this.saveService.hasReceipt(receiptId)) return { applied: false, status: 'already-claimed', state: this.saveService.snapshot() };
    const coins = FREE_COINS_AD.coins;
    await this.saveService.mutate((state) => {
      state.coins += coins;
      state.rewardReceipts.push(receiptId);
      state.rewardReceipts = state.rewardReceipts.slice(-50);
    });
    return { applied: true, status: 'granted', coins, receiptId, state: this.saveService.snapshot() };
  }

  // Customization: every third item in a category is a permanent rewarded unlock, and a
  // coin item the player cannot afford may be unlocked with an ad instead of coins.
  // Coins never participate; only an earned callback may add the item to owned.
  async unlockAppearanceWithAd(itemId) {
    const item = APPEARANCE_ITEM_BY_ID[itemId];
    const adEligible = item && (isRewardedAppearanceItem(itemId)
      || (item.price > 0 && this.saveService.state.coins < item.price));
    if (!adEligible) {
      return { applied: false, status: 'invalid-item', state: this.saveService.snapshot() };
    }
    if (this.saveService.state.appearance.owned.includes(itemId)) {
      return { applied: false, status: 'already-unlocked', state: this.saveService.snapshot() };
    }
    if (this.adInFlight) return { applied: false, status: 'busy', state: this.saveService.snapshot() };
    if (!this.platform) return { applied: false, status: 'unavailable', state: this.saveService.snapshot() };

    this.adInFlight = `appearance:${itemId}`;
    this.audio?.setPaused('ad', true);
    let ad;
    try {
      ad = await this.platform.requestRewarded(APPEARANCE_REWARDED_PLACEMENT);
    } catch (error) {
      ad = { status: 'error', reason: error?.message ?? String(error) };
    } finally {
      this.adInFlight = null;
      this.audio?.setPaused('ad', false);
    }
    if (ad?.status !== 'earned') {
      return { applied: false, status: ad?.status ?? 'error', reason: ad?.reason, state: this.saveService.snapshot() };
    }

    const receiptId = `appearance-rewarded:${itemId}`;
    if (this.saveService.hasReceipt(receiptId) || this.saveService.state.appearance.owned.includes(itemId)) {
      return { applied: false, status: 'already-unlocked', state: this.saveService.snapshot() };
    }
    await this.saveService.mutate((state) => {
      if (!state.appearance.owned.includes(itemId)) state.appearance.owned.push(itemId);
      if (!state.rewardReceipts.includes(receiptId)) state.rewardReceipts.push(receiptId);
      state.rewardReceipts = state.rewardReceipts.slice(-50);
    });
    return { applied: true, status: 'granted', itemId, receiptId, state: this.saveService.snapshot() };
  }

  // Part Time Job: each served customer pays at once, one receipt per customer of a run;
  // a repeated payment for the same customer pays nothing.
  async grantPartTimeCustomer({ runId, index, coins }) {
    if (!Number.isInteger(index) || index < 0) throw new Error(`Invalid part-time customer: ${index}`);
    const receiptId = `part-time:${runId}:${index}`;
    if (this.saveService.hasReceipt(receiptId)) {
      if (this.saveService.dirty) await this.saveService.enqueueSave();
      return { applied: false, receiptId, coins: 0, state: this.saveService.snapshot() };
    }
    if (!Number.isInteger(coins) || coins < 0) throw new Error(`Invalid part-time reward: ${coins}`);
    await this.saveService.mutate((state) => {
      state.coins += coins;
      state.rewardReceipts.push(receiptId);
      state.rewardReceipts = state.rewardReceipts.slice(-50);
    });
    return { applied: true, receiptId, coins, state: this.saveService.snapshot() };
  }
}
