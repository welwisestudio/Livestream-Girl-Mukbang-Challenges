import { BaseScene } from './BaseScene.js';
import { clamp, uiLeft, uiRight } from '../ui/layout.js';
import { addText, fitText } from '../ui/text.js';
import { appearanceTexture } from '../ui/appearanceTextures.js';
import { STORE_CATEGORIES, STORE_CONFIG, STORE_PRODUCT_BY_ID, slotKey } from '../content/store.js';
import { StoreBasket } from '../mechanics/StoreBasket.js';
import { TapButton } from '../ui/gameDialog.js';
import { CoinPill, STORE_ART, STORE_DEPTH, ShopBackdrop, Toast, imageRect } from '../ui/storeViews.js';
import { UI_OUTLINE, dropShadow, roundedBox } from '../ui/draw.js';
import { pressable } from '../ui/pressFeedback.js';

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
        pressable(slot.zone, { target: slot.product });
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
      pressable(zone, { scale: false, enabled: () => Boolean(this.basket.items[i]) });
      zone.on('pointerup', () => { const item = this.basket.items[i]; if (item) this.removeFromBasket(item.slot); });
      return zone;
    });
    this.buy = new TapButton(this, { skin: 'reward-button', label: 'Buy', onTap: () => this.goCheckout(), depth: D.ui + 2 });
    // Count and total pills are drawn in code so their height can follow the bar, not the art.
    this.infoBox = this.add.graphics().setDepth(D.ui);
    this.cartIcon = this.add.image(0, 0, 'store-cart').setDepth(D.ui + 1);
    this.cartText = addText(this, 0, 0, '', { size: 18, weight: '700', color: '#5d4a6b' }).setDepth(D.ui + 1);
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
    pressable(image, { sound: texture === 'store-close' ? 'close' : 'tap' });
    image.on('pointerup', () => onTap());
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
    // Side layout (shelves centred, live card and cart column beside them) only on screens that
    // are really wide; tall tablets keep the portrait arrangement across their full width.
    const side = f.spread && f.w >= f.h * 1.1;
    const H = f.H;
    const colW = f.colW;
    // Backdrop: the painted shelf runs from `shelfLeft` of the art to its right edge, and the
    // mirrored copy finishes it, so the whole unit is (2 − 2·shelfLeft) art widths wide.
    // Phones: the unit starts just inside the column (its right end runs off-screen, as in the
    // reference). Wide screens: the whole unit is centred on screen.
    const probe = this.backdrop.tiles[0];
    const imgW = probe.width * (H / probe.height);
    const unitW = imgW * (2 - 2 * STORE_ART.shelfLeft);
    const shelfLeft = side ? f.cx - unitW / 2 : f.left + f.w * 0.03;
    this.backdrop.layout(f, shelfLeft - STORE_ART.shelfLeft * imgW);

    // Top row: close (left), coins (centre); category sign below on the right.
    // Low enough that the coin stack (1.3 × pill height) stays on screen.
    const topY = f.top + clamp(f.h * 0.065, 40, 58);
    const closeD = clamp(colW * 0.13, 44, 58);
    this.close.setScale(closeD / this.close.width).setPosition(uiLeft(f, clamp(colW * 0.04, 10, 18)) + closeD / 2, topY);
    // Wallet: top centre on phones, top-right edge on wide screens.
    const coinW = Math.min((topY - f.top - 3) / (0.69 * 0.352), clamp(colW * 0.4, 150, 220));
    this.coinPill.layout(side ? uiRight(f) - coinW / 2 : f.cx + closeD * 0.2, topY, coinW);
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
      // Short screens: the sign joins the top row — right of a centred wallet, or left of a
      // wallet anchored at the right edge.
      const coinL = this.coinPill.pill.x - this.coinPill.pill.displayWidth / 2 - this.coinPill.coin.displayWidth * 0.5;
      const rowRight = side ? Math.min(right, coinL - 8) : right;
      const rowLeft = side ? this.close.x + closeD / 2 + 8 : this.coinPill.pill.x + this.coinPill.pill.displayWidth / 2 + 8;
      signW = Math.min(((closeD * 1.25) / this.sign.height) * this.sign.width, rowRight - rowLeft);
      signY = topY;
      this.sign.setScale(signW / this.sign.width).setPosition(rowRight - signW / 2, signY);
    }
    if (signY !== topY) this.sign.setScale(signW / this.sign.width).setPosition(right - signW / 2, signY);
    fitText(this.signText, signW * 0.8, { size: clamp(signW * 0.12, 13, 28), min: 9 });
    this.signText.setPosition(this.sign.x, signY + this.sign.displayHeight * 0.12);

    // Page arrows at mid-height. Phones: at the column edges, with the products kept clear of
    // them. Wide screens: just outside the products, over the shelf ends.
    const arrowH = clamp(colW * 0.13, 44, 60);
    const arrowW = arrowH * (this.arrowLeft.width / this.arrowLeft.height);
    const arrowY = H * 0.53;

    // Shelves: 3 × 3 facings across the usable shelf width.
    const inset = imgW * 0.07; // keeps products off the slanted board ends
    let areaL;
    let areaR;
    if (side) {
      // The live card (left) and the cart/Buy column (right) stand beside the shelves.
      const reserve = clamp(f.side.right.w * 0.8, 130, 200) + clamp(colW * 0.03, 8, 14) + arrowW + 16;
      const half = Math.min(unitW / 2 - inset, f.w / 2 - reserve, colW * 0.75);
      areaL = f.cx - half;
      areaR = f.cx + half;
    } else {
      // Portrait phones and tablets use the full screen width (the column is narrower on tablets).
      areaL = Math.max(shelfLeft + f.w * 0.03, f.left + arrowH * 0.4 + arrowW / 2 + 4);
      areaR = Math.min(shelfLeft + unitW - inset, f.right - arrowH * 0.4 - arrowW / 2 - 4);
    }
    const slotW = (areaR - areaL) / 3;
    for (const slot of this.slots) {
      const s = STORE_ART.shelves[slot.shelf];
      const x = areaL + slotW * (slot.index + 0.5);
      const boxH = Math.min(H * s.room * 0.92, H * 0.125);
      // Wide packs stay in proportion with the bottles and jars instead of filling wide slots.
      const boxW = Math.min(slotW * 0.84, boxH * 1.6);
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

    const arrowX = side
      ? [areaL - arrowW / 2 - 8, areaR + arrowW / 2 + 8]
      : [f.left + arrowH * 0.4, f.right - arrowH * 0.4];
    for (const [a, x] of [[this.arrowLeft, arrowX[0]], [this.arrowRight, arrowX[1]]]) {
      a.setScale(arrowH / a.height).setPosition(x, arrowY);
    }

    // Bottom bar: live card (left), basket (centre), one even column on the right — the count and
    // total pills above a Buy button of the same width. Everything shares the bar's bottom line
    // and nothing overlaps. Sizes keep readable minimums: when the bar is too short for two pills
    // they merge into one "cart 3/5 · coin 370" pill instead of shrinking, and text is fitted to
    // the pill. With room beside the shelves (wide screens) the column and the live card stand in
    // those side areas, sized by the side width and the height under the top row.
    // Below the lowest price tags (short screens push the bar down a little).
    const tagBottom = Math.max(...this.slots.map((sl) => sl.tag.y + sl.tag.displayHeight / 2));
    const bottomTop = Math.max(H * 0.835, tagBottom + 6);
    const barBottom = f.bottom - clamp(f.h * 0.012, 6, 12);
    const bottomH = barBottom - bottomTop;
    const edge = clamp(colW * 0.03, 8, 14);
    const gap = Math.round(clamp(bottomH * 0.05, 4, 8));

    const buyAspect = this.buy.skin.width / this.buy.skin.height;
    const sideTop = Math.max(coinRect.y + coinRect.h, this.close.y + this.close.displayHeight / 2) + 16;
    const columnH = side ? barBottom - sideTop : bottomH;
    const minPill = 30;
    // Buy keeps its art proportions, so on a very short bar it sets the (narrower) column width.
    const buyH = Math.round(Math.max(40, Math.min(columnH - minPill - gap, (side ? clamp(f.side.right.w * 0.8, 130, 200) : clamp(colW * 0.38, 130, 190)) / buyAspect)));
    const colWidth = Math.round(buyH * buyAspect);
    const rightX = uiRight(f, edge) - colWidth / 2;
    const infoSpace = columnH - buyH - gap;
    const twoRows = infoSpace >= minPill * 2 + gap;
    const pillH = Math.round(twoRows ? Math.min((infoSpace - gap) / 2, 44) : clamp(infoSpace, minPill, 44));
    const infoH = twoRows ? pillH * 2 + gap : pillH;
    const infoTop = barBottom - buyH - gap - infoH;
    const cartY = infoTop + pillH / 2;
    const totalY = twoRows ? cartY + pillH + gap : cartY;
    const pillLeft = rightX - colWidth / 2;
    this.infoBox.clear();
    for (const y of twoRows ? [cartY, totalY] : [cartY]) {
      dropShadow(this.infoBox, pillLeft, y - pillH / 2, colWidth, pillH, { depth: 3, alpha: 0.1 });
      roundedBox(this.infoBox, pillLeft, y - pillH / 2, colWidth, pillH, { fill: 0xffffff, stroke: 0xc7a6e8, strokeWidth: UI_OUTLINE });
    }
    this.infoRects = {
      info: { x: pillLeft, y: infoTop, w: colWidth, h: infoH },
      cart: { x: pillLeft, y: cartY - pillH / 2, w: colWidth, h: pillH },
      total: { x: pillLeft, y: totalY - pillH / 2, w: colWidth, h: pillH },
    };
    this.layoutTotalRow = () => {
      // One font size for every row, the largest that fits inside the pill with side padding.
      const room = colWidth - pillH * 0.6;
      const iconGap = 6;
      const coinGap = 5;
      const measure = (size) => {
        this.cartText.setFontSize(size).setOrigin(0, 0.5);
        this.totalLabel.setFontSize(size).setOrigin(0, 0.5);
        this.totalText.setFontSize(size).setOrigin(0, 0.5);
        this.cartIcon.setScale((size * 1.3) / this.cartIcon.height);
        this.totalCoin.setScale((size * 1.15) / this.totalCoin.height);
        const cartW = this.cartIcon.displayWidth + iconGap + this.cartText.width;
        const totalW = (twoRows ? this.totalLabel.width + coinGap : 0) + this.totalCoin.displayWidth + coinGap + this.totalText.width;
        return twoRows ? { cartW, totalW, fits: Math.max(cartW, totalW) <= room } : { cartW, totalW, fits: cartW + pillH * 0.3 + totalW <= room };
      };
      let size = Math.round(clamp(pillH * 0.52, 14, 22));
      let m = measure(size);
      while (!m.fits && size > 12) { size -= 1; m = measure(size); }
      this.totalLabel.setVisible(twoRows);
      const place = (x0, y, total) => {
        let x = x0;
        if (!total) {
          this.cartIcon.setPosition(x + this.cartIcon.displayWidth / 2, y);
          this.cartText.setPosition(x + this.cartIcon.displayWidth + iconGap, y);
          return;
        }
        if (twoRows) { this.totalLabel.setPosition(x, y); x += this.totalLabel.width + coinGap; }
        this.totalCoin.setPosition(x + this.totalCoin.displayWidth / 2, y);
        this.totalText.setPosition(x + this.totalCoin.displayWidth + coinGap, y);
      };
      if (twoRows) {
        place(rightX - m.cartW / 2, cartY, false);
        place(rightX - m.totalW / 2, totalY, true);
      } else {
        const groupW = m.cartW + pillH * 0.3 + m.totalW;
        place(rightX - groupW / 2, cartY, false);
        place(rightX - groupW / 2 + m.cartW + pillH * 0.3, cartY, true);
      }
    };
    this.layoutTotalRow();

    // Big green Buy button closes the column on the bar's bottom line.
    this.buy.layout(rightX, barBottom - buyH / 2, buyH, 0.46);

    // Live card: full bar height on the left edge.
    const liveH = side
      ? Math.min(barBottom - sideTop, (f.side.left.w * 0.7) * (this.live.height / this.live.width), clamp(f.h * 0.3, 120, 240))
      : Math.min(bottomH, colW * 0.36);
    this.live.setScale(liveH / this.live.height).setPosition(uiLeft(f, edge) + this.live.displayWidth / 2, barBottom - liveH / 2);
    const screenW = this.live.displayWidth * 0.78;
    this.liveAvatar.setScale(screenW / Math.max(this.liveAvatar.width, this.liveAvatar.height)).setPosition(this.live.x, this.live.y - liveH * 0.06);

    // Basket: centred in the free space between the live card and the column.
    const leftEdge = this.live.x + this.live.displayWidth / 2 + gap * 2;
    const rightEdge = rightX - colWidth / 2 - gap * 2;
    const basketW = Math.min(rightEdge - leftEdge, colW * 0.42, (bottomH / this.basketBack.height) * this.basketBack.width);
    const bs = basketW / this.basketBack.width;
    // Centred on screen when there is room, otherwise in the middle of the free space.
    const bx = clamp(f.cx, leftEdge + basketW / 2, rightEdge - basketW / 2);
    const by = barBottom - this.basketBack.height * bs / 2;
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
      ...this.infoRects,
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
    this.layoutTotalRow?.();
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
