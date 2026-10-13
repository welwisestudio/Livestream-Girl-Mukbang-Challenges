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
import { pressable } from '../ui/pressFeedback.js';
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
    pressable(this.closeZone, { target: this.close, sound: 'close' });
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
    // Green = pay with coins (or apply). Orange + video icon = rewarded ad: ad-only items,
    // and coin items the player cannot afford yet.
    const affordable = Boolean(this.pendingItem) && save.coins >= this.pendingItem.price;
    this.pendingRewarded = Boolean(this.pendingItem && (isRewardedAppearanceItem(this.pendingItem.id) || !affordable));
    this.actionMode = this.pendingItem ? (this.pendingRewarded ? 'watch' : 'buy') : 'apply';
    this.action.setLabel({ watch: 'Unlock', buy: `Buy · ${this.pendingItem?.price}`, apply: 'Apply' }[this.actionMode]);
    this.action.setIcon(this.actionMode === 'watch' ? 'reward-play' : null);
    this.action.setEnabled(!this.busy, { variant: this.actionMode === 'watch' ? 'primary' : 'green' });
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
    // Wide screens (phones sideways, laptops, monitors): heroine on the left, wardrobe panel on
    // the right, both using the full height. Portrait stacks the panel under the heroine.
    const landscape = f.w / f.h >= 1.3;
    const desktop = !landscape && f.w >= 900 && f.h >= 620;
    const contentW = landscape
      ? Math.round(Math.min(f.w * 0.52, clamp(f.w * 0.46, 330, Math.min(f.h * 1.0, 700))))
      : desktop
        ? Math.min(f.w - f.pad * 2, clamp(f.w * 0.52, 620, 760))
        : f.colW;
    const contentLeft = landscape ? f.right - contentW - Math.round(clamp(f.w * 0.012, 10, 24)) : f.cx - contentW / 2;
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

    // Same formula as PillButton.layout, so the panel can be stacked bottom-up around it.
    const actionScale = compact ? 0.92 : 1;
    const btnH = Math.round(clamp(66 * f.ui * actionScale, 60, 80));
    const actionY = Math.round(f.bottom - clamp(f.h * 0.012, 8, 14) - btnH * 0.56);
    const shelfH = Math.round(desktop ? clamp(f.h * 0.09, 58, 68) : clamp((compact ? 48 : 54) * f.ui, 46, 58));
    const tabGap = Math.round(clamp(colW * 0.007, 2, 4));
    // Tabs share the row with the close button; on wide panels they stop growing and the row centres.
    const tabW = Math.min((colW - closeSize - tabGap * this.categoryTabs.length) / this.categoryTabs.length, landscape ? clamp(f.h * 0.085, 40, 76) : 999);
    const tabH = tabW * 1.24;
    const tabsLeft = contentCx - (this.categoryTabs.length * (tabW + tabGap) + closeSize) / 2;
    // Cards sit right above the button (price/AD pill bottom ≈ card centre + 0.64·h), the panel
    // starts just above the cards and the tabs straddle its top edge. Large tabs hang further
    // into the panel, so the cards keep 8 px below them.
    const cardPadTop = (h) => Math.round(Math.max(clamp(h * 0.1, 12, 18), tabH / 2 - shelfH * 0.36 + 8));
    const aboveButton = Math.round(clamp(f.h * 0.012, 8, 12));
    let cardH = Math.round(landscape ? clamp(f.h * 0.26, 122, 200) : (desktop ? clamp(f.h * 0.25, 164, 188) : clamp((compact ? 138 : 158) * f.ui, 132, 174)));
    if (landscape) {
      // Wide screens: the whole panel (tabs → cards → button) fits under the HUD.
      const hudBottom = hudTop + hudH + 8;
      const fixed = (f.bottom - actionY) + btnH / 2 + aboveButton + shelfH * 0.36 + tabH / 2;
      const fit = (actionY + btnH / 2 - hudBottom - fixed - 18) / 1.14;
      cardH = Math.round(Math.max(96, Math.min(cardH, fit)));
    }
    const cardY = actionY - btnH / 2 - aboveButton - cardH * 0.64;
    this.catalogTop = Math.round(cardY - cardH / 2 - cardPadTop(cardH));
    const tabY = this.catalogTop - shelfH * 0.36;
    this.shelfTop = tabY - shelfH / 2;
    // Portrait: only a thin strip of tablecloth shows above the tabs; the freed height goes to
    // the heroine. Wide: the heroine stands behind the table in the free left area.
    const tableStrip = Math.round(clamp(f.h * 0.05, 28, 46));
    this.tableTop = landscape
      ? Math.round(f.top + f.h * 0.64)
      : Math.round(tabY - tabH / 2 - tableStrip);
    const previewTop = hudTop + hudH + 4;
    const previewBottom = this.tableTop + Math.round(clamp(f.h * 0.045, 18, 42));
    const stageLeft = f.left;
    const stageW = contentLeft - stageLeft;
    const previewX = landscape ? stageLeft + stageW / 2 : f.cx;
    this.previewCenter = { x: previewX, y: (previewTop + previewBottom) / 2 };

    this.layoutEnvironment(f);
    const charH = Math.round(landscape
      ? clamp((previewBottom - previewTop) * 1.12, 150, stageW * 1.15)
      : desktop
        ? clamp((previewBottom - previewTop) * 1.32, 285, 360)
        : clamp((previewBottom - previewTop) * 1.16, compact ? 170 : 205, Math.min(f.h * 0.56, contentW * 1.2)));
    // Never taller than the space above the table (laptops: 1366×768, 1024×768).
    this.streamer.layout({ x: previewX, bottom: previewBottom, height: Math.min(charH, previewBottom - f.top - 6) });
    const mascotW = Math.round(landscape ? clamp(charH * 0.24, 46, 110) : clamp(contentW * 0.14, 50, desktop ? 92 : 78));
    this.mascot.setScale(mascotW / this.mascot.width).setPosition(
      landscape ? Math.min(previewX + charH * 0.42, contentLeft - mascotW * 0.6) : f.cx + contentW * 0.24,
      this.tableTop - mascotW * 0.28,
    );
    // The plate rests on the visible cloth: the thin strip in portrait, the table front when wide.
    const plateAspect = this.plate.width / this.plate.height;
    const plateW = Math.round(landscape
      ? Math.min(clamp(stageW * 0.3, 100, 240), (f.bottom - this.tableTop) * 0.62 * plateAspect)
      : Math.min(clamp(contentW * 0.32, 120, desktop ? 220 : 185), (tableStrip + 18) * plateAspect));
    this.plate.setScale(plateW / this.plate.width).setPosition(
      previewX,
      landscape ? this.tableTop + (f.bottom - this.tableTop) * 0.45 : this.tableTop + tableStrip * 0.42,
    );

    const tablecloth = APPEARANCE_ITEM_BY_ID[this.draft.tablecloth];
    const panelTheme = tablecloth?.uiTheme ?? { id: 'default', shelf: 0xffead0, panel: 0xfff8df, stroke: 0xe9ae7b };
    this.panelTheme = panelTheme;
    this.shelf.clear();
    this.categoryTabs.forEach((tab, i) => tab.layout(tabsLeft + tabW / 2 + i * (tabW + tabGap), tabY, tabW, tabH));

    const closeX = tabsLeft + this.categoryTabs.length * (tabW + tabGap) + closeSize / 2;
    const closeY = tabY;
    this.close.setScale(closeSize / Math.max(this.close.width, this.close.height)).setPosition(closeX, closeY);
    this.closeZone.setPosition(closeX, closeY).setSize(closeSize + 8, closeSize + 8);
    this.closeZone.input.hitArea.setSize(this.closeZone.width, this.closeZone.height);

    this.catalogPanel.clear();
    roundedBox(this.catalogPanel, contentLeft, this.catalogTop, contentW, f.bottom - this.catalogTop + 18, { fill: panelTheme.panel, stroke: panelTheme.stroke, strokeWidth: UI_OUTLINE, radius: 12 });
    this.categoryTitle.setVisible(false);

    const cardGap = Math.round(clamp(colW * 0.025, 8, 13));
    const cardW = Math.min(landscape ? Math.round(cardH * 0.84) : (desktop ? 190 : 136),(colW - cardGap * (this.cards.length - 1)) / this.cards.length);
    const cardsTotal = cardW * this.cards.length + cardGap * (this.cards.length - 1);
    this.cards.forEach((card, i) => card.layout({ x: contentCx - cardsTotal / 2 + cardW / 2 + i * (cardW + cardGap), y: cardY, w: cardW, h: cardH }));
    this.action.layout({ x: contentCx, y: actionY, frame: f, minWidth: 200, maxWidth: 290, scale: actionScale });

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
      actionVariant: this.action.variant,
      actionIcon: this.action.iconKey,
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
