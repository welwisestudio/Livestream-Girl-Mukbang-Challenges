// Lobby proportion audit: opens the Lobby on a fresh save at many viewports and reports how much
// of the screen the tablecloth takes, how tall the heroine is, and where the table props sit.
// Needs the dev server (npm run dev) on 127.0.0.1:5173. Usage:
//   node scripts/qa/lobby-proportions.mjs [outDir] [WxH ...]
import { chromium } from '@playwright/test';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';

const outDir = process.argv[2] ?? 'qa/lobby-proportions';
const sizes = (process.argv.length > 3 ? process.argv.slice(3) : [
  '320x568', '360x640', '360x800', '390x844', '430x932', '480x640', '768x1024', '876x876',
  '1024x768', '844x390', '1280x720', '1366x768', '1440x900', '1920x1080', '2560x1080', '2560x1440',
]).map((s) => s.split('x').map(Number));
mkdirSync(outDir, { recursive: true });

const edge = process.env.PLAYWRIGHT_EXECUTABLE_PATH ?? 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';
const browser = await chromium.launch(existsSync(edge) ? { executablePath: edge } : undefined);
const report = [];
for (const [width, height] of sizes) {
  const page = await browser.newPage({ viewport: { width, height } });
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('http://127.0.0.1:5173/?debug=1');
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await page.waitForFunction(() => window.__GAME_DEBUG__?.snapshot()?.scene === 'Home', null, { timeout: 30000 });
  await page.waitForTimeout(700);
  const data = await page.evaluate(() => {
    const layout = window.__GAME_DEBUG__.layout();
    return { rects: Object.fromEntries(layout.rects.map((r) => [r.name, r])), minFont: layout.minFont };
  });
  const r = data.rects;
  const plate = r['table-placemat'];
  const ch = r.character;
  const entry = {
    size: `${width}x${height}`,
    clothShare: +((height - r.table.y) / height).toFixed(3),
    tabletop: Math.round(r['nav-start'].y - r.table.y),
    character: { h: Math.round(ch.h), w: Math.round(ch.w), top: Math.round(ch.y), heightShare: +(ch.h / height).toFixed(3) },
    placemat: plate && { y: Math.round(plate.y), h: Math.round(plate.h), w: Math.round(plate.w) },
    startTop: Math.round(r['nav-start'].y),
    minFont: data.minFont,
    errors,
  };
  report.push(entry);
  await page.screenshot({ path: `${outDir}/lobby-${width}x${height}.png` });
  console.log(JSON.stringify(entry));
  await page.close();
}
await browser.close();
writeFileSync(`${outDir}/report.json`, `${JSON.stringify(report, null, 2)}\n`);
