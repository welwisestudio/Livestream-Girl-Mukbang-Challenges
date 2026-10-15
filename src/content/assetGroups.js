import { CAMPAIGN_LOBBY, IMAGE_ASSETS } from './assets.js';
import { CAMPAIGN_ORDER, LEVELS } from './levels.js';
import { APPEARANCE_ITEM_BY_ID } from './appearance.js';
import { KITCHEN_KEYS } from './kitchenArt.js';
import { PLAYTIME_REWARDS } from './playtime.js';

// Which art each screen needs. The loading screen downloads only the start set (Lobby, HUD,
// its popups, the equipped character and the dish shown in the Lobby); everything else streams
// in the background right after gameReady, and a screen waits for its own art before it starts
// (normally already there). No image is removed or re-encoded — only *when* it loads changes.

export const ASSET_URL = new Map(IMAGE_ASSETS.map(({ key, url }) => [key, url]));
const inDir = (dir) => IMAGE_ASSETS.filter(({ url }) => url.startsWith(`assets/${dir}/`)).map(({ key }) => key);

// Every manifest key that appears anywhere in a level definition (steps, tools, results, request,
// previews, servings, bites).
function keysIn(value, out = new Set()) {
  if (typeof value === 'string') { if (ASSET_URL.has(value)) out.add(value); }
  else if (Array.isArray(value)) for (const v of value) keysIn(v, out);
  else if (value && typeof value === 'object') for (const v of Object.values(value)) keysIn(v, out);
  return out;
}
export const levelKeys = (levelId) => [...keysIn(LEVELS[levelId] ?? {})];

const HEADS = IMAGE_ASSETS.map(({ key }) => key).filter((k) => k.startsWith('custom-head-'));
const POSES = ['happy', 'eating', 'chewing'];
const hairKind = (equipped) => APPEARANCE_ITEM_BY_ID[equipped?.hair]?.kind ?? 'silver';
const skinKind = (equipped) => APPEARANCE_ITEM_BY_ID[equipped?.skin]?.kind ?? 'peach';
// The three poses of the equipped head, plus the plum head of the same skin that the compositor
// uses as the jaw mask (appearanceTextures.js) — needed for Lobby, level and meal.
export const equippedHeadKeys = (equipped) => [...new Set(['hair', 'plum'].flatMap((which) => POSES.map((pose) =>
  `custom-head-${which === 'hair' ? hairKind(equipped) : 'plum'}-${skinKind(equipped)}-${pose}`)))];

// Level art used by code rather than by level data: effects, reactions, emoji, tools of the
// mukbang, and the shared props of the Level 1 / classic levels.
const FX = KITCHEN_KEYS.filter((k) => k.startsWith('fx-'));
const LEVEL_COMMON = [...new Set([...FX, 'plate-empty', 'sushi-knife', 'grab-ring'].filter((k) => ASSET_URL.has(k)))];

// Art no screen before a level needs: all recipe / kitchen art and the scene-only folders.
// From the shared Level 1 folder only the jelly recipe items are deferred (viewers, room,
// character, coin, hint hand… are used everywhere).
const L1_RECIPE = new Set(['bowl', 'bowl-filled', 'orange-mix', 'whisk', 'jelly-plain', 'jelly-berries', 'jelly-finished',
  'plate-empty', 'piece-full', 'piece-bitten', 'piece-last', 'berries', 'glaze']);
