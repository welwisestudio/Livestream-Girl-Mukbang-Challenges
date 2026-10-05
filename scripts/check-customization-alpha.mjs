import sharp from 'sharp';

for (const path of process.argv.slice(2)) {
  const { data, info } = await sharp(path).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  console.log(path, `${info.width}x${info.height}`, `corner-alpha=${data[3]}`, `corner-rgb=${data[0]},${data[1]},${data[2]}`);
}
