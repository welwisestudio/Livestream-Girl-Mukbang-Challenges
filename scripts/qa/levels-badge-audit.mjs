// Layout audit: Levels screen. Scrolls through all cards at each viewport and checks that a card's
// video marker never touches its own number badge or any part of a neighbouring card.
// Usage: node scripts/qa/levels-badge-audit.mjs <baseUrl> [screenshotDir] WxH [WxH ...]
import { chromium } from '@playwright/test';
import { existsSync } from 'node:fs';
const [, , url, maybeOut, ...rest] = process.argv;
const out = /^\d+x\d+$/.test(maybeOut ?? '') ? null : maybeOut;
const sizes = out ? rest : [maybeOut, ...rest].filter(Boolean);
const edge = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';
const browser = await chromium.launch({ executablePath: existsSync(edge) ? edge : undefined });
const snap = (p) => p.evaluate(() => window.__GAME_DEBUG__?.snapshot());
const hit = (a, b) => a && b && a.x < b.x + b.w - 0.5 && b.x < a.x + a.w - 0.5 && a.y < b.y + b.h - 0.5 && b.y < a.y + a.h - 0.5;
let failures = 0;
for (const s of sizes) {
  const [width, height] = s.split('x').map(Number);
  const page = await browser.newPage({ viewport: { width, height } });
  await page.goto(url + '?debug=1');
  for (let i = 0; i < 100; i++) { if ((await snap(page))?.scene === 'Home') break; await page.waitForTimeout(100); }
  await page.evaluate(() => window.__GAME_DEBUG__.stageScene('Levels'));
  let v;
  for (let i = 0; i < 100; i++) { v = await snap(page); if (v?.scene === 'Levels' && v.cardParts) break; await page.waitForTimeout(100); }
  await page.waitForTimeout(400);
  await page.mouse.move(width / 2, height * 0.7);
  await page.mouse.wheel(0, -100000); await page.waitForTimeout(300);
  const seen = new Set(); const problems = new Set(); let shot = 0;
  for (let step = 0; step < 80; step++) {
    v = await snap(page);
    const parts = Object.entries(v.cardParts);
    for (const [n, p] of parts) {
      seen.add(n);
      if (!p.video) continue;
      if (hit(p.video, p.badge)) problems.add(`L${n}: video touches its own badge`);
      if (p.video.x + p.video.w > p.frame.x + p.frame.w + 0.5) problems.add(`L${n}: video sticks out of its card`);
      for (const [m, q] of parts) if (m !== n && (hit(p.video, q.frame) || hit(p.video, q.badge))) problems.add(`L${n}: video touches card ${m}`);
    }
    for (const [n, p] of parts) for (const [m, q] of parts) if (m !== n && hit(p.badge, q.frame) && Math.abs(p.frame.y - q.frame.y) < 2) problems.add(`L${n}: badge touches card ${m}`);
    if (out && step % 3 === 0 && shot < 4) { await page.screenshot({ path: `${out}/${s}-${shot++}.png` }); }
    if (v.scrollY >= v.maxScroll - 0.5) break;
    await page.mouse.wheel(0, (v.viewport.bottom - v.viewport.top) * 0.5 / 0.6); await page.waitForTimeout(120);
  }
  console.log(`${s}: cols=${v.cols} cards seen=${seen.size}/50 ${problems.size ? [...problems].join('; ') : 'ok'}`);
  if (problems.size || seen.size < 50) failures += 1;
  await page.close();
}
await browser.close();
console.log(`FAILURES: ${failures}`);
if (failures) process.exitCode = 1;
