// Layout audit: stages every level's mukbang at each viewport and checks that no food rises above the
// tabletop edge (over the heroine), none leaves the screen and her mouth stays clear of the table.
// Usage: node scripts/qa/mukbang-layout-audit.mjs <baseUrl> [screenshotDir] WxH [WxH ...]
import { chromium } from '@playwright/test';
import { existsSync } from 'node:fs';
const { CAMPAIGN_ORDER } = await import('../../src/content/levels.js');
const [, , url, maybeOut, ...rest] = process.argv;
const out = /^\d+x\d+$/.test(maybeOut ?? '') ? null : maybeOut;
const sizes = out ? rest : [maybeOut, ...rest].filter(Boolean);
const edge = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';
const browser = await chromium.launch({ executablePath: existsSync(edge) ? edge : undefined });
const snap = (p) => p.evaluate(() => window.__GAME_DEBUG__?.snapshot());
let failures = 0;
for (const s of sizes) {
  const [width, height] = s.split('x').map(Number);
  const page = await browser.newPage({ viewport: { width, height } });
  await page.goto(url + '?debug=1');
  for (let i = 0; i < 100; i++) { if ((await snap(page))?.scene === 'Home') break; await page.waitForTimeout(100); }
  await page.evaluate(() => window.__GAME_DEBUG__.setTimeScale(12));
  const rows = [];
  for (const [n, id] of CAMPAIGN_ORDER.entries()) {
    await page.evaluate((l) => window.__GAME_DEBUG__.stageMukbang(l), id);
    let v;
    for (let i = 0; i < 200; i++) { v = await snap(page); if (v?.levelId === id && v.phase === 'mukbang' && v.stage?.servings.length === 3) break; await page.waitForTimeout(50); }
    await page.waitForTimeout(150);
    v = await snap(page);
    const st = v.stage;
    const foodTop = Math.min(...st.servings.map((r) => r.y));
    const foodBottom = Math.max(...st.servings.map((r) => r.y + r.height));
    const problems = [];
    if (foodTop < st.tableTop - 1) problems.push(`food above table edge by ${(st.tableTop - foodTop).toFixed(0)}px`);
    if (foodBottom > height) problems.push(`food below screen by ${(foodBottom - height).toFixed(0)}px`);
    if (st.mouth.y > st.tableTop - 30) problems.push(`mouth too close to table (${(st.tableTop - st.mouth.y).toFixed(0)}px)`);
    if (st.character.y + st.character.height <= st.tableTop) problems.push('character not behind table');
    if (st.character.y < 0) problems.push('character cut at top');
    rows.push(`${String(n + 1).padStart(2)} ${id.padEnd(28)} table=${st.tableTop.toFixed(0)} foodTop=${foodTop.toFixed(0)} foodBot=${foodBottom.toFixed(0)} charH=${st.character.height.toFixed(0)} mouthGap=${(st.tableTop - st.mouth.y).toFixed(0)} ${problems.join('; ') || 'ok'}`);
    if (problems.length) failures += 1;
    if (out) await page.screenshot({ path: `${out}/${s}-${String(n + 1).padStart(2, '0')}-${id}.png` });
  }
  console.log(`== ${s}\n${rows.join('\n')}`);
  await page.close();
}
await browser.close();
console.log(`FAILURES: ${failures}`);
if (failures) process.exitCode = 1;
