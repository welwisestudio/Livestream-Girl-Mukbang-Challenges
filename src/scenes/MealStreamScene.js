import { BaseScene } from './BaseScene.js';
import { DEPTH, clamp, uiLeft, uiRight } from '../ui/layout.js';
import { RoomBackground } from '../ui/background.js';
import { Hud } from '../ui/hud.js';
import { HeaderPill, CommentFeed } from '../ui/panels.js';
import { HintHand, Streamer, burstHearts, sparkle } from '../ui/actors.js';
import { GameDialog } from '../ui/gameDialog.js';
import { FeedMechanic } from '../mechanics/FeedMechanic.js';
import { FOOD_BY_ID, STREAM_DONATIONS } from '../content/food.js';
import { VIEWER_AVATARS } from '../content/assets.js';
import { TIMINGS } from '../content/timings.js';
import { CANTEEN_ART } from '../ui/canteenViews.js';
import { DONOR_NAMES, DonationCounter, flyCoins } from '../ui/donations.js';

const COMMENTS = {
  store: ['Yummy haul!', 'What did you buy?', 'That snack looks so good!', 'Crunchy ASMR please!', 'I want that one!', 'Matcha queen!', 'Save me a bite!'],
  canteen: ['School lunch vibes!', 'That tray looks perfect!', 'Rice and chicken, yes!', 'Soup first!', 'So cozy!', 'I miss canteen food!', 'Big bite please!'],
};
const BITES = 2;
const BACK = { store: 'Store', canteen: 'Canteen' };

// Mukbang of a paid food order (Supermarket snacks or a Canteen tray). The servings ARE the
// order: exactly the items paid for. Each item leaves the order only after it is eaten, so
// leaving early keeps the rest for next time. Snacks stand on the table; a canteen meal is
// served on the same purple tray, each portion in the compartment it was put in.
//
// Supermarket streams earn viewer donations (STREAM_DONATIONS): FoodOrderService records an
// item's donations when she starts eating it, and only then do gold chat bubbles send coins
// flying into the "earned" counter (one per bite, plus a cheer when the item is finished). The
// last eaten item pays the stream total into the balance in the same save step; the
// "Delicious!" card shows that total and flies it into the wallet.
export class MealStreamScene extends BaseScene {
  constructor() { super('Meal'); }

  init(data) {
    this.orderId = data?.orderId ?? null;
    this.phase = 'live';
    this.leaving = false;
    this.eaten = 0;
    this.dialog = null;
    this.flights = 0;
    this.donorIndex = 0;
    this.lastConsume = Promise.resolve(null);
    this.result = null;
    this.paidOut = false;
  }

  create() {
    const orders = this.services().orders;
    this.order = (this.orderId && orders.find(this.orderId)) || orders.orders()[0] || null;
    if (!this.order) { this.scene.start('Home'); return; }
    this.orderId = this.order.id;
    this.source = this.order.source;
    const save = this.services().save.snapshot();
    this.room = new RoomBackground(this);
    this.hud = new Hud(this, { level: save.highestLevel, coins: save.coins });
    this.streamer = new Streamer(this);
    this.header = new HeaderPill(this, { label: 'LIVE' });
    this.feed = new CommentFeed(this, { comments: COMMENTS[this.source], avatars: VIEWER_AVATARS, max: 2 });
    this.hint = new HintHand(this);
    this.viewers = 980;
    this.counter = STREAM_DONATIONS[this.source] ? new DonationCounter(this, { value: this.order.earned ?? 0 }) : null;
    this.tray = this.source === 'canteen' ? this.add.image(0, 0, 'canteen-tray').setDepth(DEPTH.food - 1) : null;
    this.servings = this.order.items.map((item, id) => ({
      id, key: item.key, food: item.food, slot: item.slot,
      image: this.add.image(0, 0, FOOD_BY_ID[item.food].texture).setDepth(DEPTH.food),
      zone: this.add.zone(0, 0, 10, 10).setDepth(DEPTH.food + 5).setInteractive({ useHandCursor: true }),
      eaten: false,
    }));
    this.feedMechanic = new FeedMechanic(this, {
      servings: this.servings,
      getMouth: () => this.streamer.mouth(),
      onPickUp: (serving) => this.pickUp(serving),
      onCancel: (serving, piece) => this.putBack(serving, piece),
      onInvalid: () => {},
      onFeed: (serving, piece, done) => this.eat(serving, piece, done),
    });
    this.events.once('shutdown', () => { this.feedMechanic?.dispose(); this.feed?.destroy(); this.viewerTimer?.remove(); });
    this.bindViewport();
    this.streamer.idle();
    this.feed.start(TIMINGS.commentIntervalMs * 1.2);
    this.viewerTimer = this.time.addEvent({ delay: 900, loop: true, callback: () => { this.viewers += Math.floor(30 + Math.random() * 90); this.header.setLabel(`LIVE  ${this.formatViewers()}`); } });
    this.header.setLabel(`LIVE  ${this.formatViewers()}`);
    this.cameras.main.fadeIn(260, 255, 240, 245);
  }

