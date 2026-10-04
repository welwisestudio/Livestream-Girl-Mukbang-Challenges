import { layoutReport } from './layoutReport.js';

// Dev/QA-only test hook (`?debug=1`). Not included in the production bundle.
export function installDebug(game, services) {
  const overlay = document.createElement('aside');
  overlay.id = 'debug-overlay';
  overlay.style.cssText = 'position:fixed;z-index:99;left:6px;bottom:6px;padding:4px 7px;border-radius:7px;background:rgba(40,20,30,.55);color:#fff;font:10px/1.3 monospace;pointer-events:none;';
  document.body.appendChild(overlay);

  const activeScene = () => game.scene.getScenes(true)[0];
  const snapshot = () => activeScene()?.getDebugSnapshot?.() ?? { scene: 'loading', targets: {} };
  const timer = window.setInterval(() => {
    const value = snapshot();
    overlay.textContent = `TEST · ${value.scene}/${value.phase}${value.stepId ? ` · ${value.stepId}` : ''}`;
  }, 200);

  window.__GAME_DEBUG__ = Object.freeze({
    snapshot,
    layout: () => (activeScene() ? layoutReport(activeScene()) : null),
    designSize: () => { const vp = game.registry.get('viewport'); return { width: vp.width, height: vp.height }; },
    clearSave: () => services.platform.clearDevelopmentSave(),
  });

  game.events.once('destroy', () => {
    clearInterval(timer);
    overlay.remove();
    delete window.__GAME_DEBUG__;
  });
}
