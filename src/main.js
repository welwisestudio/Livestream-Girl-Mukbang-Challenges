import './styles.css';
import { createServices } from './app/createServices.js';
import { createGame } from './app/createGame.js';

async function bootstrap() {
  const services = await createServices();
  const game = createGame(services);
  const debugEnabled = import.meta.env.DEV && new URLSearchParams(location.search).get('debug') === '1';
  if (debugEnabled) {
    const { installDebug } = await import('./debug/installDebug.js');
    installDebug(game, services);
  }
}

bootstrap().catch((error) => {
  console.error(error);
  document.querySelector('#game-container').textContent = 'Unable to start the game. Please reload.';
});
