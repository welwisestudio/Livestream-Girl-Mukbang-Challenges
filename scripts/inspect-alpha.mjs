import sharp from 'sharp';

const [, , input, output] = process.argv;
if (!input) throw new Error('Usage: node scripts/inspect-alpha.mjs <input> [composite-output]');

const image = sharp(input).ensureAlpha();
const { data, info } = await image.raw().toBuffer({ resolveWithObject: true });
let transparent = 0;
let visible = 0;
let solid = 0;
for (let index = 3; index < data.length; index += info.channels) {
  const alpha = data[index];
  if (alpha === 0) transparent += 1;
  if (alpha > 16) visible += 1;
  if (alpha > 245) solid += 1;
}
const pixels = info.width * info.height;
console.log(JSON.stringify({
  width: info.width,
  height: info.height,
  transparentRatio: transparent / pixels,
  visibleRatio: visible / pixels,
  solidRatio: solid / pixels,
}, null, 2));

if (output) {
  const tile = 32;
  const checker = Buffer.alloc(info.width * info.height * 4);
  for (let y = 0; y < info.height; y += 1) {
    for (let x = 0; x < info.width; x += 1) {
      const light = (Math.floor(x / tile) + Math.floor(y / tile)) % 2 === 0;
      const value = light ? 245 : 205;
      const offset = (y * info.width + x) * 4;
      checker[offset] = value;
      checker[offset + 1] = value;
      checker[offset + 2] = value;
      checker[offset + 3] = 255;
    }
  }
  await sharp(checker, { raw: { width: info.width, height: info.height, channels: 4 } })
    .composite([{ input }])
    .png()
    .toFile(output);
}
