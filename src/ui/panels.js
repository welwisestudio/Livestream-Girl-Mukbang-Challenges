import { DEPTH, clamp } from './layout.js';
import { addText } from './text.js';
import { roundedBox, heartPath } from './draw.js';
import { COLORS, CSS } from '../content/theme.js';

// "● LIVE KITCHEN" style header pill.
export class HeaderPill {
  constructor(scene, { label, live = true }) {
    this.scene = scene;
    this.root = scene.add.container(0, 0).setDepth(DEPTH.header);
    this.g = scene.add.graphics();
    this.dot = scene.add.graphics();
    this.text = addText(scene, 0, 0, label, { size: 22, weight: '700', color: CSS.pinkDark });
    this.root.add([this.g, this.dot, this.text]);
    this.live = live;
    if (live) scene.tweens.add({ targets: this.dot, alpha: 0.3, duration: 650, yoyo: true, repeat: -1 });
  }

  setLabel(label) {
    this.text.setText(label);
    if (this.box) this.layout(this.box);
  }

  layout({ x, y, frame }) {
    this.box = { x, y, frame };
    const size = Math.round(clamp(22 * frame.ui, 20, 28));
    this.text.setFontSize(size);
    const h = Math.round(size * 2.15);
    const dot = this.live ? size * 0.95 : 0;
    const w = Math.round(this.text.width + dot + h * 0.9);
    this.root.setPosition(x, y);
    this.g.clear();
    roundedBox(this.g, -w / 2 + 2, -h / 2 + 4, w, h, { fill: 0x8a4b3a, alpha: 0.12 });
    roundedBox(this.g, -w / 2, -h / 2, w, h, { fill: COLORS.paper, stroke: COLORS.pinkDark, strokeWidth: 3 });
    this.text.setPosition(dot / 2, 0);
    this.dot.clear();
    if (this.live) {
      const dx = -this.text.width / 2 + dot / 2 - size * 0.62;
      this.dot.fillStyle(COLORS.live, 1).fillCircle(dx, 0, size * 0.27);
    }
    this.height = h;
    this.rect = { x: x - w / 2, y: y - h / 2, w, h };
    return { width: w, height: h };
  }

  destroy() { this.root.destroy(true); }
}

// Step dots (one per cooking step) + optional sub-progress bar (e.g. stirring).
export class StepProgress {
  constructor(scene, total) {
    this.scene = scene;
    this.total = total;
    this.current = 0;
    this.sub = null;
    this.root = scene.add.container(0, 0).setDepth(DEPTH.header);
    this.g = scene.add.graphics();
    this.bar = scene.add.graphics();
    this.root.add([this.g, this.bar]);
  }

  setStep(index) {
    this.current = index;
    this.redraw();
  }

  setSub(value) {
    this.sub = value;
    this.redraw();
  }

  layout({ x, y, frame }) {
    this.box = { x, y, frame };
    this.root.setPosition(x, y);
    this.redraw();
  }

  redraw() {
    if (!this.box) return;
    const { frame } = this.box;
    const slot = Math.round(clamp(30 * frame.ui, 28, 38));
    const gap = Math.round(slot * 0.36);
    const w = this.total * slot + (this.total - 1) * gap + slot * 0.9;
    const h = slot + Math.round(slot * 0.5);
    const g = this.g;
    g.clear();
    roundedBox(g, -w / 2 + 2, -h / 2 + 4, w, h, { fill: 0x8a4b3a, alpha: 0.12 });
    roundedBox(g, -w / 2, -h / 2, w, h, { fill: COLORS.paper, stroke: COLORS.pinkDark, strokeWidth: 3 });
    let cx = -w / 2 + slot * 0.45 + slot / 2;
    for (let i = 0; i < this.total; i += 1) {
      const done = i < this.current;
      const active = i === this.current;
      const r = slot / 2;
      if (done) {
        g.fillStyle(COLORS.pinkDark, 1).fillCircle(cx, 0, r);
        g.lineStyle(Math.max(3, slot * 0.12), 0xffffff, 1);
        g.beginPath();
        g.moveTo(cx - r * 0.42, 0);
        g.lineTo(cx - r * 0.08, r * 0.34);
        g.lineTo(cx + r * 0.46, -r * 0.34);
        g.strokePath();
      } else if (active) {
        g.fillStyle(COLORS.pinkSoft, 1).fillCircle(cx, 0, r);
        g.lineStyle(3, COLORS.pinkDark, 1).strokeCircle(cx, 0, r - 1.5);
        heartPath(g, cx, r * 0.05, r * 0.95, COLORS.rose);
      } else {
        g.fillStyle(0xf3e6ec, 1).fillCircle(cx, 0, r);
        g.lineStyle(2, 0xdcc3cf, 1).strokeCircle(cx, 0, r - 1);
      }
      cx += slot + gap;
    }
    this.bar.clear();
    if (this.sub !== null) {
      const bw = Math.round(w * 0.78);
      const bh = Math.round(clamp(slot * 0.42, 12, 16));
      const by = h / 2 + bh * 0.9;
      roundedBox(this.bar, -bw / 2, by, bw, bh, { fill: 0xffffff, stroke: COLORS.pinkDark, strokeWidth: 2 });
      if (this.sub > 0) roundedBox(this.bar, -bw / 2 + 2, by + 2, Math.max(bh - 4, (bw - 4) * this.sub), bh - 4, { fill: COLORS.rose });
    }
    this.size = { width: w, height: h };
    this.rect = { x: this.box.x - w / 2, y: this.box.y - h / 2, w, h: this.sub !== null ? h + 30 : h };
  }

