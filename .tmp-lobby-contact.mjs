import sharp from 'sharp';
import { readdirSync, mkdirSync } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve('.');
const dir = resolve(root, 'art-source/lobby/generated/raw');
const files = readdirSync(dir).filter((name) => name.endsWith('.png')).sort();
const cell = 256;
const cols = 4;
const rows = Math.ceil(files.length / cols);
const layers = [];
for (let i = 0; i < files.length; i += 1) {
  const thumb = await sharp(resolve(dir, files[i]))
    .resize({ width: 220, height: 220, fit: 'inside', background: '#ffffff' })
    .extend({ top: 0, bottom: 36, left: 0, right: 0, background: '#ffffff' })
    .composite([{
      input: Buffer.from(`<svg width="220" height="256"><style>text{font:16px Arial;fill:#5a4050}</style><text x="110" y="246" text-anchor="middle">${files[i].replace('.png','')}</text></svg>`),
      top: 0,
      left: 0,
    }])
    .png()
    .toBuffer();
  layers.push({ input: thumb, left: (i % cols) * cell + 18, top: Math.floor(i / cols) * cell });
}
mkdirSync(resolve(root, 'qa/lobby'), { recursive: true });
await sharp({ create: { width: cols * cell, height: rows * cell, channels: 4, background: '#eee7ef' } })
  .composite(layers)
  .png()
  .toFile(resolve(root, 'qa/lobby/nano-banana-separate-assets-contact.png'));
