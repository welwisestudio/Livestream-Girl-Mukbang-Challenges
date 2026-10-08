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

export const KITCHEN_SHEETS = Object.freeze([
  { file: 'tools.png', names: KITCHEN_TOOLS },
  { file: 'states-06-10.png', names: KITCHEN_STATES },
]);

// Level-fix pass (2026-10-08): Nano Banana Pro sheets in art-source/level-fix (Background Remover
// cutouts). Two sheets came back as a loose layout instead of a strict grid, so every sprite is cut by
// an explicit box in 1000-px preview coordinates of its 2048-px sheet ([x0, y0, x1, y1]).
const grid4 = (names) => names.map((name, i) => name && [name, [(i % 4) * 250 + 4, Math.floor(i / 4) * 250 + 4, (i % 4) * 250 + 246, Math.floor(i / 4) * 250 + 246]]).filter(Boolean);
export const FIX_SHEETS = Object.freeze([
  { file: 'tools-a.png', boxes: grid4([
    'k-bowl-mix', 'k-hot-sauce', 'k-soy-bottle', 'k-honey',
    'k-sprinkles', 'k-cinnamon', 'k-brush', 'k-masher',
    'k-chasen', 'k-pan-pink', 'p-dome-lid', 'p-straw',
    'p-ice-cube', 'p-pepperoni', 'p-green-pepper', 'p-jalapeno',
  ]) },
  { file: 'states-a.png', boxes: grid4([
    'cup-lidded', 'pizza-sliced', 's-dough-sheet-plain', 'bowl-empty',
    'ramen-plain', 'udon-bowl', 'pasta-plain', 'mac-plain',
    'choc-chopped', 'cake-balls', null, null, // banana cells rejected (peel still attached) → states-c
    'choco-banana-plain', 'churros-fried', 'wings-fried', null, // omurice rejected (ketchup) → states-c
  ]) },
  { file: 'states-b.png', boxes: [
    ['gyoza-wrapper', [15, 40, 185, 160]], ['gyoza-raw', [200, 30, 395, 172]], ['croquette-shaped', [405, 40, 597, 168]], ['taiyaki-mold-empty', [802, 4, 996, 192]],
    ['muffin-tin-empty', [4, 228, 197, 362]], ['blender-empty', [228, 204, 372, 396]], ['blender-pink', [428, 204, 572, 396]], ['milkshake-plain', [648, 204, 752, 396]],
    ['hotdog-buns', [4, 428, 197, 572]], ['hotdogs-plain', [203, 428, 397, 572]], ['glass-bowl', [423, 418, 577, 588]], ['waffle-iron-empty', [622, 404, 782, 602]],
    ['tortilla-flat', [4, 628, 197, 772]], ['tortillas-plate', [203, 628, 397, 772]], ['taco-shells', [403, 628, 597, 777]], ['p-bread-slice', [808, 638, 992, 768]], ['glass-empty', [640, 610, 760, 795]],
  ] },
  { file: 'pieces-fx.png', boxes: [
    ['p-ice-cream-scoop', [18, 13, 192, 172]], ['p-salmon', [213, 28, 387, 157]], ['p-egg-strip', [408, 18, 592, 177]], ['p-carrot-strips', [608, 33, 792, 162]],
    ['p-spinach', [18, 213, 187, 382]], ['p-bacon', [208, 223, 392, 377]], ['p-choc-chips', [408, 233, 597, 362]], ['p-choc-cup', [618, 228, 782, 367]],
    ['p-mini-sausages', [4, 428, 197, 557]], ['p-strawberry', [228, 418, 372, 577]], ['fx-fire', [413, 413, 792, 582]], ['fx-flame', [828, 413, 977, 587]],
    ['fx-icicles', [4, 623, 197, 787]], ['fx-steam', [418, 623, 587, 767]], ['p-patty-cheese', [803, 833, 992, 962]],
  ] },
  // Regenerated banana cells (its omurice cell overlapped stray reference items and is not used).
  { file: 'states-c.png', boxes: [
    ['banana-peeled', [581, 170, 919, 444], { erase: [[480, 0, 765, 215]] }], ['banana-stick', [94, 531, 375, 950]], ['choc-bowl', [562, 606, 931, 900]],
  ] },
  { file: 'omurice-plain.png', boxes: [['omurice-plain', [80, 280, 930, 800]]] },
  { file: 'matcha-bowl.png', boxes: [['matcha-bowl', [180, 190, 840, 800], { erase: [[0, 0, 1000, 192], [236, 0, 492, 204], [492, 0, 770, 201], [0, 0, 224, 268], [0, 250, 202, 492], [0, 520, 216, 780]] }]] },
]);

export const FIX_KEYS = Object.freeze(FIX_SHEETS.flatMap((sheet) => sheet.boxes.map(([name]) => name)));

export const KITCHEN_KEYS = Object.freeze([...KITCHEN_TOOLS, ...KITCHEN_STATES, ...FIX_KEYS].filter(Boolean));
