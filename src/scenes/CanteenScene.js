import Phaser from 'phaser';
import { BaseScene } from './BaseScene.js';
import { clamp } from '../ui/layout.js';
import { addText } from '../ui/text.js';
import { appearanceTexture } from '../ui/appearanceTextures.js';
import { burstHearts, sparkle } from '../ui/actors.js';
import { GameDialog, TapButton } from '../ui/gameDialog.js';
import { CoinPill, ShopBackdrop, Toast, imageRect } from '../ui/storeViews.js';
import { CANTEEN_ART, CANTEEN_DEPTH as D } from '../ui/canteenViews.js';
import { CANTEEN_COUNTER, CANTEEN_FOOD_BY_ID, CANTEEN_TRAY_SLOTS } from '../content/canteen.js';
import { CanteenTray } from '../mechanics/CanteenTray.js';
import { createRunId } from '../core/createRunId.js';

const DRAG_START = 14;
// Where the tool is held: the bowl of the spoon/ladle sprites (bowl lower-left, handle up-right).
const TOOL_ORIGIN = { x: 0.24, y: 0.8 };

// Canteen (reference: reference/input/Canteen.png). Scoop a dish with the spoon (tap the dish,
// then a tray compartment — or drag from the dish to the compartment). Tap a filled
// compartment with an empty spoon to put the food back. Pay charges the wallet once through
// CanteenService; the paid tray is then eaten on stream, portion by portion.
export class CanteenScene extends BaseScene {
  constructor() { super('Canteen'); }

  init() {
    this.leaving = false;
    this.phase = 'serving';
    this.tray = new CanteenTray();
    this.selected = null;
    this.carry = null;
    this.dialog = null;
    this.result = null;
    this.lastAction = null;
    this.orderId = createRunId('canteen');
  }

  create() {
    this.coins = this.services().save.snapshot().coins;
    this.backdrop = new ShopBackdrop(this, 'canteen-background');
    this.close = this.add.image(0, 0, 'store-close').setDepth(D.ui).setInteractive({ useHandCursor: true });
    this.close.on('pointerup', () => { if (this.phase === 'serving') this.fadeTo('Home'); });
    this.coinPill = new CoinPill(this, this.coins);
    this.containers = CANTEEN_COUNTER.flatMap((row, r) => row.map((foodId, c) => {
      const food = CANTEEN_FOOD_BY_ID[foodId];
      const item = {
        food, row: r, col: c,
        image: this.add.image(0, 0, food.container).setOrigin(0.5, 1).setDepth(D.containers + r),
        tag: this.add.image(0, 0, 'store-price-tag').setDepth(D.containers + 3),
        price: addText(this, 0, 0, String(food.price), { size: 15, weight: '700', color: '#5d4a6b' }).setDepth(D.containers + 4),
      };
      item.image.setInteractive({ useHandCursor: true });
      item.image.on('pointerdown', (pointer) => this.pressDish(item, pointer));
      return item;
    }));
    this.trayImage = this.add.image(0, 0, 'canteen-tray').setDepth(D.tray);
    // Fixed tap areas (created once: Phaser hit-tests new objects only from the next frame).
    this.compartments = Array.from({ length: CANTEEN_TRAY_SLOTS }, (_, i) => {
      const zone = this.add.zone(0, 0, 10, 10).setDepth(D.portions + 2).setInteractive({ useHandCursor: true });
      zone.on('pointerup', () => this.tapCompartment(i));
      return { zone, portion: this.add.image(0, 0, 'canteen-rice').setDepth(D.portions).setVisible(false) };
    });
    this.spoon = this.add.image(0, 0, 'canteen-spoon').setOrigin(TOOL_ORIGIN.x, TOOL_ORIGIN.y).setDepth(D.spoon);
    this.scoop = this.add.image(0, 0, 'canteen-rice').setDepth(D.spoon + 1).setVisible(false);
    this.live = this.add.image(0, 0, 'store-live').setDepth(D.ui);
    this.liveAvatar = this.add.image(0, 0, appearanceTexture(this, 'avatar', this.services().save.snapshot().appearance.equipped)).setDepth(D.ui + 1);
    this.countPill = this.add.image(0, 0, 'store-pill').setDepth(D.ui);
    this.countText = addText(this, 0, 0, '', { size: 17, weight: '700', color: '#5d4a6b' }).setDepth(D.ui + 1);
    this.hintText = addText(this, 0, 0, 'Tap a dish, then a tray slot', { size: 18, weight: '700', color: '#7a5a8c', stroke: '#ffffff', strokeWidth: 5 }).setDepth(D.ui);
    this.pay = new TapButton(this, { skin: 'reward-button', label: 'Pay 0', onTap: () => this.payNow(), depth: D.ui + 2 });
    this.payCoin = this.add.image(0, 0, 'lobby-coins').setDepth(D.ui + 3);
    this.toast = new Toast(this);
    this.input.on('pointermove', this.moveCarry, this);
    this.input.on('pointerup', this.releaseCarry, this);
    this.input.on('pointerupoutside', this.releaseCarry, this);
    this.events.once('shutdown', () => {
      this.input.off('pointermove', this.moveCarry, this);
      this.input.off('pointerup', this.releaseCarry, this);
      this.input.off('pointerupoutside', this.releaseCarry, this);
    });
    this.bindViewport();
    this.refresh();
    this.cameras.main.fadeIn(260, 255, 240, 245);
  }

