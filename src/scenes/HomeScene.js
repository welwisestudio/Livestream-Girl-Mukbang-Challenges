import Phaser from 'phaser';
import { addPastelBackground, addHud, createButton, drawCharacter, drawJelly, addAtlasSprite, ATLAS } from '../ui/art.js';
import { COLORS } from '../content/theme.js';

export class HomeScene extends Phaser.Scene {
  constructor() { super('Home'); }

  create() {
    this.services = this.registry.get('services');
    const save = this.services.save.snapshot();
    addPastelBackground(this);
    addHud(this, { level: save.highestLevel, coins: save.coins, title: 'ELpam' });

    const live = this.add.container(195, 112).setDepth(20);
    const liveBg = this.add.graphics();
    liveBg.fillStyle(COLORS.paper, 0.96).fillRoundedRect(-91, -24, 182, 48, 21);
    liveBg.lineStyle(3, COLORS.pinkDark).strokeRoundedRect(-91, -24, 182, 48, 21);
    liveBg.fillStyle(0xff6c80).fillCircle(-65, 0, 8);
    const liveText = this.add.text(10, 0, 'LIVE KITCHEN', {
      fontFamily: 'Arial Rounded MT Bold, Trebuchet MS', fontSize: '18px', fontStyle: 'bold', color: '#d86f8b',
    }).setOrigin(0.5);
    live.add([liveBg, liveText]);

    drawCharacter(this, 195, 330, { scale: 1.08 });
    const mascot = addAtlasSprite(this, ATLAS.mascot, 307, 430, { width: 112, height: 112, depth: 12 });
    this.tweens.add({ targets: mascot, y: 422, duration: 900, yoyo: true, repeat: -1, ease: 'Sine.InOut' });
    drawJelly(this, 195, 585, { scale: 0.82, berries: true, glaze: true });

    const thought = this.add.graphics().setDepth(9);
    thought.fillStyle(COLORS.paper, 0.94).fillCircle(96, 410, 40).fillCircle(128, 445, 10).fillCircle(143, 462, 6);
    thought.lineStyle(3, COLORS.pinkDark).strokeCircle(96, 410, 40);
    addAtlasSprite(this, ATLAS.finishedJelly, 96, 410, { width: 68, height: 68, depth: 11 });

    const start = createButton(this, {
      x: 195, y: 728, width: 244, height: 68,
      label: 'Start Live',
      onClick: () => this.startLevel(),
    });
    start.setName('start-level');
    this.debugTargets = { start: { x: 195, y: 728 } };
    this.services.platform.gameReady();
  }

  startLevel() {
    if (this.transitioning) return;
    this.transitioning = true;
    this.cameras.main.fadeOut(300, 255, 246, 242);
    this.time.delayedCall(300, () => this.scene.start('Level', { levelId: 'orange-jelly-01' }));
  }

  getDebugSnapshot() {
    return { scene: 'Home', phase: 'home', targets: this.debugTargets, save: this.services.save.snapshot() };
  }
}
