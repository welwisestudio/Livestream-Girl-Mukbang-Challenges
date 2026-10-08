import Phaser from 'phaser';
import { DEPTH } from '../ui/layout.js';
import { sparkle } from '../ui/actors.js';
import { DragDropMechanic } from '../mechanics/DragDropMechanic.js';
import { StirMechanic } from '../mechanics/StirMechanic.js';
import { DirectionalDragMechanic } from '../mechanics/DirectionalDragMechanic.js';
import { TIMINGS } from '../content/timings.js';
import { placeWork, crossfade, wobble, enterWork, decorAdd, particleDecor } from './stepKit.js';
import { placeStep, dipStep, gestureStep, traceStep, cookStep } from './recipeSteps.js';

export { placeWork };

// Each cooking step kind is a small view+mechanic pair driven by the level config.
// Contract: create(scene, step) → { layout(geo), dispose(), targets() }.
// `scene.completeStep()` must be called exactly once when the step is done.

// --- pour: drag the pitcher onto the bowl; it tilts and fills the bowl ----------------------------
function pourStep(scene, step) {
  enterWork(scene, step.before);
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
                onUpdate: () => stream.clear().fillStyle(step.liquid ?? 0xffa63d, 1).fillRoundedRect(sx - 7, sy, 14, (ty - sy) * s.h, 7),
              });
              scene.time.delayedCall(300, () => {
                if (step.after !== step.before) { crossfade(scene, bowl, step.after, g, 650); return; }
                // Same food sprite (syrup, sauce, milk over the dish): the poured liquid stays on top.
                const pool = Array.from({ length: 9 }, (_, i) => ({ x: (i - 4) * 0.035, y: -0.06 + Math.sin(i * 1.7) * 0.03, color: step.liquid ?? 0xffa63d, s: 1.6 }));
                decorAdd(scene, particleDecor(scene, 'blob', pool));
              });
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
// How each stirring tool is held: `origin` is the working end (whisk wires, spoon bowl, brush
// bristles) that goes into the food and `angle` turns the sprite so the handle points up and out.
// The k-whisk / k-chasen sprites are drawn working-end-up, so they are turned over; without this
// the handle ended up in the batter (designer report: "the whisk is upside down", Levels 6 and 7).
const STIR_GRIP = {
  'k-whisk': { origin: [0.8, 0.13], angle: 180 },
  'k-chasen': { origin: [0.5, 0.95], angle: 0 },
};
const DEFAULT_GRIP = { origin: [0.22, 0.88], angle: 0 };

function stirStep(scene, step) {
  enterWork(scene, step.base);
  const bowl = scene.add.image(0, 0, step.base).setDepth(DEPTH.food);
  const swirl = scene.add.graphics().setDepth(DEPTH.food + 1);
  const gripPreset = STIR_GRIP[step.tool] ?? DEFAULT_GRIP;
  const grip = step.toolAngle === undefined ? gripPreset : { ...gripPreset, angle: step.toolAngle };
  const whisk = scene.add.image(0, 0, step.tool).setDepth(DEPTH.tools).setOrigin(...grip.origin);
  let geo = null;
  let rotation = 0;
  scene.progress.setSub(0);

  const liquid = (g) => ({ x: g.work.x, y: g.work.y - bowl.displayHeight * 0.3, rx: bowl.displayWidth * 0.36, ry: bowl.displayHeight * 0.1 });
  const restWhisk = (g) => {
    const l = liquid(g);
    whisk.setPosition(l.x + l.rx * 0.25, l.y + l.ry * 0.2).setAngle(grip.angle - 8);
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
      whisk.setPosition(l.x + dx * k * l.rx, l.y + dy * k * l.ry * 1.1).setAngle(grip.angle - 8 + dx * k * 10);
    },
    onProgress: (p) => {
      rotation += 0.35;
      scene.progress.setSub(p);
      drawSwirl(p);
    },
    onComplete: () => {
      scene.progress.setSub(1);
      if (step.result && step.result !== step.base) crossfade(scene, bowl, step.result, geo, 280);
      scene.tweens.add({ targets: whisk, y: whisk.y - 140, alpha: 0, angle: grip.angle + 20, duration: 360, ease: 'Sine.In' });
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

// --- tap process: ovens, heat and sealing machines -----------------------------------------------
function tapProcessStep(scene, step) {
  enterWork(scene, step.before);
  const base = scene.add.image(0, 0, step.before).setDepth(DEPTH.food);
  const tool = scene.add.image(0, 0, step.tool).setDepth(DEPTH.tools).setInteractive({ useHandCursor: true });
  let geo = null; let active = true;
  const activate = () => {
    if (!active) return; active = false; scene.hint.hide(); tool.disableInteractive();
    scene.tweens.add({ targets: tool, scale: tool.scale * 0.92, duration: 130, yoyo: true, repeat: 1 });
    crossfade(scene, base, step.after, geo, 420); sparkle(scene, geo.work.x, geo.work.y, { count: 10, radius: geo.work.size * 0.52 });
    scene.time.delayedCall(520, () => scene.completeStep());
  };
  tool.on('pointerdown', activate);
  const view = {
    layout(g) {
      geo = g; placeWork(base, g);
      const s = (g.work.size * 0.32) / Math.max(tool.width, tool.height);
      tool.setScale(s).setPosition(g.work.x + g.work.size * 0.34, g.work.y + g.work.maxH * 0.3);
      if (active) scene.hint.tap(g.frame, { x: tool.x, y: tool.y });
    },
    targets: () => ({ process: { x: tool.x, y: tool.y }, wrongTarget: { x: geo.frame.colLeft + 20, y: geo.work.y } }),
    dispose() { tool.off('pointerdown', activate); base.destroy(); tool.destroy(); },
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

const KINDS = {
  pour: pourStep, stir: stirStep, unmold: unmoldStep,
  'tap-process': tapProcessStep,
  place: placeStep, dip: dipStep, gesture: gestureStep, trace: traceStep, cook: cookStep,
};

export function createStepView(scene, step) {
  const factory = KINDS[step.kind];
  if (!factory) throw new Error(`Unknown step kind: ${step.kind}`);
  return factory(scene, step);
}
