import { CLASSIC_STEPS, CLASSIC_EXTRA, NEW_RECIPE_DEFINITIONS, foodTexture } from './recipeCatalog.js';

// Campaign content is data; permanent IDs are separate from the fixed display order.
export const CAMPAIGN_ORDER = ['orange-jelly-01', 'ramen-02', 'pizza-03', 'sushi-04', 'bubble-tea-05'];

const comments = {
  preStream: ['Welcome everyone!', 'What are we cooking today?', 'This looks so cute!', 'I am hungry already!', 'Let’s go!', 'New viewer here!'],
  mukbang: ['That looks delicious!', 'Huge bite!', 'The texture looks perfect!', 'Save me some!', 'So satisfying!', 'Best live today!'],
};

export const LEVELS = {
  'orange-jelly-01': {
    id: 'orange-jelly-01', number: 1, title: 'Jelly', recipe: 'orange-jelly', actionLabel: 'Make Jelly',
    unlockPrice: 0, rewardCoins: 200, servings: 3, bitesPerServing: 3,
    finalTexture: 'jelly-finished', servingTexture: 'jelly-finished', biteTextures: ['piece-full', 'piece-bitten', 'piece-last'], emptyTexture: 'plate-empty',
    request: { viewer: 'Sofia', avatar: 'viewer-bunny', dish: 'jelly-finished' }, unlockPreview: ['bowl', 'berries', 'glaze'],
    steps: [
      { id: 'choose-mold', kind: 'place', instruction: 'Place the mold', base: 'lobby-plate', item: 'bowl', result: 'bowl', keep: false, toolSize: 0.42 },
      { id: 'pour-mix', kind: 'pour', instruction: 'Pour it in', tool: 'orange-mix', before: 'bowl', after: 'bowl-filled' },
      { id: 'stir', kind: 'stir', instruction: 'Stir it round', tool: 'whisk', base: 'bowl-filled', result: 'bowl-filled', turns: 2 },
      { id: 'unmold', kind: 'unmold', instruction: 'Lift the mold', mold: 'bowl', reveal: 'jelly-plain' },
      { id: 'add-berries', kind: 'place', instruction: 'Add berries', base: 'jelly-plain', item: 'berries', result: 'jelly-berries', keep: false, toolSize: 0.28 },
      { id: 'add-glaze', kind: 'pour', instruction: 'Pour the glaze', tool: 'glaze', before: 'jelly-berries', after: 'jelly-finished', liquid: 0xfff6dc },
    ], comments,
  },
  'ramen-02': {
    id: 'ramen-02', number: 2, title: 'Ramen', recipe: 'ramen', actionLabel: 'Make Ramen',
    unlockPrice: 120, rewardCoins: 220, servings: 3, bitesPerServing: 2,
    finalTexture: 'ramen-finished', servingTexture: 'ramen-finished', biteTextures: ['ramen-bite', 'ramen-bite-small'], emptyTexture: 'ramen-empty',
    request: { viewer: 'Mina', avatar: 'viewer-cat', dish: 'ramen-finished' }, unlockPreview: ['noodles', 'egg', 'ramen-toppings'],
    steps: [], comments, // steps: CLASSIC_STEPS in recipeCatalog.js
  },
  'pizza-03': {
    id: 'pizza-03', number: 3, title: 'Pizza', recipe: 'pizza', actionLabel: 'Make Pizza',
    unlockPrice: 160, rewardCoins: 260, servings: 3, bitesPerServing: 2,
    finalTexture: 'pizza-finished', servingTexture: 'pizza-finished', biteTextures: ['pizza-slice', 'pizza-slice-bitten'], emptyTexture: 'pizza-empty',
    request: { viewer: 'Leo', avatar: 'viewer-bear', dish: 'pizza-finished' }, unlockPreview: ['pizza-sauce', 'cheese', 'pizza-toppings'],
    steps: [], comments, // steps: CLASSIC_STEPS in recipeCatalog.js
  },
  'sushi-04': {
    id: 'sushi-04', number: 4, title: 'Sushi', recipe: 'sushi', actionLabel: 'Make Sushi',
    unlockPrice: 200, rewardCoins: 300, servings: 3, bitesPerServing: 2,
    finalTexture: 'sushi-finished', servingTexture: 'sushi-finished', biteTextures: ['sushi-piece', 'sushi-piece-bitten'], emptyTexture: 'sushi-empty',
    request: { viewer: 'Yuki', avatar: 'viewer-chick', dish: 'sushi-finished' }, unlockPreview: ['rice', 'sushi-fillings', 'sushi-knife'],
    steps: [], comments, // steps: CLASSIC_STEPS in recipeCatalog.js
  },
  'bubble-tea-05': {
    id: 'bubble-tea-05', number: 5, title: 'Bubble Tea', recipe: 'bubble-tea', actionLabel: 'Make Bubble Tea',
    unlockPrice: 240, rewardCoins: 360, servings: 3, bitesPerServing: 2,
    finalTexture: 'bubble-tea-finished', servingTexture: 'bubble-tea-full', biteTextures: ['bubble-tea-full', 'bubble-tea-half'], emptyTexture: 'bubble-tea-empty',
    request: { viewer: 'Ava', avatar: 'viewer-bunny', dish: 'bubble-tea-finished' }, unlockPreview: ['pearls', 'syrup', 'ice'],
    steps: [], comments, // steps: CLASSIC_STEPS in recipeCatalog.js
  },
};

