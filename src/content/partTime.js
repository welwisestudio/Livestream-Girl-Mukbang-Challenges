// Part Time Job minigame data (reference: reference/input/PartTimeJob.png).
// Products and customers are content; PartTimeShift only reads this config.

export const PART_TIME_PRODUCTS = Object.freeze([
  { id: 'corn-dog', texture: 'ptj-corn-dog', label: 'Corn Dog' },
  { id: 'snack', texture: 'ptj-snack', label: 'Snack' },
  { id: 'milk', texture: 'ptj-milk', label: 'Banana Milk' },
  { id: 'donut', texture: 'ptj-donut', label: 'Donut' },
  { id: 'ice-cream', texture: 'ptj-ice-cream', label: 'Ice Cream' },
  { id: 'onigiri', texture: 'ptj-onigiri', label: 'Onigiri' },
]);

export const PART_TIME_CUSTOMERS = Object.freeze([
  'ptj-customer-1', 'ptj-customer-2', 'ptj-customer-3',
  'ptj-customer-4', 'ptj-customer-5', 'ptj-customer-6',
]);

// Each customer pays as soon as the whole order is handed over (designer request 2026-10-13);
// bigger orders pay more. The full shift still totals 300 coins.
const CUSTOMER_PAY = Object.freeze([30, 40, 45, 55, 60, 70]);

export const PART_TIME_JOB = Object.freeze({
  customers: 6,
  optionsPerCustomer: 3,
  // Items per request, customer by customer: the shift gets busier.
  requestLengths: [2, 2, 3, 3, 4, 4],
  customerMs: 15_000,
  // A wrong item is a mistake: the card shakes and the customer's clock loses this much.
  wrongPenaltyMs: 3_000,
  // Coins paid by customer i (receipt part-time:<runId>:<i>); kept if the shift later fails.
  customerPay: CUSTOMER_PAY,
  // Total of a fully served shift (sum of customerPay).
  reward: CUSTOMER_PAY.reduce((a, b) => a + b, 0),
});

export const PART_TIME_PRODUCT_BY_ID = Object.freeze(Object.fromEntries(PART_TIME_PRODUCTS.map((p) => [p.id, p])));
