import { BaseScene } from './BaseScene.js';
import { clamp } from '../ui/layout.js';
import { addText, fitText } from '../ui/text.js';
import { appearanceTexture } from '../ui/appearanceTextures.js';
import { STORE_CATEGORIES, STORE_CONFIG, STORE_PRODUCT_BY_ID, slotKey } from '../content/store.js';
import { StoreBasket } from '../mechanics/StoreBasket.js';
import { TapButton } from '../ui/gameDialog.js';
import { CoinPill, STORE_ART, STORE_DEPTH, ShopBackdrop, Toast, imageRect } from '../ui/storeViews.js';

const D = STORE_DEPTH;

// Supermarket shelves (reference: reference/input/Store-Shelf.png, Store-Matcha.png).
// Each facing on a shelf is one unit: tap it to move it into the basket, tap it again (or tap
// it in the basket) to put it back. The green Buy button goes to the checkout with the basket.
export class StoreScene extends BaseScene {
  constructor() { super('Store'); }

  init(data) {
    this.leaving = false;
    this.categoryIndex = 0;
    this.basket = new StoreBasket();
    // Returning from the checkout keeps the basket.
    for (const item of data?.items ?? []) this.basket.add(item.slot, item.productId);
    if (data?.items?.length) this.categoryIndex = Math.max(0, STORE_CATEGORIES.findIndex((c) => data.items[0].slot.startsWith(`${c.id}:`)));
    this.lastResult = null;
  }

  create() {
    this.coins = this.services().save.snapshot().coins;
    this.backdrop = new ShopBackdrop(this, this.category.background);
    this.close = this.button('store-close', () => this.fadeTo('Home'));
    this.coinPill = new CoinPill(this, this.coins);
    this.sign = this.add.image(0, 0, 'store-sign').setDepth(D.ui);
    this.signText = addText(this, 0, 0, '', { size: 24, weight: '700', color: '#ff5f8a', stroke: '#ffffff', strokeWidth: 5 }).setDepth(D.ui + 1);
    this.arrowLeft = this.button('store-arrow', () => this.switchCategory(-1)).setFlipX(true);
    this.arrowRight = this.button('store-arrow', () => this.switchCategory(1));
    this.slots = [];
    for (let shelf = 0; shelf < 3; shelf += 1) {
      for (let index = 0; index < 3; index += 1) {
        const slot = {
          shelf, index,
          product: this.add.image(0, 0, 'store-orez').setOrigin(0.5, 1).setDepth(D.shelf + 1),
          tag: this.add.image(0, 0, 'store-price-tag').setDepth(D.shelf + 2),
          price: addText(this, 0, 0, '', { size: 16, weight: '700', color: '#5d4a6b' }).setDepth(D.shelf + 3),
          check: this.add.image(0, 0, 'playtime-check').setDepth(D.shelf + 3).setVisible(false),
          zone: this.add.zone(0, 0, 10, 10).setDepth(D.shelf + 4).setInteractive({ useHandCursor: true }),
        };
        slot.zone.on('pointerup', () => this.tapSlot(slot));
        this.slots.push(slot);
      }
    }
    this.live = this.add.image(0, 0, 'store-live').setDepth(D.ui);
    this.liveAvatar = this.add.image(0, 0, appearanceTexture(this, 'avatar', this.services().save.snapshot().appearance.equipped)).setDepth(D.ui + 1);
    this.basketBack = this.add.image(0, 0, 'store-basket').setDepth(D.basketBack);
    this.basketFront = this.add.image(0, 0, 'store-basket').setDepth(D.basketFront);
    this.basketFront.setCrop(0, this.basketFront.height * STORE_ART.basketRim, this.basketFront.width, this.basketFront.height);
    this.basketIcons = [];
    // Fixed pool of basket tap areas: Phaser only hit-tests a newly created interactive
    // object from the next frame, so recreating them made quick add-then-remove taps miss.
    this.basketZones = Array.from({ length: STORE_CONFIG.basketCapacity }, (_, i) => {
      const zone = this.add.zone(0, 0, 10, 10).setDepth(D.basketFront + 1).setInteractive({ useHandCursor: true });
      zone.on('pointerup', () => { const item = this.basket.items[i]; if (item) this.removeFromBasket(item.slot); });
      return zone;
    });
    this.buy = new TapButton(this, { skin: 'reward-button', label: 'Buy', onTap: () => this.goCheckout(), depth: D.ui + 2 });
    this.cartPill = this.add.image(0, 0, 'store-pill').setDepth(D.ui);
    this.cartIcon = this.add.image(0, 0, 'store-cart').setDepth(D.ui + 1);
    this.cartText = addText(this, 0, 0, '', { size: 18, weight: '700', color: '#5d4a6b' }).setDepth(D.ui + 1);
    this.totalPill = this.add.image(0, 0, 'store-pill').setDepth(D.ui);
    this.totalLabel = addText(this, 0, 0, 'Total', { size: 18, weight: '700', color: '#5d4a6b' }).setDepth(D.ui + 1);
    this.totalCoin = this.add.image(0, 0, 'coin').setDepth(D.ui + 1);
    this.totalText = addText(this, 0, 0, '0', { size: 18, weight: '700', color: '#5d4a6b', originX: 0 }).setDepth(D.ui + 1);
    this.toast = new Toast(this);
    this.fillShelves();
    this.bindViewport();
    this.refreshBasket(false);
    this.cameras.main.fadeIn(260, 255, 240, 245);
  }

