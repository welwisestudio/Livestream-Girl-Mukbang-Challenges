// Levels 2–50 cooking sequences (logic-first redesign, 2026-10-08; see project/RECIPE-PLAN.md).
// Every step names the real tool/ingredient and the food sprite before/after it. Texture values
// starting with '@' are this recipe's own atlas stages (raw, prep, cooked, final, bite); other
// values are shared keys (kitchen tools `k-*`, Levels 6–10 states `s-*`, classic campaign art).
// `todo` marks a step that still uses the nearest existing sprite until dedicated art exists.

const step = (kind, action, defaults = {}) => (id, instruction, options = {}) => ({ id, kind, action, instruction, ...defaults, ...options });

// Interaction verbs → engine step kinds.
export const S = Object.freeze({
  place: step('place', 'PLACE'),
  stack: step('place', 'STACK', { keep: false }),
  assemble: step('place', 'ASSEMBLE'),
  scoop: step('place', 'SCOOP', { item: 'k-spoon', leave: 'blob' }),
  crack: step('place', 'CRACK', { item: 'k-egg', keep: false }),
  drain: step('place', 'DRAIN', { base: 'k-colander', keep: false }),
  serve: step('place', 'SERVE', { base: 'lobby-plate', keep: false }),
  cutOut: step('place', 'CUT_OUT', { item: 'k-ring-cutter', stamp: true }),
  dip: step('dip', 'DIP'),
  coat: step('dip', 'COAT', { base: 'k-bowl-crumbs', color: 0xd9a85a }),
  whisk: step('stir', 'WHISK', { tool: 'k-whisk', turns: 1.5 }),
  stir: step('stir', 'STIR', { tool: 'k-spoon', turns: 1.3 }),
  spread: step('stir', 'SPREAD', { tool: 'k-spoon', turns: 1 }),
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
  shake: step('gesture', 'SHAKE', { motion: 'shake', direction: 'right', strokes: 3 }),
  press: step('gesture', 'PRESS', { tool: null, motion: 'press', direction: 'down', strokes: 3 }),
  knead: step('gesture', 'KNEAD', { tool: null, motion: 'press', direction: 'down', strokes: 3 }),
  fold: step('gesture', 'FOLD', { tool: null, motion: 'fold', direction: 'up', strokes: 1 }),
  seal: step('tap-process', 'SEAL'),
});

export const COLOR = Object.freeze({
  ketchup: 0xd8342c, mustard: 0xf2b632, choc: 0x6b3a22, white: 0xfff6e8, pink: 0xf7a8c4, soy: 0x4a2a1a,
  syrup: 0xc9822e, honey: 0xf0b53a, caramel: 0xd08a2e, cream: 0xfffaf0, batter: 0xf6e2b0, tomato: 0xd8452c,
  broth: 0xe9a85a, milk: 0xfffdf6, mince: 0x8a4a2a, egg: 0xf7d046, bbq: 0xb8461f, matcha: 0x8fbf5a, strawberry: 0xe8607a,
});
const SALT = [0xffffff, 0xf4efe6];
const PEPPER_SALT = [0xffffff, 0x3a2a20];
const SEASON = [0xc0612b, 0x8a4a22, 0xf3d36b];
const RAINBOW = [0xff6f91, 0xffc75f, 0x4ecdc4, 0x845ec2, 0x7bd389, 0xffffff];
const CINNAMON = [0xb87333, 0xf3e1c0, 0xffffff];
const CHEESE = [0xf6d36a, 0xf0c24a];
const CRUMBS = [0xd9a85a, 0xc48a3c, 0xe8c27a];
const CORN_DOG_ZONE = { dx: 0.05, dy: -0.05, rx: 0.4, ry: 0.1, angle: -50 };

const recipe = (number, slug, title, uniqueMechanic, steps) => ({ number, slug, title, uniqueMechanic, steps });

export function foodTexture(recipeDef, stage) {
  return `food-${String(recipeDef.number).padStart(2, '0')}-${recipeDef.slug}-${stage}`;
}

