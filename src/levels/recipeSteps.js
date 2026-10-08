import Phaser from 'phaser';
import { DEPTH } from '../ui/layout.js';
import { sparkle } from '../ui/actors.js';
import { addText } from '../ui/text.js';
import { DragDropMechanic } from '../mechanics/DragDropMechanic.js';
import { DirectionalDragMechanic } from '../mechanics/DirectionalDragMechanic.js';
import { TraceMechanic } from '../mechanics/TraceMechanic.js';
import {
  placeWork, sizeTo, crossfade, wobble, enterWork, decorAdd, decorClear, toRel, toAbs,
  pieceDecor, sauceDecor, particleDecor,
} from './stepKit.js';

// Recipe-aware step kinds (2026-10-08 redesign). Every kind uses the tool/ingredient named in the
// recipe data and leaves a visible change on the food: a new sprite, a placed piece, a sauce line,
// particles or cut marks. Contract: create(scene, step) → { layout(geo), targets(), dispose() }.

const wrongSpot = (g) => ({ x: g.frame.colRight - 24, y: g.work.y - g.work.maxH * 0.8 });

function finishWith(scene, image, step, geo, delay = 430) {
  if (step.result && step.result !== image.texture.key) crossfade(scene, image, step.result, geo, 360);
  sparkle(scene, geo.work.x, geo.work.y, { count: 10, radius: geo.work.size * 0.5 });
  scene.time.delayedCall(delay, () => scene.completeStep());
}

// A soft round grab-handle for hand gestures (press, pinch, fold) that need no utensil.
function grabTexture(scene) {
  if (!scene.textures.exists('grab-ring')) {
    const g = scene.make.graphics({ x: 0, y: 0 }, false);
    g.fillStyle(0xffffff, 0.55).fillCircle(64, 64, 58);
    g.lineStyle(8, 0xf28bb0, 1).strokeCircle(64, 64, 54);
    g.fillStyle(0xf28bb0, 0.9).fillCircle(64, 64, 14);
    g.generateTexture('grab-ring', 128, 128);
    g.destroy();
  }
  return 'grab-ring';
}

function ringDecor(scene, rel, fraction) {
  const g = scene.add.graphics().setDepth(DEPTH.food + 3);
  return {
    objects: () => [g],
    layout(geo) {
      const p = toAbs(geo, rel);
      const r = geo.work.size * fraction;
      g.clear().lineStyle(Math.max(3, r * 0.12), 0xc79a63, 1).strokeCircle(p.x, p.y, r);
      g.lineStyle(Math.max(2, r * 0.08), 0xc79a63, 1).strokeCircle(p.x, p.y, r * 0.35);
    },
    destroy: () => g.destroy(),
  };
}

function notYet(scene, image, geo) {
  const x0 = image.x;
  scene.tweens.add({ targets: image, x: x0 + 9, duration: 50, yoyo: true, repeat: 3, onComplete: () => image.setX(x0) });
  const t = addText(scene, geo.work.x, geo.work.y - geo.work.maxH * 0.48, 'Not yet!', { size: 24, weight: '700', color: '#ffffff', stroke: '#e0708f', strokeWidth: 6 }).setDepth(DEPTH.banner);
  scene.tweens.add({ targets: t, y: t.y - 30, alpha: 0, delay: 350, duration: 450, onComplete: () => t.destroy() });
}

