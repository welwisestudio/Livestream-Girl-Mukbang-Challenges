import Phaser from 'phaser';

// Forgiving circular stir: press anywhere on/near the bowl and move around its centre.
// Progress = accumulated angle around the centre. Leaving the bowl only pauses progress,
// releasing keeps it, so the player can never lose or get stuck in this step.
export class StirMechanic {
  constructor(scene, { center, radius, turns = 2, onStart, onMove, onProgress, onComplete }) {
    this.scene = scene;
    this.center = center;
    this.radius = radius;
    this.required = Math.PI * 2 * turns;
    this.onStart = onStart;
    this.onMove = onMove;
    this.onProgress = onProgress;
    this.onComplete = onComplete;
    this.accumulated = 0;
    this.active = true;
    this.pointerId = null;
    this.lastAngle = null;
    scene.input.on('pointerdown', this.down, this);
    scene.input.on('pointermove', this.move, this);
    scene.input.on('pointerup', this.up, this);
    scene.input.on('pointerupoutside', this.up, this);
    scene.input.on('gameout', this.up, this);
  }

  setGeometry(center, radius) {
    this.center = center;
    this.radius = radius;
    this.lastAngle = null;
  }

  down(pointer) {
    if (!this.active || this.pointerId !== null) return;
    const d = Phaser.Math.Distance.Between(pointer.worldX, pointer.worldY, this.center.x, this.center.y);
    if (d > this.radius * 1.6) return;
    this.pointerId = pointer.id;
    this.lastAngle = null;
    this.onStart?.();
    this.track(pointer);
  }

  move(pointer) {
    if (!this.active || pointer.id !== this.pointerId || !pointer.isDown) return;
    this.track(pointer);
  }

  track(pointer) {
    const dx = pointer.worldX - this.center.x;
    const dy = pointer.worldY - this.center.y;
    const d = Math.hypot(dx, dy);
    this.onMove?.({ x: pointer.worldX, y: pointer.worldY, inside: d <= this.radius * 1.6 });
    // Near the exact centre the angle is unstable; outside the generous zone progress pauses.
    if (d < this.radius * 0.12 || d > this.radius * 1.9) {
      this.lastAngle = null;
      return;
    }
    const angle = Math.atan2(dy, dx);
    if (this.lastAngle !== null) {
      const delta = Phaser.Math.Angle.Wrap(angle - this.lastAngle);
      // Ignore teleport-like jumps (finger lifted & replaced) but accept fast stirring.
      if (Math.abs(delta) < 1.4) this.accumulated += Math.abs(delta);
    }
    this.lastAngle = angle;
    const progress = this.getProgress();
    this.onProgress?.(progress);
    if (progress >= 1) {
      this.active = false;
      this.pointerId = null;
      this.onComplete?.();
    }
  }

  up(pointer) {
    if (pointer && this.pointerId !== null && pointer.id !== this.pointerId) return;
    this.pointerId = null;
    this.lastAngle = null;
  }

  getProgress() { return Phaser.Math.Clamp(this.accumulated / this.required, 0, 1); }

  dispose() {
    this.active = false;
    this.scene.input.off('pointerdown', this.down, this);
    this.scene.input.off('pointermove', this.move, this);
    this.scene.input.off('pointerup', this.up, this);
    this.scene.input.off('pointerupoutside', this.up, this);
    this.scene.input.off('gameout', this.up, this);
  }
}
