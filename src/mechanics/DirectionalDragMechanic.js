// Drag an object in one direction (e.g. lift a mold straight up). Sideways or too-short
// drags spring back without advancing. Movement follows the finger mostly along the axis.
export class DirectionalDragMechanic {
  constructor(scene, { draggable, minDistance = 70, maxCrossAxis = 120, direction = 'up', onStart, onComplete, onInvalid }) {
    this.scene = scene;
    this.draggable = draggable;
    this.minDistance = minDistance;
    this.maxCrossAxis = maxCrossAxis;
    this.direction = direction;
    this.onStart = onStart;
    this.onComplete = onComplete;
    this.onInvalid = onInvalid;
    this.home = { x: draggable.x, y: draggable.y };
    this.active = true;
    this.dragging = false;

    draggable.setInteractive({ useHandCursor: true, draggable: true });
    scene.input.setDraggable(draggable);
    draggable.on('dragstart', this.handleStart, this);
    draggable.on('drag', this.handleDrag, this);
    draggable.on('dragend', this.handleEnd, this);
  }

  setHome(x, y, { minDistance, maxCrossAxis } = {}) {
    this.home = { x, y };
    if (minDistance) this.minDistance = minDistance;
    if (maxCrossAxis) this.maxCrossAxis = maxCrossAxis;
    if (!this.dragging && this.active) this.draggable.setPosition(x, y);
  }

  handleStart() {
    if (!this.active) return;
    this.scene.tweens.killTweensOf(this.draggable);
    this.dragging = true;
    this.onStart?.();
  }

  handleDrag(_pointer, x, y) {
    if (!this.active || !this.dragging) return;
    const dx = x - this.home.x;
    const dy = y - this.home.y;
    const horizontal = this.direction === 'left' || this.direction === 'right';
    this.draggable.setPosition(
      horizontal ? this.home.x + (this.direction === 'left' ? Math.min(dx, 18) : Math.max(dx, -18)) : this.home.x + dx * 0.35,
      horizontal ? this.home.y + dy * 0.35 : this.home.y + (this.direction === 'up' ? Math.min(dy, 18) : Math.max(dy, -18)),
    );
    this.lastDelta = { dx, dy };
  }

  handleEnd() {
    if (!this.active || !this.dragging) return;
    this.dragging = false;
    const { dx = 0, dy = 0 } = this.lastDelta ?? {};
    this.lastDelta = null;
    const horizontal = this.direction === 'left' || this.direction === 'right';
    const along = this.direction === 'up' ? -dy : this.direction === 'down' ? dy : this.direction === 'left' ? -dx : dx;
    const cross = horizontal ? Math.abs(dy) : Math.abs(dx);
    if (along >= this.minDistance && cross <= this.maxCrossAxis) {
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
