import { BaseScene } from './BaseScene.js';
import { clamp, computeLobbyRegions } from '../ui/layout.js';
import { Hud } from '../ui/hud.js';
import { burstHearts } from '../ui/actors.js';
import { addText } from '../ui/text.js';
import { PART_TIME_JOB, PART_TIME_PRODUCT_BY_ID } from '../content/partTime.js';
import { PartTimeShift } from '../mechanics/PartTimeShift.js';
import { createRunId } from '../core/createRunId.js';
import { PTJ_ART, PTJ_DEPTH, ProductCard, ProgressPill, RequestBubble, ShiftDialog, TimerBar } from '../ui/partTimeViews.js';

// Part Time Job minigame (reference: reference/input/PartTimeJob.png).
// Phases: intro → serving ⇄ between → won | failed. The shift clock only runs while serving,
// not paused (gear / platform) and with no dialog open. Coins are granted once per shift via
// RewardService (receipt part-time:<runId>) before the success card is shown.
export class PartTimeScene extends BaseScene {
  constructor() { super('PartTime'); }

  init() {
    this.leaving = false;
    this.phase = 'intro';
    this.paused = false;
    this.platformPaused = false;
    this.dialog = null;
    this.runId = createRunId('part-time');
    this.shift = new PartTimeShift({ config: PART_TIME_JOB });
    this.reward = null;
    this.lastEvent = null;
  }

  create() {
    const save = this.services().save.snapshot();
    // Shop picture: index 0 is centred on the column; wide screens add mirrored copies at the
    // sides (flipX alternates, so every seam matches). Each copy has a counter twin cropped
    // below the counter's back edge, drawn in front of the customer to hide the waist.
    this.shopTiles = [];
    this.addShopTile();
    this.customer = this.add.image(0, 0, this.shift.order.customer).setOrigin(0.5, 1).setDepth(PTJ_DEPTH.customer);
    this.hud = new Hud(this, { name: 'User', level: save.highestLevel, coins: save.coins, xp: 0.5, appearance: save.appearance.equipped });
    this.hud.coin.setTexture('lobby-coins');
    this.gear = this.add.image(0, 0, 'settings').setDepth(PTJ_DEPTH.hud + 1).setInteractive({ useHandCursor: true });
    this.gear.on('pointerup', () => this.openPause());
    this.bubble = new RequestBubble(this);
    this.timer = new TimerBar(this);
    this.progress = new ProgressPill(this);
    this.cards = Array.from({ length: PART_TIME_JOB.optionsPerCustomer }, () => new ProductCard(this, (id, card) => this.serve(id, card)));
    this.penalty = addText(this, 0, 0, '', { size: 22, weight: '700', color: '#ff4f4f', stroke: '#ffffff', strokeWidth: 5 }).setDepth(PTJ_DEPTH.feedback).setVisible(false);
    this.showOrder();
    this.unsubscribePlatform = this.services().platform.subscribe((state) => { this.platformPaused = Boolean(state?.paused); });
    this.events.once('shutdown', () => this.unsubscribePlatform?.());
    this.bindViewport();
    this.openDialog({
      title: 'Part Time Job',
      body: `Serve ${PART_TIME_JOB.customers} customers!\nTap the items in the order shown in the bubble.\nEach customer waits only ${PART_TIME_JOB.customerMs / 1000} seconds.`,
      primary: { label: 'Start', onTap: () => this.startShift() },
      secondary: { label: 'Home', onTap: () => this.goHome() },
    });
    this.cameras.main.fadeIn(260, 255, 240, 245);
  }

  addShopTile() {
    const bg = this.add.image(0, 0, 'ptj-background').setOrigin(0.5, 0).setDepth(PTJ_DEPTH.background);
    const counter = this.add.image(0, 0, 'ptj-background').setOrigin(0.5, 0).setDepth(PTJ_DEPTH.counter);
    counter.setCrop(0, counter.height * PTJ_ART.counterTop, counter.width, counter.height);
    this.shopTiles.push({ bg, counter });
  }

  layoutShop(f, counterY) {
    const { bg: img } = this.shopTiles[0];
    const c = PTJ_ART.counterTop;
    const scale = Math.max(f.colW / img.width, counterY / (c * img.height), (f.H - counterY) / ((1 - c) * img.height));
    const top = counterY - c * img.height * scale;
    const w = img.width * scale;
    const perSide = Math.min(3, Math.max(0, Math.ceil((f.W / 2 - w / 2) / w)));
    while (this.shopTiles.length < 1 + perSide * 2) this.addShopTile();
    this.shopTiles.forEach((tile, i) => {
      const k = i === 0 ? 0 : Math.ceil(i / 2) * (i % 2 ? -1 : 1);
      const used = Math.abs(k) <= perSide;
      for (const image of [tile.bg, tile.counter]) image.setVisible(used).setScale(scale).setFlipX(Math.abs(k) % 2 === 1).setPosition(f.cx + k * w, top);
    });
  }

