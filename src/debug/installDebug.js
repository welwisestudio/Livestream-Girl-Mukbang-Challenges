export function installDebug(game, services) {
  const overlay = document.createElement('aside');
  overlay.id = 'debug-overlay';
  overlay.style.cssText = 'position:fixed;z-index:99;left:8px;bottom:8px;padding:7px 9px;border:1px solid #6d5365;border-radius:9px;background:rgba(255,250,244,.92);color:#5e4658;font:11px/1.35 monospace;pointer-events:auto;max-width:260px';
  const label = document.createElement('span');
  const restart = document.createElement('button');
  restart.textContent = 'Restart screen';
  restart.style.marginLeft = '8px';
  restart.onclick = () => {
    const scene = game.scene.getScenes(true)[0];
    scene?.scene.restart(scene.scene.settings.data);
  };
  const clear = document.createElement('button');
  clear.textContent = 'Clear save';
  clear.style.marginLeft = '5px';
  clear.onclick = () => { services.platform.clearDevelopmentSave(); location.reload(); };
  overlay.append(label, restart, clear);
  document.body.appendChild(overlay);

  const snapshot = () => game.scene.getScenes(true)[0]?.getDebugSnapshot?.() ?? { scene: 'loading', targets: {} };
  const timer = window.setInterval(() => {
    const value = snapshot();
    label.textContent = `TEST MODE · ${value.scene}/${value.phase}${value.stepId ? ` · ${value.stepId}` : ''}`;
  }, 100);

  window.__GAME_DEBUG__ = Object.freeze({
    snapshot,
    designSize: () => ({ width: game.config.width, height: game.config.height }),
  });

  game.events.once('destroy', () => {
    clearInterval(timer);
    overlay.remove();
    delete window.__GAME_DEBUG__;
  });
}
