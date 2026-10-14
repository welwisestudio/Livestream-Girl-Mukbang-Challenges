// Replaceable platform contract (platform/SDK-CONTRACT.md). Game services only use these
// methods; just the concrete adapters know a host SDK. Results keep the meaning of the
// host's own signal (e.g. an interstitial reports a completed request, never a shown ad).
//
//   init()                      → { capabilities, audioMuted, paused, profile, testMode }
//   firstFrameReady()           once, while the loading screen is on screen
//   gameReady()                 once, when the first screen is interactive
//   loadData()                  → Promise<string>; rejects on failure (never "empty" on error)
//   saveData(serialized)        → Promise; rejects on failure
//   requestRewarded(placement)  → { status: 'earned' | 'not-earned' | 'unavailable' | 'error' }
//   requestInterstitial()       → { status: 'request-completed' | 'unavailable' | 'error' }
//   sendScore(value)            → Promise (only when capabilities.score)
//   subscribe(listener)         → unsubscribe; listener({ paused, audioMuted }) now and on change
//   reportWarning / reportError best effort diagnostics
export class PlatformAdapter {
  constructor() {
    this.hostState = { paused: false, audioMuted: false };
    this.listeners = new Set();
    this.resumeWaiters = [];
    this.firstFrameSent = false;
    this.gameReadySent = false;
  }

  async init() { throw new Error('PlatformAdapter.init not implemented'); }
  async loadData() { throw new Error('PlatformAdapter.loadData not implemented'); }
  async saveData() { throw new Error('PlatformAdapter.saveData not implemented'); }
  async requestRewarded() { return { status: 'unavailable' }; }
  async requestInterstitial() { return { status: 'unavailable' }; }
  async sendScore() { throw new Error('Score is not supported by this platform'); }
  getLanguage() { return Promise.resolve('en'); }
  reportWarning() {}
  reportError() {}

  // Both notifications are sent at most once per page, in this order.
  firstFrameReady() {
    if (this.firstFrameSent) return false;
    this.firstFrameSent = true;
    this.notifyFirstFrame();
    return true;
  }

  gameReady() {
    if (this.gameReadySent) return false;
    if (!this.firstFrameSent) this.firstFrameReady();
    this.gameReadySent = true;
    this.notifyGameReady();
    return true;
  }

  notifyFirstFrame() {}
  notifyGameReady() {}

  subscribe(listener) {
    this.listeners.add(listener);
    listener({ ...this.hostState });
    return () => this.listeners.delete(listener);
  }

  // Adapters report host lifecycle here; listeners get a fresh snapshot on every change.
  setHostState(patch) {
    const next = { ...this.hostState, ...patch };
    if (next.paused === this.hostState.paused && next.audioMuted === this.hostState.audioMuted) return;
    this.hostState = next;
    for (const listener of [...this.listeners]) listener({ ...next });
    if (!next.paused) for (const resolve of this.resumeWaiters.splice(0)) resolve();
  }

  // Resolves at once when not paused; otherwise when the host resumes (an ad result that
  // arrives during a host pause is applied only after the game runs again).
  whenResumed() {
    if (!this.hostState.paused) return Promise.resolve();
    return new Promise((resolve) => this.resumeWaiters.push(resolve));
  }

  dispose() {
    this.listeners.clear();
  }
}
