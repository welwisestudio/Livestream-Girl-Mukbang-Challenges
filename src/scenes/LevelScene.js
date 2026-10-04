import Phaser from 'phaser';
import { getLevel } from '../content/levels.js';
import { TIMINGS } from '../content/timings.js';
import { COLORS } from '../content/theme.js';
import { createRunId } from '../core/createRunId.js';
import { DragDropMechanic } from '../mechanics/DragDropMechanic.js';
import { CircularStirMechanic } from '../mechanics/CircularStirMechanic.js';
import { DirectionalDragMechanic } from '../mechanics/DirectionalDragMechanic.js';
import { TapChoiceMechanic } from '../mechanics/TapChoiceMechanic.js';
import {
  addCommentBubble, addDragHint, addHud, addInstruction, addPastelBackground, addStepProgress,
  addAtlasSprite, addCheck, ATLAS, createButton, drawBerryCluster, drawBowl, drawCharacter, drawJelly, drawPitcher, pulseInvalid,
} from '../ui/art.js';

export class LevelScene extends Phaser.Scene {
  constructor() { super('Level'); }

  init(data) {
    this.level = getLevel(data.levelId);
    this.runId = createRunId(this.level.id);
    this.phase = 'prestream';
    this.stepIndex = -1;
    this.servingsEaten = 0;
    this.debugTargets = {};
    this.advancing = false;
    this.transitionSerial = 0;
  }

