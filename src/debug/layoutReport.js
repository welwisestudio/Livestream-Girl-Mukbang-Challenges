import Phaser from 'phaser';

// Test-only inspection of the current screen (CSS px): HUD/header/button rectangles, every
// touch target, the smallest visible font and the worst image aspect distortion.
function walk(list, visit, parentVisible = true) {
  for (const obj of list) {
    const visible = parentVisible && obj.visible !== false && (obj.alpha ?? 1) > 0.05;
    visit(obj, visible);
    if (obj instanceof Phaser.GameObjects.Container) walk(obj.list, visit, visible);
  }
}

export function layoutReport(scene) {
  const vp = scene.registry.get('viewport');
  const rects = [];
  const add = (name, r) => { if (r) rects.push({ name, ...r }); };
  if (scene.layoutRects) {
    for (const [name, r] of Object.entries(scene.layoutRects)) add(name, r);
  } else {
    if (scene.hud?.rects) for (const [name, r] of Object.entries(scene.hud.rects)) add(name, r);
    if (scene.header?.root.visible) add('header', scene.header.rect);
    if (scene.progress?.root.visible) add('progress', scene.progress.rect);
    if (scene.request?.root.visible) add('request', scene.request.rect);
    for (const key of ['actionButton', 'start', 'button']) {
      const b = scene[key];
      if (b?.box && b.root.visible) add(`button:${b.text.text}`, { x: b.box.x - b.box.width / 2, y: b.box.y - b.box.height / 2, w: b.box.width, h: b.box.height * 1.09 });
    }
  }

  const targets = [];
  const textRects = [];
  let minFont = Infinity;
  let worstDistortion = 0;
  walk(scene.children.list, (obj, visible) => {
    if (!visible) return;
    if (obj instanceof Phaser.GameObjects.Zone && obj.input?.enabled) {
      targets.push({ x: obj.x - obj.width / 2, y: obj.y - obj.height / 2, w: obj.width, h: obj.height });
    }
    if (obj instanceof Phaser.GameObjects.Text && obj.text.trim()) {
      minFont = Math.min(minFont, parseFloat(obj.style.fontSize));
      const b = obj.getBounds();
      textRects.push({ text: obj.text, x: b.x, y: b.y, w: b.width, h: b.height });
    }
    if (obj instanceof Phaser.GameObjects.Image && obj.texture?.key !== '__MISSING') {
      const tweening = scene.tweens.isTweening(obj);
      if (!tweening && obj.scaleY !== 0) worstDistortion = Math.max(worstDistortion, Math.abs(1 - Math.abs(obj.scaleX / obj.scaleY)));
    }
  });
  return { viewport: { width: vp.width, height: vp.height }, rects, targets, textRects, minFont: Number.isFinite(minFont) ? minFont : null, worstDistortion };
}
