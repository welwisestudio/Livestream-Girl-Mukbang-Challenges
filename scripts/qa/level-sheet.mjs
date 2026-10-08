// Builds one contact sheet per audited level from recipe-audit.mjs captures.
// Usage: node scripts/qa/level-sheet.mjs <auditDir> [levelDir...]
import sharp from 'sharp';
import { readdirSync } from 'node:fs';
import { resolve } from 'node:path';

const [, , root, ...only] = process.argv;
const W = 234; const H = 506; const COLS = 6;
for (const dir of (only.length ? only : readdirSync(root).filter((d) => /^\d+$/.test(d)))) {
  const files = readdirSync(resolve(root, dir)).filter((f) => f.endsWith('.png'));
  const rows = Math.ceil(files.length / COLS);
  const composites = [];
  for (const [i, f] of files.entries()) {
    const img = await sharp(resolve(root, dir, f)).resize(W, H, { fit: 'contain', background: '#fff' }).png().toBuffer();
    const label = Buffer.from(`<svg width="${W}" height="22"><rect width="100%" height="100%" fill="#222"/><text x="4" y="16" font-size="13" fill="#fff" font-family="Arial">${f.replace('.png', '').slice(0, 34)}</text></svg>`);
    composites.push({ input: img, left: (i % COLS) * W, top: Math.floor(i / COLS) * (H + 22) + 22 });
    composites.push({ input: label, left: (i % COLS) * W, top: Math.floor(i / COLS) * (H + 22) });
  }
  await sharp({ create: { width: COLS * W, height: rows * (H + 22), channels: 3, background: '#ddd' } })
    .composite(composites).jpeg({ quality: 82 }).toFile(resolve(root, `sheet-${dir}.jpg`));
}