// --- PLACE: drag a real ingredient onto the food; pieces stay where they land ----------------
export function placeStep(scene, step) {
  enterWork(scene, step.base);
  const base = scene.add.image(0, 0, step.base).setDepth(DEPTH.food);
  const seq = step.sequence ?? null;
  const total = seq ? seq.length : Math.max(1, step.placements ?? 1);
  const itemKey = (i) => (seq ? seq[i].item : step.item);
  const tool = scene.add.image(0, 0, itemKey(0)).setDepth(DEPTH.tools);
  const pieces = [];
  let placed = 0;
  let geo = null;
  let finishing = false;
  scene.progress.setSub(0);

  const target = (g) => ({ x: g.work.x, y: g.work.y, radius: Math.max(92, g.work.size * 0.5) });
  const slot = (i) => {
    const a = (i / total) * Math.PI * 2 - Math.PI / 2;
    const r = total > 1 ? 0.17 : 0;
    return { x: Math.cos(a) * r, y: Math.sin(a) * r * 0.7 - 0.03 };
  };
  const landing = (drop, i) => {
    // Pieces land where the player dropped them, kept on the food and not on top of each other.
    let rel = toRel(geo, drop);
    const d = Math.hypot(rel.x, rel.y);
    const max = step.spread ?? 0.24;
    if (d > max) rel = { x: (rel.x / d) * max, y: (rel.y / d) * max };
    if (total > 1 && pieces.some((p) => Math.hypot(p.x - rel.x, p.y - rel.y) < 0.1)) rel = slot(i);
    pieces.push(rel);
    return rel;
  };

  const mechanic = new DragDropMechanic(scene, {
    draggable: tool,
    target: { x: 0, y: 0, radius: 1 },
    retainInteractive: true,
    onStart: () => scene.hint.hide(),
    onInvalid: () => view.layout(geo),
    onComplete: () => {
      const i = placed;
      placed += 1;
      scene.progress.setSub(placed / total);
      const rel = landing({ x: tool.x, y: tool.y }, i);
      if (seq?.[i]?.result) {
        crossfade(scene, base, seq[i].result, geo, 300);
      } else if (step.stamp) {
        decorAdd(scene, ringDecor(scene, rel, 0.1));
        scene.tweens.add({ targets: tool, scale: tool.scale * 0.85, duration: 90, yoyo: true });
      } else if (step.leave === 'blob') {
        const blobs = Array.from({ length: 6 }, () => ({
          x: rel.x + Phaser.Math.FloatBetween(-0.05, 0.05), y: rel.y + Phaser.Math.FloatBetween(-0.035, 0.035),
          color: step.color ?? 0x8a4a2a, s: Phaser.Math.FloatBetween(0.8, 1.3),
        }));
        decorAdd(scene, particleDecor(scene, 'blob', blobs));
      } else if (step.keep !== false) {
        decorAdd(scene, pieceDecor(scene, itemKey(i), rel, step.pieceSize ?? 0.26, Phaser.Math.Between(-14, 14)));
      }
      wobble(scene, base);
      if (placed >= total && step.tip) {
        // A container (bowl, pan, basket, pot) is tipped over the food and its contents slide in,
        // instead of the whole container being dropped onto the food.
        finishing = true;
        const g = geo;
        const px = g.work.x + g.work.size * 0.16;
        const py = g.work.y - g.work.maxH * 0.32;
        scene.tweens.chain({
          targets: tool,
          tweens: [
            { x: px, y: py, angle: 0, duration: 160, ease: 'Sine.Out' },
            {
              angle: -78, duration: 260, ease: 'Sine.InOut',
              onComplete: () => {
                for (let k = 0; k < 8; k += 1) {
                  const bit = scene.add.circle(px - tool.displayWidth * 0.3 + Phaser.Math.Between(-16, 16), py + Phaser.Math.Between(0, 20), Phaser.Math.Between(4, 8), step.color ?? 0xf3e2b0).setDepth(DEPTH.tools - 1);
                  scene.tweens.add({ targets: bit, y: g.work.y - g.work.maxH * 0.05, alpha: 0, delay: k * 35, duration: 300, ease: 'Sine.In', onComplete: () => bit.destroy() });
                }
                if (step.result && step.result !== base.texture.key) crossfade(scene, base, step.result, g, 380);
              },
            },
            { angle: -78, duration: 380 },
            { alpha: 0, y: py - 40, angle: -20, duration: 220 },
          ],
          onComplete: () => {
            if (scene.stepView !== view) return;
            sparkle(scene, g.work.x, g.work.y, { count: 10, radius: g.work.size * 0.5 });
            scene.time.delayedCall(260, () => scene.completeStep());
          },
        });
        return;
      }
      if (placed >= total) {
        finishing = true;
        scene.tweens.add({ targets: tool, alpha: 0, duration: 160 });
        scene.time.delayedCall(step.result ? 260 : 0, () => {
          if (scene.stepView === view) finishWith(scene, base, step, geo);
        });
        return;
      }
      tool.setTexture(itemKey(placed));
      mechanic.reset();
      view.layout(geo);
    },
  });

  const view = {
    layout(g) {
      geo = g;
      placeWork(base, g);
      if (finishing) return;
      const scale = (g.work.size * (step.toolSize ?? (step.tip ? 0.42 : 0.3))) / Math.max(tool.width, tool.height);
      mechanic.setHome(g.tool.x, g.tool.y, scale);
      mechanic.setTarget(target(g));
      if (mechanic.active && !mechanic.dragging) scene.hint.drag(g.frame, mechanic.home, target(g));
    },
    targets: () => ({ dragFrom: mechanic.home, target: target(geo), wrongTarget: wrongSpot(geo), placementsRemaining: total - placed }),
    dispose() {
      mechanic.dispose();
      scene.progress.setSub(null);
      scene.tweens.killTweensOf(tool);
      base.destroy();
      tool.destroy();
    },
  };
  return view;
}

