import Phaser from 'phaser';
import { DESIGN } from '../content/theme.js';
import { BootScene } from '../scenes/BootScene.js';
import { HomeScene } from '../scenes/HomeScene.js';
import { LevelScene } from '../scenes/LevelScene.js';
import { ResultScene } from '../scenes/ResultScene.js';

export function createGame(services) {
  const game = new Phaser.Game({
    type: Phaser.AUTO,
    parent: 'game-container',
    width: DESIGN.width,
    height: DESIGN.height,
    backgroundColor: '#fff9f3',
    transparent: false,
    antialias: true,
    pixelArt: false,
    roundPixels: false,
    audio: { noAudio: true },
    input: { activePointers: 2, touch: { capture: true } },
    scale: {
      mode: Phaser.Scale.FIT,
      autoCenter: Phaser.Scale.CENTER_BOTH,
      width: DESIGN.width,
      height: DESIGN.height,
    },
    render: { antialias: true, powerPreference: 'high-performance' },
    scene: [BootScene, HomeScene, LevelScene, ResultScene],
  });
  game.registry.set('services', services);
  return game;
}
