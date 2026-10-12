import { BaseScene } from './BaseScene.js';
import { CAMPAIGN_ORDER, LEVELS } from '../content/levels.js';
import { APPEARANCE_ITEM_BY_ID, DEFAULT_EQUIPPED_APPEARANCE } from '../content/appearance.js';
import { DEPTH, clamp, uiLeft, uiRight } from '../ui/layout.js';
import { addText } from '../ui/text.js';
import { UI_OUTLINE, roundedBox } from '../ui/draw.js';
import { CSS } from '../content/theme.js';
import { GameDialog } from '../ui/gameDialog.js';

// Level select: every campaign level as a card (food picture + level number) in a vertically
// scrolling grid. Levels already passed and the next level in order start for free; levels not
// reached yet carry the video badge and start after an earned rewarded ad (dialog first).
// Scrolling: drag with momentum, mouse wheel, and the list opens centred on the current level.
const D = { wall: 0, panel: 2, cards: 10, band: 30, header: 32, toast: 40 };
const TAP_SLOP = 10;

class LevelCard {
  constructor(scene, level) {
    this.scene = scene;
    this.level = level;
    this.root = scene.add.container(0, 0).setDepth(D.cards);
    this.frame = scene.add.image(0, 0, 'levels-card');
    this.food = scene.add.image(0, 0, level.finalTexture);
    this.foodBox = scene.add.container(0, 0, [this.food]);
    this.title = addText(scene, 0, 0, level.title, { size: 13, weight: '700', color: CSS.ink, lineSpacing: -4 });
    this.badge = scene.add.image(0, 0, 'levels-badge');
    this.number = addText(scene, 0, 0, String(level.number), { size: 18, weight: '700', color: CSS.white, stroke: '#c73b6c', strokeWidth: 4 });
    this.check = scene.add.image(0, 0, 'store-check');
    this.video = scene.add.image(0, 0, 'reward-play');
    this.root.add([this.frame, this.foodBox, this.title, this.badge, this.number, this.check, this.video]);
  }

  // The level Start leads to breathes gently so it is easy to find.
  pulse() {
    this.scene.tweens.add({ targets: this.foodBox, scale: { from: 1, to: 1.08 }, duration: 650, yoyo: true, repeat: -1, ease: 'Sine.InOut' });
  }

  setState(state) {
    this.state = state;
    const locked = state === 'locked';
    this.frame.setTexture(locked ? 'levels-card-locked' : state === 'current' ? 'levels-card-current' : 'levels-card');
    this.food.setAlpha(locked ? 0.6 : 1);
    if (locked) this.food.setTint(0xc9c2d9); else this.food.clearTint();
    this.title.setColor(locked ? '#8f86a6' : CSS.ink);
    this.check.setVisible(state === 'done');
    // Only levels not reached yet are played for a rewarded video.
    this.video.setVisible(locked);
  }

  layout(x, y, w) {
    const h = w * 1.3;
    this.w = w; this.h = h; this.x = x; this.y = y;
    this.root.setPosition(x, y);
    this.frame.setScale(w / this.frame.width, h / this.frame.height);
    const inner = w * 0.7;
    this.food.setScale(inner / Math.max(this.food.width, this.food.height * 0.9));
    this.foodBox.setPosition(0, -h * 0.08);
    // Long names wrap onto two lines instead of shrinking to an unreadable size.
    let size = Math.round(clamp(w * 0.112, 12, 16));
    this.title.setWordWrapWidth(w * 0.86, false).setScale(1);
    this.title.setFontSize(size);
    while (size > 11 && (this.title.height > size * 2.9 || this.title.width > w * 0.9)) this.title.setFontSize(--size);
    // A single word wider than the card ("Chocolate-Covered") is scaled to fit.
    if (this.title.width > w * 0.9) this.title.setScale((w * 0.9) / this.title.width);
    const lines = this.title.height > size * 1.9 ? 2 : 1;
    this.title.setPosition(0, h * (lines === 2 ? 0.33 : 0.36));
    const b = Math.round(w * 0.36);
    this.badge.setScale(b / this.badge.width).setPosition(-w * 0.4, -h * 0.42);
    this.number.setFontSize(Math.round(b * 0.46)).setPosition(this.badge.x, this.badge.y - b * 0.03);
    // Video badge in the top-right corner; the check of finished levels sits on the dish.
    const v = Math.round(w * 0.3);
    this.video.setScale(v / Math.max(this.video.width, this.video.height)).setPosition(w * 0.4, -h * 0.42);
    const c = Math.round(w * 0.26);
    this.check.setScale(c / this.check.width).setPosition(w * 0.34, h * 0.14);
  }

