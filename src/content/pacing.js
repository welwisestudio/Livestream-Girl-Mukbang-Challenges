import { TIMINGS } from './timings.js';

// Light pacing pass over every cooking step (designer request 2026-10-13): levels feel a little
// fuller without changing recipes, step order, mechanics or art. Applied once per step when its
// view is created, by step kind, so all 50 levels get the same treatment. Counts that the recipe
// states or the art depends on ("Put two waffles", "Crack two eggs", sticks per cake ball, liners
// in a tin, rings cut from a dough sheet) are left as authored.
export const PACING = Object.freeze({
  // Small toppings that stay on the food (berries, pepperoni, green onion, chips…): 2 → 4, 3 → 6.
  toppingRepeat: 2,
  toppingMaxPieceSize: 0.24,
  toppingMaxPlacements: 6,
  // Stirring, whisking, spreading, brushing, tossing: more turns of the circle.
  turns: 1.4,
  // Cutting, chopping, peeling, grating, rolling, shaking, pressing, mashing, kneading. Single
  // motions (flip, fold, sushi roll-up) stay one stroke.
  strokes: 1.4,
  // Sprinkling lasts about twice as long; sauce, icing and piping lines are a bit longer.
  sprinkleLength: 1.8,
  sauceLength: 1.35,
  // Cooking (fry, boil, bake): a slightly longer wait before the food is ready to lift.
  cookMs: 1.25,
  defaultCookMs: 1500,
  // Pouring from a jug or pitcher: a fuller pour.
  pourMs: Math.round(TIMINGS.pourMs * 1.5),
});

function isTopping(step) {
  return step.kind === 'place'
    && !step.sequence
    && (step.placements ?? 1) >= 2
    && step.keep !== false
    && !step.tip && !step.stamp && !step.leave
    && (step.pieceSize ?? 0.26) <= PACING.toppingMaxPieceSize;
}

// Returns a copy of the step with the pacing applied; the authored definition is never mutated.
export function paceStep(step) {
  const out = { ...step };
  if (isTopping(step)) {
    out.placements = Math.min(PACING.toppingMaxPlacements, step.placements * PACING.toppingRepeat);
  }
  if (step.kind === 'stir' && step.turns) out.turns = Math.round(step.turns * PACING.turns * 10) / 10;
  if (step.kind === 'gesture' && (step.strokes ?? 1) >= 2) out.strokes = Math.round(step.strokes * PACING.strokes);
  if (step.kind === 'trace') {
    const k = step.style === 'sprinkle' ? PACING.sprinkleLength : PACING.sauceLength;
    out.length = Math.round((step.length ?? 1.5) * k * 100) / 100;
  }
  if (step.kind === 'cook') out.processMs = Math.round((step.processMs ?? PACING.defaultCookMs) * PACING.cookMs);
  if (step.kind === 'pour') out.pourMs = step.pourMs ?? PACING.pourMs;
  return out;
}
