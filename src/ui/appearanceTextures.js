import {
  APPEARANCE_ITEM_BY_ID,
  appearanceHeadTexture,
  appearanceSignature,
  sanitizeEquippedAppearance,
} from '../content/appearance.js';

function poseFromKey(baseKey) {
  if (baseKey.includes('eating')) return 'eating';
  if (baseKey.includes('chewing')) return 'chewing';
  return 'happy';
}

function drawLayer(ctx, source, { x, y, width }) {
  if (!source) return;
  const height = width * (source.height / source.width);
  ctx.drawImage(source, x - width / 2, y - height / 2, width, height);
}

const HEAD_PLACEMENT = Object.freeze({
  // Hooded outfits keep their painted hood and replace only the opening. Keeping
  // the generated head inside that opening prevents the source hair from showing
  // as a second silhouette around the selected hairstyle.
  cat: { x: 0.5, y: 0.45, width: 0.82, clearX: 0.5, clearY: 0.49, clearRx: 0.36, clearRy: 0.31 },
  frog: { x: 0.5, y: 0.45, width: 0.82, clearX: 0.5, clearY: 0.49, clearRx: 0.36, clearRy: 0.31 },
  // Pink Plush has no hood to preserve, so its whole baked head must be removed.
  pink: { x: 0.5, y: 0.43, width: 0.98, clearTop: 0.72 },
});

function clearLegacyHead(ctx, width, height, placement) {
  ctx.save();
  ctx.globalCompositeOperation = 'destination-out';
  if (placement.clearTop) {
    ctx.fillRect(0, 0, width, height * placement.clearTop);
  } else {
    ctx.beginPath();
    ctx.ellipse(
      width * placement.clearX,
      height * placement.clearY,
      width * placement.clearRx,
      height * placement.clearRy,
      0, 0, Math.PI * 2,
    );
    ctx.fill();
  }
  // Outfits contain the original character's baked neck. The replacement assets
  // are deliberately head-only, so remove the baked neck as well.
  ctx.beginPath();
  ctx.ellipse(width * 0.5, height * 0.7, width * 0.12, height * 0.1, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function extendOutfitCollar(ctx, source, width, height) {
  // Reuse the outfit's own painted fabric from immediately below the neckline.
  // Stretching this small centre patch upward closes the space left by the removed
  // baked neck without introducing skin, a synthetic neck, or a foreign texture.
  ctx.drawImage(
    source,
    width * 0.28,
    height * 0.78,
    width * 0.44,
    height * 0.08,
    width * 0.28,
    height * 0.6,
    width * 0.44,
    height * 0.24,
  );
}

function decorate(scene, ctx, width, height, appearance, placement) {
  const accessory = APPEARANCE_ITEM_BY_ID[appearance.accessory];
  const glasses = APPEARANCE_ITEM_BY_ID[appearance.glasses];

  // Headwear sits behind eyewear: glasses must always remain readable on the face.
  if (accessory?.texture) {
    const beret = accessory.kind === 'beret';
    drawLayer(ctx, scene.textures.get(accessory.texture).getSourceImage(), {
      x: width * (beret ? 0.41 : 0.5),
      y: height * (beret ? 0.17 : 0.185),
      width: width * (beret ? 0.43 : 0.58),
    });
  }

  if (glasses?.texture) {
    drawLayer(ctx, scene.textures.get(glasses.texture).getSourceImage(), {
      x: width * 0.5,
      // Derive the eye line from the actual head placement. Hooded outfits and
      // Pink Plush do not place the replacement head at the same vertical anchor.
      y: height * placement.y + width * placement.width * 0.035,
      width: width * placement.width * 0.46,
    });
  }
}

export function baseAppearanceTexture(equipped, baseKey = 'character-happy') {
  const appearance = sanitizeEquippedAppearance(equipped);
  const outfit = APPEARANCE_ITEM_BY_ID[appearance.outfit];
  return `character-${outfit.kind}-${poseFromKey(baseKey)}`;
}

export function appearanceTexture(scene, baseKey, equipped) {
  const appearance = sanitizeEquippedAppearance(equipped);
  const pose = poseFromKey(baseKey);
  const sourceKey = baseAppearanceTexture(appearance, baseKey);
  const key = `appearance:v11:${pose}:${appearanceSignature(appearance)}`;
  if (scene.textures.exists(key)) return key;

  const outfit = APPEARANCE_ITEM_BY_ID[appearance.outfit];
  const placement = HEAD_PLACEMENT[outfit.kind] ?? HEAD_PLACEMENT.cat;
  const source = scene.textures.get(sourceKey).getSourceImage();
  const head = scene.textures.get(appearanceHeadTexture(appearance, pose)).getSourceImage();
  const texture = scene.textures.createCanvas(key, source.width, source.height);
  const ctx = texture.getContext();
  ctx.clearRect(0, 0, source.width, source.height);
  ctx.drawImage(source, 0, 0);

  // Remove the old baked face/hair, then insert one coherent generated head.
  // There is no colour classifier, tint layer, or separately pasted skin/hair mask.
  clearLegacyHead(ctx, source.width, source.height, placement);
  extendOutfitCollar(ctx, source, source.width, source.height);
  drawLayer(ctx, head, {
    x: source.width * placement.x,
    y: source.height * placement.y,
    width: source.width * placement.width,
  });
  decorate(scene, ctx, source.width, source.height, appearance, placement);
  texture.refresh();
  return key;
}
