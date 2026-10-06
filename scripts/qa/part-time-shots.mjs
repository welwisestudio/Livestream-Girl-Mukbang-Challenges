// QA screenshots of the Part Time Job screen (needs the dev server on :5173).
// node scripts/qa/part-time-shots.mjs [width height]
import { chromium } from '@playwright/test';
import { mkdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const edge = join(process.env['PROGRAMFILES(X86)'] ?? 'C:\\Program Files (x86)', 'Microsoft', 'Edge', 'Application', 'msedge.exe');
const [w = 390, h = 844] = process.argv.slice(2).map(Number);
mkdirSync('qa/part-time', { recursive: true });
const browser = await chromium.launch(existsSync(edge) ? { executablePath: edge } : {});
const page = await browser.newPage({ viewport: { width: w, height: h } });
page.on('pageerror', (e) => console.log('PAGEERROR', e.message));
await page.goto('http://127.0.0.1:5173/?debug=1');
await page.evaluate(() => localStorage.clear());
await page.reload();
const snap = () => page.evaluate(() => window.__GAME_DEBUG__?.snapshot());
const until = async (fn) => { for (let i = 0; i < 100; i += 1) { const s = await snap(); if (s && fn(s)) return s; await page.waitForTimeout(150); } throw new Error('timeout'); };
let s = await until((v) => v.scene === 'Home' && v.targets?.partTime);
await page.mouse.click(s.targets.partTime.x, s.targets.partTime.y);
s = await until((v) => v.scene === 'PartTime' && v.dialog);
await page.waitForTimeout(400);
await page.screenshot({ path: `qa/part-time/${w}x${h}-intro.png` });
await page.mouse.click(s.targets.dialogPrimary.x, s.targets.dialogPrimary.y);
s = await until((v) => v.phase === 'serving' && !v.dialog);
await page.waitForTimeout(1500);
await page.screenshot({ path: `qa/part-time/${w}x${h}-serving.png` });
s = await snap();
await page.mouse.click(s.targets[`card:${s.shift.request[0]}`].x, s.targets[`card:${s.shift.request[0]}`].y);
await page.waitForTimeout(300);
const wrong = s.shift.options.find((id) => id !== s.shift.request[1]);
await page.mouse.click(s.targets[`card:${wrong}`].x, s.targets[`card:${wrong}`].y);
await page.waitForTimeout(120);
await page.screenshot({ path: `qa/part-time/${w}x${h}-progress-wrong.png` });
console.log(JSON.stringify((await snap()).shift));
await browser.close();
