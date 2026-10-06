import { BaseScene } from './BaseScene.js';
import { APPEARANCE_CATEGORIES, APPEARANCE_ITEM_BY_ID, appearanceHeadTexture, itemsForCategory } from '../content/appearance.js';
import { DEPTH, clamp } from '../ui/layout.js';
import { roundedBox } from '../ui/draw.js';
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
    this.hud = new Hud(this, { name: 'Player', level: save.highestLevel, coins: save.coins, xp: 0.15, appearance: this.draft });
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
    this.actionMode = this.pendingItem ? 'buy' : 'apply';
    this.action.setLabel(this.pendingItem ? `Buy · ${this.pendingItem.price}` : 'Apply');
    this.action.setEnabled(!this.busy, { variant: this.pendingItem ? 'primary' : 'green' });
  }

  async primaryAction() {
    if (this.busy || this.leaving) return;
    this.busy = true;
    this.action.setEnabled(false);
    try {
      if (this.pendingItem) {
        await this.services().appearance.purchase(this.pendingItem.id);
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
    this.table.setPosition(0, this.tableTop).setSize(f.W, this.catalogTop - this.tableTop);
    const scale = Math.max(0.34, f.colW / 1024);
    this.table.setTileScale(scale, scale);
    this.tableEdge.clear();
    this.tableEdge.fillStyle(0xffffff, 0.72).fillRect(0, this.tableTop, f.W, 5);
    this.tableEdge.fillStyle(0xb56b82, 0.24).fillRect(0, this.tableTop + 5, f.W, 5);
  }

  layout(f) {
    const compact = f.h < 700;
    const colLeft = f.colLeft + f.pad;
    const colRight = f.colRight - f.pad;
    const colW = colRight - colLeft;
    const hudTop = f.top + 10;
    const hudH = Math.round(clamp(66 * f.ui, 62, 78));
    const closeSize = Math.round(clamp(hudH * 0.72, 48, 58));
    this.hud.layoutLobby(f, { x: colLeft, y: hudTop, w: colW, h: hudH }, 0);

    const actionY = f.bottom - Math.round(clamp(f.h * 0.025, 14, 22)) - 31;
    const cardH = Math.round(clamp((compact ? 138 : 158) * f.ui, 132, 174));
    const shelfH = Math.round(clamp((compact ? 48 : 54) * f.ui, 46, 58));
    this.shelfTop = actionY - cardH - 148;
    const tabY = this.shelfTop + shelfH / 2;
    this.catalogTop = tabY + shelfH * 0.36;
    this.tableTop = Math.round(f.top + f.h * (compact ? 0.36 : 0.38));
    const previewTop = hudTop + hudH + 4;
    const previewBottom = this.tableTop + Math.round(clamp(f.h * 0.045, 26, 42));
    this.previewCenter = { x: f.cx, y: (previewTop + previewBottom) / 2 };

    this.layoutEnvironment(f);
    const charH = Math.round(clamp((previewBottom - previewTop) * 1.16, compact ? 170 : 205, 300));
    this.streamer.layout({ x: f.cx, bottom: previewBottom, height: charH });
    const mascotW = Math.round(clamp(f.colW * 0.14, 50, 78));
    this.mascot.setScale(mascotW / this.mascot.width).setPosition(f.cx + f.colW * 0.24, this.tableTop - mascotW * 0.28);
    const plateW = Math.round(clamp(f.colW * 0.32, 120, 185));
    this.plate.setScale(plateW / this.plate.width).setPosition(f.cx, this.tableTop + (this.catalogTop - this.tableTop) * 0.52);

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
    roundedBox(this.catalogPanel, f.colLeft, this.catalogTop, f.colW, f.bottom - this.catalogTop + 18, { fill: panelTheme.panel, stroke: panelTheme.stroke, strokeWidth: 3, radius: 12 });
    this.categoryTitle.setVisible(false);

    const cardGap = Math.round(clamp(colW * 0.025, 8, 13));
    const cardW = Math.min(136, (colW - cardGap * (this.cards.length - 1)) / this.cards.length);
    const cardsTotal = cardW * this.cards.length + cardGap * (this.cards.length - 1);
    const cardY = this.catalogTop + 28 + cardH / 2;
    this.cards.forEach((card, i) => card.layout({ x: f.cx - cardsTotal / 2 + cardW / 2 + i * (cardW + cardGap), y: cardY, w: cardW, h: cardH }));
    this.action.layout({ x: f.cx, y: actionY, frame: f, minWidth: 200, maxWidth: 290, scale: compact ? 0.92 : 1 });

    const bounds = this.streamer.image.getBounds();
    this.layoutRects = {
      ...this.hud.rects,
      'custom-close': { x: closeX - closeSize / 2, y: closeY - closeSize / 2, w: closeSize, h: closeSize },
      'custom-preview': { x: bounds.x, y: bounds.y, w: bounds.width, h: bounds.height },
      'custom-table': { x: 0, y: this.tableTop, w: f.W, h: this.catalogTop - this.tableTop },
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
      draftOwnership: Object.fromEntries(Object.entries(this.draft).map(([category, id]) => [category, this.services().appearance.isOwned(id)])),
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