// --- DIP: dunk the food into a bowl; it comes out coated -----------------------------------
export function dipStep(scene, step) {
  enterWork(scene, step.base);
  const vessel = scene.add.image(0, 0, step.base).setDepth(DEPTH.food);
  const food = scene.add.image(0, 0, step.item).setDepth(DEPTH.tools);
  let geo = null;
  let done = false;

  const vesselPose = (g) => {
    placeWork(vessel, g);
    vessel.setScale(vessel.scale * 0.82).setY(g.work.y + g.work.maxH * 0.16);
  };
  const target = (g) => ({ x: g.work.x, y: g.work.y + g.work.maxH * 0.05, radius: Math.max(92, g.work.size * 0.48) });

  const mechanic = new DragDropMechanic(scene, {
    draggable: food,
    target: { x: 0, y: 0, radius: 1 },
    onStart: () => scene.hint.hide(),
    onInvalid: () => view.layout(geo),
    onComplete: () => {
      done = true;
      const g = geo;
      const surface = vessel.y - vessel.displayHeight * 0.2;
      const dunk = vessel.displayHeight * 0.32;
      scene.tweens.chain({
        targets: food,
        tweens: [
          { x: vessel.x, y: surface - food.displayHeight * 0.3, angle: 0, duration: 180, ease: 'Sine.Out' },
          {
            y: surface - food.displayHeight * 0.3 + dunk, duration: 260, ease: 'Sine.In',
            onStart: () => food.setDepth(DEPTH.food - 1),
            onComplete: () => {
              food.setTexture(step.result);
              sizeTo(food, g, step.itemSize ?? 0.46);
              for (let i = 0; i < 7; i += 1) {
                const drop = scene.add.circle(vessel.x + Phaser.Math.Between(-40, 40), surface, Phaser.Math.Between(4, 8), step.color ?? 0xf3e2b0).setDepth(DEPTH.tools);
                scene.tweens.add({ targets: drop, y: surface - Phaser.Math.Between(20, 60), alpha: 0, duration: 420, ease: 'Sine.Out', onComplete: () => drop.destroy() });
              }
            },
          },
          { y: surface - food.displayHeight * 0.45, duration: 320, ease: 'Back.Out', onStart: () => food.setDepth(DEPTH.tools) },
          {
            x: g.work.x, y: g.work.y, duration: 300, ease: 'Sine.InOut',
            scale: Math.min(g.work.size / food.width, g.work.maxH / food.height),
            onStart: () => scene.tweens.add({ targets: vessel, alpha: 0, duration: 260 }),
          },
        ],
        onComplete: () => {
          scene.workTexture = step.result;
          sparkle(scene, g.work.x, g.work.y, { count: 9, radius: g.work.size * 0.45 });
          scene.time.delayedCall(220, () => scene.completeStep());
        },
      });
    },
  });

  const view = {
    layout(g) {
      geo = g;
      if (done) return;
      vesselPose(g);
      const scale = (g.work.size * (step.itemSize ?? 0.46)) / Math.max(food.width, food.height);
      mechanic.setHome(g.tool.x, g.tool.y - g.work.maxH * 0.08, scale);
      mechanic.setTarget(target(g));
      if (mechanic.active && !mechanic.dragging) scene.hint.drag(g.frame, mechanic.home, target(g));
    },
    targets: () => ({ dragFrom: mechanic.home, target: target(geo), wrongTarget: wrongSpot(geo), placementsRemaining: done ? 0 : 1 }),
    dispose() {
      mechanic.dispose();
      scene.tweens.killTweensOf(food);
      scene.tweens.killTweensOf(vessel);
      vessel.destroy();
      food.destroy();
    },
  };
  return view;
}

