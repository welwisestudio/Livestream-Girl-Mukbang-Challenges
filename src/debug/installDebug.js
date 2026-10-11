import { layoutReport } from './layoutReport.js';
import { appearanceTexture } from '../ui/appearanceTextures.js';

// Dev/QA-only test hook (`?debug=1`). Not included in the production bundle.
export function installDebug(game, services) {
  const overlay = document.createElement('aside');
  overlay.id = 'debug-overlay';
  overlay.style.cssText = 'position:fixed;z-index:99;left:6px;bottom:6px;padding:4px 7px;border-radius:7px;background:rgba(40,20,30,.55);color:#fff;font:10px/1.3 monospace;pointer-events:none;';
  document.body.appendChild(overlay);

  const activeScene = () => game.scene.getScenes(true)[0];
  // Scenes report positions in layout units; on zoomed large monitors (viewport.zoom > 1)
  // tests click in CSS pixels, so positions and sizes are converted here, in one place.
  const zoom = () => game.registry.get('viewport')?.zoom ?? 1;
  const GEOMETRY = new Set(['x', 'y', 'w', 'h', 'width', 'height', 'top', 'bottom']);
  const toCss = (value, k) => {
    if (k === 1 || value === null || typeof value !== 'object') return value;
    if (Array.isArray(value)) return value.map((v) => toCss(v, k));
    return Object.fromEntries(Object.entries(value).map(([key, v]) => [key,
      typeof v === 'number' && (GEOMETRY.has(key) || /Radius$/.test(key)) ? v * k : toCss(v, k)]));
  };
  const snapshot = () => {
    const value = activeScene()?.getDebugSnapshot?.() ?? { scene: 'loading', targets: {} };
    const k = zoom();
    if (k === 1) return value;
    return { ...value, targets: toCss(value.targets, k), ...(value.viewport ? { viewport: toCss(value.viewport, k) } : {}) };
  };
  let qaTimeScale = 1;
  const applyQaTimeScale = () => {
    for (const scene of game.scene.getScenes(true)) {
      if (scene.time) scene.time.timeScale = qaTimeScale;
      if (scene.tweens) scene.tweens.timeScale = qaTimeScale;
    }
    if (game.anims) game.anims.globalTimeScale = qaTimeScale;
  };
  const timer = window.setInterval(() => {
    applyQaTimeScale();
    const value = snapshot();
    overlay.textContent = `TEST · ${value.scene}/${value.phase}${value.stepId ? ` · ${value.stepId}` : ''}`;
  }, 200);

  window.__GAME_DEBUG__ = Object.freeze({
    snapshot,
    layout: () => {
      if (!activeScene()) return null;
      const report = layoutReport(activeScene());
      const k = zoom();
      return k === 1 ? report : { ...toCss(report, k), minFont: report.minFont === null ? null : report.minFont * k };
    },
    designSize: () => { const vp = game.registry.get('viewport'); return { width: vp.width, height: vp.height }; },
    clearSave: () => services.platform.clearDevelopmentSave(),
    // Rewarded-ad simulator outcome: interactive | earned | not-earned | error | unavailable.
    setAdMode: (mode) => services.platform.setRewardedMode?.(mode),
    // QA-only animation clock multiplier. Input remains real; only scene timers/tweens run
    // faster so a genuine 50-level traversal can finish within CI limits.
    setTimeScale: (scale) => {
      qaTimeScale = Math.max(1, Math.min(12, Number(scale) || 1));
      applyQaTimeScale();
      return qaTimeScale;
    },
    timeScale: () => qaTimeScale,
    // Staged UI state: opens the post-level reward flow for a level without replaying it.
    stageResult: (levelId, runId = `qa-${Date.now()}`) => { activeScene()?.scene.start('Result', { levelId, runId }); return runId; },
    // Staged entry only: starts the real level scene so QA can exercise every interaction
    // without mutating campaign progress or pretending that a level was completed.
    stageLevel: (levelId, runId = `qa-level-${Date.now()}`) => { activeScene()?.scene.start('Level', { levelId, runId }); return runId; },
    // Layout QA: open a level and skip its cooking straight to the mukbang (no reward is granted).
    stageMukbang: (levelId) => {
      activeScene()?.scene.start('Level', { levelId, runId: `qa-mukbang-${Date.now()}` });
      window.setTimeout(() => game.scene.getScene('Level')?.finishCooking(), 400);
    },
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
