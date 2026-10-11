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

// Large monitors: layout runs in a space at most LAYOUT_HEIGHT tall (like browser zoom), so
// UI and art keep the same perceived size on a 1440p screen as on a laptop instead of
// shrinking against their CSS-pixel caps. Phones and windows up to 1000 px tall are unaffected.
const LAYOUT_HEIGHT = 1000;
const MAX_LAYOUT_ZOOM = 1.6;

export function layoutZoom(cssWidth, cssHeight) {
  if (cssHeight <= LAYOUT_HEIGHT || cssWidth < 1000) return 1;
  return Math.min(MAX_LAYOUT_ZOOM, cssHeight / LAYOUT_HEIGHT);
}

// width/height: layout units used by every scene. dpr: layout unit → backing-store pixels
// (device pixel ratio × layout zoom; cameras zoom by it). cssWidth/cssHeight/deviceDpr size the canvas.
export function measureViewport(container, probe) {
  const rect = container.getBoundingClientRect();
  const cssWidth = Math.max(1, Math.round(rect.width));
  const cssHeight = Math.max(1, Math.round(rect.height));
  const deviceDpr = Math.min(MAX_DPR, Math.max(1, window.devicePixelRatio || 1));
  const zoom = layoutZoom(cssWidth, cssHeight);
  const css = probe ? readSafeArea(probe) : { top: 0, right: 0, bottom: 0, left: 0 };
  const safe = Object.fromEntries(Object.entries(css).map(([k, v]) => [k, v / zoom]));
  return { width: cssWidth / zoom, height: cssHeight / zoom, dpr: deviceDpr * zoom, zoom, cssWidth, cssHeight, deviceDpr, safe };
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
      if (next.cssWidth === prev.cssWidth && next.cssHeight === prev.cssHeight && next.dpr === prev.dpr
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