// --- GESTURE: cut, peel, grate, roll, flip, shake, press, fold ------------------------------
// --- SHAKE: grab the closed container itself and shake it side to side ---------------------
// Any back-and-forth wiggle counts: every `minDistance` of horizontal travel is one shake, so a
// natural left-right-left motion works (the old one-way swipe ignored a real shake).
function shakeStep(scene, step) {
  enterWork(scene, step.base);
  const base = scene.add.image(0, 0, step.base).setDepth(DEPTH.food);
  const total = Math.max(1, step.strokes ?? 4);
  let geo = null;
  let shakes = 0;
  let travel = 0;
  let last = null;
  let dragging = false;
  let finishing = false;
  scene.progress.setSub(0);
  base.setInteractive({ useHandCursor: true, draggable: true });
  scene.input.setDraggable(base);

  const unit = () => Math.max(40, geo.work.size * 0.2);
  const onStart = (pointer) => {
    if (finishing) return;
    dragging = true;
    last = pointer.worldX;
    scene.hint.hide();
  };
  const onDrag = (pointer) => {
    if (finishing || !dragging) return;
    travel += Math.abs(pointer.worldX - last);
    last = pointer.worldX;
    const off = Phaser.Math.Clamp(pointer.worldX - geo.work.x, -geo.work.size * 0.16, geo.work.size * 0.16);
    base.setPosition(geo.work.x + off, geo.work.y).setAngle(off / geo.work.size * 60);
    while (travel >= unit() && shakes < total) {
      travel -= unit();
      shakes += 1;
      scene.progress.setSub(shakes / total);
      for (let i = 0; i < 3; i += 1) {
        const drop = scene.add.circle(base.x + Phaser.Math.Between(-30, 30), base.y - base.displayHeight * 0.35, Phaser.Math.Between(3, 6), step.color ?? 0xffffff, 0.9).setDepth(DEPTH.tools);
        scene.tweens.add({ targets: drop, y: drop.y - 30, alpha: 0, duration: 320, onComplete: () => drop.destroy() });
      }
    }
    if (shakes >= total) finish();
  };
  const onEnd = () => {
    dragging = false;
    if (!finishing && geo) scene.tweens.add({ targets: base, x: geo.work.x, angle: 0, duration: 200, ease: 'Back.Out' });
  };
  const finish = () => {
    finishing = true;
    dragging = false;
    base.disableInteractive();
    scene.tweens.add({ targets: base, x: geo.work.x, angle: 0, duration: 160, onComplete: () => finishWith(scene, base, step, geo) });
  };
  base.on('dragstart', onStart);
  base.on('drag', onDrag);
  base.on('dragend', onEnd);

  const from = (g) => ({ x: g.work.x - g.work.size * 0.2, y: g.work.y });
  const to = (g) => ({ x: g.work.x + g.work.size * 0.3, y: g.work.y });
  const view = {
    layout(g) {
      geo = g;
      if (!dragging && !finishing) placeWork(base, g);
      if (!finishing && shakes === 0 && !dragging) scene.hint.drag(g.frame, from(g), to(g));
    },
    targets: () => ({
      gestureFrom: { x: geo.work.x, y: geo.work.y },
      gestureTo: { x: geo.work.x + geo.work.size * 0.45, y: geo.work.y },
      wrongTarget: { x: geo.work.x, y: geo.work.y - geo.work.maxH * 0.45 },
      strokesRemaining: total - shakes,
    }),
    dispose() {
      base.off('dragstart', onStart);
      base.off('drag', onDrag);
      base.off('dragend', onEnd);
      scene.progress.setSub(null);
      scene.tweens.killTweensOf(base);
      base.destroy();
    },
  };
  return view;
}

