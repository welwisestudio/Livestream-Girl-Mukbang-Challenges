import { BaseScene } from './BaseScene.js';
import {
  APPEARANCE_CATEGORIES,
  APPEARANCE_ITEM_BY_ID,
  appearanceHeadTexture,
  appearanceUnlockKind,
  isRewardedAppearanceItem,
  itemsForCategory,
} from '../content/appearance.js';
import { DEPTH, clamp, uiLeft, uiRight } from '../ui/layout.js';
import { UI_OUTLINE, roundedBox } from '../ui/draw.js';
import { addText } from '../ui/text.js';
import { PillButton } from '../ui/controls.js';
import { AppearanceCard, CategoryTab } from '../ui/customization.js';
import { Streamer, sparkle } from '../ui/actors.js';
import { Hud } from '../ui/hud.js';
import { appearanceTexture } from '../ui/appearanceTextures.js';
import { COLORS, CSS } from '../content/theme.js';

function cover(image, box) {
  const scale = Math.max(box.w / image.width, box.h / image.height);
  image.setScale(scale).setPosition(box.x + box.w / 2, box.y + box.h / 2);
}

function previewTexture(scene, item, draft) {
  if (item.category === 'hair') return appearanceHeadTexture({ ...draft, hair: item.id });
  if (item.category === 'skin') return appearanceHeadTexture({ ...draft, skin: item.id });
  // Outfits are shown on the current heroine head, without hats/glasses for a clean read.
  if (item.category === 'outfit') {
    return appearanceTexture(scene, 'character-happy', { ...draft, outfit: item.id, accessory: 'accessory-none', glasses: 'glasses-none' });
  }
  return item.texture;
}

export class CustomizationScene extends BaseScene {
  constructor() { super('Customization'); }

  create() {
    this.leaving = false;
    this.busy = false;
    this.savedAppearance = this.services().appearance.snapshot();
    this.draft = structuredClone(this.savedAppearance.equipped);
    this.categoryId = 'hair';

    this.wall = this.add.image(0, 0, 'custom-bg-hearts').setDepth(DEPTH.room);
    this.table = this.add.tileSprite(0, 0, 16, 16, 'custom-table-lavender').setOrigin(0).setDepth(DEPTH.counter);
    this.tableEdge = this.add.graphics().setDepth(DEPTH.counter + 1);
    this.catalogPanel = this.add.graphics().setDepth(DEPTH.actions - 3);
    this.shelf = this.add.graphics().setDepth(DEPTH.actions - 2);

    const save = this.services().save.snapshot();
    this.hud = new Hud(this, { level: save.highestLevel, coins: save.coins, appearance: this.draft });
    this.streamer = new Streamer(this, this.draft);
    this.streamer.image.setDepth(DEPTH.character);
    this.mascot = this.add.image(0, 0, 'sprout-mascot').setDepth(DEPTH.character + 1);
    this.plate = this.add.image(0, 0, 'lobby-plate').setDepth(DEPTH.table);

    this.categoryTabs = APPEARANCE_CATEGORIES.map((category) => new CategoryTab(this, category, (id) => this.selectCategory(id)));
    this.categoryTitle = addText(this, 0, 0, '', { size: 15, weight: '700', color: CSS.ink }).setDepth(DEPTH.actions);
    this.cards = [];
    this.action = new PillButton(this, { label: 'Apply', variant: 'green', onClick: () => this.primaryAction() });

    this.close = this.add.image(0, 0, 'custom-close').setDepth(DEPTH.hud + 2);
    this.closeZone = this.add.zone(0, 0, 56, 56).setDepth(DEPTH.hud + 3).setInteractive({ useHandCursor: true });
    this.closeZone.on('pointerup', () => this.back());

    this.toastBg = this.add.graphics().setDepth(DEPTH.banner);
    this.toast = addText(this, 0, 0, '', { size: 16, weight: '700', color: CSS.white }).setDepth(DEPTH.banner + 1).setVisible(false);

    this.rebuildCards();
    this.updateState();
    this.bindViewport();
    this.cameras.main.fadeIn(240, 255, 240, 245);
  }

