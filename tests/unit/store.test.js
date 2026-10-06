import test from 'node:test';
import assert from 'node:assert/strict';
import { StoreBasket, priceOf } from '../../src/mechanics/StoreBasket.js';
import { STORE_CATEGORIES, STORE_CONFIG, STORE_PRODUCT_BY_ID, STORE_PRODUCTS, slotKey } from '../../src/content/store.js';
import { SaveService } from '../../src/services/SaveService.js';
import { StoreService } from '../../src/services/StoreService.js';
import { IMAGE_ASSETS } from '../../src/content/assets.js';
import { FoodOrderService } from '../../src/services/FoodOrderService.js';

async function setup(raw = '') {
  const platform = { raw, async loadData() { return this.raw; }, async saveData(r) { this.raw = r; } };
  const save = new SaveService(platform);
  await save.load();
  const orders = new FoodOrderService(save);
  return { platform, save, orders, store: new StoreService(save, orders) };
}

test('store content: every shelf facing is a known product with a price and a runtime texture', () => {
  const textures = new Set(IMAGE_ASSETS.map((a) => a.key));
  for (const c of STORE_CATEGORIES) {
    assert.equal(c.shelves.length, 3);
    for (const shelf of c.shelves) {
      assert.equal(shelf.length, 3);
      for (const id of shelf) assert.ok(STORE_PRODUCT_BY_ID[id], id);
    }
    assert.ok(textures.has(c.background));
  }
  for (const p of STORE_PRODUCTS) {
    assert.ok(Number.isInteger(p.price) && p.price > 0);
    assert.ok(textures.has(p.texture), p.texture);
  }
});

test('basket: add/remove units, live count and total, capacity 5', () => {
  const basket = new StoreBasket();
  const a = slotKey('new-arrivals', 0, 0);
  assert.equal(basket.add(a, 'cookie-jar').status, 'added');
  assert.equal(basket.add(a, 'cookie-jar').status, 'already');
  assert.equal(basket.toggle(slotKey('new-arrivals', 1, 1), 'orez').status, 'added');
  assert.deepEqual([basket.count, basket.total], [2, 200]);
  assert.equal(basket.toggle(a, 'cookie-jar').status, 'removed');
  assert.deepEqual([basket.count, basket.total], [1, 100]);
  assert.equal(basket.remove(a).status, 'missing');
  for (let i = 0; i < 3; i += 1) basket.add(slotKey('matcha', 0, i), STORE_CATEGORIES[1].shelves[0][i]);
  basket.add(slotKey('matcha', 1, 0), 'matcha-latte');
  assert.equal(basket.count, STORE_CONFIG.basketCapacity);
  assert.equal(basket.add(slotKey('matcha', 2, 0), 'matcha-cookies').status, 'full');
  assert.equal(basket.total, 100 + 300 + 250 + 300 + 250);
  assert.equal(basket.add('x', 'not-a-snack').status, 'unknown');
  assert.equal(priceOf(basket.productIds()), basket.total);
});

test('checkout charges once, creates one store order and survives a reload', async () => {
  const { platform, store, save, orders } = await setup();
  const r = await store.checkout({ orderId: 'o1', productIds: ['cookie-jar', 'tokboki'] });
  assert.equal(r.status, 'paid');
  assert.equal(r.total, 400);
  assert.equal(save.state.coins, 600);
  assert.deepEqual(orders.orders().map((o) => [o.id, o.source, o.items.map((i) => i.food)]), [['o1', 'store', ['cookie-jar', 'tokboki']]]);
  assert.equal((await store.checkout({ orderId: 'o1', productIds: ['cookie-jar', 'tokboki'] })).status, 'already-paid');
  assert.equal(save.state.coins, 600);
  const again = new SaveService(platform);
  await again.load();
  assert.equal(again.state.version, 9);
  assert.deepEqual(again.state.orders[0].items.map((i) => i.food), ['cookie-jar', 'tokboki']);
});

test('not enough coins: nothing is charged and no order is created', async () => {
  const { store, save } = await setup();
  const ids = ['matcha-sticks', 'tokboki', 'matcha-sticks', 'matcha-latte']; // 1150 > 1000
  const r = await store.checkout({ orderId: 'big', productIds: ids });
  assert.deepEqual([r.status, r.total, r.coins, r.missing], ['insufficient', 1150, 1000, 150]);
  assert.equal(save.state.coins, 1000);
  assert.deepEqual(save.state.orders, []);
  assert.ok(!save.hasReceipt('store:big'));
  assert.equal((await store.checkout({ orderId: 'e', productIds: [] })).status, 'empty');
  assert.equal((await store.checkout({ orderId: 't', productIds: Array(6).fill('orez') })).status, 'too-many');
  await assert.rejects(store.checkout({ orderId: 'x', productIds: ['rice'] })); // canteen food is not on the shelves
});

test('eating removes items from the order one at a time; an empty order disappears', async () => {
  const { store, save, orders } = await setup();
  await store.checkout({ orderId: 'o2', productIds: ['orez', 'orez', 'potato-chips'] });
  assert.equal((await orders.consume('o2', '0')).applied, true);
  assert.deepEqual(save.state.orders[0].items.map((i) => i.food), ['orez', 'potato-chips']);
  assert.equal((await orders.consume('o2', '0')).applied, false);
  await orders.consume('o2', '1');
  await orders.consume('o2', '2');
  assert.deepEqual(save.state.orders, []);
});

test('v8 pantry saves migrate to a v9 store order; unknown foods are dropped', async () => {
  const { save } = await setup(JSON.stringify({ version: 7, coins: 50, highestLevel: 2, availableLevel: 2 }));
  assert.equal(save.state.version, 9);
  assert.deepEqual(save.state.orders, []);
  const { save: s2 } = await setup(JSON.stringify({ version: 8, coins: 50, pantry: ['orez', 'ghost', 'tokboki'] }));
  assert.deepEqual(s2.state.orders.map((o) => [o.source, o.items.map((i) => i.food)]), [['store', ['orez', 'tokboki']]]);
});
