// Recipe-redesign art (2026-10-08): two 5×5 Nano Banana 2 atlases, row-major cell order.
// Tools are shared by every recipe; states are the Levels 6–10 intermediate food states.
export const KITCHEN_TOOLS = Object.freeze([
  'k-ring-cutter', 'k-peeler', 'k-whisk', 'k-spoon', 'k-spatula',
  'k-rolling-pin', 'k-grater', 'k-ladle', 'k-ketchup', 'k-mustard',
  'k-piping-bag', 'k-salt', 'k-egg-bowl', 'k-skewers', 'k-scoop',
  'k-milk-jug', 'k-egg', 'k-colander', 'k-fryer', 'k-pot',
  'k-pan', 'k-board', 'k-bowl-unmixed', 'k-bowl-batter', 'k-bowl-crumbs',
]);

export const KITCHEN_STATES = Object.freeze([
  's-sausage', 's-cd-battered', 's-cd-crumbed', 's-cd-frying', 's-cd-golden',
  's-pancake-bubbly', 's-pancake-stack', 's-patty-pan', 's-bun-lettuce', 's-burger-cheese',
  's-lettuce', 's-tomato-slices', 's-cheese-slice', 's-top-bun', 's-dough-ball',
  's-dough-sheet', 's-glaze-bowl', 's-donut-glazed', 's-potato-peeled', 's-fries-basket',
  null, 's-shredded-cheese', 's-strawberry-slices', 's-blueberries', 's-green-onion',
]);

export const KITCHEN_KEYS = Object.freeze([...KITCHEN_TOOLS, ...KITCHEN_STATES].filter(Boolean));

export const KITCHEN_SHEETS = Object.freeze([
  { file: 'tools.png', names: KITCHEN_TOOLS },
  { file: 'states-06-10.png', names: KITCHEN_STATES },
]);
