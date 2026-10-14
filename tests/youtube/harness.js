// Harness for the YouTube Playables integration suite.
//
// - A fake SDK is served at the real SDK URL. Like the real one it is a global *lexical*
//   binding (`const ytgame`), not a window property. Its shape follows the official reference
//   (game.firstFrameReady/gameReady/loadData/saveData, system.isAudioEnabled/onAudioEnabledChange/
//   onPause/onResume/getLanguage, ads.requestRewardedAd/requestInterstitialAd, health.*).
//   Test controls live on window.__yt (pause, resume, mute, load/save/ad outcomes, call log).
// - index.html is served with the CSP from the official Playables test-suite guide.
// - Browser storage is made unavailable and every attempt is counted; registrations of
//   page-lifecycle listeners (visibilitychange, blur, focus, pagehide…) are recorded.
export const SDK_URL = 'https://www.youtube.com/game_api/v1';

// https://developers.google.com/youtube/gaming/playables/reference/test_suite_guide (2026-10-14)
export const PLAYABLES_CSP = [
  "default-src 'none'",
  "script-src 'report-sample' 'self' 'unsafe-eval' 'unsafe-inline' blob: https://www.youtube.com/game_api/v0 https://www.youtube.com/game_api/v0/ https://www.youtube.com/game_api/v1 https://www.youtube.com/game_api/v1/",
  "object-src 'none'",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "img-src 'self' blob: data:",
  "media-src 'self' blob:",
  "font-src 'self' data: https://fonts.googleapis.com https://fonts.gstatic.com",
  "connect-src 'self' blob: data:",
  'sandbox allow-pointer-lock allow-same-origin allow-scripts',
  "base-uri 'self'",
  "manifest-src 'self'",
  "worker-src 'self' blob:",
].join('; ');

export function fakeSdkSource({ data = '', audio = true, load = 'ok', rewarded = 'true', interstitial = 'ok', inEnv = true } = {}) {
  return `
const ytgame = (() => {
  const s = { calls: [], data: ${JSON.stringify(data)}, audio: ${JSON.stringify(audio)}, load: ${JSON.stringify(load)},
    save: 'ok', rewarded: ${JSON.stringify(rewarded)}, interstitial: ${JSON.stringify(interstitial)},
    cbs: { pause: [], resume: [], audio: [] }, loaderAtGameReady: null, pendingAd: null };
  const err = (type) => Object.assign(new Error('fake ' + type), { name: 'SdkError', errorType: type });
  const log = (c) => s.calls.push(c);
  window.__yt = {
    state: s,
    calls: () => s.calls.slice(),
    pause: () => { log('event:pause'); s.cbs.pause.forEach((f) => f()); },
    resume: () => { log('event:resume'); s.cbs.resume.forEach((f) => f()); },
    setAudio: (v) => { s.audio = v; log('event:audio:' + v); s.cbs.audio.forEach((f) => f(v)); },
    set: (patch) => Object.assign(s, patch),
    finishAd: (v) => { const p = s.pendingAd; s.pendingAd = null; if (p) (v === 'reject' ? p.reject(err('UNKNOWN')) : p.resolve(v)); },
  };
  return {
    IN_PLAYABLES_ENV: ${JSON.stringify(inEnv)},
    SDK_VERSION: 'fake-test-1',
    SdkErrorType: { API_UNAVAILABLE: 'API_UNAVAILABLE', INVALID_PARAMS: 'INVALID_PARAMS', SIZE_LIMIT_EXCEEDED: 'SIZE_LIMIT_EXCEEDED', UNKNOWN: 'UNKNOWN' },
    game: {
      firstFrameReady() { log('firstFrameReady'); },
      gameReady() { log('gameReady'); s.gameReadyAt = performance.now(); s.loaderAtGameReady = Boolean(document.getElementById('loader')); },
      loadData() {
        log('loadData');
        if (s.load === 'reject') return Promise.reject(err('API_UNAVAILABLE'));
        if (s.load === 'hang') return new Promise(() => {});
        return Promise.resolve(s.data);
      },
      saveData(d) {
        log('saveData');
        if (!s.calls.includes('loadData')) return Promise.reject(err('UNKNOWN'));
        if (s.save === 'reject') return Promise.reject(err('API_UNAVAILABLE'));
        s.data = d;
        return Promise.resolve();
      },
    },
    system: {
      isAudioEnabled() { return s.audio; },
      onAudioEnabledChange(f) { s.cbs.audio.push(f); return () => {}; },
      onPause(f) { s.cbs.pause.push(f); return () => {}; },
      onResume(f) { s.cbs.resume.push(f); return () => {}; },
      getLanguage() { log('getLanguage'); return Promise.resolve('en-US'); },
    },
    ads: {
      requestRewardedAd(id) {
        log('rewarded:' + id);
        if (s.rewarded === 'true') return Promise.resolve(true);
        if (s.rewarded === 'false') return Promise.resolve(false);
        if (s.rewarded === 'unavailable') return Promise.reject(err('API_UNAVAILABLE'));
        if (s.rewarded === 'manual') return new Promise((resolve, reject) => { s.pendingAd = { resolve, reject }; });
        return Promise.reject(err('UNKNOWN'));
      },
      requestInterstitialAd() { log('interstitial'); return s.interstitial === 'ok' ? Promise.resolve() : Promise.reject(err('API_UNAVAILABLE')); },
    },
    engagement: { sendScore() { log('sendScore'); return Promise.resolve(); }, openYTContent() { log('openYTContent'); return Promise.resolve(); } },
    health: { logError() { log('logError'); }, logWarning() { log('logWarning'); } },
  };
})();
`;
}