  destroy() { this.root.destroy(true); }
}

// Viewer request card (avatar, requested dish, reward). Can be stamped as fulfilled.
export class RequestCard {
  constructor(scene, { viewer, avatar, dish, reward }) {
    this.scene = scene;
    this.root = scene.add.container(0, 0).setDepth(DEPTH.header);
    this.g = scene.add.graphics();
    this.title = addText(scene, 0, 0, 'Viewer Request', { size: 16, weight: '700', color: CSS.lavenderDark });
    this.avatar = scene.add.image(0, 0, avatar);
    this.viewer = addText(scene, 0, 0, viewer, { size: 13, weight: '600', color: CSS.inkSoft });
    this.dish = scene.add.image(0, 0, dish);
    this.rewardLabel = addText(scene, 0, 0, 'Reward', { size: 14, weight: '700', color: CSS.inkSoft });
    this.coin = scene.add.image(0, 0, 'coin');
    this.amount = addText(scene, 0, 0, String(reward), { size: 22, weight: '700', color: '#e08a1e', stroke: '#fff4d6', strokeWidth: 4, originX: 0 });
    this.stamp = scene.add.container(0, 0).setVisible(false);
    this.stampG = scene.add.graphics();
    this.stampText = addText(scene, 0, 0, 'Done!', { size: 18, weight: '700', color: CSS.white, stroke: '#2f7d39', strokeWidth: 4 });
    this.stamp.add([this.stampG, this.stampText]);
    this.root.add([this.g, this.title, this.avatar, this.viewer, this.dish, this.rewardLabel, this.coin, this.amount, this.stamp]);
  }

  layout({ x, y, frame }) {
    this.box = { x, y, frame };
    const w = Math.round(Math.min(frame.colW - frame.pad * 2, clamp(350 * frame.ui, 300, 440)));
    const h = Math.round(clamp(98 * frame.ui, 92, 120));
    this.root.setPosition(x, y);
    const g = this.g;
    g.clear();
    roundedBox(g, -w / 2 + 2, -h / 2 + 5, w, h, { fill: 0x5c3d8a, alpha: 0.14, radius: 22 });
    roundedBox(g, -w / 2, -h / 2, w, h, { fill: 0xffffff, stroke: COLORS.lavender, strokeWidth: 4, radius: 22 });
    const titleH = Math.round(h * 0.27);
    g.fillStyle(COLORS.lavenderSoft, 1).fillRoundedRect(-w / 2 + 4, -h / 2 + 4, w - 8, titleH, { tl: 18, tr: 18, bl: 0, br: 0 });
    this.title.setFontSize(Math.round(clamp(h * 0.17, 15, 19))).setPosition(0, -h / 2 + 4 + titleH / 2);
    const bodyY = -h / 2 + titleH + (h - titleH) / 2;
    const av = Math.round((h - titleH) * 0.56);
    this.avatar.setScale(av / Math.max(this.avatar.width, this.avatar.height)).setPosition(-w / 2 + 14 + av / 2, bodyY - h * 0.06);
    this.viewer.setFontSize(Math.round(clamp(h * 0.13, 12, 15))).setPosition(this.avatar.x, bodyY + av * 0.55);
    const dishSize = (h - titleH) * 0.92;
    this.dish.setScale(dishSize / Math.max(this.dish.width, this.dish.height)).setPosition(-w * 0.06, bodyY);
    const rx = w / 2 - Math.round(w * 0.27);
    this.rewardLabel.setFontSize(Math.round(clamp(h * 0.15, 13, 17))).setPosition(rx + w * 0.12, bodyY - h * 0.15);
    const coin = Math.round(h * 0.28);
    this.coin.setScale(coin / Math.max(this.coin.width, this.coin.height)).setPosition(rx + coin * 0.4, bodyY + h * 0.13);
    this.amount.setFontSize(Math.round(clamp(h * 0.24, 21, 28))).setPosition(rx + coin, bodyY + h * 0.13);
    this.stamp.setPosition(w / 2 - 34, -h / 2 + 12);
    this.stampG.clear();
    roundedBox(this.stampG, -40, -16, 80, 32, { fill: 0x7dd36a, stroke: 0x2f7d39, strokeWidth: 3 });
    this.size = { width: w, height: h };
    this.rect = { x: x - w / 2, y: y - h / 2, w, h };
    return this.size;
  }

