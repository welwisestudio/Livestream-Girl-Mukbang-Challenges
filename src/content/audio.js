// Audio manifest (2026-10-13). Sources: reference/input/BackgroundMusic.ogg and
// reference/input/Sounds.zip (22 clips); 19 clips are copied to public/assets/audio/ under
// kebab-case names. Unused on purpose: lipstick (−51 dB RMS, near silent), pencil (−39 dB faint
// hiss, no matching action), wipescrub (same scrub texture as makeup-brush / shampoo-wash).
// Mapping and measurements: project/AUDIO.md. Volumes were balanced by measured loudness
// (scratch mix-levels pass): music ≈ −27 dB RMS; frequent short hits (tap, place, bite) ≈ −16…−18;
// chimes ≈ −19…−22; held loops ≈ −21…−25 dB.
//
// Every effect is one entry: `file`, `bus` ('ui' | 'sfx'), `volume` (0–1 before the bus),
// `slices` ([start, duration] seconds inside the file; one is picked per play, never the same
// one twice in a row), `rate` (playback rate or [min, max] for light variation), `gap` (min ms
// between two plays of this id — rapid repeats are dropped), `voices` (max overlapping copies;
// the oldest is cut). Entries with `loop: [start, end]` are held sounds (stir, fry, squeeze):
// they run while the action continues and fade out when it stops.

export const AUDIO_PATH = 'assets/audio/';

export const MUSIC = Object.freeze({ file: 'music-main', volume: 0.3, fadeInMs: 900 });

// Bus gains under the player's volume setting (music volume × MUSIC.volume, ui/sfx × these).
export const BUS_GAIN = Object.freeze({ ui: 0.8, sfx: 0.9 });

export const SOUND_FILES = Object.freeze([
  'bubble', 'put', 'right', 'glass-wipe', 'cut', 'water-pour', 'fire-crack', 'shampoo-wash',
  'xitkem', 'spray', 'nail-file', 'peeling', 'makeup-tap', 'face-massage', 'cotton', 'towel',
  'brushing-hair', 'makeup-brush', 'card-friction',
]);

const tapHits = [0.21, 0.61, 1.01, 1.45, 1.9].map((s) => [s, 0.2]);

// Sound groups share one cooldown and one voice across their ids: `gap` (ms after any member
// started) and `voices` (members playing at once). A member asked for inside the cooldown or
// while another member still sounds plays its `fallback` instead (or nothing).
export const SFX_GROUPS = Object.freeze({
  // "Wooow": Perfect!!, shift complete, rewards and unlocks — at most one every 8 s, never stacked.
  wow: { gap: 8000, voices: 1 },
});

