import { clamp } from './layout.js';
import { addText } from './text.js';
export { GameDialog as ShiftDialog } from './gameDialog.js';

// Visual pieces of the Part Time Job screen (reference: reference/input/PartTimeJob.png).
// They only display state owned by PartTimeShift; none of them changes rules or rewards.

export const PTJ_DEPTH = Object.freeze({
  background: -60,
  customer: -30,
  counter: -20,
  props: -10,
  bubble: 10,
  cards: 20,
  hud: 60,
  feedback: 90,
  dialog: 110,
});

// Fractions measured on the generated art (scripts/build-assets.mjs output).
export const PTJ_ART = Object.freeze({
  counterTop: 0.672, // ptj-background: back edge of the counter top
  timerInner: { x0: 0.25, x1: 0.77, y0: 0.055, y1: 0.95 }, // ptj-timer: dark tube interior
  bubbleInner: { x0: 0.05, x1: 0.95, y0: 0.08, y1: 0.8 }, // ptj-bubble: area above the tail
  progressText: { x: 0.66, y: 0.42 }, // ptj-progress: centre of the empty pill
});

const SILHOUETTE = 0x141414;

// One of the three cream product cards at the bottom.
export class ProductCard {
  constructor(scene, onTap) {
    this.scene = scene;
    this.root = scene.add.container(0, 0).setDepth(PTJ_DEPTH.cards);
    this.card = scene.add.image(0, 0, 'ptj-card');
    this.icon = scene.add.image(0, 0, 'ptj-snack');
    this.root.add([this.card, this.icon]);
    this.zone = scene.add.zone(0, 0, 10, 10).setDepth(PTJ_DEPTH.cards + 1).setInteractive({ useHandCursor: true });
    this.zone.on('pointerdown', () => { if (this.product) onTap(this.product.id, this); });
  }

  setProduct(product) {
    this.product = product;
    this.icon.setTexture(product.texture);
    this.fitIcon();
  }

  fitIcon() {
    if (!this.h) return;
    const box = this.h * 0.68;
    this.icon.setScale(Math.min((this.w * 0.8) / this.icon.width, box / this.icon.height));
  }

  layout(x, y, h) {
    this.h = h;
    this.card.setScale(h / this.card.height);
    this.w = this.card.displayWidth;
    this.fitIcon();
    this.scene.tweens.killTweensOf(this.root);
    this.root.setPosition(x, y).setScale(1).setAngle(0);
    this.zone.setPosition(x, y).setSize(this.w, h);
    this.zone.input.hitArea.setSize(this.w, h);
  }

  pop() {
    this.scene.tweens.killTweensOf(this.root);
    this.root.setScale(1).setAngle(0);
    this.scene.tweens.add({ targets: this.root, scale: 0.9, duration: 70, yoyo: true, ease: 'Sine.Out' });
  }

  shake() {
    this.scene.tweens.killTweensOf(this.root);
    this.root.setScale(1).setAngle(0);
    this.card.setTint(0xff9a9a);
    this.scene.tweens.add({ targets: this.root, angle: { from: -7, to: 7 }, duration: 60, yoyo: true, repeat: 2, onComplete: () => { this.root.setAngle(0); this.card.clearTint(); } });
  }

  center() { return { x: this.zone.x, y: this.zone.y }; }
  rect() { return { x: this.zone.x - this.w / 2, y: this.zone.y - this.h / 2, w: this.w, h: this.h }; }
}

// Speech bubble with up to four dark silhouettes. Served items are revealed in colour with a
// check; the orange arrow points at the next item to give.
export class RequestBubble {
  constructor(scene) {
    this.scene = scene;
    this.bubble = scene.add.image(0, 0, 'ptj-bubble').setDepth(PTJ_DEPTH.bubble);
    this.arrow = scene.add.image(0, 0, 'ptj-arrow').setDepth(PTJ_DEPTH.bubble + 3);
    this.slots = Array.from({ length: 4 }, () => ({
      icon: scene.add.image(0, 0, 'ptj-snack').setDepth(PTJ_DEPTH.bubble + 1).setVisible(false),
      check: scene.add.image(0, 0, 'playtime-check').setDepth(PTJ_DEPTH.bubble + 2).setVisible(false),
    }));
    this.request = [];
    this.progress = 0;
  }

  setRequest(request, products) {
    this.request = request;
    this.progress = 0;
    this.slots.forEach((slot, i) => {
      const product = products[request[i]];
      slot.icon.setVisible(Boolean(product));
      slot.check.setVisible(false);
      if (product) slot.icon.setTexture(product.texture).setTintFill(SILHOUETTE);
    });
    this.place();
    this.scene.tweens.add({ targets: this.slots.map((s) => s.icon), alpha: { from: 0, to: 1 }, duration: 220 });
  }

  setProgress(progress) {
    const newly = progress > this.progress ? this.slots[progress - 1] : null;
    this.progress = progress;
    this.slots.forEach((slot, i) => {
      const done = i < progress;
      if (done) slot.icon.clearTint(); else slot.icon.setTintFill(SILHOUETTE);
      slot.check.setVisible(done);
    });
    if (newly) {
      const s = newly.icon.scale;
      this.scene.tweens.add({ targets: newly.icon, scale: { from: s * 1.35, to: s }, duration: 220, ease: 'Back.Out' });
    }
    this.placeArrow();
  }

  layout(x, top, width) {
    this.bubble.setScale(width / this.bubble.width).setPosition(x, top + (this.bubble.height * (width / this.bubble.width)) / 2);
    this.place();
  }

