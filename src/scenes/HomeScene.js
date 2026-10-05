import { BaseScene } from './BaseScene.js';
import { CAMPAIGN_ORDER, LEVELS } from '../content/levels.js';
import { APPEARANCE_ITEM_BY_ID, DEFAULT_EQUIPPED_APPEARANCE } from '../content/appearance.js';
import { DEPTH, LOBBY_DEPTH, clamp, computeLobbyRegions } from '../ui/layout.js';
import { Hud } from '../ui/hud.js';
import { HintHand, Streamer } from '../ui/actors.js';
import { addText } from '../ui/text.js';
import { roundedBox } from '../ui/draw.js';
import { CSS } from '../content/theme.js';

class FeatureButton {
  constructor(scene, texture, label, onTap, style = 'side') {
    this.scene = scene;
    this.style = style;
    const depth = style === 'gear' ? LOBBY_DEPTH.hud + 1 : LOBBY_DEPTH.features;
    this.root = scene.add.container(0, 0).setDepth(depth);
    this.bg = scene.add.graphics();
    this.icon = scene.add.image(0, 0, texture);
    // Side and bottom navigation art now contains its final lettering. Keeping a
    // second live-text layer made the old Lobby look dull and caused visible collisions.
    this.text = addText(scene, 0, 0, label, { size: 13, weight: '700', color: '#ff4f78', stroke: CSS.white, strokeWidth: 5, lineSpacing: -4 })
      .setOrigin(0.5, 0)
      .setShadow(0, 3, '#c52362', 0, true, true)
      .setVisible(false);
    this.root.add([this.bg, this.icon, this.text]);
    this.zone = scene.add.zone(0, 0, 60, 60).setDepth(depth + 1).setInteractive({ useHandCursor: true });
    this.pressed = false;
    this.hovered = false;
    this.zone.on('pointerover', () => {
      this.hovered = true;
      scene.tweens.killTweensOf(this.root);
      scene.tweens.add({ targets: this.root, scale: 1.035, duration: 90, ease: 'Sine.Out' });
    });
    this.zone.on('pointerout', () => {
      this.hovered = false;
      this.pressed = false;
      if (this.firing) return;
      scene.tweens.killTweensOf(this.root);
      scene.tweens.add({ targets: this.root, scale: 1, duration: 90, ease: 'Sine.Out' });
    });
    this.zone.on('pointerdown', () => {
      if (this.firing) return;
      this.firing = true;
      scene.tweens.killTweensOf(this.root);
      this.root.setScale(0.94);
      onTap();
      scene.tweens.add({
        targets: this.root, scale: this.hovered ? 1.035 : 1, duration: 110, ease: 'Back.Out',
        onComplete: () => { this.firing = false; },
      });
    });
  }
  layout(x, y, frame, size = 70) {
    const d = Math.round(size);
    this.root.setPosition(Math.round(x), Math.round(y)).setScale(1);
    this.bg.clear();
    if (this.style === 'nav') {
      this.icon.setScale((d * 0.98) / Math.max(this.icon.width, this.icon.height)).setPosition(0, 0);
      this.zone.setPosition(x, y).setSize(d + 8, d + 8);
      this.rect = { x: x - d / 2, y: y - d * 0.48, w: d, h: d * 0.96 };
    } else if (this.style === 'gear') {
      this.icon.setScale((d * 0.92) / Math.max(this.icon.width, this.icon.height)).setPosition(0, 0);
      this.text.setVisible(false);
      this.zone.setPosition(x, y).setSize(Math.max(48, d), Math.max(48, d));
      this.rect = { x: x - d / 2, y: y - d / 2, w: d, h: d };
    } else {
      // All side-button sources are normalized to the same transparent-canvas
      // height by build-assets. Scale by height so wider labels no longer look
      // smaller than STORE/SKIN, and keep the baked reference lettering intact.
      this.icon.setScale(d / this.icon.height).setPosition(0, 0);
      const h = d * 1.08;
      const w = Math.max(d, this.icon.displayWidth);
      this.zone.setPosition(x, y).setSize(w + 2, h + 6);
      this.rect = { x: x - w / 2, y: y - d * 0.52, w, h };
    }
    this.zone.input.hitArea.setSize(this.zone.width, this.zone.height);
  }
  center() { return { x: this.zone.x, y: this.zone.y }; }
}

