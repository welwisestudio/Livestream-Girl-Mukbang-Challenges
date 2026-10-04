import Phaser from 'phaser';
import { VIEWPORT_EVENT } from '../app/viewport.js';
import { computeFrame } from '../ui/layout.js';

// Every screen works in CSS pixels: the camera zooms by DPR and `layout(frame)` is called on
// creation and whenever the container size, aspect ratio, DPR or safe area changes.
export class BaseScene extends Phaser.Scene {
  bindViewport() {
    const apply = (vp) => {
      this.vp = vp;
      const cam = this.cameras.main;
      cam.setSize(this.scale.width, this.scale.height);
      cam.setOrigin(0, 0).setZoom(vp.dpr).setScroll(0, 0);
      this.frame = computeFrame(vp);
      this.layout?.(this.frame);
    };
    this.game.events.on(VIEWPORT_EVENT, apply);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.game.events.off(VIEWPORT_EVENT, apply));
    apply(this.registry.get('viewport'));
  }

  services() {
    return this.registry.get('services');
  }

  fadeTo(sceneKey, data, duration = 280) {
    if (this.leaving) return;
    this.leaving = true;
    this.cameras.main.fadeOut(duration, 255, 240, 245);
    this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => this.scene.start(sceneKey, data));
  }
}