  selectCategory(id) {
    if (this.busy || id === this.categoryId) return;
    this.categoryId = id;
    this.rebuildCards();
    this.updateState();
    this.layout(this.frame);
  }

  clearOtherPending(categoryId) {
    for (const category of APPEARANCE_CATEGORIES) {
      if (category.id === categoryId) continue;
      const selected = this.draft[category.id];
      if (!this.services().appearance.isOwned(selected)) this.draft[category.id] = this.savedAppearance.equipped[category.id];
    }
  }

  selectItem(itemId) {
    if (this.busy) return;
    const item = APPEARANCE_ITEM_BY_ID[itemId];
    if (!item || item.category !== this.categoryId) return;
    this.clearOtherPending(item.category);
    this.draft[item.category] = item.id;
    this.streamer.setAppearance(this.draft);
    this.hud.setAppearance?.(this.draft);
    this.updateEnvironment();
    this.updateState();
    if (this.frame) this.layout(this.frame);
    this.cards.find((card) => card.item.id === itemId)?.pop();
    sparkle(this, this.previewCenter.x, this.previewCenter.y, { count: 5, radius: 68, depth: DEPTH.actions - 5 });
  }

  rebuildCards() {
    for (const card of this.cards) card.destroy();
    this.cards = itemsForCategory(this.categoryId).map((item) => new AppearanceCard(this, item, (id) => this.selectItem(id)));
  }

  updateEnvironment() {
    const background = APPEARANCE_ITEM_BY_ID[this.draft.background];
    const tablecloth = APPEARANCE_ITEM_BY_ID[this.draft.tablecloth];
    if (background?.texture) this.wall.setTexture(background.texture);
    if (tablecloth?.texture) this.table.setTexture(tablecloth.texture);
    if (this.frame) this.layoutEnvironment(this.frame);
  }

  updateState() {
    const save = this.services().save.snapshot();
    this.hud.setCoins(save.coins);
    const category = APPEARANCE_CATEGORIES.find((entry) => entry.id === this.categoryId);
    this.categoryTitle.setText(category?.label ?? 'STYLE');
    const currentHead = appearanceHeadTexture(this.draft);
    for (const tab of this.categoryTabs) {
      // Hair follows the chosen style. Skin uses the same heroine with a different
      // (chewing) expression so the two category tabs never become duplicates.
      const icon = { hair: currentHead, skin: appearanceHeadTexture(this.draft, 'chewing') }[tab.category.id];
      tab.setIconTexture(icon ?? tab.category.iconTexture);
      tab.setSelected(tab.category.id === this.categoryId);
    }
    for (const card of this.cards) {
      card.setPreviewTexture(previewTexture(this, card.item, this.draft));
      card.setState({ selected: this.draft[this.categoryId] === card.item.id, owned: this.services().appearance.isOwned(card.item.id) });
    }
    const pendingId = Object.values(this.draft).find((id) => !this.services().appearance.isOwned(id));
    this.pendingItem = pendingId ? APPEARANCE_ITEM_BY_ID[pendingId] : null;
    this.pendingRewarded = Boolean(this.pendingItem && isRewardedAppearanceItem(this.pendingItem.id));
    this.actionMode = this.pendingItem ? (this.pendingRewarded ? 'watch' : 'buy') : 'apply';
    this.action.setLabel(this.pendingItem ? (this.pendingRewarded ? 'Watch to unlock' : `Buy · ${this.pendingItem.price}`) : 'Apply');
    this.action.setEnabled(!this.busy, { variant: this.pendingItem ? 'primary' : 'green' });
  }

