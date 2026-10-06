import test from 'node:test';
import assert from 'node:assert/strict';
import { PartTimeShift, buildShift } from '../../src/mechanics/PartTimeShift.js';
import { PART_TIME_CUSTOMERS, PART_TIME_JOB, PART_TIME_PRODUCTS } from '../../src/content/partTime.js';
import { SaveService } from '../../src/services/SaveService.js';
import { RewardService } from '../../src/services/RewardService.js';

function seeded(seed = 7) {
  let s = seed;
  return () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; };
}

const serveAll = (shift) => { for (const id of shift.order.request) shift.serve(id); };

test('a shift has exactly 6 customers, 3 options each, requests drawn only from the options', () => {
  for (let seed = 1; seed < 40; seed += 1) {
    const orders = buildShift({ rng: seeded(seed) });
    assert.equal(orders.length, 6);
    assert.equal(new Set(orders.map((o) => o.customer)).size, 6);
    orders.forEach((o, i) => {
      assert.equal(o.options.length, 3);
      assert.equal(new Set(o.options).size, 3);
      assert.ok(o.options.every((id) => PART_TIME_PRODUCTS.some((p) => p.id === id)));
      assert.equal(o.request.length, PART_TIME_JOB.requestLengths[i]);
      assert.ok(o.request.every((id) => o.options.includes(id)));
      assert.ok(new Set(o.request).size >= 2, 'every request mixes at least two products');
      assert.ok(PART_TIME_CUSTOMERS.includes(o.customer));
    });
  }
});

test('items must be given in order; a full order moves to the next customer with a fresh clock', () => {
  const shift = new PartTimeShift({ rng: seeded(3) });
  const [first, second] = shift.order.request;
  shift.tick(4000);
  assert.deepEqual(shift.serve(first), { event: 'correct', slot: 0 });
  assert.equal(shift.progress, 1);
  const result = shift.serve(second);
  assert.equal(result.event, 'customer-served');
  assert.equal(shift.state, 'between');
  // The clock does not run between customers and taps are ignored.
  shift.tick(60_000);
  assert.equal(shift.state, 'between');
  assert.equal(shift.serve(first).event, 'ignored');
  assert.ok(shift.nextCustomer());
  assert.equal(shift.status().customer, 2);
  assert.equal(shift.progress, 0);
  assert.equal(shift.timeLeftMs, PART_TIME_JOB.customerMs);
});

test('a wrong item is a mistake: progress stays, the clock loses 3 s', () => {
  const shift = new PartTimeShift({ rng: seeded(11) });
  const expected = shift.order.request[0];
  const wrong = shift.order.options.find((id) => id !== expected);
  const r = shift.serve(wrong);
  assert.deepEqual(r, { event: 'wrong', expected });
  assert.equal(shift.progress, 0);
  assert.equal(shift.mistakes, 1);
  assert.equal(shift.timeLeftMs, PART_TIME_JOB.customerMs - PART_TIME_JOB.wrongPenaltyMs);
  // Items that are not on the counter cannot be served at all.
  const absent = PART_TIME_PRODUCTS.find((p) => !shift.order.options.includes(p.id)).id;
  assert.equal(shift.serve(absent).event, 'ignored');
  assert.equal(shift.mistakes, 1);
});

test('15 seconds without finishing the order ends the shift immediately', () => {
  const shift = new PartTimeShift({ rng: seeded(5) });
  shift.serve(shift.order.request[0]);
  assert.equal(shift.tick(14_999), null);
  assert.equal(shift.state, 'serving');
  assert.deepEqual(shift.tick(1), { event: 'timeout' });
  assert.equal(shift.state, 'failed');
  assert.equal(shift.serve(shift.order.request[1]).event, 'ignored');
  assert.equal(shift.tick(1000), null);
  // A mistake that empties the clock is also a timeout.
  const late = new PartTimeShift({ rng: seeded(5) });
  late.tick(13_000);
  const wrong = late.order.options.find((id) => id !== late.order.request[0]);
  assert.equal(late.serve(wrong).event, 'timeout');
  assert.equal(late.state, 'failed');
});

test('serving all 6 customers in sequence wins the shift', () => {
  const shift = new PartTimeShift({ rng: seeded(9) });
  const events = [];
  for (let i = 0; i < 6; i += 1) {
    assert.equal(shift.status().customer, i + 1);
    for (const id of shift.order.request) events.push(shift.serve(id).event);
    if (i < 5) assert.ok(shift.nextCustomer());
  }
  assert.equal(shift.state, 'won');
  assert.equal(events.at(-1), 'shift-complete');
  assert.equal(events.filter((e) => e === 'customer-served').length, 5);
  assert.equal(shift.status().served, 6);
  assert.equal(shift.nextCustomer(), false);
  serveAll(shift);
  assert.equal(shift.state, 'won');
});

test('the shift reward is paid once per run', async () => {
  const platform = { raw: '', async loadData() { return this.raw; }, async saveData(r) { this.raw = r; } };
  const save = new SaveService(platform);
  await save.load();
  const rewards = new RewardService(save, platform);
  const a = await rewards.grantPartTimeShift({ runId: 'part-time:a', coins: PART_TIME_JOB.reward });
  assert.equal(a.applied, true);
  assert.equal(a.state.coins, 1000 + PART_TIME_JOB.reward);
  const again = await rewards.grantPartTimeShift({ runId: 'part-time:a', coins: PART_TIME_JOB.reward });
  assert.equal(again.applied, false);
  assert.equal(save.state.coins, 1000 + PART_TIME_JOB.reward);
  const b = await rewards.grantPartTimeShift({ runId: 'part-time:b', coins: PART_TIME_JOB.reward });
  assert.equal(b.state.coins, 1000 + PART_TIME_JOB.reward * 2);
  await assert.rejects(rewards.grantPartTimeShift({ runId: 'x', coins: -1 }));
});
