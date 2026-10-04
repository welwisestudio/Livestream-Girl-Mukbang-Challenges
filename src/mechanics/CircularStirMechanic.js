import Phaser from 'phaser';

export class CircularStirMechanic {
  constructor(scene, { handle, center, innerRadius = 34, outerRadius = 106, turns = 1.25, onProgress, onComplete, onInvalid }) {
    this.scene = scene;
    this.handle = handle;
    this.center = center;
    this.innerRadius = innerRadius;
    this.outerRadius = outerRadius;
    this.required = Math.PI * 2 * turns;
    this.onProgress = onProgress;
    this.onComplete = onComplete;
    this.onInvalid = onInvalid;
    this.active = true;
    this.dragging = false;
    this.accumulated = 0;
    this.lastAngle = 0;
    this.origin = { x: handle.x, y: handle.y };

    handle.setInteractive({ useHandCursor: true });
    handle.on('pointerdown', this.handleDown, this);
    scene.input.on('pointermove', this.handleMove, this);
    scene.input.on('pointerup', this.handleUp, this);
    scene.input.on('pointerupoutside', this.handleUp, this);
    scene.input.on('gameout', this.handleUp, this);
  }

  handleDown(pointer) {
    if (!this.active) return;
    this.dragging = true;
    this.scene.tweens.killTweensOf(this.handle);
    this.accumulated = 0;
    this.lastAngle = Math.atan2(pointer.worldY - this.center.y, pointer.worldX - this.center.x);
  }

  handleMove(pointer) {
    if (!this.active || !this.dragging || !pointer.isDown) return;
    const dx = pointer.worldX - this.center.x;
    const dy = pointer.worldY - this.center.y;
    const radius = Math.hypot(dx, dy);
    if (radius < this.innerRadius || radius > this.outerRadius) {
      this.accumulated = 0;
      this.onProgress?.(0);
      this.onInvalid?.();
      this.lastAngle = Math.atan2(dy, dx);
      return;
    }

    const angle = Math.atan2(dy, dx);
    let delta = Phaser.Math.Angle.Wrap(angle - this.lastAngle);
    if (Math.abs(delta) > 0.65) delta = 0;
    this.accumulated += Math.abs(delta);
    this.lastAngle = angle;
    this.handle.setPosition(pointer.worldX, pointer.worldY);
    const progress = Phaser.Math.Clamp(this.accumulated / this.required, 0, 1);
    this.onProgress?.(progress);
    if (progress >= 1) {
      this.active = false;
      this.dragging = false;
      this.handle.disableInteractive();
      this.onComplete?.();
    }
  }

  handleUp() {
    if (!this.dragging || !this.active) return;
    this.dragging = false;
    if (this.accumulated < this.required) {
      this.accumulated = 0;
      this.onProgress?.(0);
      this.onInvalid?.();
      this.scene.tweens.add({ targets: this.handle, ...this.origin, angle: 0, duration: 180, ease: 'Back.Out' });
    }
  }

  pause() { this.active = false; }
  resume() { this.active = true; }
  getProgress() { return Phaser.Math.Clamp(this.accumulated / this.required, 0, 1); }
  dispose() {
    this.handle.off('pointerdown', this.handleDown, this);
    this.scene.input.off('pointermove', this.handleMove, this);
    this.scene.input.off('pointerup', this.handleUp, this);
    this.scene.input.off('pointerupoutside', this.handleUp, this);
    this.scene.input.off('gameout', this.handleUp, this);
    this.handle.disableInteractive();
  }
}
