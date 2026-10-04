import { FONT, clamp } from './layout.js';

function resolution(scene) {
  return scene.registry.get('viewport')?.dpr ?? 1;
}

// Text is rendered at device resolution so it stays crisp when the camera zooms by DPR.
export function addText(scene, x, y, value, {
  size = 18, weight = '600', color = '#5f3f55', stroke = null, strokeWidth = 0,
  align = 'center', originX = 0.5, originY = 0.5, wrap = 0, lineSpacing = 0, shadow = null,
} = {}) {
  const text = scene.add.text(x, y, value, {
    fontFamily: FONT,
    fontSize: `${Math.round(size)}px`,
    fontStyle: weight,
    color,
    align,
    stroke: stroke ?? undefined,
    strokeThickness: strokeWidth,
    lineSpacing,
    wordWrap: wrap ? { width: wrap, useAdvancedWrap: true } : undefined,
    padding: { x: Math.ceil(strokeWidth / 2) + 1, y: Math.ceil(strokeWidth / 2) + 2 },
    resolution: resolution(scene),
  }).setOrigin(originX, originY);
  if (shadow) text.setShadow(shadow.x ?? 0, shadow.y ?? 2, shadow.color ?? 'rgba(120,60,60,.35)', shadow.blur ?? 0, true, true);
  return text;
}

// Shrinks a label only as far as its minimum, then lets the container grow instead.
export function fitText(text, maxWidth, { size, min }) {
  let current = size;
  text.setFontSize(Math.round(current));
  while (text.width > maxWidth && current > min) {
    current -= 1;
    text.setFontSize(Math.round(current));
  }
  return current;
}

export function uiFont(frame, base, min, max) {
  return Math.round(clamp(base * frame.ui, min, max));
}
