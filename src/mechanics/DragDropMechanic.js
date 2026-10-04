import Phaser from 'phaser';

export class DragDropMechanic {
  constructor(scene, { draggable, target, isValidDrop, onProgress, onComplete, onInvalid }) {
    this.scene = scene;
    this.draggable = draggable;
    this.target = target;
    this.isValidDrop = isValidDrop ?? ((x, y) => Phaser.Math.Distance.Between(x, y, target.x, target.y) <= target.radius);
    this.onProgress = onProgress;
    this.onComplete = onComplete;
    this.onInvalid = onInvalid;
    this.origin = { x: draggable.x, y: draggable.y };
    this.originScale = { x: draggable.scaleX, y: draggable.scaleY };
    this.active = true;
    this.dragging = false;
    this.releaseHandled = false;

    draggable.setInteractive({ useHandCursor: true, draggable: true });
    scene.input.setDraggable(draggable);
    draggable.on('dragstart', this.handleStart, this);
    draggable.on('drag', this.handleDrag, this);
    draggable.on('dragend', this.handleEnd, this);
    scene.input.on('pointerup', this.handleGlobalUp, this);
    scene.input.on('gameout', this.handleGlobalUp, this);
  }

  handleStart() {
    if (!this.active) return;
    this.scene.tweens.killTweensOf(this.draggable);
    this.dragging = true;
    this.releaseHandled = false;
    this.draggable.setScale(this.originScale.x * 1.06, this.originScale.y * 1.06);
  }

  handleDrag(_pointer, x, y) {
    if (!this.active) return;
    this.draggable.setPosition(x, y);
    this.onProgress?.({ x, y });
  }

  handleEnd() {
    this.finishRelease();
  }

  handleGlobalUp() {
    if (!this.dragging || this.releaseHandled) return;
    this.scene.time.delayedCall(0, () => this.finishRelease());
  }

  finishRelease() {
    if (!this.active || !this.dragging || this.releaseHandled) return;
    this.releaseHandled = true;
    this.dragging = false;
    this.draggable.setScale(this.originScale.x, this.originScale.y);
    if (this.isValidDrop(this.draggable.x, this.draggable.y)) {
      this.active = false;
      this.draggable.disableInteractive();
      this.onComplete?.();
      return;
    }
    this.onInvalid?.();
    this.scene.tweens.add({
      targets: this.draggable,
      x: this.origin.x,
      y: this.origin.y,
      duration: 180,
      ease: 'Back.Out',
    });
  }

  pause() { this.active = false; }
  resume() { this.active = true; }
  getProgress() { return 0; }
  dispose() {
    this.draggable.off('dragstart', this.handleStart, this);
    this.draggable.off('drag', this.handleDrag, this);
    this.draggable.off('dragend', this.handleEnd, this);
    this.scene.input.off('pointerup', this.handleGlobalUp, this);
    this.scene.input.off('gameout', this.handleGlobalUp, this);
    this.draggable.disableInteractive();
  }
}
