import { FOOD_BY_ID, FOOD_ORDER_LIMIT } from '../content/food.js';

// Bought-but-not-yet-eaten food, shared by the Supermarket and the Canteen.
// purchase() is one atomic save mutation: coins −total, a new order with its items, receipt
// <source>:<orderId>. A repeated tap or retry can never charge twice. The eating stream reads
// one order and removes each item only after it has been eaten; an emptied order disappears.
//
// Order: { id, source: 'store' | 'canteen', items: [{ key, food, slot }] }

export function totalOf(items) {
  return items.reduce((sum, item) => {
    const food = FOOD_BY_ID[item.food];
    if (!food) throw new Error(`Unknown food: ${item.food}`);
    return sum + food.price;
  }, 0);
}

export class FoodOrderService {
  constructor(saveService) {
    this.saveService = saveService;
  }

  orders() { return structuredClone(this.saveService.state.orders); }
  find(orderId) { return this.orders().find((o) => o.id === orderId) ?? null; }

  async purchase({ orderId, source, items }) {
    const receiptId = `${source}:${orderId}`;
    const state = this.saveService.state;
    if (this.saveService.hasReceipt(receiptId)) return { status: 'already-paid', state: this.saveService.snapshot() };
    if (!Array.isArray(items) || items.length === 0) return { status: 'empty', state: this.saveService.snapshot() };
    if (items.length > FOOD_ORDER_LIMIT.itemsPerOrder) return { status: 'too-many', state: this.saveService.snapshot() };
    const total = totalOf(items);
    if (state.coins < total) return { status: 'insufficient', total, coins: state.coins, missing: total - state.coins, state: this.saveService.snapshot() };
    if (state.orders.length >= FOOD_ORDER_LIMIT.orders) return { status: 'too-many-orders', state: this.saveService.snapshot() };
    const order = {
      id: orderId,
      source,
      items: items.map((item, i) => ({ key: String(i), food: item.food, slot: Number.isInteger(item.slot) ? item.slot : null })),
    };
    await this.saveService.mutate((s) => {
      s.coins -= total;
      s.orders.push(order);
      s.rewardReceipts.push(receiptId);
      s.rewardReceipts = s.rewardReceipts.slice(-50);
    });
    return { status: 'paid', total, order: structuredClone(order), state: this.saveService.snapshot() };
  }

  // Called once per item after the streamer has finished eating it.
  async consume(orderId, key) {
    const order = this.saveService.state.orders.find((o) => o.id === orderId);
    if (!order || !order.items.some((i) => i.key === key)) return { applied: false, state: this.saveService.snapshot() };
    await this.saveService.mutate((s) => {
      const o = s.orders.find((x) => x.id === orderId);
      o.items = o.items.filter((i) => i.key !== key);
      if (!o.items.length) s.orders = s.orders.filter((x) => x.id !== orderId);
    });
    return { applied: true, state: this.saveService.snapshot() };
  }
}

// Save sanitizer (v9). v8 stored store snacks as a flat `pantry` list; it becomes one order.
export function sanitizeOrders(value, legacyPantry) {
  const orders = Array.isArray(value) ? value : [];
  const clean = orders
    .filter((o) => o && typeof o.id === 'string' && ['store', 'canteen'].includes(o.source) && Array.isArray(o.items))
    .map((o) => ({
      id: o.id,
      source: o.source,
      items: o.items
        .filter((i) => i && FOOD_BY_ID[i.food])
        .slice(0, FOOD_ORDER_LIMIT.itemsPerOrder)
        .map((i, n) => ({ key: typeof i.key === 'string' ? i.key : String(n), food: i.food, slot: Number.isInteger(i.slot) ? i.slot : null })),
    }))
    .filter((o) => o.items.length);
  if (Array.isArray(legacyPantry)) {
    const foods = legacyPantry.filter((id) => FOOD_BY_ID[id]?.source === 'store');
    for (let i = 0; i < foods.length; i += FOOD_ORDER_LIMIT.itemsPerOrder) {
      clean.push({ id: `pantry-${i}`, source: 'store', items: foods.slice(i, i + FOOD_ORDER_LIMIT.itemsPerOrder).map((food, n) => ({ key: String(n), food, slot: null })) });
    }
  }
  return clean.slice(0, FOOD_ORDER_LIMIT.orders);
}
