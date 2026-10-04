import { DEPTH, clamp } from './layout.js';
import { addText } from './text.js';
import { candyBox, roundedBox } from './draw.js';
import { COLORS, CSS } from '../content/theme.js';

const VARIANTS = {
  primary: { base: COLORS.orange, lip: COLORS.orangeLip, outline: COLORS.orangeDark, highlight: COLORS.orangeLight, text: CSS.white, stroke: CSS.orangeDark },
  green: { base: 0x8fdc6e, lip: 0x4fae4f, outline: 0x2f7d39, highlight: 0xd8ffc0, text: CSS.white, stroke: '#2f7d39' },
  disabled: { base: COLORS.grey, lip: COLORS.greyLip, outline: COLORS.greyDark, highlight: 0xffffff, text: '#f7f2f6', stroke: '#8e7f8b' },
};

// Invisible hit zone kept in sync with a visual. Zones give reliable rectangular hit areas
// independent of container transforms, and they can be larger than the art for fat fingers.
function makeZone(scene, depth) {
  return scene.add.zone(0, 0, 10, 10).setDepth(depth).setInteractive({ useHandCursor: true });
}

// Large rounded "candy" button. Width follows the label (never squashed), height has a floor.
export class PillButton {
  constructor(scene, { label, onClick, variant = 'primary', depth = DEPTH.actions, live = false }) {
    this.scene = scene;
    this.label = label;
    this.variant = variant;
    this.enabled = variant !== 'disabled';
    this.onClick = onClick;
    this.live = live;
    this.root = scene.add.container(0, 0).setDepth(depth);
    this.g = scene.add.graphics();
    this.dot = scene.add.graphics();
    this.text = addText(scene, 0, 0, label, { size: 26, weight: '700', color: CSS.white, stroke: CSS.orangeDark, strokeWidth: 5 });
    this.root.add([this.g, this.dot, this.text]);
    this.zone = makeZone(scene, depth + 1);
    this.pressed = false;
    this.zone.on('pointerdown', () => { if (!this.enabled) return this.wiggle(); this.pressed = true; this.root.setScale(0.95); return undefined; });
    this.zone.on('pointerout', () => { this.pressed = false; this.root.setScale(1); });
    this.zone.on('pointerup', () => {
      const fire = this.pressed && this.enabled;
      this.pressed = false;
      this.root.setScale(1);
      if (fire) this.onClick?.();
    });
    if (live) {
      this.pulse = scene.tweens.add({ targets: this.dot, alpha: 0.35, duration: 600, yoyo: true, repeat: -1 });
    }
  }

  setEnabled(enabled, { variant } = {}) {
    this.enabled = enabled;
    this.variant = enabled ? (variant ?? (this.variant === 'disabled' ? 'primary' : this.variant)) : 'disabled';
    if (this.box) this.redraw();
  }

  setLabel(label) {
    this.text.setText(label);
    if (this.box) this.layout(this.box);
  }

  wiggle() {
    this.scene.tweens.killTweensOf(this.root);
    this.root.setAngle(0);
    this.scene.tweens.add({ targets: this.root, angle: 3, duration: 60, yoyo: true, repeat: 2, onComplete: () => this.root.setAngle(0) });
  }

  // frame-aware sizing: height 60–78 px, font 24–32 px, width from text with generous padding.
  layout({ x, y, frame, minWidth = 220, maxWidth = 420, scale = 1 }) {
    const height = Math.round(clamp(66 * frame.ui * scale, 60, 80));
    const fontSize = Math.round(clamp(27 * frame.ui * scale, 24, 33));
    this.text.setFontSize(fontSize);
    this.text.setStroke(VARIANTS[this.variant].stroke, Math.max(4, Math.round(fontSize * 0.17)));
    const dotSpace = this.live ? fontSize * 0.9 : 0;
    const padX = height * 0.62;
    const limit = Math.min(maxWidth, frame.colW - frame.pad * 2);
    const width = Math.round(clamp(this.text.width + dotSpace + padX * 2, Math.min(minWidth, limit), limit));
    this.box = { x, y, width, height, frame, minWidth, maxWidth, scale };
    this.redraw();
    return this.box;
  }

