import Phaser from 'phaser';
import { BaseScene } from './BaseScene.js';
import { clamp } from '../ui/layout.js';
import { addText } from '../ui/text.js';
import { burstHearts } from '../ui/actors.js';
import { GameDialog, TapButton } from '../ui/gameDialog.js';
import { STORE_PRODUCT_BY_ID } from '../content/store.js';
import { priceOf } from '../mechanics/StoreBasket.js';
import { createRunId } from '../core/createRunId.js';
import { CoinPill, STORE_ART, STORE_DEPTH, ShopBackdrop, imageRect } from '../ui/storeViews.js';

const D = STORE_DEPTH;
const TAP_MOVE = 14;

// Checkout (reference: reference/input/Store-Scan.png). Basket items wait on the belt; drag
// each one to the scanner (or tap it). When everything is scanned (or Buy is pressed, which scans the rest), Buy charges the wallet
// through StoreService.checkout — the only place coins change — and the paid snacks go to the
// food orders, then the eating stream eats exactly that order.
export class CheckoutScene extends BaseScene {
  constructor() { super('Checkout'); }

  init(data) {
    this.items = (data?.items ?? []).map((item, i) => ({ ...item, i, scanned: false }));
    this.orderId = createRunId('store');
    this.phase = 'scanning';
    this.leaving = false;
    this.dialog = null;
    this.carry = null;
    this.result = null;
  }

  create() {
    if (!this.items.length) { this.scene.start('Store'); return; }
    this.total = priceOf(this.items.map((i) => i.productId));
    this.backdrop = new ShopBackdrop(this, 'store-scan');
    this.back = this.add.image(0, 0, 'store-close').setDepth(D.ui).setInteractive({ useHandCursor: true });
    this.back.on('pointerup', () => this.backToShelves());
    this.coinPill = new CoinPill(this, this.services().save.snapshot().coins);
    this.flash = this.add.rectangle(0, 0, 10, 10, 0x6ee08a, 0).setDepth(D.shelf + 5);
    this.screenText = addText(this, 0, 0, 'Scan Here', { size: 30, weight: '700', color: '#8a5a3c', stroke: '#ffffff', strokeWidth: 6 }).setDepth(D.shelf + 6);
    this.receiptPill = this.add.image(0, 0, 'store-pill').setDepth(D.ui);
    this.receiptText = addText(this, 0, 0, '', { size: 18, weight: '700', color: '#5d4a6b' }).setDepth(D.ui + 1);
    for (const item of this.items) {
      item.image = this.add.image(0, 0, STORE_PRODUCT_BY_ID[item.productId].texture).setDepth(D.shelf + 10 + item.i);
      item.image.setInteractive({ useHandCursor: true });
      item.image.on('pointerdown', (pointer) => this.pick(item, pointer));
    }
    this.input.on('pointermove', this.move, this);
    this.input.on('pointerup', this.release, this);
    this.input.on('pointerupoutside', this.release, this);
    this.events.once('shutdown', () => {
      this.input.off('pointermove', this.move, this);
      this.input.off('pointerup', this.release, this);
      this.input.off('pointerupoutside', this.release, this);
    });
    this.pay = new TapButton(this, { skin: 'reward-button', label: `Buy ${this.total}`, onTap: () => this.payNow(), depth: D.ui + 2 });
    this.payCoin = this.add.image(0, 0, 'lobby-coins').setDepth(D.ui + 3);
    // Buy is always visible: pressing it before scanning scans the rest automatically.
    this.setPayVisible(true);
    this.bindViewport();
    this.updateReceipt();
    this.cameras.main.fadeIn(260, 255, 240, 245);
  }

