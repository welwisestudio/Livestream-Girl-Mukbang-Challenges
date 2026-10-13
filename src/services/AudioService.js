import { AUDIO_PATH, BUS_GAIN, MUSIC, SFX, SOUND_FILES } from '../content/audio.js';

// The one audio manager of the game (Phaser audio is off: `audio.noAudio`). One Web Audio context
// with three buses — music, ui, sfx — under a master gain. Scenes never create players; they call
// `playSfx(id)` for one-shots and `sustain(id)` / `startLoop(id)` / `stopLoop(id)` for held sounds.
//
//   may sound = player setting AND NOT platform mute AND NOT (platform | ad | visibility | menu pause)
//
// Files arrive as ArrayBuffers (SFX from the Boot loader, music fetched in the background) and are
// decoded on an OfflineAudioContext, so nothing waits for the first tap. The live context is made
// on the first user gesture (browser autoplay rule). The music is one looping buffer source: it is
// never restarted by scene changes, and after a pause / mute / toggle it resumes where it stopped.
// Pause and mute stop every effect and loop at once; nothing is queued for after resume.

const clamp01 = (v, fallback = 1) => (Number.isFinite(v) ? Math.min(1, Math.max(0, v)) : fallback);
const now = () => (typeof performance !== 'undefined' ? performance.now() : Date.now());
const pickRate = (rate) => (Array.isArray(rate) ? rate[0] + Math.random() * (rate[1] - rate[0]) : rate ?? 1);

