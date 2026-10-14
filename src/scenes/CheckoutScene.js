import Phaser from 'phaser';
import { BaseScene } from './BaseScene.js';
import { clamp, uiLeft, uiRight } from '../ui/layout.js';
import { addText } from '../ui/text.js';
import { burstHearts } from '../ui/actors.js';
import { GameDialog, TapButton } from '../ui/gameDialog.js';
import { STORE_PRODUCT_BY_ID } from '../content/store.js';
import { priceOf } from '../mechanics/StoreBasket.js';
import { createRunId } from '../core/createRunId.js';
import { CoinPill, STORE_ART, STORE_DEPTH, ShopBackdrop, imageRect } from '../ui/storeViews.js';
import { pressable } from '../ui/pressFeedback.js';

const D = STORE_DEPTH;
const TAP_MOVE = 14;
const SUCCESS = 0x4fc46a;
const DECLINE = 0xff5a5a;

// Soft laser line (white core, pink glow, faded ends), drawn once per game.
function laserTexture(scene) {
  const key = 'scan-laser';
  if (scene.textures.exists(key)) return key;
  const w = 256; const h = 40;
  const texture = scene.textures.createCanvas(key, w, h);
  const ctx = texture.getContext();
  const v = ctx.createLinearGradient(0, 0, 0, h);
  v.addColorStop(0, 'rgba(255,61,110,0)');
  v.addColorStop(0.36, 'rgba(255,61,110,0.35)');
  v.addColorStop(0.47, 'rgba(255,120,160,0.95)');
  v.addColorStop(0.5, 'rgba(255,255,255,1)');
  v.addColorStop(0.53, 'rgba(255,120,160,0.95)');
  v.addColorStop(0.64, 'rgba(255,61,110,0.35)');
  v.addColorStop(1, 'rgba(255,61,110,0)');
  ctx.fillStyle = v;
  ctx.fillRect(0, 0, w, h);
  ctx.globalCompositeOperation = 'destination-in';
  const fade = ctx.createLinearGradient(0, 0, w, 0);
  fade.addColorStop(0, 'rgba(0,0,0,0)');
  fade.addColorStop(0.14, 'rgba(0,0,0,1)');
  fade.addColorStop(0.86, 'rgba(0,0,0,1)');
  fade.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = fade;
  ctx.fillRect(0, 0, w, h);
  texture.refresh();
  return key;
}

// "Scanned 1/3 | coin 100" in the store pill: a 3-slice, so the pill grows with its text and
// the rounded ends never stretch; the font shrinks before anything can leave the pill.
class ScanCounter {
  constructor(scene) {
    this.pill = scene.add.nineslice(0, 0, 'store-pill', undefined, 520, 183, 92, 92).setDepth(D.ui);
    this.label = addText(scene, 0, 0, '', { size: 18, weight: '700', color: '#5d4a6b', originX: 0 }).setDepth(D.ui + 1);
    this.coin = scene.add.image(0, 0, 'coin').setDepth(D.ui + 1);
    this.amount = addText(scene, 0, 0, '', { size: 18, weight: '700', color: '#b7604a', originX: 0 }).setDepth(D.ui + 1);
  }

  set(scanned, total, coins) {
    this.label.setText(`Scanned ${scanned}/${total}`);
    this.amount.setText(String(coins));
    if (this.box) this.layout(this.box);
  }

  layout({ cx, top, h, maxW }) {
    this.box = { cx, top, h, maxW };
    let size = Math.round(h * 0.44);
    const measure = () => {
      this.label.setFontSize(size);
      this.amount.setFontSize(size);
      const coin = size * 1.15;
      const gap = size * 0.4;
      return { coin, gap, content: this.label.width + gap * 1.6 + coin + gap * 0.6 + this.amount.width };
    };
    let m = measure();
    while (size > 12 && m.content + h * 0.9 > maxW) { size -= 1; m = measure(); }
    const w = Math.min(maxW, m.content + h * 0.9);
    const s = h / 183;
    this.pill.setSize(w / s, 183).setScale(s).setPosition(cx, top + h / 2);
    let x = cx - m.content / 2;
    const y = top + h / 2;
    this.label.setPosition(x, y);
    x += this.label.width + m.gap * 1.6;
    this.coin.setScale(m.coin / this.coin.height).setPosition(x + m.coin / 2, y);
    x += m.coin + m.gap * 0.6;
    this.amount.setPosition(x, y);
  }

