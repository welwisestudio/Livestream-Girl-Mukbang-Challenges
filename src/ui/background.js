import { DEPTH } from './layout.js';

// The approved room art is a single portrait painting: striped wall above, counter below.
// It is never stretched. We cover the whole viewport with one uniform scale chosen so the
// counter rim lands on the requested table line, and draw a second, cropped copy of the
// counter in front of the character so her bust always sits *behind* the table.
const RIM = 0.5749; // measured: counter rim starts at 1582 / 2752 px
// The front copy starts at the tabletop's back edge (1655 px, under the pink rim band), so the
// band shows behind her and her body meets the tabletop instead of stopping above an empty strip.
const FRONT_CROP = 0.6014;

export class RoomBackground {
  constructor(scene) {
    this.scene = scene;
    this.back = scene.add.image(0, 0, 'room').setOrigin(0.5, 0).setDepth(DEPTH.room);
    this.front = scene.add.image(0, 0, 'room').setOrigin(0.5, 0).setDepth(DEPTH.counter);
    const { width, height } = this.back.frame;
    this.native = { width, height };
    this.front.setCrop(0, Math.floor(height * FRONT_CROP), width, height);
    this.tableY = 0;
  }

  layout(frame, tableY) {
    this.frame = frame;
    this.tableY = tableY;
    const scale = this.scaleFor(frame, tableY);
    const y = tableY - RIM * this.native.height * scale;
    for (const image of [this.back, this.front]) image.setScale(scale).setPosition(frame.W / 2, y);
    this.scale = scale;
  }

  // Uniform scale that covers the viewport with the counter rim on the table line.
  scaleFor(frame, tableY) {
    const { width: bw, height: bh } = this.native;
    return Math.max(frame.W / bw, tableY / (RIM * bh), (frame.H - tableY) / ((1 - RIM) * bh)) * 1.001;
  }

  // Screen y where the front counter starts covering the character (the tabletop edge).
  frontY(frame, tableY) {
    return tableY + (FRONT_CROP - RIM) * this.native.height * this.scaleFor(frame, tableY);
  }

  // Smoothly re-anchors the table line (e.g. moving from the stream view to the cooking close-up).
  panTo(frame, tableY, duration = 420) {
    this.scene.tweens.killTweensOf(this);
    const state = { t: this.tableY };
    this.scene.tweens.add({
      targets: state, t: tableY, duration, ease: 'Sine.InOut',
      onUpdate: () => this.layout(frame, state.t),
      onComplete: () => this.layout(frame, tableY),
    });
  }

  setFrontVisible(visible) {
    this.front.setVisible(visible);
  }
}