const TEXTURE_FIELDS = ['base', 'result', 'item', 'tool', 'cooking', 'ready', 'heat'];

// Resolves '@stage' references to this recipe's atlas sprites and adds the before/after aliases
// used by the pour/stir/tap kinds. The recipe data itself stays declarative.
export function normalizeRecipeStep(definition, item) {
  const resolve = (key) => (typeof key === 'string' && key.startsWith('@') ? foodTexture(definition, key.slice(1)) : key);
  const out = { ...item };
  for (const field of TEXTURE_FIELDS) if (out[field]) out[field] = resolve(out[field]);
  if (out.sequence) out.sequence = out.sequence.map((entry) => ({ ...entry, item: resolve(entry.item), result: resolve(entry.result) }));
  out.before = out.base;
  out.after = out.result ?? out.base;
  return out;
}

for (const [id, steps] of Object.entries(CLASSIC_STEPS)) {
  LEVELS[id].steps = steps.map((item) => normalizeRecipeStep(null, item));
  const extra = CLASSIC_EXTRA[id] ?? {};
  if (extra.reaction) LEVELS[id].reaction = extra.reaction;
  if (extra.finalTexture) Object.assign(LEVELS[id], { finalTexture: extra.finalTexture, servingTexture: extra.finalTexture, request: { ...LEVELS[id].request, dish: extra.finalTexture } });
}

const viewerNames = ['Mina', 'Leo', 'Yuki', 'Ava', 'Sofia'];
const viewerAvatars = ['viewer-cat', 'viewer-bear', 'viewer-chick', 'viewer-bunny'];
for (const definition of NEW_RECIPE_DEFINITIONS) {
  const suffix = String(definition.number).padStart(2, '0');
  const id = `${definition.slug}-${suffix}`;
  const price = 240 + (definition.number - 5) * 30;
  LEVELS[id] = {
    id,
    number: definition.number,
    title: definition.title,
    recipe: definition.slug,
    actionLabel: `Make ${definition.title}`,
    uniqueMechanic: definition.uniqueMechanic,
    reaction: definition.reaction ?? null,
    unlockPrice: price,
    rewardCoins: price + 100,
    servings: 3,
    bitesPerServing: 2,
    finalTexture: foodTexture(definition, 'final'),
    servingTexture: foodTexture(definition, 'final'),
    biteTextures: [foodTexture(definition, 'final'), foodTexture(definition, 'bite')],
    emptyTexture: 'plate-empty',
    request: {
      viewer: viewerNames[definition.number % viewerNames.length],
      avatar: viewerAvatars[definition.number % viewerAvatars.length],
      dish: foodTexture(definition, 'final'),
    },
    unlockPreview: ['raw', 'prep', 'final'].map((stage) => foodTexture(definition, stage)),
    steps: definition.steps.map((item) => normalizeRecipeStep(definition, item)),
    timings: { targetSeconds: definition.steps.length * 6 + 16 },
    comments,
  };
  CAMPAIGN_ORDER.push(id);
}

export const CAMPAIGN_LENGTH = CAMPAIGN_ORDER.length;
if (CAMPAIGN_LENGTH !== 50) throw new Error(`Campaign must contain exactly 50 levels, got ${CAMPAIGN_LENGTH}`);

export function getLevel(id) {
  const level = LEVELS[id];
  if (!level) throw new Error(`Unknown level: ${id}`);
  return level;
}

export function nextLevel(levelId) {
  const i = CAMPAIGN_ORDER.indexOf(levelId);
  return i >= 0 && i + 1 < CAMPAIGN_ORDER.length ? LEVELS[CAMPAIGN_ORDER[i + 1]] : null;
}
