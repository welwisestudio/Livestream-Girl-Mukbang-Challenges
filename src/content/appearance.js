// Expandable appearance catalog. IDs are permanent save-data keys; display order lives here.
export const APPEARANCE_CATEGORIES = Object.freeze([
  { id: 'hair', label: 'HAIR', iconTexture: 'custom-icon-hair' },
  { id: 'skin', label: 'SKIN', iconTexture: 'custom-head-silver-peach-chewing' },
  { id: 'outfit', label: 'OUTFIT', iconTexture: 'custom-icon-outfit' },
  { id: 'accessory', label: 'HATS', iconTexture: 'custom-icon-hat' },
  { id: 'glasses', label: 'GLASSES', iconTexture: 'custom-icon-glasses' },
  { id: 'tablecloth', label: 'TABLE', iconTexture: 'custom-icon-tablecloth' },
  { id: 'background', label: 'ROOM', iconTexture: 'custom-bg-garden' },
]);

export const APPEARANCE_ITEMS = Object.freeze([
  // Retired IDs (`hair-cocoa`, `outfit-mint-cafe`) are intentionally absent; old saves fall back to defaults.
  { id: 'hair-silver', category: 'hair', label: 'Silver', price: 0, kind: 'silver', texture: 'custom-head-silver-peach-happy' },
  { id: 'hair-honey', category: 'hair', label: 'Honey', price: 100, kind: 'honey', texture: 'custom-head-honey-peach-happy', isNew: true },
  { id: 'hair-plum', category: 'hair', label: 'Plum', price: 140, kind: 'plum', texture: 'custom-head-plum-peach-happy' },

  // Skin-tone choice is identity customization, so every tone is available by default.
  { id: 'skin-peach', category: 'skin', label: 'Peach', price: 0, kind: 'peach', texture: 'custom-head-silver-peach-happy' },
  { id: 'skin-warm', category: 'skin', label: 'Warm', price: 0, kind: 'warm', texture: 'custom-head-silver-warm-happy' },
  { id: 'skin-deep', category: 'skin', label: 'Deep', price: 0, kind: 'deep', texture: 'custom-head-silver-deep-happy' },

  { id: 'outfit-frog-sweater', category: 'outfit', label: 'Frog Sweater', price: 0, kind: 'sweater', texture: 'body-sweater' },
  { id: 'outfit-orange-cat', category: 'outfit', label: 'Orange Cat', price: 180, kind: 'cat', texture: 'body-cat' },
  { id: 'outfit-berry-pop', category: 'outfit', label: 'Pink Plush', price: 220, kind: 'pink', texture: 'body-pink' },

  { id: 'accessory-none', category: 'accessory', label: 'None', price: 0, kind: 'none' },
  { id: 'accessory-bow', category: 'accessory', label: 'Sunny Bow', price: 100, kind: 'bonnet', texture: 'custom-bonnet' },
  { id: 'accessory-daisy', category: 'accessory', label: 'Cocoa Beret', price: 120, kind: 'beret', texture: 'custom-beret' },

  { id: 'glasses-none', category: 'glasses', label: 'None', price: 0, kind: 'none' },
  { id: 'glasses-round', category: 'glasses', label: 'Rose Round', price: 90, kind: 'round', texture: 'custom-glasses-round' },
  { id: 'glasses-heart', category: 'glasses', label: 'Heart Pop', price: 130, kind: 'heart', texture: 'custom-glasses-heart' },

  { id: 'table-lavender', category: 'tablecloth', label: 'Lavender', price: 0, texture: 'custom-table-lavender', uiTheme: { id: 'lavender', shelf: 0xeadcf2, panel: 0xf8effc, stroke: 0xc894d4 } },
  { id: 'table-winter', category: 'tablecloth', label: 'Snow Blue', price: 160, texture: 'custom-table-winter', uiTheme: { id: 'winter', shelf: 0xd9effa, panel: 0xedf9ff, stroke: 0x79b9d8 } },
  { id: 'table-floral', category: 'tablecloth', label: 'Pink Daisy', price: 180, texture: 'custom-table-floral', uiTheme: { id: 'floral', shelf: 0xffdce8, panel: 0xffeff5, stroke: 0xe89ab3 } },

  { id: 'background-hearts', category: 'background', label: 'Mint Hearts', price: 0, texture: 'custom-bg-hearts' },
  { id: 'background-bunnies', category: 'background', label: 'Bunny Cream', price: 180, texture: 'custom-bg-bunnies' },
  { id: 'background-garden', category: 'background', label: 'Soft Garden', price: 220, texture: 'custom-bg-garden' },
]);

export const APPEARANCE_ITEM_BY_ID = Object.freeze(Object.fromEntries(APPEARANCE_ITEMS.map((item) => [item.id, item])));

export const DEFAULT_EQUIPPED_APPEARANCE = Object.freeze({
  hair: 'hair-silver',
  skin: 'skin-peach',
  outfit: 'outfit-frog-sweater',
  accessory: 'accessory-none',
  glasses: 'glasses-none',
  tablecloth: 'table-lavender',
  background: 'background-hearts',
});

export const DEFAULT_OWNED_APPEARANCE = Object.freeze([
  'hair-silver',
  'skin-peach', 'skin-warm', 'skin-deep',
  'outfit-frog-sweater',
  'accessory-none',
  'glasses-none',
  'table-lavender',
  'background-hearts',
]);

export function itemsForCategory(categoryId) {
  return APPEARANCE_ITEMS.filter((item) => item.category === categoryId);
}

export function sanitizeEquippedAppearance(value = {}) {
  const result = {};
  for (const category of APPEARANCE_CATEGORIES) {
    const candidate = value[category.id];
    result[category.id] = APPEARANCE_ITEM_BY_ID[candidate]?.category === category.id
      ? candidate
      : DEFAULT_EQUIPPED_APPEARANCE[category.id];
  }
  return result;
}

export function sanitizeAppearanceState(value = {}) {
  const owned = new Set(DEFAULT_OWNED_APPEARANCE);
  for (const id of Array.isArray(value.owned) ? value.owned : []) if (APPEARANCE_ITEM_BY_ID[id]) owned.add(id);
  const equipped = sanitizeEquippedAppearance(value.equipped);
  for (const category of APPEARANCE_CATEGORIES) {
    if (!owned.has(equipped[category.id])) equipped[category.id] = DEFAULT_EQUIPPED_APPEARANCE[category.id];
  }
  return { equipped, owned: [...owned] };
}

export function appearanceSignature(equipped) {
  const clean = sanitizeEquippedAppearance(equipped);
  return APPEARANCE_CATEGORIES.map((category) => clean[category.id]).join('|');
}

export function appearanceHeadTexture(equipped, pose = 'happy') {
  const clean = sanitizeEquippedAppearance(equipped);
  const hair = APPEARANCE_ITEM_BY_ID[clean.hair]?.kind ?? 'silver';
  const skin = APPEARANCE_ITEM_BY_ID[clean.skin]?.kind ?? 'peach';
  return `custom-head-${hair}-${skin}-${pose}`;
}
