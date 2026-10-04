// Campaign content is data; permanent IDs are separate from the fixed display order.
export const CAMPAIGN_ORDER = ['orange-jelly-01', 'ramen-02', 'pizza-03', 'sushi-04', 'bubble-tea-05'];

const comments = {
  preStream: ['Welcome everyone!', 'What are we cooking today?', 'This looks so cute!', 'I am hungry already!', 'Let’s go!', 'New viewer here!'],
  mukbang: ['That looks delicious!', 'Huge bite!', 'The texture looks perfect!', 'Save me some!', 'So satisfying!', 'Best live today!'],
};

const choice = (id, instruction, texture, result = texture) => ({
  id, kind: 'choice', instruction, result,
  options: [
    { id: `${id}-correct`, texture, label: 'Choose', correct: true },
    { id: `${id}-locked-a`, locked: true, lockLabel: 'Soon' },
    { id: `${id}-locked-b`, locked: true, lockLabel: 'Soon' },
  ],
});
const topping = (id, instruction, base, texture, result, pour = false) => ({
  id, kind: 'topping', instruction, base, result, pour,
  options: [
    { id: `${id}-correct`, texture, label: 'Add', correct: true },
    { id: `${id}-locked-a`, locked: true, lockLabel: 'Soon' },
    { id: `${id}-locked-b`, locked: true, lockLabel: 'Soon' },
  ],
});