  showOrder() {
    const s = this.shift.status();
    s.options.forEach((id, i) => this.cards[i].setProduct(PART_TIME_PRODUCT_BY_ID[id]));
    this.bubble.setRequest(s.request, PART_TIME_PRODUCT_BY_ID);
    this.customer.setTexture(this.shift.order.customer);
    this.progress.set(s.served, s.customers);
    this.timer.draw(s.timeFraction);
    if (this.frame) this.layout(this.frame);
  }

  layout(f) {
    const r = computeLobbyRegions(f);
    const counterY = Math.round(f.top + f.h * 0.655);
    this.layoutShop(f, counterY);

    const gearSize = r.sizes.gear;
    this.hud.layoutLobby(f, r.hud, gearSize);
    this.gear.setScale((gearSize * 0.92) / Math.max(this.gear.width, this.gear.height)).setPosition(r.hud.x + r.hud.w - gearSize / 2, r.hud.y + r.hud.h / 2);
    const hudBottom = r.hud.y + r.hud.h;

    // Bubble: nearly the whole column wide, just under the HUD (room for the arrow above).
    const bubbleW = Math.min(f.colW * 0.97, f.h * 0.62, 560);
    const bubbleTop = hudBottom + clamp(f.h * 0.035, 18, 34);
    this.bubble.layout(f.cx, bubbleTop, bubbleW);
    const bubbleBottom = bubbleTop + this.bubble.bubble.displayHeight;

    // Customer stands behind the counter; one common scale for every customer sprite.
    const hidden = f.h * 0.02;
    const base = 600;
    const custScale = Math.min((f.h * 0.33) / base, (f.colW * 0.56) / 526, (counterY + hidden - bubbleBottom - 6) / 658);
    this.customerScale = custScale;
    this.customerHome = { x: f.cx, y: counterY + hidden };
    this.customer.setScale(custScale).setY(this.customerHome.y);
    // A walk-in/out tween owns X during the customer change.
    if (!this.transitioning) this.customer.setX(this.customerHome.x);

    // Timer column on the left, between the bubble and the counter.
    const timerBottom = counterY - f.h * 0.045;
    const timerTop = Math.max(bubbleBottom + f.h * 0.03, timerBottom - f.h * 0.22);
    const timerH = Math.max(90, timerBottom - timerTop);
    this.timer.layout(f.colLeft + clamp(f.colW * 0.09, 26, 48), timerTop, timerH);

    // Product cards: three across the counter front.
    const cardH = Math.round(Math.min((f.colW * 0.28) / 0.776, f.h * 0.19, 220));
    const cardY = Math.min(f.top + f.h * 0.835, f.bottom - clamp(f.h * 0.03, 12, 30) - cardH / 2);
    const spacing = Math.min(f.colW * 0.315, cardH * 0.776 * 1.22);
    this.cards.forEach((card, i) => card.layout(f.cx + (i - 1) * spacing, cardY, cardH));

    // Customer counter pill, right side just under the counter edge.
    const pillW = clamp(f.colW * 0.31, 110, 170);
    const pillY = counterY + clamp(f.h * 0.045, 22, 40);
    this.progress.layout(f.colRight - clamp(f.colW * 0.03, 8, 16), pillY, pillW);

    this.dialog?.layout(f);
    this.layoutRects = {
      ...this.hud.rects,
      gear: { x: this.gear.x - this.gear.displayWidth / 2, y: this.gear.y - this.gear.displayHeight / 2, w: this.gear.displayWidth, h: this.gear.displayHeight },
      bubble: this.bubble.rect(),
      timer: this.timer.rect(),
      progress: this.progress.rect(),
      ...Object.fromEntries(this.cards.map((card, i) => [`card-${i}`, card.rect()])),
    };
  }

  update(_time, delta) {
    if (this.phase !== 'serving' || this.paused || this.platformPaused || this.dialog) return;
    const result = this.shift.tick(Math.min(delta, 250));
    this.timer.draw(this.shift.status().timeFraction);
    if (result?.event === 'timeout') this.fail();
  }

  startShift() {
    this.closeDialog();
    this.phase = 'serving';
  }

  serve(productId, card) {
    if (this.phase !== 'serving' || this.paused || this.dialog) return;
    const result = this.shift.serve(productId);
    this.lastEvent = result.event;
    if (result.event === 'ignored') return;
    if (result.event === 'wrong' || result.event === 'timeout') {
      card.shake();
      this.timer.flash();
      this.timer.draw(this.shift.status().timeFraction);
      this.showPenalty();
      this.tweens.add({ targets: this.customer, x: this.customerHome.x + 6, duration: 50, yoyo: true, repeat: 2 });
      if (result.event === 'timeout') this.fail();
      return;
    }
    card.pop();
    this.bubble.setProgress(this.shift.progress);
    if (result.event === 'customer-served' || result.event === 'shift-complete') this.customerServed(result.event === 'shift-complete');
  }