export function gestureStep(scene, step) {
  if (step.motion === 'shake') return shakeStep(scene, step);
  enterWork(scene, step.base);
  const base = scene.add.image(0, 0, step.base).setDepth(DEPTH.food);
  const tool = scene.add.image(0, 0, step.tool ?? grabTexture(scene)).setDepth(DEPTH.tools);
  const traces = scene.add.graphics().setDepth(DEPTH.food + 2);
  const motion = step.motion ?? 'cut';
  const total = Math.max(1, step.strokes ?? 1);
  const horizontal = step.direction === 'left' || step.direction === 'right';
  let strokes = 0;
  let geo = null;
  let finishing = false;
  let squash = 1;
  scene.progress.setSub(0);

  const home = (g) => ({
    x: g.work.x + (horizontal ? (step.direction === 'left' ? g.work.size * 0.34 : -g.work.size * 0.34) : 0),
    y: g.work.y + (horizontal ? 0 : (step.direction === 'up' ? g.work.maxH * 0.28 : -g.work.maxH * 0.28)),
  });
  const endpoint = (g) => {
    const start = home(g);
    return {
      x: start.x + (step.direction === 'right' ? g.work.size * 0.68 : step.direction === 'left' ? -g.work.size * 0.68 : 0),
      y: start.y + (step.direction === 'down' ? g.work.maxH * 0.58 : step.direction === 'up' ? -g.work.maxH * 0.58 : 0),
    };
  };

  const strokeEffect = () => {
    const start = home(geo);
    const end = endpoint(geo);
    const offset = (strokes - (total + 1) / 2) * Math.max(10, geo.work.size * 0.07);
    const line = (color, width) => {
      traces.lineStyle(width, color, 0.95).beginPath();
      if (horizontal) traces.moveTo(start.x + geo.work.size * 0.1, start.y + offset).lineTo(end.x - geo.work.size * 0.1, end.y + offset);
      else traces.moveTo(start.x + offset, start.y + geo.work.maxH * 0.1).lineTo(end.x + offset, end.y - geo.work.maxH * 0.1);
      traces.strokePath();
    };
    const s = base.scale;
    if (motion === 'cut') {
      line(0xffffff, 5);
    } else if (motion === 'peel') {
      line(step.color ?? 0xb98a55, 7);
      line(0xfff4d6, 3);
    } else if (motion === 'grate') {
      const shreds = Array.from({ length: 14 }, () => ({
        x: Phaser.Math.FloatBetween(-0.22, 0.22), y: Phaser.Math.FloatBetween(-0.16, 0.12),
        a: Phaser.Math.FloatBetween(0, Math.PI), s: Phaser.Math.FloatBetween(0.8, 1.2), color: step.color ?? 0xf6d36a,
      }));
      decorAdd(scene, particleDecor(scene, 'shred', shreds));
    } else if (motion === 'roll') {
      squash *= 0.94;
      scene.tweens.add({ targets: base, scaleY: s * squash, scaleX: s * (2 - squash), duration: 160, ease: 'Sine.Out' });
    } else if (motion === 'shake') {
      const x0 = geo.work.x;
      scene.tweens.add({ targets: base, x: x0 + geo.work.size * 0.05, angle: 6, duration: 70, yoyo: true, repeat: 2, onComplete: () => base.setPosition(x0, geo.work.y).setAngle(0) });
    } else if (motion === 'flip') {
      scene.tweens.add({ targets: base, y: geo.work.y - geo.work.maxH * 0.12, duration: 140, yoyo: true, ease: 'Sine.Out' });
    } else {
      // press / fold / knead: squash and a little flour puff.
      scene.tweens.add({ targets: base, scaleY: s * 0.86, scaleX: s * 1.08, duration: 110, yoyo: true, ease: 'Sine.InOut' });
      for (let i = 0; i < 5; i += 1) {
        const puff = scene.add.circle(geo.work.x + Phaser.Math.Between(-60, 60), geo.work.y + geo.work.maxH * 0.18, Phaser.Math.Between(5, 10), 0xffffff, 0.8).setDepth(DEPTH.tools);
        scene.tweens.add({ targets: puff, y: puff.y - 40, alpha: 0, duration: 500, onComplete: () => puff.destroy() });
      }
    }
  };

  const finish = () => {
    finishing = true;
    const end = endpoint(geo);
    scene.tweens.add({ targets: tool, x: end.x, y: end.y, alpha: 0, duration: 150 });
    if (motion === 'flip' && step.result) {
      // A real flip: the food turns over in the air and lands showing its cooked side.
      const s = base.scale;
      scene.tweens.chain({
        targets: base,
        tweens: [
          { scaleY: 0.02, y: geo.work.y - geo.work.maxH * 0.25, duration: 170, ease: 'Sine.In' },
          {
            scaleY: s, y: geo.work.y, duration: 220, ease: 'Bounce.Out',
            onStart: () => { decorClear(scene); scene.workTexture = step.result; base.setTexture(step.result); placeWork(base, geo); base.setScale(base.scale, 0.02); },
          },
        ],
      });
      sparkle(scene, geo.work.x, geo.work.y, { count: 9, radius: geo.work.size * 0.48 });
      scene.time.delayedCall(520, () => scene.completeStep());
      return;
    }
    scene.tweens.add({ targets: traces, alpha: 0, duration: 300, delay: 120 });
    finishWith(scene, base, step, geo);
  };

  const mechanic = new DirectionalDragMechanic(scene, {
    draggable: tool,
    direction: step.direction ?? 'right',
    retainInteractive: true,
    onStart: () => scene.hint.hide(),
    onInvalid: () => view.layout(geo),
    onComplete: () => {
      strokes += 1;
      scene.progress.setSub(strokes / total);
      strokeEffect();
      if (strokes >= total) { finish(); return; }
      mechanic.reset();
      view.layout(geo);
    },
  });

  const view = {
    layout(g) {
      geo = g;
      if (!(motion === 'flip' && finishing)) {
        placeWork(base, g);
        if (motion === 'roll' && squash !== 1) base.setScale(base.scaleX * (2 - squash), base.scaleY * squash);
      }
      if (finishing) return;
      tool.setScale((g.work.size * (step.toolSize ?? (step.tool ? 0.3 : 0.16))) / Math.max(tool.width, tool.height));
      const start = home(g);
      mechanic.setHome(start.x, start.y, {
        minDistance: Math.max(54, g.work.size * 0.24),
        maxCrossAxis: Math.max(110, g.work.size * 0.48),
      });
      if (mechanic.active && !mechanic.dragging) scene.hint.drag(g.frame, start, endpoint(g));
    },
    targets: () => ({
      gestureFrom: home(geo),
      gestureTo: endpoint(geo),
      wrongTarget: horizontal ? { x: home(geo).x, y: home(geo).y + geo.work.maxH * 0.7 } : { x: home(geo).x + geo.work.size * 0.7, y: home(geo).y },
      strokesRemaining: total - strokes,
    }),
    dispose() {
      mechanic.dispose();
      scene.progress.setSub(null);
      scene.tweens.killTweensOf(base);
      base.destroy();
      tool.destroy();
      traces.destroy();
    },
  };
  return view;
}

