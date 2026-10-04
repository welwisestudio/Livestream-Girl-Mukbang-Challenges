import { BaseScene } from './BaseScene.js';
import { CAMPAIGN_ORDER, LEVELS } from '../content/levels.js';
import { DEPTH, LOBBY_DEPTH, clamp, computeLobbyRegions } from '../ui/layout.js';
import { Hud } from '../ui/hud.js';
import { PillButton } from '../ui/controls.js';
import { HintHand, Streamer } from '../ui/actors.js';
import { addText } from '../ui/text.js';
import { heartPath, roundedBox } from '../ui/draw.js';
import { COLORS, CSS } from '../content/theme.js';

class FeatureButton {
  constructor(scene, texture, label, onTap, style = 'side') {
    this.scene = scene;
    this.style = style;
    const depth = style === 'gear' ? LOBBY_DEPTH.hud + 1 : LOBBY_DEPTH.features;
    this.root = scene.add.container(0, 0).setDepth(depth);
    this.bg = scene.add.graphics();
    this.icon = scene.add.image(0, 0, texture);
    this.text = addText(scene, 0, 0, label, { size: 13, weight: '700', color: CSS.white, stroke: '#d44f72', strokeWidth: 4, lineSpacing: -4 });
    this.root.add([this.bg, this.icon, this.text]);
    this.zone = scene.add.zone(0, 0, 60, 60).setDepth(depth + 1).setInteractive({ useHandCursor: true });
    this.zone.on('pointerdown', () => {
      scene.tweens.killTweensOf(this.root);
      scene.tweens.add({ targets: this.root, scale: 0.9, duration: 90, yoyo: true, onComplete: onTap });
    });
  }
  layout(x, y, frame, size = 70) {
    const d = Math.round(size);
    this.root.setPosition(x, y);
    this.bg.clear();
    if (this.style === 'nav') {
      roundedBox(this.bg, -d * 0.5, -d * 0.48, d, d * 0.96, { fill: 0xfff3dc, stroke: COLORS.orange, strokeWidth: 3, radius: d * 0.22 });
      this.icon.setScale((d * 0.56) / Math.max(this.icon.width, this.icon.height)).setPosition(0, -d * 0.12);
      this.text.setFontSize(Math.round(clamp(d * 0.15, 12, 14))).setPosition(0, d * 0.32);
      this.zone.setPosition(x, y).setSize(d + 8, d + 8);
      this.rect = { x: x - d / 2, y: y - d * 0.48, w: d, h: d * 0.96 };
    } else if (this.style === 'gear') {
      this.icon.setScale((d * 0.92) / Math.max(this.icon.width, this.icon.height)).setPosition(0, 0);
      this.text.setVisible(false);
      this.zone.setPosition(x, y).setSize(Math.max(48, d), Math.max(48, d));
      this.rect = { x: x - d / 2, y: y - d / 2, w: d, h: d };
    } else {
      this.icon.setScale((d * 0.76) / Math.max(this.icon.width, this.icon.height)).setPosition(0, -d * 0.14);
      this.text.setFontSize(Math.round(clamp(d * 0.17, 12, 15))).setPosition(0, d * 0.42);
      const h = d * 1.08;
      this.zone.setPosition(x, y).setSize(d + 8, h + 6);
      this.rect = { x: x - d / 2, y: y - d * 0.52, w: d, h };
    }
    this.zone.input.hitArea.setSize(this.zone.width, this.zone.height);
  }
  center() { return { x: this.zone.x, y: this.zone.y }; }
}

export class HomeScene extends BaseScene {
  constructor() { super('Home'); }

