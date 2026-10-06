import { STORE_CONFIG, STORE_PRODUCT_BY_ID } from '../content/store.js';

// Pure basket rules: each shelf facing (slot) is one unit; tapping it moves the unit into the
// basket, tapping it again (on the shelf or in the basket) puts it back. Prices always come
// from the content table, never from the UI.
export class StoreBasket {
  constructor({ capacity = STORE_CONFIG.basketCapacity, products = STORE_PRODUCT_BY_ID } = {}) {
    this.capacity = capacity;
    this.products = products;
    this.items = []; // [{ slot, productId }] in pick order
  }

  has(slot) { return this.items.some((item) => item.slot === slot); }

  add(slot, productId) {
    if (!this.products[productId]) return { status: 'unknown' };
    if (this.has(slot)) return { status: 'already' };
    if (this.items.length >= this.capacity) return { status: 'full' };
    this.items.push({ slot, productId });
    return { status: 'added' };
  }

  remove(slot) {
    const i = this.items.findIndex((item) => item.slot === slot);
    if (i < 0) return { status: 'missing' };
    this.items.splice(i, 1);
    return { status: 'removed' };
  }

  // Shelf tap: toggles the unit.
  toggle(slot, productId) {
    return this.has(slot) ? this.remove(slot) : this.add(slot, productId);
  }

  clear() { this.items = []; }

  get count() { return this.items.length; }
  get total() { return this.items.reduce((sum, item) => sum + this.products[item.productId].price, 0); }
  productIds() { return this.items.map((item) => item.productId); }
  snapshot() { return { count: this.count, capacity: this.capacity, total: this.total, items: this.items.map((i) => ({ ...i })) }; }
}

export function priceOf(productIds, products = STORE_PRODUCT_BY_ID) {
  return productIds.reduce((sum, id) => {
    const product = products[id];
    if (!product) throw new Error(`Unknown store product: ${id}`);
    return sum + product.price;
  }, 0);
}