  async primaryAction() {
    if (this.busy || this.leaving) return;
    this.busy = true;
    this.action.setEnabled(false);
    try {
      if (this.pendingItem) {
        if (this.pendingRewarded) {
          const result = await this.services().rewards.unlockAppearanceWithAd(this.pendingItem.id);
          this.lastUnlockStatus = result.status;
          if (!result.applied) {
            this.busy = false;
            this.showToast({
              'not-earned': 'Video closed — item stays locked.',
              unavailable: 'No video available right now.',
              error: 'The video failed. Please try again.',
              busy: 'Another video is still playing.',
              'already-unlocked': 'Item already unlocked.',
            }[result.status] ?? 'Item stays locked. Please try again.');
            this.updateState();
            this.layout(this.frame);
            return;
          }
        } else {
          await this.services().appearance.purchase(this.pendingItem.id);
          this.lastUnlockStatus = null;
        }
        this.savedAppearance = this.services().appearance.snapshot();
        this.showToast(`${this.pendingItem.label} unlocked!`);
        this.busy = false;
        this.updateState();
        this.layout(this.frame);
      } else {
        await this.services().appearance.equip(this.draft);
        this.busy = false;
        this.fadeTo('Home');
      }
    } catch (error) {
      this.busy = false;
      this.showToast(error.message);
      this.updateState();
    }
  }

  back() {
    if (this.busy || this.leaving) return;
    this.fadeTo('Home');
  }

  showToast(message) {
    if (!this.frame) return;
    this.toast.setText(message).setVisible(true).setAlpha(1).setPosition(this.frame.cx, this.tableTop + 26);
    const w = this.toast.width + 34;
    this.toastBg.clear();
    roundedBox(this.toastBg, this.toast.x - w / 2, this.toast.y - 20, w, 40, { fill: COLORS.ink, alpha: 0.9 });
    this.toastBg.setVisible(true).setAlpha(1);
    this.tweens.killTweensOf([this.toast, this.toastBg]);
    this.tweens.add({ targets: [this.toast, this.toastBg], alpha: 0, delay: 950, duration: 220, onComplete: () => { this.toast.setVisible(false).setAlpha(1); this.toastBg.setVisible(false).setAlpha(1); } });
  }

  layoutEnvironment(f) {
    const wallBottom = this.tableTop + 8;
    cover(this.wall, { x: 0, y: 0, w: f.W, h: wallBottom });
    // The cloth is the complete foreground surface. The wardrobe panel is drawn over it,
    // so wide screens never reveal a strip of wallpaper below the table.
    this.table.setPosition(0, this.tableTop).setSize(f.W, f.bottom - this.tableTop);
    const scale = Math.max(0.34, f.colW / 1024);
    this.table.setTileScale(scale, scale);
    this.tableEdge.clear();
    this.tableEdge.fillStyle(0xffffff, 0.72).fillRect(0, this.tableTop, f.W, 5);
    this.tableEdge.fillStyle(0xb56b82, 0.24).fillRect(0, this.tableTop + 5, f.W, 5);
  }