  layout(f) {
    const H = f.H;
    const colW = f.colW;
    const probe = this.backdrop.tiles[0];
    const imgW = probe.width * (H / probe.height);
    this.backdrop.layout(f, f.cx - imgW / 2);

    const topY = f.top + clamp(f.h * 0.065, 40, 58);
    const closeD = clamp(colW * 0.13, 44, 58);
    this.close.setScale(closeD / this.close.width).setPosition(f.colLeft + clamp(colW * 0.04, 10, 18) + closeD / 2, topY);
    this.coinPill.layout(f.cx + closeD * 0.2, topY, Math.min((topY - f.top - 3) / (0.69 * 0.352), clamp(colW * 0.4, 150, 220)));

    // Counter: three dishes per shelf, standing on the shelf with a price tag at the base.
    const step = Math.min(colW * 0.31, 190);
    for (const item of this.containers) {
      const shelf = CANTEEN_ART.shelves[item.row];
      const boxW = step * 0.9;
      const boxH = H * shelf.room;
      const x = f.cx + (item.col - 1) * step;
      const y = H * shelf.stand;
      item.image.setScale(Math.min(boxW / item.image.width, boxH / item.image.height)).setPosition(x, y);
      const tagW = Math.min(step * 0.6, 92);
      item.tag.setScale(tagW / item.tag.width).setPosition(x, y + item.tag.height * (tagW / item.tag.width) * 0.15);
      const tagH = item.tag.displayHeight;
      item.price.setFontSize(Math.round(clamp(tagH * 0.6, 12, 18))).setPosition(x - tagW / 2 + 0.6 * tagW, item.tag.y);
      item.home = { x, y: y - item.image.displayHeight * 0.45 };
    }

    // Tray on the lilac rail, compartments as tap areas.
    const t = this.trayImage;
    const bottomBand = clamp(f.h * 0.12, 74, 110);
    const trayMaxH = Math.min(H * 0.23, f.bottom - bottomBand - (H * CANTEEN_ART.shelves[1].stand + 30));
    const ts = Math.min((colW * 0.8) / t.width, trayMaxH / t.height);
    const trayY = Math.min(H * CANTEEN_ART.trayCenter, f.bottom - bottomBand - (t.height * ts) / 2);
    t.setScale(ts).setPosition(f.cx, trayY);
    const left = t.x - t.displayWidth / 2;
    const top = t.y - t.displayHeight / 2;
    this.compartments.forEach((c, i) => {
      const r = CANTEEN_ART.compartments[i];
      const cx = left + (r.x + r.w / 2) * t.displayWidth;
      const cy = top + (r.y + r.h / 2) * t.displayHeight;
      const w = r.w * t.displayWidth;
      const h = r.h * t.displayHeight;
      c.center = { x: cx, y: cy };
      c.size = Math.min(w, h) * 0.95;
      c.rect = { x: cx - w / 2, y: cy - h / 2, w, h };
      c.zone.setPosition(cx, cy).setSize(w, h);
      c.zone.input.hitArea.setSize(w, h);
      if (c.portion.visible) c.portion.setScale(Math.min(c.size / c.portion.width, c.size / c.portion.height)).setPosition(cx, cy);
    });

    // Bottom band: live card (left), count pill + Pay / hint (right).
    const bandTop = t.y + t.displayHeight / 2 + 8;
    const bandH = f.bottom - bandTop - clamp(f.h * 0.012, 6, 12);
    const liveH = Math.min(bandH, colW * 0.34);
    this.live.setScale(liveH / this.live.height).setPosition(f.colLeft + clamp(colW * 0.03, 8, 14) + this.live.displayWidth / 2, bandTop + bandH - liveH / 2);
    this.liveAvatar.setScale((this.live.displayWidth * 0.78) / Math.max(this.liveAvatar.width, this.liveAvatar.height)).setPosition(this.live.x, this.live.y - liveH * 0.06);
    const restLeft = this.live.x + this.live.displayWidth / 2 + 8;
    const restRight = f.colRight - clamp(colW * 0.03, 8, 14);
    const restCx = (restLeft + restRight) / 2;
    const payH = Math.min(clamp(colW * 0.16, 54, 70), bandH * 0.62);
    this.payY = bandTop + bandH - payH / 2 - 2;
    this.pay.layout(restCx, this.payY, payH);
    const coinH = payH * 0.62;
    this.payCoin.setScale(coinH / this.payCoin.height).setPosition(restCx - this.pay.skin.displayWidth / 2 + coinH * 0.75, this.payY);
    this.pay.text.setX(coinH * 0.55);
    this.hintText.setFontSize(Math.round(clamp(colW * 0.045, 15, 20))).setPosition(restCx, this.payY);
    const pillW = clamp(colW * 0.2, 70, 100);
    // Portion counter sits in the bottom band, above the Pay button's right end.
    this.countPill.setScale(pillW / this.countPill.width);
    this.countPill.setPosition(restRight - pillW / 2, Math.max(bandTop + this.countPill.displayHeight / 2, this.payY - payH / 2 - this.countPill.displayHeight / 2 - 4));
    this.countText.setFontSize(Math.round(this.countPill.displayHeight * 0.55)).setPosition(this.countPill.x, this.countPill.y);

    // Spoon rests at the right edge of the tray when idle.
    this.spoonRest = { x: Math.min(t.x + t.displayWidth / 2 - 6, restRight - 30), y: t.y + t.displayHeight * 0.2 };
    this.toolSize = clamp(colW * 0.2, 70, 110);
    if (!this.carry && !this.spoonMoving) this.placeSpoon(this.selected ? this.containerOf(this.selected).home : this.spoonRest);
    this.dialog?.layout(f);
    this.layoutRects = {
      close: imageRect(this.close), coins: this.coinPill.rect(), tray: imageRect(t), live: imageRect(this.live), count: imageRect(this.countPill),
      ...(this.pay.root.visible ? { pay: this.pay.rect() } : {}),
      ...Object.fromEntries(this.containers.map((c) => [`dish-${c.food.id}`, imageRect(c.image)])),
      ...Object.fromEntries(this.containers.map((c) => [`tag-${c.food.id}`, imageRect(c.tag)])),
    };
  }