// --- TRACE: squeeze sauce or shake sprinkles exactly where the finger moves -----------------
const TIP_DOWN = new Set(['k-ketchup', 'k-mustard', 'k-salt', 'seasoning', 'k-hot-sauce', 'k-soy-bottle', 'k-honey', 'k-sprinkles', 'k-cinnamon']);
export function traceStep(scene, step) {
  enterWork(scene, step.base);
  const base = scene.add.image(0, 0, step.base).setDepth(DEPTH.food);
  const tool = scene.add.image(0, 0, step.tool).setDepth(DEPTH.tools);
  const sprinkle = step.style === 'sprinkle';
  const grip = step.grip ?? (step.tool === 'k-piping-bag' ? 'piping' : TIP_DOWN.has(step.tool) ? 'tip-down' : 'pinch');
  const colors = step.colors ?? [step.color ?? 0xd8342c];
  const ink = decorAdd(scene, sprinkle ? particleDecor(scene, step.particle ?? 'rod', []) : sauceDecor(scene, colors[0], []));
  let geo = null;
  let finishing = false;
  let drawing = false;
  let sinceLast = 0;
  scene.progress.setSub(0);

  const zone = (g) => {
    const z = step.zone ?? {};
    return {
      x: g.work.x + (z.dx ?? 0) * g.work.size, y: g.work.y + (z.dy ?? -0.02) * g.work.size,
      rx: (z.rx ?? 0.34) * g.work.size, ry: (z.ry ?? 0.24) * g.work.size, angle: Phaser.Math.DegToRad(z.angle ?? 0),
    };
  };
  const required = (g) => g.work.size * (step.length ?? 1.5);
  const zonePoint = (z, u, v) => ({
    x: z.x + u * z.rx * Math.cos(z.angle) - v * z.ry * Math.sin(z.angle),
    y: z.y + u * z.rx * Math.sin(z.angle) + v * z.ry * Math.cos(z.angle),
  });
  const rest = (g) => {
    tool.setOrigin(0.5, 0.5).setAngle(0);
    tool.setScale((g.work.size * (step.toolSize ?? 0.3)) / Math.max(tool.width, tool.height));
    tool.setPosition(g.tool.x, g.tool.y);
  };
  const hold = (p) => {
    if (grip === 'tip-down') tool.setOrigin(0.5, 0.03).setAngle(180);
    else if (grip === 'piping') tool.setOrigin(0.07, 0.93).setAngle(0);
    else tool.setOrigin(0.5, 1.15).setAngle(0);
    tool.setPosition(p.x, p.y);
  };

  const mechanic = new TraceMechanic(scene, {
    zone: { x: 0, y: 0, rx: 1, ry: 1 },
    required: 1,
    onStart: (p) => { drawing = true; scene.hint.hide(); hold(p); },
    onDraw: ({ from, to, inside }) => {
      hold(to);
      if (!inside) return;
      if (sprinkle) {
        sinceLast += Phaser.Math.Distance.Between(from.x, from.y, to.x, to.y);
        if (sinceLast < geo.work.size * 0.035) return;
        sinceLast = 0;
        const c = toRel(geo, to);
        for (let i = 0; i < 3; i += 1) {
          ink.particles.push({
            x: c.x + Phaser.Math.FloatBetween(-0.04, 0.04), y: c.y + Phaser.Math.FloatBetween(-0.02, 0.05),
            a: Phaser.Math.FloatBetween(0, Math.PI), s: Phaser.Math.FloatBetween(0.8, 1.25), color: Phaser.Utils.Array.GetRandom(colors),
          });
        }
      } else {
        ink.segments.push({ from: toRel(geo, from), to: toRel(geo, to) });
      }
      ink.layout(geo);
    },
    onProgress: (p) => scene.progress.setSub(p),
    onComplete: () => {
      finishing = true;
      drawing = false;
      scene.tweens.add({ targets: tool, alpha: 0, y: tool.y - 40, duration: 220 });
      scene.time.delayedCall(step.result ? 320 : 0, () => {
        if (scene.stepView === view) finishWith(scene, base, step, geo);
      });
    },
  });
  const stopDrawing = (pointer) => {
    if (finishing || !drawing || (pointer && mechanic.pointerId !== null)) return;
    drawing = false;
    if (geo) rest(geo);
  };
  scene.input.on('pointerup', stopDrawing);

  const view = {
    layout(g) {
      geo = g;
      placeWork(base, g);
      ink.layout(g);
      if (finishing) return;
      mechanic.setGeometry(zone(g), required(g));
      if (!drawing) rest(g);
      const z = zone(g);
      if (mechanic.getProgress() === 0 && !drawing) scene.hint.drag(g.frame, zonePoint(z, -0.75, 0), zonePoint(z, 0.75, 0));
    },
    targets: () => {
      const z = zone(geo);
      // A zigzag across the food, sampled finely so every segment stays inside the zone.
      const path = [];
      for (let pass = 0; pass < 3; pass += 1) {
        for (let i = 0; i <= 24; i += 1) {
          const t = i / 24;
          const u = (pass % 2 === 0 ? -0.8 + 1.6 * t : 0.8 - 1.6 * t);
          const v = Math.sin(t * Math.PI * 4) * 0.5;
          path.push(zonePoint(z, u, v));
        }
      }
      return {
        tracePath: path,
        traceWrong: [{ x: geo.frame.colLeft + 20, y: geo.work.y - geo.work.maxH * 0.62 }, { x: geo.frame.colRight - 20, y: geo.work.y - geo.work.maxH * 0.62 }],
        traceRemaining: Math.round((1 - mechanic.getProgress()) * 100),
      };
    },
    dispose() {
      mechanic.dispose();
      scene.input.off('pointerup', stopDrawing);
      scene.progress.setSub(null);
      scene.tweens.killTweensOf(tool);
      base.destroy();
      tool.destroy();
    },
  };
  return view;
}

