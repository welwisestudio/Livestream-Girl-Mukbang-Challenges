import { DEPTH, clamp } from './layout.js';
import { addText } from './text.js';
import { COLORS, CSS } from '../content/theme.js';

function setZoneSize(zone, x, y, w, h) {
  zone.setPosition(x, y).setSize(w, h);
  zone.input.hitArea.setSize(w, h);
}

function scaleInside(image, width, height) {
  image.setScale(Math.min(width / image.width, height / image.height));
}

function drawNone(g, size) {
  g.lineStyle(Math.max(4, size * 0.07), COLORS.greyDark, 1);
  g.strokeCircle(0, 0, size * 0.28);
  g.lineBetween(-size * 0.2, size * 0.2, size * 0.2, -size * 0.2);
}

export class CategoryTab {
  constructor(scene, category, onTap) {
    this.scene = scene;
    this.category = category;
    this.selected = false;
    this.root = scene.add.container(0, 0).setDepth(DEPTH.actions);
    this.frame = scene.add.image(0, 0, 'custom-card');
    this.icon = scene.add.image(0, 0, category.iconTexture);
    this.label = addText(scene, 0, 0, category.label, { size: 12, weight: '700', color: CSS.ink });
    this.root.add([this.frame, this.icon, this.label]);
    this.zone = scene.add.zone(0, 0, 10, 10).setDepth(DEPTH.actions + 1).setInteractive({ useHandCursor: true });
    this.zone.on('pointerup', () => onTap(category.id));
  }

  layout(x, y, w, h) {
    this.rect = { x: x - w / 2, y: y - h / 2, w, h };
    this.root.setPosition(x, y);
    this.frame.setTexture(this.selected ? 'custom-card-selected' : 'custom-card');
    scaleInside(this.frame, w, h);
    const iconBox = Math.min(w * 0.72, h * 0.72);
    scaleInside(this.icon, iconBox, iconBox);
    this.icon.setPosition(0, 0);
    // The supplied reference uses compact icon-only tabs.
    this.label.setVisible(false);
    setZoneSize(this.zone, x, y, Math.max(44, w + 3), Math.max(44, h + 3));
  }

  setSelected(value) {
    this.selected = value;
    if (this.rect) this.layout(this.rect.x + this.rect.w / 2, this.rect.y + this.rect.h / 2, this.rect.w, this.rect.h);
  }

  setIconTexture(textureKey) {
    if (!textureKey || this.icon.texture.key === textureKey) return;
    this.icon.setTexture(textureKey);
    if (this.rect) this.layout(this.rect.x + this.rect.w / 2, this.rect.y + this.rect.h / 2, this.rect.w, this.rect.h);
  }

  center() { return { x: this.zone.x, y: this.zone.y }; }
}

export class AppearanceCard {
  constructor(scene, item, onTap) {
    this.scene = scene;
    this.item = item;
    this.owned = false;
    this.selected = false;
    this.root = scene.add.container(0, 0).setDepth(DEPTH.actions);
    this.frame = scene.add.image(0, 0, 'custom-card');
    this.thumb = item.texture ? scene.add.image(0, 0, item.texture) : null;
    this.swatch = scene.add.graphics();
    this.lock = scene.add.image(0, 0, 'padlock');
    this.pricePill = scene.add.image(0, 0, 'custom-price-pill');
    this.newBadge = scene.add.image(0, 0, 'new-badge');
    this.newText = addText(scene, 0, 0, 'NEW', { size: 12, weight: '700', color: CSS.white, stroke: '#d92978', strokeWidth: 2 });
    this.label = addText(scene, 0, 0, item.label, { size: 14, weight: '700', color: CSS.ink });
    this.price = addText(scene, 0, 0, '', { size: 13, weight: '700', color: CSS.white, stroke: '#2f7d38', strokeWidth: 3 });
    this.root.add([this.frame]);
    if (this.thumb) this.root.add(this.thumb);
    this.root.add([this.swatch, this.lock, this.label, this.pricePill, this.price, this.newBadge, this.newText]);
    this.zone = scene.add.zone(0, 0, 10, 10).setDepth(DEPTH.actions + 1).setInteractive({ useHandCursor: true });
    this.zone.on('pointerup', () => onTap(item.id));
  }

  setState({ selected, owned }) {
    this.selected = selected;
    this.owned = owned;
    if (this.box) this.layout(this.box);
  }

  setPreviewTexture(textureKey) {
    if (!this.thumb || !textureKey || this.thumb.texture.key === textureKey) return;
    this.thumb.setTexture(textureKey);
    if (this.box) this.layout(this.box);
  }

  layout(box) {
    this.box = box;
    const { x, y, w, h } = box;
    this.root.setPosition(x, y);
    this.frame.setTexture(this.selected ? 'custom-card-selected' : 'custom-card');
    scaleInside(this.frame, w, h);
    this.swatch.clear();

    const thumbW = w * 0.7;
    const thumbH = h * 0.62;
    if (this.thumb) {
      scaleInside(this.thumb, thumbW, thumbH);
      this.thumb.setPosition(0, -h * 0.03);
    } else if (this.item.kind === 'none') {
      drawNone(this.swatch, Math.min(thumbW, thumbH));
      this.swatch.setPosition(0, -h * 0.03);
    }

    this.label.setVisible(false);
    const priced = !this.owned && this.item.price > 0;
    this.pricePill.setVisible(priced);
    this.price.setVisible(priced || this.owned).setText(priced ? String(this.item.price) : (this.owned ? 'OWNED' : ''));
    if (priced) {
      scaleInside(this.pricePill, w * 0.82, h * 0.24);
      this.pricePill.setPosition(0, h * 0.59);
      this.price.setColor(CSS.white).setStroke('#2f7d38', 3);
    } else {
      this.price.setColor(this.owned ? CSS.green : CSS.orangeDark).setStroke('#fff9e8', 3);
    }
    this.price.setFontSize(Math.round(clamp(w * 0.12, 12, 14))).setPosition(0, h * 0.59);
    this.lock.setVisible(false);
    const showNew = Boolean(this.item.isNew);
    this.newBadge.setVisible(showNew);
    this.newText.setVisible(showNew);
    if (showNew) {
      scaleInside(this.newBadge, w * 0.42, h * 0.27);
      this.newBadge.setPosition(w * 0.37, -h * 0.42);
      this.newText.setFontSize(12).setPosition(w * 0.37, -h * 0.42);
    }
    setZoneSize(this.zone, x, y + h * 0.08, w + 5, h * 1.2);
    this.rect = { x: x - w / 2, y: y - h / 2, w, h: h * 1.2 };
  }

  pop() {
    this.scene.tweens.killTweensOf(this.root);
    this.scene.tweens.add({ targets: this.root, scale: 1.05, duration: 100, yoyo: true });
  }

  shake() {
    this.scene.tweens.killTweensOf(this.root);
    this.scene.tweens.add({ targets: this.root, angle: -5, duration: 55, yoyo: true, repeat: 3, onComplete: () => this.root.setAngle(0) });
  }

  center() { return { x: this.zone.x, y: this.zone.y }; }
  destroy() { this.zone.destroy(); this.root.destroy(true); }
}