  contains(px, py) {
    return Math.abs(px - this.x) <= this.w / 2 && Math.abs(py - this.y) <= this.h / 2;
  }

  pop() {
    this.scene.tweens.killTweensOf(this.root);
    this.root.setScale(0.94);
    this.scene.tweens.add({ targets: this.root, scale: 1, duration: 140, ease: 'Back.Out' });
  }

  shake() {
    const x0 = this.root.x;
    this.scene.tweens.killTweensOf(this.root);
    this.root.setScale(1);
    this.scene.tweens.add({ targets: this.root, x: x0 + 6, duration: 45, yoyo: true, repeat: 3, onComplete: () => this.root.setX(x0) });
  }
}

export class LevelsScene extends BaseScene {
  constructor() { super('Levels'); }

  create() {
    this.leaving = false;
    const save = this.services().save.snapshot();
    this.save = save;
    const equipped = save.appearance.equipped;
    const isDefault = Object.entries(DEFAULT_EQUIPPED_APPEARANCE).every(([k, v]) => equipped[k] === v);
    const wallKey = isDefault ? 'lobby-wallpaper' : APPEARANCE_ITEM_BY_ID[equipped.background].texture;
    this.wallScale = isDefault ? 0.5 : null;
    this.wall = this.add.tileSprite(0, 0, 16, 16, wallKey).setOrigin(0).setDepth(D.wall);
    // The top band repeats the wallpaper above the cards, so cards scroll "under" the header.
    this.band = this.add.tileSprite(0, 0, 16, 16, wallKey).setOrigin(0).setDepth(D.band);
    this.bandEdge = this.add.graphics().setDepth(D.band + 1);
    this.panel = this.add.graphics().setDepth(D.panel);
    this.scrollbar = this.add.graphics().setDepth(D.cards + 5);

    this.header = this.add.image(0, 0, 'levels-header').setDepth(D.header);
    this.progress = addText(this, 0, 0, '', { size: 15, weight: '700', color: CSS.white, stroke: '#c73b6c', strokeWidth: 4 }).setDepth(D.header);
    this.close = this.add.image(0, 0, 'custom-close').setDepth(D.header);
    this.closeZone = this.add.zone(0, 0, 56, 56).setDepth(D.header + 1).setInteractive({ useHandCursor: true });
    this.closeZone.on('pointerup', () => this.back());

    this.current = Math.min(CAMPAIGN_ORDER.length, Math.max(1, save.availableLevel));
    this.cards = CAMPAIGN_ORDER.map((id) => new LevelCard(this, LEVELS[id]));
    for (const card of this.cards) card.setState(this.stateOf(card.level));
    const done = this.cards.filter((c) => c.state === 'done').length;
    this.progress.setText(`★ ${done} / ${CAMPAIGN_ORDER.length} cleared`);

    this.toastBg = this.add.graphics().setDepth(D.toast).setVisible(false);
    this.toast = addText(this, 0, 0, '', { size: 16, weight: '700', color: CSS.white }).setDepth(D.toast + 1).setVisible(false);

    this.scrollY = 0;
    this.velocity = 0;
    this.drag = null;
    this.centred = false;
    this.input.on('pointerdown', (p) => this.onDown(p));
    this.input.on('pointermove', (p) => this.onMove(p));
    this.input.on('pointerup', (p) => this.onUp(p));
    this.input.on('pointerupoutside', (p) => this.onUp(p));
    this.input.on('wheel', (p, objs, dx, dy) => { this.velocity = 0; this.setScroll(this.scrollY + dy * 0.6); });

    this.bindViewport();
    this.cameras.main.fadeIn(240, 255, 240, 245);
  }

  stateOf(level) {
    if (level.number > this.save.highestLevel) return 'locked';
    if (level.number === this.current) return 'current';
    return (this.save.completedLevels[level.id] ?? 0) > 0 ? 'done' : 'open';
  }

