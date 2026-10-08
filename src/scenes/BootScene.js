import Phaser from 'phaser';
import { IMAGE_ASSETS } from '../content/assets.js';
import { CAMPAIGN_ORDER } from '../content/levels.js';
import { hideLoader, setLoadProgress, showLoadError } from '../app/loader.js';

// Loads all runtime art with real progress, then hands over to Home and hides the loader.
export class BootScene extends Phaser.Scene {
  constructor() { super('Boot'); }

  preload() {
    this.load.setPath('');
    for (const { key, url } of IMAGE_ASSETS) this.load.image(key, url);
    this.load.on('progress', (value) => setLoadProgress(0.1 + value * 0.9));
    this.load.on('loaderror', (file) => {
      console.error('Asset failed to load', file?.src);
      this.failed = true;
    });
  }

  create() {
    if (this.failed) {
      showLoadError();
      return;
    }
    for (const { key } of IMAGE_ASSETS) this.textures.get(key).setFilter(Phaser.Textures.FilterMode.LINEAR);
    const services = this.registry.get('services');
    services.platform.firstFrameReady();
    // Local review helper: an explicit 1-based campaign number opens that level directly.
    // Normal launches still enter Home; the future platform bootstrap does not use this URL route.
    const requestedNumber = Number(new URLSearchParams(globalThis.location?.search ?? '').get('level'));
    const requestedLevelId = Number.isInteger(requestedNumber) && requestedNumber >= 1 && requestedNumber <= CAMPAIGN_ORDER.length
      ? CAMPAIGN_ORDER[requestedNumber - 1]
      : null;
    this.scene.start(requestedLevelId ? 'Level' : 'Home', requestedLevelId ? { levelId: requestedLevelId } : undefined);
    // Boot stops after start(); use a real timer so Home renders a frame before the reveal.
    setTimeout(hideLoader, 80);
  }
}
