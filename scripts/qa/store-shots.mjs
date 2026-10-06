// QA screenshots of the supermarket flow (needs the dev server on :5173).
// node scripts/qa/store-shots.mjs [width height]
import { chromium } from '@playwright/test';
import { mkdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const edge = join(process.env['PROGRAMFILES(X86)'] ?? 'C:\\Program Files (x86)', 'Microsoft', 'Edge', 'Application', 'msedge.exe');
const [w = 390, h = 844] = process.argv.slice(2).map(Number);
const dir = 'qa/store';
mkdirSync(dir, { recursive: true });
const browser = await chromium.launch(existsSync(edge) ? { executablePath: edge } : {});
const page = await browser.newPage({ viewport: { width: w, height: h } });
page.on('pageerror', (e) => console.log('PAGEERROR', e.message));
page.on('console', (m) => { if (m.type() === 'error') console.log('CONSOLE', m.text()); });
await page.goto('http://127.0.0.1:5173/?debug=1');
await page.evaluate(() => localStorage.clear());
await page.reload();
const snap = () => page.evaluate(() => window.__GAME_DEBUG__?.snapshot());
const until = async (fn) => { for (let i = 0; i < 120; i += 1) { const s = await snap(); if (s && fn(s)) return s; await page.waitForTimeout(150); } throw new Error('timeout'); };
const click = (p) => page.mouse.click(p.x, p.y);
const shot = (name) => page.screenshot({ path: `${dir}/${w}x${h}-${name}.png` });
let s = await until((v) => v.scene === 'Home' && v.targets?.store);
await click(s.targets.store);
s = await until((v) => v.scene === 'Store');
await page.waitForTimeout(400);
await shot('1-shelf');
for (const key of ['new-arrivals:0:0', 'new-arrivals:1:1', 'new-arrivals:2:0']) { await click(s.targets[`slot:${key}`]); await page.waitForTimeout(350); }
await shot('2-selected');
s = await snap();
await click(s.targets.arrowRight);
await page.waitForTimeout(400);
s = await snap();
await click(s.targets['slot:matcha:1:1']);
await page.waitForTimeout(400);
await shot('3-matcha');
s = await snap();
console.log('basket', JSON.stringify(s.basket), s.cartText, s.totalText);
await click(s.targets.check);
s = await until((v) => v.scene === 'Checkout');
await page.waitForTimeout(400);
await shot('4-checkout');
for (;;) {
  s = await snap();
  const key = Object.keys(s.targets).find((k) => k.startsWith('item:'));
  if (!key) break;
  await click(s.targets[key]);
  await page.waitForTimeout(500);
}
s = await until((v) => v.phase === 'ready');
await page.waitForTimeout(300);
await shot('5-scanned');
await click(s.targets.pay);
await page.waitForTimeout(1300);
await shot('6-paying');
s = await until((v) => v.scene === 'Snack');
await page.waitForTimeout(800);
await shot('7-snack');
s = await snap();
console.log('snack', JSON.stringify(s.menu), JSON.stringify(s.save.pantry), s.save.coins);
await browser.close();
