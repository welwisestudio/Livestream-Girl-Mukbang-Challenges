import Phaser from 'phaser';
import { DEPTH, clamp } from './layout.js';
import { heartPath } from './draw.js';
import { appearanceMouth, appearanceTexture } from './appearanceTextures.js';

// Animated tutorial hand. Purely visual: never interactive, never changes progress.
export class HintHand {
  constructor(scene) {
    this.scene = scene;
    this.image = scene.add.image(0, 0, 'hint-hand').setOrigin(0.4, 0.05).setDepth(DEPTH.hint).setVisible(false);
    this.mode = null;
  }

  size(frame) {
    const target = Math.round(clamp(78 * frame.ui, 70, 96));
    return target / Math.max(this.image.width, this.image.height);
  }

  stop() {
    this.generation = (this.generation ?? 0) + 1;
    this.chain?.destroy();
    this.chain = null;
    this.orbit?.remove();
    this.orbit = null;
    this.scene.tweens.killTweensOf(this.image);
    this.timer?.remove();
    this.timer = null;
  }

  hide() {
    this.stop();
    this.mode = null;
    this.image.setVisible(false);
  }

  tap(frame, point) {
    this.stop();
    this.mode = { kind: 'tap', point };
    const s = this.size(frame);
    this.image.setVisible(true).setAlpha(1).setScale(s).setPosition(point.x, point.y + 6).setAngle(-12);
    this.scene.tweens.add({ targets: this.image, scale: s * 0.86, y: point.y, duration: 380, yoyo: true, repeat: -1, ease: 'Sine.InOut' });
  }

  drag(frame, from, to) {
    this.stop();
    this.mode = { kind: 'drag', from, to };
    const s = this.size(frame);
    const gen = this.generation;
    const loop = () => {
      if (gen !== this.generation) return;
      this.image.setVisible(true).setScale(s).setAlpha(0).setPosition(from.x, from.y).setAngle(-12);
      this.chain = this.scene.tweens.chain({
        targets: this.image,
        tweens: [
          { alpha: 1, scale: s * 0.88, duration: 260 },
          { x: to.x, y: to.y, duration: 900, ease: 'Sine.InOut' },
          { alpha: 0, scale: s, duration: 240, delay: 160 },
        ],
        onComplete: () => { if (gen === this.generation) this.timer = this.scene.time.delayedCall(260, loop); },
      });
    };
    loop();
  }

  circle(frame, center, radius) {
    this.stop();
    this.mode = { kind: 'circle', center, radius };
    const s = this.size(frame);
    const state = { a: -Math.PI / 2 };
    this.image.setVisible(true).setAlpha(0.95).setScale(s).setAngle(-12);
    const place = () => this.image.setPosition(center.x + Math.cos(state.a) * radius, center.y + Math.sin(state.a) * radius * 0.62);
    place();
    this.orbit = this.scene.tweens.add({ targets: state, a: Math.PI * 1.5, duration: 1400, repeat: -1, onUpdate: place });
  }

  lift(frame, from, to) {
    this.drag(frame, from, to);
  }
}

// The streamer behind the counter. Native aspect ratio is always preserved; textures switch
// between idle / open mouth / chewing and are aligned so the head does not jump.
// Keys name the pose for the appearance compositor; the mouth anchor depends on the outfit.
export const STREAMER_POSES = {
  happy: { key: 'character-happy' },
  eating: { key: 'character-eating' },
  chewing: { key: 'character-chewing' },
};

export class Streamer {
  constructor(scene, appearance = null) {
    this.scene = scene;
    this.appearance = appearance ?? scene.services().save.snapshot().appearance.equipped;
    this.image = scene.add.image(0, 0, appearanceTexture(scene, STREAMER_POSES.happy.key, this.appearance)).setOrigin(0.5, 1).setDepth(DEPTH.character);
    this.pose = 'happy';
    this.baseHeight = 0;
  }

  // Bottom of the bust is hidden behind the counter, so we anchor by the bottom edge.
  layout({ x, bottom, height }) {
    this.box = { x, bottom, height };
    this.baseHeight = height;
    this.applyPose();
  }