  place() {
    const b = this.bubble;
    if (!b.scale) return;
    const left = b.x - b.displayWidth / 2;
    const top = b.y - b.displayHeight / 2;
    const inner = PTJ_ART.bubbleInner;
    const iw = (inner.x1 - inner.x0) * b.displayWidth;
    const ih = (inner.y1 - inner.y0) * b.displayHeight;
    const step = iw / 4;
    const size = Math.min(step * 0.8, ih * 0.84);
    this.slotSize = size;
    const n = this.request.length;
    const cy = top + (inner.y0 * b.displayHeight) + ih / 2;
    this.slots.forEach((slot, i) => {
      if (i >= n) return;
      const cx = b.x + (i - (n - 1) / 2) * step;
      slot.icon.setScale(Math.min(size / slot.icon.width, size / slot.icon.height)).setPosition(cx, cy);
      const c = size * 0.42;
      slot.check.setScale(c / slot.check.width).setPosition(cx + size * 0.34, cy + size * 0.32);
    });
    this.top = top;
    this.placeArrow();
  }

  placeArrow() {
    const slot = this.slots[this.progress];
    const visible = Boolean(slot && this.progress < this.request.length && this.slotSize);
    this.scene.tweens.killTweensOf(this.arrow);
    this.arrow.setVisible(visible);
    if (!visible) return;
    const h = clamp(this.slotSize * 0.42, 26, 48);
    this.arrow.setScale(h / this.arrow.height).setPosition(slot.icon.x, this.top - h * 0.12);
    this.scene.tweens.add({ targets: this.arrow, y: this.arrow.y + h * 0.18, duration: 380, yoyo: true, repeat: -1, ease: 'Sine.InOut' });
  }

  slotCenter(i) { const s = this.slots[i]; return { x: s.icon.x, y: s.icon.y }; }
  rect() { const b = this.bubble; return { x: b.x - b.displayWidth / 2, y: b.y - b.displayHeight / 2, w: b.displayWidth, h: b.displayHeight }; }
  setVisible(v) { this.bubble.setVisible(v); this.slots.forEach((s, i) => { s.icon.setVisible(v && i < this.request.length); s.check.setVisible(v && i < this.progress); }); this.arrow.setVisible(v && this.progress < this.request.length); }
}

// Vertical timer tube: generated frame, live red→yellow fill drawn inside its dark interior.
export class TimerBar {
  constructor(scene) {
    this.scene = scene;
    this.frame = scene.add.image(0, 0, 'ptj-timer').setDepth(PTJ_DEPTH.cards);
    this.fill = scene.add.graphics().setDepth(PTJ_DEPTH.cards + 1);
    this.fraction = 1;
  }

  layout(x, top, height) {
    this.frame.setScale(height / this.frame.height).setPosition(x, top + height / 2);
    this.draw(this.fraction);
  }

  draw(fraction) {
    this.fraction = clamp(fraction, 0, 1);
    const f = this.frame;
    if (!f.scale) return;
    const inner = PTJ_ART.timerInner;
    const left = f.x - f.displayWidth / 2 + inner.x0 * f.displayWidth;
    const w = (inner.x1 - inner.x0) * f.displayWidth;
    const top = f.y - f.displayHeight / 2 + inner.y0 * f.displayHeight;
    const fullH = (inner.y1 - inner.y0) * f.displayHeight;
    const h = fullH * this.fraction;
    this.fill.clear();
    if (h < 1) return;
    const y = top + fullH - h;
    const r = Math.min(w / 2, h / 2);
    // Reference colours: yellow at the top of the column, red at the bottom.
    this.fill.fillGradientStyle(0xffd23f, 0xffd23f, 0xf0442b, 0xf0442b, 1);
    this.fill.fillRoundedRect(left, y, w, h, r);
    this.fill.fillStyle(0xffffff, 0.35).fillRoundedRect(left + w * 0.18, y + Math.min(r, h * 0.3), w * 0.18, Math.max(0, h - r * 2), w * 0.09);
    this.lowRect = { left, y, w, h };
  }

  flash() {
    this.scene.tweens.killTweensOf(this.frame);
    this.frame.setTint(0xff6b6b);
    this.scene.time.delayedCall(260, () => this.frame.clearTint());
  }

  rect() { const f = this.frame; return { x: f.x - f.displayWidth / 2, y: f.y - f.displayHeight / 2, w: f.displayWidth, h: f.displayHeight }; }
}

// "4/6" customer counter with the bear head, bottom-right of the counter.
export class ProgressPill {
  constructor(scene) {
    this.image = scene.add.image(0, 0, 'ptj-progress').setDepth(PTJ_DEPTH.cards);
    this.text = addText(scene, 0, 0, '1/6', { size: 22, weight: '700', color: '#7a4a3a' }).setDepth(PTJ_DEPTH.cards + 1);
  }

  layout(right, cy, width) {
    this.image.setScale(width / this.image.width).setPosition(right - width / 2, cy);
    const h = this.image.displayHeight;
    this.text.setFontSize(Math.round(h * 0.4)).setPosition(right - width + PTJ_ART.progressText.x * width, cy - h / 2 + PTJ_ART.progressText.y * h);
  }

  set(served, total) { this.text.setText(`${served}/${total}`); }
  rect() { const i = this.image; return { x: i.x - i.displayWidth / 2, y: i.y - i.displayHeight / 2, w: i.displayWidth, h: i.displayHeight }; }
}
