import sharp from 'sharp';

for (const name of ['09-hero-a', '10-hero-b']) {
  await sharp(`art-source/lobby/generated/refresh/raw/${name}.png`)
    .resize({ width: 900, withoutEnlargement: true })
    .png()
    .toFile(`art-source/lobby/generated/refresh/raw/${name}-review.png`);
}