  containerOf(foodId) { return this.containers.find((c) => c.food.id === foodId); }

  setTool(foodId) {
    const tool = foodId && CANTEEN_FOOD_BY_ID[foodId].tool === 'ladle' ? 'canteen-ladle' : 'canteen-spoon';
    this.spoon.setTexture(tool).setScale(this.toolSize / Math.max(this.spoon.width, this.spoon.height));
    if (foodId) {
      const portion = CANTEEN_FOOD_BY_ID[foodId].portion;
      const s = this.toolSize * 0.42;
      this.scoop.setTexture(portion).setVisible(true).setScale(Math.min(s / this.scoop.width, s / this.scoop.height));
    } else {
      this.scoop.setVisible(false);
    }
  }

  placeSpoon(p) {
    this.setTool(this.selected);
    this.spoon.setPosition(p.x, p.y);
    this.scoop.setPosition(p.x, p.y - this.scoop.displayHeight * 0.2);
  }

  moveSpoon(p, onDone) {
    this.spoonMoving = true;
    this.tweens.killTweensOf([this.spoon, this.scoop]);
    this.tweens.add({ targets: this.spoon, x: p.x, y: p.y, duration: 200, ease: 'Sine.Out' });
    this.tweens.add({ targets: this.scoop, x: p.x, y: p.y - this.scoop.displayHeight * 0.2, duration: 200, ease: 'Sine.Out', onComplete: () => { this.spoonMoving = false; onDone?.(); } });
  }

