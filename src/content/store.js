// Supermarket content (references: reference/input/Store-Shelf.png, Store-Matcha.png,
// Store-Scan.png). Prices live here only; the basket and checkout read them from this table.

export const STORE_PRODUCTS = Object.freeze([
  // New Arrivals
  { id: 'cookie-jar', texture: 'store-cookie-jar', label: 'Checker Cookies', price: 100 },
  { id: 'orez', texture: 'store-orez', label: 'Orez Cookies', price: 100 },
  { id: 'green-tea', texture: 'store-green-tea', label: 'Green Tea', price: 250 },
  { id: 'swirl-soda', texture: 'store-swirl-soda', label: 'Swirl Soda', price: 150 },
  { id: 'strawberry-milk', texture: 'store-strawberry-milk', label: 'Strawberry Milk', price: 120 },
  { id: 'potato-chips', texture: 'store-potato-chips', label: 'Potato Chips', price: 80 },
  // Matcha
  { id: 'matcha-sticks', texture: 'store-matcha-sticks', label: 'Matcha Sticks', price: 300 },
  { id: 'matcha-biscuits', texture: 'store-matcha-biscuits', label: 'Matcha Biscuits', price: 250 },
  { id: 'matcha-latte', texture: 'store-matcha-latte', label: 'Matcha Latte', price: 250 },
  { id: 'tokboki', texture: 'store-tokboki', label: 'Matcha Tokboki', price: 300 },
  { id: 'matcha-cookies', texture: 'store-matcha-cookies', label: 'Matcha Cookies', price: 250 },
  { id: 'matcha-wafer', texture: 'store-matcha-wafer', label: 'Matcha Wafer', price: 200 },
]);

export const STORE_PRODUCT_BY_ID = Object.freeze(Object.fromEntries(STORE_PRODUCTS.map((p) => [p.id, p])));

// One page per category: three shelves × three facings, like the reference shelves.
export const STORE_CATEGORIES = Object.freeze([
  {
    id: 'new-arrivals', title: 'NEW ARRIVALS', background: 'store-shelf-pink', signColor: '#ff5f8a',
    shelves: [
      ['cookie-jar', 'cookie-jar', 'orez'],
      ['strawberry-milk', 'orez', 'potato-chips'],
      ['green-tea', 'swirl-soda', 'swirl-soda'],
    ],
  },
  {
    id: 'matcha', title: 'MATCHA', background: 'store-shelf-matcha', signColor: '#4e8a2c',
    shelves: [
      ['matcha-sticks', 'matcha-biscuits', 'matcha-sticks'],
      ['matcha-latte', 'tokboki', 'matcha-latte'],
      ['matcha-cookies', 'matcha-wafer', 'matcha-cookies'],
    ],
  },
]);

export const STORE_CONFIG = Object.freeze({
  basketCapacity: 5,
});

export const slotKey = (categoryId, shelf, index) => `${categoryId}:${shelf}:${index}`;
