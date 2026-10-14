import Phaser from 'phaser';
import { ASSET_URL, startKeys } from '../content/assetGroups.js';
import { CAMPAIGN_ORDER } from '../content/levels.js';
import { AUDIO_PATH, SOUND_FILES } from '../content/audio.js';
import { hideLoader, setLoadProgress, showLoadError } from '../app/loader.js';

/* global __PLATFORM__ */

// Loads the start set of art (Lobby, HUD, its popups, the equipped character, the offered dish)
// and the short sound effects with real progress, then hands over to Home and hides the loader.
// Everything else — level, wardrobe, store, part-time art and the background music — is fetched
// after gameReady (AssetStreamer / AudioService), so it never delays the first interactive screen.
// A missing sound is logged and skipped; it does not block the game like missing art does.
export class BootScene extends Phaser.Scene {
  constructor() { super('Boot'); }

  preload() {
    const services = this.registry.get('services');
    this.startKeys = startKeys(services.save.state);
    this.load.setPath('');
    for (const key of this.startKeys) this.load.image(key, ASSET_URL.get(key));
    for (const key of SOUND_FILES) this.load.binary(`sfx:${key}`, `${AUDIO_PATH}${key}.ogg`);
    this.load.on('progress', (value) => setLoadProgress(0.1 + value * 0.9));
    this.load.on('loaderror', (file) => {
      console.error('Asset failed to load', file?.src);
      if (file?.type !== 'binary') this.failed = true;
    });
  }

  create() {
    if (this.failed) {
      showLoadError();
      return;
    }
    for (const key of this.startKeys) this.textures.get(key).setFilter(Phaser.Textures.FilterMode.LINEAR);
    const services = this.registry.get('services');
    services.audio.registerSources(Object.fromEntries(SOUND_FILES.map((key) => [key, this.cache.binary.get(`sfx:${key}`)])));
    // Local review helper: an explicit 1-based campaign number opens that level directly.
    // Normal launches enter Home; YouTube builds ignore this URL route.
    const requestedNumber = __PLATFORM__ === 'youtube' ? NaN : Number(new URLSearchParams(globalThis.location?.search ?? '').get('level'));
    const requestedLevelId = Number.isInteger(requestedNumber) && requestedNumber >= 1 && requestedNumber <= CAMPAIGN_ORDER.length
      ? CAMPAIGN_ORDER[requestedNumber - 1]
      : null;
    const first = requestedLevelId ? 'Level' : 'Home';
    const data = requestedLevelId ? { levelId: requestedLevelId } : undefined;
    // The first screen's own art (normally already in the start set) before it starts.
    services.assets.ready(first, data).then(() => {
      this.scene.start(first, data);
      // Boot stops after start(); use a real timer so the first screen renders a frame before the
      // reveal. gameReady only once the loading screen is gone and the screen takes input; the
      // deferred art and the music are requested only after that.
      setTimeout(() => hideLoader().then(() => {
        services.platform.gameReady();
        services.assets.startBackground();
        services.audio.loadMusic();
      }), 80);
    });
  }
}