export class AudioService {
  constructor(save, { fetcher } = {}) {
    this.save = save;
    const preferences = save?.snapshot?.().audio ?? {};
    this.musicEnabled = preferences.music !== false;
    this.sfxEnabled = preferences.sfx !== false;
    this.musicVolume = clamp01(preferences.musicVolume);
    this.sfxVolume = clamp01(preferences.sfxVolume);
    this.platformMuted = false;
    this.pauseReasons = new Set();
    this.fetcher = fetcher ?? (typeof fetch === 'function' ? fetch.bind(globalThis) : null);
    this.context = null;
    this.bus = null;
    this.buffers = new Map();
    this.decoding = new Map();
    this.music = null; // { source, gain }
    this.musicOffset = 0;
    this.musicStartedAt = 0;
    this.voices = new Map(); // id → [{ source, gain }]
    this.lastPlayed = new Map(); // id → ms
    this.lastSlice = new Map();
    this.loops = new Map(); // key → { id, source, gain, timer }
    this.log = [];
    this.counts = {}; // id → times played (QA)
    this.missing = [];
    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', () => this.setPaused('visibility', document.visibilityState !== 'visible'));
      // Any first gesture unlocks audio (touchend/keydown cover browsers that ignore pointerdown).
      const unlock = () => this.unlock();
      for (const type of ['pointerdown', 'pointerup', 'touchend', 'keydown']) document.addEventListener(type, unlock, { capture: true, passive: true });
    }
  }

  // ------------------------------------------------------------------ loading
  // `sources`: { fileKey: ArrayBuffer } from the Boot loader.
  registerSources(sources) {
    for (const [key, data] of Object.entries(sources ?? {})) {
      if (data instanceof ArrayBuffer) this.decode(key, data);
      else this.reportMissing(key);
    }
  }

  async loadMusic() {
    if (this.buffers.has(MUSIC.file) || this.decoding.has(MUSIC.file) || !this.fetcher) return;
    const url = `${AUDIO_PATH}${MUSIC.file}.ogg`;
    try {
      const response = await this.fetcher(url);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      await this.decode(MUSIC.file, await response.arrayBuffer());
    } catch (error) {
      this.reportMissing(MUSIC.file, error);
    }
  }

  decode(key, data) {
    if (this.decoding.has(key)) return this.decoding.get(key);
    const Offline = typeof window !== 'undefined' ? (window.OfflineAudioContext || window.webkitOfflineAudioContext) : null;
    if (!Offline) return Promise.resolve(null);
    const job = new Offline(2, 1, 44100).decodeAudioData(data)
      .then((buffer) => {
        this.buffers.set(key, buffer);
        if (key === MUSIC.file) this.syncMusic();
        return buffer;
      })
      .catch((error) => { this.reportMissing(key, error); return null; });
    this.decoding.set(key, job);
    return job;
  }

  reportMissing(key, error) {
    if (!this.missing.includes(key)) this.missing.push(key);
    console.error(`Audio file could not be loaded: ${key}`, error ?? '');
  }

  // ------------------------------------------------------------------ context
  async unlock() {
    if (typeof window === 'undefined') return false;
    const Context = window.AudioContext || window.webkitAudioContext;
    if (!Context) return false;
    try {
      if (!this.context) this.createContext(Context);
      if (this.context.state === 'suspended' && this.canPlay) await this.context.resume();
      this.syncMusic();
      return this.context.state === 'running';
    } catch (error) {
      console.warn('Audio could not start', error);
      return false;
    }
  }

  createContext(Context) {
    const ctx = new Context();
    const master = ctx.createGain();
    // Gentle limiter: several effects over the music never clip.
    const limiter = ctx.createDynamicsCompressor?.();
    if (limiter) {
      limiter.threshold.value = -4; limiter.knee.value = 6; limiter.ratio.value = 10;
      limiter.attack.value = 0.003; limiter.release.value = 0.2;
      master.connect(limiter).connect(ctx.destination);
    } else {
      master.connect(ctx.destination);
    }
    const bus = { master };
    for (const name of ['music', 'ui', 'sfx']) {
      bus[name] = ctx.createGain();
      bus[name].connect(master);
    }
    this.context = ctx;
    this.bus = bus;
    this.applyVolumes();
    ctx.addEventListener?.('statechange', () => this.syncMusic());
  }

  get running() { return this.context?.state === 'running'; }

  applyVolumes() {
    if (!this.bus) return;
    const t = this.context.currentTime;
    this.bus.music.gain.setTargetAtTime(this.musicVolume, t, 0.05);
    this.bus.ui.gain.setTargetAtTime(this.sfxVolume * BUS_GAIN.ui, t, 0.02);
    this.bus.sfx.gain.setTargetAtTime(this.sfxVolume * BUS_GAIN.sfx, t, 0.02);
  }

  // ------------------------------------------------------------------ settings
  persist() {
    if (!this.save?.loaded) return;
    this.save.mutate((state) => {
      state.audio = { music: this.musicEnabled, sfx: this.sfxEnabled, musicVolume: this.musicVolume, sfxVolume: this.sfxVolume };
    }).catch((error) => console.error('Could not save audio settings', error));
  }

  setMusicEnabled(value) {
    this.musicEnabled = Boolean(value);
    this.persist();
    this.syncMusic();
  }

  setSfxEnabled(value) {
    this.sfxEnabled = Boolean(value);
    this.persist();
    if (!this.sfxEnabled) this.stopAllSfx();
  }

  setMusicVolume(value) {
    this.musicVolume = clamp01(value, this.musicVolume);
    this.persist();
    this.applyVolumes();
  }

  setSfxVolume(value) {
    this.sfxVolume = clamp01(value, this.sfxVolume);
    this.persist();
    this.applyVolumes();
  }

  setUserMuted(value) {
    const enabled = !value;
    this.musicEnabled = enabled;
    this.sfxEnabled = enabled;
    this.persist();
    this.syncState();
  }

  setPlatformMuted(value) {
    this.platformMuted = Boolean(value);
    this.syncState();
  }

  setPaused(reason, value) {
    if (value) this.pauseReasons.add(reason);
    else this.pauseReasons.delete(reason);
    this.syncState();
  }

  get canPlay() { return !this.platformMuted && this.pauseReasons.size === 0; }
  get canPlayMusic() { return this.canPlay && this.musicEnabled; }
  get canPlaySfx() { return this.canPlay && this.sfxEnabled; }

  // Pause / mute: stop effects first, park the music position, then suspend the context.
  syncState() {
    if (!this.canPlaySfx) this.stopAllSfx();
    this.syncMusic();
    if (!this.context) return;
    if (!this.canPlay && this.context.state === 'running') this.context.suspend().catch(() => {});
    else if (this.canPlay && this.context.state === 'suspended') {
      const resuming = this.context.resume().catch(() => {});
      this.resuming = resuming;
      resuming.then(() => { if (this.resuming === resuming) this.resuming = null; });
    }
  }

  snapshot() {
    return {
      music: this.musicEnabled, sfx: this.sfxEnabled, platformMuted: this.platformMuted, paused: this.pauseReasons.size > 0,
    };
  }

  // Extra state for QA (debug hooks only).
  debugSnapshot() {
    return {
      ...this.snapshot(),
      musicVolume: this.musicVolume, sfxVolume: this.sfxVolume,
      context: this.context?.state ?? 'none', pauseReasons: [...this.pauseReasons],
      musicLoaded: this.buffers.has(MUSIC.file), musicPlaying: Boolean(this.music), musicInstances: this.music ? 1 : 0,
      musicPosition: this.musicPosition(),
      decoded: [...this.buffers.keys()].filter((k) => k !== MUSIC.file).length, expected: SOUND_FILES.length,
      missing: [...this.missing],
      loops: [...this.loops.keys()],
      voices: [...this.voices.values()].reduce((n, list) => n + list.length, 0),
      counts: { ...this.counts },
      log: this.log.slice(-60),
    };
  }

  // ------------------------------------------------------------------ music
  musicPosition() {
    const buffer = this.buffers.get(MUSIC.file);
    if (!buffer) return 0;
    if (!this.music) return this.musicOffset;
    return (this.context.currentTime - this.musicStartedAt) % buffer.duration;
  }

  syncMusic() {
    const buffer = this.buffers.get(MUSIC.file);
    const shouldPlay = Boolean(buffer) && this.running && this.canPlayMusic;
    if (shouldPlay && !this.music) {
      const ctx = this.context;
      const source = ctx.createBufferSource();
      source.buffer = buffer;
      source.loop = true;
      source.loopStart = 0;
      source.loopEnd = buffer.duration;
      const gain = ctx.createGain();
      const t = ctx.currentTime;
      gain.gain.setValueAtTime(0, t);
      gain.gain.linearRampToValueAtTime(MUSIC.volume, t + MUSIC.fadeInMs / 1000);
      source.connect(gain).connect(this.bus.music);
      const offset = this.musicOffset % buffer.duration;
      source.start(t, offset);
      this.musicStartedAt = t - offset;
      this.music = { source, gain };
      this.record('music:start');
    } else if (!shouldPlay && this.music) {
      this.musicOffset = this.musicPosition();
      const { source, gain } = this.music;
      this.music = null;
      if (this.context.state === 'running') {
        const t = this.context.currentTime;
        gain.gain.cancelScheduledValues(t);
        gain.gain.setValueAtTime(gain.gain.value, t);
        gain.gain.linearRampToValueAtTime(0, t + 0.12);
        try { source.stop(t + 0.13); } catch { /* already stopped */ }
      } else {
        try { source.stop(); } catch { /* already stopped */ }
      }
      this.record('music:stop');
    }
  }

  // ------------------------------------------------------------------ effects
  record(id) {
    this.counts[id] = (this.counts[id] ?? 0) + 1;
    this.log.push({ id, t: Math.round(now()) });
    if (this.log.length > 120) this.log.splice(0, this.log.length - 120);
  }

  ready(id) {
    const def = SFX[id];
    if (!def) {
      if (!this.missing.includes(`sfx:${id}`)) { this.missing.push(`sfx:${id}`); console.error(`Unknown sound id: ${id}`); }
      return null;
    }
    if (!this.canPlaySfx || !this.running) return null;
    const buffer = this.buffers.get(def.file);
    return buffer ? { def, buffer } : null;
  }

  playSfx(id = 'tap') {
    // Right after an ad / pause ends the context is still resuming: a sound asked for in that
    // moment (the reward chime) plays once it is running, if that happens within 400 ms.
    // Sounds asked for while paused are dropped, never queued.
    if (this.resuming && this.canPlaySfx && !this.running) {
      const asked = now();
      this.resuming.then(() => { if (now() - asked < 400) this.playSfx(id); });
      return true;
    }
    const ready = this.ready(id);
    if (!ready) return false;
    const { def, buffer } = ready;
    const stamp = now();
    if (stamp - (this.lastPlayed.get(id) ?? -1e9) < (def.gap ?? 50)) return false;
    this.lastPlayed.set(id, stamp);

    const list = this.voices.get(id) ?? [];
    while (list.length >= (def.voices ?? 2)) this.stopVoice(list.shift(), 0.03);

    const slices = def.slices ?? [[0, buffer.duration]];
    let index = Math.floor(Math.random() * slices.length);
    if (slices.length > 1 && index === this.lastSlice.get(id)) index = (index + 1) % slices.length;
    this.lastSlice.set(id, index);
    const [start, length] = slices[index];
    const duration = Math.min(length, buffer.duration - start);
    const rate = pickRate(def.rate);
    const playTime = duration / rate;

    const ctx = this.context;
    const t = ctx.currentTime;
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.playbackRate.value = rate;
    const gain = ctx.createGain();
    const fade = Math.min(0.04, playTime * 0.25);
    gain.gain.setValueAtTime(0, t);
    gain.gain.linearRampToValueAtTime(def.volume, t + 0.004);
    gain.gain.setValueAtTime(def.volume, t + playTime - fade);
    gain.gain.linearRampToValueAtTime(0, t + playTime);
    source.connect(gain).connect(this.bus[def.bus] ?? this.bus.sfx);
    source.start(t, start, duration);
    const voice = { source, gain };
    list.push(voice);
    this.voices.set(id, list);
    source.addEventListener?.('ended', () => {
      const i = list.indexOf(voice);
      if (i >= 0) list.splice(i, 1);
    });
    this.record(id);
    return true;
  }

  stopVoice(voice, fade = 0.06) {
    if (!voice || !this.context) return;
    const t = this.context.currentTime;
    try {
      voice.gain.gain.cancelScheduledValues(t);
      voice.gain.gain.setValueAtTime(voice.gain.gain.value, t);
      voice.gain.gain.linearRampToValueAtTime(0, t + fade);
      voice.source.stop(t + fade + 0.01);
    } catch { /* already stopped */ }
  }

  // Held sound: starts the loop if needed and keeps it alive for `holdMs`; when the calls stop
  // (finger stops stirring / drawing), it fades out on its own.
  sustain(id, holdMs = 220, key = id) {
    if (!this.startLoop(id, key) && !this.loops.has(key)) return false;
    const loop = this.loops.get(key);
    clearTimeout(loop.timer);
    loop.timer = setTimeout(() => this.stopLoop(key), holdMs);
    return true;
  }

  startLoop(id, key = id) {
    if (this.loops.has(key)) return false;
    const ready = this.ready(id);
    if (!ready || !ready.def.loop) return false;
    const { def, buffer } = ready;
    const [start, end] = def.loop;
    const ctx = this.context;
    const t = ctx.currentTime;
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.loop = true;
    source.loopStart = start;
    source.loopEnd = Math.min(end, buffer.duration);
    source.playbackRate.value = pickRate(def.rate);
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0, t);
    gain.gain.linearRampToValueAtTime(def.volume, t + 0.08);
    source.connect(gain).connect(this.bus[def.bus] ?? this.bus.sfx);
    source.start(t, start);
    this.loops.set(key, { id, source, gain, timer: null });
    this.record(`${id}:loop`);
    return true;
  }

  stopLoop(key, fadeMs = 140) {
    const loop = this.loops.get(key);
    if (!loop) return;
    this.loops.delete(key);
    clearTimeout(loop.timer);
    this.stopVoice(loop, fadeMs / 1000);
  }

  stopLoops() {
    for (const key of [...this.loops.keys()]) this.stopLoop(key, 80);
  }

  stopAllSfx() {
    this.stopLoops();
    for (const list of this.voices.values()) {
      for (const voice of list.splice(0)) this.stopVoice(voice, 0.02);
    }
  }
}
