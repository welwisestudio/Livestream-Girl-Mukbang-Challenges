import Phaser from 'phaser';

// Shared press feedback for every tappable UI element (buttons, cards, tabs, close icons…).
//
// A hit object opts in with `pressable(hit, { target })`; one listener per scene then gives it
// the same feel everywhere: hover lift on desktop, quick squash on press, springy bounce on
// release plus a small burst of sparkles and a soft click. Draggable food, cooking tools and
// modal veils never opt in, so gameplay drags are untouched. Feedback is purely visual: the
// element's own handler still decides what the tap does.

const HOVER = 1.05;
const PRESS = 0.9;
const OVERSHOOT = 1.08;
const FX_DEPTH = 1000;
// Reference-style twinkles: a bright core with a candy-coloured rim so they read on pastel art.
const STARS = [
  { key: 'fx-press-star-pink', core: 0xffffff, rim: 0xff86bd },
  { key: 'fx-press-star-gold', core: 0xfffbe0, rim: 0xffb84d },
  { key: 'fx-press-star-blue', core: 0xffffff, rim: 0x7fc8ff },
];
const DOT_KEY = 'fx-press-dot';

// scale: false keeps the click sound and sparkles but leaves the element's own scale animation
// (e.g. a pulsing claimable tile) alone.
export function pressable(hit, { target = hit, sound = 'tap', sparkles = true, trigger = 'up', enabled = null, scale = true } = {}) {
  hit.setData('press', { target, sound, sparkles, trigger, enabled, scale });
  return hit;
}

function starPoints(c, r, k) {
  return [c - r, c, c - k, c - k, c, c - r, c + k, c - k, c + r, c, c + k, c + k, c, c + r, c - k, c + k];
}

function ensureTextures(scene) {
  const s = 40;
  const c = s / 2;
  for (const star of STARS) {
    if (scene.textures.exists(star.key)) continue;
    const g = scene.make.graphics({ x: 0, y: 0 }, false);
    g.fillStyle(star.rim, 0.28).fillCircle(c, c, s * 0.2);
    g.fillStyle(star.rim, 1).fillPoints(toPoints(starPoints(c, c - 1, s * 0.16)), true);
    g.fillStyle(star.core, 1).fillPoints(toPoints(starPoints(c, c - 6, s * 0.09)), true);
    g.generateTexture(star.key, s, s);
    g.destroy();
  }
  if (!scene.textures.exists(DOT_KEY)) {
    const g = scene.make.graphics({ x: 0, y: 0 }, false);
    g.fillStyle(0xffffff, 1).fillCircle(8, 8, 8);
    g.generateTexture(DOT_KEY, 16, 16);
    g.destroy();
  }
}

function toPoints(flat) {
  const points = [];
  for (let i = 0; i < flat.length; i += 2) points.push({ x: flat[i], y: flat[i + 1] });
  return points;
}

// Small celebratory burst at a point: a few twinkling stars and soft dots that drift out and fade.
export function pressBurst(scene, x, y, { size = 1 } = {}) {
  ensureTextures(scene);
  const stars = 6;
  for (let i = 0; i < stars; i += 1) {
    const a = (Math.PI * 2 * i) / stars + Phaser.Math.FloatBetween(-0.35, 0.35);
    const dist = Phaser.Math.FloatBetween(34, 56) * size;
    const star = scene.add.image(x, y, STARS[i % STARS.length].key).setDepth(FX_DEPTH)
      .setScale(0.2 * size)
      .setAngle(Phaser.Math.Between(0, 45));
    scene.tweens.add({
      targets: star,
      x: x + Math.cos(a) * dist,
      y: y + Math.sin(a) * dist - 6 * size,
      scale: Phaser.Math.FloatBetween(0.6, 0.95) * size,
      angle: star.angle + Phaser.Math.Between(60, 120),
      duration: 260,
      ease: 'Quad.Out',
      onComplete: () => scene.tweens.add({ targets: star, scale: 0, alpha: 0, duration: 220, ease: 'Quad.In', onComplete: () => star.destroy() }),
    });
  }
  for (let i = 0; i < 4; i += 1) {
    const a = Phaser.Math.FloatBetween(0, Math.PI * 2);
    const dot = scene.add.image(x, y, DOT_KEY).setDepth(FX_DEPTH - 1).setTint(i % 2 ? 0xffd27a : 0xff9ccc).setAlpha(0.9).setScale(0.35 * size);
    scene.tweens.add({
      targets: dot,
      x: x + Math.cos(a) * 24 * size,
      y: y + Math.sin(a) * 24 * size,
      scale: 0,
      alpha: 0,
      duration: 380,
      ease: 'Sine.Out',
      onComplete: () => dot.destroy(),
    });
  }
}

