import { ASSET_URL, backgroundOrder, sceneKeys } from '../content/assetGroups.js';

const PARALLEL = 6;
const RETRY_MS = [500, 1500, 4000, 8000];

// Loads deferred art into Phaser's texture manager after the first screen is interactive.
// One request per image ever (de-duplicated), at most PARALLEL at a time; what a screen asks
// for jumps the queue. Nothing new starts while the host has the game paused. Images are
// decoded off the main thread (`img.decode()`) before they become textures.
export class AssetStreamer {
  constructor({ lifecycle = null, save = null } = {}) {
    this.save = save;
    this.textures = null;
    this.queue = [];
    this.pending = new Map(); // key → { promise, resolve, reject, attempts }
    this.active = 0;
    this.paused = false;
    this.missing = [];
    this.loadedCount = 0;
    lifecycle?.subscribe?.((state) => {
      this.paused = Boolean(state.paused);
      if (!this.paused) this.pump();
    });
  }

  attach(game) {
    this.textures = game.textures;
  }

  has(key) {
    return !ASSET_URL.has(key) || Boolean(this.textures?.exists(key));
  }

  // Resolves when every key is a texture. `urgent` puts them at the front of the queue.
  ensure(keys, { urgent = true } = {}) {
    const wanted = [...new Set(keys)].filter((key) => key && !this.has(key));
    if (!wanted.length) return Promise.resolve();
    const promises = wanted.map((key) => this.request(key, urgent));
    this.pump();
    return Promise.all(promises).then(() => undefined);
  }

  request(key, urgent) {
    let entry = this.pending.get(key);
    if (!entry) {
      entry = { attempts: 0 };
      entry.promise = new Promise((resolve, reject) => { entry.resolve = resolve; entry.reject = reject; });
      this.pending.set(key, entry);
      if (urgent) this.queue.unshift(key); else this.queue.push(key);
    } else if (urgent && !entry.loading) {
      const at = this.queue.indexOf(key);
      if (at > 0) { this.queue.splice(at, 1); this.queue.unshift(key); }
    }
    return entry.promise;
  }

  // Art a screen needs before it is started.
  ready(sceneKey, data = {}) {
    return this.ensure(sceneKeys(sceneKey, data, this.save?.state));
  }

  // After gameReady: everything else, most likely next screens first.
  startBackground() {
    for (const key of backgroundOrder(this.save?.state)) if (!this.has(key)) this.request(key, false);
    this.pump();
  }

  pump() {
    while (!this.paused && this.textures && this.active < PARALLEL && this.queue.length) {
      const key = this.queue.shift();
      const entry = this.pending.get(key);
      if (!entry || entry.loading) continue;
      if (this.textures.exists(key)) { this.finish(key, entry); continue; }
      this.load(key, entry);
    }
  }

  load(key, entry) {
    entry.loading = true;
    this.active += 1;
    const img = new Image();
    img.decoding = 'async';
    img.src = ASSET_URL.get(key);
    const done = () => { this.active -= 1; entry.loading = false; this.pump(); };
    (img.decode ? img.decode() : new Promise((res, rej) => { img.onload = res; img.onerror = rej; }))
      .then(() => {
        // Same filtering as the Boot loader (Phaser.Textures.FilterMode.LINEAR = 0).
        if (!this.textures.exists(key)) this.textures.addImage(key, img)?.setFilter(0);
        this.finish(key, entry);
        done();
      })
      .catch(() => {
        entry.attempts += 1;
        const delay = RETRY_MS[Math.min(entry.attempts - 1, RETRY_MS.length - 1)];
        // Keep trying (a flaky connection must not leave a screen without its art).
        setTimeout(() => { this.queue.unshift(key); this.pump(); }, delay);
        done();
      });
  }

  finish(key, entry) {
    this.pending.delete(key);
    this.loadedCount += 1;
    entry.resolve();
  }

  status() {
    const total = ASSET_URL.size;
    const loaded = [...ASSET_URL.keys()].filter((k) => this.textures?.exists(k)).length;
    return { total, loaded, queued: this.queue.length, active: this.active, paused: this.paused, missing: [...this.missing] };
  }

  // QA / dev only: record any manifest texture that is used before it was loaded.
  watchMissing(game) {
    const textures = game.textures;
    const get = textures.get.bind(textures);
    textures.get = (key) => {
      if (typeof key === 'string' && ASSET_URL.has(key) && !textures.exists(key)) this.reportMissing(key);
      return get(key);
    };
  }

  reportMissing(key) {
    if (this.missing.includes(key)) return;
    this.missing.push(key);
    console.error(`Texture used before it was loaded: ${key}`);
  }
}
