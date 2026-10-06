import test from 'node:test';
import assert from 'node:assert/strict';
import { CanteenTray } from '../../src/mechanics/CanteenTray.js';
import { CANTEEN_COUNTER, CANTEEN_FOODS, CANTEEN_TRAY_SLOTS } from '../../src/content/canteen.js';
import { CANTEEN_ART } from '../../src/ui/canteenViews.js';
import { IMAGE_ASSETS } from '../../src/content/assets.js';
import { SaveService } from '../../src/services/SaveService.js';
import { FoodOrderService } from '../../src/services/FoodOrderService.js';
import { CanteenService } from '../../src/services/CanteenService.js';

async function setup() {
  const platform = { raw: '', async loadData() { return this.raw; }, async saveData(r) { this.raw = r; } };
  const save = new SaveService(platform);
  await save.load();
  const orders = new FoodOrderService(save);
  return { save, orders, canteen: new CanteenService(save, orders) };
}

test('canteen content: six dishes on two shelves, textures exist, tray geometry is sane', () => {
  const textures = new Set(IMAGE_ASSETS.map((a) => a.key));
  assert.deepEqual(CANTEEN_COUNTER.flat().sort(), CANTEEN_FOODS.map((f) => f.id).sort());
  for (const f of CANTEEN_FOODS) {
    assert.ok(Number.isInteger(f.price) && f.price > 0);
    for (const key of [f.container, f.portion]) assert.ok(textures.has(key), key);
  }
  assert.equal(CANTEEN_ART.compartments.length, CANTEEN_TRAY_SLOTS);
  const overlap = (a, b) => Math.min(a.x + a.w, b.x + b.w) > Math.max(a.x, b.x) && Math.min(a.y + a.h, b.y + b.h) > Math.max(a.y, b.y);
  for (const [i, a] of CANTEEN_ART.compartments.entries()) {
    assert.ok(a.x >= 0 && a.y >= 0 && a.x + a.w <= 1 && a.y + a.h <= 1);
    for (const b of CANTEEN_ART.compartments.slice(i + 1)) assert.equal(overlap(a, b), false);
  }
});

test('tray: place, replace, remove, totals and the meal output', () => {
  const tray = new CanteenTray();
  assert.equal(tray.place(0, 'rice').status, 'placed');
  assert.equal(tray.place(3, 'fried-chicken').status, 'placed');
  assert.equal(tray.place(1, 'corn-soup').status, 'placed');
  assert.deepEqual([tray.count, tray.total], [3, 40 + 120 + 60]);
  assert.deepEqual(tray.place(1, 'jelly'), { status: 'replaced', previous: 'corn-soup' });
  assert.equal(tray.total, 40 + 120 + 70);
  assert.deepEqual(tray.remove(0), { status: 'removed', food: 'rice' });
  assert.equal(tray.remove(0).status, 'empty');
  assert.equal(tray.place(9, 'rice').status, 'bad-slot');
  assert.equal(tray.place(2, 'orez').status, 'unknown');
  assert.deepEqual(tray.items(), [{ food: 'jelly', slot: 1 }, { food: 'fried-chicken', slot: 3 }]);
  for (let i = 0; i < 5; i += 1) tray.place(i, 'veggies');
  assert.equal(tray.full, true);
  assert.equal(tray.total, 250);
});

test('paying a tray charges once and stores the meal with its compartments', async () => {
  const { canteen, save, orders } = await setup();
  const items = [{ food: 'rice', slot: 0 }, { food: 'fried-chicken', slot: 3 }, { food: 'corn-soup', slot: 2 }];
  const r = await canteen.pay({ orderId: 'c1', items });
  assert.equal(r.status, 'paid');
  assert.equal(r.total, 220);
  assert.equal(save.state.coins, 780);
  const order = orders.find('c1');
  assert.equal(order.source, 'canteen');
  assert.deepEqual(order.items.map((i) => [i.food, i.slot]), [['rice', 0], ['fried-chicken', 3], ['corn-soup', 2]]);
  assert.ok(save.hasReceipt('canteen:c1'));
  assert.equal((await canteen.pay({ orderId: 'c1', items })).status, 'already-paid');
  assert.equal(save.state.coins, 780);
  await assert.rejects(canteen.pay({ orderId: 'c2', items: [{ food: 'rice', slot: 0 }, { food: 'jelly', slot: 0 }] }));
  await assert.rejects(canteen.pay({ orderId: 'c3', items: [{ food: 'orez', slot: 0 }] }));
});

test('not enough coins: the tray is refused and nothing changes', async () => {
  const { canteen, save } = await setup();
  await save.mutate((s) => { s.coins = 100; });
  const r = await canteen.pay({ orderId: 'c4', items: [{ food: 'fried-chicken', slot: 3 }, { food: 'rice', slot: 0 }] });
  assert.deepEqual([r.status, r.total, r.coins, r.missing], ['insufficient', 160, 100, 60]);
  assert.equal(save.state.coins, 100);
  assert.deepEqual(save.state.orders, []);
  assert.equal((await canteen.pay({ orderId: 'c5', items: [] })).status, 'empty');
});