// One idle twinkle (e.g. on a highlighted button): a star pops in, turns and fades out.
export function twinkle(scene, x, y, { size = 1, depth = FX_DEPTH } = {}) {
  ensureTextures(scene);
  const star = scene.add.image(x, y, STARS[Phaser.Math.Between(0, STARS.length - 1)].key).setDepth(depth).setScale(0).setAngle(Phaser.Math.Between(0, 45));
  scene.tweens.add({
    targets: star, scale: 0.7 * size, angle: star.angle + 90, duration: 320, ease: 'Back.Out', yoyo: true, hold: 120,
    onComplete: () => star.destroy(),
  });
  return star;
}

// Installs the scene-wide listener once. Called from BaseScene for every screen.
export function installPressFeedback(scene) {
  if (scene.pressFeedbackInstalled) return;
  scene.pressFeedbackInstalled = true;
  const active = new Map(); // target → { base, hovered, pressed }

  const configOf = (obj) => {
    const cfg = obj?.getData?.('press');
    if (!cfg || !cfg.target?.active) return null;
    if (cfg.enabled && !cfg.enabled()) return null;
    return cfg;
  };
  const stateOf = (target) => {
    let state = active.get(target);
    if (!state) {
      state = { base: target.scaleX, hovered: false, pressed: false };
      active.set(target, state);
    }
    return state;
  };
  const tweenTo = (target, scale, duration, ease, onComplete) => {
    scene.tweens.killTweensOf(target);
    scene.tweens.add({ targets: target, scale, duration, ease, onComplete });
  };
  const settle = (target, state) => {
    if (state.hovered || state.pressed) return;
    active.delete(target);
  };
  const release = (target, state) => {
    tweenTo(target, state.base * OVERSHOOT, 90, 'Quad.Out', () => {
      tweenTo(target, state.base * (state.hovered ? HOVER : 1), 220, 'Back.Out', () => settle(target, state));
    });
  };
  const celebrate = (cfg, pointer) => {
    if (cfg.sparkles) pressBurst(scene, pointer.worldX, pointer.worldY);
    if (cfg.sound) scene.services?.()?.audio?.playSfx(cfg.sound);
  };

  scene.input.on('gameobjectover', (pointer, obj) => {
    const cfg = configOf(obj);
    if (!cfg || pointer.wasTouch || !cfg.scale) return;
    const state = stateOf(cfg.target);
    state.hovered = true;
    if (!state.pressed) tweenTo(cfg.target, state.base * HOVER, 110, 'Sine.Out');
  });
  scene.input.on('gameobjectout', (pointer, obj) => {
    const cfg = obj?.getData?.('press');
    if (cfg && !cfg.scale) obj.setData('pressArmed', false);
    const state = cfg && active.get(cfg.target);
    if (!state) return;
    state.hovered = false;
    state.pressed = false;
    tweenTo(cfg.target, state.base, 130, 'Sine.Out', () => settle(cfg.target, state));
  });
  scene.input.on('gameobjectdown', (pointer, obj) => {
    const cfg = configOf(obj);
    if (!cfg) return;
    if (!cfg.scale) {
      if (cfg.trigger === 'down') celebrate(cfg, pointer);
      else obj.setData('pressArmed', true);
      return;
    }
    const state = stateOf(cfg.target);
    if (cfg.trigger === 'down') {
      // Buttons that act on touch-down: squash and spring back in one motion.
      state.pressed = false;
      tweenTo(cfg.target, state.base * PRESS, 70, 'Quad.Out', () => release(cfg.target, state));
      celebrate(cfg, pointer);
      return;
    }
    state.pressed = true;
    tweenTo(cfg.target, state.base * PRESS, 80, 'Quad.Out');
  });
  scene.input.on('gameobjectup', (pointer, obj) => {
    const cfg = obj?.getData?.('press');
    if (cfg && !cfg.scale) {
      if (obj.getData('pressArmed')) celebrate(cfg, pointer);
      obj.setData('pressArmed', false);
      return;
    }
    const state = cfg && active.get(cfg.target);
    if (!state?.pressed) return;
    state.pressed = false;
    release(cfg.target, state);
    // Enabled was checked at touch-down; the tap handler may already have disabled the button.
    celebrate(cfg, pointer);
  });
  // Releasing outside every object still springs pressed elements back.
  scene.input.on('pointerup', () => {
    for (const [target, state] of active) {
      if (!state.pressed || !target.active) continue;
      state.pressed = false;
      tweenTo(target, state.base * (state.hovered ? HOVER : 1), 160, 'Back.Out', () => settle(target, state));
    }
  });
  scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => { active.clear(); scene.pressFeedbackInstalled = false; });
}
