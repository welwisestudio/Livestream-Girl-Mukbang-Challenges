// Levels 2–50 cooking sequences (logic-first redesign 2026-10-08, full level-fix pass 2026-10-08;
// see project/RECIPE-PLAN.md). Every step names the real tool/ingredient and the food sprite
// before/after it. Texture values starting with '@' are this recipe's own atlas stages (raw, prep,
// cooked, final, bite); other values are shared keys (kitchen tools `k-*`, pieces `p-*`, states
// `s-*`/level-fix states, classic campaign art).
// Rules applied in the level-fix pass:
//   - a container (bowl, pan, pot, basket, blender) is TIPPED over the food (`tipIn`), never dropped
//     onto it as if it were a piece; pieces that stay on the food use single-piece sprites (`p-*`);
//   - every last step ends on the recipe's final sprite, so the Perfect screen matches the counter;
//   - neighbouring levels do not open with the same action (only Pancakes keeps the whisk opener
//     in Levels 6–10).

const step = (kind, action, defaults = {}) => (id, instruction, options = {}) => ({ id, kind, action, instruction, ...defaults, ...options });

// Interaction verbs → engine step kinds.
export const S = Object.freeze({
  place: step('place', 'PLACE'),
  stack: step('place', 'STACK', { keep: false }),
  assemble: step('place', 'ASSEMBLE'),
  tipIn: step('place', 'POUR_IN', { keep: false, tip: true }),
  scoop: step('place', 'SCOOP', { item: 'k-spoon', leave: 'blob' }),
  crack: step('place', 'CRACK', { item: 'k-egg', keep: false }),
  drain: step('place', 'DRAIN', { base: 'k-colander', keep: false, tip: true }),
  serve: step('place', 'SERVE', { base: 'lobby-plate', keep: false, tip: true }),
  cutOut: step('place', 'CUT_OUT', { item: 'k-ring-cutter', stamp: true }),
  dip: step('dip', 'DIP'),
  coat: step('dip', 'COAT', { base: 'k-bowl-crumbs', color: 0xd9a85a }),
  // The generated metal whisk points working-end-up in its source image. Every normal whisk
  // step carries an explicit 180° hold so the wires enter the bowl and the handle stays above it.
  whisk: step('stir', 'WHISK', { tool: 'k-whisk', toolAngle: 180, turns: 1.5 }),
  stir: step('stir', 'STIR', { tool: 'k-spoon', turns: 1.3 }),
  spread: step('stir', 'SPREAD', { tool: 'k-spoon', turns: 1 }),
  brush: step('stir', 'BRUSH', { tool: 'k-brush', turns: 1 }),
  toss: step('stir', 'TOSS', { tool: 'k-spoon', turns: 1.2 }),
  pour: step('pour', 'POUR'),
  squeeze: step('trace', 'SQUEEZE', { style: 'sauce' }),
  pipe: step('trace', 'PIPE', { style: 'sauce', tool: 'k-piping-bag' }),
  sprinkle: step('trace', 'SPRINKLE', { style: 'sprinkle', tool: 'k-salt', particle: 'dot', length: 1.1 }),
  cook: step('cook', 'COOK'),
  fry: step('cook', 'FRY', { base: 'k-fryer', effect: 'bubbles' }),
  boil: step('cook', 'BOIL', { base: 'k-pot', effect: 'steam' }),
  // The oven-with-food sprite shows a pizza, so only pizza levels use it as the cooking state.
  bake: step('cook', 'BAKE', { base: 'oven', effect: 'heat', brown: true }),
  cut: step('gesture', 'CUT', { tool: 'sushi-knife', motion: 'cut', direction: 'down', strokes: 3 }),
  chop: step('gesture', 'CHOP', { tool: 'sushi-knife', motion: 'cut', direction: 'down', strokes: 4 }),
  peel: step('gesture', 'PEEL', { tool: 'k-peeler', motion: 'peel', direction: 'down', strokes: 3 }),
  grate: step('gesture', 'GRATE', { tool: 'k-grater', motion: 'grate', direction: 'down', strokes: 3, color: 0xf6d36a }),
  roll: step('gesture', 'ROLL', { tool: 'k-rolling-pin', motion: 'roll', direction: 'right', strokes: 2 }),
  rollUp: step('gesture', 'ROLL', { tool: 'sushi-mat', motion: 'roll', direction: 'up', strokes: 1 }),
  flip: step('gesture', 'FLIP', { tool: 'k-spatula', motion: 'flip', direction: 'up', strokes: 1 }),
  // The closed container itself is shaken side to side (no separate shaker tool).
  shake: step('gesture', 'SHAKE', { tool: null, motion: 'shake', direction: 'right', strokes: 4 }),
  press: step('gesture', 'PRESS', { tool: null, motion: 'press', direction: 'down', strokes: 3 }),
  mash: step('gesture', 'MASH', { tool: 'k-masher', motion: 'press', direction: 'down', strokes: 3 }),
  knead: step('gesture', 'KNEAD', { tool: null, motion: 'press', direction: 'down', strokes: 3 }),
  fold: step('gesture', 'FOLD', { tool: null, motion: 'fold', direction: 'up', strokes: 1 }),
});

export const COLOR = Object.freeze({
  ketchup: 0xd8342c, mustard: 0xf2b632, choc: 0x6b3a22, white: 0xfff6e8, pink: 0xf7a8c4, soy: 0x4a2a1a,
  syrup: 0xc9822e, honey: 0xf0b53a, caramel: 0xd08a2e, cream: 0xfffaf0, batter: 0xf6e2b0, tomato: 0xd8452c,
  broth: 0xe9a85a, milk: 0xfffdf6, mince: 0x8a4a2a, egg: 0xf7d046, bbq: 0xb8461f, matcha: 0x8fbf5a, strawberry: 0xe8607a,
  hot: 0xd6311e, oil: 0xd9a441,
});
const SALT = [0xffffff, 0xf4efe6];
const PEPPER_SALT = [0xffffff, 0x3a2a20];
const SEASON = [0xc0612b, 0x8a4a22, 0xf3d36b];
const CHILI = [0xd6311e, 0xb0201a, 0xf08a3a];
const RAINBOW = [0xff6f91, 0xffc75f, 0x4ecdc4, 0x845ec2, 0x7bd389, 0xffffff];
const CINNAMON = [0xb87333, 0xf3e1c0, 0xffffff];
const CHEESE = [0xf6d36a, 0xf0c24a];
const SESAME = [0xfff3d6, 0xf3dfb0];
const MATCHA = [0x8fbf5a, 0x7aa84a];
const CORN_DOG_ZONE = { dx: 0.05, dy: -0.05, rx: 0.4, ry: 0.1, angle: -50 };

// `reaction`: the heroine's eating reaction ('spicy' fire, 'cold' frost, 'hot' steam), see ui/reactions.js.
const recipe = (number, slug, title, uniqueMechanic, steps, extra = {}) => ({ number, slug, title, uniqueMechanic, steps, ...extra });

