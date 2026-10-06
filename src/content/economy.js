// Post-level reward economy. The base reward of each level lives in levels.js
// (`rewardCoins`); this file only holds the shared multiplier offer.
export const LEVEL_REWARD_OFFER = Object.freeze({
  // Segments of the multiplier bar, left to right. The pointer selects the segment under it.
  multipliers: Object.freeze([2, 3, 5, 3, 2]),
  // One edge-to-edge pass of the pointer; it ping-pongs forever and never stops by itself.
  pointerSweepMs: 1600,
  // Stable rewarded-ad placement ID for the platform adapter.
  placementId: 'level-complete-multiplier',
});

// Highest multiplier the service will ever accept (guards against arbitrary values).
export const MAX_REWARD_MULTIPLIER = Math.max(...LEVEL_REWARD_OFFER.multipliers);

// Pointer position for a time `t` (ms): a triangle wave 0 → 1 → 0, never pausing.
export function pointerPosition(t, sweepMs = LEVEL_REWARD_OFFER.pointerSweepMs) {
  const phase = (t / sweepMs) % 2;
  return phase <= 1 ? phase : 2 - phase;
}

// Index of the segment containing `position` (0..1). `stops` are the segment boundaries,
// left to right, of length multipliers.length + 1 (0 … 1).
export function segmentAt(position, stops) {
  for (let i = 0; i < stops.length - 2; i += 1) if (position < stops[i + 1]) return i;
  return stops.length - 2;
}