  layout(f) {
    const compact = f.h < 700;
    const landscape = f.w >= 700 && f.h < 600;
    const desktop = f.w >= 900 && f.h >= 620;
    const contentW = landscape
      ? Math.min(410, f.w * 0.48)
      : desktop
        ? Math.min(f.w - f.pad * 2, clamp(f.w * 0.52, 620, 760))
        : f.colW;
    const contentLeft = landscape ? f.right - contentW - 10 : f.cx - contentW / 2;
    const contentRight = contentLeft + contentW;
    const contentCx = contentLeft + contentW / 2;
    const colLeft = contentLeft + f.pad;
    const colRight = contentRight - f.pad;
    const colW = colRight - colLeft;
    const hudTop = f.top + 10;
    const hudH = Math.round(clamp(66 * f.ui, 62, 78));
    const closeSize = Math.round(clamp(hudH * 0.72, 48, 58));
    // Screen HUD: profile top-left and wallet top-right at the viewport edges on wide screens.
    const hudRegion = f.spread
      ? { x: f.edgeLeft, y: hudTop, w: f.edgeRight - f.edgeLeft, h: hudH }
      : { x: colLeft, y: hudTop, w: colW, h: hudH };
    this.hud.layoutLobby(f, hudRegion, 0);

    const actionY = f.bottom - Math.round(clamp(f.h * 0.025, 14, 22)) - 31;
    const cardH = Math.round(landscape ? 122 : (desktop ? clamp(f.h * 0.25, 164, 188) : clamp((compact ? 138 : 158) * f.ui, 132, 174)));
    const shelfH = Math.round(desktop ? clamp(f.h * 0.09, 58, 68) : clamp((compact ? 48 : 54) * f.ui, 46, 58));
    this.shelfTop = landscape ? hudTop + hudH + 12 : actionY - cardH - 148;
    const tabY = this.shelfTop + shelfH / 2;
    this.catalogTop = tabY + shelfH * 0.36;
    this.tableTop = Math.round(f.top + f.h * (desktop ? 0.40 : (compact ? 0.36 : 0.38)));
    const previewTop = hudTop + hudH + 4;
    const previewBottom = landscape
      ? this.tableTop + Math.round(clamp(f.h * 0.09, 32, 38))
      : this.tableTop + Math.round(clamp(f.h * 0.045, 26, 42));
    const previewX = landscape ? (f.left + contentLeft) / 2 : f.cx;
    this.previewCenter = { x: previewX, y: (previewTop + previewBottom) / 2 };

    this.layoutEnvironment(f);
    const charH = Math.round(landscape
      ? clamp(f.h * 0.44, 165, 178)
      : desktop
        ? clamp((previewBottom - previewTop) * 1.32, 285, 360)
        : clamp((previewBottom - previewTop) * 1.16, compact ? 170 : 205, 300));
    // Never taller than the space above the table (laptops: 1366×768, 1024×768).
    this.streamer.layout({ x: previewX, bottom: previewBottom, height: Math.min(charH, previewBottom - f.top - 6) });
    const mascotW = Math.round(clamp(contentW * 0.14, 50, desktop ? 92 : 78));
    this.mascot.setScale(mascotW / this.mascot.width).setPosition(
      landscape ? previewX + 105 : f.cx + contentW * 0.24,
      landscape ? this.tableTop + 8 : this.tableTop - mascotW * 0.28,
    );
    const plateW = Math.round(clamp(contentW * 0.32, 120, desktop ? 220 : 185));
    this.plate.setScale(plateW / this.plate.width).setPosition(
      previewX,
      landscape ? this.tableTop + (f.bottom - this.tableTop) * 0.58 : this.tableTop + (this.catalogTop - this.tableTop) * 0.52,
    );

    const tablecloth = APPEARANCE_ITEM_BY_ID[this.draft.tablecloth];
    const panelTheme = tablecloth?.uiTheme ?? { id: 'default', shelf: 0xffead0, panel: 0xfff8df, stroke: 0xe9ae7b };
    this.panelTheme = panelTheme;
    this.shelf.clear();
    const tabGap = Math.round(clamp(colW * 0.007, 2, 4));
    const tabW = (colW - closeSize - tabGap * this.categoryTabs.length) / this.categoryTabs.length;
    const tabH = tabW * 1.24;
    this.categoryTabs.forEach((tab, i) => tab.layout(colLeft + tabW / 2 + i * (tabW + tabGap), tabY, tabW, tabH));

    const closeX = colRight - closeSize / 2;
    const closeY = tabY;
    this.close.setScale(closeSize / Math.max(this.close.width, this.close.height)).setPosition(closeX, closeY);
    this.closeZone.setPosition(closeX, closeY).setSize(closeSize + 8, closeSize + 8);
    this.closeZone.input.hitArea.setSize(this.closeZone.width, this.closeZone.height);

    this.catalogPanel.clear();
    roundedBox(this.catalogPanel, contentLeft, this.catalogTop, contentW, f.bottom - this.catalogTop + 18, { fill: panelTheme.panel, stroke: panelTheme.stroke, strokeWidth: UI_OUTLINE, radius: 12 });
    this.categoryTitle.setVisible(false);

    const cardGap = Math.round(clamp(colW * 0.025, 8, 13));
    const cardW = Math.min(desktop ? 190 : 136, (colW - cardGap * (this.cards.length - 1)) / this.cards.length);
    const cardsTotal = cardW * this.cards.length + cardGap * (this.cards.length - 1);
    const cardY = this.catalogTop + 28 + cardH / 2;
    this.cards.forEach((card, i) => card.layout({ x: contentCx - cardsTotal / 2 + cardW / 2 + i * (cardW + cardGap), y: cardY, w: cardW, h: cardH }));
    this.action.layout({ x: contentCx, y: actionY, frame: f, minWidth: 200, maxWidth: 290, scale: compact ? 0.92 : 1 });

    const bounds = this.streamer.image.getBounds();
    this.layoutRects = {
      ...this.hud.rects,
      'custom-close': { x: closeX - closeSize / 2, y: closeY - closeSize / 2, w: closeSize, h: closeSize },
      'custom-preview': { x: bounds.x, y: bounds.y, w: bounds.width, h: bounds.height },
      'custom-table': { x: 0, y: this.tableTop, w: f.W, h: f.bottom - this.tableTop },
      ...Object.fromEntries(this.categoryTabs.map((tab) => [`category-${tab.category.id}`, tab.rect])),
      ...Object.fromEntries(this.cards.map((card) => [`item-${card.item.id}`, card.rect])),
      'custom-action': { x: this.action.box.x - this.action.box.width / 2, y: this.action.box.y - this.action.box.height / 2, w: this.action.box.width, h: this.action.box.height * 1.09 },
    };
  }

