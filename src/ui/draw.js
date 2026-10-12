// Small vector helpers for the code-drawn UI surfaces (pills, cards, ribbons).

// One outline width for every code-drawn frame (panels, pills, badges, cards, rings) so the UI
// reads as one even stroke. Inner decorative highlights may stay thinner.
export const UI_OUTLINE = 3;

// Soft drop shadow straight below a surface. Never offset sideways: a sideways offset reads as
// a thicker, dirty outline on one edge.
export function dropShadow(g, x, y, w, h, { radius = Math.min(w, h) / 2, depth = 4, color = 0x8a4b3a, alpha = 0.12 } = {}) {
  g.fillStyle(color, alpha).fillRoundedRect(x, y + depth, w, h, Math.min(radius, w / 2, h / 2));
}

export function roundedBox(g, x, y, w, h, { fill, alpha = 1, stroke = null, strokeWidth = UI_OUTLINE, radius = Math.min(w, h) / 2 } = {}) {
  const r = Math.min(radius, w / 2, h / 2);
  if (fill !== undefined && fill !== null) g.fillStyle(fill, alpha).fillRoundedRect(x, y, w, h, r);
  if (stroke !== null && strokeWidth > 0) g.lineStyle(strokeWidth, stroke, 1).strokeRoundedRect(x, y, w, h, r);
}

// Glossy "candy" surface: lip below, base, soft top highlight, outline. Used by buttons and badges.
export function candyBox(g, x, y, w, h, { base, lip, outline, highlight = 0xffffff, highlightAlpha = 0.45, outlineWidth = UI_OUTLINE, lipDepth = Math.round(h * 0.09) } = {}) {
  const r = h / 2;
  g.fillStyle(0x6b3a2a, 0.18).fillRoundedRect(x, y + lipDepth + 4, w, h, r);
  g.fillStyle(lip, 1).fillRoundedRect(x, y + lipDepth, w, h, r);
  g.fillStyle(base, 1).fillRoundedRect(x, y, w, h, r);
  g.fillStyle(highlight, highlightAlpha).fillRoundedRect(x + h * 0.32, y + h * 0.12, w - h * 0.64, h * 0.26, h * 0.13);
  g.lineStyle(outlineWidth, outline, 1).strokeRoundedRect(x, y, w, h + lipDepth, r);
}

export function heartPath(g, cx, cy, size, color, alpha = 1) {
  const s = size / 2;
  g.fillStyle(color, alpha);
  g.fillCircle(cx - s * 0.5, cy - s * 0.25, s * 0.55);
  g.fillCircle(cx + s * 0.5, cy - s * 0.25, s * 0.55);
  g.fillTriangle(cx - s * 1.02, cy - s * 0.05, cx + s * 1.02, cy - s * 0.05, cx, cy + s * 0.95);
}
