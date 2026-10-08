// Audit capture: stages levels and screenshots each step (idle + mid-interaction), driving with real mouse input.
// Usage: node audit.mjs <outDir> <levelNumber...>
import { chromium } from '@playwright/test';
import { mkdirSync, existsSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { pathToFileURL } from 'node:url';

const repo = 'C:/Users/teplo/OneDrive/Документы/GitHub/Livestream-Girl-Mukbang-Challenges';
const { CAMPAIGN_ORDER } = await import(pathToFileURL(join(repo, 'src/content/levels.js')).href);
const [, , outDir, ...nums] = process.argv;
const base = process.env.BASE ?? 'http://127.0.0.1:5173/';
const edge = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';
const browser = await chromium.launch({ executablePath: existsSync(edge) ? edge : undefined });
const page = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1 });
const errors = [];
page.on('pageerror', (e) => errors.push(String(e)));
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
const snap = () => page.evaluate(() => window.__GAME_DEBUG__?.snapshot());
async function until(pred, timeout = 15000) {
  const t0 = Date.now();
  for (;;) { const s = await snap(); if (s && pred(s)) return s; if (Date.now() - t0 > timeout) throw new Error(`timeout; last=${JSON.stringify(s)?.slice(0, 400)}`); await page.waitForTimeout(60); }
}
const m = page.mouse;
await page.goto(`${base}?debug=1`);
await page.evaluate(() => localStorage.clear());
await page.reload();
await until((s) => s.scene === 'Home');
if (process.env.TS) await page.evaluate((t) => window.__GAME_DEBUG__.setTimeScale(t), Number(process.env.TS));
const report = [];
for (const n of nums.map(Number)) {
  const id = CAMPAIGN_ORDER[n - 1];
  const dir = resolve(outDir, String(n).padStart(2, '0'));
  mkdirSync(dir, { recursive: true });
  let k = 0;
  const shot = async (name) => { k += 1; await page.screenshot({ path: resolve(dir, `${String(k).padStart(2, '0')}-${name}.png`) }); };
  try {
    await page.evaluate((lid) => window.__GAME_DEBUG__.stageLevel(lid), id);
    let s = await until((v) => v.scene === 'Level' && v.levelId === id && v.targets?.startCooking);
    await m.click(s.targets.startCooking.x, s.targets.startCooking.y);
    for (let guard = 0; guard < 200; guard += 1) {
      s = await until((v) => v.phase === 'mukbang' || (v.phase === 'cooking' && v.stepId && v.targets && Object.keys(v.targets).length));
      if (s.phase === 'mukbang') break;
      const step = s.stepId;
      await page.waitForTimeout(450);
      s = await snap();
      if (s.stepId !== step || !s.targets || !Object.keys(s.targets).length) continue;
      const t = s.targets;
      const fresh = !report.find((r) => r.id === `${n}:${step}`);
      if (fresh) { report.push({ id: `${n}:${step}` }); await shot(`${step}`); }
      if (t.correctChoice) {
        await m.click(t.correctChoice.x, t.correctChoice.y);
        const c = await until((v) => v.targets?.confirm);
        await m.click(c.targets.confirm.x, c.targets.confirm.y);
      } else if (t.stirCenter) {
        const c = t.stirCenter; const r = t.stirRadius;
        await m.move(c.x + r, c.y); await m.down();
        for (let i = 1; i <= 120; i += 1) { const a = (Math.PI * 2 * 2.4 * i) / 120; await m.move(c.x + Math.cos(a) * r, c.y + Math.sin(a) * r); if (i === 40 && fresh) await shot(`${step}-mid`); }
        await m.up();
      } else if (t.tracePath) {
        const p = t.tracePath; await m.move(p[0].x, p[0].y); await m.down();
        for (let i = 1; i < p.length; i += 1) { await m.move(p[i].x, p[i].y, { steps: 2 }); if (i === 30 && fresh) await shot(`${step}-mid`); }
        await m.up();
      } else if (t.lift) {
        if (!t.liftReady) { await until((v) => v.stepId !== step || v.targets?.liftReady, 8000); if (fresh) await shot(`${step}-ready`); continue; }
        await m.click(t.lift.x, t.lift.y);
      } else if (t.gestureFrom) {
        if (t.strokesRemaining === 0) { await page.waitForTimeout(150); continue; }
        const a = t.gestureFrom; const b = t.gestureTo;
        await m.move(a.x, a.y); await m.down();
        for (let i = 1; i <= 14; i += 1) { await m.move(a.x + ((b.x - a.x) * i) / 14, a.y + ((b.y - a.y) * i) / 14); if (i === 7 && fresh) await shot(`${step}-mid`); }
        await m.up();
      } else if (t.dragFrom) {
        if (t.placementsRemaining === 0) { await page.waitForTimeout(150); continue; }
        const a = t.dragFrom; const b = t.target;
        await m.move(a.x, a.y); await m.down();
        for (let i = 1; i <= 14; i += 1) { await m.move(a.x + ((b.x - a.x) * i) / 14, a.y + ((b.y - a.y) * i) / 14); if (i === 13 && fresh) await shot(`${step}-mid`); }
        await m.up();
        if (fresh) { await page.waitForTimeout(500); await shot(`${step}-after`); }
      } else if (t.process) {
        await m.click(t.process.x, t.process.y);
      } else throw new Error(`unsupported ${JSON.stringify(t)}`);
      await page.waitForTimeout(250);
    }
    await page.waitForTimeout(800);
    await shot('mukbang');
    s = await until((v) => v.phase === 'mukbang' && v.targets?.serving);
    await m.move(s.targets.serving.x, s.targets.serving.y); await m.down(); await m.move(s.targets.mouth.x, s.targets.mouth.y, { steps: 10 }); await m.up();
    await page.waitForTimeout(500);
    await shot('eating');
    // Reaction frames (spicy / cold / hot play after the first serving's last bite).
    for (const t of [1000, 1350, 1700]) { await page.waitForTimeout(t === 1000 ? 500 : 350); await shot(`react-${t}`); }
    console.log(`L${n} ${id}: OK`);
  } catch (e) {
    await shot('FAIL');
    console.log(`L${n} ${id}: FAIL ${e.message}`);
  }
}
if (errors.length) console.log('ERRORS', errors.slice(0, 10));
await browser.close();
