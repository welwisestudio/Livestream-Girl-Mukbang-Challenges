import { BaseScene } from './BaseScene.js';
import { getLevel } from '../content/levels.js';
import { TIMINGS } from '../content/timings.js';
import { VIEWER_AVATARS } from '../content/assets.js';
import { createRunId } from '../core/createRunId.js';
import { DEPTH, SEAT_DEPTH, actionBand, clamp, uiLeft, uiRight } from '../ui/layout.js';
import { RoomBackground } from '../ui/background.js';
import { Hud } from '../ui/hud.js';
import { Banner, CommentFeed, HeaderPill, RequestCard, StepProgress } from '../ui/panels.js';
import { HintHand, Streamer, burstHearts, sparkle } from '../ui/actors.js';
import { createStepView, placeWork } from '../levels/cookingSteps.js';
import { decorClear, decorLayout } from '../levels/stepKit.js';
import { emojiStream, playReaction } from '../ui/reactions.js';
import { FeedMechanic } from '../mechanics/FeedMechanic.js';

const COOKING_PHASES = new Set(['cooking', 'request-check', 'perfect']);
// Mukbang table: serving box height / width, front-row offset (share of box height) and the
// gap between the tabletop edge and the top of the back row.
const SERVING_ASPECT = 0.9;
const FRONT_ROW_STEP = 0.62;
const FOOD_LIFT = 4;

// Shared five-level flow: pre-stream request → data-driven cooking → Perfect → mukbang → Result.
export class LevelScene extends BaseScene {
  constructor() { super('Level'); }

