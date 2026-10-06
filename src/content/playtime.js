// Playtime Rewards: a one-time track of seven rewards unlocked by minutes of ACTIVE play
// (visible, not paused, no ad showing). IDs are permanent save keys; order is display order.
// Values are provisional until the economy balance pass.
export const PLAYTIME_REWARDS = Object.freeze([
  { id: 'pt-1', minutes: 1, coins: 200 },
  { id: 'pt-2', minutes: 2, coins: 300 },
  // Item rewards reuse wardrobe items. If the player already owns the item, its catalog
  // price is paid in coins instead so the reward is never wasted.
  { id: 'pt-3', minutes: 4, item: 'outfit-berry-pop' },
  { id: 'pt-4', minutes: 6, coins: 500 },
  { id: 'pt-5', minutes: 9, coins: 1000 },
  { id: 'pt-6', minutes: 12, coins: 2000 },
  { id: 'pt-7', minutes: 15, item: 'hair-plum' },
].map((reward) => Object.freeze(reward)));

export const PLAYTIME_TAKE_ALL_PLACEMENT = 'playtime-take-all';

// Clock rules: one tick is capped so a sleeping tab or a blocked thread cannot add a
// burst of minutes; progress is persisted at most this often while playing.
export const PLAYTIME_MAX_TICK_MS = 2000;
export const PLAYTIME_PERSIST_EVERY_MS = 10_000;
