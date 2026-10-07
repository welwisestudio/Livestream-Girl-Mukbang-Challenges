import { BaseScene } from './BaseScene.js';
import { getLevel } from '../content/levels.js';
import { TIMINGS } from '../content/timings.js';
import { VIEWER_AVATARS } from '../content/assets.js';
import { createRunId } from '../core/createRunId.js';
import { DEPTH, actionBand, clamp } from '../ui/layout.js';
import { RoomBackground } from '../ui/background.js';
import { Hud } from '../ui/hud.js';
import { PillButton } from '../ui/controls.js';
import { Banner, CommentFeed, HeaderPill, RequestCard, StepProgress } from '../ui/panels.js';
import { HintHand, Streamer, burstHearts, sparkle } from '../ui/actors.js';
import { createStepView, placeWork } from '../levels/cookingSteps.js';
import { decorClear, decorLayout } from '../levels/stepKit.js';
import { FeedMechanic } from '../mechanics/FeedMechanic.js';

const COOKING_PHASES = new Set(['cooking', 'request-check', 'perfect']);

// Shared five-level flow: pre-stream request → data-driven cooking → Perfect → mukbang → Result.
export class LevelScene extends BaseScene {
  constructor() { super('Level'); }

  init(data) {
    this.level = getLevel(data.levelId);
    this.runId = createRunId(this.level.id);
    this.phase = 'prestream';
    this.stepIndex = -1;
    this.servingsEaten = 0;
    this.stepView = null;
    this.leaving = false;
    this.advancing = false;
    this.decor = [];
    this.workTexture = null;
  }

  create() {
    const save = this.services().save.snapshot();
    this.room = new RoomBackground(this);
    this.hud = new Hud(this, { name: 'Player', level: save.highestLevel, coins: save.coins, xp: 0.15 });
    this.streamer = new Streamer(this);
    this.header = new HeaderPill(this, { label: 'LIVE' });
    this.progress = new StepProgress(this, this.level.steps.length);
    this.progress.root.setVisible(false);
    this.feed = new CommentFeed(this, { comments: this.level.comments.preStream, avatars: VIEWER_AVATARS, max: 3 });
    this.hint = new HintHand(this);
    this.request = new RequestCard(this, { ...this.level.request, reward: this.level.rewardCoins });
    this.request.root.setVisible(false);
    this.actionButton = new PillButton(this, { label: this.level.actionLabel, variant: 'disabled', onClick: () => this.beginCooking() });
    this.servings = [];
    this.events.once('shutdown', () => this.cleanup());
    this.bindViewport();
    this.enterPrestream();
    this.cameras.main.fadeIn(260, 255, 240, 245);
  }

  // ---------------------------------------------------------------- geometry
  streamGeometry(f) {
    const headerH = Math.round(clamp(22 * f.ui, 20, 28) * 2.15);
    const gap = Math.round(clamp(f.h * 0.016, 8, 16));
    const headerY = f.hud.bottom + gap + headerH / 2;
    const requestH = Math.round(clamp(98 * f.ui, 92, 120));
    const requestY = f.hud.bottom + gap + requestH / 2;
    const btnH = Math.round(clamp(66 * f.ui, 60, 80));
    const band = actionBand(f, btnH * 1.09);
    const tableY = Math.round(f.top + f.h * (f.short ? 0.6 : 0.565));
    const stageTop = f.hud.bottom + gap + requestH * 0.72;
    // Bust height: prominent but never a face-filling close-up (reference: head ≈ 45–55 % of width).
    const charH = clamp(Math.min((tableY - stageTop) / 0.8, f.colW * 0.84), 200, 470);
    const charBottom = tableY + charH * 0.2;
    const servingW = Math.round(clamp(f.colW * 0.31, 104, 190));
    const counterH = f.bottom - tableY;
    const feedMax = f.h < 700 ? 2 : 3;
    return {
      headerY, requestY, band, btnH, tableY, charH, charBottom, servingW, counterH, feedMax,
      feedBottomPre: band.top - Math.round(clamp(f.h * 0.02, 10, 18)),
      feedBottomLive: f.bottom - Math.round(clamp(f.h * 0.03, 14, 30)),
      feedWidth: Math.round(Math.min(f.colW - f.pad * 2, clamp(330 * f.ui, 290, 420))),
    };
  }