  create() {
    this.leaving = false;
    this.busy = false;
    this.saveState = this.services().save.snapshot();
    this.selectSuggestedLevel();
    this.wall = this.add.graphics().setDepth(LOBBY_DEPTH.background);
    this.table = this.add.graphics().setDepth(LOBBY_DEPTH.environment);
    this.hud = new Hud(this, { name: 'Player', level: this.saveState.highestLevel, coins: this.saveState.coins, xp: this.saveState.completedLevels[this.level.id] ? 0.75 : 0.15 });
    this.streamer = new Streamer(this); this.streamer.image.setDepth(LOBBY_DEPTH.character); this.streamer.idle();
    this.mascot = this.add.image(0, 0, 'sprout-mascot').setDepth(LOBBY_DEPTH.decoration);
    this.plate = this.add.image(0, 0, 'lobby-plate').setDepth(LOBBY_DEPTH.decoration);
    this.spoon = this.add.image(0, 0, 'lobby-spoon').setDepth(LOBBY_DEPTH.decoration);
    this.phone = this.add.image(0, 0, 'phone').setDepth(LOBBY_DEPTH.decoration);
    this.mitts = this.add.image(0, 0, 'mitts').setDepth(LOBBY_DEPTH.decoration);
    this.dish = this.add.image(0, 0, this.level.finalTexture).setDepth(LOBBY_DEPTH.decoration + 1).setVisible(false);
    this.bubble = this.add.image(0, 0, 'thought-bubble').setDepth(LOBBY_DEPTH.decoration);
    this.bubbleDish = this.add.image(0, 0, this.level.finalTexture).setDepth(LOBBY_DEPTH.decoration + 1);
    this.levelLabel = addText(this, 0, 0, '', { size: 22, weight: '700', color: CSS.white, stroke: '#d95f7d', strokeWidth: 5 }).setDepth(LOBBY_DEPTH.features).setVisible(false);
    this.features = [
      new FeatureButton(this, 'part-time', 'PART-TIME\nJOB', () => this.soon('Part-Time Job')),
      new FeatureButton(this, 'canteen', 'CANTEEN', () => this.soon('Canteen')),
      new FeatureButton(this, 'store', 'STORE', () => this.soon('Store')),
      new FeatureButton(this, 'skin', 'SKIN', () => this.soon('Skin')),
      new FeatureButton(this, 'daily', 'DAILY\nREWARD', () => this.soon('Daily Reward')),
    ];
    this.settings = new FeatureButton(this, 'settings', '', () => this.soon('Settings'), 'gear');
    this.market = new FeatureButton(this, 'supermarket', 'SUPER\nMARKET', () => this.soon('Super Market'), 'nav');
    this.decor = new FeatureButton(this, 'decor', 'DECOR', () => this.soon('Decor'), 'nav');
    this.toastBg = this.add.graphics().setDepth(DEPTH.banner).setVisible(false);
    this.toast = addText(this, 0, 0, '', { size: 17, weight: '700', color: CSS.white }).setDepth(DEPTH.banner + 1).setVisible(false);
    this.start = new PillButton(this, { label: this.ctaLabel(), live: false, onClick: () => this.primaryAction(), depth: LOBBY_DEPTH.features });
    this.hint = new HintHand(this);
    this.bindViewport();
    this.cameras.main.fadeIn(260, 255, 240, 245);
    this.services().platform.gameReady();
  }

  selectSuggestedLevel() {
    const number = Math.min(5, Math.max(1, this.saveState.availableLevel));
    this.level = LEVELS[CAMPAIGN_ORDER[number - 1]];
  }
  isLocked() { return this.level.number > this.saveState.highestLevel; }
  ctaLabel() { return this.isLocked() ? `Unlock · ${this.level.unlockPrice}` : 'Start'; }

  layout(f) {
    const r = computeLobbyRegions(f);
    this.lobbyRegions = r;
    this.drawBackdrop(f, r);

    const gearSize = Math.round(clamp(r.hud.h * 0.78, 52, 68));
    this.hud.layoutLobby(f, r.hud, gearSize);
    this.settings.layout(r.hud.x + r.hud.w - gearSize / 2, r.hud.y + r.hud.h / 2, f, gearSize);

    const sideSize = Math.round(clamp(Math.min(r.leftFeatures.w * 0.94, r.leftFeatures.h * 0.25), 58, 82));
    const lx = r.leftFeatures.x + r.leftFeatures.w / 2;
    const rx = r.rightFeatures.x + r.rightFeatures.w / 2;
    this.features[0].layout(lx, r.leftFeatures.y + r.leftFeatures.h * 0.24, f, sideSize);
    this.features[1].layout(lx, r.leftFeatures.y + r.leftFeatures.h * 0.65, f, sideSize);
    this.features[2].layout(rx, r.rightFeatures.y + r.rightFeatures.h * 0.14, f, sideSize);
    this.features[3].layout(rx, r.rightFeatures.y + r.rightFeatures.h * 0.49, f, sideSize);
    this.features[4].layout(rx, r.rightFeatures.y + r.rightFeatures.h * 0.84, f, sideSize);

    const charH = Math.round(clamp(Math.min(r.character.h * 0.64, r.character.w * 1.04), r.compact ? 160 : 180, 260));
    this.streamer.layout({ x: f.cx, bottom: r.table.y + charH * 0.08, height: charH });
    const mascotW = Math.round(clamp(f.colW * 0.15, 58, 88));
    this.mascot.setScale(mascotW / this.mascot.width).setPosition(f.cx + f.colW * 0.17, r.table.y - mascotW * 0.06);
    const bubbleW = Math.round(clamp(f.colW * 0.21, 80, 122));
    this.bubble.setScale(bubbleW / this.bubble.width).setPosition(f.cx + f.colW * 0.12, r.table.y - charH * 0.76);
    this.bubbleDish.setTexture(this.level.finalTexture).setScale((bubbleW * 0.55) / Math.max(this.bubbleDish.width, this.bubbleDish.height)).setPosition(this.bubble.x, this.bubble.y - 2);

    const plateW = Math.round(clamp(f.colW * 0.40, 145, 235));
    const propsY = r.table.y + r.table.h * 0.39;
    this.plate.setScale(plateW / this.plate.width).setPosition(f.cx, propsY);
    const propW = Math.round(clamp(f.colW * 0.14, 50, 80));
    this.spoon.setScale(propW / this.spoon.width).setPosition(f.cx - f.colW * 0.33, propsY - plateW * 0.05);
    this.phone.setScale((propW * 0.82) / this.phone.width).setPosition(f.cx - f.colW * 0.31, propsY + plateW * 0.48);
    this.mitts.setScale((propW * 1.14) / this.mitts.width).setPosition(f.cx + f.colW * 0.32, propsY + plateW * 0.42);

    const navSize = Math.round(clamp(r.nav.h * 0.66, 64, 84));
    const navY = r.nav.y + r.nav.h * (r.compact ? 0.47 : 0.53);
    this.market.layout(f.colLeft + navSize * 0.58, navY, f, navSize);
    this.decor.layout(f.colRight - navSize * 0.58, navY, f, navSize);
    const sideClearance = navSize + Math.round(clamp(f.colW * 0.04, 12, 20));
    this.start.layout({ x: f.cx, y: navY, frame: f, minWidth: 190, maxWidth: Math.min(285, f.colW - sideClearance * 2), scale: 1.08 });
    this.hint.hide();

    const bounds = (object) => {
      const b = object.getBounds();
      return { x: b.x, y: b.y, w: b.width, h: b.height };
    };
    this.layoutRects = {
      ...this.hud.rects,
      settings: this.settings.rect,
      'feature-part-time': this.features[0].rect,
      'feature-canteen': this.features[1].rect,
      'feature-store': this.features[2].rect,
      'feature-skin': this.features[3].rect,
      'feature-daily': this.features[4].rect,
      character: bounds(this.streamer.image),
      mascot: bounds(this.mascot),
      'thought-bubble': bounds(this.bubble),
      'table-plate': bounds(this.plate),
      'table-spoon': bounds(this.spoon),
      'table-phone': bounds(this.phone),
      'table-mitts': bounds(this.mitts),
      'nav-market': this.market.rect,
      'nav-start': { x: this.start.box.x - this.start.box.width / 2, y: this.start.box.y - this.start.box.height / 2, w: this.start.box.width, h: this.start.box.height * 1.09 },
      'nav-decor': this.decor.rect,
    };
  }

