export class RewardService {
  constructor(saveService) {
    this.saveService = saveService;
  }

  async grantLevelCompletion({ levelId, runId, coins, unlockLevel }) {
    const receiptId = `level-complete:${runId}`;
    if (this.saveService.hasReceipt(receiptId)) {
      // Already granted. If the earlier write failed, persist it now (never grant twice).
      if (this.saveService.dirty) await this.saveService.enqueueSave();
      return { applied: false, receiptId, state: this.saveService.snapshot() };
    }

    await this.saveService.mutate((state) => {
      state.coins += coins;
      state.availableLevel = Math.max(state.availableLevel, Math.min(5, unlockLevel));
      state.completedLevels[levelId] = (state.completedLevels[levelId] ?? 0) + 1;
      state.rewardReceipts.push(receiptId);
      state.rewardReceipts = state.rewardReceipts.slice(-50);
    });

    return { applied: true, receiptId, state: this.saveService.snapshot() };
  }

  async unlockLevel({ levelId, levelNumber, price }) {
    if (levelNumber <= this.saveService.state.highestLevel) return { applied: false, state: this.saveService.snapshot() };
    if (levelNumber > this.saveService.state.availableLevel) throw new Error('Complete the previous level first');
    if (this.saveService.state.coins < price) throw new Error('Not enough coins');
    await this.saveService.mutate((state) => {
      if (levelNumber <= state.highestLevel) return;
      state.coins -= price;
      state.highestLevel = levelNumber;
      state.completedLevels[levelId] ??= 0;
    });
    return { applied: true, state: this.saveService.snapshot() };
  }
}
