// Loading-screen viewport audit: freezes the HTML loader (scripts blocked) at many sizes and checks
// that the wallpaper covers every edge, the right art variant is used and the logo, mascot, bar and
// label stay on screen without overlapping. Usage:
//   node scripts/qa/loading-viewports.mjs [url] [outDir]
import { chromium } from '@playwright/test';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import sharp from 'sharp';

const url = process.argv[2] ?? 'http://127.0.0.1:4173/';
const outDir = process.argv[3] ?? 'qa/loading';
mkdirSync(outDir, { recursive: true });

const VIEWPORTS = [
  ['phone-small', 320, 568], ['phone', 390, 844], ['phone-tall', 360, 800], ['phone-xl', 430, 932],
  ['phone-landscape', 844, 390], ['phone-landscape-small', 568, 320],
  ['tablet', 768, 1024], ['tablet-landscape', 1024, 768], ['square', 800, 800],
  ['laptop', 1280, 720], ['desktop', 1440, 900], ['fullhd', 1920, 1080], ['ultrawide', 2560, 1080],
  ['youtube-embed', 640, 360],
];

const edge = process.env.PLAYWRIGHT_EXECUTABLE_PATH
  ?? 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';
const browser = await chromium.launch(existsSync(edge) ? { executablePath: edge } : undefined);

// Mean luminance standard deviation of a strip: the argyle wallpaper is clearly textured, while an
// exposed flat fill colour (the old failure mode) is ~0.
async function stripStdev(png, region) {
  const stats = await sharp(png).extract(region).greyscale().stats();
  return stats.channels[0].stdev;
}

const report = [];
for (const [name, width, height] of VIEWPORTS) {
  const page = await browser.newPage({ viewport: { width, height } });
  await page.route('**/*.js', (route) => route.abort());
  await page.goto(url);
  await page.waitForFunction(() => {
    const imgs = [...document.querySelectorAll('#loader img')];
    return imgs.every((img) => img.complete && img.naturalWidth > 0);
  });
  const info = await page.evaluate(async () => {
    const loader = document.getElementById('loader');
    const bg = getComputedStyle(loader).backgroundImage;
    const src = bg.match(/url\("?(.*?)"?\)/)?.[1];
    const img = new Image();
    img.src = src;
    await img.decode();
    const rect = (el) => { const r = el.getBoundingClientRect(); return { x: r.x, y: r.y, w: r.width, h: r.height }; };
    return {
      bg: src.split('/').pop(), bgW: img.naturalWidth, bgH: img.naturalHeight,
      loader: rect(loader),
      parts: Object.fromEntries(['.logo', '.mascot', '.bar', '.label'].map((s) => [s, rect(loader.querySelector(s))])),
      size: getComputedStyle(loader).backgroundSize,
    };
  });
  await page.waitForTimeout(150);
  const file = `${outDir}/loading-${name}-${width}x${height}.png`;
  const png = await page.screenshot({ path: file });
  const t = 6;
  const strips = {
    top: await stripStdev(png, { left: 0, top: 0, width, height: t }),
    bottom: await stripStdev(png, { left: 0, top: height - t, width, height: t }),
    left: await stripStdev(png, { left: 0, top: 0, width: t, height }),
    right: await stripStdev(png, { left: width - t, top: 0, width: t, height }),
  };
  const failures = [];
  const L = info.loader;
  if (L.x !== 0 || L.y !== 0 || L.w !== width || L.h !== height) failures.push(`loader not full viewport ${JSON.stringify(L)}`);
  if (!info.size.split(',').every((s) => s.trim() === 'cover')) failures.push(`background-size ${info.size}`);
  const wantLandscape = width >= height;
  if (wantLandscape !== info.bg.includes('landscape')) failures.push(`wrong variant ${info.bg}`);
  // Source pixels per CSS pixel shown on screen; values above 1 would mean the art is upscaled.
  const scale = Math.max(width / info.bgW, height / info.bgH);
  for (const [side, sd] of Object.entries(strips)) if (sd < 4) failures.push(`flat ${side} edge (stdev ${sd.toFixed(1)})`);
  const parts = Object.entries(info.parts);
  for (const [sel, r] of parts) {
    if (r.x < 0 || r.y < 0 || r.x + r.w > width + 0.5 || r.y + r.h > height + 0.5) failures.push(`${sel} off-screen`);
  }
  for (let i = 0; i < parts.length - 1; i += 1) {
    const [a, ra] = parts[i]; const [b, rb] = parts[i + 1];
    if (ra.y + ra.h > rb.y + 0.5) failures.push(`${a} overlaps ${b}`);
  }
  report.push({ name, width, height, bg: info.bg, coverScale: +scale.toFixed(3), strips: Object.fromEntries(Object.entries(strips).map(([k, v]) => [k, +v.toFixed(1)])), failures });
  console.log(`${failures.length ? 'FAIL' : 'ok  '} ${name.padEnd(22)} ${String(width).padStart(4)}×${String(height).padEnd(4)} ${info.bg.padEnd(18)} scale ${scale.toFixed(2)} ${failures.join('; ')}`);
  await page.close();
}
await browser.close();
writeFileSync(`${outDir}/report.json`, `${JSON.stringify(report, null, 2)}\n`);
const failed = report.filter((r) => r.failures.length).length;
console.log(failed ? `${failed} viewport(s) failed` : `all ${report.length} viewports passed`);
process.exitCode = failed ? 1 : 0;
