import { test } from 'node:test';
import assert from 'node:assert/strict';
import { CAMPAIGN_ORDER, LEVELS } from '../../src/content/levels.js';

// Guards for the logic-first recipe redesign (project/RECIPE-PLAN.md): tools must match the
// action, so a reused mechanic can never again pour juice over a sausage.
const CUTTERS = new Set(['sushi-knife', 'pizza-cutter']);
const SAUCE_TOOLS = new Set(['k-ketchup', 'k-mustard', 'k-piping-bag', 'soy-sauce', 'syrup']);
const POUR_TOOLS = new Set(['k-ladle', 'k-milk-jug', 'broth', 'syrup', 'milk-tea', 'orange-mix']);
const steps = () => CAMPAIGN_ORDER.slice(1).flatMap((id) => LEVELS[id].steps.map((step) => ({ level: id, ...step })));

test('levels 2–50 use 4–7 actions and only recipe-aware step kinds', () => {
  for (const id of CAMPAIGN_ORDER.slice(1)) {
    const count = LEVELS[id].steps.length;
    assert.ok(count >= 4 && count <= 7, `${id} has ${count} steps`);
  }
  const kinds = new Set(['place', 'dip', 'stir', 'pour', 'trace', 'cook', 'gesture', 'tap-process']);
  for (const step of steps()) assert.ok(kinds.has(step.kind), `${step.level}/${step.id}: ${step.kind}`);
});

test('every tool matches its action', () => {
  for (const step of steps()) {
    const where = `${step.level}/${step.id}`;
    if (step.kind === 'gesture') {
      if (step.motion === 'cut') assert.ok(CUTTERS.has(step.tool), where);
      if (step.motion === 'peel') assert.ok(step.tool === 'k-peeler' || step.tool === null, where);
      if (step.motion === 'grate') assert.equal(step.tool, 'k-grater', where);
      if (step.motion === 'roll') assert.ok(['k-rolling-pin', 'sushi-mat'].includes(step.tool), where);
      if (step.motion === 'flip') assert.equal(step.tool, 'k-spatula', where);
      if (step.motion === 'shake') assert.equal(step.tool, 'shaker', where);
    }
    if (step.kind === 'trace' && step.style === 'sauce') assert.ok(SAUCE_TOOLS.has(step.tool), where);
    if (step.kind === 'pour' && !step.tool.startsWith('food-')) assert.ok(POUR_TOOLS.has(step.tool), where);
    // The syrup pitcher only ever pours syrup or honey.
    if (step.tool === 'syrup') assert.match(step.instruction, /syrup|honey/i, where);
    if (step.kind === 'stir') assert.ok(['k-whisk', 'k-spoon', 'k-ladle'].includes(step.tool), where);
  }
});

test('each step either swaps the food sprite or leaves a visible mark on it', () => {
  for (const step of steps()) {
    const where = `${step.level}/${step.id}`;
    const swaps = step.after && step.after !== step.before;
    const marks = (step.kind === 'place' && (step.keep !== false || step.sequence || step.stamp || step.leave))
      || step.kind === 'trace' || step.kind === 'pour' || step.kind === 'cook' || step.kind === 'dip'
      || (step.kind === 'gesture' && step.motion) || step.kind === 'stir';
    assert.ok(swaps || marks, where);
  }
});