  get category() { return STORE_CATEGORIES[this.categoryIndex]; }

  button(texture, onTap) {
    const image = this.add.image(0, 0, texture).setDepth(D.ui).setInteractive({ useHandCursor: true });
    image.on('pointerdown', () => { image.setData('s', image.scale); image.setScale(image.scale * 0.92); });
    image.on('pointerout', () => { if (image.getData('s')) image.setScale(image.getData('s')); image.setData('s', null); });
    image.on('pointerup', () => { if (image.getData('s')) image.setScale(image.getData('s')); image.setData('s', null); onTap(); });
    return image;
  }

  fillShelves() {
    const c = this.category;
    this.backdrop.setTexture(c.background);
    this.signText.setText(c.title).setColor(c.signColor);
    for (const slot of this.slots) {
      slot.key = slotKey(c.id, slot.shelf, slot.index);
      slot.productId = c.shelves[slot.shelf][slot.index];
      const product = STORE_PRODUCT_BY_ID[slot.productId];
      slot.product.setTexture(product.texture);
      slot.price.setText(String(product.price));
    }
    if (this.frame) this.layout(this.frame);
    this.refreshShelf();
  }

  layout(f) {
    const H = f.H;
    const colW = f.colW;
    // Backdrop: the shelf unit starts just inside the column's left edge.
    const probe = this.backdrop.tiles[0];
    const imgW = probe.width * (H / probe.height);
    this.backdrop.layout(f, f.colLeft + colW * 0.03 - STORE_ART.shelfLeft * imgW);
    const shelfLeft = f.colLeft + colW * 0.03;

    // Top row: close (left), coins (centre); category sign below on the right.
    // Low enough that the coin stack (1.3 × pill height) stays on screen.
    const topY = f.top + clamp(f.h * 0.065, 40, 58);
    const closeD = clamp(colW * 0.13, 44, 58);
    this.close.setScale(closeD / this.close.width).setPosition(f.colLeft + clamp(colW * 0.04, 10, 18) + closeD / 2, topY);
    this.coinPill.layout(f.cx + closeD * 0.2, topY, Math.min((topY - f.top - 3) / (0.69 * 0.352), clamp(colW * 0.4, 150, 220)));
    // Category sign hangs above the top shelf on the right, never over its products. When
    // that gap is too small (short screens) it moves into the top row instead.
    const top = STORE_ART.shelves[0];
    const productTop = H * top.stand - Math.min(H * top.room * 0.92, H * 0.125);
    const coinRect = this.coinPill.rect();
    const signTop = Math.max(topY + closeD / 2, coinRect.y + coinRect.h) + 4;
    const right = f.colRight - clamp(colW * 0.03, 8, 16);
    let signW = Math.min(clamp(colW * 0.42, 150, 220), ((productTop - 6 - signTop) / this.sign.height) * this.sign.width);
    let signY;
    if (signW >= 110) {
      signY = signTop + (signW / this.sign.width) * this.sign.height / 2;
    } else {
      signW = Math.min(((closeD * 1.25) / this.sign.height) * this.sign.width, right - (this.coinPill.pill.x + this.coinPill.pill.displayWidth / 2) - 8);
      signY = topY;
    }
    this.sign.setScale(signW / this.sign.width).setPosition(right - signW / 2, signY);
    fitText(this.signText, signW * 0.8, { size: clamp(signW * 0.12, 13, 28), min: 9 });
    this.signText.setPosition(this.sign.x, signY + this.sign.displayHeight * 0.12);

    // Shelves: 3 × 3 facings between the shelf's left edge and the column's right edge.
    const areaL = shelfLeft + colW * 0.03;
    const areaR = f.colRight - colW * 0.03;
    const slotW = (areaR - areaL) / 3;
    for (const slot of this.slots) {
      const s = STORE_ART.shelves[slot.shelf];
      const x = areaL + slotW * (slot.index + 0.5);
      const boxH = Math.min(H * s.room * 0.92, H * 0.125);
      const boxW = slotW * 0.84;
      const p = slot.product;
      p.setScale(Math.min(boxW / p.width, boxH / p.height)).setPosition(x, H * s.stand);
      const tagW = Math.min(slotW * 0.84, 120);
      slot.tag.setScale(tagW / slot.tag.width).setPosition(x, H * s.tag);
      const tagH = slot.tag.displayHeight;
      slot.price.setFontSize(Math.round(clamp(tagH * 0.62, 13, 20))).setPosition(x - tagW / 2 + STORE_ART.priceTagText * tagW, H * s.tag);
      const c = Math.min(boxW, boxH) * 0.36;
      slot.check.setScale(c / slot.check.width).setPosition(x + boxW * 0.32, H * s.stand - c * 0.6);
      const zoneH = boxH + tagH;
      slot.zone.setPosition(x, H * s.stand - boxH / 2 + tagH / 2).setSize(slotW * 0.96, zoneH);
      slot.zone.input.hitArea.setSize(slotW * 0.96, zoneH);
      slot.home = { x, y: H * s.stand - p.displayHeight / 2 };
    }

    // Page arrows at mid-height on both edges.
    const arrowH = clamp(colW * 0.13, 44, 60);
    const arrowY = H * 0.53;
    for (const [a, x] of [[this.arrowLeft, f.colLeft + arrowH * 0.4], [this.arrowRight, f.colRight - arrowH * 0.4]]) {
      a.setScale(arrowH / a.height).setPosition(x, arrowY);
    }

    // Bottom bar: live card (left), basket (centre), check + cart + total (right).
    // Below the lowest price tags (short screens push the bar down a little).
    const tagBottom = Math.max(...this.slots.map((sl) => sl.tag.y + sl.tag.displayHeight / 2));
    const bottomTop = Math.max(H * 0.835, tagBottom + 4);
    const bottomH = f.bottom - bottomTop - clamp(f.h * 0.012, 6, 12);
    const liveH = Math.min(bottomH, colW * 0.36);
    this.live.setScale(liveH / this.live.height).setPosition(f.colLeft + clamp(colW * 0.03, 8, 14) + this.live.displayWidth / 2, bottomTop + bottomH - liveH / 2);
    const screenW = this.live.displayWidth * 0.78;
    this.liveAvatar.setScale(screenW / Math.max(this.liveAvatar.width, this.liveAvatar.height)).setPosition(this.live.x, this.live.y - liveH * 0.06);

    const rightW = clamp(colW * 0.3, 110, 160);
    const rightX = f.colRight - clamp(colW * 0.03, 8, 14) - rightW / 2;
    const pillH = Math.min(bottomH * 0.24, rightW * 0.3);
    const checkD = Math.min(bottomH - pillH * 2 - 8, rightW * 0.62);
    // Big green Buy button (the old round check was not read as "buy").
    const buyH = Math.min(checkD * 0.72, (rightW * 0.98) / (this.buy.skin.width / this.buy.skin.height));
    this.buy.layout(rightX, bottomTop + checkD / 2, buyH, 0.46);
    const cartY = bottomTop + checkD + 2 + pillH / 2;
    this.cartPill.setScale(Math.min((rightW * 0.72) / this.cartPill.width, pillH / this.cartPill.height)).setPosition(rightX + rightW * 0.14, cartY);
    this.cartIcon.setScale((pillH * 1.05) / this.cartIcon.height).setPosition(this.cartPill.x - this.cartPill.displayWidth * 0.28, cartY);
    this.cartText.setFontSize(Math.round(pillH * 0.6)).setPosition(this.cartPill.x + this.cartPill.displayWidth * 0.14, cartY);
    const totalY = cartY + pillH / 2 + 4 + pillH * 0.55;
    this.totalPill.setScale(Math.min(rightW / this.totalPill.width, (pillH * 1.1) / this.totalPill.height)).setPosition(rightX, totalY);
    const tp = this.totalPill;
    const fs = Math.round(tp.displayHeight * 0.52);
    // "Total ● 750" laid out left to right from the pill's left edge.
    this.totalLabel.setFontSize(fs).setOrigin(0, 0.5).setPosition(tp.x - tp.displayWidth / 2 + tp.displayHeight * 0.45, totalY);
    this.totalCoin.setScale((tp.displayHeight * 0.62) / this.totalCoin.height);
    this.totalCoin.setPosition(this.totalLabel.x + this.totalLabel.width + this.totalCoin.displayWidth * 0.55, totalY);
    this.totalText.setFontSize(fs).setPosition(this.totalCoin.x + this.totalCoin.displayWidth * 0.6, totalY);

    const leftEdge = this.live.x + this.live.displayWidth / 2 + 6;
    const rightEdge = Math.min(this.buy.rect().x, tp.x - tp.displayWidth / 2) - 6;
    const basketW = Math.min(rightEdge - leftEdge, colW * 0.42, (bottomH / this.basketBack.height) * this.basketBack.width * 0.95);
    const bs = basketW / this.basketBack.width;
    const bx = (leftEdge + rightEdge) / 2;
    const by = f.bottom - clamp(f.h * 0.012, 6, 12) - this.basketBack.height * bs / 2;
    for (const img of [this.basketBack, this.basketFront]) img.setScale(bs).setPosition(bx, by);
    this.basketBox = { x: bx, y: by, w: basketW, h: this.basketBack.height * bs };

    this.layoutBasketIcons();
    this.layoutRects = {
      close: imageRect(this.close),
      coins: this.coinPill.rect(),
      sign: imageRect(this.sign),
      arrowLeft: imageRect(this.arrowLeft),
      arrowRight: imageRect(this.arrowRight),
      live: imageRect(this.live),
      basket: imageRect(this.basketBack),
      buy: this.buy.rect(),
      cart: imageRect(this.cartPill),
      total: imageRect(this.totalPill),
      ...Object.fromEntries(this.slots.map((s) => [`tag-${s.shelf}-${s.index}`, imageRect(s.tag)])),
      ...Object.fromEntries(this.slots.map((s) => [`product-${s.shelf}-${s.index}`, imageRect(s.product)])),
    };
  }

