import {
  APPEARANCE_ITEM_BY_ID,
  appearanceHeadTexture,
  appearanceSignature,
  sanitizeEquippedAppearance,
} from '../content/appearance.js';
import { CANVAS, FIT, HEAD, MOUTH, OUTFIT_LAYERS } from '../content/characterRig.js';

function poseFromKey(baseKey) {
  if (baseKey.includes('eating')) return 'eating';
  if (baseKey.includes('chewing')) return 'chewing';
  return 'happy';
}

// Draws a source (already trimmed to its opaque bounds at build time) so that its
// width equals `fit.width` head cells, anchored by `top` or vertical centre `cy`.
function drawFitted(ctx, source, fit) {
  if (!source) return;
  const cell = CANVAS.pxPerCell;
  const w = fit.width * cell;
  const h = w * (source.height / source.width);
  const x = fit.cx * cell - w / 2;
  const y = (fit.top !== undefined ? fit.top * cell : fit.cy * cell - h / 2) - CANVAS.top * cell;
  ctx.drawImage(source, x, y, w, h);
}

// `frontOnly` keeps just the part above HEAD.frontCut (face, bangs, side strands);
// everything below — the back hair under the chin — stays behind the body.
function drawHead(ctx, head, frontOnly = false) {
  if (!head) return;
  const cell = CANVAS.pxPerCell;
  ctx.save();
  if (frontOnly) {
    ctx.beginPath();
    ctx.rect(0, 0, cell * CANVAS.width, (HEAD.frontCut - CANVAS.top) * cell);
    ctx.clip();
  }
  ctx.drawImage(head, 0, -CANVAS.top * cell, cell, cell);
  ctx.restore();
}

function sourceImage(scene, key) {
  return key && scene.textures.exists(key) ? scene.textures.get(key).getSourceImage() : null;
}

export function appearanceMouth() {
  return MOUTH;
}

export function baseAppearanceTexture(equipped) {
  const outfit = APPEARANCE_ITEM_BY_ID[sanitizeEquippedAppearance(equipped).outfit];
  return OUTFIT_LAYERS[outfit.kind].body;
}

// Layer order: head (back hair) → body → head above the chin (face rests on the collar) → hat → glasses.
export function appearanceTexture(scene, baseKey, equipped) {
  const appearance = sanitizeEquippedAppearance(equipped);
  const pose = poseFromKey(baseKey);
  const key = `appearance:v15:${pose}:${appearanceSignature(appearance)}`;
  if (scene.textures.exists(key)) return key;

  const outfit = OUTFIT_LAYERS[APPEARANCE_ITEM_BY_ID[appearance.outfit].kind];
  const accessory = APPEARANCE_ITEM_BY_ID[appearance.accessory];
  const glasses = APPEARANCE_ITEM_BY_ID[appearance.glasses];
  const width = Math.round(CANVAS.width * CANVAS.pxPerCell);
  const height = Math.round(CANVAS.height * CANVAS.pxPerCell);
  const texture = scene.textures.createCanvas(key, width, height);
  const ctx = texture.getContext();
  ctx.clearRect(0, 0, width, height);

  const head = sourceImage(scene, appearanceHeadTexture(appearance, pose));
  drawHead(ctx, head);
  drawFitted(ctx, sourceImage(scene, outfit.body), FIT.body);
  drawHead(ctx, head, true);
  if (accessory?.texture) drawFitted(ctx, sourceImage(scene, accessory.texture), FIT.hats[accessory.kind]);
  if (glasses?.texture) drawFitted(ctx, sourceImage(scene, glasses.texture), FIT.glasses);

  texture.refresh();
  return key;
}
