// Tracks the real game container size, device pixel ratio and safe-area insets.
// The game is rendered at native pixel density (canvas = CSS size × DPR) and every
// scene lays itself out in CSS pixels, so nothing is tied to one aspect ratio.

const MAX_DPR = 2;
export const VIEWPORT_EVENT = 'viewport-changed';

function readSafeArea(probe) {
  const style = getComputedStyle(probe);
  return {
    top: parseFloat(style.paddingTop) || 0,
    right: parseFloat(style.paddingRight) || 0,
    bottom: parseFloat(style.paddingBottom) || 0,
    left: parseFloat(style.paddingLeft) || 0,
  };
}

export function measureViewport(container, probe) {
  const rect = container.getBoundingClientRect();
  const width = Math.max(1, Math.round(rect.width));
  const height = Math.max(1, Math.round(rect.height));
  const dpr = Math.min(MAX_DPR, Math.max(1, window.devicePixelRatio || 1));
  return { width, height, dpr, safe: probe ? readSafeArea(probe) : { top: 0, right: 0, bottom: 0, left: 0 } };
}

export class ViewportController {
  constructor(container) {
    this.container = container;
    this.probe = document.createElement('div');
    this.probe.style.cssText = 'position:fixed;inset:0;visibility:hidden;pointer-events:none;'
      + 'padding:env(safe-area-inset-top) env(safe-area-inset-right) env(safe-area-inset-bottom) env(safe-area-inset-left);';
    document.body.appendChild(this.probe);
    this.current = measureViewport(container, this.probe);
    this.listeners = new Set();
    this.frame = 0;
    this.schedule = this.schedule.bind(this);
    window.addEventListener('resize', this.schedule);
    window.visualViewport?.addEventListener('resize', this.schedule);
    this.observer = typeof ResizeObserver === 'function' ? new ResizeObserver(this.schedule) : null;
    this.observer?.observe(container);
  }

  schedule() {
    if (this.frame) return;
    this.frame = requestAnimationFrame(() => {
      this.frame = 0;
      const next = measureViewport(this.container, this.probe);
      const prev = this.current;
      if (next.width === prev.width && next.height === prev.height && next.dpr === prev.dpr
        && JSON.stringify(next.safe) === JSON.stringify(prev.safe)) return;
      this.current = next;
      for (const listener of this.listeners) listener(next);
    });
  }

  subscribe(listener) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  dispose() {
    window.removeEventListener('resize', this.schedule);
    window.visualViewport?.removeEventListener('resize', this.schedule);
    this.observer?.disconnect();
    this.probe.remove();
    this.listeners.clear();
  }
}