  layout(f) {
    this.frame = f;
    const wallScale = this.wallScale ?? Math.max(0.38, f.colW / 1024);
    this.wall.setPosition(0, 0).setSize(f.W, f.H).setTileScale(wallScale);

    const headerW = Math.round(clamp(f.colW * 0.62, 220, 340));
    const headerY = f.top + Math.round(clamp(f.h * 0.06, 40, 58));
    this.header.setScale(headerW / this.header.width).setPosition(f.cx, headerY);
    const closeSize = Math.round(clamp(f.colW * 0.13, 46, 58));
    // Close: top-right screen edge on wide screens, column edge on phones.
    const closeX = uiRight(f, 8) - closeSize / 2;
    this.close.setScale(closeSize / this.close.width).setPosition(closeX, headerY);
    this.closeZone.setPosition(closeX, headerY).setSize(closeSize + 8, closeSize + 8);
    this.closeZone.input.hitArea.setSize(this.closeZone.width, this.closeZone.height);
    const progressY = headerY + this.header.displayHeight / 2 + 14;
    this.progress.setFontSize(Math.round(clamp(15 * f.ui, 14, 18))).setPosition(f.cx, progressY);

    // Panel the cards scroll inside.
    const panelW = Math.min(f.w - 16, Math.max(f.colW - 12, Math.min(f.w * 0.7, 900)));
    const panelX = f.cx - panelW / 2;
    this.viewTop = Math.round(progressY + 18);
    this.viewBottom = f.bottom;
    this.panel.clear();
    roundedBox(this.panel, panelX, this.viewTop, panelW, f.bottom - this.viewTop + 30, { fill: 0xfff6fa, alpha: 0.9, stroke: 0xf3a9c3, strokeWidth: UI_OUTLINE, radius: 22 });
    this.band.setPosition(0, 0).setSize(f.W, this.viewTop).setTileScale(wallScale);
    this.bandEdge.clear();
    this.bandEdge.fillStyle(0xf3a9c3, 1).fillRect(panelX + 18, this.viewTop - 1, panelW - 36, 3);

    // Grid: as many ~120 px cards as fit (3 on phones, up to 6 on wide screens).
    const pad = Math.round(clamp(panelW * 0.04, 12, 22));
    const gap = Math.round(clamp(panelW * 0.03, 10, 18));
    const inner = panelW - pad * 2;
    this.cols = clamp(Math.floor((inner + gap) / (clamp(f.colW * 0.3, 104, 150) + gap)), 3, 6);
    const cardW = Math.floor((inner - gap * (this.cols - 1)) / this.cols);
    const cardH = cardW * 1.3;
    this.cellH = cardH + gap + Math.round(cardW * 0.08);
    this.gridLeft = panelX + pad + cardW / 2;
    this.gridTop = this.viewTop + pad + cardH / 2 + Math.round(cardW * 0.08);
    this.cardW = cardW; this.colStep = cardW + gap;
    const rows = Math.ceil(this.cards.length / this.cols);
    const contentH = (rows - 1) * this.cellH + cardH + pad * 2 + Math.round(cardW * 0.08);
    this.maxScroll = Math.max(0, contentH - (this.viewBottom - this.viewTop) + 12);
    this.scrollbarX = panelX + panelW - 7;

    if (!this.centred) {
      // Open on the current level, roughly in the upper middle of the list.
      const row = Math.floor((this.current - 1) / this.cols);
      this.scrollY = row * this.cellH - (this.viewBottom - this.viewTop) * 0.32;
      this.centred = true;
    }
    this.setScroll(this.scrollY);
    const current = this.cards[this.current - 1];
    this.tweens.killTweensOf(current.foodBox);
    current.foodBox.setScale(1);
    if (current.state === 'current') current.pulse();
    if (this.toast.visible) this.toast.setPosition(f.cx, f.top + f.h * 0.5);
    this.dialog?.layout(f);
  }

  setScroll(y) {
    this.scrollY = clamp(y, 0, this.maxScroll ?? 0);
    const f = this.frame;
    if (!f) return;
    this.cards.forEach((card, i) => {
      const x = this.gridLeft + (i % this.cols) * this.colStep;
      const cy = this.gridTop + Math.floor(i / this.cols) * this.cellH - this.scrollY;
      card.layout(x, cy, this.cardW);
      card.root.setVisible(cy + card.h / 2 > this.viewTop - 4 && cy - card.h / 2 < this.viewBottom + 4);
    });
    this.scrollbar.clear();
    if (this.maxScroll > 0) {
      const trackH = this.viewBottom - this.viewTop - 28;
      const thumbH = Math.max(36, trackH * ((this.viewBottom - this.viewTop) / (this.viewBottom - this.viewTop + this.maxScroll)));
      const ty = this.viewTop + 14 + (trackH - thumbH) * (this.scrollY / this.maxScroll);
      this.scrollbar.fillStyle(0xf3a9c3, 0.35).fillRoundedRect(this.scrollbarX - 3, this.viewTop + 14, 6, trackH, 3);
      this.scrollbar.fillStyle(0xe0789a, 0.9).fillRoundedRect(this.scrollbarX - 3, ty, 6, thumbH, 3);
    }
  }

  // ---- input: drag-to-scroll with momentum; a press that does not move is a tap
  onDown(p) {
    if (this.leaving || this.dialog || p.worldY < this.viewTop) return;
    this.velocity = 0;
    this.drag = { id: p.id, startY: p.worldY, lastY: p.worldY, lastT: this.time.now, scroll0: this.scrollY, moved: 0 };
    this.pressed = this.cards.find((c) => c.root.visible && c.contains(p.worldX, p.worldY)) ?? null;
  }

