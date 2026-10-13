import { clamp } from './layout.js';
import { addText } from './text.js';
import { pressable } from './pressFeedback.js';

export class TapButton {
  constructor(scene, { skin, label, onTap, depth, textColor = '#ffffff', stroke = '#3f8f2a' }) {
    this.scene = scene;
    this.root = scene.add.container(0, 0).setDepth(depth);
    this.skin = scene.add.image(0, 0, skin);
    this.text = addText(scene, 0, 0, label, { size: 26, weight: '700', color: textColor, stroke, strokeWidth: stroke ? 6 : 0 });
    this.root.add([this.skin, this.text]);
    this.zone = scene.add.zone(0, 0, 10, 10).setDepth(depth + 1).setInteractive({ useHandCursor: true });
    pressable(this.zone, { target: this.root });
    this.zone.on('pointerup', () => onTap());
  }

  layout(x, y, height, fontRatio = 0.4) {
    this.skin.setScale(height / this.skin.height);
    this.text.setFontSize(Math.round(height * fontRatio)).setPosition(0, -height * 0.03);
    this.root.setPosition(x, y);
    this.zone.setPosition(x, y).setSize(this.skin.displayWidth, height);
    this.zone.input.hitArea.setSize(this.skin.displayWidth, height);
  }

  center() { return { x: this.zone.x, y: this.zone.y }; }
  rect() { return { x: this.zone.x - this.zone.width / 2, y: this.zone.y - this.zone.height / 2, w: this.zone.width, h: this.zone.height }; }
  destroy() { this.root.destroy(true); this.zone.destroy(); }
}

// Shared modal card (Part Time Job, Store, snack stream): game panel, title, text,
// optional coin amount with a small note under it, a green primary button and an optional pill button.
export class GameDialog {
  constructor(scene, { title, body, coins = null, note = null, noteColor = '#6b4a3a', primary, secondary = null, onClose = null, primaryIcon = null, depth = 110 }) {
    const D = depth;
    this.scene = scene;
    this.veil = scene.add.rectangle(0, 0, 10, 10, 0xfff4f8, 0.72).setOrigin(0).setDepth(D).setInteractive();
    this.body = scene.add.nineslice(0, 0, 'playtime-panel', undefined, 693, 800, 90, 90, 90, 90).setDepth(D + 1);
    this.title = addText(scene, 0, 0, title, { size: 32, weight: '700', color: '#ff7a3d', stroke: '#ffffff', strokeWidth: 7 }).setDepth(D + 3);
    this.text = addText(scene, 0, 0, body, { size: 19, weight: '600', color: '#6b4a3a', wrap: 300, lineSpacing: 4 }).setDepth(D + 3);
    this.coinIcon = coins === null ? null : scene.add.image(0, 0, 'lobby-coins').setDepth(D + 3);
    this.coinText = coins === null ? null : addText(scene, 0, 0, typeof coins === 'string' ? coins : `+${coins}`, { size: 34, weight: '700', color: '#ffffff', stroke: '#9a6a2c', strokeWidth: 7 }).setDepth(D + 3);
    this.note = note === null ? null : addText(scene, 0, 0, note, { size: 17, weight: '700', color: noteColor }).setDepth(D + 3);
    this.primary = new TapButton(scene, { skin: 'reward-button', label: primary.label, onTap: primary.onTap, depth: D + 4 });
    this.primaryIcon = primaryIcon ? scene.add.image(0, 0, primaryIcon).setDepth(D + 5) : null;
    this.closeButton = onClose ? scene.add.image(0, 0, 'custom-close').setDepth(D + 5) : null;
    this.closeZone = onClose ? scene.add.zone(0, 0, 10, 10).setDepth(D + 6).setInteractive({ useHandCursor: true }) : null;
    // The close handler plays its own sound.
    if (this.closeZone) pressable(this.closeZone, { target: this.closeButton, sound: null });
    this.closeZone?.on('pointerup', () => onClose());
    this.secondary = secondary
      ? new TapButton(scene, { skin: 'reward-pill', label: secondary.label, onTap: secondary.onTap, depth: D + 4, textColor: '#7a4a3a', stroke: null })
      : null;
  }

