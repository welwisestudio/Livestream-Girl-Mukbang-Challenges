import { DEPTH } from '../ui/layout.js';
import { ChoiceCard, CheckButton, layoutCardRow } from '../ui/controls.js';
import { sparkle } from '../ui/actors.js';
import { TapChoiceMechanic } from '../mechanics/TapChoiceMechanic.js';
import { DragDropMechanic } from '../mechanics/DragDropMechanic.js';
import { StirMechanic } from '../mechanics/StirMechanic.js';
import { DirectionalDragMechanic } from '../mechanics/DirectionalDragMechanic.js';
import { TIMINGS } from '../content/timings.js';

// Each cooking step kind is a small view+mechanic pair driven by the level config.
// Contract: create(scene, step) → { layout(geo), dispose(), targets() }.
// `scene.completeStep()` must be called exactly once when the step is done.

// Display width of work objects relative to the work box, so consecutive steps line up.
const WIDTH = { bowl: 0.8, 'bowl-filled': 0.8, 'jelly-plain': 1, 'jelly-berries': 1, 'jelly-finished': 1 };

export function placeWork(image, geo, key = image.texture.key) {
  const width = geo.work.size * (WIDTH[key] ?? 1);
  const scale = Math.min(width / image.width, geo.work.maxH / image.height);
  image.setScale(scale).setPosition(geo.work.x, geo.work.y);
  return scale;
}

function crossfade(scene, image, key, geo, duration = 360) {
  const ghost = scene.add.image(image.x, image.y, key).setDepth(image.depth + 1).setAlpha(0);
  placeWork(ghost, geo, key);
  scene.tweens.add({
    targets: ghost, alpha: 1, duration,
    onComplete: () => {
      scene.tweens.killTweensOf(image);
      image.setTexture(key);
      placeWork(image, geo, key);
      ghost.destroy();
    },
  });
}

function wobble(scene, image) {
  const s = image.scale;
  scene.tweens.add({ targets: image, scaleY: s * 0.9, scaleX: s * 1.06, duration: 120, yoyo: true, repeat: 1, ease: 'Sine.InOut' });
}

function makeCards(scene, step) {
  return step.options.map((option) => new ChoiceCard(scene, {
    id: option.id, texture: option.texture, label: option.label, locked: option.locked, lockLabel: option.lockLabel,
  }));
}

// --- choice: tap the right card, the item appears, confirm with ✓ -------------------------------
function choiceStep(scene, step) {
  const cards = makeCards(scene, step);
  const correct = cards.find((card) => step.options.find((o) => o.id === card.id)?.correct);
  const wrong = cards.find((card) => card !== correct);
  const item = scene.add.image(0, 0, step.result).setDepth(DEPTH.food).setVisible(false);
  let check = null;
  let geo = null;

  const mechanic = new TapChoiceMechanic({
    choices: cards.map((card) => ({ id: card.id, target: card.zone, card })),
    correctId: correct.id,
    onInvalid: ({ card }) => card.shake(),
    onComplete: ({ card }) => {
      card.setSelected(true);
      card.pop();
      item.setVisible(true);
      const scale = placeWork(item, geo);
      item.setScale(scale * 0.4);
      scene.tweens.add({ targets: item, scale, duration: 300, ease: 'Back.Out' });
      check = new CheckButton(scene, { onClick: () => scene.completeStep() });
      view.layout(geo);
    },
  });

  const view = {
    layout(g) {
      geo = g;
      layoutCardRow(cards, g.frame, g.cardsY);
      if (item.visible) placeWork(item, g);
      if (check) {
        check.layout({ x: g.check.x, y: g.check.y, frame: g.frame });
        scene.hint.tap(g.frame, check.center());
      } else {
        scene.hint.tap(g.frame, correct.center());
      }
    },
    targets: () => ({ wrongChoice: wrong.center(), correctChoice: correct.center(), ...(check ? { confirm: check.center() } : {}) }),
    dispose() {
      mechanic.dispose();
      cards.forEach((card) => card.destroy());
      check?.destroy();
      item.destroy();
    },
  };
  return view;
}

