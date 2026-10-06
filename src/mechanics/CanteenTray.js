import { CANTEEN_FOOD_BY_ID, CANTEEN_TRAY_SLOTS } from '../content/canteen.js';

// Pure tray rules: five compartments, one scoop each. A scoop into an empty compartment fills
// it, into a filled one replaces it; tapping a filled compartment with an empty spoon takes the
// food back out. Prices always come from the content table.
export class CanteenTray {
  constructor({ slots = CANTEEN_TRAY_SLOTS, foods = CANTEEN_FOOD_BY_ID } = {}) {
    this.foods = foods;
    this.slots = Array(slots).fill(null);
  }

  place(slot, foodId) {
    if (!this.foods[foodId]) return { status: 'unknown' };
    if (!(slot >= 0 && slot < this.slots.length)) return { status: 'bad-slot' };
    const previous = this.slots[slot];
    this.slots[slot] = foodId;
    return { status: previous ? (previous === foodId ? 'same' : 'replaced') : 'placed', previous };
  }

  remove(slot) {
    if (!this.slots[slot]) return { status: 'empty' };
    const food = this.slots[slot];
    this.slots[slot] = null;
    return { status: 'removed', food };
  }

  get count() { return this.slots.filter(Boolean).length; }
  get total() { return this.slots.reduce((sum, id) => sum + (id ? this.foods[id].price : 0), 0); }
  get full() { return this.count === this.slots.length; }
  firstEmpty() { return this.slots.findIndex((s) => !s); }
  // Meal handed to the payment step: one item per filled compartment, keeping its position.
  items() { return this.slots.flatMap((food, slot) => (food ? [{ food, slot }] : [])); }
  snapshot() { return { slots: [...this.slots], count: this.count, total: this.total }; }
}
