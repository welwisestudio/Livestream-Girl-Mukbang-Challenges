import Phaser from 'phaser';
import { ViewportController, VIEWPORT_EVENT } from './viewport.js';
import { BootScene } from '../scenes/BootScene.js';
import { HomeScene } from '../scenes/HomeScene.js';
import { LevelScene } from '../scenes/LevelScene.js';
import { ResultScene } from '../scenes/ResultScene.js';

// Scale mode NONE: the canvas backing store is CSS size × DPR and the zoom of 1/DPR maps it
// back to CSS pixels. Scenes zoom their cameras by DPR so all layout code works in CSS pixels.
export function createGame(services) {
  const container = document.getElementById('game-container');
  const viewport = new ViewportController(container);
  const vp = viewport.current;

  const game = new Phaser.Game({
    type: Phaser.AUTO,
    parent: container,
    width: vp.width * vp.dpr,
    height: vp.height * vp.dpr,
    backgroundColor: '#fde9ee',
    antialias: true,
    pixelArt: false,
    roundPixels: false,
    audio: { noAudio: true },
    input: { activePointers: 2, touch: { capture: true } },
    scale: {
      mode: Phaser.Scale.NONE,
      zoom: 1 / vp.dpr,
      autoRound: false,
    },
    render: { antialias: true, powerPreference: 'high-performance' },
    scene: [BootScene, HomeScene, LevelScene, ResultScene],
  });

  game.events.once('ready', () => {
    game.canvas.style.width = `${vp.width}px`;
    game.canvas.style.height = `${vp.height}px`;
    game.scale.refresh();
  });
  game.registry.set('services', services);
  game.registry.set('viewport', vp);

  viewport.subscribe((next) => {
    game.registry.set('viewport', next);
    game.scale.setZoom(1 / next.dpr);
    game.scale.resize(next.width * next.dpr, next.height * next.dpr);
    // Phaser skips the style update when zoom is 1, which can leave a stale CSS size behind.
    game.canvas.style.width = `${next.width}px`;
    game.canvas.style.height = `${next.height}px`;
    game.scale.refresh(); // re-measure bounds + displayScale used for pointer mapping
    game.events.emit(VIEWPORT_EVENT, next);
  });
  game.events.once('destroy', () => viewport.dispose());
  return game;
}