// Levels 2–5 use the classic campaign art; Level 1 (approved checkpoint) stays in levels.js.
export const CLASSIC_STEPS = Object.freeze({
  'ramen-02': [
    S.place('place-noodles', 'Put the noodles in the pot', { base: 'pot-empty', item: 'noodles', result: 'pot-noodles', keep: false }),
    S.pour('pour-broth', 'Pour in the broth', { base: 'pot-noodles', tool: 'broth', result: 'ramen-boiling', liquid: COLOR.broth }),
    S.cook('cook-ramen', 'Turn on the heat, lift when soft', { base: 'ramen-boiling', heat: 'stove', effect: 'steam' }),
    S.sprinkle('add-seasoning', 'Season the broth', { base: 'ramen-boiling', tool: 'seasoning', colors: SEASON }),
    S.place('add-egg', 'Add the egg', { base: 'ramen-boiling', item: 'egg', pieceSize: 0.3, todo: 'plain ramen in a serving bowl (cooking and serving are the same pot today)' }),
    S.place('finish-ramen', 'Add the toppings', { base: 'ramen-boiling', item: 'ramen-toppings', result: 'ramen-finished', keep: false }),
  ],
  'pizza-03': [
    S.roll('roll-dough', 'Roll the dough flat', { base: 's-dough-ball', result: 'food-24-mini-pepperoni-pizza-prep' }),
    S.spread('spread-sauce', 'Spread the tomato sauce', { base: 'food-24-mini-pepperoni-pizza-prep', result: 'dough-sauced', tool: 'k-ladle', turns: 1.25 }),
    S.sprinkle('add-cheese', 'Sprinkle the cheese', { base: 'dough-sauced', tool: 's-shredded-cheese', particle: 'shred', colors: CHEESE, length: 1.4 }),
    S.place('add-pizza-toppings', 'Place the toppings', { base: 'dough-sauced', item: 'pizza-toppings', placements: 3, result: 'pizza-raw', pieceSize: 0.2 }),
    S.bake('bake-pizza', 'Bake it in the oven', { item: 'pizza-raw', cooking: 'oven-baking', brown: false, result: 'pizza-finished' }),
    S.cut('cut-pizza', 'Slice the pizza', { base: 'pizza-finished', tool: 'pizza-cutter', direction: 'right', strokes: 2 }),
  ],
  'sushi-04': [
    S.place('place-rice', 'Put rice on the nori', { base: 'nori', item: 'rice', result: 'nori-rice', keep: false }),
    S.place('add-filling', 'Line up the fillings', { base: 'nori-rice', item: 'sushi-fillings', placements: 2, result: 'sushi-open', pieceSize: 0.24 }),
    S.rollUp('roll-sushi', 'Roll it up with the mat', { base: 'sushi-open', result: 'sushi-roll' }),
    S.cut('slice-sushi', 'Slice the roll', { base: 'sushi-roll', result: 'sushi-cut', strokes: 4 }),
    S.serve('serve-sushi', 'Arrange it on the plate', { base: 'lobby-plate', item: 'sushi-cut', result: 'sushi-finished' }),
  ],
  'bubble-tea-05': [
    S.place('add-pearls', 'Add tapioca pearls', { base: 'tea-cup', item: 'pearls', result: 'cup-pearls', keep: false }),
    S.pour('pour-syrup', 'Pour the syrup', { base: 'cup-pearls', tool: 'syrup', result: 'cup-syrup', liquid: COLOR.syrup }),
    S.pour('pour-tea', 'Pour the milk tea', { base: 'cup-syrup', tool: 'milk-tea', result: 'cup-tea', liquid: 0xd9b48a }),
    S.place('add-ice', 'Add ice', { base: 'cup-tea', item: 'ice', placements: 3, result: 'cup-ice', pieceSize: 0.18 }),
    S.shake('shake-tea', 'Shake it well', { base: 'cup-ice', tool: 'shaker', result: 'bubble-tea-full', strokes: 4 }),
    S.seal('seal-tea', 'Seal the cup', { base: 'bubble-tea-full', tool: 'sealer', result: 'bubble-tea-finished' }),
  ],
});

