import { PART_TIME_CUSTOMERS, PART_TIME_JOB, PART_TIME_PRODUCTS } from '../content/partTime.js';

// Pure rules of one Part Time Job shift (no Phaser): customer sequence, per-customer clock,
// ordered requests and mistakes. The scene drives it with tick(ms) and serve(productId).
//
// States: serving → (all items given) between → nextCustomer() → serving … → won
//         serving → (clock reaches 0) failed. Nothing else moves the state.

function shuffle(list, rng) {
  const out = [...list];
  for (let i = out.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

export function buildShift({ config = PART_TIME_JOB, products = PART_TIME_PRODUCTS, customers = PART_TIME_CUSTOMERS, rng = Math.random } = {}) {
  const faces = shuffle(customers, rng);
  return Array.from({ length: config.customers }, (_, i) => {
    const options = shuffle(products, rng).slice(0, config.optionsPerCustomer).map((p) => p.id);
    const length = config.requestLengths[Math.min(i, config.requestLengths.length - 1)];
    let request;
    do {
      request = Array.from({ length }, () => options[Math.floor(rng() * options.length)]);
    } while (length > 1 && new Set(request).size < 2);
    return { customer: faces[i % faces.length], options, request };
  });
}

export class PartTimeShift {
  constructor({ config = PART_TIME_JOB, orders = null, rng = Math.random } = {}) {
    this.config = config;
    this.orders = orders ?? buildShift({ config, rng });
    this.index = 0;
    this.progress = 0;
    this.mistakes = 0;
    this.timeLeftMs = config.customerMs;
    this.state = 'serving';
  }

  get order() { return this.orders[this.index]; }

  // Advances the current customer's clock. Only a serving customer's clock runs.
  tick(ms) {
    if (this.state !== 'serving' || !(ms > 0)) return null;
    this.timeLeftMs = Math.max(0, this.timeLeftMs - ms);
    if (this.timeLeftMs === 0) {
      this.state = 'failed';
      return { event: 'timeout' };
    }
    return null;
  }

  serve(productId) {
    if (this.state !== 'serving' || !this.order.options.includes(productId)) return { event: 'ignored' };
    const expected = this.order.request[this.progress];
    if (productId !== expected) {
      this.mistakes += 1;
      this.timeLeftMs = Math.max(0, this.timeLeftMs - this.config.wrongPenaltyMs);
      if (this.timeLeftMs === 0) {
        this.state = 'failed';
        return { event: 'timeout', expected };
      }
      return { event: 'wrong', expected };
    }
    this.progress += 1;
    if (this.progress < this.order.request.length) return { event: 'correct', slot: this.progress - 1 };
    if (this.index === this.orders.length - 1) {
      this.state = 'won';
      return { event: 'shift-complete', slot: this.progress - 1 };
    }
    this.state = 'between';
    return { event: 'customer-served', slot: this.progress - 1 };
  }

  nextCustomer() {
    if (this.state !== 'between') return false;
    this.index += 1;
    this.progress = 0;
    this.timeLeftMs = this.config.customerMs;
    this.state = 'serving';
    return true;
  }

  status() {
    return {
      state: this.state,
      customer: this.index + 1,
      customers: this.orders.length,
      served: this.index + (this.state === 'won' || this.state === 'between' ? 1 : 0),
      progress: this.progress,
      request: [...this.order.request],
      options: [...this.order.options],
      timeLeftMs: this.timeLeftMs,
      timeFraction: this.timeLeftMs / this.config.customerMs,
      mistakes: this.mistakes,
    };
  }
}
