// Canteen content (reference: reference/input/Canteen.png). One scoop = one tray compartment;
// prices live here only.

export const CANTEEN_FOODS = Object.freeze([
  { id: 'rice', label: 'Rice', price: 40, container: 'canteen-rice-pot', portion: 'canteen-rice', tool: 'spoon' },
  { id: 'corn-soup', label: 'Corn Soup', price: 60, container: 'canteen-soup-bowl', portion: 'canteen-soup', tool: 'ladle' },
  { id: 'veggies', label: 'Veggies', price: 50, container: 'canteen-veggie-bowl', portion: 'canteen-veggies', tool: 'spoon' },
  { id: 'jelly', label: 'Rainbow Jelly', price: 70, container: 'canteen-jelly-tray', portion: 'canteen-jelly', tool: 'spoon' },
  { id: 'cookies', label: 'Cookies', price: 60, container: 'canteen-cookie-box', portion: 'canteen-cookies', tool: 'spoon' },
  { id: 'fried-chicken', label: 'Fried Chicken', price: 120, container: 'canteen-chicken-basket', portion: 'canteen-chicken', tool: 'spoon' },
]);

export const CANTEEN_FOOD_BY_ID = Object.freeze(Object.fromEntries(CANTEEN_FOODS.map((f) => [f.id, f])));

// Counter rows as in the reference: three containers per shelf.
export const CANTEEN_COUNTER = Object.freeze([
  ['rice', 'corn-soup', 'fried-chicken'],
  ['veggies', 'jelly', 'cookies'],
]);

// Tray compartments: three small on top, two big below (reference tray).
export const CANTEEN_TRAY_SLOTS = 5;
