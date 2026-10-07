import sharp from 'sharp';

const [, , output, ...inputs] = process.argv;
if (!output || inputs.length === 0) throw new Error('Usage: node scripts/contact-sheet.mjs <output> <image...>');

const cell = 420;
const columns = Math.min(3, inputs.length);
const rows = Math.ceil(inputs.length / columns);
const background = { r: 230, g: 230, b: 230, alpha: 1 };
const composites = [];
for (let index = 0; index < inputs.length; index += 1) {
  const checker = Buffer.alloc(cell * cell * 4);
  for (let y = 0; y < cell; y += 1) {
    for (let x = 0; x < cell; x += 1) {
      const value = (Math.floor(x / 20) + Math.floor(y / 20)) % 2 === 0 ? 245 : 210;
      const offset = (y * cell + x) * 4;
      checker[offset] = value;
      checker[offset + 1] = value;
      checker[offset + 2] = value;
      checker[offset + 3] = 255;
    }
  }
  const rendered = await sharp(checker, { raw: { width: cell, height: cell, channels: 4 } })
    .composite([{ input: await sharp(inputs[index]).resize(cell, cell).png().toBuffer() }])
    .png()
    .toBuffer();
  composites.push({ input: rendered, left: (index % columns) * cell, top: Math.floor(index / columns) * cell });
}

await sharp({ create: { width: columns * cell, height: rows * cell, channels: 4, background } })
  .composite(composites)
  .png()
  .toFile(output);
