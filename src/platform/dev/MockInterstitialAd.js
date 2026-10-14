// Development-only interstitial simulator for DevPlatformAdapter (select with
// `?interstitial=<mode>` or `__GAME_DEBUG__.platform.setInterstitialMode(mode)`):
//   shown        – a TEST INTERSTITIAL overlay for 1.2 s, then request-completed (default)
//   completed    – request-completed at once (the real SDK gives no proof an ad was shown)
//   unavailable  – no fill
//   error        – the request failed
export const MOCK_INTERSTITIAL_MODES = Object.freeze(['shown', 'completed', 'unavailable', 'error']);

const SHOW_MS = 1200;

export class MockInterstitialAd {
  constructor(mode = 'shown') {
    this.setMode(mode);
    this.active = null;
  }

  setMode(mode) {
    this.mode = MOCK_INTERSTITIAL_MODES.includes(mode) ? mode : 'shown';
  }

  request() {
    if (this.active) return Promise.resolve({ status: 'error', reason: 'An ad is already showing.' });
    if (this.mode === 'unavailable') return Promise.resolve({ status: 'unavailable', reason: 'TEST: no fill' });
    if (this.mode === 'error') return Promise.resolve({ status: 'error', reason: 'TEST: request failed' });
    if (this.mode === 'completed' || typeof document === 'undefined') return Promise.resolve({ status: 'request-completed' });
    const root = document.createElement('div');
    root.id = 'mock-interstitial-ad';
    root.style.cssText = 'position:fixed;inset:0;z-index:200;display:flex;align-items:center;justify-content:center;background:rgba(30,18,40,.88);font:700 18px/1.4 system-ui,sans-serif;color:#fff;text-align:center;';
    root.innerHTML = '<div><div style="font-size:12px;letter-spacing:.12em;color:#9ad5ff">TEST AD · DEV MOCK</div><div style="margin-top:8px">Interstitial</div></div>';
    document.body.appendChild(root);
    this.active = new Promise((resolve) => setTimeout(() => {
      root.remove();
      this.active = null;
      resolve({ status: 'request-completed' });
    }, SHOW_MS));
    return this.active;
  }
}
