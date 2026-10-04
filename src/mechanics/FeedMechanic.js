import Phaser from 'phaser';

const TAP_MAX_MOVE = 14;
const TAP_MAX_MS = 350;

// Mukbang feeding: press a serving to pick up its portion, then drag it to the mouth
// (or simply tap the serving to send it automatically). A drop away from the mouth puts the
// portion back on its plate. While a portion is being eaten all input is ignored.
export class FeedMechanic {
  constructor(scene, { servings, getMouth, onPickUp, onCancel, onFeed, onInvalid }) {
    this.scene = scene;
    this.servings = servings; // [{ id, zone, eaten }]
    this.getMouth = getMouth;
    this.onPickUp = onPickUp;
    this.onCancel = onCancel;
    this.onFeed = onFeed;
    this.onInvalid = onInvalid;
    this.busy = false;
    this.active = true;
    this.carry = null;
    for (const serving of servings) {
      serving.handler = (pointer) => this.press(serving, pointer);
      serving.zone.on('pointerdown', serving.handler);
    }
    scene.input.on('pointermove', this.move, this);
    scene.input.on('pointerup', this.release, this);
    scene.input.on('pointerupoutside', this.release, this);
    scene.input.on('gameout', this.cancelCarry, this);
  }

  press(serving, pointer) {
    if (!this.active || this.busy || this.carry || serving.eaten) return;
    const piece = this.onPickUp?.(serving, { x: pointer.worldX, y: pointer.worldY });
    if (!piece) return;
    this.carry = { serving, piece, pointerId: pointer.id, start: { x: pointer.worldX, y: pointer.worldY }, t: this.scene.time.now, moved: 0 };
  }

  move(pointer) {
    const c = this.carry;
    if (!c || pointer.id !== c.pointerId) return;
    c.moved = Math.max(c.moved, Phaser.Math.Distance.Between(pointer.worldX, pointer.worldY, c.start.x, c.start.y));
    if (c.moved > TAP_MAX_MOVE * 0.5) c.piece.setPosition(pointer.worldX, pointer.worldY - c.piece.displayHeight * 0.25);
  }

  release(pointer) {
    const c = this.carry;
    if (!c || (pointer && pointer.id !== c.pointerId)) return;
    this.carry = null;
    const mouth = this.getMouth();
    const isTap = c.moved <= TAP_MAX_MOVE && this.scene.time.now - c.t <= TAP_MAX_MS;
    const atMouth = Phaser.Math.Distance.Between(c.piece.x, c.piece.y + c.piece.displayHeight * 0.25, mouth.x, mouth.y) <= mouth.radius;
    if (isTap || atMouth) {
      this.busy = true;
      c.serving.eaten = true;
      this.onFeed?.(c.serving, c.piece, () => { this.busy = false; });
      return;
    }
    this.onInvalid?.(c.serving);
    this.onCancel?.(c.serving, c.piece);
  }

  cancelCarry() {
    const c = this.carry;
    if (!c) return;
    this.carry = null;
    this.onCancel?.(c.serving, c.piece);
  }

  dispose() {
    this.active = false;
    for (const serving of this.servings) serving.zone.off('pointerdown', serving.handler);
    this.scene.input.off('pointermove', this.move, this);
    this.scene.input.off('pointerup', this.release, this);
    this.scene.input.off('pointerupoutside', this.release, this);
    this.scene.input.off('gameout', this.cancelCarry, this);
  }
}
