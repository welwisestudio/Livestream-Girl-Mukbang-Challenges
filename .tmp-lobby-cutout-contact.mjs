import sharp from 'sharp';
import { readdirSync, mkdirSync } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve('.');
const dir = resolve(root, 'art-source/lobby/generated/cutout');
const files = readdirSync(dir).filter((name) => name.endsWith('.png')).sort();
const cell = 256;
const cols = 4;
const rows = Math.ceil(files.length / cols);
const layers = [];
for (let i = 0; i < files.length; i += 1) {
  const path = resolve(dir, files[i]);
  const { data, info } = await sharp(path).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const corners = [[0,0],[info.width-1,0],[0,info.height-1],[info.width-1,info.height-1]];
  const alphas = corners.map(([x,y]) => data[(y * info.width + x) * 4 + 3]);
  console.log(`${files[i]} ${info.width}x${info.height} corner-alpha=${alphas.join(',')}`);
  const thumb = await sharp(path)
    .resize({ width: 220, height: 220, fit: 'inside' })
    .extend({ top: 0, bottom: 36, left: 0, right: 0, background: { r:0,g:0,b:0,alpha:0 } })
    .composite([{
      input: Buffer.from(`<svg width="220" height="256"><style>text{font:16px Arial;fill:#5a4050}</style><text x="110" y="246" text-anchor="middle">${files[i].replace('.png','')}</text></svg>`),
      top: 0,
      left: 0,
    }])
    .png().toBuffer();
  layers.push({ input: thumb, left: (i % cols) * cell + 18, top: Math.floor(i / cols) * cell });
}
mkdirSync(resolve(root, 'qa/lobby'), { recursive: true });
const checker = await sharp({
  create: { width: cols * cell, height: rows * cell, channels: 4, background: '#f3edf4' },
}).composite(Array.from({length:rows*8},(_,i)=>({
  input: { create: { width:128, height:128, channels:4, background: i%2 ? '#e5dbe7' : '#f8f4f9' } },
  left:(i%8)*128, top:Math.floor(i/8)*128
}))).png().toBuffer();
await sharp(checker).composite(layers).png().toFile(resolve(root, 'qa/lobby/nano-banana-cutouts-contact.png'));