// --- topping: base dish stays in the middle, tap a topping card, it lands, confirm with ✓ ---------
function toppingStep(scene, step) {
  const cards = makeCards(scene, step);
  const correct = cards.find((card) => step.options.find((o) => o.id === card.id)?.correct);
  const wrong = cards.find((card) => card !== correct);
  const dish = scene.add.image(0, 0, step.base).setDepth(DEPTH.food);
  let check = null;
  let geo = null;
  let busy = false;

  const finish = () => {
    crossfade(scene, dish, step.result, geo);
    sparkle(scene, geo.work.x, geo.work.y - geo.work.maxH * 0.2, { count: 8, radius: geo.work.size * 0.45 });
    scene.time.delayedCall(380, () => {
      if (!scene.scene.isActive() || scene.stepView !== view) return;
      check = new CheckButton(scene, { onClick: () => scene.completeStep() });
      view.layout(geo);
    });
  };

  const mechanic = new TapChoiceMechanic({
    choices: cards.map((card) => ({ id: card.id, target: card.zone, card })),
    correctId: correct.id,
    onInvalid: ({ card }) => card.shake(),
    onComplete: ({ card }) => {
      busy = true;
      card.setSelected(true);
      card.pop();
      scene.hint.hide();
      const option = step.options.find((o) => o.id === card.id);
      const flyer = scene.add.image(card.center().x, card.center().y, option.texture).setDepth(DEPTH.tools);
      const size = geo.work.size * (step.pour ? 0.42 : 0.36);
      const scale = size / Math.max(flyer.width, flyer.height);
      flyer.setScale(scale * 0.6);
      if (step.pour) {
        // Pitcher hovers above-right of the dish, tilts and drizzles.
        const px = geo.work.x + geo.work.size * 0.28;
        const py = geo.work.y - geo.work.maxH * 0.62;
        const stream = scene.add.graphics().setDepth(DEPTH.tools - 1);
        scene.tweens.chain({
          targets: flyer,
          tweens: [
            { x: px, y: py, scale, duration: TIMINGS.toppingFlyMs, ease: 'Sine.Out' },
            {
              angle: -48, duration: 260, ease: 'Sine.InOut',
              onComplete: () => {
                const sx = flyer.x - flyer.displayWidth * 0.42;
                const sy = flyer.y - flyer.displayHeight * 0.05;
                const ty = geo.work.y - geo.work.maxH * 0.3;
                const s = { h: 0 };
                scene.tweens.add({
                  targets: s, h: 1, duration: 260,
                  onUpdate: () => stream.clear().fillStyle(0xfff6dc, 1).fillRoundedRect(sx - 5, sy, 10, (ty - sy) * s.h, 5),
                });
                scene.time.delayedCall(520, finish);
              },
            },
            { angle: -48, duration: 760 },
            { alpha: 0, y: py - 30, angle: 0, duration: 260, onStart: () => stream.destroy() },
          ],
          onComplete: () => { flyer.destroy(); busy = false; },
        });
      } else {
        scene.tweens.add({
          targets: flyer,
          x: geo.work.x,
          y: geo.work.y - geo.work.maxH * 0.32,
          scale,
          duration: TIMINGS.toppingFlyMs,
          ease: 'Sine.In',
          onComplete: () => {
            scene.tweens.add({ targets: flyer, alpha: 0, scale: scale * 0.8, duration: 160, onComplete: () => flyer.destroy() });
            wobble(scene, dish);
            finish();
            busy = false;
          },
        });
      }
    },
  });

  const view = {
    layout(g) {
      geo = g;
      layoutCardRow(cards, g.frame, g.cardsY);
      placeWork(dish, g);
      if (check) {
        check.layout({ x: g.check.x, y: g.check.y, frame: g.frame });
        scene.hint.tap(g.frame, check.center());
      } else if (!busy && mechanic.active) {
        scene.hint.tap(g.frame, correct.center());
      }
    },
    targets: () => ({ wrongChoice: wrong.center(), correctChoice: correct.center(), ...(check ? { confirm: check.center() } : {}) }),
    dispose() {
      mechanic.dispose();
      cards.forEach((card) => card.destroy());
      check?.destroy();
      dish.destroy();
    },
  };
  return view;
}

