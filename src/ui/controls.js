import { DEPTH, clamp } from './layout.js';
import { addText } from './text.js';
import { candyBox, roundedBox } from './draw.js';
import { COLORS, CSS } from '../content/theme.js';
import { pressable } from './pressFeedback.js';

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
    // Optional leading icon (e.g. the rewarded-video badge). Hidden until setIcon().
    this.icon = scene.add.image(0, 0, '__DEFAULT').setVisible(false);
    this.iconKey = null;
    this.root.add([this.g, this.dot, this.text, this.icon]);
    this.zone = makeZone(scene, depth + 1);
    this.pressed = false;
    // Squash/bounce, hover and sparkles come from the shared press feedback.
    pressable(this.zone, { target: this.root, enabled: () => this.enabled });
    this.zone.on('pointerdown', () => { if (!this.enabled) return this.wiggle(); this.pressed = true; return undefined; });
    this.zone.on('pointerout', () => { this.pressed = false; });
    this.zone.on('pointerup', () => {
      const fire = this.pressed && this.enabled;
      this.pressed = false;
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

  setIcon(textureKey) {
    const key = textureKey ?? null;
    if (key === this.iconKey) return;
    this.iconKey = key;
    if (key) this.icon.setTexture(key);
    this.icon.setVisible(Boolean(key));
    if (this.box) this.layout(this.box);
  }

  // Space reserved left of the label for the live dot or the icon.
  leadSpace(fontSize) {
    if (this.iconKey) return fontSize * 1.45;
    return this.live ? fontSize * 0.9 : 0;
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
    const dotSpace = this.leadSpace(fontSize);
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
    const fontSize = Number(this.text.style.fontSize.replace('px', ''));
    const dotSpace = this.leadSpace(fontSize);
    this.text.setPosition(dotSpace / 2, -2);
    if (this.iconKey) {
      const size = fontSize * 1.3;
      this.icon.setScale(size / Math.max(this.icon.width, this.icon.height));
      this.icon.setPosition(-this.text.width / 2 + dotSpace / 2 - fontSize * 0.25 - size / 2, -2);
    }
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
