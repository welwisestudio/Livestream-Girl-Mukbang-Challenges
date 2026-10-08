import Phaser from 'phaser';
import { DEPTH } from './layout.js';
import { addText } from './text.js';

// Short food-specific reactions played after the heroine finishes a serving (≈1 s).
// Sprites: fx-* cells of the Nano Banana Pro reactions atlas (2026-10-08); see ASSET-MANIFEST.
// `reaction` comes from the level config: 'spicy' | 'cold' | 'hot'. Returns the duration in ms.
const FX_DEPTH = DEPTH.feed - 1;

const LABELS = { spicy: 'So spicy!', cold: 'Brrr! So cold!', hot: 'Hot, hot!' };
const LABEL_STROKE = { spicy: '#e2553a', cold: '#5aa6d6', hot: '#e58a4a' };

export const REACTION_MS = 1150;

function bust(streamer) {
  const img = streamer.image;
  return { img, x: img.x, w: img.displayWidth, h: img.displayHeight, top: img.y - img.displayHeight };
}

function popLabel(scene, kind, x, y) {
  const t = addText(scene, x, y, LABELS[kind], { size: 24, weight: '700', color: '#ffffff', stroke: LABEL_STROKE[kind], strokeWidth: 7 })
    .setDepth(DEPTH.banner).setScale(0.4);
  scene.tweens.chain({
    targets: t,
    tweens: [
      { scale: 1, duration: 200, ease: 'Back.Out' },
      { y: y - 26, alpha: 0, delay: 650, duration: 260, onComplete: () => t.destroy() },
    ],
  });
}

function shiver(scene, img, amount, repeat) {
  const x0 = img.x;
  scene.tweens.add({ targets: img, x: x0 + amount, duration: 45, yoyo: true, repeat, onComplete: () => img.setX(x0) });
}

function tintPulse(scene, img, color) {
  img.setTint(color);
  scene.time.delayedCall(REACTION_MS - 180, () => img.clearTint());
}

function spicy(scene, streamer) {
  const { img, x, w, top } = bust(streamer);
  const mouth = streamer.mouth();
  tintPulse(scene, img, 0xffe0d8);
  shiver(scene, img, 3, 6);
  // Fire breath: two bursts out of the mouth, left then right.
  [1, -1].forEach((dir, i) => {
    const fire = scene.add.image(mouth.x, mouth.y, 'fx-fire').setDepth(FX_DEPTH).setOrigin(0.04, 0.5).setFlipX(dir < 0);
    if (dir < 0) fire.setOrigin(0.96, 0.5);
    const s = (w * 0.62) / fire.width;
    fire.setScale(s * 0.15, s * 0.6).setAlpha(0);
    scene.tweens.chain({
      targets: fire,
      tweens: [
        { delay: i * 300, alpha: 1, scaleX: s, scaleY: s, duration: 180, ease: 'Back.Out' },
        { scaleY: s * 0.85, duration: 70, yoyo: true, repeat: 2 },
        { alpha: 0, scaleX: s * 1.15, duration: 180, onComplete: () => fire.destroy() },
      ],
    });
  });
  // Little flames popping above the head and sweat drops.
  for (let i = 0; i < 3; i += 1) {
    const f = scene.add.image(x + (i - 1) * w * 0.22, top + w * 0.12, 'fx-flame').setDepth(FX_DEPTH);
    const s = (w * 0.14) / f.width;
    f.setScale(0).setAlpha(1);
    scene.tweens.add({ targets: f, scale: s, y: f.y - 24, delay: 120 + i * 90, duration: 260, ease: 'Back.Out', yoyo: true, hold: 360, onComplete: () => f.destroy() });
  }
  for (let i = 0; i < 2; i += 1) {
    const g = scene.add.graphics().setDepth(FX_DEPTH);
    const sx = x + (i ? 1 : -1) * w * 0.3;
    g.fillStyle(0x9fd8ff, 1).lineStyle(2, 0x4a8cc0, 1);
    g.fillCircle(0, 6, 7).strokeCircle(0, 6, 7).fillTriangle(-6, 3, 6, 3, 0, -10);
    g.setPosition(sx, top + w * 0.32);
    scene.tweens.add({ targets: g, y: g.y + 34, alpha: 0, delay: 200 + i * 150, duration: 600, onComplete: () => g.destroy() });
  }
}