// --- pour: drag the pitcher onto the bowl; it tilts and fills the bowl ----------------------------
function pourStep(scene, step) {
  const bowl = scene.add.image(0, 0, step.before).setDepth(DEPTH.food);
  const pitcher = scene.add.image(0, 0, step.tool).setDepth(DEPTH.tools);
  let geo = null;
  let pouring = false;
  const toolScale = (g) => (g.work.size * 0.46) / Math.max(pitcher.width, pitcher.height);
  const target = (g) => ({ x: g.work.x, y: g.work.y - g.work.maxH * 0.3, radius: Math.max(95, g.work.size * 0.62) });

  const mechanic = new DragDropMechanic(scene, {
    draggable: pitcher,
    target: { x: 0, y: 0, radius: 1 },
    onStart: () => scene.hint.hide(),
    onInvalid: () => view.layout(geo),
    onComplete: () => {
      pouring = true;
      const g = geo;
      const px = g.work.x + g.work.size * 0.3;
      const py = g.work.y - g.work.maxH * 0.72;
      const stream = scene.add.graphics().setDepth(DEPTH.tools - 1);
      scene.tweens.chain({
        targets: pitcher,
        tweens: [
          { x: px, y: py, duration: 200, ease: 'Sine.Out' },
          {
            angle: -52, duration: 260, ease: 'Sine.InOut',
            onComplete: () => {
              const sx = pitcher.x - pitcher.displayWidth * 0.36;
              const sy = pitcher.y - pitcher.displayHeight * 0.08;
              const ty = g.work.y - g.work.maxH * 0.2;
              const s = { h: 0 };
              scene.tweens.add({
                targets: s, h: 1, duration: 240,
                onUpdate: () => stream.clear().fillStyle(0xffa63d, 1).fillRoundedRect(sx - 7, sy, 14, (ty - sy) * s.h, 7),
              });
              scene.time.delayedCall(300, () => crossfade(scene, bowl, step.after, g, 650));
            },
          },
          { angle: -52, duration: TIMINGS.pourMs },
          { alpha: 0, y: py - 40, angle: -10, duration: 260, onStart: () => stream.destroy() },
        ],
        onComplete: () => scene.completeStep(),
      });
    },
  });

  const view = {
    layout(g) {
      geo = g;
      placeWork(bowl, g);
      if (pouring) return;
      const s = toolScale(g);
      mechanic.setHome(g.tool.x, g.tool.y, s);
      mechanic.setTarget(target(g));
      if (!mechanic.dragging) scene.hint.drag(g.frame, g.tool, target(g));
    },
    targets: () => ({ dragFrom: { x: mechanic.home.x, y: mechanic.home.y }, target: target(geo), wrongTarget: { x: geo.frame.colRight - 30, y: geo.work.y - geo.work.maxH * 0.9 } }),
    dispose() {
      mechanic.dispose();
      scene.tweens.killTweensOf(pitcher);
      bowl.destroy();
      pitcher.destroy();
    },
  };
  return view;
}

// --- stir: circle on the bowl until the bar fills ------------------------------------------------
function stirStep(scene, step) {
  const bowl = scene.add.image(0, 0, step.base).setDepth(DEPTH.food);
  const swirl = scene.add.graphics().setDepth(DEPTH.food + 1);
  const whisk = scene.add.image(0, 0, step.tool).setDepth(DEPTH.tools).setOrigin(0.22, 0.88);
  let geo = null;
  let rotation = 0;
  scene.progress.setSub(0);

  const liquid = (g) => ({ x: g.work.x, y: g.work.y - bowl.displayHeight * 0.3, rx: bowl.displayWidth * 0.36, ry: bowl.displayHeight * 0.1 });
  const restWhisk = (g) => {
    const l = liquid(g);
    whisk.setPosition(l.x + l.rx * 0.25, l.y + l.ry * 0.2).setAngle(-8);
  };
  const drawSwirl = (progress) => {
    const l = liquid(geo);
    swirl.clear();
    swirl.lineStyle(3, 0xffe2b0, 0.85);
    for (let i = 0; i < 3; i += 1) {
      const start = rotation + (i * Math.PI * 2) / 3;
      swirl.beginPath();
      for (let t = 0; t <= 1; t += 0.1) {
        const a = start + t * 1.6;
        const r = 0.35 + 0.5 * t;
        const x = l.x + Math.cos(a) * l.rx * r;
        const y = l.y + Math.sin(a) * l.ry * r;
        if (t === 0) swirl.moveTo(x, y); else swirl.lineTo(x, y);
      }
      swirl.strokePath();
    }
    swirl.setAlpha(0.4 + progress * 0.6);
  };

  const mechanic = new StirMechanic(scene, {
    center: { x: 0, y: 0 }, radius: 100, turns: step.turns,
    onStart: () => scene.hint.hide(),
    onMove: ({ x, y }) => {
      const l = liquid(geo);
      // Whisk tip stays inside the liquid ellipse while following the finger.
      const dx = (x - l.x) / l.rx;
      const dy = (y - l.y) / (l.ry * 2.2);
      const d = Math.hypot(dx, dy);
      const k = d > 1 ? 1 / d : 1;
      whisk.setPosition(l.x + dx * k * l.rx, l.y + dy * k * l.ry * 1.1).setAngle(-8 + dx * k * 10);
    },
    onProgress: (p) => {
      rotation += 0.35;
      scene.progress.setSub(p);
      drawSwirl(p);
    },
    onComplete: () => {
      scene.progress.setSub(1);
      scene.tweens.add({ targets: whisk, y: whisk.y - 140, alpha: 0, angle: 20, duration: 360, ease: 'Sine.In' });
      sparkle(scene, geo.work.x, geo.work.y - geo.work.maxH * 0.25, { radius: geo.work.size * 0.5 });
      scene.time.delayedCall(360, () => scene.completeStep());
    },
  });

  const view = {
    layout(g) {
      geo = g;
      placeWork(bowl, g);
      const whiskSize = g.work.size * 0.55;
      whisk.setScale(whiskSize / Math.max(whisk.width, whisk.height));
      if (mechanic.active) {
        restWhisk(g);
        const l = liquid(g);
        mechanic.setGeometry({ x: g.work.x, y: g.work.y }, Math.max(110, g.work.size * 0.5));
        if (mechanic.pointerId === null && mechanic.getProgress() === 0) scene.hint.circle(g.frame, { x: l.x, y: l.y + l.ry }, l.rx * 0.9);
      }
      drawSwirl(mechanic.getProgress());
    },
    targets: () => ({ stirCenter: { x: geo.work.x, y: geo.work.y }, stirRadius: Math.round(Math.max(110, geo.work.size * 0.5) * 0.6), handle: { x: whisk.x, y: whisk.y } }),
    dispose() {
      mechanic.dispose();
      scene.progress.setSub(null);
      scene.tweens.killTweensOf(whisk);
      bowl.destroy();
      swirl.destroy();
      whisk.destroy();
    },
  };
  return view;
}

