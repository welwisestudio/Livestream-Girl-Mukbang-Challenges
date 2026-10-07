// Regenerates the per-level tables in project/RECIPE-PLAN.md from the recipe data, so the plan
// and the game can never disagree. Run: node scripts/recipe-plan.mjs
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { CLASSIC_STEPS, NEW_RECIPE_DEFINITIONS } from '../src/content/recipeCatalog.js';

const root = resolve(import.meta.dirname, '..');
const file = resolve(root, 'project/RECIPE-PLAN.md');
const START = '<!-- generated:start -->';
const END = '<!-- generated:end -->';

const name = (key) => (key ? `\`${key}\`` : '—');
const NEW_ART = /^(k-|s-)/;

function art(step) {
  if (step.todo) return `⏳ ${step.todo}`;
  const keys = [step.base, step.result, step.item, step.tool, step.cooking, step.ready, ...(step.sequence ?? []).flatMap((e) => [e.item, e.result])].filter(Boolean);
  const marks = [];
  if (keys.some((k) => NEW_ART.test(k))) marks.push('🆕');
  const drawn = step.kind === 'trace' || (step.kind === 'pour' && !step.result) || (step.kind === 'place' && step.keep !== false && !step.result)
    || (step.kind === 'gesture' && ['cut', 'peel', 'grate'].includes(step.motion)) || step.kind === 'cook';
  if (drawn) marks.push('✨');
  return marks.length ? marks.join(' ') : '✅';
}

function tool(step) {
  if (step.sequence) return step.sequence.map((e) => name(e.item)).join(' → ');
  const parts = [step.tool, step.item, step.heat].filter((k) => k !== undefined);
  if (step.kind === 'gesture' && step.tool === null) parts.push('hand');
  return parts.filter(Boolean).map(name).join(' + ') || 'hand';
}

function change(step) {
  if (step.kind === 'cook') return `${name(step.base)} → ${name(step.cooking ?? step.base)}${step.ready ? ` → ${name(step.ready)}` : ''} → ${name(step.result ?? step.ready ?? step.cooking ?? step.base)}`;
  if (step.kind === 'dip') return `${name(step.item)} into ${name(step.base)} → ${name(step.result)}`;
  if (step.sequence) return `${name(step.base)} → ${step.sequence.map((e) => (e.result ? name(e.result) : `+${name(e.item)}`)).join(' → ')}`;
  const after = step.result && step.result !== step.base ? name(step.result) : 'same sprite + drawn change';
  return `${name(step.base)} → ${after}`;
}

function table(steps) {
  const rows = steps.map((s, i) => `| ${i + 1} | ${s.instruction} | ${s.action} | ${tool(s)} | ${change(s)} | ${art(s)} |`);
  return ['| # | Player action | Interaction | Tool / ingredient | Before → after | Art |', '|---|---|---|---|---|---|', ...rows].join('\n');
}

const titles = { 'ramen-02': '2 — Ramen', 'pizza-03': '3 — Pizza', 'sushi-04': '4 — Sushi', 'bubble-tea-05': '5 — Bubble Tea' };
const sections = [
  '## 1 — Jelly (approved checkpoint, unchanged)\nChoose mold → pour the orange jelly mix → stir → chill and lift the mold → add berries → glaze. The pitcher here holds the jelly mix, so it is the correct tool.',
  ...Object.entries(CLASSIC_STEPS).map(([id, steps]) => `## ${titles[id]}\n${table(steps)}`),
  ...NEW_RECIPE_DEFINITIONS.map((d) => `## ${d.number} — ${d.title}\nSignature moment: ${d.uniqueMechanic}. \`@stage\` = this recipe's own atlas sprite.\n\n${table(d.steps)}`),
];

const doc = readFileSync(file, 'utf8');
const a = doc.indexOf(START);
const b = doc.indexOf(END);
if (a < 0 || b < 0) throw new Error('generated markers missing in RECIPE-PLAN.md');
writeFileSync(file, `${doc.slice(0, a + START.length)}\n\n${sections.join('\n\n')}\n\n${doc.slice(b)}`);
const todos = [...Object.values(CLASSIC_STEPS).flat(), ...NEW_RECIPE_DEFINITIONS.flatMap((d) => d.steps)].filter((s) => s.todo).length;
console.log(`RECIPE-PLAN.md: ${sections.length} levels, ${todos} steps waiting for dedicated art`);