  layoutBasketIcons() {
    const b = this.basketBox;
    if (!b) return;
    const n = this.basketIcons.length;
    const size = b.h * 0.78;
    const span = b.w * 0.62;
    const step = n > 1 ? Math.min(size * 0.75, span / (n - 1)) : 0;
    const rimY = b.y - b.h / 2 + b.h * STORE_ART.basketRim;
    this.basketIcons.forEach((icon, i) => {
      const x = b.x + (i - (n - 1) / 2) * step;
      icon.image.setScale(Math.min(size / icon.image.width, size / icon.image.height)).setPosition(x, rimY - size * 0.05);
      icon.zone.setPosition(x, rimY).setSize(Math.max(step, size * 0.5), size);
      icon.zone.input.hitArea.setSize(icon.zone.width, icon.zone.height);
    });
  }

  refreshShelf() {
    for (const slot of this.slots) {
      const inBasket = this.basket.has(slot.key);
      slot.product.setAlpha(inBasket ? 0.28 : 1);
      slot.tag.setAlpha(inBasket ? 0.6 : 1);
      slot.price.setAlpha(inBasket ? 0.6 : 1);
      slot.check.setVisible(inBasket);
    }
  }

  // Rebuilds the basket contents, counters and totals from the basket model.
  refreshBasket(animateLast = true) {
    this.basketIcons.forEach((icon) => icon.image.destroy());
    this.basketIcons = this.basket.items.map((item, i) => ({
      slot: item.slot,
      image: this.add.image(0, 0, STORE_PRODUCT_BY_ID[item.productId].texture).setDepth(D.basketItems),
      zone: this.basketZones[i],
    }));
    this.basketZones.forEach((zone, i) => { zone.input.enabled = i < this.basketIcons.length; });
    this.layoutBasketIcons();
    if (animateLast && this.basketIcons.length) {
      const last = this.basketIcons.at(-1).image;
      const s = last.scale;
      this.tweens.add({ targets: last, scale: { from: s * 1.3, to: s }, duration: 200, ease: 'Back.Out' });
    }
    const { count, capacity, total } = this.basket.snapshot();
    this.cartText.setText(`${count}/${capacity}`);
    this.totalText.setText(String(total));
    // Early warning: the total turns red when the wallet cannot cover it.
    this.totalText.setColor(total > this.coins ? '#e53950' : '#5d4a6b');
    this.buy.root.setAlpha(count ? 1 : 0.5);
    this.refreshShelf();
  }

