// Development-only rewarded-ad simulator for DevPlatformAdapter. It is never used by a
// real platform adapter, and a real SDK failure must never fall back to it.
//
// Modes (select with `?ad=<mode>` or `__GAME_DEBUG__.setAdMode(mode)`):
//   interactive  – TEST AD overlay; "Finish ad" → earned, "Close ad" → not-earned (default)
//   earned       – resolves earned after a short simulated ad
//   not-earned   – resolves not-earned (player closed the ad early)
//   error        – resolves error
//   unavailable  – resolves unavailable (no fill)
export const MOCK_AD_MODES = Object.freeze(['interactive', 'earned', 'not-earned', 'error', 'unavailable']);

const AUTO_DELAY_MS = 450;
const WATCH_SECONDS = 3;

function overlay(placementId, { interactive }) {
  const root = document.createElement('div');
  root.id = 'mock-rewarded-ad';
  root.style.cssText = 'position:fixed;inset:0;z-index:200;display:flex;align-items:center;justify-content:center;background:rgba(30,18,40,.82);font:600 16px/1.35 system-ui,sans-serif;color:#fff;';
  root.innerHTML = `
    <div style="width:min(86vw,340px);padding:22px 20px;border-radius:18px;background:#2b1d35;border:2px dashed #ff9ad5;text-align:center">
      <div style="font-size:12px;letter-spacing:.12em;color:#ff9ad5">TEST AD · DEV MOCK</div>
      <div style="margin:10px 0 4px;font-size:20px">Rewarded video</div>
      <div style="font-size:12px;opacity:.7">${placementId}</div>
      <div data-status style="margin:14px 0;font-size:15px">${interactive ? `Watching… ${WATCH_SECONDS}` : 'Simulated ad…'}</div>
      ${interactive ? `
      <button data-finish disabled style="width:100%;padding:12px;border:0;border-radius:12px;background:#5cc56c;color:#fff;font:700 16px system-ui;opacity:.5">Finish ad (reward)</button>
      <button data-close style="width:100%;margin-top:10px;padding:10px;border:0;border-radius:12px;background:#6b5577;color:#fff;font:600 14px system-ui">Close ad (no reward)</button>` : ''}
    </div>`;
  document.body.appendChild(root);
  return root;
}

export class MockRewardedAd {
  constructor(mode = 'interactive') {
    this.setMode(mode);
    this.active = null;
  }

  setMode(mode) {
    this.mode = MOCK_AD_MODES.includes(mode) ? mode : 'interactive';
  }

  // Resolves { status: 'earned' | 'not-earned' | 'unavailable' | 'error' }.
  request(placementId) {
    if (this.active) return Promise.resolve({ status: 'error', reason: 'An ad is already showing.' });
    if (this.mode === 'unavailable') return Promise.resolve({ status: 'unavailable', reason: 'TEST: no fill' });
    const interactive = this.mode === 'interactive';
    const root = typeof document !== 'undefined' ? overlay(placementId, { interactive }) : null;
    this.active = new Promise((resolve) => {
      const finish = (result) => {
        clearInterval(timer);
        root?.remove();
        this.active = null;
        resolve(result);
      };
      let timer = null;
      if (!interactive) {
        const status = this.mode === 'earned' ? 'earned' : this.mode;
        timer = setTimeout(() => finish({ status, reason: status === 'earned' ? undefined : `TEST: ${status}` }), AUTO_DELAY_MS);
        return;
      }
      let left = WATCH_SECONDS;
      const statusEl = root.querySelector('[data-status]');
      const finishBtn = root.querySelector('[data-finish]');
      timer = setInterval(() => {
        left -= 1;
        statusEl.textContent = left > 0 ? `Watching… ${left}` : 'Ad finished';
        if (left <= 0) {
          clearInterval(timer);
          finishBtn.disabled = false;
          finishBtn.style.opacity = '1';
        }
      }, 1000);
      finishBtn.addEventListener('click', () => finish({ status: 'earned' }));
      root.querySelector('[data-close]').addEventListener('click', () => finish({ status: 'not-earned', reason: 'Closed before the end' }));
    });
    return this.active;
  }
}