  layout(f) {
    const probe = this.backdrop.tiles[0];
    const imgW = probe.width * (f.H / probe.height);
    const left = f.cx - STORE_ART.scan.anchorX * imgW;
    this.backdrop.layout(f, left);
    const at = (fx, fy) => ({ x: left + fx * imgW, y: fy * f.H });
    const g = STORE_ART.scan.glass;
    const g0 = at(g.x0, g.y0);
    const g1 = at(g.x1, g.y1);
    this.glass = { x: g0.x, y: g0.y, w: g1.x - g0.x, h: g1.y - g0.y };
    this.flash.setPosition(this.glass.x + this.glass.w / 2, this.glass.y + this.glass.h / 2).setSize(this.glass.w * 0.92, this.glass.h * 0.92);
    this.screenText.setFontSize(Math.round(clamp(this.glass.w * 0.13, 22, 40))).setPosition(this.glass.x + this.glass.w / 2, this.glass.y + this.glass.h * 0.12);
    this.scanPoint = { x: this.glass.x + this.glass.w / 2, y: this.glass.y + this.glass.h * 0.55 };

    // Low enough that the coin stack (1.3 × pill height) stays on screen.
    const topY = f.top + clamp(f.h * 0.065, 40, 58);
    const closeD = clamp(f.colW * 0.13, 44, 58);
    this.back.setScale(closeD / this.back.width).setPosition(f.colLeft + clamp(f.colW * 0.04, 10, 18) + closeD / 2, topY);
    this.coinPill.layout(f.cx + closeD * 0.2, topY, Math.min((topY - f.top - 3) / (0.69 * 0.352), clamp(f.colW * 0.4, 150, 220)));

    const slot = at(STORE_ART.scan.slot.x, STORE_ART.scan.slot.y);
    const pillW = clamp(f.colW * 0.46, 170, 240);
    this.receiptPill.setScale(pillW / this.receiptPill.width).setPosition(f.cx, slot.y + this.receiptPill.height * (pillW / this.receiptPill.width) * 0.75);
    this.receiptText.setFontSize(Math.round(this.receiptPill.displayHeight * 0.45)).setPosition(f.cx, this.receiptPill.y);

    // Items on the belt: one row of up to 5, or 3 + 2.
    const belt = STORE_ART.scan.belt;
    const beltTop = Math.max(f.H * belt.y0, this.receiptPill.y + this.receiptPill.displayHeight);
    const payH = clamp(f.colW * 0.16, 56, 72);
    const beltBottom = Math.min(f.H * belt.y1, f.bottom - payH - clamp(f.h * 0.03, 14, 28));
    // One row when the snacks stay big enough, otherwise 3 + 2.
    const beltH = beltBottom - beltTop;
    const oneRow = Math.min(beltH * 0.8, (f.colW * 0.88) / (this.items.length * 1.15), f.colW * 0.24);
    const rows = oneRow >= 56 || this.items.length <= 3 ? [this.items] : [this.items.slice(0, 3), this.items.slice(3)];
    const rowH = beltH / rows.length;
    const size = rows.length === 1 ? oneRow : Math.min(rowH * 0.86, f.colW * 0.22);
    rows.forEach((row, r) => {
      row.forEach((item, c) => {
        const x = f.cx + (c - (row.length - 1) / 2) * size * 1.18;
        item.home = { x, y: beltTop + rowH * (r + 0.5) };
        item.size = size;
        if (!item.scanned && this.carry?.item !== item) item.image.setScale(Math.min(size / item.image.width, size / item.image.height)).setPosition(item.home.x, item.home.y);
      });
    });
    this.payY = f.bottom - clamp(f.h * 0.03, 14, 28) - payH / 2;
    this.pay.layout(f.cx, this.payY, payH);
    const coinH = payH * 0.62;
    this.payCoin.setScale(coinH / this.payCoin.height).setPosition(f.cx - this.pay.skin.displayWidth / 2 + coinH * 0.75, this.payY);
    this.pay.text.setX(coinH * 0.55);
    this.dialog?.layout(f);
  }

