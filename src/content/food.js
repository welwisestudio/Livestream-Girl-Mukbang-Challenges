import { STORE_PRODUCTS } from './store.js';
import { CANTEEN_FOODS } from './canteen.js';

// Everything that can be bought and then eaten on stream, with the sprite used while eating.
export const FOOD_BY_ID = Object.freeze(Object.fromEntries([
  ...STORE_PRODUCTS.map((p) => [p.id, { id: p.id, label: p.label, price: p.price, texture: p.texture, source: 'store' }]),
  ...CANTEEN_FOODS.map((f) => [f.id, { id: f.id, label: f.label, price: f.price, texture: f.portion, source: 'canteen' }]),
]));

export const FOOD_ORDER_LIMIT = Object.freeze({ orders: 10, itemsPerOrder: 5 });

// Viewer donations during a food livestream, per order source. Each eaten item earns a fixed
// share of its price (rate picked deterministically per order item, so it can never be re-rolled),
// paid in one donation per bite plus a cheer when the item is finished. A source without an
// entry streams without donations. Tunable balance values (designer request 2026-10-12: buy →
// stream → viewers donate → earn the money back or a profit).
export const STREAM_DONATIONS = Object.freeze({
  store: Object.freeze({ minRate: 1.1, maxRate: 1.4, step: 5, shares: Object.freeze([0.3, 0.3, 0.4]) }),
});
