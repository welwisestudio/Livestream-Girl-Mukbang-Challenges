import test from 'node:test';
import assert from 'node:assert/strict';
import { CAMPAIGN_ORDER, LEVELS } from '../../src/content/levels.js';
import { PACING, paceStep } from '../../src/content/pacing.js';

const allSteps = () => CAMPAIGN_ORDER.flatMap((id) => LEVELS[id].steps.map((step) => ({ level: id, step })));
const find = (stepId) => allSteps().find(({ step }) => step.id === stepId).step;

test('pacing keeps every step, its order, kind, art and instruction', () => {
  assert.equal(CAMPAIGN_ORDER.length, 50);
  for (const { level, step } of allSteps()) {
    const paced = paceStep(step);
    for (const key of ['id', 'kind', 'action', 'instruction', 'base', 'item', 'tool', 'result', 'sequence', 'motion', 'style']) {
      assert.deepEqual(paced[key], step[key], `${level}/${step.id}.${key}`);
    }
    // Never shorter than authored.
    if (step.placements) assert.ok(paced.placements >= step.placements, `${level}/${step.id}`);
    if (step.strokes) assert.ok(paced.strokes >= step.strokes, `${level}/${step.id}`);
    if (step.turns) assert.ok(paced.turns > step.turns, `${level}/${step.id}`);
  }
});

test('small toppings are doubled; counts the recipe or art depends on are kept', () => {
  assert.equal(paceStep(find('pepperoni-mini-pizza')).placements, 6);
  assert.equal(paceStep(find('berries-waffles')).placements, 4);
  assert.equal(paceStep(find('onion-fried-rice')).placements, 4);
  for (const id of ['plate-waffles', 'crack-eggs', 'stick-cake-pops', 'cut-donuts', 'fill-muffin-tin', 'stack-mini-pancakes']) {
    assert.equal(paceStep(find(id)).placements, find(id).placements, id);
  }
  for (const { step } of allSteps()) {
    const paced = paceStep(step);
    if (paced.placements) assert.ok(paced.placements <= Math.max(step.placements, PACING.toppingMaxPlacements));
  }
});

test('repeated motions, sprinkles, cooking and pouring get a light increase', () => {
  const sprinkle = allSteps().find(({ step }) => step.kind === 'trace' && step.style === 'sprinkle').step;
  assert.ok(paceStep(sprinkle).length >= (sprinkle.length ?? 1.5) * 1.7);
  const cut = allSteps().find(({ step }) => step.kind === 'gesture' && step.strokes === 3).step;
  assert.equal(paceStep(cut).strokes, 4);
  // One-motion gestures (flip, fold, roll-up) stay a single stroke.
  for (const { step } of allSteps()) if (step.kind === 'gesture' && (step.strokes ?? 1) === 1) assert.equal(paceStep(step).strokes ?? 1, 1);
  const cook = allSteps().find(({ step }) => step.kind === 'cook').step;
  assert.equal(paceStep(cook).processMs, Math.round((cook.processMs ?? 1500) * PACING.cookMs));
  assert.equal(paceStep({ kind: 'pour' }).pourMs, PACING.pourMs);
  // The authored data is never mutated.
  assert.equal(find('pepperoni-mini-pizza').placements, 3);
});
