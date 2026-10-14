import Phaser from 'phaser';
import { VIEWPORT_EVENT } from '../app/viewport.js';
import { computeFrame } from '../ui/layout.js';
import { installPressFeedback } from '../ui/pressFeedback.js';
import { showWaiting } from '../app/loader.js';

// Every screen works in CSS pixels: the camera zooms by DPR and `layout(frame)` is called on
// creation and whenever the container size, aspect ratio, DPR or safe area changes.
export class BaseScene extends Phaser.Scene {
  bindViewport() {
    const audio = this.services().audio;
    this.input.once('pointerdown', () => audio.unlock());
    // Held sounds (fry, stir, squeeze) belong to the screen that started them; the music does not.
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => audio.stopLoops());
    installPressFeedback(this);
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

  sfx(id) {
    this.services().audio.playSfx(id);
  }

  services() {
    return this.registry.get('services');
  }

  fadeTo(sceneKey, data, duration = 280) {
    if (this.leaving) return;
    this.leaving = true;
    this.cameras.main.fadeOut(duration, 255, 240, 245);
    // The next screen's art (usually already streamed in) must be loaded before it starts.
    const ready = this.services().assets.ready(sceneKey, data);
    this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
      const slow = setTimeout(() => showWaiting(true), 350);
      ready.then(() => {
        clearTimeout(slow);
        showWaiting(false);
        this.scene.start(sceneKey, data);
      });
    });
  }
}