  showFulfilled() {
    this.stamp.setVisible(true).setScale(2.2).setAlpha(0).setAngle(-12);
    this.scene.tweens.add({ targets: this.stamp, scale: 1, alpha: 1, duration: 300, ease: 'Back.Out' });
  }

  destroy() { this.root.destroy(true); }
}

// Livestream chat: bubbles rise from the bottom, at most `max` visible.
export class CommentFeed {
  constructor(scene, { comments, avatars, max = 3 }) {
    this.scene = scene;
    this.comments = comments;
    this.avatars = avatars;
    this.max = max;
    this.items = [];
    this.index = 0;
    this.root = scene.add.container(0, 0).setDepth(DEPTH.feed);
  }

  layout({ x, bottom, width, frame }) {
    this.box = { x, bottom, width, frame };
    this.reflow(false);
  }

  push(text = null) {
    if (!this.box) return;
    const message = text ?? this.comments[this.index % this.comments.length];
    const avatarKey = this.avatars[this.index % this.avatars.length];
    this.index += 1;
    const item = this.makeBubble(message, avatarKey);
    this.items.push(item);
    while (this.items.length > this.max) {
      const old = this.items.shift();
      this.scene.tweens.add({ targets: old, alpha: 0, duration: 200, onComplete: () => old.destroy(true) });
    }
    this.reflow(true, item);
  }

  makeBubble(message, avatarKey) {
    const { frame, width } = this.box;
    const size = Math.round(clamp(15 * frame.ui, 14, 18));
    const av = Math.round(size * 2.1);
    const c = this.scene.add.container(0, 0);
    const label = addText(this.scene, 0, 0, message, { size, weight: '600', color: '#ffffff', originX: 0, wrap: width - av - 34 });
    const bh = Math.max(av, label.height + 12);
    const bw = Math.min(width - av - 8, label.width + 26);
    const g = this.scene.add.graphics();
    roundedBox(g, av + 6, -bh / 2, bw, bh, { fill: 0x5b4256, alpha: 0.62, radius: Math.min(18, bh / 2) });
    const avatar = this.scene.add.image(av / 2, 0, avatarKey);
    avatar.setScale(av / Math.max(avatar.width, avatar.height));
    label.setPosition(av + 19, 0).setOrigin(0, 0.5);
    c.add([g, avatar, label]);
    c.setData('h', bh);
    this.root.add(c);
    return c;
  }

  reflow(animate, fresh = null) {
    if (!this.box) return;
    const { x, bottom } = this.box;
    let y = bottom;
    for (let i = this.items.length - 1; i >= 0; i -= 1) {
      const item = this.items[i];
      const h = item.getData('h');
      const targetY = y - h / 2;
      if (item === fresh) {
        item.setPosition(x, targetY + 14).setAlpha(0);
        this.scene.tweens.add({ targets: item, y: targetY, alpha: 1, duration: 260, ease: 'Sine.Out' });
      } else if (animate) {
        this.scene.tweens.add({ targets: item, x, y: targetY, alpha: i === 0 && this.items.length >= this.max ? 0.75 : 1, duration: 260, ease: 'Sine.Out' });
      } else {
        item.setPosition(x, targetY);
      }
      y -= h + 8;
    }
  }

  start(intervalMs = 1500) {
    this.stop();
    this.push();
    this.timer = this.scene.time.addEvent({ delay: intervalMs, loop: true, callback: () => this.push() });
  }

  stop() {
    this.timer?.remove();
    this.timer = null;
  }

  clear() {
    this.stop();
    for (const item of this.items) item.destroy(true);
    this.items = [];
  }

  destroy() {
    this.stop();
    this.root.destroy(true);
  }
}