export const SFX = Object.freeze({
  // ---- UI -------------------------------------------------------------------------------------
  tap: { file: 'bubble', bus: 'ui', volume: 0.4, slices: [[0.47, 0.26]], rate: [1, 1.14], gap: 60, voices: 2 },
  close: { file: 'bubble', bus: 'ui', volume: 0.34, slices: [[0.47, 0.3]], rate: 0.78, gap: 90, voices: 1 },
  toggle: { file: 'put', bus: 'ui', volume: 0.38, rate: 1.3, gap: 70, voices: 1 },
  select: { file: 'put', bus: 'ui', volume: 0.34, rate: [1.12, 1.24], gap: 60, voices: 2 },
  // `right` is a voiced "Wooow", not a chime: it is kept for special moments only (group 'wow',
  // see SFX_GROUPS). Routine confirmations (coins, purchases, cooking steps) use bubble pops.
  coin: { file: 'bubble', bus: 'ui', volume: 0.22, slices: [[0.47, 0.22]], rate: [1.9, 2.15], gap: 70, voices: 3 },
  purchase: { file: 'bubble', bus: 'ui', volume: 0.46, slices: [[0.47, 0.3]], rate: 1.18, gap: 350, voices: 1 },
  chime: { file: 'bubble', bus: 'ui', volume: 0.44, slices: [[0.47, 0.26]], rate: 1.55, gap: 300, voices: 1 },
  reward: { file: 'right', bus: 'ui', volume: 0.65, rate: 1.12, gap: 400, voices: 1, group: 'wow', fallback: 'chime' },
  unlock: { file: 'right', bus: 'ui', volume: 0.6, rate: 0.92, gap: 400, voices: 1, group: 'wow', fallback: 'chime' },
  wrong: { file: 'put', bus: 'ui', volume: 0.4, rate: 0.55, gap: 280, voices: 1 },
  card: { file: 'card-friction', bus: 'ui', volume: 0.5, slices: [[0.78, 0.6]], gap: 600, voices: 1 },
  scan: { file: 'glass-wipe', bus: 'ui', volume: 0.5, slices: [[0.05, 0.24]], rate: [0.98, 1.04], gap: 90, voices: 2 },
  'equip-outfit': { file: 'towel', bus: 'ui', volume: 0.42, slices: [[2.02, 0.42]], gap: 200, voices: 1 },
  'equip-hair': { file: 'brushing-hair', bus: 'ui', volume: 0.6, slices: [[0.33, 0.62], [1.2, 0.62]], gap: 200, voices: 1 },
  'equip-item': { file: 'put', bus: 'ui', volume: 0.4, rate: 1.05, gap: 120, voices: 1 },

  // ---- Cooking ----------------------------------------------------------------------------------
  place: { file: 'put', bus: 'sfx', volume: 0.4, rate: [0.9, 1.08], gap: 60, voices: 2 },
  tip: { file: 'peeling', bus: 'sfx', volume: 0.5, slices: [[0.68, 0.62]], rate: 0.9, gap: 300, voices: 1 },
  cut: { file: 'cut', bus: 'sfx', volume: 0.8, slices: [[0.09, 0.56]], rate: [0.95, 1.08], gap: 110, voices: 2 },
  peel: { file: 'peeling', bus: 'sfx', volume: 0.62, slices: [[0.68, 0.45], [0.48, 0.3]], gap: 110, voices: 2 },
  grate: { file: 'nail-file', bus: 'sfx', volume: 0.55, slices: [[0.38, 0.48], [0.86, 0.5]], gap: 110, voices: 2 },
  roll: { file: 'card-friction', bus: 'sfx', volume: 0.5, slices: [[0.8, 0.58]], rate: [0.95, 1.05], gap: 140, voices: 1 },
  press: { file: 'face-massage', bus: 'sfx', volume: 0.8, slices: [[0.04, 0.2], [1.04, 0.2], [1.56, 0.22]], gap: 110, voices: 2 },
  shake: { file: 'makeup-tap', bus: 'sfx', volume: 0.6, slices: tapHits, rate: [0.95, 1.08], gap: 110, voices: 2 },
  flip: { file: 'towel', bus: 'sfx', volume: 0.36, slices: [[2.04, 0.3]], rate: 1.15, gap: 300, voices: 1 },
  dip: { file: 'water-pour', bus: 'sfx', volume: 0.7, slices: [[1.12, 0.45]], gap: 300, voices: 1 },
  pour: { file: 'water-pour', bus: 'sfx', volume: 0.65, slices: [[0.1, 1.95]], gap: 400, voices: 1 },
  ready: { file: 'bubble', bus: 'sfx', volume: 0.38, slices: [[0.47, 0.26]], rate: 1.3, gap: 300, voices: 1 },
  unmold: { file: 'bubble', bus: 'sfx', volume: 0.4, slices: [[0.47, 0.3]], rate: 0.7, gap: 300, voices: 1 },
  step: { file: 'bubble', bus: 'sfx', volume: 0.4, slices: [[0.47, 0.26]], rate: 1.42, gap: 300, voices: 1 },
  perfect: { file: 'right', bus: 'sfx', volume: 0.75, gap: 600, voices: 1, group: 'wow', fallback: 'chime' },
  // Held loops.
  stir: { file: 'shampoo-wash', bus: 'sfx', volume: 0.42, loop: [0.3, 3.3] },
  brush: { file: 'makeup-brush', bus: 'sfx', volume: 0.5, loop: [0.12, 1.2] },
  sauce: { file: 'xitkem', bus: 'sfx', volume: 0.5, loop: [0.06, 0.52] },
  sprinkle: { file: 'spray', bus: 'sfx', volume: 0.42, loop: [0.9, 1.62] },
  fry: { file: 'fire-crack', bus: 'sfx', volume: 0.4, loop: [0.15, 3.45] },
  boil: { file: 'fire-crack', bus: 'sfx', volume: 0.3, loop: [0.15, 3.45], rate: 0.75 },
  blend: { file: 'shampoo-wash', bus: 'sfx', volume: 0.38, loop: [0.3, 3.3], rate: 1.35 },
  bake: { file: 'fire-crack', bus: 'sfx', volume: 0.24, loop: [0.15, 3.45], rate: 0.9 },

  // ---- Mukbang / modes --------------------------------------------------------------------------
  bite: { file: 'cotton', bus: 'sfx', volume: 0.42, slices: [[0.09, 0.2], [0.4, 0.3], [0.86, 0.3]], rate: [0.95, 1.1], gap: 150, voices: 2 },
  sip: { file: 'water-pour', bus: 'sfx', volume: 0.55, slices: [[1.65, 0.3], [1.14, 0.32]], rate: 0.85, gap: 200, voices: 1 },
  serve: { file: 'put', bus: 'sfx', volume: 0.36, rate: [0.95, 1.05], gap: 80, voices: 2 },
});

// Gesture motion (cut / chop, peel, grate, roll, flip, shake, press / mash / knead, fold) → the
// sound of one completed stroke.
export const MOTION_SFX = Object.freeze({
  cut: 'cut', peel: 'peel', grate: 'grate', roll: 'roll', flip: 'flip', shake: 'shake', press: 'press', fold: 'press',
});

// Held loop for a stir-type step (whisk / stir / toss → wet mixing, brush / spread → brush).
export const STIR_LOOP = Object.freeze({ WHISK: 'stir', STIR: 'stir', TOSS: 'stir', BRUSH: 'brush', SPREAD: 'brush' });

// Held loop for a cook step by its base appliance.
export function cookLoop(step) {
  if (step.action === 'BLEND') return 'blend';
  if (step.action === 'BOIL' || step.effect === 'steam') return 'boil';
  if (step.action === 'BAKE' || step.effect === 'heat') return 'bake';
  return 'fry';
}
