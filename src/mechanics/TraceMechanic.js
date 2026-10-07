import Phaser from 'phaser';

// Free-hand trace over the food: squeezing sauce, piping icing, shaking sprinkles.
// Only movement inside the elliptical zone counts and is drawn; strokes outside it do nothing,
// lifting the finger keeps progress, so the step can never be lost or stuck.
export class TraceMechanic {
  constructor(scene, { zone, required, onStart, onDraw, onProgress, onComplete }) {
    this.scene = scene;
    this.zone = zone; // { x, y, rx, ry, angle (radians) }
    this.required = required; // px of in-zone path
    this.onStart = onStart;
    this.onDraw = onDraw;
    this.onProgress = onProgress;
    this.onComplete = onComplete;
    this.length = 0;
    this.active = true;
    this.pointerId = null;
    this.last = null;
    scene.input.on('pointerdown', this.down, this);
    scene.input.on('pointermove', this.move, this);
    scene.input.on('pointerup', this.up, this);
    scene.input.on('pointerupoutside', this.up, this);
    scene.input.on('gameout', this.up, this);
  }

  setGeometry(zone, required) {
    this.zone = zone;
    this.required = required;
    this.last = null;
  }

  // The zone is an ellipse that may be rotated (e.g. a corn dog lying diagonally).
  inside(x, y) {
    const a = -(this.zone.angle ?? 0);
    const px = x - this.zone.x;
    const py = y - this.zone.y;
    const dx = (px * Math.cos(a) - py * Math.sin(a)) / this.zone.rx;
    const dy = (px * Math.sin(a) + py * Math.cos(a)) / this.zone.ry;
    return dx * dx + dy * dy <= 1;
  }

  down(pointer) {
    if (!this.active || this.pointerId !== null) return;
    this.pointerId = pointer.id;
    this.last = { x: pointer.worldX, y: pointer.worldY };
    this.onStart?.(this.last);
  }

  move(pointer) {
    if (!this.active || pointer.id !== this.pointerId || !pointer.isDown) return;
    const point = { x: pointer.worldX, y: pointer.worldY };
    const from = this.last ?? point;
    this.last = point;
    const inside = this.inside(from.x, from.y) && this.inside(point.x, point.y);
    const step = Phaser.Math.Distance.Between(from.x, from.y, point.x, point.y);
    this.onDraw?.({ from, to: point, inside });
    // Ignore teleport-like jumps so a single tap-drag across the screen cannot finish the step.
    if (!inside || step > this.zone.rx) return;
    this.length += step;
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
    this.last = null;
  }

  getProgress() { return Phaser.Math.Clamp(this.length / this.required, 0, 1); }

  dispose() {
    this.active = false;
    this.scene.input.off('pointerdown', this.down, this);
    this.scene.input.off('pointermove', this.move, this);
    this.scene.input.off('pointerup', this.up, this);
    this.scene.input.off('pointerupoutside', this.up, this);
    this.scene.input.off('gameout', this.up, this);
  }
}
