// QA probe: stages a level, finishes cooking with real input, then eats drag/tap/drag like the e2e route.
// Usage: node scripts/qa/eat-probe.mjs <levelNumber...>
import { chromium } from '@playwright/test';
import { existsSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';

const { CAMPAIGN_ORDER } = await import(pathToFileURL(resolve(import.meta.dirname, '../../src/content/levels.js')).href);
const edge = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';
const browser = await chromium.launch({ executablePath: existsSync(edge) ? edge : undefined });
const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
const snap = () => page.evaluate(() => window.__GAME_DEBUG__?.snapshot());
const until = async (pred, ms = 15000) => { const t0 = Date.now(); for (;;) { const s = await snap(); if (s && pred(s)) return s; if (Date.now() - t0 > ms) throw new Error(`timeout ${JSON.stringify({ ph: s?.phase, eaten: s?.servingsEaten, t: s?.targets })}`); await page.waitForTimeout(60); } };
await page.goto('http://127.0.0.1:5173/?debug=1');
await until((s) => s.scene === 'Home');
await page.evaluate((t) => window.__GAME_DEBUG__.setTimeScale(t), Number(process.env.TS ?? 1));
for (const n of process.argv.slice(2).map(Number)) {
  const id = CAMPAIGN_ORDER[n - 1];
  await page.evaluate((l) => window.__GAME_DEBUG__.stageLevel(l), id);
  let s = await until((v) => v.scene === 'Level' && v.targets?.startCooking);
  await page.mouse.click(s.targets.startCooking.x, s.targets.startCooking.y);
  // Skip cooking quickly by driving targets (same as the audit script, no captures).
  for (let g = 0; g < 300; g += 1) {
    s = await until((v) => v.phase === 'mukbang' || (v.phase === 'cooking' && v.targets && Object.keys(v.targets).length), 20000);
    if (s.phase === 'mukbang') break;
    const t = s.targets; const m = page.mouse;
    const drag = async (a, b) => { await m.move(a.x, a.y); await m.down(); await m.move(b.x, b.y, { steps: 12 }); await m.up(); };
    if (t.correctChoice) { await m.click(t.correctChoice.x, t.correctChoice.y); const c = await until((v) => v.targets?.confirm); await m.click(c.targets.confirm.x, c.targets.confirm.y); }
    else if (t.stirCenter) { const c = t.stirCenter; const r = t.stirRadius; await m.move(c.x + r, c.y); await m.down(); for (let i = 1; i <= 100; i += 1) { const a = (Math.PI * 2 * 2.4 * i) / 100; await m.move(c.x + Math.cos(a) * r, c.y + Math.sin(a) * r); } await m.up(); }
    else if (t.tracePath) { const p = t.tracePath; await m.move(p[0].x, p[0].y); await m.down(); for (const q of p.slice(1)) await m.move(q.x, q.y, { steps: 2 }); await m.up(); }
    else if (t.lift) { if (t.liftReady) await m.click(t.lift.x, t.lift.y); else await page.waitForTimeout(150); }
    else if (t.gestureFrom) { if (t.strokesRemaining) await drag(t.gestureFrom, t.gestureTo); }
    else if (t.dragFrom) { if (t.placementsRemaining !== 0) await drag(t.dragFrom, t.target); }
    else if (t.process) await m.click(t.process.x, t.process.y);
    await page.waitForTimeout(200);
  }
  for (let i = 0; i < 3; i += 1) {
    s = await until((v) => v.phase === 'mukbang' && v.servingsEaten === i && v.targets?.serving, 20000).catch((e) => { console.log(`L${n} serving ${i}: ${e.message}`); return null; });
    if (!s) break;
    if (i === 1) await page.mouse.click(s.targets.serving.x, s.targets.serving.y);
    else { await page.mouse.move(s.targets.serving.x, s.targets.serving.y); await page.mouse.down(); await page.mouse.move(s.targets.mouth.x, s.targets.mouth.y, { steps: 10 }); await page.mouse.up(); }
  }
  const r = await until((v) => v.scene === 'Result', 25000).then(() => 'Result OK').catch((e) => e.message);
  console.log(`L${n}: ${r}`);
}
await browser.close();