export function foodTexture(recipeDef, stage) {
  return `food-${String(recipeDef.number).padStart(2, '0')}-${recipeDef.slug}-${stage}`;
}

// Levels 2–5 use the classic campaign art; Level 1 (approved checkpoint) stays in levels.js.
export const CLASSIC_STEPS = Object.freeze({
  'ramen-02': [
    S.place('place-noodles', 'Put the noodles in the pot', { base: 'pot-empty', item: 'noodles', result: 'pot-noodles', keep: false }),
    S.pour('pour-broth', 'Pour in the broth', { base: 'pot-noodles', tool: 'broth', result: 'ramen-boiling', liquid: COLOR.broth }),
    S.cook('cook-ramen', 'Turn on the heat, tap when soft', { base: 'ramen-boiling', heat: 'stove', effect: 'steam' }),
    S.sprinkle('add-seasoning', 'Season the broth', { base: 'ramen-boiling', tool: 'seasoning', colors: SEASON }),
    S.tipIn('serve-ramen', 'Pour it into the bowl', { base: 'bowl-empty', item: 'ramen-boiling', result: 'ramen-plain', color: COLOR.broth }),
    S.place('add-egg', 'Add the egg', { base: 'ramen-plain', item: 'egg', pieceSize: 0.3, spread: 0.12 }),
    S.tipIn('finish-ramen', 'Add the toppings', { base: 'ramen-plain', item: 'ramen-toppings', result: 'ramen-finished', color: 0x7bc96f }),
  ],
  'pizza-03': [
    S.roll('roll-dough', 'Roll the dough flat', { base: 's-dough-ball', result: 'food-24-mini-pepperoni-pizza-prep' }),
    S.spread('spread-sauce', 'Spread the tomato sauce', { base: 'food-24-mini-pepperoni-pizza-prep', result: 'dough-sauced', tool: 'k-ladle', turns: 1.25 }),
    S.sprinkle('add-cheese', 'Sprinkle the cheese', { base: 'dough-sauced', tool: 's-shredded-cheese', particle: 'shred', colors: CHEESE, length: 1.4 }),
    S.assemble('add-pizza-toppings', 'Place the pepperoni and peppers', {
      base: 'dough-sauced', pieceSize: 0.13, spread: 0.26,
      sequence: [{ item: 'p-pepperoni' }, { item: 'p-pepperoni' }, { item: 'p-green-pepper' }, { item: 'p-pepperoni', result: 'pizza-raw' }],
    }),
    S.bake('bake-pizza', 'Bake it in the oven', { item: 'pizza-raw', cooking: 'oven-baking', brown: false, result: 'pizza-finished' }),
    S.cut('cut-pizza', 'Slice the pizza', { base: 'pizza-finished', tool: 'pizza-cutter', direction: 'right', strokes: 2, result: 'pizza-sliced' }),
  ],
  'sushi-04': [
    S.tipIn('place-rice', 'Spread rice on the nori', { base: 'nori', item: 'rice', result: 'nori-rice', color: 0xffffff }),
    S.place('add-filling', 'Line up the fillings', { base: 'nori-rice', item: 'sushi-fillings', placements: 2, result: 'sushi-open', pieceSize: 0.24 }),
    S.rollUp('roll-sushi', 'Roll it up with the mat', { base: 'sushi-open', result: 'sushi-roll' }),
    S.cut('slice-sushi', 'Slice the roll', { base: 'sushi-roll', result: 'sushi-cut', strokes: 4 }),
    S.serve('serve-sushi', 'Arrange it on the plate', { base: 'lobby-plate', item: 'sushi-cut', result: 'sushi-finished', tip: false }),
  ],
  // Fixed 2026-10-08: the cup already showed a lid and straw before "Seal the cup", and sealing was a
  // tap on an unrelated machine. Now: lid on → shake the closed cup → push in the straw.
  'bubble-tea-05': [
    S.tipIn('add-pearls', 'Add tapioca pearls', { base: 'tea-cup', item: 'pearls', result: 'cup-pearls', color: 0x3a2420 }),
    S.pour('pour-syrup', 'Pour the brown sugar syrup', { base: 'cup-pearls', tool: 'syrup', result: 'cup-syrup', liquid: COLOR.syrup }),
    S.pour('pour-tea', 'Pour the milk tea', { base: 'cup-syrup', tool: 'milk-tea', result: 'cup-tea', liquid: 0xd9b48a }),
    S.assemble('add-ice', 'Drop in ice cubes', { base: 'cup-tea', pieceSize: 0.14, spread: 0.12, sequence: [{ item: 'p-ice-cube' }, { item: 'p-ice-cube' }, { item: 'p-ice-cube', result: 'cup-ice' }] }),
    S.place('lid-tea', 'Put the lid on', { base: 'cup-ice', item: 'p-dome-lid', result: 'cup-lidded', keep: false, toolSize: 0.38 }),
    S.shake('shake-tea', 'Shake the cup', { base: 'cup-lidded', color: 0xf3dcc0 }),
    S.place('straw-tea', 'Push in the straw', { base: 'cup-lidded', item: 'p-straw', result: 'bubble-tea-full', keep: false }),
  ],
});

// Reactions and final sprites for the classic levels (read by levels.js).
export const CLASSIC_EXTRA = Object.freeze({
  'ramen-02': { reaction: 'hot' },
  'pizza-03': { finalTexture: 'pizza-sliced' },
  'bubble-tea-05': { reaction: 'cold', finalTexture: 'bubble-tea-full' },
});

