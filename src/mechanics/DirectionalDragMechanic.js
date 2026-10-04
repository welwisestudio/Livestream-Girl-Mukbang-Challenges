export class DirectionalDragMechanic {
  constructor(scene, { draggable, minDistance = 90, maxCrossAxis = 64, direction = 'up', onComplete, onInvalid }) {
    this.scene = scene;
    this.draggable = draggable;
    this.minDistance = minDistance;
    this.maxCrossAxis = maxCrossAxis;
    this.direction = direction;
    this.onComplete = onComplete;
    this.onInvalid = onInvalid;
    this.origin = { x: draggable.x, y: draggable.y };
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
  }

  handleDrag(_pointer, x, y) {
    if (!this.active) return;
    this.draggable.setPosition(x, y);
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
    const dx = this.draggable.x - this.origin.x;
    const dy = this.draggable.y - this.origin.y;
    const directional = this.direction === 'up' ? -dy : dy;
    if (directional >= this.minDistance && Math.abs(dx) <= this.maxCrossAxis) {
      this.active = false;
      this.draggable.disableInteractive();
      this.onComplete?.();
      return;
    }
    this.onInvalid?.();
    this.scene.tweens.add({ targets: this.draggable, ...this.origin, duration: 180, ease: 'Back.Out' });
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