  tapSlot(slot) {
    if (this.leaving) return;
    const result = this.basket.toggle(slot.key, slot.productId);
    this.lastResult = result.status;
    if (result.status === 'full') {
      this.toast.show(`Basket is full (${STORE_CONFIG.basketCapacity}/${STORE_CONFIG.basketCapacity})`, this.frame, this.frame.H * 0.5, 0xd2436a);
      this.tweens.add({ targets: this.basketBack, x: this.basketBack.x + 5, duration: 50, yoyo: true, repeat: 2 });
      return;
    }
    if (result.status === 'added') this.flyToBasket(slot);
    this.refreshBasket(result.status === 'added');
  }

  flyToBasket(slot) {
    const ghost = this.add.image(slot.product.x, slot.home.y, slot.product.texture.key).setScale(slot.product.scale).setDepth(D.feedback);
    const b = this.basketBox;
    this.tweens.add({ targets: ghost, x: b.x, y: b.y - b.h * 0.3, scale: ghost.scale * 0.6, duration: 260, ease: 'Sine.In', onComplete: () => ghost.destroy() });
  }

  removeFromBasket(slot) {
    if (this.leaving) return;
    this.basket.remove(slot);
    this.lastResult = 'removed';
    this.refreshBasket(false);
  }

  switchCategory(dir) {
    if (this.leaving) return;
    this.categoryIndex = (this.categoryIndex + dir + STORE_CATEGORIES.length) % STORE_CATEGORIES.length;
    this.fillShelves();
    this.cameras.main.flash(160, 255, 244, 247);
  }

