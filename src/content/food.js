import { STORE_PRODUCTS } from './store.js';
import { CANTEEN_FOODS } from './canteen.js';

// Everything that can be bought and then eaten on stream, with the sprite used while eating.
export const FOOD_BY_ID = Object.freeze(Object.fromEntries([
  ...STORE_PRODUCTS.map((p) => [p.id, { id: p.id, label: p.label, price: p.price, texture: p.texture, source: 'store' }]),
  ...CANTEEN_FOODS.map((f) => [f.id, { id: f.id, label: f.label, price: f.price, texture: f.portion, source: 'canteen' }]),
]));

export const FOOD_ORDER_LIMIT = Object.freeze({ orders: 10, itemsPerOrder: 5 });