// --- COOK: put food into the fryer/pan/pot/oven, watch it cook, take it out when ready -----
export function cookStep(scene, step) {
  enterWork(scene, step.base);
  const pot = scene.add.image(0, 0, step.base).setDepth(DEPTH.food);
  const food = step.item ? scene.add.image(0, 0, step.item).setDepth(DEPTH.tools) : null;
  const heat = !step.item && step.heat ? scene.add.image(0, 0, step.heat).setDepth(DEPTH.tools).setInteractive({ useHandCursor: true }) : null;
  let state = food ? 'load' : 'start';
  let geo = null;
  let meterTween = null;
  let fxTimer = null;
  scene.progress.setSub(0);
  pot.setInteractive({ useHandCursor: true });

  const target = (g) => ({ x: g.work.x, y: g.work.y, radius: Math.max(95, g.work.size * 0.5) });
  const spawnFx = () => {
    if (!geo) return;
    const w = pot.displayWidth;
    const x = pot.x + Phaser.Math.FloatBetween(-0.28, 0.28) * w;
    const y = pot.y - pot.displayHeight * Phaser.Math.FloatBetween(0.0, 0.2);
    const effect = step.effect ?? 'bubbles';
    if (effect === 'steam') {
      const puff = scene.add.circle(x, y - pot.displayHeight * 0.2, Phaser.Math.Between(9, 16), 0xffffff, 0.7).setDepth(DEPTH.tools);
      scene.tweens.add({ targets: puff, y: puff.y - 70, scale: 1.8, alpha: 0, duration: 900, onComplete: () => puff.destroy() });
    } else if (effect === 'sizzle') {
      const spark = scene.add.circle(x, y, Phaser.Math.Between(3, 5), 0xffe08a, 1).setDepth(DEPTH.tools);
      scene.tweens.add({ targets: spark, x: x + Phaser.Math.Between(-30, 30), y: y - Phaser.Math.Between(20, 50), alpha: 0, duration: 380, onComplete: () => spark.destroy() });
    } else if (effect === 'heat') {
      const wave = scene.add.circle(x, y, Phaser.Math.Between(6, 10), 0xffb36b, 0.5).setDepth(DEPTH.tools);
      scene.tweens.add({ targets: wave, y: y - 60, alpha: 0, duration: 700, onComplete: () => wave.destroy() });
    } else {
      const bubble = scene.add.circle(x, y, Phaser.Math.Between(4, 9)).setStrokeStyle(2, 0xffffff, 0.95).setDepth(DEPTH.tools);
      scene.tweens.add({ targets: bubble, y: y - Phaser.Math.Between(16, 36), scale: 1.4, alpha: 0, duration: 520, onComplete: () => bubble.destroy() });
    }
  };

  const becomeReady = () => {
    if (state !== 'cooking') return;
    state = 'ready';
    if (step.ready) crossfade(scene, pot, step.ready, geo, 320);
    sparkle(scene, geo.work.x, geo.work.y - geo.work.maxH * 0.1, { count: 8, radius: geo.work.size * 0.4 });
    view.layout(geo);
  };

  const startCooking = () => {
    if (state !== 'start' && state !== 'load') return;
    state = 'cooking';
    heat?.disableInteractive();
    if (heat) scene.tweens.add({ targets: heat, alpha: 0.45, duration: 200 });
    scene.hint.hide();
    fxTimer = scene.time.addEvent({ delay: 130, loop: true, callback: spawnFx });
    const meter = { v: 0 };
    meterTween = scene.tweens.add({
      targets: meter, v: 1, duration: step.processMs ?? 1500, ease: 'Linear',
      onUpdate: () => {
        scene.progress.setSub(meter.v);
        if (step.brown) pot.setTint(Phaser.Display.Color.GetColor(255, Math.round(255 - 40 * meter.v), Math.round(255 - 95 * meter.v)));
        if (meter.v >= (step.readyAt ?? 0.7)) becomeReady();
      },
    });
  };

  const lift = () => {
    if (state === 'start') { startCooking(); return; }
    if (state === 'cooking') { notYet(scene, pot, geo); return; }
    if (state !== 'ready') return;
    state = 'done';
    fxTimer?.remove();
    meterTween?.stop();
    scene.progress.setSub(1);
    scene.hint.hide();
    pot.disableInteractive();
    const result = step.result ?? step.ready ?? step.cooking;
    if (result && result !== pot.texture.key) crossfade(scene, pot, result, geo, 340);
    sparkle(scene, geo.work.x, geo.work.y, { count: 12, radius: geo.work.size * 0.5 });
    scene.time.delayedCall(460, () => scene.completeStep());
  };
  pot.on('pointerdown', lift);
  heat?.on('pointerdown', startCooking);

  const mechanic = food ? new DragDropMechanic(scene, {
    draggable: food,
    target: { x: 0, y: 0, radius: 1 },
    onStart: () => scene.hint.hide(),
    onInvalid: () => view.layout(geo),
    onComplete: () => {
      scene.tweens.add({ targets: food, x: geo.work.x, y: geo.work.y, scale: food.scale * 0.6, alpha: 0, duration: 240, ease: 'Sine.In' });
      if (step.cooking) crossfade(scene, pot, step.cooking, geo, 280);
      wobble(scene, pot);
      startCooking();
    },
  }) : null;

  const view = {
    layout(g) {
      geo = g;
      placeWork(pot, g);
      if (food && state === 'load') {
        mechanic.setHome(g.tool.x, g.tool.y - g.work.maxH * 0.06, (g.work.size * (step.itemSize ?? 0.4)) / Math.max(food.width, food.height));
        mechanic.setTarget(target(g));
        if (!mechanic.dragging) scene.hint.drag(g.frame, mechanic.home, target(g));
      }
      if (heat) {
        heat.setScale((g.work.size * 0.3) / Math.max(heat.width, heat.height)).setPosition(g.work.x + g.work.size * 0.38, g.work.y + g.work.maxH * 0.34);
        if (state === 'start') scene.hint.tap(g.frame, { x: heat.x, y: heat.y });
      } else if (state === 'start') {
        scene.hint.tap(g.frame, { x: g.work.x, y: g.work.y });
      }
      if (state === 'ready') scene.hint.tap(g.frame, { x: g.work.x, y: g.work.y });
    },
    targets: () => {
      if (state === 'load') return { dragFrom: mechanic.home, target: target(geo), wrongTarget: wrongSpot(geo), placementsRemaining: 1 };
      if (state === 'start') return { process: heat ? { x: heat.x, y: heat.y } : { x: geo.work.x, y: geo.work.y }, wrongTarget: { x: geo.frame.colLeft + 20, y: geo.work.y - geo.work.maxH * 0.7 } };
      if (state === 'done') return {};
      return { lift: { x: geo.work.x, y: geo.work.y }, liftReady: state === 'ready' };
    },
    dispose() {
      fxTimer?.remove();
      meterTween?.stop();
      mechanic?.dispose();
      pot.off('pointerdown', lift);
      heat?.off('pointerdown', startCooking);
      scene.progress.setSub(null);
      scene.tweens.killTweensOf(pot);
      pot.destroy();
      food?.destroy();
      heat?.destroy();
    },
  };
  return view;
}
