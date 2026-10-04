export class PlatformAdapter {
  async init() { throw new Error('PlatformAdapter.init not implemented'); }
  async loadData() { throw new Error('PlatformAdapter.loadData not implemented'); }
  async saveData() { throw new Error('PlatformAdapter.saveData not implemented'); }
  async requestRewarded() { return { status: 'unavailable' }; }
  async firstFrameReady() {}
  async gameReady() {}
  getLanguage() { return Promise.resolve('en'); }
  subscribe() { return () => {}; }
  dispose() {}
}