const SHARED = new Set([...inDir('level1').filter((k) => !L1_RECIPE.has(k)), ...CAMPAIGN_LOBBY]);
const LEVEL_ART = new Set([
  ...inDir('campaign50'),
  ...inDir('kitchen'),
  ...CAMPAIGN_ORDER.flatMap(levelKeys).filter((k) => !SHARED.has(k)),
]);
const SCENE_ONLY = {
  Levels: inDir('levels'),
  Store: [...inDir('store'), ...inDir('canteen')],
  PartTime: inDir('part-time'),
  // Wardrobe screen UI only; every wearable part (bodies, hats, glasses, tables, backgrounds)
  // stays in the start set because the Lobby character and room are composed from them.
  Customization: inDir('customization').filter((k) => k.startsWith('custom-icon-') || k === 'custom-price-pill'),
};
// Art from those folders that Lobby popups and shared dialogs also show: the dialog close
// button, the wardrobe card frames and the Playtime Reward item icons.
const SHARED_UI = new Set(['custom-close', 'custom-card', 'custom-card-selected',
  ...PLAYTIME_REWARDS.filter((r) => r.item).map((r) => APPEARANCE_ITEM_BY_ID[r.item]?.texture)].filter((k) => ASSET_URL.has(k)));
const DEFERRED = new Set([...LEVEL_ART, ...Object.values(SCENE_ONLY).flat(), ...HEADS].filter((k) => !SHARED_UI.has(k)));

const finalOf = (number) => LEVELS[CAMPAIGN_ORDER[Math.min(CAMPAIGN_ORDER.length, Math.max(1, number)) - 1]]?.finalTexture;

// Start set: everything that is not deferred, plus the equipped character's heads and the
// dish of the level the Lobby offers.
export function startKeys(save) {
  const keys = new Set(IMAGE_ASSETS.map(({ key }) => key).filter((k) => !DEFERRED.has(k)));
  for (const k of equippedHeadKeys(save?.appearance?.equipped)) keys.add(k);
  const dish = finalOf(save?.availableLevel ?? 1);
  if (dish) keys.add(dish);
  return [...keys];
}

const nextLevelId = (levelId) => CAMPAIGN_ORDER[CAMPAIGN_ORDER.indexOf(levelId) + 1] ?? null;

// Art a screen needs before it starts (start-set art is always loaded already).
export function sceneKeys(sceneKey, data = {}, save = null) {
  switch (sceneKey) {
    case 'Home': return [finalOf(save?.availableLevel ?? 1)].filter(Boolean);
    case 'Level': return [...LEVEL_COMMON, ...levelKeys(data.levelId)];
    // Result reuses the just-played dish and shows only the next level's three unlock-preview
    // pieces. Loading the next recipe's complete cooking set here used to hold the faded screen
    // for several seconds on a cold/mobile connection; that art keeps streaming in background
    // and is awaited only when the player actually starts that level.
    case 'Result': {
      const next = nextLevelId(data.levelId);
      return [
        LEVELS[data.levelId]?.finalTexture,
        ...(next ? LEVELS[next]?.unlockPreview ?? [] : []),
      ].filter((key) => key && ASSET_URL.has(key));
    }
    case 'Levels': return [...SCENE_ONLY.Levels, 'store-check', ...CAMPAIGN_ORDER.map((id) => LEVELS[id].finalTexture)];
    case 'Customization': return [...SCENE_ONLY.Customization, ...HEADS];
    case 'Store': case 'Checkout': case 'Canteen': case 'Meal': return [...SCENE_ONLY.Store, ...LEVEL_COMMON];
    case 'PartTime': return [...SCENE_ONLY.PartTime];
    default: return [];
  }
}

// Background order after gameReady: what the player is most likely to open next comes first.
export function backgroundOrder(save) {
  const current = CAMPAIGN_ORDER[Math.min(CAMPAIGN_ORDER.length, Math.max(1, save?.availableLevel ?? 1)) - 1];
  const at = CAMPAIGN_ORDER.indexOf(current);
  const levelsFromCurrent = [...CAMPAIGN_ORDER.slice(at), ...CAMPAIGN_ORDER.slice(0, at)];
  return [
    ...sceneKeys('Result', { levelId: current }),
    ...sceneKeys('Levels'),
    ...sceneKeys('Customization'),
    ...sceneKeys('Store'),
    ...sceneKeys('PartTime'),
    ...levelsFromCurrent.flatMap(levelKeys),
    ...inDir('kitchen'),
    ...inDir('campaign50'),
    ...IMAGE_ASSETS.map(({ key }) => key),
  ];
}