  // ---------------------------------------------------------------- serving
  pressDish(item, pointer) {
    if (this.phase !== 'serving' || this.dialog || this.carry) return;
    this.carry = { item, start: { x: pointer.worldX, y: pointer.worldY }, moved: 0, dragging: false };
  }

  moveCarry(pointer) {
    const c = this.carry;
    if (!c) return;
    c.moved = Math.max(c.moved, Phaser.Math.Distance.Between(pointer.worldX, pointer.worldY, c.start.x, c.start.y));
    if (c.moved > DRAG_START) {
      if (!c.dragging) { c.dragging = true; this.scoopFrom(c.item, false); }
      this.tweens.killTweensOf([this.spoon, this.scoop]);
      this.spoonMoving = false;
      this.spoon.setPosition(pointer.worldX, pointer.worldY);
      this.scoop.setPosition(pointer.worldX, pointer.worldY - this.scoop.displayHeight * 0.2);
    }
  }

  releaseCarry(pointer) {
    const c = this.carry;
    if (!c) return;
    this.carry = null;
    if (!c.dragging) {
      // Tap: toggle the scoop of this dish.
      if (this.selected === c.item.food.id) { this.selected = null; this.lastAction = 'deselected'; this.moveSpoon(this.spoonRest, () => this.setTool(null)); this.refresh(); return; }
      this.scoopFrom(c.item, true);
      return;
    }
    const target = this.compartments.findIndex((comp) => {
      const r = comp.rect;
      return pointer.worldX >= r.x && pointer.worldX <= r.x + r.w && pointer.worldY >= r.y && pointer.worldY <= r.y + r.h;
    });
    if (target >= 0) this.serveInto(target);
    else this.moveSpoon(this.containerOf(this.selected).home);
  }

  scoopFrom(item, animate) {
    this.selected = item.food.id;
    this.lastAction = 'scooped';
    this.setTool(this.selected);
    const s = item.image.scale;
    this.tweens.add({ targets: item.image, scaleY: s * 0.94, duration: 80, yoyo: true, onComplete: () => item.image.setScale(s) });
    if (animate) this.moveSpoon(item.home);
    this.refresh();
  }

  tapCompartment(i) {
    if (this.phase !== 'serving' || this.dialog || this.carry) return;
    if (this.selected) { this.serveInto(i); return; }
    const removed = this.tray.remove(i);
    if (removed.status === 'removed') {
      this.lastAction = 'removed';
      const c = this.compartments[i];
      const home = this.containerOf(removed.food).home;
      const ghost = this.add.image(c.portion.x, c.portion.y, c.portion.texture.key).setScale(c.portion.scale).setDepth(D.feedback);
      c.portion.setVisible(false);
      this.tweens.add({ targets: ghost, x: home.x, y: home.y, scale: ghost.scale * 0.6, alpha: 0.3, duration: 280, ease: 'Sine.In', onComplete: () => ghost.destroy() });
      this.refresh();
    } else {
      this.toast.show('Tap a dish to scoop it first', this.frame, this.trayImage.y - this.trayImage.displayHeight * 0.7);
    }
  }

  serveInto(i) {
    const foodId = this.selected;
    const result = this.tray.place(i, foodId);
    if (result.status === 'unknown' || result.status === 'bad-slot') return;
    this.lastAction = result.status;
    this.selected = null;
    const c = this.compartments[i];
    this.moveSpoon(c.center, () => {
      this.setTool(null);
      c.portion.setTexture(CANTEEN_FOOD_BY_ID[foodId].portion).setVisible(true);
      const s = Math.min(c.size / c.portion.width, c.size / c.portion.height);
      c.portion.setPosition(c.center.x, c.center.y).setScale(s * 1.25);
      this.tweens.add({ targets: c.portion, scale: s, duration: 200, ease: 'Back.Out' });
      sparkle(this, c.center.x, c.center.y, { count: 5, radius: 40, depth: D.feedback });
      this.moveSpoon(this.spoonRest);
    });
    this.refresh();
  }