  setPayVisible(visible) {
    this.pay.root.setVisible(visible);
    this.payCoin.setVisible(visible);
    if (visible) this.pay.zone.setInteractive(); else this.pay.zone.disableInteractive();
  }

  updateReceipt() {
    const scanned = this.items.filter((i) => i.scanned);
    this.receiptText.setText(`Scanned ${scanned.length}/${this.items.length} · ${priceOf(scanned.map((i) => i.productId))}`);
  }

  pick(item, pointer) {
    if (this.phase !== 'scanning' || item.scanned || this.carry) return;
    this.carry = { item, start: { x: pointer.worldX, y: pointer.worldY }, moved: 0 };
    item.image.setDepth(D.feedback - 1);
  }

  move(pointer) {
    const c = this.carry;
    if (!c) return;
    c.moved = Math.max(c.moved, Phaser.Math.Distance.Between(pointer.worldX, pointer.worldY, c.start.x, c.start.y));
    if (c.moved > TAP_MOVE * 0.5) c.item.image.setPosition(pointer.worldX, pointer.worldY);
  }

  release() {
    const c = this.carry;
    if (!c) return;
    this.carry = null;
    const img = c.item.image;
    const g = this.glass;
    const overScanner = img.x > g.x && img.x < g.x + g.w && img.y > g.y && img.y < g.y + g.h * 1.25;
    if (c.moved <= TAP_MOVE || overScanner) { this.scan(c.item); return; }
    img.setDepth(D.shelf + 10 + c.item.i);
    this.tweens.add({ targets: img, x: c.item.home.x, y: c.item.home.y, duration: 200, ease: 'Sine.Out' });
  }

  scan(item) {
    item.scanned = true;
    const img = item.image;
    img.disableInteractive();
    this.tweens.add({
      targets: img, x: this.scanPoint.x, y: this.scanPoint.y, duration: 220, ease: 'Sine.Out',
      onComplete: () => {
        // Beep: green flash on the scanner glass, the price pops, the item drops into the bag.
        this.flash.setFillStyle(0x6ee08a, 0.55);
        this.tweens.add({ targets: this.flash, fillAlpha: 0, duration: 380 });
        const price = STORE_PRODUCT_BY_ID[item.productId].price;
        const pop = addText(this, this.scanPoint.x, this.scanPoint.y - item.size * 0.6, `+${price}`, { size: 26, weight: '700', color: '#ffffff', stroke: '#3f8f2a', strokeWidth: 6 }).setDepth(D.feedback);
        this.tweens.add({ targets: pop, y: pop.y - 40, alpha: 0, duration: 700, onComplete: () => pop.destroy() });
        this.tweens.add({ targets: img, scale: 0, alpha: 0, duration: 220, delay: 120, onComplete: () => img.setVisible(false) });
        this.updateReceipt();
        if (this.items.every((i) => i.scanned)) this.readyToPay();
      },
    });
  }

  // Buy before scanning: every item left on the belt goes over the scanner, then payment runs.
  autoScan() {
    this.phase = 'autoscan';
    this.buyAfterScan = true;
    this.setPayVisible(false);
    this.items.filter((i) => !i.scanned).forEach((item, n) => this.time.delayedCall(n * 180, () => this.scan(item)));
  }

  readyToPay() {
    this.phase = 'ready';
    this.screenText.setText('All scanned!');
    if (this.buyAfterScan) { this.buyAfterScan = false; this.payNow(); return; }
    this.setPayVisible(true);
    this.pay.root.setScale(0.6);
    this.tweens.add({ targets: this.pay.root, scale: 1, duration: 260, ease: 'Back.Out' });
  }

