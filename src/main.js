import '@fontsource/fredoka/latin-600.css';
import '@fontsource/fredoka/latin-700.css';
import './styles.css';
import { createServices } from './app/createServices.js';
import { createGame } from './app/createGame.js';
import { setLoadProgress, showLoadError } from './app/loader.js';

async function loadFonts() {
  if (!document.fonts?.load) return;
  // Phaser draws text to canvas, so the font must be ready before the first text is created.
  await Promise.race([
    Promise.all([document.fonts.load('600 20px Fredoka'), document.fonts.load('700 20px Fredoka')]),
    new Promise((resolve) => setTimeout(resolve, 2500)),
  ]);
}

async function bootstrap() {
  setLoadProgress(0.04);
  const [services] = await Promise.all([createServices(), loadFonts()]);
  setLoadProgress(0.1);
  const game = createGame(services);
  // Test hook: dev server or the separate QA build only; never in the production bundle.
  const debugEnabled = (import.meta.env.DEV || import.meta.env.MODE === 'qa') && new URLSearchParams(location.search).get('debug') === '1';
  if (debugEnabled) {
    const { installDebug } = await import('./debug/installDebug.js');
    installDebug(game, services);
  }
}

bootstrap().catch((error) => {
  console.error(error);
  showLoadError();
});
