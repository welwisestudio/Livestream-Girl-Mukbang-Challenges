import {
  APPEARANCE_CATEGORIES,
  APPEARANCE_ITEM_BY_ID,
  sanitizeEquippedAppearance,
} from '../content/appearance.js';

export class AppearanceService {
  constructor(saveService) {
    this.saveService = saveService;
  }

  snapshot() {
    return structuredClone(this.saveService.state.appearance);
  }

  isOwned(itemId) {
    return this.saveService.state.appearance.owned.includes(itemId);
  }

  async purchase(itemId) {
    const item = APPEARANCE_ITEM_BY_ID[itemId];
    if (!item) throw new Error('Unknown appearance item');
    if (this.isOwned(itemId)) return { applied: false, state: this.saveService.snapshot() };
    if (item.price <= 0) throw new Error('This item should already be available');
    if (this.saveService.state.coins < item.price) throw new Error('Not enough coins');

    await this.saveService.mutate((state) => {
      if (state.appearance.owned.includes(itemId)) return;
      if (state.coins < item.price) throw new Error('Not enough coins');
      state.coins -= item.price;
      state.appearance.owned.push(itemId);
    });
    return { applied: true, state: this.saveService.snapshot() };
  }

  async equip(selection) {
    const equipped = sanitizeEquippedAppearance(selection);
    for (const category of APPEARANCE_CATEGORIES) {
      const itemId = equipped[category.id];
      if (!this.isOwned(itemId)) throw new Error('Buy this item before applying it');
    }
    await this.saveService.mutate((state) => { state.appearance.equipped = equipped; });
    return { applied: true, state: this.saveService.snapshot() };
  }
}
