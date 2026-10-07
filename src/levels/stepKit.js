import { DEPTH } from '../ui/layout.js';

// Shared helpers for cooking step views.

// Display width of work objects relative to the work box, so consecutive steps line up.
const WIDTH = { bowl: 0.8, 'bowl-filled': 0.8, 'jelly-plain': 1, 'jelly-berries': 1, 'jelly-finished': 1 };

export function placeWork(image, geo, key = image.texture.key) {
  const width = geo.work.size * (WIDTH[key] ?? 1);
  const scale = Math.min(width / image.width, geo.work.maxH / image.height);
  image.setScale(scale).setPosition(geo.work.x, geo.work.y);
  return scale;
}

// Scale an image so its longest side equals `fraction` of the work box.
export function sizeTo(image, geo, fraction) {
  const scale = (geo.work.size * fraction) / Math.max(image.width, image.height);
  image.setScale(scale);
  return scale;
}

// Swaps the work sprite. A new food sprite already contains everything the player added,
// so code-drawn decorations from earlier steps are faded out at the same moment.
export function crossfade(scene, image, key, geo, duration = 360) {
  if (image.texture.key === key) return;
  scene.workTexture = key;
  decorClear(scene, duration);
  const ghost = scene.add.image(image.x, image.y, key).setDepth(image.depth + 1).setAlpha(0);
  placeWork(ghost, geo, key);
  scene.tweens.add({
    targets: ghost, alpha: 1, duration,
    onComplete: () => {
      scene.tweens.killTweensOf(image);
      image.setTexture(key).clearTint();
      placeWork(image, geo, key);
      ghost.destroy();
    },
  });
}

export function wobble(scene, image) {
  const s = image.scale;
  scene.tweens.add({ targets: image, scaleY: s * 0.9, scaleX: s * 1.06, duration: 120, yoyo: true, repeat: 1, ease: 'Sine.InOut' });
}

// ---------------------------------------------------------------------------------------------
// Decor: sauce lines, sprinkles, placed pieces and cut marks that stay on the food across steps
// until the food sprite changes. Positions are stored relative to the work box (resize-safe).
export const toRel = (geo, p) => ({ x: (p.x - geo.work.x) / geo.work.size, y: (p.y - geo.work.y) / geo.work.size });
export const toAbs = (geo, r) => ({ x: geo.work.x + r.x * geo.work.size, y: geo.work.y + r.y * geo.work.size });

export function decorAdd(scene, item) {
  (scene.decor ??= []).push(item);
  if (scene.cgeo) item.layout(scene.cgeo);
  return item;
}

export function decorLayout(scene, geo) {
  scene.decor?.forEach((item) => item.layout(geo));
}

export function decorClear(scene, fadeMs = 0) {
  const items = scene.decor ?? [];
  scene.decor = [];
  for (const item of items) {
    if (!fadeMs) { item.destroy(); continue; }
    scene.tweens.add({ targets: item.objects(), alpha: 0, duration: fadeMs, onComplete: () => item.destroy() });
  }
}

// Called when a step view is created: if the food on screen is not the food the decor belongs to,
// the decor is stale (e.g. the corn dog moved into the fryer) and is removed.
export function enterWork(scene, key) {
  if (scene.workTexture && scene.workTexture !== key) decorClear(scene, 200);
  scene.workTexture = key;
}

// A piece of ingredient sprite resting on the food.
export function pieceDecor(scene, key, rel, fraction, angle = 0) {
  const image = scene.add.image(0, 0, key).setDepth(DEPTH.food + 2).setAngle(angle);
  return {
    objects: () => [image],
    layout(geo) {
      const p = toAbs(geo, rel);
      image.setPosition(p.x, p.y);
      sizeTo(image, geo, fraction);
    },
    destroy: () => image.destroy(),
  };
}

// A code-drawn sauce line (outlined, rounded) following the stored relative points.
export function sauceDecor(scene, color, segments) {
  const g = scene.add.graphics().setDepth(DEPTH.food + 3);
  const darker = darken(color, 0.72);
  const item = {
    segments,
    objects: () => [g],
    layout(geo) {
      g.clear();
      const width = Math.max(6, geo.work.size * 0.028);
      for (const [stroke, w] of [[darker, width + 4], [color, width]]) {
        g.lineStyle(w, stroke, 1);
        for (const seg of item.segments) {
          const a = toAbs(geo, seg.from);
          const b = toAbs(geo, seg.to);
          g.lineBetween(a.x, a.y, b.x, b.y);
          g.fillStyle(stroke, 1).fillCircle(b.x, b.y, w / 2);
        }
      }
      g.lineStyle(Math.max(2, width * 0.28), 0xffffff, 0.45);
      for (const seg of item.segments) {
        const a = toAbs(geo, seg.from);
        const b = toAbs(geo, seg.to);
        g.lineBetween(a.x - width * 0.18, a.y - width * 0.18, b.x - width * 0.18, b.y - width * 0.18);
      }
    },
    destroy: () => g.destroy(),
  };
  return item;
}

// Small particles that landed on the food (salt, sprinkles, cheese shreds, sugar).
export function particleDecor(scene, shape, particles) {
  const g = scene.add.graphics().setDepth(DEPTH.food + 3);
  const item = {
    particles,
    objects: () => [g],
    layout(geo) {
      g.clear();
      const unit = geo.work.size;
      for (const p of item.particles) {
        const { x, y } = toAbs(geo, p);
        g.fillStyle(p.color, 1);
        if (shape === 'dot') {
          g.fillCircle(x, y, Math.max(1.6, unit * 0.007 * p.s));
        } else if (shape === 'blob') {
          g.lineStyle(2, darken(p.color, 0.7), 1);
          g.fillCircle(x, y, unit * 0.022 * p.s).strokeCircle(x, y, unit * 0.022 * p.s);
        } else {
          // Rods: sprinkles and cheese shreds, drawn as rotated rounded bars.
          const len = unit * (shape === 'shred' ? 0.034 : 0.022) * p.s;
          const w = Math.max(2.4, unit * (shape === 'shred' ? 0.009 : 0.008));
          const dx = Math.cos(p.a) * len / 2;
          const dy = Math.sin(p.a) * len / 2;
          g.lineStyle(w, p.color, 1).lineBetween(x - dx, y - dy, x + dx, y + dy);
        }
      }
    },
    destroy: () => g.destroy(),
  };
  return item;
}

export function darken(color, k) {
  const r = Math.round(((color >> 16) & 255) * k);
  const gg = Math.round(((color >> 8) & 255) * k);
  const b = Math.round((color & 255) * k);
  return (r << 16) | (gg << 8) | b;
}
