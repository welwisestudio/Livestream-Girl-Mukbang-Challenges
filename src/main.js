import '@fontsource/fredoka/latin-600.css';
import '@fontsource/fredoka/latin-700.css';
import './styles.css';
import { createPlatform } from './platform/createPlatform.js';
import { SaveService } from './services/SaveService.js';
import { createServices } from './app/createServices.js';
import { createGame } from './app/createGame.js';
import { loaderPainted, setLoadProgress, showLoadError, showSaveError } from './app/loader.js';

/* global __QA_HOOKS__ */

async function loadFonts() {
  if (!document.fonts?.load) return;
  // Phaser draws text to canvas, so the font must be ready before the first text is created.
  await Promise.race([
    Promise.all([document.fonts.load('600 20px Fredoka'), document.fonts.load('700 20px Fredoka')]),
    new Promise((resolve) => setTimeout(resolve, 2500)),
  ]);
}

// Read → parse → validate → migrate, before anything can write. A failed or unreadable load
// never becomes an empty save: the loading screen offers Retry and the game waits.
async function loadSave(save, platform) {
  for (;;) {
    try {
      await save.load();
      return;
    } catch (error) {
      console.warn('Save load failed:', error?.kind ?? '', error?.message ?? error);
      platform.reportWarning?.('save-load');
      await showSaveError(error);
    }
  }
}

function reportErrors(platform) {
  window.addEventListener('error', () => platform.reportError?.());
  window.addEventListener('unhandledrejection', () => platform.reportError?.());
}

// Start order (YouTube integration requirements): the SDK script is already loaded by
// index.html → the loading screen is painted → firstFrameReady → host lifecycle + cloud load →
// assets → first interactive screen → gameReady (BootScene, after the loader is gone).
async function bootstrap() {
  setLoadProgress(0.02);
  const platform = await createPlatform();
  reportErrors(platform);
  await loaderPainted();
  platform.firstFrameReady();
  const [platformState] = await Promise.all([platform.init(), loadFonts()]);
  setLoadProgress(0.06);
  const save = new SaveService(platform);
  await loadSave(save, platform);
  setLoadProgress(0.1);
  const services = createServices({ platform, platformState, save });
  const game = createGame(services);
  services.lifecycle.attachGame(game);
  services.assets.attach(game);
  // Dev / QA builds report any art that a screen uses before it was loaded.
  if (import.meta.env.DEV || __QA_HOOKS__) services.assets.watchMissing(game);
  // Test hook: dev server or the separate QA builds only; never in a release bundle.
  const debugEnabled = (import.meta.env.DEV || __QA_HOOKS__) && new URLSearchParams(location.search).get('debug') === '1';
  if (debugEnabled) {
    const { installDebug } = await import('./debug/installDebug.js');
    installDebug(game, services);
  }
}

bootstrap().catch((error) => {
  console.error(error);
  showLoadError();
});