  onMove(p) {
    const d = this.drag;
    if (!d || d.id !== p.id || !p.isDown) return;
    d.moved = Math.max(d.moved, Math.abs(p.worldY - d.startY));
    const now = this.time.now;
    const dt = Math.max(1, now - d.lastT);
    this.velocity = (d.lastY - p.worldY) / dt;
    d.lastY = p.worldY; d.lastT = now;
    if (d.moved > TAP_SLOP) this.setScroll(d.scroll0 - (p.worldY - d.startY));
  }

  onUp(p) {
    const d = this.drag;
    if (!d || d.id !== p.id) return;
    this.drag = null;
    if (d.moved <= TAP_SLOP) {
      this.velocity = 0;
      const card = this.cards.find((c) => c.root.visible && c.contains(p.worldX, p.worldY));
      if (card && card === this.pressed) this.choose(card);
    } else if (this.time.now - d.lastT > 80) {
      this.velocity = 0;
    }
    this.pressed = null;
  }

  update(time, delta) {
    if (this.drag || Math.abs(this.velocity) < 0.02) return;
    this.setScroll(this.scrollY + this.velocity * delta);
    this.velocity *= Math.pow(0.92, delta / 16);
    if (this.scrollY <= 0 || this.scrollY >= this.maxScroll) this.velocity = 0;
  }

  choose(card) {
    if (this.leaving || this.dialog) return;
    card.pop();
    if (card.state !== 'locked') {
      this.time.delayedCall(120, () => this.fadeTo('Level', { levelId: card.level.id }));
      return;
    }
    this.dialog = new GameDialog(this, {
      title: `Level ${card.level.number}`,
      body: `Watch a short video to play ${card.level.title} now.`,
      primary: { label: 'Watch video', onTap: () => this.watchFor(card) },
      secondary: { label: 'Cancel', onTap: () => this.closeDialog() },
      depth: D.toast - 4,
    });
    this.dialog.layout(this.frame);
  }

  closeDialog() {
    if (this.adBusy) return;
    this.dialog?.destroy();
    this.dialog = null;
  }

  async watchFor(card) {
    if (this.adBusy) return;
    this.adBusy = true;
    const result = await this.services().rewards.requestLevelPlayAd(card.level.id);
    this.adBusy = false;
    this.lastAd = result.status;
    this.closeDialog();
    if (result.status === 'earned') {
      this.fadeTo('Level', { levelId: card.level.id });
      return;
    }
    card.shake();
    this.showToast(result.status === 'not-earned' ? 'Watch the whole video to play' : 'No video right now. Try again later');
  }

  showToast(text) {
    const f = this.frame;
    this.toast.setText(text).setVisible(true).setAlpha(1).setPosition(f.cx, f.top + f.h * 0.5);
    const w = this.toast.width + 34; const h = 42;
    this.toastBg.clear().setVisible(true).setAlpha(1);
    roundedBox(this.toastBg, this.toast.x - w / 2, this.toast.y - h / 2, w, h, { fill: 0x6a3f57, alpha: 0.88 });
    this.tweens.killTweensOf([this.toast, this.toastBg]);
    this.tweens.add({ targets: [this.toast, this.toastBg], alpha: 0, delay: 1100, duration: 250, onComplete: () => { this.toast.setVisible(false); this.toastBg.setVisible(false); } });
  }

  back() {
    this.fadeTo('Home');
  }

  // ---- test hooks (dev only)
  getDebugSnapshot() {
    if (this.dialog) return { scene: 'Levels', phase: 'dialog', lastAd: this.lastAd ?? null, targets: this.dialog.targets(), save: this.services().save.snapshot() };
    const targets = { close: { x: this.closeZone.x, y: this.closeZone.y } };
    for (const card of this.cards) {
      if (card.root.visible && card.y - card.h * 0.3 > this.viewTop && card.y + card.h * 0.3 < this.viewBottom) targets[`level:${card.level.number}`] = { x: card.x, y: card.y };
    }
    const r = (o) => { const b = o.getBounds(); return { x: b.x, y: b.y, w: b.width, h: b.height }; };
    this.layoutRects = { 'levels-header': r(this.header), 'levels-close': r(this.close) };
    return {
      scene: 'Levels',
      phase: 'levels',
      lastAd: this.lastAd ?? null,
      scrollY: this.scrollY,
      maxScroll: this.maxScroll,
      cols: this.cols,
      current: this.current,
      states: Object.fromEntries(this.cards.map((c) => [c.level.number, c.state])),
      viewport: { top: this.viewTop, bottom: this.viewBottom },
      targets,
      save: this.services().save.snapshot(),
    };
  }
}