  goCheckout() {
    if (this.leaving) return;
    if (!this.basket.count) {
      this.toast.show('Tap snacks to put them in the basket', this.frame, this.frame.H * 0.5);
      return;
    }
    this.fadeTo('Checkout', { items: this.basket.snapshot().items });
  }

  getDebugSnapshot() {
    const targets = {
      close: { x: this.close.x, y: this.close.y },
      buy: this.buy.center(),
      check: this.buy.center(), // old name kept for QA scripts
      arrowLeft: { x: this.arrowLeft.x, y: this.arrowLeft.y },
      arrowRight: { x: this.arrowRight.x, y: this.arrowRight.y },
    };
    for (const slot of this.slots) targets[`slot:${slot.key}`] = { x: slot.zone.x, y: slot.zone.y };
    this.basketIcons.forEach((icon, i) => { targets[`basket:${i}`] = { x: icon.zone.x, y: icon.zone.y }; });
    return {
      scene: 'Store',
      phase: 'shelf',
      category: this.category.id,
      basket: this.basket.snapshot(),
      shelf: this.slots.map((s) => ({ key: s.key, productId: s.productId, price: Number(s.price.text), selected: this.basket.has(s.key) })),
      basketIcons: this.basketIcons.map((i) => i.image.texture.key),
      cartText: this.cartText.text,
      totalText: this.totalText.text,
      totalColor: this.totalText.style.color,
      coinsText: this.coinPill.text.text,
      toast: this.toast.message,
      lastResult: this.lastResult,
      targets,
      rects: this.layoutRects,
      save: this.services().save.snapshot(),
    };
  }
}