class LobbyStartButton {
  constructor(scene, { label, onClick }) {
    this.scene = scene;
    this.enabled = true;
    this.root = scene.add.container(0, 0).setDepth(LOBBY_DEPTH.features);
    this.image = scene.add.image(0, 0, 'lobby-start');
    this.text = addText(scene, 0, 0, label, {
      size: 34, weight: '700', color: CSS.white, stroke: '#d65337', strokeWidth: 6,
    });
    this.root.add([this.image, this.text]);
    this.zone = scene.add.zone(0, 0, 180, 72).setDepth(LOBBY_DEPTH.features + 1).setInteractive({ useHandCursor: true });
    this.zone.on('pointerdown', () => {
      if (!this.enabled) return;
      scene.tweens.killTweensOf(this.root);
      this.root.setScale(0.95);
      onClick();
      scene.tweens.add({ targets: this.root, scale: 1, duration: 130, ease: 'Back.Out' });
    });
  }

  layout({ x, y, frame }) {
    const width = Math.round(clamp(frame.colW * 0.42, 164, 210));
    const scale = width / this.image.width;
    this.root.setPosition(Math.round(x), Math.round(y)).setScale(1);
    this.image.setScale(scale);
    this.text.setFontSize(Math.round(clamp(width * 0.18, 28, 38))).setPosition(0, -1);
    this.zone.setPosition(x, y).setSize(width, this.image.displayHeight + 8);
    this.zone.input.hitArea.setSize(this.zone.width, this.zone.height);
    this.box = { x, y, width, height: this.image.displayHeight };
  }

  setLabel(label) { this.text.setText(label); }
  setEnabled(value) { this.enabled = value; this.root.setAlpha(value ? 1 : 0.58); }
  center() { return { x: this.zone.x, y: this.zone.y }; }
}

function hasReferenceDefault(equipped) {
  return Object.entries(DEFAULT_EQUIPPED_APPEARANCE).every(([key, value]) => equipped[key] === value);
}

// Both side menus use the same three-row rhythm from the reference. The left menu occupies
// the first two rows; the right menu occupies all three. No button owns an arbitrary Y offset.
function layoutSideMenu(buttons, region, frame, size) {
  const slots = 3;
  const visualH = size * 1.08;
  const gap = Math.max(0, (region.h - visualH * slots) / (slots - 1));
  const x = region.x + region.w / 2;
  for (let i = 0; i < buttons.length; i += 1) {
    const y = region.y + visualH / 2 + i * (visualH + gap);
    buttons[i].layout(x, y, frame, size);
  }
}

export class HomeScene extends BaseScene {
  constructor() { super('Home'); }