  layout(f) {
    this.frame = f;
    this.veil.setPosition(f.left, f.top - 2).setSize(f.w, f.h + 4);
    this.veil.input.hitArea.setSize(f.w, f.h + 4);
    const w = Math.min(f.colW * 0.86, 420);
    this.title.setFontSize(Math.round(clamp(w * 0.09, 26, 38)));
    this.text.setFontSize(Math.round(clamp(w * 0.05, 16, 21))).setWordWrapWidth(w * 0.8);
    const coinH = this.coinIcon ? clamp(w * 0.16, 48, 66) : 0;
    const btnH = clamp(w * 0.17, 54, 72);
    const pillH = this.secondary ? btnH * 0.78 : 0;
    const gap = w * 0.05;
    this.note?.setFontSize(Math.round(clamp(w * 0.043, 15, 18)));
    const noteH = this.note ? this.note.height + gap * 0.35 : 0;
    const h = gap * 1.6 + this.title.height + gap * 0.6 + this.text.height + (coinH ? gap + coinH : 0) + noteH + gap + btnH + (pillH ? gap * 0.6 + pillH : 0) + gap * 1.4;
    const top = f.top + (f.h - h) / 2;
    const s = (w / 693) * 0.6;
    this.body.setSize(w / s, h / s).setScale(s).setPosition(f.cx, top + h / 2);
    let y = top + gap * 1.6 + this.title.height / 2;
    this.title.setPosition(f.cx, y);
    y += this.title.height / 2 + gap * 0.6 + this.text.height / 2;
    this.text.setPosition(f.cx, y);
    y += this.text.height / 2;
    if (this.coinIcon) {
      y += gap + coinH / 2;
      this.coinIcon.setScale(coinH / this.coinIcon.height);
      this.coinText.setFontSize(Math.round(coinH * 0.62));
      const rowW = this.coinIcon.displayWidth + 10 + this.coinText.width;
      this.coinIcon.setPosition(f.cx - rowW / 2 + this.coinIcon.displayWidth / 2, y);
      this.coinText.setPosition(f.cx + rowW / 2 - this.coinText.width / 2, y);
      this.coinRow = { x: this.coinIcon.x, y };
      y += coinH / 2;
    }
    if (this.note) {
      y += gap * 0.35 + this.note.height / 2;
      this.note.setPosition(f.cx, y);
      y += this.note.height / 2;
    }
    y += gap + btnH / 2;
    this.primary.layout(f.cx, y, btnH);
    if (this.secondary) {
      y += btnH / 2 + gap * 0.6 + pillH / 2;
      this.secondary.layout(f.cx, y, pillH, 0.42);
    }
    this.panelRect = { x: f.cx - w / 2, y: top, w, h };
    if (this.primaryIcon) {
      const icon = btnH * 0.62;
      this.primaryIcon.setScale(icon / Math.max(this.primaryIcon.width, this.primaryIcon.height));
      const pc = this.primary.center();
      this.primaryIcon.setPosition(pc.x + this.primary.skin.displayWidth / 2 - icon * 0.3, pc.y + btnH * 0.28);
    }
    if (this.closeButton) {
      // On the panel's top-right corner, inside the screen, with a finger-size tap area.
      const size = Math.round(clamp(w * 0.13, 44, 56));
      const cx = Math.min(f.cx + w / 2 - size * 0.25, f.right - size / 2 - 4);
      const cy = Math.max(top + size * 0.25, f.top + size / 2 + 4);
      this.closeButton.setScale(size / Math.max(this.closeButton.width, this.closeButton.height)).setPosition(cx, cy);
      this.closeZone.setPosition(cx, cy).setSize(size + 8, size + 8);
      this.closeZone.input.hitArea.setSize(size + 8, size + 8);
    }
  }

  // Live status line under the coin row (e.g. after a cancelled ad).
  setNote(text, color = '#6b4a3a') {
    if (!this.note) return;
    this.note.setText(text).setColor(color);
    if (this.frame) this.layout(this.frame);
  }

  setEnabled(enabled) {
    this.primary.root.setAlpha(enabled ? 1 : 0.55);
    this.primaryIcon?.setAlpha(enabled ? 1 : 0.55);
    this.primary.zone.input.enabled = enabled;
    if (this.closeZone) this.closeZone.input.enabled = enabled;
    this.closeButton?.setAlpha(enabled ? 1 : 0.55);
  }

  targets() {
    return {
      dialogPrimary: this.primary.center(),
      ...(this.secondary ? { dialogSecondary: this.secondary.center() } : {}),
      ...(this.closeZone ? { dialogClose: { x: this.closeZone.x, y: this.closeZone.y } } : {}),
    };
  }

  rects() {
    const close = this.closeButton ? { 'dialog-close': { x: this.closeButton.x - this.closeButton.displayWidth / 2, y: this.closeButton.y - this.closeButton.displayHeight / 2, w: this.closeButton.displayWidth, h: this.closeButton.displayHeight } } : {};
    return { 'dialog-panel': this.panelRect, 'dialog-primary': this.primary.rect(), ...(this.secondary ? { 'dialog-secondary': this.secondary.rect() } : {}), ...close };
  }

  destroy() {
    [this.veil, this.body, this.title, this.text, this.coinIcon, this.coinText, this.note, this.primaryIcon, this.closeButton, this.closeZone].forEach((o) => o?.destroy());
    this.primary.destroy();
    this.secondary?.destroy();
  }
}