  drawBackdrop(f, r) {
    this.wall.clear().fillStyle(0xe3ffd9, 1).fillRect(0, 0, f.W, f.H);
    const spacing = clamp(f.colW * 0.18, 62, 94);
    for (let y = 22; y < r.table.y - 10; y += spacing) {
      for (let x = (Math.floor(y / spacing) % 2) * spacing * 0.5; x < f.W; x += spacing) heartPath(this.wall, x, y, clamp(spacing * 0.14, 8, 13), 0xbfeebc, 0.48);
    }
    this.table.clear().fillStyle(0xf2c9fa, 1).fillRect(0, r.table.y, f.W, f.H - r.table.y);
    const cell = clamp(f.colW * 0.12, 42, 64);
    this.table.fillStyle(0xffffff, 0.52);
    for (let y = r.table.y; y < r.nav.y; y += cell) for (let x = 0; x < f.W; x += cell) if ((Math.floor((y - r.table.y) / cell) + Math.floor(x / cell)) % 2 === 0) this.table.fillRect(x, y, cell, Math.min(cell, r.nav.y - y));
    this.table.lineStyle(4, 0xe6a9de, 1).lineBetween(0, r.table.y, f.W, r.table.y);
    this.table.fillStyle(0xe9b9ef, 1).fillRoundedRect(-20, r.nav.y - 6, f.W + 40, r.nav.h + 26, 28);
  }

  soon(label) {
    if (!this.frame) return;
    this.toast.setText(`${label} · Soon`).setVisible(true).setPosition(this.frame.cx, this.frame.top + this.frame.h * 0.47);
    const w = this.toast.width + 34; const h = 42;
    this.toastBg.clear(); roundedBox(this.toastBg, this.toast.x - w / 2, this.toast.y - h / 2, w, h, { fill: 0x6a3f57, alpha: 0.88 }); this.toastBg.setVisible(true);
    this.tweens.killTweensOf([this.toast, this.toastBg]);
    this.tweens.add({ targets: [this.toast, this.toastBg], alpha: 0, delay: 900, duration: 250, onComplete: () => { this.toast.setVisible(false).setAlpha(1); this.toastBg.setVisible(false).setAlpha(1); } });
  }

  async primaryAction() {
    if (this.leaving || this.busy) return;
    this.hint.hide();
    if (!this.isLocked()) { this.fadeTo('Level', { levelId: this.level.id }); return; }
    this.busy = true; this.start.setEnabled(false);
    try {
      const result = await this.services().rewards.unlockLevel({ levelId: this.level.id, levelNumber: this.level.number, price: this.level.unlockPrice });
      this.saveState = result.state; this.hud.setCoins(result.state.coins); this.start.setLabel('Start'); this.start.setEnabled(true); this.busy = false; this.layout(this.frame);
    } catch (error) {
      this.busy = false; this.start.setEnabled(true); this.soon(error.message);
    }
  }

  getDebugSnapshot() {
    return { scene: 'Home', phase: this.isLocked() ? 'locked' : 'home', levelId: this.level.id, targets: { start: this.start.center() }, save: this.services().save.snapshot() };
  }
}