  create() {
    this.services = this.registry.get('services');
    addPastelBackground(this);
    const save = this.services.save.snapshot();
    this.hud = addHud(this, { level: save.highestLevel, coins: save.coins, title: this.level.title });
    this.content = this.add.container(0, 0);
    this.showPreStream();
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.disposeMechanic());
  }

  clearContent() {
    this.disposeMechanic();
    this.content.removeAll(true);
    this.debugTargets = {};
  }

  disposeMechanic() {
    this.mechanic?.dispose?.();
    this.mechanic = null;
  }

  addToContent(...objects) {
    this.content.add(objects.flat().filter(Boolean));
  }

  showPreStream() {
    this.clearContent();
    this.phase = 'prestream';
    const character = drawCharacter(this, 195, 330, { scale: 1.08 });
    const request = this.add.container(195, 132);
    const card = this.add.graphics();
    card.fillStyle(COLORS.paper).fillRoundedRect(-158, -42, 316, 84, 24);
    card.lineStyle(4, COLORS.pinkDark).strokeRoundedRect(-158, -42, 316, 84, 24);
    const label = this.add.text(0, -12, 'VIEWER REQUEST', { fontFamily: 'Trebuchet MS', fontSize: '17px', fontStyle: 'bold', color: '#d86f8b' }).setOrigin(0.5);
    const food = this.add.text(0, 17, 'Orange jelly · Reward 200', { fontFamily: 'Trebuchet MS', fontSize: '16px', color: '#63475b' }).setOrigin(0.5);
    request.add([card, label, food]);
    const c1 = addCommentBubble(this, 195, 500, 'This is my favorite comfort food!');
    const c2 = addCommentBubble(this, 195, 548, 'Let’s make something jiggly!');
    const button = createButton(this, { x: 195, y: 705, label: 'Make Jelly', onClick: () => this.beginCooking() });
    this.addToContent(character, request, c1, c2, button);
    this.debugTargets = { makeJelly: { x: 195, y: 705 } };
  }

  beginCooking() {
    if (this.transitioning) return;
    this.transitioning = true;
    this.cameras.main.fadeOut(TIMINGS.transitionMs / 2, 255, 249, 244);
    const serial = ++this.transitionSerial;
    this.time.delayedCall(TIMINGS.transitionMs / 2, () => {
      if (serial !== this.transitionSerial || !this.scene.isActive()) return;
      this.transitioning = false;
      this.cameras.main.fadeIn(TIMINGS.transitionMs / 2, 255, 249, 244);
      this.showStep(0);
    });
  }

  showStep(index) {
    if (index < 0 || index >= this.level.steps.length) return;
    this.clearContent();
    this.phase = 'cooking';
    this.stepIndex = index;
    this.advancing = false;
    const step = this.level.steps[index];
    this.addToContent(addStepProgress(this, index, this.level.steps.length), addInstruction(this, step.instruction));
    if (step.id === 'choose-mold') this.setupChoiceStep();
    if (step.id === 'pour-mix') this.setupPourStep();
    if (step.id === 'stir') this.setupStirStep();
    if (step.id === 'unmold') this.setupUnmoldStep();
    if (step.id === 'add-berries') this.setupBerryStep();
    if (step.id === 'add-glaze') this.setupGlazeStep();
  }

  createChoiceCard(x, frame, label, locked = false) {
    const root = this.add.container(x, 690);
    const g = this.add.graphics();
    g.fillStyle(COLORS.paper).fillRoundedRect(-52, -68, 104, 136, 22);
    g.lineStyle(4, locked ? 0xc9aebd : COLORS.pinkDark).strokeRoundedRect(-52, -68, 104, 136, 22);
    const icon = addAtlasSprite(this, frame, 0, -15, { width: 80, height: 80, depth: 1 });
    if (locked) icon.setTint(0xb8aeba).setAlpha(0.72);
    const text = this.add.text(0, 38, locked ? '🔒 Level 2' : label, {
      fontFamily: 'Trebuchet MS', fontSize: locked ? '12px' : '14px', fontStyle: 'bold', color: '#73586c',
    }).setOrigin(0.5);
    root.add([g, icon, text]).setSize(104, 136);
    return root;
  }

  setupChoiceStep() {
    this.addToContent(drawBowl(this, 195, 395));
    const purple = this.createChoiceCard(76, ATLAS.mold, 'Level 2', true);
    const orange = this.createChoiceCard(195, ATLAS.bowl, 'Orange');
    const blue = this.createChoiceCard(314, ATLAS.plainJelly, 'Level 2', true);
    this.addToContent(purple, orange, blue);
    this.debugTargets = { wrongChoice: { x: 76, y: 690 }, correctChoice: { x: 195, y: 690 } };
    this.mechanic = new TapChoiceMechanic({
      choices: [
        { id: 'purple', gameObject: purple }, { id: 'orange', gameObject: orange }, { id: 'blue', gameObject: blue },
      ],
      correctId: 'orange',
      onInvalid: (choice) => pulseInvalid(this, choice.gameObject),
      onComplete: (choice) => {
        this.tweens.add({ targets: choice.gameObject, y: 625, duration: 220, ease: 'Back.Out' });
        const check = addCheck(this, 195, 548, () => {
          check.disableInteractive();
          this.completeStep();
        });
        this.content.add(check);
        this.debugTargets.confirm = { x: 195, y: 548 };
      },
    });
  }

  setupPourStep() {
    const bowl = drawBowl(this, 195, 405);
    const pitcher = drawPitcher(this, 82, 675);
    this.addToContent(bowl, pitcher);
    const hint = addDragHint(this, { from: { x: 82, y: 675 }, to: { x: 195, y: 385 } });
    this.addToContent(hint);
    this.debugTargets = { dragFrom: { x: 82, y: 675 }, target: { x: 195, y: 385 }, wrongTarget: { x: 340, y: 250 } };
    this.mechanic = new DragDropMechanic(this, {
      draggable: pitcher, target: { x: 195, y: 385, radius: 100 },
      onProgress: () => hint.destroy(),
      onInvalid: () => pulseInvalid(this, pitcher),
      onComplete: () => {
        hint.destroy();
        this.tweens.add({ targets: pitcher, x: 245, y: 315, angle: -42, duration: 240, ease: 'Sine.Out' });
        this.completeStep();
      },
    });
  }

  setupStirStep() {
    const bowl = drawBowl(this, 195, 405, { liquid: 0xf7a74f });
    const spoon = addAtlasSprite(this, ATLAS.hand, 195, 315, { width: 78, height: 78, depth: 30 });
    const barBg = this.add.graphics().fillStyle(0xe7d5dd).fillRoundedRect(85, 535, 220, 24, 12);
    const bar = this.add.graphics();
    const hint = addDragHint(this, { from: { x: 195, y: 317 }, to: { x: 195, y: 405 }, circular: true });
    this.addToContent(bowl, spoon, barBg, bar, hint);
    this.debugTargets = { stirCenter: { x: 195, y: 405 }, stirRadius: 82, handle: { x: 195, y: 317 }, wrongPathEnd: { x: 195, y: 500 } };
    this.mechanic = new CircularStirMechanic(this, {
      handle: spoon, center: { x: 195, y: 405 }, innerRadius: 46, outerRadius: 112, turns: 1.15,
      onProgress: (progress) => {
        hint.destroy();
        bar.clear().fillStyle(COLORS.orange).fillRoundedRect(89, 539, 212 * progress, 16, 8);
      },
      onInvalid: () => pulseInvalid(this, spoon),
      onComplete: () => this.completeStep(),
    });
  }

  setupUnmoldStep() {
    const jelly = drawJelly(this, 195, 430, { berries: false, glaze: false });
    jelly.setAlpha(0.18);
    const mold = drawBowl(this, 195, 385, { inverted: true });
    const hint = addDragHint(this, { from: { x: 195, y: 385 }, to: { x: 195, y: 250 } });
    this.addToContent(jelly, mold, hint);
    this.debugTargets = { dragFrom: { x: 195, y: 385 }, target: { x: 195, y: 245 }, wrongTarget: { x: 320, y: 385 } };
    this.mechanic = new DirectionalDragMechanic(this, {
      draggable: mold, minDistance: 100, maxCrossAxis: 70, direction: 'up',
      onInvalid: () => pulseInvalid(this, mold),
      onComplete: () => {
        hint.destroy();
        jelly.setAlpha(1);
        this.tweens.add({ targets: mold, y: 190, alpha: 0, duration: 320 });
        this.completeStep();
      },
    });
  }

  setupBerryStep() {
    const jelly = drawJelly(this, 195, 420, { berries: false, glaze: false });
    const berries = drawBerryCluster(this, 92, 675);
    const hint = addDragHint(this, { from: { x: 92, y: 675 }, to: { x: 195, y: 380 } });
    this.addToContent(jelly, berries, hint);
    this.debugTargets = { dragFrom: { x: 92, y: 675 }, target: { x: 195, y: 380 }, wrongTarget: { x: 330, y: 250 } };
    this.mechanic = new DragDropMechanic(this, {
      draggable: berries, target: { x: 195, y: 380, radius: 95 },
      onInvalid: () => pulseInvalid(this, berries),
      onComplete: () => { hint.destroy(); this.completeStep(); },
    });
  }

  setupGlazeStep() {
    const jelly = drawJelly(this, 195, 420, { berries: true, glaze: false });
    const glaze = drawPitcher(this, 302, 670, { color: 0xffefc4, small: true });
    const hint = addDragHint(this, { from: { x: 302, y: 670 }, to: { x: 220, y: 355 } });
    this.addToContent(jelly, glaze, hint);
    this.debugTargets = { dragFrom: { x: 302, y: 670 }, target: { x: 215, y: 365 }, wrongTarget: { x: 55, y: 260 } };
    this.mechanic = new DragDropMechanic(this, {
      draggable: glaze, target: { x: 215, y: 365, radius: 100 },
      onInvalid: () => pulseInvalid(this, glaze),
      onComplete: () => { hint.destroy(); this.showPerfect(); },
    });
  }

  completeStep() {
    if (this.advancing || this.phase !== 'cooking') return;
    this.advancing = true;
    const completedIndex = this.stepIndex;
    this.disposeMechanic();
    this.time.delayedCall(TIMINGS.correctFeedbackMs, () => {
      if (!this.scene.isActive() || this.phase !== 'cooking' || this.stepIndex !== completedIndex) return;
      this.showStep(completedIndex + 1);
    });
  }

  showPerfect() {
    this.disposeMechanic();
    this.phase = 'perfect';
    this.advancing = true;
    this.clearContent();
    const jelly = drawJelly(this, 195, 455, { berries: true, glaze: true });
    const banner = this.add.container(195, 235);
    const g = this.add.graphics();
    g.fillStyle(COLORS.pink).fillRoundedRect(-140, -42, 280, 84, 36);
    g.lineStyle(5, COLORS.paper).strokeRoundedRect(-136, -38, 272, 76, 32);
    const text = this.add.text(0, 0, 'Perfect!!', { fontFamily: 'Trebuchet MS', fontSize: '38px', fontStyle: 'bold', color: '#ffffff', stroke: '#d96f8b', strokeThickness: 5 }).setOrigin(0.5);
    banner.add([g, text]).setScale(0.15);
    this.addToContent(jelly, banner);
    this.tweens.add({ targets: banner, scale: 1, duration: 520, ease: 'Back.Out' });
    this.time.delayedCall(TIMINGS.perfectHoldMs, () => this.startMukbang());
  }

  startMukbang() {
    this.clearContent();
    this.phase = 'mukbang';
    this.advancing = false;
    this.servingsEaten = 0;
    this.drawMukbangRound();
  }

  drawMukbangRound() {
    this.clearContent();
    const character = drawCharacter(this, 195, 360, { scale: 1.05, mouthOpen: false });
    const comments = [
      addCommentBubble(this, 195, 492, 'This is heaven on a plate!'),
      addCommentBubble(this, 195, 533, 'The jelly looks so bouncy ✨'),
    ];
    this.addToContent(character, comments);
    const positions = [{ x: 92, y: 660 }, { x: 195, y: 700 }, { x: 298, y: 660 }];
    const servings = [];
    for (let i = this.servingsEaten; i < this.level.servings; i += 1) {
      const p = positions[i];
      const jelly = drawJelly(this, p.x, p.y, { scale: 0.54 });
      servings.push(jelly);
      this.addToContent(jelly);
    }
    const active = servings[0];
    const originIndex = this.servingsEaten;
    const mouth = { x: 195, y: 338, radius: 62 };
    this.debugTargets = {
      serving: { x: positions[originIndex].x, y: positions[originIndex].y },
      mouth: { x: mouth.x, y: mouth.y },
      wrongTarget: { x: 45, y: 250 },
    };
    this.mechanic = new DragDropMechanic(this, {
      draggable: active, target: mouth,
      onInvalid: () => pulseInvalid(this, active),
      onComplete: () => {
        this.disposeMechanic();
        this.debugTargets = {};
        active.destroy();
        character.destroy();
        const open = drawCharacter(this, 195, 360, { scale: 1.05, mouthOpen: true });
        this.content.add(open);
        this.servingsEaten += 1;
        this.time.delayedCall(TIMINGS.servingReactionMs, () => {
          if (this.servingsEaten >= this.level.servings) this.finishLevel();
          else this.drawMukbangRound();
        });
      },
    });
  }

  finishLevel() {
    if (this.advancing) return;
    this.advancing = true;
    this.phase = 'complete';
    this.cameras.main.fadeOut(TIMINGS.transitionMs, 255, 244, 247);
    this.time.delayedCall(TIMINGS.transitionMs, () => this.scene.start('Result', { levelId: this.level.id, runId: this.runId }));
  }

  getDebugSnapshot() {
    return {
      scene: 'Level', phase: this.phase, stepIndex: this.stepIndex, stepId: this.level.steps[this.stepIndex]?.id ?? null,
      servingsEaten: this.servingsEaten, targets: this.debugTargets,
    };
  }
}