// Big celebratory ribbon ("Perfect!!", "Level up!").
export class Banner {
  constructor(scene, label) {
    this.scene = scene;
    this.root = scene.add.container(0, 0).setDepth(DEPTH.banner);
    this.g = scene.add.graphics();
    this.text = addText(scene, 0, 0, label, { size: 46, weight: '700', color: '#ffffff', stroke: '#e0607f', strokeWidth: 8 });
    this.root.add([this.g, this.text]);
  }

  layout({ x, y, frame }) {
    const size = Math.round(clamp(48 * frame.ui, 42, 60));
    this.text.setFontSize(size);
    const h = Math.round(size * 1.75);
    const w = Math.min(frame.colW - frame.pad * 2 - h * 1.1, this.text.width + size * 2.2);
    const g = this.g;
    g.clear();
    const tail = h * 0.55;
    // Folded ribbon tails.
    g.fillStyle(0xd65c7e, 1);
    g.fillTriangle(-w / 2 - tail, -h * 0.15, -w / 2 + 6, -h * 0.15, -w / 2 + 6, h * 0.55);
    g.fillTriangle(-w / 2 - tail, h * 0.6, -w / 2 - tail * 0.45, h * 0.2, -w / 2 - tail, -h * 0.15);
    g.fillTriangle(w / 2 + tail, -h * 0.15, w / 2 - 6, -h * 0.15, w / 2 - 6, h * 0.55);
    g.fillTriangle(w / 2 + tail, h * 0.6, w / 2 + tail * 0.45, h * 0.2, w / 2 + tail, -h * 0.15);
    roundedBox(g, -w / 2, -h / 2, w, h, { fill: 0xff8fb0, stroke: 0xc94d70, strokeWidth: 4, radius: h * 0.42 });
    g.fillStyle(0xffffff, 0.35).fillRoundedRect(-w / 2 + h * 0.4, -h / 2 + h * 0.13, w - h * 0.8, h * 0.22, h * 0.11);
    g.lineStyle(2, 0xffffff, 0.8).strokeRoundedRect(-w / 2 + 6, -h / 2 + 6, w - 12, h - 12, h * 0.36);
    this.text.setPosition(0, -2);
    this.root.setPosition(x, y);
  }

  pop() {
    this.root.setScale(0.2).setAlpha(0);
    this.scene.tweens.add({ targets: this.root, scale: 1, alpha: 1, duration: 420, ease: 'Back.Out' });
  }

  destroy() { this.root.destroy(true); }
}

// Rounded modal card with a title. Content is positioned by the caller.
export class ModalPanel {
  constructor(scene, title) {
    this.scene = scene;
    this.dim = scene.add.rectangle(0, 0, 10, 10, 0x4a2c40, 0.42).setOrigin(0, 0).setDepth(DEPTH.overlay).setInteractive();
    this.root = scene.add.container(0, 0).setDepth(DEPTH.modal);
    this.g = scene.add.graphics();
    this.title = addText(scene, 0, 0, title, { size: 36, weight: '700', color: '#ffffff', stroke: '#e0607f', strokeWidth: 7 });
    this.root.add([this.g, this.title]);
  }

  layout(frame, { width, height }) {
    this.dim.setSize(frame.W, frame.H);
    const w = Math.round(width);
    const h = Math.round(height);
    const g = this.g;
    g.clear();
    roundedBox(g, -w / 2 + 3, -h / 2 + 8, w, h, { fill: 0x5c2d45, alpha: 0.18, radius: 34 });
    roundedBox(g, -w / 2, -h / 2, w, h, { fill: 0xfff4f6, stroke: COLORS.pinkDark, strokeWidth: 5, radius: 34 });
    g.lineStyle(3, 0xffffff, 1).strokeRoundedRect(-w / 2 + 7, -h / 2 + 7, w - 14, h - 14, 28);
    const size = Math.round(clamp(38 * frame.ui, 34, 48));
    this.title.setFontSize(size).setPosition(0, -h / 2 + size * 0.95);
    this.root.setPosition(frame.cx, frame.top + frame.h / 2);
    this.size = { width: w, height: h, top: -h / 2 + size * 1.7 };
    return this.size;
  }

  add(items) {
    this.root.add(items);
  }

  pop() {
    this.root.setScale(0.6).setAlpha(0);
    this.dim.setAlpha(0);
    this.scene.tweens.add({ targets: this.root, scale: 1, alpha: 1, duration: 320, ease: 'Back.Out' });
    this.scene.tweens.add({ targets: this.dim, alpha: 1, duration: 200 });
  }

  destroy() {
    this.dim.destroy();
    this.root.destroy(true);
  }
}