// Runs before any page script (Playwright init scripts are not subject to the page CSP).
function initProbe(blockStorage) {
  const probe = { storage: [], listeners: [], handlers: [], csp: [] };
  window.__probe = probe;
  for (const name of blockStorage ? ['localStorage', 'sessionStorage', 'indexedDB'] : []) {
    try {
      Object.defineProperty(window, name, { configurable: true, get() { probe.storage.push(name); throw new DOMException(`${name} is unavailable`, 'SecurityError'); } });
    } catch { /* ignore */ }
  }
  const watched = new Set(['visibilitychange', 'webkitvisibilitychange', 'pagehide', 'pageshow', 'freeze', 'resume', 'blur', 'focus']);
  const add = EventTarget.prototype.addEventListener;
  EventTarget.prototype.addEventListener = function patched(type, ...rest) {
    if (watched.has(type) && (this === window || this === document)) probe.listeners.push(`${this === window ? 'window' : 'document'}:${type}`);
    return add.call(this, type, ...rest);
  };
  for (const prop of ['onblur', 'onfocus', 'onvisibilitychange', 'onpagehide']) {
    try {
      let value = null;
      Object.defineProperty(window, prop, { configurable: true, get: () => value, set: (v) => { probe.handlers.push(prop); value = v; } });
    } catch { /* ignore */ }
  }
  add.call(document, 'securitypolicyviolation', (e) => probe.csp.push(`${e.violatedDirective} ${e.blockedURI}`));
}

// Prepares a page: fake SDK (fresh options per launch), CSP on index.html, probes.
export async function preparePage(page, options = {}) {
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  const external = [];
  page.on('request', (r) => {
    const url = new URL(r.url());
    if (!['127.0.0.1', 'localhost'].includes(url.hostname) && r.url() !== SDK_URL && !r.url().startsWith('data:') && !r.url().startsWith('blob:')) external.push(r.url());
  });
  let sdkOptions = options;
  await page.route(SDK_URL, (route) => route.fulfill({ status: 200, contentType: 'text/javascript', body: fakeSdkSource(sdkOptions) }));
  await page.route((url) => url.port !== '' && (url.pathname === '/' || url.pathname.endsWith('/index.html')), async (route) => {
    const response = await route.fetch();
    await route.fulfill({ response, headers: { ...response.headers(), 'content-security-policy': PLAYABLES_CSP } });
  });
  await page.addInitScript(initProbe, options.blockStorage ?? true);
  return {
    page,
    errors,
    external,
    setSdk: (next) => { sdkOptions = next; },
    probe: () => page.evaluate(() => window.__probe),
    calls: () => page.evaluate(() => window.__yt?.calls() ?? []),
    cloud: () => page.evaluate(() => window.__yt?.state.data ?? null),
    yt: (method, ...args) => page.evaluate(([m, a]) => window.__yt[m](...a), [method, args]),
  };
}

export const RELEASE = 'http://127.0.0.1:4175/';
export const QA = 'http://127.0.0.1:4176/';
