// QA screenshots of the Canteen flow (needs the dev server on :5173).
// node scripts/qa/canteen-shots.mjs [width height]
import { chromium } from '@playwright/test';
import { mkdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const edge = join(process.env['PROGRAMFILES(X86)'] ?? 'C:\\Program Files (x86)', 'Microsoft', 'Edge', 'Application', 'msedge.exe');
const [w = 390, h = 844] = process.argv.slice(2).map(Number);
const dir = 'qa/canteen';
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
let s = await until((v) => v.scene === 'Home' && v.targets?.canteen);
await click(s.targets.canteen);
s = await until((v) => v.scene === 'Canteen');
await page.waitForTimeout(400);
await shot('1-counter');
await click(s.targets['dish:rice']);
await page.waitForTimeout(350);
await shot('2-scooped');
await click(s.targets['slot:0']);
await page.waitForTimeout(500);
s = await snap();
// Drag fried chicken into the big left compartment.
const from = s.targets['dish:fried-chicken'];
const to = s.targets['slot:3'];
await page.mouse.move(from.x, from.y);
await page.mouse.down();
for (let i = 1; i <= 10; i += 1) await page.mouse.move(from.x + ((to.x - from.x) * i) / 10, from.y + ((to.y - from.y) * i) / 10);
await page.mouse.up();
await page.waitForTimeout(500);
for (const [dish, slot] of [['corn-soup', 1], ['veggies', 2], ['jelly', 4]]) {
  await click(s.targets[`dish:${dish}`]);
  await page.waitForTimeout(300);
  await click(s.targets[`slot:${slot}`]);
  await page.waitForTimeout(500);
}
await shot('3-full-tray');
s = await snap();
console.log('tray', JSON.stringify(s.tray), s.payText, s.countText);
await click(s.targets.pay);
s = await until((v) => v.scene === 'Meal');
await page.waitForTimeout(900);
await shot('4-meal');
s = await snap();
console.log('meal', JSON.stringify(s.menu), JSON.stringify(s.slots), s.save.coins);
await browser.close();