  cookGeometry(f) {
    const slot = Math.round(clamp(30 * f.ui, 28, 38));
    const gap = Math.round(clamp(f.h * 0.016, 8, 16));
    const headerY = f.hud.bottom + gap + (slot * 1.5) / 2;
    const headerBottom = headerY + slot * 0.75 + slot * 0.42 * 1.9 + 8; // dots + sub bar
    const cardW = clamp((f.colW - f.pad * 2 - 2 * clamp(f.colW * 0.035, 10, 18)) / 3, 84, clamp(118 * f.ui, 100, 140));
    const cardH = cardW * 1.12;
    const bottomMargin = Math.round(clamp(f.h * 0.035, 16, 36));
    const cardsY = f.bottom - bottomMargin - cardH / 2;
    const areaTop = headerBottom + 12;
    const areaBottom = cardsY - cardH / 2 - 14;
    const areaH = Math.max(160, areaBottom - areaTop);
    const size = Math.round(clamp(Math.min(f.colW * 0.68, areaH * 0.95), 180, 430));
    const maxH = Math.round(Math.min(size * 1.05, areaH * 0.86));
    const workY = Math.round(areaTop + areaH * 0.55);
    return {
      frame: f,
      headerY,
      cardsY,
      work: { x: f.cx, y: workY, size, maxH },
      tableY: Math.round(workY - maxH * 0.05),
      check: { x: f.cx + Math.min(size * 0.5, f.colW / 2 - 50), y: workY + maxH * 0.32 },
      tool: { x: f.cx - Math.min(f.colW * 0.28, 150), y: cardsY },
    };
  }

  // ---------------------------------------------------------------- layout
  layout(f) {
    this.sgeo = this.streamGeometry(f);
    this.cgeo = this.cookGeometry(f);
    const cooking = COOKING_PHASES.has(this.phase);
    this.tweens.killTweensOf(this.room);
    this.room.layout(f, cooking ? this.cgeo.tableY : this.sgeo.tableY);
    this.hud.layout(f);
    this.streamer.layout({ x: f.cx, bottom: this.sgeo.charBottom, height: this.sgeo.charH });
    this.header.layout({ x: f.cx, y: this.sgeo.headerY, frame: f });
    this.progress.layout({ x: f.cx, y: this.cgeo.headerY, frame: f });
    this.feed.max = this.sgeo.feedMax;
    this.feed.layout({
      x: f.colLeft + f.pad,
      bottom: this.phase === 'mukbang' ? this.sgeo.feedBottomLive : this.sgeo.feedBottomPre,
      width: this.sgeo.feedWidth,
      frame: f,
    });
    this.actionButton.layout({ x: f.cx, y: this.sgeo.band.centerY, frame: f, minWidth: 250 });
    this.request.layout({ x: f.cx, y: this.sgeo.requestY, frame: f });
    this.stepView?.layout(this.cgeo);
    decorLayout(this, this.cgeo);
    if (this.finalDish) placeWork(this.finalDish, this.cgeo);
    this.banner?.layout({ x: f.cx, y: this.cgeo.work.y - this.cgeo.work.maxH * 0.72, frame: f });
    this.layoutServings();
    if (this.phase === 'prestream' && this.requestShown && this.actionButton.enabled) this.hint.tap(f, this.actionButton.center());
  }

  // ---------------------------------------------------------------- pre-stream
  enterPrestream() {
    this.phase = 'prestream';
    this.streamer.idle();
    this.feed.start(TIMINGS.commentIntervalMs);
    this.time.delayedCall(TIMINGS.requestArrivesMs, () => {
      if (this.phase !== 'prestream') return;
      this.requestShown = true;
      this.header.root.setVisible(false);
      this.request.root.setVisible(true).setAlpha(0);
      this.request.root.y -= 30;
      this.tweens.add({ targets: this.request.root, alpha: 1, y: this.request.root.y + 30, duration: 360, ease: 'Back.Out' });
      this.actionButton.setEnabled(true, { variant: 'primary' });
      this.actionButton.root.setScale(0.9);
      this.tweens.add({ targets: this.actionButton.root, scale: 1, duration: 260, ease: 'Back.Out' });
      this.hint.tap(this.frame, this.actionButton.center());
    });
  }

