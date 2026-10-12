import { FOOD_BY_ID, FOOD_ORDER_LIMIT, STREAM_DONATIONS } from '../content/food.js';

// Bought-but-not-yet-eaten food, shared by the Supermarket and the Canteen.
// purchase() is one atomic save mutation: coins −total, a new order with its items, receipt
// <source>:<orderId>. A repeated tap or retry can never charge twice. The eating stream reads
// one order and removes each item only after it has been eaten; an emptied order disappears.
//
// Order: { id, source: 'store' | 'canteen', cost, earned, items: [{ key, food, slot, donated }] }
//
// Viewer donations (STREAM_DONATIONS): when the streamer starts eating an item, startServing()
// records that item's whole donation once (item.donated, order.earned) before the scene animates
// it. The consume() call that empties the order pays order.earned into coins in the same
// mutation, guarded by the receipt stream:<orderId>, so a donation total is paid exactly once.
// An order left half-eaten keeps its earned coins until it is finished.

export function totalOf(items) {
  return items.reduce((sum, item) => {
    const food = FOOD_BY_ID[item.food];
    if (!food) throw new Error(`Unknown food: ${item.food}`);
    return sum + food.price;
  }, 0);
}

// Deterministic 0..1 value per order item (FNV-1a), so a donation can never be re-rolled.
function unitHash(text) {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i += 1) { h ^= text.charCodeAt(i); h = Math.imul(h, 0x01000193); }
  return (h >>> 0) / 0x100000000;
}

// The donations an item earns: { total, parts } with one part per STREAM_DONATIONS share.
export function donationPlan(source, orderId, item) {
  const rule = STREAM_DONATIONS[source];
  const food = FOOD_BY_ID[item.food];
  if (!rule || !food) return { total: 0, parts: [] };
  const rate = rule.minRate + (rule.maxRate - rule.minRate) * unitHash(`${orderId}:${item.key}:${item.food}`);
  const total = Math.max(rule.step, Math.round((food.price * rate) / rule.step) * rule.step);
  const parts = rule.shares.map((share) => Math.round((total * share) / rule.step) * rule.step);
  parts[parts.length - 1] = total - parts.slice(0, -1).reduce((a, b) => a + b, 0);
  return { total, parts };
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
      cost: total,
      earned: 0,
      items: items.map((item, i) => ({ key: String(i), food: item.food, slot: Number.isInteger(item.slot) ? item.slot : null, donated: false })),
    };
    await this.saveService.mutate((s) => {
      s.coins -= total;
      s.orders.push(order);
      s.rewardReceipts.push(receiptId);
      s.rewardReceipts = s.rewardReceipts.slice(-50);
    });
    return { status: 'paid', total, order: structuredClone(order), state: this.saveService.snapshot() };
  }

  // Called when the streamer starts eating an item: records its viewer donations once.
  // Returns the donation parts to show; an item that already donated returns no parts.
  async startServing(orderId, key) {
    const order = this.saveService.state.orders.find((o) => o.id === orderId);
    const item = order?.items.find((i) => i.key === key);
    if (!item) return { recorded: false, parts: [], earned: order?.earned ?? 0, state: this.saveService.snapshot() };
    const plan = donationPlan(order.source, orderId, item);
    if (item.donated || plan.total <= 0) return { recorded: false, parts: [], earned: order.earned, state: this.saveService.snapshot() };
    await this.saveService.mutate((s) => {
      const o = s.orders.find((x) => x.id === orderId);
      const i = o.items.find((x) => x.key === key);
      i.donated = true;
      o.earned += plan.total;
    });
    return { recorded: true, parts: plan.parts, total: plan.total, earned: this.find(orderId).earned, state: this.saveService.snapshot() };
  }

  // Called once per item after the streamer has finished eating it. Eating the last item
  // finishes the order and pays its viewer donations (once, receipt stream:<orderId>).
  async consume(orderId, key) {
    const order = this.saveService.state.orders.find((o) => o.id === orderId);
    if (!order || !order.items.some((i) => i.key === key)) return { applied: false, finished: false, payout: 0, state: this.saveService.snapshot() };
    const finishes = order.items.length === 1;
    const receiptId = `stream:${orderId}`;
    const payout = finishes && !this.saveService.hasReceipt(receiptId) ? order.earned : 0;
    const summary = { cost: order.cost, earned: order.earned };
    await this.saveService.mutate((s) => {
      const o = s.orders.find((x) => x.id === orderId);
      o.items = o.items.filter((i) => i.key !== key);
      if (o.items.length) return;
      s.orders = s.orders.filter((x) => x.id !== orderId);
      if (payout > 0) {
        s.coins += payout;
        s.rewardReceipts.push(receiptId);
        s.rewardReceipts = s.rewardReceipts.slice(-50);
      }
    });
    return { applied: true, finished: finishes, payout, ...summary, state: this.saveService.snapshot() };
  }
}

// Save sanitizer (v9). v8 stored store snacks as a flat `pantry` list; it becomes one order.
export function sanitizeOrders(value, legacyPantry) {
  const orders = Array.isArray(value) ? value : [];
  const clean = orders
    .filter((o) => o && typeof o.id === 'string' && ['store', 'canteen'].includes(o.source) && Array.isArray(o.items))
    .map((o) => {
      const items = o.items
        .filter((i) => i && FOOD_BY_ID[i.food])
        .slice(0, FOOD_ORDER_LIMIT.itemsPerOrder)
        .map((i, n) => ({ key: typeof i.key === 'string' ? i.key : String(n), food: i.food, slot: Number.isInteger(i.slot) ? i.slot : null, donated: i.donated === true }));
      // Orders saved before donations existed: cost of what is left, nothing earned yet.
      const cost = Number.isInteger(o.cost) && o.cost >= 0 ? o.cost : totalOf(items);
      const earned = Number.isInteger(o.earned) && o.earned >= 0 ? o.earned : 0;
      return { id: o.id, source: o.source, cost, earned, items };
    })
    .filter((o) => o.items.length);
  if (Array.isArray(legacyPantry)) {
    const foods = legacyPantry.filter((id) => FOOD_BY_ID[id]?.source === 'store');
    for (let i = 0; i < foods.length; i += FOOD_ORDER_LIMIT.itemsPerOrder) {
      const items = foods.slice(i, i + FOOD_ORDER_LIMIT.itemsPerOrder).map((food, n) => ({ key: String(n), food, slot: null, donated: false }));
      clean.push({ id: `pantry-${i}`, source: 'store', cost: totalOf(items), earned: 0, items });
    }
  }
  return clean.slice(0, FOOD_ORDER_LIMIT.orders);
}
