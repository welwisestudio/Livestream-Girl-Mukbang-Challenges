// Keeps only the largest alpha-connected subject of a Background Remover result.
// Used for sources where Nano Banana echoed faint extra copies around the subject.
// Usage: node scripts/isolate-largest-component.mjs <in.png> <out.png> [alphaThreshold=24]
import sharp from 'sharp';

const [input, output, thresholdArg] = process.argv.slice(2);
const threshold = Number(thresholdArg ?? 24);
const { data, info } = await sharp(input).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
const { width, height } = info;
const labels = new Int32Array(width * height);
const stack = new Int32Array(width * height);
let best = { label: 0, size: 0 };
let next = 1;
for (let start = 0; start < width * height; start += 1) {
  if (labels[start] || data[start * 4 + 3] < threshold) continue;
  let top = 0; let size = 0;
  stack[top++] = start; labels[start] = next;
  while (top) {
    const p = stack[--top]; size += 1;
    const x = p % width; const y = (p - x) / width;
    for (const q of [x > 0 ? p - 1 : -1, x < width - 1 ? p + 1 : -1, y > 0 ? p - width : -1, y < height - 1 ? p + width : -1]) {
      if (q >= 0 && !labels[q] && data[q * 4 + 3] >= threshold) { labels[q] = next; stack[top++] = q; }
    }
  }
  if (size > best.size) best = { label: next, size };
  next += 1;
}
let removed = 0;
for (let p = 0; p < width * height; p += 1) {
  if (labels[p] !== best.label && data[p * 4 + 3] > 0) { data[p * 4 + 3] = 0; removed += 1; }
}
await sharp(data, { raw: { width, height, channels: 4 } }).png().toFile(output);
console.log(`components=${next - 1} kept=${best.size}px cleared=${removed}px`);