  formatViewers() { return this.viewers >= 1000 ? `${(this.viewers / 1000).toFixed(1)}K` : String(this.viewers); }

  layout(f) {
    const gap = Math.round(clamp(f.h * 0.016, 8, 16));
    const headerH = Math.round(clamp(22 * f.ui, 20, 28) * 2.15);
    const headerY = f.hud.bottom + gap + headerH / 2;
    const tableY = Math.round(f.top + f.h * (f.short ? 0.56 : 0.53));
    const stageTop = headerY + headerH / 2 + gap;
    const charH = clamp(Math.min((tableY - stageTop) / 0.8, f.colW * 0.84), 190, 440);
    this.room.layout(f, tableY);
    this.hud.layout(f);
    const live = this.header.layout({ x: f.cx, y: headerY, frame: f });
    if (this.counter) {
      // Earned-coins pill at the right edge of the LIVE row; LIVE moves left when the two do not
      // fit centred (its label grows with the viewer count, so some room is reserved).
      const right = uiRight(f, f.pad);
      const { width: cw } = this.counter.layout({ right, y: headerY, frame: f });
      const reserve = live.width + Math.round(clamp(22 * f.ui, 20, 28)) * 1.2;
      if (f.cx + reserve / 2 > right - cw - gap) this.header.layout({ x: uiLeft(f, f.pad) + reserve / 2, y: headerY, frame: f });
    }
    this.streamer.layout({ x: f.cx, bottom: tableY + charH * 0.2, height: charH });
    const feedH = Math.round(clamp(15 * f.ui, 14, 18) * 2.1) * 2 + 8;
    const bottomLimit = f.bottom - clamp(f.h * 0.03, 14, 30) - feedH;
    if (this.tray) this.layoutTray(f, tableY, bottomLimit); else this.layoutSnacks(f, tableY, bottomLimit);
    // Viewer comments: bottom-left of the column on phones, bottom-left screen edge on wide screens.
    this.feed.layout({ x: uiLeft(f, f.pad), bottom: f.bottom - clamp(f.h * 0.03, 14, 30), width: Math.round(Math.min(f.colW - f.pad * 2, clamp(330 * f.ui, 290, 420))), frame: f });
    this.dialog?.layout(f);
    if (this.phase === 'live' && !this.feedMechanic.busy && !this.feedMechanic.carry && this.eaten === 0) {
      const next = this.servings.find((s) => !s.eaten);
      const mouth = this.streamer.mouth();
      if (next) this.hint.drag(f, next.home, { x: mouth.x, y: mouth.y + 20 });
    }
  }

  place(serving, x, y, size) {
    serving.home = { x, y };
    serving.size = size;
    if (!serving.moving && !serving.eaten) serving.image.setScale(Math.min(size / serving.image.width, size / serving.image.height)).setPosition(x, y);
    serving.zone.setPosition(x, y).setSize(size * 1.05, size * 1.05);
    serving.zone.input.hitArea.setSize(size * 1.05, size * 1.05);
  }

  // Snacks: back row of 3, front row of 2 (fewer stay centred).
  layoutSnacks(f, tableY, bottomLimit) {
    const n = this.servings.length;
    const w = Math.round(clamp(f.colW * 0.24, 76, 130));
    const rows = n > 3 ? [this.servings.slice(0, 3), this.servings.slice(3)] : [this.servings];
    const rowGap = Math.min(w * 1.08, (bottomLimit - tableY - w * 0.2) / rows.length);
    rows.forEach((row, r) => row.forEach((serving, c) => {
      this.place(serving, f.cx + (c - (row.length - 1) / 2) * Math.min(w * 1.35, (f.colW - w) / 2), tableY + w * 0.55 + r * rowGap, w);
    }));
  }

