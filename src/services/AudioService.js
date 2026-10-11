const MELODY = [261.63, 329.63, 392, 329.63, 293.66, 349.23, 440, 349.23];

export class AudioService {
  constructor(save) {
    this.save = save;
    const preferences = save?.snapshot?.().audio ?? { music: true, sfx: true };
    this.musicEnabled = preferences.music !== false;
    this.sfxEnabled = preferences.sfx !== false;
    this.platformMuted = false;
    this.pauseReasons = new Set();
    this.context = null;
    this.musicTimer = null;
    this.musicStep = 0;
    this.activeMusic = new Set();
    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', () => this.setPaused('visibility', document.visibilityState !== 'visible'));
    }
  }

  async unlock() {
    if (typeof window === 'undefined') return false;
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return false;
    try {
      if (!this.context) this.context = new AudioContext();
      if (this.context.state === 'suspended') await this.context.resume();
      this.syncMusic();
      return true;
    } catch (error) {
      console.warn('Audio could not start', error);
      return false;
    }
  }

  persist() {
    if (!this.save?.loaded) return;
    this.save.mutate((state) => {
      state.audio = { music: this.musicEnabled, sfx: this.sfxEnabled };
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
  }

  setUserMuted(value) {
    const enabled = !Boolean(value);
    this.musicEnabled = enabled;
    this.sfxEnabled = enabled;
    this.persist();
    this.syncMusic();
  }

  setPlatformMuted(value) {
    this.platformMuted = Boolean(value);
    this.syncMusic();
  }

  setPaused(reason, value) {
    if (value) this.pauseReasons.add(reason);
    else this.pauseReasons.delete(reason);
    this.syncMusic();
  }

  get canPlay() { return !this.platformMuted && this.pauseReasons.size === 0; }
  get canPlayMusic() { return this.canPlay && this.musicEnabled; }
  get canPlaySfx() { return this.canPlay && this.sfxEnabled; }

  snapshot() {
    return { music: this.musicEnabled, sfx: this.sfxEnabled, platformMuted: this.platformMuted, paused: this.pauseReasons.size > 0 };
  }

  playTone(frequency, duration, volume, type = 'sine', music = false) {
    if (!this.context || this.context.state !== 'running') return;
    const now = this.context.currentTime;
    const oscillator = this.context.createOscillator();
    const gain = this.context.createGain();
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, now);
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(volume, now + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
    oscillator.connect(gain).connect(this.context.destination);
    oscillator.start(now);
    oscillator.stop(now + duration + 0.02);
    if (music) {
      this.activeMusic.add(oscillator);
      oscillator.addEventListener('ended', () => this.activeMusic.delete(oscillator), { once: true });
    }
  }

  playSfx(kind = 'tap') {
    if (!this.canPlaySfx) return;
    const tones = { tap: [620, 0.07], toggle: [760, 0.09], close: [460, 0.08] };
    const [frequency, duration] = tones[kind] ?? tones.tap;
    this.playTone(frequency, duration, 0.045, 'sine');
  }

  syncMusic() {
    const shouldPlay = this.context?.state === 'running' && this.canPlayMusic;
    if (shouldPlay && !this.musicTimer) {
      const tick = () => {
        if (!this.canPlayMusic) return;
        this.playTone(MELODY[this.musicStep % MELODY.length], 0.34, 0.018, 'sine', true);
        this.musicStep += 1;
      };
      tick();
      this.musicTimer = setInterval(tick, 620);
    } else if (!shouldPlay && this.musicTimer) {
      clearInterval(this.musicTimer);
      this.musicTimer = null;
      for (const oscillator of this.activeMusic) {
        try { oscillator.stop(); } catch { /* already stopped */ }
      }
      this.activeMusic.clear();
    }
  }
}
