import { test } from 'node:test';
import assert from 'node:assert/strict';
import { CAMPAIGN_ORDER, LEVELS } from '../../src/content/levels.js';

// Guards for the logic-first recipe redesign (project/RECIPE-PLAN.md): tools must match the
// action, so a reused mechanic can never again pour juice over a sausage.
const CUTTERS = new Set(['sushi-knife', 'pizza-cutter']);
const SAUCE_TOOLS = new Set(['k-ketchup', 'k-mustard', 'k-piping-bag', 'k-hot-sauce', 'k-soy-bottle', 'k-honey']);
const POUR_TOOLS = new Set(['k-ladle', 'k-milk-jug', 'broth', 'syrup', 'milk-tea', 'orange-mix', 'blender-pink', 'matcha-bowl']);
const CONTAINER = /(^|-)(bowl|pan|pot|basket|blender|fryer|colander)(-|$)|toppings|^ice$|^pearls$/;
const steps = () => CAMPAIGN_ORDER.slice(1).flatMap((id) => LEVELS[id].steps.map((step) => ({ level: id, ...step })));
const allSteps = () => CAMPAIGN_ORDER.flatMap((id) => LEVELS[id].steps.map((step) => ({ level: id, ...step })));

test('cooking has no level-gated add-on choice cards', () => {
  for (const step of allSteps()) {
    assert.ok(!['choice', 'topping'].includes(step.kind), `${step.level}/${step.id}: ${step.kind}`);
    assert.equal(step.options, undefined, `${step.level}/${step.id}: options`);
  }
});

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
      // Shaking moves the closed container itself (no separate shaker sprite on top of the food).
      if (step.motion === 'shake') assert.equal(step.tool, null, where);
    }
    if (step.kind === 'trace' && step.style === 'sauce') assert.ok(SAUCE_TOOLS.has(step.tool), where);
    if (step.kind === 'pour' && !step.tool.startsWith('food-')) assert.ok(POUR_TOOLS.has(step.tool), where);
    // The syrup pitcher only ever pours syrup or honey.
    if (step.tool === 'syrup') assert.match(step.instruction, /syrup|honey/i, where);
    if (step.kind === 'stir') assert.ok(['k-whisk', 'k-spoon', 'k-ladle', 'k-brush', 'k-chasen'].includes(step.tool), where);
    // A whole container is tipped in, never dropped onto the food as a decoration piece.
    if (step.kind === 'place' && step.keep !== false && !step.sequence && !step.stamp && !step.leave) {
      assert.ok(!CONTAINER.test(step.item), `${where}: container ${step.item} placed as a piece`);
    }
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

test('pieces left on the food are single-piece sprites, not containers', () => {
  for (const step of steps()) for (const entry of step.sequence ?? []) {
    assert.ok(!CONTAINER.test(entry.item), `${step.level}/${step.id}: ${entry.item}`);
  }
});

test('the last step ends on the dish shown on the Perfect screen', () => {
  for (const id of CAMPAIGN_ORDER.slice(1)) {
    const level = LEVELS[id];
    const last = level.steps.at(-1);
    assert.equal(last.result ?? last.sequence?.at(-1)?.result ?? last.base, level.finalTexture, id);
  }
});

test('spicy and cold dishes declare their eating reaction', () => {
  const reactions = Object.fromEntries(CAMPAIGN_ORDER.map((id) => [id, LEVELS[id].reaction ?? null]));
  for (const id of ['tacos-11', 'skewers-21', 'mini-pepperoni-pizza-24', 'chicken-wings-33', 'nachos-cheese-45']) assert.equal(reactions[id], 'spicy', id);
  for (const id of ['bubble-tea-05', 'waffles-ice-cream-16', 'strawberry-milkshake-49', 'matcha-bubble-tea-50']) assert.equal(reactions[id], 'cold', id);
});

test('skewers are seasoned with spices, never stirred or brushed with a spoon', () => {
  const steps = LEVELS['skewers-21'].steps;
  const seasoning = steps.find((step) => step.id === 'season-skewers');
  assert.ok(seasoning);
  assert.equal(seasoning.kind, 'trace');
  assert.equal(seasoning.style, 'sprinkle');
  assert.equal(seasoning.tool, 'seasoning');
  assert.ok(!steps.some((step) => step.kind === 'stir'));
});

test('sandwich mayo is squeezed onto the bread, never stirred with a spoon', () => {
  const steps = LEVELS['sandwich-23'].steps;
  const mayo = steps.find((step) => step.id === 'mayo-sandwich');
  assert.ok(mayo);
  assert.equal(mayo.kind, 'trace');
  assert.equal(mayo.style, 'sauce');
  assert.equal(mayo.tool, 'k-piping-bag');
  assert.ok(!steps.some((step) => step.kind === 'stir'));
});

test('every metal whisk is explicitly held wires-down; the bamboo whisk keeps its own grip', () => {
  for (const step of steps()) {
    if (step.tool === 'k-whisk') assert.equal(step.toolAngle, 180, `${step.level}/${step.id}`);
    if (step.tool === 'k-chasen') assert.equal(step.toolAngle, 0, `${step.level}/${step.id}`);
  }
});
