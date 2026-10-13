import { BaseScene } from './BaseScene.js';
import { CAMPAIGN_ORDER, LEVELS } from '../content/levels.js';
import { APPEARANCE_ITEM_BY_ID, DEFAULT_EQUIPPED_APPEARANCE } from '../content/appearance.js';
import { DEPTH, LOBBY_DEPTH, clamp, computeLobbyRegions } from '../ui/layout.js';
import { Hud } from '../ui/hud.js';
import { HintHand, Streamer } from '../ui/actors.js';
import { CANVAS } from '../content/characterRig.js';
import { addText } from '../ui/text.js';
import { roundedBox } from '../ui/draw.js';
import { CSS } from '../content/theme.js';
import { PlaytimeRewardsPanel } from '../ui/playtimeRewards.js';
import { SettingsPanel } from '../ui/settingsPanel.js';
import { GameDialog } from '../ui/gameDialog.js';
import { flyCoins } from '../ui/donations.js';
import { FREE_COINS_AD } from '../content/economy.js';
import { createRunId } from '../core/createRunId.js';
import { pressable, twinkle } from '../ui/pressFeedback.js';

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
    // Lobby buttons act on touch-down; hover lift, squash/bounce and sparkles are shared.
    // Settings plays its own tap sound.
    pressable(this.zone, { target: this.root, trigger: 'down', sound: style === 'gear' ? null : 'tap' });
    this.zone.on('pointerdown', () => onTap());
  }
  layout(x, y, frame, size = 70) {
    const d = Math.round(size);
    this.root.setPosition(Math.round(x), Math.round(y)).setScale(1);
    this.bg.clear();
    if (this.style === 'nav') {
      // Wide reference tiles (LobbyBottomButtons.png): size is the tile width.
      this.icon.setScale(d / this.icon.width).setPosition(0, 0);
      const h = this.icon.displayHeight;
      this.zone.setPosition(x, y).setSize(Math.max(48, d + 4), Math.max(48, h + 4));
      this.rect = { x: x - d / 2, y: y - h / 2, w: d, h };
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
    pressable(this.zone, { target: this.root, trigger: 'down', enabled: () => this.enabled });
    this.zone.on('pointerdown', () => { if (this.enabled) onClick(); });
    // Shiny call-to-action: a light sweep runs across the button art (WebGL shader clipped to
    // the art's own shape; one sweep about every 3.3 s) and small stars twinkle at its corners.
    this.shine = this.image.preFX?.addShine(0.6, 0.22, 3.5) ?? null;
    this.twinkles = scene.time.addEvent({ delay: 1700, loop: true, callback: () => this.twinkle() });
    this.twinkleIndex = 0;
  }

  twinkle() {
    if (!this.enabled || !this.box || !this.root.visible) return;
    const { x, y, width, height } = this.box;
    const spots = [[-0.4, -0.32], [0.42, 0.18], [0.3, -0.36], [-0.36, 0.22]];
    const [dx, dy] = spots[this.twinkleIndex % spots.length];
    this.twinkleIndex += 1;
    twinkle(this.scene, x + dx * width, y + dy * height, { size: clamp(height / 70, 0.7, 1.1), depth: LOBBY_DEPTH.features + 2 });
  }

  static widthFor(frame) { return Math.round(clamp(frame.colW * 0.42, 164, 210)); }

  layout({ x, y, frame }) {
    const width = LobbyStartButton.widthFor(frame);
    const scale = width / this.image.width;
    this.root.setPosition(Math.round(x), Math.round(y)).setScale(1);
    this.image.setScale(scale);
    this.text.setFontSize(Math.round(clamp(width * 0.18, 28, 38))).setPosition(0, -1);
    // Longer labels ("Go Live") shrink to stay inside the button art.
    while (this.text.width > width * 0.74 && parseInt(this.text.style.fontSize, 10) > 18) {
      this.text.setFontSize(parseInt(this.text.style.fontSize, 10) - 1);
    }
    this.zone.setPosition(x, y).setSize(width, this.image.displayHeight + 8);
    this.zone.input.hitArea.setSize(this.zone.width, this.zone.height);
    this.box = { x, y, width, height: this.image.displayHeight };
  }

  setLabel(label) { this.text.setText(label); }
  setEnabled(value) {
    this.enabled = value;
    this.root.setAlpha(value ? 1 : 0.58);
    if (this.shine) this.shine.active = value;
  }
  center() { return { x: this.zone.x, y: this.zone.y }; }
}