  showPenalty() {
    const t = this.timer.rect();
    this.penalty.setText(`-${PART_TIME_JOB.wrongPenaltyMs / 1000}s`).setFontSize(Math.round(clamp(this.frame.h * 0.028, 18, 26)))
      .setPosition(t.x + t.w / 2 + 6, t.y - 8).setVisible(true).setAlpha(1);
    this.tweens.killTweensOf(this.penalty);
    this.tweens.add({ targets: this.penalty, y: this.penalty.y - 26, alpha: 0, duration: 800, onComplete: () => this.penalty.setVisible(false) });
  }

  customerServed(last) {
    this.phase = last ? 'won' : 'between';
    const s = this.shift.status();
    this.progress.set(s.served, s.customers);
    const head = { x: this.customer.x, y: this.customer.y - this.customer.displayHeight * 0.7 };
    burstHearts(this, head.x, head.y, { count: 7, size: 20, depth: PTJ_DEPTH.feedback });
    if (last) {
      this.time.delayedCall(650, () => this.win());
      return;
    }
    // Customer leaves to the right, the next one walks in from the left.
    const f = this.frame;
    this.transitioning = true;
    this.time.delayedCall(420, () => {
      this.bubble.setVisible(false);
      this.tweens.add({
        targets: this.customer, x: f.W + this.customer.displayWidth, duration: 280, ease: 'Sine.In',
        onComplete: () => {
          this.shift.nextCustomer();
          this.showOrder();
          this.bubble.setVisible(false);
          this.customer.setX(-this.customer.displayWidth);
          this.tweens.add({
            targets: this.customer, x: this.customerHome.x, duration: 300, ease: 'Back.Out',
            onComplete: () => { this.transitioning = false; this.bubble.setVisible(true); this.bubble.setRequest(this.shift.order.request, PART_TIME_PRODUCT_BY_ID); this.phase = 'serving'; },
          });
        },
      });
    });
  }

  async win() {
    let result;
    try {
      result = await this.services().rewards.grantPartTimeShift({ runId: this.runId, coins: PART_TIME_JOB.reward });
    } catch (error) {
      console.error(error);
      result = null;
    }
    this.reward = result;
    if (result) this.hud.setCoins(result.state.coins);
    this.openDialog({
      title: 'Shift complete!',
      body: result ? `All ${PART_TIME_JOB.customers} customers are happy.` : 'Could not save the reward. Please try again.',
      coins: result ? result.coins : null,
      primary: { label: 'Collect', onTap: () => this.goHome() },
      secondary: { label: 'Work again', onTap: () => this.restart() },
    });
    if (result?.applied) this.hud.bumpCoins();
  }

  fail() {
    this.phase = 'failed';
    this.timer.draw(0);
    const s = this.shift.status();
    this.openDialog({
      title: "Time's up!",
      body: `You served ${s.served} of ${s.customers} customers.\nNo reward this time.`,
      primary: { label: 'Try again', onTap: () => this.restart() },
      secondary: { label: 'Home', onTap: () => this.goHome() },
    });
  }

  openPause() {
    if (this.dialog || this.leaving || this.phase === 'won' || this.phase === 'failed') return;
    this.paused = true;
    this.openDialog({
      title: 'Paused',
      body: 'Leaving now ends the shift without a reward.',
      primary: { label: 'Resume', onTap: () => { this.closeDialog(); this.paused = false; } },
      secondary: { label: 'Quit', onTap: () => this.goHome() },
    });
  }

  openDialog(options) {
    this.closeDialog();
    this.dialog = new ShiftDialog(this, options);
    if (this.frame) this.dialog.layout(this.frame);
  }

  closeDialog() {
    this.dialog?.destroy();
    this.dialog = null;
  }

  restart() {
    if (this.leaving) return;
    this.leaving = true;
    this.cameras.main.fadeOut(220, 255, 240, 245);
    this.cameras.main.once('camerafadeoutcomplete', () => this.scene.restart());
  }

  goHome() { this.fadeTo('Home'); }

  getDebugSnapshot() {
    const s = this.shift.status();
    const targets = { gear: { x: this.gear.x, y: this.gear.y }, ...(this.dialog ? this.dialog.targets() : {}) };
    this.cards.forEach((card) => { if (card.product) targets[`card:${card.product.id}`] = card.center(); });
    return {
      scene: 'PartTime',
      phase: this.phase,
      paused: this.paused,
      dialog: this.dialog ? this.dialog.title.text : null,
      shift: s,
      runId: this.runId,
      lastEvent: this.lastEvent,
      reward: this.reward ? { applied: this.reward.applied, coins: this.reward.coins } : null,
      hudCoins: Number(this.hud.coinText.text),
      progressText: this.progress.text.text,
      timerFill: this.timer.fraction,
      slots: this.bubble.slots.slice(0, s.request.length).map((slot, i) => ({ ...this.bubble.slotCenter(i), revealed: i < this.bubble.progress, silhouette: slot.icon.isTinted && slot.icon.tintFill })),
      customer: this.customer.texture.key,
      targets,
      rects: { ...this.layoutRects, ...(this.dialog ? this.dialog.rects() : {}) },
      save: this.services().save.snapshot(),
    };
  }
}