  redraw() {
    const { x, y, width, height } = this.box;
    const v = VARIANTS[this.variant];
    this.root.setPosition(x, y);
    this.g.clear();
    candyBox(this.g, -width / 2, -height / 2, width, height, { base: v.base, lip: v.lip, outline: v.outline, highlight: v.highlight, outlineWidth: 3 });
    this.text.setColor(v.text).setStroke(v.stroke, this.text.style.strokeThickness);
    const dotSpace = this.live ? this.text.style.fontSize.replace('px', '') * 0.9 : 0;
    this.text.setPosition(dotSpace / 2, -2);
    this.dot.clear();
    if (this.live) {
      const r = Math.round(height * 0.12);
      const dx = -this.text.width / 2 + dotSpace / 2 - r * 1.7;
      this.dot.fillStyle(0xffffff, 1).fillCircle(dx, -2, r + 3);
      this.dot.fillStyle(COLORS.live, 1).fillCircle(dx, -2, r);
    }
    const lip = Math.round(height * 0.09);
    this.zone.setPosition(x, y + lip / 2).setSize(width + 12, height + lip + 12);
    this.zone.input.hitArea.setSize(width + 12, height + lip + 12);
  }

  center() {
    return { x: this.box.x, y: this.box.y };
  }

  setVisible(visible) {
    this.root.setVisible(visible);
    if (visible) this.zone.setInteractive(); else this.zone.disableInteractive();
    return this;
  }

  destroy() {
    this.pulse?.remove();
    this.zone.destroy();
    this.root.destroy(true);
  }
}

// Item card for selection rows (cooking choices). Locked cards show a padlock + level label.
export class ChoiceCard {
  constructor(scene, { id, texture = null, label = '', locked = false, lockLabel = 'Lv. 2', depth = DEPTH.actions, onTap }) {
    this.scene = scene;
    this.id = id;
    this.locked = locked;
    this.selected = false;
    this.root = scene.add.container(0, 0).setDepth(depth);
    this.g = scene.add.graphics();
    this.icon = scene.add.image(0, 0, locked ? 'padlock' : texture);
    this.caption = addText(scene, 0, 0, locked ? lockLabel : label, {
      size: 15, weight: '700', color: locked ? CSS.white : CSS.ink, stroke: locked ? '#8e7f8b' : null, strokeWidth: locked ? 3 : 0,
    });
    this.root.add([this.g, this.icon, this.caption]);
    this.zone = makeZone(scene, depth + 1);
    this.zone.on('pointerdown', () => onTap?.(this));
  }

  layout({ x, y, width, height }) {
    this.box = { x, y, width, height };
    this.root.setPosition(x, y);
    const iconBox = Math.min(width * 0.74, height * 0.6);
    this.icon.setScale(iconBox / Math.max(this.icon.width, this.icon.height));
    this.icon.setPosition(0, -height * 0.1);
    this.caption.setFontSize(Math.round(clamp(height * 0.13, 14, 18)));
    this.caption.setPosition(0, height * 0.33);
    this.zone.setPosition(x, y).setSize(width + 8, height + 8);
    this.zone.input.hitArea.setSize(width + 8, height + 8);
    this.redraw();
  }

  redraw() {
    const { width, height } = this.box;
    const g = this.g;
    g.clear();
    const x = -width / 2;
    const y = -height / 2;
    const r = Math.min(22, width * 0.2);
    g.fillStyle(0x8a4b3a, 0.14).fillRoundedRect(x + 2, y + 5, width, height, r);
    if (this.locked) {
      g.fillStyle(0xb7aab4, 1).fillRoundedRect(x, y, width, height, r);
      g.fillStyle(0xcfc4cc, 1).fillRoundedRect(x + 5, y + 5, width - 10, height * 0.62, r * 0.8);
      g.lineStyle(3, 0x8e7f8b, 1).strokeRoundedRect(x, y, width, height, r);
    } else {
      g.fillStyle(this.selected ? COLORS.lavenderSoft : COLORS.paper, 1).fillRoundedRect(x, y, width, height, r);
      g.lineStyle(this.selected ? 5 : 3, this.selected ? COLORS.lavender : COLORS.pinkDark, 1).strokeRoundedRect(x, y, width, height, r);
      if (this.selected) g.lineStyle(2, 0xffffff, 1).strokeRoundedRect(x + 5, y + 5, width - 10, height - 10, r * 0.75);
    }
  }

