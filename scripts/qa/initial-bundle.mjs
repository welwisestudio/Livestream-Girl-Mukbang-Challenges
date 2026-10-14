// Measures the YouTube initial bundle: every file requested from page load until gameReady
// (fake SDK, as in tests/youtube). Usage: node scripts/qa/initial-bundle.mjs <url> [WxH] [--list]
import { chromium } from '@playwright/test';
import { existsSync, readFileSync, statSync } from 'node:fs';
import { gzipSync } from 'node:zlib';
import { resolve } from 'node:path';
import { preparePage } from '../../tests/youtube/harness.js';

const [, , url = 'http://127.0.0.1:4175/', size = '390x844', flag] = process.argv;
const [width, height] = size.split('x').map(Number);
const distDir = process.env.DIST_DIR ? resolve(process.env.DIST_DIR) : resolve(import.meta.dirname, '../../dist-youtube');
const edge = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';
const browser = await chromium.launch({ executablePath: existsSync(edge) ? edge : undefined });
const page = await browser.newPage({ viewport: { width, height } });
const h = await preparePage(page, { data: '' });
await page.addInitScript(() => performance.setResourceTimingBufferSize(5000));
await page.goto(url);
await page.waitForFunction(() => window.__yt?.state.gameReadyAt, null, { timeout: 60000 });
await page.waitForTimeout(3000);
// Resource Timing start times vs the exact moment gameReady was called.
const requested = await page.evaluate(() => {
  const at = window.__yt.state.gameReadyAt;
  const nav = [{ path: location.pathname, beforeReady: true }];
  return nav.concat(performance.getEntriesByType('resource').filter((e) => new URL(e.name).hostname === location.hostname)
    .map((e) => ({ path: decodeURIComponent(new URL(e.name).pathname), beforeReady: e.startTime < at })));
});
let raw = 0; let wire = 0; let later = 0;
const rows = [];
for (const { path, beforeReady } of requested) {
  const file = resolve(distDir, path === '/' ? 'index.html' : path.slice(1));
  if (!existsSync(file)) continue;
  const bytes = statSync(file).size;
  const text = /\.(html|js|css|json|svg)$/.test(file);
  const transfer = text ? gzipSync(readFileSync(file)).length : bytes;
  if (beforeReady) { raw += bytes; wire += transfer; rows.push([bytes, transfer, path]); } else later += bytes;
}
const mib = (b) => (b / 1048576).toFixed(2);
console.log(`viewport ${size}: requests before gameReady ${rows.length}; raw ${mib(raw)} MiB; with gzip on text ${mib(wire)} MiB; fetched after gameReady ${mib(later)} MiB`);
if (flag === '--list') for (const [b, t, p] of rows.sort((a, z) => z[0] - a[0]).slice(0, 40)) console.log(`  ${(b / 1024).toFixed(0).padStart(6)} KiB  (wire ${(t / 1024).toFixed(0)})  ${p}`);
await browser.close();