  async payNow() {
    if (this.phase === 'scanning' && !this.carry) { this.autoScan(); return; }
    if (this.phase !== 'ready') return;
    this.phase = 'paying';
    this.setPayVisible(false);
    this.screenText.setText('Processing…');
    this.tweens.add({ targets: this.screenText, alpha: 0.4, duration: 260, yoyo: true, repeat: 2 });
    await new Promise((resolve) => { this.time.delayedCall(900, resolve); });
    let result;
    try {
      result = await this.services().store.checkout({ orderId: this.orderId, productIds: this.items.map((i) => i.productId) });
    } catch (error) {
      console.error(error);
      result = { status: 'error' };
    }
    this.result = result;
    this.tweens.killTweensOf(this.screenText);
    this.screenText.setAlpha(1);
    if (result.status === 'paid') {
      this.phase = 'paid';
      this.coinPill.animateTo(result.state.coins);
      this.screenText.setText('Thank you!');
      this.flash.setFillStyle(0x6ee08a, 0.45);
      this.tweens.add({ targets: this.flash, fillAlpha: 0, duration: 600 });
      burstHearts(this, this.scanPoint.x, this.scanPoint.y, { count: 8, size: 22, depth: D.feedback });
      this.time.delayedCall(1100, () => this.fadeTo('Meal', { orderId: this.orderId }));
      return;
    }
    this.phase = 'declined';
    this.screenText.setText(result.status === 'insufficient' ? 'Not enough coins!' : 'Payment failed');
    this.flash.setFillStyle(0xff6b6b, 0.5);
    this.tweens.add({ targets: this.flash, fillAlpha: 0.15, duration: 500 });
    this.dialog = new GameDialog(this, result.status === 'insufficient'
      ? {
        title: 'Not enough coins',
        body: `This basket costs ${result.total}, you have ${result.coins}.\nYou need ${result.missing} more. Remove something or earn coins at the Part Time Job.`,
        primary: { label: 'Back to shelves', onTap: () => this.backToShelves() },
        secondary: { label: 'Home', onTap: () => this.fadeTo('Home') },
      }
      : {
        title: 'Payment failed',
        body: 'Nothing was charged. Please try again.',
        primary: { label: 'Try again', onTap: () => { this.closeDialog(); this.phase = 'ready'; this.screenText.setText('All scanned!'); this.flash.setFillStyle(0x6ee08a, 0); this.setPayVisible(true); } },
        secondary: { label: 'Back to shelves', onTap: () => this.backToShelves() },
      });
    this.dialog.layout(this.frame);
  }

  closeDialog() { this.dialog?.destroy(); this.dialog = null; }

  backToShelves() {
    if (this.phase === 'paying' || this.phase === 'paid') return;
    this.fadeTo('Store', { items: this.items.map(({ slot, productId }) => ({ slot, productId })) });
  }

  getDebugSnapshot() {
    const targets = { back: { x: this.back.x, y: this.back.y } };
    for (const item of this.items) if (!item.scanned) targets[`item:${item.i}`] = { x: item.image.x, y: item.image.y };
    if (this.scanPoint) targets.scanner = this.scanPoint;
    if (this.pay.root.visible) targets.pay = this.pay.center();
    Object.assign(targets, this.dialog ? this.dialog.targets() : {});
    return {
      scene: 'Checkout',
      phase: this.phase,
      orderId: this.orderId,
      total: this.total,
      items: this.items.map(({ productId, scanned }) => ({ productId, scanned })),
      screenText: this.screenText.text,
      receiptText: this.receiptText.text,
      coinsText: this.coinPill.text.text,
      dialog: this.dialog ? this.dialog.title.text : null,
      result: this.result ? { status: this.result.status, total: this.result.total ?? null, missing: this.result.missing ?? null } : null,
      targets,
      rects: {
        back: imageRect(this.back), coins: this.coinPill.rect(), receipt: imageRect(this.receiptPill),
        ...(this.pay.root.visible ? { pay: this.pay.rect() } : {}),
        ...Object.fromEntries(this.items.filter((i) => !i.scanned).map((i) => [`item-${i.i}`, imageRect(i.image)])),
        ...(this.dialog ? this.dialog.rects() : {}),
      },
      save: this.services().save.snapshot(),
    };
  }
}