function cold(scene, streamer) {
  const { img, x, w, top } = bust(streamer);
  const mouth = streamer.mouth();
  tintPulse(scene, img, 0xe4f2ff);
  shiver(scene, img, 4, 10);
  // Icicles form along the fringe, then melt away.
  const ice = scene.add.image(x, top + w * 0.06, 'fx-icicles').setDepth(FX_DEPTH).setOrigin(0.5, 0);
  const s = (w * 0.5) / ice.width;
  ice.setScale(s, 0).setAlpha(0.95);
  scene.tweens.chain({
    targets: ice,
    tweens: [
      { scaleY: s * 0.62, duration: 260, ease: 'Back.Out' },
      { alpha: 0, y: ice.y + 10, delay: 520, duration: 260, onComplete: () => ice.destroy() },
    ],
  });
  // Snowflakes drift down around her and a frosty breath puff.
  for (let i = 0; i < 6; i += 1) {
    // Snowflakes are code-drawn: the generated snowflake cell did not survive background removal.
    const f = snowflake(scene, w * Phaser.Math.FloatBetween(0.03, 0.05)).setPosition(x + Phaser.Math.FloatBetween(-0.48, 0.48) * w, top + Phaser.Math.FloatBetween(0, 0.25) * w);
    f.setAlpha(0);
    scene.tweens.add({ targets: f, alpha: 1, y: f.y + w * 0.35, angle: 140, delay: i * 70, duration: 900, ease: 'Sine.In', onComplete: () => f.destroy() });
  }
  const puff = scene.add.image(mouth.x, mouth.y, 'fx-steam').setDepth(FX_DEPTH).setTint(0xd8f0ff).setAlpha(0);
  const ps = (w * 0.18) / puff.width;
  puff.setScale(ps * 0.5);
  scene.tweens.add({ targets: puff, alpha: 0.9, scale: ps, x: mouth.x + w * 0.2, y: mouth.y - 18, delay: 260, duration: 420, yoyo: true, onComplete: () => puff.destroy() });
}

function hot(scene, streamer) {
  const { img, w } = bust(streamer);
  const mouth = streamer.mouth();
  tintPulse(scene, img, 0xffebe2);
  for (let i = 0; i < 4; i += 1) {
    const puff = scene.add.image(mouth.x + (i % 2 ? 1 : -1) * w * 0.06, mouth.y, 'fx-steam').setDepth(FX_DEPTH).setAlpha(0);
    const ps = (w * Phaser.Math.FloatBetween(0.17, 0.24)) / puff.width;
    puff.setScale(ps * 0.4);
    scene.tweens.add({ targets: puff, alpha: 0.95, scale: ps, y: mouth.y - w * 0.35, x: puff.x + (i % 2 ? 1 : -1) * w * 0.12, delay: i * 160, duration: 650, ease: 'Sine.Out', onComplete: () => scene.tweens.add({ targets: puff, alpha: 0, duration: 160, onComplete: () => puff.destroy() }) });
  }
  shiver(scene, img, 2, 4);
}

function snowflake(scene, r) {
  const g = scene.add.graphics().setDepth(FX_DEPTH);
  for (const [width, color] of [[Math.max(4, r * 0.34), 0x4a8cc0], [Math.max(2, r * 0.18), 0xe6f6ff]]) {
    g.lineStyle(width, color, 1);
    for (let i = 0; i < 3; i += 1) {
      const a = (Math.PI / 3) * i;
      g.lineBetween(-Math.cos(a) * r, -Math.sin(a) * r, Math.cos(a) * r, Math.sin(a) * r);
    }
  }
  return g;
}

const PLAYERS = { spicy, cold, hot };

// Plays the reaction once; returns how long to wait before continuing (0 for none).
export function playReaction(scene, streamer, kind) {
  const play = PLAYERS[kind];
  if (!play || !streamer?.image) return 0;
  play(scene, streamer);
  const { x, top, w } = bust(streamer);
  popLabel(scene, kind, x, top + w * 0.02);
  return REACTION_MS;
}
