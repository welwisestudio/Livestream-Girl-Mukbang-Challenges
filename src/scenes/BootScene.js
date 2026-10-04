import Phaser from 'phaser';
import { IMAGE_ASSETS } from '../content/assets.js';
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
    this.scene.start('Home');
    // Boot stops after start(); use a real timer so Home renders a frame before the reveal.
    setTimeout(hideLoader, 80);
  }
}