  setSelected(selected) {
    this.selected = selected;
    if (this.box) this.redraw();
  }

  shake() {
    this.scene.tweens.killTweensOf(this.root);
    this.root.setAngle(0);
    this.scene.tweens.add({ targets: this.root, angle: -6, duration: 55, yoyo: true, repeat: 3, onComplete: () => this.root.setAngle(0) });
  }

  pop() {
    this.scene.tweens.killTweensOf(this.root);
    this.root.setScale(1);
    this.scene.tweens.add({ targets: this.root, scale: 1.08, duration: 110, yoyo: true });
  }

  center() {
    return { x: this.box.x, y: this.box.y };
  }

  destroy() {
    this.zone.destroy();
    this.root.destroy(true);
  }
}

// Lays out a horizontal row of cards that always fits the column (cards never squash below 84 px).
export function layoutCardRow(cards, frame, centerY) {
  const gap = Math.round(clamp(frame.colW * 0.035, 10, 18));
  const maxCard = Math.round(clamp(118 * frame.ui, 100, 140));
  const available = frame.colW - frame.pad * 2;
  const width = Math.round(clamp((available - gap * (cards.length - 1)) / cards.length, 84, maxCard));
  const height = Math.round(width * 1.12);
  const total = width * cards.length + gap * (cards.length - 1);
  let x = frame.cx - total / 2 + width / 2;
  for (const card of cards) {
    card.layout({ x, y: centerY, width, height });
    x += width + gap;
  }
  return { width, height, top: centerY - height / 2 };
}

// Round green confirm button (approved check sprite) with a generous touch target.
export class CheckButton {
  constructor(scene, { onClick, depth = DEPTH.actions }) {
    this.scene = scene;
    this.image = scene.add.image(0, 0, 'check').setDepth(depth);
    this.zone = makeZone(scene, depth + 1);
    this.used = false;
    this.zone.on('pointerup', () => {
      if (this.used) return;
      this.used = true;
      this.scene.tweens.add({ targets: this.image, scale: this.image.scale * 0.85, duration: 80, yoyo: true });
      onClick?.();
    });
    this.image.setScale(0.01);
    this.appearing = true;
  }

  layout({ x, y, frame }) {
    const size = Math.round(clamp(72 * frame.ui, 66, 90));
    const scale = size / Math.max(this.image.width, this.image.height);
    this.scene.tweens.killTweensOf(this.image);
    this.image.setPosition(x, y);
    if (this.appearing) {
      this.appearing = false;
      this.image.setScale(scale * 0.2);
      this.scene.tweens.add({ targets: this.image, scale, duration: 260, ease: 'Back.Out', onComplete: () => this.breathe(scale) });
    } else {
      this.image.setScale(scale);
      this.breathe(scale);
    }
    this.zone.setPosition(x, y).setSize(size + 24, size + 24);
    this.zone.input.hitArea.setSize(size + 24, size + 24);
    this.box = { x, y, size };
  }

  breathe(scale) {
    if (this.used) return;
    this.scene.tweens.add({ targets: this.image, scale: scale * 1.07, duration: 520, yoyo: true, repeat: -1, ease: 'Sine.InOut' });
  }

  center() {
    return { x: this.box.x, y: this.box.y };
  }

  destroy() {
    this.scene.tweens.killTweensOf(this.image);
    this.zone.destroy();
    this.image.destroy();
  }
}