  init(data) {
    this.level = getLevel(data.levelId);
    this.runId = createRunId(this.level.id);
    this.phase = 'cooking';
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
    this.hud = new Hud(this, { level: save.highestLevel, coins: save.coins });
    this.streamer = new Streamer(this);
    this.header = new HeaderPill(this, { label: 'LIVE' });
    this.progress = new StepProgress(this, this.level.steps.length);
    this.progress.root.setVisible(false);
    this.feed = new CommentFeed(this, { comments: this.level.comments.preStream, avatars: VIEWER_AVATARS, max: 3 });
    this.hint = new HintHand(this);
    this.request = new RequestCard(this, { ...this.level.request, reward: this.level.rewardCoins });
    this.request.root.setVisible(false);
    this.servings = [];
    this.events.once('shutdown', () => this.cleanup());
    this.bindViewport();
    this.enterCooking();
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
    const feedBottomLive = f.bottom - Math.round(clamp(f.h * 0.03, 14, 30));
    // Wide screens (desktop, landscape): the servings stand in one row across the table and the
    // LIVE pill moves to the left edge, so the heroine gets the column's full height.
    const wide = f.spread;
    const feedReserve = wide ? 0 : Math.round(clamp(15 * f.ui, 14, 18) * 2.1) * 2 + 8;
    const foodBottom = feedBottomLive - feedReserve;
    // Every serving stands inside a servingW × servingH box on the tabletop (tall cups are fitted
    // by height), so no food reaches above the tabletop edge into the heroine's body.
    let servingW = Math.round(clamp(f.colW * 0.31, 104, 190));
    const foodH = (w) => w * SERVING_ASPECT * (wide ? 1 : 1 + FRONT_ROW_STEP) + FOOD_LIFT;
    // The table line sits one rim band above the tabletop edge that the food needs.
    let tableY = foodBottom - foodH(servingW);
    tableY -= this.room.frontY(f, tableY) - tableY;
    tableY = Math.round(clamp(tableY, f.top + f.h * 0.5, f.top + f.h * (wide ? 0.72 : 0.64)));
    const tableTop = this.room.frontY(f, tableY);
    // A clamped (lower) table leaves less tabletop: the food shrinks rather than overlapping her.
    servingW = Math.round(servingW * Math.min(1, (foodBottom - tableTop) / foodH(servingW)));
    const servingH = servingW * SERVING_ASPECT;
    const stageTop = wide ? f.hud.bottom + gap : f.hud.bottom + gap + requestH * 0.72;
    // Bust height: prominent but never a face-filling close-up (reference: head ≈ 45–55 % of width).
    // She sits *at* the table: the pink rim band shows behind her and the tabletop edge cuts the
    // body below the chest, right behind the food (no empty strip between her and the food).
    const charH = clamp(Math.min((tableY - stageTop) / (1 - SEAT_DEPTH), f.colW * (wide ? 1 : 0.92)), 200, wide ? 640 : 500);
    const charBottom = tableTop + charH * SEAT_DEPTH;
    const counterH = f.bottom - tableY;
    const feedMax = f.h < 700 ? 2 : 3;
    return {
      headerY, requestY, band, btnH, tableY, tableTop, wide, charH, charBottom, servingW, servingH, counterH, feedMax,
      feedBottomPre: band.top - Math.round(clamp(f.h * 0.02, 10, 18)),
      feedBottomLive,
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
    const live = this.header.layout({ x: f.cx, y: this.sgeo.headerY, frame: f });
    if (this.sgeo.wide) this.header.layout({ x: uiLeft(f, f.pad) + live.width / 2 + Math.round(clamp(22 * f.ui, 20, 28)) * 0.6, y: this.sgeo.headerY, frame: f });
    this.progress.layout({ x: f.cx, y: this.cgeo.headerY, frame: f });
    this.feed.max = this.sgeo.feedMax;
    this.feed.layout({
      // Viewer comments: bottom-left of the column on phones, bottom-left screen edge on wide screens.
      x: uiLeft(f, f.pad),
      bottom: this.phase === 'mukbang' ? this.sgeo.feedBottomLive : this.sgeo.feedBottomPre,
      width: this.sgeo.feedWidth,
      frame: f,
    });
    this.request.layout({ x: f.cx, y: this.sgeo.requestY, frame: f });
    this.stepView?.layout(this.cgeo);
    decorLayout(this, this.cgeo);
    if (this.finalDish) placeWork(this.finalDish, this.cgeo);
    this.banner?.layout({ x: f.cx, y: this.cgeo.work.y - this.cgeo.work.maxH * 0.72, frame: f });
    this.layoutServings();
  }

  // Lobby Start opens the level straight into its first cooking step.
  enterCooking() {
    this.phase = 'cooking';
    this.streamer.image.setVisible(false);
    this.header.root.setVisible(false);
    this.progress.root.setVisible(true);
    this.room.layout(this.frame, this.cgeo.tableY);
    this.showStep(0);
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
    this.sfx('step');
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
      this.sfx('select');
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
    this.sfx('perfect');
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

  // Foot points (bottom centre) of the servings on the tabletop: one row on wide screens,
  // two at the back and one in front on phones. The back row's top is just below the tabletop edge.
  servingPositions() {
    const g = this.sgeo;
    const f = this.frame;
    const w = g.servingW;
    const backY = g.tableTop + FOOD_LIFT + g.servingH;
    if (g.wide) {
      const step = w * 1.12;
      return [{ x: f.cx - step, y: backY }, { x: f.cx + step, y: backY }, { x: f.cx, y: backY }];
    }
    const dx = Math.min(w * 0.68, f.colW / 2 - w / 2 - 6);
    return [
      { x: f.cx - dx, y: backY },
      { x: f.cx + dx, y: backY },
      { x: f.cx, y: backY + g.servingH * FRONT_ROW_STEP },
    ];
  }

  // Fits a serving sprite (food, empty plate or cup) into its box, standing on the foot point.
  // An empty plate is slightly smaller; a drink's empty cup is the same cup as the full one.
  placeOnTable(image, foot, empty = false) {
    const k = empty && !this.level.drink ? 0.92 : 1;
    const s = Math.min((this.sgeo.servingW * k) / image.width, (this.sgeo.servingH * k) / image.height);
    return image.setScale(s).setPosition(foot.x, foot.y - (image.height * s) / 2);
  }

  layoutServings() {
    if (!this.servings.length) return;
    const positions = this.servingPositions();
    const { servingW: w, servingH: h } = this.sgeo;
    for (const serving of this.servings) {
      const p = positions[serving.id % positions.length];
      serving.foot = p;
      serving.home = { x: p.x, y: p.y - h / 2 };
      if (!serving.moving) this.placeOnTable(serving.image, p, serving.image.texture.key === this.level.emptyTexture);
      serving.zone.setPosition(serving.home.x, serving.home.y).setSize(w * 1.02, h);
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
    this.sfx('select');
    const w = this.sgeo.servingW;
    let piece;
    if (this.level.drink) {
      // The whole cup is lifted: its spot stays empty until the cup is put back.
      serving.image.setVisible(false);
      piece = this.placeOnTable(this.add.image(0, 0, this.level.biteTextures[0]).setDepth(DEPTH.tools), serving.foot);
    } else {
      this.placeOnTable(serving.image.setTexture(this.level.emptyTexture), serving.foot, true);
      piece = this.add.image(serving.home.x, serving.home.y - w * 0.08, this.level.biteTextures[0]).setDepth(DEPTH.tools);
      piece.setScale(this.pieceSize() / piece.width);
    }
    this.tweens.add({ targets: piece, scale: piece.scale * 1.08, duration: 120 });
    return piece;
  }

  putBack(serving, piece) {
    const w = this.sgeo.servingW;
    this.tweens.add({
      targets: piece, x: serving.home.x, y: serving.home.y - (this.level.drink ? 0 : w * 0.08), duration: 200, ease: 'Sine.Out',
      onComplete: () => {
        piece.destroy();
        if (serving.eaten) return;
        serving.image.setTexture(this.level.servingTexture).setVisible(true);
        this.layoutServings();
      },
    });
  }

  eat(serving, piece, done) {
    if (this.level.drink) { this.drink(serving, piece, done); return; }
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
        this.sfx('bite');
        this.streamer.setPose('chewing');
        this.streamer.bounce();
        burstHearts(this, mouth.x + 50, mouth.y - 20, { count: 2, size: 16 });
        // Viewers react on every bite: emoji rise along both screen edges.
        emojiStream(this, this.frame, { perSide: 2, spreadMs: 450 });
        this.time.delayedCall(TIMINGS.biteChewMs, () => {
          if (!last) return biteLoop(i + 1);
          piece.destroy();
          this.streamer.setPose('happy');
          this.finishServing(mouth, done);
          return undefined;
        });
      });
    };
  }

