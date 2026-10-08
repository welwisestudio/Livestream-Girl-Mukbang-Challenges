// Labeled contact sheet of sprite files on a grey background (alpha visible).
// Usage: node scripts/qa/asset-sheet.mjs <out.jpg> <file...>
import sharp from 'sharp';
import { basename } from 'node:path';

const [, , out, ...files] = process.argv;
const W = Number(process.env.W ?? 200); const COLS = Number(process.env.COLS ?? 8);
const comps = [];
for (const [i, f] of files.entries()) {
  const img = await sharp(f).resize(W, W, { fit: 'contain', background: '#cfcfcf' }).flatten({ background: '#cfcfcf' }).png().toBuffer();
  const lab = Buffer.from(`<svg width="${W}" height="20"><rect width="100%" height="100%" fill="#222"/><text x="3" y="15" font-size="12" fill="#fff" font-family="Arial">${basename(f).replace('.webp', '').slice(0, 30)}</text></svg>`);
  comps.push({ input: img, left: (i % COLS) * W, top: Math.floor(i / COLS) * (W + 20) + 20 }, { input: lab, left: (i % COLS) * W, top: Math.floor(i / COLS) * (W + 20) });
}
await sharp({ create: { width: Math.min(COLS, files.length) * W, height: Math.ceil(files.length / COLS) * (W + 20), channels: 3, background: '#bbb' } })
  .composite(comps).jpeg({ quality: 85 }).toFile(out);