  refresh() {
    const { count, total } = this.tray.snapshot();
    this.countText.setText(`${count}/${CANTEEN_TRAY_SLOTS}`);
    const ready = count > 0 && this.phase === 'serving';
    this.pay.root.setVisible(ready);
    this.payCoin.setVisible(ready);
    if (ready) this.pay.zone.setInteractive(); else this.pay.zone.disableInteractive();
    this.pay.text.setText(`Pay ${total}`);
    this.pay.text.setColor(total > this.coins ? '#ffe0e0' : '#ffffff');
    this.hintText.setVisible(!ready && this.phase === 'serving');
    this.hintText.setText(this.selected ? 'Now tap a tray slot' : 'Tap a dish, then a tray slot');
    for (const c of this.containers) c.image.setTint(this.selected === c.food.id ? 0xfff2b0 : 0xffffff);
  }

  // ---------------------------------------------------------------- payment
  async payNow() {
    if (this.phase !== 'serving' || !this.tray.count || this.dialog) return;
    this.phase = 'paying';
    this.refresh();
    let result;
    try {
      result = await this.services().canteen.pay({ orderId: this.orderId, items: this.tray.items() });
    } catch (error) {
      console.error(error);
      result = { status: 'error' };
    }
    this.result = result;
    if (result.status === 'paid') {
      this.phase = 'paid';
      this.coinPill.animateTo(result.state.coins);
      this.coins = result.state.coins;
      burstHearts(this, this.trayImage.x, this.trayImage.y - 20, { count: 8, size: 22, depth: D.feedback });
      this.toast.show('Paid! Enjoy your meal', this.frame, this.trayImage.y - this.trayImage.displayHeight * 0.7, 0x3f8f2a);
      this.time.delayedCall(1000, () => this.fadeTo('Meal', { orderId: this.orderId }));
      return;
    }
    this.phase = 'serving';
    this.refresh();
    this.dialog = new GameDialog(this, result.status === 'insufficient'
      ? {
        title: 'Not enough coins',
        body: `This tray costs ${result.total}, you have ${result.coins}.\nYou need ${result.missing} more. Take something off the tray or earn coins at the Part Time Job.`,
        primary: { label: 'Change tray', onTap: () => this.closeDialog() },
        secondary: { label: 'Home', onTap: () => this.fadeTo('Home') },
      }
      : {
        title: 'Payment failed',
        body: 'Nothing was charged. Please try again.',
        primary: { label: 'OK', onTap: () => this.closeDialog() },
      });
    this.dialog.layout(this.frame);
  }

  closeDialog() { this.dialog?.destroy(); this.dialog = null; }

  getDebugSnapshot() {
    const targets = { close: { x: this.close.x, y: this.close.y } };
    for (const c of this.containers) targets[`dish:${c.food.id}`] = { x: c.image.x, y: c.image.y - c.image.displayHeight / 2 };
    this.compartments.forEach((c, i) => { targets[`slot:${i}`] = c.center; });
    if (this.pay.root.visible) targets.pay = this.pay.center();
    Object.assign(targets, this.dialog ? this.dialog.targets() : {});
    return {
      scene: 'Canteen',
      phase: this.phase,
      orderId: this.orderId,
      tray: this.tray.snapshot(),
      selected: this.selected,
      lastAction: this.lastAction,
      portions: this.compartments.map((c) => (c.portion.visible ? c.portion.texture.key : null)),
      countText: this.countText.text,
      payText: this.pay.text.text,
      coinsText: this.coinPill.text.text,
      dialog: this.dialog ? this.dialog.title.text : null,
      toast: this.toast.message,
      result: this.result ? { status: this.result.status, total: this.result.total ?? null, missing: this.result.missing ?? null } : null,
      targets,
      rects: { ...this.layoutRects, ...(this.dialog ? this.dialog.rects() : {}) },
      save: this.services().save.snapshot(),
    };
  }
}
