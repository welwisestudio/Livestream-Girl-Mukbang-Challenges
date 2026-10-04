import Phaser from 'phaser';

// Drag an object onto a circular target. A miss returns it home; nothing advances.
// Home and target can be updated at any time (viewport resize) without losing state.
export class DragDropMechanic {
  constructor(scene, { draggable, target, onStart, onProgress, onComplete, onInvalid }) {
    this.scene = scene;
    this.draggable = draggable;
    this.target = target;
    this.onStart = onStart;
    this.onProgress = onProgress;
    this.onComplete = onComplete;
    this.onInvalid = onInvalid;
    this.home = { x: draggable.x, y: draggable.y };
    this.baseScale = draggable.scale;
    this.active = true;
    this.dragging = false;

    draggable.setInteractive({ useHandCursor: true, draggable: true, pixelPerfect: false });
    scene.input.setDraggable(draggable);
    draggable.on('dragstart', this.handleStart, this);
    draggable.on('drag', this.handleDrag, this);
    draggable.on('dragend', this.handleEnd, this);
  }

  setHome(x, y, scale = this.draggable.scale) {
    this.home = { x, y };
    this.baseScale = scale;
    if (!this.dragging && this.active) this.draggable.setPosition(x, y).setScale(scale);
  }

  setTarget(target) {
    this.target = target;
  }

  isValidDrop(x, y) {
    return Phaser.Math.Distance.Between(x, y, this.target.x, this.target.y) <= this.target.radius;
  }

  handleStart() {
    if (!this.active) return;
    this.scene.tweens.killTweensOf(this.draggable);
    this.dragging = true;
    this.draggable.setScale(this.baseScale * 1.08).setAngle(0);
    this.onStart?.();
  }

  handleDrag(_pointer, x, y) {
    if (!this.active || !this.dragging) return;
    this.draggable.setPosition(x, y);
    this.onProgress?.({ x, y });
  }

  handleEnd() {
    if (!this.active || !this.dragging) return;
    this.dragging = false;
    this.draggable.setScale(this.baseScale);
    if (this.isValidDrop(this.draggable.x, this.draggable.y)) {
      this.active = false;
      this.draggable.disableInteractive();
      this.onComplete?.();
      return;
    }
    this.onInvalid?.();
    this.scene.tweens.add({ targets: this.draggable, x: this.home.x, y: this.home.y, duration: 220, ease: 'Back.Out' });
  }

  dispose() {
    this.active = false;
    this.draggable.off('dragstart', this.handleStart, this);
    this.draggable.off('drag', this.handleDrag, this);
    this.draggable.off('dragend', this.handleEnd, this);
    if (this.draggable.input) this.draggable.disableInteractive();
  }
}