export const NEW_RECIPE_DEFINITIONS = Object.freeze([
  recipe(6, 'corn-dogs', 'Corn Dogs', 'Skewer, dunk, crumb, fry, then draw your own sauce', [
    S.place('skewer-sausage', 'Push the stick into the sausage', { base: 's-sausage', item: 'k-skewers', result: '@raw', keep: false }),
    S.dip('dip-corn-dog', 'Dip it in the batter', { base: 'k-bowl-batter', item: '@raw', result: 's-cd-battered', color: COLOR.batter }),
    S.coat('coat-corn-dog', 'Roll it in breadcrumbs', { item: 's-cd-battered', result: 's-cd-crumbed' }),
    S.fry('fry-corn-dog', 'Fry until golden, then tap', { item: 's-cd-crumbed', cooking: 's-cd-frying', result: 's-cd-golden' }),
    S.squeeze('ketchup-corn-dog', 'Zigzag the ketchup', { base: 's-cd-golden', tool: 'k-ketchup', color: COLOR.ketchup, zone: CORN_DOG_ZONE, length: 1.3 }),
    S.squeeze('mustard-corn-dog', 'Zigzag the mustard', { base: 's-cd-golden', tool: 'k-mustard', color: COLOR.mustard, zone: CORN_DOG_ZONE, length: 1.3, result: '@final' }),
  ]),
  recipe(7, 'pancakes', 'Pancakes', 'Pour, whisk, wait for the bubbles, flip and slide onto the plate', [
    S.pour('milk-pancake', 'Pour the milk into the flour', { base: 'k-bowl-mix', tool: 'k-milk-jug', liquid: COLOR.milk }),
    S.whisk('mix-pancake-batter', 'Whisk the batter', { base: 'k-bowl-mix', result: 'k-bowl-batter' }),
    S.pour('pour-pancake', 'Ladle batter into the pan', { base: 'k-pan-pink', tool: 'k-ladle', result: '@prep', liquid: COLOR.batter }),
    S.cook('cook-pancake', 'Cook until bubbles appear, then flip', { base: '@prep', heat: 'stove', effect: 'sizzle', ready: 's-pancake-bubbly', result: '@prep' }),
    S.flip('flip-pancake', 'Flip it with the spatula', { base: '@prep', result: '@cooked' }),
    S.tipIn('stack-pancakes', 'Slide the pancakes onto the plate', { base: 'lobby-plate', item: '@cooked', result: 's-pancake-stack', color: 0xe9a34a }),
    S.pour('syrup-pancakes', 'Pour the syrup and serve', { base: 's-pancake-stack', tool: 'syrup', liquid: COLOR.syrup, result: '@final' }),
  ]),
  recipe(8, 'burger', 'Burger', 'Season, sear, flip, melt the cheese and build the stack', [
    S.sprinkle('season-patty', 'Season the patty', { base: '@raw', colors: PEPPER_SALT }),
    S.place('pan-patty', 'Put the patty in the pan', { base: 'k-pan', item: '@raw', result: 's-patty-pan', keep: false }),
    S.cook('cook-patty', 'Sear it, tap when browned', { base: 's-patty-pan', heat: 'stove', effect: 'sizzle', brown: true }),
    S.flip('flip-patty', 'Flip the patty', { base: 's-patty-pan', result: '@prep' }),
    S.place('cheese-patty', 'Melt a cheese slice on top', { base: '@prep', item: 's-cheese-slice', pieceSize: 0.3, spread: 0.05 }),
    S.assemble('assemble-burger', 'Build it: patty, tomato, top bun', {
      base: 's-bun-lettuce', pieceSize: 0.3, spread: 0.06,
      sequence: [{ item: 'p-patty-cheese', result: 's-burger-cheese' }, { item: 's-tomato-slices' }, { item: 's-top-bun', result: '@final' }],
    }),
  ]),
  recipe(9, 'donuts', 'Donuts', 'Knead, roll, stamp out rings, fry and decorate', [
    S.knead('knead-donut-dough', 'Knead the dough', { base: 's-dough-ball' }),
    S.roll('roll-donut-dough', 'Roll the dough flat', { base: 's-dough-ball', result: 's-dough-sheet-plain' }),
    S.cutOut('cut-donuts', 'Cut out the rings', { base: 's-dough-sheet-plain', placements: 3, result: '@raw', spread: 0.2 }),
    S.fry('fry-donuts', 'Fry, then tap to lift them out', { item: '@raw', cooking: '@prep', result: '@cooked' }),
    S.pipe('glaze-donuts', 'Drizzle the pink glaze', { base: '@cooked', color: COLOR.pink, zone: { rx: 0.36, ry: 0.32 } }),
    S.sprinkle('sprinkle-donuts', 'Shake on sprinkles', { base: '@cooked', tool: 'k-sprinkles', particle: 'rod', colors: RAINBOW, zone: { rx: 0.36, ry: 0.32 }, result: '@final' }),
  ]),
  recipe(10, 'french-fries', 'French Fries', 'Whole potato → peeled → strips → fried → salted', [
    S.peel('peel-potatoes', 'Peel the potato', { base: '@raw', result: 's-potato-peeled', color: 0xb98a55 }),
    S.cut('slice-fries', 'Cut it into strips', { base: 's-potato-peeled', result: '@prep', strokes: 4 }),
    S.fry('fry-fries', 'Fry, then tap to lift the basket', { item: '@prep', cooking: 's-fries-basket', result: '@cooked' }),
    S.sprinkle('salt-fries', 'Salt the fries', { base: '@cooked', colors: SALT }),
    S.serve('serve-fries', 'Tip them onto the plate', { item: '@cooked', result: '@final', color: 0xf2c14e }),
  ]),
  recipe(11, 'tacos', 'Tacos', 'Fill soft tortillas, add hot sauce and fold them', [
    S.chop('chop-taco-veg', 'Chop the tomato', { base: 'tomato', result: 's-tomato-slices', strokes: 3 }),
    S.cook('cook-taco-filling', 'Cook the meat, tap when browned', { base: 'k-pan', item: '@prep', cooking: '@cooked', effect: 'sizzle' }),
    S.scoop('fill-tacos', 'Spoon the meat onto the tortillas', { base: 'tortillas-plate', placements: 3, color: COLOR.mince, spread: 0.26 }),
    S.assemble('top-tacos', 'Add lettuce and tomato', { base: 'tortillas-plate', sequence: [{ item: 's-lettuce' }, { item: 's-tomato-slices' }], pieceSize: 0.2, spread: 0.24 }),
    S.squeeze('hot-sauce-tacos', 'Add the hot sauce', { base: 'tortillas-plate', tool: 'k-hot-sauce', color: COLOR.hot, length: 1.2 }),
    S.fold('fold-tacos', 'Fold the tacos', { base: 'tortillas-plate', result: '@final' }),
  ], { reaction: 'spicy' }),
  recipe(12, 'tomato-pasta', 'Pasta with Tomato Sauce', 'Boil, drain, plate, sauce and grate cheese on top', [
    S.boil('boil-pasta', 'Boil the pasta, tap when soft', { item: '@raw', cooking: '@prep' }),
    S.drain('drain-pasta', 'Drain it in the colander', { item: '@prep', result: '@cooked', color: 0x9fd2ff }),
    S.serve('plate-pasta', 'Tip it onto the plate', { item: '@cooked', result: 'pasta-plain', color: 0xf3d58a }),
    S.pour('sauce-pasta', 'Ladle on the tomato sauce', { base: 'pasta-plain', tool: 'k-ladle', liquid: COLOR.tomato }),
    S.grate('grate-pasta-cheese', 'Grate cheese on top', { base: 'pasta-plain', color: 0xfff1b0, result: '@final' }),
  ]),
  recipe(13, 'mochi', 'Mochi', 'Pound the dough, fill it and pinch it closed', [
    S.stir('mix-mochi', 'Mix the rice flour dough', { base: '@raw', result: '@prep' }),
    S.knead('pound-mochi', 'Pound the dough', { base: '@prep' }),
    S.place('fill-mochi', 'Add strawberry filling', { base: '@prep', item: 's-strawberry-slices', placements: 2, pieceSize: 0.2, result: '@cooked' }),
    S.fold('pinch-mochi', 'Pinch them closed', { base: '@cooked', result: '@final' }),
  ]),
  recipe(14, 'onigiri', 'Onigiri', 'Fill and press rice into triangles', [
    S.sprinkle('salt-onigiri', 'Salt the rice', { base: '@raw', colors: SALT }),
    S.place('fill-onigiri', 'Add the salmon filling', { base: '@raw', item: 'p-salmon', result: '@prep', keep: false }),
    S.press('shape-onigiri', 'Press into a triangle', { base: '@prep', result: '@cooked' }),
    S.place('wrap-onigiri-nori', 'Wrap with nori', { base: '@cooked', item: 'nori', result: '@final', keep: false }),
  ]),
  recipe(15, 'chicken-nuggets', 'Chicken Nuggets', 'Egg wash and breadcrumbs before frying', [
    S.dip('dip-nuggets', 'Dip the chicken in egg', { base: 'k-egg-bowl', item: '@raw', result: '@raw', color: COLOR.egg }),
    S.coat('coat-nuggets', 'Coat with breadcrumbs', { item: '@raw', result: '@prep' }),
    S.fry('fry-nuggets', 'Fry, then tap to lift them out', { item: '@prep', cooking: '@cooked' }),
    S.sprinkle('salt-nuggets', 'Salt them', { base: '@cooked', colors: SALT }),
    S.serve('serve-nuggets', 'Tip them onto the plate', { item: '@cooked', result: '@final', color: 0xe9a34a }),
  ]),
  recipe(16, 'waffles-ice-cream', 'Waffles with Ice Cream', 'Fill the iron, bake, and top with a cold scoop', [
    S.pour('fill-waffle-iron', 'Ladle batter into the waffle iron', { base: 'waffle-iron-empty', tool: 'k-ladle', liquid: COLOR.batter, result: '@prep' }),
    S.cook('cook-waffle', 'Close the iron, open when crisp', { base: '@prep', effect: 'steam', result: '@cooked' }),
    S.place('plate-waffles', 'Put two waffles on the plate', { base: 'lobby-plate', item: '@cooked', placements: 2, pieceSize: 0.55, spread: 0.05 }),
    S.place('scoop-ice-cream', 'Add a scoop of ice cream', { base: 'lobby-plate', item: 'p-ice-cream-scoop', pieceSize: 0.24, spread: 0.05 }),
    S.place('berries-waffles', 'Add blueberries', { base: 'lobby-plate', item: 's-blueberries', placements: 2, pieceSize: 0.14, result: '@final' }),
    S.pipe('chocolate-waffles', 'Drizzle chocolate', { base: '@final', color: COLOR.choc }),
  ], { reaction: 'cold' }),
  recipe(17, 'mini-hot-dogs', 'Mini Hot Dogs', 'Cook a batch, tuck into buns and sauce every one', [
    S.cook('cook-mini-sausages', 'Cook the sausages, tap when browned', { base: 'k-pan', item: 'p-mini-sausages', cooking: '@prep', effect: 'sizzle' }),
    S.tipIn('bun-mini-dogs', 'Tuck the sausages into the buns', { base: 'hotdog-buns', item: '@prep', result: 'hotdogs-plain', color: 0xb5583a }),
    S.squeeze('ketchup-mini-dogs', 'Zigzag the ketchup', { base: 'hotdogs-plain', tool: 'k-ketchup', color: COLOR.ketchup }),
    S.squeeze('mustard-mini-dogs', 'Zigzag the mustard', { base: 'hotdogs-plain', tool: 'k-mustard', color: COLOR.mustard, result: '@final' }),
  ]),
  recipe(18, 'mac-cheese', 'Mac and Cheese', 'Boil, drain, then build a creamy cheese sauce in the bowl', [
    S.boil('boil-macaroni', 'Boil the macaroni, tap when soft', { item: '@raw', cooking: '@prep' }),
    S.drain('drain-macaroni', 'Drain it in the colander', { item: '@prep', result: '@cooked', color: 0x9fd2ff }),
    S.tipIn('bowl-macaroni', 'Tip it into the bowl', { base: 'bowl-empty', item: '@cooked', result: 'mac-plain', color: 0xf3d58a }),
    S.pour('milk-mac-cheese', 'Pour in the milk', { base: 'mac-plain', tool: 'k-milk-jug', liquid: COLOR.cream }),
    S.grate('grate-mac-cheese', 'Grate in the cheese', { base: 'mac-plain' }),
    S.stir('mix-mac-cheese', 'Stir until creamy', { base: 'mac-plain', result: '@final', turns: 1.6 }),
  ]),
  recipe(19, 'chocolate-strawberries', 'Chocolate-Covered Strawberries', 'Melt, dip and stripe each berry', [
    S.cook('melt-chocolate', 'Melt the chocolate, tap when smooth', { base: 'choc-chopped', heat: 'stove', effect: 'steam', result: '@prep' }),
    S.stir('stir-chocolate', 'Stir until glossy', { base: '@prep' }),
    S.dip('dip-strawberries', 'Dip the strawberry', { base: '@prep', item: 'p-strawberry', result: '@cooked', color: COLOR.choc, itemSize: 0.3 }),
    S.pipe('stripe-strawberries', 'Pipe white stripes', { base: '@cooked', color: COLOR.white, result: '@final' }),
  ]),
  recipe(20, 'cake-pops', 'Cake Pops', 'Crumble, roll balls, stick, dip and sprinkle', [
    S.press('crumble-cake', 'Crumble the cake', { base: '@raw', result: '@prep' }),
    S.press('roll-cake-balls', 'Roll it into balls', { base: '@prep', result: 'cake-balls', strokes: 2 }),
    S.place('stick-cake-pops', 'Push in the sticks', { base: 'cake-balls', item: 'k-skewers', placements: 3, keep: false, result: '@cooked' }),
    S.dip('dip-cake-pops', 'Dip them in pink candy melt', { base: 's-glaze-bowl', item: '@cooked', result: '@final', color: COLOR.pink }),
    S.sprinkle('sprinkle-cake-pops', 'Shake on sprinkles', { base: '@final', tool: 'k-sprinkles', particle: 'rod', colors: RAINBOW }),
  ]),
  recipe(21, 'skewers', 'Skewers', 'Thread the pieces, sprinkle with spices and grill', [
    S.chop('chop-skewer-veg', 'Chop the vegetables', { base: '@raw' }),
    S.place('thread-skewers', 'Thread them onto sticks', { base: '@raw', item: 'k-skewers', placements: 2, keep: false, result: '@prep' }),
    S.sprinkle('season-skewers', 'Sprinkle with spices', { base: '@prep', tool: 'seasoning', colors: CHILI, length: 1.3, result: '@cooked' }),
    S.cook('grill-skewers', 'Grill them, tap when charred', { base: '@cooked', heat: 'stove', effect: 'sizzle', brown: true, result: '@final' }),
  ], { reaction: 'spicy' }),
  recipe(22, 'eggs-bacon', 'Eggs and Bacon', 'Crisp the bacon and crack eggs beside it', [
    S.cook('fry-bacon', 'Fry the bacon, tap when crispy', { base: 'k-pan', item: 'p-bacon', cooking: '@prep', effect: 'sizzle' }),
    S.flip('flip-bacon', 'Flip the bacon', { base: '@prep' }),
    S.crack('crack-eggs', 'Crack two eggs into the pan', { base: '@prep', placements: 2, result: '@cooked' }),
    S.cook('cook-eggs', 'Cook the eggs, tap when set', { base: '@cooked', heat: 'stove', effect: 'sizzle' }),
    S.serve('plate-breakfast', 'Slide it onto the plate', { item: '@cooked', result: '@final', color: 0xf7d046 }),
  ]),
  recipe(23, 'sandwich', 'Sandwich', 'Squeeze on mayo, layer the fillings, close and cut diagonally', [
    S.cut('slice-sandwich-veg', 'Slice the tomato', { base: 'tomato', result: 's-tomato-slices' }),
    S.squeeze('mayo-sandwich', 'Squeeze on the mayo', { base: 'p-bread-slice', tool: 'k-piping-bag', color: COLOR.cream, length: 1.2, zone: { rx: 0.3, ry: 0.22 }, result: '@prep' }),
    S.assemble('assemble-sandwich', 'Layer lettuce, tomato, cheese and bread', {
      base: '@prep', pieceSize: 0.3, spread: 0.08,
      sequence: [{ item: 's-lettuce' }, { item: 's-tomato-slices' }, { item: 's-cheese-slice' }, { item: 'p-bread-slice', result: '@cooked' }],
    }),
    S.cut('cut-sandwich', 'Cut it diagonally', { base: '@cooked', result: '@final', strokes: 1 }),
  ]),
  // Distinct from Level 3 Pizza: kneaded, squeezed sauce spiral, grated cheese and chili flakes.
  recipe(24, 'mini-pepperoni-pizza', 'Mini Pepperoni Pizza', 'Knead, roll, spiral the sauce, grate, top and add chili', [
    S.knead('knead-mini-pizza', 'Knead the dough', { base: '@raw' }),
    S.roll('roll-mini-pizza', 'Roll it flat', { base: '@raw', result: '@prep' }),
    S.squeeze('sauce-mini-pizza', 'Swirl on the tomato sauce', { base: '@prep', tool: 'k-ketchup', color: COLOR.tomato, length: 1.6 }),
    S.grate('cheese-mini-pizza', 'Grate the cheese on top', { base: '@prep', result: '@cooked' }),
    S.place('pepperoni-mini-pizza', 'Add pepperoni', { base: '@cooked', item: 'p-pepperoni', placements: 3, pieceSize: 0.13, spread: 0.24 }),
    S.bake('bake-mini-pizza', 'Bake it in the oven', { item: '@cooked', cooking: 'oven-baking', brown: false, result: '@final' }),
    S.sprinkle('chili-mini-pizza', 'Sprinkle chili flakes', { base: '@final', tool: 'seasoning', colors: CHILI }),
  ], { reaction: 'spicy' }),
  recipe(25, 'egg-fried-rice', 'Egg Fried Rice', 'Scramble egg in the pan, then fry the rice', [
    S.whisk('beat-rice-egg', 'Beat the egg', { base: '@prep' }),
    S.pour('egg-into-pan', 'Pour the egg into the pan', { base: 'k-pan', tool: '@prep', liquid: COLOR.egg }),
    S.tipIn('rice-into-pan', 'Add the rice', { base: 'k-pan', item: '@raw', result: '@cooked', color: 0xffffff }),
    S.cook('stir-fry-rice', 'Stir-fry, tap when steaming', { base: '@cooked', heat: 'stove', effect: 'sizzle' }),
    S.place('onion-fried-rice', 'Add green onion', { base: '@cooked', item: 's-green-onion', placements: 2, pieceSize: 0.16 }),
    S.squeeze('soy-fried-rice', 'Season with soy sauce', { base: '@cooked', tool: 'k-soy-bottle', color: COLOR.soy, result: '@final' }),
  ]),
  recipe(26, 'udon', 'Udon', 'Knead, roll and cut thick noodles by hand', [
    S.knead('knead-udon', 'Knead the noodle dough', { base: '@raw' }),
    S.roll('roll-udon', 'Roll the dough flat', { base: '@raw', result: '@prep' }),
    S.cut('slice-udon', 'Cut thick noodles', { base: '@prep', result: '@cooked', strokes: 5 }),
    S.boil('boil-udon', 'Boil the noodles, tap when soft', { item: '@cooked', result: '@cooked' }),
    S.tipIn('bowl-udon', 'Put the noodles in the bowl', { base: 'bowl-empty', item: '@cooked', result: 'udon-bowl', color: 0xfff6e8 }),
    S.pour('broth-udon', 'Pour the hot broth', { base: 'udon-bowl', tool: 'broth', liquid: COLOR.broth }),
    S.tipIn('toppings-udon', 'Add the toppings', { base: 'udon-bowl', item: 's-green-onion', result: '@final', color: 0x7bc96f, toolSize: 0.3 }),
  ], { reaction: 'hot' }),
  // Distinct from Level 4 Sushi: rice is spread with the spoon, three separate fillings, sesame oil.
  recipe(27, 'kimbap', 'Kimbap', 'Spread rice, lay three fillings, roll tight, oil and slice', [
    S.spread('rice-kimbap', 'Spread the rice on the seaweed', { base: 'nori', result: '@raw' }),
    S.assemble('fill-kimbap', 'Lay egg, carrot and spinach', { base: '@raw', pieceSize: 0.24, spread: 0.12, sequence: [{ item: 'p-egg-strip' }, { item: 'p-carrot-strips' }, { item: 'p-spinach', result: '@prep' }] }),
    S.rollUp('roll-kimbap', 'Roll it tightly', { base: '@prep', result: '@cooked' }),
    S.brush('oil-kimbap', 'Brush on sesame oil', { base: '@cooked' }),
    S.cut('slice-kimbap', 'Slice even pieces', { base: '@cooked', result: '@final', strokes: 4 }),
    S.sprinkle('sesame-kimbap', 'Sprinkle sesame seeds', { base: '@final', colors: SESAME }),
  ]),
  recipe(28, 'fruit-salad', 'Fruit Salad', 'Peel and chop mixed fruit, tip it into the bowl and drizzle honey', [
    S.peel('peel-fruit', 'Peel the fruit', { base: '@raw', result: '@prep', color: 0xd9c46a, strokes: 2 }),
    S.chop('chop-fruit', 'Chop bite-size pieces', { base: '@prep', result: '@cooked' }),
    S.tipIn('bowl-fruit', 'Tip it into the glass bowl', { base: 'glass-bowl', item: '@cooked', result: '@final', color: 0xf7c04a }),
    S.place('berries-fruit', 'Add strawberries', { base: '@final', item: 's-strawberry-slices', placements: 2, pieceSize: 0.18, spread: 0.18 }),
    S.squeeze('honey-fruit', 'Drizzle honey', { base: '@final', tool: 'k-honey', color: COLOR.honey }),
  ]),
  recipe(29, 'chocolate-banana', 'Chocolate Banana', 'Peel, stick and dunk a whole banana', [
    S.peel('peel-banana', 'Peel the banana', { base: '@raw', color: 0xf2d24b, strokes: 2, result: 'banana-peeled' }),
    S.place('skewer-banana', 'Push in the stick', { base: 'banana-peeled', item: 'k-skewers', keep: false, result: 'banana-stick' }),
    S.dip('dip-banana', 'Dunk it in chocolate', { base: 'choc-bowl', item: 'banana-stick', result: 'choco-banana-plain', color: COLOR.choc }),
    S.sprinkle('sprinkle-banana', 'Shake on sprinkles', { base: 'choco-banana-plain', tool: 'k-sprinkles', particle: 'rod', colors: RAINBOW, zone: { rx: 0.14, ry: 0.3, angle: 20 }, result: '@final' }),
  ]),
  recipe(30, 'cupcakes', 'Cupcakes', 'Fill the liners, bake, then pipe tall frosting swirls', [
    S.scoop('fill-cupcake-liners', 'Spoon batter into the liners', { base: '@prep', item: 'k-scoop', placements: 3, color: COLOR.batter, spread: 0.26 }),
    S.bake('bake-cupcakes', 'Bake the cupcakes', { item: '@prep', result: '@cooked' }),
    S.pipe('frost-cupcakes', 'Pipe the frosting', { base: '@cooked', color: COLOR.pink, length: 1.8 }),
    S.sprinkle('sprinkle-cupcakes', 'Shake on sprinkles', { base: '@cooked', tool: 'k-sprinkles', particle: 'rod', colors: RAINBOW, result: '@final' }),
  ]),
  recipe(31, 'churros', 'Churros', 'Pipe long strips, cut, fry, sugar and add chocolate', [
    S.pipe('pipe-churros', 'Pipe long strips', { base: 'k-board', color: COLOR.batter, result: '@prep', zone: { rx: 0.36, ry: 0.2 } }),
    S.cut('cut-churros', 'Cut equal lengths', { base: '@prep', result: '@cooked' }),
    S.fry('fry-churros', 'Fry, then tap to lift them out', { item: '@cooked', result: 'churros-fried' }),
    S.sprinkle('sugar-churros', 'Shake on cinnamon sugar', { base: 'churros-fried', tool: 'k-cinnamon', colors: CINNAMON }),
    S.place('chocolate-churros', 'Add the chocolate dip', { base: 'churros-fried', item: 'p-choc-cup', keep: false, result: '@final' }),
  ]),
  recipe(32, 'caramel-popcorn', 'Caramel Popcorn', 'Pop the corn, then coat it in caramel', [
    S.tipIn('kernels-popcorn', 'Pour the kernels into the pot', { base: 'k-pot', item: '@raw', result: '@prep', color: 0xf2c14e, toolSize: 0.34 }),
    S.cook('pop-popcorn', 'Heat until it pops', { base: '@prep', heat: 'stove', effect: 'steam', result: '@cooked' }),
    S.pour('caramel-popcorn', 'Pour the caramel', { base: '@cooked', tool: 'k-ladle', liquid: COLOR.caramel }),
    S.toss('coat-popcorn', 'Toss to coat every piece', { base: '@cooked', result: '@final' }),
  ]),
  recipe(33, 'chicken-wings', 'Chicken Wings', 'Season, fry and toss in hot sauce', [
    S.sprinkle('season-wings', 'Season the wings', { base: '@raw', colors: SEASON, result: '@prep' }),
    S.fry('fry-wings', 'Fry, then tap to lift them out', { item: '@prep', cooking: '@cooked', result: 'wings-fried' }),
    S.squeeze('sauce-wings', 'Add the hot sauce', { base: 'wings-fried', tool: 'k-hot-sauce', color: COLOR.hot }),
    S.toss('toss-wings', 'Toss until glazed', { base: 'wings-fried', result: '@final' }),
  ], { reaction: 'spicy' }),
  recipe(34, 'cheese-sticks', 'Cheese Sticks', 'Cut, bread and fry cheese batons', [
    S.cut('slice-cheese-sticks', 'Cut the cheese into sticks', { base: '@raw' }),
    S.dip('egg-cheese-sticks', 'Dip in egg', { base: 'k-egg-bowl', item: '@raw', result: '@prep', color: COLOR.egg }),
    S.coat('coat-cheese-sticks', 'Coat with breadcrumbs', { item: '@prep', result: '@cooked' }),
    S.fry('fry-cheese-sticks', 'Fry, then tap to lift them out', { item: '@cooked', result: '@final' }),
  ]),
  recipe(35, 'potato-wedges', 'Potato Wedges', 'Cut thick wedges, season, fry and shake the basket', [
    S.cut('slice-potato-wedges', 'Cut thick wedges', { base: '@raw', result: '@prep', strokes: 4 }),
    S.sprinkle('season-wedges', 'Season the wedges', { base: '@prep', colors: SEASON, result: '@cooked' }),
    S.fry('fry-wedges', 'Fry, then tap to lift the basket', { item: '@cooked', result: '@final' }),
    S.shake('shake-wedges', 'Shake off the oil', { base: '@final', strokes: 3, color: 0xf2c14e }),
    S.pipe('cream-wedges', 'Add a dollop of sour cream', { base: '@final', color: COLOR.cream, length: 0.8 }),
  ]),
  recipe(36, 'omurice', 'Omurice', 'Fry the rice, wrap it in omelette and draw on it', [
    S.chop('chop-omurice-veg', 'Chop the vegetables', { base: '@raw' }),
    S.cook('fry-omurice-rice', 'Fry the rice, tap when hot', { base: 'k-pan', item: '@raw', cooking: '@prep', effect: 'sizzle' }),
    S.whisk('whisk-omurice-eggs', 'Whisk the eggs', { base: 'k-egg-bowl' }),
    S.cook('cook-omelette', 'Cook the omelette, tap when set', { base: 'k-pan', item: 'k-egg-bowl', cooking: '@cooked', effect: 'sizzle' }),
    S.fold('fold-omurice', 'Fold it over the rice', { base: '@cooked', result: 'omurice-plain' }),
    S.squeeze('ketchup-omurice', 'Draw a smile with ketchup', { base: 'omurice-plain', tool: 'k-ketchup', color: COLOR.ketchup, result: '@final' }),
  ]),
  recipe(37, 'gyoza', 'Fried Dumplings / Gyoza', 'Fill, pleat and pan-steam dumplings', [
    S.chop('chop-gyoza-filling', 'Chop the filling', { base: '@raw', result: '@prep' }),
    S.scoop('fill-gyoza', 'Spoon filling onto the wrapper', { base: 'gyoza-wrapper', color: 0xc9846a, result: '@cooked', spread: 0.05 }),
    S.press('pleat-gyoza', 'Pinch the pleats', { base: '@cooked', result: 'gyoza-raw' }),
    S.cook('fry-gyoza', 'Pan-fry and steam, tap when crisp', { base: 'k-pan', item: 'gyoza-raw', effect: 'steam', result: '@final' }),
  ]),
  recipe(38, 'croquettes', 'Croquettes', 'Mash, shape, crumb and fry potato patties', [
    S.boil('boil-croquette-potato', 'Boil the potatoes, tap when soft', { item: '@raw', result: '@raw' }),
    S.mash('mash-croquettes', 'Mash them', { base: '@raw', result: '@prep' }),
    S.press('shape-croquettes', 'Shape the patties', { base: '@prep', result: 'croquette-shaped', strokes: 2 }),
    S.coat('crumb-croquettes', 'Coat in breadcrumbs', { item: 'croquette-shaped', result: '@cooked' }),
    S.fry('fry-croquettes', 'Fry, then tap to lift them out', { item: '@cooked', result: '@final' }),
  ]),
  recipe(39, 'taiyaki', 'Taiyaki', 'Fill the fish mold, add red bean and close it', [
    S.pour('fill-taiyaki-mold', 'Ladle batter into the fish mold', { base: 'taiyaki-mold-empty', tool: 'k-ladle', liquid: COLOR.batter }),
    S.scoop('bean-taiyaki', 'Spoon in the red bean paste', { base: 'taiyaki-mold-empty', color: 0x6b2f2a, result: '@prep' }),
    S.fold('close-taiyaki-mold', 'Close the mold', { base: '@prep', result: '@cooked' }),
    S.cook('cook-taiyaki', 'Cook it, open when golden', { base: '@cooked', effect: 'steam', result: '@final' }),
  ]),
  recipe(40, 'egg-cheese-toast', 'Egg and Cheese Toast', 'Toast, crack an egg on top and melt cheese', [
    S.place('toast-into-pan', 'Put the bread in the pan', { base: 'k-pan', item: 'p-bread-slice', result: '@prep', keep: false }),
    S.crack('crack-toast-egg', 'Crack an egg on the toast', { base: '@prep', result: '@cooked' }),
    S.place('cheese-toast', 'Add a cheese slice', { base: '@cooked', item: 's-cheese-slice', pieceSize: 0.24 }),
    S.cook('cook-toast', 'Cook it, tap when the cheese melts', { base: '@cooked', heat: 'stove', effect: 'sizzle' }),
    S.serve('serve-toast', 'Fold it onto the plate', { item: '@cooked', result: '@final', color: 0xf7d046 }),
  ]),
  recipe(41, 'fruit-sandwich', 'Fruit Sandwich', 'Arrange fruit in cream and wrap it tight', [
    S.cut('slice-fruit-sandwich', 'Slice the strawberry', { base: 'p-strawberry', result: 's-strawberry-slices' }),
    S.spread('spread-fruit-cream', 'Spread the cream', { base: 'p-bread-slice', result: '@prep' }),
    S.place('arrange-fruit', 'Arrange the fruit', { base: '@prep', item: 's-strawberry-slices', placements: 2, pieceSize: 0.2, result: '@cooked' }),
    S.fold('wrap-fruit-sandwich', 'Close and wrap it tightly', { base: '@cooked', direction: 'right', result: '@final' }),
  ]),
  recipe(42, 'mini-strawberry-pancakes', 'Mini Strawberry Pancakes', 'Pipe tiny pancakes and stack them up', [
    S.pipe('pipe-mini-pancakes', 'Pipe small circles into the pan', { base: 'k-pan', color: COLOR.strawberry, result: '@prep', zone: { rx: 0.26, ry: 0.2, dx: -0.06 } }),
    S.cook('cook-mini-pancakes', 'Cook them, tap when bubbly', { base: '@prep', heat: 'stove', effect: 'sizzle', result: '@cooked' }),
    S.place('stack-mini-pancakes', 'Stack them on the plate', { base: 'lobby-plate', item: '@cooked', placements: 3, pieceSize: 0.42, spread: 0.04 }),
    S.place('berries-mini-pancakes', 'Add berries', { base: 'lobby-plate', item: 's-blueberries', placements: 2, pieceSize: 0.14 }),
    S.pour('syrup-mini-pancakes', 'Pour strawberry syrup', { base: 'lobby-plate', tool: 'syrup', liquid: COLOR.strawberry, result: '@final' }),
  ]),
  recipe(43, 'french-toast', 'French Toast', 'Soak bread in custard, fry and top', [
    S.pour('milk-french-toast', 'Pour milk onto the eggs', { base: '@raw', tool: 'k-milk-jug', liquid: COLOR.milk }),
    S.whisk('whisk-french-toast', 'Whisk the custard', { base: '@raw' }),
    S.press('soak-french-toast', 'Press the bread into the custard', { base: '@raw', result: '@prep', strokes: 1 }),
    S.cook('fry-french-toast', 'Fry it, tap when golden', { base: 'k-pan', item: '@prep', cooking: '@cooked', effect: 'sizzle' }),
    S.flip('flip-french-toast', 'Flip the toast', { base: '@cooked' }),
    S.pour('syrup-french-toast', 'Pour syrup and serve', { base: '@cooked', tool: 'syrup', liquid: COLOR.syrup, result: '@final' }),
  ]),
  recipe(44, 'chicken-wrap', 'Chicken Wrap', 'Cook seasoned chicken and roll a tight wrap', [
    S.cut('slice-wrap-chicken', 'Slice the chicken', { base: '@raw', strokes: 4 }),
    S.sprinkle('season-wrap-chicken', 'Season the chicken', { base: '@raw', colors: SEASON, result: '@prep' }),
    S.cook('cook-wrap-chicken', 'Cook it, tap when golden', { base: 'k-pan', item: '@prep', cooking: '@cooked', effect: 'sizzle' }),
    S.assemble('fill-wrap', 'Add chicken, lettuce and tomato', { base: 'tortilla-flat', pieceSize: 0.26, spread: 0.14, sequence: [{ item: '@cooked' }, { item: 's-lettuce' }, { item: 's-tomato-slices' }] }),
    S.fold('roll-chicken-wrap', 'Roll it tightly', { base: 'tortilla-flat', result: '@final' }),
  ]),
  recipe(45, 'nachos-cheese', 'Nachos with Cheese', 'Load the chips with cheese and jalapeños, melt and finish with cream', [
    S.grate('grate-nacho-cheese', 'Grate cheese over the chips', { base: '@raw' }),
    S.assemble('top-nachos', 'Add tomato and jalapeños', { base: '@raw', pieceSize: 0.18, spread: 0.2, sequence: [{ item: 's-tomato-slices' }, { item: 'p-jalapeno' }, { item: 'p-jalapeno', result: '@cooked' }] }),
    S.bake('bake-nachos', 'Melt it in the oven', { item: '@cooked', result: '@final' }),
    S.pipe('cream-nachos', 'Add sour cream', { base: '@final', color: COLOR.cream, length: 0.9 }),
  ], { reaction: 'spicy' }),
  // Distinct from Level 11 soft tacos: crispy shells, no folding, lime crema.
  recipe(46, 'mini-chicken-tacos', 'Mini Chicken Tacos', 'Fill crispy shells with chicken and top with crema', [
    S.sprinkle('season-mini-taco-chicken', 'Season the chicken', { base: '@raw', colors: SEASON, result: '@prep' }),
    S.cook('cook-mini-taco-chicken', 'Cook it, tap when golden', { base: 'k-pan', item: '@prep', cooking: '@cooked', effect: 'sizzle' }),
    S.scoop('fill-mini-tacos', 'Spoon chicken into the shells', { base: 'taco-shells', placements: 3, color: 0xb86a3a, spread: 0.26 }),
    S.assemble('top-mini-tacos', 'Add lettuce and tomato', { base: 'taco-shells', pieceSize: 0.18, spread: 0.24, sequence: [{ item: 's-lettuce' }, { item: 's-tomato-slices', result: '@final' }] }),
    S.pipe('crema-mini-tacos', 'Drizzle the crema', { base: '@final', color: COLOR.cream, length: 1 }),
  ]),
  recipe(47, 'chocolate-chip-cookies', 'Chocolate Chip Cookies', 'Fold in chips, scoop even balls and bake them golden', [
    S.place('chips-cookie-dough', 'Add the chocolate chips', { base: '@raw', item: 'p-choc-chips', placements: 2, pieceSize: 0.2 }),
    S.stir('mix-cookie-dough', 'Fold them into the dough', { base: '@raw' }),
    S.scoop('scoop-cookie-dough', 'Scoop balls onto the tray', { base: 'lobby-plate', item: 'k-scoop', placements: 3, color: 0xe8cf9a, result: '@cooked' }),
    S.bake('bake-cookies', 'Bake until golden', { item: '@cooked', result: '@final' }),
  ]),
  recipe(48, 'blueberry-muffins', 'Blueberry Muffins', 'Fold in berries, fill the tin and bake', [
    S.stir('mix-muffin-batter', 'Mix the batter', { base: '@raw' }),
    S.place('berries-muffins', 'Add blueberries', { base: '@raw', item: 's-blueberries', placements: 2, pieceSize: 0.14, result: '@prep' }),
    S.scoop('fill-muffin-tin', 'Scoop batter into the tin', { base: 'muffin-tin-empty', item: 'k-scoop', placements: 3, color: COLOR.batter, spread: 0.26, result: '@cooked' }),
    S.bake('bake-muffins', 'Bake until risen', { item: '@cooked', result: '@final' }),
    S.sprinkle('sugar-muffins', 'Dust with sugar', { base: '@final', colors: SALT }),
  ]),
  recipe(49, 'strawberry-milkshake', 'Strawberry Milkshake', 'Blend berries, milk and ice cream, pour and top', [
    S.cut('slice-milkshake-berries', 'Cut the strawberries', { base: '@raw', result: '@prep' }),
    S.tipIn('berries-blender', 'Add them to the blender', { base: 'blender-empty', item: '@prep', result: '@cooked', color: 0xe8607a }),
    S.pour('milk-milkshake', 'Pour in the milk', { base: '@cooked', tool: 'k-milk-jug', liquid: COLOR.milk }),
    S.place('ice-cream-milkshake', 'Add a scoop of ice cream', { base: '@cooked', item: 'p-ice-cream-scoop', pieceSize: 0.2, spread: 0.06 }),
    S.cook('blend-milkshake', 'Blend it, tap when smooth', { action: 'BLEND', base: '@cooked', effect: 'bubbles', result: 'blender-pink' }),
    S.pour('pour-milkshake', 'Pour it into the glass', { base: 'glass-empty', tool: 'blender-pink', liquid: 0xf4a6b8, result: 'milkshake-plain' }),
    S.pipe('cream-milkshake', 'Top with whipped cream', { base: 'milkshake-plain', color: COLOR.cream, result: '@final' }),
  ], { reaction: 'cold' }),
  // Distinct from Level 5 Bubble Tea: bamboo-whisked matcha, layered pour, no shaking.
  recipe(50, 'matcha-bubble-tea', 'Matcha Bubble Tea', 'Whisk matcha with bamboo, layer the drink and add the straw', [
    S.whisk('whisk-matcha', 'Whisk the matcha', { base: 'matcha-bowl', tool: 'k-chasen', toolAngle: 0, turns: 1.8 }),
    S.tipIn('pearls-matcha', 'Add tapioca pearls', { base: 'tea-cup', item: 'pearls', result: 'cup-pearls', color: 0x3a2420 }),
    S.assemble('ice-matcha', 'Drop in ice cubes', { base: 'cup-pearls', pieceSize: 0.14, spread: 0.12, sequence: [{ item: 'p-ice-cube' }, { item: 'p-ice-cube', result: '@cooked' }] }),
    S.pour('milk-matcha', 'Pour in the milk', { base: '@cooked', tool: 'k-milk-jug', liquid: COLOR.milk }),
    S.pour('pour-matcha', 'Layer the matcha on top', { base: '@cooked', tool: 'matcha-bowl', liquid: COLOR.matcha, result: '@bite' }),
    S.place('straw-matcha', 'Push in the straw', { base: '@bite', item: 'p-straw', result: '@final', keep: false }),
  ], { reaction: 'cold' }),
]);

export const REQUIRED_INTERACTIONS = Object.freeze([...new Set(
  [...Object.values(CLASSIC_STEPS).flat(), ...NEW_RECIPE_DEFINITIONS.flatMap((definition) => definition.steps)].map((item) => item.action),
)]);

export function validateRecipeCatalog() {
  if (NEW_RECIPE_DEFINITIONS.length !== 45) throw new Error(`Expected 45 new recipes, got ${NEW_RECIPE_DEFINITIONS.length}`);
  for (const [index, definition] of NEW_RECIPE_DEFINITIONS.entries()) {
    const expected = index + 6;
    if (definition.number !== expected) throw new Error(`Recipe order mismatch at Level ${expected}`);
    if (definition.steps.length < 4 || definition.steps.length > 8) throw new Error(`Level ${definition.number} has ${definition.steps.length} steps`);
    if (new Set(definition.steps.map((item) => item.id)).size !== definition.steps.length) throw new Error(`Duplicate step ID in Level ${definition.number}`);
  }
  return true;
}

validateRecipeCatalog();