  setPose(pose) {
    if (!STREAMER_POSES[pose] || pose === this.pose) return;
    this.pose = pose;
    this.applyPose();
  }

  setAppearance(appearance) {
    this.appearance = appearance;
    this.applyPose();
  }

  applyPose() {
    if (!this.box) return;
    const def = STREAMER_POSES[this.pose];
    this.image.setTexture(appearanceTexture(this.scene, def.key, this.appearance));
    const scale = this.baseHeight / this.image.height;
    this.scene.tweens.killTweensOf(this.image);
    this.image.setScale(scale).setPosition(this.box.x, this.box.bottom).setAngle(0);
    if (this.idling) this.idleTween();
  }

  mouth() {
    const mouth = appearanceMouth(this.appearance);
    const w = this.image.displayWidth;
    const h = this.image.displayHeight;
    return {
      x: this.image.x + (mouth.x - 0.5) * w,
      y: this.image.y - (1 - mouth.y) * h,
      radius: Math.max(70, w * 0.28),
    };
  }

  bounce() {
    this.scene.tweens.killTweensOf(this.image);
    const s = this.baseHeight / this.image.height;
    this.image.setScale(s);
    this.scene.tweens.add({
      targets: this.image, scaleY: s * 1.035, scaleX: s * 0.985, duration: 140, yoyo: true, ease: 'Sine.InOut',
      onComplete: () => { this.image.setScale(s); if (this.idling) this.idleTween(); },
    });
  }

  idle() {
    this.idling = true;
    this.idleTween();
  }

  idleTween() {
    const s = this.image.scale;
    this.scene.tweens.add({ targets: this.image, scaleY: s * 1.012, duration: 1100, yoyo: true, repeat: -1, ease: 'Sine.InOut' });
  }
}

export function burstHearts(scene, x, y, { count = 6, size = 22, depth = DEPTH.banner } = {}) {
  for (let i = 0; i < count; i += 1) {
    const g = scene.add.graphics().setDepth(depth);
    const color = [0xff6f8e, 0xff9fb8, 0xffc2d4][i % 3];
    heartPath(g, 0, 0, size * Phaser.Math.FloatBetween(0.7, 1.15), color);
    g.setPosition(x, y);
    const angle = Phaser.Math.FloatBetween(-Math.PI * 0.95, -Math.PI * 0.05);
    const dist = Phaser.Math.FloatBetween(60, 120);
    scene.tweens.add({
      targets: g,
      x: x + Math.cos(angle) * dist,
      y: y + Math.sin(angle) * dist,
      alpha: 0,
      scale: 1.3,
      duration: Phaser.Math.Between(650, 950),
      ease: 'Sine.Out',
      onComplete: () => g.destroy(),
    });
  }
}

export function sparkle(scene, x, y, { count = 8, radius = 90, depth = DEPTH.banner } = {}) {
  for (let i = 0; i < count; i += 1) {
    const g = scene.add.graphics().setDepth(depth);
    const s = Phaser.Math.FloatBetween(6, 11);
    g.fillStyle(0xffffff, 1);
    g.fillTriangle(-s, 0, 0, -s * 0.28, 0, s * 0.28);
    g.fillTriangle(s, 0, 0, -s * 0.28, 0, s * 0.28);
    g.fillTriangle(0, -s, -s * 0.28, 0, s * 0.28, 0);
    g.fillTriangle(0, s, -s * 0.28, 0, s * 0.28, 0);
    const a = (Math.PI * 2 * i) / count + Phaser.Math.FloatBetween(-0.2, 0.2);
    g.setPosition(x + Math.cos(a) * radius * 0.3, y + Math.sin(a) * radius * 0.3).setScale(0.3);
    scene.tweens.add({
      targets: g,
      x: x + Math.cos(a) * radius,
      y: y + Math.sin(a) * radius,
      scale: 1,
      alpha: 0,
      duration: 700,
      ease: 'Sine.Out',
      onComplete: () => g.destroy(),
    });
  }
}