  beginCooking() {
    if (this.phase !== 'prestream' || !this.requestShown) return;
    this.phase = 'to-cooking';
    this.hint.hide();
    this.feed.clear();
    this.actionButton.setVisible(false);
    this.cameras.main.fadeOut(TIMINGS.transitionMs / 2, 255, 244, 247);
    this.cameras.main.once('camerafadeoutcomplete', () => {
      this.phase = 'cooking';
      this.request.root.setVisible(false);
      this.streamer.image.setVisible(false);
      this.header.root.setVisible(false);
      this.progress.root.setVisible(true);
      this.room.layout(this.frame, this.cgeo.tableY);
      this.cameras.main.fadeIn(TIMINGS.transitionMs / 2, 255, 244, 247);
      this.showStep(0);
    });
  }

  // ---------------------------------------------------------------- cooking
  showStep(index) {
    this.disposeStep();
    this.stepIndex = index;
    this.advancing = false;
    this.progress.setStep(index);
    this.stepView = createStepView(this, this.level.steps[index]);
    this.stepView.layout(this.cgeo);
  }

  completeStep() {
    if (this.advancing || this.phase !== 'cooking') return;
    this.advancing = true;
    const completed = this.stepIndex;
    this.hint.hide();
    this.time.delayedCall(TIMINGS.stepAdvanceMs * 0.5, () => {
      if (!this.scene.isActive() || this.phase !== 'cooking' || this.stepIndex !== completed) return;
      this.progress.setStep(completed + 1);
      if (completed + 1 >= this.level.steps.length) this.finishCooking();
      else this.showStep(completed + 1);
    });
  }

  disposeStep() {
    this.stepView?.dispose();
    this.stepView = null;
  }

  finishCooking() {
    this.disposeStep();
    decorClear(this, 240);
    this.phase = 'request-check';
    this.finalDish = this.add.image(0, 0, this.level.finalTexture).setDepth(DEPTH.food);
    placeWork(this.finalDish, this.cgeo);
    this.progress.root.setVisible(false);
    this.request.root.setVisible(true).setAlpha(0);
    this.request.layout({ x: this.frame.cx, y: this.sgeo.requestY, frame: this.frame });
    this.tweens.add({ targets: this.request.root, alpha: 1, duration: 240 });
    this.time.delayedCall(320, () => {
      this.request.showFulfilled();
      sparkle(this, this.frame.cx, this.request.root.y, { count: 10, radius: 140 });
    });
    this.time.delayedCall(TIMINGS.requestCheckMs, () => this.showPerfect());
  }

  showPerfect() {
    if (this.phase !== 'request-check') return;
    this.phase = 'perfect';
    this.tweens.add({ targets: this.request.root, alpha: 0, duration: 200, onComplete: () => this.request.root.setVisible(false) });
    this.progress.root.setVisible(false);
    this.banner = new Banner(this, 'Perfect!!');
    this.banner.layout({ x: this.frame.cx, y: this.cgeo.work.y - this.cgeo.work.maxH * 0.72, frame: this.frame });
    this.banner.pop();
    sparkle(this, this.frame.cx, this.cgeo.work.y, { count: 14, radius: this.cgeo.work.size * 0.7 });
    const s = this.finalDish.scale;
    this.tweens.add({ targets: this.finalDish, scale: s * 1.08, duration: 260, yoyo: true, ease: 'Sine.InOut' });
    this.time.delayedCall(TIMINGS.perfectHoldMs, () => this.startMukbang());
  }