  // Canteen meal: the tray on the table, each portion in its own compartment.
  layoutTray(f, tableY, bottomLimit) {
    const t = this.tray;
    const maxW = Math.min(f.colW * 0.86, 460);
    const maxH = bottomLimit - tableY - 8;
    const s = Math.min(maxW / t.width, maxH / t.height);
    t.setScale(s).setPosition(f.cx, tableY + 4 + (t.height * s) / 2);
    const left = t.x - t.displayWidth / 2;
    const top = t.y - t.displayHeight / 2;
    for (const serving of this.servings) {
      const c = CANTEEN_ART.compartments[serving.slot ?? 0];
      const size = Math.min(c.w * t.displayWidth, c.h * t.displayHeight) * 0.92;
      this.place(serving, left + (c.x + c.w / 2) * t.displayWidth, top + (c.y + c.h / 2) * t.displayHeight, size);
    }
  }

  pickUp(serving) {
    if (this.phase !== 'live') return null;
    this.hint.hide();
    serving.image.setVisible(false);
    const piece = this.add.image(serving.home.x, serving.home.y, serving.image.texture.key).setDepth(DEPTH.tools);
    piece.setScale(serving.image.scale * 1.1);
    return piece;
  }

  putBack(serving, piece) {
    this.tweens.add({
      targets: piece, x: serving.home.x, y: serving.home.y, duration: 200, ease: 'Sine.Out',
      onComplete: () => { piece.destroy(); if (!serving.eaten) serving.image.setVisible(true); },
    });
  }

  eat(serving, piece, done) {
    const mouth = this.streamer.mouth();
    // Record this item's donations first; each part is shown only once the save accepted it.
    const donation = this.counter
      ? this.services().orders.startServing(this.orderId, serving.key).catch((error) => { console.error(error); return null; })
      : Promise.resolve(null);
    const donate = (i) => donation.then((r) => { if (r?.parts?.[i]) this.donate(r.parts[i]); });
    this.tweens.add({ targets: piece, x: mouth.x, y: mouth.y + piece.displayHeight * 0.3, duration: 220, ease: 'Sine.Out', onComplete: () => bite(0) });
    const bite = (i) => {
      if (!this.scene.isActive()) return;
      this.streamer.setPose('eating');
      this.time.delayedCall(TIMINGS.biteOpenMs, () => {
        const last = i >= BITES - 1;
        // Bought food has no bitten sprite: each bite shrinks the portion with crumbs.
        if (last) piece.setVisible(false); else piece.setScale(piece.scale * 0.62);
        sparkle(this, mouth.x, mouth.y + 10, { count: 6, radius: 50, depth: DEPTH.tools + 1 });
        this.streamer.setPose('chewing');
        this.streamer.bounce();
        burstHearts(this, mouth.x + 50, mouth.y - 20, { count: 2, size: 16 });
        donate(i);
        this.time.delayedCall(TIMINGS.biteChewMs, () => {
          if (!last) { bite(i + 1); return; }
          piece.destroy();
          this.streamer.setPose('happy');
          burstHearts(this, mouth.x, mouth.y - 60, { count: 6, size: 24 });
          this.feed.push();
          for (let k = BITES; k < (STREAM_DONATIONS[this.source]?.shares.length ?? 0); k += 1) donate(k);
          this.eaten += 1;
          this.lastConsume = donation.then(() => this.services().orders.consume(this.orderId, serving.key))
            .catch((error) => { console.error(error); return null; });
          this.time.delayedCall(TIMINGS.afterServingMs, () => {
            done();
            if (this.eaten >= this.servings.length) this.finish();
          });
        });
      });
    };
  }

  // A viewer donation the save has already accepted: gold chat bubble, coins fly into the counter.
  donate(amount) {
    if (!this.sys.isActive() || !this.counter) return;
    const avatar = VIEWER_AVATARS[this.donorIndex % VIEWER_AVATARS.length];
    this.donorIndex += 1;
    const bubble = this.feed.push(`${DONOR_NAMES[avatar]} donated ${amount}!`, { avatar, tone: 'donation' });
    this.flights += 1;
    // Start once the bubble has slid into place, from its avatar.
    this.time.delayedCall(280, () => {
      const a = bubble?.active ? bubble.getData('avatar') : null;
      const from = a ? { x: this.feed.root.x + bubble.x + a.x, y: this.feed.root.y + bubble.y } : { x: this.frame.cx, y: this.frame.bottom - 40 };
      const audio = this.services().audio;
      flyCoins(this, {
        from,
        to: this.counter.target(),
        amount,
        coinSize: Math.round(clamp(26 * this.frame.ui, 24, 34)),
        onCoin: (share) => { this.counter.add(share); audio.playSfx('coin'); },
        onDone: () => { this.counter.floatAmount(amount); this.flights -= 1; this.events.emit('donation-landed'); },
      });
    });
  }

  async settleDonations() {
    const result = await this.lastConsume;
    while (this.flights > 0) await new Promise((resolve) => this.events.once('donation-landed', resolve));
    return result;
  }