  finishServing(mouth, done) {
    this.servingsEaten += 1;
    // Food-specific reaction (spicy fire, cold frost, hot steam) on the first and last serving.
    const react = this.servingsEaten === 1 || this.servingsEaten === this.level.servings;
    const reactMs = react ? playReaction(this, this.streamer, this.level.reaction) : 0;
    if (!reactMs) burstHearts(this, mouth.x, mouth.y - 60, { count: 6, size: 24 });
    emojiStream(this, this.frame, { perSide: 4, spreadMs: 700 });
    this.feed.push();
    this.time.delayedCall(TIMINGS.afterServingMs + reactMs, () => {
      done();
      if (this.servingsEaten >= this.level.servings) this.finishLevel();
    });
  }

  // Drinks: the cup is held with the straw at the mouth, drains stage by stage with each
  // sip (biteTextures: full → … → empty), then is put back on its spot, empty.
  drink(serving, piece, done) {
    const stages = this.level.biteTextures;
    const mouth = this.streamer.mouth();
    const holdScale = (this.sgeo.servingW * 0.82) / piece.width;
    const holdY = mouth.y + piece.height * holdScale * 0.47;
    this.tweens.add({ targets: piece, x: mouth.x, y: holdY, scale: holdScale, duration: 240, ease: 'Sine.Out', onComplete: () => sip(1) });
    const sip = (i) => {
      if (!this.scene.isActive()) return;
      this.streamer.setPose('eating');
      this.time.delayedCall(TIMINGS.biteOpenMs, () => {
        // The next fill level fades in over the current one: the tea visibly goes down.
        // Stage sprites differ in pixel size, so each is fitted to the held cup's width.
        const width = piece.displayWidth;
        const next = this.add.image(piece.x, piece.y, stages[i]).setDepth(piece.depth + 0.1).setAlpha(0);
        next.setScale(width / next.width);
        this.tweens.add({ targets: next, alpha: 1, duration: 260, onComplete: () => { piece.setTexture(stages[i]).setScale(width / piece.width); next.destroy(); } });
        this.sfx('sip');
        this.streamer.setPose('chewing');
        this.streamer.bounce();
        burstHearts(this, mouth.x + 50, mouth.y - 20, { count: 2, size: 16 });
        emojiStream(this, this.frame, { perSide: 2, spreadMs: 450 });
        this.time.delayedCall(TIMINGS.biteChewMs, () => (i < stages.length - 1 ? sip(i + 1) : putDown()));
      });
    };
    const putDown = () => {
      this.streamer.setPose('happy');
      const { servingW: w, servingH: h } = this.sgeo;
      const scale = Math.min(w / piece.width, h / piece.height);
      this.tweens.add({
        targets: piece, x: serving.foot.x, y: serving.foot.y - (piece.height * scale) / 2, scale, duration: 260, ease: 'Sine.InOut',
        onComplete: () => {
          piece.destroy();
          serving.image.setTexture(this.level.emptyTexture).setVisible(true);
          this.sfx('serve');
          this.layoutServings();
          this.finishServing(mouth, done);
        },
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
    if (this.phase === 'cooking' && this.stepView && !this.advancing && (this.stepView.ready?.() ?? true)) {
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
      // Layout QA: the tabletop edge that hides the heroine, and what stands on the table.
      stage: this.phase === 'mukbang' ? {
        tableTop: this.sgeo.tableTop,
        character: this.streamer.image.getBounds(),
        mouth: this.streamer.mouth(),
        servings: this.servings.filter((s) => s.image.visible && !s.moving).map((s) => s.image.getBounds()),
      } : null,
    };
  }
}