  // ---------------------------------------------------------------- mukbang
  startMukbang() {
    if (this.phase !== 'perfect') return;
    this.cameras.main.fadeOut(TIMINGS.transitionMs / 2, 255, 244, 247);
    this.cameras.main.once('camerafadeoutcomplete', () => {
      this.phase = 'mukbang';
      this.banner?.destroy();
      this.banner = null;
      this.finalDish?.destroy();
      this.finalDish = null;
      this.streamer.image.setVisible(true);
      this.streamer.setPose('happy');
      this.header.root.setVisible(true);
      this.viewers = 1240;
      this.header.setLabel(`LIVE  ${this.formatViewers()}`);
      this.feed.comments = this.level.comments.mukbang;
      this.createServings();
      this.layout(this.frame);
      this.cameras.main.fadeIn(TIMINGS.transitionMs / 2, 255, 244, 247);
      this.feed.start(TIMINGS.commentIntervalMs * 1.2);
      this.viewerTimer = this.time.addEvent({
        delay: 900, loop: true,
        callback: () => { this.viewers += Math.floor(40 + Math.random() * 120); this.header.setLabel(`LIVE  ${this.formatViewers()}`); },
      });
    });
  }

  formatViewers() {
    return this.viewers >= 1000 ? `${(this.viewers / 1000).toFixed(1)}K` : String(this.viewers);
  }

  createServings() {
    for (let i = 0; i < this.level.servings; i += 1) {
      const image = this.add.image(0, 0, this.level.servingTexture).setDepth(DEPTH.food + (i === 2 ? 2 : 0));
      const zone = this.add.zone(0, 0, 10, 10).setDepth(DEPTH.food + 5).setInteractive({ useHandCursor: true });
      this.servings.push({ id: i, image, zone, eaten: false });
    }
    this.feedMechanic = new FeedMechanic(this, {
      servings: this.servings,
      getMouth: () => this.streamer.mouth(),
      onPickUp: (serving) => this.pickUp(serving),
      onCancel: (serving, piece) => this.putBack(serving, piece),
      onInvalid: () => {},
      onFeed: (serving, piece, done) => this.eat(serving, piece, done),
    });
  }

  servingPositions() {
    const g = this.sgeo;
    const f = this.frame;
    const w = g.servingW;
    const h = w * 0.88;
    const backY = g.tableY + h * 0.5;
    const frontY = backY + h * 0.62;
    const dx = Math.min(w * 0.68, f.colW / 2 - w / 2 - 6);
    return [
      { x: f.cx - dx, y: backY },
      { x: f.cx + dx, y: backY },
      { x: f.cx, y: frontY },
    ];
  }

  layoutServings() {
    if (!this.servings.length) return;
    const positions = this.servingPositions();
    const w = this.sgeo.servingW;
    for (const serving of this.servings) {
      const p = positions[serving.id % positions.length];
      serving.home = p;
      const tex = serving.image.texture.key;
      const empty = tex === this.level.emptyTexture;
      const scale = (empty ? w * 0.92 : w) / serving.image.width;
      if (!serving.moving) serving.image.setScale(scale).setPosition(p.x, p.y + (empty ? w * 0.12 : 0));
      serving.zone.setPosition(p.x, p.y).setSize(w * 1.02, w * 0.92);
    }
    if (this.phase === 'mukbang' && !this.feedMechanic?.busy && !this.feedMechanic?.carry) this.hintNextServing();
  }

  hintNextServing() {
    const next = this.servings.find((s) => !s.eaten);
    if (!next) return this.hint.hide();
    const mouth = this.streamer.mouth();
    if (this.servingsEaten === 0) this.hint.drag(this.frame, next.home, { x: mouth.x, y: mouth.y + 20 });
    else this.hint.hide();
    return undefined;
  }

  pieceSize() {
    return this.sgeo.servingW * 0.7;
  }

