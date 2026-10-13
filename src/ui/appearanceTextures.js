import {
  APPEARANCE_ITEM_BY_ID,
  appearanceHeadTexture,
  appearanceSignature,
  sanitizeEquippedAppearance,
} from '../content/appearance.js';
import { CANVAS, COLLAR_TOP, FIT, HEAD, HEAD_DROP, MOUTH, OUTFIT_LAYERS } from '../content/characterRig.js';

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

// `frontOnly` keeps the part above the collar top plus the chin; the back hair below the collar
// line stays behind the body. Below the collar only the JAW is kept: its shape comes from `jaw`,
// a head of the same pose with no hair under the chin (the plum cut — every head atlas shares one
// face geometry). Clipping to a plain ellipse also kept the honey/silver back hair that fills the
// space under their chins, which showed as a band of hair between the chin and the collar.
// The head is drawn HEAD_DROP lower than the head cell (the clothes do not move).
function drawHead(ctx, head, frontOnly = false, jaw = null) {
  if (!head) return;
  const cell = CANVAS.pxPerCell;
  const top = (HEAD_DROP - CANVAS.top) * cell;
  if (!frontOnly) {
    ctx.drawImage(head, 0, top, cell, cell);
    return;
  }
  const collarY = COLLAR_TOP * cell;
  const layer = document.createElement('canvas');
  layer.width = cell; layer.height = cell;
  const l = layer.getContext('2d');
  l.drawImage(head, 0, 0, cell, cell);
  const mask = document.createElement('canvas');
  mask.width = cell; mask.height = cell;
  const m = mask.getContext('2d');
  // The upper part overlaps the jaw region by 2 px so no anti-aliased seam crosses the face.
  m.fillRect(0, 0, cell, collarY + 2);
  m.save();
  m.beginPath();
  m.ellipse(cell * 0.5, collarY, HEAD.chinRx * cell, (HEAD.chinBottom - COLLAR_TOP) * cell, 0, 0, Math.PI);
  m.clip();
  if (jaw) m.drawImage(jaw, 0, 0, cell, cell); else m.fillRect(0, 0, cell, cell);
  m.restore();
  l.globalCompositeOperation = 'destination-in';
  l.drawImage(mask, 0, 0);
  ctx.drawImage(layer, 0, top);
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
  const key = `appearance:v23:${pose}:${appearanceSignature(appearance)}`;
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
  const jaw = sourceImage(scene, appearanceHeadTexture({ ...appearance, hair: 'hair-plum' }, pose));
  drawHead(ctx, head);
  drawFitted(ctx, sourceImage(scene, outfit.body), FIT.body);
  drawHead(ctx, head, true, jaw);
  if (accessory?.texture) drawFitted(ctx, sourceImage(scene, accessory.texture), FIT.hats[accessory.kind]);
  if (glasses?.texture) drawFitted(ctx, sourceImage(scene, glasses.texture), FIT.glasses);

  texture.refresh();
  return key;
}