function hasReferenceDefault(equipped) {
  return Object.entries(DEFAULT_EQUIPPED_APPEARANCE).every(([key, value]) => equipped[key] === value);
}

// Both side menus use the same three-row rhythm from the reference; each column holds three
// buttons (left: Part-Time, Canteen, Levels; right: Store, Skin, Playtime). No button owns an arbitrary Y offset.
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
    this.hud = new Hud(this, { level: this.saveState.highestLevel, coins: this.saveState.coins, appearance: this.saveState.appearance.equipped });
    this.hud.enablePlus(() => this.openFreeCoins());
    this.streamer = new Streamer(this, this.saveState.appearance.equipped); this.streamer.image.setDepth(LOBBY_DEPTH.character); this.streamer.idle();
    this.mascot = this.add.image(0, 0, 'sprout-mascot').setOrigin(0.5, 1).setDepth(LOBBY_DEPTH.tableObjects + 2);
    this.placemat = this.add.image(0, 0, 'lobby-placemat').setDepth(LOBBY_DEPTH.tableObjects);
    this.plate = this.add.image(0, 0, 'lobby-plate').setDepth(LOBBY_DEPTH.tableObjects);
    this.spoon = this.add.image(0, 0, 'lobby-spoon').setDepth(LOBBY_DEPTH.tableObjects);
    this.phone = this.add.image(0, 0, 'phone').setDepth(LOBBY_DEPTH.tableObjects);
    this.mitts = this.add.image(0, 0, 'mitts').setDepth(LOBBY_DEPTH.tableObjects);
    this.cutleryTray = this.add.image(0, 0, 'lobby-cutlery-tray').setDepth(LOBBY_DEPTH.tableObjects);
    this.dish = this.add.image(0, 0, this.level.finalTexture).setDepth(LOBBY_DEPTH.tableObjects + 1).setVisible(false);
    this.bubble = this.add.image(0, 0, 'thought-bubble').setDepth(LOBBY_DEPTH.accessories);
    this.bubbleDish = this.add.image(0, 0, this.level.finalTexture).setDepth(LOBBY_DEPTH.accessories + 1);
    this.levelLabel = addText(this, 0, 0, '', { size: 22, weight: '700', color: CSS.white, stroke: '#d95f7d', strokeWidth: 5 }).setDepth(LOBBY_DEPTH.features).setVisible(false);
    this.features = [
      new FeatureButton(this, 'part-time', 'PART-TIME\nJOB', () => this.fadeTo('PartTime')),
      new FeatureButton(this, 'canteen', 'CANTEEN', () => this.fadeTo('Canteen')),
      new FeatureButton(this, 'store', 'STORE', () => this.fadeTo('Store')),
      new FeatureButton(this, 'skin', 'SKIN', () => this.fadeTo('Customization')),
      new FeatureButton(this, 'daily', 'PLAYTIME\nREWARD', () => this.openPlaytime()),
    ];
    // Level select: third button of the left column.
    this.levelsButton = new FeatureButton(this, 'levels', 'LEVELS', () => this.fadeTo('Levels'));
    // NEW badge on Playtime Reward while something can be claimed.
    this.playtimeBadge = this.add.image(0, 0, 'new-badge').setDepth(LOBBY_DEPTH.features + 2).setVisible(false);
    this.unsubscribePlaytime = this.services().playtime.subscribe((status) => this.onPlaytime(status));
    this.events.once('shutdown', () => this.unsubscribePlaytime());
    this.settings = new FeatureButton(this, 'settings', '', () => this.openSettings(), 'gear');
    this.market = new FeatureButton(this, 'supermarket', 'SUPER\nMARKET', () => this.fadeTo('Store'), 'nav');
    // DECOR is a second entrance to the same wardrobe as SKIN.
    this.decor = new FeatureButton(this, 'decor', 'DECOR', () => this.fadeTo('Customization'), 'nav');
    this.toastBg = this.add.graphics().setDepth(DEPTH.banner).setVisible(false);
    this.toast = addText(this, 0, 0, '', { size: 17, weight: '700', color: CSS.white }).setDepth(DEPTH.banner + 1).setVisible(false);
    this.start = new LobbyStartButton(this, { label: 'Go Live', onClick: () => this.primaryAction() });
    this.hint = new HintHand(this);
    this.settingsPanel = new SettingsPanel(this, { onClose: () => {} });
    this.events.once('shutdown', () => { this.settingsPanel?.destroy(); this.freeCoins?.destroy(); });
    this.bindViewport();
    this.cameras.main.fadeIn(260, 255, 240, 245);
    this.services().platform.gameReady();
  }

  selectSuggestedLevel() {
    const number = Math.min(CAMPAIGN_ORDER.length, Math.max(1, this.saveState.availableLevel));
    this.level = LEVELS[CAMPAIGN_ORDER[number - 1]];
  }

  layout(f) {
    const base = computeLobbyRegions(f);
    // Lobby composition (designer pass 2026-10-12): the Start row hugs the bottom edge and only a
    // compact tabletop strip — about 2.5× shorter than the old one — separates it from the table
    // edge. The freed height goes to the heroine. The side columns keep their own region.
    const startW = LobbyStartButton.widthFor(f);
    const startH = startW * (this.start.image.height / this.start.image.width);
    const navY = Math.round(f.bottom - clamp(f.h * 0.026, 12, 28) - startH / 2);
    const tabletop = Math.round(clamp(f.h * 0.13, base.wideLandscape ? 52 : 84, 170));
    const tableTop = Math.round(navY - startH / 2 - tabletop);
    const r = { ...base, table: { ...base.table, y: tableTop, h: tabletop } };
    this.lobbyRegions = r;
    this.drawBackdrop(f, r);

    const gearSize = r.sizes.gear;
    this.hud.layoutLobby(f, r.hud, gearSize);
    this.settings.layout(r.hud.x + r.hud.w - gearSize / 2, r.hud.y + r.hud.h / 2, f, gearSize);

    const sideScale = r.wideLandscape ? 1 : (r.compact ? 1.16 : 1.40);
    const sideSize = Math.round(clamp(r.sizes.feature * sideScale, r.sizes.feature, r.spread && !r.wideLandscape ? 128 : 112));
    const sideDrop = r.wideLandscape
      ? 0
      : r.compact
        ? Math.round(clamp(f.h * 0.024, 14, 18))
        : Math.round(clamp(f.h * 0.045, 34, 40));
    const sideNudge = r.compact ? 0 : Math.round((sideSize - r.sizes.feature) * 0.35);
    const rightSize = sideSize;
    // The left column mirrors the right one now that both hold three buttons, but never rises
    // into the player profile (wider than the settings gear above the right column).
    const leftTop = r.wideLandscape ? r.leftFeatures.y : Math.max(r.leftFeatures.y - rightSize * 0.62 + sideDrop, r.hud.y + r.hud.h + 8);
    const leftBottom = r.wideLandscape ? r.leftFeatures.y + r.leftFeatures.h : r.leftFeatures.y - rightSize * 0.62 + sideDrop + Math.min(r.leftFeatures.h, rightSize * 3.22);
    const leftMenu = {
      ...r.leftFeatures,
      x: r.leftFeatures.x + (r.compact ? 3 : 9),
      y: leftTop,
      h: Math.max(rightSize * 3.24, leftBottom - leftTop),
    };
    layoutSideMenu([this.features[0], this.features[1], this.levelsButton], leftMenu, f, sideSize);
    const rightMenu = {
      ...r.rightFeatures,
      x: r.rightFeatures.x - Math.max(0, sideNudge - 3),
      y: r.wideLandscape ? r.rightFeatures.y : r.rightFeatures.y - rightSize * 0.62 + sideDrop,
      h: r.wideLandscape ? r.rightFeatures.h : Math.min(r.rightFeatures.h, rightSize * 3.22),
    };
    layoutSideMenu(this.features.slice(2), rightMenu, f, rightSize);
    const daily = this.features[4].rect;
    const badgeD = Math.round(clamp(rightSize * 0.42, 30, 46));
    this.playtimeBadge.setScale(badgeD / this.playtimeBadge.width).setPosition(daily.x + daily.w - badgeD * 0.3, daily.y + badgeD * 0.35);
    this.playtimeBadge.setVisible(this.services().playtime.status().claimable > 0);
    this.playtimePanel?.layout(f);
    this.settingsPanel?.layout(f);
    this.freeCoins?.layout(f);

    // Heroine: the largest size whose visible silhouette clears both side columns. Her head band
    // (top 30 % of the rig canvas, ~74 % of its width) may sit between the columns; the wider
    // shoulders (~82 %) must then be below them. The canvas top stays under the HUD and leaves
    // room for the thought cloud; a height cap keeps the plate and table readable on tall screens.
    const left = [this.features[0], this.features[1], this.levelsButton].map((b) => b.rect);
    const right = this.features.slice(2).map((b) => b.rect);
    const columnsBottom = Math.max(...[...left, ...right].map((rc) => rc.y + rc.h));
    const halfGap = Math.min(f.cx - Math.max(...left.map((rc) => rc.x + rc.w)), Math.min(...right.map((rc) => rc.x)) - f.cx) - 6;
    const hudBottom = r.hud.y + r.hud.h;
    const bubbleW = Math.round(r.wideLandscape ? 54 : clamp(f.colW * 0.16, 62, 84));
    // The table edge cuts the body at the pocket, as in the Lobby reference.
    const canvasTop = (h) => tableTop + h * 0.1 - h;
    const fits = (h) => {
      const top = canvasTop(h);
      const w = h / CANVAS.height;
      if (top < columnsBottom && w * ((columnsBottom - top) / h <= 0.3 ? 0.74 : 0.82) / 2 > halfGap) return false;
      if (r.wideLandscape) return top >= hudBottom + 4;
      return top - h * 0.22 - bubbleW * 0.5 >= hudBottom + 6;
    };
    const charMin = r.wideLandscape ? 96 : 150;
    let charH = Math.round(Math.max(charMin, f.h * (r.wideLandscape ? 0.62 : 0.46)));
    while (charH > charMin && !fits(charH)) charH -= 2;
    const charW = charH / CANVAS.height;
    this.streamer.layout({ x: f.cx, bottom: tableTop + charH * 0.1, height: charH });
    this.characterSilhouette = {
      head: { x: f.cx - charW * 0.37, y: canvasTop(charH), w: charW * 0.74, h: charH * 0.3 },
      body: { x: f.cx - charW * 0.41, y: canvasTop(charH) + charH * 0.3, w: charW * 0.82, h: charH * 0.6 },
    };
    // The sprout sits in its basket on the table edge beside her right shoulder (reference).
    const mascotW = Math.round(r.wideLandscape ? clamp(tabletop * 1.15, 54, 70) : clamp(charW * 0.5, 72, 132));
    this.mascot.setScale(mascotW / this.mascot.width);
    const mascotX = Math.min(f.cx + charW * 0.41 + mascotW * 0.18, f.colRight - mascotW * 0.55);
    this.mascot.setPosition(mascotX, tableTop + tabletop * 0.16);
    // Small thought cloud: the dish of the level that Start leads to (campaign order).
    this.bubble.setScale(bubbleW / this.bubble.width).setPosition(f.cx + f.colW * 0.075, canvasTop(charH) - charH * 0.22);
    if (r.wideLandscape) {
      this.bubble.setPosition(
        f.cx + charH * 0.62,
        Math.max(hudBottom + bubbleW * 0.6, canvasTop(charH) + charH * 0.2),
      );
    }
    this.bubbleDish.setScale((bubbleW * 0.56) / Math.max(this.bubbleDish.width, this.bubbleDish.height)).setPosition(this.bubble.x + bubbleW * 0.03, this.bubble.y - bubbleW * 0.04);

    // Table props in one compact row below the basket: cutlery tray + phone | placemat with
    // plate | spoon + mitts. Both sides carry a similar width so the props stay as large as fits.
    const propsY = tableTop + tabletop * 0.6;
    const placematH = tabletop * 0.84;
    const placematW = Math.round(placematH * (this.placemat.width / this.placemat.height));
    const plateW = Math.round(placematW * 0.6);
    this.placemat.setScale(placematW / this.placemat.width).setPosition(f.cx, propsY);
    this.plate.setScale(plateW / this.plate.width).setPosition(f.cx, propsY);
    const rowW = r.spread ? Math.min(f.w - f.margin * 2, f.colW * 1.5) : f.colW - 8;
    const gap = Math.round(clamp(tabletop * 0.1, 6, 16));
    const propW = Math.round(Math.min(tabletop * 0.58, ((rowW - placematW) / 2 - gap * 3) / 2.2));
    const phoneW = propW * 0.84;
    const mittsW = propW * 1.1;
    const trayW = propW * 1.35;
    const phoneX = f.cx - placematW / 2 - gap - phoneW / 2;
    const spoonX = f.cx + placematW / 2 + gap + propW / 2;
    this.phone.setScale(phoneW / this.phone.width).setPosition(phoneX, propsY + tabletop * 0.06);
    this.cutleryTray.setScale(trayW / this.cutleryTray.width).setPosition(phoneX - phoneW / 2 - gap - trayW / 2, propsY - tabletop * 0.04);
    this.spoon.setScale(propW / this.spoon.width).setPosition(spoonX, propsY - tabletop * 0.04);
    this.mitts.setScale(mittsW / this.mitts.width).setPosition(spoonX + propW / 2 + gap + mittsW / 2, propsY + tabletop * 0.06);

    // As in the reference: Start in the middle, the two tiles fill the space beside it,
    // no taller than the Start pill.
    const tileRatio = this.market.icon.width / this.market.icon.height;
    const navInset = 6;
    const slotW = Math.min((f.colW - startW) / 2 - navInset - 6, startH * 0.95 * tileRatio);
    // Designer follow-up: slightly smaller than the 1.5× pass, while still clearly
    // larger than the original half-slot tiles and centred clear of Start/the edges.
    const navW = Math.round(slotW * 0.68);
    if (r.spread) {
      // Wide screens: the tiles move out under the left/right button columns.
      const sideNavW = Math.round(clamp(Math.min(r.leftFeatures.w, startH * 0.95 * tileRatio) * 0.86, navW, 150));
      this.market.layout(r.leftFeatures.x + r.leftFeatures.w / 2, navY, f, sideNavW);
      this.decor.layout(r.rightFeatures.x + r.rightFeatures.w / 2, navY, f, sideNavW);
    } else {
      this.market.layout(f.colLeft + navInset + slotW / 2, navY, f, navW);
      this.decor.layout(f.colRight - navInset - slotW / 2, navY, f, navW);
    }
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
      'feature-levels': this.levelsButton.rect,
      table: { x: r.table.x, y: r.table.y, w: r.table.w, h: f.bottom - r.table.y },
      character: bounds(this.streamer.image),
      'character-head': this.characterSilhouette.head,
      'character-body': this.characterSilhouette.body,
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

    // The tablecloth runs to the bottom edge: the Start/Super Market/Decor row sits on
    // the cloth itself, with no separate single-colour shelf.
    this.table.setTexture(this.referenceDefault ? 'lobby-tablecloth' : tablecloth.texture).setPosition(0, r.table.y).setSize(f.W, f.H - r.table.y);
    const tileScale = Math.max(0.36, f.colW / 980);
    this.table.setTileScale(tileScale, tileScale);

    this.tableDetails.clear();
    this.tableDetails.fillStyle(0xffffff, 0.82).fillRect(0, r.table.y, f.W, 4);
    this.tableDetails.fillStyle(0xa65c7c, 0.2).fillRect(0, r.table.y + 4, f.W, 5);
  }

  onPlaytime(status) {
    this.playtimeBadge?.setVisible(status.claimable > 0);
    this.playtimePanel?.update(status);
  }

  openPlaytime() {
    if (this.playtimePanel || this.leaving) return;
    const playtime = this.services().playtime;
    this.hint.hide();
    this.playtimePanel = new PlaytimeRewardsPanel(this, {
      status: playtime.status(),
      onClaim: (id) => this.claimPlaytime(id),
      onTakeAll: () => this.takeAllPlaytime(),
      onClose: () => this.closePlaytime(),
    });
    this.playtimePanel.layout(this.frame);
    // Live countdowns on locked tiles.
    this.playtimeTimer = this.time.addEvent({ delay: 500, loop: true, callback: () => this.playtimePanel?.update(playtime.status()) });
  }

  openSettings() {
    if (this.leaving || this.settingsPanel.open) return;
    this.hint.hide();
    this.services().audio.playSfx('tap');
    this.settingsPanel.show(this.frame);
  }

  // Free coins: optional rewarded ad from the "+" next to the wallet. The amount is shown first;
  // RewardService pays it only after an earned ad (one receipt per opening of this popup).
  openFreeCoins() {
    if (this.freeCoins || this.leaving || this.settingsPanel.open || this.playtimePanel) return;
    this.hint.hide();
    this.services().audio.playSfx('tap');
    this.freeCoinsClaimId = createRunId('free-coins');
    this.freeCoins = new GameDialog(this, {
      title: 'Free Coins',
      body: 'Watch a short video\nto get free coins!',
      coins: FREE_COINS_AD.coins,
      note: 'The video is optional.',
      primary: { label: 'Watch', onTap: () => this.watchFreeCoins() },
      primaryIcon: 'reward-play',
      onClose: () => this.closeFreeCoins(),
      depth: LOBBY_DEPTH.popup,
    });
    this.freeCoins.layout(this.frame);
  }

  closeFreeCoins() {
    if (this.freeCoinsBusy || !this.freeCoins) return;
    this.services().audio.playSfx('close');
    this.freeCoins.destroy();
    this.freeCoins = null;
  }

  async watchFreeCoins() {
    if (this.freeCoinsBusy || !this.freeCoins) return;
    this.freeCoinsBusy = true;
    this.freeCoins.setEnabled(false);
    this.freeCoins.setNote('Playing the video…');
    let result = null;
    try {
      result = await this.services().rewards.claimFreeCoinsWithAd({ claimId: this.freeCoinsClaimId });
      this.lastFreeCoins = result.status;
    } catch (error) {
      console.error(error);
      this.lastFreeCoins = 'save-error';
    }
    this.freeCoinsBusy = false;
    if (!this.freeCoins) return;
    if (result?.applied) {
      // Already saved: the popup closes and the coins fly into the wallet, which counts up.
      const from = this.freeCoins.coinRow;
      const finalCoins = result.state.coins;
      const start = finalCoins - result.coins;
      this.saveState = result.state;
      this.freeCoins.destroy();
      this.freeCoins = null;
      let shown = 0;
      this.hud.setCoins(start);
      flyCoins(this, {
        from,
        to: this.hud.coinPosition(),
        amount: result.coins,
        coinSize: Math.round(clamp(30 * this.frame.ui, 28, 40)),
        onCoin: (share) => { shown += share; this.hud.setCoins(start + shown); this.hud.bumpCoins(); this.services().audio.playSfx('coin'); },
        onDone: () => this.hud.setCoins(finalCoins),
      });
      return;
    }
    this.freeCoins.setEnabled(true);
    this.freeCoins.setNote({
      'not-earned': 'Video closed early — no coins this time.',
      unavailable: 'No video available right now.',
      busy: 'Another video is still playing.',
      'already-claimed': 'These coins were already added.',
      'save-error': 'Could not save. Please try again.',
    }[this.lastFreeCoins] ?? 'The video did not finish. Try again.', '#c4503a');
  }

  closePlaytime() {
    if (this.playtimeBusy) return;
    this.playtimeTimer?.remove();
    this.playtimePanel?.destroy();
    this.playtimePanel = null;
  }

  afterPlaytimeGrant(result) {
    this.saveState = result.state;
    this.hud.setCoins(result.state.coins);
    this.hud.bumpCoins();
    this.playtimePanel?.update(this.services().playtime.status());
  }

  async claimPlaytime(id) {
    if (this.playtimeBusy) return;
    this.playtimeBusy = true;
    try {
      const result = await this.services().playtime.claim(id);
      if (result.applied) this.afterPlaytimeGrant(result);
      else if (result.status === 'locked') this.playtimePanel?.showNotice(`Keep playing — unlocks in ${Math.ceil(result.msLeft / 1000)} s.`);
    } catch (error) {
      console.error(error);
      this.playtimePanel?.showNotice('Could not save. Please try again.');
    } finally {
      this.playtimeBusy = false;
    }
  }

  async takeAllPlaytime() {
    if (this.playtimeBusy || !this.playtimePanel) return;
    this.playtimeBusy = true;
    this.playtimePanel.setEnabled(false);
    try {
      const result = await this.services().playtime.takeAllWithAd();
      this.lastPlaytimeAd = result.status;
      if (result.applied) this.afterPlaytimeGrant(result);
      else if (result.status !== 'nothing-left') {
        this.playtimePanel?.showNotice({
          'not-earned': 'Ad closed early — nothing taken.',
          unavailable: 'No ad available right now.',
        }[result.status] ?? 'The ad did not finish. Try again.');
      }
    } catch (error) {
      console.error(error);
      this.playtimePanel?.showNotice('Could not save. Please try again.');
    } finally {
      this.playtimeBusy = false;
      this.playtimePanel?.setEnabled(true);
    }
  }

  soon(label) {
    if (!this.frame) return;
    this.toast.setText(`${label} · Soon`).setVisible(true).setPosition(this.frame.cx, this.frame.top + this.frame.h * 0.47);
    const w = this.toast.width + 34; const h = 42;
    this.toastBg.clear(); roundedBox(this.toastBg, this.toast.x - w / 2, this.toast.y - h / 2, w, h, { fill: 0x6a3f57, alpha: 0.88 }); this.toastBg.setVisible(true);
    this.tweens.killTweensOf([this.toast, this.toastBg]);
    this.tweens.add({ targets: [this.toast, this.toastBg], alpha: 0, delay: 900, duration: 250, onComplete: () => { this.toast.setVisible(false).setAlpha(1); this.toastBg.setVisible(false).setAlpha(1); } });
  }

  // Levels open for free when the previous one is completed: Start always plays.
  primaryAction() {
    if (this.leaving || this.busy) return;
    this.hint.hide();
    this.fadeTo('Level', { levelId: this.level.id });
  }

  getDebugSnapshot() {
    return {
      scene: 'Home',
      phase: this.settingsPanel.open ? 'settings' : (this.freeCoins ? 'free-coins' : 'home'),
      levelId: this.level.id,
      bubbleDish: this.bubbleDish.texture.key,
      targets: {
        start: this.start.center(),
        settings: this.settings.center(),
        partTime: this.features[0].center(),
        canteen: this.features[1].center(),
        store: this.features[2].center(),
        skin: this.features[3].center(),
        daily: this.features[4].center(),
        levels: this.levelsButton.center(),
        market: this.market.center(),
        decor: this.decor.center(),
        ...(this.settingsPanel.open ? this.settingsPanel.targets() : {}),
        ...(this.playtimePanel ? this.playtimePanel.targets() : {}),
        ...(this.hud.plusCenter() ? { plus: this.hud.plusCenter() } : {}),
        ...(this.freeCoins ? this.freeCoins.targets() : {}),
      },
      freeCoins: {
        open: Boolean(this.freeCoins),
        busy: Boolean(this.freeCoinsBusy),
        reward: FREE_COINS_AD.coins,
        lastStatus: this.lastFreeCoins ?? null,
        note: this.freeCoins?.note?.text ?? null,
        hudCoins: Number(this.hud.coinText.text),
        rects: this.freeCoins ? this.freeCoins.rects() : null,
      },
      playtime: { ...this.services().playtime.status(), open: Boolean(this.playtimePanel), busy: Boolean(this.playtimeBusy), lastAd: this.lastPlaytimeAd ?? null, badge: this.playtimeBadge.visible, hudCoins: Number(this.hud.coinText.text), rects: this.playtimePanel?.rects() ?? null },
      audio: this.services().audio.snapshot(),
      settings: { open: this.settingsPanel.open, rect: this.settingsPanel.rect ?? null },
      save: this.services().save.snapshot(),
    };
  }
}