  pickUp(serving) {
    if (this.phase !== 'mukbang') return null;
    this.hint.hide();
    const w = this.sgeo.servingW;
    serving.image.setTexture(this.level.emptyTexture);
    serving.image.setScale((w * 0.92) / serving.image.width).setPosition(serving.home.x, serving.home.y + w * 0.12);
    const piece = this.add.image(serving.home.x, serving.home.y - w * 0.08, this.level.biteTextures[0]).setDepth(DEPTH.tools);
    piece.setScale(this.pieceSize() / piece.width);
    this.tweens.add({ targets: piece, scale: piece.scale * 1.08, duration: 120 });
    return piece;
  }

  putBack(serving, piece) {
    const w = this.sgeo.servingW;
    this.tweens.add({
      targets: piece, x: serving.home.x, y: serving.home.y - w * 0.08, duration: 200, ease: 'Sine.Out',
      onComplete: () => {
        piece.destroy();
        if (serving.eaten) return;
        serving.image.setTexture(this.level.servingTexture);
        this.layoutServings();
      },
    });
  }

  eat(serving, piece, done) {
    const bites = [...this.level.biteTextures.slice(1), null];
    const count = Math.max(1, Math.min(this.level.bitesPerServing, this.level.biteTextures.length));
    const mouth = this.streamer.mouth();
    const holdY = mouth.y + piece.displayHeight * 0.3;
    this.tweens.add({ targets: piece, x: mouth.x, y: holdY, duration: 220, ease: 'Sine.Out', onComplete: () => biteLoop(0) });
    const biteLoop = (i) => {
      if (!this.scene.isActive()) return;
      this.streamer.setPose('eating');
      this.time.delayedCall(TIMINGS.biteOpenMs, () => {
        const next = bites[Math.min(i, bites.length - 1)];
        const last = i >= count - 1;
        if (last || !next) piece.setVisible(false); else piece.setTexture(next);
        this.streamer.setPose('chewing');
        this.streamer.bounce();
        burstHearts(this, mouth.x + 50, mouth.y - 20, { count: 2, size: 16 });
        this.time.delayedCall(TIMINGS.biteChewMs, () => {
          if (!last) return biteLoop(i + 1);
          piece.destroy();
          this.streamer.setPose('happy');
          burstHearts(this, mouth.x, mouth.y - 60, { count: 6, size: 24 });
          this.feed.push();
          this.servingsEaten += 1;
          this.time.delayedCall(TIMINGS.afterServingMs, () => {
            done();
            if (this.servingsEaten >= this.level.servings) this.finishLevel();
          });
          return undefined;
        });
      });
    };
  }

  finishLevel() {
    if (this.phase !== 'mukbang') return;
    this.phase = 'complete';
    this.feedMechanic?.dispose();
    this.feed.stop();
    this.viewerTimer?.remove();
    this.time.delayedCall(300, () => this.fadeTo('Result', { levelId: this.level.id, runId: this.runId }, TIMINGS.transitionMs));
  }

  cleanup() {
    this.disposeStep();
    decorClear(this);
    this.feedMechanic?.dispose();
    this.viewerTimer?.remove();
    this.feed?.destroy();
  }

  // ---------------------------------------------------------------- test hooks (dev only)
  getDebugSnapshot() {
    let targets = {};
    if (this.phase === 'prestream') {
      targets = this.requestShown && this.actionButton.enabled ? { startCooking: this.actionButton.center() } : {};
    } else if (this.phase === 'cooking' && this.stepView && !this.advancing && (this.stepView.ready?.() ?? true)) {
      targets = this.stepView.targets();
    } else if (this.phase === 'mukbang' && !this.feedMechanic?.busy) {
      const next = this.servings.find((s) => !s.eaten);
      const mouth = this.streamer.mouth();
      targets = next ? { serving: next.home, mouth: { x: mouth.x, y: mouth.y }, wrongTarget: { x: this.frame.colLeft + 24, y: this.sgeo.headerY + 40 } } : {};
    }
    return {
      scene: 'Level', phase: this.phase, stepIndex: this.stepIndex, stepId: this.level.steps[this.stepIndex]?.id ?? null,
      levelId: this.level.id, servingsEaten: this.servingsEaten,
      appearance: this.services().appearance.snapshot().equipped,
      characterTexture: this.streamer.image.texture.key,
      targets,
    };
  }
}
