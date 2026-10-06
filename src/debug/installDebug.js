import { layoutReport } from './layoutReport.js';
import { appearanceTexture } from '../ui/appearanceTextures.js';

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
    // Rewarded-ad simulator outcome: interactive | earned | not-earned | error | unavailable.
    setAdMode: (mode) => services.platform.setRewardedMode?.(mode),
    // Staged UI state: opens the post-level reward flow for a level without replaying it.
    stageResult: (levelId, runId = `qa-${Date.now()}`) => { activeScene()?.scene.start('Result', { levelId, runId }); return runId; },
    // Staged playtime: adds active minutes as if played (QA only).
    addPlaytime: (ms) => { services.playtime.pendingMs += ms; services.playtime.emit(); return services.playtime.status(); },
    // Staged wallet (QA only): sets the coin balance through a normal save mutation.
    setCoins: (coins) => services.save.mutate((state) => { state.coins = coins; }),
    // Renders one composed character with the real compositor (QA contact sheets).
    renderAppearance: (equipped, pose = 'happy') => {
      const scene = activeScene();
      return scene.textures.getBase64(appearanceTexture(scene, `character-${pose}`, equipped));
    },
  });

  game.events.once('destroy', () => {
    clearInterval(timer);
    overlay.remove();
    delete window.__GAME_DEBUG__;
  });
}