// --- unmold: the bowl sits upside-down on a plate; lift it straight up --------------------------
function unmoldStep(scene, step) {
  const jelly = scene.add.image(0, 0, step.reveal).setDepth(DEPTH.food);
  const mold = scene.add.image(0, 0, step.mold).setDepth(DEPTH.tools).setFlipY(true);
  const frost = scene.add.graphics().setDepth(DEPTH.tools + 1);
  let geo = null;
  let lifted = false;

  const moldHome = (g) => ({ x: g.work.x, y: g.work.y - jelly.displayHeight * 0.1 });

  const mechanic = new DirectionalDragMechanic(scene, {
    draggable: mold,
    direction: 'up',
    onStart: () => scene.hint.hide(),
    onInvalid: () => view.layout(geo),
    onComplete: () => {
      lifted = true;
      scene.tweens.add({ targets: mold, y: mold.y - geo.work.maxH * 1.1, alpha: 0, duration: 380, ease: 'Sine.In' });
      jelly.setAlpha(1);
      wobble(scene, jelly);
      sparkle(scene, geo.work.x, geo.work.y - geo.work.maxH * 0.2, { radius: geo.work.size * 0.5 });
      scene.time.delayedCall(TIMINGS.stepAdvanceMs, () => scene.completeStep());
    },
  });

  // Short "chilling" beat before the lift (frosty sparkle), matching the reference rhythm.
  mechanic.active = false;
  scene.time.delayedCall(80, () => {
    if (!geo) return;
    sparkle(scene, geo.work.x, geo.work.y - geo.work.maxH * 0.1, { count: 10, radius: geo.work.size * 0.55 });
  });
  scene.time.delayedCall(TIMINGS.chillMs * 0.6, () => {
    if (scene.stepView !== view) return;
    mechanic.active = true;
    view.layout(geo);
  });

  const view = {
    layout(g) {
      geo = g;
      placeWork(jelly, g);
      if (!lifted) jelly.setAlpha(1);
      const moldScale = (jelly.displayWidth * 0.74) / mold.width;
      mold.setScale(moldScale);
      if (lifted) return;
      const home = moldHome(g);
      mechanic.setHome(home.x, home.y, { minDistance: Math.max(56, g.work.maxH * 0.22), maxCrossAxis: Math.max(110, g.work.size * 0.5) });
      if (mechanic.active && !mechanic.dragging) scene.hint.lift(g.frame, { x: home.x + mold.displayWidth * 0.1, y: home.y }, { x: home.x + mold.displayWidth * 0.1, y: home.y - g.work.maxH * 0.55 });
    },
    targets: () => {
      const home = moldHome(geo);
      return { dragFrom: home, target: { x: home.x, y: home.y - geo.work.maxH * 0.6 }, wrongTarget: { x: home.x + geo.work.size * 0.7, y: home.y } };
    },
    ready: () => mechanic.active,
    dispose() {
      mechanic.dispose();
      scene.tweens.killTweensOf(mold);
      jelly.destroy();
      mold.destroy();
      frost.destroy();
    },
  };
  return view;
}

const KINDS = { choice: choiceStep, topping: toppingStep, pour: pourStep, stir: stirStep, unmold: unmoldStep };

export function createStepView(scene, step) {
  const factory = KINDS[step.kind];
  if (!factory) throw new Error(`Unknown step kind: ${step.kind}`);
  return factory(scene, step);
}