export const LEVELS = {
  'orange-jelly-01': {
    id: 'orange-jelly-01', number: 1, title: 'Jelly', recipe: 'orange-jelly', actionLabel: 'Make Jelly',
    unlockPrice: 0, rewardCoins: 200, servings: 3, bitesPerServing: 3,
    finalTexture: 'jelly-finished', servingTexture: 'jelly-finished', biteTextures: ['piece-full', 'piece-bitten', 'piece-last'], emptyTexture: 'plate-empty',
    request: { viewer: 'Sofia', avatar: 'viewer-bunny', dish: 'jelly-finished' }, unlockPreview: ['bowl', 'berries', 'glaze'],
    steps: [
      { ...choice('choose-mold', 'Choose a mold', 'bowl'), options: [
        { id: 'orange', texture: 'bowl', label: 'Orange', correct: true }, { id: 'locked-2', locked: true, lockLabel: 'Lv. 2' }, { id: 'locked-3', locked: true, lockLabel: 'Lv. 3' },
      ] },
      { id: 'pour-mix', kind: 'pour', instruction: 'Pour it in', tool: 'orange-mix', before: 'bowl', after: 'bowl-filled' },
      { id: 'stir', kind: 'stir', instruction: 'Stir it round', tool: 'whisk', base: 'bowl-filled', result: 'bowl-filled', turns: 2 },
      { id: 'unmold', kind: 'unmold', instruction: 'Lift the mold', mold: 'bowl', reveal: 'jelly-plain' },
      topping('add-berries', 'Add berries', 'jelly-plain', 'berries', 'jelly-berries'),
      topping('add-glaze', 'Add the glaze', 'jelly-berries', 'glaze', 'jelly-finished', true),
    ], comments,
  },
  'ramen-02': {
    id: 'ramen-02', number: 2, title: 'Ramen', recipe: 'ramen', actionLabel: 'Make Ramen',
    unlockPrice: 120, rewardCoins: 220, servings: 3, bitesPerServing: 2,
    finalTexture: 'ramen-finished', servingTexture: 'ramen-finished', biteTextures: ['ramen-bite', 'ramen-bite-small'], emptyTexture: 'ramen-empty',
    request: { viewer: 'Mina', avatar: 'viewer-cat', dish: 'ramen-finished' }, unlockPreview: ['noodles', 'egg', 'ramen-toppings'],
    steps: [
      { id: 'place-noodles', kind: 'drag-transform', instruction: 'Add noodles', tool: 'noodles', before: 'pot-empty', after: 'pot-noodles' },
      { id: 'pour-broth', kind: 'pour', instruction: 'Pour broth', tool: 'broth', before: 'pot-noodles', after: 'ramen-boiling' },
      { id: 'cook-ramen', kind: 'tap-process', instruction: 'Cook the ramen', tool: 'stove', before: 'ramen-boiling', after: 'pot-noodles' },
      topping('add-seasoning', 'Add seasoning', 'pot-noodles', 'seasoning', 'pot-noodles'),
      topping('add-egg', 'Add the egg', 'pot-noodles', 'egg', 'ramen-finished'),
      topping('finish-ramen', 'Add toppings', 'ramen-finished', 'ramen-toppings', 'ramen-finished'),
    ], comments,
  },
  'pizza-03': {
    id: 'pizza-03', number: 3, title: 'Pizza', recipe: 'pizza', actionLabel: 'Make Pizza',
    unlockPrice: 160, rewardCoins: 260, servings: 3, bitesPerServing: 2,
    finalTexture: 'pizza-finished', servingTexture: 'pizza-finished', biteTextures: ['pizza-slice', 'pizza-slice-bitten'], emptyTexture: 'pizza-empty',
    request: { viewer: 'Leo', avatar: 'viewer-bear', dish: 'pizza-finished' }, unlockPreview: ['pizza-sauce', 'cheese', 'pizza-toppings'],
    steps: [
      choice('place-dough', 'Place the dough', 'dough'),
      { id: 'spread-sauce', kind: 'stir', instruction: 'Spread the sauce', tool: 'pizza-sauce', base: 'dough', result: 'dough-sauced', turns: 1.25 },
      topping('add-cheese', 'Add cheese', 'dough-sauced', 'cheese', 'pizza-raw'),
      topping('add-pizza-toppings', 'Add toppings', 'pizza-raw', 'pizza-toppings', 'pizza-raw'),
      { id: 'bake-pizza', kind: 'drag-transform', instruction: 'Put it in the oven', tool: 'pizza-raw', before: 'oven', after: 'oven-baking' },
      { id: 'cut-pizza', kind: 'directional-transform', instruction: 'Slice the pizza', tool: 'pizza-cutter', before: 'pizza-finished', after: 'pizza-finished', direction: 'right' },
    ], comments,
  },
  'sushi-04': {
    id: 'sushi-04', number: 4, title: 'Sushi', recipe: 'sushi', actionLabel: 'Make Sushi',
    unlockPrice: 200, rewardCoins: 300, servings: 3, bitesPerServing: 2,
    finalTexture: 'sushi-finished', servingTexture: 'sushi-finished', biteTextures: ['sushi-piece', 'sushi-piece-bitten'], emptyTexture: 'sushi-empty',
    request: { viewer: 'Yuki', avatar: 'viewer-chick', dish: 'sushi-finished' }, unlockPreview: ['rice', 'sushi-fillings', 'sushi-knife'],
    steps: [
      { id: 'place-rice', kind: 'drag-transform', instruction: 'Add the rice', tool: 'rice', before: 'nori', after: 'nori-rice' },
      topping('add-filling', 'Add the filling', 'nori-rice', 'sushi-fillings', 'sushi-open'),
      { id: 'roll-sushi', kind: 'directional-transform', instruction: 'Roll it up', tool: 'sushi-mat', before: 'sushi-open', after: 'sushi-roll', direction: 'up' },
      { id: 'slice-sushi', kind: 'directional-transform', instruction: 'Slice the roll', tool: 'sushi-knife', before: 'sushi-roll', after: 'sushi-cut', direction: 'down' },
      { id: 'serve-sushi', kind: 'tap-process', instruction: 'Arrange the plate', tool: 'sushi-cut', before: 'sushi-empty', after: 'sushi-finished' },
    ], comments,
  },
  'bubble-tea-05': {
    id: 'bubble-tea-05', number: 5, title: 'Bubble Tea', recipe: 'bubble-tea', actionLabel: 'Make Bubble Tea',
    unlockPrice: 240, rewardCoins: 360, servings: 3, bitesPerServing: 2,
    finalTexture: 'bubble-tea-finished', servingTexture: 'bubble-tea-full', biteTextures: ['bubble-tea-full', 'bubble-tea-half'], emptyTexture: 'bubble-tea-empty',
    request: { viewer: 'Ava', avatar: 'viewer-bunny', dish: 'bubble-tea-finished' }, unlockPreview: ['pearls', 'syrup', 'ice'],
    steps: [
      { id: 'add-pearls', kind: 'drag-transform', instruction: 'Add tapioca pearls', tool: 'pearls', before: 'tea-cup', after: 'cup-pearls' },
      { id: 'pour-syrup', kind: 'pour', instruction: 'Pour the syrup', tool: 'syrup', before: 'cup-pearls', after: 'cup-syrup' },
      { id: 'pour-tea', kind: 'pour', instruction: 'Pour milk tea', tool: 'milk-tea', before: 'cup-syrup', after: 'cup-tea' },
      topping('add-ice', 'Add ice', 'cup-tea', 'ice', 'cup-ice'),
      { id: 'shake-tea', kind: 'stir', instruction: 'Mix it well', tool: 'shaker', base: 'cup-ice', result: 'bubble-tea-full', turns: 1.5 },
      { id: 'seal-tea', kind: 'tap-process', instruction: 'Seal the cup', tool: 'sealer', before: 'bubble-tea-full', after: 'bubble-tea-finished' },
    ], comments,
  },
};

export function getLevel(id) {
  const level = LEVELS[id];
  if (!level) throw new Error(`Unknown level: ${id}`);
  return level;
}

export function nextLevel(levelId) {
  const i = CAMPAIGN_ORDER.indexOf(levelId);
  return i >= 0 && i + 1 < CAMPAIGN_ORDER.length ? LEVELS[CAMPAIGN_ORDER[i + 1]] : null;
}
