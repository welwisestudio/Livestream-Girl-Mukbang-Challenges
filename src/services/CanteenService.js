import { CANTEEN_FOOD_BY_ID, CANTEEN_TRAY_SLOTS } from '../content/canteen.js';

// Canteen payment: the assembled tray (food + compartment) becomes one 'canteen' order through
// the shared FoodOrderService, receipt canteen:<orderId>. The stream then eats exactly that tray.
export class CanteenService {
  constructor(saveService, orders) {
    this.saveService = saveService;
    this.orders = orders;
  }

  async pay({ orderId, items }) {
    const list = Array.isArray(items) ? items : [];
    for (const item of list) {
      if (!CANTEEN_FOOD_BY_ID[item.food]) throw new Error(`Unknown canteen food: ${item.food}`);
      if (!(item.slot >= 0 && item.slot < CANTEEN_TRAY_SLOTS)) throw new Error(`Bad tray slot: ${item.slot}`);
    }
    if (new Set(list.map((i) => i.slot)).size !== list.length) throw new Error('Two portions in one compartment');
    return this.orders.purchase({ orderId, source: 'canteen', items: list });
  }
}
