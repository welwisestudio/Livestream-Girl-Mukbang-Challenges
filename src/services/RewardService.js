export class RewardService {
  constructor(saveService) {
    this.saveService = saveService;
  }

  async grantLevelCompletion({ levelId, runId, coins, unlockLevel }) {
    const receiptId = `level-complete:${runId}`;
    if (this.saveService.hasReceipt(receiptId)) {
      return { applied: false, receiptId, state: this.saveService.snapshot() };
    }

    await this.saveService.mutate((state) => {
      state.coins += coins;
      state.highestLevel = Math.max(state.highestLevel, unlockLevel);
      state.completedLevels[levelId] = (state.completedLevels[levelId] ?? 0) + 1;
      state.rewardReceipts.push(receiptId);
      state.rewardReceipts = state.rewardReceipts.slice(-50);
    });

    return { applied: true, receiptId, state: this.saveService.snapshot() };
  }
}
