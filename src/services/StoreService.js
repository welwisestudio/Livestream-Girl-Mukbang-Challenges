import { STORE_CONFIG, STORE_PRODUCT_BY_ID } from '../content/store.js';

// Supermarket checkout: validates the basket, then pays through the shared FoodOrderService
// (coins −total, one 'store' order, receipt store:<orderId>). The eating stream eats that order.
export class StoreService {
  constructor(saveService, orders) {
    this.saveService = saveService;
    this.orders = orders;
  }

  async checkout({ orderId, productIds }) {
    if (Array.isArray(productIds) && productIds.length > STORE_CONFIG.basketCapacity) return { status: 'too-many', state: this.saveService.snapshot() };
    for (const id of productIds ?? []) if (!STORE_PRODUCT_BY_ID[id]) throw new Error(`Unknown store product: ${id}`);
    const result = await this.orders.purchase({ orderId, source: 'store', items: (productIds ?? []).map((food) => ({ food })) });
    return result.status === 'paid' ? { ...result, productIds: [...productIds] } : result;
  }
}