  getDebugSnapshot() {
    return {
      scene: 'Customization',
      phase: this.actionMode,
      categoryId: this.categoryId,
      draft: structuredClone(this.draft),
      equipped: this.services().appearance.snapshot().equipped,
      owned: this.services().appearance.snapshot().owned,
      coins: this.services().save.snapshot().coins,
      pendingItemId: this.pendingItem?.id ?? null,
      pendingUnlockKind: this.pendingItem ? appearanceUnlockKind(this.pendingItem.id) : null,
      lastUnlockStatus: this.lastUnlockStatus ?? null,
      draftOwnership: Object.fromEntries(Object.entries(this.draft).map(([category, id]) => [category, this.services().appearance.isOwned(id)])),
      cardStates: Object.fromEntries(this.cards.map((card) => [card.item.id, {
        owned: card.owned,
        unlockKind: appearanceUnlockKind(card.item.id),
        adRect: card.adRect,
      }])),
      actionLabel: this.action.text.text,
      previewTexture: this.streamer.image.texture.key,
      cardTextures: this.cards.map((card) => card.thumb?.texture?.key ?? null),
      tabTextures: Object.fromEntries(this.categoryTabs.map((tab) => [tab.category.id, tab.icon.texture.key])),
      panelTheme: this.panelTheme?.id ?? null,
      environment: {
        background: this.wall.texture.key,
        tablecloth: this.table.texture.key,
      },
      targets: {
        back: { x: this.closeZone.x, y: this.closeZone.y },
        close: { x: this.closeZone.x, y: this.closeZone.y },
        action: this.action.center(),
        ...Object.fromEntries(this.categoryTabs.map((tab) => [`category:${tab.category.id}`, tab.center()])),
        ...Object.fromEntries(this.cards.map((card) => [`item:${card.item.id}`, card.center()])),
      },
    };
  }
}