  finish() {
    if (this.phase !== 'live') return;
    this.phase = 'done';
    this.feed.stop();
    this.viewerTimer?.remove();
    const what = this.source === 'canteen' ? 'your canteen tray' : `${this.eaten} snack${this.eaten === 1 ? '' : 's'}`;
    const primary = { label: 'Home', onTap: () => this.fadeTo('Home') };
    const secondary = { label: this.source === 'canteen' ? 'Eat again' : 'Shop again', onTap: () => this.fadeTo(BACK[this.source]) };
    if (!this.counter) {
      this.time.delayedCall(400, () => {
        this.dialog = new GameDialog(this, { title: 'Delicious!', body: `You ate ${what} live.\n${this.formatViewers()} viewers loved it!`, primary, secondary });
        this.dialog.layout(this.frame);
      });
      return;
    }
    this.time.delayedCall(400, async () => {
      const result = await this.settleDonations();
      if (!this.sys.isActive()) return;
      const earned = result?.earned ?? this.counter.value;
      const payout = result?.payout ?? 0;
      this.result = result ? { earned, payout, cost: result.cost } : { earned, payout: 0, cost: null, error: true };
      let note = null;
      let noteColor = '#6b4a3a';
      if (!result) note = 'Could not save. Your donations are kept.';
      else if (Number.isInteger(result.cost)) {
        const profit = earned - result.cost;
        note = profit >= 0 ? `Snacks cost ${result.cost} · Profit +${profit}` : `Snacks cost ${result.cost} · ${-profit} to go`;
        noteColor = profit >= 0 ? '#2f9a46' : '#c4503a';
      }
      this.dialog = new GameDialog(this, {
        title: 'Delicious!',
        body: `You ate ${what} live.\n${this.formatViewers()} viewers loved it\nand donated:`,
        coins: earned,
        note,
        noteColor,
        primary,
        secondary,
      });
      this.dialog.layout(this.frame);
      // The wallet sits above the card's veil while the payout flies into it.
      this.hud.root.setDepth(DEPTH.banner - 2);
      if (payout > 0) this.flyPayout(payout, result.state.coins);
    });
  }

  // Donations already added to the balance: coins fly from the card into the wallet, which counts up.
  flyPayout(payout, finalCoins) {
    const start = finalCoins - payout;
    let shown = 0;
    this.hud.setCoins(start);
    this.time.delayedCall(350, () => flyCoins(this, {
      from: this.dialog.coinRow,
      to: this.hud.coinPosition(),
      amount: payout,
      coinSize: Math.round(clamp(30 * this.frame.ui, 28, 40)),
      onCoin: (share) => { shown += share; this.hud.setCoins(start + shown); this.hud.bumpCoins(); this.services().audio.playSfx('coin'); },
      onDone: () => { this.hud.setCoins(finalCoins); this.paidOut = true; },
    }));
  }

  getDebugSnapshot() {
    let targets = {};
    if (this.phase === 'live' && this.feedMechanic && !this.feedMechanic.busy) {
      const next = this.servings.find((s) => !s.eaten);
      const mouth = this.streamer.mouth();
      targets = next ? { serving: next.home, mouth: { x: mouth.x, y: mouth.y } } : {};
    }
    if (this.dialog) Object.assign(targets, this.dialog.targets());
    const rect = (o) => ({ x: o.x - o.displayWidth / 2, y: o.y - o.displayHeight / 2, w: o.displayWidth, h: o.displayHeight });
    return {
      scene: 'Meal',
      phase: this.phase,
      orderId: this.orderId,
      source: this.source ?? null,
      menu: this.servings?.map((s) => s.food) ?? [],
      slots: this.servings?.map((s) => s.slot) ?? [],
      eaten: this.eaten,
      dialog: this.dialog ? this.dialog.title.text : null,
      donations: this.counter ? { shown: this.counter.value, flights: this.flights, result: this.result, paidOut: this.paidOut } : null,
      hudCoins: this.hud ? Number(this.hud.coinText.text) : null,
      servingTextures: this.servings?.map((s) => s.image.texture.key) ?? [],
      targets,
      rects: {
        ...(this.hud?.rects ?? {}),
        ...(this.header?.rect ? { 'live-pill': this.header.rect } : {}),
        ...(this.counter?.rect ? { 'donation-counter': this.counter.rect } : {}),
        ...(this.tray ? { tray: rect(this.tray) } : {}),
        ...(this.servings ? Object.fromEntries(this.servings.filter((s) => !s.eaten && s.image.visible).map((s) => [`food-${s.id}`, rect(s.image)])) : {}),
      },
      save: this.services().save.snapshot(),
    };
  }
}