  get bottom() { return this.box ? this.box.top + this.box.h : 0; }

  rect() {
    return { x: this.pill.x - this.pill.displayWidth / 2, y: this.pill.y - this.pill.displayHeight / 2, w: this.pill.displayWidth, h: this.pill.displayHeight };
  }
}

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
    pressable(this.back, { sound: 'close' });
    this.back.on('pointerup', () => this.backToShelves());
    this.coinPill = new CoinPill(this, this.services().save.snapshot().coins);
    // Scanner glass rim glow (scan success / paid green, declined red); replaces the old filled flash.
    this.glow = this.add.graphics().setDepth(D.shelf + 5).setAlpha(0);
    this.glowColor = SUCCESS;
    this.laserKey = laserTexture(this);
    this.screenText = addText(this, 0, 0, 'Scan Here', { size: 30, weight: '700', color: '#8a5a3c', stroke: '#ffffff', strokeWidth: 6 }).setDepth(D.shelf + 6);
    this.counter = new ScanCounter(this);
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
    this.drawGlow(this.glowColor);
    this.screenText.setFontSize(Math.round(clamp(this.glass.w * 0.13, 22, 40))).setPosition(this.glass.x + this.glass.w / 2, this.glass.y + this.glass.h * 0.12);
    this.scanPoint = { x: this.glass.x + this.glass.w / 2, y: this.glass.y + this.glass.h * 0.55 };

    // Low enough that the coin stack (1.3 × pill height) stays on screen.
    const topY = f.top + clamp(f.h * 0.065, 40, 58);
    const closeD = clamp(f.colW * 0.13, 44, 58);
    this.back.setScale(closeD / this.back.width).setPosition(uiLeft(f, clamp(f.colW * 0.04, 10, 18)) + closeD / 2, topY);
    const coinW = Math.min((topY - f.top - 3) / (0.69 * 0.352), clamp(f.colW * 0.4, 150, 220));
    this.coinPill.layout(f.spread ? uiRight(f) - coinW / 2 : f.cx + closeD * 0.2, topY, coinW);

    // Counter pill just below the scanner body, sized to its text.
    const counterH = Math.round(clamp(f.h * 0.058, 38, 54));
    this.counter.layout({ cx: f.cx, top: f.H * STORE_ART.scan.base + 4, h: counterH, maxW: Math.min(f.colW - 24, 340) });

    // Buy: bottom centre on phones; on wide screens beside the belt, so the belt gets the height.
    const payH = clamp(f.colW * 0.16, 56, 72);
    const margin = clamp(f.h * 0.03, 14, 28);
    this.pay.layout(f.cx, 0, payH);
    const payW = this.pay.skin.displayWidth;
    const beside = f.spread && (f.w - f.colW) / 2 >= payW + 2 * f.margin + 16;
    const gap = Math.max(8, f.h * 0.012);
    const beltTop = this.counter.bottom + gap;
    const beltBottom = beside ? f.bottom - margin : f.bottom - margin - payH - gap;
    const beltH = Math.max(40, beltBottom - beltTop);
    this.payX = beside ? f.cx + f.colW / 2 + 16 + payW / 2 : f.cx;
    this.payY = beside ? beltTop + beltH / 2 : f.bottom - margin - payH / 2;
    this.pay.layout(this.payX, this.payY, payH);
    const coinH = payH * 0.62;
    this.payCoin.setScale(coinH / this.payCoin.height).setPosition(this.payX - payW / 2 + coinH * 0.75, this.payY);
    this.pay.text.setX(coinH * 0.55);

    // Products on the belt, as big as the belt allows: one row (4–5 items overlap a little in a
    // staggered pile, as in the reference), or 3 + 2 when that is bigger.
    const n = this.items.length;
    const width = f.colW * 0.94;
    const cap = f.colW * (n <= 2 ? 0.4 : 0.3);
    const step = n >= 4 ? 0.84 : 1.06;
    const oneRow = Math.min(beltH * 0.82, width / ((n - 1) * step + 1), cap);
    const twoRows = n > 3 ? Math.min((beltH / 2) * 0.9, width / (3 * 1.04), cap) : 0;
    const rows = twoRows > oneRow ? [this.items.slice(0, 3), this.items.slice(3)] : [this.items];
    const size = Math.round(rows.length === 1 ? oneRow : twoRows);
    const rowH = beltH / rows.length;
    rows.forEach((row, r) => {
      row.forEach((item, c) => {
        const x = f.cx + (c - (row.length - 1) / 2) * size * (rows.length === 1 ? step : 1.06);
        const stagger = rows.length === 1 && n >= 4 ? (c % 2 ? 1 : -1) * size * 0.06 : 0;
        item.home = { x, y: beltTop + rowH * (r + 0.5) + stagger };
        item.size = size;
        if (!item.scanned && this.carry?.item !== item) item.image.setScale(Math.min(size / item.image.width, size / item.image.height)).setPosition(item.home.x, item.home.y);
      });
    });
    this.dialog?.layout(f);
  }

  setPayVisible(visible) {
    this.pay.root.setVisible(visible);
    this.payCoin.setVisible(visible);
    if (visible) this.pay.zone.setInteractive(); else this.pay.zone.disableInteractive();
  }

  updateReceipt() {
    const scanned = this.items.filter((i) => i.scanned);
    const coins = priceOf(scanned.map((i) => i.productId));
    this.receiptText = `Scanned ${scanned.length}/${this.items.length} · ${coins}`;
    this.counter.set(scanned.length, this.items.length, coins);
  }

  pick(item, pointer) {
    if (this.phase !== 'scanning' || item.scanned || this.carry) return;
    this.carry = { item, start: { x: pointer.worldX, y: pointer.worldY }, moved: 0 };
    this.sfx('select');
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

  // Rounded rim around the scanner glass in `color` (drawn once per layout; alpha animates).
  drawGlow(color) {
    const g = this.glass;
    if (!g) return;
    const r = Math.min(g.w, g.h) * STORE_ART.scan.glassRadius;
    const line = Math.max(4, g.w * 0.035);
    this.glow.clear();
    this.glow.fillStyle(color, 0.16).fillRoundedRect(g.x, g.y, g.w, g.h, r);
    this.glow.lineStyle(line * 2.2, color, 0.25).strokeRoundedRect(g.x - line * 0.4, g.y - line * 0.4, g.w + line * 0.8, g.h + line * 0.8, r);
    this.glow.lineStyle(line, color, 0.95).strokeRoundedRect(g.x, g.y, g.w, g.h, r);
  }

  pulseGlow(color, { peak = 1, hold = 0, rest = 0 } = {}) {
    this.glowColor = color;
    this.drawGlow(color);
    this.tweens.killTweensOf(this.glow);
    this.glow.setAlpha(0);
    this.tweens.add({ targets: this.glow, alpha: peak, duration: 120, ease: 'Sine.Out', onComplete: () => {
      this.tweens.add({ targets: this.glow, alpha: rest, duration: 420, delay: hold, ease: 'Sine.In' });
    } });
  }

  // The item flies into the scanner window and grows; a laser line sweeps over it top → bottom
  // with a soft glow; then success: green rim, check mark, a white flash on the item, "+price".
  scan(item) {
    item.scanned = true;
    const img = item.image;
    img.disableInteractive();
    img.setDepth(D.feedback - 2);
    const g = this.glass;
    const big = Math.min(g.w * 0.46, g.h * 0.5);
    const scale = Math.min(big / img.width, big / img.height);
    this.tweens.add({
      targets: img, x: this.scanPoint.x, y: this.scanPoint.y, scale, duration: 240, ease: 'Sine.Out',
      onComplete: () => this.sweep(item, scale),
    });
  }

  sweep(item, scale) {
    const img = item.image;
    const h = img.height * scale;
    const w = img.width * scale;
    const top = img.y - h * 0.55;
    const bottom = img.y + h * 0.55;
    const laser = this.add.image(img.x, top, this.laserKey).setDepth(D.feedback - 1).setBlendMode(Phaser.BlendModes.ADD);
    laser.setDisplaySize(Math.max(w * 1.5, this.glass.w * 0.62), Math.max(18, this.glass.h * 0.07));
    const halo = this.add.image(img.x, top, this.laserKey).setDepth(D.feedback - 3).setBlendMode(Phaser.BlendModes.ADD).setAlpha(0.45);
    halo.setDisplaySize(laser.displayWidth * 0.9, laser.displayHeight * 3.2);
    this.tweens.add({
      targets: [laser, halo], y: bottom, duration: 380, ease: 'Sine.InOut',
      onComplete: () => {
        this.tweens.add({ targets: [laser, halo], alpha: 0, duration: 140, onComplete: () => { laser.destroy(); halo.destroy(); } });
        this.scanned(item, scale);
      },
    });
  }

  scanned(item, scale) {
    const img = item.image;
    this.sfx('scan');
    this.pulseGlow(SUCCESS, { peak: 1, hold: 160 });
    img.setTintFill(0xffffff);
    this.time.delayedCall(70, () => img.clearTint());
    const s = img.displayHeight;
    const check = this.add.image(img.x + img.displayWidth * 0.42, img.y - s * 0.38, 'store-check').setDepth(D.feedback + 1);
    const checkSize = Math.max(30, s * 0.34);
    check.setScale(0);
    this.tweens.add({ targets: check, scale: checkSize / check.width, duration: 220, ease: 'Back.Out' });
    const price = STORE_PRODUCT_BY_ID[item.productId].price;
    const pop = addText(this, img.x - img.displayWidth * 0.1, img.y - s * 0.42, `+${price}`, { size: Math.round(clamp(s * 0.26, 22, 32)), weight: '700', color: '#ffffff', stroke: '#3f8f2a', strokeWidth: 6 }).setDepth(D.feedback + 1);
    this.tweens.add({ targets: pop, y: pop.y - 22, alpha: 0, duration: 760, delay: 120, onComplete: () => pop.destroy() });
    // Into the bag: the item and its check drop out of the window.
    this.tweens.add({ targets: [img, check], scale: 0, alpha: 0, duration: 220, delay: 380, onComplete: () => { img.setVisible(false); check.destroy(); } });
    this.updateReceipt();
    if (this.items.every((i) => i.scanned)) this.time.delayedCall(260, () => this.readyToPay());
  }

  // Buy before scanning: every item left on the belt goes over the scanner, then payment runs.
  autoScan() {
    this.phase = 'autoscan';
    this.buyAfterScan = true;
    this.setPayVisible(false);
    this.items.filter((i) => !i.scanned).forEach((item, n) => this.time.delayedCall(n * 420, () => this.scan(item)));
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
    this.sfx('card');
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
      this.sfx('purchase');
      this.pulseGlow(SUCCESS, { peak: 1, hold: 300 });
      burstHearts(this, this.scanPoint.x, this.scanPoint.y, { count: 8, size: 22, depth: D.feedback });
      this.time.delayedCall(1100, () => this.fadeTo('Meal', { orderId: this.orderId }));
      return;
    }
    this.phase = 'declined';
    this.sfx('wrong');
    this.screenText.setText(result.status === 'insufficient' ? 'Not enough coins!' : 'Payment failed');
    this.pulseGlow(DECLINE, { peak: 1, hold: 200, rest: 0.35 });
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
        primary: { label: 'Try again', onTap: () => { this.closeDialog(); this.phase = 'ready'; this.screenText.setText('All scanned!'); this.glow.setAlpha(0); this.setPayVisible(true); } },
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
      receiptText: this.receiptText,
      coinsText: this.coinPill.text.text,
      dialog: this.dialog ? this.dialog.title.text : null,
      result: this.result ? { status: this.result.status, total: this.result.total ?? null, missing: this.result.missing ?? null } : null,
      targets,
      rects: {
        back: imageRect(this.back), coins: this.coinPill.rect(), receipt: this.counter.rect(),
        ...(this.pay.root.visible ? { pay: this.pay.rect() } : {}),
        ...Object.fromEntries(this.items.filter((i) => !i.scanned).map((i) => [`item-${i.i}`, imageRect(i.image)])),
        ...(this.dialog ? this.dialog.rects() : {}),
      },
      save: this.services().save.snapshot(),
    };
  }
}