export const NEW_RECIPE_DEFINITIONS = Object.freeze([
  recipe(6, 'corn-dogs', 'Corn Dogs', 'Dunk twice to build the coat, fry, then draw your own sauce', [
    S.place('skewer-sausage', 'Push the stick into the sausage', { base: 's-sausage', item: 'k-skewers', result: '@raw', keep: false }),
    S.whisk('mix-batter', 'Whisk the batter', { base: 'k-bowl-unmixed', result: 'k-bowl-batter' }),
    S.dip('dip-corn-dog', 'Dip it in the batter', { base: 'k-bowl-batter', item: '@raw', result: 's-cd-battered', color: COLOR.batter }),
    S.coat('coat-corn-dog', 'Roll it in breadcrumbs', { item: 's-cd-battered', result: 's-cd-crumbed' }),
    S.fry('fry-corn-dog', 'Fry until golden, then lift it out', { item: 's-cd-crumbed', cooking: 's-cd-frying', result: 's-cd-golden' }),
    S.squeeze('ketchup-corn-dog', 'Zigzag the ketchup', { base: 's-cd-golden', tool: 'k-ketchup', color: COLOR.ketchup, zone: CORN_DOG_ZONE, length: 1.3 }),
    S.squeeze('mustard-corn-dog', 'Zigzag the mustard', { base: 's-cd-golden', tool: 'k-mustard', color: COLOR.mustard, zone: CORN_DOG_ZONE, length: 1.3, result: '@final' }),
  ]),
  recipe(7, 'pancakes', 'Pancakes', 'Wait for the bubbles, flip, stack and top', [
    S.whisk('mix-pancake-batter', 'Whisk the batter', { base: 'k-bowl-unmixed', result: 'k-bowl-batter' }),
    S.pour('pour-pancake', 'Ladle batter into the pan', { base: 'k-pan', tool: 'k-ladle', result: '@prep', liquid: COLOR.batter, todo: 'pancake states use a pink pan; the empty pan is black' }),
    S.cook('cook-pancake', 'Cook until bubbles appear, then tap', { base: '@prep', heat: 'stove', effect: 'sizzle', ready: 's-pancake-bubbly' }),
    S.flip('flip-pancake', 'Flip it with the spatula', { base: 's-pancake-bubbly', result: '@cooked' }),
    S.stack('stack-pancakes', 'Slide the pancakes onto the plate', { base: 'lobby-plate', item: '@cooked', result: 's-pancake-stack' }),
    S.pour('syrup-pancakes', 'Pour the syrup', { base: 's-pancake-stack', tool: 'syrup', liquid: COLOR.syrup }),
    S.place('berries-pancakes', 'Add blueberries', { base: 's-pancake-stack', item: 's-blueberries', placements: 3, pieceSize: 0.16, result: '@final' }),
  ]),
  recipe(8, 'burger', 'Burger', 'Build the stack piece by piece in the right order', [
    S.sprinkle('season-patty', 'Season the patty', { base: '@raw', colors: PEPPER_SALT }),
    S.place('pan-patty', 'Put the patty in the pan', { base: 'k-pan', item: '@raw', result: 's-patty-pan', keep: false }),
    S.cook('cook-patty', 'Cook it, lift when browned', { base: 's-patty-pan', heat: 'stove', effect: 'sizzle', brown: true }),
    S.flip('flip-patty', 'Flip the patty', { base: 's-patty-pan', result: '@prep' }),
    S.place('cheese-patty', 'Melt a cheese slice on top', { base: '@prep', item: 's-cheese-slice', pieceSize: 0.3, spread: 0.05 }),
    S.assemble('assemble-burger', 'Build it: patty, tomato, top bun', {
      base: 's-bun-lettuce', pieceSize: 0.3, spread: 0.06, todo: 'patty-with-cheese without the pan for the drag item',
      sequence: [{ item: '@prep', result: 's-burger-cheese' }, { item: 's-tomato-slices' }, { item: 's-top-bun', result: '@final' }],
    }),
  ]),
  recipe(9, 'donuts', 'Donuts', 'Roll, stamp out rings and decorate', [
    S.stir('mix-donut-dough', 'Mix the dough', { base: 'k-bowl-unmixed', result: 's-dough-ball' }),
    S.roll('roll-donut-dough', 'Roll the dough flat', { base: 's-dough-ball', result: 's-dough-sheet', todo: 'plain dough sheet (current sheet already shows ring marks)' }),
    S.cutOut('cut-donuts', 'Cut out the rings', { base: 's-dough-sheet', placements: 3, result: '@raw', spread: 0.2 }),
    S.fry('fry-donuts', 'Fry, then lift them out', { item: '@raw', cooking: '@prep', result: '@cooked' }),
    S.pipe('glaze-donuts', 'Drizzle the pink glaze', { base: '@cooked', color: COLOR.pink, zone: { rx: 0.36, ry: 0.32 } }),
    S.sprinkle('sprinkle-donuts', 'Shake on sprinkles', { base: '@cooked', particle: 'rod', colors: RAINBOW, zone: { rx: 0.36, ry: 0.32 }, result: '@final' }),
  ]),
  recipe(10, 'french-fries', 'French Fries', 'Whole potato → peeled → strips → fried → salted', [
    S.peel('peel-potatoes', 'Peel the potato', { base: '@raw', result: 's-potato-peeled', color: 0xb98a55 }),
    S.cut('slice-fries', 'Cut it into strips', { base: 's-potato-peeled', result: '@prep', strokes: 4 }),
    S.fry('fry-fries', 'Fry, then lift the basket', { item: '@prep', cooking: 's-fries-basket', result: '@cooked' }),
    S.sprinkle('salt-fries', 'Salt the fries', { base: '@cooked', colors: SALT }),
    S.serve('serve-fries', 'Pour them into the box', { item: '@cooked', result: '@final' }),
  ]),
  recipe(11, 'tacos', 'Tacos', 'Fill, top and fold soft tacos', [
    S.chop('chop-taco-veg', 'Chop the tomato', { base: 'tomato', result: '@prep', strokes: 3 }),
    S.cook('cook-taco-filling', 'Cook the meat, lift when browned', { base: 'k-pan', item: '@prep', cooking: '@cooked', effect: 'sizzle' }),
    S.scoop('fill-tacos', 'Spoon meat onto the tortillas', { base: '@raw', placements: 3, color: COLOR.mince, todo: 'open taco shells' }),
    S.assemble('top-tacos', 'Add lettuce and tomato', { base: '@raw', sequence: [{ item: 's-lettuce' }, { item: 's-tomato-slices' }], pieceSize: 0.2 }),
    S.sprinkle('cheese-tacos', 'Sprinkle cheese', { base: '@raw', tool: 's-shredded-cheese', particle: 'shred', colors: CHEESE }),
    S.fold('fold-tacos', 'Fold the tacos', { base: '@raw', tool: 'k-spatula', result: '@final' }),
  ]),
  recipe(12, 'tomato-pasta', 'Pasta with Tomato Sauce', 'Boil, drain, sauce and grate cheese on top', [
    S.boil('boil-pasta', 'Boil the pasta, lift when soft', { item: '@raw', cooking: '@prep' }),
    S.drain('drain-pasta', 'Drain it in the colander', { item: '@prep', result: '@cooked' }),
    S.pour('sauce-pasta', 'Ladle on the tomato sauce', { base: '@cooked', tool: 'k-ladle', liquid: COLOR.tomato }),
    S.toss('toss-pasta', 'Toss until coated', { base: '@cooked', result: '@final' }),
    S.grate('grate-pasta-cheese', 'Grate cheese on top', { base: '@final', color: 0xfff1b0 }),
  ]),
  recipe(13, 'mochi', 'Mochi', 'Pound the dough, fill it and pinch it closed', [
    S.stir('mix-mochi', 'Mix the rice flour dough', { base: '@raw', result: '@prep' }),
    S.knead('pound-mochi', 'Pound the dough', { base: '@prep' }),
    S.place('fill-mochi', 'Add strawberry filling', { base: '@prep', item: 's-strawberry-slices', placements: 2, pieceSize: 0.2, result: '@cooked' }),
    S.fold('pinch-mochi', 'Pinch them closed', { base: '@cooked', result: '@final' }),
  ]),
  recipe(14, 'onigiri', 'Onigiri', 'Fill and press rice into triangles', [
    S.sprinkle('salt-onigiri', 'Salt the rice', { base: '@raw', colors: SALT }),
    S.place('fill-onigiri', 'Add the salmon filling', { base: '@raw', item: 'sushi-fillings', result: '@prep', keep: false }),
    S.press('shape-onigiri', 'Press into a triangle', { base: '@prep', result: '@cooked' }),
    S.place('wrap-onigiri-nori', 'Wrap with nori', { base: '@cooked', item: 'nori', result: '@final', keep: false }),
  ]),
  recipe(15, 'chicken-nuggets', 'Chicken Nuggets', 'Egg wash and breadcrumbs before frying', [
    S.dip('dip-nuggets', 'Dip the chicken in egg', { base: 'k-egg-bowl', item: '@raw', result: '@raw', color: COLOR.egg }),
    S.coat('coat-nuggets', 'Coat with breadcrumbs', { item: '@raw', result: '@prep' }),
    S.fry('fry-nuggets', 'Fry, then lift them out', { item: '@prep', cooking: '@cooked' }),
    S.sprinkle('salt-nuggets', 'Salt them', { base: '@cooked', colors: SALT }),
    S.serve('serve-nuggets', 'Plate with dipping sauce', { item: '@cooked', result: '@final' }),
  ]),
  recipe(16, 'waffles-ice-cream', 'Waffles with Ice Cream', 'Bake in the iron and build a dessert plate', [
    S.whisk('mix-waffle-batter', 'Whisk the batter', { base: 'k-bowl-unmixed', result: '@raw' }),
    S.cook('cook-waffle', 'Close the iron, open when crisp', { base: '@prep', effect: 'steam', result: '@cooked' }),
    S.place('plate-waffles', 'Put two waffles on the plate', { base: 'lobby-plate', item: '@cooked', placements: 2, pieceSize: 0.55, spread: 0.05 }),
    S.scoop('scoop-ice-cream', 'Scoop ice cream on top', { base: 'lobby-plate', item: 'k-scoop', color: 0xf9c9d6, spread: 0.05, todo: 'ice-cream scoop sprite' }),
    S.place('berries-waffles', 'Add blueberries', { base: 'lobby-plate', item: 's-blueberries', placements: 2, pieceSize: 0.14, result: '@final' }),
    S.pipe('chocolate-waffles', 'Drizzle chocolate', { base: '@final', color: COLOR.choc }),
  ]),
  recipe(17, 'mini-hot-dogs', 'Mini Hot Dogs', 'Cook a batch and sauce every one', [
    S.cook('cook-mini-sausages', 'Cook the sausages, lift when browned', { base: 'k-pan', item: '@raw', cooking: '@prep', effect: 'sizzle' }),
    S.serve('bun-mini-dogs', 'Tuck the sausages into the buns', { item: '@prep', result: '@cooked', todo: 'open mini buns' }),
    S.squeeze('ketchup-mini-dogs', 'Zigzag the ketchup', { base: '@cooked', tool: 'k-ketchup', color: COLOR.ketchup }),
    S.squeeze('mustard-mini-dogs', 'Zigzag the mustard', { base: '@cooked', tool: 'k-mustard', color: COLOR.mustard, result: '@final' }),
  ]),
  recipe(18, 'mac-cheese', 'Mac and Cheese', 'Boil, drain, then build a creamy cheese sauce', [
    S.boil('boil-macaroni', 'Boil the macaroni, lift when soft', { item: '@raw', cooking: '@prep' }),
    S.drain('drain-macaroni', 'Drain it in the colander', { item: '@prep', result: '@cooked' }),
    S.pour('milk-mac-cheese', 'Pour in the milk', { base: '@cooked', tool: 'k-milk-jug', liquid: COLOR.cream }),
    S.grate('grate-mac-cheese', 'Grate in the cheese', { base: '@cooked' }),
    S.stir('mix-mac-cheese', 'Stir until creamy', { base: '@cooked', result: '@final', turns: 1.6 }),
  ]),
  recipe(19, 'chocolate-strawberries', 'Chocolate-Covered Strawberries', 'Melt, dip and stripe each berry', [
    S.cook('melt-chocolate', 'Melt the chocolate, tap when smooth', { base: '@prep', heat: 'stove', effect: 'steam', todo: 'chopped chocolate bowl before melting' }),
    S.stir('stir-chocolate', 'Stir until glossy', { base: '@prep' }),
    S.place('dip-strawberries', 'Dip the strawberries', { action: 'DIP', base: '@prep', item: 'berries', result: '@cooked', keep: false, todo: 'single whole strawberry' }),
    S.pipe('stripe-strawberries', 'Pipe white stripes', { base: '@cooked', color: COLOR.white, result: '@final' }),
  ]),
  recipe(20, 'cake-pops', 'Cake Pops', 'Crumble, stick, ice and sprinkle', [
    S.press('crumble-cake', 'Crumble the cake', { base: '@raw', result: '@prep' }),
    S.place('stick-cake-pops', 'Push in the sticks', { base: '@prep', item: 'k-skewers', placements: 3, keep: false, result: '@cooked', todo: 'rolled cake balls before the sticks' }),
    S.pipe('ice-cake-pops', 'Pipe pink icing', { base: '@cooked', color: COLOR.pink }),
    S.sprinkle('sprinkle-cake-pops', 'Shake on sprinkles', { base: '@cooked', particle: 'rod', colors: RAINBOW, result: '@final' }),
  ]),
  recipe(21, 'skewers', 'Skewers', 'Thread the pieces, brush and grill', [
    S.chop('chop-skewer-veg', 'Chop the vegetables', { base: '@raw' }),
    S.place('thread-skewers', 'Thread them onto sticks', { base: '@raw', item: 'k-skewers', placements: 2, keep: false, result: '@prep' }),
    S.spread('brush-skewers', 'Brush on the sauce', { action: 'BRUSH', base: '@prep', result: '@cooked' }),
    S.cook('grill-skewers', 'Grill them, lift when charred', { base: '@cooked', heat: 'stove', effect: 'sizzle', brown: true, result: '@final' }),
  ]),
  recipe(22, 'eggs-bacon', 'Eggs and Bacon', 'Crisp the bacon and crack eggs beside it', [
    S.cook('fry-bacon', 'Fry the bacon, lift when crispy', { base: 'k-pan', item: '@raw', cooking: '@prep', effect: 'sizzle', todo: 'bacon only (raw art includes the egg carton)' }),
    S.flip('flip-bacon', 'Flip the bacon', { base: '@prep' }),
    S.crack('crack-eggs', 'Crack two eggs into the pan', { base: '@prep', placements: 2, result: '@cooked' }),
    S.cook('cook-eggs', 'Cook the eggs, tap when set', { base: '@cooked', heat: 'stove', effect: 'sizzle' }),
    S.serve('plate-breakfast', 'Plate the breakfast', { item: '@cooked', result: '@final' }),
  ]),
  recipe(23, 'sandwich', 'Sandwich', 'Layer the fillings and cut it diagonally', [
    S.cut('slice-sandwich-veg', 'Slice the tomato', { base: 'tomato', result: 's-tomato-slices' }),
    S.spread('spread-sandwich-sauce', 'Spread the mayo', { base: '@raw', result: '@prep' }),
    S.assemble('assemble-sandwich', 'Layer lettuce, tomato and cheese', { base: '@prep', pieceSize: 0.3, spread: 0.08, sequence: [{ item: 's-lettuce' }, { item: 's-tomato-slices' }, { item: 's-cheese-slice', result: '@cooked' }] }),
    S.cut('cut-sandwich', 'Cut it diagonally', { base: '@cooked', result: '@final', strokes: 1 }),
  ]),
  recipe(24, 'mini-pepperoni-pizza', 'Mini Pepperoni Pizza', 'Knead, roll, top and bake a small pizza', [
    S.knead('knead-mini-pizza', 'Knead the dough', { base: '@raw' }),
    S.roll('roll-mini-pizza', 'Roll it flat', { base: '@raw', result: '@prep' }),
    S.pour('sauce-mini-pizza', 'Ladle on the tomato sauce', { base: '@prep', tool: 'k-ladle', liquid: COLOR.tomato }),
    S.sprinkle('cheese-mini-pizza', 'Sprinkle the cheese', { base: '@prep', tool: 's-shredded-cheese', particle: 'shred', colors: CHEESE, result: '@cooked' }),
    S.bake('bake-mini-pizza', 'Bake it in the oven', { item: '@cooked', cooking: 'oven-baking', brown: false, result: '@final' }),
  ]),
  recipe(25, 'egg-fried-rice', 'Egg Fried Rice', 'Scramble egg in the pan, then fry the rice', [
    S.whisk('beat-rice-egg', 'Beat the egg', { base: '@prep' }),
    S.scoop('egg-into-pan', 'Pour the egg into the pan', { base: 'k-pan', item: '@prep', color: COLOR.egg, placements: 2 }),
    S.place('rice-into-pan', 'Add the rice', { base: 'k-pan', item: '@raw', result: '@cooked', keep: false }),
    S.cook('stir-fry-rice', 'Stir-fry, tap when steaming', { base: '@cooked', heat: 'stove', effect: 'sizzle' }),
    S.place('onion-fried-rice', 'Add green onion', { base: '@cooked', item: 's-green-onion', placements: 2, pieceSize: 0.16 }),
    S.squeeze('soy-fried-rice', 'Season with soy sauce', { base: '@cooked', tool: 'soy-sauce', color: COLOR.soy, result: '@final' }),
  ]),
  recipe(26, 'udon', 'Udon', 'Knead, roll and cut thick noodles by hand', [
    S.knead('knead-udon', 'Knead the noodle dough', { base: '@raw' }),
    S.roll('roll-udon', 'Roll the dough flat', { base: '@raw', result: '@prep' }),
    S.cut('slice-udon', 'Cut thick noodles', { base: '@prep', result: '@cooked', strokes: 5 }),
    S.boil('boil-udon', 'Boil the noodles, lift when soft', { item: '@cooked', result: '@cooked' }),
    S.pour('broth-udon', 'Pour the broth', { base: '@cooked', tool: 'broth', liquid: COLOR.broth, todo: 'noodles in an empty serving bowl' }),
    S.place('onion-udon', 'Add the toppings', { base: '@cooked', item: 's-green-onion', result: '@final', keep: false }),
  ]),
  recipe(27, 'kimbap', 'Kimbap', 'Line up the fillings, roll tight and slice', [
    S.place('rice-kimbap', 'Put rice on the seaweed', { base: 'nori', item: 'rice', result: '@raw', keep: false }),
    S.place('fill-kimbap', 'Line up the fillings', { base: '@raw', item: 'sushi-fillings', placements: 2, pieceSize: 0.22, result: '@prep' }),
    S.rollUp('roll-kimbap', 'Roll it tightly', { base: '@prep', result: '@cooked' }),
    S.cut('slice-kimbap', 'Slice even pieces', { base: '@cooked', result: '@final', strokes: 4 }),
    S.sprinkle('sesame-kimbap', 'Sprinkle sesame seeds', { base: '@final', colors: [0xfff3d6, 0xf3dfb0] }),
  ]),
  recipe(28, 'fruit-salad', 'Fruit Salad', 'Peel and chop mixed fruit, then toss', [
    S.peel('peel-fruit', 'Peel the fruit', { base: '@raw', result: '@prep', color: 0xd9c46a, strokes: 2 }),
    S.chop('chop-fruit', 'Chop bite-size pieces', { base: '@prep', result: '@cooked' }),
    S.place('berries-fruit', 'Add strawberries', { base: '@cooked', item: 's-strawberry-slices', placements: 2, pieceSize: 0.2 }),
    S.toss('toss-fruit-salad', 'Toss it in the bowl', { base: '@cooked', result: '@final', todo: 'empty glass bowl to tip the fruit into' }),
    S.squeeze('honey-fruit', 'Drizzle honey', { base: '@final', tool: 'syrup', color: COLOR.honey }),
  ]),
  recipe(29, 'chocolate-banana', 'Chocolate Banana', 'Peel, stick and dunk a whole banana', [
    S.peel('peel-banana', 'Peel the banana', { base: '@raw', color: 0xf2d24b, strokes: 2, todo: 'peeled whole banana' }),
    S.place('skewer-banana', 'Push in the stick', { base: '@raw', item: 'k-skewers', pieceSize: 0.32, spread: 0.12 }),
    S.dip('dip-banana', 'Dunk it in chocolate', { base: '@cooked', item: '@raw', result: '@final', color: COLOR.choc, todo: 'chocolate banana without sprinkles' }),
    S.sprinkle('sprinkle-banana', 'Shake on sprinkles', { base: '@final', particle: 'rod', colors: RAINBOW, zone: { rx: 0.14, ry: 0.32, angle: 20 } }),
  ]),
  recipe(30, 'cupcakes', 'Cupcakes', 'Bake, then pipe tall frosting swirls', [
    S.whisk('mix-cupcake-batter', 'Whisk the batter', { base: 'k-bowl-unmixed', result: '@raw' }),
    S.bake('bake-cupcakes', 'Bake the cupcakes', { item: '@prep', result: '@cooked' }),
    S.pipe('frost-cupcakes', 'Pipe the frosting', { base: '@cooked', color: COLOR.pink, length: 1.8 }),
    S.sprinkle('sprinkle-cupcakes', 'Shake on sprinkles', { base: '@cooked', particle: 'rod', colors: RAINBOW, result: '@final' }),
  ]),
  recipe(31, 'churros', 'Churros', 'Pipe long strips, cut, fry and sugar them', [
    S.whisk('mix-churro-dough', 'Mix the churro dough', { tool: 'k-spoon', base: 'k-bowl-unmixed', result: '@raw' }),
    S.pipe('pipe-churros', 'Pipe long strips', { base: 'k-board', color: COLOR.batter, result: '@prep', zone: { rx: 0.36, ry: 0.2 } }),
    S.cut('cut-churros', 'Cut equal lengths', { base: '@prep', result: '@cooked' }),
    S.fry('fry-churros', 'Fry, then lift them out', { item: '@cooked', result: '@final', todo: 'fried churros before sugar' }),
    S.sprinkle('sugar-churros', 'Shake on cinnamon sugar', { base: '@final', colors: CINNAMON }),
  ]),
  recipe(32, 'caramel-popcorn', 'Caramel Popcorn', 'Pop the corn, then coat it in caramel', [
    S.place('kernels-popcorn', 'Pour the kernels into the pot', { base: 'k-pot', item: '@raw', result: '@prep', keep: false }),
    S.cook('pop-popcorn', 'Heat until it pops', { base: '@prep', heat: 'stove', effect: 'steam', result: '@cooked' }),
    S.pour('caramel-popcorn', 'Pour the caramel', { base: '@cooked', tool: 'k-ladle', liquid: COLOR.caramel }),
    S.toss('coat-popcorn', 'Toss to coat every piece', { base: '@cooked', result: '@final' }),
  ]),
  recipe(33, 'chicken-wings', 'Chicken Wings', 'Season, fry and toss in sticky sauce', [
    S.sprinkle('season-wings', 'Season the wings', { base: '@raw', colors: SEASON, result: '@prep' }),
    S.fry('fry-wings', 'Fry, then lift them out', { item: '@prep', cooking: '@cooked', todo: 'golden wings in the basket' }),
    S.squeeze('sauce-wings', 'Add the sauce', { base: '@cooked', tool: 'k-ketchup', color: COLOR.bbq }),
    S.toss('toss-wings', 'Toss until glazed', { base: '@cooked', result: '@final' }),
  ]),
  recipe(34, 'cheese-sticks', 'Cheese Sticks', 'Cut, bread and fry cheese batons', [
    S.cut('slice-cheese-sticks', 'Cut the cheese into sticks', { base: '@raw' }),
    S.dip('egg-cheese-sticks', 'Dip in egg', { base: 'k-egg-bowl', item: '@raw', result: '@prep', color: COLOR.egg }),
    S.coat('coat-cheese-sticks', 'Coat with breadcrumbs', { item: '@prep', result: '@cooked' }),
    S.fry('fry-cheese-sticks', 'Fry, then lift them out', { item: '@cooked', result: '@cooked' }),
    S.serve('serve-cheese-sticks', 'Plate with dipping sauce', { item: '@cooked', result: '@final' }),
  ]),
  recipe(35, 'potato-wedges', 'Potato Wedges', 'Cut thick wedges, season and fry', [
    S.cut('slice-potato-wedges', 'Cut thick wedges', { base: '@raw', result: '@prep', strokes: 4 }),
    S.sprinkle('season-wedges', 'Season the wedges', { base: '@prep', colors: SEASON, result: '@cooked' }),
    S.fry('fry-wedges', 'Fry, then lift the basket', { item: '@cooked', result: '@final' }),
    S.pipe('cream-wedges', 'Add a dollop of sour cream', { base: '@final', color: COLOR.cream, length: 0.8 }),
  ]),
  recipe(36, 'omurice', 'Omurice', 'Fry the rice, wrap it in omelette and draw on it', [
    S.chop('chop-omurice-veg', 'Chop the vegetables', { base: '@raw' }),
    S.cook('fry-omurice-rice', 'Fry the rice, lift when hot', { base: 'k-pan', item: '@raw', cooking: '@prep', effect: 'sizzle' }),
    S.whisk('whisk-omurice-eggs', 'Whisk the eggs', { base: 'k-egg-bowl' }),
    S.cook('cook-omelette', 'Cook the omelette, tap when set', { base: 'k-pan', item: 'k-egg-bowl', cooking: '@cooked', effect: 'sizzle' }),
    S.fold('fold-omurice', 'Fold it over the rice', { base: '@cooked', tool: 'k-spatula', result: '@final', todo: 'omurice without the ketchup face' }),
    S.squeeze('ketchup-omurice', 'Draw with ketchup', { base: '@final', tool: 'k-ketchup', color: COLOR.ketchup }),
  ]),
  recipe(37, 'gyoza', 'Fried Dumplings / Gyoza', 'Fill, pleat and pan-steam dumplings', [
    S.chop('chop-gyoza-filling', 'Chop the filling', { base: '@raw', result: '@prep' }),
    S.place('fill-gyoza', 'Spoon filling onto a wrapper', { base: '@prep', item: 'k-spoon', result: '@cooked', keep: false }),
    S.press('pleat-gyoza', 'Pinch the pleats', { base: '@cooked' }),
    S.cook('fry-gyoza', 'Pan-fry and steam, lift when crisp', { base: 'k-pan', item: '@cooked', effect: 'steam', result: '@final' }),
  ]),
  recipe(38, 'croquettes', 'Croquettes', 'Mash, crumb and fry potato patties', [
    S.boil('boil-croquette-potato', 'Boil the potatoes, lift when soft', { item: '@raw', result: '@raw' }),
    S.press('mash-croquettes', 'Mash them', { base: '@raw', result: '@prep' }),
    S.sprinkle('crumb-croquettes', 'Shape and coat in breadcrumbs', { base: '@prep', tool: 'k-bowl-crumbs', grip: 'pinch', colors: CRUMBS, result: '@cooked' }),
    S.fry('fry-croquettes', 'Fry, then lift them out', { item: '@cooked', result: '@final' }),
  ]),
  recipe(39, 'taiyaki', 'Taiyaki', 'Fill the fish mold and close it', [
    S.whisk('mix-taiyaki-batter', 'Whisk the batter', { base: 'k-bowl-unmixed', result: '@raw' }),
    S.pour('fill-taiyaki-mold', 'Ladle batter into the fish mold', { base: '@prep', tool: 'k-ladle', liquid: COLOR.batter, todo: 'empty open fish mold' }),
    S.fold('close-taiyaki-mold', 'Close the mold', { base: '@prep', tool: 'k-spatula', result: '@cooked' }),
    S.cook('cook-taiyaki', 'Cook it, open when golden', { base: '@cooked', effect: 'steam', result: '@final' }),
  ]),
  recipe(40, 'egg-cheese-toast', 'Egg and Cheese Toast', 'Toast, crack an egg on top and melt cheese', [
    S.place('toast-into-pan', 'Put the bread in the pan', { base: 'k-pan', item: '@raw', result: '@prep', keep: false }),
    S.crack('crack-toast-egg', 'Crack an egg on the toast', { base: '@prep', result: '@cooked' }),
    S.place('cheese-toast', 'Add a cheese slice', { base: '@cooked', item: 's-cheese-slice', pieceSize: 0.24 }),
    S.cook('cook-toast', 'Cook it, tap when the cheese melts', { base: '@cooked', heat: 'stove', effect: 'sizzle' }),
    S.serve('serve-toast', 'Fold it onto the plate', { item: '@cooked', result: '@final' }),
  ]),
  recipe(41, 'fruit-sandwich', 'Fruit Sandwich', 'Arrange fruit in cream and wrap it tight', [
    S.cut('slice-fruit-sandwich', 'Slice the fruit', { base: '@raw' }),
    S.spread('spread-fruit-cream', 'Spread the cream', { base: '@raw', result: '@prep' }),
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
    S.cook('fry-french-toast', 'Fry it, lift when golden', { base: 'k-pan', item: '@prep', cooking: '@cooked', effect: 'sizzle' }),
    S.flip('flip-french-toast', 'Flip the toast', { base: '@cooked' }),
    S.pour('syrup-french-toast', 'Pour syrup and serve', { base: '@cooked', tool: 'syrup', liquid: COLOR.syrup, result: '@final' }),
  ]),
  recipe(44, 'chicken-wrap', 'Chicken Wrap', 'Cook seasoned chicken and roll a tight wrap', [
    S.cut('slice-wrap-chicken', 'Slice the chicken', { base: '@raw', strokes: 4 }),
    S.sprinkle('season-wrap-chicken', 'Season the chicken', { base: '@raw', colors: SEASON, result: '@prep' }),
    S.cook('cook-wrap-chicken', 'Cook it, lift when golden', { base: 'k-pan', item: '@prep', cooking: '@cooked', effect: 'sizzle' }),
    S.assemble('fill-wrap', 'Add lettuce and tomato', { base: '@cooked', pieceSize: 0.24, sequence: [{ item: 's-lettuce' }, { item: 's-tomato-slices' }], todo: 'flat tortilla to fill' }),
    S.fold('roll-chicken-wrap', 'Roll it tightly', { base: '@cooked', result: '@final' }),
  ]),
  recipe(45, 'nachos-cheese', 'Nachos with Cheese', 'Load the chips, melt the cheese and finish with cream', [
    S.grate('grate-nacho-cheese', 'Grate cheese over the chips', { base: '@raw' }),
    S.assemble('top-nachos', 'Add tomato and green onion', { base: '@raw', pieceSize: 0.2, sequence: [{ item: 's-tomato-slices' }, { item: 's-green-onion', result: '@cooked' }] }),
    S.bake('bake-nachos', 'Melt it in the oven', { item: '@cooked', result: '@final' }),
    S.pipe('cream-nachos', 'Add sour cream', { base: '@final', color: COLOR.cream, length: 0.9 }),
  ]),
  recipe(46, 'mini-chicken-tacos', 'Mini Chicken Tacos', 'Fill and fold a batch of tiny tacos', [
    S.sprinkle('season-mini-taco-chicken', 'Season the chicken', { base: '@raw', colors: SEASON, result: '@prep' }),
    S.cook('cook-mini-taco-chicken', 'Cook it, lift when golden', { base: 'k-pan', item: '@prep', cooking: '@cooked', effect: 'sizzle' }),
    S.scoop('fill-mini-tacos', 'Spoon chicken into the shells', { base: '@raw', placements: 4, color: 0xb86a3a, todo: 'empty mini shells' }),
    S.assemble('top-mini-tacos', 'Add lettuce and tomato', { base: '@raw', pieceSize: 0.18, sequence: [{ item: 's-lettuce' }, { item: 's-tomato-slices' }] }),
    S.fold('fold-mini-tacos', 'Fold the tacos', { base: '@raw', tool: 'k-spatula', result: '@final' }),
  ]),
  recipe(47, 'chocolate-chip-cookies', 'Chocolate Chip Cookies', 'Scoop even balls and bake them golden', [
    S.stir('mix-cookie-dough', 'Mix the cookie dough', { base: '@raw' }),
    S.scoop('scoop-cookie-dough', 'Scoop balls onto the tray', { base: 'lobby-plate', item: 'k-scoop', placements: 3, color: 0xe8cf9a, result: '@cooked' }),
    S.scoop('chips-cookies', 'Press in extra chocolate chips', { base: '@cooked', item: 'k-spoon', placements: 2, color: COLOR.choc }),
    S.bake('bake-cookies', 'Bake until golden', { item: '@cooked', result: '@final' }),
  ]),
  recipe(48, 'blueberry-muffins', 'Blueberry Muffins', 'Fold in berries, fill the tin and bake', [
    S.stir('mix-muffin-batter', 'Mix the batter', { base: '@raw' }),
    S.place('berries-muffins', 'Add blueberries', { base: '@raw', item: 's-blueberries', placements: 2, pieceSize: 0.14, result: '@prep' }),
    S.scoop('fill-muffin-tin', 'Scoop batter into the tin', { base: '@cooked', item: 'k-scoop', placements: 3, color: COLOR.batter, todo: 'empty muffin tin' }),
    S.bake('bake-muffins', 'Bake until risen', { item: '@cooked', result: '@final' }),
    S.sprinkle('sugar-muffins', 'Dust with sugar', { base: '@final', colors: SALT }),
  ]),
  recipe(49, 'strawberry-milkshake', 'Strawberry Milkshake', 'Blend berries, milk and ice cream, then top', [
    S.cut('slice-milkshake-berries', 'Cut the strawberries', { base: '@raw', result: '@prep' }),
    S.place('berries-blender', 'Add them to the blender', { base: '@cooked', item: '@prep', pieceSize: 0.2, todo: 'empty blender' }),
    S.pour('milk-milkshake', 'Pour in the milk', { base: '@cooked', tool: 'k-milk-jug', liquid: COLOR.milk }),
    S.scoop('ice-cream-milkshake', 'Add a scoop of ice cream', { base: '@cooked', item: 'k-scoop', color: 0xf9c9d6 }),
    S.cook('blend-milkshake', 'Blend it, tap when smooth', { action: 'BLEND', base: '@cooked', effect: 'bubbles', result: '@bite' }),
    S.pipe('cream-milkshake', 'Top with whipped cream', { base: '@bite', color: COLOR.cream, result: '@final' }),
  ]),
  recipe(50, 'matcha-bubble-tea', 'Matcha Bubble Tea', 'Whisk matcha, build the drink and shake it', [
    S.whisk('whisk-matcha', 'Whisk the matcha', { base: '@prep' }),
    S.place('pearls-matcha', 'Add tapioca pearls', { base: 'tea-cup', item: 'pearls', result: 'cup-pearls', keep: false }),
    S.place('ice-matcha', 'Add ice', { base: 'cup-pearls', item: 'ice', placements: 2, pieceSize: 0.18, result: '@cooked' }),
    S.pour('pour-matcha', 'Pour in the matcha', { base: '@cooked', tool: '@prep', liquid: COLOR.matcha, result: '@bite' }),
    S.pour('milk-matcha', 'Add milk', { base: '@bite', tool: 'k-milk-jug', liquid: COLOR.milk }),
    S.shake('shake-matcha-tea', 'Shake it well', { base: '@bite', tool: 'shaker' }),
    S.seal('seal-matcha', 'Seal the cup', { base: '@bite', tool: 'sealer', result: '@final' }),
  ]),
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