  create() {
    this.leaving = false;
    this.busy = false;
    this.saveState = this.services().save.snapshot();
    this.referenceDefault = hasReferenceDefault(this.saveState.appearance.equipped);
    this.selectSuggestedLevel();
    this.wall = this.add.tileSprite(0, 0, 16, 16, 'lobby-wallpaper').setOrigin(0).setDepth(LOBBY_DEPTH.background);
    this.table = this.add.tileSprite(0, 0, 16, 16, 'lobby-tablecloth').setOrigin(0).setDepth(LOBBY_DEPTH.table);
    this.tableDetails = this.add.graphics().setDepth(LOBBY_DEPTH.table + 1);
    this.hud = new Hud(this, { name: 'User', level: this.saveState.highestLevel, coins: this.saveState.coins, xp: this.saveState.completedLevels[this.level.id] ? 0.75 : 0.15 });
    if (this.referenceDefault) this.hud.avatar.setTexture('lobby-avatar');
    this.hud.coin.setTexture('lobby-coins');
    this.streamer = new Streamer(this); this.streamer.image.setDepth(LOBBY_DEPTH.character); this.streamer.idle();
    this.streamer.image.setVisible(!this.referenceDefault);
    this.referenceHeroine = this.add.image(0, 0, 'lobby-heroine').setOrigin(0.5, 1).setDepth(LOBBY_DEPTH.character).setVisible(this.referenceDefault);
    this.mascot = this.add.image(0, 0, 'sprout-mascot').setOrigin(0.5, 1).setDepth(LOBBY_DEPTH.tableObjects + 2);
    this.placemat = this.add.image(0, 0, 'lobby-placemat').setDepth(LOBBY_DEPTH.tableObjects);
    this.plate = this.add.image(0, 0, 'lobby-plate').setDepth(LOBBY_DEPTH.tableObjects);
    this.spoon = this.add.image(0, 0, 'lobby-spoon').setDepth(LOBBY_DEPTH.tableObjects);
    this.phone = this.add.image(0, 0, 'phone').setDepth(LOBBY_DEPTH.tableObjects);
    this.mitts = this.add.image(0, 0, 'mitts').setDepth(LOBBY_DEPTH.tableObjects);
    this.cutleryTray = this.add.image(0, 0, 'lobby-cutlery-tray').setDepth(LOBBY_DEPTH.tableObjects);
    this.dish = this.add.image(0, 0, this.level.finalTexture).setDepth(LOBBY_DEPTH.tableObjects + 1).setVisible(false);
    this.bubble = this.add.image(0, 0, 'thought-bubble').setDepth(LOBBY_DEPTH.accessories);
    this.bubbleDish = this.add.image(0, 0, 'lobby-chicken').setDepth(LOBBY_DEPTH.accessories + 1);
    this.levelLabel = addText(this, 0, 0, '', { size: 22, weight: '700', color: CSS.white, stroke: '#d95f7d', strokeWidth: 5 }).setDepth(LOBBY_DEPTH.features).setVisible(false);
    this.features = [
      new FeatureButton(this, 'part-time', 'PART-TIME\nJOB', () => this.soon('Part-Time Job')),
      new FeatureButton(this, 'canteen', 'CANTEEN', () => this.soon('Canteen')),
      new FeatureButton(this, 'store', 'STORE', () => this.soon('Store')),
      new FeatureButton(this, 'skin', 'SKIN', () => this.fadeTo('Customization')),
      new FeatureButton(this, 'daily', 'DAILY\nREWARD', () => this.soon('Daily Reward')),
    ];
    this.settings = new FeatureButton(this, 'settings', '', () => this.soon('Settings'), 'gear');
    this.market = new FeatureButton(this, 'supermarket', 'SUPER\nMARKET', () => this.soon('Super Market'), 'nav');
    this.decor = new FeatureButton(this, 'decor', 'Lv.3\nDECOR', () => this.soon('Decor'), 'nav');
    this.toastBg = this.add.graphics().setDepth(DEPTH.banner).setVisible(false);
    this.toast = addText(this, 0, 0, '', { size: 17, weight: '700', color: CSS.white }).setDepth(DEPTH.banner + 1).setVisible(false);
    this.start = new LobbyStartButton(this, { label: this.ctaLabel(), onClick: () => this.primaryAction() });
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

    const gearSize = r.sizes.gear;
    this.hud.layoutLobby(f, r.hud, gearSize);
    this.settings.layout(r.hud.x + r.hud.w - gearSize / 2, r.hud.y + r.hud.h / 2, f, gearSize);

    const sideScale = r.compact ? 1.16 : 1.40;
    const sideSize = Math.round(clamp(r.sizes.feature * sideScale, r.sizes.feature, 112));
    const sideDrop = r.compact
      ? Math.round(clamp(f.h * 0.024, 14, 18))
      : Math.round(clamp(f.h * 0.045, 34, 40));
    const sideNudge = r.compact ? 0 : Math.round((sideSize - r.sizes.feature) * 0.35);
    const leftMenu = {
      ...r.leftFeatures,
      x: r.leftFeatures.x + (r.compact ? 3 : 9),
      y: r.leftFeatures.y + sideDrop,
    };
    layoutSideMenu(this.features.slice(0, 2), leftMenu, f, sideSize);
    const rightSize = sideSize;
    const rightMenu = {
      ...r.rightFeatures,
      x: r.rightFeatures.x - Math.max(0, sideNudge - 3),
      y: r.rightFeatures.y - rightSize * 0.62 + sideDrop,
      h: Math.min(r.rightFeatures.h, rightSize * 3.22),
    };
    layoutSideMenu(this.features.slice(2), rightMenu, f, rightSize);

    const charH = Math.round(clamp(Math.min(r.character.h * 0.70, f.colW * 0.52), r.compact ? 162 : 192, 250));
    const charX = f.cx;
    const charBottom = r.table.y + 3;
    this.streamer.layout({ x: charX, bottom: charBottom, height: charH });
    this.referenceHeroine.setScale(charH / this.referenceHeroine.height).setPosition(charX, charBottom);
    const mascotW = Math.round(r.compact ? clamp(f.colW * 0.18, 70, 86) : clamp(f.colW * 0.23, 86, 108));
    const mascotX = f.cx + f.colW * (r.compact ? 0.17 : 0.22);
    this.mascot.setScale(mascotW / this.mascot.width);
    const mascotTop = r.table.y + (r.compact ? -18 : 4);
    this.mascot.setPosition(mascotX, mascotTop + this.mascot.displayHeight);
    const bubbleW = Math.round(clamp(f.colW * 0.225, 84, 116));
    this.bubble.setScale(bubbleW / this.bubble.width).setPosition(f.cx + f.colW * 0.075, r.table.y - charH * 1.30);
    this.bubbleDish.setScale((bubbleW * 0.52) / Math.max(this.bubbleDish.width, this.bubbleDish.height)).setPosition(this.bubble.x + 3, this.bubble.y - 3);

    const placematW = Math.round(clamp(f.colW * 0.66, 238, 330));
    const plateW = Math.round(clamp(f.colW * 0.38, 136, 205));
    const propsY = r.table.y + r.table.h * 0.56;
    this.placemat.setScale(placematW / this.placemat.width).setPosition(f.cx, propsY);
    this.plate.setScale(plateW / this.plate.width).setPosition(f.cx, propsY);
    const propW = Math.round(clamp(f.colW * 0.15, 54, 84));
    this.spoon.setScale(propW / this.spoon.width).setPosition(f.cx - f.colW * 0.34, propsY - plateW * 0.35);
    this.phone.setScale((propW * 0.84) / this.phone.width).setPosition(f.cx - f.colW * 0.34, propsY + plateW * 0.37);
    this.mitts.setScale((propW * 1.24) / this.mitts.width).setPosition(f.cx + f.colW * 0.36, propsY + plateW * 0.36);
    this.cutleryTray.setScale((propW * 1.65) / this.cutleryTray.width).setPosition(f.right - propW * 0.91, propsY - plateW * 0.47);

    const navSize = r.sizes.navItem;
    const navY = r.nav.y + r.nav.h * (r.compact ? 0.54 : 0.60);
    this.market.layout(f.colLeft + navSize * 0.58, navY, f, navSize);
    this.decor.layout(f.colRight - navSize * 0.58, navY, f, navSize);
    this.start.layout({ x: f.cx, y: navY, frame: f });
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
      character: bounds(this.referenceDefault ? this.referenceHeroine : this.streamer.image),
      mascot: bounds(this.mascot),
      'thought-bubble': bounds(this.bubble),
      'table-placemat': bounds(this.placemat),
      'table-plate': bounds(this.plate),
      'table-spoon': bounds(this.spoon),
      'table-phone': bounds(this.phone),
      'table-mitts': bounds(this.mitts),
      'table-cutlery': bounds(this.cutleryTray),
      'nav-market': this.market.rect,
      'nav-start': { x: this.start.box.x - this.start.box.width / 2, y: this.start.box.y - this.start.box.height / 2, w: this.start.box.width, h: this.start.box.height },
      'nav-decor': this.decor.rect,
    };
  }

  drawBackdrop(f, r) {
    const equipped = this.saveState.appearance.equipped;
    const background = APPEARANCE_ITEM_BY_ID[equipped.background];
    const tablecloth = APPEARANCE_ITEM_BY_ID[equipped.tablecloth];
    this.wall.setTexture(this.referenceDefault ? 'lobby-wallpaper' : background.texture);
    this.wall.setPosition(0, 0).setSize(f.W, f.H);
    this.wall.setTileScale(this.referenceDefault ? 0.5 : Math.max(0.38, f.colW / 1024));

    this.table.setTexture(this.referenceDefault ? 'lobby-tablecloth' : tablecloth.texture).setPosition(0, r.table.y).setSize(f.W, r.nav.y - r.table.y);
    const tileScale = Math.max(0.36, f.colW / 980);
    this.table.setTileScale(tileScale, tileScale);

    this.tableDetails.clear();
    this.tableDetails.fillStyle(0xffffff, 0.82).fillRect(0, r.table.y, f.W, 4);
    this.tableDetails.fillStyle(0xa65c7c, 0.2).fillRect(0, r.table.y + 4, f.W, 5);
    const navColor = tablecloth?.uiTheme?.shelf ?? 0xe6b5ed;
    // The navigation shelf belongs to the selected tablecloth theme and must cover
    // the full bottom edge; leaving the old reveal exposed wallpaper under the UI.
    this.tableDetails.fillStyle(navColor, 1).fillRoundedRect(-20, r.nav.y - 6, f.W + 40, f.bottom - r.nav.y + 32, 28);
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
    return {
      scene: 'Home',
      phase: this.isLocked() ? 'locked' : 'home',
      levelId: this.level.id,
      targets: {
        start: this.start.center(),
        settings: this.settings.center(),
        partTime: this.features[0].center(),
        canteen: this.features[1].center(),
        store: this.features[2].center(),
        skin: this.features[3].center(),
        daily: this.features[4].center(),
        market: this.market.center(),
        decor: this.decor.center(),
      },
      save: this.services().save.snapshot(),
    };
  }
}
