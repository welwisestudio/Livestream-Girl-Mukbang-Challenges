import Phaser from 'phaser';

export class BootScene extends Phaser.Scene {
  constructor() { super('Boot'); }

  preload() {
    const fill = document.querySelector('#loader-fill');
    this.load.on('progress', (value) => {
      if (fill) fill.style.width = `${Math.max(4, Math.round(value * 100))}%`;
    });
    this.load.image('kitchen-background', '/assets/generated/kitchen-background.png');
    this.load.spritesheet('level1-atlas', '/assets/generated/level1-sprite-atlas-transparent.png', {
      frameWidth: 512,
      frameHeight: 512,
    });
  }

  create() {
    const services = this.registry.get('services');
    services.platform.firstFrameReady();
    const loader = document.querySelector('#initial-loader');
    const fill = document.querySelector('#loader-fill');
    if (fill) fill.style.width = '100%';
    this.time.delayedCall(280, () => {
      loader?.classList.add('is-done');
      this.time.delayedCall(340, () => loader?.remove());
      this.scene.start('Home');
    });
  }
}
